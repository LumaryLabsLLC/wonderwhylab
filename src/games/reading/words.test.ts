import { describe, expect, it } from 'vitest';
import { ALPHABET, CVC, RHYMES, WORDS } from './words';

describe('reading word list', () => {
  const known = new Set(WORDS.map((w) => w.word));

  it('has unique words, each with a picture', () => {
    expect(known.size).toBe(WORDS.length);
    for (const w of WORDS) expect(w.emoji.length, w.word).toBeGreaterThan(0);
  });

  it('only uses known words in rhymes and CVC lists', () => {
    for (const family of RHYMES) for (const w of family) expect(known.has(w), w).toBe(true);
    for (const w of CVC) expect(known.has(w), w).toBe(true);
  });

  it('has the whole alphabet', () => {
    expect(ALPHABET.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
  });
});
