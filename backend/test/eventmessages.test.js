const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let asked; let noted; let mailed;
stub('utils/prismaClient.js', { registration: { findMany: async (a) => { asked = a.where; return [{ userId: 1 }, { userId: 2 }, { userId: 1 }]; } } });
stub('utils/access.js', { loadManagedEvent: async () => ({ id: 7, title: 'Hack' }), canManageEvent: () => true });
stub('utils/notify.js', { notify: async (db, ids, p) => { noted = { ids, p }; } });
stub('utils/emailUsers.js', { emailUsers: (ids, p) => { mailed = { ids, p }; } });
stub('utils/audit.js', { audit: async () => {} });
const c = require(R('controllers/eventMessageController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const user = { id: 9, role: 'ORGANIZER' };

test('message goes once to each confirmed student, never cancelled ones', async () => {
  const { out } = await run(c.send, { user, params: { eventId: '7' }, body: { subject: 'Venue', message: 'Moved to Hall B' } });
  assert.strictEqual(out.sent, 2);
  assert.deepStrictEqual(asked.status.in, ['REGISTERED']);
  assert.strictEqual(noted.p.type, 'EVENT_MESSAGE');
  assert.deepStrictEqual(mailed.ids, [1, 2]);
});

test('audience ALL adds waitlisted, pending and awaiting payment but not cancelled', async () => {
  await run(c.send, { user, params: { eventId: '7' }, body: { subject: 'Venue', message: 'Moved to Hall B', audience: 'ALL' } });
  assert.ok(!asked.status.in.includes('CANCELLED'));
  assert.ok(asked.status.in.includes('WAITLISTED'));
});

test('an empty message is refused', async () => {
  const { err } = await run(c.send, { user, params: { eventId: '7' }, body: { subject: 'Hi', message: '' } });
  assert.ok(err);
});
