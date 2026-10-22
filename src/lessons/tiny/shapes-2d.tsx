import { useState } from 'react';
import { CircleDot, Ruler, Triangle } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { choices } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg } from '../../stage/widgets';
import { countList } from './explain';

type ShapeId = 'circle' | 'triangle' | 'square' | 'rectangle' | 'pentagon' | 'hexagon';

interface ShapeInfo {
  id: ShapeId;
  name: string;
  sides: number;
  color: string;
  fact: [string, string];
}

const SHAPES: ShapeInfo[] = [
  { id: 'circle', name: 'circle', sides: 0, color: C.red, fact: ['Round like a wheel.', 'No corners at all!'] },
  { id: 'triangle', name: 'triangle', sides: 3, color: C.yellow, fact: ['Like a slice of pizza', 'or a pointy roof.'] },
  { id: 'square', name: 'square', sides: 4, color: C.blue, fact: ['All 4 sides are', 'the same length.'] },
  { id: 'rectangle', name: 'rectangle', sides: 4, color: C.green, fact: ['Like a door or a book:', '2 long and 2 short sides.'] },
  { id: 'pentagon', name: 'pentagon', sides: 5, color: C.purple, fact: ['5 sides, like the', 'front of a little house.'] },
  { id: 'hexagon', name: 'hexagon', sides: 6, color: C.orange, fact: ['6 sides, like a cell', 'in a bee’s honeycomb.'] },
];

const byId = (id: ShapeId) => SHAPES.find((s) => s.id === id)!;

function regular(n: number, cx: number, cy: number, r: number, start: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

/** Corner points of a shape centred at (cx, cy). Circles have none. */
function corners(id: ShapeId, cx: number, cy: number, size: number): [number, number][] {
  switch (id) {
    case 'circle':
      return [];
    case 'triangle':
      return regular(3, cx, cy + size * 0.1, size * 0.6, -Math.PI / 2);
    case 'square': {
      const h = size * 0.4;
      return [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]];
    }
    case 'rectangle': {
      const w = size * 0.57;
      const h = size * 0.33;
      return [[cx - w, cy - h], [cx + w, cy - h], [cx + w, cy + h], [cx - w, cy + h]];
    }
    case 'pentagon':
      return regular(5, cx, cy + size * 0.04, size * 0.54, -Math.PI / 2);
    case 'hexagon':
      return regular(6, cx, cy, size * 0.52, 0);
  }
}

function ShapeDraw({ id, cx, cy, size, color, strokeWidth = 3 }: { id: ShapeId; cx: number; cy: number; size: number; color: string; strokeWidth?: number }) {
  if (id === 'circle') return <circle cx={cx} cy={cy} r={size * 0.47} fill={color} stroke={C.ink} strokeWidth={strokeWidth} />;
  return <polygon points={corners(id, cx, cy, size).map((p) => p.join(',')).join(' ')} fill={color} stroke={C.ink} strokeWidth={strokeWidth} strokeLinejoin="round" />;
}

const SIZE = 150;
const SPOTS: [number, number][] = [
  [160, 220],
  [360, 220],
  [560, 220],
  [160, 445],
  [360, 445],
  [560, 445],
];

