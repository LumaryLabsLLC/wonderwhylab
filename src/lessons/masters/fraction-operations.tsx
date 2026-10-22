import { useState } from 'react';
import { FlipHorizontal2, Grid2x2, Ruler, X } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Frac, fracStr, simplify } from './visuals/Frac';

type F = [number, number];
type Mode = 'multiply' | 'divide';

const SQ = { x: 110, y: 150, s: 380 };
const BAR = { x: 80, w: 840, y: 262, h: 60, py: 336 };
const DIVIDENDS: F[] = [[1, 1], [2, 1], [3, 1], [1, 2], [3, 4]];
const DIVISORS: F[] = [[1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [2, 3], [3, 4]];

const f = ([n, d]: F) => fracStr(n, d, true);

// ───────────────────────── scene ─────────────────────────

function FractionOpsScene() {
  const [mode, setMode] = useState<Mode>('multiply');

  // Multiply: blue = a/b (columns), yellow = c/d (rows).
  const [a, setA] = useState(1);
  const [b, setB] = useState(3);
  const [c, setC] = useState(1);
  const [d, setD] = useState(2);

  // Divide: how many pieces of `v` fit into `w`?
  const [w, setW] = useState<F>([2, 1]);
  const [v, setV] = useState<F>([1, 4]);
  const [placed, setPlaced] = useState(0);

  const modeBtn = (m: Mode, label: string, x: number) => (
    <SvgButton x={x} y={24} w={150} h={48} fontSize={18} label={label} active={mode === m} color={mode === m ? C.yellow : C.card} onClick={() => setMode(m)} />
  );

  return (
    <SceneSvg label="Multiplying and dividing fractions with area models and fraction bars">
      {modeBtn('multiply', 'Multiply', 60)}
      {modeBtn('divide', 'Divide', 222)}
      {mode === 'multiply' ? (
        <MultiplyView a={a} b={b} c={c} d={d} set={{ setA, setB, setC, setD }} />
      ) : (
        <DivideView
          w={w}
          v={v}
          placed={placed}
          setPlaced={setPlaced}
          pickW={(x) => {
            setW(x);
            setPlaced(0);
          }}
          pickV={(x) => {
            setV(x);
            setPlaced(0);
          }}
        />
      )}
    </SceneSvg>
  );
}

function MultiplyView({
  a,
  b,
  c,
  d,
  set,
}: {
  a: number;
  b: number;
  c: number;
  d: number;
  set: Record<'setA' | 'setB' | 'setC' | 'setD', (n: number) => void>;
}) {
  const cw = SQ.s / b;
  const rh = SQ.s / d;
  const [sn, sd] = simplify(a * c, b * d);
  const changeDen = (setDen: (n: number) => void, setNum: (n: number) => void, num: number, den: number) => {
    setDen(den);
    if (num > den) setNum(den);
    play('pop');
  };

  const picker = (x: number, num: number, den: number, color: string, setNum: (n: number) => void, setDen: (n: number) => void, name: string) => (
    <g>
      <rect x={x} y={120} width={190} height={140} rx={14} fill={shade(color, 0.7)} stroke={C.ink} strokeWidth={2} />
      <SvgButton x={x + 12} y={134} w={48} h={48} fontSize={22} label="−" title={`Smaller ${name} top number`} disabled={num <= 1} onClick={() => setNum(num - 1)} />
      <SvgButton x={x + 130} y={134} w={48} h={48} fontSize={22} label="+" title={`Bigger ${name} top number`} disabled={num >= den} onClick={() => setNum(num + 1)} />
      <SvgButton x={x + 12} y={200} w={48} h={48} fontSize={22} label="−" title={`Smaller ${name} bottom number`} disabled={den <= 2} onClick={() => changeDen(setDen, setNum, num, den - 1)} />
      <SvgButton x={x + 130} y={200} w={48} h={48} fontSize={22} label="+" title={`Bigger ${name} bottom number`} disabled={den >= 6} onClick={() => changeDen(setDen, setNum, num, den + 1)} />
      <Frac x={x + 95} y={191} n={num} d={den} size={36} />
    </g>
  );

  return (
    <g>
      {/* The area model: a square cut into b columns and d rows. */}
      {Array.from({ length: b * d }, (_, i) => {
        const col = i % b;
        const row = Math.floor(i / b);
        const blue = col < a;
        const yellow = row < c;
        return (
          <rect
            key={i}
            x={SQ.x + col * cw}
            y={SQ.y + row * rh}
            width={cw}
            height={rh}
            fill={blue && yellow ? C.green : blue ? shade(C.blue, 0.45) : yellow ? shade(C.yellow, 0.35) : C.card}
            stroke={C.ink}
            strokeOpacity={0.35}
            strokeWidth={1.5}
            className="fade-in"
          />
        );
      })}
      <rect x={SQ.x} y={SQ.y} width={SQ.s} height={SQ.s} fill="none" stroke={C.ink} strokeWidth={3} />
      {/* Labels: blue fraction along the top, yellow fraction down the left. */}
      <line x1={SQ.x} y1={SQ.y - 12} x2={SQ.x + a * cw} y2={SQ.y - 12} stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
      <Frac x={SQ.x + (a * cw) / 2} y={SQ.y - 46} n={a} d={b} size={20} color={shade(C.blue, -0.35)} />
      <line x1={SQ.x - 12} y1={SQ.y} x2={SQ.x - 12} y2={SQ.y + c * rh} stroke={shade(C.yellow, -0.25)} strokeWidth={5} strokeLinecap="round" />
      <Frac x={SQ.x - 40} y={SQ.y + (c * rh) / 2} n={c} d={d} size={20} color={shade(C.yellow, -0.55)} />

      {picker(560, a, b, C.blue, set.setA, set.setB, 'blue')}
      <text x={762} y={191} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink}>
        ×
      </text>
      {picker(774, c, d, C.yellow, set.setC, set.setD, 'yellow')}

      <rect x={560} y={284} width={404} height={280} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={578} y={314} fontSize={15} fill={C.muted} className="caps">
        Green = {c}/{d} of {a}/{b}
      </text>
      <rect x={578} y={334} width={22} height={22} rx={4} fill={C.green} stroke={C.ink} strokeWidth={1.5} />
      <text x={610} y={346} dominantBaseline="central" fontSize={18} fill={C.ink}>
        Green pieces: {a} × {c} = <tspan fontWeight={700}>{a * c}</tspan>
      </text>
      <rect x={578} y={370} width={22} height={22} rx={4} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <text x={610} y={382} dominantBaseline="central" fontSize={18} fill={C.ink}>
        All pieces: {b} × {d} = <tspan fontWeight={700}>{b * d}</tspan>
      </text>
      <g>
        <Frac x={604} y={452} n={a} d={b} size={28} />
        <text x={642} y={452} textAnchor="middle" dominantBaseline="central" fontSize={26} fill={C.ink}>
          ×
        </text>
        <Frac x={680} y={452} n={c} d={d} size={28} />
        <text x={718} y={452} textAnchor="middle" dominantBaseline="central" fontSize={26} fill={C.ink}>
          =
        </text>
        <Frac x={762} y={452} n={a * c} d={b * d} size={28} color={shade(C.green, -0.35)} />
        {sd !== b * d && (
          <>
            <text x={810} y={452} textAnchor="middle" dominantBaseline="central" fontSize={26} fill={C.ink}>
              =
            </text>
            <Frac x={852} y={452} n={sn} d={sd} size={28} />
          </>
        )}
      </g>
      <text x={578} y={526} fontSize={16} fill={C.ink2}>
        Tops multiply to count the green pieces;
      </text>
      <text x={578} y={546} fontSize={16} fill={C.ink2}>
        bottoms multiply to count all the pieces.
      </text>
      <Callout at={[SQ.x + cw / 2, SQ.y + rh / 2]} box={[110, 580]} w={330} icon={Grid2x2} title="“Of” means times" text={`${c}/${d} of ${a}/${b} is the green part: it's where the blue and yellow overlap.`} />
    </g>
  );
}

