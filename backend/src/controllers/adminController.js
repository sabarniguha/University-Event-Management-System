const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, roleSchema } = require('../utils/validators');

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

module.exports = { stats, listUsers, updateUserRole, deleteUser };
