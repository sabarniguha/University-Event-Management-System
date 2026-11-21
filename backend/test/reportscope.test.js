// Who can see what: organisers only ever get their own events, whatever they ask for.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const seenWhere = [];
const prisma = {
  event: { findMany: async ({ where }) => { seenWhere.push(where); return []; }, groupBy: async () => [] },
  registration: { findMany: async () => [] }, feedback: { findMany: async () => [] }, payment: { findMany: async () => [] }, certificate: { findMany: async () => [] },
  user: { groupBy: async () => [], findMany: async () => [{ id: 3, name: 'Org Three' }], findUnique: async () => ({ name: 'Org Three' }) },
};
stub('utils/prismaClient.js', prisma);
stub('utils/access.js', { loadManagedEvent: async () => ({}) });
const { summary } = require(R('controllers/reportController.js'));

const call = async (user, query) => { let out; let err; await summary({ user, query }, { json: (x) => { out = x; } }, (e) => { err = e; }); if (err) throw err; return out; };

test('an organiser is always limited to their own events, even if they ask for another organiser', async () => {
  seenWhere.length = 0;
  const out = await call({ id: 7, role: 'ORGANIZER', name: 'Me' }, { type: 'year', year: '2026', organizerId: '3' });
  assert.ok(seenWhere.length >= 2 && seenWhere.every((w) => w.organizerId === 7));
  assert.strictEqual(out.organisers, undefined, 'no organiser league table for organisers');
  assert.strictEqual(out.platform, undefined, 'no platform-wide user data for organisers');
  assert.strictEqual(out.meta.scope, 'organiser');
});

test('an admin sees the whole platform, or one organiser when chosen', async () => {
  seenWhere.length = 0;
  const all = await call({ id: 1, role: 'ADMIN', name: 'Admin' }, { type: 'month', year: '2026', month: '11' });
  assert.ok(seenWhere.every((w) => w.organizerId === undefined));
  assert.strictEqual(all.meta.scope, 'platform');
  assert.ok(all.platform && Array.isArray(all.organisers) && all.organiserOptions.length === 1);
  seenWhere.length = 0;
  const one = await call({ id: 1, role: 'ADMIN', name: 'Admin' }, { type: 'month', year: '2026', month: '11', organizerId: '3' });
  assert.ok(seenWhere.every((w) => w.organizerId === 3));
  assert.strictEqual(one.meta.organiserName, 'Org Three');
});

test('a student report is always about the signed-in student only', async () => {
  const seen = [];
  prisma.registration = { findMany: async ({ where }) => { seen.push(where); return []; }, count: async () => 0 };
  prisma.user.findUnique = async () => ({ name: 'S', email: 's@x.io', studentId: 'CS1', department: 'CSE', createdAt: new Date() });
  prisma.eventTeamMember = { groupBy: async () => [] };
  prisma.feedback.groupBy = async () => [];
  prisma.$queryRaw = async () => [];
  const { studentReport } = require(R('controllers/reportController.js'));
  let out; let err;
  await studentReport({ user: { id: 42, role: 'STUDENT' }, query: { type: 'month', year: '2026', month: '11', userId: '1' } }, { json: (x) => { out = x; } }, (e) => { err = e; });
  if (err) throw err;
  assert.ok(seen.length >= 2 && seen.every((w) => w.userId === 42), 'only the signed-in student');
  assert.strictEqual(out.student.name, 'S');
  assert.strictEqual(out.kpis.confirmed, 0);
  assert.strictEqual(out.campus.attendanceRate, null);
});
