import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Moon, Orbit, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { WrapText } from './visuals/Draggable';

/**
 * Model: the Sun is far off to the left, so sunlight arrives from the left everywhere.
 * Looking down on the North Pole, the Moon goes round the Earth anticlockwise.
 * `phi` is the Moon's angle from the Sun as seen from Earth: 0 = new, 90 = first quarter,
 * 180 = full, 270 = last quarter. Views are as seen from the northern half of the Earth.
 */
const EARTH = { x: 330, y: 340 };
const ORBIT_R = 190;
const DAYS = 29.5;

/** Screen position of the Moon on its orbit (y grows downwards on screen). */
function moonPos(phi: number) {
  // New moon sits between Earth and Sun (left). Anticlockwise on screen: left → bottom → right → top.
  const a = ((180 + phi) * Math.PI) / 180;
  return { x: EARTH.x + ORBIT_R * Math.cos(a), y: EARTH.y - ORBIT_R * Math.sin(a) };
}

/** Phase angle from a point on screen. */
function phiFrom(p: { x: number; y: number }) {
  const a = (Math.atan2(-(p.y - EARTH.y), p.x - EARTH.x) * 180) / Math.PI;
  return (((a - 180) % 360) + 360) % 360;
}

export function phaseName(phi: number): string {
  const f = ((phi % 360) + 360) % 360;
  if (f < 12 || f >= 348) return 'New moon';
  if (f < 78) return 'Waxing crescent';
  if (f < 102) return 'First quarter';
  if (f < 168) return 'Waxing gibbous';
  if (f < 192) return 'Full moon';
  if (f < 258) return 'Waning gibbous';
  if (f < 282) return 'Last quarter';
  return 'Waning crescent';
}

