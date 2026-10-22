import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Lightbulb, RotateCcw, Scale, Star, Volume2 } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { C, shade } from '../../lib/color';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { toSvgPoint } from '../../lib/svg';
import { PUZZLES, explain, hint, isBalanced, makePuzzles, torque } from './puzzles';
import type { Placed, Puzzle } from './puzzles';
import './balance-lab.css';

interface Item {
  id: number;
  mass: number;
  /** Peg on the right side, or null while it waits in the tray. */
  dist: number | null;
}

interface Geo {
  W: number;
  H: number;
  px: number;
  py: number;
  half: number;
  unit: number;
  trayRows: number[];
  trayPerRow: number;
}

const LANDSCAPE: Geo = { W: 1000, H: 640, px: 500, py: 372, half: 420, unit: 70, trayRows: [572], trayPerRow: 6 };
const PORTRAIT: Geo = { W: 620, H: 800, px: 310, py: 410, half: 272, unit: 92, trayRows: [604, 712], trayPerRow: 3 };
/** Ages 4–7 use one seat per side, a little in from the ends so a pile two blocks wide fits. */
const SEAT = 0.72;
const MAX_TILT = 10;

const MASS_COLORS = [C.yellow, C.blue, C.green, C.purple, C.red, C.orange, C.pink, C.teal, C.brown];
const BEAM_T = 18;

const GOALS: Record<Band, string> = {
  0: 'Make both sides the same!',
  1: 'Balance the seesaw!',
  2: 'Put the weight where it balances!',
  3: 'Balance it: weight × distance must match.',
};

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Beam tilt in degrees; positive = right side down. Bigger imbalance, bigger tilt (up to MAX_TILT). */
function tiltFor(left: Placed[], right: Placed[]) {
  const diff = torque(right) - torque(left);
  if (diff === 0) return 0;
  return Math.sign(diff) * Math.min(MAX_TILT, 3 + (7 * Math.abs(diff)) / Math.max(1, torque(left)));
}

