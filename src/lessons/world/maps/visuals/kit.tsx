import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Choice, Question } from '../../../types';
import { C } from '../../../../lib/color';
import { useSvgDrag } from '../../../../lib/svg';
import type { Pt } from '../../../../lib/svg';
import { shuffle } from '../../../../lib/random';
import { wrap } from '../../../../stage/Predict';
import { EMOJI_FONT } from '../../../../games/reading/words';

/**
 * Shared bits for the World lessons (ages 4–7): a drag-or-tap item, emoji in SVG,
 * a wrapping message note and helpers for picture choices.
 */

/**
 * Something a child can pick up and drop, drawn around (x, y) in scene coordinates.
 * A short press without moving counts as a tap, so tap-then-tap placing works everywhere.
 */
export function Draggable({
  x,
  y,
  label,
  onDrop,
  onTap,
  hit = 34,
  children,
}: {
  x: number;
  y: number;
  label: string;
  onDrop: (p: Pt) => void;
  onTap?: () => void;
  /** Radius of the invisible grab area. */
  hit?: number;
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
      <circle cx={x} cy={y} r={hit} fill="transparent" />
      {children}
    </g>
  );
}

/** An emoji drawn centred on (x, y). */
export function Emoji({ x, y, size = 40, children }: { x: number; y: number; size?: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontFamily={EMOJI_FONT} style={{ pointerEvents: 'none' }}>
      {children}
    </text>
  );
}

/** A soft card with wrapped text, for instructions and feedback inside a scene. */
export function Note({
  x,
  y,
  w,
  text,
  tone = 'plain',
  size = 17,
}: {
  x: number;
  y: number;
  w: number;
  text: string;
  tone?: 'plain' | 'good' | 'nudge';
  size?: number;
}) {
  // Display fonts run wide: allow ~0.6 of the font size per character.
  const lines = wrap(text, Math.max(8, Math.floor((w - 28) / (size * 0.6))));
  const h = 22 + lines.length * (size + 6);
  const fill = tone === 'good' ? '#d8f6e6' : tone === 'nudge' ? '#fff4c4' : C.white;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={C.ink} strokeWidth={2} />
      {lines.map((line, i) => (
        <text key={i} x={x + 14} y={y + 14 + size * 0.85 + i * (size + 6)} fontSize={size} fill={C.ink} fontWeight={600}>
          {line}
        </text>
      ))}
    </g>
  );
}

/** HTML label for a choice button: a big emoji (or drawing) with a word underneath. */
export function PicLabel({ emoji, text, art }: { emoji?: string; text: string; art?: ReactNode }) {
  return (
    <span style={{ display: 'grid', justifyItems: 'center', gap: 2, lineHeight: 1.1 }}>
      {art ?? (
        <span style={{ fontFamily: EMOJI_FONT, fontSize: 32 }} aria-hidden>
          {emoji}
        </span>
      )}
      <span style={{ fontSize: 15 }}>{text}</span>
    </span>
  );
}

export interface Opt {
  value: string;
  emoji?: string;
  art?: ReactNode;
  /** Spoken / accessible name; defaults to the value. */
  name?: string;
}

/** Build a multiple-choice question from options; the answer must be one of them. */
export function mcq(q: {
  prompt: string;
  answer: string;
  options: Opt[];
  hint: string;
  explain: string[];
  visual?: ReactNode;
  speak?: string;
  /** Show the value as plain text instead of a picture label. */
  plain?: boolean;
  /** Keep the options in the given order (e.g. numbers) instead of shuffling them. */
  ordered?: boolean;
}): Question {
  const seen = new Set<string>();
  const opts = q.options.filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
  if (!opts.some((o) => o.value === q.answer)) opts.push({ value: q.answer });
  const choices: Choice[] = (q.ordered ? opts : shuffle(opts)).map((o) => ({
    value: o.value,
    name: o.name ?? o.value,
    label: q.plain || (!o.emoji && !o.art) ? undefined : <PicLabel emoji={o.emoji} art={o.art} text={o.name ?? o.value} />,
  }));
  return { prompt: q.prompt, speak: q.speak, visual: q.visual, choices, answer: q.answer, hint: q.hint, explain: q.explain };
}

/** Pick `n` distinct items from `pool` that are not `except`. */
export function others<T>(pool: readonly T[], except: T, n: number): T[] {
  return shuffle(pool.filter((p) => p !== except)).slice(0, n);
}
