import { useState } from 'react';
import { CaseUpper, CircleDot, Volume2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { mcq, level3 } from '../sounds/q';
import { Note } from '../sounds/visuals/Pictures';
import { wrapText } from './visuals/Tiles';

const NAMES = ['sam', 'pam', 'jack', 'kim', 'ben', 'meg'];
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** Two short, decodable sentences each, written as one run-on string of words. */
const PASSAGES: string[][][] = [
  [['the', 'sun', 'is', 'hot'], ['we', 'can', 'swim', 'in', 'the', 'pond']],
  [['sam', 'has', 'a', 'red', 'sled'], ['it', 'is', 'fun', 'on', 'the', 'hill']],
  [['the', 'frog', 'sat', 'on', 'a', 'log'], ['it', 'had', 'a', 'nap']],
  [['my', 'dog', 'can', 'run', 'fast'], ['he', 'digs', 'in', 'the', 'mud']],
  [['pam', 'got', 'a', 'gift'], ['it', 'was', 'a', 'pet', 'fish']],
  [['the', 'duck', 'is', 'wet'], ['it', 'swims', 'in', 'the', 'pond']],
  [['jack', 'and', 'kim', 'got', 'on', 'the', 'bus'], ['the', 'bus', 'went', 'up', 'the', 'hill']],
  [['we', 'met', 'ben', 'at', 'the', 'shop'], ['he', 'had', 'a', 'red', 'cap']],
];

interface Word {
  text: string;
  /** Needs a capital: it starts a sentence or is a name. */
  cap: boolean;
  /** A full stop goes after it. */
  stop: boolean;
}

function wordsOf(p: string[][]): Word[] {
  return p.flatMap((s) => s.map((text, i) => ({ text, cap: i === 0 || NAMES.includes(text), stop: i === s.length - 1 })));
}

const written = (p: string[][]) => p.map((s) => `${s.map((w, i) => (i === 0 || NAMES.includes(w) ? cap(w) : w)).join(' ')}.`).join(' ');

// ───────────────────────── Scene ─────────────────────────

const CARD_H = 70;
const GAP = 34;
const ROW_H = 112;
const widthOf = (w: string) => 26 + w.length * 21;

/** Lay the words out in rows that fit the scene. */
function layout(words: Word[]) {
  const out: { x: number; y: number; w: number }[] = [];
  let x = 30;
  let y = 150;
  for (const word of words) {
    const w = widthOf(word.text);
    if (x + w > 970) {
      x = 30;
      y += ROW_H;
    }
    out.push({ x, y, w });
    x += w + GAP;
  }
  return out;
}

function FixScene() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PASSAGES.length));
  const words = wordsOf(PASSAGES[index]);
  const [caps, setCaps] = useState<boolean[]>(() => words.map(() => false));
  const [stops, setStops] = useState<boolean[]>(() => words.map(() => false));
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const pos = layout(words);

  const reset = (i: number) => {
    const n = wordsOf(PASSAGES[i]).length;
    setIndex(i);
    setCaps(Array(n).fill(false));
    setStops(Array(n).fill(false));
    setMisses(0);
    setSolved(false);
    setMsg(null);
  };
  const toggleCap = (i: number) => {
    if (solved) return;
    setCaps((c) => c.map((v, k) => (k === i ? !v : v)));
    setMsg(null);
    play('tap');
  };
  const toggleStop = (i: number) => {
    if (solved) return;
    setStops((s) => s.map((v, k) => (k === i ? !v : v)));
    setMsg(null);
    play('pop');
  };
  const current = () => words.map((w, i) => `${caps[i] ? cap(w.text) : w.text}${stops[i] ? '.' : ''}`).join(' ');

  const check = () => {
    const missingStop = words.findIndex((w, i) => w.stop && !stops[i]);
    const extraStop = words.findIndex((w, i) => !w.stop && stops[i]);
    const missingCap = words.findIndex((w, i) => w.cap && !caps[i]);
    const extraCap = words.findIndex((w, i) => !w.cap && caps[i]);
    if (missingStop < 0 && extraStop < 0 && missingCap < 0 && extraCap < 0) {
      play('correct');
      setSolved(true);
      setMsg({ text: `${PASSAGES[index].length} sentences! Each one starts with a capital letter and ends with a full stop. Tap “Read it” to hear them.`, tone: 'good' });
      return;
    }
    play('wrong');
    const tries = misses + 1;
    setMisses(tries);
    let text: string;
    if (extraStop >= 0) text = `Read up to “${words[extraStop].text}”. Is that the end of a whole idea? If not, take that full stop away.`;
    else if (missingStop >= 0) text = tries >= 2 ? `A sentence ends after “${words[missingStop].text}”. Tap the gap after it.` : 'Read it aloud. Where does one idea finish? A full stop goes there, and one goes at the very end.';
    else if (extraCap >= 0) text = `“${cap(words[extraCap].text)}” doesn't start a sentence and isn't a name, so it stays small.`;
    else text = tries >= 2 ? `“${words[missingCap].text}” needs a capital letter. Can you see why?` : 'Look at the word just after each full stop, and look for names. Do they have capital letters?';
    setMsg({ text, tone: 'try' });
  };

  const glowStop = (i: number) => misses >= 2 && !solved && words[i].stop && !stops[i];
  const glowCap = (i: number) => misses >= 2 && !solved && words[i].cap && !caps[i] && !words.some((w, k) => w.stop !== stops[k]);

  return (
    <SceneSvg label="Add capital letters and full stops">
      <text x={500} y={60} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
        Tap a word for a capital letter. Tap a gap for a full stop.
      </text>
      <text x={500} y={94} textAnchor="middle" fontSize={17} fill={C.ink2}>
        How many sentences are hiding here?
      </text>

      {words.map((w, i) => {
        const p = pos[i];
        const text = caps[i] ? cap(w.text) : w.text;
        return (
          <g key={`${index}-${i}`}>
            <g onClick={() => toggleCap(i)} role="button" aria-label={`${text}. Tap to change its first letter.`} style={{ cursor: 'pointer' }} data-nopan>
              {glowCap(i) && <rect x={p.x - 6} y={p.y - 6} width={p.w + 12} height={CARD_H + 12} rx={18} fill={C.yellow} opacity={0.6} />}
              <rect x={p.x} y={p.y} width={p.w} height={CARD_H} rx={14} fill={solved ? shade(C.green, 0.75) : caps[i] ? shade(C.blue, 0.8) : C.card} stroke={C.ink} strokeWidth={2.5} />
              <text x={p.x + p.w / 2} y={p.y + CARD_H / 2 + 2} textAnchor="middle" dominantBaseline="central" fontSize={32} fontWeight={700} fill={C.ink}>
                {text}
              </text>
            </g>
            <g onClick={() => toggleStop(i)} role="button" aria-label={stops[i] ? `Full stop after ${w.text}. Tap to take it away.` : `Gap after ${w.text}. Tap to add a full stop.`} style={{ cursor: 'pointer' }} data-nopan>
              <rect x={p.x + p.w - 2} y={p.y - 4} width={GAP + 4} height={CARD_H + 8} rx={10} fill={glowStop(i) ? C.yellow : 'transparent'} opacity={glowStop(i) ? 0.6 : 1} />
              {stops[i] ? (
                <circle cx={p.x + p.w + GAP / 2} cy={p.y + CARD_H - 12} r={8} fill={C.red} stroke={C.ink} strokeWidth={1.5} />
              ) : (
                <circle cx={p.x + p.w + GAP / 2} cy={p.y + CARD_H - 12} r={5} fill="none" stroke={C.muted} strokeWidth={2} />
              )}
            </g>
          </g>
        );
      })}

      {/* The rule */}
      <rect x={200} y={390} width={600} height={66} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={500} y={430} textAnchor="middle" fontSize={21} fill={C.ink}>
        <tspan fontWeight={700} fill={C.blue}>
          A
        </tspan>{' '}
        sentence starts with a capital and ends with a full stop
        <tspan fontWeight={700} fill={C.red}>
          .
        </tspan>
      </text>

      <SvgButton x={250} y={484} w={160} h={56} fontSize={19} label="Read it" title="Read it aloud as it is now" onClick={() => speak(current(), { force: true })} />
      <SvgButton x={430} y={484} w={160} h={56} fontSize={20} label="Check" onClick={check} color={C.yellow} disabled={solved} />
      <SvgButton x={610} y={484} w={160} h={56} fontSize={18} label="Next" onClick={() => reset((index + 1) % PASSAGES.length)} color={solved ? C.yellow : C.card} />

      <Note x={60} y={576} w={880} h={76} tone={msg?.tone ?? 'plain'} text={msg?.text ?? 'Tip: tap “Read it”. You hear a stop at each full stop. Does it sound right?'} />

      <Callout at={[pos[0].x + pos[0].w + GAP / 2, pos[0].y + CARD_H - 12]} box={[730, 6]} w={230} icon={CircleDot} title="Full stop" text="A full stop shows where a sentence ends. Your voice stops there." />
      <Callout at={[pos[0].x + 10, pos[0].y]} box={[20, 6]} w={220} icon={CaseUpper} title="Capital letter" text="The first word of every sentence gets a capital. So do names." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={18} width={108} height={44} rx={8} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <text x={14} y={46} fontSize={17} fontWeight={700} fill={C.ink}>
        <tspan fill={C.blue}>T</tspan>he sun
      </text>
      <circle cx={80} cy={44} r={4} fill={C.red} />
      <text x={88} y={46} fontSize={17} fontWeight={700} fill={C.blue}>
        W
      </text>
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

/** A line of text for a question card. */
function TextCard({ text, label }: { text: string; label?: string }) {
  const lines = wrapText(text, 26);
  return (
    <svg viewBox={`0 0 420 ${40 + lines.length * 40}`} role="img" aria-label={label ?? text}>
      <rect x={4} y={4} width={412} height={32 + lines.length * 40} rx={14} fill="white" stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={210} y={46 + i * 40} textAnchor="middle" fontSize={28} fontWeight={600} fill={C.ink}>
          {l}
        </text>
      ))}
    </svg>
  );
}

