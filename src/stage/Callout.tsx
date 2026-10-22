import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { useStage, WORLD_H, WORLD_W } from './Stage';

export interface CalloutProps {
  /** The point being labelled, in world coordinates (0–1000, 0–680). */
  at: [number, number];
  /** Top-left corner of the label card, in world coordinates. */
  box: [number, number];
  /** Card width (default 220). */
  w?: number;
  icon?: LucideIcon;
  title: string;
  text?: string;
}

/**
 * A labelled card joined to a point by a dashed leader line.
 * It shows just its title to keep the scene calm; tapping (or hovering) it reveals the explanation.
 * Can be rendered anywhere inside a scene (even inside its <svg>): it portals into the stage overlay.
 * Hidden when the learner turns labels off.
 */
export function Callout({ at, box, w = 220, icon: Icon, title, text }: CalloutProps) {
  const { overlay, labels } = useStage();
  const cardRef = useRef<HTMLDivElement>(null);
  // Tapping pins the explanation open; hovering with a mouse previews it.
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const open = !!text && (pinned || hover);
  // Measured card size; the card hugs its title until it is opened.
  const [size, setSize] = useState({ cw: w, h: 48 });

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (el) setSize({ cw: el.offsetWidth, h: el.offsetHeight });
  }, [title, text, w, overlay, labels, open]);

  if (!overlay || !labels) return null;

  const [ax, ay] = at;
  const [bx, by] = box;
  const { cw, h } = size;
  const inset = 18;
  let attach: [number, number];
  let elbow: [number, number];
  if (ay > by + h) {
    attach = [clampTo(ax, bx + inset, bx + cw - inset), by + h];
    elbow = [attach[0], Math.min(ay, attach[1] + 22)];
  } else if (ay < by) {
    attach = [clampTo(ax, bx + inset, bx + cw - inset), by];
    elbow = [attach[0], Math.max(ay, attach[1] - 22)];
  } else if (ax < bx) {
    attach = [bx, clampTo(ay, by + inset, by + h - inset)];
    elbow = [Math.max(ax, bx - 22), attach[1]];
  } else {
    attach = [bx + cw, clampTo(ay, by + inset, by + h - inset)];
    elbow = [Math.min(ax, bx + cw + 22), attach[1]];
  }

  return createPortal(
    <>
      <svg className="callout-line" width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden>
        <path d={`M${attach[0]},${attach[1]} L${elbow[0]},${elbow[1]} L${ax},${ay}`} />
        <circle className="callout-end" cx={attach[0]} cy={attach[1]} r={3.5} />
        <circle className="callout-ring" cx={ax} cy={ay} r={8} />
        <circle className="callout-dot" cx={ax} cy={ay} r={3.5} />
      </svg>
      <div
        ref={cardRef}
        className={`callout${open ? ' open' : ''}`}
        style={{ left: bx, top: by, width: open ? w : undefined, maxWidth: w }}
        role={text ? 'button' : undefined}
        tabIndex={text ? 0 : undefined}
        aria-expanded={text ? open : undefined}
        data-nopan
        onClick={() => setPinned(!pinned)}
        onKeyDown={(e) => {
          if (text && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setPinned(!pinned);
          }
        }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        {Icon && <Icon className="callout-icon" size={20} strokeWidth={2} />}
        <div>
          <div className="callout-title">
            {title}
            {text && !open && (
              <span className="callout-more" aria-hidden>
                ?
              </span>
            )}
          </div>
          {text && open && <p>{text}</p>}
        </div>
      </div>
    </>,
    overlay,
  );
}

function clampTo(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
