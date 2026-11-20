// Calculations behind the admin and organiser reports. Pure functions: rows in, numbers out.
// Everything is computed from real records; a figure that cannot be calculated is null (shown as a dash), never a guess.
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const mean = (list) => (list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : null);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Months and days are cut at local midnight. Default is India Standard Time (UTC+05:30); override with REPORT_TZ_OFFSET_MIN.
const tzOffset = () => (Number.isFinite(Number(process.env.REPORT_TZ_OFFSET_MIN)) && process.env.REPORT_TZ_OFFSET_MIN !== undefined && process.env.REPORT_TZ_OFFSET_MIN !== '' ? Number(process.env.REPORT_TZ_OFFSET_MIN) : 330);
const local = (d, off) => new Date(new Date(d).getTime() + off * 60000); // read with getUTC* to get local parts

function periodRange({ type, year, month }, off = tzOffset()) {
  const start = type === 'year' ? Date.UTC(year, 0, 1) : Date.UTC(year, month - 1, 1);
  const end = type === 'year' ? Date.UTC(year + 1, 0, 1) : Date.UTC(year, month, 1);
  return { from: new Date(start - off * 60000), to: new Date(end - off * 60000) };
}

const previousPeriod = (p) => (p.type === 'year' ? { type: 'year', year: p.year - 1 } : p.month === 1 ? { type: 'month', year: p.year - 1, month: 12 } : { type: 'month', year: p.year, month: p.month - 1 });

const periodLabel = (p) => (p.type === 'year' ? `Year ${p.year}` : `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][p.month - 1]} ${p.year}`);

const tally = (rows, keyFn) => {
  const map = new Map();
  rows.forEach((r) => { const k = keyFn(r) || 'Unspecified'; map.set(k, [...(map.get(k) || []), r]); });
  return map;
};

