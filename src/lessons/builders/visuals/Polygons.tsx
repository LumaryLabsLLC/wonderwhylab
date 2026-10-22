import { C, shade } from '../../../lib/color';
import type { Pt } from '../../../lib/svg';

export type PolyKey = 'right-triangle' | 'triangle' | 'square' | 'rectangle' | 'rhombus' | 'pentagon' | 'hexagon';

const regular = (n: number, r: number, start: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    return { x: Math.round(r * Math.cos(a) * 10) / 10, y: Math.round(r * Math.sin(a) * 10) / 10 };
  });

/** Corner points around (0, 0), going clockwise. All fit inside ±175. */
export const POLYS: Record<PolyKey, { name: string; colour: string; pts: Pt[] }> = {
  'right-triangle': {
    name: 'right-angled triangle',
    colour: C.orange,
    pts: [
      { x: -140, y: -100 },
      { x: 140, y: 120 },
      { x: -140, y: 120 },
    ],
  },
  triangle: { name: 'triangle', colour: C.yellow, pts: regular(3, 165, -90).map((p) => ({ x: p.x, y: p.y + 20 })) },
  square: {
    name: 'square',
    colour: C.blue,
    pts: [
      { x: -120, y: -120 },
      { x: 120, y: -120 },
      { x: 120, y: 120 },
      { x: -120, y: 120 },
    ],
  },
  rectangle: {
    name: 'rectangle',
    colour: C.green,
    pts: [
      { x: -170, y: -100 },
      { x: 170, y: -100 },
      { x: 170, y: 100 },
      { x: -170, y: 100 },
    ],
  },
  rhombus: {
    name: 'rhombus',
    colour: C.pink,
    pts: [
      { x: 0, y: -160 },
      { x: 110, y: 0 },
      { x: 0, y: 160 },
      { x: -110, y: 0 },
    ],
  },
  pentagon: { name: 'pentagon', colour: C.purple, pts: regular(5, 160, -90).map((p) => ({ x: p.x, y: p.y + 12 })) },
  hexagon: { name: 'hexagon', colour: C.teal, pts: regular(6, 160, 0) },
};

export const POLY_KEYS = Object.keys(POLYS) as PolyKey[];

/** The angle at corner i, in degrees. */
export function cornerAngle(pts: Pt[], i: number): number {
  const v = pts[i];
  const a = pts[(i + pts.length - 1) % pts.length];
  const b = pts[(i + 1) % pts.length];
  const ux = a.x - v.x;
  const uy = a.y - v.y;
  const wx = b.x - v.x;
  const wy = b.y - v.y;
  const cos = (ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

export const isRight = (pts: Pt[], i: number) => Math.abs(cornerAngle(pts, i) - 90) < 0.5;

export const rightAngles = (key: PolyKey) => POLYS[key].pts.filter((_, i) => isRight(POLYS[key].pts, i)).length;

export const sideLength = (pts: Pt[], i: number) => {
  const a = pts[i];
  const b = pts[(i + 1) % pts.length];
  return Math.hypot(b.x - a.x, b.y - a.y);
};

/** For each side, which equal-length group it belongs to (0 = no partner). Groups count from 1. */
export function equalGroups(pts: Pt[]): number[] {
  const lens = pts.map((_, i) => Math.round(sideLength(pts, i)));
  const groups = new Map<number, number>();
  return lens.map((l) => {
    if (lens.filter((x) => Math.abs(x - l) <= 1).length < 2) return 0;
    const key = [...groups.keys()].find((k) => Math.abs(k - l) <= 1);
    if (key !== undefined) return groups.get(key)!;
    groups.set(l, groups.size + 1);
    return groups.size;
  });
}

/** Little tick marks across the middle of a side; `count` ticks show which sides are equal. */
export function SideTicks({ a, b, count, colour = C.ink }: { a: Pt; b: Pt; count: number; colour?: string }) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return (
    <g>
      {Array.from({ length: count }, (_, k) => {
        const o = (k - (count - 1) / 2) * 9;
        const cx = mx + ux * o;
        const cy = my + uy * o;
        return <line key={k} x1={cx - uy * 12} y1={cy + ux * 12} x2={cx + uy * 12} y2={cy - ux * 12} stroke={colour} strokeWidth={3.5} strokeLinecap="round" />;
      })}
    </g>
  );
}

/** The little square drawn inside a right-angled corner. */
export function RightMark({ pts, i, size = 22, colour = C.green }: { pts: Pt[]; i: number; size?: number; colour?: string }) {
  const v = pts[i];
  const a = pts[(i + pts.length - 1) % pts.length];
  const b = pts[(i + 1) % pts.length];
  const la = Math.hypot(a.x - v.x, a.y - v.y);
  const lb = Math.hypot(b.x - v.x, b.y - v.y);
  const ua = { x: ((a.x - v.x) / la) * size, y: ((a.y - v.y) / la) * size };
  const ub = { x: ((b.x - v.x) / lb) * size, y: ((b.y - v.y) / lb) * size };
  return (
    <path
      d={`M${v.x + ua.x},${v.y + ua.y} L${v.x + ua.x + ub.x},${v.y + ua.y + ub.y} L${v.x + ub.x},${v.y + ub.y}`}
      fill="none"
      stroke={colour}
      strokeWidth={4}
      strokeLinejoin="round"
    />
  );
}

export const polyPoints = (pts: Pt[], dx = 0, dy = 0) => pts.map((p) => `${p.x + dx},${p.y + dy}`).join(' ');

/** A shape on its own, for questions and picker cards. */
export function PolyCard({ id, marks = false }: { id: PolyKey; marks?: boolean }) {
  const { pts, colour, name } = POLYS[id];
  return (
    <svg viewBox="-185 -185 370 370" role="img" aria-label={name}>
      <polygon points={polyPoints(pts)} fill={shade(colour, 0.55)} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      {marks && pts.map((_, i) => (isRight(pts, i) ? <RightMark key={i} pts={pts} i={i} size={34} colour={C.ink} /> : null))}
    </svg>
  );
}
