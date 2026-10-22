import { useState } from 'react';
import { ArrowUpRight, Calculator, CheckCheck, HandCoins } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, DragItem, Emoji, EmojiPicture, inside, Note, Tap } from '../shared/kit';
import type { Box } from '../shared/kit';
import { Coin, COINS, CoinsPicture, fewestCoins, sum } from '../shared/Coin';
import { Bill, BillPicture, NOTES } from './visuals/Money';

interface Item {
  emoji: string;
  name: string;
  price: number;
}

const ITEMS: Item[] = [
  { emoji: '🧩', name: 'puzzle', price: 16 },
  { emoji: '📘', name: 'book', price: 37 },
  { emoji: '🪁', name: 'kite', price: 64 },
  { emoji: '🎨', name: 'paint set', price: 82 },
];

const TRAY: Box = { x: 40, y: 316, w: 580, h: 184 };
const LINE = { x0: 70, x1: 930, y: 272 };

/** The change counted up from the price, smallest coins first: the way a shopkeeper counts. */
const countUpCoins = (amount: number) => [...fewestCoins(amount)].reverse();

function ChangeScene() {
  const [item, setItem] = useState(1);
  const [paid, setPaid] = useState(50);
  const [tray, setTray] = useState<number[]>([]);
  const [drag, setDrag] = useState<{ v: number; p: Pt } | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' } | null>({
    text: 'The book costs 37 coins and you paid with a 50 note. Count up from 37 to 50 with coins.',
    tone: 'info',
  });
  const it = ITEMS[item];
  const due = paid - it.price;
  const given = sum(tray);
  const left = due - given;

  const reset = (nextItem: number, nextPaid: number) => {
    setItem(nextItem);
    setPaid(nextPaid);
    setTray([]);
    setNote({ text: `The ${ITEMS[nextItem].name} costs ${ITEMS[nextItem].price} coins and you paid ${nextPaid}. Count up from ${ITEMS[nextItem].price} to ${nextPaid} with coins.`, tone: 'info' });
  };

  const chooseItem = (i: number) => {
    play('tap');
    const p = NOTES.find((n) => n > ITEMS[i].price) ?? 100;
    reset(i, p);
  };

  const chooseNote = (n: number) => {
    if (n <= it.price) {
      setNote({ text: `A ${n} note is not enough for ${it.price} coins. Pick a bigger note.`, tone: 'nudge' });
      return;
    }
    play('tap');
    reset(item, n);
  };

  const add = (v: number) => {
    if (tray.length >= 14) {
      setNote({ text: 'The tray is full. Tap a coin to take it back, or try bigger coins.', tone: 'nudge' });
      return;
    }
    const next = [...tray, v];
    play('pop');
    setTray(next);
    const t = sum(next);
    if (t === due) {
      play('correct');
      setNote({ text: `${it.price} + ${t} = ${paid}. That’s exactly the right change! Tap “Check by adding back” to prove it.`, tone: 'good' });
    } else if (t > due) {
      setNote({ text: `That’s ${t - due} too much change. Tap a coin in the tray to take it back.`, tone: 'nudge' });
    } else {
      setNote({ text: `You’ve counted up to ${it.price + t}. ${due - t} more to reach ${paid}.`, tone: 'info' });
    }
  };

  const removeAt = (i: number) => {
    play('tap');
    const next = tray.filter((_, j) => j !== i);
    setTray(next);
    setNote(null);
  };

  // Too much change stretches the line past what was paid, so the overshoot is visible.
  const end = Math.max(paid, it.price + given);
  const xAt = (v: number) => LINE.x0 + ((v - it.price) / Math.max(1, end - it.price)) * (LINE.x1 - LINE.x0);
  const paidX = xAt(paid);
  let run = it.price;
  const hops = tray.map((c) => {
    const from = run;
    run += c;
    return { from, to: run, c };
  });

  return (
    <SceneSvg label="Give change by counting up from the price">
      <text x={40} y={22} fontSize={15} fill={C.muted} className="caps">
        1 · What is being bought?
      </text>
      {ITEMS.map((s, i) => {
        const x = 40 + i * 150;
        const on = i === item;
        return (
          <Tap key={s.name} label={`${s.name}, ${s.price} coins`} onTap={() => chooseItem(i)}>
            <Card x={x} y={32} w={138} h={98} fill={on ? shade(C.yellow, 0.65) : C.card} stroke={on ? C.orange : C.ink}>
              <Emoji e={s.emoji} x={x + 69} y={64} size={40} />
              <text x={x + 69} y={114} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
                {s.price} coins
              </text>
            </Card>
          </Tap>
        );
      })}

      <text x={660} y={22} fontSize={15} fill={C.muted} className="caps">
        2 · Paid with
      </text>
      {NOTES.map((n, i) => {
        const x = 660 + i * 102;
        const on = n === paid;
        return (
          <Tap key={n} label={`Pay with a ${n} note`} onTap={() => chooseNote(n)}>
            <rect x={x} y={32} width={94} height={98} rx={14} fill={on ? shade(C.yellow, 0.65) : 'transparent'} stroke={on ? C.orange : C.line} strokeWidth={2} opacity={n <= it.price ? 0.4 : 1} />
            <g opacity={n <= it.price ? 0.4 : 1}>
              <Bill v={n} x={x + 47} y={81} w={80} h={48} />
            </g>
          </Tap>
        );
      })}

      {/* The count-up number line */}
      <text x={40} y={178} fontSize={15} fill={C.muted} className="caps">
        3 · Count up from the price to what was paid
      </text>
      <line x1={LINE.x0} y1={LINE.y} x2={paidX} y2={LINE.y} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {paidX < LINE.x1 && <line x1={paidX} y1={LINE.y} x2={LINE.x1} y2={LINE.y} stroke={C.red} strokeWidth={3} strokeDasharray="8 6" />}
      {hops.map((h, i) => {
        const a = xAt(h.from);
        const b = xAt(h.to);
        const over = h.to > paid;
        return (
          <g key={i}>
            <path d={`M${a},${LINE.y - 4} Q${(a + b) / 2},${LINE.y - 60} ${b},${LINE.y - 4}`} fill="none" stroke={over ? C.red : C.teal} strokeWidth={3} />
            {b - a >= 26 && (
              <text x={(a + b) / 2} y={LINE.y - 44} textAnchor="middle" fontSize={15} fontWeight={700} fill={over ? C.red : shade(C.teal, -0.3)}>
                +{h.c}
              </text>
            )}
            {h.to !== paid && b - a >= 30 && Math.abs(b - paidX) >= 30 && (
              <text x={b} y={LINE.y + 26} textAnchor="middle" fontSize={15} fill={over ? C.red : C.ink2}>
                {h.to}
              </text>
            )}
          </g>
        );
      })}
      <circle cx={LINE.x0} cy={LINE.y} r={8} fill={C.orange} stroke={C.ink} strokeWidth={2} />
      <text x={LINE.x0} y={LINE.y + 30} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
        {it.price}
      </text>
      <circle cx={paidX} cy={LINE.y} r={8} fill={C.green} stroke={C.ink} strokeWidth={2} />
      <text x={paidX} y={LINE.y + 30} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
        {paid}
      </text>

      {/* Change tray */}
      <Card x={TRAY.x} y={TRAY.y} w={TRAY.w} h={TRAY.h} fill={shade(C.wood, 0.6)}>
        <text x={TRAY.x + 18} y={TRAY.y + 28} fontSize={15} fill={C.ink2} className="caps">
          Change tray · tap a coin to take it back
        </text>
        {tray.length === 0 && (
          <text x={TRAY.x + TRAY.w / 2} y={TRAY.y + 110} textAnchor="middle" fontSize={19} fill={C.muted}>
            Drag or tap coins from the till
          </text>
        )}
      </Card>
      {tray.slice(0, 14).map((v, i) => {
        const x = TRAY.x + 52 + (i % 7) * 80;
        const y = TRAY.y + 76 + Math.floor(i / 7) * 74;
        return (
          <Tap key={i} label={`Take back the ${v} coin`} onTap={() => removeAt(i)}>
            <circle cx={x} cy={y} r={36} fill="transparent" />
            <Coin v={v} x={x} y={y} scale={0.95} />
          </Tap>
        );
      })}

      <Card x={648} y={TRAY.y} w={312} h={TRAY.h}>
        <text x={668} y={TRAY.y + 32} fontSize={17} fill={C.ink2}>
          Paid − price
        </text>
        <text x={940} y={TRAY.y + 32} textAnchor="end" fontSize={20} fontWeight={700} fill={C.ink}>
          {paid} − {it.price}
        </text>
        <text x={668} y={TRAY.y + 66} fontSize={17} fill={C.ink2}>
          Change given
        </text>
        <text x={940} y={TRAY.y + 66} textAnchor="end" fontSize={20} fontWeight={700} fill={left === 0 ? C.green : C.ink}>
          {given} coins
        </text>
        <text x={668} y={TRAY.y + 102} fontSize={18} fontWeight={700} fill={left === 0 ? C.green : left < 0 ? C.red : C.ink}>
          {left > 0 ? `${left} more to give` : left === 0 ? 'Exactly right!' : `${-left} too much`}
        </text>
        <SvgButton
          x={668}
          y={TRAY.y + 120}
          w={140}
          h={50}
          fontSize={15}
          label="Count-up way"
          onClick={() => {
            play('whoosh');
            const coins = countUpCoins(due);
            setTray(coins);
            let t = it.price;
            const stops = coins.map((c) => (t += c));
            setNote({ text: `Count up: ${it.price} → ${stops.join(' → ')}. The change is ${coins.join(' + ')} = ${due}.`, tone: 'good' });
          }}
        />
        <SvgButton x={820} y={TRAY.y + 120} w={122} h={50} fontSize={15} label="Clear" onClick={() => { setTray([]); setNote(null); }} />
      </Card>
      <SvgButton
        x={648}
        y={TRAY.y + TRAY.h + 8}
        w={200}
        h={46}
        fontSize={15}
        label="Check by adding back"
        disabled={tray.length === 0}
        onClick={() => {
          const ok = given === due;
          play(ok ? 'correct' : 'wrong');
          setNote({
            text: ok
              ? `Price + change = paid: ${it.price} + ${given} = ${paid}. It checks out!`
              : `${it.price} + ${given} = ${it.price + given}, not ${paid}. ${given < due ? 'Give a bit more.' : 'Take some back.'}`,
            tone: ok ? 'good' : 'nudge',
          });
        }}
      />
      <SvgButton x={860} y={TRAY.y + TRAY.h + 8} w={100} h={46} fontSize={15} label="Say it" onClick={() => speak(`The ${it.name} costs ${it.price} coins. You paid ${paid}. The change is ${due} coins.`, { force: true })} />
      {note && <Note x={40} y={TRAY.y + TRAY.h + 8} w={596} text={note.text} tone={note.tone} />}

      {/* The till */}
      {COINS.map((v, i) => (
        <DragItem
          key={v}
          at={{ x: 110 + i * 156, y: 628 }}
          r={44}
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

      <Callout at={[LINE.x0, LINE.y]} box={[470, 138]} w={250} icon={ArrowUpRight} title="Count up" text="Start at the price and add coins until you reach what was paid." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Bill v={50} x={42} y={34} w={64} h={38} />
      <Coin v={10} x={86} y={56} scale={0.5} />
      <Coin v={2} x={104} y={36} scale={0.45} />
    </svg>
  );
}

function changeQuestion(price: number, paid: number, count: number): Question {
  const change = paid - price;
  const coins = countUpCoins(change);
  let t = price;
  const stops = coins.map((c) => (t += c));
  return choiceQuestion({
    prompt: `Something costs ${price} coins. You pay with a ${paid} note. How much change should you get?`,
    visual: <BillPicture v={paid} />,
    right: { value: String(change) },
    wrong: numberChoices(change, { count, min: 1, spread: change > 20 ? 6 : 3 })
      .filter((c) => c !== String(change))
      .map((value) => ({ value })),
    hint: `Count up from ${price} to ${paid}. Make a round number first.`,
    explain: [`Count up from ${price}: ${[price, ...stops].join(' → ')}.`, `The jumps add up to ${coins.join(' + ')} = ${change}.`, `So the change is ${change} coins.`],
  });
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.7) return changeQuestion(rand(11, 18), 20, 3);
    const price = rand(12, 18);
    const change = 20 - price;
    const right = countUpCoins(change);
    const wrongSet = countUpCoins(change + pick([1, 2]));
    return choiceQuestion({
      prompt: `You buy a snack for ${price} coins and pay with 20. Which coins are the right change?`,
      right: { value: right.join(' + '), name: `${right.join(' + ')} coins` },
      wrong: [{ value: wrongSet.join(' + ') }, { value: countUpCoins(Math.max(1, change - 1)).join(' + ') }],
      hint: `How many coins does it take to count up from ${price} to 20?`,
      explain: [`Count up from ${price} to 20: that is ${change}.`, `${right.join(' + ')} = ${change}.`, `So ${right.join(' + ')} is the right change.`],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.6) return changeQuestion(rand(21, 47), 50, 4);
    const price = rand(21, 46);
    const right = 50 - price;
    const wrong = right + (right > 10 ? pick([-1, 1]) : 1) * pick([1, 2, 10]);
    const given = Math.random() < 0.5 ? right : wrong;
    const ok = given === right;
    return choiceQuestion({
      prompt: `A shopkeeper sells a book for ${price} coins. You paid 50 and got ${given} coins change. Is that right?`,
      visual: <CoinsPicture values={fewestCoins(given)} label={`${given} coins of change`} />,
      right: { value: ok ? 'Yes' : 'No', name: ok ? 'Yes, it is right' : 'No, it is wrong' },
      wrong: [{ value: ok ? 'No' : 'Yes' }],
      hint: 'Add the change back on to the price. Do you get what you paid?',
      explain: [`Add back: ${price} + ${given} = ${price + given}.`, ok ? `That is 50, so Yes, the change is right.` : `That is not 50, so No: the change should be ${right}.`],
    });
  }

  if (Math.random() < 0.6) return changeQuestion(rand(51, 96), 100, 4);
  const price = rand(52, 94);
  const owed = 100 - price;
  const given = owed - rand(2, Math.min(15, owed - 1));
  const more = owed - given;
  return choiceQuestion({
    prompt: `You pay 100 for a game costing ${price}. You get ${given} coins back. How many more coins should you get?`,
    visual: <EmojiPicture e="🎮" caption={`Costs ${price} coins`} />,
    right: { value: String(more) },
    wrong: numberChoices(more, { count: 4, min: 1, spread: 4 })
      .filter((c) => c !== String(more))
      .map((value) => ({ value })),
    hint: 'First work out the full change, then compare it with what you got.',
    explain: [`Full change: 100 − ${price} = ${owed}.`, `You got ${given}, so ${owed} − ${given} = ${more}.`, `You should get ${more} more coins.`],
  });
}

export const makingChange: Lesson = {
  id: 'making-change',
  title: 'Making Change',
  Thumb,
  Scene: ChangeScene,
  sceneHint: 'Pick an item and a note · Count up the change with coins',
  learn: {
    heading: 'Giving and checking change',
    intro: 'When you pay with more than the price, you get the difference back as change. Shopkeepers find it by counting up from the price to what you paid.',
    points: [
      { icon: ArrowUpRight, text: 'Count up from the price to what was paid.' },
      { icon: HandCoins, text: 'Jump to a round number first, then make bigger jumps.' },
      { icon: Calculator, text: 'Change = paid − price.' },
      { icon: CheckCheck, text: 'Check: price + change = paid.' },
    ],
  },
  steps: ['Find the price and what was paid.', 'Count up from the price to the next round number.', 'Keep counting up in bigger jumps until you reach what was paid.', 'Add the jumps: that is the change. Check by adding it back.'],
  example: {
    question: 'A book costs 37 coins. You pay with a 50 note. What is the change?',
    visual: <BillPicture v={50} />,
    work: ['Count up from 37 to 40: that is 3.', 'Count up from 40 to 50: that is 10.', '3 + 10 = 13. Check: 37 + 13 = 50.'],
    answer: 'The change is 13 coins.',
  },
  grownups: [
    'At the shop, ask your child to work out the change before the cashier gives it, then check together.',
    'Counting up (37 → 40 → 50) is easier than subtracting in your head, and it is how many shopkeepers do it.',
    'Practise with play money at home: one person shops, the other gives change.',
  ],
  makeQuestion,
};
