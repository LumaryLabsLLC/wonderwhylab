import { pick, rand, shuffle } from '../../../lib/random';
import { DIR_NAME, DOWN, LEFT, RIGHT, UP, ahead, cloneBlocks, countBlocks, flattenMoves, move, repeat, sameCell } from '../engine';
import type { Block, Cell, Dir, World } from '../engine';
import { fixableAt, reaches } from '../questions';

/** A loop program and a world it solves exactly (start, flag, a few rocks off the path). */
export interface LoopPuzzle {
  world: World;
  program: Block[];
  moves: Dir[];
  /** Fewest blocks that solve it (the program above). */
  best: number;
}

/** Loop-friendly program shapes: long runs and repeating stairs. */
function randomProgram(kind = rand(0, 4)): Block[] {
  const h: Dir = pick([RIGHT, LEFT]);
  const v: Dir = pick([UP, DOWN]);
  switch (kind) {
    case 0:
      return [repeat(rand(4, 6), [move(h)])];
    case 1:
      return [repeat(rand(3, 5), [move(h)]), repeat(rand(2, 3), [move(v)])];
    case 2:
      return [repeat(rand(2, 4), [move(h), move(v)])];
    case 3:
      return [repeat(2, [move(h), move(h), move(v)])];
    default:
      return [move(v), repeat(rand(3, 5), [move(h)])];
  }
}

/** Build a cols × rows world around `program`'s path, placed at a random spot, with `rocks` rocks off the path. */
export function worldFor(program: Block[], cols: number, rows: number, rocks: number): World | null {
  const probe: World = { cols: 99, rows: 99, start: { x: 49, y: 49, dir: RIGHT }, walls: [] };
  const moves = flattenMoves(probe, { main: program });
  const path: Cell[] = [{ x: 0, y: 0 }];
  for (const d of moves) path.push(ahead(path[path.length - 1], d));
  const minX = Math.min(...path.map((c) => c.x));
  const minY = Math.min(...path.map((c) => c.y));
  const w = Math.max(...path.map((c) => c.x)) - minX + 1;
  const h = Math.max(...path.map((c) => c.y)) - minY + 1;
  if (w > cols || h > rows) return null;
  const ox = rand(0, cols - w) - minX;
  const oy = rand(0, rows - h) - minY;
  const cells = path.map((c) => ({ x: c.x + ox, y: c.y + oy }));
  const free: Cell[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!cells.some((c) => sameCell(c, { x, y }))) free.push({ x, y });
  return {
    cols,
    rows,
    start: { ...cells[0], dir: moves[0] },
    goal: cells[cells.length - 1],
    walls: shuffle(free).slice(0, rocks),
  };
}

export function loopPuzzle(o: { cols?: number; rows?: number; rocks?: number; kind?: number } = {}): LoopPuzzle {
  for (;;) {
    const program = randomProgram(o.kind);
    const world = worldFor(program, o.cols ?? 7, o.rows ?? 5, o.rocks ?? 3);
    if (!world) continue;
    const moves = flattenMoves(world, { main: program });
    return { world, program, moves, best: countBlocks(program) };
  }
}

export type BugKind = 'count' | 'arrow' | 'inner';

export interface LoopBug {
  world: World;
  buggy: Block[];
  fixed: Block[];
  /** Top-level index of the bug. */
  bug: number;
  kind: BugKind;
  bad: string;
  good: string;
}

/** Programs with arrows and loops mixed, for debugging. */
function debugProgram(long: boolean): Block[] {
  const h: Dir = pick([RIGHT, LEFT]);
  const v: Dir = pick([UP, DOWN]);
  const a = rand(3, 4);
  const options: Block[][] = [
    [repeat(a, [move(h)]), move(v)],
    [move(v), repeat(a, [move(h)])],
    [repeat(rand(2, 3), [move(h), move(v)])],
    [repeat(a, [move(h)]), repeat(2, [move(v)])],
  ];
  const longer: Block[][] = [
    [move(v), repeat(a, [move(h)]), move(v)],
    [repeat(3, [move(h)]), move(v), repeat(2, [move(h)])],
    [move(h), repeat(2, [move(h), move(v)]), move(h)],
  ];
  return cloneBlocks(pick(long ? longer : options));
}

/**
 * A loop program with exactly one bug (a wrong loop count or a wrong arrow), where fixing
 * that one block is the only single change that works.
 */
export function loopBug(o: { long?: boolean; kinds?: BugKind[]; rocks?: number; minBlocks?: number; cols?: number; rows?: number } = {}): LoopBug {
  for (;;) {
    const fixed = debugProgram(!!o.long);
    if (fixed.length < (o.minBlocks ?? 1)) continue;
    const world = worldFor(fixed, o.cols ?? 7, o.rows ?? 5, o.rocks ?? 2);
    if (!world || !reaches(world, fixed)) continue;
    const bug = rand(0, fixed.length - 1);
    const b = fixed[bug];
    const kinds: BugKind[] = (b.kind === 'repeat' ? (['count', 'inner'] as BugKind[]) : (['arrow'] as BugKind[])).filter((k) => !o.kinds || o.kinds.includes(k));
    if (!kinds.length) continue;
    const kind = pick(kinds);
    let buggyBlock: Block;
    let bad: string;
    let good: string;
    if (b.kind === 'repeat' && kind === 'count') {
      const times = pick([b.times - 2, b.times - 1, b.times + 1, b.times + 2].filter((t) => t >= 2 && t <= 9));
      buggyBlock = { ...b, times };
      bad = String(times);
      good = String(b.times);
    } else if (b.kind === 'repeat') {
      const k = rand(0, b.body.length - 1);
      const inner = b.body[k];
      if (inner.kind !== 'move') continue;
      const d = pick(([UP, RIGHT, DOWN, LEFT] as Dir[]).filter((x) => x !== inner.dir));
      buggyBlock = { ...b, body: b.body.map((x, i) => (i === k ? { ...inner, dir: d } : x)) };
      bad = dirWord(d);
      good = dirWord(inner.dir);
    } else if (b.kind === 'move') {
      const d = pick(([UP, RIGHT, DOWN, LEFT] as Dir[]).filter((x) => x !== b.dir));
      buggyBlock = { ...b, dir: d };
      bad = dirWord(d);
      good = dirWord(b.dir);
    } else continue;
    const buggy = fixed.map((x, i) => (i === bug ? buggyBlock : x));
    if (reaches(world, buggy)) continue;
    const fixes = fixableAt(world, buggy);
    if (fixes.length !== 1 || fixes[0] !== bug) continue;
    // The robot faces its (buggy) first move, so its facing doesn't hint at the fix.
    const first = flattenMoves(world, { main: buggy })[0] ?? world.start.dir;
    return { world: { ...world, start: { ...world.start, dir: first } }, buggy, fixed, bug, kind, bad, good };
  }
}

const dirWord = (d: Dir) => DIR_NAME[d];

/** Words for "what is wrong / how to fix it" used in explanations. */
export function bugWords(b: LoopBug): { why: string; fix: string } {
  const k = b.bug + 1;
  if (b.kind === 'count') return { why: `Block ${k} repeats ${b.bad} times, but the robot needs ${b.good} times round.`, fix: `Change it to ${b.good}.` };
  if (b.kind === 'inner') return { why: `Inside Block ${k}, an arrow points ${b.bad}, but it should point ${b.good}.`, fix: `Turn it to ${b.good}.` };
  return { why: `Block ${k} moves ${b.bad}, but the robot needs to go ${b.good} there.`, fix: `Turn it to ${b.good}.` };
}
