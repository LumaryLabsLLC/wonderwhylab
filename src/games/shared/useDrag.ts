import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

/** Where a dragged piece currently is, relative to where it started. */
export interface DragOffset {
  id: string;
  dx: number;
  dy: number;
}

/**
 * Drag pieces with mouse or touch, or tap them (tap a piece, then tap a target).
 * `onDrop` gets the pointer's screen position; `onTap` fires for a tap or keyboard activation.
 */
export function useDrag(opts: {
  onDrop: (id: string, x: number, y: number) => void;
  onTap: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  const press = useRef<{ id: string; pointerId: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [offset, setOffset] = useState<DragOffset | null>(null);
  const handlers = useRef(opts);
  handlers.current = opts;

  const bind = (id: string) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      press.current = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const p = press.current;
      if (!p || p.pointerId !== e.pointerId) return;
      const dx = e.clientX - p.sx;
      const dy = e.clientY - p.sy;
      if (!p.moved && Math.hypot(dx, dy) < 6) return;
      p.moved = true;
      setOffset({ id, dx, dy });
      handlers.current.onMove?.(id, e.clientX, e.clientY);
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      const p = press.current;
      if (!p || p.pointerId !== e.pointerId) return;
      press.current = null;
      setOffset(null);
      if (p.moved) handlers.current.onDrop(id, e.clientX, e.clientY);
      else handlers.current.onTap(id);
    },
    onPointerCancel() {
      press.current = null;
      setOffset(null);
    },
    onClick(e: ReactMouseEvent<HTMLElement>) {
      // Keyboard activation only; pointer taps are handled in onPointerUp.
      if (e.detail === 0) handlers.current.onTap(id);
    },
  });

  return { offset, bind };
}

/**
 * The drop target under (or nearest to) a screen point. Targets are elements carrying
 * `data-<attr>="<id>"`. Among targets whose box holds the point (or whose centre is within
 * `reach` pixels), the one with the closest centre wins.
 */
export function targetAt(attr: string, x: number, y: number, reach = 64): string | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-${attr}]`);
  let best: string | null = null;
  let bestDist = Infinity;
  els.forEach((el) => {
    const id = el.getAttribute(`data-${attr}`);
    if (!id) return;
    const r = el.getBoundingClientRect();
    const inside = x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if ((inside || d <= reach) && d < bestDist) {
      bestDist = d;
      best = id;
    }
  });
  return best;
}
