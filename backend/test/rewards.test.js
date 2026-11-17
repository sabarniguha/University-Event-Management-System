const test = require('node:test');
const assert = require('node:assert');
const r = require('../src/utils/rewards');

test('points come only from attendance, feedback and teams', () => {
  assert.strictEqual(r.pointsOf({ attended: 2, categories: 2, feedback: 1, teams: 1 }), 2 * 10 + 5 + 3);
  assert.strictEqual(r.pointsOf(r.empty()), 0);
});

test('badges unlock at their thresholds', () => {
  const earned = (s) => r.badgesOf(s).filter((b) => b.earned).map((b) => b.key);
  assert.deepStrictEqual(earned(r.empty()), []);
  assert.deepStrictEqual(earned({ attended: 5, categories: 3, feedback: 0, teams: 0 }), ['first-step', 'regular', 'explorer']);
});

test('levels and short names', () => {
  assert.strictEqual(r.levelOf(0), 'Starter');
  assert.strictEqual(r.levelOf(60), 'Silver');
  assert.strictEqual(r.shortName('asha rao'), 'asha R.');
  assert.strictEqual(r.shortName('Madonna'), 'Madonna');
});
