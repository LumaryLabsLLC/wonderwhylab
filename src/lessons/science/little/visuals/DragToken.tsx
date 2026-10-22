import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';

/**
 * Something a child can pick up and drop (or just tap). Draw it at its home spot `at`;
 * while it is being dragged, the parent draws a copy at the pointer (from `onMove`) and this one fades.
 * The original stays in place so it keeps the pointer for the whole drag.
 */
export function DragToken({
  at,
  r = 40,
  dragging = false,
  disabled = false,
  label,
  onMove,
  onDrop,
  onTap,
  children,
}: {
  at: Pt;
  /** Size of the invisible grab area. */
  r?: number;
  dragging?: boolean;
  disabled?: boolean;
  label: string;
  onMove: (p: Pt) => void;
  onDrop: (p: Pt) => void;
  /** Called instead of onDrop when the token was tapped without moving. */
  onTap?: () => void;
  children: ReactNode;
}) {
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      onMove(p);
    },
    {
      onStart: (p) => {
        start.current = p;
        last.current = p;
      },
      onEnd: () => {
        const s = start.current;
        const l = last.current;
        start.current = null;
        if (!l) return;
        if (onTap && s && Math.hypot(l.x - s.x, l.y - s.y) < 6) onTap();
        else onDrop(l);
      },
    },
  );
  return (
    <g transform={`translate(${at.x} ${at.y})`} opacity={dragging ? 0.25 : 1}>
      <g {...(disabled ? {} : drag)} role={disabled ? undefined : 'button'} aria-label={label}>
        <circle r={r} fill="transparent" />
        {children}
      </g>
    </g>
  );
}

export const inside = (p: Pt, r: { x: number; y: number; w: number; h: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