function ShapesScene() {
  const [sel, setSel] = useState(1);
  const info = SHAPES[sel];
  const [sx, sy] = SPOTS[sel];
  const lift = -10;
  const pts = corners(info.id, sx, sy + lift, SIZE);
  const top = sel < 3;

  const choose = (i: number) => {
    setSel(i);
    play('pop');
    const s = SHAPES[i];
    speak(s.sides ? `${s.name}! It has ${s.sides} sides and ${s.sides} corners.` : 'Circle! It is round. No straight sides and no corners.');
  };

  // Pick the side and corner closest to where the callout cards sit (above or below the shape).
  const mids = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as [number, number];
  });
  const better = (a: [number, number], b: [number, number]) => (top ? a[1] < b[1] - 0.5 : a[1] > b[1] + 0.5);
  const sideIndex = mids.reduce((best, m, i) => (better(m, mids[best]) || (Math.abs(m[1] - mids[best][1]) < 0.5 && m[0] < mids[best][0]) ? i : best), 0);
  const sideFrom = pts[sideIndex] ?? [sx, sy];
  const sideTo = pts[(sideIndex + 1) % Math.max(1, pts.length)] ?? [sx, sy];
  // Anchor part-way along the side from its left end, so the line misses the side's number badge.
  const [l, r] = sideFrom[0] <= sideTo[0] ? [sideFrom, sideTo] : [sideTo, sideFrom];
  const side: [number, number] = [l[0] + (r[0] - l[0]) * 0.3, l[1] + (r[1] - l[1]) * 0.3];
  const corner = pts.reduce((best, p) => (better(p, best) || (Math.abs(p[1] - best[1]) < 0.5 && p[0] > best[0]) ? p : best), pts[0] ?? [sx, sy]);
  const boxY = top ? 22 : 560;
  const sideBoxX = Math.max(40, sx - 290);
  const cornerBoxX = Math.max(sx + 20, sideBoxX + 270);

  return (
    <SceneSvg label={`Six shapes. The ${info.name} is picked.`}>
      {SHAPES.map((s, i) => {
        const [cx, cy] = SPOTS[i];
        const on = i === sel;
        return (
          <g key={s.id} onClick={() => choose(i)} style={{ cursor: 'pointer' }} role="button" aria-label={s.name} aria-pressed={on} data-nopan>
            <rect x={cx - 95} y={cy - 100} width={190} height={200} fill="transparent" />
            <g transform={`translate(${on ? 10 : 5} ${on ? 14 : 7})`} opacity={on ? 0.2 : 0.13}>
              <ShapeDraw id={s.id} cx={cx} cy={cy} size={SIZE} color={C.ink} strokeWidth={0} />
            </g>
            <g transform={`translate(0 ${on ? lift : 0})`} style={{ transition: 'transform 0.2s' }}>
              <ShapeDraw id={s.id} cx={cx} cy={cy} size={SIZE} color={on ? s.color : shade(s.color, 0.35)} strokeWidth={on ? 4 : 2.5} />
            </g>
          </g>
        );
      })}

      {/* Sides and corners of the picked shape */}
      {info.sides > 0 && (
        <g key={sel} pointerEvents="none">
          {mids.map(([mx, my], i) => {
            const dx = mx - sx;
            const dy = my - (sy + lift);
            const len = Math.hypot(dx, dy) || 1;
            const lx = mx + (dx / len) * 22;
            const ly = my + (dy / len) * 22;
            return (
              <g key={`s${i}`} className="pop-in" style={{ transformOrigin: `${lx}px ${ly}px`, animationDelay: `${i * 0.08}s` }}>
                <circle cx={lx} cy={ly} r={14} fill={C.teal} stroke={C.ink} strokeWidth={2} />
                <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.white} className="num">
                  {i + 1}
                </text>
              </g>
            );
          })}
          {pts.map(([px, py], i) => (
            <circle key={`c${i}`} cx={px} cy={py} r={8} fill={C.pink} stroke={C.ink} strokeWidth={2} className="pop-in" style={{ transformOrigin: `${px}px ${py}px`, animationDelay: `${0.3 + i * 0.08}s` }} />
          ))}
        </g>
      )}

      {/* Info card */}
      <g>
        <rect x={694} y={128} width={260} height={330} rx={14} fill={shade(C.paper, -0.12)} />
        <rect x={690} y={122} width={260} height={330} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={820} y={168} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.ink} className="caps">
          {info.name}
        </text>
        <ShapeDraw id={info.id} cx={820} cy={232} size={80} color={info.color} />
        <g>
          <circle cx={724} cy={312} r={12} fill={C.teal} stroke={C.ink} strokeWidth={2} />
          <text x={746} y={312} dominantBaseline="central" fontSize={20} fontWeight={600} fill={C.ink}>Sides</text>
          <text x={920} y={312} textAnchor="end" dominantBaseline="central" fontSize={32} fontWeight={700} fill={C.ink} className="num">
            {info.sides}
          </text>
          <circle cx={724} cy={358} r={8} fill={C.pink} stroke={C.ink} strokeWidth={2} />
          <text x={746} y={358} dominantBaseline="central" fontSize={20} fontWeight={600} fill={C.ink}>Corners</text>
          <text x={920} y={358} textAnchor="end" dominantBaseline="central" fontSize={32} fontWeight={700} fill={C.ink} className="num">
            {info.sides}
          </text>
        </g>
        <line x1={710} y1={386} x2={930} y2={386} stroke={C.line} strokeWidth={1.5} />
        <text x={820} y={412} textAnchor="middle" fontSize={16} fill={C.ink2}>{info.fact[0]}</text>
        <text x={820} y={434} textAnchor="middle" fontSize={16} fill={C.ink2}>{info.fact[1]}</text>
      </g>
      <text x={820} y={490} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">Tap a shape to pick it</text>

      {info.sides > 0 ? (
        <>
          <Callout at={side} box={[sideBoxX, boxY]} w={250} icon={Ruler} title="Sides" text="The straight edges. Count them one by one." />
          <Callout at={corner} box={[cornerBoxX, boxY]} w={250} icon={CircleDot} title="Corners" text="Where two sides meet. Same number as sides!" />
        </>
      ) : (
        <Callout at={[sx + SIZE * 0.47 * Math.cos(-0.8), sy + lift + SIZE * 0.47 * Math.sin(-0.8)]} box={[300, 22]} w={260} icon={CircleDot} title="All round" text="A circle has one curvy edge and no corners." />
      )}
    </SceneSvg>
  );
}

