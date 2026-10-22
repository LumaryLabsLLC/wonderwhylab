import { useRef, useState } from 'react';
import { ArrowDownRight, Footprints, Mountain, Ruler } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { NumberCard, SceneSvg, SvgButton } from '../../../stage/widgets';
import { useFrame } from './visuals/anim';
import { byLevel, mcq } from './q';
import { numberChoices, pick, rand } from '../../../lib/random';

type Surface = 'ice' | 'wood' | 'carpet';
type Height = 1 | 2 | 3;

/**
 * Simplified physics: a higher ramp gives the car more speed at the bottom, and a smoother floor
 * (less friction) lets it roll further. Distance in floor blocks = height × grip factor.
 */
export const ROLL: Record<Surface, number> = { ice: 3, wood: 2, carpet: 1 };
export const distanceFor = (h: Height, s: Surface) => h * ROLL[s];

const SURFACE: Record<Surface, { name: string; color: string; rough: string }> = {
  ice: { name: 'Ice', color: '#d6f0fb', rough: 'very smooth' },
  wood: { name: 'Wood', color: C.wood, rough: 'a bit rough' },
  carpet: { name: 'Carpet', color: '#e7a5a0', rough: 'very rough' },
};

const FLOOR_Y = 560;
const RAMP_X0 = 60;
const RAMP_X1 = 320;
const BLOCK = 64;
const RAMP_H: Record<Height, number> = { 1: 110, 2: 180, 3: 250 };

function SurfaceFill({ s, x, y, w, h }: { s: Surface; x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={SURFACE[s].color} />
      {s === 'wood' &&
        Array.from({ length: Math.floor(w / 80) }, (_, i) => (
          <line key={i} x1={x + 40 + i * 80} y1={y} x2={x + 40 + i * 80} y2={y + h} stroke={shade(C.wood, -0.25)} strokeWidth={2} />
        ))}
      {s === 'carpet' &&
        Array.from({ length: Math.floor(w / 14) }, (_, i) => (
          <circle key={i} cx={x + 7 + i * 14} cy={y + 8 + (i % 2) * 8} r={2.2} fill={shade('#e7a5a0', -0.3)} />
        ))}
      {s === 'ice' && <path d={`M${x + 20},${y + 6} l60,0 M${x + 200},${y + 10} l40,0 M${x + 420},${y + 6} l70,0`} stroke={C.white} strokeWidth={4} strokeLinecap="round" />}
    </g>
  );
}

export function Car({ x, y, angle = 0, color = C.red }: { x: number; y: number; angle?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-34} y={-34} width={68} height={24} rx={8} fill={color} stroke={C.ink} strokeWidth={2.5} />
      <path d="M-18,-34 L-10,-48 L12,-48 L20,-34 Z" fill={shade(color, 0.5)} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={-18} cy={-8} r={9} fill={C.ink} />
      <circle cx={18} cy={-8} r={9} fill={C.ink} />
      <circle cx={-18} cy={-8} r={3.5} fill={C.white} />
      <circle cx={18} cy={-8} r={3.5} fill={C.white} />
    </g>
  );
}

interface Run {
  h: Height;
  s: Surface;
  d: number;
}

const PAST = 5;

/** Predict → observe → explain: the first try asks "past block 5?", later tries compare with the last one. */
type Poe =
  | { kind: 'past'; guess: string | null }
  | { kind: 'compare'; prev: Run; guess: string | null };

