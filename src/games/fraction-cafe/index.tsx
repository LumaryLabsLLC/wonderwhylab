import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Lightbulb, Pizza, RotateCcw, Star, Volume2 } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { toSvgPoint } from '../../lib/svg';
import {
  adapt,
  cmp,
  eq,
  explain,
  fairCut,
  FRIENDS,
  fstr,
  isFair,
  makeRound,
  PARTS,
  pizzaPieces,
  ROUNDS,
  saveTier,
  savedTier,
  sandwichPieces,
  servings,
  sum,
  sumWorking,
  words,
} from './rounds';
import type { CompareRound, Frac, Round, ServeRound, ShareRound } from './rounds';
import './fraction-cafe.css';

const TAP_SLOP = 8;

// ─────────────────────────── Drawing helpers ───────────────────────────

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A pizza slice from angle a0 to a1 (degrees, clockwise from 3 o'clock). */
function sectorPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  if (a1 - a0 >= 359.99) return `M${cx - r},${cy} a${r},${r} 0 1 0 ${r * 2},0 a${r},${r} 0 1 0 ${-r * 2},0 Z`;
  const p = (a: number) => `${cx + r * Math.cos(rad(a))},${cy + r * Math.sin(rad(a))}`;
  return `M${cx},${cy} L${p(a0)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)} Z`;
}

function PizzaSlice({ cx, cy, r, a0, a1, className = '' }: { cx: number; cy: number; r: number; a0: number; a1: number; className?: string }) {
  const mid = rad((a0 + a1) / 2);
  const span = a1 - a0;
  const dots: [number, number][] = [[0.62, 0]];
  if (span >= 80) dots.push([0.34, 0], [0.7, span / 4]);
  return (
    <g className={`fraction-cafe-pizza ${className}`}>
      <path d={sectorPath(cx, cy, r, a0, a1)} className="crust" />
      <path d={sectorPath(cx, cy, r * 0.86, a0, a1)} className="cheese" />
      {dots.map(([d, off], i) => {
        const a = mid + rad(off * (i % 2 ? -1 : 1));
        return <circle key={i} cx={cx + Math.cos(a) * r * d} cy={cy + Math.sin(a) * r * d} r={r * 0.09} className="pepperoni" />;
      })}
      <path d={sectorPath(cx, cy, r, a0, a1)} className="edge" />
    </g>
  );
}

function Plate({ cx, cy, r, glow = false, label }: { cx: number; cy: number; r: number; glow?: boolean; label?: ReactNode }) {
  return (
    <g>
      <circle cx={cx} cy={cy + 4} r={r} className="fraction-cafe-plate-shadow" />
      <circle cx={cx} cy={cy} r={r} className={`fraction-cafe-plate${glow ? ' glow' : ''}`} />
      <circle cx={cx} cy={cy} r={r * 0.82} className="fraction-cafe-plate-rim" />
      {label}
    </g>
  );
}

/** Fraction as text drawn in SVG. */
const FracText = ({ x, y, text, size = 34 }: { x: number; y: number; text: string; size?: number }) => (
  <text x={x} y={y} className="fraction-cafe-label" fontSize={size}>
    {text}
  </text>
);

/** Side by side on wider screens; stacked on phones (decided by width so it never flips mid-round). */
const isWide = (box: { w: number; h: number }) => box.w >= 560 && box.w / box.h > 0.95;

