import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { BlockPalette, ProgramStrip, dropTarget, layoutProgram, samePath } from './Blocks';
import type { PaletteEntry, StripLayout } from './Blocks';
import { GridWorld } from './GridWorld';
import type { GridLayout } from './GridWorld';
import { countBlocks, getList, insertBlock, removeBlock, updateBlock } from './model';
import type { Block, ContainerPath, Dir, Program, Trace, World } from './model';
import { Message, RunControls, outcomeText, runningCaption } from './ui';
import { useRunner } from './useRunner';

const LOOP_MAX = 3;

/** Bench layout: the grid on the left, the program, palette and controls in the right column. */
export const BENCH = { left: 40, gridW: 420, right: 484, rightW: 496 } as const;
const R = BENCH.right;

/** Keep the chosen loop pointing at the same loop when main-list blocks at or after `from` move by `delta`. */
function shiftTarget(t: ContainerPath, from: number, delta: number): ContainerPath {
  return t.length && t[0].index >= from ? [{ ...t[0], index: t[0].index + delta }, ...t.slice(1)] : t;
}

export interface BenchPuzzle {
  world: World;
  /** Blocks the program starts with (e.g. a buggy program to fix). */
  start?: Block[];
  /** Fewest blocks a good answer needs (shown as a gentle challenge). */
  best?: number;
}

/**
 * The standard coding playground: the robot's grid on the left; on the right the program strip,
 * the block palette and Run / Step / Reset. Lessons configure it rather than rebuilding it.
 *
 * - `tapMode: 'remove'`: tapping a block in the program takes it out.
 * - `tapMode: 'cycle'`: tapping an arrow block turns it to the next direction (for fixing bugs).
 */
