import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, BarChart3, Search, Timer } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Message } from '../engine';
import { mcq } from '../q';
import { BAR_COLOR, BarsPicture } from './visuals/bars';

type Mode = 'bubble' | 'selection';
const NAME: Record<Mode, string> = { bubble: 'Bubble sort', selection: 'Selection sort' };
const N = 6;

interface SortState {
  values: number[];
  comps: number;
  swaps: number;
  /** Bubble sort: which pass, the left index of the pair being compared, and whether this pass swapped. */
  pass: number;
  j: number;
  swapped: boolean;
  /** Selection sort: how many bars at the front are already sorted. */
  i: number;
  done: boolean;
  /** Bubble sort stopped early (a pass with no swaps). */
  early: boolean;
}

const fresh = (values: number[]): SortState => ({ values: [...values], comps: 0, swaps: 0, pass: 0, j: 0, swapped: false, i: 0, done: false, early: false });
const newBars = () => {
  for (;;) {
    const v = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, N);
    // Muddled enough that both sorts have real work to do.
    const outOfOrder = v.reduce((n, x, i) => n + v.slice(i + 1).filter((y) => y < x).length, 0);
    if (outOfOrder >= 5) return v;
  }
};

/** One bubble-sort comparison, swapping if the left bar is bigger. Returns the new state and what happened. */
function bubbleStep(s: SortState): { next: SortState; event: 'swap' | 'keep'; passEnd: boolean; early: boolean } {
  const v = [...s.values];
  const swap = v[s.j] > v[s.j + 1];
  if (swap) [v[s.j], v[s.j + 1]] = [v[s.j + 1], v[s.j]];
  let next: SortState = { ...s, values: v, comps: s.comps + 1, swaps: s.swaps + (swap ? 1 : 0), j: s.j + 1, swapped: s.swapped || swap };
  let passEnd = false;
  let early = false;
  if (next.j >= N - 1 - s.pass) {
    passEnd = true;
    early = !next.swapped;
    const pass = s.pass + 1;
    next = { ...next, pass, j: 0, swapped: false, done: early || pass >= N - 1, early };
  }
  return { next, event: swap ? 'swap' : 'keep', passEnd, early };
}

/** One selection-sort round: find the smallest unsorted bar (n − 1 − i comparisons) and swap it to the front. */
function selectionStep(s: SortState): SortState {
  const v = [...s.values];
  let k = s.i;
  for (let m = s.i + 1; m < N; m++) if (v[m] < v[k]) k = m;
  if (k !== s.i) [v[s.i], v[k]] = [v[k], v[s.i]];
  const i = s.i + 1;
  return { ...s, values: v, comps: s.comps + (N - 1 - s.i), swaps: s.swaps + (k !== s.i ? 1 : 0), i, done: i >= N - 1 };
}

const smallestAt = (s: SortState) => s.values.indexOf(Math.min(...s.values.slice(s.i)));

// ─────────────────────────── Scene ───────────────────────────

const BARS = { x: 40, slot: 110, w: 78, base: 384, unit: 30 };
const barX = (i: number) => BARS.x + i * BARS.slot + (BARS.slot - BARS.w) / 2;
const RX = 724;

