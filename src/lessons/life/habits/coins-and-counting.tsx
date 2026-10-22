import { useState } from 'react';
import { Calculator, Coins, ShoppingBasket, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, DragItem, Emoji, EmojiPicture, inside, Lines, Note, Tap } from '../shared/kit';
import type { Box } from '../shared/kit';
import { Coin, COINS, CoinsPicture, fewestCoins, sum } from '../shared/Coin';

interface ShopItem {
  emoji: string;
  name: string;
  price: number;
}

const SHOP: ShopItem[] = [
  { emoji: '🍎', name: 'apple', price: 6 },
  { emoji: '✏️', name: 'pencil', price: 9 },
  { emoji: '🧃', name: 'juice', price: 15 },
  { emoji: '📒', name: 'notebook', price: 27 },
  { emoji: '⚽', name: 'ball', price: 48 },
];

const TRAY: Box = { x: 40, y: 206, w: 580, h: 296 };
const PER_ROW = 7;
const MAX_IN_TRAY = PER_ROW * 3;

function traySpot(i: number): Pt {
  return { x: TRAY.x + 62 + (i % PER_ROW) * 76, y: TRAY.y + 92 + Math.floor(i / PER_ROW) * 80 };
}

/** Running totals, e.g. 10, 15, 17 — the way we count on with coins. */
function countOn(values: number[]): number[] {
  let t = 0;
  return values.map((v) => (t += v));
}

