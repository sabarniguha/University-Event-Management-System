const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };
const { priceFor, codeProblem, earlyBirdActive } = require(R('utils/pricing.js'));

const D = 86400e3;
const ev = (extra = {}) => ({ id: 7, status: 'PUBLISHED', fee: 500, earlyBirdFee: null, earlyBirdUntil: null, ...extra });

test('early-bird price applies only until its end date', () => {
  const e = ev({ earlyBirdFee: 300, earlyBirdUntil: new Date(Date.now() + D) });
  assert.strictEqual(priceFor(e, null).final, 300);
  assert.strictEqual(priceFor({ ...e, earlyBirdUntil: new Date(Date.now() - D) }, null).final, 500);
  assert.strictEqual(earlyBirdActive(ev({ earlyBirdFee: 600, earlyBirdUntil: new Date(Date.now() + D) })), false); // not cheaper
});

test('percent and flat codes, never below one rupee', () => {
  assert.strictEqual(priceFor(ev(), { kind: 'PERCENT', value: 20 }).final, 400);
  assert.strictEqual(priceFor(ev(), { kind: 'FLAT', value: 150 }).final, 350);
  assert.strictEqual(priceFor(ev(), { kind: 'FLAT', value: 9999 }).final, 1);
});

test('code on top of the early-bird price', () => {
  const e = ev({ earlyBirdFee: 400, earlyBirdUntil: new Date(Date.now() + D) });
  assert.strictEqual(priceFor(e, { kind: 'PERCENT', value: 50 }).final, 200);
});

test('unusable codes are explained', () => {
  assert.match(codeProblem(null), /not valid/);
  assert.match(codeProblem({ active: false }), /not valid/);
  assert.match(codeProblem({ active: true, expiresAt: new Date(Date.now() - D) }), /expired/);
  assert.match(codeProblem({ active: true, maxUses: 3, usedCount: 3 }), /fully used/);
  assert.strictEqual(codeProblem({ active: true, maxUses: 3, usedCount: 2, expiresAt: new Date(Date.now() + D) }), null);
});

let rows = []; let created;
stub('utils/prismaClient.js', { event: { findUnique: async () => ev() }, discountCode: { findUnique: async ({ where }) => rows.find((r) => r.code === where.eventId_code.code) || null, create: async (a) => { created = a.data; return a.data; } } });
stub('utils/access.js', { loadManagedEvent: async () => ev() });
stub('utils/audit.js', { audit: async () => {} });
const c = require(R('controllers/discountController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const org = { id: 1, role: 'ORGANIZER' };

test('creating codes: upper-cased, limits enforced', async () => {
  const ok = await run(c.create, { user: org, params: { eventId: '7' }, body: { code: 'uem50', kind: 'PERCENT', value: 50 } });
  assert.ok(!ok.err); assert.strictEqual(created.code, 'UEM50');
  assert.strictEqual((await run(c.create, { user: org, params: { eventId: '7' }, body: { code: 'BIG', kind: 'PERCENT', value: 95 } })).err.status, 400);
  assert.strictEqual((await run(c.create, { user: org, params: { eventId: '7' }, body: { code: 'FLATBIG', kind: 'FLAT', value: 500 } })).err.status, 400);
});

test('a student can preview the price and a bad code is refused', async () => {
  rows = [{ eventId: 7, code: 'UEM50', kind: 'PERCENT', value: 50, active: true, usedCount: 0, maxUses: null, expiresAt: null }];
  const { out } = await run(c.check, { user: { id: 3 }, body: { eventId: 7, code: ' uem50 ' } });
  assert.strictEqual(out.final, 250);
  assert.strictEqual((await run(c.check, { user: { id: 3 }, body: { eventId: 7, code: 'NOPE' } })).err.status, 400);
});
