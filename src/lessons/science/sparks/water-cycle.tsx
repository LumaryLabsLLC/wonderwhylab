import { useRef, useState } from 'react';
import { Cloud, CloudRain, Sun, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard, wrap } from '../../../stage/Predict';
import { SceneSvg } from '../../../stage/widgets';
import { useFrame } from './visuals/anim';
import { byLevel, mcq } from './q';

const SEA_EDGE = 470;
const SUN_Y = 185;
const CLOUD_Y = 285;
const PEAK = { x: 760, y: 270 };

type Stage = 'evaporation' | 'condensation' | 'precipitation' | 'collection';
const STAGES: { id: Stage; name: string; color: string }[] = [
  { id: 'evaporation', name: 'Evaporation', color: C.orange },
  { id: 'condensation', name: 'Condensation', color: C.purple },
  { id: 'precipitation', name: 'Precipitation', color: C.blue },
  { id: 'collection', name: 'Collection', color: C.teal },
];

/** Predict → observe → explain: three experiments in turn. */
const EXPERIMENTS = [
  { question: 'Sun on the sea. The cloud will…', options: ['Grow', 'Shrink'], todo: 'Keep the Sun over the sea and watch the cloud.' },
  { question: 'Cloud over the land. It will…', options: ['Rain', 'Stay dry'], todo: 'Drag the cloud over the land.' },
  { question: 'Cloud over the mountain. It will…', options: ['Rain', 'Snow'], todo: 'Drag the cloud over the mountain top.' },
];

const BECAUSE: Record<string, string> = {
  Grow: 'The Sun warms the sea. Water rises as invisible vapour and joins the cloud.',
  Rain: 'Tiny drops in the cloud join up and get heavy, so they fall as rain.',
  'Stay dry': 'This cloud does not hold enough water yet. Let the Sun warm the sea first.',
  Snow: 'High on the mountain it is very cold, so the water drops freeze into snow.',
};

interface Sim {
  vapor: number;
  river: number;
  t: number;
}

