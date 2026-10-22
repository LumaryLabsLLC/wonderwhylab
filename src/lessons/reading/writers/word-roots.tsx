import { useState } from 'react';
import { BookA, Puzzle, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragChip, inRect } from './visuals/DragChip';
import type { Rect } from './visuals/DragChip';
import { Passage } from './visuals/Passage';
import './writers.css';

type Origin = 'greek' | 'latin' | 'ending';

interface Piece {
  id: string;
  text: string;
  meaning: string;
  origin: Origin;
}

const ROOTS: Piece[] = [
  { id: 'tele', text: 'tele', meaning: 'far', origin: 'greek' },
  { id: 'micro', text: 'micro', meaning: 'small', origin: 'greek' },
  { id: 'bio', text: 'bio', meaning: 'life', origin: 'greek' },
  { id: 'graph', text: 'graph', meaning: 'write or draw', origin: 'greek' },
  { id: 'scope', text: 'scope', meaning: 'look at', origin: 'greek' },
  { id: 'logy', text: 'logy', meaning: 'study of', origin: 'greek' },
  { id: 'aqua', text: 'aqua', meaning: 'water', origin: 'latin' },
  { id: 'port', text: 'port', meaning: 'carry', origin: 'latin' },
  { id: 'struct', text: 'struct', meaning: 'build', origin: 'latin' },
  { id: 'dict', text: 'dict', meaning: 'say', origin: 'latin' },
  { id: 'spect', text: 'spect', meaning: 'look', origin: 'latin' },
];

const ENDINGS: Piece[] = [
  { id: '-able', text: '-able', meaning: 'can be', origin: 'ending' },
  { id: '-er', text: '-er', meaning: 'a person who', origin: 'ending' },
  { id: '-ator', text: '-ator', meaning: 'a person who', origin: 'ending' },
  { id: '-ure', text: '-ure', meaning: 'the result of', origin: 'ending' },
  { id: '-ate', text: '-ate', meaning: 'to do', origin: 'ending' },
  { id: '-ion', text: '-ion', meaning: 'the act or way of', origin: 'ending' },
  { id: '-rium', text: '-rium', meaning: 'a place for', origin: 'ending' },
  { id: '-y', text: '-y', meaning: 'makes a noun', origin: 'ending' },
];

const PIECES: Record<string, Piece> = Object.fromEntries([...ROOTS, ...ENDINGS].map((p) => [p.id, p]));

interface Word {
  parts: string[];
  word: string;
  meaning: string;
}

const WORDS: Word[] = [
  { parts: ['tele', 'scope'], word: 'telescope', meaning: 'a tool for looking at things far away' },
  { parts: ['micro', 'scope'], word: 'microscope', meaning: 'a tool for looking at very small things' },
  { parts: ['tele', 'graph'], word: 'telegraph', meaning: 'an old machine for sending written messages far away' },
  { parts: ['micro', 'graph'], word: 'micrograph', meaning: 'a picture taken through a microscope' },
  { parts: ['tele', 'port'], word: 'teleport', meaning: 'to carry something far away in an instant (in stories)' },
  { parts: ['bio', 'logy'], word: 'biology', meaning: 'the study of living things' },
  { parts: ['micro', 'bio', 'logy'], word: 'microbiology', meaning: 'the study of tiny living things, like bacteria' },
  { parts: ['bio', 'graph', '-y'], word: 'biography', meaning: 'the written story of a person’s life' },
  { parts: ['port', '-able'], word: 'portable', meaning: 'easy to carry' },
  { parts: ['port', '-er'], word: 'porter', meaning: 'a person who carries bags' },
  { parts: ['aqua', '-rium'], word: 'aquarium', meaning: 'a tank of water for keeping fish' },
  { parts: ['struct', '-ure'], word: 'structure', meaning: 'something that has been built' },
  { parts: ['dict', '-ate'], word: 'dictate', meaning: 'to say words for someone else to write' },
  { parts: ['dict', '-ion'], word: 'diction', meaning: 'the way a person says words' },
  { parts: ['spect', '-ator'], word: 'spectator', meaning: 'a person who watches' },
];

const key = (parts: string[]) => parts.join('+');
const spell = (parts: string[]) => parts.map((p) => PIECES[p].text.replace('-', '')).join('');

const ORIGIN_FILL: Record<Origin, string> = {
  greek: shade(C.blue, 0.72),
  latin: shade(C.orange, 0.65),
  ending: shade(C.green, 0.7),
};

