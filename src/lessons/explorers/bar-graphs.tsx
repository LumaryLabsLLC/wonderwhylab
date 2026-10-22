import { useState } from 'react';
import { ChartColumn, MoveVertical, Tally5, Trophy } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { BarChartPicture, Fruit, FRUITS, Tally } from './visuals/Fruit';

const MAX = 10;
const X0 = 130;
const Y0 = 500;
const UNIT = 30;
const SLOT = 132;
const barX = (i: number) => X0 + SLOT * i + SLOT / 2;
const valueY = (v: number) => Y0 - v * UNIT;

function Bar({ i, value, onChange, top }: { i: number; value: number; onChange: (v: number) => void; top: boolean }) {
  const fruit = FRUITS[i];
  const drag = useSvgDrag((p) => {
    const v = clamp(Math.round((Y0 - p.y) / UNIT), 0, MAX);
    if (v !== value) {
      onChange(v);
      play('tap');
    }
  });
  const cx = barX(i);
  return (
    <g>
      <g {...drag} role="slider" aria-label={`Votes for ${fruit.plural}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={MAX}>
        <rect x={cx - SLOT / 2 + 6} y={valueY(MAX) - 24} width={SLOT - 12} height={MAX * UNIT + 24} fill="transparent" />
        <rect x={cx - 34 + 5} y={valueY(value) + 5} width={68} height={value * UNIT} fill={C.ink} opacity={0.12} />
        <rect x={cx - 34} y={valueY(value)} width={68} height={value * UNIT} fill={fruit.color} stroke={C.ink} strokeWidth={2.5} />
        <rect x={cx - 34} y={valueY(value)} width={14} height={value * UNIT} fill={shade(fruit.color, 0.3)} opacity={0.6} />
        {/* Grip */}
        <rect x={cx - 26} y={valueY(value) - 12} width={52} height={20} rx={7} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <path d={`M${cx - 12},${valueY(value) - 5} h24 M${cx - 12},${valueY(value) + 1} h24`} stroke={C.muted} strokeWidth={2} strokeLinecap="round" />
      </g>
      <text x={cx} y={valueY(value) - 30} textAnchor="middle" fontSize={22} fontWeight={700} fill={top ? C.teal : C.ink} className="num">
        {value}
      </text>
      <Fruit id={fruit.id} x={cx} y={Y0 + 40} size={50} />
      <text x={cx} y={Y0 + 92} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.ink}>
        {fruit.name}
      </text>
    </g>
  );
}

function BarScene() {
  const [values, setValues] = useState([6, 8, 4, 5]);
  const max = Math.max(...values);
  const winners = values.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
  const total = values.reduce((a, b) => a + b, 0);
  const set = (i: number, v: number) => setValues(values.map((old, j) => (j === i ? v : old)));
  const leader = winners.length === 1 ? FRUITS[winners[0]] : null;

  return (
    <SceneSvg label={`Bar chart of favourite fruits: ${values.map((v, i) => `${FRUITS[i].plural} ${v}`).join(', ')}`}>
      {/* Grid and axes */}
      {Array.from({ length: MAX + 1 }, (_, v) => (
        <g key={v}>
          <line x1={X0} y1={valueY(v)} x2={X0 + SLOT * 4} y2={valueY(v)} stroke={v % 5 === 0 ? C.line : shade(C.paper, -0.06)} strokeWidth={v % 5 === 0 ? 2 : 1.5} />
          <text x={X0 - 14} y={valueY(v)} textAnchor="end" dominantBaseline="central" fontSize={17} fill={C.ink2} className="num">
            {v}
          </text>
        </g>
      ))}
      <text transform={`translate(70 ${valueY(5)}) rotate(-90)`} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        Votes
      </text>
      {values.map((v, i) => (
        <Bar key={FRUITS[i].id} i={i} value={v} onChange={(nv) => set(i, nv)} top={winners.length === 1 && winners[0] === i} />
      ))}
      <path d={`M${X0},${valueY(MAX) - 14} V${Y0} H${X0 + SLOT * 4 + 10}`} fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />

      {/* Tally chart */}
      <rect x={718} y={64} width={252} height={252} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={718} y={64} width={252} height={252} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={738} y={92} fontSize={16} fill={C.muted} className="caps">Tally chart</text>
      {FRUITS.map((f, i) => {
        const y = 112 + i * 50;
        return (
          <g key={f.id}>
            {i > 0 && <line x1={732} y1={y - 4} x2={956} y2={y - 4} stroke={C.line} strokeWidth={1.5} />}
            <Fruit id={f.id} x={750} y={y + 21} size={32} />
            <Tally n={values[i]} x={782} y={y + 8} h={28} />
            <text x={952} y={y + 22} textAnchor="end" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.ink} className="num">
              {values[i]}
            </text>
          </g>
        );
      })}

      <text x={844} y={354} textAnchor="middle" fontSize={19} fontWeight={700} fill={C.ink}>
        {total === 0 ? 'No votes yet' : leader ? `${leader.name} wins!` : 'It’s a tie!'}
      </text>
      <text x={844} y={382} textAnchor="middle" fontSize={17} fill={C.ink2}>
        Total votes: {total}
      </text>

      <SvgButton
        x={718}
        y={408}
        w={252}
        h={52}
        fontSize={18}
        label="New class vote"
        onClick={() => {
          setValues(FRUITS.map(() => rand(1, 10)));
          play('pop');
        }}
        color={C.teal}
        textColor={C.white}
      />
      <SvgButton
        x={718}
        y={476}
        w={252}
        h={50}
        fontSize={18}
        label="Read it to me"
        onClick={() => speak(`${FRUITS.map((f, i) => `${values[i]} for ${f.plural}`).join(', ')}. ${leader ? `${leader.name} is the favourite.` : 'It is a tie.'}`, { force: true })}
      />

      <Callout at={[X0, valueY(5)]} box={[40, 40]} w={210} icon={MoveVertical} title="The scale" text="Count up the side to read how tall a bar is." />
      <Callout
        at={[barX(winners[0]) + 34, valueY(max) + 14]}
        box={[270, 40]}
        w={210}
        icon={Trophy}
        title="Tallest bar"
        text="The tallest bar shows the most popular fruit."
      />
      <Callout at={[718, 150]} box={[496, 40]} w={200} icon={Tally5} title="Tally marks" text="One line per vote. The 5th line crosses the 4." />
    </SceneSvg>
  );
}

function Thumb() {
  const vals = [3, 5, 2, 4];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {vals.map((v, i) => (
        <rect key={i} x={16 + i * 24} y={68 - v * 11} width={16} height={v * 11} fill={FRUITS[i].color} stroke={C.ink} strokeWidth={1.5} />
      ))}
      <path d="M10,8 V68 H112" fill="none" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

/** Four fruit counts with a single clear winner (and a single clear loser). */
function makeData(): number[] {
  for (;;) {
    const v = FRUITS.map(() => rand(1, 10));
    const max = Math.max(...v);
    const min = Math.min(...v);
    if (v.filter((x) => x === max).length === 1 && v.filter((x) => x === min).length === 1) return v;
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const fruitChoices = () => FRUITS.map((f) => ({ value: f.id, name: f.name, label: f.name }));

function makeQuestion(level: number): Question {
  const v = makeData();
  const visual = <BarChartPicture values={v} />;
  if (level === 0) {
    if (Math.random() < 0.5) {
      const top = FRUITS[v.indexOf(Math.max(...v))];
      return {
        prompt: 'Which fruit is the most popular?',
        visual,
        choices: fruitChoices(),
        answer: top.id,
        hint: 'Find the tallest bar.',
        explain: [`The tallest bar is ${top.plural}, with ${Math.max(...v)} votes.`, `So ${top.plural} are the most popular.`],
      };
    }
    const i = rand(0, 3);
    return {
      prompt: `How many children chose ${FRUITS[i].plural}?`,
      visual,
      choices: numberChoices(v[i], { min: 0, max: 10, count: 3 }).map((value) => ({ value })),
      answer: String(v[i]),
      hint: 'Go to the top of the bar, then look across to the numbers.',
      explain: [`The ${FRUITS[i].plural} bar goes up to ${v[i]}.`, `So ${v[i]} ${v[i] === 1 ? 'child' : 'children'} chose ${FRUITS[i].plural}.`],
    };
  }
  if (level === 1) {
    if (Math.random() < 0.4) {
      const low = FRUITS[v.indexOf(Math.min(...v))];
      return {
        prompt: 'Which fruit is the least popular?',
        visual,
        choices: fruitChoices(),
        answer: low.id,
        hint: 'Find the shortest bar.',
        explain: [`The shortest bar is ${low.plural}, with ${Math.min(...v)} ${Math.min(...v) === 1 ? 'vote' : 'votes'}.`, `So ${low.plural} are the least popular.`],
      };
    }
    const [a, b] = shuffle([0, 1, 2, 3]).slice(0, 2);
    const [hi, lo] = v[a] >= v[b] ? [a, b] : [b, a];
    const diff = v[hi] - v[lo];
    return {
      prompt: `How many more chose ${FRUITS[hi].plural} than ${FRUITS[lo].plural}?`,
      visual,
      choices: numberChoices(diff, { min: 0, max: 10 }).map((value) => ({ value })),
      answer: String(diff),
      hint: 'Read both bars, then take the smaller number from the bigger one.',
      explain: [
        `${cap(FRUITS[hi].plural)}: ${v[hi]}. ${cap(FRUITS[lo].plural)}: ${v[lo]}.`,
        `${v[hi]} − ${v[lo]} = ${diff}.`,
        `${diff} more chose ${FRUITS[hi].plural}.`,
      ],
    };
  }
  if (Math.random() < 0.5) {
    return {
      prompt: 'How many votes are there altogether?',
      visual,
      answer: String(v.reduce((a, b) => a + b, 0)),
      hint: 'Read every bar and add them up.',
      explain: [
        `Read each bar: ${v.map((x, k) => `${FRUITS[k].plural} ${x}`).join(', ')}.`,
        `${v.join(' + ')} = ${v.reduce((a, b) => a + b, 0)} votes altogether.`,
      ],
    };
  }
  const i = rand(0, 3);
  const others = pick([1, 2]);
  const j = (i + others) % 4;
  return {
    prompt: `How many chose ${FRUITS[i].plural} or ${FRUITS[j].plural}?`,
    visual,
    answer: String(v[i] + v[j]),
    hint: 'Read both bars, then add them together.',
    explain: [`${cap(FRUITS[i].plural)}: ${v[i]}. ${cap(FRUITS[j].plural)}: ${v[j]}.`, `${v[i]} + ${v[j]} = ${v[i] + v[j]}.`],
  };
}

export const barGraphs: Lesson = {
  id: 'bar-graphs',
  title: 'Bar Graphs',
  Thumb,
  Scene: BarScene,
  sceneHint: 'Drag a bar up or down · Watch the tally chart change',
  learn: {
    heading: 'Bar graphs',
    intro: 'A bar graph turns a list of numbers into a picture. The taller the bar, the bigger the number, so you can compare at a glance.',
    points: [
      { icon: Tally5, text: 'Collect votes with tally marks first.' },
      { icon: ChartColumn, text: 'Draw one bar for each choice.' },
      { icon: MoveVertical, text: 'Read the scale up the side.' },
    ],
  },
  steps: [
    'Read the title and the labels so you know what is being counted.',
    'Pick a bar and go to its top.',
    'Look straight across to the scale and read the number.',
    'To compare, read both bars and take the smaller away from the bigger.',
  ],
  example: {
    question: 'How many more chose bananas than grapes?',
    visual: <BarChartPicture values={[6, 8, 4, 5]} />,
    work: ['The banana bar reaches 8.', 'The grapes bar reaches 4.', '8 − 4 = 4.'],
    answer: '4 more children chose bananas',
  },
  grownups: [
    'Run a real survey at home: favourite fruit, pets or colours. Make a tally, then draw the bars together.',
    'Ask questions that need two steps: “how many more…?”, “how many altogether?”.',
    'Point out that the scale might count in 2s or 5s in other graphs; always read it first.',
    'Look for bar charts in newspapers, cereal boxes and weather reports.',
  ],
  makeQuestion,
};
