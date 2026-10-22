import { useState } from 'react';
import { ArrowUp, Compass, Grid3x3, MoveRight } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, Emoji, mcq, Note } from './visuals/kit';

/*
 * A park map on a grid. Columns are lettered along the bottom, rows are numbered up the side
 * (1 at the bottom), so a grid reference is "along, then up": letter first, then number.
 * North is at the top of the map.
 */

const COLS = 8;
const ROWS = 6;
const CELL = 70;
const GX = 66;
const GY = 60;
const LETTERS = 'ABCDEFGH';

interface Cell {
  c: number; // 0-based column
  r: number; // 1-based row, counted from the bottom
}

const ref = ({ c, r }: Cell) => `${LETTERS[c]}${r}`;
const same = (a: Cell, b: Cell) => a.c === b.c && a.r === b.r;
const cx = (c: number) => GX + c * CELL + CELL / 2;
const cy = (r: number) => GY + (ROWS - r) * CELL + CELL / 2;

interface Feature extends Cell {
  emoji: string;
  name: string;
}

const FEATURES: Feature[] = [
  { c: 1, r: 2, emoji: '🏠', name: 'house' },
  { c: 6, r: 2, emoji: '🏫', name: 'school' },
  { c: 3, r: 3, emoji: '⛲', name: 'fountain' },
  { c: 5, r: 4, emoji: '🦆', name: 'duck pond' },
  { c: 2, r: 5, emoji: '🍦', name: 'ice-cream stand' },
  { c: 7, r: 6, emoji: '⛺', name: 'campsite' },
  { c: 0, r: 5, emoji: '🌳', name: 'big oak tree' },
  { c: 4, r: 1, emoji: '🎡', name: 'big wheel' },
  { c: 7, r: 1, emoji: '🌻', name: 'flower garden' },
];

/** The pond's water fills E4, F4, E5 and F5. */
const POND: Cell[] = [
  { c: 4, r: 4 },
  { c: 5, r: 4 },
  { c: 4, r: 5 },
  { c: 5, r: 5 },
];

const ITEMS = [
  { emoji: '🚲', name: 'bike rack' },
  { emoji: '🧺', name: 'picnic basket' },
  { emoji: '🎈', name: 'balloon stall' },
  { emoji: '🪁', name: 'kite' },
];

const featureAt = (cell: Cell) => FEATURES.find((f) => same(f, cell));
const whatsThere = (cell: Cell) => {
  const f = featureAt(cell);
  if (f) return `the ${f.name} ${f.emoji}`;
  if (POND.some((p) => same(p, cell))) return 'the pond water 💧';
  return 'open grass';
};

const allCells = (): Cell[] => Array.from({ length: COLS * ROWS }, (_, i) => ({ c: i % COLS, r: Math.floor(i / COLS) + 1 }));
const emptyCells = () => allCells().filter((cell) => !featureAt(cell) && !POND.some((p) => same(p, cell)));

function cellAt(p: Pt): Cell | null {
  const c = Math.floor((p.x - GX) / CELL);
  const row = Math.floor((p.y - GY) / CELL);
  if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return null;
  return { c, r: ROWS - row };
}

type Mode = 'find' | 'place' | 'walk';
type Dir = 'north' | 'south' | 'east' | 'west';
const STEP: Record<Dir, [number, number]> = { north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] };

/** "3 squares east, 2 squares north" from a list of single steps (only the last `max` parts). */
function routeText(moves: Dir[], max = 4) {
  const parts: string[] = [];
  let i = 0;
  while (i < moves.length) {
    let j = i;
    while (j < moves.length && moves[j] === moves[i]) j++;
    const n = j - i;
    parts.push(`${n} square${n === 1 ? '' : 's'} ${moves[i]}`);
    i = j;
  }
  return (parts.length > max ? '… ' : '') + parts.slice(-max).join(', ');
}

interface Walk {
  from: Feature;
  to: Feature;
  at: Cell;
  moves: Dir[];
}

function newWalk(): Walk {
  const from = pick(FEATURES.filter((f) => !POND.some((p) => same(p, f))));
  const to = pick(FEATURES.filter((f) => Math.abs(f.c - from.c) + Math.abs(f.r - from.r) >= 4 && Math.abs(f.c - from.c) > 0 && f.r !== from.r));
  return { from, to, at: { c: from.c, r: from.r }, moves: [] };
}

