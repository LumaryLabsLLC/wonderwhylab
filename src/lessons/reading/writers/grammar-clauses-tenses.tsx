import { useState } from 'react';
import { Clock, GitMerge, History, Link } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { textWidth, useFontsReady } from '../readers/visuals/measure';
import { DragChip, inRect } from './visuals/DragChip';
import type { Rect } from './visuals/DragChip';
import { Passage } from './visuals/Passage';
import './writers.css';

// ───────────────────────── Data ─────────────────────────

interface Join {
  main: string;
  /** The main clause as it reads after a comma (keeps names and “I” capitalised). */
  mainMid: string;
  sub: string;
  options: [string, string, string];
  answer: string;
  why: string;
}

const JOINS: Join[] = [
  { main: 'We stayed inside', mainMid: 'we stayed inside', sub: 'it was raining', options: ['because', 'although', 'unless'], answer: 'because', why: 'The rain is the reason we stayed in.' },
  { main: 'I finished my homework', mainMid: 'I finished my homework', sub: 'I went out to play', options: ['before', 'because', 'although'], answer: 'before', why: 'Homework came first, then playing.' },
  { main: 'Mia kept running', mainMid: 'Mia kept running', sub: 'she was tired', options: ['although', 'because', 'if'], answer: 'although', why: 'Being tired could have stopped her, but it didn’t.' },
  { main: 'I will call you', mainMid: 'I will call you', sub: 'the bus arrives', options: ['when', 'although', 'because'], answer: 'when', why: 'The call happens at the time the bus arrives.' },
  { main: 'You can borrow my book', mainMid: 'you can borrow my book', sub: 'you promise to return it', options: ['if', 'although', 'until'], answer: 'if', why: 'Borrowing the book depends on the promise.' },
];

type When = 'past' | 'present' | 'future';

interface TenseItem {
  before: string;
  after: string;
  clue: string;
  when: When;
  options: { text: string; when: When }[];
  answer: string;
}

