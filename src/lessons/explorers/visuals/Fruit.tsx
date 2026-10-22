import { C, shade } from '../../../lib/color';
import { Thing } from '../../../visuals/Thing';

export type FruitId = 'apple' | 'banana' | 'grapes' | 'orange';

export const FRUITS: { id: FruitId; name: string; plural: string; color: string }[] = [
  { id: 'apple', name: 'Apple', plural: 'apples', color: C.red },
  { id: 'banana', name: 'Banana', plural: 'bananas', color: C.yellow },
  { id: 'grapes', name: 'Grapes', plural: 'grapes', color: C.purple },
  { id: 'orange', name: 'Orange', plural: 'oranges', color: C.orange },
];

const S = { stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const };

/** A fruit icon centred at (x, y), `size` pixels across. */
export function Fruit({ id, x = 0, y = 0, size = 50 }: { id: FruitId; x?: number; y?: number; size?: number }) {
  if (id === 'apple') return <Thing kind="apple" x={x} y={y} size={size} />;
  const k = size / 100;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      {id === 'banana' && (
        <g>
          <path d="M-40,-22 C-40,20 -6,40 34,30 C42,28 44,20 38,18 C6,22 -20,6 -26,-26 C-28,-34 -40,-34 -40,-22 Z" fill={C.yellow} {...S} />
          <path d="M-30,-14 C-26,10 -4,24 26,24" fill="none" stroke={shade(C.yellow, -0.3)} strokeWidth={3} strokeLinecap="round" />
          <path d="M-40,-24 L-38,-36" stroke={C.brown} strokeWidth={6} strokeLinecap="round" />
        </g>
      )}
      {id === 'grapes' && (
        <g>
          <path d="M0,-34 C2,-42 8,-46 14,-48" fill="none" stroke={C.brown} strokeWidth={5} strokeLinecap="round" />
          <path d="M4,-38 C16,-50 32,-44 32,-36 C22,-30 12,-32 4,-38 Z" fill={C.green} {...S} />
          {[
            [-18, -22],
            [0, -24],
            [18, -22],
            [-10, -4],
            [10, -4],
            [-22, -6],
            [24, -6],
            [0, 14],
            [-12, 30],
            [12, 30],
            [0, 46],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy - 4} r={12} fill={i % 3 ? C.purple : shade(C.purple, 0.15)} {...S} strokeWidth={2.5} />
          ))}
        </g>
      )}
      {id === 'orange' && (
        <g>
          <circle r={42} fill={C.orange} {...S} />
          {[
            [-14, -10],
            [10, -18],
            [18, 10],
            [-8, 16],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={2.5} fill={shade(C.orange, -0.3)} />
          ))}
          <path d="M0,-42 C6,-52 20,-54 26,-48 C18,-40 8,-40 0,-42 Z" fill={C.green} {...S} />
          <circle cx={-16} cy={-20} r={6} fill={C.white} opacity={0.6} />
        </g>
      )}
    </g>
  );
}

/** Tally marks for `n`, starting at (x, y), `h` tall. Every fifth mark crosses the four before it. */
export function Tally({ n, x, y, h = 30, color = C.ink }: { n: number; x: number; y: number; h?: number; color?: string }) {
  const gap = h * 0.24;
  const groupW = gap * 3 + h * 0.5;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const g = Math.floor(i / 5);
    const j = i % 5;
    const gx = x + g * (groupW + gap * 1.6);
    if (j < 4) parts.push(`M${gx + j * gap},${y} V${y + h}`);
    else parts.push(`M${gx - gap * 0.6},${y + h * 0.8} L${gx + gap * 3.6},${y + h * 0.2}`);
  }
  return <path d={parts.join(' ')} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />;
}

/** A small bar chart for question cards. */
export function BarChartPicture({ values }: { values: number[] }) {
  const max = Math.max(10, ...values);
  const unit = 16;
  const x0 = 34;
  const y0 = 18 + max * unit;
  const slot = 72;
  return (
    <svg viewBox={`0 0 ${x0 + slot * values.length + 10} ${y0 + 60}`} role="img" aria-label={`Bar chart: ${values.map((v, i) => `${FRUITS[i].plural} ${v}`).join(', ')}`}>
      {Array.from({ length: max + 1 }, (_, i) => (
        <g key={i}>
          <line x1={x0} y1={y0 - i * unit} x2={x0 + slot * values.length} y2={y0 - i * unit} stroke={C.line} strokeWidth={i % 5 === 0 ? 1.5 : 0.8} />
          {i % 2 === 0 && (
            <text x={x0 - 8} y={y0 - i * unit} textAnchor="end" dominantBaseline="central" fontSize={13} fill={C.ink2}>
              {i}
            </text>
          )}
        </g>
      ))}
      {values.map((v, i) => {
        const cx = x0 + slot * i + slot / 2;
        return (
          <g key={i}>
            <rect x={cx - 22} y={y0 - v * unit} width={44} height={v * unit} fill={FRUITS[i].color} stroke={C.ink} strokeWidth={2} />
            <Fruit id={FRUITS[i].id} x={cx} y={y0 + 26} size={36} />
          </g>
        );
      })}
      <path d={`M${x0},${y0 - max * unit - 6} V${y0} H${x0 + slot * values.length}`} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </svg>
  );
}
