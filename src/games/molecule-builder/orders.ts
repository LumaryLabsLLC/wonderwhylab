import type { Band } from '../types';
import { pick, rand, shuffle } from '../../lib/random';

/** The four elements in the tray, drawn in the standard CPK model colours. */
export type El = 'H' | 'C' | 'N' | 'O';
export type Counts = Partial<Record<El, number>>;

export const ATOM: Record<El, { name: string; colour: string; fill: string; text: string; size: number; valence: number }> = {
  H: { name: 'hydrogen', colour: 'white', fill: '#ffffff', text: '#1e2b4a', size: 0.8, valence: 1 },
  C: { name: 'carbon', colour: 'black', fill: '#3a3f4b', text: '#ffffff', size: 1, valence: 4 },
  N: { name: 'nitrogen', colour: 'blue', fill: '#3b6fe0', text: '#ffffff', size: 0.95, valence: 3 },
  O: { name: 'oxygen', colour: 'red', fill: '#e8473b', text: '#ffffff', size: 0.95, valence: 2 },
};

export const ELEMENTS: El[] = ['H', 'C', 'N', 'O'];

export interface Molecule {
  /** Formula with subscripts, e.g. "H₂O". */
  formula: string;
  name: string;
  atoms: Counts;
  /** One true, child-sized fact. */
  fact: string;
}

export const MOLECULES: Record<string, Molecule> = {
  H2: { formula: 'H₂', name: 'hydrogen gas', atoms: { H: 2 }, fact: 'the lightest gas of all.' },
  O2: { formula: 'O₂', name: 'oxygen gas', atoms: { O: 2 }, fact: 'the gas we need to breathe in.' },
  N2: { formula: 'N₂', name: 'nitrogen gas', atoms: { N: 2 }, fact: 'most of the air around us is this gas.' },
  H2O: { formula: 'H₂O', name: 'water', atoms: { H: 2, O: 1 }, fact: 'every drop of water is made of these.' },
  CO2: { formula: 'CO₂', name: 'carbon dioxide', atoms: { C: 1, O: 2 }, fact: 'we breathe it out and plants take it in.' },
  CH4: { formula: 'CH₄', name: 'methane', atoms: { C: 1, H: 4 }, fact: 'the natural gas some stoves burn.' },
  NH3: { formula: 'NH₃', name: 'ammonia', atoms: { N: 1, H: 3 }, fact: 'farmers use it to make plant food.' },
  CO: { formula: 'CO', name: 'carbon monoxide', atoms: { C: 1, O: 1 }, fact: 'a poisonous gas made when things burn without enough air.' },
  C: { formula: 'C', name: 'carbon', atoms: { C: 1 }, fact: 'coal and diamonds are made of it.' },
};

/** The real molecule these atoms make, if any. */
export function moleculeFor(c: Counts): Molecule | undefined {
  return Object.values(MOLECULES).find((m) => countsEqual(m.atoms, c));
}

export interface Species {
  /** Key into MOLECULES. */
  id: string;
  /** Smallest whole-number coefficient in the balanced equation. */
  coef: number;
}

export interface Equation {
  left: Species[];
  right: Species[];
  /** One true sentence about the reaction. */
  why: string;
}

export const EQUATIONS: Equation[] = [
  {
    left: [{ id: 'H2', coef: 2 }, { id: 'O2', coef: 1 }],
    right: [{ id: 'H2O', coef: 2 }],
    why: 'Hydrogen burns in oxygen to make water.',
  },
  {
    left: [{ id: 'CH4', coef: 1 }, { id: 'O2', coef: 2 }],
    right: [{ id: 'CO2', coef: 1 }, { id: 'H2O', coef: 2 }],
    why: 'Methane (natural gas) burns in oxygen to make carbon dioxide and water.',
  },
  {
    left: [{ id: 'N2', coef: 1 }, { id: 'H2', coef: 3 }],
    right: [{ id: 'NH3', coef: 2 }],
    why: 'Nitrogen and hydrogen join to make ammonia, which is used to make plant food.',
  },
  {
    left: [{ id: 'C', coef: 1 }, { id: 'O2', coef: 1 }],
    right: [{ id: 'CO2', coef: 1 }],
    why: 'Carbon burns in oxygen to make carbon dioxide.',
  },
  {
    left: [{ id: 'H2O', coef: 2 }],
    right: [{ id: 'H2', coef: 2 }, { id: 'O2', coef: 1 }],
    why: 'Electricity can split water into hydrogen and oxygen gas.',
  },
  {
    left: [{ id: 'CO', coef: 2 }, { id: 'O2', coef: 1 }],
    right: [{ id: 'CO2', coef: 2 }],
    why: 'Carbon monoxide burns in oxygen to make carbon dioxide.',
  },
];

