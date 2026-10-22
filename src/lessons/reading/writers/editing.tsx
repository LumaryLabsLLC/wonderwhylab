import { useState } from 'react';
import { CaseUpper, ListChecks, Repeat2, SpellCheck } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { textWidth, useFontsReady } from '../readers/visuals/measure';
import { Passage } from './visuals/Passage';
import './writers.css';

type Kind = 'capital' | 'spelling' | 'punctuation' | 'repeat' | 'runon';

const KINDS: Kind[] = ['capital', 'spelling', 'punctuation', 'repeat', 'runon'];
const KIND_NAME: Record<Kind, string> = {
  capital: 'Capital letters',
  spelling: 'Spelling',
  punctuation: 'End punctuation',
  repeat: 'Repeated words',
  runon: 'Run-on sentences',
};

const NUDGE: Record<Kind, string> = {
  capital: 'Sentences, names and the word “I” start with a capital letter. Only the first letter is big.',
  spelling: 'Say the word slowly and check each sound.',
  punctuation: 'Does this sentence tell, ask or exclaim?',
  repeat: 'Read it aloud. Do you hear a word twice?',
  runon: 'These are two complete sentences. A comma alone can’t join them.',
};

interface Fix {
  kind: Kind;
  answer: string;
  options: string[];
  why: string;
}
interface Tok {
  text: string;
  fix?: Fix;
}

const f = (text: string, kind: Kind, answer: string, wrong: string[], why: string): Tok => ({ text, fix: { kind, answer, options: [answer, ...wrong], why } });
const words = (s: string): Tok[] => s.split(' ').map((text) => ({ text }));

const START = 'A new sentence starts with a capital letter.';
const RUNON = 'Two sentences were squashed together, so end the first with a full stop and start the next with a capital letter.';

const DRAFTS: Tok[][] = [
  [
    f('on', 'capital', 'On', ['ON'], START),
    ...words('Saturday we went to'),
    f('the the', 'repeat', 'the', ['the, the', 'then the'], '“the” was written twice.'),
    ...words('beach. We'),
    f('biult', 'spelling', 'built', ['bilt', 'buit'], '“Built” is spelled b-u-i-l-t.'),
    ...words('a'),
    f('sandcastle it', 'runon', 'sandcastle. It', ['sandcastle, it', 'sandcastle It'], RUNON),
    ...words('was huge.'),
  ],
  [
    f('my', 'capital', 'My', ['MY'], START),
    ...words('friend Leo and'),
    f('i', 'capital', 'I', ['Me'], 'The word “I” is always a capital letter.'),
    ...words('like football. We play every day after'),
    f('school we', 'runon', 'school. We', ['school, we', 'school We'], RUNON),
    ...words('get really'),
    f('tierd.', 'spelling', 'tired.', ['tyred.', 'tiered.'], '“Tired” is spelled t-i-r-e-d.'),
  ],
  [
    ...words('Have you ever seen a'),
    f('rainbow.', 'punctuation', 'rainbow?', ['rainbow!', 'rainbow,'], 'It asks a question, so it ends with a question mark.'),
    f('rainbows', 'capital', 'Rainbows', ['RAINBOWS'], START),
    f('apear', 'spelling', 'appear', ['appere', 'apeer'], '“Appear” has a double p: a-p-p-e-a-r.'),
    ...words('when sunlight shines through rain.'),
    f('They they', 'repeat', 'They', ['They, they', 'The they'], '“They” was written twice.'),
    ...words('look like a bright arch.'),
  ],
  [
    ...words('We visited the science museum in'),
    f('london.', 'capital', 'London.', ['LONDON.'], 'London is a name, so it starts with a capital letter.'),
    ...words('The dinosaur bones'),
    f('were were', 'repeat', 'were', ['were, were', 'where were'], '“were” was written twice.'),
    f('enormus!', 'spelling', 'enormous!', ['enormos!', 'enormouse!'], '“Enormous” ends in -ous.'),
    ...words('Did you know some were taller than a'),
    f('bus.', 'punctuation', 'bus?', ['bus!', 'bus,'], 'It asks a question, so it ends with a question mark.'),
  ],
];

// ───────────────────────── Scene ─────────────────────────

const FS = 24;
const PAPER = { x: 30, y: 80, w: 650, h: 330 };

