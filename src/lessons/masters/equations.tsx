import { useState } from 'react';
import { Box, Equal, Scale } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { BalancePicture, itemsFor, PanItems } from './visuals/Balance';

const PIVOT = { x: 500, y: 214 };
const HALF = 300;
const PAN_Y = 372; // pan surface when level
const EASE = '0.7s cubic-bezier(0.3, 1.35, 0.5, 1)';

interface Puzzle {
  secret: number;
  nx: number;
  a: number;
}

function newPuzzle(prev?: Puzzle): Puzzle {
  for (;;) {
    const nx = Math.random() < 0.3 ? 2 : 1;
    const secret = rand(1, nx === 2 ? 4 : 7);
    const a = rand(1, 5);
    if (nx * secret + a <= 12 && (!prev || prev.secret !== secret || prev.a !== a)) return { secret, nx, a };
  }
}

const lhs = (nx: number, ones: number) => `${nx === 1 ? 'x' : `${nx}x`}${ones ? ` + ${ones}` : ''}`;

function EquationScene() {
  const [puzzle, setPuzzle] = useState<Puzzle>({ secret: 4, nx: 1, a: 3 });
  const [left, setLeft] = useState(3);
  const [right, setRight] = useState(7);

  const { secret, nx } = puzzle;
  const L = nx * secret + left;
  const R = right;
  const balanced = L === R;
  const solved = balanced && left === 0;
  const angle = clamp((R - L) * 3.5, -10, 10);
  const dy = HALF * Math.sin((angle * Math.PI) / 180);

  const reset = (p = puzzle) => {
    setLeft(p.a);
    setRight(p.nx * p.secret + p.a);
  };

  const takeBoth = () => {
    if (left === 0 || right === 0) return;
    setLeft(left - 1);
    setRight(right - 1);
    play('pop');
    if (left - 1 === 0 && balanced) {
      play('correct');
      speak(nx === 1 ? `x is ${right - 1}!` : `${nx} x is ${right - 1}, so x is ${secret}!`);
    }
  };

  const takeLeft = () => {
    if (left === 0) return;
    setLeft(left - 1);
    play('wrong');
  };

  const fresh = () => {
    const p = newPuzzle(puzzle);
    setPuzzle(p);
    reset(p);
    play('whoosh');
  };

  const message = !balanced
    ? 'Not balanced! Do the same to both sides.'
    : solved
      ? nx === 1
        ? `Solved! The box weighs ${secret}.`
        : `${nx} boxes weigh ${R}, so each is ${R} ÷ ${nx} = ${secret}.`
      : 'Take the same from both sides.';

  const pan = (cx: number, items: ReturnType<typeof itemsFor>, offset: number, reveal?: number) => (
    <g style={{ transform: `translateY(${offset}px)`, transition: `transform ${EASE}` }}>
      <path d={`M${cx},${PIVOT.y} L${cx - 118},${PAN_Y} M${cx},${PIVOT.y} L${cx + 118},${PAN_Y}`} stroke={C.ink} strokeWidth={2} />
      <PanItems cx={cx} baseY={PAN_Y} items={items} reveal={reveal} />
      <ellipse cx={cx + 4} cy={PAN_Y + 34} rx={110} ry={8} fill={C.ink} opacity={0.08} />
      <path d={`M${cx - 132},${PAN_Y} Q${cx},${PAN_Y + 46} ${cx + 132},${PAN_Y} Z`} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
    </g>
  );

  return (
    <SceneSvg label={`A balance scale showing ${lhs(nx, left)} ${balanced ? 'equals' : 'does not equal'} ${R}`}>
      {/* Equation */}
      <text x={500} y={66} textAnchor="middle" dominantBaseline="central" fontSize={46} fontWeight={700} fill={balanced ? C.ink : C.red} className="num">
        {lhs(nx, left)} {balanced ? '=' : '≠'} {R}
      </text>
      <text x={500} y={114} textAnchor="middle" fontSize={17} fill={solved ? shade(C.green, -0.3) : balanced ? C.ink2 : C.red} fontWeight={solved ? 700 : 500}>
        {message}
      </text>

      {/* Stand */}
      <path d={`M${PIVOT.x - 90},572 h180 l-24,-34 h-132 z`} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
      <rect x={PIVOT.x - 11} y={PIVOT.y} width={22} height={326} fill={shade(C.wood, -0.18)} stroke={C.ink} strokeWidth={2} />

      {/* Pans hang from the beam ends and move with the tilt */}
      {pan(PIVOT.x - HALF, itemsFor(nx, left), -dy, solved ? secret : undefined)}
      {pan(PIVOT.x + HALF, itemsFor(0, right), dy)}

      {/* Beam */}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`, transition: `transform ${EASE}` }}>
        <rect x={PIVOT.x - HALF - 12} y={PIVOT.y - 8} width={HALF * 2 + 24} height={16} rx={8} fill={shade(C.wood, -0.08)} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={PIVOT.x - HALF} cy={PIVOT.y} r={6} fill={C.ink} />
        <circle cx={PIVOT.x + HALF} cy={PIVOT.y} r={6} fill={C.ink} />
        <path d={`M${PIVOT.x},${PIVOT.y - 8} l-8,-22 h16 z`} fill={balanced ? C.green : C.red} stroke={C.ink} strokeWidth={2} />
      </g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r={12} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />

      {/* Controls */}
      <SvgButton x={84} y={588} w={240} h={52} fontSize={17} label="Take 1 from both" onClick={takeBoth} disabled={left === 0 || right === 0 || !balanced} color={C.teal} textColor={C.white} />
      <SvgButton x={338} y={588} w={220} h={52} fontSize={17} label="Take 1 from left" onClick={takeLeft} disabled={left === 0} />
      <SvgButton x={572} y={588} w={140} h={52} fontSize={17} label="Start again" onClick={() => { reset(); play('tap'); }} />
      <SvgButton x={726} y={588} w={180} h={52} fontSize={17} label="New puzzle" onClick={fresh} color={C.yellow} />

      <Callout
        at={[PIVOT.x - HALF - 92, PAN_Y - 30 - dy]}
        box={[40, 448]}
        w={240}
        icon={Box}
        title="Mystery box"
        text="The x box has a secret weight. Find it!"
      />
      <Callout
        at={[PIVOT.x, PIVOT.y]}
        box={[722, 14]}
        w={240}
        icon={Scale}
        title="Keep it level"
        text="Level means equal, just like the = sign."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={57} y={20} width={6} height={50} fill={shade(C.wood, -0.18)} stroke={C.ink} strokeWidth={1.2} />
      <path d="M46 74 h28 l-4 -6 h-20 z" fill={C.wood} stroke={C.ink} strokeWidth={1.2} />
      <rect x={14} y={16} width={92} height={6} rx={3} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      <path d="M8 50 Q26 60 44 50 Z M76 50 Q94 60 112 50 Z" fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <rect x={14} y={34} width={16} height={16} rx={2} fill={C.purple} stroke={C.ink} strokeWidth={1.2} />
      <text x={22} y={43} textAnchor="middle" dominantBaseline="central" fontSize={11} fontStyle="italic" fontWeight={700} fill={C.white}>x</text>
      <rect x={32} y={40} width={10} height={10} rx={2} fill={C.yellow} stroke={C.ink} strokeWidth={1.2} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={80 + i * 11} y={40} width={10} height={10} rx={2} fill={C.yellow} stroke={C.ink} strokeWidth={1.2} />
      ))}
    </svg>
  );
}

function plusEquation(level: number): Question {
  const x = rand(1, level === 0 ? 7 : 15);
  const a = rand(1, level === 0 ? 5 : 12);
  const b = x + a;
  const flip = level > 0 && Math.random() < 0.3;
  const eq = flip ? `${a} + x = ${b}` : `x + ${a} = ${b}`;
  return {
    prompt: `${eq}. What is x?`,
    speak: flip ? `${a} plus x equals ${b}. What is x?` : `x plus ${a} equals ${b}. What is x?`,
    visual: b <= 12 ? <BalancePicture nx={1} a={a} b={b} /> : undefined,
    answer: String(x),
    hint: `Keep the balance level: take ${a} away from both sides.`,
    explain: [`Take ${a} from both sides to keep it level.`, `The left is just x. The right is ${b} − ${a} = ${x}.`, `So x = ${x}.`],
  };
}

function minusEquation(): Question {
  const a = rand(2, 9);
  const x = rand(a + 1, a + 12);
  const b = x - a;
  return {
    prompt: `x − ${a} = ${b}. What is x?`,
    speak: `x minus ${a} equals ${b}. What is x?`,
    answer: String(x),
    hint: `Keep the balance level: add ${a} to both sides.`,
    explain: [`Add ${a} to both sides to keep it level.`, `The left is just x. The right is ${b} + ${a} = ${x}.`, `So x = ${x}.`],
  };
}

function timesEquation(): Question {
  const n = rand(2, 5);
  const x = rand(2, 9);
  const withOnes = Math.random() < 0.5;
  const a = withOnes ? rand(1, 9) : 0;
  const b = n * x + a;
  return {
    prompt: `${n}x${a ? ` + ${a}` : ''} = ${b}. What is x?`,
    speak: `${n} lots of x${a ? ` plus ${a}` : ''} equals ${b}. What is x?`,
    visual: n === 2 && b <= 12 ? <BalancePicture nx={2} a={a} b={b} /> : undefined,
    answer: String(x),
    hint: a ? `First take ${a} from both sides, then share what is left between the ${n} x boxes.` : `${n}x means ${n} lots of x. Share ${b} equally between ${n}.`,
    explain: a
      ? [`Take ${a} from both sides: ${n}x = ${b - a}.`, `Share ${b - a} equally between ${n} x boxes: ${b - a} ÷ ${n} = ${x}.`, `So x = ${x}.`]
      : [`${n}x = ${b} means ${n} equal boxes weigh ${b}.`, `${b} ÷ ${n} = ${x}.`, `So x = ${x}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return plusEquation(0);
  if (level === 1) return pick([() => plusEquation(1), () => plusEquation(1), minusEquation])();
  return pick([timesEquation, timesEquation, minusEquation, () => plusEquation(1)])();
}

export const equations: Lesson = {
  id: 'equations',
  title: 'Balance Equations',
  Thumb,
  Scene: EquationScene,
  sceneHint: 'Take the same from both sides to find the mystery weight',
  learn: {
    heading: 'Balancing equations',
    intro: 'An equation is like a balance scale: both sides weigh the same. The letter x stands for a mystery number we want to find.',
    points: [
      { icon: Equal, text: 'The = sign means both sides are balanced.' },
      { icon: Scale, text: 'Do the same thing to both sides and it stays balanced.' },
      { icon: Box, text: 'Get x on its own to find its value.' },
    ],
  },
  steps: [
    'Look at what is with x: in x + 3 = 7, there is a + 3.',
    'Undo it on both sides: take 3 away from each side.',
    'Now x is on its own: x = 4.',
    'Check by putting your answer back in: 4 + 3 = 7 ✓',
  ],
  example: {
    question: 'Solve 2x + 3 = 11.',
    visual: <BalancePicture nx={2} a={3} b={11} />,
    work: ['Take 3 from both sides: 2x = 8.', 'Two equal boxes weigh 8, so share 8 into 2: x = 4.', 'Check: 2 × 4 + 3 = 11 ✓'],
    answer: 'x = 4',
  },
  grownups: [
    'The balance idea is the foundation of algebra in secondary school. If they get “do the same to both sides”, they are well set up.',
    'Use a real kitchen scale or coat hanger balance with coins and a hidden bag to make it physical.',
    'Encourage checking: put the answer back into the equation to prove it works.',
    'Function machines (“I think of a number, add 3, get 10”) are the same idea in a different form.',
  ],
  makeQuestion,
};
