import { useEffect, useRef, useState } from 'react';
import { Bone, Dumbbell, Hand, RotateCw } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, WrapText } from './visuals/Draggable';

const SHOULDER = { x: 110, y: 300 };
const ELBOW = { x: 330, y: 300 };
const FOREARM = 200;
const MAX_BEND = 140;
const BONE = '#f5ecd6';

type Piece = 'humerus' | 'forearm' | 'hand';
const SLOTS: Record<Piece, { x: number; y: number; name: string }> = {
  humerus: { x: 220, y: 300, name: 'upper arm bone' },
  forearm: { x: 430, y: 300, name: 'forearm bones' },
  hand: { x: 568, y: 300, name: 'hand bones' },
};
const TRAY: Record<Piece, { x: number; y: number }> = {
  forearm: { x: 150, y: 596 },
  hand: { x: 330, y: 596 },
  humerus: { x: 480, y: 596 },
};

/** Upper arm bone (humerus), drawn along x from −110 to 110. */
function Humerus() {
  return (
    <g stroke={C.ink} strokeWidth={2.5}>
      <rect x={-104} y={-9} width={208} height={18} rx={9} fill={BONE} />
      <circle cx={-104} cy={0} r={18} fill={BONE} />
      <circle cx={102} cy={-8} r={11} fill={BONE} />
      <circle cx={102} cy={8} r={11} fill={BONE} />
    </g>
  );
}

/** The two forearm bones (radius and ulna), from x = 0 (elbow) to x = 200 (wrist). */
function Forearm() {
  return (
    <g stroke={C.ink} strokeWidth={2.5}>
      <rect x={-16} y={2} width={214} height={11} rx={5.5} fill={BONE} />
      <rect x={4} y={-12} width={194} height={10} rx={5} fill={BONE} />
      <circle cx={-16} cy={8} r={8} fill={BONE} />
    </g>
  );
}

/** Hand bones, from the wrist at x = 0. */
function HandBones() {
  return (
    <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round">
      <rect x={0} y={-16} width={36} height={32} rx={8} fill={BONE} />
      {[-12, -4, 4, 12].map((y) => (
        <line key={y} x1={36} y1={y} x2={78} y2={y * 1.15} stroke={C.ink} strokeWidth={8} />
      ))}
      {[-12, -4, 4, 12].map((y) => (
        <line key={`i${y}`} x1={36} y1={y} x2={78} y2={y * 1.15} stroke={BONE} strokeWidth={4} />
      ))}
      <line x1={8} y1={-14} x2={30} y2={-32} stroke={C.ink} strokeWidth={8} />
      <line x1={8} y1={-14} x2={30} y2={-32} stroke={BONE} strokeWidth={4} />
    </g>
  );
}

/** A muscle drawn as a lens between a and b, bulging to one side. */
function Muscle({ a, b, bulge, side, active, label, at }: { a: { x: number; y: number }; b: { x: number; y: number }; bulge: number; side: 1 | -1; active: boolean; label: string; at: { x: number; y: number } }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (-(b.y - a.y) / len) * side;
  const ny = ((b.x - a.x) / len) * side;
  const d = `M${a.x},${a.y} Q${mx + nx * bulge * 2},${my + ny * bulge * 2} ${b.x},${b.y} Q${mx - nx * bulge * 0.4},${my - ny * bulge * 0.4} ${a.x},${a.y} Z`;
  const fill = active ? C.red : shade(C.red, 0.45);
  return (
    <g>
      <path d={d} fill={fill} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" opacity={0.95} />
      <text x={at.x} y={at.y} textAnchor="middle" fontSize={16} fontWeight={700} fill={active ? shade(C.red, -0.35) : C.muted}>
        {label}
      </text>
    </g>
  );
}

const CHALLENGES = [
  { question: 'Bend your arm. Which pulls?', options: ['Biceps', 'Triceps'], actual: 'Biceps', because: 'The biceps on the front gets shorter and pulls your forearm up. The triceps relaxes.' },
  { question: 'Straighten it. Which pulls?', options: ['Biceps', 'Triceps'], actual: 'Triceps', because: 'The triceps on the back gets shorter and pulls your arm straight. The biceps relaxes.' },
  { question: 'Can a muscle push?', options: ['Yes', 'No'], actual: 'No', because: 'Muscles can only pull. That is why they work in pairs: one pulls to bend, the other pulls to straighten.' },
];

