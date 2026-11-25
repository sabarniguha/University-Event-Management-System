const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { notify } = require('../utils/notify');
const { attendanceBlock } = require('../utils/attendanceWindow');
const { codeFor, isValidCode, secondsLeft } = require('../utils/screenCode');

// GET /api/self-checkin/event/:eventId/code  (organiser of the event / admin)
// The page shows this as a QR on a projector and asks again every few seconds.
const currentCode = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  if (event.status !== 'PUBLISHED') throw new HttpError(400, 'Self check-in is only available for published events');
  const [registered, present] = await Promise.all([
    prisma.registration.count({ where: { eventId, status: 'REGISTERED' } }),
    prisma.registration.count({ where: { eventId, status: 'REGISTERED', attendance: { is: { status: 'PRESENT' } } } }),
  ]);
  res.json({
    event: { id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt },
    code: codeFor(eventId), expiresIn: secondsLeft(), window: attendanceBlock(event) || 'open', registered, present,
  });
});

// POST /api/self-checkin  { eventId, code }  (student) - the student scanned the screen QR
const checkIn = asyncHandler(async (req, res) => {
  const { eventId, code } = z.object({ eventId: z.coerce.number().int().positive(), code: z.string().min(10).max(40) }).parse(req.body);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
  if (!isValidCode(eventId, code)) throw new HttpError(400, 'This QR has expired. Please scan the one on the screen again.');
  const blocked = attendanceBlock(event);
  if (blocked) throw new HttpError(400, blocked);

  const registration = await prisma.registration.findFirst({
    where: { eventId, userId: req.user.id },
    include: { attendance: true },
  });
  if (!registration || registration.status === 'CANCELLED') throw new HttpError(403, 'You are not registered for this event');
  if (registration.status !== 'REGISTERED') throw new HttpError(409, 'You do not have a confirmed seat for this event yet');

  if (registration.attendance?.status === 'PRESENT') {
    return res.json({ alreadyCheckedIn: true, event: { id: event.id, title: event.title }, checkedInAt: registration.attendance.checkedInAt });
  }
  const data = { status: 'PRESENT', method: 'QR', markedById: null, checkedInAt: new Date() };
  const attendance = await prisma.attendance.upsert({
    where: { registrationId: registration.id }, update: data, create: { registrationId: registration.id, ...data },
  });
  await notify(prisma, req.user.id, { title: 'Checked in', message: `You were checked in to "${event.title}". Thanks for coming!`, link: '/student/attendance' });
  res.status(201).json({ alreadyCheckedIn: false, event: { id: event.id, title: event.title }, checkedInAt: attendance.checkedInAt });
});

module.exports = { currentCode, checkIn };
