import type { ReactElement } from 'react';
import { C, shade } from '../../../../lib/color';

/**
 * Homes that suit their place, and simple pictures of those places.
 * Each home is drawn centred on x = 0 with its base on y = 50, about 120 wide.
 */
export type HomeId = 'stilt' | 'steep' | 'flats' | 'earth' | 'ger';

export const HOMES: Record<HomeId, { name: string; place: string; why: string }> = {
  stilt: { name: 'stilt house', place: 'By the water', why: 'Tall legs called stilts keep the home dry when the water rises.' },
  steep: { name: 'steep-roof house', place: 'Snowy mountains', why: 'Heavy snow slides off the steep roof, so the roof does not break.' },
  flats: { name: 'block of flats', place: 'Busy city', why: 'Many homes are stacked up high, so lots of families fit on a little land.' },
  earth: { name: 'thick earth house', place: 'Hot, dry land', why: 'Thick walls of earth keep the home cool inside on hot days.' },
  ger: { name: 'ger (round tent)', place: 'Wide grassland', why: 'A ger can be taken down and carried when the family moves with their animals.' },
};

const S = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const };

export const HOME_ART: Record<HomeId, () => ReactElement> = {
  stilt: () => (
    <g>
      {[-38, -14, 14, 38].map((x) => (
        <rect key={x} x={x - 3} y={2} width={6} height={48} fill={C.brown} {...S} strokeWidth={2} />
      ))}
      <rect x={-46} y={-24} width={92} height={28} rx={2} fill={C.wood} {...S} />
      <rect x={-10} y={-18} width={18} height={22} fill={shade(C.brown, -0.2)} {...S} strokeWidth={2} />
      <path d="M-58,-22 L0,-54 L58,-22 Z" fill={C.yellow} {...S} />
      <path d="M20,4 L30,50 M30,4 L40,50 M22,16 L33,16 M25,30 L36,30 M28,42 L38,42" stroke={C.ink} strokeWidth={2} />
    </g>
  ),
  steep: () => (
    <g>
      <rect x={-34} y={0} width={68} height={50} fill={C.red} {...S} />
      <rect x={-8} y={22} width={16} height={28} fill={shade(C.brown, -0.2)} {...S} strokeWidth={2} />
      <rect x={14} y={10} width={14} height={14} fill="#cfe8ff" {...S} strokeWidth={2} />
      <path d="M-44,4 L0,-60 L44,4 Z" fill={C.brown} {...S} />
      <path d="M-30,-16 L0,-60 L30,-16 L20,-12 L10,-20 L0,-14 L-12,-22 L-22,-12 Z" fill={C.white} {...S} strokeWidth={2} />
    </g>
  ),
  flats: () => (
    <g>
      <rect x={-34} y={-62} width={68} height={112} rx={3} fill={C.blue} {...S} />
      {[-50, -30, -10, 10].map((y) =>
        [-22, 0, 22].map((x) => <rect key={`${x}${y}`} x={x - 6} y={y} width={12} height={12} fill="#cfe8ff" stroke={C.ink} strokeWidth={1.5} />),
      )}
      <rect x={-8} y={32} width={16} height={18} fill={shade(C.brown, -0.2)} {...S} strokeWidth={2} />
    </g>
  ),
  earth: () => (
    <g>
      <path d="M-50,50 L-50,-14 Q-50,-22 -42,-22 L42,-22 Q50,-22 50,-14 L50,50 Z" fill={shade(C.orange, 0.15)} {...S} />
      {[-34, -12, 12, 34].map((x) => (
        <rect key={x} x={x - 3} y={-16} width={6} height={6} fill={C.brown} stroke={C.ink} strokeWidth={1.5} />
      ))}
      <rect x={-10} y={14} width={20} height={36} rx={9} fill={shade(C.brown, -0.25)} {...S} strokeWidth={2} />
      <rect x={-38} y={6} width={12} height={12} rx={2} fill={shade(C.brown, -0.4)} {...S} strokeWidth={2} />
      <rect x={26} y={6} width={12} height={12} rx={2} fill={shade(C.brown, -0.4)} {...S} strokeWidth={2} />
    </g>
  ),
  ger: () => (
    <g>
      <path d="M-52,50 L-52,4 L52,4 L52,50 Z" fill={C.white} {...S} />
      <path d="M-56,6 Q0,-46 56,6 Z" fill={C.white} {...S} />
      <path d="M-52,22 L52,22" stroke={C.red} strokeWidth={4} />
      <rect x={-12} y={-30} width={24} height={8} rx={3} fill={C.wood} {...S} strokeWidth={2} />
      <rect x={-12} y={20} width={24} height={30} fill={C.orange} {...S} strokeWidth={2} />
    </g>
  ),
};

