import type { Band } from '../types';
import { ALPHABET, WORDS } from '../reading/words';
import { shuffle } from '../../lib/random';

export type Mode = 'start' | 'end' | 'blend';

export interface Round {
  word: string;
  emoji: string;
  mode: Mode;
  /** The sound to find: a letter ("b") or a blend ("sh"). */
  answer: string;
  /** Bucket labels, shuffled; contains `answer` exactly once. */
  options: string[];
}

export const ROUNDS = 10;

/** Two-letter starts for band 3 (each one starts at least one picture word). */
export const BLENDS = ['sh', 'ch', 'tr', 'fr', 'cl', 'br', 'dr', 'sp', 'st', 'sn', 'gr', 'wh'];

/** Letters that look or sound alike: never offered together to the youngest children. */
const CONFUSABLE: string[][] = [
  ['b', 'd', 'p', 'q'],
  ['m', 'n', 'u', 'w'],
  ['c', 'k', 's', 'q', 'x'],
  ['g', 'j', 'q'],
  ['i', 'l', 'j', 't'],
  ['f', 'v'],
];

/** Look-alike letter families for band 2: the other two letters become the distractors. */
export const LOOKALIKES: string[][] = [
  ['b', 'd', 'p'],
  ['m', 'n', 'h'],
  ['c', 'o', 'e'],
  ['f', 't', 'l'],
  ['g', 'q', 'y'],
];

/** Words whose first sound is not their first letter's usual sound (ch, sh, wh, th). */
const DIGRAPH_START = /^(ch|sh|wh|th)/;

/** Words that end in a clear consonant sound (not a silent e, a vowel, or sh/ch/th/ng). */
function endsClearly(word: string) {
  return !/[aeiouwy]$/.test(word) && !/(sh|ch|th|ng)$/.test(word);
}

function confusable(a: string, b: string) {
  return CONFUSABLE.some((group) => group.includes(a) && group.includes(b));
}

/** `count` distinct letters that are not `answer` and pass `ok`. */
function otherLetters(answer: string, count: number, ok: (l: string) => boolean): string[] {
  return shuffle(ALPHABET.filter((l) => l !== answer && ok(l))).slice(0, count);
}

const letterPool = (band: Band) =>
  WORDS.filter((w) => !DIGRAPH_START.test(w.word) && (band > 0 || w.word.length <= 5));

const lookalikePool = () =>
  WORDS.filter((w) => !DIGRAPH_START.test(w.word) && LOOKALIKES.some((g) => g.includes(w.word[0])));

const blendPool = () => WORDS.filter((w) => BLENDS.some((b) => w.word.startsWith(b)));
const endPool = () => WORDS.filter((w) => endsClearly(w.word));

function startRound(word: string, emoji: string, band: Band): Round {
  const answer = word[0];
  let distractors: string[];
  if (band === 2) {
    distractors = LOOKALIKES.find((g) => g.includes(answer))!.filter((l) => l !== answer);
  } else {
    distractors = otherLetters(answer, band === 0 ? 1 : 2, (l) => !confusable(l, answer) && !'aeiou'.includes(l));
  }
  return { word, emoji, mode: 'start', answer, options: shuffle([answer, ...distractors]) };
}

function blendRound(word: string, emoji: string): Round {
  const answer = BLENDS.find((b) => word.startsWith(b))!;
  const distractors = shuffle(BLENDS.filter((b) => b !== answer && !word.startsWith(b))).slice(0, 2);
  return { word, emoji, mode: 'blend', answer, options: shuffle([answer, ...distractors]) };
}

function endRound(word: string, emoji: string): Round {
  const answer = word[word.length - 1];
  // The first letter is a tempting wrong answer; add one more clear letter.
  const first = word[0] !== answer && !confusable(word[0], answer) ? [word[0]] : [];
  const used = new Set([answer, ...first]);
  const more = otherLetters(answer, 2 - first.length, (l) => !used.has(l) && !confusable(l, answer) && !'aeiou'.includes(l));
  return { word, emoji, mode: 'end', answer, options: shuffle([answer, ...first, ...more]) };
}

/** Ten rounds with ten different pictures. */
export function makeRounds(band: Band): Round[] {
  if (band === 3) {
    // Mix "starts with a blend" and "ends with" pictures.
    const blends = shuffle(blendPool()).slice(0, ROUNDS / 2);
    const taken = new Set(blends.map((w) => w.word));
    const ends = shuffle(endPool().filter((w) => !taken.has(w.word))).slice(0, ROUNDS / 2);
    return shuffle([...blends.map((w) => blendRound(w.word, w.emoji)), ...ends.map((w) => endRound(w.word, w.emoji))]);
  }
  const pool = band === 2 ? lookalikePool() : letterPool(band);
  return shuffle(pool)
    .slice(0, ROUNDS)
    .map((w) => startRound(w.word, w.emoji, band));
}

/** "Bb" for little ones, "b" or "sh" for older children. */
export function bucketLabel(sound: string, band: Band) {
  return band <= 1 ? `${sound.toUpperCase()}${sound}` : sound;
}

export const goalFor = (round: Round) =>
  round.mode === 'end' ? 'What sound does it end with?' : round.mode === 'blend' ? 'What sound does it start with?' : 'What does it start with?';
