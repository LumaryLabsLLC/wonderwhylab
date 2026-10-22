import { useEffect, useRef, useState } from 'react';
import { Atom, Lock, Scale, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { atomCount, Mol } from './visuals/Particles';
import type { MolKind } from './visuals/Particles';

/**
 * Conservation of mass: atoms are rearranged, never created or destroyed, so a change in a closed
 * container never changes the reading on the scale. In an open container a gas can escape and take
 * its mass with it. The fizz uses a test tube of vinegar inside a jar of baking soda, tipped to mix,
 * so "sealed" and "open" are a fair test: the only difference is the lid (always on the scale).
 */
type Outcome = 'More' | 'The same' | 'Less';
type ExpId = 'ice' | 'sugar' | 'fizz-sealed' | 'fizz-open';

interface Placed {
  kind: MolKind;
  x: number;
  y: number;
  rot?: number;
  /** Above the jar, floating off into the air. */
  escaped?: boolean;
}

interface Exp {
  id: ExpId;
  label: string;
  title: string;
  question: string;
  sealed: boolean;
  before: number;
  after: number;
  actual: Outcome;
  because: string;
  zoom: { before: Placed[]; after: Placed[] };
  counting: 'Water molecules' | 'Sugar molecules' | 'Atoms on the scale';
  note: string;
}

const EXPS: Exp[] = [
  {
    id: 'ice',
    label: 'Ice · sealed',
    title: 'Ice cubes melt in a sealed jar',
    question: 'The ice melts. The scale will read…',
    sealed: true,
    before: 320,
    after: 320,
    actual: 'The same',
    because: 'Melting turns ice into liquid water, but every water molecule is still in the jar.',
    zoom: {
      before: [
        { kind: 'water', x: 60, y: 150 },
        { kind: 'water', x: 140, y: 150, rot: 180 },
        { kind: 'water', x: 220, y: 150 },
        { kind: 'water', x: 60, y: 230, rot: 180 },
        { kind: 'water', x: 140, y: 230 },
        { kind: 'water', x: 220, y: 230, rot: 180 },
      ],
      after: [
        { kind: 'water', x: 55, y: 255, rot: 40 },
        { kind: 'water', x: 125, y: 215, rot: -70 },
        { kind: 'water', x: 200, y: 262, rot: 150 },
        { kind: 'water', x: 232, y: 190, rot: 20 },
        { kind: 'water', x: 82, y: 160, rot: 200 },
        { kind: 'water', x: 165, y: 140, rot: -30 },
      ],
    },
    counting: 'Water molecules',
    note: 'Same ones, new arrangement.',
  },
  {
    id: 'sugar',
    label: 'Sugar · open',
    title: 'Sugar dissolves in an open cup',
    question: 'The sugar dissolves. The scale will read…',
    sealed: false,
    before: 345,
    after: 345,
    actual: 'The same',
    because: 'The sugar is still there, spread out between the water molecules, so its mass still counts.',
    zoom: {
      before: [
        { kind: 'sugar', x: 50, y: 170 },
        { kind: 'sugar', x: 50, y: 206, rot: 30 },
        { kind: 'water', x: 140, y: 140 },
        { kind: 'water', x: 220, y: 160, rot: 60 },
        { kind: 'water', x: 150, y: 240, rot: -40 },
        { kind: 'water', x: 225, y: 255, rot: 120 },
      ],
      after: [
        { kind: 'sugar', x: 120, y: 175, rot: 15 },
        { kind: 'sugar', x: 205, y: 250, rot: 40 },
        { kind: 'water', x: 55, y: 130, rot: 30 },
        { kind: 'water', x: 225, y: 150, rot: -60 },
        { kind: 'water', x: 65, y: 250, rot: 100 },
        { kind: 'water', x: 140, y: 268, rot: -20 },
      ],
    },
    counting: 'Sugar molecules',
    note: 'Spread out between the water.',
  },
  {
    id: 'fizz-sealed',
    label: 'Fizz · sealed',
    title: 'Vinegar + baking soda, lid on',
    question: 'Tip the vinegar in. The scale will read…',
    sealed: true,
    before: 386,
    after: 386,
    actual: 'The same',
    because: 'The reaction made carbon dioxide gas, but the lid trapped it. Atoms swapped partners; none vanished.',
    zoom: {
      before: [
        { kind: 'soda', x: 70, y: 155 },
        { kind: 'soda', x: 70, y: 245 },
        { kind: 'acid', x: 195, y: 155 },
        { kind: 'acid', x: 195, y: 245 },
      ],
      after: [
        { kind: 'acetate', x: 62, y: 150 },
        { kind: 'acetate', x: 62, y: 255 },
        { kind: 'water', x: 185, y: 140 },
        { kind: 'water', x: 185, y: 262, rot: 160 },
        { kind: 'co2', x: 140, y: 205, rot: -20 },
        { kind: 'co2', x: 228, y: 205, rot: 30 },
      ],
    },
    counting: 'Atoms on the scale',
    note: 'Same atoms, new partners.',
  },
  {
    id: 'fizz-open',
    label: 'Fizz · open',
    title: 'Vinegar + baking soda, lid off',
    question: 'Tip the vinegar in. The scale will read…',
    sealed: false,
    before: 386,
    after: 384,
    actual: 'Less',
    because: 'Carbon dioxide gas escaped into the air and took its mass with it. Its atoms still exist, just not on the scale.',
    zoom: {
      before: [
        { kind: 'soda', x: 70, y: 155 },
        { kind: 'soda', x: 70, y: 245 },
        { kind: 'acid', x: 195, y: 155 },
        { kind: 'acid', x: 195, y: 245 },
      ],
      after: [
        { kind: 'acetate', x: 62, y: 150 },
        { kind: 'acetate', x: 62, y: 255 },
        { kind: 'water', x: 185, y: 150 },
        { kind: 'water', x: 185, y: 255, rot: 160 },
        { kind: 'co2', x: 95, y: 58, rot: -20, escaped: true },
        { kind: 'co2', x: 195, y: 50, rot: 25, escaped: true },
      ],
    },
    counting: 'Atoms on the scale',
    note: '6 atoms escaped in CO₂ gas.',
  },
];

const RUN_MS = 1800;
const JAR_X = 250;
const FLOOR = 520;
const SIDE_X = 420;

function count(exp: Exp, placed: Placed[]): number {
  const inside = placed.filter((p) => !p.escaped);
  if (exp.counting === 'Atoms on the scale') return inside.reduce((n, p) => n + atomCount(p.kind), 0);
  return inside.filter((p) => p.kind === (exp.counting === 'Sugar molecules' ? 'sugar' : 'water')).length;
}

function Lid({ x, y, lying }: { x: number; y: number; lying?: boolean }) {
  return <rect x={x - 82} y={y} width={164} height={lying ? 16 : 22} rx={6} fill={C.blue} stroke={C.ink} strokeWidth={3} />;
}

function Dish({ x, full, powder }: { x: number; full: boolean; powder: 'sugar' | 'soda' }) {
  return (
    <g>
      {full && (
        <g>
          <path d={`M${x - 36},${FLOOR - 26} Q${x},${FLOOR - 62} ${x + 36},${FLOOR - 26} Z`} fill="white" stroke={C.ink} strokeWidth={2} />
          {powder === 'sugar' && [-14, 0, 12, -4, 8].map((dx, i) => <rect key={i} x={x + dx - 3} y={FLOOR - 40 + (i % 2) * 8} width={6} height={6} fill="#e8eef5" stroke={C.muted} strokeWidth={1} />)}
        </g>
      )}
      <path d={`M${x - 50},${FLOOR - 28} L${x + 50},${FLOOR - 28} Q${x + 44},${FLOOR} ${x},${FLOOR} Q${x - 44},${FLOOR} ${x - 50},${FLOOR - 28} Z`} fill={shade(C.yellow, 0.55)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <text x={x} y={FLOOR - 74} textAnchor="middle" fontSize={15} fill={C.ink2}>
        {full ? powder : 'empty'}
      </text>
    </g>
  );
}

/** The jar and what is in it, sitting on the scale. */
function Bench({ exp, after }: { exp: Exp; after: boolean }) {
  const top = FLOOR - 190;
  const fizz = exp.id === 'fizz-sealed' || exp.id === 'fizz-open';
  const liquid = exp.id === 'ice' ? (after ? 46 : 0) : exp.id === 'sugar' ? 112 : after ? 58 : 0;
  const liquidColor = fizz ? '#fff1b8' : '#cfe8ff';
  return (
    <g>
      {/* contents */}
      {liquid > 0 && <rect x={JAR_X - 71} y={FLOOR - 4 - liquid} width={142} height={liquid} rx={10} fill={liquidColor} />}
      {exp.id === 'ice' &&
        !after &&
        [
          [-62, -46],
          [-18, -46],
          [26, -46],
          [-40, -90],
          [4, -90],
          [-18, -134],
        ].map(([dx, dy], i) => <rect key={i} x={JAR_X + dx} y={FLOOR + dy} width={40} height={40} rx={7} fill="#e6f5ff" stroke="#6aa9dc" strokeWidth={2.5} />)}
      {fizz && !after && <ellipse cx={JAR_X - 20} cy={FLOOR - 12} rx={46} ry={9} fill="white" stroke={C.ink} strokeWidth={1.5} />}
      {fizz && (
        // Test tube of vinegar: upright before, tipped over (and empty) after.
        <g transform={`rotate(${after ? -40 : 0} ${JAR_X + 34} ${FLOOR - 8})`}>
          {!after && <rect x={JAR_X + 22} y={FLOOR - 96} width={24} height={86} rx={12} fill="#fff1b8" />}
          <path d={`M${JAR_X + 20},${FLOOR - 124} L${JAR_X + 20},${FLOOR - 20} Q${JAR_X + 34},${FLOOR - 2} ${JAR_X + 48},${FLOOR - 20} L${JAR_X + 48},${FLOOR - 124}`} fill="none" stroke={C.ink} strokeWidth={2.5} />
        </g>
      )}
      {fizz && after && (
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} className="com-bubble" cx={JAR_X - 60 + ((i * 37) % 120)} cy={FLOOR - 12 - ((i * 19) % 44)} r={3 + (i % 3)} fill="white" stroke="#c9a227" strokeWidth={1} style={{ animationDelay: `${(i % 6) * 0.2}s` }} />
          ))}
          <path d={`M${JAR_X - 71},${FLOOR - 62} q18,-16 36,0 q18,-18 36,0 q18,-16 36,0 q18,-18 34,0 Z`} fill="white" stroke={C.ink} strokeWidth={1.5} />
        </g>
      )}
      {/* gas: trapped under the lid, or drifting away */}
      {fizz && after && exp.sealed && (
        <g>
          <Mol kind="co2" x={JAR_X - 34} y={top + 50} rot={-15} />
          <Mol kind="co2" x={JAR_X + 30} y={top + 80} rot={20} />
        </g>
      )}
      {fizz && after && !exp.sealed && (
        <g className="com-escape">
          <Mol kind="co2" x={JAR_X - 30} y={top - 40} rot={-15} />
          <Mol kind="co2" x={JAR_X + 34} y={top - 80} rot={25} />
          <text x={JAR_X + 70} y={top - 36} fontSize={16} fontWeight={700} fill={C.ink2}>
            CO₂ gas escapes
          </text>
        </g>
      )}
      {/* jar */}
      <path d={`M${JAR_X - 75},${top} L${JAR_X - 75},${FLOOR - 16} Q${JAR_X - 75},${FLOOR} ${JAR_X - 59},${FLOOR} L${JAR_X + 59},${FLOOR} Q${JAR_X + 75},${FLOOR} ${JAR_X + 75},${FLOOR - 16} L${JAR_X + 75},${top}`} fill="rgba(207,232,255,0.25)" stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
      {exp.sealed && <Lid x={JAR_X} y={top - 18} />}
      {/* beside the jar, still on the scale */}
      {exp.id === 'sugar' && <Dish x={SIDE_X} full={!after} powder="sugar" />}
      {exp.id === 'fizz-open' && (
        <g>
          <Lid x={SIDE_X} y={FLOOR - 16} lying />
          <text x={SIDE_X} y={FLOOR - 30} textAnchor="middle" fontSize={15} fill={C.ink2}>
            lid (on the scale)
          </text>
        </g>
      )}
    </g>
  );
}

