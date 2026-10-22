import { useState } from 'react';
import { Hourglass, Mountain, Sprout, WavesHorizontal } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { WrapText } from './visuals/Draggable';
import { useProgress } from './visuals/useProgress';

/**
 * Two activities:
 *  - River table: a top-down sand tray. Pour water and the river carves its channel and drops the sand
 *    where it slows at the sea (a delta). A steeper tray moves more sand; plants on the banks move less.
 *  - Weathering: ice, roots and wind-blown sand break a rock down where it is, over many years.
 * Weathering breaks rock; erosion carries the bits away; deposition drops them somewhere new.
 */

type Mode = 'river' | 'weather';
type Agent = 'ice' | 'roots' | 'wind';

const BOX = { x: 40, y: 92, w: 560, h: 420 };
const SAND = '#ecd49a';
const SEA_Y = 448;
const RIVER = 'M96,124 C150,210 270,170 290,250 S210,350 320,378 S430,402 440,452';
const MOUTH = { x: 440, y: 452 };

/** Scoops of sand carried away by one pour (a simple, made-up scale that keeps the comparisons true). */
export function scoops(steep: boolean, plants: boolean): number {
  if (plants) return steep ? 6 : 4;
  return steep ? 18 : 10;
}

function setupKey(steep: boolean, plants: boolean) {
  return `${steep ? 'Steep' : 'Gentle'}, ${plants ? 'plants' : 'bare'}`;
}
const SETUPS = ['Gentle, bare', 'Steep, bare', 'Gentle, plants', 'Steep, plants'];

function riverPredict(steep: boolean, plants: boolean) {
  if (!steep && !plants)
    return {
      question: 'Pour water on bare sand. Will the river carry sand away?',
      options: ['Yes', 'No'],
      actual: 'Yes',
      because: 'Flowing water picks up sand and carries it downhill. At the sea it slows down and drops the sand, building a delta.',
    };
  if (steep && !plants)
    return {
      question: 'A steeper tray. More or less sand moved than a gentle one?',
      options: ['More', 'Less', 'Same'],
      actual: 'More',
      because: 'Water runs faster down a steep slope, and faster water can carry more sand.',
    };
  if (!steep)
    return {
      question: 'Plants on the banks. More or less sand moved than bare sand?',
      options: ['More', 'Less', 'Same'],
      actual: 'Less',
      because: 'Roots hold the sand together and stems slow the water, so less sand is carried away.',
    };
  return {
    question: 'Steep, with plants. More or less than steep and bare?',
    options: ['More', 'Less', 'Same'],
    actual: 'Less',
    because: 'Even on a steep slope, roots hold the sand, so much less is washed away.',
  };
}

// Small plants along the river banks.
const TUFTS: [number, number][] = [
  [70, 170], [150, 150], [200, 230], [250, 150], [340, 230], [330, 300],
  [220, 300], [250, 400], [380, 340], [370, 420], [500, 400], [130, 260],
];

function Tuft({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={shade(C.green, -0.35)} strokeWidth={1.5}>
      <circle cx={x - 8} cy={y} r={9} fill={C.green} />
      <circle cx={x + 7} cy={y - 3} r={10} fill={shade(C.green, 0.15)} />
      <circle cx={x} cy={y - 11} r={8} fill={C.green} />
    </g>
  );
}

