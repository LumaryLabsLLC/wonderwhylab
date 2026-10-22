import { useState } from 'react';
import { Hash, HeartHandshake, UserRound, Users } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { Thing, thingName } from '../../visuals/Thing';
import { PairsPicture } from './visuals/Pairs';

const PAIR = { x: 120, y: 214, dx: 62, dy: 74 };
const STRIP = { x: 100, y: 506, cell: 40 };

const paired = (i: number): [number, number] => [PAIR.x + Math.floor(i / 2) * PAIR.dx, PAIR.y + (i % 2) * PAIR.dy];
/** Fixed "messy" spots so the jumble looks the same every time. */
const messy = (i: number): [number, number] => [110 + ((i * 137) % 560), 176 + ((i * 89 + (i % 3) * 23) % 150)];

function OddEvenScene() {
  const [n, setN] = useState(7);
  const [tidy, setTidy] = useState(true);
  const even = n % 2 === 0;
  const pairs = Math.floor(n / 2);

  const change = (v: number) => {
    const c = Math.max(1, Math.min(20, v));
    if (c === n) return;
    setN(c);
    play('pop');
  };

  const last = paired(n - 1);
  const lastPair = paired(Math.max(0, pairs * 2 - 1));

  return (
    <SceneSvg label={`${n} ducks: ${even ? 'even' : 'odd'}`}>
      {/* Partner boxes */}
      {tidy &&
        Array.from({ length: pairs }, (_, p) => (
          <rect
            key={p}
            className="fade-up"
            x={PAIR.x + p * PAIR.dx - 28}
            y={PAIR.y - 36}
            width={56}
            height={PAIR.dy + 70}
            rx={18}
            fill={shade(C.teal, 0.82)}
            stroke={C.teal}
            strokeWidth={2.5}
            strokeDasharray="6 5"
          />
        ))}
      {tidy && !even && (
        <g className="pop-in" style={{ transformOrigin: `${last[0]}px ${last[1]}px` }}>
          <circle cx={last[0]} cy={last[1]} r={36} fill={shade(C.orange, 0.75)} stroke={C.orange} strokeWidth={3} strokeDasharray="6 5" />
        </g>
      )}

      {Array.from({ length: n }, (_, i) => {
        const [x, y] = tidy ? paired(i) : messy(i);
        return (
          <g key={i} style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.6s cubic-bezier(.3,1.3,.5,1)' }}>
            <Thing kind="duck" size={50} />
          </g>
        );
      })}

      {/* Readout */}
      <NumberCard x={760} y={110} w={170} h={140} value={n} />
      <g>
        <rect x={760} y={270} width={170} height={56} rx={14} fill={even ? C.green : C.orange} stroke={C.ink} strokeWidth={2.5} />
        <text x={845} y={299} textAnchor="middle" dominantBaseline="central" fontSize={26} fill={C.white} className="caps">
          {even ? 'Even' : 'Odd'}
        </text>
      </g>
      <SvgButton x={760} y={350} w={78} label="−" title="One less" onClick={() => change(n - 1)} disabled={n <= 1} />
      <SvgButton x={852} y={350} w={78} label="+" title="One more" onClick={() => change(n + 1)} disabled={n >= 20} color={C.yellow} />
      <SvgButton
        x={760}
        y={426}
        w={170}
        h={56}
        fontSize={19}
        label={tidy ? 'Mix them up' : 'Pair them up'}
        color={tidy ? C.card : C.teal}
        textColor={tidy ? C.ink : C.white}
        onClick={() => {
          setTidy(!tidy);
          play('whoosh');
          if (!tidy) speak(even ? `${n} is even. Everyone has a partner!` : `${n} is odd. One is left over!`);
        }}
      />

      {/* Number strip */}
      {Array.from({ length: 20 }, (_, i) => {
        const v = i + 1;
        const x = STRIP.x + i * STRIP.cell;
        const ev = v % 2 === 0;
        return (
          <g key={v} onClick={() => change(v)} style={{ cursor: 'pointer' }} data-nopan>
            <rect
              x={x}
              y={STRIP.y}
              width={STRIP.cell}
              height={STRIP.cell + 8}
              fill={ev ? shade(C.green, 0.7) : shade(C.orange, 0.72)}
              stroke={C.ink}
              strokeWidth={v === n ? 3 : 1.2}
            />
            <text x={x + STRIP.cell / 2} y={STRIP.y + 25} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={v === n ? 700 : 500} fill={C.ink} className="num">
              {v}
            </text>
          </g>
        );
      })}
      <rect x={STRIP.x + (n - 1) * STRIP.cell} y={STRIP.y} width={STRIP.cell} height={STRIP.cell + 8} fill="none" stroke={C.ink} strokeWidth={3.5} rx={3} />

      {pairs > 0 && tidy && (
        <Callout at={[PAIR.x, PAIR.y - 36]} box={[60, 30]} w={250} icon={Users} title="Partners" text="Line them up in twos. Each pair is a team." />
      )}
      {tidy ? (
        even ? (
          <Callout at={[lastPair[0] + 28, lastPair[1]]} box={[420, 30]} w={260} icon={HeartHandshake} title="Even!" text="Everyone has a partner. Nobody is left over." />
        ) : (
          <Callout at={[last[0] + 30, last[1] - 20]} box={[420, 30]} w={260} icon={UserRound} title="Odd!" text="One is left over with no partner." />
        )
      ) : (
        <Callout at={[400, 250]} box={[420, 30]} w={260} icon={Users} title="All mixed up" text="Tap “Pair them up” to find out!" />
      )}
      <Callout
        at={[STRIP.x + 7.5 * STRIP.cell, STRIP.y + STRIP.cell + 8]}
        box={[480, 576]}
        w={380}
        icon={Hash}
        title="Look at the last digit"
        text="Even numbers end in 0, 2, 4, 6 or 8. Odd ones end in 1, 3, 5, 7 or 9."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[0, 1].map((p) => (
        <rect key={p} x={14 + p * 32} y={10} width={28} height={60} rx={10} fill={shade(C.teal, 0.8)} stroke={C.teal} strokeWidth={1.5} strokeDasharray="3 3" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Thing key={i} kind="duck" size={24} x={28 + Math.floor(i / 2) * 32} y={26 + (i % 2) * 28} />
      ))}
      <circle cx={92} cy={26} r={15} fill="none" stroke={C.orange} strokeWidth={1.5} strokeDasharray="3 3" />
    </svg>
  );
}

