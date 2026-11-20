const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const m = require('../utils/reportMath');

const MAX_EVENTS = 1000;

const eventSelect = {
  id: true, title: true, category: true, eventType: true, mode: true, venue: true, bannerUrl: true, startsAt: true, endsAt: true,
  capacity: true, fee: true, organizerId: true, organizer: { select: { name: true } },
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
    prisma.registration.findMany({ where: { eventId: inIds }, select: { eventId: true, userId: true, status: true, user: { select: { department: true } }, attendance: { select: { status: true } } } }),
    prisma.feedback.findMany({ where: { eventId: inIds }, select: { eventId: true, rating: true } }),
    prisma.payment.findMany({ where: { eventId: inIds, status: { in: ['PAID', 'REFUNDED'] } }, select: { eventId: true, amount: true, status: true } }),
    prisma.certificate.findMany({ where: { eventId: inIds, revokedAt: null }, select: { eventId: true } }),
  ]) : [[], [], [], []];
  return {
    events: list, truncated, feedback, payments, certificates,
    regs: regs.map((r) => ({ eventId: r.eventId, userId: r.userId, status: r.status, department: r.user?.department, attended: r.attendance?.status === 'PRESENT' })),
  };
}

const query = z.object({
  type: z.enum(['month', 'year']).default('month'),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  organizerId: z.coerce.number().int().positive().optional(),
  details: z.enum(['0', '1']).optional(),
});
const DETAIL_LIMIT = 60;

// GET /api/reports/summary?type=month|year&year=2026&month=11[&organizerId=3 (admin only)]
// Admin: the whole platform (or one organiser). Organiser: only their own events, whatever is asked.
const summary = asyncHandler(async (req, res) => {
  const q = query.parse(req.query);
  const nowLocal = m.local(new Date(), m.tzOffset());
  const period = { type: q.type, year: q.year ?? nowLocal.getUTCFullYear(), month: q.month ?? nowLocal.getUTCMonth() + 1 };
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
  };

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

// GET /api/reports/event/:id - everything about one event. Admin: any event. Organiser: their own only.
const eventReport = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'event id');
  await loadManagedEvent(id, req.user);
  const off = m.tzOffset();
  const [event, regs, feedback, payments, certCount, teams, assets] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { organizer: { select: { name: true, department: true } } } }),
    prisma.registration.findMany({
      where: { eventId: id }, orderBy: { createdAt: 'asc' },
      select: { status: true, createdAt: true, user: { select: { name: true, studentId: true, department: true } }, attendance: { select: { status: true, checkedInAt: true } } },
    }),
    prisma.feedback.findMany({ where: { eventId: id }, orderBy: { createdAt: 'desc' }, select: { rating: true, comment: true, createdAt: true } }),
    prisma.payment.findMany({ where: { eventId: id }, select: { amount: true, status: true } }),
    prisma.certificate.count({ where: { eventId: id, revokedAt: null } }),
    prisma.eventTeam.findMany({ where: { eventId: id }, select: { _count: { select: { members: true } } } }),
    prisma.eventAsset.findMany({ where: { eventId: id }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { kind: true, url: true, title: true } }),
  ]);

  const byStatus = {};
  regs.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  const confirmed = regs.filter((r) => r.status === 'REGISTERED');
  const present = confirmed.filter((r) => r.attendance?.status === 'PRESENT');
  const absent = confirmed.filter((r) => r.attendance?.status === 'ABSENT');
  const ended = event.endsAt <= new Date();

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
      certificates: certCount,
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
    photos: assets.filter((a) => a.kind === 'PHOTO').slice(0, 12).map((a) => ({ url: a.url, title: a.title })),
    sponsors: assets.filter((a) => a.kind === 'SPONSOR').map((a) => ({ url: a.url, title: a.title })),
    attendees: confirmed.slice(0, 500).map((r) => ({ name: r.user.name, studentId: r.user.studentId, department: r.user.department, attended: r.attendance?.status === 'PRESENT' ? 'Present' : r.attendance?.status === 'ABSENT' ? 'Absent' : (ended ? 'Not marked' : '') })),
    attendeesTotal: confirmed.length,
  });
});

module.exports = { summary, eventReport };
