import type { ReactElement } from 'react';
import { C, shade } from '../lib/color';

/** Countable objects drawn in a friendly sticker style. */
export type ThingKind = 'apple' | 'star' | 'ball' | 'fish' | 'cookie' | 'flower' | 'bug' | 'duck';

export const THING_KINDS: ThingKind[] = ['apple', 'star', 'ball', 'fish', 'cookie', 'flower', 'bug', 'duck'];

export const THING_NAMES: Record<ThingKind, [string, string]> = {
  apple: ['apple', 'apples'],
  star: ['star', 'stars'],
  ball: ['ball', 'balls'],
  fish: ['fish', 'fish'],
  cookie: ['cookie', 'cookies'],
  flower: ['flower', 'flowers'],
  bug: ['ladybug', 'ladybugs'],
  duck: ['duck', 'ducks'],
};

export const thingName = (kind: ThingKind, n: number) => THING_NAMES[kind][n === 1 ? 0 : 1];

const S = { stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** Draw one object centred at (x, y). `size` is the diameter in pixels. */
export function Thing({
  kind,
  x = 0,
  y = 0,
  size = 60,
  color,
  faded = false,
}: {
  kind: ThingKind;
  x?: number;
  y?: number;
  size?: number;
  /** Override the main colour (for "colour the ball" style games). */
  color?: string;
  /** Draw as a ghost outline — e.g. an object that was taken away. */
  faded?: boolean;
}) {
  const k = size / 100;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} opacity={faded ? 0.28 : 1}>
      {SHAPES[kind](color)}
    </g>
  );
}

const SHAPES: Record<ThingKind, (color?: string) => ReactElement> = {
  apple: (color = C.red) => (
    <g>
      <path
        d="M0,-26 C-14,-38 -44,-34 -44,-4 C-44,26 -22,44 -8,40 C-3,38 3,38 8,40 C22,44 44,26 44,-4 C44,-34 14,-38 0,-26 Z"
        fill={color}
        {...S}
      />
      <path d="M-26,-10 C-26,-20 -18,-24 -12,-24" fill="none" stroke={C.white} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <path d="M0,-26 C0,-34 2,-40 6,-46" fill="none" {...S} stroke={C.brown} strokeWidth={5} />
      <path d="M4,-38 C12,-50 26,-48 30,-42 C22,-34 10,-34 4,-38 Z" fill={C.green} {...S} />
    </g>
  ),
  star: (color = C.yellow) => (
    <g>
      <path
        d="M0,-46 L13,-16 L45,-14 L20,8 L28,40 L0,23 L-28,40 L-20,8 L-45,-14 L-13,-16 Z"
        fill={color}
        {...S}
      />
      <path d="M-8,-12 L0,-30" stroke={C.white} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
    </g>
  ),
  ball: (color = C.blue) => (
    <g>
      <circle r={42} fill={color} {...S} />
      <path d="M-42,0 C-20,-16 20,-16 42,0" fill="none" stroke={C.white} strokeWidth={7} />
      <path d="M-40,12 C-20,-2 20,-2 40,12" fill="none" stroke={shade(color, -0.25)} strokeWidth={4} opacity={0.6} />
      <circle r={42} fill="none" {...S} />
      <circle cx={-16} cy={-22} r={6} fill={C.white} opacity={0.7} />
    </g>
  ),
  fish: (color = C.orange) => (
    <g>
      <path d="M26,0 L46,-20 L46,20 Z" fill={shade(color, -0.1)} {...S} />
      <ellipse cx={-6} cy={0} rx={36} ry={24} fill={color} {...S} />
      <path d="M2,-22 C6,-10 6,10 2,22" fill="none" stroke={shade(color, -0.3)} strokeWidth={3} />
      <circle cx={-24} cy={-6} r={6} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <circle cx={-23} cy={-6} r={2.5} fill={C.ink} />
    </g>
  ),
  cookie: (color = C.wood) => (
    <g>
      <circle r={42} fill={color} {...S} />
      <circle r={34} fill="none" stroke={shade(color, -0.12)} strokeWidth={3} />
      {[
        [-16, -14],
        [12, -20],
        [18, 8],
        [-6, 14],
        [-22, 10],
        [4, -2],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={5} fill={C.brown} />
      ))}
    </g>
  ),
  flower: (color = C.pink) => (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-24} rx={15} ry={20} fill={color} {...S} transform={`rotate(${a})`} />
      ))}
      <circle r={15} fill={C.yellow} {...S} />
    </g>
  ),
  bug: (color = C.red) => (
    <g>
      <circle cx={0} cy={-30} r={14} fill={C.ink} />
      <ellipse cx={0} cy={4} rx={36} ry={38} fill={color} {...S} />
      <path d="M0,-34 L0,42" {...S} />
      {[
        [-16, -10],
        [16, -10],
        [-20, 16],
        [20, 16],
        [-8, 30],
        [8, 30],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={6} fill={C.ink} />
      ))}
    </g>
  ),
  duck: (color = C.yellow) => (
    <g>
      <path d="M-40,8 C-40,36 30,40 40,14 C44,4 30,0 22,6 L-10,8 C-24,8 -34,0 -40,8 Z" fill={color} {...S} />
      <circle cx={-14} cy={-14} r={22} fill={color} {...S} />
      <path d="M-34,-12 L-50,-8 L-34,-2 Z" fill={C.orange} {...S} />
      <circle cx={-18} cy={-18} r={3.5} fill={C.ink} />
      <path d="M2,14 C10,24 22,22 26,14" fill="none" stroke={shade(color, -0.3)} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
};

/** Lay out `count` objects in rows (as a <g>), starting at (x, y). */
export function ThingRows({
  kind,
  count,
  x = 0,
  y = 0,
  size = 50,
  gap = 10,
  perRow = 5,
  color,
  fadedFrom,
}: {
  kind: ThingKind;
  count: number;
  x?: number;
  y?: number;
  size?: number;
  gap?: number;
  perRow?: number;
  color?: string;
  /** Objects with index >= fadedFrom are drawn faded (taken away). */
  fadedFrom?: number;
}) {
  const step = size + gap;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <Thing
          key={i}
          kind={kind}
          size={size}
          color={color}
          x={x + (i % perRow) * step + size / 2}
          y={y + Math.floor(i / perRow) * step + size / 2}
          faded={fadedFrom !== undefined && i >= fadedFrom}
        />
      ))}
    </g>
  );
}

/** A self-contained picture of `count` objects, sized for a question card. */
export function ThingsPicture({
  kind,
  count,
  perRow = 5,
  color,
  fadedFrom,
}: {
  kind: ThingKind;
  count: number;
  perRow?: number;
  color?: string;
  fadedFrom?: number;
}) {
  const size = 50;
  const gap = 12;
  const cols = Math.min(count, perRow) || 1;
  const rows = Math.ceil(count / perRow) || 1;
  const w = cols * (size + gap) - gap + 16;
  const h = rows * (size + gap) - gap + 16;
  return (
    <svg viewBox={`-8 -8 ${w} ${h}`} role="img" aria-label={`${count} ${thingName(kind, count)}`}>
      <ThingRows kind={kind} count={count} perRow={perRow} size={size} gap={gap} color={color} fadedFrom={fadedFrom} />
    </svg>
  );
}
