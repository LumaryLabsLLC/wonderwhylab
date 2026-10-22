import { useEffect, useRef, useState } from 'react';
import { Box, Layers, Repeat, Square } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { numberWord } from '../../lib/words';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { iso } from '../../visuals/Iso';
import { BlocksPicture, Flat, PLACE_COLORS, Rod, Unit } from './visuals/BaseTen';

const U = 13;
const BASE = 492;
/** Iso origins for each place, chosen so the zones sit side by side on the same floor line. */
const ZONES = {
  hundreds: { ox: 172, oy: BASE - 20 * 0.5 * U },
  tens: { ox: 430, oy: BASE - 23 * 0.5 * U },
  ones: { ox: 650, oy: BASE - 4 * U },
};

const at = (zone: keyof typeof ZONES, x: number, y: number, z: number): [number, number] => {
  const [sx, sy] = iso(x, y, z, U);
  return [ZONES[zone].ox + sx, ZONES[zone].oy + sy];
};

function PlaceValueScene() {
  const [n, setN] = useState(347);
  const [toast, setToast] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const h = Math.floor(n / 100);
  const t = Math.floor(n / 10) % 10;
  const o = n % 10;

  const flash = (msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const change = (delta: number) => {
    const next = n + delta;
    if (next < 0 || next > 999) return;
    if (delta === 1 && o === 9) flash('10 ones make 1 ten!');
    else if (delta === 10 && t === 9) flash('10 tens make 1 hundred!');
    else if (delta === -1 && o === 0) flash('1 ten breaks into 10 ones!');
    else if (delta === -10 && t === 0) flash('1 hundred breaks into 10 tens!');
    setN(next);
    play('pop');
  };

  const placeControls = (x: number, label: string, digit: number, step: number, color: string) => (
    <g>
      <text x={x} y={538} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        {label}
      </text>
      <SvgButton x={x - 100} y={552} w={56} h={50} label="−" title={`Take away ${step}`} onClick={() => change(-step)} disabled={n - step < 0} />
      <rect x={x - 32} y={552} width={64} height={54} rx={10} fill={color} stroke={C.ink} strokeWidth={2} />
      <text x={x} y={580} textAnchor="middle" dominantBaseline="central" fontSize={32} fontWeight={700} fill={C.white} className="num">
        {digit}
      </text>
      <SvgButton x={x + 44} y={552} w={56} h={50} label="+" title={`Add ${step}`} onClick={() => change(step)} disabled={n + step > 999} color={C.yellow} />
    </g>
  );

  const words = numberWord(n);
  const wordLines = words.length > 24 && words.includes(' and ') ? words.split(' and ').map((w, i) => (i ? `and ${w}` : w)) : [words];

  return (
    <SceneSvg label={`${h} hundreds, ${t} tens and ${o} ones make ${n}`}>
      {/* Floor shadows */}
      {(['hundreds', 'tens', 'ones'] as const).map((z) => {
        const [cx, cy] = z === 'hundreds' ? at(z, 5, 5, 0) : z === 'tens' ? at(z, 6.5, 5, 0) : at(z, 2, 2, 0);
        const rx = z === 'hundreds' ? 120 : z === 'tens' ? 118 : 52;
        return <ellipse key={z} cx={cx + 6} cy={cy + 10} rx={rx} ry={rx * 0.5} fill={C.ink} opacity={0.08} />;
      })}

      {/* Hundreds: a stack of flats */}
      <g transform={`translate(${ZONES.hundreds.ox} ${ZONES.hundreds.oy})`}>
        {Array.from({ length: h }, (_, i) => (
          <Flat key={i} z={i} u={U} top={i === h - 1} />
        ))}
        {h === 0 && <EmptyPad w={10} d={10} />}
      </g>

      {/* Tens: rods side by side */}
      <g transform={`translate(${ZONES.tens.ox} ${ZONES.tens.oy})`}>
        {Array.from({ length: t }, (_, i) => (
          <Rod key={i} x={i * 1.5} u={U} />
        ))}
        {t === 0 && <EmptyPad w={13} d={10} />}
      </g>

      {/* Ones: loose cubes */}
      <g transform={`translate(${ZONES.ones.ox} ${ZONES.ones.oy})`}>
        {Array.from({ length: o }, (_, i) => ({ i, x: (i % 3) * 1.5, y: Math.floor(i / 3) * 1.5 }))
          .sort((a, b) => a.x + a.y - (b.x + b.y))
          .map(({ i, x, y }) => (
            <Unit key={i} x={x} y={y} u={U} />
          ))}
        {o === 0 && <EmptyPad w={4} d={4} />}
      </g>

      {placeControls(172, 'Hundreds', h, 100, PLACE_COLORS.hundreds)}
      {placeControls(424, 'Tens', t, 10, PLACE_COLORS.tens)}
      {placeControls(652, 'Ones', o, 1, PLACE_COLORS.ones)}

      {toast && (
        <g className="fade-up">
          <rect x={250} y={196} width={340} height={44} rx={10} fill={C.ink} />
          <text x={420} y={218} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.white}>
            {toast}
          </text>
        </g>
      )}

      {/* Readout */}
      <rect x={718} y={70} width={252} height={124} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={718} y={70} width={252} height={124} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={844} y={124} textAnchor="middle" dominantBaseline="central" fontSize={64} fontWeight={700} className="num">
        {h > 0 && <tspan fill={PLACE_COLORS.hundreds}>{h}</tspan>}
        {(h > 0 || t > 0) && <tspan fill={PLACE_COLORS.tens}>{t}</tspan>}
        <tspan fill={shade(PLACE_COLORS.ones, -0.1)}>{o}</tspan>
      </text>
      <text x={844} y={172} textAnchor="middle" fontSize={18} fill={C.ink2} className="num">
        {[h * 100, t * 10, o].filter((v) => v > 0).join(' + ') || '0'}
      </text>
      {wordLines.map((w, i) => (
        <text key={i} x={844} y={226 + i * 24} textAnchor="middle" fontSize={18} fontWeight={600} fill={C.ink}>
          {w}
        </text>
      ))}
      <SvgButton
        x={718}
        y={300}
        w={252}
        h={50}
        fontSize={18}
        label="Say it"
        onClick={() => speak(`${n}. ${h} hundreds, ${t} tens and ${o} ones.`, { force: true })}
        color={C.teal}
        textColor={C.white}
      />
      <SvgButton x={718} y={366} w={252} h={50} fontSize={18} label="Surprise number" onClick={() => setN(rand(100, 999))} />

      {h > 0 && <Callout at={at('hundreds', 0, 5, h)} box={[24, 60]} w={196} icon={Layers} title="Hundred" text="A flat is 10 rods: 100 cubes." />}
      {t > 0 && <Callout at={at('tens', 0.5, 2, 1)} box={[262, 60]} w={196} icon={Square} title="Ten" text="A rod is 10 cubes joined in a line." />}
      {o > 0 && <Callout at={at('ones', 0.5, 0.5, 1)} box={[500, 60]} w={196} icon={Box} title="One" text="A single cube is worth 1." />}
    </SceneSvg>
  );
}

