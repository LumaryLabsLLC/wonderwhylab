import { useState } from 'react';
import { Ear, Grid3x3, Link2, SpellCheck } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { mcq, level3 } from '../sounds/q';
import { Note } from '../sounds/visuals/Pictures';
import { PIC, SOUND, saySound, slash } from './phonics';
import { DragTile, Emoji, EmojiPicture, HearButton, TileFace, TileRow } from './visuals/Tiles';

interface SpellWord {
  word: string;
  /** One spelling per sound. */
  parts: string[];
}

const split = (s: string): SpellWord => ({ word: s.replace(/ /g, ''), parts: s.split(' ') });

/** Four sounds with a blend at the start or end. */
const BLENDS = ['f r o g', 'c r a b', 'f l a g', 'd r u m', 'p l u g', 's t o p', 's l e d', 's w i m'].map(split);
/** Two letters, one sound: sh, ch, th, ck, ll. */
const DIGRAPHS = ['sh i p', 'sh e ll', 'f i sh', 'd i sh', 'ch i ck', 'b a th', 'd u ck', 's o ck', 'l o ck', 't r u ck', 'c l o ck'].map(split);

/** The sound a spelling makes, written for children: ck → /k/. */
const SOUND_NAME: Record<string, string> = { ck: 'k', c: 'k', ll: 'l' };
const soundName = (g: string) => slash(SOUND_NAME[g] ?? g);
const sayParts = (parts: string[]) => parts.map(soundName).join(' ');

/** Single letters that are easy to put in place of a two-letter sound. */
const LOOKALIKE: Record<string, string[]> = { sh: ['s', 'h'], ch: ['c', 'h'], th: ['t', 'h'], ck: ['c', 'k'], ll: ['l'] };
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTS = 'bdgmnpt'.split('');

function extraTiles(w: SpellWord): string[] {
  const digraph = w.parts.find((p) => p.length > 1);
  const extra = digraph ? [...LOOKALIKE[digraph]] : [];
  extra.push(pick(VOWELS.filter((v) => !w.word.includes(v))));
  if (extra.length < 3) extra.push(pick(CONSONANTS.filter((c) => !w.word.includes(c))));
  return extra.filter((t) => !w.parts.includes(t));
}

const position = (i: number, n: number) => (i === 0 ? 'first' : i === n - 1 ? 'last' : i === 1 ? 'second' : 'third');

const BOX = 116;
const BOX_Y = 110;
const TRAY_Y = 420;
const boxX = (i: number, n: number) => 640 + (i - (n - 1) / 2) * (BOX + 16);
const tileX = (i: number, m: number) => 650 + (i - (m - 1) / 2) * 90;

interface Chip {
  id: number;
  text: string;
}

const deal = (w: SpellWord): Chip[] => shuffle([...w.parts, ...extraTiles(w)]).map((text, id) => ({ id, text }));

