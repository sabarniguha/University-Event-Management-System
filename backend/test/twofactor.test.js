// Sign-in flow with lockout and two-factor, run against an in-memory stand-in for the database.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const Module = require('module');

process.env.JWT_SECRET = 'j'.repeat(48);
process.env.JWT_EXPIRES_IN = '1h';
process.env.ENABLE_DEMO_ACCOUNTS = 'true';
process.env.DEMO_PASSWORD = 'demo-pass-123';
process.env.ENABLE_DEMO_ADMIN = 'true';

const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

// Minimal HMAC-SHA256 stand-in for jsonwebtoken (signature and expiry checked), so the test needs no installed packages.
const crypto = require('crypto');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sigOf = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
const miniJwt = {
  sign: (payload, secret, opts = {}) => {
    const secs = /m$/.test(opts.expiresIn || '') ? parseInt(opts.expiresIn, 10) * 60 : 3600;
    const data = `${b64({ alg: 'HS256' })}.${b64({ ...payload, exp: Math.floor(Date.now() / 1000) + secs })}`;
    return `${data}.${sigOf(data, secret)}`;
  },
  verify: (token, secret) => {
    const [h, p, s] = String(token).split('.');
    if (!s || sigOf(`${h}.${p}`, secret) !== s) throw new Error('invalid signature');
    const body = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (body.exp < Date.now() / 1000) throw new Error('expired');
    return body;
  },
};

// Fake bcryptjs: "hash" is just a prefix, enough for these tests.
const origLoad = Module._load;
Module._load = function load(request, ...rest) {
  if (request === 'jsonwebtoken') return miniJwt;
  if (request === 'bcryptjs') return { hash: async (v) => `h:${v}`, compare: async (v, h) => h === `h:${v}` };
  return origLoad.call(this, request, ...rest);
};

const users = new Map();
const byEmail = (e) => [...users.values()].find((u) => u.email === e) || null;
const apply = (u, data) => { for (const [k, v] of Object.entries(data)) u[k] = v && typeof v === 'object' && 'increment' in v ? u[k] + v.increment : v; return u; };
const prisma = {
  user: {
    findUnique: async ({ where }) => (where.email ? byEmail(where.email) : users.get(where.id) || null),
    update: async ({ where, data }) => ({ ...apply(users.get(where.id), data) }),
  },
  auditLog: { create: async () => {} },
};
stub('utils/prismaClient.js', prisma);
stub('utils/audit.js', { audit: async () => {} });
stub('utils/mailer.js', { sendMail: async () => {}, appUrl: () => '', mailConfigured: () => false });
stub('utils/settings.js', { getSettings: async () => ({}) });
stub('utils/notify.js', { notify: async () => {}, notifyAdmins: async () => {} });
stub('utils/authTokens.js', { issueToken: async () => 't', consumeToken: async () => ({}) });
stub('middleware/authMiddleware.js', { userSelect: {}, authenticate: () => {}, optionalAuth: () => {}, requireVerifiedEmail: () => {} });

const auth = require(R('controllers/authController.js'));
const tf = require(R('controllers/twoFactorController.js'));
const totp = require(R('utils/totp.js'));
const { verifyToken } = require(R('utils/jwt.js'));

const seed = (o) => { const u = { id: users.size + 1, name: 'A', role: 'STUDENT', isActive: true, failedLogins: 0, lockedUntil: null, twoFactorSecretEnc: null, twoFactorEnabledAt: null, twoFactorBackup: null, twoFactorLastStep: null, passwordHash: 'h:Correct-Pass1', ...o }; users.set(u.id, u); return u; };
const call = async (h, body, user) => {
  let out; let err;
  await h({ body, user }, { status() { return this; }, json(x) { out = x; return this; } }, (e) => { err = e; });
  return err ? { error: err.status, message: err.message } : out;
};
const login = (email, password, role) => call(auth.login, { email, password, ...(role ? { role } : {}) });

