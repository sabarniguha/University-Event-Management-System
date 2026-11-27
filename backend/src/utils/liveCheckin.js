const { windowState } = require('./attendanceWindow');

const SLOT = 10 * 60 * 1000;
const MAX_SLOTS = 36; // the last 6 hours at most

// regs: { id, name, studentId, department, status: 'PRESENT'|'ABSENT'|null, method, at: Date|null }
// Pure: records in, numbers out.
function buildLive(event, regs, now = new Date()) {
  const present = regs.filter((r) => r.status === 'PRESENT');
  const absent = regs.filter((r) => r.status === 'ABSENT');
  const missing = regs.filter((r) => r.status !== 'PRESENT');
  const times = present.map((r) => r.at).filter(Boolean).map((d) => new Date(d).getTime());

  // 10-minute buckets from the earliest of (start, first check-in) up to now, newest MAX_SLOTS only.
  const startMs = Math.min(new Date(event.startsAt).getTime(), ...(times.length ? times : [Infinity]));
  const endMs = Math.min(now.getTime(), new Date(event.endsAt).getTime());
  const first = Math.floor(startMs / SLOT) * SLOT;
  const last = Math.floor(Math.max(endMs, ...times, first) / SLOT) * SLOT;
  const from = Math.max(first, last - (MAX_SLOTS - 1) * SLOT);
  const series = [];
  for (let t = from; t <= last; t += SLOT) series.push({ start: new Date(t).toISOString(), count: 0 });
  times.forEach((t) => { const i = Math.floor((Math.floor(t / SLOT) * SLOT - from) / SLOT); if (i >= 0 && i < series.length) series[i].count += 1; });

  const recent = present.filter((r) => r.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8).map((r) => ({ name: r.name, at: r.at, method: r.method }));
  const lastTen = times.filter((t) => t > now.getTime() - SLOT).length;
  const registered = regs.length;
  return {
    state: windowState(event, now),
    registered, present: present.length, absent: absent.length, missing: missing.length,
    percent: registered ? Math.round((present.length / registered) * 1000) / 10 : null,
    lastTenMinutes: lastTen,
    series, recent,
    missingList: missing.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 300).map((r) => ({ name: r.name, studentId: r.studentId, department: r.department, status: r.status })),
    missingTotal: missing.length,
  };
}

module.exports = { buildLive };
