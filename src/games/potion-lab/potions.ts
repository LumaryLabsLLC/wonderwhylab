/**
 * Potion Lab: ingredients, the science rules and the orders for each age.
 */
import type { Band } from '../types';

export type Paint = 'red' | 'yellow' | 'blue';
export type Mixed = 'purple' | 'orange' | 'green';
export type Stuff = 'vinegar' | 'lemon' | 'soda' | 'water' | 'sand' | 'salt' | 'sugar' | 'oil' | 'chalk' | 'pebbles';
export type IngredientId = Paint | Stuff | 'acid' | 'base';

export type Holder = 'pot' | 'bottle' | 'jar' | 'dropper';

export const INGREDIENTS: Record<IngredientId, { name: string; holder: Holder; color: string; liquid: boolean }> = {
  red: { name: 'red', holder: 'pot', color: '#ef4444', liquid: true },
  yellow: { name: 'yellow', holder: 'pot', color: '#facc15', liquid: true },
  blue: { name: 'blue', holder: 'pot', color: '#3b82f6', liquid: true },
  vinegar: { name: 'vinegar', holder: 'bottle', color: '#f3ead0', liquid: true },
  lemon: { name: 'lemon juice', holder: 'bottle', color: '#fde68a', liquid: true },
  water: { name: 'water', holder: 'bottle', color: '#cfe6ff', liquid: true },
  oil: { name: 'oil', holder: 'bottle', color: '#f2b53a', liquid: true },
  soda: { name: 'baking soda', holder: 'jar', color: '#ffffff', liquid: false },
  salt: { name: 'salt', holder: 'jar', color: '#f8fafc', liquid: false },
  sugar: { name: 'sugar', holder: 'jar', color: '#fffdf5', liquid: false },
  sand: { name: 'sand', holder: 'jar', color: '#d9a866', liquid: false },
  chalk: { name: 'chalk dust', holder: 'jar', color: '#eef2f7', liquid: false },
  pebbles: { name: 'pebbles', holder: 'jar', color: '#94a3b8', liquid: false },
  acid: { name: 'acid', holder: 'dropper', color: '#ef4444', liquid: true },
  base: { name: 'base', holder: 'dropper', color: '#6d4ad8', liquid: true },
};

export const MIXED_COLOR: Record<Mixed, string> = { purple: '#8b5cf6', orange: '#fb923c', green: '#22c55e' };

// ─── The science ───────────────────────────────────────────────────────────────

/** Mixing two paints. Two of the same just gives more of that colour. */
export function mix(a: Paint, b: Paint): Paint | Mixed {
  if (a === b) return a;
  const pair = [a, b].sort().join('+');
  return ({ 'blue+red': 'purple', 'red+yellow': 'orange', 'blue+yellow': 'green' } as Record<string, Mixed>)[pair];
}

export const ACIDS: Stuff[] = ['vinegar', 'lemon'];
/** An acid and baking soda (a base) react and give off carbon dioxide gas. */
export const fizzes = (a: Stuff, b: Stuff) => (ACIDS.includes(a) && b === 'soda') || (ACIDS.includes(b) && a === 'soda');

export type WaterState = 'ice' | 'water' | 'steam';
/** Water at sea level: frozen at 0 °C and below, boiling at 100 °C and above. */
export const stateAt = (celsius: number): WaterState => (celsius <= 0 ? 'ice' : celsius >= 100 ? 'steam' : 'water');

export const DISSOLVERS: Stuff[] = ['salt', 'sugar'];
export const dissolves = (s: Stuff) => DISSOLVERS.includes(s);

/** Universal indicator colour for a pH from 0 to 14. */
export function indicator(ph: number): string {
  const COLORS = [
    '#d7263d', '#e0412f', '#ea5a25', '#f2771f', '#f79a1e', '#f5c218', '#c9d82a', '#4cb84a',
    '#1fa37a', '#1a8fa8', '#2a6fd0', '#3f4fc4', '#5a3eb8', '#6c2fa8', '#7a2690',
  ];
  return COLORS[Math.max(0, Math.min(14, Math.round(ph)))];
}