/** Dashed outline on the floor when a place has no blocks (zero is still a digit!). */
function EmptyPad({ w, d }: { w: number; d: number }) {
  const pts = [iso(0, 0, 0, U), iso(w, 0, 0, U), iso(w, d, 0, U), iso(0, d, 0, U)].map((p) => p.join(',')).join(' ');
  const [cx, cy] = iso(w / 2, d / 2, 0, U);
  return (
    <g>
      <polygon points={pts} fill="none" stroke={C.line} strokeWidth={2} strokeDasharray="6 6" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.line}>
        0
      </text>
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(34 24)">
        <Flat u={3.2} />
        <Flat z={1} u={3.2} top />
      </g>
      <g transform="translate(80 30)">
        <Rod u={3.2} />
        <Rod x={1.6} u={3.2} />
        <Rod x={3.2} u={3.2} />
      </g>
      <g transform="translate(108 52)">
        <Unit u={6} />
        <Unit x={0} y={1.4} u={6} />
      </g>
    </svg>
  );
}

const asChoices = (values: number[]): Choice[] => shuffle(values).map((v) => ({ value: String(v) }));

const PLACE_NAMES = ['hundreds', 'tens', 'ones'];

/** Worked steps for "which is biggest?": compare hundreds, then tens, then ones. */
function biggestSteps(values: number[]): string[] {
  const max = Math.max(...values);
  const H = Math.floor(max / 100);
  const steps = [`Look at the hundreds digits: ${values.map((v) => Math.floor(v / 100)).join(', ')}.`];
  const sameH = values.filter((v) => Math.floor(v / 100) === H);
  if (sameH.length === 1) {
    steps.push(`${max} has the most hundreds (${H}).`);
  } else {
    steps.push(`${sameH.join(' and ')} ${sameH.length === 2 ? 'both' : 'all'} have ${H} hundreds, so compare the tens: ${sameH.map((v) => Math.floor(v / 10) % 10).join(' and ')}.`);
  }
  steps.push(`${max} is the biggest.`);
  return steps;
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const h = rand(1, 3);
    const t = rand(0, 9);
    const o = rand(1, 9);
    const n = h * 100 + t * 10 + o;
    const wrong = [h * 100 + o * 10 + t, (h + 1) * 100 + t * 10 + o, h * 100 + ((t + 1) % 10) * 10 + o, Math.max(1, h - 1) * 100 + t * 10 + o, h * 100 + t * 10 + ((o % 9) + 1)];
    const values = [n, ...[...new Set(wrong)].filter((v) => v !== n)].slice(0, 3);
    return {
      prompt: 'What number do the blocks show?',
      visual: <BlocksPicture hundreds={h} tens={t} ones={o} />,
      choices: asChoices(values),
      answer: String(n),
      hint: 'Count the flats (hundreds), then the rods (tens), then the cubes (ones).',
      explain: [
        `${h} ${h === 1 ? 'flat is' : 'flats are'} ${h * 100}, ${t} ${t === 1 ? 'rod is' : 'rods are'} ${t * 10} and ${o} ${o === 1 ? 'cube is' : 'cubes are'} ${o}.`,
        `${h * 100} + ${t * 10} + ${o} = ${n}.`,
      ],
    };
  }
  if (level === 1) {
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    const n = digits[0] * 100 + digits[1] * 10 + digits[2];
    const place = rand(0, 2);
    const d = digits[place];
    const value = d * [100, 10, 1][place];
    if (Math.random() < 0.5) {
      return {
        prompt: `What is the value of the ${d} in ${n}?`,
        choices: asChoices([d, d * 10, d * 100]),
        answer: String(value),
        hint: `Is the ${d} in the hundreds, tens or ones place?`,
        explain: [`In ${n}, the ${d} is in the ${PLACE_NAMES[place]} place.`, `${d} ${PLACE_NAMES[place]} = ${value}.`],
      };
    }
    return {
      prompt: `${digits[0] * 100} + ${digits[1] * 10} + ${digits[2]} = ?`,
      choices: asChoices([n, digits[2] * 100 + digits[1] * 10 + digits[0], digits[0] * 100 + digits[2] * 10 + digits[1], digits[0] + digits[1] + digits[2]].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)),
      answer: String(n),
      hint: 'Put each part in its place: hundreds, then tens, then ones.',
      explain: [
        `${digits[0] * 100} is ${digits[0]} hundreds, ${digits[1] * 10} is ${digits[1]} tens, and ${digits[2]} is ${digits[2]} ones.`,
        `Write the digits in order: ${n}.`,
      ],
    };
  }
  const kind = rand(0, 1);
  const step = [10, 100][rand(0, 1)];
  const more = Math.random() < 0.5;
  const n = more ? rand(100, 999 - step) : rand(100 + step, 999);
  if (kind === 0) {
    const result = more ? n + step : n - step;
    const place = step === 10 ? 'ten' : 'hundred';
    return {
      prompt: `What is ${step} ${more ? 'more' : 'less'} than ${n}?`,
      answer: String(result),
      hint: `Change the ${place}s digit by 1. Watch out if it has to go ${more ? 'past 9' : 'below 0'}!`,
      explain: [`${step} ${more ? 'more' : 'less'} means ${more ? 'add' : 'take away'} one ${place}.`, `${n} ${more ? '+' : '−'} ${step} = ${result}.`],
    };
  }
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ].map(([a, b, c]) => digits[a] * 100 + digits[b] * 10 + digits[c]);
  const values = shuffle(perms).slice(0, 4);
  return {
    prompt: 'Which number is the biggest?',
    choices: asChoices(values),
    answer: String(Math.max(...values)),
    hint: 'Compare the hundreds digits first. If they match, compare the tens.',
    explain: biggestSteps(values),
  };
}

