import { useState } from 'react';
import { Blend, Copy, Divide, Paintbrush } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { pick, rand, round, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

const JARS = { x: 60, y: 84, w: 92, gap: 22, unit: 18 };
const DNL = { x: 110, y1: 400, y2: 470, w: 540, max: 6 };
const MAX_PART = 6;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function lerpHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Paint-style mix: blue → green → yellow as the share of yellow grows. Same ratio, same colour. */
function mixColour(blue: number, yellow: number) {
  const t = yellow / (blue + yellow);
  return t < 0.5 ? lerpHex(C.blue, C.green, t * 2) : lerpHex(C.green, C.yellow, (t - 0.5) * 2);
}

/** One batch of the recipe: a jar with `a` blue scoops and `b` yellow scoops. */
function Jar({ x, y, a, b, w = JARS.w, unit = JARS.unit }: { x: number; y: number; a: number; b: number; w?: number; unit?: number }) {
  const h = MAX_PART * unit + 16;
  const col = (w - 18) / 2;
  return (
    <g>
      <rect x={x + 4} y={y + 6} width={w} height={h} rx={12} fill={C.ink} opacity={0.1} />
      <rect x={x} y={y} width={w} height={h} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: a }, (_, i) => (
        <rect key={`a${i}`} x={x + 6} y={y + h - 8 - (i + 1) * unit} width={col} height={unit - 3} rx={4} fill={C.blue} stroke={C.ink} strokeWidth={1.4} />
      ))}
      {Array.from({ length: b }, (_, i) => (
        <rect key={`b${i}`} x={x + 12 + col} y={y + h - 8 - (i + 1) * unit} width={col} height={unit - 3} rx={4} fill={C.yellow} stroke={C.ink} strokeWidth={1.4} />
      ))}
    </g>
  );
}