export type Order =
  /** Ages 4–5: copy a pattern of coloured balls. */
  | { kind: 'pattern'; target: Counts; tray: El[] }
  /** Ages 6–7: copy a pictured molecule. */
  | { kind: 'picture'; molecule: string; tray: El[] }
  /** Ages 8–9: build from the formula alone. */
  | { kind: 'formula'; molecule: string; tray: El[] }
  /** Ages 10–12: balance an equation with whole molecules. */
  | { kind: 'equation'; equation: Equation; tray: string[] };

export const ORDERS = 8;

const PATTERN_MOLECULES = ['H2O', 'CO2', 'NH3', 'CO', 'CH4'];
const PICTURE_MOLECULES = ['H2O', 'O2', 'H2', 'CO2', 'N2'];
const FORMULA_MOLECULES = ['H2O', 'CO2', 'O2', 'CH4', 'NH3', 'N2', 'H2', 'CO'];

/** The atoms needed for an order (for equations, see `sideCounts`). */
export function targetCounts(order: Order): Counts {
  if (order.kind === 'pattern') return order.target;
  if (order.kind === 'equation') return {};
  return MOLECULES[order.molecule].atoms;
}

function trayFor(target: Counts, extra: number): El[] {
  const need = ELEMENTS.filter((e) => (target[e] ?? 0) > 0);
  const others = shuffle(ELEMENTS.filter((e) => !need.includes(e))).slice(0, extra);
  return ELEMENTS.filter((e) => need.includes(e) || others.includes(e));
}

function makeOrder(band: Band, avoid: string | null): Order {
  if (band === 0) {
    for (;;) {
      // Half the patterns are the atoms of a real molecule (water, ammonia…), so the "yes" line can name it.
      const [a, b] = shuffle(ELEMENTS).slice(0, 2);
      const target: Counts = Math.random() < 0.5 ? { ...MOLECULES[pick(PATTERN_MOLECULES)].atoms } : { [a]: rand(1, 3), [b]: rand(1, 2) };
      if (describeCounts(target) !== avoid) return { kind: 'pattern', target, tray: trayFor(target, 1) };
    }
  }
  if (band === 3) {
    const options = EQUATIONS.filter((e) => equationKey(e) !== avoid);
    const equation = pick(options);
    const used = new Set([...equation.left, ...equation.right].map((s) => s.id));
    const distractor = pick(Object.keys(MOLECULES).filter((id) => !used.has(id)));
    return { kind: 'equation', equation, tray: shuffle([...used, distractor]) };
  }
  const pool = (band === 1 ? PICTURE_MOLECULES : FORMULA_MOLECULES).filter((m) => m !== avoid);
  const molecule = pick(pool);
  const target = MOLECULES[molecule].atoms;
  return band === 1
    ? { kind: 'picture', molecule, tray: trayFor(target, 1) }
    : { kind: 'formula', molecule, tray: [...ELEMENTS] };
}

export function orderKey(order: Order): string {
  if (order.kind === 'equation') return equationKey(order.equation);
  if (order.kind === 'pattern') return describeCounts(order.target);
  return order.molecule;
}

function equationKey(e: Equation): string {
  return [...e.left, '→', ...e.right].map((s) => (typeof s === 'string' ? s : s.id)).join(' ');
}

/** A round of orders where the same order never comes twice in a row. */
export function makeOrders(band: Band, n = ORDERS): Order[] {
  const out: Order[] = [];
  for (let i = 0; i < n; i++) out.push(makeOrder(band, out.length ? orderKey(out[out.length - 1]) : null));
  return out;
}

export function countsEqual(a: Counts, b: Counts): boolean {
  return ELEMENTS.every((e) => (a[e] ?? 0) === (b[e] ?? 0));
}

export function addCounts(a: Counts, b: Counts, times = 1): Counts {
  const out: Counts = { ...a };
  for (const e of ELEMENTS) if (b[e]) out[e] = (out[e] ?? 0) + (b[e] ?? 0) * times;
  return out;
}

/** "2 white and 1 red" — how a 4–5 year old reads a pattern card. */
export function describeCounts(c: Counts): string {
  const parts = ELEMENTS.filter((e) => c[e]).map((e) => `${c[e]} ${ATOM[e].colour}`);
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Atoms on each side of an equation for the given coefficients (keyed by molecule id). */
export function sideCounts(e: Equation, coefs: Record<string, number>, side: 'left' | 'right'): Counts {
  let c: Counts = {};
  for (const s of e[side]) c = addCounts(c, MOLECULES[s.id].atoms, coefs[`${side}:${s.id}`] ?? 0);
  return c;
}

/** Balanced when every slot has at least one molecule and both sides have the same atoms. */
export function isBalanced(e: Equation, coefs: Record<string, number>): boolean {
  const all = [...e.left.map((s) => `left:${s.id}`), ...e.right.map((s) => `right:${s.id}`)];
  if (all.some((k) => !(coefs[k] > 0))) return false;
  return countsEqual(sideCounts(e, coefs, 'left'), sideCounts(e, coefs, 'right'));
}

export function balancedCoefs(e: Equation): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of e.left) out[`left:${s.id}`] = s.coef;
  for (const s of e.right) out[`right:${s.id}`] = s.coef;
  return out;
}

