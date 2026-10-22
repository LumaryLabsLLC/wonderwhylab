import { useState } from 'react';
import { CircleHelp, Megaphone, MessageSquareQuote, Rows3 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken, inside } from './visuals/DragToken';
import { SentencePicture, WordCard } from './visuals/Cards';
import { textWidth, useFontsReady } from './visuals/measure';

type Mark = '.' | '?' | '!' | ',' | '“' | '”';

const MARK_NAME: Record<Mark, string> = {
  '.': 'full stop',
  '?': 'question mark',
  '!': 'exclamation mark',
  ',': 'comma',
  '“': 'open speech marks',
  '”': 'close speech marks',
};

interface Slot {
  mark: Mark;
  /** Why this mark goes here (shown after a slip). */
  why: string;
}
type Token = string | Slot;

const s = (mark: Mark, why: string): Slot => ({ mark, why });
const END_STATEMENT = s('.', 'It tells us something, so it ends with a full stop.');
const LIST_COMMA = s(',', 'Commas go between the things in a list.');
const OPEN = s('“', 'Speech marks open just before the words someone says.');
const CLOSE = s('”', 'Speech marks close just after the spoken words.');
const SPEECH_COMMA = s(',', 'A comma goes before the closing speech marks when “said” comes next.');

/** Sentences in rough teaching order: end marks, then lists, then speech. */
const SENTENCES: Token[][] = [
  ['Where', 'is', 'my', 'red', 'hat', s('?', 'It asks something, so it ends with a question mark.')],
  ['Watch', 'out', 'for', 'the', 'big', 'wave', s('!', 'It is a warning shout, so it ends with an exclamation mark.')],
  ['The', 'sun', 'rose', 'over', 'the', 'hills', END_STATEMENT],
  ['We', 'packed', 'apples', LIST_COMMA, 'bread', LIST_COMMA, 'cheese', 'and', 'juice', END_STATEMENT],
  ['At', 'the', 'pond', 'I', 'saw', 'ducks', LIST_COMMA, 'frogs', 'and', 'a', 'heron', END_STATEMENT],
  [OPEN, 'Let’s', 'go', 'to', 'the', 'park', SPEECH_COMMA, CLOSE, 'said', 'Ava', END_STATEMENT],
  [OPEN, 'Can', 'we', 'stay', 'up', 'late', s('?', 'The spoken words ask a question, so a question mark goes inside the speech marks.'), CLOSE, 'asked', 'Leo', END_STATEMENT],
];

const MARKS: Mark[] = ['.', '?', '!', ',', '“', '”'];

const isSlot = (t: Token): t is Slot => typeof t !== 'string';
const sentenceText = (tokens: Token[], filled = true) =>
  tokens
    .map((t, i) => {
      if (!isSlot(t)) {
        const prev = tokens[i - 1];
        return (i > 0 && !(prev && isSlot(prev) && prev.mark === '“') ? ' ' : '') + t;
      }
      if (!filled) return '';
      return t.mark === '“' ? (i > 0 ? ` ${t.mark}` : t.mark) : t.mark;
    })
    .join('')
    .trim();

// ───────────────────────── Scene ─────────────────────────

const FS = 30;
const SLOT_W = 46;
const wordW = (w: string) => textWidth(w, FS);

function layout(tokens: Token[]) {
  const maxW = 900;
  const rows: { t: Token; x: number; w: number; i: number; row: number }[] = [];
  let x = 0;
  let row = 0;
  tokens.forEach((t, i) => {
    const w = isSlot(t) ? SLOT_W : wordW(t);
    const gap = isSlot(t) || (i > 0 && isSlot(tokens[i - 1]) && (tokens[i - 1] as Slot).mark === '“') ? 6 : 12;
    if (x > 0 && x + gap + w > maxW && !isSlot(t)) {
      row += 1;
      x = 0;
    }
    x += x > 0 ? gap : 0;
    rows.push({ t, x, w, i, row });
    x += w;
  });
  const widths = Array.from({ length: row + 1 }, (_, r) => Math.max(...rows.filter((p) => p.row === r).map((p) => p.x + p.w)));
  return rows.map((p) => ({ ...p, x: 500 - widths[p.row] / 2 + p.x, y: 150 + p.row * 92 }));
}

