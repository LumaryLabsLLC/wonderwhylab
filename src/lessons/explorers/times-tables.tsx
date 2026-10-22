import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Columns3, Repeat, Rows3 } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, RAINBOW, shade } from '../../lib/color';
import { numberChoices, pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { iso, IsoBox } from '../../visuals/Iso';
import { ArrayPicture } from './visuals/ArrayPicture';

const N = 10;
const CELL = 34;
const PAD = 16;
const MAT = { size: PAD * 2 + CELL * N, h: 14, ox: 372, oy: 178 };

/** Screen position of the centre of cell (row, col) on top of the mat. */
function cellAt(r: number, c: number, z = MAT.h): [number, number] {
  const [x, y] = iso(PAD + c * CELL + CELL / 2, PAD + r * CELL + CELL / 2, z);
  return [MAT.ox + x, MAT.oy + y];
}

function diamond(r: number, c: number): string {
  const x0 = PAD + c * CELL;
  const y0 = PAD + r * CELL;
  return [
    iso(x0, y0, MAT.h),
    iso(x0 + CELL, y0, MAT.h),
    iso(x0 + CELL, y0 + CELL, MAT.h),
    iso(x0, y0 + CELL, MAT.h),
  ]
    .map(([x, y]) => `${MAT.ox + x},${MAT.oy + y}`)
    .join(' ');
}

function Counter({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 1} rx={13} ry={7.5} fill={shade(color, -0.4)} stroke={C.ink} strokeWidth={1.5} />
      <rect x={x - 13} y={y - 5} width={26} height={6} fill={shade(color, -0.25)} />
      <line x1={x - 13} y1={y - 5} x2={x - 13} y2={y + 1} stroke={C.ink} strokeWidth={1.5} />
      <line x1={x + 13} y1={y - 5} x2={x + 13} y2={y + 1} stroke={C.ink} strokeWidth={1.5} />
      <ellipse cx={x} cy={y - 5} rx={13} ry={7.5} fill={color} stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
}

function TimesScene() {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);
  /** How many rows have been counted in the skip-count animation (null = not counting). */
  const [counted, setCounted] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const set = (r: number, c: number) => {
    window.clearInterval(timer.current);
    setCounted(null);
    setRows(r);
    setCols(c);
    play('pop');
  };

  const countRows = () => {
    window.clearInterval(timer.current);
    let k = 1;
    setCounted(1);
    speak(String(cols));
    timer.current = window.setInterval(() => {
      k += 1;
      if (k > rows) {
        window.clearInterval(timer.current);
        speak(`${rows} times ${cols} is ${rows * cols}!`);
        play('correct');
        return;
      }
      setCounted(k);
      play('tap');
      speak(String(k * cols));
    }, 900);
  };

  const total = rows * cols;
  const rowLabel = (r: number): [number, number] => {
    const [x, y] = iso(-14, PAD + r * CELL + CELL / 2, MAT.h);
    return [MAT.ox + x, MAT.oy + y];
  };
  const colLabel = (c: number): [number, number] => {
    const [x, y] = iso(PAD + c * CELL + CELL / 2, -14, MAT.h);
    return [MAT.ox + x, MAT.oy + y];
  };

  return (
    <SceneSvg label={`An array of ${rows} rows and ${cols} columns: ${rows} times ${cols} equals ${total}`}>
      {/* Mat */}
      <g transform={`translate(${MAT.ox} ${MAT.oy})`}>
        <polygon
          points={[iso(-6, -6, -8), iso(MAT.size + 16, -6, -8), iso(MAT.size + 16, MAT.size + 16, -8), iso(-6, MAT.size + 16, -8)]
            .map((p) => p.join(','))
            .join(' ')}
          fill={C.ink}
          opacity={0.1}
        />
        <IsoBox w={MAT.size} d={MAT.size} h={MAT.h} color={C.wood} />
      </g>

      {/* Holes, tap targets and counters (back to front) */}
      {Array.from({ length: N }, (_, r) =>
        Array.from({ length: N }, (_, c) => {
          const [x, y] = cellAt(r, c);
          const on = r < rows && c < cols;
          const color = RAINBOW[r % RAINBOW.length];
          const dim = counted !== null && r >= counted;
          return (
            <g key={`${r}-${c}`} onClick={() => set(r + 1, c + 1)} style={{ cursor: 'pointer' }} data-nopan>
              <polygon points={diamond(r, c)} fill="transparent" />
              {on ? (
                <g opacity={dim ? 0.35 : 1}>
                  <Counter x={x} y={y} color={color} />
                </g>
              ) : (
                <ellipse cx={x} cy={y} rx={5} ry={3} fill="#cfae78" />
              )}
            </g>
          );
        }),
      )}

      {/* Row and column numbers along the mat edges */}
      {Array.from({ length: N }, (_, i) => {
        const [rx, ry] = rowLabel(i);
        const [cx, cy] = colLabel(i);
        return (
          <g key={i} className="num">
            <text x={rx} y={ry} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={i < rows ? shade(RAINBOW[i % RAINBOW.length], -0.3) : C.line}>
              {i + 1}
            </text>
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={i < cols ? C.ink : C.line}>
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* Running totals while skip counting */}
      {counted !== null &&
        Array.from({ length: counted }, (_, r) => {
          const [x, y] = cellAt(r, cols - 1);
          return (
            <g key={r} className="pop-in" style={{ transformOrigin: `${x + 40}px ${y + 6}px` }}>
              <rect x={x + 20} y={y - 8} width={42} height={28} rx={8} fill={C.ink} />
              <text x={x + 41} y={y + 6} textAnchor="middle" dominantBaseline="central" fill={C.white} fontSize={17} fontWeight={700} className="num">
                {(r + 1) * cols}
              </text>
            </g>
          );
        })}

      {/* Equation readout */}
      <g>
        <rect x={714} y={126} width={256} height={112} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
        <rect x={714} y={126} width={256} height={112} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={842} y={170} textAnchor="middle" dominantBaseline="central" fontSize={38} fontWeight={700} fill={C.ink} className="num">
          {rows} × {cols}
        </text>
        <text x={842} y={214} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.teal} className="num">
          = {total}
        </text>
        <text x={842} y={268} textAnchor="middle" fontSize={17} fill={C.ink2}>
          and {cols} × {rows} = {total} too!
        </text>
      </g>

      {/* Steppers */}
      <text x={716} y={312} fontSize={16} fill={C.muted} className="caps">Rows</text>
      <SvgButton x={714} y={322} w={60} h={52} label="−" title="One less row" onClick={() => set(rows - 1, cols)} disabled={rows <= 1} />
      <text x={842} y={349} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {rows}
      </text>
      <SvgButton x={910} y={322} w={60} h={52} label="+" title="One more row" onClick={() => set(rows + 1, cols)} disabled={rows >= N} color={C.yellow} />

      <text x={716} y={404} fontSize={16} fill={C.muted} className="caps">Columns</text>
      <SvgButton x={714} y={414} w={60} h={52} label="−" title="One less column" onClick={() => set(rows, cols - 1)} disabled={cols <= 1} />
      <text x={842} y={441} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {cols}
      </text>
      <SvgButton x={910} y={414} w={60} h={52} label="+" title="One more column" onClick={() => set(rows, cols + 1)} disabled={cols >= N} color={C.yellow} />

      <SvgButton x={714} y={498} w={256} h={50} fontSize={18} label="Turn it around" onClick={() => set(cols, rows)} />
      <SvgButton x={714} y={566} w={256} h={50} fontSize={18} label={`Count in ${cols}s`} onClick={countRows} color={C.teal} textColor={C.white} />

      <Callout at={rowLabel(Math.min(rows, 3) - 1)} box={[40, 70]} w={220} icon={Rows3} title="Rows" text="Each row is one equal group. Rows go across." />
      <Callout at={colLabel(Math.min(cols, 5) - 1)} box={[440, 40]} w={230} icon={Columns3} title="Columns" text="The column numbers tell how many are in each row." />
      <Callout
        at={cellAt(rows - 1, 0, MAT.h + 4)}
        box={[40, 548]}
        w={250}
        icon={Repeat}
        title="Equal groups"
        text={`${rows} rows of ${cols} is ${rows} × ${cols}. Tap any spot to make a new array.`}
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={20 + c * 18} cy={18 + r * 18} r={7} fill={RAINBOW[r]} stroke={C.ink} strokeWidth={1.5} />
        )),
      )}
      <text x={100} y={44} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.ink}>
        ×
      </text>
    </svg>
  );
}

