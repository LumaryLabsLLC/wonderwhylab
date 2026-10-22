import { useState } from 'react';
import { Magnet, Search, ShieldQuestion } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { MessageBox } from './visuals/MessageBox';
import { Obj, OBJ_NAMES, ObjPicture } from './visuals/Objects';
import type { ObjKind } from './visuals/Objects';
import './little.css';

/** Magnets pull iron and steel. (Many keys and coins are brass or copper, so we leave them out.) */
const MAGNETIC: Partial<Record<ObjKind, boolean>> = {
  paperclip: true,
  nail: true,
  cap: true,
  eraser: false,
  block: false,
  brick: false,
  foil: false,
  marble: false,
};
const MATERIAL: Partial<Record<ObjKind, string>> = {
  paperclip: 'steel',
  nail: 'iron',
  cap: 'steel',
  eraser: 'rubber',
  block: 'wood',
  brick: 'plastic',
  foil: 'aluminium, a metal that magnets don’t pull',
  marble: 'glass',
};
const KINDS = Object.keys(MAGNETIC) as ObjKind[];
const SPOTS = [
  [150, 320],
  [300, 320],
  [450, 320],
  [600, 320],
  [150, 490],
  [300, 490],
  [450, 490],
  [600, 490],
];
const STUCK_OFFSETS = [
  [-30, 112],
  [30, 112],
  [0, 150],
  [-38, 176],
  [38, 176],
];
const TRAY = { x: 740, y: 230, w: 220, h: 200 };
/** The order we suggest testing things in (a surprise early on: foil is metal but doesn't stick). */
const EXPERIMENTS: ObjKind[] = ['paperclip', 'foil', 'block', 'nail', 'eraser', 'cap', 'marble', 'brick'];
const STICKS = 'It sticks';
const NO_STICK = 'It won’t stick';

type Where = 'table' | 'stuck' | 'tray';
interface Item {
  kind: ObjKind;
  where: Where;
  order: number;
}

