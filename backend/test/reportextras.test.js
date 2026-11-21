// Pure maths behind the extra report sections.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const stubPath = require.resolve(path.resolve(__dirname, '../src/utils/prismaClient.js'));
require.cache[stubPath] = { id: stubPath, filename: stubPath, loaded: true, exports: {} };
const m = require('../src/utils/reportMath');
const sm = require('../src/utils/studentReportMath');
const ins = require('../src/utils/reportInsights');
const { codeFor, valid } = require('../src/utils/reportSeal');

test('custom ranges: label, previous window of the same length, and whole-day bounds', () => {
  const p = { type: 'range', fromDate: '2026-09-01', toDate: '2026-09-30' };
  assert.strictEqual(m.periodLabel(p), '1 Sep 2026 to 30 Sep 2026');
  assert.deepStrictEqual(m.previousPeriod(p), { type: 'range', fromDate: '2026-08-02', toDate: '2026-08-31' });
  const { from, to } = m.periodRange(p, 330);
  assert.strictEqual(from.toISOString(), '2026-08-31T18:30:00.000Z');
  assert.strictEqual(to.toISOString(), '2026-09-30T18:30:00.000Z');
});

test('range buckets are days up to 62 days and months after that', () => {
  const short = m.rangeBuckets({ fromDate: '2026-09-01', toDate: '2026-09-10' }, 330);
  assert.strictEqual(short.labels.length, 10);
  assert.strictEqual(short.idx(new Date('2026-09-03T05:00:00Z')), 2);
  const long = m.rangeBuckets({ fromDate: '2026-01-15', toDate: '2026-06-10' }, 330);
  assert.deepStrictEqual(long.labels, ['Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26']);
  assert.strictEqual(long.idx(new Date('2026-03-10T05:00:00Z')), 2);
});

test('feedback themes need at least two mentions and skip filler words', () => {
  const t = ins.themes(['The food was cold', 'Food queue was long', 'Great speakers', 'speakers were late']);
  assert.deepStrictEqual(t.map((x) => x.word).sort(), ['food', 'speakers']);
});

test('registration timing splits last 24h, earlier week, earlier', () => {
  const start = new Date('2026-11-20T10:00:00Z');
  const ev = [{ id: 1, startsAt: start, registrationDeadline: new Date('2026-11-19T10:00:00Z') }];
  const at = (h) => ({ eventId: 1, status: 'REGISTERED', createdAt: new Date(new Date('2026-11-19T10:00:00Z').getTime() - h * 3600e3) });
  const t = ins.timing(ev, [at(1), at(30), at(300), { ...at(2), status: 'CANCELLED' }]);
  assert.deepStrictEqual([t.total, t.last24h, t.earlierWeek, t.earlier], [3, 1, 1, 1]);
});

test('insights: departments, no-shows, demand, peak times, returning students', () => {
  const mk = (id, over) => ({ id, title: `E${id}`, category: 'Tech', capacity: 10, fee: 0, organizerId: 1, organizer: 'O', startsAt: new Date('2026-11-16T05:00:00Z'), endsAt: new Date('2026-11-16T07:00:00Z'), ended: true, registered: 0, waitlisted: 0, cancelled: 0, attended: 0, fillRate: 0, ratingCount: 0, rating: null, certificates: 0, revenue: 0, refunded: 0, ...over });
  const rows = [mk(1, { registered: 10, attended: 6, fillRate: 100, waitlisted: 3, cancelled: 2, certificates: 4 }), mk(2, { registered: 2, attended: 2, fillRate: 20 })];
  const regs = [
    { eventId: 1, userId: 1, status: 'REGISTERED', attended: true, department: 'CSE', name: 'A', studentId: 'S1' },
    { eventId: 2, userId: 1, status: 'REGISTERED', attended: true, department: 'CSE', name: 'A', studentId: 'S1' },
    { eventId: 1, userId: 2, status: 'REGISTERED', attended: false, department: 'ECE', name: 'B', studentId: 'S2' },
  ];
  const r = ins.insights({ rows, regs, events: [], off: 330 });
  assert.strictEqual(r.departments.find((d) => d.label === 'CSE').attendanceRate, 100);
  assert.strictEqual(r.departments.find((d) => d.label === 'ECE').attendanceRate, 0);
  assert.strictEqual(r.mostNoShows[0].noShows, 4);
  assert.strictEqual(r.demand.fullEvents, 1);
  assert.strictEqual(r.demand.waitlisted, 3);
  assert.strictEqual(r.demand.lowFill, 1);
  assert.strictEqual(r.peak.weekdays[0].events, 2, 'Monday 16 Nov 2026');
  assert.strictEqual(r.peak.parts[0].events, 2, '10:30 am local is morning');
  assert.deepStrictEqual([r.returning.attendees, r.returning.returning], [1, 1]);
  assert.strictEqual(r.certificates.issued, 4);
  assert.strictEqual(r.certificates.pending, 4);
});

