import { C, shade } from '../../../../lib/color';
import { EMOJI_FONT } from '../../../../games/reading/words';

export type Dir = 'N' | 'E' | 'S' | 'W';
export const DIRS: Dir[] = ['N', 'E', 'S', 'W']; // clockwise order
export const DIR_NAME: Record<Dir, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };
/** Column / row change for one step (rows grow southward, North is up). */
export const STEP: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
export const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
export const ARROW: Record<Dir, string> = { N: '↑', E: '→', S: '↓', W: '←' };

/** A compass rose with North at the top. `point` draws a bold arrow towards one direction. */
export function CompassRose({ x, y, r, point }: { x: number; y: number; r: number; point?: Dir }) {
  const tip = (d: Dir, len: number) => [x + STEP[d][0] * len, y + STEP[d][1] * len];
  const w = r * 0.2;
  const spike = (d: Dir) => {
    const [tx, ty] = tip(d, r);
    const side = DIRS[(DIRS.indexOf(d) + 1) % 4];
    const [ax, ay] = [x + STEP[side][0] * w, y + STEP[side][1] * w];
    const [bx, by] = [x - STEP[side][0] * w, y - STEP[side][1] * w];
    return `M${tx},${ty} L${ax},${ay} L${bx},${by} Z`;
  };
  return (
    <g>
      <circle cx={x} cy={y} r={r * 0.78} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {DIRS.map((d) => (
        <path key={d} d={spike(d)} fill={d === 'N' ? C.red : shade(C.ink, 0.55)} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      ))}
      <circle cx={x} cy={y} r={r * 0.08} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {DIRS.map((d) => {
        const [lx, ly] = tip(d, r + 18);
        return (
          <text key={d} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={Math.max(15, r * 0.32)} fontWeight={800} fill={d === 'N' ? C.red : C.ink}>
            {d}
          </text>
        );
      })}
      {point && (
        <g>
          <line x1={x} y1={y} x2={tip(point, r * 0.62)[0]} y2={tip(point, r * 0.62)[1]} stroke={C.orange} strokeWidth={8} strokeLinecap="round" />
          <circle cx={tip(point, r * 0.62)[0]} cy={tip(point, r * 0.62)[1]} r={8} fill={C.orange} stroke={C.ink} strokeWidth={2} />
        </g>
      )}
    </g>
  );
}

export interface GridItem {
  c: number;
  r: number;
  emoji: string;
}

/** A small square-grid map for questions, with a little "N ↑" sign so North is always clear. */
export function GridMap({ cols, rows, items, label, arrows }: { cols: number; rows: number; items: GridItem[]; label: string; arrows?: [number, number][] }) {
  const s = 56;
  return (
    <svg viewBox={`-6 -6 ${cols * s + 64} ${rows * s + 12}`} role="img" aria-label={label}>
      <rect x={0} y={0} width={cols * s} height={rows * s} rx={6} fill={shade(C.green, 0.6)} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * s} y1={0} x2={(i + 1) * s} y2={rows * s} stroke={shade(C.green, 0.2)} strokeWidth={1.5} />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * s} x2={cols * s} y2={(i + 1) * s} stroke={shade(C.green, 0.2)} strokeWidth={1.5} />
      ))}
      {arrows && arrows.length > 1 && (
        <polyline points={arrows.map(([c, r]) => `${(c + 0.5) * s},${(r + 0.5) * s}`).join(' ')} fill="none" stroke={C.red} strokeWidth={4} strokeDasharray="7 6" strokeLinecap="round" />
      )}
      {items.map((it, i) => (
        <text key={i} x={(it.c + 0.5) * s} y={(it.r + 0.5) * s} textAnchor="middle" dominantBaseline="central" fontSize={34} fontFamily={EMOJI_FONT}>
          {it.emoji}
        </text>
      ))}
      <g transform={`translate(${cols * s + 30} ${rows * s * 0.5})`}>
        <path d="M0,-30 L9,-8 L-9,-8 Z" fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        <line x1={0} y1={-8} x2={0} y2={14} stroke={C.ink} strokeWidth={3} />
        <text x={0} y={34} textAnchor="middle" fontSize={20} fontWeight={800} fill={C.red}>
          N
        </text>
      </g>
    </svg>
  );
}
