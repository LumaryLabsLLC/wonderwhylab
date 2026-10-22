import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { CircleDot, Star, Timer } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { ReadAloud } from '../shared/ReadAloud';
import './bubble-pop.css';

const ROUND_SECONDS = 60;
/** Relaxed mode: no clock — the round ends after this many right pops. */
export const RELAXED_GOAL = 15;
/** Relaxed bubbles drift a little slower. */
const RELAXED_SPEED = 0.8;

type Face = { kind: 'num'; text: string } | { kind: 'dots'; n: number } | { kind: 'frac'; top: number; bottom: number };

interface Item {
  face: Face;
  match: boolean;
  /** Spoken / accessible name, e.g. "3 dots" or "4 plus 3". */
  label: string;
}

interface Rule {
  goal: string;
  say: string;
  make: (match: boolean) => Item;
}

interface Bubble {
  id: number;
  /** Centre x as a fraction of the field width. */
  x: number;
  /** Centre y as a fraction of the field height (1 = bottom edge, 0 = top edge). */
  y: number;
  phase: number;
  tint: number;
  item: Item;
  state: 'float' | 'pop' | 'wobble';
  until: number;
}

const num = (text: string | number): Face => ({ kind: 'num', text: String(text) });
const decimal = (hundredths: number) => String(Number((hundredths / 100).toFixed(2)));

function otherThan(lo: number, hi: number, skip: (n: number) => boolean): number {
  for (let i = 0; i < 100; i++) {
    const n = rand(lo, hi);
    if (!skip(n)) return n;
  }
  return lo;
}

/** One rule per round, picked at random for the age band. */
function makeRule(band: Band): Rule {
  if (band === 0) {
    const t = rand(1, 5);
    return {
      goal: `Pop the ${t}s`,
      say: `Pop all the bubbles with ${t}!`,
      make: (match) => {
        const n = match ? t : otherThan(1, 5, (v) => v === t);
        const dots = Math.random() < 0.5;
        return { face: dots ? { kind: 'dots', n } : num(n), match, label: dots ? `${n} dots` : String(n) };
      },
    };
  }
  if (band === 1) {
    if (Math.random() < 0.5) {
      return {
        goal: 'Pop the even numbers',
        say: 'Pop the even numbers! Even numbers make pairs: 2, 4, 6, 8.',
        make: (match) => {
          const n = match ? 2 * rand(1, 10) : 2 * rand(0, 9) + 1;
          return { face: num(n), match, label: String(n) };
        },
      };
    }
    const target = rand(6, 10);
    return {
      goal: `Pop sums that make ${target}`,
      say: `Pop the sums that make ${target}!`,
      make: (match) => {
        const total = match ? target : Math.max(2, target + pick([-2, -1, 1, 2]));
        const a = rand(1, total - 1);
        return { face: num(`${a} + ${total - a}`), match, label: `${a} plus ${total - a}` };
      },
    };
  }
  if (band === 2) {
    if (Math.random() < 0.5) {
      const k = rand(3, 9);
      return {
        goal: `Pop multiples of ${k}`,
        say: `Pop the multiples of ${k}!`,
        make: (match) => {
          const n = match ? k * rand(1, 10) : otherThan(2, k * 10, (v) => v % k === 0);
          return { face: num(n), match, label: String(n) };
        },
      };
    }
    const target = pick([12, 16, 18, 20, 24, 30, 36]);
    const pairs: [number, number][] = [];
    for (let a = 2; a <= 12; a++) if (target % a === 0 && target / a >= 2 && target / a <= 12) pairs.push([a, target / a]);
    return {
      goal: `Pop facts that make ${target}`,
      say: `Pop the times facts that make ${target}!`,
      make: (match) => {
        let [a, b] = match ? pick(pairs) : [rand(2, 9), rand(2, 9)];
        while (!match && a * b === target) [a, b] = [rand(2, 9), rand(2, 9)];
        return { face: num(`${a} × ${b}`), match, label: `${a} times ${b}` };
      },
    };
  }
  if (Math.random() < 0.5) {
    return {
      goal: 'Pop numbers bigger than 0.5',
      say: 'Pop the numbers bigger than one half!',
      make: (match) => {
        const text = decimal(match ? rand(51, 99) : rand(1, 50));
        return { face: num(text), match, label: text };
      },
    };
  }
  const others: [number, number][] = [
    [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [3, 8], [5, 8], [4, 6], [2, 6], [3, 10], [7, 10], [1, 5], [4, 5],
  ];
  return {
    goal: 'Pop fractions equal to ½',
    say: 'Pop the fractions that are the same as one half!',
    make: (match) => {
      const [top, bottom] = match ? (() => { const n = rand(1, 6); return [n, 2 * n] as [number, number]; })() : pick(others);
      return { face: { kind: 'frac', top, bottom }, match, label: `${top} over ${bottom}` };
    },
  };
}

/** Tuning per band: how fast bubbles rise (field heights per second) and how often they appear. */
const SPEED = [0.085, 0.1, 0.115, 0.13];
const SPAWN_EVERY = [1.15, 1.0, 0.9, 0.8];
const MATCH_CHANCE = 0.42;

const DOT_SPOTS: Record<number, [number, number][]> = {
  1: [[30, 30]],
  2: [[18, 18], [42, 42]],
  3: [[16, 16], [30, 30], [44, 44]],
  4: [[18, 18], [42, 18], [18, 42], [42, 42]],
  5: [[16, 16], [44, 16], [30, 30], [16, 44], [44, 44]],
  6: [[18, 14], [42, 14], [18, 30], [42, 30], [18, 46], [42, 46]],
};

function FaceView({ face, size }: { face: Face; size: number }) {
  if (face.kind === 'dots') {
    return (
      <svg className="bubble-pop-dots" viewBox="0 0 60 60" width={size * 0.56} height={size * 0.56} aria-hidden>
        {DOT_SPOTS[face.n].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={6.5} fill="#1e2b4a" />
        ))}
      </svg>
    );
  }
  if (face.kind === 'frac') {
    return (
      <span className="bubble-pop-frac" style={{ fontSize: size * 0.26 }} aria-hidden>
        <span>{face.top}</span>
        <span className="bubble-pop-frac-bar" />
        <span>{face.bottom}</span>
      </span>
    );
  }
  const scale = face.text.length <= 2 ? 0.38 : face.text.length <= 4 ? 0.29 : face.text.length <= 5 ? 0.25 : 0.21;
  return (
    <span className="bubble-pop-text" style={{ fontSize: size * scale }} aria-hidden>
      {face.text}
    </span>
  );
}

