const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');
const { shape, countInclude } = require('./eventController');

const DAY_MS = 24 * 60 * 60 * 1000;
const same = (a, b) => Boolean(a) && Boolean(b) && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

// Pure scoring so it can be tested: higher is a better fit. `taste` counts the student's past categories/types.
function scoreEvent(event, { department, taste, now = Date.now() }) {
  let score = 0;
  const reasons = [];
  if (same(event.department, department)) { score += 3; reasons.push('Open to your department'); }
  const cat = taste.categories[event.category] || 0;
  if (cat > 0) { score += Math.min(4, 1.5 + cat * 0.5); reasons.push(`You have joined ${event.category} events before`); }
  if (event.eventType && taste.types[event.eventType]) { score += 1; }
  const filled = event.capacity > 0 ? Math.min(1, (event.registeredCount || 0) / event.capacity) : 0;
  if (filled >= 0.5) { score += 1; reasons.push('Filling up fast'); }
  const startsIn = new Date(event.startsAt).getTime() - now;
  if (startsIn >= 0 && startsIn <= 14 * DAY_MS) { score += 1; reasons.push('Happening soon'); }
  // Tiny tie-break so earlier events win when everything else is equal.
  score += Math.max(0, 1 - startsIn / (90 * DAY_MS)) * 0.1;
  return { score, reasons };
}

// GET /api/recommendations  (students) - upcoming events they have not joined, ranked for them
const forMe = asyncHandler(async (req, res) => {
  const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 6));
  const now = new Date();
  const [mine, user] = await Promise.all([
    prisma.registration.findMany({
      where: { userId: req.user.id },
      select: { status: true, eventId: true, attendance: { select: { status: true } }, event: { select: { category: true, eventType: true } } },
    }),
    prisma.user.findUnique({ where: { id: req.user.id }, select: { department: true } }),
  ]);

  const taste = { categories: {}, types: {} };
  let history = 0;
  for (const r of mine) {
    if (!['REGISTERED', 'PENDING', 'AWAITING_PAYMENT'].includes(r.status)) continue;
    const weight = r.attendance?.status === 'PRESENT' ? 2 : 1; // events they actually attended say more
    taste.categories[r.event.category] = (taste.categories[r.event.category] || 0) + weight;
    if (r.event.eventType) taste.types[r.event.eventType] = (taste.types[r.event.eventType] || 0) + weight;
    history += 1;
  }
  const joined = new Set(mine.filter((r) => !['CANCELLED', 'REJECTED'].includes(r.status)).map((r) => r.eventId));

  const candidates = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED', endsAt: { gt: now }, id: { notIn: [...joined] },
      OR: [{ registrationDeadline: null }, { registrationDeadline: { gt: now } }],
    },
    orderBy: { startsAt: 'asc' },
    take: 100,
    include: countInclude,
  });

  const department = user?.department;
  const ranked = candidates.map(shape)
    .map((e) => ({ e, ...scoreEvent(e, { department, taste }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  res.json({
    personalized: history > 0 || Boolean(department),
    events: ranked.map(({ e, reasons }) => ({ ...e, reasons: reasons.slice(0, 2) })),
  });
});

module.exports = { forMe, scoreEvent };
