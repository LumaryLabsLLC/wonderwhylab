import { useState } from 'react';
import { CaseUpper, Link2, UserRound } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { pick, shuffle, soundOf } from './data';
import { mcq, level3 } from './q';
import { BigLetterVisual, DragCard, LetterTile, Note, Tap } from './visuals/Pictures';

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** Letters whose big and small shapes are worth matching (some alike, most different). */
const PAIR_LETTERS = 'abdefghmnrtcosp'.split('');
const NAMES = ['sam', 'pam', 'tom', 'ben', 'kim', 'meg', 'jen', 'rob'];

/** Short decodable sentences. The first word and any names need a big letter. */
const SENTENCES = [
  'sam has a big dog',
  'the sun is hot',
  'my cat is on the mat',
  'ben and kim run',
  'meg has a red hen',
  'we met jen at the bus',
  'rob sat on a log',
  'dad and tom dig',
  'the dog and pam nap',
  'kim got a pet bug',
];

interface Word {
  text: string;
  start: boolean;
  name: boolean;
}

const wordsOf = (s: string): Word[] => s.split(' ').map((text, i) => ({ text, start: i === 0, name: NAMES.includes(text) }));
const needsCap = (w: Word) => w.start || w.name;
/** The sentence written correctly, with a full stop. */
const written = (s: string) => `${wordsOf(s).map((w) => (needsCap(w) ? cap(w.text) : w.text)).join(' ')}.`;

// ───────────────────────── Scene ─────────────────────────

const pairX = (i: number) => 140 + i * 180;
const SMALL_Y = 200;
const BIG_Y = 440;

function PairsMode() {
  const [letters, setLetters] = useState(() => shuffle(PAIR_LETTERS).slice(0, 5));
  const [bigOrder, setBigOrder] = useState(() => shuffle(letters));
  const [matched, setMatched] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState({ id: '', key: 0 });
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const all = matched.length === letters.length;

  const fresh = () => {
    const next = shuffle(PAIR_LETTERS).slice(0, 5);
    setLetters(next);
    setBigOrder(shuffle(next));
    setMatched([]);
    setSel(null);
    setMisses(0);
    setMsg(null);
    play('pop');
  };

  const check = (small: string, big: string) => {
    if (matched.includes(small)) return;
    if (small === big) {
      const done = [...matched, small];
      setMatched(done);
      setSel(null);
      setMisses(0);
      play(done.length === letters.length ? 'correct' : 'pop');
      setMsg({
        text:
          done.length === letters.length
            ? 'All the pairs! Some partners look the same, like c and C. Some look different, like a and A.'
            : `${big.toUpperCase()} and ${small} are partners. They both say “${soundOf(small)}”.`,
        tone: 'good',
      });
      return;
    }
    play('wrong');
    setShake((s) => ({ id: small, key: s.key + 1 }));
    const tries = misses + 1;
    setMisses(tries);
    setMsg({
      text: tries >= 2 ? `The partner of ${small} is the big ${small.toUpperCase()}. It's glowing.` : `Not yet! ${big.toUpperCase()} is not the partner of ${small}. Look at the shapes again.`,
      tone: 'try',
    });
  };

  const dropAt = (small: string, x: number, y: number) => {
    if (Math.abs(y - BIG_Y) > 90) return;
    const i = bigOrder.findIndex((_, k) => Math.abs(pairX(k) - x) < 80);
    if (i >= 0) check(small, bigOrder[i]);
  };

  return (
    <g>
      <SvgButton x={790} y={22} w={170} h={52} fontSize={18} label="New letters" onClick={fresh} color={all ? C.yellow : C.card} />
      <text x={500} y={122} textAnchor="middle" fontSize={17} fill={C.muted} className="caps">
        Small letters
      </text>
      <text x={500} y={530} textAnchor="middle" fontSize={17} fill={C.muted} className="caps">
        Big letters (capitals)
      </text>

      {/* Lines join matched partners */}
      {matched.map((l) => {
        const a = pairX(letters.indexOf(l));
        const b = pairX(bigOrder.indexOf(l));
        return <line key={l} x1={a} y1={SMALL_Y + 56} x2={b} y2={BIG_Y - 56} stroke={C.green} strokeWidth={6} strokeLinecap="round" />;
      })}

      {bigOrder.map((l, i) => (
        <Tap key={l} label={`Big ${l.toUpperCase()}`} onTap={() => sel && check(sel, l)}>
          <g transform={`translate(${pairX(i)} ${BIG_Y})`}>
            <LetterTile text={l.toUpperCase()} w={104} h={104} fontSize={62} fill={matched.includes(l) ? shade(C.green, 0.7) : C.card} lit={misses >= 2 && sel === l && !matched.includes(l)} />
          </g>
        </Tap>
      ))}

      {letters.map((l, i) => (
        <DragCard
          key={`${letters.join('')}-${l}`}
          x={pairX(i)}
          y={SMALL_Y}
          label={`Small ${l}. Drag it to its big partner, or tap it and then tap the partner.`}
          disabled={matched.includes(l)}
          shakeKey={shake.id === l ? shake.key : 0}
          onTap={() => {
            setSel(l);
            setMisses(0);
            speak(soundOf(l), { force: true });
          }}
          onDrop={(p) => {
            setSel(l);
            dropAt(l, p.x, p.y);
          }}
        >
          <LetterTile text={l} w={104} h={104} fontSize={62} fill={matched.includes(l) ? shade(C.green, 0.7) : C.card} lit={sel === l && !matched.includes(l)} />
        </DragCard>
      ))}

      <Note x={60} y={580} w={880} h={70} tone={msg?.tone ?? 'plain'} text={msg?.text ?? 'Every small letter has a big partner. Drag a small letter to its big letter.'} />
      <Callout at={[pairX(0), BIG_Y - 52]} box={[40, 300]} w={210} icon={Link2} title="Partners" text="Big and small partners make the same sound." />
    </g>
  );
}

