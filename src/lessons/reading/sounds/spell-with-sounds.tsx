import { useState } from 'react';
import { Ear, Grid3x3, Hand, PenLine } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { FOUR_SOUNDS, pic, pick, sayParts, shuffle, soundOf } from './data';
import type { SoundWord } from './data';
import { mcq, level3 } from './q';
import { DragCard, Emoji, LetterTile, Note, PicCard, PicVisual, Tap } from './visuals/Pictures';

const split = (s: string): SoundWord => {
  const parts = s.split(' ');
  return { word: parts.join(''), parts };
};

/** Short-vowel words with three sounds, one letter each. */
const CVC = ['s u n', 'm a p', 'n u t', 'c a t', 'd o g', 'h a t', 'p e n', 'p i g', 'b u s', 'b e d', 'v a n', 'n e t', 'b u g', 't e n', 'b a g', 'r a t', 'p a n', 'p i n', 'c a p', 'l o g'].map(split);
/** Words with a two-letter sound (sh, ck, ll) or four sounds. */
const MORE = [...['f i sh', 'sh i p', 'd u ck', 's o ck', 'b e ll'].map(split), ...FOUR_SOUNDS];

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTS = 'bdfgmnpst'.split('');

/** Two extra tiles: a vowel and a consonant the word doesn't use (or s + h when the word has sh). */
function extraTiles(w: SoundWord): string[] {
  if (w.parts.includes('sh')) return ['s', 'h'];
  const letters = w.word.split('');
  return [pick(VOWELS.filter((v) => !letters.includes(v))), pick(CONSONANTS.filter((c) => !letters.includes(c)))];
}

const POSITION = (i: number, n: number) => (i === 0 ? 'first' : i === n - 1 ? 'last' : n === 3 ? 'middle' : i === 1 ? 'second' : 'third');

const BOX = 120;
const BOX_Y = 100;
const TRAY_Y = 430;
const boxX = (i: number, n: number) => 640 + (i - (n - 1) / 2) * (BOX + 18);
const tileX = (i: number, m: number) => 640 + (i - (m - 1) / 2) * 100;

interface Tile {
  id: number;
  text: string;
}

function dealTiles(w: SoundWord): Tile[] {
  return shuffle([...w.parts, ...extraTiles(w)]).map((text, id) => ({ id, text }));
}