function Play({ band, relaxed, onFinish }: GameProps) {
  const [rule] = useState(() => makeRule(band));
  const fieldRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState({ w: 0, h: 0 });
  const bubbles = useRef<Bubble[]>([]);
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [over, setOver] = useState(false);
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const nextId = useRef(0);
  const clock = useRef(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setField({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    speak(rule.say);
  }, [band, rule]);

  const size = field.w ? Math.round(Math.min(118, Math.max(80, field.w / 8))) : 90;

  // Game loop: move bubbles, spawn new ones, run the clock.
  useEffect(() => {
    if (!field.w || !field.h) return;
    let raf = 0;
    let last = 0;
    let sinceSpawn = SPAWN_EVERY[band];
    let lastLanes: number[] = [];
    const lanes = Math.max(3, Math.floor(field.w / (size * 1.12)));
    const speed = SPEED[band] * (relaxed ? RELAXED_SPEED : 1);
    const half = size / 2 / field.h;
    let endTimer: number | undefined;

    const spawn = (y: number) => {
      const onScreenMatch = bubbles.current.some((b) => b.state !== 'pop' && b.item.match && b.y > -half);
      const match = !onScreenMatch || Math.random() < MATCH_CHANCE;
      let lane = rand(0, lanes - 1);
      for (let i = 0; i < 6 && lastLanes.includes(lane); i++) lane = rand(0, lanes - 1);
      lastLanes = [lane, ...lastLanes].slice(0, Math.min(2, lanes - 1));
      bubbles.current.push({
        id: nextId.current++,
        x: (lane + 0.5) / lanes,
        y,
        phase: Math.random() * Math.PI * 2,
        tint: rand(0, 5),
        item: rule.make(match),
        state: 'float',
        until: 0,
      });
    };

    if (bubbles.current.length === 0) {
      spawn(0.78);
      spawn(0.52);
      spawn(1 + half);
    }

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      clock.current += dt;
      const t = clock.current;

      for (const b of bubbles.current) {
        if (b.state !== 'pop') b.y -= speed * dt;
        if (b.state === 'wobble' && t > b.until) b.state = 'float';
      }
      bubbles.current = bubbles.current.filter((b) => (b.state === 'pop' ? t < b.until : b.y > -half));

      // Relaxed rounds have no clock: they end once enough bubbles are popped.
      const remaining = relaxed ? Infinity : Math.max(0, ROUND_SECONDS - t);
      const over = relaxed ? scoreRef.current >= RELAXED_GOAL : remaining <= 0;
      if (!over) {
        sinceSpawn += dt;
        if (sinceSpawn >= SPAWN_EVERY[band] / (relaxed ? RELAXED_SPEED : 1)) {
          sinceSpawn = 0;
          spawn(1 + half);
        }
      }
      if (!relaxed) setTimeLeft(Math.ceil(remaining));
      render();

      if (over && !finished.current) {
        finished.current = true;
        setOver(true);
        play('complete');
        endTimer = window.setTimeout(() => finishRef.current(scoreRef.current), 1200);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(endTimer);
    };
  }, [field.w, field.h, size, band, rule, relaxed]);

  const tap = (b: Bubble) => {
    if (b.state === 'pop' || finished.current || (relaxed && scoreRef.current >= RELAXED_GOAL)) return;
    if (b.item.match) {
      b.state = 'pop';
      b.until = clock.current + 0.45;
      scoreRef.current += 1;
      setScore(scoreRef.current);
      play('pop');
    } else {
      b.state = 'wobble';
      b.until = clock.current + 0.45;
      play('wrong');
    }
    render();
  };

  const sway = (b: Bubble) => Math.sin(clock.current * 1.3 + b.phase) * 0.012;

  return (
    <div className="bubble-pop">
      <div className="bubble-pop-hud">
        <div className="bubble-pop-goal" aria-live="polite">
          {rule.goal}
          <ReadAloud text={rule.say} />
        </div>
        <div className="bubble-pop-chips">
          {relaxed ? (
            <span className="bubble-pop-chip" aria-label={`${score} of ${RELAXED_GOAL} popped`}>
              <Star size={18} fill="var(--sun)" strokeWidth={2} /> {score} / {RELAXED_GOAL}
            </span>
          ) : (
            <>
              <span className="bubble-pop-chip" aria-label={`${score} popped`}>
                <Star size={18} fill="var(--sun)" strokeWidth={2} /> {score}
              </span>
              <span className={`bubble-pop-chip${timeLeft <= 10 ? ' low' : ''}`} aria-label={`${timeLeft} seconds left`}>
                <Timer size={18} strokeWidth={2} /> {timeLeft}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="bubble-pop-field" ref={fieldRef}>
        {bubbles.current.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`bubble-pop-bubble tint-${b.tint}${b.state === 'pop' ? ' popped' : ''}${b.state === 'wobble' ? ' wobble' : ''}`}
            style={{
              width: size,
              height: size,
              transform: `translate(${(b.x + sway(b)) * field.w - size / 2}px, ${b.y * field.h - size / 2}px)`,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              tap(b);
            }}
            onClick={(e) => {
              if (e.detail === 0) tap(b);
            }}
            aria-label={b.item.label}
            disabled={b.state === 'pop' || over}
          >
            <span className="bubble-pop-inner">
              <FaceView face={b.item.face} size={size} />
              {b.state === 'pop' && <span className="bubble-pop-plus">+1</span>}
            </span>
          </button>
        ))}
        {over && <div className="bubble-pop-over">{relaxed ? 'All popped!' : 'Time’s up!'}</div>}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'bubble-pop',
  title: 'Bubble Pop',
  blurb: 'Pop the bubbles that match the rule.',
  howTo: 'Bubbles float up. Tap the ones that match the rule at the top!',
  color: '#3b8cff',
  icon: CircleDot,
  scoreLabel: 'bubbles popped',
  Play,
};
