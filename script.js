/** Pure arithmetic, level generation, and progress migration. */

const ADDITION_LEVELS = [
  { id: 1, digits: 2, title: 'No Carry', tag: 'EASY PEASY', color: 'mint' },
  { id: 2, digits: 2, title: 'Carry!', tag: 'ONE CARRY', color: 'yellow' },
  { id: 3, digits: 2, title: 'Mixed Up', tag: 'MIX IT UP', color: 'blue' },
  { id: 4, digits: 3, title: 'No Carry', tag: 'THREE DIGITS', color: 'lilac' },
  { id: 5, digits: 3, title: 'One Carry', tag: 'GETTING GOOD', color: 'peach' },
  { id: 6, digits: 3, title: 'Two Carries', tag: 'DOUBLE UP', color: 'pink' },
  { id: 7, digits: 3, title: 'Carry Chain', tag: 'SUPER PIG', color: 'orange' },
  { id: 8, digits: 3, title: 'Mega Mix', tag: 'FINAL BOSS', color: 'rainbow' },
];

const SUBTRACTION_LEVELS = [
  { id: 1, digits: 2, title: 'No Borrow', tag: 'EASY PEASY', color: 'mint' },
  { id: 2, digits: 2, title: 'Borrow!', tag: 'ONE BORROW', color: 'yellow' },
  { id: 3, digits: 2, title: 'Mixed Up', tag: 'MIX IT UP', color: 'blue' },
  { id: 4, digits: 3, title: 'No Borrow', tag: 'THREE DIGITS', color: 'lilac' },
  { id: 5, digits: 3, title: 'One Borrow', tag: 'GETTING GOOD', color: 'peach' },
  { id: 6, digits: 3, title: 'Two Borrows', tag: 'DOUBLE UP', color: 'pink' },
  { id: 7, digits: 3, title: 'Borrow Chain', tag: 'SUPER PIG', color: 'orange' },
  { id: 8, digits: 3, title: 'Mega Mix', tag: 'FINAL BOSS', color: 'rainbow' },
];

const LEVELS_BY_OPERATION = {
  addition: ADDITION_LEVELS,
  subtraction: SUBTRACTION_LEVELS,
};

function analyzeAddition(left, right, width) {
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
    marks: carries,
    carries,
    operationCount: carries.reduce((sum, value) => sum + value, 0),
    chained: Boolean(carries[0] && carries[1]) && leftDigits[1] + rightDigits[1] === 9,
    result: left + right,
  };
}

function analyzeSubtraction(left, right, width) {
  const leftDigits = toDigits(left, width);
  const rightDigits = toDigits(right, width);
  const answerDigits = [];
  const borrows = [];
  let incomingBorrow = 0;

  for (let place = 0; place < width; place += 1) {
    const adjustedTop = leftDigits[place] - incomingBorrow;
    const borrow = adjustedTop < rightDigits[place] ? 1 : 0;
    answerDigits.push(adjustedTop + borrow * 10 - rightDigits[place]);
    borrows.push(borrow);
    incomingBorrow = borrow;
  }

  return {
    leftDigits,
    rightDigits,
    answerDigits,
    marks: borrows,
    borrows,
    operationCount: borrows.reduce((sum, value) => sum + value, 0),
    // The tens column only needs to borrow because the ones column reduced it.
    chained:
      Boolean(borrows[0] && borrows[1]) &&
      leftDigits[1] >= rightDigits[1] &&
      leftDigits[1] - 1 < rightDigits[1],
    result: left - right,
  };
}

