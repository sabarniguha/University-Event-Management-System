const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/validators');

// GET /api/notifications - latest 50 plus the unread count for the bell badge
const list = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
  ]);
  res.json({ notifications, unreadCount });
});

// POST /api/notifications/read-all
const readAll = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const result = await prisma.notification.updateMany({
    where: { id, userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  // updateMany matches 0 rows for both "already read" and "not yours"; only 404 if it does not exist for this user.
  if (result.count === 0) {
    const exists = await prisma.notification.findFirst({ where: { id, userId: req.user.id }, select: { id: true } });
    if (!exists) throw new HttpError(404, 'Notification not found');
  }
  res.json({ ok: true });
});

module.exports = { list, readAll, markRead };
