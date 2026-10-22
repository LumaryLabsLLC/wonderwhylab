import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, Cog, Mountain, Scale } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { WrapText } from './visuals/Draggable';

type Machine = 'lever' | 'pulley' | 'ramp' | 'wheel';

/**
 * Ideal simple machines (no friction): force × distance stays the same, so a machine that needs
 * less force makes you move farther. `settings[0]` is always "no help" so children can compare.
 */
interface MachineInfo {
  title: string;
  load: number; // newtons
  settings: number[]; // effort arm (m) / supporting ropes / ramp length (m) / wheel size (× axle)
  settingLabel: (v: number) => string;
  control: string;
  question: string;
  because: string;
  /** Load lifted (in m) for one "Lift!". */
  lift: number;
}

const MACHINES: Record<Machine, MachineInfo> = {
  lever: {
    title: 'Lever',
    load: 60,
    settings: [1, 2, 3, 4],
    settingLabel: (v) => `Push ${v} m from the pivot`,
    control: 'Where you push',
    question: 'Push farther out. Easier?',
    because: 'Pushing farther from the pivot needs less force, but your end moves farther.',
    lift: 0.1,
  },
  pulley: {
    title: 'Pulley',
    load: 80,
    settings: [1, 2, 4],
    settingLabel: (v) => `${v} rope${v === 1 ? '' : 's'} holding the load`,
    control: 'Ropes holding the load',
    question: 'More ropes. Easier to lift?',
    because: 'More ropes share the load, so you pull with less force, but you pull more rope.',
    lift: 1,
  },
  ramp: {
    title: 'Ramp',
    load: 100,
    settings: [1, 2, 4],
    settingLabel: (v) => (v === 1 ? 'No ramp: lift straight up' : `A ${v} m long ramp`),
    control: 'Ramp length',
    question: 'A longer ramp. Easier?',
    because: 'A longer, gentler ramp needs less force, but you push the box a longer way.',
    lift: 1,
  },
  wheel: {
    title: 'Wheel and axle',
    load: 40,
    settings: [1, 2, 4],
    settingLabel: (v) => (v === 1 ? 'No wheel: turn the axle' : `Wheel ${v} times as wide as the axle`),
    control: 'Wheel size',
    question: 'A bigger wheel. Easier?',
    because: 'Turning a bigger wheel needs less force, but your hand goes round a longer way.',
    lift: 1,
  },
};

const ORDER: Machine[] = ['lever', 'pulley', 'ramp', 'wheel'];

const forceFor = (m: Machine, v: number) => Math.round(MACHINES[m].load / v);
const distanceFor = (m: Machine, v: number) => Math.round(MACHINES[m].lift * v * 100) / 100;