function RatioScene() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [k, setK] = useState(2);

  const set = (na: number, nb: number, nk: number) => {
    setA(na);
    setB(nb);
    setK(nk);
    play('pop');
  };

  const tickX = (i: number) => DNL.x + (DNL.w * i) / DNL.max;
  const drag = useSvgDrag((p) => {
    const nk = clamp(Math.round(((p.x - DNL.x) / DNL.w) * DNL.max), 1, 5);
    if (nk !== k) {
      setK(nk);
      play('tap');
    }
  });

  const g = gcd(a, b);
  const chain = Array.from({ length: 4 }, (_, i) => `${a * (i + 1)} : ${b * (i + 1)}`).join(' = ');
  const rate = fmt(round(b / a, 2));
  const colour = mixColour(a, b);

  return (
    <SceneSvg label={`${a} blue for every ${b} yellow, ${k} batches: ${a * k} blue and ${b * k} yellow`}>
      <text x={JARS.x} y={JARS.y - 22} fontSize={16} fill={C.muted} className="caps">
        {k} {k === 1 ? 'batch' : 'batches'} of the recipe
      </text>
      {Array.from({ length: k }, (_, i) => (
        <g key={i} className="pop-in" style={{ transformOrigin: `${JARS.x + i * (JARS.w + JARS.gap) + JARS.w / 2}px ${JARS.y + 60}px` }}>
          <Jar x={JARS.x + i * (JARS.w + JARS.gap)} y={JARS.y} a={a} b={b} />
        </g>
      ))}

      {/* double number line */}
      {[
        { y: DNL.y1, per: a, label: 'Blue', colour: C.blue },
        { y: DNL.y2, per: b, label: 'Yellow', colour: shade(C.yellow, -0.3) },
      ].map((row) => (
        <g key={row.label}>
          <text x={DNL.x - 14} y={row.y} textAnchor="end" dominantBaseline="central" fontSize={17} fontWeight={700} fill={row.colour}>
            {row.label}
          </text>
          <line x1={DNL.x} y1={row.y} x2={DNL.x + DNL.w} y2={row.y} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
          {Array.from({ length: DNL.max + 1 }, (_, i) => (
            <g key={i}>
              <line x1={tickX(i)} y1={row.y - 8} x2={tickX(i)} y2={row.y + 8} stroke={C.ink} strokeWidth={2} />
              <text x={tickX(i)} y={row.y === DNL.y1 ? row.y - 20 : row.y + 26} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={i === k ? 700 : 500} fill={i === k ? C.ink : C.muted} className="num">
                {row.per * i}
              </text>
            </g>
          ))}
        </g>
      ))}
      {/* the draggable "batch" window joining both lines */}
      <g {...drag}>
        <rect x={DNL.x - 20} y={DNL.y1 - 44} width={DNL.w + 40} height={DNL.y2 - DNL.y1 + 88} fill="transparent" />
        <rect x={tickX(k) - 24} y={DNL.y1 - 38} width={48} height={DNL.y2 - DNL.y1 + 76} rx={14} fill={C.yellow} opacity={0.3} stroke={C.ink} strokeWidth={2} />
      </g>

      <text x={DNL.x - 50} y={548} fontSize={22} fontWeight={700} fill={C.ink} className="num">
        {chain}
      </text>
      <text x={DNL.x - 50} y={588} fontSize={18} fill={C.ink2}>
        For every 1 blue scoop there are <tspan fontWeight={700}>{rate}</tspan> yellow scoops.
      </text>
      {g > 1 && (
        <text x={DNL.x - 50} y={622} fontSize={18} fill={C.ink2} className="num">
          Simplest form: {a / g} : {b / g}
        </text>
      )}

      {/* mixed paint and controls */}
      <ellipse cx={839} cy={196} rx={86} ry={16} fill={C.ink} opacity={0.12} />
      <path d="M745,90 h180 l-12,96 a78,22 0 0 1 -156,0 z" fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={835} cy={92} rx={90} ry={20} fill={colour} stroke={C.ink} strokeWidth={2.5} />
      <text x={835} y={60} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.ink} className="num">
        {a} : {b}
      </text>
      {[
        { label: 'Blue', value: a, dec: () => set(a - 1, b, k), inc: () => set(a + 1, b, k), min: a <= 1, max: a >= MAX_PART },
        { label: 'Yellow', value: b, dec: () => set(a, b - 1, k), inc: () => set(a, b + 1, k), min: b <= 1, max: b >= MAX_PART },
        { label: 'Batches', value: k, dec: () => set(a, b, k - 1), inc: () => set(a, b, k + 1), min: k <= 1, max: k >= 5 },
      ].map((row, i) => (
        <g key={row.label}>
          <text x={710} y={252 + i * 66} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">{row.label}</text>
          <SvgButton x={800} y={226 + i * 66} w={52} h={50} label="−" title={`Less ${row.label.toLowerCase()}`} onClick={row.dec} disabled={row.min} />
          <text x={886} y={252 + i * 66} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.ink} className="num">{row.value}</text>
          <SvgButton x={918} y={226 + i * 66} w={52} h={50} label="+" title={`More ${row.label.toLowerCase()}`} onClick={row.inc} disabled={row.max} color={C.yellow} />
        </g>
      ))}

      <Callout at={[835, 120]} box={[700, 440]} w={260} icon={Blend} title="Same colour" text="More batches make more paint, but the colour stays the same because the ratio is the same." />
      <Callout at={[tickX(k), DNL.y1 - 38]} box={[380, 234]} w={280} icon={Copy} title="Double number line" text="Drag the yellow window. Both lines grow by the same number of batches." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(6 6) scale(0.5)">
        <Jar x={0} y={0} a={2} b={3} w={80} unit={18} />
        <Jar x={88} y={0} a={2} b={3} w={80} unit={18} />
      </g>
      <text x={106} y={44} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
        2:3
      </text>
    </svg>
  );
}

