import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Flag, Mountain } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { clamp, useSvgDrag } from '../../lib/svg';
import { NumberLinePicture } from '../../visuals/NumberLine';
import { Thing } from '../../visuals/Thing';

const HILL = { x0: 110, x1: 650, base: 478, height: 236 };
const hx = (t: number) => HILL.x0 + t * (HILL.x1 - HILL.x0);
const hy = (t: number) => HILL.base - HILL.height * Math.sin(Math.PI * t);

const hillPath = (() => {
  const pts = Array.from({ length: 61 }, (_, i) => `${hx(i / 60).toFixed(1)},${hy(i / 60).toFixed(1)}`);
  return `M${HILL.x0 - 40},${HILL.base} L${pts.join(' L')} L${HILL.x1 + 40},${HILL.base} Z`;
})();

type Mode = 10 | 100;

function RoundingScene() {
  const [n, setN] = useState(37);
  const [mode, setMode] = useState<Mode>(10);
  /** Ball position along the hill while rolling (null = sitting on its number). */
  const [roll, setRoll] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => () => cancelAnimationFrame(frame.current ?? 0), []);

  const low = Math.floor(n / mode) * mode;
  const high = low + mode;
  const t = (n - low) / mode;
  const result = t >= 0.5 ? high : low;
  const ballT = roll ?? (rolled ? (result === high ? 1 : 0) : t);

  const setNumber = (v: number) => {
    cancelAnimationFrame(frame.current ?? 0);
    setRoll(null);
    setRolled(false);
    setN(clamp(v, mode === 100 ? 100 : 0, 999));
  };

  const drag = useSvgDrag((p) => {
    if (roll !== null) return;
    const tt = clamp((p.x - HILL.x0) / (HILL.x1 - HILL.x0), 0, 0.999);
    const v = low + Math.round(tt * mode);
    if (v !== n && v < high) {
      setNumber(v);
      play('tap');
    }
  });

  const letGo = () => {
    cancelAnimationFrame(frame.current ?? 0);
    const from = t;
    const to = result === high ? 1 : 0;
    const start = performance.now();
    const dur = 400 + Math.abs(to - from) * 1000;
    const step = (now: number) => {
      const s = Math.min(1, (now - start) / dur);
      setRoll(from + (to - from) * s * s);
      if (s < 1) frame.current = requestAnimationFrame(step);
      else {
        setRoll(null);
        setRolled(true);
        play('correct');
        speak(`${n} rounds to ${result}.`);
      }
    };
    play('whoosh');
    frame.current = requestAnimationFrame(step);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    cancelAnimationFrame(frame.current ?? 0);
    setRoll(null);
    setRolled(false);
    if (m === 100 && n < 100) setN(n + 300);
    play('pop');
  };

  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);
  const bx = hx(ballT);
  const by = hy(ballT);
  const label = rolled ? String(result) : String(n);
  const place = mode === 10 ? 'Ones' : 'Tens';

  return (
    <SceneSvg label={`${n} on a hill between ${low} and ${high}. It rounds to ${result}.`}>
      {/* Ground and hill */}
      <rect x={56} y={HILL.base} width={648} height={22} rx={6} fill={shade(C.green, -0.35)} stroke={C.ink} strokeWidth={2} />
      <path d={hillPath} fill={shade(C.green, 0.25)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={hx(0.5)} y1={hy(0.5) + 6} x2={hx(0.5)} y2={HILL.base} stroke={shade(C.green, -0.2)} strokeWidth={2} strokeDasharray="6 6" />

      {ticks.map((tt, i) => {
        const x = hx(tt);
        const y = hy(tt);
        const v = low + tt * mode;
        const edge = i === 0 || i === 10;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={edge ? 0 : 4} fill={C.ink} />
            {!edge && (
              <text x={x} y={y + 30} textAnchor="middle" fontSize={mode === 10 ? 19 : 16} fontWeight={i === 5 ? 700 : 500} fill={i === 5 ? C.ink : shade(C.green, -0.55)} className="num">
                {v}
              </text>
            )}
          </g>
        );
      })}

      {/* Flags at the two tens */}
      {[0, 1].map((side) => {
        const x = hx(side);
        const v = side ? high : low;
        const win = rolled && result === v;
        return (
          <g key={side}>
            <line x1={x} y1={HILL.base} x2={x} y2={HILL.base - 150} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
            <path
              d={side ? `M${x},${HILL.base - 150} h${-86} l-14,24 l14,24 h86 z` : `M${x},${HILL.base - 150} h86 l14,24 l-14,24 h-86 z`}
              fill={win ? C.yellow : C.card}
              stroke={C.ink}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <text x={side ? x - 50 : x + 50} y={HILL.base - 126} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.ink} className="num">
              {v}
            </text>
          </g>
        );
      })}

      {/* The ball */}
      <g {...drag} role="slider" aria-label="Number on the hill" aria-valuenow={n} aria-valuemin={low} aria-valuemax={high - 1}>
        <circle cx={bx} cy={by - 26} r={40} fill="transparent" />
        <Thing kind="ball" x={bx} y={by - 26} size={52} color={C.red} />
        <g transform={`translate(${bx} ${by - 84})`}>
          <rect x={-30} y={-18} width={60} height={34} rx={9} fill={rolled ? C.teal : C.ink} />
          <path d="M-7,16 L0,24 L7,16 Z" fill={rolled ? C.teal : C.ink} />
          <text x={0} y={-1} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.white} className="num">
            {label}
          </text>
        </g>
      </g>

      {/* Readout and controls */}
      <rect x={718} y={64} width={252} height={110} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={718} y={64} width={252} height={110} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={844} y={102} textAnchor="middle" dominantBaseline="central" fontSize={34} fontWeight={700} fill={C.ink} className="num">
        {n} → {rolled ? result : '?'}
      </text>
      <text x={844} y={146} textAnchor="middle" fontSize={16} fill={C.muted}>
        to the nearest {mode === 10 ? 'ten' : 'hundred'}
      </text>

      <SvgButton x={718} y={198} w={122} h={48} fontSize={16} label="Nearest 10" onClick={() => switchMode(10)} active={mode === 10} color={mode === 10 ? C.yellow : C.card} />
      <SvgButton x={848} y={198} w={122} h={48} fontSize={16} label="Nearest 100" onClick={() => switchMode(100)} active={mode === 100} color={mode === 100 ? C.yellow : C.card} />

      <text x={720} y={284} fontSize={16} fill={C.muted} className="caps">Number</text>
      <SvgButton x={718} y={294} w={60} h={52} label="−" title="One less" onClick={() => setNumber(n - 1)} disabled={n <= (mode === 100 ? 100 : 0)} />
      <text x={844} y={321} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {n}
      </text>
      <SvgButton x={910} y={294} w={60} h={52} label="+" title="One more" onClick={() => setNumber(n + 1)} disabled={n >= 999} color={C.yellow} />

      <SvgButton x={718} y={378} w={252} h={54} fontSize={19} label="Let it roll!" onClick={letGo} color={C.teal} textColor={C.white} disabled={roll !== null} />
      <SvgButton
        x={718}
        y={448}
        w={252}
        h={50}
        fontSize={18}
        label="New number"
        onClick={() => setNumber(mode === 10 ? rand(11, 99) : rand(101, 999))}
      />

      <Callout at={[hx(0.25), hy(0.25)]} box={[40, 540]} w={214} icon={ArrowDownLeft} title="Under halfway" text={`${place} digit 1–4: roll back down.`} />
      <Callout at={[hx(0.5), hy(0.5) + 4]} box={[272, 540]} w={200} icon={Mountain} title="5 is the top" text="Halfway always rolls forward: round up." />
      <Callout at={[hx(0.8), hy(0.8)]} box={[490, 540]} w={214} icon={ArrowUpRight} title="Over halfway" text={`${place} digit 6–9: roll on to the next ${mode === 10 ? 'ten' : 'hundred'}.`} />
    </SceneSvg>
  );
}

