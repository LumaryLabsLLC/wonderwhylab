import { C, shade } from '../../../lib/color';

export type AngleType = 'Acute' | 'Right' | 'Obtuse' | 'Straight' | 'Reflex';

export const ANGLE_TYPES: { type: AngleType; color: string; rule: string; sample: number }[] = [
  { type: 'Acute', color: C.green, rule: 'less than 90°', sample: 45 },
  { type: 'Right', color: C.blue, rule: 'exactly 90°', sample: 90 },
  { type: 'Obtuse', color: C.orange, rule: '90° to 180°', sample: 135 },
  { type: 'Straight', color: C.purple, rule: 'exactly 180°', sample: 180 },
  { type: 'Reflex', color: C.pink, rule: 'more than 180°', sample: 300 },
];

export function angleType(deg: number): AngleType | null {
  if (deg <= 0 || deg >= 360) return null;
  if (deg < 90) return 'Acute';
  if (deg === 90) return 'Right';
  if (deg < 180) return 'Obtuse';
  if (deg === 180) return 'Straight';
  return 'Reflex';
}

export const typeColor = (deg: number) => ANGLE_TYPES.find((t) => t.type === angleType(deg))?.color ?? C.muted;

/** Point at `deg` degrees (anticlockwise from the right) on a circle. Screen y points down. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

/** Pie slice from `from`° to `to`° going anticlockwise. */
export function sector(cx: number, cy: number, r: number, from: number, to: number): string {
  const sweep = (((to - from) % 360) + 360) % 360;
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${sweep > 180 ? 1 : 0} 0 ${x2},${y2} Z`;
}

/** Arc only (no lines to the centre). */
export function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const sweep = (((to - from) % 360) + 360) % 360;
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return `M${x1},${y1} A${r},${r} 0 ${sweep > 180 ? 1 : 0} 0 ${x2},${y2}`;
}

/** The little square that marks a right angle between `from`° and `from + 90`°. */
export function rightMark(cx: number, cy: number, size: number, from: number): string {
  const a = polar(cx, cy, size, from);
  const b = polar(cx, cy, size * Math.SQRT2, from + 45);
  const c = polar(cx, cy, size, from + 90);
  return `M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}`;
}

/** Two arms and the turn between them, for question cards. `turn` rotates the whole angle. */
export function AnglePicture({ deg, turn = 0, protractor = false, label }: { deg: number; turn?: number; protractor?: boolean; label?: string }) {
  const cx = 160;
  const cy = protractor ? 170 : 130;
  const r = 130;
  const color = typeColor(deg);
  const [ex, ey] = polar(cx, cy, r, turn + deg);
  const [bx, by] = polar(cx, cy, r, turn);
  return (
    <svg viewBox={protractor ? '0 0 320 190' : '0 0 320 260'} role="img" aria-label={`An angle of ${deg} degrees`}>
      {protractor && (
        <g>
          <path d={`M${cx - 145},${cy} A145,145 0 0 1 ${cx + 145},${cy} Z`} fill={C.card} stroke={C.ink} strokeWidth={2} />
          {Array.from({ length: 19 }, (_, i) => {
            const [x1, y1] = polar(cx, cy, 145, i * 10);
            const [x2, y2] = polar(cx, cy, i % 3 === 0 ? 128 : 136, i * 10);
            const [lx, ly] = polar(cx, cy, 114, i * 10);
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={i % 3 === 0 ? 2 : 1.2} />
                {i % 3 === 0 && (
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={C.ink2}>
                    {i * 10}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
      {deg === 90 ? (
        <path d={rightMark(cx, cy, 26, turn)} fill="none" stroke={shade(color, -0.2)} strokeWidth={3} />
      ) : (
        <path d={sector(cx, cy, protractor ? 46 : 40, turn, turn + deg)} fill={color} fillOpacity={0.45} stroke={shade(color, -0.2)} strokeWidth={2} />
      )}
      <line x1={cx} y1={cy} x2={bx} y2={by} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={C.ink} />
      {label && (
        <text {...xy(polar(cx, cy, 70, turn + deg / 2))} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.ink}>
          {label}
        </text>
      )}
    </svg>
  );
}

const xy = ([x, y]: [number, number]) => ({ x, y });

/**
 * A straight line (total 180) or a right angle (total 90) split by a ray at `a`°.
 * The known part is labelled, the other part shows "?".
 */
export function SplitPicture({ total, a }: { total: 90 | 180; a: number }) {
  const cx = total === 180 ? 160 : 70;
  const cy = 150;
  const r = 140;
  const [rx, ry] = polar(cx, cy, r, a);
  return (
    <svg viewBox={total === 180 ? '0 0 320 175' : '0 0 260 175'} role="img" aria-label={`Angles adding to ${total} degrees, one is ${a} degrees`}>
      <path d={sector(cx, cy, 44, 0, a)} fill={C.green} fillOpacity={0.4} stroke={shade(C.green, -0.2)} strokeWidth={2} />
      <path d={sector(cx, cy, 58, a, total)} fill={C.orange} fillOpacity={0.35} stroke={shade(C.orange, -0.2)} strokeWidth={2} />
      {total === 180 ? (
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      ) : (
        <>
          <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={cx} y2={cy - r} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
        </>
      )}
      <line x1={cx} y1={cy} x2={rx} y2={ry} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={C.ink} />
      <text {...xy(polar(cx, cy, 82, a / 2))} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
        {a}°
      </text>
      <text {...xy(polar(cx, cy, 92, (a + total) / 2))} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill={shade(C.orange, -0.3)}>
        ?
      </text>
    </svg>
  );
}
