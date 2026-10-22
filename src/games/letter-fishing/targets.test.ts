import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { makeTarget } from './targets';

describe('Letter Fishing targets', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i targets can always be caught', (band) => {
    for (let i = 0; i < 500; i++) {
      const t = makeTarget(band);
      expect(t.answers.length).toBeGreaterThan(0);
      for (const a of t.answers) expect(a).toMatch(band === 0 ? /^[A-Z]$/ : /^[a-z]$/);
      // Decoys are distinct letters that are never a right answer, so a catch is never ambiguous.
      expect(new Set(t.decoys).size).toBe(t.decoys.length);
      expect(t.decoys.length).toBeGreaterThanOrEqual(3);
      for (const d of t.decoys) expect(t.answers.map((a) => a.toLowerCase())).not.toContain(d.toLowerCase());
      if (band === 1) expect(t.show).toBe(t.answers[0].toUpperCase());
      if (band === 2) {
        expect(t.emoji).toBeTruthy();
        expect(t.answers).toEqual([t.word![0]]);
      }
      if (band === 3) expect(t.answers.join('')).toBe(t.word);
    }
  });
});