function Play({ band, onFinish }: GameProps) {
  const puzzles = useMemo(() => makePuzzles(band), [band]);
  const [index, setIndex] = useState(0);
  const puzzle = puzzles[index];
  const [items, setItems] = useState<Item[]>(() => trayItems(puzzles[0]));
  const [phase, setPhase] = useState<'play' | 'solved'>('play');
  const [score, setScore] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const finished = useRef(false);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const g = size.w > 0 && (size.w < 560 || size.w / Math.max(1, size.h) < 1.05) ? PORTRAIT : LANDSCAPE;
  const spacing = ((band <= 1 ? SEAT : 1) * g.half) / puzzle.pegs;
  // Hit areas stay at least ~58 CSS px whatever the screen size.
  const minHit = 58 / Math.max(0.1, Math.min(size.w / g.W, size.h / g.H));
  const lifted = drag?.moved ? drag.id : -1;
  const right: Placed[] = items.filter((i) => i.dist !== null && i.id !== lifted).map((i) => ({ mass: i.mass, dist: i.dist! }));
  const angle = tiltFor(puzzle.left, right);
  const balanced = isBalanced(puzzle.left, right);

  // Notice when the child has balanced it (after the beam settles).
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (phase !== 'play' || !balanced || drag) return;
    timer.current = window.setTimeout(() => {
      setPhase('solved');
      if (!hinted) setScore((s) => s + 1);
      play('correct');
    }, reducedMotion() ? 50 : 650);
  }, [balanced, phase, drag, hinted]);

  const side = (mass: number, placed: boolean) => {
    if (band <= 1) {
      // Two blocks side by side must fit between the seat and the edge of the picture.
      const room = g.W / 2 - SEAT * g.half - 12;
      return Math.min(g.unit * (mass >= 2 ? 1.18 : 0.86), room);
    }
    const s = g.unit * (0.8 + 0.07 * Math.min(mass, 6));
    return placed ? Math.min(s, spacing * 0.9) : s;
  };

  /** Where a peg sits on screen (taking the beam's tilt into account). */
  const pegPoint = (dist: number, sign: 1 | -1) => {
    const a = (angle * Math.PI) / 180;
    const dx = sign * dist * spacing;
    const dy = -BEAM_T / 2;
    return { x: g.px + dx * Math.cos(a) - dy * Math.sin(a), y: g.py + dx * Math.sin(a) + dy * Math.cos(a) };
  };

  const trayPos = (n: number, total: number) => {
    const row = Math.floor(n / g.trayPerRow);
    const inRow = Math.min(g.trayPerRow, total - row * g.trayPerRow);
    const col = n % g.trayPerRow;
    const gap = g.unit * 1.32;
    return { x: g.W / 2 + (col - (inRow - 1) / 2) * gap, y: g.trayRows[Math.min(row, g.trayRows.length - 1)] };
  };

  const svgPoint = (e: ReactPointerEvent) => (svgRef.current ? toSvgPoint(svgRef.current, e.clientX, e.clientY) : { x: 0, y: 0 });

  const hoverPeg = (x: number, y: number) => {
    if (y > g.trayRows[0] - g.unit * 0.75) return null;
    let best: number | null = null;
    let bestD = Infinity;
    for (const d of puzzle.allowed) {
      const p = pegPoint(d, 1);
      const reach = puzzle.allowed.length === 1 ? g.unit * 1.8 : spacing * 0.55;
      const dx = Math.abs(x - p.x);
      if (dx <= reach && dx < bestD && y > p.y - g.unit * 6 && y < p.y + g.unit * 1.2) {
        best = d;
        bestD = dx;
      }
    }
    return best;
  };

  const place = (id: number, dist: number | null) => {
    if (phase !== 'play') return;
    setItems((list) => list.map((i) => (i.id === id ? { ...i, dist } : i)));
    setSelected(null);
    play(dist === null ? 'tap' : 'pop');
  };

  const onItemDown = (e: ReactPointerEvent, id: number) => {
    if (phase !== 'play') return;
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = svgPoint(e);
    setDrag({ id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false });
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!drag) return;
    const p = svgPoint(e);
    const moved = drag.moved || Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8;
    setDrag({ ...drag, x: p.x, y: p.y, moved });
    if (moved) setHover(hoverPeg(p.x, p.y));
  };

  const onUp = (e: ReactPointerEvent) => {
    if (!drag) return;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    const item = items.find((i) => i.id === drag.id)!;
    if (drag.moved) {
      place(drag.id, hover);
    } else if (item.dist !== null) {
      place(drag.id, null); // tap a placed weight to send it back
    } else {
      setSelected(selected === drag.id ? null : drag.id);
      play('tap');
    }
    setDrag(null);
    setHover(null);
  };

  const clear = () => {
    setItems((list) => list.map((i) => ({ ...i, dist: null })));
    setSelected(null);
    play('tap');
  };

  const useHint = () => {
    setHinted(true);
    setShowHint(true);
    play('tap');
  };

  const next = () => {
    if (index + 1 >= PUZZLES) {
      if (!finished.current) {
        finished.current = true;
        onFinish(score);
      }
      return;
    }
    const n = index + 1;
    setIndex(n);
    setItems(trayItems(puzzles[n]));
    setPhase('play');
    setHinted(false);
    setShowHint(false);
    setSelected(null);
  };

  // Stack the weights on each peg (beam coordinates, before tilting). Ages 4–7 get a pile two blocks wide on the seat.
  const stacks = (placed: { mass: number; dist: number; id?: number }[], sign: 1 | -1) => {
    const heights = new Map<string, number>();
    const colW = side(band === 1 ? 2 : 1, true) + 4;
    return placed.map((w) => {
      const s = side(w.mass, true);
      let x = g.px + sign * w.dist * spacing;
      let key = String(w.dist);
      if (band <= 1) {
        const [a, b] = [heights.get(`${w.dist}a`) ?? 0, heights.get(`${w.dist}b`) ?? 0];
        const col = a <= b ? 'a' : 'b';
        key = `${w.dist}${col}`;
        x += (col === 'a' ? -1 : 1) * (colW / 2) * sign;
      }
      const base = heights.get(key) ?? 0;
      heights.set(key, base + s + 2);
      const hitW = band <= 1 ? s + 4 : Math.min(Math.max(s, minHit), spacing * 0.95);
      return { ...w, s, x, y: g.py - BEAM_T / 2 - base - s, hitW, hitH: s + 2 };
    });
  };

  const leftStack = stacks(puzzle.left, -1);
  const rightStack = stacks(
    items.filter((i) => i.dist !== null && i.id !== lifted).map((i) => ({ mass: i.mass, dist: i.dist!, id: i.id })),
    1,
  );
  const trayList = items.filter((i) => i.dist === null && i.id !== lifted);
  const trayHit = Math.min(minHit, g.unit * 1.32 - 4);
  const hintPegs = showHint ? puzzle.solution.map((s) => s.dist) : [];
  const status = balanced ? 'Balanced!' : angle > 0 ? 'Right side is down' : 'Left side is down';

  return (
    <div className="balance-lab">
      <div className="bl-hud">
        <p className="bl-goal">{GOALS[band]}</p>
        <div className="bl-stats">
          <button type="button" className="bl-icon" onClick={() => speak(`${GOALS[band]} ${hint(band, puzzle)}`, { force: true })} aria-label="Hear the goal">
            <Volume2 size={18} />
          </button>
          <span className="bl-pill" aria-label={`Puzzle ${index + 1} of ${PUZZLES}`}>
            <Scale size={15} /> {index + 1}/{PUZZLES}
          </span>
          <span className="bl-pill" aria-label={`${score} points`}>
            <Star size={15} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className="bl-stage" ref={boxRef}>
        {size.w > 0 && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${g.W} ${g.H}`}
            className="bl-svg"
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            role="group"
            aria-label={`Seesaw. ${status}`}
          >
            {/* Pivot and ground */}
            <line x1={40} x2={g.W - 40} y1={g.py + 118} y2={g.py + 118} stroke={C.line} strokeWidth={4} strokeLinecap="round" />
            <path d={`M${g.px} ${g.py} L${g.px - 56} ${g.py + 118} L${g.px + 56} ${g.py + 118} Z`} fill={shade(C.wood, -0.05)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />

            {/* Peg drop zones (tap a weight, then a spot) */}
            {phase === 'play' &&
              puzzle.allowed.map((d) => {
                const p = pegPoint(d, 1);
                const wZone = puzzle.allowed.length === 1 ? g.unit * 2.4 : spacing * 0.96;
                const active = hover === d || (selected !== null && !drag);
                return (
                  <rect
                    key={d}
                    x={p.x - wZone / 2}
                    y={p.y - g.unit * 4.6}
                    width={wZone}
                    height={g.unit * 4.6 + 26}
                    rx={16}
                    className={`bl-zone${active ? ' on' : ''}${hover === d ? ' hover' : ''}${hintPegs.includes(d) ? ' hint' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Peg ${d}`}
                    onClick={() => selected !== null && place(selected, d)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      if (selected !== null) place(selected, d);
                    }}
                  />
                );
              })}

            {/* The beam and everything on it tilts together */}
            <g
              className="bl-beam"
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: `${g.px}px ${g.py}px`,
                transition: reducedMotion() ? 'none' : 'transform 0.7s cubic-bezier(0.3, 1.35, 0.5, 1)',
              }}
            >
              <rect
                x={g.px - g.half - 30}
                y={g.py - BEAM_T / 2}
                width={(g.half + 30) * 2}
                height={BEAM_T}
                rx={BEAM_T / 2}
                fill={phase === 'solved' ? C.green : C.wood}
                stroke={C.ink}
                strokeWidth={3}
              />
              {/* Spirit level: the bubble floats to the higher end */}
              <rect x={g.px - 46} y={g.py - BEAM_T / 2 - 22} width={92} height={18} rx={9} fill="#e9fbff" stroke={C.ink} strokeWidth={2} />
              <circle cx={g.px - Math.max(-34, Math.min(34, angle * 3))} cy={g.py - BEAM_T / 2 - 13} r={7} fill={balanced ? C.green : C.teal} />
              <line x1={g.px - 10} x2={g.px - 10} y1={g.py - BEAM_T / 2 - 20} y2={g.py - BEAM_T / 2 - 6} stroke={C.ink} strokeWidth={1.5} />
              <line x1={g.px + 10} x2={g.px + 10} y1={g.py - BEAM_T / 2 - 20} y2={g.py - BEAM_T / 2 - 6} stroke={C.ink} strokeWidth={1.5} />
              {/* Peg marks and distance numbers */}
              {Array.from({ length: puzzle.pegs }, (_, i) => i + 1).flatMap((d) =>
                ([-1, 1] as const).map((sign) => {
                  const show = band >= 2 || d === 3;
                  if (!show) return null;
                  const x = g.px + sign * d * spacing;
                  return (
                    <g key={`${sign}${d}`}>
                      <circle cx={x} cy={g.py} r={4} fill={C.ink} />
                      {band >= 2 && (
                        <text x={x} y={g.py + BEAM_T + 18} textAnchor="middle" className="bl-num" style={{ fontSize: g === PORTRAIT ? 28 : 22 }}>
                          {d}
                        </text>
                      )}
                    </g>
                  );
                }),
              )}
              {leftStack.map((w, i) => (
                <Weight key={`l${i}`} x={w.x} y={w.y} s={w.s} mass={w.mass} dist={w.dist} band={band} fixed />
              ))}
              {rightStack.map((w) => (
                <Weight
                  key={w.id}
                  x={w.x}
                  y={w.y}
                  s={w.s}
                  hitW={w.hitW}
                  hitH={w.hitH}
                  mass={w.mass}
                  dist={w.dist}
                  band={band}
                  onDown={(e) => onItemDown(e, w.id!)}
                  onActivate={phase === 'play' ? () => place(w.id!, null) : undefined}
                />
              ))}
            </g>

            {/* Tray */}
            <rect
              x={g.W / 2 - (Math.min(g.trayPerRow, items.length) * g.unit * 1.32) / 2 - 10}
              y={g.trayRows[0] - g.unit * 0.75}
              width={Math.min(g.trayPerRow, items.length) * g.unit * 1.32 + 20}
              height={(Math.ceil(items.length / g.trayPerRow) - 1) * ((g.trayRows[1] ?? 0) - g.trayRows[0]) + g.unit * 1.5}
              rx={22}
              className="bl-tray"
            />
            {trayList.map((it, n) => {
              const p = trayPos(n, trayList.length);
              const s = side(it.mass, false);
              return (
                <Weight
                  key={it.id}
                  x={p.x}
                  y={p.y - s / 2}
                  s={s}
                  hitW={Math.max(s, trayHit)}
                  hitH={Math.max(s, minHit)}
                  mass={it.mass}
                  band={band}
                  selected={selected === it.id}
                  onDown={(e) => onItemDown(e, it.id)}
                  onActivate={phase === 'play' ? () => {
                    setSelected((id) => id === it.id ? null : it.id);
                    play('tap');
                  } : undefined}
                />
              );
            })}

            {/* The weight being dragged follows the finger */}
            {drag?.moved &&
              (() => {
                const it = items.find((i) => i.id === drag.id)!;
                const s = side(it.mass, hover !== null);
                return <Weight x={drag.x} y={drag.y - s * 0.6} s={s} mass={it.mass} band={band} lifted />;
              })()}
          </svg>
        )}
      </div>

      <div className="bl-foot" role="status">
        {phase === 'solved' ? (
          <>
            <p className="bl-msg good">{explain(band, puzzle, right)}</p>
            <button type="button" className="btn primary" onClick={next} autoFocus>
              {index + 1 >= PUZZLES ? 'Finish' : 'Next'} <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <p className={`bl-msg${balanced ? ' good' : ''}`}>{showHint ? hint(band, puzzle) : status}</p>
            <div className="bl-actions">
              <button type="button" className="btn" onClick={clear} disabled={!right.length}>
                <RotateCcw size={16} /> Clear
              </button>
              <button type="button" className="btn" onClick={useHint} disabled={showHint}>
                <Lightbulb size={16} /> Hint
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function trayItems(p: Puzzle): Item[] {
  return p.tray.map((mass, id) => ({ id, mass, dist: null }));
}

function Weight({
  x,
  y,
  s,
  hitW = s,
  hitH = s,
  mass,
  dist,
  band,
  fixed,
  selected,
  lifted,
  onDown,
  onActivate,
}: {
  x: number;
  y: number;
  s: number;
  hitW?: number;
  hitH?: number;
  mass: number;
  dist?: number;
  band: Band;
  fixed?: boolean;
  selected?: boolean;
  lifted?: boolean;
  onDown?: (e: ReactPointerEvent) => void;
  onActivate?: () => void;
}) {
  const color = band === 0 ? C.blue : band === 1 ? (mass >= 2 ? C.red : C.yellow) : MASS_COLORS[(mass - 1) % MASS_COLORS.length];
  // Small weights (on a phone's beam) show just the number so it stays readable.
  const label = band >= 3 && s >= 60 ? `${mass}kg` : band >= 2 ? String(mass) : '';
  // Bands 0–1 show weight as dots (one per unit) so "two small = one big" can be counted.
  const dots = band === 1 ? mass : 0;
  const name = `${fixed ? 'Left weight' : 'Weight'} ${mass}${dist ? ` on peg ${dist}` : ''}`;
  return (
    <g
      className={`bl-weight${fixed ? ' fixed' : ''}${selected ? ' selected' : ''}${lifted ? ' lifted' : ''}`}
      onPointerDown={onDown}
      role={onDown ? 'button' : 'img'}
      tabIndex={onActivate ? 0 : undefined}
      aria-pressed={onActivate ? !!selected : undefined}
      aria-label={lifted ? undefined : name}
      onKeyDown={(e) => {
        if (!onActivate || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        onActivate();
      }}
    >
      {onDown && <rect x={x - hitW / 2} y={y + s / 2 - hitH / 2} width={hitW} height={hitH} fill="transparent" />}
      <rect x={x - s / 2 + 3} y={y + 5} width={s} height={s} rx={s * 0.18} fill={C.ink} opacity={0.18} />
      <rect x={x - s / 2} y={y} width={s} height={s} rx={s * 0.18} fill={color} stroke={C.ink} strokeWidth={3} />
      <rect x={x - s / 2 + s * 0.12} y={y + s * 0.1} width={s * 0.3} height={s * 0.12} rx={s * 0.06} fill="white" opacity={0.55} />
      {label && (
        <text x={x} y={y + s * 0.58} textAnchor="middle" dominantBaseline="middle" className="bl-label" style={{ fontSize: Math.max(16, s * (label.length > 2 ? 0.3 : 0.5)) }}>
          {label}
        </text>
      )}
      {dots > 0 &&
        Array.from({ length: dots }, (_, i) => (
          <circle key={i} cx={x + (i - (dots - 1) / 2) * s * 0.3} cy={y + s * 0.58} r={s * 0.09} fill={C.ink} />
        ))}
    </g>
  );
}

export const game: Game = {
  id: 'balance-lab',
  subject: 'science',
  topic: 'physics',
  title: 'Balance Lab',
  blurb: 'Load the seesaw until it balances.',
  howTo: 'Drag weights onto the right side of the seesaw until it sits level. Watch the bubble!',
  howToByBand: [
    'Make both sides weigh the same. Drag weights from the tray to the right seat, or tap a weight and then the seat. A level seesaw and a centred bubble mean it balances.',
    'Use small and big weights to balance the left side. Drag weights to the right seat, or tap a weight and then the seat. Count the dots on the weights.',
    'Balance the seesaw by choosing a weight and its peg. A lighter weight needs to sit farther from the middle. Drag it to a peg, or tap the weight and then the peg.',
    'Balance the turning effect: weight × distance from the middle. Add weights on the right pegs until both sides match. Drag a weight, or tap it and then its peg.',
  ],
  color: '#ff9f43',
  icon: Scale,
  scoreLabel: 'puzzles balanced on your own',
  Play,
};