function RiverTable() {
  const [steep, setSteep] = useState(false);
  const [plants, setPlants] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);
  const [results, setResults] = useState<Record<string, number>>({});
  const pour = useProgress(steep ? 2200 : 3000);

  const amount = scoops(steep, plants);
  const e = amount * pour.p; // sand moved so far in this pour
  const w = 12 + e * 1.4;
  const r = 8 + e * 3.6;
  const info = riverPredict(steep, plants);

  const change = (s: boolean, pl: boolean) => {
    pour.reset();
    setSteep(s);
    setPlants(pl);
    setGuess(null);
    setObserved(false);
    play('tap');
  };
  const start = () => {
    setObserved(false);
    play('whoosh');
    pour.run(() => {
      setResults((old) => ({ ...old, [setupKey(steep, plants)]: amount }));
      setObserved(true);
      play('pop');
    });
  };

  return (
    <g>
      <clipPath id="ew-tray">
        <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} />
      </clipPath>
      <g clipPath="url(#ew-tray)">
        <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill={SAND} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={90 + i * 95} cy={110 + ((i * 53) % 300)} r={3} fill={shade(SAND, -0.15)} />
        ))}
        <path d={`M${BOX.x},${SEA_Y} q70,-12 140,0 t140,0 t140,0 t140,0 V${BOX.y + BOX.h} H${BOX.x} Z`} fill={shade(C.blue, 0.35)} />
        {/* carved channel, then water */}
        <path d={RIVER} fill="none" stroke={shade(SAND, -0.32)} strokeWidth={w + 14} strokeLinecap="round" />
        <path d={RIVER} fill="none" stroke={C.blue} strokeWidth={w} strokeLinecap="round" />
        {/* the delta: sand dropped where the river slows */}
        <path
          d={`M${MOUTH.x - 8},${MOUTH.y - 6} C${MOUTH.x - r * 0.9},${MOUTH.y + r * 0.1} ${MOUTH.x - r},${MOUTH.y + r * 0.7} ${MOUTH.x - r * 0.5},${MOUTH.y + r * 0.75} Q${MOUTH.x},${MOUTH.y + r} ${MOUTH.x + r * 0.5},${MOUTH.y + r * 0.75} C${MOUTH.x + r},${MOUTH.y + r * 0.7} ${MOUTH.x + r * 0.9},${MOUTH.y + r * 0.1} ${MOUTH.x + 8},${MOUTH.y - 6} Z`}
          fill={shade(SAND, -0.06)}
          stroke={shade(SAND, -0.3)}
          strokeWidth={2}
        />
        {e > 2 &&
          [-0.8, 0, 0.8].map((a) => (
            <path
              key={a}
              d={`M${MOUTH.x},${MOUTH.y} Q${MOUTH.x + Math.sin(a) * r * 0.3},${MOUTH.y + r * 0.35} ${MOUTH.x + Math.sin(a) * r * 0.8},${MOUTH.y + Math.cos(a) * r * 0.72}`}
              stroke={C.blue}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        {pour.running && (
          <path d={RIVER} fill="none" stroke={C.white} strokeOpacity={0.6} strokeWidth={3} strokeDasharray="10 22" strokeDashoffset={-pour.p * (steep ? 900 : 600)} />
        )}
        {plants && TUFTS.map(([x, y]) => <Tuft key={`${x},${y}`} x={x} y={y} />)}
      </g>
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} fill="none" stroke={C.ink} strokeWidth={2.5} />

      {/* the hose at the top of the tray */}
      <rect x={60} y={96} width={64} height={22} rx={8} fill={C.green} stroke={C.ink} strokeWidth={2} />
      {pour.running && <path d="M96,118 q-4,8 0,14 q4,6 0,12" stroke={C.blue} strokeWidth={6} fill="none" strokeLinecap="round" />}

      {/* how the tray is tilted, seen from the side */}
      <g>
        <rect x={470} y={104} width={118} height={84} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2} opacity={0.95} />
        <text x={529} y={126} textAnchor="middle" fontSize={15} fill={C.ink2}>
          Side view
        </text>
        <path d={steep ? 'M484,176 L574,176 L484,136 Z' : 'M484,176 L574,176 L484,160 Z'} fill={SAND} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      </g>

      <text x={BOX.x + BOX.w - 16} y={BOX.y + BOX.h - 14} textAnchor="end" fontSize={15} fontWeight={700} fill={shade(C.blue, -0.5)}>
        Sea
      </text>

      <SvgButton x={40} y={528} w={150} h={50} fontSize={17} label="Gentle" active={!steep} color={!steep ? C.orange : C.card} onClick={() => change(false, plants)} disabled={pour.running} />
      <SvgButton x={198} y={528} w={150} h={50} fontSize={17} label="Steep" active={steep} color={steep ? C.orange : C.card} onClick={() => change(true, plants)} disabled={pour.running} />
      <SvgButton x={360} y={528} w={240} h={50} fontSize={17} label={plants ? '✓ Plants on banks' : 'Plants on banks'} active={plants} color={plants ? C.green : C.card} onClick={() => change(steep, !plants)} disabled={pour.running} />
      <SvgButton x={40} y={598} w={260} h={50} fontSize={19} label="Pour water" onClick={start} disabled={pour.running} color={C.teal} textColor={C.white} />

      {observed ? (
        <ExplainCard x={630} y={92} w={340} prediction={guess} actual={info.actual} because={info.because} onAgain={() => { pour.reset(); setGuess(null); setObserved(false); }} />
      ) : (
        <PredictCard x={630} y={92} w={340} question={info.question} options={info.options} prediction={guess} onPredict={(o) => { setGuess(o); pour.reset(); play('tap'); }} />
      )}

      {/* results: one bar per set-up */}
      <g>
        <rect x={630} y={372} width={340} height={168} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={644} y={396} fontSize={13} fill={C.muted} className="caps">
          Sand carried away (scoops)
        </text>
        {SETUPS.map((s, i) => {
          const n = results[s];
          const y = 412 + i * 31;
          return (
            <g key={s}>
              <text x={644} y={y + 17} fontSize={15} fill={C.ink}>
                {s}
              </text>
              <rect x={770} y={y + 2} width={150} height={20} rx={6} fill={shade(C.line, 0.4)} />
              {n !== undefined && <rect x={770} y={y + 2} width={(n / 20) * 150} height={20} rx={6} fill={C.orange} />}
              <text x={930} y={y + 17} fontSize={15} fontWeight={700} fill={C.ink}>
                {n ?? '–'}
              </text>
            </g>
          );
        })}
      </g>
      <WrapText x={640} y={570} width={320} fontSize={15} fill={C.ink2} text="Real rivers do this over thousands of years. The Grand Canyon took millions." />

      <Callout at={[MOUTH.x - 14, MOUTH.y + 24]} box={[60, 390]} w={210} icon={WavesHorizontal} title="Delta" text="The river slows at the sea and drops its sand here." />
    </g>
  );
}

