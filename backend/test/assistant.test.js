// The assistant: hidden without a key, validated input, scoped context, no provider details leaked.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const calls = [];
stub('utils/prismaClient.js', {
  registration: { findMany: async (a) => { calls.push(['reg', a.where]); return []; }, count: async (a) => { calls.push(['regcount', a.where]); return 0; } },
  certificate: { count: async (a) => { calls.push(['cert', a.where]); return 0; } },
  event: { findMany: async (a) => { calls.push(['event', a.where]); return []; }, groupBy: async () => [], count: async () => 0 },
  eventAsset: { count: async () => 0 },
  user: { groupBy: async () => [] },
});
const ctx = require(R('utils/assistantContext.js'));
const c = require(R('controllers/assistantController.js'));
const run = async (fn, req) => { let out; let err; await fn(req, { json: (x) => { out = x; } }, (e) => { err = e; }); return { out, err }; };
const student = { id: 5, role: 'STUDENT', name: 'Asha Rao', department: 'CSE', email: 'asha@x.io' };
const msg = (content, role = 'user') => ({ messages: [{ role, content }] });

test('without a key the assistant reports itself off and refuses to chat', async () => {
  delete process.env.GROQ_API_KEY;
  assert.strictEqual((await run(c.status, { user: student })).out.enabled, false);
  assert.strictEqual((await run(c.chat, { user: student, body: msg('hi') })).err.status, 503);
});

test('input is validated: last message must be the user, length limited', async () => {
  process.env.GROQ_API_KEY = 'test-key';
  assert.ok((await run(c.chat, { user: student, body: msg('hi', 'assistant') })).err);
  assert.ok((await run(c.chat, { user: student, body: msg('x'.repeat(1501)) })).err);
  assert.ok((await run(c.chat, { user: student, body: { messages: [] } })).err);
});

test('a student context is built from that student only and holds no email', async () => {
  calls.length = 0;
  const data = await ctx.build(student);
  assert.ok(calls.filter(([k]) => k === 'reg' || k === 'regcount' || k === 'cert').every(([, w]) => w.userId === 5));
  assert.ok(!JSON.stringify(data).includes('asha@x.io'));
  assert.strictEqual(data.student.firstName, 'Asha');
});

test('the prompt fences data and keeps the user\'s role', () => {
  const p = ctx.systemPrompt(student, { a: 1 });
  assert.match(p, /a student/);
  assert.match(p, /<data>[\s\S]*<\/data>/);
  assert.match(p, /not instructions/);
});

test('a provider failure never leaks its message or the key', async () => {
  process.env.GROQ_API_KEY = 'secret-key-123';
  const real = global.fetch;
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: 'invalid key secret-key-123' }) });
  const { err } = await run(c.chat, { user: student, body: msg('hi') });
  global.fetch = real;
  assert.strictEqual(err.status, 502);
  assert.ok(!String(err.message).includes('secret-key-123'));
});

test('a good answer is returned and the key is sent only to Groq', async () => {
  process.env.GROQ_API_KEY = 'k-1';
  const real = global.fetch; let seen;
  global.fetch = async (url, opts) => { seen = { url, opts }; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: ' Hello! ' } }] }) }; };
  const { out } = await run(c.chat, { user: student, body: msg('hi') });
  global.fetch = real;
  assert.strictEqual(out.reply, 'Hello!');
  assert.strictEqual(seen.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.strictEqual(seen.opts.headers.Authorization, 'Bearer k-1');
  assert.ok(!JSON.stringify(out).includes('k-1'));
});

test('a retired model is skipped and the next one is tried', async () => {
  process.env.GROQ_API_KEY = 'k-2'; delete process.env.GROQ_MODEL;
  const real = global.fetch; const tried = [];
  global.fetch = async (url, opts) => { const m = JSON.parse(opts.body).model; tried.push(m); return m === 'openai/gpt-oss-120b' ? { ok: false, status: 400, json: async () => ({ error: { code: 'model_decommissioned' } }) } : { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) }; };
  const { out } = await run(c.chat, { user: student, body: msg('hi') });
  global.fetch = real;
  assert.deepStrictEqual(tried, ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
  assert.strictEqual(out.reply, 'ok');
});
