import { useState } from 'react';
import { Factory, Recycle, RefreshCw, Sprout } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, Emoji, mcq, Note } from './visuals/kit';

interface Resource {
  id: string;
  emoji: string;
  name: string;
  renewable: boolean;
  fact: string;
}

const RESOURCES: Resource[] = [
  { id: 'sun', emoji: '☀️', name: 'Sunlight', renewable: true, fact: 'The Sun shines every day and will keep shining for billions of years.' },
  { id: 'wind', emoji: '💨', name: 'Wind', renewable: true, fact: 'The wind keeps blowing, because the Sun keeps heating the air.' },
  { id: 'water', emoji: '💧', name: 'Water', renewable: true, fact: 'The water cycle brings fresh water back as rain. We can still use it faster than it returns, so don’t waste it.' },
  { id: 'wood', emoji: '🌲', name: 'Wood', renewable: true, fact: 'Trees grow back, so wood is renewable if we plant new trees as fast as we cut them down.' },
  { id: 'fish', emoji: '🐟', name: 'Fish', renewable: true, fact: 'Fish are renewable if we never catch more than can be born and grow each year.' },
  { id: 'oil', emoji: '🛢️', name: 'Oil', renewable: false, fact: 'Oil formed from tiny sea creatures over millions of years. Petrol and most plastics are made from it.' },
  { id: 'coal', emoji: '🪨', name: 'Coal', renewable: false, fact: 'Coal formed from ancient swamp plants, squashed underground over millions of years.' },
  { id: 'gas', emoji: '🔥', name: 'Natural gas', renewable: false, fact: 'Natural gas formed deep underground, like oil, over millions of years.' },
  { id: 'metal', emoji: '⛏️', name: 'Metal ores', renewable: false, fact: 'There is only so much metal ore in the ground, but metals can be recycled again and again.' },
];

interface Pair {
  product: string;
  /** How to say it in a question: "a drink can". */
  ask: string;
  pEmoji: string;
  source: string;
  sEmoji: string;
  how: string;
}

const PAIRS: Pair[] = [
  { product: 'Paper', ask: 'paper', pEmoji: '📄', source: 'Trees', sEmoji: '🌲', how: 'Paper is made from wood pulp: wood chopped up and soaked into a mush.' },
  { product: 'Plastic bottle', ask: 'a plastic bottle', pEmoji: '🧴', source: 'Oil', sEmoji: '🛢️', how: 'Most plastic is made from oil (or natural gas) in factories.' },
  { product: 'Drink can', ask: 'a drink can', pEmoji: '🥫', source: 'Metal ore', sEmoji: '⛏️', how: 'Cans are made of aluminium, a metal that comes from a rock ore called bauxite.' },
  { product: 'T-shirt', ask: 'a cotton T-shirt', pEmoji: '👕', source: 'Cotton plants', sEmoji: '🌱', how: 'Cotton grows as fluffy fibres around the seeds of cotton plants, then is spun into thread.' },
  { product: 'Window glass', ask: 'window glass', pEmoji: '🪟', source: 'Sand', sEmoji: '🏖️', how: 'Glass is made by melting sand at very high temperatures.' },
  { product: 'Brick', ask: 'a brick', pEmoji: '🧱', source: 'Clay', sEmoji: '🏺', how: 'Bricks are made from clay dug from the ground, shaped and baked hard.' },
  { product: 'Cheese', ask: 'cheese', pEmoji: '🧀', source: 'Cows', sEmoji: '🐄', how: 'Cheese is made from milk, from animals like cows, goats or sheep.' },
];

type Mode = 'sort' | 'source';

/* Sort mode layout */
const CARD_W = 98;
const CARD_H = 88;
const trayPos = (i: number) => ({ x: 36 + i * 104, y: 92 });
const BIN = { renewable: { x: 30, y: 226, w: 460, h: 324 }, other: { x: 510, y: 226, w: 460, h: 324 } };
const binSlot = (bin: 'renewable' | 'other', k: number) => ({ x: BIN[bin].x + 14 + (k % 4) * 110, y: BIN[bin].y + 112 + Math.floor(k / 4) * 98 });
const binAt = (p: Pt): 'renewable' | 'other' | null => {
  for (const b of ['renewable', 'other'] as const) {
    const r = BIN[b];
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return b;
  }
  return null;
};

