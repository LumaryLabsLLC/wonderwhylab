import { useEffect, useRef, useState } from 'react';
import { Eye, FlipHorizontal2, Flashlight, Target } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { WrapText } from './visuals/Draggable';

const MIRROR = { x: 470, y: 380, len: 210 };
const TORCH_X = 110;
// Stars sit clear of the cards and buttons on the right.
const TARGETS: [number, number][] = [
  [470, 80],
  [900, 520],
  [560, 630],
  [230, 90],
  [330, 620],
];

/** Predict → observe → explain. Angle challenges are met once the light hits at that angle. */
const CHALLENGES = [
  { question: 'Light hits at 30°. Bounces at?', options: ['15°', '30°', '60°'], actual: '30°', target: 30, todo: 'Turn the mirror or move the torch until the light hits at 30°.' },
  { question: 'Shine on the back. Reflects?', options: ['Yes', 'No'], actual: 'No', target: -1, todo: 'Turn the mirror round so the light hits its grey back.' },
  { question: 'Light hits at 50°. Bounces at?', options: ['25°', '50°', '100°'], actual: '50°', target: 50, todo: 'Make the light hit the mirror at 50°.' },
];
const BECAUSE = [
  'Light bounces off a mirror at the same angle it hits it: 30° in, 30° out.',
  'The back of a mirror is painted, not shiny, so it does not reflect light like a mirror.',
  'Angle in always equals angle out. Here: 50° in, 50° out.',
];
const RAD = Math.PI / 180;

type V = { x: number; y: number };
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y;

/** Where a ray from `o` going `d` leaves the scene box. */
function exitPoint(o: V, d: V): V {
  const ts: number[] = [];
  if (d.x > 0) ts.push((985 - o.x) / d.x);
  if (d.x < 0) ts.push((15 - o.x) / d.x);
  if (d.y > 0) ts.push((665 - o.y) / d.y);
  if (d.y < 0) ts.push((15 - o.y) / d.y);
  const t = Math.min(...ts.filter((v) => v > 0));
  return { x: o.x + d.x * t, y: o.y + d.y * t };
}

