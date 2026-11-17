const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { userSelect } = require('../middleware/authMiddleware');
const { audit } = require('../utils/audit');
const { isReadOnlyDemoAdmin } = require('../utils/demo');
const { isLocked, lockMessage, recordFailure, clearData } = require('../utils/loginGuard');
const { parseId } = require('../utils/validators');
const totp = require('../utils/totp');

// The short-lived "password was right, now give the code" token. It is signed with a different key from
// session tokens, so it can never be used as a login session by itself.
const challengeKey = () => crypto.createHash('sha256').update(`2fa-challenge|${process.env.JWT_SECRET}`).digest('hex');
const signChallenge = (userId) => jwt.sign({ sub: userId, purpose: '2fa' }, challengeKey(), { expiresIn: '5m' });

const codeSchema = z.object({ code: z.string().trim().min(6).max(20) });
const loginSchema = z.object({ challenge: z.string().min(20), code: z.string().trim().min(6).max(20) });
const passwordCodeSchema = z.object({ password: z.string().min(1).max(200), code: z.string().trim().min(6).max(20) });

// Checks an authenticator code or an unused backup code. Returns { ok, step, remainingBackup }.
function checkSecondFactor(user, code) {
  if (!user.twoFactorSecretEnc) return { ok: false };
  const step = totp.verifyTotp(totp.decryptSecret(user.twoFactorSecretEnc), code);
  if (step !== null) {
    if (user.twoFactorLastStep !== null && user.twoFactorLastStep !== undefined && step <= user.twoFactorLastStep) return { ok: false }; // a code can be used once
    return { ok: true, step };
  }
  const hashes = Array.isArray(user.twoFactorBackup) ? user.twoFactorBackup : [];
  const h = totp.backupHash(code);
  if (hashes.includes(h)) return { ok: true, remainingBackup: hashes.filter((x) => x !== h) };
  return { ok: false };
}

const persistUse = (user, check) => ({
  ...clearData,
  lastLoginAt: new Date(),
  ...(check.step !== undefined ? { twoFactorLastStep: check.step } : {}),
  ...(check.remainingBackup ? { twoFactorBackup: check.remainingBackup } : {}),
});

// POST /api/auth/2fa/login  { challenge, code } - second step of sign-in
const loginWithCode = asyncHandler(async (req, res) => {
  const { challenge, code } = loginSchema.parse(req.body);
  let payload;
  try { payload = jwt.verify(challenge, challengeKey()); } catch { throw new HttpError(401, 'Your sign-in timed out. Enter your password again.'); }
  if (payload.purpose !== '2fa') throw new HttpError(401, 'Your sign-in timed out. Enter your password again.');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive || !user.twoFactorEnabledAt) throw new HttpError(401, 'Your sign-in timed out. Enter your password again.');
  if (isLocked(user)) throw new HttpError(429, lockMessage(user));

  const check = checkSecondFactor(user, code);
  if (!check.ok) {
    await recordFailure(user);
    throw new HttpError(401, 'That code is not correct. Try the next code from your app, or a backup code.');
  }
  const safe = await prisma.user.update({ where: { id: user.id }, data: persistUse(user, check), select: userSelect });
  res.json({ token: signToken(safe), user: safe, backupCodesLeft: check.remainingBackup ? check.remainingBackup.length : undefined });
});

const adminOnly = (req) => {
  if (req.user.role !== 'ADMIN') throw new HttpError(403, 'Two-factor sign-in is available for admin accounts.');
  if (isReadOnlyDemoAdmin(req.user)) throw new HttpError(403, 'The demo admin cannot use two-factor sign-in.');
};

const loadMe = (req) => prisma.user.findUnique({ where: { id: req.user.id } });

// GET /api/auth/2fa/status
const status = asyncHandler(async (req, res) => {
  const u = await loadMe(req);
  res.json({
    available: req.user.role === 'ADMIN' && !isReadOnlyDemoAdmin(req.user),
    enabled: Boolean(u.twoFactorEnabledAt),
    backupCodesLeft: Array.isArray(u.twoFactorBackup) ? u.twoFactorBackup.length : 0,
  });
});

