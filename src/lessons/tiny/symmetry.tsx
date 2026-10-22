import { useState } from 'react';
import { Eraser, FlipHorizontal, Ruler, Scissors } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import {
  ASYMMETRIC_SHAPES,
  GRID_PICTURES,
  LINE_CASES,
  LineCasePicture,
  MiniGrid,
  mirrorHalf,
  PALETTE,
  SHAPE_NAMES,
  ShapeCard,
  ShapeOutline,
  SYMMETRIC_SHAPES,
} from './visuals/Symmetry';

const G = { x: 110, y: 96, cell: 52, cols: 8, rows: 8 };
const MID = G.x + 4 * G.cell;

type Check = null | { wrong: Set<string>; missing: Set<string> };

const emptyRight = () => Array.from({ length: G.rows }, () => '....');

function SymmetryScene() {
  const [pic, setPic] = useState(0);
  const [right, setRight] = useState<string[]>(emptyRight);
  const picture = GRID_PICTURES[pic];
  const colours = [...new Set(picture.rows.join('').replace(/\./g, ''))];
  const [brush, setBrush] = useState<string>(colours[0]);
  const [check, setCheck] = useState<Check>(null);

  const target = (r: number, c: number) => picture.rows[r][c + 4];

  const paint = (r: number, c: number) => {
    setRight((rows) => {
      const cur = rows[r][c];
      const next = brush === '.' || cur === brush ? '.' : brush;
      const row = rows[r].slice(0, c) + next + rows[r].slice(c + 1);
      return rows.map((x, i) => (i === r ? row : x));
    });
    setCheck(null);
    play('tap');
  };

  const fold = () => {
    const wrong = new Set<string>();
    const missing = new Set<string>();
    for (let r = 0; r < G.rows; r++)
      for (let c = 0; c < 4; c++) {
        const have = right[r][c];
        const want = target(r, c);
        if (have !== '.' && have !== want) wrong.add(`${r}-${c}`);
        if (want !== '.' && have !== want) missing.add(`${r}-${c}`);
      }
    setCheck({ wrong, missing });
    play(wrong.size === 0 && missing.size === 0 ? 'correct' : 'wrong');
  };

  const showOne = () => {
    for (let r = 0; r < G.rows; r++)
      for (let c = 0; c < 4; c++) {
        if (right[r][c] !== target(r, c)) {
          const want = target(r, c);
          setRight((rows) => rows.map((x, i) => (i === r ? x.slice(0, c) + want + x.slice(c + 1) : x)));
          setCheck(null);
          play('pop');
          return;
        }
      }
  };

  const nextPicture = () => {
    const n = (pic + 1) % GRID_PICTURES.length;
    setPic(n);
    setRight(emptyRight());
    setCheck(null);
    setBrush([...new Set(GRID_PICTURES[n].rows.join('').replace(/\./g, ''))][0]);
    play('whoosh');
  };

  const done = check !== null && check.wrong.size === 0 && check.missing.size === 0;
  const sentence = done
    ? `Both halves match! The ${picture.name} is the same on each side of the mirror line.`
    : check
      ? `Not yet. ${check.wrong.size ? `${check.wrong.size} ${check.wrong.size === 1 ? 'square does' : 'squares do'} not match.` : ''} ${check.missing.size ? `${check.missing.size} still to colour.` : ''} Look across the mirror line.`.replace(/\s+/g, ' ')
      : `Colour the right side so it matches the left. Each square goes the same distance from the mirror line.`;
  const lines = wrap(sentence, 21);

  return (
    <SceneSvg label={`Half a ${picture.name} to finish as a mirror picture`}>
      {/* Grid */}
      <rect x={G.x + 4} y={G.y + 6} width={G.cols * G.cell} height={G.rows * G.cell} fill={C.ink} opacity={0.1} />
      <rect x={G.x} y={G.y} width={G.cols * G.cell} height={G.rows * G.cell} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
      {picture.rows.map((row, r) =>
        [...row.slice(0, 4)].map((ch, c) => (
          <rect key={`l${r}-${c}`} x={G.x + c * G.cell} y={G.y + r * G.cell} width={G.cell} height={G.cell} fill={ch === '.' ? shade(C.paper, 0.5) : PALETTE[ch]} stroke={shade(C.line, -0.1)} strokeWidth={1} />
        )),
      )}
      {right.map((row, r) =>
        [...row].map((ch, c) => {
          const key = `${r}-${c}`;
          const x = MID + c * G.cell;
          const y = G.y + r * G.cell;
          const bad = check?.wrong.has(key);
          const miss = check?.missing.has(key) && !bad;
          return (
            <g key={`r${key}`} onClick={() => paint(r, c)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Row ${r + 1}, square ${c + 1} on the right`}>
              <rect x={x} y={y} width={G.cell} height={G.cell} fill={ch === '.' ? C.white : PALETTE[ch]} stroke={shade(C.line, -0.1)} strokeWidth={1} />
              {bad && <path d={`M${x + 12},${y + 12} L${x + G.cell - 12},${y + G.cell - 12} M${x + G.cell - 12},${y + 12} L${x + 12},${y + G.cell - 12}`} stroke={C.red} strokeWidth={5} strokeLinecap="round" />}
              {miss && <rect x={x + 5} y={y + 5} width={G.cell - 10} height={G.cell - 10} rx={6} fill="none" stroke={C.red} strokeWidth={3} strokeDasharray="6 5" />}
            </g>
          );
        }),
      )}
      <rect x={G.x} y={G.y} width={G.cols * G.cell} height={G.rows * G.cell} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <line x1={MID} y1={G.y - 18} x2={MID} y2={G.y + G.rows * G.cell + 18} stroke={C.red} strokeWidth={5} strokeDasharray="12 8" />
      <text x={MID} y={G.y - 26} textAnchor="middle" fontSize={16} fill={C.red} className="caps">
        Mirror line
      </text>

      {/* Brush colours */}
      <text x={G.x} y={566} fontSize={16} fill={C.muted} className="caps">
        Pick a colour
      </text>
      {[...colours, '.'].map((ch, i) => {
        const cx = G.x + 30 + i * 66;
        const on = brush === ch;
        return (
          <g key={ch} onClick={() => setBrush(ch)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={ch === '.' ? 'Rubber' : 'Colour'} aria-pressed={on}>
            <circle cx={cx} cy={612} r={30} fill={on ? shade(C.yellow, 0.4) : 'transparent'} stroke={on ? C.ink : C.line} strokeWidth={on ? 3 : 2} />
            {ch === '.' ? (
              <g transform={`translate(${cx - 12} ${600})`}>
                <rect width={24} height={24} rx={4} fill={C.pink} stroke={C.ink} strokeWidth={2} transform="rotate(-30 12 12)" />
              </g>
            ) : (
              <circle cx={cx} cy={612} r={20} fill={PALETTE[ch]} stroke={C.ink} strokeWidth={2} />
            )}
          </g>
        );
      })}

      {/* Readout and controls */}
      <rect x={730} y={96} width={240} height={50 + lines.length * 26} rx={14} fill={done ? shade(C.green, 0.75) : C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={132 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
      <SvgButton x={730} y={380} w={240} h={56} fontSize={19} label="Fold to check" onClick={fold} color={C.teal} textColor={C.white} />
      <SvgButton x={730} y={450} w={240} h={50} fontSize={17} label="Show me one square" onClick={showOne} disabled={done} />
      <SvgButton
        x={730}
        y={514}
        w={116}
        h={50}
        fontSize={17}
        label="Clear"
        onClick={() => {
          setRight(emptyRight());
          setCheck(null);
          play('tap');
        }}
      />
      <SvgButton x={854} y={514} w={116} h={50} fontSize={17} label="New" title="New picture" onClick={nextPicture} />
      <SvgButton x={730} y={578} w={240} h={48} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />

      <Callout at={[MID, G.y + 20]} box={[540, 170]} w={170} icon={FlipHorizontal} title="Mirror line" text="Fold along it and both halves land on top of each other." />
      <Callout at={[G.x + 3 * G.cell + 26, G.y + 3 * G.cell + 26]} box={[540, 320]} w={170} icon={Ruler} title="Same distance" text="A square one step left of the line needs a partner one step right." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <MiniGrid x={24} y={4} cells={GRID_PICTURES[0].rows} cell={9} line={4} />
    </svg>
  );
}

/* ───────────────────────── Practice ───────────────────────── */

const LETTERS = ['A', 'B', 'C'];

function halfPattern(rows: number, colours: string[]): string[] {
  for (;;) {
    const half = Array.from({ length: rows }, () => [...Array(4)].map(() => (Math.random() < 0.42 ? pick(colours) : '.')).join(''));
    const filled = half.join('').replace(/\./g, '').length;
    const selfMirror = half.every((r) => r === mirrorHalf(r));
    if (filled >= 5 && filled <= 9 && !selfMirror) return half;
  }
}

function otherHalfQuestion(rows: number, colours: string[]): Question {
  for (;;) {
    const half = halfPattern(rows, colours);
    const mirror = half.map(mirrorHalf);
    const copy = half;
    const r = rand(0, rows - 1);
    const c = rand(0, 3);
    const flip = mirror[r][c] === '.' ? colours[0] : '.';
    const wrong = mirror.map((row, i) => (i === r ? row.slice(0, c) + flip + row.slice(c + 1) : row));
    const keys = [mirror, copy, wrong].map((g) => g.join('|'));
    if (new Set(keys).size < 3) continue;
    const order = shuffle([
      { kind: 'mirror', cells: mirror },
      { kind: 'copy', cells: copy },
      { kind: 'wrong', cells: wrong },
    ]);
    const answerIndex = order.findIndex((o) => o.kind === 'mirror');
    const choices: Choice[] = order.map((o, i) => ({
      value: LETTERS[i],
      name: `Picture ${LETTERS[i]}`,
      label: (
        <svg viewBox={`-30 -4 122 ${rows * 22 + 8}`} role="img" aria-label={`Picture ${LETTERS[i]}`}>
          <text x={-14} y={(rows * 22) / 2 + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
            {LETTERS[i]}
          </text>
          <MiniGrid x={0} y={0} cells={o.cells} cell={22} />
        </svg>
      ),
    }));
    const blank = half.map(() => '....');
    return {
      prompt: 'Which picture is the other half, as if in a mirror?',
      visual: (
        <svg viewBox={`-6 -10 190 ${rows * 22 + 20}`} role="img" aria-label="Half a picture next to a mirror line">
          <MiniGrid x={0} y={0} cells={half.map((h, i) => h + blank[i])} cell={22} line={4} />
        </svg>
      ),
      choices,
      answer: LETTERS[answerIndex],
      hint: 'Squares next to the mirror line stay next to it. Squares far from it stay far away.',
      explain: [
        'In a mirror, things flip: what is close to the line stays close.',
        `Picture ${LETTERS[answerIndex]} is the left half flipped over the line.`,
        `So Picture ${LETTERS[answerIndex]} is the other half.`,
      ],
    };
  }
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const yes = pick(SYMMETRIC_SHAPES);
    const nos = shuffle(ASYMMETRIC_SHAPES).slice(0, 2);
    return {
      prompt: 'Which shape has a mirror line? (You could fold it so both halves match.)',
      choices: shuffle([yes, ...nos]).map((id) => ({ value: SHAPE_NAMES[id], name: SHAPE_NAMES[id], label: <ShapeCard id={id} /> })),
      answer: SHAPE_NAMES[yes],
      hint: 'Imagine folding each shape in half. Do the two halves fit exactly?',
      explain: [`Fold the ${SHAPE_NAMES[yes]} down the middle.`, 'Both halves match exactly.', `So the ${SHAPE_NAMES[yes]} has a mirror line.`],
    };
  }

  if (level === 1) return otherHalfQuestion(4, ['b']);

  if (Math.random() < 0.5) return otherHalfQuestion(5, ['b', 'r']);

  const c = pick(LINE_CASES);
  const answer = c.mirror ? 'yes' : 'no';
  return {
    prompt: 'Is the dashed line a mirror line?',
    visual: <LineCasePicture c={c} />,
    choices: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    answer,
    hint: 'Imagine folding along the dashed line. Would the two halves sit exactly on top of each other?',
    explain: c.mirror
      ? [`Fold the ${c.shape} along the dashed line.`, 'The two halves match exactly.', 'So the answer is yes: it is a mirror line.']
      : [
          `Fold the ${c.shape} along the dashed line.`,
          c.shape === 'rectangle' ? 'The corners stick out: the halves do not match.' : 'One half is a different shape from the other.',
          'So the answer is no: it is not a mirror line.',
        ],
  };
}

export const symmetry: Lesson = {
  id: 'symmetry',
  title: 'Mirror Halves',
  Thumb,
  Scene: SymmetryScene,
  sceneHint: 'Colour the right side to match · Fold to check',
  learn: {
    heading: 'Mirror halves',
    intro: 'Some pictures are the same on both sides of a line, like a butterfly. We call it a mirror line: if you fold along it, both halves fit together exactly.',
    points: [
      { icon: Scissors, text: 'Fold along the mirror line and the halves match.' },
      { icon: Ruler, text: 'Each part has a partner the same distance from the line.' },
      { icon: Eraser, text: 'Check and fix: no squares should be left over.' },
    ],
  },
  steps: [
    'Find the mirror line.',
    'Look at a square next to the line. Colour its partner next to the line on the other side.',
    'Squares far from the line get partners far from the line.',
    'Fold to check that both halves match.',
  ],
  example: {
    question: 'Does this heart have a mirror line down the middle?',
    visual: <svg viewBox="-6 -6 112 112" role="img" aria-label="A heart with a line down the middle"><ShapeOutline id="heart" line="vertical" /></svg>,
    work: ['Fold the heart along the dashed line.', 'The left bump lands on the right bump.'],
    answer: 'Yes! The heart has a mirror line.',
  },
  grownups: [
    'Fold paper, paint on one half, and press it closed to make a symmetric butterfly.',
    'Hunt for mirror lines around you: faces, leaves, doors, letters like A and T.',
    'A common mix-up: a rectangle’s diagonal is NOT a mirror line. Try folding a paper rectangle corner to corner to see why.',
  ],
  makeQuestion,
};
