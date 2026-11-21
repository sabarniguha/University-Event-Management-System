// Report IDs. The ID is a keyed hash of what the report says, so a changed figure gives a different ID,
// and an ID can only be checked against what the server really issued.
const crypto = require('crypto');
const prisma = require('./prismaClient');

const KINDS = {
  PLATFORM: 'Platform report', ORGANISER: 'Organiser report', EVENT: 'Event report',
  STUDENT: 'Student performance report', TRANSCRIPT: 'Student activity transcript',
};

const secret = () => `${process.env.REPORT_SEAL_KEY || process.env.JWT_SECRET || 'dev-only-seal-key'}:report-seal`;

function codeFor({ kind, userId, periodKey, figures }) {
  const h = crypto.createHmac('sha256', secret()).update(JSON.stringify([kind, userId ?? null, periodKey, figures])).digest('hex').slice(0, 12).toUpperCase();
  return `RPT-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}`;
}

const normalise = (c) => String(c || '').trim().toUpperCase();
const valid = (c) => /^RPT-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(c);

// Never lets a sealing problem break a report: returns null and the report simply has no ID.
async function issue({ kind, userId = null, subject, periodLabel, periodKey, figures }) {
  try {
    const clean = figures.map(([label, value]) => ({ label, value: String(value) }));
    const code = codeFor({ kind, userId, periodKey, figures: clean });
    const row = await prisma.reportSeal.upsert({ where: { code }, update: {}, create: { code, kind, subject: String(subject).slice(0, 120), periodLabel, figures: clean, userId } });
    return { code, issuedAt: row.issuedAt };
  } catch (e) {
    return null;
  }
}

async function check(raw) {
  const code = normalise(raw);
  if (!valid(code)) return null;
  const row = await prisma.reportSeal.findUnique({ where: { code } });
  if (!row) return null;
  return { code, kind: row.kind, kindLabel: KINDS[row.kind] || 'Report', subject: row.subject, periodLabel: row.periodLabel, issuedAt: row.issuedAt, figures: row.figures };
}

module.exports = { KINDS, issue, check, codeFor, valid };
