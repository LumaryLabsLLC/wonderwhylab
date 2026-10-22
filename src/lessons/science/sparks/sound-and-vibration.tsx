import { useState } from 'react';
import { AudioLines, Drum, Ear, Music } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { audioContext } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { reducedMotion, useAnimationTime } from './visuals/anim';
import { byLevel, mcq } from './q';

/** Play a note because the child plucked or tapped something (an explicit action, so it always sounds). */
function makeSound(freq: number, kind: 'string' | 'drum') {
  const ctx = audioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = kind === 'string' ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(kind === 'drum' ? freq * 1.6 : freq, t);
  if (kind === 'drum') osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'drum' ? 0.55 : 1.4));
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1.5);
}

const X0 = 110;
const LENGTHS = [560, 430, 310, 210];
const ROWS = [150, 230, 310, 390];
const TENSION = [
  { name: 'Loose', k: 0.8 },
  { name: 'Middle', k: 1 },
  { name: 'Tight', k: 1.26 },
];
const COLORS = [C.red, C.orange, C.green, C.blue];

export const stringFreq = (len: number, tension: number) => 196 * (560 / len) * tension;
const pitchName = (f: number) => (f >= 330 ? 'High' : f <= 200 ? 'Low' : 'Middle');

const DRUMS = [
  { name: 'Big drum', cx: 300, cy: 530, rx: 120, freq: 98, color: C.red },
  { name: 'Small drum', cx: 560, cy: 560, rx: 76, freq: 220, color: C.blue },
];

/** Predict → observe → explain: three little experiments, one after another. */
const EXPERIMENTS = [
  {
    question: 'Short strings sound…',
    options: ['Higher', 'Lower'],
    todo: 'Pluck a short string to test it.',
    actual: 'Higher',
    because: 'Shorter strings vibrate faster, and faster vibrations sound higher.',
  },
  {
    question: 'Tight strings sound…',
    options: ['Higher', 'Lower'],
    todo: 'Press Tight, then pluck a string.',
    actual: 'Higher',
    because: 'Pulling a string tighter makes it vibrate faster, so it sounds higher.',
  },
  {
    question: 'The big drum sounds…',
    options: ['Higher', 'Lower'],
    todo: 'Tap the big drum to test it.',
    actual: 'Lower',
    because: 'The big drum skin is larger and vibrates more slowly, so it sounds lower.',
  },
];

