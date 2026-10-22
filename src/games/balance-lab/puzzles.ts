import type { Band } from '../types';

/**
 * Balance Lab puzzles. Physics: a beam balances when the turning effect (torque = weight × distance
 * from the pivot) is the same on both sides. The left side is set by the puzzle; the child loads the right.
 */

export const PUZZLES = 8;

export interface Placed {
  mass: number;
  /** Peg number counted out from the pivot (1 = closest). */
  dist: number;
}

export interface Puzzle {
  /** Pegs on each side of the pivot (distances 1..pegs). */
  pegs: number;
  /** Weights already on the left side. */
  left: Placed[];
  /** Masses waiting in the tray for the child. */
  tray: number[];
  /** Right-side pegs the child may use. */
  allowed: number[];
  /** One known way to balance it (used for hints and tests). */
  solution: Placed[];
}

export const torque = (ps: Placed[]) => ps.reduce((sum, p) => sum + p.mass * p.dist, 0);

export function isBalanced(left: Placed[], right: Placed[]): boolean {
  return right.length > 0 && torque(left) === torque(right);
}

type Rand = () => number;
const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pickOne = <T,>(r: Rand, items: readonly T[]) => items[Math.floor(r() * items.length)];
function shuffled<T>(r: Rand, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Ages 4–5: identical blocks on one seat each side; match the count. */
function band0(r: Rand, prev: number): Puzzle {
  let k = int(r, 1, 4);
  if (k === prev) k = (k % 4) + 1;
  return {
    pegs: 3,
    left: Array.from({ length: k }, () => ({ mass: 1, dist: 3 })),
    tray: Array.from({ length: 5 }, () => 1),
    allowed: [3],
    solution: Array.from({ length: k }, () => ({ mass: 1, dist: 3 })),
  };
}

/** Ages 6–7: small (1) and big (2) blocks on one seat each side; two small weigh the same as one big. */
function band1(r: Rand, i: number): Puzzle {
  const kind = i % 3;
  if (kind === 0) {
    // Left has big blocks (maybe a small one too); the tray only has small blocks.
    const bigs = int(r, 1, 2);
    const smalls = int(r, 0, 1);
    const total = bigs * 2 + smalls;
    return {
      pegs: 3,
      left: [...Array.from({ length: bigs }, () => ({ mass: 2, dist: 3 })), ...Array.from({ length: smalls }, () => ({ mass: 1, dist: 3 }))],
      tray: Array.from({ length: total + 1 }, () => 1),
      allowed: [3],
      solution: Array.from({ length: total }, () => ({ mass: 1, dist: 3 })),
    };
  }
  if (kind === 1) {
    // Left has small blocks (an even number); the tray only has big blocks.
    const bigsNeeded = int(r, 1, 2);
    return {
      pegs: 3,
      left: Array.from({ length: bigsNeeded * 2 }, () => ({ mass: 1, dist: 3 })),
      tray: Array.from({ length: bigsNeeded + 1 }, () => 2),
      allowed: [3],
      solution: Array.from({ length: bigsNeeded }, () => ({ mass: 2, dist: 3 })),
    };
  }
  // Mixed: left has a mix; the tray has two big and two small.
  const total = int(r, 3, 5);
  const leftBigs = Math.floor(total / 2) - (r() < 0.5 ? 1 : 0);
  const leftSmalls = total - leftBigs * 2;
  const solBigs = Math.min(2, Math.floor(total / 2));
  const solSmalls = total - solBigs * 2;
  return {
    pegs: 3,
    left: [...Array.from({ length: leftBigs }, () => ({ mass: 2, dist: 3 })), ...Array.from({ length: leftSmalls }, () => ({ mass: 1, dist: 3 }))],
    tray: shuffled(r, [2, 2, 1, 1]),
    allowed: [3],
    solution: [...Array.from({ length: solBigs }, () => ({ mass: 2, dist: 3 })), ...Array.from({ length: solSmalls }, () => ({ mass: 1, dist: 3 }))],
  };
}

/** Ages 8–9: one weight on each side; find the spot where the given weight balances (distance matters). */
const BAND2_SETS: { left: Placed; mass: number; dist: number }[] = (() => {
  const out: { left: Placed; mass: number; dist: number }[] = [];
  for (let lm = 1; lm <= 4; lm++)
    for (let ld = 1; ld <= 4; ld++)
      for (let rm = 1; rm <= 4; rm++) {
        const t = lm * ld;
        if (t % rm !== 0) continue;
        const rd = t / rm;
        if (rd < 1 || rd > 4 || rm === lm) continue;
        out.push({ left: { mass: lm, dist: ld }, mass: rm, dist: rd });
      }
  return out;
})();

function band2(r: Rand): Puzzle {
  const set = pickOne(r, BAND2_SETS);
  return {
    pegs: 4,
    left: [set.left],
    tray: [set.mass],
    allowed: [1, 2, 3, 4],
    solution: [{ mass: set.mass, dist: set.dist }],
  };
}

/** Ages 10–12: numbered weights and distances; make weight × distance equal on both sides. */
function band3(r: Rand): Puzzle {
  for (let attempt = 0; attempt < 200; attempt++) {
    const solution: Placed[] = [{ mass: int(r, 2, 8), dist: int(r, 1, 5) }];
    if (r() < 0.45) solution.push({ mass: int(r, 1, 6), dist: int(r, 1, 5) });
    const t = torque(solution);
    if (t < 4 || t > 40) continue;
    // Build the left side: one or two weights with the same total torque but a different layout.
    const left: Placed[] = [];
    const singles: Placed[] = [];
    for (let m = 1; m <= 9; m++) for (let d = 1; d <= 5; d++) if (m * d === t) singles.push({ mass: m, dist: d });
    if (singles.length && r() < 0.6) left.push(pickOne(r, singles));
    else {
      const d1 = int(r, 1, 5);
      const m1 = int(r, 1, 9);
      const rest = t - m1 * d1;
      const pairs: Placed[] = [];
      for (let m = 1; m <= 9; m++) for (let d = 1; d <= 5; d++) if (m * d === rest && d !== d1) pairs.push({ mass: m, dist: d });
      if (rest <= 0 || !pairs.length) continue;
      left.push({ mass: m1, dist: d1 }, pickOne(r, pairs));
    }
    const sameLayout =
      left.length === solution.length &&
      [...left].sort((a, b) => a.dist - b.dist || a.mass - b.mass).every((p, i) => {
        const s = [...solution].sort((a, b) => a.dist - b.dist || a.mass - b.mass)[i];
        return p.mass === s.mass && p.dist === s.dist;
      });
    if (sameLayout) continue;
    let decoy = int(r, 1, 9);
    while (solution.some((s) => s.mass === decoy)) decoy = (decoy % 9) + 1;
    return {
      pegs: 5,
      left,
      tray: shuffled(r, [...solution.map((s) => s.mass), decoy]),
      allowed: [1, 2, 3, 4, 5],
      solution,
    };
  }
  // Fallback that is always valid.
  return { pegs: 5, left: [{ mass: 6, dist: 2 }], tray: [4, 3, 5], allowed: [1, 2, 3, 4, 5], solution: [{ mass: 4, dist: 3 }] };
}

export function makePuzzles(band: Band, r: Rand = Math.random): Puzzle[] {
  const out: Puzzle[] = [];
  const seen = new Set<string>();
  let prevKey = '';
  for (let i = 0; out.length < PUZZLES && i < 200; i++) {
    const p =
      band === 0 ? band0(r, out.at(-1)?.left.length ?? 0) : band === 1 ? band1(r, out.length) : band === 2 ? band2(r) : band3(r);
    const key = JSON.stringify(p.left) + JSON.stringify([...p.tray].sort());
    // Never the same puzzle twice in a row; no repeats at all while there are fresh ones to find.
    if (key === prevKey || (seen.has(key) && i < 120)) continue;
    prevKey = key;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** One short, true sentence about why it balanced. */
export function explain(band: Band, p: Puzzle, right: Placed[]): string {
  if (band === 0) return 'Same number of blocks, same distance from the middle: balanced!';
  if (band === 1) return 'One big block weighs the same as two small ones, so both sides weigh the same.';
  const sum = (ps: Placed[]) => ps.map((x) => `${x.mass}×${x.dist}`).join(' + ');
  if (band === 2) {
    const l = p.left[0];
    const rr = right[0];
    const note = rr.mass > l.mass ? 'A heavier weight balances closer to the middle' : 'A lighter weight balances farther out';
    return `${note}: ${sum(p.left)} = ${sum(right)} = ${torque(right)}.`;
  }
  return `Left ${sum(p.left)} = ${torque(p.left)} · Right ${sum(right)} = ${torque(right)}. Equal turning, so it balances!`;
}

export function hint(band: Band, p: Puzzle): string {
  if (band === 0) return `Count the blocks on the left. Put the same number on the right seat.`;
  if (band === 1) return 'A big block is as heavy as two small ones.';
  if (band === 2) return 'Heavier? Move it closer to the middle. Lighter? Move it farther out.';
  return `The left side turns with ${torque(p.left)} (weight × distance). Make the right side ${torque(p.left)} too.`;
}
