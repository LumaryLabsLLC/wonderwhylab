import { Bug, Footprints, MousePointerClick, RotateCw, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { shuffle } from '../../../lib/random';
import { Callout } from '../../../stage/Callout';
import { ArrowGlyph, ArrowsPicture, BLOCK_COLORS, DIR_NAME, DIRS, PuzzleBench, PuzzlePicture, RIGHT, UP, movesToBlocks } from '../engine';
import type { World } from '../engine';
import { mcq } from '../q';
import { arrowBug, whichBlockIsBug } from '../questions';

function newPuzzle() {
  const b = arrowBug({ cols: 5, rows: 4, walls: 2, minLen: 3, maxLen: 5, minTurns: 1 });
  return { world: b.world, start: b.buggy };
}

function BugScene() {
  return (
    <PuzzleBench
      label="Fix the bug: one arrow in this program is wrong. Step through it, then tap the wrong arrow to turn it"
      makePuzzle={newPuzzle}
      palette={[]}
      tapMode="cycle"
      lockStructure
      intro="One arrow in this program is wrong. Press Step to watch each block, then tap the wrong arrow to turn it."
      successText={() => 'Bug fixed! You found the wrong arrow and turned it the right way.'}
      stripTitle="Program with a bug"
      callouts={({ strip, controlsY, x }) => (
        <>
          <Callout at={[strip.x + 40, strip.y + strip.height]} box={[x, strip.y + strip.height + 26]} w={230} icon={RotateCw} title="Tap to turn" text="Tap an arrow block to turn it to the next direction." />
          <Callout at={[x + 178, controlsY + 56]} box={[x + 110, controlsY + 100]} w={240} icon={Footprints} title="Step by step" text="Step runs one block at a time, so you can see exactly where it goes wrong." />
        </>
      )}
    />
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[RIGHT, UP, RIGHT].map((d, i) => (
        <g key={i}>
          {i === 1 && <rect x={8 + i * 36 - 4} y={18} width={38} height={38} rx={9} fill="#ef4444" opacity={0.55} />}
          <rect x={8 + i * 36} y={22} width={30} height={30} rx={7} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.5} />
          <ArrowGlyph cx={23 + i * 36} cy={37} s={24} dir={d} />
        </g>
      ))}
      <circle cx={62} cy={62} r={10} fill="none" stroke={C.ink} strokeWidth={3} />
      <line x1={69} y1={69} x2={78} y2={77} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={104} cy={40} rx={9} ry={11} fill="#ef4444" stroke={C.ink} strokeWidth={1.5} />
      <line x1={104} y1={29} x2={104} y2={51} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={100} cy={37} r={2} fill={C.ink} />
      <circle cx={108} cy={44} r={2} fill={C.ink} />
    </svg>
  );
}

/** "Block N is the bug. Which arrow should it be?" */
function whichArrow(): Question {
  const b = arrowBug({ cols: 4, rows: 4, walls: 2, minLen: 4, maxLen: 5, minTurns: 1 });
  const wrong = shuffle(DIRS.filter((d) => d !== b.rightDir)).slice(0, 2);
  const k = b.bug + 1;
  return mcq({
    prompt: `Block ${k} is the bug. Which arrow should it be?`,
    visual: <PuzzlePicture world={b.world} blocks={b.buggy} numbered />,
    answer: DIR_NAME[b.rightDir],
    wrong: wrong.map((d) => DIR_NAME[d]),
    labels: Object.fromEntries([b.rightDir, ...wrong].map((d) => [DIR_NAME[d], <ArrowsPicture moves={[d]} size={64} />])),
    names: Object.fromEntries([b.rightDir, ...wrong].map((d) => [DIR_NAME[d], `the ${DIR_NAME[d]} arrow`])),
    hint: `Follow the blocks before Block ${k}. Where is the robot then, and which way is the path to the flag?`,
    explain: [
      `Follow the blocks before Block ${k} to see where the robot is.`,
      `From there the robot must go ${DIR_NAME[b.rightDir]}, not ${DIR_NAME[b.wrongDir]}.`,
      `So Block ${k} should be ${DIR_NAME[b.rightDir]}.`,
    ],
  });
}

function blockBug(spec: Parameters<typeof arrowBug>[0]): Question {
  const b = arrowBug(spec);
  return whichBlockIsBug({
    world: b.world,
    buggy: b.buggy,
    bug: b.bug,
    why: `Block ${b.bug + 1} moves ${DIR_NAME[b.wrongDir]}, but the robot needs to go ${DIR_NAME[b.rightDir]} there.`,
    fix: `Turn it to ${DIR_NAME[b.rightDir]}.`,
  });
}

function makeQuestion(level: number): Question {
  if (level <= 0) return blockBug({ cols: 3, rows: 3, minLen: 3, maxLen: 3, minTurns: 1 });
  if (level === 1) return blockBug({ cols: 4, rows: 3, walls: 1, minLen: 4, maxLen: 4, minTurns: 1 });
  return Math.random() < 0.5 ? whichArrow() : blockBug({ cols: 4, rows: 4, walls: 2, minLen: 4, maxLen: 5, minTurns: 1 });
}

// Rocks above the first two squares make Block 3 the only block that can be fixed.
const EXAMPLE: World = { cols: 3, rows: 2, start: { x: 0, y: 1, dir: RIGHT }, goal: { x: 2, y: 0 }, walls: [{ x: 0, y: 0 }, { x: 1, y: 0 }] };

export const fixTheBug: Lesson = {
  id: 'fix-the-bug',
  title: 'Fix the Bug',
  Thumb,
  Scene: BugScene,
  sceneHint: 'Press Step to find the wrong arrow · Tap it to turn it',
  learn: {
    heading: 'Finding and fixing bugs',
    intro: 'A bug is a mistake in a program. Every coder makes them! Coders find bugs by checking one step at a time.',
    points: [
      { icon: Bug, text: 'A bug is a step that does the wrong thing.' },
      { icon: Search, text: 'Check the program one block at a time to find it.' },
      { icon: MousePointerClick, text: 'Fix just that block, then run it again.' },
    ],
  },
  steps: ['Press Step to run one block.', 'Watch where the robot goes. Is that the way to the flag?', 'When a block goes the wrong way, that is the bug.', 'Tap it to turn it, then press Run to check your fix.'],
  example: {
    question: 'The program is right, right, right. The flag is 2 squares right and 1 square up. Which block is the bug?',
    visual: <PuzzlePicture world={EXAMPLE} blocks={movesToBlocks([RIGHT, RIGHT, RIGHT])} numbered />,
    work: ['Blocks 1 and 2 take the robot right, under the flag.', 'Block 3 moves right again, but the robot needs to go up.'],
    answer: 'Block 3 is the bug. Change it to up.',
  },
  grownups: [
    'Model a calm attitude to mistakes: “Oops, a bug! Let’s find it.” Debugging is a normal part of coding, not a failure.',
    'Encourage stepping through slowly instead of changing blocks at random. Ask “what did this block do?” at each step.',
    'Try it at home: give a silly wrong instruction (“to brush teeth, first rinse, then put toothpaste on”) and let your child spot the bug.',
  ],
  makeQuestion,
};
