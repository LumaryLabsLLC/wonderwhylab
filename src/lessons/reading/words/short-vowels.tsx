import { useRef, useState } from 'react';
import { ArrowUpDown, Ear, Puzzle, Volume2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PIC, SOUND, VOWELS, sayBlend, saySound, slash } from './phonics';
import { Emoji, EmojiPicture, LetterTile, Panel, TileRow, wrapText } from './visuals/Tiles';

type Vowel = (typeof VOWELS)[number];

interface Frame {
  start: string;
  end: string;
  /** Real words this frame makes, by vowel, with a child-friendly meaning (and a picture when there is one). */
  words: Partial<Record<Vowel, { meaning: string; pic?: string }>>;
}

const FRAMES: Frame[] = [
  {
    start: 'c',
    end: 't',
    words: {
      a: { meaning: 'A furry pet that says meow.', pic: '🐱' },
      o: { meaning: 'A small bed.' },
      u: { meaning: 'To snip with scissors.', pic: '✂️' },
    },
  },
  {
    start: 'b',
    end: 'g',
    words: {
      a: { meaning: 'You carry things in it.', pic: '👜' },
      e: { meaning: 'To ask for something very much.' },
      i: { meaning: 'Large — not small.' },
      o: { meaning: 'Wet, muddy ground.' },
      u: { meaning: 'A tiny creature, like a beetle.', pic: '🐛' },
    },
  },
  {
    start: 'p',
    end: 'n',
    words: {
      a: { meaning: 'You cook eggs in it.', pic: '🍳' },
      e: { meaning: 'You write with it.', pic: '🖊️' },
      i: { meaning: 'A small, sharp pin holds paper up.', pic: '📌' },
      u: { meaning: 'A joke that plays with words.' },
    },
  },
  {
    start: 'l',
    end: 'g',
    words: {
      a: { meaning: 'To be slow and fall behind.' },
      e: { meaning: 'You stand and walk on it.', pic: '🦵' },
      o: { meaning: 'A thick piece of a tree trunk.' },
      u: { meaning: 'To carry something heavy.' },
    },
  },
  {
    start: 'm',
    end: 'p',
    words: {
      a: { meaning: 'A drawing that shows where places are.', pic: '🗺️' },
      o: { meaning: 'A tool for washing floors.' },
    },
  },
];

/** A word for each short vowel sound, to anchor the sound. */
const KEY_WORD: Record<Vowel, string> = { a: 'apple', e: 'egg', i: 'insect', o: 'octopus', u: 'up' };

const TILE_Y = 268;
const XS = [340, 500, 660];
const STEP = 64;

