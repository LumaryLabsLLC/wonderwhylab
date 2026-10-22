import { useMemo, useRef, useState } from 'react';
import { Highlighter, Lightbulb, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Passage } from './visuals/Passage';
import './writers.css';

type ClueType = 'definition' | 'example' | 'contrast';

interface Source {
  /** *word* = the unknown word, [ … ] = clue words. */
  s: string;
  types: ClueType[];
  meaning: string;
  wrong: [string, string];
}

/** Sentences for the scene and practice. Each clue really does point to the meaning. */
const SENTENCES: Source[] = [
  { s: 'The desert is *arid*, getting [almost no rain] all year.', types: ['definition'], meaning: 'very dry', wrong: ['very windy', 'very crowded'] },
  { s: 'The path was *treacherous*: [loose rocks], [steep drops] and [slippery mud] were everywhere.', types: ['example'], meaning: 'dangerous', wrong: ['beautiful', 'quiet'] },
  { s: 'Mia was *elated*, [not sad at all], when her team won the cup.', types: ['contrast'], meaning: 'very happy', wrong: ['very worried', 'very bored'] },
  { s: 'A *nomad* is [a person who moves from place to place] instead of living in one home.', types: ['definition'], meaning: 'a person who keeps moving', wrong: ['a person who builds houses', 'a person who grows food'] },
  { s: 'The puppy was *famished*; it was [so hungry] that it [gulped down two bowls] of food.', types: ['definition', 'example'], meaning: 'very hungry', wrong: ['very sleepy', 'very muddy'] },
  { s: '*Nocturnal* animals, [such as owls and bats], [hunt at night] and sleep during the day.', types: ['example', 'definition'], meaning: 'active at night', wrong: ['very large', 'living in water'] },
  { s: '[Unlike] her *gregarious* brother, who [loves big parties], Ana is [shy and quiet].', types: ['contrast', 'definition'], meaning: 'friendly and sociable', wrong: ['tall and strong', 'rude and grumpy'] },
  { s: 'Ben was *reluctant* to jump in; [unlike his eager friends], he [stood at the edge] and [shook his head].', types: ['contrast', 'example'], meaning: 'unwilling', wrong: ['excited', 'good at swimming'] },
];

/** Harder words, used at the top practice level. */
const HARD: Source[] = [
  { s: 'The *frugal* family [saved every coin] and [never wasted food].', types: ['example'], meaning: 'careful with money', wrong: ['very noisy', 'always late'] },
  { s: 'The *lethargic* cat [lay in the sun all afternoon], [too tired to chase] the mouse.', types: ['example'], meaning: 'slow and sleepy', wrong: ['quick and playful', 'angry and fierce'] },
  { s: 'The lake was *serene*, [not stormy and wild] like the sea.', types: ['contrast'], meaning: 'calm and peaceful', wrong: ['deep and cold', 'noisy and busy'] },
  { s: 'An *optimist* is [someone who expects good things to happen].', types: ['definition'], meaning: 'a hopeful person', wrong: ['a worried person', 'a lazy person'] },
  { s: 'The speaker was *verbose*; she [used a hundred words] [when ten would do].', types: ['example'], meaning: 'using too many words', wrong: ['speaking too quietly', 'using very short words'] },
];

interface Token {
  text: string;
  target: boolean;
  clue: number; // -1 = not a clue, otherwise the clue group
}

interface Parsed extends Source {
  tokens: Token[];
  word: string;
  plain: string;
  groups: string[];
}

