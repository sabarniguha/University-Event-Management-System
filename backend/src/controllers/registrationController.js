const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent, canManageEvent } = require('../utils/access');
const { parseId, registrationDecisionSchema } = require('../utils/validators');
const { newTicketCode } = require('../utils/ticket');
const { promoteWaitlist } = require('../utils/waitlist');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { emailUsers } = require('../utils/emailUsers');
const razorpay = require('../utils/razorpay');
const { toCsv, safeFilename } = require('../utils/csv');

const sameDept = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Shared by the free flow below and by the paid flow (paymentController).
// Takes a seat when one is free; otherwise joins the waitlist (if the event allows it).
// Events that need approval put the request in PENDING until the organiser decides.
// opts.noWaitlist: refuse instead of waitlisting (a paid seat must be a real seat).
// opts.skipPaymentCheck: the caller has already verified payment.
async function registerUser(user, eventId, opts = {}) {
  const userId = user.id;
  return prisma.$transaction(
    async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
      if (event.endsAt < new Date()) throw new HttpError(400, 'This event has already ended');
      if (event.registrationDeadline && event.registrationDeadline < new Date()) {
        throw new HttpError(400, 'Registration for this event has closed');
      }
      if (event.department && !sameDept(event.department, user.department)) {
        throw new HttpError(403, `This event is open to ${event.department} students only. Check the department on your profile.`);
      }
      if (!opts.skipPaymentCheck && paymentRequired(event)) {
        throw new HttpError(402, 'This event has a fee. Complete the payment to register.');
      }

      const existing = await tx.registration.findUnique({ where: { eventId_userId: { eventId, userId } } });
      if (existing?.status === 'REGISTERED') throw new HttpError(409, 'You are already registered');
      if (existing?.status === 'WAITLISTED') throw new HttpError(409, 'You are already on the waitlist');
      if (existing?.status === 'PENDING') throw new HttpError(409, 'Your registration is waiting for the organiser to approve it');
      if (existing?.status === 'REJECTED') throw new HttpError(403, 'The organiser declined your registration for this event');

      let status;
      if (event.requiresRegistrationApproval) {
        status = 'PENDING';
      } else {
        const taken = await tx.registration.count({ where: { eventId, status: 'REGISTERED' } });
        status = 'REGISTERED';
        if (taken >= event.capacity) {
          if (!event.waitlistEnabled || opts.noWaitlist) throw new HttpError(409, 'This event is full');
          status = 'WAITLISTED';
        }
      }

      let saved;
      if (existing) {
        // Re-joining after a cancellation: keep the same ticket, restart the queue position,
        // and drop any stale attendance record from the earlier registration.
        await tx.attendance.deleteMany({ where: { registrationId: existing.id } });
        saved = await tx.registration.update({ where: { id: existing.id }, data: { status, joinedAt: new Date() } });
      } else {
        saved = await tx.registration.create({ data: { eventId, userId, status, ticketCode: newTicketCode() } });
      }

      if (status === 'REGISTERED') {
        await notify(tx, [userId], {
          title: 'Registration confirmed',
          message: `You are registered for "${event.title}". Your QR ticket is ready.`,
          link: '/student/tickets',
          type: 'REGISTRATION',
        });
      } else if (status === 'PENDING') {
        await notify(tx, [event.organizerId], {
          title: 'Registration awaiting approval',
          message: `${user.name} asked to join "${event.title}".`,
          link: `/organizer/events/${eventId}/registrations`,
          type: 'APPROVAL',
        });
      }
      return saved;
    },
    { isolationLevel: 'Serializable' }
  );
}

// Fees are collected online only when a gateway is configured, and not for events that need
// organiser approval first (those collect the fee in person, so nobody pays and is then declined).
const paymentRequired = (event) => razorpay.enabled() && event.fee > 0 && !event.requiresRegistrationApproval;

// POST /api/registrations/:eventId  (students)
const register = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const userId = req.user.id;
  const registration = await registerUser(req.user, eventId);

  if (registration.status === 'REGISTERED') {
    emailUsers(userId, { subject: 'You are registered', text: 'Your registration is confirmed. Your QR ticket is ready in My Tickets.', link: '/student/tickets' });
  }
  let waitlistPosition = null;
  if (registration.status === 'WAITLISTED') {
    waitlistPosition = await prisma.registration.count({
      where: { eventId, status: 'WAITLISTED', joinedAt: { lte: registration.joinedAt } },
    });
  }
  res.status(201).json({
    registration,
    waitlisted: registration.status === 'WAITLISTED',
    pending: registration.status === 'PENDING',
    waitlistPosition,
  });
});

// DELETE /api/registrations/:eventId  (students) - cancels own registration, request or waitlist spot
const cancel = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const existing = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    include: { event: true },
  });
  if (!existing || ['CANCELLED', 'REJECTED'].includes(existing.status)) throw new HttpError(404, 'Active registration not found');
  if (existing.event.startsAt < new Date()) throw new HttpError(400, 'You cannot cancel after the event has started');

  const registration = await prisma.$transaction(
    async (tx) => {
      const updated = await tx.registration.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } });
      await tx.attendance.deleteMany({ where: { registrationId: existing.id } });
      // A freed seat goes to the next student in the queue.
      if (existing.status === 'REGISTERED') await promoteWaitlist(tx, eventId);
      return updated;
    },
    { isolationLevel: 'Serializable' }
  );
  res.json({ registration });
});