function Card({ x, y, emoji, name, done }: { x: number; y: number; emoji: string; name: string; done?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={14} fill={done ? shade(C.green, 0.8) : C.white} stroke={C.ink} strokeWidth={2} />
      <Emoji x={x + CARD_W / 2} y={y + 34} size={36}>
        {emoji}
      </Emoji>
      <text x={x + CARD_W / 2} y={y + 72} textAnchor="middle" fontSize={name.length > 9 ? 15 : 16} fontWeight={700} fill={C.ink} pointerEvents="none">
        {name}
      </text>
    </g>
  );
}

/* Source mode layout */
const ROW_Y = (i: number) => 120 + i * 104;

function ResourceScene() {
  const [mode, setMode] = useState<Mode>('sort');
  const [sorted, setSorted] = useState<Record<string, 'renewable' | 'other'>>({});
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
  const [round, setRound] = useState<{ products: Pair[]; sources: Pair[] }>(() => {
    const four = shuffle(PAIRS).slice(0, 4);
    return { products: four, sources: shuffle(four) };
  });
  const [matched, setMatched] = useState<Record<string, boolean>>({});

  const sortCard = (r: Resource, p: Pt) => {
    const bin = binAt(p);
    if (!bin) return;
    const right = (bin === 'renewable') === r.renewable;
    if (right) {
      play('correct');
      const next = { ...sorted, [r.id]: bin };
      setSorted(next);
      setNote({
        good: true,
        text:
          Object.keys(next).length === RESOURCES.length
            ? 'All sorted! Renewable resources still need care, and non-renewable ones should be saved: switch things off, reuse, recycle and replant.'
            : `${r.name}: ${r.renewable ? 'renewable' : 'non-renewable'}. ${r.fact}`,
      });
    } else {
      play('wrong');
      setNote({
        good: false,
        text: r.renewable
          ? `Not yet. Can nature make more ${r.name.toLowerCase()} in a lifetime? Think about how it comes back.`
          : `Not yet. How long did ${r.name.toLowerCase()} take to form? Can nature make more in a lifetime?`,
      });
    }
  };

  const newRound = () => {
    const four = shuffle(PAIRS).slice(0, 4);
    setRound({ products: four, sources: shuffle(four) });
    setMatched({});
    setNote(null);
  };

  const matchCard = (pair: Pair, p: Pt) => {
    const row = round.sources.findIndex((_, i) => p.x > 560 && p.x < 900 && p.y > ROW_Y(i) - 10 && p.y < ROW_Y(i) + 90);
    if (row < 0) return;
    const target = round.sources[row];
    if (target === pair) {
      play('correct');
      const next = { ...matched, [pair.product]: true };
      setMatched(next);
      setNote({ good: true, text: Object.keys(next).length === 4 ? `All matched! ${pair.how} Everything we use starts as a natural resource.` : pair.how });
    } else {
      play('wrong');
      setNote({ good: false, text: `Not yet. Is ${pair.ask} really made from ${target.source.toLowerCase()}? Think about what it feels like and what it is made of.` });
    }
  };

  const unsorted = RESOURCES.filter((r) => !sorted[r.id]);
  const inBin = (b: 'renewable' | 'other') => RESOURCES.filter((r) => sorted[r.id] === b);

  return (
    <SceneSvg label="Sort natural resources into renewable and non-renewable">
      {(['sort', 'source'] as Mode[]).map((m, i) => (
        <SvgButton
          key={m}
          x={[720, 836][i]}
          y={18}
          w={[106, 134][i]}
          h={50}
          fontSize={18}
          label={m === 'sort' ? 'Sort' : 'Where from?'}
          active={mode === m}
          color={mode === m ? C.yellow : C.card}
          onClick={() => {
            setMode(m);
            setNote(null);
          }}
        />
      ))}

      {mode === 'sort' && (
        <g>
          <text x={36} y={56} fontSize={22} fontWeight={700} fill={C.ink}>
            Drag each resource into the right bin.
          </text>
          {(['renewable', 'other'] as const).map((b) => {
            const r = BIN[b];
            const green = b === 'renewable';
            return (
              <g key={b}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill={shade(green ? C.green : C.orange, 0.78)} stroke={C.ink} strokeWidth={2} />
                <text x={r.x + 20} y={r.y + 38} fontSize={26} fontWeight={700} fill={C.ink}>
                  {green ? '♻️ Renewable' : '⏳ Non-renewable'}
                </text>
                {wrap(green ? 'Nature makes more of it in our lifetime, if we use it wisely.' : 'Took millions of years to form. It will run out one day.', 46).map((l, i) => (
                  <text key={i} x={r.x + 20} y={r.y + 66 + i * 21} fontSize={16} fill={C.ink2}>
                    {l}
                  </text>
                ))}
                {inBin(b).map((res, k) => {
                  const s = binSlot(b, k);
                  return <Card key={res.id} x={s.x} y={s.y} emoji={res.emoji} name={res.name} done />;
                })}
              </g>
            );
          })}
          {unsorted.map((r) => {
            const i = RESOURCES.indexOf(r);
            const { x, y } = trayPos(i);
            return (
              <Draggable key={r.id} x={x + CARD_W / 2} y={y + CARD_H / 2} hit={46} label={`${r.name}: drag it into a bin`} onDrop={(p) => sortCard(r, p)}>
                <Card x={x} y={y} emoji={r.emoji} name={r.name} />
              </Draggable>
            );
          })}
          {note && <Note x={30} y={566} w={940} text={note.text} tone={note.good ? 'good' : 'nudge'} size={18} />}
          {Object.keys(sorted).length > 0 && (
            <SvgButton x={566} y={18} w={140} h={50} fontSize={17} label="Start again" onClick={() => { setSorted({}); setNote(null); }} />
          )}
        </g>
      )}

      {mode === 'source' && (
        <g>
          <text x={36} y={56} fontSize={22} fontWeight={700} fill={C.ink}>
            Where does it come from? Drag each thing to its resource.
          </text>
          <text x={60} y={104} fontSize={16} fill={C.muted} className="caps">
            Things we use
          </text>
          <text x={580} y={104} fontSize={16} fill={C.muted} className="caps">
            Natural resources
          </text>
          {round.sources.map((pair, i) => (
            <g key={pair.source}>
              <rect x={580} y={ROW_Y(i)} width={300} height={84} rx={16} fill={shade(C.green, 0.82)} stroke={C.ink} strokeWidth={2} />
              <Emoji x={626} y={ROW_Y(i) + 42} size={40}>
                {pair.sEmoji}
              </Emoji>
              <text x={666} y={ROW_Y(i) + 50} fontSize={21} fontWeight={700} fill={C.ink}>
                {pair.source}
              </text>
            </g>
          ))}
          {round.products.map((pair, i) => {
            const done = matched[pair.product];
            const row = round.sources.indexOf(pair);
            if (done)
              return (
                <g key={pair.product}>
                  <line x1={330} y1={ROW_Y(i) + 42} x2={580} y2={ROW_Y(row) + 42} stroke={C.ink} strokeWidth={3} strokeDasharray="8 6" />
                  <rect x={60} y={ROW_Y(i)} width={270} height={84} rx={16} fill={shade(C.green, 0.82)} stroke={C.ink} strokeWidth={2} />
                  <Emoji x={106} y={ROW_Y(i) + 42} size={40}>
                    {pair.pEmoji}
                  </Emoji>
                  <text x={146} y={ROW_Y(i) + 50} fontSize={20} fontWeight={700} fill={C.ink}>
                    {pair.product}
                  </text>
                </g>
              );
            return (
              <Draggable key={pair.product} x={195} y={ROW_Y(i) + 42} hit={50} label={`${pair.product}: drag it to what it is made from`} onDrop={(p) => matchCard(pair, p)}>
                <rect x={60} y={ROW_Y(i)} width={270} height={84} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2} />
                <Emoji x={106} y={ROW_Y(i) + 42} size={40}>
                  {pair.pEmoji}
                </Emoji>
                <text x={146} y={ROW_Y(i) + 50} fontSize={20} fontWeight={700} fill={C.ink} pointerEvents="none">
                  {pair.product}
                </text>
              </Draggable>
            );
          })}
          {note && <Note x={60} y={548} w={820} text={note.text} tone={note.good ? 'good' : 'nudge'} size={18} />}
          <SvgButton x={900} y={120} w={80} h={50} fontSize={17} label="New" title="New set of things" onClick={newRound} color={C.teal} textColor={C.white} />
        </g>
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={30} width={50} height={44} rx={8} fill={shade(C.green, 0.7)} stroke={C.ink} strokeWidth={2} />
      <rect x={64} y={30} width={50} height={44} rx={8} fill={shade(C.orange, 0.7)} stroke={C.ink} strokeWidth={2} />
      <Emoji x={31} y={54} size={22}>
        💨
      </Emoji>
      <Emoji x={89} y={54} size={22}>
        🛢️
      </Emoji>
      <Emoji x={60} y={14} size={18}>
        ☀️
      </Emoji>
    </svg>
  );
}

/* ---------- Practice ---------- */

const RENEW = 'Renewable';
const NON = 'Non-renewable';

function Pic({ emoji, label }: { emoji: string; label: string }) {
  return (
    <svg viewBox="0 0 120 80" role="img" aria-label={label}>
      <Emoji x={60} y={40} size={54}>
        {emoji}
      </Emoji>
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const style = level === 0 ? rand(0, 1) : level === 1 ? rand(2, 3) : rand(4, 6);

  if (style === 0) {
    const r = pick(RESOURCES);
    const answer = r.renewable ? RENEW : NON;
    return mcq({
      prompt: `Is ${r.name.toLowerCase()} renewable or non-renewable?`,
      visual: <Pic emoji={r.emoji} label={r.name} />,
      answer,
      options: [RENEW, NON],
      ordered: true,
      hint: 'Ask: can nature make more of it in a human lifetime?',
      explain: [r.fact, `So ${r.name.toLowerCase()} is ${answer.toLowerCase()}.`],
    });
  }
  if (style === 1) {
    const wantRenew = Math.random() < 0.5;
    const right = pick(RESOURCES.filter((r) => r.renewable === wantRenew));
    const wrong = shuffle(RESOURCES.filter((r) => r.renewable !== wantRenew)).slice(0, 3);
    return mcq({
      prompt: wantRenew ? 'Which of these is renewable?' : 'Which of these will run out one day?',
      answer: right.name,
      options: [right, ...wrong].map((r) => ({ value: r.name, emoji: r.emoji })),
      hint: wantRenew ? 'Look for the one that nature keeps making.' : 'Look for the one that took millions of years to form.',
      explain: [right.fact, wantRenew ? `So ${right.name} is the renewable one.` : `So ${right.name} will run out one day.`],
    });
  }
  if (style === 2 || style === 3) {
    const pair = pick(PAIRS);
    const others = shuffle(PAIRS.filter((p) => p !== pair)).slice(0, level === 1 ? 2 : 3);
    return mcq({
      prompt: `What is ${pair.ask} made from?`,
      visual: <Pic emoji={pair.pEmoji} label={pair.product} />,
      answer: pair.source,
      options: [pair, ...others].map((p) => ({ value: p.source, emoji: p.sEmoji })),
      hint: 'Think about what it feels like: is it like wood, metal, glass, plastic or cloth?',
      explain: [pair.how, `So the answer is ${pair.source.toLowerCase()}.`],
    });
  }
  const q = pick([
    {
      prompt: 'Why is coal non-renewable?',
      answer: 'It takes millions of years to form',
      wrong: ['It is black', 'It is too heavy to dig up', 'It only comes from one country'],
      steps: ['Coal formed from ancient plants, squashed underground.', 'That took millions of years.', 'We use it much faster than that, so: it takes millions of years to form.'],
    },
    {
      prompt: 'Wood is renewable only if…',
      answer: 'we plant new trees as fast as we cut them down',
      wrong: ['we only use it in summer', 'we paint it', 'we keep it indoors'],
      steps: ['Trees take years to grow back.', 'If we cut faster than they grow, forests shrink.', 'So wood is renewable only if we plant new trees as fast as we cut them down.'],
    },
    {
      prompt: 'What is the best way to make metals last longer?',
      answer: 'Recycle them',
      wrong: ['Bury them in the ground', 'Burn them', 'Throw them in the sea'],
      steps: ['Metal ores will run out one day.', 'Old cans and pots can be melted and made into new things.', 'So the best way: recycle them.'],
    },
    {
      prompt: 'Which of these makes electricity from a renewable resource?',
      answer: 'Wind turbines',
      wrong: ['Coal power station', 'Oil power station', 'Gas power station'],
      steps: ['Coal, oil and gas will run out one day.', 'Wind keeps blowing, so it will not run out.', 'So the renewable choice is wind turbines.'],
    },
    {
      prompt: 'Water is renewable. Why should we still not waste it?',
      answer: 'We can use fresh water faster than rain refills it',
      wrong: ['Water will turn into oil', 'Water is made in factories', 'Rain is stopping forever'],
      steps: ['Only a small part of Earth’s water is fresh water we can use.', 'In many places people take water out of rivers and the ground faster than rain puts it back.', 'So: we can use fresh water faster than rain refills it.'],
    },
  ]);
  return mcq({
    prompt: q.prompt,
    answer: q.answer,
    options: [q.answer, ...q.wrong],
    hint: 'Think about how long it takes nature to make more, and how we can make it last.',
    explain: q.steps,
  });
}

export const naturalResources: Lesson = {
  id: 'natural-resources',
  title: 'Natural Resources',
  Thumb,
  Scene: ResourceScene,
  sceneHint: 'Sort resources into bins, then match things to where they come from',
  learn: {
    heading: 'Gifts from nature',
    intro:
      'Natural resources are useful things that come from nature: water, air, sunlight, plants, animals, rocks and fuels. Everything we make starts with them. Some can be replaced by nature; some cannot.',
    points: [
      { icon: RefreshCw, text: 'Renewable resources, like sunlight, wind, water and wood, are replaced by nature in our lifetime.' },
      { icon: Factory, text: 'Non-renewable resources, like oil, coal, natural gas and metal ores, took millions of years to form and will run out.' },
      { icon: Sprout, text: 'Even renewable resources need care: replant trees and don’t overfish or waste water.' },
      { icon: Recycle, text: 'Use resources wisely: switch things off, reuse, and recycle metal, paper, glass and plastic.' },
    ],
  },
  steps: [
    'Name the resource: what is it, and where does it come from?',
    'Ask: can nature make more of it in a human lifetime?',
    'If yes, it is renewable. If it took millions of years to form, it is non-renewable.',
    'Think of one way to use it wisely.',
  ],
  example: {
    question: 'A plastic bottle: which natural resource is it made from, and is that resource renewable?',
    work: ['Most plastic is made from oil.', 'Oil formed from tiny sea creatures over millions of years.', 'We can’t make more in our lifetime, so it is non-renewable.'],
    answer: 'Oil, which is non-renewable. Reuse and recycle bottles to save it.',
  },
  grownups: [
    'Go on a “where does it come from?” hunt at home: paper, glass jars, metal cans, cotton clothes, plastic toys.',
    'Water, wood and fish are renewable only when used carefully. This is a good way into talking about sustainability.',
    'Look at a recycling bin together and sort what can go in it.',
    'Some plastics can now be made from plants, but most still come from oil and gas.',
  ],
  makeQuestion,
};