const ODD_EVEN: Choice[] = [
  { value: 'odd', label: 'Odd', name: 'odd' },
  { value: 'even', label: 'Even', name: 'even' },
];

/** Four numbers where exactly one has the wanted parity. */
function oneOf(parity: 0 | 1, lo: number, hi: number): { values: string[]; answer: number } {
  const want = (n: number) => n % 2 === parity;
  let answer = rand(lo, hi);
  while (!want(answer)) answer = rand(lo, hi);
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const v = rand(lo, hi);
    if (!want(v)) set.add(v);
  }
  return { values: shuffle([...set]).map(String), answer };
}

const parityOf = (n: number) => (n % 2 ? 'odd' : 'even');

/** Worked steps using the last digit. */
function lastDigitSteps(n: number): string[] {
  const d = n % 10;
  return [`Look at the last digit of ${n}: it is ${d}.`, d % 2 ? `${d} is odd (1, 3, 5, 7, 9).` : `${d} is even (0, 2, 4, 6, 8).`, `So ${n} is ${parityOf(n)}.`];
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const n = rand(2, 10);
    const kind = pick(['duck', 'fish', 'ball', 'apple'] as const);
    return {
      prompt: 'Odd or even?',
      speak: `There are ${n} ${thingName(kind, n)}. Is ${n} odd or even?`,
      visual: <PairsPicture n={n} kind={kind} />,
      choices: ODD_EVEN,
      answer: n % 2 ? 'odd' : 'even',
      hint: 'Put them into pairs. Does every one have a partner?',
      explain: [
        `Make pairs: ${n} ${thingName(kind, n)} make ${Math.floor(n / 2)} ${Math.floor(n / 2) === 1 ? 'pair' : 'pairs'}.`,
        n % 2 ? 'One is left over with no partner.' : 'Every one has a partner. None are left over.',
        `So ${n} is ${parityOf(n)}.`,
      ],
    };
  }
  const [lo, hi] = level === 1 ? [1, 20] : [21, 99];
  const kind = rand(0, 2);
  if (kind === 0) {
    const n = rand(lo, hi);
    return {
      prompt: `Is ${n} odd or even?`,
      choices: ODD_EVEN,
      answer: n % 2 ? 'odd' : 'even',
      hint: 'Only the last digit matters. Is it odd or even?',
      explain: lastDigitSteps(n),
    };
  }
  if (kind === 1) {
    const parity = Math.random() < 0.5 ? 0 : 1;
    const { values, answer } = oneOf(parity, lo, hi);
    return {
      prompt: `Which number is ${parity ? 'odd' : 'even'}?`,
      choices: values.map((value) => ({ value })),
      answer: String(answer),
      hint: 'Look at the last digit of each number.',
      explain: [
        parity ? 'Odd numbers end in 1, 3, 5, 7 or 9.' : 'Even numbers end in 0, 2, 4, 6 or 8.',
        `${answer} ends in ${answer % 10}.`,
        `So ${answer} is the ${parity ? 'odd' : 'even'} number.`,
      ],
    };
  }
  const from = rand(lo, hi - 3);
  const parity = Math.random() < 0.5 ? 0 : 1;
  const answer = from % 2 === parity ? from + 2 : from + 1;
  const set = new Set<number>([answer, answer + 1, answer - 1, answer + 2].filter((v) => v > from));
  if (set.size < 3) set.add(answer + 3);
  return {
    prompt: `What is the next ${parity ? 'odd' : 'even'} number after ${from}?`,
    choices: shuffle([...set]).slice(0, 4).map((v) => ({ value: String(v) })),
    answer: String(answer),
    hint: 'Odd and even numbers take turns: odd, even, odd, even…',
    explain: [
      `${from} is ${parityOf(from)}.`,
      answer === from + 1 ? `The very next number, ${from + 1}, is ${parityOf(from + 1)}.` : `${from + 1} is ${parityOf(from + 1)}, then ${from + 2} is ${parityOf(from + 2)}.`,
      `So the next ${parity ? 'odd' : 'even'} number is ${answer}.`,
    ],
  };
}

