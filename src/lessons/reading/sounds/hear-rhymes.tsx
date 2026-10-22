import { useState } from 'react';
import { Ear, Home, Music } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { RHYME_FAMILIES, familyOf, pic, pick, shuffle } from './data';
import type { RhymeFamily } from './data';
import { mcq, level3 } from './q';
import { DragCard, Emoji, Note, PicCard, PicChoice, PicVisual, Tap } from './visuals/Pictures';

const HOUSES = [
  { x: 120, color: C.red },
  { x: 560, color: C.blue },
];
const HOUSE_W = 320;
const HOUSE_TOP = 60;
const HOUSE_H = 280;
const SHELF_Y = 545;

interface Round {
  families: RhymeFamily[];
  cards: { word: string; family: number }[];
}

function newRound(prev?: Round): Round {
  // Families with at least three words give two cards each.
  const big = RHYME_FAMILIES.filter((f) => f.words.length >= 3 && !prev?.families.includes(f));
  const families = shuffle(big.length >= 2 ? big : RHYME_FAMILIES.filter((f) => f.words.length >= 3)).slice(0, 2);
  const cards = shuffle(families.flatMap((f, i) => f.words.slice(1).map((word) => ({ word, family: i }))));
  return { families, cards };
}

function RhymeScene() {
  const [round, setRound] = useState<Round>(() => newRound());
  const [home, setHome] = useState<Record<string, number>>({});
  const [shake, setShake] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' }>({ text: 'Drag each picture to the house it rhymes with.', tone: 'plain' });

  const left = round.cards.filter((c) => home[c.word] === undefined);
  const done = left.length === 0;

  const houseAt = (x: number, y: number) =>
    HOUSES.findIndex((h) => x >= h.x - 20 && x <= h.x + HOUSE_W + 20 && y >= HOUSE_TOP - 40 && y <= HOUSE_TOP + HOUSE_H + 30);

  const drop = (card: Round['cards'][number], x: number, y: number) => {
    const i = houseAt(x, y);
    if (i < 0) return;
    const head = round.families[i].words[0];
    if (i === card.family) {
      setHome({ ...home, [card.word]: i });
      play('correct');
      setMsg({ text: `Yes! ${head} and ${card.word} rhyme. They end with ${round.families[i].rime}.`, tone: 'good' });
    } else {
      setShake({ ...shake, [card.word]: (shake[card.word] ?? 0) + 1 });
      play('wrong');
      setMsg({ text: `Not yet. Say ${head} and ${card.word}. Do they end the same?`, tone: 'try' });
    }
  };

  const next = () => {
    setRound(newRound(round));
    setHome({});
    setShake({});
    setMsg({ text: 'Drag each picture to the house it rhymes with.', tone: 'plain' });
    play('pop');
  };

  const slots = round.cards.length;
  const gap = 150;
  const startX = 500 - ((slots - 1) * gap) / 2;

  return (
    <SceneSvg label="Two rhyme houses and picture cards to sort">
      {HOUSES.map((h, i) => {
        const fam = round.families[i];
        const head = fam.words[0];
        const inside = round.cards.filter((c) => home[c.word] === i);
        return (
          <Tap key={i} label={`House for words that rhyme with ${head}. Tap to hear.`} onTap={() => speak([head, ...inside.map((c) => c.word)].join(', '), { force: true })}>
            <polygon
              points={`${h.x - 16},${HOUSE_TOP + 100} ${h.x + HOUSE_W / 2},${HOUSE_TOP} ${h.x + HOUSE_W + 16},${HOUSE_TOP + 100}`}
              fill={h.color}
              stroke={C.ink}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            <rect x={h.x} y={HOUSE_TOP + 100} width={HOUSE_W} height={HOUSE_H - 100} rx={10} fill={shade(h.color, 0.82)} stroke={C.ink} strokeWidth={3} />
            <Emoji emoji={pic(head)} x={h.x + HOUSE_W / 2} y={HOUSE_TOP + 64} size={50} />
            <text x={h.x + HOUSE_W / 2} y={HOUSE_TOP + 130} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>
              {head}
            </text>
            {inside.map((c, k) => (
              <g key={c.word} className="pop-in" style={{ transformOrigin: `${h.x + 80 + k * 160}px ${HOUSE_TOP + 205}px` }}>
                <circle cx={h.x + 80 + k * 160} cy={HOUSE_TOP + 205} r={42} fill={C.white} stroke={C.ink} strokeWidth={2} />
                <Emoji emoji={pic(c.word)} x={h.x + 80 + k * 160} y={HOUSE_TOP + 205} size={46} />
              </g>
            ))}
            {inside.length === 0 && (
              <text x={h.x + HOUSE_W / 2} y={HOUSE_TOP + 210} textAnchor="middle" fontSize={16} fill={C.muted}>
                Rhymes with {head} live here
              </text>
            )}
          </Tap>
        );
      })}

      <Note x={130} y={378} w={620} h={66} text={done ? 'Everyone is home! Tap a house to hear its rhymes.' : msg.text} tone={done ? 'good' : msg.tone} />

      <rect x={60} y={SHELF_Y + 70} width={880} height={14} rx={7} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      {round.cards.map((c, i) =>
        home[c.word] === undefined ? (
          <DragCard
            key={`${c.word}`}
            x={startX + i * gap}
            y={SHELF_Y}
            label={`${c.word}. Drag to a house, or tap to hear.`}
            onTap={() => speak(c.word, { force: true })}
            onDrop={(p) => drop(c, p.x, p.y)}
            shakeKey={shake[c.word] ?? 0}
          >
            <PicCard emoji={pic(c.word)} word={c.word} />
          </DragCard>
        ) : null,
      )}

      <SvgButton x={770} y={385} w={180} h={52} fontSize={18} label="New houses" onClick={next} color={done ? C.yellow : C.card} />

      <Callout at={[HOUSES[0].x + HOUSE_W / 2, HOUSE_TOP + 20]} box={[18, 8]} w={220} icon={Home} title="Rhyme house" text="Words that end with the same sound live together." />
      <Callout at={[startX, SHELF_Y - 40]} box={[20, 420]} w={200} icon={Ear} title="Tap to hear" text="Tap a picture or a house to hear the words." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <polygon points="8,34 34,10 60,34" fill={C.red} stroke={C.ink} strokeWidth={2} />
      <rect x={12} y={34} width={44} height={36} fill={shade(C.red, 0.8)} stroke={C.ink} strokeWidth={2} />
      <Emoji emoji="🐱" x={34} y={52} size={24} />
      <Emoji emoji="🎩" x={86} y={40} size={34} />
      <Music x={66} y={8} size={16} color={C.ink} />
    </svg>
  );
}

