// Volunteer hours helpers. Pure.
const MAX_HOURS = 48;

// By default a helper is credited with the whole length of the event, to the nearest quarter hour (at most 24).
function defaultHours(event) {
  const h = (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 3600000;
  if (!(h > 0)) return 0;
  return Math.min(24, Math.max(0.25, Math.round(h * 4) / 4));
}

// Accepts a number or numeric string, in quarter-hour steps between 0.25 and 48.
function cleanHours(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0.25 || n > MAX_HOURS) return null;
  return Math.round(n * 4) / 4;
}

function summarise(rows) {
  const total = rows.reduce((a, r) => a + r.hours, 0);
  return { total: Math.round(total * 100) / 100, events: rows.length };
}

module.exports = { defaultHours, cleanHours, summarise, MAX_HOURS };
