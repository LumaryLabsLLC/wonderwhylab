import { useState } from 'react';
import { Equal, Package, Replace, Scissors } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

/** "n", "3n" — a number of n's. */
const ns = (k: number) => (k === 1 ? 'n' : `${k}n`);

/** Bags and loose marbles as an expression: 3n + 2. */
export function bagExpr(bags: number, loose: number): string {
  if (!bags) return String(loose);
  return loose ? `${ns(bags)} + ${loose}` : ns(bags);
}

// ───────────────────────── pictures ─────────────────────────

function Bag({ x, y, open, n, s = 1 }: { x: number; y: number; open: boolean; n: number; s?: number }) {
  const w = 90 * s;
  const h = 110 * s;
  const body = `M${x + w * 0.33},${y + h * 0.12} L${x + w * 0.67},${y + h * 0.12} L${x + w * 0.62},${y + h * 0.26} C${x + w * 1.05},${y + h * 0.4} ${x + w * 1.05},${y + h} ${x + w / 2},${y + h} C${x - w * 0.05},${y + h} ${x - w * 0.05},${y + h * 0.4} ${x + w * 0.38},${y + h * 0.26} Z`;
  return (
    <g>
      <path d={body} fill={open ? shade(C.brown, 0.75) : shade(C.brown, 0.35)} stroke={C.ink} strokeWidth={2 * s} strokeLinejoin="round" />
      <rect x={x + w * 0.34} y={y + h * 0.2} width={w * 0.32} height={h * 0.07} rx={3 * s} fill={C.red} stroke={C.ink} strokeWidth={1.5 * s} />
      {open ? (
        Array.from({ length: n }, (_, i) => {
          // Up to 5 per row, each row centred in the bag.
          const row = Math.floor(i / 5);
          const inRow = Math.min(5, n - row * 5);
          return <circle key={i} cx={x + w / 2 + ((i % 5) - (inRow - 1) / 2) * 13 * s} cy={y + h * 0.66 + row * 15 * s} r={6 * s} fill={C.blue} stroke={C.ink} strokeWidth={1.2 * s} />;
        })
      ) : (
        <text x={x + w / 2} y={y + h * 0.64} textAnchor="middle" dominantBaseline="central" fontSize={34 * s} fontWeight={700} fontStyle="italic" fill={C.ink}>
          n
        </text>
      )}
    </g>
  );
}

const Marble = ({ cx, cy, r = 15 }: { cx: number; cy: number; r?: number }) => <circle cx={cx} cy={cy} r={r} fill={C.blue} stroke={C.ink} strokeWidth={2} />;

function BagsPicture({ bags, loose }: { bags: number; loose: number }) {
  const w = bags * 52 + loose * 22 + 20;
  return (
    <svg viewBox={`0 0 ${Math.max(160, w)} 80`} aria-hidden>
      {Array.from({ length: bags }, (_, i) => (
        <Bag key={i} x={10 + i * 52} y={10} open={false} n={0} s={0.55} />
      ))}
      {Array.from({ length: loose }, (_, i) => (
        <Marble key={i} cx={bags * 52 + 22 + i * 22} cy={50} r={9} />
      ))}
    </svg>
  );
}

// ───────────────────────── scene ─────────────────────────

type Mode = 'bags' | 'tiles';

function Stepper({ y, label, name = label.toLowerCase(), value, set, min, max }: { y: number; label: string; name?: string; value: number; set: (v: number) => void; min: number; max: number }) {
  return (
    <g>
      <text x={640} y={y + 25} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        {label}
      </text>
      <SvgButton x={790} y={y} w={52} h={50} label="−" title={`Take one from ${name}`} onClick={() => set(value - 1)} disabled={value <= min} />
      <text x={878} y={y + 25} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
        {value}
      </text>
      <SvgButton x={912} y={y} w={52} h={50} label="+" title={`Add one to ${name}`} onClick={() => set(value + 1)} disabled={value >= max} color={C.yellow} />
    </g>
  );
}

