/**
 * Coding engine — the pure model (no React).
 *
 * A robot lives on a grid. A *program* is a list of blocks; the interpreter runs it and returns a
 * *trace*: one step per thing the robot does, so scenes can animate it, highlight the running
 * block, and show exactly where a program went wrong.
 *
 * Directions are absolute: 0 = up, 1 = right, 2 = down, 3 = left (row 0 is the top row).
 *
 * Blocks:
 *   move(dir)            face `dir` and step once (young children: "arrow" blocks)
 *   forward              step once the way the robot is facing
 *   left / right         turn 90° on the spot
 *   repeat n { body }    run the body n times
 *   if <test> { then } else { else }   choose using the cell in front of the robot
 *   call name            run a named function from `program.functions`
 *
 * Programs are edited immutably with the list helpers below, addressing nested lists by a
 * ContainerPath (e.g. "the body of the repeat at index 2").
 */

export type Dir = 0 | 1 | 2 | 3;
export const UP: Dir = 0;
export const RIGHT: Dir = 1;
export const DOWN: Dir = 2;
export const LEFT: Dir = 3;
export const DIRS: Dir[] = [UP, RIGHT, DOWN, LEFT];
export const DIR_NAME: Record<Dir, string> = { 0: 'up', 1: 'right', 2: 'down', 3: 'left' };
export const DIR_VEC: Record<Dir, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };

export interface Cell {
  x: number;
  y: number;
}

export interface World {
  cols: number;
  rows: number;
  start: Cell & { dir: Dir };
  goal?: Cell;
  walls: Cell[];
  /** Stars to collect on the way. */
  items?: Cell[];
  /** The program only succeeds once every item is collected. */
  needItems?: boolean;
}

export type Test = 'wall-ahead' | 'path-ahead' | 'at-goal' | 'item-here';
export const TEST_NAME: Record<Test, string> = {
  'wall-ahead': 'wall ahead',
  'path-ahead': 'path ahead',
  'at-goal': 'at the flag',
  'item-here': 'on a star',
};

export type Block =
  | { kind: 'move'; id: string; dir: Dir }
  | { kind: 'forward'; id: string }
  | { kind: 'left'; id: string }
  | { kind: 'right'; id: string }
  | { kind: 'repeat'; id: string; times: number; body: Block[] }
  | { kind: 'if'; id: string; test: Test; then: Block[]; else?: Block[] }
  | { kind: 'call'; id: string; name: string };

export interface Program {
  main: Block[];
  functions?: Record<string, Block[]>;
}

let seq = 0;
/** A fresh block id. */
export const uid = () => `b${++seq}`;

export const move = (dir: Dir): Block => ({ kind: 'move', id: uid(), dir });
export const forward = (): Block => ({ kind: 'forward', id: uid() });
export const turnLeft = (): Block => ({ kind: 'left', id: uid() });
export const turnRight = (): Block => ({ kind: 'right', id: uid() });
export const repeat = (times: number, body: Block[]): Block => ({ kind: 'repeat', id: uid(), times, body });
export const ifBlock = (test: Test, then: Block[], otherwise?: Block[]): Block => ({ kind: 'if', id: uid(), test, then, else: otherwise });
export const call = (name: string): Block => ({ kind: 'call', id: uid(), name });

/** Deep copy with fresh ids (for templates used more than once). */
export function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => {
    switch (b.kind) {
      case 'repeat':
        return { ...b, id: uid(), body: cloneBlocks(b.body) };
      case 'if':
        return { ...b, id: uid(), then: cloneBlocks(b.then), else: b.else ? cloneBlocks(b.else) : undefined };
      default:
        return { ...b, id: uid() };
    }
  });
}

// ─────────────────────────── World helpers ───────────────────────────

export const sameCell = (a: Cell | undefined, b: Cell | undefined) => !!a && !!b && a.x === b.x && a.y === b.y;

export function inside(world: World, c: Cell) {
  return c.x >= 0 && c.y >= 0 && c.x < world.cols && c.y < world.rows;
}

export function isWall(world: World, c: Cell) {
  return world.walls.some((w) => sameCell(w, c));
}

export function ahead(c: Cell, dir: Dir): Cell {
  const [dx, dy] = DIR_VEC[dir];
  return { x: c.x + dx, y: c.y + dy };
}

