import { useState } from 'react';
import { ArrowLeftRight, Grid3x3, Layers, Ruler } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { NumberLine, NumberLinePicture, lineX } from '../../visuals/NumberLine';
import { keepTogether, wrapLines } from './visuals/text';

const LINE = { x: 70, y: 110, w: 860 };
const CHART = { x: 60, y: 210, cell: 30 };
const CARD = { y: 220, w: 160, h: 120, a: 440, b: 780 };

const tens = (n: number) => Math.floor(n / 10);
const ones = (n: number) => n % 10;
const sign = (a: number, b: number) => (a > b ? '>' : a < b ? '<' : '=');

/** "Tens first" reasoning, in child language. */
export function compareWords(a: number, b: number): string {
  if (a === b) return `${a} and ${b} are the same, so ${a} = ${b}.`;
  if (tens(a) !== tens(b)) {
    const more = tens(a) > tens(b);
    return `Tens first: ${tens(a)} tens is ${more ? 'more' : 'less'} than ${tens(b)} tens. So ${a} ${sign(a, b)} ${b}.`;
  }
  return `Same tens (${tens(a)}). Ones: ${ones(a)} is ${ones(a) > ones(b) ? 'more' : 'less'} than ${ones(b)}. So ${a} ${sign(a, b)} ${b}.`;
}

function Pin({ value, color, onMove }: { value: number; color: string; onMove: (v: number) => void }) {
  const drag = useSvgDrag((p) => onMove(clamp(Math.round(((p.x - LINE.x) / LINE.w) * 100), 0, 100)));
  const x = lineX(value, { x: LINE.x, width: LINE.w, min: 0, max: 100 });
  return (
    <g {...drag} role="slider" aria-label="Move the number" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <rect x={x - 26} y={LINE.y - 84} width={52} height={100} fill="transparent" />
      <line x1={x} y1={LINE.y - 8} x2={x} y2={LINE.y - 40} stroke={color} strokeWidth={3} />
      <rect x={x - 24} y={LINE.y - 76} width={48} height={36} rx={10} fill={color} stroke={C.ink} strokeWidth={2} />
      <text x={x} y={LINE.y - 58} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.white} className="num">
        {value}
      </text>
      <circle cx={x} cy={LINE.y} r={9} fill={color} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

function NumberCardTO({ x, n, color, active, onTap }: { x: number; n: number; color: string; active: boolean; onTap: () => void }) {
  return (
    <g onClick={onTap} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`${n}: ${tens(n)} tens and ${ones(n)} ones`}>
      <rect x={x + 4} y={CARD.y + 6} width={CARD.w} height={CARD.h} rx={16} fill={C.ink} opacity={0.12} />
      <rect x={x} y={CARD.y} width={CARD.w} height={CARD.h} rx={16} fill={C.card} stroke={active ? color : C.ink} strokeWidth={active ? 5 : 2.5} />
      <text x={x + CARD.w / 2} y={CARD.y + 56} textAnchor="middle" dominantBaseline="central" fontSize={58} fontWeight={700} className="num">
        <tspan fill={shade(C.green, -0.35)}>{n === 100 ? '10' : tens(n) || ''}</tspan>
        <tspan fill={shade(C.orange, -0.3)}>{n === 100 ? '0' : ones(n)}</tspan>
      </text>
      <text x={x + CARD.w / 2} y={CARD.y + 100} textAnchor="middle" fontSize={15} fill={C.muted}>
        {tens(n)} tens, {ones(n)} ones
      </text>
    </g>
  );
}

