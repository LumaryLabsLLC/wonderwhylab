import { useState } from 'react';
import { Equal, Hand, PieChart, Scale } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { numberWord } from '../../lib/words';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { ChocolateBar, Frac, FractionPicture, FRACTION_WORDS, Pizza } from './visuals/Fractions';

const PIZZA = { cx: 240, cy: 270, r: 160 };
const BAR = { x: 80, y: 486, w: 610, h: 84 };

function fractionWords(k: number, n: number) {
  const [one, many] = FRACTION_WORDS[n] ?? [`${n}th`, `${n}ths`];
  if (k === n) return 'one whole';
  return `${numberWord(k)} ${k === 1 ? one : many}`;
}

function FractionScene() {
  const [n, setN] = useState(4);
  const [shaded, setShaded] = useState<boolean[]>([true, true, true, false]);
  const k = shaded.filter(Boolean).length;

  const toggle = (i: number) => {
    const next = [...shaded];
    next[i] = !next[i];
    setShaded(next);
    play('tap');
  };

  const setParts = (m: number) => {
    setN(m);
    setShaded(Array.from({ length: m }, (_, i) => i < Math.min(k, m)));
    play('pop');
  };

  const fill = (on: boolean) => {
    setShaded(Array.from({ length: n }, () => on));
    play('pop');
  };

  const firstShaded = shaded.indexOf(true);
  const midAngle = (i: number) => -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / n;

  return (
    <SceneSvg label={`${k} out of ${n} equal parts shaded`}>
      <Pizza cx={PIZZA.cx} cy={PIZZA.cy} r={PIZZA.r} n={n} shaded={shaded} onTap={toggle} />
      <ChocolateBar x={BAR.x} y={BAR.y} w={BAR.w} h={BAR.h} n={n} shaded={shaded} onTap={toggle} />

      {/* Fraction readout */}
      <rect x={718} y={64} width={252} height={200} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={718} y={64} width={252} height={200} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={800} y={118} textAnchor="middle" dominantBaseline="central" fontSize={58} fontWeight={700} fill={C.red} className="num">
        {k}
      </text>
      <line x1={762} y1={160} x2={838} y2={160} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <text x={800} y={204} textAnchor="middle" dominantBaseline="central" fontSize={58} fontWeight={700} fill={C.ink} className="num">
        {n}
      </text>
      <text x={862} y={110} fontSize={16} fill={C.muted}>
        <tspan x={862}>parts</tspan>
        <tspan x={862} dy={19}>shaded</tspan>
      </text>
      <text x={862} y={196} fontSize={16} fill={C.muted}>
        <tspan x={862}>equal</tspan>
        <tspan x={862} dy={19}>parts</tspan>
      </text>
      <text x={844} y={296} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink}>
        {fractionWords(k, n)}
      </text>

      <text x={720} y={344} fontSize={16} fill={C.muted} className="caps">Equal parts</text>
      <SvgButton x={718} y={354} w={60} h={52} label="−" title="Fewer parts" onClick={() => setParts(n - 1)} disabled={n <= 2} />
      <text x={844} y={381} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {n}
      </text>
      <SvgButton x={910} y={354} w={60} h={52} label="+" title="More parts" onClick={() => setParts(n + 1)} disabled={n >= 8} color={C.yellow} />
      <SvgButton x={718} y={440} w={120} h={50} fontSize={18} label="Fill all" onClick={() => fill(true)} />
      <SvgButton x={850} y={440} w={120} h={50} fontSize={18} label="Clear" onClick={() => fill(false)} />

      <Callout
        at={[PIZZA.cx + Math.cos(-Math.PI / 2 + (Math.PI * 2) / n) * PIZZA.r * 0.6, PIZZA.cy + Math.sin(-Math.PI / 2 + (Math.PI * 2) / n) * PIZZA.r * 0.6]}
        box={[452, 70]}
        w={232}
        icon={Equal}
        title="Equal parts"
        text="Every slice is the same size. The bottom number counts them."
      />
      {firstShaded >= 0 && (
        <Callout
          at={[PIZZA.cx + Math.cos(midAngle(firstShaded)) * PIZZA.r * 0.45, PIZZA.cy + Math.sin(midAngle(firstShaded)) * PIZZA.r * 0.45]}
          box={[452, 214]}
          w={232}
          icon={Hand}
          title="Shaded parts"
          text="Tap a slice to shade it. The top number counts these."
        />
      )}
      <Callout at={[BAR.x + BAR.w - 20, BAR.y]} box={[452, 356]} w={232} icon={PieChart} title="Same fraction" text="The bar is cut the same way, so it shows the same fraction." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Pizza cx={40} cy={40} r={28} n={4} shaded={[true, true, true, false]} />
      <text x={92} y={30} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>3</text>
      <line x1={82} y1={38} x2={102} y2={38} stroke={C.ink} strokeWidth={2.5} />
      <text x={92} y={56} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>4</text>
    </svg>
  );
}

const fracChoice = (k: number, n: number): Choice => ({ value: `${k}/${n}`, name: `${k} out of ${n}`, label: <Frac n={k} d={n} /> });

