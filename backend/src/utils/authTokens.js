const crypto = require('crypto');
const prisma = require('./prismaClient');
const HttpError = require('./httpError');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Creates a single-use token. Only its hash is stored, so a database leak cannot be used to reset passwords.
async function issueToken(userId, type, ttlMs) {
  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  const raw = crypto.randomBytes(32).toString('hex');
  await prisma.authToken.create({
    data: { userId, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return raw;
}

// Marks the token used (atomically, so it cannot be replayed) and returns its record.
async function consumeToken(raw, type) {
  const bad = () => new HttpError(400, 'This link is invalid or has expired. Please request a new one.');
  if (typeof raw !== 'string' || raw.length < 20) throw bad();
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) throw bad();
  const claimed = await prisma.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) throw bad();
  return record;
}

module.exports = { issueToken, consumeToken };