function ShortVowelScene() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [vowel, setVowel] = useState<Vowel>('a');
  const frame = FRAMES[frameIndex];
  const word = `${frame.start}${vowel}${frame.end}`;
  const real = frame.words[vowel];

  const dragFrom = useRef<{ y: number; index: number; moved: boolean } | null>(null);
  const setVowelSound = (v: Vowel) => {
    if (v !== vowel) play('pop');
    setVowel(v);
  };
  const slide = useSvgDrag(
    (p) => {
      const d = dragFrom.current;
      if (!d) return;
      // Down moves to the next vowel (like ▼), up to the previous one (like ▲).
      const steps = Math.round((p.y - d.y) / STEP);
      if (steps !== 0) d.moved = true;
      const index = Math.min(4, Math.max(0, d.index + steps));
      setVowelSound(VOWELS[index]);
    },
    {
      onStart: (p) => {
        dragFrom.current = { y: p.y, index: VOWELS.indexOf(vowel), moved: false };
      },
      onEnd: () => {
        if (dragFrom.current && !dragFrom.current.moved) saySound(vowel);
        dragFrom.current = null;
      },
    },
  );
  const nudge = (dir: 1 | -1) => {
    const i = Math.min(4, Math.max(0, VOWELS.indexOf(vowel) + dir));
    setVowelSound(VOWELS[i]);
  };

  return (
    <SceneSvg label={`A word machine that makes ${word}`}>
      <text x={500} y={40} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        Pick a word machine
      </text>
      {FRAMES.map((f, i) => (
        <SvgButton
          key={i}
          x={500 - (FRAMES.length * 108 - 12) / 2 + i * 108}
          y={56}
          w={96}
          h={48}
          fontSize={22}
          label={`${f.start} _ ${f.end}`}
          active={i === frameIndex}
          color={i === frameIndex ? C.yellow : C.card}
          onClick={() => {
            setFrameIndex(i);
            setVowel('a');
          }}
        />
      ))}

      <Panel x={200} y={124} w={600} h={292} color={shade(C.orange, 0.85)} />
      <LetterTile x={XS[0]} y={TILE_Y} w={120} h={136} fontSize={84} text={frame.start} onTap={() => saySound(frame.start)} />
      <g {...slide} role="slider" aria-label="Middle vowel" aria-valuetext={vowel}>
        <LetterTile x={XS[1]} y={TILE_Y} w={120} h={136} fontSize={84} text={vowel} color={C.yellow} />
      </g>
      <LetterTile x={XS[2]} y={TILE_Y} w={120} h={136} fontSize={84} text={frame.end} onTap={() => saySound(frame.end)} />
      <SvgButton x={470} y={134} w={60} h={52} fontSize={22} label="▲" title="Previous vowel" onClick={() => nudge(-1)} disabled={vowel === 'a'} />
      <SvgButton x={470} y={350} w={60} h={52} fontSize={22} label="▼" title="Next vowel" onClick={() => nudge(1)} disabled={vowel === 'u'} />
      <text x={XS[1] + 46} y={166} fontSize={18} fill={C.ink2}>
        {slash(vowel)} as in <tspan fontWeight={700} fill={C.ink}>{KEY_WORD[vowel]}</tspan>
      </text>

      {/* Vowel picker */}
      {VOWELS.map((v, i) => (
        <SvgButton
          key={v}
          x={296 + i * 84}
          y={438}
          w={72}
          h={56}
          fontSize={30}
          label={v}
          title={`Use ${v}`}
          active={v === vowel}
          color={v === vowel ? C.yellow : C.card}
          onClick={() => {
            setVowelSound(v);
            saySound(v);
          }}
        />
      ))}

      {/* What did we make? */}
      <Panel x={200} y={526} w={600} h={124} />
      {real?.pic ? <Emoji x={268} y={588} char={real.pic} size={70} /> : <Emoji x={268} y={588} char={real ? '📖' : '🤔'} size={56} opacity={0.85} />}
      <text x={330} y={568} fontSize={40} fontWeight={700} fill={C.ink} style={{ fontFamily: 'var(--font-display)' }}>
        {word}
      </text>
      {wrapText(real ? real.meaning : 'Not a word we know — but you read it!', 28).map((line, i) => (
        <text key={i} x={330} y={602 + i * 22} fontSize={17} fill={C.ink2}>
          {line}
        </text>
      ))}
      <SvgButton
        x={600}
        y={548}
        w={180}
        h={56}
        fontSize={19}
        label="Blend it"
        color={C.teal}
        textColor={C.white}
        onClick={() => sayBlend([frame.start, vowel, frame.end], word)}
      />

      <Callout at={[XS[1], TILE_Y - 68]} box={[34, 150]} w={150} icon={ArrowUpDown} title="Slide the vowel" text="Drag the yellow tile up or down to change the middle sound." />
      <Callout at={[XS[0] - 60, TILE_Y]} box={[34, 300]} w={150} icon={Ear} title="Tap to hear" text="Each letter makes a sound. Tap a tile to hear it." />
      <Callout at={[780, 576]} box={[830, 450]} w={150} icon={Volume2} title="Blend" text="Say the sounds, then push them together." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {['c', 'a', 't'].map((l, i) => (
        <g key={l}>
          <rect x={14 + i * 32} y={22} width={28} height={34} rx={6} fill={i === 1 ? C.yellow : 'white'} stroke={C.ink} strokeWidth={2} />
          <text x={28 + i * 32} y={40} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.ink}>
            {l}
          </text>
        </g>
      ))}
      <path d="M60 12 l-5 6 h10 z M60 66 l-5 -6 h10 z" fill={C.ink} />
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

/** Picture words with two short-vowel look-alikes (same first and last letter). */
const PICTURE_WORDS: [string, string, string][] = [
  ['cat', 'cot', 'cut'],
  ['bag', 'big', 'bug'],
  ['bug', 'bag', 'big'],
  ['pot', 'pet', 'pit'],
  ['pan', 'pen', 'pin'],
  ['pen', 'pan', 'pin'],
  ['pin', 'pan', 'pen'],
  ['ten', 'tan', 'tin'],
  ['bed', 'bad', 'bid'],
  ['sun', 'sin', 'son'],
  ['fox', 'fix', 'fax'],
  ['pig', 'peg', 'pug'],
  ['dog', 'dig', 'dug'],
  ['net', 'nut', 'not'],
  ['nut', 'net', 'not'],
  ['hat', 'hit', 'hot'],
  ['map', 'mop', 'mep'],
];

/** Real words and made-up words that share a frame (for "which one is real?"). */
const REAL_OR_NOT: { real: string[]; madeUp: string[]; meaning: Record<string, string> }[] = [
  { real: ['map', 'mop'], madeUp: ['mep', 'mip', 'mup'], meaning: { map: 'a drawing that shows places', mop: 'a tool for washing floors' } },
  { real: ['fox', 'fix'], madeUp: ['fex', 'fux'], meaning: { fox: 'a wild animal with a bushy tail', fix: 'to mend something' } },
  { real: ['hug'], madeUp: ['heg', 'hig'], meaning: { hug: 'to hold someone in your arms' } },
];

