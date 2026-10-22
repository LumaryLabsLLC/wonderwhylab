import { useEffect, useRef, useState } from 'react';
import { Droplets, Eye, MoveHorizontal, Umbrella } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { ExplainCard, PredictCard, wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from './visuals/DragToken';
import { reducedMotion } from './visuals/anim';
import { byLevel, mcq } from './q';

type Mat = 'glass' | 'plastic' | 'foil' | 'rubber' | 'paper' | 'cotton';
type Test = 'drip' | 'pull' | 'shine';
type Prop = 'waterproof' | 'absorbent' | 'stretchy' | 'seeThrough';

interface Material {
  id: Mat;
  name: string;
  waterproof: boolean;
  absorbent: boolean;
  stretchy: boolean;
  seeThrough: boolean;
  /** How much torch light gets through: 1 clear, a little for thin cloth/paper, 0 none. */
  light: number;
  fill: string;
  opacity: number;
}

const MATS: Material[] = [
  { id: 'glass', name: 'glass', waterproof: true, absorbent: false, stretchy: false, seeThrough: true, light: 1, fill: '#a8dcf0', opacity: 0.4 },
  { id: 'plastic', name: 'clear plastic', waterproof: true, absorbent: false, stretchy: false, seeThrough: true, light: 1, fill: '#e3f1f7', opacity: 0.35 },
  { id: 'foil', name: 'kitchen foil', waterproof: true, absorbent: false, stretchy: false, seeThrough: false, light: 0, fill: '#c9ced6', opacity: 1 },
  { id: 'rubber', name: 'rubber', waterproof: true, absorbent: false, stretchy: true, seeThrough: false, light: 0, fill: '#e0703f', opacity: 1 },
  { id: 'paper', name: 'paper towel', waterproof: false, absorbent: true, stretchy: false, seeThrough: false, light: 0.25, fill: '#fbfaf5', opacity: 1 },
  { id: 'cotton', name: 'cotton cloth', waterproof: false, absorbent: true, stretchy: false, seeThrough: false, light: 0.2, fill: '#9ec5ea', opacity: 1 },
];
const mat = (id: Mat) => MATS.find((m) => m.id === id)!;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const PROPS: { id: Prop; label: string }[] = [
  { id: 'waterproof', label: 'Waterproof' },
  { id: 'absorbent', label: 'Absorbent' },
  { id: 'stretchy', label: 'Stretchy' },
  { id: 'seeThrough', label: 'See-through' },
];
const REVEALS: Record<Test, Prop[]> = { drip: ['waterproof', 'absorbent'], pull: ['stretchy'], shine: ['seeThrough'] };

const TESTS: { id: Test; label: string }[] = [
  { id: 'drip', label: 'Drip 💧' },
  { id: 'pull', label: 'Pull ↔' },
  { id: 'shine', label: 'Shine 🔦' },
];

function predictFor(m: Material, t: Test) {
  if (t === 'drip')
    return {
      question: `Will water soak into the ${m.name}?`,
      options: ['Soaks in', 'Stays on top'],
      actual: m.absorbent ? 'Soaks in' : 'Stays on top',
      because: m.absorbent
        ? `${cap(m.name)} is absorbent: it soaks up water. Water gets through it, so it is not waterproof.`
        : `${cap(m.name)} is waterproof: water can’t get in or through it. It is not absorbent.`,
    };
  if (t === 'pull')
    return {
      question: `Will the ${m.name} stretch?`,
      options: ['Stretches', 'Stays the same'],
      actual: m.stretchy ? 'Stretches' : 'Stays the same',
      because: m.stretchy ? `${cap(m.name)} is stretchy: it gets longer when pulled, then springs back.` : `${cap(m.name)} is not stretchy: pulling doesn’t make it longer.`,
    };
  return {
    question: `Will you see the star clearly through the ${m.name}?`,
    options: ['Yes', 'No'],
    actual: m.seeThrough ? 'Yes' : 'No',
    because: m.seeThrough
      ? `${cap(m.name)} is see-through (transparent): light passes straight through it.`
      : m.light > 0
        ? `Only a little light gets through the ${m.name}, so you can’t see the star. It is not see-through.`
        : `${cap(m.name)} blocks the light and makes a shadow. It is not see-through (opaque).`,
  };
}

interface Job {
  id: string;
  name: string;
  emoji: string;
  needs: Prop;
  good: Mat[];
  /** Waterproof but still a poor choice for the job. */
  poor?: Partial<Record<Mat, string>>;
}
const JOBS: Job[] = [
  { id: 'window', name: 'a window', emoji: '🪟', needs: 'seeThrough', good: ['glass', 'plastic'] },
  { id: 'mop', name: 'a cloth to mop a spill', emoji: '🥛', needs: 'absorbent', good: ['paper', 'cotton'] },
  { id: 'band', name: 'a hair band', emoji: '🎀', needs: 'stretchy', good: ['rubber'] },
  {
    id: 'umbrella',
    name: 'an umbrella',
    emoji: '☂️',
    needs: 'waterproof',
    good: ['plastic', 'rubber'],
    poor: { glass: 'Glass is waterproof, but it is heavy and would break.', foil: 'Foil is waterproof, but it tears too easily.' },
  },
];
const PROP_WORD: Record<Prop, string> = { waterproof: 'waterproof', absorbent: 'absorbent', stretchy: 'stretchy', seeThrough: 'see-through' };

// Stand geometry
const SX = 220;
const SY = 330;
const SW = 180;
const SH = 100;

function Swatch({ m, x, y, w, h, wet = 0, sx = 1 }: { m: Material; x: number; y: number; w: number; h: number; wet?: number; sx?: number }) {
  const W = w * sx;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-W / 2} y={-h / 2} width={W} height={h} rx={m.id === 'glass' ? 4 : 10} fill={m.fill} fillOpacity={m.opacity} stroke={C.ink} strokeWidth={2.5} />
      {(m.id === 'glass' || m.id === 'plastic') && <path d={`M${-W / 2 + 14},${h / 2 - 14} l${h * 0.5},${-h * 0.6} M${-W / 2 + 34},${h / 2 - 12} l${h * 0.3},${-h * 0.36}`} stroke={C.white} strokeWidth={4} strokeLinecap="round" />}
      {m.id === 'foil' && <path d={`M${-W / 2 + 10},${-h / 4} l${W / 4},${h / 6} l${W / 4},${-h / 5} l${W / 4},${h / 4} M${-W / 2 + 20},${h / 4} l${W / 3},${-h / 8} l${W / 3},${h / 7}`} fill="none" stroke={C.white} strokeWidth={2.5} />}
      {m.id === 'paper' &&
        Array.from({ length: 12 }, (_, i) => <circle key={i} cx={-W / 2 + 14 + (i % 6) * ((W - 28) / 5)} cy={i < 6 ? -h / 5 : h / 5} r={2.5} fill="#ddd8c8" />)}
      {m.id === 'cotton' &&
        Array.from({ length: 5 }, (_, i) => <line key={i} x1={-W / 2 + 8} x2={W / 2 - 8} y1={-h / 2 + 16 + i * ((h - 32) / 4)} y2={-h / 2 + 16 + i * ((h - 32) / 4)} stroke={shade(m.fill, -0.15)} strokeWidth={2} />)}
      {wet > 0 && <ellipse cx={0} cy={0} rx={Math.min(W / 2 - 4, 90 * wet)} ry={Math.min(h / 2 - 4, 50 * wet)} fill="#5fb3ec" opacity={0.4} />}
    </g>
  );
}

