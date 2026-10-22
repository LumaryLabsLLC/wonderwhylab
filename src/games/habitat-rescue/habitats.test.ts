import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { ANIMALS, boardsFor, DESIGN_FEATURES, FEATURES, homeOn, makeRound, ROUND, wrongReaction } from './habitats';

const byId = (id: string) => ANIMALS.find((a) => a.id === id)!;

describe('habitat rescue rounds', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i: every card has exactly one right habitat on its board', (band) => {
    const size = [[2], [3], [4], [4, 5]][band];
    for (let i = 0; i < 400; i++) {
      const { board, cards } = makeRound(band);
      expect(size).toContain(board.length);
      expect(new Set(board).size).toBe(board.length);
      expect(board.includes('wetland')).toBe(band === 3);
      expect(cards).toHaveLength(ROUND);
      expect(new Set(cards.map((c) => c.id)).size).toBe(ROUND);
      // No two cards in a round share a picture (arctic fox vs fennec fox).
      const pictures = cards.filter((c) => c.glyph).map((c) => `${c.glyph}${c.white ? 'w' : ''}`);
      expect(new Set(pictures).size).toBe(pictures.length);
      for (const c of cards) {
        expect(c.kind).toBe(band <= 1 ? 'animal' : 'feature');
        expect(c.homes.filter((h) => board.includes(h))).toHaveLength(1);
      }
      // Every habitat on the board gets at least one visitor.
      for (const h of board) expect(cards.some((c) => homeOn(c, board) === h)).toBe(true);
    }
  });

  it('has boards for every band, including the classic ocean vs snow & ice', () => {
    for (const band of [0, 1, 2, 3] as Band[]) expect(boardsFor(band).length).toBeGreaterThan(0);
    expect(boardsFor(0).some((b) => b.includes('ocean') && b.includes('polar'))).toBe(true);
  });

  it('ages 10–12 cards are words only; younger cards all have pictures', () => {
    for (const c of DESIGN_FEATURES) expect(c.glyph).toBe('');
    for (const c of [...ANIMALS, ...FEATURES]) {
      expect(c.glyph.length).toBeGreaterThan(0);
      expect(c.glyph).not.toContain('‍'); // no ZWJ sequences (Unicode 13+ polar bear etc.)
    }
    for (const c of [...ANIMALS, ...FEATURES, ...DESIGN_FEATURES]) expect(c.fact).toMatch(/\.$/);
  });

  it('reacts to the wrong habitat in a way that matches the science', () => {
    expect(wrongReaction(byId('camel'), 'desert', 'polar')).toEqual({ reaction: 'shiver', line: 'Brrr! Too cold here. Camels live in the desert.' });
    expect(wrongReaction(byId('polar-bear'), 'polar', 'desert').reaction).toBe('sweat');
    expect(wrongReaction(byId('polar-bear'), 'polar', 'ocean').reaction).toBe('sweat');
    expect(wrongReaction(byId('dolphin'), 'ocean', 'grassland').reaction).toBe('flop');
    expect(wrongReaction(byId('lion'), 'grassland', 'ocean').reaction).toBe('splash');
    expect(wrongReaction(byId('monkey'), 'rainforest', 'grassland').reaction).toBe('unsure');
    expect(wrongReaction(byId('frog'), 'rainforest', 'desert').line).toBe('Phew! Too hot and dry here. Some frogs live in the rainforest.');
  });
});
