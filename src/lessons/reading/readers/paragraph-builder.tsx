import { useState } from 'react';
import { ArrowDownToLine, ArrowUpToLine, Layers, Target } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken, inside } from './visuals/DragToken';
import { ParagraphPicture, SentenceCard, SentencePicture, sentenceHeight, sentenceLines } from './visuals/Cards';

type Role = 'topic' | 'detail' | 'closing' | 'stray';

interface ParagraphSet {
  subject: string;
  topic: string;
  details: [string, string, string];
  closing: string;
  /** A sentence that is not about the big idea. */
  stray: string;
  /** On topic, but starts a new idea: not a closing sentence. */
  newIdea: string;
}

const PARAGRAPHS: ParagraphSet[] = [
  {
    subject: 'frogs',
    topic: 'Frogs are amazing jumpers.',
    details: ['Their long back legs work like springs.', 'Some frogs can jump many times their body length.', 'Frogs leap to catch insects and escape danger.'],
    closing: 'Jumping really is a frog’s super skill.',
    stray: 'Ducks paddle around the pond all day.',
    newIdea: 'Frogs also have very sticky tongues.',
  },
  {
    subject: 'recycling',
    topic: 'Recycling helps our planet in many ways.',
    details: ['Old paper can be made into new paper.', 'Recycling cans saves a lot of energy.', 'Less waste gets buried in the ground.'],
    closing: 'That is why recycling is worth doing every day.',
    stray: 'Our school has a big football field.',
    newIdea: 'Glass bottles can be green or brown.',
  },
  {
    subject: 'sleep',
    topic: 'Sleep helps your body and brain grow strong.',
    details: ['While you sleep, your body repairs itself.', 'Your brain sorts out what you learned that day.', 'Children need about 9 to 12 hours of sleep a night.'],
    closing: 'A good night’s sleep is a great way to look after yourself.',
    stray: 'Some people eat pizza on Fridays.',
    newIdea: 'Some animals can sleep standing up.',
  },
  {
    subject: 'owls',
    topic: 'Owls are built for hunting at night.',
    details: ['Their huge eyes help them see in dim light.', 'Soft feathers let them fly almost silently.', 'Sharp hearing helps them find mice in the dark.'],
    closing: 'These skills make owls super night hunters.',
    stray: 'Robins sing loudly in the morning.',
    newIdea: 'Some owls live in hot, dry deserts.',
  },
  {
    subject: 'our school garden',
    topic: 'Our school garden is a busy place.',
    details: ['Every class grows its own vegetables.', 'Bees visit the flowers to collect nectar.', 'On Fridays we water the plants together.'],
    closing: 'There is always something happening in our garden.',
    stray: 'The school bus is bright yellow.',
    newIdea: 'Carrots grow under the soil.',
  },
];

const ROLE_NAME: Record<Role, string> = {
  topic: 'topic sentence',
  detail: 'detail sentence',
  closing: 'closing sentence',
  stray: 'sentence that doesn’t belong',
};

const ROLE_WHY: Record<Role, string> = {
  topic: 'It names the big idea, so it goes on top.',
  detail: 'It is one fact that supports the big idea, so it goes in the middle.',
  closing: 'It wraps up the big idea, so it goes at the bottom.',
  stray: 'It is not about the big idea, so it goes in the bin.',
};

// ───────────────────────── Scene ─────────────────────────

interface Card {
  id: number;
  text: string;
  role: Role;
}

type SlotKind = Exclude<Role, 'stray'> | 'bin';
interface Slot {
  kind: SlotKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fill: string;
}

const PILE_X = 30;
const PILE_W = 420;
const CARD_FS = 17;
const SLOT_X = 470;
const SLOT_W = 500;