function validateForLevel(operation, levelId, left, right) {
  const level = LEVELS_BY_OPERATION[operation]?.[levelId - 1];
  if (!level) return false;
  const min = 10 ** (level.digits - 1);
  const max = 10 ** level.digits - 1;
  if (left < min || right < min || left > max || right > max) return false;

  if (operation === 'addition') {
    const analysis = analyzeAddition(left, right, level.digits);
    if (analysis.carries[level.digits - 1] !== 0) return false;
    const count = analysis.carries.slice(0, level.digits - 1).reduce((sum, value) => sum + value, 0);
    if (levelId === 1 || levelId === 4) return count === 0;
    if (levelId === 2) return analysis.carries[0] === 1 && count === 1;
    if (levelId === 3) return count <= 1;
    if (levelId === 5) return count === 1;
    if (levelId === 6) return count === 2;
    if (levelId === 7) return count === 2 && analysis.chained;
    return levelId === 8 && count <= 2;
  }

  if (left < right) return false;
  const analysis = analyzeSubtraction(left, right, level.digits);
  if (analysis.borrows[level.digits - 1] !== 0 || analysis.result < 0) return false;
  const count = analysis.borrows.slice(0, level.digits - 1).reduce((sum, value) => sum + value, 0);
  if (levelId === 1 || levelId === 4) return count === 0;
  if (levelId === 2) return analysis.borrows[0] === 1 && count === 1;
  if (levelId === 3) return count <= 1;
  if (levelId === 5) return count === 1;
  if (levelId === 6) return count === 2;
  if (levelId === 7) return count === 2 && analysis.chained;
  return levelId === 8 && count <= 2;
}

function generateProblem(operation, levelId, random = Math.random, excluded = new Set()) {
  const level = LEVELS_BY_OPERATION[operation]?.[levelId - 1];
  if (!level) throw new Error(`Unknown ${operation} level: ${levelId}`);
  const min = 10 ** (level.digits - 1);
  const max = 10 ** level.digits - 1;

  for (let attempt = 0; attempt < 50000; attempt += 1) {
    const left = randomInt(min, max, random);
    const right = randomInt(min, max, random);
    const key = operation === 'addition' ? canonicalAdditionKey(left, right) : `${left}-${right}`;
    if (excluded.has(key) || isTrivial(operation, left, right)) continue;
    if (!validateForLevel(operation, levelId, left, right)) continue;
    const analysis = operation === 'addition'
      ? analyzeAddition(left, right, level.digits)
      : analyzeSubtraction(left, right, level.digits);
    return { operation, left, right, width: level.digits, key, ...analysis };
  }
  throw new Error(`Could not generate a valid ${operation} level ${levelId} problem`);
}

function checkAnswer(problem, digits, enteredMarks) {
  if (digits.length !== problem.answerDigits.length) return false;
  if (!digits.every((digit, index) => digit === problem.answerDigits[index])) return false;
  const expected = problem.marks.slice(0, problem.answerDigits.length - 1);
  return expected.every((mark, index) => Number(Boolean(enteredMarks[index])) === mark);
}

function medalFor(score) {
  if (score === 10) return { name: 'GOLD PIG', emoji: '🏆', tone: 'gold' };
  if (score >= 8) return { name: 'SILVER PIG', emoji: '🥈', tone: 'silver' };
  if (score >= 6) return { name: 'BRONZE PIG', emoji: '🥉', tone: 'bronze' };
  return { name: 'TRY AGAIN', emoji: '💪', tone: 'try' };
}

function cleanScores(value) {
  return Object.fromEntries(
    Object.entries(value ?? {})
      .filter(([key, score]) => Number(key) >= 1 && Number(key) <= 8 && Number.isInteger(score))
      .map(([key, score]) => [key, Math.max(0, Math.min(10, score))]),
  );
}

function cleanOperationProgress(value) {
  return {
    unlockedLevel: clampInt(value?.unlockedLevel, 1, 8, 1),
    bestScores: cleanScores(value?.bestScores),
  };
}

