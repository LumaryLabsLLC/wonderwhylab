import { useState } from 'react';
import { Filter, GitFork, Grid3x3, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';

// ───────────────────────── number helpers ─────────────────────────

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let k = 2; k * k <= n; k++) if (n % k === 0) return false;
  return true;
}

/** Factor pairs [a, b] with a ≤ b. */
export function factorPairs(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a * a <= n; a++) if (n % a === 0) out.push([a, n / a]);
  return out;
}

export function factors(n: number): number[] {
  const pairs = factorPairs(n);
  const set = new Set<number>();
  for (const [a, b] of pairs) {
    set.add(a);
    set.add(b);
  }
  return [...set].sort((x, y) => x - y);
}

/** Prime factors in order, e.g. 60 → [2, 2, 3, 5]. */
export function primeFactors(n: number): number[] {
  const out: number[] = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    while (m % p === 0) {
      out.push(p);
      m /= p;
    }
  }
  if (m > 1) out.push(m);
  return out;
}

const times = (list: number[]) => list.join(' × ');

// ───────────────────────── scene ─────────────────────────

type Mode = 'rect' | 'sieve' | 'tree';

const TILE_AREA = { x: 60, y: 108, w: 580, h: 440 };
const TREE_ROOTS = [36, 48, 60, 72, 84, 90, 100];

interface TreeNode {
  value: number;
  children: [number, number] | null;
}