function Thumb() {
  const path = Array.from({ length: 21 }, (_, i) => `${10 + i * 5},${66 - 40 * Math.sin((Math.PI * i) / 20)}`).join(' L');
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d={`M6,68 L${path} L114,68 Z`} fill={shade(C.green, 0.25)} stroke={C.ink} strokeWidth={1.5} />
      <Thing kind="ball" x={78} y={24} size={16} color={C.red} />
      <line x1={110} y1={68} x2={110} y2={36} stroke={C.ink} strokeWidth={2} />
      <rect x={90} y={30} width={20} height={12} rx={2} fill={C.yellow} stroke={C.ink} strokeWidth={1.2} />
    </svg>
  );
}

/** Unique choices that include `answer` once. */
function uniqueChoices(answer: number, others: number[], count: number) {
  const set = [answer];
  for (const v of others) {
    if (set.length >= count) break;
    if (v >= 0 && !set.includes(v)) set.push(v);
  }
  return shuffle(set).map((v) => ({ value: String(v) }));
}

function makeQuestion(level: number): Question {
  if (level < 2) {
    let n: number;
    if (level === 0) {
      do n = rand(11, 99);
      while (n % 5 === 0);
    } else {
      n = Math.random() < 0.5 ? rand(1, 9) * 10 + 5 : rand(101, 999);
      if (n % 10 === 0) n += 3;
    }
    const low = Math.floor(n / 10) * 10;
    const answer = n % 10 >= 5 ? low + 10 : low;
    return {
      prompt: `Round ${n} to the nearest ten.`,
      visual: <NumberLinePicture min={low} max={low + 10} marks={[{ value: n, label: String(n) }]} />,
      choices: uniqueChoices(answer, [low, low + 10, low - 10 >= 0 ? low - 10 : low + 20, Math.round(n / 100) * 100], level === 0 ? 3 : 4),
      answer: String(answer),
      hint: n % 10 === 5 ? 'It is exactly halfway. Halfway always rounds up!' : `Is ${n} closer to ${low} or to ${low + 10}?`,
      explain: [
        `${n} is between ${low} and ${low + 10}.`,
        `The ones digit is ${n % 10}. ${n % 10 >= 5 ? '5 or more rounds up' : 'Less than 5 rounds down'}.`,
        `${n} rounds to ${answer}.`,
      ],
    };
  }
  let n = rand(101, 989);
  if (n % 100 === 0) n += 7;
  const low = Math.floor(n / 100) * 100;
  const answer = n % 100 >= 50 ? low + 100 : low;
  return {
    prompt: `Round ${n} to the nearest hundred.`,
    visual: <NumberLinePicture min={low} max={low + 100} step={10} fontSize={16} marks={[{ value: n, label: String(n) }]} />,
    choices: uniqueChoices(answer, [low, low + 100, Math.round(n / 10) * 10, low + 200], 4),
    answer: String(answer),
    hint: `Look at the tens digit. Is it 5 or more?`,
    explain: [
      `${n} is between ${low} and ${low + 100}.`,
      `The tens digit is ${Math.floor(n / 10) % 10}. ${n % 100 >= 50 ? '5 or more rounds up' : 'Less than 5 rounds down'}.`,
      `${n} rounds to ${answer}.`,
    ],
  };
}

