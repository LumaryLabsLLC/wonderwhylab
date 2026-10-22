import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Rocket } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { fmt, isCorrect } from '../../lib/answers';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { ReadAloud } from '../shared/ReadAloud';
import { ThingsPicture, thingName } from '../../visuals/Thing';
import type { ThingKind } from '../../visuals/Thing';
import './rocket-race.css';

const DURATION = 60;
/** Relaxed mode: no clock — the round is this many questions. */
export const RELAXED_QUESTIONS = 12;
/** Relaxed gates fall more slowly… */
const RELAXED_SLOW = 1.4;
/** …and stop here (just above the rocket) until the child steers. 1 = touching the rocket. */
const RELAXED_HOLD = 0.78;
/** Right gates needed to reach the moon, per band. */
const GOAL: Record<Band, number> = { 0: 8, 1: 10, 2: 10, 3: 9 };
/** Seconds a row of gates takes to reach the rocket (before any boost). */
const APPROACH: Record<Band, number> = { 0: 6.5, 1: 5.5, 2: 5.2, 3: 6 };
const KINDS: ThingKind[] = ['apple', 'star', 'ball', 'fish', 'duck', 'flower'];
const LANES = 3;

interface Question {
  prompt: string;
  picture?: ReactNode;
  /** Raw numeric values; shown with a real minus sign. */
  choices: string[];
  answer: string;
}

const label = (v: string) => fmt(Number(v));

export function makeQuestion(band: Band): Question {
  switch (band) {
    case 0: {
      if (Math.random() < 0.65) {
        const n = rand(1, 10);
        const kind = pick(KINDS);
        return {
          prompt: `How many ${thingName(kind, 2)}?`,
          picture: <ThingsPicture kind={kind} count={n} />,
          choices: numberChoices(n, { count: 3, min: 1, max: 10, spread: 2 }),
          answer: String(n),
        };
      }
      const nums = shuffle(Array.from({ length: 10 }, (_, i) => i + 1)).slice(0, 3);
      return { prompt: 'Which number is the biggest?', choices: nums.map(String), answer: String(Math.max(...nums)) };
    }
    case 1: {
      if (Math.random() < 0.55) {
        const a = rand(1, 12);
        const b = rand(1, 20 - a);
        return { prompt: `${a} + ${b} = ?`, choices: numberChoices(a + b, { count: 3, min: 0, max: 20, spread: 3 }), answer: String(a + b) };
      }
      const a = rand(5, 20);
      const b = rand(1, a);
      return { prompt: `${a} − ${b} = ?`, choices: numberChoices(a - b, { count: 3, min: 0, max: 20, spread: 3 }), answer: String(a - b) };
    }
    case 2: {
      const a = rand(2, 10);
      const b = rand(2, 10);
      if (Math.random() < 0.6) {
        // Half the time the wrong answers are neighbours in the same table: the classic slip.
        const step = Math.random() < 0.5 ? a : 1;
        return {
          prompt: `${a} × ${b} = ?`,
          choices: numberChoices(a * b, { count: 3, min: 1, max: 120, spread: 2, step }),
          answer: String(a * b),
        };
      }
      return { prompt: `${a * b} ÷ ${a} = ?`, choices: numberChoices(b, { count: 3, min: 1, max: 12, spread: 2 }), answer: String(b) };
    }
    case 3: {
      const kind = rand(0, 2);
      if (kind === 0) {
        const x = rand(1, 7);
        const y = rand(1, 9 - x);
        return {
          prompt: `0.${x} + 0.${y} = ?`,
          choices: numberChoices((x + y) / 10, { count: 3, min: 0.1, max: 1.5, step: 0.1, spread: 2 }),
          answer: String((x + y) / 10),
        };
      }
      if (kind === 1) {
        const p = pick([10, 25, 50]);
        const base = p === 25 ? pick([20, 40, 60, 80, 100, 120, 200]) : pick([20, 30, 40, 50, 60, 80, 90, 100, 120, 150, 200]);
        const ans = (base * p) / 100;
        return {
          prompt: `${p}% of ${base} = ?`,
          choices: numberChoices(ans, { count: 3, min: 1, max: 200, spread: 3, step: ans >= 20 ? 5 : 1 }),
          answer: String(ans),
        };
      }
      const a = rand(-10, 6) || -4;
      const b = rand(-8, 10) || 3;
      const shownB = b < 0 ? `(${fmt(b)})` : String(b);
      return {
        prompt: `${fmt(a)} + ${shownB} = ?`,
        choices: numberChoices(a + b, { count: 3, min: -20, max: 20, spread: 3 }),
        answer: String(a + b),
      };
    }
  }
}

