import { EMOJI_FONT } from '../../../../games/reading/words';
import { C, shade } from '../../../../lib/color';

export type Animal = 'cat' | 'dog' | 'bug' | 'pig' | 'hen' | 'fox';
export type Place = 'mat' | 'rug' | 'box' | 'mud' | 'egg' | 'log' | 'bed';
export type Rel = 'on' | 'in';

export interface PicSpec {
  animal: Animal;
  place: Place;
  rel: Rel;
}

export const ANIMAL_EMOJI: Record<Animal, string> = { cat: '🐱', dog: '🐶', bug: '🐛', pig: '🐷', hen: '🐔', fox: '🦊' };

/** Places an animal can be IN (the others are only ever ON). */
export const IN_PLACES: Place[] = ['box', 'mud'];

export const describe = (p: PicSpec) => `a ${p.animal} ${p.rel} the ${p.place}`;
export const sameSpec = (a: PicSpec, b: PicSpec) => a.animal === b.animal && a.place === b.place && a.rel === b.rel;

function AnimalAt({ animal, x, y, size = 52 }: { animal: Animal; x: number; y: number; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} style={{ fontFamily: EMOJI_FONT }}>
      {ANIMAL_EMOJI[animal]}
    </text>
  );
}

/** A tiny picture of "a cat on the mat" etc., drawn in a 160 × 120 box. */
export function PicGroup({ spec }: { spec: PicSpec }) {
  const { animal, place, rel } = spec;
  const ink = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  switch (place) {
    case 'mat':
      return (
        <g>
          <rect x={22} y={92} width={116} height={16} rx={3} fill={C.red} {...ink} />
          {[40, 60, 80, 100, 120].map((x) => (
            <line key={x} x1={x} y1={94} x2={x} y2={106} stroke={shade(C.red, 0.5)} strokeWidth={3} />
          ))}
          <AnimalAt animal={animal} x={80} y={64} />
        </g>
      );
    case 'rug':
      return (
        <g>
          <ellipse cx={80} cy={100} rx={66} ry={14} fill={C.blue} {...ink} />
          <ellipse cx={80} cy={100} rx={46} ry={8} fill="none" stroke="white" strokeWidth={2.5} strokeDasharray="6 5" />
          <AnimalAt animal={animal} x={80} y={70} />
        </g>
      );
    case 'box':
      return rel === 'in' ? (
        <g>
          <rect x={34} y={58} width={92} height={18} fill={shade(C.wood, -0.35)} {...ink} />
          <AnimalAt animal={animal} x={80} y={58} size={50} />
          <rect x={34} y={74} width={92} height={40} rx={2} fill={C.wood} {...ink} />
          <path d="M34 74 L18 62 M126 74 L142 62" {...ink} fill="none" />
        </g>
      ) : (
        <g>
          <rect x={34} y={66} width={92} height={48} rx={2} fill={C.wood} {...ink} />
          <line x1={80} y1={66} x2={80} y2={114} stroke={shade(C.wood, -0.3)} strokeWidth={2} />
          <AnimalAt animal={animal} x={80} y={40} size={48} />
        </g>
      );
    case 'mud':
      return rel === 'in' ? (
        <g>
          <AnimalAt animal={animal} x={80} y={66} size={54} />
          <path d="M14 96 C24 78 56 84 80 82 C110 80 138 76 146 96 C150 112 20 116 14 96 Z" fill="#8a5a2b" {...ink} />
          <ellipse cx={58} cy={96} rx={10} ry={3} fill="#a9774a" />
          <ellipse cx={106} cy={100} rx={8} ry={2.5} fill="#a9774a" />
        </g>
      ) : (
        <g>
          <ellipse cx={80} cy={104} rx={62} ry={10} fill="#8a5a2b" {...ink} />
          <AnimalAt animal={animal} x={80} y={74} />
        </g>
      );
    case 'egg':
      return (
        <g>
          <text x={80} y={98} textAnchor="middle" dominantBaseline="central" fontSize={34} style={{ fontFamily: EMOJI_FONT }}>
            🥚
          </text>
          <AnimalAt animal={animal} x={80} y={58} size={48} />
        </g>
      );
    case 'log':
      return (
        <g>
          <rect x={18} y={84} width={124} height={26} rx={13} fill={C.brown} {...ink} />
          <ellipse cx={130} cy={97} rx={8} ry={12} fill={shade(C.brown, 0.4)} {...ink} />
          <AnimalAt animal={animal} x={78} y={58} />
        </g>
      );
    case 'bed':
      return (
        <g>
          <rect x={18} y={50} width={12} height={60} rx={3} fill={C.brown} {...ink} />
          <rect x={26} y={76} width={118} height={26} rx={6} fill={C.blue} {...ink} />
          <rect x={30} y={68} width={34} height={14} rx={6} fill="white" {...ink} />
          <line x1={34} y1={102} x2={34} y2={112} {...ink} />
          <line x1={136} y1={102} x2={136} y2={112} {...ink} />
          <AnimalAt animal={animal} x={98} y={56} size={46} />
        </g>
      );
  }
}

/** The same picture as a standalone SVG, for question cards. */
export function PicCard({ spec }: { spec: PicSpec }) {
  return (
    <svg viewBox="6 12 148 104" role="img" aria-label={describe(spec)}>
      <PicGroup spec={spec} />
    </svg>
  );
}
