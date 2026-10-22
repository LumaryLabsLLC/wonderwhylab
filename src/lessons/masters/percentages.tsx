import { useState } from 'react';
import { Divide, Grid3x3, Percent, PieChart } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { numberChoices, pick, rand, round, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { Grid100, Grid100Picture } from './visuals/Grid100';

const GX = 60;
const GY = 110;
const CELL = 40;
const SLIDER = { x: 60, y: 572, w: 400 };
const BAR = { x: 530, y: 356, w: 400, h: 54 };
const AMOUNTS = [20, 40, 80, 200];
const QUICK = [10, 25, 50, 75];

/** A bar model: the whole bar is `amount` (100%), the first `percent` of it is shaded. */
function BarModel({ x, y, w, h, percent, amount, showValue = true }: { x: number; y: number; w: number; h: number; percent: number; amount: number; showValue?: boolean }) {
  const fill = (w * percent) / 100;
  const value = fmt(round((percent * amount) / 100, 2));
  return (
    <g>
      <text x={x + w} y={y - 12} textAnchor="end" fontSize={17} fontWeight={600} fill={C.ink}>
        {amount} = 100%
      </text>
      <rect x={x + 4} y={y + 5} width={w} height={h} rx={8} fill={C.ink} opacity={0.12} />
      <rect x={x} y={y} width={w} height={h} rx={8} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {percent > 0 && <rect x={x} y={y} width={fill} height={h} rx={8} fill={C.orange} stroke={C.ink} strokeWidth={2} />}
      {[25, 50, 75].map((t) => (
        <line key={t} x1={x + (w * t) / 100} y1={y + 4} x2={x + (w * t) / 100} y2={y + h - 4} stroke={C.ink} strokeDasharray="4 4" opacity={0.45} />
      ))}
      {showValue && percent > 0 && (
        <text x={x + Math.max(fill, 40) / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink} className="num">
          {value}
        </text>
      )}
    </g>
  );
}

function BarPicture({ percent, amount }: { percent: number; amount: number }) {
  return (
    <svg viewBox="-10 -36 420 100" role="img" aria-label={`A bar showing ${amount}, with ${percent}% shaded`}>
      <BarModel x={0} y={0} w={400} h={50} percent={percent} amount={amount} showValue={false} />
      <text x={(400 * percent) / 200} y={25} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.ink}>
        {percent}% = ?
      </text>
    </svg>
  );
}

