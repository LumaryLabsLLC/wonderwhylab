import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Flame, Gauge, Mountain } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

const G = 9.8;
const X0 = 70;
const XW = 600;
const GROUND = 590;
const PX_PER_M = 24;
const TRACK_LENGTH_M = 30; // horizontal length of the ride
const FRICTION = 0.045;

/** Track height in metres along t ∈ [0, 1]: a big hill, a dip, a smaller hill, a dip. */
const height = (t: number) => 9 + 7 * Math.cos(3 * Math.PI * t) * (1 - 0.35 * t);
const slope = (t: number) => (height(t + 0.0005) - height(t - 0.0005)) / 0.001; // dh/dt
const sx = (t: number) => X0 + t * XW;
const sy = (h: number) => GROUND - h * PX_PER_M;
const START_T = 0.01;

const TRACK = Array.from({ length: 121 }, (_, i) => i / 120);

interface Sim {
  t: number;
  dir: 1 | -1;
  /** Mechanical energy per kg (potential + kinetic), and energy turned to heat. */
  energy: number;
  heat: number;
  total: number;
  running: boolean;
}

const startSim = (t: number): Sim => ({ t, dir: 1, energy: G * height(t), heat: 0, total: G * height(t), running: true });

interface RideChallenge extends Challenge {
  kind: 'fastest' | 'over' | 'back';
  friction: boolean;
}

/** Predict → observe → explain challenges. Each one restarts the ride from the top once the child has predicted. */
const RIDES: RideChallenge[] = [
  {
    kind: 'fastest',
    friction: false,
    question: 'Where will the car go fastest?',
    options: ['Hill 1 top', 'First dip', 'Hill 2 top'],
    actual: 'First dip',
    because: 'Height turns into speed as it drops, so it is fastest at the lowest point: the first dip.',
  },
  {
    kind: 'over',
    friction: false,
    question: 'Friction off: over hill 2?',
    options: ['Yes', 'No'],
    actual: 'Yes',
    because: 'Without friction no energy is lost, and hill 2 is lower than where the car started.',
  },
  {
    kind: 'back',
    friction: true,
    question: 'Friction on: back to the start?',
    options: ['Yes', 'No'],
    actual: 'No',
    because: 'Friction turned some energy into heat, so the car cannot climb as high again.',
  },
];

const rideChallenge = (prev: RideChallenge | null) => pick(RIDES.filter((r) => r.kind !== prev?.kind));

