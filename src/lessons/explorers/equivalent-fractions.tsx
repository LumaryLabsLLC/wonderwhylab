import { useState } from 'react';
import { Equal, Ruler, Scissors } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

const BAR = { x: 60, y: 70, w: 540, h: 70 };
const LINE = { x: 60, y: 228, w: 540 };
const WALL = { x: 60, y: 318, w: 540, rowH: 38, gap: 8 };
const WALL_ROWS = [2, 3, 4, 6, 8, 12];
const MAX_PIECES = 12;
const ROW_NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'quarters', 6: 'sixths', 8: 'eighths', 12: 'twelfths' };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** A fraction strip: `n` equal pieces, the first `k` shaded. Drawn as a <g>. */
function Strip({ x, y, w, h, n, k, color = C.orange, dim = false }: { x: number; y: number; w: number; h: number; n: number; k: number; color?: string; dim?: boolean }) {
  const pw = w / n;
  return (
    <g opacity={dim ? 0.45 : 1}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * pw} y={y} width={pw} height={h} fill={i < k ? color : C.card} stroke={C.ink} strokeWidth={1.6} />
      ))}
      <rect x={x} y={y} width={w} height={h} rx={3} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

function FractionScene() {
  const [n, setN] = useState(2);
  const [k, setK] = useState(1);
  /** Fractions reached by cutting or joining, all equal in value. */
  const [chain, setChain] = useState<string[]>(['1/2']);

  const value = k / n;
  const markX = LINE.x + LINE.w * value;

  const setFraction = (nk: number, nn: number) => {
    setK(nk);
    setN(nn);
    setChain([`${nk}/${nn}`]);
    play('pop');
  };

  const regroup = (nk: number, nn: number) => {
    setK(nk);
    setN(nn);
    const f = `${nk}/${nn}`;
    setChain((c) => (c.includes(f) ? c : [...c, f]));
    play('pop');
  };

  const g = gcd(k, n);

  return (
    <SceneSvg label={`${k} out of ${n} equal pieces shaded`}>
      {/* the fraction bar you build */}
      <text x={BAR.x} y={BAR.y - 16} fontSize={16} fill={C.muted} className="caps">
        Your fraction bar
      </text>
      <Strip {...BAR} n={n} k={k} />

      {/* number line 0–1 */}
      <line x1={LINE.x} y1={LINE.y} x2={LINE.x + LINE.w} y2={LINE.y} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: n + 1 }, (_, i) => (
        <line key={i} x1={LINE.x + (LINE.w * i) / n} y1={LINE.y - 9} x2={LINE.x + (LINE.w * i) / n} y2={LINE.y + 9} stroke={C.ink} strokeWidth={2} />
      ))}
      <text x={LINE.x} y={LINE.y + 34} textAnchor="middle" fontSize={18} fill={C.ink} className="num">0</text>
      <text x={LINE.x + LINE.w} y={LINE.y + 34} textAnchor="middle" fontSize={18} fill={C.ink} className="num">1</text>
      <circle cx={markX} cy={LINE.y} r={10} fill={C.red} stroke={C.ink} strokeWidth={2} />
      {k > 0 && k < n && (
        <text x={markX} y={LINE.y - 22} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink} className="num">
          {k}/{n}
        </text>
      )}

      {/* fraction wall: rows that line up with the red line are equal */}
      <text x={WALL.x} y={WALL.y - 14} fontSize={16} fill={C.muted} className="caps">
        Fraction wall
      </text>
      {WALL_ROWS.map((d, i) => {
        const j = value * d;
        const exact = Math.abs(j - Math.round(j)) < 1e-9;
        const y = WALL.y + i * (WALL.rowH + WALL.gap);
        return (
          <g key={d}>
            <Strip x={WALL.x} y={y} w={WALL.w} h={WALL.rowH} n={d} k={exact ? Math.round(j) : 0} color={shade(C.green, 0.25)} dim={!exact} />
            <text x={WALL.x + WALL.w + 14} y={y + WALL.rowH / 2} dominantBaseline="central" fontSize={18} fontWeight={700} fill={exact ? C.ink : C.muted} className="num">
              {exact ? `= ${Math.round(j)}/${d}` : ROW_NAMES[d]}
            </text>
          </g>
        );
      })}
      {/* the value line through the wall */}
      <line x1={markX} y1={BAR.y + BAR.h + 6} x2={markX} y2={WALL.y + WALL_ROWS.length * (WALL.rowH + WALL.gap) - WALL.gap + 6} stroke={C.red} strokeWidth={2.5} strokeDasharray="7 6" />

      {chain.length > 1 && (
        <text x={WALL.x} y={WALL.y + WALL_ROWS.length * (WALL.rowH + WALL.gap) + 30} fontSize={22} fontWeight={700} fill={C.ink} className="num">
          {chain.join(' = ')}
        </text>
      )}

      {/* controls */}
      <rect x={744} y={30} width={200} height={146} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={844} y={72} textAnchor="middle" dominantBaseline="central" fontSize={50} fontWeight={700} fill={C.orange} className="num">{k}</text>
      <line x1={804} y1={104} x2={884} y2={104} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <text x={844} y={138} textAnchor="middle" dominantBaseline="central" fontSize={50} fontWeight={700} fill={C.ink} className="num">{n}</text>

      {[
        { label: 'Shaded', value: k, dec: () => setFraction(k - 1, n), inc: () => setFraction(k + 1, n), min: k <= 0, max: k >= n },
        { label: 'Pieces', value: n, dec: () => setFraction(Math.min(k, n - 1), n - 1), inc: () => setFraction(k, n + 1), min: n <= 2, max: n >= MAX_PIECES },
      ].map((row, i) => (
        <g key={row.label}>
          <text x={710} y={226 + i * 68} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">{row.label}</text>
          <SvgButton x={800} y={200 + i * 68} w={52} h={50} label="−" title={`Fewer ${row.label.toLowerCase()}`} onClick={row.dec} disabled={row.min} />
          <text x={886} y={226 + i * 68} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.ink} className="num">{row.value}</text>
          <SvgButton x={918} y={200 + i * 68} w={52} h={50} label="+" title={`More ${row.label.toLowerCase()}`} onClick={row.inc} disabled={row.max} color={C.yellow} />
        </g>
      ))}
      <SvgButton x={710} y={350} w={260} h={52} fontSize={18} label="Cut every piece in 2" onClick={() => regroup(k * 2, n * 2)} disabled={n * 2 > MAX_PIECES} color={C.teal} textColor={C.white} />
      <SvgButton x={710} y={416} w={260} h={52} fontSize={18} label="Cut every piece in 3" onClick={() => regroup(k * 3, n * 3)} disabled={n * 3 > MAX_PIECES} color={C.teal} textColor={C.white} />
      <SvgButton x={710} y={482} w={260} h={52} fontSize={18} label="Join to simplest" onClick={() => regroup(k / g, n / g)} disabled={g <= 1 || k === 0} />

      <Callout at={[840, 376]} box={[710, 556]} w={260} icon={Scissors} title="Cut the pieces smaller" text="Cutting every piece in 2 doubles the pieces AND the shaded ones. The amount stays the same." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Strip x={10} y={12} w={100} h={16} n={2} k={1} />
      <Strip x={10} y={34} w={100} h={16} n={4} k={2} color={shade(C.green, 0.25)} />
      <Strip x={10} y={56} w={100} h={16} n={8} k={4} color={shade(C.green, 0.25)} />
    </svg>
  );
}

