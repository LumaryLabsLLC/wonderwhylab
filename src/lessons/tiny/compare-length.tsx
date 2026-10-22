import { useState } from 'react';
import { AlignLeft, Boxes, Ruler, Scale } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { countList } from './explain';
import { CubeRow, LengthPicture, Toy, TOY_LENGTH, TOYS } from './visuals/LengthToys';
import type { ToyKind } from './visuals/LengthToys';

const START = 140;
const UNIT = 50;
const LANES = [210, 420];
const RULER = 12;

interface Lane {
  kind: ToyKind;
  /** Pixels from the start line (0 = lined up). */
  shift: number;
}

const lined = (l: Lane) => l.shift === 0;

function compareSentence(a: Lane, b: Lane): string {
  if (!lined(a) || !lined(b)) return 'Slide both toys to the start line. Then we can compare fairly!';
  const la = TOY_LENGTH[a.kind];
  const lb = TOY_LENGTH[b.kind];
  const [long, short] = la > lb ? [a.kind, b.kind] : [b.kind, a.kind];
  return `The ${long} is longer than the ${short}. ${Math.max(la, lb)} cubes is more than ${Math.min(la, lb)} cubes.`;
}

function LaneToy({ lane, y, onShift }: { lane: Lane; y: number; onShift: (shift: number, done: boolean) => void }) {
  const [grab, setGrab] = useState<{ px: number; shift: number } | null>(null);
  const drag = useSvgDrag(
    (p) => {
      if (!grab) return;
      onShift(clamp(grab.shift + p.x - grab.px, -60, 220), false);
    },
    {
      onStart: (p) => setGrab({ px: p.x, shift: lane.shift }),
      onEnd: () => {
        setGrab(null);
        onShift(lane.shift, true);
      },
    },
  );
  const len = TOY_LENGTH[lane.kind] * UNIT;
  const left = START + lane.shift;
  return (
    <g {...drag} role="slider" aria-label={`Slide the ${lane.kind}`} aria-valuenow={Math.round(lane.shift / UNIT)}>
      <rect x={left - 8} y={y - 30} width={len + 16} height={60} rx={12} fill="transparent" />
      <Toy kind={lane.kind} x={left} y={y} len={len} />
    </g>
  );
}

