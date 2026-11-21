const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const m = require('../utils/reportMath');
const sm = require('../utils/studentReportMath');
const rewards = require('./rewardsController');
const { empty: emptyStats, pointsOf, badgesOf, levelOf } = require('../utils/rewards');

const seals = require('../utils/reportSeal');
const ins = require('../utils/reportInsights');

const MAX_EVENTS = 1000;

const eventSelect = {
  id: true, title: true, category: true, eventType: true, mode: true, venue: true, bannerUrl: true, startsAt: true, endsAt: true,
  capacity: true, fee: true, organizerId: true, registrationDeadline: true, organizer: { select: { name: true } },
};

// Loads everything the summary needs for the events that start inside [from, to).
async function loadPeriod(period, scope) {
  const { from, to } = m.periodRange(period);
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', startsAt: { gte: from, lt: to }, ...scope }, orderBy: { startsAt: 'asc' }, take: MAX_EVENTS + 1, select: eventSelect,
  });
  const truncated = events.length > MAX_EVENTS;
  const list = events.slice(0, MAX_EVENTS).map((e) => ({ ...e, organizerName: e.organizer?.name }));
  const ids = list.map((e) => e.id);
  const inIds = { in: ids };
  const [regs, feedback, payments, certificates] = ids.length ? await Promise.all([
    prisma.registration.findMany({ where: { eventId: inIds }, select: { eventId: true, userId: true, status: true, createdAt: true, user: { select: { department: true, name: true, studentId: true } }, attendance: { select: { status: true } } } }),
    prisma.feedback.findMany({ where: { eventId: inIds }, select: { eventId: true, rating: true, comment: true } }),
    prisma.payment.findMany({ where: { eventId: inIds, status: { in: ['PAID', 'REFUNDED'] } }, select: { eventId: true, amount: true, status: true } }),
    prisma.certificate.findMany({ where: { eventId: inIds, revokedAt: null }, select: { eventId: true } }),
  ]) : [[], [], [], []];
  return {
    events: list, truncated, feedback, payments, certificates,
    regs: regs.map((r) => ({ eventId: r.eventId, userId: r.userId, status: r.status, department: r.user?.department, name: r.user?.name, studentId: r.user?.studentId, createdAt: r.createdAt, attended: r.attendance?.status === 'PRESENT' })),
  };
}

const dayStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');
// A custom range needs both dates, in order, and may not be longer than 5 years.
const checkRange = (q, ctx) => {
  if (q.type !== 'range') return;
  if (!q.from || !q.to) return ctx.addIssue({ code: 'custom', message: 'Choose both a from and a to date' });
  const days = (Date.parse(q.to) - Date.parse(q.from)) / 86400000;
  if (days < 0) ctx.addIssue({ code: 'custom', message: 'The from date must not be after the to date' });
  if (days > 366 * 5) ctx.addIssue({ code: 'custom', message: 'A range can be at most 5 years' });
};
const periodOf = (q, nowLocal) => (q.type === 'range' ? { type: 'range', fromDate: q.from, toDate: q.to } : { type: q.type, year: q.year ?? nowLocal.getUTCFullYear(), month: q.month ?? nowLocal.getUTCMonth() + 1 });

const query = z.object({
  type: z.enum(['month', 'year', 'range']).default('month'),
  from: dayStr.optional(), to: dayStr.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  organizerId: z.coerce.number().int().positive().optional(),
  details: z.enum(['0', '1']).optional(),
}).superRefine(checkRange);
const DETAIL_LIMIT = 60;

const sealFigures = (k) => [['Events', k.events], ['Confirmed registrations', k.registrations], ['Attended', k.attended], ['Attendance rate', k.attendanceRate === null ? '-' : `${k.attendanceRate}%`]];