/* ───────────── Weathering ───────────── */

const AGENTS: Record<Agent, { label: string; question: string; options: string[]; actual: string; because: string }> = {
  ice: {
    label: 'Ice',
    question: 'Water in a crack freezes. Does the crack get bigger or smaller?',
    options: ['Bigger', 'Smaller', 'No change'],
    actual: 'Bigger',
    because: 'Water takes up more space when it freezes, so the ice pushes the crack wider. Freeze, melt, freeze again, and the rock splits.',
  },
  roots: {
    label: 'Roots',
    question: 'A seed grows in a crack. What happens to the rock?',
    options: ['It splits', 'It grows', 'Nothing'],
    actual: 'It splits',
    because: 'As the roots grow thicker they push the crack apart, slowly splitting the rock.',
  },
  wind: {
    label: 'Wind and sand',
    question: 'Wind blows sand at a rock for years. What happens?',
    options: ['Wears away', 'Grows', 'No change'],
    actual: 'Wears away',
    because: 'Each grain chips off a tiny bit of rock. Over many years the rock is worn smooth and smaller.',
  },
};

const ROCK = { cx: 320, base: 420 };

function Rock({ agent, t }: { agent: Agent; t: number }) {
  // t runs 0 → 3 as time passes.
  const k = t / 3;
  const ground = ROCK.base;
  if (agent === 'wind') {
    const s = 1 - 0.35 * k; // the rock shrinks and rounds off
    const round = 10 + 60 * k;
    const w = 240 * s;
    const h = 170 * s;
    return (
      <g>
        <path d={`M${ROCK.cx + 140},${ground} q60,${-14 - 30 * k} 140,0 Z`} fill={SAND} stroke={shade(SAND, -0.3)} strokeWidth={2} />
        <rect x={ROCK.cx - w / 2} y={ground - h} width={w} height={h} rx={round} fill={C.muted} stroke={C.ink} strokeWidth={3} />
        <path d={`M${ROCK.cx - w / 2 + 20},${ground - h * 0.6} h${w * 0.4}`} stroke={shade(C.muted, -0.2)} strokeWidth={3} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <circle key={i} cx={80 + i * 22 + ((t * 40 + i * 13) % 30)} cy={ground - 40 - i * 17} r={3.5} fill={shade(SAND, -0.25)} />
        ))}
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M60,${ground - 70 - i * 40} h70 l-8,-6 m8,6 l-8,6`} stroke={C.ink2} strokeWidth={3} fill="none" strokeLinecap="round" />
        ))}
      </g>
    );
  }
  // ice and roots: a crack that widens until the rock splits in two
  const gap = 4 + 22 * Math.min(1, k * 1.15);
  const split = k > 0.8 ? (k - 0.8) / 0.2 : 0;
  const tilt = 8 * split;
  const top = ground - 180;
  const left = `M${ROCK.cx - 130},${ground} L${ROCK.cx - 140},${top + 50} Q${ROCK.cx - 110},${top} ${ROCK.cx - 20},${top + 4} L${ROCK.cx - gap / 2},${top + 4} L${ROCK.cx - 10 - gap / 2},${top + 70} L${ROCK.cx + 6 - gap / 2},${top + 120} L${ROCK.cx - gap / 4},${ground} Z`;
  const right = `M${ROCK.cx + gap / 2},${top + 6} L${ROCK.cx + 30},${top + 2} Q${ROCK.cx + 120},${top + 6} ${ROCK.cx + 140},${top + 60} L${ROCK.cx + 130},${ground} L${ROCK.cx + gap / 4},${ground} L${ROCK.cx + 6 + gap / 2},${top + 120} L${ROCK.cx - 10 + gap / 2},${top + 70} Z`;
  return (
    <g>
      <g transform={`rotate(${-tilt} ${ROCK.cx - 130} ${ground})`}>
        <path d={left} fill={C.muted} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
      <g transform={`rotate(${tilt} ${ROCK.cx + 130} ${ground})`}>
        <path d={right} fill={shade(C.muted, 0.1)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
      {agent === 'ice' && t > 0 && (
        <g>
          <path
            d={`M${ROCK.cx - gap / 2 + 2},${top + 30} L${ROCK.cx - 10 - gap / 2 + 2},${top + 70} L${ROCK.cx + 6 - gap / 2 + 2},${top + 110} L${ROCK.cx + 6 + gap / 2 - 2},${top + 110} L${ROCK.cx - 10 + gap / 2 - 2},${top + 70} L${ROCK.cx + gap / 2 - 2},${top + 30} Z`}
            fill={t < 1.5 ? shade(C.blue, 0.2) : C.white}
            stroke={shade(C.blue, -0.2)}
            strokeWidth={2}
          />
          <text x={ROCK.cx} y={top - 28} textAnchor="middle" fontSize={16} fontWeight={700} fill={shade(C.blue, -0.4)}>
            {t < 1.5 ? 'Water seeps into the crack' : t < 2.95 ? 'It freezes. The ice pushes!' : 'Split apart!'}
          </text>
        </g>
      )}
      {agent === 'roots' && (
        <g>
          <path d={`M${ROCK.cx - gap / 4},${top + 4} v${-20 - 40 * k}`} stroke={shade(C.green, -0.3)} strokeWidth={4 + 3 * k} strokeLinecap="round" />
          {k > 0.1 && <circle cx={ROCK.cx - 14} cy={top - 20 - 40 * k} r={10 + 14 * k} fill={C.green} stroke={shade(C.green, -0.35)} strokeWidth={2} />}
          {k > 0.1 && <circle cx={ROCK.cx + 12} cy={top - 28 - 40 * k} r={8 + 12 * k} fill={shade(C.green, 0.15)} stroke={shade(C.green, -0.35)} strokeWidth={2} />}
          <path
            d={`M${ROCK.cx - gap / 4},${top + 6} L${ROCK.cx - 10},${top + 70} L${ROCK.cx + 6},${top + 120 * Math.min(1, 0.4 + k)}`}
            stroke={C.brown}
            strokeWidth={3 + gap * 0.45}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {split > 0.5 && [0, 1, 2].map((i) => <circle key={i} cx={ROCK.cx - 30 + i * 30} cy={ground - 6} r={6} fill={shade(C.muted, -0.1)} stroke={C.ink} strokeWidth={1.5} />)}
    </g>
  );
}

function Weathering() {
  const [agent, setAgent] = useState<Agent>('ice');
  const [stage, setStage] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const step = useProgress(900);
  const t = step.running ? stage - 1 + step.p : stage;
  const info = AGENTS[agent];
  const done = stage >= 3 && !step.running;

  const choose = (a: Agent) => {
    step.reset();
    setAgent(a);
    setStage(0);
    setGuess(null);
    play('tap');
  };
  const pass = () => {
    if (stage >= 3) return;
    setStage(stage + 1);
    play('whoosh');
    step.run(() => play(stage + 1 >= 3 ? 'pop' : 'tap'));
  };
  const restart = () => {
    step.reset();
    setStage(0);
    setGuess(null);
  };

  return (
    <g>
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} fill={shade(C.blue, 0.85)} />
      <path d={`M${BOX.x},${ROCK.base} H${BOX.x + BOX.w} V${BOX.y + BOX.h - 18} q0,18 -18,18 H${BOX.x + 18} q-18,0 -18,-18 Z`} fill={shade(C.green, 0.2)} />
      <Rock agent={agent} t={t} />
      <text x={BOX.x + 18} y={BOX.y + 32} fontSize={15} fontWeight={700} fill={C.ink}>
        {['Now', 'Later', 'Much later', 'Many, many years later'][Math.round(t)]}
      </text>
      {/* time steps */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={BOX.x + BOX.w - 90 + i * 22} cy={BOX.y + 26} r={7} fill={i <= stage ? C.orange : C.card} stroke={C.ink} strokeWidth={2} />
      ))}

      {(Object.keys(AGENTS) as Agent[]).map((a, i) => (
        <SvgButton key={a} x={40 + i * 188} y={528} w={180} h={50} fontSize={17} label={AGENTS[a].label} active={agent === a} color={agent === a ? C.orange : C.card} onClick={() => choose(a)} disabled={step.running} />
      ))}
      <SvgButton x={40} y={598} w={260} h={50} fontSize={19} label="Time passes ▸" onClick={pass} disabled={step.running || stage >= 3} color={C.teal} textColor={C.white} />
      <SvgButton x={312} y={598} w={150} h={50} fontSize={17} label="Start again" onClick={() => { restart(); play('tap'); }} disabled={step.running || stage === 0} />

      {done ? (
        <ExplainCard x={630} y={92} w={340} prediction={guess} actual={info.actual} because={info.because} onAgain={restart} />
      ) : (
        <PredictCard x={630} y={92} w={340} question={info.question} options={info.options} prediction={guess} onPredict={(o) => { setGuess(o); play('tap'); }} />
      )}
      <g>
        <rect x={630} y={380} width={340} height={160} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={644} y={404} fontSize={15} fontWeight={700} fill={C.ink}>
          Weathering
        </text>
        <WrapText x={644} y={426} width={316} fontSize={15} fill={C.ink2} text="breaks rock into smaller bits, right where it is." />
        <text x={644} y={474} fontSize={15} fontWeight={700} fill={C.ink}>
          Erosion
        </text>
        <WrapText x={644} y={496} width={316} fontSize={15} fill={C.ink2} text="carries the bits away, by water, wind or ice." />
      </g>
    </g>
  );
}

function ErosionScene() {
  const [mode, setMode] = useState<Mode>('river');
  return (
    <SceneSvg label="A sand tray river and a rock that weathers over time.">
      <SvgButton x={40} y={24} w={170} h={48} fontSize={17} label="River table" active={mode === 'river'} color={mode === 'river' ? C.yellow : C.card} onClick={() => { setMode('river'); play('tap'); }} />
      <SvgButton x={220} y={24} w={170} h={48} fontSize={17} label="Weathering" active={mode === 'weather'} color={mode === 'weather' ? C.yellow : C.card} onClick={() => { setMode('weather'); play('tap'); }} />
      {mode === 'river' ? <RiverTable /> : <Weathering />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={6} width={112} height={68} rx={8} fill={SAND} />
      <path d="M4,60 q20,-5 40,0 t40,0 t32,0 V74 H4 Z" fill={shade(C.blue, 0.35)} />
      <path d="M18,12 C30,30 56,24 56,40 S70,52 74,60" stroke={C.blue} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M74,58 L62,70 Q74,76 86,70 Z" fill={shade(SAND, -0.08)} stroke={shade(SAND, -0.3)} strokeWidth={1.5} />
      <circle cx={92} cy={24} r={7} fill={C.green} />
      <circle cx={100} cy={20} r={6} fill={shade(C.green, 0.15)} />
    </svg>
  );
}

function q(prompt: string, right: string, wrong: string[], hint: string, explain: string[]): Question {
  return { prompt, choices: choices(shuffle([right, ...wrong])), answer: right, hint, explain };
}

function makeQuestion(level: number): Question {
  const kinds = level === 0 ? ['erosion', 'delta', 'roots'] : level === 1 ? ['weathering', 'steep', 'ice', 'wind'] : ['order', 'fast', 'time', 'drop'];
  switch (pick(kinds)) {
    case 'erosion':
      return q('A river carries sand and soil away. What is this called?', 'Erosion', ['Melting', 'Growing'], 'Think about what the water does to the sand in the tray.', [
        'The moving water picks up sand and soil.',
        'It carries them to a new place.',
        'Carrying rock and soil away is called erosion.',
      ]);
    case 'delta':
      return q('Where does a river drop its sand and build a delta?', 'Where it slows down at the sea', ['At the top of the hill', 'Where it flows fastest'], 'Slow water cannot carry as much.', [
        'Fast water can carry sand.',
        'When the river meets the sea, it slows down.',
        'So it drops sand where it slows down at the sea, building a delta.',
      ]);
    case 'roots':
      return q('How do plants help stop erosion?', 'Their roots hold the soil', ['They drink all the rain', 'They make the hill steeper'], 'Compare the tray with and without plants.', [
        'Roots spread through the soil like a net.',
        'Their roots hold the soil, so water carries less away.',
      ]);
    case 'weathering':
      return q('Rock breaking into smaller pieces where it is, is called…', 'Weathering', ['Erosion', 'Floating'], 'Does the rock stay put, or get carried away?', [
        'The rock cracks and crumbles right where it is.',
        'That breaking is called weathering.',
        'Erosion is when the bits are carried away.',
      ]);
    case 'steep':
      return q('Which hill will lose more soil in heavy rain?', 'A steep, bare hill', ['A flat, grassy field', 'A gentle hill with trees'], 'Think about how fast the water runs, and what holds the soil.', [
        'Water runs faster down a steep slope and carries more.',
        'With no plants, nothing holds the soil.',
        'So a steep, bare hill loses the most.',
      ]);
    case 'ice':
      return q('Why can ice split a rock?', 'Water expands when it freezes', ['Ice is very hot', 'Ice is sticky'], 'Try "Ice" in the weathering table.', [
        'Water seeps into a crack.',
        'Water expands when it freezes, so the ice pushes the crack wider.',
        'After many freezes the rock splits.',
      ]);
    case 'wind':
      return q('In a desert, what slowly wears rocks smooth?', 'Wind blowing sand', ['Falling snow', 'Growing roots'], 'Think about what moves a lot in a dry, sandy place.', [
        'Deserts are dry and windy.',
        'Wind blowing sand chips tiny bits off the rock, year after year.',
      ]);
    case 'order':
      return q('Which order is right for a pebble’s journey?', 'Weathering, erosion, deposition', ['Erosion, deposition, weathering', 'Deposition, weathering, erosion'], 'First the rock must break, then move, then stop.', [
        'First the rock breaks into bits (weathering).',
        'Then water carries the bits away (erosion).',
        'Last they are dropped somewhere new (deposition): weathering, erosion, deposition.',
      ]);
    case 'fast':
      return q('Which river can carry the biggest stones?', 'A fast, flooding river', ['A slow, shallow stream', 'A still pond'], 'More speed means more push.', [
        'Faster water pushes harder.',
        'A fast, flooding river can roll and carry big stones.',
      ]);
    case 'time':
      return q('How long did a river take to carve the Grand Canyon?', 'Millions of years', ['One week', 'About 100 years'], 'Erosion is very, very slow.', [
        'A river removes only a little rock each year.',
        'A canyon over a kilometre deep needs a huge number of years.',
        'The Grand Canyon took millions of years.',
      ]);
    default:
      return q('A muddy river reaches a calm lake. Why does sand settle on the bottom?', 'The water slows down', ['The water gets hotter', 'The sand gets lighter'], 'What made the delta grow in the sand tray?', [
        'Moving water can carry sand.',
        'In the calm lake the water slows down.',
        'Slow water cannot hold the sand up, so it drops: that is deposition.',
      ]);
  }
}

export const erosionWeathering: Lesson = {
  id: 'erosion-weathering',
  title: 'Erosion and Weathering',
  Thumb,
  Scene: ErosionScene,
  sceneHint: 'Predict · Pour water on the sand · Try steep and plants · Then let time pass on a rock',
  learn: {
    heading: 'Erosion and weathering',
    intro:
      'Rock does not last for ever. Water, ice, wind and plant roots break it into smaller bits, and moving water and wind carry the bits away. It is slow, but over a long time it shapes valleys, canyons and beaches.',
    points: [
      { icon: Mountain, text: 'Weathering breaks rock where it is.' },
      { icon: WavesHorizontal, text: 'Erosion carries the bits away. Deposition drops them somewhere new.' },
      { icon: Sprout, text: 'Plant roots hold soil and slow erosion.' },
      { icon: Hourglass, text: 'It usually takes thousands or millions of years.' },
    ],
  },
  steps: [
    'Look for what is breaking the rock: ice, roots, wind or water.',
    'Ask what carries the bits away: water, wind or ice.',
    'Fast or steep water carries more. Plants and walls slow it down.',
    'Where the water slows, it drops sand and builds new land.',
  ],
  example: {
    question: 'A path down a hill keeps washing away in the rain. How could you protect it?',
    work: ['The rain runs fast down the bare, steep path.', 'Plant grass and bushes beside it so roots hold the soil.', 'Add steps or small walls to slow the water.'],
    answer: 'Plant along the sides and add steps or walls to slow the water.',
  },
  grownups: [
    'Children often use "erosion" for any breaking. Weathering is the breaking; erosion is the carrying away.',
    'Ice splits rocks because water expands by about a tenth when it freezes; that is why potholes appear after cold winters.',
    'At the beach or in a sandpit, pour water down a slope together and look for a tiny valley and delta.',
  ],
  makeQuestion,
};
