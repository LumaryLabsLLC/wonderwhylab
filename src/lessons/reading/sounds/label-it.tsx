import { useState } from 'react';
import { Ear, Grid3x3, Hand, Tag } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { pic as sharedPic, pick, sayParts, shuffle, soundOf } from './data';
import { mcq, level3 } from './q';
import { DragCard, Emoji, LetterTile, Note, PicVisual, Tap } from './visuals/Pictures';

const pic = (word: string) => (word === 'hen' ? '🐔' : sharedPic(word));

interface Thing {
  word: string;
  x: number;
  y: number;
}

interface Place {
  id: string;
  name: string;
  sky: string;
  ground: string;
  things: Thing[];
}

/** Three picture scenes; every label is a three-sound word with one letter per sound. */
const PLACES: Place[] = [
  {
    id: 'farm',
    name: 'Farm',
    sky: shade(C.blue, 0.75),
    ground: shade(C.green, 0.55),
    things: [
      { word: 'pig', x: 150, y: 400 },
      { word: 'hen', x: 410, y: 430 },
      { word: 'cat', x: 170, y: 220 },
      { word: 'dog', x: 420, y: 250 },
    ],
  },
  {
    id: 'garden',
    name: 'Garden',
    sky: shade(C.blue, 0.7),
    ground: shade(C.green, 0.5),
    things: [
      { word: 'sun', x: 420, y: 190 },
      { word: 'web', x: 150, y: 200 },
      { word: 'bug', x: 160, y: 420 },
      { word: 'ant', x: 410, y: 430 },
    ],
  },
  {
    id: 'room',
    name: 'My room',
    sky: shade(C.yellow, 0.8),
    ground: shade(C.wood, 0.45),
    things: [
      { word: 'bed', x: 160, y: 420 },
      { word: 'hat', x: 420, y: 420 },
      { word: 'map', x: 160, y: 210 },
      { word: 'pen', x: 420, y: 230 },
    ],
  },
];

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTS = 'bdfmnpst'.split('');
const partsOf = (word: string) => word.split('');

const BOX = 96;
const BOX_Y = 196;
const TRAY_Y = 400;
const boxX = (i: number) => 785 + (i - 1) * 110;
const tileX = (i: number, m: number) => 785 + (i - (m - 1) / 2) * 68;

interface LetterChip {
  id: number;
  text: string;
}

function dealTiles(word: string): LetterChip[] {
  const extra = [pick(VOWELS.filter((v) => !word.includes(v))), pick(CONSONANTS.filter((c) => !word.includes(c)))];
  return shuffle([...partsOf(word), ...extra]).map((text, id) => ({ id, text }));
}

