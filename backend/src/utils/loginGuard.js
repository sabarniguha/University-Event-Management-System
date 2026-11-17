// Temporary lockout after repeated wrong passwords or wrong two-factor codes.
// Defaults: 5 failures, then 15 minutes. Change with LOGIN_MAX_ATTEMPTS and LOGIN_LOCK_MINUTES.
// The public demo accounts are exempt, otherwise anyone could lock them for everyone else.
const prisma = require('./prismaClient');
const { isDemoAccount } = require('./demo');

const maxAttempts = () => Math.max(3, Number(process.env.LOGIN_MAX_ATTEMPTS) || 5);
const lockMinutes = () => Math.max(1, Number(process.env.LOGIN_LOCK_MINUTES) || 15);

const isLocked = (user) => Boolean(user && user.lockedUntil && user.lockedUntil > new Date() && !isDemoAccount(user.email));

const lockMessage = (user) => {
  const mins = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
  return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or use "Forgot password" to reset it now.`;
};

async function recordFailure(user) {
  if (!user || isDemoAccount(user.email)) return;
  const { failedLogins } = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } }, select: { failedLogins: true } });
  if (failedLogins >= maxAttempts()) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + lockMinutes() * 60000) } });
  }
}

const clearData = { failedLogins: 0, lockedUntil: null };

module.exports = { isLocked, lockMessage, recordFailure, clearData, maxAttempts, lockMinutes };
