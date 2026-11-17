const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');
const { POINTS, empty, pointsOf, badgesOf, levelOf, shortName } = require('../utils/rewards');

// Counts for every student with any activity, from the database in three grouped queries.
async function tally(onlyUserId = null) {
  const attended = onlyUserId
    ? await prisma.$queryRaw`SELECT r."userId" AS "userId", COUNT(*)::int AS n, COUNT(DISTINCT e."category")::int AS cats
        FROM "Attendance" a JOIN "Registration" r ON r.id = a."registrationId" JOIN "Event" e ON e.id = r."eventId"
        WHERE a.status = 'PRESENT' AND r."userId" = ${onlyUserId} GROUP BY r."userId"`
    : await prisma.$queryRaw`SELECT r."userId" AS "userId", COUNT(*)::int AS n, COUNT(DISTINCT e."category")::int AS cats
        FROM "Attendance" a JOIN "Registration" r ON r.id = a."registrationId" JOIN "Event" e ON e.id = r."eventId"
        WHERE a.status = 'PRESENT' GROUP BY r."userId"`;
  const where = onlyUserId ? { userId: onlyUserId } : {};
  const [feedback, teams] = await Promise.all([
    prisma.feedback.groupBy({ by: ['userId'], where, _count: { _all: true } }),
    prisma.eventTeamMember.groupBy({ by: ['userId'], where, _count: { _all: true } }),
  ]);
  const stats = new Map();
  const get = (id) => { if (!stats.has(id)) stats.set(id, empty()); return stats.get(id); };
  attended.forEach((r) => { const s = get(r.userId); s.attended = r.n; s.categories = r.cats; });
  feedback.forEach((r) => { get(r.userId).feedback = r._count._all; });
  teams.forEach((r) => { get(r.userId).teams = r._count._all; });
  return stats;
}

// GET /api/rewards/me  (students)
const me = asyncHandler(async (req, res) => {
  const all = await tally();
  const mine = all.get(req.user.id) || empty();
  const points = pointsOf(mine);
  const ahead = [...all.values()].filter((s) => pointsOf(s) > points).length;
  res.json({ points, level: levelOf(points), stats: mine, badges: badgesOf(mine), rank: points > 0 ? ahead + 1 : null, rules: POINTS });
});

// GET /api/rewards/leaderboard  - the ten students with the most points
const leaderboard = asyncHandler(async (req, res) => {
  const all = await tally();
  const ranked = [...all.entries()].map(([userId, s]) => ({ userId, points: pointsOf(s), attended: s.attended })).filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points || b.attended - a.attended || a.userId - b.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: ranked.slice(0, 25).map((r) => r.userId) }, role: 'STUDENT', isActive: true },
    select: { id: true, name: true, department: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const top = ranked.filter((r) => byId.has(r.userId)).slice(0, 10).map((r, i) => ({
    rank: i + 1, name: shortName(byId.get(r.userId).name), department: byId.get(r.userId).department || null,
    points: r.points, attended: r.attended, level: levelOf(r.points), isMe: r.userId === req.user.id,
  }));
  res.json({ leaderboard: top, rules: POINTS });
});

module.exports = { me, leaderboard };
