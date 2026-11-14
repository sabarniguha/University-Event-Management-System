const crypto = require('crypto');

// Optional online payments. Active only when both keys are set; otherwise event fees are informational.
const enabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const hmac = (data, secret) => crypto.createHmac("sha256", secret).update(data).digest("hex");

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Checkout signature: HMAC-SHA256 of "order_id|payment_id" with the key secret.
const verifyCheckoutSignature = (orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET) =>
  Boolean(secret && orderId && paymentId && signature) && safeEqual(hmac(`${orderId}|${paymentId}`, secret), signature);

// Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret.
const verifyWebhookSignature = (rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) =>
  Boolean(secret && rawBody && signature) && safeEqual(hmac(rawBody, secret), signature);

// Creates an order. `amount` is in paise. Throws on failure.
async function createOrder({ amount, receipt, notes }) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) throw new Error(body?.error?.description || `Razorpay returned ${res.status}`);
  return body;
}

module.exports = { enabled, createOrder, verifyCheckoutSignature, verifyWebhookSignature };