function Drop({ x, y, r = 9 }: { x: number; y: number; r?: number }) {
  return <path d={`M${x},${y - r * 1.6} Q${x + r},${y - r * 0.2} ${x},${y + r} Q${x - r},${y - r * 0.2} ${x},${y - r * 1.6} Z`} fill="#5fb3ec" stroke={C.ink} strokeWidth={1.5} />;
}

function Stand({ m, test, t }: { m: Material | null; test: Test | null; t: number }) {
  const top = SY - SH / 2;
  const bottom = SY + SH / 2;
  if (!m)
    return (
      <g>
        <rect x={SX - SW / 2} y={top} width={SW} height={SH} rx={12} fill="none" stroke={C.line} strokeWidth={3} strokeDasharray="10 8" />
        <text x={SX} y={SY} textAnchor="middle" dominantBaseline="central" fontSize={16} fill={C.muted}>
          Put a material here
        </text>
      </g>
    );
  const running = t > 0;
  if (test === 'pull') {
    const s = m.stretchy ? 1 + 0.3 * (t < 0.55 ? t / 0.55 : t < 0.85 ? 1 : (1 - t) / 0.15) : 1;
    const half = (SW * s) / 2;
    return (
      <g>
        <Swatch m={m} x={SX} y={SY} w={SW} h={SH} sx={s} />
        {[-1, 1].map((d) => (
          <g key={d}>
            <rect x={SX + d * half - 14} y={SY - SH / 2 - 10} width={28} height={SH + 20} rx={6} fill="#8a93a6" stroke={C.ink} strokeWidth={2.5} />
            {running && t < 0.85 && <path d={`M${SX + d * (half + 18)},${SY} l${d * 26},0 m${-d * 11},-10 l${d * 11},10 l${-d * 11},10`} fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        ))}
      </g>
    );
  }
  if (test === 'shine') {
    const on = running;
    const through = on ? m.light : 0;
    return (
      <g>
        {/* Screen with a star behind the material */}
        <rect x={SX + SW / 2 + 40} y={SY - 80} width={44} height={160} rx={8} fill={on ? (through > 0 ? shade(C.yellow, 1 - through * 0.6) : '#4a5568') : C.card} stroke={C.ink} strokeWidth={2.5} />
        {on && m.seeThrough && (
          <text x={SX + SW / 2 + 62} y={SY} textAnchor="middle" dominantBaseline="central" fontSize={30} fill={C.orange}>
            ★
          </text>
        )}
        {on && <polygon points={`${SX - SW / 2 - 50},${SY - 18} ${SX - SW / 2},${SY - 46} ${SX - SW / 2},${SY + 46} ${SX - SW / 2 - 50},${SY + 18}`} fill="#ffe680" opacity={0.75} />}
        {on && through > 0 && <polygon points={`${SX + SW / 2},${SY - 46} ${SX + SW / 2 + 40},${SY - 60} ${SX + SW / 2 + 40},${SY + 60} ${SX + SW / 2},${SY + 46}`} fill="#ffe680" opacity={0.75 * through} />}
        <Swatch m={m} x={SX} y={SY} w={SW} h={SH} />
        <rect x={SX - SW / 2 - 78} y={SY - 18} width={34} height={36} rx={6} fill={C.ink2} stroke={C.ink} strokeWidth={2} />
        <rect x={SX - SW / 2 - 50} y={SY - 22} width={10} height={44} rx={3} fill={on ? C.yellow : '#8a93a6'} stroke={C.ink} strokeWidth={2} />
      </g>
    );
  }
  // Drip (also the resting view)
  const drops = [0, 0.22, 0.44];
  const wet = m.absorbent ? Math.max(0, Math.min(1, (t - 0.1) / 0.6)) : 0;
  const cupWater = m.absorbent ? Math.max(0, Math.min(1, (t - 0.55) / 0.4)) * 16 : 0;
  return (
    <g>
      {/* rack */}
      <rect x={SX - SW / 2 - 12} y={bottom - 2} width={14} height={86} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <rect x={SX + SW / 2 - 2} y={bottom - 2} width={14} height={86} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      {/* cup */}
      <path d={`M${SX - 38},${bottom + 26} L${SX + 38},${bottom + 26} L${SX + 30},${bottom + 84} L${SX - 30},${bottom + 84} Z`} fill={C.white} fillOpacity={0.7} stroke={C.ink} strokeWidth={2} />
      {cupWater > 0 && <rect x={SX - 29} y={bottom + 83 - cupWater} width={58} height={cupWater} fill="#5fb3ec" opacity={0.8} />}
      <Swatch m={m} x={SX} y={SY} w={SW} h={SH} wet={wet} />
      {/* dropper */}
      {test === 'drip' && (
        <g>
          <rect x={SX - 10} y={top - 112} width={20} height={56} rx={4} fill={C.white} stroke={C.ink} strokeWidth={2} />
          <rect x={SX - 14} y={top - 132} width={28} height={24} rx={10} fill={C.red} stroke={C.ink} strokeWidth={2} />
          <path d={`M${SX - 4},${top - 56} L${SX},${top - 44} L${SX + 4},${top - 56}`} fill={C.white} stroke={C.ink} strokeWidth={2} />
        </g>
      )}
      {running &&
        drops.map((d0, i) => {
          const k = (t - d0) / 0.18;
          if (k < 0) return null;
          if (k < 1) return <Drop key={i} x={SX + (i - 1) * 4} y={top - 40 + k * 34} />;
          if (!m.absorbent) return <Drop key={i} x={SX + (i - 1) * 36} y={top - 6} r={10} />;
          const k2 = (t - d0 - 0.35) / 0.2;
          return k2 > 0 && k2 < 1 ? <Drop key={i} x={SX + (i - 1) * 6} y={bottom + 6 + k2 * 60} r={7} /> : null;
        })}
    </g>
  );
}

function MaterialsScene() {
  const [onStand, setOnStand] = useState<Mat | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [t, setT] = useState(0);
  const [done, setDone] = useState(false);
  const [known, setKnown] = useState<Record<Mat, Prop[]>>(() => Object.fromEntries(MATS.map((m) => [m.id, []])) as unknown as Record<Mat, Prop[]>);
  const [jobIdx, setJobIdx] = useState(0);
  const [jobMsg, setJobMsg] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  const m = onStand ? mat(onStand) : null;
  const running = t > 0 && !done;
  const job = JOBS[jobIdx];

  const clearRun = () => {
    window.clearInterval(timer.current);
    setT(0);
    setDone(false);
    setGuess(null);
  };

  const place = (id: Mat) => {
    if (running) return;
    setOnStand(id);
    clearRun();
    setJobMsg('');
    play('pop');
  };

  const chooseTest = (id: Test) => {
    if (running) return;
    setTest(id);
    clearRun();
    play('tap');
  };

  const run = () => {
    if (!m || !test || !guess || running) return;
    window.clearInterval(timer.current);
    const finish = () => {
      window.clearInterval(timer.current);
      setT(1);
      setDone(true);
      setKnown((k) => ({ ...k, [m.id]: [...new Set([...k[m.id], ...REVEALS[test]])] }));
      play(predictFor(m, test).actual === guess ? 'correct' : 'pop');
    };
    if (reducedMotion()) return finish();
    let k = 0;
    timer.current = window.setInterval(() => {
      k += 1;
      if (k >= 50) finish();
      else setT(k / 50);
    }, 36);
  };

  const useForJob = () => {
    if (!m) return;
    if (job.good.includes(m.id)) {
      play('correct');
      setJobMsg(`Yes! ${cap(m.name)} is ${PROP_WORD[job.needs]}, so it is good for ${job.name}.`);
    } else {
      play('wrong');
      setJobMsg(job.poor?.[m.id] ?? `Not yet. ${cap(m.name)} is not ${PROP_WORD[job.needs]}. Test another material.`);
    }
  };

  const nextJob = () => {
    setJobIdx((i) => (i + 1) % JOBS.length);
    setJobMsg('');
    play('tap');
  };

  const poe = m && test ? predictFor(m, test) : null;

  return (
    <SceneSvg label="Test materials to find out what they are like">
      {/* Shelf of materials */}
      <rect x={40} y={128} width={920} height={10} rx={5} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      {MATS.map((x, i) =>
        onStand === x.id ? null : (
          <DragToken
            key={`${x.id}-${onStand}`}
            x={118 + i * 153}
            y={70}
            label={x.name}
            disabled={running}
            onTap={() => place(x.id)}
            onDrop={(p) => {
              if (p.x >= 40 && p.x <= 400 && p.y >= 150 && p.y <= 600) place(x.id);
            }}
          >
            <rect x={-62} y={-42} width={124} height={92} fill="transparent" />
            <Swatch m={x} x={0} y={-8} w={96} h={50} />
            <text y={38} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
              {x.name}
            </text>
          </DragToken>
        ),
      )}

      {/* Test stand */}
      <rect x={40} y={152} width={360} height={366} rx={18} fill={shade(C.blue, 0.9)} stroke={C.line} strokeWidth={2} />
      <text x={58} y={180} fontSize={15} fill={C.muted} className="caps">
        Test stand
      </text>
      <Stand m={m} test={test} t={t} />
      {TESTS.map((x, i) => (
        <SvgButton key={x.id} x={40 + i * 124} y={530} w={112} h={52} fontSize={18} label={x.label} active={test === x.id} color={test === x.id ? C.yellow : C.card} disabled={running} onClick={() => chooseTest(x.id)} />
      ))}
      <SvgButton x={40} y={596} w={360} h={56} fontSize={19} label={running ? 'Testing…' : 'Run the test ▶'} color={C.teal} textColor={C.white} disabled={!guess || running || done} onClick={run} />

      {/* Predict → observe → explain */}
      {!m || !test || !poe ? (
        <g>
          <rect x={430} y={152} width={530} height={92} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
          <text x={452} y={190} fontSize={18} fontWeight={700} fill={C.ink}>
            {!m ? 'Drag a material onto the test stand.' : 'Now pick a test: Drip, Pull or Shine.'}
          </text>
          <text x={452} y={220} fontSize={16} fill={C.ink2}>
            {!m ? 'Or tap one to put it there.' : 'Each test shows something different.'}
          </text>
        </g>
      ) : done ? (
        <ExplainCard x={430} y={152} w={530} prediction={guess} actual={poe.actual} because={poe.because} onAgain={clearRun} />
      ) : (
        <PredictCard x={430} y={152} w={530} question={poe.question} options={poe.options} prediction={guess} onPredict={setGuess} />
      )}

      {/* What we found out */}
      <rect x={430} y={400} width={250} height={252} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={448} y={428} fontSize={15} fill={C.muted} className="caps">
        We found out
      </text>
      <text x={448} y={458} fontSize={19} fontWeight={700} fill={C.ink}>
        {m ? cap(m.name) : '…'}
      </text>
      {PROPS.map((p, i) => {
        const k = m && known[m.id].includes(p.id);
        const yes = m && m[p.id];
        return (
          <g key={p.id}>
            <text x={448} y={498 + i * 38} fontSize={17} fill={C.ink}>
              {p.label}?
            </text>
            <text x={662} y={498 + i * 38} textAnchor="end" fontSize={17} fontWeight={700} fill={!k ? C.muted : yes ? shade(C.green, -0.25) : C.red}>
              {!k ? '?' : yes ? '✓ Yes' : '✗ No'}
            </text>
          </g>
        );
      })}

      {/* Choose a material for a job */}
      <rect x={696} y={400} width={264} height={252} rx={16} fill={shade(C.green, 0.85)} stroke={C.ink} strokeWidth={2} />
      <text x={714} y={428} fontSize={15} fill={C.muted} className="caps">
        Job
      </text>
      {wrap(`${job.emoji} Make ${job.name}`, 22).map((line, i) => (
        <text key={i} x={714} y={456 + i * 22} fontSize={18} fontWeight={700} fill={C.ink}>
          {line}
        </text>
      ))}
      <text x={714} y={510} fontSize={16} fill={C.ink2}>
        It must be {PROP_WORD[job.needs]}.
      </text>
      {jobMsg ? (
        wrap(jobMsg, 27).map((line, i) => (
          <text key={i} x={714} y={538 + i * 19} fontSize={15} fill={C.ink}>
            {line}
          </text>
        ))
      ) : (
        <SvgButton x={714} y={526} w={228} h={50} fontSize={16} label={m ? `Use the ${m.name}` : 'Pick a material first'} disabled={!m} onClick={useForJob} />
      )}
      <SvgButton x={714} y={594} w={228} h={48} fontSize={16} label="Next job ▶" onClick={nextJob} />

    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={14} y={36} width={40} height={26} rx={4} fill="#a8dcf0" fillOpacity={0.5} stroke={C.ink} strokeWidth={2} />
      <rect x={66} y={36} width={40} height={26} rx={5} fill="#9ec5ea" stroke={C.ink} strokeWidth={2} />
      <ellipse cx={86} cy={49} rx={13} ry={8} fill={shade('#9ec5ea', -0.35)} opacity={0.6} />
      <path d="M34,10 Q40,20 34,26 Q28,20 34,10 Z" fill="#5fb3ec" stroke={C.ink} strokeWidth={1.5} />
      <path d="M86,10 Q92,20 86,26 Q80,20 86,10 Z" fill="#5fb3ec" stroke={C.ink} strokeWidth={1.5} />
      <circle cx={26} cy={34} r={4} fill="#5fb3ec" stroke={C.ink} strokeWidth={1} />
    </svg>
  );
}

/** A small material swatch for question cards. */
function MatPicture({ m }: { m: Material }) {
  return (
    <svg viewBox="0 0 130 90" role="img" aria-label={m.name}>
      <Swatch m={m} x={65} y={34} w={100} h={50} />
      <text x={65} y={82} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
        {m.name}
      </text>
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────
const PROP_MEANS: Record<Prop, string> = {
  waterproof: 'does not let water through',
  absorbent: 'soaks up water',
  stretchy: 'gets longer when you pull it, then springs back',
  seeThrough: 'lets light through so you can see through it',
};

function pickByProp(p: Prop) {
  const right = pick(MATS.filter((m) => m[p]));
  const wrong = shuffle(MATS.filter((m) => !m[p])).slice(0, 2);
  return { right, wrong };
}

function whichIs(level: number): Question {
  const p = level === 0 ? pick(['absorbent', 'seeThrough', 'stretchy'] as Prop[]) : pick(PROPS.map((x) => x.id));
  const { right, wrong } = pickByProp(p);
  const all = [right, ...wrong];
  return mcq({
    prompt: `Which material is ${PROP_WORD[p]}?`,
    answer: right.id,
    wrong: wrong.map((w) => w.id),
    labels: Object.fromEntries(all.map((m) => [m.id, <MatPicture key={m.id} m={m} />])),
    names: Object.fromEntries(all.map((m) => [m.id, m.name])),
    hint: `${cap(PROP_WORD[p])} means it ${PROP_MEANS[p]}. Which one does that?`,
    explain: [`${cap(PROP_WORD[p])} means it ${PROP_MEANS[p]}.`, `So the answer is the ${right.name}.`],
  });
}

function dripResult(): Question {
  const m = pick(MATS);
  return mcq({
    prompt: `You drip water onto ${m.name}. What happens?`,
    visual: <MatPicture m={m} />,
    answer: m.absorbent ? 'It soaks in' : 'It stays on top',
    wrong: [m.absorbent ? 'It stays on top' : 'It soaks in'],
    hint: 'Is this material waterproof or absorbent?',
    explain: m.absorbent
      ? [`${cap(m.name)} is absorbent.`, 'Absorbent materials soak up water, so it soaks in.']
      : [`${cap(m.name)} is waterproof.`, 'Water can’t get into it, so it stays on top.'],
  });
}

function jobMaterial(level: number): Question {
  const job = pick(level === 1 ? JOBS.filter((j) => j.id !== 'umbrella') : JOBS);
  const right = mat(pick(job.good));
  const bad = MATS.filter((m) => !job.good.includes(m.id) && !m[job.needs]);
  const wrong = shuffle(bad).slice(0, 2);
  const all = [right, ...wrong];
  return mcq({
    prompt: `Which material is best for ${job.name}?`,
    visual: (
      <svg viewBox="0 0 80 70" role="img" aria-label={job.name}>
        <text x={40} y={38} textAnchor="middle" dominantBaseline="central" fontSize={50}>
          {job.emoji}
        </text>
      </svg>
    ),
    answer: right.id,
    wrong: wrong.map((w) => w.id),
    labels: Object.fromEntries(all.map((m) => [m.id, <MatPicture key={m.id} m={m} />])),
    names: Object.fromEntries(all.map((m) => [m.id, m.name])),
    hint: `What does ${job.name} need to be like?`,
    explain: [`${cap(job.name)} needs to be ${PROP_WORD[job.needs]}.`, `${cap(right.name)} is ${PROP_WORD[job.needs]}.`, `So the best choice is the ${right.name}.`],
  });
}

function whyNot(): Question {
  const cases = [
    { prompt: 'Why is a paper towel a bad material for an umbrella?', answer: 'It is not waterproof', wrong: ['It is not see-through', 'It is too heavy'], why: 'Paper towel soaks up rain and lets it through.' },
    { prompt: 'Why is foil a bad material for a window?', answer: 'It is not see-through', wrong: ['It is not stretchy', 'It is too soft'], why: 'Foil blocks the light, so you couldn’t see out.' },
    { prompt: 'Why is glass a bad material for a hair band?', answer: 'It is not stretchy', wrong: ['It is not waterproof', 'It is see-through'], why: 'A hair band has to stretch around your hair. Glass would break.' },
    { prompt: 'Why is clear plastic a bad material for mopping up a spill?', answer: 'It is not absorbent', wrong: ['It is not see-through', 'It is too stretchy'], why: 'Clear plastic can’t soak up water. It just pushes the spill around.' },
  ];
  const c = pick(cases);
  return mcq({
    prompt: c.prompt,
    answer: c.answer,
    wrong: c.wrong,
    hint: 'Think about what the job needs. Does this material have it?',
    explain: [c.why, `So the reason is: ${c.answer.toLowerCase()}.`],
  });
}

function fairTest(): Question {
  return mcq({
    prompt: 'You test which cloth soaks up the most water. How do you make it a fair test?',
    answer: 'Use the same amount of water each time',
    wrong: ['Use more water on the cloth you like', 'Test each cloth in a different way'],
    hint: 'If you change more than one thing, can you tell what made the difference?',
    explain: ['A fair test only changes one thing: the cloth.', 'Everything else stays the same.', 'So use the same amount of water each time.'],
  });
}

export const materials: Lesson = {
  id: 'materials',
  title: 'Testing Materials',
  Thumb,
  Scene: MaterialsScene,
  sceneHint: 'Put a material on the stand · Pick a test · Guess, then run it · Choose the best material for the job',
  learn: {
    heading: 'Testing materials',
    intro: 'Everything is made of materials, like glass, plastic, rubber and cotton. Scientists test materials to find out what they are like. Then we can choose the best material for each job.',
    points: [
      { icon: Umbrella, text: 'Waterproof materials don’t let water through. Absorbent materials soak it up.' },
      { icon: MoveHorizontal, text: 'Stretchy materials get longer when pulled, then spring back.' },
      { icon: Eye, text: 'See-through (transparent) materials let light through.' },
      { icon: Droplets, text: 'Test every material the same way to make it fair.' },
    ],
  },
  steps: ['Put a material on the test stand.', 'Pick a test: drip, pull or shine.', 'Guess what will happen, then run the test.', 'Fill in what you found out.', 'Use your results to choose a material for a job.'],
  example: {
    question: 'Which material would make a good umbrella: paper towel or plastic?',
    work: ['An umbrella must keep the rain off, so it must be waterproof.', 'Paper towel is absorbent: it soaks up water.', 'Plastic is waterproof.'],
    answer: 'Plastic.',
  },
  grownups: [
    'Try it at home: drip water onto a paper towel, foil, a plastic bag and a sock. Which ones keep a coin underneath dry?',
    'Use the words waterproof, absorbent, stretchy and transparent (see-through) in everyday talk.',
    'A good choice often needs more than one property: an umbrella must be waterproof and also light and bendy.',
  ],
  makeQuestion: (level) =>
    byLevel(level, [
      [() => whichIs(0), dripResult],
      [() => whichIs(1), () => jobMaterial(1), dripResult],
      [() => jobMaterial(2), whyNot, fairTest],
    ]),
};