/** Bars for question cards: one strip per fraction, all the same length. */
function BarsPicture({ fracs }: { fracs: [number, number][] }) {
  const h = 34;
  return (
    <svg viewBox={`-6 -6 ${412} ${fracs.length * (h + 12) + 4}`} role="img" aria-label={`Fraction bars: ${fracs.map(([a, b]) => `${a}/${b}`).join(', ')}`}>
      {fracs.map(([a, b], i) => (
        <Strip key={i} x={0} y={i * (h + 12)} w={400} h={h} n={b} k={a} color={i ? shade(C.green, 0.25) : C.orange} />
      ))}
    </svg>
  );
}

const BASES: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
  [1, 6],
  [5, 6],
];

/** Level 0–1: pick the equal fraction. Distractors use common mistakes (adding the same number, wrong top). */
function whichEqual(level: number): Question {
  const [a, b] = pick(level === 0 ? BASES.slice(0, 5) : BASES);
  const m = rand(2, b <= 3 ? 4 : 2);
  const right = `${a * m}/${b * m}`;
  const value = a / b;
  const candidates = [
    `${a + m}/${b + m}`,
    `${a * m}/${b * m + 1}`,
    `${a}/${b * m}`,
    `${a * m + 1}/${b * m}`,
    `${a * m}/${b}`,
    `${b - a}/${b}`,
  ];
  const wrong: string[] = [];
  for (const c of shuffle(candidates)) {
    const [p, q] = c.split('/').map(Number);
    if (q > 0 && p > 0 && p <= q && Math.abs(p / q - value) > 1e-9 && c !== right && !wrong.includes(c)) wrong.push(c);
    if (wrong.length === 3) break;
  }
  return {
    prompt: `Which fraction is the same as ${a}/${b}?`,
    visual: level === 0 ? <BarsPicture fracs={[[a, b]]} /> : undefined,
    choices: shuffle([right, ...wrong]).map((value) => ({ value })),
    answer: right,
    hint: 'Equal fractions come from cutting every piece the same way: multiply the top AND the bottom by the same number.',
    explain: [`Cut every piece of ${a}/${b} into ${m}.`, `There are ${b} × ${m} = ${b * m} pieces, and ${a} × ${m} = ${a * m} are shaded.`, `So ${a}/${b} = ${right}.`],
  };
}