function SortScene() {
  const [mode, setMode] = useState<Mode>('bubble');
  const [start, setStart] = useState<number[]>(newBars);
  const [s, setS] = useState<SortState>(() => fresh(start));
  const [results, setResults] = useState<Partial<Record<Mode, { comps: number; swaps: number }>>>({});
  const [note, setNote] = useState<{ tone: 'info' | 'good' | 'oops'; text: string } | null>(null);
  const [auto, setAuto] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const finish = (next: SortState) => {
    play('complete');
    setResults((r) => ({ ...r, [mode]: { comps: next.comps, swaps: next.swaps } }));
  };

  /** Apply the correct next step (the child's choice, once checked, or "do it for me"). */
  const advance = (cur: SortState): SortState => {
    if (cur.done) return cur;
    if (mode === 'bubble') {
      const { next, event, passEnd } = bubbleStep(cur);
      play(event === 'swap' ? 'whoosh' : 'tap');
      if (next.done) setNote(null);
      else if (passEnd) setNote({ tone: 'info', text: `End of pass ${cur.pass + 1}: the biggest unsorted bar has bubbled to the end. Start again from the left.` });
      else setNote(null);
      if (next.done) finish(next);
      return next;
    }
    const next = selectionStep(cur);
    play('whoosh');
    setNote(null);
    if (next.done) finish(next);
    return next;
  };
  const apply = () => setS((cur) => advance(cur));

  const decide = (swap: boolean) => {
    if (s.done || auto) return;
    const [a, b] = [s.values[s.j], s.values[s.j + 1]];
    if (swap !== a > b) {
      play('wrong');
      setNote({ tone: 'oops', text: `Not quite: ${a} is ${a > b ? 'bigger' : 'smaller'} than ${b}, so ${a > b ? 'they swap' : 'they stay where they are'}. The bigger one should move right.` });
      return;
    }
    apply();
  };
  const choose = (k: number) => {
    if (mode !== 'selection' || s.done || auto || k < s.i) return;
    const m = smallestAt(s);
    if (k !== m) {
      play('wrong');
      setNote({ tone: 'oops', text: `Look again: ${s.values[m]} is smaller than ${s.values[k]}. Check every bar that isn’t green yet.` });
      return;
    }
    apply();
  };
  const runAll = () => {
    if (s.done) return;
    setAuto(true);
    let cur = s;
    const tick = () => {
      cur = advance(cur);
      setS(cur);
      if (cur.done) setAuto(false);
      else timer.current = window.setTimeout(tick, 520);
    };
    timer.current = window.setTimeout(tick, 200);
  };
  const reset = (values: number[], m: Mode = mode) => {
    window.clearTimeout(timer.current);
    setAuto(false);
    setMode(m);
    setS(fresh(values));
    setNote(null);
  };

  const sortedFrom = mode === 'bubble' ? (s.done ? 0 : N - s.pass) : N;
  const isSorted = (i: number) => s.done || (mode === 'bubble' ? i >= sortedFrom : i < s.i);
  const pair = mode === 'bubble' && !s.done ? [s.j, s.j + 1] : [];
  const other: Mode = mode === 'bubble' ? 'selection' : 'bubble';

  let msg = note;
  if (!msg) {
    if (s.done) {
      const r = results[other];
      const stop = s.early ? 'No swaps in the last pass, so bubble sort stopped early. ' : '';
      msg = r
        ? { tone: 'good', text: `${stop}${NAME[mode]}: ${s.comps} comparisons, ${s.swaps} swaps. ${NAME[other]}: ${r.comps} comparisons, ${r.swaps} swaps. Which did less work here?` }
        : { tone: 'good', text: `${stop}Sorted with ${s.comps} comparisons and ${s.swaps} swaps. Now try ${NAME[other]} on the same bars: will it need more or fewer?` };
    } else if (mode === 'bubble')
      msg = { tone: 'info', text: `Pass ${s.pass + 1}: compare the two yellow bars. If the left one is bigger, swap them.` };
    else msg = { tone: 'info', text: `Round ${s.i + 1}: tap the smallest bar that isn’t green yet. It will swap to the front of the unsorted part.` };
  }

  return (
    <SceneSvg label="Sorting algorithms: sort the bars with bubble sort or selection sort and count the comparisons">
      <SvgButton x={40} y={20} w={180} h={52} fontSize={19} label="Bubble sort" active={mode === 'bubble'} color={mode === 'bubble' ? shade(C.yellow, 0.4) : C.card} onClick={() => mode !== 'bubble' && reset(start, 'bubble')} disabled={auto} />
      <SvgButton x={232} y={20} w={190} h={52} fontSize={19} label="Selection sort" active={mode === 'selection'} color={mode === 'selection' ? shade(C.yellow, 0.4) : C.card} onClick={() => mode !== 'selection' && reset(start, 'selection')} disabled={auto} />

      {/* Bars: keyed by value so a swap slides them across */}
      <line x1={BARS.x} y1={BARS.base} x2={BARS.x + N * BARS.slot} y2={BARS.base} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {s.values.map((v, i) => {
        const h = v * BARS.unit;
        const hot = pair.includes(i);
        const green = isSorted(i);
        const tappable = mode === 'selection' && !s.done && i >= s.i && !auto;
        return (
          <g
            key={v}
            style={{ transform: `translate(${barX(i)}px, 0px)`, transition: 'transform 0.35s ease', cursor: tappable ? 'pointer' : 'default' }}
            onClick={tappable ? () => choose(i) : undefined}
            role={tappable ? 'button' : undefined}
            aria-label={`Bar ${v}`}
            data-nopan
          >
            {hot && <rect x={-8} y={BARS.base - h - 44} width={BARS.w + 16} height={h + 52} rx={14} fill={C.yellow} opacity={0.45} />}
            <rect x={0} y={BARS.base - h} width={BARS.w} height={h} rx={10} fill={hot ? C.yellow : green ? C.green : BAR_COLOR} stroke={C.ink} strokeWidth={2.5} />
            <text x={BARS.w / 2} y={BARS.base - h - 16} textAnchor="middle" fontSize={26} fontWeight={800} fill={C.ink} className="num">
              {v}
            </text>
          </g>
        );
      })}
      {pair.length > 0 && (
        <g>
          <path
            d={`M${barX(pair[0]) + BARS.w / 2},${BARS.base + 12} v12 H${barX(pair[1]) + BARS.w / 2} v-12`}
            fill="none"
            stroke={C.ink}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x={(barX(pair[0]) + barX(pair[1])) / 2 + BARS.w / 2} y={BARS.base + 46} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
            compare
          </text>
        </g>
      )}

      {/* The child's move */}
      {mode === 'bubble' && !s.done && (
        <g>
          <text x={40} y={460} dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
            Is {s.values[s.j]} bigger than {s.values[s.j + 1]}?
          </text>
          <SvgButton x={290} y={432} w={130} h={56} fontSize={19} label="Swap" onClick={() => decide(true)} disabled={auto} color={shade(C.yellow, 0.5)} />
          <SvgButton x={432} y={432} w={130} h={56} fontSize={19} label="Leave" onClick={() => decide(false)} disabled={auto} />
        </g>
      )}
      {!s.done && (
        <SvgButton x={mode === 'bubble' ? 574 : 40} y={432} w={mode === 'bubble' ? 126 : 200} h={56} fontSize={17} label={mode === 'bubble' ? 'Show me' : 'Show me a round'} onClick={() => !auto && apply()} disabled={auto} title="Do the next step for me" />
      )}
      <Message x={40} y={510} w={660} tone={msg.tone} text={msg.text} />

      {/* Counters and results */}
      <rect x={RX} y={90} width={236} height={150} rx={16} fill="white" stroke={C.ink} strokeWidth={2} />
      {[
        { label: 'Comparisons', value: s.comps, y: 128 },
        { label: 'Swaps', value: s.swaps, y: 196 },
      ].map((c) => (
        <g key={c.label}>
          <text x={RX + 18} y={c.y} dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink2}>
            {c.label}
          </text>
          <text x={RX + 214} y={c.y} textAnchor="end" dominantBaseline="central" fontSize={34} fontWeight={800} fill={C.ink} className="num">
            {c.value}
          </text>
        </g>
      ))}
      <text x={RX} y={276} fontSize={15} fontWeight={700} fill={C.muted} className="caps">
        Results on these bars
      </text>
      {(['bubble', 'selection'] as Mode[]).map((m, k) => {
        const r = results[m];
        const y = 290 + k * 74;
        return (
          <g key={m}>
            <rect x={RX} y={y} width={236} height={64} rx={12} fill={r ? shade(C.green, 0.82) : 'white'} stroke={C.ink} strokeWidth={2} />
            <text x={RX + 14} y={y + 22} dominantBaseline="central" fontSize={17} fontWeight={800} fill={C.ink}>
              {NAME[m]}
            </text>
            <text x={RX + 14} y={y + 46} dominantBaseline="central" fontSize={16} fill={r ? C.ink : C.muted}>
              {r ? `${r.comps} comparisons · ${r.swaps} swaps` : 'not tried yet'}
            </text>
          </g>
        );
      })}
      <SvgButton x={RX} y={448} w={236} h={52} fontSize={18} label="Watch it finish" onClick={runAll} disabled={auto || s.done} />
      <SvgButton x={RX} y={512} w={236} h={52} fontSize={18} label="Same bars again" onClick={() => reset(start)} disabled={auto} />
      <SvgButton
        x={RX}
        y={576}
        w={236}
        h={52}
        fontSize={18}
        label="New bars"
        onClick={() => {
          const v = newBars();
          setStart(v);
          setResults({});
          reset(v);
        }}
        disabled={auto}
      />
      <Callout
        at={[RX + 118, 90]}
        box={[RX - 10, 4]}
        w={250}
        icon={Timer}
        title="Count the work"
        text="Computers sort millions of things. Fewer comparisons and swaps means a faster sort. Try both sorts on the same bars and compare."
      />
    </SceneSvg>
  );
}

