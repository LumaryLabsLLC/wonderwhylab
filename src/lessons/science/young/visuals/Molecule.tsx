import { C, shade } from '../../../../lib/color';

/** Atom colours follow the usual chemistry model-kit colours (CPK). */
export type El = 'H' | 'C' | 'N' | 'O';

export const ATOM: Record<El, { name: string; color: string; text: string; r: number }> = {
  H: { name: 'hydrogen', color: '#ffffff', text: C.ink, r: 22 },
  C: { name: 'carbon', color: '#3a3f4b', text: '#ffffff', r: 31 },
  N: { name: 'nitrogen', color: C.blue, text: '#ffffff', r: 29 },
  O: { name: 'oxygen', color: C.red, text: '#ffffff', r: 30 },
};

export interface Shape {
  formula: string;
  name: string;
  atoms: { el: El; x: number; y: number }[];
  /** [from, to, number of bond lines] */
  bonds: [number, number, number][];
}

/** Molecules the builder recognises, keyed by atom counts in C-H-N-O order. */
export const SHAPES: Record<string, Shape> = {
  C0H2N0O1: {
    formula: 'H₂O',
    name: 'water',
    atoms: [
      { el: 'O', x: 0, y: -10 },
      { el: 'H', x: -60, y: 36 },
      { el: 'H', x: 60, y: 36 },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
    ],
  },
  C1H0N0O2: {
    formula: 'CO₂',
    name: 'carbon dioxide',
    atoms: [
      { el: 'O', x: -96, y: 0 },
      { el: 'C', x: 0, y: 0 },
      { el: 'O', x: 96, y: 0 },
    ],
    bonds: [
      [0, 1, 2],
      [1, 2, 2],
    ],
  },
  C0H0N0O2: {
    formula: 'O₂',
    name: 'oxygen gas',
    atoms: [
      { el: 'O', x: -42, y: 0 },
      { el: 'O', x: 42, y: 0 },
    ],
    bonds: [[0, 1, 2]],
  },
  C1H4N0O0: {
    formula: 'CH₄',
    name: 'methane',
    atoms: [
      { el: 'C', x: 0, y: 0 },
      { el: 'H', x: 0, y: -78 },
      { el: 'H', x: 78, y: 0 },
      { el: 'H', x: 0, y: 78 },
      { el: 'H', x: -78, y: 0 },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [0, 4, 1],
    ],
  },
  C0H3N1O0: {
    formula: 'NH₃',
    name: 'ammonia',
    atoms: [
      { el: 'N', x: 0, y: -14 },
      { el: 'H', x: -68, y: 38 },
      { el: 'H', x: 68, y: 38 },
      { el: 'H', x: 0, y: -90 },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
    ],
  },
  C0H2N0O0: {
    formula: 'H₂',
    name: 'hydrogen gas',
    atoms: [
      { el: 'H', x: -30, y: 0 },
      { el: 'H', x: 30, y: 0 },
    ],
    bonds: [[0, 1, 1]],
  },
  C0H0N2O0: {
    formula: 'N₂',
    name: 'nitrogen gas',
    atoms: [
      { el: 'N', x: -40, y: 0 },
      { el: 'N', x: 40, y: 0 },
    ],
    bonds: [[0, 1, 3]],
  },
};

export type Counts = Partial<Record<El, number>>;

export const countsKey = (c: Counts) => (['C', 'H', 'N', 'O'] as El[]).map((e) => `${e}${c[e] ?? 0}`).join('');

const SUB = '₀₁₂₃₄₅₆₇₈₉';
export const sub = (n: number) => String(n).replace(/\d/g, (d) => SUB[Number(d)]);

/** Formula in the usual order: carbon first, then hydrogen, then the rest alphabetically. */
export function formulaOf(c: Counts): string {
  const known = SHAPES[countsKey(c)];
  if (known) return known.formula;
  const order: El[] = c.C ? ['C', 'H', 'N', 'O'] : ['H', 'N', 'O'];
  return order
    .filter((e) => (c[e] ?? 0) > 0)
    .map((e) => `${e}${(c[e] ?? 0) > 1 ? sub(c[e]!) : ''}`)
    .join('');
}

export function AtomBall({ el, x, y, scale = 1 }: { el: El; x: number; y: number; scale?: number }) {
  const a = ATOM[el];
  const r = a.r * scale;
  return (
    <g>
      <circle cx={x} cy={y + 3 * scale} r={r} fill={C.ink} opacity={0.18} />
      <circle cx={x} cy={y} r={r} fill={a.color} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill="#ffffff" opacity={el === 'H' ? 0 : 0.35} />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.95} fontWeight={700} fill={a.text}>
        {el}
      </text>
    </g>
  );
}

export function Bond({ x1, y1, x2, y2, order, scale = 1 }: { x1: number; y1: number; x2: number; y2: number; order: number; scale?: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 9 * scale;
  const ny = (dx / len) * 9 * scale;
  const offsets = order === 1 ? [0] : order === 2 ? [-0.5, 0.5] : [-1, 0, 1];
  return (
    <g stroke={shade(C.ink, 0.15)} strokeWidth={5 * scale} strokeLinecap="round">
      {offsets.map((o) => (
        <line key={o} x1={x1 + nx * o} y1={y1 + ny * o} x2={x2 + nx * o} y2={y2 + ny * o} />
      ))}
    </g>
  );
}

/** Draw a known molecule centred at (cx, cy). */
export function MoleculeDrawing({ shape, cx, cy, scale = 1 }: { shape: Shape; cx: number; cy: number; scale?: number }) {
  const pts = shape.atoms.map((a) => ({ ...a, x: cx + a.x * scale, y: cy + a.y * scale }));
  return (
    <g>
      {shape.bonds.map(([a, b, n], i) => (
        <Bond key={i} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} order={n} scale={scale} />
      ))}
      {pts.map((p, i) => (
        <AtomBall key={i} el={p.el} x={p.x} y={p.y} scale={scale} />
      ))}
    </g>
  );
}

export function MoleculePicture({ shape }: { shape: Shape }) {
  return (
    <svg viewBox="-150 -110 300 220" role="img" aria-label={`A ${shape.name} molecule, ${shape.formula}`}>
      <MoleculeDrawing shape={shape} cx={0} cy={0} scale={1} />
    </svg>
  );
}

export const shapeByFormula = (f: string) => Object.values(SHAPES).find((s) => s.formula === f)!;
