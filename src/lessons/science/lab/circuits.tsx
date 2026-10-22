import { useEffect, useState } from 'react';
import { Battery, Lightbulb, RefreshCcw, ToggleRight } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, WrapText } from './visuals/Draggable';

/** Things to test in the gap. Metals are conductors; rubber, wood and plastic are insulators. */
type ItemId = 'wire' | 'clip' | 'coin' | 'foil' | 'eraser' | 'stick';

interface Item {
  id: ItemId;
  name: string;
  conductor: boolean;
  why: string;
}

const ITEMS: Item[] = [
  { id: 'wire', name: 'copper wire', conductor: true, why: 'Copper is a metal, so it is a conductor.' },
  { id: 'clip', name: 'paperclip', conductor: true, why: 'A paperclip is made of steel, a metal.' },
  { id: 'coin', name: 'coin', conductor: true, why: 'Coins are made of metal.' },
  { id: 'foil', name: 'kitchen foil', conductor: true, why: 'Foil is aluminium, a metal.' },
  { id: 'eraser', name: 'eraser', conductor: false, why: 'Rubber is an insulator. It blocks electricity.' },
  { id: 'stick', name: 'wooden stick', conductor: false, why: 'Dry wood is an insulator.' },
];

/** Draw an item centred at (0, 0), about 80 units wide. */
function ItemArt({ id }: { id: ItemId }) {
  const s = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (id) {
    case 'wire':
      return (
        <g>
          <path d="M-38,4 C-24,-14 -10,18 4,0 S28,-14 38,-2" fill="none" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
          <path d="M-38,4 C-24,-14 -10,18 4,0 S28,-14 38,-2" fill="none" stroke="#d9823b" strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    case 'clip':
      return (
        <path
          d="M-30,-8 L24,-8 A10,10 0 0 1 24,12 L-22,12 A6,6 0 0 1 -22,0 L18,0"
          fill="none"
          {...s}
          stroke="#8a94a6"
          strokeWidth={5}
        />
      );
    case 'coin':
      return (
        <g>
          <circle r={22} fill="#e8b73a" {...s} />
          <circle r={15} fill="none" stroke={shade('#e8b73a', -0.25)} strokeWidth={2.5} />
        </g>
      );
    case 'foil':
      return (
        <path d="M-34,-14 L-20,-18 L-6,-12 L10,-17 L28,-12 L34,0 L26,14 L8,10 L-8,16 L-26,12 L-34,2 Z" fill="#d7dde6" {...s} />
      );
    case 'eraser':
      return (
        <g>
          <rect x={-30} y={-14} width={60} height={28} rx={7} fill="#f2a7b8" {...s} />
          <rect x={6} y={-14} width={24} height={28} rx={7} fill="#7fb2ff" {...s} />
        </g>
      );
    case 'stick':
      return <rect x={-38} y={-7} width={76} height={14} rx={7} fill={C.wood} {...s} />;
  }
}

// Circuit loop layout (scene units).
const L = { left: 170, right: 690, top: 130, bottom: 410 };
const GAP = { x: 430, y: L.bottom, w: 130 };
const TRAY_Y = 560;
const TRAY_X = (i: number) => 150 + i * 98;

function Bulb({ x, y, lit, size = 1 }: { x: number; y: number; lit: boolean; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {lit && <circle cy={-46} r={70} fill={C.yellow} opacity={0.35} />}
      <circle cy={-46} r={34} fill={lit ? '#ffe680' : '#eef2f7'} stroke={C.ink} strokeWidth={2.5} />
      <path d="M-10,-40 L-4,-58 L4,-40 L10,-58" fill="none" stroke={lit ? C.orange : C.muted} strokeWidth={3} strokeLinejoin="round" />
      <rect x={-16} y={-16} width={32} height={18} rx={3} fill="#b9c2cf" stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

/** Predict → observe → explain: one item at a time, mixing metals and non-metals. */
const CHALLENGES: ItemId[] = ['coin', 'eraser', 'foil', 'stick', 'clip', 'wire'];

function CircuitScene() {
  const [placed, setPlaced] = useState<ItemId | null>(null);
  const [closed, setClosed] = useState(true);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const item = ITEMS.find((i) => i.id === placed);
  const challenge = ITEMS.find((i) => i.id === CHALLENGES[challengeIdx])!;
  // The test has happened once the predicted item sits in a closed loop.
  const observedNow = guess !== null && placed === challenge.id && closed;
  // Keep the explanation up once the test has happened, until they ask for another.
  const [observed, setObserved] = useState(false);
  useEffect(() => {
    if (observedNow) setObserved(true);
  }, [observedNow]);
  const lit = !!item?.conductor && closed;
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const drop = (id: ItemId, p: { x: number; y: number }) => {
    if (Math.abs(p.x - GAP.x) < 110 && Math.abs(p.y - GAP.y) < 70) {
      setPlaced(id);
      play('pop');
    }
  };

  const status = !item
    ? 'There is a gap in the loop. Drag something into it.'
    : !closed
      ? 'The switch is open, so the loop is broken.'
      : item.conductor
        ? 'Complete loop! Electricity flows all the way round.'
        : `The ${item.name} blocks the electricity. The loop is broken.`;

  return (
    <SceneSvg label={`A circuit with a battery, bulb and switch. The bulb is ${lit ? 'on' : 'off'}.`}>
      {/* Wires */}
      <g fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round">
        <path d={`M${L.left},${L.top + 85} L${L.left},${L.top} L${L.right},${L.top} L${L.right},${L.top + 100}`} />
        <path d={`M${L.right},${L.bottom - 100} L${L.right},${L.bottom} L${GAP.x + GAP.w / 2},${L.bottom}`} />
        <path d={`M${GAP.x - GAP.w / 2},${L.bottom} L${L.left},${L.bottom} L${L.left},${L.bottom - 85}`} />
      </g>
      {lit && (
        <path
          d={`M${L.left},${L.top + 85} L${L.left},${L.top} L${L.right},${L.top} L${L.right},${L.bottom} L${L.left},${L.bottom} L${L.left},${L.bottom - 85}`}
          fill="none"
          stroke={C.yellow}
          strokeWidth={4}
          strokeDasharray="10 14"
          strokeLinecap="round"
        >
          {!reduced && <animate attributeName="stroke-dashoffset" from="0" to="-48" dur="0.7s" repeatCount="indefinite" />}
        </path>
      )}

      {/* Battery (+ at the top) */}
      <g transform={`translate(${L.left} ${(L.top + L.bottom) / 2})`}>
        <rect x={-30} y={-62} width={60} height={124} rx={10} fill={C.green} stroke={C.ink} strokeWidth={2.5} />
        <rect x={-30} y={8} width={60} height={54} rx={10} fill={C.ink} />
        <rect x={-12} y={-74} width={24} height={12} rx={3} fill="#b9c2cf" stroke={C.ink} strokeWidth={2.5} />
        <text y={-24} textAnchor="middle" fontSize={30} fontWeight={700} fill={C.white}>+</text>
        <text y={44} textAnchor="middle" fontSize={30} fontWeight={700} fill={C.white}>−</text>
      </g>

      {/* Bulb */}
      <Bulb x={430} y={L.top + 8} lit={lit} />

      {/* Switch */}
      <g
        transform={`translate(${L.right} ${(L.top + L.bottom) / 2})`}
        onClick={() => {
          setClosed(!closed);
          play('tap');
        }}
        style={{ cursor: 'pointer' }}
        data-nopan
        role="button"
        aria-label={closed ? 'Open the switch' : 'Close the switch'}
      >
        <rect x={-46} y={-70} width={92} height={140} rx={12} fill="transparent" />
        <circle cy={-40} r={8} fill={C.white} stroke={C.ink} strokeWidth={3} />
        <circle cy={40} r={8} fill={C.white} stroke={C.ink} strokeWidth={3} />
        <line x1={0} y1={-40} x2={closed ? 0 : 52} y2={closed ? 40 : 22} stroke={C.red} strokeWidth={7} strokeLinecap="round" />
        <text x={-20} y={4} textAnchor="end" fontSize={17} fontWeight={700} fill={C.ink2} className="caps">
          {closed ? 'Closed' : 'Open'}
        </text>
      </g>

      {/* Predict → observe → explain, in the empty middle of the loop */}
      {observed ? (
        <ExplainCard
          x={215}
          y={168}
          w={380}
          prediction={guess}
          actual={challenge.conductor ? 'Yes' : 'No'}
          because={challenge.conductor ? `The bulb lit. ${challenge.why}` : `The bulb stayed off. ${challenge.why}`}
          onAgain={() => {
            setGuess(null);
            setObserved(false);
            setPlaced(null);
            setChallengeIdx((challengeIdx + 1) % CHALLENGES.length);
          }}
        />
      ) : (
        <PredictCard
          x={215}
          y={168}
          w={380}
          question={`Will the ${challenge.name} light it?`}
          options={['Yes', 'No']}
          prediction={guess}
          onPredict={(o) => {
            setGuess(o);
            setClosed(true);
            if (placed === challenge.id) setPlaced(null);
            play('tap');
          }}
        />
      )}

      {/* The gap */}
      <g>
        <rect x={GAP.x - GAP.w / 2 - 10} y={GAP.y - 40} width={GAP.w + 20} height={80} rx={14} fill={item ? 'transparent' : C.card} stroke={C.ink2} strokeWidth={2} strokeDasharray={item ? undefined : '7 6'} opacity={item ? 0 : 1} />
        <circle cx={GAP.x - GAP.w / 2} cy={GAP.y} r={7} fill={C.red} stroke={C.ink} strokeWidth={2} />
        <circle cx={GAP.x + GAP.w / 2} cy={GAP.y} r={7} fill={C.ink} stroke={C.ink} strokeWidth={2} />
        {!item && (
          <text x={GAP.x} y={GAP.y + 6} textAnchor="middle" fontSize={16} fill={C.muted} fontWeight={600}>
            Gap
          </text>
        )}
        {item && (
          <Draggable x={GAP.x} y={GAP.y} onDrop={(p) => (Math.abs(p.y - GAP.y) > 60 ? setPlaced(null) : undefined)} onTap={() => setPlaced(null)} label={`Take the ${item.name} out`}>
            <g transform="scale(1.4)">
              <ItemArt id={item.id} />
            </g>
          </Draggable>
        )}
      </g>

      {/* Tray of things to test */}
      <rect x={95} y={TRAY_Y - 58} width={600} height={130} rx={18} fill={C.card} stroke={C.line} strokeWidth={2} />
      <text x={115} y={TRAY_Y - 34} fontSize={15} fill={C.muted} className="caps">
        Test these
      </text>
      {ITEMS.map((it, i) =>
        it.id === placed ? null : (
          <Draggable key={it.id} x={TRAY_X(i)} y={TRAY_Y} onDrop={(p) => drop(it.id, p)} onTap={() => drop(it.id, GAP)} label={`Put the ${it.name} in the gap`}>
            <rect x={-44} y={-30} width={88} height={60} fill="transparent" />
            <ItemArt id={it.id} />
            <text y={50} textAnchor="middle" fontSize={14} fill={C.ink2}>
              {it.name}
            </text>
          </Draggable>
        ),
      )}

      {/* Readout */}
      <g>
        <rect x={735} y={120} width={240} height={250} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
        <text x={855} y={160} textAnchor="middle" fontSize={22} fontWeight={700} fill={lit ? C.green : C.ink}>
          {lit ? 'Bulb ON' : 'Bulb OFF'}
        </text>
        <WrapText x={752} y={196} width={208} text={status} fontSize={16} fontWeight={600} fill={C.ink} />
        {item && <WrapText x={752} y={290} width={208} text={item.why} fontSize={15} />}
      </g>
      <SvgButton x={735} y={392} w={240} h={52} fontSize={18} label={closed ? 'Open the switch' : 'Close the switch'} onClick={() => setClosed(!closed)} color={C.yellow} />
      <SvgButton x={735} y={458} w={240} h={52} fontSize={18} label="Empty the gap" onClick={() => setPlaced(null)} disabled={!item} />

      <Callout at={[L.left, (L.top + L.bottom) / 2]} box={[30, 30]} w={200} icon={Battery} title="Battery" text="It pushes electricity round the loop." />
      <Callout at={[L.right + 30, (L.top + L.bottom) / 2]} box={[735, 560]} w={240} icon={ToggleRight} title="Switch" text="Closed joins the loop. Open breaks it." />
      <Callout at={[430, L.top - 80]} box={[530, 20]} w={200} icon={Lightbulb} title="Bulb" text="It only lights when the loop is complete." />
    </SceneSvg>
  );
}

/** Small circuit picture for questions. The bulb is always drawn off so it never gives the answer away. */
function CircuitPicture({ itemId, closed }: { itemId: ItemId | null; closed: boolean }) {
  return (
    <svg viewBox="0 -26 320 196" role="img" aria-label={`A circuit with ${itemId ? `a ${ITEMS.find((i) => i.id === itemId)!.name}` : 'nothing'} in the gap and the switch ${closed ? 'closed' : 'open'}`}>
      <g fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round">
        <path d="M40,70 L40,20 L280,20 L280,60" />
        <path d="M280,110 L280,140 L195,140" />
        <path d="M125,140 L40,140 L40,110" />
      </g>
      <rect x={24} y={62} width={32} height={56} rx={6} fill={C.green} stroke={C.ink} strokeWidth={2} />
      <text x={40} y={84} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.white}>+</text>
      <Bulb x={160} y={26} lit={false} size={0.55} />
      <circle cx={280} cy={62} r={4} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <circle cx={280} cy={108} r={4} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <line x1={280} y1={62} x2={closed ? 280 : 304} y2={closed ? 108 : 98} stroke={C.red} strokeWidth={5} strokeLinecap="round" />
      <text x={262} y={90} textAnchor="end" fontSize={13} fontWeight={700} fill={C.ink2}>
        {closed ? 'closed' : 'open'}
      </text>
      {itemId ? (
        <g transform="translate(160 140) scale(0.85)">
          <ItemArt id={itemId} />
        </g>
      ) : (
        <text x={160} y={145} textAnchor="middle" fontSize={13} fill={C.muted}>
          gap
        </text>
      )}
      {itemId && (
        <text x={160} y={166} textAnchor="middle" fontSize={13} fill={C.ink2}>
          {ITEMS.find((i) => i.id === itemId)!.name}
        </text>
      )}
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M20,40 L20,14 L100,14 L100,66 L20,66 L20,48" fill="none" stroke={C.ink} strokeWidth={3} />
      <rect x={12} y={30} width={16} height={26} rx={3} fill={C.green} stroke={C.ink} strokeWidth={2} />
      <circle cx={60} cy={14} r={11} fill="#ffe680" stroke={C.ink} strokeWidth={2} />
      <circle cx={60} cy={14} r={18} fill={C.yellow} opacity={0.35} />
      <circle cx={100} cy={40} r={4} fill={C.white} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

const CONDUCTORS = ['copper wire', 'paperclip', 'coin', 'kitchen foil', 'steel spoon', 'metal key'];
const INSULATORS = ['eraser', 'wooden stick', 'plastic ruler', 'rubber band', 'paper straw', 'glass marble'];

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['conductor', 'will']) : level === 1 ? pick(['conductor', 'will', 'switch', 'see']) : pick(['why', 'will', 'conductor4', 'insulator']);

  if (kind === 'conductor' || kind === 'conductor4') {
    const right = pick(CONDUCTORS);
    const wrong = shuffle(INSULATORS).slice(0, kind === 'conductor4' || level > 0 ? 3 : 2);
    return {
      prompt: 'Which one would make the bulb light up if you put it in the gap?',
      choices: choices(shuffle([right, ...wrong])),
      answer: right,
      hint: 'Electricity can flow through metals.',
      explain: [
        `The ${right} is made of metal, so it is a conductor.`,
        `${cap(wrong.join(', '))} are insulators: they block electricity.`,
        `So the ${right} completes the loop and lights the bulb.`,
      ],
    };
  }

  if (kind === 'insulator') {
    const right = pick(INSULATORS);
    const wrong = shuffle(CONDUCTORS).slice(0, 3);
    return {
      prompt: 'Which one is an insulator (it would stop the bulb lighting)?',
      choices: choices(shuffle([right, ...wrong])),
      answer: right,
      hint: 'Insulators are usually not metal: think rubber, wood, plastic or glass.',
      explain: [`${cap(wrong.join(', '))} are metal, so they conduct.`, `The ${right} is not metal, so it blocks electricity.`, `The insulator is the ${right}.`],
    };
  }

  if (kind === 'switch') {
    const right = 'It opens and closes the loop';
    return {
      prompt: 'What does a switch do in a circuit?',
      choices: choices(shuffle([right, 'It makes the battery bigger', 'It changes the colour of the bulb'])),
      answer: right,
      hint: 'Think about what happens to the loop when you flick it.',
      explain: ['Closed, the switch joins the wires so the loop is complete.', 'Open, it makes a gap so electricity stops.', 'So a switch: it opens and closes the loop.'],
    };
  }

  if (kind === 'see') {
    const right = 'Light from the bulb reaches our eyes';
    return {
      prompt: 'How do we see a bulb that is switched on?',
      choices: choices(shuffle([right, 'Light comes out of our eyes', 'The wires glow'])),
      answer: right,
      hint: 'Think about which way the light travels.',
      explain: ['A lit bulb gives off light.', 'The light travels in straight lines into our eyes.', 'So: light from the bulb reaches our eyes.'],
    };
  }

  if (kind === 'why') {
    // Pick one problem; the picture shows it.
    const problem = pick(['open', 'insulator', 'empty'] as const);
    const ins = pick(ITEMS.filter((i) => !i.conductor));
    const con = pick(ITEMS.filter((i) => i.conductor));
    const itemId = problem === 'insulator' ? ins.id : problem === 'empty' ? null : con.id;
    const right = problem === 'open' ? 'The switch is open' : problem === 'insulator' ? `The ${ins.name} blocks electricity` : 'There is a gap in the loop';
    const wrong = ['The wires are too long', 'The bulb is too bright', 'The battery is too heavy'];
    return {
      prompt: 'Why is the bulb not lit?',
      visual: <CircuitPicture itemId={itemId} closed={problem !== 'open'} />,
      choices: choices(shuffle([right, ...shuffle(wrong).slice(0, 2)])),
      answer: right,
      hint: 'Follow the loop all the way round. Where does it break?',
      explain:
        problem === 'open'
          ? ['Follow the loop from the battery round to the switch.', 'The switch is open, so there is a break.', 'That is why: the switch is open.']
          : problem === 'insulator'
            ? [`The ${ins.name} is in the gap.`, 'It is not metal, so it is an insulator.', `That is why: the ${ins.name} blocks electricity.`]
            : ['Follow the loop round from the battery.', 'Nothing is in the gap, so the loop is not complete.', 'That is why: there is a gap in the loop.'],
    };
  }

  // 'will': will the bulb light?
  const it = pick(ITEMS);
  const closed = level === 0 ? true : rand(0, 2) > 0;
  const on = it.conductor && closed;
  return {
    prompt: 'Will the bulb light up?',
    visual: <CircuitPicture itemId={it.id} closed={closed} />,
    choices: choices(['Yes', 'No']),
    answer: on ? 'Yes' : 'No',
    hint: 'Check the thing in the gap, then check the switch.',
    explain: [
      `The ${it.name} is ${it.conductor ? 'a conductor (metal)' : 'an insulator'}.`,
      `The switch is ${closed ? 'closed' : 'open'}.`,
      on ? 'Yes: the loop is complete, so the bulb lights.' : 'No: the loop is broken, so the bulb stays off.',
    ],
  };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const circuits: Lesson = {
  id: 'circuits',
  title: 'Circuits',
  Thumb,
  Scene: CircuitScene,
  sceneHint: 'Predict first, then drag it into the gap to test',
  learn: {
    heading: 'Making a circuit',
    intro:
      'Electricity needs a complete loop to flow, called a circuit. A battery pushes it round, and the bulb lights only when nothing breaks the loop.',
    points: [
      { icon: RefreshCcw, text: 'The loop must be complete, with no gaps.' },
      { icon: Lightbulb, text: 'Metals are conductors: they let electricity through.' },
      { icon: ToggleRight, text: 'A switch opens or closes the loop.' },
    ],
  },
  steps: [
    'Start at the battery and follow the wire with your finger.',
    'Check every part: is anything missing or not metal?',
    'Check the switch: closed means joined, open means broken.',
    'If the loop is complete with conductors, the bulb lights!',
  ],
  example: {
    question: 'A coin is in the gap and the switch is closed. Does the bulb light?',
    visual: <CircuitPicture itemId="coin" closed />,
    work: ['A coin is metal, so it conducts.', 'The switch is closed, so the loop is complete.'],
    answer: 'Yes, the bulb lights up.',
  },
  grownups: [
    'Never experiment with mains electricity (plugs and sockets). Small batteries are safe for circuits like this.',
    'Hunt for conductors around the house together: spoons, keys, foil (metal) versus wood, plastic and rubber.',
    'Ask “where would the electricity get stuck?” to help them trace the loop.',
  ],
  makeQuestion,
};
