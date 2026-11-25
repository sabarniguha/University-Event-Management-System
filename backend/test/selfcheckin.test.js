const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const H = 3600e3;
let ev; let reg; let saved;
stub('utils/prismaClient.js', {
  event: { findUnique: async () => ev },
  registration: { findFirst: async () => reg, count: async () => 0 },
  attendance: { upsert: async (a) => { saved = a; return { checkedInAt: new Date() }; } },
});
stub('utils/access.js', { loadManagedEvent: async () => ev });
stub('utils/notify.js', { notify: async () => {} });
const { codeFor, isValidCode } = require(R('utils/screenCode.js'));
const c = require(R('controllers/selfCheckinController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const student = { id: 3, role: 'STUDENT' };
const running = () => ({ id: 7, title: 'Fest', status: 'PUBLISHED', startsAt: new Date(Date.now() - H), endsAt: new Date(Date.now() + H) });

test('codes are valid now, still valid one slot later, and dead after that', () => {
  const t = Date.now();
  const code = codeFor(7, t);
  assert.ok(isValidCode(7, code, t));
  assert.ok(isValidCode(7, code, t + 30000));
  assert.ok(!isValidCode(7, code, t + 120000));
  assert.ok(!isValidCode(8, code, t));
  assert.ok(!isValidCode(7, 'x'.repeat(20), t));
});

test('a registered student scanning the live QR is marked present', async () => {
  ev = running(); reg = { id: 11, status: 'REGISTERED', attendance: null };
  const { out, err } = await run(c.checkIn, { user: student, body: { eventId: 7, code: codeFor(7) } });
  assert.ok(!err); assert.strictEqual(out.alreadyCheckedIn, false);
  assert.strictEqual(saved.create.method, 'QR'); assert.strictEqual(saved.create.status, 'PRESENT');
});

test('a second scan does not check in twice', async () => {
  ev = running(); reg = { id: 11, status: 'REGISTERED', attendance: { status: 'PRESENT', checkedInAt: new Date() } }; saved = null;
  const { out } = await run(c.checkIn, { user: student, body: { eventId: 7, code: codeFor(7) } });
  assert.strictEqual(out.alreadyCheckedIn, true); assert.strictEqual(saved, null);
});

test('refused: wrong code, not registered, waitlisted, event not running', async () => {
  ev = running(); reg = { id: 11, status: 'REGISTERED', attendance: null };
  assert.strictEqual((await run(c.checkIn, { user: student, body: { eventId: 7, code: 'a'.repeat(20) } })).err.status, 400);
  reg = null;
  assert.strictEqual((await run(c.checkIn, { user: student, body: { eventId: 7, code: codeFor(7) } })).err.status, 403);
  reg = { id: 11, status: 'WAITLISTED', attendance: null };
  assert.strictEqual((await run(c.checkIn, { user: student, body: { eventId: 7, code: codeFor(7) } })).err.status, 409);
  ev = { ...running(), endsAt: new Date(Date.now() - 1000) }; reg = { id: 11, status: 'REGISTERED', attendance: null };
  assert.strictEqual((await run(c.checkIn, { user: student, body: { eventId: 7, code: codeFor(7) } })).err.status, 400);
});
