import { useMemo, useState } from 'react';
import { Globe, Orbit, Ruler, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, WrapText } from './visuals/Draggable';

interface Planet {
  name: string;
  /** Radius compared with Earth's (real values, rounded). */
  size: number;
  color: string;
  fact: string;
  rings?: boolean;
}

/** In order from the Sun. */
const PLANETS: Planet[] = [
  { name: 'Mercury', size: 0.38, color: '#a8a29e', fact: 'Mercury is the closest planet to the Sun and the smallest planet.' },
  { name: 'Venus', size: 0.95, color: '#e8c27a', fact: 'Venus is the hottest planet. Its thick clouds trap the heat.' },
  { name: 'Earth', size: 1, color: '#3d7fd6', fact: 'Earth is our home: the only planet we know has life. Most of it is covered in water.' },
  { name: 'Mars', size: 0.53, color: '#d4643c', fact: 'Mars is the red planet. Its dust is full of rusty iron.' },
  { name: 'Jupiter', size: 11.2, color: '#d9a26b', fact: 'Jupiter is the biggest planet. More than 1,000 Earths could fit inside it.' },
  { name: 'Saturn', size: 9.45, color: '#e6cf8f', fact: 'Saturn has beautiful rings made of chunks of ice and rock.', rings: true },
  { name: 'Uranus', size: 4.0, color: '#8fd3e0', fact: 'Uranus spins tipped right over on its side.' },
  { name: 'Neptune', size: 3.88, color: '#4f6fd1', fact: 'Neptune is the farthest planet from the Sun, with the fastest winds.' },
];

const NAMES = PLANETS.map((p) => p.name);
/** Drawn sizes: bigger planets are bigger, but squeezed so all fit (not to scale). */
const drawR = (p: Planet) => Math.round(11 + 11.5 * Math.sqrt(p.size));
const SLOT_X = [185, 262, 343, 420, 532, 668, 786, 896];
const SLOT_Y = 270;
const MNEMONIC = 'My Very Easy Method Just Speeds Up Naming';
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

function PlanetArt({ p, r = drawR(p) }: { p: Planet; r?: number }) {
  return (
    <g>
      {p.rings && <ellipse rx={r * 1.75} ry={r * 0.45} fill="none" stroke="#c8b27a" strokeWidth={Math.max(3, r * 0.18)} />}
      <circle r={r} fill={p.color} stroke={C.ink} strokeWidth={2.5} />
      {p.name === 'Jupiter' && (
        <g>
          <path d={`M${-r * 0.92},${-r * 0.3} H${r * 0.92} M${-r * 0.95},${r * 0.2} H${r * 0.95}`} stroke={shade(p.color, -0.25)} strokeWidth={r * 0.12} />
          <ellipse cx={r * 0.35} cy={r * 0.45} rx={r * 0.2} ry={r * 0.12} fill="#c2593a" />
        </g>
      )}
      {p.name === 'Earth' && <path d={`M${-r * 0.5},${-r * 0.2} q${r * 0.3},${-r * 0.5} ${r * 0.6},${-r * 0.1} q${-r * 0.1},${r * 0.5} ${-r * 0.6},${r * 0.1} z`} fill={C.green} />}
      {p.rings && <path d={`M${-r * 1.75},0 A${r * 1.75},${r * 0.45} 0 0 0 ${r * 1.75},0`} fill="none" stroke="#c8b27a" strokeWidth={Math.max(3, r * 0.18)} />}
      <circle cx={-r * 0.35} cy={-r * 0.35} r={r * 0.18} fill={C.white} opacity={0.35} />
    </g>
  );
}

