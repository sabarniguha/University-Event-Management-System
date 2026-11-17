const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { toCsv, safeFilename } = require('../utils/csv');

const ACTIVE = ['REGISTERED', 'PENDING', 'WAITLISTED', 'AWAITING_PAYMENT'];
const MAX_QUESTIONS = 15;

const questionSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  kind: z.enum(['REGISTRATION', 'FEEDBACK']),
  label: z.string().trim().min(3, 'Each question needs at least 3 characters').max(200),
  type: z.enum(['TEXT', 'CHOICE', 'RATING', 'YESNO']),
  options: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  required: z.boolean().default(false),
}).superRefine((q, ctx) => {
  if (q.type === 'CHOICE' && (!q.options || new Set(q.options).size < 2)) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: `"${q.label}" needs at least two different choices` });
  }
});
const questionsBody = z.object({ questions: z.array(questionSchema).max(MAX_QUESTIONS, `At most ${MAX_QUESTIONS} questions per event`) });
const answersBody = z.object({ answers: z.array(z.object({ questionId: z.coerce.number().int().positive(), value: z.string().max(1000).default('') })).max(MAX_QUESTIONS) });

const shape = (q) => ({ id: q.id, kind: q.kind, label: q.label, type: q.type, options: Array.isArray(q.options) ? q.options : [], required: q.required });

// ---------------------------------------------------------------- organiser / admin

// GET /api/surveys/event/:eventId/manage
const manage = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const questions = await prisma.eventQuestion.findMany({
    where: { eventId }, orderBy: [{ position: 'asc' }, { id: 'asc' }], include: { answers: { select: { value: true } } },
  });
  res.json({
    event: { id: event.id, title: event.title },
    questions: questions.map((q) => {
      const values = q.answers.map((a) => a.value);
      let summary = null;
      if (q.type === 'RATING') {
        const nums = values.map(Number).filter((n) => n >= 1 && n <= 5);
        summary = { average: nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null };
      } else if (q.type === 'CHOICE' || q.type === 'YESNO') {
        const counts = {};
        values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
        summary = { counts };
      }
      return { ...shape(q), answered: values.length, summary };
    }),
  });
});

// PUT /api/surveys/event/:eventId/questions - the full list; ids are kept so existing answers survive edits
const saveQuestions = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  await loadManagedEvent(eventId, req.user);
  const { questions } = questionsBody.parse(req.body);

  const existing = await prisma.eventQuestion.findMany({ where: { eventId }, select: { id: true, type: true } });
  const known = new Map(existing.map((q) => [q.id, q]));
  const keep = new Set(questions.filter((q) => q.id && known.has(q.id)).map((q) => q.id));

  await prisma.$transaction(async (tx) => {
    await tx.eventQuestion.deleteMany({ where: { eventId, id: { notIn: [...keep] } } });
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const data = { kind: q.kind, label: q.label, type: q.type, options: q.type === 'CHOICE' ? q.options : null, required: q.required, position: i };
      if (q.id && known.has(q.id)) {
        // Changing the type would make old answers meaningless, so those answers are cleared.
        // eslint-disable-next-line no-await-in-loop
        if (known.get(q.id).type !== q.type) await tx.eventAnswer.deleteMany({ where: { questionId: q.id } });
        // eslint-disable-next-line no-await-in-loop
        await tx.eventQuestion.update({ where: { id: q.id }, data });
      } else {
        // eslint-disable-next-line no-await-in-loop
        await tx.eventQuestion.create({ data: { eventId, ...data } });
      }
    }
  });
  res.json({ ok: true });
});

