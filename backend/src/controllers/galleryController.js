const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent, loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { audit } = require('../utils/audit');

const LIMITS = { PHOTO: 40, SPONSOR: 12 };
const imageUrl = z.string().trim().max(500).refine((v) => /^\/api\/media\/\d+$/.test(v) || /^https?:\/\/\S+$/i.test(v), 'Upload an image first');
const addSchema = z.object({
  kind: z.enum(['PHOTO', 'SPONSOR']),
  url: imageUrl,
  title: z.string().trim().max(100).optional().transform((v) => v || null),
  link: z.string().trim().max(300).optional().transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), 'The website link must start with http:// or https://'),
});

// GET /api/gallery/event/:eventId  (public for published events)
const list = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  const canManage = req.user ? canManageEvent(req.user, event) : false;
  if (event.status !== 'PUBLISHED' && !canManage) throw new HttpError(404, 'Event not found');
  const assets = await prisma.eventAsset.findMany({ where: { eventId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  const pick = (kind) => assets.filter((a) => a.kind === kind).map(({ id, url, title, link }) => ({ id, url, title, link }));
  res.json({ photos: pick('PHOTO'), sponsors: pick('SPONSOR') });
});

// POST /api/gallery/event/:eventId  (organiser of the event / admin)
const add = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  await loadManagedEvent(eventId, req.user);
  const data = addSchema.parse(req.body);
  const count = await prisma.eventAsset.count({ where: { eventId, kind: data.kind } });
  if (count >= LIMITS[data.kind]) throw new HttpError(400, `You can add at most ${LIMITS[data.kind]} ${data.kind === 'PHOTO' ? 'photos' : 'sponsors'} to one event`);
  if (data.kind === 'SPONSOR' && !data.title) throw new HttpError(400, 'Give the sponsor a name');
  const asset = await prisma.eventAsset.create({ data: { eventId, kind: data.kind, url: data.url, title: data.title, link: data.kind === 'SPONSOR' ? data.link : null, position: count, uploadedById: req.user.id } });
  await audit(req, 'event.asset_add', 'Event', eventId, { kind: data.kind });
  res.status(201).json({ asset: { id: asset.id, url: asset.url, title: asset.title, link: asset.link } });
});

// DELETE /api/gallery/:id
const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const asset = await prisma.eventAsset.findUnique({ where: { id }, include: { event: true } });
  if (!asset) throw new HttpError(404, 'Not found');
  if (!canManageEvent(req.user, asset.event)) throw new HttpError(403, 'You do not manage this event');
  await prisma.eventAsset.delete({ where: { id } });
  await audit(req, 'event.asset_remove', 'Event', asset.eventId, { kind: asset.kind });
  res.json({ ok: true });
});

module.exports = { list, add, remove };
