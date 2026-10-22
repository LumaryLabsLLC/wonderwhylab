import { useState } from 'react';
import { ArrowRightLeft, Brackets, ListOrdered, Parentheses } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { useSvgDrag, type Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

// ───────────────────────── the calculation machine ─────────────────────────

export type Op = '+' | '−' | '×' | '÷';
export type Item = { t: 'n'; v: number } | { t: 'o'; v: Op } | { t: '(' } | { t: ')' };
type Bracket = [number, number] | null;

/** Numbers and operators, with brackets around numbers br[0]…br[1]. */
export function build(nums: number[], ops: Op[], br: Bracket = null): Item[] {
  const out: Item[] = [];
  nums.forEach((v, k) => {
    if (br && br[0] === k) out.push({ t: '(' });
    out.push({ t: 'n', v });
    if (br && br[1] === k) out.push({ t: ')' });
    if (k < ops.length) out.push({ t: 'o', v: ops[k] });
  });
  return out;
}

export function show(items: Item[]): string {
  let s = '';
  for (const it of items) {
    if (it.t === '(') s += (s ? ' ' : '') + '(';
    else if (it.t === ')') s += ')';
    else s += (s && !s.endsWith('(') ? ' ' : '') + (it.t === 'n' ? fmt(it.v) : it.v);
  }
  return s;
}

const isOp = (it: Item | undefined, ...ops: Op[]) => it?.t === 'o' && ops.includes(it.v);

/** Index of the operator to do next: inside brackets first, then × ÷, then + −, each left to right. */
function nextOp(items: Item[]): number {
  let lo = 0;
  let hi = items.length;
  const open = items.findIndex((it) => it.t === '(');
  if (open >= 0) {
    lo = open + 1;
    hi = items.findIndex((it) => it.t === ')');
  }
  for (let i = lo; i < hi; i++) if (isOp(items[i], '×', '÷')) return i;
  for (let i = lo; i < hi; i++) if (isOp(items[i], '+', '−')) return i;
  return -1;
}

type Rule = 'brackets' | 'times' | 'plus';
function ruleOf(items: Item[], at: number): Rule {
  const open = items.findIndex((it) => it.t === '(');
  if (open >= 0 && open < at) return 'brackets';
  return isOp(items[at], '×', '÷') ? 'times' : 'plus';
}

interface Run {
  lines: Item[][];
  /** For each line but the last: the operator done next. */
  at: number[];
  /** For each line after the first: where the new number landed. */
  landed: number[];
  error?: string;
}

export function solve(items: Item[]): Run {
  const run: Run = { lines: [items], at: [], landed: [] };
  let cur = items;
  for (let guard = 0; guard < 10; guard++) {
    const i = nextOp(cur);
    if (i < 0) break;
    const a = (cur[i - 1] as { v: number }).v;
    const b = (cur[i + 1] as { v: number }).v;
    const op = (cur[i] as { v: Op }).v;
    if (op === '÷' && (b === 0 || a % b !== 0)) {
      run.error = b === 0 ? `${fmt(a)} ÷ 0 can't be done.` : `${fmt(a)} ÷ ${fmt(b)} isn't a whole number.`;
      return run;
    }
    const r = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
    let next: Item[] = [...cur.slice(0, i - 1), { t: 'n', v: r }, ...cur.slice(i + 2)];
    let land = i - 1;
    if (next[land - 1]?.t === '(' && next[land + 1]?.t === ')') {
      next = [...next.slice(0, land - 1), next[land], ...next.slice(land + 2)];
      land -= 1;
    }
    run.at.push(i);
    run.landed.push(land);
    run.lines.push(next);
    cur = next;
  }
  return run;
}

export function valueOf(items: Item[]): number | null {
  const run = solve(items);
  if (run.error) return null;
  const last = run.lines[run.lines.length - 1];
  return last.length === 1 && last[0].t === 'n' ? last[0].v : null;
}

// ───────────────────────── scene ─────────────────────────

const PRESETS: { nums: number[]; ops: Op[] }[] = [
  { nums: [3, 4, 2], ops: ['+', '×'] },
  { nums: [20, 8, 2], ops: ['−', '÷'] },
  { nums: [2, 3, 4, 1], ops: ['+', '×', '−'] },
  { nums: [12, 3, 2], ops: ['÷', '×'] },
  { nums: [10, 3, 2], ops: ['−', '+'] },
  { nums: [4, 6, 2, 3], ops: ['+', '÷', '×'] },
  { nums: [5, 6, 4, 2], ops: ['×', '−', '×'] },
];

const TILE = { y: 108, h: 80, num: 80, op: 56, gap: 40 };
const TRAY = { y: 214, open: 452, close: 548 };
const PANEL = { x: 60, y: 316, w: 880, h: 348 };
const RULES: { key: Rule; label: string }[] = [
  { key: 'brackets', label: '1 · Brackets' },
  { key: 'times', label: '2 · × ÷ left to right' },
  { key: 'plus', label: '3 · + − left to right' },
];

function layout(n: number) {
  const step = TILE.num + TILE.gap * 2 + TILE.op;
  const total = n * TILE.num + (n - 1) * (step - TILE.num);
  const x0 = 500 - total / 2;
  const numX = (k: number) => x0 + k * step;
  return {
    numX,
    opX: (k: number) => numX(k) + TILE.num + TILE.gap,
    openX: (k: number) => numX(k) - TILE.gap / 2,
    closeX: (k: number) => numX(k) + TILE.num + TILE.gap / 2,
  };
}

/** Widths for drawing one line of working, item by item. */
function itemW(it: Item) {
  if (it.t === 'n') return fmt(it.v).length * 18 + 6;
  if (it.t === 'o') return 26;
  return 12;
}

function OrderScene() {
  const [preset, setPreset] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [close, setClose] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(1);
  const [drag, setDrag] = useState<{ which: 'open' | 'close'; p: Pt } | null>(null);

  const { nums, ops } = PRESETS[preset];
  const L = layout(nums.length);
  const both = open !== null && close !== null;
  const pairOk = both && open! < close!;
  const items = build(nums, ops, pairOk ? [open!, close!] : null);
  const run = solve(items);
  const done = !run.error && revealed >= run.lines.length;
  const nextAt = run.at[revealed - 1];
  const activeRule = !run.error && nextAt !== undefined ? ruleOf(run.lines[revealed - 1], nextAt) : null;

  const reset = () => setRevealed(1);
  const newExpression = () => {
    setPreset((preset + 1) % PRESETS.length);
    setOpen(null);
    setClose(null);
    reset();
    play('whoosh');
  };
  const removeBrackets = () => {
    setOpen(null);
    setClose(null);
    reset();
  };
  const step = () => {
    const r = revealed + 1;
    setRevealed(r);
    play(r >= run.lines.length ? 'correct' : 'pop');
  };

  const drop = (which: 'open' | 'close', p: Pt) => {
    const slots = nums.map((_, k) => ({ k, x: which === 'open' ? L.openX(k) : L.closeX(k) }));
    const best = slots.reduce((m, s) => (Math.abs(s.x - p.x) < Math.abs(m.x - p.x) ? s : m), slots[0]);
    const near = Math.abs(best.x - p.x) < 70 && Math.abs(p.y - (TILE.y + TILE.h / 2)) < 90;
    (which === 'open' ? setOpen : setClose)(near ? best.k : null);
    reset();
    play(near ? 'pop' : 'tap');
  };

  const openDrag = useSvgDrag((p) => setDrag({ which: 'open', p }), { onEnd: () => drag && drop('open', drag.p) });
  const closeDrag = useSvgDrag((p) => setDrag({ which: 'close', p }), { onEnd: () => drag && drop('close', drag.p) });

  const bracketAt = (which: 'open' | 'close') => {
    if (drag?.which === which) return { x: drag.p.x, y: drag.p.y };
    const k = which === 'open' ? open : close;
    if (k === null) return { x: which === 'open' ? TRAY.open : TRAY.close, y: TRAY.y + 40 };
    return { x: which === 'open' ? L.openX(k) : L.closeX(k), y: TILE.y + TILE.h / 2 };
  };

  const glyph = (which: 'open' | 'close') => {
    const { x, y } = bracketAt(which);
    const handlers = which === 'open' ? openDrag : closeDrag;
    const placed = (which === 'open' ? open : close) !== null;
    const bad = both && !pairOk && placed;
    return (
      <g
        {...handlers}
        onPointerUp={(e) => {
          handlers.onPointerUp(e);
          setDrag(null);
        }}
        role="button"
        aria-label={which === 'open' ? 'Open bracket' : 'Close bracket'}
      >
        <rect x={x - 24} y={y - 46} width={48} height={92} rx={12} fill={placed ? 'transparent' : shade(C.blue, 0.8)} stroke={placed ? 'none' : C.ink} strokeWidth={2} />
        <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="central" fontSize={78} fontWeight={700} fill={bad ? C.red : shade(C.blue, -0.3)}>
          {which === 'open' ? '(' : ')'}
        </text>
      </g>
    );
  };

  const lineY = (k: number) => PANEL.y + 104 + k * 54;
  const drawLine = (line: Item[], k: number) => {
    const widths = line.map(itemW);
    const xs: number[] = [];
    let x = PANEL.x + 64;
    line.forEach((it, i) => {
      xs.push(x);
      const tight = it.t === '(' || line[i + 1]?.t === ')';
      x += widths[i] + (tight ? 2 : 14);
    });
    const at = k < revealed - 1 || (k === revealed - 1 && !done) ? run.at[k] : undefined;
    const current = k === revealed - 1 && !done;
    const landed = k > 0 ? run.landed[k - 1] : -1;
    return (
      <g key={k} className="fade-in">
        {at !== undefined && (
          <rect
            x={xs[at - 1] - 8}
            y={lineY(k) - 24}
            width={xs[at + 1] + widths[at + 1] - xs[at - 1] + 16}
            height={46}
            rx={10}
            fill={current ? C.yellow : shade(C.yellow, 0.6)}
            stroke={current ? C.ink : 'none'}
            strokeWidth={2}
          />
        )}
        {line.map((it, i) => (
          <text
            key={i}
            x={xs[i] + widths[i] / 2}
            y={lineY(k)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={30}
            fontWeight={it.t === 'n' ? 700 : 500}
            fill={i === landed ? shade(C.green, -0.3) : C.ink}
            className="num"
          >
            {it.t === 'n' ? fmt(it.v) : it.t === 'o' ? it.v : it.t}
          </text>
        ))}
        {k > 0 && (
          <text x={PANEL.x + 26} y={lineY(k)} dominantBaseline="central" fontSize={24} fill={C.muted}>
            =
          </text>
        )}
      </g>
    );
  };

  const message = run.error
    ? `${run.error} Move the brackets.`
    : both && !pairOk
      ? 'Brackets need at least two numbers between them.'
      : open !== null && close === null
        ? 'Now drag the ) bracket in too.'
        : close !== null && open === null
          ? 'Now drag the ( bracket in too.'
          : null;

  return (
    <SceneSvg label="Order of operations: a calculation machine with brackets">
      <SvgButton x={60} y={24} w={210} h={48} fontSize={18} label="New expression" onClick={newExpression} />
      <SvgButton x={284} y={24} w={210} h={48} fontSize={18} label="Take brackets out" onClick={removeBrackets} disabled={open === null && close === null} />

      {/* The expression, with gaps where brackets can go. */}
      {nums.map((v, k) => (
        <g key={`n${k}`}>
          <rect x={L.numX(k)} y={TILE.y} width={TILE.num} height={TILE.h} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
          <text x={L.numX(k) + TILE.num / 2} y={TILE.y + TILE.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={34} fontWeight={700} fill={C.ink} className="num">
            {v}
          </text>
        </g>
      ))}
      {ops.map((o, k) => (
        <g key={`o${k}`}>
          <rect x={L.opX(k)} y={TILE.y + 12} width={TILE.op} height={TILE.h - 24} rx={12} fill={shade(C.yellow, 0.55)} stroke={C.ink} strokeWidth={2} />
          <text x={L.opX(k) + TILE.op / 2} y={TILE.y + TILE.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink}>
            {o}
          </text>
        </g>
      ))}
      <text x={60} y={TRAY.y + 40} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        Drag brackets into a gap
      </text>
      {message && (
        <text x={620} y={TRAY.y + 40} dominantBaseline="central" fontSize={17} fontWeight={700} fill={run.error || (both && !pairOk) ? C.red : C.ink2}>
          {message}
        </text>
      )}
      {glyph('open')}
      {glyph('close')}

      {/* The machine: one line of working per step. */}
      <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {RULES.map((r, i) => (
        <g key={r.key}>
          <rect x={PANEL.x + 18 + i * 230} y={PANEL.y + 18} width={218} height={40} rx={20} fill={activeRule === r.key ? C.yellow : shade(C.line, 0.5)} stroke={activeRule === r.key ? C.ink : 'none'} strokeWidth={2} />
          <text x={PANEL.x + 18 + i * 230 + 109} y={PANEL.y + 38} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={activeRule === r.key ? C.ink : C.muted}>
            {r.label}
          </text>
        </g>
      ))}
      {!run.error && run.lines.slice(0, revealed).map((line, k) => drawLine(line, k))}
      {!run.error && (
        <>
          <SvgButton x={760} y={PANEL.y + 82} w={160} h={56} fontSize={19} label="Next step" onClick={step} disabled={done} color={C.yellow} />
          <SvgButton x={760} y={PANEL.y + 152} w={160} h={48} fontSize={17} label="Start again" onClick={reset} disabled={revealed === 1} />
        </>
      )}
      {done && (
        <g className="pop-in" style={{ transformOrigin: '840px 590px' }}>
          <rect x={760} y={PANEL.y + 230} width={160} height={84} rx={14} fill={shade(C.green, 0.75)} stroke={C.ink} strokeWidth={2} />
          <text x={840} y={PANEL.y + 256} textAnchor="middle" fontSize={15} fill={C.ink2} className="caps">
            Answer
          </text>
          <text x={840} y={PANEL.y + 292} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.ink} className="num">
            {fmt(valueOf(items) ?? 0)}
          </text>
        </g>
      )}
      <Callout at={[L.openX(0), TILE.y]} box={[520, 28]} w={300} icon={Parentheses} title="Brackets go first" text="Put brackets round a part to make the machine do it first. The answer can change!" />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={44} y={24} width={56} height={30} rx={8} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
      <text x={60} y={40} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
        3 + 4 × 2
      </text>
      <text x={60} y={68} textAnchor="middle" fontSize={13} fill={C.muted}>
        × before +
      </text>
    </svg>
  );
}

// ───────────────────────── practice ─────────────────────────

function precedenceQ(): Question {
  const b = rand(2, 9);
  const c = rand(2, 9);
  const p = b * c;
  const form = rand(0, 3);
  if (form === 0) {
    const a = rand(2, 20);
    return pq(`${a} + ${b} × ${c}`, a + p, [`× comes before +, so do ${b} × ${c} = ${p} first.`, `Then ${a} + ${p} = ${a + p}.`]);
  }
  if (form === 1) {
    const a = rand(2, 20);
    return pq(`${b} × ${c} + ${a}`, p + a, [`Do the × first: ${b} × ${c} = ${p}.`, `Then ${p} + ${a} = ${p + a}.`]);
  }
  if (form === 2) {
    const a = p + rand(1, 20);
    return pq(`${a} − ${b} × ${c}`, a - p, [`× comes before −, so do ${b} × ${c} = ${p} first.`, `Then ${a} − ${p} = ${a - p}.`]);
  }
  const a = rand(2, 20);
  return pq(`${a} + ${p} ÷ ${b}`, a + c, [`÷ comes before +, so do ${p} ÷ ${b} = ${c} first.`, `Then ${a} + ${c} = ${a + c}.`]);
}

function pq(expr: string, ans: number, explain: string[], hint = 'Which comes first: × and ÷, or + and −?'): Question {
  return { prompt: `What is ${expr}?`, answer: String(ans), hint, explain };
}

function bracketsQ(): Question {
  const a = rand(2, 12);
  const b = rand(2, 9);
  const c = rand(2, 6);
  const form = rand(0, 2);
  if (form === 0) return pq(`(${a} + ${b}) × ${c}`, (a + b) * c, [`Brackets first: ${a} + ${b} = ${a + b}.`, `Then ${a + b} × ${c} = ${(a + b) * c}.`], 'What do brackets tell you to do?');
  if (form === 1) {
    const big = a + b + 1;
    return pq(`${c} × (${big} − ${b})`, c * (big - b), [`Brackets first: ${big} − ${b} = ${big - b}.`, `Then ${c} × ${big - b} = ${c * (big - b)}.`], 'What do brackets tell you to do?');
  }
  const sum = c * rand(2, 6);
  const x = rand(1, sum - 1);
  return pq(`(${x} + ${sum - x}) ÷ ${c}`, sum / c, [`Brackets first: ${x} + ${sum - x} = ${sum}.`, `Then ${sum} ÷ ${c} = ${sum / c}.`], 'What do brackets tell you to do?');
}

function leftToRightQ(): Question {
  if (Math.random() < 0.5) {
    const b = rand(2, 6);
    const k = rand(2, 6);
    const c = rand(2, 5);
    const a = b * k;
    return pq(`${a} ÷ ${b} × ${c}`, k * c, ['× and ÷ are equal partners: go left to right.', `${a} ÷ ${b} = ${k}.`, `Then ${k} × ${c} = ${k * c}.`], 'Two operations of the same rank: which one is further left?');
  }
  const b = rand(2, 9);
  const a = b + rand(3, 15);
  const c = rand(2, 9);
  return pq(`${a} − ${b} + ${c}`, a - b + c, ['+ and − are equal partners: go left to right.', `${a} − ${b} = ${a - b}.`, `Then ${a - b} + ${c} = ${a - b + c}.`], 'Two operations of the same rank: which one is further left?');
}

function firstStepQ(): Question {
  for (;;) {
    const nums = [rand(2, 20), rand(2, 9), rand(2, 9), rand(1, 9)];
    const ops: Op[] = shuffle<Op>(['+', '−', pick<Op>(['×', '÷'])]);
    const withBr = Math.random() < 0.4;
    let br: Bracket = null;
    if (withBr) {
      const s = rand(0, 2);
      br = [s, s + 1];
    }
    const items = build(nums, ops, br);
    // Keep every step whole and positive.
    const run = solve(items);
    if (run.error || run.lines.some((l) => l.some((it) => it.t === 'n' && it.v < 0))) continue;
    const pairs = ops.map((o, k) => `${nums[k]} ${o} ${nums[k + 1]}`);
    if (new Set(pairs).size !== 3) continue;
    const first = run.at[0];
    const opIndex = items.slice(0, first + 1).filter((it) => it.t === 'o').length - 1;
    const right = pairs[opIndex];
    const why = br ? 'There are brackets, so start inside them' : ops[opIndex] === '×' || ops[opIndex] === '÷' ? `${ops[opIndex]} comes before + and −` : 'There is no × or ÷, so go left to right';
    return {
      prompt: `What do you work out first in ${show(items)}?`,
      choices: shuffle(pairs).map((value) => ({ value })),
      answer: right,
      hint: 'Check for brackets first, then × and ÷.',
      explain: [`${why}.`, `So the first step is ${right}.`],
    };
  }
}

function bracketPlaceQ(): Question {
  for (;;) {
    const nums = [rand(2, 9), rand(2, 9), rand(2, 9), rand(1, 9)];
    const ops: Op[] = [pick<Op>(['+', '×', '−']), pick<Op>(['+', '×']), pick<Op>(['+', '−', '×'])];
    if (!ops.includes('×')) continue;
    const plain = valueOf(build(nums, ops));
    const options: { s: string; v: number; items: Item[] }[] = [];
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) {
        if (i === 0 && j === 3) continue;
        const items = build(nums, ops, [i, j]);
        const v = valueOf(items);
        if (v === null || v < 0) continue;
        options.push({ s: show(items), v, items });
      }
    const counts = new Map<number, number>();
    for (const o of options) counts.set(o.v, (counts.get(o.v) ?? 0) + 1);
    const targets = options.filter((o) => counts.get(o.v) === 1 && o.v !== plain);
    if (!targets.length) continue;
    const right = pick(targets);
    const others: typeof options = [];
    for (const o of shuffle(options)) if (o.v !== right.v && !others.some((x) => x.v === o.v)) others.push(o);
    if (others.length < 2) continue;
    const run = solve(right.items);
    return {
      prompt: `Where do the brackets go so that ${show(build(nums, ops))} makes ${right.v}?`,
      choices: shuffle([right, ...others.slice(0, 3)]).map((o) => ({ value: o.s })),
      answer: right.s,
      hint: 'Try each one: work out the brackets first, then the rest.',
      explain: [`Work it out: ${run.lines.map(show).join(' → ')}.`, `So ${right.s} makes ${right.v}.`],
    };
  }
}

function multiStepQ(): Question {
  if (Math.random() < 0.5) {
    const a = rand(2, 6);
    const c = rand(2, 9);
    const b = c + rand(1, 8);
    const e = rand(2, 5);
    const k = rand(2, 9);
    const d = e * k;
    const ans = a * (b - c) + k;
    return pq(`${a} × (${b} − ${c}) + ${d} ÷ ${e}`, ans, [`Brackets: ${b} − ${c} = ${b - c}.`, `× and ÷: ${a} × ${b - c} = ${a * (b - c)} and ${d} ÷ ${e} = ${k}.`, `Last: ${a * (b - c)} + ${k} = ${ans}.`], 'Brackets, then × and ÷, then + and −.');
  }
  const a = rand(2, 5);
  const b = rand(1, 9);
  const c = rand(2, 6);
  const d = rand(2, 6);
  const ans = a * (b + c * d);
  return pq(`${a} × (${b} + ${c} × ${d})`, ans, [`Inside the brackets, × comes first: ${c} × ${d} = ${c * d}.`, `Then ${b} + ${c * d} = ${b + c * d}.`, `Last: ${a} × ${b + c * d} = ${ans}.`], 'Inside brackets the same rules apply: × before +.');
}

function makeQuestion(level: number): Question {
  if (level === 0) return precedenceQ();
  if (level === 1) return pick([bracketsQ, leftToRightQ, firstStepQ])();
  return pick([bracketPlaceQ, multiStepQ, firstStepQ])();
}

export const orderOfOperations: Lesson = {
  id: 'order-of-operations',
  title: 'Order of Operations',
  Thumb,
  Scene: OrderScene,
  sceneHint: 'Step through the machine · Drag brackets to change the answer',
  learn: {
    heading: 'Order of operations',
    intro: 'When a calculation has more than one operation, everyone follows the same order so we all get the same answer.',
    points: [
      { icon: Brackets, text: 'Brackets first: work out what is inside them.' },
      { icon: ListOrdered, text: 'Then × and ÷, then + and −.' },
      { icon: ArrowRightLeft, text: '× and ÷ are equal partners: do them left to right. The same goes for + and −.' },
      { icon: Parentheses, text: 'Moving brackets can change the answer: (3 + 4) × 2 = 14 but 3 + 4 × 2 = 11.' },
    ],
  },
  steps: ['Look for brackets and work out the inside first.', 'Do any × and ÷ from left to right.', 'Do any + and − from left to right.', 'Write each step on a new line so nothing gets lost.'],
  example: {
    question: 'What is 20 − 4 × (2 + 1)?',
    work: ['Brackets: 2 + 1 = 3, so 20 − 4 × 3.', '× next: 4 × 3 = 12, so 20 − 12.', 'Last: 20 − 12 = 8.'],
    answer: '20 − 4 × (2 + 1) = 8',
  },
  grownups: [
    'Some children learn a mnemonic such as BIDMAS or PEMDAS. It can mislead: multiplication does not come before division, and addition does not come before subtraction — each pair is done left to right.',
    'A classic check: 12 ÷ 3 × 2 is 8, not 2.',
    'Ask children to write one line per step. It makes mistakes easy to spot and fix.',
    'Calculators differ: some follow the order of operations and some work left to right as you type. Try 3 + 4 × 2 on yours.',
  ],
  makeQuestion,
};
