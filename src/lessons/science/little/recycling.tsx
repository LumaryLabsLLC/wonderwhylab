import { useEffect, useRef, useState } from 'react';
import { Recycle, Repeat, Sprout } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { EMOJI_FONT } from '../../../games/reading/words';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from '../sparks/visuals/DragToken';
import { EmojiPicture, SceneEmoji } from './visuals/Emoji';
import { MessageBox } from './visuals/MessageBox';

/**
 * Sort rubbish into recycling, compost and rubbish bins, and test what rots in a compost heap.
 * Categories are kept to clear, common cases; local rules differ, which the grown-up notes say.
 */
type Bin = 'recycle' | 'compost' | 'rubbish';

interface Item {
  id: string;
  name: string;
  /** Shelf caption. */
  short: string;
  emoji: string;
  bin: Bin;
  /** A reuse idea, for things worth using again before recycling. */
  reuse?: string;
  /** Why it does or doesn't rot in the compost (for the test). */
  rot: string;
  /** Paper and card do rot, just slowly. */
  slowRot?: true;
  plural?: true;
}

const ITEMS: Item[] = [
  { id: 'news', short: 'paper', name: 'newspaper', emoji: '📰', bin: 'recycle', reuse: 'wrap a present', rot: 'Paper rots too, but slowly. It’s more useful recycled into new paper.', slowRot: true },
  { id: 'box', short: 'box', name: 'cardboard box', emoji: '📦', bin: 'recycle', reuse: 'make a toy house', rot: 'Cardboard rots too, but slowly. It’s more useful recycled into new boxes.', slowRot: true },
  { id: 'can', short: 'tin can', name: 'tin can', emoji: '🥫', bin: 'recycle', reuse: 'make a pencil pot', rot: 'A can is metal. Metal doesn’t rot, but it can be recycled.' },
  { id: 'glass', short: 'glass', name: 'glass bottle', emoji: '🍾', bin: 'recycle', reuse: 'hold some flowers', rot: 'Glass doesn’t rot at all, but it can be recycled.' },
  { id: 'bottle', short: 'bottle', name: 'plastic bottle', emoji: '🧴', bin: 'recycle', rot: 'Plastic doesn’t rot, so it stays the same for a very long time.' },
  { id: 'banana', short: 'peel', name: 'banana peel', emoji: '🍌', bin: 'compost', rot: 'Food scraps rot: tiny living things turn them into rich soil.' },
  { id: 'apple', short: 'apple core', name: 'apple core', emoji: '🍏', bin: 'compost', rot: 'Food scraps rot: tiny living things turn them into rich soil.' },
  { id: 'egg', short: 'eggshells', name: 'eggshells', emoji: '🥚', bin: 'compost', rot: 'Eggshells break down into the soil and help plants grow.', plural: true },
  { id: 'leaves', short: 'leaves', name: 'leaves', emoji: '🍂', bin: 'compost', rot: 'Leaves rot into soil. That’s how a forest floor stays rich.', plural: true },
  { id: 'wrapper', short: 'wrapper', name: 'sweet wrapper', emoji: '🍬', bin: 'rubbish', rot: 'A sweet wrapper is plastic. It doesn’t rot, so it stays the same.' },
  { id: 'plaster', short: 'plaster', name: 'used plaster', emoji: '🩹', bin: 'rubbish', rot: 'A used plaster doesn’t rot and can’t be recycled, so it goes in the rubbish.' },
  { id: 'sponge', short: 'sponge', name: 'old sponge', emoji: '🧽', bin: 'rubbish', rot: 'A kitchen sponge is plastic. It doesn’t rot.' },
];
const byId = (id: string) => ITEMS.find((i) => i.id === id)!;
const rotsAway = (it: Item) => it.bin === 'compost' || !!it.slowRot;

const BINS: { id: Bin; name: string; color: string; x: number; emoji: string }[] = [
  { id: 'recycle', name: 'Recycling', color: C.blue, x: 40, emoji: '♻️' },
  { id: 'compost', name: 'Compost', color: C.green, x: 230, emoji: '🌱' },
  { id: 'rubbish', name: 'Rubbish', color: '#8a93a6', x: 420, emoji: '🗑️' },
];
const BIN_W = 170;
const BIN_Y = 404;
const BIN_H = 236;
const HEAP = { x: 640, y: 300, w: 320, h: 200 };

