const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { normaliseTicketInput } = require('../utils/ticket');
const { attendanceBlock, windowState } = require('../utils/attendanceWindow');

const MAX_STAFF = 25;
const userBrief = { select: { id: true, name: true, email: true, department: true } };

// ----- Organiser / admin: manage the helpers of an event -----

// GET /api/staff/event/:eventId
const list = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const rows = await prisma.eventStaff.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, include: { user: userBrief } });
  res.json({ event: { id: event.id, title: event.title }, staff: rows.map((r) => ({ userId: r.userId, name: r.user.name, email: r.user.email, department: r.user.department, addedAt: r.createdAt })) });
});

// POST /api/staff/event/:eventId  { email }
const add = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const { email } = z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, isActive: true } });
  if (!user || !user.isActive) throw new HttpError(404, 'No active account uses that email. Ask them to register first.');
  if (user.id === event.organizerId) throw new HttpError(400, 'The organiser already has full access');
  if ((await prisma.eventStaff.count({ where: { eventId } })) >= MAX_STAFF) throw new HttpError(400, `An event can have up to ${MAX_STAFF} helpers`);
  await prisma.eventStaff.upsert({ where: { eventId_userId: { eventId, userId: user.id } }, update: {}, create: { eventId, userId: user.id, addedById: req.user.id } });
  await notify(prisma, user.id, { title: 'You are event staff', message: `You can now scan tickets and mark attendance for "${event.title}" while it is running.`, link: '/staff', type: 'STAFF' });
  await audit(req, 'event.staff.add', 'Event', eventId, { userId: user.id });
  res.status(201).json({ added: { userId: user.id, name: user.name } });
});

// DELETE /api/staff/event/:eventId/:userId
const remove = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const userId = parseId(req.params.userId, 'user id');
  await loadManagedEvent(eventId, req.user);
  await prisma.eventStaff.deleteMany({ where: { eventId, userId } });
  await audit(req, 'event.staff.remove', 'Event', eventId, { userId });
  res.json({ removed: true });
});

// ----- A helper at work (any signed-in role, but only for events they were added to) -----

const loadDuty = async (eventId, user) => {
  const duty = await prisma.eventStaff.findUnique({ where: { eventId_userId: { eventId, userId: user.id } }, include: { event: true } });
  if (!duty || duty.event.status !== 'PUBLISHED') throw new HttpError(403, 'You are not staff for this event');
  return duty.event;
};

// GET /api/staff/mine - events I help run
const mine = asyncHandler(async (req, res) => {
  const rows = await prisma.eventStaff.findMany({
    where: { userId: req.user.id, event: { status: 'PUBLISHED' } }, orderBy: { event: { startsAt: 'desc' } }, take: 100,
    include: { event: { select: { id: true, title: true, venue: true, startsAt: true, endsAt: true } } },
  });
  res.json({ events: rows.map((r) => ({ ...r.event, window: windowState(r.event) })) });
});

// GET /api/staff/event/:eventId/roster
const roster = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadDuty(eventId, req.user);
  const rows = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED' }, orderBy: { createdAt: 'asc' }, take: 5000,
    select: { id: true, user: { select: { name: true, department: true } }, attendance: { select: { status: true, checkedInAt: true } } },
  });
  res.json({
    event: { id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt }, window: windowState(event),
    present: rows.filter((r) => r.attendance?.status === 'PRESENT').length, total: rows.length,
    roster: rows.map((r) => ({ id: r.id, name: r.user.name, department: r.user.department, status: r.attendance?.status || null })),
  });
});

// POST /api/staff/event/:eventId/check-in  { ticketCode }
const checkIn = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadDuty(eventId, req.user);
  const { ticketCode } = z.object({ ticketCode: z.string().trim().min(8).max(200) }).parse(req.body);
  const blocked = attendanceBlock(event);
  if (blocked) throw new HttpError(400, blocked);
  const reg = await prisma.registration.findUnique({ where: { ticketCode: normaliseTicketInput(ticketCode) }, include: { user: userBrief, attendance: true } });
  if (!reg || reg.eventId !== eventId) throw new HttpError(404, 'This ticket is not valid for this event');
  if (reg.status === 'WAITLISTED') throw new HttpError(409, 'This student is on the waitlist and has no seat yet');
  if (reg.status !== 'REGISTERED') throw new HttpError(409, 'This registration was cancelled');
  const already = reg.attendance?.status === 'PRESENT';
  let at = reg.attendance;
  if (!already) {
    const data = { status: 'PRESENT', method: 'QR', markedById: req.user.id, checkedInAt: new Date() };
    at = await prisma.attendance.upsert({ where: { registrationId: reg.id }, update: data, create: { registrationId: reg.id, ...data } });
    await notify(prisma, reg.userId, { title: 'Checked in', message: `You were checked in to "${event.title}". Thanks for coming!`, link: '/student/attendance' });
  }
  res.json({ student: reg.user, alreadyCheckedIn: already, checkedInAt: at.checkedInAt });
});

// POST /api/staff/event/:eventId/mark  { registrationId, status }
const mark = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadDuty(eventId, req.user);
  const { registrationId, status } = z.object({ registrationId: z.coerce.number().int().positive(), status: z.enum(['PRESENT', 'ABSENT']) }).parse(req.body);
  const blocked = attendanceBlock(event);
  if (blocked) throw new HttpError(400, blocked);
  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg || reg.eventId !== eventId || reg.status !== 'REGISTERED') throw new HttpError(404, 'Registration not found for this event');
  const data = { status, method: 'MANUAL', markedById: req.user.id, checkedInAt: status === 'PRESENT' ? new Date() : null };
  const attendance = await prisma.attendance.upsert({ where: { registrationId }, update: data, create: { registrationId, ...data } });
  res.json({ attendance });
});

module.exports = { list, add, remove, mine, roster, checkIn, mark };
