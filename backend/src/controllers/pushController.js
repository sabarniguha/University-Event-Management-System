const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { enabled, publicKey, pushToUsers } = require('../utils/push');

const subSchema = z.object({
  endpoint: z.string().url().max(1000).regex(/^https:\/\//, 'Push endpoints must be https'),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

// GET /api/push/config
const config = (req, res) => res.json({ enabled: enabled(), publicKey: enabled() ? publicKey() : null });

// GET /api/push/status - is this account subscribed on any device
const status = asyncHandler(async (req, res) => res.json({ devices: await prisma.pushSubscription.count({ where: { userId: req.user.id } }) }));

// POST /api/push/subscribe
const subscribe = asyncHandler(async (req, res) => {
  if (!enabled()) throw new HttpError(404, 'Browser notifications are not switched on for this site');
  const { endpoint, keys } = subSchema.parse(req.body);
  if ((await prisma.pushSubscription.count({ where: { userId: req.user.id } })) >= 10) throw new HttpError(400, 'You have notifications on for too many devices. Turn some off first.');
  // An endpoint belongs to one browser; if someone else signed in there before, it moves to this account.
  await prisma.pushSubscription.upsert({
    where: { endpoint }, update: { userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth }, create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.status(201).json({ subscribed: true });
});

// POST /api/push/unsubscribe  { endpoint }
const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(req.body);
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
  res.json({ subscribed: false });
});

// POST /api/push/test - sends a test notification to my devices
const test = asyncHandler(async (req, res) => {
  if (!enabled()) throw new HttpError(404, 'Browser notifications are not switched on for this site');
  await pushToUsers(req.user.id, { title: 'UniEvents', message: 'Browser notifications are working on this device.', link: '/notifications' });
  res.json({ sent: true });
});

module.exports = { config, status, subscribe, unsubscribe, test };
