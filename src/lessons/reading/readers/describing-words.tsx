import { useState } from 'react';
import { Eye, Palette, Sparkles, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken, inside } from './visuals/DragToken';
import { Emoji, SentencePicture, WordCard } from './visuals/Cards';
import { textWidth, useFontsReady } from './visuals/measure';
import './visuals/describing.css';

/** How an adjective changes the picture. */
interface Look {
  scale?: number;
  sparkle?: boolean;
  glow?: string;
  fluff?: boolean;
}

/** How an adverb changes the action. */
interface Action {
  kind: 'run' | 'float';
  /** Seconds per loop: smaller is faster. */
  speed: number;
  hop?: boolean;
  size?: number;
  faint?: boolean;
  marks?: string[];
}

interface Frame {
  noun: string;
  verb: string;
  emoji: string;
  /** Mirror the emoji so it faces the way it moves. */
  flip?: boolean;
  adjectives: Record<string, Look>;
  adverbs: Record<string, Action>;
}

const FRAMES: Frame[] = [
  {
    noun: 'dog',
    verb: 'ran',
    emoji: '🐕',
    flip: true,
    adjectives: { big: { scale: 1.45 }, tiny: { scale: 0.5 }, happy: { sparkle: true } },
    adverbs: { quickly: { kind: 'run', speed: 1.1 }, slowly: { kind: 'run', speed: 6 }, happily: { kind: 'run', speed: 2.6, hop: true } },
  },
  {
    noun: 'cat',
    verb: 'slept',
    emoji: '🐈',
    adjectives: { big: { scale: 1.45 }, tiny: { scale: 0.5 }, fluffy: { fluff: true } },
    adverbs: {
      loudly: { kind: 'float', speed: 1.3, size: 58, marks: ['Z', 'Z', 'Z'] },
      quietly: { kind: 'float', speed: 2.6, size: 22, faint: true, marks: ['z', 'z', 'z'] },
      peacefully: { kind: 'float', speed: 4.2, size: 32, marks: ['z', 'z', 'z'] },
    },
  },
  {
    noun: 'bird',
    verb: 'sang',
    emoji: '🐦',
    adjectives: { little: { scale: 0.6 }, bright: { glow: C.yellow }, happy: { sparkle: true } },
    adverbs: {
      loudly: { kind: 'float', speed: 1.2, size: 58, marks: ['♪', '♫', '♪'] },
      softly: { kind: 'float', speed: 2.8, size: 22, faint: true, marks: ['♪', '♪', '♪'] },
      sweetly: { kind: 'float', speed: 3, size: 34, marks: ['♪', '💗', '♫'] },
    },
  },
];

// ───────────────────────── Scene ─────────────────────────

type SlotKind = 'adj' | 'adv';
const FS = 36;
const SLOT_W = 180;
const ADJ_FILL = shade(C.blue, 0.75);
const ADV_FILL = shade(C.purple, 0.75);
const SLOT_COLOR: Record<SlotKind, string> = { adj: shade(C.blue, -0.1), adv: shade(C.purple, -0.1) };

function layout(f: Frame) {
  const tokens: ({ t: string } | { slot: SlotKind })[] = [{ t: 'The' }, { slot: 'adj' }, { t: f.noun }, { t: f.verb }, { slot: 'adv' }, { t: '.' }];
  const widths = tokens.map((k) => ('slot' in k ? SLOT_W : textWidth(k.t, FS)));
  const gaps = tokens.map((k, i): number => (i === 0 ? 0 : 't' in k && k.t === '.' ? 4 : 18));
  const total = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  let x = 500 - total / 2;
  return tokens.map((k, i) => {
    x += gaps[i];
    const at = { ...k, x, w: widths[i] };
    x += widths[i];
    return at;
  });
}

