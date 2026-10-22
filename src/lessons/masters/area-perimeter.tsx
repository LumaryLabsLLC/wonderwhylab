import { useEffect, useRef, useState } from 'react';
import { Footprints, Grid2x2, Move } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { perimeterOf, rectCells, RectPicture, ShapePicture } from './visuals/ShapeGrid';
import type { Cell } from './visuals/ShapeGrid';

const COLS = 12;
const ROWS = 8;
const CELL = 50;
const GX = 60;
const GY = 100;
const L = GX + CELL; // rectangle's top-left corner
const T = GY + CELL;
const MAX_W = 10;
const MAX_H = 6;

const AREA = shade(C.green, -0.3);
const EDGE = shade(C.orange, -0.15);

/** Point on the rectangle's edge after `k` unit steps, walking clockwise from the top-left corner. */
function edgePoint(k: number, w: number, h: number): [number, number] {
  if (k <= w) return [L + k * CELL, T];
  if (k <= w + h) return [L + w * CELL, T + (k - w) * CELL];
  if (k <= 2 * w + h) return [L + (w - (k - w - h)) * CELL, T + h * CELL];
  return [L, T + (h - (k - 2 * w - h)) * CELL];
}

function AreaScene() {
  const [w, setW] = useState(4);
  const [h, setH] = useState(3);
  const [counting, setCounting] = useState(false);
  const [walk, setWalk] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const area = w * h;
  const perim = 2 * (w + h);

  const drag = useSvgDrag((p) => {
    const nw = clamp(Math.round((p.x - L) / CELL), 1, MAX_W);
    const nh = clamp(Math.round((p.y - T) / CELL), 1, MAX_H);
    if (nw !== w || nh !== h) {
      window.clearInterval(timer.current);
      setWalk(null);
      setW(nw);
      setH(nh);
      play('tap');
    }
  });

  const walkEdge = () => {
    window.clearInterval(timer.current);
    let k = 0;
    setWalk(0);
    timer.current = window.setInterval(() => {
      k += 1;
      setWalk(k);
      if (k >= perim) {
        window.clearInterval(timer.current);
        play('correct');
        speak(`All the way round is ${perim} units. The perimeter is ${perim}.`);
      } else {
        play('tap');
      }
    }, 260);
  };

  const walked = walk === null ? [] : Array.from({ length: walk + 1 }, (_, k) => edgePoint(k, w, h));
  const [hx, hy] = [L + w * CELL, T + h * CELL];

  return (
    <SceneSvg label={`A rectangle ${w} by ${h}: area ${area}, perimeter ${perim}`}>
      {/* Grid paper */}
      <rect x={GX + 4} y={GY + 6} width={COLS * CELL} height={ROWS * CELL} rx={6} fill={C.ink} opacity={0.1} />
      <rect x={GX} y={GY} width={COLS * CELL} height={ROWS * CELL} rx={6} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: COLS - 1 }, (_, i) => (
        <line key={`v${i}`} x1={GX + (i + 1) * CELL} y1={GY} x2={GX + (i + 1) * CELL} y2={GY + ROWS * CELL} stroke={C.line} />
      ))}
      {Array.from({ length: ROWS - 1 }, (_, j) => (
        <line key={`h${j}`} x1={GX} y1={GY + (j + 1) * CELL} x2={GX + COLS * CELL} y2={GY + (j + 1) * CELL} stroke={C.line} />
      ))}

      {/* The rectangle */}
      {rectCells(w, h).map(([i, j], n) => (
        <g key={`${i},${j}`}>
          <rect x={L + i * CELL} y={T + j * CELL} width={CELL} height={CELL} fill={shade(C.green, 0.45)} stroke={shade(C.green, -0.1)} />
          {counting && (
            <text x={L + i * CELL + CELL / 2} y={T + j * CELL + CELL / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={600} fill={AREA} className="num">
              {n + 1}
            </text>
          )}
        </g>
      ))}
      <rect x={L} y={T} width={w * CELL} height={h * CELL} fill="none" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      {walked.length > 1 && (
        <polyline points={walked.map((p) => p.join(',')).join(' ')} fill="none" stroke={EDGE} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {walk !== null && (
        <g>
          <circle cx={walked[walked.length - 1][0]} cy={walked[walked.length - 1][1]} r={16} fill={C.orange} stroke={C.ink} strokeWidth={2} />
          <text x={walked[walked.length - 1][0]} y={walked[walked.length - 1][1]} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.ink} className="num">
            {walk}
          </text>
        </g>
      )}

      {/* Side lengths */}
      <text x={L + (w * CELL) / 2} y={T - 14} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink} className="num">
        {w}
      </text>
      <text x={L - 14} y={T + (h * CELL) / 2} textAnchor="end" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink} className="num">
        {h}
      </text>

      {/* Drag handle */}
      <g {...drag} role="slider" aria-label="Drag to resize the rectangle" aria-valuetext={`${w} by ${h}`}>
        <circle cx={hx} cy={hy} r={30} fill="transparent" />
        <circle cx={hx} cy={hy} r={17} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
        <path d={`M${hx - 6},${hy + 6} L${hx + 6},${hy - 6} M${hx + 6},${hy - 6} l-6,0 M${hx + 6},${hy - 6} l0,6`} stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      </g>

      {/* Readouts */}
      <NumberCard x={700} y={100} w={240} h={110} value={area} caption="Area · squares" color={AREA} />
      <NumberCard x={700} y={232} w={240} h={110} value={perim} caption="Perimeter · units" color={EDGE} />
      <text x={820} y={378} textAnchor="middle" fontSize={18} fontWeight={600} fill={C.ink} className="num">
        Area = {w} × {h} = {area}
      </text>
      <text x={820} y={408} textAnchor="middle" fontSize={16} fill={C.ink2} className="num">
        Perimeter = {w} + {h} + {w} + {h} = {perim}
      </text>
      <SvgButton x={700} y={440} w={240} h={52} fontSize={18} label="Walk the edge" onClick={walkEdge} color={C.orange} />
      <SvgButton x={700} y={510} w={240} h={52} fontSize={18} label={counting ? 'Hide numbers' : 'Count squares'} onClick={() => setCounting(!counting)} color={C.green} textColor={C.white} active={counting} />

      <Callout
        at={[L + CELL / 2, T + (h - 0.5) * CELL]}
        box={[60, 530]}
        w={290}
        icon={Grid2x2}
        title="Area"
        text="How many squares fit inside. Width × height."
      />
      <Callout
        at={[L + (w * CELL) / 2, T + h * CELL]}
        box={[372, 530]}
        w={300}
        icon={Footprints}
        title="Perimeter"
        text="The distance all the way round the edge."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {Array.from({ length: 4 }, (_, i) =>
        Array.from({ length: 3 }, (_, j) => (
          <rect key={`${i}${j}`} x={22 + i * 18} y={14 + j * 18} width={18} height={18} fill={shade(C.green, 0.45)} stroke={shade(C.green, -0.1)} />
        )),
      )}
      <rect x={22} y={14} width={72} height={54} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <path d="M22 14 h72" stroke={C.orange} strokeWidth={4} strokeLinecap="round" />
      <circle cx={94} cy={68} r={6} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

