import { useMemo, useState } from 'react';
import { ArrowRight, Leaf, Sun, Utensils } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, EMOJI, WrapText } from './visuals/Draggable';

interface Living {
  name: string;
  emoji: string;
}

/** Food chains always start with the Sun, then a producer (a plant), then consumers. */
const CHAINS: Record<string, Living[]> = {
  meadow: [
    { name: 'Sun', emoji: '☀️' },
    { name: 'grass', emoji: '🌿' },
    { name: 'rabbit', emoji: '🐇' },
    { name: 'fox', emoji: '🦊' },
  ],
  sea: [
    { name: 'Sun', emoji: '☀️' },
    { name: 'algae', emoji: '' },
    { name: 'small fish', emoji: '🐟' },
    { name: 'shark', emoji: '🦈' },
  ],
  garden: [
    { name: 'Sun', emoji: '☀️' },
    { name: 'leaves', emoji: '🍃' },
    { name: 'caterpillar', emoji: '🐛' },
    { name: 'bird', emoji: '🐦' },
  ],
  field: [
    { name: 'Sun', emoji: '☀️' },
    { name: 'seeds', emoji: '🌾' },
    { name: 'mouse', emoji: '🐭' },
    { name: 'owl', emoji: '🦉' },
  ],
};

/** A longer chain for older questions. */
const LONG: Living[] = [
  { name: 'Sun', emoji: '☀️' },
  { name: 'grass', emoji: '🌿' },
  { name: 'grasshopper', emoji: '🦗' },
  { name: 'frog', emoji: '🐸' },
  { name: 'snake', emoji: '🐍' },
];

const ROLES = ['energy from the Sun', 'producer: makes food', 'consumer: eats plants', 'consumer: eats animals'];

/** Algae has no emoji: draw a little seaweed. */
function Algae({ size = 64 }: { size?: number }) {
  const k = size / 64;
  return (
    <g transform={`scale(${k})`}>
      {[-16, 0, 16].map((dx, i) => (
        <path key={i} d={`M${dx},28 C${dx - 12},10 ${dx + 12},-4 ${dx},-26`} fill="none" stroke={i === 1 ? '#2f9e5b' : '#4cb07a'} strokeWidth={7} strokeLinecap="round" />
      ))}
    </g>
  );
}

function Icon({ who, size = 64 }: { who: Living; size?: number }) {
  if (!who.emoji) return <Algae size={size} />;
  return (
    <text y={size * 0.34} textAnchor="middle" fontSize={size} fontFamily={EMOJI}>
      {who.emoji}
    </text>
  );
}

const SLOT_X = [150, 380, 610, 840];
const SLOT_Y = 230;
const CARD = 132;