function PrimeScene() {
  const [mode, setMode] = useState<Mode>('rect');

  // Rectangles mode
  const [n, setN] = useState(12);
  const [rows, setRows] = useState(2);
  // Row counts tried for each number of tiles.
  const [tried, setTried] = useState<Record<number, number[]>>({ 12: [2] });

  // Sieve mode
  const [circled, setCircled] = useState<number[]>([]);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());
  const [sieveMsg, setSieveMsg] = useState('Tap 2, the first prime. Its multiples get crossed out.');

  // Factor tree mode
  const [root, setRoot] = useState(60);
  const [tree, setTree] = useState<TreeNode[]>([{ value: 60, children: null }]);
  const [selected, setSelected] = useState(0);

  // ── rectangles ──
  const record = (count: number, r: number) => setTried((t) => ({ ...t, [count]: [...new Set([...(t[count] ?? []), r])] }));
  const changeTiles = (v: number) => {
    setN(v);
    setRows(1);
    record(v, 1);
    play('pop');
  };
  const changeRows = (r: number) => {
    setRows(r);
    record(n, r);
    if (n % r === 0) play('correct');
  };
  // Share the tiles out into `rows` rows; any left over make a ragged extra column.
  const perRow = Math.floor(n / rows);
  const leftover = n % rows;
  const fits = leftover === 0;
  const cols = perRow + (fits ? 0 : 1);
  const cell = Math.min(52, Math.floor(Math.min(TILE_AREA.w / cols, TILE_AREA.h / rows)));
  const gridW = cols * cell;
  const gridH = rows * cell;
  const gx = TILE_AREA.x + (TILE_AREA.w - gridW) / 2;
  const gy = TILE_AREA.y + (TILE_AREA.h - gridH) / 2;
  const triedHere = tried[n] ?? [];
  const allPairs = factorPairs(n).map(([a, b]) => `${a} × ${b}`);
  const foundHere = factorPairs(n)
    .filter(([a, b]) => triedHere.includes(a) || triedHere.includes(b))
    .map(([a, b]) => `${a} × ${b}`);
  // Past √n the row counts only turn earlier pairs around, so trying 1…√n settles it.
  const sqrtN = Math.floor(Math.sqrt(n));
  const complete = Array.from({ length: sqrtN }, (_, i) => i + 1).every((r) => triedHere.includes(r) || (n % r === 0 && triedHere.includes(n / r)));

  // ── sieve ──
  const nextPrime = (() => {
    for (let k = 2; k <= 100; k++) if (!crossed.has(k) && !circled.includes(k)) return k;
    return null;
  })();
  const sieveDone = nextPrime === null || nextPrime > 10;
  const tapSieve = (k: number) => {
    if (k === 1) {
      setSieveMsg('1 is special: it is not prime (it has only one factor).');
      return;
    }
    if (circled.includes(k)) return;
    if (crossed.has(k)) {
      setSieveMsg(`${k} is already crossed out: it is a multiple of a smaller prime.`);
      play('wrong');
      return;
    }
    if (k !== nextPrime) {
      setSieveMsg(`Not yet! Tap the smallest number that isn't crossed out: ${nextPrime}.`);
      play('wrong');
      return;
    }
    const next = new Set(crossed);
    for (let m = k * 2; m <= 100; m += k) next.add(m);
    setCrossed(next);
    setCircled([...circled, k]);
    play('pop');
    let after = k + 1;
    while (after <= 100 && next.has(after)) after++;
    setSieveMsg(
      after * after > 100
        ? `${k} is prime. Every number not crossed out is prime now, because ${after} × ${after} is more than 100.`
        : `${k} is prime. Its multiples (${k * 2}, ${k * 3}, ${k * 4}…) can't be prime, so they're crossed out.`,
    );
  };
  const circleRest = () => {
    const rest: number[] = [];
    for (let k = 2; k <= 100; k++) if (!crossed.has(k) && !circled.includes(k)) rest.push(k);
    setCircled([...circled, ...rest]);
    play('correct');
    setSieveMsg('There are 25 primes up to 100. Every one of them is circled.');
  };
  const resetSieve = () => {
    setCircled([]);
    setCrossed(new Set());
    setSieveMsg('Tap 2, the first prime. Its multiples get crossed out.');
    play('tap');
  };

  // ── factor tree ──
  const startTree = (v: number) => {
    setRoot(v);
    setTree([{ value: v, children: null }]);
    setSelected(0);
    play('pop');
  };
  const split = (a: number, b: number) => {
    const node = tree[selected];
    if (!node || node.children) return;
    const t = [...tree, { value: a, children: null }, { value: b, children: null }];
    const ia = t.length - 2;
    t[selected] = { ...node, children: [ia, ia + 1] };
    setTree(t);
    play('pop');
    const nextComposite = t.findIndex((x) => !x.children && !isPrime(x.value));
    setSelected(nextComposite);
  };
  const leaves = tree.filter((x) => !x.children).map((x) => x.value).sort((a, b) => a - b);
  const treeDone = leaves.every(isPrime);

  // Lay the tree out: each node gets a slot by its leaf order.
  const pos: Record<number, { x: number; y: number }> = {};
  let leafIndex = 0;
  const leafCount = leaves.length;
  const depthOf = (i: number, d: number): void => {
    const node = tree[i];
    if (!node.children) {
      pos[i] = { x: 0, y: d };
      pos[i].x = TILE_AREA.x + ((leafIndex + 0.5) / leafCount) * TILE_AREA.w;
      leafIndex++;
      return;
    }
    depthOf(node.children[0], d + 1);
    depthOf(node.children[1], d + 1);
    pos[i] = { x: (pos[node.children[0]].x + pos[node.children[1]].x) / 2, y: d };
  };
  depthOf(0, 0);
  const maxDepth = Math.max(...Object.values(pos).map((p) => p.y));
  const rowH = Math.min(96, 300 / Math.max(1, maxDepth));
  const nodeY = (d: number) => 150 + d * rowH;
  const sel = selected >= 0 ? tree[selected] : undefined;
  const splitOptions = sel && !sel.children && !isPrime(sel.value) ? factorPairs(sel.value).filter(([a]) => a > 1) : [];

  const modeBtn = (m: Mode, label: string, x: number, w: number) => (
    <SvgButton x={x} y={24} w={w} h={48} fontSize={18} label={label} active={mode === m} color={mode === m ? C.yellow : C.card} onClick={() => setMode(m)} />
  );

  return (
    <SceneSvg label="Prime numbers: rectangles, a sieve and factor trees">
      {modeBtn('rect', 'Rectangles', 60, 160)}
      {modeBtn('sieve', 'Sieve', 232, 110)}
      {modeBtn('tree', 'Factor tree', 354, 170)}

      {mode === 'rect' && (
        <g>
          <text x={TILE_AREA.x} y={100} fontSize={16} fill={C.muted} className="caps">
            {n} tiles in {rows} {rows === 1 ? 'row' : 'rows'}
          </text>
          {Array.from({ length: n }, (_, i) => {
            const extra = i >= rows * perRow;
            const r = extra ? i - rows * perRow : Math.floor(i / perRow);
            const c = extra ? perRow : i % perRow;
            return (
              <rect
                key={i}
                x={gx + c * cell + 2}
                y={gy + r * cell + 2}
                width={cell - 4}
                height={cell - 4}
                rx={Math.min(8, cell / 5)}
                fill={extra ? shade(C.red, 0.5) : C.blue}
                stroke={C.ink}
                strokeWidth={1.6}
              />
            );
          })}
          <text x={TILE_AREA.x + TILE_AREA.w / 2} y={TILE_AREA.y + TILE_AREA.h + 40} textAnchor="middle" fontSize={20} fontWeight={700} fill={fits ? shade(C.green, -0.3) : C.red}>
            {fits ? `A rectangle! ${rows} × ${n / rows} = ${n}` : `Not a rectangle: ${leftover} ${leftover === 1 ? 'tile is' : 'tiles are'} left over.`}
          </text>

          {[
            { label: 'Tiles', value: n, dec: () => changeTiles(n - 1), inc: () => changeTiles(n + 1), min: n <= 2, max: n >= 30 },
            { label: 'Rows', value: rows, dec: () => changeRows(rows - 1), inc: () => changeRows(rows + 1), min: rows <= 1, max: rows >= Math.min(n, 12) },
          ].map((row, i) => (
            <g key={row.label}>
              <text x={700} y={130 + i * 70} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
                {row.label}
              </text>
              <SvgButton x={790} y={104 + i * 70} w={52} h={50} label="−" title={`Fewer ${row.label.toLowerCase()}`} onClick={row.dec} disabled={row.min} />
              <text x={878} y={130 + i * 70} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
                {row.value}
              </text>
              <SvgButton x={912} y={104 + i * 70} w={52} h={50} label="+" title={`More ${row.label.toLowerCase()}`} onClick={row.inc} disabled={row.max} color={C.yellow} />
            </g>
          ))}

          <rect x={700} y={264} width={264} height={250} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
          <text x={716} y={292} fontSize={15} fill={C.muted} className="caps">
            Factor pairs of {n}
          </text>
          {allPairs.map((p, i) => (
            <text key={p} x={716} y={326 + i * 30} fontSize={20} fontWeight={700} fill={foundHere.includes(p) ? C.ink : C.line} className="num">
              {foundHere.includes(p) ? p : '? × ?'}
            </text>
          ))}
          {complete && (
            <g className="pop-in" style={{ transformOrigin: '832px 480px' }}>
              <rect x={712} y={454} width={240} height={50} rx={12} fill={isPrime(n) ? C.yellow : shade(C.blue, 0.75)} stroke={C.ink} strokeWidth={2} />
              <text x={832} y={479} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
                {isPrime(n) ? `${n} is PRIME` : `${n} has ${factors(n).length} factors`}
              </text>
            </g>
          )}
          <text x={700} y={548} fontSize={15} fill={C.ink2}>
            {complete ? `No need to try more than ${sqrtN} rows:` : 'Try every number of rows.'}
          </text>
          <text x={700} y={570} fontSize={15} fill={C.ink2}>
            {complete ? 'bigger ones just turn a pair around.' : ''}
          </text>

          <Callout at={[gx + gridW, gy]} box={[570, 28]} w={250} icon={Grid3x3} title="Prime = only 1 row" text="A prime number of tiles only makes one rectangle: a single row. Any other number of rows leaves tiles over." />
        </g>
      )}

      {mode === 'sieve' && (
        <g>
          {Array.from({ length: 100 }, (_, i) => {
            const k = i + 1;
            const x = 60 + (i % 10) * 50;
            const y = 100 + Math.floor(i / 10) * 46;
            const isC = circled.includes(k);
            const isX = crossed.has(k);
            return (
              <g key={k} onClick={() => tapSieve(k)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={String(k)}>
                <rect x={x} y={y} width={48} height={44} rx={8} fill={isC ? C.yellow : k === 1 ? C.line : isX ? shade(C.line, 0.4) : C.card} stroke={C.ink} strokeWidth={1.4} />
                <text x={x + 24} y={y + 23} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={isC ? 700 : 500} fill={isX ? C.muted : C.ink} className="num">
                  {k}
                </text>
                {isX && <line x1={x + 8} y1={y + 36} x2={x + 40} y2={y + 8} stroke={C.red} strokeWidth={2.2} strokeLinecap="round" />}
                {isC && <circle cx={x + 24} cy={y + 22} r={19} fill="none" stroke={C.ink} strokeWidth={2} />}
              </g>
            );
          })}
          <rect x={590} y={100} width={374} height={250} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
          <text x={606} y={128} fontSize={15} fill={C.muted} className="caps">
            Sieve of Eratosthenes
          </text>
          {wrap(sieveMsg, 34).map((line, i) => (
            <text key={i} x={606} y={162 + i * 26} fontSize={18} fill={C.ink}>
              {line}
            </text>
          ))}
          <text x={606} y={330} fontSize={17} fontWeight={700} fill={C.ink}>
            Primes circled: {circled.length}
          </text>
          {sieveDone && circled.length < 25 && <SvgButton x={590} y={370} w={220} h={52} fontSize={17} label="Circle the rest" onClick={circleRest} color={C.yellow} />}
          <SvgButton x={824} y={370} w={140} h={52} fontSize={17} label="Start again" onClick={resetSieve} />
          <Callout at={[560, 560]} box={[600, 560]} w={330} icon={Filter} title="Sift out the multiples" text="Circle the next prime and cross out its multiples. What's left over is prime." />
        </g>
      )}

      {mode === 'tree' && (
        <g>
          <text x={TILE_AREA.x} y={104} fontSize={16} fill={C.muted} className="caps">
            Pick a number
          </text>
          {TREE_ROOTS.map((v, i) => (
            <SvgButton key={v} x={60 + i * 80} y={112} w={70} h={44} fontSize={18} label={String(v)} active={root === v} color={root === v ? C.yellow : C.card} onClick={() => startTree(v)} />
          ))}
          <g transform="translate(0 70)">
            {tree.map((node, i) =>
              node.children
                ? node.children.map((c) => (
                    <line key={`${i}-${c}`} x1={pos[i].x} y1={nodeY(pos[i].y)} x2={pos[c].x} y2={nodeY(pos[c].y)} stroke={C.ink} strokeWidth={2.5} />
                  ))
                : null,
            )}
            {tree.map((node, i) => {
              const prime = isPrime(node.value);
              const isSel = i === selected;
              return (
                <g
                  key={i}
                  className="bounce-in"
                  onClick={() => {
                    if (node.children || prime) return;
                    setSelected(i);
                    play('tap');
                  }}
                  style={{ cursor: !node.children && !prime ? 'pointer' : 'default' }}
                  data-nopan
                  role={!node.children && !prime ? 'button' : undefined}
                  aria-label={`${node.value}${prime ? ', prime' : ''}`}
                >
                  <circle
                    cx={pos[i].x}
                    cy={nodeY(pos[i].y)}
                    r={28}
                    fill={prime ? C.yellow : isSel ? shade(C.blue, 0.6) : C.card}
                    stroke={isSel ? C.blue : C.ink}
                    strokeWidth={isSel ? 4 : 2.2}
                  />
                  <text x={pos[i].x} y={nodeY(pos[i].y)} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink} className="num">
                    {node.value}
                  </text>
                </g>
              );
            })}
          </g>

          <rect x={700} y={170} width={264} height={330} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
          {treeDone ? (
            <g>
              <text x={716} y={200} fontSize={15} fill={C.muted} className="caps">
                All branches are prime
              </text>
              {wrap(`${root} = ${times(leaves)}`, 18).map((line, i) => (
                <text key={i} x={716} y={240 + i * 32} fontSize={24} fontWeight={700} fill={C.ink} className="num">
                  {line}
                </text>
              ))}
              <text x={716} y={350} fontSize={16} fill={C.ink2}>
                Any tree for {root} ends
              </text>
              <text x={716} y={374} fontSize={16} fill={C.ink2}>
                with these same primes.
              </text>
              <SvgButton x={716} y={420} w={232} h={52} fontSize={17} label="Grow another tree" onClick={() => startTree(root)} color={C.yellow} />
            </g>
          ) : (
            <g>
              <text x={716} y={200} fontSize={15} fill={C.muted} className="caps">
                Split {sel?.value ?? ''} into
              </text>
              {splitOptions.slice(0, 5).map(([a, b], i) => (
                <SvgButton key={`${a}x${b}`} x={716} y={216 + i * 56} w={232} h={48} fontSize={19} label={`${a} × ${b}`} onClick={() => split(a, b)} />
              ))}
            </g>
          )}
          <Callout at={[pos[0].x + 28, nodeY(0) + 70]} box={[700, 560]} w={264} icon={GitFork} title="Branch until prime" text="Split any number that isn't prime. Yellow circles are primes: they can't split." />
        </g>
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={10 + (i % 4) * 14} y={14 + Math.floor(i / 4) * 14} width={12} height={12} rx={3} fill={C.blue} stroke={C.ink} strokeWidth={1} />
      ))}
      {[2, 3, 5, 7].map((p, i) => (
        <g key={p}>
          <circle cx={82 + (i % 2) * 22} cy={24 + Math.floor(i / 2) * 26} r={10} fill={C.yellow} stroke={C.ink} strokeWidth={1.4} />
          <text x={82 + (i % 2) * 22} y={25 + Math.floor(i / 2) * 26} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill={C.ink}>
            {p}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── practice ─────────────────────────

const PRIME_CHOICES = [
  { value: 'prime', label: 'Prime' },
  { value: 'not prime', label: 'Not prime' },
];

function isPrimeQ(lo: number, hi: number): Question {
  const n = Math.random() < 0.5 ? pick(range(lo, hi).filter(isPrime)) : pick(range(lo, hi).filter((k) => !isPrime(k)));
  const prime = isPrime(n);
  const pair = factorPairs(n).find(([a]) => a > 1);
  return {
    prompt: `Is ${n} a prime number?`,
    choices: PRIME_CHOICES,
    answer: prime ? 'prime' : 'not prime',
    hint: `Can ${n} tiles make a rectangle with more than one row?`,
    explain: prime
      ? [`The only factor pair of ${n} is 1 × ${n}.`, `${n} has exactly two factors: 1 and ${n}.`, `So ${n} is prime.`]
      : [`${n} = ${pair![0]} × ${pair![1]}.`, `So ${n} has more than two factors.`, `${n} is not prime.`],
  };
}

function countFactorsQ(): Question {
  const n = pick([6, 8, 10, 12, 15, 16, 18, 20, 24, 28, 30, 36]);
  const pairs = factorPairs(n);
  const list = factors(n);
  return {
    prompt: `How many factors does ${n} have?`,
    answer: String(list.length),
    hint: 'Find every factor pair: start at 1 × the number and work up.',
    explain: [`Factor pairs: ${pairs.map(([a, b]) => `${a} × ${b}`).join(', ')}.`, `The factors are ${list.join(', ')}.`, `That is ${list.length} factors.`],
  };
}

function whichPrimeQ(): Question {
  const primes = range(11, 59).filter(isPrime);
  const tricky = range(11, 59).filter((k) => !isPrime(k) && k % 2 === 1 && k % 5 !== 0);
  const p = pick(primes);
  const others = shuffle(tricky).slice(0, 3);
  const [a, b] = others;
  const pa = factorPairs(a).find(([x]) => x > 1)!;
  const pb = factorPairs(b).find(([x]) => x > 1)!;
  return {
    prompt: 'Which of these numbers is prime?',
    choices: shuffle([p, ...others]).map((v) => ({ value: String(v) })),
    answer: String(p),
    hint: 'Odd numbers can still have factors. Try dividing by 3, 7 and 11.',
    explain: [`${a} = ${pa[0]} × ${pa[1]} and ${b} = ${pb[0]} × ${pb[1]}, so they aren't prime.`, `${others[2]} also splits into a factor pair.`, `${p} only has 1 × ${p}, so ${p} is prime.`],
  };
}

function smallestPrimeFactorQ(): Question {
  const n = pick([21, 35, 39, 49, 51, 55, 57, 65, 77, 85, 87, 91, 95, 119, 121, 133, 143]);
  const p = primeFactors(n)[0];
  return {
    prompt: `What is the smallest prime factor of ${n}?`,
    answer: String(p),
    hint: 'Try the primes in order: 2, 3, 5, 7, 11…',
    explain: [`Try 2, 3, 5, …: the first prime that divides ${n} is ${p}.`, `${n} = ${p} × ${n / p}.`, `So the smallest prime factor is ${p}.`],
  };
}

const TREE_NUMBERS = [12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 66, 70, 72, 75, 84, 90, 96, 100];

function factorisationQ(): Question {
  const n = pick(TREE_NUMBERS);
  const pf = primeFactors(n);
  const right = times(pf);
  const pair = factorPairs(n).filter(([a]) => a > 1).find(([a, b]) => !isPrime(a) || !isPrime(b))!;
  const wrong = new Set<string>();
  wrong.add(`${pair[0]} × ${pair[1]}`);
  if (pf.length > 2) wrong.add(times(pf.slice(1)));
  wrong.add(times([...pf, pick([2, 3])].sort((a, b) => a - b)));
  const swapped = [...pf];
  swapped[swapped.length - 1] = swapped[swapped.length - 1] === 2 ? 3 : 2;
  wrong.add(times(swapped.sort((a, b) => a - b)));
  wrong.delete(right);
  const [a, b] = factorPairs(n).filter(([x]) => x > 1)[0];
  return {
    prompt: `Which is the prime factorisation of ${n}?`,
    choices: shuffle([right, ...shuffle([...wrong]).slice(0, 3)]).map((value) => ({ value })),
    answer: right,
    hint: 'Every number must be prime AND they must multiply back to the number.',
    explain: [`Split ${n} into a factor pair: ${n} = ${a} × ${b}.`, 'Keep splitting until every branch is prime.', `${n} = ${right}.`],
  };
}

function fromFactorsQ(): Question {
  const pf = pick([
    [2, 2, 3, 7],
    [2, 3, 3, 5],
    [2, 2, 2, 3, 3],
    [3, 5, 7],
    [2, 2, 5, 5],
    [2, 3, 11],
    [2, 2, 2, 7],
    [3, 3, 7],
  ]);
  const n = pf.reduce((a, b) => a * b, 1);
  const half = pf.slice(0, -1).reduce((a, b) => a * b, 1);
  return {
    prompt: `What number has the prime factorisation ${times(pf)}?`,
    answer: String(n),
    hint: 'Multiply the primes together, two at a time.',
    explain: [`${times(pf.slice(0, -1))} = ${half}.`, `${half} × ${pf[pf.length - 1]} = ${n}.`, `So the number is ${n}.`],
  };
}

function range(lo: number, hi: number): number[] {
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([() => isPrimeQ(2, 30), countFactorsQ])();
  if (level === 1) return pick([whichPrimeQ, smallestPrimeFactorQ, () => isPrimeQ(31, 99)])();
  return pick([factorisationQ, fromFactorsQ, smallestPrimeFactorQ])();
}

export const primes: Lesson = {
  id: 'primes',
  title: 'Prime Numbers',
  Thumb,
  Scene: PrimeScene,
  sceneHint: 'Make rectangles · Run the sieve · Grow a factor tree',
  learn: {
    heading: 'Prime numbers',
    intro: 'A prime number has exactly two factors: 1 and itself. Prime numbers are the building blocks of all whole numbers, because every number can be made by multiplying primes.',
    points: [
      { icon: Grid3x3, text: 'A prime number of tiles only makes one rectangle: a single row.' },
      { icon: Filter, text: 'Cross out multiples of each prime to find the rest (the sieve).' },
      { icon: GitFork, text: 'A factor tree splits a number until every branch is prime.' },
      { icon: Sparkles, text: '1 is not prime: it has only one factor.' },
    ],
  },
  steps: [
    'To test a number, look for a factor pair other than 1 × the number.',
    'Try dividing by the primes in order: 2, 3, 5, 7, 11…',
    'If none divide it before you pass its square root, it is prime.',
    'For a factor tree, split into any factor pair and keep going until every branch is prime.',
  ],
  example: {
    question: 'Is 51 prime? What is its prime factorisation?',
    work: ['51 is odd, so 2 does not divide it.', '5 + 1 = 6, which is a multiple of 3, so 3 divides 51: 51 = 3 × 17.', '17 is prime, so the tree stops.'],
    answer: '51 is not prime: 51 = 3 × 17.',
  },
  grownups: [
    'A common mix-up: odd does not mean prime. 9, 15, 21 and 27 are all odd but not prime.',
    'Another: 1 is not prime, because a prime needs exactly two different factors.',
    'Different factor trees for the same number always end with the same primes — this is called unique factorisation.',
    'Prime factors make later topics easier: simplifying fractions, common denominators and highest common factors.',
  ],
  makeQuestion,
};
