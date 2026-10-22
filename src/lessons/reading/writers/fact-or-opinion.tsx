import { useState } from 'react';
import { BadgeCheck, Megaphone, Search } from 'lucide-react';
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

interface Fact {
  kind: 'fact';
  text: string;
  /** How you could prove it. */
  check: string;
}

interface Opinion {
  kind: 'opinion';
  text: string;
  /** Words that show it is someone’s view (must be found). */
  words: string[];
  /** Other words that also lean on opinion (accepted, not required). */
  also?: string[];
}

type Statement = Fact | Opinion;

const FACTS: Fact[] = [
  { kind: 'fact', text: 'A spider has eight legs.', check: 'Count the legs.' },
  { kind: 'fact', text: 'Water freezes at 0 °C.', check: 'Measure with a thermometer.' },
  { kind: 'fact', text: 'The Pacific is the largest ocean on Earth.', check: 'Look it up in an atlas.' },
  { kind: 'fact', text: 'Bees make honey.', check: 'Read about it in a science book.' },
  { kind: 'fact', text: 'Paris is the capital of France.', check: 'Look it up in an atlas.' },
  { kind: 'fact', text: 'Penguins cannot fly.', check: 'Read about it in a science book.' },
  { kind: 'fact', text: 'A year has twelve months.', check: 'Look at a calendar.' },
  { kind: 'fact', text: 'The Moon travels around the Earth.', check: 'Read about it in a science book.' },
];

const OPINIONS: Opinion[] = [
  { kind: 'opinion', text: 'Pizza is the best food ever.', words: ['best'], also: ['ever'] },
  { kind: 'opinion', text: 'Winter is more fun than summer.', words: ['fun'], also: ['more'] },
  { kind: 'opinion', text: 'Cats make better pets than dogs.', words: ['better'] },
  { kind: 'opinion', text: 'Math is the most exciting subject.', words: ['exciting'], also: ['most'] },
  { kind: 'opinion', text: 'That film was boring.', words: ['boring'] },
  { kind: 'opinion', text: 'Everyone should learn to play the piano.', words: ['should'], also: ['everyone'] },
  { kind: 'opinion', text: 'Blue is the prettiest colour.', words: ['prettiest'] },
  { kind: 'opinion', text: 'Rainy days are the worst.', words: ['worst'] },
  { kind: 'opinion', text: 'Spiders are creepy.', words: ['creepy'] },
];

const BAD_CHECKS = ['Vote on it with your friends.', 'Ask people which one they like best.', 'Just guess.'];

const clean = (w: string) => w.replace(/[.,!?]/g, '').toLowerCase();

const FACT_BIN: Rect = { x: 30, y: 196, w: 300, h: 464 };
const OPINION_BIN: Rect = { x: 670, y: 196, w: 300, h: 464 };

function newDeck(): Statement[] {
  return shuffle([...shuffle(FACTS).slice(0, 5), ...shuffle(OPINIONS).slice(0, 5)]);
}