function SpellScene() {
  const [kind, setKind] = useState<'blends' | 'digraphs'>('blends');
  const [word, setWord] = useState<SpellWord>(() => pick(BLENDS));
  const [chips, setChips] = useState<Chip[]>(() => deal(word));
  const [placed, setPlaced] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState({ id: -1, key: 0 });
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const n = word.parts.length;
  const done = placed.length >= n;
  const need = done ? '' : word.parts[placed.length];

  const load = (w: SpellWord) => {
    setWord(w);
    setChips(deal(w));
    setPlaced([]);
    setMisses(0);
    setMsg(null);
  };
  const next = (k = kind) => {
    load(pick((k === 'blends' ? BLENDS : DIGRAPHS).filter((w) => w.word !== word.word)));
    play('pop');
  };
  const switchKind = (k: 'blends' | 'digraphs') => {
    setKind(k);
    next(k);
  };

  const attempt = (chip: Chip) => {
    if (done || placed.includes(chip.id)) return;
    saySound(chip.text);
    if (chip.text === need) {
      const nextPlaced = [...placed, chip.id];
      setPlaced(nextPlaced);
      setMisses(0);
      if (nextPlaced.length === n) {
        play('correct');
        const two = word.parts.filter((p) => p.length > 1);
        setMsg({ text: `${sayParts(word.parts)}: ${word.word}! ${two.length ? `${two.join(' and ')} ${two.length > 1 ? 'are' : 'is'} two letters for one sound.` : `${n} sounds, ${n} boxes.`}`, tone: 'good' });
      } else play('pop');
      return;
    }
    play('wrong');
    setShake((s) => ({ id: chip.id, key: s.key + 1 }));
    const tries = misses + 1;
    setMisses(tries);
    const pos = position(placed.length, n);
    if (need.length > 1 && LOOKALIKE[need].includes(chip.text)) {
      setMsg({
        text:
          need === 'ck'
            ? `${chip.text} can say /k/, but after a short vowel at the end of a word, /k/ is usually spelled ck.`
            : `${chip.text} says ${soundName(chip.text)}. The ${pos} sound is ${soundName(need)}: one sound, two letters together.`,
        tone: 'try',
      });
    } else if (tries >= 2) {
      setMsg({ text: `The ${pos} sound in ${word.word} is ${soundName(need)}. Find the tile that spells it.`, tone: 'try' });
    } else {
      setMsg({ text: `${chip.text} says ${soundName(chip.text)}. Not yet! Say ${word.word} slowly. What is the ${pos} sound?`, tone: 'try' });
    }
  };

  const nearBoxes = (x: number, y: number) => y > BOX_Y - 70 && y < BOX_Y + BOX + 80 && x > boxX(0, n) - BOX && x < boxX(n - 1, n) + BOX;

  return (
    <SceneSvg label={`Spell ${word.word} by its sounds`}>
      <SvgButton x={40} y={22} w={180} h={52} fontSize={19} label="Blends" onClick={() => switchKind('blends')} active={kind === 'blends'} color={kind === 'blends' ? C.yellow : C.card} />
      <SvgButton x={234} y={22} w={230} h={52} fontSize={19} label="sh, ch, th, ck" title="Two letters, one sound" onClick={() => switchKind('digraphs')} active={kind === 'digraphs'} color={kind === 'digraphs' ? C.yellow : C.card} />

      {/* The word to spell */}
      <rect x={60} y={110} width={220} height={230} rx={20} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <Emoji x={170} y={210} char={PIC[word.word]} size={120} />
      <HearButton x={170} y={380} r={30} onTap={() => speak(word.word, { force: true })} label={`Hear the word ${word.word}`} />

      {/* Sound boxes */}
      {word.parts.map((part, i) => {
        const x = boxX(i, n);
        const chip = chips.find((c) => c.id === placed[i]);
        return (
          <g key={i}>
            <rect x={x - BOX / 2} y={BOX_Y} width={BOX} height={BOX} rx={14} fill={chip ? shade(C.yellow, 0.75) : i === placed.length ? C.white : shade(C.line, 0.6)} stroke={C.ink} strokeWidth={i === placed.length ? 4 : 2.5} />
            {chip && (
              <text x={x} y={BOX_Y + BOX / 2 + 2} textAnchor="middle" dominantBaseline="central" fontSize={part.length > 1 ? 52 : 60} fontWeight={700} fill={C.ink} className="pop-in" style={{ transformOrigin: `${x}px ${BOX_Y + BOX / 2}px` }}>
                {part}
              </text>
            )}
            {chip && (
              <text x={x} y={BOX_Y + BOX + 28} textAnchor="middle" fontSize={17} fill={C.ink2}>
                {soundName(part)}
              </text>
            )}
          </g>
        );
      })}
      {done && <SvgButton x={560} y={290} w={160} h={50} fontSize={18} label="Read it" onClick={() => speak(word.word, { force: true })} color={C.yellow} />}

      {/* Tiles */}
      <rect x={322} y={TRAY_Y - 60} width={656} height={120} rx={24} fill={shade(C.wood, 0.3)} stroke={C.ink} strokeWidth={2} />
      {chips.map((chip, i) =>
        placed.includes(chip.id) ? null : (
          <DragTile
            key={`${word.word}-${chip.id}`}
            x={tileX(i, chips.length)}
            y={TRAY_Y}
            label={`Tile ${chip.text}. Tap or drag it into the next box.`}
            shakeKey={shake.id === chip.id ? shake.key : 0}
            disabled={done}
            onTap={() => attempt(chip)}
            onDrop={(p) => nearBoxes(p.x, p.y) && attempt(chip)}
          >
            <TileFace text={chip.text} w={chip.text.length > 1 ? 84 : 74} h={84} fontSize={chip.text.length > 1 ? 38 : 44} color={misses >= 2 && chip.text === need ? shade(C.yellow, 0.35) : C.card} />
          </DragTile>
        ),
      )}

      <SvgButton x={620} y={500} w={160} h={52} fontSize={18} label="Start again" onClick={() => load(word)} disabled={placed.length === 0} />
      <SvgButton x={800} y={500} w={160} h={52} fontSize={18} label="Next word" onClick={() => next()} color={done ? C.yellow : C.card} />

      <Note x={60} y={584} w={880} h={70} tone={msg?.tone ?? 'plain'} text={msg?.text ?? `Say ${word.word} slowly. Put the spelling for each sound in a box, in order.`} />

      <Callout at={[boxX(0, n) - BOX / 2, BOX_Y + 30]} box={[300, 260]} w={220} icon={Grid3x3} title="One box, one sound" text="A box can hold two letters when they make one sound, like sh or ck." />
      <Callout at={[tileX(0, chips.length), TRAY_Y]} box={[20, 470]} w={230} icon={Link2} title="Tap to hear" text="Each tile says its sound when you use it." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Emoji x={20} y={38} char="🐟" size={26} />
      {['f', 'i', 'sh'].map((t, i) => (
        <g key={t}>
          <rect x={38 + i * 27} y={22} width={25} height={30} rx={4} fill={shade(C.yellow, 0.7)} stroke={C.ink} strokeWidth={1.5} />
          <text x={50.5 + i * 27} y={43} textAnchor="middle" fontSize={t.length > 1 ? 13 : 17} fontWeight={700} fill={C.ink}>
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

/** Common misspellings: a dropped sound, sounds in the wrong order, or the wrong letters for a sound. */
const MISSES: Record<string, [string, string]> = {
  frog: ['fog', 'forg'],
  crab: ['cab', 'carb'],
  flag: ['flg', 'falg'],
  drum: ['dum', 'durm'],
  plug: ['pug', 'pulg'],
  stop: ['sop', 'sotp'],
  sled: ['sed', 'seld'],
  swim: ['sim', 'siwm'],
  ship: ['sip', 'chip'],
  shell: ['shel', 'chell'],
  fish: ['fis', 'fich'],
  dish: ['dis', 'dich'],
  chick: ['chik', 'shick'],
  bath: ['baf', 'bat'],
  duck: ['duk', 'duc'],
  sock: ['sok', 'soc'],
  lock: ['lok', 'loc'],
  truck: ['truk', 'turck'],
  clock: ['clok', 'colck'],
};

function spellingQuestion(w: SpellWord): Question {
  const two = w.parts.find((p) => p.length > 1);
  return mcq({
    prompt: 'Which spelling is right?',
    speak: `Which spelling says ${w.word}?`,
    visual: <EmojiPicture char={PIC[w.word]} label={w.word} />,
    answer: w.word,
    wrong: MISSES[w.word],
    hint: two ? 'Say the word slowly. Which sound needs two letters?' : 'Say the word slowly and count the sounds. Is every sound there, in order?',
    explain: [
      `Say it slowly: ${sayParts(w.parts)}.`,
      two ? `${soundName(two)} is one sound spelled with two letters: ${two}.` : `That's ${w.parts.length} sounds, so ${w.parts.length} spellings, in order.`,
      `So it's spelled ${w.word}.`,
    ],
  });
}

function digraphQuestion(): Question {
  const w = pick(DIGRAPHS.filter((d) => d.parts.some((p) => p.length > 1 && p !== 'll')));
  const i = w.parts.findIndex((p) => p.length > 1 && p !== 'll');
  const target = w.parts[i];
  const others: Record<string, string[]> = { sh: ['ch', 's'], ch: ['sh', 'c'], th: ['f', 't'], ck: ['c', 'k'] };
  const pos = i === 0 ? 'first' : 'last';
  const tiles = w.parts.map((p, k) => ({ text: k === i ? '' : p, gap: k === i }));
  return mcq({
    prompt: `Which letters spell the ${pos} sound in ${w.word}?`,
    visual: <TileRow tiles={tiles} emoji={PIC[w.word]} label={`${w.word} with the ${pos} sound missing`} boxes />,
    answer: target,
    wrong: others[target],
    hint: target === 'ck' ? 'Listen to the vowel just before the /k/. Is it short?' : `Say ${w.word} slowly. Is the ${pos} sound one letter's sound, or a two-letter sound?`,
    explain:
      target === 'ck'
        ? [`${w.word} ends with /k/ right after a short vowel.`, 'At the end of a short word, /k/ after a short vowel is spelled ck.', `So it's ${w.word}, with ck.`]
        : [`Say it slowly: ${sayParts(w.parts)}.`, `The ${pos} sound is ${soundName(target)}.`, `${soundName(target)} is spelled ${target}, so it's ${w.word}.`],
  });
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv === 0) return spellingQuestion(pick(BLENDS));
  if (lv === 1) return Math.random() < 0.6 ? digraphQuestion() : spellingQuestion(pick(BLENDS));
  return spellingQuestion(pick(DIGRAPHS));
}

export const soundItSpellIt: Lesson = {
  id: 'sound-it-spell-it',
  title: 'Spell by Sounds',
  Thumb,
  Scene: SpellScene,
  sceneHint: 'Say the word slowly · One box for each sound · Two letters can share a box',
  learn: {
    heading: 'Spelling longer words, sound by sound',
    intro: 'Good spellers say a word slowly, catch every sound, then write each sound in order. Some sounds need two letters.',
    points: [
      { icon: Ear, text: 'Blends keep both sounds: f-r-o-g has 4 sounds.' },
      { icon: Grid3x3, text: 'sh, ch, th and ck are two letters for one sound.' },
      { icon: SpellCheck, text: 'After a short vowel at the end of a word, /k/ is usually ck: duck, sock.' },
    ],
  },
  steps: ['Say the word slowly.', 'Count the sounds: one box each.', 'Write the spelling for each sound, in order.', 'Read it back sound by sound to check.'],
  example: {
    question: 'Spell the word for 🚚.',
    visual: <TileRow tiles={[{ text: 't' }, { text: 'r' }, { text: 'u' }, { text: 'ck' }]} emoji={PIC.truck} label="t r u ck" boxes />,
    work: ['Say it slowly: /t/ /r/ /u/ /k/.', '4 sounds, so 4 boxes.', '/k/ comes after the short vowel /u/ at the end, so write ck.'],
    answer: 'truck',
  },
  grownups: [
    'Children often drop the second sound of a blend (“fog” for frog). Ask them to say the word slowly and count sounds on their fingers.',
    'Writing sh, ch or th in one box shows that two letters can make one sound.',
    'The ck rule: after a short vowel at the end of a one-syllable word, /k/ is spelled ck (duck, sock, truck).',
    `Saying sounds, not letter names, helps: “${SOUND.f}, ${SOUND.r}, ${SOUND.o}, ${SOUND.g}” rather than “eff, ar, oh, gee”.`,
  ],
  makeQuestion,
};