test('approval turnaround', () => {
  const t = ins.turnaround([{ createdAt: new Date('2026-11-01T00:00:00Z'), reviewedAt: new Date('2026-11-01T10:00:00Z') }, { createdAt: new Date('2026-11-01T00:00:00Z'), reviewedAt: new Date('2026-11-02T00:00:00Z') }, { createdAt: new Date(), reviewedAt: null }]);
  assert.deepStrictEqual([t.reviewed, t.avgHours, t.slowestHours], [2, 17, 24]);
  assert.strictEqual(ins.turnaround([]).avgHours, null);
});

test('student skills, streaks, goals and hours', () => {
  const ev = (category, attendance, h = 2) => ({ category, attendance, startsAt: new Date('2026-11-01T05:00:00Z'), endsAt: new Date(new Date('2026-11-01T05:00:00Z').getTime() + h * 3600e3) });
  const events = [ev('Hackathon', 'PRESENT'), ev('Cultural', 'PRESENT'), ev('Technical', 'PRESENT', 3), ev('Sports', 'ABSENT'), ev('Mystery', 'PRESENT')];
  const sk = sm.skills(events);
  assert.deepStrictEqual(sk.map((s) => [s.label, s.count]), [['Technical', 2], ['Cultural and creative', 1], ['Other', 1]]);
  assert.strictEqual(sm.hoursAttended(events), 9);
  const s = sm.streaks([new Date('2026-09-10T05:00:00Z'), new Date('2026-10-10T05:00:00Z'), new Date('2026-11-02T05:00:00Z'), new Date('2026-11-12T05:00:00Z'), new Date('2026-06-10T05:00:00Z')], new Date('2026-11-20T05:00:00Z'), 330);
  assert.deepStrictEqual([s.current, s.longest, s.activeMonths, s.best.label, s.best.count], [3, 3, 4, 'Nov 2026', 2]);
  assert.strictEqual(sm.streaks([], new Date(), 330).current, 0);
  const g = sm.goals({ attended: 4, categories: 2, feedback: 0, teams: 0 }, 45, [{ key: 'regular', name: 'Regular', description: 'x', earned: false }, { key: 'first-step', earned: true }, { key: 'explorer', name: 'Explorer', description: 'y', earned: false }]);
  assert.deepStrictEqual(g.nextLevel, { name: 'Silver', pointsNeeded: 15 });
  assert.deepStrictEqual(g.badges.map((b) => [b.key, b.left]), [['explorer', 1], ['regular', 1]]);
});

test('report IDs depend on the figures and have a fixed shape', () => {
  const a = codeFor({ kind: 'STUDENT', userId: 1, periodKey: 'x', figures: [{ label: 'a', value: '1' }] });
  const b = codeFor({ kind: 'STUDENT', userId: 1, periodKey: 'x', figures: [{ label: 'a', value: '2' }] });
  assert.ok(valid(a) && valid(b));
  assert.notStrictEqual(a, b);
  assert.strictEqual(a, codeFor({ kind: 'STUDENT', userId: 1, periodKey: 'x', figures: [{ label: 'a', value: '1' }] }));
  assert.ok(!valid('RPT-ZZZZ-0000-0000'));
});
