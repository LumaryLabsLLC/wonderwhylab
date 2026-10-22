import { useMemo, useState } from 'react';
import { ArrowRightLeft, ListOrdered, Wrench } from 'lucide-react';
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

type Structure = 'sequence' | 'cause' | 'compare' | 'problem';

const STRUCTURES: { id: Structure; name: string; signals: string; color: string }[] = [
  { id: 'sequence', name: 'Sequence', signals: 'first, next, then, finally', color: C.blue },
  { id: 'cause', name: 'Cause and effect', signals: 'because, so, as a result', color: C.orange },
  { id: 'compare', name: 'Compare and contrast', signals: 'both, however, while, unlike', color: C.purple },
  { id: 'problem', name: 'Problem and solution', signals: 'the problem, to solve, now', color: C.green },
];

const NAME: Record<Structure, string> = Object.fromEntries(STRUCTURES.map((s) => [s.id, s.name])) as Record<Structure, string>;

const PURPOSE: Record<Structure, string> = {
  sequence: 'Sequence signal words put steps or events in order.',
  cause: 'Cause and effect signal words show why something happened and what happened next.',
  compare: 'Compare and contrast signal words show how things are alike and different.',
  problem: 'Problem and solution signal words name a problem and how it was fixed.',
};

interface ScenePassage {
  structure: Structure;
  text: string;
  signals: string[];
  /** What the passage looks like in its organiser. */
  parts: { label: string; text: string }[];
}

const SCENE_PASSAGES: ScenePassage[] = [
  {
    structure: 'sequence',
    text: 'To plant a bean, first fill a cup with soil. Next, push the bean about two centimetres deep. Then water it gently. Finally, put the cup in a sunny spot.',
    signals: ['first', 'Next', 'Then', 'Finally'],
    parts: [
      { label: '1', text: 'Fill a cup with soil' },
      { label: '2', text: 'Push the bean in' },
      { label: '3', text: 'Water it gently' },
      { label: '4', text: 'Put it in the sun' },
    ],
  },
  {
    structure: 'cause',
    text: 'Because the river flooded, the main road was closed. As a result, the school bus took a longer way, so everyone arrived late.',
    signals: ['Because', 'As a result', 'so'],
    parts: [
      { label: 'Cause', text: 'The river flooded' },
      { label: 'Effect', text: 'The road was closed' },
      { label: 'Effect', text: 'Bus took the long way' },
      { label: 'Effect', text: 'Everyone was late' },
    ],
  },
  {
    structure: 'compare',
    text: 'Frogs and toads are both amphibians. However, frogs have smooth, wet skin, while toads have dry, bumpy skin. Frogs also tend to have longer legs for jumping.',
    signals: ['both', 'However', 'while'],
    parts: [
      { label: 'Both', text: 'Amphibians' },
      { label: 'Frogs', text: 'Smooth skin, long legs' },
      { label: 'Toads', text: 'Dry, bumpy skin' },
    ],
  },
  {
    structure: 'problem',
    text: 'The problem was that the class garden dried out every weekend. To solve it, the students made drip bottles that slowly water the plants. Now the soil stays damp until Monday.',
    signals: ['The problem', 'To solve it', 'Now'],
    parts: [
      { label: 'Problem', text: 'Garden dried out' },
      { label: 'Solution', text: 'Drip bottles' },
      { label: 'Result', text: 'Soil stays damp' },
    ],
  },
];

interface PracticePassage {
  structure: Structure;
  text: string;
  signals: string[];
  detail: { q: string; a: string; wrong: [string, string] };
}

