import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { C, shade } from '../../../lib/color';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { DIR_NAME, TEST_NAME } from './model';
import type { Block, ContainerPath, Dir } from './model';

export const BLOCK_COLORS = {
  motion: '#4f7cff',
  repeat: '#f59e0b',
  if: '#a855f7',
  call: '#14b8a6',
} as const;

/** A thick arrow centred at (cx, cy) pointing in `dir`, sized to fit a box of `s`. */
export function ArrowGlyph({ cx, cy, s, dir, color = 'white' }: { cx: number; cy: number; s: number; dir: Dir; color?: string }) {
  const k = s / 100;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${dir * 90}) scale(${k})`}>
      <path d="M0,-38 L30,-6 L13,-6 L13,36 L-13,36 L-13,-6 L-30,-6 Z" fill={color} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
    </g>
  );
}

function TurnGlyph({ cx, cy, s, side }: { cx: number; cy: number; s: number; side: 'left' | 'right' }) {
  const k = s / 100;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${side === 'left' ? -k : k} ${k})`}>
      <path d="M-22,34 L-22,-4 Q-22,-26 0,-26 L10,-26 L10,-42 L38,-17 L10,8 L10,-8 L0,-8 Q-4,-8 -4,-4 L-4,34 Z" fill="white" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
    </g>
  );
}

/** Human words for a block (for screen readers, explanations and the "running" caption). */
export function blockWords(b: Block): string {
  switch (b.kind) {
    case 'move':
      return `move ${DIR_NAME[b.dir]}`;
    case 'forward':
      return 'go forward';
    case 'left':
      return 'turn left';
    case 'right':
      return 'turn right';
    case 'repeat':
      return `repeat ${b.times} times`;
    case 'if':
      return `if ${TEST_NAME[b.test]}`;
    case 'call':
      return `do ${b.name}`;
  }
}

/** One simple block tile drawn with its top-left at (x, y). */
export function BlockTile({
  block,
  x,
  y,
  s,
  state,
}: {
  block: Block;
  x: number;
  y: number;
  s: number;
  state?: 'active' | 'failed' | 'faded';
}) {
  const color =
    block.kind === 'repeat' ? BLOCK_COLORS.repeat : block.kind === 'if' ? BLOCK_COLORS.if : block.kind === 'call' ? BLOCK_COLORS.call : BLOCK_COLORS.motion;
  return (
    <g opacity={state === 'faded' ? 0.45 : 1}>
      {state === 'active' && <rect x={x - 6} y={y - 6} width={s + 12} height={s + 12} rx={16} fill={C.yellow} opacity={0.75} />}
      {state === 'failed' && <rect x={x - 6} y={y - 6} width={s + 12} height={s + 12} rx={16} fill={C.red} opacity={0.6} />}
      <rect x={x + 2} y={y + 4} width={s} height={s} rx={12} fill={shade(color, -0.35)} />
      <rect x={x} y={y} width={s} height={s} rx={12} fill={color} stroke={C.ink} strokeWidth={2.2} />
      {block.kind === 'move' && <ArrowGlyph cx={x + s / 2} cy={y + s / 2} s={s * 0.8} dir={block.dir} />}
      {block.kind === 'forward' && <ArrowGlyph cx={x + s / 2} cy={y + s / 2} s={s * 0.8} dir={0} />}
      {(block.kind === 'left' || block.kind === 'right') && <TurnGlyph cx={x + s / 2} cy={y + s / 2} s={s * 0.8} side={block.kind} />}
      {block.kind === 'call' && <CallName name={block.name} cx={x + s / 2} cy={y + s / 2} s={s} />}
    </g>
  );
}

