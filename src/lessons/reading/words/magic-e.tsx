import { useState } from 'react';
import { MoveLeft, Sparkles, VolumeX } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { LONG, PIC, SOUND, saySound, slash } from './phonics';
import { DragTile, Emoji, EmojiPicture, LetterTile, Panel, TileFace, TileRow } from './visuals/Tiles';

interface Pair {
  short: string;
  long: string;
  shortMeaning: string;
  longMeaning: string;
}

const PAIRS: Pair[] = [
  { short: 'kit', long: 'kite', shortMeaning: 'a set of things you need', longMeaning: 'it flies in the wind on a string' },
  { short: 'pin', long: 'pine', shortMeaning: 'a small sharp pin that holds paper up', longMeaning: 'a tall tree with needles' },
  { short: 'can', long: 'cane', shortMeaning: 'a metal tin for food', longMeaning: 'a stick that helps you walk' },
  { short: 'cub', long: 'cube', shortMeaning: 'a baby bear or lion', longMeaning: 'a shape with 6 square faces, like ice' },
  { short: 'not', long: 'note', shortMeaning: 'no', longMeaning: 'a short letter' },
  { short: 'plan', long: 'plane', shortMeaning: 'an idea of what to do', longMeaning: 'it flies in the sky' },
  { short: 'cap', long: 'cape', shortMeaning: 'a hat with a peak', longMeaning: 'a cloak, like a superhero’s' },
  { short: 'hop', long: 'hope', shortMeaning: 'to jump on one foot', longMeaning: 'to wish for something' },
  { short: 'tub', long: 'tube', shortMeaning: 'a bath or a big pot', longMeaning: 'a long, hollow pipe' },
  { short: 'cut', long: 'cute', shortMeaning: 'to snip with scissors', longMeaning: 'sweet and lovely' },
];

const vowelOf = (w: string) => [...w].find((l) => 'aeiou'.includes(l))!;
const SLOT_Y = 248;
const TILE_W = 104;
const E_HOME = { x: 860, y: 486 };