export const rounding: Lesson = {
  id: 'rounding',
  title: 'Rounding',
  Thumb,
  Scene: RoundingScene,
  sceneHint: 'Drag the ball or use + and − · Then let it roll!',
  learn: {
    heading: 'Rounding',
    intro: 'Rounding swaps a number for a nearby friendly one, like 37 → 40. Imagine a hill between two tens: the ball rolls down to whichever ten it is closer to.',
    points: [
      { icon: ArrowDownLeft, text: 'Ones digit 0–4: round down.' },
      { icon: ArrowUpRight, text: 'Ones digit 5–9: round up.' },
      { icon: Flag, text: 'For hundreds, look at the tens digit.' },
    ],
  },
  steps: [
    'Find the two tens the number sits between (37 is between 30 and 40).',
    'Look at the digit to the right: the ones digit.',
    'If it is 5 or more, round up to the higher ten.',
    'If it is 4 or less, round down to the lower ten.',
  ],
  example: {
    question: 'Round 64 to the nearest ten.',
    visual: <NumberLinePicture min={60} max={70} marks={[{ value: 64, label: '64' }]} />,
    work: ['64 is between 60 and 70.', 'The ones digit is 4, which is less than 5.', 'So the ball rolls back to 60.'],
    answer: '64 rounds to 60',
  },
  grownups: [
    'Rounding is for estimating: “about how much will 38 + 41 be?” → 40 + 40 = 80.',
    'Use it in shops: £2.95 is about £3. Ask for a rough total before checking out.',
    'The “5 rounds up” rule is a convention; explain it as an agreement, not a fact of nature.',
    'A number line or ruler makes “which is closer?” easy to see.',
  ],
  makeQuestion,
};
