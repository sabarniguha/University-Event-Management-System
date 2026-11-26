const prisma = require('./prismaClient');
const razorpay = require('./razorpay');
const { notify, notifyAdmins } = require('./notify');
const { emailUsers } = require('./emailUsers');

const HOUR = 3600e3;

// True when a student cancelling right now is inside the organiser's refund window.
function refundAllowed(event, now = new Date()) {
  if (!event || !(event.fee > 0)) return false;
  if (event.refundCutoffHours === null || event.refundCutoffHours === undefined) return false;
  return new Date(event.startsAt).getTime() - event.refundCutoffHours * HOUR >= now.getTime();
}

// Refunds the student's online payment for a seat they have just cancelled. Never throws: the cancellation
// itself has already happened, so a failed refund is flagged for an admin instead (NEEDS_REFUND).
// Returns 'NONE' (nothing to refund), 'REFUNDED' or 'PENDING' (an admin will finish it).
async function refundOnCancel(registration, event, now = new Date()) {
  try {
    if (registration.status !== 'REGISTERED' || !refundAllowed(event, now)) return 'NONE';
    const payment = (await prisma.payment.findFirst({ where: { registrationId: registration.id, status: 'PAID' }, orderBy: { id: 'desc' } }))
      || (await prisma.payment.findFirst({ where: { userId: registration.userId, eventId: event.id, status: 'PAID' }, orderBy: { id: 'desc' } }));
    if (!payment || !payment.paymentId) return 'NONE';
    // Claim it first so a double click can never refund twice.
    const claimed = await prisma.payment.updateMany({ where: { id: payment.id, status: 'PAID' }, data: { status: 'NEEDS_REFUND' } });
    if (claimed.count === 0) return 'NONE';
    try {
      await razorpay.refund(payment.paymentId);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      await notify(prisma, registration.userId, { title: 'Refund started', message: `Your payment of ₹${payment.amount / 100} for "${event.title}" is being refunded. It reaches your account in a few working days.`, link: '/student/payments', type: 'PAYMENT' });
      emailUsers(registration.userId, { subject: 'Your refund has started', text: `You cancelled "${event.title}" in time, so ₹${payment.amount / 100} is being refunded. It reaches your account in a few working days.` });
      return 'REFUNDED';
    } catch (e) {
      console.error('[refund] cancellation refund failed:', e.message);
      await notifyAdmins(prisma, { title: 'Refund needed after a cancellation', message: `A student cancelled "${event.title}" inside the refund window, but the automatic refund of payment ${payment.paymentId} failed. Retry it on the Payments page.`, link: '/admin/payments', type: 'PAYMENT' });
      await notify(prisma, registration.userId, { title: 'Refund pending', message: `Your cancellation of "${event.title}" is recorded. Your refund of ₹${payment.amount / 100} will be completed by an admin.`, link: '/student/payments', type: 'PAYMENT' });
      return 'PENDING';
    }
  } catch (e) {
    console.error('[refund] could not process cancellation refund:', e.message);
    return 'NONE';
  }
}

module.exports = { refundAllowed, refundOnCancel };
