import { describe, expect, it } from 'vitest';
import { answer, dissolves, fizzes, indicator, makeOrders, mix, ORDERS, stateAt } from './potions';
import type { Order, Paint, Stuff } from './potions';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const pairs = <T,>(list: T[]) => list.flatMap((a, i) => list.slice(i).map((b) => [a, b] as const));

describe('the science', () => {
  it('mixes primary colours like paint', () => {
    expect(mix('red', 'blue')).toBe('purple');
    expect(mix('yellow', 'red')).toBe('orange');
    expect(mix('blue', 'yellow')).toBe('green');
    expect(mix('red', 'red')).toBe('red');
  });

  it('only an acid with baking soda fizzes', () => {
    expect(fizzes('vinegar', 'soda')).toBe(true);
    expect(fizzes('soda', 'lemon')).toBe(true);
    expect(fizzes('water', 'sand')).toBe(false);
    expect(fizzes('vinegar', 'salt')).toBe(false);
    expect(fizzes('soda', 'water')).toBe(false);
  });

  it('freezes at 0 °C and boils at 100 °C', () => {
    expect(stateAt(-5)).toBe('ice');
    expect(stateAt(0)).toBe('ice');
    expect(stateAt(1)).toBe('water');
    expect(stateAt(99)).toBe('water');
    expect(stateAt(100)).toBe('steam');
  });

  it('salt and sugar dissolve; sand, chalk and pebbles do not', () => {
    expect(['salt', 'sugar'].every((s) => dissolves(s as Stuff))).toBe(true);
    expect(['sand', 'chalk', 'pebbles'].some((s) => dissolves(s as Stuff))).toBe(false);
  });

  it('universal indicator: red for acids, green at 7, blue to purple for bases', () => {
    expect(indicator(7)).toBe('#4cb84a');
    expect(new Set(Array.from({ length: 15 }, (_, i) => indicator(i))).size).toBe(15);
  });
});

describe('orders', () => {
  it('there are 8 for every age', () => {
    for (const band of [0, 1, 2, 3] as const) expect(makeOrders(band, seeded(1))).toHaveLength(ORDERS);
  });

  it('ages 4–5: exactly one pair of paints makes each colour', () => {
    for (const seed of SEEDS) {
      for (const o of makeOrders(0, seeded(seed)) as Extract<Order, { kind: 'mix' }>[]) {
        const right = pairs<Paint>(o.shelf).filter(([a, b]) => mix(a, b) === o.target);
        expect(right).toHaveLength(1);
        const [a, b] = answer(o) as Paint[];
        expect(mix(a, b)).toBe(o.target);
      }
    }
  });

  it('ages 4–5: every colour comes up', () => {
    const targets = new Set(makeOrders(0, seeded(5)).map((o) => (o as { target: string }).target));
    expect(targets.size).toBe(3);
  });

  it('ages 6–7: exactly one pair on the shelf fizzes', () => {
    for (const seed of SEEDS) {
      for (const o of makeOrders(1, seeded(seed)) as Extract<Order, { kind: 'fizz' }>[]) {
        expect(new Set(o.shelf).size).toBe(4);
        expect(o.shelf).not.toContain('chalk');
        const right = pairs<Stuff>(o.shelf).filter(([a, b]) => fizzes(a, b));
        expect(right).toHaveLength(1);
        const [a, b] = answer(o) as Stuff[];
        expect(fizzes(a, b)).toBe(true);
      }
    }
  });

  it('ages 8–9: states never start solved, and exactly one thing dissolves', () => {
    for (const seed of SEEDS) {
      const orders = makeOrders(2, seeded(seed));
      expect(orders.filter((o) => o.kind === 'state')).toHaveLength(4);
      for (const o of orders) {
        if (o.kind === 'state') {
          expect(stateAt(o.start)).not.toBe(o.target);
          expect(stateAt(answer(o) as number)).toBe(o.target);
        } else if (o.kind === 'dissolve') {
          expect(new Set(o.shelf).size).toBe(3);
          expect(o.shelf.filter(dissolves)).toHaveLength(1);
        } else {
          throw new Error('unexpected order');
        }
      }
    }
  });

  it('ages 10–12: pH starts off target, stays on the scale, and neutral comes up most', () => {
    for (const seed of SEEDS) {
      const orders = makeOrders(3, seeded(seed)) as Extract<Order, { kind: 'ph' }>[];
      expect(orders.filter((o) => o.target === 7).length).toBeGreaterThanOrEqual(5);
      for (const o of orders) {
        expect(o.start).not.toBe(o.target);
        expect(o.start).toBeGreaterThanOrEqual(1);
        expect(o.start).toBeLessThanOrEqual(13);
        expect(Math.abs(o.start - o.target)).toBeGreaterThanOrEqual(2);
        expect(Math.abs(o.start - o.target)).toBeLessThanOrEqual(5);
      }
    }
  });
});
