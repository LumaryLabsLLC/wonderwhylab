import { useEffect, useRef, useState } from 'react';
import { Footprints, Grid3x3, Repeat, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

const CHART = { x: 80, y: 128, cell: 46 };
const STEPS = [2, 3, 5, 10] as const;
type Step = (typeof STEPS)[number];
const STEP_COLOR: Record<Step, string> = { 2: C.blue, 3: C.purple, 5: C.orange, 10: C.green };
const PATTERN: Record<Step, string> = {
  2: 'Every other number. They end in 0, 2, 4, 6 or 8.',
  3: 'Skip two numbers, land on the third.',
  5: 'They always end in 5 or 0.',
  10: 'They all end in 0 — a straight column!',
};

const cellPos = (n: number): [number, number] => {
  const i = n - 1;
  return [CHART.x + (i % 10) * CHART.cell, CHART.y + Math.floor(i / 10) * CHART.cell];
};

function SkipScene() {
  const [step, setStep] = useState<Step>(5);
  /** While counting along: the highest multiple reached so far. */
  const [reached, setReached] = useState<number | null>(null);
  const [tapped, setTapped] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const choose = (s: Step) => {
    window.clearInterval(timer.current);
    setReached(null);
    setStep(s);
    play('pop');
  };

  const countAlong = () => {
    window.clearInterval(timer.current);
    let n = step;
    setReached(n);
    speak(String(n));
    timer.current = window.setInterval(() => {
      n += step;
      if (n > step * 10) {
        window.clearInterval(timer.current);
        play('correct');
        setReached(null);
        return;
      }
      setReached(n);
      play('tap');
      speak(String(n));
    }, 750);
  };

  const color = STEP_COLOR[step];
  const multiples = Array.from({ length: Math.floor(100 / step) }, (_, i) => (i + 1) * step);
  const lit = (n: number) => n % step === 0 && (reached === null || n <= reached);
  const firstFew = multiples.slice(0, 8);
  const pointAt = cellPos(step * 3);

  return (
    <SceneSvg label={`Hundred chart counting by ${step}s`}>
      <rect x={CHART.x + 5} y={CHART.y + 7} width={CHART.cell * 10} height={CHART.cell * 10} rx={10} fill={C.ink} opacity={0.12} />
      <rect x={CHART.x} y={CHART.y} width={CHART.cell * 10} height={CHART.cell * 10} rx={10} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: 100 }, (_, i) => {
        const n = i + 1;
        const [x, y] = cellPos(n);
        const on = lit(n);
        const current = reached === n;
        return (
          <g
            key={n}
            onClick={() => {
              setTapped(n);
              play('tap');
              speak(String(n));
            }}
            style={{ cursor: 'pointer' }}
            data-nopan
          >
            <rect
              x={x + 3}
              y={y + 3}
              width={CHART.cell - 6}
              height={CHART.cell - 6}
              rx={7}
              fill={current ? C.yellow : on ? shade(color, 0.35) : 'transparent'}
              stroke={tapped === n ? C.ink : on ? shade(color, -0.2) : 'none'}
              strokeWidth={tapped === n ? 2.5 : 1.5}
            />
            <text
              x={x + CHART.cell / 2}
              y={y + CHART.cell / 2 + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={17}
              fontWeight={on ? 700 : 500}
              fill={on ? C.ink : C.muted}
              className="num"
            >
              {n}
            </text>
          </g>
        );
      })}
      {/* grid lines */}
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} stroke={C.line} strokeWidth={1}>
          <line x1={CHART.x + (i + 1) * CHART.cell} y1={CHART.y + 4} x2={CHART.x + (i + 1) * CHART.cell} y2={CHART.y + CHART.cell * 10 - 4} />
          <line x1={CHART.x + 4} y1={CHART.y + (i + 1) * CHART.cell} x2={CHART.x + CHART.cell * 10 - 4} y2={CHART.y + (i + 1) * CHART.cell} />
        </g>
      ))}

      {/* Controls */}
      <text x={600} y={112} fontSize={16} fill={C.muted} className="caps">Count by…</text>
      {STEPS.map((s, i) => (
        <SvgButton
          key={s}
          x={600 + i * 88}
          y={124}
          w={78}
          h={60}
          fontSize={24}
          label={`${s}s`}
          title={`Count by ${s}s`}
          active={step === s}
          color={step === s ? STEP_COLOR[s] : C.card}
          textColor={step === s ? C.white : C.ink}
          onClick={() => choose(s)}
        />
      ))}
      <g>
        <rect x={604} y={216} width={340} height={168} rx={14} fill={C.ink} opacity={0.1} />
        <rect x={600} y={210} width={340} height={168} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
        <text x={620} y={244} fontSize={16} fill={C.muted} className="caps">Counting by {step}s</text>
        <text x={620} y={290} fontSize={30} fontWeight={700} fill={shade(color, -0.3)} className="num">
          {firstFew.slice(0, 4).join(', ')},
        </text>
        <text x={620} y={334} fontSize={30} fontWeight={700} fill={shade(color, -0.3)} className="num">
          {firstFew.slice(4).join(', ')}, …
        </text>
        <text x={620} y={364} fontSize={15} fill={C.ink2}>{PATTERN[step]}</text>
      </g>
      <SvgButton
        x={600}
        y={404}
        w={220}
        h={60}
        fontSize={20}
        label={reached !== null ? 'Counting…' : 'Count along'}
        color={C.teal}
        textColor={C.white}
        disabled={reached !== null}
        onClick={countAlong}
      />

      <Callout
        at={[CHART.x + CHART.cell * 9.5, CHART.y + 8]}
        box={[250, 22]}
        w={330}
        icon={Grid3x3}
        title="Rows of ten"
        text="Each row has 10 numbers. Going down a row adds 10."
      />
      <Callout
        at={[pointAt[0] + CHART.cell, pointAt[1] + CHART.cell / 2]}
        box={[600, 498]}
        w={330}
        icon={Sparkles}
        title="Spot the pattern"
        text={`Coloured squares are the numbers you say when you count by ${step}s.`}
      />
    </SceneSvg>
  );
}

