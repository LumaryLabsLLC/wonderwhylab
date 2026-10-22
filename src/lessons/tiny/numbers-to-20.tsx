import { useEffect, useRef, useState } from 'react';
import { Footprints, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { choices } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { numberWord } from '../../lib/words';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { TenFrame, TenFramePicture } from '../../visuals/TenFrame';
import { countList } from './explain';

const CELL = 68;
const F1 = { x: 80, y: 150 };
const F2 = { x: 80, y: 340 };

/** Centre of cell i in a frame drawn at `f`. */
const cellCenter = (f: { x: number; y: number }, i: number): [number, number] => [
  f.x + (i % 5) * CELL + CELL / 2,
  f.y + Math.floor(i / 5) * CELL + CELL / 2,
];

function TeenScene() {
  const [n, setN] = useState(14);
  /** While "count on" runs: how many counters in the second frame are numbered so far. */
  const [lit, setLit] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const set = (v: number) => {
    window.clearInterval(timer.current);
    setLit(null);
    setN(Math.max(0, Math.min(20, v)));
    play('pop');
  };

  const ones = Math.max(0, n - 10);
  const first = Math.min(n, 10);

  const countOn = () => {
    window.clearInterval(timer.current);
    if (n <= 10) {
      speak(n === 10 ? 'Ten! One full ten.' : `${n}. Fill up the first frame to make ten!`);
      return;
    }
    let k = 0;
    setLit(0);
    speak('Ten');
    timer.current = window.setInterval(() => {
      k += 1;
      if (k > ones) {
        window.clearInterval(timer.current);
        speak(`${n}! Ten and ${ones} more.`);
        play('correct');
        return;
      }
      setLit(k);
      play('tap');
      speak(String(10 + k));
    }, 850);
  };

  return (
    <SceneSvg label={`${n} counters in two ten-frames`}>
      {/* Wooden board */}
      <rect x={54} y={112} width={400} height={404} rx={18} fill={shade(C.wood, -0.3)} stroke={C.ink} strokeWidth={2} />
      <rect x={50} y={104} width={400} height={404} rx={18} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <text x={F1.x} y={F1.y - 14} fontSize={16} fill={C.ink2} className="caps">First ten</text>
      <text x={F2.x} y={F2.y - 14} fontSize={16} fill={C.ink2} className="caps">Some more</text>

      <TenFrame x={F1.x} y={F1.y} cell={CELL} a={first} colorA={C.red} onCellClick={(i) => set(i + 1)} />
      <TenFrame x={F2.x} y={F2.y} cell={CELL} b={0} a={ones} colorA={C.blue} onCellClick={(i) => set(10 + i + 1)} />

      {n >= 10 && (
        <g className="pop-in" style={{ transformOrigin: `${F1.x + 5 * CELL}px ${F1.y}px` }}>
          <circle cx={F1.x + 5 * CELL} cy={F1.y} r={24} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
          <text x={F1.x + 5 * CELL} y={F1.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink} className="num">
            10
          </text>
        </g>
      )}

      {/* "Count on" numbers over the second frame */}
      {lit !== null &&
        Array.from({ length: lit }, (_, i) => {
          const [cx, cy] = cellCenter(F2, i);
          return (
            <g key={i} className="pop-in" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r={CELL * 0.26} fill={shade(C.blue, -0.35)} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.white} className="num">
                {11 + i}
              </text>
            </g>
          );
        })}

      {/* Equation under the board */}
      <text x={250} y={584} textAnchor="middle" fontSize={42} fontWeight={700} className="num" fill={C.ink}>
        {n > 10 ? (
          <>
            <tspan fill={C.red}>10</tspan>
            <tspan> + </tspan>
            <tspan fill={C.blue}>{ones}</tspan>
            <tspan> = {n}</tspan>
          </>
        ) : n === 10 ? (
          'one full ten'
        ) : (
          `${n}`
        )}
      </text>

      {/* Readout and controls */}
      <NumberCard x={740} y={130} w={180} h={150} value={n} />
      <text x={830} y={312} textAnchor="middle" fontSize={22} fontWeight={600} fill={C.ink}>
        {numberWord(n)}
      </text>
      <SvgButton x={740} y={340} w={84} label="−" title="One less" onClick={() => set(n - 1)} disabled={n <= 0} />
      <SvgButton x={836} y={340} w={84} label="+" title="One more" onClick={() => set(n + 1)} disabled={n >= 20} color={C.yellow} />
      <SvgButton x={740} y={420} w={180} h={52} fontSize={18} label="Count on" onClick={countOn} color={C.teal} textColor={C.white} />

      <Callout
        at={[F1.x + 5 * CELL, F1.y + CELL]}
        box={[485, 112]}
        w={225}
        icon={LayoutGrid}
        title="One full ten"
        text="When all 10 boxes are full, that’s ten."
      />
      <Callout
        at={[F2.x + 5 * CELL, F2.y + CELL]}
        box={[485, 300]}
        w={225}
        icon={Plus}
        title="Some more"
        text="Extra counters go in the next frame."
      />
      <Callout
        at={[250, 608]}
        box={[485, 534]}
        w={235}
        icon={Sparkles}
        title="Teen numbers"
        text={n > 10 && n < 20 ? `${numberWord(n)[0].toUpperCase()}${numberWord(n).slice(1)} is 10 and ${ones} more.` : 'Numbers 11 to 19 are 10 and some more.'}
      />
    </SceneSvg>
  );
}

