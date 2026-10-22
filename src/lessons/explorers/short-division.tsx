import { useState } from 'react';
import { ArrowLeftRight, CircleDashed, Divide, Hand } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { BlocksPicture, PLACE_COLORS } from './visuals/BaseTen';

const CELL = 12;
const ROD_W = 18;
const ROD_H = CELL * 10;
const ONE = 16;
const POOL = { x: 40, y: 88, w: 600, h: 190 };
const GROUPS = { x: 40, y: 300, w: 600, h: 260 };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function RodShape({ x, y, glow = false }: { x: number; y: number; glow?: boolean }) {
  return (
    <g>
      {glow && <rect x={x - 5} y={y - 5} width={ROD_W + 10} height={ROD_H + 10} rx={6} fill={C.yellow} opacity={0.6} />}
      <rect x={x} y={y} width={ROD_W} height={ROD_H} fill={PLACE_COLORS.tens} stroke={C.ink} strokeWidth={2} />
      <path d={Array.from({ length: 9 }, (_, k) => `M${x},${y + (k + 1) * CELL} h${ROD_W}`).join(' ')} stroke={shade(PLACE_COLORS.tens, -0.45)} strokeWidth={1} />
    </g>
  );
}

function OneShape({ x, y, left = false }: { x: number; y: number; left?: boolean }) {
  return (
    <rect
      x={x}
      y={y}
      width={ONE}
      height={ONE}
      fill={left ? shade(C.red, 0.7) : PLACE_COLORS.ones}
      stroke={left ? C.red : C.ink}
      strokeWidth={2}
      strokeDasharray={left ? '4 3' : undefined}
    />
  );
}

/** Where everything stands, worked out from the numbers and how far the child has got. */
function stateOf(n: number, d: number, tensDealt: number, exchanged: boolean, onesDealt: number) {
  const T = Math.floor(n / 10);
  const O = n % 10;
  const q1 = Math.floor(T / d);
  const r1 = T % d;
  const pool = r1 * 10 + O;
  const q0 = Math.floor(pool / d);
  const rem = pool % d;
  const phase: 'tens' | 'exchange' | 'ones' | 'done' =
    tensDealt < q1 ? 'tens' : r1 > 0 && !exchanged ? 'exchange' : onesDealt < q0 ? 'ones' : 'done';
  const tensLeft = T - tensDealt * d;
  const onesLeft = (exchanged || r1 === 0 ? pool : O) - onesDealt * d;
  return { T, O, q1, r1, pool, q0, rem, phase, tensLeft: phase === 'tens' || phase === 'exchange' ? tensLeft : 0, onesLeft };
}

