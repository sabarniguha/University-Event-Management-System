const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { notify } = require('../utils/notify');
const { shortName } = require('../utils/rewards');

const clean = (s) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const MAX_PER_EVENT_PER_USER = 5;

const loadPublished = async (eventId) => {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, status: true, organizerId: true } });
  if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
  return event;
};

// Askers are shown by shortened name only, like the leaderboard.
const shape = (q, manager, me) => ({
  id: q.id, question: q.question, answer: q.answer, answeredAt: q.answeredAt, createdAt: q.createdAt, asker: shortName(q.asker?.name),
  mine: Boolean(me && q.askerId === me.id), ...(manager ? { hidden: q.hidden } : {}),
});

// GET /api/qa/event/:eventId  (public; managers also see hidden ones)
const list = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadPublished(eventId);
  const manager = Boolean(req.user && canManageEvent(req.user, event));
  const rows = await prisma.eventQA.findMany({
    where: { eventId, ...(manager ? {} : { hidden: false }) }, orderBy: { createdAt: 'desc' }, take: 100,
    include: { asker: { select: { name: true } } },
  });
  res.json({ canAsk: Boolean(req.user && req.user.role === 'STUDENT'), manager, questions: rows.map((q) => shape(q, manager, req.user)) });
});

// POST /api/qa/event/:eventId  { question }  (student)
const ask = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadPublished(eventId);
  const { question } = z.object({ question: z.string().trim().min(5, 'Please write a little more').max(300) }).parse(req.body);
  if ((await prisma.eventQA.count({ where: { eventId, askerId: req.user.id } })) >= MAX_PER_EVENT_PER_USER) throw new HttpError(429, `You can ask up to ${MAX_PER_EVENT_PER_USER} questions on one event`);
  const row = await prisma.eventQA.create({ data: { eventId, askerId: req.user.id, question: clean(question) }, include: { asker: { select: { name: true } } } });
  await notify(prisma, event.organizerId, { title: 'New question on your event', message: `A student asked about "${event.title}": ${row.question.slice(0, 120)}`, link: `/events/${eventId}`, type: 'QA' });
  res.status(201).json({ question: shape(row, false, req.user) });
});

const loadForManager = async (id, user) => {
  const q = await prisma.eventQA.findUnique({ where: { id }, include: { event: { select: { id: true, title: true, organizerId: true } } } });
  if (!q) throw new HttpError(404, 'Question not found');
  if (!canManageEvent(user, q.event)) throw new HttpError(403, 'You do not manage this event');
  return q;
};

// PATCH /api/qa/:id/answer  { answer }
const answer = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'question id');
  const q = await loadForManager(id, req.user);
  const { answer: text } = z.object({ answer: z.string().trim().min(2).max(1000) }).parse(req.body);
  const row = await prisma.eventQA.update({ where: { id }, data: { answer: clean(text), answeredById: req.user.id, answeredAt: new Date() }, include: { asker: { select: { name: true } } } });
  await notify(prisma, q.askerId, { title: 'Your question was answered', message: `"${q.event.title}": ${clean(text).slice(0, 140)}`, link: `/events/${q.event.id}`, type: 'QA' });
  res.json({ question: shape(row, true, req.user) });
});

// PATCH /api/qa/:id/hide  { hidden }
const hide = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'question id');
  await loadForManager(id, req.user);
  const { hidden } = z.object({ hidden: z.boolean() }).parse(req.body);
  await prisma.eventQA.update({ where: { id }, data: { hidden } });
  res.json({ hidden });
});

// DELETE /api/qa/:id  (the asker while unanswered, or the event's organiser / an admin)
const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'question id');
  const q = await prisma.eventQA.findUnique({ where: { id }, include: { event: { select: { organizerId: true } } } });
  if (!q) throw new HttpError(404, 'Question not found');
  const own = q.askerId === req.user.id && !q.answer;
  if (!own && !canManageEvent(req.user, q.event)) throw new HttpError(403, 'You cannot delete this question');
  await prisma.eventQA.delete({ where: { id } });
  res.json({ removed: true });
});

module.exports = { list, ask, answer, hide, remove };
