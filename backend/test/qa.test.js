const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let rows; let asked; let noted; let count = 0; let published = true; let updated; let deleted;
stub('utils/prismaClient.js', { event: { findUnique: async () => (published ? { id: 7, title: 'Fest', status: 'PUBLISHED', organizerId: 1 } : { id: 7, status: 'DRAFT', organizerId: 1 }) },
  eventQA: {
    findMany: async (a) => { asked = a.where; return rows; }, count: async () => count,
    create: async (a) => ({ id: 1, ...a.data, asker: { name: 'Asha Rao' }, createdAt: new Date() }),
    findUnique: async () => ({ id: 3, askerId: 4, answer: null, event: { id: 7, title: 'Fest', organizerId: 1 } }),
    update: async (a) => { updated = a.data; return { id: 3, question: 'q', ...a.data, asker: { name: 'Asha Rao' } }; }, delete: async () => { deleted = true; },
  } });
stub('utils/notify.js', { notify: async (db, ids, p) => { noted = { ids, p }; } });
const c = require(R('controllers/qaController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { status() { return this; }, json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const student = { id: 4, role: 'STUDENT' }; const owner = { id: 1, role: 'ORGANIZER' }; const other = { id: 2, role: 'ORGANIZER' };

test('the public sees only visible questions, with shortened names; the organiser sees hidden ones too', async () => {
  rows = [{ id: 1, askerId: 4, question: 'Is lunch served?', answer: null, hidden: false, asker: { name: 'Asha Rao' }, createdAt: new Date() }];
  let { out } = await run(c.list, { params: { eventId: '7' } });
  assert.strictEqual(asked.hidden, false); assert.strictEqual(out.manager, false); assert.notStrictEqual(out.questions[0].asker, 'Asha Rao');
  ({ out } = await run(c.list, { user: owner, params: { eventId: '7' } }));
  assert.strictEqual(asked.hidden, undefined); assert.strictEqual(out.manager, true);
});

test('a student asks, the organiser is notified, and limits apply', async () => {
  const { out } = await run(c.ask, { user: student, params: { eventId: '7' }, body: { question: 'Is lunch provided?' } });
  assert.ok(out.question); assert.strictEqual(noted.ids, 1);
  assert.ok((await run(c.ask, { user: student, params: { eventId: '7' }, body: { question: 'hi' } })).err);
  count = 5; assert.strictEqual((await run(c.ask, { user: student, params: { eventId: '7' }, body: { question: 'One more question?' } })).err.status, 429); count = 0;
  published = false; assert.strictEqual((await run(c.ask, { user: student, params: { eventId: '7' }, body: { question: 'Is lunch provided?' } })).err.status, 404); published = true;
});

test('only the event organiser or an admin can answer; the asker is told', async () => {
  assert.strictEqual((await run(c.answer, { user: other, params: { id: '3' }, body: { answer: 'Yes, lunch is free.' } })).err.status, 403);
  const ok = await run(c.answer, { user: owner, params: { id: '3' }, body: { answer: 'Yes, lunch is free.' } });
  assert.ok(!ok.err); assert.strictEqual(updated.answeredById, 1); assert.strictEqual(noted.ids, 4);
});

test('an asker can delete an unanswered question; strangers cannot', async () => {
  assert.strictEqual((await run(c.remove, { user: { id: 9, role: 'STUDENT' }, params: { id: '3' } })).err.status, 403);
  assert.ok((await run(c.remove, { user: student, params: { id: '3' } })).out.removed); assert.ok(deleted);
});
