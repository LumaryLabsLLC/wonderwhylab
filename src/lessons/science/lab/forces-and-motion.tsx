import { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Gauge, Package, Scale } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { NumberCard, SceneSvg, SvgButton } from '../../../stage/widgets';
import { WrapText } from './visuals/Draggable';

const TRACK = { x0: 90, x1: 940, y: 330 };
const UNITS_PER_M = 100;
const START_X = TRACK.x0 + 60;

/** Speed straight after the push: more force → faster; more mass → slower (a = F ÷ m). */
const launchSpeed = (force: number, mass: number) => (170 * force) / mass;

function Cart({ x, load, color = C.blue }: { x: number; load: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${TRACK.y})`}>
      {Array.from({ length: load }, (_, i) => (
        <g key={i} transform={`translate(${-36 + (i % 2) * 38} ${-74 - Math.floor(i / 2) * 32})`}>
          <rect width={34} height={30} rx={4} fill={C.wood} stroke={C.ink} strokeWidth={2} />
          <path d="M0,10 L34,10" stroke={shade(C.wood, -0.25)} strokeWidth={2} />
        </g>
      ))}
      <rect x={-48} y={-44} width={96} height={34} rx={8} fill={color} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={-26} cy={-6} r={11} fill={C.ink} />
      <circle cx={26} cy={-6} r={11} fill={C.ink} />
      <circle cx={-26} cy={-6} r={4} fill={C.white} />
      <circle cx={26} cy={-6} r={4} fill={C.white} />
    </g>
  );
}

function Arrow({ x, y, length, dir = 1, color = C.red, label }: { x: number; y: number; length: number; dir?: 1 | -1; color?: string; label?: string }) {
  if (length <= 0) return null;
  const x2 = x + dir * length;
  return (
    <g>
      <line x1={x} y1={y} x2={x2 - dir * 14} y2={y} stroke={color} strokeWidth={10} strokeLinecap="round" />
      <path d={`M${x2},${y} l${-dir * 20},-14 v28 z`} fill={color} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      {label && (
        <text x={(x + x2) / 2} y={y - 14} textAnchor="middle" fontSize={16} fontWeight={700} fill={shade(color, -0.3)}>
          {label}
        </text>
      )}
    </g>
  );
}

function Person({ x, y, flip = false, color }: { x: number; y: number; flip?: boolean; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <circle cx={0} cy={-58} r={11} fill="#f4c9a0" stroke={C.ink} strokeWidth={2} />
      <path d="M0,-46 L-8,-14 M0,-46 L14,-30 M-8,-14 L-18,6 M-8,-14 L4,6" stroke={C.ink} strokeWidth={4} strokeLinecap="round" fill="none" />
      <path d="M-4,-44 L-10,-14" stroke={color} strokeWidth={10} strokeLinecap="round" />
    </g>
  );
}

type Mode = 'push' | 'tug';
interface Run {
  force: number;
  load: number;
  metres: number;
}

/** Predict → observe → explain challenges. Each one names what to try. */
const CHALLENGES = [
  {
    mode: 'push' as Mode,
    question: 'More boxes, same push: as far?',
    options: ['Farther', 'Not as far', 'The same'],
    actual: 'Not as far',
    todo: 'Push with no boxes, then add boxes and push again with the same force.',
    because: 'More mass speeds up less from the same push, so it rolls less far.',
  },
  {
    mode: 'push' as Mode,
    question: 'Bigger push, same cart: farther?',
    options: ['Farther', 'Not as far', 'The same'],
    actual: 'Farther',
    todo: 'Push once, then make the push bigger and push the same cart again.',
    because: 'A bigger force makes the same cart speed up more, so it rolls farther.',
  },
  {
    mode: 'tug' as Mode,
    question: '3 pull left, 3 pull right. Then?',
    options: ['Goes left', 'Goes right', 'Stays still'],
    actual: 'Stays still',
    todo: 'The teams are set to 3 and 3. Press Pull!',
    because: 'Equal pulls in opposite directions are balanced forces, so nothing moves.',
  },
];

function ForcesScene() {
  const [mode, setMode] = useState<Mode>('push');
  const [force, setForce] = useState(3);
  const [load, setLoad] = useState(0);
  const [x, setX] = useState(START_X);
  const [rolling, setRolling] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [left, setLeft] = useState(3);
  const [right, setRight] = useState(2);
  const [knot, setKnot] = useState(0);
  const [pulled, setPulled] = useState<{ l: number; r: number } | null>(null);
  const [cIdx, setCIdx] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const raf = useRef(0);
  const mass = 1 + load;
  const challenge = CHALLENGES[cIdx];

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const push = () => {
    cancelAnimationFrame(raf.current);
    const v0 = launchSpeed(force, mass);
    const run = { force, load };
    let v = v0;
    let pos = START_X;
    let last = performance.now();
    setRolling(true);
    setX(START_X);
    play('whoosh');
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      pos += v * dt;
      v -= v * 1.0 * dt; // rolling resistance slows the cart
      const end = TRACK.x1 - 60;
      if (pos >= end) {
        pos = end;
        v = 0;
      }
      setX(pos);
      if (v > 4) raf.current = requestAnimationFrame(step);
      else {
        setRolling(false);
        setRuns((r) => [...r.slice(-3), { ...run, metres: Math.round(((pos - START_X) / UNITS_PER_M) * 10) / 10 }]);
        play('pop');
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const resetCart = () => {
    cancelAnimationFrame(raf.current);
    setRolling(false);
    setX(START_X);
  };

  const net = left - right;
  const pull = () => {
    setKnot(Math.max(-1, Math.min(1, Math.sign(net))) * Math.min(160, Math.abs(net) * 50));
    setPulled({ l: left, r: right });
    play(net === 0 ? 'tap' : 'whoosh');
  };

  const switchMode = (m: Mode) => {
    resetCart();
    setMode(m);
    setKnot(0);
    play('tap');
  };

  // Has the predicted experiment been done (since the prediction)?
  const last2 = runs.slice(-2);
  const observedNow =
    guess !== null &&
    (cIdx === 0
      ? last2.length === 2 && last2[0].force === last2[1].force && last2[0].load < last2[1].load
      : cIdx === 1
        ? last2.length === 2 && last2[0].load === last2[1].load && last2[0].force < last2[1].force
        : pulled !== null && pulled.l === 3 && pulled.r === 3);
  // Keep the explanation up once the test has happened, until they ask for another.
  const [observed, setObserved] = useState(false);
  useEffect(() => {
    if (observedNow) setObserved(true);
  }, [observedNow]);

  const predict = (o: string) => {
    setGuess(o);
    setRuns([]);
    setPulled(null);
    resetCart();
    setMode(challenge.mode);
    if (challenge.mode === 'tug') {
      setLeft(3);
      setRight(3);
      setKnot(0);
    } else {
      setLoad(0);
    }
    play('tap');
  };

  return (
    <SceneSvg label="Push a cart with different forces and loads, or try a tug of war.">
      <SvgButton x={40} y={24} w={170} h={50} fontSize={18} label="Push a cart" onClick={() => switchMode('push')} active={mode === 'push'} color={mode === 'push' ? C.yellow : C.card} />
      <SvgButton x={222} y={24} w={170} h={50} fontSize={18} label="Tug of war" onClick={() => switchMode('tug')} active={mode === 'tug'} color={mode === 'tug' ? C.yellow : C.card} />

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard
          x={600}
          y={20}
          w={370}
          prediction={guess}
          actual={challenge.actual}
          because={challenge.because}
          onAgain={() => {
            setGuess(null);
            setObserved(false);
            setCIdx((cIdx + 1) % CHALLENGES.length);
          }}
        />
      ) : (
        <g>
          <PredictCard x={600} y={20} w={370} question={challenge.question} options={challenge.options} prediction={guess} onPredict={predict} />
          {guess !== null && <WrapText x={612} y={140} width={350} fontSize={15} fill={C.ink2} text={challenge.todo} />}
        </g>
      )}

      {mode === 'push' ? (
        <g>
          {/* Track */}
          <line x1={TRACK.x0} y1={TRACK.y} x2={TRACK.x1} y2={TRACK.y} stroke={C.ink} strokeWidth={4} />
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i}>
              <line x1={START_X + i * UNITS_PER_M} y1={TRACK.y + 6} x2={START_X + i * UNITS_PER_M} y2={TRACK.y + 16} stroke={C.muted} strokeWidth={2} />
              <text x={START_X + i * UNITS_PER_M} y={TRACK.y + 34} textAnchor="middle" fontSize={14} fill={C.muted}>
                {i} m
              </text>
            </g>
          ))}
          {!rolling && x === START_X && <Arrow x={TRACK.x0 + 8 - 10 * force} y={TRACK.y - 30} length={10 * force + 0.1} label={`${force * 10} N`} />}
          <Cart x={x} load={load} />

          {/* Controls */}
          <text x={110} y={420} fontSize={15} fill={C.muted} className="caps">Push force</text>
          <SvgButton x={110} y={432} w={56} h={50} label="−" title="Smaller push" onClick={() => setForce(Math.max(1, force - 1))} disabled={force <= 1 || rolling} />
          <text x={206} y={466} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>{force * 10} N</text>
          <SvgButton x={246} y={432} w={56} h={50} label="+" title="Bigger push" onClick={() => setForce(Math.min(5, force + 1))} disabled={force >= 5 || rolling} color={C.yellow} />
          <text x={350} y={420} fontSize={15} fill={C.muted} className="caps">Load</text>
          <SvgButton x={350} y={432} w={56} h={50} label="−" title="Take a box off" onClick={() => setLoad(Math.max(0, load - 1))} disabled={load <= 0 || rolling} />
          <text x={462} y={466} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>{load} {load === 1 ? 'box' : 'boxes'}</text>
          <SvgButton x={516} y={432} w={56} h={50} label="+" title="Add a box" onClick={() => setLoad(Math.min(3, load + 1))} disabled={load >= 3 || rolling} color={C.yellow} />
          <SvgButton x={600} y={432} w={150} h={50} fontSize={20} label="Push!" onClick={push} disabled={rolling} color={C.teal} textColor={C.white} />
          <SvgButton x={764} y={432} w={110} h={50} fontSize={17} label="Back" title="Put the cart back" onClick={resetCart} disabled={rolling || x === START_X} />

          {/* Results */}
          <text x={110} y={540} fontSize={15} fill={C.muted} className="caps">Your pushes</text>
          {runs.length === 0 ? (
            <text x={110} y={570} fontSize={16} fill={C.ink2}>Push the cart to see how far it rolls.</text>
          ) : (
            runs.map((r, i) => (
              <text key={i} x={110 + i * 210} y={572} fontSize={16} fill={i === runs.length - 1 ? C.ink : C.ink2} fontWeight={i === runs.length - 1 ? 700 : 400}>
                {r.force * 10} N, {r.load} {r.load === 1 ? 'box' : 'boxes'}: {r.metres} m
              </text>
            ))
          )}
          <NumberCard x={110} y={120} w={130} h={96} value={mass} caption="mass (kg)" />
        </g>
      ) : (
        <g>
          {/* Tug of war */}
          <g style={{ transform: `translateX(${knot}px)`, transition: 'transform 0.8s cubic-bezier(.3,1.4,.5,1)' }}>
            <line x1={210} y1={420} x2={790} y2={420} stroke={C.brown} strokeWidth={8} strokeLinecap="round" />
            <circle cx={500} cy={420} r={12} fill={C.red} stroke={C.ink} strokeWidth={2.5} />
            {Array.from({ length: left }, (_, i) => (
              <Person key={`l${i}`} x={420 - 44 - i * 42} y={470} color={C.blue} />
            ))}
            {Array.from({ length: right }, (_, i) => (
              <Person key={`r${i}`} x={580 + 44 + i * 42} y={470} flip color={C.orange} />
            ))}
          </g>
          <line x1={500} y1={385} x2={500} y2={480} stroke={C.ink} strokeWidth={2} strokeDasharray="4 5" />
          <Arrow x={470} y={330} length={left * 22} dir={-1} color={C.blue} label={`${left * 10} N`} />
          <Arrow x={530} y={330} length={right * 22} dir={1} color={C.orange} label={`${right * 10} N`} />
          <text x={140} y={528} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">Left team</text>
          <SvgButton x={84} y={540} w={54} h={48} label="−" title="Fewer on the left" onClick={() => { setLeft(Math.max(1, left - 1)); setKnot(0); }} disabled={left <= 1} />
          <SvgButton x={144} y={540} w={54} h={48} label="+" title="More on the left" onClick={() => { setLeft(Math.min(5, left + 1)); setKnot(0); }} disabled={left >= 5} color={C.yellow} />
          <text x={860} y={528} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">Right team</text>
          <SvgButton x={802} y={540} w={54} h={48} label="−" title="Fewer on the right" onClick={() => { setRight(Math.max(1, right - 1)); setKnot(0); }} disabled={right <= 1} />
          <SvgButton x={862} y={540} w={54} h={48} label="+" title="More on the right" onClick={() => { setRight(Math.min(5, right + 1)); setKnot(0); }} disabled={right >= 5} color={C.yellow} />
          <SvgButton x={420} y={540} w={160} h={50} fontSize={20} label="Pull!" onClick={pull} color={C.teal} textColor={C.white} />
          <text x={500} y={628} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.ink2}>
            {net === 0 ? 'Balanced forces: the rope stays still.' : `Unbalanced: ${Math.abs(net) * 10} N overall to the ${net > 0 ? 'left' : 'right'}.`}
          </text>
        </g>
      )}

      {mode === 'push' ? (
        <>
          <Callout at={[TRACK.x0 + 20, TRACK.y - 30]} box={[260, 220]} w={220} icon={Gauge} title="Bigger push" text="A bigger force makes the cart speed up faster." />
          <Callout at={[516, 457]} box={[600, 600]} w={230} icon={Package} title="More mass" text="A heavier cart speeds up more slowly with the same push." />
        </>
      ) : (
        <Callout at={[500, 420]} box={[600, 240]} w={230} icon={Scale} title="Balanced?" text="Equal pulls cancel out. Unequal pulls make things move." />
      )}
    </SceneSvg>
  );
}

function TugPicture({ left, right }: { left: number; right: number }) {
  return (
    <svg viewBox="0 0 360 120" role="img" aria-label={`Left team pulls ${left} newtons, right team pulls ${right} newtons`}>
      <line x1={40} y1={70} x2={320} y2={70} stroke={C.brown} strokeWidth={6} strokeLinecap="round" />
      <circle cx={180} cy={70} r={8} fill={C.red} stroke={C.ink} strokeWidth={2} />
      <Arrow x={160} y={36} length={Math.min(140, left * 2.2)} dir={-1} color={C.blue} label={`${left} N`} />
      <Arrow x={200} y={36} length={Math.min(140, right * 2.2)} dir={1} color={C.orange} label={`${right} N`} />
      <text x={40} y={108} fontSize={15} fill={C.ink2}>Left team</text>
      <text x={320} y={108} fontSize={15} fill={C.ink2} textAnchor="end">Right team</text>
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={8} y1={62} x2={112} y2={62} stroke={C.ink} strokeWidth={3} />
      <rect x={50} y={36} width={46} height={18} rx={4} fill={C.blue} stroke={C.ink} strokeWidth={2} />
      <circle cx={60} cy={58} r={6} fill={C.ink} />
      <circle cx={86} cy={58} r={6} fill={C.ink} />
      <line x1={14} y1={45} x2={36} y2={45} stroke={C.red} strokeWidth={6} strokeLinecap="round" />
      <path d="M46,45 l-12,-9 v18 z" fill={C.red} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['push', 'mass']) : level === 1 ? pick(['tug', 'pushN', 'mass3']) : pick(['net', 'balanced', 'still', 'tug']);

  if (kind === 'push') {
    const right = 'A strong push';
    return {
      prompt: 'Which push makes a toy cart speed up the most?',
      choices: choices(shuffle([right, 'A gentle push', 'No push at all'])),
      answer: right,
      hint: 'A bigger force gives a bigger change in speed.',
      explain: ['A push is a force.', 'The bigger the force, the more the cart speeds up.', 'So a strong push wins.'],
    };
  }

  if (kind === 'mass' || kind === 'mass3') {
    const right = 'The empty cart';
    const opts = kind === 'mass' ? [right, 'The cart full of bricks'] : [right, 'The cart full of bricks', 'They speed up the same'];
    return {
      prompt: 'Two carts get exactly the same push. Which one speeds up more?',
      choices: choices(shuffle(opts)),
      answer: right,
      hint: 'Think about which one is harder to get moving.',
      explain: ['Both carts get the same force.', 'More mass makes a cart speed up more slowly.', 'So the empty cart speeds up more.'],
    };
  }

  if (kind === 'pushN') {
    const a = rand(1, 4) * 10;
    const b = a + rand(1, 3) * 10;
    const right = `The ${b} N push`;
    return {
      prompt: `The same cart is pushed with ${a} N and then with ${b} N. Which push makes it speed up faster?`,
      choices: choices(shuffle([right, `The ${a} N push`, 'They are the same'])),
      answer: right,
      hint: 'N (newtons) measures how big a force is.',
      explain: [`Newtons measure force: ${b} N is bigger than ${a} N.`, 'The cart is the same, so the bigger force speeds it up more.', `So the ${b} N push wins.`],
    };
  }

  if (kind === 'tug') {
    const l = rand(2, 6) * 10;
    let r = rand(2, 6) * 10;
    if (level === 1 && rand(0, 3) === 0) r = l;
    const right = l === r ? 'It does not move' : l > r ? 'Towards the left team' : 'Towards the right team';
    return {
      prompt: 'Which way does the rope move?',
      visual: <TugPicture left={l} right={r} />,
      choices: choices(['Towards the left team', 'Towards the right team', 'It does not move']),
      answer: right,
      hint: 'Compare the two pulls. Are they equal?',
      explain:
        l === r
          ? [`Left pulls ${l} N and right pulls ${r} N.`, 'The forces are equal, so they are balanced.', 'So it does not move.']
          : [`Left pulls ${l} N and right pulls ${r} N.`, `The ${l > r ? 'left' : 'right'} pull is bigger, so the forces are unbalanced.`, `So the rope moves ${right.toLowerCase()}.`],
    };
  }

  if (kind === 'net') {
    const big = rand(4, 9) * 10;
    const small = rand(1, big / 10 - 1) * 10;
    const leftBig = rand(0, 1) === 1;
    const [l, r] = leftBig ? [big, small] : [small, big];
    const ans = big - small;
    return {
      prompt: `Left pulls ${l} N, right pulls ${r} N. What is the overall force in newtons?`,
      visual: <TugPicture left={l} right={r} />,
      answer: String(ans),
      hint: 'The pulls work against each other. Find the difference.',
      explain: ['Opposite forces partly cancel.', `${big} − ${small} = ${ans}`, `The overall force is ${ans} N towards the ${leftBig ? 'left' : 'right'}.`],
    };
  }

  if (kind === 'balanced') {
    const l = rand(2, 7) * 10;
    const r = rand(0, 1) ? l : rand(2, 7) * 10;
    const answer = l === r ? 'Balanced' : 'Unbalanced';
    return {
      prompt: `A box is pushed ${l} N to the left and ${r} N to the right. Are the forces balanced or unbalanced?`,
      visual: <TugPicture left={l} right={r} />,
      choices: choices(['Balanced', 'Unbalanced']),
      answer,
      hint: 'Balanced forces are the same size, pulling opposite ways.',
      explain: [`Left: ${l} N. Right: ${r} N.`, l === r ? 'They are equal, so they cancel out.' : 'They are different, so they do not cancel.', `So they are ${answer.toLowerCase()}.`],
    };
  }

  // 'still'
  const right = 'It stays still';
  return {
    prompt: 'A box is sitting still and the forces on it are balanced. What happens to it?',
    choices: choices(shuffle([right, 'It starts moving left', 'It speeds up'])),
    answer: right,
    hint: 'Balanced forces cancel each other out.',
    explain: ['Balanced forces cancel, so there is no overall force.', 'With no overall force, its motion does not change.', 'So it stays still.'],
  };
}

export const forcesAndMotion: Lesson = {
  id: 'forces-and-motion',
  title: 'Forces and Motion',
  Thumb,
  Scene: ForcesScene,
  sceneHint: 'Predict first · Then push the cart or pull the rope to find out',
  learn: {
    heading: 'Pushes and pulls',
    intro:
      'A force is a push or a pull. Forces can start things moving, speed them up, slow them down or change their direction. We measure forces in newtons (N).',
    points: [
      { icon: Gauge, text: 'A bigger force makes things speed up faster.' },
      { icon: Package, text: 'More mass means a slower speed-up for the same force.' },
      { icon: ArrowRightLeft, text: 'Equal, opposite forces are balanced: nothing changes.' },
    ],
  },
  steps: [
    'Find all the forces: which way does each one push or pull?',
    'Compare their sizes in newtons.',
    'Equal and opposite? They are balanced, so the motion stays the same.',
    'Not equal? The bigger force wins, and things speed up, slow down or turn that way.',
  ],
  example: {
    question: 'In a tug of war, the left team pulls 40 N and the right team pulls 25 N. What happens?',
    visual: <TugPicture left={40} right={25} />,
    work: ['The forces are not equal, so they are unbalanced.', '40 − 25 = 15, so there is 15 N overall towards the left.'],
    answer: 'The rope moves towards the left team.',
  },
  grownups: [
    'Push a toy car gently and then harder on a smooth floor, then add some books to it, and compare how fast it gets going.',
    'Children often think a moving thing needs a force to keep going. In fact friction slows it down. On ice things glide much further.',
    'Newtons measure force. An apple weighs about 1 N.',
  ],
  makeQuestion,
};
