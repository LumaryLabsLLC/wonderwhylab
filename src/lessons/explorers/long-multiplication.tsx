import { useState } from 'react';
import { Columns3, Grid2x2, Plus, StepForward } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';

const TENS_TOP = shade(C.blue, 0.55);
const ONES_TOP = shade(C.blue, 0.75);
const TENS_BOT = shade(C.orange, 0.5);
const ONES_BOT = shade(C.orange, 0.72);
const ROW1_INK = shade(C.orange, -0.45);
const ROW2_INK = shade(C.blue, -0.4);

const digits = (n: number) => String(n).split('').map(Number);

interface Plan {
  a: number;
  b: number;
  p: number;
  q: number;
  r: number;
  s: number;
  row1: number;
  row2: number;
  total: number;
  /** Carry from q × s, written above the tens column. */
  c1: number;
  /** Carry from q × r, written above the hundreds column. */
  c2: number;
  /** Column carries when adding the two rows, by column index (1 = tens…). */
  addCarries: Record<number, number>;
}

function planOf(a: number, b: number): Plan {
  const p = Math.floor(a / 10);
  const q = a % 10;
  const r = Math.floor(b / 10);
  const s = b % 10;
  const row1 = a * s;
  const row2 = a * r * 10;
  const addCarries: Record<number, number> = {};
  let carry = 0;
  for (let k = 0; k < 5; k++) {
    const d1 = Math.floor(row1 / 10 ** k) % 10;
    const d2 = Math.floor(row2 / 10 ** k) % 10;
    const sum = d1 + d2 + carry;
    carry = Math.floor(sum / 10);
    if (carry) addCarries[k + 1] = carry;
  }
  return { a, b, p, q, r, s, row1, row2, total: a * b, c1: Math.floor((q * s) / 10), c2: Math.floor((q * r) / 10), addCarries };
}

/** What the working shows after each step (0 = just the question). */
function stepText(pl: Plan, step: number): string {
  const { p, q, r, s } = pl;
  switch (step) {
    case 0:
      return `Work out ${pl.a} × ${pl.b} one digit at a time. Press Next step.`;
    case 1:
      return `Ones × ones: ${q} × ${s} = ${q * s}. Write ${(q * s) % 10} in the ones${pl.c1 ? ` and carry ${pl.c1} ten${pl.c1 > 1 ? 's' : ''}` : ''}.`;
    case 2:
      return `Tens × ones: ${p} tens × ${s} = ${p * s} tens${pl.c1 ? `, plus the ${pl.c1} carried = ${p * s + pl.c1} tens` : ''}. First row: ${pl.a} × ${s} = ${pl.row1}.`;
    case 3:
      return `Now multiply by the ${r} ten${r > 1 ? 's' : ''}. Every answer is in tens, so write a 0 in the ones first.`;
    case 4:
      return `Ones × tens: ${q} × ${r} = ${q * r}. Write ${(q * r) % 10} in the tens${pl.c2 ? ` and carry ${pl.c2}` : ''}.`;
    case 5:
      return `Tens × tens: ${p} × ${r} = ${p * r}${pl.c2 ? `, plus the ${pl.c2} carried = ${p * r + pl.c2}` : ''} hundreds. Second row: ${pl.a} × ${r * 10} = ${pl.row2}.`;
    default:
      return `Add the two rows: ${pl.row1} + ${pl.row2} = ${pl.total}. So ${pl.a} × ${pl.b} = ${pl.total}.`;
  }
}

/** Join "23 × 14 = 322" with non-breaking spaces so a sum never wraps mid-way. */
const keepSums = (t: string) => t.replace(/ ([×=+]) /g, '\u00a0$1\u00a0');

const D = 54;
const RIGHT = 930;
const colX = (k: number) => RIGHT - (k + 0.5) * D;
const AREA = { x: 60, y: 120, w: 430, h: 290 };