function Thumb() {
  const v = [3, 5, 2, 6, 4];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {v.map((h, i) => (
        <rect key={i} x={10 + i * 21} y={70 - h * 10} width={16} height={h * 10} rx={3} fill={i === 1 || i === 2 ? C.yellow : BAR_COLOR} stroke={C.ink} strokeWidth={1.4} />
      ))}
      <path d="M41,10 q10,-8 20,0" fill="none" stroke={C.ink} strokeWidth={2} />
      <path d="M57,6 l4,4 l-5,2" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

const list = (v: number[]) => v.join(', ');
const distinct = (n: number) => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n);

/** L0: bubble sort compares two neighbours. Swap or not? */
function swapOrNot(): Question {
  const [a, b] = distinct(2);
  const answer = a > b ? 'Swap' : 'Don’t swap';
  return mcq({
    prompt: `Bubble sort compares ${a} and ${b} (${a} is on the left). What does it do?`,
    visual: <BarsPicture values={[a, b]} mark={[0, 1]} />,
    answer,
    wrong: [a > b ? 'Don’t swap' : 'Swap'],
    hint: 'Bubble sort wants the bigger number on the right.',
    explain: ['Bubble sort swaps two neighbours when the left one is bigger.', `${a} is ${a > b ? 'bigger' : 'smaller'} than ${b}.`, `So the answer is: ${answer}.`],
  });
}

