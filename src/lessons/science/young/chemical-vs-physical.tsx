import { useEffect, useRef, useState } from 'react';
import { Flame, FlaskConical, Sparkles, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';

/**
 * Physical change: same substance, new form (tearing, melting, dissolving, boiling).
 * Chemical change: a NEW substance is made. Gas, colour change, heat or light are clues, but
 * only a new substance proves it (boiling water bubbles, yet it is still water).
 */
type Kind = 'Physical' | 'Chemical';
type Look = 'paper' | 'ice' | 'sugar' | 'boil' | 'candle' | 'bolt' | 'cake' | 'egg' | 'fizz';

interface Change {
  id: string;
  name: string;
  /** Shorter name for the results table. */
  short?: string;
  /** What the test does, shown under the Run button. */
  action: string;
  look: Look;
  kind: Kind;
  signs: { newSub: boolean; gas: boolean; colour: boolean; heatLight: boolean };
  because: string;
}

const CHANGES: Change[] = [
  {
    id: 'tear-paper', name: 'Tear paper', action: 'Tear the paper in two', look: 'paper', kind: 'Physical',
    signs: { newSub: false, gas: false, colour: false, heatLight: false },
    because: 'It is still paper, just in smaller pieces. No new substance is made.',
  },
  {
    id: 'melt-ice', name: 'Melt ice', action: 'Warm the ice', look: 'ice', kind: 'Physical',
    signs: { newSub: false, gas: false, colour: false, heatLight: false },
    because: 'Ice and liquid water are the same substance. Cool it and it freezes again.',
  },
  {
    id: 'dissolve-sugar', name: 'Dissolve sugar', action: 'Stir sugar into water', look: 'sugar', kind: 'Physical',
    signs: { newSub: false, gas: false, colour: false, heatLight: false },
    because: 'The sugar is still there, spread out in the water. Dry the water away and sugar is left.',
  },
  {
    id: 'boil-water', name: 'Boil water', action: 'Heat the water until it boils', look: 'boil', kind: 'Physical',
    signs: { newSub: false, gas: true, colour: false, heatLight: false },
    because: 'The bubbles are steam: water as a gas. It is still water, so nothing new is made.',
  },
  {
    id: 'burn-candle', name: 'Burn a candle', action: 'Light the candle (with a grown-up)', look: 'candle', kind: 'Chemical',
    signs: { newSub: true, gas: true, colour: false, heatLight: true },
    because: 'Burning wax joins with oxygen to make new gases (carbon dioxide and water vapour).',
  },
  {
    id: 'rust-bolt', name: 'Rust a bolt', action: 'Leave the iron bolt out in the rain', look: 'bolt', kind: 'Chemical',
    signs: { newSub: true, gas: false, colour: true, heatLight: false },
    because: 'Iron reacts with oxygen and water to make rust, a new orange-brown substance.',
  },
  {
    id: 'bake-cake', name: 'Bake a cake', action: 'Bake the cake mixture', look: 'cake', kind: 'Chemical',
    signs: { newSub: true, gas: true, colour: true, heatLight: false },
    because: 'Heat turns the mixture into new substances. You can’t un-bake a cake.',
  },
  {
    id: 'cook-egg', name: 'Cook an egg', action: 'Cook the egg in a pan', look: 'egg', kind: 'Chemical',
    signs: { newSub: true, gas: false, colour: true, heatLight: false },
    because: 'Heat changes the egg’s proteins for good: the clear part turns white and solid.',
  },
  {
    id: 'vinegar-soda', name: 'Vinegar + baking soda', short: 'Vinegar + soda', action: 'Pour vinegar onto baking soda', look: 'fizz', kind: 'Chemical',
    signs: { newSub: true, gas: true, colour: false, heatLight: false },
    because: 'They react to make new substances, including carbon dioxide gas: that is the fizz.',
  },
];

const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const RUN_MS = 1600;

function Emoji({ glyph, size = 110 }: { glyph: string; size?: number }) {
  return (
    <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={size} style={{ fontFamily: EMOJI }}>
      {glyph}
    </text>
  );
}

function Beaker({ liquid, cubes, powder, bubbles, foam, steam }: { liquid: string; cubes?: boolean; powder?: boolean; bubbles?: boolean; foam?: boolean; steam?: boolean }) {
  return (
    <g>
      <path d="M-56,-30 L-50,70 Q-48,84 -34,84 L34,84 Q48,84 50,70 L56,-30 Z" fill={liquid} opacity={0.9} />
      {cubes && [0, 1, 2].map((i) => <rect key={i} x={-34 + i * 24} y={54 - (i % 2) * 10} width={20} height={20} rx={3} fill="white" stroke={C.ink} strokeWidth={1.5} />)}
      {powder && <ellipse cx={0} cy={74} rx={40} ry={8} fill="white" stroke={C.ink} strokeWidth={1.2} />}
      {bubbles &&
        Array.from({ length: 12 }, (_, i) => (
          <circle key={i} className="cvp-bubble" cx={-40 + ((i * 29) % 80)} cy={70 - ((i * 17) % 40)} r={4 + (i % 3)} fill="white" stroke={shade(liquid, -0.3)} strokeWidth={1.2} style={{ animationDelay: `${(i % 6) * 0.15}s` }} />
        ))}
      {foam && <path d="M-56,-30 Q-40,-62 -14,-44 Q6,-70 28,-46 Q50,-62 56,-30 Z" fill="white" stroke={C.ink} strokeWidth={1.5} />}
      {steam &&
        [-26, 0, 26].map((dx) => (
          <path key={dx} className="cvp-steam" d={`M${dx},-70 q10,-16 0,-32 q-10,-16 0,-32`} fill="none" stroke={C.muted} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
        ))}
      <path d="M-58,-60 L-50,70 Q-48,86 -34,86 L34,86 Q48,86 50,70 L58,-60" fill="none" stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <line x1={-64} y1={-60} x2={64} y2={-60} stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" />
    </g>
  );
}

function Paper({ torn }: { torn: boolean }) {
  const lines = [-40, -16, 8, 32, 56];
  if (!torn) {
    return (
      <g>
        <rect x={-62} y={-82} width={124} height={164} rx={4} fill="white" stroke={C.ink} strokeWidth={3} />
        {lines.map((y) => <line key={y} x1={-44} x2={44} y1={y} y2={y} stroke={C.line} strokeWidth={3} />)}
      </g>
    );
  }
  return (
    <g>
      <g transform="translate(-16 0) rotate(-6)">
        <path d="M-62,-82 L4,-82 L-6,-52 L8,-22 L-4,8 L10,40 L0,82 L-62,82 Z" fill="white" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        {lines.map((y) => <line key={y} x1={-44} x2={-16} y1={y} y2={y} stroke={C.line} strokeWidth={3} />)}
      </g>
      <g transform="translate(16 0) rotate(6)">
        <path d="M4,-82 L62,-82 L62,82 L0,82 L10,40 L-4,8 L8,-22 L-6,-52 Z" fill="white" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        {lines.map((y) => <line key={y} x1={22} x2={44} y1={y} y2={y} stroke={C.line} strokeWidth={3} />)}
      </g>
    </g>
  );
}

function Candle({ lit }: { lit: boolean }) {
  // A lit candle is shorter afterwards: the burned wax has become gases.
  const top = lit ? 10 : -50;
  return (
    <g>
      <ellipse cx={0} cy={84} rx={64} ry={12} fill={C.line} stroke={C.ink} strokeWidth={2.5} />
      <rect x={-26} y={top} width={52} height={80 - top} rx={6} fill="#fff6dc" stroke={C.ink} strokeWidth={3} />
      <line x1={0} y1={top} x2={0} y2={top - 16} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {lit && (
        <g>
          <circle cx={0} cy={top - 44} r={56} fill={C.yellow} opacity={0.18} />
          <g className="cvp-flame">
            <path d={`M0,${top - 10} q-20,-28 0,-66 q20,38 0,66 Z`} fill={C.orange} stroke={C.ink} strokeWidth={2} />
            <path d={`M0,${top - 14} q-9,-14 0,-32 q9,18 0,32 Z`} fill={C.yellow} />
          </g>
          <text x={-64} y={top - 94} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink2}>
            CO₂
          </text>
          <text x={66} y={top - 110} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink2}>
            H₂O
          </text>
        </g>
      )}
    </g>
  );
}

