import type { ReactNode } from 'react';
import { C, shade } from '../../../lib/color';
import type { Pt } from '../../../lib/svg';

/**
 * Classifying triangles and quadrilaterals from their corners.
 * Points are in SVG space (y down). Lengths and angles use small tolerances,
 * so a shape that looks equal or square to the eye is named that way.
 */

const LEN_TOL = 1.04;
const ANGLE_TOL = 3;

export type AngleKind = 'acute' | 'right' | 'obtuse';
export type TriSides = 'equilateral' | 'isosceles' | 'scalene';
export type QuadName = 'square' | 'rectangle' | 'rhombus' | 'parallelogram' | 'trapezium' | 'kite' | 'quadrilateral' | 'concave' | 'crossed' | 'flat';

export interface ShapeInfo {
  /** Tick marks for each side (side i joins corner i to corner i + 1); 0 = none. */
  ticks: number[];
  /** Kind of angle at each corner. */
  angles: AngleKind[];
  /** Chevrons for each side: sides with the same non-zero number are parallel. */
  parallel: number[];
  flat: boolean;
}

export interface TriInfo extends ShapeInfo {
  sides: TriSides;
  angleType: AngleKind;
}

export interface QuadInfo extends ShapeInfo {
  name: QuadName;
  parallelPairs: number;
  rightAngles: number;
}

const sub = (a: Pt, b: Pt) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v: Pt) => Math.hypot(v.x, v.y);
const cross = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;

export function sideLengths(pts: Pt[]): number[] {
  return pts.map((p, i) => len(sub(pts[(i + 1) % pts.length], p)));
}

/** Interior angle at each corner, in degrees (for a simple polygon, either winding). */
export function cornerAngles(pts: Pt[]): number[] {
  const n = pts.length;
  const area = signedArea(pts);
  return pts.map((p, i) => {
    const a = sub(pts[(i + n - 1) % n], p);
    const b = sub(pts[(i + 1) % n], p);
    const deg = (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b) || 1)))) * 180) / Math.PI;
    // A reflex corner turns the "wrong" way compared with the polygon's winding.
    const turn = cross(sub(p, pts[(i + n - 1) % n]), sub(pts[(i + 1) % n], p));
    return Math.sign(turn) !== Math.sign(area) && Math.abs(turn) > 1e-6 ? 360 - deg : deg;
  });
}

function signedArea(pts: Pt[]): number {
  return pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % pts.length]), 0) / 2;
}

const kindOf = (deg: number): AngleKind => (Math.abs(deg - 90) <= ANGLE_TOL ? 'right' : deg < 90 ? 'acute' : 'obtuse');
const same = (a: number, b: number) => Math.max(a, b) / Math.max(1e-9, Math.min(a, b)) <= LEN_TOL;

function isParallel(u: Pt, v: Pt) {
  return Math.abs(cross(u, v)) / (len(u) * len(v) || 1) <= Math.sin((ANGLE_TOL * Math.PI) / 180);
}

/** Group equal sides: sides in the same group (of 2+) share a tick count. */
function tickGroups(lengths: number[]): number[] {
  const ticks = lengths.map(() => 0);
  let mark = 0;
  lengths.forEach((l, i) => {
    if (ticks[i]) return;
    const group = lengths.map((m, j) => (j !== i && !ticks[j] && same(l, m) ? j : -1)).filter((j) => j >= 0);
    if (!group.length) return;
    mark++;
    for (const j of [i, ...group]) ticks[j] = mark;
  });
  return ticks;
}

/** Too thin to count: some corner lies (almost) on the line through its neighbours. */
function isFlat(pts: Pt[]) {
  const n = pts.length;
  return pts.some((p, i) => {
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const base = len(sub(b, a));
    return base > 0 && Math.abs(cross(sub(p, a), sub(b, a))) / base < 12;
  });
}

function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  const d1 = cross(sub(p4, p3), sub(p1, p3));
  const d2 = cross(sub(p4, p3), sub(p2, p3));
  const d3 = cross(sub(p2, p1), sub(p3, p1));
  const d4 = cross(sub(p2, p1), sub(p4, p1));
  return d1 * d2 < 0 && d3 * d4 < 0;
}

export function classifyTriangle(pts: Pt[]): TriInfo {
  const lengths = sideLengths(pts);
  const angles = cornerAngles(pts).map(kindOf);
  const flat = isFlat(pts);
  const ticks = tickGroups(lengths);
  const equal = ticks.filter((t) => t > 0).length;
  const sides: TriSides = equal === 3 ? 'equilateral' : equal === 2 ? 'isosceles' : 'scalene';
  if (sides === 'equilateral') ticks.fill(1);
  const angleType: AngleKind = angles.includes('right') ? 'right' : angles.includes('obtuse') ? 'obtuse' : 'acute';
  return { sides, angleType, ticks, angles, parallel: [0, 0, 0], flat };
}

