const router = require('express').Router();
const crypto = require('crypto');
const { sendDueReminders } = require('../utils/reminders');
const { sendHourReminders } = require('../utils/reminders1h');

// Lets an external scheduler (GitHub Actions, cron-job.org, ...) trigger reminders and keep a sleeping
// free-plan service awake. Disabled unless CRON_SECRET is set. Send it as the "x-cron-secret" header.
const same = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

router.post('/reminders', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(404).json({ message: 'Not enabled' });
  if (!same(req.get('x-cron-secret'), secret)) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await sendDueReminders();
    await sendHourReminders();
    res.json({ ok: true });
  } catch (e) {
    console.error('[cron] reminders failed:', e.message);
    res.status(500).json({ message: 'Failed' });
  }
});

module.exports = router;
