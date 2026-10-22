import { useState } from 'react';
import { Ear, Hand, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { FIRST_SOUND_WORDS, distinctLetters, pic, pick, sameSound, shuffle, soundOf, wordsStartingWith } from './data';
import { mcq, level3 } from './q';
import { BigLetterVisual, DragCard, Emoji, Note, PicCard, PicChoice, PicVisual, Tap } from './visuals/Pictures';

const PAIL_COLORS = [C.blue, C.green, C.purple];
const PAIL_X = [200, 500, 800];
const PAIL_Y = 330;
const CARD_Y = 150;

interface Round {
  letters: string[];
  words: string[];
}

function newRound(): Round {
  // Three letters with different sounds, each with at least two pictures.
  for (let tries = 0; tries < 50; tries++) {
    const letters = distinctLetters(3);
    if (letters.every((l) => wordsStartingWith(l).length >= 2)) {
      const words = shuffle(letters.flatMap((l) => shuffle(wordsStartingWith(l)).slice(0, 2)));
      return { letters, words };
    }
  }
  return { letters: ['m', 's', 'b'], words: shuffle(['moon', 'map', 'sun', 'sock', 'bus', 'bee']) };
}

function Pail({ x, letter, color, inside }: { x: number; letter: string; color: string; inside: string[] }) {
  return (
    <Tap label={`Letter ${letter}. It says ${soundOf(letter)}. Tap to hear.`} onTap={() => speak(soundOf(letter), { force: true })}>
      <path d={`M${x - 110} ${PAIL_Y} L${x + 110} ${PAIL_Y} L${x + 88} ${PAIL_Y + 170} L${x - 88} ${PAIL_Y + 170} Z`} fill={shade(color, 0.78)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={x} cy={PAIL_Y} rx={110} ry={20} fill={shade(color, 0.55)} stroke={C.ink} strokeWidth={3} />
      <text x={x} y={PAIL_Y + 92} textAnchor="middle" dominantBaseline="central" fontSize={72} fontWeight={700} fill={shade(color, -0.45)}>
        {letter.toUpperCase()}
        {letter}
      </text>
      <text x={x} y={PAIL_Y + 150} textAnchor="middle" fontSize={17} fill={C.ink2}>
        says “{soundOf(letter)}”
      </text>
      {inside.map((w, i) => (
        <g key={w} className="pop-in" style={{ transformOrigin: `${x - 36 + i * 72}px ${PAIL_Y - 18}px` }}>
          <Emoji emoji={pic(w)} x={x - 36 + i * 72} y={PAIL_Y - 18} size={44} />
        </g>
      ))}
    </Tap>
  );
}

function FirstSoundScene() {
  const [round, setRound] = useState<Round>(() => newRound());
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [shake, setShake] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' }>({ text: 'Say the picture. What sound does it start with?', tone: 'plain' });
  const done = round.words.every((w) => placed[w]);

  const drop = (word: string, x: number, y: number) => {
    if (y < PAIL_Y - 80) return;
    const i = PAIL_X.findIndex((px) => Math.abs(x - px) < 130);
    if (i < 0) return;
    const letter = round.letters[i];
    if (word[0] === letter) {
      setPlaced({ ...placed, [word]: letter });
      play('correct');
      setMsg({ text: `Yes! ${word} starts with “${soundOf(letter)}”, the letter ${letter}.`, tone: 'good' });
    } else {
      setShake({ ...shake, [word]: (shake[word] ?? 0) + 1 });
      play('wrong');
      setMsg({ text: `Not yet. Say “${word}” slowly. Listen to the very first sound.`, tone: 'try' });
    }
  };

  const next = () => {
    setRound(newRound());
    setPlaced({});
    setShake({});
    setMsg({ text: 'Say the picture. What sound does it start with?', tone: 'plain' });
    play('pop');
  };

  const gap = 140;
  const startX = 500 - ((round.words.length - 1) * gap) / 2;

  return (
    <SceneSvg label="Sort pictures by their first sound">
      {round.words.map((w, i) =>
        placed[w] ? null : (
          <DragCard key={w} x={startX + i * gap} y={CARD_Y} label={`${w}. Drag to its first sound, or tap to hear.`} onTap={() => speak(w, { force: true })} onDrop={(p) => drop(w, p.x, p.y)} shakeKey={shake[w] ?? 0}>
            <PicCard emoji={pic(w)} w={118} h={118} size={66} />
          </DragCard>
        ),
      )}
      {round.letters.map((l, i) => (
        <Pail key={l} x={PAIL_X[i]} letter={l} color={PAIL_COLORS[i]} inside={round.words.filter((w) => placed[w] === l)} />
      ))}
      <Note x={110} y={590} w={600} h={60} text={done ? 'All sorted! Tap a pail to hear its sound.' : msg.text} tone={done ? 'good' : msg.tone} />
      <SvgButton x={760} y={594} w={200} h={52} fontSize={18} label="New sounds" onClick={next} color={done ? C.yellow : C.card} />

      <Callout at={[startX, CARD_Y - 50]} box={[20, 20]} w={190} icon={Ear} title="Tap to hear" text="Tap a picture to hear its name." />
      <Callout at={[PAIL_X[2], PAIL_Y + 10]} box={[740, 20]} w={230} icon={Sparkles} title="Letters make sounds" text="Tap a pail to hear its letter’s sound." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Emoji emoji="🌙" x={30} y={28} size={30} />
      <path d="M62 30 L112 30 L104 74 L70 74 Z" fill={shade(C.blue, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={87} y={58} textAnchor="middle" fontSize={26} fontWeight={700} fill={shade(C.blue, -0.4)}>
        Mm
      </text>
      <path d="M38 50 q12 16 26 4" fill="none" stroke={C.ink} strokeWidth={2} strokeDasharray="3 3" />
    </svg>
  );
}

function letterLabels(letters: string[]) {
  return {
    labels: Object.fromEntries(letters.map((l) => [l, `${l.toUpperCase()}${l}`])),
    names: Object.fromEntries(letters.map((l) => [l, `${l} (says ${soundOf(l)})`])),
  };
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv < 2) {
    const word = pick(FIRST_SOUND_WORDS);
    const letter = word[0];
    // At the easiest level the other choices are consonants, so vowel sounds aren't mixed up.
    const vowel = (l: string) => 'aeiou'.includes(l);
    const options = [letter, ...distinctLetters(8, letter).filter((l) => l !== letter && (lv > 0 || !vowel(l))).slice(0, lv === 0 ? 1 : 2)];
    return mcq({
      prompt: `What sound does ${word} start with?`,
      visual: <PicVisual emoji={pic(word)} word={word} />,
      answer: letter,
      wrong: options.filter((l) => l !== letter),
      ...letterLabels(options),
      hint: 'Say the word slowly. Stretch out the very first sound.',
      explain: [`Say it slowly: ${soundOf(letter)}… ${word}.`, `The first sound is “${soundOf(letter)}”.`, `“${soundOf(letter)}” is the letter ${letter}.`],
    });
  }
  // Which picture starts with this sound?
  const letter = pick(distinctLetters(1));
  const answer = pick(wordsStartingWith(letter));
  const wrong = shuffle(FIRST_SOUND_WORDS.filter((w) => !sameSound(w[0], letter)))
    .filter((w, i, arr) => arr.findIndex((v) => sameSound(v[0], w[0])) === i)
    .slice(0, 2);
  const words = [answer, ...wrong];
  return mcq({
    prompt: `Which one starts with “${soundOf(letter)}”?`,
    speak: `Which one starts with ${soundOf(letter)}?`,
    visual: <BigLetterVisual text={`${letter.toUpperCase()}${letter}`} />,
    answer,
    wrong,
    labels: Object.fromEntries(words.map((w) => [w, <PicChoice emoji={pic(w)} />])),
    names: Object.fromEntries(words.map((w) => [w, w])),
    hint: 'Say each picture slowly. Listen to how it begins.',
    explain: [`Say each one: ${shuffle(words).join(', ')}.`, `${answer} starts with “${soundOf(letter)}”.`, `That’s the letter ${letter}.`],
  });
}

export const beginningSounds: Lesson = {
  id: 'beginning-sounds',
  title: 'First Sounds',
  Thumb,
  Scene: FirstSoundScene,
  sceneHint: 'Drag each picture to the letter it starts with · Tap to hear',
  learn: {
    heading: 'The first sound',
    intro: 'Every word starts with a sound. Moon starts with “mmm”. The letter M makes that sound!',
    points: [
      { icon: Ear, text: 'Say the word slowly and stretch the first sound.' },
      { icon: Sparkles, text: 'Each letter makes a sound: m says “mmm”.' },
      { icon: Hand, text: 'Match the first sound to its letter.' },
    ],
  },
  steps: ['Look at the picture and say its name.', 'Say it again slowly: “mmm… moon”.', 'Listen to the first sound.', 'Find the letter that makes that sound.'],
  example: {
    question: 'What sound does sun start with?',
    visual: <PicVisual emoji={pic('sun')} word="sun" />,
    work: ['Say it slowly: sss… sun.', 'The first sound is “sss”.'],
    answer: 'Sun starts with “sss”, the letter s.',
  },
  grownups: [
    'Say letter sounds, not just letter names: “sss”, not “ess”. The sounds are what children blend into words later.',
    'Keep stretchy sounds smooth (“mmm”, “sss”) and bouncy sounds short (“b”, not “buh-uh”).',
    'Play “I spy something that starts with mmm…” around the house.',
    'C and K both make the “k” sound, so a word like key starts with k, not c. We never mix them in one round.',
  ],
  makeQuestion,
};