function Box({ x, y, w = 70, h = 56, label }: { x: number; y: number; w?: number; h?: number; label: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${x - w / 2},${y - h / 2} L${x + w / 2},${y - h / 2}`} stroke={shade(C.wood, -0.25)} strokeWidth={2} />
      <text x={x} y={y - h / 2 - 6} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
        {label}
      </text>
    </g>
  );
}

function DownArrow({ x, y, len, label }: { x: number; y: number; len: number; label: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + len - 12} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
      <path d={`M${x},${y + len} l-12,-16 h24 z`} fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <text x={x + 14} y={y + len / 2} fontSize={17} fontWeight={700} fill={shade(C.red, -0.3)}>
        {label}
      </text>
    </g>
  );
}

/** The machine drawn mid-lift: p goes 0 → 1. */
function MachineDrawing({ m, v, p }: { m: Machine; v: number; p: number }) {
  const force = forceFor(m, v);
  if (m === 'lever') {
    const ground = 460;
    const pivot = { x: 200, y: 330 };
    const unit = 80;
    const rise = 26 * p; // how far the load end rises (drawn); the far end drops up to 4 × as much
    const phi = Math.asin(rise / unit) * (180 / Math.PI);
    return (
      <g>
        <line x1={60} y1={ground} x2={600} y2={ground} stroke={C.ink} strokeWidth={3} />
        <path d={`M${pivot.x - 34},${ground} L${pivot.x},${pivot.y + 6} L${pivot.x + 34},${ground} Z`} fill={C.blue} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <g transform={`rotate(${phi} ${pivot.x} ${pivot.y})`}>
          <rect x={pivot.x - unit - 30} y={pivot.y - 6} width={unit + 30 + v * unit + 20} height={12} rx={5} fill={C.brown} stroke={C.ink} strokeWidth={2} />
          {[1, 2, 3, 4].filter((k) => k <= v).map((k) => (
            <text key={k} x={pivot.x + k * unit} y={pivot.y + 30} textAnchor="middle" fontSize={13} fill={C.muted}>
              {k} m
            </text>
          ))}
          <g transform={`rotate(${-phi} ${pivot.x - unit} ${pivot.y - 6})`}>
            <Box x={pivot.x - unit} y={pivot.y - 6} label={`${MACHINES.lever.load} N`} />
          </g>
          <circle cx={pivot.x + v * unit} cy={pivot.y - 16} r={10} fill="#f4c9a0" stroke={C.ink} strokeWidth={2} />
          <g transform={`rotate(${-phi} ${pivot.x + v * unit} ${pivot.y - 30})`}>
            <DownArrow x={pivot.x + v * unit} y={pivot.y - 120} len={88} label={`${force} N`} />
          </g>
        </g>
        <text x={pivot.x} y={ground + 24} textAnchor="middle" fontSize={15} fill={C.ink2}>
          pivot
        </text>
      </g>
    );
  }
  if (m === 'pulley') {
    const beamY = 120;
    const liftPx = 60 * p;
    const loadBottom = 470 - liftPx;
    const handY = 200 + v * 60 * p; // rope pulled = ropes × height lifted
    const ropes = v;
    const blockX = 300;
    const spread = 18;
    const xs = Array.from({ length: ropes }, (_, i) => blockX - ((ropes - 1) * spread) / 2 + i * spread);
    return (
      <g>
        <rect x={140} y={beamY - 22} width={340} height={22} rx={4} fill={C.brown} stroke={C.ink} strokeWidth={2.5} />
        {/* Top block */}
        <rect x={blockX - 34} y={beamY + 8} width={68} height={ropes > 1 ? 44 : 40} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={blockX} cy={beamY + 30} r={14} fill={C.muted} stroke={C.ink} strokeWidth={2} />
        {/* Ropes holding the load */}
        {ropes === 1 ? (
          <line x1={blockX - 14} y1={beamY + 30} x2={blockX - 14} y2={loadBottom - 56} stroke={C.orange} strokeWidth={4} />
        ) : (
          <>
            {xs.map((x, i) => (
              <line key={i} x1={x} y1={beamY + 52} x2={x} y2={loadBottom - 92} stroke={C.orange} strokeWidth={4} />
            ))}
            <rect x={blockX - 34} y={loadBottom - 100} width={68} height={40} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
            <circle cx={blockX} cy={loadBottom - 80} r={12} fill={C.muted} stroke={C.ink} strokeWidth={2} />
            <line x1={blockX} y1={loadBottom - 60} x2={blockX} y2={loadBottom - 56} stroke={C.ink} strokeWidth={3} />
          </>
        )}
        <Box x={ropes === 1 ? blockX - 14 : blockX} y={loadBottom} label={`${MACHINES.pulley.load} N`} />
        {/* Free end to the hand */}
        <line x1={blockX + 14} y1={beamY + 30} x2={blockX + 120} y2={handY} stroke={C.orange} strokeWidth={4} />
        <circle cx={blockX + 120} cy={handY} r={11} fill="#f4c9a0" stroke={C.ink} strokeWidth={2} />
        <DownArrow x={blockX + 150} y={handY - 30} len={70} label={`${force} N`} />
        <line x1={60} y1={472} x2={600} y2={472} stroke={C.ink} strokeWidth={3} />
        <text x={blockX} y={498} textAnchor="middle" fontSize={15} fill={C.ink2}>
          {ropes} rope{ropes === 1 ? '' : 's'} hold the load
        </text>
      </g>
    );
  }
  if (m === 'ramp') {
    const ground = 470;
    const top = ground - 100; // 1 m high
    const platX = 470;
    const len = v;
    const run = Math.sqrt(Math.max(0, len * len - 1)) * 100;
    const foot = platX - run;
    // Box travels along the ramp (or straight up with no ramp).
    const bx = len === 1 ? platX - 50 : foot + (platX - foot) * p;
    const by = len === 1 ? ground - 100 * p : ground - 100 * p;
    const angle = len === 1 ? 0 : -Math.atan2(100, run) * (180 / Math.PI);
    return (
      <g>
        <line x1={40} y1={ground} x2={600} y2={ground} stroke={C.ink} strokeWidth={3} />
        <rect x={platX} y={top} width={120} height={100} fill={shade(C.wood, 0.3)} stroke={C.ink} strokeWidth={2.5} />
        <text x={platX + 60} y={top + 56} textAnchor="middle" fontSize={15} fill={C.ink2}>
          1 m high
        </text>
        {len > 1 && <path d={`M${foot},${ground} L${platX},${top} L${platX},${ground} Z`} fill={shade(C.green, 0.55)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />}
        <g transform={`translate(${bx} ${by}) rotate(${angle})`}>
          <Box x={0} y={0} w={60} h={48} label={`${MACHINES.ramp.load} N`} />
        </g>
        {len > 1 && (
          <text x={(foot + platX) / 2 - 20} y={ground - 60} textAnchor="middle" fontSize={15} fill={C.ink2} transform={`rotate(${angle} ${(foot + platX) / 2} ${ground - 50})`}>
            {len} m long
          </text>
        )}
        <text x={300} y={ground + 34} textAnchor="middle" fontSize={17} fontWeight={700} fill={shade(C.red, -0.3)}>
          You push with {force} N
        </text>
      </g>
    );
  }
  // Wheel and axle: a well winch.
  const axle = { x: 300, y: 180 };
  const axleR = 18;
  const wheelR = axleR * v;
  const liftPx = 90 * p;
  const turn = (liftPx / axleR) * (180 / Math.PI);
  const bucketTop = 380 - liftPx;
  const hand = { x: axle.x + Math.cos((turn * Math.PI) / 180) * Math.max(wheelR, axleR), y: axle.y + Math.sin((turn * Math.PI) / 180) * Math.max(wheelR, axleR) };
  return (
    <g>
      <line x1={40} y1={470} x2={600} y2={470} stroke={C.ink} strokeWidth={3} />
      <rect x={180} y={420} width={240} height={50} fill={shade(C.muted, 0.5)} stroke={C.ink} strokeWidth={2.5} />
      <line x1={200} y1={110} x2={200} y2={420} stroke={C.brown} strokeWidth={10} />
      <line x1={400} y1={110} x2={400} y2={420} stroke={C.brown} strokeWidth={10} />
      <line x1={200} y1={axle.y} x2={400} y2={axle.y} stroke={C.ink2} strokeWidth={6} />
      {v > 1 && (
        <g transform={`rotate(${turn} ${axle.x} ${axle.y})`}>
          <circle cx={axle.x} cy={axle.y} r={wheelR} fill="none" stroke={C.ink} strokeWidth={6} />
          {[0, 60, 120].map((a) => (
            <line key={a} x1={axle.x - wheelR * Math.cos((a * Math.PI) / 180)} y1={axle.y - wheelR * Math.sin((a * Math.PI) / 180)} x2={axle.x + wheelR * Math.cos((a * Math.PI) / 180)} y2={axle.y + wheelR * Math.sin((a * Math.PI) / 180)} stroke={C.ink} strokeWidth={3} />
          ))}
        </g>
      )}
      <circle cx={axle.x} cy={axle.y} r={axleR} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
      <line x1={axle.x - axleR} y1={axle.y} x2={axle.x - axleR} y2={bucketTop} stroke={C.orange} strokeWidth={4} />
      <path d={`M${axle.x - axleR - 30},${bucketTop} L${axle.x - axleR + 30},${bucketTop} L${axle.x - axleR + 22},${bucketTop + 50} L${axle.x - axleR - 22},${bucketTop + 50} Z`} fill={C.blue} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <text x={axle.x - axleR} y={bucketTop + 32} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.white}>
        {MACHINES.wheel.load} N
      </text>
      <circle cx={hand.x} cy={hand.y} r={11} fill="#f4c9a0" stroke={C.ink} strokeWidth={2} />
      <text x={470} y={200} fontSize={17} fontWeight={700} fill={shade(C.red, -0.3)}>
        {force} N
      </text>
      <text x={470} y={222} fontSize={14} fill={C.ink2}>
        to turn
      </text>
    </g>
  );
}

function MachinesScene() {
  const [machine, setMachine] = useState<Machine>('lever');
  const [idx, setIdx] = useState(0);
  const [p, setP] = useState(0);
  const [lifting, setLifting] = useState(false);
  const [lastLift, setLastLift] = useState<number | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);
  const raf = useRef(0);
  const info = MACHINES[machine];
  const v = info.settings[idx];

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const lift = () => {
    cancelAnimationFrame(raf.current);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    play('whoosh');
    setLastLift(idx);
    if (guess !== null && idx > 0) setObserved(true);
    if (reduce) {
      setP(1);
      return;
    }
    setLifting(true);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1300);
      setP(k);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else {
        setLifting(false);
        play('pop');
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const choose = (m: Machine) => {
    cancelAnimationFrame(raf.current);
    setMachine(m);
    setIdx(0);
    setP(0);
    setLifting(false);
    setLastLift(null);
    setGuess(null);
    setObserved(false);
    play('tap');
  };

  const change = (d: number) => {
    setIdx(Math.max(0, Math.min(info.settings.length - 1, idx + d)));
    setP(0);
    play('tap');
  };

  const force = forceFor(machine, v);
  const dist = distanceFor(machine, v);
  const maxForce = info.load;
  const maxDist = distanceFor(machine, info.settings[info.settings.length - 1]);
  const distLabel = machine === 'lever' ? `${Math.round(dist * 100)} cm` : `${dist} m`;
  const liftLabel = machine === 'lever' ? '10 cm' : '1 m';

  return (
    <SceneSvg label={`A ${info.title.toLowerCase()} lifting a ${info.load} newton load.`}>
      {ORDER.map((m, i) => (
        <SvgButton
          key={m}
          x={40 + i * 138}
          y={24}
          w={m === 'wheel' ? 156 : 128}
          h={48}
          fontSize={m === 'wheel' ? 15 : 17}
          label={MACHINES[m].title}
          onClick={() => choose(m)}
          active={machine === m}
          color={machine === m ? C.yellow : C.card}
        />
      ))}

      <MachineDrawing m={machine} v={v} p={p} />

      {/* Setting */}
      <text x={60} y={540} fontSize={15} fill={C.muted} className="caps">
        {info.control}
      </text>
      <SvgButton x={60} y={552} w={56} h={50} label="−" title="Less help" onClick={() => change(-1)} disabled={idx === 0 || lifting} />
      <text x={130} y={584} fontSize={17} fontWeight={700} fill={C.ink}>
        {info.settingLabel(v)}
      </text>
      <SvgButton x={460} y={552} w={56} h={50} label="+" title="More help" onClick={() => change(1)} disabled={idx === info.settings.length - 1 || lifting} color={C.yellow} />
      <SvgButton x={460} y={612} w={140} h={50} fontSize={20} label="Lift!" onClick={lift} disabled={lifting} color={C.teal} textColor={C.white} />
      <SvgButton x={310} y={612} w={140} h={50} fontSize={17} label="Lower it" onClick={() => setP(0)} disabled={lifting || p === 0} />

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard x={630} y={20} w={340} prediction={guess} actual="Easier" because={info.because} onAgain={() => { setGuess(null); setObserved(false); setIdx(0); setP(0); }} />
      ) : (
        <g>
          <PredictCard
            x={630}
            y={20}
            w={340}
            question={info.question}
            options={['Easier', 'Harder', 'Same']}
            prediction={guess}
            onPredict={(o) => {
              setGuess(o);
              setIdx(0);
              setP(0);
              play('tap');
            }}
          />
          {guess !== null && <WrapText x={642} y={140} width={320} fontSize={15} fill={C.ink2} text="Lift it once like this. Then press + for more help and lift again." />}
        </g>
      )}

      {/* Force and distance */}
      <rect x={630} y={236} width={340} height={250} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={650} y={272} fontSize={18} fontWeight={700} fill={C.ink}>
        To lift the load {liftLabel}:
      </text>
      <text x={650} y={308} fontSize={15} fill={C.ink2}>
        Force you need
      </text>
      <rect x={650} y={318} width={300} height={22} rx={11} fill={C.line} />
      <rect x={650} y={318} width={(300 * force) / maxForce} height={22} rx={11} fill={C.red} />
      <text x={950} y={308} textAnchor="end" fontSize={16} fontWeight={700} fill={C.ink}>
        {force} N
      </text>
      <text x={650} y={374} fontSize={15} fill={C.ink2}>
        Distance you move
      </text>
      <rect x={650} y={384} width={300} height={22} rx={11} fill={C.line} />
      <rect x={650} y={384} width={(300 * dist) / maxDist} height={22} rx={11} fill={C.blue} />
      <text x={950} y={374} textAnchor="end" fontSize={16} fontWeight={700} fill={C.ink}>
        {distLabel}
      </text>
      <WrapText x={650} y={440} width={300} fontSize={14} fill={C.ink2} text="Less force always means moving farther. No machine gives you something for nothing." />
      {lastLift !== null && lastLift !== idx && (
        <text x={650} y={512} fontSize={14} fill={C.muted}>
          Last lift: {forceFor(machine, info.settings[lastLift])} N
        </text>
      )}

      <Callout at={[300, 470]} box={[60, 100]} w={210} icon={ArrowDownUp} title="Trade-off" text="Less force, but a longer distance." />
      <Callout at={[460, 577]} box={[630, 540]} w={230} icon={Scale} title="Try more help" text="Press + then Lift! and compare the force." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={8} y1={66} x2={112} y2={66} stroke={C.ink} strokeWidth={3} />
      <path d="M40,66 L50,48 L60,66 Z" fill={C.blue} stroke={C.ink} strokeWidth={2} />
      <rect x={14} y={42} width={96} height={7} rx={3} fill={C.brown} stroke={C.ink} strokeWidth={1.5} transform="rotate(-8 50 46)" />
      <rect x={14} y={24} width={22} height={18} rx={3} fill={C.wood} stroke={C.ink} strokeWidth={1.5} transform="rotate(-8 50 46)" />
      <path d="M100,18 L100,34" stroke={C.red} strokeWidth={4} strokeLinecap="round" />
      <path d="M100,40 l-6,-8 h12 z" fill={C.red} />
    </svg>
  );
}

const NAMES: { thing: string; machine: string }[] = [
  { thing: 'A seesaw', machine: 'Lever' },
  { thing: 'A wheelchair ramp', machine: 'Ramp' },
  { thing: 'A flagpole rope over a wheel', machine: 'Pulley' },
  { thing: 'A doorknob', machine: 'Wheel and axle' },
  { thing: 'A bottle opener', machine: 'Lever' },
  { thing: 'A slide into a swimming pool', machine: 'Ramp' },
];

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['name', 'easier', 'pivot']) : level === 1 ? pick(['tradeoff', 'where', 'name', 'ropes']) : pick(['leverN', 'pulleyN', 'rampN', 'ropeLength']);

  if (kind === 'name') {
    const n = pick(NAMES);
    return {
      prompt: `${n.thing} is a kind of…`,
      choices: choices(shuffle(['Lever', 'Ramp', 'Pulley', 'Wheel and axle'])),
      answer: n.machine,
      hint: 'Does it turn on a point, slope up, use a rope over a wheel, or turn round?',
      explain:
        n.machine === 'Lever'
          ? [`${n.thing} turns on a fixed point called a pivot.`, 'A bar that turns on a pivot is a lever.']
          : n.machine === 'Ramp'
            ? [`${n.thing} is a sloping surface.`, 'A slope that helps move things up or down is a ramp.']
            : n.machine === 'Pulley'
              ? [`${n.thing} uses a rope that runs over a wheel.`, 'A rope over a wheel is a pulley.']
              : [`${n.thing} is a big wheel joined to a thin rod in the middle.`, 'A wheel joined to a rod is a wheel and axle.'],
    };
  }
  if (kind === 'easier') {
    const right = 'Push it up a long ramp';
    return {
      prompt: 'Which needs less force to get a heavy box onto a stage?',
      choices: choices(shuffle([right, 'Lift it straight up'])),
      answer: right,
      hint: 'Think about how steep each way is.',
      explain: ['Lifting straight up takes the box up very steeply.', 'A long ramp is a gentle slope, so each step needs less force.', 'So: push it up a long ramp (but you go farther).'],
    };
  }
  if (kind === 'pivot') {
    const right = 'The point it turns on';
    return {
      prompt: 'What is the pivot of a lever?',
      choices: choices(shuffle([right, 'The heavy load', 'The end you push'])),
      answer: right,
      hint: 'Think of the middle of a seesaw.',
      explain: ['A seesaw tips up and down.', 'It turns round one fixed point in the middle.', 'That point is the pivot: the point it turns on.'],
    };
  }
  if (kind === 'tradeoff') {
    const right = 'You have to move a longer distance';
    return {
      prompt: 'A simple machine lets you use less force. What is the catch?',
      choices: choices(shuffle([right, 'The load gets lighter', 'It works without any force'])),
      answer: right,
      hint: 'Look at the two bars in the playground as you add more help.',
      explain: ['The load still weighs the same.', 'Less force means you must push or pull for longer.', 'So the catch: you have to move a longer distance.'],
    };
  }
  if (kind === 'where') {
    const right = 'Far from the pivot';
    return {
      prompt: 'Where should you push on a lever to lift a heavy rock with the least force?',
      choices: choices(shuffle([right, 'Close to the pivot', 'Right on top of the pivot'])),
      answer: right,
      hint: 'Try moving your push in the playground.',
      explain: ['The farther you push from the pivot, the less force you need.', 'On top of the pivot, pushing does not turn the lever at all.', 'So push far from the pivot.'],
    };
  }
  if (kind === 'ropes') {
    const right = 'Less force';
    return {
      prompt: 'You add more ropes and pulleys to hold a load. How hard do you pull now?',
      choices: choices(shuffle([right, 'More force', 'The same force'])),
      answer: right,
      hint: 'Each rope holding the load takes a share of it.',
      explain: ['Each rope holding the load shares the weight.', 'More ropes means each one, and your hand, holds less.', 'So you pull with less force (but pull more rope).'],
    };
  }
  if (kind === 'leverN') {
    const load = pick([60, 90, 120]);
    const arm = pick([2, 3]);
    const ans = load / arm;
    return {
      prompt: `A ${load} N rock sits 1 m from a lever's pivot. You push ${arm} m from the pivot on the other side. What force balances it (in N)?`,
      answer: String(ans),
      hint: 'Pushing twice as far from the pivot needs half the force.',
      explain: [`You push ${arm} times as far from the pivot as the rock is.`, `So you need 1/${arm} of the force: ${load} ÷ ${arm}.`, `${load} ÷ ${arm} = ${ans} N.`],
    };
  }
  if (kind === 'pulleyN') {
    const ropes = pick([2, 4]);
    const load = pick([80, 120, 200]);
    const ans = load / ropes;
    return {
      prompt: `${ropes} ropes hold a ${load} N load in a pulley with no friction. What force do you pull with (in N)?`,
      answer: String(ans),
      hint: 'The ropes share the load equally.',
      explain: [`The ${load} N load is shared by ${ropes} ropes.`, `Each rope, and your hand, holds ${load} ÷ ${ropes}.`, `${load} ÷ ${ropes} = ${ans} N.`],
    };
  }
  if (kind === 'rampN') {
    const len = pick([2, 4, 5]);
    const load = pick([100, 200]);
    const ans = load / len;
    return {
      prompt: `A smooth ramp is ${len} m long and 1 m high. About what force pushes a ${load} N box up it (in N)?`,
      answer: String(ans),
      hint: 'Going the long way, the force is shared out along the length.',
      explain: [`The ramp is ${len} times longer than it is high.`, `So the force is about 1/${len} of the weight: ${load} ÷ ${len}.`, `${load} ÷ ${len} = ${ans} N.`],
    };
  }
  // ropeLength
  const ropes = pick([2, 3, 4]);
  const h = pick([1, 2]);
  const ans = ropes * h;
  return {
    prompt: `${ropes} ropes hold a load. To lift it ${h} m, how many metres of rope must you pull?`,
    answer: String(ans),
    hint: 'Every rope holding the load has to get shorter by the same amount.',
    explain: [`Each of the ${ropes} ropes must shorten by ${h} m.`, `So you pull ${ropes} × ${h} m of rope.`, `${ropes} × ${h} = ${ans} m.`],
  };
}