function CompareScene() {
  const [lanes, setLanes] = useState<Lane[]>([
    { kind: 'ribbon', shift: 0 },
    { kind: 'caterpillar', shift: UNIT * 2 },
  ]);

  const setShift = (i: number) => (shift: number, done: boolean) => {
    // Let go near the start line and the toy snaps onto it.
    const v = done && Math.abs(shift) < 22 ? 0 : shift;
    setLanes((ls) => ls.map((l, k) => (k === i ? { ...l, shift: v } : l)));
    if (done) play(v === 0 ? 'pop' : 'tap');
  };

  const swap = (i: number) => {
    setLanes((ls) => {
      const other = ls[1 - i].kind;
      const order = TOYS.filter((t) => t !== other);
      const next = order[(order.indexOf(ls[i].kind) + 1) % order.length];
      return ls.map((l, k) => (k === i ? { kind: next, shift: l.shift } : l));
    });
    play('tap');
  };

  const lineUp = () => {
    setLanes((ls) => ls.map((l) => ({ ...l, shift: 0 })));
    play('pop');
  };

  const sentence = compareSentence(lanes[0], lanes[1]);
  const lines = wrap(sentence, 21);

  return (
    <SceneSvg label="Two toys to slide to the start line and measure with cubes">
      {/* Start line */}
      <line x1={START} y1={120} x2={START} y2={500} stroke={C.ink} strokeWidth={4} strokeDasharray="10 8" />
      <text x={START} y={104} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        Start
      </text>

      {lanes.map((l, i) => {
        const y = LANES[i];
        return (
          <g key={i}>
            <rect x={START} y={y - 40} width={RULER * UNIT} height={80} rx={10} fill={shade(C.paper, 0.4)} />
            <CubeRow x={START} y={y + 34} count={RULER} unit={UNIT} />
            <LaneToy lane={l} y={y} onShift={setShift(i)} />
            <SvgButton x={24} y={y - 26} w={96} h={52} fontSize={18} label="Swap" title={`Swap the ${l.kind} for another toy`} onClick={() => swap(i)} />
          </g>
        );
      })}

      {/* Readout */}
      <g>
        {lanes.map((l, i) => (
          <g key={i}>
            <rect x={784} y={92 + i * 120} width={186} height={100} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
            <text x={800} y={124 + i * 120} fontSize={20} fontWeight={700} fill={C.ink}>
              {l.kind[0].toUpperCase() + l.kind.slice(1)}
            </text>
            {lined(l) ? (
              <text x={800} y={162 + i * 120} fontSize={26} fontWeight={700} fill={shade(C.orange, -0.3)} className="num">
                {TOY_LENGTH[l.kind]} cubes
              </text>
            ) : (
              <text x={800} y={160 + i * 120} fontSize={16} fill={C.red}>
                Not at the start
              </text>
            )}
          </g>
        ))}
        <rect x={784} y={340} width={186} height={40 + lines.length * 24} rx={14} fill={shade(C.yellow, 0.75)} stroke={C.ink} strokeWidth={2} />
        {lines.map((line, k) => (
          <text key={k} x={798} y={372 + k * 24} fontSize={16} fill={C.ink}>
            {line}
          </text>
        ))}
        <SvgButton x={784} y={540} w={186} h={50} fontSize={17} label="Line them up" onClick={lineUp} color={C.teal} textColor={C.white} disabled={lanes.every(lined)} />
        <SvgButton x={784} y={604} w={186} h={46} fontSize={16} label="Say it" onClick={() => speak(sentence, { force: true })} />
      </g>

      <Callout at={[START, 300]} box={[150, 520]} w={250} icon={AlignLeft} title="Same start line" text="Line both toys up at the start. Then the one that sticks out further is longer." />
      <Callout at={[START + UNIT * 3, LANES[1] + 50]} box={[430, 520]} w={250} icon={Boxes} title="Count the cubes" text="Count the cubes under a toy to find how long it is." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={14} y1={8} x2={14} y2={74} stroke={C.ink} strokeWidth={2} strokeDasharray="4 3" />
      <Toy kind="pencil" x={14} y={24} len={98} />
      <Toy kind="crayon" x={14} y={56} len={56} />
    </svg>
  );
}

const name = (k: ToyKind) => k;

function twoToys(): [ToyKind, ToyKind] {
  const [a, b] = shuffle(TOYS).slice(0, 2);
  return [a, b];
}

