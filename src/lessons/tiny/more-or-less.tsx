import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Equal, Eye, Smile } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { choices } from '../types';
import { C } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { ThingRows, thingName } from '../../visuals/Thing';
import type { ThingKind } from '../../visuals/Thing';
import { Croc } from './visuals/Croc';
import { GroupPicture } from './visuals/GroupPicture';
import { countList } from './explain';

const MAT = { w: 280, h: 150, y: 150 };
const LEFT_X = 60;
const RIGHT_X = 660;
const CROC = { x: 500, y: 235, cx: 56 };

function sentence(a: number, b: number) {
  if (a === b) return `${a} and ${b} are the same`;
  return a > b ? `${a} is more than ${b}` : `${a} is less than ${b}`;
}

const sign = (a: number, b: number) => (a === b ? '=' : a > b ? '>' : '<');

function Mat({ x, count }: { x: number; count: number }) {
  const size = 46;
  const rows = count > 5 ? 2 : 1;
  const top = MAT.y + (MAT.h - (rows * size + (rows - 1) * 8)) / 2;
  const cols = Math.min(5, count);
  const left = x + (MAT.w - (cols * (size + 8) - 8)) / 2;
  return (
    <g>
      <rect x={x + 4} y={MAT.y + 6} width={MAT.w} height={MAT.h} rx={20} fill={C.ink} opacity={0.12} />
      <rect x={x} y={MAT.y} width={MAT.w} height={MAT.h} rx={20} fill="#d6ebf1" stroke={C.ink} strokeWidth={2} />
      <path d={`M${x + 30},${MAT.y + 24} q14,-8 28,0 t28,0`} fill="none" stroke="#a9d1de" strokeWidth={3} strokeLinecap="round" />
      <path d={`M${x + MAT.w - 90},${MAT.y + MAT.h - 20} q14,-8 28,0 t28,0`} fill="none" stroke="#a9d1de" strokeWidth={3} strokeLinecap="round" />
      <ThingRows kind="fish" count={count} x={left} y={top} size={size} gap={8} />
    </g>
  );
}

function CompareScene() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(7);
  const [chomp, setChomp] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = (side: 'a' | 'b', v: number) => {
    (side === 'a' ? setA : setB)(Math.max(0, Math.min(10, v)));
    play('pop');
  };

  const tapCroc = () => {
    setChomp(true);
    play('pop');
    speak(`${sentence(a, b)}.`);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setChomp(false), 280);
  };

  const facing: 1 | -1 = b >= a ? 1 : -1;
  const open = chomp || a === b ? 3 : 24;
  const mouth: [number, number] = [CROC.x + facing * (120 - CROC.cx), CROC.y];

  return (
    <SceneSvg label={sentence(a, b)}>
      <Mat x={LEFT_X} count={a} />
      <Mat x={RIGHT_X} count={b} />

      <g transform={`translate(${CROC.x} ${CROC.y})`} onClick={tapCroc} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="Crocodile: tap to hear the answer">
        <ellipse cx={0} cy={112} rx={110} ry={14} fill={C.ink} opacity={0.12} />
        <Croc open={open} facing={facing} cx={CROC.cx} />
      </g>

      <NumberCard x={130} y={330} w={140} h={110} value={a} />
      <NumberCard x={730} y={330} w={140} h={110} value={b} />
      <SvgButton x={130} y={462} label="−" title="One less on the left" onClick={() => change('a', a - 1)} disabled={a <= 0} />
      <SvgButton x={206} y={462} label="+" title="One more on the left" onClick={() => change('a', a + 1)} disabled={a >= 10} color={C.yellow} />
      <SvgButton x={730} y={462} label="−" title="One less on the right" onClick={() => change('b', b - 1)} disabled={b <= 0} />
      <SvgButton x={806} y={462} label="+" title="One more on the right" onClick={() => change('b', b + 1)} disabled={b >= 10} color={C.yellow} />

      <text x={500} y={404} textAnchor="middle" fontSize={24} fontWeight={600} fill={C.ink}>
        {sentence(a, b)}
      </text>
      <text x={500} y={478} textAnchor="middle" fontSize={56} fontWeight={700} fill={C.ink} className="num">
        {a} <tspan fill={C.teal}>{sign(a, b)}</tspan> {b}
      </text>

      <Callout at={[200, MAT.y]} box={[40, 26]} w={250} icon={Eye} title="Count each side" text="The group with the bigger number has more." />
      <Callout at={mouth} box={[360, 26]} w={280} icon={Smile} title="Hungry crocodile" text="Its mouth opens toward the bigger group. It wants more!" />
      <Callout at={[500, 492]} box={[330, 546]} w={340} icon={a === b ? Equal : ArrowLeftRight} title={a === b ? 'The same' : 'Point to the smaller'} text={a === b ? 'Same amount on both sides? Use the equals sign =' : 'The pointy end of the sign aims at the smaller number.'} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={68} rx={48} ry={7} fill={C.ink} opacity={0.12} />
      <g transform="translate(60 40) scale(0.3)">
        <Croc open={24} cx={56} />
      </g>
      {[0, 1].map((i) => (
        <circle key={i} cx={10 + i * 10} cy={40} r={4} fill={C.orange} stroke={C.ink} strokeWidth={1} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={96 + (i % 2) * 10} cy={34 + Math.floor(i / 2) * 11} r={4} fill={C.orange} stroke={C.ink} strokeWidth={1} />
      ))}
    </svg>
  );
}

