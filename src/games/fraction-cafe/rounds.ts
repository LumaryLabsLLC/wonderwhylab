import type { Band } from '../types';

/** A fraction n/d, kept as whole numbers so sums are exact. */
export interface Frac {
  n: number;
  d: number;
}

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

export function simplify(f: Frac): Frac {
  const g = gcd(f.n, f.d) || 1;
  return { n: f.n / g, d: f.d / g };
}

export function add(a: Frac, b: Frac): Frac {
  const d = lcm(a.d, b.d);
  return simplify({ n: a.n * (d / a.d) + b.n * (d / b.d), d });
}

export const sum = (fs: Frac[]): Frac => fs.reduce(add, { n: 0, d: 1 });
export const eq = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d;
export const cmp = (a: Frac, b: Frac) => a.n * b.d - b.n * a.d;
export const fstr = (f: Frac) => (f.n === f.d ? '1' : `${f.n}/${f.d}`);

const WORDS: Record<string, string> = {
  '1/2': 'a half',
  '1/3': 'a third',
  '2/3': 'two thirds',
  '1/4': 'a quarter',
  '2/4': 'two quarters',
  '3/4': 'three quarters',
  '1': 'a whole',
};

export const words = (f: Frac) => WORDS[fstr(f)] ?? fstr(f);

/** Names for equal parts: 4 → "quarters". */
export const PARTS: Record<number, string> = {
  2: 'halves',
  3: 'thirds',
  4: 'quarters',
  6: 'sixths',
  8: 'eighths',
  12: 'twelfths',
};

/** "½ + ¼ = 2/4 + 1/4 = 3/4": rewrite every part over a common denominator, then add. */
export function sumWorking(parts: Frac[]): string {
  if (parts.length === 0) return '0';
  const d = parts.reduce((acc, p) => lcm(acc, p.d), 1);
  const total = sum(parts);
  const same = parts.every((p) => p.d === d);
  const first = parts.map(fstr).join(' + ');
  if (parts.length === 1) return first;
  const common = parts.map((p) => `${p.n * (d / p.d)}/${d}`).join(' + ');
  const over = `${parts.reduce((a, p) => a + p.n * (d / p.d), 0)}/${d}`;
  const simple = fstr(total);
  return same ? (over === simple ? `${first} = ${simple}` : `${first} = ${over} = ${simple}`) : `${first} = ${common} = ${over}${over === simple ? '' : ` = ${simple}`}`;
}

// ─────────────────────────── Rounds ───────────────────────────

export type Food = 'pizza' | 'cake' | 'sandwich';

export const FRIENDS = ['🐻', '🐰', '🐱', '🐶'];
export const CUSTOMERS = ['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐸', '🐨'];

/** Ages 4–5: cut the food so every friend gets a fair (equal) share. */
export interface ShareRound {
  kind: 'share';
  food: 'pizza' | 'sandwich';
  friends: 2 | 4;
}

/** Serve an amount from food that is already cut into `slices` equal parts. */
export interface ServeRound {
  kind: 'serve';
  food: Food;
  order: Frac;
  /** Each food on the counter and how many equal slices it is cut into. */
  stock: number[];
}

/** Ages 8–9: which of two ready plates has more? Give it to the hungry customer. */
export interface CompareRound {
  kind: 'compare';
  plates: [Frac, Frac];
}

export type Round = (ShareRound | ServeRound | CompareRound) & { customer: string; tier: number };

export const ROUNDS = 8;

const pick = <T>(xs: readonly T[], random: () => number) => xs[Math.floor(random() * xs.length)];

function share(tier: number, random: () => number): ShareRound {
  if (tier === 0) return { kind: 'share', food: 'sandwich', friends: 2 };
  if (tier === 1) return { kind: 'share', food: random() < 0.5 ? 'pizza' : 'sandwich', friends: random() < 0.5 ? 2 : 4 };
  return { kind: 'share', food: pick(['pizza', 'sandwich'] as const, random), friends: 4 };
}

