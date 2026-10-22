import { useState } from 'react';
import { Grid3x3, Rows3, Shuffle, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { ArrayPicture } from './visuals/ArrayPicture';

/** Every factor of n, smallest first. */
function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let f = 1; f <= n; f++) if (n % f === 0) out.push(f);
  return out;
}

/** Factor pairs a × b = n with a ≤ b. */
function factorPairs(n: number): [number, number][] {
  return factorsOf(n)
    .filter((f) => f * f <= n)
    .map((f) => [f, n / f] as [number, number]);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

const ARR = { x: 40, y: 112, w: 460, h: 300 };
const CHART = { x: 600, y: 150, cell: 34 };
const A_COLOR = C.blue;
const B_COLOR = C.orange;

function cellFor(n: number, cols: number) {
  return Math.min(ARR.w / cols, ARR.h / Math.ceil(n / cols), 46);
}

function FactorScene() {
  const [n, setN] = useState(12);
  const [cols, setCols] = useState(4);
  const [found, setFound] = useState<Set<number>>(() => new Set([3]));
  const [a, setA] = useState(4);
  const [b, setB] = useState(6);

  const c = clamp(cols, 1, n);
  const rows = Math.ceil(n / c);
  const cell = cellFor(n, c);
  const leftover = n % c;
  const isRect = leftover === 0;
  const pairs = factorPairs(n);

  const setColumns = (next: number) => {
    const v = clamp(next, 1, n);
    if (v === c) return;
    setCols(v);
    play('tap');
    if (n % v === 0) {
      const small = Math.min(v, n / v);
      if (!found.has(small)) {
        setFound(new Set([...found, small]));
        play('pop');
      }
    }
  };

  const changeN = (next: number) => {
    const v = clamp(next, 2, 36);
    setN(v);
    setFound(new Set());
    setCols(Math.min(c, v));
    play('pop');
  };

  // Drag the right edge of the array: pick the column count whose width is closest to the pointer.
  const drag = useSvgDrag((p) => {
    const want = p.x - ARR.x;
    let best = c;
    let bestGap = Infinity;
    for (let k = 1; k <= n; k++) {
      const gap = Math.abs(k * cellFor(n, k) - want);
      if (gap < bestGap) {
        bestGap = gap;
        best = k;
      }
    }
    setColumns(best);
  });

  const handleX = ARR.x + c * cell + 22;
  const handleY = ARR.y + Math.min(rows * cell, ARR.h) / 2;
  const allFound = pairs.every(([f]) => found.has(f));

  // Hundred chart
  const both = (k: number) => k % a === 0 && k % b === 0;
  const common = Array.from({ length: 100 }, (_, i) => i + 1).filter(both);

  return (
    <SceneSvg label={`${n} counters in rows of ${c}`}>
      {/* ── Factor rectangles ── */}
      <text x={ARR.x} y={56} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        Counters
      </text>
      <SvgButton x={140} y={30} w={52} h={50} label="−" title="Fewer counters" onClick={() => changeN(n - 1)} disabled={n <= 2} />
      <text x={226} y={56} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {n}
      </text>
      <SvgButton x={260} y={30} w={52} h={50} label="+" title="More counters" onClick={() => changeN(n + 1)} disabled={n >= 36} color={C.yellow} />
      <text x={330} y={44} fontSize={15} fill={C.muted} className="caps">
        In rows of
      </text>
      <SvgButton x={330} y={56} w={44} h={40} fontSize={22} label="−" title="Fewer in each row" onClick={() => setColumns(c - 1)} disabled={c <= 1} />
      <text x={402} y={77} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill={C.ink} className="num">
        {c}
      </text>
      <SvgButton x={430} y={56} w={44} h={40} fontSize={22} label="+" title="More in each row" onClick={() => setColumns(c + 1)} disabled={c >= n} color={C.yellow} />

      {Array.from({ length: n }, (_, i) => {
        const r = Math.floor(i / c);
        const col = i % c;
        const cx = ARR.x + col * cell + cell / 2;
        const cy = ARR.y + r * cell + cell / 2;
        const extra = !isRect && r === rows - 1;
        const color = extra ? C.red : shade(C.green, r % 2 ? 0.15 : 0);
        const rad = cell * 0.36;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy + 2} r={rad} fill={shade(color, -0.35)} />
            <circle cx={cx} cy={cy} r={rad} fill={color} stroke={C.ink} strokeWidth={1.8} strokeDasharray={extra ? '4 3' : undefined} />
          </g>
        );
      })}

      {/* drag the right edge to change the row length */}
      <g {...drag}>
        <rect x={handleX - 28} y={ARR.y - 10} width={56} height={Math.min(rows * cell, ARR.h) + 20} fill="transparent" />
        <line x1={handleX - 8} y1={ARR.y} x2={handleX - 8} y2={ARR.y + Math.min(rows * cell, ARR.h)} stroke={C.ink} strokeWidth={2} strokeDasharray="5 5" opacity={0.5} />
        <circle cx={handleX} cy={handleY} r={20} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
        <path d={`M${handleX - 10},${handleY} l6,-6 v12 z M${handleX + 10},${handleY} l-6,-6 v12 z`} fill={C.ink} />
      </g>

      <text x={ARR.x} y={446} fontSize={21} fontWeight={700} fill={isRect ? shade(C.green, -0.4) : shade(C.red, -0.25)}>
        {isRect ? `${rows} rows of ${c} = ${n}. A rectangle!` : `${rows - 1} rows of ${c}, and ${leftover} left over.`}
      </text>
      <text x={ARR.x} y={474} fontSize={17} fill={C.ink2}>
        {isRect ? `So ${Math.min(c, rows)} and ${Math.max(c, rows)} are a factor pair of ${n}.` : `${c} is not a factor of ${n}.`}
      </text>

      <text x={ARR.x} y={516} fontSize={16} fill={C.muted} className="caps">
        Factor pairs of {n} · {pairs.filter(([f]) => found.has(f)).length} of {pairs.length} found
      </text>
      {pairs.map(([f, g], i) => {
        const got = found.has(f);
        const x = ARR.x + (i % 5) * 92;
        const y = 530 + Math.floor(i / 5) * 46;
        return (
          <g key={f}>
            <rect x={x} y={y} width={84} height={38} rx={10} fill={got ? shade(C.green, 0.7) : C.card} stroke={got ? C.ink : C.line} strokeWidth={2} strokeDasharray={got ? undefined : '5 4'} />
            <text x={x + 42} y={y + 19} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={got ? C.ink : C.muted} className="num">
              {got ? `${f} × ${g}` : '? × ?'}
            </text>
          </g>
        );
      })}
      {allFound && (
        <text x={ARR.x} y={530 + Math.ceil(pairs.length / 5) * 46 + 18} fontSize={17} fontWeight={600} fill={C.ink}>
          {pairs.length === 1 ? `${n} only makes one rectangle: it is a prime number.` : `All the factors of ${n}: ${factorsOf(n).join(', ')}.`}
        </text>
      )}

      {/* ── Multiples on a hundred chart ── */}
      <text x={CHART.x} y={44} fontSize={16} fill={C.muted} className="caps">
        Multiples of
      </text>
      <SvgButton x={CHART.x} y={60} w={44} h={44} fontSize={22} label="−" title="Smaller blue number" onClick={() => setA(a - 1)} disabled={a <= 2} />
      <rect x={CHART.x + 52} y={62} width={52} height={40} rx={10} fill={A_COLOR} stroke={C.ink} strokeWidth={2} />
      <text x={CHART.x + 78} y={82} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.white} className="num">
        {a}
      </text>
      <SvgButton x={CHART.x + 112} y={60} w={44} h={44} fontSize={22} label="+" title="Bigger blue number" onClick={() => setA(a + 1)} disabled={a >= 10} color={C.yellow} />
      <text x={CHART.x + 186} y={82} textAnchor="middle" dominantBaseline="central" fontSize={18} fill={C.ink2}>
        and
      </text>
      <SvgButton x={CHART.x + 214} y={60} w={44} h={44} fontSize={22} label="−" title="Smaller orange number" onClick={() => setB(b - 1)} disabled={b <= 2} />
      <rect x={CHART.x + 266} y={62} width={52} height={40} rx={10} fill={B_COLOR} stroke={C.ink} strokeWidth={2} />
      <text x={CHART.x + 292} y={82} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.white} className="num">
        {b}
      </text>
      <SvgButton x={CHART.x + 326} y={60} w={44} h={44} fontSize={22} label="+" title="Bigger orange number" onClick={() => setB(b + 1)} disabled={b >= 10} color={C.yellow} />

      {Array.from({ length: 100 }, (_, i) => {
        const k = i + 1;
        const x = CHART.x + (i % 10) * CHART.cell;
        const y = CHART.y + Math.floor(i / 10) * CHART.cell;
        const inA = k % a === 0;
        const inB = k % b === 0;
        const fill = inA && inB ? C.purple : inA ? shade(A_COLOR, 0.35) : inB ? shade(B_COLOR, 0.35) : C.card;
        return (
          <g key={k}>
            <rect x={x} y={y} width={CHART.cell} height={CHART.cell} fill={fill} stroke={C.line} strokeWidth={1} />
            <text
              x={x + CHART.cell / 2}
              y={y + CHART.cell / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={15}
              fontWeight={inA && inB ? 700 : 500}
              fill={inA && inB ? C.white : C.ink}
              className="num"
            >
              {k}
            </text>
          </g>
        );
      })}
      <rect x={CHART.x} y={CHART.y} width={CHART.cell * 10} height={CHART.cell * 10} fill="none" stroke={C.ink} strokeWidth={2} />

      <text x={CHART.x} y={CHART.y + 366} fontSize={17} fontWeight={600} fill={C.ink}>
        {common.length ? `Common multiples: ${common.slice(0, 5).join(', ')}${common.length > 5 ? ', …' : ''}` : 'No common multiples up to 100.'}
      </text>
      {common.length > 0 && (
        <text x={CHART.x} y={CHART.y + 394} fontSize={17} fill={shade(C.purple, -0.3)} fontWeight={700}>
          Lowest common multiple of {a} and {b}: {lcm(a, b)}
        </text>
      )}

      <Callout at={[handleX, handleY]} box={[40, 612]} w={300} icon={Rows3} title="Make rectangles" text="Change how many go in each row. No leftovers means a factor pair." />
      <Callout at={[CHART.x + CHART.cell * 1.5, CHART.y + CHART.cell * 1.5]} box={[600, 606]} w={340} icon={Sparkles} title="Purple squares" text="They are multiples of both numbers: common multiples." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={14 + (i % 4) * 16} cy={18 + Math.floor(i / 4) * 16} r={6} fill={C.green} stroke={C.ink} strokeWidth={1.5} />
      ))}
      <text x={92} y={36} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
        3×4
      </text>
      <text x={92} y={56} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
        =12
      </text>
    </svg>
  );
}

