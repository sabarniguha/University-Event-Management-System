const test = require('node:test');
const assert = require('node:assert');
const m = require('../src/utils/reportMath');

const now = new Date('2026-12-01T00:00:00Z');
const ev = (o) => ({ id: 1, title: 'E', category: 'Tech', mode: 'OFFLINE', venue: 'V', capacity: 10, fee: 0, organizerId: 1, organizerName: 'Org', startsAt: '2026-11-10T04:30:00Z', endsAt: '2026-11-10T08:00:00Z', ...o });

test('months are cut at Indian midnight', () => {
  const r = m.periodRange({ type: 'month', year: 2026, month: 11 }, 330);
  assert.strictEqual(r.from.toISOString(), '2026-10-31T18:30:00.000Z');
  assert.strictEqual(r.to.toISOString(), '2026-11-30T18:30:00.000Z');
  assert.deepStrictEqual(m.previousPeriod({ type: 'month', year: 2026, month: 1 }), { type: 'month', year: 2025, month: 12 });
  assert.strictEqual(m.periodLabel({ type: 'month', year: 2026, month: 11 }), 'November 2026');
});

test('counts, rates, revenue and ratings come only from the rows', () => {
  const events = [ev({ id: 1, fee: 100 }), ev({ id: 2, title: 'F', capacity: 0, startsAt: '2026-11-12T04:30:00Z' })];
  const regs = [
    { eventId: 1, userId: 1, status: 'REGISTERED', department: 'CSE', attended: true },
    { eventId: 1, userId: 2, status: 'REGISTERED', department: 'CSE', attended: false },
    { eventId: 1, userId: 3, status: 'WAITLISTED' },
    { eventId: 1, userId: 4, status: 'CANCELLED' },
    { eventId: 2, userId: 1, status: 'REGISTERED', department: null, attended: true },
  ];
  const out = m.summarize({
    events, regs, now, period: { type: 'month', year: 2026, month: 11 },
    feedback: [{ eventId: 1, rating: 5 }, { eventId: 1, rating: 4 }],
    payments: [{ eventId: 1, amount: 10000, status: 'PAID' }, { eventId: 1, amount: 10000, status: 'REFUNDED' }, { eventId: 1, amount: 5000, status: 'FAILED' }],
    certificates: [{ eventId: 1 }],
    withOrganisers: true,
  });
  const k = out.kpis;
  assert.deepStrictEqual([k.events, k.registrations, k.uniqueStudents, k.waitlisted, k.cancelled, k.attended], [2, 3, 2, 1, 1, 2]);
  assert.strictEqual(k.attendanceRate, 66.7);
  assert.strictEqual(k.noShows, 1);
  assert.strictEqual(k.revenue, 100);
  assert.strictEqual(k.refunded, 100);
  assert.strictEqual(k.avgRating, 4.5);
  assert.strictEqual(k.avgFillRate, 20); // the capacity-0 event is not counted
  assert.strictEqual(out.timeline.length, 30);
  assert.strictEqual(out.timeline[9].registrations, 2); // 10 Nov
  assert.deepStrictEqual(out.departments.map((d) => d.label), ['CSE', 'Not specified']);
  assert.strictEqual(out.organisers[0].registrations, 3);
});

test('an empty period gives zeros and dashes, not made-up numbers', () => {
  const out = m.summarize({ events: [], regs: [], period: { type: 'year', year: 2026 }, now });
  assert.strictEqual(out.kpis.events, 0);
  assert.strictEqual(out.kpis.attendanceRate, null);
  assert.strictEqual(out.kpis.avgRating, null);
  assert.strictEqual(out.timeline.length, 12);
});

test('events that have not ended yet have no attendance rate', () => {
  const out = m.summarize({ events: [ev({ endsAt: '2027-01-01T00:00:00Z' })], regs: [{ eventId: 1, userId: 1, status: 'REGISTERED', attended: false }], now, period: { type: 'month', year: 2026, month: 11 } });
  assert.strictEqual(out.events[0].attendanceRate, null);
  assert.strictEqual(out.kpis.attendanceRate, null);
});

test('compare reports the change against the previous period', () => {
  const c = m.compare({ events: 6, registrations: 30, attended: 0, revenue: 0, uniqueStudents: 5 }, { events: 3, registrations: 0, attended: 0, revenue: 0, uniqueStudents: 4 });
  assert.strictEqual(c.events.change, 100);
  assert.strictEqual(c.registrations.change, null);
});
