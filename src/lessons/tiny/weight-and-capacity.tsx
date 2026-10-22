import { useState } from 'react';
import { ArrowDown, CupSoda, Feather, Scale } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Draggable } from './visuals/Draggable';
import {
  Balance,
  BalancePicture,
  Container,
  CONTAINER_IDS,
  CONTAINERS,
  ContainersPicture,
  Emoji,
  ThingsInARow,
  tiltFor,
  useTween,
  WEIGH_IDS,
  WEIGH_THINGS,
} from './visuals/Measure';
import type { ContainerId, WeighId } from './visuals/Measure';

type Mode = 'weigh' | 'pour';

const BAL = { cx: 360, cy: 230, half: 200 };
const SHELF_Y = 590;
const shelfX = (i: number) => 90 + i * 112;

function weighSentence(left: WeighId | null, right: WeighId | null): string {
  if (!left && !right) return 'Drag two things onto the pans. The heavier one goes down.';
  if (!left || !right) {
    const one = WEIGH_THINGS[(left ?? right)!].name;
    return `The ${one} pushes its pan down. Put something on the other pan to compare.`;
  }
  const [heavy, light] = WEIGH_THINGS[left].weight > WEIGH_THINGS[right].weight ? [left, right] : [right, left];
  const tip = heavy === 'strawberry' || light === 'balloon' ? ' Big things are not always heavy!' : '';
  return `The ${WEIGH_THINGS[heavy].name} is heavier than the ${WEIGH_THINGS[light].name}. Its pan goes down.${tip}`;
}