function loadProgress(raw) {
  const fallback = {
    version: 2,
    operations: {
      addition: cleanOperationProgress(),
      subtraction: cleanOperationProgress(),
    },
    soundEnabled: true,
    questionSeconds: 15,
  };
  if (!raw) return fallback;

  try {
    const value = JSON.parse(raw);
    // Version 1 stored Addition at the top level. Preserve it during migration.
    const oldAddition = {
      unlockedLevel: value.unlockedLevel,
      bestScores: value.bestScores,
    };
    return {
      version: 2,
      operations: {
        addition: cleanOperationProgress(value.operations?.addition ?? oldAddition),
        subtraction: cleanOperationProgress(value.operations?.subtraction),
      },
      soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : true,
      questionSeconds: [15, 20, 30].includes(value.questionSeconds) ? value.questionSeconds : 15,
    };
  } catch {
    return fallback;
  }
}

function recordSession(progressValue, operationName, completedLevel, sessionScore) {
  const operationProgress = progressValue.operations[operationName];
  const best = Math.max(operationProgress.bestScores[completedLevel] || 0, sessionScore);
  const unlockedLevel = sessionScore >= 8
    ? Math.max(operationProgress.unlockedLevel, Math.min(8, completedLevel + 1))
    : operationProgress.unlockedLevel;
  return {
    ...progressValue,
    operations: {
      ...progressValue.operations,
      [operationName]: {
        unlockedLevel,
        bestScores: { ...operationProgress.bestScores, [completedLevel]: best },
      },
    },
  };
}

function toDigits(number, width) {
  return Array.from({ length: width }, (_, index) => Math.floor(number / 10 ** index) % 10);
}

function randomInt(min, max, random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function canonicalAdditionKey(left, right) {
  return left < right ? `${left}+${right}` : `${right}+${left}`;
}

function isTrivial(operation, left, right) {
  if (operation === 'subtraction') {
    return left === right || left - right < 2 || (left % 10 === 0 && right % 10 === 0);
  }
  return (left % 10 === 0 && right % 10 === 0) || left === right;
}

function clampInt(value, min, max, fallback) {
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

// Browser application -------------------------------------------------------

const STORAGE_KEY = 'piggy-math-progress-v1';
const PRAISE = ['Great!', 'Nice!', 'Perfect!', 'Oink-credible!'];
const app = document.getElementById('app');
let progress = loadProgress(readSavedProgress());
let screen = 'title';
let operation = 'addition';
let levelId = 1;
let questionIndex = 0;
let score = 0;
let finalScore = 0;
let problem = null;
let digits = [];
let enteredMarks = [];
let activePlace = 0;
let phase = 'answering';
let feedback = null;
let remainingMs = progress.questionSeconds * 1000;
let deadline = 0;
let timerId = null;
let feedbackId = null;
let inputLocked = false;
let usedProblems = new Set();
let lastBeepSecond = -1;

function currentOperationProgress() {
  return progress.operations[operation];
}

function saveProgress(next) {
  progress = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The game remains playable if a browser blocks storage for file URLs.
  }
}

function readSavedProgress() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function sound(kind, urgency = 0) {
  if (!progress.soundEnabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  const now = context.currentTime;
  oscillator.type = kind === 'correct' ? 'sine' : 'triangle';
  oscillator.frequency.setValueAtTime(
    kind === 'correct' ? 520 : kind === 'gentle' ? 240 : kind === 'tap' ? 340 : 380 + urgency * 45,
    now,
  );
  if (kind === 'correct') oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === 'beep' ? 0.06 : 0.09, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'correct' ? 0.25 : 0.11));
  oscillator.start(now);
  oscillator.stop(now + (kind === 'correct' ? 0.27 : 0.13));
  oscillator.onended = () => context.close();
}

function soundButton() {
  return `<button class="sound-button" data-action="sound" aria-label="${progress.soundEnabled ? 'Turn sound off' : 'Turn sound on'}">${progress.soundEnabled ? '🔊' : '🔇'}</button>`;
}

function decorations() {
  return '<div class="cloud cloud-one"></div><div class="cloud cloud-two"></div><div class="confetti c1"></div><div class="confetti c2"></div><div class="grass" aria-hidden="true"></div>';
}

