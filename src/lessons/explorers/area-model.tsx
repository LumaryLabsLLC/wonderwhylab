import { useState } from 'react';
import { Grid2x2, MoveHorizontal, Plus, Scissors } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';

const AREA = { x: 60, y: 130, maxW: 600, maxH: 260 };
const TENS_FILL = shade(C.blue, 0.62);
const ONES_FILL = shade(C.orange, 0.6);

/**
 * An a × b rectangle of unit squares, cut by a vertical line after `split` columns.
 * Drawn as a <g> at (x, y) with squares of size `cell`.
 */
function AreaRect({
  x,
  y,
  a,
  b,
  split,
  cell,
  showProducts = true,
  hideRight = false,
}: {
  x: number;
  y: number;
  a: number;
  b: number;
  split: number;
  cell: number;
  showProducts?: boolean;
  /** Show "?" in the ones part instead of its product. */
  hideRight?: boolean;
}) {
  const W = a * cell;
  const H = b * cell;
  const sx = x + split * cell;
  const right = a - split;
  const leftLabel = showProducts ? `${split} × ${b} = ${split * b}` : `${split} × ${b}`;
  const rightLabel = hideRight ? '?' : showProducts ? `${right} × ${b} = ${right * b}` : `${right} × ${b}`;
  const fs = Math.max(15, Math.min(22, cell * 0.9));
  return (
    <g>
      <rect x={x + 5} y={y + 7} width={W} height={H} rx={4} fill={C.ink} opacity={0.12} />
      <rect x={x} y={y} width={split * cell} height={H} fill={TENS_FILL} />
      <rect x={sx} y={y} width={right * cell} height={H} fill={ONES_FILL} />
      {/* unit grid; every 10th column is drawn thicker, like a ten-rod edge */}
      {Array.from({ length: a + 1 }, (_, i) => (
        <line key={`c${i}`} x1={x + i * cell} y1={y} x2={x + i * cell} y2={y + H} stroke={C.ink} strokeWidth={i % 10 === 0 ? 1.8 : 0.6} opacity={i % 10 === 0 ? 0.7 : 0.35} />
      ))}
      {Array.from({ length: b + 1 }, (_, j) => (
        <line key={`r${j}`} x1={x} y1={y + j * cell} x2={x + W} y2={y + j * cell} stroke={C.ink} strokeWidth={0.6} opacity={0.35} />
      ))}
      <rect x={x} y={y} width={W} height={H} rx={4} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <line x1={sx} y1={y - 6} x2={sx} y2={y + H + 6} stroke={C.ink} strokeWidth={3} />
      {/* side lengths */}
      <text x={x + (split * cell) / 2} y={y - 16} textAnchor="middle" fontSize={20} fontWeight={700} fill={shade(C.blue, -0.35)} className="num">
        {split}
      </text>
      <text x={sx + (right * cell) / 2} y={y - 16} textAnchor="middle" fontSize={20} fontWeight={700} fill={shade(C.orange, -0.4)} className="num">
        {right}
      </text>
      <text x={x - 14} y={y + H / 2} textAnchor="end" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink} className="num">
        {b}
      </text>
      {/* part products, inside when there is room, else under the part */}
      {[
        { cx: x + (split * cell) / 2, w: split * cell, label: leftLabel },
        { cx: sx + (right * cell) / 2, w: right * cell, label: rightLabel },
      ].map((p, i) => {
        const fits = p.w > p.label.length * fs * 0.56 + 10 && H > fs + 10;
        return (
          <text
            key={i}
            x={p.cx}
            y={fits ? y + H / 2 : y + H + 24 + (i ? fs + 4 : 0)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fs}
            fontWeight={700}
            fill={C.ink}
            className="num"
          >
            {p.label}
          </text>
        );
      })}
    </g>
  );
}