const ONE_SENTENCES = [
  ['the', 'cat', 'sat', 'on', 'the', 'mat'],
  ['a', 'fox', 'ran', 'to', 'the', 'den'],
  ['we', 'had', 'fun', 'in', 'the', 'sun'],
  ['the', 'hen', 'got', 'wet'],
  ['my', 'dog', 'can', 'dig'],
  ['the', 'fish', 'swims', 'fast'],
];

function correctSentence(): Question {
  const s = pick(ONE_SENTENCES);
  const right = `${cap(s[0])} ${s.slice(1).join(' ')}.`;
  return mcq({
    prompt: 'Which sentence is written correctly?',
    answer: right,
    wrong: [`${s.join(' ')}.`, `${cap(s[0])} ${s.slice(1).join(' ')}`],
    hint: 'Check two things: the start of the sentence, and the end.',
    explain: ['A sentence starts with a capital letter.', 'It ends with a full stop.', `So the right one is “${right}”`],
  });
}

function whereItEnds(): Question {
  const p = pick(PASSAGES);
  const [first, second] = p;
  const end = first[first.length - 1];
  const wrongWords = shuffle([...first.slice(1, -1), second[0]].filter((w, i, all) => w !== end && all.indexOf(w) === i)).slice(0, 2);
  const runOn = [...first, ...second].join(' ');
  return mcq({
    prompt: 'Where does the first sentence end?',
    visual: <TextCard text={runOn} />,
    answer: `after ${end}`,
    wrong: wrongWords.map((w) => `after ${w}`),
    hint: 'Read it aloud. Where does the first whole idea finish?',
    explain: [`“${written([first])}” is one whole idea.`, `“${cap(second[0])} ${second.slice(1).join(' ')}…” starts a new idea.`, `So the first sentence ends after ${end}.`],
  });
}

