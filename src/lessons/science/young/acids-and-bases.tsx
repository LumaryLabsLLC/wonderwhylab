import { useRef, useState } from 'react';
import { Palette, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

/** Universal indicator colours for pH 0–14. */
const PH_COLORS = [
  '#d7263d', '#e8412f', '#f05a2a', '#f47c26', '#f79a24', '#f5bf2f', '#d3d33f', '#6cbf47',
  '#2fa36b', '#21948a', '#2b7cc0', '#3a5fb5', '#5146ad', '#62379c', '#5a2a7a',
];
export const phColor = (ph: number) => PH_COLORS[Math.max(0, Math.min(14, Math.round(ph)))];
export const phKind = (ph: number) => (ph < 7 ? 'acid' : ph > 7 ? 'base' : 'neutral');

interface Substance {
  name: string;
  ph: number;
  liquid: string;
}

/** Typical, approximate pH values. */
export const SUBSTANCES: Substance[] = [
  { name: 'lemon juice', ph: 2, liquid: '#f7e27a' },
  { name: 'vinegar', ph: 3, liquid: '#f3eadb' },
  { name: 'milk', ph: 6.5, liquid: '#ffffff' },
  { name: 'pure water', ph: 7, liquid: '#d6eefb' },
  { name: 'baking soda water', ph: 9, liquid: '#eef2f4' },
  { name: 'soapy water', ph: 10, liquid: '#f6dcef' },
  { name: 'bleach', ph: 12, liquid: '#f4f6c9' },
];

const BEAKER_X = (i: number) => 120 + i * 126;
const BEAKER_TOP = 300;
const LIQUID_TOP = 340;
const BEAKER_BOTTOM = 432;
const SCALE = { x: 90, y: 560, w: 820 };
const HOLDER = { x: 900, y: 140 };

function Beaker({ x, s, tested, onTap }: { x: number; s: Substance; tested: boolean; onTap: () => void }) {
  return (
    <g onClick={onTap} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Test ${s.name}`}>
      <path d={`M${x - 46},${LIQUID_TOP} L${x - 42},${BEAKER_BOTTOM - 8} Q${x - 42},${BEAKER_BOTTOM} ${x - 34},${BEAKER_BOTTOM} L${x + 34},${BEAKER_BOTTOM} Q${x + 42},${BEAKER_BOTTOM} ${x + 42},${BEAKER_BOTTOM - 8} L${x + 46},${LIQUID_TOP} Z`} fill={s.liquid} />
      <path
        d={`M${x - 50},${BEAKER_TOP} L${x - 42},${BEAKER_BOTTOM - 8} Q${x - 42},${BEAKER_BOTTOM} ${x - 34},${BEAKER_BOTTOM} L${x + 34},${BEAKER_BOTTOM} Q${x + 42},${BEAKER_BOTTOM} ${x + 42},${BEAKER_BOTTOM - 8} L${x + 50},${BEAKER_TOP}`}
        fill="none"
        stroke={tested ? C.teal : C.ink}
        strokeWidth={tested ? 4 : 2.5}
        strokeLinejoin="round"
      />
      <line x1={x - 50} y1={BEAKER_TOP} x2={x - 58} y2={BEAKER_TOP - 6} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
      <text x={x} y={BEAKER_BOTTOM + 24} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
        {s.name}
      </text>
    </g>
  );
}

/** What colour the indicator paper turns, in words. */
const COLOR_WORD: Record<number, string> = { 2: 'red', 3: 'orange', 7: 'green', 9: 'blue-green', 10: 'blue', 12: 'purple' };

interface LiquidChallenge extends Challenge {
  index: number;
}

/** Predict → observe → explain: will this liquid be an acid or a base? (Milk is left out: at about pH 6.5 it is too close to call.) */
function liquidChallenge(prev: LiquidChallenge | null): LiquidChallenge {
  const pool = SUBSTANCES.map((sub, index) => ({ sub, index })).filter(({ sub, index }) => sub.name !== 'milk' && index !== prev?.index);
  const { sub, index } = pick(pool);
  const kind = phKind(sub.ph);
  const name = sub.name[0].toUpperCase() + sub.name.slice(1);
  return {
    index,
    question: `${name}: acid or base?`,
    options: ['Acid', 'Neutral', 'Base'],
    actual: kind === 'acid' ? 'Acid' : kind === 'base' ? 'Base' : 'Neutral',
    because:
      kind === 'neutral'
        ? `The paper turned ${COLOR_WORD[sub.ph]}: about pH ${sub.ph}, right in the middle of the scale.`
        : `The paper turned ${COLOR_WORD[sub.ph]}: about pH ${sub.ph}, ${kind === 'acid' ? 'below' : 'above'} 7, so it is ${kind === 'acid' ? 'an acid' : 'a base'}.`,
  };
}

function AcidsScene() {
  const [tested, setTested] = useState<number | null>(1);
  const poe = usePoe<LiquidChallenge>(liquidChallenge);
  const [dragAt, setDragAt] = useState<Pt | null>(null);
  const last = useRef<Pt | null>(null);

  const beakerAt = (p: Pt) => SUBSTANCES.findIndex((_, i) => Math.abs(p.x - BEAKER_X(i)) < 50 && p.y + 60 > LIQUID_TOP && p.y < BEAKER_BOTTOM);

  const dip = (i: number) => {
    setTested(i);
    play(SUBSTANCES[i].ph === 7 ? 'tap' : 'pop');
    if (i === poe.challenge.index) window.setTimeout(poe.observe, 600);
  };

  // The strip is held by its top; its tip (60 px lower) is what dips into a beaker.
  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      setDragAt(p);
    },
    {
      onEnd: () => {
        const p = last.current;
        if (p) {
          const i = beakerAt(p);
          if (i >= 0) dip(i);
        }
        setDragAt(null);
      },
    },
  );

  const s = tested !== null ? SUBSTANCES[tested] : null;
  const stripColor = s ? phColor(s.ph) : '#f6e7b8';
  const stripAt = dragAt ?? HOLDER;
  const markerX = s ? SCALE.x + ((s.ph + 0.5) / 15) * SCALE.w : 0;

  return (
    <SceneSvg label="Test liquids with indicator paper to find their pH">
      {/* Safety note */}
      <g>
        <path d="M70,96 L92,56 L114,96 Z" fill={C.yellow} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <text x={92} y={88} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
          !
        </text>
        <text x={128} y={74} fontSize={17} fontWeight={700} fill={C.ink}>
          Never taste or touch chemicals.
        </text>
        <text x={128} y={98} fontSize={15} fill={C.ink2}>
          Scientists test them with indicator paper instead.
        </text>
      </g>

      {/* Predict → observe → explain */}
      <PoePanel x={70} y={104} w={430} poe={poe} />

      {/* Result card */}
      <rect x={530} y={46} width={300} height={190} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={530} y={46} width={300} height={190} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {s ? (
        <g>
          <text x={680} y={80} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
            {s.name}
          </text>
          <rect x={606} y={96} width={148} height={40} rx={8} fill={phColor(s.ph)} stroke={C.ink} strokeWidth={2} />
          <text x={680} y={168} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.ink}>
            about pH {s.ph}
          </text>
          <text x={680} y={206} textAnchor="middle" fontSize={20} fontWeight={700} fill={phColor(s.ph)} stroke={C.ink} strokeWidth={0.6}>
            {phKind(s.ph) === 'acid' ? 'an acid' : phKind(s.ph) === 'base' ? 'a base (alkali)' : 'neutral'}
          </text>
        </g>
      ) : (
        <text x={680} y={140} textAnchor="middle" fontSize={17} fill={C.muted}>
          Dip the paper in a liquid
        </text>
      )}

      {/* Beakers */}
      <line x1={60} y1={BEAKER_BOTTOM + 2} x2={940} y2={BEAKER_BOTTOM + 2} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {SUBSTANCES.map((sub, i) => (
        <Beaker key={sub.name} x={BEAKER_X(i)} s={sub} tested={tested === i} onTap={() => dip(i)} />
      ))}
      {poe.waiting && (
        <rect x={BEAKER_X(poe.challenge.index) - 58} y={BEAKER_TOP - 2} width={116} height={BEAKER_BOTTOM - BEAKER_TOP + 10} rx={14} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" pointerEvents="none" />
      )}

      {/* pH scale */}
      {PH_COLORS.map((col, ph) => (
        <g key={ph}>
          <rect x={SCALE.x + (ph / 15) * SCALE.w} y={SCALE.y} width={SCALE.w / 15} height={34} fill={col} stroke={C.ink} strokeWidth={1.5} />
          <text x={SCALE.x + ((ph + 0.5) / 15) * SCALE.w} y={SCALE.y + 56} textAnchor="middle" fontSize={15} fontWeight={ph === 7 ? 700 : 500} fill={C.ink}>
            {ph}
          </text>
        </g>
      ))}
      <rect x={SCALE.x} y={SCALE.y} width={SCALE.w} height={34} fill="none" stroke={C.ink} strokeWidth={2.5} rx={4} />
      <text x={SCALE.x} y={SCALE.y - 10} fontSize={15} fill={C.ink2} fontWeight={600}>
        ← acids (stronger)
      </text>
      <text x={SCALE.x + SCALE.w / 2} y={SCALE.y - 10} textAnchor="middle" fontSize={15} fill={C.ink2} fontWeight={600}>
        neutral
      </text>
      <text x={SCALE.x + SCALE.w} y={SCALE.y - 10} textAnchor="end" fontSize={15} fill={C.ink2} fontWeight={600}>
        bases (stronger) →
      </text>
      {s && (
        <g style={{ transform: `translateX(${markerX}px)`, transition: 'transform 0.5s cubic-bezier(0.3, 1.3, 0.5, 1)' }}>
          <path d={`M0,${SCALE.y + 66} l-12,18 h24 z`} fill={C.ink} />
        </g>
      )}

      {/* Indicator paper: drag it into a beaker (or tap a beaker) */}
      <rect x={HOLDER.x - 30} y={HOLDER.y - 34} width={60} height={22} rx={6} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={HOLDER.x} y={HOLDER.y - 46} textAnchor="middle" fontSize={13} fill={C.muted} className="caps">
        Indicator paper
      </text>
      <g {...drag} role="button" aria-label="Indicator paper strip" style={{ ...drag.style, transform: `translate(${stripAt.x}px, ${stripAt.y}px)`, transition: dragAt ? 'none' : 'transform 0.4s ease' }}>
        <rect x={-30} y={-30} width={60} height={150} fill="transparent" />
        <rect x={-12} y={-20} width={24} height={110} rx={3} fill="#f6e7b8" stroke={C.ink} strokeWidth={2} />
        <rect x={-12} y={40} width={24} height={50} rx={3} fill={stripColor} stroke={C.ink} strokeWidth={2} />
      </g>

      <Callout at={[HOLDER.x, HOLDER.y + 40]} box={[600, 244]} w={240} icon={Palette} title="Colour code" text="Red and orange mean acid, green means neutral, blue and purple mean base." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {PH_COLORS.map((c, i) => (
        <rect key={i} x={6 + i * 7.2} y={56} width={7.2} height={14} fill={c} />
      ))}
      <rect x={6} y={56} width={108} height={14} fill="none" stroke={C.ink} strokeWidth={2} />
      <path d="M40,14 L40,40 Q40,48 48,48 L72,48 Q80,48 80,40 L80,14" fill="#f7e27a" stroke={C.ink} strokeWidth={2.5} />
      <rect x={55} y={6} width={9} height={36} rx={2} fill={phColor(2)} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ---------- practice ----------

const COLOR_WORDS: { word: string; ph: number }[] = [
  { word: 'red', ph: 1 },
  { word: 'orange', ph: 3 },
  { word: 'green', ph: 7 },
  { word: 'blue', ph: 10 },
  { word: 'purple', ph: 13 },
];

function classify(ph: number): Question {
  const kind = phKind(ph);
  return {
    prompt: `A liquid has a pH of ${ph}. Is it an acid, neutral, or a base?`,
    choices: [{ value: 'acid' }, { value: 'neutral' }, { value: 'base' }],
    answer: kind,
    hint: 'Compare the number with the middle of the pH scale.',
    explain: [
      'The pH scale goes from 0 to 14, and 7 is the middle.',
      kind === 'neutral' ? `${ph} is exactly 7, so it is neutral.` : `${ph} is ${kind === 'acid' ? 'below' : 'above'} 7, so it is ${kind === 'acid' ? 'an acid' : 'a base'}.`,
    ],
  };
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['classify', 'classify', 'water']) : level === 1 ? pick(['classify', 'most', 'water']) : pick(['colour', 'stronger', 'most', 'neutralise']);

  if (kind === 'classify') return classify(level === 0 ? pick([1, 2, 3, 7, 7, 11, 12, 13]) : rand(0, 14));

  if (kind === 'water') {
    return {
      prompt: 'About what pH is pure water?',
      choices: numberChoices(7, { min: 0, max: 14, spread: 6 }).map((value) => ({ value })),
      answer: '7',
      hint: 'Pure water is neither an acid nor a base.',
      explain: ['Pure water is neutral: not an acid and not a base.', 'Neutral is the middle of the scale, pH 7.'],
    };
  }

  if (kind === 'most') {
    const acidic = Math.random() < 0.5;
    const three = shuffle(SUBSTANCES).slice(0, 3); // every substance has a different pH
    const best = [...three].sort((a, b) => (acidic ? a.ph - b.ph : b.ph - a.ph))[0];
    return {
      prompt: `Which is the most ${acidic ? 'acidic' : 'basic (alkaline)'}?`,
      choices: three.map((x) => ({ value: x.name })),
      answer: best.name,
      hint: acidic ? 'Acids have a low pH. The lower, the stronger.' : 'Bases have a high pH. The higher, the stronger.',
      explain: [
        three.map((x) => `${x.name} is about pH ${x.ph}`).join(', ') + '.',
        `The ${acidic ? 'lowest' : 'highest'} pH is the most ${acidic ? 'acidic' : 'basic'}, so ${best.name}.`,
      ],
    };
  }

  if (kind === 'colour') {
    const c = pick(COLOR_WORDS);
    const k = phKind(c.ph);
    return {
      prompt: `Universal indicator turns ${c.word}. Is the liquid an acid, neutral, or a base?`,
      choices: [{ value: 'acid' }, { value: 'neutral' }, { value: 'base' }],
      answer: k,
      hint: 'Picture the colour band of the pH scale from red to purple.',
      explain: [
        'Red and orange are at the low end, green in the middle, blue and purple at the high end.',
        `${c.word[0].toUpperCase() + c.word.slice(1)} means about pH ${c.ph}, so it is ${k === 'neutral' ? 'neutral' : k === 'acid' ? 'an acid' : 'a base'}.`,
      ],
    };
  }

  if (kind === 'stronger') {
    const acid = Math.random() < 0.5;
    const [a, b] = acid ? shuffle([rand(1, 3), rand(4, 6)]) : shuffle([rand(8, 10), rand(11, 13)]);
    const winner = acid ? Math.min(a, b) : Math.max(a, b);
    return {
      prompt: `Which is a stronger ${acid ? 'acid' : 'base'}: pH ${a} or pH ${b}?`,
      choices: [{ value: `pH ${a}` }, { value: `pH ${b}` }],
      answer: `pH ${winner}`,
      hint: acid ? 'The further below 7, the stronger the acid.' : 'The further above 7, the stronger the base.',
      explain: [
        `${acid ? 'Acids get stronger as the pH goes down' : 'Bases get stronger as the pH goes up'}.`,
        `So pH ${winner} is the stronger ${acid ? 'acid' : 'base'}.`,
      ],
    };
  }

  const right = 'they neutralise: the pH moves towards 7';
  return {
    prompt: 'What happens when you add just the right amount of a base to an acid?',
    choices: shuffle([right, 'the acid gets stronger', 'nothing changes', 'the pH goes down to 0']).map((value) => ({ value })),
    answer: right,
    hint: 'Think about where acids and bases sit on the scale, and where they meet.',
    explain: ['An acid has a pH below 7 and a base has a pH above 7.', `Mixed in the right amounts, ${right}.`],
  };
}

export const acidsAndBases: Lesson = {
  id: 'acids-and-bases',
  title: 'Acids and Bases',
  Thumb,
  Scene: AcidsScene,
  sceneHint: 'Predict, then dip the indicator paper into that liquid',
  learn: {
    heading: 'Acids, bases and pH',
    intro: 'The pH scale runs from 0 to 14. Acids are below 7, bases (also called alkalis) are above 7, and 7 is neutral. Indicator paper changes colour to show the pH.',
    points: [
      { icon: SlidersHorizontal, text: 'Low pH = acid (lemon juice, vinegar). High pH = base (soap, bleach).' },
      { icon: Palette, text: 'Universal indicator: red and orange for acids, green for neutral, blue and purple for bases.' },
      { icon: ShieldAlert, text: 'Strong acids and bases can burn, so never taste or touch them.' },
    ],
  },
  steps: [
    'Dip a strip of indicator paper into the liquid.',
    'Match the colour to the pH scale.',
    'Below 7 is an acid, 7 is neutral, above 7 is a base.',
    'The further from 7, the stronger the acid or base.',
  ],
  example: {
    question: 'Indicator paper turns orange in vinegar. What does that tell us?',
    work: ['Orange matches about pH 3 on the scale.', '3 is below 7.'],
    answer: 'Vinegar is an acid (about pH 3).',
  },
  grownups: [
    'Make your own indicator by boiling chopped red cabbage and straining the purple water: it turns pinkish in vinegar and greenish-blue in baking soda water.',
    'pH values for everyday liquids vary a little, so the app says "about".',
    'Neutralisation is everywhere: indigestion tablets are bases that neutralise extra stomach acid.',
    'Safety first: household bleach and cleaners should only be handled by adults.',
  ],
  makeQuestion,
};