/** A function's name on its block: hyphenated names ("zig-zag") break after the hyphen, long ones shrink to fit. */
function CallName({ name, cx, cy, s }: { name: string; cx: number; cy: number; s: number }) {
  const lines = name.split(/(?<=-)/);
  const fs = Math.min(18, s * 0.3, (s * 1.7) / Math.max(...lines.map((l) => l.length)));
  return (
    <>
      {lines.map((l, i) => (
        <text key={i} x={cx} y={cy + (i - (lines.length - 1) / 2) * fs * 1.1} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={700} fill="white">
          {l}
        </text>
      ))}
    </>
  );
}

// ─────────────────────────── Program layout ───────────────────────────

export interface StripItem {
  block: Block;
  path: ContainerPath;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An insertion point: dropping here puts the new block at `index` in the list at `path`. */
export interface DropSpot {
  path: ContainerPath;
  index: number;
  x: number;
  y: number;
}

export interface StripLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  s: number;
  items: StripItem[];
  spots: DropSpot[];
  /** The dashed "add here" slot at the end of each container's inner list. */
  ends: { path: ContainerPath; x: number; y: number; w: number; h: number }[];
}

const GAP = 10;
const PAD = 8;
/** Room kept for the dashed "add here" slot at the end of a list (a 48-unit tap target plus a little space). */
const endSlotW = (s: number) => Math.max(48, s * 0.8) + 6;

function headerWidth(b: Block, s: number) {
  return b.kind === 'repeat' ? s * 2.9 : b.kind === 'if' ? s * 2.3 : s;
}

function listWidth(list: Block[], s: number, slots = true): number {
  return list.reduce((w, b) => w + blockWidth(b, s, slots) + GAP, 0) + (slots ? endSlotW(s) : 0);
}

function blockWidth(b: Block, s: number, slots = true): number {
  if (b.kind === 'repeat') return headerWidth(b, s) + GAP + listWidth(b.body, s, slots) + PAD * 2;
  if (b.kind === 'if') return headerWidth(b, s) + GAP + listWidth(b.then, s, slots) + (b.else ? s * 0.9 + listWidth(b.else, s, slots) : 0) + PAD * 2;
  return s;
}

function blockHeight(b: Block, s: number): number {
  return b.kind === 'repeat' || b.kind === 'if' ? s + PAD * 2 : s;
}

/**
 * Lay a program out as rows of tiles inside a strip `width` wide (top-level blocks wrap onto new rows;
 * a loop and its body always stay on one row). Returns tile positions and drop spots.
 */
export function layoutProgram(blocks: Block[], at: { x: number; y: number; width: number; s?: number; slots?: boolean }): StripLayout {
  const s = at.s ?? 64;
  // Without slots (programs that can be changed but not added to) there are no dashed "add here" places.
  const slots = at.slots ?? true;
  const endW = (n: number) => (slots ? endSlotW(n) : 0);
  const items: StripItem[] = [];
  const spots: DropSpot[] = [];
  const ends: StripLayout['ends'] = [];
  let cx = at.x + PAD;
  let cy = at.y + PAD;
  let rowH = s;

  const placeInner = (list: Block[], path: ContainerPath, x: number, y: number) => {
    let ix = x;
    list.forEach((b, i) => {
      spots.push({ path, index: i, x: ix - GAP / 2, y: y + s / 2 });
      placeBlock(b, path, i, ix, y);
      ix += blockWidth(b, s, slots) + GAP;
    });
    spots.push({ path, index: list.length, x: ix + s * 0.4, y: y + s / 2 });
    if (slots) ends.push({ path, x: ix, y, w: Math.max(48, s * 0.8), h: s });
    return ix + endW(s);
  };

  const placeBlock = (b: Block, path: ContainerPath, index: number, x: number, y: number) => {
    const w = blockWidth(b, s, slots);
    const h = blockHeight(b, s);
    items.push({ block: b, path, index, x, y, w, h });
    if (b.kind === 'repeat') placeInner(b.body, [...path, { index, branch: 'body' }], x + PAD + headerWidth(b, s) + GAP, y + PAD);
    if (b.kind === 'if') {
      const after = placeInner(b.then, [...path, { index, branch: 'then' }], x + PAD + headerWidth(b, s) + GAP, y + PAD);
      if (b.else) placeInner(b.else, [...path, { index, branch: 'else' }], after + s * 0.9, y + PAD);
    }
  };

  blocks.forEach((b, i) => {
    const w = blockWidth(b, s, slots);
    if (cx > at.x + PAD && cx + w > at.x + at.width - PAD) {
      cx = at.x + PAD;
      cy += rowH + GAP;
      rowH = s;
    }
    const h = blockHeight(b, s);
    spots.push({ path: [], index: i, x: cx - GAP / 2, y: cy + h / 2 });
    placeBlock(b, [], i, cx, cy);
    rowH = Math.max(rowH, h);
    cx += w + GAP;
  });
  if (slots && cx + endW(s) > at.x + at.width - PAD && blocks.length) {
    cx = at.x + PAD;
    cy += rowH + GAP;
    rowH = s;
  }
  spots.push({ path: [], index: blocks.length, x: cx + s * 0.4, y: cy + s / 2 });
  if (slots) ends.push({ path: [], x: cx, y: cy, w: Math.max(48, s * 0.8), h: s });

  return { x: at.x, y: at.y, width: at.width, height: cy + rowH + PAD - at.y, s, items, spots, ends };
}

