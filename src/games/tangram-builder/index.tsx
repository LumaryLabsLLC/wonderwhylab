import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Lightbulb, RotateCcw, Shapes, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { C } from '../../lib/color';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { toSvgPoint } from '../../lib/svg';
import { adapt, areaSum, check, nextRound, parseQ, pieceName, pieceQuarters, ROUNDS, saveTier, savedTier, size, solve, verts } from './rounds';
import type { Placement, Round } from './rounds';
import './tangram-builder.css';

const COLORS = [C.red, C.blue, C.yellow, C.green, C.purple, C.orange, C.teal];
/** Empty space around the shape where pieces can sit while you work. */
const MARGIN = 1;
const GAP = 0.8;
/** How far a press can wander and still count as a tap (in grid units). */
const TAP_SLOP = 0.18;

interface PieceState {
  id: number;
  type: string;
  rot: number;
  /** Top-left corner: whole grid units on the board, or anywhere in the tray. */
  x: number;
  y: number;
  onBoard: boolean;
}

interface Layout {
  wide: boolean;
  vb: { x: number; y: number; w: number; h: number };
  slots: { x: number; y: number }[];
  slot: number;
}

const dims = (type: string, rot: number) => size(verts(type, rot));

/** Lay out board + tray side by side or stacked, whichever lets the shapes be bigger. */
function makeLayout(round: Round, boxW: number, boxH: number): Layout {
  const n = round.pieces.length;
  const slot = Math.max(...round.pieces.map((p) => Math.max(dims(p.type, 0).w, dims(p.type, 0).h))) + 0.7;
  const bx0 = -MARGIN;
  const by0 = -MARGIN;
  const bw = round.w + MARGIN * 2;
  const bh = round.h + MARGIN * 2;

  // Try the tray beside the board (1–3 columns) or under it (any number of columns) and keep
  // whichever arrangement draws everything biggest.
  const options: Layout[] = [];
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    // Beside: `cols` columns of slots to the right of the board.
    if (cols <= 3) {
      const slots = Array.from({ length: n }, (_, i) => ({ x: bx0 + bw + GAP + Math.floor(i / rows) * slot, y: by0 + (i % rows) * slot }));
      const h = Math.max(bh, rows * slot);
      options.push({ wide: true, slot, slots, vb: { x: bx0 - 0.2, y: by0 - 0.2, w: bw + GAP + cols * slot + 0.4, h: h + 0.4 } });
    }
    // Under: rows of `cols` slots below the board, centred.
    const tw = cols * slot;
    const w = Math.max(bw, tw);
    const left = bx0 + (bw - tw) / 2; // centred under the board
    const slots = Array.from({ length: n }, (_, i) => ({ x: left + (i % cols) * slot, y: by0 + bh + GAP + Math.floor(i / cols) * slot }));
    options.push({ wide: false, slot, slots, vb: { x: bx0 - (w - bw) / 2 - 0.2, y: by0 - 0.2, w: w + 0.4, h: bh + GAP + rows * slot + 0.4 } });
  }
  const scale = (l: Layout) => Math.min(boxW / l.vb.w, boxH / l.vb.h);
  return options.reduce((best, l) => (scale(l) > scale(best) + 1e-9 ? l : best));
}

/** Put a tray piece in the middle of its slot. */
function inSlot(p: { type: string; rot: number }, slot: { x: number; y: number }, s: number) {
  const d = dims(p.type, p.rot);
  return { x: slot.x + (s - d.w) / 2, y: slot.y + (s - d.h) / 2 };
}

function quarterPoints(key: string): string {
  const [cx, cy, q] = parseQ(key);
  const c = `${cx + 0.5},${cy + 0.5}`;
  const corners = [`${cx},${cy}`, `${cx + 1},${cy}`, `${cx + 1},${cy + 1}`, `${cx},${cy + 1}`];
  return `${corners[q]} ${corners[(q + 1) % 4]} ${c}`;
}