/** L0: selection sort picks the smallest first. */
function firstPick(): Question {
  const v = distinct(5);
  const m = Math.min(...v);
  return mcq({
    prompt: 'Selection sort looks for the smallest bar and moves it to the front. Which bar does it pick first?',
    visual: <BarsPicture values={v} />,
    answer: String(m),
    wrong: shuffle(v.filter((x) => x !== m)).slice(0, 3).map(String),
    hint: 'Compare the bars one by one and remember the smallest so far.',
    explain: [`Go along the bars: ${list(v)}.`, `The smallest is ${m}.`, `So selection sort picks ${m} first.`],
  });
}

/** One pass of bubble sort, with each step written out. */
function onePass(v: number[]): { out: number[]; steps: string[] } {
  const a = [...v];
  const steps: string[] = [];
  for (let j = 0; j < a.length - 1; j++) {
    if (a[j] > a[j + 1]) {
      [a[j], a[j + 1]] = [a[j + 1], a[j]];
      steps.push(list(a));
    }
  }
  return { out: a, steps };
}

/** L1: the list after one pass of bubble sort. */
function afterPass(): Question {
  for (;;) {
    const v = distinct(rand(4, 5));
    const { out, steps } = onePass(v);
    const sorted = [...v].sort((x, y) => x - y);
    const firstSwap = [...v];
    const j = firstSwap.findIndex((x, i) => i < v.length - 1 && x > v[i + 1]);
    if (j < 0) continue;
    [firstSwap[j], firstSwap[j + 1]] = [firstSwap[j + 1], firstSwap[j]];
    const wrong = [...new Set([list(sorted), list(firstSwap), list([...v].reverse()), list(onePass(out).out)])].filter((x) => x !== list(out)).slice(0, 3);
    if (wrong.length < 2 || steps.length < 2) continue;
    return mcq({
      prompt: `Bubble sort makes one pass over ${list(v)}. What is the list after the pass?`,
      visual: <BarsPicture values={v} />,
      answer: list(out),
      wrong,
      hint: 'Go from left to right, comparing neighbours. Swap them whenever the left one is bigger, then move one place along.',
      explain: [
        `Compare neighbours from the left, swapping when the left one is bigger: ${list(v)} → ${steps.join(' → ')}.`,
        `The biggest number, ${Math.max(...v)}, has bubbled to the end.`,
        `After one pass the list is ${list(out)}.`,
      ],
    });
  }
}

