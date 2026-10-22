import { useMemo, useRef, useState } from 'react';
import { C, shade } from '../../../../lib/color';
import { play } from '../../../../lib/sound';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';

/**
 * Lowercase letters for handwriting, drawn on four guide lines.
 * Units: u runs 0 → 1 across the letter; v is 0 at the top line, 0.45 at the middle line,
 * 1 at the baseline and 1.35 at the bottom of a tail.
 */
type P = [number, number];

export const MID = 0.45;
export const BASE = 1;
export const TAIL = 1.35;

/** Points on an ellipse arc; angles in degrees, 0 = right, 90 = down (SVG coordinates). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 30): P[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}

/** The curly "c" every round letter starts with: from the top right, up and over, round to the bottom. */
const CURL_C = arc(0.5, 0.725, 0.45, 0.275, -40, -320);
/** For a, d and g the curl closes the circle, finishing at the right-hand side. */
const CURL_CLOSED = arc(0.5, 0.725, 0.45, 0.275, -30, -360, 36);
/** Back up the stick, then over a hump: used by n, m, r and h. */
const hump = (left: number, right: number): P[] => arc((left + right) / 2, 0.64, (right - left) / 2, 0.19, 180, 360, 18);

/** Each letter is a list of strokes, in the order and direction a child writes them. */
export const LOWER: Record<string, { width: number; strokes: P[][] }> = {
  c: { width: 1, strokes: [CURL_C] },
  a: { width: 1, strokes: [[...CURL_CLOSED, [0.95, MID], [0.95, BASE]]] },
  d: { width: 1, strokes: [[...CURL_CLOSED, [0.95, 0], [0.95, BASE]]] },
  g: { width: 1, strokes: [[...CURL_CLOSED, [0.95, MID], [0.95, 1.18], ...arc(0.55, 1.18, 0.4, 0.15, 0, 165, 14).slice(1)]] },
  l: { width: 0.5, strokes: [[[0.5, 0], [0.5, BASE]]] },
  t: { width: 0.7, strokes: [[[0.5, 0.15], [0.5, BASE]], [[0.12, MID], [0.88, MID]]] },
  i: { width: 0.5, strokes: [[[0.5, MID], [0.5, BASE]], [[0.5, 0.2], [0.5, 0.25]]] },
  n: { width: 1, strokes: [[[0.12, MID], [0.12, BASE], [0.12, 0.64], ...hump(0.12, 0.88).slice(1), [0.88, BASE]]] },
  m: {
    width: 1.5,
    strokes: [[[0.08, MID], [0.08, BASE], [0.08, 0.64], ...hump(0.08, 0.5).slice(1), [0.5, BASE], [0.5, 0.64], ...hump(0.5, 0.92).slice(1), [0.92, BASE]]],
  },
  r: { width: 0.8, strokes: [[[0.15, MID], [0.15, BASE], [0.15, 0.64], ...arc(0.5, 0.64, 0.35, 0.19, 180, 300, 12).slice(1)]] },
  h: { width: 1, strokes: [[[0.12, 0], [0.12, BASE], [0.12, 0.64], ...hump(0.12, 0.88).slice(1), [0.88, BASE]]] },
};

export interface Family {
  id: string;
  name: string;
  letters: string[];
  tip: string;
}

export const FAMILIES: Family[] = [
  { id: 'curly', name: 'Curly c family', letters: ['c', 'a', 'd', 'g'], tip: 'Start like c: at the top, go up, over and round.' },
  { id: 'line', name: 'Long line family', letters: ['l', 't', 'i'], tip: 'Start at the top of the stick and go straight down.' },
  { id: 'hump', name: 'Hump family', letters: ['n', 'm', 'r', 'h'], tip: 'Go down, back up, then over the hump.' },
];

export const familyOf = (letter: string) => FAMILIES.find((f) => f.letters.includes(letter))!;

/** Where a letter's guide lines and strokes sit in the scene. */
export interface PadBox {
  /** Left edge of the letter. */
  x: number;
  /** The top guide line. */
  top: number;
  /** Pixels from the top line to the baseline. */
  h: number;
  /** Pixels for one unit of letter width. */
  unit: number;
}

export function padFor(letter: string, cx: number, top: number, h: number, unit: number): PadBox {
  return { x: cx - (LOWER[letter].width * unit) / 2, top, h, unit };
}

/** Strokes as evenly spaced points in scene coordinates. */
export function strokePoints(letter: string, box: PadBox, spacing = 9): Pt[][] {
  const { width, strokes } = LOWER[letter];
  return strokes.map((stroke) => {
    const pts = stroke.map(([u, v]) => ({ x: box.x + u * width * box.unit, y: box.top + v * box.h }));
    const out: Pt[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / spacing));
      for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    return out;
  });
}

export const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

