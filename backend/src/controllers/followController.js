const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/validators');

const loadOrganizer = async (id) => {
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, isActive: true } });
  if (!u || !u.isActive || !['ORGANIZER', 'ADMIN'].includes(u.role)) throw new HttpError(404, 'Organiser not found');
  return u;
};

// GET /api/follows/organizer/:id - public counts; "following" only when signed in is handled by /mine
const status = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'organiser id');
  const organizer = await loadOrganizer(id);
  const [followers, mine] = await Promise.all([
    prisma.organizerFollow.count({ where: { organizerId: id } }),
    prisma.organizerFollow.findUnique({ where: { followerId_organizerId: { followerId: req.user.id, organizerId: id } } }),
  ]);
  res.json({ organizer: { id: organizer.id, name: organizer.name }, followers, following: Boolean(mine) });
});

// POST /api/follows/organizer/:id  (student)
const follow = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'organiser id');
  if (id === req.user.id) throw new HttpError(400, 'You cannot follow yourself');
  await loadOrganizer(id);
  await prisma.organizerFollow.upsert({
    where: { followerId_organizerId: { followerId: req.user.id, organizerId: id } },
    update: {}, create: { followerId: req.user.id, organizerId: id },
  });
  res.status(201).json({ following: true, followers: await prisma.organizerFollow.count({ where: { organizerId: id } }) });
});

// DELETE /api/follows/organizer/:id  (student)
const unfollow = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'organiser id');
  await prisma.organizerFollow.deleteMany({ where: { followerId: req.user.id, organizerId: id } });
  res.json({ following: false, followers: await prisma.organizerFollow.count({ where: { organizerId: id } }) });
});

// GET /api/follows/mine  (student) - organisers I follow, with their upcoming events
const mine = asyncHandler(async (req, res) => {
  const rows = await prisma.organizerFollow.findMany({
    where: { followerId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 200,
    include: { organizer: { select: { id: true, name: true, department: true } } },
  });
  const upcoming = await prisma.event.groupBy({
    by: ['organizerId'], _count: { _all: true },
    where: { organizerId: { in: rows.map((r) => r.organizerId) }, status: 'PUBLISHED', endsAt: { gte: new Date() } },
  });
  const count = new Map(upcoming.map((u) => [u.organizerId, u._count._all]));
  res.json({ organizers: rows.map((r) => ({ ...r.organizer, upcomingEvents: count.get(r.organizerId) || 0, since: r.createdAt })) });
});

// GET /api/follows/followers  (organiser / admin) - how many students follow me
const myFollowers = asyncHandler(async (req, res) => {
  res.json({ followers: await prisma.organizerFollow.count({ where: { organizerId: req.user.id } }) });
});

module.exports = { status, follow, unfollow, mine, myFollowers };
