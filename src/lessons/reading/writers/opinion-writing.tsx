import { useState } from 'react';
import { ListChecks, Megaphone, Scissors, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragChip, inRect } from './visuals/DragChip';
import type { Rect } from './visuals/DragChip';
import { Passage } from './visuals/Passage';
import './writers.css';

interface Topic {
  name: string;
  claim: string;
  reasons: [string, string];
  /** evidence[i] proves reasons[i]. */
  evidence: [string, string];
  /** A reason that doesn’t really support the claim. */
  weak: string;
  conclusion: string;
}

const TOPICS: Topic[] = [
  {
    name: 'a school garden',
    claim: 'Our school should have a garden.',
    reasons: ['A garden helps us learn about science.', 'Gardening gets us moving outdoors.'],
    evidence: ['We could watch seeds sprout and test what plants need to grow.', 'Digging, planting and watering are all active jobs.'],
    weak: 'Some gardens have a gate.',
    conclusion: 'That is why a school garden would be a great idea.',
  },
  {
    name: 'reading every day',
    claim: 'Kids should read every day.',
    reasons: ['Reading helps you learn new words.', 'Reading builds your imagination.'],
    evidence: ['Books use many words we rarely hear in everyday talk.', 'A story lets you picture places you have never visited.'],
    weak: 'Some books are very heavy.',
    conclusion: 'So a little reading every day goes a long way.',
  },
  {
    name: 'town libraries',
    claim: 'Every town needs a public library.',
    reasons: ['Libraries let everyone borrow books for free.', 'Libraries are places to learn together.'],
    evidence: ['Families can read new books without having to buy them.', 'Many libraries run story times, clubs and homework help.'],
    weak: 'Libraries have lots of chairs.',
    conclusion: 'For these reasons, every town should have a library.',
  },
  {
    name: 'getting to school',
    claim: 'More kids should walk or cycle to school.',
    reasons: ['Walking or cycling is good exercise.', 'It means fewer cars near the school.'],
    evidence: ['It gets your heart pumping before class even starts.', 'Fewer cars make the roads quieter and the air cleaner.'],
    weak: 'Bikes come in lots of sizes.',
    conclusion: 'That is why walking or cycling is a smart way to get to school.',
  },
];

const NOT_EVIDENCE = 'My friend thinks so too.';

// ───────────────────────── Scene ─────────────────────────

type Role = 'claim' | 'reason' | 'evidence' | 'conclusion' | 'weak';
interface Card {
  id: number;
  text: string;
  role: Role;
  /** Which reason a reason/evidence card belongs to. */
  pair?: number;
}

type SlotKind = Exclude<Role, 'weak'> | 'bin';
interface Slot extends Rect {
  kind: SlotKind;
  pair?: number;
  label: string;
  color: string;
}

const ROLE_COLOR: Record<SlotKind, string> = {
  claim: C.blue,
  reason: C.orange,
  evidence: C.green,
  conclusion: C.blue,
  bin: C.ink2,
};

const FX = 450;
const FW = 520;
const SLOTS: Slot[] = [
  { kind: 'claim', label: 'Claim: your opinion', x: FX, y: 86, w: FW, h: 60 },
  { kind: 'reason', pair: 0, label: 'Reason 1: why?', x: FX, y: 154, w: FW, h: 60 },
  { kind: 'evidence', pair: 0, label: 'Evidence that proves reason 1', x: FX + 36, y: 222, w: FW - 36, h: 60 },
  { kind: 'reason', pair: 1, label: 'Reason 2: why?', x: FX, y: 290, w: FW, h: 60 },
  { kind: 'evidence', pair: 1, label: 'Evidence that proves reason 2', x: FX + 36, y: 358, w: FW - 36, h: 60 },
  { kind: 'conclusion', label: 'Conclusion: say your claim again', x: FX, y: 426, w: FW, h: 60 },
  { kind: 'bin', label: 'Cut it: weak or off-topic', x: FX, y: 506, w: FW, h: 60 },
].map((s) => ({ ...s, kind: s.kind as SlotKind, color: ROLE_COLOR[s.kind as SlotKind] }));

