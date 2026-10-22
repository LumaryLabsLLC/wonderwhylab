import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { BLENDS, LOOKALIKES, makeRounds, ROUNDS } from './rounds';

const BANDS: Band[] = [0, 1, 2, 3];

describe('First Sounds rounds', () => {
  it.each(BANDS)('band %i: every round is solvable with exactly one right bucket', (band) => {
    for (let n = 0; n < 300; n++) {
      const rounds = makeRounds(band);
      expect(rounds).toHaveLength(ROUNDS);
      expect(new Set(rounds.map((r) => r.word)).size).toBe(ROUNDS);
      for (const r of rounds) {
        const where = `${r.word} (${r.mode}) → ${r.answer} in [${r.options}]`;
        expect(r.options.length, where).toBe(band === 0 ? 2 : 3);
        expect(new Set(r.options).size, where).toBe(r.options.length);
        expect(r.options.filter((o) => o === r.answer).length, where).toBe(1);
        const others = r.options.filter((o) => o !== r.answer);
        if (r.mode === 'end') {
          expect(r.word.endsWith(r.answer), where).toBe(true);
          for (const o of others) expect(r.word.endsWith(o), where).toBe(false);
        } else {
          expect(r.word.startsWith(r.answer), where).toBe(true);
          for (const o of others) expect(r.word.startsWith(o), where).toBe(false);
        }
        if (r.mode === 'blend') for (const o of r.options) expect(BLENDS, where).toContain(o);
        if (band === 2) expect(LOOKALIKES.some((g) => r.options.every((o) => g.includes(o))), where).toBe(true);
        if (band <= 2) expect(r.mode, where).toBe('start');
      }
    }
  });

  it('band 3 mixes start blends and end sounds', () => {
    const modes = new Set(makeRounds(3).map((r) => r.mode));
    expect(modes).toEqual(new Set(['blend', 'end']));
  });
});
