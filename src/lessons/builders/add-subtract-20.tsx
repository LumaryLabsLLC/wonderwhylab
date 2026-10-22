import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Footprints, MapPin } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { NumberLine, NumberLinePicture, lineX } from '../../visuals/NumberLine';
import type { Hop } from '../../visuals/NumberLine';
import { Frog } from './visuals/Frog';

const LINE = { x: 90, y: 400, width: 820, min: 0, max: 20 };
const X = (v: number) => lineX(v, LINE);

function Stepper({ x, y, label, value, onChange, min, max, color }: { x: number; y: number; label: string; value: number; onChange: (v: number) => void; min: number; max: number; color: string }) {
  return (
    <g>
      <text x={x + 105} y={y - 14} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        {label}
      </text>
      <SvgButton x={x} y={y} w={56} label="−" title={`${label} smaller`} onClick={() => onChange(value - 1)} disabled={value <= min} />
      <rect x={x + 66} y={y} width={78} height={56} rx={12} fill={shade(color, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={x + 105} y={y + 29} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {value}
      </text>
      <SvgButton x={x + 154} y={y} w={56} label="+" title={`${label} bigger`} onClick={() => onChange(value + 1)} disabled={value >= max} />
    </g>
  );
}

function AddSubScene() {
  const [start, setStart] = useState(8);
  const [jump, setJump] = useState(5);
  const [op, setOp] = useState<'+' | '−'>('+');
  const [hopped, setHopped] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const sign = op === '+' ? 1 : -1;
  const maxJump = op === '+' ? 20 - start : start;
  const end = start + sign * jump;
  const pos = start + sign * hopped;
  const finished = hopped === jump && jump > 0;

  const reset = () => {
    window.clearInterval(timer.current);
    setRunning(false);
    setHopped(0);
  };
  const changeStart = (v: number) => {
    reset();
    const s = clamp(v, 0, 20);
    setStart(s);
    setJump((j) => Math.min(j, op === '+' ? 20 - s : s));
    play('tap');
  };
  const changeJump = (v: number) => {
    reset();
    setJump(clamp(v, 0, Math.min(10, maxJump)));
  };
  const changeOp = (o: '+' | '−') => {
    reset();
    setOp(o);
    setJump((j) => Math.min(j, o === '+' ? 20 - start : start));
  };

  const hop = () => {
    reset();
    if (jump === 0) return;
    let n = 0;
    setRunning(true);
    timer.current = window.setInterval(() => {
      n += 1;
      setHopped(n);
      play('pop');
      speak(String(n));
      if (n >= jump) {
        window.clearInterval(timer.current);
        setRunning(false);
        window.setTimeout(() => {
          speak(`${start} ${op === '+' ? 'plus' : 'take away'} ${jump} is ${end}!`);
          play('correct');
        }, 500);
      }
    }, 650);
  };

  const hops: Hop[] = Array.from({ length: hopped }, (_, i) => ({
    from: start + sign * i,
    to: start + sign * (i + 1),
    label: String(i + 1),
    color: op === '+' ? C.teal : C.orange,
  }));

  return (
    <SceneSvg label={`Number line: ${start} ${op} ${jump}`}>
      {/* Number sentence */}
      <g>
        <rect x={340} y={44} width={320} height={86} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
        <text x={500} y={89} textAnchor="middle" dominantBaseline="central" fontSize={48} fontWeight={700} className="num">
          <tspan fill={shade(C.red, -0.15)}>{start}</tspan>
          <tspan fill={C.ink}> {op} </tspan>
          <tspan fill={shade(op === '+' ? C.teal : C.orange, -0.2)}>{jump}</tspan>
          <tspan fill={C.ink}> = </tspan>
          <tspan fill={finished ? C.ink : C.muted}>{finished ? end : '?'}</tspan>
        </text>
      </g>

      <NumberLine
        {...LINE}
        hops={hops}
        marks={[{ value: start, color: C.red }]}
        fontSize={19}
        onPick={(v) => !running && changeStart(v)}
      />

      {/* Frog */}
      <g style={{ transform: `translate(${X(pos)}px, ${LINE.y - 8}px)`, transition: 'transform 0.4s cubic-bezier(.3,1.5,.5,1)' }}>
        <Frog size={74} />
      </g>

      {/* Controls */}
      <Stepper x={70} y={520} label="Start" value={start} onChange={changeStart} min={0} max={20} color={C.red} />
      <g>
        <text x={385} y={506} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
          Add or take
        </text>
        <SvgButton x={330} y={520} w={52} label="+" title="Add" active={op === '+'} color={op === '+' ? C.teal : C.card} textColor={op === '+' ? C.white : C.ink} onClick={() => changeOp('+')} />
        <SvgButton x={390} y={520} w={52} label="−" title="Take away" active={op === '−'} color={op === '−' ? C.orange : C.card} onClick={() => changeOp('−')} />
      </g>
      <Stepper x={470} y={520} label="Jump" value={jump} onChange={changeJump} min={0} max={Math.min(10, maxJump)} color={op === '+' ? C.teal : C.orange} />
      <SvgButton x={720} y={516} w={190} h={64} fontSize={24} label={running ? 'Hopping…' : 'Hop!'} color={C.green} textColor={C.white} disabled={running || jump === 0} onClick={hop} />

      <Callout
        at={[X(start), LINE.y - 2]}
        box={[60, 160]}
        w={230}
        icon={MapPin}
        title="Start here"
        text="Put the frog on the first number. Tap the line to move it."
      />
      <Callout
        at={[X(20) + 26, LINE.y]}
        box={[700, 160]}
        w={250}
        icon={op === '+' ? ArrowRight : ArrowLeft}
        title={op === '+' ? 'Adding hops right' : 'Taking away hops left'}
        text={op === '+' ? 'Numbers get bigger as you hop right.' : 'Numbers get smaller as you hop left.'}
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={8} y1={60} x2={112} y2={60} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={14 + i * 12} y1={55} x2={14 + i * 12} y2={65} stroke={C.ink} strokeWidth={1.5} />
      ))}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${38 + i * 12},57 Q${44 + i * 12},40 ${50 + i * 12},57`} fill="none" stroke={C.teal} strokeWidth={2.5} />
      ))}
      <g transform="translate(74 54)">
        <Frog size={34} />
      </g>
    </svg>
  );
}

/** "9, 10, 11" — the numbers you say when counting on (or back) from `from`. */
function counted(from: number, steps: number, dir: 1 | -1): string {
  return Array.from({ length: steps }, (_, i) => from + dir * (i + 1)).join(', ');
}

/** Worked steps for a + b, using "make a ten" when it crosses 10. */
function addSteps(a: number, b: number): string[] {
  const sum = a + b;
  if (a < 10 && sum > 10) {
    const toTen = 10 - a;
    return [`${a} + ${b}: split ${b} into ${toTen} and ${b - toTen}.`, `${a} + ${toTen} = 10.`, `10 + ${b - toTen} = ${sum}. So ${a} + ${b} = ${sum}.`];
  }
  return [`Start at ${a}.`, b <= 6 ? `Count on ${b}: ${counted(a, b, 1)}.` : `Hop forward ${b}.`, `You land on ${sum}. So ${a} + ${b} = ${sum}.`];
}

/** Worked steps for a − b, counting back (and through 10 when needed). */
function subSteps(a: number, b: number): string[] {
  const diff = a - b;
  if (a > 10 && diff < 10) {
    const toTen = a - 10;
    return [`${a} − ${b}: split ${b} into ${toTen} and ${b - toTen}.`, `${a} − ${toTen} = 10.`, `10 − ${b - toTen} = ${diff}. So ${a} − ${b} = ${diff}.`];
  }
  return [`Start at ${a}.`, b <= 6 ? `Count back ${b}: ${counted(a, b, -1)}.` : `Hop back ${b}.`, `You land on ${diff}. So ${a} − ${b} = ${diff}.`];
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const a = rand(1, 7);
    const b = rand(1, Math.min(5, 10 - a));
    return {
      prompt: `${a} + ${b} = ?`,
      speak: `The frog starts on ${a} and hops ${b}. Where does it land?`,
      visual: <NumberLinePicture min={0} max={10} marks={[{ value: a, color: C.red }]} hops={Array.from({ length: b }, (_, i) => ({ from: a + i, to: a + i + 1, label: String(i + 1) }))} />,
      choices: numberChoices(a + b, { count: 3, min: 0, max: 10 }).map((value) => ({ value })),
      answer: String(a + b),
      hint: `Put your finger on ${a}, then hop forward one at a time.`,
      explain: [`Start at ${a}.`, `Hop ${b}: ${counted(a, b, 1)}.`, `The frog lands on ${a + b}. So ${a} + ${b} = ${a + b}.`],
    };
  }
  const subtract = Math.random() < 0.5;
  if (level === 1) {
    if (subtract) {
      const a = rand(6, 15);
      const b = rand(2, Math.min(6, a));
      return {
        prompt: `${a} − ${b} = ?`,
        visual: <NumberLinePicture min={0} max={20} labelEvery={2} marks={[{ value: a, color: C.red }]} />,
        choices: numberChoices(a - b, { min: 0, max: 20 }).map((value) => ({ value })),
        answer: String(a - b),
        hint: 'Taking away means hopping back on the number line.',
        explain: subSteps(a, b),
      };
    }
    const a = rand(5, 12);
    const b = rand(2, Math.min(8, 20 - a));
    return {
      prompt: `${a} + ${b} = ?`,
      visual: <NumberLinePicture min={0} max={20} labelEvery={2} marks={[{ value: a, color: C.red }]} />,
      choices: numberChoices(a + b, { min: 0, max: 20 }).map((value) => ({ value })),
      answer: String(a + b),
      hint: 'Start at the bigger number and count on.',
      explain: addSteps(a, b),
    };
  }
  // Level 2: number pad, including missing numbers.
  const a = rand(4, 15);
  if (Math.random() < 0.3) {
    const total = rand(a + 2, 20);
    return {
      prompt: `${a} + ? = ${total}`,
      speak: `${a} plus what makes ${total}?`,
      answer: String(total - a),
      hint: 'Count on from the first number to the total. How many hops is that?',
      explain: [`Start at ${a} and count on to ${total}.`, total - a <= 6 ? `${counted(a, total - a, 1)}.` : `That is ${total - a} hops.`, `${a} + ${total - a} = ${total}. The missing number is ${total - a}.`],
    };
  }
  if (subtract) {
    const b = rand(3, Math.min(9, a));
    return { prompt: `${a} − ${b} = ?`, answer: String(a - b), hint: 'Hop back on the number line. Can you stop at a ten on the way?', explain: subSteps(a, b) };
  }
  const b = rand(3, Math.min(9, 20 - a));
  const hint = a < 10 && a + b > 10 ? 'Make a ten first, then add the rest.' : 'Start at the bigger number and count on.';
  return { prompt: `${a} + ${b} = ?`, answer: String(a + b), hint, explain: addSteps(a, b) };
}

export const addSubtract20: Lesson = {
  id: 'add-subtract-20',
  title: 'Add & Subtract to 20',
  Thumb,
  Scene: AddSubScene,
  sceneHint: 'Pick a start and a jump, then press Hop!',
  learn: {
    heading: 'Hopping on the number line',
    intro: 'A number line is like a path of numbers. Adding means hopping forward. Taking away means hopping back.',
    points: [
      { icon: MapPin, text: 'Start on the first number.' },
      { icon: ArrowRight, text: 'Adding? Hop to the right — numbers get bigger.' },
      { icon: ArrowLeft, text: 'Taking away? Hop to the left — numbers get smaller.' },
      { icon: Footprints, text: 'Count each hop. Where you land is the answer.' },
    ],
  },
  steps: [
    'Find the first number on the line and put your finger there.',
    'Look at the sign: + means hop right, − means hop left.',
    'Hop one number at a time and count your hops.',
    'Stop when you have done all the hops. Read the number you landed on.',
  ],
  example: {
    question: '9 + 4 = ?',
    visual: <NumberLinePicture min={5} max={15} marks={[{ value: 9, color: C.red }]} hops={[0, 1, 2, 3].map((i) => ({ from: 9 + i, to: 10 + i, label: String(i + 1) }))} />,
    work: ['Start on 9.', 'Hop 4 to the right: 10, 11, 12, 13.', 'We landed on 13.'],
    answer: '9 + 4 = 13',
  },
  grownups: [
    'Encourage “counting on” from the bigger number rather than counting everything from 1.',
    'Bridging through 10 is a powerful strategy: 8 + 5 = 8 + 2 + 3 = 13.',
    'Draw a quick number line on paper or chalk one outside and let your child jump it.',
    'Show that subtraction can also be “finding the difference”: hop from 9 up to 13 to see that 13 − 9 = 4.',
  ],
  makeQuestion,
};
