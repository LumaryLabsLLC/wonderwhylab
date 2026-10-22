/**
 * Picture words for the reading games. Pictures are emoji (widely supported, Unicode 12 or older),
 * so every word has a recognisable image without shipping artwork.
 */
export interface PictureWord {
  word: string;
  emoji: string;
}

export const WORDS: PictureWord[] = [
  // 3 letters
  { word: 'ant', emoji: '🐜' },
  { word: 'bat', emoji: '🦇' },
  { word: 'bed', emoji: '🛏️' },
  { word: 'bee', emoji: '🐝' },
  { word: 'box', emoji: '📦' },
  { word: 'bus', emoji: '🚌' },
  { word: 'car', emoji: '🚗' },
  { word: 'cat', emoji: '🐱' },
  { word: 'cow', emoji: '🐮' },
  { word: 'dog', emoji: '🐶' },
  { word: 'egg', emoji: '🥚' },
  { word: 'fox', emoji: '🦊' },
  { word: 'hat', emoji: '🎩' },
  { word: 'key', emoji: '🔑' },
  { word: 'log', emoji: '🪵' },
  { word: 'map', emoji: '🗺️' },
  { word: 'nut', emoji: '🥜' },
  { word: 'owl', emoji: '🦉' },
  { word: 'pen', emoji: '🖊️' },
  { word: 'pig', emoji: '🐷' },
  { word: 'sun', emoji: '☀️' },
  { word: 'van', emoji: '🚐' },
  { word: 'web', emoji: '🕸️' },
  // 4 letters
  { word: 'ball', emoji: '⚽' },
  { word: 'bear', emoji: '🐻' },
  { word: 'bell', emoji: '🔔' },
  { word: 'boat', emoji: '⛵' },
  { word: 'book', emoji: '📖' },
  { word: 'cake', emoji: '🍰' },
  { word: 'coat', emoji: '🧥' },
  { word: 'corn', emoji: '🌽' },
  { word: 'drum', emoji: '🥁' },
  { word: 'duck', emoji: '🦆' },
  { word: 'fish', emoji: '🐟' },
  { word: 'frog', emoji: '🐸' },
  { word: 'goat', emoji: '🐐' },
  { word: 'kite', emoji: '🪁' },
  { word: 'leaf', emoji: '🍃' },
  { word: 'lion', emoji: '🦁' },
  { word: 'milk', emoji: '🥛' },
  { word: 'moon', emoji: '🌙' },
  { word: 'pear', emoji: '🍐' },
  { word: 'ring', emoji: '💍' },
  { word: 'rock', emoji: '🪨' },
  { word: 'ship', emoji: '🚢' },
  { word: 'sock', emoji: '🧦' },
  { word: 'star', emoji: '⭐' },
  { word: 'tree', emoji: '🌳' },
  // 5+ letters
  { word: 'apple', emoji: '🍎' },
  { word: 'bread', emoji: '🍞' },
  { word: 'chair', emoji: '🪑' },
  { word: 'clock', emoji: '🕐' },
  { word: 'cloud', emoji: '☁️' },
  { word: 'grapes', emoji: '🍇' },
  { word: 'heart', emoji: '❤️' },
  { word: 'horse', emoji: '🐴' },
  { word: 'house', emoji: '🏠' },
  { word: 'lemon', emoji: '🍋' },
  { word: 'mouse', emoji: '🐭' },
  { word: 'octopus', emoji: '🐙' },
  { word: 'pizza', emoji: '🍕' },
  { word: 'rabbit', emoji: '🐰' },
  { word: 'robot', emoji: '🤖' },
  { word: 'shark', emoji: '🦈' },
  { word: 'sheep', emoji: '🐑' },
  { word: 'snake', emoji: '🐍' },
  { word: 'spoon', emoji: '🥄' },
  { word: 'tiger', emoji: '🐯' },
  { word: 'train', emoji: '🚆' },
  { word: 'truck', emoji: '🚚' },
  { word: 'umbrella', emoji: '☂️' },
  { word: 'whale', emoji: '🐳' },
  { word: 'zebra', emoji: '🦓' },
];

/** Words that rhyme with each other (every word here is in WORDS). */
export const RHYMES: string[][] = [
  ['cat', 'hat', 'bat'],
  ['dog', 'frog', 'log'],
  ['bee', 'tree', 'key'],
  ['cake', 'snake'],
  ['moon', 'spoon'],
  ['sock', 'clock', 'rock'],
  ['boat', 'goat', 'coat'],
  ['bear', 'chair', 'pear'],
  ['mouse', 'house'],
  ['star', 'car'],
];

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Simple 3-letter words that sound out letter by letter (good for early readers). */
export const CVC = ['ant', 'bat', 'bed', 'box', 'bus', 'cat', 'dog', 'fox', 'hat', 'log', 'map', 'nut', 'pen', 'pig', 'sun', 'van', 'web'];

export function wordsOfLength(min: number, max = min): PictureWord[] {
  return WORDS.filter((w) => w.word.length >= min && w.word.length <= max);
}

export function wordsStartingWith(letter: string): PictureWord[] {
  return WORDS.filter((w) => w.word.startsWith(letter));
}

export function pictureFor(word: string): string {
  return WORDS.find((w) => w.word === word)?.emoji ?? '❓';
}

/** Font stack for drawing emoji pictures consistently. */
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