// GET /api/surveys/event/:eventId/export
const exportAnswers = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const [questions, regs] = await Promise.all([
    prisma.eventQuestion.findMany({ where: { eventId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
    prisma.registration.findMany({
      where: { eventId, status: { in: ACTIVE } }, orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, studentId: true, department: true } } },
    }),
  ]);
  const answers = await prisma.eventAnswer.findMany({ where: { questionId: { in: questions.map((q) => q.id) } } });
  const map = new Map(answers.map((a) => [`${a.questionId}:${a.userId}`, a.value]));
  const header = ['Name', 'Email', 'Student ID', 'Department', 'Registration status', ...questions.map((q) => `${q.kind === 'FEEDBACK' ? '[Feedback] ' : ''}${q.label}`)];
  const rows = regs.map((r) => [r.user.name, r.user.email, r.user.studentId || '', r.user.department || '', r.status, ...questions.map((q) => map.get(`${q.id}:${r.user.id}`) || '')]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="survey_${safeFilename(event.title)}.csv"`);
  res.send(toCsv(header, rows));
});

// ---------------------------------------------------------------- students

// Which question kinds this student may currently see and answer.
async function allowedKinds(event, userId) {
  const reg = await prisma.registration.findUnique({ where: { eventId_userId: { eventId: event.id, userId } }, select: { status: true } });
  if (!reg || !ACTIVE.includes(reg.status) || event.status !== 'PUBLISHED') return [];
  const kinds = ['REGISTRATION'];
  if (event.endsAt <= new Date() && reg.status === 'REGISTERED') kinds.push('FEEDBACK');
  return kinds;
}

// GET /api/surveys/event/:eventId  - the questions this student can answer, with their saved answers
const mine = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  const kinds = await allowedKinds(event, req.user.id);
  if (kinds.length === 0) return res.json({ questions: [] });
  const questions = await prisma.eventQuestion.findMany({ where: { eventId, kind: { in: kinds } }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  const saved = await prisma.eventAnswer.findMany({ where: { userId: req.user.id, questionId: { in: questions.map((q) => q.id) } } });
  const map = new Map(saved.map((a) => [a.questionId, a.value]));
  return res.json({ questions: questions.map((q) => ({ ...shape(q), answer: map.get(q.id) || '' })) });
});

// PUT /api/surveys/event/:eventId/answers
const saveAnswers = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  const kinds = await allowedKinds(event, req.user.id);
  const { answers } = answersBody.parse(req.body);
  const questions = await prisma.eventQuestion.findMany({ where: { eventId, kind: { in: kinds } } });
  if (questions.length === 0) throw new HttpError(403, 'There are no questions you can answer right now');
  const given = new Map(answers.map((a) => [a.questionId, a.value.trim()]));
  const saved = await prisma.eventAnswer.findMany({ where: { userId: req.user.id, questionId: { in: questions.map((q) => q.id) } } });
  const had = new Set(saved.map((a) => a.questionId));

  const writes = [];
  for (const q of questions) {
    if (!given.has(q.id)) continue; // untouched question keeps its saved answer
    const value = given.get(q.id);
    if (value === '') {
      if (q.required) throw new HttpError(400, `Please answer: ${q.label}`);
      if (had.has(q.id)) writes.push(prisma.eventAnswer.deleteMany({ where: { questionId: q.id, userId: req.user.id } }));
      continue; // eslint-disable-line no-continue
    }
    if (q.type === 'CHOICE' && !(Array.isArray(q.options) ? q.options : []).includes(value)) throw new HttpError(400, `Pick one of the listed choices for: ${q.label}`);
    if (q.type === 'YESNO' && !['Yes', 'No'].includes(value)) throw new HttpError(400, `Answer Yes or No for: ${q.label}`);
    if (q.type === 'RATING' && !/^[1-5]$/.test(value)) throw new HttpError(400, `Give a rating from 1 to 5 for: ${q.label}`);
    writes.push(prisma.eventAnswer.upsert({
      where: { questionId_userId: { questionId: q.id, userId: req.user.id } },
      update: { value }, create: { questionId: q.id, userId: req.user.id, value },
    }));
  }
  // Required questions are only enforced for the group (registration or feedback) being submitted.
  const submittedKinds = new Set(questions.filter((q) => given.has(q.id)).map((q) => q.kind));
  for (const q of questions) {
    if (q.required && submittedKinds.has(q.kind) && !given.has(q.id) && !had.has(q.id)) throw new HttpError(400, `Please answer: ${q.label}`);
  }
  await prisma.$transaction(writes);
  res.json({ ok: true });
});

module.exports = { manage, saveQuestions, exportAnswers, mine, saveAnswers };
