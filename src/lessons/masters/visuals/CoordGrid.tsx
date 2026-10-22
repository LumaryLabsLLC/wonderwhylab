import { C } from '../../../lib/color';
import { fmt } from '../../../lib/answers';
import { Thing } from '../../../visuals/Thing';

export interface GridPoint {
  x: number;
  y: number;
  /** Letter shown in a dot. Omit to draw a star. */
  label?: string;
}

export const coord = (x: number, y: number) => `(${fmt(x)}, ${fmt(y)})`;

const DOT_COLORS = [C.red, C.blue, C.green, C.purple];

/**
 * Square coordinate grid drawn as a <g>. `min`/`max` apply to both axes.
 * Returns screen helpers through `sx`/`sy` so scenes can place things.
 */
export function gridGeometry(min: number, max: number, cell: number, left: number, top: number) {
  return {
    sx: (x: number) => left + (x - min) * cell,
    sy: (y: number) => top + (max - y) * cell,
    size: (max - min) * cell,
  };
}

export function CoordAxes({ min, max, cell, left, top, fontSize = 15 }: { min: number; max: number; cell: number; left: number; top: number; fontSize?: number }) {
  const { sx, sy, size } = gridGeometry(min, max, cell, left, top);
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <g>
      <rect x={left} y={top} width={size} height={size} fill={C.card} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} y1={top} x2={sx(t)} y2={top + size} stroke={C.line} strokeWidth={1} />
          <line x1={left} y1={sy(t)} x2={left + size} y2={sy(t)} stroke={C.line} strokeWidth={1} />
        </g>
      ))}
      {/* Axes */}
      <line x1={left - 8} y1={sy(0)} x2={left + size + 16} y2={sy(0)} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <line x1={sx(0)} y1={top + size + 8} x2={sx(0)} y2={top - 16} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${left + size + 24},${sy(0)} l-12,-7 v14 z`} fill={C.ink} />
      <path d={`M${sx(0)},${top - 24} l-7,12 h14 z`} fill={C.ink} />
      <text x={left + size + 26} y={sy(0) - 16} fontSize={fontSize + 3} fontWeight={700} fontStyle="italic" fill={C.ink}>
        x
      </text>
      <text x={sx(0) + 14} y={top - 18} fontSize={fontSize + 3} fontWeight={700} fontStyle="italic" fill={C.ink}>
        y
      </text>
      {ticks.map((t) =>
        t === 0 ? null : (
          <g key={`l${t}`}>
            <text x={sx(t)} y={sy(0) + fontSize + 8} textAnchor="middle" fontSize={fontSize} fill={C.ink2} className="num">
              {fmt(t)}
            </text>
            <text x={sx(0) - 9} y={sy(t)} textAnchor="end" dominantBaseline="central" fontSize={fontSize} fill={C.ink2} className="num">
              {fmt(t)}
            </text>
          </g>
        ),
      )}
      <text x={sx(0) - 9} y={sy(0) + fontSize + 8} textAnchor="end" fontSize={fontSize} fontWeight={700} fill={C.ink} className="num">
        0
      </text>
    </g>
  );
}

export function CoordPicture({ min, max, points }: { min: number; max: number; points: GridPoint[] }) {
  const cell = 30;
  const size = (max - min) * cell;
  const { sx, sy } = gridGeometry(min, max, cell, 0, 0);
  return (
    <svg viewBox={`-34 -34 ${size + 74} ${size + 64}`} role="img" aria-label="A coordinate grid">
      <CoordAxes min={min} max={max} cell={cell} left={0} top={0} fontSize={14} />
      {points.map((p, i) =>
        p.label ? (
          <g key={i}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={11} fill={DOT_COLORS[i % DOT_COLORS.length]} stroke={C.ink} strokeWidth={2} />
            <text x={sx(p.x)} y={sy(p.y)} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill={C.white}>
              {p.label}
            </text>
          </g>
        ) : (
          <Thing key={i} kind="star" x={sx(p.x)} y={sy(p.y)} size={30} />
        ),
      )}
    </svg>
  );
}
