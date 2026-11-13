const bcrypt = require('bcryptjs');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { getSettings, saveSettings } = require('../utils/settings');
const { readPage, pageInfo } = require('../utils/pagination');
const { toCsv } = require('../utils/csv');
const { countInclude, shape } = require('./eventController');
const analytics = require('./analyticsController');
const {
  parseId,
  roleSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminResetPasswordSchema,
  organizerDecisionSchema,
  settingsSchema,
  broadcastSchema,
} = require('../utils/validators');

const listSelect = {
  id: true, name: true, email: true, role: true, department: true, phone: true, studentId: true, year: true,
  college: true, isActive: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
  organizerProfile: { select: { status: true, organization: true } },
};

// GET /api/admin/stats
const stats = asyncHandler(async (req, res) => {
  const [users, students, organizers, admins, events, published, pendingEvents, registrations, present, announcements, pendingOrganizers, certificates, unreadMessages, subscribers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'ORGANIZER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.event.count(),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.event.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.registration.count({ where: { status: 'REGISTERED' } }),
      prisma.attendance.count({ where: { status: 'PRESENT' } }),
      prisma.announcement.count({ where: { status: 'PUBLISHED' } }),
      prisma.organizerProfile.count({ where: { status: 'PENDING' } }),
      prisma.certificate.count({ where: { revokedAt: null } }),
      prisma.contactMessage.count({ where: { readAt: null } }),
      prisma.newsletterSubscriber.count(),
    ]);

  res.json({
    stats: { users, students, organizers, admins, events, published, pendingEvents, registrations, present, announcements, pendingOrganizers, certificates, unreadMessages, subscribers },
  });
});

// ------------------------------------------------------------------ users
const userWhere = (query, forcedRole) => {
  const { q, role, status } = query;
  const where = {};
  const r = forcedRole || (role && ['STUDENT', 'ORGANIZER', 'ADMIN'].includes(String(role)) ? String(role) : null);
  if (r) where.role = r;
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (q) {
    const term = String(q).slice(0, 100);
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { studentId: { contains: term, mode: 'insensitive' } },
      { department: { contains: term, mode: 'insensitive' } },
    ];
  }
  return where;
};

// GET /api/admin/users?q=&role=&status=&page=&limit=
const listUsers = asyncHandler(async (req, res) => {
  const paging = readPage(req.query, 20, 100);
  const where = userWhere(req.query);
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, select: listSelect, skip: paging.skip, take: paging.take }),
    prisma.user.count({ where }),
  ]);
  res.json({ users, pagination: pageInfo(paging, total) });
});

// GET /api/admin/students and /api/admin/organizers - the same list, locked to one role
const listByRole = (role) =>
  asyncHandler(async (req, res) => {
    const paging = readPage(req.query, 20, 100);
    const where = userWhere(req.query, role);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: paging.skip, take: paging.take,
        select: { ...listSelect, _count: { select: { registrations: true, events: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, pagination: pageInfo(paging, total) });
  });

// POST /api/admin/users - create an account of any role (used for organisers and admins)
const createUser = asyncHandler(async (req, res) => {
  const data = adminCreateUserSchema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role, department: data.department, phone: data.phone },
    select: listSelect,
  });
  await audit(req, 'user.create', 'User', user.id, { email: user.email, role: user.role });
  res.status(201).json({ user });
});

// PATCH /api/admin/users/:id - edit details or (de)activate an account
const updateUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = adminUpdateUserSchema.parse(req.body);
  if (id === req.user.id && data.isActive === false) throw new HttpError(400, 'You cannot deactivate your own account');
  const user = await prisma.user.update({ where: { id }, data, select: listSelect });
  await audit(req, data.isActive === undefined ? 'user.update' : data.isActive ? 'user.activate' : 'user.deactivate', 'User', id, { email: user.email });
  res.json({ user });
});

// POST /api/admin/users/:id/reset-password - for people who cannot receive reset emails
const resetUserPassword = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { password } = adminResetPasswordSchema.parse(req.body);
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  await notify(prisma, [id], { title: 'Password changed', message: 'An administrator set a new password for your account.', type: 'SECURITY' });
  await audit(req, 'user.reset_password', 'User', id);
  res.json({ message: 'Password updated' });
});

