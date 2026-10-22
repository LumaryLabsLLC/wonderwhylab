import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Volume2 } from 'lucide-react';
import { EMOJI_FONT } from '../../../../games/reading/words';
import { C, shade } from '../../../../lib/color';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';

const FONT = { fontFamily: 'var(--font-display)' } as const;

/** A letter (or letter group) tile, centred at (x, y). Tap it to hear its sound. */
export function LetterTile({
  x,
  y,
  text,
  w = 76,
  h = 84,
  color = C.card,
  textColor = C.ink,
  fontSize = 46,
  dashed = false,
  glow = false,
  onTap,
  label,
}: {
  x: number;
  y: number;
  text: string;
  w?: number;
  h?: number;
  color?: string;
  textColor?: string;
  fontSize?: number;
  dashed?: boolean;
  glow?: boolean;
  onTap?: () => void;
  label?: string;
}) {
  return (
    <g
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      aria-label={onTap ? (label ?? `Hear ${text}`) : undefined}
      tabIndex={onTap ? 0 : undefined}
      onKeyDown={(e) => {
        if (onTap && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap();
        }
      }}
      style={onTap ? { cursor: 'pointer' } : undefined}
      data-nopan={onTap ? true : undefined}
    >
      {glow && <rect x={x - w / 2 - 7} y={y - h / 2 - 7} width={w + 14} height={h + 14} rx={20} fill={C.yellow} opacity={0.55} />}
      {!dashed && <rect x={x - w / 2 + 3} y={y - h / 2 + 5} width={w} height={h} rx={14} fill={C.ink} opacity={0.12} />}
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={14}
        fill={dashed ? 'transparent' : color}
        stroke={dashed ? C.muted : C.ink}
        strokeWidth={dashed ? 2 : 2.5}
        strokeDasharray={dashed ? '7 6' : undefined}
      />
      <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={textColor} style={FONT}>
        {text}
      </text>
    </g>
  );
}

/**
 * Something the child drags to a target (or taps, as a fallback). Children are drawn around (0, 0);
 * the tile sits at (x, y). `shakeKey` changes to replay a little "not yet" wobble.
 */
export function DragTile({
  x,
  y,
  label,
  onDrop,
  onTap,
  children,
  disabled = false,
  shakeKey = 0,
}: {
  x: number;
  y: number;
  label: string;
  onDrop: (p: Pt) => void;
  onTap: () => void;
  children: ReactNode;
  disabled?: boolean;
  shakeKey?: number;
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
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap();
        }
      }}
      {...props}
      style={disabled ? { opacity: 0.35 } : { cursor: offset ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <g key={shakeKey}>
        {shakeKey > 0 && (
          <animateTransform attributeName="transform" type="translate" values="0 0; -9 0; 9 0; -6 0; 6 0; 0 0" dur="0.4s" fill="freeze" />
        )}
        <g transform={offset ? 'scale(1.08)' : undefined}>{children}</g>
      </g>
    </g>
  );
}

/** A tile face drawn around (0, 0) — the inside of a DragTile. */
export function TileFace({ text, w = 76, h = 84, color = C.card, fontSize = 44 }: { text: string; w?: number; h?: number; color?: string; fontSize?: number }) {
  return (
    <g>
      <rect x={-w / 2 + 3} y={-h / 2 + 5} width={w} height={h} rx={14} fill={C.ink} opacity={0.14} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={14} fill={color} stroke={C.ink} strokeWidth={2.5} />
      <text x={0} y={2} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={C.ink} style={FONT}>
        {text}
      </text>
    </g>
  );
}

/** An emoji picture centred at (x, y). */
export function Emoji({ x, y, char, size = 80, opacity = 1 }: { x: number; y: number; char: string; size?: number; opacity?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} opacity={opacity} style={{ fontFamily: EMOJI_FONT }}>
      {char}
    </text>
  );
}

