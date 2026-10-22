import { useEffect, useRef, useState } from 'react';
import { Combine, Hand, Scissors } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken, inside } from './visuals/DragToken';
import { Emoji } from './visuals/Cards';
import { sample, textChoices } from './q';

/** Picture words that join into compounds (all pictures are older emoji that show on most devices). */
const PARTS: Record<string, string> = {
  sun: '☀️',
  flower: '🌼',
  rain: '🌧️',
  bow: '🎀',
  foot: '🦶',
  ball: '⚽',
  cup: '☕',
  cake: '🍰',
  snow: '❄️',
  man: '👨',
  pan: '🍳',
  water: '💧',
  melon: '🍈',
  star: '⭐',
  fish: '🐟',
  bed: '🛏️',
  time: '⏰',
  door: '🚪',
  bell: '🔔',
  coat: '🧥',
};

const COMPOUNDS: { a: string; b: string; word: string; pic?: string }[] = [
  { a: 'sun', b: 'flower', word: 'sunflower', pic: '🌻' },
  { a: 'rain', b: 'bow', word: 'rainbow', pic: '🌈' },
  { a: 'foot', b: 'ball', word: 'football', pic: '🏈' },
  { a: 'cup', b: 'cake', word: 'cupcake', pic: '🧁' },
  { a: 'snow', b: 'man', word: 'snowman', pic: '⛄' },
  { a: 'pan', b: 'cake', word: 'pancake', pic: '🥞' },
  { a: 'water', b: 'melon', word: 'watermelon', pic: '🍉' },
  { a: 'star', b: 'fish', word: 'starfish' },
  { a: 'bed', b: 'time', word: 'bedtime' },
  { a: 'door', b: 'bell', word: 'doorbell' },
  { a: 'rain', b: 'coat', word: 'raincoat' },
  { a: 'snow', b: 'ball', word: 'snowball' },
];

/** Long words split into syllables (each syllable has one vowel sound). Splits follow common dictionaries. */
const SYLLABLES: string[][] = [
  ['rab', 'bit'],
  ['pic', 'nic'],
  ['bas', 'ket'],
  ['pump', 'kin'],
  ['sand', 'wich'],
  ['kit', 'ten'],
  ['pen', 'cil'],
  ['mag', 'net'],
  ['cac', 'tus'],
  ['um', 'brel', 'la'],
  ['fan', 'tas', 'tic'],
  ['but', 'ter', 'fly'],
  ['el', 'e', 'phant'],
  ['hel', 'i', 'cop', 'ter'],
  ['hip', 'po', 'pot', 'a', 'mus'],
];

// ───────────────────────── Scene ─────────────────────────

function CompoundScene() {
  const [mode, setMode] = useState<'join' | 'split'>('join');
  return (
    <SceneSvg label="Join two words into a compound word, or cut long words into syllables">
      <SvgButton x={40} y={22} w={170} h={50} fontSize={18} label="Join words" active={mode === 'join'} color={mode === 'join' ? C.yellow : C.card} onClick={() => setMode('join')} />
      <SvgButton x={222} y={22} w={190} h={50} fontSize={18} label="Cut syllables" active={mode === 'split'} color={mode === 'split' ? C.yellow : C.card} onClick={() => setMode('split')} />
      {mode === 'join' ? <JoinBench /> : <SplitBench />}
    </SceneSvg>
  );
}

const SLOT_A = { x: 210, y: 110, w: 200, h: 170 };
const SLOT_B = { x: 470, y: 110, w: 200, h: 170 };
const trayX = (i: number) => 110 + (i % 6) * 156;
const trayY = (i: number) => 420 + Math.floor(i / 6) * 120;

function dealParts() {
  const pairs = sample(COMPOUNDS, 3);
  const words = new Set<string>();
  pairs.forEach((p) => {
    words.add(p.a);
    words.add(p.b);
  });
  for (const w of shuffle(Object.keys(PARTS))) {
    if (words.size >= 6) break;
    words.add(w);
  }
  return shuffle([...words]);
}

