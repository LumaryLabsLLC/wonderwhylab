import { C, shade } from '../../../lib/color';

/** Room layout shared by the "Where Is It?" scene and its question pictures (1000-wide world). */
export const FLOOR = 540;
export const SHELF = { x1: 400, x2: 640, y: 236 };
export const TABLE = { x1: 380, x2: 660, y: 360 };
export const BOX = { x1: 130, x2: 290, top: 470, inside: 515 };
export const CHAIR = { x1: 760, x2: 880, y: 430 };

export type Spot =
  | 'on the table'
  | 'under the table'
  | 'in the box'
  | 'above the table'
  | 'on the chair'
  | 'under the chair'
  | 'next to the box'
  | 'next to the chair'
  | 'between the box and the table'
  | 'between the table and the chair'
  | 'in front of the box'
  | 'behind the box';

export interface TeddyPos {
  x: number;
  /** Where its feet rest. */
  feet: number;
  /** Depth when standing at the box: behind it or in front of it. */
  back?: boolean;
}

export const SPOT_POS: Record<Spot, TeddyPos> = {
  'on the table': { x: 520, feet: TABLE.y },
  'under the table': { x: 520, feet: FLOOR },
  'in the box': { x: 210, feet: BOX.inside },
  'above the table': { x: 520, feet: SHELF.y },
  'on the chair': { x: 815, feet: CHAIR.y },
  'under the chair': { x: 815, feet: FLOOR },
  'next to the box': { x: 70, feet: FLOOR },
  'next to the chair': { x: 935, feet: FLOOR },
  'between the box and the table': { x: 336, feet: FLOOR },
  'between the table and the chair': { x: 710, feet: FLOOR },
  'in front of the box': { x: 210, feet: FLOOR + 10 },
  'behind the box': { x: 210, feet: FLOOR - 40, back: true },
};

/** Describe where the teddy is, from its position. */
export function spotOf(p: TeddyPos): Spot {
  if (p.feet === SHELF.y) return 'above the table';
  if (p.feet === TABLE.y) return 'on the table';
  if (p.feet === CHAIR.y) return 'on the chair';
  if (p.feet === BOX.inside) return 'in the box';
  const x = p.x;
  if (x >= BOX.x1 && x <= BOX.x2) return p.back ? 'behind the box' : 'in front of the box';
  if (x < BOX.x1) return 'next to the box';
  if (x < TABLE.x1 + 10) return 'between the box and the table';
  if (x <= TABLE.x2 - 10) return 'under the table';
  if (x < CHAIR.x1) return 'between the table and the chair';
  if (x <= CHAIR.x2 + 10) return 'under the chair';
  return 'next to the chair';
}

/** Where a teddy dropped with its middle at (x, y) comes to rest: on the first surface below it. */
export function landing(x: number, y: number): TeddyPos {
  const feet = y + 38;
  const surfaces = [
    { x1: SHELF.x1 + 10, x2: SHELF.x2 - 10, y: SHELF.y },
    { x1: TABLE.x1 + 5, x2: TABLE.x2 - 5, y: TABLE.y },
    { x1: CHAIR.x1 + 5, x2: CHAIR.x2 - 5, y: CHAIR.y },
    { x1: BOX.x1 + 14, x2: BOX.x2 - 14, y: BOX.inside, onlyFromAbove: BOX.top },
    { x1: 30, x2: 970, y: FLOOR },
  ];
  const cx = Math.min(965, Math.max(35, x));
  const hit = surfaces
    .filter((s) => cx >= s.x1 && cx <= s.x2 && s.y >= feet - 20 && (!('onlyFromAbove' in s) || feet - 20 <= (s.onlyFromAbove as number)))
    .sort((a, b) => a.y - b.y)[0];
  return { x: cx, feet: hit ? hit.y : FLOOR };
}

export function Teddy({ x, feet, scale = 1 }: { x: number; feet: number; scale?: number }) {
  const s = { stroke: C.ink, strokeWidth: 2.5 / scale };
  const fur = C.brown;
  const light = shade(C.brown, 0.45);
  return (
    <g transform={`translate(${x} ${feet}) scale(${scale})`}>
      <ellipse cx={-14} cy={-6} rx={11} ry={7} fill={fur} {...s} />
      <ellipse cx={14} cy={-6} rx={11} ry={7} fill={fur} {...s} />
      <ellipse cx={0} cy={-30} rx={24} ry={26} fill={fur} {...s} />
      <ellipse cx={0} cy={-26} rx={14} ry={15} fill={light} />
      <circle cx={-17} cy={-80} r={10} fill={fur} {...s} />
      <circle cx={17} cy={-80} r={10} fill={fur} {...s} />
      <circle cx={0} cy={-64} r={22} fill={fur} {...s} />
      <ellipse cx={0} cy={-58} rx={10} ry={8} fill={light} />
      <circle cx={-8} cy={-68} r={2.8} fill={C.ink} />
      <circle cx={8} cy={-68} r={2.8} fill={C.ink} />
      <circle cx={0} cy={-61} r={3.4} fill={C.ink} />
    </g>
  );
}