function HorseshoeMagnet() {
  return (
    <g>
      <path d="M-48,60 V0 A48,48 0 0 1 48,0 V60 H18 V0 A18,18 0 0 0 -18,0 V60 Z" fill={C.red} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <rect x={-48} y={50} width={30} height={30} fill="#d9dee3" stroke={C.ink} strokeWidth={3} />
      <rect x={18} y={50} width={30} height={30} fill="#d9dee3" stroke={C.ink} strokeWidth={3} />
      <text x={-33} y={66} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>
        N
      </text>
      <text x={33} y={66} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>
        S
      </text>
      <path d="M-28,-26 A36,36 0 0 1 4,-38" fill="none" stroke={shade(C.red, 0.4)} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

function MagnetScene() {
  const [items, setItems] = useState<Item[]>(() => KINDS.map((kind, i) => ({ kind, where: 'table' as Where, order: i })));
  const [mag, setMag] = useState({ x: 850, y: 568 });
  const [nope, setNope] = useState<ObjKind | null>(null);
  const [message, setMessage] = useState('Drag the magnet near things. Which ones stick?');
  // Predict → observe → explain, one featured thing at a time.
  const [target, setTarget] = useState<ObjKind>(EXPERIMENTS[0]);
  const [guess, setGuess] = useState<string | null>(null);
  const [result, setResult] = useState<boolean | null>(null);

  const drag = useSvgDrag((p) => {
    const next = { x: clamp(p.x, 70, 930), y: clamp(p.y - 30, 60, 470) };
    setMag(next);
    const t = { x: next.x, y: next.y + 80 };
    let stuckCount = items.filter((it) => it.where === 'stuck').length;
    let changed = false;
    const updated = items.map((it, i) => {
      if (it.where !== 'table') return it;
      const [sx, sy] = SPOTS[i];
      const d = Math.hypot(sx - t.x, sy - t.y);
      if (MAGNETIC[it.kind] && d < 95 && stuckCount < STUCK_OFFSETS.length) {
        changed = true;
        play('pop');
        setMessage(`Click! The ${OBJ_NAMES[it.kind]} sticks. It’s made of ${MATERIAL[it.kind]}.`);
        if (it.kind === target && result === null) setResult(true);
        return { ...it, where: 'stuck' as Where, order: stuckCount++ };
      }
      if (!MAGNETIC[it.kind] && d < 70 && nope !== it.kind) {
        setNope(it.kind);
        if (it.kind === target && result === null) setResult(false);
        setMessage(`The ${OBJ_NAMES[it.kind]} doesn’t move. It’s made of ${MATERIAL[it.kind]}.`);
        window.setTimeout(() => setNope((n) => (n === it.kind ? null : n)), 600);
      }
      return it;
    });
    if (changed) setItems(updated);
  });

  const shakeOff = () => {
    let k = items.filter((it) => it.where === 'tray').length;
    setItems(items.map((it) => (it.where === 'stuck' ? { ...it, where: 'tray', order: k++ } : it)));
    setMessage('These things stick to magnets!');
    play('tap');
  };

  const reset = () => {
    setItems(KINDS.map((kind, i) => ({ kind, where: 'table', order: i })));
    setMag({ x: 850, y: 568 });
    setMessage('Drag the magnet near things. Which ones stick?');
    setTarget(EXPERIMENTS[0]);
    setGuess(null);
    setResult(null);
  };

  /** Move on to the next thing still on the table (or start the table again). */
  const nextExperiment = () => {
    const onTable = new Set(items.filter((it) => it.where === 'table').map((it) => it.kind));
    const start = EXPERIMENTS.indexOf(target);
    const next = [...EXPERIMENTS.slice(start + 1), ...EXPERIMENTS.slice(0, start + 1)].find((k) => onTable.has(k) && k !== target);
    if (!next) {
      reset();
      return;
    }
    setTarget(next);
    setGuess(null);
    setResult(null);
  };

  const pos = (it: Item, i: number) => {
    if (it.where === 'stuck') {
      const [ox, oy] = STUCK_OFFSETS[it.order];
      return { x: mag.x + ox, y: mag.y + oy };
    }
    if (it.where === 'tray') return { x: TRAY.x + 55 + (it.order % 3) * 55, y: TRAY.y + 85 + Math.floor(it.order / 3) * 70 };
    return { x: SPOTS[i][0], y: SPOTS[i][1] };
  };

  const stuck = items.filter((it) => it.where === 'stuck').length;

  return (
    <SceneSvg label="A magnet and things on a table">
      {/* Table */}
      <rect x={66} y={236} width={640} height={380} rx={22} fill={C.ink} opacity={0.1} />
      <rect x={60} y={230} width={640} height={380} rx={22} fill={shade(C.wood, 0.3)} stroke={C.ink} strokeWidth={3} />

      {/* Magnetic things tray */}
      <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} rx={18} fill={shade(C.red, 0.85)} stroke={C.ink} strokeWidth={2.5} strokeDasharray="8 6" />
      <text x={TRAY.x + TRAY.w / 2} y={TRAY.y + 30} textAnchor="middle" fontSize={19} fontWeight={700} fill={shade(C.red, -0.3)}>
        Sticks to magnets
      </text>

      {/* The thing we're testing now */}
      {result === null && items.find((it) => it.kind === target)?.where === 'table' && (
        <g transform={`translate(${SPOTS[KINDS.indexOf(target)][0]} ${SPOTS[KINDS.indexOf(target)][1]})`} pointerEvents="none">
          <circle r={56} fill={shade(C.yellow, 0.6)} stroke={C.orange} strokeWidth={3} strokeDasharray="7 6" />
          <text y={-62} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(C.orange, -0.3)}>
            Test me!
          </text>
        </g>
      )}

      {items.map((it, i) => {
        const p = pos(it, i);
        return (
          <g key={it.kind} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 0.18s ease-out' }}>
            <g className={nope === it.kind ? 'sl-nope' : undefined}>
              <Obj kind={it.kind} size={it.where === 'table' ? 74 : 56} />
            </g>
          </g>
        );
      })}

      {/* The magnet (drawn last so it sits on top) */}
      <g transform={`translate(${mag.x} ${mag.y})`}>
        <g {...drag} role="slider" aria-label="Magnet: drag it near things">
          <circle cx={0} cy={20} r={70} fill="transparent" />
          <HorseshoeMagnet />
        </g>
        {stuck === 0 && (
          <g opacity={0.5}>
            <path d="M-40,92 q8,10 0,20 M0,92 q8,10 0,20 M40,92 q8,10 0,20" fill="none" stroke={C.red} strokeWidth={3} strokeLinecap="round" />
          </g>
        )}
      </g>

      {result === null ? (
        <PredictCard
          x={60}
          y={40}
          w={640}
          question={`Will the magnet pick up the ${OBJ_NAMES[target]}?`}
          options={[STICKS, NO_STICK]}
          prediction={guess}
          onPredict={setGuess}
        />
      ) : (
        <ExplainCard
          x={60}
          y={40}
          w={640}
          prediction={guess}
          actual={result ? STICKS : NO_STICK}
          because={`The ${OBJ_NAMES[target]} is made of ${MATERIAL[target]}. Magnets pull iron and steel.`}
          onAgain={nextExperiment}
        />
      )}
      <MessageBox x={60} y={622} w={640} h={48} text={message} max={64} size={16} />
      <SvgButton x={740} y={450} w={220} h={50} fontSize={18} label="Shake them off" onClick={shakeOff} disabled={stuck === 0} color={C.teal} textColor={C.white} />
      <SvgButton x={740} y={60} w={220} h={50} fontSize={18} label="Start again" onClick={reset} />

      <Callout at={[TRAY.x + 20, TRAY.y + 60]} box={[740, 128]} icon={Magnet} title="Iron and steel stick" w={220} />
      <Callout at={[600, 490]} box={[740, 520]} icon={ShieldQuestion} title="Not all metal sticks" text="Foil is metal, but magnets don’t pull it." w={220} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(50 26) scale(0.42)">
        <HorseshoeMagnet />
      </g>
      <Obj kind="paperclip" x={50} y={66} size={26} />
      <Obj kind="block" x={96} y={58} size={22} />
    </svg>
  );
}

