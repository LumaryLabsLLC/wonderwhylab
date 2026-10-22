import type { ReactElement } from 'react';
import { C, shade } from '../../../lib/color';

export type PanItem = 'x' | 'one';

/** Mystery boxes and unit weights stacked on a pan, centred on `cx`, resting on `baseY`. */
export function PanItems({ cx, baseY, items, scale = 1, reveal }: { cx: number; baseY: number; items: PanItem[]; scale?: number; reveal?: number }) {
  const size = (k: PanItem) => (k === 'x' ? 54 : 38) * scale;
  const gap = 5 * scale;
  const maxW = 224 * scale;

  const rows: PanItem[][] = [[]];
  let w = 0;
  for (const it of items) {
    const s = size(it) + gap;
    if (w + s > maxW && rows[rows.length - 1].length) {
      rows.push([]);
      w = 0;
    }
    rows[rows.length - 1].push(it);
    w += s;
  }

  const out: ReactElement[] = [];
  let y = baseY;
  rows.forEach((row, r) => {
    const rowW = row.reduce((sum, it) => sum + size(it) + gap, -gap);
    const rowH = Math.max(...row.map(size), 0);
    let x = cx - rowW / 2;
    row.forEach((it, i) => {
      const s = size(it);
      const top = y - s;
      out.push(
        it === 'x' ? (
          <g key={`${r}-${i}`}>
            <rect x={x} y={top} width={s} height={s} rx={6 * scale} fill={C.purple} stroke={C.ink} strokeWidth={2 * scale} />
            <rect x={x + 4 * scale} y={top + 4 * scale} width={s - 8 * scale} height={s * 0.22} rx={3 * scale} fill={shade(C.purple, 0.25)} />
            <text x={x + s / 2} y={top + s / 2 + 3 * scale} textAnchor="middle" dominantBaseline="central" fontSize={(reveal !== undefined ? 26 : 30) * scale} fontWeight={700} fontStyle={reveal !== undefined ? 'normal' : 'italic'} fill={C.white}>
              {reveal !== undefined ? reveal : 'x'}
            </text>
          </g>
        ) : (
          <g key={`${r}-${i}`}>
            <rect x={x} y={top + 6 * scale} width={s} height={s - 6 * scale} rx={5 * scale} fill={C.yellow} stroke={C.ink} strokeWidth={2 * scale} />
            <rect x={x + s * 0.3} y={top} width={s * 0.4} height={9 * scale} rx={3 * scale} fill={shade(C.yellow, -0.15)} stroke={C.ink} strokeWidth={1.6 * scale} />
            <text x={x + s / 2} y={top + s / 2 + 4 * scale} textAnchor="middle" dominantBaseline="central" fontSize={18 * scale} fontWeight={700} fill={C.ink}>
              1
            </text>
          </g>
        ),
      );
      x += s + gap;
    });
    y -= rowH + gap;
  });
  return <g>{out}</g>;
}

export function itemsFor(nx: number, ones: number): PanItem[] {
  return [...Array<PanItem>(nx).fill('x'), ...Array<PanItem>(ones).fill('one')];
}

/** A balanced scale for question cards: nx mystery boxes + a ones on the left, b ones on the right. */
export function BalancePicture({ nx, a, b }: { nx: number; a: number; b: number }) {
  const s = 0.62;
  return (
    <svg viewBox="0 0 440 230" role="img" aria-label={`A balanced scale: ${nx} mystery box${nx > 1 ? 'es' : ''} and ${a} ones on the left, ${b} ones on the right`}>
      <path d="M200 214 h40 l-8 -22 h-24 z" fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <rect x={215} y={50} width={10} height={146} fill={shade(C.wood, -0.2)} stroke={C.ink} strokeWidth={1.5} />
      <rect x={60} y={44} width={320} height={10} rx={5} fill={shade(C.wood, -0.1)} stroke={C.ink} strokeWidth={2} />
      <circle cx={220} cy={49} r={7} fill={C.ink} />
      {[110, 330].map((cx) => (
        <g key={cx}>
          <path d={`M${cx},54 L${cx - 78},150 M${cx},54 L${cx + 78},150`} stroke={C.ink} strokeWidth={1.5} />
          <path d={`M${cx - 86},150 Q${cx},180 ${cx + 86},150 Z`} fill={C.card} stroke={C.ink} strokeWidth={2} />
        </g>
      ))}
      <PanItems cx={110} baseY={150} items={itemsFor(nx, a)} scale={s} />
      <PanItems cx={330} baseY={150} items={itemsFor(0, b)} scale={s} />
    </svg>
  );
}
