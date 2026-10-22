import type { ReactElement } from 'react';
import { C, shade } from '../../../../lib/color';

/** Life-cycle stage pictures, drawn around (0, 0), about 110 × 80. */
export type StageId = 'butterfly-egg' | 'caterpillar' | 'chrysalis' | 'butterfly' | 'frogspawn' | 'tadpole' | 'froglet' | 'frog';

const ink = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const FROG = '#5cbf6a';

const ART: Record<StageId, () => ReactElement> = {
  'butterfly-egg': () => (
    <g>
      <path d="M-50,20 C-30,-30 30,-30 50,10 C20,30 -20,34 -50,20 Z" fill={C.green} {...ink} />
      <path d="M-40,18 C-10,0 20,-4 44,8" fill="none" stroke={shade(C.green, -0.3)} strokeWidth={2} />
      {[-14, 0, 14, 7].map((x, i) => (
        <ellipse key={i} cx={x} cy={i === 3 ? -10 : 0} rx={6} ry={8} fill="#fff6cf" {...ink} strokeWidth={1.8} />
      ))}
    </g>
  ),
  caterpillar: () => (
    <g>
      {[-40, -26, -12, 2, 16, 30].map((x, i) => (
        <circle key={i} cx={x} cy={10 - (i % 2) * 6} r={12} fill={i % 2 ? C.green : shade(C.green, 0.25)} {...ink} />
      ))}
      <circle cx={44} cy={0} r={14} fill={C.green} {...ink} />
      <circle cx={48} cy={-3} r={3} fill={C.ink} />
      <path d="M44,-14 L40,-26 M50,-13 L56,-24" {...ink} />
    </g>
  ),
  chrysalis: () => (
    <g>
      <path d="M-50,-36 L50,-36" stroke={C.brown} strokeWidth={6} strokeLinecap="round" />
      <path d="M0,-34 L0,-28" {...ink} />
      <path d="M0,-28 C-18,-20 -20,10 -8,30 C-4,36 4,36 8,30 C20,10 18,-20 0,-28 Z" fill="#9ccf6e" {...ink} />
      <path d="M-10,-6 C-2,-2 2,-2 10,-6 M-12,8 C-2,12 2,12 12,8" fill="none" stroke={shade('#9ccf6e', -0.3)} strokeWidth={2} />
    </g>
  ),
  butterfly: () => (
    <g>
      <path d="M0,-4 C-30,-40 -56,-24 -46,0 C-40,12 -16,10 0,4 Z" fill={C.orange} {...ink} />
      <path d="M0,-4 C30,-40 56,-24 46,0 C40,12 16,10 0,4 Z" fill={C.orange} {...ink} />
      <path d="M0,4 C-24,8 -34,30 -18,34 C-8,36 -2,22 0,10 Z" fill={C.purple} {...ink} />
      <path d="M0,4 C24,8 34,30 18,34 C8,36 2,22 0,10 Z" fill={C.purple} {...ink} />
      <ellipse cx={0} cy={6} rx={4} ry={22} fill={C.ink} />
      <path d="M-2,-14 L-10,-30 M2,-14 L10,-30" {...ink} />
      <circle cx={-28} cy={-14} r={5} fill={C.white} opacity={0.8} />
      <circle cx={28} cy={-14} r={5} fill={C.white} opacity={0.8} />
    </g>
  ),
  frogspawn: () => (
    <g>
      {[
        [-30, 0],
        [-12, -14],
        [8, -6],
        [28, -16],
        [-20, 18],
        [2, 14],
        [24, 10],
        [40, 2],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={13} fill="rgba(190,230,240,0.7)" {...ink} strokeWidth={1.8} />
          <circle cx={x} cy={y} r={4} fill={C.ink} />
        </g>
      ))}
    </g>
  ),
  tadpole: () => (
    <g>
      <path d="M0,0 C20,-10 40,10 56,-6 C46,14 24,14 0,6 Z" fill={shade(C.ink, 0.25)} {...ink} />
      <ellipse cx={-14} cy={2} rx={22} ry={18} fill={shade(C.ink, 0.25)} {...ink} />
      <circle cx={-22} cy={-4} r={4} fill={C.white} />
    </g>
  ),
  froglet: () => (
    <g>
      <path d="M14,8 C30,8 40,20 48,16" fill="none" stroke={FROG} strokeWidth={7} strokeLinecap="round" />
      <ellipse cx={-4} cy={6} rx={28} ry={18} fill={FROG} {...ink} />
      <path d="M-26,16 L-36,28 M18,16 L26,28 M-20,0 L-34,-6 M14,0 L26,-8" {...ink} strokeWidth={4} />
      <circle cx={-16} cy={-8} r={7} fill={C.white} {...ink} strokeWidth={2} />
      <circle cx={2} cy={-8} r={7} fill={C.white} {...ink} strokeWidth={2} />
      <circle cx={-15} cy={-8} r={3} fill={C.ink} />
      <circle cx={3} cy={-8} r={3} fill={C.ink} />
    </g>
  ),
  frog: () => (
    <g>
      <path d="M-40,22 C-52,30 -54,8 -36,6 M40,22 C52,30 54,8 36,6" fill={FROG} {...ink} />
      <ellipse cx={0} cy={10} rx={40} ry={24} fill={FROG} {...ink} />
      <circle cx={-16} cy={-14} r={11} fill={FROG} {...ink} />
      <circle cx={16} cy={-14} r={11} fill={FROG} {...ink} />
      <circle cx={-16} cy={-14} r={5} fill={C.ink} />
      <circle cx={16} cy={-14} r={5} fill={C.ink} />
      <path d="M-16,12 C-6,20 6,20 16,12" fill="none" {...ink} />
    </g>
  ),
};

export function StageArt({ id, s = 1 }: { id: StageId; s?: number }) {
  return <g transform={`scale(${s})`}>{ART[id]()}</g>;
}

/** A stage picture as a standalone SVG for question buttons. */
export function StagePicture({ id }: { id: StageId }) {
  return (
    <svg viewBox="-60 -45 120 90" role="img" aria-label={id.replace('-', ' ')}>
      <StageArt id={id} />
    </svg>
  );
}
