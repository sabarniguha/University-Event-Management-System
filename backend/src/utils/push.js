const prisma = require('./prismaClient');

// Browser push is optional: it switches on when both VAPID keys are set. Generate them once with `npm run push:keys`.
const enabled = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
const publicKey = () => process.env.VAPID_PUBLIC_KEY || null;

let lib; // loaded lazily so a missing package can never stop the server
const webpush = () => {
  if (lib === undefined) {
    try {
      lib = require('web-push');
      lib.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${(process.env.MAIL_FROM || '').match(/<(.+)>/)?.[1] || process.env.SMTP_USER || 'admin@example.com'}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    } catch (e) {
      console.error('[push] web-push is unavailable:', e.message);
      lib = null;
    }
  }
  return lib;
};

const trim = (s, n) => String(s || '').slice(0, n);

// Sends a push to every device of the given users. Never throws and never blocks the caller.
async function pushToUsers(userIds, { title, message, link }) {
  try {
    if (!enabled()) return;
    const ids = [...new Set([].concat(userIds))].filter(Boolean);
    if (ids.length === 0) return;
    const wp = webpush();
    if (!wp) return;
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } }, take: 20000 });
    if (subs.length === 0) return;
    const payload = JSON.stringify({ title: trim(title, 80), body: trim(message, 160), url: link && String(link).startsWith('/') ? link : '/notifications' });
    await Promise.all(subs.map(async (s) => {
      try {
        await wp.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 24 * 3600 });
      } catch (e) {
        // 404 / 410 = the device removed the subscription; forget it.
        if (e && (e.statusCode === 404 || e.statusCode === 410)) await prisma.pushSubscription.deleteMany({ where: { id: s.id } }).catch(() => {});
        else console.error('[push] send failed:', e && (e.statusCode || e.message));
      }
    }));
  } catch (e) {
    console.error('[push] could not send:', e.message);
  }
}

module.exports = { enabled, publicKey, pushToUsers };
