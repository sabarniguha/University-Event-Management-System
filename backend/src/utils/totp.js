// Time-based one-time passwords (RFC 6238) for authenticator apps such as Google Authenticator, Authy or Microsoft Authenticator.
// Implemented with Node's crypto only, so it needs no extra package.
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30;

function base32Encode(buf) {
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}

function base32Decode(str) {
  let bits = '';
  for (const ch of String(str).replace(/=+$/, '').toUpperCase()) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('Invalid base32');
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

const newSecret = () => base32Encode(crypto.randomBytes(20));

function hotp(secretBase32, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secretBase32)).update(msg).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(code % 1000000).padStart(6, '0');
}

const stepAt = (ms = Date.now()) => Math.floor(ms / 1000 / STEP);

// Accepts the current code and one step either side (clock drift). Returns the matching step number or null.
function verifyTotp(secretBase32, code, ms = Date.now()) {
  const given = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(given)) return null;
  const now = stepAt(ms);
  for (const s of [now, now - 1, now + 1]) {
    const expected = Buffer.from(hotp(secretBase32, s));
    if (crypto.timingSafeEqual(expected, Buffer.from(given))) return s;
  }
  return null;
}

const otpauthUrl = (secret, account, issuer = 'UniEvents') =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP}`;

// The secret is stored encrypted (AES-256-GCM), so a database leak alone does not reveal it.
// TWO_FACTOR_KEY can be set to keep 2FA working if JWT_SECRET is ever rotated.
const key = () => crypto.createHash('sha256').update(`2fa|${process.env.TWO_FACTOR_KEY || process.env.JWT_SECRET}`).digest();

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(secret, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

function decryptSecret(stored) {
  const [iv, tag, enc] = String(stored).split('.').map((p) => Buffer.from(p, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

// Backup codes: shown once, stored only as hashes. Format xxxxx-xxxxx.
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const normaliseBackup = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
function newBackupCodes(n = 8) {
  const codes = Array.from({ length: n }, () => {
    const raw = crypto.randomBytes(5).toString('hex'); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { codes, hashes: codes.map((c) => sha(normaliseBackup(c))) };
}
const backupHash = (v) => sha(normaliseBackup(v));

module.exports = { newSecret, verifyTotp, otpauthUrl, encryptSecret, decryptSecret, newBackupCodes, backupHash, hotp, base32Decode, stepAt };
