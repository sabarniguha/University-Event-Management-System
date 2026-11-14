const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const razorpay = require('../utils/razorpay');
const { parseId } = require('../utils/validators');
const { registerUser, paymentRequired } = require('./registrationController');
const { notifyAdmins } = require('../utils/notify');
const { emailUsers } = require('../utils/emailUsers');

const sameDept = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

const verifySchema = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().min(1).max(200),
});

// Turns a confirmed payment into a registration. Safe to call twice (checkout verify + webhook):
// only the call that flips CREATED -> PAID goes on to register the student.
async function finalizePayment(orderId, paymentId) {
  const payment = await prisma.payment.findUnique({ where: { orderId }, include: { user: true, event: { select: { title: true } } } });
  if (!payment) throw new HttpError(404, 'Payment not found');
  if (payment.status !== 'CREATED') return payment;

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'CREATED' },
    data: { status: 'PAID', paymentId, paidAt: new Date() },
  });
  if (claimed.count === 0) return prisma.payment.findUnique({ where: { id: payment.id } });

  try {
    const registration = await registerUser(payment.user, payment.eventId, { skipPaymentCheck: true, noWaitlist: true });
    emailUsers(payment.userId, { subject: 'Payment received. You are registered', text: `We received your payment for "${payment.event.title}". Your QR ticket is ready.`, link: '/student/tickets' });
    return prisma.payment.update({ where: { id: payment.id }, data: { registrationId: registration.id } });
  } catch (e) {
    const already = e instanceof HttpError && e.status === 409 && /already/i.test(e.message);
    if (already) {
      const reg = await prisma.registration.findUnique({ where: { eventId_userId: { eventId: payment.eventId, userId: payment.userId } } });
      return prisma.payment.update({ where: { id: payment.id }, data: { registrationId: reg?.id || null } });
    }
    // Paid, but no seat could be given (event filled, closed or was cancelled meanwhile): flag for a manual refund.
    console.error('[payments] paid but could not register, needs refund:', orderId, e.message);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'NEEDS_REFUND' } });
    await notifyAdmins(prisma, {
      title: 'Payment needs a refund',
      message: `${payment.user.name} paid for "${payment.event.title}" but could not be registered (${e.message}). Refund payment ${paymentId} in the Razorpay dashboard.`,
      link: '/admin/audit-logs',
      type: 'PAYMENT',
    });
    throw new HttpError(409, 'Your payment went through but the event could no longer take your registration. The organisers have been told and it will be refunded.');
  }
}

// GET /api/payments/config - lets the page know whether to show online checkout
const config = (req, res) => {
  res.json({ enabled: razorpay.enabled(), keyId: razorpay.enabled() ? process.env.RAZORPAY_KEY_ID : null });
};

// POST /api/payments/:eventId/order  (students)
const createOrder = asyncHandler(async (req, res) => {
  if (!razorpay.enabled()) throw new HttpError(404, 'Online payments are not enabled');
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
  if (!paymentRequired(event)) throw new HttpError(400, 'This event does not need an online payment');
  if (event.endsAt < new Date()) throw new HttpError(400, 'This event has already ended');
  if (event.registrationDeadline && event.registrationDeadline < new Date()) throw new HttpError(400, 'Registration for this event has closed');
  if (event.department && !sameDept(event.department, req.user.department)) {
    throw new HttpError(403, `This event is open to ${event.department} students only.`);
  }
  const existing = await prisma.registration.findUnique({ where: { eventId_userId: { eventId, userId: req.user.id } } });
  if (existing && !['CANCELLED'].includes(existing.status)) throw new HttpError(409, 'You already have a registration for this event');
  const taken = await prisma.registration.count({ where: { eventId, status: 'REGISTERED' } });
  if (taken >= event.capacity) throw new HttpError(409, 'This event is full');

  const amount = event.fee * 100; // rupees -> paise
  let order;
  try {
    order = await razorpay.createOrder({ amount, receipt: `ev${eventId}-u${req.user.id}-${Date.now()}`.slice(0, 40), notes: { eventId: String(eventId), userId: String(req.user.id) } });
  } catch (e) {
    console.error('[payments] could not create order:', e.message);
    throw new HttpError(502, 'The payment service is not responding. Please try again.');
  }
  await prisma.payment.create({ data: { userId: req.user.id, eventId, amount, orderId: order.id } });
  res.status(201).json({ orderId: order.id, amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, eventTitle: event.title });
});

// POST /api/payments/verify  (students) - called by the page after Razorpay checkout succeeds
const verify = asyncHandler(async (req, res) => {
  if (!razorpay.enabled()) throw new HttpError(404, 'Online payments are not enabled');
  const { orderId, paymentId, signature } = verifySchema.parse(req.body);
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.userId !== req.user.id) throw new HttpError(404, 'Payment not found');
  if (!razorpay.verifyCheckoutSignature(orderId, paymentId, signature)) throw new HttpError(400, 'Payment could not be verified');
  const done = await finalizePayment(orderId, paymentId);
  res.json({ status: done.status, registrationId: done.registrationId });
});

// POST /api/payments/webhook - optional safety net for students who close the tab after paying.
// Configure it in the Razorpay dashboard with the secret in RAZORPAY_WEBHOOK_SECRET (event: payment.captured).
const webhook = asyncHandler(async (req, res) => {
  if (!razorpay.enabled() || !process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(404).json({ message: 'Not enabled' });
  const raw = req.body;
  if (!Buffer.isBuffer(raw) || !razorpay.verifyWebhookSignature(raw, req.get('x-razorpay-signature'))) {
    return res.status(400).json({ message: 'Invalid signature' });
  }
  let evt;
  try { evt = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ message: 'Bad body' }); }
  const entity = evt?.payload?.payment?.entity;
  if (evt?.event === 'payment.captured' && entity?.order_id && entity?.id) {
    try { await finalizePayment(entity.order_id, entity.id); } catch (e) { console.error('[payments] webhook:', e.message); }
  }
  res.json({ ok: true });
});

module.exports = { config, createOrder, verify, webhook, finalizePayment };