function bestFix(): Question {
  const p = pick(PASSAGES);
  const [first, second] = p;
  const right = written(p);
  const all = [...first, ...second];
  const fmt = (cut: number) => {
    const a = all.slice(0, cut);
    const b = all.slice(cut);
    const s = (ws: string[]) => ws.map((w, i) => (i === 0 || NAMES.includes(w) ? cap(w) : w)).join(' ');
    return `${s(a)}. ${s(b)}.`;
  };
  const runOn = `${cap(all[0])} ${all.slice(1).map((w) => (NAMES.includes(w) ? cap(w) : w)).join(' ')}.`;
  return mcq({
    prompt: 'Which one has the full stops in the right places?',
    answer: right,
    wrong: [runOn, fmt(first.length + 1)],
    hint: 'Read each one aloud. Does every sentence make sense on its own?',
    explain: [`“${written([first])}” makes sense on its own.`, `“${written([second])}” does too.`, `So the right one is “${right}”`],
  });
}

/** Sentences with a name that isn't the first word. */
const NAME_SENTENCES = [
  ['jack', 'and', 'kim', 'got', 'on', 'the', 'bus'],
  ['we', 'met', 'ben', 'at', 'the', 'shop'],
  ['we', 'sat', 'with', 'meg'],
  ['the', 'dog', 'ran', 'to', 'pam'],
  ['a', 'bug', 'got', 'on', 'kim'],
  ['the', 'cat', 'sat', 'with', 'sam'],
];

