import { useState } from 'react';
import { Combine, Hash, Plus, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { choices } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { TenFrame } from '../../visuals/TenFrame';
import { Thing, ThingRows, thingName } from '../../visuals/Thing';
import type { ThingKind } from '../../visuals/Thing';
import { BasketBack, BasketFront } from './visuals/Basket';
import { countList } from './explain';

const SIZE = 44;
const STEP = 50;
const TOP_Y = 250;
const LEFT = { cx: 190, w: 260 };
const RIGHT = { cx: 570, w: 260 };
const BOTTOM = { cx: 380, cy: 520, w: 560 };

/** x of the i-th object when `n` objects sit in one row centred on cx. */
const rowX = (cx: number, n: number, i: number) => cx - (n * STEP - (STEP - SIZE)) / 2 + i * STEP + SIZE / 2;

function AddScene() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [joined, setJoined] = useState(false);

  const change = (which: 'a' | 'b', v: number) => {
    (which === 'a' ? setA : setB)(Math.max(0, Math.min(5, v)));
    setJoined(false);
    play('pop');
  };

  const join = () => {
    if (joined) {
      setJoined(false);
      play('whoosh');
      return;
    }
    setJoined(true);
    play('pop');
    speak(`${a} and ${b} makes ${a + b}!`);
  };

  const group = (cx: number, n: number, color: string) =>
    Array.from({ length: n }, (_, i) => <Thing key={i} kind="apple" color={color} x={rowX(cx, n, i)} y={TOP_Y - 14} size={SIZE} faded={joined} />);

  return (
    <SceneSvg label={`${a} red apples and ${b} green apples${joined ? ` make ${a + b}` : ''}`}>
      {/* Two small baskets */}
      <BasketBack cx={LEFT.cx} cy={TOP_Y} w={LEFT.w} />
      {group(LEFT.cx, a, C.red)}
      <BasketFront cx={LEFT.cx} cy={TOP_Y} w={LEFT.w} />

      <BasketBack cx={RIGHT.cx} cy={TOP_Y} w={RIGHT.w} />
      {group(RIGHT.cx, b, C.green)}
      <BasketFront cx={RIGHT.cx} cy={TOP_Y} w={RIGHT.w} />

      <text x={380} y={262} textAnchor="middle" dominantBaseline="central" fontSize={72} fontWeight={700} fill={C.ink}>
        +
      </text>

      {/* Arrows into the big basket */}
      <g fill="none" stroke={joined ? C.teal : C.line} strokeWidth={4} strokeLinecap="round" strokeDasharray={joined ? undefined : '8 8'}>
        <path d="M230,340 Q250,400 320,432" />
        <path d="M530,340 Q510,400 440,432" />
      </g>
      <path d="M320,432 l-16,-2 l8,-12 z M440,432 l16,-2 l-8,-12 z" fill={joined ? C.teal : C.line} />

      {/* Big basket */}
      <BasketBack cx={BOTTOM.cx} cy={BOTTOM.cy} w={BOTTOM.w} />
      {joined ? (
        Array.from({ length: a + b }, (_, i) => (
          <g key={i} className="bounce-in" style={{ transformOrigin: `${rowX(BOTTOM.cx, a + b, i)}px ${BOTTOM.cy - 14}px`, animationDelay: `${i * 0.07}s` }}>
            <Thing kind="apple" color={i < a ? C.red : C.green} x={rowX(BOTTOM.cx, a + b, i)} y={BOTTOM.cy - 14} size={SIZE} />
          </g>
        ))
      ) : (
        <text x={BOTTOM.cx} y={BOTTOM.cy - 6} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.card}>
          ?
        </text>
      )}
      <BasketFront cx={BOTTOM.cx} cy={BOTTOM.cy} w={BOTTOM.w} />

      {/* Controls */}
      {[
        { label: 'Red apples', v: a, which: 'a' as const, y: 120, color: C.red },
        { label: 'Green apples', v: b, which: 'b' as const, y: 222, color: C.green },
      ].map((row) => (
        <g key={row.which}>
          <circle cx={728} cy={row.y} r={8} fill={row.color} stroke={C.ink} strokeWidth={1.5} />
          <text x={744} y={row.y} dominantBaseline="central" fontSize={16} fill={C.ink2} className="caps">
            {row.label}
          </text>
          <SvgButton x={720} y={row.y + 16} w={60} h={52} label="−" title={`One less ${row.label.toLowerCase()}`} onClick={() => change(row.which, row.v - 1)} disabled={row.v <= 0} />
          <text x={835} y={row.y + 44} textAnchor="middle" dominantBaseline="central" fontSize={36} fontWeight={700} fill={C.ink} className="num">
            {row.v}
          </text>
          <SvgButton x={890} y={row.y + 16} w={60} h={52} label="+" title={`One more ${row.label.toLowerCase()}`} onClick={() => change(row.which, row.v + 1)} disabled={row.v >= 5} color={C.yellow} />
        </g>
      ))}
      <SvgButton x={720} y={322} w={230} h={56} fontSize={19} label={joined ? 'Split up' : 'Put together'} onClick={join} color={joined ? C.card : C.teal} textColor={joined ? C.ink : C.white} />

      <rect x={724} y={410} width={230} height={100} rx={14} fill={shade(C.paper, -0.12)} />
      <rect x={720} y={404} width={230} height={100} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={835} y={454} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={700} className="num" fill={C.ink}>
        <tspan fill={C.red}>{a}</tspan> + <tspan fill={shade(C.green, -0.2)}>{b}</tspan> = <tspan fill={joined ? C.teal : C.muted}>{joined ? a + b : '?'}</tspan>
      </text>

      <Callout at={[380, 226]} box={[250, 28]} w={260} icon={Plus} title="Adding is joining" text="Plus means put the groups together." />
      <Callout at={[BOTTOM.cx + BOTTOM.w / 2 - 10, BOTTOM.cy + 10]} box={[720, 548]} w={230} icon={Hash} title="Count them all" text="Count every apple in the big basket." />
    </SceneSvg>
  );
}

