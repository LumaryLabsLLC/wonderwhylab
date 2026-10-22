import { useState } from 'react';
import { ArrowRight, ArrowUp, Crosshair, MapPin } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { Thing } from '../../visuals/Thing';
import { coord, CoordAxes, CoordPicture, gridGeometry } from './visuals/CoordGrid';
import type { GridPoint } from './visuals/CoordGrid';

const ACROSS = shade(C.blue, -0.15);
const UP = shade(C.orange, -0.2);

const LAYOUT = {
  one: { min: 0, max: 10, cell: 44, left: 100, top: 90 },
  four: { min: -6, max: 6, cell: 38, left: 92, top: 82 },
};

function CoordScene() {
  const [four, setFour] = useState(false);
  const [pt, setPt] = useState({ x: 3, y: 5 });
  const g = four ? LAYOUT.four : LAYOUT.one;
  const { sx, sy, size } = gridGeometry(g.min, g.max, g.cell, g.left, g.top);

  const move = (x: number, y: number) => {
    const nx = clamp(x, g.min, g.max);
    const ny = clamp(y, g.min, g.max);
    if (nx !== pt.x || ny !== pt.y) {
      setPt({ x: nx, y: ny });
      play('tap');
    }
  };

  const drag = useSvgDrag((p) => move(Math.round((p.x - g.left) / g.cell) + g.min, g.max - Math.round((p.y - g.top) / g.cell)));

  const toggle = () => {
    const next = four ? LAYOUT.one : LAYOUT.four;
    setFour(!four);
    setPt({ x: clamp(pt.x, next.min, next.max), y: clamp(pt.y, next.min, next.max) });
  };

  const px = sx(pt.x);
  const py = sy(pt.y);
  const across = pt.x === 0 ? 'no steps across' : `${Math.abs(pt.x)} ${pt.x > 0 ? 'right →' : '← left'}`;
  const up = pt.y === 0 ? 'no steps up or down' : `${Math.abs(pt.y)} ${pt.y > 0 ? 'up ↑' : 'down ↓'}`;

  return (
    <SceneSvg label={`A coordinate grid with a star at ${coord(pt.x, pt.y)}`}>
      <rect x={g.left + 5} y={g.top + 7} width={size} height={size} fill={C.ink} opacity={0.1} />
      <CoordAxes min={g.min} max={g.max} cell={g.cell} left={g.left} top={g.top} />
      <rect x={g.left} y={g.top} width={size} height={size} fill="none" stroke={C.ink} strokeWidth={2} />

      {/* Guides: across along the x-axis, then up or down */}
      <line x1={sx(0)} y1={sy(0)} x2={px} y2={sy(0)} stroke={ACROSS} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
      <line x1={px} y1={sy(0)} x2={px} y2={py} stroke={UP} strokeWidth={4} strokeDasharray="8 7" strokeLinecap="round" />
      <circle cx={sx(0)} cy={sy(0)} r={7} fill={C.ink} />

      <rect x={g.left - g.cell / 2} y={g.top - g.cell / 2} width={size + g.cell} height={size + g.cell} fill="transparent" {...drag} style={{ ...drag.style, cursor: 'crosshair' }} />
      <g pointerEvents="none" className="pop-in" key={`${pt.x},${pt.y}`} style={{ transformOrigin: `${px}px ${py}px` }}>
        <Thing kind="star" x={px} y={py} size={50} />
      </g>

      {/* Readout */}
      <NumberCard x={650} y={84} w={290} h={110} value={coord(pt.x, pt.y)} />
      <text x={660} y={232} fontSize={19} fontWeight={600} fill={ACROSS} className="num">
        x = {fmt(pt.x)}: {across}
      </text>
      <text x={660} y={264} fontSize={19} fontWeight={600} fill={UP} className="num">
        y = {fmt(pt.y)}: {up}
      </text>

      <SvgButton x={765} y={296} w={60} h={54} label="↑" title="Move up" onClick={() => move(pt.x, pt.y + 1)} color={C.orange} />
      <SvgButton x={695} y={360} w={60} h={54} label="←" title="Move left" onClick={() => move(pt.x - 1, pt.y)} color={C.blue} textColor={C.white} />
      <SvgButton x={835} y={360} w={60} h={54} label="→" title="Move right" onClick={() => move(pt.x + 1, pt.y)} color={C.blue} textColor={C.white} />
      <SvgButton x={765} y={424} w={60} h={54} label="↓" title="Move down" onClick={() => move(pt.x, pt.y - 1)} color={C.orange} />

      <SvgButton x={650} y={510} w={290} h={52} fontSize={18} label={four ? 'Show 1 quadrant' : 'Show 4 quadrants'} onClick={toggle} />

      <Callout
        at={[sx(0), sy(0)]}
        box={[100, 572]}
        w={250}
        icon={Crosshair}
        title="Origin (0, 0)"
        text="Every journey starts here."
      />
      <Callout
        at={[px, sy(0)]}
        box={[370, 572]}
        w={260}
        icon={ArrowRight}
        title="Across, then up"
        text="Read x along the bottom first, then y up the side."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i} stroke={C.line}>
          <line x1={24 + i * 14} y1={6} x2={24 + i * 14} y2={72} />
          <line x1={24} y1={6 + i * 13.2} x2={94} y2={6 + i * 13.2} />
        </g>
      ))}
      <path d="M24 72 H100 M24 72 V2" stroke={C.ink} strokeWidth={2.5} />
      <path d="M24 72 H66" stroke={C.blue} strokeWidth={3} />
      <path d="M66 72 V32" stroke={C.orange} strokeWidth={2.5} strokeDasharray="4 3" />
      <Thing kind="star" x={66} y={32} size={22} />
    </svg>
  );
}

