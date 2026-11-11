const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent, loadManagedEvent } = require('../utils/access');
const {
  parseId,
  attendanceSchema,
  checkInSchema,
  bulkAttendanceSchema,
} = require('../utils/validators');
const { certificateId, parseCertificateId, normaliseTicketInput } = require('../utils/ticket');
const { notify } = require('../utils/notify');
const { toCsv, safeFilename } = require('../utils/csv');

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const summarize = (rows) => {
  const registered = rows.length;
  const present = rows.filter((r) => r.attendance?.status === 'PRESENT').length;
  const absent = rows.filter((r) => r.attendance?.status === 'ABSENT').length;
  return { registered, present, absent, unmarked: registered - present - absent, rate: pct(present, registered) };
};

const userBrief = { select: { id: true, name: true, email: true, department: true } };

// ---------------------------------------------------------------- organiser / admin

// POST /api/attendance - mark or change one student's attendance by hand
const markAttendance = asyncHandler(async (req, res) => {
  const { registrationId, status } = attendanceSchema.parse(req.body);

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });
  if (!registration) throw new HttpError(404, 'Registration not found');
  if (!canManageEvent(req.user, registration.event)) throw new HttpError(403, 'You do not manage this event');
  if (registration.event.status !== 'PUBLISHED') {
    throw new HttpError(400, 'Attendance can only be recorded for published events');
  }
  if (registration.status !== 'REGISTERED') {
    throw new HttpError(400, 'Attendance can only be recorded for a confirmed registration');
  }

  const data = {
    status,
    method: 'MANUAL',
    markedById: req.user.id,
    checkedInAt: status === 'PRESENT' ? new Date() : null,
  };
  const attendance = await prisma.attendance.upsert({
    where: { registrationId },
    update: data,
    create: { registrationId, ...data },
  });
  res.json({ attendance });
});

// POST /api/attendance/checkin - scan a student's QR ticket at the door
const checkIn = asyncHandler(async (req, res) => {
  const { eventId, ticketCode } = checkInSchema.parse(req.body);
  const event = await loadManagedEvent(eventId, req.user);
  if (event.status !== 'PUBLISHED') throw new HttpError(400, 'Check-in is only available for published events');

  const registration = await prisma.registration.findUnique({
    where: { ticketCode: normaliseTicketInput(ticketCode) },
    include: { user: userBrief, attendance: true },
  });
  // Same message for unknown codes and codes for another event, so codes cannot be probed.
  if (!registration || registration.eventId !== eventId) {
    throw new HttpError(404, 'This ticket is not valid for this event');
  }
  if (registration.status === 'WAITLISTED') throw new HttpError(409, 'This student is on the waitlist and has no seat yet');
  if (registration.status !== 'REGISTERED') throw new HttpError(409, 'This registration was cancelled');

  const alreadyCheckedIn = registration.attendance?.status === 'PRESENT';
  let attendance = registration.attendance;
  if (!alreadyCheckedIn) {
    const data = { status: 'PRESENT', method: 'QR', markedById: req.user.id, checkedInAt: new Date() };
    attendance = await prisma.attendance.upsert({
      where: { registrationId: registration.id },
      update: data,
      create: { registrationId: registration.id, ...data },
    });
    await notify(prisma, registration.userId, {
      title: 'Checked in',
      message: `You were checked in to "${event.title}". Thanks for coming!`,
      link: '/student/attendance',
    });
  }

  res.json({ student: registration.user, alreadyCheckedIn, checkedInAt: attendance.checkedInAt });
});

// POST /api/attendance/bulk - mark every student who has no record yet (e.g. "all remaining absent")
const bulkMark = asyncHandler(async (req, res) => {
  const { eventId, status } = bulkAttendanceSchema.parse(req.body);
  const event = await loadManagedEvent(eventId, req.user);
  if (event.status !== 'PUBLISHED') throw new HttpError(400, 'Attendance can only be recorded for published events');

  const pending = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED', attendance: { is: null } },
    select: { id: true },
  });
  if (pending.length > 0) {
    await prisma.attendance.createMany({
      data: pending.map((r) => ({
        registrationId: r.id,
        status,
        method: 'MANUAL',
        markedById: req.user.id,
        checkedInAt: status === 'PRESENT' ? new Date() : null,
      })),
      skipDuplicates: true,
    });
  }
  res.json({ updated: pending.length });
});

// GET /api/attendance/event/:eventId - the attendance console for one event
const eventAttendance = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);

  const rows = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: userBrief,
      attendance: { select: { status: true, method: true, checkedInAt: true } },
    },
  });

  const recent = rows
    .filter((r) => r.attendance?.status === 'PRESENT' && r.attendance.checkedInAt)
    .sort((a, b) => b.attendance.checkedInAt - a.attendance.checkedInAt)
    .slice(0, 8)
    .map((r) => ({ id: r.id, name: r.user.name, method: r.attendance.method, checkedInAt: r.attendance.checkedInAt }));

  const viaQr = rows.filter((r) => r.attendance?.status === 'PRESENT' && r.attendance.method === 'QR').length;
  res.json({
    event,
    roster: rows,
    summary: { ...summarize(rows), capacity: event.capacity, viaQr },
    recent,
  });
});