/** The Moon as we see it from Earth: the sunlit part is drawn bright. */
export function MoonFace({ phi, cx, cy, r }: { phi: number; cx: number; cy: number; r: number }) {
  const f = ((phi % 360) + 360) % 360;
  const waxing = f <= 180;
  const k = Math.cos((f * Math.PI) / 180); // 1 at new, −1 at full
  const rx = Math.abs(k) * r;
  const top = `${cx},${cy - r}`;
  const bottom = `${cx},${cy + r}`;
  // Lit half: right side when waxing, left side when waning.
  const halfSweep = waxing ? 1 : 0;
  // Terminator: bulges into the lit half for crescents, into the dark half for gibbous.
  const crescent = k > 0;
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const lit = `M${top} A${r},${r} 0 0 ${halfSweep} ${bottom} A${rx},${r} 0 0 ${termSweep} ${top} Z`;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#3a4466" stroke={C.ink} strokeWidth={2.5} />
      {f > 2 && f < 358 && <path d={lit} fill="#f6efc9" />}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

function MoonPicture({ phi }: { phi: number }) {
  return (
    <svg viewBox="0 0 140 140" role="img" aria-label="The Moon as seen from Earth">
      <rect width={140} height={140} rx={16} fill="#1f2846" />
      <MoonFace phi={phi} cx={70} cy={70} r={48} />
    </svg>
  );
}

/** Top-down orbit picture for questions: the Sun's light comes from the left. */
function OrbitPicture({ phi }: { phi: number }) {
  const s = 0.42;
  const a = ((180 + phi) * Math.PI) / 180;
  const mx = 160 + 80 * Math.cos(a);
  const my = 95 - 80 * Math.sin(a);
  return (
    <svg viewBox="0 0 280 190" role="img" aria-label="Looking down on the Earth and Moon, with the Sun to the left">
      <rect width={280} height={190} rx={14} fill="#1f2846" />
      {[50, 95, 140].map((y) => (
        <path key={y} d={`M14,${y} h40`} stroke={C.yellow} strokeWidth={3} strokeLinecap="round" />
      ))}
      <text x={14} y={22} fontSize={13} fill={C.yellow} fontWeight={700}>
        Sunlight
      </text>
      <circle cx={160} cy={95} r={80} fill="none" stroke="#5b6890" strokeWidth={2} strokeDasharray="5 6" />
      <g transform={`translate(160 95) scale(${s})`}>
        <circle r={50} fill="#3d7fd6" stroke={C.ink} strokeWidth={4} />
        <path d="M0,-50 A50,50 0 0 0 0,50 Z" fill="#7fb2ff" />
      </g>
      <circle cx={mx} cy={my} r={12} fill="#3a4466" stroke={C.ink} strokeWidth={2} />
      <path d={`M${mx},${my - 12} A12,12 0 0 0 ${mx},${my + 12} Z`} fill="#f6efc9" />
    </svg>
  );
}

const CHALLENGES = [
  { question: 'Moon between Earth and Sun?', options: ['Full moon', 'New moon', 'Half moon'], actual: 'New moon', targets: [0], because: 'The sunlit side faces away from us, so we see almost nothing. That is a new moon.' },
  { question: 'Moon opposite the Sun?', options: ['Full moon', 'New moon', 'Half moon'], actual: 'Full moon', targets: [180], because: 'We look straight at the whole sunlit side, so we see a full moon.' },
  { question: 'Moon a quarter way round?', options: ['Full moon', 'New moon', 'Half moon'], actual: 'Half moon', targets: [90, 270], because: 'We see half of the sunlit half, so it looks half lit. This is called a quarter moon.' },
];

function MoonScene() {
  const [phi, setPhi] = useState(45);
  const [cIdx, setCIdx] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [startPhi, setStartPhi] = useState<number | null>(null);
  const [observed, setObserved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const challenge = CHALLENGES[cIdx];
  const moon = moonPos(phi);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const near = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= 12;
  useEffect(() => {
    if (guess !== null && startPhi !== null && Math.abs(phi - startPhi) > 1 && challenge.targets.some((t) => near(phi, t))) setObserved(true);
  }, [phi, guess, startPhi, challenge.targets]);

  const drag = useSvgDrag((p) => {
    cancelAnimationFrame(raf.current);
    setPlaying(false);
    setPhi(Math.round(phiFrom(p)));
  });

  const step = (deg: number) => {
    cancelAnimationFrame(raf.current);
    setPlaying(false);
    setPhi((v) => (v + deg + 360) % 360);
    play('tap');
  };

  const playMonth = () => {
    cancelAnimationFrame(raf.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      step(45);
      return;
    }
    setPlaying(true);
    const start = phi;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 9000);
      setPhi(Math.round(start + 360 * k) % 360);
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const day = Math.round((phi / 360) * DAYS);

  return (
    <SceneSvg label={`Looking down on the Earth and Moon. From Earth the Moon looks like a ${phaseName(phi).toLowerCase()}.`}>
      {/* Space */}
      <rect x={10} y={20} width={600} height={620} rx={24} fill="#1f2846" />
      {/* Sunlight from the left */}
      <circle cx={-60} cy={330} r={110} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
      <text x={60} y={92} fontSize={16} fontWeight={700} fill={C.yellow}>
        Sunlight from the Sun
      </text>
      {[120, 220, 440, 540].map((y) => (
        <g key={y}>
          <line x1={60} y1={y} x2={110} y2={y} stroke={C.yellow} strokeWidth={4} strokeLinecap="round" />
          <path d={`M118,${y} l-12,-8 v16 z`} fill={C.yellow} />
        </g>
      ))}
      <text x={60} y={600} fontSize={15} fill="#c6cde6">
        Not to scale: the Sun is really much bigger and farther away.
      </text>

      {/* Orbit, Earth and Moon (each lit on the side facing the Sun) */}
      <circle cx={EARTH.x} cy={EARTH.y} r={ORBIT_R} fill="none" stroke="#5b6890" strokeWidth={2} strokeDasharray="6 8" />
      <circle cx={EARTH.x} cy={EARTH.y} r={50} fill="#2a4f8f" stroke={C.ink} strokeWidth={3} />
      <path d={`M${EARTH.x},${EARTH.y - 50} A50,50 0 0 0 ${EARTH.x},${EARTH.y + 50} Z`} fill="#3d7fd6" />
      <path d={`M${EARTH.x - 22},${EARTH.y - 12} q14,-16 28,-4 q10,14 -6,24 q-18,4 -22,-20 z`} fill="#4cb07a" opacity={0.9} />
      <circle cx={EARTH.x} cy={EARTH.y} r={50} fill="none" stroke={C.ink} strokeWidth={3} />
      <text x={EARTH.x} y={EARTH.y + 74} textAnchor="middle" fontSize={16} fill="#c6cde6">
        Earth
      </text>
      <g {...drag} role="slider" aria-label="Drag the Moon round the Earth" aria-valuenow={phi}>
        <circle cx={moon.x} cy={moon.y} r={38} fill="transparent" />
        <circle cx={moon.x} cy={moon.y} r={26} fill="#3a4466" stroke={C.ink} strokeWidth={2.5} />
        <path d={`M${moon.x},${moon.y - 26} A26,26 0 0 0 ${moon.x},${moon.y + 26} Z`} fill="#f6efc9" />
        <circle cx={moon.x} cy={moon.y} r={26} fill="none" stroke={C.ink} strokeWidth={2.5} />
      </g>
      <text x={moon.x} y={moon.y + 50} textAnchor="middle" fontSize={15} fill="#c6cde6">
        Moon
      </text>

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard
          x={640}
          y={20}
          w={340}
          prediction={guess}
          actual={challenge.actual}
          because={challenge.because}
          onAgain={() => {
            setGuess(null);
            setObserved(false);
            setStartPhi(null);
            setCIdx((cIdx + 1) % CHALLENGES.length);
          }}
        />
      ) : (
        <g>
          <PredictCard
            x={640}
            y={20}
            w={340}
            question={challenge.question}
            options={challenge.options}
            prediction={guess}
            onPredict={(o) => {
              setGuess(o);
              setStartPhi(phi);
              play('tap');
            }}
          />
          {guess !== null && <WrapText x={652} y={140} width={320} fontSize={15} fill={C.ink2} text="Drag the Moon to that place, then look at the view from Earth." />}
        </g>
      )}

      {/* View from Earth */}
      <rect x={640} y={232} width={340} height={252} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={660} y={266} fontSize={15} fill={C.muted} className="caps">
        Seen from Earth
      </text>
      <rect x={660} y={280} width={150} height={150} rx={16} fill="#1f2846" />
      <MoonFace phi={phi} cx={735} cy={355} r={58} />
      <text x={826} y={330} fontSize={19} fontWeight={700} fill={C.ink}>
        {phaseName(phi).split(' ')[0]}
      </text>
      <text x={826} y={354} fontSize={19} fontWeight={700} fill={C.ink}>
        {phaseName(phi).split(' ').slice(1).join(' ')}
      </text>
      <text x={826} y={388} fontSize={15} fill={C.ink2}>
        about day {day}
      </text>
      <text x={826} y={410} fontSize={15} fill={C.ink2}>
        of {DAYS}
      </text>
      <WrapText x={660} y={450} width={305} fontSize={14} fill={C.ink2} text="The Moon makes no light. We see sunlight bouncing off it." />

      <SvgButton x={640} y={500} w={160} h={50} fontSize={17} label="+ 1 week" onClick={() => step(90)} disabled={playing} color={C.yellow} />
      <SvgButton x={812} y={500} w={168} h={50} fontSize={17} label="Play a month" onClick={playMonth} disabled={playing} color={C.teal} textColor={C.white} />

      <Callout at={[moon.x, moon.y]} box={[40, 40]} w={210} icon={Moon} title="Drag the Moon" text="It goes round the Earth about once a month." />
      <Callout at={[60, 220]} box={[160, 80]} w={190} icon={Sun} title="Sunlight" text="Always lights the side facing the Sun." />
      <Callout at={[735, 355]} box={[640, 560]} w={260} icon={Orbit} title="What we see" text="How much of the sunlit half faces us." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect width={120} height={80} rx={10} fill="#1f2846" />
      {[0, 90, 180, 270].map((phi, i) => (
        <MoonFace key={phi} phi={phi === 0 ? 30 : phi} cx={18 + i * 28} cy={40} r={11} />
      ))}
    </svg>
  );
}

