/**
 * Circuit Builder: the board model, a simple electrical analysis and the puzzles.
 *
 * Sides are bits: N = 1, E = 2, S = 4, W = 8. A cell's mask lists the sides it connects to.
 * Two neighbouring cells are joined when both have the facing side open.
 */
import type { Band } from '../types';

export type Side = 0 | 1 | 2 | 3; // N, E, S, W
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const bit = (s: number) => 1 << s;
const opposite = (s: number) => ((s + 2) % 4) as Side;

/** Rotate a side mask clockwise by `turns` quarter turns. */
export function rotate(mask: number, turns = 1): number {
  let m = mask;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

export const sidesOf = (mask: number): Side[] => ([0, 1, 2, 3] as Side[]).filter((s) => mask & bit(s));

/** Things a child can place: three wire tiles and (ages 10–12) a bulb. */
export type Part = 'straight' | 'corner' | 'tee' | 'bulb';
export const PART_MASK: Record<Part, number> = { straight: E | W, corner: N | E, tee: N | E | W, bulb: E | W };

function wireShape(mask: number): Exclude<Part, 'bulb'> {
  if (sidesOf(mask).length === 3) return 'tee';
  return mask === (N | S) || mask === (E | W) ? 'straight' : 'corner';
}

/** Quarter turns that turn a part's base mask into `mask`. */
export function turnsFor(part: Part, mask: number): number {
  for (let t = 0; t < 4; t++) if (rotate(PART_MASK[part], t) === mask) return t;
  return 0;
}

// ─── Materials (ages 4–5) ─────────────────────────────────────────────────────

export type MaterialId = 'wire' | 'spoon' | 'paperclip' | 'coin' | 'foil' | 'key' | 'eraser' | 'wood' | 'straw' | 'crayon' | 'rubber' | 'sock';

export const MATERIALS: Record<MaterialId, { name: string; conductor: boolean; stuff: string }> = {
  wire: { name: 'copper wire', conductor: true, stuff: 'metal' },
  spoon: { name: 'metal spoon', conductor: true, stuff: 'metal' },
  paperclip: { name: 'paperclip', conductor: true, stuff: 'metal' },
  coin: { name: 'coin', conductor: true, stuff: 'metal' },
  foil: { name: 'kitchen foil', conductor: true, stuff: 'metal' },
  key: { name: 'key', conductor: true, stuff: 'metal' },
  eraser: { name: 'eraser', conductor: false, stuff: 'rubber' },
  wood: { name: 'wooden stick', conductor: false, stuff: 'wood' },
  straw: { name: 'plastic straw', conductor: false, stuff: 'plastic' },
  crayon: { name: 'crayon', conductor: false, stuff: 'wax' },
  rubber: { name: 'rubber band', conductor: false, stuff: 'rubber' },
  sock: { name: 'sock', conductor: false, stuff: 'cloth' },
};

export const CONDUCTORS = (Object.keys(MATERIALS) as MaterialId[]).filter((m) => MATERIALS[m].conductor);
export const INSULATORS = (Object.keys(MATERIALS) as MaterialId[]).filter((m) => !MATERIALS[m].conductor);

// ─── Board ─────────────────────────────────────────────────────────────────────

export interface Tile {
  id: number;
  part: Part;
}

/** A tray tile sitting in a gap. `out` is only used by bulbs (unscrewed). */
export interface Placed extends Tile {
  turns: number;
  out: boolean;
}

export type Cell =
  /** A wire. `turns` counts quarter turns from the base shape (it keeps growing so rotation animates smoothly). */
  | { kind: 'wire'; part: Exclude<Part, 'bulb'>; turns: number; turnable: boolean; solution?: number }
  | { kind: 'battery'; mask: number; plus: Side }
  | { kind: 'bulb'; mask: number; out: boolean }
  | { kind: 'switch'; mask: number; closed: boolean }
  /** Ages 4–5: a gap in the wire that takes one material. */
  | { kind: 'slot'; mask: number; material: MaterialId | null }
  /** An empty space for a tray tile. `need` is what belongs here; a trap gap needs nothing. */
  | { kind: 'gap'; tile: Placed | null; need: { part: Part; mask: number } | null };

export interface Board {
  w: number;
  h: number;
  cells: (Cell | null)[];
}

export type Goal = 'light' | 'parallel';

export interface Puzzle {
  board: Board;
  goal: Goal;
  /** Ages 4–5: materials to try in the slot (exactly one conductor). */
  materials: MaterialId[];
  /** Tiles to place in the gaps. */
  tray: Tile[];
  /** How many bulbs the finished circuit has (fixed + in the tray). */
  bulbs: number;
}

export function maskOf(cell: Cell | null): number {
  if (!cell) return 0;
  switch (cell.kind) {
    case 'wire':
      return rotate(PART_MASK[cell.part], cell.turns);
    case 'gap':
      return cell.tile ? rotate(PART_MASK[cell.tile.part], cell.tile.turns) : 0;
    default:
      return cell.mask;
  }
}

export const isBulb = (cell: Cell | null) => cell?.kind === 'bulb' || (cell?.kind === 'gap' && cell.tile?.part === 'bulb');
export const isOut = (cell: Cell | null) => (cell?.kind === 'bulb' ? cell.out : cell?.kind === 'gap' ? !!cell.tile?.out : false);

function withOut(cell: Cell, out: boolean): Cell {
  if (cell.kind === 'bulb') return { ...cell, out };
  if (cell.kind === 'gap' && cell.tile) return { ...cell, tile: { ...cell.tile, out } };
  return cell;
}

/** How a cell lets electricity through. */
function role(cell: Cell): 'wire' | 'conductor' | 'bulb' | 'block' | 'battery' {
  if (isBulb(cell)) return isOut(cell) ? 'block' : 'bulb';
  switch (cell.kind) {
    case 'wire':
      return 'wire';
    case 'gap':
      return cell.tile ? 'wire' : 'block';
    case 'battery':
      return 'battery';
    case 'switch':
      return cell.closed ? 'conductor' : 'block';
    case 'slot':
      return cell.material && MATERIALS[cell.material].conductor ? 'conductor' : 'block';
    default:
      return 'block';
  }
}

export function neighbour(board: Board, i: number, s: Side): number {
  const x = (i % board.w) + DX[s];
  const y = Math.floor(i / board.w) + DY[s];
  if (x < 0 || y < 0 || x >= board.w || y >= board.h) return -1;
  return y * board.w + x;
}

/** The cell joined to cell `i` through side `s`, or -1. */
export function joined(board: Board, i: number, s: Side): number {
  if (!(maskOf(board.cells[i]) & bit(s))) return -1;
  const j = neighbour(board, i, s);
  if (j < 0 || !(maskOf(board.cells[j]) & bit(opposite(s)))) return -1;
  return j;
}

// ─── Analysis ──────────────────────────────────────────────────────────────────

/** Arms carrying current: cell index → side → 1 if current leaves the cell that way, -1 if it comes in. */
export type Arms = Map<number, Map<Side, 1 | -1>>;

export interface Analysis {
  /** The battery's two ends joined by wire alone. */
  short: boolean;
  lit: Set<number>;
  flow: Arms;
  /** Arms on the short-circuit path (drawn as a warning). */
  sparks: Arms;
}

interface Step {
  cell: number;
  enter: Side;
  exit: Side;
}

/** Every simple path from the battery's + end round to its − end (capped; boards are tiny). */
function loops(board: Board, battery: number, plus: Side, minus: Side): Step[][] {
  const out: Step[][] = [];
  const seen = new Set<number>([battery]);
  const path: Step[] = [];
  const walk = (from: number, side: Side) => {
    if (out.length > 400) return;
    const j = joined(board, from, side);
    if (j < 0) return;
    const enter = opposite(side);
    if (j === battery) {
      if (enter === minus) out.push([...path]);
      return;
    }
    if (seen.has(j)) return;
    const cell = board.cells[j]!;
    const r = role(cell);
    if (r === 'block' || r === 'battery') return;
    seen.add(j);
    for (const s of sidesOf(maskOf(cell)).filter((s) => s !== enter)) {
      path.push({ cell: j, enter, exit: s });
      walk(j, s);
      path.pop();
    }
    seen.delete(j);
  };
  walk(battery, plus);
  return out;
}

/** Union-find over cell ends: wires, closed switches and metal join all their ends into one point. */
function points(board: Board) {
  const parent = new Map<number, number>();
  const id = (cell: number, side: number) => cell * 4 + side;
  const find = (a: number): number => {
    const p = parent.get(a) ?? a;
    if (p === a) return a;
    const root = find(p);
    parent.set(a, root);
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  board.cells.forEach((cell, i) => {
    if (!cell) return;
    const sides = sidesOf(maskOf(cell));
    const r = role(cell);
    if (r === 'wire' || r === 'conductor') for (let k = 1; k < sides.length; k++) union(id(i, sides[0]), id(i, sides[k]));
    for (const s of sides) {
      const j = joined(board, i, s);
      if (j >= 0) union(id(i, s), id(j, opposite(s)));
    }
  });
  return (cell: number, side: number) => find(id(cell, side));
}

export function analyze(board: Board): Analysis {
  const lit = new Set<number>();
  const flow: Arms = new Map();
  const sparks: Arms = new Map();
  const battery = board.cells.findIndex((c) => c?.kind === 'battery');
  if (battery < 0) return { short: false, lit, flow, sparks };
  const bat = board.cells[battery] as Extract<Cell, { kind: 'battery' }>;
  const minus = sidesOf(bat.mask).find((s) => s !== bat.plus)!;
  const point = points(board);
  const short = point(battery, bat.plus) === point(battery, minus);
  // A bulb with both ends on the same point is bypassed: the current takes the wire instead.
  const bypassed = (i: number) => {
    const [a, b] = sidesOf(maskOf(board.cells[i]));
    return point(i, a) === point(i, b);
  };
  const mark = (into: Arms, path: Step[]) => {
    for (const st of path) {
      const arms = into.get(st.cell) ?? new Map<Side, 1 | -1>();
      if (!arms.has(st.enter)) arms.set(st.enter, -1);
      if (!arms.has(st.exit)) arms.set(st.exit, 1);
      into.set(st.cell, arms);
    }
    into.set(battery, new Map<Side, 1 | -1>([[bat.plus, 1], [minus, -1]]));
  };

  for (const path of loops(board, battery, bat.plus, minus)) {
    const bulbs = path.filter((st) => isBulb(board.cells[st.cell]));
    if (short) {
      if (bulbs.length === 0) mark(sparks, path);
      continue;
    }
    if (bulbs.some((st) => bypassed(st.cell))) continue;
    bulbs.forEach((st) => lit.add(st.cell));
    mark(flow, path);
  }
  return { short, lit, flow, sparks };
}

export const bulbsOf = (board: Board) => board.cells.flatMap((c, i) => (isBulb(c) ? [i] : []));

export type Verdict = 'solved' | 'short' | 'dark' | 'series' | 'unscrewed' | 'missing';

/**
 * How close the board is to the goal.
 * series: every bulb glows but they share one path, so unscrewing one puts the others out.
 */
export function judge(board: Board, goal: Goal, bulbsNeeded: number): Verdict {
  const bulbs = bulbsOf(board);
  const a = analyze(board);
  if (a.short) return 'short';
  if (bulbs.some((b) => isOut(board.cells[b]))) return 'unscrewed';
  if (bulbs.some((b) => !a.lit.has(b))) return 'dark';
  if (bulbs.length < bulbsNeeded) return 'missing';
  if (goal === 'light') return 'solved';
  const independent = bulbs.every((b) => {
    const cells = board.cells.map((c, i) => (i === b && c ? withOut(c, true) : c));
    const lit = analyze({ ...board, cells }).lit;
    return bulbs.every((o) => o === b || lit.has(o));
  });
  return independent ? 'solved' : 'series';
}

export const solved = (board: Board, puzzle: Puzzle) => judge(board, puzzle.goal, puzzle.bulbs) === 'solved';

// ─── Puzzles ───────────────────────────────────────────────────────────────────

const SIDE_LETTERS: Record<string, number> = { N, E, S, W };
const lettersMask = (s: string) => [...s].reduce((m, ch) => m | (SIDE_LETTERS[ch] ?? 0), 0);
const PART_TOKENS: Record<string, number> = { V: N | S, H: E | W };

/**
 * A tiny layout language, one token per cell:
 *   ..            nothing
 *   ES, NEW       fixed wire (letters = open sides); a trailing * scrambles its rotation
 *   BN BS BE BW   battery; the letter is the + end
 *   LV LH         bulb (vertical / horizontal)
 *   SV SH         switch, starts open
 *   MH            material slot (ages 4–5)
 *   G:EW  G:LV    gap; the wire or bulb that belongs there
 *   X:            trap gap — nothing belongs there; a wire across it makes a short circuit
 */
function parse(rows: string[]): { board: Board; scramble: number[] } {
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const cells: (Cell | null)[] = [];
  const scramble: number[] = [];
  for (const row of grid) {
    for (const t of row) {
      if (t === '..') {
        cells.push(null);
      } else if (t.startsWith('G:')) {
        const body = t.slice(2);
        const need = /^L[VH]$/.test(body)
          ? { part: 'bulb' as const, mask: PART_TOKENS[body[1]] }
          : { part: wireShape(lettersMask(body)), mask: lettersMask(body) };
        cells.push({ kind: 'gap', tile: null, need });
      } else if (t === 'X:') {
        cells.push({ kind: 'gap', tile: null, need: null });
      } else if (/^B[NESW]$/.test(t)) {
        const plus = 'NESW'.indexOf(t[1]) as Side;
        cells.push({ kind: 'battery', plus, mask: plus % 2 === 0 ? N | S : E | W });
      } else if (/^[LSM][VH]$/.test(t)) {
        const mask = PART_TOKENS[t[1]];
        if (t[0] === 'L') cells.push({ kind: 'bulb', mask, out: false });
        else if (t[0] === 'S') cells.push({ kind: 'switch', mask, closed: false });
        else cells.push({ kind: 'slot', mask, material: null });
      } else {
        const mask = lettersMask(t);
        const part = wireShape(mask);
        if (t.endsWith('*')) scramble.push(cells.length);
        cells.push({ kind: 'wire', part, turns: turnsFor(part, mask), turnable: t.endsWith('*'), solution: mask });
      }
    }
  }
  return { board: { w, h, cells }, scramble };
}

/** Mirror a layout left ↔ right. */
export function mirror(rows: string[]): string[] {
  const swapEW = (s: string) => s.replace(/[EW]/g, (c) => (c === 'E' ? 'W' : 'E'));
  const flip = (t: string) => {
    if (t === '..' || t === 'X:' || /^[LSM][VH]$/.test(t) || t.startsWith('G:L')) return t;
    if (/^B[NESW]$/.test(t)) return 'B' + swapEW(t[1]);
    const [head, body] = t.startsWith('G:') ? ['G:', t.slice(2)] : ['', t];
    const star = body.endsWith('*') ? '*' : '';
    return head + swapEW(body.replace('*', '')) + star;
  };
  return rows.map((r) => r.trim().split(/\s+/).map(flip).reverse().join(' '));
}

const BAND0 = [
  ['ES EW EW WS', 'BN .. .. LV', 'NE EW EW NW'],
  ['ES EW EW EW WS', 'BN .. .. .. LV', 'NE EW EW EW NW'],
];

const BAND1 = [
  ['ES EW EW WS', 'BN .. .. LV', 'NE EW EW NW'],
  ['ES EW EW EW WS', 'BN .. .. .. LV', 'NE EW EW EW NW'],
  ['ES EW LH EW WS', 'NS .. .. .. NS', 'BN .. .. .. NS', 'NE EW EW EW NW'],
  ['ES EW WS ..', 'BN .. NE WS', 'NE LH EW NW'],
  ['ES LH EW WS', 'NS .. .. NS', 'BN .. .. NS', 'NE EW EW NW'],
];

/** Ages 8–9: close the switch, fill the gaps, light both bulbs. Tee stubs are dead ends. */
const BAND2 = [
  ['ES SH EW LH WS', 'BN .. .. .. LV', 'NE G:EW NEW* G:EW NW'],
  ['ES EW SH EW WS', 'BN .. .. .. LV', 'G:NS .. .. .. NS', 'NE LH NEW EW G:NW'],
  ['ES LH EW SH EW WS', 'BN .. .. .. .. LV', 'NE EW* G:EW NEW G:EW NW'],
];

/**
 * Ages 10–12: a bulb on a rung gets its own path (parallel); bulbs on the rail share one (series).
 * A plain wire on a rung joins the two rails: a short circuit.
 */
const BAND3: { rows: string[]; spare: Part[] }[] = [
  { rows: ['ES G:EW ESW G:EW WS', 'BN .. G:LV .. G:LV', 'NE EW NEW EW NW'], spare: [] },
  { rows: ['ES EW G:EW EW ESW WS', 'BN .. .. .. G:LV LV', 'NE EW EW EW NEW NW'], spare: ['straight'] },
  { rows: ['ES ESW G:ESW EW WS', 'BN X: LV .. LV', 'NE NEW G:NEW EW NW'], spare: ['straight'] },
];

type Rand = () => number;
const pickOne = <T,>(list: readonly T[], r: Rand) => list[Math.floor(r() * list.length)];
function shuffled<T>(list: readonly T[], r: Rand): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Turn each listed wire to a different, wrong orientation. */
function scrambleWires(board: Board, which: number[], r: Rand) {
  for (const i of which) {
    const cell = board.cells[i];
    if (cell?.kind !== 'wire') continue;
    const wrong = [1, 2, 3].filter((t) => rotate(PART_MASK[cell.part], cell.turns + t) !== cell.solution);
    cell.turns += pickOne(wrong, r);
  }
}

export const ROUNDS = 8;

export function makePuzzle(band: Band, round: number, r: Rand = Math.random): Puzzle {
  const flip = r() < 0.5;
  const layout = (rows: string[]) => (flip ? mirror(rows) : rows);

  if (band === 0) {
    const { board } = parse(layout(BAND0[round % BAND0.length]));
    // The material goes in place of a straight wire on the top or bottom rail.
    const rails = board.cells.flatMap((c, i) =>
      c?.kind === 'wire' && c.part === 'straight' && (i < board.w || i >= board.w * (board.h - 1)) ? [i] : [],
    );
    board.cells[pickOne(rails, r)] = { kind: 'slot', mask: E | W, material: null };
    const materials = shuffled([pickOne(CONDUCTORS, r), ...shuffled(INSULATORS, r).slice(0, 2)], r);
    return { board, goal: 'light', materials, tray: [], bulbs: 1 };
  }

  if (band === 1) {
    const { board } = parse(layout(BAND1[round % BAND1.length]));
    const wires = board.cells.flatMap((c, i) => (c?.kind === 'wire' ? [i] : []));
    // Every wire turns, so the turned ones don't give themselves away.
    for (const i of wires) (board.cells[i] as Extract<Cell, { kind: 'wire' }>).turnable = true;
    scrambleWires(board, shuffled(wires, r).slice(0, Math.min(wires.length, 2 + Math.floor(round / 3))), r);
    return { board, goal: 'light', materials: [], tray: [], bulbs: 1 };
  }

  const spec = band === 2 ? { rows: BAND2[round % BAND2.length], spare: ['tee'] as Part[] } : BAND3[round % BAND3.length];
  const { board, scramble } = parse(layout(spec.rows));
  scrambleWires(board, scramble, r);
  const needs = board.cells.flatMap((c) => (c?.kind === 'gap' && c.need ? [c.need.part] : []));
  const tray = shuffled([...needs, ...spec.spare], r).map((part, id) => ({ id, part }));
  const bulbs = bulbsOf(board).length + needs.filter((p) => p === 'bulb').length;
  return { board, goal: band === 3 ? 'parallel' : 'light', materials: [], tray, bulbs };
}

export function makePuzzles(band: Band, r: Rand = Math.random): Puzzle[] {
  return Array.from({ length: ROUNDS }, (_, i) => makePuzzle(band, i, r));
}

// ─── Moves ─────────────────────────────────────────────────────────────────────

const setCell = (board: Board, i: number, cell: Cell | null): Board => {
  const cells = [...board.cells];
  cells[i] = cell;
  return { ...board, cells };
};

/** Put a tray tile into a gap, turned to join as many neighbours as it can. */
export function placeTile(board: Board, i: number, tile: Tile): Board {
  const gap = board.cells[i];
  if (gap?.kind !== 'gap') return board;
  let best = 0;
  let bestScore = -1;
  for (let t = 0; t < 4; t++) {
    let score = 0;
    for (const s of sidesOf(rotate(PART_MASK[tile.part], t))) {
      const j = neighbour(board, i, s);
      if (j >= 0 && maskOf(board.cells[j]) & bit(opposite(s))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return setCell(board, i, { ...gap, tile: { id: tile.id, part: tile.part, turns: best, out: false } });
}

export function removeTile(board: Board, i: number): Board {
  const gap = board.cells[i];
  return gap?.kind === 'gap' ? setCell(board, i, { ...gap, tile: null }) : board;
}

/** Put a material in the slot (ages 4–5). */
export function putMaterial(board: Board, i: number, material: MaterialId | null): Board {
  const slot = board.cells[i];
  return slot?.kind === 'slot' ? setCell(board, i, { ...slot, material }) : board;
}

/** The same board with every bulb screwed in and (optionally) every switch closed. */
export function screwIn(board: Board, closeSwitches = false): Board {
  const cells = board.cells.map((c) => {
    if (!c) return c;
    if (closeSwitches && c.kind === 'switch') return { ...c, closed: true };
    return isBulb(c) && isOut(c) ? withOut(c, false) : c;
  });
  return { ...board, cells };
}

/** Tiles still waiting in the tray. */
export function trayLeft(puzzle: Puzzle, board: Board): Tile[] {
  const used = new Set(board.cells.flatMap((c) => (c?.kind === 'gap' && c.tile ? [c.tile.id] : [])));
  return puzzle.tray.filter((t) => !used.has(t.id));
}

/** Tap a cell: turn a wire or a placed tile, flip a switch, or (ages 10–12) screw a bulb in or out. */
export function tapCell(board: Board, i: number, band: Band): Board {
  const cell = board.cells[i];
  if (!cell) return board;
  if (band === 3 && isBulb(cell)) return setCell(board, i, withOut(cell, !isOut(cell)));
  if (cell.kind === 'wire' && cell.turnable) return setCell(board, i, { ...cell, turns: cell.turns + 1 });
  if (cell.kind === 'switch') return setCell(board, i, { ...cell, closed: !cell.closed });
  if (cell.kind === 'gap' && cell.tile) return setCell(board, i, { ...cell, tile: { ...cell.tile, turns: cell.tile.turns + 1 } });
  return board;
}

/** Is this cell already the way the answer has it? */
function settled(cell: Cell | null): boolean {
  if (!cell) return true;
  switch (cell.kind) {
    case 'wire':
      return cell.solution === undefined || maskOf(cell) === cell.solution;
    case 'switch':
      return cell.closed;
    case 'bulb':
      return !cell.out;
    case 'slot':
      return !!cell.material && MATERIALS[cell.material].conductor;
    case 'gap':
      if (!cell.need) return !cell.tile;
      return !!cell.tile && cell.tile.part === cell.need.part && maskOf(cell) === cell.need.mask && !cell.tile.out;
    default:
      return true;
  }
}

/**
 * One step toward the answer: turn a wire, close a switch, or put the right tile in a gap
 * (fetched from the tray, or moved from a gap where it doesn't belong). Returns the board unchanged when done.
 */
export function hintStep(puzzle: Puzzle, board: Board): Board {
  const cells = board.cells;
  // Easy fixes first: things already in place that only need a turn or a tap.
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (!c || settled(c)) continue;
    if (c.kind === 'wire') return setCell(board, i, { ...c, turns: c.turns + ((((turnsFor(c.part, c.solution!) - c.turns) % 4) + 4) % 4) });
    if (c.kind === 'switch') return setCell(board, i, { ...c, closed: true });
    if (c.kind === 'bulb') return setCell(board, i, { ...c, out: false });
    if (c.kind === 'slot') return setCell(board, i, { ...c, material: puzzle.materials.find((m) => MATERIALS[m].conductor) ?? null });
    if (c.kind === 'gap' && c.need && c.tile?.part === c.need.part) {
      const turns = c.tile.turns + ((((turnsFor(c.need.part, c.need.mask) - c.tile.turns) % 4) + 4) % 4);
      return setCell(board, i, { ...c, tile: { ...c.tile, turns, out: false } });
    }
  }
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c?.kind !== 'gap' || settled(c)) continue;
    if (!c.need) return removeTile(board, i);
    const need = c.need;
    let next = board;
    let tile: Tile | undefined = trayLeft(puzzle, board).find((t) => t.part === need.part);
    if (!tile) {
      const from = cells.findIndex((g) => g?.kind === 'gap' && g.tile?.part === need.part && !settled(g));
      if (from < 0) continue;
      tile = (cells[from] as Extract<Cell, { kind: 'gap' }>).tile!;
      next = removeTile(next, from);
    }
    return setCell(next, i, { ...c, tile: { id: tile.id, part: tile.part, turns: turnsFor(need.part, need.mask), out: false } });
  }
  return board;
}

/** The finished board (used by the tests). */
export function solve(puzzle: Puzzle): Board {
  let board = puzzle.board;
  for (let k = 0; k < 40; k++) {
    const next = hintStep(puzzle, board);
    if (next === board) break;
    board = next;
  }
  return board;
}
