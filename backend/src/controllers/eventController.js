const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent } = require('../utils/access');
const { notify, notifyAdmins } = require('../utils/notify');
const { promoteWaitlist } = require('../utils/waitlist');
const { getSettings } = require('../utils/settings');
const { audit } = require('../utils/audit');
const { readPage, pageInfo } = require('../utils/pagination');
const { parseId, eventCreateSchema, eventUpdateSchema, rejectEventSchema } = require('../utils/validators');

const countInclude = {
  organizer: { select: { id: true, name: true } },
  _count: { select: { registrations: { where: { status: 'REGISTERED' } } } },
};

// JSON columns are null when never set; the client always gets arrays.
const shape = (event) => {
  const { _count, ...rest } = event;
  return {
    ...rest,
    agenda: Array.isArray(rest.agenda) ? rest.agenda : [],
    speakers: Array.isArray(rest.speakers) ? rest.speakers : [],
    team: Array.isArray(rest.team) ? rest.team : [],
    faqs: Array.isArray(rest.faqs) ? rest.faqs : [],
    registeredCount: _count ? _count.registrations : 0,
  };
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Decides the status an organiser's request actually results in. Organisers can never publish straight
// away when approval is required, and can never set the admin-only states themselves.
function resolveStatus(user, existingStatus, requested, requireApproval) {
  if (!requested) return undefined;
  if (user.role === 'ADMIN') return requested;
  if (requested === 'PUBLISHED') {
    if (existingStatus === 'PUBLISHED') return 'PUBLISHED';
    return requireApproval ? 'PENDING_APPROVAL' : 'PUBLISHED';
  }
  if (requested === 'DRAFT' || requested === 'CANCELLED') return requested;
  return undefined; // PENDING_APPROVAL / REJECTED can only be reached through the approval flow
}

// Builds the Prisma "where" for the public explore page.
function exploreWhere(query) {
  const { q, category, scope, department, eventType, mode, price, date, dateFrom, dateTo, featured } = query;
  const now = new Date();
  const and = [{ status: 'PUBLISHED' }];

  if (q) {
    const term = String(q).slice(0, 100);
    and.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { venue: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ],
    });
  }
  if (category) and.push({ category: { in: String(category).split(',').map((c) => c.trim()).filter(Boolean) } });
  if (eventType) and.push({ eventType: { equals: String(eventType), mode: 'insensitive' } });
  if (mode && ['ONLINE', 'OFFLINE', 'HYBRID'].includes(String(mode).toUpperCase())) and.push({ mode: String(mode).toUpperCase() });
  if (price === 'free') and.push({ fee: 0 });
  if (price === 'paid') and.push({ fee: { gt: 0 } });
  if (featured === 'true') and.push({ featured: true });
  // Events open to one department are shown to that department and to everyone when no department is chosen.
  if (department) and.push({ OR: [{ department: { equals: String(department), mode: 'insensitive' } }, { department: null }] });

  if (scope === 'past') and.push({ endsAt: { lt: now } });
  else if (scope !== 'all') and.push({ endsAt: { gte: now } });

  if (date === 'today') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    and.push({ startsAt: { lte: end } }, { endsAt: { gte: now } });
  } else if (date === 'week') {
    and.push({ startsAt: { lte: new Date(now.getTime() + 7 * DAY_MS) } });
  } else if (date === 'month') {
    and.push({ startsAt: { lte: new Date(now.getTime() + 30 * DAY_MS) } });
  }
  const from = dateFrom ? new Date(String(dateFrom)) : null;
  const to = dateTo ? new Date(String(dateTo)) : null;
  if (from && !Number.isNaN(from.getTime())) and.push({ endsAt: { gte: from } });
  if (to && !Number.isNaN(to.getTime())) {
    to.setHours(23, 59, 59, 999);
    and.push({ startsAt: { lte: to } });
  }
  return { AND: and };
}

const sortOrder = (sort, scope) => {
  if (sort === 'newest') return [{ createdAt: 'desc' }];
  if (sort === 'popular') return [{ registrations: { _count: 'desc' } }, { startsAt: 'asc' }];
  return [{ startsAt: scope === 'past' ? 'desc' : 'asc' }]; // "upcoming" (default)
};

// GET /api/events  (public) - published events with search, filters, sorting and pagination
const listEvents = asyncHandler(async (req, res) => {
  const paging = readPage(req.query, 12, 50);
  const where = exploreWhere(req.query);
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: sortOrder(req.query.sort, req.query.scope),
      include: countInclude,
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.event.count({ where }),
  ]);
  res.json({ events: events.map(shape), pagination: pageInfo(paging, total) });
});