/** True if the robot can step into `c`. */
export const open = (world: World, c: Cell) => inside(world, c) && !isWall(world, c);

// ─────────────────────────── Interpreter ───────────────────────────

export interface RobotState {
  x: number;
  y: number;
  dir: Dir;
  /** Indices into world.items that have been collected. */
  collected: number[];
}

export type StepAction = 'start' | 'move' | 'turn' | 'bump' | 'loop' | 'test' | 'call' | 'end';

export interface Step {
  state: RobotState;
  action: StepAction;
  /** The block that made this step happen (null for start/end). */
  blockId: string | null;
  /** Ids of the enclosing blocks (repeat / if / call), outermost first. */
  stack: string[];
  /** For 'bump': the cell it tried to enter. */
  bumpAt?: Cell;
  /** For 'bump': why. */
  error?: 'wall' | 'edge';
  /** For 'loop': which time round (1-based) and how many in total. */
  iteration?: number;
  of?: number;
  /** For 'test': the answer. */
  result?: boolean;
  /** For 'move': a star was picked up on this step. */
  picked?: boolean;
}

export type Outcome = 'success' | 'bumped' | 'not-there' | 'missed-items' | 'too-long';

export interface Trace {
  steps: Step[];
  outcome: Outcome;
  final: RobotState;
  /** Index of the step where it went wrong (the bump), if it did. */
  failedAt?: number;
  /** The block that caused the problem (bump), if any. */
  failedBlockId?: string;
}

export interface RunOptions {
  /** Stop as soon as the robot reaches the goal (otherwise it must *end* on the goal). */
  stopAtGoal?: boolean;
  maxSteps?: number;
}

class Halt {
  constructor(public reason: 'bump' | 'goal' | 'too-long') {}
}

export function runProgram(world: World, program: Program, opts: RunOptions = {}): Trace {
  const maxSteps = opts.maxSteps ?? 400;
  let state: RobotState = { x: world.start.x, y: world.start.y, dir: world.start.dir, collected: [] };
  const steps: Step[] = [{ state, action: 'start', blockId: null, stack: [] }];
  let failedAt: number | undefined;
  let failedBlockId: string | undefined;

  const push = (s: Omit<Step, 'state'> & { state?: RobotState }) => {
    steps.push({ state, ...s });
    if (steps.length > maxSteps) throw new Halt('too-long');
  };

  const stepInto = (dir: Dir, block: Block, stack: string[]) => {
    const target = ahead(state, dir);
    state = { ...state, dir };
    if (!open(world, target)) {
      failedAt = steps.length;
      failedBlockId = block.id;
      push({ action: 'bump', blockId: block.id, stack, bumpAt: target, error: inside(world, target) ? 'wall' : 'edge' });
      throw new Halt('bump');
    }
    const itemIndex = (world.items ?? []).findIndex((c, i) => sameCell(c, target) && !state.collected.includes(i));
    state = { ...state, x: target.x, y: target.y, collected: itemIndex >= 0 ? [...state.collected, itemIndex] : state.collected };
    push({ action: 'move', blockId: block.id, stack, picked: itemIndex >= 0 });
    if (opts.stopAtGoal && sameCell(state, world.goal) && allItems()) throw new Halt('goal');
  };

  const allItems = () => !world.needItems || state.collected.length === (world.items?.length ?? 0);

  const test = (t: Test): boolean => {
    const front = ahead(state, state.dir);
    switch (t) {
      case 'wall-ahead':
        return !open(world, front);
      case 'path-ahead':
        return open(world, front);
      case 'at-goal':
        return sameCell(state, world.goal);
      case 'item-here':
        return (world.items ?? []).some((c, i) => sameCell(c, state) && state.collected.includes(i));
    }
  };

  const exec = (blocks: Block[], stack: string[], depth: number) => {
    for (const b of blocks) {
      switch (b.kind) {
        case 'move':
          stepInto(b.dir, b, stack);
          break;
        case 'forward':
          stepInto(state.dir, b, stack);
          break;
        case 'left':
        case 'right':
          state = { ...state, dir: (((state.dir + (b.kind === 'left' ? 3 : 1)) % 4) as Dir) };
          push({ action: 'turn', blockId: b.id, stack });
          break;
        case 'repeat':
          for (let i = 1; i <= b.times; i++) {
            push({ action: 'loop', blockId: b.id, stack, iteration: i, of: b.times });
            exec(b.body, [...stack, b.id], depth);
          }
          break;
        case 'if': {
          const result = test(b.test);
          push({ action: 'test', blockId: b.id, stack, result });
          exec(result ? b.then : (b.else ?? []), [...stack, b.id], depth);
          break;
        }
        case 'call': {
          const body = program.functions?.[b.name] ?? [];
          if (depth > 8) throw new Halt('too-long');
          push({ action: 'call', blockId: b.id, stack });
          exec(body, [...stack, b.id], depth + 1);
          break;
        }
      }
    }
  };

  let outcome: Outcome;
  try {
    exec(program.main, [], 0);
    outcome = sameCell(state, world.goal) ? (allItems() ? 'success' : 'missed-items') : world.goal ? 'not-there' : 'success';
  } catch (e) {
    if (!(e instanceof Halt)) throw e;
    outcome = e.reason === 'bump' ? 'bumped' : e.reason === 'goal' ? 'success' : 'too-long';
  }
  if (outcome !== 'bumped' && outcome !== 'too-long') steps.push({ state, action: 'end', blockId: null, stack: [] });
  return { steps, outcome, final: state, failedAt, failedBlockId };
}