/** L1: the list after some rounds of selection sort. */
function afterRounds(): Question {
  for (;;) {
    const v = distinct(5);
    const k = rand(1, 2);
    const states: number[][] = [];
    const a = [...v];
    for (let i = 0; i < k; i++) {
      let m = i;
      for (let x = i + 1; x < a.length; x++) if (a[x] < a[m]) m = x;
      [a[i], a[m]] = [a[m], a[i]];
      states.push([...a]);
    }
    const answer = list(a);
    const sorted = [...v].sort((x, y) => x - y);
    const wrong = [...new Set([list(sorted), list(states[0]), list(onePass(v).out), list([...a.slice(0, k), ...a.slice(k).reverse()])])].filter((x) => x !== answer).slice(0, 3);
    if (wrong.length < 2 || sorted.join() === a.join()) continue;
    return mcq({
      prompt: `Selection sort does ${k} round${k > 1 ? 's' : ''} on ${list(v)}. What is the list now?`,
      visual: <BarsPicture values={v} />,
      answer,
      wrong,
      hint: 'Each round: find the smallest number not yet sorted, and swap it into the next place at the front.',
      explain: [
        `Each round swaps the smallest unsorted number to the front of the unsorted part.`,
        `${list(v)} → ${states.map(list).join(' → ')}.`,
        `After ${k} round${k > 1 ? 's' : ''} the list is ${answer}.`,
      ],
    });
  }
}

/** L2: counting comparisons. */
function countComps(): Question {
  const n = rand(4, 9);
  const kind = pick(['selection', 'sorted-bubble'] as const);
  if (kind === 'selection') {
    const terms = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
    const total = (n * (n - 1)) / 2;
    return {
      prompt: `How many comparisons does selection sort make to sort ${n} numbers?`,
      visual: <BarsPicture values={distinct(Math.min(n, 9))} />,
      choices: numberChoices(total, { count: 4, min: 3, max: 50, spread: 4 }).map((value) => ({ value })),
      answer: String(total),
      hint: 'Round 1 compares the first number with all the others. How many compares does each round need?',
      explain: [`Round 1 makes ${n - 1} comparisons, round 2 makes ${n - 2}, and so on down to 1.`, `${terms.join(' + ')} = ${total}.`, `So selection sort makes ${total} comparisons.`],
    };
  }
  const v = Array.from({ length: n }, (_, i) => i + 1);
  return {
    prompt: `Bubble sort (stopping early when a pass has no swaps) sorts ${list(v)}, which is already in order. How many comparisons does it make?`,
    visual: <BarsPicture values={v} />,
    choices: numberChoices(n - 1, { count: 4, min: 1, max: 40, spread: 3 }).map((value) => ({ value })),
    answer: String(n - 1),
    hint: 'How many neighbour pairs does one pass check? Does anything get swapped?',
    explain: [`One pass compares each neighbour pair: ${n} numbers have ${n - 1} pairs.`, 'No pair is out of order, so there are no swaps and bubble sort stops after one pass.', `So it makes ${n - 1} comparisons.`],
  };
}

