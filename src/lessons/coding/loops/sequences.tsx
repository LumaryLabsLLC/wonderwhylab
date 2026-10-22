import { ArrowDownUp, Footprints, ListOrdered, Star as StarIcon } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { Callout } from '../../../stage/Callout';
import { ARROW_ENTRIES, ArrowGlyph, BLOCK_COLORS, GridPicture, PuzzleBench, RIGHT, UP, DOWN, makePuzzle, move } from '../engine';
import type { World } from '../engine';
import { faceRandom, whereItEnds, whichProgram } from '../questions';

const PALETTE = ARROW_ENTRIES(move);

function newPuzzle() {
  const p = makePuzzle({ cols: 6, rows: 5, walls: 3, items: 2, minLen: 6, maxLen: 9, minTurns: 2 });
  return { world: faceRandom(p), best: p.solution.length };
}

function SequenceScene() {
  return (
    <PuzzleBench
      label="Sequences: build a program that collects every star and then reaches the flag"
      makePuzzle={newPuzzle}
      palette={PALETTE}
      maxBlocks={14}
      intro="Collect both stars, then finish on the flag. Build the whole sequence, then press Run."
      emptyText="Drag or tap arrows to build a sequence"
      successText={(_t, blocks, p) =>
        p.best && blocks.length <= p.best ? `Perfect sequence! ${blocks.length} blocks is the shortest way.` : `You did it with ${blocks.length} blocks! Can you find a way with ${p.best}?`
      }
      callouts={({ strip, paletteY, controlsY, x }) => (
        <>
          <Callout
            at={[strip.x + strip.width - 40, strip.y + strip.height]}
            box={[740, paletteY - 62]}
            w={230}
            icon={ArrowDownUp}
            title="Order matters"
            text="The robot runs blocks from first to last. Swap two blocks and the path changes!"
          />
          <Callout at={[x + 178, controlsY + 56]} box={[x + 110, controlsY + 96]} w={250} icon={Footprints} title="Check each step" text="Step runs one block at a time, so you can see which one goes off course." />
        </>
      )}
    />
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={8} width={64} height={64} rx={8} fill="#eef3ff" stroke={C.ink} strokeWidth={1.5} />
      <polyline points="18,60 18,40 40,40 40,20 58,20" fill="none" stroke="#a9b4ff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 33 l2.4 4.8 5.3 .8 -3.8 3.7 .9 5.3 -4.8 -2.5 -4.8 2.5 .9 -5.3 -3.8 -3.7 5.3 -.8z" fill="#facc15" stroke={C.ink} strokeWidth={1} />
      <path d="M58 10 V26 M58 10 h9 l-3 4 l3 4 h-9" fill="#ef4444" stroke={C.ink} strokeWidth={1.3} strokeLinejoin="round" />
      {[UP, RIGHT, UP, RIGHT].map((d, i) => (
        <g key={i}>
          <rect x={78} y={6 + i * 18} width={17} height={16} rx={4} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.1} />
          <ArrowGlyph cx={86.5} cy={14 + i * 18} s={12} dir={d} />
          <text x={104} y={15 + i * 18} dominantBaseline="central" fontSize={11} fontWeight={700} fill={C.ink}>
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level <= 0) return whereItEnds({ cols: 4, rows: 3, len: 3 });
  if (level === 1) return Math.random() < 0.5 ? whereItEnds({ cols: 4, rows: 4, len: 4 }) : whichProgram({ cols: 4, rows: 4, items: 1, minLen: 4, maxLen: 5, minTurns: 1, sameArrows: true });
  return Math.random() < 0.5
    ? whereItEnds({ cols: 5, rows: 4, len: 6 })
    : whichProgram({ cols: 5, rows: 4, walls: 2, items: 1, minLen: 5, maxLen: 6, minTurns: 2, sameArrows: true, choices: 4 });
}

const EXAMPLE: World = { cols: 3, rows: 3, start: { x: 0, y: 2, dir: UP }, goal: { x: 2, y: 2 }, walls: [{ x: 1, y: 2 }], items: [{ x: 1, y: 0 }], needItems: true };

export const sequences: Lesson = {
  id: 'sequences',
  title: 'Sequences',
  Thumb,
  Scene: SequenceScene,
  sceneHint: 'Build a sequence that collects every star, then press Run',
  learn: {
    heading: 'Steps in the right order',
    intro: 'A sequence is a list of steps done in order, one after another. The same steps in a different order can lead somewhere completely different!',
    points: [
      { icon: ListOrdered, text: 'The robot does block 1 first, then block 2, and so on.' },
      { icon: ArrowDownUp, text: 'Changing the order changes where the robot goes.' },
      { icon: StarIcon, text: 'Plan the path through every star before the flag.' },
    ],
  },
  steps: ['Find the stars, the rocks and the flag.', 'Trace a path through every star that ends on the flag.', 'Add an arrow for every square, in order.', 'Run it. If it goes off course, use Step to find the block that went wrong.'],
  example: {
    question: 'The star is at the top. A rock sits right of the robot. Which sequence collects the star and reaches the flag?',
    visual: <GridPicture world={EXAMPLE} path={[UP, UP, RIGHT, RIGHT, DOWN, DOWN]} />,
    work: ['Go up 2 to the top row, then right 1 to the star.', 'Keep going right 1, then down 2 to the flag.'],
    answer: 'Up, up, right, right, down, down.',
  },
  grownups: [
    'Everyday sequences are everywhere: getting dressed, a recipe, a bedtime routine. Ask “what would happen if we did these in a different order?”',
    'When a program goes wrong, encourage your child to read it aloud in order and point to where the robot should be after each block.',
    'Being precise matters: one extra or missing step sends the robot somewhere else. That’s exactly how computers behave.',
  ],
  makeQuestion,
};
