import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { EMOJI_FONT } from '../../../../games/reading/words';
import { C, shade } from '../../../../lib/color';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';
import { wrap } from '../../../../stage/Predict';

/** An emoji drawn in a scene, centred on (x, y). */
export function Emoji({ emoji, x, y, size = 56 }: { emoji: string; x: number; y: number; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontFamily={EMOJI_FONT}>
      {emoji}
    </text>
  );
}

/** A picture card (rounded, with an optional word under the picture), centred on (0, 0). */
export function PicCard({
  emoji,
  word,
  w = 120,
  h = 130,
  fill = C.card,
  size = 60,
}: {
  emoji: string;
  word?: string;
  w?: number;
  h?: number;
  fill?: string;
  size?: number;
}) {
  return (
    <g>
      <rect x={-w / 2 + 3} y={-h / 2 + 5} width={w} height={h} rx={18} fill={C.ink} opacity={0.12} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill={fill} stroke={C.ink} strokeWidth={2.5} />
      <Emoji emoji={emoji} x={0} y={word ? -12 : 0} size={size} />
      {word && (
        <text x={0} y={h / 2 - 20} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
          {word}
        </text>
      )}
    </g>
  );
}

/** A big letter tile centred on (0, 0). */
export function LetterTile({
  text,
  w = 96,
  h = 96,
  fill = C.card,
  fontSize = 56,
  lit = false,
}: {
  text: string;
  w?: number;
  h?: number;
  fill?: string;
  fontSize?: number;
  lit?: boolean;
}) {
  return (
    <g>
      <rect x={-w / 2 + 3} y={-h / 2 + 5} width={w} height={h} rx={16} fill={C.ink} opacity={0.12} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={16} fill={lit ? shade(C.yellow, 0.35) : fill} stroke={lit ? shade(C.orange, -0.2) : C.ink} strokeWidth={lit ? 4 : 2.5} />
      <text x={0} y={2} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={C.ink} className="num">
        {text}
      </text>
    </g>
  );
}

/** A soft message card with wrapped, centred text. */
export function Note({ x, y, w, text, h = 64, size = 18, tone = 'plain' }: { x: number; y: number; w: number; text: string; h?: number; size?: number; tone?: 'plain' | 'good' | 'try' }) {
  const lines = wrap(text, Math.floor(w / (size * 0.52)));
  const fill = tone === 'good' ? shade(C.green, 0.8) : tone === 'try' ? shade(C.yellow, 0.75) : C.card;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill={fill} stroke={C.ink} strokeWidth={2} />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" fontSize={size} fontWeight={600} fill={C.ink}>
        {lines.map((line, i) => (
          <tspan key={i} x={x + w / 2} dy={i === 0 ? `${-(lines.length - 1) * 0.6 + 0.35}em` : '1.2em'}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * Something the child can drag to a target, or tap (e.g. to hear it).
 * Children are drawn around (0, 0); the token sits at (x, y).
 * `shakeKey` changes to replay a little "not yet" wobble.
 */
export function DragCard({
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
  onTap?: () => void;
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
        if (moved(l, s)) onDrop({ x: x + (l.x - s.x), y: y + (l.y - s.y) });
        else onTap?.();
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
          onTap?.();
        }
      }}
      {...props}
      style={disabled ? undefined : { cursor: offset ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <g key={shakeKey}>
        {shakeKey > 0 && <animateTransform attributeName="transform" type="translate" values="0 0; -9 0; 9 0; -6 0; 6 0; 0 0" dur="0.4s" fill="freeze" />}
        <g transform={offset ? 'scale(1.08)' : undefined}>{children}</g>
      </g>
    </g>
  );
}

/** A tappable group (for hearing a word or a sound). */
export function Tap({ label, onTap, children }: { label: string; onTap: () => void; children: ReactNode }) {
  return (
    <g
      role="button"
      aria-label={label}
      tabIndex={0}
      data-nopan
      style={{ cursor: 'pointer' }}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
    >
      {children}
    </g>
  );
}

// ───────────────────────── Question pictures ─────────────────────────

/** A picture (and optional word) for a question card. */
export function PicVisual({ emoji, word }: { emoji: string; word?: string }) {
  return (
    <svg viewBox={word ? '0 0 200 150' : '0 0 200 120'} role="img" aria-label={word ?? emoji}>
      <text x={100} y={60} textAnchor="middle" dominantBaseline="central" fontSize={86} fontFamily={EMOJI_FONT}>
        {emoji}
      </text>
      {word && (
        <text x={100} y={138} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
          {word}
        </text>
      )}
    </svg>
  );
}

/** A picture used as an answer button. */
export function PicChoice({ emoji }: { emoji: string }) {
  return (
    <svg viewBox="0 0 100 90" role="img" aria-hidden>
      <text x={50} y={46} textAnchor="middle" dominantBaseline="central" fontSize={64} fontFamily={EMOJI_FONT}>
        {emoji}
      </text>
    </svg>
  );
}

/** A row of letter tiles for a question card. */
export function TilesVisual({ tiles, dashes = false }: { tiles: string[]; dashes?: boolean }) {
  const w = 70;
  const gap = dashes ? 34 : 12;
  const total = tiles.length * w + (tiles.length - 1) * gap;
  return (
    <svg viewBox={`-6 -6 ${total + 12} ${w + 12}`} role="img" aria-label={tiles.join(' ')}>
      {tiles.map((t, i) => (
        <g key={i} transform={`translate(${i * (w + gap)} 0)`}>
          <rect width={w} height={w} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
          <text x={w / 2} y={w / 2 + 2} textAnchor="middle" dominantBaseline="central" fontSize={42} fontWeight={700} fill={C.ink}>
            {t}
          </text>
          {dashes && i < tiles.length - 1 && <path d={`M${w + 8} ${w / 2} h${gap - 16}`} stroke={C.muted} strokeWidth={3} strokeDasharray="4 4" />}
        </g>
      ))}
    </svg>
  );
}

/** One big letter for a question card. */
export function BigLetterVisual({ text }: { text: string }) {
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label={text}>
      <rect x={30} y={6} width={100} height={108} rx={16} fill={C.card} stroke={C.ink} strokeWidth={3} />
      <text x={80} y={62} textAnchor="middle" dominantBaseline="central" fontSize={72} fontWeight={700} fill={C.ink}>
        {text}
      </text>
    </svg>
  );
}
