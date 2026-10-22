import { useState } from 'react';
import { Copy, FlipHorizontal, Scale, SplitSquareHorizontal } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Draggable } from '../tiny/visuals/Draggable';
import { Emoji } from '../tiny/visuals/Measure';
import { CookiesPicture, DoublePicture, mirrorCell, Plate, plateSpot } from './visuals/Doubles';
import { wrapLines } from './visuals/text';

/* ───────────────────────── Double: a mirror ───────────────────────── */

const MID = 360;
const GAP = 24;
const CELL = 56;
const TOP = 150;

/** "4 + 4 = 8" glued with non-breaking spaces so it never wraps mid-sum. */
const sum = (a: number, b: number, c: number) => `${a}\u00a0+\u00a0${b}\u00a0=\u00a0${c}`;

function Readout({ sentence, good = false }: { sentence: string; good?: boolean }) {
  const lines = wrapLines(sentence, 21);
  return (
    <g>
      <rect x={730} y={110} width={240} height={50 + lines.length * 26} rx={14} fill={good ? shade(C.green, 0.75) : C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={146 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
    </g>
  );
}

function DoublePanel() {
  const [n, setN] = useState(4);

  const set = (k: number) => {
    const next = Math.max(0, Math.min(10, k));
    if (next === n) return;
    setN(next);
    play(next > n ? 'pop' : 'tap');
  };
  const tapCell = (k: number) => set(n === k + 1 ? k : k + 1);

  const sentence =
    n === 0
      ? 'Tap the squares on the left. The mirror copies them to make a double!'
      : `Double ${n} is ${2 * n}. ${sum(n, n, 2 * n)}. And half of ${2 * n} is ${n}.`;

  const side = (s: -1 | 1) =>
    Array.from({ length: 10 }, (_, k) => {
      const { x, row } = mirrorCell(k, s, MID, GAP, CELL);
      const y = TOP + row * CELL;
      const on = k < n;
      return (
        <g key={`${s}${k}`} onClick={() => tapCell(k)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Make ${k + 1}`}>
          <rect x={x - CELL / 2} y={y} width={CELL} height={CELL} fill={C.white} stroke={C.ink} strokeWidth={2} />
          {on && <circle cx={x} cy={y + CELL / 2} r={21} fill={s < 0 ? C.blue : shade(C.blue, 0.35)} stroke={C.ink} strokeWidth={2} />}
        </g>
      );
    });

  return (
    <g>
      <text x={MID - GAP - 5 * CELL} y={TOP - 18} fontSize={16} fill={C.muted} className="caps">
        You make
      </text>
      <text x={MID + GAP + 5 * CELL} y={TOP - 18} textAnchor="end" fontSize={16} fill={C.muted} className="caps">
        The mirror makes
      </text>
      {side(-1)}
      {side(1)}
      <line x1={MID} y1={TOP - 40} x2={MID} y2={TOP + 2 * CELL + 24} stroke={C.red} strokeWidth={5} strokeDasharray="12 8" />

      <text x={MID} y={360} textAnchor="middle" fontSize={52} fontWeight={800} fill={C.ink}>
        {n} + {n} = {2 * n}
      </text>
      <text x={MID} y={410} textAnchor="middle" fontSize={26} fill={C.ink2}>
        Double {n} is {2 * n}
      </text>
      <SvgButton x={MID - 100} y={450} w={84} h={64} fontSize={36} label="−" title="One less" onClick={() => set(n - 1)} disabled={n === 0} />
      <SvgButton x={MID + 16} y={450} w={84} h={64} fontSize={36} label="+" title="One more" onClick={() => set(n + 1)} disabled={n === 10} />

      <Readout sentence={sentence} />
      <SvgButton x={730} y={420} w={240} h={50} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />

      <Callout at={[MID, TOP - 30]} box={[440, 30]} w={240} icon={FlipHorizontal} title="Mirror line" text="The mirror shows the same number again. That makes a double." />
      <Callout at={[MID + 150, 345]} box={[470, 520]} w={230} icon={Copy} title="Double = two the same" text="Double 4 is 4 + 4. Doubles are always even." />
    </g>
  );
}

/* ───────────────────────── Halve: share fairly ───────────────────────── */

type Spot = 'big' | 'L' | 'R';
const BIG = { cx: 360, cy: 180, rx: 270, ry: 82 };
const SMALL = { cy: 440, rx: 150, ry: 80 };
const PLATE_X: Record<'L' | 'R', number> = { L: 200, R: 520 };

function HalvePanel() {
  const [count, setCount] = useState(12);
  const [where, setWhere] = useState<Spot[]>(() => Array(12).fill('big'));

  const onBig = where.filter((w) => w === 'big').length;
  const l = where.filter((w) => w === 'L').length;
  const r = where.filter((w) => w === 'R').length;
  const done = onBig === 0;
  const fair = done && l === r;

  const move = (i: number, to: Spot) => {
    if (where[i] === to) return;
    const next = where.map((w, k) => (k === i ? to : w));
    setWhere(next);
    const left = next.filter((w) => w === 'L').length;
    const right = next.filter((w) => w === 'R').length;
    const finished = next.every((w) => w !== 'big');
    play(finished ? (left === right ? 'correct' : 'wrong') : 'pop');
  };
  const tap = (i: number) => move(i, where[i] === 'big' ? (l <= r ? 'L' : 'R') : 'big');
  const drop = (i: number, p: Pt) => move(i, p.y > SMALL.cy - SMALL.ry - 40 ? (p.x < MID ? 'L' : 'R') : 'big');

  const newNumber = () => {
    let m = count;
    while (m === count) m = rand(2, 10) * 2;
    setCount(m);
    setWhere(Array(m).fill('big'));
    play('whoosh');
  };

  const sentence = fair
    ? `Fair! Each plate has ${l}. Half of ${count} is ${l}, because ${sum(l, l, count)}.`
    : done
      ? `Not fair: ${l} and ${r}. Move a cookie across so both plates are the same.`
      : l + r === 0
        ? `Share the ${count} cookies fairly between the two plates. Tap a cookie, or drag it to a plate.`
        : `${l} and ${r} so far. ${onBig} still to share.`;

  // Each cookie's place depends on its order among the cookies in the same spot.
  const spotOf = (i: number) => {
    const w = where[i];
    const k = where.slice(0, i).filter((x) => x === w).length;
    if (w === 'big') return plateSpot(k, onBig, BIG.cx, BIG.cy, 10, 50);
    const n = w === 'L' ? l : r;
    return plateSpot(k, n, PLATE_X[w], SMALL.cy, 5, 50);
  };

  return (
    <g>
      <Plate cx={BIG.cx} cy={BIG.cy} rx={BIG.rx} ry={BIG.ry} />
      <Plate cx={PLATE_X.L} cy={SMALL.cy} rx={SMALL.rx} ry={SMALL.ry} glow={fair ? C.green : undefined} />
      <Plate cx={PLATE_X.R} cy={SMALL.cy} rx={SMALL.rx} ry={SMALL.ry} glow={fair ? C.green : undefined} />
      {(['L', 'R'] as const).map((s) => (
        <text key={s} x={PLATE_X[s]} y={SMALL.cy + SMALL.ry + 50} textAnchor="middle" fontSize={36} fontWeight={800} fill={done && !fair ? C.red : C.ink}>
          {s === 'L' ? l : r}
        </text>
      ))}
      {done && (
        <text x={MID} y={SMALL.cy + SMALL.ry + 50} textAnchor="middle" fontSize={36} fontWeight={800} fill={fair ? shade(C.green, -0.2) : C.red}>
          {fair ? '=' : '≠'}
        </text>
      )}
      {where.map((_, i) => {
        const p = spotOf(i);
        return (
          <Draggable key={`${count}-${i}`} x={p.x} y={p.y} label={where[i] === 'big' ? 'Share this cookie' : 'Put this cookie back'} onTap={() => tap(i)} onDrop={(q) => drop(i, q)}>
            <g style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 0.3s ease' }}>
              <Emoji char="🍪" x={0} y={0} size={42} />
            </g>
          </Draggable>
        );
      })}

      <Readout sentence={sentence} good={fair} />
      <SvgButton x={730} y={420} w={240} h={52} fontSize={18} label="New number" onClick={newNumber} color={C.teal} textColor={C.white} />
      <SvgButton
        x={730}
        y={486}
        w={116}
        h={50}
        fontSize={17}
        label="Again"
        title="Put all the cookies back"
        disabled={l + r === 0}
        onClick={() => {
          setWhere(Array(count).fill('big'));
          play('whoosh');
        }}
      />
      <SvgButton x={854} y={486} w={116} h={50} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />

      <Callout at={[PLATE_X.L - 60, SMALL.cy + SMALL.ry - 8]} box={[30, 590]} w={230} icon={Scale} title="Fair share" text="Half means 2 equal groups. Both plates must have the same number." />
      <Callout at={[PLATE_X.R + 60, SMALL.cy + SMALL.ry - 8]} box={[440, 590]} w={250} icon={SplitSquareHorizontal} title="Halving undoes doubling" text="Half of 12 is 6, because double 6 is 12." />
    </g>
  );
}

type Mode = 'double' | 'halve';

function DoublingHalvingScene() {
  const [mode, setMode] = useState<Mode>('double');
  return (
    <SceneSvg label={mode === 'double' ? 'Two frames with a mirror line between them, for making doubles' : 'A plate of cookies to share fairly between two plates'}>
      <SvgButton x={730} y={30} w={116} h={52} fontSize={18} label="Double" onClick={() => setMode('double')} active={mode === 'double'} color={mode === 'double' ? C.yellow : C.card} />
      <SvgButton x={854} y={30} w={116} h={52} fontSize={18} label="Halve" onClick={() => setMode('halve')} active={mode === 'halve'} color={mode === 'halve' ? C.yellow : C.card} />
      {mode === 'double' ? <DoublePanel /> : <HalvePanel />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={60} y1={8} x2={60} y2={72} stroke={C.red} strokeWidth={2.5} strokeDasharray="6 4" />
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <circle cx={46 - k * 15} cy={30} r={6.5} fill={C.blue} stroke={C.ink} strokeWidth={1.2} />
          <circle cx={74 + k * 15} cy={30} r={6.5} fill={shade(C.blue, 0.35)} stroke={C.ink} strokeWidth={1.2} />
        </g>
      ))}
      <text x={60} y={64} textAnchor="middle" fontSize={16} fontWeight={800} fill={C.ink}>
        3 + 3 = 6
      </text>
    </svg>
  );
}

/* ───────────────────────── Practice ───────────────────────── */

function doubleQuestion(n: number): Question {
  return {
    prompt: `What is double ${n}?`,
    visual: n <= 10 ? <DoublePicture n={n} /> : undefined,
    choices: numberChoices(2 * n, { count: 3, min: 0, max: 2 * n + 4 }).map((value) => ({ value })),
    answer: String(2 * n),
    hint: n <= 10 ? 'Double means the same number again. Count both sides of the mirror.' : 'Double the tens, then double the ones.',
    explain:
      n <= 10
        ? [`Double ${n} means ${n} and ${n} more.`, `${n} + ${n} = ${2 * n}.`, `So double ${n} is ${2 * n}.`]
        : [`Double the tens: 10 + 10 = 20.`, `Double the ones: ${n - 10} + ${n - 10} = ${2 * (n - 10)}.`, `20 + ${2 * (n - 10)} = ${2 * n}, so double ${n} is ${2 * n}.`],
  };
}

function halfQuestion(total: number): Question {
  const h = total / 2;
  return {
    prompt: `What is half of ${total}?`,
    visual: total <= 20 ? <CookiesPicture n={total} /> : undefined,
    choices: numberChoices(h, { count: 3, min: 1, max: h + 6 }).map((value) => ({ value })),
    answer: String(h),
    hint: total <= 20 ? 'Share them into 2 equal groups. Or think: which double makes this number?' : `Which double makes ${total}?`,
    explain: [`Share ${total} into 2 equal groups.`, `${h} + ${h} = ${total}, so each group has ${h}.`, `So half of ${total} is ${h}.`],
  };
}

function nearDoubleQuestion(): Question {
  const n = rand(3, 9);
  const sum = 2 * n + 1;
  return {
    prompt: `${n} + ${n + 1} = ?`,
    visual: <DoublePicture n={n} right={n + 1} />,
    choices: numberChoices(sum, { count: 3, min: 0, max: sum + 4 }).map((value) => ({ value })),
    answer: String(sum),
    hint: `Use a double you know: ${n} + ${n}. Then add one more.`,
    explain: [`${n} + ${n} = ${2 * n} is a double.`, `${n + 1} is one more than ${n}, so add 1 more.`, `${2 * n} + 1 = ${sum}, so ${n} + ${n + 1} = ${sum}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return doubleQuestion(rand(1, 5));
  if (level === 1) return Math.random() < 0.5 ? halfQuestion(rand(2, 10) * 2) : doubleQuestion(rand(6, 10));
  const r = Math.random();
  if (r < 0.4) return nearDoubleQuestion();
  if (r < 0.7) return halfQuestion(pick([20, 30, 40, 50, 60, 80, 100]));
  return doubleQuestion(rand(11, 14));
}

export const doublingHalving: Lesson = {
  id: 'doubling-halving',
  title: 'Doubles and Halves',
  Thumb,
  Scene: DoublingHalvingScene,
  sceneHint: 'Make a double in the mirror · Share cookies fairly',
  learn: {
    heading: 'Doubles and halves',
    intro: 'To double a number, add the same number again: double 4 is 4 + 4 = 8. To halve a number, share it into 2 equal groups: half of 8 is 4.',
    points: [
      { icon: Copy, text: 'Double means two the same: double 6 is 6 + 6 = 12.' },
      { icon: Scale, text: 'Half means 2 equal groups: half of 12 is 6.' },
      { icon: SplitSquareHorizontal, text: 'Halving undoes doubling. Know one and you know the other!' },
    ],
  },
  steps: ['To double, add the number to itself.', 'To halve, share into 2 equal groups.', 'Check: double your half to get back where you started.', 'For 6 + 7, use the double 6 + 6, then add one more.'],
  example: {
    question: 'What is half of 14?',
    visual: <CookiesPicture n={14} />,
    work: ['Share the 14 cookies onto 2 plates, one at a time.', 'Each plate gets 7.', 'Check: double 7 is 7 + 7 = 14.'],
    answer: 'Half of 14 is 7.',
  },
  grownups: [
    'Practise doubles with fingers: show 3 on each hand. Double 3 is 6!',
    'Share snacks fairly between two people and ask: “What is half of 10?”',
    'Once doubles are quick, near doubles follow: 7 + 8 is double 7 and one more.',
  ],
  makeQuestion,
};