function NumbersScene() {
  const [a, setA] = useState(45);
  const [b, setB] = useState(38);
  const [active, setActive] = useState<'a' | 'b'>('a');
  const set = (which: 'a' | 'b', v: number) => {
    const n = clamp(v, 0, 100);
    if (which === 'a') setA(n);
    else setB(n);
    play('tap');
  };
  const step = (which: 'a' | 'b', d: number) => () => set(which, (which === 'a' ? a : b) + d);
  const words = compareWords(a, b);

  return (
    <SceneSvg label={`Comparing ${a} and ${b}`}>
      <NumberLine x={LINE.x} y={LINE.y} width={LINE.w} min={0} max={100} step={1} labelEvery={10} fontSize={16} />
      <Pin value={b} color={C.blue} onMove={(v) => set('b', v)} />
      <Pin value={a} color={C.red} onMove={(v) => set('a', v)} />

      {/* Hundred chart: tap a square to set the chosen card */}
      {Array.from({ length: 100 }, (_, i) => {
        const n = i + 1;
        const x = CHART.x + (i % 10) * CHART.cell;
        const y = CHART.y + Math.floor(i / 10) * CHART.cell;
        const fill = n === a ? C.red : n === b ? C.blue : tens(n - 1) % 2 ? shade(C.paper, 0.2) : C.white;
        return (
          <g key={n} onClick={() => set(active, n)} style={{ cursor: 'pointer' }} data-nopan>
            <rect x={x} y={y} width={CHART.cell} height={CHART.cell} fill={fill} stroke={C.line} strokeWidth={1} />
            <text x={x + CHART.cell / 2} y={y + CHART.cell / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={n === a || n === b ? C.white : C.ink2} className="num">
              {n}
            </text>
          </g>
        );
      })}
      <rect x={CHART.x} y={CHART.y} width={CHART.cell * 10} height={CHART.cell * 10} fill="none" stroke={C.ink} strokeWidth={2} />

      {/* Two numbers to compare */}
      <NumberCardTO x={CARD.a} n={a} color={C.red} active={active === 'a'} onTap={() => setActive('a')} />
      <NumberCardTO x={CARD.b} n={b} color={C.blue} active={active === 'b'} onTap={() => setActive('b')} />
      <circle cx={(CARD.a + CARD.w + CARD.b) / 2} cy={CARD.y + 60} r={44} fill={shade(C.yellow, 0.4)} stroke={C.ink} strokeWidth={3} />
      <text x={(CARD.a + CARD.w + CARD.b) / 2} y={CARD.y + 62} textAnchor="middle" dominantBaseline="central" fontSize={50} fontWeight={700} fill={C.ink} className="num">
        {sign(a, b)}
      </text>

      {(['a', 'b'] as const).map((w) => {
        const x = w === 'a' ? CARD.a : CARD.b;
        return (
          <g key={w}>
            <SvgButton x={x} y={358} w={76} h={48} fontSize={18} label="+10" onClick={step(w, 10)} disabled={(w === 'a' ? a : b) > 90} />
            <SvgButton x={x + 84} y={358} w={76} h={48} fontSize={18} label="+1" onClick={step(w, 1)} disabled={(w === 'a' ? a : b) >= 100} />
            <SvgButton x={x} y={414} w={76} h={48} fontSize={18} label="−10" onClick={step(w, -10)} disabled={(w === 'a' ? a : b) < 10} />
            <SvgButton x={x + 84} y={414} w={76} h={48} fontSize={18} label="−1" onClick={step(w, -1)} disabled={(w === 'a' ? a : b) <= 0} />
          </g>
        );
      })}

      <rect x={440} y={486} width={500} height={98} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {wrapLines(keepTogether(words), 44).map((line, i) => (
        <text key={i} x={460} y={522 + i * 26} fontSize={19} fill={C.ink}>
          {line}
        </text>
      ))}
      <SvgButton x={440} y={600} w={160} h={48} fontSize={16} label="Say it" onClick={() => speak(words.replace('Tens first: ', ''), { force: true })} />
      <text x={620} y={630} fontSize={14} fill={C.muted}>
        Tap a card, then tap the chart to set it.
      </text>

      <Callout at={[CARD.a + 40, CARD.y + 56]} box={[440, 154]} w={250} icon={Layers} title="Tens first" text="Compare the tens digit first. Only look at the ones if the tens are the same." />
      <Callout at={[CHART.x + 150, CHART.y]} box={[60, 150]} w={200} icon={Grid3x3} title="Hundred chart" text="Each row is one more ten." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <text x={30} y={42} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.red}>45</text>
      <text x={60} y={42} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.ink}>&gt;</text>
      <text x={92} y={42} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.blue}>38</text>
      <line x1={8} y1={68} x2={112} y2={68} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

function twoNumbers(sameTens: boolean): [number, number] {
  if (sameTens) {
    const t = rand(1, 9);
    const [x, y] = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 2);
    return [t * 10 + x, t * 10 + y];
  }
  const [t1, t2] = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 2);
  return [t1 * 10 + rand(0, 9), t2 * 10 + rand(0, 9)];
}

function biggest(level: number): Question {
  // Level 0: different tens. Higher: often a "swapped digits" trap like 47 vs 74.
  let [p, q] = twoNumbers(false);
  if (level > 0 && Math.random() < 0.5) {
    const d1 = rand(1, 9);
    let d2 = rand(1, 9);
    while (d2 === d1) d2 = rand(1, 9);
    [p, q] = [d1 * 10 + d2, d2 * 10 + d1];
  }
  const askSmall = level > 0 && Math.random() < 0.4;
  const ans = askSmall ? Math.min(p, q) : Math.max(p, q);
  return {
    prompt: `Which number is ${askSmall ? 'smaller' : 'bigger'}?`,
    choices: shuffle([p, q]).map((v) => ({ value: String(v) })),
    answer: String(ans),
    hint: 'Look at the tens digit first.',
    explain: [compareWords(p, q).replace(/ So .*$/, ''), `So ${ans} is ${askSmall ? 'smaller' : 'bigger'}.`],
  };
}

