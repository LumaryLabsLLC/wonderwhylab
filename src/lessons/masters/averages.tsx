import { useRef, useState } from 'react';
import { ArrowDownUp, ChartColumn, Repeat, Scale } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { numberChoices, pick, rand, round, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

const T = { x: 70, w: 64, gap: 18, unit: 32, base: 520, max: 10 };
const COLOURS = [C.blue, C.orange, C.green, C.purple, C.pink, C.teal, C.red];

type View = 'data' | 'level' | 'sorted';

const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
const sorted = (v: number[]) => [...v].sort((a, b) => a - b);

function median(v: number[]): number {
  const s = sorted(v);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Values that appear most often (only if something repeats). */
function modes(v: number[]): number[] {
  const count = new Map<number, number>();
  for (const x of v) count.set(x, (count.get(x) ?? 0) + 1);
  const top = Math.max(...count.values());
  if (top < 2) return [];
  return [...count.entries()].filter(([, c]) => c === top).map(([x]) => x).sort((a, b) => a - b);
}

function AveragesScene() {
  const [values, setValues] = useState([3, 5, 5, 2, 7]);
  const [view, setView] = useState<View>('data');
  const dragIndex = useRef(-1);

  const n = values.length;
  const total = sum(values);
  const mean = round(total / n, 2);
  const med = median(values);
  const mode = modes(values);
  const shownValues = view === 'sorted' ? sorted(values) : values;
  const towerX = (i: number) => T.x + i * (T.w + T.gap);
  const topY = (v: number) => T.base - v * T.unit;

  const drag = useSvgDrag(
    (p) => {
      const i = dragIndex.current;
      if (i < 0) return;
      const v = clamp(Math.round((T.base - p.y) / T.unit), 1, T.max);
      setValues((vals) => (vals[i] === v ? vals : vals.map((x, j) => (j === i ? v : x))));
    },
    {
      onStart: (p) => {
        const i = Math.floor((p.x - T.x) / (T.w + T.gap));
        dragIndex.current = i >= 0 && i < n ? i : -1;
        if (view !== 'data') setView('data');
        play('tap');
      },
      onEnd: () => {
        dragIndex.current = -1;
      },
    },
  );

  const resize = (count: number) => {
    setValues((vals) => (count > vals.length ? [...vals, rand(1, 8)] : vals.slice(0, count)));
    setView('data');
    play('pop');
  };

  const sortedVals = sorted(values);
  const midIdx = n % 2 ? [Math.floor(n / 2)] : [n / 2 - 1, n / 2];
  const full = Math.floor(mean);
  const part = round(mean - full, 2);

  return (
    <SceneSvg label={`Data ${values.join(', ')}. Mean ${fmt(mean)}, median ${fmt(med)}`}>
      {/* grid lines */}
      {Array.from({ length: T.max + 1 }, (_, v) => (
        <g key={v}>
          <line x1={T.x - 12} y1={topY(v)} x2={towerX(6) + T.w + 12} y2={topY(v)} stroke={C.line} strokeWidth={v % 5 === 0 ? 2 : 1} />
          {v % 2 === 0 && (
            <text x={T.x - 20} y={topY(v)} textAnchor="end" dominantBaseline="central" fontSize={15} fill={C.muted} className="num">
              {v}
            </text>
          )}
        </g>
      ))}

      {shownValues.map((v, i) => {
        const x = towerX(i);
        const colour = view === 'level' ? C.teal : COLOURS[(view === 'sorted' ? values.indexOf(v) : i) % COLOURS.length];
        const isMode = view === 'data' && mode.includes(v);
        const isMedian = view === 'sorted' && midIdx.includes(i);
        const blocks = view === 'level' ? full : v;
        return (
          <g key={i}>
            {Array.from({ length: blocks }, (_, b) => (
              <rect key={b} x={x} y={topY(b + 1) + 2} width={T.w} height={T.unit - 4} rx={6} fill={colour} stroke={C.ink} strokeWidth={1.6} />
            ))}
            {view === 'level' && part > 0 && (
              <rect x={x} y={topY(full + part) + 2} width={T.w} height={part * T.unit - 2} rx={4} fill={shade(colour, 0.4)} stroke={C.ink} strokeWidth={1.4} strokeDasharray="4 3" />
            )}
            {(isMode || isMedian) && (
              <rect x={x - 5} y={topY(v) - 5} width={T.w + 10} height={v * T.unit + 8} rx={10} fill="none" stroke={isMedian ? C.red : C.green} strokeWidth={3.5} />
            )}
            {isMedian && midIdx.length === 1 && (
              <text x={x + T.w / 2} y={topY(v) - 22} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.red}>
                median
              </text>
            )}
            <text x={x + T.w / 2} y={T.base + 26} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink} className="num">
              {view === 'level' ? fmt(mean) : v}
            </text>
          </g>
        );
      })}
      {view === 'level' && (
        <g>
          <line x1={T.x - 12} y1={topY(mean)} x2={towerX(n - 1) + T.w + 12} y2={topY(mean)} stroke={C.red} strokeWidth={3} strokeDasharray="8 6" />
          <text x={towerX(n - 1) + T.w + 18} y={topY(mean)} dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.red}>
            mean
          </text>
        </g>
      )}
      {view === 'sorted' && midIdx.length === 2 && (
        <text x={(towerX(midIdx[0]) + towerX(midIdx[1]) + T.w) / 2} y={topY(Math.max(sortedVals[midIdx[0]], sortedVals[midIdx[1]])) - 22} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.red}>
          median is halfway
        </text>
      )}
      {/* drag layer over the towers (data view only shows changes) */}
      <rect x={T.x - 8} y={topY(T.max) - 10} width={n * (T.w + T.gap)} height={T.max * T.unit + 20} fill="transparent" {...drag} style={{ ...drag.style, cursor: 'ns-resize' }} />

      {[
        { id: 'data' as const, label: 'My data' },
        { id: 'level' as const, label: 'Level them' },
        { id: 'sorted' as const, label: 'Line up' },
      ].map((b, i) => (
        <SvgButton key={b.id} x={60 + i * 196} y={584} w={184} h={52} fontSize={18} label={b.label} active={view === b.id} color={view === b.id ? C.yellow : C.card} onClick={() => setView(b.id)} />
      ))}

      {/* stats card */}
      <rect x={704} y={34} width={270} height={346} rx={14} fill={C.ink} opacity={0.08} />
      <rect x={700} y={30} width={270} height={346} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {[
        { label: 'Data', value: values.join(', ') },
        { label: 'Mean', value: `${total} ÷ ${n} = ${fmt(mean)}` },
        { label: 'Median', value: fmt(med) },
        { label: 'Mode', value: mode.length ? mode.join(' and ') : 'none (no repeats)' },
        { label: 'Range', value: `${Math.max(...values)} − ${Math.min(...values)} = ${Math.max(...values) - Math.min(...values)}` },
      ].map((row, i) => (
        <g key={row.label}>
          <text x={718} y={62 + i * 66} fontSize={14} fill={C.muted} className="caps">{row.label}</text>
          <text x={718} y={88 + i * 66} fontSize={row.value.length > 18 ? 18 : 22} fontWeight={700} fill={C.ink} className="num">{row.value}</text>
        </g>
      ))}
      <text x={700} y={426} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">Towers</text>
      <SvgButton x={800} y={400} w={52} h={50} label="−" title="One fewer tower" onClick={() => resize(n - 1)} disabled={n <= 3} />
      <text x={886} y={426} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.ink} className="num">{n}</text>
      <SvgButton x={918} y={400} w={52} h={50} label="+" title="One more tower" onClick={() => resize(n + 1)} disabled={n >= 7} color={C.yellow} />
      <SvgButton x={700} y={470} w={270} h={52} fontSize={18} label="New data" onClick={() => { setValues(Array.from({ length: n }, () => rand(1, 9))); setView('data'); play('pop'); }} />

      <Callout at={[towerX(0) + T.w / 2, topY(values[0])]} box={[300, 30]} w={300} icon={Scale} title="Mean = fair share" text="Level the towers: move blocks until every tower is the same height." />
    </SceneSvg>
  );
}