const strip = (t: string) => t.replace(/[.,;:!?]+$/g, '').replace(/^[“"]/, '');

function parse(src: Source): Parsed {
  const tokens: Token[] = [];
  let group = -1;
  let inClue = false;
  for (const raw of src.s.split(' ')) {
    if (raw.includes('[')) {
      group += 1;
      inClue = true;
    }
    const text = raw.replace(/[*[\]]/g, '');
    tokens.push({ text, target: raw.includes('*'), clue: inClue ? group : -1 });
    if (raw.includes(']')) inClue = false;
  }
  const groups: string[] = [];
  for (let g = 0; g <= group; g++) groups.push(strip(tokens.filter((t) => t.clue === g).map((t) => t.text).join(' ')));
  return {
    ...src,
    tokens,
    word: strip(tokens.find((t) => t.target)!.text),
    plain: tokens.map((t) => t.text).join(' '),
    groups,
  };
}

const PARSED = SENTENCES.map(parse);
const PARSED_HARD = HARD.map(parse);

const TYPE_TEXT: Record<ClueType, string> = {
  definition: 'A definition clue tells you what the word means, right there in the sentence.',
  example: 'An example clue gives examples that show what the word means.',
  contrast: 'A contrast clue tells you the opposite, using words like unlike, not or instead.',
};

const TYPE_NAME: Record<ClueType, string> = { definition: 'Definition', example: 'Example', contrast: 'Contrast' };

/** The sentence with the word marked, for practice visuals. */
const marked = (p: Parsed) => p.tokens.map((t) => (t.target ? `*${strip(t.text)}*${t.text.slice(strip(t.text).length)}` : t.text)).join(' ');

// Scene layout.
const CARD = { x: 40, y: 72, w: 920, h: 190 };
const FONT = 26;
const LINE_H = 54;

interface Box {
  x: number;
  y: number;
  w: number;
}

function layout(tokens: Token[]): Box[] {
  const boxes: Box[] = [];
  let x = CARD.x + 30;
  let y = CARD.y + 50;
  for (const t of tokens) {
    const w = t.text.length * FONT * 0.53 + 4;
    if (x + w > CARD.x + CARD.w - 24) {
      x = CARD.x + 30;
      y += LINE_H;
    }
    boxes.push({ x, y, w });
    x += w + 12;
  }
  return boxes;
}

function ContextScene() {
  const [index, setIndex] = useState(0);
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const sentence = PARSED[index];
  const boxes = useMemo(() => layout(sentence.tokens), [sentence]);
  const options = useMemo(() => shuffle([sentence.meaning, ...sentence.wrong]), [sentence]);
  const mode = useRef(true);

  const hit = (p: Pt) =>
    boxes.findIndex((b, i) => !sentence.tokens[i].target && p.x >= b.x - 5 && p.x <= b.x + b.w + 5 && p.y >= b.y - 34 && p.y <= b.y + 14);

  const paint = (i: number, on: boolean) => {
    if (i < 0) return;
    setLit((prev) => {
      if (prev.has(i) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(i);
      else next.delete(i);
      return next;
    });
  };

  const drag = useSvgDrag((p) => paint(hit(p), mode.current), {
    onStart: (p) => {
      const i = hit(p);
      mode.current = i >= 0 ? !lit.has(i) : true;
      if (i >= 0) play('tap');
    },
  });

  const choose = (m: string) => {
    if (solved || wrong.includes(m)) return;
    if (m === sentence.meaning) {
      setSolved(true);
      play('correct');
    } else {
      setWrong([...wrong, m]);
      play('wrong');
    }
  };

  const next = () => {
    setIndex((index + 1) % PARSED.length);
    setLit(new Set());
    setSolved(false);
    setWrong([]);
  };

  const clueIdx = sentence.tokens.map((t, i) => (t.clue >= 0 ? i : -1)).filter((i) => i >= 0);
  const found = clueIdx.filter((i) => lit.has(i)).length;
  const extra = [...lit].filter((i) => sentence.tokens[i].clue < 0).length;

  let title = `What does “${sentence.word}” mean?`;
  let lines: string[] = ['Highlight the words that help you, then choose a meaning below.'];
  if (solved) {
    title = `Yes! ${sentence.word} means “${sentence.meaning}”.`;
    lines = [
      `Clue words: ${sentence.groups.map((g) => `“${g}”`).join(', ')}.`,
      lit.size ? `You highlighted ${found} of ${clueIdx.length} clue words${extra ? ` (and ${extra} extra)` : ''}.` : 'Tip: highlight the clue words next time.',
      ...wrap(TYPE_TEXT[sentence.types[0]], 66),
    ];
  } else if (wrong.length) {
    title = 'Not yet. Reread your clue words.';
    lines = ['Does that meaning fit with the clues? Try another.'];
  }

  return (
    <SceneSvg label={`Context clue sentence about the word ${sentence.word}`}>
      <text x={40} y={50} fontSize={20} fontWeight={700} fill={C.ink}>
        Drag the highlighter over the clue words, then pick the meaning.
      </text>

      <rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={20} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      {boxes.map((b, i) => {
        const t = sentence.tokens[i];
        const on = lit.has(i);
        return (
          <g key={`${index}-${i}`}>
            {on && <rect x={b.x - 4} y={b.y - 32} width={b.w + 8} height={42} rx={8} fill="#fde68a" className="rw-glow" />}
            {solved && t.clue >= 0 && <rect x={b.x - 2} y={b.y + 8} width={b.w + 4} height={5} rx={2} fill={C.green} />}
            <text x={b.x} y={b.y} fontSize={FONT} fontWeight={t.target ? 800 : 500} fill={t.target ? C.purple : C.ink}>
              {t.text}
            </text>
            {t.target && <rect x={b.x} y={b.y + 8} width={b.w - 8} height={3} rx={1.5} fill={C.purple} />}
          </g>
        );
      })}
      {/* Highlighter surface over the sentence */}
      <rect {...drag} x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} fill="transparent" style={{ ...drag.style, cursor: 'text' }} aria-label="Sentence. Drag across words to highlight them" />

      {options.map((o, i) => (
        <SvgButton
          key={`${index}-${o}`}
          x={40 + i * 320}
          y={288}
          w={280}
          h={60}
          fontSize={o.length > 18 ? 15 : 18}
          label={o}
          color={solved && o === sentence.meaning ? shade(C.green, 0.6) : wrong.includes(o) ? '#eeeeee' : C.card}
          disabled={wrong.includes(o)}
          onClick={() => choose(o)}
        />
      ))}

      <rect x={40} y={380} width={720} height={190} rx={18} fill={solved ? shade(C.green, 0.85) : shade(C.yellow, 0.82)} stroke={C.line} strokeWidth={2} />
      <text x={64} y={416} fontSize={21} fontWeight={700} fill={C.ink}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={64} y={450 + i * 26} fontSize={17} fill={C.ink2}>
          {line}
        </text>
      ))}

      <SvgButton x={790} y={380} w={170} h={50} fontSize={17} label="Read it" onClick={() => speak(sentence.plain, { force: true })} />
      <SvgButton x={790} y={448} w={170} h={50} fontSize={17} label="Clear" onClick={() => setLit(new Set())} />
      <SvgButton x={790} y={516} w={170} h={54} fontSize={18} label="Next sentence" color={solved ? C.yellow : C.card} onClick={next} />

      {(['definition', 'example', 'contrast'] as ClueType[]).map((t, i) => {
        const on = solved && sentence.types.includes(t);
        return (
          <g key={t}>
            <rect x={40 + i * 310} y={596} width={290} height={56} rx={14} fill={on ? shade(C.purple, 0.75) : C.card} stroke={on ? C.purple : C.line} strokeWidth={2} />
            <text x={60 + i * 310} y={622} fontSize={17} fontWeight={700} fill={C.ink}>
              {TYPE_NAME[t]} clue
            </text>
            <text x={60 + i * 310} y={642} fontSize={13} fill={C.ink2}>
              {t === 'definition' ? 'says what it means' : t === 'example' ? 'gives examples' : 'tells the opposite'}
            </text>
          </g>
        );
      })}

      <Callout at={[160, 122]} box={[600, 4]} w={260} icon={Highlighter} title="Highlight the clues" text="Drag across the words that help explain the purple word." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={18} width={108} height={44} rx={10} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <rect x={44} y={28} width={40} height={14} rx={4} fill="#fde68a" />
      <text x={14} y={39} fontSize={11} fontWeight={800} fill={C.purple}>arid</text>
      <text x={46} y={39} fontSize={10} fill={C.ink}>no rain</text>
      <text x={14} y={56} fontSize={10} fill={C.ink2}>= very dry</text>
      <path d="M92 62 l14 -30 l8 4 l-14 30 z" fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

/** Short phrases from the sentence that are not clues and not the word itself. */
function nonClueChunks(p: Parsed): string[] {
  const chunks: string[] = [];
  let run: string[] = [];
  const flush = () => {
    for (let i = 0; i + 1 < run.length; i += 3) {
      const piece = run.slice(i, i + 3);
      if (piece.length >= 2) chunks.push(strip(piece.join(' ')));
    }
    run = [];
  };
  for (const t of p.tokens) {
    if (t.target || t.clue >= 0) flush();
    else run.push(strip(t.text));
  }
  flush();
  return [...new Set(chunks)].filter((c) => !p.groups.includes(c));
}

function meaningQuestion(p: Parsed): Question {
  return {
    prompt: `What does “${p.word}” mean in this sentence?`,
    visual: <Passage text={marked(p)} />,
    choices: shuffle([p.meaning, ...p.wrong]).map((value) => ({ value })),
    answer: p.meaning,
    hint: 'Find the words around it that explain or describe it.',
    explain: [
      `The clue words are ${p.groups.map((g) => `“${g}”`).join(' and ')}.`,
      `Those clues describe something ${p.meaning}.`,
      `So ${p.word} means “${p.meaning}”.`,
    ],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return meaningQuestion(pick(PARSED));
  if (level === 1) {
    const p = pick(PARSED);
    const clue = pick(p.groups);
    const distractors = shuffle(nonClueChunks(p)).slice(0, 2);
    return {
      prompt: `Which words are the best clue to what “${p.word}” means?`,
      visual: <Passage text={marked(p)} />,
      choices: shuffle([clue, ...distractors]).map((value) => ({ value })),
      answer: clue,
      hint: 'Which words would still help if the hard word were covered up?',
      explain: [
        `${p.word} means “${p.meaning}”.`,
        `“${clue}” tells you about that meaning.`,
        `So the best clue is “${clue}”.`,
      ],
    };
  }
  if (Math.random() < 0.5) {
    const p = pick([...PARSED, ...PARSED_HARD].filter((s) => s.types.length === 1));
    const t = p.types[0];
    return {
      prompt: `What kind of context clue helps you work out “${p.word}”?`,
      visual: <Passage text={marked(p)} />,
      choices: (['definition', 'example', 'contrast'] as ClueType[]).map((c) => ({ value: TYPE_NAME[c] })),
      answer: TYPE_NAME[t],
      hint: 'Does the sentence say what it means, give examples, or tell you the opposite?',
      explain: [`The clue words are ${p.groups.map((g) => `“${g}”`).join(' and ')}.`, TYPE_TEXT[t], `So it is a ${TYPE_NAME[t].toLowerCase()} clue.`],
    };
  }
  return meaningQuestion(pick(PARSED_HARD));
}

export const contextClues: Lesson = {
  id: 'context-clues',
  title: 'Context Clues',
  Thumb,
  Scene: ContextScene,
  sceneHint: 'Drag across clue words to highlight · Then pick the meaning',
  learn: {
    heading: 'Context clues',
    intro:
      'When you meet a word you don’t know, the words around it (its context) often give you clues. Good readers hunt for those clues before reaching for a dictionary.',
    points: [
      { icon: Search, text: 'A definition clue tells you what the word means: “arid, getting almost no rain”.' },
      { icon: Lightbulb, text: 'An example clue lists examples: “treacherous: loose rocks, steep drops…”.' },
      { icon: Highlighter, text: 'A contrast clue tells you the opposite: “elated, not sad at all”.' },
    ],
  },
  steps: [
    'Read the whole sentence, not just the hard word.',
    'Find the words that explain, show examples of, or contrast with the hard word.',
    'Make a guess at the meaning.',
    'Put your meaning in place of the word and check the sentence still makes sense.',
  ],
  example: {
    question: 'What does “arid” mean?',
    visual: <Passage text="The desert is *arid*, getting almost no rain all year." />,
    work: ['The clue words are “almost no rain all year”.', 'A place with almost no rain is very dry.', 'Check: “The desert is very dry” makes sense.'],
    answer: 'Arid means very dry.',
  },
  grownups: [
    'When reading together, pause on an unfamiliar word and ask “what clues are nearby?” before telling the meaning.',
    'Context clues don’t always work. If there are no clues, a dictionary is the right tool; praise knowing when to use one.',
    'The habit of swapping the meaning back into the sentence is the best check.',
  ],
  makeQuestion,
};
