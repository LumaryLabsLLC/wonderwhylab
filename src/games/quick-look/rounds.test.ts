import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { amount, ARRAY_GRID, buildCells, explain, isExact, makeRounds, ROUNDS } from './rounds';

const BANDS: Band[] = [0, 1, 2, 3];

describe('Quick Look rounds', () => {
  it.each(BANDS)('band %i: every pattern fits its frame', (band) => {
    for (let n = 0; n < 300; n++) {
      const rounds = makeRounds(band);
      expect(rounds).toHaveLength(ROUNDS);
      for (let i = 0; i < rounds.length; i++) {
        const r = rounds[i];
        expect(explain(r).length).toBeGreaterThan(5);
        if (i > 0) expect(amount(r), 'no amount twice in a row').not.toBe(amount(rounds[i - 1]));
        if (band === 0) {
          expect(r.kind).toBe('dice');
          if (r.kind !== 'dice') continue;
          expect(r.n).toBeGreaterThanOrEqual(1);
          expect(r.n).toBeLessThanOrEqual(5);
          expect(r.dots).toHaveLength(r.n);
          expect(new Set(r.dots).size).toBe(r.n);
          for (const d of r.dots) expect(d >= 0 && d <= 8).toBe(true);
          expect(r.n).toBeLessThanOrEqual(buildCells(band));
        } else if (band === 1 || band === 2) {
          expect(r.kind).toBe('frame');
          if (r.kind !== 'frame') continue;
          expect(r.frames).toBe(band === 1 ? 1 : 2);
          expect(r.n).toBeLessThanOrEqual(r.frames * 10);
          expect(r.n).toBeGreaterThanOrEqual(band === 1 ? 1 : 11);
          expect(r.n).toBeLessThanOrEqual(buildCells(band));
        } else {
          expect(r.kind).toBe('array');
          if (r.kind !== 'array') continue;
          expect(r.rows >= 2 && r.rows <= ARRAY_GRID.rows).toBe(true);
          expect(r.cols >= 2 && r.cols <= ARRAY_GRID.cols).toBe(true);
        }
      }
      if (band === 3) expect(new Set(rounds.map((r) => (r.kind === 'array' ? `${r.rows}x${r.cols}` : ''))).size).toBe(ROUNDS);
    }
  });

  it('accepts any arrangement of the right amount, and exact arrays only', () => {
    const frame = { kind: 'frame', n: 7, frames: 1 } as const;
    expect(isExact(frame, { cells: new Set([0, 1, 2, 3, 4, 5, 6]), array: null })).toBe(true);
    expect(isExact(frame, { cells: new Set([9, 8, 7, 6, 5, 4, 3]), array: null })).toBe(true);
    expect(isExact(frame, { cells: new Set([0, 1, 2]), array: null })).toBe(false);
    const arr = { kind: 'array', rows: 3, cols: 4 } as const;
    expect(isExact(arr, { cells: new Set(), array: { rows: 3, cols: 4 } })).toBe(true);
    expect(isExact(arr, { cells: new Set(), array: { rows: 4, cols: 3 } })).toBe(false);
    expect(isExact(arr, { cells: new Set(), array: null })).toBe(false);
  });
});