// GET /api/attendance/event/:eventId/export - attendance report as CSV
const exportAttendanceCsv = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);

  const rows = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED' },
    orderBy: { createdAt: 'asc' },
    include: { user: userBrief, attendance: true },
  });

  const csv = toCsv(
    ['Name', 'Email', 'Department', 'Attendance', 'Method', 'Checked in at'],
    rows.map((r) => [
      r.user.name,
      r.user.email,
      r.user.department,
      r.attendance ? r.attendance.status : 'NOT MARKED',
      r.attendance ? r.attendance.method : '',
      r.attendance?.checkedInAt ? r.attendance.checkedInAt.toISOString() : '',
    ])
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_${safeFilename(event.title)}.csv"`);
  res.send(csv);
});

// GET /api/attendance/overview - attendance rate for every event (organiser: own events, admin: all)
const overview = asyncHandler(async (req, res) => {
  const where = { status: { not: 'DRAFT' } };
  if (req.user.role !== 'ADMIN') where.organizerId = req.user.id;

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: 'desc' },
    select: {
      id: true, title: true, venue: true, startsAt: true, endsAt: true, status: true, capacity: true,
      organizer: { select: { id: true, name: true } },
    },
  });

  const regs = await prisma.registration.findMany({
    where: { eventId: { in: events.map((e) => e.id) }, status: 'REGISTERED' },
    select: { eventId: true, attendance: { select: { status: true } } },
  });
  const byEvent = new Map();
  for (const r of regs) {
    if (!byEvent.has(r.eventId)) byEvent.set(r.eventId, []);
    byEvent.get(r.eventId).push(r);
  }

  const items = events.map((e) => ({ ...e, ...summarize(byEvent.get(e.id) || []) }));
  res.json({ events: items, totals: { events: items.length, ...summarize(regs) } });
});

// ---------------------------------------------------------------- students

// GET /api/attendance/me - the student's own attendance history
const myAttendance = asyncHandler(async (req, res) => {
  const records = await prisma.registration.findMany({
    where: { userId: req.user.id, status: 'REGISTERED' },
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { id: true, title: true, startsAt: true, endsAt: true, venue: true, category: true } },
      attendance: { select: { status: true, method: true, checkedInAt: true } },
    },
  });

  const feedback = await prisma.feedback.findMany({
    where: { userId: req.user.id, eventId: { in: records.map((r) => r.eventId) } },
    select: { eventId: true, rating: true, comment: true },
  });
  const feedbackByEvent = new Map(feedback.map((f) => [f.eventId, f]));

  const now = new Date();
  const items = records.map((r) => ({
    id: r.id,
    event: r.event,
    attendance: r.attendance,
    feedback: feedbackByEvent.get(r.eventId) || null,
    certificateId: r.attendance?.status === 'PRESENT' ? certificateId(r.ticketCode) : null,
    hasEnded: r.event.endsAt <= now,
  }));

  const held = items.filter((i) => i.hasEnded).length;
  const isPresent = (i) => i.attendance?.status === 'PRESENT';
  res.json({
    records: items,
    summary: {
      total: items.length,
      held,
      attended: items.filter(isPresent).length,
      missed: items.filter((i) => i.attendance?.status === 'ABSENT').length,
      upcoming: items.length - held,
      // Rate is measured over events that have finished.
      rate: held > 0 ? pct(items.filter((i) => i.hasEnded && isPresent(i)).length, held) : null,
    },
  });
});

// GET /api/attendance/certificate/:registrationId - data for a printable certificate
const certificate = asyncHandler(async (req, res) => {
  const id = parseId(req.params.registrationId, 'registration id');
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, department: true } },
      event: { select: { title: true, venue: true, startsAt: true, endsAt: true, organizer: { select: { name: true } } } },
      attendance: { select: { status: true, checkedInAt: true } },
    },
  });
  // Another student's registration looks the same as a missing one.
  if (!reg || reg.userId !== req.user.id) throw new HttpError(404, 'Certificate not found');
  if (reg.status !== 'REGISTERED' || reg.attendance?.status !== 'PRESENT') {
    throw new HttpError(403, 'A certificate is only available for events you attended');
  }

  res.json({
    certificate: {
      certificateId: certificateId(reg.ticketCode),
      studentName: reg.user.name,
      department: reg.user.department,
      eventTitle: reg.event.title,
      venue: reg.event.venue,
      startsAt: reg.event.startsAt,
      endsAt: reg.event.endsAt,
      organizerName: reg.event.organizer.name,
      issuedAt: reg.attendance.checkedInAt || reg.event.endsAt,
    },
  });
});

// GET /api/attendance/verify/:code  (public) - confirm a certificate id is genuine
const verifyCertificate = asyncHandler(async (req, res) => {
  const prefix = parseCertificateId(req.params.code);
  if (!prefix) throw new HttpError(400, 'That is not a valid certificate id');

  const reg = await prisma.registration.findFirst({
    where: { ticketCode: { startsWith: prefix }, status: 'REGISTERED', attendance: { is: { status: 'PRESENT' } } },
    include: {
      user: { select: { name: true } },
      event: { select: { title: true, startsAt: true, venue: true } },
    },
  });
  if (!reg) throw new HttpError(404, 'No attendance record matches this certificate id');

  res.json({
    certificateId: certificateId(reg.ticketCode),
    studentName: reg.user.name,
    eventTitle: reg.event.title,
    startsAt: reg.event.startsAt,
    venue: reg.event.venue,
  });
});

module.exports = {
  markAttendance,
  checkIn,
  bulkMark,
  eventAttendance,
  exportAttendanceCsv,
  overview,
  myAttendance,
  certificate,
  verifyCertificate,
};
