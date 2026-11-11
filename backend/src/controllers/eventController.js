const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent } = require('../utils/access');
const { notify } = require('../utils/notify');
const { promoteWaitlist } = require('../utils/waitlist');
const { parseId, eventCreateSchema, eventUpdateSchema } = require('../utils/validators');

const countInclude = {
  organizer: { select: { id: true, name: true } },
  _count: { select: { registrations: { where: { status: 'REGISTERED' } } } },
};

const shape = (event) => {
  const { _count, ...rest } = event;
  return { ...rest, registeredCount: _count ? _count.registrations : 0 };
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// GET /api/events  (public) - published events with search / filter
const listEvents = asyncHandler(async (req, res) => {
  const { q, category, scope } = req.query;
  const where = { status: 'PUBLISHED' };

  if (q) {
    where.OR = [
      { title: { contains: String(q), mode: 'insensitive' } },
      { description: { contains: String(q), mode: 'insensitive' } },
      { venue: { contains: String(q), mode: 'insensitive' } },
    ];
  }
  if (category) where.category = String(category);
  if (scope === 'past') where.endsAt = { lt: new Date() };
  else if (scope !== 'all') where.endsAt = { gte: new Date() };

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: scope === 'past' ? 'desc' : 'asc' },
    include: countInclude,
  });
  res.json({ events: events.map(shape) });
});

// GET /api/events/mine  - events the organiser owns (admins see every event)
const myEvents = asyncHandler(async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { organizerId: req.user.id };
  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: 'desc' },
    include: countInclude,
  });
  res.json({ events: events.map(shape) });
});

// GET /api/events/:id  (public for published events; drafts only for owner/admin)
const getEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const event = await prisma.event.findUnique({ where: { id }, include: countInclude });
  if (!event) throw new HttpError(404, 'Event not found');

  const canManage = req.user ? canManageEvent(req.user, event) : false;
  if (event.status !== 'PUBLISHED' && !canManage) throw new HttpError(404, 'Event not found');

  const [waitlistedCount, ratingAgg] = await Promise.all([
    prisma.registration.count({ where: { eventId: id, status: 'WAITLISTED' } }),
    prisma.feedback.aggregate({ where: { eventId: id }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  let myRegistration = null;
  if (req.user) {
    myRegistration = await prisma.registration.findUnique({
      where: { eventId_userId: { eventId: id, userId: req.user.id } },
    });
    if (myRegistration?.status === 'WAITLISTED') {
      myRegistration.waitlistPosition = await prisma.registration.count({
        where: { eventId: id, status: 'WAITLISTED', joinedAt: { lte: myRegistration.joinedAt } },
      });
    }
  }

  const average = ratingAgg._avg.rating;
  res.json({
    event: { ...shape(event), waitlistedCount },
    rating: { average: average === null ? null : Math.round(average * 10) / 10, count: ratingAgg._count._all },
    myRegistration,
    canManage,
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const data = eventCreateSchema.parse(req.body);
  const event = await prisma.event.create({
    data: { ...data, organizerId: req.user.id },
    include: countInclude,
  });
  res.status(201).json({ event: shape(event) });
});

const updateEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  if (!canManageEvent(req.user, existing)) throw new HttpError(403, 'You do not manage this event');

  const data = eventUpdateSchema.parse(req.body);
  const startsAt = data.startsAt || existing.startsAt;
  const endsAt = data.endsAt || existing.endsAt;
  if (endsAt <= startsAt) throw new HttpError(400, 'End time must be after start time');

  const deadline = data.registrationDeadline === undefined ? existing.registrationDeadline : data.registrationDeadline;
  if (deadline && deadline > endsAt) throw new HttpError(400, 'Registration deadline cannot be after the event ends');

  if (data.capacity !== undefined) {
    const registered = await prisma.registration.count({ where: { eventId: id, status: 'REGISTERED' } });
    if (data.capacity < registered) {
      throw new HttpError(400, `Capacity cannot be lower than current registrations (${registered})`);
    }
  }

  const becameCancelled = data.status === 'CANCELLED' && existing.status !== 'CANCELLED';
  const scheduleChanged =
    (data.startsAt && data.startsAt.getTime() !== existing.startsAt.getTime()) ||
    (data.endsAt && data.endsAt.getTime() !== existing.endsAt.getTime()) ||
    (data.venue !== undefined && data.venue !== existing.venue);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({ where: { id }, data });

    if (becameCancelled || (scheduleChanged && updated.status === 'PUBLISHED')) {
      const people = await tx.registration.findMany({
        where: { eventId: id, status: { in: ['REGISTERED', 'WAITLISTED'] } },
        select: { userId: true },
      });
      await notify(
        tx,
        people.map((p) => p.userId),
        becameCancelled
          ? { title: 'Event cancelled', message: `"${updated.title}" has been cancelled by the organiser.`, link: `/events/${id}` }
          : { title: 'Event updated', message: `The schedule or venue of "${updated.title}" has changed. Please check the details.`, link: `/events/${id}` }
      );
    }

    // More capacity (or a reopened event) may free seats for the waitlist.
    if (updated.status === 'PUBLISHED') await promoteWaitlist(tx, id);
  });

  const event = await prisma.event.findUnique({ where: { id }, include: countInclude });
  res.json({ event: shape(event) });
});

// POST /api/events/:id/duplicate  - copy an event as a draft one week later
const duplicateEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  if (!canManageEvent(req.user, existing)) throw new HttpError(403, 'You do not manage this event');

  const copy = await prisma.event.create({
    data: {
      title: `${existing.title} (copy)`.slice(0, 200),
      description: existing.description,
      venue: existing.venue,
      category: existing.category,
      bannerUrl: existing.bannerUrl,
      startsAt: new Date(existing.startsAt.getTime() + WEEK_MS),
      endsAt: new Date(existing.endsAt.getTime() + WEEK_MS),
      capacity: existing.capacity,
      status: 'DRAFT',
      registrationDeadline: existing.registrationDeadline
        ? new Date(existing.registrationDeadline.getTime() + WEEK_MS)
        : null,
      waitlistEnabled: existing.waitlistEnabled,
      organizerId: req.user.id,
    },
    include: countInclude,
  });
  res.status(201).json({ event: shape(copy) });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  if (!canManageEvent(req.user, existing)) throw new HttpError(403, 'You do not manage this event');

  await prisma.event.delete({ where: { id } });
  res.json({ message: 'Event deleted' });
});

module.exports = { listEvents, myEvents, getEvent, createEvent, updateEvent, duplicateEvent, deleteEvent };
