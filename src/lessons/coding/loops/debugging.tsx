import { Bug, Footprints, Search, SlidersHorizontal, Wrench } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, shuffle } from '../../../lib/random';
import { Callout } from '../../../stage/Callout';
import { ArrowGlyph, BLOCK_COLORS, PuzzleBench, PuzzlePicture, RIGHT, UP, move, repeat } from '../engine';
import type { World } from '../engine';
import { whichBlockIsBug } from '../questions';
import { bugWords, loopBug } from './puzzles';

function newPuzzle() {
  const b = loopBug({ long: Math.random() < 0.5, rocks: 3 });
  return { world: b.world, start: b.buggy };
}

function DebugScene() {
  return (
    <PuzzleBench
      label="Debugging: this program has one bug. Step through it, then fix the arrow or the loop number"
      makePuzzle={newPuzzle}
      palette={[]}
      tapMode="cycle"
      lockStructure
      intro="This program has one bug. Press Step to find it. Tap an arrow to turn it, or use − and + to change a loop."
      successText={() => 'Bug squashed! You tested it, found the problem and fixed it.'}
      stripTitle="Program with a bug"
      callouts={({ strip, controlsY, x }) => (
        <>
          <Callout
            at={[strip.x + 70, strip.y + strip.height]}
            box={[x, strip.y + strip.height + 26]}
            w={260}
            icon={SlidersHorizontal}
            title="Two ways to fix"
            text="Tap an arrow to turn it. Use − and + to change how many times a loop repeats."
          />
          <Callout at={[x + 178, controlsY + 56]} box={[x + 110, controlsY + 100]} w={250} icon={Footprints} title="Test, then fix" text="Step through the program. The first block that goes the wrong way is the bug." />
        </>
      )}
    />
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={14} width={76} height={40} rx={9} fill={shade(BLOCK_COLORS.repeat, 0.72)} stroke={C.ink} strokeWidth={1.4} />
      <rect x={10} y={18} width={30} height={32} rx={7} fill={BLOCK_COLORS.repeat} stroke={C.ink} strokeWidth={1.3} />
      <text x={25} y={34} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} fill="white">
        4×
      </text>
      <rect x={42} y={14} width={42} height={40} rx={10} fill="#ef4444" opacity={0.4} />
      <rect x={46} y={20} width={30} height={28} rx={6} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.3} />
      <ArrowGlyph cx={61} cy={34} s={20} dir={UP} />
      <circle cx={96} cy={52} r={13} fill="none" stroke={C.ink} strokeWidth={3} />
      <line x1={105} y1={61} x2={114} y2={72} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={96} cy={52} rx={5} ry={6} fill="#ef4444" stroke={C.ink} strokeWidth={1} />
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

function whichBlock(long: boolean): Question {
  const b = loopBug({ long, rocks: 2, minBlocks: 2, cols: 6, rows: 4 });
  return whichBlockIsBug({ world: b.world, buggy: b.buggy, bug: b.bug, ...bugWords(b) });
}

/** "Block N repeats the wrong number of times. What should it be?" */
function whatNumber(): Question {
  const b = loopBug({ kinds: ['count'], rocks: 2, cols: 6, rows: 4 });
  const k = b.bug + 1;
  const good = Number(b.good);
  // Keep the buggy number out of the choices: it is already shown as wrong.
  const others = numberChoices(good, { count: 5, min: 2, max: 9, spread: 2 }).filter((v) => v !== b.good && v !== b.bad);
  const choices = shuffle([b.good, ...others.slice(0, 2)]);
  return {
    prompt: `Block ${k} repeats the wrong number of times. What should the number be?`,
    visual: <PuzzlePicture world={b.world} blocks={b.buggy} numbered />,
    choices: choices.map((value) => ({ value })),
    answer: b.good,
    hint: 'Run the other blocks in your head. How many squares are left for the loop to cover?',
    explain: [`Follow the program from the robot, block by block.`, bugWords(b).why, `So Block ${k} should repeat ${good} times.`],
  };
}

function makeQuestion(level: number): Question {
  if (level <= 0) return whichBlock(false);
  if (level === 1) return Math.random() < 0.5 ? whatNumber() : whichBlock(false);
  return Math.random() < 0.6 ? whichBlock(true) : whatNumber();
}

const EXAMPLE: World = { cols: 5, rows: 2, start: { x: 0, y: 1, dir: RIGHT }, goal: { x: 4, y: 0 }, walls: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] };

export const debugging: Lesson = {
  id: 'debugging',
  title: 'Debugging',
  Thumb,
  Scene: DebugScene,
  sceneHint: 'Step to find the bug · Tap an arrow or use − / + to fix it',
  learn: {
    heading: 'Be a bug detective',
    intro: 'Debugging means finding and fixing mistakes in a program. Coders test their programs, watch closely, and fix one thing at a time.',
    points: [
      { icon: Search, text: 'Test: run the program and watch where it goes wrong.' },
      { icon: Bug, text: 'Find the first block that does the wrong thing.' },
      { icon: Wrench, text: 'Fix that one block, then test again.' },
    ],
  },
  steps: ['Press Run and watch where the robot ends up.', 'Press Reset, then Step through one block at a time.', 'Stop at the first block that goes the wrong way, or repeats too many or too few times.', 'Fix it, then Run again to check.'],
  example: {
    question: 'The flag is 4 squares right and 1 up. The program is “repeat 3 times: right”, then up. What is the bug?',
    visual: <PuzzlePicture world={EXAMPLE} blocks={[repeat(3, [move(RIGHT)]), move(UP)]} numbered />,
    work: ['Block 1 moves the robot right 3 times, but the flag is 4 squares right.', 'Block 2 then moves up into a rock.', 'The loop number is the bug: it should be 4.'],
    answer: 'Change the loop to repeat 4 times.',
  },
  grownups: [
    'Praise the process: “You tested it, spotted where it went wrong, and fixed just that block.” That is real debugging.',
    'Resist fixing it for them. Ask “where did the robot first go somewhere you didn’t expect?”',
    'Talk about bugs in everyday life, like a recipe with a missing step, and how you would find and fix them.',
  ],
  makeQuestion,
};
