import { prefetchSpeech, speak } from '../../../lib/speech';

/**
 * Shared sound–letter data for the Word Builders (ages 6–7) lessons.
 * Sounds are taught as sounds: stretchy sounds are stretched ("mmm"), bouncy ones are kept short ("buh").
 * Spoken forms match the Sound It Out game so children hear one consistent voice for each sound.
 */
export const SOUND: Record<string, string> = {
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
  wh: 'wuh',
  ck: 'kuh',
  ll: 'lll',
  gg: 'guh',
  ss: 'sss',
};

/** Long vowels "say their name". */
export const LONG: Record<string, string> = { a: 'ay', e: 'ee', i: 'eye', o: 'oh', u: 'you' };

/** How a sound is written for children, e.g. /sh/. */
export const slash = (s: string) => `/${s}/`;

/** Say one sound (only ever called from a child's tap). */
export function saySound(spelling: string) {
  speak(SOUND[spelling] ?? spelling, { force: true });
}

/** Say each letter's sound in a group, e.g. a blend "fr" → "fff, rrr". */
export function sayLetters(letters: string) {
  speak(letters.split('').map((l) => SOUND[l] ?? l).join(', '), { force: true });
}

/** Say sounds one after another, then the whole word: "fff, rrr, aw, guh… frog". */
export function sayBlend(sounds: string[], word: string, spoken: Record<string, string> = SOUND) {
  speak(`${sounds.map((s) => spoken[s] ?? s).join(', ')}… ${word}`, { force: true });
}

/** Get sounds ready in the background so a tap plays instantly (never plays anything itself). */
export function prefetchSounds(texts: string[]) {
  for (const t of texts) prefetchSpeech(SOUND[t] ?? t);
}

export const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const;

/** Picture words for this module (emoji ≤ Unicode 12). */
export const PIC: Record<string, string> = {
  cat: '🐱',
  bag: '👜',
  bug: '🐛',
  pot: '🍲',
  pan: '🍳',
  pen: '🖊️',
  pin: '📌',
  ten: '🔟',
  bed: '🛏️',
  sun: '☀️',
  fox: '🦊',
  pig: '🐷',
  dog: '🐶',
  net: '🥅',
  nut: '🥜',
  hat: '🎩',
  map: '🗺️',
  frog: '🐸',
  crab: '🦀',
  flag: '🚩',
  clock: '🕐',
  truck: '🚚',
  plug: '🔌',
  drum: '🥁',
  stop: '🛑',
  sled: '🛷',
  swim: '🏊',
  ship: '🚢',
  shell: '🐚',
  fish: '🐟',
  dish: '🍽️',
  chick: '🐤',
  bath: '🛁',
  duck: '🦆',
  sock: '🧦',
  lock: '🔒',
  kite: '🪁',
  pine: '🌲',
  can: '🥫',
  cane: '🦯',
  cube: '🧊',
  note: '📝',
  plane: '✈️',
  cap: '🧢',
  box: '📦',
  hen: '🐔',
  egg: '🥚',
  bus: '🚌',
};
