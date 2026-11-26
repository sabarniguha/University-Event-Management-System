const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { audit } = require('../utils/audit');
const { priceFor, codeProblem } = require('../utils/pricing');

const normCode = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
const createSchema = z.object({
  code: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _ only'),
  kind: z.enum(['PERCENT', 'FLAT']),
  value: z.coerce.number().int().min(1).max(1000000),
  maxUses: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().int().min(1).max(100000).optional()),
  expiresAt: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional()),
});

// ----- Organiser / admin -----

// GET /api/discounts/event/:eventId
const list = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const codes = await prisma.discountCode.findMany({ where: { eventId }, orderBy: { createdAt: 'desc' } });
  res.json({ event: { id: event.id, title: event.title, fee: event.fee, earlyBirdFee: event.earlyBirdFee, earlyBirdUntil: event.earlyBirdUntil }, codes });
});

// POST /api/discounts/event/:eventId
const create = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const body = createSchema.parse(req.body);
  if (!(event.fee > 0)) throw new HttpError(400, 'Promo codes are for paid events only');
  if (body.kind === 'PERCENT' && body.value > 90) throw new HttpError(400, 'A percentage code can take off at most 90%');
  if (body.kind === 'FLAT' && body.value >= event.fee) throw new HttpError(400, `A flat code must be less than the fee (₹${event.fee})`);
  const code = normCode(body.code);
  const clash = await prisma.discountCode.findUnique({ where: { eventId_code: { eventId, code } } });
  if (clash) throw new HttpError(409, 'This event already has a code with that name');
  const row = await prisma.discountCode.create({ data: { eventId, code, kind: body.kind, value: body.value, maxUses: body.maxUses ?? null, expiresAt: body.expiresAt ?? null } });
  await audit(req, 'discount.create', 'Event', eventId, { code });
  res.status(201).json({ code: row });
});

// PATCH /api/discounts/event/:eventId/:id  { active }
const toggle = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const id = parseId(req.params.id, 'code id');
  await loadManagedEvent(eventId, req.user);
  const { active } = z.object({ active: z.boolean() }).parse(req.body);
  const done = await prisma.discountCode.updateMany({ where: { id, eventId }, data: { active } });
  if (done.count === 0) throw new HttpError(404, 'Code not found');
  res.json({ active });
});

// DELETE /api/discounts/event/:eventId/:id
const remove = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const id = parseId(req.params.id, 'code id');
  await loadManagedEvent(eventId, req.user);
  await prisma.discountCode.deleteMany({ where: { id, eventId } });
  res.json({ removed: true });
});

// ----- Student -----

// POST /api/discounts/check  { eventId, code } - shows the price before paying; nothing is used up
const check = asyncHandler(async (req, res) => {
  const { eventId, code } = z.object({ eventId: z.coerce.number().int().positive(), code: z.string().max(40).optional() }).parse(req.body);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'PUBLISHED' || !(event.fee > 0)) throw new HttpError(404, 'Event not found');
  let row = null;
  if (code && normCode(code)) {
    row = await prisma.discountCode.findUnique({ where: { eventId_code: { eventId, code: normCode(code) } } });
    const problem = codeProblem(row);
    if (problem) throw new HttpError(400, problem);
  }
  res.json(priceFor(event, row));
});

module.exports = { list, create, toggle, remove, check };
