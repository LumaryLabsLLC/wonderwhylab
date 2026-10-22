import { PHONEMES, pictureOf } from '../../../games/sound-it-out/rounds';
import { RHYMES } from '../../../games/reading/words';
import { pick, shuffle } from '../../../lib/random';

/**
 * Word lists for the Sound Explorers lessons (ages 4–5).
 * Every word has a picture, and every sound split is a true one-sound-per-box split.
 */

/** Pictures for words that aren't in the shared reading lists. */
const MORE_PICTURES: Record<string, string> = {
  banana: '🍌',
  butterfly: '🦋',
  elephant: '🐘',
  dinosaur: '🦕',
  tomato: '🍅',
  potato: '🥔',
  ladybug: '🐞',
  pineapple: '🍍',
  strawberry: '🍓',
  crocodile: '🐊',
  gorilla: '🦍',
  kangaroo: '🦘',
  monkey: '🐒',
  pencil: '✏️',
  rocket: '🚀',
  carrot: '🥕',
  cookie: '🍪',
  turtle: '🐢',
  penguin: '🐧',
  rainbow: '🌈',
  panda: '🐼',
  chicken: '🐔',
  cactus: '🌵',
  pan: '🍳',
  pin: '📌',
  cap: '🧢',
  can: '🥫',
};

export function pic(word: string): string {
  return MORE_PICTURES[word] ?? pictureOf(word);
}

/** Extra sounds for spellings the shared map doesn't cover. */
const MORE_SOUNDS: Record<string, string> = {
  gg: 'guh',
  ee: 'eee',
  ey: 'eee',
  ow: 'ow',
  ar: 'ar',
  oo: 'oo',
  oa: 'oh',
};

/** How a sound (a letter or letter group) is said aloud, e.g. "m" → "mmm". */
export function soundOf(grapheme: string): string {
  return MORE_SOUNDS[grapheme] ?? PHONEMES[grapheme] ?? grapheme;
}

/** "sss – uh – nnn" */
export function sayParts(parts: string[]): string {
  return parts.map(soundOf).join(' – ');
}

// ───────────────────────── Rhymes ─────────────────────────

/** The shared ending sound of each rhyme family, keyed by the family's first word. */
const RIMES: Record<string, string> = {
  cat: '-at',
  dog: '-og',
  bee: '“ee”',
  cake: '-ake',
  moon: '-oon',
  sock: '-ock',
  boat: '-oat',
  bear: '“air”',
  mouse: '-ouse',
  star: '“ar”',
};

export interface RhymeFamily {
  rime: string;
  words: string[];
}

export const RHYME_FAMILIES: RhymeFamily[] = RHYMES.map((words) => ({ words, rime: RIMES[words[0]] ?? 'the same sound' }));

export function familyOf(word: string): RhymeFamily {
  return RHYME_FAMILIES.find((f) => f.words.includes(word))!;
}

// ───────────────────────── Syllables ─────────────────────────

export const SYLLABLES: string[][] = [
  ['cat'], ['dog'], ['sun'], ['fish'], ['frog'], ['duck'], ['star'], ['moon'], ['bee'], ['car'], ['ball'], ['bear'],
  ['cake'], ['tree'], ['house'], ['horse'], ['sheep'], ['snake'], ['train'], ['clock'], ['whale'], ['mouse'], ['spoon'],
  ['ap', 'ple'], ['lem', 'on'], ['piz', 'za'], ['rab', 'bit'], ['ro', 'bot'], ['ti', 'ger'], ['ze', 'bra'], ['mon', 'key'],
  ['pen', 'cil'], ['rock', 'et'], ['car', 'rot'], ['cook', 'ie'], ['tur', 'tle'], ['pen', 'guin'], ['rain', 'bow'],
  ['pan', 'da'], ['chick', 'en'], ['cac', 'tus'], ['li', 'on'],
  ['ba', 'na', 'na'], ['but', 'ter', 'fly'], ['el', 'e', 'phant'], ['di', 'no', 'saur'], ['to', 'ma', 'to'],
  ['po', 'ta', 'to'], ['la', 'dy', 'bug'], ['pine', 'ap', 'ple'], ['straw', 'ber', 'ry'], ['croc', 'o', 'dile'],
  ['go', 'ril', 'la'], ['kan', 'ga', 'roo'], ['oc', 'to', 'pus'], ['um', 'brel', 'la'],
];

export const wordOf = (syl: string[]) => syl.join('');

export function syllableWords(maxBeats: number): string[][] {
  return SYLLABLES.filter((s) => s.length <= maxBeats);
}

// ───────────────────────── First sounds ─────────────────────────