function ExpressionsScene() {
  const [mode, setMode] = useState<Mode>('bags');
  const [bags, setBags] = useState(3);
  const [loose, setLoose] = useState(2);
  const [n, setN] = useState(4);
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [split, setSplit] = useState(false);
  const [tn, setTn] = useState(4);

  const change = (set: (v: number) => void) => (v: number) => {
    set(v);
    play('pop');
  };
  const toggleOpen = () => {
    setOpen(!open);
    play('whoosh');
  };
  const toggleSplit = () => {
    setSplit(!split);
    play('whoosh');
  };

  const modeBtn = (m: Mode, label: string, x: number, w: number) => (
    <SvgButton x={x} y={24} w={w} h={48} fontSize={18} label={label} active={mode === m} color={mode === m ? C.yellow : C.card} onClick={() => setMode(m)} />
  );

  return (
    <SceneSvg label="Expressions: bags of n marbles and area tiles">
      {modeBtn('bags', 'Bags of marbles', 60, 200)}
      {modeBtn('tiles', 'Area tiles', 272, 150)}
      {mode === 'bags' ? (
        <BagsView {...{ bags, loose, n, open }} setBags={change(setBags)} setLoose={change(setLoose)} setN={change(setN)} toggle={toggleOpen} />
      ) : (
        <TilesView {...{ a, b, split }} n={tn} setA={change(setA)} setB={change(setB)} setN={change(setTn)} toggle={toggleSplit} />
      )}
    </SceneSvg>
  );
}

function BagsView({
  bags,
  loose,
  n,
  open,
  setBags,
  setLoose,
  setN,
  toggle,
}: {
  bags: number;
  loose: number;
  n: number;
  open: boolean;
  setBags: (v: number) => void;
  setLoose: (v: number) => void;
  setN: (v: number) => void;
  toggle: () => void;
}) {
  const expr = bagExpr(bags, loose);
  const total = bags * n + loose;
  return (
    <g>
      {Array.from({ length: bags }, (_, i) => (
        <g key={i} className="bounce-in">
          <Bag x={70 + i * 104} y={110} open={open} n={n} />
        </g>
      ))}
      {bags === 0 && (
        <text x={70} y={170} fontSize={18} fill={C.muted}>
          No bags: add some with the + button.
        </text>
      )}
      <text x={70} y={268} fontSize={15} fill={C.muted} className="caps">
        Loose marbles
      </text>
      {Array.from({ length: loose }, (_, i) => (
        <g key={i} className="bounce-in">
          <Marble cx={88 + i * 40} cy={304} />
        </g>
      ))}

      <Stepper y={100} label="Bags" value={bags} set={setBags} min={0} max={5} />
      <Stepper y={166} label="Marbles" value={loose} set={setLoose} min={0} max={9} />
      <rect x={640} y={236} width={324} height={86} rx={16} fill={shade(C.yellow, 0.7)} stroke={C.ink} strokeWidth={2} />
      <text x={802} y={280} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={700} fill={C.ink} className="num">
        {expr}
      </text>
      <Stepper y={344} label="n =" name="n" value={n} set={setN} min={1} max={10} />
      <SvgButton x={640} y={412} w={324} h={52} fontSize={18} label={open ? 'Close the bags' : 'Open the bags'} onClick={toggle} />

      <rect x={60} y={500} width={904} height={150} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {open ? (
        <g>
          <text x={80} y={540} fontSize={16} fill={C.muted} className="caps">
            Every bag holds n = {n} marbles
          </text>
          <text x={80} y={584} fontSize={28} fontWeight={700} fill={C.ink} className="num">
            {bags ? `${expr} = ${bags === 1 ? n : `${bags} × ${n}`}${loose ? ` + ${loose}` : ''} = ${total}` : `${expr} = ${total}`}
          </text>
          <text x={80} y={626} fontSize={17} fill={C.ink2}>
            Count them to check: {total} {total === 1 ? 'marble' : 'marbles'} in all.
          </text>
        </g>
      ) : (
        <g>
          <text x={80} y={540} fontSize={16} fill={C.muted} className="caps">
            The bags are closed
          </text>
          <text x={80} y={580} fontSize={20} fill={C.ink}>
            Every bag holds the same number of marbles. We call it <tspan fontWeight={700}>n</tspan>.
          </text>
          <text x={80} y={616} fontSize={20} fill={C.ink}>
            {bags ? `${bags} ${bags === 1 ? 'bag' : 'bags'} make ${ns(bags)}` : 'No bags'}
            {loose ? `, and ${loose} loose ${loose === 1 ? 'marble' : 'marbles'} make + ${loose}.` : '.'}
          </text>
        </g>
      )}
      <Callout at={[640, 300]} box={[300, 420]} w={290} icon={Package} title="n is a mystery number" text="A letter stands for a number we don't know yet. Each bag holds n, so 3 bags hold 3n." />
    </g>
  );
}

