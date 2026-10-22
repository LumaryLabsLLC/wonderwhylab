import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';

/**
 * An SVG piece the child can drag (or tap). Children are drawn around (0, 0).
 * `onDrop` receives where the piece's centre was let go, in scene units; the parent decides
 * whether it lands somewhere or snaps home. A press without movement counts as a tap.
 */
export function Draggable({
  x,
  y,
  onDrop,
  onTap,
  children,
  disabled = false,
  label,
}: {
  x: number;
  y: number;
  onDrop: (p: Pt) => void;
  onTap?: () => void;
  children: ReactNode;
  disabled?: boolean;
  label?: string;
}) {
  const [pos, setPos] = useState<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const grab = useRef<Pt>({ x: 0, y: 0 });
  const last = useRef<Pt | null>(null);
  const moved = useRef(false);

  const drag = useSvgDrag(
    (p) => {
      if (!start.current) return;
      if (Math.hypot(p.x - start.current.x, p.y - start.current.y) > 6) moved.current = true;
      last.current = p;
      if (moved.current) setPos({ x: p.x - grab.current.x, y: p.y - grab.current.y });
    },
    {
      onStart: (p) => {
        start.current = p;
        grab.current = { x: p.x - x, y: p.y - y };
        moved.current = false;
        last.current = p;
      },
      onEnd: () => {
        const wasMoved = moved.current;
        const end = last.current;
        start.current = null;
        setPos(null);
        if (wasMoved && end) onDrop({ x: end.x - grab.current.x, y: end.y - grab.current.y });
        else onTap?.();
      },
    },
  );

  const px = pos?.x ?? x;
  const py = pos?.y ?? y;
  return (
    <g
      transform={`translate(${px} ${py})`}
      {...(disabled ? {} : drag)}
      style={{ cursor: disabled ? 'default' : pos ? 'grabbing' : 'grab', touchAction: 'none' }}
      role={disabled ? undefined : 'button'}
      aria-label={label}
      opacity={pos ? 0.92 : 1}
    >
      {children}
    </g>
  );
}

/** Font stack for emoji drawn inside SVG text. */
export const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Split text into lines that fit roughly `width` units at `fontSize` (simple character estimate). */
export function wrapLines(text: string, width: number, fontSize: number): string[] {
  const max = Math.max(8, Math.floor(width / (fontSize * 0.56)));
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= max) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Multi-line SVG text without foreignObject (which misbehaves in Safari inside transforms). */
export function WrapText({
  x,
  y,
  width,
  text,
  fontSize = 16,
  lineHeight = 1.35,
  fill = '#3b4766',
  fontWeight = 400,
  anchor = 'start',
}: {
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize?: number;
  lineHeight?: number;
  fill?: string;
  fontWeight?: number;
  anchor?: 'start' | 'middle' | 'end';
}) {
  const lines = wrapLines(text, width, fontSize);
  return (
    <text x={x} y={y} fontSize={fontSize} fill={fill} fontWeight={fontWeight} textAnchor={anchor}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : fontSize * lineHeight}>
          {l}
        </tspan>
      ))}
    </text>
  );
}