/** A small standalone picture of a home, for answer buttons. */
export function HomePic({ id, size = 70 }: { id: HomeId; size?: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="-66 -66 132 120" role="img" aria-label={HOMES[id].name}>
      {HOME_ART[id]()}
    </svg>
  );
}

/** Background picture of each place, drawn inside a w × h panel at (0, 0). */
export function PlaceBackdrop({ id, w, h }: { id: HomeId; w: number; h: number }) {
  const g = h - 54; // ground line
  switch (id) {
    case 'stilt':
      return (
        <g>
          <rect width={w} height={h} fill="#dff1ff" />
          <rect y={g + 8} width={w} height={h - g - 8} fill={shade(C.blue, 0.35)} />
          {[0.2, 0.55, 0.85].map((f) => (
            <path key={f} d={`M${w * f - 14},${g + 26} q7,-6 14,0 t14,0`} fill="none" stroke={C.white} strokeWidth={2.5} strokeLinecap="round" />
          ))}
          <path d={`M10,${g + 8} l6,-26 M18,${g + 8} l2,-30 M26,${g + 8} l-3,-24`} stroke={C.green} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case 'steep':
      return (
        <g>
          <rect width={w} height={h} fill="#e8f0fa" />
          <path d={`M0,${g} L${w * 0.28},${g - 120} L${w * 0.55},${g} Z`} fill={shade(C.purple, 0.55)} />
          <path d={`M${w * 0.35},${g} L${w * 0.7},${g - 140} L${w},${g} Z`} fill={shade(C.purple, 0.45)} />
          <path d={`M${w * 0.28 - 24},${g - 72} L${w * 0.28},${g - 120} L${w * 0.28 + 24},${g - 72} Z`} fill={C.white} />
          <path d={`M${w * 0.7 - 28},${g - 84} L${w * 0.7},${g - 140} L${w * 0.7 + 28},${g - 84} Z`} fill={C.white} />
          <rect y={g} width={w} height={h - g} fill={C.white} />
          {[
            [0.15, 0.25],
            [0.45, 0.15],
            [0.85, 0.3],
            [0.3, 0.45],
            [0.6, 0.38],
          ].map(([fx, fy]) => (
            <circle key={fx} cx={w * fx} cy={h * fy} r={3} fill={C.white} stroke={C.line} strokeWidth={1} />
          ))}
        </g>
      );
    case 'flats':
      return (
        <g>
          <rect width={w} height={h} fill="#eef1f7" />
          {[
            [6, 90],
            [38, 130],
            [74, 70],
            [112, 150],
            [146, 100],
          ].map(([x, t]) => (
            <rect key={x} x={x} y={g - t} width={30} height={t} fill={shade(C.muted, 0.6)} />
          ))}
          <rect y={g} width={w} height={h - g} fill={shade(C.muted, 0.3)} />
          <path d={`M10,${g + 30} H${w - 10}`} stroke={C.white} strokeWidth={3} strokeDasharray="14 10" />
        </g>
      );
    case 'earth':
      return (
        <g>
          <rect width={w} height={h} fill="#fff4d6" />
          <circle cx={w - 36} cy={40} r={22} fill={C.yellow} stroke={C.orange} strokeWidth={3} />
          <path d={`M0,${g + 4} Q${w * 0.3},${g - 14} ${w * 0.6},${g} T${w},${g - 4} V${h} H0 Z`} fill={shade(C.yellow, 0.35)} />
          <rect y={g} width={w} height={h - g} fill={shade(C.orange, 0.55)} />
          <circle cx={22} cy={g + 26} r={5} fill={shade(C.brown, 0.3)} />
          <circle cx={w - 24} cy={g + 34} r={4} fill={shade(C.brown, 0.3)} />
        </g>
      );
    case 'ger':
      return (
        <g>
          <rect width={w} height={h} fill="#e6f6ff" />
          <path d={`M0,${g - 30} Q${w * 0.3},${g - 70} ${w * 0.6},${g - 34} T${w},${g - 40} V${g} H0 Z`} fill={shade(C.green, 0.35)} />
          <rect y={g - 10} width={w} height={h - g + 10} fill={shade(C.green, 0.15)} />
        </g>
      );
  }
}
