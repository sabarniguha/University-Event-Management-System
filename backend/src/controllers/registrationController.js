const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { newTicketCode } = require('../utils/ticket');
const { promoteWaitlist } = require('../utils/waitlist');
const { toCsv, safeFilename } = require('../utils/csv');

// POST /api/registrations/:eventId  (students)
// Takes a seat when one is free; otherwise joins the waitlist (if the event allows it).
const register = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const userId = req.user.id;

  const registration = await prisma.$transaction(
    async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
      if (event.endsAt < new Date()) throw new HttpError(400, 'This event has already ended');
      if (event.registrationDeadline && event.registrationDeadline < new Date()) {
        throw new HttpError(400, 'Registration for this event has closed');
      }

      const existing = await tx.registration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (existing?.status === 'REGISTERED') throw new HttpError(409, 'You are already registered');
      if (existing?.status === 'WAITLISTED') throw new HttpError(409, 'You are already on the waitlist');

      const taken = await tx.registration.count({ where: { eventId, status: 'REGISTERED' } });
      let status = 'REGISTERED';
      if (taken >= event.capacity) {
        if (!event.waitlistEnabled) throw new HttpError(409, 'This event is full');
        status = 'WAITLISTED';
      }

      if (existing) {
        // Re-joining after a cancellation: keep the same ticket, restart the queue position,
        // and drop any stale attendance record from the earlier registration.
        await tx.attendance.deleteMany({ where: { registrationId: existing.id } });
        return tx.registration.update({
          where: { id: existing.id },
          data: { status, joinedAt: new Date() },
        });
      }
      return tx.registration.create({
        data: { eventId, userId, status, ticketCode: newTicketCode() },
      });
    },
    { isolationLevel: 'Serializable' }
  );

  let waitlistPosition = null;
  if (registration.status === 'WAITLISTED') {
    waitlistPosition = await prisma.registration.count({
      where: { eventId, status: 'WAITLISTED', joinedAt: { lte: registration.joinedAt } },
    });
  }
  res.status(201).json({ registration, waitlisted: registration.status === 'WAITLISTED', waitlistPosition });
});

// DELETE /api/registrations/:eventId  (students) - cancels own registration or waitlist spot
const cancel = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const existing = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    include: { event: true },
  });
  if (!existing || existing.status === 'CANCELLED') throw new HttpError(404, 'Active registration not found');
  if (existing.event.startsAt < new Date()) throw new HttpError(400, 'You cannot cancel after the event has started');

  const registration = await prisma.$transaction(
    async (tx) => {
      const updated = await tx.registration.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
      });
      await tx.attendance.deleteMany({ where: { registrationId: existing.id } });
      // A freed seat goes to the next student in the queue.
      if (existing.status === 'REGISTERED') await promoteWaitlist(tx, eventId);
      return updated;
    },
    { isolationLevel: 'Serializable' }
  );
  res.json({ registration });
});

// GET /api/registrations/me  (students) - includes QR ticket code and waitlist position
const myRegistrations = asyncHandler(async (req, res) => {
  const registrations = await prisma.registration.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: { id: true, title: true, venue: true, startsAt: true, endsAt: true, status: true, category: true },
      },
      attendance: { select: { status: true, checkedInAt: true, method: true } },
    },
  });

  const withPosition = await Promise.all(
    registrations.map(async (r) => {
      if (r.status !== 'WAITLISTED') return r;
      const ahead = await prisma.registration.count({
        where: { eventId: r.eventId, status: 'WAITLISTED', joinedAt: { lt: r.joinedAt } },
      });
      return { ...r, waitlistPosition: ahead + 1 };
    })
  );
  res.json({ registrations: withPosition });
});

// GET /api/registrations/event/:eventId  (organiser of event / admin)
const eventParticipants = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);

  const participants = await prisma.registration.findMany({
    where: { eventId },
    orderBy: [{ joinedAt: 'asc' }],
    include: {
      user: { select: { id: true, name: true, email: true, department: true, phone: true } },
      attendance: { select: { status: true, checkedInAt: true, method: true } },
    },
  });

  const active = participants.filter((p) => p.status === 'REGISTERED');
  const summary = {
    registered: active.length,
    waitlisted: participants.filter((p) => p.status === 'WAITLISTED').length,
    cancelled: participants.filter((p) => p.status === 'CANCELLED').length,
    present: active.filter((p) => p.attendance?.status === 'PRESENT').length,
    absent: active.filter((p) => p.attendance?.status === 'ABSENT').length,
    capacity: event.capacity,
  };

  res.json({ event, participants, summary });
});

// GET /api/registrations/event/:eventId/export  -> CSV download (confirmed seats only)
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

  const csv = toCsv(
    ['Name', 'Email', 'Department', 'Phone', 'Registered At', 'Attendance'],
    rows.map((r) => [
      r.user.name,
      r.user.email,
      r.user.department,
      r.user.phone,
      r.createdAt.toISOString(),
      r.attendance ? r.attendance.status : 'NOT MARKED',
    ])
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="participants_${safeFilename(event.title)}.csv"`);
  res.send(csv);
});

module.exports = { register, cancel, myRegistrations, eventParticipants, exportParticipantsCsv };