function Picture({ frame, adj, adv }: { frame: Frame; adj?: string; adv?: string }) {
  const look = adj ? frame.adjectives[adj] : {};
  const act = adv ? frame.adverbs[adv] : undefined;
  const scale = look.scale ?? 1;
  const animal = (
    <g transform={`scale(${scale})`}>
      {look.glow && <circle r={78} fill={look.glow} opacity={0.55} />}
      {look.fluff &&
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <circle key={i} cx={Math.cos(a) * 52} cy={Math.sin(a) * 46} r={24} fill={C.white} stroke={C.line} strokeWidth={2} />;
        })}
      <g transform={frame.flip ? 'scale(-1 1)' : undefined}>
        <Emoji char={frame.emoji} size={110} />
      </g>
      {look.sparkle && (
        <g>
          <g className="dw-twinkle">
            <Emoji x={-78} y={-58} size={34} char="✨" />
          </g>
          <g className="dw-twinkle" style={{ animationDelay: '0.5s' }}>
            <Emoji x={80} y={-48} size={28} char="✨" />
          </g>
        </g>
      )}
    </g>
  );
  const mx = 70 * scale;
  const my = -20 * scale;
  return (
    <g transform="translate(500 352)">
      {act?.kind === 'run' ? (
        <g key={adv} className="dw-run" style={{ animationDuration: `${act.speed}s` }}>
          {act.hop ? <g className="dw-hop">{animal}</g> : animal}
        </g>
      ) : (
        animal
      )}
      {act?.kind === 'float' &&
        act.marks?.map((m, i) => (
          <g key={`${adv}-${i}`} className="dw-float" style={{ animationDuration: `${act.speed}s`, animationDelay: `${(i * act.speed) / 3}s` }}>
            <text
              x={mx + i * 14}
              y={my}
              fontSize={act.size}
              fontWeight={800}
              fill={act.faint ? C.muted : shade(C.purple, -0.2)}
              opacity={act.faint ? 0.6 : 1}
              textAnchor="middle"
            >
              {m}
            </text>
          </g>
        ))}
    </g>
  );
}