function useBox(ref: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ w: 900, h: 520 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width || 900, h: e.contentRect.height || 520 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

interface ChildProps {
  band: Band;
  showMe: boolean;
  done: boolean;
  /** An attempt: right or not, with a nudge for "not yet". */
  onAttempt: (ok: boolean, nudge: string) => void;
  /** The Help button, shown in the same row as the game's own buttons. */
  help: ReactNode;
}

// ─────────────────────────── Share (ages 4–5) ───────────────────────────

function ShareGame({ round, showMe, done, onAttempt, help }: ChildProps & { round: ShareRound }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useBox(fieldRef);
  const wide = isWide(box);
  const [angles, setAngles] = useState<number[]>([]);
  const [vCuts, setV] = useState<number[]>([]);
  const [hCuts, setH] = useState<number[]>([]);
  const [stage, setStage] = useState<'cut' | 'serve'>('cut');
  const [owner, setOwner] = useState<number[]>([]); // piece → plate index, -1 = on the board
  const [selected, setSelected] = useState<number | null>(null);
  const [knife, setKnife] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [drag, setDrag] = useState<{ piece: number; dx: number; dy: number } | null>(null);
  const press = useRef<{ piece: number; x: number; y: number; moved: boolean } | null>(null);

  const isPizza = round.food === 'pizza';
  const vb = wide ? { w: 1000, h: 560 } : { w: 600, h: round.friends === 2 ? 680 : 880 };
  const food = wide ? { x: 290, y: 280, r: 190 } : { x: 300, y: 185, r: 165 };
  const plateR = wide ? 92 : round.friends === 2 ? 108 : 96;
  const plates = useMemo(() => {
    if (wide) return round.friends === 2 ? [{ x: 790, y: 150 }, { x: 790, y: 410 }] : [{ x: 680, y: 150 }, { x: 900, y: 150 }, { x: 680, y: 410 }, { x: 900, y: 410 }];
    return round.friends === 2 ? [{ x: 155, y: 555 }, { x: 445, y: 555 }] : [{ x: 155, y: 520 }, { x: 445, y: 520 }, { x: 155, y: 760 }, { x: 445, y: 760 }];
  }, [wide, round.friends]);
  const mini = (plateR * 0.8) / food.r;

  const pieces = useMemo(
    () =>
      isPizza
        ? pizzaPieces(angles).map((p) => ({ ...p, kind: 'pizza' as const }))
        : sandwichPieces(vCuts, hCuts).map((p) => ({ ...p, kind: 'sandwich' as const })),
    [isPizza, angles, vCuts, hCuts],
  );
  const cutsMade = isPizza ? angles.length : vCuts.length + hCuts.length;

  const pt = (e: { clientX: number; clientY: number }) => toSvgPoint(svgRef.current!, e.clientX, e.clientY);

  const reset = () => {
    setAngles([]);
    setV([]);
    setH([]);
    setStage('cut');
    setOwner([]);
    setSelected(null);
  };

  // Cutting: drag a knife across the food.
  const onFoodDown = (e: ReactPointerEvent<SVGElement>) => {
    if (stage !== 'cut' || done) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = pt(e);
    setKnife({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  const side = food.r * 2 * 0.86; // sandwich size
  const sx0 = food.x - side / 2;
  const sy0 = food.y - side / 2;

  const finishCut = () => {
    const k = knife;
    setKnife(null);
    if (!k) return;
    const dx = k.x1 - k.x0;
    const dy = k.y1 - k.y0;
    if (Math.hypot(dx, dy) < food.r * 0.5) return;
    play('pop');
    if (isPizza) {
      const a = (Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) / 45) * 45) % 180;
      if (!angles.includes(a) && angles.length < 4) setAngles([...angles, a]);
    } else if (Math.abs(dy) > Math.abs(dx)) {
      const q = Math.min(3, Math.max(1, Math.round((((k.x0 + k.x1) / 2 - sx0) / side) * 4)));
      if (!vCuts.includes(q)) setV([...vCuts, q]);
    } else {
      const q = Math.min(3, Math.max(1, Math.round((((k.y0 + k.y1) / 2 - sy0) / side) * 4)));
      if (!hCuts.includes(q)) setH([...hCuts, q]);
    }
  };

  // Serving: drag a piece to a plate, or tap a piece then a plate.
  const onPieceDown = (e: ReactPointerEvent<SVGElement>, piece: number) => {
    if (stage !== 'serve' || done) return;
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    press.current = { piece, x: e.clientX, y: e.clientY, moved: false };
  };

  const plateAt = (x: number, y: number) => plates.findIndex((pl) => Math.hypot(pl.x - x, pl.y - y) < plateR * 1.25);

  const assign = (piece: number, plate: number) => {
    const next = pieces.map((_, i) => (i === piece ? plate : (owner[i] ?? -1)));
    setOwner(next);
    setSelected(null);
    play(plate >= 0 ? 'pop' : 'tap');
    if (next.every((o) => o >= 0)) {
      const shares = plates.map((_, k) => pieces.reduce((s, p, i) => s + (next[i] === k ? p.size : 0), 0));
      const fair = isFair(shares);
      if (fair) onAttempt(true, '');
      else {
        const empty = shares.some((s) => s === 0);
        onAttempt(
          false,
          empty
            ? `Not fair yet — a friend got nothing. Cut it so there are enough equal pieces for ${round.friends} friends.`
            : 'Not fair yet — one friend got more. Fair shares are the same size. Try cutting again.',
        );
        window.setTimeout(reset, 900);
      }
    }
  };

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (knife) {
      const p = pt(e);
      setKnife({ ...knife, x1: p.x, y1: p.y });
      return;
    }
    const pr = press.current;
    if (!pr) return;
    if (!pr.moved && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < TAP_SLOP) return;
    pr.moved = true;
    const a = toSvgPoint(svgRef.current!, pr.x, pr.y);
    const b = pt(e);
    setDrag({ piece: pr.piece, dx: b.x - a.x, dy: b.y - a.y });
  };

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (knife) return finishCut();
    const pr = press.current;
    press.current = null;
    setDrag(null);
    if (!pr) return;
    if (!pr.moved) {
      if ((owner[pr.piece] ?? -1) >= 0) assign(pr.piece, -1);
      else setSelected(selected === pr.piece ? null : pr.piece);
      return;
    }
    const p = pt(e);
    const plate = plateAt(p.x, p.y);
    if (plate >= 0) assign(pr.piece, plate);
    else if ((owner[pr.piece] ?? -1) >= 0) assign(pr.piece, -1);
  };

  const onPlateTap = (k: number) => {
    if (stage === 'serve' && selected !== null && !done) assign(selected, k);
  };

  const model = fairCut(round);

  /** Draw one piece, either on the board (spread apart a little) or small on a friend's plate. */
  const drawPiece = (i: number) => {
    const p = pieces[i];
    const own = owner[i] ?? -1;
    const dragging = drag?.piece === i;
    const sel = selected === i;
    let transform = '';
    if (own >= 0) {
      const pl = plates[own];
      transform = `translate(${pl.x} ${pl.y}) scale(${mini}) translate(${-food.x} ${-food.y})`;
    } else if (stage === 'serve') {
      // Spread pieces apart so each is easy to grab.
      const [cxp, cyp] =
        p.kind === 'pizza'
          ? [Math.cos(rad((p.from + p.to) / 2)) * 14, Math.sin(rad((p.from + p.to) / 2)) * 14]
          : [((p.x0 + p.x1) / 2 - 2) * 7, ((p.y0 + p.y1) / 2 - 2) * 7];
      transform = `translate(${cxp} ${cyp})`;
    }
    if (dragging) transform = `translate(${drag.dx} ${drag.dy}) ${transform}`;
    const body =
      p.kind === 'pizza' ? (
        <PizzaSlice cx={food.x} cy={food.y} r={food.r} a0={p.from} a1={p.to} />
      ) : (
        <g className="fraction-cafe-sandwich">
          <rect x={sx0 + (p.x0 / 4) * side} y={sy0 + (p.y0 / 4) * side} width={((p.x1 - p.x0) / 4) * side} height={((p.y1 - p.y0) / 4) * side} className="bread" />
          <rect x={sx0 + (p.x0 / 4) * side + 10} y={sy0 + (p.y0 / 4) * side + 10} width={Math.max(0, ((p.x1 - p.x0) / 4) * side - 20)} height={Math.max(0, ((p.y1 - p.y0) / 4) * side - 20)} className="filling" />
        </g>
      );
    return (
      <g
        key={`${i}-${pieces.length}`}
        transform={transform}
        className={`fraction-cafe-piece${dragging ? ' dragging' : ''}${sel ? ' selected' : ''}${stage === 'serve' ? ' grab' : ''}`}
        onPointerDown={(e) => onPieceDown(e, i)}
        role={stage === 'serve' ? 'button' : undefined}
        tabIndex={stage === 'serve' && !done ? 0 : -1}
        aria-label={stage === 'serve' ? `Piece ${i + 1}${own >= 0 ? `, on plate ${own + 1}` : ''}` : undefined}
        onKeyDown={(e: ReactKeyboardEvent) => {
          if (stage !== 'serve' || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          if (own >= 0) assign(i, -1);
          else {
            const counts = plates.map((_, k) => owner.filter((o) => o === k).length);
            assign(i, counts.indexOf(Math.min(...counts)));
          }
        }}
      >
        {body}
      </g>
    );
  };

  const order = pieces.map((_, i) => i).sort((a, b) => (drag?.piece === a ? 1 : drag?.piece === b ? -1 : 0));

  return (
    <>
      <div className="fraction-cafe-field" ref={fieldRef}>
        <svg
          ref={svgRef}
          className="fraction-cafe-svg"
          viewBox={`0 0 ${vb.w} ${vb.h}`}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="application"
          aria-label={`Share the ${round.food} fairly between ${round.friends} friends`}
        >
          {/* Friends and their plates */}
          {plates.map((pl, k) => (
            <g key={k} onClick={() => onPlateTap(k)} className={selected !== null ? 'fraction-cafe-target' : ''}>
              <Plate cx={pl.x} cy={pl.y} r={plateR} />
              <text x={pl.x - plateR * 0.95} y={pl.y - plateR * 0.62} className="fraction-cafe-emoji" fontSize={44}>
                {FRIENDS[k]}
              </text>
            </g>
          ))}

          {/* The food (catches knife strokes) */}
          <g onPointerDown={onFoodDown} className={stage === 'cut' ? 'fraction-cafe-cuttable' : ''}>
            <circle cx={food.x} cy={food.y} r={food.r + 30} fill="transparent" />
            {stage === 'cut' &&
              (isPizza ? (
                <PizzaSlice cx={food.x} cy={food.y} r={food.r} a0={0} a1={360} />
              ) : (
                <g className="fraction-cafe-sandwich">
                  <rect x={sx0} y={sy0} width={side} height={side} rx={18} className="bread" />
                  <rect x={sx0 + 14} y={sy0 + 14} width={side - 28} height={side - 28} rx={10} className="filling" />
                </g>
              ))}
          </g>
          {/* Cut lines while cutting */}
          {stage === 'cut' && (
            <g className="fraction-cafe-cuts">
              {isPizza
                ? angles.map((a) => (
                    <line key={a} x1={food.x - Math.cos(rad(a)) * food.r} y1={food.y - Math.sin(rad(a)) * food.r} x2={food.x + Math.cos(rad(a)) * food.r} y2={food.y + Math.sin(rad(a)) * food.r} />
                  ))
                : [
                    ...vCuts.map((q) => <line key={`v${q}`} x1={sx0 + (q / 4) * side} y1={sy0} x2={sx0 + (q / 4) * side} y2={sy0 + side} />),
                    ...hCuts.map((q) => <line key={`h${q}`} x1={sx0} y1={sy0 + (q / 4) * side} x2={sx0 + side} y2={sy0 + (q / 4) * side} />),
                  ]}
            </g>
          )}
          {/* "Show me": where fair cuts go */}
          {stage === 'cut' && showMe && (
            <g className="fraction-cafe-model">
              {(model.pizza ?? []).map((a) => (
                <line key={a} x1={food.x - Math.cos(rad(a)) * food.r} y1={food.y - Math.sin(rad(a)) * food.r} x2={food.x + Math.cos(rad(a)) * food.r} y2={food.y + Math.sin(rad(a)) * food.r} />
              ))}
              {(model.v ?? []).map((q) => <line key={`v${q}`} x1={sx0 + (q / 4) * side} y1={sy0 - 10} x2={sx0 + (q / 4) * side} y2={sy0 + side + 10} />)}
              {(model.h ?? []).map((q) => <line key={`h${q}`} x1={sx0 - 10} y1={sy0 + (q / 4) * side} x2={sx0 + side + 10} y2={sy0 + (q / 4) * side} />)}
            </g>
          )}
          {/* Pieces once cut */}
          {stage === 'serve' && order.map(drawPiece)}
          {!done && (
            <text x={food.x} y={food.y + food.r + (wide ? 48 : 40)} className="fraction-cafe-caption">
              {stage === 'cut' ? 'Drag across to cut it' : 'Drag each piece to a friend’s plate'}
            </text>
          )}
          {knife && <line x1={knife.x0} y1={knife.y0} x2={knife.x1} y2={knife.y1} className="fraction-cafe-knife" />}
        </svg>
      </div>
      {!done && (
        <div className="fraction-cafe-actions">
          <button type="button" className="btn" onClick={reset} disabled={cutsMade === 0}>
            <RotateCcw size={18} /> Start again
          </button>
          {stage === 'cut' && (
            <>
              {([2, 4] as const).map((parts) => (
                <button key={parts} type="button" className="btn" onClick={() => {
                  const cuts = fairCut({ ...round, friends: parts });
                  setAngles(cuts.pizza ?? []);
                  setV(cuts.v ?? []);
                  setH(cuts.h ?? []);
                  play('tap');
                }}>
                  Cut into {parts}
                </button>
              ))}
              <button
                type="button"
                className="btn primary"
                disabled={cutsMade === 0}
                onClick={() => {
                  play('whoosh');
                  setStage('serve');
                  setOwner(pieces.map(() => -1));
                }}
              >
                Share it!
              </button>
            </>
          )}
          {help}
        </div>
      )}
    </>
  );
}

// ─────────────────────────── Serve (ages 6–12) ───────────────────────────

interface SliceState {
  id: number;
  food: number;
  k: number;
}

function ServeGame({ band, round, showMe, done, onAttempt, help }: ChildProps & { round: ServeRound }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useBox(fieldRef);
  const wide = isWide(box);
  const isCake = round.food === 'cake';
  const slices = useMemo(() => round.stock.flatMap((d, food) => Array.from({ length: d }, (_, k) => ({ food, k }))).map((s, id) => ({ ...s, id })), [round]);
  const [plate, setPlate] = useState<number[]>([]); // slice ids in the order they were served
  const [drag, setDrag] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  const two = round.stock.length === 2;
  const vb = wide ? { w: 1000, h: 520 } : { w: 600, h: 940 };
  const foods = wide
    ? two
      ? [{ x: 170, y: 250 }, { x: 440, y: 250 }]
      : [{ x: 280, y: 250 }]
    : two
      ? [{ x: 155, y: 190 }, { x: 445, y: 190 }]
      : [{ x: 300, y: 210 }];
  const fr = two ? 125 : wide ? 185 : 175;
  const plateC = wide ? { x: 790, y: 245 } : { x: 300, y: 640 };
  const plateR = wide ? 175 : 190;
  const rp = plateR * 0.8;
  // Cake geometry
  const cakeW = wide ? 400 : 480;
  const cakeH = 130;
  const cake = wide ? { x: 70, y: 190 } : { x: 60, y: 160 };
  const board = wide ? { x: 580, y: 190 } : { x: 60, y: 560 };

  const parts: Frac[] = plate.map((id) => ({ n: 1, d: round.stock[slices[id].food] }));
  const total = sum(parts);
  const pt = (e: { clientX: number; clientY: number }) => toSvgPoint(svgRef.current!, e.clientX, e.clientY);

  const toggle = (id: number) => {
    if (done) return;
    setPlate((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    play(plate.includes(id) ? 'tap' : 'pop');
  };

  const onDown = (e: ReactPointerEvent<SVGElement>, id: number) => {
    if (done) return;
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    press.current = { id, x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pr = press.current;
    if (!pr) return;
    if (!pr.moved && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < TAP_SLOP) return;
    pr.moved = true;
    const a = toSvgPoint(svgRef.current!, pr.x, pr.y);
    const b = pt(e);
    setDrag({ id: pr.id, dx: b.x - a.x, dy: b.y - a.y });
  };
  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    const pr = press.current;
    press.current = null;
    setDrag(null);
    if (!pr) return;
    if (!pr.moved) return toggle(pr.id);
    const p = pt(e);
    const overPlate = isCake
      ? p.x > board.x - 30 && p.x < board.x + cakeW + 30 && p.y > board.y - 60 && p.y < board.y + cakeH + 60
      : Math.hypot(p.x - plateC.x, p.y - plateC.y) < plateR * 1.15;
    const on = plate.includes(pr.id);
    if (overPlate !== on) toggle(pr.id);
  };

  const serveIt = () => {
    if (plate.length === 0 || done) return;
    if (eq(total, round.order)) {
      onAttempt(true, '');
      return;
    }
    const tooMuch = total.n * round.order.d > round.order.n * total.d;
    const hint =
      round.stock.length === 2
        ? `That makes ${fstr(total)}, which is too ${tooMuch ? 'much' : 'little'}. Change the slices into ${PARTS[lcmOf(round)]} to compare.`
        : round.order.d === round.stock[0]
          ? `That's ${plate.length}/${round.stock[0]} — too ${tooMuch ? 'much' : 'little'}. ${fstr(round.order)} means ${round.order.n} of ${round.order.d} equal parts.`
          : `That's ${plate.length}/${round.stock[0]} — too ${tooMuch ? 'much' : 'little'}. How many of these slices make ${fstr(round.order)}?`;
    onAttempt(false, hint);
  };

  // "Show me": clear the plate and make the slices to serve glow.
  const plan = useMemo(() => servings(round)[0] ?? [], [round]);
  const glowing = new Set<number>();
  if (showMe) {
    round.stock.forEach((_, food) => {
      slices.filter((s) => s.food === food).slice(0, plan[food] ?? 0).forEach((s) => glowing.add(s.id));
    });
  }

  /** Where each slice is drawn: in its food on the counter, or packed onto the plate. */
  const drawSlice = (s: SliceState) => {
    const d = round.stock[s.food];
    const i = plate.indexOf(s.id);
    const on = i >= 0;
    const dragging = drag?.id === s.id;
    const tr = dragging ? `translate(${drag.dx} ${drag.dy})` : undefined;
    const cls = `fraction-cafe-piece grab${dragging ? ' dragging' : ''}${glowing.has(s.id) && !on ? ' glow' : ''}`;
    const label = `${words({ n: 1, d })} slice${on ? ', on the plate' : ''}`;
    const common = {
      className: cls,
      onPointerDown: (e: ReactPointerEvent<SVGGElement>) => onDown(e, s.id),
      role: 'button',
      tabIndex: done ? -1 : 0,
      'aria-label': label,
      onKeyDown: (e: ReactKeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(s.id);
        }
      },
      transform: tr,
    };
    if (isCake) {
      const w = cakeW / d;
      const x = on ? board.x + plate.slice(0, i).reduce((acc, id) => acc + cakeW / round.stock[slices[id].food], 0) : cake.x + s.k * w;
      const y = on ? board.y : cake.y;
      return (
        <g key={s.id} {...common}>
          <rect x={x} y={y} width={w} height={cakeH} className="fraction-cafe-cake" />
          <rect x={x} y={y} width={w} height={cakeH * 0.3} className="fraction-cafe-icing" />
          <rect x={x} y={y} width={w} height={cakeH} className="fraction-cafe-cake-edge" />
        </g>
      );
    }
    const step = 360 / d;
    let a0: number;
    let cx: number;
    let cy: number;
    let r: number;
    if (on) {
      a0 = -90 + plate.slice(0, i).reduce((acc, id) => acc + 360 / round.stock[slices[id].food], 0);
      cx = plateC.x;
      cy = plateC.y;
      r = rp;
    } else {
      a0 = -90 + s.k * step;
      cx = foods[s.food].x;
      cy = foods[s.food].y;
      r = fr;
    }
    return (
      <g key={s.id} {...common}>
        <PizzaSlice cx={cx} cy={cy} r={r} a0={a0} a1={a0 + step} />
      </g>
    );
  };

  const counterLabel = (food: number) => `cut in ${PARTS[round.stock[food]] ?? round.stock[food]}`;
  const readout = plate.length === 0 ? 'Empty plate' : round.stock.length === 2 ? sumWorking(parts) : `${plate.length}/${round.stock[0]}`;
  const ordered = drag ? [...slices.filter((s) => s.id !== drag.id), slices[drag.id]] : slices;

  return (
    <>
      <div className="fraction-cafe-field" ref={fieldRef}>
        <svg ref={svgRef} className="fraction-cafe-svg" viewBox={`0 0 ${vb.w} ${vb.h}`} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label="Drag slices onto the plate">
          {/* Counter outlines (gaps show slices already served) */}
          {isCake ? (
            <>
              <rect x={cake.x} y={cake.y} width={cakeW} height={cakeH} className="fraction-cafe-ghost" />
              <text x={cake.x + cakeW / 2} y={cake.y + cakeH + 42} className="fraction-cafe-caption">
                {counterLabel(0)}
              </text>
              <rect x={board.x - 14} y={board.y - 14} width={cakeW + 28} height={cakeH + 28} rx={18} className="fraction-cafe-board" />
            </>
          ) : (
            <>
              {foods.map((f, i) => (
                <g key={i}>
                  <circle cx={f.x} cy={f.y} r={fr} className="fraction-cafe-ghost" />
                  <text x={f.x} y={f.y + fr + 40} className="fraction-cafe-caption">
                    {counterLabel(i)}
                  </text>
                </g>
              ))}
              <Plate cx={plateC.x} cy={plateC.y} r={plateR} />
            </>
          )}
          {ordered.map(drawSlice)}
          <FracText x={isCake ? board.x + cakeW / 2 : plateC.x} y={isCake ? board.y + cakeH + 60 : plateC.y + plateR + 48} text={readout} size={band === 3 ? 30 : 36} />
        </svg>
      </div>
      {!done && (
        <div className="fraction-cafe-actions">
          <button type="button" className="btn" onClick={() => setPlate([])} disabled={plate.length === 0}>
            <RotateCcw size={18} /> Clear plate
          </button>
          <button type="button" className="btn primary" onClick={serveIt} disabled={plate.length === 0}>
            Serve it!
          </button>
          {help}
        </div>
      )}
    </>
  );
}

const lcmOf = (round: ServeRound) => {
  const [a, b] = round.stock;
  const g = (x: number, y: number): number => (y === 0 ? x : g(y, x % y));
  return (a / g(a, b)) * b;
};

// ─────────────────────────── Compare (ages 8–9) ───────────────────────────

function CompareGame({ round, showMe, done, onAttempt, help }: ChildProps & { round: CompareRound & { customer: string } }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useBox(fieldRef);
  const wide = isWide(box);
  const vb = wide ? { w: 1000, h: 540 } : { w: 600, h: 820 };
  const plates = wide ? [{ x: 250, y: 340 }, { x: 750, y: 340 }] : [{ x: 160, y: 560 }, { x: 440, y: 560 }];
  const plateR = wide ? 150 : 125;
  const hungry = wide ? { x: 500, y: 110 } : { x: 300, y: 170 };
  const [given, setGiven] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ k: number; dx: number; dy: number } | null>(null);
  const press = useRef<{ k: number; x: number; y: number; moved: boolean } | null>(null);
  const bigger = cmp(round.plates[0], round.plates[1]) > 0 ? 0 : 1;

  const give = (k: number) => {
    if (done) return;
    setGiven(k);
    if (k === bigger) onAttempt(true, '');
    else {
      onAttempt(false, `That plate has ${fstr(round.plates[k])}. Look at how much of a whole pizza each plate covers.`);
      window.setTimeout(() => setGiven(null), 900);
    }
  };

  const pt = (e: { clientX: number; clientY: number }) => toSvgPoint(svgRef.current!, e.clientX, e.clientY);
  const onDown = (e: ReactPointerEvent<SVGElement>, k: number) => {
    if (done) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    press.current = { k, x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pr = press.current;
    if (!pr) return;
    if (!pr.moved && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < TAP_SLOP) return;
    pr.moved = true;
    const a = toSvgPoint(svgRef.current!, pr.x, pr.y);
    const b = pt(e);
    setDrag({ k: pr.k, dx: b.x - a.x, dy: b.y - a.y });
  };
  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    const pr = press.current;
    press.current = null;
    setDrag(null);
    if (!pr) return;
    if (!pr.moved) return give(pr.k);
    const p = pt(e);
    if (Math.hypot(p.x - hungry.x, p.y - hungry.y) < 150) give(pr.k);
  };

  return (
    <>
    <div className="fraction-cafe-field" ref={fieldRef}>
      <svg ref={svgRef} className="fraction-cafe-svg" viewBox={`0 0 ${vb.w} ${vb.h}`} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label="Give the plate with more pizza to the hungry customer">
        <circle cx={hungry.x} cy={hungry.y} r={78} className="fraction-cafe-spot" />
        <text x={hungry.x} y={hungry.y + 4} className="fraction-cafe-emoji" fontSize={84}>
          {round.customer}
        </text>
        {round.plates.map((f, k) => {
          const d = f.d;
          const dragging = drag?.k === k;
          const tr = dragging ? `translate(${drag.dx} ${drag.dy})` : given === k ? `translate(${(hungry.x - plates[k].x) * 0.5} ${(hungry.y - plates[k].y) * 0.5}) scale(0.9)` : undefined;
          return (
            <g
              key={k}
              transform={tr}
              className={`fraction-cafe-piece grab${dragging ? ' dragging' : ''}${showMe && k === bigger ? ' glow' : ''}`}
              style={{ transformOrigin: `${plates[k].x}px ${plates[k].y}px`, transition: dragging ? 'none' : 'transform 0.35s' }}
              onPointerDown={(e) => onDown(e, k)}
              role="button"
              tabIndex={done ? -1 : 0}
              aria-label={`Plate with ${fstr(f)} of a pizza`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  give(k);
                }
              }}
            >
              <Plate cx={plates[k].x} cy={plates[k].y} r={plateR} />
              <circle cx={plates[k].x} cy={plates[k].y} r={plateR * 0.8} className="fraction-cafe-ghost" />
              {Array.from({ length: f.n }, (_, i) => (
                <PizzaSlice key={i} cx={plates[k].x} cy={plates[k].y} r={plateR * 0.8} a0={-90 + (i * 360) / d} a1={-90 + ((i + 1) * 360) / d} />
              ))}
              <FracText x={plates[k].x} y={plates[k].y + plateR + 46} text={fstr(f)} />
            </g>
          );
        })}
      </svg>
    </div>
    {!done && <div className="fraction-cafe-actions">{help}</div>}
    </>
  );
}