function nameCapital(): Question {
  const s = pick(NAME_SENTENCES);
  const name = s.find((w, i) => i > 0 && NAMES.includes(w))!;
  const others = shuffle(s.filter((w, i) => i > 0 && w !== name && !NAMES.includes(w) && w.length > 1)).slice(0, 2);
  const shown = s.map((w, i) => (i === 0 ? cap(w) : w)).join(' ');
  return mcq({
    prompt: 'Which word needs a capital letter?',
    visual: <TextCard text={`${shown}.`} />,
    answer: name,
    wrong: others,
    hint: 'The first word already has its capital. Which other words always get one?',
    explain: [`${cap(name)} is somebody's name.`, 'Names always start with a capital letter.', `So ${name} should be ${cap(name)}.`],
  });
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv === 0) return correctSentence();
  if (lv === 1) return Math.random() < 0.6 ? whereItEnds() : nameCapital();
  return Math.random() < 0.6 ? bestFix() : nameCapital();
}

export const capitalsFullStops: Lesson = {
  id: 'capitals-full-stops',
  title: 'Capitals and Full Stops',
  Thumb,
  Scene: FixScene,
  sceneHint: 'Read it aloud · Tap gaps for full stops · Tap words for capitals · Check',
  learn: {
    heading: 'Where sentences start and stop',
    intro: 'A sentence is one whole idea. Readers need to see where each one starts and ends, so writers use capital letters and full stops.',
    points: [
      { icon: CaseUpper, text: 'Start every sentence with a capital letter. Names get one too.' },
      { icon: CircleDot, text: 'End every sentence with a full stop.' },
      { icon: Volume2, text: 'Read your writing aloud: where your voice stops, a full stop goes.' },
    ],
  },
  steps: ['Read the writing aloud.', 'Find where each whole idea ends: put a full stop there.', 'Give the next word a capital letter.', 'Check for names: they need capitals too.'],
  example: {
    question: 'Fix it: “the sun is hot we can swim in the pond”',
    work: ['“the sun is hot” is one whole idea, so put a full stop after hot.', '“we can swim in the pond” is the next idea: full stop after pond.', 'Each sentence starts with a capital: The, We.'],
    answer: 'The sun is hot. We can swim in the pond.',
  },
  grownups: [
    'Young writers often run sentences together with “and then… and then…”. Reading aloud helps them hear where one idea ends.',
    'Ask: “Where would you take a breath?” A full stop usually goes there.',
    'Celebrate a full stop in the right place. Children learn punctuation best in their own writing.',
    'Names (Sam, Kim) need capitals anywhere in a sentence, not just at the start.',
  ],
  makeQuestion,
};