// GET /api/reports/summary?type=month|year&year=2026&month=11[&organizerId=3 (admin only)]
// Admin: the whole platform (or one organiser). Organiser: only their own events, whatever is asked.
const summary = asyncHandler(async (req, res) => {
  const q = query.parse(req.query);
  const nowLocal = m.local(new Date(), m.tzOffset());
  const period = periodOf(q, nowLocal);
  const isAdmin = req.user.role === 'ADMIN';
  const scope = isAdmin ? (q.organizerId ? { organizerId: q.organizerId } : {}) : { organizerId: req.user.id };

  const data = await loadPeriod(period, scope);
  const out = m.summarize({ ...data, period, withOrganisers: isAdmin && !q.organizerId });
  // Optional appendix: the written description of each event (the first 60, to keep the document a sensible length).
  if (q.details === '1' && out.events.length) {
    const shown = out.events.slice(0, DETAIL_LIMIT);
    const rows = await prisma.event.findMany({ where: { id: { in: shown.map((e) => e.id) } }, select: { id: true, description: true, eligibility: true, requirements: true, department: true, contactEmail: true } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    shown.forEach((e) => { const r = byId.get(e.id); if (r) e.detail = { description: r.description, eligibility: r.eligibility, requirements: r.requirements, department: r.department, contactEmail: r.contactEmail }; });
  }
  const prevPeriod = m.previousPeriod(period);
  const prev = m.summarize({ ...(await loadPeriod(prevPeriod, scope)), period: prevPeriod });
  const { from, to } = m.periodRange(period);

  const pipeline = await prisma.event.groupBy({ by: ['status'], where: { startsAt: { gte: from, lt: to }, ...scope }, _count: { _all: true } });
  const result = {
    meta: {
      scope: isAdmin ? (q.organizerId ? 'organiser' : 'platform') : 'organiser',
      period: { ...period, label: m.periodLabel(period), from, to }, previousLabel: m.periodLabel(prevPeriod),
      generatedAt: new Date(), generatedBy: { name: req.user.name, role: req.user.role }, timezone: `UTC${m.tzOffset() >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(m.tzOffset()) / 60)).padStart(2, '0')}:${String(Math.abs(m.tzOffset()) % 60).padStart(2, '0')}`,
      truncated: data.truncated, detailLimit: q.details === '1' ? DETAIL_LIMIT : 0,
    },
    ...out,
    previous: m.compare(out.kpis, prev.kpis),
    pipeline: Object.fromEntries(pipeline.map((p) => [p.status, p._count._all])),
    gallery: await galleryFor({ status: 'PUBLISHED', startsAt: { gte: from, lt: to }, ...scope }),
  };

  result.insights = ins.insights({ rows: out.events, regs: data.regs, feedback: data.feedback, events: data.events });
  if (!isAdmin) delete result.insights.money;
  const photoCounts = out.events.length ? await prisma.eventAsset.groupBy({ by: ['eventId'], where: { kind: 'PHOTO', approved: true, eventId: { in: out.events.map((e) => e.id) } }, _count: { _all: true } }) : [];
  const photosBy = new Map(photoCounts.map((p) => [p.eventId, p._count._all]));
  out.events.forEach((e) => { e.photos = photosBy.get(e.id) || 0; });

  if (isAdmin) {
    const dormantBefore = new Date(Date.now() - 90 * 86400000);
    const [reviewed, pendingNow, dormant, neverIn] = await Promise.all([
      prisma.event.findMany({ where: { reviewedAt: { gte: from, lt: to }, ...scope }, select: { createdAt: true, reviewedAt: true }, take: 2000 }),
      prisma.event.count({ where: { status: 'PENDING_APPROVAL', ...scope } }),
      q.organizerId ? 0 : prisma.user.count({ where: { role: 'STUDENT', isActive: true, lastLoginAt: { lt: dormantBefore } } }),
      q.organizerId ? 0 : prisma.user.count({ where: { role: 'STUDENT', isActive: true, lastLoginAt: null } }),
    ]);
    result.insights.approvals = { ...ins.turnaround(reviewed), pendingNow };
    if (!q.organizerId) result.insights.dormant = { inactive90Days: dormant, neverSignedIn: neverIn };
  }

  const subject = isAdmin && !q.organizerId ? 'UniEvents platform' : (isAdmin ? null : req.user.name);
  if (isAdmin && q.organizerId) { const t = await prisma.user.findUnique({ where: { id: q.organizerId }, select: { name: true } }); result.seal = await seals.issue({ kind: 'ORGANISER', userId: q.organizerId, subject: t?.name || 'Organiser', periodLabel: m.periodLabel(period), periodKey: m.periodLabel(period), figures: sealFigures(out.kpis) }); }
  else result.seal = await seals.issue({ kind: isAdmin ? 'PLATFORM' : 'ORGANISER', userId: isAdmin ? null : req.user.id, subject, periodLabel: m.periodLabel(period), periodKey: m.periodLabel(period), figures: sealFigures(out.kpis) });

  if (isAdmin) {
    const [created, totals, organisers, target] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ['role'], where: { isActive: true }, _count: { _all: true } }),
      prisma.user.findMany({ where: { role: 'ORGANIZER' }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 300 }),
      q.organizerId ? prisma.user.findUnique({ where: { id: q.organizerId }, select: { name: true } }) : null,
    ]);
    const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.role, r._count._all]));
    result.platform = { newUsers: toMap(created), activeUsers: toMap(totals) };
    result.organiserOptions = organisers;
    if (target) result.meta.organiserName = target.name;
  } else {
    result.meta.organiserName = req.user.name;
  }
  res.json(result);
});

