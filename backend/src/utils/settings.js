const prisma = require('./prismaClient');
const { DEFAULT_CATEGORIES, slugify } = require('./categories');

const DEFAULTS = {
  siteName: 'UniEvents',
  tagline: 'Discover. Connect. Experience Campus Life.',
  contactEmail: '',
  // When true, events submitted by organisers wait for an admin to approve them.
  requireEventApproval: true,
  // When false, the public sign-up form is closed (admins can still create accounts).
  allowStudentSignup: true,
};

const KEY = 'platform';

async function getSettings() {
  const row = await prisma.platformSetting.findUnique({ where: { key: KEY } });
  return { ...DEFAULTS, ...(row && typeof row.value === 'object' ? row.value : {}) };
}

async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await prisma.platformSetting.upsert({
    where: { key: KEY },
    update: { value: next },
    create: { key: KEY, value: next },
  });
  return next;
}

// Fields that are safe to show to anyone.
const publicSettings = (s) => ({
  siteName: s.siteName,
  tagline: s.tagline,
  contactEmail: s.contactEmail,
  allowStudentSignup: s.allowStudentSignup,
});

// Runs at server start: makes sure the default categories exist. Existing rows are never changed.
async function ensureDefaults() {
  await prisma.eventCategory.createMany({
    data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, slug: slugify(c.name), sortOrder: i })),
    skipDuplicates: true,
  });
}

module.exports = { DEFAULTS, getSettings, saveSettings, publicSettings, ensureDefaults };