/** The four-part area model. `focus` dims every part except the ones in play. */
function AreaModel({
  pl,
  x,
  y,
  w,
  h,
  focus,
  fs = 18,
}: {
  pl: Plan;
  x: number;
  y: number;
  w: number;
  h: number;
  focus: ('tt' | 'ot' | 'to' | 'oo')[] | 'all';
  fs?: number;
}) {
  const { p, q, r, s } = pl;
  // A grid sketch rather than to scale, so the ones parts stay big enough to read.
  const tw = w * 0.68;
  const th = h * 0.62;
  const parts = [
    { id: 'tt', x, y, w: tw, h: th, fill: TENS_TOP, label: `${p * 10} × ${r * 10} = ${p * r * 100}` },
    { id: 'ot', x: x + tw, y, w: w - tw, h: th, fill: ONES_TOP, label: `${q} × ${r * 10} = ${q * r * 10}` },
    { id: 'to', x, y: y + th, w: tw, h: h - th, fill: TENS_BOT, label: `${p * 10} × ${s} = ${p * 10 * s}` },
    { id: 'oo', x: x + tw, y: y + th, w: w - tw, h: h - th, fill: ONES_BOT, label: `${q} × ${s} = ${q * s}` },
  ] as const;
  return (
    <g>
      {parts.map((part) => {
        const on = focus === 'all' || focus.includes(part.id);
        const lines = part.w < part.label.length * fs * 0.55 ? part.label.split(' = ') : [part.label];
        return (
          <g key={part.id} opacity={on ? 1 : 0.35}>
            <rect x={part.x} y={part.y} width={part.w} height={part.h} fill={part.fill} stroke={C.ink} strokeWidth={on && focus !== 'all' ? 3.5 : 2} />
            {lines.map((t, i) => (
              <text
                key={i}
                x={part.x + part.w / 2}
                y={part.y + part.h / 2 + (i - (lines.length - 1) / 2) * (fs + 3)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fs}
                fontWeight={700}
                fill={C.ink}
                className="num"
              >
                {i === 1 ? `= ${t}` : t}
              </text>
            ))}
          </g>
        );
      })}
      <text x={x + tw / 2} y={y - 14} textAnchor="middle" fontSize={fs + 2} fontWeight={700} fill={C.ink} className="num">
        {p * 10}
      </text>
      <text x={x + tw + (w - tw) / 2} y={y - 14} textAnchor="middle" fontSize={fs + 2} fontWeight={700} fill={C.ink} className="num">
        {q}
      </text>
      <text x={x - 12} y={y + th / 2} textAnchor="end" dominantBaseline="central" fontSize={fs + 2} fontWeight={700} fill={ROW2_INK} className="num">
        {r * 10}
      </text>
      <text x={x - 12} y={y + th + (h - th) / 2} textAnchor="end" dominantBaseline="central" fontSize={fs + 2} fontWeight={700} fill={ROW1_INK} className="num">
        {s}
      </text>
    </g>
  );
}

function Digits({ n, y, color = C.ink, from = 0, upTo = 9, size = 34 }: { n: number; y: number; color?: string; from?: number; upTo?: number; size?: number }) {
  return (
    <>
      {digits(n)
        .reverse()
        .map((d, k) =>
          k >= from && k <= upTo ? (
            <text key={k} x={colX(k)} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={700} fill={color} className="num pop-in">
              {d}
            </text>
          ) : null,
        )}
    </>
  );
}