/** Words whose first sound is simply their first letter's sound (no sh/ch/th/wh, no "owl"). */
export const FIRST_SOUND_WORDS = [
  'ant', 'apple', 'bat', 'bed', 'bee', 'box', 'bus', 'ball', 'bear', 'book', 'car', 'cat', 'cow', 'cake', 'corn', 'cup',
  'dog', 'duck', 'drum', 'egg', 'fish', 'frog', 'fox', 'goat', 'grapes', 'hat', 'horse', 'house', 'key', 'kite',
  'log', 'leaf', 'lion', 'lemon', 'map', 'moon', 'milk', 'mouse', 'nut', 'net', 'octopus', 'pig', 'pen', 'pear', 'pizza',
  'rock', 'ring', 'robot', 'rabbit', 'sun', 'sock', 'star', 'snake', 'spoon', 'tree', 'train', 'truck', 'tiger',
  'umbrella', 'van', 'web', 'zebra',
].filter((w) => pic(w) !== '❓');

/** The letter whose sound starts the word. */
export const firstLetter = (word: string) => word[0];

/** c and k make the same /k/ sound here, so never offer both as different answers. */
export function sameSound(a: string, b: string): boolean {
  const norm = (l: string) => (l === 'k' ? 'c' : l);
  return norm(a) === norm(b);
}

/** Letters used for first-sound practice (each says one clear sound). */
export const SOUND_LETTERS = 'abcdefghklmnoprstuvwz'.split('').filter((l) => FIRST_SOUND_WORDS.some((w) => w[0] === l));

/** `count` letters with different sounds, always including `must` if given. */
export function distinctLetters(count: number, must?: string): string[] {
  const out: string[] = must ? [must] : [];
  for (const l of shuffle(SOUND_LETTERS)) {
    if (out.length >= count) break;
    if (out.some((o) => sameSound(o, l))) continue;
    out.push(l);
  }
  return out;
}

/** Words that start with this exact letter (and so with its sound). */
export function wordsStartingWith(letter: string): string[] {
  return FIRST_SOUND_WORDS.filter((w) => w[0] === letter);
}

// ───────────────────────── Letters ─────────────────────────

/** Letters with one clear sound (q and x are left out). */
export const LETTERS = 'abcdefghijklmnoprstuvwyz'.split('');

/** Small letters that are easy to mix up, grouped (the first is the "target"). */
export const LOOKALIKES: string[][] = [
  ['b', 'd', 'p'],
  ['d', 'b', 'p'],
  ['p', 'b', 'd'],
  ['m', 'n', 'w'],
  ['n', 'm', 'u'],
  ['u', 'n', 'v'],
  ['h', 'n', 'r'],
];

// ───────────────────────── Blending and sound boxes ─────────────────────────

export interface SoundWord {
  word: string;
  /** One entry per sound, written as the letters that spell it. */
  parts: string[];
}

const split = (spec: string): SoundWord => {
  const parts = spec.split(' ');
  return { word: parts.join(''), parts };
};

/** Short words to blend, starting with stretchy sounds that are easiest to blend. */
export const BLEND_EASY = ['s u n', 'm a p', 'n u t', 'l o g', 'r a t', 'm a n', 'n e t', 'f i sh'].map(split);
export const BLEND_MORE = ['b a t', 'b e d', 'b u s', 'c a t', 'd o g', 'h a t', 'p e n', 'p i g', 'v a n', 'w e b', 'b u g', 'b a g'].map(split);
/** Sets of words that differ by just one sound, for careful listening. */
export const BLEND_SETS: string[][] = [
  ['cat', 'cap', 'can'],
  ['pan', 'pen', 'pin'],
  ['bug', 'bus', 'bag'],
  ['pig', 'pin', 'pen'],
  ['hat', 'bat', 'cat'],
];
export const BLEND_ALL = [...BLEND_EASY, ...BLEND_MORE, ...['c a p', 'c a n', 'p a n', 'p i n'].map(split)];

export function blendWord(word: string): SoundWord {
  return BLEND_ALL.find((w) => w.word === word) ?? { word, parts: word.split('') };
}

/** Elkonin box words, by number of sounds. */
export const TWO_SOUNDS = ['e gg', 'b ee', 'k ey', 'c ow', 'c ar'].map(split);
export const THREE_SOUNDS = ['s u n', 'm a p', 'n u t', 'c a t', 'd o g', 'h a t', 'p e n', 'p i g', 'b u s', 'b e d', 'w e b', 'v a n'].map(split);
/** Three sounds but more than three letters: two letters can make one sound. */
export const THREE_SOUNDS_TRICKY = ['f i sh', 'sh i p', 'd u ck', 's o ck', 'b e ll', 'm oo n', 'b oa t', 'g oa t'].map(split);
export const FOUR_SOUNDS = ['f r o g', 'd r u m', 'm i l k', 'c r a b', 'f l a g', 'h a n d', 't e n t', 'g i f t'].map(split);

export { pick, shuffle };