const YES = 'Yes, it rots';
const NO = 'No, it stays';

type Where = 'shelf' | Bin | 'heap';

function shelfSpot(i: number): Pt {
  return { x: 82 + (i % 6) * 92, y: 104 + Math.floor(i / 6) * 120 };
}

function RecyclingScene() {
  const [where, setWhere] = useState<Record<string, Where>>(() => Object.fromEntries(ITEMS.map((i) => [i.id, 'shelf'])));
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('Drag each thing into a bin. Or test it on the compost heap!');
  const [guess, setGuess] = useState<string | null>(null);
  const [months, setMonths] = useState(0); // 0 → 1 while waiting
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const onHeap = ITEMS.find((i) => where[i.id] === 'heap');

  const put = (id: string, w: Where) => setWhere((s) => ({ ...s, [id]: w }));

  const toBin = (it: Item, bin: Bin) => {
    setSelected(null);
    if (it.bin === bin) {
      put(it.id, bin);
      if (where[it.id] === 'heap') resetTest();
      play('correct');
      const b = BINS.find((x) => x.id === bin)!;
      const goes = it.plural ? 'go' : 'goes';
      setMessage(it.reuse ? `Yes! The ${it.name} ${goes} in ${b.name}. Or reuse it first: ${it.reuse}!` : `Yes! The ${it.name} ${goes} in ${b.name}.`);
    } else {
      play('wrong');
      setShake((s) => ({ ...s, [it.id]: (s[it.id] ?? 0) + 1 }));
      setMessage(
        it.bin === 'compost'
          ? `Not yet. ${it.plural ? 'Are' : 'Is'} the ${it.name} food or part of a plant?`
          : it.bin === 'recycle'
            ? `Not yet. ${it.plural ? 'Are' : 'Is'} the ${it.name} paper, card, metal, glass or a bottle?`
            : `Not yet. Can the ${it.name} rot, or be made into something new?`,
      );
    }
  };

  const toHeap = (it: Item) => {
    setSelected(null);
    if (onHeap && onHeap.id !== it.id) put(onHeap.id, 'shelf');
    put(it.id, 'heap');
    resetTest();
    play('pop');
  };

  const resetTest = () => {
    window.clearInterval(timer.current);
    setGuess(null);
    setMonths(0);
  };

  const wait = () => {
    window.clearInterval(timer.current);
    play('tap');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let k = 0;
    const steps = reduce ? 1 : 24;
    timer.current = window.setInterval(() => {
      k += 1;
      setMonths(k / steps);
      if (k >= steps) {
        window.clearInterval(timer.current);
        play(onHeap && rotsAway(onHeap) ? 'correct' : 'pop');
      }
    }, 70);
  };

  const tryAnother = () => {
    if (onHeap) put(onHeap.id, 'shelf');
    resetTest();
  };

  const dropAt = (it: Item, p: Pt) => {
    for (const b of BINS) if (p.x >= b.x && p.x <= b.x + BIN_W && p.y >= BIN_Y - 30 && p.y <= BIN_Y + BIN_H) return toBin(it, b.id);
    if (p.x >= HEAP.x && p.x <= HEAP.x + HEAP.w && p.y >= HEAP.y - 30 && p.y <= HEAP.y + HEAP.h) return toHeap(it);
  };

  const tapTarget = (target: Bin | 'heap') => {
    if (!selected) return;
    const it = byId(selected);
    if (target === 'heap') toHeap(it);
    else toBin(it, target);
  };

  const reset = () => {
    resetTest();
    setWhere(Object.fromEntries(ITEMS.map((i) => [i.id, 'shelf'])));
    setSelected(null);
    setMessage('Drag each thing into a bin. Or test it on the compost heap!');
  };

  const counts: Record<Bin, number> = { recycle: 0, compost: 0, rubbish: 0 };
  const rots = !!onHeap && rotsAway(onHeap);
  const sortedCount = ITEMS.filter((i) => where[i.id] !== 'shelf' && where[i.id] !== 'heap').length;

  return (
    <SceneSvg label="Sort rubbish into recycling, compost and rubbish bins">
      <text x={40} y={44} fontSize={16} fill={C.muted} className="caps">
        Where does it go?
      </text>
      <text x={590} y={44} textAnchor="end" fontSize={16} fontWeight={700} fill={C.ink}>
        Sorted: {sortedCount} / {ITEMS.length}
      </text>
      <rect x={34} y={152} width={556} height={10} rx={5} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      <rect x={34} y={272} width={556} height={10} rx={5} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />

      {/* Bins */}
      {BINS.map((b) => (
        <g key={b.id} onClick={() => tapTarget(b.id)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan role="button" aria-label={`${b.name} bin`}>
          <rect x={b.x + 6} y={BIN_Y + 8} width={BIN_W} height={BIN_H} rx={16} fill={C.ink} opacity={0.1} />
          <path
            d={`M${b.x},${BIN_Y + 30} L${b.x + BIN_W},${BIN_Y + 30} L${b.x + BIN_W - 12},${BIN_Y + BIN_H} L${b.x + 12},${BIN_Y + BIN_H} Z`}
            fill={shade(b.color, 0.55)}
            stroke={C.ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <rect x={b.x - 6} y={BIN_Y} width={BIN_W + 12} height={34} rx={10} fill={b.color} stroke={C.ink} strokeWidth={2.5} />
          <text x={b.x + BIN_W / 2} y={BIN_Y + 18} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.white}>
            {b.name}
          </text>
          <SceneEmoji emoji={b.emoji} x={b.x + BIN_W / 2} y={BIN_Y + BIN_H - 30} size={30} />
        </g>
      ))}

      {/* Compost test */}
      {!onHeap ? (
        <MessageBox x={640} y={60} w={320} h={110} text="Compost test: drag something onto the heap to see if it rots." max={28} size={17} />
      ) : months >= 1 ? (
        <ExplainCard x={640} y={60} w={320} prediction={guess} actual={rots ? YES : NO} because={onHeap.rot} onAgain={tryAnother} />
      ) : (
        <PredictCard x={640} y={60} w={320} question={`Will the ${onHeap.name} rot?`} options={[YES, NO]} prediction={guess} onPredict={setGuess} />
      )}
      <g onClick={() => tapTarget('heap')} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan role="button" aria-label="Compost heap">
        <path
          d={`M${HEAP.x},${HEAP.y + HEAP.h} Q${HEAP.x + HEAP.w / 2},${HEAP.y + 40} ${HEAP.x + HEAP.w},${HEAP.y + HEAP.h} Z`}
          fill={shade(C.brown, rots && months > 0 ? -0.2 * months : 0.25)}
          stroke={C.ink}
          strokeWidth={2.5}
        />
        <text x={HEAP.x + HEAP.w / 2} y={HEAP.y + HEAP.h - 14} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
          Compost heap
        </text>
        {onHeap && months > 0 && (
          <text x={HEAP.x + HEAP.w / 2} y={HEAP.y + 34} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
            {Math.max(1, Math.round(months * 2))} {Math.round(months * 2) > 1 ? 'months' : 'month'} later…
          </text>
        )}
      </g>
      {onHeap && months < 1 && (
        <SvgButton
          x={HEAP.x + 40}
          y={596}
          w={HEAP.w - 80}
          h={50}
          fontSize={17}
          label={months > 0 ? 'Waiting…' : 'Wait 2 months ▶'}
          onClick={wait}
          disabled={!guess || months > 0}
          color={C.teal}
          textColor={C.white}
        />
      )}
      <MessageBox x={40} y={300} w={550} h={70} text={message} max={58} size={16} />

      {/* Items */}
      {ITEMS.map((it, i) => {
        const w = where[it.id];
        let at: Pt;
        let size = 50;
        if (w === 'shelf') at = shelfSpot(i);
        else if (w === 'heap') {
          at = { x: HEAP.x + HEAP.w / 2, y: HEAP.y + 120 };
          size = 56;
        } else {
          const b = BINS.find((x) => x.id === w)!;
          const k = counts[w]++;
          at = { x: b.x + 40 + (k % 3) * 45, y: BIN_Y + 66 + Math.floor(k / 3) * 46 };
          size = 34;
        }
        const scale = w === 'heap' && rots ? 1 - (it.slowRot ? 0.3 : 0.75) * months : 1;
        const opacity = w === 'heap' && rots ? 1 - (it.slowRot ? 0.25 : 0.8) * months : 1;
        const sorted = w !== 'shelf' && w !== 'heap';
        return (
          <DragToken
            key={`${it.id}-${w}`}
            x={at.x}
            y={at.y}
            label={it.name}
            selected={selected === it.id}
            shakeKey={shake[it.id] ?? 0}
            disabled={sorted || (w === 'heap' && months > 0)}
            onTap={() => {
              play('tap');
              setSelected(selected === it.id ? null : it.id);
              setMessage(`The ${it.name}. Now tap a bin, or the compost heap.`);
            }}
            onDrop={(p) => dropAt(it, p)}
          >
            {selected === it.id && <circle r={38} fill={shade(C.yellow, 0.5)} stroke={C.ink} strokeWidth={2} />}
            <g transform={`scale(${scale})`} opacity={opacity}>
              <SceneEmoji emoji={it.emoji} x={0} y={0} size={size} />
            </g>
            {w === 'shelf' && (
              <text x={0} y={46} textAnchor="middle" fontSize={15} fill={C.ink}>
                {it.short}
              </text>
            )}
          </DragToken>
        );
      })}

      <SvgButton x={810} y={6} w={150} h={44} fontSize={16} label="Start again" onClick={reset} />
      <Callout at={[HEAP.x + 90, HEAP.y + HEAP.h - 40]} box={[648, 516]} w={170} icon={Sprout} title="Food → soil" />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[
        { x: 8, c: C.blue, e: '📰' },
        { x: 44, c: C.green, e: '🍌' },
        { x: 80, c: '#8a93a6', e: '🍬' },
      ].map((b) => (
        <g key={b.x}>
          <path d={`M${b.x},30 L${b.x + 32},30 L${b.x + 29},72 L${b.x + 3},72 Z`} fill={shade(b.c, 0.5)} stroke={C.ink} strokeWidth={2} />
          <rect x={b.x - 2} y={24} width={36} height={9} rx={3} fill={b.c} stroke={C.ink} strokeWidth={1.5} />
          <text x={b.x + 16} y={14} textAnchor="middle" dominantBaseline="central" fontSize={16} fontFamily={EMOJI_FONT}>
            {b.e}
          </text>
        </g>
      ))}
    </svg>
  );
}

