import { C } from '../../../lib/color';

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** Simplest form of a/b (b > 0). */
export function simplify(a: number, b: number): [number, number] {
  const g = gcd(a, b) || 1;
  return [a / g, b / g];
}

/** "3/4", "2" (whole), or "1 1/2" (mixed) for a/b in simplest form. */
export function fracStr(a: number, b: number, mixed = false): string {
  const [n, d] = simplify(a, b);
  if (d === 1) return String(n);
  if (mixed && n > d) return `${Math.floor(n / d)} ${n % d}/${d}`;
  return `${n}/${d}`;
}

/** A stacked fraction drawn in SVG, centred on (x, y). Whole numbers draw as a single number. */
export function Frac({
  x,
  y,
  n,
  d,
  size = 28,
  color = C.ink,
  weight = 700,
}: {
  x: number;
  y: number;
  n: number | string;
  d?: number | string;
  size?: number;
  color?: string;
  weight?: number;
}) {
  if (d === undefined || d === 1 || d === '1') {
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={weight} fill={color} className="num">
        {n}
      </text>
    );
  }
  const half = Math.max(String(n).length, String(d).length) * size * 0.32 + 4;
  return (
    <g>
      <text x={x} y={y - size * 0.52} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={weight} fill={color} className="num">
        {n}
      </text>
      <line x1={x - half} y1={y} x2={x + half} y2={y} stroke={color} strokeWidth={Math.max(2, size / 12)} strokeLinecap="round" />
      <text x={x} y={y + size * 0.56} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={weight} fill={color} className="num">
        {d}
      </text>
    </g>
  );
}