function PunctuationScene() {
  useFontsReady();
  const [index, setIndex] = useState(0);
  const tokens = SENTENCES[index % SENTENCES.length];
  const [filled, setFilled] = useState<Record<number, Mark>>({});
  const [selected, setSelected] = useState<Mark | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [message, setMessage] = useState('Drag the right mark into each empty box. You can also tap a mark, then tap a box.');
  const placed = layout(tokens);
  const slots = placed.filter((p) => isSlot(p.t));
  const done = slots.every((p) => filled[p.i]);

  const load = (i: number) => {
    setIndex(i);
    setFilled({});
    setSelected(null);
    setMisses({});
    setMessage('Drag the right mark into each empty box.');
  };

  const place = (slotIndex: number, mark: Mark) => {
    const slot = tokens[slotIndex] as Slot;
    if (filled[slotIndex]) return;
    if (slot.mark === mark) {
      play('pop');
      const next = { ...filled, [slotIndex]: mark };
      setFilled(next);
      setSelected(null);
      const left = slots.filter((p) => !next[p.i]).length;
      if (left === 0) {
        play('complete');
        setMessage(`Well punctuated! ${slot.why}`);
      } else setMessage(`Yes, a ${MARK_NAME[mark]}. ${slot.why}`);
    } else {
      play('wrong');
      const m = (misses[slotIndex] ?? 0) + 1;
      setMisses({ ...misses, [slotIndex]: m });
      setShake({ ...shake, [mark]: (shake[mark] ?? 0) + 1 });
      setMessage(m >= 2 ? `Here’s how: ${slot.why} Use the ${MARK_NAME[slot.mark]}.` : `Not a ${MARK_NAME[mark]} here. Read the sentence: what is it doing?`);
    }
  };

  const slotAt = (pt: { x: number; y: number }) => slots.find((p) => inside(pt, { x: p.x - 6, y: p.y - 40, w: p.w + 12, h: 80 }));

  return (
    <SceneSvg label="Punctuation: drag marks into the sentence">
      <text x={40} y={40} fontSize={15} fill={C.muted} className="caps">
        Fix the sentence
      </text>
      <SvgButton x={760} y={20} w={200} h={50} fontSize={17} label="Read it to me" onClick={() => speak(sentenceText(tokens, true), { force: true })} />

      <rect x={30} y={96} width={940} height={placed.some((p) => p.row > 0) ? 200 : 110} rx={22} fill={shade(C.yellow, 0.82)} stroke={C.line} strokeWidth={2} />
      {placed.map((p) => {
        if (!isSlot(p.t)) {
          return (
            <text key={p.i} x={p.x} y={p.y} dominantBaseline="central" fontSize={FS} fontWeight={600} fill={C.ink}>
              {p.t}
            </text>
          );
        }
        const mark = filled[p.i];
        return (
          <g
            key={p.i}
            onClick={() => selected && place(p.i, selected)}
            style={{ cursor: selected && !mark ? 'pointer' : undefined }}
            data-nopan={selected ? true : undefined}
            role="button"
            aria-label={mark ? MARK_NAME[mark] : 'Empty punctuation box'}
          >
            <rect
              x={p.x}
              y={p.y - 32}
              width={p.w}
              height={64}
              rx={10}
              fill={mark ? shade(C.green, 0.75) : C.white}
              stroke={mark ? C.ink : selected ? shade(C.orange, -0.2) : C.ink2}
              strokeWidth={2.5}
              strokeDasharray={mark ? undefined : '7 6'}
            />
            {mark && (
              <text x={p.x + p.w / 2} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={800} fill={C.ink} className="pop-in">
                {mark}
              </text>
            )}
          </g>
        );
      })}

      <text x={40} y={352} fontSize={15} fill={C.muted} className="caps">
        Punctuation marks
      </text>
      {MARKS.map((m, i) => {
        const x = 110 + i * 150;
        return (
          <g key={m}>
            <DragToken
              x={x}
              y={428}
              label={MARK_NAME[m]}
              selected={selected === m}
              shakeKey={shake[m] ?? 0}
              onTap={() => {
                play('tap');
                setSelected(selected === m ? null : m);
              }}
              onDrop={(pt) => {
                const hit = slotAt(pt);
                if (hit) place(hit.i, m);
              }}
            >
              <WordCard w={84} h={84} fontSize={48} parts={[{ t: m, bold: true }]} state={selected === m ? 'selected' : 'idle'} />
            </DragToken>
            <text x={x} y={496} textAnchor="middle" fontSize={15} fill={C.ink2}>
              {MARK_NAME[m]}
            </text>
          </g>
        );
      })}

      {wrap(message, 90).map((line, i) => (
        <text key={i} x={500} y={556 + i * 24} textAnchor="middle" fontSize={17} fill={C.ink2}>
          {line}
        </text>
      ))}
      {done && <SvgButton x={400} y={606} w={200} h={52} fontSize={18} label="Next sentence" color={C.teal} textColor={C.white} onClick={() => load(index + 1)} />}

      <Callout at={[260, 388]} box={[60, 234]} w={260} icon={CircleHelp} title="End marks" text=". tells, ? asks, ! shows a strong feeling or a warning." />
      <Callout at={[860, 388]} box={[680, 234]} w={260} icon={MessageSquareQuote} title="Speech marks" text="They go around the exact words someone says." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={12} width={108} height={28} rx={7} fill={shade(C.yellow, 0.8)} stroke={C.ink} strokeWidth={1.5} />
      <text x={14} y={31} fontSize={12} fontWeight={700} fill={C.ink}>
        Is it time
      </text>
      <rect x={82} y={16} width={22} height={20} rx={4} fill={shade(C.green, 0.75)} stroke={C.ink} strokeWidth={1.2} />
      <text x={93} y={31} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.ink}>
        ?
      </text>
      {['.', '!', ','].map((m, i) => (
        <g key={m}>
          <rect x={20 + i * 30} y={50} width={22} height={22} rx={5} fill={C.white} stroke={C.ink} strokeWidth={1.2} />
          <text x={31 + i * 30} y={66} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.ink}>
            {m}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const END_ITEMS: { text: string; mark: '.' | '?' | '!'; why: string }[] = [
  { text: 'Where is my red hat', mark: '?', why: 'It asks something.' },
  { text: 'How many legs does a spider have', mark: '?', why: 'It asks something.' },
  { text: 'Can you help me carry this box', mark: '?', why: 'It asks something.' },
  { text: 'Watch out for the big wave', mark: '!', why: 'It is a warning shout.' },
  { text: 'Hooray, we won the match', mark: '!', why: 'It shows a strong feeling.' },
  { text: 'Look out, the pan is hot', mark: '!', why: 'It is a warning shout.' },
  { text: 'The sun rose over the hills', mark: '.', why: 'It tells us something.' },
  { text: 'My cat sleeps on the windowsill', mark: '.', why: 'It tells us something.' },
  { text: 'We planted beans in the garden', mark: '.', why: 'It tells us something.' },
];

const LIST_ITEMS: { right: string; wrong: [string, string] }[] = [
  { right: 'We packed apples, bread, cheese and juice.', wrong: ['We packed apples bread cheese and juice.', 'We packed, apples, bread cheese and juice.'] },
  { right: 'At the zoo we saw lions, zebras, giraffes and monkeys.', wrong: ['At the zoo we saw lions zebras giraffes and monkeys.', 'At the zoo we saw, lions, zebras giraffes and monkeys.'] },
  { right: 'Mix the flour, sugar, eggs and milk.', wrong: ['Mix the flour sugar eggs and milk.', 'Mix, the flour sugar, eggs and milk.'] },
  { right: 'My bag holds pens, pencils, a ruler and a book.', wrong: ['My bag holds pens pencils a ruler and a book.', 'My bag, holds pens pencils, a ruler and a book.'] },
];

const SPEECH_ITEMS: { right: string; wrong: [string, string]; why: string }[] = [
  { right: '“Let’s go to the park,” said Ava.', wrong: ['“Let’s go to the park, said Ava.”', 'Let’s go to the park,” said Ava.'], why: 'The speech marks go around only the words Ava says.' },
  { right: '“Can we stay up late?” asked Leo.', wrong: ['“Can we stay up late,” asked Leo?', '“Can we stay up late” asked Leo?'], why: 'The question mark belongs to Leo’s question, so it goes inside the speech marks.' },
  { right: '“Pass me the paint,” said Mia.', wrong: ['“Pass me the paint” said Mia.', 'Pass me the “paint,” said Mia.'], why: 'The speech marks hug the exact spoken words, with a comma before they close.' },
  { right: '“Wow, look at that rainbow!” shouted Sam.', wrong: ['“Wow, look at that rainbow” shouted Sam!', 'Wow, look at that “rainbow!” shouted Sam.'], why: 'The exclamation mark belongs to Sam’s words, so it goes inside the speech marks.' },
];

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const item = pick(END_ITEMS);
    return {
      prompt: 'Which mark goes at the end?',
      speak: `${item.text}. Which mark goes at the end?`,
      visual: <SentencePicture text={`${item.text} __`} />,
      choices: shuffle<Mark>(['.', '?', '!']).map((m) => ({ value: m, name: MARK_NAME[m] })),
      answer: item.mark,
      hint: 'Does the sentence tell, ask, or show a strong feeling?',
      explain: [`“${item.text}”: ${item.why.toLowerCase()}`, `So it needs a ${MARK_NAME[item.mark]}: ${item.mark}`],
    };
  }
  if (level === 1) {
    const item = pick(LIST_ITEMS);
    return {
      prompt: 'Which sentence uses commas correctly?',
      choices: shuffle([item.right, ...item.wrong]).map((value) => ({ value })),
      answer: item.right,
      hint: 'Commas go between the things in a list. Is there one before “and”?',
      explain: ['Find the list of things.', 'Put a comma between each thing, and “and” before the last one.', `The right one is: ${item.right}`],
    };
  }
  const item = pick(SPEECH_ITEMS);
  return {
    prompt: 'Which sentence uses speech marks correctly?',
    choices: shuffle([item.right, ...item.wrong]).map((value) => ({ value })),
    answer: item.right,
    hint: 'Find the exact words someone says. The speech marks go around just those words.',
    explain: [item.why, `The right one is: ${item.right}`],
  };
}

export const punctuation: Lesson = {
  id: 'punctuation',
  title: 'Punctuation Power',
  Thumb,
  Scene: PunctuationScene,
  sceneHint: 'Drag each mark into a box · Or tap a mark, then a box',
  learn: {
    heading: 'Punctuation power',
    intro:
      'Punctuation marks are like road signs for readers. They tell us where to stop, when someone is asking, and who is speaking.',
    points: [
      { icon: CircleHelp, text: 'A full stop ends a telling sentence; ? ends a question.' },
      { icon: Megaphone, text: '! shows a strong feeling or a warning.' },
      { icon: Rows3, text: 'Commas go between the things in a list: apples, bread and cheese.' },
      { icon: MessageSquareQuote, text: 'Speech marks go around the exact words someone says.' },
    ],
  },
  steps: [
    'Read the sentence out loud.',
    'Ask: does it tell, ask, or shout? Choose the end mark.',
    'Is there a list? Put commas between the things, with “and” before the last one.',
    'Is someone speaking? Put speech marks around their exact words, with the comma, ? or ! inside.',
  ],
  example: {
    question: 'Punctuate: can we stay up late asked Leo',
    work: ['Leo’s exact words are “Can we stay up late”.', 'They ask a question, so the question mark goes inside the speech marks.', 'The whole sentence ends with a full stop after Leo.'],
    answer: '“Can we stay up late?” asked Leo.',
  },
  grownups: [
    'Read a sentence twice, once with the punctuation and once ignoring it, and talk about how it changes the meaning.',
    'Some writers use a comma before “and” in a list (the Oxford comma). Both styles are fine; this lesson uses the simpler school style.',
    'In some countries speech marks are called quotation marks, and single marks (‘ ’) are also correct.',
  ],
  makeQuestion,
};