function ShapePicture({ id, color }: { id: ShapeId; color?: string }) {
  const s = byId(id);
  return (
    <svg viewBox="-60 -56 120 112" role="img" aria-label={s.name}>
      <ShapeDraw id={id} cx={0} cy={0} size={100} color={color ?? s.color} />
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={68} rx={48} ry={7} fill={C.ink} opacity={0.12} />
      <ShapeDraw id="circle" cx={26} cy={44} size={36} color={C.red} strokeWidth={2} />
      <ShapeDraw id="triangle" cx={60} cy={36} size={42} color={C.yellow} strokeWidth={2} />
      <ShapeDraw id="square" cx={94} cy={46} size={38} color={C.blue} strokeWidth={2} />
    </svg>
  );
}

const shapeChoice = (id: ShapeId): Choice => ({ value: id, name: byId(id).name, label: <ShapePicture id={id} /> });

/** One child-friendly sentence that describes how to spot a shape. */
function spot(id: ShapeId): string {
  const s = byId(id);
  if (id === 'circle') return 'A circle is round, with no sides and no corners.';
  if (id === 'square') return 'A square has 4 sides that are all the same length.';
  if (id === 'rectangle') return 'A rectangle has 4 sides: 2 long and 2 short.';
  return `A ${s.name} has ${s.sides} sides and ${s.sides} corners.`;
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const pool: ShapeId[] = ['circle', 'triangle', 'square', 'rectangle'];
    const options = shuffle(pool).slice(0, 3);
    const answer = pick(options);
    return {
      prompt: `Which one is a ${answer}?`,
      choices: options.map(shapeChoice),
      answer,
      hint: 'Look at each shape. Count its sides and check if it is round.',
      explain: [spot(answer), `Look for the shape that matches.`, `That one is the ${answer}.`],
    };
  }

  if (level === 1) {
    if (Math.random() < 0.5) {
      const s = pick(SHAPES.filter((x) => x.sides > 0 && x.sides <= 5));
      return {
        prompt: `How many sides does this ${s.name} have?`,
        visual: <ShapePicture id={s.id} />,
        choices: choices(numberChoices(s.sides, { count: 3, min: 0, max: 8 })),
        answer: String(s.sides),
        hint: 'Put your finger on one side and count as you go around.',
        explain: [
          'Start at one side and go all the way around.',
          `Count each side once: ${countList(1, s.sides)}.`,
          `A ${s.name} has ${s.sides} sides.`,
        ],
      };
    }
    // Pick a side count, then shapes that all have different counts.
    const target = pick([0, 3, 4, 5, 6]);
    const answerShape = pick(SHAPES.filter((s) => s.sides === target));
    const others = shuffle(SHAPES.filter((s) => s.sides !== target));
    const used = new Set([target]);
    const opts = [answerShape];
    for (const o of others) {
      if (opts.length === 3) break;
      if (!used.has(o.sides)) {
        used.add(o.sides);
        opts.push(o);
      }
    }
    return {
      prompt: target === 0 ? 'Which shape has no corners?' : `Which shape has ${target} sides?`,
      choices: shuffle(opts).map((s) => shapeChoice(s.id)),
      answer: answerShape.id,
      hint: 'Count the sides of each shape.',
      explain: [
        target === 0 ? 'Look for a shape that is round all the way.' : `Count the sides of each shape. You need ${target}.`,
        spot(answerShape.id),
        `So the answer is the ${answerShape.name}.`,
      ],
    };
  }

  // Level 2: corners of bigger shapes, and riddles.
  if (Math.random() < 0.5) {
    const s = pick(SHAPES.filter((x) => x.sides >= 3));
    return {
      prompt: `How many corners does this ${s.name} have?`,
      visual: <ShapePicture id={s.id} />,
      choices: choices(numberChoices(s.sides, { count: 4, min: 0, max: 8 })),
      answer: String(s.sides),
      hint: 'Corners are where two sides meet. Count the pointy bits.',
      explain: [
        'Start at one corner and go around.',
        `Count each corner once: ${countList(1, s.sides)}.`,
        `A ${s.name} has ${s.sides} corners.`,
      ],
    };
  }
  const riddles: { text: string; answer: ShapeId; options: ShapeId[] }[] = [
    { text: 'I have 3 sides and 3 corners. What am I?', answer: 'triangle', options: ['triangle', 'square', 'circle'] },
    { text: 'I am round and have no corners. What am I?', answer: 'circle', options: ['circle', 'hexagon', 'square'] },
    { text: 'My 4 sides are all the same length. What am I?', answer: 'square', options: ['square', 'triangle', 'pentagon'] },
    { text: 'I have 6 sides, like a honeycomb. What am I?', answer: 'hexagon', options: ['hexagon', 'pentagon', 'rectangle'] },
    { text: 'I have 5 sides and 5 corners. What am I?', answer: 'pentagon', options: ['pentagon', 'hexagon', 'triangle'] },
    { text: 'I have 2 long sides and 2 short sides. What am I?', answer: 'rectangle', options: ['rectangle', 'triangle', 'circle'] },
  ];
  const r = pick(riddles);
  return {
    prompt: r.text,
    choices: shuffle(r.options).map(shapeChoice),
    answer: r.answer,
    hint: 'Count the sides on each shape.',
    explain: [`Read the clue again: ${r.text.replace(' What am I?', '')}`, spot(r.answer), `So I am a ${r.answer}.`],
  };
}

