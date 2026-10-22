import type { ReactNode } from 'react';
import { C } from '../../../lib/color';
import { iso, IsoCube } from '../../../visuals/Iso';

/** One colour per layer, so the layers are easy to count. */
export const LAYER_COLORS = [C.blue, C.green, C.orange, C.purple, C.pink, C.teal];

/** Unit cubes at grid positions, drawn back to front (x + y + z ascending), translated by (ox, oy). */
export function CubeStack({ cubes, unit, ox = 0, oy = 0 }: { cubes: { x: number; y: number; z: number; color?: string; className?: string }[]; unit: number; ox?: number; oy?: number }) {
  const sorted = cubes.slice().sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.z - b.z);
  return (
    <g transform={`translate(${ox} ${oy})`}>
      {sorted.map((c) => (
        <IsoCube key={`${c.x}-${c.y}-${c.z}`} x={c.x} y={c.y} z={c.z} unit={unit} color={c.color ?? LAYER_COLORS[c.z % LAYER_COLORS.length]} className={c.className} />
      ))}
    </g>
  );
}

/** A complete l × w × h cuboid of unit cubes for question cards, with optional edge labels. */
export function CuboidPicture({ l, w, h, labels = false, unit = 22 }: { l: number; w: number; h: number; labels?: boolean; unit?: number }) {
  const cubes = [];
  for (let z = 0; z < h; z++) for (let x = 0; x < l; x++) for (let y = 0; y < w; y++) cubes.push({ x, y, z });
  const left = iso(0, w, 0, unit)[0] - (labels ? 60 : 12);
  const right = iso(l, 0, 0, unit)[0] + (labels ? 60 : 12);
  const top = iso(0, 0, h, unit)[1] - 12;
  const bottom = iso(l, w, 0, unit)[1] + (labels ? 40 : 12);
  const parts: ReactNode[] = [];
  if (labels) {
    const [lx, ly] = iso(l / 2, w, 0, unit);
    const [wx, wy] = iso(l, w / 2, 0, unit);
    const [hx, hy] = iso(l, 0, h / 2, unit);
    parts.push(
      <text key="l" x={lx - 14} y={ly + 26} textAnchor="end" fontSize={20} fontWeight={700} fill={C.ink}>
        {l} cm
      </text>,
      <text key="w" x={wx + 14} y={wy + 26} fontSize={20} fontWeight={700} fill={C.ink}>
        {w} cm
      </text>,
      <text key="h" x={hx + 10} y={hy} dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
        {h} cm
      </text>,
    );
  }
  return (
    <svg viewBox={`${left} ${top} ${right - left} ${bottom - top}`} role="img" aria-label={`A cuboid ${l} cubes long, ${w} wide and ${h} tall`}>
      <CubeStack cubes={cubes} unit={unit} />
      {parts}
    </svg>
  );
}
