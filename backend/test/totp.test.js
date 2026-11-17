const test = require('node:test');
const assert = require('node:assert');
process.env.JWT_SECRET = 'x'.repeat(40);
const t = require('../src/utils/totp');

// RFC 6238 test vector: secret "12345678901234567890", time 59s -> 94287082 (8 digits), so the 6-digit code is 287082.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('matches the RFC 6238 test vectors', () => {
  assert.strictEqual(t.hotp(RFC_SECRET, Math.floor(59 / 30)), '287082');
  assert.strictEqual(t.hotp(RFC_SECRET, Math.floor(1111111109 / 30)), '081804');
});

test('verifies current and neighbouring steps only, and rejects junk', () => {
  const now = 1_700_000_000_000;
  const code = t.hotp(RFC_SECRET, t.stepAt(now));
  assert.strictEqual(t.verifyTotp(RFC_SECRET, code, now), t.stepAt(now));
  assert.strictEqual(t.verifyTotp(RFC_SECRET, code, now + 30_000), t.stepAt(now));
  assert.strictEqual(t.verifyTotp(RFC_SECRET, code, now + 120_000), null);
  assert.strictEqual(t.verifyTotp(RFC_SECRET, 'abcdef', now), null);
  assert.strictEqual(t.verifyTotp(RFC_SECRET, '12345', now), null);
});

test('secrets round-trip encrypted and backup codes are hashed', () => {
  const s = t.newSecret();
  assert.match(s, /^[A-Z2-7]{32}$/);
  const enc = t.encryptSecret(s);
  assert.notStrictEqual(enc, s);
  assert.strictEqual(t.decryptSecret(enc), s);
  const { codes, hashes } = t.newBackupCodes(8);
  assert.strictEqual(new Set(hashes).size, 8);
  assert.strictEqual(t.backupHash(codes[0].toUpperCase()), hashes[0]);
});
