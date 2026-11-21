// Extra analysis for admin and organiser reports. Pure functions: records in, numbers out.
// Anything that cannot be worked out from the records is null or empty, never estimated.
const { pct, mean, local, tzOffset } = require('./reportMath');

const STOP = new Set(('the and for are was were this that with have has had not but you your they them their what when where which who will would could should from into than then there here about been being very much more most some any all can just also really event events were its our out too one two get got did does done like well good great nice').split(' '));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Words that came up in at least two different comments, most common first.
function themes(comments, limit = 8) {
  const seen = new Map();
  comments.forEach((c) => {
    new Set(String(c || '').toLowerCase().match(/[a-z]{4,}/g) || []).forEach((w) => { if (!STOP.has(w)) seen.set(w, (seen.get(w) || 0) + 1); });
  });
  return [...seen.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([word, count]) => ({ word, count }));
}

// When people registered compared with the deadline (or the start, when there is no deadline).
function timing(events, regs) {
  const at = new Map(events.map((e) => [e.id, new Date(e.registrationDeadline || e.startsAt).getTime()]));
  const out = { total: 0, last24h: 0, earlierWeek: 0, earlier: 0 };
  regs.forEach((r) => {
    if (r.status !== 'REGISTERED' || !r.createdAt || !at.has(r.eventId)) return;
    const left = at.get(r.eventId) - new Date(r.createdAt).getTime();
    out.total += 1;
    if (left <= 24 * 3600e3) out.last24h += 1; else if (left <= 7 * 24 * 3600e3) out.earlierWeek += 1; else out.earlier += 1;
  });
  return { ...out, shareLast24h: pct(out.last24h, out.total) };
}

