import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { adapt, ROUNDS, cmp, eq, explain, fairCut, isFair, makeRound, PARTS, pizzaPieces, sandwichPieces, servings, sum, sumWorking } from './rounds';

const BANDS: Band[] = [0, 1, 2, 3];

describe('Fraction Café maths', () => {
  it('adds fractions exactly', () => {
    expect(eq(sum([{ n: 1, d: 2 }, { n: 1, d: 4 }]), { n: 3, d: 4 })).toBe(true);
    expect(eq(sum([{ n: 1, d: 3 }, { n: 1, d: 6 }]), { n: 1, d: 2 })).toBe(true);
    expect(sumWorking([{ n: 1, d: 2 }, { n: 1, d: 4 }])).toBe('1/2 + 1/4 = 2/4 + 1/4 = 3/4');
    expect(sumWorking([{ n: 1, d: 4 }, { n: 1, d: 4 }])).toBe('1/4 + 1/4 = 2/4 = 1/2');
  });

  it('cuts pizzas and sandwiches into the right pieces', () => {
    expect(pizzaPieces([0, 90]).map((p) => p.size)).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(pizzaPieces([0, 45]).map((p) => p.size)).toEqual([0.125, 0.375, 0.125, 0.375]);
    expect(sandwichPieces([2], [2]).map((p) => p.size)).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(sandwichPieces([1], []).map((p) => p.size)).toEqual([0.25, 0.75]);
    expect(isFair([0.5, 0.5])).toBe(true);
    expect(isFair([0.25, 0.75])).toBe(false);
    expect(isFair([1, 0])).toBe(false);
  });
});

describe.each(BANDS)('band %i rounds', (band) => {
  it('every order can be served and every explanation is sensible', () => {
    for (const tier of [0, 1, 2]) {
      for (let i = 0; i < 400; i++) {
        const r = makeRound(band, tier);
        const where = `band ${band} tier ${tier} ${JSON.stringify(r)}`;
        expect(explain(r).length, where).toBeGreaterThan(15);
        expect(explain(r), where).not.toMatch(/undefined|NaN/);
        if (band === 0) expect(r.kind, where).toBe('share');
        if (r.kind === 'share') {
          const cut = fairCut(r);
          const sizes = r.food === 'pizza' ? pizzaPieces(cut.pizza!).map((p) => p.size) : sandwichPieces(cut.v!, cut.h!).map((p) => p.size);
          expect(sizes.length, where).toBe(r.friends);
          expect(isFair(sizes), where).toBe(true);
        } else if (r.kind === 'serve') {
          expect(servings(r).length, `${where} has no way to serve it`).toBeGreaterThan(0);
          for (const s of r.stock) expect(PARTS[s] ?? (s === 1 ? 'whole' : undefined), where).toBeTruthy();
          if (band === 3) {
            expect(r.stock).toHaveLength(2);
            expect(r.stock[0], where).not.toBe(r.stock[1]);
          }
        } else {
          expect(band, where).toBe(2);
          expect(cmp(r.plates[0], r.plates[1]), `${where} plates must differ`).not.toBe(0);
        }
      }
    }
  });
});

describe('adaptation', () => {
  it('steps up after three clean orders and down after a miss', () => {
    let s = { tier: 0, streak: 0 };
    for (let i = 0; i < 3; i++) s = adapt(s.tier, s.streak, true);
    expect(s.tier).toBe(1);
    expect(adapt(1, 2, false)).toEqual({ tier: 0, streak: 0 });
  });

  it('a perfect session reaches the hardest level before it ends', () => {
    let s = { tier: 0, streak: 0 };
    const tiers: number[] = [];
    for (let i = 0; i < ROUNDS; i++) {
      tiers.push(s.tier);
      s = adapt(s.tier, s.streak, true);
    }
    expect(tiers).toContain(2);
  });
});