const T = { x: 84, y: 150, u: 42, row: 42, gap: 48 };

function TilesView({
  a,
  b,
  n,
  split,
  setA,
  setB,
  setN,
  toggle,
}: {
  a: number;
  b: number;
  n: number;
  split: boolean;
  setA: (v: number) => void;
  setB: (v: number) => void;
  setN: (v: number) => void;
  toggle: () => void;
}) {
  const barW = n * T.u;
  const shift = split ? T.gap : 0;
  const onesX = T.x + barW + shift;
  const h = a * T.row;
  return (
    <g>
      {/* Labels round the rectangle: a down the side, n + b along the top. */}
      <text x={T.x - 26} y={T.y + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
        {a}
      </text>
      <text x={T.x + barW / 2} y={T.y - 22} textAnchor="middle" fontSize={26} fontWeight={700} fontStyle="italic" fill={shade(C.purple, -0.2)}>
        n
      </text>
      <text x={onesX + (b * T.u) / 2} y={T.y - 22} textAnchor="middle" fontSize={26} fontWeight={700} fill={shade(C.orange, -0.3)} className="num">
        {b}
      </text>
      {!split && (
        <text x={T.x + barW} y={T.y - 22} textAnchor="middle" fontSize={22} fill={C.muted}>
          +
        </text>
      )}

      {Array.from({ length: a }, (_, r) => (
        <g key={r}>
          <rect x={T.x} y={T.y + r * T.row} width={barW} height={T.row} rx={6} fill={shade(C.purple, 0.55)} stroke={C.ink} strokeWidth={2} />
          {Array.from({ length: n - 1 }, (_, k) => (
            <line key={k} x1={T.x + (k + 1) * T.u} y1={T.y + r * T.row + 8} x2={T.x + (k + 1) * T.u} y2={T.y + (r + 1) * T.row - 8} stroke={C.ink} strokeOpacity={0.15} strokeWidth={1.5} />
          ))}
          <text x={T.x + barW / 2} y={T.y + r * T.row + T.row / 2} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fontStyle="italic" fill={C.ink}>
            n
          </text>
          {Array.from({ length: b }, (_, k) => (
            <rect
              key={k}
              x={onesX + k * T.u}
              y={T.y + r * T.row}
              width={T.u}
              height={T.row}
              rx={4}
              fill={shade(C.orange, 0.45)}
              stroke={C.ink}
              strokeWidth={2}
              style={{ transition: 'x 0.4s ease' }}
            />
          ))}
        </g>
      ))}
      {split && (
        <g className="fade-in">
          <text x={T.x + barW / 2} y={T.y + h + 34} textAnchor="middle" fontSize={20} fontWeight={700} fill={shade(C.purple, -0.3)}>
            {a} × n = {ns(a)}
          </text>
          <text x={onesX + (b * T.u) / 2} y={T.y + h + 34} textAnchor="middle" fontSize={20} fontWeight={700} fill={shade(C.orange, -0.4)}>
            {a} × {b} = {a * b}
          </text>
        </g>
      )}

      <Stepper y={100} label="Rows" value={a} set={setA} min={2} max={5} />
      <Stepper y={166} label="Ones" value={b} set={setB} min={1} max={5} />
      <Stepper y={232} label="n =" name="n" value={n} set={setN} min={1} max={6} />
      <SvgButton x={640} y={304} w={324} h={52} fontSize={18} label={split ? 'Put it back together' : 'Split it in two'} onClick={toggle} color={C.yellow} />

      <rect x={60} y={500} width={904} height={150} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={80} y={548} fontSize={34} fontWeight={700} fill={C.ink} className="num">
        {a}(n + {b}){split ? ` = ${ns(a)} + ${a * b}` : ''}
      </text>
      <text x={80} y={592} fontSize={18} fill={C.ink2}>
        {split ? `Check with n = ${n}: ${a} × (${n} + ${b}) = ${a * (n + b)}  and  ${a} × ${n} + ${a * b} = ${a * (n + b)}.` : `${a} rows of (n + ${b}). Split the rectangle to write it another way.`}
      </text>
      <text x={80} y={626} fontSize={17} fill={C.muted}>
        {split ? 'Change n: both sides always match. They are equivalent expressions.' : 'The whole rectangle is a × (n + b) tiles.'}
      </text>
      <Callout at={[onesX + b * T.u, T.y + h]} box={[640, 380]} w={324} icon={Scissors} title="Same area, two ways" text="Count the rectangle in one go, a(n + b), or in two parts, an + ab. Same tiles, same number." />
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Bag x={6} y={14} open={false} n={0} s={0.42} />
      <Bag x={44} y={14} open={false} n={0} s={0.42} />
      <Marble cx={92} cy={50} r={8} />
      <Marble cx={110} cy={50} r={8} />
      <text x={60} y={74} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink}>
        2n + 2
      </text>
    </svg>
  );
}