function CoinsScene() {
  const [item, setItem] = useState(2);
  const [tray, setTray] = useState<number[]>([]);
  const [drag, setDrag] = useState<{ v: number; p: Pt } | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' } | null>(null);
  const shop = SHOP[item];
  const total = sum(tray);
  const diff = shop.price - total;
  const best = fewestCoins(shop.price);

  const afterChange = (next: number[]) => {
    const t = sum(next);
    if (t === shop.price) {
      play('correct');
      setNote(
        next.length === best.length
          ? { text: `Exactly ${shop.price} coins, and with the fewest coins (${best.length})! Super paying.`, tone: 'good' }
          : { text: `Exactly ${shop.price} coins! You used ${next.length} coins. Can you pay with only ${best.length}? Try “Fewest coins”.`, tone: 'good' },
      );
    } else if (t > shop.price) {
      setNote({ text: `That’s ${t - shop.price} too many. Tap a coin in the tray to take it back.`, tone: 'nudge' });
    } else {
      setNote(null);
    }
  };

  const add = (v: number) => {
    if (tray.length >= MAX_IN_TRAY) {
      setNote({ text: 'The tray is full! Try bigger coins, or take some back.', tone: 'nudge' });
      return;
    }
    play('pop');
    const next = [...tray, v];
    setTray(next);
    afterChange(next);
  };

  const removeAt = (i: number) => {
    play('tap');
    const next = tray.filter((_, j) => j !== i);
    setTray(next);
    afterChange(next);
  };

  const choose = (i: number) => {
    play('tap');
    setItem(i);
    setTray([]);
    setNote({ text: `The ${SHOP[i].name} costs ${SHOP[i].price} coins. Put coins in the tray to pay exactly.`, tone: 'info' });
  };

  const trail = countOn(tray);
  const shown = trail.length > 6 ? ['…', ...trail.slice(-5)] : trail;
  const barW = 270;
  const fill = Math.min(1.15, total / shop.price);

  return (
    <SceneSvg label="Pay for something with coins">
      {/* The shop */}
      <text x={40} y={40} fontSize={15} fill={C.muted} className="caps">
        Pick something to buy
      </text>
      {SHOP.map((s, i) => {
        const x = 40 + i * 152;
        const on = i === item;
        return (
          <Tap key={s.name} label={`${s.name}, ${s.price} coins`} onTap={() => choose(i)}>
            <Card x={x} y={54} w={140} h={126} fill={on ? shade(C.yellow, 0.65) : C.card} stroke={on ? C.orange : C.ink}>
              <Emoji e={s.emoji} x={x + 70} y={92} size={46} />
              <text x={x + 70} y={138} textAnchor="middle" fontSize={16} fill={C.ink2}>
                {s.name}
              </text>
              <text x={x + 70} y={164} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
                {s.price} coins
              </text>
            </Card>
          </Tap>
        );
      })}
      <SvgButton x={820} y={86} w={140} h={54} fontSize={18} label="Say it" onClick={() => speak(`The ${shop.name} costs ${shop.price} coins. You have put in ${total} coins.`, { force: true })} />

      {/* The pay tray */}
      <Card x={TRAY.x} y={TRAY.y} w={TRAY.w} h={TRAY.h} fill={shade(C.wood, 0.6)}>
        <text x={TRAY.x + 20} y={TRAY.y + 32} fontSize={15} fill={C.ink2} className="caps">
          Pay tray · tap a coin to take it back
        </text>
        {tray.length === 0 && (
          <text x={TRAY.x + TRAY.w / 2} y={TRAY.y + 160} textAnchor="middle" fontSize={20} fill={C.muted}>
            Drag or tap coins from your purse
          </text>
        )}
      </Card>
      {tray.map((v, i) => {
        const p = traySpot(i);
        return (
          <Tap key={i} label={`Take back the ${v} coin`} onTap={() => removeAt(i)}>
            <circle cx={p.x} cy={p.y} r={36} fill="transparent" />
            <Coin v={v} x={p.x} y={p.y} />
          </Tap>
        );
      })}

      {/* How much is in the tray */}
      <Card x={648} y={TRAY.y} w={312} h={TRAY.h}>
        <text x={668} y={TRAY.y + 36} fontSize={17} fill={C.ink2}>
          Price
        </text>
        <text x={940} y={TRAY.y + 36} textAnchor="end" fontSize={22} fontWeight={700} fill={C.ink}>
          {shop.emoji} {shop.price} coins
        </text>
        <text x={668} y={TRAY.y + 72} fontSize={17} fill={C.ink2}>
          In the tray
        </text>
        <text x={940} y={TRAY.y + 72} textAnchor="end" fontSize={22} fontWeight={700} fill={diff === 0 ? C.green : C.ink}>
          {total} coins
        </text>
        <rect x={668} y={TRAY.y + 90} width={barW} height={20} rx={10} fill={C.paper} />
        <rect x={668} y={TRAY.y + 90} width={Math.min(barW, (barW / 1.15) * fill)} height={20} rx={10} fill={diff < 0 ? C.orange : diff === 0 ? C.green : C.yellow} />
        <line x1={668 + barW / 1.15} x2={668 + barW / 1.15} y1={TRAY.y + 84} y2={TRAY.y + 116} stroke={C.ink} strokeWidth={3} />
        <text x={668} y={TRAY.y + 142} fontSize={18} fontWeight={700} fill={diff === 0 ? C.green : C.ink}>
          {diff > 0 ? `${diff} more to go` : diff === 0 ? 'Exactly right!' : `${-diff} too many`}
        </text>
        <text x={668} y={TRAY.y + 172} fontSize={15} fill={C.muted}>
          Count on:
        </text>
        <Lines text={shown.length ? shown.join(', ') : '–'} x={668} y={TRAY.y + 196} max={30} size={18} weight={600} />
        <SvgButton x={668} y={TRAY.y + 226} w={150} h={50} fontSize={16} label="Fewest coins" onClick={() => {
          play('whoosh');
          setTray(best);
          setNote({ text: `Biggest coins first: ${best.join(' + ')} = ${shop.price}. That’s only ${best.length} ${best.length === 1 ? 'coin' : 'coins'}!`, tone: 'good' });
        }} />
        <SvgButton x={830} y={TRAY.y + 226} w={112} h={50} fontSize={16} label="Clear" onClick={() => { setTray([]); setNote(null); }} />
      </Card>

      {/* The purse */}
      <text x={40} y={576} fontSize={15} fill={C.muted} className="caps">
        Your purse · drag or tap a coin
      </text>
      {COINS.map((v, i) => (
        <DragItem
          key={v}
          at={{ x: 100 + i * 150, y: 628 }}
          r={46}
          label={`${v} coin`}
          dragging={drag?.v === v}
          onMove={(p) => setDrag({ v, p })}
          onDrop={(p) => {
            setDrag(null);
            if (inside(p, TRAY)) add(v);
          }}
          onTap={() => add(v)}
        >
          <Coin v={v} x={0} y={0} />
        </DragItem>
      ))}
      {drag && (
        <g transform={`translate(${drag.p.x} ${drag.p.y})`} style={{ pointerEvents: 'none' }}>
          <Coin v={drag.v} x={0} y={0} scale={1.1} />
        </g>
      )}
      {note && <Note x={40} y={TRAY.y + TRAY.h + 8} w={920} text={note.text} tone={note.tone} />}

      <Callout at={[668 + barW / 1.15, TRAY.y + 100]} box={[380, 20]} w={240} icon={Calculator} title="Count on" text="Start with the biggest coin, then count on with each smaller coin." />
      <Callout at={[850, 628]} box={[60, 300]} w={240} icon={Coins} title="Big coins first" text="Using big coins first means you need fewer coins." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Coin v={10} x={34} y={44} scale={0.62} />
      <Coin v={5} x={66} y={30} scale={0.55} />
      <Coin v={50} x={86} y={54} scale={0.5} />
    </svg>
  );
}