function makeQuestion(level: number): Question {
  const style = level === 0 ? 0 : level === 1 ? pick([0, 1, 1]) : pick([1, 2, 3]);
  const [a, b] = twoToys();
  const longer = TOY_LENGTH[a] > TOY_LENGTH[b] ? a : b;
  const shorter = longer === a ? b : a;

  if (style === 1) {
    // Measure one toy with cubes.
    const t = pick(TOYS);
    const n = TOY_LENGTH[t];
    return {
      prompt: `How many cubes long is the ${name(t)}?`,
      visual: <LengthPicture toys={[{ kind: t, cubes: true }]} />,
      choices: numberChoices(n, { count: 3, min: 1, max: 12, spread: 2 }).map((value) => ({ value })),
      answer: String(n),
      hint: 'Start at the start line and count every cube under it.',
      explain: [`The ${name(t)} starts at the start line.`, `Count the cubes under it: ${countList(1, n)}.`, `The ${name(t)} is ${n} cubes long.`],
    };
  }

  if (style === 2) {
    // The trap: the shorter toy starts further along, so its end sticks out past the longer one.
    const pairs = TOYS.flatMap((p) => TOYS.map((q) => [p, q] as const)).filter(([p, q]) => {
      const d = TOY_LENGTH[p] - TOY_LENGTH[q];
      return d >= 1 && d <= 3;
    });
    const [long2, short2] = pick(pairs);
    const shiftShort = TOY_LENGTH[long2] - TOY_LENGTH[short2] + rand(1, 2);
    return trapQuestion(long2, short2, shiftShort);
  }

  if (style === 3) {
    const diff = TOY_LENGTH[longer] - TOY_LENGTH[shorter];
    return {
      prompt: `How many cubes longer is the ${longer} than the ${shorter}?`,
      visual: <LengthPicture toys={[{ kind: longer, cubes: true }, { kind: shorter, cubes: true }]} />,
      choices: numberChoices(diff, { count: 3, min: 1, max: 9, spread: 2 }).map((value) => ({ value })),
      answer: String(diff),
      hint: 'Line them up and look at the cubes that stick out past the shorter one.',
      explain: [
        `The ${longer} is ${TOY_LENGTH[longer]} cubes. The ${shorter} is ${TOY_LENGTH[shorter]} cubes.`,
        `Count the extra cubes past the end of the ${shorter}: ${countList(1, diff)}.`,
        `The ${longer} is ${diff} cubes longer.`,
      ],
    };
  }

  const askShort = level > 0 && Math.random() < 0.5;
  const target = askShort ? shorter : longer;
  return {
    prompt: `Which is ${askShort ? 'shorter' : 'longer'}?`,
    visual: <LengthPicture toys={shuffle([{ kind: a }, { kind: b }])} />,
    choices: shuffle([a, b]).map((v) => ({ value: v })),
    answer: target,
    hint: 'They start at the same line, so look at the other end.',
    explain: [
      'Both toys start at the same line.',
      askShort ? `The ${target} stops first.` : `The ${target} sticks out further.`,
      `So the ${target} is ${askShort ? 'shorter' : 'longer'}.`,
    ],
  };
}

function trapQuestion(longer: ToyKind, shorter: ToyKind, shiftShort: number): Question {
  const toys = shuffle([
    { kind: longer, shift: 0, cubes: true },
    { kind: shorter, shift: shiftShort, cubes: true },
  ]);
  return {
    prompt: 'They don’t start at the same place! Which is longer?',
    visual: <LengthPicture toys={toys} />,
    choices: shuffle([longer, shorter]).map((v) => ({ value: v })),
    answer: longer,
    hint: 'Don’t just look at the ends. Count the cubes under each toy.',
    explain: [
      'The toys start in different places, so count cubes.',
      `The ${longer} is ${TOY_LENGTH[longer]} cubes and the ${shorter} is ${TOY_LENGTH[shorter]} cubes.`,
      `${TOY_LENGTH[longer]} is more, so the ${longer} is longer.`,
    ],
  };
}

export const compareLength: Lesson = {
  id: 'compare-length',
  title: 'Longer or Shorter',
  Thumb,
  Scene: CompareScene,
  sceneHint: 'Slide the toys to the start line · Count the cubes',
  learn: {
    heading: 'Longer or shorter?',
    intro: 'To see which thing is longer, start them at the same line. The one that sticks out further is longer. Counting cubes tells us how long it is!',
    points: [
      { icon: AlignLeft, text: 'Line things up at the same start.' },
      { icon: Scale, text: 'The one that sticks out further is longer.' },
      { icon: Ruler, text: 'Count cubes to measure how long.' },
    ],
  },
  steps: [
    'Put both things at the start line.',
    'Look at the other end. Which one goes further?',
    'Count the cubes under each one to measure it.',
    'More cubes means longer!',
  ],
  example: {
    question: 'Which is longer, the pencil or the crayon?',
    visual: <LengthPicture toys={[{ kind: 'pencil', cubes: true }, { kind: 'crayon', cubes: true }]} />,
    work: ['Both start at the start line.', 'The pencil is 7 cubes. The crayon is 4 cubes.', '7 is more than 4.'],
    answer: 'The pencil is longer.',
  },
  grownups: [
    'Compare real things: shoes, spoons, toy cars. Always line up one end first.',
    'Use the same unit to measure (blocks, paper clips). Gaps or overlaps between units give wrong answers.',
    'If your child says the one that “looks” longer when ends aren’t lined up, slide them together and look again.',
  ],
  makeQuestion,
};