test('five wrong passwords lock the account, the right password is then refused, reset clears it', async () => {
  seed({ email: 'stu@x.io' });
  for (let i = 0; i < 4; i += 1) assert.strictEqual((await login('stu@x.io', 'wrong')).error, 401);
  assert.strictEqual((await login('stu@x.io', 'wrong')).error, 401); // 5th failure triggers the lock
  const locked = await login('stu@x.io', 'Correct-Pass1');
  assert.strictEqual(locked.error, 429);
  assert.match(locked.message, /Too many failed attempts/);
  byEmail('stu@x.io').lockedUntil = new Date(Date.now() - 1000); // lock runs out
  assert.ok((await login('stu@x.io', 'Correct-Pass1')).token);
  assert.strictEqual(byEmail('stu@x.io').failedLogins, 0);
});

test('unknown emails give the same 401 and are never counted', async () => {
  assert.strictEqual((await login('nobody@x.io', 'x')).error, 401);
});

test('demo accounts are never locked', async () => {
  seed({ email: 'demo.admin@uni.edu', role: 'ADMIN', passwordHash: 'h:demo-pass-123' });
  for (let i = 0; i < 8; i += 1) await login('demo.admin@uni.edu', 'wrong');
  assert.ok((await login('demo.admin@uni.edu', 'demo-pass-123', 'ADMIN')).token, 'demo admin still signs in');
});

test('admin with 2FA: password alone gives no session, code completes sign-in, codes cannot be replayed', async () => {
  const secret = totp.newSecret();
  const admin = seed({ email: 'admin@x.io', role: 'ADMIN', twoFactorSecretEnc: totp.encryptSecret(secret), twoFactorEnabledAt: new Date() });
  const first = await login('admin@x.io', 'Correct-Pass1', 'ADMIN');
  assert.strictEqual(first.twoFactorRequired, true);
  assert.strictEqual(first.token, undefined);
  assert.throws(() => verifyToken(first.challenge), 'a challenge is not a session token');

  assert.strictEqual((await call(tf.loginWithCode, { challenge: first.challenge, code: '000000' })).error, 401);
  const code = totp.hotp(secret, totp.stepAt());
  const done = await call(tf.loginWithCode, { challenge: first.challenge, code });
  assert.ok(done.token);
  assert.strictEqual(verifyToken(done.token).sub, admin.id);
  assert.strictEqual((await call(tf.loginWithCode, { challenge: first.challenge, code })).error, 401, 'same code twice is refused');
});

test('backup codes work once', async () => {
  const secret = totp.newSecret();
  const { codes, hashes } = totp.newBackupCodes(2);
  seed({ email: 'admin2@x.io', role: 'ADMIN', twoFactorSecretEnc: totp.encryptSecret(secret), twoFactorEnabledAt: new Date(), twoFactorBackup: hashes });
  const { challenge } = await login('admin2@x.io', 'Correct-Pass1');
  assert.ok((await call(tf.loginWithCode, { challenge, code: codes[0] })).token);
  assert.strictEqual((await call(tf.loginWithCode, { challenge, code: codes[0] })).error, 401);
  assert.ok((await call(tf.loginWithCode, { challenge, code: codes[1].toUpperCase() })).token);
});

test('wrong codes lock the account too, and the demo admin cannot enable 2FA', async () => {
  const secret = totp.newSecret();
  seed({ email: 'admin3@x.io', role: 'ADMIN', twoFactorSecretEnc: totp.encryptSecret(secret), twoFactorEnabledAt: new Date() });
  const { challenge } = await login('admin3@x.io', 'Correct-Pass1');
  for (let i = 0; i < 5; i += 1) await call(tf.loginWithCode, { challenge, code: '111111' });
  assert.strictEqual((await call(tf.loginWithCode, { challenge, code: totp.hotp(secret, totp.stepAt()) })).error, 429);
  const demo = byEmail('demo.admin@uni.edu');
  assert.strictEqual((await call(tf.setup, {}, { ...demo })).error, 403);
});

test('setup then enable turns 2FA on and returns backup codes once', async () => {
  const u = seed({ email: 'admin4@x.io', role: 'ADMIN' });
  const s = await call(tf.setup, {}, u);
  assert.match(s.secret, /^[A-Z2-7]{32}$/);
  assert.strictEqual((await call(tf.enable, { code: '123456' }, u)).error, 400);
  const on = await call(tf.enable, { code: totp.hotp(s.secret, totp.stepAt()) }, u);
  assert.strictEqual(on.backupCodes.length, 8);
  assert.ok(byEmail('admin4@x.io').twoFactorEnabledAt);
  assert.strictEqual((await call(tf.setup, {}, u)).error, 400, 'cannot restart while on');
});