export const simpleMachines: Lesson = {
  id: 'simple-machines',
  title: 'Simple Machines',
  Thumb,
  Scene: MachinesScene,
  sceneHint: 'Pick a machine · Predict · Lift it, then add more help and lift again',
  learn: {
    heading: 'Simple machines',
    intro:
      'Levers, pulleys, ramps and wheels with axles are simple machines. They let you move a heavy load with a smaller force, but you have to move a longer distance to do it.',
    points: [
      { icon: Scale, text: 'Lever: push far from the pivot to lift a heavy load.' },
      { icon: Cog, text: 'Pulley and wheel and axle: more help, less force.' },
      { icon: Mountain, text: 'Ramp: a longer, gentler slope needs less force.' },
    ],
  },
  steps: [
    'Find the load: what are you trying to move?',
    'Find where you push or pull, and how far you move.',
    'More help from the machine means less force…',
    '…but you always move a longer distance.',
  ],
  example: {
    question: 'Two ropes hold an 80 N load in a pulley. What force do you pull with, and how much rope do you pull to lift it 1 m?',
    work: ['The 2 ropes share the load: 80 ÷ 2 = 40 N.', 'Each rope must shorten by 1 m, so you pull 2 × 1 = 2 m of rope.'],
    answer: 'You pull with 40 N and pull 2 m of rope.',
  },
  grownups: [
    'Real machines also lose a little to friction, so they need slightly more force than these ideal numbers.',
    'Find levers at home: scissors, a bottle opener, a spoon prising a tin lid.',
    'A key idea for later science: force × distance (the work done) stays about the same. Machines change how you do the work, not how much.',
  ],
  makeQuestion,
};
