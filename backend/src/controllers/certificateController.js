const crypto = require('crypto');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent, canManageEvent } = require('../utils/access');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { readPage, pageInfo } = require('../utils/pagination');
const { parseId, generateCertificatesSchema } = require('../utils/validators');

const TEMPLATES = [
  { key: 'classic', name: 'Classic', description: 'Serif lettering with a gold border.' },
  { key: 'modern', name: 'Modern', description: 'Clean sans-serif with a coloured header band.' },
  { key: 'minimal', name: 'Minimal', description: 'Plain and print-friendly.' },
];

const newCertificateId = () => `UNI-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

const certInclude = {
  user: { select: { name: true, department: true, studentId: true } },
  event: { select: { id: true, title: true, venue: true, startsAt: true, endsAt: true, organizer: { select: { name: true } } } },
  issuedBy: { select: { name: true } },
};

const present = (c) => ({
  certificateId: c.certificateId,
  title: c.title,
  templateKey: c.templateKey,
  studentName: c.user.name,
  department: c.user.department,
  studentId: c.user.studentId,
  eventId: c.event.id,
  eventTitle: c.event.title,
  venue: c.event.venue,
  startsAt: c.event.startsAt,
  endsAt: c.event.endsAt,
  organizerName: c.event.organizer.name,
  signatoryName: c.signatoryName || c.issuedBy?.name || c.event.organizer.name,
  signatoryTitle: c.signatoryTitle || 'Event Organiser',
  issuedAt: c.issuedAt,
  revoked: Boolean(c.revokedAt),
});

const templates = (req, res) => res.json({ templates: TEMPLATES });

// POST /api/certificates/generate  (organiser of event / admin)
// Issues certificates to students marked PRESENT who do not have one yet.
const generate = asyncHandler(async (req, res) => {
  const data = generateCertificatesSchema.parse(req.body);
  const event = await loadManagedEvent(data.eventId, req.user);
  if (event.startsAt > new Date()) throw new HttpError(400, 'Certificates can be issued once the event has started');

  const where = {
    eventId: event.id,
    status: 'REGISTERED',
    attendance: { is: { status: 'PRESENT' } },
    certificate: { is: null },
  };
  if (data.registrationIds && data.registrationIds.length) where.id = { in: data.registrationIds };

  const regs = await prisma.registration.findMany({ where, select: { id: true, userId: true } });
  if (regs.length === 0) return res.json({ issued: 0, message: 'No attendees are waiting for a certificate.' });

  await prisma.$transaction(async (tx) => {
    // registrationId is unique, so a concurrent request cannot issue a second certificate.
    await tx.certificate.createMany({
      data: regs.map((r) => ({
        certificateId: newCertificateId(),
        eventId: event.id,
        userId: r.userId,
        registrationId: r.id,
        issuedById: req.user.id,
        templateKey: data.templateKey,
        title: data.title,
        signatoryName: data.signatoryName || null,
        signatoryTitle: data.signatoryTitle || null,
      })),
      skipDuplicates: true,
    });
    await notify(tx, regs.map((r) => r.userId), {
      title: 'Your certificate is ready',
      message: `Your certificate for "${event.title}" is available to view and download.`,
      link: '/student/certificates',
      type: 'CERTIFICATE',
    });
  });
  await audit(req, 'certificate.generate', 'Event', event.id, { count: regs.length });
  res.status(201).json({ issued: regs.length });
});

// GET /api/certificates/event/:eventId  (organiser of event / admin)
const forEvent = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const [certificates, eligible] = await Promise.all([
    prisma.certificate.findMany({ where: { eventId }, orderBy: { issuedAt: 'desc' }, include: certInclude }),
    prisma.registration.count({
      where: { eventId, status: 'REGISTERED', attendance: { is: { status: 'PRESENT' } }, certificate: { is: null } },
    }),
  ]);
  res.json({ event: { id: event.id, title: event.title, startsAt: event.startsAt }, certificates: certificates.map(present), pendingCount: eligible });
});

// GET /api/certificates/my  (students)
const mine = asyncHandler(async (req, res) => {
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id, revokedAt: null },
    orderBy: { issuedAt: 'desc' },
    include: certInclude,
  });
  res.json({ certificates: certificates.map(present) });
});

// GET /api/certificates  (admin) - every certificate, searchable
const listAll = asyncHandler(async (req, res) => {
  const paging = readPage(req.query, 20, 100);
  const where = {};
  if (req.query.q) {
    const q = String(req.query.q).slice(0, 100);
    where.OR = [
      { certificateId: { contains: q, mode: 'insensitive' } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { event: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.certificate.findMany({ where, orderBy: { issuedAt: 'desc' }, include: certInclude, skip: paging.skip, take: paging.take }),
    prisma.certificate.count({ where }),
  ]);
  res.json({ certificates: rows.map(present), pagination: pageInfo(paging, total) });
});

// GET /api/certificates/verify/:certificateId  (public)
const verify = asyncHandler(async (req, res) => {
  const id = String(req.params.certificateId || '').trim().toUpperCase();
  if (!/^UNI-[0-9A-F]{12}$/.test(id)) throw new HttpError(400, 'That is not a valid certificate id');
  const c = await prisma.certificate.findUnique({ where: { certificateId: id }, include: certInclude });
  if (!c) throw new HttpError(404, 'No certificate matches this id');
  res.json({
    valid: !c.revokedAt,
    revoked: Boolean(c.revokedAt),
    certificateId: c.certificateId,
    studentName: c.user.name,
    eventTitle: c.event.title,
    startsAt: c.event.startsAt,
    venue: c.event.venue,
    organizerName: c.event.organizer.name,
    issuedAt: c.issuedAt,
  });
});

// GET /api/certificates/:certificateId  - full data to render a certificate (owner, event organiser, admin)
const getOne = asyncHandler(async (req, res) => {
  const id = String(req.params.certificateId || '').trim().toUpperCase();
  const c = await prisma.certificate.findUnique({ where: { certificateId: id }, include: { ...certInclude, event: { include: { organizer: { select: { name: true } } } } } });
  if (!c || (c.userId !== req.user.id && !canManageEvent(req.user, c.event))) throw new HttpError(404, 'Certificate not found');
  res.json({ certificate: present(c) });
});

// PATCH /api/certificates/:certificateId/revoke  (organiser of event / admin)
const revoke = asyncHandler(async (req, res) => {
  const id = String(req.params.certificateId || '').trim().toUpperCase();
  const c = await prisma.certificate.findUnique({ where: { certificateId: id }, include: { event: true } });
  if (!c || !canManageEvent(req.user, c.event)) throw new HttpError(404, 'Certificate not found');
  await prisma.certificate.update({ where: { id: c.id }, data: { revokedAt: c.revokedAt ? null : new Date() } });
  await audit(req, c.revokedAt ? 'certificate.restore' : 'certificate.revoke', 'Certificate', id);
  res.json({ revoked: !c.revokedAt });
});

module.exports = { templates, generate, forEvent, mine, listAll, verify, getOne, revoke };
