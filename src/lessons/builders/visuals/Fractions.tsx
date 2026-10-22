import { C, shade } from '../../../lib/color';

export type FoodShape = 'pizza' | 'sandwich' | 'cake';

/** Geometry of each food in the scene (centre and size). */
export const FOOD = {
  pizza: { cx: 300, cy: 380, r: 150 },
  sandwich: { cx: 300, cy: 380, w: 360, h: 210 },
  cake: { cx: 300, cy: 380, w: 280, h: 280 },
} as const;

export function bbox(shape: FoodShape) {
  if (shape === 'pizza') {
    const { cx, cy, r } = FOOD.pizza;
    return { x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r };
  }
  const f = FOOD[shape];
  return { x1: f.cx - f.w / 2, y1: f.cy - f.h / 2, x2: f.cx + f.w / 2, y2: f.cy + f.h / 2 };
}

export function inside(shape: FoodShape, x: number, y: number) {
  if (shape === 'pizza') {
    const { cx, cy, r } = FOOD.pizza;
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  }
  const b = bbox(shape);
  return x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;
}

/** Share of the food in each piece, for a vertical cut at vx and (optionally) a horizontal cut at hy. */
export function pieceShares(shape: FoodShape, vx: number, hy: number | null): number[] {
  const b = bbox(shape);
  const counts = hy === null ? [0, 0] : [0, 0, 0, 0];
  let total = 0;
  for (let x = b.x1 + 2; x < b.x2; x += 5) {
    for (let y = b.y1 + 2; y < b.y2; y += 5) {
      if (!inside(shape, x, y)) continue;
      total++;
      const col = x < vx ? 0 : 1;
      const row = hy === null || y < hy ? 0 : 1;
      counts[row * 2 + col]++;
    }
  }
  return counts.map((c) => c / total);
}

export function FoodBody({ shape, fill }: { shape: FoodShape; fill?: string }) {
  const s = { stroke: C.ink, strokeWidth: 3 };
  if (shape === 'pizza') {
    const { cx, cy, r } = FOOD.pizza;
    return <circle cx={cx} cy={cy} r={r} fill={fill ?? C.yellow} {...s} />;
  }
  const b = bbox(shape);
  return <rect x={b.x1} y={b.y1} width={b.x2 - b.x1} height={b.y2 - b.y1} rx={shape === 'sandwich' ? 28 : 10} fill={fill ?? (shape === 'sandwich' ? '#f3d9a4' : C.pink)} {...s} />;
}

/** Toppings drawn on top of the pieces (not cut, purely decorative but recognisable). */
export function FoodTop({ shape }: { shape: FoodShape }) {
  if (shape === 'pizza') {
    const { cx, cy, r } = FOOD.pizza;
    const dots = [
      [-70, -60], [20, -95], [80, -30], [-20, -15], [60, 60], [-80, 40], [10, 90], [-30, 50], [95, 15], [-100, -10],
    ];
    return (
      <g pointerEvents="none">
        <circle cx={cx} cy={cy} r={r - 14} fill="none" stroke={shade(C.orange, -0.1)} strokeWidth={4} />
        {dots.map(([dx, dy], i) => (
          <circle key={i} cx={cx + dx} cy={cy + dy} r={13} fill={C.red} stroke={C.ink} strokeWidth={2} />
        ))}
      </g>
    );
  }
  const b = bbox(shape);
  if (shape === 'sandwich') {
    return (
      <g pointerEvents="none">
        <rect x={b.x1 + 16} y={b.y1 + 16} width={b.x2 - b.x1 - 32} height={b.y2 - b.y1 - 32} rx={18} fill="none" stroke={shade('#f3d9a4', -0.2)} strokeWidth={4} />
      </g>
    );
  }
  return (
    <g pointerEvents="none">
      {Array.from({ length: 14 }, (_, i) => {
        const x = b.x1 + 30 + ((i * 53) % (b.x2 - b.x1 - 60));
        const y = b.y1 + 30 + ((i * 37) % (b.y2 - b.y1 - 60));
        return <rect key={i} x={x} y={y} width={14} height={5} rx={2} fill={[C.blue, C.yellow, C.green, C.white][i % 4]} transform={`rotate(${(i * 47) % 180} ${x + 7} ${y + 2})`} />;
      })}
    </g>
  );
}

export const FRACTION_GLYPH: Record<string, string> = { '1/2': '½', '1/4': '¼', '3/4': '¾' };
export const FRACTION_NAME: Record<string, string> = { '1/2': 'one half', '1/4': 'one quarter', '3/4': 'three quarters' };

/**
 * A shape cut into 2 or 4 parts with some shaded, for practice questions.
 * `unequal` moves the cut(s) off-centre so the parts are not the same size.
 */
export function FractionPicture({ shape, parts, shaded, unequal = false }: { shape: 'circle' | 'rect'; parts: 2 | 4; shaded: number; unequal?: boolean }) {
  const W = 200;
  const H = 140;
  const vx = unequal ? 72 : 100;
  const hy = unequal ? 52 : 70;
  const clipId = `fp-${shape}-${parts}-${shaded}-${unequal ? 'u' : 'e'}`;
  const outline =
    shape === 'circle' ? <circle cx={100} cy={70} r={62} /> : <rect x={30} y={18} width={140} height={104} rx={8} />;
  const regions =
    parts === 2
      ? [
          { x: 0, y: 0, w: vx, h: H },
          { x: vx, y: 0, w: W - vx, h: H },
        ]
      : [
          { x: 0, y: 0, w: vx, h: hy },
          { x: vx, y: 0, w: W - vx, h: hy },
          { x: 0, y: hy, w: vx, h: H - hy },
          { x: vx, y: hy, w: W - vx, h: H - hy },
        ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`A shape cut into ${parts} ${unequal ? 'unequal' : 'equal'} parts with ${shaded} coloured`}>
      <defs>
        <clipPath id={clipId}>{outline}</clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {regions.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={i < shaded ? C.purple : C.white} />
        ))}
      </g>
      <g fill="none" stroke={C.ink} strokeWidth={3}>
        {outline}
      </g>
      <g clipPath={`url(#${clipId})`} stroke={C.ink} strokeWidth={3}>
        <line x1={vx} y1={0} x2={vx} y2={H} />
        {parts === 4 && <line x1={0} y1={hy} x2={W} y2={hy} />}
      </g>
    </svg>
  );
}