function AreaScene() {
  const [tens, setTens] = useState(2);
  const [ones, setOnes] = useState(3);
  const [b, setB] = useState(4);
  const a = tens * 10 + ones;
  const [split, setSplit] = useState(20);
  const s = clamp(split, 1, a - 1);
  const cell = Math.min(AREA.maxW / a, AREA.maxH / b, 40);
  const H = b * cell;

  const drag = useSvgDrag((p) => {
    const next = clamp(Math.round((p.x - AREA.x) / cell), 1, a - 1);
    if (next !== s) {
      setSplit(next);
      play('tap');
    }
  });

  const change = (t: number, o: number, by: number) => {
    setTens(t);
    setOnes(o);
    setB(by);
    setSplit(t * 10);
    play('pop');
  };

  const left = s * b;
  const right = (a - s) * b;
  const atTens = s === tens * 10;
  const handleX = AREA.x + s * cell;

  return (
    <SceneSvg label={`${a} times ${b} split into ${s} times ${b} plus ${a - s} times ${b}`}>
      <AreaRect x={AREA.x} y={AREA.y} a={a} b={b} split={s} cell={cell} />

      {/* drag handle on the split line */}
      <g {...drag}>
        <rect x={handleX - 26} y={AREA.y - 70} width={52} height={H + 90} fill="transparent" />
        <circle cx={handleX} cy={AREA.y - 48} r={20} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
        <path d={`M${handleX - 10},${AREA.y - 48} l6,-6 v12 z M${handleX + 10},${AREA.y - 48} l-6,-6 v12 z`} fill={C.ink} />
      </g>

      {/* the number sentence */}
      <g className="num">
        <text x={AREA.x} y={AREA.y + AREA.maxH + 100} fontSize={26} fontWeight={700} fill={C.ink}>
          {a} × {b} = <tspan fill={shade(C.blue, -0.35)}>{s} × {b}</tspan> + <tspan fill={shade(C.orange, -0.4)}>{a - s} × {b}</tspan>
        </text>
        <text x={AREA.x} y={AREA.y + AREA.maxH + 146} fontSize={26} fontWeight={700} fill={C.ink}>
          = <tspan fill={shade(C.blue, -0.35)}>{left}</tspan> + <tspan fill={shade(C.orange, -0.4)}>{right}</tspan> = {a * b}
        </text>
        {!atTens && (
          <text x={AREA.x} y={AREA.y + AREA.maxH + 186} fontSize={17} fill={C.muted}>
            Any split works! Splitting at the tens ({tens * 10} + {ones}) is the easiest to work out.
          </text>
        )}
      </g>

      {/* controls */}
      <NumberCard x={710} y={30} w={260} h={96} value={`${a} × ${b}`} />
      {[
        { label: 'Tens', value: tens, dec: () => change(tens - 1, ones, b), inc: () => change(tens + 1, ones, b), min: tens <= 1, max: tens >= 5 },
        { label: 'Ones', value: ones, dec: () => change(tens, ones - 1, b), inc: () => change(tens, ones + 1, b), min: ones <= 1, max: ones >= 9 },
        { label: 'Times', value: b, dec: () => change(tens, ones, b - 1), inc: () => change(tens, ones, b + 1), min: b <= 2, max: b >= 9 },
      ].map((row, i) => (
        <g key={row.label}>
          <text x={710} y={182 + i * 72} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
            {row.label}
          </text>
          <SvgButton x={800} y={156 + i * 72} w={52} h={50} label="−" title={`Less ${row.label.toLowerCase()}`} onClick={row.dec} disabled={row.min} />
          <text x={886} y={182 + i * 72} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.ink} className="num">
            {row.value}
          </text>
          <SvgButton x={918} y={156 + i * 72} w={52} h={50} label="+" title={`More ${row.label.toLowerCase()}`} onClick={row.inc} disabled={row.max} color={C.yellow} />
        </g>
      ))}
      <SvgButton x={710} y={384} w={260} h={52} fontSize={18} label="Split at the tens" active={atTens} onClick={() => setSplit(tens * 10)} color={C.teal} textColor={C.white} />

      <Callout at={[handleX, AREA.y - 48]} box={[420, 22]} w={240} icon={MoveHorizontal} title="Slide the cut" text="Drag the yellow handle to split the rectangle into two parts." />
      <Callout at={[AREA.x + (s * cell) / 2, AREA.y + H / 2]} box={[710, 468]} w={260} icon={Plus} title="Add the parts" text="Each part is a small times fact. The two parts together make the whole." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={18} width={70} height={44} fill={TENS_FILL} stroke={C.ink} strokeWidth={2} />
      <rect x={80} y={18} width={28} height={44} fill={ONES_FILL} stroke={C.ink} strokeWidth={2} />
      <text x={45} y={44} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>
        20×4
      </text>
      <text x={94} y={44} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>
        3×4
      </text>
    </svg>
  );
}

/** A small area model for question cards. */
function AreaPicture({ a, b, split, showProducts = false, hideRight = false }: { a: number; b: number; split: number; showProducts?: boolean; hideRight?: boolean }) {
  const cell = Math.min(420 / a, 120 / b, 26);
  const W = a * cell;
  const H = b * cell;
  return (
    <svg viewBox={`-40 -40 ${W + 60} ${H + 64}`} role="img" aria-label={`A rectangle ${a} by ${b}, split into ${split} and ${a - split}`}>
      <AreaRect x={0} y={0} a={a} b={b} split={split} cell={cell} showProducts={showProducts} hideRight={hideRight} />
    </svg>
  );
}

function splitSteps(a: number, b: number): string[] {
  const t = Math.floor(a / 10) * 10;
  const o = a % 10;
  return [`Split ${a} into ${t} + ${o}.`, `${t} × ${b} = ${t * b} and ${o} × ${b} = ${o * b}.`, `${t * b} + ${o * b} = ${a * b}, so ${a} × ${b} = ${a * b}.`];
}

function twoDigit(maxTens: number): number {
  return rand(1, maxTens) * 10 + rand(1, 9);
}

