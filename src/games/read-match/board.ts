import type { Band } from '../types';
import { pick, rand, shuffle } from '../../lib/random';
import { WORDS, pictureFor, wordsOfLength } from '../reading/words';

/** One picture and the card that belongs on it. */
export interface Pair {
  /** Unique within a board; links a card to its picture. */
  key: string;
  /** Text printed on the card (and spoken by the picture's speaker button). */
  text: string;
  emoji: string;
  /** How many copies of the emoji the picture shows (1 except in band 3). */
  count: number;
}

export interface Board {
  pairs: Pair[];
  /** The card pile, in a jumbled order, each with a small tilt. */
  cards: { key: string; text: string; tilt: number }[];
}

export const BOARDS = 6;

// Things you wouldn't count in ones ("two milks"), or that are already plural.
const UNCOUNTABLE = new Set(['milk', 'bread', 'corn', 'grapes', 'sun']);
const IRREGULAR: Record<string, string> = { fish: 'fish', sheep: 'sheep', mouse: 'mice', leaf: 'leaves' };
const NUMBER_WORDS = ['', 'one', 'two', 'three'];

export function plural(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

export function phrase(word: string, count: number): string {
  return `${NUMBER_WORDS[count]} ${count === 1 ? word : plural(word)}`;
}

/** How alike two words look: shared first/last letters and length make a good decoy. */
function likeness(a: string, b: string): number {
  let score = 0;
  if (a[0] === b[0]) score += 2;
  if (a[a.length - 1] === b[b.length - 1]) score += 1;
  if (a.length === b.length) score += 1;
  for (const ch of new Set(a)) if (b.includes(ch)) score += 0.5;
  return score;
}

function pairsFor(band: Band): Pair[] {
  if (band === 0 || band === 1) {
    const pool = wordsOfLength(band === 0 ? 3 : 4);
    return shuffle(pool)
      .slice(0, 3)
      .map((w) => ({ key: w.word, text: w.word, emoji: w.emoji, count: 1 }));
  }
  if (band === 2) {
    // Four words that look alike, so the child has to read every letter.
    const pool = wordsOfLength(3, 5);
    const seed = pick(pool);
    const others = pool
      .filter((w) => w.word !== seed.word)
      .map((w) => ({ w, score: likeness(seed.word, w.word) + Math.random() * 1.5 }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map((x) => x.w);
    return shuffle([seed, ...others]).map((w) => ({ key: w.word, text: w.word, emoji: w.emoji, count: 1 }));
  }
  // Band 3: counting phrases. Sometimes the same thing appears twice with different counts.
  const nouns = shuffle(WORDS.filter((w) => !UNCOUNTABLE.has(w.word) && w.word.length <= 6));
  const used = new Set<string>();
  const pairs: Pair[] = [];
  const twin = Math.random() < 0.6;
  const first = nouns[0];
  const counts = shuffle([1, 2, 3]);
  const plan: { word: string; count: number }[] = twin
    ? [
        { word: first.word, count: counts[0] },
        { word: first.word, count: counts[1] },
        { word: nouns[1].word, count: rand(1, 3) },
      ]
    : [0, 1, 2].map((i) => ({ word: nouns[i].word, count: rand(1, 3) }));
  for (const { word, count } of plan) {
    const key = `${word}-${count}`;
    if (used.has(key)) continue;
    used.add(key);
    pairs.push({ key, text: phrase(word, count), emoji: pictureFor(word), count });
  }
  return shuffle(pairs);
}

export function makeBoard(band: Band): Board {
  const pairs = pairsFor(band);
  const cards = shuffle(pairs).map((p) => ({ key: p.key, text: p.text, tilt: rand(-5, 5) }));
  return { pairs, cards };
}
