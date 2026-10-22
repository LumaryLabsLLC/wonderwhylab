import type { Band } from '../types';
import { pick, rand, shuffle } from '../../lib/random';
import { RHYMES, WORDS } from '../reading/words';

export interface House {
  word: string;
}

export interface Card {
  id: string;
  word: string;
  /** Index of the house it rhymes with, or -1 for the "doesn't rhyme" bin. */
  house: number;
  tilt: number;
}

export interface Board {
  houses: House[];
  cards: Card[];
  /** Band 3 adds a bin for a word that rhymes with none of the houses. */
  bin: boolean;
  /** Cards show a picture as well as the word (younger bands). */
  pictures: boolean;
}

export const ROUNDS = 5;

const ending = (w: string) => w.slice(-2);

/** A word from the list that rhymes with none of the chosen families (and doesn't even end the same way). */
function decoyFor(families: string[][]): string {
  const taken = new Set(families.flat());
  const endings = new Set(families.flat().map(ending));
  const anyFamily = new Set(RHYMES.flat());
  const pool = WORDS.map((w) => w.word).filter((w) => !taken.has(w) && !endings.has(ending(w)) && w.length <= 6);
  // Prefer words that are not in any rhyme family, so there's no near-rhyme confusion.
  const safe = pool.filter((w) => !anyFamily.has(w));
  return pick(safe.length ? safe : pool);
}

export function makeBoard(band: Band): Board {
  const houseCount = band === 0 ? 2 : 3;
  const families = shuffle(RHYMES).slice(0, houseCount).map((f) => shuffle(f));
  const houses = families.map((f) => ({ word: f[0] }));
  const cards: Card[] = families.flatMap((f, house) => f.slice(1).map((word) => ({ id: word, word, house, tilt: rand(-5, 5) })));
  const bin = band === 3;
  if (bin) {
    const word = decoyFor(families);
    cards.push({ id: word, word, house: -1, tilt: rand(-5, 5) });
  }
  return { houses, cards: shuffle(cards), bin, pictures: band <= 1 };
}
