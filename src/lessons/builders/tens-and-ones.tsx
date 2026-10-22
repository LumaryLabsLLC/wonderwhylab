import { useState } from 'react';
import { Box, Columns3, Package, Repeat } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { iso, IsoCube } from '../../visuals/Iso';
import { BaseTenPicture, IsoRod } from './visuals/BaseTen';

const U = 22;
const RODS = { ox: 120, oy: 470, k: 1.2 };
const ONES = { ox: 610, oy: 476, k: 1.25, back: 2.1 };
const CHART = { x: 640, y: 48, w: 300, h: 196 };

/** Screen position of iso point relative to an origin. */
const at = (ox: number, oy: number, x: number, y: number, z: number): [number, number] => {
  const [sx, sy] = iso(x, y, z, U);
  return [ox + sx, oy + sy];
};

const oneSpot = (i: number) => {
  const c = i % 5;
  const r = Math.floor(i / 5);
  return { x: c * ONES.k - r * ONES.back, y: -c * ONES.k - r * ONES.back };
};

function Stepper({ x, label, onMinus, onPlus, minusOff, plusOff }: { x: number; label: string; onMinus: () => void; onPlus: () => void; minusOff: boolean; plusOff: boolean }) {
  return (
    <g>
      <text x={x + 63} y={538} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        {label}
      </text>
      <SvgButton x={x} y={552} w={56} label="−" title={`One less ${label}`} onClick={onMinus} disabled={minusOff} />
      <SvgButton x={x + 70} y={552} w={56} label="+" title={`One more ${label}`} onClick={onPlus} disabled={plusOff} color={C.yellow} />
    </g>
  );
}

