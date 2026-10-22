import { useId } from 'react';
import { C, shade } from '../../../lib/color';

/** A tiny 3D renderer for convex solids: rotate, project, shade the faces that face us. */

export type V3 = [number, number, number];

interface FaceDef {
  idx: number[];
  curved?: boolean;
}

export type SolidId = 'cube' | 'cuboid' | 'sphere' | 'cylinder' | 'cone' | 'pyramid';

export interface SolidDef {
  id: SolidId;
  name: string;
  color: string;
  verts: V3[];
  faces: FaceDef[];
  /** Indices of real corners (vertices). */
  corners: number[];
  sphere?: boolean;
  flat: number;
  curved: number;
  edges: number;
  vertices: number;
  rolls: boolean;
  /** "Like a dice" */
  like: string;
}

const ring = (n: number, r: number, y: number): V3[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });

function box(w: number, h: number, d: number): { verts: V3[]; faces: FaceDef[] } {
  const [x, y, z] = [w / 2, h / 2, d / 2];
  const verts: V3[] = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ];
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]].map((idx) => ({ idx }));
  return { verts, faces };
}

const N = 28;

export const SOLIDS: SolidDef[] = [
  { id: 'cube', name: 'Cube', color: C.red, ...box(1.5, 1.5, 1.5), corners: [0, 1, 2, 3, 4, 5, 6, 7], flat: 6, curved: 0, edges: 12, vertices: 8, rolls: false, like: 'a dice' },
  { id: 'cuboid', name: 'Cuboid', color: C.orange, ...box(2.2, 1.05, 1.25), corners: [0, 1, 2, 3, 4, 5, 6, 7], flat: 6, curved: 0, edges: 12, vertices: 8, rolls: false, like: 'a cereal box' },
  { id: 'sphere', name: 'Sphere', color: C.blue, verts: [], faces: [], corners: [], sphere: true, flat: 0, curved: 1, edges: 0, vertices: 0, rolls: true, like: 'a ball' },
  {
    id: 'cylinder',
    name: 'Cylinder',
    color: C.green,
    verts: [...ring(N, 0.72, 0.8), ...ring(N, 0.72, -0.8)],
    faces: [
      { idx: Array.from({ length: N }, (_, i) => i) },
      { idx: Array.from({ length: N }, (_, i) => N + i) },
      ...Array.from({ length: N }, (_, i) => ({ idx: [i, (i + 1) % N, N + ((i + 1) % N), N + i], curved: true })),
    ],
    corners: [],
    flat: 2,
    curved: 1,
    edges: 2,
    vertices: 0,
    rolls: true,
    like: 'a tin can',
  },
  {
    id: 'cone',
    name: 'Cone',
    color: C.yellow,
    verts: [...ring(N, 0.85, -0.7), [0, 1.0, 0]],
    faces: [
      { idx: Array.from({ length: N }, (_, i) => i) },
      ...Array.from({ length: N }, (_, i) => ({ idx: [i, (i + 1) % N, N], curved: true })),
    ],
    corners: [N],
    flat: 1,
    curved: 1,
    edges: 1,
    vertices: 1,
    rolls: true,
    like: 'a party hat',
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    color: C.purple,
    verts: [[-0.85, -0.7, -0.85], [0.85, -0.7, -0.85], [0.85, -0.7, 0.85], [-0.85, -0.7, 0.85], [0, 0.95, 0]],
    faces: [{ idx: [0, 1, 2, 3] }, { idx: [0, 1, 4] }, { idx: [1, 2, 4] }, { idx: [2, 3, 4] }, { idx: [3, 0, 4] }],
    corners: [0, 1, 2, 3, 4],
    flat: 5,
    curved: 0,
    edges: 8,
    vertices: 5,
    rolls: false,
    like: 'a tent',
  },
];

export const solid = (id: SolidId) => SOLIDS.find((s) => s.id === id)!;

function rotate([x, y, z]: V3, yaw: number, pitch: number): V3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const LIGHT = norm([-0.45, 0.7, 0.6]);

