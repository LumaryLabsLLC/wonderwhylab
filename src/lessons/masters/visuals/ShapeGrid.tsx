import { C, shade } from '../../../lib/color';

export type Cell = [number, number];

const key = (c: Cell) => `${c[0]},${c[1]}`;

/** Cells of a w × h rectangle starting at (x, y). */
export function rectCells(w: number, h: number, x = 0, y = 0): Cell[] {
  const out: Cell[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]);
  return out;
}

/** Number of unit edges on the outside of a shape made of squares. */
export function perimeterOf(cells: Cell[]): number {
  const set = new Set(cells.map(key));
  let p = 0;
  for (const [x, y] of cells) {
    for (const n of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) if (!set.has(key(n))) p++;
  }
  return p;
}

/** Squares on a grid with the outside edge drawn thick. Self-contained <svg> for question cards. */
export function ShapePicture({
  cells,
  cols,
  rows,
  color = C.green,
  edge = C.ink,
}: {
  cells: Cell[];
  cols: number;
  rows: number;
  color?: string;
  edge?: string;
}) {
  const s = 30;
  const set = new Set(cells.map(key));
  const has = (x: number, y: number) => set.has(`${x},${y}`);
  return (
    <svg viewBox={`-6 -6 ${cols * s + 12} ${rows * s + 12}`} role="img" aria-label={`A shape made of ${cells.length} squares`}>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <line key={`v${i}`} x1={i * s} y1={0} x2={i * s} y2={rows * s} stroke={C.line} strokeWidth={1} />
      ))}
      {Array.from({ length: rows + 1 }, (_, j) => (
        <line key={`h${j}`} x1={0} y1={j * s} x2={cols * s} y2={j * s} stroke={C.line} strokeWidth={1} />
      ))}
      {cells.map(([x, y]) => (
        <rect key={key([x, y])} x={x * s} y={y * s} width={s} height={s} fill={shade(color, 0.35)} stroke={shade(color, -0.2)} strokeWidth={1} />
      ))}
      {cells.map(([x, y]) => (
        <g key={`e${key([x, y])}`} stroke={edge} strokeWidth={3.5} strokeLinecap="round">
          {!has(x, y - 1) && <line x1={x * s} y1={y * s} x2={(x + 1) * s} y2={y * s} />}
          {!has(x, y + 1) && <line x1={x * s} y1={(y + 1) * s} x2={(x + 1) * s} y2={(y + 1) * s} />}
          {!has(x - 1, y) && <line x1={x * s} y1={y * s} x2={x * s} y2={(y + 1) * s} />}
          {!has(x + 1, y) && <line x1={(x + 1) * s} y1={y * s} x2={(x + 1) * s} y2={(y + 1) * s} />}
        </g>
      ))}
    </svg>
  );
}

/** A rectangle with labelled sides (no grid), for "use the formula" questions. */
export function RectPicture({ w, h, unit = 'cm', color = C.green }: { w: number; h: number; unit?: string; color?: string }) {
  const scale = 200 / Math.max(w, h);
  const W = w * scale;
  const H = h * scale;
  return (
    <svg viewBox={`-70 -40 ${W + 110} ${H + 60}`} role="img" aria-label={`A rectangle ${w} ${unit} by ${h} ${unit}`}>
      <rect x={4} y={5} width={W} height={H} rx={3} fill={C.ink} opacity={0.12} />
      <rect width={W} height={H} rx={3} fill={shade(color, 0.35)} stroke={C.ink} strokeWidth={3} />
      <text x={W / 2} y={-12} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
        {w} {unit}
      </text>
      <text x={-12} y={H / 2} textAnchor="end" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
        {h} {unit}
      </text>
    </svg>
  );
}
