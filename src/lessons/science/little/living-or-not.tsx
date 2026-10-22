import { useEffect, useRef, useState } from 'react';
import { HeartPulse, Search, Sprout } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { EmojiPicture, SceneEmoji } from './visuals/Emoji';
import { DragToken, inside } from './visuals/DragToken';
import { EMOJI_FONT } from '../../../games/reading/words';
import { MessageBox } from './visuals/MessageBox';
import { Obj, ObjPicture } from './visuals/Objects';

/**
 * Living things grow, need food and water, breathe, and make new living things (have young).
 * Every thing here is clearly one or the other for young children.
 */
interface Thing {
  id: string;
  name: string;
  /** Emoji to draw (or 'rock', drawn as a picture). */
  emoji: string;
  /** What it looks like a week later (living things grow). */
  grown?: string;
  living: boolean;
  /** One short reason, for the explain card. */
  why: string;
}

const THINGS: Thing[] = [
  { id: 'kitten', name: 'kitten', emoji: '🐱', grown: '🐈', living: true, why: 'A kitten grows, eats, drinks and breathes.' },
  { id: 'seed', name: 'seed', emoji: '🌰', grown: '🌱', living: true, why: 'With water, a seed grows into a new plant.' },
  { id: 'rock', name: 'rock', emoji: 'rock', living: false, why: 'A rock never grows, eats or breathes.' },
  { id: 'chick', name: 'chick', emoji: '🐥', grown: '🐔', living: true, why: 'A chick grows into a hen, and it eats and breathes.' },
  { id: 'car', name: 'toy car', emoji: '🚗', living: false, why: 'A toy car can roll, but it never grows or eats.' },
  { id: 'robot', name: 'robot', emoji: '🤖', living: false, why: 'A robot can move, but it doesn’t grow, eat or breathe.' },
  { id: 'fish', name: 'fish', emoji: '🐟', grown: '🐟', living: true, why: 'A fish grows, eats and breathes in the water.' },
  { id: 'teddy', name: 'teddy', emoji: '🧸', living: false, why: 'A teddy looks like an animal, but it isn’t alive.' },
  { id: 'cloud', name: 'cloud', emoji: '☁️', living: false, why: 'A cloud changes shape, but it doesn’t eat, breathe or have babies.' },
];

/** The four "living" checks shown after the grow test. */
const CHECKS = [
  { emoji: '🌱', text: 'Grows' },
  { emoji: '💧', text: 'Eats and drinks' },
  { emoji: '💨', text: 'Breathes' },
  { emoji: '🐣', text: 'Has young' },
];

const LIVING = 'Living';
const NOT_LIVING = 'Not living';
const SHELF_Y = 92;
const MAT = { x: 60, y: 404, w: 380, h: 170 };
const BASKET_LIVING = { x: 500, y: 196, w: 220, h: 390 };
const BASKET_NOT = { x: 740, y: 196, w: 220, h: 390 };

type Where = 'shelf' | 'mat' | 'living' | 'not';

function Pic({ t, size, grown = false }: { t: Thing; size: number; grown?: boolean }) {
  if (t.emoji === 'rock') return <Obj kind="rock" size={size * 1.05} />;
  return <SceneEmoji emoji={grown && t.grown ? t.grown : t.emoji} x={0} y={0} size={size} />;
}

