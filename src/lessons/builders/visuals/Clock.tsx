import type { SVGProps } from 'react';
import { C, shade } from '../../../lib/color';

type GProps = SVGProps<SVGGElement> & { 'data-nopan'?: boolean };

/** Angle in degrees (0 = 12 o'clock, clockwise) → point on a circle. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

/**
 * An analog clock face. `hours` is 0–11 (0 shows as 12) and `minutes` 0–59; the hour hand
 * moves smoothly between numbers like a real clock. Spread drag props onto the hands to make them draggable.
 */
export function ClockFace({
  cx,
  cy,
  r,
  hours,
  minutes,
  hourProps,
  minuteProps,
  rim = C.blue,
  highlight,
}: {
  cx: number;
  cy: number;
  r: number;
  hours: number;
  minutes: number;
  hourProps?: GProps;
  minuteProps?: GProps;
  rim?: string;
  /** Which hand to glow (for teaching). */
  highlight?: 'hour' | 'minute';
}) {
  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minDeg = minutes * 6;
  const [hx, hy] = polar(cx, cy, r * 0.42, hourDeg);
  const [mx, my] = polar(cx, cy, r * 0.63, minDeg);
  const big = r > 120;
  return (
    <g>
      <circle cx={cx + 6} cy={cy + 10} r={r + 14} fill={C.ink} opacity={0.12} />
      <circle cx={cx} cy={cy} r={r + 14} fill={rim} stroke={C.ink} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={r} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: 60 }, (_, i) => {
        const five = i % 5 === 0;
        const [x1, y1] = polar(cx, cy, r - (five ? r * 0.1 : r * 0.05), i * 6);
        const [x2, y2] = polar(cx, cy, r - 3, i * 6);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={five ? (big ? 3 : 2.2) : 1.2} strokeLinecap="round" />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const [x, y] = polar(cx, cy, r * 0.76, n * 30);
        return (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.2} fontWeight={700} fill={C.ink} className="num">
            {n}
          </text>
        );
      })}
      {/* minute hand */}
      <g {...minuteProps}>
        <line x1={cx} y1={cy} x2={mx} y2={my} stroke="transparent" strokeWidth={Math.max(30, r * 0.18)} strokeLinecap="round" />
        {highlight === 'minute' && <line x1={cx} y1={cy} x2={mx} y2={my} stroke={C.yellow} strokeWidth={r * 0.1} strokeLinecap="round" opacity={0.6} />}
        <line x1={cx} y1={cy} x2={mx} y2={my} stroke={C.red} strokeWidth={r * 0.04} strokeLinecap="round" />
        {big && <circle cx={mx} cy={my} r={r * 0.045} fill={C.red} stroke={C.ink} strokeWidth={2} />}
      </g>
      {/* hour hand */}
      <g {...hourProps}>
        <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="transparent" strokeWidth={Math.max(30, r * 0.2)} strokeLinecap="round" />
        {highlight === 'hour' && <line x1={cx} y1={cy} x2={hx} y2={hy} stroke={C.yellow} strokeWidth={r * 0.14} strokeLinecap="round" opacity={0.6} />}
        <line x1={cx} y1={cy} x2={hx} y2={hy} stroke={C.ink} strokeWidth={r * 0.075} strokeLinecap="round" />
        {big && <circle cx={hx} cy={hy} r={r * 0.05} fill={C.ink} />}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.06} fill={shade(rim, -0.2)} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

/** Small clock for question cards. */
export function ClockPicture({ hours, minutes, size }: { hours: number; minutes: number; size?: number }) {
  return (
    <svg viewBox="-118 -118 240 244" width={size} height={size} role="img" aria-label="A clock">
      <ClockFace cx={0} cy={0} r={100} hours={hours} minutes={minutes} />
    </svg>
  );
}

/** "3 o'clock", "half past 3", "quarter past 3", "quarter to 4", or "3:20". */
export function timeWords(hours: number, minutes: number): string {
  const h = hours % 12 === 0 ? 12 : hours % 12;
  const next = (hours + 1) % 12 === 0 ? 12 : (hours + 1) % 12;
  if (minutes === 0) return `${h} o’clock`;
  if (minutes === 30) return `half past ${h}`;
  if (minutes === 15) return `quarter past ${h}`;
  if (minutes === 45) return `quarter to ${next}`;
  return digital(hours, minutes);
}

export function digital(hours: number, minutes: number): string {
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return `${h}:${String(minutes).padStart(2, '0')}`;
}
