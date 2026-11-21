const test = require('node:test');
const assert = require('node:assert');
const { summarizeStudent, compareStudent } = require('../src/utils/studentReportMath');

const now = new Date('2026-12-01T00:00:00Z');
const reg = (id, o = {}, ev = {}) => ({
  status: 'REGISTERED', attendance: null, certificateId: null, paid: 0, rating: null,
  event: { id, title: `E${id}`, category: 'Tech', mode: 'OFFLINE', venue: 'V', fee: 0, startsAt: `2026-11-0${id}T04:30:00Z`, endsAt: `2026-11-0${id}T08:00:00Z`, ...ev }, ...o,
});
const period = { type: 'month', year: 2026, month: 11 };

test('attendance, certificates, feedback and spending come only from this student\'s rows', () => {
  const out = summarizeStudent({ period, now, regs: [
    reg(1, { attendance: 'PRESENT', certificateId: 'UNI-AAA', paid: 100, rating: 5 }, { fee: 100 }),
    reg(2, { attendance: 'PRESENT' }, { category: 'Sports' }),
    reg(3, { attendance: 'ABSENT' }),
    reg(4),
    reg(5, { status: 'CANCELLED' }),
    reg(6, { status: 'WAITLISTED' }),
    reg(7, {}, { startsAt: '2027-01-01T04:30:00Z', endsAt: '2027-01-01T08:00:00Z' }),
  ] });
  const k = out.kpis;
  assert.deepStrictEqual([k.confirmed, k.finished, k.attended, k.notAttended, k.upcoming], [5, 4, 2, 2, 1]);
  assert.strictEqual(k.attendanceRate, 50);
  assert.deepStrictEqual([k.certificates, k.feedbackGiven, k.avgRatingGiven, k.feedbackPending], [1, 1, 5, 1]);
  assert.strictEqual(k.spent, 100);
  assert.deepStrictEqual([k.cancelled, k.waitlisted], [1, 1]);
  assert.strictEqual(k.categoriesExplored, 2);
  assert.strictEqual(out.timeline.length, 30);
  assert.strictEqual(out.timeline[0].attended, 1);
});

test('nothing to measure gives dashes, and the all-time chart covers 12 months', () => {
  const out = summarizeStudent({ period: { type: 'all' }, now, regs: [] });
  assert.strictEqual(out.kpis.attendanceRate, null);
  assert.strictEqual(out.kpis.avgRatingGiven, null);
  assert.strictEqual(out.timeline.length, 12);
  assert.strictEqual(out.timeline[11].label, 'Dec 26');
});

test('comparison needs a previous figure to compare with', () => {
  const c = compareStudent({ confirmed: 4, attended: 3, certificates: 0, feedbackGiven: 1 }, { confirmed: 2, attended: 0, certificates: 0, feedbackGiven: 0 });
  assert.strictEqual(c.confirmed.change, 100);
  assert.strictEqual(c.attended.change, null);
});
