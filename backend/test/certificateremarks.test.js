// Certificates: a name written for each student and performance remarks, without changing the old behaviour.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let created; let cert;
const prisma = {
  registration: { findMany: async () => [{ id: 11, userId: 1 }, { id: 12, userId: 2 }, { id: 13, userId: 3 }] },
  certificate: { findUnique: async () => cert, update: async (a) => { created = a; return {}; } },
  $transaction: async (fn) => fn({ certificate: { createMany: async ({ data }) => { created = data; } } }),
};
stub('utils/prismaClient.js', prisma);
stub('utils/access.js', { loadManagedEvent: async () => ({ id: 7, title: 'Hack' }), canManageEvent: (u) => u.role === 'ADMIN' || u.id === 9 });
stub('utils/notify.js', { notify: async () => {} });
stub('utils/audit.js', { audit: async () => {} });
stub('utils/emailUsers.js', { emailUsers: () => {} });
const c = require(R('controllers/certificateController.js'));
const { certificatePdf } = require(R('utils/pdf.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const admin = { id: 1, role: 'ADMIN' };

test('without names or remarks, certificates are issued exactly as before', async () => {
  await run(c.generate, { user: admin, body: { eventId: 7 } });
  assert.strictEqual(created.length, 3);
  created.forEach((r) => { assert.strictEqual(r.recipientName, null); assert.strictEqual(r.remarks, null); });
});

test('a name and remark per student, and a default remark for the rest', async () => {
  await run(c.generate, { user: admin, body: { eventId: 7, remarks: 'Active participant', recipients: [{ registrationId: 11, name: '  Asha   Rao ', remarks: 'Won first prize' }, { registrationId: 12, remarks: 'Excellent teamwork' }] } });
  const by = Object.fromEntries(created.map((r) => [r.registrationId, r]));
  assert.deepStrictEqual([by[11].recipientName, by[11].remarks], ['Asha Rao', 'Won first prize']);
  assert.deepStrictEqual([by[12].recipientName, by[12].remarks], [null, 'Excellent teamwork']);
  assert.deepStrictEqual([by[13].recipientName, by[13].remarks], [null, 'Active participant']);
});

test('a one-letter name is refused', async () => {
  const { err } = await run(c.generate, { user: admin, body: { eventId: 7, recipients: [{ registrationId: 11, name: 'A' }] } });
  assert.strictEqual(err.status, 400);
});

test('update changes or clears the name and remark, only for people who manage the event', async () => {
  cert = { id: 5, event: {} };
  assert.ifError((await run(c.update, { user: admin, params: { certificateId: 'uni-aaaaaaaaaaaa' }, body: { name: 'New Name', remarks: 'Great' } })).err);
  assert.deepStrictEqual(created.data, { recipientName: 'New Name', remarks: 'Great' });
  await run(c.update, { user: admin, params: { certificateId: 'UNI-AAAAAAAAAAAA' }, body: { name: '', remarks: '' } });
  assert.deepStrictEqual(created.data, { recipientName: null, remarks: null });
  assert.strictEqual((await run(c.update, { user: { id: 3, role: 'ORGANIZER' }, params: { certificateId: 'UNI-AAAAAAAAAAAA' }, body: { remarks: 'x' } })).err.status, 404);
  assert.strictEqual((await run(c.update, { user: admin, params: { certificateId: 'UNI-AAAAAAAAAAAA' }, body: {} })).err.status, 400);
});

test('the PDF shows the written name and the remarks', () => {
  const base = { templateKey: 'classic', title: 'Certificate of Participation', studentName: 'Asha Rao', eventTitle: 'Hack', venue: 'Hall', dateText: '1 Jan 2026', issuedText: '2 Jan 2026', signatoryName: 'Org', signatoryTitle: 'Organiser', certificateId: 'UNI-AAAAAAAAAAAA', verifyUrl: 'https://x/verify/UNI-AAAAAAAAAAAA' };
  const withRemark = Buffer.from(certificatePdf({ ...base, remarks: 'Outstanding performance' })).toString('latin1');
  assert.ok(withRemark.includes('Asha Rao') && withRemark.includes('Remarks: Outstanding performance'));
  assert.ok(!Buffer.from(certificatePdf(base)).toString('latin1').includes('Remarks:'));
});

test('winner and runner-up positions are saved, and anything else is refused', async () => {
  await run(c.generate, { user: admin, body: { eventId: 7, recipients: [{ registrationId: 11, position: 'WINNER' }, { registrationId: 12, position: 'FIRST_RUNNER_UP', remarks: 'Great' }] } });
  const by = Object.fromEntries(created.map((r) => [r.registrationId, r]));
  assert.deepStrictEqual([by[11].position, by[12].position, by[13].position], ['WINNER', 'FIRST_RUNNER_UP', null]);
  const bad = await run(c.generate, { user: admin, body: { eventId: 7, recipients: [{ registrationId: 11, position: 'CHAMPION' }] } });
  assert.ok(bad.err);
});

test('update can set and clear a position', async () => {
  cert = { id: 5, event: {} };
  await run(c.update, { user: admin, params: { certificateId: 'UNI-AAAAAAAAAAAA' }, body: { position: 'SECOND_RUNNER_UP' } });
  assert.strictEqual(created.data.position, 'SECOND_RUNNER_UP');
  await run(c.update, { user: admin, params: { certificateId: 'UNI-AAAAAAAAAAAA' }, body: { position: '' } });
  assert.strictEqual(created.data.position, null);
});

test('a winner certificate gets the achievement heading unless a custom heading was chosen', async () => {
  const mk = (over) => ({ certificateId: 'UNI-AAAAAAAAAAAA', title: 'Certificate of Participation', templateKey: 'royal', userId: 1, issuedAt: new Date(), revokedAt: null, user: { name: 'Asha', department: null, studentId: null }, event: { id: 7, title: 'Hack', venue: 'Hall', startsAt: new Date(), endsAt: new Date(), organizer: { name: 'Org' } }, issuedBy: null, ...over });
  const get = async (over) => { cert = mk(over); return (await run(c.getOne, { user: { id: 1, role: 'STUDENT' }, params: { certificateId: 'UNI-AAAAAAAAAAAA' } })).out.certificate; };
  const w = await get({ position: 'WINNER' });
  assert.deepStrictEqual([w.title, w.positionLabel], ['Certificate of Achievement', 'Winner']);
  assert.strictEqual((await get({ position: 'WINNER', title: 'Hackathon Certificate' })).title, 'Hackathon Certificate');
  const plain = await get({});
  assert.deepStrictEqual([plain.title, plain.position, plain.positionLabel], ['Certificate of Participation', null, null]);
});

test('the PDF shows the position badge and winning wording, and plain certificates are unchanged', () => {
  const base = { templateKey: 'royal', title: 'Certificate of Achievement', studentName: 'Asha Rao', eventTitle: 'Hack', venue: 'Hall', dateText: '1 Jan 2026', issuedText: '2 Jan 2026', signatoryName: 'Org', signatoryTitle: 'Organiser', certificateId: 'UNI-AAAAAAAAAAAA', verifyUrl: 'https://x/verify/UNI-AAAAAAAAAAAA' };
  const w = Buffer.from(certificatePdf({ ...base, position: 'FIRST_RUNNER_UP', positionLabel: 'First Runner-Up', positionPhrase: 'the First Runner-Up position', remarks: 'Great' })).toString('latin1');
  assert.ok(w.includes('FIRST RUNNER-UP') && w.includes('securing the First Runner-Up position'));
  const p = Buffer.from(certificatePdf({ ...base, title: 'Certificate of Participation' })).toString('latin1');
  assert.ok(p.includes('for attending') && !p.includes('RUNNER'));
});
