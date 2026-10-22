import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Lightbulb, Star, Volume2, Zap } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { toSvgPoint } from '../../lib/svg';
import {
  analyze,
  hintStep,
  isBulb,
  isOut,
  judge,
  makePuzzles,
  MATERIALS,
  PART_MASK,
  placeTile,
  putMaterial,
  removeTile,
  ROUNDS,
  screwIn,
  sidesOf,
  tapCell,
  trayLeft,
  E,
  W,
} from './circuit';
import type { Arms, Board, Cell, MaterialId, Part, Side, Tile } from './circuit';
import './circuit-builder.css';

const CELL = 100;
const HALF = CELL / 2;
/** Offset from a cell's centre to the middle of each side. */
const END: Record<Side, [number, number]> = { 0: [0, -HALF], 1: [HALF, 0], 2: [0, HALF], 3: [-HALF, 0] };

const GOALS: Record<Band, string> = {
  0: 'Which one lets electricity through? Drag it into the gap.',
  1: 'Tap the wires to turn them. Make a loop to light the bulb.',
  2: 'Fill the gaps and close the switch to light both bulbs.',
  3: 'Give each bulb its own path, so one stays lit when the other is unscrewed.',
};

const SHORT = 'Short circuit! A wire joins + straight to − with no bulb on the way. That makes a battery hot, so take it out.';

type Item = { kind: 'tile'; tile: Tile } | { kind: 'material'; id: MaterialId };
const itemKey = (it: Item) => (it.kind === 'tile' ? `t${it.tile.id}` : `m${it.id}`);

interface Drag {
  item: Item;
  /** The cell it was lifted from, or null when it came from the tray. */
  from: number | null;
  sx: number;
  sy: number;
  x: number;
  y: number;
  moved: boolean;
  over: number;
}

const slotOf = (board: Board) => board.cells.findIndex((c) => c?.kind === 'slot');
const slotMaterial = (board: Board) => {
  const c = board.cells[slotOf(board)];
  return c?.kind === 'slot' ? c.material : null;
};

function explain(band: Band, board: Board): string {
  switch (band) {
    case 0: {
      const m = slotMaterial(board);
      return `Yes! The ${m ? MATERIALS[m].name : 'metal'} is made of metal. Metal is a conductor, so electricity flows through it and the bulb lights up.`;
    }
    case 1:
      return 'A complete loop! Electricity flows out of the battery, through the bulb and back again.';
    case 2:
      return 'The closed switch completes the loop, so electricity flows through both bulbs. A dead-end wire carries nothing.';
    case 3:
      return 'A parallel circuit: each bulb has its own path. Tap a bulb to unscrew it, and the other stays lit!';
  }
}