function ArmScene() {
  const [placed, setPlaced] = useState<Piece[]>([]);
  const [bend, setBend] = useState(0);
  const [dir, setDir] = useState<'bend' | 'straighten' | null>(null);
  const [joint, setJoint] = useState<'elbow' | 'shoulder' | null>(null);
  const [message, setMessage] = useState('');
  const [cIdx, setCIdx] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [moves, setMoves] = useState({ bent: false, straightened: false, max: 0 });
  const [observed, setObserved] = useState(false);
  const raf = useRef(0);
  const built = placed.length === 3;
  const challenge = CHALLENGES[cIdx];

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    if (guess === null || !built) return;
    const ok = cIdx === 0 ? moves.bent : cIdx === 1 ? moves.straightened : moves.bent && moves.straightened;
    if (ok) setObserved(true);
  }, [moves, guess, built, cIdx]);

  /** Move the forearm to a new bend, remembering which way it went. */
  const moveTo = (b: number) => {
    setBend((prev) => {
      const next = clamp(Math.round(b), 0, MAX_BEND);
      if (next !== prev) {
        setMessage('');
        const d = next > prev ? 'bend' : 'straighten';
        setDir(d);
        setMoves((m) => {
          const max = Math.max(m.max, next);
          return {
            max,
            bent: m.bent || next >= 60,
            straightened: m.straightened || (m.max >= 60 && next <= 20),
          };
        });
      }
      return next;
    });
  };

  const animateTo = (target: number) => {
    cancelAnimationFrame(raf.current);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    play('whoosh');
    if (reduce) {
      moveTo(target);
      return;
    }
    const start = bend;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      moveTo(start + (target - start) * k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const a = (bend * Math.PI) / 180;
  const d = { x: Math.cos(a), y: -Math.sin(a) };
  const up = { x: d.y, y: -d.x };
  const wrist = { x: ELBOW.x + FOREARM * d.x, y: ELBOW.y + FOREARM * d.y };
  const drag = useSvgDrag((p) => {
    cancelAnimationFrame(raf.current);
    const ang = (Math.atan2(-(p.y - ELBOW.y), p.x - ELBOW.x) * 180) / Math.PI;
    moveTo(ang < 0 ? (ang < -90 ? MAX_BEND : 0) : ang);
  });

  const drop = (piece: Piece, p: { x: number; y: number }) => {
    const slot = SLOTS[piece];
    if (Math.hypot(p.x - slot.x, p.y - slot.y) < 90) {
      setPlaced((list) => [...list, piece]);
      setMessage(placed.length === 2 ? 'Arm built! Now drag the hand to bend the elbow.' : `Yes, the ${slot.name} go${piece === 'humerus' ? 'es' : ''} there.`);
      play('pop');
      return;
    }
    const other = (Object.keys(SLOTS) as Piece[]).find((k) => k !== piece && !placed.includes(k) && Math.hypot(p.x - SLOTS[k].x, p.y - SLOTS[k].y) < 90);
    if (other) {
      setMessage(`Not there: that space is for the ${SLOTS[other].name}.`);
      play('wrong');
    }
  };

  const contraction = bend / MAX_BEND;
  const bicepsA = { x: SHOULDER.x + 34, y: SHOULDER.y - 16 };
  const bicepsB = { x: ELBOW.x + 46 * d.x + up.x * 10, y: ELBOW.y + 46 * d.y + up.y * 10 };
  const tricepsA = { x: SHOULDER.x + 34, y: SHOULDER.y + 16 };
  const tricepsB = { x: ELBOW.x - 18 * d.x - up.x * 8, y: ELBOW.y - 18 * d.y - up.y * 8 };
  const forearmDeg = -bend;

  return (
    <SceneSvg label={built ? `A model arm bent ${bend} degrees at the elbow.` : 'Build a model arm from its bones.'}>
      {/* Shoulder blade (socket) */}
      <path d={`M${SHOULDER.x - 50},${SHOULDER.y - 70} Q${SHOULDER.x - 8},${SHOULDER.y - 40} ${SHOULDER.x - 22},${SHOULDER.y} Q${SHOULDER.x - 8},${SHOULDER.y + 40} ${SHOULDER.x - 50},${SHOULDER.y + 70} Z`} fill={BONE} stroke={C.ink} strokeWidth={2.5} />
      <text x={SHOULDER.x - 50} y={SHOULDER.y + 96} fontSize={14} fill={C.muted}>
        shoulder blade
      </text>

      {/* Empty slots while building */}
      {(Object.keys(SLOTS) as Piece[]).map((k) =>
        placed.includes(k) ? null : (
          <g key={k}>
            <rect x={SLOTS[k].x - (k === 'hand' ? 48 : 112)} y={SLOTS[k].y - 26} width={k === 'hand' ? 96 : 224} height={52} rx={18} fill="transparent" stroke={C.ink2} strokeWidth={2} strokeDasharray="8 7" />
            <text x={SLOTS[k].x} y={SLOTS[k].y + 46} textAnchor="middle" fontSize={14} fill={C.muted}>
              {SLOTS[k].name}
            </text>
          </g>
        ),
      )}

      {/* Built bones */}
      {placed.includes('humerus') && (
        <g transform={`translate(${SLOTS.humerus.x} ${SLOTS.humerus.y})`}>
          <Humerus />
        </g>
      )}
      {built && (
        <>
          <Muscle a={tricepsA} b={tricepsB} bulge={10 + 14 * (1 - contraction)} side={1} active={dir === 'straighten'} label={dir === 'straighten' ? 'Triceps: pulling' : 'Triceps'} at={{ x: SHOULDER.x + 100, y: SHOULDER.y + 56 }} />
          <Muscle a={bicepsA} b={bicepsB} bulge={12 + 20 * contraction} side={-1} active={dir === 'bend'} label={dir === 'bend' ? 'Biceps: pulling' : 'Biceps'} at={{ x: SHOULDER.x + 70, y: SHOULDER.y - 74 }} />
        </>
      )}
      {placed.includes('forearm') && (
        <g transform={built ? `translate(${ELBOW.x} ${ELBOW.y}) rotate(${forearmDeg})` : `translate(${ELBOW.x} ${ELBOW.y})`}>
          <Forearm />
          {placed.includes('hand') && (
            <g transform={`translate(${FOREARM + 4} 0)`}>
              <HandBones />
            </g>
          )}
        </g>
      )}
      {!placed.includes('forearm') && placed.includes('hand') && (
        <g transform={`translate(${ELBOW.x + FOREARM + 4} ${ELBOW.y})`}>
          <HandBones />
        </g>
      )}

      {/* Joints you can tap */}
      {placed.includes('humerus') && (
        <g onClick={() => { setJoint('shoulder'); play('tap'); }} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="Shoulder joint">
          <circle cx={SHOULDER.x + 6} cy={SHOULDER.y} r={30} fill="transparent" />
          <circle cx={SHOULDER.x + 6} cy={SHOULDER.y} r={7} fill={C.teal} stroke={C.ink} strokeWidth={2} />
        </g>
      )}
      {placed.includes('humerus') && placed.includes('forearm') && (
        <g onClick={() => { setJoint('elbow'); play('tap'); }} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="Elbow joint">
          <circle cx={ELBOW.x} cy={ELBOW.y} r={26} fill="transparent" />
          <circle cx={ELBOW.x} cy={ELBOW.y} r={7} fill={C.teal} stroke={C.ink} strokeWidth={2} />
        </g>
      )}

      {/* Drag handle on the hand */}
      {built && (
        <g {...drag} role="slider" aria-label="Drag the hand to bend the elbow" aria-valuenow={bend}>
          <circle cx={wrist.x + d.x * 40} cy={wrist.y + d.y * 40} r={34} fill="transparent" />
          <circle cx={wrist.x + d.x * 40} cy={wrist.y + d.y * 40} r={20} fill="transparent" stroke={C.teal} strokeWidth={3} strokeDasharray="5 5" />
        </g>
      )}

      {/* Bone tray */}
      {!built && (
        <g>
          <rect x={30} y={530} width={590} height={124} rx={18} fill={C.card} stroke={C.line} strokeWidth={2} />
          <text x={50} y={556} fontSize={15} fill={C.muted} className="caps">
            Bones to place
          </text>
          {(Object.keys(TRAY) as Piece[]).map((k) =>
            placed.includes(k) ? null : (
              <Draggable key={k} x={TRAY[k].x} y={TRAY[k].y} onDrop={(p) => drop(k, p)} onTap={() => drop(k, SLOTS[k])} label={`Place the ${SLOTS[k].name}`}>
                <rect x={k === 'hand' ? -10 : k === 'forearm' ? -24 : -125} y={-34} width={k === 'hand' ? 100 : k === 'forearm' ? 230 : 250} height={68} fill="transparent" />
                <g transform={k === 'humerus' ? 'scale(0.55)' : k === 'forearm' ? 'translate(-10 0) scale(0.55)' : 'scale(0.9)'}>
                  {k === 'humerus' ? <Humerus /> : k === 'forearm' ? <Forearm /> : <HandBones />}
                </g>
                <text x={k === 'forearm' ? 45 : k === 'hand' ? 36 : 0} y={44} textAnchor="middle" fontSize={14} fill={C.ink2}>
                  {SLOTS[k].name}
                </text>
              </Draggable>
            ),
          )}
        </g>
      )}

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard
          x={640}
          y={20}
          w={340}
          prediction={guess}
          actual={challenge.actual}
          because={challenge.because}
          onAgain={() => {
            setGuess(null);
            setObserved(false);
            setCIdx((cIdx + 1) % CHALLENGES.length);
          }}
        />
      ) : (
        <g>
          <PredictCard
            x={640}
            y={20}
            w={340}
            question={challenge.question}
            options={challenge.options}
            prediction={guess}
            onPredict={(o) => {
              setGuess(o);
              setMoves({ bent: false, straightened: false, max: bend });
              play('tap');
            }}
          />
          {guess !== null && (
            <WrapText x={652} y={140} width={320} fontSize={15} fill={C.ink2} text={built ? 'Now drag the hand (or use the buttons) and watch the muscles.' : 'First build the arm, then move it and watch the muscles.'} />
          )}
        </g>
      )}

      {/* What's happening */}
      <rect x={640} y={232} width={340} height={240} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={660} y={266} fontSize={18} fontWeight={700} fill={C.ink}>
        {built ? `Elbow bent ${bend}°` : 'Build the arm'}
      </text>
      <WrapText
        x={660}
        y={298}
        width={305}
        fontSize={15}
        fill={C.ink2}
        text={
          joint === 'elbow'
            ? 'Elbow: a hinge joint. It bends one way only, like a door. Knees are hinges too.'
            : joint === 'shoulder'
              ? 'Shoulder: a ball and socket joint. The round end of the bone turns in a cup, so your arm can swing round in a circle. Hips are like this too.'
              : message || (built ? 'Muscles can only pull. Watch which one pulls as you move the arm. Tap a joint to learn about it.' : 'Drag each bone into its place, or tap it.')
        }
      />
      {built && (
        <text x={660} y={448} fontSize={15} fill={C.muted}>
          {dir === 'bend' ? 'Biceps pulls · triceps relaxes' : dir === 'straighten' ? 'Triceps pulls · biceps relaxes' : 'Move the arm to see'}
        </text>
      )}
      <SvgButton x={640} y={492} w={110} h={50} fontSize={17} label="Bend" onClick={() => animateTo(130)} disabled={!built || bend >= 130} color={C.yellow} />
      <SvgButton x={760} y={492} w={130} h={50} fontSize={17} label="Straighten" onClick={() => animateTo(0)} disabled={!built || bend === 0} />
      <SvgButton x={900} y={492} w={80} h={50} fontSize={15} label="Reset" title="Take the arm apart" onClick={() => { setPlaced([]); setBend(0); setDir(null); setJoint(null); setMessage(''); }} disabled={placed.length === 0} />

      <Callout at={[ELBOW.x, ELBOW.y]} box={[380, 120]} w={210} icon={RotateCw} title="Hinge joint" text="The elbow bends one way, like a door." />
      <Callout at={[SHOULDER.x + 6, SHOULDER.y]} box={[40, 120]} w={220} icon={Bone} title="Ball and socket" text="The shoulder can swing round in a circle." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={52} width={56} height={9} rx={4.5} fill={BONE} stroke={C.ink} strokeWidth={2} />
      <rect x={60} y={20} width={9} height={40} rx={4.5} fill={BONE} stroke={C.ink} strokeWidth={2} transform="rotate(20 64 56)" />
      <path d="M20,50 Q40,22 66,40 Q44,46 20,50 Z" fill={C.red} stroke={C.ink} strokeWidth={2} />
      <circle cx={64} cy={56} r={5} fill={C.teal} stroke={C.ink} strokeWidth={1.5} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['muscles', 'hingeEasy', 'skeleton', 'skull']) : level === 1 ? pick(['bend', 'straighten', 'ball', 'ribs']) : pick(['pairs', 'relax', 'hinge3', 'count']);

  if (kind === 'muscles') {
    const right = 'Pull on bones to move them';
    return {
      prompt: 'What do muscles do?',
      choices: choices(shuffle([right, 'Push bones apart', 'Pump blood round the body'])),
      answer: right,
      hint: 'Muscles get shorter when they work.',
      explain: ['When a muscle works it gets shorter.', 'That shortening tugs on a bone.', 'So muscles pull on bones to move them.'],
    };
  }
  if (kind === 'hingeEasy') {
    const right = 'Elbow';
    return {
      prompt: 'Which joint bends one way only, like a door?',
      choices: choices(shuffle([right, 'Shoulder'])),
      answer: right,
      hint: 'Try moving each one. Which can only fold and unfold?',
      explain: ['Your shoulder can swing round in a circle.', 'Your elbow only folds and unfolds.', 'So the elbow is the hinge joint.'],
    };
  }
  if (kind === 'skeleton') {
    const right = 'Skeleton';
    return {
      prompt: 'What holds your body up and protects the soft parts inside?',
      choices: choices(shuffle([right, 'Muscles', 'Skin'])),
      answer: right,
      hint: 'It is made of all your bones together.',
      explain: ['Bones are hard and strong.', 'Together they make a frame that holds you up and guards your organs.', 'That frame is your skeleton.'],
    };
  }
  if (kind === 'skull') {
    const right = 'Skull';
    return {
      prompt: 'Which bone protects your brain?',
      choices: choices(shuffle([right, 'Ribs', 'Spine'])),
      answer: right,
      hint: 'Your brain is inside your head.',
      explain: ['Your brain is in your head.', 'The hard bone round it is the skull.', 'So the skull protects your brain.'],
    };
  }
  if (kind === 'bend' || kind === 'straighten') {
    const right = kind === 'bend' ? 'Biceps' : 'Triceps';
    return {
      prompt: kind === 'bend' ? 'To bend your arm at the elbow, which muscle pulls?' : 'To straighten your arm, which muscle pulls?',
      choices: choices(shuffle(['Biceps', 'Triceps'])),
      answer: right,
      hint: kind === 'bend' ? 'Which muscle is on the front of the upper arm?' : 'Which muscle is on the back of the upper arm?',
      explain:
        kind === 'bend'
          ? ['The biceps is on the front of your upper arm.', 'It gets shorter and pulls your forearm up.', 'So the biceps pulls to bend.']
          : ['The triceps is on the back of your upper arm.', 'It gets shorter and pulls your arm straight.', 'So the triceps pulls to straighten.'],
    };
  }
  if (kind === 'ball') {
    const right = 'Ball and socket';
    return {
      prompt: 'Your shoulder can swing your arm round in a circle. What kind of joint is it?',
      choices: choices(shuffle([right, 'Hinge'])),
      answer: right,
      hint: 'A hinge only folds one way.',
      explain: ['The top of the arm bone is round, like a ball.', 'It sits in a cup and can turn in every direction.', 'So the shoulder is a ball and socket joint.'],
    };
  }
  if (kind === 'ribs') {
    const right = 'Heart and lungs';
    return {
      prompt: 'What do your ribs protect?',
      choices: choices(shuffle([right, 'Brain', 'Feet'])),
      answer: right,
      hint: 'Your ribs make a cage in your chest.',
      explain: ['Your ribs curve round your chest like a cage.', 'Inside your chest are your heart and lungs.', 'So the ribs protect your heart and lungs.'],
    };
  }
  if (kind === 'pairs') {
    const right = 'Muscles can only pull, so a second one pulls the other way';
    return {
      prompt: 'Why do muscles work in pairs?',
      choices: choices(shuffle([right, 'One muscle is a spare', 'They push each other'])),
      answer: right,
      hint: 'Can a muscle push?',
      explain: ['A muscle can only pull, never push.', 'One muscle bends the joint; another pulls it back.', 'So: muscles can only pull, so a second one pulls the other way.'],
    };
  }
  if (kind === 'relax') {
    const right = 'It relaxes';
    return {
      prompt: 'When your biceps pulls to bend your arm, what does your triceps do?',
      choices: choices(shuffle([right, 'It pulls too', 'It pushes'])),
      answer: right,
      hint: 'If both pulled at once, would the arm move?',
      explain: ['If both pulled hard, the arm would not move.', 'So while the biceps pulls, the triceps lets go.', 'It relaxes and gets longer.'],
    };
  }
  if (kind === 'hinge3') {
    const right = 'Knee';
    return {
      prompt: 'Which of these is a hinge joint?',
      choices: choices(shuffle([right, 'Hip', 'Shoulder'])),
      answer: right,
      hint: 'Which one only folds forwards and back?',
      explain: ['Your hip and shoulder can swing round: they are ball and socket joints.', 'Your knee only folds and unfolds.', 'So the knee is a hinge joint.'],
    };
  }
  // count
  const right = 'About 206';
  return {
    prompt: 'About how many bones are in a grown-up’s skeleton?',
    choices: choices(shuffle([right, 'About 50', 'About 1,000'])),
    answer: right,
    hint: 'Babies have more, and some join together as they grow.',
    explain: ['Babies are born with about 300 bones.', 'Some join together as they grow up.', 'A grown-up has about 206.'],
  };
}