function ColumnScene() {
  const [a, setA] = useState(23);
  const [b, setB] = useState(14);
  const [step, setStep] = useState(0);
  const pl = planOf(a, b);
  const last = 6;

  const change = (na: number, nb: number) => {
    setA(na);
    setB(nb);
    setStep(0);
    play('pop');
  };
  const bumpA = (d: number) => {
    let v = a + d;
    if (v % 10 === 0) v += d;
    if (v >= 12 && v <= 49) change(v, b);
  };
  const bumpB = (d: number) => {
    let v = b + d;
    if (v % 10 === 0) v += d;
    if (v >= 11 && v <= 29) change(a, v);
  };

  const focus: ('tt' | 'ot' | 'to' | 'oo')[] | 'all' =
    step === 1 ? ['oo'] : step === 2 ? ['to', 'oo'] : step === 3 ? ['tt', 'ot'] : step === 4 ? ['ot'] : step === 5 ? ['tt', 'ot'] : 'all';

  // Row 1 digits written so far: ones after step 1, the rest after step 2.
  const row1Upto = step >= 2 ? 9 : step >= 1 ? 0 : -1;
  const row2Upto = step >= 5 ? 9 : step >= 4 ? 1 : step >= 3 ? 0 : -1;
  const yA = 170;
  const yB = 232;
  const yR1 = 304;
  const yR2 = 364;
  const yT = 444;

  return (
    <SceneSvg label={`${a} times ${b} worked out in columns`}>
      {/* ── Area model ── */}
      <AreaModel pl={pl} x={AREA.x} y={AREA.y} w={AREA.w} h={AREA.h} focus={focus} />
      <text x={AREA.x} y={74} fontSize={16} fill={C.muted} className="caps">
        Area model
      </text>

      <text x={AREA.x} y={462} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        Top
      </text>
      <SvgButton x={AREA.x + 64} y={438} w={52} h={48} label="−" title="Smaller top number" onClick={() => bumpA(-1)} disabled={a <= 12} />
      <text x={AREA.x + 150} y={462} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
        {a}
      </text>
      <SvgButton x={AREA.x + 184} y={438} w={52} h={48} label="+" title="Bigger top number" onClick={() => bumpA(1)} disabled={a >= 49} color={C.yellow} />
      <text x={AREA.x} y={524} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        Times
      </text>
      <SvgButton x={AREA.x + 64} y={500} w={52} h={48} label="−" title="Smaller bottom number" onClick={() => bumpB(-1)} disabled={b <= 11} />
      <text x={AREA.x + 150} y={524} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
        {b}
      </text>
      <SvgButton x={AREA.x + 184} y={500} w={52} h={48} label="+" title="Bigger bottom number" onClick={() => bumpB(1)} disabled={b >= 29} color={C.yellow} />
      <SvgButton
        x={AREA.x + 270}
        y={469}
        w={160}
        h={48}
        fontSize={17}
        label="New numbers"
        onClick={() => {
          let na = 0;
          let nb = 0;
          do {
            na = rand(12, 49);
            nb = rand(11, 29);
          } while (na % 10 === 0 || nb % 10 === 0);
          change(na, nb);
        }}
      />

      {/* ── Column method ── */}
      <text x={560} y={74} fontSize={16} fill={C.muted} className="caps">
        Column method
      </text>
      <rect x={560} y={96} width={400} height={384} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {[0, 1, 2, 3].map((k) => (
        <text key={k} x={colX(k)} y={118} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
          {['O', 'T', 'H', 'Th'][k]}
        </text>
      ))}
      {/* multiplication carries, small, above the top number */}
      {step >= 1 && pl.c1 > 0 && (
        <text x={colX(1) + 14} y={142} textAnchor="middle" fontSize={18} fontWeight={700} fill={ROW1_INK} className="num pop-in">
          {pl.c1}
        </text>
      )}
      {step >= 4 && pl.c2 > 0 && (
        <text x={colX(2) + 14} y={142} textAnchor="middle" fontSize={18} fontWeight={700} fill={ROW2_INK} className="num pop-in">
          {pl.c2}
        </text>
      )}
      <Digits n={a} y={yA} />
      <text x={colX(2) - 4} y={yB} textAnchor="middle" dominantBaseline="central" fontSize={32} fontWeight={700} fill={C.ink}>
        ×
      </text>
      <Digits n={b} y={yB} />
      <line x1={colX(3) - D / 2} y1={yB + 32} x2={RIGHT} y2={yB + 32} stroke={C.ink} strokeWidth={3} />
      {row1Upto >= 0 && <Digits n={pl.row1} y={yR1} color={ROW1_INK} upTo={row1Upto} />}
      {row2Upto >= 0 && <Digits n={pl.row2} y={yR2} color={ROW2_INK} upTo={row2Upto} />}
      {step >= 6 &&
        Object.entries(pl.addCarries).map(([k, v]) => (
          <text key={k} x={colX(Number(k))} y={yR2 + 38} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.green} className="num pop-in">
            {v}
          </text>
        ))}
      <line x1={colX(3) - D / 2} y1={yR2 + 52} x2={RIGHT} y2={yR2 + 52} stroke={C.ink} strokeWidth={3} />
      {step >= 6 && <Digits n={pl.total} y={yT} />}
      {step >= 2 && (
        <text x={578} y={yR1} dominantBaseline="central" fontSize={15} fill={ROW1_INK}>
          {a} × {pl.s}
        </text>
      )}
      {step >= 5 && (
        <text x={578} y={yR2} dominantBaseline="central" fontSize={15} fill={ROW2_INK}>
          {a} × {pl.r * 10}
        </text>
      )}

      {wrap(keepSums(stepText(pl, step)), 44).map((line, i) => (
        <text key={`${step}-${i}`} x={560} y={514 + i * 24} fontSize={18} fill={C.ink} fontWeight={i === 0 ? 600 : 400}>
          {line}
        </text>
      ))}
      <SvgButton x={560} y={600} w={200} h={52} fontSize={18} label={step >= last ? 'Done!' : 'Next step'} onClick={() => setStep(Math.min(last, step + 1))} disabled={step >= last} color={C.teal} textColor={C.white} />
      <SvgButton x={776} y={600} w={184} h={52} fontSize={17} label="Start again" onClick={() => setStep(0)} disabled={step === 0} />

      <Callout at={[AREA.x + AREA.w * 0.84, AREA.y + 40]} box={[240, 30]} w={300} icon={Grid2x2} title="Same parts, two ways" text="Each coloured part of the rectangle is one multiplication in the columns." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <text x={96} y={20} textAnchor="end" fontSize={15} fontWeight={700} fill={C.ink}>
        23
      </text>
      <text x={96} y={37} textAnchor="end" fontSize={15} fontWeight={700} fill={C.ink}>
        ×14
      </text>
      <line x1={60} y1={42} x2={100} y2={42} stroke={C.ink} strokeWidth={2} />
      <text x={96} y={58} textAnchor="end" fontSize={14} fontWeight={700} fill={ROW1_INK}>
        92
      </text>
      <text x={96} y={74} textAnchor="end" fontSize={14} fontWeight={700} fill={ROW2_INK}>
        230
      </text>
      <rect x={10} y={14} width={34} height={20} fill={TENS_TOP} stroke={C.ink} strokeWidth={1.5} />
      <rect x={44} y={14} width={8} height={20} fill={ONES_TOP} stroke={C.ink} strokeWidth={1.5} />
      <rect x={10} y={34} width={34} height={10} fill={TENS_BOT} stroke={C.ink} strokeWidth={1.5} />
      <rect x={44} y={34} width={8} height={10} fill={ONES_BOT} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

function AreaPicture({ a, b }: { a: number; b: number }) {
  return (
    <svg viewBox="-60 -34 500 300" role="img" aria-label={`${a} times ${b} as a rectangle in four parts`}>
      <AreaModel pl={planOf(a, b)} x={0} y={0} w={420} h={250} focus="all" fs={17} />
    </svg>
  );
}

function pair(minA: number, maxA: number, minB: number, maxB: number) {
  let a = 0;
  let b = 0;
  do {
    a = rand(minA, maxA);
    b = rand(minB, maxB);
  } while (a % 10 === 0 || b % 10 === 0);
  return { a, b };
}

function workSteps(a: number, b: number): string[] {
  const pl = planOf(a, b);
  return [`${a} × ${pl.s} = ${pl.row1} (the first row).`, `${a} × ${pl.r * 10} = ${pl.row2} (the second row, with a 0 for the tens).`, `${pl.row1} + ${pl.row2} = ${pl.total}, so ${a} × ${b} = ${pl.total}.`];
}

function tensTimesTens(): Question {
  const x = rand(1, 4);
  const y = rand(1, 3);
  const ans = x * y * 100;
  return {
    prompt: `What is ${x * 10} × ${y * 10}?`,
    choices: shuffle([...new Set([ans, x * y * 10, x * y * 1000, ...numberChoices(ans, { min: 100, step: 100, spread: 2 }).map(Number)])].slice(0, 4)).map((v) => ({
      value: String(v),
    })),
    answer: String(ans),
    hint: `Work out ${x} × ${y}, then think: tens times tens makes hundreds.`,
    explain: [`${x} × ${y} = ${x * y}.`, `Tens × tens = hundreds, so it is ${x * y} hundreds.`, `${x * 10} × ${y * 10} = ${ans}.`],
  };
}

function firstRow(): Question {
  const { a, b } = pair(12, 39, 11, 19);
  const pl = planOf(a, b);
  return {
    prompt: `For ${a} × ${b}, the first row is ${a} × ${pl.s}. What is it?`,
    visual: <AreaPicture a={a} b={b} />,
    answer: String(pl.row1),
    hint: `It's the bottom strip of the rectangle: the tens part plus the ones part.`,
    explain: [`${pl.p * 10} × ${pl.s} = ${pl.p * 10 * pl.s}.`, `${pl.q} × ${pl.s} = ${pl.q * pl.s}.`, `${pl.p * 10 * pl.s} + ${pl.q * pl.s} = ${pl.row1}.`],
  };
}

function addRows(): Question {
  const { a, b } = pair(12, 39, 11, 29);
  const pl = planOf(a, b);
  return {
    prompt: `The two rows of ${a} × ${b} are ${pl.row1} and ${pl.row2}. What is ${a} × ${b}?`,
    answer: String(pl.total),
    hint: 'The two rows together make the whole answer. Add them, column by column.',
    explain: [`Line up ${pl.row1} and ${pl.row2} by place value.`, `Add the ones, tens, hundreds, carrying when needed.`, `${pl.row1} + ${pl.row2} = ${pl.total}.`],
  };
}

function whyZero(): Question {
  const { a, b } = pair(12, 39, 11, 29);
  const pl = planOf(a, b);
  const right = `We are multiplying by ${pl.r * 10}, so the answers are tens`;
  return {
    prompt: `In ${a} × ${b}, why does the second row start with a 0?`,
    choices: shuffle([right, 'To make the answer look tidy', 'Because the top number is even', 'Because 0 is the smallest digit']).map((value) => ({ value })),
    answer: right,
    hint: `The second row is ${a} × ${pl.r * 10}. What happens when you multiply by a tens number?`,
    explain: [`The second row works out ${a} × ${pl.r * 10}, not ${a} × ${pl.r}.`, `Times tens gives tens, so nothing goes in the ones.`, `${right}.`],
  };
}

function smallMultiply(): Question {
  const a = pick([11, 12, 13, 21, 22, 23, 31, 32]);
  const b = pick([11, 12, 13, 21]);
  return {
    prompt: `${a} × ${b} = ?`,
    visual: <AreaPicture a={a} b={b} />,
    answer: String(a * b),
    hint: 'Do one row for the ones of the bottom number and one row for the tens, then add.',
    explain: workSteps(a, b),
  };
}

function bigMultiply(): Question {
  const { a, b } = pair(23, 49, 13, 29);
  return {
    prompt: `${a} × ${b} = ?`,
    answer: String(a * b),
    hint: 'Multiply by the ones digit, then by the tens digit (start that row with a 0), then add.',
    explain: workSteps(a, b),
  };
}

function spotMistake(): Question {
  const { a, b } = pair(13, 39, 12, 29);
  const pl = planOf(a, b);
  const correct = pl.total;
  const forgotZero = pl.row1 + a * pl.r;
  const digitsOnly = pl.p * pl.r * 100 + pl.q * pl.s;
  const options = [...new Set([correct, forgotZero, digitsOnly, correct + 10])];
  while (options.length < 4) options.push(options[options.length - 1] + 100);
  return {
    prompt: `Three children worked out ${a} × ${b}. Which answer is right?`,
    choices: shuffle(options).map((v) => ({ value: String(v) })),
    answer: String(correct),
    hint: `Estimate first: ${a} × ${b} is a bit more than ${pl.p * 10} × ${pl.r * 10} = ${pl.p * pl.r * 100}.`,
    explain: workSteps(a, b),
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([tensTimesTens, firstRow])();
  if (level === 1) return pick([addRows, whyZero, smallMultiply])();
  return pick([bigMultiply, spotMistake, bigMultiply])();
}

export const longMultiplication: Lesson = {
  id: 'long-multiplication',
  title: 'Column Multiplication',
  Thumb,
  Scene: ColumnScene,
  sceneHint: 'Press Next step to work through the columns · Change the numbers on the left',
  learn: {
    heading: 'Multiplying two 2-digit numbers',
    intro: 'To work out 23 × 14, split it into smaller multiplications. The area model shows the four parts; the column method writes the same parts in two tidy rows.',
    points: [
      { icon: Grid2x2, text: 'The rectangle splits into four parts: tens × tens, tens × ones…' },
      { icon: Columns3, text: 'Row 1 is the top number × the ones. Row 2 is the top number × the tens.' },
      { icon: StepForward, text: 'Row 2 starts with a 0, because multiplying by tens gives tens.' },
      { icon: Plus, text: 'Add the two rows to get the answer.' },
    ],
  },
  steps: [
    'Multiply the top number by the ones digit of the bottom number. Carry when you need to.',
    'Write a 0 in the ones column of the second row.',
    'Multiply the top number by the tens digit and write it after the 0.',
    'Add the two rows together.',
    'Check with an estimate: 23 × 14 is about 20 × 15 = 300.',
  ],
  example: {
    question: 'What is 23 × 14?',
    visual: <AreaPicture a={23} b={14} />,
    work: ['23 × 4 = 92 (first row).', '23 × 10 = 230 (second row).', '92 + 230 = 322.'],
    answer: '23 × 14 = 322',
  },
  grownups: [
    'The area model and the column method are the same idea; showing both side by side explains why the method works.',
    'The most common slip is forgetting the 0 at the start of the second row. Ask “are we multiplying by 1 or by 10?”',
    'Always estimate first (round both numbers) so your child can tell when an answer is way off.',
    'Squared paper keeps the digits lined up in their columns.',
  ],
  makeQuestion,
};