function CoasterScene() {
  const sim = useRef<Sim>(startSim(START_T));
  const [, setTick] = useState(0);
  const [friction, setFriction] = useState(false);
  const frictionRef = useRef(friction);
  frictionRef.current = friction;

  const poe = usePoe<RideChallenge>(rideChallenge);
  const challengeRef = useRef(poe.challenge);
  challengeRef.current = poe.challenge;
  const observeRef = useRef(poe.observe);
  observeRef.current = poe.observe;
  /** Watching the ride for the result of the current prediction. */
  const watch = useRef({ armed: false, prevDir: 1 as 1 | -1, reachedEnd: false });

  // Once the child predicts, run the experiment: set friction and start from the top.
  useEffect(() => {
    if (poe.guess === null) return;
    const c = challengeRef.current;
    setFriction(c.friction);
    frictionRef.current = c.friction;
    sim.current = startSim(START_T);
    watch.current = { armed: true, prevDir: 1, reachedEnd: false };
    play('whoosh');
  }, [poe.guess]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      if (s.running) {
        // Integrate in small steps for a smooth, stable ride.
        for (let k = 0; k < 8; k++) {
          const h = dt / 8;
          const ke = s.energy - G * height(s.t);
          const v = Math.sqrt(Math.max(0, 2 * ke));
          const dsdt = Math.hypot(TRACK_LENGTH_M, slope(s.t));
          let t2 = s.t + (s.dir * Math.max(v, 0.4) * h) / dsdt;
          if (t2 <= 0 || t2 >= 1) {
            t2 = clamp(t2, 0, 1);
            s.dir = s.dir === 1 ? -1 : 1;
          } else if (s.energy - G * height(t2) < 0) {
            // Not enough energy to climb further: roll back the other way.
            s.dir = s.dir === 1 ? -1 : 1;
            t2 = s.t;
          }
          if (frictionRef.current) {
            const loss = FRICTION * G * Math.abs(t2 - s.t) * dsdt;
            s.energy -= loss;
            s.heat += loss;
          }
          s.t = t2;
        }
        // With friction the ride eventually settles at the bottom of a dip.
        if (frictionRef.current && s.energy - G * height(s.t) < 0.05 && Math.abs(slope(s.t)) < 2) s.running = false;

        const w = watch.current;
        if (w.armed) {
          const kind = challengeRef.current.kind;
          let seen = false;
          if (kind === 'fastest') seen = s.dir === 1 && s.t > 0.4;
          if (kind === 'over') seen = s.t > 0.8;
          if (kind === 'back') {
            if (w.prevDir === 1 && s.dir === -1) w.reachedEnd = true;
            // Turning round on the way back, before reaching the start.
            seen = w.reachedEnd && w.prevDir === -1 && s.dir === 1;
          }
          w.prevDir = s.dir;
          if (seen) {
            w.armed = false;
            observeRef.current();
          }
        }
      }
      setTick((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const drag = useSvgDrag(
    (p) => {
      const t = clamp((p.x - X0) / XW, 0, 1);
      sim.current = { ...startSim(t), running: false };
    },
    {
      onEnd: () => {
        sim.current = startSim(sim.current.t);
        play('whoosh');
      },
    },
  );

  const s = sim.current;
  const h = height(s.t);
  const pe = G * h;
  const ke = Math.max(0, s.energy - pe);
  const total = s.total || 1;
  const speed = Math.sqrt(2 * ke);
  const angle = (Math.atan2(-slope(s.t) * PX_PER_M, XW) * 180) / Math.PI;
  const cx = sx(s.t);
  const cy = sy(h);

  const bars = [
    { label: 'Potential (height)', value: pe, color: C.blue, icon: Mountain },
    { label: 'Kinetic (movement)', value: ke, color: C.orange, icon: Gauge },
    { label: 'Heat (friction)', value: s.heat, color: C.red, icon: Flame },
  ];

  return (
    <SceneSvg label="A roller coaster showing potential and kinetic energy">
      {/* Track and supports */}
      <line x1={40} y1={GROUND} x2={700} y2={GROUND} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {TRACK.filter((_, i) => i % 6 === 0).map((t) => (
        <line key={t} x1={sx(t)} y1={sy(height(t)) + 6} x2={sx(t)} y2={GROUND} stroke={shade(C.line, -0.15)} strokeWidth={4} />
      ))}
      <polyline points={TRACK.map((t) => `${sx(t)},${sy(height(t))}`).join(' ')} fill="none" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={TRACK.map((t) => `${sx(t)},${sy(height(t))}`).join(' ')} fill="none" stroke={C.red} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />

      {/* Height marker for the start */}
      <line x1={X0 - 30} y1={sy(s.total / G)} x2={700} y2={sy(s.total / G)} stroke={C.teal} strokeWidth={2} strokeDasharray="6 6" />
      <text x={700} y={sy(s.total / G) + 20} textAnchor="end" fontSize={14} fill={shade(C.teal, -0.3)} fontWeight={600}>
        starting height
      </text>

      {/* Cart */}
      <g {...drag} role="slider" aria-label="Roller coaster car: drag to choose where it starts" aria-valuenow={Math.round(h)}>
        <g transform={`translate(${cx} ${cy}) rotate(${angle})`}>
          <rect x={-40} y={-50} width={80} height={60} fill="transparent" />
          <rect x={-30} y={-34} width={60} height={26} rx={8} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
          <circle cx={-16} cy={-6} r={7} fill={C.ink2} stroke={C.ink} strokeWidth={2} />
          <circle cx={16} cy={-6} r={7} fill={C.ink2} stroke={C.ink} strokeWidth={2} />
          <circle cx={0} cy={-44} r={9} fill="#f2c9a0" stroke={C.ink} strokeWidth={2} />
        </g>
      </g>

      {/* Energy bars */}
      <text x={730} y={70} fontSize={15} fill={C.muted} className="caps">
        Energy
      </text>
      {bars.map((b, i) => {
        const y = 92 + i * 92;
        const w = 230 * clamp(b.value / total, 0, 1);
        const Icon = b.icon;
        return (
          <g key={b.label}>
            <Icon x={730} y={y} width={22} height={22} color={C.ink} />
            <text x={760} y={y + 17} fontSize={16} fontWeight={600} fill={C.ink}>
              {b.label}
            </text>
            <rect x={730} y={y + 30} width={230} height={30} rx={8} fill={C.card} stroke={C.ink} strokeWidth={2} />
            {w > 1 && <rect x={730} y={y + 30} width={w} height={30} rx={8} fill={b.color} stroke={C.ink} strokeWidth={2} />}
          </g>
        );
      })}
      {/* Two short lines: as one, the version with heat ran past the edge of the scene. */}
      <text x={730} y={368} fontSize={15} fill={C.ink2}>
        {friction ? 'Potential + kinetic + heat' : 'Potential + kinetic'}
      </text>
      <text x={730} y={388} fontSize={15} fill={C.ink2}>
        = the same total
      </text>
      <text x={730} y={420} fontSize={20} fontWeight={700} fill={C.ink}>
        Speed: {speed.toFixed(1)} m/s
      </text>

      <SvgButton x={730} y={446} w={230} h={52} fontSize={18} label={friction ? 'Friction: on' : 'Friction: off'} active={friction} color={friction ? C.orange : C.card} onClick={() => setFriction(!friction)} />
      <SvgButton x={730} y={512} w={230} h={52} fontSize={18} label="Back to the top" onClick={() => (sim.current = startSim(START_T))} />

      {/* Predict → observe → explain */}
      <PoePanel x={210} y={12} w={400} poe={poe} />

      <Callout at={[sx(0.33), sy(height(0.33))]} box={[240, 610]} w={260} icon={ArrowDownToLine} title="Fastest at the bottom" text="Height (potential energy) has turned into movement (kinetic energy)." />
    </SceneSvg>
  );
}

function Thumb() {
  const pts = Array.from({ length: 41 }, (_, i) => i / 40).map((t) => `${10 + t * 100},${70 - height(t) * 3.4}`);
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={C.red} strokeWidth={4} strokeLinejoin="round" />
      <rect x={14} y={8} width={14} height={9} rx={3} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
      <rect x={96} y={20} width={6} height={40} rx={2} fill={C.blue} />
      <rect x={104} y={44} width={6} height={16} rx={2} fill={C.orange} />
    </svg>
  );
}

// ---------- practice ----------

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['fastest', 'top']) : level === 1 ? pick(['ke', 'ke', 'fastest']) : pick(['heat', 'heatCalc', 'hill']);

  if (kind === 'fastest') {
    const right = 'at the bottom of the dip';
    return {
      prompt: 'Where is a roller-coaster car moving fastest?',
      choices: shuffle([right, 'at the top of the first hill', 'halfway up the second hill']).map((value) => ({ value })),
      answer: right,
      hint: 'Going down, height turns into movement. Where has it lost the most height?',
      explain: ['Going downhill, potential energy (height) changes into kinetic energy (movement).', `The lowest point has the most kinetic energy, so the car is fastest ${right}.`],
    };
  }
  if (kind === 'top') {
    return {
      prompt: 'The car stops for a moment at the very top of the hill. What kind of energy does it mostly have?',
      choices: [{ value: 'potential energy' }, { value: 'kinetic energy' }],
      answer: 'potential energy',
      hint: 'Is it high up? Is it moving?',
      explain: ['It is high up but not moving.', 'Height means stored energy, so it has mostly potential energy.'],
    };
  }
  if (kind === 'ke') {
    const total = pick([500, 800, 1000, 1200, 2000]);
    const pe = pick(Array.from({ length: total / 100 - 1 }, (_, i) => (i + 1) * 100));
    return {
      prompt: `No friction: a car starts with ${total} J of energy. Lower down it has ${pe} J of potential energy. How many joules of kinetic energy does it have?`,
      answer: String(total - pe),
      hint: 'Without friction the total stays the same: potential + kinetic = total.',
      explain: [`Potential + kinetic = ${total} J.`, `${total} − ${pe} = ${total - pe}.`, `So it has ${total - pe} J of kinetic energy.`],
    };
  }
  if (kind === 'heat') {
    const right = 'it turns into heat (thermal energy)';
    return {
      prompt: 'With friction, the car gets a little lower on every hill. Where does the "missing" energy go?',
      choices: shuffle([right, 'it disappears completely', 'it turns into extra height', 'it is stored in the seats']).map((value) => ({ value })),
      answer: right,
      hint: 'Energy is never destroyed. What happens when you rub your hands together?',
      explain: ['Energy cannot be created or destroyed; it only changes form.', `Friction rubs it away as warmth, so ${right}.`],
    };
  }
  if (kind === 'heatCalc') {
    const total = pick([1000, 1200, 1500, 2000]);
    const left = total - pick([100, 200, 300, 400, 500]);
    return {
      prompt: `A car starts with ${total} J. After the ride, it has ${left} J of potential and kinetic energy left. How many joules turned into heat?`,
      answer: String(total - left),
      hint: 'The total energy never changes, so the heat is whatever is missing.',
      explain: ['Heat = starting energy − energy left.', `${total} − ${left} = ${total - left}.`, `So ${total - left} J turned into heat.`],
    };
  }
  const start = pick([10, 15, 20, 25]);
  const hill = start + pick([-5, -3, 3, 5]);
  const can = hill < start;
  return {
    prompt: `With no friction, a car starts from rest ${start} m high. Can it get over a hill ${hill} m high?`,
    choices: [{ value: 'yes' }, { value: 'no' }],
    answer: can ? 'yes' : 'no',
    hint: 'The car can never have more energy than it started with.',
    explain: [
      `Starting at ${start} m gives just enough energy to climb back to ${start} m.`,
      can ? `${hill} m is lower than ${start} m, so yes, it gets over.` : `${hill} m is higher than ${start} m, so no, it rolls back.`,
    ],
  };
}