function ScaleBase({ grams, changed }: { grams: number; changed: boolean }) {
  return (
    <g>
      <rect x={90} y={FLOOR} width={420} height={16} rx={6} fill={C.line} stroke={C.ink} strokeWidth={3} />
      <rect x={110} y={FLOOR + 16} width={380} height={86} rx={16} fill="#e8edf3" stroke={C.ink} strokeWidth={3} />
      <rect x={210} y={FLOOR + 30} width={180} height={58} rx={10} fill="#1f2a37" stroke={C.ink} strokeWidth={2} />
      <text x={300} y={FLOOR + 60} textAnchor="middle" dominantBaseline="central" fontSize={36} fontWeight={700} fill={changed ? '#ffb86b' : '#7cf0a0'} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {grams} g
      </text>
    </g>
  );
}

function Zoom({ exp, phase }: { exp: Exp; phase: 'idle' | 'running' | 'done' }) {
  const done = phase === 'done';
  const placed = done ? exp.zoom.after : exp.zoom.before;
  const nBefore = count(exp, exp.zoom.before);
  const nAfter = count(exp, exp.zoom.after);
  return (
    <g transform="translate(690 300)">
      <rect width={280} height={364} rx={14} fill={C.card} stroke={C.line} strokeWidth={2} />
      <text x={16} y={26} fontSize={14} fill={C.muted} className="caps">
        Zoom in
      </text>
      <text x={264} y={66} textAnchor="end" fontSize={15} fill={C.muted}>
        air
      </text>
      {/* the container: walls, and a lid if sealed */}
      <path d="M16,92 L16,298 L264,298 L264,92" fill={shade(C.blue, 0.88)} stroke={C.ink} strokeWidth={2.5} />
      {exp.sealed ? (
        <rect x={10} y={84} width={260} height={10} rx={4} fill={C.blue} stroke={C.ink} strokeWidth={2} />
      ) : (
        <text x={140} y={88} textAnchor="middle" fontSize={15} fill={C.muted}>
          open top
        </text>
      )}
      <g className={done ? 'com-appear' : undefined} key={phase === 'done' ? 'after' : 'before'}>
        {placed.map((p, i) => (
          <Mol key={i} kind={p.kind} x={p.x} y={p.y} rot={p.rot} scale={1.25} className={p.escaped ? 'com-escape' : undefined} />
        ))}
      </g>
      <text x={16} y={328} fontSize={16} fontWeight={700} fill={C.ink}>
        {exp.counting}: {done ? `${nBefore} → ${nAfter}` : nBefore}
      </text>
      <text x={16} y={352} fontSize={15} fill={done && nAfter !== nBefore ? C.red : C.ink2}>
        {done ? exp.note : 'Run it and count again.'}
      </text>
    </g>
  );
}