function render() {
  if (screen === 'title') renderTitle();
  else if (screen === 'operations') renderOperations();
  else if (screen === 'levels') renderLevels();
  else if (screen === 'play') renderPlay();
  else renderResults();
}

function renderTitle() {
  app.innerHTML = `
    <main class="app-shell title-screen">
      ${decorations()}${soundButton()}
      <section class="title-card" aria-labelledby="app-title">
        <div class="mascot bounce" aria-label="Happy pig">🐷</div>
        <p class="eyebrow">COLUMN MATH CHALLENGE</p>
        <h1 id="app-title">PIGGY<br>MATH</h1>
        <p class="title-copy">Solve it, one column at a time!</p>
        <button class="start-button" data-action="operations"><span>START</span><span aria-hidden="true">→</span></button>
      </section>
    </main>`;
  bindCommonActions();
  app.querySelector('[data-action="operations"]').addEventListener('click', () => {
    sound('tap'); screen = 'operations'; render();
  });
}

function renderOperations() {
  app.innerHTML = `<main class="app-shell operation-screen">
    ${decorations()}
    <header class="top-bar operation-header">
      <button class="round-button" data-action="title" aria-label="Back to title">←</button>
      <div><p class="eyebrow">PICK YOUR MATH</p><h2>Choose Math</h2></div>
      ${soundButton()}
    </header>
    <section class="operation-grid" aria-label="Math operations">
      <button class="operation-card addition-card" data-operation="addition">
        <span class="operation-icon" aria-hidden="true">➕</span><strong>ADDITION</strong><span>Add it up!</span>
      </button>
      <button class="operation-card subtraction-card" data-operation="subtraction">
        <span class="operation-icon" aria-hidden="true">➖</span><strong>SUBTRACTION</strong><span>Take it away!</span>
      </button>
    </section>
  </main>`;
  bindCommonActions();
  app.querySelector('[data-action="title"]').addEventListener('click', () => { screen = 'title'; render(); });
  app.querySelectorAll('[data-operation]').forEach((button) => button.addEventListener('click', () => {
    operation = button.dataset.operation;
    sound('tap'); screen = 'levels'; render();
  }));
}

function renderLevels() {
  const levels = LEVELS_BY_OPERATION[operation];
  const operationProgress = currentOperationProgress();
  const cards = levels.map((level) => {
    const locked = level.id > operationProgress.unlockedLevel;
    const best = operationProgress.bestScores[level.id];
    return `<button class="level-card ${level.color} ${locked ? 'locked' : ''}" data-level="${level.id}" ${locked ? 'disabled' : ''}>
      <span class="level-number">${level.id}</span>
      <span class="level-icon" aria-hidden="true">${locked ? '🔒' : operation === 'addition' ? '➕' : '➖'}</span>
      <span class="level-digits">${level.digits} DIGITS</span>
      <strong>${locked ? 'Locked' : level.title}</strong>
      <span class="level-tag">${locked ? `Score 8+ on Level ${level.id - 1}` : level.tag}</span>
      ${!locked && best !== undefined ? `<span class="best-score">★ BEST ${best}/10</span>` : ''}
    </button>`;
  }).join('');

  app.innerHTML = `<main class="app-shell level-screen">
    ${decorations()}
    <header class="top-bar">
      <button class="round-button" data-action="operations" aria-label="Back to Choose Math">←</button>
      <div><p class="eyebrow">${operation.toUpperCase()}</p><h2>Choose a Level</h2></div>
      ${soundButton()}
    </header>
    <section class="time-choice" aria-label="Question time">
      <span>⏱ QUESTION TIME</span>
      <div>${[15, 20, 30].map((seconds) => `<button data-seconds="${seconds}" class="${progress.questionSeconds === seconds ? 'selected' : ''}">${seconds}s</button>`).join('')}</div>
    </section>
    <section class="level-grid" aria-label="${operation} levels">${cards}</section>
  </main>`;

  bindCommonActions();
  app.querySelector('[data-action="operations"]').addEventListener('click', () => { screen = 'operations'; render(); });
  app.querySelectorAll('[data-seconds]').forEach((button) => button.addEventListener('click', () => {
    saveProgress({ ...progress, questionSeconds: Number(button.dataset.seconds) });
    sound('tap'); renderLevels();
  }));
  app.querySelectorAll('[data-level]').forEach((button) => button.addEventListener('click', () => startLevel(Number(button.dataset.level))));
}