function gridRect(level: number): Question {
  const w = rand(2, level === 0 ? 5 : 7);
  const h = rand(2, level === 0 ? 4 : 5);
  const cells = rectCells(w, h, 1, 1);
  const askArea = Math.random() < 0.6;
  const ans = askArea ? w * h : 2 * (w + h);
  return {
    prompt: askArea ? 'What is the area of this rectangle?' : 'What is the perimeter of this rectangle?',
    visual: <ShapePicture cells={cells} cols={w + 2} rows={h + 2} />,
    choices: numberChoices(ans, { min: 1, spread: 4 }).map((value) => ({ value })),
    answer: String(ans),
    hint: askArea ? 'Count the squares in one row, then count how many rows.' : 'Walk all the way round the edge and count every side of a square.',
    explain: askArea
      ? [`Each row has ${w} squares.`, `There are ${h} rows.`, `${w} × ${h} = ${ans} squares.`]
      : [`The top and bottom are ${w} each. The two sides are ${h} each.`, `${w} + ${h} + ${w} + ${h} = ${ans}.`, `The perimeter is ${ans} units.`],
  };
}

function formulaRect(): Question {
  const square = Math.random() < 0.25;
  const w = rand(3, 12);
  const h = square ? w : rand(2, 9);
  const askArea = Math.random() < 0.5;
  const ans = askArea ? w * h : 2 * (w + h);
  const shape = square ? `A square has sides of ${w} cm.` : `A rectangle is ${w} cm long and ${h} cm wide.`;
  return {
    prompt: `${shape} What is its ${askArea ? 'area in square cm' : 'perimeter in cm'}?`,
    visual: <RectPicture w={w} h={h} />,
    answer: String(ans),
    hint: askArea ? 'Area of a rectangle = length × width.' : 'Perimeter = all four sides added together.',
    explain: askArea
      ? ['Area = length × width.', `${w} × ${h} = ${ans}.`, `The area is ${ans} square cm.`]
      : ['Perimeter = all four sides added together.', `${w} + ${h} + ${w} + ${h} = ${ans}.`, `The perimeter is ${ans} cm.`],
  };
}