const samePath = (a: ContainerPath, b: ContainerPath) =>
  a.length === b.length && a.every((p, i) => p.index === b[i].index && p.branch === b[i].branch);
export { samePath };

/** Where a block dropped at `p` should go, or null if it was dropped away from the program. */
export function dropTarget(layout: StripLayout, p: Pt, opts: { allowNested?: boolean } = {}): DropSpot | null {
  const inside = p.x >= layout.x - 20 && p.x <= layout.x + layout.width + 20 && p.y >= layout.y - 30 && p.y <= layout.y + Math.max(layout.height, layout.s + 16) + 30;
  if (!inside) return null;
  let best: DropSpot | null = null;
  let bestD = Infinity;
  for (const sp of layout.spots) {
    if (!opts.allowNested && sp.path.length) continue;
    const d = Math.hypot((p.x - sp.x) * 0.8, (p.y - sp.y) * 1.6);
    if (d < bestD) {
      bestD = d;
      best = sp;
    }
  }
  return best;
}

// ─────────────────────────── Program strip ───────────────────────────

/**
 * The program, drawn as tiles. Tapping a simple tile calls `onTapBlock` (scenes decide: remove it,
 * or turn its arrow for "fix the bug"). Loops show −/+ to change how many times they repeat.
 * The dashed slot at the end of a loop can be tapped to make it the place new blocks go.
 */
