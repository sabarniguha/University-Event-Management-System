const prisma = require('./prismaClient');

// Creates one in-app notification per user.
// Usage: notify(prisma, [userId, ...], { title, message, link, type, refKey })
// Pass a transaction client as `db` to keep the notification atomic with the change that caused it.
// `refKey` makes a notification idempotent per user (the same refKey is never created twice).
async function notify(db, userIds, { title, message, link, type, refKey }) {
  const client = db || prisma;
  const ids = [...new Set([].concat(userIds))].filter(Boolean);
  if (ids.length === 0) return;
  await client.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      title,
      message,
      link: link || null,
      type: type || 'GENERAL',
      refKey: refKey || null,
    })),
    skipDuplicates: true,
  });
}

// Notifies every admin (e.g. a new event is waiting for approval).
async function notifyAdmins(db, payload) {
  const client = db || prisma;
  const admins = await client.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  await notify(client, admins.map((a) => a.id), payload);
}

module.exports = { notify, notifyAdmins };