function Thumb() {
  const v = [3, 5, 5, 2, 4];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {v.map((h, i) => (
        <rect key={i} x={12 + i * 20} y={70 - h * 11} width={16} height={h * 11} rx={3} fill={COLOURS[i]} stroke={C.ink} strokeWidth={1.5} />
      ))}
      <line x1={8} y1={70 - 3.8 * 11} x2={112} y2={70 - 3.8 * 11} stroke={C.red} strokeWidth={2.5} strokeDasharray="5 4" />
    </svg>
  );
}

/** Small tower chart for question cards. */
function DataPicture({ values }: { values: number[] }) {
  const u = 14;
  const top = Math.max(...values);
  return (
    <svg viewBox={`-6 -6 ${values.length * 46 + 6} ${top * u + 36}`} role="img" aria-label={`Towers: ${values.join(', ')}`}>
      {values.map((v, i) => (
        <g key={i}>
          <rect x={i * 46} y={(top - v) * u} width={38} height={v * u} rx={4} fill={COLOURS[i % COLOURS.length]} stroke={C.ink} strokeWidth={1.6} />
          <text x={i * 46 + 19} y={top * u + 20} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** n distinct values in [lo, hi]. */
function distinct(n: number, lo: number, hi: number, avoid: number[] = []): number[] {
  const pool = shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((x) => !avoid.includes(x)));
  return pool.slice(0, n);
}

function modeQuestion(): Question {
  const m = rand(1, 9);
  const reps = pick([2, 2, 3]);
  const vals = shuffle([...Array(reps).fill(m), ...distinct(5 - reps, 1, 9, [m])]);
  return {
    prompt: `What is the mode of ${vals.join(', ')}?`,
    visual: <DataPicture values={vals} />,
    choices: shuffle([m, ...distinct(3, 1, 9, [m])]).map((v) => ({ value: String(v) })),
    answer: String(m),
    hint: 'The mode is the number you see most often.',
    explain: ['Count how many times each number appears.', `${m} appears ${reps} times, more than any other number.`, `The mode is ${m}.`],
  };
}

function rangeQuestion(numpad: boolean): Question {
  const vals = distinct(5, 1, numpad ? 20 : 9);
  const hi = Math.max(...vals);
  const lo = Math.min(...vals);
  const r = hi - lo;
  return {
    prompt: `What is the range of ${vals.join(', ')}?`,
    visual: numpad ? undefined : <DataPicture values={vals} />,
    choices: numpad ? undefined : numberChoices(r, { min: 1, max: 19, spread: 3 }).map((value) => ({ value })),
    answer: String(r),
    hint: 'The range is how spread out the data is: biggest minus smallest.',
    explain: [`The biggest is ${hi} and the smallest is ${lo}.`, `${hi} − ${lo} = ${r}.`, `The range is ${r}.`],
  };
}

function medianOdd(numpad: boolean, count = 5): Question {
  const vals = shuffle(Array.from({ length: count }, () => rand(1, numpad ? 20 : 9)));
  const s = sorted(vals);
  const m = s[Math.floor(count / 2)];
  return {
    prompt: `What is the median of ${vals.join(', ')}?`,
    visual: numpad ? undefined : <DataPicture values={vals} />,
    choices: numpad ? undefined : numberChoices(m, { min: 1, max: 9, spread: 3 }).map((value) => ({ value })),
    answer: String(m),
    hint: 'Put the numbers in order first, then find the middle one.',
    explain: [`In order: ${s.join(', ')}.`, `The middle number is ${m}.`, `The median is ${m}.`],
  };
}

function medianEven(): Question {
  const count = pick([4, 6]);
  const vals = Array.from({ length: count }, () => rand(1, 20));
  const s = sorted(vals);
  const a = s[count / 2 - 1];
  const b = s[count / 2];
  const m = (a + b) / 2;
  return {
    prompt: `What is the median of ${vals.join(', ')}?`,
    answer: fmt(m),
    allowDecimal: true,
    hint: 'With an even count there are two middle numbers. The median is halfway between them.',
    explain: [`In order: ${s.join(', ')}.`, `The two middle numbers are ${a} and ${b}.`, `Halfway: (${a} + ${b}) ÷ 2 = ${fmt(m)}.`],
  };
}

function meanQuestion(decimal: boolean): Question {
  const count = decimal ? 5 : pick([3, 4, 5]);
  let vals: number[];
  do {
    vals = Array.from({ length: count }, () => rand(1, decimal ? 20 : 12));
  } while (!decimal && sum(vals) % count !== 0);
  const total = sum(vals);
  const m = round(total / count, 2);
  return {
    prompt: `What is the mean of ${vals.join(', ')}?`,
    visual: decimal ? undefined : <DataPicture values={vals} />,
    answer: fmt(m),
    allowDecimal: decimal,
    hint: 'Share it out fairly: add them all up, then divide by how many numbers there are.',
    explain: [`Add them: ${vals.join(' + ')} = ${total}.`, `There are ${count} numbers.`, `${total} ÷ ${count} = ${fmt(m)}.`],
  };
}

function missingValue(): Question {
  const count = 4;
  const mean = rand(4, 12);
  let three: number[];
  let x: number;
  do {
    three = Array.from({ length: 3 }, () => rand(1, 18));
    x = mean * count - sum(three);
  } while (x < 1 || x > 25);
  return {
    prompt: `The mean of 4 numbers is ${mean}. Three of them are ${three.join(', ')}. What is the fourth?`,
    answer: String(x),
    hint: 'Work out what the 4 numbers must add up to first.',
    explain: [`The total must be 4 × ${mean} = ${mean * count}.`, `The three numbers add to ${sum(three)}.`, `${mean * count} − ${sum(three)} = ${x}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([modeQuestion, () => rangeQuestion(false), () => medianOdd(false)])();
  if (level === 1) return pick([() => meanQuestion(false), () => medianOdd(true, pick([5, 7])), () => rangeQuestion(true), modeQuestion])();
  return pick([() => meanQuestion(true), medianEven, missingValue])();
}

export const averages: Lesson = {
  id: 'averages',
  title: 'Mean, Median and Mode',
  Thumb,
  Scene: AveragesScene,
  sceneHint: 'Drag a tower up or down · Level them for the mean · Line up for the median',
  learn: {
    heading: 'Averages',
    intro: 'An average is one number that sums up a set of data. The mean is the fair share, the median is the middle, and the mode is the most common.',
    points: [
      { icon: Scale, text: 'Mean: add everything up and share it out equally.' },
      { icon: ArrowDownUp, text: 'Median: put the data in order and take the middle.' },
      { icon: Repeat, text: 'Mode: the value that appears most often.' },
      { icon: ChartColumn, text: 'Range: biggest minus smallest shows how spread out it is.' },
    ],
  },
  steps: [
    'Mean: add all the values, then divide by how many there are.',
    'Median: put the values in order and find the middle one (or halfway between the two middle ones).',
    'Mode: count which value appears most often.',
    'Range: subtract the smallest value from the biggest.',
  ],
  example: {
    question: 'Find the mean of 3, 5, 5, 2 and 7.',
    visual: <DataPicture values={[3, 5, 5, 2, 7]} />,
    work: ['Add them: 3 + 5 + 5 + 2 + 7 = 22.', 'There are 5 numbers, so share 22 between 5: 22 ÷ 5 = 4.4.'],
    answer: 'The mean is 4.4.',
  },
  grownups: [
    'Use real data: everyone’s shoe size, goals scored in five matches, minutes spent reading each day.',
    'The “levelling the towers” idea is a powerful picture: the mean is what everyone gets if you share fairly.',
    'Ask which average is best: one very big value pulls the mean up but barely moves the median.',
    'The mean doesn’t have to be one of the numbers, and can be a decimal.',
  ],
  makeQuestion,
};