function poeResult(poe: Poe, run: Run): { actual: string; because: string } {
  if (poe.kind === 'past') {
    const past = run.d >= PAST;
    return {
      actual: past ? 'Yes' : 'No',
      because: past
        ? `It rolled ${run.d} blocks. Lots of speed and little friction let it go far.`
        : `It rolled ${run.d} blocks. Friction from the floor slowed it down before block ${PAST}.`,
    };
  }
  const { prev } = poe;
  const actual = run.d > prev.d ? 'Farther' : run.d < prev.d ? 'Not as far' : 'Same';
  const parts: string[] = [];
  if (run.h !== prev.h) parts.push(run.h > prev.h ? 'A higher ramp gave it more speed.' : 'A lower ramp gave it less speed.');
  if (run.s !== prev.s)
    parts.push(
      ROLL[run.s] > ROLL[prev.s]
        ? `${SURFACE[run.s].name} is smoother than ${SURFACE[prev.s].name.toLowerCase()}, so less friction.`
        : `${SURFACE[run.s].name} is rougher than ${SURFACE[prev.s].name.toLowerCase()}, so more friction.`,
    );
  if (!parts.length) parts.push('Same ramp and same floor, so the car rolls the same way.');
  return { actual, because: `${run.d} blocks this time. ${parts.join(' ')}` };
}