export const phWord = (ph: number) => (ph < 7 ? 'acid' : ph > 7 ? 'base' : 'neutral');

// ─── Orders ────────────────────────────────────────────────────────────────────

export type Order =
  | { kind: 'mix'; target: Mixed; shelf: Paint[] }
  | { kind: 'fizz'; shelf: Stuff[] }
  | { kind: 'state'; target: WaterState; start: number }
  | { kind: 'dissolve'; shelf: Stuff[] }
  | { kind: 'ph'; target: number; start: number };

export const ORDERS = 8;

type Rand = () => number;
const pickOne = <T,>(list: readonly T[], r: Rand) => list[Math.floor(r() * list.length)];
function shuffled<T>(list: readonly T[], r: Rand): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `n` items cycling through `list`, reshuffled each cycle, never the same twice in a row. */
function deal<T>(list: readonly T[], n: number, r: Rand): T[] {
  const out: T[] = [];
  while (out.length < n) {
    let batch = shuffled(list, r);
    if (batch.length > 1 && batch[0] === out.at(-1)) batch = [...batch.slice(1), batch[0]];
    out.push(...batch);
  }
  return out.slice(0, n);
}

/** Things that sit in water without fizzing (chalk is left out: it fizzes with vinegar). */
const BYSTANDERS: Stuff[] = ['water', 'sand', 'salt', 'sugar', 'oil'];
const INSOLUBLE: Stuff[] = ['sand', 'chalk', 'pebbles'];

export function makeOrders(band: Band, r: Rand = Math.random): Order[] {
  switch (band) {
    case 0:
      return deal<Mixed>(['purple', 'orange', 'green'], ORDERS, r).map((target) => ({ kind: 'mix', target, shelf: ['red', 'yellow', 'blue'] }));
    case 1:
      return Array.from({ length: ORDERS }, () => ({
        kind: 'fizz' as const,
        shelf: shuffled([pickOne(ACIDS, r), 'soda' as Stuff, ...shuffled(BYSTANDERS, r).slice(0, 2)], r),
      }));
    case 2: {
      const states = deal<WaterState>(['ice', 'water', 'steam'], ORDERS / 2, r);
      return Array.from({ length: ORDERS }, (_, i): Order => {
        if (i % 2 === 0) {
          const target = states[i / 2];
          // Start somewhere that is not already the answer.
          const start = target === 'water' ? pickOne([-15, -10, 110, 115], r) : pickOne([15, 20, 25], r);
          return { kind: 'state', target, start };
        }
        return { kind: 'dissolve', shelf: shuffled([pickOne(DISSOLVERS, r), ...shuffled(INSOLUBLE, r).slice(0, 2)], r) };
      });
    }
    case 3: {
      const targets = shuffled([7, 7, 7, 7, 7, 4, 10, pickOne([4, 10], r)], r);
      return targets.map((target) => {
        const away = pickOne([2, 3, 4, 5], r);
        const below = target - away >= 1;
        const above = target + away <= 13;
        const down = below && (!above || r() < 0.5);
        return { kind: 'ph', target, start: down ? target - away : target + away };
      });
    }
  }
}

/** The order's answer, for tests and hints. */
export function answer(order: Order): IngredientId[] | number {
  switch (order.kind) {
    case 'mix': {
      const pair = order.shelf.flatMap((a) => order.shelf.map((b) => [a, b] as const)).find(([a, b]) => mix(a, b) === order.target)!;
      return [...pair];
    }
    case 'fizz':
      return [order.shelf.find((s) => ACIDS.includes(s))!, 'soda'];
    case 'dissolve':
      return [order.shelf.find(dissolves)!];
    case 'state':
      return order.target === 'ice' ? -10 : order.target === 'steam' ? 105 : 20;
    case 'ph':
      return order.target;
  }
}