/** Four guide lines: top, middle (dashed), baseline (solid), tail line. */
export function GuideLines({ x1, x2, top, h }: { x1: number; x2: number; top: number; h: number }) {
  const y = (v: number) => top + v * h;
  return (
    <g>
      <line x1={x1} x2={x2} y1={y(0)} y2={y(0)} stroke={shade(C.blue, 0.4)} strokeWidth={2} />
      <line x1={x1} x2={x2} y1={y(MID)} y2={y(MID)} stroke={shade(C.blue, 0.3)} strokeWidth={2} strokeDasharray="10 8" />
      <line x1={x1} x2={x2} y1={y(BASE)} y2={y(BASE)} stroke={C.red} strokeWidth={3} />
      <line x1={x1} x2={x2} y1={y(TAIL)} y2={y(TAIL)} stroke={shade(C.blue, 0.4)} strokeWidth={2} />
    </g>
  );
}

const HIT = 40;

/**
 * Trace a letter: start on the green dot and follow the path in the right direction.
 * The whole pad is the drag surface, so a finger slightly off the line still counts.
 */
export function TracePad({
  letter,
  box,
  pad,
  onDone,
}: {
  letter: string;
  box: PadBox;
  /** The drag surface. */
  pad: { x: number; y: number; w: number; h: number };
  onDone: () => void;
}) {
  const strokes = useMemo(() => strokePoints(letter, box), [letter, box]);
  const [pos, setPos] = useState({ s: 0, k: 0 });
  const active = useRef(false);
  const posRef = useRef(pos);
  posRef.current = pos;
  const done = pos.s >= strokes.length;

  const drag = useSvgDrag(
    (p) => {
      const cur = posRef.current;
      if (!active.current || cur.s >= strokes.length) return;
      const pts = strokes[cur.s];
      let best = cur.k;
      for (let j = cur.k + 1; j < Math.min(pts.length, cur.k + 9); j++) {
        if (Math.hypot(p.x - pts[j].x, p.y - pts[j].y) < HIT) best = j;
      }
      if (best === cur.k) return;
      if (best >= pts.length - 1) {
        active.current = false;
        const next = { s: cur.s + 1, k: 0 };
        setPos(next);
        play(next.s >= strokes.length ? 'correct' : 'pop');
        if (next.s >= strokes.length) onDone();
      } else setPos({ s: cur.s, k: best });
    },
    {
      onStart: (p) => {
        const cur = posRef.current;
        if (cur.s >= strokes.length) return;
        const at = strokes[cur.s][cur.k];
        active.current = Math.hypot(p.x - at.x, p.y - at.y) < HIT + 16;
      },
      onEnd: () => {
        active.current = false;
      },
    },
  );

  const pen = done ? null : strokes[pos.s][pos.k];
  const ahead = done ? null : strokes[pos.s][Math.min(strokes[pos.s].length - 1, pos.k + 5)];

  return (
    <g>
      {strokes.map((pts, i) => (
        <path key={`bg${i}`} d={pathOf(pts)} fill="none" stroke={shade(C.line, 0.35)} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {strokes.map((pts, i) => (
        <path key={`dash${i}`} d={pathOf(pts)} fill="none" stroke={C.muted} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
      ))}
      {strokes.map((pts, i) =>
        i < pos.s ? (
          <path key={`ink${i}`} d={pathOf(pts)} fill="none" stroke={C.blue} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        ) : i === pos.s && pos.k > 0 ? (
          <path key={`ink${i}`} d={pathOf(pts.slice(0, pos.k + 1))} fill="none" stroke={C.blue} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        ) : null,
      )}
      {pen && ahead && (
        <g>
          <line x1={pen.x} y1={pen.y} x2={ahead.x} y2={ahead.y} stroke={C.green} strokeWidth={4} strokeDasharray="6 6" />
          <circle cx={pen.x} cy={pen.y} r={21} fill={C.green} stroke={C.ink} strokeWidth={3} />
          {pos.k === 0 && (
            <text x={pen.x} y={pen.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.white}>
              {pos.s + 1}
            </text>
          )}
        </g>
      )}
      <rect x={pad.x} y={pad.y} width={pad.w} height={pad.h} rx={22} fill="transparent" {...drag} aria-label={`Trace the letter ${letter}`} />
    </g>
  );
}

/** A small picture of a letter on guide lines, with a dot showing a pencil position (for questions). */
export function LetterDotPicture({ letter, dot, label }: { letter: string; dot?: [number, number]; label: string }) {
  const unit = 70;
  const w = LOWER[letter].width * unit;
  const box: PadBox = { x: 60 - w / 2, top: 12, h: 90, unit };
  const strokes = strokePoints(letter, box, 4);
  const d = dot ? { x: box.x + dot[0] * LOWER[letter].width * unit, y: box.top + dot[1] * box.h } : null;
  return (
    <svg viewBox="0 0 120 140" role="img" aria-label={label}>
      <GuideLines x1={6} x2={114} top={box.top} h={box.h} />
      {strokes.map((pts, i) => (
        <path key={i} d={pathOf(pts)} fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {d && <circle cx={d.x} cy={d.y} r={9} fill={C.green} stroke={C.ink} strokeWidth={2.5} />}
    </svg>
  );
}
