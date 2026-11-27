const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let notified = []; let claims = []; let regUpdates = []; let waiting = []; let claimHours = null; let taken = 0;
const tx = {
  event: { findUnique: async () => ({ id: 1, title: 'Fest', status: 'PUBLISHED', endsAt: new Date(Date.now() + 1e7), capacity: 10, waitlistClaimHours: claimHours }) },
  registration: { count: async () => taken, findMany: async () => waiting, updateMany: async () => ({}), update: async (a) => { regUpdates.push(a); return {}; } },
  waitlistClaim: { createMany: async (a) => { claims.push(...a.data); return {}; }, deleteMany: async () => ({ count: 1 }) },
  attendance: { deleteMany: async () => ({}) },
};
stub('utils/notify.js', { notify: async (_d, ids, p) => { notified.push({ ids, p }); } });
const { promoteWaitlist } = require(R('utils/waitlist.js'));

test('without a claim window the student simply gets the seat, as before', async () => {
  notified = []; claims = []; claimHours = null; taken = 9; waiting = [{ id: 5, userId: 50 }];
  await promoteWaitlist(tx, 1);
  assert.strictEqual(claims.length, 0);
  assert.strictEqual(notified[0].p.title, 'A seat opened up for you');
});

test('with a claim window the student must confirm before the deadline', async () => {
  notified = []; claims = []; claimHours = 12; taken = 9; waiting = [{ id: 5, userId: 50 }];
  await promoteWaitlist(tx, 1);
  assert.strictEqual(claims.length, 1);
  const hrs = (claims[0].deadline.getTime() - Date.now()) / 3600e3;
  assert.ok(hrs > 11.9 && hrs <= 12);
  assert.strictEqual(notified[0].p.title, 'Confirm your seat');
});

// ---- expiry
let due = []; let promoted = [];
stub('utils/prismaClient.js', { waitlistClaim: { findMany: async () => due }, $transaction: async (fn) => fn(tx) });
const wl = require(R('utils/waitlist.js'));
const orig = wl.promoteWaitlist;
wl.promoteWaitlist = async (t, id) => { promoted.push(id); return []; };
delete require.cache[R('utils/waitlistClaims.js')];
const { expireClaims } = require(R('utils/waitlistClaims.js'));

test('an unconfirmed seat is released, the student told, and the next one promoted', async () => {
  notified = []; regUpdates = []; promoted = [];
  due = [{ id: 1, registration: { id: 5, userId: 50, eventId: 1, status: 'REGISTERED', event: { id: 1, title: 'Fest', endsAt: new Date(Date.now() + 1e7) } } }];
  await expireClaims();
  assert.strictEqual(regUpdates[0].data.status, 'CANCELLED');
  assert.strictEqual(notified[0].p.title, 'Seat released');
  assert.deepStrictEqual(promoted, [1]);
});

test('a student who already cancelled is not touched again', async () => {
  notified = []; regUpdates = []; promoted = [];
  due = [{ id: 2, registration: { id: 6, userId: 51, eventId: 1, status: 'CANCELLED', event: { id: 1, title: 'Fest', endsAt: new Date(Date.now() + 1e7) } } }];
  await expireClaims();
  assert.strictEqual(regUpdates.length, 0); assert.strictEqual(promoted.length, 0);
});
wl.promoteWaitlist = orig;
