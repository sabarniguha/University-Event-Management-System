const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const rz = require('../src/utils/razorpay');
const cloud = require('../src/utils/cloudinary');

const h = (d, s) => crypto.createHmac('sha256', s).update(d).digest('hex');

test('razorpay checkout signature', () => {
  const good = h('order_1|pay_1', 'secret');
  assert.ok(rz.verifyCheckoutSignature('order_1', 'pay_1', good, 'secret'));
  assert.ok(!rz.verifyCheckoutSignature('order_1', 'pay_2', good, 'secret'));
  assert.ok(!rz.verifyCheckoutSignature('order_1', 'pay_1', good, 'other'));
  assert.ok(!rz.verifyCheckoutSignature('order_1', 'pay_1', 'short', 'secret'));
  assert.ok(!rz.verifyCheckoutSignature('order_1', 'pay_1', '', 'secret'));
  assert.ok(!rz.verifyCheckoutSignature('order_1', 'pay_1', good, ''));
});

test('razorpay webhook signature', () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  assert.ok(rz.verifyWebhookSignature(body, h(body, 'wh'), 'wh'));
  assert.ok(!rz.verifyWebhookSignature(Buffer.from('{"event":"x"}'), h(body, 'wh'), 'wh'));
  assert.ok(!rz.verifyWebhookSignature(body, h(body, 'wh'), ''));
});

test('payments and cloudinary are off without keys', () => {
  const keep = { ...process.env };
  for (const k of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete process.env[k];
  assert.equal(rz.enabled(), false);
  assert.equal(cloud.enabled(), false);
  process.env = keep;
});

test('cloudinary signature matches the documented algorithm', () => {
  // Cloudinary docs example: sha1("timestamp=1315060510" + secret) style, params sorted alphabetically.
  const expected = crypto.createHash('sha1').update('folder=unievents&timestamp=1315060510abcd').digest('hex');
  assert.equal(cloud.sign({ timestamp: 1315060510, folder: 'unievents' }, 'abcd'), expected);
});