// PATCH /api/registrations/:id/decision  (organiser of event / admin) - approve or reject a pending request
const decide = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { action, note } = registrationDecisionSchema.parse(req.body);
  const reg = await prisma.registration.findUnique({ where: { id }, include: { event: true } });
  if (!reg) throw new HttpError(404, 'Registration not found');
  if (!canManageEvent(req.user, reg.event)) throw new HttpError(403, 'You do not manage this event');
  if (reg.status !== 'PENDING') throw new HttpError(409, 'This request has already been decided');

  const updated = await prisma.$transaction(
    async (tx) => {
      let status = 'REJECTED';
      if (action === 'APPROVE') {
        const taken = await tx.registration.count({ where: { eventId: reg.eventId, status: 'REGISTERED' } });
        status = 'REGISTERED';
        if (taken >= reg.event.capacity) {
          if (!reg.event.waitlistEnabled) throw new HttpError(409, 'The event is full. Increase the capacity first.');
          status = 'WAITLISTED';
        }
      }
      const saved = await tx.registration.update({
        where: { id },
        data: { status, decisionNote: note || null, joinedAt: status === 'WAITLISTED' ? new Date() : undefined },
      });
      await notify(tx, [reg.userId], {
        title: action === 'APPROVE' ? (status === 'WAITLISTED' ? 'Added to the waitlist' : 'Registration approved') : 'Registration declined',
        message:
          action === 'APPROVE'
            ? status === 'WAITLISTED'
              ? `"${reg.event.title}" is full, so you were added to the waitlist.`
              : `You are registered for "${reg.event.title}". Your QR ticket is ready.`
            : `Your request for "${reg.event.title}" was declined.${note ? ` Note: ${note}` : ''}`,
        link: action === 'APPROVE' ? '/student/tickets' : `/events/${reg.eventId}`,
        type: 'REGISTRATION',
      });
      return saved;
    },
    { isolationLevel: 'Serializable' }
  );
  emailUsers(reg.userId, {
    subject: action === 'APPROVE' ? 'Your registration was approved' : 'Your registration was declined',
    text: action === 'APPROVE' ? `Your request for "${reg.event.title}" was approved (status: ${updated.status.toLowerCase()}).` : `Your request for "${reg.event.title}" was declined.${note ? ` Note: ${note}` : ''}`,
    link: action === 'APPROVE' ? '/student/tickets' : `/events/${reg.eventId}`,
  });
  await audit(req, `registration.${action.toLowerCase()}`, 'Registration', id, { eventId: reg.eventId });
  res.json({ registration: updated });
});

// GET /api/registrations/me  (students) - includes QR ticket code and waitlist position
const myRegistrations = asyncHandler(async (req, res) => {
  const registrations = await prisma.registration.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: {
          id: true, title: true, venue: true, startsAt: true, endsAt: true, status: true, category: true,
          bannerUrl: true, mode: true, onlineUrl: true, fee: true,
        },
      },
      attendance: { select: { status: true, checkedInAt: true, method: true } },
      certificate: { select: { certificateId: true, revokedAt: true } },
    },
  });

  const withPosition = await Promise.all(
    registrations.map(async (r) => {
      // The meeting link is only revealed for confirmed seats.
      const event = r.status === 'REGISTERED' ? r.event : { ...r.event, onlineUrl: null };
      if (r.status !== 'WAITLISTED') return { ...r, event };
      const ahead = await prisma.registration.count({
        where: { eventId: r.eventId, status: 'WAITLISTED', joinedAt: { lt: r.joinedAt } },
      });
      return { ...r, event, waitlistPosition: ahead + 1 };
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
      user: { select: { id: true, name: true, email: true, department: true, phone: true, studentId: true, year: true, college: true } },
      attendance: { select: { status: true, checkedInAt: true, method: true } },
    },
  });

  const active = participants.filter((p) => p.status === 'REGISTERED');
  const count = (s) => participants.filter((p) => p.status === s).length;
  const summary = {
    registered: active.length,
    waitlisted: count('WAITLISTED'),
    pending: count('PENDING'),
    rejected: count('REJECTED'),
    cancelled: count('CANCELLED'),
    present: active.filter((p) => p.attendance?.status === 'PRESENT').length,
    absent: active.filter((p) => p.attendance?.status === 'ABSENT').length,
    capacity: event.capacity,
  };

  res.json({ event, participants, summary });
});

// GET /api/registrations/event/:eventId/export  -> CSV download (every registration with its status)
const exportParticipantsCsv = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);

  const rows = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { name: true, email: true, department: true, phone: true, studentId: true, year: true, college: true } },
      attendance: { select: { status: true } },
    },
  });

  const csv = toCsv(
    ['Name', 'Email', 'Student ID', 'Department', 'Year', 'College', 'Phone', 'Registration status', 'Registered At', 'Attendance'],
    rows.map((r) => [
      r.user.name,
      r.user.email,
      r.user.studentId,
      r.user.department,
      r.user.year,
      r.user.college,
      r.user.phone,
      r.status,
      r.createdAt.toISOString(),
      r.attendance ? r.attendance.status : 'NOT MARKED',
    ])
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="participants_${safeFilename(event.title)}.csv"`);
  res.send(csv);
});

module.exports = {
  registerUser,
  paymentRequired, register, cancel, decide, myRegistrations, eventParticipants, exportParticipantsCsv };