const pointsOf = (type: string, rot: number, x: number, y: number) =>
  verts(type, rot)
    .map(([a, b]) => `${a + x},${b + y}`)
    .join(' ');

type Help = 0 | 1 | 2;

function Play({ band, onFinish }: GameProps) {
  const played = useRef(new Set<string>());
  const [startTier] = useState(() => savedTier(band));
  const [round, setRound] = useState<Round>(() => nextRound(band, startTier, played.current));
  const [adaptState, setAdaptState] = useState({ tier: startTier, streak: 0 });
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [pieces, setPieces] = useState<PieceState[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [help, setHelp] = useState<Help>(0);
  const [showedMe, setShowedMe] = useState(false);
  const [solved, setSolved] = useState(false);
  const [drag, setDrag] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const [box, setBox] = useState({ w: 800, h: 500 });
  const [note, setNote] = useState('');

  const fieldRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: number; px: number; py: number; moved: boolean } | null>(null);
  const finished = useRef(false);
  const scoreRef = useRef(0);
  const wasComplete = useRef(false);

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width || 800, h: e.contentRect.height || 500 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => makeLayout(round, box.w, box.h), [round, box.w, box.h]);

  // Fresh round: every piece waits in the tray.
  useEffect(() => {
    setPieces(round.pieces.map((p, i) => ({ id: i, type: p.type, rot: p.rot, ...inSlot(p, layout.slots[i], layout.slot), onBoard: false })));
    setMistakes(0);
    setHelp(0);
    setShowedMe(false);
    setSolved(false);
    setNote('');
    wasComplete.current = false;
    // Only when the round changes; tray positions are re-flowed below if the layout changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Keep tray pieces in their slots if the screen is resized.
  useEffect(() => {
    setPieces((ps) => ps.map((p) => (p.onBoard ? p : { ...p, ...inSlot(p, layout.slots[p.id], layout.slot) })));
  }, [layout]);

  const placed = pieces.filter((p) => p.onBoard);
  const status = useMemo(() => check(round, placed, round.pieces.length), [round, placed]);
  const allOnBoard = pieces.length > 0 && placed.length === pieces.length;

  // Solved → celebrate; every piece placed but not solved → that's a "not yet".
  useEffect(() => {
    if (solved || pieces.length === 0) return;
    if (status.solved) {
      setSolved(true);
      play('complete');
      const clean = mistakes === 0 && !showedMe;
      if (clean) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      setAdaptState((s) => {
        const a = adapt(s.tier, s.streak, clean);
        saveTier(band, a.tier);
        return a;
      });
      return;
    }
    if (allOnBoard && !drag && !wasComplete.current) {
      // Arrow keys move a piece through intermediate positions. Let it settle before judging it.
      const timer = window.setTimeout(() => {
        wasComplete.current = true;
        const m = mistakes + 1;
        setMistakes(m);
        play('wrong');
        if (m >= 2) {
          showMe();
          setNote('Let’s do one together: the pieces that didn’t fit went back. Put the glowing piece on the dotted spot.');
        } else {
          setNote('Not yet! The pieces with red edges stick out or overlap. Try turning or moving them.');
        }
      }, 700);
      return () => window.clearTimeout(timer);
    }
    if (!allOnBoard) wasComplete.current = false;
  }, [status.solved, allOnBoard, drag, solved, pieces, mistakes, showedMe]);

  /** "Show me": where one more piece should go, keeping the child's correct pieces. */
  const ghost = useMemo((): (Placement & { pieceId: number }) | null => {
    if (help < 2 || solved) return null;
    const same = (a: Placement, b: Placement) => a.type === b.type && a.rot === b.rot && a.x === b.x && a.y === b.y;
    const good = placed.filter((p) => !status.bad[placed.indexOf(p)]);
    const goodIds = new Set(good.map((p) => p.id));
    const rest = pieces.filter((p) => !goodIds.has(p.id));
    const plan = [...good, ...(solve(round.target, rest.map((p) => p.type), good) ?? round.solution)];
    // A spot that no piece already fills exactly…
    const target = plan.find((s) => !placed.some((p) => same(p, s)));
    if (!target) return null;
    // …and a piece of that kind that isn't already sitting in one of the plan's spots.
    const fits = (p: PieceState) => p.onBoard && plan.some((s) => same(p, s));
    const piece = pieces.find((p) => p.type === target.type && !fits(p)) ?? pieces.find((p) => p.type === target.type);
    return piece ? { ...target, pieceId: piece.id } : null;
  }, [help, solved, placed, status.bad, pieces, round]);

  // ── Pointer handling ──
  const svgPoint = (e: { clientX: number; clientY: number }) => toSvgPoint(svgRef.current!, e.clientX, e.clientY);

  const onPieceDown = (e: ReactPointerEvent<SVGGElement>, id: number) => {
    if (solved) return;
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = svgPoint(e);
    press.current = { id, px: p.x, py: p.y, moved: false };
  };

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pr = press.current;
    if (!pr) return;
    const p = svgPoint(e);
    const dx = p.x - pr.px;
    const dy = p.y - pr.py;
    if (!pr.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    pr.moved = true;
    setDrag({ id: pr.id, dx, dy });
  };

  const finishPress = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pr = press.current;
    press.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (!pr) return;
    if (!pr.moved) {
      rotate(pr.id);
      return;
    }
    const d = drag;
    setDrag(null);
    if (d) drop(pr.id, d.dx, d.dy);
  };

  const clampToBoard = (type: string, rot: number, x: number, y: number) => {
    const d = dims(type, rot);
    return {
      x: Math.min(Math.max(Math.round(x), -MARGIN), round.w + MARGIN - d.w),
      y: Math.min(Math.max(Math.round(y), -MARGIN), round.h + MARGIN - d.h),
    };
  };

  const drop = (id: number, dx: number, dy: number) => {
    setPieces((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const d = dims(p.type, p.rot);
        const x = p.x + dx;
        const y = p.y + dy;
        const cx = x + d.w / 2;
        const cy = y + d.h / 2;
        const onBoard = cx > -MARGIN && cx < round.w + MARGIN && cy > -MARGIN && cy < round.h + MARGIN;
        if (!onBoard) return { ...p, ...inSlot(p, layout.slots[p.id], layout.slot), onBoard: false };
        play('pop');
        return { ...p, ...clampToBoard(p.type, p.rot, x, y), onBoard: true };
      }),
    );
  };

  const rotate = (id: number) => {
    if (solved) return;
    play('tap');
    setPieces((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const rot = (p.rot + 1) % 4;
        if (!p.onBoard) return { ...p, rot, ...inSlot({ type: p.type, rot }, layout.slots[p.id], layout.slot) };
        const a = dims(p.type, p.rot);
        const b = dims(p.type, rot);
        return { ...p, rot, ...clampToBoard(p.type, rot, p.x + (a.w - b.w) / 2, p.y + (a.h - b.h) / 2) };
      }),
    );
  };

  const onPieceKey = (e: ReactKeyboardEvent, id: number) => {
    if (solved) return;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'r') {
      e.preventDefault();
      rotate(id);
    } else if (moves[e.key]) {
      e.preventDefault();
      const [mx, my] = moves[e.key];
      setPieces((ps) =>
        ps.map((p) => {
          if (p.id !== id) return p;
          if (!p.onBoard) return { ...p, ...clampToBoard(p.type, p.rot, 0, 0), onBoard: true };
          return { ...p, ...clampToBoard(p.type, p.rot, p.x + mx, p.y + my) };
        }),
      );
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      setPieces((ps) => ps.map((p) => (p.id === id ? { ...p, ...inSlot(p, layout.slots[p.id], layout.slot), onBoard: false } : p)));
    }
  };

  /** "Show me": pieces that don't fit go back to the tray, then one spot is shown. */
  const showMe = () => {
    setHelp(2);
    setShowedMe(true);
    setPieces((ps) => {
      const on = ps.filter((p) => p.onBoard);
      const res = check(round, on, round.pieces.length);
      return ps.map((p) => (p.onBoard && res.bad[on.indexOf(p)] ? { ...p, ...inSlot(p, layout.slots[p.id], layout.slot), onBoard: false } : p));
    });
    wasComplete.current = false;
  };

  const askHelp = () => {
    if (solved) return;
    play('tap');
    if (help === 0) {
      setHelp(1);
      setNote(
        band === 3
          ? 'Tip: start with the biggest rectangle in the biggest part of the shape. Tap a piece to turn it.'
          : 'Tip: start with the biggest piece and look for a corner it fits. Tap a piece to turn it.',
      );
    } else {
      showMe();
      setNote('Put the glowing piece on the dotted spot.');
    }
  };

  const resetPieces = () => {
    play('whoosh');
    setPieces((ps) => ps.map((p) => ({ ...p, ...inSlot(p, layout.slots[p.id], layout.slot), onBoard: false })));
    wasComplete.current = false;
  };

  const next = () => {
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(scoreRef.current);
      }
      return;
    }
    setIndex(index + 1);
    setRound(nextRound(band, adaptState.tier, played.current));
  };

  const { vb } = layout;
  const ordered = drag ? [...pieces.filter((p) => p.id !== drag.id), ...pieces.filter((p) => p.id === drag.id)] : pieces;
  const quarters = [...round.target];
  const clipId = `tb-clip-${index}`;

  const goal = solved ? (band === 3 ? `Filled! Area = ${areaSum(round)}.` : round.puzzle.reveal) : round.puzzle.goal;

  return (
    <div className="tangram-builder">
      <div className="tangram-builder-hud">
        <p className="tangram-builder-goal" aria-live="polite">
          {goal}
          {band <= 1 && !solved && (
            <button type="button" className="tangram-builder-say" onClick={() => speak(round.puzzle.goal, { force: true })} aria-label="Hear it">
              <Volume2 size={18} />
            </button>
          )}
        </p>
        <div className="tangram-builder-stats" aria-label={`Shape ${index + 1} of ${ROUNDS}, ${score} built without help`}>
          <span className="tangram-builder-pill">
            {index + 1}/{ROUNDS}
          </span>
          <span className="tangram-builder-pill">
            <Star size={15} fill="var(--star)" strokeWidth={2} /> {score}
          </span>
        </div>
      </div>

      <div className="tangram-builder-field" ref={fieldRef}>
        <svg
          ref={svgRef}
          className="tangram-builder-svg"
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={onMove}
          onPointerUp={finishPress}
          onPointerCancel={finishPress}
          role="application"
          aria-label={`Build the ${round.puzzle.name}. Drag pieces onto the shape. Tap a piece to turn it.`}
        >
          <defs>
            <clipPath id={clipId}>
              {quarters.map((q) => (
                <polygon key={q} points={quarterPoints(q)} />
              ))}
            </clipPath>
          </defs>
          {/* Board */}
          <rect x={-MARGIN + 0.1} y={-MARGIN + 0.1} width={round.w + MARGIN * 2 - 0.2} height={round.h + MARGIN * 2 - 0.2} rx={0.35} className="tangram-builder-board" />
          {/* The shape to fill */}
          <g className={`tangram-builder-shape${solved ? ' done' : ''}`}>
            {quarters.map((q) => (
              <polygon key={q} points={quarterPoints(q)} />
            ))}
          </g>
          {round.puzzle.grid && (
            <g clipPath={`url(#${clipId})`} className="tangram-builder-grid">
              {Array.from({ length: round.w + 1 }, (_, i) => (
                <line key={`v${i}`} x1={i} y1={0} x2={i} y2={round.h} />
              ))}
              {Array.from({ length: round.h + 1 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i} x2={round.w} y2={i} />
              ))}
            </g>
          )}

          {/* "Show me": a dotted outline where a piece goes. */}
          {ghost && <polygon className="tangram-builder-ghost" points={pointsOf(ghost.type, ghost.rot, ghost.x, ghost.y)} />}

          {/* Tray slots */}
          {layout.slots.map((s, i) => (
            <rect key={i} x={s.x + 0.08} y={s.y + 0.08} width={layout.slot - 0.16} height={layout.slot - 0.16} rx={0.3} className="tangram-builder-slot" />
          ))}

          {/* Pieces */}
          {ordered.map((p) => {
            const d = dims(p.type, p.rot);
            const isDrag = drag?.id === p.id;
            const x = p.x + (isDrag ? drag.dx : 0);
            const y = p.y + (isDrag ? drag.dy : 0);
            const bad = p.onBoard && (allOnBoard || mistakes > 0) && status.bad[placed.findIndex((q) => q.id === p.id)];
            const glowing = ghost?.pieceId === p.id;
            const area = band === 3 && solved ? pieceQuarters(p.type, p.rot, 0, 0).length / 4 : null;
            return (
              <g
                key={p.id}
                className={`tangram-builder-piece${isDrag ? ' dragging' : ''}${bad ? ' bad' : ''}${glowing ? ' glow' : ''}${solved ? ' done' : ''}`}
                onPointerDown={(e) => onPieceDown(e, p.id)}
                onKeyDown={(e) => onPieceKey(e, p.id)}
                tabIndex={solved ? -1 : 0}
                role="button"
                aria-label={`${pieceName(p.type)}${p.onBoard ? ', on the shape' : ''}. Drag to move, tap or press Enter to turn.`}
              >
                <rect x={x - 0.3} y={y - 0.3} width={d.w + 0.6} height={d.h + 0.6} fill="transparent" />
                <polygon points={pointsOf(p.type, p.rot, x, y)} fill={COLORS[p.id % COLORS.length]} />
                {round.puzzle.grid && (
                  <g className="tangram-builder-units" clipPath={`url(#tb-piece-${index}-${p.id})`}>
                    <clipPath id={`tb-piece-${index}-${p.id}`}>
                      <polygon points={pointsOf(p.type, p.rot, x, y)} />
                    </clipPath>
                    {Array.from({ length: d.w - 1 }, (_, i) => (
                      <line key={`v${i}`} x1={x + i + 1} y1={y} x2={x + i + 1} y2={y + d.h} />
                    ))}
                    {Array.from({ length: d.h - 1 }, (_, i) => (
                      <line key={`h${i}`} x1={x} y1={y + i + 1} x2={x + d.w} y2={y + i + 1} />
                    ))}
                  </g>
                )}
                {area !== null && (
                  <text x={x + d.w / 2} y={y + d.h / 2} className="tangram-builder-area">
                    {area}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {note && !solved && (
        <p className={`tangram-builder-note${help === 2 ? ' show' : ''}`} role="status">
          {note}
        </p>
      )}

      <div className="tangram-builder-actions">
        {solved ? (
          <button type="button" className="btn primary big" onClick={next} autoFocus>
            {index + 1 >= ROUNDS ? 'Finish' : 'Next shape'}
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={resetPieces}>
              <RotateCcw size={18} /> Start again
            </button>
            <button type="button" className="btn" onClick={askHelp}>
              <Lightbulb size={18} /> {help === 0 ? 'Help' : 'Show me'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'tangram-builder',
  subject: 'math',
  title: 'Shape Builder',
  blurb: 'Fit shapes together to build pictures.',
  howTo: 'Drag the pieces onto the shape so they fill it with no gaps. Tap a piece to turn it.',
  color: '#14b8a6',
  icon: Shapes,
  scoreLabel: 'shapes built without help',
  Play,
};
