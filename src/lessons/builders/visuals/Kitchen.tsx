import { useId } from 'react';
import type { ReactNode } from 'react';
import { C, shade } from '../../../lib/color';

/* ───────────────────────── Kitchen scale ───────────────────────── */

export type DialUnit = 'g' | 'kg';

/** A grams dial goes to 1000 g in 100s; a kilograms dial goes to 10 kg in 1s. Both have half-way ticks. */
export const DIAL: Record<DialUnit, { max: number; step: number; label: (v: number) => string }> = {
  g: { max: 1000, step: 100, label: (v) => String(v) },
  kg: { max: 10, step: 1, label: (v) => String(v) },
};

/** The needle sweeps 300°: 0 sits low on the left, the top value low on the right. */
const SWEEP = 300;
const angleFor = (frac: number) => -SWEEP / 2 + SWEEP * frac;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/** A round dial with numbers, half-way ticks and a red needle at `frac` (0–1) of the way round. `tick` is the long tick's length. */
export function DialFace({ cx, cy, r, unit, frac, fontSize = 16, tick = 18 }: { cx: number; cy: number; r: number; unit: DialUnit; frac: number; fontSize?: number; tick?: number }) {
  const { max, step, label } = DIAL[unit];
  const halves = Math.round((max / step) * 2);
  const tip = polar(cx, cy, r - 24, angleFor(Math.min(1.02, Math.max(0, frac))));
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.white} stroke={C.ink} strokeWidth={3} />
      {Array.from({ length: halves + 1 }, (_, i) => {
        const major = i % 2 === 0;
        const deg = angleFor(i / halves);
        const a = polar(cx, cy, r - (major ? tick : tick * 0.55), deg);
        const b = polar(cx, cy, r - 3, deg);
        const t = polar(cx, cy, r - tick - fontSize * 1.2, deg);
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={(major ? 3 : 2) * Math.max(1, tick / 18)} />
            {major && (
              <text x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={C.ink}>
                {label((i / 2) * step)}
              </text>
            )}
          </g>
        );
      })}
      <text x={cx} y={cy + r * 0.5} textAnchor="middle" fontSize={fontSize * 1.6} fontWeight={800} fill={shade(C.red, -0.15)}>
        {unit}
      </text>
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={C.red} strokeWidth={Math.max(5, r / 40)} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={Math.max(10, r / 30)} fill={C.ink} />
    </g>
  );
}

