import { useEffect, useRef, useState } from 'react';
import { Droplets, Filter, Sun, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, WrapText, wrapLines } from './visuals/Draggable';

type Stuff = 'salt' | 'sugar' | 'sand' | 'pebbles' | 'oil';

interface Ingredient {
  id: Stuff;
  name: string;
  color: string;
  dissolves: boolean;
}

const STUFF: Ingredient[] = [
  { id: 'salt', name: 'salt', color: '#ffffff', dissolves: true },
  { id: 'sugar', name: 'sugar', color: '#f6ead2', dissolves: true },
  { id: 'sand', name: 'sand', color: '#e2b96f', dissolves: false },
  { id: 'pebbles', name: 'pebbles', color: '#9aa3ae', dissolves: false },
  { id: 'oil', name: 'cooking oil', color: '#f5c542', dissolves: false },
];

// Beaker geometry.
const B = { x: 230, y: 200, w: 260, h: 340 };
const WATER_TOP = B.y + 90;
const FLOOR = B.y + B.h - 14;

/** Deterministic little scatter so grains don't jump around between renders. */
function grains(n: number, seed: number, x0: number, x1: number, y0: number, y1: number) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)] as const);
}

function Jar({ item }: { item: Ingredient }) {
  return (
    <g>
      <rect x={-34} y={-30} width={68} height={60} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <rect x={-26} y={-40} width={52} height={14} rx={4} fill={C.ink2} />
      {item.id === 'oil' ? (
        <path d="M-12,-10 C-12,6 12,6 12,-10 C12,-18 0,-26 0,-26 C0,-26 -12,-18 -12,-10 Z" transform="translate(0 14)" fill={item.color} stroke={C.ink} strokeWidth={2} />
      ) : item.id === 'pebbles' ? (
        <g>
          <ellipse cx={-10} cy={10} rx={11} ry={8} fill={item.color} stroke={C.ink} strokeWidth={1.5} />
          <ellipse cx={10} cy={8} rx={9} ry={7} fill={shade(item.color, -0.15)} stroke={C.ink} strokeWidth={1.5} />
          <ellipse cx={0} cy={-6} rx={8} ry={6} fill={shade(item.color, 0.1)} stroke={C.ink} strokeWidth={1.5} />
        </g>
      ) : (
        grains(18, item.id.length * 7, -22, 22, -12, 22).map(([x, y], i) => (
          <rect key={i} x={x - 2.5} y={y - 2.5} width={5} height={5} fill={item.color} stroke={shade(item.color, -0.35)} strokeWidth={1} />
        ))
      )}
      <text y={52} textAnchor="middle" fontSize={15} fill={C.ink2}>
        {item.name}
      </text>
    </g>
  );
}

/** What each thing does in water, in the words of the prediction options. */
const RESULT: Record<Stuff, { actual: string; because: string }> = {
  salt: { actual: 'Dissolve', because: 'Salt breaks into bits too tiny to see. It is still there: the water tastes salty.' },
  sugar: { actual: 'Dissolve', because: 'Sugar breaks into tiny bits that spread through the water.' },
  sand: { actual: 'Sink', because: 'Sand does not dissolve. Its grains settle on the bottom.' },
  pebbles: { actual: 'Sink', because: 'Pebbles do not dissolve, and they are heavier than water for their size.' },
  oil: { actual: 'Float', because: 'Oil does not mix with water. It is lighter, so it floats on top.' },
};
const CHALLENGES: Stuff[] = ['salt', 'sand', 'oil', 'sugar', 'pebbles'];

