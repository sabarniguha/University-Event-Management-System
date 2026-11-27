const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const v = require(path.resolve(__dirname, '../src/utils/volunteer.js'));

test('default hours is the event length to the nearest quarter hour, capped at 24', () => {
  assert.strictEqual(v.defaultHours({ startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T13:10:00Z' }), 3.25);
  assert.strictEqual(v.defaultHours({ startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T10:05:00Z' }), 0.25);
  assert.strictEqual(v.defaultHours({ startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-05T10:00:00Z' }), 24);
  assert.strictEqual(v.defaultHours({ startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T09:00:00Z' }), 0);
});

test('entered hours are validated and snapped to quarter hours', () => {
  assert.strictEqual(v.cleanHours('2.6'), 2.5);
  assert.strictEqual(v.cleanHours(4), 4);
  assert.strictEqual(v.cleanHours(0), null);
  assert.strictEqual(v.cleanHours(49), null);
  assert.strictEqual(v.cleanHours('abc'), null);
  assert.strictEqual(v.cleanHours(undefined), null);
});

test('summary adds up hours', () => {
  assert.deepStrictEqual(v.summarise([{ hours: 2.5 }, { hours: 3 }]), { total: 5.5, events: 2 });
  assert.deepStrictEqual(v.summarise([]), { total: 0, events: 0 });
});
