import { useMemo, useState } from 'react';
import { Combine, Ear, Hand } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PIC, sayBlend, sayLetters, slash } from './phonics';
import { DragTile, Emoji, EmojiPicture, LetterTile, Panel, TileFace, TileRow } from './visuals/Tiles';

interface BlendWord {
  word: string;
  blend: string;
  /** The rest of the word, and its sounds ("ck" is one sound). */
  end: string;
  endSounds: string[];
  /** Spellings children often write by mistake (dropping or swapping a blend letter). */
  misspell: [string, string];
}

const WORDS: BlendWord[] = [
  { word: 'frog', blend: 'fr', end: 'og', endSounds: ['o', 'g'], misspell: ['fog', 'forg'] },
  { word: 'crab', blend: 'cr', end: 'ab', endSounds: ['a', 'b'], misspell: ['cab', 'carb'] },
  { word: 'flag', blend: 'fl', end: 'ag', endSounds: ['a', 'g'], misspell: ['lag', 'falg'] },
  { word: 'clock', blend: 'cl', end: 'ock', endSounds: ['o', 'ck'], misspell: ['lock', 'colck'] },
  { word: 'truck', blend: 'tr', end: 'uck', endSounds: ['u', 'ck'], misspell: ['tuck', 'turck'] },
  { word: 'plug', blend: 'pl', end: 'ug', endSounds: ['u', 'g'], misspell: ['pug', 'pulg'] },
  { word: 'drum', blend: 'dr', end: 'um', endSounds: ['u', 'm'], misspell: ['dum', 'durm'] },
  { word: 'stop', blend: 'st', end: 'op', endSounds: ['o', 'p'], misspell: ['top', 'sotp'] },
  { word: 'sled', blend: 'sl', end: 'ed', endSounds: ['e', 'd'], misspell: ['sed', 'seld'] },
  { word: 'swim', blend: 'sw', end: 'im', endSounds: ['i', 'm'], misspell: ['sim', 'siwm'] },
];

const BLENDS = ['fr', 'cr', 'fl', 'cl', 'tr', 'pl', 'dr', 'st', 'sl', 'sw', 'gr', 'br', 'sn', 'sp'];

/** Words a wrong blend could build that aren't right for a children's app. */
const NOT_FOR_KIDS = ['snog', 'slag', 'drug', 'slut', 'crap'];
const okFor = (end: string) => (b: string) => !NOT_FOR_KIDS.includes(b + end);

const SLOT = { x: 470, y: 218 };
const TRAY_Y = 450;
const trayX = (i: number) => 290 + i * 140;

function trayFor(index: number): string[] {
  const { blend: target, end } = WORDS[index];
  // Distractors share a letter with the target where possible, so the child must listen to both sounds.
  const near = BLENDS.filter((b) => b !== target && okFor(end)(b) && (b[0] === target[0] || b[1] === target[1]));
  const far = BLENDS.filter((b) => b !== target && okFor(end)(b) && !near.includes(b));
  const picks = [...shuffle(near).slice(0, 2), ...shuffle(far)].slice(0, 3);
  return shuffle([target, ...picks]);
}

