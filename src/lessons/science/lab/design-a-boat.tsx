import { useRef, useState } from 'react';
import { Coins, Hammer, Repeat, Sailboat } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { WrapText } from './visuals/Draggable';
import { useProgress } from './visuals/useProgress';

/**
 * Design a boat: drag the corner of a foil boat (seen end-on) to change how wide it is and how tall
 * its sides are, then load coins until it sinks. A boat floats while the water it pushes aside weighs
 * as much as the boat and its load. It can push aside at most length × width × side height of water
 * (1 cubic cm of water weighs 1 g) before water spills in.
 * Model: length 10 cm, foil 2 g, each coin 10 g.
 */

const LENGTH = 10;
const FOIL = 2;
const COIN = 10;
const W_RANGE: [number, number] = [3, 10];
const H_RANGE: [number, number] = [1, 4];

/** Grams of water the boat can push aside before its sides go under. */
export const capacity = (w: number, h: number) => LENGTH * w * h;
/** Most coins the boat holds without sinking. */
export const maxCoins = (w: number, h: number) => Math.floor((capacity(w, h) - FOIL) / COIN);

const SCALE = 36; // world units per cm
const CX = 320;
const WATER = 340;
const FLOOR = 572;
const TANK = { x: 40, y: 92, w: 560, h: 490 };

type Phase = 'plan' | 'build' | 'test' | 'improve';
const PHASES: { id: Phase; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'build', label: 'Build' },
  { id: 'test', label: 'Test' },
  { id: 'improve', label: 'Improve' },
];

function range(n: number) {
  return n < 10 ? 'Under 10' : n <= 20 ? '10 to 20' : 'Over 20';
}

interface Try {
  w: number;
  h: number;
  coins: number;
}