// ─────────────────────────── The café ───────────────────────────

function OrderText({ round, band }: { round: Round; band: Band }) {
  if (round.kind === 'share') {
    return (
      <>
        Share the {round.food} fairly between {round.friends} friends!
      </>
    );
  }
  if (round.kind === 'compare') return <>I’m very hungry! Give me the plate with more pizza.</>;
  const f = round.order;
  const whole = round.food === 'cake' ? 'cake' : 'pizza';
  const tail =
    round.stock.length === 2
      ? ` We only have ${PARTS[round.stock[0]]} and ${PARTS[round.stock[1]]}.`
      : band === 2 && round.stock[0] !== f.d
        ? ` The pizza is cut in ${PARTS[round.stock[0]]}.`
        : '';
  return (
    <>
      Can I have{' '}
      <span className="fraction-cafe-frac" aria-label={fstr(f)}>
        <span>{f.n}</span>
        <span>{f.d}</span>
      </span>{' '}
      {f.n === f.d ? `, a whole ${whole}` : `of a ${whole}`}
      {band <= 1 && f.n !== f.d ? ` (${words(f)})` : ''}, please?{tail}
    </>
  );
}

function spokenOrder(round: Round): string {
  if (round.kind === 'share') return `Share the ${round.food} fairly between ${round.friends} friends.`;
  if (round.kind === 'compare') return 'Give me the plate with more pizza.';
  const whole = round.food === 'cake' ? 'cake' : 'pizza';
  return round.order.n === round.order.d ? `Can I have a whole ${whole}, please?` : `Can I have ${words(round.order)} of a ${whole}, please?`;
}

