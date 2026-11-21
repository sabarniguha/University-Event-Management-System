// Numbers for a student's own performance report. Pure functions over that student's records only.
const { pct, mean, local, tzOffset, MONTHS } = require('./reportMath');

// regs: this student's registrations for the period, each with its event, attendance, certificate, paid amount and rating.
function summarizeStudent({ regs, period, now = new Date(), off = tzOffset() }) {
  const rows = regs.map((r) => {
    const ended = new Date(r.event.endsAt) <= now;
    return {
      eventId: r.event.id, title: r.event.title, category: r.event.category, mode: r.event.mode, venue: r.event.venue, bannerUrl: r.event.bannerUrl || null,
      startsAt: r.event.startsAt, endsAt: r.event.endsAt, fee: r.event.fee, status: r.status, ended,
      attendance: r.attendance || null, certificateId: r.certificateId || null, paid: Math.round((r.paid || 0) * 100) / 100, rating: r.rating ?? null,
    };
  }).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

  const confirmed = rows.filter((r) => r.status === 'REGISTERED');
  const finished = confirmed.filter((r) => r.ended);
  const present = confirmed.filter((r) => r.attendance === 'PRESENT');
  const given = rows.filter((r) => r.rating !== null);

  const catCount = new Map();
  present.forEach((r) => catCount.set(r.category, (catCount.get(r.category) || 0) + 1));
  const categories = [...catCount.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  const kpis = {
    confirmed: confirmed.length,
    waitlisted: rows.filter((r) => r.status === 'WAITLISTED').length,
    pending: rows.filter((r) => r.status === 'PENDING' || r.status === 'AWAITING_PAYMENT').length,
    cancelled: rows.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length,
    attended: present.length,
    finished: finished.length,
    attendanceRate: pct(finished.filter((r) => r.attendance === 'PRESENT').length, finished.length),
    notAttended: finished.filter((r) => r.attendance !== 'PRESENT').length,
    upcoming: confirmed.filter((r) => !r.ended).length,
    certificates: rows.filter((r) => r.certificateId).length,
    feedbackGiven: given.length,
    avgRatingGiven: mean(given.map((r) => r.rating)),
    feedbackPending: present.filter((r) => r.rating === null).length,
    spent: Math.round(rows.reduce((a, r) => a + r.paid, 0) * 100) / 100,
    categoriesExplored: categories.length,
    topCategory: categories[0]?.label || null,
  };

  let timeline;
  if (period.type === 'month') {
    const days = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
    timeline = Array.from({ length: days }, (_, i) => ({ label: String(i + 1), registered: 0, attended: 0 }));
    confirmed.forEach((r) => { const t = timeline[local(r.startsAt, off).getUTCDate() - 1]; if (t) { t.registered += 1; if (r.attendance === 'PRESENT') t.attended += 1; } });
  } else if (period.type === 'year') {
    timeline = MONTHS.map((label) => ({ label, registered: 0, attended: 0 }));
    confirmed.forEach((r) => { const t = timeline[local(r.startsAt, off).getUTCMonth()]; t.registered += 1; if (r.attendance === 'PRESENT') t.attended += 1; });
  } else {
    // All time: the last 12 months up to now, oldest first.
    const nowL = local(now, off);
    timeline = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(nowL.getUTCFullYear(), nowL.getUTCMonth() - (11 - i), 1));
      return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, registered: 0, attended: 0 };
    });
    confirmed.forEach((r) => { const l = local(r.startsAt, off); const t = timeline.find((x) => x.key === `${l.getUTCFullYear()}-${l.getUTCMonth()}`); if (t) { t.registered += 1; if (r.attendance === 'PRESENT') t.attended += 1; } });
    timeline.forEach((t) => { delete t.key; });
  }

  const byMode = ['OFFLINE', 'ONLINE', 'HYBRID'].map((m) => ({ label: m, count: present.filter((r) => r.mode === m).length })).filter((x) => x.count > 0);
  return { kpis, timeline, categories, byMode, events: rows };
}

function compareStudent(current, previous) {
  const keys = ['confirmed', 'attended', 'certificates', 'feedbackGiven'];
  return Object.fromEntries(keys.map((k) => [k, { previous: previous[k], change: previous[k] > 0 ? Math.round(((current[k] - previous[k]) / previous[k]) * 1000) / 10 : null }]));
}

module.exports = { summarizeStudent, compareStudent };
