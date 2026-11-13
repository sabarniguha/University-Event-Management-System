const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

// The last 6 calendar months, oldest first, each with a zero count ready to fill.
const lastMonths = (n = 6) => {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en', { month: 'short' }), count: 0 });
  }
  return { months, since: new Date(now.getFullYear(), now.getMonth() - (n - 1), 1) };
};

const bucketByMonth = (months, dates) => {
  dates.forEach((d) => {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = months.find((x) => x.key === key);
    if (m) m.count += 1;
  });
  return months.map(({ label, count }) => ({ label, count }));
};

const countBy = (rows, keyFn, limit = 8) => {
  const map = new Map();
  rows.forEach((r) => {
    const k = keyFn(r) || 'Unspecified';
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, limit);
};

// GET /api/analytics/student
const student = asyncHandler(async (req, res) => {
  const now = new Date();
  const { months, since } = lastMonths();
  const regs = await prisma.registration.findMany({
    where: { userId: req.user.id },
    select: {
      status: true, createdAt: true,
      event: { select: { category: true, endsAt: true, startsAt: true } },
      attendance: { select: { status: true } },
      certificate: { select: { id: true, revokedAt: true } },
    },
  });
  const confirmed = regs.filter((r) => r.status === 'REGISTERED');
  const held = confirmed.filter((r) => r.event.endsAt <= now);
  const attended = held.filter((r) => r.attendance?.status === 'PRESENT');

  res.json({
    totals: {
      registered: confirmed.length,
      upcoming: confirmed.filter((r) => r.event.endsAt > now).length,
      attended: attended.length,
      missed: held.length - attended.length,
      pending: regs.filter((r) => r.status === 'PENDING').length,
      waitlisted: regs.filter((r) => r.status === 'WAITLISTED').length,
      certificates: regs.filter((r) => r.certificate && !r.certificate.revokedAt).length,
      attendanceRate: pct(attended.length, held.length),
    },
    registrationsByMonth: bucketByMonth(months, regs.filter((r) => r.createdAt >= since).map((r) => r.createdAt)),
    attendedByCategory: countBy(attended, (r) => r.event.category),
  });
});

const organizerScope = (user) => (user.role === 'ADMIN' ? {} : { organizerId: user.id });

// GET /api/analytics/organizer  (admins see every event)
const organizer = asyncHandler(async (req, res) => {
  const now = new Date();
  const { months, since } = lastMonths();
  const scope = organizerScope(req.user);

  const events = await prisma.event.findMany({
    where: scope,
    select: {
      id: true, title: true, status: true, capacity: true, category: true, endsAt: true, startsAt: true,
      registrations: {
        select: {
          status: true, createdAt: true,
          user: { select: { department: true } },
          attendance: { select: { status: true } },
        },
      },
      feedback: { select: { rating: true } },
    },
  });

  const statusCounts = {};
  events.forEach((e) => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

  const allRegs = events.flatMap((e) => e.registrations);
  const confirmed = allRegs.filter((r) => r.status === 'REGISTERED');
  const endedConfirmed = events.filter((e) => e.endsAt < now).flatMap((e) => e.registrations.filter((r) => r.status === 'REGISTERED'));
  const present = endedConfirmed.filter((r) => r.attendance?.status === 'PRESENT');
  const ratings = events.flatMap((e) => e.feedback.map((f) => f.rating));

  const perEvent = events
    .filter((e) => e.status !== 'DRAFT')
    .map((e) => {
      const reg = e.registrations.filter((r) => r.status === 'REGISTERED');
      const pres = reg.filter((r) => r.attendance?.status === 'PRESENT').length;
      return {
        id: e.id, title: e.title, capacity: e.capacity, registered: reg.length, present: pres,
        fill: pct(reg.length, e.capacity),
        attendanceRate: e.endsAt < now ? pct(pres, reg.length) : null,
        rating: e.feedback.length ? round1(e.feedback.reduce((a, f) => a + f.rating, 0) / e.feedback.length) : null,
      };
    })
    .sort((a, b) => b.registered - a.registered)
    .slice(0, 8);

  res.json({
    totals: {
      events: events.length,
      published: statusCounts.PUBLISHED || 0,
      pending: statusCounts.PENDING_APPROVAL || 0,
      registrations: confirmed.length,
      waitlisted: allRegs.filter((r) => r.status === 'WAITLISTED').length,
      attendanceRate: pct(present.length, endedConfirmed.length),
      averageRating: ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
      feedbackCount: ratings.length,
    },
    eventsByStatus: Object.entries(statusCounts).map(([label, count]) => ({ label, count })),
    registrationsByMonth: bucketByMonth(months, allRegs.filter((r) => r.createdAt >= since).map((r) => r.createdAt)),
    registrationsByDepartment: countBy(confirmed, (r) => r.user.department),
    eventsByCategory: countBy(events, (e) => e.category),
    perEvent,
  });
});

// GET /api/analytics/admin  (also served at /api/admin/analytics)
const admin = asyncHandler(async (req, res) => {
  const now = new Date();
  const { months, since } = lastMonths();

  const [recentRegs, newUsers, categories, deptRows, topEventRows, endedRegistered, endedPresent, methods, ratingAgg, waitlisted, byStatus, byMode, byRole, certificates] =
    await Promise.all([
      prisma.registration.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.event.groupBy({ by: ['category'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
      prisma.registration.findMany({ where: { status: 'REGISTERED' }, select: { user: { select: { department: true } } } }),
      prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, capacity: true, _count: { select: { registrations: { where: { status: 'REGISTERED' } } } } },
      }),
      prisma.registration.count({ where: { status: 'REGISTERED', event: { status: 'PUBLISHED', endsAt: { lt: now } } } }),
      prisma.attendance.count({
        where: { status: 'PRESENT', registration: { status: 'REGISTERED', event: { status: 'PUBLISHED', endsAt: { lt: now } } } },
      }),
      prisma.attendance.groupBy({ by: ['method'], where: { status: 'PRESENT' }, _count: { _all: true } }),
      prisma.feedback.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
      prisma.registration.count({ where: { status: 'WAITLISTED' } }),
      prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.event.groupBy({ by: ['mode'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.certificate.count({ where: { revokedAt: null } }),
    ]);

  const topEvents = topEventRows
    .map((e) => ({ id: e.id, title: e.title, capacity: e.capacity, registered: e._count.registrations }))
    .sort((a, b) => b.registered - a.registered)
    .slice(0, 5)
    .map((e) => ({ ...e, fill: pct(e.registered, e.capacity) }));

  res.json({
    registrationsByMonth: bucketByMonth(months.map((m) => ({ ...m })), recentRegs.map((r) => r.createdAt)),
    usersByMonth: bucketByMonth(months.map((m) => ({ ...m })), newUsers.map((u) => u.createdAt)),
    eventsByCategory: categories.map((c) => ({ label: c.category, count: c._count._all })).sort((a, b) => b.count - a.count),
    eventsByStatus: byStatus.map((s) => ({ label: s.status, count: s._count._all })),
    eventsByMode: byMode.map((s) => ({ label: s.mode, count: s._count._all })),
    usersByRole: byRole.map((s) => ({ label: s.role, count: s._count._all })),
    registrationsByDepartment: countBy(deptRows, (r) => r.user.department),
    topEvents,
    attendance: {
      rate: pct(endedPresent, endedRegistered),
      present: endedPresent,
      registeredAtEndedEvents: endedRegistered,
      viaQr: methods.find((m) => m.method === 'QR')?._count._all || 0,
      manual: methods.find((m) => m.method === 'MANUAL')?._count._all || 0,
    },
    feedback: { average: round1(ratingAgg._avg.rating), count: ratingAgg._count._all },
    waitlisted,
    certificates,
  });
});

module.exports = { student, organizer, admin };
