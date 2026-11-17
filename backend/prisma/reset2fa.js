// Emergency recovery for a locked-out admin (run on the server): node prisma/reset2fa.js admin@example.com
// Removes two-factor sign-in and any lockout from that account. It does not change the password.
const { PrismaClient } = require('@prisma/client');

(async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) { console.error('Usage: node prisma/reset2fa.js <email>'); process.exit(1); }
  const prisma = new PrismaClient();
  try {
    const r = await prisma.user.updateMany({ where: { email }, data: { twoFactorSecretEnc: null, twoFactorEnabledAt: null, twoFactorBackup: null, twoFactorLastStep: null, failedLogins: 0, lockedUntil: null } });
    console.log(r.count ? `Two-factor sign-in and lockout cleared for ${email}.` : `No account found for ${email}.`);
  } finally { await prisma.$disconnect(); }
})();