function GridScene() {
  const [mode, setMode] = useState<Mode>('find');
  const [target, setTarget] = useState<Cell>({ c: 5, r: 4 });
  const [tapped, setTapped] = useState<Cell | null>(null);
  const [placing, setPlacing] = useState(() => ({ item: ITEMS[0], cell: { c: 2, r: 2 } as Cell }));
  const [placed, setPlaced] = useState<{ emoji: string; cell: Cell }[]>([]);
  const [held, setHeld] = useState(false);
  const [walk, setWalk] = useState<Walk>(newWalk);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'good' | 'nudge' } | null>(null);

  const newTask = (m: Mode = mode) => {
    setFeedback(null);
    setTapped(null);
    setHeld(false);
    if (m === 'find') setTarget((t) => pick(allCells().filter((cell) => !same(cell, t))));
    if (m === 'place') {
      const free = emptyCells().filter((cell) => !placed.some((p) => same(p.cell, cell)));
      setPlacing((p) => ({ item: pick(ITEMS.filter((i) => i !== p.item)), cell: pick(free.length ? free : emptyCells()) }));
    }
    if (m === 'walk') setWalk(newWalk());
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    newTask(m);
  };

  const tapCell = (cell: Cell) => {
    setTapped(cell);
    if (mode === 'find') {
      if (same(cell, target)) {
        play('correct');
        setFeedback({ text: `Yes! ${ref(cell)} is ${whatsThere(cell)}. Along to ${LETTERS[cell.c]}, then up to ${cell.r}.`, tone: 'good' });
      } else {
        play('wrong');
        setFeedback({
          text: `That is ${ref(cell)}, not yet ${ref(target)}. Find ${LETTERS[target.c]} along the bottom first, then go up to row ${target.r}.`,
          tone: 'nudge',
        });
      }
    } else if (mode === 'place' && held) drop(cell);
    else play('tap');
  };

  const drop = (cell: Cell | null) => {
    setHeld(false);
    if (!cell) return;
    setTapped(cell);
    if (same(cell, placing.cell)) {
      play('correct');
      setPlaced((p) => [...p.filter((q) => !same(q.cell, cell)), { emoji: placing.item.emoji, cell }]);
      setFeedback({ text: `Well placed! The ${placing.item.name} is in ${ref(cell)}: along to ${LETTERS[cell.c]}, up to ${cell.r}.`, tone: 'good' });
    } else {
      play('wrong');
      const hint =
        cell.c === placing.cell.c
          ? `The letter is right. Now count up to row ${placing.cell.r}.`
          : cell.r === placing.cell.r
            ? `The number is right. Now find letter ${LETTERS[placing.cell.c]} along the bottom.`
            : `Go along to ${LETTERS[placing.cell.c]} first, then up to ${placing.cell.r}.`;
      setFeedback({ text: `That spot is ${ref(cell)}, not yet ${ref(placing.cell)}. ${hint}`, tone: 'nudge' });
    }
  };

  const move = (d: Dir) => {
    const [dc, dr] = STEP[d];
    const at = { c: walk.at.c + dc, r: walk.at.r + dr };
    if (at.c < 0 || at.c >= COLS || at.r < 1 || at.r > ROWS) return;
    const moves = [...walk.moves, d];
    setWalk({ ...walk, at, moves });
    setTapped(null);
    if (same(at, walk.to)) {
      play('correct');
      setFeedback({ text: `You reached the ${walk.to.name} in ${ref(at)}! Your route: ${routeText(moves)}.`, tone: 'good' });
    } else {
      play('tap');
      setFeedback({ text: `Now in ${ref(at)}. Route so far: ${routeText(moves)}.`, tone: 'nudge' });
    }
  };

  const canMove = (d: Dir) => {
    const [dc, dr] = STEP[d];
    const c = walk.at.c + dc;
    const r = walk.at.r + dr;
    return c >= 0 && c < COLS && r >= 1 && r <= ROWS && !same(walk.at, walk.to);
  };

  const task =
    mode === 'find'
      ? `Tap square ${ref(target)}.`
      : mode === 'place'
        ? `Put the ${placing.item.emoji} ${placing.item.name} in square ${ref(placing.cell)}. Drag it onto the map.`
        : `Walk from the ${walk.from.emoji} ${walk.from.name} (${ref(walk.from)}) to the ${walk.to.emoji} ${walk.to.name} (${ref(walk.to)}). Use the compass buttons.`;

  // Walk trail through the centres of the squares visited.
  const trail: Cell[] = [{ c: walk.from.c, r: walk.from.r }];
  for (const d of walk.moves) {
    const last = trail[trail.length - 1];
    trail.push({ c: last.c + STEP[d][0], r: last.r + STEP[d][1] });
  }

  const showBands = tapped && mode !== 'walk';

  return (
    <SceneSvg label="A park map on a grid with lettered columns and numbered rows">
      {/* Map */}
      <rect x={GX} y={GY} width={COLS * CELL} height={ROWS * CELL} fill="#d9efc9" stroke={C.ink} strokeWidth={2.5} />
      <rect
        x={GX + 4 * CELL + 10}
        y={GY + (ROWS - 5) * CELL + 10}
        width={2 * CELL - 20}
        height={2 * CELL - 20}
        rx={40}
        fill={shade(C.blue, 0.45)}
        stroke={shade(C.blue, -0.2)}
        strokeWidth={2}
      />
      {showBands && (
        <g pointerEvents="none">
          <rect x={GX + tapped.c * CELL} y={GY} width={CELL} height={ROWS * CELL} fill={C.yellow} opacity={0.28} />
          <rect x={GX} y={GY + (ROWS - tapped.r) * CELL} width={COLS * CELL} height={CELL} fill={C.yellow} opacity={0.28} />
        </g>
      )}
      {FEATURES.map((f) => (
        <Emoji key={f.name} x={cx(f.c)} y={cy(f.r)} size={40}>
          {f.emoji}
        </Emoji>
      ))}
      {placed.map((p) => (
        <Emoji key={ref(p.cell)} x={cx(p.cell.c)} y={cy(p.cell.r)} size={38}>
          {p.emoji}
        </Emoji>
      ))}
      {/* Grid lines and tap targets */}
      {allCells().map((cell) => (
        <rect
          key={ref(cell)}
          x={GX + cell.c * CELL}
          y={GY + (ROWS - cell.r) * CELL}
          width={CELL}
          height={CELL}
          fill="transparent"
          stroke={C.ink}
          strokeOpacity={0.35}
          strokeWidth={1.2}
          onClick={() => tapCell(cell)}
          style={{ cursor: 'pointer' }}
          data-nopan
          role="button"
          aria-label={`Square ${ref(cell)}`}
        />
      ))}
      {tapped && mode !== 'walk' && (
        <g pointerEvents="none">
          <rect x={GX + tapped.c * CELL + 3} y={GY + (ROWS - tapped.r) * CELL + 3} width={CELL - 6} height={CELL - 6} rx={8} fill="none" stroke={C.ink} strokeWidth={3} />
          <rect x={cx(tapped.c) - 24} y={GY + (ROWS - tapped.r) * CELL - 26} width={48} height={26} rx={8} fill={C.ink} />
          <text x={cx(tapped.c)} y={GY + (ROWS - tapped.r) * CELL - 13} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.white}>
            {ref(tapped)}
          </text>
        </g>
      )}

      {/* Walk trail and walker */}
      {mode === 'walk' && (
        <g pointerEvents="none">
          <rect x={GX + walk.to.c * CELL + 3} y={GY + (ROWS - walk.to.r) * CELL + 3} width={CELL - 6} height={CELL - 6} rx={8} fill="none" stroke={C.red} strokeWidth={3} strokeDasharray="8 6" />
          {trail.length > 1 && (
            <polyline
              points={trail.map((t) => `${cx(t.c)},${cy(t.r)}`).join(' ')}
              fill="none"
              stroke={C.red}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 10"
            />
          )}
          <circle cx={cx(walk.at.c)} cy={cy(walk.at.r)} r={26} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
          <Emoji x={cx(walk.at.c)} y={cy(walk.at.r)} size={34}>
            🚶
          </Emoji>
        </g>
      )}

      {/* Axis labels: letters along the bottom, numbers up the side */}
      {Array.from({ length: COLS }, (_, c) => (
        <text key={c} x={cx(c)} y={GY + ROWS * CELL + 28} textAnchor="middle" fontSize={24} fontWeight={700} fill={tapped?.c === c && mode !== 'walk' ? C.red : C.ink}>
          {LETTERS[c]}
        </text>
      ))}
      {Array.from({ length: ROWS }, (_, i) => (
        <text key={i} x={GX - 22} y={cy(i + 1)} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill={tapped?.r === i + 1 && mode !== 'walk' ? C.red : C.ink}>
          {i + 1}
        </text>
      ))}

      {/* How to read a grid reference */}
      <Note x={40} y={540} w={430} size={17} text={'Grid reference: letter first (go along), then number (go up). The fountain is in D3.'} />

      {/* Compass rose */}
      <g transform="translate(560 600)" aria-label="Compass: north is up">
        <circle r={50} fill={C.white} stroke={C.ink} strokeWidth={2} />
        <polygon points="0,-40 9,-9 0,0 -9,-9" fill={C.red} stroke={C.ink} strokeWidth={1.5} />
        <polygon points="0,40 9,9 0,0 -9,9" fill={C.white} stroke={C.ink} strokeWidth={1.5} />
        <polygon points="40,0 9,9 0,0 9,-9" fill={C.white} stroke={C.ink} strokeWidth={1.5} />
        <polygon points="-40,0 -9,9 0,0 -9,-9" fill={C.white} stroke={C.ink} strokeWidth={1.5} />
        <text x={0} y={-62} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>N</text>
        <text x={66} y={6} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>E</text>
        <text x={-66} y={6} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>W</text>
      </g>

      {/* Panel */}
      {(['find', 'place', 'walk'] as Mode[]).map((m, i) => (
        <SvgButton
          key={m}
          x={664 + i * 104}
          y={22}
          w={96}
          h={50}
          fontSize={18}
          label={m === 'find' ? 'Find' : m === 'place' ? 'Place' : 'Walk'}
          active={mode === m}
          color={mode === m ? C.yellow : C.card}
          onClick={() => switchMode(m)}
        />
      ))}
      <Note x={664} y={92} w={304} text={task} />

      {mode === 'place' && (
        <g>
          <rect x={744} y={258} width={144} height={110} rx={16} fill={held ? shade(C.yellow, 0.6) : C.white} stroke={C.ink} strokeWidth={2} strokeDasharray={held ? undefined : '6 5'} />
          <Draggable
            x={816}
            y={305}
            hit={44}
            label={`${placing.item.name}: drag it onto the map`}
            onDrop={(p) => drop(cellAt(p))}
            onTap={() => {
              play('tap');
              setHeld((h) => !h);
            }}
          >
            <Emoji x={816} y={305} size={56}>
              {placing.item.emoji}
            </Emoji>
          </Draggable>
          <text x={816} y={392} textAnchor="middle" fontSize={15} fill={C.muted}>
            {held ? 'Now tap a square' : 'Drag me (or tap me, then a square)'}
          </text>
        </g>
      )}

      {mode === 'walk' && (
        <g>
          <SvgButton x={784} y={246} w={64} h={54} fontSize={20} label="N" title="One square north" disabled={!canMove('north')} onClick={() => move('north')} />
          <SvgButton x={710} y={306} w={64} h={54} fontSize={20} label="W" title="One square west" disabled={!canMove('west')} onClick={() => move('west')} />
          <SvgButton x={858} y={306} w={64} h={54} fontSize={20} label="E" title="One square east" disabled={!canMove('east')} onClick={() => move('east')} />
          <SvgButton x={784} y={366} w={64} h={54} fontSize={20} label="S" title="One square south" disabled={!canMove('south')} onClick={() => move('south')} />
          <circle cx={816} cy={333} r={18} fill={C.white} stroke={C.ink} strokeWidth={2} />
          <Emoji x={816} y={333} size={20}>
            🚶
          </Emoji>
        </g>
      )}

      {feedback && <Note x={664} y={440} w={304} text={feedback.text} tone={feedback.tone} />}
      <SvgButton x={664} y={606} w={150} h={52} fontSize={18} label="New task" color={C.teal} textColor={C.white} onClick={() => newTask()} />
      {mode === 'walk' && walk.moves.length > 0 && (
        <SvgButton x={826} y={606} w={142} h={52} fontSize={18} label="Start again" onClick={() => { setWalk({ ...walk, at: { c: walk.from.c, r: walk.from.r }, moves: [] }); setFeedback(null); }} />
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={22} y={6} width={90} height={54} fill="#d9efc9" stroke={C.ink} strokeWidth={2} />
      {[1, 2].map((i) => (
        <line key={`v${i}`} x1={22 + i * 30} y1={6} x2={22 + i * 30} y2={60} stroke={C.ink} strokeOpacity={0.4} />
      ))}
      <line x1={22} y1={33} x2={112} y2={33} stroke={C.ink} strokeOpacity={0.4} />
      <rect x={52} y={6} width={30} height={27} fill={C.yellow} opacity={0.6} />
      <circle cx={67} cy={19} r={7} fill={C.red} stroke={C.ink} strokeWidth={1.5} />
      {['A', 'B', 'C'].map((l, i) => (
        <text key={l} x={37 + i * 30} y={74} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>{l}</text>
      ))}
      <text x={13} y={50} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>1</text>
      <text x={13} y={23} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>2</text>
    </svg>
  );
}