function RampScene() {
  const [height, setHeight] = useState<Height>(2);
  const [surface, setSurface] = useState<Surface>('wood');
  const [runs, setRuns] = useState<Run[]>([]);
  const [anim, setAnim] = useState<{ t: number; d: number } | null>(null);
  const [rest, setRest] = useState<number | null>(null);
  const [poe, setPoe] = useState<Poe>({ kind: 'past', guess: null });
  const [result, setResult] = useState<{ actual: string; because: string } | null>(null);
  const animRef = useRef(anim);
  animRef.current = anim;
  const poeAtLaunch = useRef<Poe | null>(null);

  const H = RAMP_H[height];
  const rampLen = Math.hypot(RAMP_X1 - RAMP_X0, H);
  const slope = (Math.atan2(H, RAMP_X1 - RAMP_X0) * 180) / Math.PI;
  const RAMP_TIME = 0.9;
  const floorTime = (d: number) => 0.6 + 0.28 * d;

  useFrame((dt) => {
    const a = animRef.current;
    if (!a) return;
    const t = a.t + dt;
    if (t >= RAMP_TIME + floorTime(a.d)) {
      const run = { h: height, s: surface, d: a.d };
      setAnim(null);
      setRest(a.d);
      setRuns((r) => [run, ...r].slice(0, 4));
      if (poeAtLaunch.current) setResult(poeResult(poeAtLaunch.current, run));
      poeAtLaunch.current = null;
      play('pop');
      return;
    }
    setAnim({ ...a, t });
  });

  const go = () => {
    if (anim) return;
    setRest(null);
    setResult(null);
    poeAtLaunch.current = poe;
    setAnim({ t: 0, d: distanceFor(height, surface) });
    play('whoosh');
  };

  /** Next prediction: compare the next try with the one we just saw. */
  const nextPrediction = () => {
    setResult(null);
    setPoe(runs[0] ? { kind: 'compare', prev: runs[0], guess: null } : { kind: 'past', guess: null });
  };
  const change = (fn: () => void) => {
    fn();
    setRest(null);
    if (result) nextPrediction();
  };

  // Where is the car right now?
  let carX = RAMP_X0 + 30;
  let carY = FLOOR_Y - H + ((30 / (RAMP_X1 - RAMP_X0)) * H);
  let angle = slope;
  if (anim) {
    if (anim.t < RAMP_TIME) {
      const u = (anim.t / RAMP_TIME) ** 2; // speeds up going down
      const along = 30 + u * (rampLen - 30);
      carX = RAMP_X0 + (along / rampLen) * (RAMP_X1 - RAMP_X0);
      carY = FLOOR_Y - H + (along / rampLen) * H;
    } else {
      const u = Math.min(1, (anim.t - RAMP_TIME) / floorTime(anim.d));
      const s = 1 - (1 - u) ** 2; // slows down on the floor
      carX = RAMP_X1 + s * anim.d * BLOCK;
      carY = FLOOR_Y;
      angle = 0;
    }
  } else if (rest !== null) {
    carX = RAMP_X1 + rest * BLOCK;
    carY = FLOOR_Y;
    angle = 0;
  }

  return (
    <SceneSvg label={`A car on a ${['', 'low', 'medium', 'high'][height]} ramp over ${surface}`}>
      {/* Floor with a block ruler */}
      <SurfaceFill s={surface} x={RAMP_X1} y={FLOOR_Y} w={640} h={26} />
      <rect x={RAMP_X1} y={FLOOR_Y} width={640} height={26} fill="none" stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i}>
          <line x1={RAMP_X1 + i * BLOCK} y1={FLOOR_Y + 26} x2={RAMP_X1 + i * BLOCK} y2={FLOOR_Y + 40} stroke={C.ink} strokeWidth={2} />
          <text x={RAMP_X1 + i * BLOCK} y={FLOOR_Y + 60} textAnchor="middle" fontSize={16} fill={C.ink2} className="num">
            {i}
          </text>
        </g>
      ))}
      <text x={RAMP_X1 + 320} y={FLOOR_Y + 90} textAnchor="middle" fontSize={15} fill={C.muted}>
        blocks rolled
      </text>

      {/* Ramp */}
      <polygon points={`${RAMP_X0},${FLOOR_Y + 26} ${RAMP_X0},${FLOOR_Y - H} ${RAMP_X1},${FLOOR_Y} ${RAMP_X1},${FLOOR_Y + 26}`} fill={shade(C.wood, -0.1)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={RAMP_X0} y1={FLOOR_Y - H} x2={RAMP_X1} y2={FLOOR_Y} stroke={SURFACE[surface].color} strokeWidth={10} />
      <line x1={RAMP_X0} y1={FLOOR_Y - H} x2={RAMP_X1} y2={FLOOR_Y} stroke={C.ink} strokeWidth={2} transform="translate(0 -5)" />

      {rest !== null && !anim && <line x1={carX} y1={FLOOR_Y - 60} x2={carX} y2={FLOOR_Y + 40} stroke={C.red} strokeWidth={3} strokeDasharray="6 5" />}
      <Car x={carX} y={carY - 3} angle={angle} />

      {/* Controls */}
      <text x={640} y={64} fontSize={16} fill={C.muted} className="caps">
        Ramp height
      </text>
      {([1, 2, 3] as Height[]).map((h, i) => (
        <SvgButton key={h} x={640 + i * 108} y={76} w={98} h={48} fontSize={17} label={['Low', 'Middle', 'High'][i]} active={height === h} color={height === h ? C.yellow : C.card} onClick={() => change(() => setHeight(h))} />
      ))}
      <text x={640} y={160} fontSize={16} fill={C.muted} className="caps">
        Floor
      </text>
      {(['ice', 'wood', 'carpet'] as Surface[]).map((s, i) => (
        <SvgButton key={s} x={640 + i * 108} y={172} w={98} h={48} fontSize={17} label={SURFACE[s].name} active={surface === s} color={surface === s ? SURFACE[s].color : C.card} onClick={() => change(() => setSurface(s))} />
      ))}
      <SvgButton x={640} y={252} w={314} h={56} fontSize={20} label={anim ? 'Rolling…' : 'Let it go!'} color={C.teal} textColor={C.white} disabled={!!anim} onClick={go} />
      <NumberCard x={640} y={330} w={140} h={110} value={rest ?? '?'} caption="blocks" />

      {/* Results so far */}
      <text x={810} y={348} fontSize={15} fill={C.muted} className="caps">
        Tries
      </text>
      {runs.map((r, i) => (
        <text key={i} x={810} y={374 + i * 22} fontSize={15} fill={C.ink2}>
          {['', 'Low', 'Middle', 'High'][r.h]} · {SURFACE[r.s].name}: {r.d}
        </text>
      ))}

      {/* Predict → observe → explain */}
      {result ? (
        <ExplainCard x={40} y={24} w={380} prediction={poe.guess} actual={result.actual} because={result.because} onAgain={nextPrediction} />
      ) : (
        <PredictCard
          x={40}
          y={24}
          w={380}
          question={poe.kind === 'past' ? `Will it pass block ${PAST}?` : 'Farther than last time?'}
          options={poe.kind === 'past' ? ['Yes', 'No'] : ['Farther', 'Not as far', 'Same']}
          prediction={poe.guess}
          onPredict={(g) => setPoe({ ...poe, guess: g })}
        />
      )}

      <Callout at={[RAMP_X0 + 10, FLOOR_Y - H]} box={[440, 230]} w={180} icon={Mountain} title="Higher ramp" text="Starting higher makes the car go faster at the bottom." />
      <Callout at={[RAMP_X1 + 160, FLOOR_Y + 10]} box={[380, 420]} w={230} icon={Footprints} title="Friction" text="Rough floors rub on the wheels and slow the car down." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <polygon points="8,64 8,26 56,64" fill={shade(C.wood, -0.1)} stroke={C.ink} strokeWidth={2} />
      <rect x={56} y={64} width={58} height={6} fill="#d6f0fb" stroke={C.ink} strokeWidth={1.5} />
      <g transform="translate(90 64) scale(0.45)">
        <Car x={0} y={0} />
      </g>
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

const SURFACES: Surface[] = ['ice', 'wood', 'carpet'];

function farthestFloor(): Question {
  const pair = pick([
    ['ice', 'carpet'],
    ['ice', 'wood'],
    ['wood', 'carpet'],
  ] as [Surface, Surface][]);
  const best = ROLL[pair[0]] > ROLL[pair[1]] ? pair[0] : pair[1];
  const other = best === pair[0] ? pair[1] : pair[0];
  return mcq({
    prompt: `Same ramp. Which floor lets the car roll farther: ${SURFACE[pair[0]].name.toLowerCase()} or ${SURFACE[pair[1]].name.toLowerCase()}?`,
    answer: SURFACE[best].name,
    wrong: [SURFACE[other].name],
    hint: 'Which floor is smoother? Smooth floors rub less.',
    explain: [`${SURFACE[best].name} is ${SURFACE[best].rough}; ${SURFACE[other].name.toLowerCase()} is ${SURFACE[other].rough}.`, 'Less rubbing (friction) means the car slows down less.', `So it rolls farther on ${SURFACE[best].name.toLowerCase()}.`],
  });
}

function higherRamp(): Question {
  return mcq({
    prompt: 'Which ramp makes the car roll farther across the floor?',
    answer: 'The high ramp',
    wrong: ['The low ramp'],
    hint: 'Where does the car go fastest at the bottom?',
    explain: ['A car starting higher goes faster at the bottom.', 'A faster car rolls farther before it stops.', 'So the high ramp wins.'],
  });
}

function slowsDown(): Question {
  return mcq({
    prompt: 'What slows the rolling car down on the floor?',
    answer: 'Friction',
    wrong: ['Magnets', 'Sunlight'],
    hint: 'What happens when the wheels rub on the floor?',
    explain: ['The wheels rub against the floor as they roll.', 'That rubbing force is called friction.', 'Friction slows the car down until it stops.'],
  });
}

function slipperiest(): Question {
  const answer = 'Ice';
  return mcq({
    prompt: 'Which floor has the least friction?',
    answer,
    wrong: SURFACES.filter((s) => s !== 'ice').map((s) => SURFACE[s].name),
    hint: 'Which one would you slip on?',
    explain: ['Friction is the rubbing that slows things down.', 'Ice is very smooth and slippery, so it rubs the least.', 'Ice has the least friction.'],
  });
}

function twiceAsHigh(): Question {
  const s = pick(SURFACES);
  const low = distanceFor(1, s);
  const answer = distanceFor(2, s);
  return mcq({
    prompt: `On ${SURFACE[s].name.toLowerCase()}, a low ramp sends the car ${low} ${low === 1 ? 'block' : 'blocks'}. About how far will a ramp twice as high send it?`,
    answer: String(answer),
    wrong: numberChoices(answer, { count: 3, min: 1, max: 9 }).filter((v) => v !== String(answer)).slice(0, 2),
    hint: 'A higher start gives the car more speed. Try it on the playground!',
    explain: ['Starting twice as high gives the car twice as much energy to use up.', `So it rolls about twice as far: ${low} + ${low} = ${answer}.`],
  });
}

function whyBrakes(): Question {
  return mcq({
    prompt: 'Why do bike brakes squeeze the wheels?',
    answer: 'To add friction and slow down',
    wrong: ['To make the bike lighter', 'To make the wheels spin faster'],
    hint: 'What does rubbing do to things that are moving?',
    explain: ['Squeezing makes the brake pads rub on the wheel.', 'Rubbing is friction, and friction slows things down.', 'So brakes squeeze the wheels to add friction and slow down.'],
  });
}

function farthestNumber(): Question {
  const h = rand(1, 3) as Height;
  const s = pick(SURFACES);
  const answer = distanceFor(h, s);
  return mcq({
    prompt: `Try it on the playground! How many blocks does the car roll from the ${['', 'low', 'middle', 'high'][h]} ramp onto ${SURFACE[s].name.toLowerCase()}?`,
    answer: String(answer),
    wrong: numberChoices(answer, { count: 3, min: 1, max: 9 }).filter((v) => v !== String(answer)).slice(0, 2),
    hint: 'Set the height and floor, then let the car go.',
    explain: [`Set the ramp to ${['', 'low', 'middle', 'high'][h]} and the floor to ${SURFACE[s].name.toLowerCase()}.`, `Let it go and read where it stops: ${answer} blocks.`],
  });
}

export const rampsAndFriction: Lesson = {
  id: 'ramps-and-friction',
  title: 'Ramps',
  Thumb,
  Scene: RampScene,
  sceneHint: 'Guess first · Pick a height and a floor · Let the car go and see how far it rolls',
  learn: {
    heading: 'Ramps and friction',
    intro: 'A car rolls faster down a higher ramp. When it reaches the floor, rubbing between the wheels and the floor slows it down. That rubbing is called friction.',
    points: [
      { icon: Mountain, text: 'Higher ramp → more speed → the car rolls farther.' },
      { icon: Footprints, text: 'Rough floors like carpet have lots of friction.' },
      { icon: ArrowDownRight, text: 'Smooth floors like ice have little friction, so things slide far.' },
      { icon: Ruler, text: 'Measure how far it rolls to compare fairly.' },
    ],
  },
  steps: [
    'Make a guess first: how far will the car roll?',
    'Choose one thing to change: the height or the floor.',
    'Keep everything else the same so the test is fair.',
    'Let the car go and count the blocks it rolls.',
    'Compare your tries. Which went farthest, and why?',
  ],
  example: {
    question: 'A car rolls down the same ramp onto carpet and onto ice. Where does it go farther?',
    work: ['Carpet is rough, so it rubs the wheels a lot.', 'Ice is smooth, so it rubs very little.', 'Less friction means less slowing down.'],
    answer: 'It goes farther on ice.',
  },
  grownups: [
    'Make a ramp from a book and a tray. Roll a toy car onto a towel, then onto the bare floor, and measure with steps or blocks.',
    'Talk about fair tests: only change one thing at a time.',
    'Friction is also why we have grippy shoes and why slides are smooth.',
  ],
  makeQuestion: (level) => byLevel(level, [[farthestFloor, higherRamp], [slowsDown, slipperiest, farthestFloor, farthestNumber], [twiceAsHigh, whyBrakes, farthestNumber]]),
};
