const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent, canManageEvent } = require('../utils/access');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { emailUsers } = require('../utils/emailUsers');
const { readPage, pageInfo } = require('../utils/pagination');
const { parseId, generateCertificatesSchema } = require('../utils/validators');
const { certificatePdf } = require('../utils/pdf');
const { appUrl } = require('../utils/mailer');

const updateSchema = z.object({ name: z.string().max(100).optional(), remarks: z.string().max(300).optional() });

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

// A name typed by hand: control characters removed, spaces collapsed.
const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const cleanRemark = (s) => String(s || '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

const present = (c) => ({
  certificateId: c.certificateId,
  title: c.title,
  templateKey: c.templateKey,
  studentName: c.recipientName || c.user.name,
  accountName: c.user.name,
  nameCustomised: Boolean(c.recipientName),
  remarks: c.remarks || null,
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

  const where = {
    eventId: event.id,
    status: 'REGISTERED',
    ...(data.includeRegistered ? {} : { attendance: { is: { status: 'PRESENT' } } }),
    certificate: { is: null },
  };
  if (data.registrationIds && data.registrationIds.length) where.id = { in: data.registrationIds };

  const regs = await prisma.registration.findMany({ where, select: { id: true, userId: true } });
  const custom = new Map((data.recipients || []).map((r) => [r.registrationId, r]));
  const defaultRemark = cleanRemark(data.remarks) || null;
  const nameFor = (id) => { const n = cleanName(custom.get(id)?.name); if (n && n.length < 2) throw new HttpError(400, 'A name on a certificate needs at least 2 characters'); return n || null; };
  const remarkFor = (id) => cleanRemark(custom.get(id)?.remarks) || defaultRemark;
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
        recipientName: nameFor(r.id),
        remarks: remarkFor(r.id),
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
  emailUsers(regs.map((r) => r.userId), { subject: 'Your certificate is ready', text: `Your certificate for "${event.title}" is ready to view and download.`, link: '/student/certificates' });
  await audit(req, 'certificate.generate', 'Event', event.id, { count: regs.length });
  res.status(201).json({ issued: regs.length });
});

// GET /api/certificates/event/:eventId/eligible?includeRegistered=1  (organiser of event / admin)
// The students who would receive a certificate now, so names and remarks can be written for each one.
const eligible = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  await loadManagedEvent(eventId, req.user);
  const all = req.query.includeRegistered === '1' || req.query.includeRegistered === 'true';
  const regs = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED', certificate: { is: null }, ...(all ? {} : { attendance: { is: { status: 'PRESENT' } } }) },
    orderBy: { user: { name: 'asc' } }, take: 2000,
    select: { id: true, user: { select: { name: true, studentId: true, department: true } }, attendance: { select: { status: true } } },
  });
  res.json({ students: regs.map((r) => ({ registrationId: r.id, name: r.user.name, studentId: r.user.studentId, department: r.user.department, present: r.attendance?.status === 'PRESENT' })) });
});

// PATCH /api/certificates/:certificateId  { name?, remarks? }  (organiser of event / admin)
// Changes what is printed on an issued certificate. An empty value goes back to the account name / no remark.
const update = asyncHandler(async (req, res) => {
  const id = String(req.params.certificateId || '').trim().toUpperCase();
  const body = updateSchema.parse(req.body);
  const c = await prisma.certificate.findUnique({ where: { certificateId: id }, include: { event: true } });
  if (!c || !canManageEvent(req.user, c.event)) throw new HttpError(404, 'Certificate not found');
  const data = {};
  if (body.name !== undefined) {
    const n = cleanName(body.name);
    if (n && n.length < 2) throw new HttpError(400, 'A name on a certificate needs at least 2 characters');
    data.recipientName = n || null;
  }
  if (body.remarks !== undefined) data.remarks = cleanRemark(body.remarks) || null;
  if (Object.keys(data).length === 0) throw new HttpError(400, 'Nothing to change');
  await prisma.certificate.update({ where: { id: c.id }, data });
  await audit(req, 'certificate.update', 'Certificate', id, { name: 'recipientName' in data, remarks: 'remarks' in data });
  res.json({ ok: true });
});

// GET /api/certificates/event/:eventId  (organiser of event / admin)
const forEvent = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const [certificates, eligible, registeredPending] = await Promise.all([
    prisma.certificate.findMany({ where: { eventId }, orderBy: { issuedAt: 'desc' }, include: certInclude }),
    prisma.registration.count({
      where: { eventId, status: 'REGISTERED', attendance: { is: { status: 'PRESENT' } }, certificate: { is: null } },
    }),
    prisma.registration.count({ where: { eventId, status: 'REGISTERED', certificate: { is: null } } }),
  ]);
  res.json({ event: { id: event.id, title: event.title, startsAt: event.startsAt }, certificates: certificates.map(present), pendingCount: eligible, registeredPendingCount: registeredPending });
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
    studentName: c.recipientName || c.user.name,
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

// GET /api/certificates/:certificateId/pdf - a real PDF file (same access rules as getOne)
const pdf = asyncHandler(async (req, res) => {
  const id = String(req.params.certificateId || '').trim().toUpperCase();
  const c = await prisma.certificate.findUnique({ where: { certificateId: id }, include: { ...certInclude, event: { include: { organizer: { select: { name: true } } } } } });
  if (!c || (c.userId !== req.user.id && !canManageEvent(req.user, c.event))) throw new HttpError(404, 'Certificate not found');
  if (c.revokedAt) throw new HttpError(410, 'This certificate has been revoked');

  const d = present(c);
  const day = (x) => new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const file = certificatePdf({
    ...d,
    dateText: day(d.startsAt),
    issuedText: day(d.issuedAt),
    verifyUrl: `${appUrl()}/verify/${d.certificateId}`,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${d.certificateId}.pdf"`);
  res.send(file);
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

module.exports = { templates, generate, forEvent, eligible, update, mine, listAll, verify, getOne, pdf, revoke };
