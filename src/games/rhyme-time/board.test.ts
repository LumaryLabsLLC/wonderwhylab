import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { RHYMES, WORDS } from '../reading/words';
import { makeBoard } from './board';

const familyOf = (w: string) => RHYMES.findIndex((f) => f.includes(w));
const known = new Set(WORDS.map((w) => w.word));

describe('rhyme time boards', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i boards are solvable and unambiguous', (band) => {
    for (let i = 0; i < 500; i++) {
      const b = makeBoard(band);
      expect(b.houses.length).toBe(band === 0 ? 2 : 3);
      expect(b.bin).toBe(band === 3);
      expect(b.pictures).toBe(band <= 1);
      const houseFamilies = b.houses.map((h) => familyOf(h.word));
      expect(new Set(houseFamilies).size).toBe(houseFamilies.length);
      const words = [...b.houses.map((h) => h.word), ...b.cards.map((c) => c.word)];
      expect(new Set(words).size).toBe(words.length);
      // Every house gets at least one card.
      b.houses.forEach((_, i) => expect(b.cards.some((c) => c.house === i)).toBe(true));
      for (const c of b.cards) {
        expect(known.has(c.word), c.word).toBe(true);
        // A card rhymes with exactly the house it belongs to, or with none of them for the bin.
        const matches = houseFamilies.filter((f) => f === familyOf(c.word) && f !== -1).length;
        if (c.house === -1) {
          expect(matches).toBe(0);
          expect(b.houses.some((h) => h.word.slice(-2) === c.word.slice(-2))).toBe(false);
        } else {
          expect(matches).toBe(1);
          expect(houseFamilies[c.house]).toBe(familyOf(c.word));
        }
      }
      if (band === 3) expect(b.cards.filter((c) => c.house === -1).length).toBe(1);
    }
  });
});