function SpellScene() {
  const [more, setMore] = useState(false);
  const [word, setWord] = useState<SoundWord>(() => pick(CVC));
  const [tiles, setTiles] = useState<Tile[]>(() => dealTiles(word));
  const [placed, setPlaced] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState({ id: -1, key: 0 });
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const n = word.parts.length;
  const done = placed.length >= n;
  const need = done ? '' : word.parts[placed.length];

  const load = (w: SoundWord) => {
    setWord(w);
    setTiles(dealTiles(w));
    setPlaced([]);
    setMisses(0);
    setMsg(null);
  };
  const nextWord = (useMore = more) => {
    const pool = useMore ? MORE : CVC;
    load(pick(pool.filter((w) => w.word !== word.word)));
    play('pop');
  };
  const setLevel = (m: boolean) => {
    setMore(m);
    nextWord(m);
  };

  const attempt = (tile: Tile) => {
    if (done || placed.includes(tile.id)) return;
    // The child chose this tile: say its sound so they can check it against the word.
    speak(soundOf(tile.text), { force: true });
    if (tile.text === need) {
      const next = [...placed, tile.id];
      setPlaced(next);
      setMisses(0);
      if (next.length >= n) {
        play('correct');
        setMsg({ text: `You spelled ${word.word}! ${sayParts(word.parts)}. Tap “Read it” to hear the whole word.`, tone: 'good' });
      } else {
        play('pop');
        setMsg({ text: `Yes, “${soundOf(tile.text)}” is the ${POSITION(placed.length, n)} sound. What comes next?`, tone: 'plain' });
      }
      return;
    }
    play('wrong');
    setShake((s) => ({ id: tile.id, key: s.key + 1 }));
    const pos = POSITION(placed.length, n);
    const tries = misses + 1;
    setMisses(tries);
    if (need === 'sh' && (tile.text === 's' || tile.text === 'h')) {
      setMsg({ text: `${tile.text} says “${soundOf(tile.text)}”. In ${word.word} you hear “shh”: one sound made by two letters together.`, tone: 'try' });
    } else if (tries >= 2) {
      setMsg({ text: `Listen: the ${pos} sound in ${word.word} is “${soundOf(need)}”. Find the tile that says it.`, tone: 'try' });
    } else {
      setMsg({ text: `${tile.text} says “${soundOf(tile.text)}”. Not yet! Say ${word.word} slowly. What is the ${pos} sound?`, tone: 'try' });
    }
  };

  const nearBoxes = (x: number, y: number) => y > BOX_Y - 60 && y < BOX_Y + BOX + 80 && x > boxX(0, n) - BOX && x < boxX(n - 1, n) + BOX;

  return (
    <SceneSvg label={`Spell the word ${word.word}`}>
      <SvgButton x={40} y={24} w={170} h={52} fontSize={19} label="3 sounds" onClick={() => setLevel(false)} active={!more} color={!more ? C.yellow : C.card} />
      <SvgButton x={224} y={24} w={170} h={52} fontSize={19} label="More sounds" onClick={() => setLevel(true)} active={more} color={more ? C.yellow : C.card} />

      <Tap label={`${word.word}. Tap to hear the word.`} onTap={() => speak(word.word, { force: true })}>
        <g transform="translate(200 270)">
          <PicCard emoji={pic(word.word)} w={240} h={240} size={128} />
        </g>
        <text x={200} y={418} textAnchor="middle" fontSize={17} fill={C.muted}>
          Tap to hear the word
        </text>
      </Tap>

      {/* Sound boxes: one box for each sound */}
      {word.parts.map((part, i) => {
        const x = boxX(i, n);
        const tile = tiles.find((t) => t.id === placed[i]);
        return (
          <g key={i}>
            <rect x={x - BOX / 2} y={BOX_Y} width={BOX} height={BOX} rx={14} fill={tile ? shade(C.yellow, 0.75) : i === placed.length ? C.white : shade(C.line, 0.6)} stroke={C.ink} strokeWidth={i === placed.length ? 4 : 2.5} />
            {tile && (
              <Tap label={`${part} says ${soundOf(part)}`} onTap={() => speak(soundOf(part), { force: true })}>
                <text x={x} y={BOX_Y + BOX / 2 + 2} textAnchor="middle" dominantBaseline="central" fontSize={64} fontWeight={700} fill={C.ink} className="pop-in" style={{ transformOrigin: `${x}px ${BOX_Y + BOX / 2}px` }}>
                  {part}
                </text>
              </Tap>
            )}
          </g>
        );
      })}
      {done && <SvgButton x={560} y={BOX_Y + BOX + 30} w={160} h={52} fontSize={19} label="Read it" onClick={() => speak(word.word, { force: true })} color={C.yellow} />}

      {/* Letter tiles */}
      <rect x={340} y={TRAY_Y - 62} width={600} height={124} rx={24} fill={shade(C.wood, 0.3)} stroke={C.ink} strokeWidth={2} />
      {tiles.map((tile, i) =>
        placed.includes(tile.id) ? null : (
          <DragCard
            key={`${word.word}-${tile.id}`}
            x={tileX(i, tiles.length)}
            y={TRAY_Y}
            label={`Letter tile ${tile.text}. Tap or drag it into the next box.`}
            onTap={() => attempt(tile)}
            onDrop={(p) => nearBoxes(p.x, p.y) && attempt(tile)}
            shakeKey={shake.id === tile.id ? shake.key : 0}
            disabled={done}
          >
            <LetterTile text={tile.text} w={88} h={88} fontSize={tile.text.length > 1 ? 44 : 54} lit={misses >= 2 && tile.text === need} />
          </DragCard>
        ),
      )}

      <SvgButton x={600} y={508} w={160} h={52} fontSize={18} label="Start again" onClick={() => load(word)} disabled={placed.length === 0} />
      <SvgButton x={780} y={508} w={160} h={52} fontSize={18} label="Next word" onClick={() => nextWord()} color={done ? C.yellow : C.card} />

      <Note x={60} y={590} w={880} h={64} tone={msg?.tone ?? 'plain'} text={msg?.text ?? `Say ${word.word} slowly. Find the letter for each sound, in order.`} />

      <Callout at={[boxX(0, n) - BOX / 2, BOX_Y + 30]} box={[420, 280]} w={200} icon={Grid3x3} title="One box, one sound" text="Some sounds use two letters, like sh in fish." />
      <Callout at={[tileX(0, tiles.length), TRAY_Y]} box={[40, 470]} w={220} icon={Hand} title="Tap or drag" text="Each tile says its sound. Put it in the next box." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Emoji emoji="🐱" x={20} y={40} size={28} />
      {['c', 'a', 't'].map((l, i) => (
        <g key={l}>
          <rect x={42 + i * 25} y={14} width={22} height={22} rx={4} fill={i < 2 ? shade(C.yellow, 0.7) : C.white} stroke={C.ink} strokeWidth={1.5} />
          {i < 2 && (
            <text x={53 + i * 25} y={30} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {l}
            </text>
          )}
        </g>
      ))}
      <rect x={70} y={48} width={22} height={22} rx={4} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <text x={81} y={64} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
        t
      </text>
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

/** Wrong spellings: one with the first sound changed, one with the last sound changed. */
const NEAR_MISSES: Record<string, [string, string]> = {
  sun: ['bun', 'sut'],
  map: ['tap', 'mat'],
  nut: ['but', 'nup'],
  cat: ['mat', 'cap'],
  dog: ['log', 'dot'],
  hat: ['pat', 'ham'],
  pen: ['ten', 'pet'],
  pig: ['big', 'pin'],
  bus: ['dus', 'bun'],
  bed: ['red', 'beg'],
  van: ['fan', 'vat'],
  net: ['pet', 'nep'],
  bug: ['mug', 'bun'],
  ten: ['hen', 'tep'],
  bag: ['rag', 'bat'],
  rat: ['hat', 'ram'],
  pan: ['fan', 'pat'],
  pin: ['tin', 'pig'],
  cap: ['tap', 'can'],
  log: ['dog', 'lot'],
};

/** Harder words, with a missing or swapped sound, or the wrong letters for a sound. */
const TRICKY_MISSES: Record<string, [string, string]> = {
  fish: ['fis', 'fich'],
  ship: ['sip', 'chip'],
  duck: ['dug', 'dack'],
  sock: ['sack', 'sog'],
  bell: ['bel', 'ball'],
  frog: ['fog', 'forg'],
  drum: ['dum', 'durm'],
  milk: ['mik', 'mlik'],
  crab: ['cab', 'carb'],
  flag: ['flug', 'falg'],
  hand: ['had', 'hnad'],
  tent: ['ten', 'tnet'],
  gift: ['gif', 'gfit'],
};

function spellQuestion(w: SoundWord, wrong: string[], tricky: boolean): Question {
  const two = w.parts.find((p) => p.length > 1);
  return mcq({
    prompt: 'Which word matches the picture?',
    speak: `Which spelling says ${w.word}?`,
    visual: <PicVisual emoji={pic(w.word)} />,
    answer: w.word,
    wrong,
    hint: tricky ? 'Say the word slowly. Count the sounds, then check each sound has its letters, in order.' : 'Say the word slowly. Check the first sound, then the middle, then the last.',
    explain: [
      `Say it slowly: ${sayParts(w.parts)}.`,
      two ? `${two} is one sound made with two letters.` : `That's ${w.parts.length} sounds: ${w.parts.join(', ')}.`,
      `So it's spelled ${w.word}.`,
    ],
  });
}

/** The picture beside its letters, with the middle one missing. */
function MissingVisual({ word }: { word: SoundWord }) {
  const tiles = [word.parts[0], '?', word.parts[2]];
  return (
    <svg viewBox="0 0 330 110" role="img" aria-label={`${word.word}: ${tiles.join(' ')}`}>
      <Emoji emoji={pic(word.word)} x={50} y={55} size={76} />
      {tiles.map((t, i) => (
        <g key={i} transform={`translate(${110 + i * 74} 20)`}>
          <rect width={66} height={70} rx={12} fill={t === '?' ? C.white : C.card} stroke={C.ink} strokeWidth={2.5} strokeDasharray={t === '?' ? '6 5' : undefined} />
          <text x={33} y={37} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={700} fill={t === '?' ? C.muted : C.ink}>
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

function middleQuestion(): Question {
  const w = pick(CVC);
  const vowel = w.parts[1];
  return mcq({
    prompt: `Which letter is missing? ${w.parts[0]} _ ${w.parts[2]}`,
    speak: `${w.word}. Which letter is missing in the middle?`,
    visual: <MissingVisual word={w} />,
    answer: vowel,
    wrong: shuffle(VOWELS.filter((v) => v !== vowel)).slice(0, 2),
    hint: `Say ${w.word} slowly and listen for the sound in the middle.`,
    explain: [`Say it slowly: ${sayParts(w.parts)}.`, `The middle sound is “${soundOf(vowel)}”.`, `“${soundOf(vowel)}” is written ${vowel}, so it's ${w.word}.`],
  });
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv === 0) {
    const w = pick(CVC);
    return spellQuestion(w, NEAR_MISSES[w.word], false);
  }
  if (lv === 1) return middleQuestion();
  const w = pick(MORE);
  return spellQuestion(w, TRICKY_MISSES[w.word], true);
}

export const spellWithSounds: Lesson = {
  id: 'spell-with-sounds',
  title: 'Spell It',
  Thumb,
  Scene: SpellScene,
  sceneHint: 'Say the word slowly · Find the letter for each sound · Fill the boxes in order',
  learn: {
    heading: 'Spell a word, sound by sound',
    intro: 'To spell a word, say it slowly and catch each sound. Then write the letter for each sound, in order.',
    points: [
      { icon: Ear, text: 'Say the word slowly: s – u – n.' },
      { icon: Grid3x3, text: 'One box for each sound.' },
      { icon: PenLine, text: 'Write the letter for each sound, first to last.' },
    ],
  },
  steps: ['Say the word.', 'Say it slowly and count the sounds.', 'Write the letter for the first sound, then the next.', 'Read it back to check.'],
  example: {
    question: 'Spell the word for the picture.',
    visual: <PicVisual emoji={pic('sun')} />,
    work: ['Say it slowly: sss – uh – nnn.', '3 sounds, so 3 boxes.', 'sss is s, uh is u, nnn is n.'],
    answer: 'sun',
  },
  grownups: [
    'Spelling is reading in reverse: your child breaks a word into sounds and writes a letter for each one.',
    'Use words with sounds your child knows. Spelling “sun” is a great start; “sunshine” can wait.',
    'If your child writes “sn” for sun, say “You caught the first and last sounds! Say it again: what’s in the middle?”',
    'Check by reading back exactly what was written, sound by sound.',
  ],
  makeQuestion,
};