function DivideView({
  w,
  v,
  placed,
  setPlaced,
  pickW,
  pickV,
}: {
  w: F;
  v: F;
  placed: number;
  setPlaced: (n: number) => void;
  pickW: (x: F) => void;
  pickV: (x: F) => void;
}) {
  const wv = w[0] / w[1];
  const vv = v[0] / v[1];
  // Answer as a fraction: w ÷ v = (w0 × v1) / (w1 × v0).
  const q: F = simplify(w[0] * v[1], w[1] * v[0]);
  const qv = q[0] / q[1];
  const need = Math.ceil(qv - 1e-9);
  const unit = BAR.w / Math.max(wv, need * vv);
  const L = wv * unit;
  const pw = vv * unit;
  const done = placed >= need;
  const whole = Math.floor(qv + 1e-9);
  const part = simplify(q[0] - whole * q[1], q[1]);

  const sel = (items: F[], cur: F, onPick: (x: F) => void, y: number, label: string) => (
    <g>
      <text x={60} y={y + 24} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        {label}
      </text>
      {items.map((x, i) => {
        const on = x[0] === cur[0] && x[1] === cur[1];
        return <SvgButton key={f(x)} x={200 + i * 82} y={y} w={72} h={48} fontSize={19} label={f(x)} active={on} color={on ? C.yellow : C.card} onClick={() => onPick(x)} />;
      })}
    </g>
  );

  const fill = () => {
    setPlaced(need);
    play('correct');
  };
  const add = () => {
    setPlaced(Math.min(need, placed + 1));
    play(placed + 1 >= need ? 'correct' : 'pop');
  };

  return (
    <g>
      {sel(DIVIDENDS, w, pickW, 96, 'Start with')}
      {sel(DIVISORS, v, pickV, 156, 'Pieces of')}

      {/* The amount we start with, marked in wholes and in the piece's fraction lines. */}
      {Array.from({ length: Math.floor(wv * v[1] + 1e-9) + 1 }, (_, i) => i / v[1])
        .filter((t) => t > 0 && t < wv - 1e-9)
        .map((t) => (
          <line key={t} x1={BAR.x + t * unit} y1={BAR.y} x2={BAR.x + t * unit} y2={BAR.y + BAR.h} stroke={C.ink} strokeOpacity={0.3} strokeDasharray="5 5" strokeWidth={1.5} />
        ))}
      <rect x={BAR.x} y={BAR.y} width={L} height={BAR.h} rx={6} fill={shade(C.blue, 0.55)} fillOpacity={0.85} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: Math.floor(wv) + 1 }, (_, i) => i).map((i) => (
        <g key={i}>
          {i > 0 && i < wv && <line x1={BAR.x + i * unit} y1={BAR.y} x2={BAR.x + i * unit} y2={BAR.y + BAR.h} stroke={C.ink} strokeWidth={3} />}
          <text x={BAR.x + i * unit} y={BAR.y - 14} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink2} className="num">
            {i}
          </text>
        </g>
      ))}
      {!Number.isInteger(wv) && (
        <text x={BAR.x + L} y={BAR.y - 14} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink2} className="num">
          {f(w)}
        </text>
      )}

      {/* Pieces laid along the bar. The last one may only partly fit. */}
      {Array.from({ length: placed }, (_, i) => {
        const x = BAR.x + i * pw;
        const fits = (i + 1) * pw <= L + 0.5;
        const fillW = Math.min(pw, L - i * pw);
        return (
          <g key={i} className="pop-in" style={{ transformOrigin: `${x + pw / 2}px ${BAR.py + 30}px` }}>
            {!fits && <rect x={x} y={BAR.py} width={pw} height={BAR.h - 4} rx={6} fill="none" stroke={C.ink} strokeWidth={2} strokeDasharray="6 5" />}
            <rect x={x} y={BAR.py} width={fillW} height={BAR.h - 4} rx={6} fill={i % 2 ? shade(C.yellow, 0.3) : C.yellow} stroke={C.ink} strokeWidth={2} />
            {pw >= 26 && (
              <text x={x + (fits ? pw : fillW) / 2} y={BAR.py + 28} textAnchor="middle" dominantBaseline="central" fontSize={fits ? 17 : 15} fontWeight={700} fill={C.ink} className="num">
                {fits ? i + 1 : f(part)}
              </text>
            )}
          </g>
        );
      })}
      {done && part[0] > 0 && (
        <text x={Math.min(BAR.x + (need - 0.5) * pw, 900)} y={BAR.py + 80} textAnchor="middle" fontSize={16} fill={C.ink2}>
          {f(part)} of a piece
        </text>
      )}

      <SvgButton x={80} y={440} w={180} h={52} fontSize={18} label="Add a piece" onClick={add} disabled={done} color={C.yellow} />
      <SvgButton x={274} y={440} w={120} h={52} fontSize={18} label="Fill it" onClick={fill} disabled={done} />
      <SvgButton x={408} y={440} w={110} h={52} fontSize={18} label="Clear" onClick={() => setPlaced(0)} disabled={placed === 0} />

      <rect x={60} y={512} width={880} height={150} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={80} y={546} fontSize={21} fontWeight={700} fill={C.ink}>
        How many pieces of {f(v)} fit into {f(w)}?
      </text>
      {done ? (
        <g>
          <text x={80} y={580} fontSize={18} fill={C.ink}>
            {part[0] === 0 ? `${whole} pieces fit, so ` : whole === 0 ? `Only ${f(part)} of a piece fits, so ` : `${whole} whole ${whole === 1 ? 'piece' : 'pieces'} and ${f(part)} of a piece fit, so `}
            <tspan fontWeight={700}>
              {f(w)} ÷ {f(v)} = {f(q)}
            </tspan>
            .
          </text>
          <text x={80} y={612} fontSize={18} fill={C.ink}>
            The shortcut: {f(w)} ÷ {f(v)} = {f(w)} × {fracStr(v[1], v[0])} = {f(q)}
          </text>
          <text x={80} y={642} fontSize={16} fill={C.ink2}>
            Dividing by {f(v)} gives the same answer as multiplying by {fracStr(v[1], v[0])}, its flip.
          </text>
        </g>
      ) : (
        <text x={80} y={584} fontSize={18} fill={C.ink2}>
          {placed === 0 ? 'Add pieces along the bar and count them.' : `${placed} so far. Keep going until the bar is covered.`}
        </text>
      )}
      <Callout at={[BAR.x + Math.min(L, pw) / 2, BAR.py + BAR.h - 4]} box={[600, 446]} w={320} icon={Ruler} title="Division as fitting" text="A ÷ B asks: how many Bs fit into A? Small pieces fit many times, so dividing by a fraction can give a bigger number." />
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const fill = col < 1 && row < 1 ? C.green : col < 1 ? shade(C.blue, 0.45) : row < 1 ? shade(C.yellow, 0.35) : C.card;
        return <rect key={i} x={12 + col * 18} y={16 + row * 24} width={18} height={24} fill={fill} stroke={C.ink} strokeWidth={1} />;
      })}
      <rect x={12} y={16} width={54} height={48} fill="none" stroke={C.ink} strokeWidth={2} />
      <text x={92} y={30} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
        ×
      </text>
      <text x={92} y={58} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
        ÷
      </text>
    </svg>
  );
}

