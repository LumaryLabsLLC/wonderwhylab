import { useState } from 'react';
import { Columns3, Grid3x3, Scale } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { Grid100, Grid100Picture } from './visuals/Grid100';

const GX = 70;
const GY = 110;
const CELL = 42;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function DecimalsScene() {
  const [n, setN] = useState(47);

  const drag = useSvgDrag((p) => {
    const col = clamp(Math.floor((p.x - GX) / CELL), 0, 9);
    const row = clamp(Math.floor((p.y - GY) / CELL), 0, 9);
    const v = col * 10 + row + 1;
    if (v !== n) {
      setN(v);
      play('tap');
    }
  });

  const change = (d: number) => {
    setN((v) => clamp(v + d, 0, 100));
    play('pop');
  };

  const ones = Math.floor(n / 100);
  const tenths = Math.floor((n % 100) / 10);
  const hundredths = n % 10;
  const digits: [string, number, string][] = [
    ['Ones', ones, C.ink],
    ['Tenths', tenths, C.blue],
    ['Hundredths', hundredths, C.purple],
  ];

  return (
    <SceneSvg label={`A hundred square with ${n} squares shaded, showing ${(n / 100).toFixed(2)}`}>
      <text x={GX} y={GY - 22} fontSize={16} fill={C.muted} className="caps">
        1 whole = 100 squares
      </text>
      <Grid100 x={GX} y={GY} cell={CELL} shaded={n} />
      <rect x={GX} y={GY} width={CELL * 10} height={CELL * 10} fill="transparent" {...drag} style={{ ...drag.style, cursor: 'crosshair' }} />

      {/* Readout */}
      <NumberCard x={580} y={86} w={300} h={116} value={(n / 100).toFixed(2)} />

      {digits.map(([label, d, color], i) => {
        const x = 560 + i * 130;
        return (
          <g key={label}>
            <text x={x + 50} y={244} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
              {label}
            </text>
            <rect x={x} y={254} width={100} height={78} rx={10} fill={C.card} stroke={C.ink} strokeWidth={2} />
            <text x={x + 50} y={294} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={700} fill={color} className="num">
              {d}
            </text>
          </g>
        );
      })}
      <circle cx={675} cy={318} r={7} fill={C.ink} />

      <text x={740} y={378} textAnchor="middle" fontSize={19} fontWeight={600} fill={C.ink}>
        {plural(tenths + ones * 10, 'tenth')} + {plural(hundredths, 'hundredth')}
      </text>
      <text x={740} y={410} textAnchor="middle" fontSize={17} fill={C.ink2}>
        = {n} hundredths = {n}/100
      </text>

      <SvgButton x={560} y={446} w={88} h={52} fontSize={18} label="−0.1" title="Take away one tenth" onClick={() => change(-10)} disabled={n < 10} />
      <SvgButton x={656} y={446} w={88} h={52} fontSize={18} label="+0.1" title="Add one tenth" onClick={() => change(10)} disabled={n > 90} color={C.blue} textColor={C.white} />
      <SvgButton x={752} y={446} w={88} h={52} fontSize={18} label="−0.01" title="Take away one hundredth" onClick={() => change(-1)} disabled={n <= 0} />
      <SvgButton x={848} y={446} w={88} h={52} fontSize={18} label="+0.01" title="Add one hundredth" onClick={() => change(1)} disabled={n >= 100} color={C.purple} textColor={C.white} />

      <Callout
        at={[GX + CELL / 2, GY + CELL * 9]}
        box={[50, 560]}
        w={260}
        icon={Columns3}
        title="One tenth"
        text="A whole column is 0.1. Ten columns make 1."
      />
      <Callout
        at={[GX + CELL * 9.5, GY + CELL * 9.5]}
        box={[330, 560]}
        w={250}
        icon={Grid3x3}
        title="One hundredth"
        text="Each little square is 0.01."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(8 10)">
        <Grid100 cell={6} shaded={47} />
      </g>
      <text x={96} y={44} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink}>
        0.47
      </text>
    </svg>
  );
}

function readTenths(): Question {
  const t = rand(1, 9);
  return {
    prompt: 'What decimal is shaded?',
    visual: <Grid100Picture shaded={t * 10} />,
    choices: numberChoices(t, { min: 1, max: 9 }).map((v) => ({ value: fmt(Number(v) / 10) })),
    answer: fmt(t / 10),
    hint: 'Count the full columns. Each column is one tenth (0.1).',
    explain: [
      `${t} full ${t === 1 ? 'column is' : 'columns are'} shaded.`,
      `Each column is one tenth, so that is ${t} ${t === 1 ? 'tenth' : 'tenths'}.`,
      `${t} ${t === 1 ? 'tenth' : 'tenths'} = ${fmt(t / 10)}.`,
    ],
  };
}