function MirrorScene() {
  const [torchY, setTorchY] = useState(380);
  // Mirror direction in degrees (SVG: y down). 150° starts with the shiny side facing the torch.
  const [theta, setTheta] = useState(150);
  const [targetIdx, setTargetIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [atPredict, setAtPredict] = useState<{ theta: number; torchY: number } | null>(null);
  const wasHit = useRef(false);

  const m = { x: Math.cos(theta * RAD), y: Math.sin(theta * RAD) };
  const n = { x: -m.y, y: m.x }; // the shiny side faces this way
  const c = { x: MIRROR.x, y: MIRROR.y };
  const torch = { x: TORCH_X, y: torchY };
  const len = Math.hypot(c.x - torch.x, c.y - torch.y);
  const d = { x: (c.x - torch.x) / len, y: (c.y - torch.y) / len };
  const front = dot(d, n) < 0;
  const r = { x: d.x - 2 * dot(d, n) * n.x, y: d.y - 2 * dot(d, n) * n.y };
  const out = front ? exitPoint(c, r) : null;
  const angle = Math.round(Math.acos(clamp(-dot(d, n), -1, 1)) / RAD);
  const [tx, ty] = TARGETS[targetIdx];
  const rel = { x: tx - c.x, y: ty - c.y };
  const proj = front ? dot(rel, r) : -1;
  const hit = proj > 0 && Math.hypot(rel.x - proj * r.x, rel.y - proj * r.y) < 34;

  useEffect(() => {
    if (hit && !wasHit.current) play('correct');
    wasHit.current = hit;
  }, [hit]);

  const knob = { x: c.x + (m.x * MIRROR.len) / 2, y: c.y + (m.y * MIRROR.len) / 2 };
  const challenge = CHALLENGES[cIdx];
  const moved = atPredict !== null && (atPredict.theta !== theta || atPredict.torchY !== torchY);
  const observedNow = guess !== null && moved && (challenge.target < 0 ? !front : front && Math.abs(angle - challenge.target) <= 2);
  // Keep the explanation up once the test has happened, until they ask for another.
  const [observed, setObserved] = useState(false);
  useEffect(() => {
    if (observedNow) setObserved(true);
  }, [observedNow]);
  const turn = useSvgDrag((p) => setTheta(Math.round(Math.atan2(p.y - c.y, p.x - c.x) / RAD)));
  const slide = useSvgDrag((p) => setTorchY(clamp(Math.round(p.y), 110, 600)));

  // Normal line and the two equal angles.
  const nOut = { x: c.x + n.x * 130, y: c.y + n.y * 130 };
  const torchAng = Math.atan2(-d.y, -d.x);
  const outAng = Math.atan2(r.y, r.x);
  const normAng = Math.atan2(n.y, n.x);
  const arc = (a0: number, a1: number, rad: number) => {
    let delta = a1 - a0;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const x0 = c.x + Math.cos(a0) * rad;
    const y0 = c.y + Math.sin(a0) * rad;
    const x1 = c.x + Math.cos(a0 + delta) * rad;
    const y1 = c.y + Math.sin(a0 + delta) * rad;
    return `M${x0},${y0} A${rad},${rad} 0 0 ${delta > 0 ? 1 : 0} ${x1},${y1}`;
  };
  const labelAt = (a0: number, a1: number, rad: number) => {
    let delta = a1 - a0;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const a = a0 + delta / 2;
    return { x: c.x + Math.cos(a) * rad, y: c.y + Math.sin(a) * rad };
  };
  const inLabel = labelAt(normAng, torchAng, 104);
  const outLabel = labelAt(normAng, outAng, 104);

  return (
    <SceneSvg label="A torch shines at a mirror. Turn the mirror to hit the star.">
      {/* Target */}
      <g transform={`translate(${tx} ${ty})`}>
        {hit && <circle r={46} fill={C.yellow} opacity={0.4} />}
        <path d="M0,-30 L9,-9 L31,-8 L14,6 L20,28 L0,16 L-20,28 L-14,6 L-31,-8 L-9,-9 Z" fill={hit ? C.yellow : C.card} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      </g>

      {/* Beams */}
      <line x1={torch.x + 40} y1={torch.y} x2={c.x} y2={c.y} stroke={C.yellow} strokeWidth={10} strokeLinecap="round" opacity={0.9} />
      {out && <line x1={c.x} y1={c.y} x2={out.x} y2={out.y} stroke={C.yellow} strokeWidth={10} strokeLinecap="round" opacity={0.9} />}

      {/* Normal and angles */}
      {front && (
        <g>
          <line x1={c.x} y1={c.y} x2={nOut.x} y2={nOut.y} stroke={C.ink2} strokeWidth={2} strokeDasharray="6 6" />
          <path d={arc(normAng, torchAng, 80)} fill="none" stroke={C.orange} strokeWidth={3} />
          <path d={arc(normAng, outAng, 70)} fill="none" stroke={C.teal} strokeWidth={3} />
          <text x={inLabel.x} y={inLabel.y + 6} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.orange}>
            {angle}°
          </text>
          <text x={outLabel.x} y={outLabel.y + 6} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.teal}>
            {angle}°
          </text>
        </g>
      )}

      {/* Mirror: blue shiny side, grey back */}
      <g>
        <line x1={c.x - (m.x * MIRROR.len) / 2 - n.x * 5} y1={c.y - (m.y * MIRROR.len) / 2 - n.y * 5} x2={c.x + (m.x * MIRROR.len) / 2 - n.x * 5} y2={c.y + (m.y * MIRROR.len) / 2 - n.y * 5} stroke={C.muted} strokeWidth={8} strokeLinecap="round" />
        <line x1={c.x - (m.x * MIRROR.len) / 2} y1={c.y - (m.y * MIRROR.len) / 2} x2={knob.x} y2={knob.y} stroke="#9ed2ff" strokeWidth={8} strokeLinecap="round" />
        <circle cx={c.x} cy={c.y} r={6} fill={C.ink} />
        <g {...turn} role="slider" aria-label="Turn the mirror" aria-valuenow={theta}>
          <circle cx={knob.x} cy={knob.y} r={22} fill={C.white} stroke={C.ink} strokeWidth={3} />
          <path d={`M${knob.x - 8},${knob.y} a8,8 0 1 1 8,8`} fill="none" stroke={C.ink} strokeWidth={2.5} />
        </g>
      </g>

      {/* Torch */}
      <g transform={`translate(${torch.x} ${torch.y}) rotate(${Math.atan2(d.y, d.x) / RAD})`} {...slide} role="slider" aria-label="Move the torch up or down" aria-valuenow={torchY}>
        <rect x={-50} y={-20} width={70} height={40} rx={10} fill={C.red} stroke={C.ink} strokeWidth={2.5} />
        <path d="M20,-26 L42,-32 L42,32 L20,26 Z" fill="#c9d2de" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <rect x={-36} y={-8} width={24} height={16} rx={4} fill={C.ink} />
      </g>
      <line x1={TORCH_X - 70} y1={110} x2={TORCH_X - 70} y2={600} stroke={C.line} strokeWidth={3} strokeDasharray="4 8" />

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard
          x={630}
          y={20}
          w={340}
          prediction={guess}
          actual={challenge.actual}
          because={BECAUSE[cIdx]}
          onAgain={() => {
            setGuess(null);
            setObserved(false);
            setAtPredict(null);
            setCIdx((cIdx + 1) % CHALLENGES.length);
          }}
        />
      ) : (
        <g>
          <PredictCard
            x={630}
            y={20}
            w={340}
            question={challenge.question}
            options={challenge.options}
            prediction={guess}
            onPredict={(o) => {
              setGuess(o);
              setAtPredict({ theta, torchY });
              play('tap');
            }}
          />
          {guess !== null && <WrapText x={642} y={140} width={320} fontSize={15} fill={C.ink2} text={challenge.todo} />}
        </g>
      )}

      {/* Readout and controls */}
      <rect x={630} y={236} width={340} height={126} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      {front ? (
        <>
          <text x={650} y={274} fontSize={19} fontWeight={700} fill={hit ? '#1f7a4a' : C.ink}>
            {hit ? 'Bullseye! You hit the star.' : 'Turn the mirror to hit the star.'}
          </text>
          <WrapText x={650} y={306} width={310} fontSize={16} text={`Light in: ${angle}° from the normal. Light out: ${angle}°. They always match!`} />
        </>
      ) : (
        <WrapText x={650} y={276} width={310} fontSize={17} fontWeight={600} fill={C.ink} text="The light is hitting the back of the mirror. Only the shiny side reflects." />
      )}
      <SvgButton x={630} y={380} w={106} h={48} fontSize={22} label="↺" title="Turn mirror left" onClick={() => setTheta(theta - 5)} />
      <SvgButton x={746} y={380} w={106} h={48} fontSize={22} label="↻" title="Turn mirror right" onClick={() => setTheta(theta + 5)} />
      <SvgButton x={862} y={380} w={108} h={48} fontSize={16} label="New star" onClick={() => setTargetIdx((targetIdx + rand(1, TARGETS.length - 1)) % TARGETS.length)} color={C.yellow} />

      <Callout at={[torch.x, torch.y - 24]} box={[40, 620]} w={230} icon={Flashlight} title="Torch" text="Drag it up or down. Light travels in straight lines." />
      <Callout at={[nOut.x, nOut.y]} box={[630, 446]} w={240} icon={FlipHorizontal2} title="The normal" text="A line at right angles to the mirror. We measure angles from it." />
      <Callout at={[knob.x, knob.y]} box={[630, 520]} w={220} icon={Target} title="Turn the mirror" text="Drag the round handle to aim the bounce." />
    </SceneSvg>
  );
}