const coinChoice = (v: number) => ({
  value: String(v),
  name: `${v} coin`,
  label: (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${v} coin`}>
      <Coin v={v} x={50} y={48} scale={1.1} />
    </svg>
  ),
});

function totalQuestion(values: number[], count: number): Question {
  const sorted = [...values].sort((a, b) => b - a);
  const total = sum(sorted);
  return choiceQuestion({
    prompt: 'How many coins are these worth altogether?',
    visual: <CoinsPicture values={shuffle(values)} />,
    right: { value: String(total) },
    wrong: numberChoices(total, { count, min: 1, spread: total > 20 ? 6 : 3 })
      .filter((c) => c !== String(total))
      .map((value) => ({ value })),
    hint: 'Start with the biggest coin, then count on with the others.',
    explain: [`Start with the biggest coin: ${sorted[0]}.`, `Count on: ${countOn(sorted).join(', ')}.`, `Altogether: ${total} coins.`],
  });
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.6) {
      const n = rand(2, 3);
      const values = Array.from({ length: n }, () => pick([1, 2, 5, 10]));
      return totalQuestion(values, 3);
    }
    const values = shuffle([...COINS]).slice(0, rand(2, 3));
    const max = Math.max(...values);
    return choiceQuestion({
      prompt: 'Which coin is worth the most?',
      right: coinChoice(max),
      wrong: values.filter((v) => v !== max).map(coinChoice),
      hint: 'Look at the number on each coin, not just its size.',
      explain: ['Read the number on each coin.', `${max} is the biggest number.`, `So the ${max} coin is worth the most.`],
    });
  }

  if (level === 1) {
    const kind = rand(0, 2);
    if (kind === 0) {
      const values = [pick([10, 20, 50]), pick([5, 10, 20]), ...Array.from({ length: rand(1, 2) }, () => pick([1, 2, 5]))];
      return totalQuestion(values, 4);
    }
    if (kind === 1) {
      const target = rand(8, 40);
      const right = fewestCoins(target);
      // Wrong sets swap one coin for a neighbour, so the total is close but not equal.
      const wrongs = new Set<string>();
      for (let guard = 0; wrongs.size < 2 && guard < 40; guard++) {
        const set = [...right];
        const i = rand(0, set.length - 1);
        const k = COINS.indexOf(set[i] as (typeof COINS)[number]);
        set[i] = COINS[Math.min(COINS.length - 1, Math.max(0, k + (Math.random() < 0.5 ? -1 : 1)))];
        if (sum(set) !== target) wrongs.add(set.sort((a, b) => b - a).join(' + '));
      }
      const rightText = right.join(' + ');
      return choiceQuestion({
        prompt: `Which coins make exactly ${target}?`,
        right: { value: rightText },
        wrong: [...wrongs].map((value) => ({ value })),
        hint: 'Add up each set of coins. Which one lands exactly on the price?',
        explain: [`Add the coins in each set.`, `${rightText} = ${target}.`, `So ${rightText} makes exactly ${target}.`],
      });
    }
    const it = pick(SHOP.slice(1, 4));
    const have = rand(Math.max(1, it.price - 12), it.price - 1);
    const more = it.price - have;
    return choiceQuestion({
      prompt: `You have ${have} coins. The ${it.name} costs ${it.price} coins. How many more coins do you need?`,
      visual: <EmojiPicture e={it.emoji} caption={`${it.name}: ${it.price} coins`} />,
      right: { value: String(more) },
      wrong: numberChoices(more, { count: 4, min: 1, spread: 3 })
        .filter((c) => c !== String(more))
        .map((value) => ({ value })),
      hint: `Count on from ${have} until you reach ${it.price}.`,
      explain: [`Count on from ${have} to ${it.price}.`, `${it.price} − ${have} = ${more}.`, `You need ${more} more coins.`],
    });
  }

  // Level 2: fewest coins, and change.
  if (Math.random() < 0.5) {
    const target = rand(11, 99);
    const best = fewestCoins(target);
    return choiceQuestion({
      prompt: `What is the fewest number of coins you need to pay exactly ${target}?`,
      visual: <CoinsPicture values={[...COINS]} label="Coins: 1, 2, 5, 10, 20 and 50" />,
      right: { value: String(best.length) },
      wrong: numberChoices(best.length, { count: 4, min: 1, spread: 2 })
        .filter((c) => c !== String(best.length))
        .map((value) => ({ value })),
      hint: 'Use the biggest coin you can each time, and keep going until you reach the price.',
      explain: [`Biggest coins first: ${best.join(' + ')} = ${target}.`, `Count the coins: that is ${best.length}.`],
    });
  }
  const pay = pick([20, 50]);
  const price = rand(Math.floor(pay / 2), pay - 2);
  const change = pay - price;
  return choiceQuestion({
    prompt: `You pay with a ${pay} coin for a toy that costs ${price}. How much change do you get back?`,
    visual: <CoinsPicture values={[pay]} label={`A ${pay} coin`} />,
    right: { value: String(change) },
    wrong: numberChoices(change, { count: 4, min: 1, spread: 4 })
      .filter((c) => c !== String(change))
      .map((value) => ({ value })),
    hint: `Count on from ${price} up to ${pay}.`,
    explain: [`Count on from ${price} to ${pay}.`, `${pay} − ${price} = ${change}.`, `Your change is ${change} coins.`],
  });
}

export const coinsAndCounting: Lesson = {
  id: 'coins-and-counting',
  title: 'Counting Coins',
  Thumb,
  Scene: CoinsScene,
  sceneHint: 'Pick something to buy · Drag or tap coins to pay exactly',
  learn: {
    heading: 'Paying with coins',
    intro: 'Each coin has a number that tells you what it is worth. To pay, we add the coins until we reach the price exactly.',
    points: [
      { icon: Coins, text: 'Read the number on a coin to know what it is worth.' },
      { icon: Calculator, text: 'Start with the biggest coin, then count on.' },
      { icon: ShoppingBasket, text: 'Pay the exact price: not too little, not too much.' },
      { icon: Sparkles, text: 'Using big coins first means you need fewer coins.' },
    ],
  },
  steps: ['Look at the price.', 'Pick the biggest coin that still fits.', 'Count on with smaller coins.', 'Stop when you reach the price exactly.'],
  example: {
    question: 'A juice costs 15 coins. Which coins can you use, with as few coins as possible?',
    visual: <CoinsPicture values={[10, 5]} />,
    work: ['The biggest coin that fits is 10.', 'Count on: 10, then 5 more makes 15.', 'That is just 2 coins.'],
    answer: 'A 10 coin and a 5 coin make 15.',
  },
  grownups: [
    'Let your child count real coins at the shop or at home, starting with the biggest coin and counting on.',
    'Play “shop” with price tags on toys. Take turns being the shopkeeper and giving change.',
    'Ask “Can you make 12 a different way?” Many answers are right, and that’s great thinking.',
  ],
  makeQuestion,
};
