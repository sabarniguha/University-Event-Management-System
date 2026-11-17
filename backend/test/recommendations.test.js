const test = require('node:test');
const assert = require('node:assert');
// The scoring function needs no database; stub the modules that would open one.
const path = require('path');
for (const p of ['../src/utils/prismaClient', '../src/controllers/eventController']) {
  const f = require.resolve(p);
  require.cache[f] = { id: f, filename: f, loaded: true, exports: { shape: (x) => x, countInclude: {} } };
}
const { scoreEvent } = require('../src/controllers/recommendationController');
void path;

const now = Date.now();
const ev = (o) => ({ category: 'Tech', capacity: 100, registeredCount: 0, startsAt: new Date(now + 40 * 86400000), ...o });
const taste = { categories: { Tech: 2 }, types: {} };

test('department match and past category raise the score with reasons', () => {
  const plain = scoreEvent(ev({ category: 'Sports' }), { department: 'CSE', taste, now });
  const fit = scoreEvent(ev({ department: 'cse' }), { department: 'CSE', taste, now });
  assert.ok(fit.score > plain.score + 3);
  assert.ok(fit.reasons.includes('Open to your department'));
  assert.ok(fit.reasons.some((r) => r.includes('Tech')));
});

test('events happening soon and filling up get a boost', () => {
  const soon = scoreEvent(ev({ category: 'Sports', startsAt: new Date(now + 2 * 86400000), registeredCount: 80 }), { department: null, taste: { categories: {}, types: {} }, now });
  assert.deepStrictEqual(soon.reasons, ['Filling up fast', 'Happening soon']);
});