export const energyRollerCoaster: Lesson = {
  id: 'energy-roller-coaster',
  title: 'Energy',
  Thumb,
  Scene: CoasterScene,
  sceneHint: 'Predict, then watch the ride · Drag the car to start anywhere',
  learn: {
    heading: 'Energy on a roller coaster',
    intro: 'Energy is never made or destroyed; it just changes form. A coaster car swaps potential energy (from height) and kinetic energy (from moving) all the way round. Friction slowly turns some of it into heat.',
    points: [
      { icon: Mountain, text: 'Higher up = more potential energy.' },
      { icon: Gauge, text: 'Moving faster = more kinetic energy.' },
      { icon: Flame, text: 'Friction turns some energy into heat, so real rides need a lift hill.' },
    ],
  },
  steps: [
    'Find the starting energy: it all comes from the starting height.',
    'Going down: potential energy turns into kinetic energy, so the car speeds up.',
    'Going up: kinetic energy turns back into potential energy, so it slows down.',
    'Without friction, potential + kinetic always adds up to the same total.',
  ],
  example: {
    question: 'A car starts with 1000 J. At the bottom of the dip it has 100 J of potential energy. How much kinetic energy?',
    work: ['No friction, so the total stays 1000 J.', '1000 − 100 = 900.'],
    answer: 'It has 900 J of kinetic energy, so it is going fast.',
  },
  grownups: [
    'Roll a marble down a curved ruler or a bent piece of card: it never comes back higher than it started.',
    'Joules (J) are the unit of energy. The bars show energy shares, not exact numbers.',
    'A common misconception is that energy is "used up". It is transferred to other forms, often heat and sound.',
    'Ask: why is the first hill of a real roller coaster always the tallest?',
  ],
  makeQuestion,
};
