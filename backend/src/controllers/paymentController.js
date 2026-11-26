const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const razorpay = require('../utils/razorpay');
const { parseId } = require('../utils/validators');
const { registerUser, paymentRequired, payAfterApproval } = require('./registrationController');
const { notifyAdmins } = require('../utils/notify');
const { emailUsers } = require('../utils/emailUsers');
const { audit } = require('../utils/audit');
const { priceFor, codeProblem } = require('../utils/pricing');

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
  if (payment.discountCodeId) await prisma.discountCode.update({ where: { id: payment.discountCodeId }, data: { usedCount: { increment: 1 } } }).catch(() => {});

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
    // Refund automatically; if that fails the payment stays NEEDS_REFUND and an admin can retry from the Payments page.
    try {
      await razorpay.refund(paymentId);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      emailUsers(payment.userId, { subject: 'Your payment was refunded', text: `The event "${payment.event.title}" could not take your registration, so your payment has been refunded. It reaches your account in a few working days.` });
      throw new HttpError(409, 'Your payment went through but the event could no longer take your registration. It has been refunded automatically.');
    } catch (r) {
      if (r instanceof HttpError) throw r;
      console.error('[payments] automatic refund failed:', r.message);
    }
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
  const approvalFlow = payAfterApproval(event);
  if (!paymentRequired(event) && !approvalFlow) throw new HttpError(400, 'This event does not need an online payment');
  if (event.endsAt < new Date()) throw new HttpError(400, 'This event has already ended');
  if (!approvalFlow && event.registrationDeadline && event.registrationDeadline < new Date()) throw new HttpError(400, 'Registration for this event has closed');
  if (event.department && !sameDept(event.department, req.user.department)) {
    throw new HttpError(403, `This event is open to ${event.department} students only.`);
  }
  const existing = await prisma.registration.findUnique({ where: { eventId_userId: { eventId, userId: req.user.id } } });
  if (approvalFlow) {
    if (existing?.status !== 'AWAITING_PAYMENT') throw new HttpError(409, 'The organiser must approve your request before you can pay.');
  } else if (existing && !['CANCELLED'].includes(existing.status)) {
    throw new HttpError(409, 'You already have a registration for this event');
  }
  const taken = await prisma.registration.count({ where: { eventId, status: 'REGISTERED' } });
  if (taken >= event.capacity) throw new HttpError(409, 'This event is full');

  // Early-bird price and an optional promo code, worked out here and never trusted from the browser.
  let codeRow = null;
  const typed = String(req.body?.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (typed) {
    codeRow = await prisma.discountCode.findUnique({ where: { eventId_code: { eventId, code: typed } } });
    const problem = codeProblem(codeRow);
    if (problem) throw new HttpError(400, problem);
  }
  const price = priceFor(event, codeRow);
  const amount = price.final * 100; // rupees -> paise
  let order;
  try {
    order = await razorpay.createOrder({ amount, receipt: `ev${eventId}-u${req.user.id}-${Date.now()}`.slice(0, 40), notes: { eventId: String(eventId), userId: String(req.user.id) } });
  } catch (e) {
    console.error('[payments] could not create order:', e.message);
    throw new HttpError(502, 'The payment service is not responding. Please try again.');
  }
  await prisma.payment.create({ data: { userId: req.user.id, eventId, amount, orderId: order.id, discountCodeId: codeRow?.id ?? null, listAmount: event.fee * 100 } });
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

// GET /api/payments  (admin) - payments newest first, optional ?status=NEEDS_REFUND
const list = asyncHandler(async (req, res) => {
  const status = ['CREATED', 'PAID', 'FAILED', 'NEEDS_REFUND', 'REFUNDED'].includes(req.query.status) ? req.query.status : undefined;
  // Organisers only see payments for their own events; admins see everything.
  const scope = req.user.role === 'ADMIN' ? {} : { event: { organizerId: req.user.id } };
  const payments = await prisma.payment.findMany({
    where: { ...scope, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { name: true, email: true, studentId: true } }, event: { select: { id: true, title: true } } },
  });
  const sums = await prisma.payment.groupBy({ by: ['status'], where: scope, _sum: { amount: true }, _count: true });
  const summary = Object.fromEntries(sums.map((s) => [s.status, { count: s._count, amount: s._sum.amount || 0 }]));
  res.json({ enabled: razorpay.enabled(), payments, summary });
});

// GET /api/payments/mine  (students) - their own receipts
const mine = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: {
      userId: req.user.id,
      OR: [
        { status: { in: ['PAID', 'NEEDS_REFUND', 'REFUNDED'] } },
        // Started but not completed in the last 3 days = pending.
        { status: 'CREATED', createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: { event: { select: { id: true, title: true, startsAt: true } } },
  });
  res.json({ payments });
});

// POST /api/payments/:id/refund  (admin) - refund a NEEDS_REFUND payment through Razorpay
const refundNow = asyncHandler(async (req, res) => {
  if (!razorpay.enabled()) throw new HttpError(404, 'Online payments are not enabled');
  const id = parseId(req.params.id);
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.status !== 'NEEDS_REFUND' || !payment.paymentId) throw new HttpError(409, 'Only payments that need a refund can be refunded');
  try {
    await razorpay.refund(payment.paymentId);
  } catch (e) {
    throw new HttpError(502, `Razorpay could not refund this payment: ${e.message}`);
  }
  await prisma.payment.update({ where: { id }, data: { status: 'REFUNDED' } });
  await audit(req, 'payment.refund', 'Payment', id);
  res.json({ ok: true });
});

// PATCH /api/payments/:id/refunded  (admin) - record that a NEEDS_REFUND payment was refunded in the Razorpay dashboard
const markRefunded = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const done = await prisma.payment.updateMany({ where: { id, status: 'NEEDS_REFUND' }, data: { status: 'REFUNDED' } });
  if (done.count === 0) throw new HttpError(409, 'Only payments that need a refund can be marked refunded');
  await audit(req, 'payment.refunded', 'Payment', id);
  res.json({ ok: true });
});

module.exports = { mine, refundNow, list, markRefunded, config, createOrder, verify, webhook, finalizePayment };