const PHASES = [
  { name: 'New moon', phi: 0 },
  { name: 'Waxing crescent', phi: 45 },
  { name: 'First quarter', phi: 90 },
  { name: 'Waxing gibbous', phi: 135 },
  { name: 'Full moon', phi: 180 },
  { name: 'Waning gibbous', phi: 225 },
  { name: 'Last quarter', phi: 270 },
  { name: 'Waning crescent', phi: 315 },
];

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['light', 'full', 'pictureEasy']) : level === 1 ? pick(['picture', 'month', 'why', 'waxing']) : pick(['orbit', 'next', 'picture', 'why']);

  if (kind === 'light') {
    const right = 'No, it reflects sunlight';
    return {
      prompt: 'Does the Moon make its own light?',
      choices: choices(shuffle([right, 'Yes, it glows by itself'])),
      answer: right,
      hint: 'Think about where the light in the scene comes from.',
      explain: ['Only the Sun makes light here.', 'The Moon is a ball of rock.', 'So: no, it reflects sunlight.'],
    };
  }
  if (kind === 'full') {
    const right = 'Full moon';
    return {
      prompt: 'What do we call it when the whole face of the Moon is lit?',
      choices: choices(shuffle([right, 'New moon', 'First quarter'])),
      answer: right,
      hint: 'The whole face is lit up.',
      explain: ['We can see all of the sunlit side.', 'The Moon looks like a whole round circle.', 'That is a full moon.'],
    };
  }
  if (kind === 'pictureEasy' || kind === 'picture') {
    const pool = kind === 'pictureEasy' ? PHASES.filter((p) => ['New moon', 'First quarter', 'Full moon'].includes(p.name)) : PHASES.filter((p) => p.phi % 90 === 0 || p.name === 'Waxing crescent' || p.name === 'Waning crescent');
    const ph = pick(pool);
    const others = shuffle(pool.filter((p) => p.name !== ph.name)).slice(0, kind === 'pictureEasy' ? 2 : 3);
    const look =
      ph.name === 'New moon'
        ? 'It is almost all dark.'
        : ph.name === 'Full moon'
          ? 'The whole circle is lit.'
          : ph.name === 'First quarter'
            ? 'The right half is lit.'
            : ph.name === 'Last quarter'
              ? 'The left half is lit.'
              : ph.name === 'Waxing crescent'
                ? 'A thin curve is lit on the right, and it is growing.'
                : 'A thin curve is lit on the left, and it is shrinking.';
    return {
      prompt: 'Which phase is this?',
      visual: <MoonPicture phi={ph.phi === 0 ? 0 : ph.phi} />,
      choices: choices(shuffle([ph.name, ...others.map((o) => o.name)])),
      answer: ph.name,
      hint: 'How much is lit? Is it the left side or the right side?',
      explain: [look, `So this is a ${ph.name.toLowerCase()}.`],
    };
  }
  if (kind === 'month') {
    const right = 'About a month';
    return {
      prompt: 'About how long is it from one full moon to the next?',
      choices: choices(shuffle([right, 'About a day', 'About a year'])),
      answer: right,
      hint: 'The word "month" comes from "moon".',
      explain: ['The Moon takes about 29 and a half days to go through all its phases.', 'That is about a month.'],
    };
  }
  if (kind === 'why') {
    const right = 'We see different amounts of its sunlit half';
    return {
      prompt: 'Why does the Moon seem to change shape?',
      choices: choices(shuffle([right, "The Earth's shadow covers part of it", 'Clouds hide parts of it'])),
      answer: right,
      hint: 'Half of the Moon is always lit by the Sun. Which part faces us?',
      explain: ['The Sun always lights half of the Moon.', 'As the Moon goes round us, we see more or less of that lit half.', 'So: we see different amounts of its sunlit half.'],
    };
  }
  if (kind === 'waxing') {
    const right = 'Getting bigger';
    return {
      prompt: 'When the Moon is "waxing", the lit part is…',
      choices: choices(shuffle([right, 'Getting smaller', 'Staying the same'])),
      answer: right,
      hint: 'Waxing comes after a new moon, on the way to a full moon.',
      explain: ['After a new moon we see more and more of the lit side.', 'Waxing means the lit part is getting bigger.'],
    };
  }
  if (kind === 'next') {
    const i = Math.floor(Math.random() * 7);
    const now = PHASES[i];
    const after = PHASES[i + 1];
    const others = shuffle(PHASES.filter((p) => p.name !== after.name && p.name !== now.name)).slice(0, 2);
    return {
      prompt: `What phase comes after a ${now.name.toLowerCase()}?`,
      choices: choices(shuffle([after.name, ...others.map((o) => o.name)])),
      answer: after.name,
      hint: 'The order goes new → crescent → quarter → gibbous → full, then back again.',
      explain: [`The phases go in order round the month.`, `After a ${now.name.toLowerCase()} comes a ${after.name.toLowerCase()}.`],
    };
  }
  // 'orbit': where the Moon is → what we see
  const pos = pick([PHASES[0], PHASES[2], PHASES[4], PHASES[6]]);
  const where = pos.phi === 0 ? 'between the Earth and the Sun' : pos.phi === 180 ? 'on the far side of the Earth from the Sun' : 'a quarter of the way round';
  return {
    prompt: 'The Moon is here. What do we see from Earth?',
    visual: <OrbitPicture phi={pos.phi} />,
    choices: choices(shuffle(['New moon', 'First quarter', 'Full moon', 'Last quarter'])),
    answer: pos.name,
    hint: 'Sunlight comes from the left. How much of the lit half faces the Earth?',
    explain: [`The Moon is ${where}${pos.phi === 270 ? ', coming back towards the Sun side' : ''}.`, pos.phi === 0 ? 'Its lit half faces away from us.' : pos.phi === 180 ? 'Its whole lit half faces us.' : 'We see half of its lit half.', `So we see a ${pos.name.toLowerCase()}.`],
  };
}