function SequencePicture({ items }: { items: (number | null)[] }) {
  const w = 74;
  const gap = 18;
  return (
    <svg viewBox={`-4 -4 ${items.length * (w + gap) - gap + 8} 74`} role="img" aria-label={items.map((n) => n ?? 'blank').join(', ')}>
      {items.map((n, i) => (
        <g key={i} transform={`translate(${i * (w + gap)} 0)`}>
          <rect x={3} y={4} width={w} height={60} rx={10} fill={C.ink} opacity={0.12} />
          <rect width={w} height={60} rx={10} fill={n === null ? shade(C.yellow, 0.5) : C.card} stroke={C.ink} strokeWidth={2.5} strokeDasharray={n === null ? '6 4' : undefined} />
          <text x={w / 2} y={31} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} fontFamily="Lexend Variable, sans-serif">
            {n ?? '?'}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={14} y={8} width={92} height={64} rx={6} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      {Array.from({ length: 40 }, (_, i) => {
        const n = i + 1;
        const x = 18 + (i % 10) * 8.6;
        const y = 12 + Math.floor(i / 10) * 14.5;
        return <rect key={i} x={x} y={y} width={7} height={12} rx={1.5} fill={n % 5 === 0 ? C.orange : C.line} />;
      })}
    </svg>
  );
}

function seqChoices(answer: number, step: number, count: number): string[] {
  const set = new Set<number>([answer]);
  for (const c of shuffle([answer + step, answer - step, answer + 1, answer - 1, answer + 10, answer + 2])) {
    if (set.size < count && c > 0 && c !== answer) set.add(c);
  }
  return shuffle([...set]).map(String);
}

function makeQuestion(level: number): Question {
  const step = level === 0 ? pick([10, 2]) : level === 1 ? pick([2, 5, 10]) : pick([2, 3, 5, 10]);
  // Level 2 can count back, or count by 10s from a number that isn't a multiple of 10.
  const back = level === 2 && Math.random() < 0.35;
  const offset = level === 2 && step === 10 && !back && Math.random() < 0.6 ? rand(1, 9) : 0;
  const len = 4;
  const startIndex = rand(1, level === 0 ? 3 : 6);
  let seq = Array.from({ length: len }, (_, i) => (startIndex + i) * step + offset);
  if (back) seq = seq.reverse();
  const missing = level === 0 ? len - 1 : Math.random() < 0.5 ? len - 1 : rand(1, len - 2);
  const answer = seq[missing];
  const shown = seq.map((n, i) => (i === missing ? null : n));
  const spoken = shown.map((n) => (n === null ? 'what' : String(n))).join(', ');
  // Two shown neighbours to read the jump from (never the missing one).
  const [p, q] = missing >= 2 ? [seq[0], seq[1]] : [seq[2], seq[3]];
  return {
    prompt: missing === len - 1 ? 'What number comes next?' : 'Which number is missing?',
    speak: `${spoken}?`,
    visual: <SequencePicture items={shown} />,
    choices: seqChoices(answer, step, level === 0 ? 3 : 4).map((value) => ({ value })),
    answer: String(answer),
    hint: `How much does each number ${back ? 'go down' : 'go up'} by? Look at two neighbours.`,
    explain: [
      `${p} to ${q}: the numbers ${back ? 'go down' : 'go up'} by ${step} each time.`,
      missing === 0
        ? `Go back one jump from ${seq[1]}: ${seq[1]} ${back ? '+' : '−'} ${step} = ${answer}.`
        : `${seq[missing - 1]} ${back ? '−' : '+'} ${step} = ${answer}.`,
      `So the missing number is ${answer}.`,
    ],
  };
}

export const skipCounting: Lesson = {
  id: 'skip-counting',
  title: 'Skip Counting',
  Thumb,
  Scene: SkipScene,
  sceneHint: 'Pick 2s, 5s or 10s · Tap Count along',
  learn: {
    heading: 'Counting in jumps',
    intro: 'Skip counting means counting in jumps instead of ones. It is a fast way to count lots of things — and it leads to times tables!',
    points: [
      { icon: Footprints, text: 'Counting by 2s: 2, 4, 6, 8, 10…' },
      { icon: Repeat, text: 'Counting by 5s: 5, 10, 15, 20…' },
      { icon: Grid3x3, text: 'Counting by 10s: 10, 20, 30, 40…' },
      { icon: Sparkles, text: 'Look for patterns on the hundred chart.' },
    ],
  },
  steps: [
    'Choose your jump: 2, 5 or 10.',
    'Start at that number.',
    'Add the jump each time to get the next number.',
    'Say the numbers out loud like a song: 5, 10, 15, 20!',
  ],
  example: {
    question: 'What comes next? 10, 15, 20, ?',
    visual: <SequencePicture items={[10, 15, 20, null]} />,
    work: ['Each number is 5 more than the one before.', '20 + 5 = 25.'],
    answer: 'The next number is 25.',
  },
  grownups: [
    'Count pairs of socks by 2s, fingers on hands by 5s and coins (10p / dimes) by 10s.',
    'Clap or jump on each number you say — rhythm helps memory.',
    'On the hundred chart, ask why counting by 10s makes a straight column.',
    'Skip counting is the bridge to multiplication: 4 jumps of 5 is 4 × 5.',
  ],
  makeQuestion,
};
