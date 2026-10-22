import { C, shade } from '../../../lib/color';
import { Emoji } from '../../tiny/visuals/Measure';

/**
 * Where dot k of a mirrored pair of 2 × 5 frames sits. Side -1 is left of the mirror line at `mid`,
 * side 1 is right. Both sides fill from the outside edge in, so the right is a true reflection of the left.
 */
export function mirrorCell(k: number, side: -1 | 1, mid: number, gap: number, cell: number) {
  const row = Math.floor(k / 5);
  const col = k % 5; // 0 = furthest from the line
  const fromLine = 4 - col;
  const x = side < 0 ? mid - gap - (fromLine + 0.5) * cell : mid + gap + (fromLine + 0.5) * cell;
  return { x, row, col };
}

/** n dots on the left of a mirror line and `right` dots on the right (normally the same: a double). */
export function DoublePicture({ n, right = n }: { n: number; right?: number }) {
  const cell = 40;
  const mid = 240;
  const gap = 18;
  const rows = Math.max(1, Math.ceil(Math.max(n, right) / 5));
  const top = 20;
  const h = top * 2 + rows * cell;
  const dot = (k: number, side: -1 | 1, extra: boolean) => {
    const { x, row } = mirrorCell(k, side, mid, gap, cell);
    return <circle key={`${side}${k}`} cx={x} cy={top + row * cell + cell / 2} r={15} fill={extra ? C.orange : side < 0 ? C.blue : shade(C.blue, 0.35)} stroke={C.ink} strokeWidth={2} />;
  };
  return (
    <svg viewBox={`0 0 480 ${h}`} role="img" aria-label={right === n ? `${n} dots and their mirror image` : `${n} dots and ${right} dots`}>
      <line x1={mid} y1={4} x2={mid} y2={h - 4} stroke={C.red} strokeWidth={3} strokeDasharray="8 6" />
      {Array.from({ length: n }, (_, k) => dot(k, -1, false))}
      {Array.from({ length: right }, (_, k) => dot(k, 1, k >= n))}
    </svg>
  );
}

/** Where cookie k of `count` sits on a plate centred at (cx, cy), `perRow` to a row. */
export function plateSpot(k: number, count: number, cx: number, cy: number, perRow: number, gap: number) {
  const rows = Math.max(1, Math.ceil(count / perRow));
  const row = Math.floor(k / perRow);
  const inRow = row === rows - 1 ? count - row * perRow : perRow;
  const col = k % perRow;
  return { x: cx + (col - (inRow - 1) / 2) * gap, y: cy + (row - (rows - 1) / 2) * gap * 0.95 };
}

export function Plate({ cx, cy, rx, ry, glow }: { cx: number; cy: number; rx: number; ry: number; glow?: string }) {
  return (
    <g>
      {glow && <ellipse cx={cx} cy={cy} rx={rx + 8} ry={ry + 8} fill="none" stroke={glow} strokeWidth={10} opacity={0.6} />}
      <ellipse cx={cx} cy={cy + 6} rx={rx} ry={ry} fill={shade(C.ink, 0.75)} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.78} ry={ry * 0.74} fill="none" stroke={C.line} strokeWidth={2} />
    </g>
  );
}

/** A plate of n cookies, for "half of" questions. */
export function CookiesPicture({ n }: { n: number }) {
  const perRow = n > 10 ? Math.ceil(n / 2) : n;
  return (
    <svg viewBox="0 0 520 190" role="img" aria-label={`A plate of ${n} cookies`}>
      <Plate cx={260} cy={95} rx={250} ry={n > 10 ? 85 : 62} />
      {Array.from({ length: n }, (_, k) => {
        const p = plateSpot(k, n, 260, 95, perRow, 46);
        return <Emoji key={k} char="🍪" x={p.x} y={p.y} size={40} />;
      })}
    </svg>
  );
}
