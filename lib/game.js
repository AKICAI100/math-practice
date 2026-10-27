/** Pure arithmetic and level-generation logic. No browser APIs live here. */

export const LEVELS = [
  { id: 1, digits: 2, title: 'No Carry', tag: 'EASY PEASY', color: 'mint' },
  { id: 2, digits: 2, title: 'Carry!', tag: 'ONE CARRY', color: 'yellow' },
  { id: 3, digits: 2, title: 'Mixed Up', tag: 'MIX IT UP', color: 'blue' },
  { id: 4, digits: 3, title: 'No Carry', tag: 'THREE DIGITS', color: 'lilac' },
  { id: 5, digits: 3, title: 'One Carry', tag: 'GETTING GOOD', color: 'peach' },
  { id: 6, digits: 3, title: 'Two Carries', tag: 'DOUBLE UP', color: 'pink' },
  { id: 7, digits: 3, title: 'Carry Chain', tag: 'SUPER PIG', color: 'orange' },
  { id: 8, digits: 3, title: 'Mega Mix', tag: 'FINAL BOSS', color: 'rainbow' },
];

export function analyzeProblem(left, right, width) {
  const leftDigits = toDigits(left, width);
  const rightDigits = toDigits(right, width);
  const answerDigits = [];
  const carries = [];
  let carry = 0;

  for (let place = 0; place < width; place += 1) {
    const total = leftDigits[place] + rightDigits[place] + carry;
    answerDigits.push(total % 10);
    carry = total >= 10 ? 1 : 0;
    carries.push(carry);
  }
  if (carry) answerDigits.push(carry);

  return {
    leftDigits,
    rightDigits,
    answerDigits,
    carries,
    carryCount: carries.reduce((sum, value) => sum + value, 0),
    consecutiveByIncomingCarry:
      Boolean(carries[0] && carries[1]) && leftDigits[1] + rightDigits[1] === 9,
    result: left + right,
  };
}

export function validateForLevel(levelId, left, right) {
  const level = LEVELS[levelId - 1];
  if (!level) return false;
  const min = 10 ** (level.digits - 1);
  const max = 10 ** level.digits - 1;
  if (left < min || right < min || left > max || right > max) return false;
  const a = analyzeProblem(left, right, level.digits);
  // The lesson's carry controls are between operand columns, so avoid a final overflow.
  if (a.carries[level.digits - 1] !== 0) return false;

  const inner = a.carries.slice(0, level.digits - 1);
  const count = inner.reduce((sum, value) => sum + value, 0);
  if (levelId === 1 || levelId === 4) return count === 0;
  if (levelId === 2) return inner[0] === 1 && count === 1;
  if (levelId === 3) return count === 0 || (inner[0] === 1 && count === 1);
  if (levelId === 5) return count === 1;
  if (levelId === 6) return count === 2;
  if (levelId === 7) return count === 2 && a.consecutiveByIncomingCarry;
  if (levelId === 8) return count >= 0 && count <= 2;
  return false;
}

export function generateProblem(levelId, random = Math.random, excluded = new Set()) {
  const level = LEVELS[levelId - 1];
  if (!level) throw new Error(`Unknown level: ${levelId}`);
  const min = 10 ** (level.digits - 1);
  const max = 10 ** level.digits - 1;

  for (let attempt = 0; attempt < 50000; attempt += 1) {
    const left = randomInt(min, max, random);
    const right = randomInt(min, max, random);
    const key = canonicalKey(left, right);
    if (excluded.has(key) || isTrivial(left, right)) continue;
    if (!validateForLevel(levelId, left, right)) continue;
    const analysis = analyzeProblem(left, right, level.digits);
    return { left, right, width: level.digits, key, ...analysis };
  }
  throw new Error(`Could not generate a valid level ${levelId} problem`);
}

export function checkAnswer(problem, digits, carryMarks) {
  if (digits.length !== problem.answerDigits.length) return false;
  if (!digits.every((digit, index) => digit === problem.answerDigits[index])) return false;
  const expectedCarries = problem.carries.slice(0, problem.answerDigits.length - 1);
  return expectedCarries.every((carry, index) => Number(Boolean(carryMarks[index])) === carry);
}

export function medalFor(score) {
  if (score === 10) return { name: 'GOLD PIG', emoji: '🏆', tone: 'gold' };
  if (score >= 8) return { name: 'SILVER PIG', emoji: '🥈', tone: 'silver' };
  if (score >= 6) return { name: 'BRONZE PIG', emoji: '🥉', tone: 'bronze' };
  return { name: 'TRY AGAIN', emoji: '💪', tone: 'try' };
}

export function loadProgress(raw) {
  const fallback = { version: 1, unlockedLevel: 1, bestScores: {}, soundEnabled: true, questionSeconds: 15 };
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    return {
      version: 1,
      unlockedLevel: clampInt(value.unlockedLevel, 1, 8, 1),
      bestScores: Object.fromEntries(
        Object.entries(value.bestScores ?? {})
          .filter(([key, score]) => Number(key) >= 1 && Number(key) <= 8 && Number.isInteger(score))
          .map(([key, score]) => [key, Math.max(0, Math.min(10, score))]),
      ),
      soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : true,
      questionSeconds: [15, 20, 30].includes(value.questionSeconds) ? value.questionSeconds : 15,
    };
  } catch {
    return fallback;
  }
}

function toDigits(number, width) {
  return Array.from({ length: width }, (_, index) => Math.floor(number / 10 ** index) % 10);
}

function randomInt(min, max, random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function canonicalKey(left, right) {
  return left < right ? `${left}+${right}` : `${right}+${left}`;
}

function isTrivial(left, right) {
  return (left % 10 === 0 && right % 10 === 0) || Math.abs(left - right) === 0;
}

function clampInt(value, min, max, fallback) {
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