// ───────────────────────── practice ─────────────────────────

function choicesOf(right: string, wrong: string[]) {
  const set = [...new Set(wrong.filter((w) => w !== right))];
  return shuffle([right, ...shuffle(set).slice(0, 3)]).map((value) => ({ value }));
}

function pictureQ(): Question {
  const bags = rand(1, 4);
  const loose = rand(1, 5);
  const right = bagExpr(bags, loose);
  return {
    prompt: 'Each bag holds n marbles. Which expression matches the picture?',
    visual: <BagsPicture bags={bags} loose={loose} />,
    choices: choicesOf(right, [bagExpr(loose, bags), `n + ${bags + loose}`, ns(bags + loose), `${bags + loose}`]),
    answer: right,
    hint: 'Count the bags (each one is n), then count the loose marbles.',
    explain: [`${bags} ${bags === 1 ? 'bag makes' : 'bags make'} ${ns(bags)}.`, `${loose} loose ${loose === 1 ? 'marble adds' : 'marbles add'} ${loose}.`, `So the picture shows ${right}.`],
  };
}

function substituteQ(hard: boolean): Question {
  const n = rand(2, hard ? 12 : 6);
  if (!hard) {
    const k = rand(2, 6);
    const c = rand(1, 9);
    const ans = k * n + c;
    return {
      prompt: `If n = ${n}, what is ${ns(k)} + ${c}?`,
      answer: String(ans),
      hint: `${ns(k)} means ${k} × n. Put ${n} in place of n.`,
      explain: [`${ns(k)} means ${k} × n = ${k} × ${n} = ${k * n}.`, `${k * n} + ${c} = ${ans}.`],
    };
  }
  if (Math.random() < 0.5) {
    const k = rand(3, 9);
    const c = rand(1, Math.min(9, k * n - 1));
    const ans = k * n - c;
    return {
      prompt: `If n = ${n}, what is ${ns(k)} − ${c}?`,
      answer: String(ans),
      hint: 'Multiply first, then take away.',
      explain: [`${ns(k)} = ${k} × ${n} = ${k * n}.`, `${k * n} − ${c} = ${ans}.`],
    };
  }
  const k = rand(2, 5);
  const c = rand(1, 6);
  const ans = k * (n + c);
  return {
    prompt: `If n = ${n}, what is ${k}(n + ${c})?`,
    answer: String(ans),
    hint: 'Work out the brackets first, then multiply.',
    explain: [`n + ${c} = ${n} + ${c} = ${n + c}.`, `${k}(n + ${c}) = ${k} × ${n + c} = ${ans}.`],
  };
}

