import { useState } from 'react';
import { ArrowRightLeft, Equal, LayoutGrid, MoveHorizontal, Puzzle } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { TenFrame } from '../../visuals/TenFrame';

const FRAME = { x: 110, y: 170, cell: 84 };
const TRACK = { x1: 150, x2: 500, y: 442 };
const BOND = { cx: 800, top: 168, partY: 335, dx: 92 };

function Make10Scene() {
  const [red, setRed] = useState(7);
  const blue = 10 - red;

  const set = (n: number) => {
    const v = clamp(Math.round(n), 0, 10);
    if (v === red) return;
    setRed(v);
    play('pop');
  };

  const drag = useSvgDrag((p) => set(((p.x - TRACK.x1) / (TRACK.x2 - TRACK.x1)) * 10));
  const knobX = TRACK.x1 + (red / 10) * (TRACK.x2 - TRACK.x1);
  const partL: [number, number] = [BOND.cx - BOND.dx, BOND.partY];
  const partR: [number, number] = [BOND.cx + BOND.dx, BOND.partY];

  return (
    <SceneSvg label={`A ten-frame showing ${red} red and ${blue} blue counters`}>
      <TenFrame
        x={FRAME.x}
        y={FRAME.y}
        cell={FRAME.cell}
        a={red}
        b={blue}
        colorA={C.red}
        colorB={C.blue}
        onCellClick={(i) => set(i < red ? i : i + 1)}
      />

      {/* Slider */}
      <SvgButton x={60} y={414} w={60} label="−" title="One less red" onClick={() => set(red - 1)} disabled={red <= 0} />
      <SvgButton x={530} y={414} w={60} label="+" title="One more red" onClick={() => set(red + 1)} disabled={red >= 10} />
      <rect x={TRACK.x1 - 14} y={TRACK.y - 9} width={TRACK.x2 - TRACK.x1 + 28} height={18} rx={9} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <rect x={TRACK.x1 - 12} y={TRACK.y - 7} width={knobX - TRACK.x1 + 12} height={14} rx={7} fill={C.red} />
      <rect x={knobX} y={TRACK.y - 7} width={TRACK.x2 + 12 - knobX} height={14} rx={7} fill={C.blue} />
      {Array.from({ length: 11 }, (_, i) => (
        <text key={i} x={TRACK.x1 + (i / 10) * (TRACK.x2 - TRACK.x1)} y={TRACK.y + 40} textAnchor="middle" fontSize={15} fill={C.muted} className="num">
          {i}
        </text>
      ))}
      <g {...drag} role="slider" aria-label="Red counters" aria-valuemin={0} aria-valuemax={10} aria-valuenow={red}>
        <circle cx={knobX} cy={TRACK.y} r={30} fill="transparent" />
        <circle cx={knobX} cy={TRACK.y + 3} r={21} fill={shade(C.paper, -0.2)} />
        <circle cx={knobX} cy={TRACK.y} r={21} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
        <path d={`M${knobX - 6},${TRACK.y - 8} v16 M${knobX},${TRACK.y - 8} v16 M${knobX + 6},${TRACK.y - 8} v16`} stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" />
      </g>

      {/* Bond diagram */}
      <line x1={BOND.cx} y1={BOND.top} x2={partL[0]} y2={partL[1]} stroke={C.ink} strokeWidth={3} />
      <line x1={BOND.cx} y1={BOND.top} x2={partR[0]} y2={partR[1]} stroke={C.ink} strokeWidth={3} />
      <circle cx={BOND.cx + 4} cy={BOND.top + 6} r={60} fill={C.ink} opacity={0.12} />
      <circle cx={BOND.cx} cy={BOND.top} r={60} fill={C.card} stroke={C.ink} strokeWidth={3} />
      <text x={BOND.cx} y={BOND.top} textAnchor="middle" dominantBaseline="central" fontSize={50} fontWeight={700} fill={C.ink} className="num">
        10
      </text>
      {[
        { at: partL, n: red, color: C.red },
        { at: partR, n: blue, color: C.blue },
      ].map(({ at, n, color }) => (
        <g key={color}>
          <circle cx={at[0]} cy={at[1]} r={48} fill={shade(color, 0.78)} stroke={C.ink} strokeWidth={3} />
          <text key={n} x={at[0]} y={at[1]} textAnchor="middle" dominantBaseline="central" fontSize={42} fontWeight={700} fill={shade(color, -0.25)} className="num pop-in" style={{ transformOrigin: `${at[0]}px ${at[1]}px` }}>
            {n}
          </text>
        </g>
      ))}

      {/* Number sentence */}
      <text x={BOND.cx} y={445} textAnchor="middle" fontSize={40} fontWeight={700} className="num">
        <tspan fill={shade(C.red, -0.2)}>{red}</tspan>
        <tspan fill={C.ink}> + </tspan>
        <tspan fill={shade(C.blue, -0.2)}>{blue}</tspan>
        <tspan fill={C.ink}> = 10</tspan>
      </text>
      <SvgButton x={672} y={488} w={120} h={52} fontSize={18} label="Flip it" title="Swap the two parts" onClick={() => setRed(blue)} />
      <SvgButton
        x={808}
        y={488}
        w={120}
        h={52}
        fontSize={18}
        label="Say it"
        color={C.teal}
        textColor={C.white}
        onClick={() => speak(`${red} and ${blue} make 10.`, { force: true })}
      />

      <Callout
        at={[FRAME.x + FRAME.cell / 2, FRAME.y + FRAME.cell / 2]}
        box={[70, 34]}
        w={250}
        icon={LayoutGrid}
        title="Ten frame"
        text="Ten boxes. Red and blue always fill all ten."
      />
      <Callout
        at={[BOND.cx - 60, BOND.top - 6]}
        box={[400, 34]}
        w={230}
        icon={Puzzle}
        title="Parts make a whole"
        text={`${red} and ${blue} join to make 10.`}
      />
      <Callout
        at={[knobX, TRACK.y + 22]}
        box={[170, 535]}
        w={270}
        icon={MoveHorizontal}
        title="Slide to split"
        text="Drag the dot or tap a box to make 10 a new way."
      />
    </SceneSvg>
  );
}