function WeighPanel() {
  const [pans, setPans] = useState<{ left: WeighId | null; right: WeighId | null }>({ left: 'balloon', right: 'apple' });
  const tilt = useTween(tiltFor(pans.left, pans.right));
  const onShelf = WEIGH_IDS.filter((id) => id !== pans.left && id !== pans.right);

  const place = (id: WeighId, side: 'left' | 'right') => {
    setPans((p) => ({ ...p, [side]: id }));
    play('pop');
  };
  const drop = (id: WeighId) => (p: Pt) => {
    if (p.y > 470) return; // dropped back on the shelf
    place(id, p.x < BAL.cx ? 'left' : 'right');
  };
  const tapPlace = (id: WeighId) => () => place(id, !pans.left ? 'left' : !pans.right ? 'right' : 'right');
  const remove = (side: 'left' | 'right') => {
    setPans((p) => ({ ...p, [side]: null }));
    play('tap');
  };

  const onPan = (side: 'left' | 'right') => {
    const id = pans[side];
    if (!id) return undefined;
    const t = WEIGH_THINGS[id];
    return (
      <g onClick={() => remove(side)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Take the ${t.name} off`}>
        <Emoji char={t.emoji} x={0} y={-38 * t.size} size={76 * t.size} />
      </g>
    );
  };

  const sentence = weighSentence(pans.left, pans.right);
  const lines = wrap(sentence, 22);

  return (
    <g>
      <Balance cx={BAL.cx} cy={BAL.cy} half={BAL.half} tilt={tilt} leftContent={onPan('left')} rightContent={onPan('right')} />

      {/* Shelf */}
      <rect x={30} y={SHELF_Y + 34} width={650} height={16} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      {onShelf.map((id) => {
        const i = WEIGH_IDS.indexOf(id);
        const t = WEIGH_THINGS[id];
        return (
          <Draggable key={id} x={shelfX(i)} y={SHELF_Y} label={`Drag the ${t.name} onto a pan`} onDrop={drop(id)} onTap={tapPlace(id)}>
            <Emoji char={t.emoji} x={shelfX(i)} y={SHELF_Y - 4} size={58 * Math.min(1.15, t.size)} />
          </Draggable>
        );
      })}

      {/* Readout */}
      <rect x={730} y={110} width={240} height={50 + lines.length * 26} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={146 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
      <SvgButton x={730} y={420} w={240} h={52} fontSize={18} label="Say it" onClick={() => speak(sentence, { force: true })} />
      <SvgButton
        x={730}
        y={486}
        w={240}
        h={52}
        fontSize={18}
        label="Empty the pans"
        onClick={() => {
          setPans({ left: null, right: null });
          play('tap');
        }}
        disabled={!pans.left && !pans.right}
      />

      <Callout at={[BAL.cx - BAL.half, BAL.cy + 120]} box={[40, 30]} w={250} icon={ArrowDown} title="Down is heavier" text="The heavier thing pulls its pan down. The lighter pan goes up." />
      <Callout at={[shelfX(0), SHELF_Y - 30]} box={[200, 470]} w={260} icon={Feather} title="Big is not always heavy" text="A big balloon is very light. A small strawberry is heavier!" />
    </g>
  );
}

function PourPanel() {
  const [cups, setCups] = useState<Record<ContainerId, number>>({ glass: 0, bowl: 0, jug: 0 });
  const [selected, setSelected] = useState<ContainerId>('glass');
  const [overflow, setOverflow] = useState(false);
  const xs: Record<ContainerId, number> = { glass: 120, jug: 330, bowl: 560 };
  const bottom = 430;

  const pour = () => {
    const cap = CONTAINERS[selected].cups;
    if (cups[selected] >= cap) {
      setOverflow(true);
      play('wrong');
      return;
    }
    setOverflow(false);
    setCups((c) => ({ ...c, [selected]: c[selected] + 1 }));
    play(cups[selected] + 1 === cap ? 'correct' : 'pop');
  };

  const full = CONTAINER_IDS.filter((id) => cups[id] >= CONTAINERS[id].cups);
  let sentence: string;
  const sel = CONTAINERS[selected];
  if (overflow) sentence = `It's full! The ${sel.name} holds ${sel.cups} cups. More would spill.`;
  else if (full.length >= 2) {
    const sorted = [...full].sort((a, b) => CONTAINERS[b].cups - CONTAINERS[a].cups);
    const [most, least] = [sorted[0], sorted[sorted.length - 1]];
    sentence = `The ${CONTAINERS[most].name} holds ${CONTAINERS[most].cups} cups. The ${CONTAINERS[least].name} holds ${CONTAINERS[least].cups}. The ${CONTAINERS[most].name} holds more.`;
  } else if (cups[selected] > 0) sentence = `${cups[selected]} ${cups[selected] === 1 ? 'cup' : 'cups'} in the ${sel.name}. Keep pouring until it is full.`;
  else sentence = `Tap a container, then pour cups of water in. Count the cups!`;
  const lines = wrap(sentence, 22);

  return (
    <g>
      {CONTAINER_IDS.map((id) => {
        const c = CONTAINERS[id];
        return (
          <g
            key={id}
            onClick={() => {
              setSelected(id);
              setOverflow(false);
              play('tap');
            }}
            style={{ cursor: 'pointer' }}
            data-nopan
            role="button"
            aria-label={`Choose the ${c.name}`}
          >
            <rect x={xs[id] - 115} y={bottom - 210} width={230} height={300} fill="transparent" />
            <Container id={id} x={xs[id]} bottom={bottom} level={cups[id] / c.cups} selected={selected === id} />
            <text x={xs[id]} y={bottom + 40} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
              {c.name}
            </text>
            <text x={xs[id]} y={bottom + 70} textAnchor="middle" fontSize={18} fill={shade(C.blue, -0.3)} className="num">
              {cups[id]} {cups[id] === 1 ? 'cup' : 'cups'}
              {cups[id] >= c.cups ? ' · full' : ''}
            </text>
          </g>
        );
      })}

      {/* The cup you pour with */}
      <g transform="translate(780 520)">
        <path d="M-22,-30 L22,-30 L17,22 Q16,28 10,28 L-10,28 Q-16,28 -17,22 Z" fill={shade(C.blue, 0.5)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <text x={40} y={4} fontSize={16} fill={C.muted}>
          = 1 cup
        </text>
      </g>

      <rect x={730} y={110} width={240} height={50 + lines.length * 26} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={146 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
      <SvgButton x={730} y={420} w={240} h={56} fontSize={19} label="Pour a cup" onClick={pour} color={C.teal} textColor={C.white} />
      <SvgButton
        x={730}
        y={590}
        w={240}
        h={48}
        fontSize={17}
        label="Empty them all"
        onClick={() => {
          setCups({ glass: 0, bowl: 0, jug: 0 });
          setOverflow(false);
          play('tap');
        }}
        disabled={CONTAINER_IDS.every((id) => cups[id] === 0)}
      />

      <Callout at={[xs.glass, bottom - 170]} box={[230, 40]} w={270} icon={CupSoda} title="Tall is not always more" text="The tall glass looks big, but count the cups. The wide bowl holds more!" />
    </g>
  );
}

function WeightCapacityScene() {
  const [mode, setMode] = useState<Mode>('weigh');
  return (
    <SceneSvg label={mode === 'weigh' ? 'A balance to compare which thing is heavier' : 'Containers to fill with cups of water'}>
      <SvgButton x={730} y={30} w={112} h={52} fontSize={18} label="Weigh" onClick={() => setMode('weigh')} active={mode === 'weigh'} color={mode === 'weigh' ? C.yellow : C.card} />
      <SvgButton x={858} y={30} w={112} h={52} fontSize={18} label="Pour" onClick={() => setMode('pour')} active={mode === 'pour'} color={mode === 'pour' ? C.yellow : C.card} />
      {mode === 'weigh' ? <WeighPanel /> : <PourPanel />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={60} y1={30} x2={60} y2={74} stroke={C.ink} strokeWidth={3} />
      <line x1={22} y1={22} x2={98} y2={38} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <Emoji char="🎈" x={24} y={10} size={22} />
      <Emoji char="🍎" x={96} y={28} size={20} />
      <rect x={44} y={70} width={32} height={6} rx={2} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

const nameOf = (id: WeighId) => WEIGH_THINGS[id].name;

/** Two things whose weights are clearly different (at least `gap` apart). */
function pairApart(gap: number): [WeighId, WeighId] {
  for (;;) {
    const [a, b] = shuffle(WEIGH_IDS).slice(0, 2);
    if (Math.abs(WEIGH_THINGS[a].weight - WEIGH_THINGS[b].weight) >= gap) return [a, b];
  }
}

function heavierOf(a: WeighId, b: WeighId): WeighId {
  return WEIGH_THINGS[a].weight > WEIGH_THINGS[b].weight ? a : b;
}

function makeQuestion(level: number): Question {
  const style = level === 0 ? pick([0, 0, 1]) : level === 1 ? pick([1, 2, 2, 3]) : pick([3, 4, 5]);

  if (style === 0) {
    // Everyday knowledge: which is heavier?
    const [a, b] = pairApart(4);
    const heavy = heavierOf(a, b);
    return {
      prompt: `Which is heavier, the ${nameOf(a)} or the ${nameOf(b)}?`,
      visual: <ThingsInARow ids={[a, b]} />,
      choices: shuffle([a, b]).map((id) => ({ value: nameOf(id) })),
      answer: nameOf(heavy),
      hint: 'Think about lifting each one. Which would pull your arm down more?',
      explain: [`Imagine holding one in each hand.`, `The ${nameOf(heavy)} would feel heavier.`, `So the ${nameOf(heavy)} is heavier.`],
    };
  }

  if (style === 1 || style === 2) {
    // Read the balance (sometimes with the big-but-light balloon).
    // Level 1 sometimes uses the "big but light" balloon, so children read the scale, not the size.
    const traps: [WeighId, WeighId][] = [
      ['balloon', 'strawberry'],
      ['balloon', 'apple'],
    ];
    const [a, b] = style === 1 ? pairApart(3) : Math.random() < 0.5 ? pick(traps) : pairApart(1);
    const [left, right] = shuffle([a, b]);
    const heavy = heavierOf(left, right);
    const askLight = style === 2 && Math.random() < 0.5;
    const target = askLight ? (heavy === left ? right : left) : heavy;
    const side = target === left ? 'left' : 'right';
    return {
      prompt: askLight ? 'Look at the balance. Which is lighter?' : 'Look at the balance. Which is heavier?',
      visual: <BalancePicture left={left} right={right} />,
      choices: shuffle([left, right]).map((id) => ({ value: nameOf(id) })),
      answer: nameOf(target),
      hint: 'Look at the pans. Which pan is down low?',
      explain: askLight
        ? [`The ${nameOf(target)} is on the pan that went up.`, 'The pan that goes up has the lighter thing.', `So the ${nameOf(target)} is lighter.`]
        : [`The ${side} pan went down.`, `The ${nameOf(target)} is on that pan.`, `So the ${nameOf(target)} is heavier.`],
    };
  }

  if (style === 3) {
    // Which holds more? Count the cups.
    const [a, b] = shuffle(CONTAINER_IDS).slice(0, 2);
    const more = CONTAINERS[a].cups > CONTAINERS[b].cups ? a : b;
    const less = more === a ? b : a;
    return {
      prompt: 'Which holds more water?',
      visual: <ContainersPicture ids={[a, b]} />,
      choices: shuffle([a, b]).map((id) => ({ value: CONTAINERS[id].name })),
      answer: CONTAINERS[more].name,
      hint: 'Don’t just look at how tall it is. Count the cups each one holds.',
      explain: [
        `The ${CONTAINERS[more].name} holds ${CONTAINERS[more].cups} cups.`,
        `The ${CONTAINERS[less].name} holds ${CONTAINERS[less].cups} cups.`,
        `${CONTAINERS[more].cups} is more, so the ${CONTAINERS[more].name} holds more.`,
      ],
    };
  }

  if (style === 4) {
    // Heaviest of three.
    let ids: WeighId[];
    do ids = shuffle(WEIGH_IDS).slice(0, 3);
    while (new Set(ids.map((i) => WEIGH_THINGS[i].weight)).size < 3 || ids.includes('strawberry'));
    const heavy = ids.reduce((x, y) => (WEIGH_THINGS[x].weight > WEIGH_THINGS[y].weight ? x : y));
    return {
      prompt: 'Which is the heaviest?',
      visual: <ThingsInARow ids={ids} />,
      choices: ids.map((id) => ({ value: nameOf(id) })),
      answer: nameOf(heavy),
      hint: 'Compare two at a time. Keep the heavier one and compare it with the next.',
      explain: [`Compare them two at a time.`, `The ${nameOf(heavy)} is heavier than each of the others.`, `So the ${nameOf(heavy)} is the heaviest.`],
    };
  }

  // How many more cups?
  const [a, b] = shuffle(CONTAINER_IDS).slice(0, 2);
  const more = CONTAINERS[a].cups > CONTAINERS[b].cups ? a : b;
  const less = more === a ? b : a;
  const diff = CONTAINERS[more].cups - CONTAINERS[less].cups;
  return {
    prompt: `How many more cups does the ${CONTAINERS[more].name} hold than the ${CONTAINERS[less].name}?`,
    visual: <ContainersPicture ids={[more, less]} />,
    choices: numberChoices(diff, { count: 3, min: 1, max: 6, spread: 2 }).map((value) => ({ value })),
    answer: String(diff),
    hint: 'Count on from the smaller number of cups to the bigger one.',
    explain: [
      `The ${CONTAINERS[more].name} holds ${CONTAINERS[more].cups} cups. The ${CONTAINERS[less].name} holds ${CONTAINERS[less].cups}.`,
      `Count on from ${CONTAINERS[less].cups} to ${CONTAINERS[more].cups}: that is ${diff} more.`,
      `The ${CONTAINERS[more].name} holds ${diff} more ${diff === 1 ? 'cup' : 'cups'}.`,
    ],
  };
}

export const weightAndCapacity: Lesson = {
  id: 'weight-and-capacity',
  title: 'Heavy and Full',
  Thumb,
  Scene: WeightCapacityScene,
  sceneHint: 'Drag things onto the balance · Pour cups to fill',
  learn: {
    heading: 'Heavy, light, full and empty',
    intro: 'A balance shows which thing is heavier: its side goes down. To find which container holds more, fill each one with cups of water and count!',
    points: [
      { icon: Scale, text: 'The heavier side of a balance goes down.' },
      { icon: Feather, text: 'Big things are not always heavy.' },
      { icon: CupSoda, text: 'Count cups of water to see which holds more.' },
    ],
  },
  steps: [
    'Put one thing on each side of the balance.',
    'Look: the side that goes down is heavier.',
    'To compare containers, pour in cups of water until each is full.',
    'The one that took more cups holds more!',
  ],
  example: {
    question: 'Which is heavier, the balloon or the apple?',
    visual: <BalancePicture left="balloon" right="apple" />,
    work: ['The balloon is big, but its pan went up.', 'The apple’s pan went down.'],
    answer: 'The apple is heavier.',
  },
  grownups: [
    'Let your child hold two things, one in each hand, and guess which is heavier before checking on kitchen scales.',
    'Bath time is perfect for capacity: how many cups fill the jug? The bowl?',
    'Children often think taller containers hold more. Pouring and counting is how they learn otherwise.',
  ],
  makeQuestion,
};
