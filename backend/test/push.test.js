const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const Module = require('module');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let sent = []; let removed = []; let subs = []; let failWith = null;
// A fake "web-push" package, since the real one is only installed on the server.
const realResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { return req === 'web-push' ? 'web-push-fake' : realResolve.call(this, req, ...rest); };
require.cache['web-push-fake'] = { id: 'web-push-fake', filename: 'web-push-fake', loaded: true, exports: {
  setVapidDetails() {}, sendNotification: async (sub, payload) => { if (failWith) throw failWith; sent.push({ sub, payload: JSON.parse(payload) }); },
} };
stub('utils/prismaClient.js', { pushSubscription: { findMany: async () => subs, deleteMany: async (a) => { removed.push(a.where); return {}; }, count: async () => 0, upsert: async () => ({}) } });
const push = require(R('utils/push.js'));

test('does nothing unless both VAPID keys are set', async () => {
  delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY;
  assert.strictEqual(push.enabled(), false);
  subs = [{ id: 1, userId: 5, endpoint: 'https://x/1', p256dh: 'a', auth: 'b' }]; sent = [];
  await push.pushToUsers([5], { title: 'T', message: 'M' });
  assert.strictEqual(sent.length, 0);
});

test('sends to each device with a trimmed payload and a safe link', async () => {
  process.env.VAPID_PUBLIC_KEY = 'pub'; process.env.VAPID_PRIVATE_KEY = 'priv';
  subs = [{ id: 1, userId: 5, endpoint: 'https://x/1', p256dh: 'a', auth: 'b' }, { id: 2, userId: 5, endpoint: 'https://x/2', p256dh: 'a', auth: 'b' }]; sent = [];
  await push.pushToUsers([5, 5], { title: 'T'.repeat(200), message: 'M'.repeat(500), link: 'https://evil.example' });
  assert.strictEqual(sent.length, 2);
  assert.strictEqual(sent[0].payload.title.length, 80);
  assert.strictEqual(sent[0].payload.body.length, 160);
  assert.strictEqual(sent[0].payload.url, '/notifications'); // external links are never used
});

test('a gone device is forgotten and errors never throw', async () => {
  subs = [{ id: 9, userId: 5, endpoint: 'https://x/9', p256dh: 'a', auth: 'b' }]; removed = [];
  failWith = Object.assign(new Error('gone'), { statusCode: 410 });
  await push.pushToUsers(5, { title: 'T', message: 'M' });
  assert.deepStrictEqual(removed, [{ id: 9 }]);
  failWith = Object.assign(new Error('boom'), { statusCode: 500 });
  await push.pushToUsers(5, { title: 'T', message: 'M' }); // must not throw
  failWith = null;
});