const BIN_CHOICES = [
  { value: 'recycle', name: 'Recycling', label: '♻️ Recycling' },
  { value: 'compost', name: 'Compost', label: '🌱 Compost' },
  { value: 'rubbish', name: 'Rubbish', label: '🗑️ Rubbish' },
];
const BIN_NAME: Record<Bin, string> = { recycle: 'Recycling', compost: 'Compost', rubbish: 'Rubbish' };
const BIN_WHY: Record<Bin, string> = {
  recycle: 'Paper, card, metal, glass and bottles can be made into new things.',
  compost: 'Food scraps and leaves rot into rich soil.',
  rubbish: 'It can’t rot and can’t be recycled.',
};

function itemPic(it: Item) {
  return <EmojiPicture emoji={it.emoji} caption={it.name} />;
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const it = pick(ITEMS);
    return {
      prompt: `Which bin does the ${it.name} go in?`,
      visual: itemPic(it),
      choices: BIN_CHOICES,
      answer: it.bin,
      hint: 'Is it food, something that can be made new, or neither?',
      explain: [`The ${it.name}: ${BIN_WHY[it.bin]}`, `So it goes in ${BIN_NAME[it.bin]}.`],
    };
  }
  if (level === 1) {
    const target: Bin = pick(['compost', 'recycle'] as const);
    const right = pick(ITEMS.filter((i) => i.bin === target));
    // Paper and card can rot, so they are never 'wrong' answers for the compost.
    const wrong = shuffle(ITEMS.filter((i) => i.bin !== target && !(target === 'compost' && i.slowRot))).slice(0, 2);
    const options = shuffle([right, ...wrong]);
    return {
      prompt: target === 'compost' ? 'Which one can go in the compost?' : 'Which one can be recycled?',
      choices: options.map((it) => ({ value: it.id, name: it.name, label: <EmojiPicture emoji={it.emoji} caption={it.name} /> })),
      answer: right.id,
      hint: target === 'compost' ? 'Look for food, or part of a plant.' : 'Look for paper, card, metal, glass or a bottle.',
      explain: [`The ${right.name}: ${BIN_WHY[target]}`, `The others go somewhere else.`, `So the answer is the ${right.name}.`],
    };
  }
  const kind = pick(['rrr', 'rot'] as const);
  if (kind === 'rot') {
    const it = pick(ITEMS.filter((i) => !rotsAway(i)));
    return {
      prompt: `Will a ${it.name} rot into soil in the compost?`,
      visual: itemPic(it),
      choices: [
        { value: 'yes', name: 'yes', label: 'Yes' },
        { value: 'no', name: 'no', label: 'No' },
      ],
      answer: 'no',
      hint: 'Only food scraps and plant bits rot quickly. Is it one of those?',
      explain: [it.rot, 'So the answer is no.'],
    };
  }
  const scenarios = [
    { text: 'Using an old jar again to hold pencils.', answer: 'reuse', why: 'We use the jar again for something new.' },
    { text: 'Taking a lunchbox instead of using wrappers.', answer: 'reduce', why: 'We make less rubbish in the first place.' },
    { text: 'Putting a tin can in the recycling bin.', answer: 'recycle', why: 'The can will be made into something new.' },
    { text: 'Turning off the tap while brushing your teeth.', answer: 'reduce', why: 'We use less water.' },
    { text: 'Giving outgrown clothes to a friend.', answer: 'reuse', why: 'Someone else can wear them again.' },
    { text: 'Putting old newspapers in the recycling bin.', answer: 'recycle', why: 'The paper will be made into new paper.' },
  ];
  const s = pick(scenarios);
  const names: Record<string, string> = { reduce: 'Reduce', reuse: 'Reuse', recycle: 'Recycle' };
  return {
    prompt: `${s.text} Is that reduce, reuse or recycle?`,
    choices: [
      { value: 'reduce', name: 'Reduce', label: 'Reduce' },
      { value: 'reuse', name: 'Reuse', label: 'Reuse' },
      { value: 'recycle', name: 'Recycle', label: 'Recycle' },
    ],
    answer: s.answer,
    hint: 'Reduce = use less. Reuse = use again. Recycle = make into something new.',
    explain: [s.why, `So it is ${names[s.answer]}.`],
  };
}

