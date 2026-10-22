/**
 * Shared coding engine for the Coding lessons (all ages).
 *
 *  model.ts      worlds, blocks, the interpreter (runProgram → Trace), editing helpers,
 *                a shortest-path solver and a solvable-puzzle generator. Pure and unit-tested.
 *  GridWorld.tsx the robot's grid for scenes (animated), plus GridPicture for practice questions.
 *  Blocks.tsx    block tiles, the ProgramStrip (with loops / ifs), BlockPalette, drag-and-drop
 *                (layoutProgram + dropTarget) and ArrowGlyph.
 *  useRunner.ts  animates a program: Run / Step / Reset, highlights the running block, shows bumps.
 *  ui.tsx        small shared scene pieces (status message, run controls, pictures for choices).
 *  PuzzleBench   the standard playground (grid + program + palette + Run/Step/Reset); configure it per lesson.
 *
 * Typical scene:
 *   const [blocks, setBlocks] = useState<Block[]>([]);
 *   const program = useMemo(() => ({ main: blocks }), [blocks]);
 *   const runner = useRunner(world, program);
 *   const layout = layoutProgram(blocks, { x: 540, y: 90, width: 420 });
 *   <GridWorld world={world} layout={grid} robot={runner.robot} trail={runner.trail} bump={runner.bump} />
 *   <ProgramStrip layout={layout} activeIds={runner.activeIds} … />
 *   <BlockPalette entries={ARROW_ENTRIES(move)} onDrop={(e, p) => { const spot = dropTarget(layout, p); … }} onTap={…} />
 */
export * from './model';
export * from './GridWorld';
export * from './Blocks';
export * from './useRunner';
export * from './ui';
export * from './PuzzleBench';