// Approved photos of the events in view, for the picture page of a report.
async function galleryFor(eventWhere, extra = {}) {
  const rows = await prisma.eventAsset.findMany({
    where: { kind: 'PHOTO', approved: true, event: eventWhere, ...extra }, orderBy: { id: 'desc' }, take: 200,
    select: { url: true, uploaderRole: true, event: { select: { id: true, title: true } } },
  });
  const label = (role) => (role === 'STUDENT' ? 'Student' : role === 'ADMIN' ? 'Admin' : 'Organiser');
  const perEvent = new Map();
  const items = [];
  rows.forEach((p) => { const n = perEvent.get(p.event.id) || 0; if (n < 3 && items.length < 12) { perEvent.set(p.event.id, n + 1); items.push({ url: p.url, event: p.event.title, by: label(p.uploaderRole) }); } });
  return { total: rows.length, byStudents: rows.filter((p) => p.uploaderRole === 'STUDENT').length, items };
}

// GET /api/reports/verify/:code - public. Says whether a report ID was issued by this site and what it covered.
const verify = asyncHandler(async (req, res) => {
  const found = await seals.check(req.params.code);
  if (!found) return res.json({ valid: false });
  res.json({ valid: true, ...found, userId: undefined });
});

// How this event compares with the same organiser's earlier events, who came back, when people registered, what feedback says.
async function eventExtras(event, confirmed, present, feedback) {
  const others = await prisma.event.findMany({
    where: { organizerId: event.organizerId, status: 'PUBLISHED', id: { not: event.id }, startsAt: { lt: event.startsAt } }, orderBy: { startsAt: 'desc' }, take: 50, select: eventSelect,
  });
  const ids = others.map((e) => e.id);
  const [oRegs, oFb] = ids.length ? await Promise.all([
    prisma.registration.findMany({ where: { eventId: { in: ids } }, select: { eventId: true, userId: true, status: true, attendance: { select: { status: true } } } }),
    prisma.feedback.findMany({ where: { eventId: { in: ids } }, select: { eventId: true, rating: true } }),
  ]) : [[], []];
  const past = m.summarize({
    events: others.map((e) => ({ ...e, organizerName: e.organizer?.name })), period: { type: 'year', year: new Date().getUTCFullYear() }, feedback: oFb,
    regs: oRegs.map((r) => ({ eventId: r.eventId, userId: r.userId, status: r.status, attended: r.attendance?.status === 'PRESENT' })),
  });
  const ended = past.events.filter((e) => e.ended);
  const avg = {
    registrations: m.mean(past.events.map((e) => e.registered)),
    fillRate: m.mean(past.events.map((e) => e.fillRate).filter((v) => v !== null)),
    attendanceRate: m.mean(ended.map((e) => e.attendanceRate).filter((v) => v !== null)),
    rating: m.mean(past.events.filter((e) => e.ratingCount > 0).map((e) => e.rating)),
  };
  const priorAttendees = new Set(oRegs.filter((r) => r.attendance?.status === 'PRESENT').map((r) => r.userId));
  const comments = feedback.filter((f) => f.comment && f.comment.trim()).map((f) => f.comment);
  return {
    compare: { pastEvents: others.length, average: others.length ? avg : null },
    returning: { attended: present.length, returning: present.filter((r) => priorAttendees.has(r.userId)).length, newcomers: present.filter((r) => !priorAttendees.has(r.userId)).length, hasHistory: others.length > 0 },
    timing: ins.timing([event], confirmed.map((r) => ({ eventId: event.id, status: r.status, createdAt: r.createdAt }))),
    themes: ins.themes(comments),
  };
}

