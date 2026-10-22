import { Footprints, Minus, Repeat, Repeat2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { Callout } from '../../../stage/Callout';
import {
  ARROW_ENTRIES,
  ArrowGlyph,
  ArrowsPicture,
  BLOCK_COLORS,
  DIR_NAME,
  DIRS,
  DOWN,
  LEFT,
  ProgramPicture,
  PuzzleBench,
  PuzzlePicture,
  RIGHT,
  UP,
  countBlocks,
  move,
  repeat,
} from '../engine';
import type { Block, Dir, PaletteEntry } from '../engine';
import { mcq } from '../q';
import { faceRandom } from '../questions';
import { countUp, say } from '../words';
import { loopPuzzle, worldFor } from './puzzles';

const PALETTE: PaletteEntry[] = [...ARROW_ENTRIES(move), { key: 'repeat', label: 'Repeat loop', make: () => repeat(3, []) }];

function newPuzzle() {
  const p = loopPuzzle();
  return { world: faceRandom(p.world), best: p.best };
}

const hasLoop = (blocks: Block[]) => blocks.some((b) => b.kind === 'repeat');

function LoopScene() {
  return (
    <PuzzleBench
      label="Repeat loops: use a repeat block so the robot reaches the flag with fewer blocks"
      makePuzzle={newPuzzle}
      palette={PALETTE}
      allowNested
      maxBlocks={12}
      intro="Can you use fewer blocks? Add a repeat loop, put arrows inside it, then set how many times with − and +."
      emptyText="Drag or tap blocks to build a program"
      successText={(_t, blocks, p) => {
        const n = countBlocks(blocks);
        if (p.best && n <= p.best) return `Brilliant! Just ${n} blocks. The loop did the repeating for you.`;
        return hasLoop(blocks) ? `You did it with ${n} blocks! Can you get it down to ${p.best}?` : `You did it with ${n} blocks! A repeat loop could do it with just ${p.best}.`;
      }}
      callouts={({ paletteY, controlsY, x }) => (
        <>
          <Callout
            at={[x + 355, paletteY]}
            box={[740, paletteY - 62]}
            w={240}
            icon={Repeat}
            title="A loop repeats"
            text="Blocks inside a repeat loop run again and again. Use − and + on the loop to choose how many times."
          />
          <Callout at={[x + 178, controlsY + 56]} box={[x + 110, controlsY + 96]} w={250} icon={Footprints} title="Watch the loop" text="Step shows each time round the loop: time 1, time 2, time 3…" />
        </>
      )}
    />
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={16} width={108} height={48} rx={10} fill={shade(BLOCK_COLORS.repeat, 0.72)} stroke={C.ink} strokeWidth={1.5} />
      <rect x={11} y={21} width={40} height={38} rx={8} fill={BLOCK_COLORS.repeat} stroke={C.ink} strokeWidth={1.4} />
      <text x={31} y={40} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={800} fill="white">
        3×
      </text>
      {[RIGHT, UP].map((d, i) => (
        <g key={i}>
          <rect x={57 + i * 26} y={25} width={22} height={30} rx={6} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.3} />
          <ArrowGlyph cx={68 + i * 26} cy={40} s={18} dir={d} />
        </g>
      ))}
      <path d="M100 28 a10 10 0 1 1 -4 18" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M93 42 l3 5 l5 -3" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

const loopName = (times: number, body: Dir[]) => `repeat ${times} times: ${say(body)}`;

/** L0: which loop matches a row of identical arrows? */
function sameAsArrows(): Question {
  const n = rand(3, 5);
  const d = pick(DIRS);
  const other = pick(DIRS.filter((x) => x !== d));
  const options: [number, Dir[]][] = [
    [n, [d]],
    [n + pick([-1, 1]), [d]],
    [n, [other]],
  ];
  const names = options.map(([t, b]) => loopName(t, b));
  return mcq({
    prompt: `Which loop does the same as these ${n} arrows?`,
    visual: <ArrowsPicture moves={Array.from({ length: n }, () => d)} />,
    answer: names[0],
    wrong: names.slice(1),
    labels: Object.fromEntries(options.map(([t, b], i) => [names[i], <ProgramPicture blocks={[repeat(t, b.map(move))]} size={56} />])),
    names: Object.fromEntries(names.map((x) => [x, x])),
    hint: 'Count the arrows, and check which way they point.',
    explain: [`Count the arrows: ${countUp(n)}. They all point ${DIR_NAME[d]}.`, `A loop that repeats ${DIR_NAME[d]} ${n} times does the same thing.`, `So the answer is ${names[0]}.`],
  });
}

/** L1: how many times should this loop repeat to reach the flag? */
function howManyRepeats(): Question {
  for (;;) {
    const stairs = Math.random() < 0.5;
    const h: Dir = pick([RIGHT, LEFT]);
    const v: Dir = pick([UP, DOWN]);
    const k = stairs ? rand(2, 4) : rand(3, 6);
    const body = stairs ? [h, v] : [h];
    const program = [repeat(k, body.map(move))];
    const world = worldFor(program, stairs ? 5 : 7, stairs ? 5 : 3, 2);
    if (!world) continue;
    return {
      prompt: 'How many times should the loop repeat to get the robot to the flag?',
      visual: <PuzzlePicture world={world} blocks={program} hideTimes />,
      choices: numberChoices(k, { count: 4, min: 1, max: 8, spread: 2 }).map((value) => ({ value })),
      answer: String(k),
      hint: stairs ? 'Each time round, the robot climbs one stair. Count the stairs to the flag.' : 'Each time round, the robot moves one square. Count the squares to the flag.',
      explain: stairs
        ? [`Each time round, the robot goes ${say(body)}: one stair.`, `Count the stairs to the flag: ${countUp(k)}.`, `So the loop should repeat ${k} times.`]
        : [`Each time round, the robot moves 1 square ${DIR_NAME[h]}.`, `Count the squares to the flag: ${countUp(k)}.`, `So the loop should repeat ${k} times.`],
    };
  }
}

/** L2: run a loop in your head and count. */
function countLoopSteps(): Question {
  const t = rand(2, 4);
  const len = rand(2, 3);
  const body: Dir[] = shuffle([RIGHT, pick([UP, DOWN]), RIGHT]).slice(0, len);
  if (!body.includes(RIGHT)) body[0] = RIGHT;
  const askRight = Math.random() < 0.5;
  const perTime = askRight ? body.filter((d) => d === RIGHT).length : body.length;
  const answer = perTime * t;
  const sums = Array.from({ length: t }, () => perTime).join(' + ');
  return {
    prompt: askRight ? 'How many squares to the right does the robot move?' : 'How many steps does the robot take in all?',
    visual: <ProgramPicture blocks={[repeat(t, body.map(move))]} size={56} />,
    choices: numberChoices(answer, { count: 4, min: 1, max: 20, spread: 3 }).map((value) => ({ value })),
    answer: String(answer),
    hint: askRight ? 'Count the right arrows inside the loop, then think about how many times it repeats.' : 'Count the arrows inside the loop, then think about how many times it repeats.',
    explain: [
      askRight ? `Each time round, the loop moves right ${perTime} time${perTime === 1 ? '' : 's'}.` : `Each time round, the loop makes ${perTime} moves: ${say(body)}.`,
      `It repeats ${t} times: ${sums} = ${answer}.`,
      askRight ? `The robot moves ${answer} squares to the right.` : `The robot takes ${answer} steps in all.`,
    ],
  };
}

function makeQuestion(level: number): Question {
  if (level <= 0) return sameAsArrows();
  if (level === 1) return Math.random() < 0.7 ? howManyRepeats() : sameAsArrows();
  return Math.random() < 0.6 ? countLoopSteps() : howManyRepeats();
}

export const loops: Lesson = {
  id: 'loops',
  title: 'Repeat Loops',
  Thumb,
  Scene: LoopScene,
  sceneHint: 'Add a repeat loop, put arrows inside, set the number, then Run',
  learn: {
    heading: 'Loops repeat for you',
    intro: 'A loop tells the robot to do some steps again and again. Instead of right, right, right, right, you can say “repeat 4 times: right”.',
    points: [
      { icon: Repeat2, text: 'Blocks inside the loop run again each time round.' },
      { icon: Repeat, text: 'The number says how many times the loop repeats.' },
      { icon: Minus, text: 'Loops make programs shorter and easier to read.' },
    ],
  },
  steps: ['Look for steps the robot does again and again.', 'Add a repeat loop and put those steps inside it.', 'Use − and + to set how many times.', 'Run it, and count how many blocks you used.'],
  example: {
    question: 'The robot climbs 3 stairs: right, up, right, up, right, up. Write it with a loop.',
    visual: <ProgramPicture blocks={[repeat(3, [move(RIGHT), move(UP)])]} />,
    work: ['The part that repeats is right, up.', 'It happens 3 times, so use repeat 3 times.', 'That’s 3 blocks instead of 6.'],
    answer: 'Repeat 3 times: right, up.',
  },
  grownups: [
    'Loops are everywhere: “stir 10 times”, “clap 3 times”, verses of a song. Point them out and ask “how could we say that with repeat?”',
    'Encourage your child to compare block counts. Finding a shorter program is a great problem-solving habit, not just a rule.',
    'If a loop goes wrong, Step through it together and count “time 1, time 2…” out loud.',
  ],
  makeQuestion,
};
