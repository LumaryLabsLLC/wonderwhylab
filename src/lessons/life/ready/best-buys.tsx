import { useState } from 'react';
import { Divide, PackageOpen, Tag, Trash2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { fmt } from '../../../lib/answers';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, Emoji, EmojiPicture, Note, Tap } from '../shared/kit';

interface Pack {
  n: number;
  price: number;
  /** Shown as a badge, e.g. "3 for 2" (buy 3, pay for 2). */
  offer?: string;
}

const PRODUCTS: { emoji: string; name: string; packs: Pack[]; spoils?: boolean }[] = [
  { emoji: '🍪', name: 'Cookies', packs: [{ n: 4, price: 10 }, { n: 10, price: 20 }, { n: 20, price: 50 }] },
  { emoji: '🧃', name: 'Juice boxes', packs: [{ n: 1, price: 3 }, { n: 3, price: 6, offer: '3 for 2' }, { n: 12, price: 30 }] },
  { emoji: '🥛', name: 'Yogurts', packs: [{ n: 2, price: 4 }, { n: 8, price: 12 }, { n: 16, price: 20 }], spoils: true },
];

const packName = (p: Pack) => `${p.n} for ${p.price}`;
const unit = (p: Pack) => p.price / p.n;

/** Buying whole packs to get at least `need` items. */
function forNeed(p: Pack, need: number) {
  const k = Math.ceil(need / p.n);
  return { k, cost: k * p.price, spare: k * p.n - need };
}