function wordsQ(): Question {
  const a = rand(2, 9);
  const b = rand(2, 9);
  const forms: [string, string, string[], string][] = [
    [`${a} more than n`, `n + ${a}`, [ns(a), `n − ${a}`, `${a} − n`], `"More than" means add ${a} to n.`],
    [`n take away ${a}`, `n − ${a}`, [`${a} − n`, ns(a), `n + ${a}`], `Start with n and take ${a} away.`],
    [`${a} times n, then add ${b}`, `${ns(a)} + ${b}`, [`${a}(n + ${b})`, `${ns(b)} + ${a}`, `n + ${a + b}`], `${a} times n is ${ns(a)}; then add ${b}.`],
    [`${a} times n, then take away ${b}`, `${ns(a)} − ${b}`, [`${a}(n − ${b})`, `${b} − ${ns(a)}`, `n − ${a * b}`], `${a} times n is ${ns(a)}; then take away ${b}.`],
    [`add ${b} to n, then multiply by ${a}`, `${a}(n + ${b})`, [`${ns(a)} + ${b}`, `${ns(b)} + ${a}`, `n + ${a * b}`], `The adding happens first, so it goes in brackets: (n + ${b}), then × ${a}.`],
  ];
  const [words, right, wrong, why] = pick(forms);
  return {
    prompt: `Which expression means "${words}"?`,
    choices: choicesOf(right, wrong),
    answer: right,
    hint: 'Read it in order. What happens to n first?',
    explain: [why, `So "${words}" is ${right}.`],
  };
}

function equivalentQ(): Question {
  const a = rand(2, 6);
  const b = rand(2, 9);
  if (Math.random() < 0.5) {
    const minus = Math.random() < 0.35;
    const s = minus ? '−' : '+';
    const right = `${ns(a)} ${s} ${a * b}`;
    return {
      prompt: `Which expression is the same as ${a}(n ${s} ${b})?`,
      choices: choicesOf(right, [`${ns(a)} ${s} ${b}`, `${ns(a)} ${s} ${a + b}`, `n ${s} ${a * b}`, `${ns(a)} ${minus ? '+' : '−'} ${a * b}`]),
      answer: right,
      hint: `Multiply everything inside the brackets by ${a}.`,
      explain: [`${a} × n = ${ns(a)}.`, `${a} × ${b} = ${a * b}.`, `So ${a}(n ${s} ${b}) = ${right}.`],
    };
  }
  const right = `${a}(n + ${b})`;
  return {
    prompt: `Which expression is the same as ${ns(a)} + ${a * b}?`,
    choices: choicesOf(right, [`${a}(n + ${a * b})`, `n(${a} + ${a * b})`, `${a * b}(n + ${a})`, `${a}(n + ${a * b - b})`]),
    answer: right,
    hint: `What number goes into both ${ns(a)} and ${a * b}?`,
    explain: [`Both parts are multiples of ${a}: ${ns(a)} = ${a} × n and ${a * b} = ${a} × ${b}.`, `Take the ${a} outside the brackets.`, `So ${ns(a)} + ${a * b} = ${right}.`],
  };
}