// events: published events in the period. regs: every registration for them (with userId, status, department, attended).
function summarize({ events, regs, feedback = [], payments = [], certificates = [], period, now = new Date(), off = tzOffset(), withOrganisers = false }) {
  const stat = new Map(events.map((e) => [e.id, { confirmed: 0, waitlisted: 0, pending: 0, cancelled: 0, attended: 0, ratings: [], revenue: 0, refunded: 0, certificates: 0 }]));
  const students = new Set();
  const dept = new Map();

  regs.forEach((r) => {
    const s = stat.get(r.eventId);
    if (!s) return;
    if (r.status === 'REGISTERED') {
      s.confirmed += 1;
      students.add(r.userId);
      const d = r.department || 'Not specified';
      dept.set(d, (dept.get(d) || 0) + 1);
      if (r.attended) s.attended += 1;
    } else if (r.status === 'WAITLISTED') s.waitlisted += 1;
    else if (r.status === 'PENDING' || r.status === 'AWAITING_PAYMENT') s.pending += 1;
    else s.cancelled += 1;
  });
  feedback.forEach((f) => stat.get(f.eventId)?.ratings.push(f.rating));
  payments.forEach((p) => {
    const s = stat.get(p.eventId);
    if (!s) return;
    if (p.status === 'PAID') s.revenue += p.amount / 100;
    if (p.status === 'REFUNDED') s.refunded += p.amount / 100;
  });
  certificates.forEach((c) => { const s = stat.get(c.eventId); if (s) s.certificates += 1; });

  const rows = events.map((e) => {
    const s = stat.get(e.id);
    const ended = new Date(e.endsAt) <= now;
    return {
      id: e.id, title: e.title, category: e.category, eventType: e.eventType || null, mode: e.mode, venue: e.venue, bannerUrl: e.bannerUrl || null,
      startsAt: e.startsAt, endsAt: e.endsAt, capacity: e.capacity, fee: e.fee, organizerId: e.organizerId, organizer: e.organizerName || null, ended,
      registered: s.confirmed, waitlisted: s.waitlisted, pending: s.pending, cancelled: s.cancelled, attended: s.attended,
      fillRate: pct(s.confirmed, e.capacity),
      attendanceRate: ended ? pct(s.attended, s.confirmed) : null,
      rating: mean(s.ratings), ratingCount: s.ratings.length, revenue: Math.round(s.revenue * 100) / 100, refunded: Math.round(s.refunded * 100) / 100, certificates: s.certificates,
    };
  });

  const sum = (key) => rows.reduce((a, r) => a + r[key], 0);
  const endedRows = rows.filter((r) => r.ended);
  const allRatings = [...stat.values()].flatMap((s) => s.ratings);
  const kpis = {
    events: rows.length,
    registrations: sum('registered'),
    uniqueStudents: students.size,
    waitlisted: sum('waitlisted'),
    cancelled: sum('cancelled'),
    attended: sum('attended'),
    attendanceRate: pct(endedRows.reduce((a, r) => a + r.attended, 0), endedRows.reduce((a, r) => a + r.registered, 0)),
    noShows: endedRows.reduce((a, r) => a + Math.max(0, r.registered - r.attended), 0),
    avgFillRate: mean(rows.filter((r) => r.capacity > 0).map((r) => (r.registered / r.capacity) * 100)),
    revenue: Math.round(sum('revenue') * 100) / 100,
    refunded: Math.round(sum('refunded') * 100) / 100,
    certificates: sum('certificates'),
    avgRating: mean(allRatings),
    feedbackCount: allRatings.length,
    paidEvents: rows.filter((r) => r.fee > 0).length,
    freeEvents: rows.filter((r) => r.fee <= 0).length,
  };

  const group = (keyFn, limit = 10) => [...tally(rows, keyFn).entries()]
    .map(([label, list]) => ({ label, events: list.length, registrations: list.reduce((a, r) => a + r.registered, 0), attended: list.reduce((a, r) => a + r.attended, 0) }))
    .sort((a, b) => b.registrations - a.registrations || b.events - a.events).slice(0, limit);

  // Over time: days of the month, or the twelve months of the year.
  let timeline;
  if (period.type === 'year') {
    timeline = MONTHS.map((label) => ({ label, events: 0, registrations: 0, attended: 0, revenue: 0 }));
    rows.forEach((r) => { const t = timeline[local(r.startsAt, off).getUTCMonth()]; t.events += 1; t.registrations += r.registered; t.attended += r.attended; t.revenue += r.revenue; });
    timeline.forEach((t) => { t.revenue = Math.round(t.revenue * 100) / 100; });
  } else {
    const days = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
    timeline = Array.from({ length: days }, (_, i) => ({ label: String(i + 1), events: 0, registrations: 0, attended: 0, revenue: 0 }));
    rows.forEach((r) => { const t = timeline[local(r.startsAt, off).getUTCDate() - 1]; if (t) { t.events += 1; t.registrations += r.registered; t.attended += r.attended; t.revenue += r.revenue; } });
  }

  const departments = [...dept.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const topDepartments = departments.slice(0, 8);
  if (departments.length > 8) topDepartments.push({ label: 'Others', count: departments.slice(8).reduce((a, d) => a + d.count, 0) });

  const out = {
    kpis,
    timeline,
    byCategory: group((r) => r.category),
    byMode: group((r) => r.mode),
    byType: group((r) => r.eventType),
    departments: topDepartments,
    topEvents: [...rows].sort((a, b) => b.registered - a.registered).slice(0, 5),
    bestRated: rows.filter((r) => r.ratingCount > 0).sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount).slice(0, 5),
    events: rows,
  };

  if (withOrganisers) {
    out.organisers = [...tally(rows, (r) => `${r.organizerId}`).values()].map((list) => {
      const ended = list.filter((r) => r.ended);
      const rated = list.flatMap((r) => (r.ratingCount ? [r.rating] : []));
      return {
        id: list[0].organizerId, name: list[0].organizer || 'Unknown', events: list.length,
        registrations: list.reduce((a, r) => a + r.registered, 0), attended: list.reduce((a, r) => a + r.attended, 0),
        attendanceRate: pct(ended.reduce((a, r) => a + r.attended, 0), ended.reduce((a, r) => a + r.registered, 0)),
        revenue: Math.round(list.reduce((a, r) => a + r.revenue, 0) * 100) / 100, avgRating: mean(rated),
      };
    }).sort((a, b) => b.registrations - a.registrations);
  }
  return out;
}

// How much a figure moved compared with the previous period (null when there is nothing to compare with).
function compare(current, previous) {
  const keys = ['events', 'registrations', 'attended', 'revenue', 'uniqueStudents'];
  return Object.fromEntries(keys.map((k) => [k, { previous: previous[k], change: previous[k] > 0 ? Math.round(((current[k] - previous[k]) / previous[k]) * 1000) / 10 : null }]));
}

module.exports = { pct, mean, tzOffset, local, periodRange, previousPeriod, periodLabel, summarize, compare, MONTHS };