function ShopScene() {
  const [prod, setProd] = useState(0);
  const [shown, setShown] = useState<boolean[]>([false, false, false]);
  const [need, setNeed] = useState(6);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' }>({
    text: 'Tap each pack to work out its price for one item: price ÷ how many.',
    tone: 'info',
  });
  const P = PRODUCTS[prod];
  const allShown = shown.every(Boolean);
  const best = Math.min(...P.packs.map(unit));
  const plans = P.packs.map((p) => forNeed(p, need));
  const cheapest = Math.min(...plans.map((x) => x.cost));

  const reveal = (i: number) => {
    const p = P.packs[i];
    play('pop');
    const next = shown.map((s, j) => s || j === i);
    setShown(next);
    if (next.every(Boolean)) {
      const bi = P.packs.findIndex((q) => unit(q) === best);
      const biggest = P.packs.length - 1;
      setNote({
        text:
          bi === biggest
            ? `${packName(P.packs[bi])} is cheapest for each item. Now check: do you really need that many?`
            : `${packName(P.packs[bi])} is cheapest for each item, not the biggest pack! Bigger isn’t always better value.`,
        tone: 'good',
      });
    } else setNote({ text: `${p.price} ÷ ${p.n} = ${fmt(unit(p))} coins for each one.`, tone: 'info' });
  };

  const BAR = { x: 210, y: 300, max: 360, per: 110 };

  return (
    <SceneSvg label="Compare pack sizes by working out the price of each item">
      {PRODUCTS.map((p, i) => (
        <SvgButton
          key={p.name}
          x={40 + i * 216}
          y={20}
          w={204}
          h={56}
          fontSize={18}
          label={`${p.emoji} ${p.name}`}
          active={i === prod}
          color={i === prod ? shade(C.yellow, 0.6) : C.card}
          onClick={() => {
            setProd(i);
            setShown([false, false, false]);
            setNote({ text: `Tap each pack of ${p.name.toLowerCase()} to find the price for one.`, tone: 'info' });
          }}
        />
      ))}

      {P.packs.map((p, i) => {
        const x = 40 + i * 210;
        return (
          <Tap key={packName(p)} label={`${p.n} ${P.name.toLowerCase()} for ${p.price} coins`} onTap={() => reveal(i)}>
            <Card x={x} y={96} w={196} h={168} fill={shown[i] ? shade(C.blue, 0.88) : C.card}>
              <Emoji e={P.emoji} x={x + 98} y={142} size={p.n >= 10 ? 54 : 44} />
              {p.n > 1 && (
                <text x={x + 150} y={130} fontSize={18} fontWeight={800} fill={C.ink2}>
                  ×{p.n}
                </text>
              )}
              <text x={x + 98} y={210} textAnchor="middle" fontSize={22} fontWeight={800} fill={C.ink}>
                {p.n} for {p.price}
              </text>
              <text x={x + 98} y={240} textAnchor="middle" fontSize={15} fill={C.ink2}>
                {p.offer ? 'Offer: buy 3, pay for 2' : 'coins'}
              </text>
            </Card>
            {p.offer && (
              <g>
                <circle cx={x + 176} cy={104} r={30} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
                <text x={x + 176} y={100} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.ink}>
                  3 for
                </text>
                <text x={x + 176} y={118} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.ink}>
                  2!
                </text>
              </g>
            )}
          </Tap>
        );
      })}

      <text x={40} y={290} fontSize={15} fill={C.muted} className="caps">
        Price for one
      </text>
      {P.packs.map((p, i) => {
        const y = BAR.y + 14 + i * 64;
        const u = unit(p);
        const w = Math.min(BAR.max, u * BAR.per);
        const isBest = allShown && u === best;
        return (
          <g key={packName(p)}>
            <text x={40} y={y + 30} fontSize={18} fontWeight={700} fill={C.ink}>
              {packName(p)}
            </text>
            {shown[i] ? (
              <>
                <rect x={BAR.x - 60} y={y + 6} width={w} height={36} rx={8} fill={isBest ? C.green : shade(C.blue, 0.5)} stroke={isBest ? C.ink : 'none'} strokeWidth={2} />
                <text x={BAR.x - 60 + w + 10} y={y + 31} fontSize={17} fontWeight={700} fill={C.ink}>
                  {`${p.price} ÷ ${p.n} = ${fmt(u)} each${isBest ? '  ✓' : ''}`}
                </text>
              </>
            ) : (
              <text x={BAR.x - 60} y={y + 30} fontSize={16} fill={C.muted}>
                Tap the pack to work it out
              </text>
            )}
          </g>
        );
      })}

      {/* How many do you need? */}
      <Card x={680} y={96} w={280} h={424}>
        <text x={700} y={126} fontSize={15} fill={C.muted} className="caps">
          How many do you need?
        </text>
        <SvgButton x={700} y={140} w={60} h={52} fontSize={24} label="−" title="Need fewer" disabled={need <= 1} onClick={() => setNeed(need - 1)} />
        <text x={820} y={176} textAnchor="middle" fontSize={26} fontWeight={800} fill={C.ink}>
          {need}
        </text>
        <SvgButton x={880} y={140} w={60} h={52} fontSize={24} label="+" title="Need more" disabled={need >= 24} onClick={() => setNeed(need + 1)} />
        {P.packs.map((p, i) => {
          const pl = plans[i];
          const y = 214 + i * 82;
          const top = pl.cost === cheapest;
          return (
            <g key={packName(p)}>
              <rect x={694} y={y} width={252} height={72} rx={12} fill={top ? shade(C.green, 0.75) : C.paper} stroke={top ? C.ink : C.line} strokeWidth={1.5} />
              <text x={708} y={y + 28} fontSize={16} fontWeight={700} fill={C.ink}>
                {`${pl.k} × (${packName(p)}) = ${pl.cost}`}
              </text>
              <text x={708} y={y + 54} fontSize={15} fill={pl.spare > 0 && P.spoils ? C.red : C.ink2}>
                {pl.spare === 0 ? 'No spares' : `${pl.spare} spare${P.spoils ? ' (may go off!)' : ''}`}
              </text>
            </g>
          );
        })}
        <text x={700} y={480} fontSize={15} fill={C.ink2}>
          {P.spoils ? 'Yogurts go off in about a week.' : 'Spares are fine if they keep.'}
        </text>
        <text x={700} y={502} fontSize={15} fill={C.ink2}>
          Green = cheapest for {need}.
        </text>
      </Card>

      <Note x={40} y={526} w={620} text={note.text} tone={note.tone} />
      <SvgButton x={680} y={540} w={140} h={50} fontSize={16} label="Say it" onClick={() => speak(`${P.packs.map((p) => `${p.n} for ${p.price}`).join(', ')}. Divide the price by how many to compare.`, { force: true })} />
      <Callout at={[BAR.x - 60, BAR.y + 38]} box={[440, 262]} w={210} icon={Divide} title="Unit price" text="Price ÷ number of items = the price for one. Smaller is better value." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={22} width={30} height={40} rx={5} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <rect x={46} y={12} width={64} height={50} rx={6} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <rect x={10} y={68} width={44} height={7} rx={3} fill={shade(C.blue, 0.5)} />
      <rect x={60} y={68} width={30} height={7} rx={3} fill={C.green} />
      <circle cx={102} cy={14} r={11} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    let a: Pack;
    let b: Pack;
    do {
      a = { n: rand(2, 6), price: 0 };
      b = { n: rand(2, 6), price: 0 };
      a.price = a.n * rand(1, 5);
      b.price = b.n * rand(1, 5);
    } while (a.n === b.n || unit(a) === unit(b));
    const [win, lose] = unit(a) < unit(b) ? [a, b] : [b, a];
    return choiceQuestion({
      prompt: `Which pack is better value: ${packName(a)} coins or ${packName(b)} coins?`,
      visual: <EmojiPicture e="🛒" caption="Compare the price for one" />,
      right: { value: packName(win) },
      wrong: [{ value: packName(lose) }],
      hint: 'Work out the price for one item in each pack.',
      explain: [`${packName(a)}: ${a.price} ÷ ${a.n} = ${unit(a)} each.`, `${packName(b)}: ${b.price} ÷ ${b.n} = ${unit(b)} each.`, `So ${packName(win)} is better value.`],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.5) {
      const each = rand(2, 9);
      return {
        prompt: `Pens cost ${each} coins each. The shop has a “3 for 2” offer. How much do 3 pens cost?`,
        visual: <EmojiPicture e="🖊️" caption={`${each} coins each · 3 for 2`} />,
        answer: String(each * 2),
        hint: '“3 for 2” means you take 3 but only pay for 2.',
        explain: ['You take 3 pens and pay for 2.', `2 × ${each} = ${each * 2}.`, `So 3 pens cost ${each * 2} coins.`],
      };
    }
    const units = shuffle([1, 2, 3, 4, 5]).slice(0, 3);
    const sizes = shuffle([2, 3, 4, 5, 6, 8, 10]).slice(0, 3).sort((x, y) => x - y);
    const packs = sizes.map((n, i) => ({ n, price: n * units[i] }));
    const win = packs.reduce((m, p) => (unit(p) < unit(m) ? p : m));
    return choiceQuestion({
      prompt: 'Which pack has the lowest price for each item?',
      visual: <EmojiPicture e="🧻" caption={packs.map(packName).join(' · ')} />,
      right: { value: packName(win) },
      wrong: packs.filter((p) => p !== win).map((p) => ({ value: packName(p) })),
      hint: 'Divide each price by how many are in the pack.',
      explain: [packs.map((p) => `${p.price} ÷ ${p.n} = ${unit(p)}`).join(', ') + '.', `The lowest is ${unit(win)} each, so ${packName(win)}.`],
    });
  }

  if (Math.random() < 0.5) {
    // Quarter unit prices times 4, 8 or 12 always give whole-coin prices.
    const us = shuffle([1.25, 1.5, 1.75, 2, 2.25, 2.5]).slice(0, 3);
    const sizes = shuffle([4, 8, 12]);
    const packs = us.map((u, i) => ({ n: sizes[i], price: sizes[i] * u }));
    const win = packs.reduce((m, p) => (unit(p) < unit(m) ? p : m));
    return choiceQuestion({
      prompt: 'Which is the best buy (lowest price for each item)?',
      right: { value: packName(win) },
      wrong: packs.filter((p) => p !== win).map((p) => ({ value: packName(p) })),
      hint: 'Find the price for one in each pack. Decimals are fine.',
      explain: [packs.map((p) => `${p.price} ÷ ${p.n} = ${fmt(unit(p))}`).join(', ') + '.', `${fmt(unit(win))} is the lowest, so ${packName(win)} is the best buy.`],
    });
  }

  // You need a few and they go off: bigger packs can waste money.
  let small: Pack;
  let big: Pack;
  let need = 0;
  let k = 0;
  do {
    small = { n: pick([2, 3, 4]), price: 0 };
    small.price = small.n * pick([2, 3]);
    big = { n: small.n * pick([3, 4]), price: 0 };
    big.price = big.n * unit(small) - pick([2, 4, 6]);
    need = rand(small.n + 1, big.n - 2);
    k = Math.ceil(need / small.n);
  } while (k * small.price === big.price);
  const smallWins = k * small.price < big.price;
  const smallChoice = `${k} packs of ${small.n}`;
  const bigChoice = `1 pack of ${big.n}`;
  return choiceQuestion({
    prompt: `You need ${need} yogurts and they go off in a week. Packs: ${packName(small)} or ${packName(big)} coins. What is the cheapest way to get enough?`,
    visual: <EmojiPicture e="🥛" caption={`Need ${need}`} />,
    right: { value: smallWins ? smallChoice : bigChoice },
    wrong: [{ value: smallWins ? bigChoice : smallChoice }],
    hint: 'Work out the total cost of each way to get at least that many.',
    explain: [
      `${smallChoice}: ${k} × ${small.price} = ${k * small.price} coins.`,
      `${bigChoice}: ${big.price} coins, with ${big.n - need} spare.`,
      `So ${smallWins ? smallChoice : bigChoice} is cheaper.`,
    ],
  });
}

