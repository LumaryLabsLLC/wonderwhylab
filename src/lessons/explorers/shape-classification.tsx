import { useState } from 'react';
import { Equal, Move, Shapes, SquareDashedBottom } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag, type Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { classifyQuad, classifyTriangle, cornerAngles, ShapeMarks, ShapePicture, type QuadInfo, type QuadName, type TriInfo } from './visuals/Shapes';

const BOARD = { x: 40, y: 40, w: 580, h: 580 };
const SNAP = 20;
const LO = 60;
const HI = 600;

const P = (x: number, y: number): Pt => ({ x, y });

const TRI_PRESETS: Record<string, Pt[]> = {
  Equilateral: [P(180, 460), P(460, 460), P(320, 220)],
  Isosceles: [P(220, 480), P(420, 480), P(320, 140)],
  Scalene: [P(120, 460), P(500, 460), P(220, 260)],
  'Right-angled': [P(160, 460), P(480, 460), P(160, 220)],
  Obtuse: [P(100, 420), P(360, 420), P(540, 240)],
};

const QUAD_PRESETS: Record<string, Pt[]> = {
  Square: [P(180, 180), P(460, 180), P(460, 460), P(180, 460)],
  Rectangle: [P(120, 220), P(520, 220), P(520, 440), P(120, 440)],
  Rhombus: [P(320, 120), P(480, 320), P(320, 520), P(160, 320)],
  Parallelogram: [P(200, 200), P(520, 200), P(440, 440), P(120, 440)],
  Trapezium: [P(220, 200), P(420, 200), P(540, 440), P(100, 440)],
  Kite: [P(320, 120), P(460, 260), P(320, 520), P(180, 260)],
};

const QUAD_TEXT: Record<QuadName, { title: string; also?: string }> = {
  square: { title: 'Square', also: 'Also a rectangle, a rhombus and a parallelogram.' },
  rectangle: { title: 'Rectangle', also: 'Also a parallelogram.' },
  rhombus: { title: 'Rhombus', also: 'Also a parallelogram.' },
  parallelogram: { title: 'Parallelogram' },
  trapezium: { title: 'Trapezium', also: 'Called a trapezoid in the US.' },
  kite: { title: 'Kite' },
  quadrilateral: { title: 'Quadrilateral', also: 'Four sides, but no special name.' },
  concave: { title: 'Quadrilateral', also: 'One corner points inwards (concave).' },
  crossed: { title: 'Sides cross!', also: 'Drag a corner so the sides don’t cross.' },
  flat: { title: 'Too flat!', also: 'Three corners are in a straight line.' },
};

const TRI_SIDE_TEXT = { equilateral: '3 equal sides', isosceles: '2 equal sides', scalene: 'No equal sides' };
const TRI_ANGLE_TEXT = { right: '1 right angle', obtuse: '1 angle bigger than a right angle', acute: 'All angles smaller than a right angle' };
const ANGLE_NAME = { right: 'Right-angled', obtuse: 'Obtuse', acute: 'Acute' };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function quadFacts(info: QuadInfo): string[] {
  if (info.name === 'crossed' || info.name === 'flat') return [];
  const facts = [info.parallelPairs === 0 ? 'No parallel sides' : `${info.parallelPairs} pair${info.parallelPairs > 1 ? 's' : ''} of parallel sides`];
  if (info.rightAngles) facts.push(`${info.rightAngles} right angle${info.rightAngles > 1 ? 's' : ''}`);
  if (info.ticks.every((t) => t === 1)) facts.push('4 equal sides');
  else if (info.name === 'kite') facts.push('2 pairs of equal sides, side by side');
  else if (info.parallelPairs === 2) facts.push('Opposite sides equal');
  return facts;
}

/** The name card's lines under the title: the "also" note, then the facts (each may wrap). */
function quadLines(info: QuadInfo) {
  const out: { text: string; y: number; also?: boolean }[] = [];
  let y = 206;
  for (const line of wrap(QUAD_TEXT[info.name].also ?? '', 32)) {
    out.push({ text: line, y, also: true });
    y += 21;
  }
  y += 14;
  for (const fact of quadFacts(info))
    wrap(fact, 30).forEach((line, i) => {
      out.push({ text: i ? `  ${line}` : `• ${line}`, y });
      y += 23;
    });
  return out;
}