function TensOnesScene() {
  const [tens, setTens] = useState(3);
  const [ones, setOnes] = useState(4);
  const total = tens * 10 + ones;

  const bundle = () => {
    setOnes(ones - 10);
    setTens(tens + 1);
    play('correct');
    speak('Ten ones make one ten!');
  };
  const breakTen = () => {
    setTens(tens - 1);
    setOnes(ones + 10);
    play('pop');
    speak('One ten breaks into ten ones.');
  };

  // Back row of ones first so the front row overlaps it.
  const oneOrder = Array.from({ length: ones }, (_, i) => i).sort((a, b) => Math.floor(b / 5) - Math.floor(a / 5));
  const firstRodTop = at(RODS.ox, RODS.oy, 0.5, 0.5, 10);
  const firstOne = oneSpot(0);
  const firstOneTop = at(ONES.ox, ONES.oy, firstOne.x + 0.5, firstOne.y + 0.5, 1);

  return (
    <SceneSvg label={`${tens} tens and ${ones} ones make ${total}`}>
      {/* Mats */}
      <ellipse cx={RODS.ox + 210} cy={RODS.oy + 30} rx={250} ry={22} fill={C.ink} opacity={0.08} />
      <ellipse cx={ONES.ox + 120} cy={ONES.oy + 30} rx={150} ry={20} fill={C.ink} opacity={0.08} />

      {Array.from({ length: tens }, (_, i) => {
        const [sx, sy] = at(RODS.ox, RODS.oy, i * RODS.k, -i * RODS.k, 0);
        return (
          <g key={`rod-${i}`} className="pop-in" style={{ transformOrigin: `${sx}px ${sy}px` }}>
            <g transform={`translate(${RODS.ox} ${RODS.oy})`}>
              <IsoRod x={i * RODS.k} y={-i * RODS.k} unit={U} color={C.green} />
            </g>
          </g>
        );
      })}
      {tens === 0 && (
        <text x={RODS.ox + 200} y={RODS.oy - 80} textAnchor="middle" fontSize={18} fill={C.muted}>
          No tens yet
        </text>
      )}

      {oneOrder.map((i) => {
        const s = oneSpot(i);
        const [sx, sy] = at(ONES.ox, ONES.oy, s.x, s.y, 0);
        return (
          <g key={`one-${i}`} className="pop-in" style={{ transformOrigin: `${sx}px ${sy}px` }}>
            <g transform={`translate(${ONES.ox} ${ONES.oy})`}>
              <IsoCube x={s.x} y={s.y} unit={U} color={ones >= 10 ? C.orange : C.yellow} />
            </g>
          </g>
        );
      })}

      {/* Place value chart */}
      <g>
        <rect x={CHART.x + 4} y={CHART.y + 6} width={CHART.w} height={CHART.h} rx={14} fill={C.ink} opacity={0.1} />
        <rect x={CHART.x} y={CHART.y} width={CHART.w} height={CHART.h} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
        <line x1={CHART.x + CHART.w / 2} y1={CHART.y} x2={CHART.x + CHART.w / 2} y2={CHART.y + 150} stroke={C.ink} strokeWidth={2} />
        <line x1={CHART.x} y1={CHART.y + 40} x2={CHART.x + CHART.w} y2={CHART.y + 40} stroke={C.ink} strokeWidth={2} />
        <line x1={CHART.x} y1={CHART.y + 150} x2={CHART.x + CHART.w} y2={CHART.y + 150} stroke={C.ink} strokeWidth={2} />
        <rect x={CHART.x + 2} y={CHART.y + 2} width={CHART.w / 2 - 3} height={37} rx={12} fill={shade(C.green, 0.6)} />
        <rect x={CHART.x + CHART.w / 2 + 1} y={CHART.y + 2} width={CHART.w / 2 - 3} height={37} rx={12} fill={shade(C.yellow, 0.5)} />
        <text x={CHART.x + CHART.w / 4} y={CHART.y + 21} textAnchor="middle" dominantBaseline="central" fontSize={18} fill={C.ink} className="caps">Tens</text>
        <text x={CHART.x + (CHART.w * 3) / 4} y={CHART.y + 21} textAnchor="middle" dominantBaseline="central" fontSize={18} fill={C.ink} className="caps">Ones</text>
        <text key={`t${tens}`} x={CHART.x + CHART.w / 4} y={CHART.y + 96} textAnchor="middle" dominantBaseline="central" fontSize={66} fontWeight={700} fill={shade(C.green, -0.35)} className="num pop-in" style={{ transformOrigin: `${CHART.x + CHART.w / 4}px ${CHART.y + 96}px` }}>
          {tens}
        </text>
        <text key={`o${ones}`} x={CHART.x + (CHART.w * 3) / 4} y={CHART.y + 96} textAnchor="middle" dominantBaseline="central" fontSize={ones >= 10 ? 56 : 66} fontWeight={700} fill={ones >= 10 ? C.red : shade(C.orange, -0.3)} className="num pop-in" style={{ transformOrigin: `${CHART.x + (CHART.w * 3) / 4}px ${CHART.y + 96}px` }}>
          {ones}
        </text>
        <text x={CHART.x + CHART.w / 2} y={CHART.y + 174} textAnchor="middle" dominantBaseline="central" fontSize={20} fill={C.ink} fontWeight={600}>
          {ones >= 10 ? '10 ones? Bundle them!' : `${tens} tens + ${ones} ones = ${total}`}
        </text>
      </g>

      {/* Controls */}
      <Stepper x={150} label="Tens" onMinus={() => { setTens(tens - 1); play('pop'); }} onPlus={() => { setTens(tens + 1); play('pop'); }} minusOff={tens <= 0} plusOff={tens >= 9} />
      <SvgButton x={326} y={548} w={150} h={60} fontSize={18} label="Bundle 10" title="Trade 10 ones for 1 ten" onClick={bundle} disabled={ones < 10 || tens >= 9} color={C.green} textColor={C.white} />
      <SvgButton x={488} y={548} w={136} h={60} fontSize={18} label="Break a ten" title="Trade 1 ten for 10 ones" onClick={breakTen} disabled={tens === 0 || ones > 0} />
      <Stepper x={680} label="Ones" onMinus={() => { setOnes(ones - 1); play('pop'); }} onPlus={() => { setOnes(ones + 1); play('pop'); }} minusOff={ones <= 0} plusOff={ones >= 10} />

      {tens > 0 && (
        <Callout at={firstRodTop} box={[60, 56]} w={240} icon={Columns3} title="A ten" text="Each rod is 10 cubes stuck together." />
      )}
      {ones > 0 && (
        <Callout at={firstOneTop} box={[660, 290]} w={270} icon={Box} title="Ones" text="Single cubes. When you have 10, bundle them into a ten!" />
      )}
      <Callout
        at={[CHART.x, CHART.y + 96]}
        box={[340, 56]}
        w={240}
        icon={Package}
        title="Place value"
        text="The tens digit goes on the left, the ones digit on the right."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(22 66)">
        {[0, 1, 2].map((i) => (
          <IsoRod key={i} x={i * 1.25} y={-i * 1.25} unit={5.6} color={C.green} />
        ))}
      </g>
      <g transform="translate(78 66)">
        {[0, 1, 2, 3].map((i) => (
          <IsoCube key={i} x={i * 1.3} y={-i * 1.3} unit={6} color={C.yellow} strokeWidth={1} />
        ))}
      </g>
      <text x={98} y={22} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>34</text>
    </svg>
  );
}