function LivingScene() {
  const [where, setWhere] = useState<Record<string, Where>>(() => Object.fromEntries(THINGS.map((t) => [t.id, 'shelf'])));
  const [drag, setDrag] = useState<{ id: string; p: Pt } | null>(null);
  const [message, setMessage] = useState('Sort them, or test one on the grow mat.');
  const [wobble, setWobble] = useState<string | null>(null);
  // Grow test
  const [guess, setGuess] = useState<string | null>(null);
  const [week, setWeek] = useState(0); // 0 = not started, 0..1 while waiting, 1 = done
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const onMat = THINGS.find((t) => where[t.id] === 'mat');

  const put = (id: string, w: Where) => setWhere((s) => ({ ...s, [id]: w }));

  const drop = (t: Thing, p: Pt) => {
    if (inside(p, MAT)) {
      if (onMat && onMat.id !== t.id) put(onMat.id, 'shelf');
      put(t.id, 'mat');
      setGuess(null);
      setWeek(0);
      play('pop');
      return;
    }
    const basket = inside(p, BASKET_LIVING) ? 'living' : inside(p, BASKET_NOT) ? 'not' : null;
    if (!basket) return;
    if ((basket === 'living') === t.living) {
      put(t.id, basket);
      if (where[t.id] === 'mat') setWeek(0);
      play('correct');
      setMessage(`Yes! ${t.why}`);
    } else {
      play('wrong');
      setWobble(t.id);
      window.setTimeout(() => setWobble((w) => (w === t.id ? null : w)), 500);
      setMessage(`Hmm. Does a ${t.name} grow, eat and breathe? Try the other basket.`);
    }
  };

  const waitAWeek = () => {
    window.clearInterval(timer.current);
    let k = 0;
    play('tap');
    timer.current = window.setInterval(() => {
      k += 1;
      setWeek(k / 10);
      if (k >= 10) {
        window.clearInterval(timer.current);
        play(onMat?.living ? 'correct' : 'pop');
      }
    }, 120);
  };

  const tryAnother = () => {
    if (onMat) put(onMat.id, 'shelf');
    setGuess(null);
    setWeek(0);
  };

  const reset = () => {
    window.clearInterval(timer.current);
    setWhere(Object.fromEntries(THINGS.map((t) => [t.id, 'shelf'])));
    setGuess(null);
    setWeek(0);
    setMessage('Sort them, or test one on the grow mat.');
  };

  const counts = { living: 0, not: 0 };
  const spot = (t: Thing, i: number): Pt => {
    const w = where[t.id];
    if (w === 'mat') return { x: MAT.x + 90, y: MAT.y + 92 };
    if (w === 'living' || w === 'not') {
      const b = w === 'living' ? BASKET_LIVING : BASKET_NOT;
      const k = counts[w]++;
      return { x: b.x + 60 + (k % 2) * 100, y: b.y + 90 + Math.floor(k / 2) * 76 };
    }
    return { x: 74 + i * 106, y: SHELF_Y };
  };

  const growing = onMat && onMat.living ? week : 0;

  return (
    <SceneSvg label="Living or not living: sort things, and test them on a grow mat">
      {/* Shelf */}
      <rect x={30} y={SHELF_Y + 34} width={940} height={12} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <text x={30} y={SHELF_Y - 50} fontSize={16} fill={C.muted} className="caps">
        Living or not?
      </text>
      <SvgButton x={830} y={12} w={140} h={44} fontSize={16} label="Start again" onClick={reset} />

      {/* Grow mat panel */}
      {!onMat ? (
        <MessageBox x={60} y={196} w={380} h={92} text="Drag something onto the grow mat to test it." max={32} size={17} />
      ) : week >= 1 ? (
        <ExplainCard x={60} y={196} w={380} prediction={guess} actual={onMat.living ? LIVING : NOT_LIVING} because={onMat.why} onAgain={tryAnother} />
      ) : (
        <PredictCard x={60} y={196} w={380} question={`Is the ${onMat.name} living?`} options={[LIVING, NOT_LIVING]} prediction={guess} onPredict={setGuess} />
      )}
      <rect x={MAT.x} y={MAT.y} width={MAT.w} height={MAT.h} rx={18} fill={shade(C.green, 0.75)} stroke={C.ink} strokeWidth={2.5} strokeDasharray={onMat ? undefined : '8 6'} />
      <text x={MAT.x + 90} y={MAT.y + 24} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(C.green, -0.35)}>
        Grow mat
      </text>
      {/* What we learned after a week */}
      {onMat && week >= 1 && (
        <g>
          {CHECKS.map((c, i) => {
            const yes = onMat.living;
            return (
              <g key={c.text} transform={`translate(${MAT.x + 190} ${MAT.y + 26 + i * 36})`}>
                <SceneEmoji emoji={c.emoji} x={0} y={0} size={22} />
                <text x={18} y={1} dominantBaseline="central" fontSize={15} fill={C.ink}>
                  {c.text}
                </text>
                <text x={170} y={1} dominantBaseline="central" textAnchor="middle" fontSize={20} fontWeight={700} fill={yes ? C.green : C.red}>
                  {yes ? '✓' : '✗'}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {onMat && week < 1 && (
        <SvgButton x={MAT.x} y={590} w={MAT.w} h={52} fontSize={18} label={week > 0 ? 'Waiting…' : 'Wait a week ▶'} onClick={waitAWeek} disabled={!guess || week > 0} color={C.teal} textColor={C.white} />
      )}
      {onMat && week > 0 && week < 1 && (
        <text x={MAT.x + 270} y={MAT.y + 92} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
          Day {Math.max(1, Math.ceil(week * 7))}
        </text>
      )}

      {/* Baskets */}
      {[
        { b: BASKET_LIVING, label: LIVING, color: C.green },
        { b: BASKET_NOT, label: NOT_LIVING, color: C.blue },
      ].map(({ b, label, color }) => (
        <g key={label}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={20} fill={shade(color, 0.82)} stroke={C.ink} strokeWidth={2.5} />
          <text x={b.x + b.w / 2} y={b.y + 32} textAnchor="middle" fontSize={21} fontWeight={700} fill={shade(color, -0.35)}>
            {label}
          </text>
        </g>
      ))}
      <MessageBox x={500} y={600} w={460} h={60} text={message} max={52} size={16} />

      {/* The things */}
      {THINGS.map((t, i) => {
        const at = spot(t, i);
        const scale = where[t.id] === 'mat' ? 1 + 0.6 * growing : where[t.id] === 'shelf' ? 1 : 0.85;
        return (
          <g key={t.id} className={wobble === t.id ? 'sl-nope' : undefined}>
            <DragToken at={at} r={46} label={t.name} dragging={drag?.id === t.id} onMove={(p) => setDrag({ id: t.id, p })} onDrop={(p) => { setDrag(null); drop(t, p); }}>
              <g transform={`scale(${scale})`}>
                <Pic t={t} size={58} grown={where[t.id] === 'mat' && week >= 0.5} />
              </g>
            </DragToken>
          </g>
        );
      })}
      {drag && (
        <g transform={`translate(${drag.p.x} ${drag.p.y})`} pointerEvents="none">
          <Pic t={THINGS.find((t) => t.id === drag.id)!} size={64} />
        </g>
      )}

      <Callout at={[BASKET_LIVING.x + 110, BASKET_LIVING.y]} box={[500, 140]} icon={HeartPulse} title="Grow, eat, breathe, have young" w={300} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={14} width={50} height={58} rx={8} fill={shade(C.green, 0.8)} stroke={C.ink} strokeWidth={2} />
      <rect x={64} y={14} width={50} height={58} rx={8} fill={shade(C.blue, 0.8)} stroke={C.ink} strokeWidth={2} />
      <text x={31} y={44} textAnchor="middle" dominantBaseline="central" fontSize={26} fontFamily={EMOJI_FONT}>
        🐱
      </text>
      <text x={89} y={44} textAnchor="middle" dominantBaseline="central" fontSize={26} fontFamily={EMOJI_FONT}>
        🚗
      </text>
    </svg>
  );
}

function picture(t: Thing, caption = true) {
  return t.emoji === 'rock' ? <ObjPicture kind="rock" caption={caption} /> : <EmojiPicture emoji={t.emoji} caption={caption ? t.name : undefined} />;
}

const YES_NO = [
  { value: 'yes', label: 'Yes', name: 'yes' },
  { value: 'no', label: 'No', name: 'no' },
];
const LIVING_THINGS = THINGS.filter((t) => t.living);
const NOT_THINGS = THINGS.filter((t) => !t.living);

function makeQuestion(level: number): Question {
  if (level === 0) {
    const t = pick(THINGS.filter((x) => x.id !== 'cloud'));
    return {
      prompt: `Is a ${t.name} living?`,
      visual: picture(t),
      choices: YES_NO,
      answer: t.living ? 'yes' : 'no',
      hint: 'Does it grow, eat and breathe?',
      explain: [t.why, t.living ? 'Living things grow, eat and breathe.' : 'Living things grow, eat and breathe. This doesn’t.', `So the answer is ${t.living ? 'yes' : 'no'}.`],
    };
  }
  if (level === 1) {
    const target = pick(LIVING_THINGS);
    const options = shuffle([target, ...shuffle(NOT_THINGS.filter((x) => x.id !== 'cloud')).slice(0, 2)]);
    return {
      prompt: 'Which one is living?',
      choices: options.map((t) => ({ value: t.id, name: t.name, label: picture(t) })),
      answer: target.id,
      hint: 'Look for the one that grows and needs food.',
      explain: [target.why, 'The others never grow, eat or breathe.', `So the ${target.name} is living.`],
    };
  }
  const kind = pick(['robot', 'seed', 'cloud', 'fire', 'all'] as const);
  if (kind === 'all') {
    return {
      prompt: 'What do ALL living things do?',
      choices: shuffle([
        { value: 'grow', label: '🌱 Grow', name: 'grow' },
        { value: 'wheels', label: '🚗 Roll on wheels', name: 'roll on wheels' },
        { value: 'glow', label: '💡 Glow', name: 'glow' },
      ]),
      answer: 'grow',
      hint: 'Think about a kitten, a seed and a chick. What do they all do?',
      explain: ['A kitten grows into a cat.', 'A seed grows into a plant, and a chick grows into a hen.', 'So all living things grow.'],
    };
  }
  if (kind === 'fire') {
    return {
      prompt: 'Fire can grow bigger. Is fire living?',
      visual: <EmojiPicture emoji="🔥" />,
      choices: YES_NO,
      answer: 'no',
      hint: 'Can fire eat food or have babies?',
      explain: ['Fire can get bigger, but it doesn’t eat food.', 'Fire can’t have babies or young.', 'So the answer is no: fire is not living.'],
    };
  }
  const t = THINGS.find((x) => x.id === kind)!;
  const prompt =
    kind === 'robot' ? 'A robot can move and talk. Is it living?' : kind === 'seed' ? 'A seed is small and still. Is it living?' : 'A cloud moves and changes shape. Is it living?';
  return {
    prompt,
    visual: picture(t),
    choices: YES_NO,
    answer: t.living ? 'yes' : 'no',
    hint: 'Moving isn’t enough. Does it grow, eat and breathe?',
    explain: [t.why, t.living ? 'That is what living things do.' : 'Living things grow, eat and breathe.', `So the answer is ${t.living ? 'yes' : 'no'}.`],
  };
}

export const livingOrNot: Lesson = {
  id: 'living-or-not',
  title: 'Living or Not?',
  Thumb,
  Scene: LivingScene,
  sceneHint: 'Drag things into the baskets · Or test one on the grow mat: guess, then wait a week',
  learn: {
    heading: 'Living or not?',
    intro: 'Living things grow, need food and water, breathe, and have young. A rock or a toy car never does any of these, so they are not living.',
    points: [
      { icon: Sprout, text: 'Living things grow and need food and water.' },
      { icon: HeartPulse, text: 'They breathe and have young.' },
      { icon: Search, text: 'Moving isn’t enough: a robot moves, but it isn’t alive.' },
    ],
  },
  steps: ['Pick a thing.', 'Ask: does it grow? Does it eat, drink and breathe?', 'Guess, then test it on the grow mat.', 'Put it in the Living or Not living basket.'],
  example: {
    question: 'Is a seed living?',
    visual: <EmojiPicture emoji="🌰" caption="seed" />,
    work: ['Plant it and give it water.', 'It grows into a little plant!'],
    answer: 'Yes, a seed is living.',
  },
  grownups: [
    'Go on a “living or not” walk: worms, leaves, stones, cars, birds, clouds.',
    'Plant a bean in a damp paper towel and watch it grow over a week.',
    'Tricky ones are great to talk about: a robot moves but isn’t alive; a seed looks still but is.',
    'Use the checklist: does it grow, need food and water, breathe, and have young?',
  ],
  makeQuestion,
};