function otherWords(word: string, count: number): string[] {
  const fam = familyOf(word);
  // One word from each of `count` other families, so no two distractors rhyme with each other.
  return shuffle(RHYME_FAMILIES.filter((f) => f !== fam))
    .slice(0, count)
    .map((f) => pick(f.words));
}

function labelsFor(words: string[]) {
  return {
    labels: Object.fromEntries(words.map((w) => [w, <PicChoice emoji={pic(w)} />])),
    names: Object.fromEntries(words.map((w) => [w, w])),
  };
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv < 2) {
    const fam = pick(RHYME_FAMILIES);
    const [target, answer] = shuffle(fam.words).slice(0, 2);
    const wrong = otherWords(target, lv === 0 ? 1 : 2);
    return mcq({
      prompt: `Which one rhymes with ${target}?`,
      speak: `Which one rhymes with ${target}?`,
      visual: <PicVisual emoji={pic(target)} word={target} />,
      answer,
      wrong,
      ...labelsFor([answer, ...wrong]),
      hint: 'Say each word out loud. Listen to the end of the word.',
      explain: [`Say them: ${target}, ${answer}.`, `They both end with ${fam.rime}.`, `So ${answer} rhymes with ${target}.`],
    });
  }
  // Odd one out: two rhyming words and one that doesn't.
  const fam = pick(RHYME_FAMILIES);
  const [a, b] = shuffle(fam.words).slice(0, 2);
  const [odd] = otherWords(a, 1);
  return mcq({
    prompt: 'Which one does NOT rhyme?',
    speak: 'Which one does not rhyme? Say each picture out loud.',
    answer: odd,
    wrong: [a, b],
    ...labelsFor([a, b, odd]),
    hint: 'Say all three. Two of them end the same way.',
    explain: [`Say them all: ${a}, ${b}, ${odd}.`, `${a} and ${b} both end with ${fam.rime}.`, `${odd} ends differently, so ${odd} does not rhyme.`],
  });
}

export const hearRhymes: Lesson = {
  id: 'hear-rhymes',
  title: 'Rhymes',
  Thumb,
  Scene: RhymeScene,
  sceneHint: 'Drag each picture into the house it rhymes with · Tap to hear',
  learn: {
    heading: 'Words that rhyme',
    intro: 'Words rhyme when they end with the same sound. Cat, hat and bat all end with “at”!',
    points: [
      { icon: Ear, text: 'Say the words out loud and listen to the end.' },
      { icon: Music, text: 'Rhymes sound the same at the end, like in songs.' },
      { icon: Home, text: 'The start can be different: c-at, h-at, b-at.' },
    ],
  },
  steps: ['Say the first word out loud.', 'Say the second word.', 'Listen to the very end of each word.', 'If the ends sound the same, they rhyme!'],
  example: {
    question: 'Does dog rhyme with frog?',
    visual: <PicVisual emoji={`${pic('dog')} ${pic('frog')}`} />,
    work: ['Say them: dog, frog.', 'Both end with “og”.'],
    answer: 'Yes! Dog and frog rhyme.',
  },
  grownups: [
    'Rhyming is part of phonological awareness, hearing the sound parts of words. It is a strong early predictor of reading.',
    'Play rhyme games out loud: “I spy something that rhymes with log…”. No letters needed yet.',
    'Nonsense rhymes count too: cat, hat, zat! They show your child is listening to sounds, not meanings.',
    'Read rhyming books together and pause so your child can say the rhyming word.',
  ],
  makeQuestion,
};
