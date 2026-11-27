const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { defaultHours, cleanHours, summarise } = require('../utils/volunteer');

// GET /api/volunteer/event/:eventId  (organiser / admin) - helpers with their confirmed hours
const eventList = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const [staff, hours] = await Promise.all([
    prisma.eventStaff.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.volunteerHours.findMany({ where: { eventId } }),
  ]);
  const byUser = new Map(hours.map((h) => [h.userId, h.hours]));
  res.json({
    event: { id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt },
    ended: new Date(event.endsAt) <= new Date(),
    defaultHours: defaultHours(event),
    helpers: staff.map((s) => ({ userId: s.userId, name: s.user.name, email: s.user.email, hours: byUser.has(s.userId) ? byUser.get(s.userId) : null })),
  });
});

// PUT /api/volunteer/event/:eventId/:userId  { hours }  - only after the event has ended, only for its helpers
const confirm = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const userId = parseId(req.params.userId, 'user id');
  const event = await loadManagedEvent(eventId, req.user);
  if (new Date(event.endsAt) > new Date()) throw new HttpError(400, 'Hours can be confirmed once the event has ended.');
  const hours = cleanHours(req.body && req.body.hours);
  if (hours === null) throw new HttpError(400, 'Enter hours between 0.25 and 48 (quarter-hour steps).');
  if (!(await prisma.eventStaff.findUnique({ where: { eventId_userId: { eventId, userId } } }))) throw new HttpError(404, 'That person is not staff for this event');
  const row = await prisma.volunteerHours.upsert({
    where: { eventId_userId: { eventId, userId } }, update: { hours, confirmedById: req.user.id }, create: { eventId, userId, hours, confirmedById: req.user.id },
  });
  await notify(prisma, userId, { title: 'Volunteer hours recorded', message: `${hours} hour(s) were added to your service record for "${event.title}".`, link: '/student/volunteer', type: 'STAFF', refKey: `vol:${eventId}` });
  await audit(req, 'event.volunteer.confirm', 'Event', eventId, { userId, hours });
  res.json({ userId, hours: row.hours });
});

// DELETE /api/volunteer/event/:eventId/:userId
const unconfirm = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const userId = parseId(req.params.userId, 'user id');
  await loadManagedEvent(eventId, req.user);
  await prisma.volunteerHours.deleteMany({ where: { eventId, userId } });
  await audit(req, 'event.volunteer.remove', 'Event', eventId, { userId });
  res.json({ removed: true });
});

// GET /api/volunteer/mine - my own service record
const mine = asyncHandler(async (req, res) => {
  const rows = await prisma.volunteerHours.findMany({
    where: { userId: req.user.id }, orderBy: { createdAt: 'desc' },
    include: { event: { select: { id: true, title: true, startsAt: true, endsAt: true, venue: true, organizer: { select: { name: true } } } } },
  });
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, studentId: true, department: true } });
  res.json({
    person: user, ...summarise(rows), issuedAt: new Date(),
    entries: rows.map((r) => ({ eventId: r.eventId, title: r.event.title, startsAt: r.event.startsAt, venue: r.event.venue, organizer: r.event.organizer?.name || '', hours: r.hours })),
  });
});

module.exports = { eventList, confirm, unconfirm, mine };