function FixMode() {
  const [sentence, setSentence] = useState(() => pick(SENTENCES));
  const words = wordsOf(sentence);
  const [caps, setCaps] = useState<boolean[]>(() => words.map(() => false));
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);

  const widths = words.map((w) => 44 + w.text.length * 30);
  const gap = 18;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1) + 30;
  const lefts = widths.map((_, i) => 500 - total / 2 + widths.slice(0, i).reduce((a, b) => a + b, 0) + gap * i);

  const toggle = (i: number) => {
    if (solved) return;
    setCaps((c) => c.map((v, k) => (k === i ? !v : v)));
    setMsg(null);
  };
  const check = () => {
    const missing = words.filter((w, i) => needsCap(w) && !caps[i]);
    const extra = words.filter((w, i) => !needsCap(w) && caps[i]);
    if (missing.length === 0 && extra.length === 0) {
      play('correct');
      setSolved(true);
      const later = words.filter((w) => !w.start && w.name).map((w) => cap(w.text));
      setMsg({
        text: `Yes! ${cap(words[0].text)} starts the sentence${words[0].name ? ' and is a name' : ''}${later.length ? `, and ${later.join(' and ')} ${later.length > 1 ? 'are names' : 'is a name'}` : ''}. Big letters in just the right places!`,
        tone: 'good',
      });
      return;
    }
    play('wrong');
    const tries = misses + 1;
    setMisses(tries);
    if (extra.length > 0) setMsg({ text: `Not yet. ${cap(extra[0].text)} is not a name and doesn't start the sentence, so it stays small: ${extra[0].text}.`, tone: 'try' });
    else if (tries >= 2) setMsg({ text: `Look at the glowing words: they need a big letter.`, tone: 'try' });
    else if (!caps[0]) setMsg({ text: 'Not yet. Look at the first word. Is there a name in the sentence too?', tone: 'try' });
    else setMsg({ text: 'Your first word is right! Now look for a name in the sentence.', tone: 'try' });
  };
  const next = () => {
    const s = pick(SENTENCES.filter((x) => x !== sentence));
    setSentence(s);
    setCaps(wordsOf(s).map(() => false));
    setMisses(0);
    setSolved(false);
    setMsg(null);
    play('pop');
  };

  return (
    <g>
      <text x={500} y={150} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink2}>
        Tap a word to give it a big letter. Tap again to make it small.
      </text>
      {words.map((w, i) => {
        const glow = misses >= 2 && needsCap(w) && !caps[i] && !solved;
        const text = caps[i] ? cap(w.text) : w.text;
        return (
          <Tap key={`${sentence}-${i}`} label={`${text}. Tap to change its first letter.`} onTap={() => toggle(i)}>
            <rect x={lefts[i]} y={200} width={widths[i]} height={96} rx={16} fill={glow ? shade(C.yellow, 0.45) : caps[i] ? shade(C.blue, 0.8) : C.card} stroke={glow ? shade(C.orange, -0.2) : C.ink} strokeWidth={glow ? 4 : 2.5} />
            <text x={lefts[i] + widths[i] / 2} y={250} textAnchor="middle" dominantBaseline="central" fontSize={48} fontWeight={700} fill={C.ink}>
              {text}
            </text>
            {solved && needsCap(w) && (
              <text x={lefts[i] + widths[i] / 2} y={322} textAnchor="middle" fontSize={16} fill={C.ink2}>
                {w.start && w.name ? 'start + name' : w.start ? 'start' : 'name'}
              </text>
            )}
          </Tap>
        );
      })}
      <text x={lefts[words.length - 1] + widths[words.length - 1] + 6} y={276} fontSize={56} fontWeight={700} fill={C.ink}>
        .
      </text>

      {/* The two rules */}
      <rect x={160} y={360} width={680} height={110} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={330} y={400} textAnchor="middle" fontSize={19} fontWeight={700} fill={C.ink}>
        Start of a sentence
      </text>
      <text x={330} y={440} textAnchor="middle" fontSize={26} fill={C.ink}>
        <tspan fontWeight={700} fill={C.blue}>
          T
        </tspan>
        he dog ran.
      </text>
      <line x1={500} x2={500} y1={378} y2={452} stroke={C.line} strokeWidth={2} />
      <text x={670} y={400} textAnchor="middle" fontSize={19} fontWeight={700} fill={C.ink}>
        Names
      </text>
      <text x={670} y={440} textAnchor="middle" fontSize={26} fill={C.ink}>
        I met{' '}
        <tspan fontWeight={700} fill={C.blue}>
          M
        </tspan>
        eg.
      </text>

      <SvgButton x={600} y={496} w={160} h={56} fontSize={20} label="Check" onClick={check} color={C.yellow} disabled={solved} />
      <SvgButton x={780} y={496} w={180} h={56} fontSize={18} label="Next sentence" onClick={next} color={solved ? C.yellow : C.card} />

      <Note x={60} y={580} w={880} h={70} tone={msg?.tone ?? 'plain'} text={msg?.text ?? 'Which words need a big letter? Think: the start of the sentence, and names.'} />
      <Callout at={[lefts[0] + 10, 210]} box={[30, 30]} w={200} icon={UserRound} title="Big letters" text="A sentence starts with a big letter. Names do too." />
    </g>
  );
}