export const bestBuys: Lesson = {
  id: 'best-buys',
  title: 'Best Buys',
  Thumb,
  Scene: ShopScene,
  sceneHint: 'Tap each pack to find the price for one · Change how many you need',
  learn: {
    heading: 'Finding the best value',
    intro: 'Shops sell the same thing in different pack sizes and with offers. To compare fairly, work out the unit price: the price for one.',
    points: [
      { icon: Divide, text: 'Unit price = price ÷ number of items. Lower is better value.' },
      { icon: PackageOpen, text: 'Bigger packs are often cheaper per item, but not always. Check!' },
      { icon: Tag, text: '“3 for 2” means take 3, pay for 2.' },
      { icon: Trash2, text: 'The best buy is only good value if you will use it all.' },
    ],
  },
  steps: ['Write each pack as “how many for what price”.', 'Divide price by how many to get the price for one.', 'Compare the prices for one; the lowest is best value.', 'Ask: do I need that many, and will it keep?'],
  example: {
    question: 'Cookies: 4 for 10, 10 for 20 or 20 for 50. Which is best value?',
    work: ['10 ÷ 4 = 2.5 each.', '20 ÷ 10 = 2 each.', '50 ÷ 20 = 2.5 each.'],
    answer: '10 for 20 (2 coins each). The biggest pack isn’t the cheapest!',
  },
  grownups: [
    'Many shelf labels show a unit price (per item, per 100 g or per litre). Look for it together when you shop.',
    'Talk about waste: a big pack that goes off before it is used is not a bargain.',
    'Point out offers and ask your child to work out whether they really save money.',
  ],
  makeQuestion,
};
