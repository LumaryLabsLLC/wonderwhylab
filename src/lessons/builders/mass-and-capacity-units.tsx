import { useState } from 'react';
import { Gauge, Milk, Scale, Weight } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Draggable } from '../tiny/visuals/Draggable';
import { Emoji, useTween } from '../tiny/visuals/Measure';
import { DIAL, DialFace, DialPicture, Jug, JugPicture, ScaleBody } from './visuals/Kitchen';
import type { DialUnit } from './visuals/Kitchen';
import { wrapLines } from './visuals/text';

/* ───────────────────────── Weigh: a kitchen scale ───────────────────────── */

type ItemId = 'banana' | 'apple' | 'beans' | 'bread' | 'backpack' | 'melon' | 'cat' | 'pumpkin';

/** About how much each thing weighs, in grams (rounded so the dial is easy to read). */
const ITEMS: Record<ItemId, { emoji: string; name: string; short: string; grams: number }> = {
  banana: { emoji: '🍌', name: 'banana', short: 'banana', grams: 150 },
  apple: { emoji: '🍎', name: 'apple', short: 'apple', grams: 200 },
  beans: { emoji: '🥫', name: 'can of beans', short: 'beans', grams: 400 },
  bread: { emoji: '🍞', name: 'loaf of bread', short: 'bread', grams: 800 },
  backpack: { emoji: '🎒', name: 'backpack', short: 'backpack', grams: 2000 },
  melon: { emoji: '🍉', name: 'watermelon', short: 'melon', grams: 3000 },
  cat: { emoji: '🐈', name: 'cat', short: 'cat', grams: 4000 },
  pumpkin: { emoji: '🎃', name: 'pumpkin', short: 'pumpkin', grams: 5000 },
};
const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
const MAX_ON_TRAY = 3;

const SCALE = { cx: 300, trayY: 150, w: 340, h: 350, dialY: 365, r: 145 };
const shelfX = (i: number) => 70 + i * 80;
const SHELF_Y = 590;
const trayX = (i: number, n: number) => SCALE.cx + (i - (n - 1) / 2) * 92;

function onTray(p: Pt) {
  return p.x > SCALE.cx - 210 && p.x < SCALE.cx + 210 && p.y > 20 && p.y < 300;
}

function weighSentence(tray: ItemId[], unit: DialUnit): string {
  if (tray.length === 0)
    return unit === 'g'
      ? 'Put things on the scale. Light things are weighed in grams (g).'
      : 'Heavy things are weighed in kilograms (kg). 1\u00a0kg is the same as 1000\u00a0g.';
  const total = tray.reduce((s, id) => s + ITEMS[id].grams, 0);
  const who = tray.length === 1 ? `The ${ITEMS[tray[0]].name} weighs` : 'Together they weigh';
  if (unit === 'g') {
    if (total > 1000) return 'Too heavy for the grams dial! It only goes up to 1000\u00a0g. Try kilograms.';
    return `${who} ${total}\u00a0g.${total === 1000 ? ' That is 1 kilogram!' : ''}`;
  }
  if (total > 10000) return 'Too heavy for this scale! It only goes up to 10\u00a0kg.';
  if (total < 1000) return `Less than 1 kg, so the needle hardly moves. Use grams for light things.`;
  if (total % 1000 === 0) return `${who} ${total / 1000}\u00a0kg.`;
  return `${who} a bit more than ${Math.floor(total / 1000)}\u00a0kg.`;
}

