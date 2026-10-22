import { useRef, useState } from 'react';
import { Anchor, Search, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { MessageBox } from './visuals/MessageBox';
import { Obj, OBJ_NAMES, ObjPicture } from './visuals/Objects';
import type { ObjKind } from './visuals/Objects';
import './little.css';

/** What really happens in water. "Heavy for its size" things sink; "light for their size" things float. */
const FLOATS: Partial<Record<ObjKind, boolean>> = {
  apple: true,
  leaf: true,
  duck: true,
  block: true,
  log: true,
  sponge: true,
  ball: true,
  rock: false,
  coin: false,
  key: false,
  spoon: false,
  marble: false,
};
const SCENE_OBJECTS: ObjKind[] = ['apple', 'rock', 'leaf', 'coin', 'duck', 'key', 'block', 'spoon', 'log'];

const TANK = { x: 90, y: 250, w: 520, h: 370, water: 330 };
const TRAY_FLOAT = { x: 660, y: 250, w: 300, h: 128 };
const TRAY_SINK = { x: 660, y: 392, w: 300, h: 128 };
const SHELF_Y = 120;

type Place = 'shelf' | 'float' | 'sink' | 'tank';
interface Item {
  kind: ObjKind;
  place: Place;
  /** What the child guessed before testing (if they did). */
  guess?: 'float' | 'sink';
  /** Spot in the tank, in the order things went in (so nothing jumps around). */
  slot?: number;
}

const inside = (p: Pt, r: { x: number; y: number; w: number; h: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function home(item: Item, index: number, items: Item[]): Pt {
  if (item.place === 'shelf') return { x: 100 + index * 100, y: SHELF_Y };
  if (item.place === 'float' || item.place === 'sink') {
    const tray = item.place === 'float' ? TRAY_FLOAT : TRAY_SINK;
    const k = items.filter((it, i) => it.place === item.place && i < index).length;
    return { x: tray.x + 50 + (k % 5) * 52, y: tray.y + 76 + Math.floor(k / 5) * 30 };
  }
  // In the tank: floaters bob at the surface, sinkers rest on the bottom.
  const slot = item.slot ?? 0;
  const x = TANK.x + 60 + (slot % 8) * 58;
  return FLOATS[item.kind] ? { x, y: TANK.water + 4 } : { x, y: TANK.y + TANK.h - 40 - (slot % 2) * 8 };
}

function SinkFloatScene() {
  const [items, setItems] = useState<Item[]>(() => SCENE_OBJECTS.map((kind) => ({ kind, place: 'shelf' as Place })));
  const [drag, setDrag] = useState<{ index: number; p: Pt } | null>(null);
  /** The latest test, for the observe → explain card. */
  const [result, setResult] = useState<{ kind: ObjKind; guess?: 'float' | 'sink' } | null>(null);

  const drop = (index: number, p: Pt) => {
    const item = items[index];
    let place: Place = item.place === 'tank' ? 'tank' : item.place;
    let guess = item.guess;
    let slot = item.slot;
    if (inside(p, TANK) && item.place !== 'tank') {
      place = 'tank';
      slot = items.filter((it) => it.place === 'tank').length;
      play('pop');
      setResult({ kind: item.kind, guess });
    } else if (inside(p, TRAY_FLOAT) && item.place !== 'tank') {
      place = 'float';
      guess = 'float';
      play('tap');
    } else if (inside(p, TRAY_SINK) && item.place !== 'tank') {
      place = 'sink';
      guess = 'sink';
      play('tap');
    }
    setItems(items.map((it, i) => (i === index ? { ...it, place, guess, slot } : it)));
  };

  const testGuesses = () => {
    const guessed = items.filter((it) => it.place === 'float' || it.place === 'sink');
    if (!guessed.length) return;
    const right = guessed.filter((it) => (it.guess === 'float') === !!FLOATS[it.kind]).length;
    // Explain the most surprising one (a wrong guess), or else the first one tested.
    const focus = guessed.find((it) => (it.guess === 'float') !== !!FLOATS[it.kind]) ?? guessed[0];
    setResult({ kind: focus.kind, guess: focus.guess });
    let next = items.filter((it) => it.place === 'tank').length;
    setItems(items.map((it) => (it.place === 'float' || it.place === 'sink' ? { ...it, place: 'tank', slot: next++ } : it)));
    play(right === guessed.length ? 'correct' : 'pop');
  };

  const reset = () => {
    setItems(SCENE_OBJECTS.map((kind) => ({ kind, place: 'shelf' })));
    setResult(null);
  };

  const guessedCount = items.filter((it) => it.place === 'float' || it.place === 'sink').length;

  return (
    <SceneSvg label="A water tank with things to test: will they float or sink?">
      {/* Shelf */}
      <rect x={50} y={SHELF_Y + 34} width={900} height={14} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <text x={50} y={SHELF_Y - 52} fontSize={17} fill={C.muted} className="caps">
        Things to test
      </text>

      {/* Tank */}
      <rect x={TANK.x + 6} y={TANK.y + 10} width={TANK.w} height={TANK.h} rx={18} fill={C.ink} opacity={0.1} />
      <rect x={TANK.x} y={TANK.water} width={TANK.w} height={TANK.y + TANK.h - TANK.water} fill="#9fd3f0" opacity={0.85} />
      <path
        d={`M${TANK.x},${TANK.water} q32,-10 65,0 t65,0 t65,0 t65,0 t65,0 t65,0 t65,0 t65,0`}
        fill="none"
        stroke={shade('#9fd3f0', -0.25)}
        strokeWidth={3}
      />
      <rect x={TANK.x} y={TANK.y} width={TANK.w} height={TANK.h} rx={18} fill="none" stroke={C.ink} strokeWidth={4} />
      <rect x={TANK.x + 14} y={TANK.y + 14} width={10} height={TANK.h - 80} rx={5} fill={C.white} opacity={0.6} />

      {/* Guess trays */}
      {[
        { tray: TRAY_FLOAT, label: 'I think it floats', color: C.blue },
        { tray: TRAY_SINK, label: 'I think it sinks', color: C.purple },
      ].map(({ tray, label, color }) => (
        <g key={label}>
          <rect x={tray.x + 4} y={tray.y + 6} width={tray.w} height={tray.h} rx={18} fill={C.ink} opacity={0.1} />
          <rect x={tray.x} y={tray.y} width={tray.w} height={tray.h} rx={18} fill={shade(color, 0.82)} stroke={C.ink} strokeWidth={2.5} strokeDasharray="8 6" />
          <text x={tray.x + tray.w / 2} y={tray.y + 28} textAnchor="middle" fontSize={20} fontWeight={700} fill={shade(color, -0.3)}>
            {label}
          </text>
        </g>
      ))}

      {/* Objects. The dragged one stays in place in the DOM (so it keeps the pointer) and a copy is drawn on top. */}
      {items.map((item, index) => (
        <DraggableObject
          key={item.kind}
          item={item}
          at={home(item, index, items)}
          dragging={drag?.index === index}
          onMove={(p) => setDrag({ index, p })}
          onDrop={(p) => {
            setDrag(null);
            drop(index, p);
          }}
        />
      ))}
      {drag && (
        <g transform={`translate(${drag.p.x} ${drag.p.y})`} pointerEvents="none">
          <Obj kind={items[drag.index].kind} size={items[drag.index].kind === 'log' ? 92 : 72} />
        </g>
      )}

      {/* Message and controls */}
      {result ? (
        <ExplainCard
          x={660}
          y={532}
          w={300}
          prediction={result.guess ? (result.guess === 'float' ? 'Floats' : 'Sinks') : null}
          actual={FLOATS[result.kind] ? 'Floats' : 'Sinks'}
          because={`${cap(name(result.kind))} is ${FLOATS[result.kind] ? 'light' : 'heavy'} for its size. ${FLOATS[result.kind] ? 'Water holds it up.' : 'Water can’t hold it up.'}`}
        />
      ) : (
        <MessageBox x={660} y={540} w={300} h={70} text="1 · Guess: drag things into a tray. 2 · Test them!" max={30} />
      )}
      <SvgButton x={TANK.x} y={630} w={250} h={44} fontSize={17} label="Test my guesses" onClick={testGuesses} disabled={guessedCount === 0} color={C.teal} textColor={C.white} />
      <SvgButton x={TANK.x + 270} y={630} w={150} h={44} fontSize={17} label="Start again" onClick={reset} />

      <Callout at={[TRAY_FLOAT.x + 30, TRAY_FLOAT.y]} box={[720, 182]} icon={Search} title="Guess first" text="Scientists guess, then test to find out." w={240} />
      <Callout at={[TANK.x + 300, TANK.water]} box={[300, 182]} icon={Anchor} title="Not just heavy or light" text="A big log floats, but a tiny coin sinks!" w={260} />
    </SceneSvg>
  );
}

function DraggableObject({
  item,
  at,
  dragging,
  onMove,
  onDrop,
}: {
  item: Item;
  at: Pt;
  dragging: boolean;
  onMove: (p: Pt) => void;
  onDrop: (p: Pt) => void;
}) {
  const last = useRef<Pt | null>(null);
  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      onMove(p);
    },
    { onEnd: () => last.current && onDrop(last.current) },
  );
  const inTank = item.place === 'tank';
  const floats = !!FLOATS[item.kind];
  const correct = item.guess ? (item.guess === 'float') === floats : null;
  return (
    <g style={{ transform: `translate(${at.x}px, ${at.y}px)`, transition: 'transform 0.7s cubic-bezier(.3,1.2,.5,1)' }} opacity={dragging ? 0.25 : 1}>
      <g className={inTank && floats ? 'sl-bob' : undefined}>
        <g {...drag} aria-label={OBJ_NAMES[item.kind]} role="button">
          <circle r={40} fill="transparent" />
          <Obj kind={item.kind} size={item.kind === 'log' ? 86 : 64} />
        </g>
        {inTank && correct !== null && (
          <g transform="translate(26 -30)">
            <circle r={13} fill={correct ? C.green : C.orange} stroke={C.ink} strokeWidth={2} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.white}>
              {correct ? '✓' : '!'}
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={14} y={14} width={92} height={58} rx={8} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <rect x={15.5} y={34} width={89} height={36.5} rx={6} fill="#9fd3f0" />
      <Obj kind="duck" x={42} y={32} size={30} />
      <Obj kind="rock" x={80} y={62} size={22} />
    </svg>
  );
}

const name = (k: ObjKind) => OBJ_NAMES[k];
/** "a glass marble" → "A glass marble" (with the right article). */
const cap = (n: string) => `${/^[aeiou]/.test(n) ? 'An' : 'A'} ${n}`;
const FLOATERS = (Object.keys(FLOATS) as ObjKind[]).filter((k) => FLOATS[k]);
const SINKERS = (Object.keys(FLOATS) as ObjKind[]).filter((k) => !FLOATS[k]);

function why(kind: ObjKind): string[] {
  return FLOATS[kind]
    ? [`A ${name(kind)} is light for its size.`, 'The water can hold it up.', `So the ${name(kind)} floats.`]
    : [`A ${name(kind)} is heavy for its size.`, 'The water can’t hold it up.', `So the ${name(kind)} sinks.`];
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const kind = pick([...FLOATERS, ...SINKERS]);
    const answer = FLOATS[kind] ? 'float' : 'sink';
    return {
      prompt: `Will the ${name(kind)} float or sink?`,
      visual: <ObjPicture kind={kind} />,
      choices: [
        { value: 'float', label: 'Float', name: 'float' },
        { value: 'sink', label: 'Sink', name: 'sink' },
      ],
      answer,
      hint: 'Picture it in the bath. Does it bob on top, or drop to the bottom?',
      explain: why(kind),
    };
  }
  if (level === 1) {
    const askFloat = Math.random() < 0.5;
    const target = pick(askFloat ? FLOATERS : SINKERS);
    const others = shuffle(askFloat ? SINKERS : FLOATERS).slice(0, 2);
    const options = shuffle([target, ...others]);
    return {
      prompt: askFloat ? 'Which one will float?' : 'Which one will sink?',
      choices: options.map((k) => ({ value: k, name: name(k), label: <ObjPicture kind={k} caption /> })),
      answer: target,
      hint: askFloat ? 'Look for the one that is light for its size.' : 'Look for the one that is heavy for its size.',
      explain: [
        ...why(target).slice(0, 2),
        askFloat ? `The others are heavy for their size and sink.` : 'The others are light for their size and float.',
        `So the answer is the ${name(target)}.`,
      ],
    };
  }
  // Level 2: size isn't everything.
  const style = pick(['pair', 'idea'] as const);
  if (style === 'idea') {
    return {
      prompt: 'Do big, heavy things always sink?',
      visual: <ObjPicture kind="log" caption />,
      choices: [
        { value: 'no', label: 'No', name: 'no' },
        { value: 'yes', label: 'Yes', name: 'yes' },
      ],
      answer: 'no',
      hint: 'Think about a big log in a river.',
      explain: ['A big log is heavy, but it is light for its size.', 'So a big log floats.', 'The answer is no: big things can float.'],
    };
  }
  const small = pick(SINKERS.filter((k) => k !== 'rock'));
  const askSink = Math.random() < 0.5;
  const target = askSink ? small : 'log';
  return {
    prompt: `A big log and a small ${name(small)}. Which one ${askSink ? 'sinks' : 'floats'}?`,
    choices: shuffle<ObjKind>(['log', small]).map((k) => ({ value: k, name: name(k), label: <ObjPicture kind={k} caption /> })),
    answer: target,
    hint: 'Bigger doesn’t always mean it sinks. Is it heavy for its size?',
    explain: [
      'The big log is light for its size, so it floats.',
      `The small ${name(small)} is heavy for its size, so it sinks.`,
      `So the answer is the ${name(target)}.`,
    ],
  };
}

export const sinkOrFloat: Lesson = {
  id: 'sink-or-float',
  title: 'Sink or Float',
  Thumb,
  Scene: SinkFloatScene,
  sceneHint: 'Drag things into a guess tray, then test · Or drop them straight into the water',
  learn: {
    heading: 'Sink or float?',
    intro: 'Some things float on top of water and some sink to the bottom. Scientists make a guess first, then test it to find out!',
    points: [
      { icon: Search, text: 'Guess first, then test it.' },
      { icon: Waves, text: 'Floaters stay on top. Sinkers drop down.' },
      { icon: Anchor, text: 'It’s not just heavy or light: a big log floats and a tiny coin sinks.' },
    ],
  },
  steps: [
    'Pick something from the shelf.',
    'Guess: will it float or sink? Put it in a guess tray.',
    'Test it: drop it in the water.',
    'Were you right? Try the next one!',
  ],
  example: {
    question: 'Will a wooden block float or sink?',
    visual: <ObjPicture kind="block" />,
    work: ['Wood is light for its size.', 'The water holds it up.'],
    answer: 'The wooden block floats!',
  },
  grownups: [
    'Test real things in the bath or a bowl. Let your child guess first, then test.',
    'Ask “why do you think so?” The reasons matter more than being right.',
    'Enjoy the surprises: an apple floats and a small coin sinks. Talk about things being “heavy for their size”.',
    'Always stay close when children play with water.',
  ],
  makeQuestion,
};
