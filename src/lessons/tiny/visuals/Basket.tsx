import { C, shade } from '../../../lib/color';

/** Inside of a basket — draw this first, then the objects, then <BasketFront>. */
export function BasketBack({ cx, cy, w }: { cx: number; cy: number; w: number }) {
  return <ellipse cx={cx} cy={cy} rx={w / 2} ry={20} fill={shade(C.brown, -0.25)} stroke={C.ink} strokeWidth={2} />;
}

/** Woven front of a basket whose rim is centred at (cx, cy). */
export function BasketFront({ cx, cy, w, h = 64, color = C.wood }: { cx: number; cy: number; w: number; h?: number; color?: string }) {
  const r = w / 2;
  const left = cx - r;
  const right = cx + r;
  const inset = 24;
  const slats = Math.floor(w / 46);
  return (
    <g>
      <ellipse cx={cx + 4} cy={cy + h + 4} rx={r - inset + 6} ry={12} fill={C.ink} opacity={0.14} />
      <path
        d={`M${left},${cy} A${r},20 0 0 0 ${right},${cy} L${right - inset},${cy + h} Q${cx},${cy + h + 14} ${left + inset},${cy + h} Z`}
        fill={color}
        stroke={C.ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {[0.42, 0.72].map((f) => (
        <path
          key={f}
          d={`M${left + inset * f},${cy + h * f} Q${cx},${cy + h * f + 22} ${right - inset * f},${cy + h * f}`}
          fill="none"
          stroke={shade(color, -0.25)}
          strokeWidth={2.5}
        />
      ))}
      {Array.from({ length: slats }, (_, i) => {
        const x = left + inset + ((w - inset * 2) * (i + 0.5)) / slats;
        return <line key={i} x1={x} y1={cy + 16} x2={x + (x < cx ? 4 : -4)} y2={cy + h - 2} stroke={shade(color, -0.18)} strokeWidth={2} />;
      })}
      <path d={`M${left},${cy} A${r},20 0 0 0 ${right},${cy}`} fill="none" stroke={shade(color, -0.35)} strokeWidth={7} strokeLinecap="round" />
      <path d={`M${left},${cy} A${r},20 0 0 0 ${right},${cy}`} fill="none" stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
}