// GET /api/events/mine  - events the organiser owns (admins see every event)
const myEvents = asyncHandler(async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { organizerId: req.user.id };
  if (req.query.status) where.status = String(req.query.status);
  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: 'desc' },
    include: countInclude,
  });
  res.json({ events: events.map(shape) });
});

// GET /api/events/pending (admin) - events waiting for approval
const pendingEvents = asyncHandler(async (req, res) => {
  const events = await prisma.event.findMany({
    where: { status: 'PENDING_APPROVAL' },
    orderBy: { submittedAt: 'asc' },
    include: countInclude,
  });
  res.json({ events: events.map(shape) });
});

// GET /api/events/:id  (public for published events; other states only for owner/admin)
const getEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const event = await prisma.event.findUnique({ where: { id }, include: countInclude });
  if (!event) throw new HttpError(404, 'Event not found');

  const canManage = req.user ? canManageEvent(req.user, event) : false;
  if (event.status !== 'PUBLISHED' && !canManage) throw new HttpError(404, 'Event not found');

  const [waitlistedCount, ratingAgg, related] = await Promise.all([
    prisma.registration.count({ where: { eventId: id, status: 'WAITLISTED' } }),
    prisma.feedback.aggregate({ where: { eventId: id }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.event.findMany({
      where: { status: 'PUBLISHED', endsAt: { gte: new Date() }, id: { not: id }, category: event.category },
      orderBy: { startsAt: 'asc' },
      take: 3,
      include: countInclude,
    }),
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

  // The meeting link is for people who may attend, not for the public.
  const shaped = shape(event);
  const mayAttend = canManage || ['REGISTERED'].includes(myRegistration?.status);
  if (!mayAttend) shaped.onlineUrl = shaped.onlineUrl ? 'hidden' : null;

  // Department-restricted events tell the visitor whether they are eligible.
  let eligibility = { eligible: true, reason: null };
  if (event.department && req.user?.role === 'STUDENT') {
    const same = (req.user.department || '').trim().toLowerCase() === event.department.trim().toLowerCase();
    if (!same) eligibility = { eligible: false, reason: `Open to ${event.department} students only.` };
  }

  const average = ratingAgg._avg.rating;
  res.json({
    event: { ...shaped, waitlistedCount },
    rating: { average: average === null ? null : Math.round(average * 10) / 10, count: ratingAgg._count._all },
    myRegistration,
    eligibility,
    related: related.map(shape),
    canManage,
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const parsed = eventCreateSchema.parse(req.body);
  const settings = await getSettings();
  const { featured, ...data } = parsed;

  const status = resolveStatus(req.user, null, data.status, settings.requireEventApproval) || 'DRAFT';
  const event = await prisma.event.create({
    data: {
      ...data,
      status,
      featured: req.user.role === 'ADMIN' ? Boolean(featured) : false,
      submittedAt: status === 'PENDING_APPROVAL' ? new Date() : null,
      organizerId: req.user.id,
    },
    include: countInclude,
  });

  if (status === 'PENDING_APPROVAL') {
    await notifyAdmins(prisma, {
      title: 'Event awaiting approval',
      message: `${req.user.name} submitted "${event.title}" for review.`,
      link: '/admin/approvals',
      type: 'APPROVAL',
    });
  }
  await audit(req, 'event.create', 'Event', event.id, { title: event.title, status });
  res.status(201).json({ event: shape(event) });
});

const updateEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  if (!canManageEvent(req.user, existing)) throw new HttpError(403, 'You do not manage this event');

  const parsed = eventUpdateSchema.parse(req.body);
  const settings = await getSettings();
  const { featured, status: requestedStatus, ...data } = parsed;

  const startsAt = data.startsAt || existing.startsAt;
  const endsAt = data.endsAt || existing.endsAt;
  if (endsAt <= startsAt) throw new HttpError(400, 'End time must be after start time');

  const deadline = data.registrationDeadline === undefined ? existing.registrationDeadline : data.registrationDeadline;
  if (deadline && deadline > endsAt) throw new HttpError(400, 'Registration deadline cannot be after the event ends');

  const mode = data.mode || existing.mode;
  const onlineUrl = data.onlineUrl === undefined ? existing.onlineUrl : data.onlineUrl;
  if (mode !== 'OFFLINE' && !onlineUrl) throw new HttpError(400, 'Add the meeting link for an online or hybrid event');

  if (data.capacity !== undefined) {
    const registered = await prisma.registration.count({ where: { eventId: id, status: 'REGISTERED' } });
    if (data.capacity < registered) {
      throw new HttpError(400, `Capacity cannot be lower than current registrations (${registered})`);
    }
  }

  const status = resolveStatus(req.user, existing.status, requestedStatus, settings.requireEventApproval);
  const becameCancelled = status === 'CANCELLED' && existing.status !== 'CANCELLED';
  const submitted = status === 'PENDING_APPROVAL' && existing.status !== 'PENDING_APPROVAL';
  const scheduleChanged =
    (data.startsAt && data.startsAt.getTime() !== existing.startsAt.getTime()) ||
    (data.endsAt && data.endsAt.getTime() !== existing.endsAt.getTime()) ||
    (data.venue !== undefined && data.venue !== existing.venue);

  const update = { ...data };
  if (status) update.status = status;
  if (submitted) {
    update.submittedAt = new Date();
    update.rejectionReason = null;
  }
  if (status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
    update.reviewedById = req.user.role === 'ADMIN' ? req.user.id : null;
    update.reviewedAt = req.user.role === 'ADMIN' ? new Date() : null;
    update.rejectionReason = null;
  }
  if (req.user.role === 'ADMIN' && featured !== undefined) update.featured = featured;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({ where: { id }, data: update });

    if (becameCancelled || (scheduleChanged && updated.status === 'PUBLISHED')) {
      const people = await tx.registration.findMany({
        where: { eventId: id, status: { in: ['REGISTERED', 'WAITLISTED', 'PENDING'] } },
        select: { userId: true },
      });
      await notify(
        tx,
        people.map((p) => p.userId),
        becameCancelled
          ? { title: 'Event cancelled', message: `"${updated.title}" has been cancelled by the organiser.`, link: `/events/${id}`, type: 'EVENT' }
          : { title: 'Event updated', message: `The schedule or venue of "${updated.title}" has changed. Please check the details.`, link: `/events/${id}`, type: 'EVENT' }
      );
    }

    // More capacity (or a reopened event) may free seats for the waitlist.
    if (updated.status === 'PUBLISHED') await promoteWaitlist(tx, id);
  });

  if (submitted) {
    await notifyAdmins(prisma, {
      title: 'Event awaiting approval',
      message: `${req.user.name} submitted "${existing.title}" for review.`,
      link: '/admin/approvals',
      type: 'APPROVAL',
    });
  }
  await audit(req, 'event.update', 'Event', id, { title: existing.title, status: status || existing.status });

  const event = await prisma.event.findUnique({ where: { id }, include: countInclude });
  res.json({ event: shape(event) });
});

