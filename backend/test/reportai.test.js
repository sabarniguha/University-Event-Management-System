const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const ai = require(path.resolve(__dirname, '../src/utils/reportAi.js'));

test('digest removes personal and bulky fields and trims long lists', () => {
  const d = ai.digest({ kpis: { events: 3 }, attendees: [{ name: 'A' }], seal: { code: 'x' }, student: { email: 'a@b.c' }, rows: Array.from({ length: 40 }, (_, i) => ({ i, name: 'N', email: 'e' })), note: 'x'.repeat(500) });
  assert.strictEqual(d.attendees, undefined); assert.strictEqual(d.seal, undefined); assert.strictEqual(d.student, undefined);
  assert.strictEqual(d.rows.length, 12); assert.strictEqual(d.rows[0].name, undefined); assert.strictEqual(d.rows[0].i, 0);
  assert.strictEqual(d.note.length, 160); assert.strictEqual(d.kpis.events, 3);
});

test('prompt tells the model to use only the data and carries the digest', () => {
  const m = ai.prompt('event', { numbers: { confirmed: 5 }, attendees: [{ name: 'Secret' }] });
  assert.match(m[0].content, /ONLY the figures/);
  assert.ok(m[1].content.includes('"confirmed":5')); assert.ok(!m[1].content.includes('Secret'));
});

test('fallback states only what the numbers say, and admits when there is nothing', () => {
  assert.ok(ai.fallback('event', { numbers: { confirmed: 5, fillRate: 50, attendanceRate: 80, pendingCertificates: 2 } }).join(' ').includes('Attendance was 80%'));
  assert.ok(ai.fallback('student', { kpis: { attended: 4, attendanceRate: 90, certificates: 2 }, campus: { attendanceRate: 70 } }).join(' ').includes('campus average of 70%'));
  assert.deepStrictEqual(ai.fallback('platform', {}), ['There is not enough data in this report yet to draw conclusions.']);
});

test('toBullets cleans list markers and bold', () => {
  assert.deepStrictEqual(ai.toBullets('- **One** thing\n* Two\n\n• Three'), ['One thing', 'Two', 'Three']);
});

test('roles: students only get the student report, admins the platform one', () => {
  assert.ok(ai.KINDS.student.roles.includes('STUDENT') && !ai.KINDS.event.roles.includes('STUDENT'));
  assert.ok(!ai.KINDS.platform.roles.includes('ORGANIZER'));
});