function BlendScene() {
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const tray = useMemo(() => trayFor(index), [index]);
  const item = WORDS[index];
  const solved = placed === item.blend;
  const made = placed ? placed + item.end : null;

  const place = (b: string) => {
    setPlaced(b);
    play(b === item.blend ? 'correct' : 'pop');
  };
  const drop = (b: string, p: Pt) => {
    if (Math.abs(p.x - SLOT.x) < 90 && Math.abs(p.y - SLOT.y) < 90) place(b);
    else setShake({ ...shake, [b]: (shake[b] ?? 0) + 1 });
  };
  const next = () => {
    setIndex((index + 1) % WORDS.length);
    setPlaced(null);
  };

  return (
    <SceneSvg label={`Make the word for a picture of a ${item.word}`}>
      <text x={500} y={52} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink}>
        Which blend makes the picture word?
      </text>

      <Panel x={90} y={110} w={220} h={220} />
      <Emoji x={200} y={220} char={PIC[item.word]} size={130} />

      {/* The word being built */}
      {placed ? (
        <g onClick={() => setPlaced(null)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Take ${placed} back`}>
          <LetterTile x={SLOT.x} y={SLOT.y} w={130} h={120} fontSize={64} text={placed} color={solved ? shade(C.green, 0.6) : C.card} glow={solved} />
        </g>
      ) : (
        <LetterTile x={SLOT.x} y={SLOT.y} w={130} h={120} fontSize={64} text="?" dashed />
      )}
      <LetterTile x={SLOT.x + 160} y={SLOT.y} w={item.end.length * 46 + 40} h={120} fontSize={64} text={item.end} onTap={() => sayBlend(item.endSounds, item.end)} label={`Hear ${item.end}`} />

      <SvgButton
        x={770}
        y={186}
        w={170}
        h={60}
        fontSize={20}
        label="Blend it"
        color={C.teal}
        textColor={C.white}
        disabled={!placed}
        onClick={() => placed && sayBlend([...placed.split(''), ...item.endSounds], placed + item.end)}
      />

      {/* Message */}
      <text x={500} y={366} textAnchor="middle" fontSize={22} fontWeight={600} fill={solved ? '#1f7a4a' : C.ink2}>
        {!made
          ? 'Drag a blend into the gap. Tap a blend to hear it.'
          : solved
            ? `${placed} + ${item.end} = ${made}. You built ${item.word}!`
            : `${placed} + ${item.end} makes “${made}”. Listen to the picture word — try another blend.`}
      </text>

      {/* Blend tray */}
      {tray.map((b, i) =>
        b === placed ? (
          <LetterTile key={b} x={trayX(i)} y={TRAY_Y} w={110} h={100} fontSize={50} text={b} dashed />
        ) : (
          <DragTile key={b} x={trayX(i)} y={TRAY_Y} label={`Blend ${b}`} shakeKey={shake[b] ?? 0} onDrop={(p) => drop(b, p)} onTap={() => sayLetters(b)}>
            <TileFace text={b} w={110} h={100} fontSize={50} color={shade(C.orange, 0.7)} />
          </DragTile>
        ),
      )}

      {solved && <SvgButton x={410} y={560} w={180} h={60} fontSize={20} label="Next picture" color={C.yellow} onClick={next} />}
      {!solved && <SvgButton x={410} y={560} w={180} h={60} fontSize={20} label="Skip" onClick={next} />}

      <Callout at={[SLOT.x, SLOT.y - 60]} box={[350, 70]} w={190} icon={Combine} title="Two sounds" text="In a blend you can hear both letters: /f/ + /r/ = fr." />
      <Callout at={[trayX(0) - 55, TRAY_Y]} box={[40, 520]} w={180} icon={Hand} title="Drag a blend" text="Pick it up and drop it in the gap. Tap it to hear its sounds." />
      <Callout at={[SLOT.x + 200, SLOT.y + 60]} box={[700, 290]} w={200} icon={Ear} title="Tap to hear" text="Tap the ending to hear its sounds, then Blend it." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <text x={26} y={40} textAnchor="middle" dominantBaseline="central" fontSize={34}>
        🐸
      </text>
      <rect x={50} y={24} width={30} height={32} rx={6} fill={shade(C.orange, 0.6)} stroke={C.ink} strokeWidth={2} />
      <text x={65} y={41} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.ink}>
        fr
      </text>
      <rect x={84} y={24} width={30} height={32} rx={6} fill="white" stroke={C.ink} strokeWidth={2} />
      <text x={99} y={41} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.ink}>
        og
      </text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const soundsOf = (w: BlendWord) => [...w.blend.split(''), ...w.endSounds].map(slash).join(' ');

function makeQuestion(level: number): Question {
  const item = pick(WORDS);
  if (level === 0) {
    const allowed = BLENDS.filter((b) => b !== item.blend && okFor(item.end)(b));
    const near = allowed.filter((b) => b[0] === item.blend[0] || b[1] === item.blend[1]);
    const others = shuffle(near.length >= 2 ? near : allowed).slice(0, 2);
    return {
      prompt: 'Which blend starts the picture word?',
      visual: <TileRow emoji={PIC[item.word]} tiles={[{ text: item.blend, gap: true }, { text: item.end }]} label={`gap, ${item.end}`} />,
      choices: shuffle([item.blend, ...others]).map((value) => ({ value })),
      answer: item.blend,
      hint: 'Say the picture word slowly. Listen for the first TWO sounds.',
      explain: [
        `Say ${item.word} slowly: ${soundsOf(item)}.`,
        `The first two sounds are ${slash(item.blend[0])} and ${slash(item.blend[1])}.`,
        `They are spelled ${item.blend}, so the word is ${item.word}.`,
      ],
    };
  }
  if (level === 1) {
    const others = shuffle(WORDS.filter((w) => w.word !== item.word && w.blend[0] !== item.blend[0])).slice(0, 2);
    const options = shuffle([item, ...others]);
    return {
      prompt: `Read the word: ${item.word}. Which picture matches?`,
      speak: 'Read the word. Which picture matches?',
      visual: <TileRow tiles={[{ text: item.blend, color: shade(C.orange, 0.7) }, { text: item.end }]} label={item.word} />,
      choices: options.map((w) => ({ value: w.word, name: w.word, label: <EmojiPicture char={PIC[w.word]} label={w.word} /> })),
      answer: item.word,
      hint: 'Sound out every letter first, then think about what the word means.',
      explain: [`Read it sound by sound: ${soundsOf(item)}.`, `Blend the sounds: ${item.word}.`, `The picture of the ${item.word} matches.`],
    };
  }
  const spellings = shuffle([item.word, ...item.misspell]);
  return {
    prompt: 'Which spelling is right for the picture?',
    visual: <EmojiPicture char={PIC[item.word]} label="A picture" />,
    choices: spellings.map((value) => ({ value })),
    answer: item.word,
    hint: 'Say the word slowly and count the sounds. Every sound needs its letter, in order.',
    explain: [
      `Say ${item.word}: ${soundsOf(item)}.`,
      `Both ${slash(item.blend[0])} and ${slash(item.blend[1])} need a letter, in that order: ${item.blend}.`,
      `So the right spelling is ${item.word}.`,
    ],
  };
}

export const consonantBlends: Lesson = {
  id: 'consonant-blends',
  title: 'Blends',
  Thumb,
  Scene: BlendScene,
  sceneHint: 'Drag a blend into the gap · Tap tiles to hear them',
  learn: {
    heading: 'Blends',
    intro: 'A blend is two consonants side by side where you can still hear BOTH sounds, like fr in frog or st in stop. Say them quickly together!',
    points: [
      { icon: Ear, text: 'In a blend, each letter keeps its own sound: /s/ + /t/ = st.' },
      { icon: Combine, text: 'Say the two sounds fast so they slide together.' },
      { icon: Hand, text: 'Don’t drop a sound: frog has four sounds, not three.' },
    ],
  },
  steps: ['Say the first two sounds slowly: /f/ … /r/.', 'Slide them together: fr.', 'Add the rest of the word: fr + og.', 'Blend it all: frog!'],
  example: {
    question: 'Read the word: c r a b',
    visual: <TileRow tiles={[{ text: 'cr', color: shade(C.orange, 0.7) }, { text: 'ab' }]} label="cr ab" />,
    work: ['The blend cr says /k/ /r/ — you hear both.', 'Then /a/ /b/.', 'Blend them: /k/ /r/ /a/ /b/ → crab.'],
    answer: 'The word is crab.',
  },
  grownups: [
    'Blends are tricky to hear. If your child spells “fog” for frog, stretch the word slowly together and listen for the /r/.',
    'Keep it about sounds: say /s/ /t/, not the letter names “ess” and “tee”.',
    'Hunt for blends in signs and books: stop, play, green, swim.',
    'Use the Skip button freely — the goal is a few good tries, not getting through every picture.',
  ],
  makeQuestion,
};