/** "3, 6, 9, 12" — counting in steps of `step`, `times` times. */
const skipCount = (step: number, times: number) => Array.from({ length: times }, (_, i) => step * (i + 1)).join(', ');

function makeQuestion(level: number): Question {
  if (level === 0) {
    const rows = rand(2, 5);
    const cols = rand(2, 5);
    return {
      prompt: `${rows} rows of ${cols}. How many in all?`,
      visual: <ArrayPicture rows={rows} cols={cols} />,
      choices: numberChoices(rows * cols, { min: 1, max: 30, spread: 3 }).map((value) => ({ value })),
      answer: String(rows * cols),
      hint: `Count in ${cols}s, once for each row.`,
      explain: [
        `There are ${rows} rows with ${cols} in each row.`,
        `Count in ${cols}s: ${skipCount(cols, rows)}.`,
        `${rows} × ${cols} = ${rows * cols}.`,
      ],
    };
  }
  if (level === 1) {
    const a = pick([2, 3, 4, 5, 10]);
    const b = rand(1, 10);
    const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
    return {
      prompt: `${x} × ${y} = ?`,
      answer: String(x * y),
      hint: `Count up in ${a}s, ${b} times.`,
      explain: [
        `${x} × ${y} is ${b} ${b === 1 ? 'group' : 'groups'} of ${a}.`,
        `Count in ${a}s: ${skipCount(a, b)}.`,
        `${x} × ${y} = ${x * y}.`,
      ],
    };
  }
  const a = rand(2, 10);
  const b = rand(3, 10);
  if (Math.random() < 0.3) {
    return {
      prompt: `? × ${b} = ${a * b}`,
      speak: `What times ${b} equals ${a * b}?`,
      answer: String(a),
      hint: `Count up in ${b}s until you reach ${a * b}. How many jumps?`,
      explain: [`Count in ${b}s: ${skipCount(b, a)}.`, `That is ${a} jumps of ${b}.`, `${a} × ${b} = ${a * b}, so the missing number is ${a}.`],
    };
  }
  return {
    prompt: `${a} × ${b} = ?`,
    answer: String(a * b),
    hint: `Use a fact you know: ${a} × ${b - 1}, then add one more ${a}.`,
    explain: [`${a} × ${b - 1} = ${a * (b - 1)}.`, `Add one more ${a}: ${a * (b - 1)} + ${a} = ${a * b}.`, `So ${a} × ${b} = ${a * b}.`],
  };
}