function whichSign(): Question {
  const equal = Math.random() < 0.15;
  const [p, q] = equal ? (() => { const n = rand(11, 99); return [n, n] as [number, number]; })() : twoNumbers(Math.random() < 0.6);
  const ans = sign(p, q);
  return {
    prompt: `Which sign makes this true?  ${p} ☐ ${q}`,
    speak: `Which sign goes between ${p} and ${q}?`,
    choices: shuffle(['>', '<', '=']).map((v) => ({ value: v, name: v === '>' ? 'greater than' : v === '<' ? 'less than' : 'equals' })),
    answer: ans,
    hint: 'Compare the tens first. If they match, compare the ones. The open side faces the bigger number.',
    explain: [compareWords(p, q), `The sign is ${ans}.`],
  };
}

function tenMore(): Question {
  const n = rand(10, 89);
  const up = Math.random() < 0.6;
  const ans = up ? n + 10 : n - 10;
  return {
    prompt: `What is 10 ${up ? 'more' : 'less'} than ${n}?`,
    choices: shuffle([ans, up ? n + 1 : n - 1, up ? n + 20 : Math.max(0, n - 20)].filter((v, i, arr) => arr.indexOf(v) === i)).map((v) => ({ value: String(v) })),
    answer: String(ans),
    hint: `Ten ${up ? 'more' : 'less'} changes the tens digit. The ones stay the same.`,
    explain: [`${n} is ${tens(n)} tens and ${ones(n)} ones.`, `10 ${up ? 'more' : 'less'} makes ${tens(ans)} tens and ${ones(ans)} ones.`, `So the answer is ${ans}.`],
  };
}

function pointTo(): Question {
  const n = rand(1, 19) * 5;
  const lo = tens(n) * 10;
  const half = n % 10 === 5;
  const others: number[] = [];
  while (others.length < 2) {
    const c = rand(1, 19) * 5;
    if (Math.abs(c - n) >= 15 && !others.includes(c)) others.push(c);
  }
  return {
    prompt: 'Which number is the arrow pointing to?',
    visual: <NumberLinePicture min={0} max={100} step={5} labelEvery={2} marks={[{ value: n, label: '?' }]} fontSize={15} />,
    choices: shuffle([n, ...others]).map((v) => ({ value: String(v) })),
    answer: String(n),
    hint: 'Find the labelled tens on either side of the arrow. Each small mark is 5.',
    explain: half
      ? [`The arrow is between ${lo} and ${lo + 10}.`, `It is on the middle mark, halfway between them.`, `So it points to ${n}.`]
      : [`Find the tens labels on the line.`, `The arrow is right on the ${n} mark.`, `So it points to ${n}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([() => biggest(0), () => tenMore()])();
  if (level === 1) return pick([() => biggest(1), () => whichSign(), () => tenMore()])();
  return pick([() => whichSign(), () => pointTo(), () => biggest(2)])();
}

export const numbersTo100: Lesson = {
  id: 'numbers-to-100',
  title: 'Numbers to 100',
  Thumb,
  Scene: NumbersScene,
  sceneHint: 'Drag the pins on the number line · Compare with tens first',
  learn: {
    heading: 'Numbers to 100',
    intro: 'Two-digit numbers have tens and ones. To compare two numbers, look at the tens first. The one with more tens is bigger!',
    points: [
      { icon: Layers, text: 'The first digit tells how many tens.' },
      { icon: ArrowLeftRight, text: '> means bigger than, < means smaller than.' },
      { icon: Ruler, text: 'Bigger numbers sit further along the number line.' },
    ],
  },
  steps: ['Look at the tens digits.', 'More tens means bigger.', 'If the tens are the same, compare the ones.', 'Write the sign: the open side faces the bigger number.'],
  example: {
    question: 'Which is bigger, 47 or 74?',
    visual: <NumberLinePicture min={0} max={100} step={10} marks={[{ value: 47, label: '47', color: C.red }, { value: 74, label: '74', color: C.blue }]} fontSize={15} />,
    work: ['47 has 4 tens. 74 has 7 tens.', '7 tens is more than 4 tens.'],
    answer: '74 is bigger, so 74 > 47.',
  },
  grownups: [
    'Watch for digit swaps (47 vs 74): ask “how many tens does each one have?”',
    'Walk a number line on the floor with tape: bigger numbers are further along.',
    'Spot two-digit numbers outside (house numbers, prices) and compare them.',
  ],
  makeQuestion,
};
