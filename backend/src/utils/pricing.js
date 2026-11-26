// What a student pays: the early-bird price while it lasts, then an optional promo code on top.
// The server always works this out itself; the browser only displays what it is told.
const MIN_RUPEES = 1; // Razorpay cannot take an order below one rupee

const earlyBirdActive = (event, now = new Date()) =>
  event.earlyBirdFee != null && event.earlyBirdUntil != null && new Date(event.earlyBirdUntil) > now && event.earlyBirdFee < event.fee;

const baseFee = (event, now) => (earlyBirdActive(event, now) ? event.earlyBirdFee : event.fee);

// Why a code cannot be used right now, or null when it can.
const codeProblem = (code, now = new Date()) => {
  if (!code || !code.active) return 'This code is not valid';
  if (code.expiresAt && new Date(code.expiresAt) <= now) return 'This code has expired';
  if (code.maxUses != null && code.usedCount >= code.maxUses) return 'This code has been fully used';
  return null;
};

const applyCode = (base, code) => {
  if (!code) return base;
  const off = code.kind === 'FLAT' ? code.value : Math.round((base * code.value) / 100);
  return Math.max(MIN_RUPEES, base - off);
};

// -> { list, base, final, earlyBird, codeApplied } in whole rupees
function priceFor(event, code, now = new Date()) {
  const base = baseFee(event, now);
  const final = applyCode(base, code);
  return { list: event.fee, base, final, earlyBird: earlyBirdActive(event, now), codeApplied: Boolean(code) };
}

module.exports = { priceFor, codeProblem, earlyBirdActive, baseFee, MIN_RUPEES };