export interface Projected {
  /** Screen x, y and depth z (bigger z = closer to the viewer). */
  pts: V3[];
  faces: { idx: number[]; curved: boolean; visible: boolean; light: number; center: [number, number]; facing: number }[];
  edges: { a: number; b: number; sharp: boolean; visibleFaces: number }[];
  cornerVisible: (i: number) => boolean;
}

/** Rotate and project a solid around screen point (cx, cy) with `scale` pixels per unit. */
export function project(def: SolidDef, yaw: number, pitch: number, cx: number, cy: number, scale: number): Projected {
  const world = def.verts.map((v) => rotate(v, yaw, pitch));
  const D = 7;
  const pts: V3[] = world.map(([x, y, z]) => {
    const k = D / (D - z);
    return [cx + x * scale * k, cy - y * scale * k, z];
  });
  const faces = def.faces.map((f) => {
    const [a, b, c] = [world[f.idx[0]], world[f.idx[1]], world[f.idx[2]]];
    let n = norm(cross(sub(b, a), sub(c, a)));
    const centroid = f.idx.reduce<V3>((acc, i) => [acc[0] + world[i][0], acc[1] + world[i][1], acc[2] + world[i][2]], [0, 0, 0]).map((v) => v / f.idx.length) as V3;
    if (dot(n, centroid) < 0) n = [-n[0], -n[1], -n[2]];
    const sx = f.idx.reduce((s, i) => s + pts[i][0], 0) / f.idx.length;
    const sy = f.idx.reduce((s, i) => s + pts[i][1], 0) / f.idx.length;
    return { idx: f.idx, curved: !!f.curved, visible: n[2] > 1e-4, light: Math.max(0, dot(n, LIGHT)), center: [sx, sy] as [number, number], facing: n[2] };
  });
  const map = new Map<string, { a: number; b: number; faces: number[] }>();
  faces.forEach((f, fi) =>
    f.idx.forEach((a, i) => {
      const b = f.idx[(i + 1) % f.idx.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const e = map.get(key) ?? { a, b, faces: [] };
      e.faces.push(fi);
      map.set(key, e);
    }),
  );
  const edges = [...map.values()].map((e) => ({
    a: e.a,
    b: e.b,
    sharp: e.faces.some((fi) => !faces[fi].curved),
    visibleFaces: e.faces.filter((fi) => faces[fi].visible).length,
  }));
  const cornerVisible = (i: number) => faces.some((f) => f.visible && f.idx.includes(i));
  return { pts, faces, edges, cornerVisible };
}

const FACE_TINTS = [C.red, C.yellow, C.blue, C.green, C.purple, C.pink];

/** Draw a solid. Shows hidden edges and corners as dashed ghosts when highlighting them. */
export function SolidView({
  def,
  yaw,
  pitch,
  cx,
  cy,
  scale,
  showFaces = false,
  showEdges = false,
  showCorners = false,
  strokeWidth = 3,
}: {
  def: SolidDef;
  yaw: number;
  pitch: number;
  cx: number;
  cy: number;
  scale: number;
  showFaces?: boolean;
  showEdges?: boolean;
  showCorners?: boolean;
  strokeWidth?: number;
}) {
  const gid = useId().replace(/:/g, '');
  if (def.sphere) {
    const R = scale * 0.95;
    const lines = [0, 1].map((which) =>
      Array.from({ length: 49 }, (_, i) => {
        const t = (i / 48) * Math.PI * 2;
        const v: V3 = which === 0 ? [Math.cos(t) * 0.95, 0, Math.sin(t) * 0.95] : [0, Math.cos(t) * 0.95, Math.sin(t) * 0.95];
        const [x, y, z] = rotate(v, yaw, pitch);
        return [cx + x * scale, cy - y * scale, z] as V3;
      }),
    );
    return (
      <g>
        <defs>
          <radialGradient id={`sph-${gid}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={shade(showFaces ? C.teal : def.color, 0.55)} />
            <stop offset="55%" stopColor={showFaces ? C.teal : def.color} />
            <stop offset="100%" stopColor={shade(showFaces ? C.teal : def.color, -0.4)} />
          </radialGradient>
        </defs>
        <ellipse cx={cx} cy={cy + R + 18} rx={R * 0.8} ry={R * 0.14} fill={C.ink} opacity={0.15} />
        <circle cx={cx} cy={cy} r={R} fill={`url(#sph-${gid})`} stroke={C.ink} strokeWidth={strokeWidth} />
        {lines.map((pts, li) =>
          pts.slice(1).map((p, i) => {
            const q = pts[i];
            const front = p[2] + q[2] > 0;
            return (
              <line
                key={`${li}-${i}`}
                x1={q[0]}
                y1={q[1]}
                x2={p[0]}
                y2={p[1]}
                stroke={C.ink}
                strokeWidth={front ? 1.6 : 1}
                opacity={front ? 0.45 : 0.15}
                strokeDasharray={front ? undefined : '4 5'}
              />
            );
          }),
        )}
      </g>
    );
  }

  const p = project(def, yaw, pitch, cx, cy, scale);
  const pt = (i: number) => `${p.pts[i][0]},${p.pts[i][1]}`;
  const lowest = Math.max(...p.pts.map((q) => q[1]));
  let flatIndex = 0;
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx={cx} cy={lowest + 20} rx={scale * 1.05} ry={scale * 0.16} fill={C.ink} opacity={0.14} />
      {p.faces.map((f, fi) => {
        const tint = f.curved ? C.teal : FACE_TINTS[flatIndex++ % FACE_TINTS.length];
        if (!f.visible) return null;
        const base = showFaces ? tint : def.color;
        const fill = shade(base, -0.32 + f.light * 0.5);
        return <polygon key={fi} points={f.idx.map(pt).join(' ')} fill={fill} stroke={f.curved ? fill : 'none'} strokeWidth={f.curved ? 1.2 : 0} />;
      })}
      {/* hidden edges, as dashed ghosts */}
      {showEdges &&
        p.edges
          .filter((e) => e.sharp && e.visibleFaces === 0)
          .map((e, i) => (
            <line key={`h${i}`} x1={p.pts[e.a][0]} y1={p.pts[e.a][1]} x2={p.pts[e.b][0]} y2={p.pts[e.b][1]} stroke={C.teal} strokeWidth={2.5} strokeDasharray="6 6" opacity={0.7} />
          ))}
      {p.edges.map((e, i) => {
        const outline = e.sharp ? e.visibleFaces > 0 : e.visibleFaces === 1;
        if (!outline) return null;
        const hl = showEdges && e.sharp;
        return (
          <line
            key={i}
            x1={p.pts[e.a][0]}
            y1={p.pts[e.a][1]}
            x2={p.pts[e.b][0]}
            y2={p.pts[e.b][1]}
            stroke={hl ? C.teal : C.ink}
            strokeWidth={hl ? strokeWidth * 2 : strokeWidth}
          />
        );
      })}
      {showCorners &&
        def.corners.map((ci) => {
          const vis = p.cornerVisible(ci);
          return (
            <circle
              key={ci}
              cx={p.pts[ci][0]}
              cy={p.pts[ci][1]}
              r={vis ? 10 : 8}
              fill={vis ? C.pink : C.card}
              stroke={C.ink}
              strokeWidth={2}
              strokeDasharray={vis ? undefined : '3 3'}
              opacity={vis ? 1 : 0.7}
            />
          );
        })}
    </g>
  );
}

/** A solid at a friendly angle, sized for question cards and choice buttons. */
export function SolidPicture({ id }: { id: SolidId }) {
  const def = solid(id);
  return (
    <svg viewBox="-130 -125 260 260" role="img" aria-label={def.name}>
      <SolidView def={def} yaw={0.6} pitch={0.42} cx={0} cy={-6} scale={id === 'cuboid' ? 82 : 92} strokeWidth={4} />
    </svg>
  );
}