// ─────────────────────────── Program editing ───────────────────────────

/** Where a list of blocks lives: [] is the main list; each part steps into a block's inner list. */
export type ContainerPath = { index: number; branch: 'body' | 'then' | 'else' }[];

function innerList(b: Block, branch: 'body' | 'then' | 'else'): Block[] {
  if (b.kind === 'repeat') return b.body;
  if (b.kind === 'if') return branch === 'else' ? (b.else ?? []) : b.then;
  return [];
}

function withInner(b: Block, branch: 'body' | 'then' | 'else', list: Block[]): Block {
  if (b.kind === 'repeat') return { ...b, body: list };
  if (b.kind === 'if') return branch === 'else' ? { ...b, else: list } : { ...b, then: list };
  return b;
}

export function getList(blocks: Block[], path: ContainerPath): Block[] {
  let list = blocks;
  for (const p of path) list = innerList(list[p.index], p.branch);
  return list;
}

/** Replace the list at `path` using `fn`, returning a new top-level list. */
export function editList(blocks: Block[], path: ContainerPath, fn: (list: Block[]) => Block[]): Block[] {
  if (path.length === 0) return fn(blocks);
  const [head, ...rest] = path;
  return blocks.map((b, i) => (i === head.index ? withInner(b, head.branch, editList(innerList(b, head.branch), rest, fn)) : b));
}

export const insertBlock = (blocks: Block[], path: ContainerPath, index: number, block: Block) =>
  editList(blocks, path, (list) => [...list.slice(0, index), block, ...list.slice(index)]);

export const removeBlock = (blocks: Block[], path: ContainerPath, index: number) =>
  editList(blocks, path, (list) => list.filter((_, i) => i !== index));

export const updateBlock = (blocks: Block[], path: ContainerPath, index: number, fn: (b: Block) => Block) =>
  editList(blocks, path, (list) => list.map((b, i) => (i === index ? fn(b) : b)));

/** Find a block anywhere in the tree by id. */
export function findBlock(blocks: Block[], id: string): Block | undefined {
  for (const b of blocks) {
    if (b.id === id) return b;
    const inner = b.kind === 'repeat' ? b.body : b.kind === 'if' ? [...b.then, ...(b.else ?? [])] : [];
    const hit = findBlock(inner, id);
    if (hit) return hit;
  }
  return undefined;
}

/** Every block counts as one, including the ones inside loops. */
export function countBlocks(blocks: Block[]): number {
  return blocks.reduce((n, b) => {
    if (b.kind === 'repeat') return n + 1 + countBlocks(b.body);
    if (b.kind === 'if') return n + 1 + countBlocks(b.then) + countBlocks(b.else ?? []);
    return n + 1;
  }, 0);
}

/** The absolute moves a program makes when run (ignoring bumps): handy for reasoning about programs. */
export function flattenMoves(world: World, program: Program): Dir[] {
  return runProgram(world, program, { maxSteps: 400 })
    .steps.filter((s) => s.action === 'move' || s.action === 'bump')
    .map((s) => s.state.dir);
}

// ─────────────────────────── Solving and building puzzles ───────────────────────────