export function ProgramStrip({
  layout,
  activeIds,
  failedId,
  target,
  emptyText = 'Drag arrows here',
  title = 'Program',
  onTapBlock,
  onTimes,
  onSelectTarget,
  timesRange = [2, 9],
  locked = false,
}: {
  layout: StripLayout;
  activeIds?: Set<string>;
  failedId?: string | null;
  target?: ContainerPath;
  emptyText?: string;
  title?: string;
  onTapBlock?: (path: ContainerPath, index: number, block: Block) => void;
  onTimes?: (path: ContainerPath, index: number, times: number) => void;
  onSelectTarget?: (path: ContainerPath) => void;
  timesRange?: [number, number];
  locked?: boolean;
}) {
  const { x, y, width, s } = layout;
  const height = Math.max(layout.height, s + PAD * 2);
  const isEmpty = layout.items.length === 0;
  return (
    <g>
      <text x={x} y={y - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        {title}
      </text>
      <rect x={x} y={y} width={width} height={height} rx={16} fill="white" stroke={C.ink} strokeWidth={2} />
      {isEmpty && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fill={C.muted}>
          {emptyText}
        </text>
      )}
      {layout.items.map((it) => {
        const b = it.block;
        // A failed block shows red even though the run stopped on it (it is still the "running" block).
        const state = failedId === b.id ? 'failed' : activeIds?.has(b.id) ? 'active' : undefined;
        if (b.kind === 'repeat' || b.kind === 'if') {
          const color = b.kind === 'repeat' ? BLOCK_COLORS.repeat : BLOCK_COLORS.if;
          const hw = headerWidth(b, s);
          return (
            <g key={b.id}>
              {state && <rect x={it.x - 6} y={it.y - 6} width={it.w + 12} height={it.h + 12} rx={20} fill={state === 'active' ? C.yellow : C.red} opacity={0.45} />}
              <rect x={it.x} y={it.y} width={it.w} height={it.h} rx={16} fill={shade(color, 0.72)} stroke={C.ink} strokeWidth={2.2} />
              <rect x={it.x + PAD} y={it.y + PAD} width={hw} height={s} rx={12} fill={color} stroke={C.ink} strokeWidth={2} />
              {b.kind === 'repeat' ? (
                <RepeatHeader
                  x={it.x + PAD}
                  y={it.y + PAD}
                  w={hw}
                  s={s}
                  times={b.times}
                  locked={locked}
                  range={timesRange}
                  onTimes={(t) => onTimes?.(it.path, it.index, t)}
                  onTap={() => onTapBlock?.(it.path, it.index, b)}
                />
              ) : (
                <text x={it.x + PAD + hw / 2} y={it.y + PAD + s / 2} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill="white">
                  if {TEST_NAME[b.test]}
                </text>
              )}
            </g>
          );
        }
        return (
          <g
            key={b.id}
            onClick={locked || !onTapBlock ? undefined : () => onTapBlock(it.path, it.index, b)}
            style={locked || !onTapBlock ? undefined : { cursor: 'pointer' }}
            role={onTapBlock && !locked ? 'button' : undefined}
            aria-label={blockWords(b)}
            data-nopan
          >
            <BlockTile block={b} x={it.x} y={it.y} s={s} state={state} />
          </g>
        );
      })}
      {layout.ends
        // Loop slots always show; the main list's slot shows when there is something to choose between.
        .filter((e) => e.path.length > 0 || (onSelectTarget && layout.items.some((it) => it.block.kind === 'repeat' || it.block.kind === 'if')))
        .map((e, i) => {
          const selected = target && samePath(target, e.path);
          return (
            <g key={i} onClick={onSelectTarget && !locked ? () => onSelectTarget(e.path) : undefined} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={e.path.length ? 'Add blocks inside the loop' : 'Add blocks at the end'}>
              <rect
                x={e.x}
                y={e.y}
                width={e.w}
                height={e.h}
                rx={10}
                fill={selected ? shade(C.yellow, 0.5) : 'white'}
                stroke={selected ? C.ink : C.muted}
                strokeWidth={2}
                strokeDasharray={selected ? undefined : '6 5'}
              />
              <text x={e.x + e.w / 2} y={e.y + e.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={26} fill={C.muted}>
                +
              </text>
            </g>
          );
        })}
    </g>
  );
}

function RepeatHeader({
  x,
  y,
  w,
  s,
  times,
  locked,
  range,
  onTimes,
  onTap,
}: {
  x: number;
  y: number;
  w: number;
  s: number;
  times: number;
  locked: boolean;
  range: [number, number];
  onTimes: (t: number) => void;
  onTap: () => void;
}) {
  const b = Math.min(48, s * 0.8);
  const mid = x + w / 2;
  const btn = (bx: number, label: string, delta: number, disabled: boolean) => (
    <g
      onClick={disabled || locked ? undefined : () => onTimes(times + delta)}
      style={{ cursor: disabled || locked ? 'default' : 'pointer' }}
      opacity={disabled || locked ? 0.35 : 1}
      role="button"
      aria-label={delta > 0 ? 'Repeat more times' : 'Repeat fewer times'}
      data-nopan
    >
      <rect x={bx} y={y + (s - b) / 2} width={b} height={b} rx={10} fill="white" stroke={C.ink} strokeWidth={2} />
      <text x={bx + b / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={800} fill={C.ink}>
        {label}
      </text>
    </g>
  );
  return (
    <g>
      {btn(x + 4, '−', -1, times <= range[0])}
      <g onClick={locked ? undefined : onTap} style={{ cursor: locked ? 'default' : 'pointer' }} data-nopan aria-label={`repeat ${times} times`} role="img">
        <text x={mid} y={y + s * 0.34} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="white">
          REPEAT
        </text>
        <text x={mid} y={y + s * 0.66} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={800} fill="white">
          {times}×
        </text>
      </g>
      {btn(x + w - b - 4, '+', 1, times >= range[1])}
    </g>
  );
}

// ─────────────────────────── Palette ───────────────────────────

export interface PaletteEntry {
  key: string;
  label: string;
  /** Builds a fresh block each time it is used. */
  make: () => Block;
}

/**
 * The blocks a child can use. Drag one into the program, or tap it to add it at the end
 * (or into the selected loop).
 */
export function BlockPalette({
  entries,
  x,
  y,
  s = 64,
  title = 'Blocks',
  disabled = false,
  onDrop,
  onTap,
}: {
  entries: PaletteEntry[];
  x: number;
  y: number;
  s?: number;
  title?: string;
  disabled?: boolean;
  onDrop: (entry: PaletteEntry, p: Pt) => void;
  onTap: (entry: PaletteEntry) => void;
}) {
  let cx = x;
  return (
    <g opacity={disabled ? 0.45 : 1}>
      <text x={x} y={y - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        {title}
      </text>
      {entries.map((e) => {
        const sample = e.make();
        const w = sample.kind === 'repeat' ? s * 1.6 : s;
        const bx = cx;
        cx += w + 12;
        return (
          <DragItem
            key={e.key}
            label={e.label}
            disabled={disabled}
            onDrop={(p) => onDrop(e, p)}
            onTap={() => onTap(e)}
          >
            {sample.kind === 'repeat' ? (
              <g>
                <rect x={bx + 2} y={y + 4} width={w} height={s} rx={12} fill={shade(BLOCK_COLORS.repeat, -0.35)} />
                <rect x={bx} y={y} width={w} height={s} rx={12} fill={BLOCK_COLORS.repeat} stroke={C.ink} strokeWidth={2.2} />
                <text x={bx + w / 2} y={y + s * 0.36} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="white">
                  REPEAT
                </text>
                <text x={bx + w / 2} y={y + s * 0.68} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={800} fill="white">
                  {sample.times}×
                </text>
              </g>
            ) : (
              <BlockTile block={sample} x={bx} y={y} s={s} />
            )}
          </DragItem>
        );
      })}
    </g>
  );
}

/** Pick up and drop, or tap. Short presses count as taps so it works the same everywhere. */
export function DragItem({
  label,
  disabled,
  onDrop,
  onTap,
  children,
}: {
  label: string;
  disabled?: boolean;
  onDrop: (p: Pt) => void;
  onTap: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const moved = useRef(false);
  const handlers = useSvgDrag(
    (p) => {
      if (!start.current || disabled) return;
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
        if (disabled) return;
        if (wasMoved && at) onDrop(at);
        else onTap();
      },
    },
  );
  return (
    <g
      {...handlers}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap();
        }
      }}
      transform={offset ? `translate(${offset.x} ${offset.y})` : undefined}
      style={{ ...handlers.style, cursor: disabled ? 'default' : offset ? 'grabbing' : 'grab' }}
    >
      {children}
    </g>
  );
}

/** Arrow blocks for young children: up, right, down, left. */
export const ARROW_ENTRIES = (make: (d: Dir) => Block): PaletteEntry[] =>
  ([0, 1, 2, 3] as Dir[]).map((d) => ({ key: `move-${d}`, label: `Move ${DIR_NAME[d]}`, make: () => make(d) }));
