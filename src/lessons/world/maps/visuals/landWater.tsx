import { C, shade } from '../../../../lib/color';

/**
 * A tiny painted map made of square tiles: water, land or hills (high land).
 * Rows are strings: '~' water, 'L' land, 'H' hills.
 */
export type Tile = 'w' | 'l' | 'h';

export const TILE_FILL: Record<Tile, string> = {
  w: shade(C.blue, 0.35),
  l: shade(C.green, 0.25),
  h: shade(C.brown, 0.25),
};

export function parseMap(rows: string[]): Tile[][] {
  return rows.map((r) => [...r].map((ch) => (ch === '~' ? 'w' : ch === 'H' ? 'h' : 'l')));
}

export const isWater = (t: Tile) => t === 'w';

export interface Region {
  cells: [number, number][];
  /** True when the region reaches the edge of the map (so we cannot see all around it). */
  edge: boolean;
}

/** Group side-by-side tiles that are all water (or all land) into regions. */
export function regions(map: Tile[][], water: boolean): Region[] {
  const rows = map.length;
  const cols = map[0].length;
  const seen = map.map((r) => r.map(() => false));
  const out: Region[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (seen[r][c] || isWater(map[r][c]) !== water) continue;
      const cells: [number, number][] = [];
      let edge = false;
      const stack: [number, number][] = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [y, x] = stack.pop()!;
        cells.push([y, x]);
        if (y === 0 || x === 0 || y === rows - 1 || x === cols - 1) edge = true;
        for (const [dy, dx] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= rows || nx >= cols || seen[ny][nx] || isWater(map[ny][nx]) !== water) continue;
          seen[ny][nx] = true;
          stack.push([ny, nx]);
        }
      }
      out.push({ cells, edge });
    }
  }
  return out;
}

/** A small hill mark drawn on high land. */
export function HillMark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path d={`M${x - 12 * s},${y + 7 * s} L${x},${y - 8 * s} L${x + 12 * s},${y + 7 * s}`} fill="none" stroke={shade(C.brown, -0.35)} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />;
}

/** A small picture of a tile map, for practice questions. `point` draws an arrow at a [row, col] spot. */
export function MiniMap({ map, point, label }: { map: Tile[][]; point?: [number, number]; label: string }) {
  const s = 30;
  const rows = map.length;
  const cols = map[0].length;
  return (
    <svg viewBox={`-4 -4 ${cols * s + 8} ${rows * s + 8}`} role="img" aria-label={label}>
      {map.map((row, r) =>
        row.map((t, c) => (
          <g key={`${r}-${c}`}>
            <rect x={c * s} y={r * s} width={s + 0.5} height={s + 0.5} fill={TILE_FILL[t]} />
            {t === 'h' && <HillMark x={c * s + s / 2} y={r * s + s / 2} s={0.7} />}
          </g>
        )),
      )}
      <rect x={0} y={0} width={cols * s} height={rows * s} fill="none" stroke={C.ink} strokeWidth={2.5} />
      {point && (
        <g>
          <circle cx={(point[1] + 0.5) * s} cy={(point[0] + 0.5) * s} r={s * 0.75} fill="none" stroke={C.yellow} strokeWidth={6} />
          <circle cx={(point[1] + 0.5) * s} cy={(point[0] + 0.5) * s} r={s * 0.75} fill="none" stroke={C.ink} strokeWidth={2} />
        </g>
      )}
    </svg>
  );
}