const RICH = [12, 16, 18, 20, 24, 30, 36];

/** Level 0: spot a factor, or continue a run of multiples. */
function spotFactor(): Question {
  const n = pick(RICH);
  const inner = factorsOf(n).filter((f) => f !== 1 && f !== n);
  const f = pick(inner);
  const non = shuffle(Array.from({ length: n - 2 }, (_, i) => i + 2).filter((k) => n % k !== 0)).slice(0, 3);
  return {
    prompt: `Which number is a factor of ${n}?`,
    choices: shuffle([f, ...non]).map((v) => ({ value: String(v) })),
    answer: String(f),
    hint: 'A factor makes equal rows with nothing left over. Look at the picture.',
    explain: [`${n} counters fit in rows of ${f} with nothing left over.`, `${n / f} rows of ${f} = ${n}, or ${n} ÷ ${f} = ${n / f}.`, `So ${f} is a factor of ${n}.`],
  };
}

function nextMultiple(): Question {
  const k = rand(3, 9);
  const shown = rand(3, 4);
  const list = Array.from({ length: shown }, (_, i) => k * (i + 1));
  const ans = k * (shown + 1);
  return {
    prompt: `Count in ${k}s: ${list.join(', ')}, ?`,
    answer: String(ans),
    hint: `Each multiple is ${k} more than the one before.`,
    explain: [`These are the multiples of ${k}.`, `${list[list.length - 1]} + ${k} = ${ans}.`, `${shown + 1} × ${k} = ${ans}.`],
  };
}

