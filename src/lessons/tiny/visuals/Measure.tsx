import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { C, shade } from '../../../lib/color';

/** Draw emoji with the system emoji font (Unicode 12 or older only). */
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function Emoji({ char, x, y, size }: { char: string; x: number; y: number; size: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} style={{ fontFamily: EMOJI_FONT }}>
      {char}
    </text>
  );
}

/** Smoothly animate a number towards `target` (instant when reduced motion is on). */
export function useTween(target: number, ms = 600): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = from + (target - from) * (1 - (1 - k) ** 3);
      current.current = v;
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/* ───────────────────────── Things to weigh ───────────────────────── */

export type WeighId = 'balloon' | 'strawberry' | 'apple' | 'ball' | 'books' | 'watermelon';

/** Relative weights only (balloon lightest … watermelon heaviest), true to real life. `size` is how big it looks. */
export const WEIGH_THINGS: Record<WeighId, { emoji: string; name: string; weight: number; size: number }> = {
  balloon: { emoji: '🎈', name: 'balloon', weight: 1, size: 1.3 },
  strawberry: { emoji: '🍓', name: 'strawberry', weight: 2, size: 0.75 },
  apple: { emoji: '🍎', name: 'apple', weight: 3, size: 0.9 },
  ball: { emoji: '⚽', name: 'ball', weight: 5, size: 1 },
  books: { emoji: '📚', name: 'books', weight: 7, size: 1 },
  watermelon: { emoji: '🍉', name: 'watermelon', weight: 9, size: 1.15 },
};

export const WEIGH_IDS = Object.keys(WEIGH_THINGS) as WeighId[];

/** Tilt in degrees: the heavier side goes down (positive = right side down). */
export function tiltFor(left: WeighId | null, right: WeighId | null): number {
  const l = left ? WEIGH_THINGS[left].weight : 0;
  const r = right ? WEIGH_THINGS[right].weight : 0;
  if (l === r) return 0;
  return r > l ? 12 : -12;
}

/**
 * A pan balance. The beam pivots at (cx, cy); pans hang from each end and stay level.
 * `leftContent` / `rightContent` are drawn sitting on the pans.
 */
