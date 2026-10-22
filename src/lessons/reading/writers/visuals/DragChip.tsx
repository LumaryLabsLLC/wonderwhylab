import { useRef, useState } from 'react';
import { C, shade } from '../../../../lib/color';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inRect = (p: Pt, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/**
 * A card you can drag (or tap). Drawn centred on (x, y). The parent decides what a drop means:
 * `onDrop` gets the card's centre where it was let go; a tap without moving calls `onTap`.
 */
export function DragChip({
  x,
  y,
  w,
  h,
  lines,
  label,
  fontSize = 18,
  fill = C.card,
  selected = false,
  shake = false,
  bold = true,
  onDrop,
  onTap,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  /** Accessible name. */
  label: string;
  fontSize?: number;
  fill?: string;
  selected?: boolean;
  shake?: boolean;
  bold?: boolean;
  onDrop: (centre: Pt) => void;
  onTap: () => void;
}) {
  const [at, setAt] = useState<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const moved = useRef(false);
  const last = useRef<Pt | null>(null);

  const drag = useSvgDrag(
    (p) => {
      const s = start.current;
      if (!s) return;
      if (!moved.current && Math.hypot(p.x - s.x, p.y - s.y) < 6) return;
      moved.current = true;
      const c = { x: x + p.x - s.x, y: y + p.y - s.y };
      last.current = c;
      setAt(c);
    },
    {
      onStart: (p) => {
        start.current = p;
        moved.current = false;
        last.current = null;
      },
      onEnd: () => {
        const c = last.current;
        const wasMoved = moved.current;
        start.current = null;
        moved.current = false;
        setAt(null);
        if (wasMoved && c) onDrop(c);
        else onTap();
      },
    },
  );

  const pos = at ?? { x, y };
  const lineH = fontSize * 1.25;
  const top = -((lines.length - 1) * lineH) / 2;
  return (
    <g
      {...drag}
      onPointerCancel={() => {
        start.current = null;
        setAt(null);
      }}
      transform={`translate(${pos.x} ${pos.y})${at ? ' rotate(-2)' : ''}`}
      className="rw-chip"
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
    >
      <g className={shake ? 'rw-shake' : undefined}>
        <rect x={-w / 2 + 3} y={-h / 2 + 5} width={w} height={h} rx={14} fill={C.ink} opacity={at ? 0.22 : 0.12} />
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={14}
          fill={selected ? shade(C.yellow, 0.55) : fill}
          stroke={selected ? C.orange : C.ink}
          strokeWidth={selected ? 3.5 : 2.5}
        />
        {lines.map((line, i) => (
          <text
            key={i}
            x={0}
            y={top + i * lineH}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={bold ? 700 : 500}
            fill={C.ink}
            style={{ pointerEvents: 'none' }}
          >
            {line}
          </text>
        ))}
      </g>
    </g>
  );
}

/** Rough text width for Lexend at a given size (good enough to size chips). */
export const textWidth = (text: string, size: number) => text.length * size * 0.58;