// PATCH /api/admin/users/:id/role
const updateUserRole = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { role } = roleSchema.parse(req.body);
  if (id === req.user.id) throw new HttpError(400, 'You cannot change your own role');

  const user = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, name: true, email: true, role: true } });
  await notify(prisma, [id], {
    title: 'Your role changed',
    message: `An administrator changed your account role to ${role}. Sign in through the matching login page.`,
    type: 'SECURITY',
  });
  await audit(req, 'user.role', 'User', id, { role });
  res.json({ user });
});

// DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === req.user.id) throw new HttpError(400, 'You cannot delete your own account');

  const owned = await prisma.event.count({ where: { organizerId: id } });
  if (owned > 0) throw new HttpError(409, 'This user still owns events. Delete or reassign them first.');

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  await prisma.user.delete({ where: { id } });
  await audit(req, 'user.delete', 'User', id, { email: target?.email });
  res.json({ message: 'User deleted' });
});

// ------------------------------------------------------------------ organiser requests
// GET /api/admin/organizer-requests?status=PENDING
const listOrganizerRequests = asyncHandler(async (req, res) => {
  const where = {};
  if (['PENDING', 'APPROVED', 'REJECTED'].includes(String(req.query.status))) where.status = String(req.query.status);
  const requests = await prisma.organizerProfile.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { user: { select: { id: true, name: true, email: true, department: true, role: true } } },
  });
  res.json({ requests });
});

// PATCH /api/admin/organizer-requests/:id  { action: APPROVE | REJECT, note }
const decideOrganizerRequest = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { action, note } = organizerDecisionSchema.parse(req.body);
  const request = await prisma.organizerProfile.findUnique({ where: { id }, include: { user: true } });
  if (!request) throw new HttpError(404, 'Request not found');
  if (request.status !== 'PENDING') throw new HttpError(409, 'This request was already decided');

  await prisma.$transaction(async (tx) => {
    await tx.organizerProfile.update({
      where: { id },
      data: { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewNote: note || null, reviewedById: req.user.id, reviewedAt: new Date() },
    });
    if (action === 'APPROVE' && request.user.role === 'STUDENT') {
      await tx.user.update({ where: { id: request.userId }, data: { role: 'ORGANIZER' } });
    }
    await notify(tx, [request.userId], {
      title: action === 'APPROVE' ? 'Organiser access approved' : 'Organiser request declined',
      message:
        action === 'APPROVE'
          ? 'You can now create events. Sign in through the organiser login page.'
          : `Your organiser request was declined.${note ? ` Note: ${note}` : ''}`,
      type: 'APPROVAL',
    });
  });
  await audit(req, `organizer.${action.toLowerCase()}`, 'User', request.userId, { note });
  res.json({ ok: true });
});

// ------------------------------------------------------------------ events
// GET /api/admin/events?status=&q=&page=
const listEvents = asyncHandler(async (req, res) => {
  const paging = readPage(req.query, 20, 100);
  const where = {};
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.q) {
    const term = String(req.query.q).slice(0, 100);
    where.OR = [{ title: { contains: term, mode: 'insensitive' } }, { venue: { contains: term, mode: 'insensitive' } }];
  }
  const [events, total] = await Promise.all([
    prisma.event.findMany({ where, orderBy: { createdAt: 'desc' }, include: countInclude, skip: paging.skip, take: paging.take }),
    prisma.event.count({ where }),
  ]);
  res.json({ events: events.map(shape), pagination: pageInfo(paging, total) });
});

