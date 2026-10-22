import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Delete, Lightbulb, RefreshCw, Sparkles, Star, Volume2 } from 'lucide-react';
import type { Question } from '../lessons/types';
import { isCorrect } from '../lib/answers';
import { confetti } from '../lib/confetti';
import { nextLevel } from '../lib/memory';
import { recordComeback, recordSolved } from '../lib/progress';
import { play } from '../lib/sound';
import { canSpeak, prefetchSpeech, speak, stopSpeaking } from '../lib/speech';

export interface TryResult {
  stars: number;
  /** Questions right on the first try. */
  score: number;
  total: number;
  /** Questions fixed after a first wrong try — worth celebrating. */
  comebacks: number;
}

interface TryItProps {
  /** Make the next question at a difficulty `level` (0–2). `index` is how many are done so far. */
  next: (level: number, index: number) => Question;
  goal: number;
  /** Difficulty to start at (e.g. where this child left off last time). */
  startLevel?: number;
  /** Called once per question when it is settled, for spacing, mastery and difficulty memory. */
  onAnswer?: (info: { firstTry: boolean; level: number }) => void;
  onFinish: (result: TryResult) => void;
  /** Rendered in place of the questions after finishing. */
  renderDone: (result: TryResult, restart: () => void) => ReactNode;
  title?: string;
}

/**
 * asking → (wrong) hint → (wrong again) explain: a worked solution, then the child taps the answer.
 * Research: elaborated feedback that explains *how* helps more than right/wrong alone
 * (Hattie & Timperley, 2007), and studying a worked example before trying again suits novices.
 */
type Status = 'asking' | 'wrong' | 'explain' | 'right';

// Praise the work and the strategy, not the child (process praise; Mueller & Dweck, 1998).
const PRAISE = ['You worked it out!', 'Nice thinking!', 'Great focus!', 'You thought it through!', 'Careful work pays off!', 'Smart strategy!'];
const COMEBACK = ['You kept trying and got it!', 'Great fix! Mistakes help us learn.', 'You didn’t give up. Nice!'];
const NOT_YET = ['Not yet — have another look.', 'Hmm, check again.', 'Almost! Try a different way.'];
const AFTER_EXPLAIN = 'That’s it! Now try one on your own.';

const pickOne = (list: string[]) => list[Math.floor(Math.random() * list.length)];

