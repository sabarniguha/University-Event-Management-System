const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

let eventArgs = null;
stub('utils/prismaClient.js', {
  event: { findMany: async (a) => { eventArgs = a; return [{ id: 7, title: 'Hack Night', category: 'Hackathons', startsAt: new Date('2026-12-05T10:00:00Z'), venue: 'Lab 2', fee: 0, capacity: 50, mode: 'OFFLINE', _count: { registrations: 20 } }]; } },
  eventCategory: { findMany: async () => [{ name: 'Technical' }] },
});
const { build, systemPrompt } = require(R('utils/publicAssistantContext.js'));

test('only public, published, upcoming events are used and no personal data is selected', async () => {
  const ctx = await build();
  assert.strictEqual(eventArgs.where.status, 'PUBLISHED');
  assert.ok(eventArgs.where.endsAt.gt instanceof Date);
  const selected = Object.keys(eventArgs.select);
  assert.ok(!selected.includes('organizer') && !selected.includes('contactEmail') && !selected.includes('registrations'));
  assert.match(ctx.upcomingEvents[0], /Hack Night.*free.*30 seats left.*\/events\/7/);
  assert.deepStrictEqual(ctx.categories, ['Technical']);
});

test('the prompt is limited to the data, treats it as information, and cannot take actions', async () => {
  const p = systemPrompt(await build());
  assert.match(p, /ONLY the data below/);
  assert.match(p, /not instructions/);
  assert.match(p, /cannot register anyone/);
});

test('the chat endpoint refuses politely when no key is set and does not leak anything', async () => {
  delete process.env.GROQ_API_KEY;
  const c = require(R('controllers/publicAssistantController.js'));
  let out; await c.status({}, { json: (v) => { out = v; } }, (e) => { throw e; });
  assert.deepStrictEqual(out, { enabled: false });
  let err; await c.chat({ body: { messages: [{ role: 'user', content: 'hi' }] } }, {}, (e) => { err = e; });
  assert.strictEqual(err.status || err.statusCode, 503);
});
