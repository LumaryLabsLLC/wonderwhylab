import { C, shade } from '../../../../lib/color';

/** Place values for n bulbs, biggest first: 5 → [16, 8, 4, 2, 1]. */
export const placeValues = (n: number) => Array.from({ length: n }, (_, i) => 2 ** (n - 1 - i));
/** Bits for a value, biggest place first. */
export const toBits = (value: number, n: number) => placeValues(n).map((p) => (Math.floor(value / p) % 2) as 0 | 1);
export const fromBits = (bits: (0 | 1)[]) => bits.reduce<number>((v, b) => v * 2 + b, 0);
export const bitString = (value: number, n: number) => toBits(value, n).join('');

/** One light bulb centred at (cx, cy); lit bulbs glow. */
export function Bulb({ cx, cy, r, on }: { cx: number; cy: number; r: number; on: boolean }) {
  return (
    <g>
      {on && <circle cx={cx} cy={cy} r={r * 1.35} fill={C.yellow} opacity={0.3} />}
      <circle cx={cx} cy={cy} r={r} fill={on ? C.yellow : '#d5dbe7'} stroke={C.ink} strokeWidth={2.5} />
      {on && <circle cx={cx - r * 0.3} cy={cy - r * 0.32} r={r * 0.22} fill="white" opacity={0.7} />}
      <path
        d={`M${cx - r * 0.3},${cy + r * 0.2} q${r * 0.15},${-r * 0.35} ${r * 0.3},0 q${r * 0.15},${r * 0.35} ${r * 0.3},0`}
        fill="none"
        stroke={on ? shade(C.orange, -0.2) : C.muted}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <rect x={cx - r * 0.42} y={cy + r * 0.86} width={r * 0.84} height={r * 0.46} rx={r * 0.1} fill="#9aa3b5" stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

/** A row of bulbs for practice questions, with each bulb's value written above it (optional). */
export function BulbsPicture({ bits, values = true }: { bits: (0 | 1)[]; values?: boolean }) {
  const n = bits.length;
  const step = 76;
  const w = n * step;
  const top = values ? 34 : 6;
  return (
    <svg viewBox={`0 0 ${w} ${top + 92}`} role="img" aria-label={`Bulbs: ${bits.map((b) => (b ? 'on' : 'off')).join(', ')}`}>
      {bits.map((b, i) => {
        const cx = step / 2 + i * step;
        return (
          <g key={i}>
            {values && (
              <text x={cx} y={20} textAnchor="middle" fontSize={22} fontWeight={800} fill={C.ink}>
                {2 ** (n - 1 - i)}
              </text>
            )}
            <Bulb cx={cx} cy={top + 34} r={26} on={!!b} />
          </g>
        );
      })}
    </svg>
  );
}
