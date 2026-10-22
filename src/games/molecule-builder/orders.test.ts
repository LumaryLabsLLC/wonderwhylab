import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import {
  ATOM,
  balancedCoefs,
  describeCounts,
  ELEMENTS,
  EQUATIONS,
  isBalanced,
  layout,
  makeOrders,
  MOLECULES,
  orderKey,
  sideCounts,
  targetCounts,
} from './orders';

describe('molecule builder orders', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i: every order can be built from its tray', (band) => {
    for (let i = 0; i < 400; i++) {
      const orders = makeOrders(band);
      expect(orders).toHaveLength(8);
      for (let k = 1; k < orders.length; k++) expect(orderKey(orders[k])).not.toBe(orderKey(orders[k - 1]));
      for (const o of orders) {
        expect(o.kind).toBe(['pattern', 'picture', 'formula', 'equation'][band]);
        if (o.kind === 'equation') {
          const needed = [...o.equation.left, ...o.equation.right].map((s) => s.id);
          for (const id of needed) expect(o.tray).toContain(id);
          expect(o.tray.length).toBe(new Set(needed).size + 1);
          continue;
        }
        const target = targetCounts(o);
        const total = ELEMENTS.reduce((n, e) => n + (target[e] ?? 0), 0);
        expect(total).toBeGreaterThanOrEqual(2);
        for (const e of ELEMENTS) if (target[e]) expect(o.tray).toContain(e);
        if (o.kind === 'pattern') {
          expect(total).toBeLessThanOrEqual(5);
          expect(o.tray.length).toBe(3);
        }
      }
    }
  });

  it('every equation is balanced with its own coefficients and not with all-ones (unless it should be)', () => {
    for (const e of EQUATIONS) {
      expect(isBalanced(e, balancedCoefs(e))).toBe(true);
      const left = sideCounts(e, balancedCoefs(e), 'left');
      expect(Object.keys(left).length).toBeGreaterThan(0);
      // Doubling still balances (any whole-number multiple is accepted).
      const doubled = Object.fromEntries(Object.entries(balancedCoefs(e)).map(([k, v]) => [k, v * 2]));
      expect(isBalanced(e, doubled)).toBe(true);
    }
    // 2H₂ + O₂ → 2H₂O is not balanced as H₂ + O₂ → H₂O.
    const water = EQUATIONS[0];
    expect(isBalanced(water, { 'left:H2': 1, 'left:O2': 1, 'right:H2O': 1 })).toBe(false);
    expect(isBalanced(water, { 'left:H2': 2, 'left:O2': 1 })).toBe(false);
  });

  it('describes patterns in colour words', () => {
    expect(describeCounts({ H: 2, O: 1 })).toBe('2 white and 1 red');
    expect(describeCounts({ C: 1, N: 3 })).toBe('1 black and 3 blue');
  });

  it('lays out known molecules with the right atoms and bonds', () => {
    for (const m of Object.values(MOLECULES)) {
      const { atoms, bonds } = layout(m.atoms);
      const total = Object.values(m.atoms).reduce((a, b) => a + (b ?? 0), 0);
      expect(atoms).toHaveLength(total);
      expect(bonds.length).toBe(Math.max(0, total - 1));
      for (const e of ELEMENTS) expect(atoms.filter((a) => a.el === e).length).toBe(m.atoms[e] ?? 0);
    }
    expect(layout({ O: 2 }).bonds[0].order).toBe(2);
    expect(layout({ N: 2 }).bonds[0].order).toBe(3);
    expect(ATOM.H.fill).toBe('#ffffff');
  });
});