/** A flat mirror with the normal and one or both rays, for questions. */
function ReflectPicture({ angle, show = 'both', inLabel, outLabel }: { angle: number; show?: 'in' | 'both'; inLabel?: string; outLabel?: string }) {
  const L = 130;
  const a = angle * RAD;
  const cx = 160;
  const cy = 140;
  const inX = cx - Math.sin(a) * L;
  const inY = cy - Math.cos(a) * L;
  const outX = cx + Math.sin(a) * L;
  const outY = cy - Math.cos(a) * L;
  return (
    <svg viewBox="0 0 320 165" role="img" aria-label={`A ray hits a mirror at ${angle} degrees from the normal`}>
      <line x1={30} y1={cy} x2={290} y2={cy} stroke="#9ed2ff" strokeWidth={8} strokeLinecap="round" />
      <line x1={30} y1={cy + 6} x2={290} y2={cy + 6} stroke={C.muted} strokeWidth={5} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx} y2={10} stroke={C.ink2} strokeWidth={2} strokeDasharray="5 5" />
      <line x1={inX} y1={inY} x2={cx} y2={cy} stroke={C.orange} strokeWidth={5} strokeLinecap="round" />
      {show === 'both' && <line x1={cx} y1={cy} x2={outX} y2={outY} stroke={C.teal} strokeWidth={5} strokeLinecap="round" strokeDasharray={outLabel === '?' ? '10 7' : undefined} />}
      <text x={cx - 40} y={cy - 70} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.orange}>
        {inLabel ?? `${angle}°`}
      </text>
      {show === 'both' && (
        <text x={cx + 40} y={cy - 70} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.teal}>
          {outLabel ?? `${angle}°`}
        </text>
      )}
      <text x={cx + 6} y={22} fontSize={13} fill={C.muted}>
        normal
      </text>
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={14} y1={20} x2={60} y2={62} stroke={C.yellow} strokeWidth={6} strokeLinecap="round" />
      <line x1={60} y1={62} x2={106} y2={20} stroke={C.yellow} strokeWidth={6} strokeLinecap="round" />
      <line x1={30} y1={66} x2={90} y2={66} stroke="#9ed2ff" strokeWidth={6} strokeLinecap="round" />
      <line x1={60} y1={62} x2={60} y2={18} stroke={C.ink2} strokeWidth={2} strokeDasharray="4 4" />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['what', 'best']) : level === 1 ? pick(['angle', 'see', 'angle']) : pick(['between', 'surface', 'periscope']);

  if (kind === 'what') {
    const right = 'It bounces off (reflects)';
    return {
      prompt: 'Light shines on a mirror. What happens to it?',
      choices: choices(shuffle([right, 'It goes straight through', 'It disappears'])),
      answer: right,
      hint: 'Think about seeing yourself in a mirror.',
      explain: ['A mirror is very smooth and shiny.', 'Light cannot pass through it, so it changes direction.', 'So it bounces off (reflects).'],
    };
  }

  if (kind === 'best') {
    const right = 'A shiny mirror';
    return {
      prompt: 'Which of these reflects light best?',
      choices: choices(shuffle([right, 'A black sock', 'A brown paper bag'])),
      answer: right,
      hint: 'Smooth, shiny surfaces reflect the most light.',
      explain: ['Dark, rough things soak up most of the light.', 'Smooth, shiny surfaces send it back neatly.', 'So a shiny mirror reflects light best.'],
    };
  }

  if (kind === 'angle') {
    const a = rand(2, 7) * 10 - (rand(0, 1) ? 5 : 0);
    return {
      prompt: `A ray hits a mirror ${a}° from the normal. At what angle from the normal does it bounce off?`,
      visual: <ReflectPicture angle={a} outLabel="?" />,
      choices: choices(shuffle([a, 90 - a === a ? a + 10 : 90 - a, 180 - a].map(String))),
      answer: String(a),
      hint: 'Compare the angle going in with the angle coming out.',
      explain: ['Light bounces off a mirror at the same angle it hits it.', `In at ${a}°, so out at ${a}°.`, `The answer is ${a}°.`],
    };
  }

  if (kind === 'see') {
    const right = 'Light bounces off it into our eyes';
    return {
      prompt: 'How do we see a book in a lit room?',
      choices: choices(shuffle([right, 'Light shoots out of our eyes', 'The book makes its own light'])),
      answer: right,
      hint: 'Where does the light start, and where does it end up?',
      explain: ['Light from a lamp or the Sun hits the book.', 'Some of it reflects off the book and travels to us.', 'So light bounces off it into our eyes.'],
    };
  }

  if (kind === 'between') {
    const a = rand(2, 8) * 5;
    return {
      prompt: `A ray hits a mirror ${a}° from the normal. What is the angle between the ray going in and the ray coming out?`,
      visual: <ReflectPicture angle={a} />,
      answer: String(2 * a),
      hint: 'The normal splits that angle into two equal parts.',
      explain: [`The ray goes in at ${a}° and comes out at ${a}° on the other side of the normal.`, `${a} + ${a} = ${2 * a}`, `The angle between them is ${2 * a}°.`],
    };
  }

  if (kind === 'surface') {
    const s = rand(3, 8) * 10;
    const ans = 90 - s;
    return {
      prompt: `A ray hits a mirror at ${s}° to the mirror’s surface. What angle does it make with the normal?`,
      answer: String(ans),
      hint: 'The normal is at 90° to the mirror.',
      explain: ['The normal is at right angles (90°) to the mirror.', `90 − ${s} = ${ans}`, `So the ray is ${ans}° from the normal.`],
    };
  }

  const right = 'See over a wall';
  return {
    prompt: 'A periscope has two mirrors, each tilted at 45°. What can it help you do?',
    choices: choices(shuffle([right, 'See through a wall', 'Make light brighter'])),
    answer: right,
    hint: 'Each mirror turns the light round a corner.',
    explain: ['Light enters the top and hits the first mirror, which turns it down.', 'The second mirror turns it into your eye.', 'So a periscope lets you see over a wall.'],
  };
}