function JoinBench() {
  const [tray, setTray] = useState(dealParts);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [made, setMade] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('Drag two word cards into the boxes to make one longer word.');

  const found = a && b ? COMPOUNDS.find((c) => c.a === a && c.b === b) : undefined;

  const check = (na: string | null, nb: string | null) => {
    if (!na || !nb) return;
    const hit = COMPOUNDS.find((c) => c.a === na && c.b === nb);
    if (hit) {
      play('correct');
      setMade(made.includes(hit.word) ? made : [...made, hit.word]);
      setMessage(`${na} + ${nb} = ${hit.word}!`);
    } else {
      const flipped = COMPOUNDS.find((c) => c.a === nb && c.b === na);
      play('wrong');
      setShake({ ...shake, [nb]: (shake[nb] ?? 0) + 1 });
      setMessage(flipped ? `So close! Swap them: ${nb} + ${na}.` : `“${na}${nb}” isn’t a word we use. Tap a box to take a card back and try another.`);
    }
  };

  const place = (w: string, slot: 'a' | 'b') => {
    play('pop');
    setSelected(null);
    if (slot === 'a') {
      if (a) setTray((t) => [...t, a]);
      setA(w);
      setTray((t) => t.filter((x) => x !== w));
      check(w, b);
    } else {
      if (b) setTray((t) => [...t, b]);
      setB(w);
      setTray((t) => t.filter((x) => x !== w));
      check(a, w);
    }
  };

  const drop = (w: string, p: Pt) => {
    if (inside(p, SLOT_A)) place(w, 'a');
    else if (inside(p, SLOT_B)) place(w, 'b');
  };

  const clear = (slot: 'a' | 'b') => {
    const w = slot === 'a' ? a : b;
    if (!w) return;
    play('tap');
    setTray((t) => [...t, w]);
    if (slot === 'a') setA(null);
    else setB(null);
    setMessage('Drag two word cards into the boxes to make one longer word.');
  };

  const box = (r: typeof SLOT_A, w: string | null, slot: 'a' | 'b') => (
    <g onClick={() => (w ? clear(slot) : selected && place(selected, slot))} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={w ? `Take back ${w}` : 'Put the chosen word here'}>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill={w ? C.white : shade(C.blue, 0.88)} stroke={C.ink} strokeWidth={2.5} strokeDasharray={w ? undefined : '8 6'} />
      {w ? (
        <>
          <Emoji x={r.x + r.w / 2} y={r.y + 62} size={64} char={PARTS[w]} />
          <text x={r.x + r.w / 2} y={r.y + 140} textAnchor="middle" fontSize={30} fontWeight={700} fill={C.ink}>
            {w}
          </text>
        </>
      ) : (
        <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={18} fill={C.muted}>
          word {slot === 'a' ? 1 : 2}
        </text>
      )}
    </g>
  );

  return (
    <g>
      {box(SLOT_A, a, 'a')}
      <text x={440} y={205} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={800} fill={C.ink}>
        +
      </text>
      {box(SLOT_B, b, 'b')}
      <text x={705} y={205} textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={800} fill={C.ink}>
        =
      </text>
      <rect x={740} y={110} width={220} height={170} rx={18} fill={found ? shade(C.green, 0.8) : C.card} stroke={C.ink} strokeWidth={2.5} />
      {found ? (
        <>
          {found.pic && <Emoji x={850} y={172} size={64} char={found.pic} />}
          <text x={850} y={found.pic ? 250 : 200} textAnchor="middle" fontSize={found.word.length > 9 ? 26 : 30} fontWeight={800} fill={C.ink}>
            {found.word}
          </text>
        </>
      ) : (
        <text x={850} y={195} textAnchor="middle" dominantBaseline="central" fontSize={40} fill={C.line}>
          ?
        </text>
      )}

      <text x={500} y={330} textAnchor="middle" fontSize={18} fill={C.ink2}>
        {message}
      </text>
      <text x={500} y={362} textAnchor="middle" fontSize={15} fill={C.muted}>
        {made.length ? `You made: ${made.join(', ')}` : ' '}
      </text>

      {tray.map((w, i) => (
        <DragToken
          key={w}
          x={trayX(i)}
          y={trayY(i)}
          label={`Word card ${w}`}
          selected={selected === w}
          shakeKey={shake[w] ?? 0}
          onTap={() => {
            play('tap');
            setSelected(selected === w ? null : w);
          }}
          onDrop={(p) => drop(w, p)}
        >
          <rect x={-66} y={-46} width={132} height={92} rx={14} fill={C.ink} opacity={0.12} transform="translate(3 5)" />
          <rect x={-66} y={-46} width={132} height={92} rx={14} fill={selected === w ? shade(C.yellow, 0.7) : C.white} stroke={C.ink} strokeWidth={2.5} />
          <Emoji y={-12} size={36} char={PARTS[w]} />
          <text y={30} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
            {w}
          </text>
        </DragToken>
      ))}

      <SvgButton
        x={420}
        y={600}
        w={160}
        h={52}
        fontSize={17}
        label="New cards"
        color={C.teal}
        textColor={C.white}
        onClick={() => {
          setTray(dealParts());
          setA(null);
          setB(null);
          setSelected(null);
          setMessage('Drag two word cards into the boxes to make one longer word.');
        }}
      />
      <Callout at={[440, 205]} box={[40, 300]} w={220} icon={Combine} title="Compound word" text="Two small words joined to make a new word." />
    </g>
  );
}