const SLOTS: Slot[] = [
  { kind: 'topic', label: 'Topic sentence (top bun)', fill: shade(C.wood, 0.25) },
  { kind: 'detail', label: 'Detail', fill: shade(C.green, 0.6) },
  { kind: 'detail', label: 'Detail', fill: shade(C.red, 0.62) },
  { kind: 'detail', label: 'Detail', fill: shade(C.yellow, 0.55) },
  { kind: 'closing', label: 'Closing sentence (bottom bun)', fill: shade(C.wood, 0.25) },
].map((s, i) => ({ ...s, kind: s.kind as SlotKind, x: SLOT_X, y: 96 + i * 86, w: SLOT_W, h: 80 }));
const BIN: Slot = { kind: 'bin', label: 'Doesn’t belong', x: SLOT_X, y: 532, w: SLOT_W, h: 76, fill: shade(C.ink2, 0.88) };
const ALL_SLOTS = [...SLOTS, BIN];

function deal(set: ParagraphSet): Card[] {
  const cards: Omit<Card, 'id'>[] = [
    { text: set.topic, role: 'topic' },
    ...set.details.map((text) => ({ text, role: 'detail' as Role })),
    { text: set.closing, role: 'closing' },
    { text: set.stray, role: 'stray' },
  ];
  return shuffle(cards).map((c, id) => ({ ...c, id }));
}

const fits = (card: Card, slot: Slot) => (card.role === 'stray' ? slot.kind === 'bin' : slot.kind === card.role);

function nudge(card: Card, slot: Slot, subject: string) {
  if (card.role === 'stray') return `Not yet. Is this sentence really about ${subject}?`;
  if (slot.kind === 'bin') return `This one is about ${subject}, so it belongs in the paragraph.`;
  if (card.role === 'topic') return 'Not yet. This sentence names the big idea. Where does a paragraph start?';
  if (card.role === 'detail') return 'Not yet. This is one small fact. Facts go in the middle of the burger.';
  return 'Not yet. This sentence sounds like an ending. Where does an ending go?';
}

