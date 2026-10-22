import { C, shade } from '../../../../lib/color';

/** Neutral play notes: a number and the word "coins", no country's money. */
export const NOTES = [20, 50, 100] as const;

const NOTE_COLOUR: Record<number, string> = { 20: '#9fd8b4', 50: '#a9c8f2', 100: '#d7b8f0' };

/** One bank note centred on (x, y). */
export function Bill({ v, x, y, w = 120, h = 64 }: { v: number; x: number; y: number; w?: number; h?: number }) {
  const fill = NOTE_COLOUR[v] ?? '#cfe3c8';
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x - w / 2 + 3} y={y - h / 2 + 4} width={w} height={h} rx={8} fill={C.ink} opacity={0.12} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} fill={fill} stroke={shade(fill, -0.45)} strokeWidth={3} />
      <rect x={x - w / 2 + 7} y={y - h / 2 + 7} width={w - 14} height={h - 14} rx={5} fill="none" stroke={shade(fill, -0.3)} strokeWidth={1.5} strokeDasharray="4 4" />
      <circle cx={x - w / 2 + 22} cy={y} r={h * 0.22} fill={shade(fill, 0.4)} stroke={shade(fill, -0.3)} strokeWidth={1.5} />
      <text x={x + 10} y={y - 3} textAnchor="middle" dominantBaseline="central" fontSize={h * 0.42} fontWeight={800} fill={C.ink}>
        {v}
      </text>
      <text x={x + 10} y={y + h * 0.3} textAnchor="middle" fontSize={h * 0.16} fontWeight={600} fill={C.ink2}>
        coins
      </text>
    </g>
  );
}

/** A note as a standalone picture for question cards. */
export function BillPicture({ v, label }: { v: number; label?: string }) {
  return (
    <svg viewBox="0 0 180 100" role="img" aria-label={label ?? `A ${v}-coin note`}>
      <Bill v={v} x={90} y={50} w={160} h={84} />
    </svg>
  );
}

/** Simple jar with a label and a level of coins (0–1), drawn with its top-left at (x, y). */
export function Jar({ x, y, w, h, label, colour, level }: { x: number; y: number; w: number; h: number; label: string; colour: string; level: number }) {
  const inner = Math.max(0, Math.min(1, level));
  const fillH = (h - 40) * inner;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x + w * 0.18} y={y} width={w * 0.64} height={18} rx={6} fill={shade(colour, -0.15)} stroke={C.ink} strokeWidth={2} />
      <rect x={x} y={y + 16} width={w} height={h - 16} rx={22} fill="#ffffffcc" stroke={C.ink} strokeWidth={2.5} />
      {fillH > 0 && <rect x={x + 6} y={y + h - 6 - fillH} width={w - 12} height={fillH} rx={16} fill={shade(colour, 0.35)} />}
      <rect x={x + 14} y={y + 34} width={w - 28} height={34} rx={8} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + 51} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
        {label}
      </text>
    </g>
  );
}
