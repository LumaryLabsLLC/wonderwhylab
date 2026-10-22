import { useState } from 'react';
import { MapPin, UserRound, Zap } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { mcq, level3 } from '../sounds/q';
import { Note } from '../sounds/visuals/Pictures';
import { DragTile, Emoji, TileFace } from './visuals/Tiles';

type Part = 'who' | 'does' | 'where';

interface Plan {
  who: string;
  does: string;
  where: string;
  /** Does the last part tell where or when? */
  whenNotWhere?: boolean;
  subject: string;
  /** What the place looks like. */
  place: 'mud' | 'log' | 'pond' | 'bed' | 'grass' | 'night' | 'rock' | 'bath' | 'hill';
  /** Doing words that clearly don't match the picture. */
  notDoing: string[];
}

/** Decodable sentences (short vowels, blends, digraphs and a few heart words). */
const PLANS: Plan[] = [
  { who: 'The dog', does: 'digs', where: 'in the mud', subject: '🐶', place: 'mud', notDoing: ['swims', 'flaps'] },
  { who: 'A frog', does: 'hops', where: 'on a log', subject: '🐸', place: 'log', notDoing: ['naps', 'pecks'] },
  { who: 'The fish', does: 'swims', where: 'in the pond', subject: '🐟', place: 'pond', notDoing: ['digs', 'hops'] },
  { who: 'The cat', does: 'naps', where: 'on the bed', subject: '🐱', place: 'bed', notDoing: ['swims', 'pecks'] },
  { who: 'The hen', does: 'pecks', where: 'in the grass', subject: '🐔', place: 'grass', notDoing: ['swims', 'sings'] },
  { who: 'The bat', does: 'flaps', where: 'at night', whenNotWhere: true, subject: '🦇', place: 'night', notDoing: ['digs', 'naps'] },
  { who: 'A bug', does: 'sits', where: 'on a rock', subject: '🐛', place: 'rock', notDoing: ['swims', 'sings'] },
  { who: 'Dad', does: 'sings', where: 'in the bath', subject: '👨', place: 'bath', notDoing: ['flaps', 'pecks'] },
  { who: 'The fox', does: 'runs', where: 'up the hill', subject: '🦊', place: 'hill', notDoing: ['swims', 'flaps'] },
];

const sentenceOf = (p: Plan) => `${p.who} ${p.does} ${p.where}.`;
const PART_NAME: Record<Part, string> = { who: 'Who?', does: 'Does what?', where: 'Where or when?' };
const PART_COLOR: Record<Part, string> = { who: C.blue, does: C.red, where: C.green };

