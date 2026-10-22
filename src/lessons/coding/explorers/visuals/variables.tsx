import { C, shade } from '../../../../lib/color';
import { EVENT_COLOR, SCORE_COLOR, Star } from './events';

export type StackLine = { kind: 'hat'; text: string; star?: boolean } | { kind: 'var'; text: string };

/** A small stack of event hats and variable blocks ("set score to 0", "change score by 2"), for practice pictures. */
export function StackPicture({ lines, w = 360 }: { lines: StackLine[]; w?: number }) {
  const h = 46;
  const gap = 8;
  const H = lines.length * (h + gap) - gap;
  return (
    <svg viewBox={`-4 -4 ${w + 8} ${H + 10}`} role="img" aria-label={lines.map((l) => l.text).join(', ')}>
      {lines.map((l, i) => {
        const y = i * (h + gap);
        const x = l.kind === 'hat' ? 0 : 26;
        const color = l.kind === 'hat' ? EVENT_COLOR : SCORE_COLOR;
        return (
          <g key={i}>
            <rect x={x + 2} y={y + 4} width={w - x} height={h} rx={12} fill={shade(color, -0.3)} />
            <rect x={x} y={y} width={w - x} height={h} rx={12} fill={color} stroke={C.ink} strokeWidth={2} />
            {l.kind === 'hat' && l.star && <Star cx={x + 24} cy={y + h / 2} r={13} />}
            <text x={x + (l.kind === 'hat' && l.star ? 46 : 16)} y={y + h / 2} dominantBaseline="central" fontSize={19} fontWeight={800} fill={l.kind === 'hat' ? C.ink : 'white'}>
              {l.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A variable shown like a scoreboard: its name and its value in a box. */
export function VarMonitor({ x, y, name, value, w = 170, pulse }: { x: number; y: number; name: string; value: number; w?: number; pulse?: boolean }) {
  const h = 64;
  return (
    <g>
      <rect x={x + 3} y={y + 5} width={w} height={h} rx={14} fill={C.ink} opacity={0.12} />
      <rect x={x} y={y} width={w} height={h} rx={14} fill={shade(SCORE_COLOR, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={x + 14} y={y + h / 2} dominantBaseline="central" fontSize={20} fontWeight={800} fill={C.ink}>
        {name}
      </text>
      <g key={pulse ? value : 'still'} className={pulse ? 'pop-in' : undefined} style={pulse ? { transformOrigin: `${x + w - 45}px ${y + h / 2}px` } : undefined}>
        <rect x={x + w - 78} y={y + 9} width={66} height={h - 18} rx={10} fill={SCORE_COLOR} stroke={C.ink} strokeWidth={2} />
        <text x={x + w - 45} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={800} fill="white" className="num">
          {value}
        </text>
      </g>
    </g>
  );
}