/* ---------- Practice ---------- */

interface Thing extends Cell {
  emoji: string;
  name: string;
}

const PRACTICE_THINGS = [
  { emoji: '🏠', name: 'house' },
  { emoji: '⛺', name: 'tent' },
  { emoji: '🌳', name: 'tree' },
  { emoji: '⛲', name: 'fountain' },
  { emoji: '🏫', name: 'school' },
  { emoji: '🍦', name: 'ice-cream stand' },
  { emoji: '🎡', name: 'big wheel' },
  { emoji: '🦆', name: 'duck' },
  { emoji: '🚲', name: 'bike rack' },
];

/** A small grid map picture for questions. */
function GridPic({ cols, rows, things, start, label }: { cols: number; rows: number; things: Thing[]; start?: Cell; label: string }) {
  const s = 44;
  const ox = 30;
  const oy = 6;
  return (
    <svg viewBox={`0 0 ${ox + cols * s + 8} ${oy + rows * s + 30}`} role="img" aria-label={label}>
      <rect x={ox} y={oy} width={cols * s} height={rows * s} fill="#d9efc9" stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`v${i}`} x1={ox + (i + 1) * s} y1={oy} x2={ox + (i + 1) * s} y2={oy + rows * s} stroke={C.ink} strokeOpacity={0.35} />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line key={`h${i}`} x1={ox} y1={oy + (i + 1) * s} x2={ox + cols * s} y2={oy + (i + 1) * s} stroke={C.ink} strokeOpacity={0.35} />
      ))}
      {start && <circle cx={ox + start.c * s + s / 2} cy={oy + (rows - start.r) * s + s / 2} r={17} fill={C.yellow} stroke={C.ink} strokeWidth={2} />}
      {things.map((t) => (
        <Emoji key={t.name} x={ox + t.c * s + s / 2} y={oy + (rows - t.r) * s + s / 2} size={26}>
          {t.emoji}
        </Emoji>
      ))}
      {Array.from({ length: cols }, (_, c) => (
        <text key={c} x={ox + c * s + s / 2} y={oy + rows * s + 21} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
          {LETTERS[c]}
        </text>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <text key={r} x={ox - 13} y={oy + (rows - r - 1) * s + s / 2 + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
          {r + 1}
        </text>
      ))}
    </svg>
  );
}