function MagicEScene() {
  const [index, setIndex] = useState(0);
  const [withE, setWithE] = useState(false);
  const [shake, setShake] = useState(0);
  const pair = PAIRS[index];
  const word = withE ? pair.long : pair.short;
  const letters = pair.short.split('');
  const v = vowelOf(pair.short);
  const vi = letters.indexOf(v);
  const total = (letters.length + 1) * TILE_W + letters.length * 14;
  const x0 = 470 - total / 2 + TILE_W / 2;
  const xAt = (i: number) => x0 + i * (TILE_W + 14);
  const slotX = xAt(letters.length);
  const pic = PIC[word];

  const addE = () => {
    if (withE) return;
    setWithE(true);
    play('correct');
  };
  const drop = (p: Pt) => {
    if (Math.abs(p.x - slotX) < 90 && Math.abs(p.y - SLOT_Y) < 90) addE();
    else setShake(shake + 1);
  };
  const choose = (i: number) => {
    setIndex(i);
    setWithE(false);
  };

  return (
    <SceneSvg label={`The word ${word}`}>
      {PAIRS.map((p, i) => (
        <SvgButton key={p.short} x={70 + i * 88} y={30} w={78} h={46} fontSize={19} label={p.short} active={i === index} color={i === index ? C.yellow : C.card} onClick={() => choose(i)} />
      ))}

      <Panel x={110} y={110} w={720} h={250} color={shade(C.blue, 0.88)} />
      {/* Vowel sound label */}
      <g className={withE ? 'pop-in' : undefined} key={`${index}-${withE}`} style={{ transformOrigin: `${xAt(vi)}px 146px` }}>
        <rect x={xAt(vi) - 92} y={124} width={184} height={44} rx={12} fill={withE ? C.yellow : 'white'} stroke={C.ink} strokeWidth={2} />
        <text x={xAt(vi)} y={147} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
          {withE ? `says its name: ${v.toUpperCase()}` : `short ${slash(v)}`}
        </text>
      </g>
      {letters.map((l, i) => (
        <LetterTile
          key={i}
          x={xAt(i)}
          y={SLOT_Y}
          w={TILE_W}
          h={116}
          fontSize={68}
          text={l}
          color={i === vi ? (withE ? C.yellow : shade(C.yellow, 0.6)) : C.card}
          glow={withE && i === vi}
          onTap={() => (i === vi && withE ? speak(LONG[v], { force: true }) : saySound(l))}
        />
      ))}
      {withE ? (
        <g onClick={() => setWithE(false)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="Take the e away">
          <LetterTile x={slotX} y={SLOT_Y} w={TILE_W} h={116} fontSize={68} text="e" color={shade(C.purple, 0.7)} textColor={shade(C.ink, 0.35)} />
          <path d={`M${slotX - 30} ${SLOT_Y + 74} Q ${(slotX + xAt(vi)) / 2} ${SLOT_Y + 120} ${xAt(vi) + 22} ${SLOT_Y + 70}`} fill="none" stroke={C.purple} strokeWidth={4} strokeDasharray="8 6" />
          <path d={`M${xAt(vi) + 22} ${SLOT_Y + 70} l 4 14 l 10 -10 z`} fill={C.purple} />
        </g>
      ) : (
        <LetterTile x={slotX} y={SLOT_Y} w={TILE_W} h={116} fontSize={40} text="+e?" dashed />
      )}

      {/* The magic e */}
      {!withE && (
        <>
          <text x={E_HOME.x} y={E_HOME.y - 76} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
            Magic e
          </text>
          <DragTile x={E_HOME.x} y={E_HOME.y} label="Magic e" shakeKey={shake} onDrop={drop} onTap={addE}>
            <TileFace text="e" w={TILE_W} h={116} fontSize={68} color={shade(C.purple, 0.7)} />
          </DragTile>
        </>
      )}

      {/* What the word means */}
      <Panel x={110} y={410} w={620} h={230} />
      {pic ? <Emoji x={210} y={525} char={pic} size={100} /> : <Emoji x={210} y={525} char="📖" size={70} opacity={0.8} />}
      <text x={300} y={498} fontSize={56} fontWeight={700} fill={C.ink} style={{ fontFamily: 'var(--font-display)' }}>
        {word}
      </text>
      <text x={300} y={544} fontSize={19} fill={C.ink2}>
        {withE ? pair.longMeaning : pair.shortMeaning}
      </text>
      <SvgButton
        x={300}
        y={570}
        w={150}
        h={52}
        fontSize={19}
        label="Read it"
        color={C.teal}
        textColor={C.white}
        onClick={() => speak(`${letters.map((l, i) => (i === vi && withE ? LONG[l] : SOUND[l])).join(', ')}… ${word}`, { force: true })}
      />
      {withE && (
        <text x={470} y={600} fontSize={16} fill={C.muted}>
          Tap the e to take it away.
        </text>
      )}

      <Callout at={[slotX, SLOT_Y - 60]} box={[620, 60]} w={200} icon={VolumeX} title="Silent e" text="The e at the end makes no sound of its own." />
      <Callout at={[xAt(vi), SLOT_Y + 60]} box={[760, 380]} w={200} icon={Sparkles} title="Say its name" text="The e makes the vowel say its name: a → A, i → I, o → O, u → U." />
      <Callout at={[E_HOME.x - 52, E_HOME.y]} box={[760, 570]} w={200} icon={MoveLeft} title="Drag the e" text="Drop it at the end of the word and listen." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {['k', 'i', 't', 'e'].map((l, i) => (
        <g key={i}>
          <rect x={10 + i * 26} y={30} width={22} height={30} rx={5} fill={i === 3 ? shade(C.purple, 0.6) : i === 1 ? C.yellow : 'white'} stroke={C.ink} strokeWidth={2} />
          <text x={21 + i * 26} y={46} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>
            {l}
          </text>
        </g>
      ))}
      <path d="M95 26 Q70 8 45 26" fill="none" stroke={C.purple} strokeWidth={2.5} strokeDasharray="4 3" />
      <text x={104} y={18} fontSize={14}>
        ✨
      </text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

/** Pictures we can show, and which word of the pair they are. */
const PICTURE_ITEMS: { pair: Pair; word: string }[] = PAIRS.flatMap((pair) =>
  [pair.short, pair.long].filter((w) => PIC[w]).map((word) => ({ pair, word })),
);

/** Sentences where only one word of the pair makes sense. */
const SENTENCES: { text: string; answer: string; other: string }[] = [
  { text: 'I can fly my ___ in the wind.', answer: 'kite', other: 'kit' },
  { text: 'The ___ flew high in the sky.', answer: 'plane', other: 'plan' },
  { text: 'Put an ice ___ in the cup.', answer: 'cube', other: 'cub' },
  { text: 'I wrote a ___ to Mom.', answer: 'note', other: 'not' },
  { text: 'Grandpa walks with a ___.', answer: 'cane', other: 'can' },
  { text: 'A ___ tree is tall and green.', answer: 'pine', other: 'pin' },
  { text: 'I ___ it is sunny today.', answer: 'hope', other: 'hop' },
  { text: 'The puppy is so ___!', answer: 'cute', other: 'cut' },
  { text: 'I can ___ on one foot.', answer: 'hop', other: 'hope' },
  { text: 'A bear ___ is very small.', answer: 'cub', other: 'cube' },
  { text: 'Open a ___ of beans.', answer: 'can', other: 'cane' },
];

const longExplain = (w: string) => {
  const v = vowelOf(w);
  return `${w} ends in e, so ${v} says its name: ${slash(LONG[v])}.`;
};
const shortExplain = (w: string) => {
  const v = vowelOf(w);
  return `${w} has no e at the end, so ${v} is short: ${slash(v)}.`;
};

function makeQuestion(level: number): Question {
  if (level === 0) {
    const { pair, word } = pick(PICTURE_ITEMS);
    const isLong = word === pair.long;
    return {
      prompt: 'Read both words. Which one matches the picture?',
      visual: <EmojiPicture char={PIC[word]} label="A picture" />,
      choices: shuffle([pair.short, pair.long]).map((value) => ({ value })),
      answer: word,
      hint: 'Check the end of each word. Is there a magic e?',
      explain: [
        isLong ? longExplain(pair.long) : shortExplain(pair.short),
        isLong ? shortExplain(pair.short) : longExplain(pair.long),
        `The picture word is ${word}.`,
      ],
    };
  }
  if (level === 1) {
    const [a, b, c] = shuffle(PAIRS).slice(0, 3);
    const answer = a.long;
    return {
      prompt: 'Which word has a vowel that says its name?',
      choices: shuffle([answer, b.short, c.short]).map((value) => ({ value })),
      answer,
      hint: 'Look for the word with a magic e at the end.',
      explain: [`Look at the end of each word.`, longExplain(answer), `So the answer is ${answer}.`],
    };
  }
  const s = pick(SENTENCES);
  return {
    prompt: `Which word makes sense? “${s.text}”`,
    speak: `Which word makes sense? ${s.text.replace('___', 'blank')}`,
    choices: shuffle([s.answer, s.other]).map((value) => ({ value })),
    answer: s.answer,
    hint: 'Read both words carefully, then read the sentence with each one.',
    explain: [
      `Read both words: ${s.answer} and ${s.other}.`,
      s.answer.endsWith('e') ? longExplain(s.answer) : shortExplain(s.answer),
      `“${s.text.replace('___', s.answer)}” makes sense.`,
    ],
  };
}

export const magicE: Lesson = {
  id: 'magic-e',
  title: 'Magic e',
  Thumb,
  Scene: MagicEScene,
  sceneHint: 'Drag the magic e to the end · Tap letters to hear them',
  learn: {
    heading: 'Magic e',
    intro: 'When a short word ends in a silent e, the e makes the vowel before it say its name. kit becomes kite, and hop becomes hope!',
    points: [
      { icon: VolumeX, text: 'The e at the end is silent — you don’t say it.' },
      { icon: Sparkles, text: 'It makes the vowel say its name: A, I, O, U.' },
      { icon: MoveLeft, text: 'Look at the end of the word first, then read the vowel.' },
    ],
  },
  steps: ['Look at the end of the word. Is there an e?', 'If yes, the vowel says its name.', 'Keep the e silent.', 'Blend the sounds: /k/ /eye/ /t/ → kite.'],
  example: {
    question: 'Read: t u b e',
    visual: <TileRow tiles={[{ text: 't' }, { text: 'u', color: C.yellow }, { text: 'b' }, { text: 'e', color: shade(C.purple, 0.7) }]} label="t u b e" />,
    work: ['There is an e at the end, and it is silent.', 'So u says its name: /you/.', 'Blend: /t/ /you/ /b/ → tube.'],
    answer: 'The word is tube.',
  },
  grownups: [
    'Teachers also call this “split digraph” or “vowel-consonant-e”. Children only need the idea: e at the end, vowel says its name.',
    'Switch back and forth (cap → cape → cap) so your child hears the vowel change.',
    'Some common words break the rule (have, give, come). Those are heart words — learned in the Heart Words lesson.',
    'Point out magic e words on signs and packets: cake, bike, home, cube.',
  ],
  makeQuestion,
};
