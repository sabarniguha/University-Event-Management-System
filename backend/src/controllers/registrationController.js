const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');

// POST /api/registrations/:eventId  (students)
const register = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const userId = req.user.id;

  const registration = await prisma.$transaction(
    async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
      if (event.endsAt < new Date()) throw new HttpError(400, 'This event has already ended');

      const existing = await tx.registration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (existing && existing.status === 'REGISTERED') throw new HttpError(409, 'You are already registered');

      const taken = await tx.registration.count({ where: { eventId, status: 'REGISTERED' } });
      if (taken >= event.capacity) throw new HttpError(409, 'This event is full');

      if (existing) {
        return tx.registration.update({ where: { id: existing.id }, data: { status: 'REGISTERED' } });
      }
      return tx.registration.create({ data: { eventId, userId } });
    },
    { isolationLevel: 'Serializable' }
  );

  res.status(201).json({ registration });
});

// DELETE /api/registrations/:eventId  (students) - cancels own registration
const cancel = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const existing = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    include: { event: true },
  });
  if (!existing || existing.status !== 'REGISTERED') throw new HttpError(404, 'Active registration not found');
  if (existing.event.startsAt < new Date()) throw new HttpError(400, 'You cannot cancel after the event has started');

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED' },
  });
  res.json({ registration });
});

// GET /api/registrations/me  (students)
const myRegistrations = asyncHandler(async (req, res) => {
  const registrations = await prisma.registration.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { id: true, title: true, venue: true, startsAt: true, endsAt: true, status: true } },
      attendance: { select: { status: true, checkedInAt: true } },
    },
  });
  res.json({ registrations });
});

// GET /api/registrations/event/:eventId  (organiser of event / admin)
const eventParticipants = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);

  const participants = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true, department: true, phone: true } },
      attendance: { select: { status: true, checkedInAt: true } },
    },
  });

  const active = participants.filter((p) => p.status === 'REGISTERED');
  const summary = {
    registered: active.length,
    cancelled: participants.length - active.length,
    present: active.filter((p) => p.attendance?.status === 'PRESENT').length,
    absent: active.filter((p) => p.attendance?.status === 'ABSENT').length,
    capacity: event.capacity,
  };

  res.json({ event, participants, summary });
});

// Neutralise spreadsheet formula injection and quote CSV fields.
const csvCell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /api/registrations/event/:eventId/export  -> CSV download
const exportParticipantsCsv = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);

  const rows = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { name: true, email: true, department: true, phone: true } },
      attendance: { select: { status: true } },
    },
  });

  const header = ['Name', 'Email', 'Department', 'Phone', 'Registered At', 'Attendance'];
  const lines = rows.map((r) =>
    [
      r.user.name,
      r.user.email,
      r.user.department,
      r.user.phone,
      r.createdAt.toISOString(),
      r.attendance ? r.attendance.status : 'NOT MARKED',
    ]
      .map(csvCell)
      .join(',')
  );

  const safeTitle = event.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'event';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="participants_${safeTitle}.csv"`);
  res.send([header.map(csvCell).join(','), ...lines].join('\n'));
});

module.exports = { register, cancel, myRegistrations, eventParticipants, exportParticipantsCsv };
