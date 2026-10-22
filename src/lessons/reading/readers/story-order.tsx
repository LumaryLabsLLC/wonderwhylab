import { useState } from 'react';
import { ArrowRight, ListOrdered, Signpost } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { wrap } from '../../../stage/Predict';
import { DragToken, inside } from './visuals/DragToken';
import { sample, textChoices } from './q';

interface Event {
  /** Signal word or phrase, e.g. "First," */
  signal: string;
  rest: string;
  /** A short version for practice questions. */
  short: string;
}

interface Story {
  title: string;
  events: Event[];
}

const STORIES: Story[] = [
  {
    title: 'Planting a Seed',
    events: [
      { signal: 'First,', rest: 'Mia dug a small hole in the garden.', short: 'Mia dug a hole' },
      { signal: 'Then', rest: 'she dropped a sunflower seed into it.', short: 'Mia dropped in a seed' },
      { signal: 'Next,', rest: 'she covered the seed with soil and watered it.', short: 'Mia watered the soil' },
      { signal: 'After a week,', rest: 'a tiny green sprout poked up.', short: 'A sprout poked up' },
      { signal: 'Finally,', rest: 'a big yellow flower opened.', short: 'A flower opened' },
    ],
  },
  {
    title: 'The Lost Kite',
    events: [
      { signal: 'First,', rest: 'Leo’s kite flew high in the wind.', short: 'The kite flew high' },
      { signal: 'Then', rest: 'the string snapped!', short: 'The string snapped' },
      { signal: 'Next,', rest: 'the kite got stuck in a tall tree.', short: 'The kite got stuck in a tree' },
      { signal: 'After that,', rest: 'Leo’s sister found a long pole.', short: 'Leo’s sister found a pole' },
      { signal: 'Finally,', rest: 'they gently poked the kite free together.', short: 'They got the kite down' },
    ],
  },
  {
    title: 'Pancake Morning',
    events: [
      { signal: 'First,', rest: 'Dad cracked two eggs into a bowl.', short: 'Dad cracked the eggs' },
      { signal: 'Then', rest: 'Ana mixed in flour and milk.', short: 'Ana mixed in flour and milk' },
      { signal: 'Next,', rest: 'they poured the batter into a hot pan.', short: 'They poured batter into the pan' },
      { signal: 'After that,', rest: 'Dad flipped each pancake.', short: 'Dad flipped the pancakes' },
      { signal: 'Finally,', rest: 'everyone ate pancakes with berries.', short: 'Everyone ate pancakes' },
    ],
  },
  {
    title: 'The Wet Puppy',
    events: [
      { signal: 'First,', rest: 'dark clouds filled the sky.', short: 'Dark clouds filled the sky' },
      { signal: 'Then', rest: 'rain began to pour.', short: 'Rain began to pour' },
      { signal: 'Next,', rest: 'Sam saw a wet puppy shivering by the gate.', short: 'Sam saw a wet puppy' },
      { signal: 'After that,', rest: 'he wrapped it in a warm towel.', short: 'Sam wrapped the puppy in a towel' },
      { signal: 'Finally,', rest: 'the puppy’s owner came and thanked him.', short: 'The owner thanked Sam' },
    ],
  },
  {
    title: 'Building a Snowman',
    events: [
      { signal: 'First,', rest: 'Kai rolled a big ball of snow.', short: 'Kai rolled a big snowball' },
      { signal: 'Then', rest: 'he rolled a smaller ball and lifted it on top.', short: 'Kai put a small ball on top' },
      { signal: 'Next,', rest: 'he pressed in two buttons for eyes.', short: 'Kai added button eyes' },
      { signal: 'Finally,', rest: 'he wrapped his own scarf around the snowman.', short: 'Kai gave it his scarf' },
    ],
  },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ───────────────────────── Scene ─────────────────────────

const CARD = { w: 172, h: 128 };
const FONT = 17;

function slotRect(i: number, n: number) {
  const gap = 18;
  const total = n * CARD.w + (n - 1) * gap;
  const x0 = 500 - total / 2;
  return { x: x0 + i * (CARD.w + gap), y: 130, w: CARD.w, h: CARD.h };
}

function pilePos(i: number, n: number) {
  const r = slotRect(i, n);
  return { x: r.x + CARD.w / 2, y: 420 + (i % 2) * 26, tilt: i % 2 ? 2.5 : -2.5 };
}

function StoryCard({ ev, clues, state }: { ev: Event; clues: boolean; state: 'idle' | 'selected' | 'right' }) {
  const text = clues ? `${ev.signal} ${ev.rest}` : cap(ev.rest);
  const lines = wrap(text, 17);
  const fillCol = state === 'right' ? shade(C.green, 0.78) : state === 'selected' ? shade(C.yellow, 0.7) : C.white;
  const signalWords = ev.signal.split(' ');
  return (
    <g>
      <rect x={-CARD.w / 2 + 3} y={-CARD.h / 2 + 5} width={CARD.w} height={CARD.h} rx={14} fill={C.ink} opacity={0.12} />
      <rect x={-CARD.w / 2} y={-CARD.h / 2} width={CARD.w} height={CARD.h} rx={14} fill={fillCol} stroke={state === 'selected' ? shade(C.orange, -0.2) : C.ink} strokeWidth={state === 'selected' ? 3.5 : 2.5} />
      {lines.map((line, i) => {
        let shown = 0;
        return (
          <text key={i} x={-CARD.w / 2 + 12} y={-CARD.h / 2 + 26 + i * FONT * 1.3} fontSize={FONT} fill={C.ink}>
            {line.split(' ').map((w, k) => {
              const isSignal = clues && i === 0 && shown < signalWords.length && w === signalWords[shown];
              if (isSignal) shown++;
              return (
                <tspan key={k} fill={isSignal ? shade(C.purple, -0.15) : undefined} fontWeight={isSignal ? 800 : undefined}>
                  {k ? ' ' : ''}
                  {w}
                </tspan>
              );
            })}
          </text>
        );
      })}
    </g>
  );
}

function StoryOrderScene() {
  const [order] = useState(() => shuffle(STORIES));
  const [index, setIndex] = useState(0);
  const story = order[index % order.length];
  const n = story.events.length;
  const [pile, setPile] = useState<number[]>(() => shuffle(story.events.map((_, i) => i)));
  const [slots, setSlots] = useState<(number | null)[]>(() => story.events.map(() => null));
  const [locked, setLocked] = useState<boolean[]>(() => story.events.map(() => false));
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<Record<number, number>>({});
  const [clues, setClues] = useState(true);
  const [message, setMessage] = useState('Read each card. Drag them onto the story line in order.');
  const solved = locked.every(Boolean);

  const load = (i: number) => {
    const s = order[i % order.length];
    setIndex(i);
    setPile(shuffle(s.events.map((_, k) => k)));
    setSlots(s.events.map(() => null));
    setLocked(s.events.map(() => false));
    setSelected(null);
    setMessage('Read each card. Drag them onto the story line in order.');
  };

  const placeIn = (ev: number, slot: number) => {
    if (locked[slot]) return;
    play('pop');
    const nextSlots = slots.map((s) => (s === ev ? null : s));
    const bumped = nextSlots[slot];
    nextSlots[slot] = ev;
    setSlots(nextSlots);
    setPile((p) => {
      const without = p.filter((x) => x !== ev);
      return bumped !== null && bumped !== undefined ? [...without, bumped] : without;
    });
    setSelected(null);
  };

  const dropAt = (ev: number, p: { x: number; y: number }) => {
    const slot = story.events.findIndex((_, i) => inside(p, slotRect(i, n)));
    if (slot >= 0) placeIn(ev, slot);
  };

  const check = () => {
    const right = slots.map((ev, i) => ev === i);
    const wrongIdx = slots.map((ev, i) => (ev !== null && ev !== i ? ev : null)).filter((x): x is number => x !== null);
    setLocked(right);
    if (right.every(Boolean)) {
      play('complete');
      setMessage('The whole story is in order. Great reading!');
      return;
    }
    play('wrong');
    setSlots(slots.map((ev, i) => (ev === i ? ev : null)));
    setPile((p) => [...p, ...wrongIdx]);
    const good = right.filter(Boolean).length;
    setShake(Object.fromEntries(wrongIdx.map((i) => [i, (shake[i] ?? 0) + 1])));
    setMessage(`${good} ${good === 1 ? 'card is' : 'cards are'} in the right place. For the rest, ask: what has to happen before this?`);
  };

  const placedCount = slots.filter((s) => s !== null).length;

  return (
    <SceneSvg label={`Story order: ${story.title}`}>
      <text x={46} y={60} fontSize={26} fontWeight={800} fill={C.ink}>
        {story.title}
      </text>
      <SvgButton
        x={610}
        y={28}
        w={190}
        h={48}
        fontSize={16}
        label={clues ? 'Clue words: on' : 'Clue words: off'}
        active={clues}
        color={clues ? shade(C.purple, 0.75) : C.card}
        onClick={() => setClues(!clues)}
      />
      <SvgButton x={812} y={28} w={150} h={48} fontSize={16} label="Read it" title="Hear the story in order" onClick={() => speak(story.events.map((e) => `${e.signal} ${e.rest}`).join(' '), { force: true })} />

      {story.events.map((_, i) => {
        const r = slotRect(i, n);
        const ev = slots[i];
        return (
          <g key={i}>
            <circle cx={r.x + r.w / 2} cy={r.y - 22} r={16} fill={locked[i] ? C.green : C.ink} />
            <text x={r.x + r.w / 2} y={r.y - 22} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.white}>
              {i + 1}
            </text>
            {i < n - 1 && <path d={`M${r.x + r.w + 3},${r.y - 22} l12,0 m-5,-5 l5,5 l-5,5`} stroke={C.muted} strokeWidth={2.5} fill="none" strokeLinecap="round" />}
            <g onClick={() => selected !== null && placeIn(selected, i)} style={{ cursor: selected !== null ? 'pointer' : undefined }} data-nopan={selected !== null ? true : undefined}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={14} fill={shade(C.blue, 0.9)} stroke={C.line} strokeWidth={2.5} strokeDasharray="8 6" />
            </g>
            {ev !== null && (
              <DragToken
                x={r.x + r.w / 2}
                y={r.y + r.h / 2}
                label={`Story card in place ${i + 1}: ${story.events[ev].rest}`}
                disabled={locked[i]}
                onTap={() => {
                  // Tap a placed card to send it back to the pile.
                  setSlots(slots.map((s, k) => (k === i ? null : s)));
                  setPile([...pile, ev]);
                }}
                onDrop={(p) => dropAt(ev, p)}
              >
                <StoryCard ev={story.events[ev]} clues={clues} state={locked[i] ? 'right' : 'idle'} />
              </DragToken>
            )}
          </g>
        );
      })}

      {pile.map((ev, i) => {
        const pos = pilePos(i, n);
        return (
          <g key={ev} transform={`rotate(${pos.tilt} ${pos.x} ${pos.y})`}>
            <DragToken
              x={pos.x}
              y={pos.y}
              label={`Story card: ${story.events[ev].rest}`}
              selected={selected === ev}
              shakeKey={shake[ev] ?? 0}
              onTap={() => {
                play('tap');
                setSelected(selected === ev ? null : ev);
              }}
              onDrop={(p) => dropAt(ev, p)}
            >
              <StoryCard ev={story.events[ev]} clues={clues} state={selected === ev ? 'selected' : 'idle'} />
            </DragToken>
          </g>
        );
      })}

      <text x={500} y={545} textAnchor="middle" fontSize={17} fill={C.ink2}>
        {message}
      </text>
      {solved ? (
        <SvgButton x={410} y={572} w={180} h={54} fontSize={18} label="Next story" color={C.teal} textColor={C.white} onClick={() => load(index + 1)} />
      ) : (
        <SvgButton x={410} y={572} w={180} h={54} fontSize={18} label="Check order" color={C.teal} textColor={C.white} disabled={placedCount < n} onClick={check} />
      )}

      <Callout at={[slotRect(0, n).x + 30, 210]} box={[46, 590]} w={250} icon={Signpost} title="Signal words" text="First, then, next, after that and finally tell you when things happen." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={6 + i * 38} y={22} width={32} height={40} rx={5} fill={i === 0 ? shade(C.green, 0.75) : C.white} stroke={C.ink} strokeWidth={2} />
          <circle cx={22 + i * 38} cy={14} r={7} fill={C.ink} />
          <text x={22 + i * 38} y={17} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.white}>{i + 1}</text>
          <line x1={11 + i * 38} y1={34} x2={33 + i * 38} y2={34} stroke={C.line} strokeWidth={3} />
          <line x1={11 + i * 38} y1={44} x2={29 + i * 38} y2={44} stroke={C.line} strokeWidth={3} />
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

function makeQuestion(level: number): Question {
  const story = pick(STORIES);
  const ev = story.events;
  if (level <= 0) {
    const later = sample(ev.slice(1), 2);
    const answer = ev[0].short;
    return {
      prompt: `In “${story.title}”, which happened first?`,
      choices: textChoices(
        answer,
        later.map((e) => e.short),
        3,
      ),
      answer,
      hint: 'Think: which of these has to happen before the others can happen?',
      explain: [
        `Picture the story “${story.title}” from the very start.`,
        `“${answer}” has to happen before “${later[0].short}” can happen.`,
        `So “${answer}” happened first.`,
      ],
    };
  }
  if (level === 1) {
    const i = Math.floor(Math.random() * (ev.length - 1));
    const answer = ev[i + 1].short;
    const others = ev.filter((_, k) => k !== i && k !== i + 1).map((e) => e.short);
    return {
      prompt: `In “${story.title}”, what happened right after this: “${ev[i].short}”?`,
      choices: textChoices(answer, others, 3),
      answer,
      hint: 'Play the story like a movie in your head. What is the very next thing?',
      explain: [`The story goes: “${ev[i].short}”…`, `…and the very next thing is “${answer}”.`, `So the answer is “${answer}”.`],
    };
  }
  const pos = 1 + Math.floor(Math.random() * (ev.length - 2));
  const answer = ev[pos].short;
  const word = ['first', 'second', 'third', 'fourth'][pos];
  return {
    prompt: `In “${story.title}”, which event came ${word}?`,
    choices: textChoices(
      answer,
      ev.filter((_, k) => k !== pos).map((e) => e.short),
    ),
    answer,
    hint: 'Put all the events in order in your head first, then count along.',
    explain: [
      ev
        .slice(0, pos + 1)
        .map((e, k) => `${k + 1}. ${e.short}`)
        .join('; ') + '.',
      `Count along the order to number ${pos + 1}.`,
      `The ${word} event is “${answer}”.`,
    ],
  };
}

export const storyOrder: Lesson = {
  id: 'story-order',
  title: 'Story Order',
  Thumb,
  Scene: StoryOrderScene,
  sceneHint: 'Drag the story cards onto the line in order · Check the order',
  learn: {
    heading: 'Putting a story in order',
    intro:
      'Stories happen in an order: a beginning, a middle and an end. Knowing the order helps you understand and retell what you read.',
    points: [
      { icon: ListOrdered, text: 'Ask: what has to happen before this can happen?' },
      { icon: Signpost, text: 'Signal words help: first, then, next, after that, finally.' },
      { icon: ArrowRight, text: 'Retell the story in order, using the signal words yourself.' },
    ],
  },
  steps: [
    'Read every card first.',
    'Find the beginning: what starts everything off?',
    'Find the ending: what happens last?',
    'Fill in the middle, then read the whole story to check it makes sense.',
  ],
  example: {
    question: 'Which comes first: “The string snapped” or “The kite flew high”?',
    work: ['A string can only snap after the kite is flying on it.', 'So the kite had to fly high first.'],
    answer: '“The kite flew high” comes first.',
  },
  grownups: [
    'Retelling in order is one of the best ways to check understanding. After a bedtime story, ask “what happened first? then?”',
    'Turn the clue words off to make it harder: your child must use the meaning of each event, not just the signal words.',
    'Ask “how do you know?”, because explaining why one event must come before another builds reasoning.',
  ],
  makeQuestion,
};