function CapitalsScene() {
  const [mode, setMode] = useState<'pairs' | 'fix'>('pairs');
  return (
    <SceneSvg label={mode === 'pairs' ? 'Match small and big letters' : 'Fix the capital letters in a sentence'}>
      <SvgButton x={300} y={22} w={200} h={52} fontSize={18} label="Match pairs" onClick={() => setMode('pairs')} active={mode === 'pairs'} color={mode === 'pairs' ? C.yellow : C.card} />
      <SvgButton x={514} y={22} w={200} h={52} fontSize={18} label="Fix the sentence" onClick={() => setMode('fix')} active={mode === 'fix'} color={mode === 'fix' ? C.yellow : C.card} />
      {mode === 'pairs' ? <PairsMode /> : <FixMode />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[
        ['a', 'A', 24],
        ['g', 'G', 60],
        ['m', 'M', 96],
      ].map(([s, b, x]) => (
        <g key={s as string}>
          <rect x={(x as number) - 13} y={8} width={26} height={26} rx={5} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
          <text x={x as number} y={27} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
            {s}
          </text>
          <line x1={x as number} x2={x as number} y1={36} y2={44} stroke={C.green} strokeWidth={2.5} />
          <rect x={(x as number) - 13} y={46} width={26} height={26} rx={5} fill={shade(C.green, 0.7)} stroke={C.ink} strokeWidth={1.5} />
          <text x={x as number} y={65} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
            {b}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

/** Small letters that are easy to mix up, so choosing the partner takes a careful look. */
const SMALL_LOOKALIKES: Record<string, string[]> = {
  B: ['b', 'd', 'p'],
  D: ['d', 'b', 'q'],
  G: ['g', 'q', 'p'],
  P: ['p', 'q', 'b'],
  Q: ['q', 'p', 'g'],
  N: ['n', 'm', 'h'],
  H: ['h', 'n', 'b'],
  E: ['e', 'a', 'c'],
  A: ['a', 'e', 'd'],
  R: ['r', 'n', 'p'],
};

function bigPartner(): Question {
  const small = pick(PAIR_LETTERS);
  const big = small.toUpperCase();
  const wrong = shuffle(PAIR_LETTERS.filter((l) => l !== small))
    .slice(0, 2)
    .map((l) => l.toUpperCase());
  return mcq({
    prompt: `Which is the big letter for ${small}?`,
    visual: <BigLetterVisual text={small} />,
    answer: big,
    wrong,
    hint: `Say the sound of ${small}. Which big letter makes the same sound?`,
    explain: [`Small ${small} says “${soundOf(small)}”.`, `Its big partner says “${soundOf(small)}” too.`, `So the big letter is ${big}.`],
  });
}

function smallPartner(): Question {
  const big = pick(Object.keys(SMALL_LOOKALIKES));
  const [answer, ...wrong] = SMALL_LOOKALIKES[big];
  return mcq({
    prompt: `Which is the small letter for ${big}?`,
    visual: <BigLetterVisual text={big} />,
    answer,
    wrong,
    hint: 'Some small letters look alike. Check which way each one faces.',
    explain: [`Big ${big} and small ${answer} are partners.`, `They both say “${soundOf(answer)}”.`, `So the small letter is ${answer}.`],
  });
}

function nameQuestion(): Question {
  const name = pick(NAMES);
  const wrong = shuffle(['cat', 'red', 'hop', 'sun', 'big', 'hat', 'run']).slice(0, 2);
  return mcq({
    prompt: 'Which word always needs a big letter?',
    answer: name,
    wrong,
    hint: 'Which word is somebody’s name?',
    explain: ['Names always start with a big letter.', `${name} is a name.`, `So we write ${cap(name)}.`],
  });
}

function sentenceQuestion(): Question {
  const s = pick(SENTENCES);
  const words = wordsOf(s);
  const right = written(s);
  const fmt = (caps: boolean[]) => `${words.map((w, i) => (caps[i] ? cap(w.text) : w.text)).join(' ')}.`;
  const good = words.map(needsCap);
  const nameAt = words.findIndex((w, i) => i > 0 && w.name);
  const plainAt = pick(words.map((w, i) => (needsCap(w) ? -1 : i)).filter((i) => i >= 0));
  const noStart = fmt(good.map((v, i) => (i === 0 ? false : v)));
  const second = nameAt > 0 ? fmt(good.map((v, i) => (i === nameAt ? false : v))) : fmt(good.map((v, i) => (i === plainAt ? true : v)));
  const names = words.filter((w) => w.name).map((w) => cap(w.text));
  return mcq({
    prompt: 'Which sentence has the big letters in the right places?',
    answer: right,
    wrong: [noStart, second],
    hint: 'Check the first word. Then look for names, and for words that should stay small.',
    explain: [
      'A sentence starts with a big letter.',
      names.length ? `${names.join(' and ')} ${names.length > 1 ? 'are names' : 'is a name'}, so ${names.length > 1 ? 'they get' : 'it gets'} a big letter too.` : 'The other words are not names, so they stay small.',
      `So the right one is “${right}”`,
    ],
  });
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv === 0) return bigPartner();
  if (lv === 1) return Math.random() < 0.5 ? smallPartner() : nameQuestion();
  return Math.random() < 0.7 ? sentenceQuestion() : smallPartner();
}

export const capitalLetters: Lesson = {
  id: 'capital-letters',
  title: 'Big and Small Letters',
  Thumb,
  Scene: CapitalsScene,
  sceneHint: 'Match each small letter to its big partner · Then fix the big letters in a sentence',
  learn: {
    heading: 'Big letters and small letters',
    intro: 'Every letter has a small shape and a big shape (a capital). Both make the same sound. Most of the time we write small letters.',
    points: [
      { icon: Link2, text: 'Partners: a and A, g and G, m and M.' },
      { icon: CaseUpper, text: 'A sentence starts with a big letter.' },
      { icon: UserRound, text: 'Names start with a big letter: Sam, Meg.' },
    ],
  },
  steps: ['Write most words with small letters.', 'Give the first word of a sentence a big letter.', 'Give names a big letter.', 'Read it back and check.'],
  example: {
    question: 'Fix it: “ben and kim run.”',
    work: ['ben starts the sentence, so it gets a big letter: Ben.', 'kim is a name, so it gets a big letter: Kim.', 'and and run stay small.'],
    answer: 'Ben and Kim run.',
  },
  grownups: [
    'Children often write in all capitals at first. Gently show the small letter partner; small letters are what we mostly read.',
    'Point out capitals in books: “Why is this a big letter? It starts the sentence!” or “It’s someone’s name!”',
    'Writing their own name with one capital and then small letters (Sam, not SAM) is a great first goal.',
    'Letters like b, d, p and q are easy to mix up. Matching them with their big partners helps.',
  ],
  makeQuestion,
};