function ParagraphScene() {
  const [setIndex, setSetIndex] = useState(0);
  const set = PARAGRAPHS[setIndex % PARAGRAPHS.length];
  const [cards, setCards] = useState(() => deal(PARAGRAPHS[0]));
  /** Which card sits in each slot (index into ALL_SLOTS). */
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<Record<number, number>>({});
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [show, setShow] = useState<Role | null>(null);
  const [message, setMessage] = useState('Drag each sentence card into the paragraph burger. Or tap a card, then tap a place.');
  const used = new Set(Object.values(placed));
  const done = used.size === cards.length;
  const paragraph = [set.topic, ...SLOTS.slice(1, 4).map((_, i) => cards.find((c) => c.id === placed[i + 1])?.text ?? ''), set.closing].join(' ');

  const load = (i: number) => {
    const next = PARAGRAPHS[i % PARAGRAPHS.length];
    setSetIndex(i);
    setCards(deal(next));
    setPlaced({});
    setSelected(null);
    setMisses({});
    setShow(null);
    setMessage(`New topic: ${next.subject}. Build the paragraph burger.`);
  };

  const drop = (card: Card, slotIndex: number) => {
    let target = slotIndex;
    const slot = ALL_SLOTS[slotIndex];
    // A detail dropped on a full detail slot slides into the next free one.
    if (slot.kind === 'detail' && placed[target] !== undefined && card.role === 'detail') {
      target = SLOTS.findIndex((s, i) => s.kind === 'detail' && placed[i] === undefined);
      if (target < 0) return;
    } else if (placed[target] !== undefined) return;
    if (fits(card, ALL_SLOTS[target])) {
      play('pop');
      const next = { ...placed, [target]: card.id };
      setPlaced(next);
      setSelected(null);
      setShow(null);
      if (new Set(Object.values(next)).size === cards.length) {
        play('complete');
        setMessage('You built a paragraph! Every sentence sticks to the big idea. Tap “Read it to me” to hear it.');
      } else if (card.role === 'stray') setMessage(`Good catch! That sentence is not about ${set.subject}.`);
      else setMessage(`Yes, the ${ROLE_NAME[card.role]}. ${ROLE_WHY[card.role]}`);
    } else {
      play('wrong');
      const m = (misses[card.id] ?? 0) + 1;
      setMisses({ ...misses, [card.id]: m });
      setShake({ ...shake, [card.id]: (shake[card.id] ?? 0) + 1 });
      if (m >= 2) {
        setShow(card.role);
        setMessage(`Here’s how: this is the ${ROLE_NAME[card.role]}. ${ROLE_WHY[card.role]}`);
      } else setMessage(nudge(card, slot, set.subject));
    }
  };

  const slotAt = (p: { x: number; y: number }) => ALL_SLOTS.findIndex((s) => inside(p, s));
  const glows = (s: Slot) => !!show && (show === 'stray' ? s.kind === 'bin' : s.kind === show);

  return (
    <SceneSvg label="Build a paragraph: drag sentence cards into the paragraph burger">
      <text x={PILE_X} y={76} fontSize={15} fill={C.muted} className="caps">
        Sentence cards · {set.subject}
      </text>
      <text x={SLOT_X} y={76} fontSize={15} fill={C.muted} className="caps">
        Paragraph burger
      </text>

      {ALL_SLOTS.map((s, i) => {
        const card = cards.find((c) => c.id === placed[i]);
        const h = card ? sentenceHeight(sentenceLines(card.text, s.w - 12, CARD_FS), CARD_FS) : 0;
        return (
          <g
            key={i}
            onClick={() => {
              const c = cards.find((k) => k.id === selected);
              if (c) drop(c, i);
            }}
            style={{ cursor: selected !== null ? 'pointer' : undefined }}
            data-nopan={selected !== null ? true : undefined}
          >
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={s.kind === 'topic' ? 34 : s.kind === 'closing' ? 20 : 14}
              fill={s.fill}
              stroke={glows(s) ? shade(C.orange, -0.2) : C.ink2}
              strokeWidth={glows(s) ? 4 : 2}
              strokeDasharray={card || s.kind !== 'bin' ? undefined : '8 6'}
            />
            {card ? (
              <g transform={`translate(${s.x + 6} ${s.y + (s.h - h) / 2})`}>
                <g className="pop-in">
                  <SentenceCard w={s.w - 12} text={card.text} fontSize={CARD_FS} state={card.role === 'stray' ? 'idle' : 'right'} fill={card.role === 'stray' ? shade(C.ink2, 0.8) : undefined} />
                </g>
              </g>
            ) : (
              <text x={s.x + s.w / 2} y={s.y + s.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={600} fill={C.ink2}>
                {s.label}
              </text>
            )}
          </g>
        );
      })}

      {cards.map((c, i) => {
        if (used.has(c.id)) return null;
        return (
          <DragToken
            key={`${setIndex}-${c.id}`}
            x={PILE_X}
            y={96 + i * 82}
            label={c.text}
            selected={selected === c.id}
            shakeKey={shake[c.id] ?? 0}
            onTap={() => {
              play('tap');
              setSelected(selected === c.id ? null : c.id);
            }}
            onDrop={(p) => {
              const hit = slotAt(p);
              if (hit >= 0) drop(c, hit);
            }}
          >
            <SentenceCard w={PILE_W} text={c.text} fontSize={CARD_FS} state={selected === c.id ? 'selected' : 'idle'} />
          </DragToken>
        );
      })}

      {done && (
        <g>
          <SvgButton x={115} y={230} w={250} h={56} fontSize={19} label="Read it to me" onClick={() => speak(paragraph, { force: true })} />
          <SvgButton x={115} y={310} w={250} h={56} fontSize={19} label="Next topic" color={C.teal} textColor={C.white} onClick={() => load(setIndex + 1)} />
        </g>
      )}

      {wrap(message, 104).map((line, i) => (
        <text key={i} x={500} y={636 + i * 24} textAnchor="middle" fontSize={17} fill={C.ink2}>
          {line}
        </text>
      ))}

      <Callout at={[SLOT_X + SLOT_W - 24, 120]} box={[720, 12]} w={250} icon={ArrowUpToLine} title="Topic sentence" text="The top bun: it tells the reader the big idea of the whole paragraph. Details are the fillings." />
    </SceneSvg>
  );
}

function Thumb() {
  const layers = [shade(C.wood, 0.1), shade(C.green, 0.45), shade(C.red, 0.45), shade(C.yellow, 0.4), shade(C.wood, 0.1)];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {layers.map((f, i) => (
        <g key={i}>
          <rect x={22} y={8 + i * 13.5} width={76} height={11} rx={i === 0 ? 6 : i === 4 ? 4 : 2} fill={f} stroke={C.ink} strokeWidth={1.2} />
          <line x1={30} x2={i === 0 || i === 4 ? 80 : 88} y1={13.5 + i * 13.5} y2={13.5 + i * 13.5} stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

function makeQuestion(level: number): Question {
  const set = pick(PARAGRAPHS);
  if (level <= 0) {
    return {
      prompt: 'Which is the best topic sentence for these details?',
      visual: <ParagraphPicture text={`… ${set.details[0]} ${set.details[1]}`} />,
      choices: shuffle([set.topic, set.details[2], set.stray]).map((value) => ({ value })),
      answer: set.topic,
      hint: 'A topic sentence tells the big idea that all the details are about.',
      explain: [`The details are all about ${set.subject}.`, `“${set.details[2]}” is just one more fact.`, `The topic sentence names the big idea: ${set.topic}`],
    };
  }
  if (level === 1) {
    return {
      prompt: 'Which sentence does NOT belong in this paragraph?',
      speak: `The paragraph starts: ${set.topic} Which sentence does not belong?`,
      visual: <SentencePicture text={set.topic} />,
      choices: shuffle([set.stray, ...set.details]).map((value) => ({ value })),
      answer: set.stray,
      hint: 'Read the topic sentence. Which card is not about that big idea?',
      explain: [`The big idea is: ${set.topic}`, `Three sentences give facts about ${set.subject}.`, `“${set.stray}” is about something else, so it does not belong.`],
    };
  }
  const weak = `That is all about ${set.subject}.`;
  return {
    prompt: 'Which is the best closing sentence?',
    visual: <ParagraphPicture text={`${set.topic} ${set.details.join(' ')}`} />,
    choices: shuffle([set.closing, set.newIdea, weak]).map((value) => ({ value })),
    answer: set.closing,
    hint: 'A good closing wraps up the big idea in new words. It does not start a new fact.',
    explain: [
      `“${set.newIdea}” starts a new fact, so it is not an ending.`,
      `“${weak}” just stops, without wrapping up the idea.`,
      `The best closing is: ${set.closing}`,
    ],
  };
}

export const paragraphBuilder: Lesson = {
  id: 'paragraph-builder',
  title: 'Build a Paragraph',
  Thumb,
  Scene: ParagraphScene,
  sceneHint: 'Drag each card into the paragraph burger · Put the odd one in the bin',
  learn: {
    heading: 'Build a paragraph',
    intro:
      'A paragraph is a group of sentences about one big idea. Think of a burger: the buns hold everything together and the fillings are the tasty facts.',
    points: [
      { icon: ArrowUpToLine, text: 'Top bun: the topic sentence tells the big idea.' },
      { icon: Layers, text: 'Fillings: detail sentences give facts and examples.' },
      { icon: ArrowDownToLine, text: 'Bottom bun: the closing sentence wraps it up.' },
      { icon: Target, text: 'Every sentence sticks to the big idea. If it doesn’t, leave it out.' },
    ],
  },
  steps: [
    'Read all the sentence cards first.',
    'Find the sentence that tells the big idea. That is the topic sentence, on top.',
    'Find the facts that support it. Those are the details, in the middle.',
    'Find the sentence that wraps it up. That is the closing, at the bottom.',
    'Any sentence that is not about the big idea goes in the bin.',
  ],
  example: {
    question: 'Which sentence does not belong? “Owls are built for hunting at night. Their huge eyes help them see in dim light. Robins sing loudly in the morning.”',
    work: ['The big idea is how owls hunt at night.', 'Huge eyes help owls hunt, so that sentence belongs.', 'Robins singing is not about owls hunting.'],
    answer: 'Robins sing loudly in the morning.',
  },
  grownups: [
    'The burger is a scaffold. Real paragraphs vary, but this shape helps children plan before they write.',
    'Ask your child to say the paragraph out loud before writing it down. Talking it through is planning.',
    'When your child picks a sentence, ask “How do you know it belongs?” Explaining builds understanding.',
  ],
  makeQuestion,
};