function SoundScene() {
  const t = useAnimationTime();
  const calm = reducedMotion() ? 0.4 : 1;
  const [tension, setTension] = useState(1);
  const [plucked, setPlucked] = useState<Record<number, number>>({});
  const [hit, setHit] = useState<Record<number, number>>({});
  const [last, setLast] = useState<{ f: number; what: string } | null>(null);
  const [poe, setPoe] = useState<{ step: number; guess: string | null }>({ step: 0, guess: null });
  const [observed, setObserved] = useState(false);
  const exp = EXPERIMENTS[poe.step];

  const pluck = (i: number) => {
    const f = stringFreq(LENGTHS[i], TENSION[tension].k);
    setPlucked((p) => ({ ...p, [i]: t }));
    setLast({ f, what: `${['Longest', 'Long', 'Short', 'Shortest'][i]} string` });
    makeSound(f, 'string');
    if ((poe.step === 0 && i >= 2) || (poe.step === 1 && tension === 2)) setObserved(true);
  };
  const tapDrum = (i: number) => {
    setHit((h) => ({ ...h, [i]: t }));
    setLast({ f: DRUMS[i].freq, what: DRUMS[i].name });
    makeSound(DRUMS[i].freq, 'drum');
    if (poe.step === 2 && i === 0) setObserved(true);
  };
  const nextExperiment = () => {
    setObserved(false);
    setPoe({ step: (poe.step + 1) % EXPERIMENTS.length, guess: null });
  };

  const stringPath = (i: number) => {
    const L = LENGTHS[i];
    const y = ROWS[i];
    const since = plucked[i] === undefined ? 99 : t - plucked[i];
    const amp = since > 2 ? 0 : 16 * Math.exp(-3 * since) * calm;
    const visual = stringFreq(L, TENSION[tension].k) / 40;
    const pts = Array.from({ length: 31 }, (_, k) => {
      const x = (k / 30) * L;
      const dy = amp * Math.sin((Math.PI * x) / L) * Math.sin(2 * Math.PI * visual * since);
      return `${X0 + x},${y + dy}`;
    });
    return `M${pts.join(' L')}`;
  };

  const lastF = last?.f ?? 0;
  const waveCycles = Math.max(1.5, lastF / 60);

  return (
    <SceneSvg label="Strings to pluck and drums to tap">
      {/* String board */}
      <rect x={X0 - 40} y={100} width={LENGTHS[0] + 80} height={330} rx={18} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
      <rect x={X0 - 22} y={116} width={14} height={298} rx={6} fill={shade(C.wood, -0.35)} />
      {LENGTHS.map((L, i) => (
        <g key={i} onClick={() => pluck(i)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Pluck the ${['longest', 'long', 'short', 'shortest'][i]} string`}>
          <rect x={X0} y={ROWS[i] - 22} width={L} height={44} fill="transparent" />
          <rect x={X0 + L - 6} y={ROWS[i] - 18} width={14} height={36} rx={4} fill={shade(C.wood, -0.35)} stroke={C.ink} strokeWidth={2} />
          <path d={stringPath(i)} fill="none" stroke={COLORS[i]} strokeWidth={5} strokeLinecap="round" />
          <circle cx={X0} cy={ROWS[i]} r={7} fill={C.ink} />
        </g>
      ))}

      {/* Drums */}
      {DRUMS.map((d, i) => {
        const since = hit[i] === undefined ? 99 : t - hit[i];
        const wobble = since < 1 ? 5 * Math.exp(-4 * since) * Math.sin(since * 40) * calm : 0;
        return (
          <g key={d.name} onClick={() => tapDrum(i)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Tap the ${d.name.toLowerCase()}`}>
            <path d={`M${d.cx - d.rx},${d.cy} L${d.cx - d.rx},${d.cy + d.rx * 0.6} A${d.rx},${d.rx * 0.28} 0 0 0 ${d.cx + d.rx},${d.cy + d.rx * 0.6} L${d.cx + d.rx},${d.cy}`} fill={d.color} stroke={C.ink} strokeWidth={2.5} />
            <ellipse cx={d.cx} cy={d.cy + wobble} rx={d.rx} ry={d.rx * 0.28} fill="#f7f1e3" stroke={C.ink} strokeWidth={2.5} />
            {since < 0.9 &&
              [0, 0.25].map((delay) => {
                const u = Math.max(0, (since - delay) / 0.6);
                return u > 0 && u < 1 ? (
                  <ellipse key={delay} cx={d.cx} cy={d.cy - 10} rx={d.rx * (0.4 + u)} ry={d.rx * 0.28 * (0.4 + u)} fill="none" stroke={C.teal} strokeWidth={3} opacity={1 - u} />
                ) : null;
              })}
            <text x={d.cx} y={d.cy + d.rx * 0.88 + 26} textAnchor="middle" fontSize={16} fill={C.ink2} fontWeight={600}>
              {d.name}
            </text>
          </g>
        );
      })}

      {/* What did it sound like? */}
      <rect x={724} y={16} width={240} height={226} rx={16} fill={C.paper} transform="translate(4 6)" />
      <rect x={724} y={16} width={240} height={226} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={844} y={48} textAnchor="middle" fontSize={16} fill={C.muted}>
        {last ? last.what : 'Pluck or tap something'}
      </text>
      <text x={844} y={96} textAnchor="middle" fontSize={40} fontWeight={700} fill={last ? (pitchName(lastF) === 'High' ? C.purple : pitchName(lastF) === 'Low' ? C.red : C.teal) : C.line}>
        {last ? pitchName(lastF) : '?'}
      </text>
      {last && (
        <path
          d={`M744,158 ${Array.from({ length: 81 }, (_, k) => `L${744 + k * 2.5},${158 + 30 * Math.sin((k / 80) * waveCycles * 2 * Math.PI)}`).join(' ')}`}
          fill="none"
          stroke={C.ink}
          strokeWidth={3}
        />
      )}
      <text x={844} y={224} textAnchor="middle" fontSize={14} fill={C.ink2}>
        {last ? (pitchName(lastF) === 'High' ? 'Fast vibrations = high' : pitchName(lastF) === 'Low' ? 'Slow vibrations = low' : 'Medium vibrations') : 'The wave shows the vibration'}
      </text>

      {/* String tightness */}
      <text x={724} y={276} fontSize={16} fill={C.muted} className="caps">
        Strings
      </text>
      {TENSION.map((tn, i) => (
        <SvgButton key={tn.name} x={724 + i * 82} y={286} w={74} h={48} fontSize={15} label={tn.name} active={tension === i} color={tension === i ? C.yellow : C.card} onClick={() => setTension(i)} />
      ))}
      <SvgButton x={724} y={348} w={240} h={50} fontSize={17} label="Strum them all" color={C.teal} textColor={C.white} onClick={() => [0, 1, 2, 3].forEach((i, k) => window.setTimeout(() => pluck(i), k * 220))} />

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard x={720} y={420} w={250} prediction={poe.guess} actual={exp.actual} because={exp.because} onAgain={nextExperiment} />
      ) : (
        <g>
          <PredictCard x={720} y={420} w={250} question={exp.question} options={exp.options} prediction={poe.guess} onPredict={(g) => setPoe({ ...poe, guess: g })} />
          {poe.guess && (
            <text x={734} y={540} fontSize={15} fill={C.ink2}>
              {exp.todo}
            </text>
          )}
        </g>
      )}

      <Callout at={[X0 + 280, ROWS[0]]} box={[200, 30]} w={250} icon={AudioLines} title="Vibrations" text="A plucked string shakes back and forth very fast. That shaking makes the sound." />
      <Callout at={[X0 + 100, ROWS[3]]} box={[120, 440]} w={250} icon={Music} title="Short = high" text="Shorter and tighter strings shake faster and sound higher." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={10} width={70} height={42} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <path d="M12,20 L70,20" stroke={C.red} strokeWidth={3} />
      <path d="M12,31 Q36,25 56,31" stroke={C.green} strokeWidth={3} fill="none" />
      <path d="M12,42 L44,42" stroke={C.blue} strokeWidth={3} />
      <path d="M86,50 L86,66 A16,5 0 0 0 118,66 L118,50" fill={C.red} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={102} cy={50} rx={16} ry={5} fill="#f7f1e3" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