// rows: summarize().events. regs: { eventId, userId, status, attended, department, createdAt, name, studentId }.
// feedback: { eventId, rating, comment }. events: raw events (for registrationDeadline).
function insights({ rows, regs, feedback = [], events = [], off = tzOffset() }) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const confirmed = regs.filter((r) => r.status === 'REGISTERED' && byId.has(r.eventId));
  const endedConfirmed = confirmed.filter((r) => byId.get(r.eventId).ended);

  // Departments
  const dept = new Map();
  confirmed.forEach((r) => {
    const k = r.department || 'Not specified';
    const d = dept.get(k) || { label: k, students: new Set(), registrations: 0, ended: 0, attended: 0 };
    d.students.add(r.userId); d.registrations += 1;
    if (byId.get(r.eventId).ended) { d.ended += 1; if (r.attended) d.attended += 1; }
    dept.set(k, d);
  });
  const departments = [...dept.values()].map((d) => ({ label: d.label, students: d.students.size, registrations: d.registrations, attended: d.attended, attendanceRate: pct(d.attended, d.ended) })).sort((a, b) => b.registrations - a.registrations).slice(0, 12);

  // Cancellations and no-shows
  const cat = new Map();
  rows.forEach((r) => {
    const c = cat.get(r.category) || { label: r.category, registered: 0, cancelled: 0, endedRegistered: 0, noShows: 0 };
    c.registered += r.registered; c.cancelled += r.cancelled;
    if (r.ended) { c.endedRegistered += r.registered; c.noShows += Math.max(0, r.registered - r.attended); }
    cat.set(r.category, c);
  });
  const dropOff = [...cat.values()].map((c) => ({ label: c.label, registered: c.registered, cancelled: c.cancelled, cancelRate: pct(c.cancelled, c.registered + c.cancelled), noShows: c.noShows, noShowRate: pct(c.noShows, c.endedRegistered) })).sort((a, b) => b.cancelled + b.noShows - (a.cancelled + a.noShows)).slice(0, 8);
  const pick = (r) => ({ id: r.id, title: r.title, registered: r.registered, cancelled: r.cancelled, noShows: Math.max(0, r.registered - r.attended), noShowRate: pct(Math.max(0, r.registered - r.attended), r.registered) });
  const mostCancelled = rows.filter((r) => r.cancelled > 0).sort((a, b) => b.cancelled - a.cancelled).slice(0, 5).map(pick);
  const mostNoShows = rows.filter((r) => r.ended && r.registered > r.attended).sort((a, b) => (b.registered - b.attended) - (a.registered - a.attended)).slice(0, 5).map(pick);

  // Demand: full events and waitlists
  const full = rows.filter((r) => r.capacity > 0 && r.fillRate !== null && r.fillRate >= 90);
  const demand = {
    fullEvents: full.length, waitlisted: rows.reduce((a, r) => a + r.waitlisted, 0), lowFill: rows.filter((r) => r.ended && r.fillRate !== null && r.fillRate < 30).length,
    list: rows.filter((r) => r.waitlisted > 0 || (r.fillRate !== null && r.fillRate >= 90)).sort((a, b) => b.waitlisted - a.waitlisted || b.fillRate - a.fillRate).slice(0, 8).map((r) => ({ id: r.id, title: r.title, capacity: r.capacity, registered: r.registered, waitlisted: r.waitlisted, fillRate: r.fillRate })),
  };

  // Peak days and times (by when the event started, local time)
  const weekdays = DAYS.map((label) => ({ label, events: 0, registrations: 0 }));
  const parts = [{ label: 'Morning (before noon)', events: 0, registrations: 0 }, { label: 'Afternoon (noon to 5 pm)', events: 0, registrations: 0 }, { label: 'Evening (after 5 pm)', events: 0, registrations: 0 }];
  rows.forEach((r) => {
    const l = local(r.startsAt, off);
    const w = weekdays[(l.getUTCDay() + 6) % 7]; w.events += 1; w.registrations += r.registered;
    const h = l.getUTCHours(); const p = parts[h < 12 ? 0 : h < 17 ? 1 : 2]; p.events += 1; p.registrations += r.registered;
  });

  // Students who came back: attended two or more events in this period
  const per = new Map();
  confirmed.filter((r) => r.attended).forEach((r) => { const p = per.get(r.userId) || { name: r.name, studentId: r.studentId, department: r.department, events: 0 }; p.events += 1; per.set(r.userId, p); });
  const attendees = per.size;
  const back = [...per.values()].filter((p) => p.events >= 2);
  const returning = { attendees, returning: back.length, share: pct(back.length, attendees), top: back.sort((a, b) => b.events - a.events || String(a.name).localeCompare(String(b.name))).slice(0, 8) };

  // Feedback
  const comments = feedback.filter((f) => f.comment && f.comment.trim());
  const lowest = rows.filter((r) => r.ratingCount >= 3).sort((a, b) => a.rating - b.rating || b.ratingCount - a.ratingCount).slice(0, 3).map((r) => ({
    id: r.id, title: r.title, rating: r.rating, ratingCount: r.ratingCount,
    reasons: comments.filter((f) => f.eventId === r.id && f.rating <= 3).slice(0, 2).map((f) => f.comment.trim().slice(0, 200)),
  }));
  const feedbackOut = { themes: themes(comments.map((f) => f.comment)), comments: comments.length, lowest };

  // Certificates against attendance (ended events only)
  const ended = rows.filter((r) => r.ended);
  const attended = ended.reduce((a, r) => a + r.attended, 0);
  const issued = ended.reduce((a, r) => a + Math.min(r.certificates, r.attended), 0);
  const certificates = { attended, issued, pending: Math.max(0, attended - issued), rate: pct(issued, attended) };

  // Money by organiser (admin report only uses it)
  const org = new Map();
  rows.forEach((r) => { const o = org.get(r.organizerId) || { id: r.organizerId, name: r.organizer || 'Unknown', revenue: 0, refunded: 0, paidEvents: 0 }; o.revenue += r.revenue; o.refunded += r.refunded; if (r.fee > 0) o.paidEvents += 1; org.set(r.organizerId, o); });
  const money = [...org.values()].filter((o) => o.revenue > 0 || o.refunded > 0).map((o) => ({ ...o, revenue: Math.round(o.revenue * 100) / 100, refunded: Math.round(o.refunded * 100) / 100, net: Math.round((o.revenue - o.refunded) * 100) / 100 })).sort((a, b) => b.net - a.net);

  return { departments, dropOff, mostCancelled, mostNoShows, demand, peak: { weekdays, parts }, returning, feedback: feedbackOut, timing: timing(events, regs), certificates, money, endedRegistrations: endedConfirmed.length };
}

// Hours between submission and decision, for events the admin reviewed in the period.
function turnaround(items) {
  const hours = items.filter((i) => i.reviewedAt && i.createdAt).map((i) => (new Date(i.reviewedAt) - new Date(i.createdAt)) / 3600e3).filter((h) => h >= 0).sort((a, b) => a - b);
  if (!hours.length) return { reviewed: 0, avgHours: null, medianHours: null, slowestHours: null };
  const mid = Math.floor(hours.length / 2);
  return { reviewed: hours.length, avgHours: mean(hours), medianHours: Math.round((hours.length % 2 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2) * 10) / 10, slowestHours: Math.round(hours[hours.length - 1] * 10) / 10 };
}

module.exports = { insights, themes, timing, turnaround };
