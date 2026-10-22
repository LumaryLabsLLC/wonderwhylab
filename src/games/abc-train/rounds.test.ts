import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { makeTrain } from './rounds';

describe('ABC Train rounds', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i trains are always solvable', (band) => {
    for (let i = 0; i < 500; i++) {
      const t = makeTrain(band);
      const gaps = t.cars.filter((c) => c.gap);
      const labels = t.pieces.map((p) => p.label);
      // No two blocks look the same, so a drop is never ambiguous.
      expect(new Set(labels).size).toBe(labels.length);
      // Every gap has exactly one block that fits it.
      for (const g of gaps) expect(labels.filter((l) => l === g.label).length).toBe(1);
      // Extra blocks never match any carriage.
      const carLabels = new Set(t.cars.map((c) => c.label));
      for (const p of t.pieces) {
        if (!gaps.some((g) => g.label === p.label)) expect(carLabels.has(p.label)).toBe(false);
      }
      if (band === 3) {
        expect(t.words).toBe(true);
        expect(gaps.length).toBe(t.cars.length);
        const firsts = t.cars.map((c) => c.label[0]);
        expect(new Set(firsts).size).toBe(firsts.length);
        expect([...firsts].sort().join('')).toBe(firsts.join(''));
      } else {
        expect(gaps.length).toBe([1, 2, 3][band]);
        // Letters run in alphabet order with no repeats.
        const codes = t.cars.map((c) => c.label.toLowerCase().charCodeAt(0));
        codes.forEach((c, k) => k > 0 && expect(c).toBe(codes[k - 1] + 1));
        if (band === 0) expect(codes.at(-1)!).toBeLessThanOrEqual('j'.charCodeAt(0));
        const upper = band < 2;
        for (const c of t.cars) expect(c.label === c.label.toUpperCase()).toBe(upper);
      }
    }
  });
});