const PRACTICE: PracticePassage[] = [
  {
    structure: 'sequence',
    text: 'First, mix the flour and sugar. Then add the eggs and stir. After that, pour the mixture into a tin. Last, bake it for twenty minutes.',
    signals: ['First', 'Then', 'After that', 'Last'],
    detail: { q: 'What do you do right after stirring in the eggs?', a: 'Pour the mixture into a tin', wrong: ['Mix the flour and sugar', 'Add the eggs'] },
  },
  {
    structure: 'sequence',
    text: 'The caterpillar hatched from its egg. Next, it ate leaves for two weeks. Later, it made a chrysalis. Finally, a butterfly came out.',
    signals: ['Next', 'Later', 'Finally'],
    detail: { q: 'What happened just before the butterfly came out?', a: 'It made a chrysalis', wrong: ['It hatched from an egg', 'It laid eggs'] },
  },
  {
    structure: 'cause',
    text: 'The wind blew so hard that a tree fell onto the power lines. Because of this, the lights went out across the town.',
    signals: ['so hard that', 'Because of this'],
    detail: { q: 'What caused the lights to go out?', a: 'A tree fell onto the power lines', wrong: ['The town turned them off', 'It got dark at night'] },
  },
  {
    structure: 'cause',
    text: 'Ella forgot to water her plant for two weeks. As a result, its leaves turned brown and dry.',
    signals: ['As a result'],
    detail: { q: 'What was the effect of not watering the plant?', a: 'Its leaves turned brown and dry', wrong: ['It grew taller', 'It grew new flowers'] },
  },
  {
    structure: 'compare',
    text: 'Cats and dogs can both make good pets. Dogs usually need a walk every day. Cats, on the other hand, are happy to stay inside.',
    signals: ['both', 'on the other hand'],
    detail: { q: 'How are cats different from dogs in this text?', a: 'Cats don’t need daily walks', wrong: ['Cats make bad pets', 'Cats need two walks a day'] },
  },
  {
    structure: 'compare',
    text: 'The Sun and the Moon both light up our sky. Unlike the Sun, the Moon does not make its own light; it reflects sunlight.',
    signals: ['both', 'Unlike'],
    detail: { q: 'What is one difference between the Sun and the Moon?', a: 'The Moon reflects sunlight instead of making light', wrong: ['Only the Moon lights up the sky', 'The Sun reflects moonlight'] },
  },
  {
    structure: 'problem',
    text: 'Our reading corner had a problem: it was always messy. To fix it, we made labelled baskets for each kind of book. Now it stays tidy.',
    signals: ['a problem', 'To fix it', 'Now'],
    detail: { q: 'What was the solution?', a: 'They made labelled baskets for the books', wrong: ['They stopped reading', 'They threw the books away'] },
  },
  {
    structure: 'problem',
    text: 'Litter kept blowing into the school pond. The students solved this by putting lids on the bins near the pond.',
    signals: ['solved this'],
    detail: { q: 'What was the problem?', a: 'Litter kept blowing into the pond', wrong: ['The pond was too small', 'The bins were too heavy'] },
  },
];

const ORG_W = 227;
const orgRect = (i: number): Rect => ({ x: 30 + i * (ORG_W + 10), y: 284, w: ORG_W, h: 380 });
const chipW = (t: string) => Math.max(110, t.length * 19 * 0.6 + 36);

interface Tok {
  text: string;
  signal: boolean;
}

/** Split a passage into words, marking the words that belong to signal phrases. */
function tokenize(text: string, signals: string[]): Tok[] {
  const words = text.split(' ');
  const clean = (w: string) => w.replace(/[.,;:!?]/g, '').toLowerCase();
  const marks = new Array(words.length).fill(false);
  for (const sig of signals) {
    const parts = sig.toLowerCase().split(' ');
    for (let i = 0; i + parts.length <= words.length; i++) {
      if (parts.every((p, k) => clean(words[i + k]) === p)) {
        for (let k = 0; k < parts.length; k++) marks[i + k] = true;
        break;
      }
    }
  }
  return words.map((w, i) => ({ text: w, signal: marks[i] }));
}

