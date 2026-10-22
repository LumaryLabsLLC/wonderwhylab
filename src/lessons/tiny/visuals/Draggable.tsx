import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';

/**
 * Something a child can pick up and drop, drawn at (x, y) in scene coordinates.
 * A short press without moving counts as a tap (for tap-then-tap placing), so it works on every device.
 * `onDrop` gets the pointer position where it was let go; the parent decides where it lands.
 */
export function Draggable({
  x,
  y,
  label,
  onDrop,
  onTap,
  onLift,
  children,
}: {
  x: number;
  y: number;
  label: string;
  onDrop: (p: Pt) => void;
  onTap?: () => void;
  /**
   * Called when a real drag begins. Don't reorder this element in the DOM in response:
   * moving it would drop the pointer capture and end the drag.
   */
  onLift?: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const moved = useRef(false);
  const node = useRef<SVGGElement>(null);

  const handlers = useSvgDrag(
    (p) => {
      if (!start.current) return;
      last.current = p;
      const dx = p.x - start.current.x;
      const dy = p.y - start.current.y;
      if (!moved.current && Math.hypot(dx, dy) < 7) return;
      if (!moved.current) onLift?.();
      moved.current = true;
      setOffset({ x: dx, y: dy });
    },
    {
      onStart: (p) => {
        start.current = p;
        last.current = p;
        moved.current = false;
      },
      onEnd: () => {
        const wasMoved = moved.current;
        const at = last.current;
        start.current = null;
        moved.current = false;
        setOffset(null);
        // Pointer users don't need the keyboard focus ring left behind on the item.
        node.current?.blur();
        if (wasMoved && at) onDrop(at);
        else onTap?.();
      },
    },
  );

  return (
    <g
      ref={node}
      {...handlers}
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap?.();
        }
      }}
      transform={offset ? `translate(${offset.x} ${offset.y})` : undefined}
      style={{ ...handlers.style, cursor: offset ? 'grabbing' : 'grab' }}
    >
      {/* Generous invisible hit area around the item */}
      <circle cx={x} cy={y} r={34} fill="transparent" />
      {children}
    </g>
  );
}
