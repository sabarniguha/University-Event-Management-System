const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };
// bcryptjs is only installed on the server, so use a tiny stand-in here.
const Module = require('module');
const realResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { return req === 'bcryptjs' ? 'bcryptjs-fake' : realResolve.call(this, req, ...rest); };
const bcrypt = { hashSync: (v) => `h:${v}`, hash: async (v) => `h:${v}`, compare: async (v, h) => h === `h:${v}` };
require.cache['bcryptjs-fake'] = { id: 'bcryptjs-fake', filename: 'bcryptjs-fake', loaded: true, exports: bcrypt };

const ops = []; let upcoming = []; let refunds = []; let promoted = [];
const rec = (name) => async (a) => { ops.push([name, a]); return {}; };
const model = (name) => ({ deleteMany: rec(`${name}.deleteMany`), updateMany: rec(`${name}.updateMany`), update: rec(`${name}.update`), findMany: async () => [] });
const prisma = {
  registration: { ...model('registration'), findMany: async () => upcoming },
  notification: model('notification'), pushSubscription: model('push'), authToken: model('token'), organizerFollow: model('follow'),
  eventStaff: model('staff'), eventAnswer: model('answer'), eventQA: model('qa'), organizerProfile: model('profile'), feedback: model('feedback'),
  certificate: model('certificate'), mediaFile: model('media'), user: { ...model('user'), findUnique: async () => ({ passwordHash: bcrypt.hashSync('secret123') }) },
  $transaction: async (x) => (typeof x === 'function' ? x(prisma) : Promise.all(x)),
};
stub('utils/prismaClient.js', prisma);
stub('utils/waitlist.js', { promoteWaitlist: async (tx, id) => { promoted.push(id); } });
stub('utils/cancelRefund.js', { refundOnCancel: async (r) => { refunds.push(r.id); return 'NONE'; } });
stub('utils/audit.js', { audit: async () => {} });
stub('utils/demo.js', { isDemoAccount: (e) => e === 'demo@x.edu' });
const { deleteStudent } = require(R('utils/accountPrivacy.js'));
const c = require(R('controllers/accountController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };

test('deleting a student anonymises the user, cancels future seats, and keeps certificate ids', async () => {
  upcoming = [{ id: 1, eventId: 7, status: 'REGISTERED', event: { id: 7 } }, { id: 2, eventId: 8, status: 'WAITLISTED', event: { id: 8 } }];
  ops.length = 0; promoted = []; refunds = [];
  await deleteStudent(5);
  assert.deepStrictEqual(promoted, [7]); // only a held seat frees a place for the waitlist
  assert.deepStrictEqual(refunds, [1, 2]);
  const u = ops.find(([n]) => n === 'user.update')[1].data;
  assert.strictEqual(u.name, 'Deleted user'); assert.match(u.email, /@deleted\.invalid$/); assert.strictEqual(u.isActive, false); assert.strictEqual(u.phone, null);
  assert.ok(ops.some(([n]) => n === 'certificate.updateMany')); // name removed...
  assert.ok(!ops.some(([n]) => n === 'certificate.deleteMany')); // ...but the certificate itself stays valid
  assert.ok(!ops.some(([n]) => n === 'registration.deleteMany')); // history stays for event statistics
});

test('only students with the right password and the word DELETE can delete', async () => {
  const body = { password: 'secret123', confirm: 'DELETE' };
  assert.strictEqual((await run(c.deleteMine, { user: { id: 5, role: 'ORGANIZER', email: 'o@x.edu' }, body })).err.status, 403);
  assert.strictEqual((await run(c.deleteMine, { user: { id: 5, role: 'STUDENT', email: 'demo@x.edu' }, body })).err.status, 403);
  assert.strictEqual((await run(c.deleteMine, { user: { id: 5, role: 'STUDENT', email: 's@x.edu' }, body: { ...body, password: 'wrong' } })).err.status, 400);
  assert.ok((await run(c.deleteMine, { user: { id: 5, role: 'STUDENT', email: 's@x.edu' }, body: { ...body, confirm: 'delete' } })).err); // must type DELETE
  upcoming = [];
  assert.strictEqual((await run(c.deleteMine, { user: { id: 5, role: 'STUDENT', email: 's@x.edu' }, body })).out.deleted, true);
});
