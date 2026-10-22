import { useState } from 'react';
import { ArrowLeftToLine, ArrowRightToLine, Blocks } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken, inside } from './visuals/DragToken';
import { WordCard } from './visuals/Cards';
import { sample, textChoices } from './q';

type Prefix = 'un' | 're' | 'pre' | 'dis';
type Suffix = 'ful' | 'less' | 'ly' | 'er';

const PREFIXES: { p: Prefix; means: string }[] = [
  { p: 'un', means: 'not' },
  { p: 're', means: 'again' },
  { p: 'pre', means: 'before' },
  { p: 'dis', means: 'not' },
];
const SUFFIXES: { s: Suffix; means: string }[] = [
  { s: 'ful', means: 'full of' },
  { s: 'less', means: 'without' },
  { s: 'ly', means: 'in a … way' },
  { s: 'er', means: 'one who / more' },
];

interface Built {
  word: string;
  means: string;
}

/** Real words only: key is "prefix|suffix" (either side may be empty). */
const BASES: { base: string; forms: Record<string, Built> }[] = [
  {
    base: 'help',
    forms: {
      '|ful': { word: 'helpful', means: 'full of help' },
      '|less': { word: 'helpless', means: 'without help' },
      '|er': { word: 'helper', means: 'someone who helps' },
      'un|ful': { word: 'unhelpful', means: 'not helpful' },
    },
  },
  {
    base: 'kind',
    forms: {
      'un|': { word: 'unkind', means: 'not kind' },
      '|ly': { word: 'kindly', means: 'in a kind way' },
      '|er': { word: 'kinder', means: 'more kind' },
      'un|ly': { word: 'unkindly', means: 'in a way that is not kind' },
    },
  },
  {
    base: 'play',
    forms: {
      're|': { word: 'replay', means: 'play again' },
      '|ful': { word: 'playful', means: 'full of play' },
      '|er': { word: 'player', means: 'someone who plays' },
    },
  },
  {
    base: 'fair',
    forms: {
      'un|': { word: 'unfair', means: 'not fair' },
      '|ly': { word: 'fairly', means: 'in a fair way' },
      'un|ly': { word: 'unfairly', means: 'in a way that is not fair' },
    },
  },
  {
    base: 'care',
    forms: {
      '|ful': { word: 'careful', means: 'full of care' },
      '|less': { word: 'careless', means: 'without care' },
    },
  },
  {
    base: 'heat',
    forms: {
      'pre|': { word: 'preheat', means: 'heat before' },
      're|': { word: 'reheat', means: 'heat again' },
      '|er': { word: 'heater', means: 'something that heats' },
    },
  },
  {
    base: 'view',
    forms: {
      'pre|': { word: 'preview', means: 'see before' },
      're|': { word: 'review', means: 'look at again' },
      '|er': { word: 'viewer', means: 'someone who views' },
    },
  },
  {
    base: 'paint',
    forms: {
      're|': { word: 'repaint', means: 'paint again' },
      '|er': { word: 'painter', means: 'someone who paints' },
    },
  },
  {
    base: 'fear',
    forms: {
      '|ful': { word: 'fearful', means: 'full of fear' },
      '|less': { word: 'fearless', means: 'without fear' },
    },
  },
  {
    base: 'hope',
    forms: {
      '|ful': { word: 'hopeful', means: 'full of hope' },
      '|less': { word: 'hopeless', means: 'without hope' },
    },
  },
  {
    base: 'agree',
    forms: { 'dis|': { word: 'disagree', means: 'not agree' } },
  },
  {
    base: 'like',
    forms: { 'dis|': { word: 'dislike', means: 'not like' } },
  },
  {
    base: 'honest',
    forms: {
      'dis|': { word: 'dishonest', means: 'not honest' },
      '|ly': { word: 'honestly', means: 'in an honest way' },
    },
  },
  {
    base: 'read',
    forms: {
      're|': { word: 'reread', means: 'read again' },
      '|er': { word: 'reader', means: 'someone who reads' },
    },
  },
  {
    base: 'loud',
    forms: {
      '|ly': { word: 'loudly', means: 'in a loud way' },
      '|er': { word: 'louder', means: 'more loud' },
    },
  },
  {
    base: 'safe',
    forms: {
      'un|': { word: 'unsafe', means: 'not safe' },
      '|ly': { word: 'safely', means: 'in a safe way' },
    },
  },
];