function BoatScene() {
  const [w, setW] = useState(6);
  const [h, setH] = useState(2);
  const [coins, setCoins] = useState(0);
  const [sunk, setSunk] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('plan');
  const [tries, setTries] = useState<Try[]>([]);
  const sink = useProgress(1400);

  const cap = capacity(w, h);
  const most = maxCoins(w, h);
  const load = FOIL + coins * COIN;
  const draft = Math.min(h, load / (LENGTH * w)); // how deep the bottom sits, in cm
  const floatBottom = WATER + draft * SCALE;
  const bottom = sunk || sink.running ? floatBottom + (FLOOR - floatBottom) * sink.p : floatBottom;
  const top = bottom - h * SCALE;
  const half = (w * SCALE) / 2;
  const flooded = sunk || sink.running ? Math.min(1, sink.p * 1.6) : 0;

  const reshape = (nw: number, nh: number) => {
    if (nw === w && nh === h) return;
    sink.reset();
    setW(nw);
    setH(nh);
    setCoins(0);
    setSunk(false);
    setGuess(null);
    setPhase('build');
    play('tap');
  };
  // Reshape relative to where the drag started, so a tap never changes the boat.
  const grab = useRef({ x: 0, y: 0, w, h });
  const handle = useSvgDrag(
    (p) => {
      if (sink.running) return;
      const g = grab.current;
      const nw = clamp(g.w + Math.round((2 * (p.x - g.x)) / SCALE), W_RANGE[0], W_RANGE[1]);
      const nh = clamp(g.h + Math.round((g.y - p.y) / SCALE), H_RANGE[0], H_RANGE[1]);
      reshape(nw, nh);
    },
    { onStart: (p) => (grab.current = { x: p.x, y: p.y, w, h }) },
  );

  const add = (k: number) => {
    if (sunk || sink.running) return;
    const next = coins + k;
    setCoins(next);
    setPhase('test');
    if (next > most) {
      play('whoosh');
      sink.run(() => {
        setSunk(true);
        setPhase('improve');
        setTries((old) => [...old, { w, h, coins: most }].slice(-4));
        play('pop');
      });
    } else play('tap');
  };
  const empty = () => {
    sink.reset();
    setCoins(0);
    setSunk(false);
    play('tap');
  };

  // Coins sit in rows across the floor of the boat.
  const perRow = Math.max(1, Math.floor((w * SCALE - 10) / 34));
  const coinRows = Array.from({ length: coins }, (_, i) => ({ col: i % perRow, row: Math.floor(i / perRow) }));
  const rowW = Math.min(coins, perRow) * 34;
  const best = tries.reduce((m, t) => Math.max(m, t.coins), 0);

  return (
    <SceneSvg label="Shape a foil boat and add coins until it sinks.">
      {/* design cycle */}
      {PHASES.map((ph, i) => {
        const on = ph.id === phase;
        return (
          <g key={ph.id}>
            <rect x={40 + i * 146} y={28} width={118} height={42} rx={21} fill={on ? C.yellow : shade(C.line, 0.5)} stroke={on ? C.ink : C.line} strokeWidth={on ? 2.5 : 1.5} />
            <text x={99 + i * 146} y={55} textAnchor="middle" fontSize={17} fontWeight={on ? 700 : 400} fill={on ? C.ink : C.muted}>
              {ph.label}
            </text>
            {i < 3 && <path d={`M${162 + i * 146},49 h16 l-6,-6 m6,6 l-6,6`} stroke={C.muted} strokeWidth={2.5} fill="none" strokeLinecap="round" />}
          </g>
        );
      })}

      {/* tank */}
      <rect x={TANK.x} y={TANK.y} width={TANK.w} height={TANK.h} rx={18} fill={shade(C.blue, 0.9)} stroke={C.ink} strokeWidth={2.5} />
      <text x={60} y={124} fontSize={16} fill={C.ink}>
        <tspan fontWeight={700}>{w} cm</tspan> wide · <tspan fontWeight={700}>{h} cm</tspan> sides · 10 cm long
      </text>
      <text x={580} y={124} textAnchor="end" fontSize={18} fontWeight={700} fill={C.ink}>
        Coins: {coins}
      </text>

      {/* the boat (end-on) and its coins */}
      <g>
        <path
          d={`M${CX - half},${top} L${CX - half},${bottom} L${CX + half},${bottom} L${CX + half},${top}`}
          fill={shade(C.white, -0.04)}
          stroke={C.ink2}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <rect x={CX - half + 3} y={bottom - (bottom - top) * flooded} width={Math.max(0, half * 2 - 6)} height={(bottom - top) * flooded} fill={shade(C.blue, 0.4)} />
        {coinRows.map(({ col, row }, i) => {
          const x = CX - rowW / 2 + col * 34 + 2;
          const y = bottom - 12 - row * 10;
          return <rect key={i} x={x} y={y} width={30} height={9} rx={4} fill={C.yellow} stroke={shade(C.yellow, -0.45)} strokeWidth={1.5} />;
        })}
      </g>

      {/* water drawn over the boat so the part under the surface looks submerged */}
      <path d={`M${TANK.x},${WATER} H${TANK.x + TANK.w} V${TANK.y + TANK.h - 18} q0,18 -18,18 H${TANK.x + 18} q-18,0 -18,-18 Z`} fill={C.blue} opacity={0.35} />
      <line x1={TANK.x} y1={WATER} x2={TANK.x + TANK.w} y2={WATER} stroke={shade(C.blue, -0.2)} strokeWidth={2.5} />
      {sunk && (
        <text x={CX} y={WATER - 30} textAnchor="middle" fontSize={22} fontWeight={700} fill={shade(C.red, -0.2)}>
          Sank with {coins} coins! It held {most}.
        </text>
      )}

      {/* reshape handle */}
      {!sunk && !sink.running && (
        <g {...handle} role="slider" aria-label={`Boat shape: ${w} cm wide, ${h} cm sides`} aria-valuenow={w}>
          <circle cx={CX + half} cy={top} r={26} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
          <path
            d={`M${CX + half - 13},${top} h26 M${CX + half},${top - 13} v26 M${CX + half - 5},${top - 8} l5,-5 l5,5 M${CX + half - 5},${top + 8} l5,5 l5,-5 M${CX + half - 8},${top - 5} l-5,5 l5,5 M${CX + half + 8},${top - 5} l5,5 l-5,5`}
            stroke={C.ink}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      )}

      <SvgButton x={40} y={598} w={150} h={50} fontSize={18} label="+1 coin" onClick={() => add(1)} disabled={sunk || sink.running} color={C.yellow} />
      <SvgButton x={198} y={598} w={150} h={50} fontSize={18} label="+5 coins" onClick={() => add(5)} disabled={sunk || sink.running} color={C.yellow} />
      <SvgButton x={360} y={598} w={240} h={50} fontSize={18} label={sunk ? 'Rescue and empty' : 'Empty the boat'} onClick={empty} disabled={sink.running || (coins === 0 && !sunk)} />

      {sunk ? (
        <ExplainCard
          x={630}
          y={24}
          w={340}
          prediction={guess}
          actual={range(most)}
          because={`It can push aside up to ${cap} g of water before water spills in. ${most} coins (${most * COIN} g) plus ${FOIL} g of foil fit, but one more sinks it.`}
          onAgain={() => { empty(); setGuess(null); setPhase('improve'); }}
        />
      ) : (
        <PredictCard x={630} y={24} w={340} question="How many coins will this boat hold?" options={['Under 10', '10 to 20', 'Over 20']} prediction={guess} onPredict={(o) => { setGuess(o); setPhase('test'); play('tap'); }} />
      )}

      {/* load vs water pushed aside */}
      <g>
        <rect x={630} y={318} width={340} height={118} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={644} y={342} fontSize={13} fill={C.muted} className="caps">
          Floats while load ≤ water pushed aside
        </text>
        <text x={644} y={372} fontSize={15} fill={C.ink}>
          Load
        </text>
        <rect x={740} y={358} width={170} height={20} rx={6} fill={shade(C.line, 0.4)} />
        <rect x={740} y={358} width={Math.min(170, (load / 400) * 170)} height={20} rx={6} fill={load > cap ? C.red : C.orange} />
        <text x={918} y={373} fontSize={15} fontWeight={700} fill={C.ink}>
          {load} g
        </text>
        <text x={644} y={412} fontSize={15} fill={C.ink}>
          Most water
        </text>
        <rect x={740} y={398} width={170} height={20} rx={6} fill={shade(C.line, 0.4)} />
        <rect x={740} y={398} width={(cap / 400) * 170} height={20} rx={6} fill={C.blue} />
        <text x={918} y={413} fontSize={15} fontWeight={700} fill={C.ink}>
          {cap} g
        </text>
      </g>

      {/* tries so far */}
      <g>
        <rect x={630} y={450} width={340} height={198} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={644} y={474} fontSize={13} fill={C.muted} className="caps">
          Your tests
        </text>
        {tries.length === 0 ? (
          <WrapText x={644} y={502} width={312} fontSize={15} fill={C.ink2} text="Add coins until your boat sinks. Then improve the shape and test again." />
        ) : (
          tries.map((t, i) => (
            <text key={i} x={644} y={504 + i * 34} fontSize={16} fill={C.ink} fontWeight={t.coins === best ? 700 : 400}>
              {t.w} cm wide, {t.h} cm sides: {t.coins} coins{t.coins === best ? ' ★' : ''}
            </text>
          ))
        )}
      </g>

      {!sunk && !sink.running && <Callout at={[CX + half - 24, top - 8]} box={[60, 150]} w={200} icon={Hammer} title="Drag to reshape" text="Pull the yellow corner sideways for width, up or down for side height." />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={6} width={112} height={68} rx={8} fill={shade(C.blue, 0.9)} />
      <path d="M26,30 L26,50 L94,50 L94,30" fill={C.white} stroke={C.ink2} strokeWidth={3} strokeLinejoin="round" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={34 + i * 14} y={42} width={12} height={5} rx={2} fill={C.yellow} stroke={shade(C.yellow, -0.45)} strokeWidth={1} />
      ))}
      <rect x={4} y={44} width={112} height={30} rx={0} fill={C.blue} opacity={0.35} />
      <circle cx={94} cy={30} r={6} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