/** Level 1: fill in the missing top number. */
function missingTop(): Question {
  const [a, b] = pick(BASES);
  const m = rand(2, b <= 4 ? 4 : 2);
  const big = b * m;
  return {
    prompt: `${a}/${b} = ?/${big}`,
    visual: <BarsPicture fracs={[[a, b], [0, big]]} />,
    answer: String(a * m),
    hint: `How many times bigger is ${big} than ${b}? Do the same to the top.`,
    explain: [`${big} = ${b} × ${m}, so every piece is cut into ${m}.`, `Multiply the top by ${m} too: ${a} × ${m} = ${a * m}.`, `${a}/${b} = ${a * m}/${big}.`],
  };
}

/** Level 2: simplify to a given denominator. */
function simplify(): Question {
  const [a, b] = pick(BASES);
  const m = rand(2, 4);
  return {
    prompt: `${a * m}/${b * m} = ?/${b}`,
    answer: String(a),
    hint: `How many times smaller is ${b} than ${b * m}? Divide the top the same way.`,
    explain: [`${b * m} ÷ ${m} = ${b}, so join the pieces in groups of ${m}.`, `Divide the top by ${m} too: ${a * m} ÷ ${m} = ${a}.`, `${a * m}/${b * m} = ${a}/${b}.`],
  };
}

/** Level 2: compare two fractions by making the pieces the same size. */
function compare(): Question {
  const pairs: [[number, number], [number, number]][] = [
    [[3, 4], [5, 8]],
    [[2, 3], [5, 6]],
    [[1, 2], [3, 8]],
    [[2, 5], [3, 10]],
    [[3, 4], [7, 12]],
    [[1, 3], [5, 12]],
    [[1, 2], [5, 8]],
    [[3, 5], [7, 10]],
    [[1, 4], [3, 12]],
    [[2, 3], [8, 12]],
  ];
  const [[a, b], [c, d]] = pick(pairs);
  const big = d; // d is always a multiple of b
  const m = big / b;
  const scaled = a * m;
  const first = `${a}/${b}`;
  const second = `${c}/${d}`;
  const same = 'They are equal';
  const answer = scaled === c ? same : scaled > c ? first : second;
  const result = scaled === c ? `${scaled}/${big} = ${c}/${d}, so they are equal.` : `${Math.max(scaled, c)}/${big} is more, so ${answer} is bigger.`;
  return {
    prompt: `Which is bigger: ${first} or ${second}?`,
    choices: shuffle([first, second]).concat(same).map((value) => ({ value })),
    answer,
    hint: `Make the pieces the same size: turn ${first} into ${big}ths.`,
    explain: [`Cut each piece of ${first} into ${m}: ${first} = ${scaled}/${big}.`, `Now compare ${scaled}/${big} with ${c}/${d}.`, result],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return whichEqual(0);
  if (level === 1) return Math.random() < 0.5 ? whichEqual(1) : missingTop();
  return pick([simplify, compare, compare, missingTop])();
}

export const equivalentFractions: Lesson = {
  id: 'equivalent-fractions',
  title: 'Equivalent Fractions',
  Thumb,
  Scene: FractionScene,
  sceneHint: 'Cut the pieces smaller · Watch which rows line up',
  learn: {
    heading: 'Equivalent fractions',
    intro: 'Equivalent fractions are different names for the same amount. Half a bar is the same as 2 quarters or 4 eighths: the pieces are just smaller.',
    points: [
      { icon: Scissors, text: 'Cut every piece in 2: there are twice as many pieces and twice as many shaded.' },
      { icon: Equal, text: 'Multiply (or divide) the top and bottom by the same number.' },
      { icon: Ruler, text: 'Equal fractions sit at the same spot on a number line.' },
    ],
  },
  steps: [
    'Look at how many times bigger the new bottom number is.',
    'Multiply the top number by the same amount.',
    'To compare, make both fractions have the same size pieces first.',
    'Check on the fraction wall: equal fractions line up.',
  ],
  example: {
    question: 'Fill in the gap: 3/4 = ?/8',
    visual: <BarsPicture fracs={[[3, 4], [6, 8]]} />,
    work: ['8 is 4 × 2, so cut every quarter into 2 pieces.', 'The 3 shaded quarters become 3 × 2 = 6 eighths.'],
    answer: '3/4 = 6/8',
  },
  grownups: [
    'Fold paper strips: fold in half, shade one half, then fold again. It is still half, now 2 out of 4.',
    'Avoid “add the same number to top and bottom” — 1/2 is not 2/3. Ask your child to check with a drawing.',
    'Pizza and chocolate are great: is 2 slices of an 8-slice pizza the same as 1 slice of a 4-slice pizza?',
    'Equivalent fractions are the key to adding fractions later on.',
  ],
  makeQuestion,
};