function DescribingScene() {
  useFontsReady();
  const [index, setIndex] = useState(0);
  const frame = FRAMES[index % FRAMES.length];
  const [tray, setTray] = useState(() => shuffle([...Object.keys(FRAMES[0].adjectives), ...Object.keys(FRAMES[0].adverbs)]));
  const [slots, setSlots] = useState<Partial<Record<SlotKind, string>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [misses, setMisses] = useState(0);
  const [message, setMessage] = useState('Drag a describing word into each box. Watch the picture change!');
  const placed = layout(frame);
  const sentence = ['The', slots.adj, frame.noun, frame.verb, slots.adv].filter(Boolean).join(' ') + '.';

  const load = (i: number) => {
    const f = FRAMES[i % FRAMES.length];
    setIndex(i);
    setTray(shuffle([...Object.keys(f.adjectives), ...Object.keys(f.adverbs)]));
    setSlots({});
    setSelected(null);
    setMisses(0);
    setMessage(`A new sentence: The ${f.noun} ${f.verb}. Make it come alive!`);
  };

  const place = (word: string, kind: SlotKind) => {
    const isAdj = word in frame.adjectives;
    if ((kind === 'adj') === isAdj) {
      play('pop');
      setSlots({ ...slots, [kind]: word });
      setSelected(null);
      setMisses(0);
      setMessage(
        isAdj
          ? `“${word}” is an adjective. It tells us what the ${frame.noun} is like.`
          : `“${word}” is an adverb. It tells us how the ${frame.noun} ${frame.verb}.`,
      );
      return;
    }
    play('wrong');
    setShake({ ...shake, [word]: (shake[word] ?? 0) + 1 });
    const m = misses + 1;
    setMisses(m);
    if (m >= 2)
      setMessage(
        `Here’s how: an adjective goes before the noun and tells what the ${frame.noun} is like. An adverb tells how it ${frame.verb}, and many end in -ly.`,
      );
    else if (isAdj) setMessage(`Not yet. “${word}” tells what the ${frame.noun} is like. This box needs a word that tells HOW it ${frame.verb}.`);
    else setMessage(`Not yet. “${word}” tells how something happens. This box needs a word that tells what the ${frame.noun} is like.`);
  };

  const slotRect = (kind: SlotKind) => {
    const p = placed.find((k) => 'slot' in k && k.slot === kind)!;
    return { x: p.x, y: 106, w: p.w, h: 64 };
  };
  const slotAt = (pt: { x: number; y: number }) =>
    (['adj', 'adv'] as SlotKind[]).find((k) => {
      const r = slotRect(k);
      return inside(pt, { x: r.x - 16, y: r.y - 24, w: r.w + 32, h: r.h + 48 });
    });
  const free = tray.filter((w) => w !== slots.adj && w !== slots.adv);
  const adjR = slotRect('adj');
  const advR = slotRect('adv');

  return (
    <SceneSvg label="Adjectives and adverbs: drag describing words into the sentence">
      <text x={60} y={52} fontSize={15} fill={C.muted} className="caps">
        Make the sentence come alive
      </text>
      <SvgButton x={540} y={20} w={190} h={50} fontSize={17} label="Read it to me" onClick={() => speak(sentence, { force: true })} />
      <SvgButton x={750} y={20} w={190} h={50} fontSize={17} label="Next sentence" color={C.teal} textColor={C.white} onClick={() => load(index + 1)} />

      <rect x={60} y={86} width={880} height={122} rx={22} fill={shade(C.yellow, 0.82)} stroke={C.line} strokeWidth={2} />
      {placed.map((k, i) => {
        if (!('slot' in k)) {
          return (
            <text key={i} x={k.x} y={138} dominantBaseline="central" fontSize={FS} fontWeight={600} fill={C.ink}>
              {k.t}
            </text>
          );
        }
        const word = slots[k.slot];
        return (
          <g
            key={i}
            onClick={() => selected && place(selected, k.slot)}
            style={{ cursor: selected ? 'pointer' : undefined }}
            data-nopan={selected ? true : undefined}
            role="button"
            aria-label={word ?? (k.slot === 'adj' ? 'Empty adjective box' : 'Empty adverb box')}
          >
            <rect
              x={k.x}
              y={106}
              width={k.w}
              height={64}
              rx={12}
              fill={word ? (k.slot === 'adj' ? ADJ_FILL : ADV_FILL) : C.white}
              stroke={SLOT_COLOR[k.slot]}
              strokeWidth={3}
              strokeDasharray={word ? undefined : '8 6'}
            />
            {word && (
              <g transform={`translate(${k.x + k.w / 2} 138)`}>
                <text className="pop-in" textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink}>
                  {word}
                </text>
              </g>
            )}
            <text x={k.x + k.w / 2} y={192} textAnchor="middle" fontSize={15} fontWeight={700} fill={SLOT_COLOR[k.slot]} className="caps">
              {k.slot === 'adj' ? 'adjective' : 'adverb'}
            </text>
          </g>
        );
      })}

      <rect x={60} y={222} width={880} height={232} rx={22} fill={shade(C.green, 0.86)} stroke={C.line} strokeWidth={2} />
      <line x1={80} x2={920} y1={420} y2={420} stroke={shade(C.green, 0.4)} strokeWidth={3} strokeLinecap="round" />
      <Picture key={index} frame={frame} adj={slots.adj} adv={slots.adv} />

      <text x={60} y={488} fontSize={15} fill={C.muted} className="caps">
        Describing words
      </text>
      {tray.map((w, i) =>
        free.includes(w) ? (
          <DragToken
            key={`${index}-${w}`}
            x={100 + i * 160}
            y={532}
            label={w}
            selected={selected === w}
            shakeKey={shake[w] ?? 0}
            onTap={() => {
              play('tap');
              setSelected(selected === w ? null : w);
            }}
            onDrop={(p) => {
              const hit = slotAt(p);
              if (hit) place(w, hit);
            }}
          >
            <WordCard w={150} h={62} fontSize={24} parts={[{ t: w }]} state={selected === w ? 'selected' : 'idle'} />
          </DragToken>
        ) : null,
      )}

      {wrap(message, 96).map((line, i) => (
        <text key={i} x={500} y={610 + i * 24} textAnchor="middle" fontSize={17} fill={C.ink2}>
          {line}
        </text>
      ))}

      <Callout at={[adjR.x + 14, 168]} box={[76, 236]} w={250} icon={Palette} title="Adjective" text="Describes a noun. Ask: what is it like?" />
      <Callout at={[advR.x + advR.w - 14, 168]} box={[674, 236]} w={250} icon={Wind} title="Adverb" text="Describes a verb. Ask: how did it happen?" />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={10} width={112} height={30} rx={7} fill={shade(C.yellow, 0.8)} stroke={C.ink} strokeWidth={1.4} />
      <rect x={10} y={16} width={30} height={18} rx={4} fill={ADJ_FILL} stroke={C.ink} strokeWidth={1.2} />
      <text x={25} y={29} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.ink}>
        big
      </text>
      <text x={57} y={30} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>
        dog
      </text>
      <rect x={74} y={16} width={36} height={18} rx={4} fill={ADV_FILL} stroke={C.ink} strokeWidth={1.2} />
      <text x={92} y={29} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.ink}>
        quickly
      </text>
      <text x={60} y={68} textAnchor="middle" fontSize={26}>
        🐕
      </text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const ADJ_ITEMS: { sentence: string; answer: string; others: [string, string] }[] = [
  { sentence: 'The tall giraffe ate leaves.', answer: 'tall', others: ['giraffe', 'ate'] },
  { sentence: 'A shiny shell lay on the sand.', answer: 'shiny', others: ['shell', 'lay'] },
  { sentence: 'My little brother laughed.', answer: 'little', others: ['brother', 'laughed'] },
  { sentence: 'We saw a huge whale.', answer: 'huge', others: ['saw', 'whale'] },
  { sentence: 'The cold wind blew all night.', answer: 'cold', others: ['wind', 'blew'] },
  { sentence: 'She wore a red scarf.', answer: 'red', others: ['wore', 'scarf'] },
];