function randomThings(cols: number, rows: number, n: number): Thing[] {
  const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => ({ c: i % cols, r: Math.floor(i / cols) + 1 })));
  return shuffle(PRACTICE_THINGS)
    .slice(0, n)
    .map((t, i) => ({ ...t, ...cells[i] }));
}

/** Plausible wrong grid references near `cell`, all inside the grid. */
function nearRefs(cell: Cell, cols: number, rows: number, extra: Cell[] = []): string[] {
  const near: Cell[] = [...extra, { c: cell.c, r: cell.r + 1 }, { c: cell.c, r: cell.r - 1 }, { c: cell.c + 1, r: cell.r }, { c: cell.c - 1, r: cell.r }, { c: cell.r - 1, r: cell.c + 1 }];
  const ok = near.filter((n) => n.c >= 0 && n.c < cols && n.r >= 1 && n.r <= rows && !same(n, cell));
  const refs = [...new Set(ok.map(ref))];
  while (refs.length < 3) {
    const r = ref({ c: rand(0, cols - 1), r: rand(1, rows) });
    if (r !== ref(cell) && !refs.includes(r)) refs.push(r);
  }
  return refs;
}

const DIRS: Dir[] = ['north', 'south', 'east', 'west'];
const OPPOSITE: Record<Dir, Dir> = { north: 'south', south: 'north', east: 'west', west: 'east' };
const squares = (n: number) => `${n} square${n === 1 ? '' : 's'}`;

