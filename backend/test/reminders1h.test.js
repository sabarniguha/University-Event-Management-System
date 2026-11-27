const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const now = new Date('2026-12-01T10:00:00Z');
let events = []; let regs = []; let existing = []; let notified = []; let emailed = [];
stub('utils/prismaClient.js', {
  event: { findMany: async (a) => events.filter((e) => e.startsAt > a.where.startsAt.gt && e.startsAt <= a.where.startsAt.lte) },
  registration: { findMany: async () => regs },
  notification: { findMany: async () => existing },
});
stub('utils/notify.js', { notify: async (_db, ids, p) => { notified.push({ ids, p }); } });
stub('utils/emailUsers.js', { emailUsers: (ids, p) => { emailed.push({ ids, p }); } });
const { sendHourReminders } = require(R('utils/reminders1h.js'));

const reset = () => { notified = []; emailed = []; existing = []; };
const ev = (id, mins) => ({ id, title: 'Fest', venue: 'Hall', startsAt: new Date(now.getTime() + mins * 60000) });

test('reminds registered students of events starting within the hour', async () => {
  reset(); events = [ev(1, 50)];
  regs = [{ userId: 1, user: { notificationPrefs: null } }, { userId: 2, user: { notificationPrefs: { reminders: false } } }];
  await sendHourReminders(now);
  assert.deepStrictEqual(notified[0].ids, [1]);
  assert.strictEqual(notified[0].p.refKey, 'reminder1h:1');
  assert.deepStrictEqual(emailed[0].ids, [1]);
});

test('ignores events that are further away or already started', async () => {
  reset(); events = [ev(2, 180), ev(3, -5)];
  regs = [{ userId: 1, user: { notificationPrefs: null } }];
  await sendHourReminders(now);
  assert.strictEqual(notified.length, 0);
});

test('never sends the same student a second reminder or email', async () => {
  reset(); events = [ev(1, 40)];
  regs = [{ userId: 1, user: { notificationPrefs: null } }, { userId: 3, user: { notificationPrefs: null } }];
  existing = [{ userId: 1 }];
  await sendHourReminders(now);
  assert.deepStrictEqual(notified[0].ids, [3]);
  assert.deepStrictEqual(emailed[0].ids, [3]);
  reset(); existing = [{ userId: 1 }, { userId: 3 }];
  await sendHourReminders(now);
  assert.strictEqual(notified.length, 0);
});