// ───────────────────────── practice ─────────────────────────

/** A small area model for "c/d of a/b". */
function AreaPicture({ a, b, c, d }: { a: number; b: number; c: number; d: number }) {
  const s = 120;
  return (
    <svg viewBox="0 0 200 150" aria-hidden>
      {Array.from({ length: b * d }, (_, i) => {
        const col = i % b;
        const row = Math.floor(i / b);
        const blue = col < a;
        const yellow = row < c;
        return (
          <rect
            key={i}
            x={50 + (col * s) / b}
            y={20 + (row * s) / d}
            width={s / b}
            height={s / d}
            fill={blue && yellow ? C.green : blue ? shade(C.blue, 0.45) : yellow ? shade(C.yellow, 0.35) : C.card}
            stroke={C.ink}
            strokeOpacity={0.4}
          />
        );
      })}
      <rect x={50} y={20} width={s} height={s} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </svg>
  );
}

const value = ([n, d]: F) => n / d;

/** Correct answer plus up to three distractors with different values (so "2/6" never sits beside "1/3"). */
function fracChoices(right: F, wrong: F[]) {
  const seen = new Set<number>([Math.round(value(right) * 1e6)]);
  const out: F[] = [];
  for (const x of wrong) {
    if (x[1] <= 0 || x[0] <= 0) continue;
    const key = Math.round(value(x) * 1e6);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return shuffle([right, ...out.slice(0, 3)]).map((x) => ({ value: f(x) }));
}

function unitOfUnitQ(): Question {
  const b = rand(2, 5);
  const d = rand(2, 5);
  const ans: F = [1, b * d];
  return {
    prompt: `What is 1/${d} of 1/${b}?`,
    visual: <AreaPicture a={1} b={b} c={1} d={d} />,
    choices: fracChoices(ans, [[2, b + d], [1, b + d], [1, b], [2, b * d], [1, d], [1, 2 * b * d]]),
    answer: f(ans),
    hint: 'Count how many pieces the whole square is cut into. How many are green?',
    explain: [`Cut the square into ${b} columns and ${d} rows: ${b} × ${d} = ${b * d} pieces.`, `1/${d} of 1/${b} is just 1 of those pieces.`, `So 1/${d} of 1/${b} = ${f(ans)}.`],
  };
}

function fractionOfAmountQ(unit: boolean): Question {
  const d = pick([2, 3, 4, 5, 6, 8, 10]);
  const n = unit ? 1 : rand(2, d - 1);
  const amount = d * rand(2, unit ? 6 : 9);
  const share = amount / d;
  const ans = share * n;
  return {
    prompt: `What is ${n}/${d} × ${amount}?`,
    answer: String(ans),
    hint: `${n}/${d} of a number: share it into ${d} equal groups first.`,
    explain: unit
      ? [`${n}/${d} × ${amount} means ${n}/${d} of ${amount}.`, `${amount} ÷ ${d} = ${share}.`, `So 1/${d} × ${amount} = ${ans}.`]
      : [`${n}/${d} × ${amount} means ${n}/${d} of ${amount}.`, `One share: ${amount} ÷ ${d} = ${share}.`, `${n} shares: ${n} × ${share} = ${ans}.`],
  };
}

function multiplyQ(): Question {
  const b = rand(2, 6);
  const d = rand(2, 6);
  const a = rand(1, b - 1);
  const c = rand(1, d - 1);
  const ans = simplify(a * c, b * d);
  const right = f(ans);
  const full = `${a * c}/${b * d}`;
  return {
    prompt: `What is ${a}/${b} × ${c}/${d}?`,
    visual: <AreaPicture a={a} b={b} c={c} d={d} />,
    choices: fracChoices(ans, [simplify(a + c, b + d), simplify(a * d, b * c), simplify(a * c, b + d), simplify(a + c, b * d), [a * c + 1, b * d]]),
    answer: right,
    hint: 'Multiply the top numbers, then multiply the bottom numbers. Simplify if you can.',
    explain: [
      `Tops: ${a} × ${c} = ${a * c}. Bottoms: ${b} × ${d} = ${b * d}.`,
      full === right ? `So ${a}/${b} × ${c}/${d} = ${right}.` : `${full} simplifies to ${right}.`,
      ...(full === right ? [] : [`So ${a}/${b} × ${c}/${d} = ${right}.`]),
    ],
  };
}

function wholeTimesQ(): Question {
  const d = rand(3, 6);
  const n = rand(1, d - 1);
  const k = rand(2, 5);
  const ans = simplify(n * k, d);
  return {
    prompt: `What is ${k} × ${n}/${d}?`,
    choices: fracChoices(ans, [simplify(n * k, d * k), [k * d + n, d], simplify(n, d * k), [n + k, d]]),
    answer: f(ans),
    hint: `${k} lots of ${n}/${d}: how many ${d}ths is that altogether?`,
    explain: [
      `${k} × ${n}/${d} means ${k} lots of ${n}/${d}.`,
      `That is ${k} × ${n} = ${n * k} pieces of 1/${d}: ${n * k}/${d}.`,
      `${n * k}/${d}` === f(ans) ? `So ${k} × ${n}/${d} = ${f(ans)}.` : `${n * k}/${d} = ${f(ans)}.`,
    ],
  };
}

function howManyQ(): Question {
  const d = pick([2, 3, 4, 5, 6, 8]);
  const wholes = rand(2, 6);
  return {
    prompt: `How many pieces of 1/${d} fit into ${wholes}?`,
    answer: String(wholes * d),
    hint: `How many 1/${d}s are in one whole? Then do that for every whole.`,
    explain: [`One whole holds ${d} pieces of 1/${d}.`, `${wholes} wholes hold ${wholes} × ${d} = ${wholes * d}.`, `So ${wholes} ÷ 1/${d} = ${wholes * d}.`],
  };
}

function fracDivUnitQ(): Question {
  const b = pick([2, 3, 4, 5]);
  const k = pick([2, 3]);
  const d = b * k;
  const a = rand(1, b - 1);
  const ans = a * k;
  return {
    prompt: `What is ${a}/${b} ÷ 1/${d}?`,
    answer: String(ans),
    hint: `How many 1/${d}s make 1/${b}? Then count for ${a}/${b}.`,
    explain: [`1/${b} = ${k}/${d}, so ${a}/${b} = ${a * k}/${d}.`, `That is ${a * k} pieces of 1/${d}.`, `So ${a}/${b} ÷ 1/${d} = ${ans}.`],
  };
}

function divNonUnitQ(): Question {
  const [n, d] = pick<F>([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]);
  const k = rand(2, 4);
  const wholes = n * k;
  const ans = k * d;
  return {
    prompt: `What is ${wholes} ÷ ${n}/${d}?`,
    answer: String(ans),
    hint: 'Dividing by a fraction is the same as multiplying by that fraction flipped over.',
    explain: [`Flip ${n}/${d} to get ${d}/${n}.`, `${wholes} × ${d}/${n} = ${wholes * d}/${n}.`, `${wholes * d} ÷ ${n} = ${ans}, so ${wholes} ÷ ${n}/${d} = ${ans}.`],
  };
}

function fracDivWholeQ(): Question {
  const b = rand(2, 5);
  const a = rand(1, b - 1);
  const k = rand(2, 4);
  const ans = simplify(a, b * k);
  return {
    prompt: `What is ${a}/${b} ÷ ${k}?`,
    choices: fracChoices(ans, [simplify(a * k, b), [a, b], simplify(a, b + k), simplify(b * k, a)]),
    answer: f(ans),
    hint: `Share ${a}/${b} into ${k} equal parts. Each part is smaller than ${a}/${b}.`,
    explain: [`Dividing by ${k} is the same as multiplying by 1/${k}.`, `${a}/${b} × 1/${k} = ${a}/${b * k}.`, `So ${a}/${b} ÷ ${k} = ${f(ans)}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([unitOfUnitQ, () => fractionOfAmountQ(true)])();
  if (level === 1) return pick([multiplyQ, wholeTimesQ, () => fractionOfAmountQ(false)])();
  return pick([howManyQ, fracDivUnitQ, divNonUnitQ, fracDivWholeQ])();
}

export const fractionOperations: Lesson = {
  id: 'fraction-operations',
  title: 'Multiplying and Dividing Fractions',
  Thumb,
  Scene: FractionOpsScene,
  sceneHint: 'Overlap two fractions · Fit pieces into a bar',
  learn: {
    heading: 'Multiplying and dividing fractions',
    intro: 'Multiplying by a fraction takes a part of something: 1/2 × 1/3 means half of a third. Dividing by a fraction asks how many of those pieces fit.',
    points: [
      { icon: Grid2x2, text: 'Shade one fraction across and one down. The overlap is the answer.' },
      { icon: X, text: 'To multiply: top × top, bottom × bottom, then simplify.' },
      { icon: Ruler, text: '2 ÷ 1/4 asks how many quarters fit into 2. The answer is 8.' },
      { icon: FlipHorizontal2, text: 'To divide by a fraction, multiply by it flipped over.' },
    ],
  },
  steps: [
    'Multiplying: multiply the top numbers, then the bottom numbers.',
    'Simplify the answer by dividing the top and bottom by the same number.',
    'Dividing: ask "how many of these pieces fit?"',
    'Shortcut: flip the fraction you are dividing by, then multiply.',
  ],
  example: {
    question: 'What is 2/3 × 3/4? And what is 3 ÷ 1/4?',
    visual: <AreaPicture a={2} b={3} c={3} d={4} />,
    work: ['2/3 × 3/4: tops 2 × 3 = 6, bottoms 3 × 4 = 12, so 6/12 = 1/2.', '3 ÷ 1/4: each whole holds 4 quarters, so 3 wholes hold 3 × 4 = 12.'],
    answer: '2/3 × 3/4 = 1/2 and 3 ÷ 1/4 = 12.',
  },
  grownups: [
    'Many children expect multiplying to make things bigger and dividing to make them smaller. With fractions under 1, it is the other way round — the area model and the fitting bar show why.',
    'Read "×" as "of" when one number is a fraction: 3/4 × 20 is three quarters of 20.',
    '"Flip and multiply" is a shortcut, not a reason. Ask "how many halves are in 3?" first, then show that 3 × 2 gives the same answer.',
    'Watch for adding tops and bottoms (1/2 + 1/3 ≠ 2/5) creeping into multiplication questions.',
  ],
  makeQuestion,
};
