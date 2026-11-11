const bcrypt = require('bcryptjs');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');
const { parseId, roleSchema, adminCreateUserSchema } = require('../utils/validators');

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

// GET /api/admin/stats
const stats = asyncHandler(async (req, res) => {
  const [users, students, organizers, admins, events, published, registrations, present, announcements] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'ORGANIZER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.event.count(),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.registration.count({ where: { status: 'REGISTERED' } }),
      prisma.attendance.count({ where: { status: 'PRESENT' } }),
      prisma.announcement.count({ where: { status: 'PUBLISHED' } }),
    ]);

  res.json({
    stats: { users, students, organizers, admins, events, published, registrations, present, announcements },
  });
});

// GET /api/admin/analytics - chart data for the admin analytics page
const analytics = asyncHandler(async (req, res) => {
  const now = new Date();

  // Last 6 calendar months (including the current one)
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en', { month: 'short' }), count: 0 });
  }
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [recentRegs, categories, deptRows, topEventRows, endedRegistered, endedPresent, methods, ratingAgg, waitlisted] =
    await Promise.all([
      prisma.registration.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.event.groupBy({ by: ['category'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
      prisma.registration.findMany({ where: { status: 'REGISTERED' }, select: { user: { select: { department: true } } } }),
      prisma.event.findMany({
        where: { status: { not: 'DRAFT' } },
        select: {
          id: true, title: true, capacity: true,
          _count: { select: { registrations: { where: { status: 'REGISTERED' } } } },
        },
      }),
      prisma.registration.count({
        where: { status: 'REGISTERED', event: { status: { not: 'DRAFT' }, endsAt: { lt: now } } },
      }),
      prisma.attendance.count({
        where: { status: 'PRESENT', registration: { status: 'REGISTERED', event: { status: { not: 'DRAFT' }, endsAt: { lt: now } } } },
      }),
      prisma.attendance.groupBy({ by: ['method'], where: { status: 'PRESENT' }, _count: { _all: true } }),
      prisma.feedback.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
      prisma.registration.count({ where: { status: 'WAITLISTED' } }),
    ]);

  recentRegs.forEach((r) => {
    const d = r.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.count += 1;
  });

  const deptCounts = new Map();
  deptRows.forEach((r) => {
    const name = r.user.department || 'Unspecified';
    deptCounts.set(name, (deptCounts.get(name) || 0) + 1);
  });

  const topEvents = topEventRows
    .map((e) => ({ id: e.id, title: e.title, capacity: e.capacity, registered: e._count.registrations }))
    .sort((a, b) => b.registered - a.registered)
    .slice(0, 5)
    .map((e) => ({ ...e, fill: pct(e.registered, e.capacity) }));

  const average = ratingAgg._avg.rating;
  res.json({
    registrationsByMonth: months.map(({ label, count }) => ({ label, count })),
    eventsByCategory: categories.map((c) => ({ label: c.category, count: c._count._all })).sort((a, b) => b.count - a.count),
    registrationsByDepartment: [...deptCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topEvents,
    attendance: {
      rate: pct(endedPresent, endedRegistered),
      present: endedPresent,
      registeredAtEndedEvents: endedRegistered,
      viaQr: methods.find((m) => m.method === 'QR')?._count._all || 0,
      manual: methods.find((m) => m.method === 'MANUAL')?._count._all || 0,
    },
    feedback: { average: average === null ? null : Math.round(average * 10) / 10, count: ratingAgg._count._all },
    waitlisted,
  });
});

// GET /api/admin/users?q=&role=
const listUsers = asyncHandler(async (req, res) => {
  const { q, role } = req.query;
  const where = {};
  if (role && ['STUDENT', 'ORGANIZER', 'ADMIN'].includes(String(role))) where.role = String(role);
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' } },
      { email: { contains: String(q), mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
  });
  res.json({ users });
});

// POST /api/admin/users - create an account of any role (used for organisers and admins)
const createUser = asyncHandler(async (req, res) => {
  const data = adminCreateUserSchema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      department: data.department,
      phone: data.phone,
    },
    select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
  });
  res.status(201).json({ user });
});

// PATCH /api/admin/users/:id/role
const updateUserRole = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { role } = roleSchema.parse(req.body);
  if (id === req.user.id) throw new HttpError(400, 'You cannot change your own role');

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  await notify(prisma, [id], {
    title: 'Your role changed',
    message: `An administrator changed your account role to ${role}. Sign in through the matching login page.`,
  });
  res.json({ user });
});

// DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === req.user.id) throw new HttpError(400, 'You cannot delete your own account');

  const owned = await prisma.event.count({ where: { organizerId: id } });
  if (owned > 0) throw new HttpError(409, 'This user still owns events. Delete or reassign them first.');

  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
});

module.exports = { stats, analytics, listUsers, createUser, updateUserRole, deleteUser };
