import { C, shade } from '../../../lib/color';

const CHEESE = '#f6cf5a';
const DOUGH = '#f1e4c8';

function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
  const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
  const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${p0[0]},${p0[1]} A${r},${r} 0 ${large},1 ${p1[0]},${p1[1]} Z`;
}

/** A pizza cut into `n` equal slices. Shaded slices have toppings; the rest are plain dough. */
export function Pizza({
  cx,
  cy,
  r,
  n,
  shaded,
  onTap,
}: {
  cx: number;
  cy: number;
  r: number;
  n: number;
  shaded: boolean[];
  onTap?: (i: number) => void;
}) {
  const step = (Math.PI * 2) / n;
  return (
    <g>
      <ellipse cx={cx + 6} cy={cy + 12} rx={r + 8} ry={r + 4} fill={C.ink} opacity={0.12} />
      <circle cx={cx} cy={cy} r={r + 6} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: n }, (_, i) => {
        const a0 = -Math.PI / 2 + i * step;
        const a1 = a0 + step;
        const mid = (a0 + a1) / 2;
        const on = shaded[i];
        const pepperoni = n <= 4 ? [0.42, 0.68] : [0.58];
        return (
          <g
            key={i}
            onClick={onTap ? () => onTap(i) : undefined}
            style={onTap ? { cursor: 'pointer' } : undefined}
            data-nopan={onTap ? true : undefined}
            role={onTap ? 'button' : undefined}
            aria-label={onTap ? `Slice ${i + 1}, ${on ? 'shaded' : 'not shaded'}` : undefined}
          >
            <path d={wedge(cx, cy, r, a0, a1)} fill={on ? shade(C.wood, -0.05) : DOUGH} />
            <path d={wedge(cx, cy, r * 0.84, a0, a1)} fill={on ? CHEESE : shade(DOUGH, 0.3)} />
            {on &&
              pepperoni.map((f, j) => {
                const off = n <= 4 ? (j ? 0.35 : -0.35) * step * 0.5 : 0;
                return (
                  <circle
                    key={j}
                    cx={cx + Math.cos(mid + off) * r * f}
                    cy={cy + Math.sin(mid + off) * r * f}
                    r={Math.max(6, r * 0.09)}
                    fill={C.red}
                    stroke={shade(C.red, -0.3)}
                    strokeWidth={1.5}
                  />
                );
              })}
            <path d={wedge(cx, cy, r, a0, a1)} fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

/** A chocolate bar split into `n` equal pieces side by side. */
export function ChocolateBar({
  x,
  y,
  w,
  h,
  n,
  shaded,
  onTap,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  n: number;
  shaded: boolean[];
  onTap?: (i: number) => void;
}) {
  const pw = w / n;
  const choc = C.brown;
  return (
    <g>
      <rect x={x + 5} y={y + 10} width={w} height={h} rx={8} fill={C.ink} opacity={0.12} />
      {Array.from({ length: n }, (_, i) => {
        const on = shaded[i];
        const px = x + i * pw;
        return (
          <g
            key={i}
            onClick={onTap ? () => onTap(i) : undefined}
            style={onTap ? { cursor: 'pointer' } : undefined}
            data-nopan={onTap ? true : undefined}
            role={onTap ? 'button' : undefined}
            aria-label={onTap ? `Piece ${i + 1}, ${on ? 'shaded' : 'not shaded'}` : undefined}
          >
            <rect x={px} y={y + 6} width={pw} height={h} fill={on ? shade(choc, -0.35) : shade(DOUGH, -0.15)} />
            <rect x={px} y={y} width={pw} height={h} fill={on ? choc : DOUGH} />
            <rect x={px + 6} y={y + 6} width={Math.max(0, pw - 12)} height={h - 12} rx={4} fill={on ? shade(choc, 0.12) : shade(DOUGH, 0.3)} />
            <line x1={px} y1={y} x2={px} y2={y + h + 6} stroke={C.ink} strokeWidth={2} />
          </g>
        );
      })}
      <rect x={x} y={y} width={w} height={h + 6} rx={6} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

/** Stacked fraction for buttons and text. */
export function Frac({ n, d, size = 22 }: { n: number | string; d: number | string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1.05,
        fontSize: size,
        fontWeight: 700,
        verticalAlign: 'middle',
      }}
    >
      <span>{n}</span>
      <span style={{ alignSelf: 'stretch', borderTop: '2.5px solid currentColor', margin: '2px 0' }} />
      <span>{d}</span>
    </span>
  );
}

const shadedList = (n: number, k: number) => Array.from({ length: n }, (_, i) => i < k);

/** Pizza or bar picture for question cards. */
export function FractionPicture({ n, k, model }: { n: number; k: number; model: 'pizza' | 'bar' }) {
  if (model === 'pizza') {
    return (
      <svg viewBox="0 0 200 200" role="img" aria-label={`A pizza in ${n} equal slices, ${k} shaded`}>
        <Pizza cx={96} cy={96} r={82} n={n} shaded={shadedList(n, k)} />
      </svg>
    );
  }
  return (
    <svg viewBox="-6 -6 372 92" role="img" aria-label={`A bar in ${n} equal pieces, ${k} shaded`}>
      <ChocolateBar x={0} y={0} w={350} h={66} n={n} shaded={shadedList(n, k)} />
    </svg>
  );
}

export const FRACTION_WORDS: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['quarter', 'quarters'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'],
  8: ['eighth', 'eighths'],
  10: ['tenth', 'tenths'],
};
