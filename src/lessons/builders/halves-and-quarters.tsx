import { useId, useState } from 'react';
import { Equal, Scissors, Split } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { ThingsPicture } from '../../visuals/Thing';
import { bbox, FoodBody, FoodTop, FRACTION_GLYPH, FRACTION_NAME, FractionPicture, pieceShares } from './visuals/Fractions';
import type { FoodShape } from './visuals/Fractions';
import { wrapLines } from './visuals/text';

const FOODS: { shape: FoodShape; label: string }[] = [
  { shape: 'pizza', label: 'Pizza' },
  { shape: 'sandwich', label: 'Sandwich' },
  { shape: 'cake', label: 'Cake' },
];

/** Parts within 2% of each other count as equal (the cut snaps to the middle anyway). */
const equalShares = (shares: number[]) => Math.max(...shares) - Math.min(...shares) < 0.02;

function readout(parts: number, shaded: number, equal: boolean): { big: string; text: string } {
  if (!equal) return { big: '✗', text: parts === 2 ? 'Not halves! The parts are different sizes.' : 'Not quarters! The parts are different sizes.' };
  if (shaded === 0) return { big: parts === 2 ? '½' : '¼', text: `${parts} equal parts. Each part is one ${parts === 2 ? 'half' : 'quarter'}. Tap a part to colour it.` };
  if (shaded === parts) return { big: '1', text: `${parts} ${parts === 2 ? 'halves' : 'quarters'} make one whole!` };
  if (parts === 2) return { big: '½', text: '1 of 2 equal parts is coloured: one half.' };
  if (shaded === 2) return { big: '2/4', text: '2 of 4 equal parts. That is the same as one half!' };
  return { big: shaded === 1 ? '¼' : '¾', text: `${shaded} of 4 equal parts: ${shaded === 1 ? 'one quarter' : 'three quarters'}.` };
}