// ------------------------------------------------------------------ audit, settings, messages, broadcasts
// GET /api/admin/audit-logs?action=&q=&page=
const auditLogs = asyncHandler(async (req, res) => {
  const paging = readPage(req.query, 30, 100);
  const where = {};
  if (req.query.action) where.action = { startsWith: String(req.query.action).slice(0, 40) };
  if (req.query.q) where.OR = [{ action: { contains: String(req.query.q).slice(0, 60), mode: 'insensitive' } }, { actor: { name: { contains: String(req.query.q).slice(0, 60), mode: 'insensitive' } } }];
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: paging.skip, take: paging.take, include: { actor: { select: { name: true, email: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ logs, pagination: pageInfo(paging, total) });
});

const getPlatformSettings = asyncHandler(async (req, res) => res.json({ settings: await getSettings() }));

const updatePlatformSettings = asyncHandler(async (req, res) => {
  const patch = settingsSchema.parse(req.body);
  const settings = await saveSettings(patch);
  await audit(req, 'settings.update', 'PlatformSetting', 'platform', patch);
  res.json({ settings });
});

const listMessages = asyncHandler(async (req, res) => {
  const paging = readPage(req.query, 20, 100);
  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, skip: paging.skip, take: paging.take }),
    prisma.contactMessage.count(),
  ]);
  res.json({ messages, pagination: pageInfo(paging, total) });
});

const readMessage = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await prisma.contactMessage.update({ where: { id }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

// POST /api/admin/notifications - broadcast an in-app notification to a group of users
const broadcast = asyncHandler(async (req, res) => {
  const { title, message, audience, link } = broadcastSchema.parse(req.body);
  const where = { isActive: true };
  if (audience === 'STUDENTS') where.role = 'STUDENT';
  if (audience === 'ORGANIZERS') where.role = 'ORGANIZER';
  if (audience === 'ADMINS') where.role = 'ADMIN';

  const users = await prisma.user.findMany({ where, select: { id: true } });
  for (let i = 0; i < users.length; i += 1000) {
    // eslint-disable-next-line no-await-in-loop
    await notify(prisma, users.slice(i, i + 1000).map((u) => u.id), { title, message, link, type: 'SYSTEM' });
  }
  await audit(req, 'notification.broadcast', 'Notification', null, { title, audience, recipients: users.length });
  res.status(201).json({ recipients: users.length });
});

// ------------------------------------------------------------------ CSV reports
const sendCsv = (res, name, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.send(csv);
};

// GET /api/admin/reports/:type  (events | registrations | users)
const report = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (type === 'events') {
    const rows = await prisma.event.findMany({ orderBy: { startsAt: 'desc' }, include: { organizer: { select: { name: true } }, _count: { select: { registrations: { where: { status: 'REGISTERED' } } } } } });
    return sendCsv(res, 'events', toCsv(
      ['Title', 'Category', 'Status', 'Mode', 'Starts', 'Ends', 'Venue', 'Capacity', 'Registered', 'Fee', 'Organiser'],
      rows.map((e) => [e.title, e.category, e.status, e.mode, e.startsAt.toISOString(), e.endsAt.toISOString(), e.venue, e.capacity, e._count.registrations, e.fee, e.organizer.name])
    ));
  }
  if (type === 'registrations') {
    const rows = await prisma.registration.findMany({ orderBy: { createdAt: 'desc' }, take: 50000, include: { user: { select: { name: true, email: true, department: true } }, event: { select: { title: true } }, attendance: { select: { status: true } } } });
    return sendCsv(res, 'registrations', toCsv(
      ['Event', 'Student', 'Email', 'Department', 'Status', 'Registered at', 'Attendance'],
      rows.map((r) => [r.event.title, r.user.name, r.user.email, r.user.department, r.status, r.createdAt.toISOString(), r.attendance ? r.attendance.status : 'NOT MARKED'])
    ));
  }
  if (type === 'users') {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: listSelect });
    return sendCsv(res, 'users', toCsv(
      ['Name', 'Email', 'Role', 'Department', 'Student ID', 'Active', 'Joined'],
      rows.map((u) => [u.name, u.email, u.role, u.department, u.studentId, u.isActive ? 'yes' : 'no', u.createdAt.toISOString()])
    ));
  }
  throw new HttpError(404, 'Unknown report');
});

module.exports = {
  stats,
  analytics: analytics.admin,
  listUsers,
  listStudents: listByRole('STUDENT'),
  listOrganizers: listByRole('ORGANIZER'),
  createUser,
  updateUser,
  resetUserPassword,
  updateUserRole,
  deleteUser,
  listOrganizerRequests,
  decideOrganizerRequest,
  listEvents,
  auditLogs,
  getPlatformSettings,
  updatePlatformSettings,
  listMessages,
  readMessage,
  broadcast,
  report,
};
