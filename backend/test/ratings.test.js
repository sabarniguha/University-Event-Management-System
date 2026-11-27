const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let regs = []; let rated = []; let notified = [];
stub('utils/prismaClient.js', {
  event: { findMany: async (a) => [{ id: 1, title: 'Fest', endsAt: a.where.endsAt.lte }] },
  registration: { findMany: async (a) => { assert.deepStrictEqual(a.where.attendance, { is: { status: 'PRESENT' } }); return regs; } },
  feedback: { findMany: async () => rated },
});
stub('utils/notify.js', { notify: async (_d, ids, p) => { notified.push({ ids, p }); } });
const { sendRatePrompts } = require(R('utils/ratePrompts.js'));
const { buildRanking } = require(R('controllers/feedbackRankingController.js'));

test('asks only present students who have not rated yet, once per event', async () => {
  regs = [1, 2, 3].map((userId) => ({ userId, user: { notificationPrefs: userId === 3 ? { reminders: false } : null } }));
  rated = [{ userId: 2 }];
  await sendRatePrompts(new Date());
  assert.deepStrictEqual(notified[0].ids, [1]);
  assert.strictEqual(notified[0].p.refKey, 'rate:1');
});

test('does nothing when everyone already rated', async () => {
  notified = []; regs = [{ userId: 1, user: { notificationPrefs: null } }]; rated = [{ userId: 1 }];
  await sendRatePrompts(new Date());
  assert.strictEqual(notified.length, 0);
});

test('ranks events by average then count, and organisers by weighted average', () => {
  const groups = [
    { eventId: 1, _avg: { rating: 4 }, _count: { _all: 2 } },
    { eventId: 2, _avg: { rating: 5 }, _count: { _all: 1 } },
    { eventId: 3, _avg: { rating: 5 }, _count: { _all: 4 } },
  ];
  const events = [
    { id: 1, title: 'A', startsAt: null, organizerId: 10, organizer: { name: 'Org1' } },
    { id: 2, title: 'B', startsAt: null, organizerId: 10, organizer: { name: 'Org1' } },
    { id: 3, title: 'C', startsAt: null, organizerId: 11, organizer: { name: 'Org2' } },
  ];
  const r = buildRanking(groups, events);
  assert.deepStrictEqual(r.events.map((e) => e.eventId), [3, 2, 1]);
  assert.strictEqual(r.organizers[0].organizer, 'Org2');
  assert.strictEqual(r.organizers[1].average, 4.3); // (4*2 + 5*1) / 3
});