/** Distractor fractions that are not equal in value to k/n. */
function fractionChoices(k: number, n: number, count: number): Choice[] {
  const candidates: [number, number][] = [
    [n - k, n],
    [k, n + 1],
    [k + 1, n],
    [k - 1, n],
    [k, n - 1],
    [n, k],
    [k + 1, n + 1],
  ];
  const seen = new Set([`${k}/${n}`]);
  const out: Choice[] = [fracChoice(k, n)];
  for (const [a, b] of shuffle(candidates)) {
    if (out.length >= count) break;
    if (a < 1 || b < 2 || a > b) continue;
    if (a * n === k * b) continue; // equal value, e.g. 2/4 vs 1/2
    const key = `${a}/${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fracChoice(a, b));
  }
  return shuffle(out);
}

function makeQuestion(level: number): Question {
  if (level < 2 || Math.random() < 0.4) {
    const n = level === 0 ? rand(2, 4) : rand(2, 8);
    const k = rand(1, n - 1);
    const model = pick<'pizza' | 'bar'>(['pizza', 'bar']);
    return {
      prompt: 'What fraction is shaded?',
      visual: <FractionPicture n={n} k={k} model={model} />,
      choices: fractionChoices(k, n, level === 0 ? 3 : 4),
      answer: `${k}/${n}`,
      hint: `Count all the equal parts for the bottom number, then count the shaded ones for the top.`,
      explain: [
        `There are ${n} equal parts, so the bottom number is ${n}.`,
        `${k} ${k === 1 ? 'part is' : 'parts are'} shaded, so the top number is ${k}.`,
        `The fraction is ${k}/${n}.`,
      ],
    };
  }
  const kind = rand(0, 2);
  if (kind === 0) {
    const [a, b] = shuffle([2, 3, 4, 5, 6, 8]).slice(0, 2);
    const big = Math.min(a, b);
    return {
      prompt: 'Which is bigger?',
      speak: `Which is bigger: one ${FRACTION_WORDS[a][0]} or one ${FRACTION_WORDS[b][0]}?`,
      choices: [fracChoice(1, a), fracChoice(1, b)],
      answer: `1/${big}`,
      hint: 'The more pieces you cut something into, the smaller each piece is.',
      explain: [
        `1/${a} is 1 of ${a} equal pieces. 1/${b} is 1 of ${b} equal pieces.`,
        'Fewer pieces means each piece is bigger.',
        `${big} pieces is fewer, so 1/${big} is bigger.`,
      ],
    };
  }
  if (kind === 1) {
    const n = rand(3, 8);
    const k = rand(1, n - 1);
    return {
      prompt: 'What fraction is NOT shaded?',
      visual: <FractionPicture n={n} k={k} model={pick<'pizza' | 'bar'>(['pizza', 'bar'])} />,
      choices: fractionChoices(n - k, n, 4),
      answer: `${n - k}/${n}`,
      hint: 'Count the plain parts this time.',
      explain: [`There are ${n} equal parts.`, `${k} ${k === 1 ? 'is' : 'are'} shaded, so ${n} − ${k} = ${n - k} ${n - k === 1 ? 'is' : 'are'} not.`, `The part not shaded is ${n - k}/${n}.`],
    };
  }
  const [a, b] = pick<[number, number]>([
    [1, 2],
    [1, 3],
    [1, 4],
    [3, 4],
    [2, 3],
  ]);
  const m = b === 2 ? pick([2, 3, 4]) : 2;
  return {
    prompt: `${a}/${b} = ?/${b * m}`,
    speak: `${a} ${a === 1 ? FRACTION_WORDS[b][0] : FRACTION_WORDS[b][1]} is the same as how many ${FRACTION_WORDS[b * m]?.[1] ?? `${b * m}ths`}?`,
    visual: <FractionPicture n={b} k={a} model="bar" />,
    choices: numberChoices(a * m, { min: 1, max: b * m, spread: 2 }).map((value) => ({ value })),
    answer: String(a * m),
    hint: `Each ${FRACTION_WORDS[b][0]} is cut into ${m} smaller pieces.`,
    explain: [
      `Cut every ${FRACTION_WORDS[b][0]} into ${m} smaller pieces: ${b} × ${m} = ${b * m} pieces in all.`,
      `The ${a} shaded ${a === 1 ? FRACTION_WORDS[b][0] : FRACTION_WORDS[b][1]} become ${a} × ${m} = ${a * m} small pieces.`,
      `So ${a}/${b} = ${a * m}/${b * m}.`,
    ],
  };
}

export const fractions: Lesson = {
  id: 'fractions',
  title: 'Fractions',
  Thumb,
  Scene: FractionScene,
  sceneHint: 'Tap slices to shade them · Change the number of parts',
  learn: {
    heading: 'Fractions',
    intro: 'A fraction is part of a whole. Cut a pizza into 4 equal slices and take 3, and you have 3/4 (three quarters) of the pizza.',
    points: [
      { icon: Equal, text: 'The parts must be equal in size.' },
      { icon: PieChart, text: 'Bottom number: how many equal parts in all.' },
      { icon: Hand, text: 'Top number: how many parts we have.' },
      { icon: Scale, text: 'More parts means smaller pieces: 1/8 < 1/2.' },
    ],
  },
  steps: [
    'Check that the whole is cut into equal parts.',
    'Count all the parts. Write that number on the bottom.',
    'Count the shaded parts. Write that number on top.',
    'Draw a line between them and read it: “3 out of 4”, or three quarters.',
  ],
  example: {
    question: 'What fraction of the bar is chocolate?',
    visual: <FractionPicture n={5} k={2} model="bar" />,
    work: ['The bar has 5 equal pieces, so the bottom number is 5.', '2 pieces are chocolate, so the top number is 2.'],
    answer: '2/5 (two fifths) is chocolate',
  },
  grownups: [
    'Fold paper strips into halves, quarters and eighths and compare them side by side.',
    'Always stress “equal parts”: a pizza cut into one big and one tiny slice is not in halves.',
    'Children often think 1/8 is bigger than 1/4 because 8 > 4. Sharing a real cake with 8 people fixes that fast.',
    'Say fractions in words (“three quarters”) as well as numbers.',
  ],
  makeQuestion,
};