function Corner({ p, onMove, color }: { p: Pt; onMove: (p: Pt) => void; color: string }) {
  const drag = useSvgDrag(onMove);
  return (
    <g {...drag}>
      <circle cx={p.x} cy={p.y} r={28} fill="transparent" />
      <circle cx={p.x} cy={p.y} r={14} fill={color} stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

function ShapeScene() {
  const [mode, setMode] = useState<'tri' | 'quad'>('tri');
  const [tri, setTri] = useState<Pt[]>(TRI_PRESETS.Isosceles);
  const [quad, setQuad] = useState<Pt[]>(QUAD_PRESETS.Parallelogram);
  const pts = mode === 'tri' ? tri : quad;
  const setPts = mode === 'tri' ? setTri : setQuad;
  const triInfo: TriInfo | null = mode === 'tri' ? classifyTriangle(tri) : null;
  const quadInfo: QuadInfo | null = mode === 'quad' ? classifyQuad(quad) : null;
  const info = triInfo ?? quadInfo!;
  const broken = info.flat || quadInfo?.name === 'crossed';

  const move = (i: number) => (p: Pt) => {
    const x = clamp(Math.round(p.x / SNAP) * SNAP, LO, HI);
    const y = clamp(Math.round(p.y / SNAP) * SNAP, LO, HI);
    if (x === pts[i].x && y === pts[i].y) return;
    // Keep corners apart so there is always a corner to grab.
    if (pts.some((q, j) => j !== i && Math.hypot(q.x - x, q.y - y) < 40)) return;
    const next = pts.slice();
    next[i] = { x, y };
    setPts(next);
    play('tap');
  };

  const dots = [];
  for (let x = 60; x <= 600; x += 40) for (let y = 60; y <= 600; y += 40) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={2.5} fill={C.line} />);

  const PX = 652;
  const presets = mode === 'tri' ? TRI_PRESETS : QUAD_PRESETS;
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
  // Point the callout at a side that carries marks, if there is one.
  const marked = Math.max(0, pts.findIndex((_, i) => info.ticks[i] > 0 || info.parallel[i] > 0));
  // A little past the middle, so the callout's dot doesn't hide the marks themselves.
  const [m0, m1] = [pts[marked], pts[(marked + 1) % pts.length]];
  const mid = { x: m0.x + (m1.x - m0.x) * 0.62, y: m0.y + (m1.y - m0.y) * 0.62 };

  return (
    <SceneSvg label="Drag the corners of a shape and see its name">
      <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {dots}
      <polygon points={poly} fill={broken ? shade(C.red, 0.85) : shade(C.teal, 0.78)} />
      {/* Parallel sides get a band in their pair colour. */}
      {pts.map((p, i) => {
        const pc = info.parallel[i];
        const q = pts[(i + 1) % pts.length];
        return pc ? <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={shade(pc === 1 ? C.blue : C.purple, 0.5)} strokeWidth={16} strokeLinecap="round" /> : null;
      })}
      <polygon points={poly} fill="none" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      {!broken && <ShapeMarks pts={pts} info={info} size={1.3} arcs={mode === 'tri'} />}
      {pts.map((p, i) => (
        <Corner key={i} p={p} onMove={move(i)} color={C.yellow} />
      ))}

      {/* ── What it is ── */}
      <SvgButton x={PX} y={40} w={150} h={52} fontSize={18} label="Triangles" active={mode === 'tri'} color={mode === 'tri' ? C.yellow : C.card} onClick={() => setMode('tri')} />
      <SvgButton x={PX + 164} y={40} w={150} h={52} fontSize={16} label="Quadrilaterals" active={mode === 'quad'} color={mode === 'quad' ? C.yellow : C.card} onClick={() => setMode('quad')} />

      <rect x={PX} y={112} width={314} height={232} rx={16} fill={shade(C.teal, 0.88)} stroke={C.ink} strokeWidth={2} />
      {triInfo &&
        (triInfo.flat ? (
          <>
            <text x={PX + 18} y={160} fontSize={30} fontWeight={700} fill={C.red}>
              Too flat!
            </text>
            <text x={PX + 18} y={196} fontSize={18} fill={C.ink}>
              The corners are in a straight line.
            </text>
          </>
        ) : (
          <>
            <text x={PX + 18} y={140} fontSize={15} fill={C.muted} className="caps">
              By its sides
            </text>
            <text x={PX + 18} y={174} fontSize={30} fontWeight={700} fill={C.ink}>
              {cap(triInfo.sides)}
            </text>
            <text x={PX + 18} y={200} fontSize={17} fill={C.ink2}>
              {TRI_SIDE_TEXT[triInfo.sides]}
            </text>
            <text x={PX + 18} y={240} fontSize={15} fill={C.muted} className="caps">
              By its angles
            </text>
            <text x={PX + 18} y={274} fontSize={30} fontWeight={700} fill={triInfo.angleType === 'obtuse' ? shade(C.orange, -0.3) : C.ink}>
              {ANGLE_NAME[triInfo.angleType]}
            </text>
            {wrap(TRI_ANGLE_TEXT[triInfo.angleType], 32).map((line, i) => (
              <text key={i} x={PX + 18} y={300 + i * 21} fontSize={17} fill={C.ink2}>
                {line}
              </text>
            ))}
          </>
        ))}
      {quadInfo && (
        <>
          <text x={PX + 18} y={140} fontSize={15} fill={C.muted} className="caps">
            This shape is a
          </text>
          <text x={PX + 18} y={178} fontSize={32} fontWeight={700} fill={broken ? C.red : C.ink}>
            {QUAD_TEXT[quadInfo.name].title}
          </text>
          {quadLines(quadInfo).map((line, i) => (
            <text key={i} x={PX + 18} y={line.y} fontSize={17} fill={line.also ? C.ink2 : C.ink} fontStyle={line.also ? 'italic' : undefined}>
              {line.text}
            </text>
          ))}
        </>
      )}

      <text x={PX} y={366} fontSize={15} fill={C.muted} className="caps">
        Show me a…
      </text>
      {Object.keys(presets).map((name, i) => (
        <SvgButton
          key={name}
          x={PX + (i % 2) * 164}
          y={380 + Math.floor(i / 2) * 60}
          w={150}
          h={50}
          fontSize={name.length > 11 ? 15 : 17}
          label={name}
          onClick={() => setPts(presets[name])}
        />
      ))}

      {!broken && (
        <Callout
          at={[mid.x, mid.y]}
          box={[PX, 572]}
          w={314}
          icon={Equal}
          title="Read the marks"
          text="Matching ticks = equal sides. Matching arrows = parallel sides. A little square = a right angle."
        />
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <polygon points="10,68 52,68 31,16" fill={shade(C.teal, 0.7)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points="70,22 110,22 100,66 60,66" fill={shade(C.purple, 0.7)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M17,40 l7,4 M38,44 l7,-4" stroke={C.red} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M86,18 l4,4 l-4,4 M76,62 l4,4 l-4,4" fill="none" stroke={C.blue} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

// ── Question shapes (y down, in picture units) ──

function triOfSides(kind: 'equilateral' | 'isosceles' | 'scalene'): Pt[] {
  for (;;) {
    const b = rand(110, 170);
    let pts: Pt[];
    if (kind === 'equilateral') pts = [P(0, 0), P(b, 0), P(b / 2, -b * 0.866)];
    else if (kind === 'isosceles') {
      const h = rand(60, 190);
      pts = [P(0, 0), P(b, 0), P(b / 2, -h)];
    } else pts = [P(0, 0), P(b, 0), P(rand(-30, b + 30), -rand(60, 150))];
    const info = classifyTriangle(pts);
    const L = [Math.hypot(b, 0), Math.hypot(pts[2].x, pts[2].y), Math.hypot(b - pts[2].x, pts[2].y)];
    const ratios = [L[0] / L[1], L[1] / L[2], L[0] / L[2]].map((r) => Math.max(r, 1 / r));
    // Distinct sides should look clearly different, not nearly equal.
    const clear = kind === 'scalene' ? ratios.every((r) => r > 1.15) : kind === 'isosceles' ? Math.max(...ratios) > 1.2 : true;
    if (!info.flat && info.sides === kind && clear) return flipMaybe(pts);
  }
}

function triOfAngle(kind: 'right' | 'acute' | 'obtuse'): Pt[] {
  for (;;) {
    const b = rand(120, 180);
    let pts: Pt[];
    if (kind === 'right') pts = [P(0, 0), P(b, 0), P(pick([0, b]), -rand(70, 140))];
    else if (kind === 'obtuse') pts = [P(0, 0), P(b, 0), P(pick([-rand(40, 90), b + rand(40, 90)]), -rand(50, 110))];
    else pts = [P(0, 0), P(b, 0), P(rand(Math.round(b * 0.3), Math.round(b * 0.7)), -rand(Math.round(b * 0.75), Math.round(b * 1.2)))];
    const info = classifyTriangle(pts);
    const degs = cornerAngles(pts);
    // Keep non-right angles well away from 90° so the picture is fair.
    const clear = kind === 'right' || degs.every((d) => Math.abs(d - 90) > 12);
    if (!info.flat && info.angleType === kind && clear) return flipMaybe(pts);
  }
}

const flipMaybe = (pts: Pt[]) => (Math.random() < 0.5 ? pts : pts.map((p) => P(-p.x, p.y)));

function quadOf(name: 'square' | 'rectangle' | 'rhombus' | 'parallelogram' | 'trapezium' | 'kite'): Pt[] {
  for (;;) {
    let pts: Pt[];
    if (name === 'square') {
      const s = rand(100, 150);
      pts = [P(0, 0), P(s, 0), P(s, s), P(0, s)];
    } else if (name === 'rectangle') {
      const w = rand(150, 200);
      const h = rand(70, 110);
      pts = [P(0, 0), P(w, 0), P(w, h), P(0, h)];
    } else if (name === 'rhombus') {
      const dx = rand(55, 90);
      const dy = rand(85, 130);
      pts = [P(dx, 0), P(2 * dx, dy), P(dx, 2 * dy), P(0, dy)];
    } else if (name === 'parallelogram') {
      const w = rand(120, 170);
      const h = rand(70, 100);
      const sh = rand(35, 60);
      pts = [P(sh, 0), P(sh + w, 0), P(w, h), P(0, h)];
    } else if (name === 'trapezium') {
      const w = rand(170, 210);
      const t = rand(70, 110);
      const o = rand(15, w - t - 15);
      const h = rand(70, 110);
      pts = [P(o, 0), P(o + t, 0), P(w, h), P(0, h)];
    } else {
      const a = rand(60, 90);
      const b = rand(50, 80);
      const c = rand(130, 180);
      pts = [P(a, 0), P(2 * a, b), P(a, c), P(0, b)];
    }
    if (classifyQuad(pts).name === name) return pts;
  }
}

const NOT_ALSO = {
  rhombus: ['Square', 'Rectangle', 'Trapezium'],
  parallelogram: ['Rectangle', 'Rhombus', 'Trapezium', 'Kite', 'Square'],
  trapezium: ['Parallelogram', 'Rectangle', 'Rhombus', 'Kite'],
  kite: ['Rhombus', 'Parallelogram', 'Trapezium', 'Rectangle'],
};

function triBySides(): Question {
  const kind = pick(['equilateral', 'isosceles', 'scalene'] as const);
  const right = cap(kind);
  const n = { equilateral: 3, isosceles: 2, scalene: 0 }[kind];
  return {
    prompt: 'What kind of triangle is this? Look at the marks on the sides.',
    visual: <ShapePicture pts={triOfSides(kind)} label="A triangle with marks on its sides" />,
    choices: shuffle(['Equilateral', 'Isosceles', 'Scalene']).map((value) => ({ value })),
    answer: right,
    hint: 'Matching tick marks mean equal sides. How many sides have marks?',
    explain: [
      n ? `${n} sides have matching ticks, so ${n} sides are equal.` : 'No sides have ticks, so no two sides are equal.',
      `${TRI_SIDE_TEXT[kind]} → ${right}.`,
    ],
  };
}

function parallelPairs(): Question {
  const name = pick(['square', 'rectangle', 'parallelogram', 'trapezium', 'kite'] as const);
  const n = { square: 2, rectangle: 2, parallelogram: 2, trapezium: 1, kite: 0 }[name];
  return {
    prompt: 'How many pairs of parallel sides does this shape have?',
    visual: <ShapePicture pts={quadOf(name)} label="A four-sided shape with marks" />,
    answer: String(n),
    hint: 'Arrows show parallel sides. Sides with the same arrows make a pair.',
    explain: [
      n === 0 ? 'No sides have arrows, so no sides are parallel.' : n === 1 ? 'Only one pair of sides has arrows.' : 'Two pairs of sides have arrows: single arrows and double arrows.',
      `So it has ${n} pair${n === 1 ? '' : 's'} of parallel sides.`,
    ],
  };
}

function triByAngles(): Question {
  const kind = pick(['right', 'acute', 'obtuse'] as const);
  const right = ANGLE_NAME[kind];
  const why = {
    right: 'One corner has the little square: a right angle.',
    acute: 'Every corner is sharper than a right angle (the corner of a page).',
    obtuse: 'One corner opens wider than a right angle.',
  }[kind];
  return {
    prompt: 'What kind of triangle is this, by its angles?',
    visual: <ShapePicture pts={triOfAngle(kind)} label="A triangle" />,
    choices: shuffle(['Right-angled', 'Acute', 'Obtuse']).map((value) => ({ value })),
    answer: right,
    hint: 'Compare each corner with the corner of a piece of paper.',
    explain: [why, `So it is ${right === 'Acute' ? 'an' : right === 'Obtuse' ? 'an' : 'a'} ${right} triangle.`],
  };
}

function nameQuad(): Question {
  const name = pick(['rhombus', 'parallelogram', 'trapezium', 'kite'] as const);
  const right = cap(name);
  // Leave out names that are also true (a rhombus is also a parallelogram and a kite).
  const others = shuffle(NOT_ALSO[name]).slice(0, 3);
  const why = {
    rhombus: ['2 pairs of parallel sides (the arrows).', 'All 4 sides equal, but no right angles.', 'That makes it a Rhombus.'],
    parallelogram: ['2 pairs of parallel sides (the arrows).', 'Opposite sides equal, no right angles.', 'That makes it a Parallelogram.'],
    trapezium: ['Just 1 pair of parallel sides (the arrows).', 'That makes it a Trapezium.'],
    kite: ['No parallel sides.', '2 pairs of equal sides next to each other.', 'That makes it a Kite.'],
  }[name];
  return {
    prompt: 'What is this shape called?',
    visual: <ShapePicture pts={quadOf(name)} label="A four-sided shape with marks" />,
    choices: shuffle([right, ...others]).map((value) => ({ value })),
    answer: right,
    hint: 'Count the pairs of parallel sides (arrows) first, then look at which sides are equal (ticks).',
    explain: why,
  };
}

const RIDDLES: { clue: string; answer: string; wrong: string[]; why: string }[] = [
  { clue: 'I have no parallel sides, but 2 pairs of equal sides next to each other.', answer: 'Kite', wrong: ['Rhombus', 'Parallelogram', 'Trapezium'], why: 'The other shapes all have parallel sides.' },
  { clue: 'I have 4 equal sides but no right angles.', answer: 'Rhombus', wrong: ['Square', 'Rectangle', 'Trapezium'], why: 'A square has right angles; a rhombus doesn’t need them.' },
  { clue: 'I have exactly 1 pair of parallel sides.', answer: 'Trapezium', wrong: ['Parallelogram', 'Rectangle', 'Rhombus'], why: 'Parallelograms, rectangles and rhombuses all have 2 pairs.' },
  { clue: 'I have 4 right angles, but my sides are not all equal.', answer: 'Rectangle', wrong: ['Square', 'Rhombus', 'Kite'], why: 'A square has equal sides; a rectangle only has equal opposite sides.' },
  {
    clue: 'I have 2 pairs of parallel sides, no right angles, and my sides are not all equal.',
    answer: 'Parallelogram',
    wrong: ['Rectangle', 'Rhombus', 'Square'],
    why: 'No right angles rules out squares and rectangles; unequal sides rule out a rhombus.',
  },
];

function riddle(): Question {
  const r = pick(RIDDLES);
  return {
    prompt: `Which shape am I? ${r.clue}`,
    choices: shuffle([r.answer, ...r.wrong]).map((value) => ({ value })),
    answer: r.answer,
    hint: 'Check each shape against every clue. Cross out any that break a clue.',
    explain: [r.clue, r.why, `So the shape is a ${r.answer}.`],
  };
}

function alsoName(): Question {
  const v = pick([
    { shape: 'rhombus', answer: 'Parallelogram', wrong: ['Rectangle', 'Square', 'Trapezium'], why: 'A rhombus always has 2 pairs of parallel sides.' },
    { shape: 'rectangle', answer: 'Parallelogram', wrong: ['Square', 'Rhombus', 'Kite'], why: 'A rectangle always has 2 pairs of parallel sides.' },
    { shape: 'square', answer: 'Rectangle', wrong: ['Trapezium', 'Triangle', 'Pentagon'], why: 'A square always has 4 right angles and opposite sides equal.' },
  ]);
  return {
    prompt: `Every ${v.shape} is also a…`,
    choices: shuffle([v.answer, ...v.wrong]).map((value) => ({ value })),
    answer: v.answer,
    hint: `Think about what is always true for a ${v.shape}: parallel sides, equal sides, right angles.`,
    explain: [v.why, `That is what makes a ${v.answer.toLowerCase()}, so every ${v.shape} is also a ${v.answer}.`],
  };
}

function isoscelesSide(): Question {
  const equal = rand(4, 12);
  const base = rand(3, 2 * equal - 1);
  const perim = 2 * equal + base;
  return {
    prompt: `An isosceles triangle has two sides of ${equal} cm. Its perimeter is ${perim} cm. How long is the third side (cm)?`,
    answer: String(base),
    hint: 'The perimeter is all three sides added up. Take away the two equal sides.',
    explain: [`The two equal sides make ${equal} + ${equal} = ${2 * equal} cm.`, `${perim} − ${2 * equal} = ${base}.`, `The third side is ${base} cm.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([triBySides, parallelPairs])();
  if (level === 1) return pick([triByAngles, nameQuad])();
  return pick([riddle, alsoName, isoscelesSide])();
}

export const shapeClassification: Lesson = {
  id: 'shape-classification',
  title: 'Triangles and Quadrilaterals',
  Thumb,
  Scene: ShapeScene,
  sceneHint: 'Drag the yellow corners · Use “Show me a…” to jump to a shape',
  learn: {
    heading: 'Naming shapes by their sides and angles',
    intro: 'Triangles and four-sided shapes (quadrilaterals) get their names from their sides and angles. Change the shape and watch its name change.',
    points: [
      { icon: Equal, text: 'Little tick marks show which sides are equal.' },
      { icon: Move, text: 'Arrows show parallel sides: they never meet, like train tracks.' },
      { icon: SquareDashedBottom, text: 'A small square in a corner shows a right angle (perpendicular sides).' },
      { icon: Shapes, text: 'A shape can have more than one name: every square is also a rectangle.' },
    ],
  },
  steps: [
    'Triangles by sides: equilateral (3 equal), isosceles (2 equal), scalene (none equal).',
    'Triangles by angles: right-angled, acute (all angles small), obtuse (one wide angle).',
    'Quadrilaterals: count the pairs of parallel sides first.',
    '2 pairs: a parallelogram. Add right angles for a rectangle, equal sides for a rhombus, both for a square.',
    '1 pair: a trapezium. No pairs but two pairs of equal sides next to each other: a kite.',
  ],
  example: {
    question: 'A shape has 2 pairs of parallel sides and 4 equal sides, but no right angles. What is it?',
    visual: <ShapePicture pts={[P(70, 0), P(140, 110), P(70, 220), P(0, 110)]} label="A rhombus" />,
    work: ['2 pairs of parallel sides: it is a parallelogram.', '4 equal sides, but no right angles: not a square.', 'A parallelogram with 4 equal sides is a rhombus.'],
    answer: 'A rhombus',
  },
  grownups: [
    'Children often think a shape tipped on its corner changes name (“a diamond”). Turning a square doesn’t change it: it is still a square.',
    'Names are inclusive: every square is also a rectangle and a rhombus. Ask “what else could we call it?”',
    'Here a trapezium has exactly one pair of parallel sides. Some books count any shape with at least one pair, which also includes parallelograms.',
    'Hunt for shapes at home: tiles, windows, kites and road signs.',
  ],
  makeQuestion,
};