function startLevel(id) {
  clearTimers();
  usedProblems = new Set();
  levelId = id;
  questionIndex = 0;
  score = 0;
  screen = 'play';
  sound('tap');
  prepareQuestion();
}

function prepareQuestion() {
  problem = generateProblem(operation, levelId, Math.random, usedProblems);
  usedProblems.add(problem.key);
  digits = Array(problem.answerDigits.length).fill(null);
  enteredMarks = Array(problem.answerDigits.length - 1).fill(0);
  activePlace = 0;
  feedback = null;
  phase = 'answering';
  inputLocked = false;
  remainingMs = progress.questionSeconds * 1000;
  deadline = performance.now() + remainingMs;
  lastBeepSecond = -1;
  renderPlay();
  startTimer();
}

function renderPlay() {
  const timeRatio = Math.max(0, Math.min(1, remainingMs / (progress.questionSeconds * 1000)));
  const allEntered = digits.length > 0 && digits.every((digit) => digit !== null);
  const operationLabel = operation === 'addition' ? 'addition' : 'subtraction';
  app.innerHTML = `<main class="app-shell play-screen ${operation}">
    <header class="game-header">
      <button class="round-button" data-action="exit" aria-label="Exit session">×</button>
      <div class="question-progress"><span>QUESTION ${questionIndex + 1} / 10</span>
        <div class="pig-dots" aria-hidden="true">${Array.from({ length: 10 }, (_, index) => `<i class="${index <= questionIndex ? 'done' : ''}">${index === questionIndex ? '🐷' : ''}</i>`).join('')}</div>
      </div>${soundButton()}
    </header>
    <div class="game-layout">
      <section class="work-card ${feedback ? 'has-feedback' : ''}" aria-label="Written ${operationLabel} problem">
        <output class="feedback-banner ${feedback?.correct ? 'is-correct' : ''}" aria-live="polite">${feedback ? `<span>${feedback.correct ? '✨' : '💡'}</span>${feedback.message}` : ''}</output>
        <div class="timer-row"><span class="timer-label">⏱ <b id="timer-seconds">${Math.ceil(remainingMs / 1000)}</b>s</span>
          <div class="timer-track"><span id="timer-bar" class="${timeRatio < .25 ? 'urgent' : ''}" style="width:${timeRatio * 100}%"></span></div>
          <span class="score-chip">★ ${score}</span>
        </div>
        ${columnBoard()}
        ${phase === 'answering' ? `<p class="column-hint">${activePlace === 0 ? 'Start with the ONES →' : activePlace < digits.length ? `Now the ${placeName(activePlace)}!` : 'Checking…'}</p>` : ''}
      </section>
      <section class="keypad-card ${phase !== 'answering' ? 'disabled' : ''}" aria-label="Number keypad">
        <p>Tap your answer</p><div class="keypad">
          ${[1,2,3,4,5,6,7,8,9].map((number) => `<button data-digit="${number}" ${phase !== 'answering' || allEntered ? 'disabled' : ''}>${number}</button>`).join('')}
          <button class="undo-key" data-action="undo" ${phase !== 'answering' || activePlace === 0 || allEntered ? 'disabled' : ''} aria-label="Undo">⌫</button>
          <button data-digit="0" ${phase !== 'answering' || allEntered ? 'disabled' : ''}>0</button>
          <span class="auto-key" aria-label="Answers check automatically">🐽</span>
        </div>
      </section>
    </div>
  </main>`;

  bindCommonActions();
  app.querySelector('[data-action="exit"]').addEventListener('click', () => { clearTimers(); screen = 'levels'; render(); });
  app.querySelector('[data-action="undo"]')?.addEventListener('click', undoDigit);
  app.querySelectorAll('[data-digit]').forEach((button) => button.addEventListener('click', () => enterDigit(Number(button.dataset.digit))));
}

