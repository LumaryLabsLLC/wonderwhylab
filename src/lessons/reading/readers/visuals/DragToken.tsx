import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';

/**
 * Something the child can drag to a target (or tap to select, as a fallback).
 * Children are drawn around (0, 0); the token sits at (x, y).
 * `shakeKey` changes to replay a little "not yet" wobble.
 */
export function DragToken({
  x,
  y,
  label,
  onDrop,
  onTap,
  children,
  disabled = false,
  shakeKey = 0,
  selected = false,
}: {
  x: number;
  y: number;
  label: string;
  onDrop: (p: Pt) => void;
  onTap: () => void;
  children: ReactNode;
  disabled?: boolean;
  shakeKey?: number;
  selected?: boolean;
}) {
  const [offset, setOffset] = useState<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const moved = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 6;

  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      if (start.current && moved(p, start.current)) setOffset({ x: p.x - start.current.x, y: p.y - start.current.y });
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
        setOffset(null);
        if (!s || !l) return;
        if (moved(l, s)) onDrop(l);
        else onTap();
      },
    },
  );

  const props = disabled ? {} : drag;
  return (
    <g
      transform={`translate(${x + (offset?.x ?? 0)} ${y + (offset?.y ?? 0)})`}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap();
        }
      }}
      {...props}
      style={disabled ? undefined : { cursor: offset ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <g key={shakeKey}>
        {shakeKey > 0 && (
          <animateTransform attributeName="transform" type="translate" values="0 0; -9 0; 9 0; -6 0; 6 0; 0 0" dur="0.4s" fill="freeze" />
        )}
        <g transform={offset ? 'scale(1.06)' : undefined}>{children}</g>
      </g>
    </g>
  );
}

/** Is point p inside the rectangle? */
export const inside = (p: Pt, r: { x: number; y: number; w: number; h: number }) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