function TwoStrings({ highlight }: { highlight?: 'short' | 'long' }) {
  return (
    <svg viewBox="0 0 320 110" role="img" aria-label="A long string and a short string">
      <rect x={6} y={6} width={308} height={98} rx={12} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <path d="M20,36 L300,36" stroke={highlight === 'long' ? C.red : C.orange} strokeWidth={5} />
      <text x={20} y={26} fontSize={13} fill={C.ink}>
        long
      </text>
      <path d="M20,78 L130,78" stroke={highlight === 'short' ? C.red : C.blue} strokeWidth={5} />
      <text x={20} y={68} fontSize={13} fill={C.ink}>
        short
      </text>
    </svg>
  );
}

function whatMakesSound(): Question {
  return mcq({
    prompt: 'What makes a sound?',
    answer: 'Something vibrating',
    wrong: ['Something staying still', 'Something getting cold'],
    hint: 'Put your hand on your throat and hum. What do you feel?',
    explain: ['Sound is made when something shakes back and forth very fast.', 'That fast shaking is called vibrating.', 'So the answer is something vibrating.'],
  });
}

function drumSkin(): Question {
  return mcq({
    prompt: 'When you tap a drum, the drum skin…',
    answer: 'Vibrates',
    wrong: ['Melts', 'Stays still'],
    hint: 'Tap a drum on the playground and watch the skin.',
    explain: ['Tapping the drum makes its skin wobble up and down very fast.', 'The skin vibrates, and that makes the sound.'],
  });
}