function Bolt({ rusty }: { rusty: boolean }) {
  const metal = rusty ? '#b5541c' : '#a9b2bc';
  return (
    <g>
      <rect x={-46} y={-84} width={92} height={36} rx={6} fill={metal} stroke={C.ink} strokeWidth={3} />
      <rect x={-22} y={-48} width={44} height={132} rx={4} fill={metal} stroke={C.ink} strokeWidth={3} />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={-22} x2={22} y1={-36 + i * 14} y2={-30 + i * 14} stroke={shade(metal, -0.35)} strokeWidth={2.5} />
      ))}
      {rusty &&
        [
          [-30, -70, 9],
          [24, -60, 7],
          [-8, -10, 8],
          [10, 30, 10],
          [-12, 64, 7],
        ].map(([cx, cy, r]) => <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={r} fill="#8a3a12" opacity={0.8} />)}
    </g>
  );
}

/** One substance before or after its change, drawn around (0, 0), about 220 units tall. */
function Specimen({ change, after }: { change: Change; after: boolean }) {
  switch (change.look) {
    case 'paper':
      return <Paper torn={after} />;
    case 'ice':
      return <Emoji glyph={after ? '💧' : '🧊'} />;
    case 'sugar':
      return <Beaker liquid="#cfe8ff" cubes={!after} />;
    case 'boil':
      return <Beaker liquid="#cfe8ff" bubbles={after} steam={after} />;
    case 'candle':
      return <Candle lit={after} />;
    case 'bolt':
      return <Bolt rusty={after} />;
    case 'cake':
      return <Emoji glyph={after ? '🍰' : '🥣'} />;
    case 'egg':
      return <Emoji glyph={after ? '🍳' : '🥚'} />;
    case 'fizz':
      return <Beaker liquid="#fff4c4" powder={!after} bubbles={after} foam={after} />;
  }
}

