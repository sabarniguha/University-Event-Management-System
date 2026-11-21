// Numbers for a student's own performance report. Pure functions over that student's records only.
const { pct, mean, local, tzOffset, MONTHS, rangeBuckets: rb } = require('./reportMath');

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
  } else if (period.type === 'range') {
    const { labels, idx } = rb(period, off);
    timeline = labels.map((label) => ({ label, registered: 0, attended: 0 }));
    confirmed.forEach((r) => { const t = timeline[idx(r.startsAt)]; if (t) { t.registered += 1; if (r.attendance === 'PRESENT') t.attended += 1; } });
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

// Groups the categories a student attended into broad areas. Matching is by words in the category name; anything else is "Other".
const AREAS = [
  ['Technical', /tech|cod|hack|robot|\bai\b|data|cyber|software|engineer|electronic|iot|web|app|science|innovation/i],
  ['Cultural and creative', /cultur|music|danc|art|drama|theat|film|fest|literar|photo|design|fashion|poet|craft/i],
  ['Sports and wellbeing', /sport|athlet|cricket|football|fitness|yoga|game|chess|run|wellness|health/i],
  ['Career and professional', /career|placement|intern|job|resume|interview|entrepreneur|startup|business|finance|industry/i],
  ['Academic', /academic|seminar|lecture|research|conference|paper|quiz|olympiad|study/i],
  ['Community and social', /social|communit|volunteer|ngo|club|service|environment|awareness/i],
];
function skills(events) {
  const counts = new Map();
  events.filter((e) => e.attendance === 'PRESENT').forEach((e) => {
    const area = (AREAS.find(([, re]) => re.test(e.category)) || ['Other'])[0];
    const cur = counts.get(area) || { label: area, count: 0, categories: new Set() };
    cur.count += 1; cur.categories.add(e.category); counts.set(area, cur);
  });
  return [...counts.values()].map((c) => ({ label: c.label, count: c.count, categories: [...c.categories].sort() })).sort((a, b) => b.count - a.count);
}

// Months in a row with at least one attended event. dates: start times of every event the student attended, ever.
function streaks(dates, now = new Date(), off = tzOffset()) {
  const key = (d) => { const l = local(d, off); return l.getUTCFullYear() * 12 + l.getUTCMonth(); };
  const per = new Map();
  dates.forEach((d) => per.set(key(d), (per.get(key(d)) || 0) + 1));
  const months = [...per.keys()].sort((a, b) => a - b);
  let longest = 0; let run = 0; let prev = null;
  months.forEach((k) => { run = prev !== null && k === prev + 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = k; });
  const nowKey = key(now);
  let current = 0;
  for (let k = per.has(nowKey) ? nowKey : nowKey - 1; per.has(k); k -= 1) current += 1;
  let best = null;
  per.forEach((count, k) => { if (!best || count > best.count || (count === best.count && k > best.k)) best = { k, count }; });
  const label = (k) => `${MONTHS[k % 12]} ${Math.floor(k / 12)}`;
  return { current, longest, activeMonths: months.length, best: best ? { label: label(best.k), count: best.count } : null };
}

// How far the student is from the next level and each badge they have not earned yet. Uses the same thresholds as the points page.
const LEVELS = [['Bronze', 10], ['Silver', 60], ['Gold', 150]];
const BADGE_TARGETS = { 'first-step': ['attended', 1], regular: ['attended', 5], champion: ['attended', 10], explorer: ['categories', 3], voice: ['feedback', 3], 'team-player': ['teams', 1] };
function goals(stats, points, badges) {
  const next = LEVELS.find(([, need]) => points < need);
  const todo = badges.filter((b) => !b.earned && BADGE_TARGETS[b.key]).map((b) => {
    const [stat, target] = BADGE_TARGETS[b.key];
    const have = Math.min(stats[stat] || 0, target);
    return { key: b.key, name: b.name, description: b.description, have, target, left: target - have };
  }).sort((a, b) => a.left - b.left || a.target - b.target).slice(0, 3);
  return { nextLevel: next ? { name: next[0], pointsNeeded: next[1] - points } : null, badges: todo };
}

// Hours spent at events the student attended (scheduled length of each).
const hoursAttended = (events) => Math.round(events.filter((e) => e.attendance === 'PRESENT').reduce((a, e) => a + Math.max(0, new Date(e.endsAt) - new Date(e.startsAt)) / 3600e3, 0) * 10) / 10;

module.exports = { summarizeStudent, compareStudent, skills, streaks, goals, hoursAttended };