function Play({ band, onFinish }: GameProps) {
  const [state, setState] = useState(() => {
    const tier = savedTier(band);
    return { round: makeRound(band, tier), tier, streak: 0 };
  });
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showMe, setShowMe] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState('');
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const { round } = state;

  const onAttempt = (ok: boolean, nudge: string) => {
    if (done) return;
    if (ok) {
      play('complete');
      const clean = mistakes === 0 && !showMe;
      if (clean) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      setDone(true);
      setNote('');
      return;
    }
    play('wrong');
    const m = mistakes + 1;
    setMistakes(m);
    if (m >= 2) {
      setShowMe(true);
      setNote(round.kind === 'share' ? 'Let’s do it together: cut along the dotted lines, then give each friend a piece.' : round.kind === 'compare' ? 'The glowing plate has more. Count how much of a whole pizza it covers.' : 'Let’s do it together: put the glowing slices on the plate.');
    } else setNote(nudge);
  };

  const askHelp = () => {
    play('tap');
    if (mistakes === 0 && !note) {
      setNote(
        round.kind === 'share'
          ? `Drag across the ${round.food} to cut it. Fair shares are exactly the same size.`
          : round.kind === 'compare'
            ? 'Imagine both plates as part of a whole pizza. Which covers more?'
            : round.stock.length === 2
              ? 'Add the slices up. It helps to think of them all as the same size of slice.'
              : `Count the slices: ${fstr(round.kind === 'serve' ? round.order : { n: 1, d: 2 })} of the whole.`,
      );
      return;
    }
    setShowMe(true);
    setNote(round.kind === 'share' ? 'Cut along the dotted lines, then share.' : round.kind === 'compare' ? 'The glowing plate has more.' : 'Put the glowing slices on the plate.');
  };

  const next = () => {
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(scoreRef.current);
      }
      return;
    }
    const clean = mistakes === 0 && !showMe;
    const a = adapt(state.tier, state.streak, clean);
    saveTier(band, a.tier);
    setState({ round: makeRound(band, a.tier), ...a });
    setIndex(index + 1);
    setMistakes(0);
    setShowMe(false);
    setDone(false);
    setNote('');
  };

  const helpButton = (
    <button type="button" className="btn" onClick={askHelp}>
      <Lightbulb size={18} /> {note || mistakes ? 'Show me' : 'Help'}
    </button>
  );
  const child = { band, showMe, done, onAttempt, help: helpButton };

  return (
    <div className="fraction-cafe">
      <div className="fraction-cafe-hud">
        <div className="fraction-cafe-order" aria-live="polite">
          <span className="fraction-cafe-customer" aria-hidden>
            {round.kind === 'share' ? '🍽️' : round.customer}
          </span>
          <p className="fraction-cafe-bubble">
            {done ? explain(round) : <OrderText round={round} band={band} />}
            {band <= 1 && !done && (
              <button type="button" className="fraction-cafe-say" onClick={() => speak(spokenOrder(round), { force: true })} aria-label="Hear the order">
                <Volume2 size={18} />
              </button>
            )}
          </p>
        </div>
        <div className="fraction-cafe-stats" aria-label={`Order ${index + 1} of ${ROUNDS}, ${score} right first time`}>
          <span className="fraction-cafe-pill">
            {index + 1}/{ROUNDS}
          </span>
          <span className="fraction-cafe-pill">
            <Star size={15} fill="var(--star)" strokeWidth={2} /> {score}
          </span>
        </div>
      </div>

      {round.kind === 'share' && <ShareGame key={index} round={round} {...child} />}
      {round.kind === 'serve' && <ServeGame key={index} round={round} {...child} />}
      {round.kind === 'compare' && <CompareGame key={index} round={round} {...child} />}

      {note && !done && (
        <p className={`fraction-cafe-note${showMe ? ' show' : ''}`} role="status">
          {note}
        </p>
      )}
      {done && (
        <div className="fraction-cafe-actions">
          <button type="button" className="btn primary big" onClick={next} autoFocus>
            {index + 1 >= ROUNDS ? 'Finish' : 'Next order'}
          </button>
        </div>
      )}
    </div>
  );
}

export const game: Game = {
  id: 'fraction-cafe',
  subject: 'math',
  title: 'Fraction Café',
  blurb: 'Cut, share and serve food in fair fractions.',
  howTo: 'Read each order, then cut the food or drag slices onto the plate to serve exactly what was asked for.',
  howToByBand: [
    'Share the food fairly between the friends. Choose Cut into 2 or Cut into 4, or drag across the food to cut it. Press Share it! Give each friend an equal piece by dragging it, or tapping the piece and then the plate.',
    'Read the order. Tap or drag slices onto the plate to make that fraction, then press Serve. Tap a slice on the plate to send it back.',
    'Build the fraction on the order using the slices you have, then press Serve it! On comparison rounds, tap the plate with more food or drag it to the customer.',
    'Use the different-sized slices to make the exact amount on the order, then press Serve. Tap a plated slice to return it. Different fractions can make equal amounts.',
  ],
  color: '#ff9f43',
  icon: Pizza,
  scoreLabel: 'orders right first time',
  Play,
};