function Shelf() {
  return (
    <g>
      <rect x={SHELF.x1} y={SHELF.y} width={SHELF.x2 - SHELF.x1} height={14} rx={3} fill={shade(C.wood, -0.1)} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${SHELF.x1 + 30},${SHELF.y + 14} v24 h22 M${SHELF.x2 - 30},${SHELF.y + 14} v24 h-22`} fill="none" stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

function Table() {
  return (
    <g>
      <rect x={TABLE.x1 + 14} y={TABLE.y + 16} width={18} height={FLOOR - TABLE.y - 16} fill={shade(C.wood, -0.25)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={TABLE.x2 - 32} y={TABLE.y + 16} width={18} height={FLOOR - TABLE.y - 16} fill={shade(C.wood, -0.25)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={TABLE.x1} y={TABLE.y} width={TABLE.x2 - TABLE.x1} height={18} rx={4} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

function Chair() {
  return (
    <g>
      <rect x={CHAIR.x2 - 18} y={CHAIR.y - 130} width={16} height={130} rx={3} fill={C.blue} stroke={C.ink} strokeWidth={2.5} />
      <rect x={CHAIR.x1 + 8} y={CHAIR.y + 12} width={12} height={FLOOR - CHAIR.y - 12} fill={shade(C.blue, -0.25)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={CHAIR.x2 - 18} y={CHAIR.y + 12} width={12} height={FLOOR - CHAIR.y - 12} fill={shade(C.blue, -0.25)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={CHAIR.x1} y={CHAIR.y} width={CHAIR.x2 - CHAIR.x1} height={14} rx={4} fill={C.blue} stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

export function BoxBack() {
  return <rect x={BOX.x1 + 8} y={BOX.top - 16} width={BOX.x2 - BOX.x1 - 16} height={20} fill={shade(C.orange, -0.35)} stroke={C.ink} strokeWidth={2} />;
}

export function BoxFront() {
  // Lets a teddy inside the box be grabbed straight through the front.
  return (
    <g pointerEvents="none">
      <rect x={BOX.x1} y={BOX.top} width={BOX.x2 - BOX.x1} height={FLOOR - BOX.top} rx={4} fill={C.orange} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${BOX.x1 + 16},${BOX.top + 20} h${BOX.x2 - BOX.x1 - 32}`} stroke={shade(C.orange, -0.2)} strokeWidth={3} />
    </g>
  );
}

/** The room behind the teddy (everything except the box front, which may cover the teddy). */
export function RoomBack() {
  return (
    <g>
      <rect x={0} y={124} width={1000} height={FLOOR - 124} fill={shade(C.paper, 0.45)} />
      <rect x={0} y={FLOOR} width={1000} height={80} fill={shade(C.wood, 0.35)} />
      <line x1={0} y1={FLOOR} x2={1000} y2={FLOOR} stroke={C.ink} strokeWidth={2.5} />
      <Shelf />
      <Table />
      <Chair />
      <BoxBack />
    </g>
  );
}

/** A small picture of the room with the teddy at one spot, for practice questions. */
/** Crop each question picture to the part of the room that matters, so the teddy is big enough to see. */
function cropFor(spot: Spot): string {
  if (/chair/.test(spot)) return '330 130 670 450';
  if (/box/.test(spot)) return '0 130 700 450';
  return '150 130 670 450';
}

export function RoomPicture({ spot }: { spot: Spot }) {
  const p = SPOT_POS[spot];
  return (
    <svg viewBox={cropFor(spot)} role="img" aria-label={`The teddy is ${spot}`}>
      <RoomBack />
      {p.back && <Teddy x={p.x} feet={p.feet} scale={0.85} />}
      {p.feet === BOX.inside && <Teddy x={p.x} feet={p.feet} />}
      <BoxFront />
      {!p.back && p.feet !== BOX.inside && <Teddy x={p.x} feet={p.feet} />}
    </svg>
  );
}