function MixScene() {
  const [cIdx, setCIdx] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [added, setAdded] = useState<Stuff[]>([]);
  const [stirred, setStirred] = useState(false);
  const [filtered, setFiltered] = useState(false);
  const [evaporated, setEvaporated] = useState(false);
  const [swirl, setSwirl] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const has = (id: Stuff) => added.includes(id);
  const add = (id: Stuff) => {
    if (has(id) || evaporated) return;
    setAdded([...added, id]);
    setStirred(false);
    play('pop');
  };

  const stir = () => {
    setSwirl(true);
    play('whoosh');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setSwirl(false);
      setStirred(true);
    }, 1200);
  };

  const reset = () => {
    setAdded([]);
    setStirred(false);
    setFiltered(false);
    setEvaporated(false);
    play('tap');
  };

  const dissolvedShown = (id: Stuff) => has(id) && stirred && !evaporated;
  const challenge = CHALLENGES[cIdx];
  const challengeName = STUFF.find((x) => x.id === challenge)!.name;
  // Observed once the predicted thing is in the water and has been stirred.
  const observedNow = guess !== null && has(challenge) && stirred && !evaporated;
  // Keep the explanation up once the test has happened, until they ask for another.
  const [observed, setObserved] = useState(false);
  useEffect(() => {
    if (observedNow) setObserved(true);
  }, [observedNow]);
  const solidsCaught = filtered ? added.filter((id) => id === 'sand' || id === 'pebbles') : [];

  const notes: string[] = [];
  for (const it of STUFF) {
    if (!has(it.id)) continue;
    if (it.dissolves) {
      notes.push(
        evaporated
          ? `${cap(it.name)}: left behind as crystals when the water evaporated.`
          : stirred
            ? `${cap(it.name)}: dissolved. You can't see it, but it's still in the water.`
            : `${cap(it.name)}: stir to dissolve it.`,
      );
    } else if (it.id === 'oil') notes.push('Oil: does not mix. It floats on top.');
    else notes.push(filtered ? `${cap(it.name)}: caught in the filter paper.` : `${cap(it.name)}: does not dissolve. It sinks to the bottom.`);
  }

  const drop = (id: Stuff, p: { x: number; y: number }) => {
    if (p.x > B.x - 40 && p.x < B.x + B.w + 40 && p.y > B.y - 60 && p.y < B.y + B.h) add(id);
  };

  return (
    <SceneSvg label="A beaker of water. Add things, stir, filter or evaporate.">
      {/* Ingredient jars */}
      {STUFF.map((it, i) =>
        has(it.id) ? (
          <g key={it.id} transform={`translate(${110 + i * 95} 86)`} opacity={0.3}>
            <Jar item={it} />
          </g>
        ) : (
          <Draggable key={it.id} x={110 + i * 95} y={86} onDrop={(p) => drop(it.id, p)} onTap={() => add(it.id)} disabled={evaporated} label={`Add ${it.name}`}>
            <Jar item={it} />
          </Draggable>
        ),
      )}

      {/* Beaker */}
      <g>
        {!evaporated && (
          <rect x={B.x + 6} y={WATER_TOP} width={B.w - 12} height={FLOOR - WATER_TOP + 8} fill={has('sand') && swirl ? '#cfe1f5' : '#d8ecff'} opacity={0.9} />
        )}
        {/* Swirl lines while stirring */}
        {swirl && (
          <g stroke="#9cc4f0" strokeWidth={3} fill="none">
            <path d={`M${B.x + 50},${WATER_TOP + 80} q60,-30 120,0 t120,0`} />
            <path d={`M${B.x + 40},${WATER_TOP + 150} q60,30 120,0 t120,0`} />
          </g>
        )}
        {/* Salt and sugar: grains at the bottom until stirred; crystals after evaporating */}
        {(['salt', 'sugar'] as const).map((id, k) =>
          has(id) && (!stirred || evaporated) && !swirl
            ? grains(evaporated ? 12 : 26, k * 31 + 5, B.x + 30 + k * 100, B.x + 120 + k * 100, FLOOR - (evaporated ? 14 : 18), FLOOR - 2).map(([x, y], i) => (
                <rect key={`${id}${i}`} x={x - 3} y={y - 3} width={evaporated ? 8 : 5} height={evaporated ? 8 : 5} fill={STUFF.find((s) => s.id === id)!.color} stroke={C.muted} strokeWidth={1} transform={evaporated ? `rotate(45 ${x} ${y})` : undefined} />
              ))
            : null,
        )}
        {(['salt', 'sugar'] as const).map((id) =>
          dissolvedShown(id) ? (
            <text key={`d${id}`} x={B.x + B.w / 2} y={WATER_TOP + (id === 'salt' ? 120 : 150)} textAnchor="middle" fontSize={14} fill={C.muted}>
              {id} dissolved
            </text>
          ) : null,
        )}
        {/* Sand: cloudy while stirring, then settles */}
        {has('sand') && !filtered && !swirl &&
          grains(60, 77, B.x + 14, B.x + B.w - 14, FLOOR - 26, FLOOR).map(([x, y], i) => <circle key={`s${i}`} cx={x} cy={y} r={3} fill="#e2b96f" stroke={shade('#e2b96f', -0.3)} strokeWidth={0.8} />)}
        {has('sand') && !filtered && swirl &&
          grains(60, 78, B.x + 14, B.x + B.w - 14, WATER_TOP + 20, FLOOR).map(([x, y], i) => <circle key={`sw${i}`} cx={x} cy={y} r={3} fill="#e2b96f" opacity={0.8} />)}
        {/* Pebbles always sink */}
        {has('pebbles') && !filtered && (
          <g>
            {[
              [B.x + 60, FLOOR - 14, 22, 14],
              [B.x + 120, FLOOR - 12, 18, 12],
              [B.x + 190, FLOOR - 15, 24, 15],
            ].map(([cx, cy, rx, ry], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={shade('#9aa3ae', i * 0.08)} stroke={C.ink} strokeWidth={2} />
            ))}
          </g>
        )}
        {/* Oil floats on top (or is left as a film once the water has gone) */}
        {has('oil') && (
          <rect
            x={B.x + 6}
            y={evaporated ? FLOOR - 6 : WATER_TOP - 2}
            width={B.w - 12}
            height={evaporated ? 10 : 22}
            fill="#f5c542"
            opacity={0.85}
          />
        )}
        {/* Glass */}
        <path d={`M${B.x},${B.y} L${B.x},${B.y + B.h} Q${B.x},${B.y + B.h + 8} ${B.x + 10},${B.y + B.h + 8} L${B.x + B.w - 10},${B.y + B.h + 8} Q${B.x + B.w},${B.y + B.h + 8} ${B.x + B.w},${B.y + B.h} L${B.x + B.w},${B.y}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
        {[1, 2, 3].map((k) => (
          <line key={k} x1={B.x + B.w - 26} y1={B.y + k * 80} x2={B.x + B.w - 6} y2={B.y + k * 80} stroke={C.muted} strokeWidth={2} />
        ))}
        {evaporated && (
          <text x={B.x + B.w / 2} y={WATER_TOP + 60} textAnchor="middle" fontSize={16} fill={C.muted}>
            water evaporated
          </text>
        )}
      </g>

      {/* Filter funnel showing what it caught */}
      <g transform="translate(570 300)">
        <path d="M-60,0 L60,0 L14,70 L14,110 L-14,110 L-14,70 Z" fill={C.card} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M-50,6 L50,6 L10,62 L-10,62 Z" fill="#f4efe4" stroke={C.muted} strokeWidth={1.5} />
        {solidsCaught.includes('sand') && grains(30, 9, -30, 30, 20, 50).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.6} fill="#e2b96f" />)}
        {solidsCaught.includes('pebbles') && (
          <g>
            <ellipse cx={-14} cy={30} rx={12} ry={8} fill="#9aa3ae" stroke={C.ink} strokeWidth={1.5} />
            <ellipse cx={12} cy={34} rx={10} ry={7} fill="#aab2bc" stroke={C.ink} strokeWidth={1.5} />
          </g>
        )}
        <text y={136} textAnchor="middle" fontSize={14} fill={C.muted}>
          filter paper
        </text>
      </g>

      {/* Controls */}
      <SvgButton x={560} y={470} w={130} h={50} fontSize={18} label="Stir" onClick={stir} disabled={!added.length || evaporated || swirl} color={C.yellow} />
      <SvgButton x={700} y={470} w={130} h={50} fontSize={18} label="Filter" onClick={() => { setFiltered(true); play('pop'); }} disabled={!added.length || filtered || evaporated} />
      <SvgButton x={560} y={530} w={130} h={50} fontSize={18} label="Evaporate" onClick={() => { setEvaporated(true); setStirred(true); play('whoosh'); }} disabled={evaporated} color={C.orange} />
      <SvgButton x={700} y={530} w={130} h={50} fontSize={18} label="Fresh water" onClick={reset} />

      {/* What's happening */}
      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard
          x={650}
          y={20}
          w={320}
          prediction={guess}
          actual={RESULT[challenge].actual}
          because={RESULT[challenge].because}
          onAgain={() => {
            setGuess(null);
            setObserved(false);
            setCIdx((cIdx + 1) % CHALLENGES.length);
            reset();
          }}
        />
      ) : (
        <PredictCard
          x={650}
          y={20}
          w={320}
          question={`In water, ${challengeName} will…`}
          options={['Dissolve', 'Sink', 'Float']}
          prediction={guess}
          onPredict={(o) => {
            setGuess(o);
            reset();
          }}
        />
      )}

      <rect x={650} y={236} width={320} height={214} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={670} y={270} fontSize={19} fontWeight={700} fill={C.ink}>
        In the beaker
      </text>
      {notes.length === 0 ? (
        <WrapText
          x={670}
          y={300}
          width={285}
          fontSize={15}
          text={guess !== null ? `Now add the ${challengeName} and press Stir.` : 'Make a prediction, or drag something into the water.'}
        />
      ) : (
        notes.map((n, i) => {
          // Stack notes by how many lines each one wraps to.
          const y = 300 + notes.slice(0, i).reduce((sum, prev) => sum + wrapLines(prev, 285, 15).length * 20 + 8, 0);
          return <WrapText key={n} x={670} y={y} width={285} fontSize={15} text={n} />;
        })
      )}

      <Callout at={[B.x + B.w / 2, WATER_TOP + 130]} box={[20, 470]} w={190} icon={Droplets} title="Dissolving" text="Salt and sugar break into bits too tiny to see." />
      <Callout at={[570, 330]} box={[850, 470]} w={130} icon={Filter} title="Filter" text="Catches bits that did not dissolve." />
      <Callout at={[B.x + B.w / 2, WATER_TOP]} box={[510, 170]} w={120} icon={Waves} title="Oil" text="Does not mix. It floats." />
    </SceneSvg>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={34} y={30} width={52} height={40} fill="#d8ecff" />
      <rect x={34} y={30} width={52} height={7} fill="#f5c542" />
      <path d="M32,12 L32,72 L88,72 L88,12" fill="none" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      {[40, 48, 56, 64, 72, 80].map((x) => (
        <circle key={x} cx={x} cy={67} r={2.5} fill="#e2b96f" />
      ))}
      <path d="M60,4 l8,10 h-16 z" fill="#fff" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind =
    level === 0 ? pick(['dissolves', 'sand']) : level === 1 ? pick(['getSand', 'oil', 'getSalt', 'dissolves']) : pick(['solution', 'whyFilter', 'whereSalt', 'getSalt']);

  if (kind === 'dissolves') {
    const right = pick(['salt', 'sugar']);
    const wrong = shuffle(['sand', 'pebbles', 'cooking oil']).slice(0, level === 0 ? 2 : 3);
    return {
      prompt: 'Which one dissolves when you stir it into water?',
      choices: choices(shuffle([right, ...wrong])),
      answer: right,
      hint: 'Which one would seem to vanish into the water?',
      explain: [`${cap(wrong.join(', '))} do not dissolve in water.`, `Stirred in, ${right} breaks into bits too tiny to see.`, `So ${right} dissolves.`],
    };
  }

  if (kind === 'sand') {
    const right = 'It sinks to the bottom';
    return {
      prompt: 'What happens to sand when you stir it into water and wait?',
      choices: choices(shuffle([right, 'It dissolves and disappears', 'It floats on top'])),
      answer: right,
      hint: 'Sand does not dissolve. Where do heavy grains end up?',
      explain: ['Sand does not dissolve in water.', 'Its grains are heavy, so they settle down.', 'So it sinks to the bottom.'],
    };
  }

  if (kind === 'getSand') {
    const right = 'Pour it through a filter';
    return {
      prompt: 'How can you get sand back out of sandy water?',
      choices: choices(shuffle([right, 'Stir it faster', 'Add more water'])),
      answer: right,
      hint: 'Sand bits are big enough to be caught.',
      explain: ['Sand did not dissolve, so its grains are still big.', 'Filter paper lets water through but catches the grains.', 'So: pour it through a filter.'],
    };
  }

  if (kind === 'oil') {
    const right = 'It floats on top';
    return {
      prompt: 'Where does cooking oil end up when you pour it into water?',
      choices: choices(shuffle([right, 'It dissolves', 'It sinks to the bottom'])),
      answer: right,
      hint: 'Oil and water do not mix. Which one is lighter for its size?',
      explain: ['Oil does not dissolve in water.', 'Oil is less dense than water.', 'So it floats on top.'],
    };
  }

  if (kind === 'getSalt') {
    const right = 'Let the water evaporate';
    return {
      prompt: 'How can you get the salt back out of salty water?',
      choices: choices(shuffle([right, 'Pour it through a filter', 'Stir it again'])),
      answer: right,
      hint: 'The salt is dissolved. What could you take away instead?',
      explain: ['Dissolved salt is too tiny for a filter to catch.', 'If the water evaporates, the salt cannot go with it.', 'So: let the water evaporate, and salt crystals are left.'],
    };
  }

  if (kind === 'solution') {
    const right = pick(['Sugar stirred into water', 'Salt stirred into water']);
    return {
      prompt: 'Which of these makes a solution?',
      choices: choices(shuffle([right, 'Sand stirred into water', 'Pebbles dropped in water', 'Oil poured into water'])),
      answer: right,
      hint: 'A solution forms when something dissolves completely.',
      explain: ['In a solution, a solid dissolves and spreads through the liquid.', 'Sand, pebbles and oil do not dissolve in water.', `So ${right.toLowerCase()} makes a solution.`],
    };
  }

  if (kind === 'whyFilter') {
    const right = 'The dissolved salt is too tiny to be caught';
    return {
      prompt: 'Why can’t a filter get the salt out of salty water?',
      choices: choices(shuffle([right, 'Salt is too heavy', 'Filters only catch oil'])),
      answer: right,
      hint: 'Think about how big the salt bits are once they dissolve.',
      explain: ['A filter works like a very fine net.', 'Dissolved salt is split into bits far smaller than the holes.', 'So the dissolved salt is too tiny to be caught.'],
    };
  }

  const right = 'Still in the water, in tiny bits';
  return {
    prompt: 'Salt is stirred into water until you cannot see it. Where is the salt now?',
    choices: choices(shuffle([right, 'Gone forever', 'It turned into water'])),
    answer: right,
    hint: 'Would the water taste different?',
    explain: ['Salty water still tastes salty, so the salt is there.', 'It has dissolved into bits too small to see.', 'So it is still in the water, in tiny bits.'],
  };
}

export const mixturesAndSolutions: Lesson = {
  id: 'mixtures-and-solutions',
  title: 'Mixing and Dissolving',
  Thumb,
  Scene: MixScene,
  sceneHint: 'Predict first · Add it, stir, then filter or evaporate',
  learn: {
    heading: 'Dissolving and separating',
    intro:
      'Some things dissolve in water: they break into bits too tiny to see, making a solution. Others don’t, so they sink or float. Different methods can separate mixtures again.',
    points: [
      { icon: Droplets, text: 'Salt and sugar dissolve. They are still there, just too tiny to see.' },
      { icon: Filter, text: 'A filter catches things that did not dissolve, like sand.' },
      { icon: Sun, text: 'When water evaporates, dissolved solids are left behind.' },
    ],
  },
  steps: [
    'Add a solid to water and stir.',
    'Look: has it vanished (dissolved), sunk, or does it float?',
    'If it did not dissolve, pour the mixture through a filter.',
    'If it dissolved, let the water evaporate to get it back.',
  ],
  example: {
    question: 'You mix sand and salt into water. How can you get both back?',
    work: ['Filter first: the sand is caught in the filter paper.', 'Then evaporate the water that went through: salt crystals are left.'],
    answer: 'Filter to get the sand, then evaporate to get the salt.',
  },
  grownups: [
    'Try it in the kitchen: salt or sugar in warm water, then leave a saucer of salty water on a sunny windowsill for a few days.',
    'A common mix-up is that dissolved things have “disappeared”. Tasting salty water (safely) shows the salt is still there.',
    'Don’t heat sugar water to dryness: it burns. A warm windowsill is the safe way to evaporate.',
  ],
  makeQuestion,
};