const ADV_ITEMS: { sentence: string; answer: string; others: [string, string] }[] = [
  { sentence: 'The turtle walked slowly to the pond.', answer: 'slowly', others: ['walked', 'pond'] },
  { sentence: 'The baby slept peacefully all night.', answer: 'peacefully', others: ['slept', 'baby'] },
  { sentence: 'Tom quickly finished his lunch.', answer: 'quickly', others: ['finished', 'lunch'] },
  { sentence: 'The band played loudly at the fair.', answer: 'loudly', others: ['played', 'band'] },
  { sentence: 'Mia carefully carried the hot soup.', answer: 'carefully', others: ['carried', 'hot'] },
  { sentence: 'The kitten purred softly.', answer: 'softly', others: ['kitten', 'purred'] },
];

const FORM_ITEMS: { frame: string; answer: string; wrong: [string, string]; kind: 'adjective' | 'adverb'; tells: string }[] = [
  { frame: 'The bird sang ___.', answer: 'sweetly', wrong: ['sweet', 'sweetness'], kind: 'adverb', tells: 'how the bird sang' },
  { frame: 'The children played ___ in the park.', answer: 'happily', wrong: ['happy', 'happiness'], kind: 'adverb', tells: 'how the children played' },
  { frame: 'Please speak ___ in the library.', answer: 'quietly', wrong: ['quiet', 'quietness'], kind: 'adverb', tells: 'how to speak' },
  { frame: 'Dad drove ___ on the icy road.', answer: 'carefully', wrong: ['careful', 'carefulness'], kind: 'adverb', tells: 'how Dad drove' },
  { frame: 'We ate a ___ cake.', answer: 'delicious', wrong: ['deliciously', 'deliciousness'], kind: 'adjective', tells: 'what the cake was like' },
  { frame: 'The ___ puppy chased its tail.', answer: 'playful', wrong: ['playfully', 'playfulness'], kind: 'adjective', tells: 'what the puppy was like' },
];

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const item = pick(ADJ_ITEMS);
    return {
      prompt: 'Which word is an adjective?',
      speak: `${item.sentence} Which word is an adjective?`,
      visual: <SentencePicture text={item.sentence} />,
      choices: shuffle([item.answer, ...item.others]).map((value) => ({ value })),
      answer: item.answer,
      hint: 'Find the noun. Which word tells what it is like?',
      explain: [`Ask: what is it like?`, `“${item.answer}” describes a noun in the sentence.`, `So “${item.answer}” is the adjective.`],
    };
  }
  if (level === 1) {
    const item = pick(ADV_ITEMS);
    return {
      prompt: 'Which word is an adverb?',
      speak: `${item.sentence} Which word is an adverb?`,
      visual: <SentencePicture text={item.sentence} />,
      choices: shuffle([item.answer, ...item.others]).map((value) => ({ value })),
      answer: item.answer,
      hint: 'Find the action word. Which word tells how it was done?',
      explain: ['Find the verb (the action).', `“${item.answer}” tells how it was done.`, `So “${item.answer}” is the adverb.`],
    };
  }
  const item = pick(FORM_ITEMS);
  const filled = item.frame.replace('___', item.answer);
  return {
    prompt: 'Which word fits the gap?',
    speak: `${item.frame.replace('___', 'blank')} Which word fits the gap?`,
    visual: <SentencePicture text={item.frame} />,
    choices: shuffle([item.answer, ...item.wrong]).map((value) => ({ value })),
    answer: item.answer,
    hint: 'Does the gap describe a thing, or tell how something was done?',
    explain: [`The gap tells ${item.tells}.`, `That needs an ${item.kind}.`, `So the word is “${item.answer}”: ${filled}`],
  };
}

