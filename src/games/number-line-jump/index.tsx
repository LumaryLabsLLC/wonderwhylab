import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Ruler, Star } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { fmt } from '../../lib/answers';
import { C, shade } from '../../lib/color';
import { rand, round, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { ReadAloud } from '../shared/ReadAloud';
import { clamp, toSvgPoint } from '../../lib/svg';
import './number-line-jump.css';

const ROUNDS = 10;
const JUMP_MS = 650;
const AUTO_NEXT_MS = 2600;
/** How high the frog floats while it is being dragged. */
const DRAG_LIFT = 22;

interface Line {
  min: number;
  max: number;
  /** Distance between ticks. */
  step: number;
  /** Label every n-th tick. */
  labelEvery: number;
  /** Taps snap to multiples of this. */
  snap: number;
  /** Largest miss (in line units) that still earns 3, 2 and 1 points. */
  near: [number, number, number];
}

const LINES = {
  tens: { min: 0, max: 10, step: 1, labelEvery: 1, snap: 1, near: [0, 1, 2] },
  twenty: { min: 0, max: 20, step: 1, labelEvery: 10, snap: 1, near: [0, 1, 3] },
  hundred: { min: 0, max: 100, step: 10, labelEvery: 5, snap: 1, near: [2, 6, 12] },
  decimal: { min: 0, max: 1, step: 0.1, labelEvery: 5, snap: 0.01, near: [0.03, 0.08, 0.15] },
  negative: { min: -10, max: 10, step: 1, labelEvery: 10, snap: 1, near: [0, 1, 3] },
} satisfies Record<string, Line>;

interface Round {
  line: Line;
  target: number;
}

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function makeRounds(band: Band): Round[] {
  switch (band) {
    case 0: {
      const pool = shuffle(range(1, 9));
      return [...pool, rand(1, 9)].map((target) => ({ line: LINES.tens, target }));
    }
    case 1:
      return shuffle(range(1, 19).filter((n) => n !== 10))
        .slice(0, ROUNDS)
        .map((target) => ({ line: LINES.twenty, target }));
    case 2:
      return shuffle(range(1, 99).filter((n) => n !== 50))
        .slice(0, ROUNDS)
        .map((target) => ({ line: LINES.hundred, target }));
    case 3: {
      const decimals = shuffle([0.1, 0.2, 0.25, 0.3, 0.4, 0.6, 0.7, 0.75, 0.8, 0.9]).slice(0, ROUNDS / 2);
      const negatives = shuffle(range(-9, 9).filter((n) => n !== 0)).slice(0, ROUNDS / 2);
      return decimals.flatMap((d, i) => [
        { line: LINES.decimal, target: d },
        { line: LINES.negative, target: negatives[i] },
      ]);
    }
  }
}

function pointsFor(line: Line, guess: number, target: number) {
  const miss = Math.abs(guess - target) + 1e-9;
  return miss <= line.near[0] + 1e-6 ? 3 : miss <= line.near[1] + 1e-6 ? 2 : miss <= line.near[2] + 1e-6 ? 1 : 0;
}

const MESSAGES = ['Good try! It lives here.', 'Nearly there!', 'So close!', 'Spot on!'];

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Phase = 'aim' | 'jump' | 'reveal';

function Play({ band, onFinish }: GameProps) {
  const rounds = useMemo(() => makeRounds(band), [band]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('aim');
  const [total, setTotal] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [earned, setEarned] = useState(0);
  /** Where the frog sits, as a fraction of the line (0 = left end), plus its height while jumping. */
  const [frog, setFrog] = useState({ frac: 0, lift: 0 });
  /** Mouse/keyboard/drag preview of where the frog would land (snapped). */
  const [aimFrac, setAimFrac] = useState<number | null>(null);
  /** While the child drags the frog: where the finger is, as a fraction of the line. */
  const [dragFrac, setDragFrac] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const raf = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const finished = useRef(false);

  const { line, target } = rounds[index];
  const span = line.max - line.min;

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(timer.current);
    },
    [],
  );

  // Say the target out loud for younger children.
  useEffect(() => {
    speak(`Where does ${target} go?`);
  }, [band, index, target]);

  // Geometry, in screen pixels (the SVG viewBox matches the box 1:1).
  const w = Math.max(280, size.w);
  const h = Math.max(220, size.h);
  const padX = Math.max(34, Math.min(70, w * 0.06));
  const lineW = w - padX * 2;
  const lineY = Math.round(h * 0.68);
  const arc = Math.min(150, h * 0.42);
  const X = (frac: number) => padX + frac * lineW;
  const fracOf = (value: number) => (value - line.min) / span;
  const small = w < 560;
  const font = small ? 17 : 22;

  const snapFrac = (frac: number) => {
    const value = round(line.min + clamp(frac, 0, 1) * span);
    const snapped = round(Math.round(value / line.snap) * line.snap);
    return { value: clamp(snapped, line.min, line.max), frac: fracOf(clamp(snapped, line.min, line.max)) };
  };

  const next = () => {
    window.clearTimeout(timer.current);
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(total);
      }
      return;
    }
    setIndex(index + 1);
    setGuess(null);
    setAimFrac(null);
    setPhase('aim');
  };

  const land = (value: number) => {
    const pts = pointsFor(line, value, target);
    setEarned(pts);
    setTotal((t) => t + pts);
    setPhase('reveal');
    play(pts >= 2 ? 'correct' : pts === 1 ? 'pop' : 'wrong');
    timer.current = window.setTimeout(() => nextRef.current(), AUTO_NEXT_MS);
  };

  // The auto-advance timer must call the latest `next` (it closes over index/total).
  const nextRef = useRef(next);
  nextRef.current = next;

  /** Jump to the snapped spot nearest `frac`. A drag ends with a little hop from where the frog was let go. */
  const jumpTo = (frac: number, fromDrag?: number) => {
    if (phase !== 'aim') return;
    const { value, frac: to } = snapFrac(frac);
    setGuess(value);
    setAimFrac(null);
    setDragFrac(null);
    setPhase('jump');
    play('tap');
    const from = fromDrag ?? frog.frac;
    const height = fromDrag === undefined ? arc : arc * 0.3;
    const lift0 = fromDrag === undefined ? 0 : DRAG_LIFT;
    if (reducedMotion()) {
      setFrog({ frac: to, lift: 0 });
      land(value);
      return;
    }
    const start = performance.now();
    const duration = fromDrag === undefined ? JUMP_MS : JUMP_MS * 0.6;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setFrog({ frac: from + (to - from) * eased, lift: 4 * height * t * (1 - t) + lift0 * (1 - t) });
      if (t < 1) raf.current = requestAnimationFrame(step);
      else land(value);
    };
    raf.current = requestAnimationFrame(step);
  };

  // Dragging the frog: it follows the finger along the line, and a ghost marker shows where it will land.
  const onFrogDown = (e: ReactPointerEvent<SVGElement>) => {
    if (phase !== 'aim') return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = clamp(fracFromEvent(e), 0, 1);
    setDragFrac(f);
    setAimFrac(snapFrac(f).frac);
    play('pop');
  };

  const onFrogMove = (e: ReactPointerEvent<SVGElement>) => {
    if (dragFrac === null || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const f = clamp(fracFromEvent(e), 0, 1);
    const snapped = snapFrac(f).frac;
    if (snapped !== aimFrac) play('tap');
    setDragFrac(f);
    setAimFrac(snapped);
  };

  const onFrogUp = (e: ReactPointerEvent<SVGElement>, cancelled = false) => {
    if (dragFrac === null) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const f = clamp(fracFromEvent(e), 0, 1);
    if (cancelled) {
      setDragFrac(null);
      setAimFrac(null);
      return;
    }
    jumpTo(f, dragFrac);
  };

  const fracFromEvent = (e: ReactPointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const p = toSvgPoint(svg, e.clientX, e.clientY);
    return (p.x - padX) / lineW;
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (phase === 'reveal' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      next();
      return;
    }
    if (phase !== 'aim') return;
    const unit = (line.snap / span) * (e.shiftKey ? 10 : 1);
    const nudge = line === LINES.hundred ? unit * 5 : line === LINES.decimal ? unit * 5 : unit;
    const current = aimFrac ?? frog.frac;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setAimFrac(snapFrac(current + (e.key === 'ArrowRight' ? nudge : -nudge)).frac);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      jumpTo(current);
    }
  };

  // Ticks
  const ticks: { value: number; label: boolean }[] = [];
  for (let i = 0, v = line.min; v <= line.max + 1e-9; i++, v = round(line.min + i * line.step)) {
    ticks.push({ value: v, label: i % line.labelEvery === 0 });
  }

  const dragging = dragFrac !== null;
  const frogX = X(dragging ? dragFrac : frog.frac);
  const frogY = lineY - 6 - (dragging ? DRAG_LIFT : frog.lift);
  const frogSize = small ? 50 : 60;
  /** Younger children see the number under the ghost marker; older ones estimate. */
  const showAimNumber = band <= 1;
  const targetX = X(fracOf(target));
  const guessX = guess === null ? null : X(fracOf(guess));
  const aimX = aimFrac === null ? null : X(aimFrac);

  return (
    <div className="number-line-jump">
      <div className="nlj-hud">
        <p className="nlj-goal">
          Where does <span className="nlj-target">{fmt(target)}</span> go?
          <ReadAloud text={`Where does ${target} go?`} />
        </p>
        <div className="nlj-stats" aria-label={`Round ${index + 1} of ${ROUNDS}, ${total} points`}>
          <span className="nlj-pill">
            {index + 1}/{ROUNDS}
          </span>
          <span className="nlj-pill">
            <Star size={16} fill="var(--star)" strokeWidth={2} /> {total}
          </span>
        </div>
      </div>

      <div className="nlj-stage" ref={boxRef}>
        {size.w > 0 && (
          <svg
            ref={svgRef}
            className={`nlj-svg${phase === 'aim' ? ' aiming' : ''}`}
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            role="application"
            tabIndex={0}
            aria-label={`Number line from ${fmt(line.min)} to ${fmt(line.max)}. Tap where ${fmt(target)} goes, or use the arrow keys and Enter.`}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => jumpTo(fracFromEvent(e))}
            onPointerMove={(e) => {
              if (phase === 'aim' && !dragging && e.pointerType === 'mouse') setAimFrac(snapFrac(fracFromEvent(e)).frac);
            }}
            onPointerLeave={() => !dragging && setAimFrac(null)}
          >
            {/* the line */}
            <line x1={padX - 18} y1={lineY} x2={padX + lineW + 18} y2={lineY} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
            {ticks.map(({ value, label }) => (
              <g key={value}>
                <line x1={X(fracOf(value))} y1={lineY - (label ? 13 : 8)} x2={X(fracOf(value))} y2={lineY + (label ? 13 : 8)} stroke={C.ink} strokeWidth={label ? 3 : 2} strokeLinecap="round" />
                {label && (
                  <text x={X(fracOf(value))} y={lineY + 26 + font * 0.7} textAnchor="middle" className="nlj-label" fontSize={font}>
                    {fmt(value)}
                  </text>
                )}
              </g>
            ))}

            {/* how far off the guess was */}
            {phase === 'reveal' && guessX !== null && Math.abs(guessX - targetX) > 2 && (
              <line x1={guessX} y1={lineY} x2={targetX} y2={lineY} stroke={C.red} strokeWidth={10} strokeLinecap="round" opacity={0.45} />
            )}

            {/* aiming preview: a ghost landing spot (with its number for younger children while dragging) */}
            {aimX !== null && phase === 'aim' && (
              <g pointerEvents="none">
                {!dragging && <line x1={aimX} y1={lineY - 46} x2={aimX} y2={lineY + 4} stroke={C.ink2} strokeWidth={2.5} strokeDasharray="5 5" />}
                <ellipse cx={aimX} cy={lineY} rx={dragging ? 16 : 8} ry={dragging ? 7 : 8} fill={dragging ? C.green : 'white'} opacity={dragging ? 0.55 : 1} stroke={C.ink} strokeWidth={2.5} />
                {dragging && showAimNumber && (
                  <g className="nlj-bubble">
                    <rect x={aimX - 30} y={frogY - frogSize * 1.25 - 40} width={60} height={36} rx={12} fill="white" stroke={C.ink} strokeWidth={2.5} />
                    <text x={aimX} y={frogY - frogSize * 1.25 - 22} textAnchor="middle" dominantBaseline="central" className="nlj-flag-text">
                      {fmt(snapFrac(aimFrac ?? 0).value)}
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* the true spot */}
            {phase === 'reveal' && (
              <g className="nlj-flag" pointerEvents="none">
                <line x1={targetX} y1={lineY} x2={targetX} y2={lineY - 96} stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" />
                <path d={`M${targetX},${lineY - 96} l40,13 l-40,13 z`} fill={C.red} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
                <rect x={targetX - 32} y={lineY - 142} width={64} height={38} rx={12} fill="white" stroke={C.ink} strokeWidth={2.5} />
                <text x={targetX} y={lineY - 122} textAnchor="middle" dominantBaseline="central" className="nlj-flag-text">
                  {fmt(target)}
                </text>
                <circle cx={targetX} cy={lineY} r={7} fill={C.red} stroke={C.ink} strokeWidth={2.5} />
              </g>
            )}

            <Frog x={frogX} y={frogY} size={frogSize} lifted={dragging} />
            {/* a big, easy-to-grab handle around the frog */}
            {phase === 'aim' && (
              <circle
                className={`nlj-handle${dragging ? ' grabbing' : ''}`}
                cx={frogX}
                cy={frogY - frogSize * 0.42}
                r={Math.max(34, frogSize * 0.7)}
                fill="transparent"
                onPointerDown={onFrogDown}
                onPointerMove={onFrogMove}
                onPointerUp={(e) => onFrogUp(e)}
                onPointerCancel={(e) => onFrogUp(e, true)}
              />
            )}
          </svg>
        )}
      </div>

      <div className="nlj-foot" aria-live="polite">
        {phase === 'reveal' ? (
          <>
            <p className={`nlj-msg pts-${earned}`}>
              {MESSAGES[earned]}
              <span className="nlj-earned">
                {Array.from({ length: 3 }, (_, i) => (
                  <Star key={i} size={20} strokeWidth={2} fill={i < earned ? 'var(--star)' : 'transparent'} />
                ))}
              </span>
            </p>
            <button type="button" className="nlj-next" onClick={next}>
              {index + 1 >= ROUNDS ? 'Finish' : 'Next'} <ArrowRight size={20} />
            </button>
          </>
        ) : (
          <p className="nlj-hint">{phase === 'aim' ? (dragging ? 'Let go to jump!' : 'Drag the frog to the spot, or tap the line.') : 'Boing!'}</p>
        )}
      </div>
    </div>
  );
}

/** A friendly frog standing with its feet at (x, y). */
function Frog({ x, y, size, lifted = false }: { x: number; y: number; size: number; lifted?: boolean }) {
  const k = size / 60;
  const green = '#4cb07a';
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} pointerEvents="none" aria-hidden>
      <ellipse cx={0} cy={lifted ? 4 + DRAG_LIFT / k : 4} rx={lifted ? 20 : 26} ry={5} fill={C.ink} opacity={lifted ? 0.08 : 0.12} />
      <ellipse cx={-17} cy={-4} rx={11} ry={6} fill={shade(green, -0.15)} stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={17} cy={-4} rx={11} ry={6} fill={shade(green, -0.15)} stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={0} cy={-22} rx={25} ry={20} fill={green} stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={0} cy={-16} rx={14} ry={10} fill={shade(green, 0.55)} />
      <circle cx={-12} cy={-42} r={9} fill="white" stroke={C.ink} strokeWidth={2.5} />
      <circle cx={12} cy={-42} r={9} fill="white" stroke={C.ink} strokeWidth={2.5} />
      <circle cx={-11} cy={-41} r={3.5} fill={C.ink} />
      <circle cx={13} cy={-41} r={3.5} fill={C.ink} />
      <path d="M-9,-27 q9,7 18,0" fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

export const game: Game = {
  id: 'number-line-jump',
  title: 'Number Line Jump',
  blurb: 'Help the frog land on the right number.',
  howTo: 'A number pops up. Drag the frog to where it lives on the number line and let go, or just tap the line!',
  color: '#ff9f43',
  icon: Ruler,
  scoreLabel: 'points',
  Play,
};