export const shapes2d: Lesson = {
  id: 'shapes-2d',
  title: 'Shapes',
  Thumb,
  Scene: ShapesScene,
  sceneHint: 'Tap a shape to count its sides and corners',
  learn: {
    heading: 'Flat shapes',
    intro: 'Shapes are everywhere! We can tell them apart by counting their sides and corners.',
    points: [
      { icon: Ruler, text: 'Sides are the straight edges.' },
      { icon: CircleDot, text: 'Corners are where two sides meet.' },
      { icon: Triangle, text: 'A triangle has 3 sides and 3 corners.' },
    ],
  },
  steps: [
    'Look at the shape. Is it round or does it have straight sides?',
    'Put your finger on one side and count each side as you go around.',
    'Now count the corners — the pointy bits.',
    'Use the number of sides to name it: 3 is a triangle, 4 is a square or rectangle.',
  ],
  example: {
    question: 'What shape is this?',
    visual: (
      <svg viewBox="-60 -56 120 112" role="img" aria-label="a pentagon">
        <ShapeDraw id="pentagon" cx={0} cy={0} size={100} color={C.purple} />
      </svg>
    ),
    work: ['Count the sides: 1, 2, 3, 4, 5.', 'Count the corners: 5.', 'A shape with 5 sides is a pentagon.'],
    answer: 'It’s a pentagon!',
  },
  grownups: [
    'Go on a shape hunt: plates (circles), windows (rectangles), road signs (triangles and octagons).',
    'Show shapes turned in different ways. A triangle upside down is still a triangle — children often think it isn’t.',
    'A square is a special rectangle. That idea can wait, but don’t tell them a square is “not a rectangle”.',
    'Tracing around the sides with a finger helps children count each side only once.',
  ],
  makeQuestion,
};