export const skeletonAndMuscles: Lesson = {
  id: 'skeleton-and-muscles',
  title: 'Bones and Muscles',
  Thumb,
  Scene: ArmScene,
  sceneHint: 'Build the arm · Predict · Then drag the hand to bend and straighten',
  learn: {
    heading: 'Bones, joints and muscles',
    intro:
      'Your skeleton holds you up and protects your insides. Joints let bones move, and muscles move them by pulling. Muscles can only pull, so they work in pairs.',
    points: [
      { icon: Bone, text: 'Bones meet at joints: hinges bend one way, ball and socket joints swing round.' },
      { icon: Dumbbell, text: 'The biceps pulls to bend your arm.' },
      { icon: Hand, text: 'The triceps pulls to straighten it again.' },
    ],
  },
  steps: [
    'Find the joint: where do the bones meet?',
    'Which way does the bone need to move?',
    'Find the muscle on that side: it pulls.',
    'The muscle on the other side relaxes.',
  ],
  example: {
    question: 'You lift a cup to your mouth. Which muscle pulls, and which relaxes?',
    work: ['Lifting the cup bends your elbow.', 'The biceps on the front pulls; the triceps on the back relaxes.'],
    answer: 'The biceps pulls and the triceps relaxes.',
  },
  grownups: [
    'Ask them to hold their upper arm and bend their elbow: they can feel the biceps get shorter and fatter.',
    'Then push down on a table with a straight arm and feel the triceps tighten.',
    'A common mix-up is that muscles push. They only pull, which is why they come in pairs.',
  ],
  makeQuestion,
};