function serve1(tier: number, random: () => number): ServeRound {
  const food: Food = random() < 0.5 ? 'pizza' : 'cake';
  if (tier === 0) return { kind: 'serve', food, order: { n: 1, d: 2 }, stock: [2] };
  if (tier === 1) return { kind: 'serve', food, order: pick([{ n: 1, d: 4 }, { n: 3, d: 4 }, { n: 2, d: 4 }], random), stock: [4] };
  // A half from food cut into quarters, or quarters with more choice.
  return pick(
    [
      { kind: 'serve', food, order: { n: 1, d: 2 }, stock: [4] },
      { kind: 'serve', food, order: { n: 3, d: 4 }, stock: [4] },
      { kind: 'serve', food: 'pizza', order: { n: 1, d: 2 }, stock: [8] },
    ] as ServeRound[],
    random,
  );
}

function serve2(tier: number, random: () => number): ServeRound | CompareRound {
  if (tier === 0) return { kind: 'serve', food: 'pizza', order: pick([{ n: 1, d: 2 }, { n: 1, d: 4 }], random), stock: [8] };
  if (tier === 1)
    return pick(
      [
        { kind: 'serve', food: 'pizza', order: { n: 2, d: 4 }, stock: [8] },
        { kind: 'serve', food: 'pizza', order: { n: 3, d: 4 }, stock: [8] },
        { kind: 'serve', food: 'pizza', order: { n: 1, d: 3 }, stock: [6] },
        { kind: 'serve', food: 'pizza', order: { n: 2, d: 3 }, stock: [6] },
      ] as ServeRound[],
      random,
    );
  if (random() < 0.5) {
    const pairs: [Frac, Frac][] = [
      [{ n: 3, d: 8 }, { n: 1, d: 2 }],
      [{ n: 2, d: 3 }, { n: 1, d: 2 }],
      [{ n: 3, d: 4 }, { n: 5, d: 8 }],
      [{ n: 1, d: 3 }, { n: 1, d: 4 }],
      [{ n: 2, d: 6 }, { n: 1, d: 2 }],
    ];
    const pair = pick(pairs, random);
    return { kind: 'compare', plates: random() < 0.5 ? pair : [pair[1], pair[0]] };
  }
  return pick(
    [
      { kind: 'serve', food: 'pizza', order: { n: 4, d: 6 }, stock: [6] },
      { kind: 'serve', food: 'pizza', order: { n: 6, d: 8 }, stock: [4] },
    ] as ServeRound[],
    random,
  );
}

function serve3(tier: number, random: () => number): ServeRound {
  const options: [number, number, Frac][][] = [
    // [slices in pizza A, slices in pizza B, order]
    [
      [2, 4, { n: 3, d: 4 }],
      [2, 4, { n: 1, d: 1 }],
      [2, 4, { n: 5, d: 4 }],
    ],
    [
      [3, 6, { n: 5, d: 6 }],
      [3, 6, { n: 2, d: 3 }],
      [4, 8, { n: 5, d: 8 }],
      [4, 8, { n: 7, d: 8 }],
    ],
    [
      [2, 3, { n: 5, d: 6 }],
      [3, 4, { n: 7, d: 12 }],
      [2, 6, { n: 2, d: 3 }],
      [4, 6, { n: 5, d: 12 }],
    ],
  ];
  const [a, b, order] = pick(options[tier], random);
  return { kind: 'serve', food: 'pizza', order, stock: [a, b] };
}

export function makeRound(band: Band, tier: number, random = Math.random): Round {
  const t = Math.max(0, Math.min(2, tier));
  const base =
    band === 0 ? share(t, random) : band === 1 ? serve1(t, random) : band === 2 ? serve2(t, random) : serve3(t, random);
  return { ...base, customer: pick(CUSTOMERS, random), tier: t };
}

// ─────────────────────────── Checking ───────────────────────────

/** Every way of picking slices from the counter (one count per food) that adds up to the order. */
export function servings(round: ServeRound): number[][] {
  const out: number[][] = [];
  const walk = (i: number, counts: number[]) => {
    if (i === round.stock.length) {
      const total = sum(counts.flatMap((c, k) => (c ? [{ n: c, d: round.stock[k] }] : [])));
      if (eq(total, round.order)) out.push(counts);
      return;
    }
    for (let c = 0; c <= round.stock[i]; c++) walk(i + 1, [...counts, c]);
  };
  walk(0, []);
  return out;
}

/** What's on the plate, as fractions (one per slice). */
export function plateParts(round: ServeRound, onPlate: { food: number }[]): Frac[] {
  return onPlate.map((s) => ({ n: 1, d: round.stock[s.food] }));
}

