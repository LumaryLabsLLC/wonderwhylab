import type { ReactElement } from 'react';
import { C, shade } from '../../../../lib/color';

/**
 * Everyday room things drawn two ways: from the side, and from above (a bird's-eye view).
 * Each drawing is centred on (0, 0) and fits roughly in a 100 × 80 box.
 */
export type ThingId = 'bed' | 'table' | 'chair' | 'box' | 'plant' | 'rug';

export const THING_NAMES: Record<ThingId, string> = {
  bed: 'bed',
  table: 'table',
  chair: 'chair',
  box: 'toy box',
  plant: 'plant',
  rug: 'rug',
};

const S = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const };

export const SIDE: Record<ThingId, () => ReactElement> = {
  bed: () => (
    <g>
      <rect x={-50} y={-36} width={12} height={58} rx={3} fill={C.wood} {...S} />
      <rect x={-46} y={-6} width={94} height={22} rx={4} fill={C.blue} {...S} />
      <rect x={-38} y={-18} width={26} height={14} rx={5} fill={C.white} {...S} />
      <rect x={-46} y={16} width={6} height={10} fill={C.brown} {...S} />
      <rect x={42} y={16} width={6} height={10} fill={C.brown} {...S} />
    </g>
  ),
  table: () => (
    <g>
      <rect x={-44} y={-22} width={88} height={10} rx={4} fill={C.wood} {...S} />
      <rect x={-6} y={-12} width={12} height={34} fill={C.brown} {...S} />
      <rect x={-22} y={22} width={44} height={8} rx={3} fill={C.brown} {...S} />
    </g>
  ),
  chair: () => (
    <g>
      <rect x={10} y={-40} width={10} height={44} rx={3} fill={C.red} {...S} />
      <rect x={-22} y={0} width={42} height={10} rx={3} fill={C.red} {...S} />
      <rect x={-20} y={10} width={6} height={22} fill={shade(C.red, -0.3)} {...S} />
      <rect x={12} y={10} width={6} height={22} fill={shade(C.red, -0.3)} {...S} />
    </g>
  ),
  box: () => (
    <g>
      <rect x={-34} y={-20} width={68} height={46} rx={4} fill={C.yellow} {...S} />
      <rect x={-38} y={-28} width={76} height={12} rx={4} fill={shade(C.yellow, -0.15)} {...S} />
      <circle cx={0} cy={4} r={7} fill={C.white} {...S} />
    </g>
  ),
  plant: () => (
    <g>
      <path d="M-20,4 L20,4 L14,32 L-14,32 Z" fill={C.orange} {...S} />
      <path d="M0,4 C-24,-6 -30,-26 -14,-34 C-6,-22 -2,-12 0,4 Z" fill={C.green} {...S} />
      <path d="M0,4 C24,-6 30,-26 14,-34 C6,-22 2,-12 0,4 Z" fill={C.green} {...S} />
      <path d="M0,4 C-4,-16 -2,-34 0,-42 C2,-34 4,-16 0,4 Z" fill={shade(C.green, -0.15)} {...S} />
    </g>
  ),
  rug: () => (
    <g>
      <rect x={-48} y={16} width={96} height={8} rx={3} fill={C.purple} {...S} />
    </g>
  ),
};

export const TOP: Record<ThingId, () => ReactElement> = {
  bed: () => (
    <g>
      <rect x={-26} y={-44} width={52} height={88} rx={6} fill={C.blue} {...S} />
      <rect x={-18} y={-38} width={36} height={18} rx={6} fill={C.white} {...S} />
      <path d="M-26,-12 L26,-12" stroke={C.ink} strokeWidth={2} />
    </g>
  ),
  table: () => (
    <g>
      <circle r={36} fill={C.wood} {...S} />
      <circle r={28} fill="none" stroke={shade(C.wood, -0.2)} strokeWidth={2} />
    </g>
  ),
  chair: () => (
    <g>
      <rect x={-22} y={-22} width={44} height={44} rx={4} fill={C.red} {...S} />
      <rect x={-22} y={-22} width={44} height={10} rx={3} fill={shade(C.red, -0.3)} {...S} />
    </g>
  ),
  box: () => (
    <g>
      <rect x={-30} y={-26} width={60} height={52} rx={4} fill={C.yellow} {...S} />
      <path d="M-30,-8 L30,-8" stroke={C.ink} strokeWidth={2} />
    </g>
  ),
  plant: () => (
    <g>
      <circle r={22} fill={C.orange} {...S} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-16} rx={9} ry={18} fill={C.green} {...S} transform={`rotate(${a})`} />
      ))}
    </g>
  ),
  rug: () => (
    <g>
      <rect x={-40} y={-28} width={80} height={56} rx={6} fill={C.purple} {...S} />
      <rect x={-30} y={-18} width={60} height={36} rx={4} fill="none" stroke={C.white} strokeWidth={3} />
    </g>
  ),
};

/** A drawing placed at (x, y) and scaled. */
export function Drawn({ draw, x, y, s = 1 }: { draw: () => ReactElement; x: number; y: number; s?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{draw()}</g>;
}

/** A small standalone picture for answer buttons and question cards. */
export function ThingPic({ id, view, size = 70 }: { id: ThingId; view: 'side' | 'top'; size?: number }) {
  const draw = view === 'side' ? SIDE[id] : TOP[id];
  return (
    <svg width={size} height={size * 0.8} viewBox="-55 -50 110 88" role="img" aria-label={`${THING_NAMES[id]} from ${view === 'side' ? 'the side' : 'above'}`}>
      {draw()}
    </svg>
  );
}