function deal(t: Topic): Card[] {
  const cards: Omit<Card, 'id'>[] = [
    { text: t.claim, role: 'claim' },
    { text: t.reasons[0], role: 'reason', pair: 0 },
    { text: t.reasons[1], role: 'reason', pair: 1 },
    { text: t.evidence[0], role: 'evidence', pair: 0 },
    { text: t.evidence[1], role: 'evidence', pair: 1 },
    { text: t.conclusion, role: 'conclusion' },
    { text: t.weak, role: 'weak' },
  ];
  return shuffle(cards).map((c, id) => ({ ...c, id }));
}

const HOW: Record<Role, string> = {
  claim: 'This states the opinion, so it is the claim at the top.',
  reason: 'This explains why, so it is a reason.',
  evidence: 'This is a fact or example, so it is evidence. It goes under the reason it proves.',
  conclusion: 'This wraps up by saying the claim again, so it is the conclusion.',
  weak: 'This doesn’t explain why the claim is right, so cut it.',
};

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The finished plan, written out as a paragraph with linking words. */
function asParagraph(t: Topic, order: [number, number]) {
  const [a, b] = order;
  return [
    t.claim,
    `First, ${lower(t.reasons[a])}`,
    `For example, ${lower(t.evidence[a])}`,
    `Also, ${lower(t.reasons[b])}`,
    `For instance, ${lower(t.evidence[b])}`,
    t.conclusion,
  ].join(' ');
}

const LINKS = new Set(['First,', 'Also,', 'For', 'example,', 'instance,']);