function WeighPanel() {
  const [tray, setTray] = useState<ItemId[]>([]);
  const [unit, setUnit] = useState<DialUnit>('g');
  const [full, setFull] = useState(false);
  const total = tray.reduce((s, id) => s + ITEMS[id].grams, 0);
  const max = unit === 'g' ? 1000 : 10000;
  const frac = useTween(Math.min(1.02, total / max), 700);

  const put = (id: ItemId) => {
    if (tray.includes(id)) return;
    if (tray.length >= MAX_ON_TRAY) {
      setFull(true);
      play('wrong');
      return;
    }
    setFull(false);
    setTray((t) => [...t, id]);
    play('pop');
  };
  const takeOff = (id: ItemId) => {
    setFull(false);
    setTray((t) => t.filter((x) => x !== id));
    play('tap');
  };

  const sentence = full ? `The tray is full! Take something off first.` : weighSentence(tray, unit);
  const lines = wrapLines(sentence, 21);

  return (
    <g>
      <ScaleBody cx={SCALE.cx} trayY={SCALE.trayY} w={SCALE.w} h={SCALE.h} />
      <DialFace cx={SCALE.cx} cy={SCALE.dialY} r={SCALE.r} unit={unit} frac={frac} fontSize={18} />

      <rect x={30} y={SHELF_Y + 30} width={640} height={14} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      {ITEM_IDS.map((id, i) => (
        <text key={id} x={shelfX(i)} y={SHELF_Y + 68} textAnchor="middle" fontSize={15} fill={C.muted}>
          {ITEMS[id].short}
        </text>
      ))}
      {ITEM_IDS.map((id, i) => {
        const k = tray.indexOf(id);
        const x = k >= 0 ? trayX(k, tray.length) : shelfX(i);
        const y = k >= 0 ? SCALE.trayY - 38 : SHELF_Y;
        return (
          <Draggable
            key={id}
            x={x}
            y={y}
            label={k >= 0 ? `Take the ${ITEMS[id].name} off the scale` : `Put the ${ITEMS[id].name} on the scale`}
            onTap={() => (k >= 0 ? takeOff(id) : put(id))}
            onDrop={(p) => {
              if (onTray(p)) put(id);
              else if (k >= 0) takeOff(id);
            }}
          >
            <Emoji char={ITEMS[id].emoji} x={x} y={y} size={k >= 0 ? 64 : 52} />
          </Draggable>
        );
      })}

      <rect x={730} y={110} width={240} height={50 + lines.length * 26} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={146 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
      <text x={730} y={392} fontSize={16} fill={C.muted} className="caps">
        Dial
      </text>
      <SvgButton x={730} y={404} w={116} h={52} fontSize={17} label="grams" active={unit === 'g'} color={unit === 'g' ? C.yellow : C.card} onClick={() => setUnit('g')} />
      <SvgButton x={854} y={404} w={116} h={52} fontSize={17} label="kilograms" active={unit === 'kg'} color={unit === 'kg' ? C.yellow : C.card} onClick={() => setUnit('kg')} />
      <SvgButton
        x={730}
        y={480}
        w={240}
        h={50}
        fontSize={17}
        label="Empty the tray"
        disabled={tray.length === 0}
        onClick={() => {
          setTray([]);
          setFull(false);
          play('whoosh');
        }}
      />
      <SvgButton x={730} y={546} w={240} h={48} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />

      <Callout at={[SCALE.cx + 60, SCALE.dialY - 40]} box={[500, 150]} w={200} icon={Gauge} title="Read the needle" text="Find the number it points to. A small tick in between is half-way." />
      <Callout at={[SCALE.cx + 34, SCALE.dialY + 62]} box={[500, 420]} w={200} icon={Weight} title="1 kg = 1000 g" text="Grams for light things like an apple. Kilograms for heavy things like a cat." />
    </g>
  );
}

/* ───────────────────────── Pour: a measuring jug ───────────────────────── */

const POURS = [
  { name: 'cup', ml: 250 },
  { name: 'glass', ml: 200 },
  { name: 'bottle', ml: 500 },
];
const JUG = { x: 150, bottom: 560, w: 220, h: 400 };

function PourPanel() {
  const [log, setLog] = useState<number[]>([]);
  const [spill, setSpill] = useState<number | null>(null);
  const ml = log.reduce((s, v) => s + v, 0);
  const shown = useTween(ml, 600);

  const pour = (add: number) => {
    if (ml + add > 1000) {
      setSpill(add);
      play('wrong');
      return;
    }
    setSpill(null);
    setLog((l) => [...l, add]);
    play(ml + add === 1000 ? 'correct' : 'pop');
  };

  const sentence =
    spill !== null
      ? `That would spill! ${ml}\u00a0ml + ${spill}\u00a0ml is more than 1000\u00a0ml. Try a smaller pour.`
      : ml === 0
        ? 'Pour water into the jug. Read the line at the top of the water.'
        : ml === 1000
          ? `Full! 1000\u00a0ml makes 1\u00a0litre. It took ${log.length} ${log.length === 1 ? 'pour' : 'pours'}.`
          : `The jug has ${ml}\u00a0ml. ${1000 - ml}\u00a0ml more makes 1\u00a0litre.`;
  const lines = wrapLines(sentence, 21);
  const level = JUG.bottom - (Math.min(1000, ml) / 1000) * JUG.h;

  return (
    <g>
      <Jug x={JUG.x} bottom={JUG.bottom} w={JUG.w} h={JUG.h} ml={shown} fontSize={17} />
      {log.length > 0 && (
        <text x={JUG.x + JUG.w / 2} y={JUG.bottom + 50} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
          {log.length === 1 ? `${ml} ml` : `${log.join(' + ')} = ${ml} ml`}
        </text>
      )}

      <rect x={730} y={110} width={240} height={50 + lines.length * 26} rx={14} fill={ml === 1000 ? shade(C.green, 0.75) : C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={146 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
      {POURS.map((p, i) => (
        <SvgButton key={p.name} x={730} y={330 + i * 64} w={240} h={52} fontSize={18} label={`Pour a ${p.name} · ${p.ml} ml`} onClick={() => pour(p.ml)} color={C.teal} textColor={C.white} />
      ))}
      <SvgButton
        x={730}
        y={540}
        w={116}
        h={50}
        fontSize={17}
        label="Empty"
        title="Empty the jug"
        disabled={ml === 0}
        onClick={() => {
          setLog([]);
          setSpill(null);
          play('whoosh');
        }}
      />
      <SvgButton x={854} y={540} w={116} h={50} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />

      <Callout at={[JUG.x + JUG.w - 10, ml > 0 ? level : JUG.bottom - 10]} box={[490, 380]} w={210} icon={Gauge} title="Read the level" text="Look straight across from the top of the water to the nearest line." />
      <Callout at={[JUG.x + JUG.w - 10, JUG.bottom - JUG.h]} box={[490, 120]} w={210} icon={Milk} title="1 litre" text="1000 millilitres (ml) make 1 litre (L)." />
    </g>
  );
}

type Mode = 'weigh' | 'pour';

function MassCapacityScene() {
  const [mode, setMode] = useState<Mode>('weigh');
  return (
    <SceneSvg label={mode === 'weigh' ? 'A kitchen scale with a grams dial and a kilograms dial' : 'A measuring jug marked in millilitres'}>
      <SvgButton x={730} y={30} w={116} h={52} fontSize={18} label="Weigh" onClick={() => setMode('weigh')} active={mode === 'weigh'} color={mode === 'weigh' ? C.yellow : C.card} />
      <SvgButton x={854} y={30} w={116} h={52} fontSize={18} label="Pour" onClick={() => setMode('pour')} active={mode === 'pour'} color={mode === 'pour' ? C.yellow : C.card} />
      {mode === 'weigh' ? <WeighPanel /> : <PourPanel />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(-14 -22) scale(0.18)">
        <ScaleBody cx={SCALE.cx} trayY={SCALE.trayY} w={SCALE.w} h={SCALE.h} />
        <DialFace cx={SCALE.cx} cy={SCALE.dialY} r={SCALE.r} unit="g" frac={0.3} />
      </g>
      <g transform="translate(51 -14) scale(0.16)">
        <Jug x={JUG.x} bottom={JUG.bottom} w={JUG.w} h={JUG.h} ml={600} />
      </g>
    </svg>
  );
}

/* ───────────────────────── Practice ───────────────────────── */

function emojiPicture(char: string, label: string) {
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label={label}>
      <Emoji char={char} x={100} y={72} size={100} />
    </svg>
  );
}

function readDial(half: boolean): Question {
  const unit: DialUnit = !half && Math.random() < 0.3 ? 'kg' : 'g';
  const step = unit === 'kg' ? 1 : half ? 50 : 100;
  const v = unit === 'kg' ? rand(1, 9) : half ? pick([150, 250, 350, 450, 550, 650, 750, 850]) : rand(1, 9) * 100;
  const u = (n: number) => `${n} ${unit}`;
  const choices = numberChoices(v, { count: 3, min: step, max: DIAL[unit].max, spread: 2, step }).map((n) => ({ value: u(Number(n)) }));
  return {
    prompt: 'What does the scale show?',
    visual: <DialPicture value={v} unit={unit} />,
    choices,
    answer: u(v),
    hint: 'Find the number the needle points to. If it is between two numbers, the small tick is half-way.',
    explain: half
      ? [`The needle is half-way between ${v - 50} and ${v + 50}.`, `Half-way between them is ${v}.`, `So the scale shows ${u(v)}.`]
      : unit === 'g'
        ? ['The numbers on this dial count in hundreds: 100, 200, 300…', `The needle points at ${v}.`, `So the scale shows ${u(v)}.`]
        : ['The numbers on this dial count in kilograms: 1, 2, 3…', `The needle points at ${v}.`, `So the scale shows ${u(v)}.`],
  };
}

function readJug(half: boolean): Question {
  const v = half ? pick([150, 250, 350, 450, 550, 650, 750, 850]) : rand(1, 9) * 100;
  const step = half ? 50 : 100;
  const u = (n: number) => `${n} ml`;
  return {
    prompt: 'How much water is in the jug?',
    visual: <JugPicture ml={v} />,
    choices: numberChoices(v, { count: 3, min: step, max: 1000, spread: 2, step }).map((n) => ({ value: u(Number(n)) })),
    answer: u(v),
    hint: 'Look straight across from the top of the water to the nearest line.',
    explain: half
      ? [`The water is half-way between the ${v - 50} ml and ${v + 50} ml lines.`, `Half-way between them is ${v}.`, `So there is ${u(v)} of water.`]
      : ['Look at the top of the water.', `It is level with the ${v} ml line.`, `So there is ${u(v)} of water.`],
  };
}

const LIGHT = [
  ['an apple', '🍎'],
  ['a pencil', '✏️'],
  ['a letter', '✉️'],
  ['an egg', '🥚'],
  ['a strawberry', '🍓'],
  ['a cookie', '🍪'],
];
const HEAVY = [
  ['a dog', '🐕'],
  ['a suitcase', '🧳'],
  ['a bike', '🚲'],
  ['a big pumpkin', '🎃'],
  ['a horse', '🐴'],
  ['a sofa', '🛋️'],
];
const SMALL_DRINK = [
  ['a spoon of medicine', '🥄'],
  ['a cup of tea', '☕'],
  ['a glass of milk', '🥛'],
  ['a juice box', '🧃'],
];
const BIG_WATER = [
  ['a bath', '🛁'],
  ['a bucket', '🪣'],
  ['a fish tank', '🐠'],
  ['a paddling pool', '🏊'],
];

function whichUnit(): Question {
  if (Math.random() < 0.5) {
    const heavy = Math.random() < 0.5;
    const [thing, char] = pick(heavy ? HEAVY : LIGHT);
    const answer = heavy ? 'kilograms' : 'grams';
    return {
      prompt: `Which unit would you use to weigh ${thing}?`,
      visual: emojiPicture(char, thing),
      choices: [{ value: 'grams' }, { value: 'kilograms' }],
      answer,
      hint: 'Is it light enough to hold in one hand, or is it heavy?',
      explain: heavy
        ? [`${thing[0].toUpperCase()}${thing.slice(1)} is heavy.`, 'Heavy things are weighed in kilograms (kg).', 'So use kilograms.']
        : [`${thing[0].toUpperCase()}${thing.slice(1)} is light.`, 'Light things are weighed in grams (g).', 'So use grams.'],
    };
  }
  const big = Math.random() < 0.5;
  const [thing, char] = pick(big ? BIG_WATER : SMALL_DRINK);
  const answer = big ? 'litres' : 'millilitres';
  return {
    prompt: `Which unit would you use to measure the water in ${thing}?`,
    visual: emojiPicture(char, thing),
    choices: [{ value: 'millilitres' }, { value: 'litres' }],
    answer,
    hint: 'Is it a small amount, or lots and lots of water?',
    explain: big
      ? [`${thing[0].toUpperCase()}${thing.slice(1)} holds lots of water.`, 'Big amounts are measured in litres (L).', 'So use litres.']
      : [`${thing[0].toUpperCase()}${thing.slice(1)} is a small amount.`, 'Small amounts are measured in millilitres (ml).', 'So use millilitres.'],
  };
}

function convert(): Question {
  const kind = pick(['kg', 'fill', 'compare', 'half'] as const);
  if (kind === 'kg') {
    const n = rand(1, 5);
    const answer = `${n * 1000} g`;
    return {
      prompt: `${n} kg is the same as how many grams?`,
      choices: shuffle([n * 1000, n * 100, n * 10]).map((v) => ({ value: `${v} g` })),
      answer,
      hint: 'Remember: 1 kg is the same as 1000 g.',
      explain: ['1 kilogram is 1000 grams.', n === 1 ? 'So 1 kg fills the whole grams dial.' : `${n} kg is ${n} lots of 1000 g.`, `So ${n} kg = ${answer}.`],
    };
  }
  if (kind === 'fill') {
    const p = pick([
      { name: 'cup', ml: 250 },
      { name: 'glass', ml: 200 },
      { name: 'bottle', ml: 500 },
    ]);
    const n = 1000 / p.ml;
    const steps = Array.from({ length: n }, (_, i) => (i + 1) * p.ml).join(', ');
    return {
      prompt: `How many ${p.name}s of ${p.ml} ml fill a 1 litre jug?`,
      visual: <JugPicture ml={1000} />,
      choices: numberChoices(n, { count: 3, min: 1, max: 10 }).map((value) => ({ value })),
      answer: String(n),
      hint: `1 litre is 1000 ml. Count up in ${p.ml}s until you reach 1000.`,
      explain: ['1 litre is 1000 ml.', `Count in ${p.ml}s: ${steps}.`, `That is ${n} ${p.name}s, so the answer is ${n}.`],
    };
  }
  if (kind === 'compare') {
    if (Math.random() < 0.5) {
      const k = pick([1, 2]);
      const g = k * 1000 + pick([-300, -200, -100, 200, 500]);
      const answer = g > k * 1000 ? `${g} g` : `${k} kg`;
      return {
        prompt: 'Which is heavier?',
        choices: shuffle([`${k} kg`, `${g} g`]).map((value) => ({ value })),
        answer,
        hint: 'Change the kilograms into grams first. 1 kg = 1000 g.',
        explain: [`${k} kg is ${k * 1000} g.`, `Now compare ${k * 1000} g with ${g} g.`, `So ${answer} is heavier.`],
      };
    }
    const ml = pick([600, 800, 900, 1200, 1500]);
    const answer = ml > 1000 ? `${ml} ml` : '1 litre';
    return {
      prompt: 'Which is more water?',
      choices: shuffle(['1 litre', `${ml} ml`]).map((value) => ({ value })),
      answer,
      hint: 'Change the litre into millilitres first. 1 litre = 1000 ml.',
      explain: ['1 litre is 1000 ml.', `Now compare 1000 ml with ${ml} ml.`, `So ${answer} is more.`],
    };
  }
  return {
    prompt: 'This jug holds 1 litre when full. How much is half a litre?',
    visual: <JugPicture ml={1000} />,
    choices: shuffle(['50 ml', '500 ml', '200 ml']).map((value) => ({ value })),
    answer: '500 ml',
    hint: '1 litre is 1000 ml. What is half of 1000?',
    explain: ['1 litre is 1000 ml.', 'Half of 1000 is 500.', 'So half a litre is 500 ml.'],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return Math.random() < 0.5 ? readDial(false) : readJug(false);
  if (level === 1) {
    const r = Math.random();
    return r < 0.4 ? whichUnit() : r < 0.7 ? readDial(true) : readJug(true);
  }
  return Math.random() < 0.75 ? convert() : whichUnit();
}

export const massAndCapacityUnits: Lesson = {
  id: 'mass-and-capacity-units',
  title: 'Grams, Kilos and Litres',
  Thumb,
  Scene: MassCapacityScene,
  sceneHint: 'Drag things onto the scale · Pour water into the jug',
  learn: {
    heading: 'Measuring weight and water',
    intro: 'We weigh things in grams (g) and kilograms (kg). We measure water in millilitres (ml) and litres (L). Read the number on the scale or the jug.',
    points: [
      { icon: Scale, text: 'Light things: grams. Heavy things: kilograms. 1 kg = 1000 g.' },
      { icon: Milk, text: 'Small drinks: millilitres. Big amounts: litres. 1 L = 1000 ml.' },
      { icon: Gauge, text: 'Read the needle or the water line. A small tick in between is half-way.' },
    ],
  },
  steps: [
    'Choose the right unit: is it light or heavy, a little or a lot?',
    'Look at what the numbers on the scale or jug count in.',
    'Find where the needle or the water line is.',
    'Read the number and say the unit.',
  ],
  example: {
    question: 'How much water is in the jug?',
    visual: <JugPicture ml={750} />,
    work: ['The water is between the 700 ml and 800 ml lines.', 'It is at the small tick half-way: 750.'],
    answer: '750 ml.',
  },
  grownups: [
    'Bake together: weigh flour in grams and measure milk in millilitres. Let your child read the scale.',
    'Look at food packets: “500 g”, “1 kg”, “250 ml”, “2 L”. Which is the most? Which is the least?',
    'Real scales jump in 2s, 5s, 10s or 20s. Ask: “What does each little line mean?” before reading.',
  ],
  makeQuestion,
};