/** The picture for a plan: a simple place with the subject in it. */
function PlanPicture({ plan, x, y, w, h }: { plan: Plan; x: number; y: number; w: number; h: number }) {
  const cx = x + w / 2;
  const ground = y + h - 44;
  const night = plan.place === 'night';
  return (
    <g>
      <clipPath id={`was-clip-${x}-${y}`}>
        <rect x={x} y={y} width={w} height={h} rx={18} />
      </clipPath>
      <g clipPath={`url(#was-clip-${x}-${y})`}>
        <rect x={x} y={y} width={w} height={h} fill={night ? '#2c3554' : shade(C.blue, 0.75)} />
        {plan.place === 'hill' ? (
          <ellipse cx={cx + 40} cy={ground + 80} rx={w * 0.55} ry={120} fill={shade(C.green, 0.4)} />
        ) : (
          <rect x={x} y={ground} width={w} height={44} fill={night ? '#3d4a6b' : shade(C.green, 0.45)} />
        )}
        {plan.place === 'mud' && <ellipse cx={cx} cy={ground + 10} rx={110} ry={26} fill={shade(C.wood, -0.25)} />}
        {plan.place === 'pond' && <ellipse cx={cx} cy={ground - 6} rx={140} ry={44} fill={C.blue} opacity={0.75} />}
        {plan.place === 'grass' && Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${x + 20 + i * 26} ${ground + 4} l6 -22 l6 22`} fill={C.green} />)}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={18} fill="none" stroke={C.ink} strokeWidth={2.5} />
      {plan.place === 'log' && <Emoji x={cx} y={ground - 2} char="🪵" size={70} />}
      {plan.place === 'bed' && <Emoji x={cx} y={ground - 20} char="🛏️" size={96} />}
      {plan.place === 'rock' && <Emoji x={cx} y={ground - 6} char="🪨" size={74} />}
      {plan.place === 'bath' && <Emoji x={cx} y={ground - 20} char="🛁" size={96} />}
      {night && <Emoji x={x + w - 50} y={y + 40} char="🌙" size={44} />}
      <Emoji
        x={plan.place === 'hill' ? cx - 20 : cx}
        y={plan.place === 'pond' ? ground - 10 : plan.place === 'night' ? y + h / 2 - 4 : plan.place === 'bed' || plan.place === 'bath' ? ground - 52 : plan.place === 'hill' ? ground - 50 : ground - 42}
        char={plan.subject}
        size={plan.place === 'pond' ? 54 : 64}
      />
      {plan.place === 'bath' && <Emoji x={cx + 54} y={y + 36} char="🎵" size={30} />}
    </g>
  );
}

interface Card {
  id: number;
  text: string;
  part: Part;
  right: boolean;
}

function dealCards(plan: Plan): Card[] {
  const others = PLANS.filter((p) => p !== plan);
  const who = pick(others.filter((p) => p.who.split(' ').pop() !== plan.who.split(' ').pop())).who;
  const where = pick(others.filter((p) => p.where !== plan.where)).where;
  const cards: Omit<Card, 'id'>[] = [
    { text: plan.who, part: 'who', right: true },
    { text: plan.does, part: 'does', right: true },
    { text: plan.where, part: 'where', right: true },
    { text: who, part: 'who', right: false },
    { text: pick(plan.notDoing), part: 'does', right: false },
    { text: where, part: 'where', right: false },
  ];
  return shuffle(cards).map((c, id) => ({ ...c, id }));
}

const PARTS: Part[] = ['who', 'does', 'where'];
const SLOT_W: Record<Part, number> = { who: 210, does: 180, where: 250 };
const SLOT_Y = 250;
const SLOT_H = 76;
const slotLeft = (i: number) => 110 + PARTS.slice(0, i).reduce((a, p) => a + SLOT_W[p] + 24, 0);
const cardPos = (k: number) => ({ x: 200 + (k % 3) * 300, y: 430 + Math.floor(k / 3) * 88 });

function BuildScene() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PLANS.length));
  const plan = PLANS[index];
  const [cards, setCards] = useState<Card[]>(() => dealCards(plan));
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null]);
  const [shake, setShake] = useState({ id: -1, key: 0 });
  const [misses, setMisses] = useState(0);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const done = slots.every((s) => s !== null);

  const fresh = (i: number) => {
    setIndex(i);
    setCards(dealCards(PLANS[i]));
    setSlots([null, null, null]);
    setMisses(0);
    setMsg(null);
    play('pop');
  };

  const put = (card: Card, slot: number) => {
    if (done || slots[slot] !== null) return;
    const part = PARTS[slot];
    const nope = (text: string) => {
      play('wrong');
      setShake((s) => ({ id: card.id, key: s.key + 1 }));
      setMisses((m) => m + 1);
      setMsg({ text, tone: 'try' });
    };
    if (card.part !== part) {
      nope(`“${card.text}” tells ${card.part === 'who' ? 'who' : card.part === 'does' ? 'what someone does' : 'where or when'}. This box needs a card that tells ${part === 'who' ? 'who' : part === 'does' ? 'what they do' : 'where or when'}.`);
      return;
    }
    if (!card.right) {
      nope(
        part === 'who'
          ? `Look at the picture. Is it “${card.text}”? Not yet!`
          : part === 'does'
            ? `Look at the picture again. Is “${card.text}” what is happening? Not yet!`
            : `Look where it is in the picture. Is it “${card.text}”? Not yet!`,
      );
      return;
    }
    const next = slots.map((s, k) => (k === slot ? card.id : s));
    setSlots(next);
    if (next.every((s) => s !== null)) {
      play('correct');
      setMsg({ text: `You wrote a sentence: “${sentenceOf(plan)}” It starts with a capital letter and ends with a full stop.`, tone: 'good' });
    } else {
      play('pop');
      setMsg(null);
    }
  };

  const tapCard = (card: Card) => {
    const slot = slots.findIndex((s) => s === null);
    if (slot >= 0) put(card, slot);
  };
  const dropCard = (card: Card, p: Pt) => {
    if (Math.abs(p.y - (SLOT_Y + SLOT_H / 2)) > 70) return;
    const slot = PARTS.findIndex((part, i) => p.x >= slotLeft(i) - 20 && p.x <= slotLeft(i) + SLOT_W[part] + 20);
    if (slot >= 0) put(card, slot);
  };
  const takeOut = (slot: number) => {
    if (done) return;
    setSlots((s) => s.map((v, k) => (k === slot ? null : v)));
  };

  const stopX = slotLeft(2) + SLOT_W.where + 10;

  return (
    <SceneSvg label={`Build a sentence about the picture: ${sentenceOf(plan)}`}>
      <text x={40} y={60} fontSize={22} fontWeight={700} fill={C.ink}>
        Write a sentence
      </text>
      <text x={40} y={90} fontSize={17} fill={C.ink2}>
        about the picture.
      </text>
      <text x={40} y={128} fontSize={17} fill={C.ink2}>
        Who? Does what?
      </text>
      <text x={40} y={152} fontSize={17} fill={C.ink2}>
        Where or when?
      </text>

      <PlanPicture plan={plan} x={300} y={20} w={400} h={200} />
      <SvgButton x={770} y={50} w={180} h={54} fontSize={19} label="Read it" onClick={() => speak(done ? sentenceOf(plan) : slots.map((s) => (s === null ? '' : cards[s].text)).join(' '), { force: true })} disabled={slots.every((s) => s === null)} />
      <SvgButton x={770} y={122} w={180} h={54} fontSize={18} label="Next picture" onClick={() => fresh((index + 1) % PLANS.length)} color={done ? C.yellow : C.card} />

      {/* Slots */}
      {PARTS.map((part, i) => {
        const id = slots[i];
        const card = id === null ? null : cards[id];
        const left = slotLeft(i);
        return (
          <g key={part}>
            {card ? (
              <g onClick={() => takeOut(i)} role="button" aria-label={`${card.text}. Tap to take it out.`} style={{ cursor: done ? 'default' : 'pointer' }} data-nopan>
                <rect x={left} y={SLOT_Y} width={SLOT_W[part]} height={SLOT_H} rx={14} fill={shade(PART_COLOR[part], 0.75)} stroke={C.ink} strokeWidth={2.5} />
                <text x={left + SLOT_W[part] / 2} y={SLOT_Y + SLOT_H / 2 + 2} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink}>
                  {card.text}
                </text>
              </g>
            ) : (
              <rect x={left} y={SLOT_Y} width={SLOT_W[part]} height={SLOT_H} rx={14} fill={C.white} stroke={PART_COLOR[part]} strokeWidth={3} strokeDasharray="10 8" />
            )}
            <text x={left + SLOT_W[part] / 2} y={SLOT_Y + SLOT_H + 28} textAnchor="middle" fontSize={18} fontWeight={700} fill={shade(PART_COLOR[part], -0.3)}>
              {PART_NAME[part]}
            </text>
          </g>
        );
      })}
      <text x={stopX} y={SLOT_Y + SLOT_H - 8} fontSize={64} fontWeight={700} fill={done ? C.ink : C.line}>
        .
      </text>

      {/* Cards */}
      <rect x={40} y={384} width={920} height={180} rx={22} fill={shade(C.wood, 0.35)} stroke={C.ink} strokeWidth={2} />
      {cards.map((card, k) => {
        if (slots.includes(card.id)) return null;
        const { x, y } = cardPos(k);
        return (
          <DragTile key={`${index}-${card.id}`} x={x} y={y} label={`Card: ${card.text}`} shakeKey={shake.id === card.id ? shake.key : 0} onTap={() => tapCard(card)} onDrop={(p) => dropCard(card, p)} disabled={done}>
            <TileFace text={card.text} w={Math.max(130, 36 + card.text.length * 17)} h={64} fontSize={28} color={C.white} />
          </DragTile>
        );
      })}

      <Note x={60} y={586} w={880} h={70} tone={msg?.tone ?? 'plain'} text={msg?.text ?? (misses >= 3 ? 'Tip: say the sentence about the picture out loud first. Then find each part.' : 'Drag a card into each box. Tap a card to send it to the next empty box.')} />

      <Callout at={[slotLeft(0) + 20, SLOT_Y]} box={[20, 180]} w={220} icon={UserRound} title="Who?" text="Who the sentence is about. It starts with a capital letter." />
      <Callout at={[slotLeft(1) + SLOT_W.does / 2, SLOT_Y]} box={[730, 190]} w={220} icon={Zap} title="Does what?" text="Every sentence needs a doing word." />
      <Callout at={[stopX + 10, SLOT_Y + SLOT_H - 12]} box={[730, 330]} w={220} icon={MapPin} title="Where or when?" text="Adds detail. Then end with a full stop." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Emoji x={60} y={22} char="🐸" size={24} />
      {[
        ['A frog', C.blue, 4, 38],
        ['hops', C.red, 46, 30],
        ['on a log', C.green, 80, 36],
      ].map(([t, c, x, w]) => (
        <g key={t as string}>
          <rect x={x as number} y={44} width={w as number} height={22} rx={5} fill={shade(c as string, 0.7)} stroke={C.ink} strokeWidth={1.2} />
          <text x={(x as number) + (w as number) / 2} y={59} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.ink}>
            {t as string}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

function QuestionPicture({ plan }: { plan: Plan }) {
  return (
    <svg viewBox="296 16 408 208" role="img" aria-label="A picture to match">
      <PlanPicture plan={plan} x={300} y={20} w={400} h={200} />
    </svg>
  );
}

function whoQuestion(plan: Plan): Question {
  return mcq({
    prompt: `Who is this sentence about? “${sentenceOf(plan)}”`,
    answer: plan.who,
    wrong: [plan.does, plan.where],
    hint: 'Ask: who is doing something?',
    explain: [`Ask: who ${plan.does}?`, `${plan.who} ${plan.does}.`, `So the sentence is about ${plan.who.toLowerCase()}.`],
  });
}

function partQuestion(plan: Plan): Question {
  const askDoes = Math.random() < 0.5;
  const word = plan.whenNotWhere ? 'when' : 'where';
  return mcq({
    prompt: askDoes ? `Which part tells what happens? “${sentenceOf(plan)}”` : `Which part tells ${word}? “${sentenceOf(plan)}”`,
    answer: askDoes ? plan.does : plan.where,
    wrong: askDoes ? [plan.who, plan.where] : [plan.who, plan.does],
    hint: askDoes ? 'Find the doing word: what is somebody doing?' : `Ask: ${word} does it happen?`,
    explain: askDoes
      ? [`${plan.who} is who.`, `The doing word is ${plan.does}.`, `So ${plan.does} tells what happens.`]
      : [`${plan.who} is who, and ${plan.does} is what they do.`, `${plan.where} tells ${word}.`, `So the answer is ${plan.where}.`],
  });
}

function completeQuestion(plan: Plan): Question {
  const right = sentenceOf(plan);
  const noDoing = `${plan.who} ${plan.where}.`;
  const noWho = `${plan.does[0].toUpperCase()}${plan.does.slice(1)} ${plan.where}.`;
  return mcq({
    prompt: 'Which one is a whole sentence?',
    answer: right,
    wrong: [noDoing, noWho],
    hint: 'A whole sentence needs a who and a doing word.',
    explain: [`“${noDoing}” has no doing word.`, `“${noWho}” doesn't say who.`, `So the whole sentence is “${right}”`],
  });
}