const ALL_FORMS = BASES.flatMap((b) => Object.entries(b.forms).map(([key, f]) => ({ base: b.base, key, ...f })));

// ───────────────────────── Scene ─────────────────────────

const RAIL_Y = 200;
const SLOT = { w: 130, h: 84 };
const PRE_SLOT = { x: 210, y: RAIL_Y - SLOT.h / 2, ...SLOT };
const SUF_SLOT = { x: 660, y: RAIL_Y - SLOT.h / 2, ...SLOT };
const preX = (i: number) => 95 + i * 105;
const sufX = (i: number) => 590 + i * 105;
const TRAY_Y = 500;

function WordPartsScene() {
  const [baseIndex, setBaseIndex] = useState(0);
  const [prefix, setPrefix] = useState<Prefix | null>(null);
  const [suffix, setSuffix] = useState<Suffix | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('Snap a part onto the front or the end of the word.');

  const b = BASES[baseIndex];
  const built = b.forms[`${prefix ?? ''}|${suffix ?? ''}`];

  const nudge = (id: string, text: string) => {
    play('wrong');
    setShake({ ...shake, [id]: (shake[id] ?? 0) + 1 });
    setMessage(text);
  };

  const tryPrefix = (p: Prefix) => {
    const form = b.forms[`${p}|${suffix ?? ''}`];
    if (!form) {
      const alone = b.forms[`${p}|`];
      return nudge(p, alone ? `“${p}${b.base}${suffix ?? ''}” isn’t a word. Try taking off -${suffix} first.` : `We don’t say “${p}${b.base}”. Try a different part.`);
    }
    play('pop');
    setPrefix(p);
    setSelected(null);
    setMessage(`${p}- means “${PREFIXES.find((x) => x.p === p)!.means}”.`);
  };

  const trySuffix = (s: Suffix) => {
    const form = b.forms[`${prefix ?? ''}|${s}`];
    if (!form) {
      const alone = b.forms[`|${s}`];
      return nudge(s, alone ? `“${prefix}${b.base}${s}” isn’t a word. Try taking off ${prefix}- first.` : `We don’t say “${b.base}${s}”. Try a different part.`);
    }
    play('pop');
    setSuffix(s);
    setSelected(null);
    setMessage(`-${s} means “${SUFFIXES.find((x) => x.s === s)!.means}”.`);
  };

  const dropPart = (id: string, kind: 'pre' | 'suf', p: Pt) => {
    const onPre = inside(p, { x: PRE_SLOT.x - 30, y: PRE_SLOT.y - 40, w: PRE_SLOT.w + 60, h: PRE_SLOT.h + 80 });
    const onSuf = inside(p, { x: SUF_SLOT.x - 30, y: SUF_SLOT.y - 40, w: SUF_SLOT.w + 60, h: SUF_SLOT.h + 80 });
    if (kind === 'pre' && onSuf) return nudge(id, `${id}- is a prefix. Prefixes go at the front of a word.`);
    if (kind === 'suf' && onPre) return nudge(id, `-${id} is a suffix. Suffixes go at the end of a word.`);
    if (kind === 'pre' && onPre) tryPrefix(id as Prefix);
    if (kind === 'suf' && onSuf) trySuffix(id as Suffix);
  };

  const changeBase = (dir: number) => {
    setBaseIndex((baseIndex + dir + BASES.length) % BASES.length);
    setPrefix(null);
    setSuffix(null);
    setSelected(null);
    setMessage('Snap a part onto the front or the end of the word.');
    play('tap');
  };

  const slot = (r: typeof PRE_SLOT, text: string | null, color: string, onClear: () => void, onPlace: () => void, label: string) => (
    <g
      onClick={() => (text ? onClear() : onPlace())}
      style={{ cursor: 'pointer' }}
      data-nopan
      role="button"
      aria-label={text ? `Remove ${label}` : `Put the chosen part here (${label})`}
    >
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={14}
        fill={text ? shade(color, 0.78) : C.white}
        stroke={C.ink}
        strokeWidth={2.5}
        strokeDasharray={text ? undefined : '8 6'}
      />
      <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={text ? 36 : 17} fontWeight={text ? 800 : 500} fill={text ? shade(color, -0.35) : C.muted}>
        {text ?? label}
      </text>
    </g>
  );

  return (
    <SceneSvg label={`Word parts: build words from ${b.base}`}>
      <SvgButton x={330} y={30} w={60} h={56} label="‹" title="Previous base word" onClick={() => changeBase(-1)} />
      <text x={500} y={58} textAnchor="middle" dominantBaseline="central" fontSize={18} fill={C.muted}>
        base word
      </text>
      <SvgButton x={610} y={30} w={60} h={56} label="›" title="Next base word" onClick={() => changeBase(1)} />

      {slot(PRE_SLOT, prefix, C.purple, () => setPrefix(null), () => selected && PREFIXES.some((x) => x.p === selected) && tryPrefix(selected as Prefix), 'prefix')}
      <g transform={`translate(500 ${RAIL_Y})`}>
        <WordCard w={250} h={96} parts={[{ t: b.base }]} fontSize={44} fill={C.card} />
      </g>
      {slot(SUF_SLOT, suffix, C.teal, () => setSuffix(null), () => selected && SUFFIXES.some((x) => x.s === selected) && trySuffix(selected as Suffix), 'suffix')}

      <text x={500} y={300} textAnchor="middle" fontSize={34} fontWeight={800}>
        {prefix && <tspan fill={shade(C.purple, -0.25)}>{prefix}</tspan>}
        <tspan fill={C.ink}>{b.base}</tspan>
        {suffix && <tspan fill={shade(C.teal, -0.3)}>{suffix}</tspan>}
      </text>
      <text x={500} y={340} textAnchor="middle" fontSize={19} fill={C.ink2}>
        {built ? `${prefix ? `${prefix} + ` : ''}${b.base}${suffix ? ` + ${suffix}` : ''} = ${built.word}: ${built.means}` : 'The base word on its own.'}
      </text>
      <text x={500} y={385} textAnchor="middle" fontSize={17} fill={C.ink2}>
        {message}
      </text>

      <text x={190} y={440} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        Prefixes (front)
      </text>
      {PREFIXES.map(({ p, means }, i) => (
        <g key={p}>
          <DragToken
            x={preX(i)}
            y={TRAY_Y}
            label={`Prefix ${p}, means ${means}`}
            selected={selected === p}
            shakeKey={shake[p] ?? 0}
            onTap={() => {
              play('tap');
              setSelected(selected === p ? null : p);
            }}
            onDrop={(pt) => dropPart(p, 'pre', pt)}
          >
            <WordCard w={92} h={62} parts={[{ t: `${p}-`, c: shade(C.purple, -0.25), bold: true }]} fontSize={26} state={selected === p ? 'selected' : 'idle'} />
          </DragToken>
          <text x={preX(i)} y={TRAY_Y + 52} textAnchor="middle" fontSize={15} fill={C.ink2}>
            {means}
          </text>
        </g>
      ))}

      <text x={748} y={440} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        Suffixes (end)
      </text>
      {SUFFIXES.map(({ s, means }, i) => (
        <g key={s}>
          <DragToken
            x={sufX(i)}
            y={TRAY_Y}
            label={`Suffix ${s}, means ${means}`}
            selected={selected === s}
            shakeKey={shake[s] ?? 0}
            onTap={() => {
              play('tap');
              setSelected(selected === s ? null : s);
            }}
            onDrop={(pt) => dropPart(s, 'suf', pt)}
          >
            <WordCard w={92} h={62} parts={[{ t: `-${s}`, c: shade(C.teal, -0.3), bold: true }]} fontSize={26} state={selected === s ? 'selected' : 'idle'} />
          </DragToken>
          <text x={sufX(i)} y={TRAY_Y + 52} textAnchor="middle" fontSize={15} fill={C.ink2}>
            {means}
          </text>
        </g>
      ))}

      <SvgButton x={420} y={590} w={160} h={52} fontSize={17} label="Say it" title="Hear the word" onClick={() => speak(built?.word ?? b.base, { force: true })} />

      <Callout at={[PRE_SLOT.x + 20, PRE_SLOT.y + 10]} box={[40, 110]} w={170} icon={ArrowLeftToLine} title="Prefix" text="A part at the front that changes the meaning." />
      <Callout at={[SUF_SLOT.x + SUF_SLOT.w - 20, SUF_SLOT.y + 10]} box={[800, 110]} w={170} icon={ArrowRightToLine} title="Suffix" text="A part at the end that changes the meaning." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={26} width={30} height={28} rx={6} fill={shade(C.purple, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={21} y={45} textAnchor="middle" fontSize={13} fontWeight={800} fill={shade(C.purple, -0.3)}>un</text>
      <rect x={40} y={22} width={44} height={36} rx={6} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <text x={62} y={45} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>kind</text>
      <rect x={88} y={26} width={28} height={28} rx={6} fill={shade(C.teal, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={102} y={45} textAnchor="middle" fontSize={13} fontWeight={800} fill={shade(C.teal, -0.3)}>ly</text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

/** Words where the part has its most common meaning (good for level 0). */
const SIMPLE: { word: string; part: string; kind: 'prefix' | 'suffix'; means: string; base: string }[] = [
  { word: 'unkind', part: 'un', kind: 'prefix', means: 'not', base: 'kind' },
  { word: 'unfair', part: 'un', kind: 'prefix', means: 'not', base: 'fair' },
  { word: 'unsafe', part: 'un', kind: 'prefix', means: 'not', base: 'safe' },
  { word: 'replay', part: 're', kind: 'prefix', means: 'again', base: 'play' },
  { word: 'reread', part: 're', kind: 'prefix', means: 'again', base: 'read' },
  { word: 'repaint', part: 're', kind: 'prefix', means: 'again', base: 'paint' },
  { word: 'preheat', part: 'pre', kind: 'prefix', means: 'before', base: 'heat' },
  { word: 'preview', part: 'pre', kind: 'prefix', means: 'before', base: 'view' },
  { word: 'dislike', part: 'dis', kind: 'prefix', means: 'not', base: 'like' },
  { word: 'disagree', part: 'dis', kind: 'prefix', means: 'not', base: 'agree' },
  { word: 'helpful', part: 'ful', kind: 'suffix', means: 'full of', base: 'help' },
  { word: 'hopeful', part: 'ful', kind: 'suffix', means: 'full of', base: 'hope' },
  { word: 'careless', part: 'less', kind: 'suffix', means: 'without', base: 'care' },
  { word: 'fearless', part: 'less', kind: 'suffix', means: 'without', base: 'fear' },
  { word: 'player', part: 'er', kind: 'suffix', means: 'someone who', base: 'play' },
  { word: 'painter', part: 'er', kind: 'suffix', means: 'someone who', base: 'paint' },
];
const PART_MEANINGS = ['not', 'again', 'before', 'full of', 'without', 'someone who'];

/** What a suffix means in this particular word (-er has more than one meaning). */
function sufMeaning(suf: Suffix, means: string): string {
  if (suf !== 'er') return SUFFIXES.find((x) => x.s === suf)!.means;
  if (means.startsWith('more')) return 'more';
  if (means.startsWith('something')) return 'something that';
  return 'someone who';
}

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const q = pick(SIMPLE);
    const shown = q.kind === 'prefix' ? `${q.part}-` : `-${q.part}`;
    return {
      prompt: `What does the ${q.kind} “${shown}” mean in “${q.word}”?`,
      choices: textChoices(q.means, PART_MEANINGS.filter((m) => m !== q.means)),
      answer: q.means,
      hint: `Cover up the base word “${q.base}”. What does the leftover part add to it?`,
      explain: [
        `Split the word: ${q.kind === 'prefix' ? `${q.part} + ${q.base}` : `${q.base} + ${q.part}`}.`,
        `${shown} means “${q.means}”.`,
        `So ${q.word} means ${q.part === 'er' ? `someone who ${q.base}s` : `${q.means} ${q.base}`}.`,
      ],
    };
  }
  if (level === 1) {
    const target = pick(ALL_FORMS.filter((f) => f.key.split('|').filter(Boolean).length === 1));
    const [tp, ts] = target.key.split('|');
    const partText = tp ? `the prefix ${tp}-` : `the suffix -${ts}`;
    const others = ALL_FORMS.filter((f) => f.word !== target.word && (f.base === target.base || f.key === target.key)).map((f) => f.word);
    const extra = sample(ALL_FORMS.filter((f) => f.word !== target.word), 3).map((f) => f.word);
    return {
      prompt: `Which word means “${target.means}”?`,
      choices: textChoices(target.word, [...others, ...extra]),
      answer: target.word,
      hint: 'Find the base word first, then check what each prefix or suffix adds.',
      explain: [
        `The base word is “${target.base}”.`,
        `${partText[0].toUpperCase()}${partText.slice(1)} turns it into ${tp ? `${tp}${target.base}` : target.word}.`,
        `${target.word} means “${target.means}”.`,
      ],
    };
  }
  // Level 2: two parts, or choosing the meaning among close cousins of the same base.
  const rich = BASES.filter((b) => Object.keys(b.forms).length >= 3);
  const b = pick(rich);
  const forms = Object.values(b.forms);
  const target = pick(forms);
  const otherMeans = forms.filter((f) => f.word !== target.word).map((f) => f.means);
  const [pre, suf] = Object.entries(b.forms).find(([, f]) => f.word === target.word)![0].split('|');
  return {
    prompt: `What does “${target.word}” mean?`,
    choices: textChoices(target.means, otherMeans),
    answer: target.means,
    hint: 'Split the word into prefix, base word and suffix. What does each part add?',
    explain: [
      `Split it: ${[pre, b.base, suf].filter(Boolean).join(' + ')}.`,
      [pre && `${pre}- means “${PREFIXES.find((x) => x.p === pre)!.means}”`, suf && `-${suf} means “${sufMeaning(suf as Suffix, target.means)}”`]
        .filter(Boolean)
        .join(', and ') + '.',
      `So ${target.word} means ${target.means}.`,
    ],
  };
}

export const prefixesSuffixes: Lesson = {
  id: 'prefixes-suffixes',
  title: 'Word Parts',
  Thumb,
  Scene: WordPartsScene,
  sceneHint: 'Drag a prefix to the front or a suffix to the end of the base word',
  learn: {
    heading: 'Prefixes and suffixes',
    intro:
      'Many long words are short words with parts added. A prefix goes at the front and a suffix goes at the end. If you know what the parts mean, you can work out new words.',
    points: [
      { icon: ArrowLeftToLine, text: 'un- and dis- mean “not”. re- means “again”. pre- means “before”.' },
      { icon: ArrowRightToLine, text: '-ful means “full of”, -less means “without”, -ly means “in a … way”.' },
      { icon: Blocks, text: '-er can mean “someone who” (player) or “more” (louder).' },
    ],
  },
  steps: [
    'Find the base word in the middle (help in unhelpful).',
    'Look at the front: is there a prefix? What does it mean?',
    'Look at the end: is there a suffix? What does it mean?',
    'Put the meanings together, then check the word makes sense in the sentence.',
  ],
  example: {
    question: 'What does “unhelpful” mean?',
    work: ['Split it: un + help + ful.', 'help + ful = helpful, “full of help”.', 'un- means “not”, so unhelpful means not helpful.'],
    answer: 'Unhelpful means “not helpful”.',
  },
  grownups: [
    'Word parts (morphology) help children read and understand long words, and the benefit grows through the school years.',
    'Play “part spotting” in books or signs: find a word with re-, un- or -ful and talk about what it means.',
    'Not every word that starts with the same letters has a prefix: “uncle” and “read” are not un- or re- words. Check by covering the part: is a real word left?',
    'Some suffixes change spelling (happy → happily). This lesson uses words that don’t change, so the parts are easy to see.',
  ],
  makeQuestion,
};
