import type { ReactElement } from 'react';
import { C, shade } from '../../../lib/color';
import { SvgButton } from '../../../stage/widgets';
import { ArrowGlyph, BLOCK_COLORS, BlockTile, blockWords } from './Blocks';
import { GridPicture } from './GridWorld';
import type { Block, Dir, RobotState, Trace, World } from './model';
import { DIR_NAME } from './model';
import type { Runner } from './useRunner';

/** A calm one- or two-line status card drawn in a scene. */
export function Message({
  x,
  y,
  w,
  tone = 'info',
  text,
}: {
  x: number;
  y: number;
  w: number;
  tone?: 'info' | 'good' | 'oops';
  text: string;
}) {
  const fill = tone === 'good' ? shade(C.green, 0.78) : tone === 'oops' ? shade(C.yellow, 0.7) : 'white';
  const lines = wrapWords(text, Math.floor(w / 9.4));
  const h = 22 + lines.length * 24;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={x + 16} y={y + 23 + i * 24} dominantBaseline="central" fontSize={17} fontWeight={600} fill={C.ink}>
          {l}
        </text>
      ))}
    </g>
  );
}

function wrapWords(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/ +/)) {
    if (line && (line + ' ' + word).length > max) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

/** What to tell the child after a run (kind, specific, never shaming). */
export function outcomeText(t: Trace, blocks?: Block[]): { tone: 'good' | 'oops'; text: string } {
  switch (t.outcome) {
    case 'success':
      return { tone: 'good', text: 'You did it! Your program got the robot to the flag.' };
    case 'bumped': {
      const step = t.steps[t.failedAt ?? 0];
      const which = blocks ? blockPosition(blocks, t.failedBlockId) : null;
      const where = step?.error === 'edge' ? 'the edge of the board' : 'a rock';
      return { tone: 'oops', text: `Bump! ${which ? `Block ${which}` : 'One block'} took the robot into ${where}. Can you fix it?` };
    }
    case 'missed-items':
      return { tone: 'oops', text: 'The robot reached the flag, but missed a star. Try a path through the stars.' };
    case 'not-there':
      return { tone: 'oops', text: 'Not yet! The program ended before the flag. Look at where the robot stopped.' };
    case 'too-long':
      return { tone: 'oops', text: 'That program goes on and on! Try fewer repeats.' };
  }
}

/** 1-based position of a top-level block (or the loop containing it), for messages like "Block 3". */
function blockPosition(blocks: Block[], id: string | undefined): number | null {
  if (!id) return null;
  const contains = (b: Block): boolean => b.id === id || (b.kind === 'repeat' && b.body.some(contains)) || (b.kind === 'if' && [...b.then, ...(b.else ?? [])].some(contains));
  const i = blocks.findIndex(contains);
  return i >= 0 ? i + 1 : null;
}

/** Run / Step / Reset (+ extras) in a row starting at (x, y): 452 units wide with one 100-wide extra. */
export function RunControls({
  x,
  y,
  runner,
  canRun,
  extra,
  showStep = true,
}: {
  x: number;
  y: number;
  runner: Runner;
  canRun: boolean;
  extra?: { label: string; onClick: () => void; disabled?: boolean }[];
  showStep?: boolean;
}) {
  const busy = runner.status === 'running';
  let cx = x;
  const next = (w: number) => {
    const at = cx;
    cx += w + 12;
    return at;
  };
  const extraW = (label: string) => Math.max(100, label.length * 11 + 30);
  return (
    <g>
      <SvgButton x={next(116)} y={y} w={116} h={56} fontSize={20} label="▶ Run" onClick={runner.run} disabled={!canRun || busy} color={C.green} textColor="white" title="Run the program" />
      {showStep && <SvgButton x={next(100)} y={y} w={100} h={56} fontSize={19} label="Step" onClick={runner.stepOnce} disabled={!canRun || busy} title="Run one block at a time" />}
      <SvgButton x={next(100)} y={y} w={100} h={56} fontSize={19} label="Reset" onClick={runner.reset} disabled={runner.status === 'idle'} title="Put the robot back" />
      {extra?.map((e) => (
        <SvgButton key={e.label} x={next(extraW(e.label))} y={y} w={extraW(e.label)} h={56} fontSize={18} label={e.label} onClick={e.onClick} disabled={e.disabled || busy} />
      ))}
    </g>
  );
}

/** Caption for the step being shown, e.g. "Running block 3: move right". */
export function runningCaption(runner: Runner, blocks: Block[]): string | null {
  const s = runner.step;
  if (!s || runner.status === 'idle' || !s.blockId) return null;
  const i = blocks.findIndex((b) => b.id === s.blockId || s.stack.includes(b.id));
  const b = i >= 0 ? blocks[i] : undefined;
  if (s.action === 'loop') return `Loop: time ${s.iteration} of ${s.of}`;
  if (!b) return null;
  const inner = b.id === s.blockId ? b : findIn(b, s.blockId);
  return `Block ${i + 1}: ${inner ? blockWords(inner) : blockWords(b)}`;
}

function findIn(b: Block, id: string): Block | undefined {
  const list = b.kind === 'repeat' ? b.body : b.kind === 'if' ? [...b.then, ...(b.else ?? [])] : [];
  for (const x of list) {
    if (x.id === id) return x;
    const hit = findIn(x, id);
    if (hit) return hit;
  }
  return undefined;
}

// ─────────────────────────── Pictures for practice questions ───────────────────────────

/**
 * A row of arrow blocks as a small picture (for answer choices and pattern questions).
 * `question` adds a "?" tile at the end; `group` underlines every `group` arrows in turn (a repeating unit).
 */
export function ArrowsPicture({ moves, size = 48, question = false, group }: { moves: Dir[]; size?: number; question?: boolean; group?: number }) {
  const gap = 8;
  const n = moves.length + (question ? 1 : 0);
  const w = n * (size + gap) - gap + 8;
  const h = size + (group ? 26 : 12);
  const name = moves.map((d) => DIR_NAME[d]).join(', ') + (question ? ', what comes next?' : '');
  return (
    <svg viewBox={`-4 -4 ${w} ${h}`} role="img" aria-label={name}>
      {moves.map((d, i) => (
        <g key={i}>
          <rect x={i * (size + gap)} y={0} width={size} height={size} rx={10} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={2} />
          <ArrowGlyph cx={i * (size + gap) + size / 2} cy={size / 2} s={size * 0.8} dir={d} />
          {group && <rect x={i * (size + gap)} y={size + 8} width={size + (i % group === group - 1 ? 0 : gap)} height={8} rx={4} fill={Math.floor(i / group) % 2 ? C.teal : C.yellow} />}
        </g>
      ))}
      {question && (
        <g>
          <rect x={moves.length * (size + gap)} y={0} width={size} height={size} rx={10} fill="white" stroke={C.ink} strokeWidth={2} strokeDasharray="6 4" />
          <text x={moves.length * (size + gap) + size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.6} fontWeight={800} fill={C.muted}>
            ?
          </text>
        </g>
      )}
    </svg>
  );
}

/** A program (with loops) as a small picture, numbered if `numbered`. */
export function ProgramPicture({
  blocks,
  size = 48,
  numbered = false,
  mark,
  hideTimes = false,
}: {
  blocks: Block[];
  size?: number;
  numbered?: boolean;
  mark?: number;
  /** Show loops as "?×" (for "how many times?" questions). */
  hideTimes?: boolean;
}) {
  const gap = 8;
  let x = 0;
  const parts: ReactElement[] = [];
  blocks.forEach((b, i) => {
    if (b.kind === 'repeat') {
      const innerW = b.body.length * (size + gap);
      const w = size * 1.5 + gap + innerW + 8;
      parts.push(
        <g key={b.id}>
          <rect x={x} y={-6} width={w} height={size + 12} rx={12} fill={shade(BLOCK_COLORS.repeat, 0.7)} stroke={C.ink} strokeWidth={2} />
          <rect x={x + 4} y={0} width={size * 1.5} height={size} rx={10} fill={BLOCK_COLORS.repeat} stroke={C.ink} strokeWidth={2} />
          <text x={x + 4 + size * 0.75} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.42} fontWeight={800} fill="white">
            {hideTimes ? '?' : b.times}×
          </text>
          {b.body.map((inner, j) => (
            <BlockTile key={inner.id} block={inner} x={x + 4 + size * 1.5 + gap + j * (size + gap)} y={0} s={size} />
          ))}
          {numbered && (
            <text x={x + w / 2} y={size + 24} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {i + 1}
            </text>
          )}
        </g>,
      );
      x += w + gap;
    } else {
      parts.push(
        <g key={b.id}>
          <BlockTile block={b} x={x} y={0} s={size} state={mark === i ? 'failed' : undefined} />
          {numbered && (
            <text x={x + size / 2} y={size + 24} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {i + 1}
            </text>
          )}
        </g>,
      );
      x += size + gap;
    }
  });
  const h = size + (numbered ? 32 : 12);
  return (
    <svg viewBox={`-8 -10 ${x + 8} ${h + 10}`} role="img" aria-label={blocks.map(blockWords).join(', ')}>
      {parts}
    </svg>
  );
}