function RocketArt() {
  return (
    <svg className="rocket-race-rocket" viewBox="0 0 60 104" aria-hidden>
      <g className="rocket-race-flame">
        <path d="M21 76 Q30 104 39 76 Z" fill="#ff9f43" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M25.5 76 Q30 93 34.5 76 Z" fill="#ffd23f" />
      </g>
      <path d="M16 50 L5 72 L17 68 Z" fill="#ff6b5b" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M44 50 L55 72 L43 68 Z" fill="#ff6b5b" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={20} y={64} width={20} height={11} rx={3} fill="#3b4766" stroke="#1e2b4a" strokeWidth={2.5} />
      <path d="M30 4 C45 18 47 42 44 66 L16 66 C13 42 15 18 30 4 Z" fill="white" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M30 4 C36 10 40 16 42.5 24 L17.5 24 C20 16 24 10 30 4 Z" fill="#ff6b5b" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={30} cy={41} r={8} fill="#dde9ff" stroke="#1e2b4a" strokeWidth={2.5} />
      <circle cx={27.5} cy={38.5} r={2.2} fill="white" />
    </svg>
  );
}

function Asteroid() {
  return (
    <svg className="rocket-race-rock" viewBox="0 0 100 100" aria-hidden>
      <path
        d="M50 5 C69 3 87 14 93 33 C99 51 95 71 82 84 C68 97 45 98 29 90 C13 82 3 63 7 43 C11 23 30 7 50 5 Z"
        fill="#d9cdbf"
        stroke="#1e2b4a"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <circle cx={27} cy={30} r={7} fill="#c5b6a5" />
      <circle cx={76} cy={66} r={9} fill="#c5b6a5" />
      <circle cx={70} cy={24} r={4.5} fill="#c5b6a5" />
    </svg>
  );
}

type Phase = 'waiting' | 'approach' | 'after';

interface Dims {
  w: number;
  h: number;
  gate: number;
  rocketW: number;
  rocketH: number;
  rocketY: number;
}

function measure(w: number, h: number): Dims {
  const gate = Math.max(56, Math.min((w / LANES) * 0.78, 128, h * 0.22));
  const rocketW = Math.max(40, Math.min((w / LANES) * 0.46, 70));
  const rocketH = (rocketW * 104) / 60;
  return { w, h, gate, rocketW, rocketH, rocketY: h - rocketH / 2 - 14 };
}