export const recycling: Lesson = {
  id: 'recycling',
  title: 'Reduce, Reuse, Recycle',
  Thumb,
  Scene: RecyclingScene,
  sceneHint: 'Drag things into the bins · Drop one on the compost heap, guess, then wait',
  learn: {
    heading: 'Reduce, reuse, recycle',
    intro: 'We can help our planet by making less rubbish. Paper, cans, glass and bottles can be recycled into new things. Food scraps can rot into rich soil in a compost heap.',
    points: [
      { icon: Repeat, text: 'Reduce: use less. Reuse: use things again.' },
      { icon: Recycle, text: 'Recycle: paper, card, cans, glass and bottles get made into new things.' },
      { icon: Sprout, text: 'Compost: food scraps and leaves rot into soil.' },
    ],
  },
  steps: ['Pick up a thing.', 'Ask: is it food? Can it be made into something new?', 'Put it in the right bin.', 'Try the compost test: guess if it rots, then wait and see.'],
  example: {
    question: 'Where does a banana peel go?',
    visual: <EmojiPicture emoji="🍌" caption="banana peel" />,
    work: ['A banana peel is food.', 'Food scraps rot into rich soil.'],
    answer: 'It goes in the compost.',
  },
  grownups: [
    'Every town has its own recycling rules and bin colours. Look at your bins together and check what goes where.',
    'Rinse cans and bottles before recycling them.',
    'Start a small compost pot or watch fruit peel change over a couple of weeks.',
    'Talk about reducing and reusing first: they help even more than recycling.',
  ],
  makeQuestion,
};