function HeatGlow() {
  return (
    <g>
      <ellipse cx={0} cy={96} rx={80} ry={14} fill={C.red} opacity={0.25} />
      {[-40, 0, 40].map((dx) => (
        <path key={dx} className="cvp-steam" d={`M${dx},${98} q8,-12 0,-24`} fill="none" stroke={C.red} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      ))}
    </g>
  );
}

const HEATED = new Set(['melt-ice', 'boil-water', 'bake-cake', 'cook-egg']);

const SIGN_ROWS: { key: keyof Change['signs']; label: string }[] = [
  { key: 'newSub', label: 'New substance made?' },
  { key: 'gas', label: 'Gas given off?' },
  { key: 'colour', label: 'Colour change?' },
  { key: 'heatLight', label: 'Gives out heat or light?' },
];

function ChangeScene() {
  const [id, setId] = useState(CHANGES[0].id);
  const [guess, setGuess] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [results, setResults] = useState<Record<string, Kind>>({});
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = CHANGES.find((c) => c.id === id)!;

  const choose = (next: string) => {
    window.clearTimeout(timer.current);
    setId(next);
    setGuess(null);
    setPhase('idle');
    play('tap');
  };

  const run = () => {
    if (!guess || phase !== 'idle') return;
    setPhase('running');
    play('pop');
    timer.current = window.setTimeout(() => {
      setPhase('done');
      setResults((r) => ({ ...r, [change.id]: change.kind }));
      play(guess === change.kind ? 'correct' : 'tap');
    }, RUN_MS);
  };

  const nextUntested = () => {
    const start = CHANGES.findIndex((c) => c.id === id);
    for (let k = 1; k <= CHANGES.length; k++) {
      const c = CHANGES[(start + k) % CHANGES.length];
      if (!results[c.id]) return c.id;
    }
    return CHANGES[(start + 1) % CHANGES.length].id;
  };

  const physical = CHANGES.filter((c) => results[c.id] === 'Physical');
  const chemical = CHANGES.filter((c) => results[c.id] === 'Chemical');
  const ready = !!guess && phase === 'idle';

  return (
    <SceneSvg label={`Test station: ${change.name}`}>
      {/* Test bench */}
      <rect x={40} y={24} width={620} height={540} rx={20} fill={C.card} stroke={C.line} strokeWidth={2} />
      <text x={64} y={64} fontSize={15} fill={C.muted} className="caps">
        Test station
      </text>
      <text x={64} y={96} fontSize={26} fontWeight={700} fill={C.ink}>
        {change.name}
      </text>
      <text x={190} y={150} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        Before
      </text>
      <text x={500} y={150} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        After
      </text>
      <g transform="translate(190 300)">
        <Specimen change={change} after={false} />
      </g>
      <path d="M300,300 L380,300 M366,286 L382,300 L366,314" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {phase === 'idle' ? (
        <text x={500} y={304} textAnchor="middle" dominantBaseline="central" fontSize={90} fontWeight={700} fill={C.line}>
          ?
        </text>
      ) : (
        <g transform="translate(500 300)">
          <g className="cvp-appear" key={`${change.id}-${phase}`}>
            {HEATED.has(change.id) && <HeatGlow />}
            <Specimen change={change} after />
          </g>
        </g>
      )}
      <SvgButton
        x={240}
        y={448}
        w={220}
        h={60}
        fontSize={20}
        label={phase === 'idle' ? (guess ? 'Run the test ▶' : 'Predict first →') : phase === 'running' ? 'Testing…' : 'Tested ✓'}
        color={ready ? C.teal : C.card}
        textColor={ready ? C.white : C.ink}
        disabled={!ready}
        onClick={run}
      />
      <text x={350} y={540} textAnchor="middle" fontSize={16} fill={C.ink2}>
        {change.action}.
      </text>

      {/* Things to test */}
      <text x={44} y={592} fontSize={14} fill={C.muted} className="caps">
        Pick a test
      </text>
      {CHANGES.map((c, i) => {
        const x = 40 + i * 70;
        const sel = c.id === id;
        return (
          <g key={c.id} onClick={() => choose(c.id)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={c.name}>
            <title>{c.name}</title>
            <rect x={x} y={602} width={64} height={62} rx={12} fill={sel ? shade(C.yellow, 0.6) : C.white} stroke={sel ? C.ink : C.line} strokeWidth={sel ? 2.5 : 2} />
            <g transform={`translate(${x + 32} 633) scale(0.24)`}>
              <Specimen change={c} after={false} />
            </g>
            {results[c.id] && <circle cx={x + 56} cy={610} r={7} fill={results[c.id] === 'Chemical' ? C.purple : C.blue} stroke={C.white} strokeWidth={2} />}
          </g>
        );
      })}

      {/* Predict → observe → explain */}
      {phase === 'done' ? (
        <ExplainCard x={690} y={24} w={280} prediction={guess} actual={change.kind} because={change.because} onAgain={() => choose(nextUntested())} />
      ) : (
        <PredictCard x={690} y={24} w={280} question={`${change.name}: physical or chemical?`} options={['Physical', 'Chemical']} prediction={guess} onPredict={setGuess} />
      )}

      {/* Signs */}
      <g transform="translate(690 318)">
        <rect width={280} height={156} rx={14} fill={C.card} stroke={C.line} strokeWidth={2} />
        <text x={16} y={26} fontSize={14} fill={C.muted} className="caps">
          Look for the signs
        </text>
        {SIGN_ROWS.map((row, i) => {
          const known = phase === 'done';
          const on = known && change.signs[row.key];
          return (
            <g key={row.key} transform={`translate(16 ${54 + i * 28})`}>
              <circle cx={10} cy={-5} r={10} fill={!known ? C.line : on ? C.green : C.white} stroke={C.ink} strokeWidth={1.5} />
              <text x={10} y={-5} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={C.ink}>
                {!known ? '?' : on ? '✓' : '–'}
              </text>
              <text x={30} y={0} fontSize={15} fontWeight={row.key === 'newSub' ? 700 : 400} fill={C.ink}>
                {row.label}
              </text>
            </g>
          );
        })}
      </g>

      {/* Results */}
      <g transform="translate(690 488)">
        <rect width={280} height={176} rx={14} fill={C.card} stroke={C.line} strokeWidth={2} />
        <text x={70} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.blue}>
          Physical
        </text>
        <text x={210} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.purple}>
          Chemical
        </text>
        <line x1={140} y1={14} x2={140} y2={164} stroke={C.line} strokeWidth={2} />
        {physical.map((c, i) => (
          <text key={c.id} x={14} y={56 + i * 26} fontSize={15} fill={C.ink}>
            {c.short ?? c.name}
          </text>
        ))}
        {chemical.map((c, i) => (
          <text key={c.id} x={152} y={56 + i * 26} fontSize={15} fill={C.ink}>
            {c.short ?? c.name}
          </text>
        ))}
      </g>

      <Callout at={[500, 196]} box={[430, 40]} w={210} icon={Sparkles} title="The real test" text="Is there a brand-new substance? Bubbles, colour or heat are only clues." />
      <style>{`
        .cvp-appear { animation: cvp-in 0.6s ease both; }
        @keyframes cvp-in { from { opacity: 0; } }
        .cvp-bubble { animation: cvp-rise 1.2s ease-in infinite; }
        @keyframes cvp-rise { to { transform: translateY(-60px); opacity: 0; } }
        .cvp-steam { animation: cvp-float 1.6s ease-in-out infinite; }
        @keyframes cvp-float { 50% { transform: translateY(-8px); opacity: 0.4; } }
        .cvp-flame { animation: cvp-flicker 0.4s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: bottom center; }
        @keyframes cvp-flicker { to { transform: scale(1.06, 0.94); } }
        @media (prefers-reduced-motion: reduce) { .cvp-appear, .cvp-bubble, .cvp-steam, .cvp-flame { animation: none; } }
      `}</style>
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M14,24 L18,66 Q19,72 25,72 L45,72 Q51,72 52,66 L56,24 Z" fill="#fff4c4" stroke={C.ink} strokeWidth={2.5} />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={24 + i * 7} cy={50 - (i % 2) * 8} r={3} fill="white" stroke={C.ink} strokeWidth={1.2} />
      ))}
      <path d="M14,24 Q22,12 32,20 Q44,10 56,24 Z" fill="white" stroke={C.ink} strokeWidth={2} />
      <rect x={76} y={36} width={20} height={36} rx={3} fill="#fff6dc" stroke={C.ink} strokeWidth={2.5} />
      <path d="M86,32 q-8,-11 0,-24 q8,13 0,24 Z" fill={C.orange} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