function PercentScene() {
  const [p, setP] = useState(25);
  const [amount, setAmount] = useState(80);

  const set = (v: number) => {
    if (v !== p) {
      setP(v);
      play('tap');
    }
  };

  const gridDrag = useSvgDrag((pt) => {
    const col = clamp(Math.floor((pt.x - GX) / CELL), 0, 9);
    const row = clamp(Math.floor((pt.y - GY) / CELL), 0, 9);
    set(col * 10 + row + 1);
  });
  const slideDrag = useSvgDrag((pt) => set(clamp(Math.round(((pt.x - SLIDER.x) / SLIDER.w) * 100), 0, 100)));

  const value = fmt(round((p * amount) / 100, 2));
  const thumbX = SLIDER.x + (SLIDER.w * p) / 100;

  return (
    <SceneSvg label={`${p} percent of ${amount} is ${value}`}>
      <Grid100 x={GX} y={GY} cell={CELL} shaded={p} color={C.orange} />
      <rect x={GX} y={GY} width={CELL * 10} height={CELL * 10} fill="transparent" {...gridDrag} style={{ ...gridDrag.style, cursor: 'crosshair' }} />

      {/* Slider */}
      <g {...slideDrag}>
        <rect x={SLIDER.x - 10} y={SLIDER.y - 30} width={SLIDER.w + 20} height={60} fill="transparent" />
        <rect x={SLIDER.x} y={SLIDER.y - 8} width={SLIDER.w} height={16} rx={8} fill={C.line} stroke={C.ink} strokeWidth={1.5} />
        <rect x={SLIDER.x} y={SLIDER.y - 8} width={Math.max(16, thumbX - SLIDER.x)} height={16} rx={8} fill={C.orange} stroke={C.ink} strokeWidth={1.5} />
        <circle cx={thumbX} cy={SLIDER.y} r={20} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={thumbX} cy={SLIDER.y} r={7} fill={C.orange} />
      </g>
      <text x={SLIDER.x} y={SLIDER.y + 46} fontSize={15} fill={C.muted} className="num">0%</text>
      <text x={SLIDER.x + SLIDER.w} y={SLIDER.y + 46} textAnchor="end" fontSize={15} fill={C.muted} className="num">100%</text>

      {/* Readout */}
      <NumberCard x={530} y={110} w={200} h={110} value={`${p}%`} />
      <text x={752} y={152} fontSize={24} fontWeight={600} fill={C.ink} className="num">= {p}/100</text>
      <text x={752} y={192} fontSize={24} fontWeight={600} fill={C.ink2} className="num">= {fmt(p / 100)}</text>

      {QUICK.map((q, i) => (
        <SvgButton key={q} x={530 + i * 90} y={244} w={80} h={52} fontSize={19} label={`${q}%`} active={p === q} onClick={() => setP(q)} />
      ))}

      <BarModel {...BAR} percent={p} amount={amount} />

      <text x={BAR.x + BAR.w / 2} y={466} textAnchor="middle" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {p}% of {amount} = {value}
      </text>

      <text x={530} y={528} fontSize={16} fill={C.muted} className="caps" dominantBaseline="central">Of</text>
      {AMOUNTS.map((a, i) => (
        <SvgButton key={a} x={570 + i * 90} y={502} w={80} h={52} fontSize={20} label={a} title={`Find the percent of ${a}`} active={amount === a} color={amount === a ? C.yellow : C.card} onClick={() => setAmount(a)} />
      ))}

      <Callout
        at={[GX + CELL * 0.5, GY + CELL * 0.5]}
        box={[60, 14]}
        w={420}
        icon={Percent}
        title="Per cent = out of 100"
        text="1 square is 1%. All 100 squares make 100%."
      />
      <Callout
        at={[BAR.x + BAR.w, BAR.y]}
        box={[740, 6]}
        w={220}
        icon={PieChart}
        title="Bar model"
        text="The whole bar is the amount. Shade the percent you need."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(8 10)">
        <Grid100 cell={6} shaded={25} color={C.orange} />
      </g>
      <text x={96} y={44} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
        25%
      </text>
    </svg>
  );
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** An amount (20–300) where p% of it is a whole number. */
function amountFor(p: number, max = 300): number {
  const k = 100 / gcd(p, 100);
  return k * rand(Math.ceil(20 / k), Math.floor(max / k));
}

const FRACTIONS: [number, string][] = [
  [50, '1/2'],
  [25, '1/4'],
  [75, '3/4'],
  [10, '1/10'],
  [20, '1/5'],
];

function readGrid(level: number): Question {
  const p = level === 0 ? rand(1, 9) * 10 : rand(11, 89);
  const base = level === 0 ? p / 10 : p;
  return {
    prompt: 'What percent is shaded?',
    visual: <Grid100Picture shaded={p} color={C.orange} />,
    choices: numberChoices(base, level === 0 ? { min: 1, max: 9 } : { min: 1, max: 99, spread: 12 }).map((v) => ({
      value: `${level === 0 ? Number(v) * 10 : v}%`,
    })),
    answer: `${p}%`,
    hint: 'Each column is 10%. Each small square is 1%.',
    explain: gridSteps(p),
  };
}

/** Read a hundred grid: full columns are 10% each, single squares 1% each. */
function gridSteps(p: number): string[] {
  const cols = Math.floor(p / 10);
  const ones = p % 10;
  if (!ones) return [`${cols} full ${cols === 1 ? 'column is' : 'columns are'} shaded.`, `Each column is 10%, so ${cols} × 10% = ${p}%.`];
  return [
    `${cols} full ${cols === 1 ? 'column is' : 'columns are'} ${cols * 10}%.`,
    `${ones} more small ${ones === 1 ? 'square is' : 'squares are'} ${ones}%.`,
    `${cols * 10}% + ${ones}% = ${p}%.`,
  ];
}

function matchFraction(): Question {
  const [p, frac] = pick(FRACTIONS);
  const others = shuffle(FRACTIONS.filter(([q]) => q !== p)).slice(0, 3);
  return {
    prompt: `Which fraction is the same as ${p}%?`,
    choices: shuffle([frac, ...others.map(([, f]) => f)]).map((value) => ({ value })),
    answer: frac,
    hint: `${p}% means ${p} out of 100.`,
    explain: [
      `${p}% means ${p} out of 100, which is ${p}/100.`,
      `Divide the top and bottom by ${gcd(p, 100)} to simplify.`,
      `${p}/100 = ${frac}.`,
    ],
  };
}

/** Bar-model steps for p% of n, using halves, quarters and tenths. */
function percentOfSteps(p: number, n: number, ans: number): string[] {
  const tenth = fmt(n / 10);
  if (p === 50) return ['50% is one half.', `${n} ÷ 2 = ${ans}.`, `So 50% of ${n} = ${ans}.`];
  if (p === 25) return ['25% is one quarter.', `${n} ÷ 4 = ${ans}.`, `So 25% of ${n} = ${ans}.`];
  if (p === 75) return [`25% of ${n} is ${n} ÷ 4 = ${fmt(n / 4)}.`, `75% is 3 lots of 25%: 3 × ${fmt(n / 4)} = ${ans}.`, `So 75% of ${n} = ${ans}.`];
  if (p === 10) return ['10% means one tenth.', `${n} ÷ 10 = ${ans}.`, `So 10% of ${n} = ${ans}.`];
  if (p % 10 === 0) {
    return [`10% of ${n} is ${n} ÷ 10 = ${tenth}.`, `${p}% is ${p / 10} lots of 10%: ${p / 10} × ${tenth} = ${ans}.`, `So ${p}% of ${n} = ${ans}.`];
  }
  const five = fmt(n / 20);
  if (p === 5) return [`10% of ${n} is ${tenth}.`, `5% is half of 10%: ${tenth} ÷ 2 = ${ans}.`, `So 5% of ${n} = ${ans}.`];
  const tens = Math.floor(p / 10);
  return [
    `10% of ${n} is ${tenth}, and 5% is half of that: ${five}.`,
    `${p}% = ${tens} × 10% + 5% = ${fmt((tens * n) / 10)} + ${five}.`,
    `So ${p}% of ${n} = ${ans}.`,
  ];
}

function percentOf(level: number): Question {
  const p = level === 1 ? pick([10, 20, 25, 50, 75]) : pick([5, 15, 30, 35, 40, 45, 60, 70, 80, 90]);
  const n = amountFor(p, level === 1 ? 200 : 300);
  const ans = (p * n) / 100;
  return {
    prompt: `What is ${p}% of ${n}?`,
    visual: <BarPicture percent={p} amount={n} />,
    answer: String(ans),
    hint:
      p === 50
        ? `50% is half. What is half of ${n}?`
        : p === 25
          ? `25% is a quarter: halve ${n}, then halve again.`
          : p === 75
            ? `Find 25% (a quarter of ${n}), then take 3 of those.`
            : p % 10 === 0
              ? `Find 10% first (${n} ÷ 10 = ${n / 10}), then take ${p / 10} of those.`
              : `Find 10% (${n} ÷ 10 = ${n / 10}). Half of that is 5%. Build up to ${p}%.`,
    explain: percentOfSteps(p, n, ans),
  };
}

function whatPercent(): Question {
  const n = pick([20, 25, 50]);
  const step = 100 / n; // each item is this many percent
  const part = rand(1, n - 1);
  const p = part * step;
  return {
    prompt: `What percent of ${n} is ${part}?`,
    answer: String(p),
    hint: `${n} is the whole (100%). How many percent is each 1?`,
    explain: [`${n} is the whole, so it is 100%.`, `Each 1 is 100 ÷ ${n} = ${step}%.`, `${part} × ${step}% = ${p}%.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return Math.random() < 0.65 ? readGrid(0) : matchFraction();
  if (level === 1) return pick([() => readGrid(1), () => percentOf(1), () => percentOf(1), matchFraction])();
  return pick([() => percentOf(2), () => percentOf(2), whatPercent])();
}

export const percentages: Lesson = {
  id: 'percentages',
  title: 'Percentages',
  Thumb,
  Scene: PercentScene,
  sceneHint: 'Drag the grid or the slider · Pick an amount to find the percent of',
  learn: {
    heading: 'Percentages',
    intro: 'Per cent means “out of 100”. 25% means 25 out of every 100, which is a quarter of the whole.',
    points: [
      { icon: Percent, text: '100% is the whole thing. 50% is half.' },
      { icon: Grid3x3, text: '1% is one square out of a hundred.' },
      { icon: Divide, text: 'To find 10% of an amount, divide it by 10.' },
    ],
  },
  steps: [
    'Remember the percent is out of 100: 25% = 25/100.',
    'Find an easy piece first: 10% (divide by 10) or 50% (halve it).',
    'Build the percent you need: 30% is three lots of 10%.',
    'Check it makes sense: 50% should be half of the amount.',
  ],
  example: {
    question: 'What is 25% of 80?',
    visual: <BarPicture percent={25} amount={80} />,
    work: ['25% is the same as one quarter.', 'Split 80 into 4 equal parts: 80 ÷ 4 = 20.'],
    answer: '25% of 80 is 20.',
  },
  grownups: [
    'Shop signs are perfect practice: “30% off a $40 toy — what’s the new price?”',
    'Learn the key matches by heart: 50% = 1/2, 25% = 1/4, 10% = 1/10.',
    'The 10% trick (divide by 10) unlocks almost all mental percentage questions.',
    'Battery and download bars are everyday percentage bar models.',
  ],
  makeQuestion,
};