function missingFactor(): Question {
  const x = rand(3, 9);
  const y = rand(3, 9);
  const n = x * y;
  return {
    prompt: `${x} × ? = ${n}`,
    visual: <ArrayPicture rows={x} cols={y} />,
    answer: String(y),
    hint: `How many in each of the ${x} rows? Think of your ${x} times table.`,
    explain: [`Share ${n} into ${x} equal rows.`, `${n} ÷ ${x} = ${y}.`, `So ${x} × ${y} = ${n}, and ${y} is the missing factor.`],
  };
}

function notAFactor(): Question {
  const n = pick([18, 20, 24, 30, 36]);
  const fs = shuffle(factorsOf(n).filter((f) => f !== 1 && f !== n)).slice(0, 3);
  const odd = pick(Array.from({ length: Math.min(n - 2, 12) }, (_, i) => i + 2).filter((k) => n % k !== 0));
  return {
    prompt: `Which is NOT a factor of ${n}?`,
    choices: shuffle([odd, ...fs]).map((v) => ({ value: String(v) })),
    answer: String(odd),
    hint: `Try making rows of each number with ${n} counters. Which one leaves some over?`,
    explain: [
      `${fs.map((f) => `${n} ÷ ${f} = ${n / f}`).join(', ')}: no leftovers.`,
      `${n} ÷ ${odd} = ${Math.floor(n / odd)} with ${n % odd} left over.`,
      `So ${odd} is not a factor of ${n}.`,
    ],
  };
}