export const describingWords: Lesson = {
  id: 'describing-words',
  title: 'Adjectives and Adverbs',
  Thumb,
  Scene: DescribingScene,
  sceneHint: 'Drag a word into each box · Watch the picture change',
  learn: {
    heading: 'Adjectives and adverbs',
    intro:
      'Describing words paint a picture in the reader’s mind. Adjectives describe nouns (people, animals and things). Adverbs describe verbs (actions).',
    points: [
      { icon: Palette, text: 'An adjective tells what a noun is like: a big dog, a red hat.' },
      { icon: Wind, text: 'An adverb tells how an action happens: ran quickly, sang softly.' },
      { icon: Sparkles, text: 'Many adverbs end in -ly: happy becomes happily.' },
      { icon: Eye, text: 'Pick words that help the reader see and hear the scene.' },
    ],
  },
  steps: [
    'Find the noun (the thing) and the verb (the action).',
    'Ask “What is it like?” to choose an adjective. It usually goes before the noun.',
    'Ask “How did it happen?” to choose an adverb. It often goes after the verb.',
    'Read the sentence again. Can you picture it?',
  ],
  example: {
    question: 'Add an adjective and an adverb: The dog ran.',
    work: ['The noun is dog. What is it like? Big.', 'The verb is ran. How did it run? Quickly.', 'Put the adjective before dog and the adverb after ran.'],
    answer: 'The big dog ran quickly.',
  },
  grownups: [
    'Play “add a word”: say a plain sentence and take turns adding describing words.',
    'Adverbs can also tell when or where (soon, outside). This lesson starts with “how” adverbs, the easiest to spot.',
    'Not every -ly word is an adverb (friendly is an adjective), so ask your child what the word describes.',
  ],
  makeQuestion,
};
