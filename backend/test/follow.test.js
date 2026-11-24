const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let noted; let follows = [{ followerId: 4 }, { followerId: 5 }]; let upserted; let deleted;
stub('utils/prismaClient.js', {
  organizerFollow: {
    findMany: async () => follows, count: async () => follows.length, findUnique: async () => null,
    upsert: async (a) => { upserted = a; return {}; }, deleteMany: async (a) => { deleted = a; return {}; },
  },
  user: { findUnique: async ({ where }) => ({ id: where.id, name: 'Club Lead', role: 'ORGANIZER', isActive: true }) },
});
stub('utils/notify.js', { notify: async (db, ids, p) => { noted = { ids, p }; } });
stub('utils/emailUsers.js', { emailUsers: () => {} });
const { notifyFollowers } = require(R('utils/followers.js'));
const c = require(R('controllers/followController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };

test('followers are told once per event', async () => {
  await notifyFollowers({ id: 12, organizerId: 9, title: 'Hack Night' });
  assert.deepStrictEqual(noted.ids, [4, 5]);
  assert.strictEqual(noted.p.refKey, 'follow-event-12');
  assert.match(noted.p.message, /Hack Night/);
});

test('no followers means no notification', async () => {
  noted = null; follows = [];
  await notifyFollowers({ id: 13, organizerId: 9, title: 'X' });
  assert.strictEqual(noted, null);
});

test('a student follows and unfollows an organiser, but not themselves', async () => {
  const user = { id: 4, role: 'STUDENT' };
  const { out } = await run(c.follow, { user, params: { id: '9' } });
  assert.strictEqual(out.following, true);
  assert.deepStrictEqual(upserted.create, { followerId: 4, organizerId: 9 });
  await run(c.unfollow, { user, params: { id: '9' } });
  assert.deepStrictEqual(deleted.where, { followerId: 4, organizerId: 9 });
  assert.strictEqual((await run(c.follow, { user, params: { id: '4' } })).err.status, 400);
});
