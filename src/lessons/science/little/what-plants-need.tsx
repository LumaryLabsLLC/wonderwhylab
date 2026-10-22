import { useState } from 'react';
import { Droplets, Sprout, Sun, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { MessageBox } from './visuals/MessageBox';

interface PlantState {
  /** How tall it has grown, 0–1. */
  h: number;
  /** How healthy it is, 0–1 (low = droopy). */
  health: number;
  /** Did it have water and sunlight lately? (Changes its colour.) */
  water: boolean;
  sun: boolean;
}

function leafColor(p: PlantState) {
  if (!p.water && p.health < 0.7) return '#b9a061'; // dry and brown
  if (!p.sun) return '#cfd56b'; // pale without light
  return C.green;
}

/** A plant in a pot. (0, 0) is the middle of the pot's rim. */
function Plant({ p }: { p: PlantState }) {
  const stem = 30 + p.h * 220;
  const droop = (1 - p.health) * 55;
  const pairs = 1 + Math.floor(p.h * 4);
  const color = leafColor(p);
  const bend = (1 - p.health) * 40;
  const top = { x: bend, y: -stem };
  return (
    <g>
      {/* stem */}
      <path d={`M0,0 Q${bend * 0.2},${-stem * 0.6} ${top.x},${top.y}`} fill="none" stroke={shade(color, -0.25)} strokeWidth={8} strokeLinecap="round" />
      {/* leaves */}
      {Array.from({ length: pairs }, (_, i) => {
        const t = (i + 1) / (pairs + 1);
        const y = -stem * t;
        const x = bend * t * t;
        const size = 26 + p.h * 18;
        return (
          <g key={i}>
            <ellipse cx={x - size * 0.8} cy={y} rx={size} ry={size * 0.42} fill={color} stroke={C.ink} strokeWidth={2.5} transform={`rotate(${-20 + droop} ${x} ${y})`} />
            <ellipse cx={x + size * 0.8} cy={y} rx={size} ry={size * 0.42} fill={color} stroke={C.ink} strokeWidth={2.5} transform={`rotate(${20 - droop} ${x} ${y})`} />
          </g>
        );
      })}
      {/* flower once it is tall and healthy */}
      {p.h >= 0.85 && p.health >= 0.8 ? (
        <g transform={`translate(${top.x} ${top.y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-16} rx={11} ry={16} fill={C.pink} stroke={C.ink} strokeWidth={2.5} transform={`rotate(${a})`} />
          ))}
          <circle r={10} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
        </g>
      ) : (
        <ellipse cx={top.x} cy={top.y - 6} rx={10} ry={14} fill={color} stroke={C.ink} strokeWidth={2.5} />
      )}
      {/* pot */}
      <path d="M-80,0 H80 L64,110 H-64 Z" fill="#d47a4a" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <rect x={-92} y={-14} width={184} height={24} rx={6} fill="#e08d5c" stroke={C.ink} strokeWidth={3} />
      <ellipse cx={0} cy={-2} rx={78} ry={8} fill="#6b4a2b" />
    </g>
  );
}

const START: PlantState = { h: 0.08, health: 1, water: true, sun: true };
const YOUNG: PlantState = { h: 0.45, health: 1, water: true, sun: true };

/** One fair test at a time: set the conditions, predict, press Next day, then explain. */
interface Experiment {
  plant: PlantState;
  water: boolean;
  sun: boolean;
  question: string;
  options: string[];
  actual: string;
  because: string;
}
const EXPERIMENTS: Experiment[] = [
  {
    plant: START,
    water: true,
    sun: true,
    question: 'Water + sun: grow or wilt?',
    options: ['Grow', 'Wilt'],
    actual: 'Grow',
    because: 'Water and sunlight help a plant make food and grow.',
  },
  {
    plant: YOUNG,
    water: false,
    sun: true,
    question: 'No water: grow or wilt?',
    options: ['Grow', 'Wilt'],
    actual: 'Wilt',
    because: 'Without water a plant can’t stay firm, so it droops.',
  },
  {
    plant: YOUNG,
    water: true,
    sun: false,
    question: 'No light: what do leaves do?',
    options: ['Stay green', 'Turn pale'],
    actual: 'Turn pale',
    because: 'Without light a plant can’t make food, so it turns pale.',
  },
];

function PlantScene() {
  const [plant, setPlant] = useState<PlantState>(START);
  const [water, setWater] = useState(true);
  const [sun, setSun] = useState(true);
  const [day, setDay] = useState(1);
  const [message, setMessage] = useState('Guess first, then press Next day.');
  const [exp, setExp] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);

  const nextDay = () => {
    let { h, health } = plant;
    if (water && sun) {
      h = Math.min(1, h + 0.18);
      health = Math.min(1, health + 0.45);
    } else {
      health = Math.max(0.05, health - (!water && !sun ? 0.45 : !water ? 0.35 : 0.25));
    }
    setPlant({ h, health, water, sun });
    setDay(day + 1);
    const e = EXPERIMENTS[exp];
    if (!observed && water === e.water && sun === e.sun) setObserved(true);
    play(water && sun ? 'pop' : 'tap');
    if (water && sun) setMessage(h >= 0.85 && health >= 0.8 ? `Day ${day + 1}: a flower! Water and sunlight helped it grow.` : `Day ${day + 1}: water + sunlight = growing!`);
    else if (!water && !sun) setMessage(`Day ${day + 1}: no water and no light. The plant is very droopy.`);
    else if (!water) setMessage(`Day ${day + 1}: no water, so the plant is wilting.`);
    else setMessage(`Day ${day + 1}: no sunlight, so the leaves are turning pale.`);
  };

  const setUp = (n: number) => {
    const e = EXPERIMENTS[n];
    setExp(n);
    setGuess(null);
    setObserved(false);
    setPlant(e.plant);
    setDay(1);
    setWater(e.water);
    setSun(e.sun);
    setMessage('Guess first, then press Next day.');
  };
  const reset = () => setUp(0);

  return (
    <SceneSvg label="A plant in a pot, with water and sunlight switches">
      {/* Window light or a dark cupboard */}
      <rect x={60} y={60} width={480} height={500} rx={24} fill={sun ? '#fff3c4' : '#3a3f55'} stroke={C.ink} strokeWidth={3} />
      {sun ? (
        <g transform="translate(140 140)">
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d="M0,-58 V-44" stroke={C.orange} strokeWidth={6} strokeLinecap="round" transform={`rotate(${i * 36})`} />
          ))}
          <circle r={34} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
        </g>
      ) : (
        <text x={140} y={150} textAnchor="middle" fontSize={20} fontWeight={700} fill="#c9cede">
          Dark cupboard
        </text>
      )}
      {water && (
        <g>
          {/* A watering can pouring from the top corner */}
          <g transform="translate(470 120) rotate(-20)">
            <rect x={-34} y={-22} width={56} height={44} rx={8} fill={C.blue} stroke={C.ink} strokeWidth={3} />
            <path d="M-34,-6 L-70,-24" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
            <path d="M-34,-6 L-70,-24" stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
            <path d="M22,-12 C40,-12 40,14 22,14" fill="none" stroke={C.ink} strokeWidth={4} />
          </g>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${408 - i * 10},${160 + i * 22} q-5,10 0,15 q5,-5 0,-15 Z`} fill={C.blue} stroke={C.ink} strokeWidth={1.5} />
          ))}
        </g>
      )}

      <g transform="translate(300 420)">
        <Plant p={plant} />
      </g>
      <text x={300} y={600} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
        Day {day}
      </text>

      {/* Controls */}
      <SvgButton x={600} y={60} w={340} h={56} fontSize={21} label={water ? '💧 Water: yes' : '💧 Water: no'} onClick={() => setWater(!water)} color={water ? C.blue : C.card} textColor={water ? C.white : C.ink} />
      <SvgButton x={600} y={128} w={340} h={56} fontSize={21} label={sun ? '☀️ Sunlight: yes' : '☀️ Sunlight: no'} onClick={() => setSun(!sun)} color={sun ? C.yellow : C.card} />
      <SvgButton x={600} y={198} w={340} h={62} fontSize={23} label="Next day ▶" onClick={nextDay} color={C.teal} textColor={C.white} />
      <SvgButton x={600} y={274} w={160} h={44} fontSize={16} label="New seed" onClick={reset} />
      <MessageBox x={600} y={332} w={340} h={74} text={message} max={34} size={16} />
      {observed ? (
        <ExplainCard
          x={600}
          y={420}
          w={340}
          prediction={guess}
          actual={EXPERIMENTS[exp].actual}
          because={EXPERIMENTS[exp].because}
          onAgain={() => setUp((exp + 1) % EXPERIMENTS.length)}
        />
      ) : (
        <PredictCard x={600} y={420} w={340} question={EXPERIMENTS[exp].question} options={EXPERIMENTS[exp].options} prediction={guess} onPredict={setGuess} />
      )}

      <Callout at={[300, 470]} box={[60, 600]} icon={Droplets} title="Roots drink water" w={220} />
      <Callout at={[140, 140]} box={[200, 80]} icon={Sun} title="Leaves use sunlight" text="Plants use light to make their own food." w={260} />
      <Callout at={[330, 360]} box={[600, 612]} icon={Wind} title="Air and soil too" text="Plants also need air, and soil with goodness in it." w={300} />
    </SceneSvg>
  );
}