export function PuzzleBench({
  label,
  makePuzzle,
  palette,
  tapMode = 'remove',
  allowNested = false,
  maxBlocks = 12,
  intro,
  successText,
  stripTitle = 'Program',
  emptyText,
  timesRange,
  lockStructure = false,
  showBest = true,
  callouts,
}: {
  label: string;
  makePuzzle: () => BenchPuzzle;
  palette: PaletteEntry[];
  tapMode?: 'remove' | 'cycle';
  allowNested?: boolean;
  maxBlocks?: number;
  intro: string;
  successText?: (t: Trace, blocks: Block[], puzzle: BenchPuzzle) => string;
  stripTitle?: string;
  emptyText?: string;
  timesRange?: [number, number];
  /** Fix-the-bug mode: blocks can be changed but not added or removed. */
  lockStructure?: boolean;
  /** Show "N blocks (best: B)" above the program when the puzzle has a `best`. */
  showBest?: boolean;
  /**
   * Callouts drawn on top; told where things are (`x` is the right column's left edge; the Step button's
   * centre is x + 178). Free space: right of the palette title (from x + 260, paletteY - 62 to paletteY - 14),
   * and below the controls.
   */
  callouts?: (where: { grid: GridLayout; strip: StripLayout; world: World; paletteY: number; controlsY: number; x: number }) => ReactNode;
}) {
  const [puzzle, setPuzzle] = useState<BenchPuzzle>(makePuzzle);
  const [blocks, setBlocks] = useState<Block[]>(() => puzzle.start ?? []);
  const [target, setTarget] = useState<ContainerPath>([]);
  const [lastTrace, setLastTrace] = useState<Trace | null>(null);
  const world = puzzle.world;
  const program: Program = useMemo(() => ({ main: blocks }), [blocks]);
  const runner = useRunner(world, program, { onDone: setLastTrace });

  const cell = Math.min(BENCH.gridW / world.cols, 380 / world.rows);
  const grid: GridLayout = { x: BENCH.left + (BENCH.gridW - cell * world.cols) / 2, y: 70, cell };
  const strip = layoutProgram(blocks, { x: R, y: 70, width: BENCH.rightW, s: 60, slots: !lockStructure });
  const paletteY = Math.max(strip.y + strip.height + 70, 300);
  // Without a palette the controls sit under the program, leaving room for a callout in between.
  const runY = lockStructure ? Math.max(strip.y + strip.height + 96, 260) : paletteY + 92;
  const count = countBlocks(blocks);
  const full = count >= maxBlocks;

  const [notice, setNotice] = useState<string | null>(null);
  const edit = (next: Block[]) => {
    setBlocks(next);
    setLastTrace(null);
    setNotice(null);
  };

  const add = (entry: PaletteEntry, at?: { path: ContainerPath; index: number }) => {
    if (full || lockStructure) return;
    const block = entry.make();
    // Loops go in the main list (one level of loops keeps programs readable for young coders).
    let path = at?.path ?? target;
    if (block.kind === 'repeat' && path.length) path = [];
    const list = getList(blocks, path);
    const index = at && samePath(at.path, path) ? at.index : list.length;
    if (path.length && list.length >= LOOP_MAX) {
      setNotice(`A loop holds up to ${LOOP_MAX} blocks. Tap the + after the loop to add blocks there.`);
      return;
    }
    play('pop');
    edit(insertBlock(blocks, path, index, block));
    if (block.kind === 'repeat' && allowNested) setTarget([{ index, branch: 'body' }]);
    // Adding before the chosen loop moves it along one place.
    else if (!path.length) setTarget((t) => shiftTarget(t, index, 1));
  };

  const onDrop = (entry: PaletteEntry, p: Pt) => {
    const spot = dropTarget(strip, p, { allowNested });
    if (spot) add(entry, spot);
  };

  const onTapBlock = (path: ContainerPath, index: number, b: Block) => {
    if (runner.status === 'running') return;
    if (tapMode === 'cycle') {
      if (b.kind !== 'move') return;
      play('tap');
      edit(updateBlock(blocks, path, index, (x) => (x.kind === 'move' ? { ...x, dir: (((x.dir + 1) % 4) as Dir) } : x)));
      return;
    }
    if (lockStructure) return;
    play('tap');
    edit(removeBlock(blocks, path, index));
    if (!path.length) setTarget((t) => (t.length && t[0].index === index ? [] : shiftTarget(t, index + 1, -1)));
  };

  const newPuzzle = () => {
    const p = makePuzzle();
    setPuzzle(p);
    setBlocks(p.start ?? []);
    setTarget([]);
    setLastTrace(null);
    setNotice(null);
  };

  const shown = runner.status === 'done' && lastTrace ? lastTrace : null;
  let message: { tone: 'info' | 'good' | 'oops'; text: string };
  if (shown) {
    const o = outcomeText(shown, blocks);
    message = shown.outcome === 'success' && successText ? { tone: 'good', text: successText(shown, blocks, puzzle) } : o;
  } else if (runner.status === 'running' || runner.status === 'stepping') {
    message = { tone: 'info', text: runningCaption(runner, blocks) ?? 'Running…' };
  } else if (notice) {
    message = { tone: 'info', text: notice };
  } else if (full && !lockStructure) {
    message = { tone: 'info', text: `That's ${maxBlocks} blocks, the most for this puzzle. Press Run, or tap a block to take it out.` };
  } else {
    message = { tone: 'info', text: intro };
  }
  const mood = shown?.outcome === 'success' ? 'proud' : runner.bump ? 'oops' : 'happy';

  return (
    <SceneSvg label={label}>
      <GridWorld world={world} layout={grid} robot={runner.robot} trail={runner.trail} bump={runner.bump} mood={mood} />
      <Message x={BENCH.left} y={grid.y + world.rows * cell + 22} w={BENCH.gridW} tone={message.tone} text={message.text} />
      <ProgramStrip
        layout={strip}
        title={puzzle.best && showBest && !lockStructure ? `${stripTitle} · ${count} block${count === 1 ? '' : 's'} (best: ${puzzle.best})` : stripTitle}
        activeIds={runner.activeIds}
        failedId={runner.status === 'done' ? lastTrace?.failedBlockId : undefined}
        target={allowNested ? target : undefined}
        emptyText={emptyText}
        onTapBlock={onTapBlock}
        onTimes={(path, index, times) => {
          play('tap');
          edit(updateBlock(blocks, path, index, (b) => (b.kind === 'repeat' ? { ...b, times } : b)));
        }}
        onSelectTarget={allowNested ? (p) => setTarget(p) : undefined}
        timesRange={timesRange}
        locked={runner.status === 'running'}
      />
      {!lockStructure && (
        <BlockPalette
          entries={palette}
          x={R}
          y={paletteY}
          s={64}
          title="Blocks · drag or tap"
          disabled={full || runner.status === 'running'}
          onDrop={onDrop}
          onTap={(e) => add(e)}
        />
      )}
      <RunControls
        x={R}
        y={runY}
        runner={runner}
        canRun={blocks.length > 0}
        extra={lockStructure ? [] : [{ label: 'Clear', onClick: () => (edit([]), setTarget([])), disabled: blocks.length === 0 }]}
      />
      <SvgButton x={40} y={606} w={180} h={56} fontSize={19} label="New puzzle" onClick={newPuzzle} disabled={runner.status === 'running'} title="Try a different puzzle" />
      {callouts?.({ grid, strip, world, paletteY, controlsY: runY, x: R })}
    </SceneSvg>
  );
}