const LETTER_W = 52;
const CUT_GAP = 22;

function SplitBench() {
  const [order] = useState(() => shuffle(SYLLABLES));
  const [index, setIndex] = useState(0);
  const [cuts, setCuts] = useState<Set<number>>(new Set());
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'cutting' | 'right' | 'shown'>('cutting');
  const [clap, setClap] = useState(-1);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const parts = order[index % order.length];
  const word = parts.join('');
  const answer = new Set<number>();
  parts.reduce((at, p) => {
    at += p.length;
    if (at < word.length) answer.add(at);
    return at;
  }, 0);

  const shown = state === 'cutting' ? cuts : answer;
  const width = word.length * LETTER_W + shown.size * CUT_GAP;
  const left = 500 - width / 2;
  /** x of the left edge of letter i, after the cuts before it have pushed it right. */
  const letterX = (i: number) => left + i * LETTER_W + [...shown].filter((c) => c <= i).length * CUT_GAP;
  const chunks = splitAt(word, shown);

  const toggle = (gap: number) => {
    if (state !== 'cutting') return;
    play('tap');
    const next = new Set(cuts);
    if (next.has(gap)) next.delete(gap);
    else next.add(gap);
    setCuts(next);
  };

  const check = () => {
    const same = cuts.size === answer.size && [...cuts].every((c) => answer.has(c));
    if (same) {
      play('correct');
      setState('right');
      return;
    }
    play('wrong');
    if (tries >= 1) setState('shown');
    setTries(tries + 1);
  };

  const clapIt = () => {
    speak(word, { force: true });
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = chunks.map((_, i) => window.setTimeout(() => setClap(i), i * 450));
    timers.current.push(window.setTimeout(() => setClap(-1), chunks.length * 450 + 300));
  };

  let offset = 0;
  return (
    <g>
      <text x={500} y={120} textAnchor="middle" fontSize={18} fill={C.ink2}>
        Tap between letters to cut the word into syllables. Each syllable has one vowel sound.
      </text>
      {chunks.map((chunk, ci) => {
        const first = offset;
        offset += chunk.length;
        const x0 = letterX(first);
        const color = [C.red, C.blue, C.green, C.purple, C.orange][ci % 5];
        return (
          <g key={ci} transform={`translate(0 ${clap === ci ? -14 : 0})`}>
            <rect x={x0 - 4} y={170} width={chunk.length * LETTER_W + 8} height={100} rx={16} fill={shade(color, 0.82)} stroke={C.ink} strokeWidth={2.5} />
            {chunk.split('').map((ch, li) => (
              <text key={li} x={x0 + li * LETTER_W + LETTER_W / 2} y={232} textAnchor="middle" fontSize={46} fontWeight={700} fill={C.ink}>
                {ch}
              </text>
            ))}
          </g>
        );
      })}
      {state === 'cutting' &&
        Array.from({ length: word.length - 1 }, (_, i) => {
          const gap = i + 1;
          // Halfway between the end of letter gap-1 and the start of letter gap.
          const x = (letterX(gap - 1) + LETTER_W + letterX(gap)) / 2;
          const on = cuts.has(gap);
          return (
            <g key={gap} onClick={() => toggle(gap)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Cut after letter ${gap}`}>
              <rect x={x - 16} y={282} width={32} height={60} rx={8} fill="transparent" />
              <line x1={x} y1={292} x2={x} y2={334} stroke={on ? C.red : C.line} strokeWidth={on ? 4 : 3} strokeDasharray={on ? undefined : '4 4'} />
              <circle cx={x} cy={292} r={8} fill={on ? C.red : C.white} stroke={C.ink} strokeWidth={1.5} />
            </g>
          );
        })}

      <text x={500} y={385} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
        {state === 'right'
          ? `Yes! ${parts.join(' · ')}: ${parts.length} syllables.`
          : state === 'shown'
            ? `Here it is: ${parts.join(' · ')}. Say it and clap: ${parts.length} claps.`
            : tries > 0
              ? 'Not yet. Say the word slowly and clap each beat.'
              : `${chunks.length} ${chunks.length === 1 ? 'piece' : 'pieces'} so far`}
      </text>

      <SvgButton x={250} y={440} w={150} h={52} fontSize={17} label="Clap it" title="Hear the word and see each beat" onClick={clapIt} />
      {state === 'cutting' ? (
        <>
          <SvgButton x={420} y={440} w={150} h={52} fontSize={17} label="Clear cuts" onClick={() => setCuts(new Set())} />
          <SvgButton x={590} y={440} w={150} h={52} fontSize={17} label="Check" color={C.teal} textColor={C.white} onClick={check} disabled={cuts.size === 0} />
        </>
      ) : (
        <SvgButton
          x={420}
          y={440}
          w={170}
          h={52}
          fontSize={17}
          label="Next word"
          color={C.teal}
          textColor={C.white}
          onClick={() => {
            setIndex(index + 1);
            setCuts(new Set());
            setTries(0);
            setState('cutting');
          }}
        />
      )}
      <Callout at={[500, 300]} box={[640, 520]} w={300} icon={Scissors} title="One vowel sound each" text="Every syllable has one vowel sound. Two consonants in the middle? Cut between them: rab · bit." />
    </g>
  );
}

function splitAt(word: string, cuts: Set<number>): string[] {
  const out: string[] = [];
  let start = 0;
  [...cuts].sort((x, y) => x - y).forEach((c) => {
    out.push(word.slice(start, c));
    start = c;
  });
  out.push(word.slice(start));
  return out;
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <text x={22} y={42} textAnchor="middle" fontSize={26} style={{ fontFamily: 'sans-serif' }}>☀️</text>
      <text x={44} y={44} textAnchor="middle" fontSize={20} fontWeight={800} fill={C.ink}>+</text>
      <text x={66} y={42} textAnchor="middle" fontSize={26}>🌼</text>
      <text x={84} y={44} textAnchor="middle" fontSize={20} fontWeight={800} fill={C.ink}>=</text>
      <text x={104} y={42} textAnchor="middle" fontSize={26}>🌻</text>
      <text x={60} y={70} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink}>sun · flower</text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

/** Two-syllable words that are NOT compounds (the first part is not a word on its own). */
const NOT_COMPOUND = ['rabbit', 'basket', 'happy', 'picnic', 'lemon', 'pencil', 'tiger', 'magnet'];

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const c = pick(COMPOUNDS);
    const wrong = sample(
      COMPOUNDS.filter((o) => o.word !== c.word),
      3,
    ).map((o) => `${o.a} + ${o.b}`);
    const answer = `${c.a} + ${c.b}`;
    return {
      prompt: `Which two words make “${c.word}”?`,
      choices: textChoices(answer, [`${c.b} + ${c.a}`, ...wrong]),
      answer,
      hint: 'Find a small word at the start, then see what word is left.',
      explain: [`Look at the start of “${c.word}”: “${c.a}” is a word.`, `What is left is “${c.b}”, another word.`, `So ${c.a} + ${c.b} = ${c.word}.`],
    };
  }
  if (level === 1) {
    if (Math.random() < 0.5) {
      const c = pick(COMPOUNDS);
      return {
        prompt: 'Which one is a compound word?',
        choices: textChoices(c.word, sample(NOT_COMPOUND, 3)),
        answer: c.word,
        hint: 'A compound word is two whole words stuck together. Can you find two real words inside?',
        explain: [`Check each word for two real words inside.`, `“${c.word}” is ${c.a} + ${c.b}: both are real words.`, `So ${c.word} is the compound word.`],
      };
    }
    const parts = pick(SYLLABLES.filter((p) => p.length <= 3));
    const word = parts.join('');
    const n = parts.length;
    return {
      prompt: `How many syllables are in “${word}”?`,
      choices: textChoices(String(n), ['1', '2', '3', '4'].filter((x) => x !== String(n))),
      answer: String(n),
      hint: 'Say the word slowly and clap once for each beat.',
      explain: [`Say it slowly: ${parts.join(' · ')}.`, `Clap once for each beat: ${parts.map(() => 'clap').join(', ')}.`, `That is ${n} syllables.`],
    };
  }
  const parts = pick(SYLLABLES.filter((p) => p.length >= 2));
  const word = parts.join('');
  const answer = parts.join('-');
  const wrongs = wrongSplits(word, parts);
  return {
    prompt: `Which shows “${word}” cut into syllables?`,
    choices: textChoices(answer, wrongs),
    answer,
    hint: 'Each syllable needs one vowel sound. With two consonants in the middle, cut between them.',
    explain: [
      `Find the vowel sounds in “${word}”: there are ${parts.length}.`,
      `Cut so each part has one vowel sound: ${answer}.`,
      `Say it and clap: ${parts.length} beats.`,
    ],
  };
}

/** Plausible but wrong syllable splits (each still has the same letters). */
function wrongSplits(word: string, parts: string[]): string[] {
  const right = parts.join('-');
  const out = new Set<string>();
  const n = parts.length;
  for (let tries = 0; tries < 60 && out.size < 4; tries++) {
    // Shift one cut left or right by a letter, or use a different number of cuts.
    const cuts: number[] = [];
    parts.reduce((at, p) => {
      at += p.length;
      if (at < word.length) cuts.push(at);
      return at;
    }, 0);
    const k = Math.floor(Math.random() * cuts.length);
    const shift = Math.random() < 0.5 ? -1 : 1;
    cuts[k] += shift;
    if (Math.random() < 0.25 && n > 2) cuts.splice(Math.floor(Math.random() * cuts.length), 1);
    if (cuts.some((c, i) => c <= 0 || c >= word.length || (i > 0 && c <= cuts[i - 1]))) continue;
    const split = splitAt(word, new Set(cuts)).join('-');
    if (split !== right) out.add(split);
  }
  return [...out];
}

export const compoundWords: Lesson = {
  id: 'compound-words',
  title: 'Compound Words and Syllables',
  Thumb,
  Scene: CompoundScene,
  sceneHint: 'Join two word cards into one word · Tap between letters to cut syllables',
  learn: {
    heading: 'Big words in small pieces',
    intro:
      'Long words are easier to read in pieces. A compound word is two words joined together, like sun + flower. Other long words split into syllables, the beats you clap when you say them.',
    points: [
      { icon: Combine, text: 'A compound word = word + word (rain + bow = rainbow).' },
      { icon: Hand, text: 'A syllable is one beat. Clap it: but · ter · fly has 3.' },
      { icon: Scissors, text: 'Every syllable has one vowel sound. Two consonants in a row? Cut between them: rab · bit.' },
    ],
  },
  steps: [
    'Look for a small word you know at the start of a long word.',
    'If the rest is also a word, it is a compound: read the two words together.',
    'If not, find the vowels and cut the word into syllables.',
    'Read one syllable at a time, then blend them into the whole word.',
  ],
  example: {
    question: 'How do you read “umbrella”?',
    work: ['Find the vowels: u, e, a. That means 3 syllables.', 'Cut between the double consonants: um · brel · la.', 'Read each part, then blend: umbrella.'],
    answer: 'um · brel · la, 3 syllables.',
  },
  grownups: [
    'Clapping or tapping syllables builds the phonological awareness that helps children decode long words.',
    'Dictionaries sometimes split syllables a little differently. What matters is that each part has one vowel sound and the child can read it.',
    'Spot compounds around the house: toothbrush, bedroom, cupboard (careful: cupboard doesn’t sound like cup + board!).',
  ],
  makeQuestion,
};