function WaterCycleScene() {
  const [sunX, setSunX] = useState(250);
  const [cloudX, setCloudX] = useState(330);
  const [sim, setSim] = useState<Sim>({ vapor: 20, river: 0, t: 0 });
  const rained = useRef(false);
  const [poe, setPoe] = useState<{ step: number; guess: string | null; vapor0: number }>({ step: 0, guess: null, vapor0: 0 });
  const [actual, setActual] = useState<string | null>(null);
  const dryFor = useRef(0);

  const sunDrag = useSvgDrag((p) => setSunX(clamp(p.x, 90, 900)));
  const cloudDrag = useSvgDrag((p) => setCloudX(clamp(p.x, 150, 880)));

  const evaporating = sunX < SEA_EDGE && sim.vapor < 100;
  const overLand = cloudX > 540;
  const raining = overLand && sim.vapor > 25;
  const snowing = raining && Math.abs(cloudX - PEAK.x) < 90;

  useFrame((dt) => {
    setSim((s) => {
      let vapor = s.vapor;
      let river = s.river;
      if (evaporating) vapor = Math.min(100, vapor + 16 * dt);
      if (raining) {
        vapor = Math.max(0, vapor - 22 * dt);
        river = Math.min(100, river + 28 * dt);
      }
      river = Math.max(0, river - 7 * dt);
      return { vapor, river, t: s.t + dt };
    });
    if (raining && !rained.current) {
      rained.current = true;
      play('pop');
    }
    if (!raining) rained.current = false;

    // Observe the experiment (only after a guess, so the child predicts first).
    if (!poe.guess || actual) return;
    if (poe.step === 0 && evaporating && sim.vapor >= Math.min(98, poe.vapor0 + 15)) setActual('Grow');
    if (poe.step === 1) {
      if (raining) setActual('Rain');
      else if (overLand) {
        dryFor.current += dt;
        if (dryFor.current > 1.5) setActual('Stay dry');
      } else dryFor.current = 0;
    }
    if (poe.step === 2 && snowing) setActual('Snow');
  });

  const exp = EXPERIMENTS[poe.step];
  const nextExperiment = () => {
    setActual(null);
    dryFor.current = 0;
    setPoe({ step: (poe.step + 1) % EXPERIMENTS.length, guess: null, vapor0: sim.vapor });
  };
  const explainH = actual ? 86 + wrap(BECAUSE[actual], Math.floor((420 - 28) / 8.6)).length * 21 + 56 : 0;

  const active: Record<Stage, boolean> = {
    evaporation: evaporating,
    condensation: sim.vapor > 20,
    precipitation: raining,
    collection: sim.river > 5,
  };

  const crx = 60 + sim.vapor * 0.9;
  const cry = 34 + sim.vapor * 0.35;
  const cloudFill = shade('#ffffff', -Math.min(0.45, sim.vapor / 220));
  const t = sim.t;
  const riverWidth = 3 + sim.river * 0.12;

  return (
    <SceneSvg label="The water cycle: sea, sun, cloud, rain and river">
      <defs>
        <linearGradient id="sparks-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe2ff" />
          <stop offset="1" stopColor="#eef7ff" />
        </linearGradient>
      </defs>
      <rect x={30} y={40} width={940} height={600} rx={30} fill="url(#sparks-sky)" stroke={C.line} strokeWidth={2} />

      {/* The four stages light up as they happen */}
      {STAGES.map((st, i) => (
        <g key={st.id}>
          <rect x={60 + i * 228} y={58} width={212} height={44} rx={22} fill={active[st.id] ? st.color : C.white} stroke={active[st.id] ? C.ink : C.line} strokeWidth={2} />
          <text x={166 + i * 228} y={81} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={active[st.id] ? C.white : C.muted}>
            {i + 1}. {st.name}
          </text>
        </g>
      ))}

      {/* Land, mountain and river */}
      <path d="M470,640 L470,520 Q520,505 560,512 L970,512 L970,640 Z" fill="#7cc576" />
      <polygon points={`560,520 ${PEAK.x},${PEAK.y} 965,520`} fill="#98a3ae" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={`${PEAK.x - 52},${PEAK.y + 70} ${PEAK.x},${PEAK.y} ${PEAK.x + 52},${PEAK.y + 70} ${PEAK.x + 20},${PEAK.y + 58} ${PEAK.x},${PEAK.y + 76} ${PEAK.x - 22},${PEAK.y + 58}`} fill={C.white} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path id="sparks-river" d="M735,400 C700,450 760,480 690,520 C620,560 560,540 470,575" fill="none" stroke="#3d7fd6" strokeWidth={riverWidth} strokeLinecap="round" opacity={0.35 + sim.river / 140} />
      {sim.river > 5 && (
        <path d="M735,400 C700,450 760,480 690,520 C620,560 560,540 470,575" fill="none" stroke={C.white} strokeWidth={2.5} strokeDasharray="10 18" strokeDashoffset={-t * 60} strokeLinecap="round" opacity={0.9} />
      )}

      {/* Sea */}
      <path d={`M30,500 Q90,${490 + Math.sin(t * 2) * 4} 150,500 T270,500 T390,500 T${SEA_EDGE},500 L${SEA_EDGE},640 L30,640 Z`} fill="#3d7fd6" />
      <path d="M60,540 q20,-8 40,0 M200,570 q20,-8 40,0 M330,535 q20,-8 40,0" fill="none" stroke={C.white} strokeWidth={3} strokeLinecap="round" opacity={0.6} />

      {/* Water vapour rising from the sea */}
      {evaporating &&
        [-60, -20, 20, 60].map((dx, i) => {
          const x = clamp(sunX + dx, 50, SEA_EDGE - 20);
          const rise = (t * 50 + i * 40) % 160;
          return (
            <path
              key={dx}
              d={`M${x},${490 - rise} q-8,-12 0,-24 q8,-12 0,-24`}
              fill="none"
              stroke={C.white}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.9 - rise / 200}
            />
          );
        })}

      {/* Rain or snow */}
      {raining &&
        Array.from({ length: 10 }, (_, i) => {
          const x = cloudX - crx * 0.7 + (i / 9) * crx * 1.4;
          const fall = (t * (snowing ? 70 : 260) + i * 37) % 200;
          const y = CLOUD_Y + cry * 0.6 + fall;
          return snowing ? (
            <text key={i} x={x} y={y} fontSize={20} fill={C.white} stroke={C.blue} strokeWidth={0.5} textAnchor="middle">
              ❄
            </text>
          ) : (
            <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 16} stroke="#3d7fd6" strokeWidth={4} strokeLinecap="round" />
          );
        })}

      {/* Cloud (drag) */}
      <g {...cloudDrag} role="slider" aria-label="Cloud" aria-valuenow={Math.round(cloudX)}>
        <ellipse cx={cloudX} cy={CLOUD_Y + 10} rx={crx + 10} ry={cry + 14} fill="transparent" />
        <ellipse cx={cloudX - crx * 0.45} cy={CLOUD_Y + 8} rx={crx * 0.55} ry={cry * 0.8} fill={cloudFill} stroke={C.ink} strokeWidth={2.5} />
        <ellipse cx={cloudX + crx * 0.45} cy={CLOUD_Y + 8} rx={crx * 0.55} ry={cry * 0.8} fill={cloudFill} stroke={C.ink} strokeWidth={2.5} />
        <ellipse cx={cloudX} cy={CLOUD_Y - 6} rx={crx * 0.6} ry={cry} fill={cloudFill} stroke={C.ink} strokeWidth={2.5} />
        <ellipse cx={cloudX} cy={CLOUD_Y + 12} rx={crx * 0.85} ry={cry * 0.55} fill={cloudFill} />
      </g>

      {/* Sun (drag) */}
      <g {...sunDrag} role="slider" aria-label="Sun" aria-valuenow={Math.round(sunX)}>
        <circle cx={sunX} cy={SUN_Y} r={70} fill="transparent" />
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2 + t * 0.3;
          return <line key={i} x1={sunX + Math.cos(a) * 52} y1={SUN_Y + Math.sin(a) * 52} x2={sunX + Math.cos(a) * 66} y2={SUN_Y + Math.sin(a) * 66} stroke={C.orange} strokeWidth={5} strokeLinecap="round" />;
        })}
        <circle cx={sunX} cy={SUN_Y} r={44} fill={C.yellow} stroke={C.orange} strokeWidth={4} />
      </g>

      <text x={940} y={620} textAnchor="end" fontSize={15} fill={C.ink2}>
        {snowing ? 'Cold on the mountain: it snows!' : raining ? 'Raining on the land' : evaporating ? 'The Sun warms the sea' : overLand ? 'The cloud needs more water' : 'Drag the cloud over the land'}
      </text>

      {/* Predict → observe → explain */}
      {actual ? (
        <ExplainCard x={40} y={634 - explainH} w={420} prediction={poe.guess} actual={actual} because={BECAUSE[actual]} onAgain={nextExperiment} />
      ) : (
        <g>
          <PredictCard
            x={40}
            y={poe.guess ? 504 : 506}
            w={420}
            question={exp.question}
            options={exp.options}
            prediction={poe.guess}
            onPredict={(g) => {
              dryFor.current = 0;
              setPoe({ ...poe, guess: g, vapor0: sim.vapor });
            }}
          />
          {poe.guess && (
            <text x={54} y={622} fontSize={15} fontWeight={600} fill={C.white}>
              {poe.step === 0 && sim.vapor >= 98 ? 'The cloud is full! Let it rain on the land first.' : exp.todo}
            </text>
          )}
        </g>
      )}

      <Callout at={[200, 495]} box={[60, 380]} w={230} icon={Sun} title="Warm water rises" text="The Sun warms the sea and water floats up as invisible vapour." />
      <Callout at={[PEAK.x + 70, PEAK.y + 120]} box={[760, 400]} w={190} icon={CloudRain} title="Falls back down" text="Cloud drops grow heavy and fall as rain or snow." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={2} y={2} width={116} height={76} rx={10} fill="#d6ecff" />
      <circle cx={22} cy={18} r={9} fill={C.yellow} stroke={C.orange} strokeWidth={2} />
      <ellipse cx={74} cy={22} rx={20} ry={10} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
      <path d="M66,34 l-2,6 M74,34 l-2,6 M82,34 l-2,6" stroke={C.blue} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M2,60 L54,60 L54,78 L2,78 Z" fill={C.blue} />
      <polygon points="54,62 90,34 118,62" fill="#98a3ae" />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