const laneCenter = (lane: number, w: number) => ((lane + 0.5) / LANES) * w;
const laneAt = (x: number, w: number) => Math.min(LANES - 1, Math.max(0, Math.floor((x / Math.max(1, w)) * LANES)));

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Play({ band, relaxed, onFinish }: GameProps) {
  const [question, setQuestion] = useState(() => makeQuestion(band));
  const [row, setRow] = useState(0);
  const [dims, setDims] = useState<Dims | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [hit, setHit] = useState<{ lane: number; right: boolean } | null>(null);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const [wobble, setWobble] = useState(0);
  const [boosting, setBoosting] = useState(false);
  const [answered, setAnswered] = useState(0);

  const fieldRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);

  const dimsRef = useRef<Dims | null>(null);
  dimsRef.current = dims;
  const questionRef = useRef(question);
  questionRef.current = question;
  const scoreRef = useRef(0);
  const answeredRef = useRef(0);
  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  /** Animation state, mutated every frame without re-rendering. */
  const sim = useRef({ x: -1, target: -1, lane: 1, p: -0.12, phase: 'waiting' as Phase, boost: 1, after: 1, stars: 0, steered: false });
  const drag = useRef<{ id: number; sx: number; sy: number; moved: boolean; onRocket: boolean } | null>(null);

  const slow = reducedMotion() ? 1.4 : 1;

  // Size the play field.
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const d = measure(entry.contentRect.width, entry.contentRect.height);
      const s = sim.current;
      if (s.x < 0) s.x = laneCenter(s.lane, d.w);
      s.target = laneCenter(s.lane, d.w);
      setDims(d);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Countdown. The round ends exactly once, when the time runs out. Relaxed rounds have no clock.
  useEffect(() => {
    if (relaxed) return;
    const end = performance.now() + DURATION * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, (end - performance.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0 && !done.current) {
        done.current = true;
        window.clearInterval(id);
        finishRef.current(scoreRef.current);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [relaxed]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Read each new question to younger children.
  useEffect(() => {
    speak(question.prompt);
  }, [question, band]);

  // A fresh row of gates starts its approach once it is on screen.
  useLayoutEffect(() => {
    const s = sim.current;
    s.p = row === 0 ? -0.12 : -0.04;
    s.phase = 'approach';
    s.boost = 1;
    s.after = 1;
    s.steered = false;
    setBoosting(false);
  }, [row]);

  const resolve = () => {
    const d = dimsRef.current;
    if (!d || done.current) return;
    const s = sim.current;
    const q = questionRef.current;
    const lane = laneAt(s.x, d.w);
    const right = isCorrect(q.choices[lane], q.answer);
    setHit({ lane, right });
    answeredRef.current += 1;
    setAnswered(answeredRef.current);
    const last = relaxed && answeredRef.current >= RELAXED_QUESTIONS;
    if (right) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setBurst({ id: Date.now(), x: s.x, y: d.rocketY - d.rocketH / 2 });
      play('correct');
      s.after = 1.6;
    } else {
      setWobble((n) => n + 1);
      play('wrong');
      // Let the row linger so the right answer can be seen.
      s.after = 0.22;
    }
    timers.current.push(
      window.setTimeout(
        () => {
          if (done.current) return;
          if (last) {
            done.current = true;
            finishRef.current(scoreRef.current);
            return;
          }
          setQuestion(makeQuestion(band));
          setHit(null);
          setRow((r) => r + 1);
        },
        right ? 550 : 1500,
      ),
    );
  };
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  // The game loop: steer the rocket, move the gates, scroll the stars.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const approach = APPROACH[band] * slow * (relaxed ? RELAXED_SLOW : 1);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const d = dimsRef.current;
      const s = sim.current;
      if (d && !done.current) {
        // Rocket glides toward where the child is steering.
        const before = s.x;
        s.x += (s.target - s.x) * (1 - Math.exp(-dt * 13));
        const tilt = Math.max(-18, Math.min(18, ((s.x - before) / Math.max(dt, 0.001)) * 0.03));
        if (shipRef.current) {
          shipRef.current.style.transform = `translate(${s.x - d.rocketW / 2}px, ${d.rocketY - d.rocketH / 2}px) rotate(${tilt}deg)`;
        }

        // Gates fall toward the rocket; they meet when p reaches 1.
        if (s.phase === 'approach') {
          s.p += (dt / approach) * s.boost;
          // Relaxed: the rocks wait just above the rocket until the child has steered.
          if (relaxed && !s.steered && s.p >= RELAXED_HOLD) {
            s.p = RELAXED_HOLD;
          } else if (s.p >= 1) {
            s.p = 1;
            s.phase = 'after';
            resolveRef.current();
          }
        } else if (s.phase === 'after') {
          s.p += (dt / approach) * s.after;
        }
        const startY = -d.gate / 2 - 8;
        const hitY = d.rocketY - d.rocketH * 0.22;
        const y = startY + (hitY - startY) * s.p;
        if (rowRef.current) rowRef.current.style.transform = `translateY(${y - d.gate / 2}px)`;

        // Stars drift past, faster during a boost.
        s.stars = (s.stars + dt * (s.boost > 1 && s.phase === 'approach' ? 220 : 45) / slow) % 400;
        if (starsRef.current) starsRef.current.style.backgroundPosition = `0 ${s.stars}px, 0 ${s.stars * 0.6}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [band, slow, relaxed]);

  const steerTo = (lane: number) => {
    const d = dimsRef.current;
    if (!d) return;
    const s = sim.current;
    s.lane = Math.min(LANES - 1, Math.max(0, lane));
    s.target = laneCenter(s.lane, d.w);
    s.steered = true;
  };

  const boost = () => {
    const s = sim.current;
    if (done.current || s.phase !== 'approach' || s.p > 0.9 || s.boost > 1) return;
    s.steered = true;
    s.boost = 3.4;
    setBoosting(true);
    play('whoosh');
  };

  // Keyboard: ←/→ to steer, ↑ or space to zoom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if ((t instanceof Element && t.closest('input, textarea, select')) || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') steerTo(sim.current.lane - 1);
      else if (k === 'arrowright' || k === 'd') steerTo(sim.current.lane + 1);
      else if (k === 'arrowup' || k === 'w' || k === ' ') boost();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const local = (e: ReactPointerEvent) => {
    const r = fieldRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clampX = (x: number, d: Dims) => Math.min(d.w - d.rocketW / 2, Math.max(d.rocketW / 2, x));

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dimsRef.current;
    if (!d || done.current) return;
    const p = local(e);
    const s = sim.current;
    const onRocket = Math.abs(p.x - s.x) < d.rocketW && p.y > d.rocketY - d.rocketH * 0.9;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, onRocket };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Tapping a lane sends the rocket there; touching the rocket lets you drag it.
    if (!onRocket) s.target = clampX(p.x, d);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    const d = dimsRef.current;
    if (!g || g.id !== e.pointerId || !d) return;
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 6) g.moved = true;
    if (g.moved || !g.onRocket) sim.current.target = clampX(local(e).x, d);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    const d = dimsRef.current;
    if (!g || g.id !== e.pointerId || !d) return;
    drag.current = null;
    if (g.onRocket && !g.moved) boost();
    // Settle into the nearest lane.
    steerTo(laneAt(sim.current.target, d.w));
  };

  const progress = Math.min(1, score / GOAL[band]);
  const lowTime = !relaxed && left < 10;

  return (
    <div
      className="rocket-race"
      style={dims ? ({ '--gate': `${dims.gate}px`, '--rocket-w': `${dims.rocketW}px`, '--rocket-h': `${dims.rocketH}px` } as CSSProperties) : undefined}
    >
      <div className="rocket-race-top">
        <div className="rocket-race-question" key={row} aria-live="polite">
          <p>{question.prompt} <ReadAloud text={question.prompt} label="Hear the question" /></p>
          {question.picture && <div className="rocket-race-picture">{question.picture}</div>}
        </div>
        <div className="rocket-race-meta">
          <span className="rocket-race-score" aria-label={`${score} right`}>
            <Rocket size={16} /> {score}
          </span>
          <span className="rocket-race-track" aria-hidden>
            <span className="rocket-race-track-fill" style={{ width: `${progress * 100}%` }} />
            <span className={`rocket-race-moon${progress >= 1 ? ' landed' : ''}`} />
          </span>
          {relaxed ? (
            <span className="rocket-race-time" aria-label={`Question ${Math.min(answered + 1, RELAXED_QUESTIONS)} of ${RELAXED_QUESTIONS}`}>
              {answered} / {RELAXED_QUESTIONS}
            </span>
          ) : (
            <span className={`rocket-race-time${lowTime ? ' low' : ''}`} aria-label={`${Math.ceil(left)} seconds left`}>
              {Math.ceil(left)}s
            </span>
          )}
        </div>
      </div>

      <div
        ref={fieldRef}
        className="rocket-race-field"
        role="application"
        aria-label="Steer the rocket with the left and right arrow keys. Press up to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={starsRef} className="rocket-race-stars" aria-hidden />
        <div className="rocket-race-lanes" aria-hidden>
          <span />
          <span />
        </div>
        {dims && (
          <div ref={rowRef} key={row} className={`rocket-race-row${hit ? ' passed' : ''}`} style={{ transform: 'translateY(-9999px)' }}>
            {question.choices.map((c, i) => {
              const isAnswer = isCorrect(c, question.answer);
              const state = !hit
                ? ''
                : hit.lane === i
                  ? hit.right
                    ? ' hit-right'
                    : ' hit-wrong'
                  : !hit.right && isAnswer
                    ? ' reveal'
                    : '';
              return (
                <div
                  key={c}
                  className={`rocket-race-gate${state}${label(c).length > 3 ? ' long' : ''}`}
                  style={{ left: `${((i + 0.5) / LANES) * 100}%` }}
                >
                  <Asteroid />
                  <span>{label(c)}</span>
                </div>
              );
            })}
          </div>
        )}
        {dims && (
          <div ref={shipRef} className={`rocket-race-ship${boosting ? ' boosting' : ''}`} style={{ transform: 'translateY(-9999px)' }}>
            <div key={wobble} className={wobble ? 'rocket-race-wobble' : undefined}>
              <RocketArt />
            </div>
          </div>
        )}
        {burst && (
          <div key={burst.id} className="rocket-race-burst" style={{ left: burst.x, top: burst.y }} aria-hidden>
            <b>+1</b>
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 45}deg` } as CSSProperties} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'rocket-race',
  title: 'Rocket Race',
  blurb: 'Steer your rocket through the right answers.',
  howTo: 'Drag your rocket, or tap a lane, to fly through the rock with the right answer. Tap the rocket to zoom!',
  color: '#ff6b5b',
  icon: Rocket,
  scoreLabel: 'right answers',
  Play,
};
