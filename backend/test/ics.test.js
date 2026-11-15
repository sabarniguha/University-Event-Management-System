const test = require('node:test');
const assert = require('node:assert');
const { eventIcs, fold } = require('../src/utils/ics');

test('ics output is valid-looking and escapes text', () => {
  const out = eventIcs({ id: 7, title: 'Hack; Day, 2026', description: 'Line1\nLine2', venue: 'Hall A', mode: 'OFFLINE', startsAt: '2026-12-01T04:30:00Z', endsAt: '2026-12-01T06:30:00Z' }, 'https://x.test');
  assert.ok(out.startsWith('BEGIN:VCALENDAR\r\n') && out.endsWith('END:VCALENDAR\r\n'));
  assert.ok(out.includes('DTSTART:20261201T043000Z'));
  assert.ok(out.includes('SUMMARY:Hack\; Day\\, 2026'));
  assert.ok(out.includes('Line1\\nLine2'));
});

test('ics lines are folded at 75 bytes', () => {
  const folded = fold('X:' + 'a'.repeat(200));
  for (const l of folded.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75);
});