/**
 * A practice-question picture: the robot's grid with an optional program beside it
 * (`numbered` puts 1, 2, 3… under top-level blocks so questions can say "Block 2").
 */
export function PuzzlePicture({
  world,
  blocks,
  path,
  labels,
  numbered = false,
  robot,
  hideGoal = false,
  hideTimes = false,
}: {
  world: World;
  blocks?: Block[];
  path?: Dir[];
  labels?: { cell: { x: number; y: number }; text: string }[];
  numbered?: boolean;
  robot?: RobotState;
  hideGoal?: boolean;
  hideTimes?: boolean;
}) {
  const cell = 52;
  const size = 56;
  const gw = world.cols * cell + 16;
  const gh = world.rows * cell + 16;
  const shownWorld = hideGoal ? { ...world, goal: undefined } : world;
  if (!blocks) return <GridPicture world={shownWorld} path={path} labels={labels} robot={robot} cell={cell} />;
  const pw = Math.max(200, programWidth(blocks, size) + 16);
  const ph = size + (numbered ? 36 : 16);
  const h = Math.max(gh, ph);
  return (
    <svg viewBox={`0 0 ${gw + 24 + pw} ${h}`} role="img" aria-label={`The robot's grid and the program: ${blocks.map(blockWords).join(', ')}`}>
      <svg x={0} y={(h - gh) / 2} width={gw} height={gh}>
        <GridPicture world={shownWorld} path={path} labels={labels} robot={robot} cell={cell} />
      </svg>
      <svg x={gw + 24} y={(h - ph) / 2} width={pw} height={ph}>
        <ProgramPicture blocks={blocks} size={size} numbered={numbered} hideTimes={hideTimes} />
      </svg>
    </svg>
  );
}

function programWidth(blocks: Block[], size: number): number {
  const gap = 8;
  return blocks.reduce((w, b) => w + (b.kind === 'repeat' ? size * 1.5 + gap + b.body.length * (size + gap) + 8 : size) + gap, 0);
}
