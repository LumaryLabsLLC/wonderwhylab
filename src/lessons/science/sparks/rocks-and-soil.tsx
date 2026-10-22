import { useRef, useState } from 'react';
import { Droplets, FlaskConical, Mountain, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from './visuals/DragToken';
import { reducedMotion, useFrame } from './visuals/anim';
import { byLevel, mcq } from './q';

export type RockId = 'chalk' | 'sandstone' | 'granite' | 'slate';

/** Classroom rock tests (simplified but true). */
export const ROCKS: Record<
  RockId,
  { name: string; color: string; hard: boolean; rough: boolean; soaks: boolean; rub: string; look: string; drip: string }
> = {
  chalk: {
    name: 'Chalk',
    color: '#f2eee4',
    hard: false,
    rough: false,
    soaks: true,
    rub: 'Lots rubs off. It is soft.',
    look: 'Tiny white grains, like powder.',
    drip: 'Chalk has tiny gaps between its grains, so the water soaks in.',
  },
  sandstone: {
    name: 'Sandstone',
    color: '#d9a066',
    hard: false,
    rough: true,
    soaks: true,
    rub: 'Sandy grains rub off. It is soft.',
    look: 'Grains of sand stuck together.',
    drip: 'Sandstone has gaps between its sand grains, so the water soaks in.',
  },
  granite: {
    name: 'Granite',
    color: '#b8b2ad',
    hard: true,
    rough: true,
    soaks: false,
    rub: 'Hardly anything rubs off. It is hard.',
    look: 'Big speckled crystals locked together.',
    drip: 'Granite’s crystals fit tightly together, so the water runs off.',
  },
  slate: {
    name: 'Slate',
    color: '#5f6b7a',
    hard: true,
    rough: false,
    soaks: false,
    rub: 'Only a little rubs off. It is hard.',
    look: 'Very fine grains in flat layers.',
    drip: 'Slate has no gaps for water, so it runs off. That is why roofs use slate.',
  },
};
const ROCK_IDS = Object.keys(ROCKS) as RockId[];

export function Rock({ id, s = 1 }: { id: RockId; s?: number }) {
  const r = ROCKS[id];
  return (
    <g transform={`scale(${s})`}>
      {id === 'slate' ? (
        <g>
          <path d="M-46,10 L-38,-18 L40,-24 L48,4 L40,20 L-38,24 Z" fill={r.color} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M-40,-4 L44,-10 M-42,10 L46,4" stroke={shade(r.color, 0.25)} strokeWidth={2} />
        </g>
      ) : (
        <path d="M-40,14 C-46,-6 -26,-30 2,-28 C28,-30 46,-8 40,12 C36,28 -30,32 -40,14 Z" fill={r.color} stroke={C.ink} strokeWidth={2.5} />
      )}
      {id === 'granite' &&
        [
          [-20, -10],
          [8, -16],
          [22, 4],
          [-6, 8],
          [-26, 8],
          [14, 16],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4.5} fill={i % 3 === 0 ? '#3b3b3b' : i % 3 === 1 ? '#f2d6cf' : C.white} />)}
      {id === 'sandstone' &&
        Array.from({ length: 14 }, (_, i) => <circle key={i} cx={-30 + ((i * 17) % 60)} cy={-16 + ((i * 11) % 34)} r={1.6} fill={shade(r.color, -0.35)} />)}
    </g>
  );
}

// Soil jar: what settles, how fast (seconds after shaking) and how thick.
const LAYERS = [
  { name: 'Stones', color: '#8d8a86', at: 0.6, h: 34 },
  { name: 'Sand', color: '#d9b26b', at: 1.4, h: 44 },
  { name: 'Silt', color: '#a5794f', at: 3, h: 36 },
  { name: 'Clay', color: '#c9a184', at: 5, h: 24 },
];
const JAR = { x: 690, y: 270, w: 180, h: 300 };

type Test = 'rub' | 'drip' | 'look';
type Focus = 'drip' | 'jar';