function StructureScene() {
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [message, setMessage] = useState('Drag each orange signal word onto the organiser it belongs to.');
  const passage = SCENE_PASSAGES[index];
  const target = STRUCTURES.findIndex((s) => s.id === passage.structure);
  const solved = placed.length === passage.signals.length;

  // Lines of the passage, each a list of tokens.
  const lines = useMemo(() => {
    const toks = tokenize(passage.text, passage.signals);
    const out: Tok[][] = [[]];
    let len = 0;
    for (const t of toks) {
      if (len + t.text.length + 1 > 88 && out[out.length - 1].length) {
        out.push([]);
        len = 0;
      }
      out[out.length - 1].push(t);
      len += t.text.length + 1;
    }
    return out;
  }, [passage]);

  const chips = useMemo(() => {
    let x = 40;
    return passage.signals.map((sg) => {
      const w = chipW(sg);
      const c = { sg, w, x: x + w / 2 };
      x += w + 12;
      return c;
    });
  }, [passage]);

  const drop = (sg: string, i: number) => {
    if (i === target) {
      const next = [...placed, sg];
      setPlaced(next);
      setSelected(null);
      play(next.length === passage.signals.length ? 'correct' : 'pop');
      setMessage(next.length === passage.signals.length ? `Yes! ${PURPOSE[passage.structure]}` : `“${sg}” fits. Keep going!`);
    } else {
      setShake(sg);
      window.setTimeout(() => setShake(null), 460);
      setMessage(`Not ${NAME[STRUCTURES[i].id].toLowerCase()} this time. What job does “${sg}” do?`);
      play('wrong');
    }
  };

  const onDrop = (sg: string, c: Pt) => {
    const i = STRUCTURES.findIndex((_, k) => inRect(c, orgRect(k)));
    if (i >= 0) drop(sg, i);
  };

  const next = () => {
    setIndex((index + 1) % SCENE_PASSAGES.length);
    setPlaced([]);
    setSelected(null);
    setMessage('Drag each orange signal word onto the organiser it belongs to.');
  };

  return (
    <SceneSvg label="Passage with signal words to drag onto graphic organisers">
      <text x={40} y={42} fontSize={20} fontWeight={700} fill={C.ink}>
        How is this text organised?
      </text>
      <rect x={40} y={58} width={920} height={140} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      {lines.map((line, i) => (
        <text key={i} x={62} y={94 + i * 30} fontSize={19} fill={C.ink}>
          {line.map((t, k) => (
            <tspan key={k} fontWeight={t.signal ? 800 : 400} fill={t.signal ? shade(C.orange, -0.25) : C.ink}>
              {t.text}
              {k < line.length - 1 ? ' ' : ''}
            </tspan>
          ))}
        </text>
      ))}

      {/* Organisers */}
      {STRUCTURES.map((s, i) => {
        const r = orgRect(i);
        const done = solved && i === target;
        return (
          <g key={s.id}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill={shade(s.color, done ? 0.75 : 0.88)} stroke={s.color} strokeWidth={done ? 4 : 2.5} />
            {wrap(s.name, 16).map((line, j) => (
              <text key={j} x={r.x + 14} y={r.y + 30 + j * 24} fontSize={20} fontWeight={800} fill={shade(s.color, -0.4)}>
                {line}
              </text>
            ))}
            {wrap(s.signals, 26).map((line, j) => (
              <text key={j} x={r.x + 14} y={r.y + 92 + j * 18} fontSize={14} fill={C.ink2} fontStyle="italic">
                {line}
              </text>
            ))}
            {done ? (
              passage.parts.map((p, j) => (
                <g key={j}>
                  <rect x={r.x + 12} y={r.y + 132 + j * 60} width={r.w - 24} height={50} rx={10} fill={C.card} stroke={s.color} strokeWidth={2} />
                  <text x={r.x + 22} y={r.y + 151 + j * 60} fontSize={12.5} fontWeight={700} fill={shade(s.color, -0.4)}>
                    {p.label}
                  </text>
                  <text x={r.x + 22} y={r.y + 170 + j * 60} fontSize={13.5} fill={C.ink}>
                    {p.text.length > 24 ? `${p.text.slice(0, 23)}…` : p.text}
                  </text>
                  {j < passage.parts.length - 1 && passage.structure !== 'compare' && (
                    <path d={`M${r.x + r.w / 2} ${r.y + 182 + j * 60} v9`} stroke={s.color} strokeWidth={3} />
                  )}
                </g>
              ))
            ) : (
              <OrganiserSketch structure={s.id} r={r} color={s.color} />
            )}
            {placed.length > 0 && i === target && !solved && (
              <text x={r.x + 14} y={r.y + r.h - 16} fontSize={14} fontWeight={700} fill={shade(s.color, -0.4)}>
                {placed.length} / {passage.signals.length} signal words
              </text>
            )}
          </g>
        );
      })}
      {selected &&
        STRUCTURES.map((s, i) => {
          const r = orgRect(i);
          return (
            <rect key={`t-${s.id}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill="transparent" stroke={C.orange} strokeWidth={3} strokeDasharray="10 8" style={{ cursor: 'pointer' }} data-nopan onClick={() => drop(selected, i)} />
          );
        })}

      {/* Message + controls */}
      <text x={40} y={268} fontSize={15.5} fill={solved ? shade(C.green, -0.3) : C.ink2} fontWeight={solved ? 700 : 400}>
        {message.length > 100 ? `${message.slice(0, 98)}…` : message}
      </text>
      <SvgButton x={724} y={208} w={110} h={44} fontSize={15} label="Read it" onClick={() => speak(passage.text, { force: true })} />
      <SvgButton x={846} y={208} w={114} h={44} fontSize={15} label="Next text" color={solved ? C.yellow : C.card} onClick={next} />

      {/* Signal word chips (drawn last so they move above the organisers) */}
      {chips
        .filter((c) => !placed.includes(c.sg))
        .map((c) => (
          <DragChip
            key={`${index}-${c.sg}`}
            x={c.x}
            y={230}
            w={c.w}
            h={44}
            lines={[c.sg]}
            label={`Signal words: ${c.sg}`}
            fontSize={19}
            fill={shade(C.orange, 0.7)}
            selected={selected === c.sg}
            shake={shake === c.sg}
            onDrop={(p) => onDrop(c.sg, p)}
            onTap={() => {
              setSelected(selected === c.sg ? null : c.sg);
              play('tap');
            }}
          />
        ))}

      <Callout at={[120, 230]} box={[480, 4]} w={230} icon={ListOrdered} title="Signal words" text="Little words that show how ideas are linked." />
    </SceneSvg>
  );
}

/** A tiny picture of each organiser before it is filled in. */
function OrganiserSketch({ structure, r, color }: { structure: Structure; r: Rect; color: string }) {
  const cx = r.x + r.w / 2;
  const top = r.y + 150;
  const box = (x: number, y: number, w: number, label: string) => (
    <g>
      <rect x={x} y={y} width={w} height={40} rx={8} fill={C.card} stroke={color} strokeWidth={2} />
      <text x={x + w / 2} y={y + 21} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={C.muted}>
        {label}
      </text>
    </g>
  );
  const arrow = (x: number, y: number) => <path d={`M${x} ${y} v14 m-6 -6 l6 6 l6 -6`} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />;
  if (structure === 'sequence') {
    return (
      <g>
        {box(r.x + 30, top, r.w - 60, 'step 1')}
        {arrow(cx, top + 44)}
        {box(r.x + 30, top + 62, r.w - 60, 'step 2')}
        {arrow(cx, top + 106)}
        {box(r.x + 30, top + 124, r.w - 60, 'step 3')}
      </g>
    );
  }
  if (structure === 'cause') {
    return (
      <g>
        {box(r.x + 30, top, r.w - 60, 'cause')}
        {arrow(cx, top + 44)}
        {box(r.x + 30, top + 62, r.w - 60, 'effect')}
      </g>
    );
  }
  if (structure === 'compare') {
    return (
      <g>
        <circle cx={cx - 34} cy={top + 70} r={58} fill={shade(color, 0.8)} stroke={color} strokeWidth={2} opacity={0.9} />
        <circle cx={cx + 34} cy={top + 70} r={58} fill={shade(color, 0.8)} stroke={color} strokeWidth={2} opacity={0.9} />
        <text x={cx} y={top + 74} textAnchor="middle" fontSize={13} fill={C.muted}>both</text>
      </g>
    );
  }
  return (
    <g>
      {box(r.x + 30, top, r.w - 60, 'problem')}
      {arrow(cx, top + 44)}
      {box(r.x + 30, top + 62, r.w - 60, 'solution')}
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={8} width={108} height={22} rx={6} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <rect x={12} y={14} width={22} height={9} rx={3} fill={shade(C.orange, 0.5)} />
      {[C.blue, C.orange, C.purple, C.green].map((c, i) => (
        <rect key={c} x={6 + i * 28} y={38} width={24} height={34} rx={5} fill={shade(c, 0.7)} stroke={c} strokeWidth={2} />
      ))}
    </svg>
  );
}

const SIGNAL_BANK: Record<Structure, string[]> = {
  sequence: ['first', 'next', 'then', 'finally'],
  cause: ['because', 'as a result', 'so that'],
  compare: ['however', 'both', 'unlike'],
  problem: ['the problem is', 'to solve this', 'one solution'],
};

const article = (s: Structure) => (s === 'sequence' ? 'a sequence' : NAME[s].toLowerCase());

function makeQuestion(level: number): Question {
  if (level === 0) {
    const s = pick(STRUCTURES).id;
    const right = pick(SIGNAL_BANK[s]);
    const others = STRUCTURES.filter((o) => o.id !== s).map((o) => pick(SIGNAL_BANK[o.id]));
    return {
      prompt: `Which signal word usually shows ${article(s)}?`,
      choices: shuffle([right, ...others]).map((value) => ({ value })),
      answer: right,
      hint: `What job does ${article(s)} text do? Find the word that does that job.`,
      explain: [PURPOSE[s], `“${right}” is one of those signal words.`, `So “${right}” shows ${article(s)}.`],
    };
  }
  if (level === 1) {
    const p = pick([...PRACTICE, ...SCENE_PASSAGES]);
    return {
      prompt: 'How is this text organised?',
      visual: <Passage text={tokenize(p.text, p.signals).map((t) => (t.signal ? `*${t.text}*` : t.text)).join(' ').replace(/\* \*/g, ' ')} />,
      choices: STRUCTURES.map((s) => ({ value: s.name })),
      answer: NAME[p.structure],
      hint: 'Look at the highlighted signal words. What job do they do?',
      explain: [`Signal words: ${p.signals.map((s) => `“${s}”`).join(', ')}.`, PURPOSE[p.structure], `So the structure is ${NAME[p.structure]}.`],
    };
  }
  const p = pick(PRACTICE);
  return {
    prompt: p.detail.q,
    visual: <Passage text={p.text} />,
    choices: shuffle([p.detail.a, ...p.detail.wrong]).map((value) => ({ value })),
    answer: p.detail.a,
    hint: `This is ${article(p.structure)} text. Use that pattern to find the answer.`,
    explain: [`The text is organised as ${NAME[p.structure].toLowerCase()}.`, `Signal words like “${p.signals[0]}” point to the key part.`, `The answer is: ${p.detail.a}.`],
  };
}

export const textStructure: Lesson = {
  id: 'text-structure',
  title: 'Text Structure',
  Thumb,
  Scene: StructureScene,
  sceneHint: 'Drag signal words onto the matching organiser',
  learn: {
    heading: 'How texts are organised',
    intro:
      'Writers organise information in patterns. Spotting the pattern helps you understand and remember what you read. Signal words are the clues.',
    points: [
      { icon: ListOrdered, text: 'Sequence: steps in order (first, next, finally).' },
      { icon: ArrowRightLeft, text: 'Cause and effect (because, so) and compare and contrast (both, however).' },
      { icon: Wrench, text: 'Problem and solution: something goes wrong and gets fixed (to solve this).' },
    ],
  },
  steps: [
    'Skim the text for signal words.',
    'Ask what job those words do: order, why, alike and different, or fixing a problem?',
    'Pick the organiser that matches.',
    'Use the organiser to sort the main ideas.',
  ],
  example: {
    question: 'How is this text organised?',
    visual: <Passage text="*Because* the river flooded, the road was closed. *As a result*, the bus took a longer way, *so* everyone was late." />,
    work: ['Signal words: because, as a result, so.', 'They show why things happened and what happened next.', 'The flood caused three effects.'],
    answer: 'Cause and effect.',
  },
  grownups: [
    'Non-fiction books and recipes are full of text structures. Ask “what pattern is this page using?”',
    'Drawing a quick organiser (a flow chart or a Venn diagram) after reading is a proven way to remember information.',
    'Some texts mix structures; it’s fine to say “mostly compare and contrast”.',
  ],
  makeQuestion,
};
