import type { ReactNode } from 'react';
import { C, shade } from '../lib/color';

/**
 * Isometric helpers so scenes feel like toys sitting on a table.
 * World axes: x runs down-right, y runs down-left, z runs up. `unit` is pixels per world unit.
 */
const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

export function iso(x: number, y: number, z = 0, unit = 1): [number, number] {
  return [(x - y) * COS * unit, (x + y) * SIN * unit - z * unit];
}

const pts = (list: [number, number][]) => list.map((p) => p.join(',')).join(' ');

export interface IsoBoxProps {
  x?: number;
  y?: number;
  z?: number;
  /** Size along x, y and z. */
  w: number;
  d: number;
  h: number;
  color: string;
  unit?: number;
  stroke?: string;
  strokeWidth?: number;
  /** Extra content drawn on the top face (already in screen space). */
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** A shaded cuboid. Draw boxes back-to-front (smaller x + y first). */
export function IsoBox({
  x = 0,
  y = 0,
  z = 0,
  w,
  d,
  h,
  color,
  unit = 1,
  stroke = C.ink,
  strokeWidth = 1.5,
  children,
  className,
  onClick,
}: IsoBoxProps) {
  const P = (px: number, py: number, pz: number) => iso(px, py, pz, unit);
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  return (
    <g className={className} onClick={onClick} strokeLinejoin="round">
      <polygon points={pts(left)} fill={shade(color, -0.12)} stroke={stroke} strokeWidth={strokeWidth} />
      <polygon points={pts(right)} fill={shade(color, -0.3)} stroke={stroke} strokeWidth={strokeWidth} />
      <polygon points={pts(top)} fill={shade(color, 0.12)} stroke={stroke} strokeWidth={strokeWidth} />
      {children}
    </g>
  );
}

/** A unit cube — the building block of base-ten blocks and counting cubes. */
export function IsoCube(props: Omit<IsoBoxProps, 'w' | 'd' | 'h'> & { size?: number }) {
  const { size = 1, ...rest } = props;
  return <IsoBox {...rest} w={size} d={size} h={size} />;
}

/**
 * A flat table mat / tray that scenes can sit on, centred at (cx, cy) in screen space.
 * `w` and `d` are in pixels along the iso axes.
 */
export function IsoMat({
  cx,
  cy,
  w,
  d,
  h = 14,
  color = C.wood,
  children,
}: {
  cx: number;
  cy: number;
  w: number;
  d: number;
  h?: number;
  color?: string;
  children?: ReactNode;
}) {
  const [ox, oy] = iso(w / 2, d / 2, 0);
  return (
    <g transform={`translate(${cx - ox} ${cy - oy + h / 2})`}>
      <polygon
        points={pts([iso(0, 0, -6), iso(w + 10, 0, -6), iso(w + 10, d + 10, -6), iso(0, d + 10, -6)])}
        fill={C.ink}
        opacity={0.12}
      />
      <IsoBox w={w} d={d} h={h} color={color} />
      {children}
    </g>
  );
}
