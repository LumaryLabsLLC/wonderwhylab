import type { ReactNode } from 'react';
import { C, shade } from '../../../lib/color';
import { iso, IsoBox } from '../../../visuals/Iso';

export const PLACE_COLORS = { hundreds: C.blue, tens: C.green, ones: C.orange } as const;

const line = (u: number, a: [number, number, number], b: [number, number, number]) => {
  const [x1, y1] = iso(a[0], a[1], a[2], u);
  const [x2, y2] = iso(b[0], b[1], b[2], u);
  return `M${x1},${y1} L${x2},${y2}`;
};

/** A hundreds flat (10 × 10 × 1) with unit lines, drawn at iso position (0, 0, z). */
export function Flat({ z = 0, u, color = PLACE_COLORS.hundreds, top = false }: { z?: number; u: number; color?: string; top?: boolean }) {
  const lines: string[] = [];
  for (let i = 1; i < 10; i++) {
    lines.push(line(u, [i, 10, z], [i, 10, z + 1]));
    lines.push(line(u, [10, i, z], [10, i, z + 1]));
    if (top) {
      lines.push(line(u, [i, 0, z + 1], [i, 10, z + 1]));
      lines.push(line(u, [0, i, z + 1], [10, i, z + 1]));
    }
  }
  return (
    <g>
      <IsoBox z={z} w={10} d={10} h={1} unit={u} color={color} />
      <path d={lines.join(' ')} stroke={shade(color, -0.45)} strokeWidth={1} opacity={0.6} />
    </g>
  );
}

/** A tens rod (1 × 10 × 1) lying along the y axis at iso x position `x`. */
export function Rod({ x = 0, u, color = PLACE_COLORS.tens }: { x?: number; u: number; color?: string }) {
  const lines: string[] = [];
  for (let i = 1; i < 10; i++) {
    lines.push(line(u, [x, i, 1], [x + 1, i, 1]));
    lines.push(line(u, [x + 1, i, 0], [x + 1, i, 1]));
  }
  return (
    <g>
      <IsoBox x={x} w={1} d={10} h={1} unit={u} color={color} />
      <path d={lines.join(' ')} stroke={shade(color, -0.45)} strokeWidth={1} opacity={0.6} />
    </g>
  );
}

/** A ones cube at iso position (x, y). */
export function Unit({ x = 0, y = 0, u, color = PLACE_COLORS.ones }: { x?: number; y?: number; u: number; color?: string }) {
  return <IsoBox x={x} y={y} w={1} d={1} h={1} unit={u} color={color} />;
}

/** Flat front-on base-ten picture for question cards. */
export function BlocksPicture({ hundreds, tens, ones }: { hundreds: number; tens: number; ones: number }) {
  const s = 7;
  const flat = s * 10;
  let x = 0;
  const parts: ReactNode[] = [];
  for (let i = 0; i < hundreds; i++) {
    parts.push(
      <g key={`h${i}`} transform={`translate(${x} 0)`}>
        <rect width={flat} height={flat} fill={PLACE_COLORS.hundreds} stroke={C.ink} strokeWidth={2} />
        <path
          d={Array.from({ length: 9 }, (_, k) => `M${(k + 1) * s},0 V${flat} M0,${(k + 1) * s} H${flat}`).join(' ')}
          stroke={shade(PLACE_COLORS.hundreds, -0.4)}
          strokeWidth={0.8}
        />
      </g>,
    );
    x += flat + 10;
  }
  for (let i = 0; i < tens; i++) {
    parts.push(
      <g key={`t${i}`} transform={`translate(${x} 0)`}>
        <rect width={s} height={flat} fill={PLACE_COLORS.tens} stroke={C.ink} strokeWidth={1.5} />
        <path d={Array.from({ length: 9 }, (_, k) => `M0,${(k + 1) * s} H${s}`).join(' ')} stroke={shade(PLACE_COLORS.tens, -0.4)} strokeWidth={0.8} />
      </g>,
    );
    x += s + 5;
  }
  if (tens) x += 6;
  for (let i = 0; i < ones; i++) {
    const col = Math.floor(i / 5);
    const row = i % 5;
    parts.push(<rect key={`o${i}`} x={x + col * (s + 5)} y={flat - s - row * (s + 6)} width={s} height={s} fill={PLACE_COLORS.ones} stroke={C.ink} strokeWidth={1.5} />);
  }
  if (ones) x += Math.ceil(ones / 5) * (s + 5);
  const w = Math.max(x, 40);
  return (
    <svg viewBox={`-6 -6 ${w + 12} ${flat + 12}`} role="img" aria-label={`${hundreds} hundreds, ${tens} tens and ${ones} ones`}>
      {parts}
    </svg>
  );
}