const MAG = KINDS.filter((k) => MAGNETIC[k]);
const NOT = KINDS.filter((k) => !MAGNETIC[k]);
const name = (k: ObjKind) => OBJ_NAMES[k];

function whyStick(k: ObjKind): string[] {
  return MAGNETIC[k]
    ? [`A ${name(k)} is made of ${MATERIAL[k]}.`, 'Magnets pull iron and steel.', `So yes, the ${name(k)} sticks.`]
    : [`A ${name(k)} is made of ${MATERIAL[k]}.`, 'Magnets only pull iron and steel.', `So no, the ${name(k)} won’t stick.`];
}

const YES_NO = [
  { value: 'yes', label: 'Yes', name: 'yes' },
  { value: 'no', label: 'No', name: 'no' },
];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const k = pick(KINDS);
    return {
      prompt: `Will the magnet pick up the ${name(k)}?`,
      visual: <ObjPicture kind={k} caption />,
      choices: YES_NO,
      answer: MAGNETIC[k] ? 'yes' : 'no',
      hint: 'Think about what it is made of. Magnets pull iron and steel.',
      explain: whyStick(k),
    };
  }
  if (level === 1) {
    const target = pick(MAG);
    const options = shuffle([target, ...shuffle(NOT).slice(0, 2)]);
    return {
      prompt: 'Which one will stick to the magnet?',
      choices: options.map((k) => ({ value: k, name: name(k), label: <ObjPicture kind={k} caption /> })),
      answer: target,
      hint: 'Look for the one made of iron or steel.',
      explain: [whyStick(target)[0], 'Magnets pull iron and steel, not wood, plastic, rubber or glass.', `So the ${name(target)} sticks.`],
    };
  }
  const kind = pick(['foil', 'what', 'paper'] as const);
  if (kind === 'foil') {
    return {
      prompt: 'Foil is made of metal. Will a magnet pick it up?',
      visual: <ObjPicture kind="foil" caption />,
      choices: YES_NO,
      answer: 'no',
      hint: 'Not every metal sticks to magnets.',
      explain: ['Foil is made of aluminium.', 'Magnets don’t pull aluminium. They pull iron and steel.', 'So no, it won’t stick.'],
    };
  }
  if (kind === 'what') {
    return {
      prompt: 'What do magnets pull?',
      choices: shuffle([
        { value: 'iron', label: 'Iron and steel', name: 'iron and steel' },
        { value: 'all', label: 'All metals', name: 'all metals' },
        { value: 'wood', label: 'Wood and plastic', name: 'wood and plastic' },
      ]),
      answer: 'iron',
      hint: 'Remember the foil: it’s a metal that didn’t stick.',
      explain: ['Paperclips and nails stick: they are iron and steel.', 'Foil is a metal too, but it doesn’t stick.', 'So magnets pull iron and steel.'],
    };
  }
  return {
    prompt: 'Can a magnet hold a drawing on the fridge, through the paper?',
    choices: YES_NO,
    answer: 'yes',
    hint: 'Think about fridge magnets.',
    explain: ['Magnets can pull through thin things like paper.', 'The fridge door is made of steel.', 'So yes, the magnet holds the drawing.'],
  };
}

export const magnets: Lesson = {
  id: 'magnets',
  title: 'Magnets',
  Thumb,
  Scene: MagnetScene,
  sceneHint: 'Guess first · Drag the magnet near the thing to test · Shake them off to sort',
  learn: {
    heading: 'Magnets',
    intro: 'A magnet can pull some things toward it without even touching them! It pulls things made of iron or steel.',
    points: [
      { icon: Magnet, text: 'Magnets pull iron and steel.' },
      { icon: ShieldQuestion, text: 'Not every metal sticks: foil doesn’t!' },
      { icon: Search, text: 'Wood, plastic, rubber and glass don’t stick.' },
    ],
  },
  steps: [
    'Guess: will the magnet pick it up?',
    'Test it: drag the magnet near it. Does it jump up?',
    'Were you right? Find out why, then test the next thing.',
    'Shake them off: those are the magnetic things!',
  ],
  example: {
    question: 'Will a magnet pick up a paperclip?',
    visual: <ObjPicture kind="paperclip" caption />,
    work: ['A paperclip is made of steel.', 'Magnets pull steel.'],
    answer: 'Yes, the paperclip sticks!',
  },
  grownups: [
    'Go on a magnet hunt with a fridge magnet. Test spoons, keys, coins and tins around the house.',
    'Surprises are useful: many spoons, keys and coins are NOT magnetic, because they aren’t made of iron or steel.',
    'Ask your child to guess before each test, then talk about what happened.',
    'Keep strong magnets away from small children’s mouths and from phones and cards.',
  ],
  makeQuestion,
};
