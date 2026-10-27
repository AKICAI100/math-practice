'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, checkAnswer, generateProblem, loadProgress, medalFor } from '@/lib/game.js';

type Screen = 'title' | 'levels' | 'play' | 'results';
type Problem = ReturnType<typeof generateProblem>;
type Progress = { version: number; unlockedLevel: number; bestScores: Record<string, number>; soundEnabled: boolean };

const STORAGE_KEY = 'piggy-math-progress-v1';
const PRAISE = ['Great!', 'Nice!', 'Perfect!', 'Oink-credible!'];

export default function Home() {
  const [screen, setScreen] = useState<Screen>('title');
  const [progress, setProgress] = useState<Progress>(() => loadProgress(null) as Progress);
  const [levelId, setLevelId] = useState(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [digits, setDigits] = useState<(number | null)[]>([]);
  const [carryMarks, setCarryMarks] = useState<number[]>([]);
  const [activePlace, setActivePlace] = useState(0);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [feedback, setFeedback] = useState<{ correct: boolean; timedOut: boolean; message: string } | null>(null);
  const [remainingMs, setRemainingMs] = useState(10000);
  const [finalScore, setFinalScore] = useState(0);
  const usedProblems = useRef(new Set<string>());
  const deadline = useRef(0);
  const lastBeepSecond = useRef(-1);
  const ending = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProgress(loadProgress(localStorage.getItem(STORAGE_KEY)) as Progress);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const saveProgress = useCallback((next: Progress) => {
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const sound = useCallback((kind: 'tap' | 'beep' | 'correct' | 'gentle', urgency = 0) => {
    if (!progress.soundEnabled || typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    oscillator.onended = () => void context.close();
  }, [progress.soundEnabled]);

  const questionTime = useMemo(() => (LEVELS[levelId - 1]?.digits === 2 ? 10000 : 15000), [levelId]);

  const prepareQuestion = useCallback((id: number) => {
    const nextProblem = generateProblem(id, Math.random, usedProblems.current);
    usedProblems.current.add(nextProblem.key);
    setProblem(nextProblem);
    setDigits(Array(nextProblem.answerDigits.length).fill(null));
    setCarryMarks(Array(nextProblem.answerDigits.length - 1).fill(0));
    setActivePlace(0);
    setFeedback(null);
    setPhase('answering');
    const duration = LEVELS[id - 1].digits === 2 ? 10000 : 15000;
    setRemainingMs(duration);
    deadline.current = performance.now() + duration;
    lastBeepSecond.current = -1;
    ending.current = false;
  }, []);

  const completeSession = useCallback((sessionScore: number) => {
    const best = Math.max(progress.bestScores[levelId] ?? 0, sessionScore);
    const unlockedLevel = sessionScore >= 8 ? Math.max(progress.unlockedLevel, Math.min(8, levelId + 1)) : progress.unlockedLevel;
    saveProgress({ ...progress, unlockedLevel, bestScores: { ...progress.bestScores, [levelId]: best } });
    setFinalScore(sessionScore);
    setScreen('results');
  }, [levelId, progress, saveProgress]);

  const finishQuestion = useCallback((correct: boolean, timedOut = false) => {
    if (ending.current || phase !== 'answering') return;
    ending.current = true;
    const nextScore = score + (correct ? 1 : 0);
    if (correct) {
      setScore(nextScore);
      sound('correct');
    } else {
      sound('gentle');
    }
    setPhase('feedback');
    setFeedback({
      correct,
      timedOut,
      message: correct ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : timedOut ? 'Time’s up — let’s see it!' : 'So close — here’s how!',
    });
    window.setTimeout(() => {
      if (questionIndex === 9) completeSession(nextScore);
      else {
        setQuestionIndex((value) => value + 1);
        prepareQuestion(levelId);
      }
    }, correct ? 1050 : 2400);
  }, [completeSession, levelId, phase, prepareQuestion, questionIndex, score, sound]);

  useEffect(() => {
    if (screen !== 'play' || phase !== 'answering' || !problem) return;
    const interval = window.setInterval(() => {
      const next = Math.max(0, deadline.current - performance.now());
      setRemainingMs(next);
      const seconds = Math.ceil(next / 1000);
      if (seconds <= 5 && seconds > 0 && seconds !== lastBeepSecond.current) {
        lastBeepSecond.current = seconds;
        sound('beep', 6 - seconds);
      }
      if (next === 0) finishQuestion(false, true);
    }, 80);
    return () => window.clearInterval(interval);
  }, [finishQuestion, phase, problem, screen, sound]);

  const startLevel = useCallback((id: number) => {
    usedProblems.current = new Set();
    setLevelId(id);
    setQuestionIndex(0);
    setScore(0);
    setScreen('play');
    prepareQuestion(id);
    sound('tap');
  }, [prepareQuestion, sound]);

  useEffect(() => {
    type ModelContext = { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'start_piggy_math_level',
        title: 'Start Piggy Math level',
        description: 'Start an unlocked Piggy Math practice session at a chosen level.',
        inputSchema: { type: 'object', properties: { level: { type: 'integer', minimum: 1, maximum: 8 } }, required: ['level'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input: unknown) {
          const requested = Number((input as { level?: number })?.level);
          if (!Number.isInteger(requested) || requested < 1 || requested > progress.unlockedLevel) throw new Error('That level is locked or invalid.');
          startLevel(requested);
          return { started: true, level: requested, questions: 10 };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch { /* Unsupported preview implementation. */ }
    return () => lifecycle.abort();
  }, [progress.unlockedLevel, startLevel]);

  function enterDigit(value: number) {
    if (phase !== 'answering' || !problem || activePlace >= digits.length) return;
    sound('tap');
    setDigits((current) => current.map((digit, index) => (index === activePlace ? value : digit)));
    setActivePlace((place) => place + 1);
  }

  function undoDigit() {
    if (phase !== 'answering' || activePlace === 0) return;
    const target = activePlace - 1;
    sound('tap');
    setDigits((current) => current.map((digit, index) => (index === target ? null : digit)));
    setActivePlace(target);
  }

  function toggleCarry(index: number) {
    if (phase !== 'answering' || index !== activePlace - 1 || activePlace >= digits.length) return;
    sound('tap');
    setCarryMarks((current) => current.map((mark, markIndex) => (markIndex === index ? 1 - mark : mark)));
  }

  function submitAnswer() {
    if (!problem || digits.some((digit) => digit === null)) return;
    finishQuestion(checkAnswer(problem, digits, carryMarks));
  }

  function toggleSound() {
    const next = { ...progress, soundEnabled: !progress.soundEnabled };
    saveProgress(next);
    if (next.soundEnabled) window.setTimeout(() => sound('tap'), 0);
  }

  const sharedSound = (
    <button className="sound-button" onClick={toggleSound} aria-label={progress.soundEnabled ? 'Turn sound off' : 'Turn sound on'}>
      {progress.soundEnabled ? '🔊' : '🔇'}
    </button>
  );

  if (screen === 'title') {
    return (
      <main className="app-shell title-screen">
        <Decorations />
        {sharedSound}
        <section className="title-card" aria-labelledby="app-title">
          <div className="mascot bounce" aria-label="Happy pig">🐷</div>
          <p className="eyebrow">COLUMN ADDITION CHALLENGE</p>
          <h1 id="app-title">PIGGY<br />MATH</h1>
          <p className="title-copy">Add it up, one column at a time!</p>
          <button className="start-button" onClick={() => { setScreen('levels'); sound('tap'); }}>
            <span>START</span><span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  if (screen === 'levels') {
    return (
      <main className="app-shell level-screen">
        <Decorations compact />
        <header className="top-bar">
          <button className="round-button" onClick={() => setScreen('title')} aria-label="Back to title">←</button>
          <div><p className="eyebrow">PICK YOUR CHALLENGE</p><h2>Choose a Level</h2></div>
          {sharedSound}
        </header>
        <section className="level-grid" aria-label="Levels">
          {LEVELS.map((level) => {
            const locked = level.id > progress.unlockedLevel;
            const best = progress.bestScores[level.id];
            return (
              <button key={level.id} className={`level-card ${level.color} ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => startLevel(level.id)}>
                <span className="level-number">{level.id}</span>
                <span className="level-icon" aria-hidden="true">{locked ? '🔒' : level.digits === 2 ? '🐽' : '🐷'}</span>
                <span className="level-digits">{level.digits} DIGITS</span>
                <strong>{locked ? 'Locked' : level.title}</strong>
                <span className="level-tag">{locked ? `Score 8+ on Level ${level.id - 1}` : level.tag}</span>
                {!locked && best !== undefined && <span className="best-score">★ BEST {best}/10</span>}
              </button>
            );
          })}
        </section>
      </main>
    );
  }

  if (screen === 'results') {
    const medal = medalFor(finalScore);
    return (
      <main className={`app-shell result-screen ${medal.tone}`}>
        <Decorations />
        {sharedSound}
        <section className="result-card">
          <p className="eyebrow">SESSION COMPLETE!</p>
          <div className="result-pig" aria-hidden="true">🐷</div>
          <div className="medal" aria-hidden="true">{medal.emoji}</div>
          <h2>{medal.name}</h2>
          <p className="big-score"><strong>{finalScore}</strong><span>/ 10</span></p>
          {finalScore >= 8 && levelId < 8 && <p className="unlock-message">🔓 Level {levelId + 1} unlocked!</p>}
          <div className="result-actions">
            <button className="primary-button" onClick={() => startLevel(levelId)}>PLAY AGAIN ↻</button>
            <button className="secondary-button" onClick={() => setScreen('levels')}>CHOOSE LEVELS</button>
          </div>
        </section>
      </main>
    );
  }

  const timeRatio = Math.max(0, Math.min(1, remainingMs / questionTime));
  const allEntered = digits.length > 0 && digits.every((digit) => digit !== null);

  return (
    <main className="app-shell play-screen">
      <header className="game-header">
        <button className="round-button" onClick={() => setScreen('levels')} aria-label="Exit session">×</button>
        <div className="question-progress">
          <span>QUESTION {questionIndex + 1} / 10</span>
          <div className="pig-dots" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} className={index <= questionIndex ? 'done' : ''}>{index === questionIndex ? '🐷' : ''}</i>)}</div>
        </div>
        {sharedSound}
      </header>

      <div className="game-layout">
        <section className="work-card" aria-label="Written addition problem">
          <output className={`feedback-banner ${feedback?.correct ? 'is-correct' : ''}`} aria-live="polite">
            {feedback && <><span>{feedback.correct ? '✨' : '💡'}</span>{feedback.message}</>}
          </output>
          <div className="timer-row">
            <span className="timer-label">⏱ {Math.ceil(remainingMs / 1000)}s</span>
            <div className="timer-track"><span style={{ width: `${timeRatio * 100}%` }} className={timeRatio < .25 ? 'urgent' : ''} /></div>
            <span className="score-chip">★ {score}</span>
          </div>
          {problem && (
            <ColumnBoard
              problem={problem}
              digits={digits}
              carryMarks={carryMarks}
              activePlace={activePlace}
              reveal={phase === 'feedback' && !feedback?.correct}
              onCarry={toggleCarry}
            />
          )}
          {phase === 'answering' && (
            <p className="column-hint">
              {activePlace === 0 ? 'Start with the ONES →' : activePlace < digits.length ? `Now the ${placeName(activePlace)}!` : 'Ready to check!'}
            </p>
          )}
        </section>

        <section className={`keypad-card ${phase !== 'answering' ? 'disabled' : ''}`} aria-label="Number keypad">
          <p>Tap your answer</p>
          <div className="keypad">
            {[1,2,3,4,5,6,7,8,9].map((number) => <button key={number} disabled={phase !== 'answering' || allEntered} onClick={() => enterDigit(number)}>{number}</button>)}
            <button className="undo-key" disabled={phase !== 'answering' || activePlace === 0} onClick={undoDigit} aria-label="Undo">⌫</button>
            <button disabled={phase !== 'answering' || allEntered} onClick={() => enterDigit(0)}>0</button>
            <button className="check-key" disabled={!allEntered || phase !== 'answering'} onClick={submitAnswer} aria-label="Check answer">✓</button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ColumnBoard({ problem, digits, carryMarks, activePlace, reveal, onCarry }: {
  problem: Problem;
  digits: (number | null)[];
  carryMarks: number[];
  activePlace: number;
  reveal: boolean;
  onCarry: (index: number) => void;
}) {
  const places = Array.from({ length: problem.answerDigits.length }, (_, index) => problem.answerDigits.length - 1 - index);
  const paddedLeft = String(problem.left).padStart(problem.answerDigits.length, ' ');
  const paddedRight = String(problem.right).padStart(problem.answerDigits.length, ' ');
  return (
    <div className={`column-board ${reveal ? 'revealing' : ''}`} style={{ '--columns': problem.answerDigits.length } as React.CSSProperties}>
      <div className="carry-row">
        {places.map((place, renderIndex) => {
          const carryIndex = place - 1;
          const editable = !reveal && carryIndex >= 0 && carryIndex === activePlace - 1 && activePlace < digits.length;
          const shown = reveal ? (carryIndex >= 0 ? problem.carries[carryIndex] : 0) : (carryIndex >= 0 ? carryMarks[carryIndex] : 0);
          return carryIndex >= 0 ? (
            <button key={place} className={`carry-box ${editable ? 'active' : ''} ${shown ? 'marked' : ''}`} disabled={!editable} onClick={() => onCarry(carryIndex)} aria-label={`Carry into ${placeName(place)} column: ${shown ? 'one' : 'blank'}`}>
              {shown ? '1' : ''}
            </button>
          ) : <span key={renderIndex} />;
        })}
      </div>
      <div className="operand-row">{Array.from(paddedLeft).map((digit, index) => <span key={index}>{digit}</span>)}</div>
      <div className="operand-row second"><b aria-hidden="true">+</b>{Array.from(paddedRight).map((digit, index) => <span key={index}>{digit}</span>)}</div>
      <div className="sum-line" />
      <div className="answer-row">
        {places.map((place) => {
          const current = place === activePlace;
          const value = reveal ? problem.answerDigits[place] : digits[place];
          return <span key={place} className={`${current ? 'active' : ''} ${value !== null ? 'filled' : ''}`}>{value ?? ''}</span>;
        })}
      </div>
      <div className="place-row">{places.map((place) => <span key={place}>{placeShort(place)}</span>)}</div>
    </div>
  );
}

function Decorations({ compact = false }: { compact?: boolean }) {
  return <><div className={`cloud cloud-one ${compact ? 'compact' : ''}`} /><div className="cloud cloud-two" /><div className="confetti c1" /><div className="confetti c2" /><div className="grass" aria-hidden="true" /></>;
}

function placeName(place: number) {
  return ['ONES', 'TENS', 'HUNDREDS', 'THOUSANDS'][place] ?? 'NEXT COLUMN';
}

function placeShort(place: number) {
  return ['O', 'T', 'H', 'TH'][place] ?? '';
}