function layout(tokens: Tok[], fixed: Record<number, boolean>) {
  const left = PAPER.x + 22;
  const right = PAPER.x + PAPER.w - 22;
  let x = left;
  let y = 160;
  return tokens.map((t, i) => {
    const text = fixed[i] && t.fix ? t.fix.answer : t.text;
    const w = textWidth(text, FS, 500) + 14;
    if (x + w > right) {
      x = left;
      y += 60;
    }
    const at = { i, text, x, y, w };
    x += w + 4;
    return at;
  });
}

function EditingScene() {
  useFontsReady();
  const [index, setIndex] = useState(0);
  const draft = DRAFTS[index % DRAFTS.length];
  const [fixed, setFixed] = useState<Record<number, boolean>>({});
  const [active, setActive] = useState<number | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [shake, setShake] = useState<number | null>(null);
  const [note, setNote] = useState('A proofreader reads slowly. Tap each mistake you find, then choose how to fix it.');
  const placed = layout(draft, fixed);
  const errors = draft.map((t, i) => (t.fix ? i : -1)).filter((i) => i >= 0);
  const done = errors.every((i) => fixed[i]);
  const current = placed.map((p) => p.text).join(' ');
  const left = errors.filter((i) => !fixed[i]).length;

  const load = (i: number) => {
    setIndex(i);
    setFixed({});
    setActive(null);
    setMisses({});
    setNote('A new draft. Read it slowly, then tap each mistake.');
  };

  const tap = (i: number) => {
    const t = draft[i];
    if (fixed[i] || done) return;
    if (!t.fix) {
      play('wrong');
      setShake(i);
      window.setTimeout(() => setShake(null), 460);
      setActive(null);
      setNote(`“${t.text}” looks fine. Keep reading carefully: check capitals, spelling, punctuation and repeats.`);
      return;
    }
    play('tap');
    setActive(i);
    setOptions(shuffle(t.fix.options));
    setNote(`Good spot! How should “${t.text}” be fixed?`);
  };

  const choose = (option: string) => {
    if (active === null) return;
    const fix = draft[active].fix!;
    if (option === fix.answer) {
      play('pop');
      const next = { ...fixed, [active]: true };
      setFixed(next);
      setActive(null);
      if (errors.every((i) => next[i])) {
        play('complete');
        setNote('All four mistakes fixed! Read it aloud once more: careful editing makes writing easy to read.');
      } else setNote(`Fixed! ${fix.why}`);
      return;
    }
    play('wrong');
    const m = (misses[active] ?? 0) + 1;
    setMisses({ ...misses, [active]: m });
    setNote(m >= 2 ? `Here’s how: ${fix.why} Choose “${fix.answer}”.` : `Not yet. ${NUDGE[fix.kind]}`);
  };

  const count = (k: Kind) => errors.filter((i) => draft[i].fix!.kind === k);

  return (
    <SceneSvg label="Editing: find and fix the mistakes in a draft">
      <text x={30} y={46} fontSize={20} fontWeight={700} fill={C.ink}>
        Edit like a pro
      </text>
      <SvgButton x={540} y={16} w={210} h={48} fontSize={16} label="Read it to me" onClick={() => speak(current, { force: true })} />
      <SvgButton x={770} y={16} w={200} h={48} fontSize={16} label="Next draft" color={C.teal} textColor={C.white} onClick={() => load(index + 1)} />

      <rect x={PAPER.x} y={PAPER.y} width={PAPER.w} height={PAPER.h} rx={16} fill={C.card} stroke={C.line} strokeWidth={2} />
      <text x={PAPER.x + 22} y={PAPER.y + 34} fontSize={15} fill={C.muted} className="caps">
        Draft {String.fromCharCode(65 + (index % DRAFTS.length))} · {left} {left === 1 ? 'mistake' : 'mistakes'} left
      </text>
      {[0, 1, 2, 3].map((r) => (
        <line key={r} x1={PAPER.x + 18} x2={PAPER.x + PAPER.w - 18} y1={186 + r * 60} y2={186 + r * 60} stroke={shade(C.blue, 0.8)} strokeWidth={1.5} />
      ))}
      {placed.map((p) => {
        const isFixed = fixed[p.i];
        const isActive = active === p.i;
        return (
          <g key={p.i} onClick={() => tap(p.i)} style={{ cursor: done || isFixed ? undefined : 'pointer' }} data-nopan role="button" aria-label={`Word: ${p.text}`}>
            <g className={shake === p.i ? 'rw-shake' : undefined}>
              <rect
                x={p.x}
                y={p.y - 25}
                width={p.w}
                height={48}
                rx={8}
                fill={isFixed ? shade(C.green, 0.78) : isActive ? shade(C.yellow, 0.55) : 'transparent'}
                stroke={isActive ? C.orange : 'none'}
                strokeWidth={2.5}
              />
              <text
                x={p.x + p.w / 2}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={FS}
                fontWeight={isFixed ? 700 : 500}
                fill={isFixed ? shade(C.green, -0.45) : C.ink}
                className={isFixed ? 'rw-glow' : undefined}
              >
                {p.text}
              </text>
            </g>
          </g>
        );
      })}

      <rect x={700} y={80} width={270} height={330} rx={16} fill={shade(C.paper, 0.4)} stroke={C.line} strokeWidth={2} />
      <text x={718} y={114} fontSize={15} fill={C.muted} className="caps">
        Editing checklist
      </text>
      {KINDS.map((k, r) => {
        const all = count(k);
        const got = all.filter((i) => fixed[i]).length;
        const complete = all.length > 0 && got === all.length;
        return (
          <g key={k} transform={`translate(718 ${146 + r * 54})`}>
            <rect width={28} height={28} rx={7} fill={complete ? C.green : C.card} stroke={all.length ? C.ink : C.line} strokeWidth={2} />
            {complete && <path d="M7 14 L12 20 L22 8" fill="none" stroke={C.white} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />}
            <text x={40} y={14} dominantBaseline="central" fontSize={17} fontWeight={600} fill={all.length ? C.ink : C.muted}>
              {KIND_NAME[k]}
            </text>
            <text x={234} y={14} textAnchor="end" dominantBaseline="central" fontSize={15} fill={C.muted}>
              {all.length ? `${got}/${all.length}` : 'none'}
            </text>
          </g>
        );
      })}

      {active !== null && (
        <g>
          <rect x={30} y={432} width={650} height={92} rx={16} fill={shade(C.yellow, 0.82)} stroke={C.orange} strokeWidth={2} />
          <text x={52} y={468} fontSize={15} fill={shade(C.orange, -0.4)} className="caps">
            Fix it
          </text>
          <text x={52} y={496} fontSize={15} fill={C.ink2}>
            {KIND_NAME[draft[active].fix!.kind]}?
          </text>
          {options.map((o, k) => (
            <SvgButton key={o} x={212 + k * 156} y={450} w={150} h={56} fontSize={18} label={o} onClick={() => choose(o)} />
          ))}
        </g>
      )}
      {done && (
        <text x={355} y={484} textAnchor="middle" fontSize={20} fontWeight={700} fill={shade(C.green, -0.35)}>
          Clean copy! Tap “Read it to me” to hear it.
        </text>
      )}

      {wrap(note, 100).map((line, i) => (
        <text key={i} x={500} y={572 + i * 23} textAnchor="middle" fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}
      <Callout at={[835, 410]} box={[712, 440]} w={250} icon={ListChecks} title="Check one thing at a time" text="Pros read a draft several times, looking for one kind of mistake each time." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={8} y={8} width={104} height={64} rx={8} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      {[24, 40, 56].map((y) => (
        <line key={y} x1={18} x2={100} y1={y} y2={y} stroke={C.line} strokeWidth={4} strokeLinecap="round" />
      ))}
      <rect x={44} y={33} width={30} height={14} rx={3} fill={shade(C.yellow, 0.5)} stroke={C.orange} strokeWidth={1.5} />
      <path d="M78 58 L84 64 L96 50" fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const SPELL: { right: string; wrong: [string, string] }[] = [
  { right: 'because', wrong: ['becuase', 'becos'] },
  { right: 'friend', wrong: ['freind', 'frend'] },
  { right: 'enormous', wrong: ['enormus', 'enormos'] },
  { right: 'appear', wrong: ['apear', 'appere'] },
  { right: 'tired', wrong: ['tierd', 'tird'] },
  { right: 'built', wrong: ['biult', 'bilt'] },
  { right: 'beautiful', wrong: ['beutiful', 'beautifull'] },
  { right: 'different', wrong: ['diffrent', 'differant'] },
];

const SENTENCES: { right: string; wrong: [string, string]; why: string }[] = [
  { right: 'My friend Leo lives in London.', wrong: ['my friend Leo lives in London.', 'My friend leo lives in london.'], why: 'The sentence and the names Leo and London all need capitals.' },
  { right: 'Have you ever seen a rainbow?', wrong: ['Have you ever seen a rainbow.', 'have you ever seen a rainbow?'], why: 'It starts with a capital and asks a question, so it ends with ?.' },
  { right: 'On Saturday we went to the beach.', wrong: ['on Saturday we went to the beach.', 'On saturday we went to the beach.'], why: 'The sentence starts with a capital, and days of the week are names too.' },
  { right: 'Did you know some dinosaurs were taller than a bus?', wrong: ['Did you know some dinosaurs were taller than a bus.', 'did you know some dinosaurs were taller than a bus?'], why: 'It starts with a capital and asks a question, so it ends with ?.' },
];

const RUNONS: { runon: string; right: string; wrong: [string, string] }[] = [
  { runon: 'We built a sandcastle it was huge.', right: 'We built a sandcastle. It was huge.', wrong: ['We built a sandcastle, it was huge.', 'We built a. Sandcastle it was huge.'] },
  { runon: 'The bell rang we ran outside.', right: 'The bell rang. We ran outside.', wrong: ['The bell rang, we ran outside.', 'The bell. Rang we ran outside.'] },
  { runon: 'We play every day after school we get really tired.', right: 'We play every day after school. We get really tired.', wrong: ['We play every day after school, we get really tired.', 'We play every day after school we get. Really tired.'] },
  { runon: 'Owls hunt at night they have amazing hearing.', right: 'Owls hunt at night. They have amazing hearing.', wrong: ['Owls hunt at night, they have amazing hearing.', 'Owls hunt at night they. Have amazing hearing.'] },
];

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const s = pick(SPELL);
    return {
      prompt: 'Which word is spelled correctly?',
      choices: shuffle([s.right, ...s.wrong]).map((value) => ({ value })),
      answer: s.right,
      hint: 'Say each word slowly. Which one has the right letters for every sound?',
      explain: [`Sound it out and check each part.`, `The correct spelling is “${s.right}”.`],
    };
  }
  if (level === 1) {
    const s = pick(SENTENCES);
    return {
      prompt: 'Which sentence has correct capitals and punctuation?',
      choices: shuffle([s.right, ...s.wrong]).map((value) => ({ value })),
      answer: s.right,
      hint: 'Check the first letter, any names, and the mark at the end.',
      explain: [s.why, `The correct one is: ${s.right}`],
    };
  }
  const r = pick(RUNONS);
  return {
    prompt: 'How should this run-on sentence be fixed?',
    visual: <Passage text={r.runon} />,
    choices: shuffle([r.right, ...r.wrong]).map((value) => ({ value })),
    answer: r.right,
    hint: 'Find where one complete idea ends and the next begins. A comma alone isn’t strong enough.',
    explain: ['A run-on squashes two sentences together.', 'A comma alone can’t join two sentences. Use a full stop and a capital letter.', `The fix: ${r.right}`],
  };
}

export const editing: Lesson = {
  id: 'editing',
  title: 'Edit Like a Pro',
  Thumb,
  Scene: EditingScene,
  sceneHint: 'Tap each mistake in the draft · Choose the right fix',
  learn: {
    heading: 'Edit like a pro',
    intro:
      'Every writer makes mistakes in a first draft. Editing is the step where you hunt them down, so readers can enjoy your ideas without tripping over errors.',
    points: [
      { icon: CaseUpper, text: 'Capitals: start of a sentence, names, and the word “I”.' },
      { icon: SpellCheck, text: 'Spelling: say the word slowly and check every sound.' },
      { icon: Repeat2, text: 'Read aloud to catch repeated words and run-on sentences.' },
      { icon: ListChecks, text: 'Use a checklist and look for one kind of mistake at a time.' },
    ],
  },
  steps: [
    'Read the draft aloud, slowly.',
    'Check capitals: sentence starts, names and “I”.',
    'Check spelling: does every word look right?',
    'Check punctuation: does each sentence end with . ? or !',
    'Check for repeated words and run-ons: two sentences need a full stop between them.',
  ],
  example: {
    question: 'Edit: “my friend and i like football we play every day.”',
    work: ['Capitals: “my” starts the sentence, and “i” should be “I”.', 'Run-on: “football” ends one idea, so add a full stop and start “We” with a capital.', 'The last sentence ends with a full stop.'],
    answer: 'My friend and I like football. We play every day.',
  },
  grownups: [
    'Ask your child to read their own writing aloud: ears catch mistakes that eyes skip.',
    'Editing (fixing errors) is different from revising (improving ideas). Both matter, so try them as separate steps.',
    'Praise the hunt, not just perfect copy: “You found three mistakes on your own!”',
  ],
  makeQuestion,
};