function countPairs(): Question {
  const n = pick([12, 16, 18, 20, 24, 30, 36, 13, 17, 15]);
  const pairs = factorPairs(n);
  const ans = pairs.length;
  return {
    prompt: `How many factor pairs does ${n} have?`,
    choices: numberChoices(ans, { min: 1, max: 6, spread: 2 }).map((value) => ({ value })),
    answer: String(ans),
    hint: 'Start with 1 × the number, then try 2, 3, 4… until the pairs start to repeat.',
    explain: [`Try each number: ${pairs.map(([f, g]) => `${f} × ${g}`).join(', ')}.`, `After that the pairs just swap round.`, `So ${n} has ${ans} factor pair${ans === 1 ? '' : 's'}.`],
  };
}

function lowestCommon(): Question {
  let x = 0;
  let y = 0;
  do {
    x = rand(2, 10);
    y = rand(2, 10);
  } while (x === y || lcm(x, y) > 60 || lcm(x, y) === Math.max(x, y));
  const m = lcm(x, y);
  const listX = Array.from({ length: m / x }, (_, i) => x * (i + 1));
  return {
    prompt: `What is the lowest common multiple of ${x} and ${y}?`,
    answer: String(m),
    hint: `Count up in ${Math.max(x, y)}s and stop at the first number that is also in the ${Math.min(x, y)} times table.`,
    explain: [`Multiples of ${x}: ${listX.slice(-3).join(', ')}…`, `${m} is in the ${x} times table and the ${y} times table.`, `It is the first one in both, so the lowest common multiple is ${m}.`],
  };
}

function allFactorsList(): Question {
  const n = pick([12, 16, 18, 20, 24, 28, 30]);
  const fs = factorsOf(n);
  const right = fs.join(', ');
  const missing = fs.filter((_, i) => i !== Math.floor(fs.length / 2)).join(', ');
  const extraNum = pick(Array.from({ length: n - 2 }, (_, i) => i + 2).filter((k) => n % k !== 0));
  const extra = [...fs, extraNum].sort((p, q) => p - q).join(', ');
  const multiples = [1, 2, 3, 4].map((k) => n * k).join(', ');
  return {
    prompt: `Which list shows ALL the factors of ${n}?`,
    choices: shuffle([right, missing, extra, multiples]).map((value) => ({ value })),
    answer: right,
    hint: 'Find the factor pairs, then check every number divides with nothing left over.',
    explain: [`The factor pairs are ${factorPairs(n).map(([f, g]) => `${f} × ${g}`).join(', ')}.`, `Put every number from the pairs in order.`, `All the factors of ${n}: ${right}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([spotFactor, nextMultiple])();
  if (level === 1) return pick([missingFactor, notAFactor, countPairs])();
  return pick([lowestCommon, allFactorsList, countPairs])();
}

export const factorsAndMultiples: Lesson = {
  id: 'factors-and-multiples',
  title: 'Factors and Multiples',
  Thumb,
  Scene: FactorScene,
  sceneHint: 'Change the row length to find rectangles · Pick two numbers on the hundred chart',
  learn: {
    heading: 'Factors and multiples',
    intro: 'Factors are numbers that divide into a number with nothing left over. Multiples are what you get when you count in steps of a number.',
    points: [
      { icon: Grid3x3, text: 'If n counters make a rectangle with rows of k, then k is a factor of n.' },
      { icon: Shuffle, text: 'Factors come in pairs: 3 × 4 = 12, so 3 and 4 are a factor pair of 12.' },
      { icon: Sparkles, text: 'A number in both times tables is a common multiple.' },
    ],
  },
  steps: [
    'To find factors, try making equal rows: 1, 2, 3, 4…',
    'Each rectangle gives you a factor pair.',
    'Stop when the pairs start to repeat the other way round.',
    'To find multiples, count in steps: 4, 8, 12, 16…',
    'The first number in two lists is the lowest common multiple.',
  ],
  example: {
    question: 'What are the factors of 12?',
    visual: <ArrayPicture rows={3} cols={4} />,
    work: ['12 makes rectangles 1 × 12, 2 × 6 and 3 × 4.', '5 leaves some over, and 6 is already in a pair.'],
    answer: 'The factors of 12 are 1, 2, 3, 4, 6 and 12.',
  },
  grownups: [
    'Use real objects (pasta, coins) and ask “can you make equal rows with none left over?”',
    'Factors are always smaller than or equal to the number; multiples are equal or bigger. Mixing these up is very common.',
    'Times-table knowledge does most of the work here, so practise both directions: 6 × 4 = 24 and 24 ÷ 6 = 4.',
    'Common multiples come up later with fractions (finding a common denominator), so this pays off.',
  ],
  makeQuestion,
};
