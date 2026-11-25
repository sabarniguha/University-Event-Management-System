const crypto = require('crypto');

// A short-lived code for the QR an organiser shows on a projector. It is derived from the event and the
// current 30-second slot, so nothing is stored; a photo of the screen stops working within about a minute.
const SLOT_SECONDS = 30;
const secret = () => `${process.env.JWT_SECRET || 'dev-only-screen-key'}:screen-checkin`;
const slotOf = (now = Date.now()) => Math.floor(now / 1000 / SLOT_SECONDS);
const sign = (eventId, slot) => crypto.createHmac('sha256', secret()).update(`${eventId}:${slot}`).digest('hex').slice(0, 20);

const codeFor = (eventId, now) => sign(eventId, slotOf(now));
// Accepts the current slot and the one before it (about 60 seconds of grace for scanning).
const isValidCode = (eventId, code, now) => {
  if (typeof code !== 'string' || code.length !== 20) return false;
  const slot = slotOf(now);
  return [slot, slot - 1].some((s) => {
    const want = Buffer.from(sign(eventId, s));
    const got = Buffer.from(code);
    return want.length === got.length && crypto.timingSafeEqual(want, got);
  });
};
const secondsLeft = (now = Date.now()) => SLOT_SECONDS - (Math.floor(now / 1000) % SLOT_SECONDS);

module.exports = { codeFor, isValidCode, secondsLeft, SLOT_SECONDS };