function PlantPicture({ p }: { p: PlantState }) {
  return (
    <svg viewBox="-130 -280 260 400" role="img" aria-label="a plant in a pot">
      <Plant p={p} />
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <circle cx={22} cy={20} r={10} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
      <g transform="translate(70 56) scale(0.24)">
        <Plant p={{ h: 0.9, health: 1, water: true, sun: true }} />
      </g>
    </svg>
  );
}

const NEEDS = [
  { value: 'water', label: '💧 Water', name: 'water' },
  { value: 'sunlight', label: '☀️ Sunlight', name: 'sunlight' },
];
const NOT_NEEDED = [
  { value: 'candy', label: '🍬 Candy', name: 'candy' },
  { value: 'toys', label: '🧸 Toys', name: 'toys' },
  { value: 'tv', label: '📺 TV', name: 'TV' },
  { value: 'pizza', label: '🍕 Pizza', name: 'pizza' },
];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const need = pick(NEEDS);
    return {
      prompt: 'What does a plant need to grow?',
      choices: shuffle([need, ...shuffle(NOT_NEEDED).slice(0, 2)]),
      answer: need.value,
      hint: 'Think about what you give a plant on a windowsill.',
      explain:
        need.value === 'water'
          ? ['A plant’s roots drink water from the soil.', 'Without water it droops and wilts.', 'So a plant needs water.']
          : ['A plant’s leaves use sunlight to make food.', 'Without light its leaves turn pale.', 'So a plant needs sunlight.'],
    };
  }
  if (level === 1) {
    if (Math.random() < 0.5) {
      return {
        prompt: 'This plant got no water for days. What happens?',
        visual: <PlantPicture p={{ h: 0.6, health: 0.25, water: false, sun: true }} />,
        choices: shuffle([
          { value: 'wilts', label: 'It droops and wilts', name: 'it droops and wilts' },
          { value: 'huge', label: 'It grows huge', name: 'it grows huge' },
          { value: 'blue', label: 'It turns blue', name: 'it turns blue' },
        ]),
        answer: 'wilts',
        hint: 'Try it: turn the water off and press Next day.',
        explain: ['Plants need water to stay strong.', 'Without water the stem and leaves go floppy.', 'So it droops and wilts.'],
      };
    }
    return {
      prompt: 'A plant was kept in a dark cupboard. What happens?',
      visual: <PlantPicture p={{ h: 0.5, health: 0.5, water: true, sun: false }} />,
      choices: shuffle([
        { value: 'pale', label: 'Its leaves turn pale and weak', name: 'its leaves turn pale' },
        { value: 'flowers', label: 'It grows lots of flowers', name: 'it grows lots of flowers' },
        { value: 'purple', label: 'It turns purple', name: 'it turns purple' },
      ]),
      answer: 'pale',
      hint: 'Try it: turn the sunlight off and press Next day.',
      explain: ['Leaves need light to make food.', 'In the dark the plant can’t make enough food.', 'So its leaves turn pale and weak.'],
    };
  }
  const kind = pick(['food', 'else', 'roots'] as const);
  if (kind === 'food') {
    return {
      prompt: 'Where does a plant get its food?',
      choices: shuffle([
        { value: 'makes', label: 'It makes its own food using sunlight', name: 'it makes its own food' },
        { value: 'shop', label: 'From the shop', name: 'from the shop' },
        { value: 'pizza', label: 'It eats pizza', name: 'it eats pizza' },
      ]),
      answer: 'makes',
      hint: 'What do the green leaves catch?',
      explain: ['Green leaves catch sunlight.', 'Using light, air and water, the plant makes its own food.', 'So it makes its own food using sunlight.'],
    };
  }
  if (kind === 'else') {
    return {
      prompt: 'Besides water and sunlight, what else do plants need?',
      choices: shuffle([
        { value: 'air', label: 'Air and good soil', name: 'air and good soil' },
        { value: 'shoes', label: 'Shoes', name: 'shoes' },
        { value: 'music', label: 'Loud music', name: 'loud music' },
      ]),
      answer: 'air',
      hint: 'Plants breathe, and their roots sit in something.',
      explain: ['Plants take in air through their leaves.', 'Their roots get goodness from the soil.', 'So they need air and good soil.'],
    };
  }
  return {
    prompt: 'Which part of a plant drinks water from the soil?',
    choices: shuffle([
      { value: 'roots', label: 'The roots', name: 'the roots' },
      { value: 'petals', label: 'The petals', name: 'the petals' },
      { value: 'flower', label: 'The flower', name: 'the flower' },
    ]),
    answer: 'roots',
    hint: 'Which part is under the ground, in the soil?',
    explain: ['The roots grow down into the soil.', 'They soak up water like a straw.', 'So the roots drink the water.'],
  };
}

