import { C, shade } from '../../../../lib/color';

export const BAR_COLOR = '#4f7cff';

/** Bars for a list of numbers (for practice questions); `mark` highlights some positions. */
export function BarsPicture({ values, mark = [], unit = 18 }: { values: number[]; mark?: number[]; unit?: number }) {
  const w = 56;
  const gap = 14;
  const max = Math.max(...values);
  const H = max * unit + 40;
  const W = values.length * (w + gap) - gap + 8;
  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} role="img" aria-label={`Bars: ${values.join(', ')}`}>
      {values.map((v, i) => {
        const x = i * (w + gap) + 4;
        const h = v * unit;
        const on = mark.includes(i);
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={w} height={h} rx={8} fill={on ? C.yellow : BAR_COLOR} stroke={C.ink} strokeWidth={2} />
            <text x={x + w / 2} y={H - h - 12} textAnchor="middle" fontSize={24} fontWeight={800} fill={C.ink}>
              {v}
            </text>
          </g>
        );
      })}
      <line x1={0} y1={H} x2={W} y2={H} stroke={shade(C.ink, 0.3)} strokeWidth={3} />
    </svg>
  );
}