function walkStep(cell: Cell, d: Dir, n: number): Cell {
  return { c: cell.c + STEP[d][0] * n, r: cell.r + STEP[d][1] * n };
}

function makeQuestion(level: number): Question {
  const cols = level === 0 ? 5 : 6;
  const rows = level === 0 ? 4 : 5;
  const inside = (cell: Cell) => cell.c >= 0 && cell.c < cols && cell.r >= 1 && cell.r <= rows;
  const things = randomThings(cols, rows, level === 0 ? 4 : 5);
  const style = level === 0 ? rand(0, 1) : level === 1 ? rand(0, 2) : rand(2, 4);

  if (style === 0) {
    // Which square is it in?
    const t = pick(things);
    const answer = ref(t);
    return mcq({
      prompt: `Which square is the ${t.emoji} ${t.name} in?`,
      visual: <GridPic cols={cols} rows={rows} things={things} label={`A grid map with a ${t.name}`} />,
      answer,
      options: nearRefs(t, cols, rows),
      hint: `Look straight down from the ${t.name} for the letter, then across to the side for the number.`,
      explain: [
        `Straight below the ${t.name} is the letter ${LETTERS[t.c]}.`,
        `Across at the side is the number ${t.r}.`,
        `Letter first, then number: ${answer}.`,
      ],
    });
  }
  if (style === 1) {
    // What is in this square?
    const t = pick(things);
    return mcq({
      prompt: `What is in square ${ref(t)}?`,
      visual: <GridPic cols={cols} rows={rows} things={things} label="A grid map with things in some squares" />,
      answer: t.name,
      options: things.map((o) => ({ value: o.name, emoji: o.emoji })),
      hint: 'Go along the bottom to the letter first, then up to the number.',
      explain: [`Find ${LETTERS[t.c]} along the bottom.`, `Go up to row ${t.r}.`, `The ${t.name} is in ${ref(t)}.`],
    });
  }
  if (style === 2) {
    // One move with a compass direction.
    const t = pick(things);
    const moves = DIRS.flatMap((d) => [1, 2, 3].map((n) => ({ d, n }))).filter(({ d, n }) => inside(walkStep(t, d, n)));
    const { d, n } = pick(moves);
    const end = walkStep(t, d, n);
    const answer = ref(end);
    const wrongWay = walkStep(t, OPPOSITE[d], n);
    return mcq({
      prompt: `Start at the ${t.emoji} ${t.name}. Walk ${squares(n)} ${d}. Which square are you in?`,
      visual: <GridPic cols={cols} rows={rows} things={[t]} start={t} label={`A grid map with a ${t.name} in ${ref(t)}`} />,
      answer,
      options: nearRefs(end, cols, rows, [wrongWay, walkStep(t, d, n + 1), walkStep(t, d, n - 1)].filter((cell) => !same(cell, end))),
      hint: 'North is up, south is down, east is right and west is left. Count one square at a time.',
      explain: [
        `The ${t.name} is in ${ref(t)}.`,
        `${d[0].toUpperCase() + d.slice(1)} is ${d === 'north' ? 'up' : d === 'south' ? 'down' : d === 'east' ? 'right' : 'left'} on the map. Count ${squares(n)}.`,
        `You end in ${answer}.`,
      ],
    });
  }
  if (style === 3) {
    // Two moves from a grid reference, no picture help with the path.
    const across = pick<Dir>(['east', 'west']);
    const upDown = pick<Dir>(['north', 'south']);
    const a = rand(2, 4);
    const b = rand(1, 3);
    const starts = Array.from({ length: cols * rows }, (_, i) => ({ c: i % cols, r: Math.floor(i / cols) + 1 })).filter((s) =>
      inside(walkStep(walkStep(s, across, a), upDown, b)),
    );
    const start = pick(starts);
    const end = walkStep(walkStep(start, across, a), upDown, b);
    const answer = ref(end);
    const swapped = walkStep(walkStep(start, across, b), upDown, a);
    return mcq({
      prompt: `Start in ${ref(start)}. Walk ${squares(a)} ${across}, then ${squares(b)} ${upDown}. Which square are you in now?`,
      visual: <GridPic cols={cols} rows={rows} things={[]} start={start} label={`An empty grid with ${ref(start)} marked`} />,
      answer,
      options: nearRefs(end, cols, rows, [swapped, walkStep(walkStep(start, OPPOSITE[across], a), upDown, b), walkStep(start, across, a)].filter((cell) => inside(cell) && !same(cell, end))),
      hint: `Do one part at a time: first move ${across}, then move ${upDown}.`,
      explain: [
        `Start in ${ref(start)}.`,
        `${squares(a)} ${across} changes the letter to ${LETTERS[start.c + STEP[across][0] * a]}.`,
        `${squares(b)} ${upDown} changes the number to ${end.r}.`,
        `You are in ${answer}.`,
      ],
    });
  }
  // Choose the route between two things.
  let from = things[0];
  let to = things[1];
  for (const a of things) for (const b of things) if (a !== b && a.c !== b.c && a.r !== b.r && Math.abs(a.c - b.c) !== Math.abs(a.r - b.r)) [from, to] = [a, b];
  if (from.c === to.c || from.r === to.r || Math.abs(from.c - to.c) === Math.abs(from.r - to.r)) {
    from = { ...from, c: 0, r: 1 };
    to = { ...to, c: 3, r: 2 };
  }
  const dx = to.c - from.c;
  const dy = to.r - from.r;
  const ew: Dir = dx > 0 ? 'east' : 'west';
  const ns: Dir = dy > 0 ? 'north' : 'south';
  const route = (x: number, d1: Dir, y: number, d2: Dir) => `${squares(x)} ${d1}, ${squares(y)} ${d2}`;
  const answer = route(Math.abs(dx), ew, Math.abs(dy), ns);
  return mcq({
    prompt: `Which route goes from the ${from.emoji} ${from.name} to the ${to.emoji} ${to.name}?`,
    visual: <GridPic cols={cols} rows={rows} things={[from, to]} label={`A grid map with a ${from.name} in ${ref(from)} and a ${to.name} in ${ref(to)}`} />,
    answer,
    options: [
      route(Math.abs(dy), ew, Math.abs(dx), ns),
      route(Math.abs(dx), OPPOSITE[ew], Math.abs(dy), ns),
      route(Math.abs(dx), ew, Math.abs(dy), OPPOSITE[ns]),
    ],
    hint: 'Count the columns between them for east or west, and the rows for north or south.',
    explain: [
      `The ${from.name} is in ${ref(from)} and the ${to.name} is in ${ref(to)}.`,
      `${LETTERS[from.c]} to ${LETTERS[to.c]} is ${squares(Math.abs(dx))} ${ew}.`,
      `${from.r} to ${to.r} is ${squares(Math.abs(dy))} ${ns}.`,
      `So the route is ${answer}.`,
    ],
  });
}