// GET /api/reports/event/:id - everything about one event. Admin: any event. Organiser: their own only.
const eventReport = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'event id');
  await loadManagedEvent(id, req.user);
  const off = m.tzOffset();
  const [event, regs, feedback, payments, certCount, teams, assets] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { organizer: { select: { name: true, department: true } } } }),
    prisma.registration.findMany({
      where: { eventId: id }, orderBy: { createdAt: 'asc' },
      select: { status: true, createdAt: true, userId: true, user: { select: { name: true, studentId: true, department: true } }, attendance: { select: { status: true, checkedInAt: true } } },
    }),
    prisma.feedback.findMany({ where: { eventId: id }, orderBy: { createdAt: 'desc' }, select: { rating: true, comment: true, createdAt: true } }),
    prisma.payment.findMany({ where: { eventId: id }, select: { amount: true, status: true } }),
    prisma.certificate.count({ where: { eventId: id, revokedAt: null } }),
    prisma.eventTeam.findMany({ where: { eventId: id }, select: { _count: { select: { members: true } } } }),
    prisma.eventAsset.findMany({ where: { eventId: id }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { kind: true, url: true, title: true, approved: true, uploaderRole: true } }),
  ]);

  const byStatus = {};
  regs.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  const confirmed = regs.filter((r) => r.status === 'REGISTERED');
  const present = confirmed.filter((r) => r.attendance?.status === 'PRESENT');
  const absent = confirmed.filter((r) => r.attendance?.status === 'ABSENT');
  const ended = event.endsAt <= new Date();
  const extras = await eventExtras(event, confirmed, present, feedback);

  const dayLabel = (d) => { const l = m.local(d, off); return `${l.getUTCDate()} ${m.MONTHS[l.getUTCMonth()]}`; };
  const dayCounts = new Map();
  regs.forEach((r) => { const k = m.local(r.createdAt, off).toISOString().slice(0, 10); dayCounts.set(k, { label: dayLabel(r.createdAt), count: (dayCounts.get(k)?.count || 0) + 1 }); });
  const registrationTrend = [...dayCounts.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v).slice(-45);

  const hourCounts = new Map();
  present.forEach((r) => { if (r.attendance.checkedInAt) { const h = m.local(r.attendance.checkedInAt, off).getUTCHours(); hourCounts.set(h, (hourCounts.get(h) || 0) + 1); } });
  const checkInByHour = [...hourCounts.entries()].sort(([a], [b]) => a - b).map(([h, count]) => ({ label: `${String(h).padStart(2, '0')}:00`, count }));

  const dept = new Map();
  confirmed.forEach((r) => { const d = r.user.department || 'Not specified'; dept.set(d, (dept.get(d) || 0) + 1); });

  const ratings = feedback.map((f) => f.rating);
  const paid = payments.filter((p) => p.status === 'PAID');
  const sumRupees = (list) => Math.round(list.reduce((a, p) => a + p.amount, 0)) / 100;

  res.json({
    meta: { generatedAt: new Date(), generatedBy: { name: req.user.name, role: req.user.role }, ended },
    event: {
      id: event.id, title: event.title, description: event.description, category: event.category, eventType: event.eventType, mode: event.mode,
      venue: event.venue, onlineUrl: event.mode === 'OFFLINE' ? null : event.onlineUrl, bannerUrl: event.bannerUrl, startsAt: event.startsAt, endsAt: event.endsAt,
      registrationDeadline: event.registrationDeadline, capacity: event.capacity, fee: event.fee, status: event.status, department: event.department,
      eligibility: event.eligibility, requirements: event.requirements, agenda: event.agenda, speakers: event.speakers, faqs: event.faqs,
      contactEmail: event.contactEmail, contactPhone: event.contactPhone, terms: event.terms, teamMin: event.teamMin, teamMax: event.teamMax,
      requiresRegistrationApproval: event.requiresRegistrationApproval, organizer: event.organizer.name,
    },
    numbers: {
      confirmed: confirmed.length, byStatus, capacity: event.capacity,
      fillRate: m.pct(confirmed.length, event.capacity),
      present: present.length, absent: absent.length, notMarked: confirmed.length - present.length - absent.length,
      attendanceRate: ended ? m.pct(present.length, confirmed.length) : null,
      certificates: certCount, pendingCertificates: ended ? Math.max(0, present.length - certCount) : null,
      teams: event.teamMax > 1 ? { count: teams.length, avgSize: m.mean(teams.map((t) => t._count.members)) } : null,
    },
    payments: { paidCount: paid.length, revenue: sumRupees(paid), refunded: sumRupees(payments.filter((p) => p.status === 'REFUNDED')), pending: payments.filter((p) => p.status === 'CREATED').length },
    feedback: {
      count: ratings.length, average: m.mean(ratings),
      distribution: [5, 4, 3, 2, 1].map((n) => ({ label: `${n} star${n === 1 ? '' : 's'}`, count: ratings.filter((r) => r === n).length })),
      comments: feedback.filter((f) => f.comment && f.comment.trim()).slice(0, 10).map((f) => ({ rating: f.rating, comment: f.comment.trim().slice(0, 400) })),
    },
    departments: [...dept.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    registrationTrend, checkInByHour,
    photos: assets.filter((a) => a.kind === 'PHOTO' && a.approved).slice(0, 12).map((a) => ({ url: a.url, title: a.title, by: a.uploaderRole === 'STUDENT' ? 'Student' : a.uploaderRole === 'ADMIN' ? 'Admin' : 'Organiser' })),
    photoCounts: { approved: assets.filter((a) => a.kind === 'PHOTO' && a.approved).length, pending: assets.filter((a) => a.kind === 'PHOTO' && !a.approved).length },
    sponsors: assets.filter((a) => a.kind === 'SPONSOR').map((a) => ({ url: a.url, title: a.title })),
    attendees: confirmed.slice(0, 500).map((r) => ({ name: r.user.name, studentId: r.user.studentId, department: r.user.department, attended: r.attendance?.status === 'PRESENT' ? 'Present' : r.attendance?.status === 'ABSENT' ? 'Absent' : (ended ? 'Not marked' : '') })),
    attendeesTotal: confirmed.length,
    ...extras,
    seal: await seals.issue({ kind: 'EVENT', userId: event.id, subject: event.title, periodLabel: m.local(event.startsAt, m.tzOffset()).toISOString().slice(0, 10), periodKey: String(event.id), figures: [['Confirmed', confirmed.length], ['Attended', present.length], ['Rating', m.mean(feedback.map((f) => f.rating)) ?? '-'], ['Certificates', certCount]] }),
  });
});