function MassScene() {
  const [id, setId] = useState<ExpId>('ice');
  const [guess, setGuess] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const exp = EXPS.find((e) => e.id === id)!;
  const after = phase === 'done';

  const choose = (next: ExpId) => {
    window.clearTimeout(timer.current);
    setId(next);
    setGuess(null);
    setPhase('idle');
  };

  const start = () => {
    if (phase === 'done') return choose(id);
    if (!guess || phase !== 'idle') return;
    setPhase('running');
    play('pop');
    timer.current = window.setTimeout(() => {
      setPhase('done');
      play(guess === exp.actual ? 'correct' : 'tap');
    }, RUN_MS);
  };

  const nextExp = () => EXPS[(EXPS.findIndex((e) => e.id === id) + 1) % EXPS.length].id;
  const ready = !!guess && phase === 'idle';

  return (
    <SceneSvg label={`Scale experiment: ${exp.title}`}>
      {EXPS.map((e, i) => (
        <SvgButton key={e.id} x={40 + i * 155} y={24} w={145} h={52} fontSize={17} label={e.label} active={e.id === id} color={e.id === id ? shade(C.yellow, 0.4) : C.card} onClick={() => choose(e.id)} />
      ))}
      <text x={44} y={124} fontSize={22} fontWeight={700} fill={C.ink}>
        {exp.title}
      </text>

      <Bench exp={exp} after={after} />
      <ScaleBase grams={after ? exp.after : exp.before} changed={after && exp.after !== exp.before} />

      <SvgButton
        x={510}
        y={548}
        w={150}
        h={60}
        fontSize={phase === 'idle' && !guess ? 16 : 20}
        label={phase === 'idle' ? (guess ? 'Start ▶' : 'Predict first →') : phase === 'running' ? 'Mixing…' : 'Reset ↺'}
        color={ready ? C.teal : C.card}
        textColor={ready ? C.white : C.ink}
        disabled={!ready && phase !== 'done'}
        onClick={start}
      />
      {after && (
        <text x={300} y={656} textAnchor="middle" fontSize={18} fontWeight={700} fill={exp.after === exp.before ? C.ink : C.red}>
          Before {exp.before} g → After {exp.after} g
        </text>
      )}

      {after ? (
        <ExplainCard x={690} y={24} w={280} prediction={guess} actual={exp.actual} because={exp.because} onAgain={() => choose(nextExp())} />
      ) : (
        <PredictCard x={690} y={24} w={280} question={exp.question} options={['More', 'The same', 'Less']} prediction={guess} onPredict={setGuess} />
      )}
      <Zoom exp={exp} phase={phase} />

      <Callout at={[JAR_X + 60, FLOOR - 200]} box={[470, 150]} w={190} icon={Lock} title="Sealed or open?" text="A lid keeps every atom on the scale, even a gas." />
      <style>{`
        .com-appear { animation: com-in 0.6s ease both; }
        @keyframes com-in { from { opacity: 0; } }
        .com-bubble { animation: com-rise 1.3s ease-in infinite; }
        @keyframes com-rise { to { transform: translateY(-40px); opacity: 0; } }
        .com-escape { animation: com-away 2.4s ease-in-out infinite alternate; }
        @keyframes com-away { to { transform: translateY(-10px); } }
        @media (prefers-reduced-motion: reduce) { .com-appear, .com-bubble, .com-escape { animation: none; } }
      `}</style>
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={38} y={20} width={44} height={38} rx={5} fill="#cfe8ff" stroke={C.ink} strokeWidth={2.5} />
      <rect x={34} y={13} width={52} height={9} rx={3} fill={C.blue} stroke={C.ink} strokeWidth={2.5} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={50 + i * 10} cy={44 - (i % 2) * 8} r={3} fill="white" stroke={C.ink} strokeWidth={1.2} />
      ))}
      <rect x={18} y={58} width={84} height={6} rx={2} fill={C.line} stroke={C.ink} strokeWidth={2} />
      <rect x={24} y={64} width={72} height={13} rx={4} fill="#e8edf3" stroke={C.ink} strokeWidth={2} />
      <rect x={45} y={66} width={30} height={9} rx={2} fill="#1f2a37" />
    </svg>
  );
}