/** Level 0: one part of the model, or adding the two parts. */
function partQuestion(): Question {
  const a = twoDigit(4);
  const b = rand(2, 5);
  const t = Math.floor(a / 10) * 10;
  const o = a % 10;
  if (Math.random() < 0.5) {
    const ans = t * b;
    return {
      prompt: `What is the blue part, ${t} × ${b}?`,
      visual: <AreaPicture a={a} b={b} split={t} />,
      choices: numberChoices(ans, { min: 10, step: 10, spread: 3 }).map((value) => ({ value })),
      answer: String(ans),
      hint: `${t} is ${t / 10} tens. Work out ${t / 10} × ${b} first, then think in tens.`,
      explain: [`${t} × ${b} means ${b} rows of ${t}.`, `${t / 10} tens × ${b} = ${(t / 10) * b} tens.`, `${(t / 10) * b} tens = ${ans}.`],
    };
  }
  const ans = a * b;
  return {
    prompt: `The parts are ${t * b} and ${o * b}. What is ${a} × ${b}?`,
    visual: <AreaPicture a={a} b={b} split={t} showProducts />,
    choices: numberChoices(ans, { min: 10, spread: 4, step: 2 }).map((value) => ({ value })),
    answer: String(ans),
    hint: 'The whole rectangle is the two parts put together.',
    explain: [`The blue part is ${t} × ${b} = ${t * b}.`, `The orange part is ${o} × ${b} = ${o * b}.`, `${t * b} + ${o * b} = ${ans}.`],
  };
}

function multiply(maxTens: number, minB: number, maxB: number): Question {
  const a = twoDigit(maxTens);
  const b = rand(minB, maxB);
  return {
    prompt: `${a} × ${b} = ?`,
    visual: <AreaPicture a={a} b={b} split={Math.floor(a / 10) * 10} />,
    answer: String(a * b),
    hint: 'Split the big number into tens and ones, and multiply each part.',
    explain: splitSteps(a, b),
  };
}

function whichSplit(): Question {
  const a = twoDigit(9);
  const b = rand(3, 9);
  const t = Math.floor(a / 10) * 10;
  const o = a % 10;
  const right = `${t} × ${b} + ${o} × ${b}`;
  const wrong = [`${t} × ${b} + ${o}`, `${t / 10} × ${b} + ${o} × ${b}`, `${t} + ${o} × ${b}`];
  return {
    prompt: `Which is the same as ${a} × ${b}?`,
    choices: shuffle([right, ...wrong]).map((value) => ({ value })),
    answer: right,
    hint: 'Split the big number, then check that BOTH parts are multiplied.',
    explain: [`Split ${a} into ${t} + ${o}.`, `Both parts get multiplied by ${b}.`, `So ${a} × ${b} = ${right}.`],
  };
}

function missingPart(): Question {
  const a = twoDigit(9);
  const b = rand(3, 9);
  const t = Math.floor(a / 10) * 10;
  const o = a % 10;
  return {
    prompt: `${a} × ${b} = ${t * b} + ?`,
    visual: <AreaPicture a={a} b={b} split={t} showProducts hideRight />,
    answer: String(o * b),
    hint: `${t * b} is the tens part. What is left of ${a} after the tens?`,
    explain: [`${a} = ${t} + ${o}.`, `${t} × ${b} = ${t * b}, so the missing part is ${o} × ${b}.`, `${o} × ${b} = ${o * b}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return partQuestion();
  if (level === 1) return Math.random() < 0.7 ? multiply(5, 3, 6) : partQuestion();
  return pick([() => multiply(9, 4, 9), whichSplit, missingPart])();
}

export const areaModel: Lesson = {
  id: 'area-model',
  title: 'Area Model',
  Thumb,
  Scene: AreaScene,
  sceneHint: 'Drag the yellow handle to cut · Change the numbers on the right',
  learn: {
    heading: 'The area model',
    intro: 'A times fact can be a rectangle: 23 × 4 is 4 rows of 23 squares. Cut it into tens and ones and you get two easy facts to add.',
    points: [
      { icon: Grid2x2, text: 'The rectangle has rows × columns squares.' },
      { icon: Scissors, text: 'Cut the big number into tens and ones.' },
      { icon: Plus, text: 'Multiply each part, then add the parts.' },
    ],
  },
  steps: [
    'Split the big number into tens and ones: 23 = 20 + 3.',
    'Multiply the tens: 20 × 4 = 80.',
    'Multiply the ones: 3 × 4 = 12.',
    'Add the two parts: 80 + 12 = 92.',
  ],
  example: {
    question: 'What is 23 × 4?',
    visual: <AreaPicture a={23} b={4} split={20} showProducts />,
    work: ['Split 23 into 20 + 3.', '20 × 4 = 80 and 3 × 4 = 12.', '80 + 12 = 92.'],
    answer: '23 × 4 = 92',
  },
  grownups: [
    'This is the same idea as the written method later on (the distributive property), so it builds real understanding.',
    'Draw rectangles on squared paper and cut them in different places: every split gives the same total.',
    'Say the tens fact as tens: “2 tens times 4 is 8 tens, which is 80.”',
    'Once this feels easy, try splitting both numbers (23 × 14) into four parts.',
  ],
  makeQuestion,
};