/** Choices for "what number is this?": includes the classic swapped-digits mistake. */
function placeChoices(n: number): string[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const set = new Set<number>([n]);
  const candidates = [o * 10 + t, n + 10 <= 99 ? n + 10 : n - 10, n + 1 <= 99 ? n + 1 : n - 1, n - 1, t + o];
  for (const c of candidates) if (set.size < 4 && c >= 1 && c <= 99 && c !== n) set.add(c);
  let k = 2;
  while (set.size < 4) {
    if (n + k <= 99) set.add(n + k);
    if (set.size < 4 && n - k >= 1) set.add(n - k);
    k++;
  }
  return shuffle([...set]).map(String);
}

function digitChoices(answer: number, other: number): string[] {
  const set = new Set<number>([answer]);
  for (const c of [other, answer + 1, answer - 1, answer + 2, answer - 2]) if (set.size < 4 && c >= 0 && c <= 9) set.add(c);
  return shuffle([...set]).map(String);
}

/** "10, 20, 30" — counting the rods in tens. */
const tensCount = (t: number) => Array.from({ length: t }, (_, i) => (i + 1) * 10).join(', ');

function makeQuestion(level: number): Question {
  if (level === 0) {
    const t = rand(1, 5);
    const o = rand(0, 9);
    const n = t * 10 + o;
    return {
      prompt: 'What number do the blocks show?',
      visual: <BaseTenPicture tens={t} ones={o} />,
      choices: placeChoices(n).map((value) => ({ value })),
      answer: String(n),
      hint: 'Count the rods in tens first, then count on the little cubes.',
      explain: [`Count the rods in tens: ${tensCount(t)}.`, o ? `Then count on ${o} little ${o === 1 ? 'cube' : 'cubes'}: ${t * 10} and ${o} more.` : 'There are no little cubes.', `${t} tens and ${o} ones make ${n}.`],
    };
  }
  if (level === 1) {
    const t = rand(1, 9);
    const o = rand(0, 9);
    const n = t * 10 + o;
    const kind = pick(['tens', 'ones', 'build', 'more']);
    if (kind === 'tens' || kind === 'ones') {
      const ans = kind === 'tens' ? t : o;
      return {
        prompt: `How many ${kind} are in ${n}?`,
        choices: digitChoices(ans, kind === 'tens' ? o : t).map((value) => ({ value })),
        answer: String(ans),
        hint: kind === 'tens' ? 'The tens digit is on the left.' : 'The ones digit is on the right.',
        explain: [`In ${n}, the left digit is ${t} and the right digit is ${o}.`, `${n} is ${t} tens and ${o} ones.`, `So there ${ans === 1 ? 'is' : 'are'} ${ans} ${kind === 'tens' ? (ans === 1 ? 'ten' : 'tens') : ans === 1 ? 'one' : 'ones'}.`],
      };
    }
    if (kind === 'build') {
      return {
        prompt: `${t} tens and ${o} ones make…`,
        visual: <BaseTenPicture tens={t} ones={o} />,
        choices: placeChoices(n).map((value) => ({ value })),
        answer: String(n),
        hint: 'Count the tens first, then add the ones.',
        explain: [`${t} tens: ${tensCount(t)}. That is ${t * 10}.`, `Add ${o} ones: ${t * 10} + ${o} = ${n}.`, `${t} tens and ${o} ones make ${n}.`],
      };
    }
    const m = rand(11, 89);
    return {
      prompt: `What is 10 more than ${m}?`,
      choices: placeChoices(m + 10).map((value) => ({ value })),
      answer: String(m + 10),
      hint: 'Adding 10 adds one more rod. Which digit changes?',
      explain: [`${m} is ${Math.floor(m / 10)} tens and ${m % 10} ones.`, `Add one more rod: ${Math.floor(m / 10) + 1} tens and ${m % 10} ones.`, `10 more than ${m} is ${m + 10}.`],
    };
  }
  const kind = pick(['regroup', 'less', 'missing']);
  if (kind === 'regroup') {
    const t = rand(1, 7);
    const o = rand(11, 19);
    return {
      prompt: `${t} tens and ${o} ones = ?`,
      visual: <BaseTenPicture tens={t} ones={o} />,
      answer: String(t * 10 + o),
      hint: 'You have more than 9 ones. Can you bundle 10 of them into a ten?',
      explain: [`Bundle 10 of the ${o} ones into a new ten. ${o - 10} ${o - 10 === 1 ? 'one is' : 'ones are'} left.`, `Now there are ${t + 1} tens and ${o - 10} ones.`, `${t + 1} tens and ${o - 10} ones = ${t * 10 + o}.`],
    };
  }
  if (kind === 'less') {
    const m = rand(20, 99);
    return {
      prompt: `What is 10 less than ${m}?`,
      answer: String(m - 10),
      hint: 'Take away one rod. Which digit changes?',
      explain: [`${m} is ${Math.floor(m / 10)} tens and ${m % 10} ones.`, `Take away one rod: ${Math.floor(m / 10) - 1} tens and ${m % 10} ones.`, `10 less than ${m} is ${m - 10}.`],
    };
  }
  const m = rand(21, 98);
  return {
    prompt: `${m} = ${Math.floor(m / 10)} tens and ? ones`,
    speak: `${m} is ${Math.floor(m / 10)} tens and how many ones?`,
    answer: String(m % 10),
    hint: 'The ones are the little cubes left after the full tens.',
    explain: [`${Math.floor(m / 10)} tens is ${Math.floor(m / 10) * 10}.`, `${m} − ${Math.floor(m / 10) * 10} = ${m % 10}, so ${m % 10} ${m % 10 === 1 ? 'one is' : 'ones are'} left.`, `${m} = ${Math.floor(m / 10)} tens and ${m % 10} ones.`],
  };
}

