import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { adapt, areaOf, areaSum, buildRound, check, nextRound, pieceQuarters, pools, ROUNDS, solve } from './rounds';

const BANDS: Band[] = [0, 1, 2, 3];

describe('Shape Builder puzzles', () => {
  it.each(BANDS)('band %i: every puzzle is a clean tiling the solver can also find', (band) => {
    pools(band).forEach((tier, t) => {
      expect(tier.length, `band ${band} tier ${t}`).toBeGreaterThanOrEqual(2);
      for (const puzzle of tier) {
        const round = buildRound(puzzle, band, t);
        const where = `${band}/${t} ${puzzle.name}`;
        // The designed pieces cover the silhouette with no overlaps.
        const quarters = round.solution.flatMap((s) => pieceQuarters(s.type, s.rot, s.x, s.y));
        expect(new Set(quarters).size, `${where} overlaps`).toBe(quarters.length);
        expect(quarters.length, where).toBe(round.target.size);
        // Placing the designed solution counts as solved.
        expect(check(round, round.solution, round.pieces.length).solved, where).toBe(true);
        // The pieces offered are exactly the solution's pieces.
        expect(round.pieces.map((p) => p.type).sort(), where).toEqual(round.solution.map((s) => s.type).sort());
        // The solver can build it from scratch (this is what "Show me" relies on).
        expect(solve(round.target, round.pieces.map((p) => p.type)), `${where} solver`).not.toBeNull();
        // Piece count by age.
        const n = round.pieces.length;
        if (band === 0) expect(n).toBeLessThanOrEqual(3);
        if (band === 1) expect(n === 4 || n === 5, `${where} has ${n} pieces`).toBe(true);
        if (band === 2 && t === 2) expect(n).toBe(7);
      }
    });
  });

  it('youngest children get pieces already turned the right way in the easiest tier', () => {
    for (let i = 0; i < 50; i++) {
      const round = nextRound(0, 0, new Set());
      expect(round.pieces.every((p) => round.solution.some((s) => s.type === p.type && s.rot === p.rot))).toBe(true);
    }
  });

  it('band 3 areas add up', () => {
    for (const tier of pools(3)) {
      for (const puzzle of tier) {
        const round = buildRound(puzzle, 3, 0);
        const total = round.solution.reduce((a, s) => a + areaOf(s.type), 0);
        expect(total * 4).toBe(round.target.size);
        expect(areaSum(round)).toContain(`= ${total} square units`);
      }
    }
  });

  it('flags pieces that stick out or overlap', () => {
    const round = buildRound(pools(0)[0][1], 0, 0);
    const moved = round.solution.map((s, i) => (i === 0 ? { ...s, x: s.x + 5 } : s));
    const res = check(round, moved, round.pieces.length);
    expect(res.solved).toBe(false);
    expect(res.bad[0]).toBe(true);
  });

  it('avoids repeating a puzzle in a session when it can', () => {
    const played = new Set<string>();
    const names = Array.from({ length: pools(0)[0].length }, () => nextRound(0, 0, played).puzzle.name);
    expect(new Set(names).size).toBe(names.length);
    expect(ROUNDS).toBeGreaterThanOrEqual(5);
  });

  it('adapts: three clean solves step up, a miss steps down', () => {
    let s = { tier: 0, streak: 0 };
    s = adapt(s.tier, s.streak, true);
    s = adapt(s.tier, s.streak, true);
    s = adapt(s.tier, s.streak, true);
    expect(s.tier).toBe(1);
    s = adapt(s.tier, s.streak, false);
    expect(s).toEqual({ tier: 0, streak: 0 });
  });

  it('a perfect session reaches the hardest level before it ends', () => {
    let s = { tier: 0, streak: 0 };
    const tiers: number[] = [];
    for (let i = 0; i < ROUNDS; i++) {
      tiers.push(s.tier);
      s = adapt(s.tier, s.streak, true);
    }
    expect(tiers).toContain(2);
  });
});
