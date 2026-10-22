import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { makeBoard, phrase, plural } from './board';

describe('read and match boards', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i boards are solvable and unambiguous', (band) => {
    for (let i = 0; i < 500; i++) {
      const b = makeBoard(band);
      const expected = band === 2 ? 4 : 3;
      expect(b.pairs.length).toBe(expected);
      const keys = b.pairs.map((p) => p.key);
      const texts = b.pairs.map((p) => p.text);
      expect(new Set(keys).size).toBe(keys.length);
      expect(new Set(texts).size).toBe(texts.length);
      // Every card belongs to exactly one picture.
      expect(b.cards.map((c) => c.key).sort()).toEqual([...keys].sort());
      for (const p of b.pairs) {
        expect(p.emoji).not.toBe('❓');
        if (band === 0) expect(p.text.length).toBe(3);
        if (band === 1) expect(p.text.length).toBe(4);
        if (band === 3) {
          expect(p.count).toBeGreaterThanOrEqual(1);
          expect(p.count).toBeLessThanOrEqual(3);
          expect(p.text.split(' ')[0]).toBe(['one', 'two', 'three'][p.count - 1]);
        } else {
          expect(p.count).toBe(1);
        }
      }
    }
  });

  it('writes counting phrases with correct plurals', () => {
    expect(phrase('cat', 1)).toBe('one cat');
    expect(phrase('cat', 2)).toBe('two cats');
    expect(phrase('fish', 3)).toBe('three fish');
    expect(phrase('mouse', 2)).toBe('two mice');
    expect(plural('box')).toBe('boxes');
    expect(plural('bus')).toBe('buses');
    expect(plural('leaf')).toBe('leaves');
    expect(plural('key')).toBe('keys');
  });
});
