// Attendance only while the event runs; certificates only after it ends and only for present students.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const H = 3600e3;
let ev = {}; let wheres = []; let regs = [];
const prisma = {
  registration: {
    findUnique: async () => ({ id: 5, status: 'REGISTERED', event: ev, user: {}, attendance: null }),
    findMany: async (a) => { wheres.push(a.where); return regs; },
    count: async () => 0,
  },
  attendance: { upsert: async () => ({}), createMany: async () => ({}) },
  certificate: { findMany: async () => [] },
  $transaction: async (fn) => fn({ certificate: { createMany: async () => {} } }),
};
stub('utils/prismaClient.js', prisma);
stub('utils/access.js', { loadManagedEvent: async () => ev, canManageEvent: () => true });
stub('utils/notify.js', { notify: async () => {} });
stub('utils/audit.js', { audit: async () => {} });
stub('utils/emailUsers.js', { emailUsers: () => {} });
const att = require(R('controllers/attendanceController.js'));
const cert = require(R('controllers/certificateController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const user = { id: 1, role: 'ADMIN' };
const mk = (s, e) => ({ id: 7, title: 'T', status: 'PUBLISHED', startsAt: new Date(Date.now() + s * H), endsAt: new Date(Date.now() + e * H) });

test('attendance is refused before the event starts and after it ends', async () => {
  for (const [s, e] of [[1, 2], [-3, -1]]) {
    ev = mk(s, e);
    assert.strictEqual((await run(att.markAttendance, { user, body: { registrationId: 5, status: 'PRESENT' } })).err.status, 400);
    assert.strictEqual((await run(att.bulkMark, { user, body: { eventId: 7, status: 'ABSENT' } })).err.status, 400);
    assert.strictEqual((await run(att.checkIn, { user, body: { eventId: 7, ticketCode: 'ABCDEFGH12' } })).err.status, 400);
  }
});

test('attendance can be marked while the event is running', async () => {
  ev = mk(-1, 1);
  const { out, err } = await run(att.markAttendance, { user, body: { registrationId: 5, status: 'PRESENT' } });
  assert.ok(!err); assert.ok(out.attendance);
});

test('certificates are refused until the event has ended', async () => {
  ev = mk(-1, 1);
  assert.strictEqual((await run(cert.generate, { user, body: { eventId: 7 } })).err.status, 400);
});

test('after the event only present students are certified, even if includeRegistered is sent', async () => {
  ev = mk(-3, -1); wheres = []; regs = [];
  await run(cert.generate, { user, body: { eventId: 7, includeRegistered: true } });
  assert.deepStrictEqual(wheres[0].attendance, { is: { status: 'PRESENT' } });
});

test('names are flagged as not registered or not present', async () => {
  ev = mk(-3, -1);
  regs = [
    { id: 1, user: { name: 'Asha Rao' }, attendance: { status: 'PRESENT' }, certificate: null },
    { id: 2, user: { name: 'Ravi K' }, attendance: null, certificate: null },
  ];
  const { out } = await run(cert.checkNames, { user, params: { eventId: '7' }, body: { names: ['asha  rao', 'Ravi K', 'Nobody'] } });
  assert.deepStrictEqual(out.results.map((r) => r.status), ['OK', 'NOT_PRESENT', 'NOT_REGISTERED']);
});