/** Change the middle letter to make the picture. */
const CHANGE: [from: string, to: string][] = [
  ['pin', 'pan'],
  ['pan', 'pen'],
  ['bag', 'bug'],
  ['bug', 'bag'],
  ['net', 'nut'],
  ['dig', 'dog'],
  ['fix', 'fox'],
  ['hit', 'hat'],
  ['tin', 'ten'],
  ['bid', 'bed'],
];

const sounds = (w: string) => w.split('').map((l) => slash(l)).join(' ');

function makeQuestion(level: number): Question {
  if (level === 0) {
    const [word, a, b] = pick(PICTURE_WORDS);
    return {
      prompt: 'Read each word. Which one matches the picture?',
      visual: <EmojiPicture char={PIC[word]} label="A picture" />,
      choices: shuffle([word, a, b]).map((value) => ({ value })),
      answer: word,
      hint: 'Read each word sound by sound. Listen to the middle sound.',
      explain: [`The picture is a ${word}: ${sounds(word)}.`, `The middle sound is ${slash(word[1])}, spelled ${word[1]}.`, `So the word is ${word}.`],
    };
  }
  if (level === 1) {
    const [word] = pick(PICTURE_WORDS);
    const v = word[1];
    const others = shuffle(VOWELS.filter((x) => x !== v)).slice(0, 3);
    return {
      prompt: 'Which vowel finishes the word?',
      visual: <TileRow emoji={PIC[word]} tiles={[{ text: word[0] }, { text: v, gap: true }, { text: word[2] }]} label={`${word[0]}, gap, ${word[2]}`} />,
      choices: shuffle([v, ...others]).map((value) => ({ value })),
      answer: v,
      hint: 'Say the picture word slowly. What sound is in the middle?',
      explain: [`Say ${word} slowly: ${sounds(word)}.`, `The middle sound is ${slash(v)}.`, `${slash(v)} is spelled ${v}, so the word is ${word}.`],
    };
  }
  if (Math.random() < 0.5) {
    const set = pick(REAL_OR_NOT);
    const real = pick(set.real);
    const fakes = shuffle(set.madeUp).slice(0, 2);
    return {
      prompt: 'Read them all. Which one is a real word?',
      choices: shuffle([real, ...fakes]).map((value) => ({ value })),
      answer: real,
      hint: 'Sound out each one, then ask: have I heard that word before?',
      explain: [`Read each one: ${shuffle([real, ...fakes]).join(', ')}.`, `${real} is a real word: ${set.meaning[real]}.`, `The others are made-up words.`],
    };
  }
  const [from, to] = pick(CHANGE);
  const options = shuffle([to, ...VOWELS.filter((x) => x !== to[1]).map((x) => `${to[0]}${x}${to[2]}`).filter((w) => w !== to).slice(0, 2)]);
  return {
    prompt: `Change the middle letter of “${from}” to make the picture. Which word?`,
    visual: <EmojiPicture char={PIC[to]} label="A picture" />,
    choices: options.map((value) => ({ value })),
    answer: to,
    hint: 'Keep the first and last letters. Which middle sound makes the picture word?',
    explain: [`The picture is a ${to}: ${sounds(to)}.`, `Keep ${to[0]} and ${to[2]}, and change ${from[1]} to ${to[1]}.`, `${from} becomes ${to}.`],
  };
}

export const shortVowels: Lesson = {
  id: 'short-vowels',
  title: 'Short Vowels',
  Thumb,
  Scene: ShortVowelScene,
  sceneHint: 'Slide the middle vowel · Tap letters to hear them',
  learn: {
    heading: 'Short vowels',
    intro: 'A, e, i, o and u are vowels. In short words like cat, the vowel in the middle makes a short sound. Change the vowel and you make a new word!',
    points: [
      { icon: Ear, text: 'Short vowel sounds: /a/ apple, /e/ egg, /i/ insect, /o/ octopus, /u/ up.' },
      { icon: ArrowUpDown, text: 'Change only the middle letter: cat, cot, cut.' },
      { icon: Puzzle, text: 'Some words you make are real, some are made-up. Read them all!' },
    ],
  },
  steps: [
    'Look at the first letter and say its sound.',
    'Say the middle vowel sound.',
    'Say the last sound.',
    'Blend the sounds together to read the word.',
  ],
  example: {
    question: 'Read the word: b u g',
    visual: <TileRow tiles={[{ text: 'b' }, { text: 'u', color: C.yellow }, { text: 'g' }]} label="b u g" />,
    work: [`Say each sound: ${SOUND.b}, ${SOUND.u}, ${SOUND.g}.`, 'Push the sounds together: b-u-g.'],
    answer: 'The word is bug.',
  },
  grownups: [
    'Ask your child to say each sound, then blend — don’t give them the word first.',
    'Made-up words are good practice: they show your child is decoding, not guessing or remembering.',
    'Stretch the vowel when you model it (“caaat”) so the middle sound is easy to hear.',
    'Play “change one sound” at home: cat → cot → cut → hut.',
  ],
  makeQuestion,
};