function columnBoard() {
  const places = Array.from({ length: problem.answerDigits.length }, (_, index) => problem.answerDigits.length - 1 - index);
  const paddedLeft = String(problem.left).padStart(problem.answerDigits.length, ' ');
  const paddedRight = String(problem.right).padStart(problem.answerDigits.length, ' ');
  const reveal = phase === 'feedback' && feedback && !feedback.correct;
  const notationRow = operation === 'addition'
    ? additionNotation(places, reveal)
    : subtractionNotation(places, reveal);
  const answer = places.map((place) => {
    const value = reveal ? problem.answerDigits[place] : digits[place];
    return `<span class="${place === activePlace ? 'active' : ''} ${value !== null ? 'filled' : ''}">${value ?? ''}</span>`;
  }).join('');
  return `<div class="column-board ${reveal ? 'revealing' : ''} ${operation}" style="--columns:${problem.answerDigits.length}">
    <div class="carry-row">${notationRow}</div>
    <div class="operand-row">${Array.from(paddedLeft, (digit) => `<span>${digit}</span>`).join('')}</div>
    <div class="operand-row second"><b aria-hidden="true">${operation === 'addition' ? '+' : '−'}</b>${Array.from(paddedRight, (digit) => `<span>${digit}</span>`).join('')}</div>
    <div class="sum-line"></div><div class="answer-row">${answer}</div>
    <div class="place-row">${places.map((place) => `<span>${placeShort(place)}</span>`).join('')}</div>
  </div>`;
}

function additionNotation(places, reveal) {
  return places.map((place) => {
    const markIndex = place - 1;
    if (markIndex < 0) return '<span></span>';
    const shown = reveal ? problem.marks[markIndex] : enteredMarks[markIndex];
    return `<span class="carry-box ${shown ? 'marked auto-carry' : ''}" aria-label="Automatic carry into ${placeName(place)} column: ${shown ? 'one' : 'blank'}">${shown ? '1' : ''}</span>`;
  }).join('');
}

function subtractionNotation(places, reveal) {
  return places.map((place) => {
    const receivesBorrow = place < problem.width - 1 && (reveal ? problem.borrows[place] : enteredMarks[place]);
    const givesBorrow = place > 0 && (reveal ? problem.borrows[place - 1] : enteredMarks[place - 1]);
    const notes = [receivesBorrow ? '+10' : '', givesBorrow ? '−1' : ''].filter(Boolean);
    return `<span class="borrow-box ${notes.length ? 'marked auto-carry' : ''}" aria-label="${notes.length ? `${placeName(place)} column ${notes.join(' and ')}` : `No borrowing in ${placeName(place)} column`}">${notes.join(' ')}</span>`;
  }).join('');
}

function enterDigit(value) {
  if (phase !== 'answering' || inputLocked || activePlace >= digits.length) return;
  sound('tap');
  const place = activePlace;
  digits[place] = value;
  if (place < enteredMarks.length) enteredMarks[place] = problem.marks[place];
  activePlace += 1;
  if (place === digits.length - 1) inputLocked = true;
  renderPlay();
  if (inputLocked) {
    feedbackId = window.setTimeout(() => finishQuestion(checkAnswer(problem, digits, enteredMarks)), 260);
  }
}

function undoDigit() {
  if (phase !== 'answering' || inputLocked || activePlace === 0) return;
  sound('tap');
  const target = activePlace - 1;
  digits[target] = null;
  if (target < enteredMarks.length) enteredMarks[target] = 0;
  activePlace = target;
  renderPlay();
}