export function classifyQuad(pts: Pt[]): QuadInfo {
  const [a, b, c, d] = pts;
  const dirs = pts.map((p, i) => sub(pts[(i + 1) % 4], p));
  const lengths = sideLengths(pts);
  const crossed = segmentsCross(a, b, c, d) || segmentsCross(b, c, d, a);
  const flat = isFlat(pts);
  const degs = crossed ? [0, 0, 0, 0] : cornerAngles(pts);
  const angles = degs.map(kindOf);
  const concave = degs.some((g) => g > 180 + ANGLE_TOL);
  const p1 = isParallel(dirs[0], dirs[2]);
  const p2 = isParallel(dirs[1], dirs[3]);
  const parallel = [p1 ? 1 : 0, p2 ? (p1 ? 2 : 1) : 0, p1 ? 1 : 0, p2 ? (p1 ? 2 : 1) : 0];
  const rightAngles = angles.filter((k) => k === 'right').length;
  let ticks = tickGroups(lengths);
  const allEqual = ticks.every((t) => t === 1);
  const parallelPairs = (p1 ? 1 : 0) + (p2 ? 1 : 0);

  let name: QuadName;
  if (crossed) name = 'crossed';
  else if (flat) name = 'flat';
  else if (concave) name = 'concave';
  else if (parallelPairs === 2) name = rightAngles === 4 ? (allEqual ? 'square' : 'rectangle') : allEqual ? 'rhombus' : 'parallelogram';
  else if (parallelPairs === 1) name = 'trapezium';
  else if ((same(lengths[0], lengths[1]) && same(lengths[2], lengths[3])) || (same(lengths[1], lengths[2]) && same(lengths[3], lengths[0]))) name = 'kite';
  else name = 'quadrilateral';

  // Keep the marks honest for the name: opposite sides of a parallelogram pair up.
  if (name === 'parallelogram' || name === 'rectangle') ticks = [1, 2, 1, 2];
  if (crossed) ticks = [0, 0, 0, 0];
  return { name, ticks, angles: crossed ? ['acute', 'acute', 'acute', 'acute'] : angles, parallel: crossed ? [0, 0, 0, 0] : parallel, flat, parallelPairs, rightAngles };
}

/** Tick marks, parallel chevrons and right-angle squares for a polygon. */
export function ShapeMarks({ pts, info, size = 1, arcs = false }: { pts: Pt[]; info: ShapeInfo; size?: number; arcs?: boolean }) {
  const n = pts.length;
  const parts: ReactNode[] = [];
  const PAR = [C.blue, C.purple];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % n];
    const v = sub(q, p);
    const L = len(v) || 1;
    // Opposite sides run opposite ways round the shape; flip one so paired chevrons agree.
    const partner = (i + 2) % n;
    const ref = sub(pts[(Math.min(i, partner) + 1) % n], pts[Math.min(i, partner)]);
    const flip = n === 4 && i > partner && dot(v, ref) < 0 ? -1 : 1;
    const ux = (flip * v.x) / L;
    const uy = (flip * v.y) / L;
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    // ticks
    for (let k = 0; k < info.ticks[i]; k++) {
      const off = (k - (info.ticks[i] - 1) / 2) * 7 * size;
      const cx = mx + ux * off;
      const cy = my + uy * off;
      parts.push(
        <line key={`t${i}-${k}`} x1={cx - uy * 9 * size} y1={cy + ux * 9 * size} x2={cx + uy * 9 * size} y2={cy - ux * 9 * size} stroke={C.red} strokeWidth={3 * size} strokeLinecap="round" />,
      );
    }
    // parallel chevrons, set off from the middle so they don't sit on the ticks
    const pc = info.parallel[i];
    if (pc) {
      for (let k = 0; k < pc; k++) {
        const t = -L * 0.22 + k * 9 * size;
        const cx = mx + ux * t;
        const cy = my + uy * t;
        const s = 8 * size;
        parts.push(
          <path
            key={`p${i}-${k}`}
            d={`M${cx - ux * s - uy * s},${cy - uy * s + ux * s} L${cx},${cy} L${cx - ux * s + uy * s},${cy - uy * s - ux * s}`}
            fill="none"
            stroke={PAR[pc - 1]}
            strokeWidth={3 * size}
            strokeLinecap="round"
            strokeLinejoin="round"
          />,
        );
      }
    }
  });
  // corners
  pts.forEach((p, i) => {
    const a = sub(pts[(i + n - 1) % n], p);
    const b = sub(pts[(i + 1) % n], p);
    const la = len(a) || 1;
    const lb = len(b) || 1;
    const kind = info.angles[i];
    if (kind === 'right') {
      const s = 16 * size;
      const ax = (a.x / la) * s;
      const ay = (a.y / la) * s;
      const bx = (b.x / lb) * s;
      const by = (b.y / lb) * s;
      parts.push(<path key={`r${i}`} d={`M${p.x + ax},${p.y + ay} L${p.x + ax + bx},${p.y + ay + by} L${p.x + bx},${p.y + by}`} fill="none" stroke={C.ink} strokeWidth={2.5 * size} />);
    } else if (arcs) {
      const r = 26 * size;
      const s0 = { x: p.x + (a.x / la) * r, y: p.y + (a.y / la) * r };
      const s1 = { x: p.x + (b.x / lb) * r, y: p.y + (b.y / lb) * r };
      // Sweep the short way round, inside the corner (SVG y points down).
      const sweep = cross(a, b) > 0 ? 1 : 0;
      parts.push(
        <path
          key={`a${i}`}
          d={`M${s0.x},${s0.y} A${r},${r} 0 0 ${sweep} ${s1.x},${s1.y}`}
          fill="none"
          stroke={kind === 'obtuse' ? C.orange : C.green}
          strokeWidth={4 * size}
          strokeLinecap="round"
        />,
      );
    }
  });
  return <g>{parts}</g>;
}

/** A small marked-up polygon for question cards. */
export function ShapePicture({ pts, marks = true, arcs = false, label }: { pts: Pt[]; marks?: boolean; arcs?: boolean; label: string }) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs) - 24;
  const minY = Math.min(...ys) - 24;
  const w = Math.max(...xs) - minX + 24;
  const h = Math.max(...ys) - minY + 24;
  const info = pts.length === 3 ? classifyTriangle(pts) : classifyQuad(pts);
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} role="img" aria-label={label}>
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={shade(C.teal, 0.75)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      {marks && <ShapeMarks pts={pts} info={info} size={0.8} arcs={arcs} />}
    </svg>
  );
}