function ShareScene() {
  const [n, setN] = useState(52);
  const [d, setD] = useState(3);
  const [tensDealt, setTensDealt] = useState(0);
  const [exchanged, setExchanged] = useState(false);
  const [onesDealt, setOnesDealt] = useState(0);
  const st = stateOf(n, d, tensDealt, exchanged, onesDealt);

  const restart = (nn = n, nd = d) => {
    setN(nn);
    setD(nd);
    setTensDealt(0);
    setExchanged(false);
    setOnesDealt(0);
  };

  const act = () => {
    if (st.phase === 'tens') setTensDealt(tensDealt + 1);
    else if (st.phase === 'exchange') setExchanged(true);
    else if (st.phase === 'ones') setOnesDealt(onesDealt + 1);
    else return;
    play(st.phase === 'exchange' ? 'whoosh' : 'pop');
    if (st.phase === 'ones' && onesDealt + 1 === st.q0) play('complete');
  };

  const label =
    st.phase === 'tens' ? 'Share a ten each' : st.phase === 'exchange' ? 'Swap tens for ones' : st.phase === 'ones' ? 'Share a one each' : 'All shared!';

  const message = (() => {
    if (st.phase === 'tens')
      return tensDealt === 0
        ? `Share ${n} into ${d} equal groups. Start with the ${plural(st.T, 'ten')}.`
        : `Each group has ${plural(tensDealt, 'ten')} so far. Keep sharing.`;
    if (st.phase === 'exchange')
      return st.q1 === 0
        ? `${plural(st.T, 'ten')} won't go into ${d} groups. Swap them for ${st.T * 10} ones.`
        : `${plural(st.r1, 'ten')} left: not enough for every group. Swap for ${st.r1 * 10} ones.`;
    if (st.phase === 'ones')
      return onesDealt === 0 ? `Now share the ${plural(st.onesLeft, 'one')}.` : `Each group has ${plural(onesDealt, 'one')} so far. Keep sharing.`;
    return st.rem
      ? `Each group gets ${st.q1 * 10 + st.q0}, and ${st.rem} ${st.rem === 1 ? 'is' : 'are'} left over. ${n} ÷ ${d} = ${st.q1 * 10 + st.q0} r ${st.rem}.`
      : `Each group gets ${st.q1 * 10 + st.q0}, with none left over. ${n} ÷ ${d} = ${st.q1 * 10 + st.q0}.`;
  })();

  const gap = 16;
  const gw = (GROUPS.w - (d - 1) * gap) / d;
  const tensInGroup = tensDealt;
  const onesInGroup = onesDealt;
  const showQ1 = st.phase !== 'tens' && st.q1 > 0;
  const showCarry = st.r1 > 0 && exchanged;
  const done = st.phase === 'done';
  const leftoverOnes = done && st.rem > 0;

  // Bus stop positions.
  const BX = { tens: 812, ones: 880, row: 238, top: 160 };

  return (
    <SceneSvg label={`Sharing ${n} into ${d} groups with tens and ones`}>
      {/* ── What we are sharing ── */}
      <rect
        x={POOL.x}
        y={POOL.y}
        width={POOL.w}
        height={POOL.h}
        rx={16}
        fill={C.card}
        stroke={C.ink}
        strokeWidth={2}
        onClick={act}
        style={{ cursor: done ? 'default' : 'pointer' }}
      />
      <text x={POOL.x + 16} y={POOL.y + 26} fontSize={16} fill={leftoverOnes ? C.red : C.muted} className="caps" pointerEvents="none">
        {leftoverOnes ? `Remainder: ${st.rem}` : done ? 'All shared' : 'To share (tap to share)'}
      </text>
      <g pointerEvents="none">
        {Array.from({ length: st.tensLeft }, (_, i) => (
          <RodShape key={`r${i}`} x={POOL.x + 22 + i * 28} y={POOL.y + 48} glow={st.phase === 'exchange'} />
        ))}
        {Array.from({ length: Math.max(0, st.onesLeft) }, (_, i) => (
          <g key={`o${i}-${exchanged}`} className={exchanged && i >= st.O ? 'pop-in' : undefined}>
            <OneShape x={POOL.x + 290 + (i % 12) * 24} y={POOL.y + 48 + Math.floor(i / 12) * 24} left={leftoverOnes} />
          </g>
        ))}
      </g>

      {/* ── The groups ── */}
      {Array.from({ length: d }, (_, g) => {
        const gx = GROUPS.x + g * (gw + gap);
        const rodsW = tensInGroup * 26 - 8;
        const perRow = 5;
        const onesW = Math.min(onesInGroup, perRow) * 20 - 4;
        return (
          <g key={g}>
            <rect x={gx} y={GROUPS.y} width={gw} height={GROUPS.h} rx={16} fill={shade(C.teal, 0.88)} stroke={C.ink} strokeWidth={2} />
            {Array.from({ length: tensInGroup }, (_, i) => (
              <g key={`t${i}`} className="pop-in">
                <RodShape x={gx + (gw - rodsW) / 2 + i * 26} y={GROUPS.y + 18} />
              </g>
            ))}
            {Array.from({ length: onesInGroup }, (_, i) => (
              <g key={`o${i}`} className="pop-in">
                <OneShape x={gx + (gw - onesW) / 2 + (i % perRow) * 20} y={GROUPS.y + 152 + Math.floor(i / perRow) * 20} />
              </g>
            ))}
            <text x={gx + gw / 2} y={GROUPS.y + GROUPS.h - 24} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink} className="num">
              {tensInGroup * 10 + onesInGroup}
            </text>
          </g>
        );
      })}

      {/* ── Bus stop ── */}
      <rect x={670} y={88} width={300} height={212} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={686} y={114} fontSize={16} fill={C.muted} className="caps">
        Bus stop method
      </text>
      <text x={716} y={BX.row} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={700} fill={C.ink} className="num">
        {d}
      </text>
      <path d={`M752,${BX.row + 32} V${BX.row - 40} H950`} fill="none" stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <text x={BX.tens} y={BX.row} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={700} fill={st.phase === 'tens' || st.phase === 'exchange' ? PLACE_COLORS.tens : C.ink} className="num">
        {st.T}
      </text>
      <text x={BX.ones} y={BX.row} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={700} fill={st.phase === 'ones' ? shade(PLACE_COLORS.ones, -0.25) : C.ink} className="num">
        {st.O}
      </text>
      {showCarry && (
        <text x={BX.ones - 30} y={BX.row - 16} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.red} className="num pop-in">
          {st.r1}
        </text>
      )}
      {showQ1 && (
        <text x={BX.tens} y={BX.top} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={700} fill={C.teal} className="num pop-in">
          {st.q1}
        </text>
      )}
      {done && (
        <text x={BX.ones} y={BX.top} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={700} fill={C.teal} className="num pop-in">
          {st.q0}
        </text>
      )}
      {done && st.rem > 0 && (
        <text x={BX.ones + 32} y={BX.top} dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.red} className="num pop-in">
          r {st.rem}
        </text>
      )}

      {wrap(message.replace(/ ([÷=]) /g, '\u00a0$1\u00a0'), 30).map((line, i) => (
        <text key={`${message}-${i}`} x={670} y={340 + i * 26} fontSize={18} fill={C.ink} fontWeight={i === 0 ? 600 : 400}>
          {line}
        </text>
      ))}
      <SvgButton x={670} y={470} w={300} h={56} fontSize={19} label={label} onClick={act} disabled={done} color={C.teal} textColor={C.white} />

      {/* ── Controls ── */}
      <text x={40} y={620} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        Number
      </text>
      <SvgButton x={124} y={594} w={52} h={52} label="−" title="Smaller number" onClick={() => restart(n - 1, d)} disabled={n <= 20} />
      <text x={210} y={620} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
        {n}
      </text>
      <SvgButton x={244} y={594} w={52} h={52} label="+" title="Bigger number" onClick={() => restart(n + 1, d)} disabled={n >= 99} color={C.yellow} />
      <text x={330} y={620} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        Groups
      </text>
      <SvgButton x={418} y={594} w={52} h={52} label="−" title="Fewer groups" onClick={() => restart(n, d - 1)} disabled={d <= 2} />
      <text x={496} y={620} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
        {d}
      </text>
      <SvgButton x={526} y={594} w={52} h={52} label="+" title="More groups" onClick={() => restart(n, d + 1)} disabled={d >= 5} color={C.yellow} />
      <SvgButton x={670} y={594} w={300} h={52} fontSize={17} label="Start again" onClick={() => restart()} disabled={tensDealt === 0 && !exchanged} />

      <Callout
        at={[BX.ones - 30, BX.row - 22]}
        box={[690, 24]}
        w={270}
        icon={ArrowLeftRight}
        title="The little number"
        text="Tens that can't be shared are swapped for ones. The small digit shows the swapped tens joining the ones."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <text x={18} y={52} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
        3
      </text>
      <path d="M30,60 V30 H110" fill="none" stroke={C.ink} strokeWidth={3} />
      <text x={60} y={52} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
        7
      </text>
      <text x={76} y={42} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.red}>
        1
      </text>
      <text x={88} y={52} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
        2
      </text>
      <text x={60} y={22} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.teal}>
        2
      </text>
      <text x={88} y={22} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.teal}>
        4
      </text>
    </svg>
  );
}