function simplifyQ(): Question {
  const a = rand(2, 6);
  const b = rand(2, 6);
  if (Math.random() < 0.5) {
    const c = rand(1, 9);
    const right = `${ns(a + b)} + ${c}`;
    return {
      prompt: `Simplify ${ns(a)} + ${ns(b)} + ${c}.`,
      choices: choicesOf(right, [ns(a + b + c), `${ns(a * b)} + ${c}`, ns(a + b), `${ns(a + b + 1)} + ${c}`]),
      answer: right,
      hint: 'Put the n terms together. Plain numbers stay separate.',
      explain: [`${ns(a)} + ${ns(b)} = ${ns(a + b)}, like ${a} bags plus ${b} bags.`, `The ${c} has no n, so it stays as it is.`, `So the answer is ${right}.`],
    };
  }
  const c = rand(1, 9);
  const d = rand(1, 9);
  const right = `${ns(a + b)} + ${c + d}`;
  return {
    prompt: `Simplify ${ns(a)} + ${c} + ${ns(b)} + ${d}.`,
    choices: choicesOf(right, [ns(a + b + c + d), `${ns(a + b + c + d)} + ${c + d}`, `${ns(a + b)} + ${c * d}`, `${ns(c + d)} + ${a + b}`]),
    answer: right,
    hint: 'Collect the n terms, then collect the plain numbers.',
    explain: [`n terms: ${ns(a)} + ${ns(b)} = ${ns(a + b)}.`, `Numbers: ${c} + ${d} = ${c + d}.`, `So the answer is ${right}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([pictureQ, () => substituteQ(false)])();
  if (level === 1) return pick([wordsQ, () => substituteQ(true)])();
  return pick([equivalentQ, simplifyQ])();
}

export const expressions: Lesson = {
  id: 'expressions',
  title: 'Expressions and Variables',
  Thumb,
  Scene: ExpressionsScene,
  sceneHint: 'Build 3n + 2 with bags · Split the area tiles',
  learn: {
    heading: 'Expressions and variables',
    intro: 'A variable is a letter that stands for a number. An expression like 3n + 2 is a recipe: once you know n, you can work out its value.',
    points: [
      { icon: Package, text: 'Think of n as a bag with an unknown number inside. 3n means 3 bags: 3 × n.' },
      { icon: Replace, text: 'Substitute: put a number in place of n, then calculate.' },
      { icon: Scissors, text: '2(n + 3) is 2 lots of n + 3, which is 2n + 6.' },
      { icon: Equal, text: 'Equivalent expressions give the same value for every n.' },
    ],
  },
  steps: [
    'Write a number of n\'s with the number first: 3n means 3 × n.',
    'To substitute, replace n with its value and use the order of operations.',
    'To expand brackets, multiply every part inside by the number outside.',
    'To simplify, collect the n terms together and the plain numbers together.',
  ],
  example: {
    question: 'A bag holds n marbles. Write an expression for 3 bags and 2 loose marbles. What is it worth when n = 5?',
    visual: <BagsPicture bags={3} loose={2} />,
    work: ['3 bags make 3n, and 2 loose marbles add 2: 3n + 2.', 'When n = 5: 3 × 5 + 2 = 15 + 2 = 17.'],
    answer: '3n + 2, which is 17 when n = 5.',
  },
  grownups: [
    'A letter stands for a number, not an object: "3n" is not "3 nuts". The bags help because the letter is the number inside, which we don\'t know yet.',
    'A common slip: when n = 4, 3n is 12, not 34. Say "3 times n" aloud.',
    'Show equivalence by testing several values of n. If two expressions match for every n, they are equivalent.',
    'Expanding brackets with area tiles prepares for multiplying out (n + 2)(n + 3) later on.',
  ],
  makeQuestion,
};
