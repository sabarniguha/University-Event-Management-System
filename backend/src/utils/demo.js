const bcrypt = require('bcryptjs');
const prisma = require('./prismaClient');

// Optional demo accounts so visitors can try the app. OFF unless the owner sets BOTH
// ENABLE_DEMO_ACCOUNTS=true and DEMO_PASSWORD (min 8 chars). An admin demo account exists only with the extra ENABLE_DEMO_ADMIN=true and is read-only.
const ACCOUNTS = [
  { role: 'STUDENT', name: 'Demo Student', email: 'demo.student@uni.edu', department: 'Computer Science and Engineering' },
  { role: 'ORGANIZER', name: 'Demo Organiser', email: 'demo.organizer@uni.edu', department: 'Computer Science and Engineering' },
];

const ADMIN_ACCOUNT = { role: 'ADMIN', name: 'Demo Admin', email: 'demo.admin@uni.edu', department: 'Administration' };

const demoEnabled = () => process.env.ENABLE_DEMO_ACCOUNTS === 'true' && String(process.env.DEMO_PASSWORD || '').length >= 8;

// A demo admin needs its own switch, because an admin can see every user's details.
const demoAdminEnabled = () => demoEnabled() && process.env.ENABLE_DEMO_ADMIN === 'true';
const accounts = () => (demoAdminEnabled() ? [...ACCOUNTS, ADMIN_ACCOUNT] : ACCOUNTS);
// The demo admin can look around but never change anything.
const isReadOnlyDemoAdmin = (user) => demoAdminEnabled() && user?.email === ADMIN_ACCOUNT.email;

async function ensureDemoAccounts() {
  if (!demoEnabled()) return;
  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
  for (const a of accounts()) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.user.upsert({
      where: { email: a.email },
      update: { passwordHash, isActive: true, role: a.role },
      create: { ...a, passwordHash, emailVerifiedAt: new Date() },
    });
  }
  console.log(`[demo] Demo accounts are ENABLED (student, organiser${demoAdminEnabled() ? ', read-only admin' : ''}).`);
}

// What the login pages may show. The password is public by design when demo mode is switched on.
const demoInfo = () =>
  demoEnabled()
    ? { enabled: true, password: process.env.DEMO_PASSWORD, accounts: accounts().map(({ role, email }) => ({ role, email })) }
    : { enabled: false };

module.exports = { ensureDemoAccounts, demoInfo, demoEnabled, demoAdminEnabled, isReadOnlyDemoAdmin };