const PLACES = ['hundred', 'ten', 'one'];

/** Worked short division, one place at a time, ending with the answer. */
function divSteps(n: number, d: number): string[] {
  const ds = String(n).split('').map(Number);
  const places = PLACES.slice(3 - ds.length);
  const steps: string[] = [];
  let carry = 0;
  let q = 0;
  ds.forEach((digit, i) => {
    const v = carry * 10 + digit;
    const each = Math.floor(v / d);
    const r = v % d;
    q = q * 10 + each;
    const last = i === ds.length - 1;
    let s = `${plural(v, places[i])} ÷ ${d} = ${each} each`;
    if (r && !last) s += `; swap the ${r} left for ${r * 10} ${places[i + 1]}s`;
    else if (r) s += `, ${r} left over`;
    steps.push(`${s}.`);
    carry = r;
  });
  steps.push(`So ${n} ÷ ${d} = ${q}${carry ? ` r ${carry}` : ''}.`);
  return steps;
}

/** A 2-digit number that shares into d groups with no swapping. */
function noSwapPair() {
  const d = rand(2, 4);
  const tens = d * rand(1, Math.floor(9 / d));
  const ones = d * rand(0, Math.floor(9 / d));
  return { n: tens * 10 + ones, d };
}

function noExchangePicture(): Question {
  const { n, d } = noSwapPair();
  return {
    prompt: `Share ${n} equally into ${d} groups. How many in each group?`,
    visual: <BlocksPicture hundreds={0} tens={Math.floor(n / 10)} ones={n % 10} />,
    answer: String(n / d),
    hint: `Share the tens first, then the ones. How many tens does each of the ${d} groups get?`,
    explain: divSteps(n, d),
  };
}

function noExchange(): Question {
  const { n, d } = noSwapPair();
  return {
    prompt: `${n} ÷ ${d} = ?`,
    answer: String(n / d),
    hint: `Divide the tens digit by ${d}, then the ones digit by ${d}.`,
    explain: divSteps(n, d),
  };
}