export const timesTables: Lesson = {
  id: 'times-tables',
  title: 'Times Tables',
  Thumb,
  Scene: TimesScene,
  sceneHint: 'Tap a spot to build an array · Use + and − to change it',
  learn: {
    heading: 'Times tables',
    intro: 'Multiplying is a quick way to add equal groups. 4 × 6 means 4 groups of 6. Lay them out in rows and you get an array!',
    points: [
      { icon: Rows3, text: 'Each row is one equal group.' },
      { icon: Repeat, text: 'Count in steps: 6, 12, 18, 24.' },
      { icon: ArrowLeftRight, text: 'Turn it around: 4 × 6 = 6 × 4.' },
    ],
  },
  steps: [
    'Read the first number: that is how many groups (rows).',
    'Read the second number: that is how many in each group.',
    'Skip count by the second number, once for each row.',
    'The last number you say is the answer.',
    'Stuck? Turn it around, or use a fact you already know and add one more group.',
  ],
  example: {
    question: 'What is 3 × 5?',
    visual: <ArrayPicture rows={3} cols={5} />,
    work: ['3 × 5 means 3 rows of 5.', 'Count in 5s: 5, 10, 15.', 'It is the same as 5 × 3.'],
    answer: '3 × 5 = 15',
  },
  grownups: [
    'Learn the 2, 5 and 10 times tables first; they unlock the rest through doubling and halving.',
    'Arrays show why 4 × 6 and 6 × 4 match. Fold a piece of squared paper to show it.',
    'Practise little and often: two minutes a day beats a long weekly session.',
    'Look for arrays in real life: egg boxes, muffin tins, windows on a building.',
  ],
  makeQuestion,
};
