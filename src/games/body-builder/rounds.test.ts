import { describe, expect, it } from 'vitest';
import { makeRounds, ROUNDS } from './rounds';
import type { Band } from '../types';

describe('Body Builder rounds', () => {
  for (const band of [0, 1, 2, 3] as Band[]) {
    it(`band ${band}: every piece has exactly one right target`, () => {
      for (let i = 0; i < 300; i++) {
        const rounds = makeRounds(band);
        expect(rounds).toHaveLength(ROUNDS);
        for (const round of rounds) {
          expect(round.pieces.length).toBeGreaterThanOrEqual(5);
          expect(round.pieces.length).toBeLessThanOrEqual(6);
          const ids = round.pieces.map((p) => p.id);
          expect(new Set(ids).size).toBe(ids.length);
          const targetIds = round.targets.map((t) => t.id);
          expect(new Set(targetIds).size).toBe(targetIds.length);
          for (const p of round.pieces) {
            expect(targetIds.filter((t) => t === p.target)).toHaveLength(1);
            expect(p.fact.length).toBeGreaterThan(10);
            expect(p.label.length).toBeGreaterThan(1);
          }
          if (round.view !== 'systems') {
            for (const t of round.targets) expect(t.anchors.length).toBeGreaterThan(0);
          }
        }
      }
    });
  }

  it('band 1 asks about each sense once per round', () => {
    for (const round of makeRounds(1)) {
      expect(new Set(round.pieces.map((p) => p.target))).toEqual(new Set(['eyes', 'ears', 'nose', 'tongue', 'skin']));
    }
  });
});
