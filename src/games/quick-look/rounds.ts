import type { Band } from '../types';
import { pick, rand, shuffle } from '../../lib/random';

/**
 * Quick images (Clements & Sarama): a pattern flashes briefly, then the child rebuilds it.
 * Dice patterns and ten-frames help children "see" amounts without counting one by one.
 */
export type LookRound =
  /** Dots on a 3 × 3 dice face; `dots` are cell indexes 0–8 (row by row). */
  | { kind: 'dice'; n: number; dots: number[] }
  /** Counters filling ten-frames in reading order; `frames` is 1 or 2. */
  | { kind: 'frame'; n: number; frames: 1 | 2 }
  | { kind: 'array'; rows: number; cols: number };

export const ROUNDS = 8;

/** Cells a child can fill when rebuilding: a 5-frame, one ten-frame, or two. */
export function buildCells(band: Band): number {
  return band === 0 ? 5 : band === 1 ? 10 : 20;
}

/** The array grid children rebuild on (band 3). */
export const ARRAY_GRID = { rows: 5, cols: 6 };

/** Each dice amount, sometimes turned the other way so 2 and 3 aren't always the same diagonal. */
function dice(n: number): number[] {
  const flip = Math.random() < 0.5;
  switch (n) {
    case 1:
      return [4];
    case 2:
      return flip ? [2, 6] : [0, 8];
    case 3:
      return flip ? [2, 4, 6] : [0, 4, 8];
    case 4:
      return [0, 2, 6, 8];
    default:
      return [0, 2, 4, 6, 8];
  }
}

/** Pick `ROUNDS` amounts from `values`, spreading them out and never repeating one twice in a row. */
function spread(values: number[]): number[] {
  const out: number[] = [];
  let bag: number[] = [];
  while (out.length < ROUNDS) {
    if (!bag.length) bag = shuffle(values);
    const i = bag.findIndex((v) => v !== out[out.length - 1]);
    if (i === -1) {
      // Only a repeat is left in the bag: start a fresh one.
      bag = shuffle(values);
      continue;
    }
    out.push(bag.splice(i, 1)[0]);
  }
  return out;
}

export function makeRounds(band: Band): LookRound[] {
  if (band === 0) return spread([1, 2, 3, 4, 5, 2, 3, 4, 5]).map((n) => ({ kind: 'dice', n, dots: dice(n) }));
  if (band === 1) return spread([3, 4, 5, 6, 7, 8, 9, 10, 2]).map((n) => ({ kind: 'frame', n, frames: 1 }));
  if (band === 2) return spread([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]).map((n) => ({ kind: 'frame', n, frames: 2 }));
  const seen = new Set<string>();
  const out: LookRound[] = [];
  while (out.length < ROUNDS) {
    const rows = rand(2, ARRAY_GRID.rows);
    const cols = rand(2, ARRAY_GRID.cols);
    const last = out[out.length - 1];
    if (seen.has(`${rows}x${cols}`) || (last && amount(last) === rows * cols)) continue;
    seen.add(`${rows}x${cols}`);
    out.push({ kind: 'array', rows, cols });
  }
  return out;
}

export function amount(round: LookRound): number {
  return round.kind === 'array' ? round.rows * round.cols : round.n;
}

export interface Build {
  /** Filled cells (bands 0–2). */
  cells: Set<number>;
  /** Chosen array size (band 3). */
  array: { rows: number; cols: number } | null;
}

/** Did the child rebuild exactly what they saw? Any arrangement of the right amount counts for frames. */
export function isExact(round: LookRound, build: Build): boolean {
  if (round.kind === 'array') return !!build.array && build.array.rows === round.rows && build.array.cols === round.cols;
  return build.cells.size === round.n;
}

/** How to "see" the amount, e.g. "A full row of 5 and 2 more makes 7." */
export function explain(round: LookRound): string {
  if (round.kind === 'array') return `${round.rows} rows of ${round.cols}: ${round.rows} × ${round.cols} = ${round.rows * round.cols}.`;
  const n = round.n;
  if (round.kind === 'dice') {
    return (
      {
        1: 'One dot right in the middle.',
        2: 'Two dots, one in each corner.',
        3: 'Three dots in a line.',
        4: 'Four corners make 4.',
        5: 'Four corners and 1 in the middle make 5.',
      }[n] ?? `${n} dots.`
    );
  }
  if (round.frames === 2) return n === 20 ? 'Two full tens make 20.' : `A full ten and ${n - 10} more makes ${n}.`;
  if (n === 10) return 'Two full rows make 10.';
  if (n === 5) return 'One full row makes 5.';
  if (n < 5) return `${n} in the top row, ${5 - n} empty.`;
  return `A full row of 5 and ${n - 5} more makes ${n}.`;
}

/** How long the pattern shows, in milliseconds. */
export function flashMs(band: Band): number {
  return band <= 1 ? 1500 : band === 2 ? 1800 : 2000;
}

export const PRAISE = ['You saw it!', 'Sharp eyes!', 'Exactly right!', 'Spot on!'];
export const pickPraise = () => pick(PRAISE);