function fallsFromClouds(): Question {
  return mcq({
    prompt: 'What falls from clouds?',
    answer: 'Rain or snow',
    wrong: ['Sand', 'Leaves'],
    hint: 'Drag the cloud over the land on the playground.',
    explain: ['Clouds are made of tiny drops of water.', 'When the drops get big and heavy they fall down as rain or snow.'],
  });
}

function riverGoes(): Question {
  return mcq({
    prompt: 'Where does the water in rivers flow to?',
    answer: 'The sea',
    wrong: ['The sky', 'The Sun'],
    hint: 'Follow the river downhill on the playground.',
    explain: ['Water always flows downhill.', 'Rivers carry rain water down from hills back to the sea.'],
  });
}

function sunWarms(): Question {
  return mcq({
    prompt: 'What warms the sea so water rises into the air?',
    answer: 'The Sun',
    wrong: ['The Moon', 'The wind'],
    hint: 'Drag something warm over the sea on the playground.',
    explain: ['Heat makes water turn into vapour.', 'The heat comes from the Sun.'],
  });
}

const WORDS: { stage: Stage; prompt: string; why: string }[] = [
  { stage: 'evaporation', prompt: 'The Sun warms water and it rises into the air as vapour. This is called…', why: 'Water turning into vapour and rising up is evaporation.' },
  { stage: 'condensation', prompt: 'Water vapour cools high in the sky and makes tiny drops in clouds. This is called…', why: 'Vapour cooling back into tiny drops is condensation.' },
  { stage: 'precipitation', prompt: 'Rain, snow and hail falling from clouds are called…', why: 'Any water falling from clouds is precipitation.' },
  { stage: 'collection', prompt: 'Rain gathering in rivers, lakes and the sea is called…', why: 'Water gathering together again is collection.' },
];