// POST /api/auth/2fa/setup - start: make a secret and show it as a QR code to scan
const setup = asyncHandler(async (req, res) => {
  adminOnly(req);
  const u = await loadMe(req);
  if (u.twoFactorEnabledAt) throw new HttpError(400, 'Two-factor sign-in is already on. Turn it off first to set it up again.');
  const secret = totp.newSecret();
  await prisma.user.update({ where: { id: u.id }, data: { twoFactorSecretEnc: totp.encryptSecret(secret) } });
  res.json({ secret, otpauthUrl: totp.otpauthUrl(secret, u.email) });
});

// POST /api/auth/2fa/enable { code } - finish: prove the app works, then switch it on and give backup codes (shown once)
const enable = asyncHandler(async (req, res) => {
  adminOnly(req);
  const { code } = codeSchema.parse(req.body);
  const u = await loadMe(req);
  if (u.twoFactorEnabledAt) throw new HttpError(400, 'Two-factor sign-in is already on.');
  if (!u.twoFactorSecretEnc) throw new HttpError(400, 'Start the setup first.');
  const step = totp.verifyTotp(totp.decryptSecret(u.twoFactorSecretEnc), code);
  if (step === null) throw new HttpError(400, 'That code is not correct. Check the time on your phone and try again.');
  const { codes, hashes } = totp.newBackupCodes(8);
  await prisma.user.update({ where: { id: u.id }, data: { twoFactorEnabledAt: new Date(), twoFactorBackup: hashes, twoFactorLastStep: step } });
  await audit(req, 'auth.2fa_enable', 'User', u.id, {});
  res.json({ enabled: true, backupCodes: codes });
});

// Re-checks password and a code before a sensitive change. A wrong answer counts toward the lockout.
async function confirmSensitive(req) {
  const { password, code } = passwordCodeSchema.parse(req.body);
  const u = await loadMe(req);
  if (!u.twoFactorEnabledAt) throw new HttpError(400, 'Two-factor sign-in is not on.');
  if (isLocked(u)) throw new HttpError(429, lockMessage(u));
  const check = checkSecondFactor(u, code);
  if (!(await bcrypt.compare(password, u.passwordHash)) || !check.ok) {
    await recordFailure(u);
    throw new HttpError(400, 'Your password or code is not correct.');
  }
  return { u, check };
}

// POST /api/auth/2fa/disable { password, code }
const disable = asyncHandler(async (req, res) => {
  adminOnly(req);
  const { u } = await confirmSensitive(req);
  await prisma.user.update({ where: { id: u.id }, data: { twoFactorSecretEnc: null, twoFactorEnabledAt: null, twoFactorBackup: null, twoFactorLastStep: null, ...clearData } });
  await audit(req, 'auth.2fa_disable', 'User', u.id, {});
  res.json({ enabled: false });
});

// POST /api/auth/2fa/backup-codes { password, code } - replaces all backup codes
const regenerateBackup = asyncHandler(async (req, res) => {
  adminOnly(req);
  const { u, check } = await confirmSensitive(req);
  const { codes, hashes } = totp.newBackupCodes(8);
  await prisma.user.update({ where: { id: u.id }, data: { twoFactorBackup: hashes, ...(check.step !== undefined ? { twoFactorLastStep: check.step } : {}), ...clearData } });
  await audit(req, 'auth.2fa_backup_regenerate', 'User', u.id, {});
  res.json({ backupCodes: codes });
});

// POST /api/admin/users/:id/reset-2fa - another admin removes 2FA (and any lockout) from a locked-out admin
const adminReset = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === req.user.id) throw new HttpError(400, 'Use "Turn off" in your own Settings.');
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) throw new HttpError(404, 'User not found');
  await prisma.user.update({ where: { id }, data: { twoFactorSecretEnc: null, twoFactorEnabledAt: null, twoFactorBackup: null, twoFactorLastStep: null, ...clearData } });
  await audit(req, 'user.reset_2fa', 'User', id, { email: target.email });
  res.json({ ok: true });
});

module.exports = { signChallenge, loginWithCode, status, setup, enable, disable, regenerateBackup, adminReset };
