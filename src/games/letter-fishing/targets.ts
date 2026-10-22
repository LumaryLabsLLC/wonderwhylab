import type { Band } from '../types';
import { pick, shuffle } from '../../lib/random';
import { ALPHABET, WORDS, wordsOfLength } from '../reading/words';

export type TargetKind = 'letter' | 'lower' | 'picture' | 'spell';

export interface Target {
  kind: TargetKind;
  /** What the goal line shows: a letter, a capital, an emoji, or the word to spell. */
  show: string;
  /** Picture to show next to a word (bands 2–3). */
  emoji?: string;
  /** The word behind a picture or spelling target. */
  word?: string;
  /** Letters to catch, in order (one letter, except when spelling). */
  answers: string[];
  /** Letters the other fish carry — never one of the answers. */
  decoys: string[];
}

/** Right catches before the target changes (spelling changes when the word is done). */
export const CATCHES_PER_TARGET: Record<Band, number> = { 0: 3, 1: 3, 2: 1, 3: Infinity };

function decoysFor(answers: string[], upper: boolean, count = 3): string[] {
  const avoid = new Set(answers.map((a) => a.toLowerCase()));
  return shuffle(ALPHABET.filter((l) => !avoid.has(l)))
    .slice(0, count)
    .map((l) => (upper ? l.toUpperCase() : l));
}

export function makeTarget(band: Band, avoid?: string): Target {
  if (band === 0) {
    const letter = pick(ALPHABET.filter((l) => l !== avoid)).toUpperCase();
    return { kind: 'letter', show: letter, answers: [letter], decoys: decoysFor([letter], true) };
  }
  if (band === 1) {
    const letter = pick(ALPHABET.filter((l) => l !== avoid));
    return { kind: 'lower', show: letter.toUpperCase(), answers: [letter], decoys: decoysFor([letter], false) };
  }
  if (band === 2) {
    const w = pick(WORDS.filter((x) => x.word !== avoid));
    return { kind: 'picture', show: w.emoji, emoji: w.emoji, word: w.word, answers: [w.word[0]], decoys: decoysFor([w.word[0]], false) };
  }
  const w = pick(wordsOfLength(3, 4).filter((x) => x.word !== avoid));
  const letters = w.word.split('');
  return { kind: 'spell', show: w.word, emoji: w.emoji, word: w.word, answers: letters, decoys: decoysFor(letters, false) };
}