function RocksScene() {
  const [rock, setRock] = useState<RockId>('chalk');
  const [done, setDone] = useState<Partial<Record<RockId, Test[]>>>({});
  const [last, setLast] = useState<Test | null>(null);
  const [sortBy, setSortBy] = useState<'hard' | 'rough'>('hard');
  const [sorted, setSorted] = useState<Partial<Record<RockId, boolean>>>({});
  const [shake, setShake] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<RockId | null>(null);

  const [focus, setFocus] = useState<Focus>('drip');
  const [guess, setGuess] = useState<string | null>(null);
  const [result, setResult] = useState<{ actual: string; because: string } | null>(null);
  const [jarT, setJarT] = useState<number | null>(null);
  const jarRef = useRef(jarT);
  jarRef.current = jarT;

  useFrame((dt) => {
    const t = jarRef.current;
    if (t === null || t > 7) return;
    const next = t + dt * (reducedMotion() ? 2 : 1);
    setJarT(next);
    if (focus === 'jar' && !result && t < 1.6 && next >= 1.6) {
      setResult({
        actual: 'Stones and sand',
        because: 'Big, heavy bits sink fastest, so stones and sand settle first. Tiny clay bits settle last, on top.',
      });
      play('pop');
    }
  });

  const runTest = (test: Test) => {
    setLast(test);
    setDone((d) => ({ ...d, [rock]: Array.from(new Set([...(d[rock] ?? []), test])) }));
    play('tap');
    if (test === 'drip' && focus === 'drip' && !result) {
      setResult({ actual: ROCKS[rock].soaks ? 'Soak in' : 'Run off', because: ROCKS[rock].drip });
    }
  };

  const chooseRock = (id: RockId) => {
    setRock(id);
    setLast(null);
    setFocus('drip');
    setGuess(null);
    setResult(null);
  };

  const shakeJar = () => {
    if (focus !== 'jar') {
      setFocus('jar');
      setGuess(null);
      setResult(null);
    } else if (result) {
      setResult(null);
    }
    setJarT(0);
    play('whoosh');
  };

  // Sorting bins
  const BIN_Y = 528;
  const bins = sortBy === 'hard' ? [{ v: true, name: 'Hard rocks' }, { v: false, name: 'Soft rocks' }] : [{ v: true, name: 'Rough rocks' }, { v: false, name: 'Smooth rocks' }];
  const prop = (id: RockId) => (sortBy === 'hard' ? ROCKS[id].hard : ROCKS[id].rough);
  const binAt = (p: Pt) => (p.y >= BIN_Y - 10 && p.y <= BIN_Y + 112 ? (p.x >= 40 && p.x < 290 ? true : p.x >= 300 && p.x <= 550 ? false : undefined) : undefined);
  const trySort = (id: RockId, v: boolean | undefined) => {
    if (v === undefined) return;
    setSelected(null);
    if (prop(id) === v) {
      setSorted((s) => ({ ...s, [id]: v }));
      play('correct');
    } else {
      setShake((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
      play('wrong');
    }
  };
  const unsorted = ROCK_IDS.filter((id) => sorted[id] === undefined);

  const info = ROCKS[rock];
  const wet = last === 'drip';
  const jarCloud = jarT === null ? 0 : Math.max(0, 1 - jarT / 6);

  return (
    <SceneSvg label={`Testing ${info.name.toLowerCase()} and a jar of soil`}>
      {/* Test bench */}
      <rect x={40} y={30} width={520} height={260} rx={20} fill={C.card} stroke={C.line} strokeWidth={2} />
      <text x={60} y={58} fontSize={15} fill={C.muted} className="caps">
        Test a rock
      </text>
      <ellipse cx={150} cy={190} rx={80} ry={14} fill={C.ink} opacity={0.12} />
      <g transform="translate(150 150)">
        <Rock id={rock} s={1.7} />
        {wet && info.soaks && <path d="M-30,6 C-20,-6 10,-8 30,4 C20,14 -18,16 -30,6 Z" fill={shade(info.color, -0.25)} opacity={0.7} />}
        {wet && !info.soaks && (
          <g fill={shade(C.blue, 0.2)} stroke={C.blue} strokeWidth={1.5}>
            <ellipse cx={-10} cy={-44} rx={7} ry={9} />
            <ellipse cx={46} cy={34} rx={6} ry={8} />
            <ellipse cx={-56} cy={36} rx={6} ry={8} />
          </g>
        )}
        {last === 'rub' && (
          <path d={info.hard ? 'M70,36 q6,-4 12,0' : 'M60,40 q14,-14 30,0 q-14,6 -30,0 Z'} fill={shade(info.color, -0.1)} stroke={C.ink} strokeWidth={1.5} />
        )}
      </g>
      <text x={150} y={232} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
        {info.name}
      </text>
      {/* Magnifier view */}
      {last === 'look' && (
        <g>
          <circle cx={150} cy={150} r={70} fill="none" stroke={C.ink} strokeWidth={6} />
          <line x1={200} y1={200} x2={236} y2={236} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
        </g>
      )}
      {(['rub', 'drip', 'look'] as Test[]).map((test, i) => (
        <SvgButton
          key={test}
          x={290}
          y={70 + i * 62}
          w={250}
          h={50}
          fontSize={17}
          label={`${done[rock]?.includes(test) ? '✓ ' : ''}${test === 'rub' ? 'Rub it' : test === 'drip' ? 'Drip water on it' : 'Look closely'}`}
          active={last === test}
          color={last === test ? C.yellow : C.card}
          onClick={() => runTest(test)}
        />
      ))}
      <text x={60} y={272} fontSize={15} fill={C.ink2}>
        {last === 'rub' ? info.rub : last === 'look' ? info.look : last === 'drip' ? (info.soaks ? 'The water soaks in.' : 'The water runs off.') : 'Pick a test.'}
      </text>

      {/* Rocks to pick, test and sort */}
      <text x={60} y={330} fontSize={15} fill={C.muted} className="caps">
        Tap a rock to test it · drag it to sort it
      </text>
      {unsorted.map((id, i) => (
        <DragToken
          key={id}
          x={110 + i * 120}
          y={400}
          label={ROCKS[id].name}
          selected={selected === id || rock === id}
          shakeKey={shake[id] ?? 0}
          onTap={() => {
            chooseRock(id);
            setSelected(selected === id ? null : id);
          }}
          onDrop={(p) => trySort(id, binAt(p))}
        >
          <circle r={48} fill={rock === id ? C.yellow : C.card} stroke={C.ink} strokeWidth={rock === id ? 3 : 2} />
          <Rock id={id} s={0.85} />
        </DragToken>
      ))}
      {unsorted.length === 0 && (
        <text x={60} y={406} fontSize={17} fontWeight={700} fill={C.green}>
          All sorted! Try sorting another way.
        </text>
      )}
      {bins.map((b, i) => (
        <g key={b.name} onClick={() => selected && trySort(selected, b.v)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan>
          <rect x={40 + i * 260} y={BIN_Y} width={250} height={100} rx={14} fill={i ? '#eef3f8' : '#f6efe6'} stroke={selected ? C.ink : C.line} strokeWidth={selected ? 3 : 2} strokeDasharray={selected ? undefined : '8 6'} />
          <text x={165 + i * 260} y={BIN_Y + 86} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink2}>
            {b.name}
          </text>
          {ROCK_IDS.filter((id) => sorted[id] === b.v).map((id, k) => (
            <g key={id} transform={`translate(${90 + i * 260 + k * 110} ${BIN_Y + 40})`}>
              <Rock id={id} s={0.8} />
            </g>
          ))}
        </g>
      ))}
      <SvgButton
        x={40}
        y={640}
        w={250}
        h={34}
        fontSize={14}
        label={sortBy === 'hard' ? 'Sort by rough or smooth' : 'Sort by hard or soft'}
        onClick={() => {
          setSortBy(sortBy === 'hard' ? 'rough' : 'hard');
          setSorted({});
        }}
      />

      {/* Predict → observe → explain */}
      {result ? (
        <ExplainCard
          x={600}
          y={16}
          w={370}
          prediction={guess}
          actual={result.actual}
          because={result.because}
          onAgain={() => {
            setResult(null);
            setGuess(null);
            if (focus === 'drip') setLast(null);
          }}
        />
      ) : focus === 'drip' ? (
        <PredictCard x={600} y={16} w={370} question={`Drip water on ${info.name.toLowerCase()}…`} options={['Soak in', 'Run off']} prediction={guess} onPredict={setGuess} />
      ) : (
        <PredictCard x={600} y={16} w={370} question="Shake it. What settles first?" options={['Stones and sand', 'Tiny clay bits']} prediction={guess} onPredict={setGuess} />
      )}

      {/* Soil jar */}
      <g onClick={shakeJar} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="Shake the soil jar">
        <rect x={JAR.x + 20} y={JAR.y - 22} width={JAR.w - 40} height={24} rx={6} fill="#9aa3ad" stroke={C.ink} strokeWidth={2.5} />
        <rect x={JAR.x} y={JAR.y} width={JAR.w} height={JAR.h} rx={20} fill="rgba(255,255,255,0.7)" stroke={C.ink} strokeWidth={3} />
        {jarT === null && (
          <g>
            {/* Before shaking: a heap of mixed-up soil at the bottom of clear water. */}
            <path d={`M${JAR.x + 6},${JAR.y + JAR.h - 6} L${JAR.x + 6},${JAR.y + JAR.h - 80} Q${JAR.x + JAR.w / 2},${JAR.y + JAR.h - 150} ${JAR.x + JAR.w - 6},${JAR.y + JAR.h - 80} L${JAR.x + JAR.w - 6},${JAR.y + JAR.h - 6} Z`} fill="#7a5b3c" />
            {Array.from({ length: 18 }, (_, i) => (
              <circle key={i} cx={JAR.x + 20 + ((i * 37) % (JAR.w - 40))} cy={JAR.y + JAR.h - 20 - ((i * 23) % 70)} r={2 + (i % 3) * 2} fill={['#8d8a86', '#d9b26b', '#c9a184'][i % 3]} />
            ))}
          </g>
        )}
        {(() => {
          if (jarT === null) return null;
          const t = jarT;
          let y = JAR.y + JAR.h - 6;
          return LAYERS.map((l) => {
            const k = Math.min(1, Math.max(0, (t - l.at * 0.5) / (l.at * 0.5)));
            if (k <= 0) return null;
            const h = l.h * k;
            y -= h;
            return <rect key={l.name} x={JAR.x + 6} y={y} width={JAR.w - 12} height={h} rx={k === 1 ? 4 : 2} fill={l.color} />;
          });
        })()}
        <rect x={JAR.x + 6} y={JAR.y + 40} width={JAR.w - 12} height={JAR.h - 46} rx={14} fill="#8a6a4a" opacity={jarCloud * 0.8} />
        <rect x={JAR.x + 6} y={JAR.y + 40} width={JAR.w - 12} height={JAR.h - 46} rx={14} fill="#cfe6f7" opacity={0.25} />
        {jarT !== null && jarT > 5 &&
          [0, 1, 2].map((i) => <ellipse key={i} cx={JAR.x + 50 + i * 40} cy={JAR.y + 46} rx={12} ry={4} fill="#4f3a24" />)}
      </g>
      {jarT !== null &&
        jarT > 5 &&
        LAYERS.map((l, i) => (
          <text key={l.name} x={JAR.x + JAR.w + 12} y={JAR.y + JAR.h - 22 - [0, 38, 80, 112][i]} fontSize={14} fill={C.ink2}>
            {l.name}
          </text>
        ))}
      {jarT !== null && jarT > 5 && (
        <text x={JAR.x + JAR.w + 14} y={JAR.y + 50} fontSize={14} fill={C.ink2}>
          Leaves float
        </text>
      )}
      <SvgButton x={JAR.x} y={JAR.y + JAR.h + 18} w={JAR.w} h={50} fontSize={17} label="Shake the jar" color={C.teal} textColor={C.white} onClick={shakeJar} />

      <Callout at={[150, 150]} box={[300, 300]} w={220} icon={Search} title="Rock tests" text="Rub it, drip water on it and look closely. Rocks are all different!" />
      <Callout at={[JAR.x + JAR.w / 2, JAR.y + JAR.h - 30]} box={[880, 360]} w={110} icon={FlaskConical} title="Layers" text="Heavy bits sink first." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(24 50) scale(0.45)">
        <Rock id="granite" />
      </g>
      <g transform="translate(52 62) scale(0.4)">
        <Rock id="sandstone" />
      </g>
      <rect x={78} y={12} width={32} height={60} rx={6} fill="#eef6fc" stroke={C.ink} strokeWidth={2} />
      <rect x={80} y={58} width={28} height={12} fill="#8d8a86" />
      <rect x={80} y={48} width={28} height={10} fill="#d9b26b" />
      <rect x={80} y={40} width={28} height={8} fill="#a5794f" />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

const rockPicture = (id: RockId) => (
  <svg viewBox="-70 -50 140 100" role="img" aria-label={ROCKS[id].name}>
    <Rock id={id} s={1.3} />
  </svg>
);

function softRock(): Question {
  const soft = pick(ROCK_IDS.filter((id) => !ROCKS[id].hard));
  const hard = pick(ROCK_IDS.filter((id) => ROCKS[id].hard));
  return mcq({
    prompt: 'Which rock rubs away easily?',
    answer: ROCKS[soft].name,
    wrong: [ROCKS[hard].name],
    hint: 'Soft rocks wear away when you rub them.',
    explain: [`${ROCKS[soft].name} is a soft rock, so grains rub off.`, `${ROCKS[hard].name} is hard, so hardly anything rubs off.`, `So ${ROCKS[soft].name.toLowerCase()} rubs away easily.`],
  });
}

function hardRock(): Question {
  const hard = pick(ROCK_IDS.filter((id) => ROCKS[id].hard));
  const softs = shuffle(ROCK_IDS.filter((id) => !ROCKS[id].hard));
  return mcq({
    prompt: 'Which rock is hard?',
    answer: ROCKS[hard].name,
    wrong: softs.map((id) => ROCKS[id].name),
    hint: 'A hard rock hardly wears away when you rub it.',
    explain: [`When you rub ${ROCKS[hard].name.toLowerCase()}, hardly anything comes off.`, `So ${ROCKS[hard].name.toLowerCase()} is the hard rock.`],
  });
}

function soilMadeOf(): Question {
  return mcq({
    prompt: 'What is soil made of?',
    answer: 'Tiny bits of rock and old leaves',
    wrong: ['Sugar and salt', 'Plastic and paper'],
    hint: 'Shake the soil jar on the playground and look at the layers.',
    explain: ['Soil has tiny bits of rock: stones, sand, silt and clay.', 'It also has old rotting leaves, air and water.', 'So soil is tiny bits of rock and old leaves.'],
  });
}

function dripTest(): Question {
  const id = pick(ROCK_IDS);
  const answer = ROCKS[id].soaks ? 'It soaks in' : 'It runs off';
  return mcq({
    prompt: `You drip water on ${ROCKS[id].name.toLowerCase()}. What happens?`,
    visual: rockPicture(id),
    answer,
    wrong: [ROCKS[id].soaks ? 'It runs off' : 'It soaks in'],
    hint: 'Does this rock have tiny gaps between its grains?',
    explain: [ROCKS[id].drip, `So ${answer.toLowerCase()}.`],
  });
}

function roofRock(): Question {
  return mcq({
    prompt: 'Which rock is best for a roof?',
    answer: 'Slate',
    wrong: ['Chalk', 'Sandstone'],
    hint: 'A roof must keep rain out. Which rock lets water run off?',
    explain: ['Water runs off slate instead of soaking in.', 'Slate also splits into thin, flat layers.', 'So slate is best for a roof.'],
  });
}

function roughRock(): Question {
  const rough = pick(ROCK_IDS.filter((id) => ROCKS[id].rough));
  const smooth = pick(ROCK_IDS.filter((id) => !ROCKS[id].rough));
  return mcq({
    prompt: 'Which rock feels rough?',
    answer: ROCKS[rough].name,
    wrong: [ROCKS[smooth].name],
    hint: 'Look closely: can you see big grains or crystals?',
    explain: [`${ROCKS[rough].name}: ${ROCKS[rough].look.toLowerCase()}`, `Big grains make it feel rough, so ${ROCKS[rough].name.toLowerCase()} is rough.`],
  });
}

function jarBottom(): Question {
  return mcq({
    prompt: 'You shake soil in a jar of water and wait. What is at the bottom?',
    answer: 'Stones and sand',
    wrong: ['Tiny clay bits', 'Old leaves'],
    hint: 'Which bits are biggest and heaviest?',
    explain: ['Big, heavy bits sink fastest.', 'So stones and sand settle at the bottom first.'],
  });
}

function settlesLast(): Question {
  return mcq({
    prompt: 'In the soil jar, which bits settle last?',
    answer: 'Tiny clay bits',
    wrong: ['Stones', 'Sand'],
    hint: 'Tiny, light bits sink very slowly.',
    explain: ['Clay bits are tiny and very light.', 'They sink so slowly that they settle last, on top.', 'So tiny clay bits settle last.'],
  });
}

function whyChalkSoaks(): Question {
  return mcq({
    prompt: 'Why does chalk soak up water?',
    answer: 'It has tiny gaps between its grains',
    wrong: ['It is very hard', 'It is made of metal'],
    hint: 'Where can the water go inside the rock?',
    explain: ['Chalk is made of tiny grains with little gaps between them.', 'Water fills the gaps.', 'So it soaks in because it has tiny gaps between its grains.'],
  });
}

function sandstoneIs(): Question {
  return mcq({
    prompt: 'Which rock is made of sand grains stuck together?',
    answer: 'Sandstone',
    wrong: ['Granite', 'Slate'],
    hint: 'Listen to the name!',
    explain: ['Sandstone forms when layers of sand get squashed and stuck together.', 'So the answer is sandstone.'],
  });
}

export const rocksAndSoil: Lesson = {
  id: 'rocks-and-soil',
  title: 'Rocks and Soil',
  Thumb,
  Scene: RocksScene,
  sceneHint: 'Guess, then test a rock · Sort the rocks · Shake the soil jar',
  learn: {
    heading: 'Rocks and soil',
    intro: 'Rocks are not all the same. Some are hard and some are soft; some soak up water and some do not. Soil is made from tiny bits of rock mixed with old leaves, air and water.',
    points: [
      { icon: Mountain, text: 'Hard rocks like granite hardly wear away. Soft rocks like chalk rub away.' },
      { icon: Droplets, text: 'Some rocks soak up water. Others, like slate, let it run off.' },
      { icon: Search, text: 'Look closely: grains, crystals or flat layers.' },
      { icon: FlaskConical, text: 'Shake soil in water: heavy bits settle first.' },
    ],
  },
  steps: [
    'Pick a rock and guess: will water soak in or run off?',
    'Test it: rub it, drip water on it and look closely.',
    'Sort the rocks: hard or soft, rough or smooth.',
    'Shake the soil jar and watch the layers settle.',
  ],
  example: {
    question: 'You drip water on slate and on sandstone. What happens?',
    work: ['Sandstone has gaps between its grains, so water soaks in.', 'Slate has no gaps, so water runs off.'],
    answer: 'It soaks into sandstone and runs off slate.',
  },
  grownups: [
    'Collect a few stones on a walk and test them at home: rub them together, drip water on them and look with a magnifying glass.',
    'Make a soil jar: half soil, half water, a lid on tight. Shake and leave it for a day to see clear layers.',
    'Hard rocks like granite and slate are used for buildings, steps and roofs because they last a long time.',
  ],
  makeQuestion: (level) => byLevel(level, [[softRock, hardRock, soilMadeOf], [dripTest, roofRock, roughRock, sandstoneIs], [jarBottom, settlesLast, whyChalkSoaks, dripTest]]),
};
