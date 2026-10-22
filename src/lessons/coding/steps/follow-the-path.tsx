import { Footprints, ListOrdered, Play, Route } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { Callout } from '../../../stage/Callout';
import { ARROW_ENTRIES, BLOCK_COLORS, GridPicture, PuzzleBench, RIGHT, RobotBody, UP, ArrowGlyph, makePuzzle, move } from '../engine';
import type { World } from '../engine';
import { faceRandom, whichProgram } from '../questions';

const PALETTE = ARROW_ENTRIES(move);

function newPuzzle() {
  const p = makePuzzle({ cols: 5, rows: 4, walls: 2, minLen: 3, maxLen: 5, minTurns: 1 });
  return { world: faceRandom(p), best: p.solution.length };
}

function PathScene() {
  return (
    <PuzzleBench
      label="Plan a path: build a program of arrows, then run it to move the robot to the flag"
      makePuzzle={newPuzzle}
      palette={PALETTE}
      maxBlocks={10}
      showBest={false}
      intro="Plan every step first. Drag or tap arrows into the program, then press Run."
      emptyText="Drag or tap arrows to add them"
      successText={(_t, blocks, p) =>
        blocks.length === p.best ? `You planned the whole path in ${blocks.length} steps. That's the shortest way!` : `You planned the whole path! The robot followed all ${blocks.length} steps.`
      }
      callouts={({ strip, controlsY, paletteY, x }) => (
        <>
          <Callout at={[x + 58, controlsY + 56]} box={[x, controlsY + 96]} w={200} icon={Play} title="Run it" text="The robot does every step in order, exactly as you wrote it." />
          <Callout
            at={[strip.x + strip.width - 40, strip.y + strip.height]}
            box={[750, paletteY - 62]}
            w={230}
            icon={ListOrdered}
            title="Change your mind?"
            text="Tap a block in your program to take it out."
          />
        </>
      )}
    />
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={8} width={64} height={64} rx={8} fill="#eef3ff" stroke={C.ink} strokeWidth={1.5} />
      <polyline points="20,58 20,22 56,22" fill="none" stroke="#a9b4ff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(20 58)">
        <RobotBody size={20} />
      </g>
      <path d="M52 12 V30 M52 12 h10 l-3 4 l3 4 h-10" fill="#ef4444" stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
      {[UP, UP, RIGHT].map((d, i) => (
        <g key={i}>
          <rect x={78} y={8 + i * 23} width={22} height={20} rx={5} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.3} />
          <ArrowGlyph cx={89} cy={18 + i * 23} s={16} dir={d} />
        </g>
      ))}
      <rect x={104} y={8} width={10} height={66} rx={4} fill="#22c55e" stroke={C.ink} strokeWidth={1.2} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level <= 0) return whichProgram({ cols: 3, rows: 3, minLen: 2, maxLen: 2, minTurns: 1 });
  if (level === 1) return whichProgram({ cols: 4, rows: 3, minLen: 3, maxLen: 3, minTurns: 1 });
  return whichProgram({ cols: 4, rows: 4, walls: 2, minLen: 4, maxLen: 5, minTurns: 1, choices: 4 });
}

const EXAMPLE: World = { cols: 3, rows: 3, start: { x: 0, y: 2, dir: UP }, goal: { x: 2, y: 0 }, walls: [{ x: 1, y: 2 }] };

export const followThePath: Lesson = {
  id: 'follow-the-path',
  title: 'Plan a Path',
  Thumb,
  Scene: PathScene,
  sceneHint: 'Drag or tap arrows into the program, then press Run',
  learn: {
    heading: 'Planning a path',
    intro: 'Coders plan all the steps before the robot moves. A list of steps for a computer is called a program.',
    points: [
      { icon: Route, text: 'Look at the whole path first: where are the rocks?' },
      { icon: ListOrdered, text: 'Put one arrow for each square the robot must move.' },
      { icon: Footprints, text: 'Run it and watch. If it goes wrong, change a block and try again.' },
    ],
  },
  steps: ['Find the robot and the flag.', 'Trace a path with your finger, around any rocks.', 'Add one arrow for each square you traced.', 'Press Run and watch the robot follow your plan.'],
  example: {
    question: 'A rock is next to the robot. Which program gets it to the flag?',
    visual: <GridPicture world={EXAMPLE} path={[UP, UP, RIGHT, RIGHT]} />,
    work: ['The rock blocks the way right, so go up first.', 'Up 2 squares, then right 2 squares.'],
    answer: 'Up, up, right, right.',
  },
  grownups: [
    'Before pressing Run, ask your child to point along the path and say each step. Planning out loud builds the habit of thinking before acting.',
    'Lay out arrow cards on the floor and let your child “run” the program by walking it.',
    'If the robot bumps, celebrate finding the problem. Ask “which block sent it the wrong way?”',
  ],
  makeQuestion,
};
