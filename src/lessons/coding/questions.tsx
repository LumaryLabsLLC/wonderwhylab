import type { Question } from '../types';
import { pick, rand, shuffle } from '../../lib/random';
import {
  ArrowsPicture,
  DIRS,
  GridPicture,
  PuzzlePicture,
  ahead,
  endOf,
  makePuzzle,
  movesToBlocks,
  open,
  runProgram,
  sameCell,
} from './engine';
import type { Block, Cell, Dir, PuzzleSpec, World } from './engine';
import { mcq } from './q';
import { say, sayRuns } from './words';

/** Practice-question builders shared by the coding lessons. */

/** The robot facing a random way, so its facing never gives away the first move. */
export const faceRandom = <W extends World>(world: W): W => ({ ...world, start: { ...world.start, dir: pick(DIRS) } });

export const reaches = (world: World, blocks: Block[]) => runProgram(world, { main: blocks }).outcome === 'success';

/** Every program that differs from `blocks` by one change to top-level block `j` (an arrow turned, a loop count or inner arrow changed). */
export function variants(blocks: Block[], j: number): Block[][] {
  const b = blocks[j];
  const swap = (nb: Block) => blocks.map((x, i) => (i === j ? nb : x));
  if (b.kind === 'move') return DIRS.filter((d) => d !== b.dir).map((d) => swap({ ...b, dir: d }));
  if (b.kind === 'repeat') {
    const out: Block[][] = [];
    for (let t = 1; t <= 9; t++) if (t !== b.times) out.push(swap({ ...b, times: t }));
    b.body.forEach((inner, k) => {
      if (inner.kind !== 'move') return;
      for (const d of DIRS) if (d !== inner.dir) out.push(swap({ ...b, body: b.body.map((x, i) => (i === k ? { ...inner, dir: d } : x)) }));
    });
    return out;
  }
  return [];
}

/** Top-level blocks where one change makes the program work. */
export const fixableAt = (world: World, blocks: Block[]) => blocks.map((_, j) => j).filter((j) => variants(blocks, j).some((v) => reaches(world, v)));

/** "Which program gets the robot to the flag (collecting any stars)?" Wrong choices are near misses. */
export function whichProgram(spec: PuzzleSpec & { choices?: number; sameArrows?: boolean }): Question {
  const n = spec.choices ?? 3;
  for (;;) {
    const p = faceRandom(makePuzzle(spec));
    const sol = p.solution;
    const ok = (m: Dir[]) => reaches(p, movesToBlocks(m));
    const near: Dir[][] = [];
    if (spec.sameArrows) for (let k = 0; k < 30; k++) near.push(shuffle(sol));
    sol.forEach((d, i) => DIRS.forEach((e) => e !== d && near.push(sol.map((x, j) => (j === i ? e : x)))));
    for (let i = 0; i + 1 < sol.length; i++) if (sol[i] !== sol[i + 1]) near.push(sol.map((x, j) => (j === i ? sol[i + 1] : j === i + 1 ? sol[i] : x)));
    near.push(sol.slice(0, -1), [...sol].reverse());
    const seen = new Set([say(sol)]);
    const wrong: Dir[][] = [];
    // Same-arrow reorderings first (when asked), then the rest in random order.
    for (const m of [...(spec.sameArrows ? near.slice(0, 30) : []), ...shuffle(near)]) {
      if (wrong.length >= n - 1) break;
      if (!m.length || seen.has(say(m)) || ok(m)) continue;
      seen.add(say(m));
      wrong.push(m);
    }
    if (wrong.length < n - 1) continue;
    const stars = p.items?.length ?? 0;
    const all = [sol, ...wrong];
    return mcq({
      prompt: stars ? `Which program collects the star${stars > 1 ? 's' : ''} and gets the robot to the flag?` : 'Which program gets the robot to the flag?',
      visual: <GridPicture world={p} />,
      answer: say(sol),
      wrong: wrong.map(say),
      labels: Object.fromEntries(all.map((m) => [say(m), <ArrowsPicture moves={m} />])),
      names: Object.fromEntries(all.map((m) => [say(m), say(m)])),
      hint: stars ? 'Trace each program with your finger. Does it pass every star before the flag?' : 'Put your finger on the robot. Move one square for each arrow and see where you stop.',
      explain: [
        'Trace each program one arrow at a time.',
        `${say(sol)} moves the robot ${sayRuns(sol)}${stars ? `, over the star${stars > 1 ? 's' : ''},` : ''} and ends on the flag.`,
        `So the answer is ${say(sol)}.`,
      ],
    });
  }
}

