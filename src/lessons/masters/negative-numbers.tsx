import { useState } from 'react';
import { ArrowDownUp, Snowflake, Sun, ThermometerSnowflake } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { NumberLinePicture } from '../../visuals/NumberLine';
import { ThermometerPicture } from './visuals/Thermometer';

const TX = 250; // tube centre
const Y0 = 330; // where 0° is
const U = 23; // pixels per degree
const yOf = (v: number) => Y0 - v * U;
const BULB_Y = 604;

function SunIcon({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={x + Math.cos(a) * 22} y1={y + Math.sin(a) * 22} x2={x + Math.cos(a) * 32} y2={y + Math.sin(a) * 32} stroke={C.orange} strokeWidth={4} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={16} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

function SnowIcon({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={C.blue} strokeWidth={4} strokeLinecap="round">
      {[0, 60, 120].map((a) => (
        <line key={a} x1={x - 24} y1={y} x2={x + 24} y2={y} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r={6} fill={C.white} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

function NegativeScene() {
  const [v, setV] = useState(-3);
  const [hop, setHop] = useState<{ from: number; to: number } | null>(null);

  const drag = useSvgDrag((p) => {
    const nv = clamp(Math.round((Y0 - p.y) / U), -10, 10);
    if (nv !== v) {
      setV(nv);
      setHop(null);
      play('tap');
    }
  });

  const step = (d: number) => {
    const to = clamp(v + d, -10, 10);
    if (to === v) return;
    setHop({ from: v, to });
    setV(to);
    play('pop');
  };

  const liquid = v < 0 ? C.blue : C.red;
  const status = v > 0 ? 'Above freezing' : v === 0 ? 'Freezing point' : 'Below freezing';

  // Hop arc on the right of the scale.
  let hopPath = '';
  let hopLabel: [number, number] = [0, 0];
  let hopColor: string = C.orange;
  if (hop) {
    const y1 = yOf(hop.from);
    const y2 = yOf(hop.to);
    const bulge = Math.min(90, 26 + Math.abs(hop.to - hop.from) * 7);
    const x = TX + 82;
    hopPath = `M${x},${y1} C${x + bulge},${y1} ${x + bulge},${y2} ${x},${y2}`;
    hopLabel = [x + bulge * 0.75 + 8, (y1 + y2) / 2];
    hopColor = hop.to > hop.from ? C.orange : C.blue;
  }

  return (
    <SceneSvg label={`A thermometer showing ${fmt(v)} degrees`}>
      <SunIcon x={150} y={104} />
      <SnowIcon x={150} y={548} />

      {/* Thermometer */}
      <rect x={TX - 18 + 5} y={78 + 6} width={36} height={BULB_Y - 78} rx={18} fill={C.ink} opacity={0.12} />
      <rect x={TX - 18} y={78} width={36} height={BULB_Y - 78} rx={18} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
      <rect x={TX - 9} y={yOf(v)} width={18} height={BULB_Y - yOf(v)} fill={liquid} style={{ transition: 'y 0.35s, height 0.35s' }} />
      <circle cx={TX} cy={BULB_Y} r={34} fill={liquid} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={TX - 10} cy={BULB_Y - 10} r={8} fill={C.white} opacity={0.55} />
      {Array.from({ length: 21 }, (_, i) => {
        const t = i - 10;
        const major = t % 5 === 0;
        return (
          <g key={t}>
            <line x1={TX + 18} y1={yOf(t)} x2={TX + (major ? 40 : 30)} y2={yOf(t)} stroke={C.ink} strokeWidth={major ? 2.4 : 1.4} />
            <text x={TX + 66} y={yOf(t)} textAnchor="end" dominantBaseline="central" fontSize={t === 0 ? 18 : 15} fontWeight={t === 0 ? 700 : 500} fill={t < 0 ? shade(C.blue, -0.3) : t > 0 ? shade(C.red, -0.25) : C.ink} className="num">
              {fmt(t)}
            </text>
          </g>
        );
      })}
      <line x1={TX - 70} y1={Y0} x2={TX + 80} y2={Y0} stroke={C.ink} strokeWidth={1.5} strokeDasharray="5 5" />

      {hop && (
        <g className="fade-up" key={`${hop.from}-${hop.to}`}>
          <path d={hopPath} fill="none" stroke={hopColor} strokeWidth={4} strokeLinecap="round" />
          <path d={`M${TX + 82},${yOf(hop.to)} l12,${hop.to > hop.from ? 7 : -7} l0,${hop.to > hop.from ? -14 : 14} z`} fill={hopColor} />
          <text x={hopLabel[0]} y={hopLabel[1]} dominantBaseline="central" fontSize={20} fontWeight={700} fill={shade(hopColor, -0.3)} className="num">
            {hop.to > hop.from ? '+' : '−'}
            {Math.abs(hop.to - hop.from)}
          </text>
        </g>
      )}

      {/* Draggable marker and tube hit area */}
      <rect x={TX - 74} y={70} width={150} height={BULB_Y - 70} fill="transparent" {...drag} />
      <g {...drag} role="slider" aria-label="Drag to change the temperature" aria-valuenow={v} aria-valuemin={-10} aria-valuemax={10}>
        <path d={`M${TX - 82},${yOf(v) - 18} h52 l14,18 l-14,18 h-52 a6,6 0 0 1 -6,-6 v-24 a6,6 0 0 1 6,-6 z`} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
        <text x={TX - 58} y={yOf(v)} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.ink} className="num">
          {fmt(v)}°
        </text>
      </g>

      {/* Readout and controls */}
      <NumberCard x={560} y={84} w={240} h={110} value={`${fmt(v)}°`} caption="Temperature" color={v < 0 ? shade(C.blue, -0.3) : v > 0 ? shade(C.red, -0.2) : C.ink} />
      <text x={680} y={226} textAnchor="middle" fontSize={18} fontWeight={600} fill={C.ink2}>
        {status}
      </text>
      <text x={680} y={272} textAnchor="middle" fontSize={hop ? 32 : 16} fontWeight={hop ? 700 : 400} fill={C.ink} className="num">
        {hop ? `${fmt(hop.from)} ${hop.to > hop.from ? '+' : '−'} ${Math.abs(hop.to - hop.from)} = ${fmt(hop.to)}` : 'Warm it up or cool it down!'}
      </text>

      <text x={615} y={318} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">Colder</text>
      <text x={745} y={318} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">Warmer</text>
      {[1, 3, 5].map((d, i) => (
        <g key={d}>
          <SvgButton x={560} y={330 + i * 68} w={110} h={54} label={`−${d}`} title={`${d} degrees colder`} onClick={() => step(-d)} disabled={v <= -10} color={C.blue} textColor={C.white} />
          <SvgButton x={690} y={330 + i * 68} w={110} h={54} label={`+${d}`} title={`${d} degrees warmer`} onClick={() => step(d)} disabled={v >= 10} color={C.orange} />
        </g>
      ))}
      <SvgButton x={560} y={544} w={240} h={50} fontSize={18} label="Back to 0°" onClick={() => { setHop(null); setV(0); }} />

      <Callout
        at={[TX - 70, Y0]}
        box={[14, 220]}
        w={146}
        title="Zero"
        text="Below 0 is negative."
      />
      <Callout
        at={[TX + 18, yOf(9)]}
        box={[336, 16]}
        w={196}
        icon={ArrowDownUp}
        title="Up is more"
        text="Going up adds. Going down takes away."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={50} y={8} width={16} height={56} rx={8} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <rect x={54} y={40} width={8} height={26} fill={C.blue} />
      <circle cx={58} cy={66} r={10} fill={C.blue} stroke={C.ink} strokeWidth={2} />
      <line x1={66} y1={36} x2={80} y2={36} stroke={C.ink} strokeWidth={2} />
      <text x={84} y={37} dominantBaseline="central" fontSize={14} fontWeight={700} fill={C.ink}>0</text>
      <text x={84} y={58} dominantBaseline="central" fontSize={14} fontWeight={700} fill={C.blue}>−3</text>
    </svg>
  );
}

function readThermometer(): Question {
  const v = rand(-9, 9);
  return {
    prompt: 'What temperature does the thermometer show?',
    visual: <ThermometerPicture value={v} />,
    choices: numberChoices(v, { min: -10, max: 10, spread: 3 }).map((c) => ({ value: fmt(Number(c)) })),
    answer: fmt(v),
    hint: 'Find 0 first. Every small mark is 1 degree.',
    explain:
      v === 0
        ? ['Find 0 on the thermometer.', 'The top of the liquid is exactly at 0.', 'It shows 0°.']
        : [
            'Find 0 on the thermometer.',
            `The top of the liquid is ${Math.abs(v)} ${Math.abs(v) === 1 ? 'mark' : 'marks'} ${v > 0 ? 'above' : 'below'} 0.`,
            v > 0 ? `Above 0 is positive, so it shows ${fmt(v)}°.` : `Below 0 is negative, so it shows ${fmt(v)}°.`,
          ],
  };
}

function colder(level: number): Question {
  let a = rand(-9, level === 0 ? 5 : -1);
  let b = rand(-9, 9);
  while (b === a) b = rand(-9, 9);
  const askSmall = Math.random() < 0.5;
  const ans = askSmall ? Math.min(a, b) : Math.max(a, b);
  [a, b] = shuffle([a, b]);
  return {
    prompt: askSmall ? `Which is colder: ${fmt(a)}° or ${fmt(b)}°?` : `Which is warmer: ${fmt(a)}° or ${fmt(b)}°?`,
    choices: [a, b].map((n) => ({ value: fmt(n), label: `${fmt(n)}°`, name: `${fmt(n)} degrees` })),
    answer: fmt(ans),
    hint: 'Picture the thermometer: lower down is colder, higher up is warmer.',
    explain: [
      `On a thermometer, ${fmt(Math.min(a, b))}° is lower down than ${fmt(Math.max(a, b))}°.`,
      'Lower is colder. Higher is warmer.',
      askSmall ? `So ${fmt(ans)}° is colder.` : `So ${fmt(ans)}° is warmer.`,
    ],
  };
}

function change(): Question {
  const start = rand(-8, 4);
  const up = Math.random() < 0.55;
  const d = rand(2, 9);
  const end = up ? start + d : start - d;
  return {
    prompt: `It is ${fmt(start)}°. It gets ${d}° ${up ? 'warmer' : 'colder'}. What is the temperature now?`,
    visual: <NumberLinePicture min={-10} max={10} labelEvery={2} marks={[{ value: start, color: C.yellow, label: `${fmt(start)}` }]} />,
    answer: String(end),
    allowNegative: true,
    hint: up ? `Warmer means go up. Count up ${d} from ${fmt(start)}.` : `Colder means go down. Count down ${d} from ${fmt(start)}.`,
    explain: [
      `Start at ${fmt(start)}°.`,
      `${up ? 'Warmer' : 'Colder'} means go ${up ? 'up' : 'down'} ${d}${(start < 0) !== (end < 0) && end !== 0 && start !== 0 ? ', past 0' : ''}.`,
      `${fmt(start)} ${up ? '+' : '−'} ${d} = ${fmt(end)}, so it is ${fmt(end)}° now.`,
    ],
  };
}

function arithmetic(level: number): Question {
  if (level === 1) {
    const a = -rand(1, 9);
    const b = rand(1, 12);
    return {
      prompt: `${fmt(a)} + ${b} = ?`,
      visual: <NumberLinePicture min={-10} max={10} labelEvery={2} hops={a + b <= 10 ? [{ from: a, to: a + b }] : []} />,
      answer: String(a + b),
      allowNegative: true,
      hint: `Start at ${fmt(a)} and count up ${b}.`,
      explain: [
        `Start at ${fmt(a)} on the number line.`,
        b < -a
          ? `Hop up ${b}. You are still below 0.`
          : b === -a
            ? `Hop up ${b} and you land exactly on 0.`
            : `${-a} hops take you up to 0, then ${a + b} more.`,
        `${fmt(a)} + ${b} = ${fmt(a + b)}.`,
      ],
    };
  }
  const kind = pick(['sub', 'negsub', 'diff'] as const);
  if (kind === 'sub') {
    const a = rand(1, 8);
    const b = rand(a + 1, 15);
    return {
      prompt: `${a} − ${b} = ?`,
      answer: String(a - b),
      allowNegative: true,
      hint: `Count back ${b} from ${a}. You will go past zero.`,
      explain: [`Counting back ${a} from ${a} gets you to 0.`, `You still need to go back ${b - a} more, below 0.`, `${a} − ${b} = ${fmt(a - b)}.`],
    };
  }
  if (kind === 'negsub') {
    const a = -rand(1, 8);
    const b = rand(1, 9);
    return {
      prompt: `${fmt(a)} − ${b} = ?`,
      answer: String(a - b),
      allowNegative: true,
      hint: `Start at ${fmt(a)} and count down ${b} more.`,
      explain: [`Start at ${fmt(a)}.`, `Going down ${b} more takes you further below 0.`, `${fmt(a)} − ${b} = ${fmt(a - b)}.`],
    };
  }
  const lo = -rand(2, 9);
  const hi = rand(1, 9);
  return {
    prompt: `How many degrees is it from ${fmt(lo)}° up to ${hi}°?`,
    speak: `How many degrees is it from minus ${-lo} degrees up to ${hi} degrees?`,
    answer: String(hi - lo),
    allowNegative: true,
    hint: 'Split the jump at 0: count up to 0, then on to the top.',
    explain: [`From ${fmt(lo)}° up to 0° is ${-lo} degrees.`, `From 0° up to ${hi}° is ${hi} degrees.`, `${-lo} + ${hi} = ${hi - lo} degrees.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([readThermometer, readThermometer, () => colder(0)])();
  if (level === 1) return pick([readThermometer, () => colder(1), change, () => arithmetic(1)])();
  return pick([change, () => arithmetic(2), () => arithmetic(2)])();
}

export const negativeNumbers: Lesson = {
  id: 'negative-numbers',
  title: 'Negative Numbers',
  Thumb,
  Scene: NegativeScene,
  sceneHint: 'Drag the yellow marker · Press the buttons to warm up or cool down',
  learn: {
    heading: 'Negative numbers',
    intro: 'Negative numbers are numbers less than zero. We see them on thermometers when it is freezing cold, written with a minus sign: −5.',
    points: [
      { icon: ThermometerSnowflake, text: 'Below zero, the numbers count down: −1, −2, −3…' },
      { icon: Snowflake, text: '−8 is colder (smaller) than −2.' },
      { icon: Sun, text: 'Adding moves up the scale. Subtracting moves down.' },
    ],
  },
  steps: [
    'Find your starting number on the number line or thermometer.',
    'To add, count up. To subtract, count down.',
    'When you pass zero, keep counting: … 2, 1, 0, −1, −2 …',
    'The number you land on is your answer.',
  ],
  example: {
    question: 'It is −4° in the morning. By lunch it is 7° warmer. What is the temperature?',
    visual: <NumberLinePicture min={-10} max={10} labelEvery={2} hops={[{ from: -4, to: 3 }]} />,
    work: ['Start at −4.', 'Count up 4 to reach 0.', 'Count up 3 more to reach 3.'],
    answer: 'It is 3° at lunch.',
  },
  grownups: [
    'Check the weather forecast together in winter, or look at the freezer temperature (around −18°C).',
    'Lifts and car parks with floors below ground (−1, −2) are great real examples.',
    'A common mistake is thinking −8 is bigger than −2 “because 8 is bigger”. Use a thermometer: which is colder?',
    'Always draw or imagine a number line. Counting across zero is where errors happen.',
  ],
  makeQuestion,
};