export function TryIt({ next, goal, startLevel = 0, onAnswer, onFinish, renderDone, title = 'Practice' }: TryItProps) {
  const [level, setLevel] = useState(startLevel);
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState<Question>(() => next(startLevel, 0));
  const [done, setDone] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [comebacks, setComebacks] = useState(0);
  const [status, setStatus] = useState<Status>('asking');
  const [tries, setTries] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<TryResult | null>(null);
  const [justFilled, setJustFilled] = useState(-1);
  const timer = useRef<number | undefined>(undefined);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Read each new question aloud when the learner has turned that on.
  useEffect(() => {
    const words = question.speak ?? question.prompt;
    speak(words);
    prefetchSpeech(words);
  }, [question]);

  useEffect(() => () => stopSpeaking(), []);

  const resetQuestion = (q: Question) => {
    setQuestion(q);
    setStatus('asking');
    setTries(0);
    setWrongPicks([]);
    setTyped('');
    setShowHint(false);
    setMessage('');
  };

  const advance = useCallback(
    (newDone: number, newScore: number, newMistakes: number, newComebacks: number, newLevel: number) => {
      if (newDone >= goal) {
        const stars = newMistakes === 0 ? 3 : newMistakes <= 2 ? 2 : 1;
        const r = { stars, score: newScore, total: goal, comebacks: newComebacks };
        setResult(r);
        onFinish(r);
        play('complete');
        confetti();
        return;
      }
      resetQuestion(next(newLevel, newDone));
    },
    [goal, next, onFinish],
  );

  /** A question is settled: update the difficulty staircase and report it. */
  const settle = (firstTry: boolean) => {
    const step = nextLevel(level, streak, firstTry);
    setLevel(step.level);
    setStreak(step.streak);
    onAnswer?.({ firstTry, level: step.level });
    return step.level;
  };

  const answer = (value: string) => {
    if (status === 'right' || result) return;
    const right = isCorrect(value, question.answer);

    if (status === 'explain') {
      // After the worked solution the child finds the answer themselves; then a fresh question.
      if (!right) return;
      setStatus('right');
      setMessage(AFTER_EXPLAIN);
      play('correct');
      const newLevel = settle(false);
      timer.current = window.setTimeout(() => advance(done, score, mistakes, comebacks, newLevel), 1400);
      return;
    }

    if (right) {
      const firstTry = tries === 0;
      const newDone = done + 1;
      const newScore = score + (firstTry ? 1 : 0);
      const newComebacks = comebacks + (firstTry ? 0 : 1);
      setStatus('right');
      setMessage(pickOne(firstTry ? PRAISE : COMEBACK));
      setDone(newDone);
      setScore(newScore);
      setComebacks(newComebacks);
      setJustFilled(newDone - 1);
      play('correct');
      recordSolved();
      if (!firstTry) recordComeback();
      const newLevel = settle(firstTry);
      timer.current = window.setTimeout(() => advance(newDone, newScore, mistakes, newComebacks, newLevel), 1100);
      return;
    }

    setMistakes(mistakes + 1);
    setTries(tries + 1);
    setWrongPicks([...wrongPicks, value]);
    play('wrong');
    if (tries + 1 >= 2) {
      setStatus('explain');
      setMessage('Let’s work it out together.');
      setTyped('');
      return;
    }
    setStatus('wrong');
    setShowHint(true);
    setMessage(pickOne(NOT_YET));
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setResult(null);
    setDone(0);
    setScore(0);
    setMistakes(0);
    setComebacks(0);
    setJustFilled(-1);
    resetQuestion(next(level, 0));
  };

  const skip = () => {
    window.clearTimeout(timer.current);
    if (result) return;
    resetQuestion(next(level, done));
  };

  const usesPad = !question.choices;

  // Physical keyboard support for the number pad.
  useEffect(() => {
    if (!usesPad || result) return;
    const onKey = (e: KeyboardEvent) => {
      // Synthetic events can target window, which has no closest().
      const t = e.target instanceof Element ? e.target : document.body;
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog && !dialog.contains(rootRef.current)) return;
      // Ignore typing while the practice tab is hidden.
      if (!rootRef.current?.offsetParent) return;
      if (t.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) setTyped((v) => (v.length < 8 ? v + e.key : v));
      else if (e.key === '.' && question.allowDecimal) setTyped((v) => (v.includes('.') ? v : v + '.'));
      else if (e.key === '-' && question.allowNegative) setTyped((v) => (v.startsWith('−') ? v.slice(1) : `−${v}`));
      else if (e.key === 'Backspace') setTyped((v) => v.slice(0, -1));
      else if (e.key === 'Enter' && typed) answer(typed);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const choiceCount = question.choices?.length ?? 0;
  const textChoices = question.choices?.every((c) => !c.label) ?? false;
  const longText = textChoices && question.choices!.some((c) => c.value.length > 4);
  const answerName = question.choices?.find((c) => isCorrect(c.value, question.answer))?.name ?? question.answer;
  const steps = question.explain?.length ? question.explain : [`The answer is ${answerName}.`];

  return (
    <section className="tryit" aria-label={title} ref={rootRef}>
      {!result && (
        <div className="tryit-head">
          <div className="goal" aria-label={`${done} of ${goal} done`}>
            {Array.from({ length: goal }, (_, i) => (
              <span key={i} className={`dot${i < done ? ' done' : ''}${i === justFilled ? ' pop' : ''}`}>
                {i < done && <Star size={12} strokeWidth={2.4} fill="white" color="var(--ink)" />}
              </span>
            ))}
          </div>
          <div className="tryit-tools">
            <button type="button" className="icon-btn" onClick={() => setShowHint(true)} disabled={!question.hint || status === 'explain'} aria-label="Show a hint" title="Hint">
              <Lightbulb size={17} />
            </button>
            <button type="button" className="icon-btn" onClick={skip} aria-label="Different question" title="Different question">
              <RefreshCw size={16} />
            </button>
            {canSpeak() && (
              <button
                type="button"
                className="icon-btn solid"
                onClick={() => speak(status === 'explain' ? steps.join(' ') : (question.speak ?? question.prompt), { force: true })}
                aria-label={status === 'explain' ? 'Read the explanation aloud' : 'Read the question aloud'}
                title="Read aloud"
              >
                <Volume2 size={17} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="tryit-body">
        {result ? (
          renderDone(result, restart)
        ) : (
          <>
            <div className="fade-up" key={question.prompt + question.answer + done}>
              <p className="prompt">{question.prompt}</p>
              {question.visual && <div className="q-visual">{question.visual}</div>}
              {status === 'explain' && (
                <div className="explain" role="status">
                  <div className="explain-head">
                    <Sparkles size={17} /> {message}
                  </div>
                  <ol>
                    {steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <div className="explain-now">{question.choices ? 'Now tap the answer.' : 'Now type the answer.'}</div>
                </div>
              )}
              {question.choices ? (
                <div className={`choices${choiceCount === 3 && !longText ? ' three' : ''}${choiceCount === 4 && textChoices && !longText ? ' four' : ''}`}>
                  {question.choices.map((c) => {
                    const isAnswer = isCorrect(c.value, question.answer);
                    const state =
                      status === 'right' && isAnswer
                        ? ' right'
                        : status === 'explain' && isAnswer
                          ? ' show-me'
                          : wrongPicks.includes(c.value)
                            ? ' wrong'
                            : '';
                    return (
                      <button
                        key={c.value}
                        type="button"
                        className={`choice${state}${longText ? ' text-sm' : ''}`}
                        onClick={() => answer(c.value)}
                        disabled={wrongPicks.includes(c.value) || status === 'right' || (status === 'explain' && !isAnswer)}
                        aria-label={c.name ?? c.value}
                      >
                        {c.label ?? c.value}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <NumberPad
                  value={typed}
                  onChange={(v) => {
                    setTyped(v);
                    if (status === 'wrong') setStatus('asking');
                  }}
                  onSubmit={() => typed && answer(typed)}
                  status={status}
                  allowDecimal={question.allowDecimal}
                  allowNegative={question.allowNegative}
                />
              )}
            </div>
            {status !== 'explain' && (message || (showHint && question.hint)) && (
              <div className={`feedback ${status === 'right' ? 'good' : 'bad'}`} role="status">
                {status === 'right' ? <Star size={18} fill="var(--star)" /> : <Lightbulb size={18} />}
                <div>
                  {message && <div className="big">{message}</div>}
                  {showHint && question.hint && status !== 'right' && <div>{question.hint}</div>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function NumberPad({
  value,
  onChange,
  onSubmit,
  status,
  allowDecimal,
  allowNegative,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  status: Status;
  allowDecimal?: boolean;
  allowNegative?: boolean;
}) {
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const press = (k: string) => {
    play('tap');
    if (k === 'del') onChange(value.slice(0, -1));
    else if (k === '.') onChange(value.includes('.') ? value : value + '.');
    else if (k === '−') onChange(value.startsWith('−') ? value.slice(1) : `−${value}`);
    else if (value.length < 8) onChange(value + k);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', allowDecimal ? '.' : '', allowNegative ? '−' : ''].filter(Boolean);
  const cls = status === 'right' ? 'right' : status === 'wrong' ? 'wrong' : '';
  return (
    <div className="pad">
      <form
        className="pad-display"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          className={cls}
          value={value}
          inputMode={touch ? 'none' : 'decimal'}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.\-−]/g, '').replace('-', '−').slice(0, 8))}
          placeholder="?"
          aria-label="Your answer"
          autoComplete="off"
        />
        <button type="submit" className="pad-go" disabled={!value || status === 'right'}>
          Check <ArrowRight size={16} style={{ verticalAlign: '-3px' }} />
        </button>
      </form>
      <div className="pad-keys">
        {keys.map((k) => (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === '−' ? 'Negative' : k}>
            {k}
          </button>
        ))}
        <button type="button" onClick={() => press('del')} aria-label="Delete">
          <Delete size={18} style={{ verticalAlign: '-3px' }} />
        </button>
      </div>
    </div>
  );
}

export function StarRow({ stars, size = 40 }: { stars: number; size?: number }) {
  return (
    <div className="done-stars" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} size={size} strokeWidth={1.6} fill={n <= stars ? 'var(--star)' : 'transparent'} color="var(--ink)" />
      ))}
    </div>
  );
}
