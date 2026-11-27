const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { buildLive } = require(path.resolve(__dirname, '../src/utils/liveCheckin.js'));

const start = new Date('2026-12-01T10:00:00Z');
const event = { startsAt: start, endsAt: new Date('2026-12-01T13:00:00Z') };
const at = (mins) => new Date(start.getTime() + mins * 60000);
const regs = [
  { id: 1, name: 'Zed', studentId: 'S1', department: 'CS', status: 'PRESENT', method: 'QR', at: at(2) },
  { id: 2, name: 'Amy', studentId: 'S2', department: 'CS', status: 'PRESENT', method: 'MANUAL', at: at(13) },
  { id: 3, name: 'Bob', studentId: 'S3', department: 'EE', status: null, method: null, at: null },
  { id: 4, name: 'Cat', studentId: 'S4', department: 'EE', status: 'ABSENT', method: 'MANUAL', at: at(5) },
];

test('counts checked in against registered and lists who is missing', () => {
  const r = buildLive(event, regs, at(15));
  assert.strictEqual(r.state, 'open');
  assert.deepStrictEqual([r.registered, r.present, r.absent, r.missing], [4, 2, 1, 2]);
  assert.strictEqual(r.percent, 50);
  assert.deepStrictEqual(r.missingList.map((m) => m.name), ['Bob', 'Cat']);
});

test('groups check-ins into 10 minute slots and counts the last ten minutes', () => {
  const r = buildLive(event, regs, at(15));
  assert.strictEqual(r.series[0].count, 1); // 10:00-10:10 has Zed
  assert.strictEqual(r.series[1].count, 1); // 10:10-10:20 has Amy
  assert.strictEqual(r.lastTenMinutes, 1);
  assert.strictEqual(r.recent[0].name, 'Amy');
});

test('before the start nobody is in and the state says so; no registrations gives no percent', () => {
  const r = buildLive(event, regs.map((x) => ({ ...x, status: null, at: null })), new Date(start.getTime() - 3600e3));
  assert.strictEqual(r.state, 'before'); assert.strictEqual(r.present, 0); assert.strictEqual(r.missing, 4);
  assert.strictEqual(buildLive(event, [], at(5)).percent, null);
});

test('the chart never grows beyond 36 slots', () => {
  const long = { startsAt: start, endsAt: new Date(start.getTime() + 48 * 3600e3) };
  assert.ok(buildLive(long, regs, new Date(start.getTime() + 40 * 3600e3)).series.length <= 36);
});
