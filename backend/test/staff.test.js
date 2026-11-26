const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const H = 3600e3;
let duty; let reg; let saved; let upserted;
const running = { id: 7, title: 'Fest', status: 'PUBLISHED', organizerId: 1, startsAt: new Date(Date.now() - H), endsAt: new Date(Date.now() + H) };
stub('utils/prismaClient.js', {
  eventStaff: { findUnique: async () => duty, count: async () => 0, upsert: async (a) => { upserted = a; return {}; }, deleteMany: async () => ({}) },
  user: { findUnique: async ({ where }) => (where.email === 'vol@x.edu' ? { id: 9, name: 'Vol', isActive: true } : where.email === 'owner@x.edu' ? { id: 1, name: 'O', isActive: true } : null) },
  registration: { findUnique: async () => reg },
  attendance: { upsert: async (a) => { saved = a; return { checkedInAt: new Date() }; } },
});
stub('utils/access.js', { loadManagedEvent: async () => running });
stub('utils/notify.js', { notify: async () => {} });
stub('utils/audit.js', { audit: async () => {} });
const c = require(R('controllers/staffController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const vol = { id: 9, role: 'STUDENT' };

test('organiser can add a helper by email, but not an unknown email or the owner', async () => {
  const org = { id: 1, role: 'ORGANIZER' };
  assert.strictEqual((await run(c.add, { user: org, params: { eventId: '7' }, body: { email: 'Vol@x.edu' } })).out.added.userId, 9);
  assert.deepStrictEqual(upserted.create, { eventId: 7, userId: 9, addedById: 1 });
  assert.strictEqual((await run(c.add, { user: org, params: { eventId: '7' }, body: { email: 'no@x.edu' } })).err.status, 404);
  assert.strictEqual((await run(c.add, { user: org, params: { eventId: '7' }, body: { email: 'owner@x.edu' } })).err.status, 400);
});

test('someone who is not staff is refused', async () => {
  duty = null;
  assert.strictEqual((await run(c.roster, { user: vol, params: { eventId: '7' } })).err.status, 403);
  assert.strictEqual((await run(c.mark, { user: vol, params: { eventId: '7' }, body: { registrationId: 1, status: 'PRESENT' } })).err.status, 403);
});

test('staff can mark attendance while the event runs, recorded under their own id', async () => {
  duty = { event: running }; reg = { id: 5, eventId: 7, status: 'REGISTERED' };
  const { out, err } = await run(c.mark, { user: vol, params: { eventId: '7' }, body: { registrationId: 5, status: 'PRESENT' } });
  assert.ok(!err && out.attendance);
  assert.strictEqual(saved.create.markedById, 9);
});

test('staff cannot mark outside the event window or for another event', async () => {
  duty = { event: { ...running, endsAt: new Date(Date.now() - 1000) } };
  assert.strictEqual((await run(c.mark, { user: vol, params: { eventId: '7' }, body: { registrationId: 5, status: 'PRESENT' } })).err.status, 400);
  duty = { event: running }; reg = { id: 5, eventId: 8, status: 'REGISTERED' };
  assert.strictEqual((await run(c.mark, { user: vol, params: { eventId: '7' }, body: { registrationId: 5, status: 'PRESENT' } })).err.status, 404);
});