export const whatPlantsNeed: Lesson = {
  id: 'what-plants-need',
  title: 'What Plants Need',
  Thumb,
  Scene: PlantScene,
  sceneHint: 'Guess first · Then press Next day and watch the plant',
  learn: {
    heading: 'What plants need',
    intro: 'Plants are alive and need things to grow, just like you! They need water, sunlight, air and good soil.',
    points: [
      { icon: Droplets, text: 'Roots drink water from the soil.' },
      { icon: Sun, text: 'Leaves use sunlight to make the plant’s food.' },
      { icon: Sprout, text: 'With water and light, a plant grows tall and can flower.' },
    ],
  },
  steps: [
    'Read the test: what will the plant get?',
    'Guess: will it grow or wilt?',
    'Press Next day and watch the plant.',
    'Were you right? Find out why, then try the next test.',
  ],
  example: {
    question: 'A plant gets sunlight but no water. What happens?',
    visual: <PlantPicture p={{ h: 0.55, health: 0.3, water: false, sun: true }} />,
    work: ['Its roots can’t drink, so the plant has no water.', 'Without water the leaves go droopy.'],
    answer: 'It wilts. Give it water to help it!',
  },
  grownups: [
    'Grow cress or beans on damp cotton wool. Put one pot in a cupboard and one on a sunny windowsill.',
    'Let your child water a plant and check it each day. Talk about how it changes.',
    'Plants make their own food from light, air and water. It’s fine to say “they use light to make food”.',
    'Cupboard plants often grow tall and pale as they stretch to find light. That’s a great thing to notice together.',
  ],
  makeQuestion,
};