export const gridMaps: Lesson = {
  id: 'grid-maps',
  title: 'Grid Maps',
  Thumb,
  Scene: GridScene,
  sceneHint: 'Find squares, place things and walk with the compass',
  learn: {
    heading: 'Finding places with a grid',
    intro:
      'Many maps have a grid of squares drawn on them. Each square has a name made from a letter and a number, called a grid reference. It helps everyone find the same spot.',
    points: [
      { icon: MoveRight, text: 'Go along first: the letter tells you the column.' },
      { icon: ArrowUp, text: 'Then go up: the number tells you the row.' },
      { icon: Grid3x3, text: 'Put them together, letter first: D3.' },
      { icon: Compass, text: 'North is up, south is down, east is right, west is left.' },
    ],
  },
  steps: [
    'Find the letter along the bottom of the map.',
    'Move your finger up that column to the number at the side.',
    'The square where they meet is your grid reference, like D3.',
    'To give directions, count the squares and say the compass direction: “3 squares east, 2 squares north.”',
  ],
  example: {
    question: 'Start at the house in B2. Walk 2 squares east and 1 square north. Where are you?',
    work: ['B2 is the start.', '2 squares east: B → C → D, so the letter is D.', '1 square north: 2 → 3, so the number is 3.'],
    answer: 'You are in D3, at the fountain.',
  },
  grownups: [
    'Say “along the corridor, then up the stairs” to remember letter first, then number. The same rule is used later for coordinates in maths.',
    'Some maps number their rows from the top; always check where 1 is before reading a reference.',
    'Look at a real street map or a park map together and ask your child to find places by their grid square.',
    'Give directions games at home: “Take 3 steps north, then 2 steps west.”',
  ],
  makeQuestion,
};