// ---------------------------------------------------------------- student

const studentQuery = z.object({
  type: z.enum(['month', 'year', 'all', 'range']).default('year'),
  from: dayStr.optional(), to: dayStr.optional(),
  form: z.enum(['report', 'transcript']).default('report'),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
}).superRefine(checkRange);

async function loadStudentPeriod(userId, period) {
  const range = period.type === 'all' ? {} : (({ from, to }) => ({ startsAt: { gte: from, lt: to } }))(m.periodRange(period));
  const regs = await prisma.registration.findMany({
    where: { userId, event: { status: 'PUBLISHED', ...range } }, orderBy: { createdAt: 'desc' }, take: 1000,
    select: {
      status: true, attendance: { select: { status: true } }, certificate: { select: { certificateId: true, revokedAt: true } },
      event: { select: { id: true, title: true, category: true, mode: true, venue: true, bannerUrl: true, startsAt: true, endsAt: true, fee: true } },
    },
  });
  const ids = regs.map((r) => r.event.id);
  const [feedback, payments] = ids.length ? await Promise.all([
    prisma.feedback.findMany({ where: { userId, eventId: { in: ids } }, select: { eventId: true, rating: true } }),
    prisma.payment.findMany({ where: { userId, eventId: { in: ids }, status: 'PAID' }, select: { eventId: true, amount: true } }),
  ]) : [[], []];
  const rating = new Map(feedback.map((f) => [f.eventId, f.rating]));
  const paid = new Map();
  payments.forEach((p) => paid.set(p.eventId, (paid.get(p.eventId) || 0) + p.amount / 100));
  return regs.map((r) => ({
    status: r.status, attendance: r.attendance?.status || null,
    certificateId: r.certificate && !r.certificate.revokedAt ? r.certificate.certificateId : null,
    paid: paid.get(r.event.id) || 0, rating: rating.get(r.event.id) ?? null, event: r.event,
  }));
}