function higherString(): Question {
  return mcq({
    prompt: 'Which string makes the higher sound?',
    visual: <TwoStrings />,
    answer: 'The short string',
    wrong: ['The long string'],
    hint: 'Pluck a long string and a short string on the playground.',
    explain: ['A short string shakes back and forth faster.', 'Faster vibrations sound higher.', 'So the short string makes the higher sound.'],
  });
}

function lowerDrum(): Question {
  return mcq({
    prompt: 'Which drum makes the lower sound?',
    answer: 'The big drum',
    wrong: ['The small drum'],
    hint: 'Tap both drums on the playground and listen.',
    explain: ['A big drum skin wobbles more slowly.', 'Slower vibrations sound lower.', 'So the big drum makes the lower sound.'],
  });
}

function whichHigh(): Question {
  return mcq({
    prompt: 'Which of these is a high sound?',
    answer: 'A little bird tweeting',
    wrong: ['A lion roaring', 'A big drum booming'],
    hint: 'Is it squeaky or deep?',
    explain: ['A tweet is a squeaky, high sound.', 'Roars and booms are deep, low sounds.', 'So a little bird tweeting is high.'],
  });
}

function tighten(): Question {
  return mcq({
    prompt: 'If you make a string tighter, its sound gets…',
    answer: 'Higher',
    wrong: ['Lower', 'Silent'],
    hint: 'Try the Loose and Tight buttons on the playground.',
    explain: ['A tighter string vibrates faster.', 'Faster vibrations sound higher.', 'So the sound gets higher.'],
  });
}

function louder(): Question {
  return mcq({
    prompt: 'A louder sound comes from…',
    answer: 'Bigger vibrations',
    wrong: ['Smaller vibrations', 'No vibrations'],
    hint: 'Do you pluck a string softly or hard to make it loud?',
    explain: ['Plucking hard makes the string swing further.', 'Bigger swings (bigger vibrations) are louder.', 'So louder sounds come from bigger vibrations.'],
  });
}

function travels(): Question {
  return mcq({
    prompt: 'How does a drum’s sound get to your ears?',
    answer: 'It travels through the air',
    wrong: ['It rides on light', 'It cannot move'],
    hint: 'What is all around you, between you and the drum?',
    explain: ['The drum skin shakes the air next to it.', 'The air passes the shaking along, all the way to your ears.', 'So it travels through the air.'],
  });
}

export const soundAndVibration: Lesson = {
  id: 'sound-and-vibration',
  title: 'Sounds',
  Thumb,
  Scene: SoundScene,
  sceneHint: 'Make a guess · Tap a string or a drum to test it · Try loose and tight strings',
  learn: {
    heading: 'How sounds are made',
    intro: 'Every sound is made by something vibrating: shaking back and forth very fast. Fast vibrations make high sounds. Slow vibrations make low sounds.',
    points: [
      { icon: AudioLines, text: 'Sounds are made by vibrations.' },
      { icon: Music, text: 'Short or tight strings sound higher.' },
      { icon: Drum, text: 'Big drums sound lower than small drums.' },
      { icon: Ear, text: 'Sound travels through the air to your ears.' },
    ],
  },
  steps: [
    'Make a sound: pluck a string or tap a drum.',
    'Watch it vibrate (shake back and forth).',
    'Listen: is it high or low?',
    'Guess first: will it sound higher or lower?',
    'Change one thing, like length or tightness, and listen again.',
  ],
  example: {
    question: 'Two strings, one long and one short. Which sounds higher?',
    work: ['The short string vibrates faster.', 'Faster vibrations make a higher sound.'],
    answer: 'The short string sounds higher.',
  },
  grownups: [
    'Stretch rubber bands over an open box. Pluck them, then stretch one tighter and compare.',
    'Hum with your fingers on your throat to feel the vibration.',
    'Fill glasses with different amounts of water and tap them gently with a spoon.',
  ],
  makeQuestion: (level) => byLevel(level, [[whatMakesSound, drumSkin], [higherString, lowerDrum, whichHigh], [tighten, louder, travels, higherString]]),
};