/** A random walk of `len` moves that never bumps (and doesn't step straight back). */
function walk(cols: number, rows: number, len: number): { start: Cell; moves: Dir[] } {
  for (;;) {
    const start = { x: rand(0, cols - 1), y: rand(0, rows - 1) };
    const world: World = { cols, rows, start: { ...start, dir: 1 }, walls: [] };
    const moves: Dir[] = [];
    let c: Cell = start;
    for (let i = 0; i < len; i++) {
      const last = moves[moves.length - 1];
      const options = DIRS.filter((d) => open(world, ahead(c, d)) && (last === undefined || (d + 2) % 4 !== last));
      if (!options.length) break;
      const d = pick(options);
      moves.push(d);
      c = ahead(c, d);
    }
    if (moves.length === len && !sameCell(c, start)) return { start, moves };
  }
}

/** "Where does the robot end up?" Three lettered squares; the program is shown beside the grid. */
export function whereItEnds(o: { cols: number; rows: number; len: number }): Question {
  for (;;) {
    const { start, moves } = walk(o.cols, o.rows, o.len);
    const world: World = { cols: o.cols, rows: o.rows, start: { ...start, dir: moves[0] }, walls: [] };
    const end = endOf(world, moves)!;
    // Near misses: stopping one step early, one arrow read the wrong way, or one step too far.
    const near: Cell[] = [endOf(world, moves.slice(0, -1))!];
    moves.forEach((d, i) => DIRS.forEach((e) => e !== d && near.push(endOf(world, moves.map((x, j) => (j === i ? e : x))) ?? start)));
    DIRS.forEach((d) => near.push(ahead(end, d)));
    const others: Cell[] = [];
    for (const c of shuffle(near)) {
      if (others.length >= 2) break;
      if (!open(world, c) || sameCell(c, start) || sameCell(c, end) || others.some((x) => sameCell(x, c))) continue;
      others.push(c);
    }
    if (others.length < 2) continue;
    const letters = shuffle(['A', 'B', 'C']);
    const cells = [end, ...others];
    const labels = cells.map((cell, i) => ({ cell, text: letters[i] }));
    const answer = letters[0];
    return mcq({
      prompt: 'Run the program in your head. Where does the robot end up?',
      visual: <PuzzlePicture world={world} blocks={movesToBlocks(moves)} labels={labels} />,
      answer,
      wrong: letters.slice(1),
      hint: 'Start at the robot. Move one square for each arrow, in order, from left to right.',
      explain: [`Follow the arrows from the robot: ${say(moves)}.`, `That is ${sayRuns(moves)}.`, `The robot stops on square ${answer}.`],
    });
  }
}

/** "Which block is the bug?" for a program that should reach the flag but has exactly one fixable block. */
export function whichBlockIsBug(o: { world: World; buggy: Block[]; bug: number; why: string; fix: string }): Question {
  const n = o.buggy.length;
  const nums = Array.from({ length: n }, (_, i) => i + 1).filter((k) => k !== o.bug + 1);
  const wrong = shuffle(nums).slice(0, 3);
  const name = (k: number) => `Block ${k}`;
  return mcq({
    prompt: 'This program should take the robot to the flag. Which block is the bug?',
    visual: <PuzzlePicture world={o.world} blocks={o.buggy} numbered />,
    answer: name(o.bug + 1),
    wrong: wrong.map(name),
    hint: 'Run it in your head one block at a time. Stop at the first block that sends the robot the wrong way.',
    explain: [`Follow the program block by block from the robot.`, o.why, `So the bug is Block ${o.bug + 1}. ${o.fix}`],
  });
}


/** A puzzle whose program has one wrong arrow at `bug`, and turning that arrow is the only one-block fix. */
export function arrowBug(spec: PuzzleSpec): { world: World; buggy: Block[]; bug: number; wrongDir: Dir; rightDir: Dir } {
  for (;;) {
    const p = makePuzzle(spec);
    const sol = p.solution;
    const bug = rand(0, sol.length - 1);
    const wrongDir = pick(DIRS.filter((d) => d !== sol[bug]));
    const buggy = movesToBlocks(sol.map((d, j) => (j === bug ? wrongDir : d)));
    if (reaches(p, buggy)) continue;
    const fixes = fixableAt(p, buggy);
    if (fixes.length !== 1 || fixes[0] !== bug) continue;
    // The robot faces its (buggy) first move, so its facing doesn't hint at the fix.
    return { world: { ...p, start: { ...p.start, dir: buggy[0].kind === 'move' ? buggy[0].dir : p.start.dir } }, buggy, bug, wrongDir, rightDir: sol[bug] };
  }
}