function matchQuestion(plan: Plan): Question {
  const right = sentenceOf(plan);
  const otherWho = pick(PLANS.filter((p) => p.subject !== plan.subject && p.who.split(' ').pop() !== plan.who.split(' ').pop())).who;
  const wrongWho = `${otherWho} ${plan.does} ${plan.where}.`;
  const wrongDoes = `${plan.who} ${pick(plan.notDoing)} ${plan.where}.`;
  return mcq({
    prompt: 'Which sentence matches the picture?',
    visual: <QuestionPicture plan={plan} />,
    answer: right,
    wrong: [wrongWho, wrongDoes],
    hint: 'Read every word. Check who it is, what it does and where.',
    explain: [`Who is in the picture? ${plan.who}.`, `The doing word that matches the picture is ${plan.does}.`, `So the sentence is “${right}”`],
  });
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  const plan = pick(PLANS);
  if (lv === 0) return Math.random() < 0.5 ? whoQuestion(plan) : matchQuestion(plan);
  if (lv === 1) return partQuestion(plan);
  return Math.random() < 0.5 ? completeQuestion(plan) : matchQuestion(plan);
}

export const writeASentence: Lesson = {
  id: 'write-a-sentence',
  title: 'Write a Sentence',
  Thumb,
  Scene: BuildScene,
  sceneHint: 'Look at the picture · Who? Does what? Where or when? · End with a full stop',
  learn: {
    heading: 'Building a sentence',
    intro: 'A sentence tells a whole idea. A good one says who, what they do, and often where or when.',
    points: [
      { icon: UserRound, text: 'Who: The dog' },
      { icon: Zap, text: 'Does what: digs' },
      { icon: MapPin, text: 'Where or when: in the mud. Then a full stop!' },
    ],
  },
  steps: ['Look at the picture. Who is it?', 'What are they doing?', 'Where (or when) is it happening?', 'Say the whole sentence, then write it with a capital and a full stop.'],
  example: {
    question: 'Write a sentence about a frog jumping on a log.',
    work: ['Who? A frog.', 'Does what? hops.', 'Where? on a log. Add a full stop.'],
    answer: 'A frog hops on a log.',
  },
  grownups: [
    'Say it before you write it: children who say their sentence aloud first write more complete sentences.',
    'Who + does what is the heart of every sentence. Where or when adds detail.',
    'If a sentence is missing a part, ask the question it doesn’t answer: “Who hops?” or “What does the dog do?”',
    'Later, encourage a describing word (“The big dog…”) to make sentences more interesting.',
  ],
  makeQuestion,
};