export const placeValue1000: Lesson = {
  id: 'place-value-1000',
  title: 'Hundreds, Tens & Ones',
  Thumb,
  Scene: PlaceValueScene,
  sceneHint: 'Use + and − to build a number · Watch the blocks regroup',
  learn: {
    heading: 'Hundreds, tens & ones',
    intro: 'Where a digit sits tells you what it is worth. In 347, the 3 means 3 hundreds, the 4 means 4 tens and the 7 means 7 ones.',
    points: [
      { icon: Layers, text: 'Hundreds: a flat of 100 cubes.' },
      { icon: Square, text: 'Tens: a rod of 10 cubes.' },
      { icon: Box, text: 'Ones: single cubes.' },
      { icon: Repeat, text: '10 of any block make 1 of the next one up.' },
    ],
  },
  steps: [
    'Count the hundreds flats. That is the first digit.',
    'Count the tens rods. That is the middle digit.',
    'Count the ones cubes. That is the last digit.',
    'No blocks in a place? Write 0 to hold the spot.',
    'Read it: “three hundred and forty-seven”.',
  ],
  example: {
    question: 'What number is 2 hundreds, 0 tens and 5 ones?',
    visual: <BlocksPicture hundreds={2} tens={0} ones={5} />,
    work: ['Hundreds digit: 2.', 'No tens, so the tens digit is 0.', 'Ones digit: 5.'],
    answer: 'The number is 205',
  },
  grownups: [
    'Zero as a place holder (205 vs 25) is the trickiest idea here. Build both and compare.',
    'Use money: £1 / $1 coins as ones, 10s as tens, 100s as hundreds.',
    'Practise counting on in tens from any number: 37, 47, 57… and notice which digit changes.',
    'Partitioning (347 = 300 + 40 + 7) is the key to mental addition later.',
  ],
  makeQuestion,
};
