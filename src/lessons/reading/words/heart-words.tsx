import { useState } from 'react';
import { Ear, Heart as HeartIcon, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragTile, Heart, LetterTile, Panel, TileRow } from './visuals/Tiles';

interface Part {
  /** Letters in this sound box. */
  s: string;
  /** The sound it makes here, written for children (e.g. "u" → /u/). */
  label: string;
  /** How to say that sound aloud. */
  say: string;
  /** True if these letters don't make their usual sound here. */
  heart?: boolean;
}

interface HeartWord {
  word: string;
  parts: Part[];
}

const WORDS: HeartWord[] = [
  { word: 'the', parts: [{ s: 'th', label: 'th', say: 'thh' }, { s: 'e', label: 'u', say: 'uh', heart: true }] },
  { word: 'said', parts: [{ s: 's', label: 's', say: 'sss' }, { s: 'ai', label: 'e', say: 'eh', heart: true }, { s: 'd', label: 'd', say: 'duh' }] },
  { word: 'was', parts: [{ s: 'w', label: 'w', say: 'wuh' }, { s: 'a', label: 'u', say: 'uh', heart: true }, { s: 's', label: 'z', say: 'zzz' }] },
  { word: 'you', parts: [{ s: 'y', label: 'y', say: 'yuh' }, { s: 'ou', label: 'oo', say: 'oo', heart: true }] },
  { word: 'they', parts: [{ s: 'th', label: 'th', say: 'thh' }, { s: 'ey', label: 'ay', say: 'ay', heart: true }] },
  { word: 'to', parts: [{ s: 't', label: 't', say: 'tuh' }, { s: 'o', label: 'oo', say: 'oo', heart: true }] },
  { word: 'do', parts: [{ s: 'd', label: 'd', say: 'duh' }, { s: 'o', label: 'oo', say: 'oo', heart: true }] },
  { word: 'have', parts: [{ s: 'h', label: 'h', say: 'huh' }, { s: 'a', label: 'a', say: 'ah' }, { s: 've', label: 'v', say: 'vvv', heart: true }] },
  { word: 'of', parts: [{ s: 'o', label: 'u', say: 'uh', heart: true }, { s: 'f', label: 'v', say: 'vvv', heart: true }] },
  { word: 'come', parts: [{ s: 'c', label: 'k', say: 'kuh' }, { s: 'o', label: 'u', say: 'uh', heart: true }, { s: 'me', label: 'm', say: 'mmm', heart: true }] },
];

/** Why a non-tricky part is fine — said when the heart lands somewhere that follows the usual rules. */
function usualNote(p: Part): string {
  if (p.s === 's' && p.label === 'z') return 's often says /z/, like in is and has — that’s a usual sound, not the tricky part.';
  return `${p.s} says /${p.label}/, just like usual. Look for the part that sounds different.`;
}

const boxW = (s: string) => (s.length > 1 ? 160 : 118);
const BOX_Y = 250;