/** A double number line for question cards, with a "?" at the asked spot. */
function DoubleLinePicture({ a, b, upto, ask }: { a: number; b: number; upto: number; ask: { row: 'top' | 'bottom'; at: number } }) {
  const w = 440;
  const x = (i: number) => (w * i) / upto;
  return (
    <svg viewBox={`-80 -40 ${w + 110} 130`} role="img" aria-label={`Double number line: ${a} to ${b}`}>
      {[
        { y: 10, per: a, label: 'Blue', row: 'top' as const },
        { y: 60, per: b, label: 'Yellow', row: 'bottom' as const },
      ].map((r) => (
        <g key={r.label}>
          <text x={-12} y={r.y} textAnchor="end" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>
            {r.label}
          </text>
          <line x1={0} y1={r.y} x2={w} y2={r.y} stroke={C.ink} strokeWidth={2.5} />
          {Array.from({ length: upto + 1 }, (_, i) => {
            const hidden = ask.row === r.row && ask.at === i;
            const shown = i <= 1 || hidden || (ask.row !== r.row && ask.at === i);
            return (
              <g key={i}>
                <line x1={x(i)} y1={r.y - 7} x2={x(i)} y2={r.y + 7} stroke={C.ink} strokeWidth={2} />
                {shown && (
                  <text x={x(i)} y={r.row === 'top' ? r.y - 20 : r.y + 24} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={hidden ? C.red : C.ink} className="num">
                    {hidden ? '?' : r.per * i}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/** Level 0: scale a ratio up by a whole number of batches. */
function scaleUp(): Question {
  const a = rand(1, 5);
  let b = rand(1, 5);
  if (b === a) b = a + 1;
  const m = rand(2, 5);
  const askBlue = Math.random() < 0.4;
  const answer = askBlue ? a * m : b * m;
  const given = askBlue ? `${b * m} yellow` : `${a * m} blue`;
  return {
    prompt: `Paint is mixed ${a} blue : ${b} yellow. How much ${askBlue ? 'blue' : 'yellow'} goes with ${given}?`,
    visual: <DoubleLinePicture a={a} b={b} upto={m} ask={{ row: askBlue ? 'top' : 'bottom', at: m }} />,
    answer: String(answer),
    hint: `How many batches of the recipe is ${given}?`,
    explain: [
      `${given} is ${m} batches, because ${askBlue ? `${b * m} ÷ ${b}` : `${a * m} ÷ ${a}`} = ${m}.`,
      `Each batch has ${askBlue ? `${a} blue` : `${b} yellow`}.`,
      `${m} × ${askBlue ? a : b} = ${answer}.`,
    ],
  };
}

/** Level 1: spot the equivalent ratio. */
function equivalent(): Question {
  const a = rand(1, 5);
  let b = rand(2, 6);
  if (b === a) b += 1;
  const m = rand(2, 4);
  const right = `${a * m} : ${b * m}`;
  const ratio = a / b;
  const wrong = new Set<string>();
  for (const [p, q] of shuffle([
    [a + m, b + m],
    [a * m, b * m + 1],
    [b * m, a * m],
    [a + 1, b + 1],
    [a * m, b + m],
  ])) {
    if (Math.abs(p / q - ratio) > 1e-9 && `${p} : ${q}` !== right) wrong.add(`${p} : ${q}`);
  }
  return {
    prompt: `Which ratio is the same as ${a} : ${b}?`,
    choices: shuffle([right, ...[...wrong].slice(0, 3)]).map((value) => ({ value })),
    answer: right,
    hint: 'Equal ratios are whole batches: multiply BOTH parts by the same number.',
    explain: [`Make ${m} batches of ${a} : ${b}.`, `${a} × ${m} = ${a * m} and ${b} × ${m} = ${b * m}.`, `So ${a} : ${b} = ${right}.`],
  };
}

/** Level 1: simplest form. */
function simplest(): Question {
  const pairs: [number, number][] = [
    [2, 3], [3, 2], [1, 4], [3, 4], [4, 3], [2, 5], [5, 2], [3, 5], [1, 3], [4, 5],
  ];
  const [a, b] = pick(pairs);
  const m = rand(2, 6);
  const right = `${a} : ${b}`;
  const wrong = new Set<string>();
  for (const w of shuffle([`${b} : ${a}`, `${a + 1} : ${b}`, `${a} : ${b + 1}`, `${a * m - 1} : ${b * m - 1}`])) {
    const [p, q] = w.split(' : ').map(Number);
    if (p > 0 && q > 0 && w !== right && Math.abs(p / q - a / b) > 1e-9) wrong.add(w);
  }
  return {
    prompt: `Write ${a * m} : ${b * m} in its simplest form.`,
    choices: shuffle([right, ...[...wrong].slice(0, 3)]).map((value) => ({ value })),
    answer: right,
    hint: 'Find the biggest number that divides into both parts.',
    explain: [`${m} divides into both ${a * m} and ${b * m}.`, `${a * m} ÷ ${m} = ${a} and ${b * m} ÷ ${m} = ${b}.`, `The simplest form is ${right}.`],
  };
}

/** Level 2: scale by a non-whole amount (a recipe for 2 → for 5). */
function recipe(): Question {
  const flour = pick([1, 3, 5, 7]);
  const n = pick([3, 5, 7, 9]);
  const answer = (flour * n) / 2;
  return {
    prompt: `${flour} ${flour === 1 ? 'cup' : 'cups'} of flour make 2 cakes. How many cups make ${n} cakes?`,
    answer: String(answer),
    allowDecimal: true,
    hint: 'Find how much flour ONE cake needs first (the unit rate).',
    explain: [`For 1 cake: ${flour} ÷ 2 = ${fmt(flour / 2)} cups.`, `For ${n} cakes: ${n} × ${fmt(flour / 2)}.`, `That is ${fmt(answer)} cups.`],
  };
}

/** Level 2: share an amount in a ratio. */
function share(): Question {
  const a = rand(1, 4);
  let b = rand(2, 5);
  if (b === a) b += 1;
  const m = rand(2, 8);
  const total = (a + b) * m;
  const bigger = Math.max(a, b) * m;
  return {
    prompt: `Share ${total} stickers in the ratio ${a} : ${b}. How many are in the bigger share?`,
    answer: String(bigger),
    hint: 'Count the parts in the ratio, then find what one part is worth.',
    explain: [`${a} + ${b} = ${a + b} parts.`, `One part is ${total} ÷ ${a + b} = ${m}.`, `The bigger share is ${Math.max(a, b)} × ${m} = ${bigger}.`],
  };
}

/** Level 2: unit rate from a speed. */
function unitRate(): Question {
  const per = rand(4, 12) * 5;
  const hours = rand(2, 4);
  return {
    prompt: `A train goes ${per * hours} km in ${hours} hours at a steady speed. How far does it go in 1 hour?`,
    answer: String(per),
    hint: 'One hour is one equal share of the whole trip.',
    explain: [`The trip is ${hours} equal hours.`, `${per * hours} ÷ ${hours} = ${per}.`, `It goes ${per} km in 1 hour.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return scaleUp();
  if (level === 1) return pick([equivalent, simplest, scaleUp])();
  return pick([recipe, share, unitRate, equivalent])();
}

export const ratios: Lesson = {
  id: 'ratios',
  title: 'Ratios',
  Thumb,
  Scene: RatioScene,
  sceneHint: 'Change the recipe · Drag the yellow window along the lines',
  learn: {
    heading: 'Ratios',
    intro: 'A ratio compares amounts: 2 : 3 means “for every 2 blue, there are 3 yellow”. Make more batches and both parts grow together, so the mix stays the same.',
    points: [
      { icon: Paintbrush, text: '2 : 3 means 2 parts of one thing for every 3 parts of another.' },
      { icon: Copy, text: 'Multiply both parts by the same number to get an equal ratio.' },
      { icon: Divide, text: 'Divide to find the unit rate: how much for just 1.' },
    ],
  },
  steps: [
    'Read the ratio as “for every …, there are …”.',
    'To scale up, find how many batches you need and multiply both parts.',
    'To simplify, divide both parts by the same number.',
    'Check with a double number line: both lines must use the same number of batches.',
  ],
  example: {
    question: 'Paint is 2 blue : 3 yellow. How much yellow goes with 8 blue?',
    visual: <DoubleLinePicture a={2} b={3} upto={4} ask={{ row: 'bottom', at: 4 }} />,
    work: ['8 blue is 4 batches of 2 blue.', 'Each batch has 3 yellow, so 4 × 3 = 12.'],
    answer: '12 yellow goes with 8 blue.',
  },
  grownups: [
    'Cooking is ratio practice: doubling or halving a recipe keeps every ingredient in the same ratio.',
    'Watch for “add the same amount” — 2 : 3 is not the same as 4 : 5. Multiply, don’t add.',
    'Squash or juice mixing (1 part squash to 4 parts water) is a great real example.',
    'Ratios lead straight on to fractions, percentages, scale drawings and speed.',
  ],
  makeQuestion,
};