/** The scale body: a tray on top and a box holding the dial. `trayY` is where things sit. */
export function ScaleBody({ cx, trayY, w, h }: { cx: number; trayY: number; w: number; h: number }) {
  return (
    <g>
      <rect x={cx - 24} y={trayY + 8} width={48} height={24} fill={shade(C.line, -0.2)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={cx - w / 2 - 20} y={trayY} width={w + 40} height={16} rx={8} fill={shade(C.line, -0.05)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={cx - w / 2} y={trayY + 30} width={w} height={h} rx={28} fill={shade(C.teal, 0.55)} stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

/**
 * A frame for a close-up: what is inside is drawn in its own coordinates (`viewBox`) and clipped to
 * the frame, with lines linking it back to the small `spot` it magnifies.
 */
function Zoom({ viewBox, spot, children }: { viewBox: string; spot: { x: number; y: number; w: number; h: number }; children: ReactNode }) {
  const f = { x: 178, y: 8, w: 334, h: 164 };
  return (
    <g>
      <line x1={spot.x + spot.w} y1={spot.y} x2={f.x} y2={f.y + 6} stroke={C.muted} strokeWidth={1.5} strokeDasharray="5 4" />
      <line x1={spot.x + spot.w} y1={spot.y + spot.h} x2={f.x} y2={f.y + f.h - 6} stroke={C.muted} strokeWidth={1.5} strokeDasharray="5 4" />
      <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx={6} fill="none" stroke={C.orange} strokeWidth={3} />
      <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={16} fill={C.white} />
      <svg x={f.x} y={f.y} width={f.w} height={f.h} viewBox={viewBox}>
        {children}
      </svg>
      <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={16} fill="none" stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

/**
 * A kitchen scale showing `value` (in its own unit) for questions: the whole dial small on the left,
 * and a big close-up of the numbers around the needle on the right so they are easy to read.
 */
export function DialPicture({ value, unit }: { value: number; unit: DialUnit }) {
  const frac = value / DIAL[unit].max;
  const small = { cx: 82, cy: 84, r: 64 };
  const tinyTip = polar(small.cx, small.cy, small.r - 14, angleFor(frac));
  const R = 420;
  const look = polar(0, 0, R - 70, angleFor(frac));
  const vw = 334 * 1.55;
  const vh = 164 * 1.55;
  return (
    <svg viewBox="0 0 520 180" role="img" aria-label={`A kitchen scale dial in ${unit === 'g' ? 'grams' : 'kilograms'}, with a close-up of the needle`}>
      <rect x={small.cx - small.r - 10} y={small.cy - small.r - 10} width={small.r * 2 + 20} height={small.r * 2 + 20} rx={18} fill={shade(C.teal, 0.55)} stroke={C.ink} strokeWidth={2.5} />
      <DialFace cx={small.cx} cy={small.cy} r={small.r} unit={unit} frac={frac} fontSize={0} />
      <text x={small.cx} y={174} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
        {unit === 'g' ? 'grams' : 'kilograms'}
      </text>
      <Zoom viewBox={`${look.x - vw / 2} ${look.y - vh / 2} ${vw} ${vh}`} spot={{ x: tinyTip.x - 16, y: tinyTip.y - 16, w: 32, h: 32 }}>
        <DialFace cx={0} cy={0} r={R} unit={unit} frac={frac} fontSize={40} tick={54} />
      </Zoom>
    </svg>
  );
}

/* ───────────────────────── Measuring jug ───────────────────────── */

/**
 * A see-through measuring jug, 0–1000 ml from `bottom` up to `bottom - h`, with a tick every 50 ml
 * and a number every 100 ml. Filled to `ml`.
 */
export function Jug({ x, bottom, w, h, ml, fontSize = 16 }: { x: number; bottom: number; w: number; h: number; ml: number; fontSize?: number }) {
  const clip = useId().replace(/:/g, '');
  const top = bottom - h - 34;
  const body = `M${x - 18},${top - 8} L${x},${top + 16} L${x},${bottom - 16} Q${x},${bottom} ${x + 16},${bottom} L${x + w - 16},${bottom} Q${x + w},${bottom} ${x + w},${bottom - 16} L${x + w},${top} Z`;
  const level = bottom - (Math.min(1000, Math.max(0, ml)) / 1000) * h;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={`M${x + w},${top + 40} C${x + w + 70},${top + 40} ${x + w + 70},${bottom - 90} ${x + w},${bottom - 90}`} fill="none" stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      <path d={body} fill={shade(C.blue, 0.88)} />
      <rect x={x - 20} y={level} width={w + 40} height={bottom - level + 4} fill={shade(C.blue, 0.45)} clipPath={`url(#${clip})`} />
      {ml > 0 && ml < 1000 && <line x1={x} y1={level} x2={x + w} y2={level} stroke={shade(C.blue, -0.15)} strokeWidth={3} />}
      {Array.from({ length: 20 }, (_, i) => {
        const v = (i + 1) * 50;
        const y = bottom - (v / 1000) * h;
        const major = v % 100 === 0;
        return (
          <g key={v}>
            <line x1={x} y1={y} x2={x + (major ? 34 : 18)} y2={y} stroke={C.ink} strokeWidth={major ? 2.5 : 1.5} />
            {major && (
              <text x={x + 42} y={y} dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={C.ink}>
                {v} ml
              </text>
            )}
          </g>
        );
      })}
      <path d={body} fill="none" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
}

/** A measuring jug filled to `ml`, for questions: the whole jug small, and a close-up of the lines near the water. */
export function JugPicture({ ml }: { ml: number }) {
  const mini = { x: 40, bottom: 168, w: 80, h: 120 };
  const k = 0.44; // close-up units per ml
  const big = { x: 0, bottom: 1000 * k, w: 520, h: 1000 * k };
  // Nudge the close-up a little so the water line is not always in the middle.
  const nudge = ((Math.round(ml / 50) % 3) - 1) * 26;
  const vy = big.bottom - ml * k - 82 + nudge;
  const shown = (y: number) => (big.bottom - y) / k;
  const miniY = (v: number) => mini.bottom - (Math.max(0, Math.min(1000, v)) / 1000) * mini.h;
  const topY = miniY(shown(vy));
  const botY = miniY(shown(vy + 164));
  return (
    <svg viewBox="0 0 520 180" role="img" aria-label="A measuring jug with water, with a close-up of the lines">
      <Jug x={mini.x} bottom={mini.bottom} w={mini.w} h={mini.h} ml={ml} fontSize={0} />
      <Zoom viewBox={`-30 ${vy} 334 164`} spot={{ x: mini.x - 6, y: topY, w: mini.w + 12, h: Math.max(8, botY - topY) }}>
        <Jug x={big.x} bottom={big.bottom} w={big.w} h={big.h} ml={ml} fontSize={26} />
      </Zoom>
    </svg>
  );
}