export function Balance({
  cx,
  cy,
  half = 200,
  tilt,
  leftContent,
  rightContent,
  panGlow,
}: {
  cx: number;
  cy: number;
  half?: number;
  tilt: number;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  panGlow?: 'left' | 'right' | null;
}) {
  const a = (tilt * Math.PI) / 180;
  const lx = cx - half * Math.cos(a);
  const ly = cy - half * Math.sin(a);
  const rx = cx + half * Math.cos(a);
  const ry = cy + half * Math.sin(a);
  const drop = 90;
  const pan = (x: number, y: number, side: 'left' | 'right', content?: ReactNode) => (
    <g>
      <line x1={x} y1={y} x2={x - 60} y2={y + drop} stroke={C.ink2} strokeWidth={2} />
      <line x1={x} y1={y} x2={x + 60} y2={y + drop} stroke={C.ink2} strokeWidth={2} />
      <path
        d={`M${x - 78},${y + drop} L${x + 78},${y + drop} Q${x + 70},${y + drop + 26} ${x},${y + drop + 28} Q${x - 70},${y + drop + 26} ${x - 78},${y + drop} Z`}
        fill={panGlow === side ? shade(C.yellow, 0.5) : shade(C.wood, 0.2)}
        stroke={C.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {content && <g transform={`translate(${x} ${y + drop - 6})`}>{content}</g>}
    </g>
  );
  return (
    <g>
      {/* Stand */}
      <rect x={cx - 70} y={cy + 238} width={140} height={22} rx={8} fill={shade(C.wood, -0.1)} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${cx - 14},${cy + 238} L${cx - 8},${cy} L${cx + 8},${cy} L${cx + 14},${cy + 238} Z`} fill={C.wood} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      {/* Beam */}
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke={shade(C.wood, 0.1)} strokeWidth={8} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={12} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
      {/* Level pointer */}
      <line x1={cx} y1={cy} x2={cx + 46 * Math.sin(a)} y2={cy - 46 * Math.cos(a)} stroke={C.red} strokeWidth={4} strokeLinecap="round" />
      {pan(lx, ly, 'left', leftContent)}
      {pan(rx, ry, 'right', rightContent)}
    </g>
  );
}

/** Small balance for question cards. */
export function BalancePicture({ left, right }: { left: WeighId; right: WeighId }) {
  const tilt = tiltFor(left, right);
  const item = (id: WeighId) => {
    const t = WEIGH_THINGS[id];
    return <Emoji char={t.emoji} x={0} y={-32 * t.size} size={64 * t.size} />;
  };
  return (
    <svg viewBox="80 40 440 330" role="img" aria-label={`A balance with a ${WEIGH_THINGS[left].name} and a ${WEIGH_THINGS[right].name}`}>
      <Balance cx={300} cy={120} half={170} tilt={tilt} leftContent={item(left)} rightContent={item(right)} />
    </svg>
  );
}

/** Two or three things side by side (no scale) for "which is heavier?" from everyday knowledge. */
export function ThingsInARow({ ids }: { ids: WeighId[] }) {
  const w = ids.length * 150;
  return (
    <svg viewBox={`0 0 ${w} 150`} role="img" aria-label={ids.map((i) => WEIGH_THINGS[i].name).join(', ')}>
      {ids.map((id, i) => {
        const t = WEIGH_THINGS[id];
        return (
          <g key={id}>
            <Emoji char={t.emoji} x={75 + i * 150} y={62} size={80 * Math.min(1.1, t.size)} />
            <text x={75 + i * 150} y={136} textAnchor="middle" fontSize={20} fill={C.ink}>
              {t.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ───────────────────────── Containers to fill ───────────────────────── */

export type ContainerId = 'glass' | 'bowl' | 'jug';

/** How many cups fill each container. The tall glass holds less than the wide bowl. */
export const CONTAINERS: Record<ContainerId, { name: string; cups: number; w: number; h: number }> = {
  glass: { name: 'glass', cups: 3, w: 70, h: 170 },
  bowl: { name: 'bowl', cups: 6, w: 190, h: 100 },
  jug: { name: 'jug', cups: 5, w: 110, h: 150 },
};

export const CONTAINER_IDS = Object.keys(CONTAINERS) as ContainerId[];

function containerPath(id: ContainerId, x: number, bottom: number): string {
  const { w, h } = CONTAINERS[id];
  const l = x - w / 2;
  const r = x + w / 2;
  const t = bottom - h;
  if (id === 'bowl') return `M${l},${t} L${r},${t} Q${r},${bottom} ${x},${bottom} Q${l},${bottom} ${l},${t} Z`;
  if (id === 'jug') return `M${l},${t} L${r},${t} L${r - 8},${bottom - 10} Q${r - 8},${bottom} ${r - 18},${bottom} L${l + 18},${bottom} Q${l + 8},${bottom} ${l + 8},${bottom - 10} Z`;
  return `M${l},${t} L${r},${t} L${r - 4},${bottom - 8} Q${r - 4},${bottom} ${r - 12},${bottom} L${l + 12},${bottom} Q${l + 4},${bottom} ${l + 4},${bottom - 8} Z`;
}

/**
 * A see-through container centred on x, standing on `bottom`, filled to `level` (0–1).
 * The water fills the shape from the bottom up.
 */
export function Container({
  id,
  x,
  bottom,
  level,
  selected = false,
  scale = 1,
}: {
  id: ContainerId;
  x: number;
  bottom: number;
  level: number;
  selected?: boolean;
  scale?: number;
}) {
  const clip = useId().replace(/:/g, '');
  const { w, h } = CONTAINERS[id];
  const path = containerPath(id, 0, 0);
  const waterTop = -h * Math.min(1, Math.max(0, level));
  return (
    <g transform={`translate(${x} ${bottom}) scale(${scale})`}>
      <defs>
        <clipPath id={clip}>
          <path d={path} />
        </clipPath>
      </defs>
      {selected && <path d={path} fill="none" stroke={C.yellow} strokeWidth={14} strokeLinejoin="round" opacity={0.8} />}
      <path d={path} fill={shade(C.blue, 0.88)} />
      <rect x={-w / 2 - 10} y={waterTop} width={w + 20} height={h + 10} fill={shade(C.blue, 0.35)} clipPath={`url(#${clip})`} />
      {level > 0 && level < 1 && <line x1={-w / 2} y1={waterTop} x2={w / 2} y2={waterTop} stroke={shade(C.blue, -0.1)} strokeWidth={2} clipPath={`url(#${clip})`} />}
      {id === 'jug' && <path d={`M${w / 2 - 4},${-h + 28} q34,6 30,40 q-4,30 -34,30`} fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" />}
      <path d={path} fill="none" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
}

/** Containers in a row, each labelled with how many cups it holds (for questions). */
export function ContainersPicture({ ids, showCups = true }: { ids: ContainerId[]; showCups?: boolean }) {
  const gap = 230;
  const w = ids.length * gap;
  return (
    <svg viewBox={`0 0 ${w} 280`} role="img" aria-label={ids.map((i) => `${CONTAINERS[i].name}${showCups ? ` holds ${CONTAINERS[i].cups} cups` : ''}`).join(', ')}>
      {ids.map((id, i) => (
        <g key={id}>
          <Container id={id} x={gap / 2 + i * gap} bottom={200} level={1} />
          <text x={gap / 2 + i * gap} y={236} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>
            {CONTAINERS[id].name}
          </text>
          {showCups && (
            <text x={gap / 2 + i * gap} y={266} textAnchor="middle" fontSize={22} fill={shade(C.blue, -0.3)}>
              holds {CONTAINERS[id].cups} cups
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