function FoodChainScene() {
  const [chainKey, setChainKey] = useState<'meadow' | 'sea'>('meadow');
  const chain = CHAINS[chainKey];
  const [placed, setPlaced] = useState<number[]>([]);
  const [message, setMessage] = useState('Drag each card into the chain, starting with where the energy comes from.');
  const [round, setRound] = useState(0);
  const order = useMemo(() => shuffle([0, 1, 2, 3]), [chainKey, round]);
  const complete = placed.length === 4;

  const switchChain = (key: 'meadow' | 'sea') => {
    setChainKey(key);
    setPlaced([]);
    setRound((r) => r + 1);
    setMessage('Drag each card into the chain, starting with where the energy comes from.');
    play('whoosh');
  };

  const tryPlace = (idx: number, slot: number) => {
    if (slot === idx) {
      const next = [...placed, idx];
      setPlaced(next);
      play('pop');
      setMessage(next.length === 4 ? `Energy flows from the Sun all the way to the ${chain[3].name}!` : `Yes! The ${chain[idx].name} goes there.`);
      if (next.length === 4) play('correct');
    } else {
      play('wrong');
      setMessage(idx === 0 ? 'Food chains start with the Sun.' : `Not there. What does the ${chain[idx].name} eat, or what eats it?`);
    }
  };

  const drop = (idx: number, p: { x: number; y: number }) => {
    const slot = SLOT_X.findIndex((sx) => Math.abs(p.x - sx) < CARD / 2 + 20 && Math.abs(p.y - SLOT_Y) < CARD / 2 + 30);
    if (slot >= 0 && !placed.includes(slot)) tryPlace(idx, slot);
  };

  // Tapping a card tries the first empty slot, which encourages building the chain in order.
  const tap = (idx: number) => {
    const slot = [0, 1, 2, 3].find((s) => !placed.includes(s));
    if (slot !== undefined) tryPlace(idx, slot);
  };

  return (
    <SceneSvg label={`Build the ${chainKey} food chain.`}>
      <SvgButton x={40} y={34} w={130} h={46} fontSize={18} label="Meadow" onClick={() => switchChain('meadow')} active={chainKey === 'meadow'} color={chainKey === 'meadow' ? C.green : C.card} />
      <SvgButton x={182} y={34} w={110} h={46} fontSize={18} label="Sea" onClick={() => switchChain('sea')} active={chainKey === 'sea'} color={chainKey === 'sea' ? C.blue : C.card} textColor={chainKey === 'sea' ? C.white : C.ink} />

      {/* Slots and arrows */}
      {SLOT_X.map((x, i) => (
        <g key={i}>
          <rect x={x - CARD / 2} y={SLOT_Y - CARD / 2} width={CARD} height={CARD} rx={18} fill={placed.includes(i) ? C.card : 'transparent'} stroke={placed.includes(i) ? C.ink : C.ink2} strokeWidth={placed.includes(i) ? 2.5 : 2} strokeDasharray={placed.includes(i) ? undefined : '8 7'} />
          {placed.includes(i) && (
            <g transform={`translate(${x} ${SLOT_Y - 8})`}>
              <Icon who={chain[i]} />
              <text y={56} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
                {chain[i].name}
              </text>
            </g>
          )}
          {placed.includes(i) && (
            <text x={x} y={SLOT_Y + CARD / 2 + 28} textAnchor="middle" fontSize={14} fill={C.ink2}>
              {ROLES[i]}
            </text>
          )}
          {i < 3 && (
            <g opacity={complete ? 1 : 0.55}>
              <line x1={x + CARD / 2 + 8} y1={SLOT_Y} x2={SLOT_X[i + 1] - CARD / 2 - 22} y2={SLOT_Y} stroke={complete ? C.orange : C.ink2} strokeWidth={6} strokeLinecap="round" />
              <path d={`M${SLOT_X[i + 1] - CARD / 2 - 8},${SLOT_Y} l-18,-12 v24 z`} fill={complete ? C.orange : C.ink2} />
              <text x={(x + SLOT_X[i + 1]) / 2} y={SLOT_Y - 18} textAnchor="middle" fontSize={13} fill={C.muted}>
                {i === 0 ? 'energy' : 'eaten by'}
              </text>
            </g>
          )}
        </g>
      ))}

      {/* Cards to place */}
      <rect x={110} y={430} width={780} height={170} rx={20} fill={C.card} stroke={C.line} strokeWidth={2} />
      {order.map((idx, k) =>
        placed.includes(idx) ? null : (
          <Draggable key={`${chainKey}-${idx}`} x={210 + k * 190} y={515} onDrop={(p) => drop(idx, p)} onTap={() => tap(idx)} label={`Place the ${chain[idx].name}`}>
            <rect x={-62} y={-62} width={124} height={124} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
            <g transform="translate(0 -10)">
              <Icon who={chain[idx]} size={58} />
            </g>
            <text y={50} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {chain[idx].name}
            </text>
          </Draggable>
        ),
      )}

      <WrapText x={500} y={640} width={820} anchor="middle" fontSize={18} fontWeight={600} fill={complete ? '#1f7a4a' : C.ink2} text={message} />
      {complete && <SvgButton x={760} y={34} w={200} h={46} fontSize={17} label="Build it again" onClick={() => switchChain(chainKey)} />}

      <Callout at={[SLOT_X[0], SLOT_Y - CARD / 2]} box={[330, 20]} w={200} icon={Sun} title="Energy" text="All the energy starts with the Sun." />
      <Callout at={[SLOT_X[1], SLOT_Y + CARD / 2]} box={[40, 330]} w={220} icon={Leaf} title="Producer" text="Plants make their own food from sunlight." />
      <Callout at={[SLOT_X[3], SLOT_Y + CARD / 2]} box={[730, 330]} w={230} icon={Utensils} title="Consumers" text="Animals get energy by eating other living things." />
    </SceneSvg>
  );
}

