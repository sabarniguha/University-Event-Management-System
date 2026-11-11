const prisma = require('./prismaClient');

// Creates one in-app notification per user.
// Usage: notify(prisma, [userId, ...], { title, message, link })
// Pass a transaction client as `db` to keep the notification atomic with the change that caused it.
async function notify(db, userIds, { title, message, link }) {
  const client = db || prisma;
  const ids = [...new Set([].concat(userIds))].filter(Boolean);
  if (ids.length === 0) return;
  await client.notification.createMany({
    data: ids.map((userId) => ({ userId, title, message, link: link || null })),
  });
}

module.exports = { notify };
