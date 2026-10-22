import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { makeRounds, PHONEMES, ROUNDS, wordsFor } from './rounds';

const BANDS: Band[] = [0, 1, 2, 3];

describe('Sound It Out rounds', () => {
  it.each(BANDS)('band %i: every word has a picture and sounds that spell it', (band) => {
    for (const { word, sounds } of wordsFor(band)) {
      expect(sounds.join(''), word).toBe(word);
      for (const s of sounds) expect(PHONEMES[s], `${word}: no sound for "${s}"`).toBeTruthy();
    }
  });

  it.each(BANDS)('band %i: rounds have one right picture among different ones', (band) => {
    for (let n = 0; n < 300; n++) {
      const rounds = makeRounds(band);
      expect(rounds).toHaveLength(ROUNDS);
      expect(new Set(rounds.map((r) => r.word)).size).toBe(ROUNDS);
      for (const r of rounds) {
        const where = `${r.word}: ${r.options.map((o) => o.word)}`;
        expect(r.emoji, where).not.toBe('❓');
        expect(r.options.length, where).toBe(band === 0 ? 2 : 3);
        expect(r.options.filter((o) => o.word === r.word).length, where).toBe(1);
        expect(new Set(r.options.map((o) => o.word)).size, where).toBe(r.options.length);
        expect(new Set(r.options.map((o) => o.emoji)).size, where).toBe(r.options.length);
        for (const o of r.options) expect(o.emoji, where).not.toBe('❓');
      }
    }
  });

  it('starts band 0 words with a sound you can stretch', () => {
    for (const { word } of wordsFor(0)) expect('mslfnr', word).toContain(word[0]);
  });
});