// ---------- practice ----------

const MASSES = [180, 240, 250, 300, 320, 360, 400, 450, 500];

function makeQuestion(level: number): Question {
  // Level 0: melting, freezing and dissolving keep the same mass.
  if (level === 0) {
    const kind = pick(['melt', 'freeze', 'dissolve'] as const);
    if (kind === 'dissolve') {
      const water = pick([200, 250, 300, 400]);
      const solid = pick(['sugar', 'salt']);
      const grams = pick([10, 15, 20, 25, 30]);
      const answer = `${water + grams} g`;
      return {
        prompt: `A cup of water weighs ${water} g. You stir in ${grams} g of ${solid} until you can’t see it any more. What is the total mass now?`,
        choices: shuffle([answer, `${water} g`, `${grams} g`]).map((value) => ({ value })),
        answer,
        hint: `Is the ${solid} really gone, or just spread out?`,
        explain: [`The ${solid} dissolved: it is spread out between the water molecules, not gone.`, `So its mass still counts: ${water} + ${grams} = ${water + grams}.`, `The total is ${answer}.`],
      };
    }
    const m = pick(MASSES);
    const answer = `${m} g`;
    const what = kind === 'melt' ? 'A sealed jar of ice cubes' : 'A sealed bottle of water';
    const change = kind === 'melt' ? 'All the ice melts.' : 'You freeze it solid.';
    return {
      prompt: `${what} weighs ${m} g. ${change} What does it weigh now?`,
      choices: shuffle([answer, `${m + 20} g`, `${m - 20} g`]).map((value) => ({ value })),
      answer,
      hint: 'Did anything get into or out of the container?',
      explain: [kind === 'melt' ? 'Melting is a change of state: the same water molecules, now moving around.' : 'Freezing is a change of state: the same water molecules, now locked in place.', 'Nothing got in or out of the sealed container.', `So the mass stays ${answer}.`],
    };
  }

  // Level 1: does a gas escape? Sealed vs open.
  if (level === 1) {
    const kind = pick(['open', 'sealed', 'why'] as const);
    if (kind === 'why') {
      const right = 'A gas escaped into the air';
      return {
        prompt: 'Vinegar and baking soda fizz in an open cup on a scale. Afterwards, the scale reads a little less. Why?',
        choices: shuffle([right, 'Some atoms were destroyed', 'Fizzing makes atoms lighter']).map((value) => ({ value })),
        answer: right,
        hint: 'Atoms are never destroyed. Where could some of them have gone?',
        explain: ['The reaction makes carbon dioxide, a gas.', 'In an open cup, the gas floats away, taking its mass with it.', `So the reason is: ${right.toLowerCase()}.`],
      };
    }
    const m = pick([250, 300, 386, 420, 500]);
    const choices = [`More than ${m} g`, `Exactly ${m} g`, `Less than ${m} g`];
    const answer = kind === 'open' ? choices[2] : choices[1];
    return {
      prompt: `Vinegar and baking soda in a${kind === 'open' ? 'n OPEN cup' : ' SEALED bottle'} weigh ${m} g. They fizz until they stop. What does the scale read now?`,
      choices: choices.map((value) => ({ value })),
      answer,
      hint: 'The fizz is carbon dioxide gas. Can it get out?',
      explain:
        kind === 'open'
          ? ['The fizz makes carbon dioxide gas.', 'The cup is open, so the gas escapes into the air.', `So the scale reads ${answer.toLowerCase()}.`]
          : ['The fizz makes carbon dioxide gas.', 'The bottle is sealed, so the gas is trapped inside and every atom stays on the scale.', `So the scale reads ${answer.toLowerCase()}.`],
    };
  }

  // Level 2: use the law to calculate, or explain a surprising change in mass.
  const kind = pick(['gas', 'products', 'rust', 'log'] as const);
  if (kind === 'gas') {
    const before = rand(200, 480);
    const gas = rand(2, 9);
    return {
      prompt: `An open cup of vinegar and baking soda weighs ${before} g. After the fizzing, it weighs ${before - gas} g. How many grams of gas escaped?`,
      answer: String(gas),
      hint: 'The missing mass is the gas that left. Find the difference.',
      explain: ['Atoms are not destroyed, so the missing mass went into the air as carbon dioxide gas.', `${before} − ${before - gas} = ${gas}.`, `So ${gas} g of gas escaped.`],
    };
  }
  if (kind === 'products') {
    const a = rand(5, 40);
    const b = rand(5, 40);
    return {
      prompt: `In a sealed flask, ${a} g of one substance reacts completely with ${b} g of another. What is the total mass of the new substances?`,
      answer: String(a + b),
      hint: 'Atoms are rearranged, not made or destroyed. Nothing got in or out.',
      explain: ['In a sealed flask, every atom stays inside.', 'So the mass after equals the mass before.', `${a} + ${b} = ${a + b} g.`],
    };
  }
  if (kind === 'rust') {
    const right = 'It joined with oxygen from the air';
    return {
      prompt: 'A pad of steel wool (iron) is left in an open dish. It rusts and gets HEAVIER. Why?',
      choices: shuffle([right, 'Rust is made from nothing', 'The iron atoms grew bigger']).map((value) => ({ value })),
      answer: right,
      hint: 'Mass can’t appear from nowhere. What could have come IN from outside?',
      explain: ['Rust is a new substance made from iron, oxygen and water.', 'The oxygen (and some water) came from the air, so it adds mass.', `So it got heavier because ${right.toLowerCase()}.`],
    };
  }
  const right = 'Into gases in the air';
  return {
    prompt: 'A 2 kg log burns in a campfire. The ash left behind weighs only a little. Where did most of the mass go?',
    choices: shuffle([right, 'It was destroyed by the fire', 'It turned into light']).map((value) => ({ value })),
    answer: right,
    hint: 'Atoms are never destroyed. Think about the smoke and gases rising from the fire.',
    explain: ['Burning wood joins with oxygen to make carbon dioxide and water vapour.', 'Those gases float away, so most of the mass leaves the fire.', `So the answer is: ${right.toLowerCase()}.`],
  };
}

