import type { ReactElement } from 'react';
import { C, shade } from '../../../../lib/color';

/** Everyday things for the Little Scientists lessons, drawn in the same sticker style as `Thing`. */
export type ObjKind =
  | 'apple'
  | 'rock'
  | 'leaf'
  | 'coin'
  | 'duck'
  | 'key'
  | 'sponge'
  | 'block'
  | 'spoon'
  | 'log'
  | 'ball'
  | 'marble'
  | 'paperclip'
  | 'nail'
  | 'cap'
  | 'eraser'
  | 'brick'
  | 'foil'
  | 'soup'
  | 'icecream'
  | 'snowman'
  | 'sun'
  | 'fire'
  | 'icecube'
  | 'cocoa'
  | 'popsicle';

export const OBJ_NAMES: Record<ObjKind, string> = {
  apple: 'apple',
  rock: 'rock',
  leaf: 'leaf',
  coin: 'coin',
  duck: 'rubber duck',
  key: 'key',
  sponge: 'sponge',
  block: 'wooden block',
  spoon: 'metal spoon',
  log: 'big log',
  ball: 'beach ball',
  marble: 'glass marble',
  paperclip: 'paperclip',
  nail: 'iron nail',
  cap: 'bottle cap',
  eraser: 'eraser',
  brick: 'plastic brick',
  foil: 'foil ball',
  soup: 'hot soup',
  icecream: 'ice cream',
  snowman: 'snowman',
  sun: 'sun',
  fire: 'campfire',
  icecube: 'ice cube',
  cocoa: 'hot cocoa',
  popsicle: 'ice lolly',
};