export const oddEven: Lesson = {
  id: 'odd-even',
  title: 'Odd & Even',
  Thumb,
  Scene: OddEvenScene,
  sceneHint: 'Change the number · Pair them up',
  learn: {
    heading: 'Odd and even numbers',
    intro: 'Put things into pairs. If everything has a partner, the number is even. If one is left over, the number is odd.',
    points: [
      { icon: Users, text: 'Even: everyone has a partner (2, 4, 6, 8, 10…).' },
      { icon: UserRound, text: 'Odd: one is left over (1, 3, 5, 7, 9…).' },
      { icon: Hash, text: 'The last digit tells you: 0, 2, 4, 6, 8 mean even.' },
    ],
  },
  steps: [
    'Make pairs: put the things into groups of two.',
    'Look for one left over with no partner.',
    'No one left over? Even! One left over? Odd!',
    'For big numbers, just check the last digit.',
  ],
  example: {
    question: 'Is 9 odd or even?',
    visual: <PairsPicture n={9} kind="duck" />,
    work: ['Make pairs: 4 pairs use up 8 ducks.', 'There is 1 duck left over with no partner.'],
    answer: '9 is odd.',
  },
  grownups: [
    'Pair socks, shoes or gloves from the laundry and ask if anything is left without a partner.',
    'Odd and even alternate on the number line — count aloud, whispering odds and shouting evens.',
    'Ask why every number ending in 0 is even: it can always be split into two equal groups.',
    'Extend it: is odd + odd always even? Let them test a few examples and spot the rule.',
  ],
  makeQuestion,
};
