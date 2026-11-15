// Run with: npm test   (uses Node's built-in test runner, no extra packages)
const test = require('node:test');
const assert = require('node:assert');
const v = require('../src/utils/validators');
const { isAllowedOrigin, parseAllowedOrigins } = require('../src/utils/cors');
const { slugify } = require('../src/utils/categories');

const base = { title: 'Tech Fest', description: 'A long enough description', venue: 'Hall', startsAt: '2026-12-01T10:00', endsAt: '2026-12-01T12:00' };

test('public sign-up input cannot choose a role', () => {
  const parsed = v.registerSchema.parse({ name: 'Ab', email: 'A@B.io', password: '12345678', role: 'ADMIN' });
  assert.strictEqual(parsed.role, undefined);
  assert.strictEqual(parsed.email, 'a@b.io');
});

test('event: online events need a meeting link', () => {
  assert.throws(() => v.eventCreateSchema.parse({ ...base, mode: 'ONLINE' }));
  assert.ok(v.eventCreateSchema.parse({ ...base, mode: 'ONLINE', onlineUrl: 'https://meet.example.com/x' }));
});

test('event: end must be after start, deadline before end', () => {
  assert.throws(() => v.eventCreateSchema.parse({ ...base, endsAt: '2026-12-01T09:00' }));
  assert.throws(() => v.eventCreateSchema.parse({ ...base, registrationDeadline: '2026-12-02T00:00' }));
});

test('event: image must be an upload or http(s) URL', () => {
  assert.strictEqual(v.eventCreateSchema.parse({ ...base, bannerUrl: '/api/media/4' }).bannerUrl, '/api/media/4');
  assert.throws(() => v.eventCreateSchema.parse({ ...base, bannerUrl: 'javascript:alert(1)' }));
});

test('event update only changes what is sent', () => {
  assert.deepStrictEqual(v.eventUpdateSchema.parse({ capacity: '5' }), { capacity: 5 });
});

test('password rules', () => {
  assert.throws(() => v.changePasswordSchema.parse({ currentPassword: 'x', newPassword: 'short' }));
});

test('CORS: no origin, listed origin and same host are allowed; others are not', () => {
  const allowed = parseAllowedOrigins('https://a.vercel.app/, http://localhost:5173');
  assert.ok(isAllowedOrigin(undefined, 'x.com', allowed));
  assert.ok(isAllowedOrigin('https://a.vercel.app', 'api.com', allowed));
  assert.ok(isAllowedOrigin('https://api.com', 'api.com', allowed));
  assert.ok(!isAllowedOrigin('https://evil.com', 'api.com', allowed));
});

test('category slugs', () => {
  assert.strictEqual(slugify('Music and Arts'), 'music-and-arts');
  assert.strictEqual(slugify('Career & Placement'), 'career-and-placement');
});

test('registration link must be https and needs a deadline', () => {
  const { eventCreateSchema } = require('../src/utils/validators');
  const base = { title: 'Hack Day', description: 'A long enough description', venue: 'Hall', startsAt: '2030-01-02T10:00:00Z', endsAt: '2030-01-02T12:00:00Z' };
  assert.ok(!eventCreateSchema.safeParse({ ...base, registrationUrl: 'http://forms.gle/x', registrationDeadline: '2030-01-01T10:00:00Z' }).success);
  assert.ok(!eventCreateSchema.safeParse({ ...base, registrationUrl: 'https://forms.gle/x' }).success);
  assert.ok(eventCreateSchema.safeParse({ ...base, registrationUrl: 'https://forms.gle/x', registrationDeadline: '2030-01-01T10:00:00Z' }).success);
  assert.ok(eventCreateSchema.safeParse(base).success);
});

test('register accepts an optional organiser request but never a role', () => {
  const base = { name: 'Asha Rao', email: 'asha@uni.edu', password: 'Password1' };
  const ok = v.registerSchema.safeParse({ ...base, role: 'ADMIN', organizer: { organization: 'Robotics Club' } });
  assert.ok(ok.success);
  assert.equal(ok.data.role, undefined);
  assert.ok(!v.registerSchema.safeParse({ ...base, organizer: { organization: 'x' } }).success);
});