function q(prompt: string, right: string, wrong: string[], hint: string, explain: string[]): Question {
  return { prompt, choices: choices(shuffle([right, ...wrong])), answer: right, hint, explain };
}

function makeQuestion(level: number): Question {
  const kinds = level === 0 ? ['bigger', 'sank', 'spread'] : level === 1 ? ['push', 'tall', 'cycle', 'ship'] : ['coins', 'volume', 'compare'];
  switch (pick(kinds)) {
    case 'bigger':
      return q('Which boat will hold more coins?', 'A wide boat with tall sides', ['A narrow boat with low sides', 'A tiny flat raft'], 'Which one can push aside the most water?', [
        'A bigger boat shape pushes aside more water.',
        'A wide floor and tall sides make the biggest space.',
        'So a wide boat with tall sides holds more.',
      ]);
    case 'sank':
      return q('Your boat sank. What should an engineer do next?', 'Improve it and test again', ['Give up', 'Hide the boat'], 'Think about the design cycle.', [
        'Sinking tells you something useful.',
        'Change one thing, like taller sides.',
        'Engineers improve it and test again.',
      ]);
    case 'spread':
      return q('Where should you put the coins in a foil boat?', 'Spread out across the floor', ['All piled at one end', 'Balanced on the edge'], 'What happens if one side gets much heavier?', [
        'A heavy pile at one end makes that end dip.',
        'Water can then pour over the low side.',
        'Spread out across the floor, the weight stays balanced.',
      ]);
    case 'push':
      return q('A floating boat pushes aside water that weighs…', 'The same as the boat and its load', ['Nothing at all', 'Twice as much as the boat'], 'Watch the two bars: load and water pushed aside.', [
        'As the boat settles into the water, it pushes water aside.',
        'It stops sinking when the water pushed aside weighs the same as the boat and its load.',
      ]);
    case 'tall':
      return q('Why do taller sides let a boat carry more?', 'It can sit lower without water coming in', ['Tall sides are lighter', 'Tall sides make the water warmer'], 'What happens to a boat as you add coins?', [
        'More load makes a boat sit lower in the water.',
        'With taller sides it can sit lower without water coming in.',
        'Sitting lower pushes aside more water, which holds up more weight.',
      ]);
    case 'cycle':
      return q('What is the right order for the design cycle?', 'Plan, build, test, improve', ['Test, plan, improve, build', 'Build, improve, plan, test'], 'You need an idea before you can make anything.', [
        'First plan your idea.',
        'Then build it and test it.',
        'Use what you learned to improve it: plan, build, test, improve.',
      ]);
    case 'ship':
      return q('A huge steel ship floats. Why?', 'Its shape pushes aside lots of water', ['Steel is lighter than water', 'The sea is sticky'], 'A lump of steel sinks. What is different about a ship?', [
        'A solid lump of steel sinks.',
        'A ship is a wide, hollow shape full of air.',
        'Its shape pushes aside lots of water, enough to hold up its weight.',
      ]);
    case 'coins': {
      const n = rand(5, 20);
      const v = n * COIN + FOIL + pick([0, 3, 5, 7]);
      return {
        prompt: `A boat can push aside ${v} g of water before it floods. The foil weighs 2 g and each coin weighs 10 g. How many coins can it hold?`,
        answer: String(n),
        hint: 'Take off the foil first, then see how many 10 g coins fit.',
        explain: [`Take off the foil: ${v} − 2 = ${v - FOIL} g left for coins.`, `${n} coins weigh ${n * COIN} g. ${n + 1} would weigh ${(n + 1) * COIN} g, too much.`, `So it holds ${n} coins.`],
      };
    }
    case 'volume': {
      const w = rand(4, 9);
      const h = rand(2, 4);
      const v = capacity(w, h);
      return {
        prompt: `A boat is 10 cm long, ${w} cm wide and has ${h} cm sides. Up to how many grams of water can it push aside?`,
        answer: String(v),
        hint: 'Find the space inside: length × width × height. Each cubic cm of water weighs 1 g.',
        explain: [`Space inside: 10 × ${w} × ${h} = ${v} cubic cm.`, 'Each cubic cm of water weighs 1 g.', `So it can push aside up to ${v} g of water.`],
      };
    }
    default: {
      let a: [number, number];
      let b: [number, number];
      do {
        a = [rand(3, 10), rand(1, 4)];
        b = [rand(3, 10), rand(1, 4)];
      } while (capacity(...a) === capacity(...b) || a[0] === b[0] || a[1] === b[1]);
      const va = capacity(...a);
      const vb = capacity(...b);
      const win = va > vb ? 'Boat A' : 'Boat B';
      return {
        prompt: `Both boats are 10 cm long. Boat A: ${a[0]} cm wide, ${a[1]} cm sides. Boat B: ${b[0]} cm wide, ${b[1]} cm sides. Which can hold more coins?`,
        choices: choices(['Boat A', 'Boat B']),
        answer: win,
        hint: 'Work out length × width × side height for each boat.',
        explain: [`Boat A: 10 × ${a[0]} × ${a[1]} = ${va} g of water.`, `Boat B: 10 × ${b[0]} × ${b[1]} = ${vb} g of water.`, `${win} can push aside more water, so ${win} holds more coins.`],
      };
    }
  }
}

