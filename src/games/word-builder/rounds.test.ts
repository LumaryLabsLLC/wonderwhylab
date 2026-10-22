import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { makeRounds, ROUNDS } from './rounds';

const BANDS: Band[] = [0, 1, 2, 3];
const sorted = (letters: string[]) => [...letters].sort().join('');

describe('Word Builder rounds', () => {
  it.each(BANDS)('band %i: the tiles always spell the word, and extras never fit', (band) => {
    for (let n = 0; n < 300; n++) {
      const rounds = makeRounds(band);
      expect(rounds).toHaveLength(ROUNDS);
      expect(new Set(rounds.map((r) => r.word)).size).toBe(ROUNDS);
      for (const r of rounds) {
        const where = `${r.word}: [${r.tiles}]`;
        expect(r.emoji, where).not.toBe('❓');
        expect(r.prefilled, where).toBe(band === 0 ? 1 : 0);
        const missing = r.word.slice(r.prefilled).split('');
        expect(sorted(r.tiles), where).toBe(sorted([...missing, ...r.extras]));
        for (const x of r.extras) expect(r.word.includes(x), where).toBe(false);
        if (band === 0) expect(r.extras.length, where).toBe(1);
        else if (band === 3) expect(r.extras.length, where).toBe(2);
        else expect([1, 2], where).toContain(r.extras.length);
        if (band <= 1) expect(r.word.length, where).toBe(3);
        if (band === 2) expect(r.word.length >= 4 && r.word.length <= 5, where).toBe(true);
        if (band === 3) expect(r.word.length >= 5 && r.word.length <= 8, where).toBe(true);
      }
    }
  });
});