const TENSES: TenseItem[] = [
  {
    before: 'Yesterday, I',
    after: 'to the park.',
    clue: 'Yesterday',
    when: 'past',
    options: [{ text: 'walked', when: 'past' }, { text: 'walk', when: 'present' }, { text: 'will walk', when: 'future' }],
    answer: 'walked',
  },
  {
    before: 'Tomorrow, we',
    after: 'a cake.',
    clue: 'Tomorrow',
    when: 'future',
    options: [{ text: 'baked', when: 'past' }, { text: 'will bake', when: 'future' }, { text: 'have baked', when: 'past' }],
    answer: 'will bake',
  },
  {
    before: 'Right now, Dad',
    after: 'the dog.',
    clue: 'Right now',
    when: 'present',
    options: [{ text: 'is walking', when: 'present' }, { text: 'walked', when: 'past' }, { text: 'will walk', when: 'future' }],
    answer: 'is walking',
  },
  {
    before: 'Last summer, they',
    after: 'in the sea.',
    clue: 'Last summer',
    when: 'past',
    options: [{ text: 'swim', when: 'present' }, { text: 'swam', when: 'past' }, { text: 'will swim', when: 'future' }],
    answer: 'swam',
  },
  {
    before: 'Next week, Grandma',
    after: 'us.',
    clue: 'Next week',
    when: 'future',
    options: [{ text: 'visited', when: 'past' }, { text: 'will visit', when: 'future' }, { text: 'has visited', when: 'past' }],
    answer: 'will visit',
  },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ───────────────────────── Scene: join clauses ─────────────────────────

const FS = 22;

function JoinMode({ item }: { item: Join }) {
  const [tray] = useState(() => shuffle(item.options));
  const [conj, setConj] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState('Drag the joining word that makes the two clauses fit together.');

  const segs = flipped
    ? [
        { kind: 'conj' as const, text: cap(conj ?? '') },
        { kind: 'sub' as const, text: `${item.sub},` },
        { kind: 'main' as const, text: `${item.mainMid}.` },
      ]
    : [
        { kind: 'main' as const, text: item.main },
        { kind: 'conj' as const, text: conj ?? '' },
        { kind: 'sub' as const, text: `${item.sub}.` },
      ];
  const widths = segs.map((s) => (s.kind === 'conj' ? Math.max(150, textWidth(s.text, FS, 700) + 32) : textWidth(s.text, FS, 500) + 32));
  const total = widths.reduce((a, b) => a + b, 0) + 2 * 14;
  let x = 500 - total / 2;
  const boxes = segs.map((s, i) => {
    const b = { ...s, x, w: widths[i] };
    x += widths[i] + 14;
    return b;
  });
  const slot = boxes.find((b) => b.kind === 'conj')!;
  const mainBox = boxes.find((b) => b.kind === 'main')!;
  const slotRect: Rect = { x: slot.x - 20, y: 90, w: slot.w + 40, h: 130 };
  const sentence = flipped ? `${cap(conj ?? '')} ${item.sub}, ${item.mainMid}.` : `${item.main} ${conj ?? '___'} ${item.sub}.`;

  const choose = (word: string) => {
    if (conj) return;
    setSelected(null);
    if (word === item.answer) {
      play('pop');
      setConj(word);
      setNote(`Yes! ${item.why} Now try “Flip it”.`);
      return;
    }
    play('wrong');
    setShake(word);
    window.setTimeout(() => setShake(null), 460);
    const m = misses + 1;
    setMisses(m);
    setNote(
      m >= 2
        ? `Here’s how: ${item.why} So the joining word is “${item.answer}”.`
        : `Not yet. Read it: “${item.main} ${word} ${item.sub}.” Does that make sense?`,
    );
  };

  const colors = { main: C.blue, sub: C.orange, conj: C.purple };
  const labels = { main: 'Main clause', sub: 'Subordinate clause', conj: 'Joining word' };

  return (
    <g>
      {boxes.map((b) => (
        <g
          key={b.kind}
          onClick={() => b.kind === 'conj' && selected && choose(selected)}
          style={{ cursor: b.kind === 'conj' && selected ? 'pointer' : undefined }}
          data-nopan={b.kind === 'conj' && selected ? true : undefined}
        >
          <rect
            x={b.x}
            y={124}
            width={b.w}
            height={64}
            rx={14}
            fill={b.kind === 'conj' && !conj ? C.card : shade(colors[b.kind], 0.8)}
            stroke={colors[b.kind]}
            strokeWidth={2.5}
            strokeDasharray={b.kind === 'conj' && !conj ? '8 6' : undefined}
          />
          <text x={b.x + b.w / 2} y={156} textAnchor="middle" dominantBaseline="central" fontSize={FS} fontWeight={b.kind === 'conj' ? 700 : 500} fill={C.ink}>
            {b.kind === 'sub' && flipped ? (
              <>
                {item.sub}
                <tspan fill={C.red} fontWeight={800} fontSize={FS + 8}>
                  ,
                </tspan>
              </>
            ) : (
              b.text
            )}
          </text>
          <text x={b.x + b.w / 2} y={214} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(colors[b.kind], -0.35)} className="caps">
            {labels[b.kind]}
          </text>
        </g>
      ))}

      {!conj &&
        tray.map((w, i) => (
          <DragChip
            key={w}
            x={300 + i * 200}
            y={330}
            w={170}
            h={64}
            lines={[w]}
            label={w}
            fontSize={24}
            selected={selected === w}
            shake={shake === w}
            onDrop={(c: Pt) => inRect(c, slotRect) && choose(w)}
            onTap={() => {
              play('tap');
              setSelected(selected === w ? null : w);
            }}
          />
        ))}

      {conj && (
        <g>
          <SvgButton
            x={290}
            y={300}
            w={200}
            h={54}
            fontSize={18}
            label={flipped ? 'Flip it back' : 'Flip it'}
            color={shade(C.yellow, 0.4)}
            onClick={() => {
              setFlipped(!flipped);
              setNote(
                flipped
                  ? 'Main clause first: no comma needed.'
                  : 'When the subordinate clause comes first, put a comma after it. The main clause still makes sense on its own.',
              );
            }}
          />
          <SvgButton x={510} y={300} w={200} h={54} fontSize={18} label="Read it to me" onClick={() => speak(sentence, { force: true })} />
        </g>
      )}

      <rect x={120} y={420} width={760} height={96} rx={16} fill={C.card} stroke={C.line} strokeWidth={2} />
      <text x={140} y={452} fontSize={15} fill={C.muted} className="caps">
        Your sentence
      </text>
      <text x={500} y={488} textAnchor="middle" fontSize={22} fontWeight={600} fill={C.ink}>
        {sentence}
      </text>

      {wrap(note, 96).map((line, i) => (
        <text key={i} x={500} y={572 + i * 23} textAnchor="middle" fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}
      <Callout at={flipped ? [mainBox.x + mainBox.w - 12, 188] : [mainBox.x + 20, 190]} box={[flipped ? 770 : 20, 238]} w={250} icon={Link} title="Main clause" text="It makes sense on its own. The subordinate clause needs it." />
    </g>
  );
}

// ───────────────────────── Scene: fix the tense ─────────────────────────

const TIME_X: Record<When, number> = { past: 230, present: 500, future: 770 };
const TFS = 30;

function TenseMode({ item }: { item: TenseItem }) {
  const [tray] = useState(() => shuffle(item.options));
  const [tried, setTried] = useState<{ text: string; when: When } | null>(null);
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState('Find the time clue. Then drag the verb that matches it into the gap.');

  const word = done ? item.answer : '';
  const beforeW = textWidth(item.before, TFS);
  const slotW = Math.max(170, textWidth(item.answer, TFS, 700) + 30);
  const afterW = textWidth(item.after, TFS);
  const total = beforeW + slotW + afterW + 28;
  const x0 = 500 - total / 2;
  const slotX = x0 + beforeW + 14;
  const slotRect: Rect = { x: slotX - 20, y: 240, w: slotW + 40, h: 110 };

  const choose = (opt: { text: string; when: When }) => {
    if (done) return;
    setSelected(null);
    setTried(opt);
    if (opt.text === item.answer) {
      play('pop');
      setDone(true);
      setNote(`Yes! “${item.clue}” is in the ${item.when}, and so is “${opt.text}”.`);
      return;
    }
    play('wrong');
    setShake(opt.text);
    window.setTimeout(() => setShake(null), 460);
    const m = misses + 1;
    setMisses(m);
    setNote(
      m >= 2
        ? `Here’s how: “${item.clue}” means the ${item.when}, so use the ${item.when} form: “${item.answer}”.`
        : `Not yet. “${opt.text}” puts it in the ${opt.when}. When does “${item.clue}” happen?`,
    );
  };

  return (
    <g>
      <line x1={130} x2={870} y1={160} y2={160} stroke={C.ink2} strokeWidth={4} strokeLinecap="round" />
      <path d="M858 150 L874 160 L858 170" fill="none" stroke={C.ink2} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      {(['past', 'present', 'future'] as When[]).map((w) => (
        <g key={w}>
          <line x1={TIME_X[w]} x2={TIME_X[w]} y1={150} y2={170} stroke={C.ink2} strokeWidth={3} />
          <text x={TIME_X[w]} y={196} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink2}>
            {w === 'present' ? 'Now' : cap(w)}
          </text>
        </g>
      ))}
      <g transform={`translate(${TIME_X[item.when]} 0)`}>
        <line x1={0} x2={0} y1={110} y2={160} stroke={C.ink} strokeWidth={2.5} />
        <rect x={0} y={86} width={textWidth(item.clue, 17, 700) + 22} height={30} rx={6} fill={done ? shade(C.green, 0.6) : shade(C.yellow, 0.45)} stroke={C.ink} strokeWidth={2} />
        <text x={11} y={102} dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.ink}>
          {item.clue}
        </text>
      </g>
      {tried && (
        <g className="rw-glow">
          <circle cx={TIME_X[tried.when]} cy={160} r={12} fill={tried.text === item.answer ? C.green : C.red} stroke={C.ink} strokeWidth={2} />
          {tried.text !== item.answer && (
            <text x={TIME_X[tried.when]} y={134} textAnchor="middle" fontSize={16} fontWeight={700} fill={shade(C.red, -0.3)}>
              {tried.text}
            </text>
          )}
        </g>
      )}

      <text x={x0} y={295} dominantBaseline="central" fontSize={TFS} fontWeight={600} fill={C.ink}>
        <tspan fill={shade(C.orange, -0.25)} fontWeight={800}>
          {item.before.slice(0, item.clue.length)}
        </tspan>
        {item.before.slice(item.clue.length)}
      </text>
      <g onClick={() => selected && choose(item.options.find((o) => o.text === selected)!)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan={selected ? true : undefined}>
        <rect
          x={slotX}
          y={262}
          width={slotW}
          height={66}
          rx={12}
          fill={done ? shade(C.green, 0.75) : C.card}
          stroke={done ? C.green : C.ink2}
          strokeWidth={2.5}
          strokeDasharray={done ? undefined : '8 6'}
        />
        <text x={slotX + slotW / 2} y={295} textAnchor="middle" dominantBaseline="central" fontSize={TFS} fontWeight={700} fill={C.ink}>
          {word}
        </text>
      </g>
      <text x={slotX + slotW + 14} y={295} dominantBaseline="central" fontSize={TFS} fontWeight={600} fill={C.ink}>
        {item.after}
      </text>

      {!done &&
        tray.map((o, i) => (
          <DragChip
            key={o.text}
            x={280 + i * 220}
            y={430}
            w={200}
            h={64}
            lines={[o.text]}
            label={o.text}
            fontSize={24}
            selected={selected === o.text}
            shake={shake === o.text}
            onDrop={(c: Pt) => inRect(c, slotRect) && choose(o)}
            onTap={() => {
              play('tap');
              setSelected(selected === o.text ? null : o.text);
            }}
          />
        ))}
      {done && (
        <SvgButton x={400} y={404} w={200} h={54} fontSize={18} label="Read it to me" onClick={() => speak(`${item.before} ${item.answer} ${item.after}`, { force: true })} />
      )}

      {wrap(note, 96).map((line, i) => (
        <text key={i} x={500} y={540 + i * 23} textAnchor="middle" fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}
      <Callout at={[140, 160]} box={[20, 206]} w={230} icon={Clock} title="Time clues" text="Words like yesterday, now and tomorrow tell you which tense to use." />
    </g>
  );
}

function GrammarScene() {
  useFontsReady();
  const [mode, setMode] = useState<'join' | 'tense'>('join');
  const [round, setRound] = useState(0);
  const join = JOINS[round % JOINS.length];
  const tense = TENSES[round % TENSES.length];
  return (
    <SceneSvg label="Clauses and tenses: join clauses and match verbs to time">
      <SvgButton x={210} y={16} w={200} h={48} fontSize={16} label="Join clauses" active={mode === 'join'} color={mode === 'join' ? shade(C.yellow, 0.4) : C.card} onClick={() => setMode('join')} />
      <SvgButton x={422} y={16} w={200} h={48} fontSize={16} label="Fix the tense" active={mode === 'tense'} color={mode === 'tense' ? shade(C.yellow, 0.4) : C.card} onClick={() => setMode('tense')} />
      <SvgButton x={760} y={16} w={210} h={48} fontSize={16} label="Next sentence" color={C.teal} textColor={C.white} onClick={() => setRound(round + 1)} />
      {mode === 'join' ? <JoinMode key={`j${round}`} item={join} /> : <TenseMode key={`t${round}`} item={tense} />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={12} width={42} height={20} rx={5} fill={shade(C.blue, 0.7)} stroke={C.blue} strokeWidth={1.5} />
      <rect x={50} y={12} width={22} height={20} rx={5} fill={shade(C.purple, 0.7)} stroke={C.purple} strokeWidth={1.5} />
      <rect x={76} y={12} width={40} height={20} rx={5} fill={shade(C.orange, 0.7)} stroke={C.orange} strokeWidth={1.5} />
      <line x1={12} x2={108} y1={58} y2={58} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M102 52 L110 58 L102 64" fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={30} cy={58} r={5} fill={C.green} stroke={C.ink} strokeWidth={1.2} />
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const CONSISTENT: { right: string; wrong: [string, string]; why: string }[] = [
  {
    right: 'Yesterday we went to the beach and built a sandcastle.',
    wrong: ['Yesterday we went to the beach and build a sandcastle.', 'Yesterday we go to the beach and built a sandcastle.'],
    why: '“Yesterday” is in the past, so both verbs are past: went, built.',
  },
  {
    right: 'Tomorrow I will pack my bag and catch the early bus.',
    wrong: ['Tomorrow I will pack my bag and caught the early bus.', 'Tomorrow I packed my bag and will catch the early bus.'],
    why: '“Tomorrow” is in the future, so both actions use will: will pack, (will) catch.',
  },
  {
    right: 'Last night the wind howled and the windows rattled.',
    wrong: ['Last night the wind howls and the windows rattled.', 'Last night the wind howled and the windows rattle.'],
    why: '“Last night” is in the past, so both verbs are past: howled, rattled.',
  },
  {
    right: 'When the bell rang, everyone ran outside.',
    wrong: ['When the bell rings, everyone ran outside.', 'When the bell rang, everyone runs outside.'],
    why: 'Both actions happened in the past, so both verbs are past: rang, ran.',
  },
];

const WHEN_WORD: Record<When, string> = { past: 'past', present: 'present', future: 'future' };

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const t = pick(TENSES);
    return {
      prompt: 'Which verb matches the time clue?',
      speak: `${t.before} blank ${t.after} Which verb matches the time clue?`,
      visual: <Passage text={`*${t.clue}*${t.before.slice(t.clue.length)} ___ ${t.after}`} />,
      choices: shuffle(t.options.map((o) => o.text)).map((value) => ({ value })),
      answer: t.answer,
      hint: 'Find the time word. Is it in the past, happening now, or in the future?',
      explain: [`“${t.clue}” tells us the time: the ${WHEN_WORD[t.when]}.`, `The ${WHEN_WORD[t.when]} form is “${t.answer}”.`, `${t.before} ${t.answer} ${t.after}`],
    };
  }
  if (level === 1) {
    const j = pick(JOINS);
    return {
      prompt: 'Which joining word makes sense?',
      speak: `${j.main}, blank, ${j.sub}. Which joining word makes sense?`,
      visual: <Passage text={`${j.main} ___ ${j.sub}.`} />,
      choices: shuffle(j.options).map((value) => ({ value })),
      answer: j.answer,
      hint: 'Try each word in the gap. Is it a reason, a time, a surprise, or a condition?',
      explain: [j.why, `So the sentence is: ${j.main} ${j.answer} ${j.sub}.`],
    };
  }
  const c = pick(CONSISTENT);
  return {
    prompt: 'Which sentence keeps the tense the same all the way through?',
    choices: shuffle([c.right, ...c.wrong]).map((value) => ({ value })),
    answer: c.right,
    hint: 'Find every verb. Do they all belong to the same time?',
    explain: [c.why, `The right one is: ${c.right}`],
  };
}

export const grammarClausesTenses: Lesson = {
  id: 'grammar-clauses-tenses',
  title: 'Clauses and Tenses',
  Thumb,
  Scene: GrammarScene,
  sceneHint: 'Join two clauses with the right word · Then match each verb to its time',
  learn: {
    heading: 'Clauses and tenses',
    intro:
      'A clause is a group of words with a subject and a verb. Joining clauses with words like because, when and although makes richer sentences. The tense of a verb tells the reader when things happen.',
    points: [
      { icon: Link, text: 'A main clause makes sense on its own: We stayed inside.' },
      { icon: GitMerge, text: 'A subordinate clause starts with a joining word and needs the main clause: because it was raining.' },
      { icon: History, text: 'Past, present, future: walked, is walking, will walk.' },
      { icon: Clock, text: 'Look for time clues (yesterday, now, tomorrow) and keep the tense the same.' },
    ],
  },
  steps: [
    'Find the main clause: does it make sense on its own?',
    'Choose a joining word that fits: because (reason), when (time), although (contrast), if (condition).',
    'If the subordinate clause comes first, put a comma after it.',
    'Find the time clue, then choose the verb tense that matches.',
    'Read it back: do all the verbs belong to the same time?',
  ],
  example: {
    question: 'Join and flip: “We stayed inside.” + “It was raining.”',
    work: ['The rain is the reason, so use because.', 'We stayed inside because it was raining.', 'Flip it: the subordinate clause goes first, followed by a comma.'],
    answer: 'Because it was raining, we stayed inside.',
  },
  grownups: [
    'Play “because, but, so”: give a starter like “The dog barked” and take turns finishing it three ways.',
    'Words like and, but and so join two main clauses. This lesson focuses on words like because, when, if and although, which start a subordinate clause.',
    'When reading together, spot a time word and ask which tense the verbs are in.',
  ],
  makeQuestion,
};