/** Round "hear it" button centred at (x, y). */
export function HearButton({ x, y, onTap, label = 'Hear it', r = 28 }: { x: number; y: number; onTap: () => void; label?: string; r?: number }) {
  return (
    <g
      role="button"
      aria-label={label}
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      style={{ cursor: 'pointer' }}
      data-nopan
    >
      <title>{label}</title>
      <circle cx={x} cy={y + 3} r={r} fill={shade(C.blue, -0.3)} />
      <circle cx={x} cy={y} r={r} fill={C.blue} stroke={C.ink} strokeWidth={2} />
      <Volume2 x={x - r * 0.5} y={y - r * 0.5} width={r} height={r} color="white" strokeWidth={2.4} />
    </g>
  );
}

/** Greedy word wrap for SVG text: split `text` into lines of at most `max` characters. */
export function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && `${line} ${word}`.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** A soft rounded panel, e.g. behind a word machine. */
export function Panel({ x, y, w, h, color = C.card }: { x: number; y: number; w: number; h: number; color?: string }) {
  return (
    <g>
      <rect x={x + 4} y={y + 6} width={w} height={h} rx={22} fill={C.ink} opacity={0.08} />
      <rect x={x} y={y} width={w} height={h} rx={22} fill={color} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

/** Small heart shape centred at (x, y). */
export function Heart({ x, y, size = 30, color = C.pink }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 30;
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 11 C-16 0 -14 -13 -6 -13 C-2 -13 0 -9 0 -7 C0 -9 2 -13 6 -13 C14 -13 16 0 0 11 Z"
      fill={color}
      stroke={C.ink}
      strokeWidth={2 / s}
      strokeLinejoin="round"
    />
  );
}

// ───────────────────────── Pictures for practice questions ─────────────────────────

/** A big emoji, optionally with a caption, sized for the question card. */
export function EmojiPicture({ char, caption, label }: { char: string; caption?: ReactNode; label: string }) {
  return (
    <svg viewBox={caption ? '0 0 200 150' : '0 0 120 110'} role="img" aria-label={label}>
      <text x={caption ? 100 : 60} y={caption ? 56 : 56} textAnchor="middle" dominantBaseline="central" fontSize={84} style={{ fontFamily: EMOJI_FONT }}>
        {char}
      </text>
      {caption && (
        <text x={100} y={130} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} style={FONT}>
          {caption}
        </text>
      )}
    </svg>
  );
}

export interface TileSpec {
  text: string;
  gap?: boolean;
  heart?: boolean;
  color?: string;
}

/** A row of letter / sound boxes for a question, e.g. [sh][i][p] or [c][_][t], with an optional emoji in front. */
export function TileRow({ tiles, emoji, label, boxes = false }: { tiles: TileSpec[]; emoji?: string; label: string; boxes?: boolean }) {
  const tw = 64;
  const gap = boxes ? 0 : 10;
  const widths = tiles.map((t) => (t.text.length > 1 && !t.gap ? tw + (t.text.length - 1) * 24 : tw));
  const lead = emoji ? 110 : 0;
  const total = lead + widths.reduce((a, b) => a + b, 0) + gap * (tiles.length - 1);
  let x = lead;
  return (
    <svg viewBox={`-6 -26 ${total + 12} 122`} role="img" aria-label={label}>
      {emoji && (
        <text x={46} y={36} textAnchor="middle" dominantBaseline="central" fontSize={70} style={{ fontFamily: EMOJI_FONT }}>
          {emoji}
        </text>
      )}
      {tiles.map((t, i) => {
        const w = widths[i];
        const cx = x + w / 2;
        x += w + gap;
        return (
          <g key={i}>
            <rect
              x={cx - w / 2}
              y={0}
              width={w}
              height={72}
              rx={boxes ? 4 : 12}
              fill={t.gap ? 'transparent' : (t.color ?? 'white')}
              stroke={t.gap ? C.muted : C.ink}
              strokeWidth={2.5}
              strokeDasharray={t.gap ? '7 6' : undefined}
            />
            <text x={cx} y={38} textAnchor="middle" dominantBaseline="central" fontSize={42} fontWeight={700} fill={C.ink} style={FONT}>
              {t.gap ? '?' : t.text}
            </text>
            {t.heart && <Heart x={cx} y={-12} size={26} />}
          </g>
        );
      })}
    </svg>
  );
}