/** Area of each piece after cutting. Pizza: cuts are angles (deg, 0–179) of lines through the centre. */
export function pizzaPieces(cuts: number[]): { from: number; to: number; size: number }[] {
  if (cuts.length === 0) return [{ from: 0, to: 360, size: 1 }];
  const edges = [...new Set(cuts.flatMap((a) => [a % 360, (a + 180) % 360]))].sort((a, b) => a - b);
  return edges.map((from, i) => {
    const to = i + 1 < edges.length ? edges[i + 1] : edges[0] + 360;
    return { from, to, size: (to - from) / 360 };
  });
}

/** Sandwich: cuts are positions (in quarters, 1–3) along x ('v') or y ('h'). Pieces are grid cells. */
export function sandwichPieces(v: number[], h: number[]): { x0: number; x1: number; y0: number; y1: number; size: number }[] {
  const xs = [0, ...[...new Set(v)].sort((a, b) => a - b), 4];
  const ys = [0, ...[...new Set(h)].sort((a, b) => a - b), 4];
  const out = [];
  for (let j = 0; j + 1 < ys.length; j++) {
    for (let i = 0; i + 1 < xs.length; i++) {
      out.push({ x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1], size: ((xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j])) / 16 });
    }
  }
  return out;
}

/** Fair: every friend has something and all shares are the same size (sizes in exact sixteenths/degrees). */
export function isFair(shares: number[]): boolean {
  if (shares.some((s) => s <= 0)) return false;
  return shares.every((s) => Math.abs(s - shares[0]) < 1e-9);
}

/** A model fair cut for "show me". */
export function fairCut(round: ShareRound): { pizza?: number[]; v?: number[]; h?: number[] } {
  if (round.food === 'pizza') return { pizza: round.friends === 2 ? [90] : [0, 90] };
  return round.friends === 2 ? { v: [2], h: [] } : { v: [2], h: [2] };
}

/** One short true sentence for after each round. */
export function explain(round: Round): string {
  if (round.kind === 'share') {
    const f = { n: 1, d: round.friends };
    return `Fair shares are the same size. ${round.friends} equal parts means each friend gets ${words(f)} (${fstr(f)}).`;
  }
  if (round.kind === 'compare') {
    const [a, b] = round.plates;
    const big = cmp(a, b) > 0 ? a : b;
    const small = big === a ? b : a;
    const d = lcm(a.d, b.d);
    return `${fstr(big)} is more than ${fstr(small)}: ${fstr(big)} = ${big.n * (d / big.d)}/${d} and ${fstr(small)} = ${small.n * (d / small.d)}/${d}.`;
  }
  const o = round.order;
  if (round.stock.length === 1) {
    const d = round.stock[0];
    const k = (o.n * d) / o.d;
    if (d === o.d) return `${fstr(o)} means ${o.n} of ${o.d} equal parts.`;
    return `${fstr(o)} is the same amount as ${k}/${d} — the slices are just ${d > o.d ? 'smaller' : 'bigger'}.`;
  }
  const [a, b] = round.stock;
  const d = lcm(a, b);
  return `To add, make the slices the same size: ${PARTS[a]} and ${PARTS[b]} can both be cut into ${PARTS[d]}. ${fstr(o)} is ${(o.n * d) / o.d} ${PARTS[d]}.`;
}

/** 3 first-try orders in a row → harder; a miss → easier. */
export function adapt(tier: number, streak: number, clean: boolean): { tier: number; streak: number } {
  if (!clean) return { tier: Math.max(0, tier - 1), streak: 0 };
  if (streak + 1 >= 3) return { tier: Math.min(2, tier + 1), streak: 0 };
  return { tier, streak: streak + 1 };
}

/**
 * Remember the level a child reached (per age band) so the next session starts there.
 * Browser storage is only a convenience: if it is unavailable we simply start at the easiest level.
 */
const tierKey = (band: number) => `wonderwhylab:fraction-cafe:tier:${band}`;

export function savedTier(band: number): number {
  try {
    const v = Number(localStorage.getItem(tierKey(band)));
    return Number.isFinite(v) ? Math.max(0, Math.min(2, Math.round(v))) : 0;
  } catch {
    return 0;
  }
}

export function saveTier(band: number, tier: number) {
  try {
    localStorage.setItem(tierKey(band), String(tier));
  } catch {
    // Storage blocked: fine, we start easy next time.
  }
}