/** Two groups side by side, for the example tab. */
function TwoGroups({ kind, a, b }: { kind: ThingKind; a: number; b: number }) {
  const size = 44;
  const step = size + 8;
  const w = (n: number) => Math.max(1, Math.min(5, n)) * step - 8;
  const h = (Math.max(a > 5 ? 2 : 1, b > 5 ? 2 : 1)) * step - 8;
  const gap = 60;
  return (
    <svg viewBox={`-8 -8 ${w(a) + gap + w(b) + 16} ${h + 16}`} role="img" aria-label={`${a} and ${b} ${thingName(kind, 2)}`}>
      <ThingRows kind={kind} count={a} size={size} gap={8} />
      <line x1={w(a) + gap / 2} y1={-4} x2={w(a) + gap / 2} y2={h + 4} stroke={C.line} strokeWidth={3} strokeDasharray="6 6" />
      <ThingRows kind={kind} count={b} x={w(a) + gap} size={size} gap={8} />
    </svg>
  );
}

const groupChoice = (kind: ThingKind, n: number, value: string): Choice => ({
  value,
  name: `${n} ${thingName(kind, n)}`,
  label: <GroupPicture kind={kind} count={n} />,
});

const SIGNS: Choice[] = [
  { value: '<', name: 'less than', label: '<' },
  { value: '>', name: 'more than', label: '>' },
  { value: '=', name: 'the same as', label: '=' },
];

