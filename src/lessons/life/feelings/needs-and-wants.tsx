import { useState } from 'react';
import { Gift, Home, ShieldCheck, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, DragItem, Emoji, EmojiLabel, EmojiPicture, inside, Note, Tap } from '../shared/kit';
import type { Box } from '../shared/kit';

interface Item {
  id: string;
  emoji: string;
  name: string;
  need: boolean;
  why: string;
}

const ITEMS: Item[] = [
  { id: 'food', emoji: '🍎', name: 'healthy food', need: true, why: 'Food gives our bodies energy to live and grow.' },
  { id: 'water', emoji: '💧', name: 'water', need: true, why: 'Our bodies need water every day to stay alive.' },
  { id: 'home', emoji: '🏠', name: 'a home', need: true, why: 'A home keeps us safe, dry and warm.' },
  { id: 'coat', emoji: '🧥', name: 'warm clothes', need: true, why: 'Clothes keep us warm and protected.' },
  { id: 'bed', emoji: '🛏️', name: 'a place to sleep', need: true, why: 'Our bodies need sleep to rest and grow.' },
  { id: 'teddy', emoji: '🧸', name: 'a new teddy', need: false, why: 'A teddy is lovely, but we can live without a new one.' },
  { id: 'game', emoji: '🎮', name: 'a video game', need: false, why: 'Games are fun, but they are a want, not a need.' },
  { id: 'lolly', emoji: '🍭', name: 'a lollipop', need: false, why: 'A treat is nice sometimes, but it isn’t something we need.' },
  { id: 'balloon', emoji: '🎈', name: 'a balloon', need: false, why: 'Balloons are fun extras, so they are a want.' },
  { id: 'scooter', emoji: '🛴', name: 'a scooter', need: false, why: 'A scooter is fun to ride, but we can live without it.' },
];

const NEEDS_BOX: Box = { x: 70, y: 392, w: 410, h: 240 };
const WANTS_BOX: Box = { x: 520, y: 392, w: 410, h: 240 };

function home(i: number): Pt {
  return { x: 120 + (i % 5) * 190, y: 128 + Math.floor(i / 5) * 124 };
}

function slotIn(box: Box, n: number): Pt {
  return { x: box.x + 60 + (n % 5) * 74, y: box.y + 100 + Math.floor(n / 5) * 78 };
}