/** L2: how many swaps does bubble sort make? (One per pair that is out of order.) */
function countSwaps(): Question {
  for (;;) {
    const v = distinct(4);
    const pairs: string[] = [];
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] > v[j]) pairs.push(`${v[i]} before ${v[j]}`);
    if (pairs.length < 2 || pairs.length > 5) continue;
    return {
      prompt: `How many swaps does bubble sort make to sort ${list(v)}?`,
      visual: <BarsPicture values={v} />,
      choices: numberChoices(pairs.length, { count: 4, min: 0, max: 6, spread: 2 }).map((value) => ({ value })),
      answer: String(pairs.length),
      hint: 'Each bubble-sort swap fixes exactly one pair that is in the wrong order. Count those pairs.',
      explain: [`Find the pairs in the wrong order: ${pairs.join(', ')}.`, 'Each swap of neighbours fixes exactly one of those pairs.', `So bubble sort makes ${pairs.length} swaps.`],
    };
  }
}

function makeQuestion(level: number): Question {
  if (level <= 0) return Math.random() < 0.6 ? swapOrNot() : firstPick();
  if (level === 1) return Math.random() < 0.55 ? afterPass() : afterRounds();
  return Math.random() < 0.55 ? countComps() : countSwaps();
}

export const sortingAlgorithms: Lesson = {
  id: 'sorting-algorithms',
  title: 'Sorting Algorithms',
  Thumb,
  Scene: SortScene,
  sceneHint: 'Swap or leave each pair (bubble) · Tap the smallest bar (selection) · Compare the counts',
  learn: {
    heading: 'Step-by-step ways to sort',
    intro: 'An algorithm is a step-by-step method. Sorting algorithms put things in order, like scores from lowest to highest. Different algorithms get the same answer, but some take fewer steps.',
    points: [
      { icon: ArrowLeftRight, text: 'Bubble sort: compare neighbours and swap if the left is bigger. Big numbers bubble to the end.' },
      { icon: Search, text: 'Selection sort: find the smallest, swap it to the front, repeat with the rest.' },
      { icon: BarChart3, text: 'Count comparisons and swaps to see how much work an algorithm does.' },
      { icon: Timer, text: 'Selection sort always makes the same number of comparisons; bubble sort can stop early if nothing swaps.' },
    ],
  },
  steps: [
    'Bubble sort: compare the first two bars. Swap them if the left one is bigger.',
    'Move one place right and compare again, to the end of the list. That is one pass.',
    'Repeat passes until a pass makes no swaps.',
    'Then try selection sort on the same bars and compare the counts.',
  ],
  example: {
    question: 'Do one pass of bubble sort on 4, 1, 3, 2.',
    visual: <BarsPicture values={[4, 1, 3, 2]} />,
    work: ['4 > 1, swap: 1, 4, 3, 2.', '4 > 3, swap: 1, 3, 4, 2.', '4 > 2, swap: 1, 3, 2, 4. The 4 has bubbled to the end.'],
    answer: '1, 3, 2, 4 after one pass (3 comparisons, 3 swaps)',
  },
  grownups: [
    'Sort real things together: books by height, cards by number. Take turns being the “computer” who can only compare two items at a time.',
    'Counting comparisons is how computer scientists measure speed. For 6 items selection sort always needs 15 comparisons; bubble sort needs up to 15, fewer if the list is nearly sorted.',
    'Faster sorts exist (merge sort, quicksort). Older children can look them up and compare.',
  ],
  makeQuestion,
};