function FramePicture({ a, b = 0 }: { a: number; b?: number }) {
  return (
    <svg viewBox="-4 -4 214 94" role="img" aria-label={`${a} counters in a ten-frame`}>
      <TenFrame cell={40} a={a} b={b} colorA={C.red} colorB={C.blue} />
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(10 18)">
        <TenFrame cell={20} a={7} b={3} colorA={C.red} colorB={C.blue} />
      </g>
      <text x={60} y={74} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink}>7 + 3 = 10</text>
    </svg>
  );
}

function pairChoices(a: number): Choice[] {
  const right = `${a} + ${10 - a}`;
  const set = new Set<string>([right]);
  let guard = 0;
  while (set.size < 4 && guard++ < 100) {
    const x = rand(1, 9);
    const y = rand(1, 9);
    if (x + y !== 10) set.add(`${x} + ${y}`);
  }
  return shuffle([...set]).map((value) => ({ value }));
}

function makeQuestion(level: number): Question {
  const a = rand(1, 9);
  const b = 10 - a;
  if (level === 0) {
    return {
      prompt: 'How many more to make 10?',
      visual: <FramePicture a={a} />,
      choices: numberChoices(b, { count: 3, min: 0, max: 10 }).map((value) => ({ value })),
      answer: String(b),
      hint: 'Look at the empty boxes. Each one needs one more counter.',
      explain: [`${a} boxes are full.`, `Count the empty boxes: there are ${b}.`, `${a} + ${b} = 10, so you need ${b} more.`],
    };
  }
  if (level === 1) {
    const missingFirst = Math.random() < 0.5;
    return {
      prompt: missingFirst ? `? + ${b} = 10` : `${a} + ? = 10`,
      speak: missingFirst ? `What plus ${b} makes 10?` : `${a} plus what makes 10?`,
      visual: <FramePicture a={missingFirst ? 0 : a} b={missingFirst ? b : 0} />,
      choices: numberChoices(missingFirst ? a : b, { min: 0, max: 10 }).map((value) => ({ value })),
      answer: String(missingFirst ? a : b),
      hint: 'Fill the ten-frame in your head. How many boxes are empty?',
      explain: missingFirst
        ? [`${b} boxes are full.`, `10 boxes in all, so ${10 - b} are empty.`, `${a} + ${b} = 10. The missing number is ${a}.`]
        : [`${a} boxes are full.`, `10 boxes in all, so ${10 - a} are empty.`, `${a} + ${b} = 10. The missing number is ${b}.`],
    };
  }
  if (Math.random() < 0.5) {
    return {
      prompt: 'Which two numbers make 10?',
      choices: pairChoices(a),
      answer: `${a} + ${b}`,
      hint: 'Add each pair. Only one makes exactly 10.',
      explain: [`Try ${a} + ${b}: start at ${a} and count on ${b}.`, `You land on 10!`, `So ${a} + ${b} makes 10.`],
    };
  }
  return {
    prompt: `10 − ${a} = ?`,
    speak: `10 take away ${a}. What is left?`,
    choices: numberChoices(b, { min: 0, max: 10 }).map((value) => ({ value })),
    answer: String(b),
    hint: `Think of the ten-pair: ${a} and what make 10?`,
    explain: [`Start with 10 and take away ${a}.`, `${a} + ${b} = 10, so ${b} is left.`, `10 − ${a} = ${b}.`],
  };
}

export const make10: Lesson = {
  id: 'make-10',
  title: 'Make 10',
  Thumb,
  Scene: Make10Scene,
  sceneHint: 'Drag the dot or tap the boxes to split 10',
  learn: {
    heading: 'Pairs that make 10',
    intro: 'Ten is a super number! Knowing which two numbers make 10 helps you add and take away really fast.',
    points: [
      { icon: LayoutGrid, text: 'A ten-frame has 10 boxes in two rows of five.' },
      { icon: Puzzle, text: 'Two parts join together to make the whole.' },
      { icon: ArrowRightLeft, text: '7 + 3 and 3 + 7 both make 10.' },
      { icon: Equal, text: 'The pairs are 1+9, 2+8, 3+7, 4+6 and 5+5.' },
    ],
  },
  steps: [
    'Look at the first number. Fill that many boxes in a ten-frame.',
    'Count the empty boxes that are left.',
    'The empty boxes are the missing part!',
    'Say the pair out loud: “7 and 3 make 10.”',
  ],
  example: {
    question: '6 + ? = 10',
    visual: <FramePicture a={6} />,
    work: ['Fill 6 boxes in the ten-frame.', 'There are 4 empty boxes left.', 'So 6 and 4 make 10.'],
    answer: '6 + 4 = 10',
  },
  grownups: [
    'Number bonds to 10 are the foundation for mental addition and subtraction, such as 8 + 5 = 8 + 2 + 3.',
    'Use ten fingers: hold up 7, and ask how many are folded down.',
    'Play “make 10” with a deck of cards (aces = 1, remove picture cards): find pairs that add to 10.',
    'Always connect the fact family: 7 + 3 = 10, 3 + 7 = 10, 10 − 7 = 3, 10 − 3 = 7.',
  ],
  makeQuestion,
};