const S = { stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const METAL = '#b8c2cc';

const DRAW: Record<ObjKind, () => ReactElement> = {
  apple: () => (
    <g>
      <path d="M0,-24 C-14,-36 -42,-32 -42,-4 C-42,24 -22,42 -8,38 C-3,36 3,36 8,38 C22,42 42,24 42,-4 C42,-32 14,-36 0,-24 Z" fill={C.red} {...S} />
      <path d="M-24,-10 C-24,-18 -17,-22 -11,-22" fill="none" stroke={C.white} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <path d="M0,-24 C0,-32 2,-38 6,-44" fill="none" {...S} stroke={C.brown} strokeWidth={5} />
      <path d="M4,-36 C12,-48 26,-46 30,-40 C22,-32 10,-32 4,-36 Z" fill={C.green} {...S} />
    </g>
  ),
  rock: () => (
    <g>
      <path d="M-40,12 C-44,-12 -24,-32 0,-30 C24,-34 44,-12 40,10 C42,30 18,36 -6,34 C-30,36 -40,28 -40,12 Z" fill="#9aa3ad" {...S} />
      <path d="M-18,-10 l8,6 M10,-16 l10,4 M4,14 l12,-2" stroke={shade('#9aa3ad', -0.35)} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  leaf: () => (
    <g>
      <path d="M-38,30 C-42,-10 -10,-40 38,-36 C38,10 8,40 -38,30 Z" fill={C.green} {...S} />
      <path d="M-34,26 C-8,6 12,-12 30,-28" fill="none" stroke={shade(C.green, -0.35)} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  coin: () => (
    <g>
      <circle r={32} fill="#d4874b" {...S} />
      <circle r={22} fill="none" stroke={shade('#d4874b', -0.3)} strokeWidth={3} />
      <text y={2} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={shade('#d4874b', -0.45)}>
        1
      </text>
    </g>
  ),
  duck: () => (
    <g>
      <path d="M-40,8 C-40,36 30,40 40,14 C44,4 30,0 22,6 L-10,8 C-24,8 -34,0 -40,8 Z" fill={C.yellow} {...S} />
      <circle cx={-14} cy={-14} r={22} fill={C.yellow} {...S} />
      <path d="M-34,-12 L-50,-8 L-34,-2 Z" fill={C.orange} {...S} />
      <circle cx={-18} cy={-18} r={3.5} fill={C.ink} />
    </g>
  ),
  key: () => (
    <g>
      <circle cx={-24} cy={0} r={18} fill="#e0b84a" {...S} />
      <circle cx={-24} cy={0} r={7} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <path d="M-6,-6 H40 V6 H-6 Z" fill="#e0b84a" {...S} />
      <path d="M24,6 V18 H32 V6 M12,6 V14 H18 V6" fill="#e0b84a" {...S} />
    </g>
  ),
  sponge: () => (
    <g>
      <rect x={-40} y={-26} width={80} height={52} rx={10} fill={C.yellow} {...S} />
      <rect x={-40} y={8} width={80} height={18} rx={6} fill={C.green} {...S} />
      {[
        [-24, -12],
        [-4, -16],
        [18, -10],
        [-12, -2],
        [10, -2],
        [28, -16],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={4} fill={shade(C.yellow, -0.25)} />
      ))}
    </g>
  ),
  block: () => (
    <g>
      <rect x={-34} y={-34} width={68} height={68} rx={6} fill={C.wood} {...S} />
      <path d="M-24,-20 C-6,-26 6,-14 24,-20 M-24,0 C-6,-6 6,6 24,0 M-24,20 C-6,14 6,26 24,20" fill="none" stroke={shade(C.wood, -0.3)} strokeWidth={2.5} />
    </g>
  ),
  spoon: () => (
    <g transform="rotate(-35)">
      <ellipse cx={0} cy={-22} rx={16} ry={22} fill={METAL} {...S} />
      <rect x={-5} y={-2} width={10} height={48} rx={5} fill={METAL} {...S} />
      <ellipse cx={-5} cy={-28} rx={4} ry={8} fill={C.white} opacity={0.7} />
    </g>
  ),
  log: () => (
    <g>
      <path d="M-44,-18 H34 A12,18 0 0 1 34,18 H-44 Z" fill="#a8743f" {...S} />
      <ellipse cx={-44} cy={0} rx={12} ry={18} fill="#d9a86c" {...S} />
      <ellipse cx={-44} cy={0} rx={6} ry={9} fill="none" stroke={shade('#a8743f', -0.2)} strokeWidth={2} />
      <path d="M-24,-8 H20 M-20,8 H24" stroke={shade('#a8743f', -0.3)} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  ),
  ball: () => (
    <g>
      <circle r={40} fill={C.white} {...S} />
      <path d="M0,-40 C-22,-20 -22,20 0,40 C-30,30 -40,10 -40,0 C-40,-18 -24,-36 0,-40 Z" fill={C.red} />
      <path d="M0,-40 C22,-20 22,20 0,40 C30,30 40,10 40,0 C40,-18 24,-36 0,-40 Z" fill={C.blue} />
      <circle r={40} fill="none" {...S} />
      <circle r={8} fill={C.yellow} {...S} />
    </g>
  ),
  marble: () => (
    <g>
      <circle r={26} fill="#bfe4f5" {...S} />
      <path d="M-14,8 C-4,-12 10,12 16,-6" fill="none" stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
      <circle cx={-9} cy={-11} r={5} fill={C.white} opacity={0.8} />
    </g>
  ),
  paperclip: () => (
    <path
      d="M-30,8 V-14 A12,12 0 0 1 -6,-14 V18 A8,8 0 0 0 10,18 V-20 A14,14 0 0 1 38,-20 V14"
      fill="none"
      stroke={shade(METAL, -0.35)}
      strokeWidth={6}
      strokeLinecap="round"
      transform="rotate(-20) translate(-4 0)"
    />
  ),
  nail: () => (
    <g transform="rotate(-30)">
      <rect x={-22} y={-30} width={44} height={10} rx={3} fill="#8a939c" {...S} />
      <path d="M-6,-20 H6 V26 L0,40 L-6,26 Z" fill="#8a939c" {...S} />
    </g>
  ),
  cap: () => (
    <g>
      <path
        d={Array.from({ length: 21 }, (_, i) => {
          const a = (i / 20) * Math.PI * 2;
          const r = i % 2 ? 26 : 32;
          return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
        }).join(' ') + 'Z'}
        fill={C.red}
        {...S}
      />
      <circle r={17} fill={shade(C.red, 0.2)} stroke={C.ink} strokeWidth={2.5} />
    </g>
  ),
  eraser: () => (
    <g transform="rotate(-12)">
      <rect x={-38} y={-18} width={76} height={36} rx={8} fill={C.pink} {...S} />
      <rect x={-2} y={-18} width={40} height={36} rx={4} fill={C.blue} {...S} />
    </g>
  ),
  brick: () => (
    <g>
      <rect x={-22} y={-30} width={14} height={10} rx={2} fill={C.red} {...S} />
      <rect x={8} y={-30} width={14} height={10} rx={2} fill={C.red} {...S} />
      <rect x={-34} y={-22} width={68} height={46} rx={6} fill={C.red} {...S} />
    </g>
  ),
  foil: () => (
    <g>
      <path d="M-30,-10 L-12,-32 L14,-30 L32,-10 L28,18 L8,32 L-18,30 L-32,12 Z" fill="#d3dae1" {...S} />
      <path d="M-12,-32 L-4,-6 L14,-30 M-4,-6 L28,18 M-4,-6 L-18,30 M-4,-6 L-30,-10" fill="none" stroke="#9aa6b2" strokeWidth={2} />
    </g>
  ),
  soup: () => (
    <g>
      <path d="M-30,-28 c-6,-8 6,-14 0,-22 M0,-28 c-6,-8 6,-14 0,-22 M30,-28 c-6,-8 6,-14 0,-22" fill="none" stroke={C.muted} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M-42,-14 H42 C42,14 24,34 0,34 C-24,34 -42,14 -42,-14 Z" fill={C.orange} {...S} />
      <ellipse cx={0} cy={-14} rx={42} ry={8} fill="#f8c27a" {...S} />
    </g>
  ),
  icecream: () => (
    <g>
      <path d="M-22,-4 L0,44 L22,-4 Z" fill={C.wood} {...S} />
      <path d="M-14,8 L10,4 M-8,22 L8,18" stroke={shade(C.wood, -0.35)} strokeWidth={2.5} />
      <circle cx={0} cy={-18} r={24} fill={C.pink} {...S} />
      <circle cx={-8} cy={-26} r={5} fill={C.white} opacity={0.7} />
    </g>
  ),
  snowman: () => (
    <g>
      <circle cx={0} cy={18} r={26} fill={C.white} {...S} />
      <circle cx={0} cy={-22} r={18} fill={C.white} {...S} />
      <circle cx={-6} cy={-26} r={2.5} fill={C.ink} />
      <circle cx={6} cy={-26} r={2.5} fill={C.ink} />
      <path d="M0,-21 L14,-18 L0,-16 Z" fill={C.orange} stroke={C.ink} strokeWidth={1.5} />
      <rect x={-16} y={-46} width={32} height={8} rx={2} fill={C.ink} />
      <rect x={-10} y={-60} width={20} height={16} rx={2} fill={C.ink} />
    </g>
  ),
  sun: () => (
    <g>
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d="M0,-46 V-34" stroke={C.orange} strokeWidth={5} strokeLinecap="round" transform={`rotate(${i * 36})`} />
      ))}
      <circle r={26} fill={C.yellow} {...S} />
    </g>
  ),
  fire: () => (
    <g>
      <path d="M-36,34 L30,18 M-30,18 L36,34" stroke="#8a5a2b" strokeWidth={10} strokeLinecap="round" />
      <path d="M0,24 C-26,22 -28,-4 -12,-18 C-10,-6 -4,-4 -2,-8 C-6,-24 6,-38 14,-44 C12,-28 30,-14 26,6 C24,18 14,24 0,24 Z" fill={C.orange} {...S} />
      <path d="M0,20 C-10,18 -12,6 -4,-2 C-2,6 4,4 6,0 C10,8 10,18 0,20 Z" fill={C.yellow} />
    </g>
  ),
  icecube: () => (
    <g>
      <path d="M-28,-14 L4,-30 L32,-16 L32,22 L0,38 L-28,22 Z" fill="#cfeaf8" {...S} />
      <path d="M-28,-14 L0,0 L32,-16 M0,0 V38" fill="none" stroke={C.ink} strokeWidth={2} />
      <path d="M-18,-6 L-10,-2" stroke={C.white} strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  cocoa: () => (
    <g>
      <path d="M-18,-30 c-6,-8 6,-14 0,-22 M6,-30 c-6,-8 6,-14 0,-22" fill="none" stroke={C.muted} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M20,-10 C40,-10 40,18 20,18" fill="none" {...S} strokeWidth={6} />
      <rect x={-30} y={-22} width={52} height={56} rx={8} fill={C.blue} {...S} />
      <ellipse cx={-4} cy={-22} rx={26} ry={6} fill="#7a4a2b" {...S} />
    </g>
  ),
  popsicle: () => (
    <g>
      <rect x={-5} y={18} width={10} height={28} rx={4} fill={C.wood} {...S} />
      <rect x={-22} y={-40} width={44} height={62} rx={18} fill={C.purple} {...S} />
      <path d="M-10,-28 V6" stroke={C.white} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
    </g>
  ),
};

/** Draw an object centred at (x, y); `size` is roughly its diameter in pixels. */
export function Obj({ kind, x = 0, y = 0, size = 70 }: { kind: ObjKind; x?: number; y?: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size / 100})`}>{DRAW[kind]()}</g>;
}

/** A standalone picture of one object (for question cards and choice buttons). */
export function ObjPicture({ kind, caption }: { kind: ObjKind; caption?: boolean }) {
  return (
    <svg viewBox={caption ? '-62 -58 124 142' : '-58 -58 116 116'} role="img" aria-label={OBJ_NAMES[kind]}>
      <Obj kind={kind} size={100} />
      {caption && (
        <text y={72} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.ink}>
          {OBJ_NAMES[kind]}
        </text>
      )}
    </svg>
  );
}

/** Two or three objects side by side, as one question picture. */
export function ObjRow({ kinds }: { kinds: ObjKind[] }) {
  return (
    <svg viewBox={`-58 -58 ${kinds.length * 130} 116`} role="img" aria-label={kinds.map((k) => OBJ_NAMES[k]).join(', ')}>
      {kinds.map((k, i) => (
        <Obj key={k} kind={k} x={i * 130} size={96} />
      ))}
    </svg>
  );
}