// GET /api/reports/student?type=month|year|all - a student's own performance. Only ever their own records.
// Goals, skills, streaks and suggestions. Everything here is the student's own data, plus public upcoming events.
async function studentExtras(userId, out, stats, points, now) {
  const history = await prisma.registration.findMany({
    where: { userId, status: 'REGISTERED', attendance: { is: { status: 'PRESENT' } }, event: { status: 'PUBLISHED' } },
    select: { event: { select: { startsAt: true, category: true } } }, take: 2000,
  });
  const favourite = [...history.reduce((mp, h) => mp.set(h.event.category, (mp.get(h.event.category) || 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  const suggestions = favourite.length ? await prisma.event.findMany({
    where: { status: 'PUBLISHED', startsAt: { gt: now }, category: { in: favourite }, OR: [{ registrationDeadline: null }, { registrationDeadline: { gt: now } }], registrations: { none: { userId, status: { in: ['REGISTERED', 'WAITLISTED', 'PENDING', 'AWAITING_PAYMENT'] } } } },
    orderBy: { startsAt: 'asc' }, take: 3, select: { id: true, title: true, category: true, startsAt: true, venue: true, fee: true },
  }) : [];
  return {
    goals: sm.goals(stats, points, badgesOf(stats)),
    skills: sm.skills(out.events),
    streaks: sm.streaks(history.map((h) => h.event.startsAt), now),
    activityHours: sm.hoursAttended(out.events),
    suggestions,
  };
}

// Photos from events the student attended, plus the photos they uploaded themselves (pending ones are labelled).
async function studentGallery(userId, range) {
  const where = { status: 'PUBLISHED', ...range };
  const [shared, mine] = await Promise.all([
    galleryFor({ ...where, registrations: { some: { userId, status: 'REGISTERED', attendance: { is: { status: 'PRESENT' } } } } }),
    prisma.eventAsset.findMany({ where: { kind: 'PHOTO', uploadedById: userId, uploaderRole: 'STUDENT', event: where }, orderBy: { id: 'desc' }, take: 20, select: { url: true, approved: true, event: { select: { title: true } } } }),
  ]);
  return { items: shared.items, mine: mine.map((p) => ({ url: p.url, event: p.event.title, approved: p.approved })) };
}

const studentReport = asyncHandler(async (req, res) => {
  const q = studentQuery.parse(req.query);
  const nowLocal = m.local(new Date(), m.tzOffset());
  const period = periodOf(q, nowLocal);
  const label = q.type === 'all' ? 'All time' : m.periodLabel(period);
  const now = new Date();

  const out = sm.summarizeStudent({ regs: await loadStudentPeriod(req.user.id, period), period, now });
  let previous = null;
  let previousLabel = null;
  if (q.type !== 'all') {
    const prev = m.previousPeriod(period);
    previousLabel = m.periodLabel(prev);
    previous = sm.compareStudent(out.kpis, sm.summarizeStudent({ regs: await loadStudentPeriod(req.user.id, prev), period: prev, now }).kpis);
  }

  // Everyone on campus, for the same period: one overall figure, no individuals.
  const range = q.type === 'all' ? {} : (({ from, to }) => ({ startsAt: { gte: from, lt: to } }))(m.periodRange(period));
  const finishedWhere = { status: 'REGISTERED', event: { status: 'PUBLISHED', endsAt: { lte: now }, ...range } };
  const [campusFinished, campusPresent, profile, tally] = await Promise.all([
    prisma.registration.count({ where: finishedWhere }),
    prisma.registration.count({ where: { ...finishedWhere, attendance: { is: { status: 'PRESENT' } } } }),
    prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true, studentId: true, department: true, createdAt: true } }),
    rewards.tally(),
  ]);
  const mine = tally.get(req.user.id) || emptyStats();
  const points = pointsOf(mine);
  const ahead = [...tally.values()].filter((s) => pointsOf(s) > points).length;

  res.json({
    meta: { period: { ...period, label }, previousLabel, generatedAt: new Date(), timezone: `UTC${m.tzOffset() >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(m.tzOffset()) / 60)).padStart(2, '0')}:${String(Math.abs(m.tzOffset()) % 60).padStart(2, '0')}` },
    student: { name: profile.name, email: profile.email, studentId: profile.studentId, department: profile.department, memberSince: profile.createdAt },
    ...out, previous,
    campus: { attendanceRate: m.pct(campusPresent, campusFinished) },
    ...(await studentExtras(req.user.id, out, mine, points, now)),
    gallery: await studentGallery(req.user.id, q.type === 'all' ? {} : (({ from, to }) => ({ startsAt: { gte: from, lt: to } }))(m.periodRange(period))),
    seal: await seals.issue({
      kind: q.form === 'transcript' ? 'TRANSCRIPT' : 'STUDENT', userId: req.user.id, subject: profile.name, periodLabel: label, periodKey: label,
      figures: q.form === 'transcript' ? [['Events attended', out.kpis.attended], ['Hours at events', sm.hoursAttended(out.events)], ['Certificates', out.kpis.certificates]] : [['Events attended', out.kpis.attended], ['Attendance rate', out.kpis.attendanceRate === null ? '-' : `${out.kpis.attendanceRate}%`], ['Certificates', out.kpis.certificates], ['Points', points]],
    }),
    standing: { points, level: levelOf(points), rank: points > 0 ? ahead + 1 : null, ranked: [...tally.values()].filter((s) => pointsOf(s) > 0).length, stats: mine, badges: badgesOf(mine) },
  });
});

module.exports = { summary, eventReport, studentReport, verify };