// PATCH /api/events/:id/approve  (admin) - publish an event that is waiting for review
const approveEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  if (existing.status !== 'PENDING_APPROVAL') throw new HttpError(409, 'This event is not waiting for approval');

  const event = await prisma.event.update({
    where: { id },
    data: { status: 'PUBLISHED', reviewedById: req.user.id, reviewedAt: new Date(), rejectionReason: null },
    include: countInclude,
  });
  await notify(prisma, [event.organizerId], {
    title: 'Event approved',
    message: `"${event.title}" was approved and is now live.`,
    link: `/events/${id}`,
    type: 'APPROVAL',
  });
  await audit(req, 'event.approve', 'Event', id, { title: event.title });
  res.json({ event: shape(event) });
});

// PATCH /api/events/:id/reject  (admin) - send an event back to the organiser with a reason
const rejectEvent = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { reason } = rejectEventSchema.parse(req.body);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Event not found');
  if (existing.status !== 'PENDING_APPROVAL') throw new HttpError(409, 'This event is not waiting for approval');

  const event = await prisma.event.update({
    where: { id },
    data: { status: 'REJECTED', rejectionReason: reason, reviewedById: req.user.id, reviewedAt: new Date() },
    include: countInclude,
  });
  await notify(prisma, [event.organizerId], {
    title: 'Event needs changes',
    message: `"${event.title}" was not approved: ${reason}`,
    link: `/organizer/events/${id}/edit`,
    type: 'APPROVAL',
  });
  await audit(req, 'event.reject', 'Event', id, { title: event.title, reason });
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
      mode: existing.mode,
      onlineUrl: existing.onlineUrl,
      fee: existing.fee,
      eventType: existing.eventType,
      department: existing.department,
      eligibility: existing.eligibility,
      requirements: existing.requirements,
      agenda: existing.agenda || undefined,
      speakers: existing.speakers || undefined,
      team: existing.team || undefined,
      faqs: existing.faqs || undefined,
      contactEmail: existing.contactEmail,
      contactPhone: existing.contactPhone,
      terms: existing.terms,
      requiresRegistrationApproval: existing.requiresRegistrationApproval,
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
  await audit(req, 'event.delete', 'Event', id, { title: existing.title });
  res.json({ message: 'Event deleted' });
});

module.exports = {
  listEvents,
  myEvents,
  pendingEvents,
  getEvent,
  createEvent,
  updateEvent,
  approveEvent,
  rejectEvent,
  duplicateEvent,
  deleteEvent,
  shape,
  countInclude,
};