export const designABoat: Lesson = {
  id: 'design-a-boat',
  title: 'Design a Boat',
  Thumb,
  Scene: BoatScene,
  sceneHint: 'Drag the yellow corner to shape the boat · Predict · Add coins until it sinks · Improve it',
  learn: {
    heading: 'Design a boat',
    intro:
      'A boat floats because it pushes water out of the way. The more water its shape can push aside, the more weight it can carry. Engineers plan, build, test and improve.',
    points: [
      { icon: Sailboat, text: 'A floating boat pushes aside its own weight in water.' },
      { icon: Coins, text: 'Wider floors and taller sides can push aside more water, so they carry more.' },
      { icon: Hammer, text: 'Spread the load so the boat stays level.' },
      { icon: Repeat, text: 'Plan, build, test, improve, then test again.' },
    ],
  },
  steps: [
    'Plan a shape and predict how many coins it will hold.',
    'Build it and add coins one at a time.',
    'When it sinks, write down how many it held.',
    'Change one thing to improve it, and test again.',
  ],
  example: {
    question: 'A boat 10 cm long, 6 cm wide with 2 cm sides. About how many 10 g coins can it hold?',
    work: ['It can push aside up to 10 × 6 × 2 = 120 g of water.', 'Take off 2 g for the foil: 118 g left.', '11 coins weigh 110 g; 12 would be 120 g, too much.'],
    answer: '11 coins.',
  },
  grownups: [
    'This is Archimedes’ principle: a floating object pushes aside water equal to its own weight.',
    'Real foil boats can also tip or leak, so spreading the coins out matters. Try it with a sheet of foil and a bowl of water.',
    'Praise the testing, not just the score: a boat that sinks early gives the best clues for the next design.',
  ],
  makeQuestion,
};