function HeartScene() {
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState<number[]>([]);
  const [selected, setSelected] = useState(false);
  const [shake, setShake] = useState(0);
  const [message, setMessage] = useState('Tap each box to hear its sound. Then drag the heart onto the tricky part.');
  const item = WORDS[index];
  const needed = item.parts.filter((p) => p.heart).length;
  const done = hearts.length === needed;

  const gap = 0;
  const total = item.parts.reduce((a, p) => a + boxW(p.s), 0) + gap * (item.parts.length - 1);
  const xs: number[] = [];
  {
    let x = 470 - total / 2;
    for (const p of item.parts) {
      xs.push(x + boxW(p.s) / 2);
      x += boxW(p.s) + gap;
    }
  }

  const placeOn = (i: number) => {
    const part = item.parts[i];
    setSelected(false);
    if (hearts.includes(i)) return;
    if (part.heart) {
      const next = [...hearts, i];
      setHearts(next);
      play('correct');
      setMessage(
        next.length === needed
          ? `Yes! Learn “${item.word}” by heart. Read it: ${item.word}.`
          : `${part.s} says /${part.label}/ here — tricky! There’s one more tricky part.`,
      );
    } else {
      setShake(shake + 1);
      play('wrong');
      setMessage(usualNote(part));
    }
  };
  const drop = (p: Pt) => {
    const i = xs.findIndex((x, k) => Math.abs(p.x - x) < boxW(item.parts[k].s) / 2 && Math.abs(p.y - BOX_Y) < 90);
    if (i >= 0) placeOn(i);
    else setShake(shake + 1);
  };
  const tapBox = (i: number) => {
    if (selected) placeOn(i);
    else speak(item.parts[i].say, { force: true });
  };
  const choose = (i: number) => {
    setIndex(i);
    setHearts([]);
    setSelected(false);
    setMessage('Tap each box to hear its sound. Then drag the heart onto the tricky part.');
  };

  return (
    <SceneSvg label={`Sound boxes for the word ${item.word}`}>
      {WORDS.map((w, i) => (
        <SvgButton key={w.word} x={70 + i * 88} y={30} w={78} h={46} fontSize={20} label={w.word} active={i === index} color={i === index ? C.yellow : C.card} onClick={() => choose(i)} />
      ))}

      <Panel x={110} y={112} w={720} h={262} color={shade(C.pink, 0.88)} />
      <text x={470} y={136} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        One box for each sound
      </text>
      {item.parts.map((p, i) => (
        <g key={i}>
          <LetterTile x={xs[i]} y={BOX_Y} w={boxW(p.s)} h={120} fontSize={70} text={p.s} color={hearts.includes(i) ? shade(C.pink, 0.7) : C.card} onTap={() => tapBox(i)} label={`Hear ${p.s}`} />
          <text x={xs[i]} y={BOX_Y + 92} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink2}>
            /{p.label}/
          </text>
          {hearts.includes(i) && (
            <g className="pop-in" style={{ transformOrigin: `${xs[i]}px ${BOX_Y - 86}px` }}>
              <Heart x={xs[i]} y={BOX_Y - 86} size={44} />
            </g>
          )}
        </g>
      ))}

      {/* Heart sticker */}
      {!done && (
        <>
          <text x={900} y={BOX_Y - 72} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
            Heart
          </text>
          <DragTile x={900} y={BOX_Y} label="Heart sticker. Tap, then tap the tricky part." shakeKey={shake} onDrop={drop} onTap={() => setSelected(!selected)}>
            <circle r={46} fill={selected ? C.yellow : 'white'} stroke={C.ink} strokeWidth={2.5} />
            <Heart x={0} y={2} size={52} />
          </DragTile>
        </>
      )}

      <text x={470} y={422} textAnchor="middle" fontSize={20} fontWeight={600} fill={done ? '#a3245e' : C.ink2}>
        {selected ? 'Now tap the tricky part.' : message}
      </text>

      <Panel x={110} y={460} w={720} h={180} />
      <text x={140} y={506} fontSize={20} fontWeight={700} fill={C.ink}>
        Heart words
      </text>
      <text x={140} y={540} fontSize={17} fill={C.ink2}>
        Most of the word sounds out the usual way.
      </text>
      <text x={140} y={566} fontSize={17} fill={C.ink2}>
        Only one part is tricky — learn that part by heart.
      </text>
      <SvgButton x={600} y={490} w={190} h={56} fontSize={19} label="Read it" color={C.teal} textColor={C.white} onClick={() => speak(item.word, { force: true })} />
      <SvgButton
        x={600}
        y={566}
        w={190}
        h={56}
        fontSize={19}
        label="Next word"
        color={done ? C.yellow : C.card}
        onClick={() => choose((index + 1) % WORDS.length)}
      />

      <Callout at={[xs[0] - boxW(item.parts[0].s) / 2, BOX_Y]} box={[16, 130]} w={150} icon={Ear} title="Tap a box" text="Hear the sound each box makes in this word." />
      <Callout at={[900, BOX_Y + 46]} box={[830, 330]} w={150} icon={HeartIcon} title="Tricky part" text="Drop the heart where the letters don’t make their usual sound." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={22} y={30} width={34} height={36} rx={4} fill="white" stroke={C.ink} strokeWidth={2} />
      <rect x={56} y={30} width={34} height={36} rx={4} fill={shade(C.pink, 0.7)} stroke={C.ink} strokeWidth={2} />
      <text x={39} y={49} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
        th
      </text>
      <text x={73} y={49} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
        e
      </text>
      <Heart x={73} y={18} size={20} />
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const SENTENCES: { text: string; word: string; wrong: [string, string] }[] = [
  { text: 'I ___ a dog.', word: 'have', wrong: ['hav', 'haf'] },
  { text: 'Mom ___ hi to me.', word: 'said', wrong: ['sed', 'sayd'] },
  { text: 'The cat ___ sad.', word: 'was', wrong: ['wuz', 'woz'] },
  { text: 'Do ___ like jam?', word: 'you', wrong: ['yoo', 'yu'] },
  { text: 'The kids sat. ___ had fun.', word: 'They', wrong: ['Thay', 'Tha'] },
  { text: 'I had a cup ___ milk.', word: 'of', wrong: ['uv', 'ov'] },
  { text: '___ dog ran fast.', word: 'The', wrong: ['Thu', 'Tha'] },
  { text: 'Can you ___ to my house?', word: 'come', wrong: ['kum', 'com'] },
  { text: 'I go ___ bed at six.', word: 'to', wrong: ['tu', 'tuu'] },
  { text: 'What ___ you see?', word: 'do', wrong: ['du', 'doo'] },
];

const findWord = (w: string) => WORDS.find((x) => x.word === w.toLowerCase())!;
const trickyText = (h: HeartWord) =>
  h.parts
    .filter((p) => p.heart)
    .map((p) => `${p.s} says /${p.label}/`)
    .join(' and ');

function makeQuestion(level: number): Question {
  if (level === 0) {
    const item = pick(WORDS.filter((w) => w.parts.filter((p) => p.heart).length === 1));
    const tricky = item.parts.find((p) => p.heart)!;
    return {
      prompt: `Which part of “${item.word}” is the tricky part?`,
      visual: <TileRow boxes tiles={item.parts.map((p) => ({ text: p.s }))} label={item.word} />,
      choices: shuffle(item.parts.map((p) => p.s)).map((value) => ({ value })),
      answer: tricky.s,
      hint: 'Say each part. Which letters don’t make the sound you’d expect?',
      explain: [
        `Read each box in ${item.word}: ${item.parts.map((p) => `${p.s} says /${p.label}/`).join(', ')}.`,
        `${tricky.s} doesn’t make its usual sound here — that’s the tricky part.`,
        `Learn ${tricky.s} in “${item.word}” by heart.`,
      ],
    };
  }
  if (level === 1) {
    const s = pick(SENTENCES);
    const h = findWord(s.word);
    return {
      prompt: `Which word finishes the sentence? “${s.text}”`,
      speak: `Which word finishes the sentence? ${s.text.replace('___', 'blank')}`,
      choices: shuffle([s.word, ...s.wrong]).map((value) => ({ value })),
      answer: s.word,
      hint: 'Heart words have a tricky part. Picture how the word looks in your books.',
      explain: [
        `The sentence needs the word ${s.word}: “${s.text.replace('___', s.word)}”`,
        `${s.word} is a heart word: ${trickyText(h)}.`,
        `So it’s spelled ${s.word}, not ${s.wrong[0]}.`,
      ],
    };
  }
  const item = pick(WORDS);
  const n = item.parts.length;
  return {
    prompt: `How many sounds are in “${item.word}”?`,
    visual: <TileRow tiles={item.word.split('').map((l) => ({ text: l }))} label={item.word} />,
    choices: shuffle([n - 1, n, n + 1]).map((v) => ({ value: String(v) })),
    answer: String(n),
    hint: 'Say the word slowly and tap a finger for each sound you hear.',
    explain: [
      `Say ${item.word} slowly: ${item.parts.map((p) => `/${p.label}/`).join(' ')}.`,
      `${item.word.length} letters, but ${n} sounds.`,
      `So “${item.word}” has ${n} sounds.`,
    ],
  };
}

export const heartWords: Lesson = {
  id: 'heart-words',
  title: 'Heart Words',
  Thumb,
  Scene: HeartScene,
  sceneHint: 'Tap boxes to hear sounds · Drag the heart onto the tricky part',
  learn: {
    heading: 'Heart words',
    intro: 'Some words we read all the time have a tricky part that doesn’t follow the usual rules. We sound out the rest, and learn the tricky part by heart.',
    points: [
      { icon: Ear, text: 'Most of a heart word still sounds out: in said, s and d are normal.' },
      { icon: HeartIcon, text: 'Find the tricky part: in said, ai says /e/.' },
      { icon: Search, text: 'Look at it, say it, spell it — then you’ll know it by heart.' },
    ],
  },
  steps: [
    'Say the word and count its sounds.',
    'Match each sound to its letters.',
    'Find the part that doesn’t make its usual sound — put a heart on it.',
    'Read the word again and spell it out loud.',
  ],
  example: {
    question: 'Map the word “said”',
    visual: <TileRow boxes tiles={[{ text: 's' }, { text: 'ai', heart: true, color: shade(C.pink, 0.7) }, { text: 'd' }]} label="s ai d" />,
    work: ['Sounds: /s/ /e/ /d/ — three sounds.', 's says /s/ and d says /d/, as usual.', 'ai says /e/ — that’s the tricky part, so it gets a heart.'],
    answer: 'Learn the ai in said by heart.',
  },
  grownups: [
    'These are often called “sight words”, but research shows children remember them best by linking sounds to letters, not by memorising shapes.',
    'Only a small part of most heart words is irregular. Point out the regular parts so your child keeps using phonics.',
    'Write the word together, saying each sound as you write it, and draw a heart over the tricky letters.',
    'A few minutes a day beats a long session: revisit yesterday’s heart words before adding new ones.',
  ],
  makeQuestion,
};