function Play({ band, onFinish }: GameProps) {
  const puzzles = useMemo(() => makePuzzles(band), [band]);
  const [index, setIndex] = useState(0);
  const puzzle = puzzles[index];
  const [board, setBoard] = useState<Board>(puzzle.board);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [hinted, setHinted] = useState(false);
  const [hintNote, setHintNote] = useState('');
  const [hintCell, setHintCell] = useState(-1);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [press, setPress] = useState<number>(-1);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const triesRef = useRef(0);
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const suppressClick = useRef(false);
  const lastVerdict = useRef('');

  const live = useMemo(() => analyze(board), [board]);
  const verdict = useMemo(() => judge(band === 3 ? screwIn(board) : board, puzzle.goal, puzzle.bulbs), [band, board, puzzle]);
  const tray: Item[] =
    band === 0
      ? puzzle.materials.filter((m) => m !== slotMaterial(board)).map((id) => ({ kind: 'material', id }))
      : trayLeft(puzzle, board).map((tile) => ({ kind: 'tile', tile }));
  const conductor = puzzle.materials.find((m) => MATERIALS[m].conductor);

  useEffect(() => {
    if (verdict === 'short' && lastVerdict.current !== 'short') play('wrong');
    lastVerdict.current = verdict;
  }, [verdict]);

  /** Every change to the board goes through here. */
  const commit = (next: Board, opts: { hint?: boolean } = {}) => {
    if (next === board) return;
    setBoard(next);
    if (!opts.hint) {
      setHintNote('');
      setHintCell(-1);
    }
    if (phase === 'done') return;
    const v = judge(band === 3 ? screwIn(next) : next, puzzle.goal, puzzle.bulbs);
    if (band === 0) {
      const m = slotMaterial(next);
      if (m && m !== slotMaterial(board)) {
        triesRef.current += 1;
        if (!MATERIALS[m].conductor) play('wrong');
      }
    }
    if (v !== 'solved') return;
    play('correct');
    setPhase('done');
    setSelected(null);
    const firstTry = band === 0 ? triesRef.current === 1 : true;
    if (firstTry && !hinted && !opts.hint) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
  };

  const next = () => {
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(scoreRef.current);
      }
      return;
    }
    const n = index + 1;
    setIndex(n);
    setBoard(puzzles[n].board);
    setPhase('play');
    setHinted(false);
    setHintNote('');
    setHintCell(-1);
    setSelected(null);
    triesRef.current = 0;
    play('whoosh');
  };

  const useHint = () => {
    setHinted(true);
    if (band === 0) {
      setHintNote('Look for something made of metal.');
      return;
    }
    const after = hintStep(puzzle, board);
    // The cell that changed (not the gap a tile was moved out of).
    setHintCell(after.cells.findIndex((c, i) => c !== board.cells[i] && !(c?.kind === 'gap' && !c.tile)));
    setHintNote("Here's one piece. Can you do the rest?");
    play('pop');
    commit(after, { hint: true });
  };

  // ─── Placing things ────────────────────────────────────────────────────────

  const accepts = (item: Item, i: number) => {
    const c = board.cells[i];
    return item.kind === 'material' ? c?.kind === 'slot' : c?.kind === 'gap';
  };

  /** Put `item` into cell `to`. `from` is the cell it was lifted out of, if any. */
  const drop = (item: Item, to: number, from: number | null) => {
    if (!accepts(item, to)) return false;
    play('pop');
    if (item.kind === 'material') {
      commit(putMaterial(board, to, item.id));
    } else {
      const base = from !== null && from !== to ? removeTile(board, from) : board;
      commit(placeTile(base, to, item.tile));
    }
    setSelected(null);
    return true;
  };

  const lift = (from: number) => {
    const c = board.cells[from];
    if (c?.kind === 'slot') commit(putMaterial(board, from, null));
    else commit(removeTile(board, from));
    play('tap');
  };

  /** A tap (or Enter) on a board cell. */
  const activate = (i: number) => {
    const c = board.cells[i];
    if (!c) return;
    if (phase === 'done') {
      // After a parallel circuit is built, bulbs can still be unscrewed to test it.
      if (band === 3 && isBulb(c)) {
        play('tap');
        commit(tapCell(board, i, band));
      }
      return;
    }
    const held = selected ? tray.find((t) => itemKey(t) === selected) : undefined;
    if (held && accepts(held, i)) {
      drop(held, i, null);
      return;
    }
    const next = tapCell(board, i, band);
    if (next !== board) {
      play('tap');
      commit(next);
    }
  };

  const cellAt = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return -1;
    const p = toSvgPoint(svg, clientX, clientY);
    const x = Math.floor(p.x / CELL);
    const y = Math.floor(p.y / CELL);
    if (x < 0 || y < 0 || x >= board.w || y >= board.h) return -1;
    return y * board.w + x;
  };

  const startDrag = (e: ReactPointerEvent<Element>, item: Item, from: number | null) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const d: Drag = { item, from, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false, over: -1 };
    dragRef.current = d;
    setDrag(d);
  };

  const moveDrag = (e: ReactPointerEvent<Element>) => {
    const d = dragRef.current;
    if (!d) return;
    const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8;
    const over = cellAt(e.clientX, e.clientY);
    const next = { ...d, x: e.clientX, y: e.clientY, moved, over: over >= 0 && accepts(d.item, over) ? over : -1 };
    dragRef.current = next;
    setDrag(next);
  };

  /** Returns true when the pointer travelled (a drag), false for a plain tap. */
  const endDrag = (e: ReactPointerEvent<Element>, cancelled = false) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d || !d.moved || cancelled) return !!d?.moved;
    const to = cellAt(e.clientX, e.clientY);
    if (to >= 0 && to === d.from) return true;
    if (!(to >= 0 && drop(d.item, to, d.from)) && d.from !== null) lift(d.from);
    return true;
  };

  // Tray: drag out, or tap to pick up and then tap a gap.
  const onTrayDown = (e: ReactPointerEvent<HTMLButtonElement>, item: Item) => {
    if (phase === 'done' || e.button > 0) return;
    e.preventDefault();
    // A dragged tile leaves the tray, so its click never arrives: reset for this new press.
    suppressClick.current = false;
    startDrag(e, item, null);
  };
  const onTrayUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (endDrag(e)) suppressClick.current = true;
  };
  const onTrayClick = (item: Item) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (phase === 'done') return;
    play('tap');
    setSelected((s) => (s === itemKey(item) ? null : itemKey(item)));
  };

  // Board: tap to turn / flip / place; drag a placed tile to move it or take it back.
  const onBoardDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button > 0) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0) return;
    const c = board.cells[i];
    setPress(i);
    if (phase === 'play' && !selected) {
      if (c?.kind === 'gap' && c.tile) return startDrag(e, { kind: 'tile', tile: { id: c.tile.id, part: c.tile.part } }, i);
      if (c?.kind === 'slot' && c.material) return startDrag(e, { kind: 'material', id: c.material }, i);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onBoardUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const start = press;
    setPress(-1);
    if (dragRef.current) {
      if (endDrag(e)) return;
    } else if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const i = cellAt(e.clientX, e.clientY);
    if (i >= 0 && i === start) activate(i);
  };

  const onCellKey = (e: ReactKeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(i);
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && phase === 'play') {
      const c = board.cells[i];
      if ((c?.kind === 'gap' && c.tile) || (c?.kind === 'slot' && c.material)) lift(i);
    }
  };

  // ─── Words ─────────────────────────────────────────────────────────────────

  const anyOut = board.cells.some((c) => isBulb(c) && isOut(c));
  let message: string;
  if (phase === 'done') message = explain(band, board);
  else if (hintNote) message = hintNote;
  else if (verdict === 'short') message = SHORT;
  else if (band === 0) {
    const m = slotMaterial(board);
    message = m
      ? `The ${MATERIALS[m].name} is made of ${MATERIALS[m].stuff}. That's an insulator: electricity can't get through. Try another!`
      : 'Drag a thing into the gap. Does the bulb light up?';
  } else if (verdict === 'series')
    message = anyOut
      ? 'One bulb out and both go dark: they share one path (a series circuit). Give each bulb its own path.'
      : 'Both glow, but they share one path. Tap a bulb to unscrew it. What happens?';
  else if (anyOut) message = 'That bulb is unscrewed. Tap it to screw it back in.';
  else if (band === 2 && judge(screwIn(board, true), puzzle.goal, puzzle.bulbs) === 'solved') message = 'Nearly! The switch is open. Tap it to close the gap.';
  else if (band === 1) message = 'Follow the wire from + round to −. Where is the loop broken?';
  else if (tray.length) message = 'Drag parts into the empty spaces. You may not need them all.';
  else message = 'Electricity needs a path from + all the way round to −.';

  const hintTarget = hintNote && band === 0 ? `m${conductor}` : '';

  // ─── Drawing ───────────────────────────────────────────────────────────────

  const vw = board.w * CELL;
  const vh = board.h * CELL;

  return (
    <div className="circuit-builder">
      <div className="cb-hud">
        <p className="cb-goal">{GOALS[band]}</p>
        <div className="cb-stats">
          <button type="button" className="cb-icon" onClick={() => speak(`${GOALS[band]} ${message}`, { force: true })} aria-label="Hear the goal">
            <Volume2 size={18} />
          </button>
          <span className="cb-pill" aria-label={`Circuit ${index + 1} of ${ROUNDS}`}>
            <Zap size={15} /> {index + 1}/{ROUNDS}
          </span>
          <span className="cb-pill" aria-label={`${score} points`}>
            <Star size={15} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className={`cb-stage${verdict === 'short' && phase === 'play' ? ' short' : ''}${phase === 'done' ? ' done' : ''}`}>
        <svg
          ref={svgRef}
          key={index}
          className="cb-svg"
          viewBox={`-14 -14 ${vw + 28} ${vh + 28}`}
          onPointerDown={onBoardDown}
          onPointerMove={moveDrag}
          onPointerUp={onBoardUp}
          onPointerCancel={(e) => {
            setPress(-1);
            endDrag(e, true);
          }}
          role="group"
          aria-label={`Circuit board. ${live.lit.size} ${live.lit.size === 1 ? 'bulb' : 'bulbs'} lit.`}
        >
          <rect x={-12} y={-12} width={vw + 24} height={vh + 24} rx={28} className="cb-board" />
          {board.cells.map((c, i) => {
            const cx = (i % board.w) * CELL + HALF;
            const cy = Math.floor(i / board.w) * CELL + HALF;
            if (!c) return <circle key={i} cx={cx} cy={cy} r={4} className="cb-dot" />;
            const lifted = drag?.moved && drag.from === i;
            return (
              <CellView
                key={i}
                cell={lifted ? emptied(c) : c}
                cx={cx}
                cy={cy}
                flow={live.flow.get(i)}
                spark={live.sparks.get(i)}
                lit={live.lit.has(i)}
                band={band}
                over={drag?.moved === true && drag.over === i}
                ready={!!selected && !!tray.find((t) => itemKey(t) === selected && accepts(t, i))}
                hint={hintCell === i}
                pressed={press === i}
              />
            );
          })}
          {/* Invisible, focusable hit areas for keyboard players. */}
          {board.cells.map((c, i) => {
            if (!interactive(c, band)) return null;
            return (
              <rect
                key={`k${i}`}
                x={(i % board.w) * CELL + 2}
                y={Math.floor(i / board.w) * CELL + 2}
                width={CELL - 4}
                height={CELL - 4}
                rx={16}
                className="cb-hit"
                tabIndex={0}
                role="button"
                aria-label={cellLabel(c!, live.lit.has(i))}
                onKeyDown={(e) => onCellKey(e, i)}
              />
            );
          })}
        </svg>
      </div>

      {(band === 0 || puzzle.tray.length > 0) && (
        <div className={`cb-tray${band === 0 ? ' materials' : ''}`} aria-label="Parts">
          {tray.length === 0 && <span className="cb-tray-empty">All parts are on the board.</span>}
          {tray.map((item) => {
            const key = itemKey(item);
            const hidden = drag?.moved && drag.from === null && itemKey(drag.item) === key;
            return (
              <button
                key={key}
                type="button"
                className={`cb-item${selected === key ? ' selected' : ''}${hintTarget === key ? ' hint' : ''}${hidden ? ' lifted' : ''}`}
                onPointerDown={(e) => onTrayDown(e, item)}
                onPointerMove={moveDrag}
                onPointerUp={onTrayUp}
                onPointerCancel={(e) => endDrag(e, true)}
                onClick={() => onTrayClick(item)}
                aria-pressed={selected === key}
                aria-label={item.kind === 'material' ? MATERIALS[item.id].name : partName(item.tile.part)}
                disabled={phase === 'done'}
              >
                <ItemArt item={item} />
                {item.kind === 'material' && <span className="cb-item-name">{MATERIALS[item.id].name}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="cb-foot" role="status">
        <p className={`cb-msg${phase === 'done' ? ' good' : verdict === 'short' ? ' warn' : ''}`}>{message}</p>
        {phase === 'done' ? (
          <button type="button" className="btn primary" onClick={next} autoFocus>
            {index + 1 >= ROUNDS ? 'Finish' : 'Next'} <ArrowRight size={18} />
          </button>
        ) : (
          <button type="button" className="btn" onClick={useHint}>
            <Lightbulb size={16} /> Hint
          </button>
        )}
      </div>

      {drag?.moved && (
        <div className="cb-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <ItemArt item={drag.item} />
        </div>
      )}
    </div>
  );
}

/** A gap or slot shown empty while its contents are being dragged away. */
function emptied(c: Cell): Cell {
  if (c.kind === 'gap') return { ...c, tile: null };
  if (c.kind === 'slot') return { ...c, material: null };
  return c;
}

function interactive(c: Cell | null, band: Band): boolean {
  if (!c) return false;
  if (c.kind === 'wire') return c.turnable;
  if (c.kind === 'bulb') return band === 3;
  return c.kind === 'switch' || c.kind === 'gap' || c.kind === 'slot';
}

const partName = (p: Part) => ({ straight: 'straight wire', corner: 'corner wire', tee: 'T wire', bulb: 'bulb' })[p];

function cellLabel(c: Cell, lit: boolean): string {
  switch (c.kind) {
    case 'wire':
      return `${partName(c.part)}, tap to turn`;
    case 'switch':
      return `Switch, ${c.closed ? 'closed' : 'open'}`;
    case 'bulb':
      return `Bulb, ${c.out ? 'unscrewed' : lit ? 'lit' : 'dark'}`;
    case 'slot':
      return c.material ? `Gap with ${MATERIALS[c.material].name}` : 'Empty gap';
    case 'gap':
      return c.tile ? `${partName(c.tile.part)}${c.tile.part === 'bulb' ? (c.tile.out ? ', unscrewed' : lit ? ', lit' : ', dark') : ''}` : 'Empty space';
    default:
      return 'Battery';
  }
}

// ─── Pictures ──────────────────────────────────────────────────────────────────

type ArmDirs = Arms extends Map<number, infer V> ? V : never;

const armPath = (mask: number, cx: number, cy: number, inner = 0) =>
  sidesOf(mask)
    .map((s) => {
      const [dx, dy] = END[s];
      const k = inner / HALF;
      return `M${cx + dx * k} ${cy + dy * k}L${cx + dx} ${cy + dy}`;
    })
    .join('');

/** Copper wire arms from the centre (or from `inner` out) to the open sides. */
function Wire({ mask, cx, cy, inner = 0 }: { mask: number; cx: number; cy: number; inner?: number }) {
  const d = armPath(mask, cx, cy, inner);
  return (
    <g>
      <path d={d} className="cb-w-edge" />
      {inner === 0 && <circle cx={cx} cy={cy} r={9} className="cb-w-edge-dot" />}
      <path d={d} className="cb-w-core" />
      {inner === 0 && <circle cx={cx} cy={cy} r={5} className="cb-w-core-dot" />}
    </g>
  );
}

/** Moving dashes along the arms that carry current, in the direction it flows. */
function Flow({ arms, cx, cy, inner = 0, spark }: { arms: ArmDirs; cx: number; cy: number; inner?: number; spark?: boolean }) {
  return (
    <g className={spark ? 'cb-spark' : 'cb-flow'}>
      {[...arms].map(([s, dir]) => {
        const [dx, dy] = END[s];
        const k = inner / HALF;
        const a = [cx + dx * k, cy + dy * k];
        const b = [cx + dx, cy + dy];
        const [p, q] = dir === 1 ? [a, b] : [b, a];
        return <line key={s} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;
      })}
    </g>
  );
}

function Battery({ cx, cy, plus }: { cx: number; cy: number; plus: Side }) {
  const angle = (plus - 1) * 90;
  const [ux, uy] = [END[plus][0] / HALF, END[plus][1] / HALF];
  return (
    <g>
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        <Wire mask={E | W} cx={cx} cy={cy} inner={32} />
        <rect x={cx - 34} y={cy - 21} width={64} height={42} rx={9} fill="var(--ink)" />
        <path d={`M${cx + 8} ${cy - 21}H${cx + 21}a9 9 0 0 1 9 9V${cy + 12}a9 9 0 0 1 -9 9H${cx + 8}Z`} fill="var(--sun)" />
        <rect x={cx + 30} y={cy - 8} width={6} height={16} rx={2} fill="var(--ink)" />
        <rect x={cx - 34} y={cy - 21} width={64} height={42} rx={9} fill="none" stroke="var(--ink)" strokeWidth={3} />
      </g>
      <text x={cx + ux * 15} y={cy + uy * 15} className="cb-sign plus">
        +
      </text>
      <text x={cx - ux * 14} y={cy - uy * 14} className="cb-sign minus">
        −
      </text>
    </g>
  );
}

const FILAMENT = [[-28, 0], [-14, 0], [-10, -8], [-5, 8], [0, -8], [5, 8], [10, -8], [14, 0], [28, 0]];

/** A bulb drawn left-to-right; `vertical` turns it to run top-to-bottom. */
function Bulb({ cx, cy, lit, out, vertical }: { cx: number; cy: number; lit: boolean; out: boolean; vertical: boolean }) {
  return (
    <g transform={vertical ? `rotate(90 ${cx} ${cy})` : undefined}>
      <Wire mask={E | W} cx={cx} cy={cy} inner={26} />
      {lit && <circle cx={cx} cy={cy} r={46} className="cb-halo" />}
      <g className={`cb-globe${out ? ' out' : ''}`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {lit &&
          [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line
              key={a}
              x1={cx + Math.cos((a * Math.PI) / 180) * 34}
              y1={cy + Math.sin((a * Math.PI) / 180) * 34}
              x2={cx + Math.cos((a * Math.PI) / 180) * 42}
              y2={cy + Math.sin((a * Math.PI) / 180) * 42}
              className="cb-ray"
            />
          ))}
        <circle cx={cx} cy={cy} r={28} className={`cb-glass${lit ? ' lit' : ''}`} />
        <polyline
          points={FILAMENT.map(([x, y]) => `${cx + x},${cy + y}`).join(' ')}
          className={`cb-filament${lit ? ' lit' : ''}`}
        />
      </g>
    </g>
  );
}

function Switch({ cx, cy, closed, vertical }: { cx: number; cy: number; closed: boolean; vertical: boolean }) {
  return (
    <g transform={vertical ? `rotate(90 ${cx} ${cy})` : undefined}>
      <Wire mask={E | W} cx={cx} cy={cy} inner={26} />
      <rect x={cx - 38} y={cy - 18} width={76} height={36} rx={12} className="cb-plate" />
      <circle cx={cx - 26} cy={cy} r={7} className="cb-terminal" />
      <circle cx={cx + 26} cy={cy} r={7} className="cb-terminal" />
      <g className="cb-lever" style={{ transform: `rotate(${closed ? 0 : -34}deg)`, transformOrigin: `${cx - 26}px ${cy}px` }}>
        <line x1={cx - 26} y1={cy} x2={cx + 30} y2={cy} className="cb-lever-edge" />
        <line x1={cx - 26} y1={cy} x2={cx + 30} y2={cy} className="cb-lever-core" />
        <circle cx={cx + 14} cy={cy} r={7} fill="var(--coral)" stroke="var(--ink)" strokeWidth={2.5} />
      </g>
    </g>
  );
}

function CellView({
  cell,
  cx,
  cy,
  flow,
  spark,
  lit,
  band,
  over,
  ready,
  hint,
  pressed,
}: {
  cell: Cell;
  cx: number;
  cy: number;
  flow?: ArmDirs;
  spark?: ArmDirs;
  lit: boolean;
  band: Band;
  over: boolean;
  ready: boolean;
  hint: boolean;
  pressed: boolean;
}) {
  const tileBg = (extra = '') => (
    <rect x={cx - 44} y={cy - 44} width={88} height={88} rx={16} className={`cb-tile${extra}${hint ? ' hint' : ''}`} />
  );
  const turn = (turns: number) => ({ transform: `rotate(${turns * 90}deg)`, transformOrigin: `${cx}px ${cy}px` });
  const overlay = (inner = 0) => (
    <>
      {flow && <Flow arms={flow} cx={cx} cy={cy} inner={inner} />}
      {spark && <Flow arms={spark} cx={cx} cy={cy} inner={inner} spark />}
    </>
  );

  switch (cell.kind) {
    case 'wire':
      return (
        <g className={cell.turnable ? `cb-turnable${pressed ? ' pressed' : ''}` : undefined}>
          {cell.turnable && tileBg()}
          <g className="cb-turn" style={turn(cell.turns)}>
            <Wire mask={PART_MASK[cell.part]} cx={cx} cy={cy} />
          </g>
          {overlay()}
        </g>
      );
    case 'battery':
      return (
        <g>
          <Battery cx={cx} cy={cy} plus={cell.plus} />
          {overlay(34)}
        </g>
      );
    case 'bulb':
      return (
        <g className={band === 3 ? 'cb-tappable' : undefined}>
          <Bulb cx={cx} cy={cy} lit={lit} out={cell.out} vertical={cell.mask !== (E | W)} />
          {overlay(29)}
        </g>
      );
    case 'switch':
      return (
        <g className={`cb-tappable${hint ? ' hint' : ''}`}>
          <Switch cx={cx} cy={cy} closed={cell.closed} vertical={cell.mask !== (E | W)} />
          {cell.closed && overlay(26)}
        </g>
      );
    case 'slot':
      return (
        <g>
          <Wire mask={cell.mask} cx={cx} cy={cy} inner={38} />
          <rect x={cx - 42} y={cy - 9} width={8} height={18} rx={2} fill="var(--ink)" />
          <rect x={cx + 34} y={cy - 9} width={8} height={18} rx={2} fill="var(--ink)" />
          {cell.material ? (
            <svg x={cx - 38} y={cy - 27} width={76} height={54} viewBox="0 0 100 70" overflow="visible">
              <MaterialArt id={cell.material} />
            </svg>
          ) : (
            <rect x={cx - 32} y={cy - 26} width={64} height={52} rx={12} className={`cb-gap${over ? ' over' : ''}${ready ? ' ready' : ''}`} />
          )}
          {cell.material && MATERIALS[cell.material].conductor && overlay(40)}
        </g>
      );
    case 'gap': {
      if (!cell.tile) {
        return (
          <g>
            <rect x={cx - 42} y={cy - 42} width={84} height={84} rx={16} className={`cb-gap${over ? ' over' : ''}${ready ? ' ready' : ''}`} />
            <path d={`M${cx - 9} ${cy}H${cx + 9}M${cx} ${cy - 9}V${cy + 9}`} className="cb-gap-plus" />
          </g>
        );
      }
      const t = cell.tile;
      const bulb = t.part === 'bulb';
      return (
        <g className={`cb-turnable${pressed ? ' pressed' : ''}${over ? ' over' : ''}`}>
          {tileBg(' placed')}
          <g className="cb-turn" style={turn(t.turns)}>
            {bulb ? <Bulb cx={cx} cy={cy} lit={lit} out={t.out} vertical={false} /> : <Wire mask={PART_MASK[t.part]} cx={cx} cy={cy} />}
          </g>
          {overlay(bulb ? 29 : 0)}
          {over && <rect x={cx - 42} y={cy - 42} width={84} height={84} rx={16} className="cb-gap over" />}
        </g>
      );
    }
  }
}

function ItemArt({ item }: { item: Item }) {
  if (item.kind === 'material') {
    return (
      <svg viewBox="0 0 100 70" className="cb-item-art" aria-hidden>
        <MaterialArt id={item.id} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="cb-item-art" aria-hidden>
      {item.tile.part === 'bulb' ? (
        <Bulb cx={50} cy={50} lit={false} out={false} vertical={false} />
      ) : (
        <Wire mask={PART_MASK[item.tile.part]} cx={50} cy={50} />
      )}
    </svg>
  );
}

/** Everyday things, drawn across a 100 × 70 box so they bridge the gap. */
function MaterialArt({ id }: { id: MaterialId }) {
  const ink = { stroke: 'var(--ink)', strokeWidth: 3, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'wire':
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M6 35C22 6 32 64 50 35S78 6 94 35" stroke="var(--ink)" strokeWidth={11} />
          <path d="M6 35C22 6 32 64 50 35S78 6 94 35" stroke="#e39a4f" strokeWidth={6} />
        </g>
      );
    case 'spoon':
      return (
        <g {...ink} fill="#cfd8e4">
          <rect x={4} y={30} width={58} height={10} rx={5} />
          <ellipse cx={78} cy={35} rx={18} ry={14} />
          <ellipse cx={74} cy={31} rx={6} ry={4} fill="white" stroke="none" />
        </g>
      );
    case 'paperclip':
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M20 46H84a11 11 0 0 0 0-22H16a7 7 0 0 0 0 14H74" stroke="var(--ink)" strokeWidth={8} />
          <path d="M20 46H84a11 11 0 0 0 0-22H16a7 7 0 0 0 0 14H74" stroke="#b9c4d4" strokeWidth={4} />
        </g>
      );
    case 'coin':
      return (
        <g {...ink}>
          <ellipse cx={50} cy={35} rx={40} ry={28} fill="#f2c14e" />
          <ellipse cx={50} cy={35} rx={30} ry={20} fill="none" stroke="#c9952a" />
          <path d="M44 27h12M44 35h12M44 43h12" stroke="#c9952a" strokeLinecap="round" />
        </g>
      );
    case 'foil':
      return (
        <g {...ink}>
          <path d="M4 32L16 16L30 24L46 10L60 22L76 12L96 30L90 48L72 58L56 50L40 60L22 52L8 48Z" fill="#e3e9f1" />
          <path d="M16 16L26 40L46 10M60 22L56 50M76 12L72 58" fill="none" stroke="#aab6c8" strokeWidth={2} />
        </g>
      );
    case 'key':
      return (
        <g {...ink} fill="#e8b84a">
          <circle cx={20} cy={35} r={16} />
          <circle cx={16} cy={35} r={5} fill="white" />
          <path d="M34 29H94V41H86V52H78V41H70V49H62V41H34Z" />
        </g>
      );
    case 'eraser':
      return (
        <g {...ink}>
          <rect x={6} y={16} width={88} height={38} rx={9} fill="#ff9fb6" />
          <rect x={44} y={16} width={30} height={38} fill="#5aa0ff" />
        </g>
      );
    case 'wood':
      return (
        <g {...ink}>
          <rect x={4} y={24} width={92} height={22} rx={7} fill="#c98d4f" />
          <path d="M16 31C36 28 50 37 84 31M20 40C40 37 60 43 80 39" fill="none" stroke="#a46a33" strokeWidth={2} />
        </g>
      );
    case 'straw':
      return (
        <g {...ink}>
          <rect x={4} y={28} width={92} height={14} rx={7} fill="white" />
          {[14, 30, 46, 62, 78].map((x) => (
            <path key={x} d={`M${x} 30L${x + 8} 30L${x + 4} 40L${x - 4} 40Z`} fill="var(--coral)" stroke="none" />
          ))}
          <rect x={4} y={28} width={92} height={14} rx={7} fill="none" />
        </g>
      );
    case 'crayon':
      return (
        <g {...ink}>
          <path d="M76 24L96 35L76 46Z" fill="#8f6ef0" />
          <rect x={4} y={22} width={72} height={26} rx={5} fill="#8b5cf6" />
          <rect x={16} y={22} width={10} height={26} fill="#6d3fd8" />
          <rect x={56} y={22} width={10} height={26} fill="#6d3fd8" />
        </g>
      );
    case 'rubber':
      return (
        <g fill="none">
          <ellipse cx={50} cy={35} rx={42} ry={18} stroke="var(--ink)" strokeWidth={10} />
          <ellipse cx={50} cy={35} rx={42} ry={18} stroke="#e8604c" strokeWidth={5} />
        </g>
      );
    case 'sock':
      return (
        <g {...ink}>
          <path d="M8 16H54V40H82a12 12 0 0 1 0 24H22a14 14 0 0 1 -14 -14Z" fill="#34c47c" />
          <path d="M8 24H54M8 32H54" stroke="white" strokeWidth={4} />
          <path d="M8 16H54V40H82a12 12 0 0 1 0 24H22a14 14 0 0 1 -14 -14Z" fill="none" />
        </g>
      );
  }
}

export const game: Game = {
  id: 'circuit-builder',
  subject: 'science',
  topic: 'physics',
  title: 'Circuit Builder',
  blurb: 'Join the wires and light the bulbs.',
  howTo: 'Drag parts into the gaps and tap wires to turn them. When the loop is complete, electricity flows and the bulbs light up.',
  howToByBand: [
    'Try a material in the gap. Find a metal that lets electricity flow and lights the bulb. Tap a material, then tap the gap, or drag it there.',
    'Tap each wire to turn it. Join the battery and bulb in one complete loop. When the bulb lights, press Next.',
    'Fill the gaps with parts from the tray. Tap wires to turn them and close the switch. When both bulbs light, press Next.',
    'Build a separate path for each bulb. Tap wires to turn them and bulbs to unscrew them. Keep one bulb lit when the other is out. Press Next when your circuit works.',
  ],
  color: '#e0b11a',
  icon: Zap,
  scoreLabel: 'circuits lit on your own',
  Play,
};
