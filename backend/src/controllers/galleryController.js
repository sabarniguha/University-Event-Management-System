const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent, loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { audit } = require('../utils/audit');

const LIMITS = { PHOTO: 40, SPONSOR: 12 };
const PER_STUDENT = 5;
const roleLabel = (r) => (r === 'STUDENT' ? 'Student' : r === 'ADMIN' ? 'Admin' : r === 'ORGANIZER' ? 'Organiser' : null);

// A student may add photos only to a finished event they were marked present at.
async function studentUploadState(userId, event, assets) {
  const used = assets.filter((a) => a.kind === 'PHOTO' && a.uploadedById === userId).length;
  const base = { limit: PER_STUDENT, used, allowed: false, reason: null };
  if (event.status !== 'PUBLISHED') return { ...base, reason: 'This event is not published.' };
  if (new Date(event.endsAt) > new Date()) return { ...base, reason: 'You can add photos once the event has finished.' };
  const reg = await prisma.registration.findUnique({ where: { eventId_userId: { eventId: event.id, userId } }, select: { status: true, attendance: { select: { status: true } } } });
  if (!reg || reg.status !== 'REGISTERED' || reg.attendance?.status !== 'PRESENT') return { ...base, reason: 'Only students who attended this event can add photos.' };
  if (used >= PER_STUDENT) return { ...base, reason: `You have added the maximum of ${PER_STUDENT} photos.` };
  if (assets.filter((a) => a.kind === 'PHOTO').length >= LIMITS.PHOTO) return { ...base, reason: 'The gallery is full.' };
  return { ...base, allowed: true };
}
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
  // The public sees approved photos only. Managers see everything, and a student also sees their own pending photos.
  const visible = (a) => a.approved || canManage || (req.user && a.uploadedById === req.user.id);
  const pick = (kind) => assets.filter((a) => a.kind === kind && visible(a)).map((a) => ({ id: a.id, url: a.url, title: a.title, link: a.link, approved: a.approved, by: roleLabel(a.uploaderRole), mine: !!req.user && a.uploadedById === req.user.id }));
  const out = { photos: pick('PHOTO'), sponsors: pick('SPONSOR') };
  if (req.user?.role === 'STUDENT') out.upload = await studentUploadState(req.user.id, event, assets);
  res.json(out);
});

// POST /api/gallery/event/:eventId  (organiser of the event / admin)
const add = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  await loadManagedEvent(eventId, req.user);
  const data = addSchema.parse(req.body);
  const count = await prisma.eventAsset.count({ where: { eventId, kind: data.kind } });
  if (count >= LIMITS[data.kind]) throw new HttpError(400, `You can add at most ${LIMITS[data.kind]} ${data.kind === 'PHOTO' ? 'photos' : 'sponsors'} to one event`);
  if (data.kind === 'SPONSOR' && !data.title) throw new HttpError(400, 'Give the sponsor a name');
  const asset = await prisma.eventAsset.create({ data: { eventId, kind: data.kind, url: data.url, title: data.title, link: data.kind === 'SPONSOR' ? data.link : null, position: count, uploadedById: req.user.id, uploaderRole: req.user.role } });
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

// POST /api/gallery/event/:eventId/mine  (a student who attended). Waits for the organiser's approval.
const addMine = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  const { url, title } = addSchema.pick({ url: true, title: true }).parse(req.body);
  const assets = await prisma.eventAsset.findMany({ where: { eventId, kind: 'PHOTO' }, select: { kind: true, uploadedById: true } });
  const state = await studentUploadState(req.user.id, event, assets);
  if (!state.allowed) throw new HttpError(403, state.reason);
  const asset = await prisma.eventAsset.create({ data: { eventId, kind: 'PHOTO', url, title, position: assets.length, uploadedById: req.user.id, uploaderRole: 'STUDENT', approved: false } });
  await audit(req, 'event.student_photo_add', 'Event', eventId, {});
  res.status(201).json({ asset: { id: asset.id, url: asset.url, approved: false } });
});

// DELETE /api/gallery/mine/:id  (a student removes their own photo)
const removeMine = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const asset = await prisma.eventAsset.findUnique({ where: { id } });
  if (!asset || asset.uploadedById !== req.user.id || asset.uploaderRole !== 'STUDENT') throw new HttpError(404, 'Not found');
  await prisma.eventAsset.delete({ where: { id } });
  res.json({ ok: true });
});

// PATCH /api/gallery/:id/approve  (organiser of the event / admin)
const approve = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const asset = await prisma.eventAsset.findUnique({ where: { id }, include: { event: true } });
  if (!asset) throw new HttpError(404, 'Not found');
  if (!canManageEvent(req.user, asset.event)) throw new HttpError(403, 'You do not manage this event');
  await prisma.eventAsset.update({ where: { id }, data: { approved: true } });
  await audit(req, 'event.asset_approve', 'Event', asset.eventId, {});
  res.json({ ok: true });
});

// PATCH /api/gallery/:id/caption  (organiser of the event / admin). Photos only; an empty caption clears it.
const caption = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { title } = z.object({ title: z.string().trim().max(100).optional().transform((v) => v || null) }).parse(req.body);
  const asset = await prisma.eventAsset.findUnique({ where: { id }, include: { event: true } });
  if (!asset || asset.kind !== 'PHOTO') throw new HttpError(404, 'Not found');
  if (!canManageEvent(req.user, asset.event)) throw new HttpError(403, 'You do not manage this event');
  await prisma.eventAsset.update({ where: { id }, data: { title } });
  res.json({ ok: true, title });
});

module.exports = { list, add, remove, addMine, removeMine, approve, caption };