/** Unique coordinate distractors around (a, b), including the classic swapped pair. */
function coordChoices(a: number, b: number, min: number, max: number): string[] {
  // The swapped pair goes in first: it's the mistake we most want to catch.
  const set = new Set<string>([coord(a, b), coord(b, a)]);
  const tries: [number, number][] = [[a, -b], [-a, b], [a + 1, b], [a, b - 1], [a - 1, b + 1]];
  for (const [x, y] of shuffle(tries)) {
    if (set.size >= 4) break;
    if (x >= min && x <= max && y >= min && y <= max) set.add(coord(x, y));
  }
  while (set.size < 4) set.add(coord(rand(min, max), rand(min, max)));
  return shuffle([...set]);
}

/** Across-then-up directions to (a, b) from the origin. */
function walkSteps(a: number, b: number): [string, string] {
  const across = a === 0 ? 'Stay on the up-down line: x = 0.' : `Go across ${Math.abs(a)} to the ${a > 0 ? 'right' : 'left'}: x = ${fmt(a)}.`;
  const up = b === 0 ? 'Stay on the across line: y = 0.' : `Then go ${b > 0 ? 'up' : 'down'} ${Math.abs(b)}: y = ${fmt(b)}.`;
  return [across, up];
}

function readStar(level: number): Question {
  const [min, max] = level === 2 ? [-5, 5] : level === 1 ? [0, 8] : [0, 6];
  let a = rand(min, max);
  let b = rand(min, max);
  if (level === 2 && a >= 0 && b >= 0) [a, b] = [-Math.max(1, a), b];
  if (level < 2 && a === 0 && b === 0) a = rand(1, max);
  return {
    prompt: 'What are the coordinates of the star?',
    visual: <CoordPicture min={min} max={max} points={[{ x: a, y: b }]} />,
    choices: coordChoices(a, b, min, max).map((value) => ({ value })),
    answer: coord(a, b),
    hint: level === 2 ? 'Go across first to find x, then up or down to find y. Left of 0 and below 0 are negative.' : 'Go across first to find x, then up or down to find y.',
    explain: ['Start at (0, 0).', ...walkSteps(a, b), `Across first, then ${b < 0 ? 'down' : 'up'}: the star is at ${coord(a, b)}.`],
  };
}

function findPoint(level: number): Question {
  const [min, max] = level === 2 ? [-5, 5] : [0, 8];
  const a = rand(level === 2 ? -5 : 1, max);
  let b = rand(level === 2 ? -5 : 1, max);
  if (b === a) b = a === max ? a - 1 : a + 1;
  const taken = new Set([`${a},${b}`, `${b},${a}`]);
  const pts: [number, number][] = [[a, b], [b, a]];
  while (pts.length < 4) {
    const p: [number, number] = [rand(min, max), rand(min, max)];
    if (!taken.has(`${p[0]},${p[1]}`)) {
      taken.add(`${p[0]},${p[1]}`);
      pts.push(p);
    }
  }
  const letters = ['A', 'B', 'C', 'D'];
  const order = shuffle(pts);
  const points: GridPoint[] = order.map(([x, y], i) => ({ x, y, label: letters[i] }));
  const answer = letters[order.findIndex(([x, y]) => x === a && y === b)];
  return {
    prompt: `Which point is at ${coord(a, b)}?`,
    visual: <CoordPicture min={min} max={max} points={points} />,
    choices: letters.map((value) => ({ value })),
    answer,
    hint: 'The first number is how far across, the second is how far up. Don’t swap them!',
    explain: [`Start at (0, 0).`, ...walkSteps(a, b), `You land on point ${answer}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return readStar(0);
  if (level === 1) return pick([() => readStar(1), () => findPoint(1)])();
  return pick([() => readStar(2), () => findPoint(2)])();
}

export const coordinates: Lesson = {
  id: 'coordinates',
  title: 'Coordinates',
  Thumb,
  Scene: CoordScene,
  sceneHint: 'Drag the star or use the arrows · Try all 4 quadrants',
  learn: {
    heading: 'Coordinates',
    intro: 'Coordinates are a pair of numbers that tell you exactly where a point is on a grid, like a secret map reference.',
    points: [
      { icon: ArrowRight, text: 'The first number (x) tells you how far across.' },
      { icon: ArrowUp, text: 'The second number (y) tells you how far up or down.' },
      { icon: MapPin, text: 'Negative numbers mean left of or below the origin (0, 0).' },
    ],
  },
  steps: [
    'Start at the origin, (0, 0), where the axes cross.',
    'Move along the x-axis: right for positive, left for negative.',
    'Then move up for positive y, or down for negative y.',
    'Write the pair in brackets, x first: (x, y).',
  ],
  example: {
    question: 'What are the coordinates of the star?',
    visual: <CoordPicture min={0} max={6} points={[{ x: 4, y: 2 }]} />,
    work: ['From (0, 0), go 4 squares across: x = 4.', 'Then go 2 squares up: y = 2.'],
    answer: 'The star is at (4, 2).',
  },
  grownups: [
    'A handy rhyme: “along the corridor, then up the stairs” — x before y.',
    'The most common mistake is swapping the numbers. Ask them to say “across… then up” out loud each time.',
    'Play battleships on squared paper: it is coordinates practice disguised as a game.',
    'Maps, spreadsheets (cell B4) and chess boards all use the same idea.',
  ],
  makeQuestion,
};
