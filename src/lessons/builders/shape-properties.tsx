import { useRef, useState } from 'react';
import { Hash, Search, SquareDashedBottom, Triangle } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { useSvgDrag } from '../../lib/svg';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { cornerAngle, equalGroups, isRight, POLY_KEYS, PolyCard, polyPoints, POLYS, RightMark, rightAngles, SideTicks } from './visuals/Polygons';
import type { PolyKey } from './visuals/Polygons';
import { wrapLines } from './visuals/text';

const CX = 360;
const CY = 345;
const ARM = 80;
const HOME: Pt = { x: 60, y: 650 };

const at = (p: Pt): Pt => ({ x: p.x + CX, y: p.y + CY });
const unit = (dx: number, dy: number) => {
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
};
const counting = (n: number) => Array.from({ length: n }, (_, i) => i + 1).join(', ');
const article = (name: string) => (/^[aeiou]/.test(name) ? 'an' : 'a');

/** The corner checker: an L made of two arms meeting at a square corner. */
function Checker({ corner, u, p, glow }: { corner: Pt; u: Pt; p: Pt; glow?: string }) {
  const a = { x: corner.x + u.x * ARM, y: corner.y + u.y * ARM };
  const b = { x: corner.x + p.x * ARM, y: corner.y + p.y * ARM };
  const d = `M${a.x},${a.y} L${corner.x},${corner.y} L${b.x},${b.y}`;
  const s = 18;
  const sq = `M${corner.x + u.x * s},${corner.y + u.y * s} L${corner.x + u.x * s + p.x * s},${corner.y + u.y * s + p.y * s} L${corner.x + p.x * s},${corner.y + p.y * s}`;
  return (
    <g>
      <path d={d} fill="none" stroke="transparent" strokeWidth={48} strokeLinecap="round" />
      {glow && <path d={d} fill="none" stroke={glow} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />}
      <path d={d} fill="none" stroke={C.ink} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={C.orange} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <path d={sq} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

function ShapeScene() {
  const [key, setKey] = useState<PolyKey>('square');
  const [sides, setSides] = useState<number[]>([]);
  const [corners, setCorners] = useState<number[]>([]);
  const [tests, setTests] = useState<Record<number, boolean>>({});
  const [checkerAt, setCheckerAt] = useState<number | null>(null);
  const [drag, setDrag] = useState<Pt | null>(null);
  const [equal, setEqual] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const grab = useRef<Pt>({ x: 0, y: 0 });
  const dragAt = useRef<Pt | null>(null);

  const { name, colour, pts: local } = POLYS[key];
  const pts = local.map(at);
  const n = pts.length;
  const R = rightAngles(key);
  const tested = Object.keys(tests).length;
  const found = Object.values(tests).filter(Boolean).length;
  const groups = equalGroups(local);
  // The top-right-most corner, where the "Sides and corners" label points.
  const tipIndex = local.reduce((best, q, i) => (q.x - q.y > local[best].x - local[best].y ? i : best), 0);

  const choose = (k: PolyKey) => {
    setKey(k);
    setSides([]);
    setCorners([]);
    setTests({});
    setCheckerAt(null);
    setMsg(null);
    play('whoosh');
  };

  const tapSide = (i: number) => {
    if (sides.includes(i)) return;
    const next = [...sides, i];
    setSides(next);
    setMsg(next.length === n ? `All counted: ${article(name)} ${name} has ${n} sides!` : `${next.length} ${next.length === 1 ? 'side' : 'sides'}… keep going!`);
    play(next.length === n ? 'correct' : 'pop');
  };
  const tapCorner = (i: number) => {
    if (corners.includes(i)) return;
    const next = [...corners, i];
    setCorners(next);
    setMsg(next.length === n ? `All counted: ${article(name)} ${name} has ${n} corners!` : `${next.length} ${next.length === 1 ? 'corner' : 'corners'}… keep going!`);
    play(next.length === n ? 'correct' : 'pop');
  };

  /** Where the checker's corner sits and which way its arms point. */
  const pose = (): { corner: Pt; u: Pt; p: Pt } => {
    if (drag) return { corner: drag, u: { x: 1, y: 0 }, p: { x: 0, y: -1 } };
    if (checkerAt === null) return { corner: HOME, u: { x: 1, y: 0 }, p: { x: 0, y: -1 } };
    const v = pts[checkerAt];
    const next = pts[(checkerAt + 1) % n];
    const prev = pts[(checkerAt + n - 1) % n];
    const u = unit(next.x - v.x, next.y - v.y);
    const w = unit(prev.x - v.x, prev.y - v.y);
    let p = { x: -u.y, y: u.x };
    if (p.x * w.x + p.y * w.y < 0) p = { x: -p.x, y: -p.y };
    return { corner: v, u, p };
  };

  const drop = (c: Pt) => {
    let best = -1;
    let dist = 90;
    pts.forEach((v, i) => {
      const d = Math.hypot(v.x - c.x, v.y - c.y);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    if (best < 0) {
      setCheckerAt(null);
      return;
    }
    const right = isRight(local, best);
    const nextTests = { ...tests, [best]: right };
    const all = Object.keys(nextTests).length === n;
    const f = Object.values(nextTests).filter(Boolean).length;
    setCheckerAt(best);
    setTests(nextTests);
    let text = right ? 'Right angle! The corner fits the checker exactly.' : `Not a right angle. This corner is ${cornerAngle(local, best) > 90 ? 'wider' : 'narrower'} than the checker.`;
    if (all) text += ` This ${name} has ${f} right ${f === 1 ? 'angle' : 'angles'}.`;
    if (all && key === 'square') text = 'Right angle! A square has 4 sides and 4 right angles, just like a rectangle. So a square is a special rectangle!';
    setMsg(text);
    play(right ? 'correct' : 'pop');
  };

  const dragHandlers = useSvgDrag(
    (p) => {
      dragAt.current = { x: p.x - grab.current.x, y: p.y - grab.current.y };
      setDrag(dragAt.current);
    },
    {
      onStart: (p) => {
        const c = pose().corner;
        grab.current = { x: p.x - c.x, y: p.y - c.y };
      },
      onEnd: () => {
        const d = dragAt.current;
        dragAt.current = null;
        setDrag(null);
        if (d) drop(d);
      },
    },
  );

  const equalText = groups.every((g) => g === 1)
    ? `All ${n} sides are the same length.`
    : groups.every((g) => g === 0)
      ? 'All the sides are different lengths.'
      : 'Opposite sides are the same length.';

  const sentence = msg ?? `Tap each side of the ${name} to count it. Tap each corner too. Then drag the corner checker onto a corner.`;
  const lines = wrapLines(sentence, 21);
  const { corner, u, p } = pose();
  const checkGlow = drag || checkerAt === null ? undefined : tests[checkerAt] ? C.green : C.red;

  const fact = (label: string, value: string, done: boolean, y: number) => (
    <g>
      <text x={750} y={y} fontSize={18} fill={C.ink}>
        {label}
      </text>
      <text x={950} y={y} textAnchor="end" fontSize={22} fontWeight={800} fill={done ? shade(C.green, -0.2) : C.muted}>
        {value}
      </text>
    </g>
  );

  return (
    <SceneSvg label={`${article(name)} ${name} to explore: count sides and corners, and test for right angles`}>
      {/* Shape picker */}
      {POLY_KEYS.map((k, i) => {
        const on = k === key;
        const x = 30 + i * 96;
        return (
          <g key={k} onClick={() => choose(k)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={POLYS[k].name} aria-pressed={on}>
            <rect x={x} y={24} width={88} height={72} rx={12} fill={on ? C.yellow : C.card} stroke={C.ink} strokeWidth={on ? 3 : 2} />
            <polygon points={polyPoints(POLYS[k].pts.map((q) => ({ x: q.x * 0.17, y: q.y * 0.17 })), x + 44, 60)} fill={shade(POLYS[k].colour, 0.4)} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
          </g>
        );
      })}

      {/* The shape */}
      <polygon points={polyPoints(pts)} fill={shade(colour, 0.6)} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      {pts.map((a, i) => {
        const b = pts[(i + 1) % n];
        const k = sides.indexOf(i);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const out = unit(mx - CX, my - CY);
        return (
          <g key={`s${i}`} onClick={() => tapSide(i)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Side ${i + 1}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={40} />
            {k >= 0 && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.blue} strokeWidth={9} strokeLinecap="round" />}
            {k >= 0 && (
              <g>
                <circle cx={mx + out.x * 34} cy={my + out.y * 34} r={17} fill={C.blue} stroke={C.ink} strokeWidth={2} />
                <text x={mx + out.x * 34} y={my + out.y * 34} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={800} fill={C.white}>
                  {k + 1}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {equal && pts.map((a, i) => (groups[i] ? <SideTicks key={`t${i}`} a={a} b={pts[(i + 1) % n]} count={groups[i]} /> : null))}
      {pts.map((_, i) => (tests[i] === undefined ? null : tests[i] ? <RightMark key={`r${i}`} pts={pts} i={i} size={24} /> : null))}
      {pts.map((v, i) => {
        const k = corners.indexOf(i);
        const out = unit(v.x - CX, v.y - CY);
        const bad = tests[i] === false;
        return (
          <g key={`c${i}`} onClick={() => tapCorner(i)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Corner ${i + 1}`}>
            <circle cx={v.x} cy={v.y} r={28} fill="transparent" />
            <circle cx={v.x} cy={v.y} r={k >= 0 ? 10 : 6} fill={k >= 0 ? C.red : C.ink} />
            {bad && <circle cx={v.x} cy={v.y} r={16} fill="none" stroke={C.red} strokeWidth={3} strokeDasharray="5 4" />}
            {k >= 0 && (
              <g>
                <circle cx={v.x + out.x * 38} cy={v.y + out.y * 38} r={17} fill={C.red} stroke={C.ink} strokeWidth={2} />
                <text x={v.x + out.x * 38} y={v.y + out.y * 38} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={800} fill={C.white}>
                  {k + 1}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Corner checker */}
      {checkerAt !== null && !drag && (
        <g opacity={0.35}>
          <Checker corner={HOME} u={{ x: 1, y: 0 }} p={{ x: 0, y: -1 }} />
        </g>
      )}
      <text x={HOME.x + 26} y={HOME.y - 22} fontSize={16} fill={C.muted} className="caps">
        Corner checker
      </text>
      <g {...dragHandlers} role="button" aria-label="Corner checker: drag it onto a corner">
        <Checker corner={corner} u={u} p={p} glow={checkGlow} />
      </g>

      {/* Readout and facts */}
      <rect x={730} y={110} width={240} height={50 + lines.length * 26} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={146 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
      <rect x={730} y={318} width={240} height={128} rx={14} fill={shade(C.paper, 0.4)} stroke={C.ink} strokeWidth={2} />
      {fact('Sides', sides.length === n ? String(n) : sides.length ? `${sides.length}…` : '?', sides.length === n, 352)}
      {fact('Corners', corners.length === n ? String(n) : corners.length ? `${corners.length}…` : '?', corners.length === n, 388)}
      {fact('Right angles', tested === n ? String(R) : tested ? `${found}…` : '?', tested === n, 424)}
      <SvgButton
        x={730}
        y={462}
        w={240}
        h={50}
        fontSize={17}
        label="Equal sides"
        active={equal}
        color={equal ? C.yellow : C.card}
        onClick={() => {
          setEqual((e) => !e);
          if (!equal) setMsg(equalText);
        }}
      />
      <SvgButton x={730} y={526} w={116} h={50} fontSize={17} label="Again" title="Start again" onClick={() => choose(key)} />
      <SvgButton x={854} y={526} w={116} h={50} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />

      <Callout at={[pts[tipIndex].x, pts[tipIndex].y]} box={[545, 120]} w={170} icon={Triangle} title="Sides and corners" text="Sides are the straight lines. Corners are where two sides meet." />
      <Callout at={[HOME.x, HOME.y - 62]} box={[230, 560]} w={200} icon={SquareDashedBottom} title="Right angle" text="A square corner, like the corner of a book. If the checker fits exactly, it is a right angle." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <polygon points="14,14 64,14 64,64 14,64" fill={shade(C.blue, 0.5)} stroke={C.ink} strokeWidth={2.5} />
      <path d="M14,28 L28,28 L28,14" fill="none" stroke={C.green} strokeWidth={3} />
      <polygon points="92,10 112,40 92,70 72,40" fill={shade(C.pink, 0.5)} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={64} cy={64} r={4} fill={C.red} />
    </svg>
  );
}

/* ───────────────────────── Practice ───────────────────────── */

const SIDES: Record<PolyKey, number> = Object.fromEntries(POLY_KEYS.map((k) => [k, POLYS[k].pts.length])) as Record<PolyKey, number>;

function countQuestion(): Question {
  const key = pick(POLY_KEYS);
  const what = pick(['sides', 'corners'] as const);
  const n = SIDES[key];
  const name = POLYS[key].name;
  return {
    prompt: `How many ${what} does this shape have?`,
    visual: <PolyCard id={key} />,
    choices: numberChoices(n, { count: 3, min: 3, max: 8 }).map((value) => ({ value })),
    answer: String(n),
    hint: what === 'sides' ? 'Put your finger on one side and count each straight line as you go round.' : 'Count each point where two sides meet. Start at the top.',
    explain: [`Go round and count the ${what}: ${counting(n)}.`, `There are ${n} ${what}.`, `So ${article(name)} ${name} has ${n} ${what}.`],
  };
}

function rightAngleQuestion(): Question {
  const key = pick(['square', 'rectangle', 'right-triangle', 'triangle', 'rhombus', 'hexagon'] as PolyKey[]);
  const n = rightAngles(key);
  const name = POLYS[key].name;
  return {
    prompt: 'How many right angles (square corners) does this shape have?',
    visual: <PolyCard id={key} />,
    choices: numberChoices(n, { count: 3, min: 0, max: 4 }).map((value) => ({ value })),
    answer: String(n),
    hint: 'Check each corner. Does it look like the corner of a book or a piece of paper?',
    explain:
      n === 0
        ? ['Check each corner with a square corner.', 'No corner fits exactly: they are all too wide or too narrow.', `So the ${name} has 0 right angles.`]
        : ['Check each corner with a square corner.', `${n} ${n === 1 ? 'corner fits' : 'corners fit'} exactly.`, `So the ${name} has ${n} right ${n === 1 ? 'angle' : 'angles'}.`],
  };
}

function cardChoices(keys: PolyKey[]) {
  return shuffle(keys).map((k) => ({ value: POLYS[k].name, name: POLYS[k].name, label: <PolyCard id={k} /> }));
}

function whichHasQuestion(): Question {
  const target = pick(['triangle', 'pentagon', 'hexagon'] as PolyKey[]);
  const others = shuffle(POLY_KEYS.filter((k) => SIDES[k] !== SIDES[target])).slice(0, 2);
  const n = SIDES[target];
  const what = pick(['sides', 'corners']);
  const name = POLYS[target].name;
  return {
    prompt: `Which shape has ${n} ${what}?`,
    choices: cardChoices([target, ...others]),
    answer: name,
    hint: `Count the ${what} of each shape.`,
    explain: [`Count the ${what} on each shape.`, `The ${name} has ${counting(n)}: ${n} ${what}.`, `So the answer is the ${name}.`],
  };
}

function propertyQuestion(): Question {
  const kind = pick(['square-rectangle', 'no-right', 'square', 'one-right'] as const);
  if (kind === 'square-rectangle') {
    return {
      prompt: 'A rectangle has 4 sides and 4 right angles. Is a square a rectangle too?',
      visual: <PolyCard id="square" marks />,
      choices: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      answer: 'yes',
      hint: 'Count the sides of the square. Then check its corners.',
      explain: ['A square has 4 sides.', 'All 4 corners of a square are right angles.', 'So yes: a square is a special rectangle, with all sides the same length.'],
    };
  }
  if (kind === 'no-right') {
    return {
      prompt: 'Which shape has 4 sides but no right angles?',
      choices: cardChoices(['rhombus', 'square', 'rectangle']),
      answer: 'rhombus',
      hint: 'All three have 4 sides. Look for corners that are not square corners.',
      explain: ['The square and the rectangle have 4 square corners each.', 'The rhombus has 2 narrow corners and 2 wide corners.', 'So the rhombus has 4 sides but no right angles.'],
    };
  }
  if (kind === 'square') {
    return {
      prompt: 'Which shape has 4 sides all the same length AND 4 right angles?',
      choices: cardChoices(['square', 'rhombus', 'rectangle']),
      answer: 'square',
      hint: 'Check two things: are all the sides the same length? Are all the corners square corners?',
      explain: ['The rectangle has square corners, but two sides are longer.', 'The rhombus has equal sides, but no square corners.', 'Only the square has both.'],
    };
  }
  return {
    prompt: 'Which shape has 3 sides and 1 right angle?',
    choices: cardChoices(['right-triangle', 'triangle', 'square']),
    answer: 'right-angled triangle',
    hint: 'Find the shapes with 3 sides first. Then look for a square corner.',
    explain: ['The triangle and the right-angled triangle both have 3 sides.', 'Only one of them has a square corner.', 'So the answer is the right-angled triangle.'],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return countQuestion();
  if (level === 1) return Math.random() < 0.55 ? rightAngleQuestion() : whichHasQuestion();
  return Math.random() < 0.7 ? propertyQuestion() : rightAngleQuestion();
}

export const shapeProperties: Lesson = {
  id: 'shape-properties',
  title: 'Shape Detectives',
  Thumb,
  Scene: ShapeScene,
  sceneHint: 'Tap sides and corners to count · Drag the checker onto a corner',
  learn: {
    heading: 'Sides, corners and right angles',
    intro: 'Shape detectives look for clues: how many sides, how many corners, and whether the corners are square corners. A square corner is called a right angle.',
    points: [
      { icon: Hash, text: 'Count the sides (straight lines) and the corners (where sides meet).' },
      { icon: SquareDashedBottom, text: 'A right angle is a square corner, like the corner of a book.' },
      { icon: Search, text: 'A square has 4 equal sides and 4 right angles. That makes it a rectangle too!' },
    ],
  },
  steps: ['Count the sides as you go round the shape.', 'Count the corners.', 'Test each corner: is it a right angle?', 'Use the clues to name the shape.'],
  example: {
    question: 'How many sides, corners and right angles does a rectangle have?',
    visual: (
      <svg viewBox="-185 -185 370 370" role="img" aria-label="A rectangle with its right angles marked">
        <polygon points={polyPoints(POLYS.rectangle.pts)} fill={shade(C.green, 0.55)} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
        {POLYS.rectangle.pts.map((_, i) => (
          <RightMark key={i} pts={POLYS.rectangle.pts} i={i} size={34} colour={C.ink} />
        ))}
      </svg>
    ),
    work: ['Count the sides: 1, 2, 3, 4.', 'Count the corners: 1, 2, 3, 4.', 'Every corner is a square corner.'],
    answer: '4 sides, 4 corners and 4 right angles.',
  },
  grownups: [
    'Make a right-angle checker by folding a scrap of paper twice. Hunt for right angles around the house: doors, books, windows, tiles.',
    'Ask “How do you know?”: “It’s a triangle because it has 3 sides” is better than just naming it.',
    'Turn shapes around. A square standing on its corner is still a square, even if it looks like a diamond.',
  ],
  makeQuestion,
};