function startTimer() {
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    if (phase !== 'answering') return;
    remainingMs = Math.max(0, deadline - performance.now());
    const seconds = Math.ceil(remainingMs / 1000);
    const secondsNode = document.getElementById('timer-seconds');
    const bar = document.getElementById('timer-bar');
    if (secondsNode) secondsNode.textContent = String(seconds);
    if (bar) {
      const ratio = remainingMs / (progress.questionSeconds * 1000);
      bar.style.width = `${Math.max(0, ratio) * 100}%`;
      bar.classList.toggle('urgent', ratio < .25);
    }
    if (seconds <= 5 && seconds > 0 && seconds !== lastBeepSecond) {
      lastBeepSecond = seconds;
      sound('beep', 6 - seconds);
    }
    if (remainingMs === 0) finishQuestion(false, true);
  }, 80);
}

function finishQuestion(correct, timedOut = false) {
  if (phase !== 'answering') return;
  phase = 'feedback';
  inputLocked = true;
  clearInterval(timerId);
  if (correct) { score += 1; sound('correct'); } else sound('gentle');
  feedback = {
    correct,
    timedOut,
    message: correct ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : timedOut ? 'Time’s up — let’s see it!' : 'So close — here’s how!',
  };
  renderPlay();
  feedbackId = window.setTimeout(() => {
    if (questionIndex === 9) completeSession();
    else { questionIndex += 1; prepareQuestion(); }
  }, correct ? 1050 : 2400);
}

function completeSession() {
  clearTimers();
  saveProgress(recordSession(progress, operation, levelId, score));
  finalScore = score;
  screen = 'results';
  render();
}

function renderResults() {
  const medal = medalFor(finalScore);
  app.innerHTML = `<main class="app-shell result-screen ${medal.tone}">${decorations()}${soundButton()}
    <section class="result-card"><p class="eyebrow">${operation.toUpperCase()} COMPLETE!</p>
      <div class="result-pig" aria-hidden="true">🐷</div><div class="medal" aria-hidden="true">${medal.emoji}</div>
      <h2>${medal.name}</h2><p class="big-score"><strong>${finalScore}</strong><span>/ 10</span></p>
      ${finalScore >= 8 && levelId < 8 ? `<p class="unlock-message">🔓 ${operation === 'addition' ? 'Addition' : 'Subtraction'} Level ${levelId + 1} unlocked!</p>` : ''}
      <div class="result-actions"><button class="primary-button" data-action="replay">PLAY AGAIN ↻</button>
        <button class="secondary-button" data-action="levels">CHOOSE LEVELS</button></div>
    </section></main>`;
  bindCommonActions();
  app.querySelector('[data-action="replay"]').addEventListener('click', () => startLevel(levelId));
  app.querySelector('[data-action="levels"]').addEventListener('click', () => { screen = 'levels'; render(); });
}

function bindCommonActions() {
  app.querySelector('[data-action="sound"]')?.addEventListener('click', () => {
    const enabling = !progress.soundEnabled;
    saveProgress({ ...progress, soundEnabled: enabling });
    render();
    if (enabling) sound('tap');
  });
}

function clearTimers() {
  clearInterval(timerId);
  clearTimeout(feedbackId);
  timerId = null;
  feedbackId = null;
}

function placeName(place) {
  return ['ONES', 'TENS', 'HUNDREDS', 'THOUSANDS'][place] || 'NEXT COLUMN';
}

function placeShort(place) {
  return ['O', 'T', 'H', 'TH'][place] || '';
}

document.addEventListener('keydown', (event) => {
  if (screen !== 'play' || phase !== 'answering') return;
  if (/^[0-9]$/.test(event.key)) enterDigit(Number(event.key));
  if (event.key === 'Backspace') undoDigit();
});

render();