// ---------- practice ----------

const byId = (id: string) => CHANGES.find((c) => c.id === id)!;

const PHRASE: Record<string, string> = {
  'tear-paper': 'Tearing a sheet of paper',
  'melt-ice': 'Ice melting into water',
  'dissolve-sugar': 'Sugar dissolving in tea',
  'boil-water': 'Water boiling in a kettle',
  'burn-candle': 'A candle burning',
  'rust-bolt': 'An iron bolt going rusty',
  'bake-cake': 'Baking a cake',
  'cook-egg': 'Cooking an egg',
  'vinegar-soda': 'Vinegar fizzing with baking soda',
};

function classify(id: string): Question {
  const c = byId(id);
  const answer = `${c.kind} change`;
  return {
    prompt: `${PHRASE[id]}. Is this a physical or a chemical change?`,
    choices: [{ value: 'Physical change' }, { value: 'Chemical change' }],
    answer,
    hint: 'Ask yourself: is it still the same substance afterwards?',
    explain: [c.signs.newSub ? 'A new substance is made.' : 'No new substance is made.', c.because, `So it is a ${answer.toLowerCase()}.`],
  };
}

function makeQuestion(level: number): Question {
  // Level 0: everyday changes with an obvious answer.
  if (level === 0) return classify(pick(['tear-paper', 'melt-ice', 'burn-candle', 'bake-cake', 'cook-egg', 'rust-bolt']));

  // Level 1: pick the one that fits from three, or name the deciding sign.
  if (level === 1) {
    const kind = pick(['which-chemical', 'which-physical', 'sign']);
    if (kind === 'sign') {
      const right = 'A new substance is made';
      return {
        prompt: 'Which is the surest sign that a chemical change has happened?',
        choices: shuffle([right, 'It changes shape', 'It melts into a liquid']).map((value) => ({ value })),
        answer: right,
        hint: 'Shape changes and melting happen in physical changes too.',
        explain: ['Changing shape or melting leaves the same substance.', 'Only a chemical change makes something new.', `So the surest sign is: ${right.toLowerCase()}.`],
      };
    }
    const wantChem = kind === 'which-chemical';
    const pool = CHANGES.filter((c) => c.id !== 'boil-water' && c.id !== 'dissolve-sugar');
    const right = pick(pool.filter((c) => (c.kind === 'Chemical') === wantChem));
    const wrong = shuffle(pool.filter((c) => (c.kind === 'Chemical') !== wantChem)).slice(0, 2);
    return {
      prompt: `Which of these is a ${wantChem ? 'chemical' : 'physical'} change?`,
      choices: shuffle([right, ...wrong]).map((c) => ({ value: PHRASE[c.id] })),
      answer: PHRASE[right.id],
      hint: wantChem ? 'Look for the one that makes a brand-new substance.' : 'Look for the one that is still the same substance afterwards.',
      explain: [right.because, `The other two ${wantChem ? 'keep the same substance' : 'make new substances'}.`, `So the answer is: ${PHRASE[right.id].toLowerCase()}.`],
    };
  }

  // Level 2: tricky cases where the clues mislead.
  const kind = pick(['boil', 'dissolve', 'tear', 'candle'] as const);
  if (kind === 'candle') {
    const right = 'The wax burning';
    return {
      prompt: 'When a candle is lit, some wax melts and some wax burns. Which part is a chemical change?',
      choices: shuffle([right, 'The wax melting', 'Neither part']).map((value) => ({ value })),
      answer: right,
      hint: 'Which part makes new gases, heat and light?',
      explain: ['Melted wax is still wax, so melting is physical.', 'Burning wax joins with oxygen to make carbon dioxide and water vapour.', `So the chemical change is ${right.toLowerCase()}.`],
    };
  }
  const q = classify(kind === 'boil' ? 'boil-water' : kind === 'dissolve' ? 'dissolve-sugar' : 'tear-paper');
  const twist = {
    boil: 'Boiling water makes lots of bubbles.',
    dissolve: 'Sugar seems to vanish when you stir it into water.',
    tear: 'You can’t un-tear a sheet of paper.',
  }[kind];
  const why = {
    boil: 'Bubbles are a clue, not proof: these are steam, which is still water.',
    dissolve: 'The sugar is still there, just spread out. Taste it, or dry the water away.',
    tear: 'Being hard to undo does not make a change chemical. It is still paper.',
  }[kind];
  return {
    ...q,
    prompt: `${twist} What kind of change is it?`,
    hint: 'Don’t trust the first clue. Is a brand-new substance made?',
    explain: [why, 'No new substance is made.', `So it is a ${q.answer.toLowerCase()}.`],
  };
}