function LabelScene() {
  const [placeId, setPlaceId] = useState(PLACES[0].id);
  const place = PLACES.find((p) => p.id === placeId)!;
  const [labelled, setLabelled] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [tiles, setTiles] = useState<LetterChip[]>([]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState({ id: -1, key: 0 });
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const parts = current ? partsOf(current) : [];
  const need = current ? parts[placed.length] : '';
  const allDone = place.things.every((t) => labelled.includes(t.word));

  const choose = (word: string) => {
    // Tapping a thing in the picture says its name, so the child knows which word to spell.
    speak(word, { force: true });
    if (labelled.includes(word)) {
      setCurrent(null);
      setMsg({ text: `That label says ${word}. Pick something without a label.`, tone: 'plain' });
      return;
    }
    setCurrent(word);
    setTiles(dealTiles(word));
    setPlaced([]);
    setMisses(0);
    setMsg(null);
  };

  const switchPlace = (id: string) => {
    setPlaceId(id);
    setLabelled([]);
    setCurrent(null);
    setMsg(null);
    play('pop');
  };

  const attempt = (chip: LetterChip) => {
    if (!current || placed.includes(chip.id)) return;
    speak(soundOf(chip.text), { force: true });
    if (chip.text === need) {
      const next = [...placed, chip.id];
      setPlaced(next);
      setMisses(0);
      if (next.length === parts.length) {
        play('correct');
        const done = [...labelled, current];
        setLabelled(done);
        setCurrent(null);
        const finished = place.things.every((t) => done.includes(t.word));
        setMsg({ text: finished ? `You labelled the whole picture! Read your labels: ${place.things.map((t) => t.word).join(', ')}.` : `${sayParts(parts)}: ${current}! Your label is on. Tap something else.`, tone: 'good' });
      } else play('pop');
      return;
    }
    play('wrong');
    setShake((s) => ({ id: chip.id, key: s.key + 1 }));
    const pos = placed.length === 0 ? 'first' : placed.length === 1 ? 'middle' : 'last';
    const tries = misses + 1;
    setMisses(tries);
    setMsg(
      tries >= 2
        ? { text: `The ${pos} sound in ${current} is “${soundOf(need)}”. Find the tile that says it.`, tone: 'try' }
        : { text: `${chip.text} says “${soundOf(chip.text)}”. Not yet! Say ${current} slowly: what is the ${pos} sound?`, tone: 'try' },
    );
  };

  const nearBoxes = (x: number, y: number) => y > BOX_Y - 70 && y < BOX_Y + BOX + 70 && x > boxX(0) - BOX && x < boxX(2) + BOX;

  return (
    <SceneSvg label={`Label the ${place.name.toLowerCase()} picture`}>
      {PLACES.map((p, i) => (
        <SvgButton key={p.id} x={40 + i * 180} y={22} w={166} h={52} fontSize={19} label={p.name} onClick={() => switchPlace(p.id)} active={p.id === placeId} color={p.id === placeId ? C.yellow : C.card} />
      ))}

      {/* The picture */}
      <clipPath id="label-it-clip">
        <rect x={30} y={96} width={540} height={470} rx={22} />
      </clipPath>
      <g clipPath="url(#label-it-clip)">
        <rect x={30} y={96} width={540} height={470} fill={place.sky} />
        <rect x={30} y={330} width={540} height={236} fill={place.ground} />
      </g>
      <rect x={30} y={96} width={540} height={470} rx={22} fill="none" stroke={C.ink} strokeWidth={2.5} />
      {place.things.map((t) => {
        const done = labelled.includes(t.word);
        const on = current === t.word;
        return (
          <Tap key={t.word} label={done ? `${t.word}, labelled` : `Something to label. Tap to hear its name.`} onTap={() => choose(t.word)}>
            <circle cx={t.x} cy={t.y} r={62} fill={on ? shade(C.yellow, 0.4) : C.white} opacity={on ? 0.95 : 0.55} stroke={on ? C.ink : 'none'} strokeWidth={3} />
            <Emoji emoji={pic(t.word)} x={t.x} y={t.y} size={84} />
            <rect x={t.x - 62} y={t.y + 66} width={124} height={46} rx={12} fill={C.white} fillOpacity={done ? 1 : 0.7} stroke={C.ink} strokeWidth={2} strokeDasharray={done ? undefined : '7 6'} />
            {done && (
              <text x={t.x} y={t.y + 90} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="pop-in" style={{ transformOrigin: `${t.x}px ${t.y + 90}px` }}>
                {t.word}
              </text>
            )}
          </Tap>
        );
      })}

      {/* The label maker */}
      <rect x={600} y={96} width={370} height={470} rx={22} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {current ? (
        <>
          <Tap label={`${current}. Tap to hear it again.`} onTap={() => speak(current, { force: true })}>
            <Emoji emoji={pic(current)} x={700} y={146} size={56} />
            <text x={740} y={146} dominantBaseline="central" fontSize={18} fill={C.ink2}>
              Tap to hear it
            </text>
          </Tap>
          {parts.map((part, i) => {
            const chip = tiles.find((c) => c.id === placed[i]);
            return (
              <g key={i}>
                <rect x={boxX(i) - BOX / 2} y={BOX_Y} width={BOX} height={BOX} rx={12} fill={chip ? shade(C.yellow, 0.75) : C.white} stroke={C.ink} strokeWidth={i === placed.length ? 4 : 2.5} />
                {chip && (
                  <text x={boxX(i)} y={BOX_Y + BOX / 2 + 2} textAnchor="middle" dominantBaseline="central" fontSize={54} fontWeight={700} fill={C.ink}>
                    {part}
                  </text>
                )}
              </g>
            );
          })}
          <text x={785} y={TRAY_Y - 66} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
            Letter tiles
          </text>
          {tiles.map((chip, i) =>
            placed.includes(chip.id) ? null : (
              <DragCard
                key={`${current}-${chip.id}`}
                x={tileX(i, tiles.length)}
                y={TRAY_Y}
                label={`Letter tile ${chip.text}. Tap or drag it into the next box.`}
                onTap={() => attempt(chip)}
                onDrop={(p) => nearBoxes(p.x, p.y) && attempt(chip)}
                shakeKey={shake.id === chip.id ? shake.key : 0}
              >
                <LetterTile text={chip.text} w={58} h={76} fontSize={42} lit={misses >= 2 && chip.text === need} />
              </DragCard>
            ),
          )}
          <SvgButton x={705} y={482} w={160} h={52} fontSize={18} label="Start again" onClick={() => choose(current)} disabled={placed.length === 0} />
        </>
      ) : (
        <g>
          <Emoji emoji="🏷️" x={785} y={232} size={60} />
          <text x={785} y={320} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
            {allDone ? 'All labelled!' : 'Tap something in the picture'}
          </text>
          <text x={785} y={352} textAnchor="middle" fontSize={18} fill={C.ink2}>
            {allDone ? 'Pick another picture at the top.' : 'Then build its label here.'}
          </text>
        </g>
      )}

      <Note x={60} y={588} w={880} h={64} tone={msg?.tone ?? 'plain'} text={msg?.text ?? (current ? `Say ${current} slowly. Put the letter for each sound in the boxes.` : 'Every picture needs labels! Tap a thing to hear its name.')} />

      <Callout at={[place.things[0].x, place.things[0].y + 90]} box={[230, 110]} w={200} icon={Tag} title="Labels name things" text="A label is a word that tells what something is." />
      {current && <Callout at={[boxX(0) - BOX / 2, BOX_Y + 20]} box={[620, 300]} w={190} icon={Grid3x3} title="One box, one sound" text="Say the word slowly and fill the boxes in order." />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={4} width={112} height={72} rx={8} fill={shade(C.green, 0.6)} stroke={C.ink} strokeWidth={1.5} />
      <Emoji emoji="🐷" x={36} y={32} size={30} />
      <rect x={16} y={52} width={40} height={18} rx={4} fill={C.white} stroke={C.ink} strokeWidth={1.2} />
      <text x={36} y={66} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>
        pig
      </text>
      <Emoji emoji="🐔" x={86} y={32} size={30} />
      <rect x={66} y={52} width={40} height={18} rx={4} fill={C.white} stroke={C.ink} strokeWidth={1.2} strokeDasharray="3 3" />
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

const ALL_WORDS = PLACES.flatMap((p) => p.things.map((t) => t.word));

/** Labels with the first or last sound changed. */
const EDGE_MISSES: Record<string, [string, string]> = {
  pig: ['big', 'pin'],
  hen: ['ten', 'hem'],
  cat: ['bat', 'cap'],
  dog: ['log', 'dot'],
  sun: ['bun', 'sum'],
  web: ['deb', 'wet'],
  bug: ['mug', 'bun'],
  ant: ['and', 'act'],
  bed: ['red', 'beg'],
  hat: ['mat', 'ham'],
  map: ['tap', 'mat'],
  pen: ['ten', 'pet'],
};

/** Labels with the middle (vowel) sound changed. */
const MIDDLE_MISSES: Record<string, [string, string]> = {
  pig: ['peg', 'pug'],
  hen: ['hin', 'hun'],
  cat: ['cot', 'cut'],
  dog: ['dig', 'dug'],
  sun: ['sin', 'sen'],
  web: ['wib', 'wab'],
  bug: ['big', 'bag'],
  ant: ['int', 'unt'],
  bed: ['bad', 'bud'],
  hat: ['hit', 'hut'],
  map: ['mop', 'mep'],
  pen: ['pin', 'pan'],
};

/** Three things in a picture with an arrow pointing at one of them. */
function ArrowPicture({ words, target }: { words: string[]; target: string }) {
  const i = words.indexOf(target);
  const x = 60 + i * 100;
  return (
    <svg viewBox="0 0 300 160" role="img" aria-label={`A picture of a ${words.join(', a ')}. The arrow points at the ${target}.`}>
      <rect x={4} y={4} width={292} height={152} rx={14} fill={shade(C.green, 0.65)} stroke={C.ink} strokeWidth={2} />
      {words.map((w, k) => (
        <Emoji key={w} emoji={pic(w)} x={60 + k * 100} y={104} size={60} />
      ))}
      <path d={`M${x} 22 v34`} stroke={C.red} strokeWidth={6} strokeLinecap="round" />
      <path d={`M${x - 14} 46 L${x} 64 L${x + 14} 46 Z`} fill={C.red} stroke={C.red} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  const word = pick(ALL_WORDS);
  const parts = partsOf(word);
  if (lv === 0) {
    const wrong = shuffle(ALL_WORDS.filter((w) => w[0] !== word[0])).filter((w, k, arr) => arr.findIndex((v) => v[0] === w[0]) === k).slice(0, 2);
    return mcq({
      prompt: 'Which label goes with this picture?',
      speak: `Which label says ${word}?`,
      visual: <PicVisual emoji={pic(word)} />,
      answer: word,
      wrong,
      hint: 'Say the name of the picture. Then read each label, sound by sound.',
      explain: [`The picture is a ${word}.`, `Say it slowly: ${sayParts(parts)}.`, `The label that says ${word} is ${word}.`],
    });
  }
  if (lv === 1) {
    return mcq({
      prompt: 'Which label goes with this picture?',
      speak: `Which label says ${word}?`,
      visual: <PicVisual emoji={pic(word)} />,
      answer: word,
      wrong: EDGE_MISSES[word],
      hint: 'Read each label sound by sound. Check the first and the last sounds.',
      explain: [`Say it slowly: ${sayParts(parts)}.`, `First sound ${parts[0]}, last sound ${parts[2]}.`, `So the label is ${word}.`],
    });
  }
  const place = PLACES.find((p) => p.things.some((t) => t.word === word))!;
  const words = shuffle(place.things.map((t) => t.word).filter((w) => w !== word)).slice(0, 2);
  const row = shuffle([word, ...words]);
  return mcq({
    prompt: 'Which label goes where the arrow points?',
    visual: <ArrowPicture words={row} target={word} />,
    answer: word,
    wrong: MIDDLE_MISSES[word],
    hint: 'Name the thing the arrow points to. Listen carefully for the middle sound.',
    explain: [`The arrow points to the ${word}.`, `Say it slowly: ${sayParts(parts)}.`, `The middle sound is “${soundOf(parts[1])}”, so the label is ${word}.`],
  });
}

export const labelIt: Lesson = {
  id: 'label-it',
  title: 'Label the Picture',
  Thumb,
  Scene: LabelScene,
  sceneHint: 'Tap a thing · Say it slowly · Build its label sound by sound',
  learn: {
    heading: 'Writing labels',
    intro: 'A label is a word that names something in a picture. Writers use labels to tell us what things are.',
    points: [
      { icon: Tag, text: 'A label names one thing: hen, sun, bed.' },
      { icon: Ear, text: 'Say the word slowly to hear each sound.' },
      { icon: Hand, text: 'Put the letter for each sound in order.' },
    ],
  },
  steps: ['Pick something in the picture.', 'Say its name slowly.', 'Write the letter for each sound.', 'Read your label back.'],
  example: {
    question: 'Label the picture of the pig.',
    visual: <PicVisual emoji={pic('pig')} />,
    work: ['Say it slowly: puh – ih – guh.', 'puh is p, ih is i, guh is g.', 'Read it back: p – i – g, pig.'],
    answer: 'pig',
  },
  grownups: [
    'Labelling drawings is one of the first kinds of real writing. It turns sound-by-sound spelling into something with a purpose.',
    'Let your child draw a picture and label it. Accept sound spellings like “hd” for hand at first, then help them catch the missing sound.',
    'Label things around the house together: door, bed, cup.',
    'Always read the label back, pointing under each letter as you say its sound.',
  ],
  makeQuestion,
};
