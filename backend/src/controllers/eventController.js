const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent } = require('../utils/access');
const { parseId, eventCreateSchema, eventUpdateSchema } = require('../utils/validators');

const countInclude = {
  organizer: { select: { id: true, name: true } },
  _count: { select: { registrations: { where: { status: 'REGISTERED' } } } },
};

const shape = (event) => {
  const { _count, ...rest } = event;
  return { ...rest, registeredCount: _count ? _count.registrations : 0 };
};

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

  let myRegistration = null;
  if (req.user) {
    myRegistration = await prisma.registration.findUnique({
      where: { eventId_userId: { eventId: id, userId: req.user.id } },
    });
  }

  res.json({ event: shape(event), myRegistration, canManage });
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

  if (data.capacity !== undefined) {
    const registered = await prisma.registration.count({ where: { eventId: id, status: 'REGISTERED' } });
    if (data.capacity < registered) {
      throw new HttpError(400, `Capacity cannot be lower than current registrations (${registered})`);
    }
  }

  const event = await prisma.event.update({ where: { id }, data, include: countInclude });
  res.json({ event: shape(event) });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  if (!canManageEvent(req.user, existing)) throw new HttpError(403, 'You do not manage this event');

  await prisma.event.delete({ where: { id } });
  res.json({ message: 'Event deleted' });
});

module.exports = { listEvents, myEvents, getEvent, createEvent, updateEvent, deleteEvent };