function SolarScene() {
  const [placed, setPlaced] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [info, setInfo] = useState<string>('Drag each planet onto its orbit, closest to the Sun first. Tap a planet to learn about it.');
  const [round, setRound] = useState(0);
  const order = useMemo(() => shuffle([0, 1, 2, 3, 4, 5, 6, 7]), [round]);
  const complete = placed.length === 8;

  const tryPlace = (idx: number, slot: number) => {
    if (placed.includes(slot)) return;
    if (slot === idx) {
      const next = [...placed, idx];
      setPlaced(next);
      setSelected(null);
      setInfo(PLANETS[idx].fact);
      play(next.length === 8 ? 'correct' : 'pop');
    } else {
      play('wrong');
      setInfo(`Not that orbit for ${PLANETS[idx].name}. Try another one!`);
    }
  };

  const drop = (idx: number, p: { x: number; y: number }) => {
    const slot = SLOT_X.findIndex((sx) => Math.abs(p.x - sx) < 52 && Math.abs(p.y - SLOT_Y) < 80);
    if (slot >= 0) tryPlace(idx, slot);
  };

  const restart = () => {
    setPlaced([]);
    setSelected(null);
    setRound((r) => r + 1);
    setInfo('Drag each planet onto its orbit, closest to the Sun first. Tap a planet to learn about it.');
  };

  return (
    <SceneSvg label="Put the eight planets in order from the Sun.">
      <defs>
        <clipPath id="solar-space">
          <rect x={0} y={0} width={1000} height={680} rx={24} />
        </clipPath>
      </defs>
      <g clipPath="url(#solar-space)">
      <rect x={0} y={0} width={1000} height={680} rx={24} fill="#16203a" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 197) % 990} cy={(i * 113) % 670} r={i % 3 === 0 ? 1.8 : 1.1} fill={C.white} opacity={0.6} />
      ))}

      {/* Sun and orbits */}
      <circle cx={-40} cy={SLOT_Y} r={150} fill="#ffb627" />
      <circle cx={-40} cy={SLOT_Y} r={170} fill="#ffb627" opacity={0.25} />
      {SLOT_X.map((x, i) => (
        <circle key={i} cx={-40} cy={SLOT_Y} r={x + 40} fill="none" stroke="#3a4a72" strokeWidth={2} strokeDasharray="5 7" />
      ))}
      </g>

      {/* Slots */}
      {SLOT_X.map((x, i) => {
        const p = PLANETS[i];
        const done = placed.includes(i);
        return (
          <g
            key={i}
            onClick={() => (done ? setInfo(p.fact) : selected !== null ? tryPlace(selected, i) : undefined)}
            style={{ cursor: done || selected !== null ? 'pointer' : 'default' }}
            data-nopan
          >
            <circle cx={x} cy={SLOT_Y} r={drawR(p) + 10} fill="transparent" stroke={done ? 'transparent' : '#6b7ca8'} strokeWidth={2} strokeDasharray="6 6" />
            {done ? (
              <g transform={`translate(${x} ${SLOT_Y})`}>
                <PlanetArt p={p} />
              </g>
            ) : (
              <text x={x} y={SLOT_Y + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill="#8090b8">
                {i + 1}
              </text>
            )}
            {done && (
              <text x={x} y={SLOT_Y + drawR(p) + 32} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.white}>
                {p.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Tray */}
      <rect x={60} y={445} width={880} height={160} rx={20} fill="#22305a" stroke="#3a4a72" strokeWidth={2} />
      {order.map((idx, k) => {
        if (placed.includes(idx)) return null;
        const p = PLANETS[idx];
        return (
          <Draggable
            key={`${round}-${idx}`}
            x={120 + k * 109}
            y={515}
            onDrop={(pt) => drop(idx, pt)}
            onTap={() => {
              setSelected(idx);
              setInfo(`${p.fact} Now tap its orbit, or drag it there.`);
            }}
            label={p.name}
          >
            <circle r={Math.max(32, drawR(p) + 6)} fill={selected === idx ? 'rgba(255,214,90,0.25)' : 'transparent'} stroke={selected === idx ? C.yellow : 'transparent'} strokeWidth={3} />
            <PlanetArt p={p} r={Math.min(drawR(p), 40)} />
            <text y={66} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.white}>
              {p.name}
            </text>
          </Draggable>
        );
      })}

      {/* Info */}
      <rect x={430} y={20} width={540} height={92} rx={16} fill="#22305a" stroke="#3a4a72" strokeWidth={2} />
      <WrapText x={450} y={52} width={500} fontSize={17} fill={C.white} text={complete ? `All eight in order! Remember them: ${MNEMONIC}.` : info} />
      <text x={70} y={640} fontSize={14} fill="#8090b8">
        Sizes and distances are not to scale. Space is far too big to fit!
      </text>
      <SvgButton x={700} y={615} w={130} h={48} fontSize={17} label="Start again" onClick={restart} />
      <SvgButton x={840} y={615} w={130} h={48} fontSize={17} label="Say it" onClick={() => speak(complete ? `${NAMES.join(', ')}. ${MNEMONIC}.` : info, { force: true })} color={C.yellow} />

      <Callout at={[100, SLOT_Y]} box={[150, 30]} w={220} icon={Sun} title="The Sun" text="A star. All the planets travel around it." />
      <Callout at={[SLOT_X[2], SLOT_Y - 40]} box={[200, 340]} w={220} icon={Orbit} title="Orbits" text="Each planet has its own path around the Sun." />
      <Callout at={[SLOT_X[4], SLOT_Y + 60]} box={[620, 340]} w={250} icon={Ruler} title="Not to scale" text="Jupiter is really 11 times wider than Earth!" />
    </SceneSvg>
  );
}

function OrderPicture({ hide }: { hide?: number }) {
  return (
    <svg viewBox="0 0 560 110" role="img" aria-label="The planets in order from the Sun">
      <rect width={560} height={110} rx={14} fill="#16203a" />
      <circle cx={-20} cy={55} r={50} fill="#ffb627" />
      {PLANETS.map((p, i) => (
        <g key={p.name} transform={`translate(${70 + i * 64} 50)`}>
          {i === hide ? (
            <text y={8} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.yellow}>
              ?
            </text>
          ) : (
            <PlanetArt p={p} r={Math.round(7 + 5 * Math.sqrt(p.size))} />
          )}
          <text y={50} textAnchor="middle" fontSize={11} fill={C.white}>
            {i === hide ? '?' : p.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect width={120} height={80} rx={10} fill="#16203a" />
      <circle cx={-6} cy={40} r={26} fill="#ffb627" />
      <circle cx={38} cy={40} r={5} fill="#3d7fd6" stroke={C.ink} strokeWidth={1} />
      <circle cx={62} cy={40} r={10} fill="#d9a26b" stroke={C.ink} strokeWidth={1} />
      <ellipse cx={92} cy={40} rx={15} ry={4} fill="none" stroke="#c8b27a" strokeWidth={2} />
      <circle cx={92} cy={40} r={8} fill="#e6cf8f" stroke={C.ink} strokeWidth={1} />
    </svg>
  );
}

const ORDER_STEP = `In order: ${NAMES.join(', ')}.`;

function others(right: string, n: number) {
  return shuffle(NAMES.filter((x) => x !== right)).slice(0, n);
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['closest', 'home', 'biggest', 'rings']) : level === 1 ? pick(['after', 'number', 'red', 'count']) : pick(['nth', 'hottest', 'between', 'farthest']);

  const named = (right: string, prompt: string, hint: string, why: string, n = 2, visual?: Question['visual']): Question => ({
    prompt,
    visual,
    choices: choices(shuffle([right, ...others(right, n)])),
    answer: right,
    hint,
    explain: [why, `So it is ${right}.`],
  });

  switch (kind) {
    case 'closest':
      return named('Mercury', 'Which planet is closest to the Sun?', 'Think of the first planet in the order.', 'Mercury is the 1st planet from the Sun.');
    case 'home':
      return named('Earth', 'Which planet do we live on?', 'It is the 3rd planet from the Sun.', 'We live on the 3rd planet, the one with lots of water.');
    case 'biggest':
      return named('Jupiter', 'Which is the biggest planet?', 'It is one of the giant planets, and the 5th from the Sun.', 'Jupiter is so big that more than 1,000 Earths could fit inside.');
    case 'rings':
      return named('Saturn', 'Which planet is famous for its bright rings?', 'It is the 6th planet from the Sun.', 'Saturn’s rings are made of ice and rock.');
    case 'red':
      return named('Mars', 'Which planet is called the red planet?', 'It is the next planet after Earth.', 'Mars is covered in rusty red dust.', 3);
    case 'after': {
      const i = rand(0, 6);
      const right = PLANETS[i + 1].name;
      return named(right, `Moving away from the Sun, which planet comes right after ${PLANETS[i].name}?`, `Say the order from Mercury until you reach ${PLANETS[i].name}.`, ORDER_STEP, 3, <OrderPicture hide={i + 1} />);
    }
    case 'number': {
      const i = rand(0, 7);
      return {
        prompt: `Counting from the Sun, what number planet is ${PLANETS[i].name}?`,
        answer: String(i + 1),
        hint: 'Count the planets starting with Mercury as 1.',
        explain: [ORDER_STEP, `${PLANETS[i].name} is planet number ${i + 1}.`],
      };
    }
    case 'count':
      return {
        prompt: 'How many planets are in our solar system?',
        answer: '8',
        hint: 'Remember the sentence: My Very Easy Method Just Speeds Up Naming.',
        explain: [`${MNEMONIC}: one word for each planet.`, 'Count the words: there are 8 planets.'],
      };
    case 'nth': {
      const i = rand(1, 7);
      const right = PLANETS[i].name;
      return named(right, `Which planet is ${ORDINAL[i]} from the Sun?`, 'Count along the order, starting with Mercury.', `${ORDER_STEP} Count to the ${ORDINAL[i]}.`, 3);
    }
    case 'hottest':
      return named('Venus', 'Which planet is the hottest?', 'It is not the closest one! Think about thick clouds.', 'Mercury is closest, but Venus’s thick clouds trap heat like a blanket.', 3);
    case 'between': {
      const i = rand(1, 6);
      const right = PLANETS[i].name;
      return named(right, `Which planet is between ${PLANETS[i - 1].name} and ${PLANETS[i + 1].name}?`, 'Say the order out loud and listen for the gap.', ORDER_STEP, 3, <OrderPicture hide={i} />);
    }
    default:
      return named('Neptune', 'Which planet is farthest from the Sun?', 'Think of the last planet in the order.', 'Neptune is the 8th planet, the last one.', 3);
  }
}

export const solarSystem: Lesson = {
  id: 'solar-system',
  title: 'The Solar System',
  Thumb,
  Scene: SolarScene,
  sceneHint: 'Drag (or tap, then tap an orbit) each planet in order',
  learn: {
    heading: 'Our solar system',
    intro:
      'The solar system is the Sun and everything that travels around it. There are eight planets. In order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.',
    points: [
      { icon: Sun, text: 'The Sun is a star in the middle.' },
      { icon: Orbit, text: 'Planets travel around the Sun in paths called orbits.' },
      { icon: Globe, text: 'Four small rocky planets, then four giant ones.' },
    ],
  },
  steps: [
    'Start at the Sun.',
    'Say the sentence: My Very Easy Method Just Speeds Up Naming.',
    'Each first letter is a planet: M-V-E-M-J-S-U-N.',
    'Count along to find any planet’s place.',
  ],
  example: {
    question: 'Which planet is 4th from the Sun?',
    visual: <OrderPicture hide={3} />,
    work: ['Mercury (1), Venus (2), Earth (3)…', 'The 4th is the red planet.'],
    answer: 'Mars is 4th from the Sun.',
  },
  grownups: [
    'On a clear evening, look for Venus (very bright, near sunset or sunrise) and Jupiter. Free sky apps can help.',
    'Make a scale walk: if the Sun were a football, Earth would be a peppercorn about 25 steps away.',
    'Pluto was reclassified as a dwarf planet in 2006, which is why older books say there are nine planets.',
  ],
  makeQuestion,
};