function FactOpinionScene() {
  const [deck, setDeck] = useState<Statement[]>(newDeck);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [last, setLast] = useState<Statement | null>(null);
  const [spotted, setSpotted] = useState<string[]>([]);
  const [shakeWord, setShakeWord] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [selected, setSelected] = useState(false);
  const [note, setNote] = useState('');
  const current = deck[0];

  const sort = (bin: 'fact' | 'opinion') => {
    if (!current) return;
    setSelected(false);
    if (current.kind !== bin) {
      setShake(true);
      window.setTimeout(() => setShake(false), 460);
      setNote(bin === 'fact' ? 'Could you prove it? Could someone disagree?' : 'Could you check this with a book or a measurement?');
      play('wrong');
      return;
    }
    if (current.kind === 'fact') setFacts([...facts, current]);
    else setOpinions([...opinions, current]);
    setLast(current);
    setSpotted([]);
    setNote('');
    setDeck(deck.slice(1));
    play('correct');
  };

  const onDrop = (c: Pt) => {
    if (inRect(c, FACT_BIN)) sort('fact');
    else if (inRect(c, OPINION_BIN)) sort('opinion');
  };

  const tapWord = (word: string, i: number) => {
    if (!last || last.kind !== 'opinion') return;
    const w = clean(word);
    if (last.words.includes(w) || last.also?.includes(w)) {
      if (!spotted.includes(w)) {
        setSpotted([...spotted, w]);
        play('pop');
      }
    } else {
      setShakeWord(i);
      window.setTimeout(() => setShakeWord(null), 460);
      play('wrong');
    }
  };

  const allSpotted = last?.kind === 'opinion' && last.words.every((w) => spotted.includes(w));

  const binList = (items: Statement[], r: Rect) =>
    items.slice(-6).map((s, j) => (
      <text key={s.text} x={r.x + 16} y={r.y + 122 + j * 52} fontSize={14} fill={C.ink}>
        {wrap(s.text, 32).map((line, n) => (
          <tspan key={n} x={r.x + 16} dy={n === 0 ? 0 : 17}>
            {line}
          </tspan>
        ))}
      </text>
    ));

  // Words of the last opinion, laid out as tappable chips in the middle panel.
  let wx = 372;
  let wy = 330;
  const wordChips =
    last?.kind === 'opinion'
      ? last.text.split(' ').map((word, i) => {
          const w = word.length * 17 * 0.6 + 22;
          if (wx + w > 630) {
            wx = 372;
            wy += 52;
          }
          const chip = { word, i, x: wx, y: wy, w };
          wx += w + 8;
          return chip;
        })
      : [];

  return (
    <SceneSvg label="Sort statements into fact or opinion">
      <text x={40} y={42} fontSize={19} fontWeight={700} fill={C.ink}>
        Fact = can be checked. Opinion = what someone thinks or feels.
      </text>

      {/* Bins */}
      {[
        { r: FACT_BIN, name: 'Fact', sub: 'can be proved true', color: C.blue, items: facts, kind: 'fact' as const },
        { r: OPINION_BIN, name: 'Opinion', sub: 'someone’s view', color: C.pink, items: opinions, kind: 'opinion' as const },
      ].map((b) => (
        <g key={b.name}>
          <rect x={b.r.x} y={b.r.y} width={b.r.w} height={b.r.h} rx={20} fill={shade(b.color, 0.86)} stroke={b.color} strokeWidth={2.5} />
          <text x={b.r.x + 18} y={b.r.y + 40} fontSize={26} fontWeight={800} fill={shade(b.color, -0.35)}>
            {b.name}
          </text>
          <text x={b.r.x + 18} y={b.r.y + 66} fontSize={15} fill={C.ink2}>
            {b.sub}
          </text>
          <text x={b.r.x + 18} y={b.r.y + 92} fontSize={14} fill={C.muted}>
            {b.items.length} sorted
          </text>
          {binList(b.items, b.r)}
          {selected && (
            <rect x={b.r.x} y={b.r.y} width={b.r.w} height={b.r.h} rx={20} fill="transparent" stroke={C.orange} strokeWidth={3} strokeDasharray="10 8" style={{ cursor: 'pointer' }} data-nopan onClick={() => sort(b.kind)} />
          )}
        </g>
      ))}

      {/* Middle panel */}
      <rect x={350} y={196} width={300} height={464} rx={20} fill={C.card} stroke={C.line} strokeWidth={2} />
      {note ? (
        wrap(`Not yet. ${note}`, 30).map((line, i) => (
          <text key={i} x={370} y={232 + i * 22} fontSize={16} fontWeight={i === 0 ? 700 : 400} fill={C.ink}>
            {line}
          </text>
        ))
      ) : !last ? (
        wrap('Drag the card at the top into Fact or Opinion. Or tap it, then tap a box.', 30).map((line, i) => (
          <text key={i} x={370} y={232 + i * 22} fontSize={16} fill={C.ink2}>
            {line}
          </text>
        ))
      ) : last.kind === 'fact' ? (
        <>
          <text x={370} y={232} fontSize={18} fontWeight={700} fill={shade(C.blue, -0.3)}>
            Yes, a fact!
          </text>
          {wrap(`“${last.text}”`, 30).map((line, i) => (
            <text key={i} x={370} y={262 + i * 21} fontSize={15} fill={C.ink}>
              {line}
            </text>
          ))}
          <text x={370} y={330} fontSize={15} fontWeight={700} fill={C.ink}>
            How to check it:
          </text>
          <text x={370} y={354} fontSize={15} fill={C.ink2}>
            {last.check}
          </text>
        </>
      ) : (
        <>
          <text x={370} y={232} fontSize={18} fontWeight={700} fill={shade(C.pink, -0.35)}>
            Yes, an opinion!
          </text>
          {wrap(allSpotted ? 'Great spotting! Those words show it’s what someone thinks.' : 'Tap the words that show it’s someone’s view.', 30).map((line, i) => (
            <text key={i} x={370} y={262 + i * 21} fontSize={15} fill={C.ink2}>
              {line}
            </text>
          ))}
          {wordChips.map((c) => {
            const on = spotted.includes(clean(c.word));
            return (
              <g key={c.i} onClick={() => tapWord(c.word, c.i)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Word: ${clean(c.word)}`}>
                <g className={shakeWord === c.i ? 'rw-shake' : undefined}>
                  <rect x={c.x} y={c.y} width={c.w} height={42} rx={10} fill={on ? '#fde68a' : shade(C.paper, 0.4)} stroke={on ? C.orange : C.line} strokeWidth={2} />
                  <text x={c.x + c.w / 2} y={c.y + 22} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={on ? 800 : 500} fill={C.ink}>
                    {c.word}
                  </text>
                </g>
              </g>
            );
          })}
        </>
      )}
      {last && <SvgButton x={370} y={596} w={120} h={48} fontSize={15} label="Say it" onClick={() => speak(last.text, { force: true })} />}
      {!current && <SvgButton x={500} y={596} w={136} h={48} fontSize={15} label="New cards" color={C.yellow} onClick={() => {
        setDeck(newDeck());
        setFacts([]);
        setOpinions([]);
        setLast(null);
      }} />}

      {/* The statement to sort */}
      {current ? (
        <DragChip
          key={current.text}
          x={500}
          y={116}
          w={560}
          h={84}
          lines={wrap(current.text, 40)}
          label={`Statement: ${current.text}`}
          fontSize={21}
          selected={selected}
          shake={shake}
          onDrop={onDrop}
          onTap={() => {
            setSelected(!selected);
            play('tap');
          }}
        />
      ) : (
        <text x={500} y={122} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.green}>
          All sorted! {facts.length} facts and {opinions.length} opinions.
        </text>
      )}

      <Callout at={[180, 260]} box={[690, 4]} w={260} icon={BadgeCheck} title="Facts can be proved" text="Count, measure, or look it up in a trusted book." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={20} y={6} width={80} height={20} rx={6} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <rect x={6} y={34} width={50} height={40} rx={8} fill={shade(C.blue, 0.75)} stroke={C.blue} strokeWidth={2} />
      <text x={31} y={58} textAnchor="middle" fontSize={11} fontWeight={800} fill={shade(C.blue, -0.3)}>Fact</text>
      <rect x={64} y={34} width={50} height={40} rx={8} fill={shade(C.pink, 0.75)} stroke={C.pink} strokeWidth={2} />
      <text x={89} y={58} textAnchor="middle" fontSize={10} fontWeight={800} fill={shade(C.pink, -0.35)}>Opinion</text>
    </svg>
  );
}

function explainKind(s: Statement): string[] {
  if (s.kind === 'fact') return [`You could check it: ${s.check.toLowerCase()}`, 'It stays true whatever anyone thinks.', 'So it is a fact.'];
  return [`“${s.words[0]}” shows what someone thinks or feels.`, 'Other people could disagree.', 'So it is an opinion.'];
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const s = pick<Statement>([...FACTS, ...OPINIONS]);
    return {
      prompt: 'Is this a fact or an opinion?',
      visual: <Passage text={s.text} />,
      choices: [{ value: 'Fact' }, { value: 'Opinion' }],
      answer: s.kind === 'fact' ? 'Fact' : 'Opinion',
      hint: 'Could you prove it? Or could someone disagree?',
      explain: explainKind(s),
    };
  }
  if (level === 1) {
    if (Math.random() < 0.5) {
      const f = pick(FACTS);
      const ops = shuffle(OPINIONS).slice(0, 2);
      return {
        prompt: 'Which statement is a fact?',
        choices: shuffle<Statement>([f, ...ops]).map((s) => ({ value: s.text })),
        answer: f.text,
        hint: 'Look for the one you could check by counting, measuring or looking it up.',
        explain: [`“${f.text}”`, `You could check it: ${f.check.toLowerCase()}`, 'The others are opinions: people could disagree with them.'],
      };
    }
    const o = pick(OPINIONS);
    const fs = shuffle(FACTS).slice(0, 2);
    return {
      prompt: 'Which statement is an opinion?',
      choices: shuffle<Statement>([o, ...fs]).map((s) => ({ value: s.text })),
      answer: o.text,
      hint: 'Look for a feeling or judging word, like best, boring or should.',
      explain: [`“${o.text}”`, `“${o.words[0]}” shows what someone thinks.`, 'The others can be checked, so they are facts.'],
    };
  }
  if (Math.random() < 0.5) {
    const o = pick(OPINIONS);
    const skip = new Set([...o.words, ...(o.also ?? []), 'the', 'is']);
    const others = shuffle(
      [...new Set(o.text.split(' ').map((w) => w.replace(/[.,!?]/g, '')))].filter((w) => w.length >= 3 && !skip.has(w.toLowerCase())),
    ).slice(0, 2);
    const word = o.words[0];
    return {
      prompt: 'Which word shows that this is an opinion?',
      visual: <Passage text={o.text} />,
      choices: shuffle([word, ...others]).map((value) => ({ value })),
      answer: word,
      hint: 'Find the word that judges or describes a feeling.',
      explain: [`“${word}” is a judging word: it tells us how someone feels.`, 'People could disagree with it.', `So “${word}” shows it is an opinion.`],
    };
  }
  const f = pick(FACTS);
  return {
    prompt: 'How could you check this fact?',
    visual: <Passage text={f.text} />,
    choices: shuffle([f.check, ...shuffle(BAD_CHECKS).slice(0, 2)]).map((value) => ({ value })),
    answer: f.check,
    hint: 'Facts are checked with evidence, not by asking what people like.',
    explain: ['A fact can be proved with evidence.', `For this one: ${f.check}`, 'Voting or guessing can’t prove something is true.'],
  };
}

export const factOrOpinion: Lesson = {
  id: 'fact-or-opinion',
  title: 'Fact or Opinion',
  Thumb,
  Scene: FactOpinionScene,
  sceneHint: 'Drag each card into Fact or Opinion · Then spot the opinion words',
  learn: {
    heading: 'Fact or opinion?',
    intro:
      'A fact can be checked and proved true. An opinion is what someone thinks or feels, and other people might disagree. Writers mix both, so smart readers tell them apart.',
    points: [
      { icon: BadgeCheck, text: 'Facts can be counted, measured or looked up in a trusted source.' },
      { icon: Megaphone, text: 'Opinions often use judging words: best, worst, boring, should.' },
      { icon: Search, text: 'Ask: could I prove this? Could someone disagree?' },
    ],
  },
  steps: [
    'Read the statement carefully.',
    'Ask: could I check this by counting, measuring or looking it up?',
    'Look for judging or feeling words like best, boring, should.',
    'Decide: fact or opinion? Be ready to say why.',
  ],
  example: {
    question: 'Fact or opinion: “Pizza is the best food ever.”',
    visual: <Passage text="Pizza is the *best* food ever." />,
    work: ['“Best” is a judging word.', 'Lots of people would disagree. There’s no way to prove it.'],
    answer: 'It is an opinion.',
  },
  grownups: [
    'Adverts are great practice: which parts are facts, and which are opinions trying to persuade?',
    'Facts can still be wrong if the source is poor, so talk about trusted sources too.',
    'Opinions aren’t bad! Encourage children to share theirs, with reasons.',
  ],
  makeQuestion,
};
