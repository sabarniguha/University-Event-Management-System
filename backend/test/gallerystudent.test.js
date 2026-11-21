// Student photo uploads: only students who attended a finished event, approval needed, scoped deletes.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };
const nodeStub = (name, exports) => { const f = require.resolve(name); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let event; let reg; let assets; const created = [];
const prisma = {
  event: { findUnique: async () => event },
  registration: { findUnique: async () => reg },
  eventAsset: {
    findMany: async () => assets, create: async ({ data }) => { created.push(data); return { id: 9, ...data }; },
    findUnique: async ({ where }) => assets.find((a) => a.id === where.id) || null, delete: async () => ({}),
  },
};
stub('utils/prismaClient.js', prisma);
stub('utils/audit.js', { audit: async () => {} });
stub('utils/access.js', { canManageEvent: () => false, loadManagedEvent: async () => ({}) });
const g = require(R('controllers/galleryController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const past = new Date(Date.now() - 3600e3);
const body = { url: '/api/media/5' };
const student = { id: 4, role: 'STUDENT' };
const reset = () => { created.length = 0; event = { id: 1, status: 'PUBLISHED', endsAt: past }; reg = { status: 'REGISTERED', attendance: { status: 'PRESENT' } }; assets = []; };

test('an attendee can add a photo and it waits for approval', async () => {
  reset();
  const { err } = await run(g.addMine, { params: { eventId: '1' }, body, user: student });
  assert.ifError(err);
  assert.strictEqual(created[0].approved, false);
  assert.strictEqual(created[0].uploaderRole, 'STUDENT');
  assert.strictEqual(created[0].uploadedById, 4);
});

test('a student who was absent, unregistered, or at an unfinished event cannot add photos', async () => {
  for (const mutate of [() => { reg = { status: 'REGISTERED', attendance: { status: 'ABSENT' } }; }, () => { reg = null; }, () => { event.endsAt = new Date(Date.now() + 3600e3); }, () => { event.status = 'DRAFT'; }]) {
    reset(); mutate();
    const { err } = await run(g.addMine, { params: { eventId: '1' }, body, user: student });
    assert.strictEqual(err?.status, 403);
    assert.strictEqual(created.length, 0);
  }
});

test('a student is limited to 5 photos per event', async () => {
  reset(); assets = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, kind: 'PHOTO', uploadedById: 4, uploaderRole: 'STUDENT' }));
  const { err } = await run(g.addMine, { params: { eventId: '1' }, body, user: student });
  assert.strictEqual(err?.status, 403);
});

test('only a link to an uploaded image is accepted', async () => {
  reset();
  const { err } = await run(g.addMine, { params: { eventId: '1' }, body: { url: 'javascript:alert(1)' }, user: student });
  assert.ok(err);
  assert.strictEqual(created.length, 0);
});

test('a student can delete only their own student photo', async () => {
  reset(); assets = [{ id: 1, uploadedById: 4, uploaderRole: 'STUDENT' }, { id: 2, uploadedById: 8, uploaderRole: 'STUDENT' }, { id: 3, uploadedById: 4, uploaderRole: 'ORGANIZER' }];
  assert.strictEqual((await run(g.removeMine, { params: { id: '1' }, user: student })).out?.ok, true);
  assert.strictEqual((await run(g.removeMine, { params: { id: '2' }, user: student })).err?.status, 404);
  assert.strictEqual((await run(g.removeMine, { params: { id: '3' }, user: student })).err?.status, 404);
});

test('the public list hides unapproved photos but a student sees their own', async () => {
  reset(); assets = [
    { id: 1, kind: 'PHOTO', url: '/api/media/1', approved: true, uploadedById: 8, uploaderRole: 'ORGANIZER' },
    { id: 2, kind: 'PHOTO', url: '/api/media/2', approved: false, uploadedById: 8, uploaderRole: 'STUDENT' },
    { id: 3, kind: 'PHOTO', url: '/api/media/3', approved: false, uploadedById: 4, uploaderRole: 'STUDENT' },
  ];
  const pub = await run(g.list, { params: { eventId: '1' }, user: null });
  assert.deepStrictEqual(pub.out.photos.map((p) => p.id), [1]);
  const mine = await run(g.list, { params: { eventId: '1' }, user: student });
  assert.deepStrictEqual(mine.out.photos.map((p) => p.id), [1, 3]);
  assert.ok(!JSON.stringify(pub.out).includes('uploadedById'), 'no uploader ids exposed');
});