export const lightAndMirrors: Lesson = {
  id: 'light-and-mirrors',
  title: 'Light and Mirrors',
  Thumb,
  Scene: MirrorScene,
  sceneHint: 'Drag the torch and the mirror handle · Hit the star',
  learn: {
    heading: 'Bouncing light',
    intro:
      'Light travels in straight lines. When it hits a mirror it bounces off, or reflects, at the same angle it arrived. We see things when light from them enters our eyes.',
    points: [
      { icon: Flashlight, text: 'Light travels in straight lines.' },
      { icon: FlipHorizontal2, text: 'Angle in = angle out, both measured from the normal.' },
      { icon: Eye, text: 'We see objects because light reflects off them into our eyes.' },
    ],
  },
  steps: [
    'Find where the light ray hits the mirror.',
    'Imagine the normal: a line at right angles to the mirror at that point.',
    'Measure the angle between the ray coming in and the normal.',
    'The reflected ray leaves at the same angle on the other side.',
  ],
  example: {
    question: 'A ray hits a mirror 40° from the normal. At what angle does it reflect?',
    visual: <ReflectPicture angle={40} />,
    work: ['Angle in equals angle out.', 'It hits at 40°, so it leaves at 40° on the other side of the normal.'],
    answer: 'It reflects at 40° from the normal.',
  },
  grownups: [
    'Never look at the Sun, even in a mirror, or point mirrors at people’s eyes.',
    'Try it with a torch and a small mirror in a dark room: bounce the light onto a target on the wall.',
    'A common mix-up is that sight comes out of our eyes. It’s the other way round: light comes in.',
  ],
  makeQuestion,
};