function NeedsScene() {
  const [order] = useState(() => shuffle(ITEMS));
  const [placed, setPlaced] = useState<Record<string, 'need' | 'want'>>({});
  const [drag, setDrag] = useState<{ id: string; p: Pt } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' } | null>(null);

  const done = Object.keys(placed).length === ITEMS.length;
  const needs = order.filter((it) => placed[it.id] === 'need');
  const wants = order.filter((it) => placed[it.id] === 'want');

  const sortInto = (item: Item, basket: 'need' | 'want') => {
    const right = item.need === (basket === 'need');
    if (right) {
      play('correct');
      setPlaced((p) => ({ ...p, [item.id]: basket }));
      setNote({ text: `Yes! ${item.why}`, tone: 'good' });
    } else {
      play('wrong');
      setNote({ text: `Not yet. Ask: can we live without ${item.name}? ${item.need ? 'We can’t, so it’s a need.' : 'We can, so it’s a want.'}`, tone: 'nudge' });
    }
    setSelected(null);
  };

  const drop = (item: Item, p: Pt) => {
    setDrag(null);
    if (inside(p, NEEDS_BOX)) sortInto(item, 'need');
    else if (inside(p, WANTS_BOX)) sortInto(item, 'want');
  };

  const tapBasket = (basket: 'need' | 'want') => {
    const item = ITEMS.find((it) => it.id === selected);
    if (item) sortInto(item, basket);
    else setNote({ text: 'Pick something from the shelf first, then tap a basket.', tone: 'nudge' });
  };

  const basket = (box: Box, kind: 'need' | 'want', items: Item[]) => (
    <Tap label={kind === 'need' ? 'Needs basket' : 'Wants basket'} onTap={() => tapBasket(kind)}>
      <Card x={box.x} y={box.y} w={box.w} h={box.h} fill={kind === 'need' ? shade(C.green, 0.82) : shade(C.blue, 0.85)}>
        <text x={box.x + 20} y={box.y + 34} fontSize={24} fontWeight={700} fill={C.ink}>
          {kind === 'need' ? 'Needs' : 'Wants'}
        </text>
        <text x={box.x + 20} y={box.y + 58} fontSize={15} fill={C.ink2}>
          {kind === 'need' ? 'We can’t live without these' : 'Nice to have, but we can live without them'}
        </text>
        {items.map((it, n) => {
          const s = slotIn(box, n);
          return <Emoji key={it.id} e={it.emoji} x={s.x} y={s.y} size={46} />;
        })}
      </Card>
    </Tap>
  );

  const draggingItem = drag ? ITEMS.find((it) => it.id === drag.id) : null;

  return (
    <SceneSvg label="Sort things into needs and wants">
      <text x={60} y={50} fontSize={15} fill={C.muted} className="caps">
        Drag each thing into a basket (or tap it, then tap a basket)
      </text>
      <rect x={40} y={64} width={920} height={256} rx={20} fill={shade(C.wood, 0.55)} stroke={C.ink} strokeWidth={1.5} />
      {order.map((it, i) => {
        if (placed[it.id]) return null;
        const at = home(i);
        const isSel = selected === it.id;
        return (
          <DragItem
            key={it.id}
            at={at}
            r={58}
            label={it.name}
            dragging={drag?.id === it.id}
            onMove={(p) => setDrag({ id: it.id, p })}
            onDrop={(p) => drop(it, p)}
            onTap={() => {
              play('tap');
              setSelected(isSel ? null : it.id);
              setNote(null);
            }}
          >
            <rect x={-74} y={-54} width={148} height={108} rx={16} fill={isSel ? shade(C.yellow, 0.6) : C.card} stroke={C.ink} strokeWidth={isSel ? 3 : 2} />
            <Emoji e={it.emoji} x={0} y={-10} size={50} />
            <text x={0} y={38} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink} style={{ pointerEvents: 'none' }}>
              {it.name}
            </text>
          </DragItem>
        );
      })}
      {basket(NEEDS_BOX, 'need', needs)}
      {basket(WANTS_BOX, 'want', wants)}
      {draggingItem && drag && (
        <g transform={`translate(${drag.p.x} ${drag.p.y})`} style={{ pointerEvents: 'none' }}>
          <rect x={-60} y={-46} width={120} height={92} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} opacity={0.95} />
          <Emoji e={draggingItem.emoji} x={0} y={0} size={52} />
        </g>
      )}
      {done ? (
        <g>
          <Note x={250} y={140} w={500} text="All sorted! Needs keep us alive and healthy. Wants are nice extras we can live without." tone="good" />
          <SvgButton x={410} y={226} w={180} h={48} fontSize={17} label="Sort again" onClick={() => { setPlaced({}); setNote(null); }} />
        </g>
      ) : (
        note && <Note x={60} y={332} w={880} text={note.text} tone={note.tone} />
      )}
      <SvgButton x={840} y={18} w={120} h={44} fontSize={16} label="Say it" onClick={() => speak('A need is something we can’t live without, like food and water. A want is something nice to have.', { force: true })} />

      <Callout at={[200, 470]} box={[20, 590]} w={220} icon={ShieldCheck} title="Needs" text="Food, water, a home, clothes and sleep keep us alive." />
      <Callout at={[800, 470]} box={[760, 590]} w={220} icon={Gift} title="Wants" text="Toys and treats are fun extras." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={30} width={50} height={44} rx={8} fill={shade(C.green, 0.75)} stroke={C.ink} strokeWidth={1.5} />
      <rect x={64} y={30} width={50} height={44} rx={8} fill={shade(C.blue, 0.8)} stroke={C.ink} strokeWidth={1.5} />
      <Emoji e="💧" x={31} y={52} size={24} />
      <Emoji e="🧸" x={89} y={52} size={24} />
    </svg>
  );
}

