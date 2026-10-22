import type { Band } from '../types';
import { pictureFor } from '../reading/words';
import { shuffle } from '../../lib/random';

/**
 * Decodable picture words, written as their sounds (one tile per sound), e.g. "d u ck".
 * Only regular spellings: no silent letters or vowel teams, so every word can be blended.
 */
const BANDS: Record<Band, string[]> = {
  // Short words that start with a sound you can stretch (m, s, f, l, n, r).
  0: ['s u n', 'l o g', 'm a p', 'n u t', 'f o x', 'r a t', 's i x', 'r a m', 'm a n', 'n e t'],
  // Any consonant–vowel–consonant word.
  1: ['b a t', 'b e d', 'b o x', 'b u s', 'c a t', 'd o g', 'h a t', 'p e n', 'p i g', 'v a n', 'w e b', 'b u g', 't e n', 'b a g'],
  // Four sounds with a blend; "ck" and "ll" are one sound each.
  2: ['f r o g', 'd r u m', 'm i l k', 'd u ck', 's o ck', 'r o ck', 'f l a g', 'c r a b', 'p l u g', 'g i f t', 'h a n d', 't e n t', 'b e ll'],
  // Digraphs (sh, ch, th) as single sounds, and longer blends.
  3: ['sh i p', 'f i sh', 'ch i ck', 'sh e ll', 'b a th', 'b r i ck', 't r u ck', 'c l o ck', 's l o th', 'sh r i m p'],
};

/** Pictures for words that aren't in the shared reading list. */
const EXTRA_PICTURES: Record<string, string> = {
  rat: '🐀',
  six: '6️⃣',
  ram: '🐏',
  man: '👨',
  net: '🥅',
  bug: '🐛',
  ten: '🔟',
  bag: '👜',
  flag: '🚩',
  crab: '🦀',
  plug: '🔌',
  gift: '🎁',
  hand: '✋',
  tent: '⛺',
  chick: '🐤',
  shell: '🐚',
  bath: '🛁',
  brick: '🧱',
  sloth: '🦥',
  shrimp: '🦐',
};

/** How each sound is said aloud: stretchy sounds are stretched, bouncy ones get a short "uh". */
export const PHONEMES: Record<string, string> = {
  a: 'ah',
  b: 'buh',
  c: 'kuh',
  k: 'kuh',
  d: 'duh',
  e: 'eh',
  f: 'fff',
  g: 'guh',
  h: 'huh',
  i: 'ih',
  j: 'juh',
  l: 'lll',
  m: 'mmm',
  n: 'nnn',
  o: 'aw',
  p: 'puh',
  r: 'rrr',
  s: 'sss',
  t: 'tuh',
  u: 'uh',
  v: 'vvv',
  w: 'wuh',
  x: 'ks',
  y: 'yuh',
  z: 'zzz',
  sh: 'shh',
  ch: 'chuh',
  th: 'thh',
  ck: 'kuh',
  ll: 'lll',
};

export interface SoundRound {
  word: string;
  sounds: string[];
  emoji: string;
  /** Pictures to choose from (the word itself plus 1–2 others), shuffled. */
  options: { word: string; emoji: string }[];
}

export const ROUNDS = 8;

export function pictureOf(word: string): string {
  return EXTRA_PICTURES[word] ?? pictureFor(word);
}

export function wordsFor(band: Band): { word: string; sounds: string[] }[] {
  return BANDS[band].map((spec) => {
    const sounds = spec.split(' ');
    return { word: sounds.join(''), sounds };
  });
}

export function makeRounds(band: Band): SoundRound[] {
  const pool = wordsFor(band);
  const pictures = band === 0 ? 2 : 3;
  return shuffle(pool)
    .slice(0, ROUNDS)
    .map(({ word, sounds }) => {
      const others = shuffle(pool.filter((w) => w.word !== word)).slice(0, pictures - 1);
      const options = shuffle([{ word, emoji: pictureOf(word) }, ...others.map((o) => ({ word: o.word, emoji: pictureOf(o.word) }))]);
      return { word, sounds, emoji: pictureOf(word), options };
    });
}