export function formatSide(e: Equation, side: 'left' | 'right', coefs?: Record<string, number>): string {
  return e[side]
    .map((s) => {
      const n = coefs ? coefs[`${side}:${s.id}`] ?? 0 : s.coef;
      return `${n > 1 ? n : ''}${MOLECULES[s.id].formula}`;
    })
    .join(' + ');
}

export interface Placed {
  el: El;
  x: number;
  y: number;
}

export interface Bond {
  a: number;
  b: number;
  /** 1 = single, 2 = double, 3 = triple. */
  order: number;
}

/**
 * Lay out a set of atoms as a ball-and-stick picture centred on (0, 0).
 * Known molecules get their real shape (water is bent, CO₂ is straight, methane has four arms);
 * anything else is drawn as a cluster around its best "centre" atom.
 */
export function layout(c: Counts, unit = 46): { atoms: Placed[]; bonds: Bond[] } {
  const known = moleculeFor(c);
  const total = ELEMENTS.reduce((n, e) => n + (c[e] ?? 0), 0);
  if (total === 0) return { atoms: [], bonds: [] };
  const at = (el: El, x: number, y: number): Placed => ({ el, x: x * unit, y: y * unit });

  if (known) {
    switch (known.formula) {
      case 'H₂':
        return { atoms: [at('H', -0.55, 0), at('H', 0.55, 0)], bonds: [{ a: 0, b: 1, order: 1 }] };
      case 'O₂':
        return { atoms: [at('O', -0.65, 0), at('O', 0.65, 0)], bonds: [{ a: 0, b: 1, order: 2 }] };
      case 'N₂':
        return { atoms: [at('N', -0.65, 0), at('N', 0.65, 0)], bonds: [{ a: 0, b: 1, order: 3 }] };
      case 'CO':
        return { atoms: [at('C', -0.65, 0), at('O', 0.65, 0)], bonds: [{ a: 0, b: 1, order: 3 }] };
      case 'H₂O':
        return {
          atoms: [at('O', 0, -0.25), at('H', -0.9, 0.45), at('H', 0.9, 0.45)],
          bonds: [
            { a: 0, b: 1, order: 1 },
            { a: 0, b: 2, order: 1 },
          ],
        };
      case 'CO₂':
        return {
          atoms: [at('C', 0, 0), at('O', -1.3, 0), at('O', 1.3, 0)],
          bonds: [
            { a: 0, b: 1, order: 2 },
            { a: 0, b: 2, order: 2 },
          ],
        };
      case 'CH₄':
        return {
          atoms: [at('C', 0, 0), at('H', 0, -1.15), at('H', 1.15, 0), at('H', 0, 1.15), at('H', -1.15, 0)],
          bonds: [1, 2, 3, 4].map((b) => ({ a: 0, b, order: 1 })),
        };
      case 'NH₃':
        return {
          atoms: [at('N', 0, -0.2), at('H', -1.05, 0.55), at('H', 0, 1.05), at('H', 1.05, 0.55)],
          bonds: [1, 2, 3].map((b) => ({ a: 0, b, order: 1 })),
        };
      default:
        break;
    }
  }

  // Generic cluster: the atom with the most bonds sits in the middle and holds as many atoms as
  // it has bonds; any extra atoms float loose around the outside (they don't fit).
  const list: El[] = [];
  for (const e of [...ELEMENTS].sort((a, b) => ATOM[b].valence - ATOM[a].valence)) for (let i = 0; i < (c[e] ?? 0); i++) list.push(e);
  if (list.length === 1) return { atoms: [at(list[0], 0, 0)], bonds: [] };
  const [centre, ...rest] = list;
  const held = rest.slice(0, ATOM[centre].valence);
  const loose = rest.slice(held.length);
  const atoms: Placed[] = [at(centre, 0, 0)];
  const bonds: Bond[] = [];
  held.forEach((el, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / held.length;
    atoms.push(at(el, Math.cos(angle) * 1.2, Math.sin(angle) * 1.2));
    bonds.push({ a: 0, b: atoms.length - 1, order: 1 });
  });
  loose.forEach((el, i) => {
    const angle = -Math.PI / 4 + (i * 2 * Math.PI) / Math.max(loose.length, 4);
    atoms.push(at(el, Math.cos(angle) * 2.3, Math.sin(angle) * 2.3));
  });
  return { atoms, bonds };
}
