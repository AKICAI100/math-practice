import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProblem, checkAnswer, generateProblem, loadProgress, validateForLevel } from '../lib/game.js';

for (const level of [1, 2, 3, 4, 5, 6, 7, 8]) {
  test(`level ${level} generates only valid, non-repeating problems`, () => {
    const seen = new Set();
    for (let index = 0; index < 500; index += 1) {
      const problem = generateProblem(level, Math.random, seen);
      assert.equal(validateForLevel(level, problem.left, problem.right), true);
      assert.equal(seen.has(problem.key), false);
      seen.add(problem.key);
    }
  });
}

test('level 7 makes the incoming carry trigger the next carry', () => {
  for (let index = 0; index < 300; index += 1) {
    const problem = generateProblem(7);
    assert.equal(problem.carries[0], 1);
    assert.equal(problem.carries[1], 1);
    assert.equal(problem.leftDigits[1] + problem.rightDigits[1], 9);
  }
});

test('answer checking includes every digit and carry mark', () => {
  const problem = { ...analyzeProblem(27, 18, 2), width: 2, left: 27, right: 18 };
  assert.equal(checkAnswer(problem, [5, 4], [1]), true);
  assert.equal(checkAnswer(problem, [5, 4], [0]), false);
  assert.equal(checkAnswer(problem, [4, 5], [1]), false);
});

test('damaged saved progress safely falls back', () => {
  assert.deepEqual(loadProgress('{bad'), { version: 1, unlockedLevel: 1, bestScores: {}, soundEnabled: true, questionSeconds: 15 });
  const value = loadProgress(JSON.stringify({ unlockedLevel: 99, bestScores: { 1: 14 }, soundEnabled: false }));
  assert.equal(value.unlockedLevel, 8);
  assert.equal(value.bestScores[1], 10);
  assert.equal(value.soundEnabled, false);
  assert.equal(value.questionSeconds, 15);
});