// Layout (world units).
const SLOT_X = [270, 500, 730];
const SLOT: Rect = { x: 0, y: 300, w: 190, h: 72 };
const slotRect = (i: number): Rect => ({ x: SLOT_X[i] - SLOT.w / 2, y: SLOT.y, w: SLOT.w, h: SLOT.h });

function rootHome(i: number): Pt {
  if (i < 6) return { x: 120 + i * 140, y: 118 };
  return { x: 190 + (i - 6) * 140, y: 180 };
}

const endingHome = (i: number): Pt => ({ x: 108 + i * 112, y: 246 });

function WordRootsScene() {
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [found, setFound] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const filled = slots.filter((s): s is string => s !== null);
  const contiguous = slots.indexOf(null) === -1 || slots.slice(slots.indexOf(null)).every((s) => s === null);
  const match = contiguous ? WORDS.find((w) => key(w.parts) === key(filled)) : undefined;
  const isPrefix = contiguous && WORDS.some((w) => key(w.parts.slice(0, filled.length)) === key(filled));

  const update = (next: (string | null)[]) => {
    setSlots(next);
    const parts = next.filter((s): s is string => s !== null);
    const hit = WORDS.find((w) => key(w.parts) === key(parts));
    if (hit && !found.includes(hit.word)) {
      setFound([...found, hit.word]);
      play('correct');
    } else play('pop');
  };

  const putInSlot = (id: string, i: number) => {
    const next = [...slots];
    next[i] = id;
    update(next);
    setSelected(null);
  };

  const putNext = (id: string) => {
    const i = slots.indexOf(null);
    putInSlot(id, i === -1 ? 2 : i);
  };

  const onDrop = (id: string, c: Pt) => {
    const i = SLOT_X.findIndex((_, k) => inRect(c, slotRect(k)));
    if (i >= 0) putInSlot(id, i);
  };

  const onTap = (id: string) => {
    if (selected === id) putNext(id);
    else {
      setSelected(id);
      play('tap');
    }
  };

  const tapSlot = (i: number) => {
    if (selected) putInSlot(selected, i);
    else if (slots[i]) {
      const next = [...slots];
      next[i] = null;
      update(next);
    }
  };

  let resultTitle = 'Drag roots into the boxes';
  let resultText = 'Each root carries a meaning. Put two or three together to build a real word.';
  if (match) {
    resultTitle = `${match.word}!`;
    resultText = `${match.parts.map((p) => `${PIECES[p].text} = ${PIECES[p].meaning}`).join(' + ')}  →  ${match.meaning}`;
  } else if (filled.length >= 2 && !isPrefix) {
    resultTitle = `“${spell(filled)}” isn’t a word we know`;
    resultText = 'Not yet a real word. Try swapping one piece.';
  } else if (filled.length > 0) {
    resultTitle = spell(filled) + '…';
    resultText = 'Keep building: add another root or an ending.';
  }

  const chip = (p: Piece, home: Pt, w: number) => (
    <DragChip
      key={p.id}
      x={home.x}
      y={home.y}
      w={w}
      h={50}
      lines={[p.text]}
      label={`${p.text}, means ${p.meaning}`}
      fontSize={20}
      fill={ORIGIN_FILL[p.origin]}
      selected={selected === p.id}
      onDrop={(c) => onDrop(p.id, c)}
      onTap={() => onTap(p.id)}
    />
  );

  return (
    <SceneSvg label="Word builder with Greek and Latin roots">
      <text x={60} y={58} fontSize={20} fontWeight={700} fill={C.ink}>
        Snap roots together to build real words.
      </text>
      <g>
        <rect x={700} y={42} width={22} height={22} rx={6} fill={ORIGIN_FILL.greek} stroke={C.ink} strokeWidth={1.5} />
        <text x={730} y={58} fontSize={15} fill={C.ink2}>Greek</text>
        <rect x={790} y={42} width={22} height={22} rx={6} fill={ORIGIN_FILL.latin} stroke={C.ink} strokeWidth={1.5} />
        <text x={820} y={58} fontSize={15} fill={C.ink2}>Latin</text>
        <rect x={870} y={42} width={22} height={22} rx={6} fill={ORIGIN_FILL.ending} stroke={C.ink} strokeWidth={1.5} />
        <text x={900} y={58} fontSize={15} fill={C.ink2}>Ending</text>
      </g>

      {/* Builder rail */}
      <rect x={150} y={286} width={700} height={124} rx={20} fill={shade(C.paper, 0.4)} stroke={C.line} strokeWidth={2} />
      {SLOT_X.map((sx, i) => {
        const id = slots[i];
        const r = slotRect(i);
        const piece = id ? PIECES[id] : null;
        return (
          <g key={i} onClick={() => tapSlot(i)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={piece ? `Box ${i + 1}: ${piece.text}. Tap to remove` : `Empty box ${i + 1}`}>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={14}
              fill={piece ? ORIGIN_FILL[piece.origin] : C.card}
              stroke={piece ? C.ink : C.line}
              strokeWidth={piece ? 2.5 : 2}
              strokeDasharray={piece ? undefined : '8 6'}
            />
            <text x={sx} y={r.y + 38} textAnchor="middle" dominantBaseline="central" fontSize={piece ? 28 : 18} fontWeight={700} fill={piece ? C.ink : C.muted}>
              {piece ? piece.text : i === 2 ? 'ending?' : 'root'}
            </text>
            <text x={sx} y={r.y + r.h + 22} textAnchor="middle" fontSize={16} fill={C.ink2}>
              {piece ? `= ${piece.meaning}` : ''}
            </text>
            {i < 2 && (
              <text x={sx + 115} y={r.y + 38} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill={C.muted}>
                +
              </text>
            )}
          </g>
        );
      })}

      {/* Result */}
      <rect x={150} y={432} width={700} height={108} rx={18} fill={match ? shade(C.green, 0.82) : C.card} stroke={match ? C.green : C.line} strokeWidth={2.5} />
      <text x={174} y={466} fontSize={24} fontWeight={700} fill={C.ink}>
        {resultTitle}
      </text>
      {wrap(resultText, 70).map((line, i) => (
        <text key={i} x={174} y={498 + i * 22} fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}

      <SvgButton x={870} y={300} w={90} h={48} fontSize={16} label="Clear" onClick={() => update([null, null, null])} />
      <SvgButton x={870} y={432} w={90} h={48} fontSize={16} label="Say it" disabled={!match} onClick={() => match && speak(`${match.word}. ${match.meaning}.`, { force: true })} />

      {/* Words found */}
      <text x={60} y={574} fontSize={17} fontWeight={700} fill={C.ink}>
        Words found: {found.length} / {WORDS.length}
      </text>
      {wrap(found.length ? found.join(' · ') : 'Try tele + scope, or port + -able.', 92).map((line, i) => (
        <text key={i} x={60} y={602 + i * 22} fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}
      {found.length === WORDS.length && (
        <text x={60} y={652} fontSize={16} fontWeight={700} fill={C.green}>
          You built every word! Look for these roots in books you read.
        </text>
      )}

      {/* Pieces drawn last so they move above everything while dragging */}
      {ROOTS.map((p, i) => chip(p, rootHome(i), 118))}
      {ENDINGS.map((p, i) => chip(p, endingHome(i), 96))}

      <Callout at={[120, 118]} box={[40, 612]} w={250} icon={Puzzle} title="Roots are word parts" text="tele means far. Learn one root and you can unlock many words." />
      <Callout at={[270, 336]} box={[600, 612]} w={300} icon={Search} title="Read the meanings" text="Add the meanings together to work out the whole word." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={26} width={48} height={28} rx={8} fill={ORIGIN_FILL.greek} stroke={C.ink} strokeWidth={2} />
      <text x={30} y={41} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill={C.ink}>tele</text>
      <text x={60} y={41} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} fill={C.muted}>+</text>
      <rect x={66} y={26} width={48} height={28} rx={8} fill={ORIGIN_FILL.greek} stroke={C.ink} strokeWidth={2} />
      <text x={90} y={41} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={C.ink}>scope</text>
      <text x={60} y={70} textAnchor="middle" fontSize={11} fill={C.ink2}>far + look</text>
    </svg>
  );
}

/** Words that are not built in the scene, for using roots on new words. */
const NEW_WORDS: { word: string; split: string; meaning: string }[] = [
  { word: 'transport', split: 'trans (across) + port (carry)', meaning: 'to carry from one place to another' },
  { word: 'inspect', split: 'in (into) + spect (look)', meaning: 'to look closely at something' },
  { word: 'predict', split: 'pre (before) + dict (say)', meaning: 'to say what will happen before it happens' },
  { word: 'aquatic', split: 'aqua (water) + -tic (to do with)', meaning: 'living or growing in water' },
  { word: 'autograph', split: 'auto (self) + graph (write)', meaning: 'a person’s own written name' },
  { word: 'construct', split: 'con (together) + struct (build)', meaning: 'to build something' },
  { word: 'telephone', split: 'tele (far) + phone (sound)', meaning: 'a device for hearing voices from far away' },
  { word: 'export', split: 'ex (out) + port (carry)', meaning: 'to send goods out of a country' },
];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const root = pick(ROOTS);
    // "look" and "look at" are too close to be fair wrong answers for each other.
    const lookIds = ['scope', 'spect'];
    const others = shuffle(ROOTS.filter((r) => r.id !== root.id && !(lookIds.includes(root.id) && lookIds.includes(r.id)))).slice(0, 3);
    return {
      prompt: `What does the root “${root.text}” mean?`,
      choices: shuffle([root, ...others]).map((r) => ({ value: r.meaning })),
      answer: root.meaning,
      hint: 'Think of a word you already know that uses this root.',
      explain: [
        `“${root.text}” is a ${root.origin === 'greek' ? 'Greek' : 'Latin'} root.`,
        `It shows up in words like ${WORDS.filter((w) => w.parts.includes(root.id)).map((w) => w.word).slice(0, 2).join(' and ')}.`,
        `So “${root.text}” means “${root.meaning}”.`,
      ],
    };
  }
  if (level === 1) {
    if (Math.random() < 0.5) {
      const root = pick(ROOTS.filter((r) => r.id !== 'scope' && r.id !== 'spect'));
      const others = shuffle(ROOTS.filter((r) => r.id !== root.id)).slice(0, 3);
      return {
        prompt: `Which root means “${root.meaning}”?`,
        choices: shuffle([root, ...others]).map((r) => ({ value: r.text })),
        answer: root.text,
        hint: 'Say each root inside a word you know, then think about what it adds.',
        explain: [
          `Look for a word that has the meaning “${root.meaning}” in it.`,
          `${WORDS.find((w) => w.parts.includes(root.id))?.word ?? root.text} uses this root.`,
          `So the root is “${root.text}”.`,
        ],
      };
    }
    const word = pick(WORDS);
    const others = shuffle(WORDS.filter((w) => w.word !== word.word && w.meaning !== word.meaning)).slice(0, 3);
    return {
      prompt: `Use the roots. What does “${word.word}” mean?`,
      choices: shuffle([word, ...others]).map((w) => ({ value: w.meaning })),
      answer: word.meaning,
      hint: 'Split the word into its roots and add their meanings together.',
      explain: [
        `${word.word} = ${word.parts.map((p) => PIECES[p].text).join(' + ')}.`,
        `${word.parts.map((p) => `${PIECES[p].text} means ${PIECES[p].meaning}`).join('; ')}.`,
        `So ${word.word} means “${word.meaning}”.`,
      ],
    };
  }
  const w = pick(NEW_WORDS);
  const others = shuffle(NEW_WORDS.filter((o) => o.word !== w.word)).slice(0, 3);
  return {
    prompt: `What does “${w.word}” mean?`,
    visual: <Passage text={`New word: *${w.word}*  →  ${w.split}`} />,
    choices: shuffle([w, ...others]).map((o) => ({ value: o.meaning })),
    answer: w.meaning,
    hint: 'Read the meaning of each part, then put them together in a sentence.',
    explain: [`The parts are ${w.split}.`, 'Put the meanings together and make it sound like a real definition.', `So ${w.word} means “${w.meaning}”.`],
  };
}

export const wordRoots: Lesson = {
  id: 'word-roots',
  title: 'Greek and Latin Roots',
  Thumb,
  Scene: WordRootsScene,
  sceneHint: 'Drag roots into the boxes · Tap a box to empty it',
  learn: {
    heading: 'Greek and Latin roots',
    intro:
      'Many English words are built from old Greek and Latin parts called roots. If you know what the roots mean, you can work out words you have never seen before.',
    points: [
      { icon: Puzzle, text: 'A long word is often a few roots joined together: tele + scope.' },
      { icon: BookA, text: 'Each root has a meaning: tele means far, scope means look at.' },
      { icon: Search, text: 'Add the meanings up, then check the sentence still makes sense.' },
    ],
  },
  steps: [
    'Look for a root you know inside the long word.',
    'Split the word into its parts.',
    'Say what each part means.',
    'Put the meanings together into one idea, and check it fits the sentence.',
  ],
  example: {
    question: 'What does “microscope” mean?',
    visual: <Passage text="*micro* (small) + *scope* (look at)" />,
    work: ['Split it: micro + scope.', 'micro means small; scope means look at.', 'Small + look at = a tool for looking at very small things.'],
    answer: 'A microscope is a tool for looking at very small things.',
  },
  grownups: [
    'Go on a “root hunt” in a book or cereal box: how many words with port, graph or bio can you find?',
    'Roots are a strong strategy, but always check the meaning against the sentence: some words only look like they share a root.',
    'Greek roots are common in science words (bio, micro, logy); Latin roots are common in everyday words (port, dict, struct).',
  ],
  makeQuestion,
};