function Thumb() {
  const frame = (x: number, filled: number, color: string) => (
    <g>
      <rect x={x} y={22} width={50} height={20} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={x + 5 + (i % 5) * 10} cy={27 + Math.floor(i / 5) * 10} r={3.6} fill={i < filled ? color : 'transparent'} />
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={66} rx={48} ry={7} fill={C.ink} opacity={0.12} />
      {frame(6, 10, C.red)}
      {frame(64, 4, C.blue)}
      <text x={60} y={60} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>10 + 4</text>
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const n = level === 0 ? rand(11, 15) : rand(11, 20);
  const style = level === 0 ? pick([0, 1]) : level === 1 ? pick([0, 1, 2]) : pick([0, 2, 3]);
  const count = level === 0 ? 3 : 4;

  if (style === 1) {
    const k = n - 10;
    return {
      prompt: `10 and ${k} more makes?`,
      speak: `Ten and ${k} more makes how many?`,
      visual: <TenFramePicture total={n} />,
      choices: choices(numberChoices(n, { count, min: 10, max: 20 })),
      answer: String(n),
      hint: 'Start at ten and count on.',
      explain: [
        'The full ten-frame is 10.',
        `Count on ${k} more: ${countList(11, n)}.`,
        `10 and ${k} more makes ${n}.`,
      ],
    };
  }
  if (style === 2) {
    const after = Math.random() < 0.5;
    const m = after ? rand(10, 19) : rand(11, 20);
    const ans = after ? m + 1 : m - 1;
    return {
      prompt: `What number comes ${after ? 'after' : 'before'} ${m}?`,
      choices: choices(numberChoices(ans, { count, min: 9, max: 20, spread: 2 })),
      answer: String(ans),
      hint: after ? 'Count up and listen for the next number.' : 'Count backwards and listen for the next number.',
      explain: after
        ? [`Count up: ${countList(Math.max(10, m - 2), m)}…`, `The number after ${m} is ${ans}.`]
        : [`Count back: ${countList(Math.min(20, m + 2), m)}…`, `The number before ${m} is ${ans}.`],
    };
  }
  if (style === 3) {
    const set = new Set<number>();
    while (set.size < 3) set.add(rand(11, 20));
    const nums = shuffle([...set]);
    return {
      prompt: 'Which number is the biggest?',
      choices: choices(nums),
      answer: String(Math.max(...nums)),
      hint: 'The biggest number has the most ones after the full ten.',
      explain: [
        `Each number is 10 and some more: ${[...nums].sort((a, b) => a - b).map((x) => `${x} is 10 and ${x - 10}`).join(', ')}.`,
        `${Math.max(...nums)} has the most extra ones.`,
        `So ${Math.max(...nums)} is the biggest.`,
      ],
    };
  }
  return {
    prompt: 'How many dots?',
    speak: 'How many dots are there?',
    visual: <TenFramePicture total={n} />,
    choices: choices(numberChoices(n, { count, min: 10, max: 20 })),
    answer: String(n),
    hint: 'The first frame is full — that’s 10. Count on from 10.',
    explain: [
      'The first frame is full: that is 10.',
      `Count the dots in the second frame from 10: ${countList(11, n)}.`,
      `There are ${n} dots.`,
    ],
  };
}

export const numbersTo20: Lesson = {
  id: 'numbers-to-20',
  title: 'Numbers to 20',
  Thumb,
  Scene: TeenScene,
  sceneHint: 'Tap + or a box to fill · Tap Count on',
  learn: {
    heading: 'Numbers to 20',
    intro: 'After 10, numbers keep going! Eleven to nineteen are called teen numbers. Each one is a full ten and some more.',
    points: [
      { icon: LayoutGrid, text: 'A full ten-frame holds 10.' },
      { icon: Plus, text: '14 is 10 and 4 more.' },
      { icon: Footprints, text: 'Count on: ten, eleven, twelve…' },
    ],
  },
  steps: [
    'Fill the first ten-frame. That makes 10.',
    'Put the extra counters in the second frame.',
    'Start at ten and count on: eleven, twelve, thirteen…',
    'The number you stop on is how many!',
  ],
  example: {
    question: 'How many dots are there?',
    visual: <TenFramePicture total={13} />,
    work: ['The first frame is full: that’s 10.', 'The second frame has 3 more.', '10 and 3 more makes 13.'],
    answer: 'There are 13 dots.',
  },
  grownups: [
    'Teen number names are tricky in English — “eleven” and “twelve” don’t sound like “ten and one”. Saying “10 and 2 more” helps.',
    'An egg carton with 10 cups makes a great ten-frame at home.',
    'Writing 41 for 14 is very common at this age. Point to the frames: 1 full ten, 4 more.',
    'Practise counting on from 10 instead of starting again at 1.',
  ],
  makeQuestion,
};
