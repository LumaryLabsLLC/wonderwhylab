import type { Band } from '../types';
import { ALPHABET, CVC, pictureFor, wordsOfLength } from '../reading/words';
import { rand, shuffle } from '../../lib/random';

export interface WordRound {
  word: string;
  emoji: string;
  /** How many letters at the start are already in place (band 0 gets the first letter). */
  prefilled: number;
  /** Tiles to build with: the missing letters plus distractors, shuffled. */
  tiles: string[];
  /** The distractor letters (none of them appear in the word). */
  extras: string[];
}

export const ROUNDS = 8;

function poolFor(band: Band): string[] {
  if (band <= 1) return CVC;
  if (band === 2) return wordsOfLength(4, 5).map((w) => w.word);
  return wordsOfLength(5, 8).map((w) => w.word);
}

function extraCount(band: Band) {
  if (band === 0) return 1;
  if (band === 3) return 2;
  return rand(1, 2);
}

/** Shuffle so the missing letters don't already read in order. */
function scramble(letters: string[], answer: string): string[] {
  let out = shuffle(letters);
  for (let i = 0; i < 6 && answer.length > 1 && out.join('').includes(answer); i++) out = shuffle(letters);
  return out;
}

export function makeRound(word: string, band: Band): WordRound {
  const prefilled = band === 0 ? 1 : 0;
  const missing = word.slice(prefilled).split('');
  const extras = shuffle(ALPHABET.filter((l) => !word.includes(l))).slice(0, extraCount(band));
  return { word, emoji: pictureFor(word), prefilled, tiles: scramble([...missing, ...extras], word.slice(prefilled)), extras };
}

/** Eight rounds, each a different word. */
export function makeRounds(band: Band): WordRound[] {
  return shuffle(poolFor(band))
    .slice(0, ROUNDS)
    .map((word) => makeRound(word, band));
}