export const moonPhases: Lesson = {
  id: 'moon-phases',
  title: 'Moon Phases',
  Thumb,
  Scene: MoonScene,
  sceneHint: 'Predict · Then drag the Moon round the Earth and watch its shape',
  learn: {
    heading: 'Phases of the Moon',
    intro:
      'The Moon makes no light of its own. The Sun always lights half of it. As the Moon goes round the Earth, about once a month, we see different amounts of that lit half.',
    points: [
      { icon: Sun, text: 'The Sun always lights half of the Moon.' },
      { icon: Orbit, text: 'The Moon goes round the Earth about once a month.' },
      { icon: CalendarDays, text: 'New → crescent → quarter → gibbous → full, and back again.' },
    ],
  },
  steps: [
    'Find the Sun: that is where the light comes from.',
    'Find which half of the Moon is lit.',
    'Imagine standing on the Earth and looking at the Moon.',
    'How much of the lit half can you see? That is the phase.',
  ],
  example: {
    question: 'The Moon is on the far side of the Earth from the Sun. What do we see?',
    visual: <OrbitPicture phi={180} />,
    work: ['Sunlight lights the side of the Moon facing the Sun.', 'From Earth we look straight at that lit side.'],
    answer: 'A full moon.',
  },
  grownups: [
    'A common mix-up is that the Earth’s shadow makes the phases. It doesn’t: that only happens during a lunar eclipse.',
    'Look at the Moon together for a few evenings and draw its shape each time.',
    'Try it with a lamp (the Sun), your head (the Earth) and a ball on a stick (the Moon) in a dark room.',
    'These views are as seen from the northern half of the Earth. South of the equator the lit side is flipped.',
  ],
  makeQuestion,
};