function stageWord(): Question {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  const answer = STAGES.find((s) => s.id === w.stage)!.name;
  const others = STAGES.filter((s) => s.id !== w.stage).map((s) => s.name);
  return mcq({
    prompt: w.prompt,
    answer,
    wrong: others.sort(() => Math.random() - 0.5).slice(0, 2),
    hint: 'Look at the four steps across the top of the playground.',
    explain: [w.why, `The answer is ${answer.toLowerCase()}.`],
  });
}

function afterStage(): Question {
  const i = Math.floor(Math.random() * 4);
  const now = STAGES[i];
  const next = STAGES[(i + 1) % 4];
  return mcq({
    prompt: `In the water cycle, what comes after ${now.name.toLowerCase()}?`,
    answer: next.name,
    wrong: STAGES.filter((s) => s !== next && s !== now).map((s) => s.name),
    hint: 'The water goes up, makes clouds, falls, then gathers.',
    explain: ['The cycle goes: evaporation, condensation, precipitation, collection, and round again.', `After ${now.name.toLowerCase()} comes ${next.name.toLowerCase()}.`],
  });
}

function whyFalls(): Question {
  return mcq({
    prompt: 'Why does rain fall out of a cloud?',
    answer: 'The drops get big and heavy',
    wrong: ['The cloud gets too hot', 'The wind pushes the cloud over'],
    hint: 'Watch the cloud get darker as it fills up.',
    explain: ['Tiny cloud drops bump together and join up.', 'When the drops get big and heavy, they fall as rain.'],
  });
}

function mostWater(): Question {
  return mcq({
    prompt: 'Where is most of the water on Earth?',
    answer: 'In the oceans',
    wrong: ['In clouds', 'In rivers'],
    hint: 'Think about how much of a globe is blue.',
    explain: ['Oceans cover most of the Earth.', 'Almost all the Earth’s water is in the oceans.'],
  });
}

export const waterCycle: Lesson = {
  id: 'water-cycle',
  title: 'The Water Cycle',
  Thumb,
  Scene: WaterCycleScene,
  sceneHint: 'Make a guess · Drag the Sun over the sea · Then drag the cloud over the land and mountain',
  learn: {
    heading: 'The water cycle',
    intro: 'The same water goes round and round. The Sun warms the sea and water rises as vapour. It cools into clouds, falls as rain or snow, and flows back to the sea in rivers.',
    points: [
      { icon: Sun, text: 'Evaporation: the Sun warms water and it rises as vapour.' },
      { icon: Cloud, text: 'Condensation: the vapour cools into tiny drops that make clouds.' },
      { icon: CloudRain, text: 'Precipitation: rain, snow or hail falls from the clouds.' },
      { icon: Waves, text: 'Collection: the water gathers in rivers, lakes and the sea.' },
    ],
  },
  steps: [
    'Warm the sea with the Sun: water rises (evaporation).',
    'Watch the cloud grow as the vapour cools (condensation).',
    'Move the cloud over the cold mountain: rain or snow falls (precipitation).',
    'Follow the river back to the sea (collection). Then it starts again!',
    'Before each step, guess what will happen. Then try it and see!',
  ],
  example: {
    question: 'A puddle is gone after a sunny day. Where did the water go?',
    work: ['The Sun warmed the puddle.', 'The water turned into invisible vapour and rose into the air.'],
    answer: 'It evaporated into the air.',
  },
  grownups: [
    'Breathe on a cold window or look at a cold drink “sweating”: that is condensation.',
    'Draw a chalk line around a puddle and check it later to see evaporation.',
    'Remind your child that clouds are made of tiny drops of liquid water, not steam or smoke.',
  ],
  makeQuestion: (level) => byLevel(level, [[fallsFromClouds, riverGoes, sunWarms], [stageWord, whyFalls], [afterStage, stageWord, mostWater]]),
};