const pic = (it: Item) => ({ value: it.id, name: it.name, label: <EmojiLabel e={it.emoji} text={it.name} /> });

function makeQuestion(level: number): Question {
  const needs = ITEMS.filter((i) => i.need);
  const wants = ITEMS.filter((i) => !i.need);
  if (level === 0) {
    const it = pick(ITEMS);
    const kind = it.need ? 'need' : 'want';
    return choiceQuestion({
      prompt: `Is ${it.name} a need or a want?`,
      visual: <EmojiPicture e={it.emoji} caption={it.name} />,
      right: { value: kind, label: it.need ? 'Need' : 'Want', name: kind },
      wrong: [{ value: it.need ? 'want' : 'need', label: it.need ? 'Want' : 'Need' }],
      hint: `Ask yourself: could we live without ${it.name}?`,
      explain: [`Could we live without ${it.name}? ${it.need ? 'No.' : 'Yes.'}`, it.why, `So ${it.name} is a ${kind}.`],
    });
  }
  if (level === 1) {
    const findNeed = Math.random() < 0.6;
    const right = pick(findNeed ? needs : wants);
    const wrong = shuffle(findNeed ? wants : needs).slice(0, 2);
    return choiceQuestion({
      prompt: findNeed ? 'Which one is a need?' : 'Which one is a want?',
      right: pic(right),
      wrong: wrong.map(pic),
      hint: findNeed ? 'Find the one we can’t live without.' : 'Find the fun extra we could live without.',
      explain: [findNeed ? 'Needs are things we can’t live without.' : 'Wants are nice extras.', right.why, `So the answer is ${right.name}.`],
    });
  }
  if (Math.random() < 0.5) {
    const right = pick(needs);
    return choiceQuestion({
      prompt: 'You can only get one thing today. What should come first?',
      right: pic(right),
      wrong: shuffle(wants).slice(0, 2).map(pic),
      hint: 'Needs come before wants.',
      explain: ['When we can only choose one, needs come first.', right.why, `So choose ${right.name} first.`],
    });
  }
  const it = pick(needs);
  return choiceQuestion({
    prompt: `Why is ${it.name} a need?`,
    visual: <EmojiPicture e={it.emoji} caption={it.name} />,
    right: { value: 'It keeps us alive and healthy' },
    wrong: [{ value: 'It is fun to play with' }, { value: 'It is shiny and new' }],
    hint: 'Think about what our bodies must have.',
    explain: [it.why, 'Needs are things our bodies must have.', 'So: it keeps us alive and healthy.'],
  });
}

export const needsAndWants: Lesson = {
  id: 'needs-and-wants',
  title: 'Needs and Wants',
  Thumb,
  Scene: NeedsScene,
  sceneHint: 'Drag each thing into Needs or Wants',
  learn: {
    heading: 'Needs and wants',
    intro: 'A need is something we must have to live and stay healthy, like food and water. A want is something nice to have, like a toy, but we can live without it.',
    points: [
      { icon: Home, text: 'Needs: food, water, a home, warm clothes and sleep.' },
      { icon: Gift, text: 'Wants: toys, treats and other fun extras.' },
      { icon: Sparkles, text: 'Ask: “Can we live without it?”' },
      { icon: ShieldCheck, text: 'When we must choose, needs come first.' },
    ],
  },
  steps: ['Look at the thing.', 'Ask: “Can we live without it?”', 'If we can’t, it’s a need.', 'If we can, it’s a want.'],
  example: {
    question: 'Is a raincoat on a rainy day a need or a want?',
    visual: <EmojiPicture e="🧥" caption="warm clothes" />,
    work: ['Clothes keep us warm and dry.', 'We need them to stay healthy.'],
    answer: 'Clothes are a need. (A fancy new coat with stars on it might be a want!)',
  },
  grownups: [
    'At the shops, think aloud: “We need bread. We want the cookies, but we can wait.”',
    'Some things are both: we need clothes, but we might want a particular brand. Talk about the difference.',
    'Avoid making wants feel “bad”. Wants are fine; we just choose needs first.',
  ],
  makeQuestion,
};