/** A 2-digit number where some tens must be swapped, with no remainder. */
function swapPair() {
  for (;;) {
    const d = rand(2, 5);
    const q = rand(11, Math.floor(99 / d));
    const n = q * d;
    if (Math.floor(n / 10) % d !== 0) return { n, d };
  }
}

function withExchange(): Question {
  const { n, d } = swapPair();
  return {
    prompt: `${n} ÷ ${d} = ?`,
    answer: String(n / d),
    hint: `Share the tens. Any tens left over get swapped for ones before you share the ones.`,
    explain: divSteps(n, d),
  };
}

function tensToSwap(): Question {
  const { n, d } = swapPair();
  const T = Math.floor(n / 10);
  return {
    prompt: `Share ${n} into ${d} groups. After sharing the tens, how many tens are left to swap?`,
    visual: <BlocksPicture hundreds={0} tens={T} ones={n % 10} />,
    answer: String(T % d),
    hint: `Give each of the ${d} groups the same number of tens. How many can't be shared?`,
    explain: [`There are ${plural(T, 'ten')} to share into ${d} groups.`, `Each group gets ${Math.floor(T / d)}, which uses ${Math.floor(T / d) * d}.`, `${T} − ${Math.floor(T / d) * d} = ${T % d} left to swap for ones.`],
  };
}

function remainder(): Question {
  let n = 0;
  let d = 0;
  do {
    d = rand(3, 5);
    n = rand(21, 99);
  } while (n % d === 0 || Math.floor(n / d) < 10);
  const q = Math.floor(n / d);
  const r = n % d;
  const right = `${q} r ${r}`;
  const options = [right, `${q - 1} r ${r + d}`, `${q + 1} r ${r}`, `${q} r ${r + 1}`];
  return {
    prompt: `${n} ÷ ${d} = ?`,
    choices: shuffle(options).map((value) => ({ value })),
    answer: right,
    hint: `Share the tens, swap any left over, then share the ones. The remainder must be smaller than ${d}.`,
    explain: divSteps(n, d),
  };
}

function threeDigit(): Question {
  const d = rand(3, 6);
  const q = rand(Math.ceil(100 / d), Math.floor(999 / d));
  const n = q * d;
  return {
    prompt: `${n} ÷ ${d} = ?`,
    answer: String(q),
    hint: 'Work left to right: hundreds, then tens, then ones. Swap anything left over into the next place.',
    explain: divSteps(n, d),
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([noExchangePicture, noExchange])();
  if (level === 1) return pick([withExchange, tensToSwap, withExchange])();
  return pick([remainder, threeDigit])();
}

export const shortDivision: Lesson = {
  id: 'short-division',
  title: 'Short Division',
  Thumb,
  Scene: ShareScene,
  sceneHint: 'Tap the button (or the blocks) to share · Change the number and groups at the bottom',
  learn: {
    heading: 'Sharing big numbers',
    intro: 'To divide a big number, share it one place at a time: tens first, then ones. When tens won’t share fairly, swap them for ones.',
    points: [
      { icon: Hand, text: 'Share the tens equally between the groups.' },
      { icon: ArrowLeftRight, text: 'Swap any tens left over for 10 ones each.' },
      { icon: Divide, text: 'Share the ones. The bus stop method writes each step.' },
      { icon: CircleDashed, text: 'Anything that can’t be shared fairly is the remainder.' },
    ],
  },
  steps: [
    'Write the number under the bus stop and the number of groups outside.',
    'Divide the tens. Write how many each group gets on top.',
    'Swap tens left over for ones: write a small digit before the ones.',
    'Divide the ones (including the swapped ones). Write the answer on top.',
    'Anything left over is the remainder, written “r”.',
  ],
  example: {
    question: 'What is 72 ÷ 3?',
    visual: <BlocksPicture hundreds={0} tens={7} ones={2} />,
    work: ['7 tens ÷ 3 = 2 tens each, with 1 ten left over.', 'Swap the 1 ten for 10 ones: 10 + 2 = 12 ones.', '12 ones ÷ 3 = 4 ones each.'],
    answer: '72 ÷ 3 = 24',
  },
  grownups: [
    'Real base-ten blocks (or bundles of 10 straws) make the “swap” concrete before the written method.',
    'Say “swap” or “exchange” rather than “carry” or “borrow”: the ten is changed for ten ones, nothing is lost.',
    'A remainder must always be smaller than the number you divide by. If it isn’t, another round of sharing is possible.',
    'Check with multiplication: 24 × 3 = 72.',
  ],
  makeQuestion,
};
