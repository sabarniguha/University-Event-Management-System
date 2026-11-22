// The student overview must count a check-in even when the event has not ended yet.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const hour = 3600e3;
const reg = (over) => ({ status: 'REGISTERED', createdAt: new Date(), event: { category: 'Tech', startsAt: new Date(Date.now() - 3 * hour), endsAt: new Date(Date.now() - hour) }, attendance: null, certificate: null, ...over });
let rows = [];
stub('utils/prismaClient.js', { registration: { findMany: async () => rows } });
const { student } = require(R('controllers/analyticsController.js'));
const run = async () => { let out; await student({ user: { id: 1 } }, { json: (x) => { out = x; } }, (e) => { throw e; }); return out.totals; };

test('a check-in on an event that is still running counts as attended', async () => {
  rows = [reg({ event: { category: 'Tech', startsAt: new Date(Date.now() - hour), endsAt: new Date(Date.now() + hour) }, attendance: { status: 'PRESENT' } })];
  const t = await run();
  assert.strictEqual(t.attended, 1);
  assert.strictEqual(t.attendanceRate, 100);
  assert.strictEqual(t.missed, 0);
});

test('finished events: present is attended, others are missed, rate is attended over finished', async () => {
  rows = [reg({ attendance: { status: 'PRESENT' } }), reg({ attendance: { status: 'ABSENT' } }), reg({ attendance: null }), reg({ attendance: { status: 'PRESENT' } })];
  const t = await run();
  assert.deepStrictEqual([t.attended, t.missed, t.attendanceRate], [2, 2, 50]);
});

test('an upcoming event not yet attended changes nothing', async () => {
  rows = [reg({ event: { category: 'Tech', startsAt: new Date(Date.now() + hour), endsAt: new Date(Date.now() + 2 * hour) } })];
  const t = await run();
  assert.deepStrictEqual([t.attended, t.upcoming, t.attendanceRate], [0, 1, null]);
});
