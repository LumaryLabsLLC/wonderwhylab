import { useRef } from 'react';
import type { ReactNode } from 'react';
import { EMOJI_FONT } from '../../../games/reading/words';
import { C, shade } from '../../../lib/color';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { wrap } from '../../../stage/Predict';

/** Shared drawing and interaction helpers for the Life Skills lessons. */

/** An emoji drawn inside a scene, centred on (x, y). */
export function Emoji({ e, x, y, size = 48 }: { e: string; x: number; y: number; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontFamily={EMOJI_FONT} style={{ pointerEvents: 'none' }}>
      {e}
    </text>
  );
}

/** A big emoji with an optional caption, for question pictures and choice buttons. */
export function EmojiPicture({ e, caption, label }: { e: string; caption?: string; label?: string }) {
  return (
    <svg viewBox={caption ? '0 0 200 160' : '0 0 200 120'} role="img" aria-label={label ?? caption ?? e}>
      <text x={100} y={62} textAnchor="middle" dominantBaseline="central" fontSize={78} fontFamily={EMOJI_FONT}>
        {e}
      </text>
      {caption && (
        <text x={100} y={144} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink}>
          {caption}
        </text>
      )}
    </svg>
  );
}

/** An answer-button label: a big emoji over a short caption (HTML, so the caption stays readable). */
export function EmojiLabel({ e, text }: { e: string; text: string }) {
  return (
    <span style={{ display: 'grid', placeItems: 'center', gap: 2, lineHeight: 1.15 }}>
      <span aria-hidden style={{ fontSize: '1.6em', fontFamily: EMOJI_FONT }}>
        {e}
      </span>
      <span style={{ fontSize: 'calc(17px * var(--fs, 1))' }}>{text}</span>
    </span>
  );
}

/** Several emoji in a row, e.g. a little scene for a situation question. */
export function EmojiRow({ items, label }: { items: string[]; label: string }) {
  const w = items.length * 90 + 20;
  return (
    <svg viewBox={`0 0 ${w} 110`} role="img" aria-label={label}>
      {items.map((e, i) => (
        <text key={i} x={55 + i * 90} y={56} textAnchor="middle" dominantBaseline="central" fontSize={70} fontFamily={EMOJI_FONT}>
          {e}
        </text>
      ))}
    </svg>
  );
}

/** Wrapped text lines starting at (x, y). Returns the text block. */
export function Lines({
  text,
  x,
  y,
  max = 30,
  size = 17,
  lh = 22,
  anchor = 'start',
  weight = 400,
  fill = C.ink,
}: {
  text: string;
  x: number;
  y: number;
  max?: number;
  size?: number;
  lh?: number;
  anchor?: 'start' | 'middle';
  weight?: number;
  fill?: string;
}) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {wrap(text, max).map((line, i) => (
        <text key={i} x={x} y={y + i * lh} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor}>
          {line}
        </text>
      ))}
    </g>
  );
}

/** A soft card with an ink outline. */
export function Card({
  x,
  y,
  w,
  h,
  fill = C.card,
  stroke = C.ink,
  dashed = false,
  r = 16,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  dashed?: boolean;
  r?: number;
  children?: ReactNode;
}) {
  return (
    <g>
      {!dashed && <rect x={x + 3} y={y + 5} width={w} height={h} rx={r} fill={C.ink} opacity={0.08} />}
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dashed ? '8 6' : undefined} />
      {children}
    </g>
  );
}

/** A one-line message box that wraps; used for gentle feedback in scenes. */
export function Note({ x, y, w, text, tone = 'info' }: { x: number; y: number; w: number; text: string; tone?: 'info' | 'good' | 'nudge' }) {
  const lines = wrap(text, Math.floor((w - 28) / 8.8));
  const h = 22 + lines.length * 22;
  const fill = tone === 'good' ? shade(C.green, 0.82) : tone === 'nudge' ? shade(C.yellow, 0.75) : C.card;
  return (
    <g role="status">
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={C.ink} strokeWidth={1.5} />
      {lines.map((l, i) => (
        <text key={i} x={x + 14} y={y + 26 + i * 22} fontSize={16} fill={C.ink}>
          {l}
        </text>
      ))}
    </g>
  );
}

/**
 * Something a child can pick up and drop, or just tap. It is drawn at its home spot; while dragging,
 * the parent draws a ghost copy at the pointer (from `onMove`). The original keeps the pointer capture
 * for the whole drag, so never reorder or unmount it mid-drag.
 */
export function DragItem({
  at,
  r = 44,
  dragging = false,
  disabled = false,
  label,
  onMove,
  onDrop,
  onTap,
  children,
}: {
  at: Pt;
  r?: number;
  dragging?: boolean;
  disabled?: boolean;
  label: string;
  onMove: (p: Pt) => void;
  onDrop: (p: Pt) => void;
  onTap?: () => void;
  children: ReactNode;
}) {
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const moved = useRef(false);
  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      // Only report a drag once the pointer really moves, so a tap never leaves a ghost behind.
      const s = start.current;
      if (!moved.current && s && Math.hypot(p.x - s.x, p.y - s.y) < 8) return;
      moved.current = true;
      onMove(p);
    },
    {
      onStart: (p) => {
        start.current = p;
        last.current = p;
        moved.current = false;
      },
      onEnd: () => {
        const l = last.current;
        const wasMoved = moved.current;
        start.current = null;
        moved.current = false;
        if (!l) return;
        if (onTap && !wasMoved) onTap();
        else onDrop(l);
      },
    },
  );
  return (
    <g transform={`translate(${at.x} ${at.y})`} opacity={dragging ? 0.3 : 1}>
      <g {...(disabled ? {} : drag)} role={disabled ? undefined : 'button'} aria-label={label}>
        <circle r={r} fill="transparent" />
        {children}
      </g>
    </g>
  );
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inside = (p: Pt, b: Box) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

/** A tappable SVG group with keyboard support. */
export function Tap({ label, onTap, children, disabled = false }: { label: string; onTap: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <g
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      data-nopan
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      // Keep keyboard focus rings, but don't leave one behind after a mouse tap.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => !disabled && onTap()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap();
        }
      }}
    >
      {children}
    </g>
  );
}