function CutHandle({ x, y, vertical, onMove }: { x: number; y: number; vertical: boolean; onMove: (v: number, done: boolean) => void }) {
  const drag = useSvgDrag((p) => onMove(vertical ? p.x : p.y, false), { onEnd: () => onMove(vertical ? x : y, true) });
  return (
    <g {...drag} role="slider" aria-label={vertical ? 'Slide the up-and-down cut' : 'Slide the side-to-side cut'}>
      <circle cx={x} cy={y} r={30} fill="transparent" />
      <circle cx={x} cy={y} r={22} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
      <path
        d={vertical ? `M${x - 8},${y} h16 M${x - 8},${y} l5,-5 M${x - 8},${y} l5,5 M${x + 8},${y} l-5,-5 M${x + 8},${y} l-5,5` : `M${x},${y - 8} v16 M${x},${y - 8} l-5,5 M${x},${y - 8} l5,5 M${x},${y + 8} l-5,-5 M${x},${y + 8} l5,-5`}
        stroke={C.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

function HalvesScene() {
  const uid = useId().replace(/:/g, '');
  const [shape, setShape] = useState<FoodShape>('pizza');
  const [parts, setParts] = useState<2 | 4>(2);
  const b = bbox(shape);
  const mid = { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 };
  const [vx, setVx] = useState(mid.x + 60);
  const [hy, setHy] = useState(mid.y);
  const [shaded, setShaded] = useState<boolean[]>([false, false, false, false]);

  const hCut = parts === 4 ? hy : null;
  const shares = pieceShares(shape, vx, hCut);
  const equal = equalShares(shares);
  const count = shaded.slice(0, parts).filter(Boolean).length;
  const info = readout(parts, count, equal);

  // Let go near the middle and the cut snaps there.
  const moveV = (v: number, done: boolean) => {
    const c = clamp(v, b.x1 + 30, b.x2 - 30);
    setVx(done && Math.abs(c - mid.x) < 14 ? mid.x : c);
    if (done) play(Math.abs(c - mid.x) < 14 ? 'pop' : 'tap');
  };
  const moveH = (v: number, done: boolean) => {
    const c = clamp(v, b.y1 + 30, b.y2 - 30);
    setHy(done && Math.abs(c - mid.y) < 14 ? mid.y : c);
    if (done) play(Math.abs(c - mid.y) < 14 ? 'pop' : 'tap');
  };

  const choose = (s: FoodShape) => {
    setShape(s);
    const nb = bbox(s);
    setVx((nb.x1 + nb.x2) / 2 + 60);
    setHy((nb.y1 + nb.y2) / 2 + 40);
    setShaded([false, false, false, false]);
    play('tap');
  };
  const setMode = (p: 2 | 4) => {
    setParts(p);
    setShaded([false, false, false, false]);
    if (p === 4) setHy(mid.y + 40);
    play('tap');
  };
  const makeFair = () => {
    setVx(mid.x);
    setHy(mid.y);
    play('pop');
  };

  const regions =
    parts === 2
      ? [
          { x: b.x1 - 5, y: b.y1 - 5, w: vx - b.x1 + 5, h: b.y2 - b.y1 + 10 },
          { x: vx, y: b.y1 - 5, w: b.x2 - vx + 5, h: b.y2 - b.y1 + 10 },
        ]
      : [
          { x: b.x1 - 5, y: b.y1 - 5, w: vx - b.x1 + 5, h: hy - b.y1 + 5 },
          { x: vx, y: b.y1 - 5, w: b.x2 - vx + 5, h: hy - b.y1 + 5 },
          { x: b.x1 - 5, y: hy, w: vx - b.x1 + 5, h: b.y2 - hy + 5 },
          { x: vx, y: hy, w: b.x2 - vx + 5, h: b.y2 - hy + 5 },
        ];

  return (
    <SceneSvg label={`A ${shape} cut into ${parts} ${equal ? 'equal' : 'unequal'} parts`}>
      {FOODS.map((f, i) => (
        <SvgButton key={f.shape} x={60 + i * 140} y={36} w={128} h={52} fontSize={18} label={f.label} active={shape === f.shape} color={shape === f.shape ? C.yellow : C.card} onClick={() => choose(f.shape)} />
      ))}

      <defs>
        {regions.map((r, i) => (
          <clipPath key={i} id={`${uid}-r${i}`}>
            <rect x={r.x} y={r.y} width={Math.max(0, r.w)} height={Math.max(0, r.h)} />
          </clipPath>
        ))}
      </defs>

      {regions.map((_, i) => (
        <g
          key={i}
          clipPath={`url(#${uid}-r${i})`}
          onClick={() => {
            setShaded((s) => s.map((v, k) => (k === i ? !v : v)));
            play('tap');
          }}
          style={{ cursor: 'pointer' }}
          data-nopan
        >
          <FoodBody shape={shape} />
          <FoodTop shape={shape} />
          {shaded[i] && <FoodBody shape={shape} fill={shade(C.purple, 0.15)} />}
        </g>
      ))}
      <g fill="none" pointerEvents="none">
        <FoodBody shape={shape} fill="none" />
      </g>

      {/* Cut lines and their handles */}
      <line x1={vx} y1={b.y1 - 10} x2={vx} y2={b.y2 + 10} stroke={C.ink} strokeWidth={4} strokeDasharray="12 6" pointerEvents="none" />
      {parts === 4 && <line x1={b.x1 - 10} y1={hy} x2={b.x2 + 10} y2={hy} stroke={C.ink} strokeWidth={4} strokeDasharray="12 6" pointerEvents="none" />}
      <CutHandle x={vx} y={b.y1 - 38} vertical onMove={moveV} />
      {parts === 4 && <CutHandle x={b.x1 - 38} y={hy} vertical={false} onMove={moveH} />}

      {/* Readout */}
      <rect x={600} y={130} width={370} height={330} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={624} y={168} fontSize={15} fill={C.muted} className="caps">
        Size of each part
      </text>
      {shares.map((s, i) => (
        <g key={i}>
          <rect x={624} y={182 + i * 34} width={300} height={24} rx={8} fill={shade(C.paper, 0.3)} />
          <rect x={624} y={182 + i * 34} width={Math.min(320, Math.max(6, s * 300 * (parts === 2 ? 1.5 : 2.4)))} height={24} rx={8} fill={shaded[i] ? C.purple : C.teal} />
        </g>
      ))}
      <text x={785} y={parts === 2 ? 304 : 372} textAnchor="middle" fontSize={equal ? 64 : 54} fontWeight={700} fill={equal ? C.purple : C.red} className="num">
        {info.big}
      </text>
      {wrapLines(info.text, 30).map((line, i) => (
        <text key={i} x={785} y={(parts === 2 ? 348 : 412) + i * 24} textAnchor="middle" fontSize={17} fill={C.ink}>
          {line}
        </text>
      ))}

      <SvgButton x={600} y={490} w={180} h={54} fontSize={18} label="Halves" active={parts === 2} color={parts === 2 ? C.yellow : C.card} onClick={() => setMode(2)} />
      <SvgButton x={790} y={490} w={180} h={54} fontSize={18} label="Quarters" active={parts === 4} color={parts === 4 ? C.yellow : C.card} onClick={() => setMode(4)} />
      <SvgButton x={600} y={566} w={370} h={52} fontSize={18} label="Cut fairly (middle)" onClick={makeFair} color={C.teal} textColor={C.white} disabled={equal} />

      <Callout at={[vx, b.y1 - 38]} box={[440, 92]} w={150} icon={Scissors} title="Slide the cut" />
      <Callout at={[624, 194]} box={[640, 18]} w={220} icon={Equal} title="Equal parts?" text="Halves and quarters must be exactly the same size." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <circle cx={40} cy={40} r={30} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
      <path d="M40,10 A30,30 0 0 1 40,70 Z" fill={C.purple} stroke={C.ink} strokeWidth={2} />
      <text x={92} y={44} textAnchor="middle" dominantBaseline="central" fontSize={34} fontWeight={700} fill={C.ink}>
        ½
      </text>
    </svg>
  );
}

const pic = (o: { shape: 'circle' | 'rect'; parts: 2 | 4; shaded: number; unequal?: boolean }) => <FractionPicture {...o} />;

function whichCut(parts: 2 | 4): Question {
  const shape = pick<'circle' | 'rect'>(['circle', 'rect']);
  const word = parts === 2 ? 'halves' : 'quarters';
  const options: Choice[] = [
    { value: 'right', name: `${parts === 2 ? 'two' : 'four'} equal parts`, label: pic({ shape, parts, shaded: 0 }) },
    { value: 'unequal', name: `${parts === 2 ? 'two' : 'four'} parts that are not the same size`, label: pic({ shape, parts, shaded: 0, unequal: true }) },
    { value: 'other', name: `${parts === 2 ? 'four' : 'two'} equal parts`, label: pic({ shape, parts: parts === 2 ? 4 : 2, shaded: 0 }) },
  ];
  return {
    prompt: `Which one is cut into ${word}?`,
    choices: shuffle(options),
    answer: 'right',
    hint: `${word[0].toUpperCase() + word.slice(1)} means ${parts === 2 ? 'two' : 'four'} parts that are exactly the same size.`,
    explain: [
      `${word[0].toUpperCase() + word.slice(1)} are ${parts === 2 ? '2' : '4'} parts that are all the same size.`,
      'One picture has the wrong number of parts, and one has parts of different sizes.',
      `So the one with ${options[0].name} shows ${word}.`,
    ],
  };
}

function whatShaded(level: number): Question {
  const shape = pick<'circle' | 'rect'>(['circle', 'rect']);
  const [parts, shaded]: [2 | 4, number] = level < 2 ? pick<[2 | 4, number]>([[2, 1], [4, 1]]) : pick<[2 | 4, number]>([[4, 3], [4, 1], [2, 1]]);
  const answer = parts === 2 ? '1/2' : `${shaded}/4`;
  return {
    prompt: 'What part is coloured?',
    visual: pic({ shape, parts, shaded }),
    choices: shuffle(['1/2', '1/4', '3/4']).map((v) => ({ value: v, label: FRACTION_GLYPH[v], name: FRACTION_NAME[v] })),
    answer,
    hint: 'Count the equal parts. Then count how many are coloured.',
    explain: [
      `The shape is cut into ${parts} equal parts.`,
      `${shaded} ${shaded === 1 ? 'part is' : 'parts are'} coloured.`,
      `So ${FRACTION_NAME[answer]} (${answer}) is coloured.`,
    ],
  };
}

function shareGroup(): Question {
  const quarter = Math.random() < 0.4;
  const d = quarter ? 4 : 2;
  const n = quarter ? pick([4, 8, 12]) : pick([4, 6, 8, 10, 12]);
  const each = n / d;
  return {
    prompt: `What is ${quarter ? 'a quarter' : 'half'} of ${n}?`,
    visual: <ThingsPicture kind="cookie" count={n} perRow={6} />,
    choices: numberChoices(each, { count: 3, min: 1, max: 12, spread: 2 }).map((value) => ({ value })),
    answer: String(each),
    hint: `Share the cookies onto ${d} plates, one at a time, so every plate gets the same.`,
    explain: [`Share ${n} cookies onto ${d} plates, one at a time.`, `Each plate gets ${each}.`, `So ${quarter ? 'a quarter' : 'half'} of ${n} is ${each}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return Math.random() < 0.6 ? whichCut(2) : whatShaded(0);
  if (level === 1) return pick([() => whichCut(4), () => whatShaded(1), () => shareGroup()])();
  return Math.random() < 0.5 ? whatShaded(2) : shareGroup();
}

export const halvesAndQuarters: Lesson = {
  id: 'halves-and-quarters',
  title: 'Halves and Quarters',
  Thumb,
  Scene: HalvesScene,
  sceneHint: 'Slide the cut · Make the parts equal · Tap a part to colour it',
  learn: {
    heading: 'Halves and quarters',
    intro: 'When we cut something into equal parts, every part is exactly the same size. Two equal parts are halves. Four equal parts are quarters.',
    points: [
      { icon: Equal, text: 'Equal parts are exactly the same size.' },
      { icon: Split, text: '2 equal parts: each one is a half (½).' },
      { icon: Scissors, text: '4 equal parts: each one is a quarter (¼).' },
    ],
  },
  steps: ['Count the parts.', 'Check they are all the same size.', 'If 2 equal parts, each is a half. If 4, each is a quarter.', 'Count the coloured parts to name the fraction.'],
  example: {
    question: 'What part of this shape is coloured?',
    visual: <FractionPicture shape="circle" parts={4} shaded={1} />,
    work: ['It is cut into 4 equal parts.', '1 part is coloured.'],
    answer: 'One quarter (¼) is coloured.',
  },
  grownups: [
    'Share snacks fairly: “Is that a fair half?” Children learn halves must be equal, not just “two pieces”.',
    'Fold paper in half and in quarters, then open it and count the parts.',
    'Halves of a group work too: half of 8 grapes means 2 equal groups of 4.',
  ],
  makeQuestion,
};