/** Two groups with a plus sign between them, for question cards. */
function AddPicture({ kind, a, b }: { kind: ThingKind; a: number; b: number }) {
  const size = 44;
  const gap = 8;
  const step = size + gap;
  const cols = (n: number) => Math.min(5, Math.max(1, n));
  const rows = (n: number) => Math.max(1, Math.ceil(n / 5));
  const wa = cols(a) * step - gap;
  const wb = cols(b) * step - gap;
  const h = Math.max(rows(a), rows(b)) * step - gap;
  const plus = 56;
  return (
    <svg viewBox={`-8 -8 ${wa + plus + wb + 16} ${h + 16}`} role="img" aria-label={`${a} ${thingName(kind, a)} and ${b} more`}>
      <ThingRows kind={kind} count={a} size={size} gap={gap} />
      <text x={wa + plus / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={700} fill={C.ink}>
        +
      </text>
      <ThingRows kind={kind} count={b} x={wa + plus} size={size} gap={gap} />
    </svg>
  );
}

function TwoColorFrame({ a, b }: { a: number; b: number }) {
  return (
    <svg viewBox="-4 -4 212 92" role="img" aria-label={`${a} red and ${b} blue counters`}>
      <TenFrame cell={40} a={a} b={b} colorA={C.red} colorB={C.blue} />
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={68} rx={48} ry={7} fill={C.ink} opacity={0.12} />
      <Thing kind="apple" x={18} y={42} size={24} />
      <Thing kind="apple" x={40} y={42} size={24} />
      <text x={60} y={44} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>+</text>
      <Thing kind="apple" color={C.green} x={80} y={42} size={24} />
      <text x={104} y={44} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>=3</text>
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = pick<ThingKind>(['apple', 'star', 'ball', 'fish', 'cookie', 'flower', 'bug', 'duck']);
  const max = [5, 8, 10][Math.min(level, 2)];
  const a = rand(1, max - 1);
  const b = rand(1, Math.min(5, max - a));
  const sum = a + b;
  const opts = choices(numberChoices(sum, { count: level === 0 ? 3 : 4, min: 1, max: 10 }));

  if (level === 0) {
    return {
      prompt: `${a} ${thingName(kind, a)} and ${b} more. How many in all?`,
      visual: <AddPicture kind={kind} a={a} b={b} />,
      choices: opts,
      answer: String(sum),
      hint: 'Count all of them together, starting from 1.',
      explain: [
        `The first group has ${a}. The second group has ${b}.`,
        `Put them together and count them all: ${countList(1, sum)}.`,
        `${a} and ${b} more makes ${sum}.`,
      ],
    };
  }
  return {
    prompt: `${a} + ${b} = ?`,
    visual: level === 1 ? <AddPicture kind={kind} a={a} b={b} /> : <TwoColorFrame a={a} b={b} />,
    choices: opts,
    answer: String(sum),
    hint: 'Start with the bigger number and count on.',
    explain: [
      `Start at the bigger number, ${Math.max(a, b)}.`,
      `Count on ${Math.min(a, b)} more: ${countList(Math.max(a, b) + 1, sum)}.`,
      `${a} + ${b} = ${sum}.`,
    ],
  };
}

export const firstAdding: Lesson = {
  id: 'first-adding',
  title: 'Adding Together',
  Thumb,
  Scene: AddScene,
  sceneHint: 'Change the baskets · Tap Put together',
  learn: {
    heading: 'Adding together',
    intro: 'Adding means putting groups together to make one bigger group. Then we count how many there are in all!',
    points: [
      { icon: Combine, text: 'Put the two groups together.' },
      { icon: Hash, text: 'Count them all to find how many.' },
      { icon: Sparkles, text: 'The + sign means “add”.' },
    ],
  },
  steps: [
    'Count the first group.',
    'Count the second group.',
    'Push them together into one group.',
    'Count them all. That number is the answer!',
  ],
  example: {
    question: '3 apples and 2 more apples. How many in all?',
    visual: <AddPicture kind="apple" a={3} b={2} />,
    work: ['The first group has 3.', 'The second group has 2.', 'Put them together and count: 1, 2, 3, 4, 5.'],
    answer: '3 + 2 = 5 apples.',
  },
  grownups: [
    'Act it out with real things: 2 spoons on the table, add 1 more — how many now?',
    'Once counting all is easy, try “counting on”: start at 3 and count 4, 5.',
    'Use words before symbols: “3 and 2 more makes 5” before writing 3 + 2 = 5.',
    'Fingers are a brilliant tool at this age. Let children use them!',
  ],
  makeQuestion,
};
