import type { ReactElement } from 'react';
import { C, shade } from '../../../../lib/color';

/**
 * Simple map symbols, each drawn centred on (0, 0) in about a 40 × 36 box.
 * Real maps use small symbols like these and explain them in a key (legend).
 */
export type SymId = 'woods' | 'house' | 'school' | 'campsite' | 'mountain' | 'bus' | 'bridge' | 'river' | 'road';

export const SYM_NAME: Record<SymId, string> = {
  woods: 'woods',
  house: 'house',
  school: 'school',
  campsite: 'campsite',
  mountain: 'mountain',
  bus: 'bus stop',
  bridge: 'bridge',
  river: 'river',
  road: 'road',
};

const S = { stroke: C.ink, strokeWidth: 2, strokeLinejoin: 'round' as const };
export const RIVER = shade(C.blue, 0.2);
export const ROAD_GREY = '#9aa0ad';

export const SYM: Record<SymId, () => ReactElement> = {
  woods: () => (
    <g>
      <rect x={-2} y={4} width={4} height={10} fill={C.brown} />
      <circle cy={-4} r={12} fill={C.green} {...S} />
    </g>
  ),
  house: () => (
    <g>
      <rect x={-10} y={-2} width={20} height={14} fill={C.red} {...S} />
      <path d="M-14,-1 L0,-13 L14,-1 Z" fill={shade(C.red, -0.3)} {...S} />
    </g>
  ),
  school: () => (
    <g>
      <rect x={-17} y={-4} width={34} height={18} fill={C.purple} {...S} />
      <path d="M-20,-3 L0,-17 L20,-3 Z" fill={shade(C.purple, -0.3)} {...S} />
      <circle cx={0} cy={-8} r={3.5} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
      <rect x={-4} y={5} width={8} height={9} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
    </g>
  ),
  campsite: () => (
    <g>
      <path d="M-15,12 L0,-14 L15,12 Z" fill={C.orange} {...S} />
      <path d="M0,-14 L0,12 M-5,12 L0,2 L5,12" fill="none" stroke={C.ink} strokeWidth={2} />
    </g>
  ),
  mountain: () => (
    <g>
      <path d="M-18,12 L0,-16 L18,12 Z" fill={C.brown} {...S} />
      <path d="M-6,-6.5 L0,-16 L6,-6.5 L2,-4 L-2,-7 Z" fill={C.white} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  ),
  bus: () => (
    <g>
      <rect x={-16} y={-10} width={32} height={18} rx={4} fill={C.yellow} {...S} />
      <rect x={-12} y={-6} width={8} height={6} fill="#cfe8ff" stroke={C.ink} strokeWidth={1.2} />
      <rect x={-2} y={-6} width={8} height={6} fill="#cfe8ff" stroke={C.ink} strokeWidth={1.2} />
      <circle cx={-9} cy={9} r={3.5} fill={C.ink} />
      <circle cx={9} cy={9} r={3.5} fill={C.ink} />
    </g>
  ),
  // A road crossing a river: the bridge sides run across the river, with flared ends.
  bridge: () => (
    <g>
      <rect x={-20} y={-5} width={40} height={10} fill={RIVER} />
      <rect x={-6} y={-12} width={12} height={24} fill={ROAD_GREY} />
      <path d="M-11,-16 L-6,-11 V11 L-11,16 M11,-16 L6,-11 V11 L11,16" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  river: () => <path d="M-20,4 q5,-10 10,-4 t10,0 t10,0 t10,-4" fill="none" stroke={RIVER} strokeWidth={7} strokeLinecap="round" />,
  road: () => (
    <g>
      <path d="M-20,0 H20" stroke={ROAD_GREY} strokeWidth={10} />
      <path d="M-16,0 H16" stroke={C.white} strokeWidth={2} strokeDasharray="5 4" />
    </g>
  ),
};

/** A symbol placed at (x, y) with a scale. */
export function Sym({ id, x, y, s = 1, rot = 0 }: { id: SymId; x: number; y: number; s?: number; rot?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>{SYM[id]()}</g>;
}

/** A standalone small picture of one symbol (for answer buttons). */
export function SymPic({ id, size = 56 }: { id: SymId; size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="-25 -20 50 40" role="img" aria-label={SYM_NAME[id]}>
      {SYM[id]()}
    </svg>
  );
}

/** A key (legend) box listing symbols, drawn at (x, y). */
export function KeyBox({ x, y, ids, w = 170, row = 34, highlight }: { x: number; y: number; ids: SymId[]; w?: number; row?: number; highlight?: SymId | null }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={34 + ids.length * row} rx={10} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <text x={x + 12} y={y + 23} fontSize={16} fontWeight={800} fill={C.ink}>
        Key
      </text>
      {ids.map((id, i) => {
        const cy = y + 34 + i * row + row / 2;
        return (
          <g key={id}>
            {highlight === id && <rect x={x + 4} y={cy - row / 2 + 2} width={w - 8} height={row - 4} rx={8} fill={shade(C.yellow, 0.4)} />}
            <Sym id={id} x={x + 32} y={cy} s={row / 40} />
            <text x={x + 60} y={cy + 5.5} fontSize={16} fill={C.ink} fontWeight={highlight === id ? 800 : 500}>
              {SYM_NAME[id]}
            </text>
          </g>
        );
      })}
    </g>
  );
}