function lShape(): Question {
  const W = rand(4, 7);
  const H = rand(3, 5);
  const a = rand(1, W - 2);
  const b = rand(1, H - 2);
  // Remove an a × b block from the top-right corner.
  const cells: Cell[] = rectCells(W, H, 1, 1).filter(([x, y]) => !(x > W - a && y <= b));
  const askArea = Math.random() < 0.6;
  const ans = askArea ? cells.length : perimeterOf(cells);
  return {
    prompt: askArea ? 'What is the area of this shape?' : 'What is the perimeter of this shape?',
    visual: <ShapePicture cells={cells} cols={W + 2} rows={H + 2} />,
    choices: numberChoices(ans, { min: 1, spread: 4 }).map((value) => ({ value })),
    answer: String(ans),
    hint: askArea ? 'Split the shape into two rectangles and add their areas.' : 'Count every unit edge all the way round. Don’t forget the step!',
    explain: askArea
      ? [`The full rectangle would be ${W} × ${H} = ${W * H} squares.`, `A ${a} × ${b} corner is missing: ${a * b} ${a * b === 1 ? 'square' : 'squares'}.`, `${W * H} − ${a * b} = ${ans} squares.`]
      : [
          'Cutting out a corner does not change the distance round: the step’s new edges match the ones you lost.',
          `So it is the same as a ${W} × ${H} rectangle: ${W} + ${H} + ${W} + ${H}.`,
          `The perimeter is ${ans} units.`,
        ],
  };
}

function missingSide(): Question {
  const w = rand(3, 9);
  const h = rand(2, 9);
  return {
    prompt: `A rectangle has an area of ${w * h} square cm. One side is ${w} cm. How long is the other side?`,
    answer: String(h),
    hint: `Area = length × width. Which number times ${w} makes ${w * h}?`,
    explain: [`Area = length × width, so ${w} × ? = ${w * h}.`, `${w * h} ÷ ${w} = ${h}.`, `The other side is ${h} cm.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return gridRect(0);
  if (level === 1) return pick([() => gridRect(1), formulaRect, formulaRect])();
  return pick([lShape, lShape, formulaRect, missingSide])();
}

export const areaPerimeter: Lesson = {
  id: 'area-perimeter',
  title: 'Area & Perimeter',
  Thumb,
  Scene: AreaScene,
  sceneHint: 'Drag the yellow corner to resize · Walk the edge to measure the perimeter',
  learn: {
    heading: 'Area & perimeter',
    intro: 'Area is the space inside a shape. Perimeter is the distance around its edge. They measure different things!',
    points: [
      { icon: Grid2x2, text: 'Area counts squares: for a rectangle, width × height.' },
      { icon: Footprints, text: 'Perimeter adds up every side all the way round.' },
      { icon: Move, text: 'Two shapes can have the same area but different perimeters.' },
    ],
  },
  steps: [
    'For area, count the squares inside, or multiply width × height.',
    'For perimeter, add all the sides: width + height + width + height.',
    'For an L-shape, split it into two rectangles and add their areas.',
    'Write the units: area in square units (cm²), perimeter in units (cm).',
  ],
  example: {
    question: 'A rectangle is 6 cm long and 4 cm wide. What are its area and perimeter?',
    visual: <RectPicture w={6} h={4} />,
    work: ['Area = 6 × 4 = 24 square cm.', 'Perimeter = 6 + 4 + 6 + 4 = 20 cm.'],
    answer: 'Area 24 cm², perimeter 20 cm.',
  },
  grownups: [
    'Measure a real room, rug or tabletop together, then work out its area and perimeter.',
    'A classic mix-up is adding when they should multiply. Ask: “Are we filling it in, or walking round it?”',
    'Challenge: find different rectangles with an area of 24. Which one has the smallest perimeter?',
    'Make sure they say the units: square centimetres for area, centimetres for perimeter.',
  ],
  makeQuestion,
};
