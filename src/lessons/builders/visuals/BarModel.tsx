import { C, shade } from '../../../lib/color';

export type StoryType = 'join' | 'separate' | 'part' | 'compare';

export interface Story {
  type: StoryType;
  text: string;
  /** The two numbers the story gives. */
  given: [number, number];
  answer: number;
  equation: string;
  /** Bar segments: top row and bottom row, each a list of [value, isUnknown, colour]. */
  top: Seg[];
  bottom: Seg[];
}

export interface Seg {
  value: number;
  unknown: boolean;
  color: string;
  /** For drag-and-drop: which given number belongs here (index into `given`), or -1 for the unknown. */
  slot: number;
}

const NAMES = ['Mia', 'Leo', 'Ava', 'Sam', 'Zara', 'Omar', 'Noah', 'Lily', 'Kai', 'Ruby'];
const ITEMS = ['apples', 'shells', 'stickers', 'marbles', 'cookies', 'balloons'];

const pickOf = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const randIn = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

export function makeStory(type: StoryType, max: number): Story {
  const n1 = pickOf(NAMES);
  const n2 = pickOf(NAMES.filter((n) => n !== n1));
  const item = pickOf(ITEMS);
  if (type === 'join') {
    const a = randIn(2, Math.max(2, max - 3));
    const b = randIn(1, Math.max(1, max - a));
    return {
      type,
      text: `${n1} has ${a} ${item}. ${n2} gives ${n1} ${b} more. How many ${item} does ${n1} have now?`,
      given: [a, b],
      answer: a + b,
      equation: `${a} + ${b} = ${a + b}`,
      top: [{ value: a + b, unknown: true, color: C.yellow, slot: -1 }],
      bottom: [
        { value: a, unknown: false, color: C.red, slot: 0 },
        { value: b, unknown: false, color: C.blue, slot: 1 },
      ],
    };
  }
  if (type === 'separate') {
    const w = randIn(5, max);
    const b = randIn(1, w - 1);
    return {
      type,
      text: `There are ${w} ${item} in a box. ${n1} takes ${b} out. How many ${item} are left in the box?`,
      given: [w, b],
      answer: w - b,
      equation: `${w} − ${b} = ${w - b}`,
      top: [{ value: w, unknown: false, color: C.yellow, slot: 0 }],
      bottom: [
        { value: w - b, unknown: true, color: C.green, slot: -1 },
        { value: b, unknown: false, color: C.red, slot: 1 },
      ],
    };
  }
  if (type === 'part') {
    const w = randIn(5, max);
    const a = randIn(1, w - 1);
    return {
      type,
      text: `${n1} has ${w} ${item}. ${a} are red and the rest are blue. How many are blue?`,
      given: [w, a],
      answer: w - a,
      equation: `${w} − ${a} = ${w - a}`,
      top: [{ value: w, unknown: false, color: C.yellow, slot: 0 }],
      bottom: [
        { value: a, unknown: false, color: C.red, slot: 1 },
        { value: w - a, unknown: true, color: C.blue, slot: -1 },
      ],
    };
  }
  const big = randIn(4, max);
  const small = randIn(1, big - 1);
  return {
    type,
    text: `${n1} has ${big} ${item}. ${n2} has ${small} ${item}. How many more ${item} does ${n1} have than ${n2}?`,
    given: [big, small],
    answer: big - small,
    equation: `${big} − ${small} = ${big - small}`,
    top: [{ value: big, unknown: false, color: C.purple, slot: 0 }],
    bottom: [
      { value: small, unknown: false, color: C.teal, slot: 1 },
      { value: big - small, unknown: true, color: C.yellow, slot: -1 },
    ],
  };
}

/** Bar model picture for practice questions. */
export function BarPicture({ story, showUnits = true }: { story: Story; showUnits?: boolean }) {
  const total = story.top.reduce((s, g) => s + g.value, 0);
  const W = 420;
  const unit = W / total;
  const row = (segs: Seg[], y: number, dashedUnknown: boolean) => {
    let x = 20;
    return segs.map((g, i) => {
      const w = g.value * unit;
      const el = (
        <g key={i}>
          <rect
            x={x}
            y={y}
            width={w}
            height={44}
            rx={6}
            fill={g.unknown ? C.white : shade(g.color, 0.55)}
            stroke={C.ink}
            strokeWidth={2.5}
            strokeDasharray={g.unknown && dashedUnknown ? '7 5' : undefined}
          />
          {showUnits &&
            !g.unknown &&
            Array.from({ length: g.value - 1 }, (_, k) => (
              <line key={k} x1={x + (k + 1) * unit} y1={y + 6} x2={x + (k + 1) * unit} y2={y + 38} stroke={shade(g.color, -0.2)} strokeWidth={1.2} />
            ))}
          <text x={x + w / 2} y={y + 23} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill={C.ink}>
            {g.unknown ? '?' : g.value}
          </text>
        </g>
      );
      x += w;
      return el;
    });
  };
  return (
    <svg viewBox="0 0 460 130" role="img" aria-label={`Bar model: ${story.equation.replace(/= \d+$/, '= ?')}`}>
      {row(story.top, 12, true)}
      {row(story.bottom, 70, true)}
    </svg>
  );
}
