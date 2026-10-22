import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { PUZZLES, isBalanced, makePuzzles, torque } from './puzzles';

const bands: Band[] = [0, 1, 2, 3];

describe('balance lab puzzles', () => {
  it.each(bands)('band %i: every puzzle is solvable with the tray weights on allowed pegs', (band) => {
    for (let run = 0; run < 300; run++) {
      const puzzles = makePuzzles(band);
      expect(puzzles).toHaveLength(PUZZLES);
      for (const p of puzzles) {
        // The known solution uses only tray weights and allowed pegs, and balances.
        const tray = [...p.tray];
        for (const s of p.solution) {
          const i = tray.indexOf(s.mass);
          expect(i, JSON.stringify(p)).toBeGreaterThanOrEqual(0);
          tray.splice(i, 1);
          expect(p.allowed).toContain(s.dist);
          expect(s.dist).toBeLessThanOrEqual(p.pegs);
        }
        expect(isBalanced(p.left, p.solution), JSON.stringify(p)).toBe(true);
        // The puzzle doesn't start balanced (the right side starts empty).
        expect(torque(p.left)).toBeGreaterThan(0);
        for (const l of p.left) expect(l.dist).toBeLessThanOrEqual(p.pegs);
      }
    }
  });

  it('band 0 and 1 use a single seat on each side', () => {
    for (const band of [0, 1] as Band[]) for (const p of makePuzzles(band)) expect(p.allowed).toEqual([3]);
  });

  it('band 2 needs a different spot than the mirror one', () => {
    for (let run = 0; run < 200; run++)
      for (const p of makePuzzles(2)) {
        expect(p.solution[0].mass).not.toBe(p.left[0].mass);
        expect(p.solution[0].dist).not.toBe(p.left[0].dist);
      }
  });

  it('does not repeat a band 2 or band 3 puzzle within one game', () => {
    for (let run = 0; run < 200; run++)
      for (const band of [2, 3] as Band[]) {
        const keys = makePuzzles(band).map((p) => JSON.stringify(p.left) + JSON.stringify([...p.tray].sort()));
        expect(new Set(keys).size).toBe(PUZZLES);
      }
  });

  it('keeps stacks short enough to fit on the beam', () => {
    for (let run = 0; run < 200; run++)
      for (const band of bands)
        for (const p of makePuzzles(band)) {
          expect(p.left.length).toBeLessThanOrEqual(5);
          expect(p.tray.length).toBeLessThanOrEqual(6);
        }
  });
});
