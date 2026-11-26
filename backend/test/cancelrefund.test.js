const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = (p) => path.resolve(__dirname, '../src', p);
const stub = (p, exports) => { const f = require.resolve(R(p)); require.cache[f] = { id: f, filename: f, loaded: true, exports }; };

const H = 3600e3;
let payment; let claimed; let refunded; let updates; let notes; let failRefund;
stub('utils/prismaClient.js', {
  payment: {
    findFirst: async () => payment,
    updateMany: async () => { claimed += 1; return { count: claimed === 1 ? 1 : 0 }; },
    update: async (a) => { updates.push(a.data.status); return {}; },
  },
});
stub('utils/razorpay.js', { refund: async (id) => { if (failRefund) throw new Error('boom'); refunded.push(id); } });
stub('utils/notify.js', { notify: async (db, ids, p) => { notes.push(p.title); }, notifyAdmins: async (db, p) => { notes.push(`admin:${p.title}`); } });
stub('utils/emailUsers.js', { emailUsers: () => {} });
const { refundAllowed, refundOnCancel } = require(R('utils/cancelRefund.js'));
const reset = () => { payment = { id: 1, paymentId: 'pay_1', amount: 100 }; claimed = 0; refunded = []; updates = []; notes = []; failRefund = false; };
const ev = (hoursAhead, cutoff, fee = 100) => ({ id: 7, title: 'Fest', fee, refundCutoffHours: cutoff, startsAt: new Date(Date.now() + hoursAhead * H) });
const reg = { id: 5, userId: 3, status: 'REGISTERED' };

test('refund window rules', () => {
  assert.strictEqual(refundAllowed(ev(48, 24)), true);
  assert.strictEqual(refundAllowed(ev(10, 24)), false);
  assert.strictEqual(refundAllowed(ev(1, 0)), true);
  assert.strictEqual(refundAllowed(ev(48, null)), false);
  assert.strictEqual(refundAllowed(ev(48, 24, 0)), false);
});

test('cancelling inside the window refunds the online payment once', async () => {
  reset();
  assert.strictEqual(await refundOnCancel(reg, ev(48, 24)), 'REFUNDED');
  assert.deepStrictEqual(refunded, ['pay_1']);
  assert.deepStrictEqual(updates, ['REFUNDED']);
  assert.strictEqual(await refundOnCancel(reg, ev(48, 24)), 'NONE'); // already claimed: no second refund
  assert.strictEqual(refunded.length, 1);
});

test('no refund outside the window, without a payment, or for a waitlisted seat', async () => {
  reset(); assert.strictEqual(await refundOnCancel(reg, ev(10, 24)), 'NONE');
  reset(); payment = null; assert.strictEqual(await refundOnCancel(reg, ev(48, 24)), 'NONE');
  reset(); assert.strictEqual(await refundOnCancel({ ...reg, status: 'WAITLISTED' }, ev(48, 24)), 'NONE');
  assert.strictEqual(refunded.length, 0);
});

test('a failed Razorpay refund is left for an admin and the student is told', async () => {
  reset(); failRefund = true;
  assert.strictEqual(await refundOnCancel(reg, ev(48, 24)), 'PENDING');
  assert.ok(notes.some((n) => n.startsWith('admin:')));
  assert.deepStrictEqual(updates, []); // stays NEEDS_REFUND from the claim
});
