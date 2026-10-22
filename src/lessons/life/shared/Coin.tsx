/** Neutral play coins: no country's money, just a number on each coin. */
export const COINS = [1, 2, 5, 10, 20, 50] as const;

const RADIUS: Record<number, number> = { 1: 28, 2: 31, 5: 34, 10: 36, 20: 39, 50: 42 };

function colours(v: number) {
  if (v >= 50) return { fill: '#f5c542', rim: '#c9971c' };
  if (v >= 5) return { fill: '#d9e1ea', rim: '#8e9bb0' };
  return { fill: '#e2a26a', rim: '#a8682f' };
}

export const coinRadius = (v: number, scale = 1) => (RADIUS[v] ?? 32) * scale;

/** One coin centred on (x, y). Bigger numbers are bigger coins, so they're easy to tell apart. */
export function Coin({ v, x, y, scale = 1 }: { v: number; x: number; y: number; scale?: number }) {
  const r = coinRadius(v, scale);
  const { fill, rim } = colours(v);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={x + 2} cy={y + 4} r={r} fill="#1e2b4a" opacity={0.12} />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={rim} strokeWidth={4} />
      <circle cx={x} cy={y} r={r * 0.78} fill="none" stroke={rim} strokeWidth={1.5} strokeDasharray="3 4" opacity={0.8} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={r * (v >= 10 ? 0.8 : 0.95)} fontWeight={800} fill="#1e2b4a">
        {v}
      </text>
    </g>
  );
}

/** A row of coins for question cards. */
export function CoinsPicture({ values, label }: { values: number[]; label?: string }) {
  const gap = 12;
  const widths = values.map((v) => coinRadius(v) * 2);
  const w = widths.reduce((a, b) => a + b, 0) + gap * (values.length + 1);
  let x = gap;
  return (
    <svg viewBox={`0 0 ${Math.max(w, 120)} 100`} role="img" aria-label={label ?? `Coins: ${values.join(', ')}`}>
      {values.map((v, i) => {
        const cx = x + widths[i] / 2;
        x += widths[i] + gap;
        return <Coin key={i} v={v} x={cx} y={50} />;
      })}
    </svg>
  );
}

/** Biggest coins first. With 1, 2, 5, 10, 20, 50 this always uses the fewest coins. */
export function fewestCoins(amount: number): number[] {
  const out: number[] = [];
  let left = amount;
  for (const c of [...COINS].reverse()) {
    while (left >= c) {
      out.push(c);
      left -= c;
    }
  }
  return out;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