export const tensAndOnes: Lesson = {
  id: 'tens-and-ones',
  title: 'Tens & Ones',
  Thumb,
  Scene: TensOnesScene,
  sceneHint: 'Add rods and cubes · Bundle 10 ones into a ten',
  learn: {
    heading: 'Tens and ones',
    intro: 'Big numbers are made of tens and ones. In 34, the 3 means 3 tens and the 4 means 4 ones.',
    points: [
      { icon: Columns3, text: 'A rod is a ten: 10 cubes stuck together.' },
      { icon: Box, text: 'A single cube is a one.' },
      { icon: Repeat, text: '10 ones can be swapped for 1 ten.' },
      { icon: Package, text: 'Where a digit sits tells you what it is worth.' },
    ],
  },
  steps: [
    'Count the rods by tens: 10, 20, 30…',
    'Keep going and count on the single cubes: 31, 32, 33, 34.',
    'Write the tens digit first, then the ones digit.',
    'Have 10 or more ones? Bundle 10 of them into a new ten.',
  ],
  example: {
    question: 'What number is 4 tens and 6 ones?',
    visual: <BaseTenPicture tens={4} ones={6} />,
    work: ['Count the tens: 10, 20, 30, 40.', 'Count on the ones: 41, 42, 43, 44, 45, 46.', 'The tens digit is 4 and the ones digit is 6.'],
    answer: '4 tens and 6 ones is 46.',
  },
  grownups: [
    'Bundle real things: straws or lolly sticks in elastic bands of ten make perfect “tens”.',
    'Watch for reversed digits (writing 43 for 34): ask “how many tens?” before writing.',
    'Regrouping (10 ones → 1 ten) is the idea behind carrying in column addition later on.',
    'Ask “what is 10 more?” and “10 less?” around the house — it builds strong place-value sense.',
  ],
  makeQuestion,
};