function ChainPicture({ chain, hide }: { chain: Living[]; hide?: number }) {
  const w = chain.length * 110;
  return (
    <svg viewBox={`0 0 ${w} 110`} role="img" aria-label={chain.map((c, i) => (i === hide ? 'question mark' : c.name)).join(', then ')}>
      {chain.map((c, i) => (
        <g key={i} transform={`translate(${55 + i * 110} 44)`}>
          {i === hide ? (
            <text y={14} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.muted}>
              ?
            </text>
          ) : (
            <Icon who={c} size={44} />
          )}
          <text y={56} textAnchor="middle" fontSize={15} fill={C.ink2}>
            {i === hide ? '?' : c.name}
          </text>
          {i < chain.length - 1 && <path d="M38,0 l14,0 m-6,-6 l6,6 l-6,6" stroke={C.ink2} strokeWidth={3} fill="none" strokeLinecap="round" />}
        </g>
      ))}
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {['🌿', '🐇', '🦊'].map((e, i) => (
        <text key={e} x={20 + i * 40} y={52} textAnchor="middle" fontSize={28} fontFamily={EMOJI}>
          {e}
        </text>
      ))}
      <path d="M33,40 l8,0 M73,40 l8,0" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

const ALL_ANIMALS = ['rabbit', 'fox', 'small fish', 'shark', 'caterpillar', 'bird', 'mouse', 'owl', 'frog'];
const ALL_PLANTS = ['grass', 'algae', 'leaves', 'seeds'];

function makeQuestion(level: number): Question {
  const key = pick(Object.keys(CHAINS));
  const chain = CHAINS[key];
  const [, plant, herb, pred] = chain;
  const kind = level === 0 ? pick(['eats', 'producer']) : level === 1 ? pick(['eatenBy', 'start', 'next']) : pick(['disappear', 'herbivore', 'long']);

  if (kind === 'eats') {
    const wrong = shuffle([pred.name, pick(ALL_ANIMALS.filter((a) => a !== herb.name && a !== pred.name))]);
    return {
      prompt: `What does the ${herb.name} eat?`,
      visual: <ChainPicture chain={chain} hide={1} />,
      choices: choices(shuffle([plant.name, ...wrong])),
      answer: plant.name,
      hint: 'Follow the arrow back to the thing before it.',
      explain: [`The arrow goes from the ${plant.name} to the ${herb.name}.`, 'An arrow means "is eaten by".', `So the ${herb.name} eats ${plant.name}.`],
    };
  }

  if (kind === 'producer') {
    const others = shuffle(ALL_ANIMALS).slice(0, 2);
    return {
      prompt: 'Which one is a producer (it makes its own food using sunlight)?',
      choices: choices(shuffle([plant.name, ...others])),
      answer: plant.name,
      hint: 'Producers are plants.',
      explain: [`${cap(others.join(' and '))} are animals: they must eat food.`, 'Plants make their own food using sunlight.', `So the producer is ${plant.name}.`],
    };
  }

  if (kind === 'eatenBy') {
    const wrong = shuffle([plant.name, pick(ALL_ANIMALS.filter((a) => a !== herb.name && a !== pred.name))]);
    return {
      prompt: `What eats the ${herb.name}?`,
      visual: <ChainPicture chain={chain} hide={3} />,
      choices: choices(shuffle([pred.name, ...wrong])),
      answer: pred.name,
      hint: 'Follow the arrow forward from it.',
      explain: [`The arrow from the ${herb.name} points to the next living thing.`, 'An arrow means "is eaten by".', `So the ${pred.name} eats the ${herb.name}.`],
    };
  }

  if (kind === 'start') {
    const right = 'The Sun';
    return {
      prompt: 'Where does the energy in every food chain start?',
      choices: choices(shuffle([right, 'The soil', `The ${pred.name}`])),
      answer: right,
      hint: 'What do plants need to make their food?',
      explain: ['Plants use sunlight to make food.', 'Animals get that energy by eating plants, or other animals.', 'So the energy starts with the Sun.'],
    };
  }

  if (kind === 'next') {
    const wrong = shuffle([plant.name, pick(ALL_ANIMALS.filter((a) => a !== herb.name && a !== pred.name))]);
    return {
      prompt: 'What comes next in this food chain?',
      visual: <ChainPicture chain={chain} hide={3} />,
      choices: choices(shuffle([pred.name, ...wrong])),
      answer: pred.name,
      hint: 'Which one would eat the animal before the question mark?',
      explain: [`The chain goes Sun, ${plant.name}, ${herb.name}…`, `The ${herb.name} is eaten by an animal that hunts it.`, `So next comes the ${pred.name}.`],
    };
  }

  if (kind === 'disappear') {
    const right = 'They would have less food';
    return {
      prompt: `If all the ${plural(herb.name)} disappeared, what would happen to the ${plural(pred.name)}?`,
      visual: <ChainPicture chain={chain} />,
      choices: choices(shuffle([right, 'They would have more food', 'Nothing would change'])),
      answer: right,
      hint: `What do ${plural(pred.name)} eat in this chain?`,
      explain: [`In this chain, ${plural(pred.name)} eat ${plural(herb.name)}.`, `Without ${plural(herb.name)}, that food is gone.`, 'So they would have less food.'],
    };
  }

  if (kind === 'herbivore') {
    const wrong = shuffle([pred.name, pick(ALL_PLANTS.filter((p) => p !== plant.name))]);
    return {
      prompt: 'Which one is a herbivore (it only eats plants)?',
      visual: <ChainPicture chain={chain} />,
      choices: choices(shuffle([herb.name, ...wrong])),
      answer: herb.name,
      hint: 'Find the animal that eats the plant.',
      explain: [`The ${herb.name} eats ${plant.name}, a plant.`, `The ${pred.name} eats animals, so it is a predator.`, `So the herbivore is the ${herb.name}.`],
    };
  }

  // 'long': five links
  const who = pick([2, 3, 4]);
  const food = LONG[who - 1].name;
  const wrong = shuffle(LONG.slice(1).map((l) => l.name).filter((n) => n !== food && n !== LONG[who].name)).slice(0, 2);
  return {
    prompt: `In this chain, what does the ${LONG[who].name} eat?`,
    visual: <ChainPicture chain={LONG} />,
    choices: choices(shuffle([food, ...wrong])),
    answer: food,
    hint: 'Look at the arrow pointing into it.',
    explain: [`Find the ${LONG[who].name} in the chain.`, `The arrow into it comes from the ${food}.`, `So the ${LONG[who].name} eats the ${food}.`],
  };
}

function plural(name: string) {
  if (name === 'small fish' || name === 'fish' || name === 'grass' || name === 'algae' || name === 'leaves' || name === 'seeds') return name;
  if (name === 'mouse') return 'mice';
  return `${name}s`;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const foodChains: Lesson = {
  id: 'food-chains',
  title: 'Food Chains',
  Thumb,
  Scene: FoodChainScene,
  sceneHint: 'Drag the cards into the chain · Try the sea chain too',
  learn: {
    heading: 'Who eats what?',
    intro:
      'A food chain shows how energy passes from one living thing to the next. It starts with the Sun, then a plant (a producer), then animals that eat (consumers).',
    points: [
      { icon: Sun, text: 'The Sun’s energy starts every food chain.' },
      { icon: Leaf, text: 'Plants are producers: they make their own food.' },
      { icon: ArrowRight, text: 'Each arrow means “is eaten by”. It shows the energy moving on.' },
    ],
  },
  steps: [
    'Start with the Sun.',
    'Next comes a plant that uses sunlight to make food.',
    'Then the animal that eats the plant.',
    'Then the animal that eats that animal. Draw arrows pointing to the eater.',
  ],
  example: {
    question: 'Put these in a chain: owl, Sun, mouse, seeds.',
    visual: <ChainPicture chain={CHAINS.field} />,
    work: ['Start with the Sun, then the plant part: seeds.', 'Mice eat seeds, and owls eat mice.'],
    answer: 'Sun → seeds → mouse → owl',
  },
  grownups: [
    'A common mix-up is the arrow direction: it points to the eater, showing where the energy goes.',
    'Spot food chains in the garden or park: leaves, a caterpillar, a bird.',
    'Real animals eat lots of things, so food chains link up into food webs. That’s a great next question.',
  ],
  makeQuestion,
};
