const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId, feedbackSchema } = require('../utils/validators');

// POST /api/feedback/:eventId  (students) - only for events they were marked present at
const submit = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const { rating, comment } = feedbackSchema.parse(req.body);

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    include: { attendance: { select: { status: true } } },
  });
  if (!registration || registration.status !== 'REGISTERED' || registration.attendance?.status !== 'PRESENT') {
    throw new HttpError(403, 'You can only review events you attended');
  }

  const feedback = await prisma.feedback.upsert({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    update: { rating, comment: comment ?? null },
    create: { eventId, userId: req.user.id, rating, comment: comment ?? null },
  });
  res.status(201).json({ feedback });
});

// GET /api/feedback/event/:eventId  (organiser of event / admin)
const eventFeedback = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);

  const items = await prisma.feedback.findMany({
    where: { eventId },
    orderBy: { updatedAt: 'desc' },
    include: { user: { select: { name: true, department: true } } },
  });

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const f of items) {
    counts[f.rating] += 1;
    sum += f.rating;
  }
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: counts[rating] }));
  const average = items.length ? Math.round((sum / items.length) * 10) / 10 : null;

  res.json({ event, feedback: items, summary: { count: items.length, average, distribution } });
});

module.exports = { submit, eventFeedback };