export const chemicalVsPhysical: Lesson = {
  id: 'chemical-vs-physical',
  title: 'Chemical or Physical Change?',
  Thumb,
  Scene: ChangeScene,
  sceneHint: 'Pick a test · Predict · Run it · Check the signs',
  learn: {
    heading: 'Chemical or physical change?',
    intro: 'In a physical change, a substance changes its shape or state but stays the same stuff. In a chemical change, atoms rearrange to make a brand-new substance.',
    points: [
      { icon: FlaskConical, text: 'Physical: tearing, melting, freezing, dissolving, boiling.' },
      { icon: Flame, text: 'Chemical: burning, rusting, baking, cooking, fizzing reactions.' },
      { icon: Wind, text: 'Clues of a chemical change: a gas, a colour change, heat or light.' },
      { icon: Sparkles, text: 'But only a new substance proves it. Boiling water bubbles, yet it is still water.' },
    ],
  },
  steps: [
    'Pick something to test.',
    'Predict: physical or chemical?',
    'Run the test and watch closely.',
    'Check the signs. Was a new substance made? That decides it.',
  ],
  example: {
    question: 'An iron gate turns orange-brown and flaky after years in the rain. What kind of change is that?',
    work: ['The orange-brown flakes are rust.', 'Rust is a new substance made from iron, oxygen and water.', 'A new substance means a chemical change.'],
    answer: 'A chemical change (rusting).',
  },
  grownups: [
    'Kitchen science works well: melt chocolate (physical), toast bread (chemical), dissolve salt and dry it back out on a plate (physical).',
    'A common mix-up is “if you can’t undo it, it’s chemical”. Torn paper can’t be un-torn, but it is a physical change; the real test is whether a new substance forms.',
    'Another is “bubbles mean chemical”. Boiling water bubbles because liquid water turns to steam, a physical change.',
    'Only light candles with a grown-up, and don’t mix household chemicals other than vinegar and baking soda.',
  ],
  makeQuestion,
};