/** Shortest list of absolute moves from start to goal (collecting every item if `needItems`). Null if impossible. */
export function shortestPath(world: World): Dir[] | null {
  if (!world.goal) return [];
  const items = world.needItems ? (world.items ?? []) : [];
  const full = (1 << items.length) - 1;
  const key = (x: number, y: number, m: number) => `${x},${y},${m}`;
  const startMask = items.reduce((m, c, i) => (sameCell(c, world.start) ? m | (1 << i) : m), 0);
  const queue: { x: number; y: number; m: number; path: Dir[] }[] = [{ x: world.start.x, y: world.start.y, m: startMask, path: [] }];
  const seen = new Set([key(world.start.x, world.start.y, startMask)]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === world.goal.x && cur.y === world.goal.y && cur.m === full) return cur.path;
    for (const d of DIRS) {
      const n = ahead(cur, d);
      if (!open(world, n)) continue;
      const m = items.reduce((acc, c, i) => (sameCell(c, n) ? acc | (1 << i) : acc), cur.m);
      const k = key(n.x, n.y, m);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ x: n.x, y: n.y, m, path: [...cur.path, d] });
    }
  }
  return null;
}

export const movesToBlocks = (moves: Dir[]): Block[] => moves.map((d) => move(d));

/** Where a list of absolute moves ends up (or null if it would bump). */
export function endOf(world: World, moves: Dir[]): Cell | null {
  let c: Cell = { x: world.start.x, y: world.start.y };
  for (const d of moves) {
    c = ahead(c, d);
    if (!open(world, c)) return null;
  }
  return c;
}

/** A tiny seeded random generator so puzzles can be reproduced in tests. */
export function rng(seed = Math.floor(Math.random() * 1e9)) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

export interface PuzzleSpec {
  cols: number;
  rows: number;
  walls?: number;
  items?: number;
  /** Shortest solution length range (in moves). */
  minLen: number;
  maxLen: number;
  /** Require the shortest path to turn at least this many times. */
  minTurns?: number;
  random?: () => number;
}

/** A random solvable puzzle whose shortest solution has minLen..maxLen moves. */
export function makePuzzle(spec: PuzzleSpec): World & { solution: Dir[] } {
  const r = spec.random ?? Math.random;
  const ri = (n: number) => Math.floor(r() * n);
  for (let attempt = 0; attempt < 500; attempt++) {
    const cells: Cell[] = [];
    for (let y = 0; y < spec.rows; y++) for (let x = 0; x < spec.cols; x++) cells.push({ x, y });
    const take = () => cells.splice(ri(cells.length), 1)[0];
    const start = take();
    const goal = take();
    const items = Array.from({ length: spec.items ?? 0 }, take);
    const walls = Array.from({ length: spec.walls ?? 0 }, take);
    const world: World = { cols: spec.cols, rows: spec.rows, start: { ...start, dir: RIGHT }, goal, walls, items, needItems: (spec.items ?? 0) > 0 };
    const path = shortestPath(world);
    if (!path || path.length < spec.minLen || path.length > spec.maxLen) continue;
    const turns = path.filter((d, i) => i > 0 && d !== path[i - 1]).length;
    if (turns < (spec.minTurns ?? 0)) continue;
    return { ...world, start: { ...start, dir: path[0] ?? RIGHT }, solution: path };
  }
  // Fallback: a straight line along the top row.
  const len = Math.min(spec.maxLen, spec.cols - 1);
  return {
    cols: spec.cols,
    rows: spec.rows,
    start: { x: 0, y: 0, dir: RIGHT },
    goal: { x: len, y: 0 },
    walls: [],
    items: [],
    solution: Array.from({ length: len }, () => RIGHT),
  };
}

/** Group a list of moves into runs: [right,right,up] → [{dir: right, n: 2}, {dir: up, n: 1}]. */
export function runs(moves: Dir[]): { dir: Dir; n: number }[] {
  const out: { dir: Dir; n: number }[] = [];
  for (const d of moves) {
    const last = out[out.length - 1];
    if (last && last.dir === d) last.n++;
    else out.push({ dir: d, n: 1 });
  }
  return out;
}

/** Plain-words description of a list of moves: "right, right, up". */
export const describeMoves = (moves: Dir[]) => moves.map((d) => DIR_NAME[d]).join(', ');