function OpinionScene() {
  const [topicIndex, setTopicIndex] = useState(0);
  const topic = TOPICS[topicIndex % TOPICS.length];
  const [cards, setCards] = useState(() => deal(TOPICS[0]));
  /** Card id in each slot. */
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [show, setShow] = useState<Role | null>(null);
  const [note, setNote] = useState('Plan first: drag each card into the opinion plan. Or tap a card, then tap a box.');
  const used = new Set(Object.values(placed));
  const done = used.size === cards.length;
  const cardIn = (slot: number) => cards.find((c) => c.id === placed[slot]);

  const load = (i: number) => {
    const t = TOPICS[i % TOPICS.length];
    setTopicIndex(i);
    setCards(deal(t));
    setPlaced({});
    setSelected(null);
    setMisses({});
    setShow(null);
    setNote(`New topic: ${t.name}. Plan it out.`);
  };

  const fail = (card: Card, msg: string) => {
    play('wrong');
    setShake(card.id);
    window.setTimeout(() => setShake(null), 460);
    const m = (misses[card.id] ?? 0) + 1;
    setMisses({ ...misses, [card.id]: m });
    if (m >= 2) {
      setShow(card.role);
      setNote(`Here’s how: ${HOW[card.role]}`);
    } else setNote(`Not yet. ${msg}`);
  };

  const drop = (card: Card, slotIndex: number) => {
    const slot = SLOTS[slotIndex];
    if (placed[slotIndex] !== undefined) return;
    if (card.role === 'weak') {
      if (slot.kind !== 'bin') return fail(card, 'Does this card really explain WHY the claim is right?');
    } else if (slot.kind === 'bin') {
      return fail(card, 'This card helps your argument. Keep it in the plan.');
    } else if (slot.kind !== card.role) {
      const msg: Record<Role, string> = {
        claim: 'This card states the opinion. Where does an opinion piece start?',
        reason: 'This card explains why. Evidence is a fact or example that proves a reason.',
        evidence: 'This card is an example or fact. It goes under the reason it proves.',
        conclusion: 'This card sounds like a wrap-up. Where does a wrap-up go?',
        weak: '',
      };
      return fail(card, msg[card.role]);
    } else if (card.role === 'evidence') {
      const reasonSlot = SLOTS.findIndex((s) => s.kind === 'reason' && s.pair === slot.pair);
      const reason = cardIn(reasonSlot);
      if (!reason) return fail(card, 'Place a reason above first. Evidence has to prove a reason.');
      if (reason.pair !== card.pair) return fail(card, 'Read the reason above. Does this evidence prove THAT reason?');
    }
    play('pop');
    const next = { ...placed, [slotIndex]: card.id };
    setPlaced(next);
    setSelected(null);
    setShow(null);
    if (new Set(Object.values(next)).size === cards.length) {
      play('complete');
      setNote('Your plan is ready, and here it is as a paragraph. The linking words join the ideas together.');
    } else if (card.role === 'weak') setNote('Good revising! A weak reason makes an argument less convincing, so cut it.');
    else setNote(`Yes! ${HOW[card.role]}`);
  };

  const onDrop = (card: Card) => (c: Pt) => {
    const i = SLOTS.findIndex((s) => inRect(c, s));
    if (i >= 0) drop(card, i);
  };

  const glows = (s: Slot) => !!show && (show === 'weak' ? s.kind === 'bin' : s.kind === show);
  const order: [number, number] = cardIn(1)?.pair === 1 ? [1, 0] : [0, 1];
  const paragraph = done ? asParagraph(topic, order) : '';

  return (
    <SceneSvg label="Opinion writing: plan a claim, reasons, evidence and a conclusion">
      <text x={30} y={40} fontSize={19} fontWeight={700} fill={C.ink}>
        Plan → write → revise. Topic: {topic.name}
      </text>
      <text x={30} y={70} fontSize={15} fill={C.muted} className="caps">
        {done ? 'Your paragraph' : 'Plan cards'}
      </text>

      {SLOTS.map((s, i) => {
        const card = cardIn(i);
        const lines = card ? wrap(card.text, Math.floor((s.w - 28) / 8.4)) : [];
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
              rx={14}
              fill={card ? shade(s.color, s.kind === 'bin' ? 0.82 : 0.72) : shade(s.color, 0.9)}
              stroke={glows(s) ? C.orange : s.color}
              strokeWidth={glows(s) ? 4 : 2.5}
              strokeDasharray={card ? undefined : '8 6'}
            />
            {s.kind === 'evidence' && <path d={`M${FX + 18} ${s.y - 8} V${s.y + 30} H${s.x}`} fill="none" stroke={C.green} strokeWidth={2.5} />}
            {card ? (
              <g className="rw-glow">
                {lines.map((line, n) => (
                  <text
                    key={n}
                    x={s.x + 14}
                    y={s.y + s.h / 2 + (n - (lines.length - 1) / 2) * 19}
                    dominantBaseline="central"
                    fontSize={15}
                    fill={C.ink}
                    textDecoration={s.kind === 'bin' ? 'line-through' : undefined}
                  >
                    {line}
                  </text>
                ))}
              </g>
            ) : (
              <text x={s.x + s.w / 2} y={s.y + s.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={shade(s.color, -0.3)}>
                {s.label}
              </text>
            )}
          </g>
        );
      })}

      {done ? (
        <g>
          <rect x={30} y={86} width={400} height={wrap(paragraph, 36).length * 28 + 30} rx={18} fill={C.card} stroke={C.line} strokeWidth={2} />
          {wrap(paragraph, 36).map((line, n) => (
            <text key={n} x={46} y={120 + n * 28} fontSize={18} fill={C.ink}>
              {line.split(' ').map((w, k) => (
                <tspan key={k} fill={LINKS.has(w) ? shade(C.teal, -0.2) : undefined} fontWeight={LINKS.has(w) ? 800 : undefined}>
                  {k > 0 ? ' ' : ''}
                  {w}
                </tspan>
              ))}
            </text>
          ))}
          <SvgButton x={30} y={506} w={190} h={52} fontSize={17} label="Read it to me" onClick={() => speak(paragraph, { force: true })} />
          <SvgButton x={240} y={506} w={190} h={52} fontSize={17} label="Next topic" color={C.teal} textColor={C.white} onClick={() => load(topicIndex + 1)} />
        </g>
      ) : (
        cards.map((c, i) =>
          used.has(c.id) ? null : (
            <DragChip
              key={`${topicIndex}-${c.id}`}
              x={230}
              y={116 + i * 68}
              w={400}
              h={58}
              lines={wrap(c.text, 44)}
              label={c.text}
              fontSize={16}
              bold={false}
              selected={selected === c.id}
              shake={shake === c.id}
              onDrop={onDrop(c)}
              onTap={() => {
                play('tap');
                setSelected(selected === c.id ? null : c.id);
              }}
            />
          ),
        )
      )}

      {wrap(note, 100).map((line, i) => (
        <text key={i} x={500} y={606 + i * 23} textAnchor="middle" fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}

      <Callout at={[FX + FW - 20, 184]} box={[720, 6]} w={250} icon={Search} title="Reason vs evidence" text="A reason says why. Evidence is a fact or example that proves the reason." />
    </SceneSvg>
  );
}

function Thumb() {
  const rows = [
    { c: C.blue, x: 20, w: 80 },
    { c: C.orange, x: 20, w: 80 },
    { c: C.green, x: 32, w: 68 },
    { c: C.blue, x: 20, w: 80 },
  ];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={6 + i * 18} width={r.w} height={14} rx={4} fill={shade(r.c, 0.7)} stroke={r.c} strokeWidth={1.5} />
          <line x1={r.x + 6} x2={r.x + r.w - 14} y1={13 + i * 18} y2={13 + i * 18} stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

function makeQuestion(level: number): Question {
  const t = pick(TOPICS);
  if (level <= 0) {
    return {
      prompt: 'Which sentence is the claim (the writer’s opinion)?',
      visual: <Passage text={`Topic: *${t.name}*`} />,
      choices: shuffle([t.claim, ...t.evidence]).map((value) => ({ value })),
      answer: t.claim,
      hint: 'The claim says what the writer thinks. The other sentences are examples that back it up.',
      explain: ['The other two sentences give facts or examples.', 'The claim states the opinion the whole piece argues for.', `The claim is: ${t.claim}`],
    };
  }
  if (level === 1) {
    const i = Math.random() < 0.5 ? 0 : 1;
    const other = pick(TOPICS.filter((o) => o !== t)).reasons[0];
    return {
      prompt: 'Which is the strongest reason for this claim?',
      visual: <Passage text={t.claim} />,
      choices: shuffle([t.reasons[i], t.weak, other]).map((value) => ({ value })),
      answer: t.reasons[i],
      hint: 'A strong reason is on topic and explains WHY the claim is a good idea.',
      explain: [`“${t.weak}” doesn’t explain why.`, `“${other}” is about a different topic.`, `The strongest reason is: ${t.reasons[i]}`],
    };
  }
  const i = Math.random() < 0.5 ? 0 : 1;
  const j = 1 - i;
  return {
    prompt: 'Which evidence best supports this reason?',
    visual: <Passage text={`${t.claim} *${t.reasons[i]}*`} />,
    choices: shuffle([t.evidence[i], t.evidence[j], NOT_EVIDENCE]).map((value) => ({ value })),
    answer: t.evidence[i],
    hint: 'Good evidence is a fact or example that proves THIS reason, not a different one.',
    explain: [
      `The reason is: ${t.reasons[i]}`,
      `“${t.evidence[j]}” proves a different reason, and “${NOT_EVIDENCE}” is just another opinion.`,
      `The best evidence is: ${t.evidence[i]}`,
    ],
  };
}

export const opinionWriting: Lesson = {
  id: 'opinion-writing',
  title: 'Opinion Writing',
  Thumb,
  Scene: OpinionScene,
  sceneHint: 'Drag each card into the plan · Cut the weak reason',
  learn: {
    heading: 'Opinion writing',
    intro:
      'In opinion writing you tell readers what you think and win them over with reasons and evidence. Strong writers plan first, then write, then revise.',
    points: [
      { icon: Megaphone, text: 'Claim: state your opinion clearly at the start.' },
      { icon: ListChecks, text: 'Reasons: explain why you think it.' },
      { icon: Search, text: 'Evidence: give a fact or example that proves each reason.' },
      { icon: Scissors, text: 'Revise: cut weak or off-topic reasons, and end by restating your claim.' },
    ],
  },
  steps: [
    'Plan: put your claim at the top.',
    'Choose two strong reasons that explain why.',
    'Under each reason, add evidence: a fact or example that proves it.',
    'Finish with a conclusion that says your claim again in new words.',
    'Revise: cut anything weak, and add linking words like First, Also and For example.',
  ],
  example: {
    question: 'Claim: “Kids should read every day.” Which is better evidence for “Reading helps you learn new words”?',
    work: [
      '“Books use many words we rarely hear in everyday talk” is a fact that proves the reason.',
      '“My friend thinks so too” is just another opinion, so it is not evidence.',
    ],
    answer: 'Books use many words we rarely hear in everyday talk.',
  },
  grownups: [
    'Ask your child to convince you of something (a later bedtime?) with two reasons and evidence for each.',
    'Help your child tell reasons (why) from evidence (proof). Evidence can be a fact, an example or an expert’s words.',
    'Good writers revise. Praise your child for cutting a weak reason, not just for adding more.',
  ],
  makeQuestion,
};