function makeQuestion(level: number): Question {
  const kind = pick<ThingKind>(['apple', 'star', 'ball', 'fish', 'cookie', 'flower', 'bug', 'duck']);

  if (level === 0) {
    let a = rand(1, 8);
    let b = rand(1, 8);
    while (Math.abs(a - b) < 3) {
      a = rand(1, 8);
      b = rand(1, 8);
    }
    return {
      prompt: `Which group has more ${thingName(kind, 2)}?`,
      choices: [groupChoice(kind, a, 'a'), groupChoice(kind, b, 'b')],
      answer: a > b ? 'a' : 'b',
      hint: 'Count each group. The bigger number has more.',
      explain: [
        `Count the first group: ${countList(1, a)}. That is ${a}.`,
        `Count the second group: ${countList(1, b)}. That is ${b}.`,
        `${Math.max(a, b)} is more than ${Math.min(a, b)}, so the group of ${Math.max(a, b)} ${thingName(kind, Math.max(a, b))} has more.`,
      ],
    };
  }

  if (level === 1) {
    const same = Math.random() < 0.2;
    const a = rand(1, 9);
    let b = same ? a : rand(1, 10);
    while (!same && b === a) b = rand(1, 10);
    const askMore = Math.random() < 0.5;
    const answer = a === b ? 'same' : (askMore ? a > b : a < b) ? 'a' : 'b';
    return {
      prompt: `Which group has ${askMore ? 'more' : 'fewer'}?`,
      choices: [groupChoice(kind, a, 'a'), groupChoice(kind, b, 'b'), { value: 'same', label: 'Same', name: 'they are the same' }],
      answer,
      hint: askMore ? 'Count both groups. More means the bigger number.' : 'Count both groups. Fewer means the smaller number.',
      explain: [
        `Count the first group: ${a}. Count the second group: ${b}.`,
        a === b
          ? `${a} and ${b} are the same number.`
          : `${Math.max(a, b)} is more than ${Math.min(a, b)}.`,
        a === b
          ? 'So they are the same.'
          : askMore
            ? `So the group of ${Math.max(a, b)} ${thingName(kind, Math.max(a, b))} has more.`
            : `So the group of ${Math.min(a, b)} ${thingName(kind, Math.min(a, b))} has fewer.`,
      ],
    };
  }

  // Level 2: comparison signs, or which number is less/more.
  const a = rand(0, 10);
  let b = Math.random() < 0.2 ? a : rand(0, 10);
  if (Math.random() < 0.5) {
    return {
      prompt: `Which sign fits?  ${a} ? ${b}`,
      speak: `Which sign goes between ${a} and ${b}?`,
      visual: <SignPicture a={a} b={b} />,
      choices: shuffle(SIGNS),
      answer: sign(a, b),
      hint: 'The crocodile’s mouth opens toward the bigger number.',
      explain:
        a === b
          ? [`${a} and ${b} are the same.`, `Same numbers get the equals sign: ${a} = ${b}.`]
          : [
              `${Math.max(a, b)} is bigger than ${Math.min(a, b)}.`,
              'The hungry mouth opens toward the bigger number.',
              `So it is ${a} ${sign(a, b)} ${b}.`,
            ],
    };
  }
  while (b === a) b = rand(0, 10);
  const askLess = Math.random() < 0.5;
  return {
    prompt: `Which number is ${askLess ? 'less' : 'more'}?`,
    choices: choices(shuffle([a, b])),
    answer: String(askLess ? Math.min(a, b) : Math.max(a, b)),
    hint: 'Count up from zero. The number you reach later is more.',
    explain: [
      `Count up: ${countList(0, Math.max(a, b))}.`,
      `You reach ${Math.min(a, b)} first, then ${Math.max(a, b)}.`,
      askLess ? `So ${Math.min(a, b)} is less.` : `So ${Math.max(a, b)} is more.`,
    ],
  };
}

function SignPicture({ a, b }: { a: number; b: number }) {
  return (
    <svg viewBox="0 0 360 110" role="img" aria-label={`${a} and ${b}`}>
      <text x={70} y={58} textAnchor="middle" dominantBaseline="central" fontSize={64} fontWeight={700} fill={C.ink}>
        {a}
      </text>
      <rect x={150} y={18} width={60} height={80} rx={12} fill={C.card} stroke={C.teal} strokeWidth={3} strokeDasharray="7 6" />
      <text x={180} y={60} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={700} fill={C.teal}>
        ?
      </text>
      <text x={290} y={58} textAnchor="middle" dominantBaseline="central" fontSize={64} fontWeight={700} fill={C.ink}>
        {b}
      </text>
    </svg>
  );
}

export const moreOrLess: Lesson = {
  id: 'more-or-less',
  title: 'More or Less',
  Thumb,
  Scene: CompareScene,
  sceneHint: 'Change each side with + and − · Tap the crocodile',
  learn: {
    heading: 'More, less or the same',
    intro: 'When we compare two groups, we count each one. The bigger number has more. The smaller number has less.',
    points: [
      { icon: Eye, text: 'Count both groups first.' },
      { icon: Smile, text: 'The crocodile always eats the bigger group.' },
      { icon: Equal, text: 'If they match, they are the same.' },
    ],
  },
  steps: [
    'Count the first group.',
    'Count the second group.',
    'Which number is bigger? That group has more.',
    'The other group has less. If the numbers match, they are the same.',
  ],
  example: {
    question: 'Which has more: 4 fish or 6 fish?',
    visual: <TwoGroups kind="fish" a={4} b={6} />,
    work: ['Count the first group: 4.', 'Count the second group: 6.', '6 is bigger than 4, so the crocodile chomps the 6!'],
    answer: '6 fish is more. We write 4 < 6.',
  },
  grownups: [
    'Use the words “more”, “fewer” and “the same” at snack time: who has more grapes?',
    'Lining two groups up one-to-one makes comparing easy without counting.',
    'Children often think a spread-out group has more. Rearranging the same objects shows the number doesn’t change.',
    'The < and > signs are an extra for older 5-year-olds. The crocodile story is a fun way in, but the words matter most.',
  ],
  makeQuestion,
};
