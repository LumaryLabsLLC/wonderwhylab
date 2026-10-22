import type { Band } from '../types';
import { pick, rand, shuffle } from '../../lib/random';
import { ALPHABET, WORDS } from '../reading/words';

/** One carriage of the train. `gap` carriages start empty and must be filled. */
export interface Car {
  id: string;
  label: string;
  emoji?: string;
  gap: boolean;
}

/** A block waiting below the train. It fits the gap whose label matches its own. */
export interface Piece {
  id: string;
  label: string;
  emoji?: string;
}

export interface TrainRound {
  /** Band 3 trains carry picture words instead of single letters. */
  words: boolean;
  cars: Car[];
  pieces: Piece[];
}

export const TRAINS = 6;

const LETTER_RUNS: Record<0 | 1 | 2, { length: number; gaps: number; extra: number; maxStart: number; upper: boolean }> = {
  0: { length: 5, gaps: 1, extra: 2, maxStart: 5, upper: true }, // stays inside A–J
  1: { length: 6, gaps: 2, extra: 1, maxStart: 20, upper: true },
  2: { length: 6, gaps: 3, extra: 1, maxStart: 20, upper: false },
};

function letterTrain(band: 0 | 1 | 2): TrainRound {
  const spec = LETTER_RUNS[band];
  const start = rand(0, spec.maxStart);
  const run = ALPHABET.slice(start, start + spec.length).map((l) => (spec.upper ? l.toUpperCase() : l));
  const gapIndexes = new Set(shuffle(run.map((_, i) => i)).slice(0, spec.gaps));
  const cars: Car[] = run.map((label, i) => ({ id: `c${i}`, label, gap: gapIndexes.has(i) }));
  // Extra blocks are letters that are nowhere on this train, so they never fit.
  const pool = band === 0 ? ALPHABET.slice(0, 10) : ALPHABET;
  const others = shuffle(pool.map((l) => (spec.upper ? l.toUpperCase() : l)).filter((l) => !run.includes(l))).slice(0, spec.extra);
  const pieces: Piece[] = shuffle([
    ...cars.filter((c) => c.gap).map((c) => ({ id: `p-${c.label}`, label: c.label })),
    ...others.map((label) => ({ id: `x-${label}`, label })),
  ]);
  return { words: false, cars, pieces };
}

function wordTrain(): TrainRound {
  const count = pick([4, 5]);
  // Distinct first letters, so there is exactly one right order.
  const byLetter = new Map<string, (typeof WORDS)[number]>();
  for (const w of shuffle(WORDS)) if (!byLetter.has(w.word[0])) byLetter.set(w.word[0], w);
  const chosen = shuffle([...byLetter.values()]).slice(0, count);
  const sorted = [...chosen].sort((a, b) => a.word.localeCompare(b.word));
  const cars: Car[] = sorted.map((w, i) => ({ id: `c${i}`, label: w.word, emoji: w.emoji, gap: true }));
  const pieces: Piece[] = shuffle(chosen.map((w) => ({ id: `p-${w.word}`, label: w.word, emoji: w.emoji })));
  return { words: true, cars, pieces };
}

export function makeTrain(band: Band): TrainRound {
  return band === 3 ? wordTrain() : letterTrain(band);
}