export const conservationOfMass: Lesson = {
  id: 'conservation-of-mass',
  title: 'Nothing Disappears',
  Thumb,
  Scene: MassScene,
  sceneHint: 'Pick an experiment · Predict the scale · Start · Zoom in on the atoms',
  learn: {
    heading: 'Mass is never lost',
    intro: 'Mass is how much matter something has. In every change, atoms are rearranged, never made or destroyed. So the total mass stays the same, as long as nothing gets in or out. This is the law of conservation of mass.',
    points: [
      { icon: Scale, text: 'Melting and dissolving keep the same mass: the same molecules, arranged differently.' },
      { icon: Atom, text: 'In a chemical reaction, atoms swap partners to make new substances, but every atom is still there.' },
      { icon: Wind, text: 'In an open container, a gas can escape. The scale reads less, but the atoms just went into the air.' },
      { icon: Lock, text: 'Seal the container and the mass stays exactly the same.' },
    ],
  },
  steps: [
    'Pick an experiment and read the scale.',
    'Predict: will it read more, the same or less afterwards?',
    'Press Start and watch the scale.',
    'Zoom in: count the molecules or atoms before and after. Did any leave?',
  ],
  example: {
    question: 'A sealed bag holds 50 g of vinegar and 5 g of baking soda. They fizz and the bag puffs up. What does it weigh now?',
    work: ['Before: 50 + 5 = 55 g.', 'The fizz is carbon dioxide gas, and the bag is sealed, so it can’t escape.', 'No atoms got in or out, so the mass stays the same.'],
    answer: '55 g',
  },
  grownups: [
    'In the 1770s and 1780s Antoine Lavoisier (with Marie-Anne Paulze Lavoisier) weighed reactions in sealed vessels and showed that mass is conserved.',
    'Try it with a kitchen scale: a small bottle of vinegar with a cup of baking soda beside it on the scale, then mix. Open, it gets lighter; with a screw cap on (tip it gently, and open it slowly afterwards), it doesn’t.',
    'If you trap the gas in a balloon instead, the scale may dip slightly as the balloon swells. That is the air pushing up on the bigger balloon (buoyancy), not lost mass.',
    'Look for “where did it go?” moments: a burning candle gets lighter (gases leave); rusting iron gets heavier (oxygen joins it).',
  ],
  makeQuestion,
};
