import { describe, expect, it } from 'vitest';
import { makeRound } from './index';
import type { Band } from '../types';

describe('feed the monster rounds', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i: every order can be built from the food on offer', (band) => {
    for (let i = 0; i < 1000; i++) {
      const r = makeRound(band);
      const where = `${r.ask} (need ${r.need}, supply ${r.supply})`;
      expect(r.need, where).toBeGreaterThanOrEqual(1);
      expect(r.need, where).toBeLessThanOrEqual(r.supply);
      expect(Number.isInteger(r.need) && Number.isInteger(r.supply) && Number.isInteger(r.fixed), where).toBe(true);
      // The pieces that solve the order really make the number the monster asked for.
      if (r.kind === 'slice') {
        expect(r.supply, where).toBe(r.den);
        expect(r.need, where).toBeLessThan(r.den);
        expect(Math.abs(r.need / r.den - r.target), where).toBeLessThan(1e-9);
      } else {
        expect(r.fixed + r.need * r.unit, where).toBe(r.target);
      }
      // There is always at least one spare piece, so the child has to count rather than take everything.
      if (band !== 3) expect(r.supply, where).toBeGreaterThan(r.need);
    }
  });

  it('band 3 asks are written correctly for the value', () => {
    for (let i = 0; i < 1000; i++) {
      const r = makeRound(3);
      const amount = r.ask.replace(/^I want /, '').replace(/ of a pizza!$/, '');
      const value = amount.endsWith('%') ? Number(amount.slice(0, -1)) / 100 : amount.includes('/') ? Number(amount.split('/')[0]) / Number(amount.split('/')[1]) : Number(amount);
      expect(Math.abs(value - r.target), r.ask).toBeLessThan(1e-9);
    }
  });
});
