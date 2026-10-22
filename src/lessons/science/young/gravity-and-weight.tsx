import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Globe2, Scale, Weight } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

interface World {
  id: string;
  name: string;
  /** Gravitational field strength in N/kg (rounded). */
  g: number;
  ground: string;
  sky: string;
}

const WORLDS: World[] = [
  { id: 'moon', name: 'Moon', g: 1.6, ground: '#b8b8c0', sky: '#2b3150' },
  { id: 'mars', name: 'Mars', g: 3.7, ground: '#d9774a', sky: '#f2c9a6' },
  { id: 'earth', name: 'Earth', g: 9.8, ground: '#7fbf6a', sky: '#cfe9fb' },
  { id: 'jupiter', name: 'Jupiter', g: 24.8, ground: '#d9b48c', sky: '#f4e1c4' },
];

const GROUND_Y = 560;
const TAKEOFF = 2.6; // m/s, a typical standing jump

function Astronaut({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-34} y={-150} width={68} height={86} rx={22} fill="#ffffff" stroke={C.ink} strokeWidth={3} />
      <rect x={-46} y={-140} width={16} height={56} rx={8} fill="#ffffff" stroke={C.ink} strokeWidth={3} />
      <rect x={30} y={-140} width={16} height={56} rx={8} fill="#ffffff" stroke={C.ink} strokeWidth={3} />
      <rect x={-28} y={-70} width={22} height={64} rx={9} fill="#ffffff" stroke={C.ink} strokeWidth={3} />
      <rect x={6} y={-70} width={22} height={64} rx={9} fill="#ffffff" stroke={C.ink} strokeWidth={3} />
      <rect x={-30} y={-12} width={26} height={14} rx={6} fill={C.ink2} />
      <rect x={4} y={-12} width={26} height={14} rx={6} fill={C.ink2} />
      <circle cx={0} cy={-178} r={36} fill="#ffffff" stroke={C.ink} strokeWidth={3} />
      <rect x={-24} y={-196} width={48} height={32} rx={14} fill="#3a5fb5" stroke={C.ink} strokeWidth={2.5} />
      <rect x={-16} y={-190} width={14} height={8} rx={4} fill="#ffffff" opacity={0.6} />
      <rect x={-14} y={-128} width={28} height={18} rx={4} fill={C.red} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

interface WorldChallenge extends Challenge {
  world: string;
}

/** Predict → observe → explain: weigh yourself on another world (compared with Earth). */
function worldChallenge(prev: WorldChallenge | null): WorldChallenge {
  const options = WORLDS.filter((w) => w.id !== 'earth' && w.id !== prev?.world);
  const w = pick(options);
  if (prev && prev.question.startsWith('Your mass') === false && Math.random() < 0.35) {
    return {
      world: w.id,
      question: `Your mass on ${w.name === 'Moon' ? 'the Moon' : w.name}…`,
      options: ['Changes', 'Stays the same'],
      actual: 'Stays the same',
      because: 'Mass is how much stuff you are made of. It is the same everywhere; only weight changes.',
    };
  }
  const lighter = w.g < 9.8;
  const place = w.name === 'Moon' ? 'the Moon' : w.name;
  return {
    world: w.id,
    question: `On ${place}, you weigh…`,
    options: ['More', 'Less', 'The same'],
    actual: lighter ? 'Less' : 'More',
    because: `Gravity on ${place} is about ${w.g} N/kg, ${lighter ? 'weaker' : 'stronger'} than Earth's 9.8, so you weigh ${lighter ? 'less' : 'more'} than on Earth.`,
  };
}

function GravityScene() {
  const [world, setWorld] = useState<World>(WORLDS[2]);
  const poe = usePoe<WorldChallenge>(worldChallenge);
  // Each new prediction starts from Earth, so there is something to compare with.
  useEffect(() => setWorld(WORLDS[2]), [poe.challenge]);
  const [mass, setMass] = useState(60);
  const [jumpY, setJumpY] = useState(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const weight = Math.round(mass * world.g);
  const jumpHeight = (TAKEOFF * TAKEOFF) / (2 * world.g); // metres
  const pxPerM = 90;

  const jump = () => {
    cancelAnimationFrame(raf.current);
    play('whoosh');
    const flight = (2 * TAKEOFF) / world.g; // seconds in the air
    // Speed up very long (low-gravity) jumps so they stay watchable; the shape of the motion stays real.
    const speed = Math.max(1, flight / 1.6);
    const t0 = performance.now();
    const step = (now: number) => {
      const t = ((now - t0) / 1000) * speed;
      if (t >= flight) {
        setJumpY(0);
        play('pop');
        return;
      }
      setJumpY((TAKEOFF * t - 0.5 * world.g * t * t) * pxPerM);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const maxBar = Math.max(...WORLDS.map((w) => mass * w.g));

  return (
    <SceneSvg label="An astronaut weighed on different worlds">
      {/* Sky and ground for the chosen world */}
      <rect x={40} y={110} width={560} height={GROUND_Y - 110} rx={18} fill={world.sky} stroke={C.ink} strokeWidth={2.5} />
      <rect x={40} y={GROUND_Y - 10} width={560} height={70} rx={14} fill={world.ground} stroke={C.ink} strokeWidth={2.5} />
      {world.id === 'moon' && [90, 160, 470, 540].map((x, i) => <circle key={x} cx={x} cy={150 + (i % 2) * 40} r={2.5} fill="#ffffff" />)}
      {world.id === 'jupiter' && (
        <text x={320} y={GROUND_Y + 40} textAnchor="middle" fontSize={14} fill={C.ink2}>
          Jupiter has no solid ground: imagine its cloud tops
        </text>
      )}

      {/* Scale */}
      <rect x={390} y={GROUND_Y - 30} width={140} height={26} rx={8} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <rect x={422} y={GROUND_Y - 26} width={76} height={18} rx={4} fill="#1d2b2a" />
      <text x={460} y={GROUND_Y - 17} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} fill="#7ff2c1">
        {jumpY > 2 ? '0 N' : `${weight} N`}
      </text>
      <Astronaut x={460} y={GROUND_Y - 30 - jumpY} />

      {/* Readout */}
      <rect x={640} y={110} width={320} height={150} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={640} y={110} width={320} height={150} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={800} y={142} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        Weight on {world.name} = mass × gravity
      </text>
      <text x={800} y={186} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.ink}>
        {mass} kg × {world.g} = {weight} N
      </text>
      <text x={800} y={232} textAnchor="middle" fontSize={16} fill={C.ink2}>
        A jump goes about {jumpHeight < 1 ? `${Math.round(jumpHeight * 100)} cm` : `${jumpHeight.toFixed(1)} m`} high
      </text>

      {/* Worlds */}
      {WORLDS.map((w, i) => (
        <SvgButton
          key={w.id}
          x={40 + i * 142}
          y={34}
          w={132}
          h={52}
          fontSize={19}
          label={w.name}
          active={w.id === world.id}
          color={w.id === world.id ? C.yellow : C.card}
          onClick={() => {
            setWorld(w);
            // Going to the world in the prediction is the experiment.
            if (w.id === poe.challenge.world) window.setTimeout(poe.observe, 500);
          }}
        />
      ))}
      {poe.waiting && (
        <rect x={40 + WORLDS.findIndex((w) => w.id === poe.challenge.world) * 142 - 6} y={28} width={144} height={70} rx={16} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" pointerEvents="none" />
      )}

      {/* Predict → observe → explain */}
      <PoePanel x={56} y={124} w={330} poe={poe} />

      {/* Mass control and jump */}
      <text x={640} y={300} fontSize={18} fontWeight={700} fill={C.ink}>
        Mass: {mass} kg
      </text>
      <text x={640} y={322} fontSize={14} fill={C.ink2}>
        (the same on every world)
      </text>
      <SvgButton x={830} y={282} w={58} h={48} label="−" title="Less mass" onClick={() => setMass(Math.max(20, mass - 5))} />
      <SvgButton x={898} y={282} w={58} h={48} label="+" title="More mass" color={C.yellow} onClick={() => setMass(Math.min(150, mass + 5))} />
      <SvgButton x={640} y={350} w={316} h={52} fontSize={19} label="Jump!" color={C.teal} textColor={C.white} onClick={jump} />

      {/* Compare all worlds */}
      <text x={640} y={440} fontSize={15} fill={C.muted} className="caps">
        Same mass, different weight
      </text>
      {WORLDS.map((w, i) => {
        const y = 456 + i * 46;
        const wid = 200 * ((mass * w.g) / maxBar);
        return (
          <g key={w.id}>
            <text x={640} y={y + 22} fontSize={15} fontWeight={w.id === world.id ? 700 : 500} fill={C.ink}>
              {w.name}
            </text>
            <rect x={710} y={y + 6} width={Math.max(4, wid)} height={26} rx={6} fill={w.id === world.id ? C.orange : shade(C.orange, 0.5)} stroke={C.ink} strokeWidth={1.5} />
            <text x={716 + Math.max(4, wid)} y={y + 24} fontSize={14} fill={C.ink2}>
              {Math.round(mass * w.g)} N
            </text>
          </g>
        );
      })}

      <Callout at={[460, GROUND_Y - 200]} box={[60, 470]} w={230} icon={ArrowDown} title="Weight is a force" text="Weight is gravity pulling on your mass, measured in newtons (N)." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <circle cx={30} cy={40} r={22} fill="#b8b8c0" stroke={C.ink} strokeWidth={2} />
      <circle cx={80} cy={40} r={28} fill="#d9b48c" stroke={C.ink} strokeWidth={2} />
      <path d="M54,42 h14" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M64,37 l5,5 l-5,5" fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

// ---------- practice ----------

/** Friendly classroom values (N per kg). */
const ABOUT = { Earth: 10, Mars: 4, Jupiter: 25 };

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['earth', 'mass']) : level === 1 ? pick(['moon', 'most', 'earth']) : pick(['mars', 'jupiter', 'moonBack', 'most']);

  if (kind === 'earth') {
    const m = pick([20, 25, 30, 40, 45, 50, 60]);
    return {
      prompt: `On Earth, gravity pulls with about 10 N on every kilogram. About how much does a ${m} kg child weigh on Earth, in newtons?`,
      answer: String(m * ABOUT.Earth),
      hint: 'Weight = mass × gravity.',
      explain: ['Weight = mass × gravity.', `${m} × 10 = ${m * 10}.`, `So the child weighs about ${m * 10} N.`],
    };
  }
  if (kind === 'mass') {
    const right = 'it stays the same';
    return {
      prompt: 'An astronaut travels from Earth to the Moon. What happens to their mass?',
      choices: shuffle([right, 'it gets smaller', 'it gets bigger']).map((value) => ({ value })),
      answer: right,
      hint: 'Mass is how much stuff you are made of. Does that change when you travel?',
      explain: ['Mass is the amount of matter in you, and that does not change when you travel.', `Only weight changes, so the mass: ${right}.`],
    };
  }
  if (kind === 'moon') {
    const earth = pick([60, 120, 300, 480, 600, 900, 1200]);
    return {
      prompt: `A rock weighs ${earth} N on Earth. Gravity on the Moon is about 1/6 of Earth's. About how much does it weigh on the Moon, in newtons?`,
      answer: String(earth / 6),
      hint: 'One sixth means divide by 6.',
      explain: ['On the Moon you weigh about one sixth as much.', `${earth} ÷ 6 = ${earth / 6}.`, `So it weighs about ${earth / 6} N on the Moon.`],
    };
  }
  if (kind === 'moonBack') {
    const moon = pick([10, 20, 50, 80, 100, 120]);
    return {
      prompt: `An astronaut weighs about ${moon} N on the Moon. About how much would they weigh on Earth, in newtons?`,
      answer: String(moon * 6),
      hint: "Earth's gravity is about 6 times stronger than the Moon's.",
      explain: ["Earth's pull is about 6 times the Moon's.", `${moon} × 6 = ${moon * 6}.`, `So they weigh about ${moon * 6} N on Earth.`],
    };
  }
  if (kind === 'mars' || kind === 'jupiter') {
    const name = kind === 'mars' ? 'Mars' : 'Jupiter';
    const g = ABOUT[name];
    const m = pick(kind === 'mars' ? [10, 15, 20, 25, 30, 50] : [2, 4, 6, 8, 10, 20]);
    return {
      prompt: `Gravity on ${name} is about ${g} N per kg. About how much would a ${m} kg robot weigh there, in newtons?`,
      answer: String(m * g),
      hint: 'Weight = mass × gravity.',
      explain: ['Weight = mass × gravity.', `${m} × ${g} = ${m * g}.`, `So the robot weighs about ${m * g} N on ${name}.`],
    };
  }
  const most = Math.random() < 0.6;
  const answer = most ? 'Jupiter' : 'Moon';
  return {
    prompt: `Where would you weigh the ${most ? 'most' : 'least'}?`,
    choices: shuffle(WORLDS.map((w) => w.name)).map((value) => ({ value })),
    answer,
    hint: 'Your mass is the same everywhere, so look at how strong each world pulls.',
    explain: ['Moon about 1.6 N/kg, Mars about 3.7, Earth about 9.8, Jupiter about 24.8.', `The ${most ? 'strongest' : 'weakest'} pull is on ${answer === 'Moon' ? 'the Moon' : 'Jupiter'}, so you weigh the ${most ? 'most' : 'least'} on ${answer === 'Moon' ? 'the Moon' : 'Jupiter'}.`],
  };
}

export const gravityAndWeight: Lesson = {
  id: 'gravity-and-weight',
  title: 'Gravity and Weight',
  Thumb,
  Scene: GravityScene,
  sceneHint: 'Predict, then visit that world · Change the mass · Jump!',
  learn: {
    heading: 'Mass, weight and gravity',
    intro: 'Mass is how much matter you are made of, in kilograms; it never changes when you travel. Weight is the force of gravity pulling on that mass, in newtons. Different worlds pull with different strengths.',
    points: [
      { icon: Weight, text: 'Weight = mass × gravity (on Earth about 10 N for every kg).' },
      { icon: Globe2, text: 'The Moon pulls about 1/6 as hard as Earth; Jupiter about 2.5 times as hard.' },
      { icon: Scale, text: 'Bathroom scales really measure weight, then convert it to Earth kilograms.' },
    ],
  },
  steps: [
    'Find the mass in kilograms (it is the same everywhere).',
    'Find the gravity of the world in newtons per kilogram.',
    'Multiply: weight = mass × gravity.',
    'Say "about": gravity values are rounded.',
  ],
  example: {
    question: 'An astronaut has a mass of 90 kg. About how much do they weigh on Earth and on the Moon?',
    work: ['Earth: 90 × 10 = about 900 N.', 'Moon: about 1/6 of that, 900 ÷ 6 = 150 N.'],
    answer: 'About 900 N on Earth and about 150 N on the Moon, with the same 90 kg mass.',
  },
  grownups: [
    'Everyday speech mixes up mass and weight ("I weigh 30 kg"). In science, kilograms measure mass and newtons measure weight.',
    'Watch videos of astronauts bouncing on the Moon: lower gravity means higher, slower jumps.',
    'The app rounds Earth\'s gravity (9.8 N/kg) to 10 to make the maths friendly.',
    'Ask: if you took a bag of sugar to the Moon, would it still make the same number of cakes? (Yes — same mass!)',
  ],
  makeQuestion,
};