function readHundredths(): Question {
  let n = rand(11, 99);
  if (n % 10 === 0) n += rand(1, 9);
  return {
    prompt: 'What decimal is shaded?',
    visual: <Grid100Picture shaded={n} />,
    choices: numberChoices(n, { min: 1, max: 99, spread: 12 }).map((v) => ({ value: fmt(Number(v) / 100) })),
    answer: fmt(n / 100),
    hint: 'Full columns are tenths, single squares are hundredths. How many squares in total?',
    explain: [
      `${Math.floor(n / 10)} full ${Math.floor(n / 10) === 1 ? 'column is' : 'columns are'} ${Math.floor(n / 10) * 10} squares.`,
      `${n % 10} more single ${n % 10 === 1 ? 'square makes' : 'squares make'} ${n} squares out of 100.`,
      `${n} hundredths = ${fmt(n / 100)}.`,
    ],
  };
}

function compare(): Question {
  const t = rand(2, 9);
  const big = t * 10; // in hundredths
  const small = (t - 1) * 10 + rand(1, 9);
  const askBig = Math.random() < 0.6;
  const a = fmt(big / 100);
  const b = fmt(small / 100);
  return {
    prompt: askBig ? `Which is bigger: ${a} or ${b}?` : `Which is smaller: ${a} or ${b}?`,
    choices: shuffle([a, b]).map((value) => ({ value })),
    answer: askBig ? a : b,
    hint: 'Line up the decimal points, then compare the tenths digit first.',
    explain: [
      `${a} has ${t} tenths.`,
      `${b} has only ${t - 1} tenths (and ${small % 10} hundredths).`,
      `${t} tenths is more than ${t - 1} tenths, so ${a} is bigger.`,
      askBig ? `The bigger one is ${a}.` : `The smaller one is ${b}.`,
    ],
  };
}

function build(): Question {
  const t = rand(0, 9);
  const h = rand(1, 9);
  return {
    prompt: `Write ${t} tenths and ${h} hundredths as a decimal.`,
    answer: fmt((t * 10 + h) / 100),
    allowDecimal: true,
    hint: 'Tenths go straight after the decimal point, then hundredths.',
    explain: [
      `The tenths digit goes first after the point: 0.${t}`,
      `The hundredths digit goes next: 0.${t}${h}`,
      `${t} tenths and ${h} hundredths = ${fmt((t * 10 + h) / 100)}.`,
    ],
  };
}

function add(): Question {
  const a = rand(1, 9) * 10;
  const b = rand(11, 59);
  return {
    prompt: `${fmt(a / 100)} + ${fmt(b / 100)} = ?`,
    answer: fmt((a + b) / 100),
    allowDecimal: true,
    hint: 'Change both numbers into hundredths, then add.',
    explain: [
      `${fmt(a / 100)} is ${a} hundredths and ${fmt(b / 100)} is ${b} hundredths.`,
      `${a} + ${b} = ${a + b} hundredths.`,
      `${a + b} hundredths = ${fmt((a + b) / 100)}.`,
    ],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return readTenths();
  if (level === 1) return pick([readHundredths, readHundredths, compare])();
  return pick([readHundredths, compare, build, add])();
}

export const decimals: Lesson = {
  id: 'decimals',
  title: 'Decimals',
  Thumb,
  Scene: DecimalsScene,
  sceneHint: 'Drag across the grid to shade · Use the buttons to add tenths and hundredths',
  learn: {
    heading: 'Decimals',
    intro: 'Decimals are a way to write parts of a whole. The decimal point separates the whole numbers from the parts.',
    points: [
      { icon: Columns3, text: 'Split 1 whole into 10 tenths: 0.1, 0.2, 0.3…' },
      { icon: Grid3x3, text: 'Split each tenth into 10 hundredths: 0.01, 0.02…' },
      { icon: Scale, text: '0.5 is bigger than 0.47. Compare the tenths first!' },
    ],
  },
  steps: [
    'The first digit after the point tells you how many tenths.',
    'The next digit tells you how many hundredths.',
    'To compare decimals, line up the points and compare digit by digit from the left.',
    'A zero on the end doesn’t change the value: 0.4 = 0.40.',
  ],
  example: {
    question: 'What decimal is shaded?',
    visual: <Grid100Picture shaded={47} />,
    work: ['4 full columns are shaded: that’s 4 tenths.', '7 more squares are shaded: that’s 7 hundredths.', '4 tenths + 7 hundredths = 47 hundredths.'],
    answer: '0.47',
  },
  grownups: [
    'Money is a great model: $0.47 is 47 hundredths of a dollar.',
    'A very common mistake is thinking 0.47 is bigger than 0.5 “because 47 is bigger than 5”. Shade both on the grid to see why not.',
    'Read decimals digit by digit: “zero point four seven”, not “zero point forty-seven”.',
    'Measuring with metres and centimetres gives real-life hundredths.',
  ],
  makeQuestion,
};
