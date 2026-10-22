import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Gauge } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { EmojiPicture } from './visuals/Emoji';
import { MessageBox } from './visuals/MessageBox';

const FLOOR = 470;
const CART_W = 130;
const PUSH_START = 300;
const PULL_START = 720;
const ROPE = 230;
const WALL = 960;

type Strength = 'big' | 'medium' | 'little';
const STRENGTH_LABEL: Record<Strength, string> = { big: 'Big push', medium: 'Medium push', little: 'Little push' };
const STRENGTH_COLOR: Record<Strength, string> = { big: C.red, medium: C.orange, little: C.yellow };
const strengthOf = (windUp: number): Strength => (windUp > 150 ? 'big' : windUp > 70 ? 'medium' : 'little');
const BIG = 'A big push';
const LITTLE = 'A little push';

function Cart({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${FLOOR})`}>
      <rect x={4} y={-86} width={CART_W} height={60} rx={10} fill={C.ink} opacity={0.12} />
      <rect x={0} y={-90} width={CART_W} height={60} rx={10} fill={C.red} stroke={C.ink} strokeWidth={3} />
      <rect x={14} y={-80} width={CART_W - 28} height={14} rx={5} fill={shade(C.red, 0.3)} />
      {[28, CART_W - 28].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy={-18} r={18} fill={C.ink} />
          <circle cx={wx} cy={-18} r={7} fill={C.yellow} />
        </g>
      ))}
    </g>
  );
}

/** A friendly mitten. `flip` points it left. */
function Mitten({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <rect x={-90} y={-14} width={60} height={28} rx={10} fill={C.blue} stroke={C.ink} strokeWidth={3} />
      <path d="M-34,-30 C-10,-34 14,-24 14,0 C14,24 -10,34 -34,30 Z" fill={C.yellow} stroke={C.ink} strokeWidth={3} />
      <path d="M-24,-28 C-30,-44 -12,-50 -6,-34" fill={C.yellow} stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

function PushPullScene() {
  const [mode, setMode] = useState<'push' | 'pull'>('push');
  const [cartX, setCartX] = useState(PUSH_START);
  const [handX, setHandX] = useState(PUSH_START - 10);
  const [rolling, setRolling] = useState(false);
  /** How far each kind of push went (a fair test: same cart, same start). */
  const [trials, setTrials] = useState<Partial<Record<Strength, number>>>({});
  const [guess, setGuess] = useState<string | null>(null);
  const returnTimer = useRef<number | undefined>(undefined);
  const [message, setMessage] = useState('Drag the hand back, then let go to push!');
  const raf = useRef(0);
  const state = useRef({ cartX: PUSH_START, handX: PUSH_START - 10 });
  state.current = { cartX, handX };

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(returnTimer.current);
    },
    [],
  );

  const switchMode = (m: 'push' | 'pull') => {
    cancelAnimationFrame(raf.current);
    window.clearTimeout(returnTimer.current);
    setRolling(false);
    setMode(m);
    if (m === 'push') {
      setCartX(PUSH_START);
      setHandX(PUSH_START - 10);
      setMessage('Drag the hand back, then let go to push!');
    } else {
      setCartX(PULL_START);
      setHandX(PULL_START - ROPE);
      setMessage('Drag the hand to pull the rope.');
    }
  };

  const release = () => {
    if (mode !== 'push' || rolling) return;
    const windUp = clamp(state.current.cartX - 10 - state.current.handX, 0, 220);
    setHandX(state.current.cartX - 10);
    if (windUp < 8) return;
    play('pop');
    setRolling(true);
    // Rolling cart: it starts fast and the floor's rubbing (friction) slows it down.
    let x = state.current.cartX;
    let v = windUp * 0.075;
    const start = x;
    const step = () => {
      x += v;
      v -= 0.16;
      if (x + CART_W >= WALL) {
        x = WALL - CART_W;
        v = 0;
        play('tap');
      }
      setCartX(x);
      if (v > 0) raf.current = requestAnimationFrame(step);
      else {
        setRolling(false);
        const went = x - start;
        const kind = strengthOf(windUp);
        setTrials((t) => ({ ...t, [kind]: went }));
        setMessage(
          kind === 'big' ? 'A big push! Now try a little push.' : kind === 'little' ? 'A little push. Now try a big push.' : 'A medium push. Try a big one and a little one.',
        );
        // Back to the start line, so every push is a fair test.
        returnTimer.current = window.setTimeout(() => {
          setCartX(PUSH_START);
          setHandX(PUSH_START - 10);
        }, 900);
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const pushDrag = useSvgDrag(
    (p) => {
      if (rolling) return;
      setHandX(clamp(p.x + 30, state.current.cartX - 230, state.current.cartX - 10));
    },
    { onEnd: release },
  );

  const pullDrag = useSvgDrag((p) => {
    const hx = clamp(p.x + 30, 90, PULL_START - ROPE);
    setHandX(hx);
    setCartX(hx + ROPE);
    if (hx + ROPE < PULL_START - 20) setMessage('Pulling brings the cart closer to you!');
  });

  const windUp = mode === 'push' ? clamp(cartX - 10 - handX, 0, 220) : 0;
  const resetCart = () => switchMode(mode);

  return (
    <SceneSvg label="A toy cart you can push or pull">
      {/* Floor with distance marks */}
      <rect x={40} y={FLOOR} width={920} height={16} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={100 + i * 90} y1={FLOOR + 16} x2={100 + i * 90} y2={FLOOR + 30} stroke={C.muted} strokeWidth={2} />
      ))}
      <rect x={WALL} y={FLOOR - 160} width={18} height={176} rx={4} fill={C.line} stroke={C.ink} strokeWidth={2} />

      {/* Mode buttons */}
      <SvgButton x={60} y={60} w={150} h={52} fontSize={20} label="Push" onClick={() => switchMode('push')} active={mode === 'push'} color={mode === 'push' ? C.yellow : C.card} />
      <SvgButton x={226} y={60} w={150} h={52} fontSize={20} label="Pull" onClick={() => switchMode('pull')} active={mode === 'pull'} color={mode === 'pull' ? C.yellow : C.card} />

      {/* A flag where each kind of push stopped */}
      {mode === 'push' &&
        (Object.keys(trials) as Strength[]).map((k) => (
          <g key={k} transform={`translate(${PUSH_START + (trials[k] ?? 0) + CART_W / 2} ${FLOOR - 120})`}>
            <line x1={0} y1={0} x2={0} y2={120} stroke={C.ink} strokeWidth={3} />
            <path d="M0,0 L36,10 L0,20 Z" fill={STRENGTH_COLOR[k]} stroke={C.ink} strokeWidth={2} />
            <text x={4} y={-8} fontSize={15} fontWeight={700} fill={C.ink}>
              {k === 'medium' ? 'Medium' : k === 'big' ? 'Big' : 'Little'}
            </text>
          </g>
        ))}

      <Cart x={cartX} />

      {mode === 'push' ? (
        <g>
          {/* Push: the hand is behind the cart; arrow points away from you */}
          <g {...pushDrag} role="slider" aria-label="Push hand: drag back, then let go">
            <circle cx={handX - 40} cy={FLOOR - 60} r={56} fill="transparent" />
            <Mitten x={handX} y={FLOOR - 60} />
          </g>
          <g opacity={windUp > 8 ? 1 : 0.35}>
            <rect x={60} y={150} width={240} height={24} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2} />
            <rect x={62} y={152} width={(236 * windUp) / 220} height={20} rx={10} fill={windUp > 150 ? C.red : windUp > 70 ? C.orange : C.yellow} />
            <text x={310} y={168} fontSize={17} fill={C.ink} fontWeight={600}>
              {STRENGTH_LABEL[strengthOf(windUp)]}
            </text>
          </g>
          {cartX + CART_W + 104 < WALL && (
            <g>
              <path d={`M${cartX + CART_W + 20},${FLOOR - 120} h70`} stroke={C.green} strokeWidth={8} strokeLinecap="round" />
              <path d={`M${cartX + CART_W + 98},${FLOOR - 120} l-20,-14 v28 z`} fill={C.green} />
            </g>
          )}
        </g>
      ) : (
        <g>
          {/* Pull: a rope from the hand to the cart; arrow points toward you */}
          <path d={`M${handX + 10},${FLOOR - 62} Q${(handX + cartX) / 2},${FLOOR - 40} ${cartX},${FLOOR - 62}`} fill="none" stroke={C.brown} strokeWidth={6} strokeLinecap="round" />
          <g {...pullDrag} role="slider" aria-label="Pull hand: drag toward you">
            <circle cx={handX - 20} cy={FLOOR - 62} r={56} fill="transparent" />
            <Mitten x={handX + 30} y={FLOOR - 62} flip />
          </g>
          <path d={`M${cartX - 20},${FLOOR - 140} h-70`} stroke={C.purple} strokeWidth={8} strokeLinecap="round" />
          <path d={`M${cartX - 98},${FLOOR - 140} l20,-14 v28 z`} fill={C.purple} />
        </g>
      )}

      <MessageBox x={420} y={56} w={360} h={62} text={message} max={36} size={17} />
      {mode === 'push' &&
        (trials.big !== undefined && trials.little !== undefined ? (
          <ExplainCard
            x={440}
            y={134}
            w={360}
            prediction={guess}
            actual={trials.big >= trials.little ? BIG : LITTLE}
            because="A big push makes the cart go faster, so it rolls farther before rubbing on the floor stops it."
            onAgain={() => {
              setTrials({});
              setGuess(null);
              setMessage('Drag the hand back, then let go to push!');
            }}
          />
        ) : (
          <PredictCard x={440} y={134} w={360} question="Which push makes it go farther?" options={[BIG, LITTLE]} prediction={guess} onPredict={setGuess} />
        ))}
      <SvgButton x={800} y={60} w={150} h={52} fontSize={18} label="Reset" onClick={resetCart} />

      <Callout at={[PUSH_START + 60, FLOOR - 120]} box={[470, 560]} icon={ArrowRight} title="A push moves things away" w={260} />
      <Callout at={[180, 162]} box={[60, 220]} icon={Gauge} title="Bigger push, farther go" text="A big push makes the cart go faster and farther." w={240} />
      <Callout at={[PULL_START, FLOOR - 140]} box={[700, 560]} icon={ArrowLeft} title="A pull brings things closer" w={250} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={62} width={100} height={6} rx={3} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      <rect x={52} y={34} width={40} height={20} rx={4} fill={C.red} stroke={C.ink} strokeWidth={2} />
      <circle cx={60} cy={58} r={5} fill={C.ink} />
      <circle cx={84} cy={58} r={5} fill={C.ink} />
      <path d="M22,44 h22" stroke={C.green} strokeWidth={5} strokeLinecap="round" />
      <path d="M50,44 l-8,-6 v12 z" fill={C.green} />
      <circle cx={18} cy={44} r={8} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

interface Action {
  text: string;
  emoji: string;
  answer: 'push' | 'pull';
  /** Where the thing moves: "away from you" or "toward you". */
  moves: string;
}

const ACTIONS: Action[] = [
  { text: 'Kicking a ball', emoji: '⚽', answer: 'push', moves: 'The ball moves away from you' },
  { text: 'Pushing a shopping cart', emoji: '🛒', answer: 'push', moves: 'The cart rolls away from you' },
  { text: 'Pressing a doorbell', emoji: '🔔', answer: 'push', moves: 'Your finger presses the button away from you' },
  { text: 'Rolling a toy car away', emoji: '🚗', answer: 'push', moves: 'The car rolls away from you' },
  { text: 'Pulling a sled', emoji: '🛷', answer: 'pull', moves: 'The sled comes along toward you' },
  { text: 'Pulling up your socks', emoji: '🧦', answer: 'pull', moves: 'Your socks come up toward you' },
  { text: 'Picking an apple off a tree', emoji: '🍎', answer: 'pull', moves: 'The apple comes toward you' },
  { text: 'Pulling a weed out of the ground', emoji: '🌱', answer: 'pull', moves: 'The weed comes up toward you' },
];

const PUSH_PULL = [
  { value: 'push', label: 'Push', name: 'push' },
  { value: 'pull', label: 'Pull', name: 'pull' },
];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const a = pick(ACTIONS);
    return {
      prompt: `${a.text}: push or pull?`,
      visual: <EmojiPicture emoji={a.emoji} caption={a.text} />,
      choices: PUSH_PULL,
      answer: a.answer,
      hint: 'A push moves things away from you. A pull brings them closer.',
      explain: [`${a.moves}.`, a.answer === 'push' ? 'Moving something away is a push.' : 'Bringing something closer is a pull.', `So it is a ${a.answer}.`],
    };
  }
  if (level === 1) {
    const kind = pick(['farther', 'toward', 'away'] as const);
    if (kind === 'farther') {
      return {
        prompt: 'Which push makes the cart go farther?',
        choices: shuffle([
          { value: 'big', label: 'A big push', name: 'a big push' },
          { value: 'little', label: 'A little push', name: 'a little push' },
        ]),
        answer: 'big',
        hint: 'Try both on the playground and watch the flag.',
        explain: ['A big push makes the cart start faster.', 'A faster cart rolls farther before it stops.', 'So a big push makes it go farther.'],
      };
    }
    const toward = kind === 'toward';
    return {
      prompt: toward ? 'You want the wagon to come to you. Push or pull?' : 'You want the swing to go away from you. Push or pull?',
      visual: <EmojiPicture emoji={toward ? '🛷' : '🎠'} />,
      choices: PUSH_PULL,
      answer: toward ? 'pull' : 'push',
      hint: 'Which way do you want it to move: closer, or farther away?',
      explain: toward
        ? ['You want it to come closer to you.', 'Bringing something closer is a pull.', 'So you pull.']
        : ['You want it to move away from you.', 'Moving something away is a push.', 'So you push.'],
    };
  }
  const kind = pick(['stop', 'slow', 'heavy'] as const);
  if (kind === 'stop') {
    return {
      prompt: 'A ball is rolling toward you. How can you make it stop?',
      choices: shuffle([
        { value: 'push', label: 'Push against it', name: 'push against it' },
        { value: 'look', label: 'Look at it', name: 'look at it' },
        { value: 'clap', label: 'Clap your hands', name: 'clap your hands' },
      ]),
      answer: 'push',
      hint: 'Things only change how they move when something pushes or pulls them.',
      explain: ['A moving ball keeps going until something pushes or pulls it.', 'If you push against it, it slows down and stops.', 'So push against it.'],
    };
  }
  if (kind === 'slow') {
    return {
      prompt: 'Why does a rolling ball slow down and stop?',
      choices: shuffle([
        { value: 'rubs', label: 'It rubs on the ground', name: 'it rubs on the ground' },
        { value: 'tired', label: 'It gets tired', name: 'it gets tired' },
        { value: 'sleepy', label: 'It wants a nap', name: 'it wants a nap' },
      ]),
      answer: 'rubs',
      hint: 'Balls can’t get tired. What is the ball touching as it rolls?',
      explain: ['As the ball rolls, it rubs on the ground.', 'Rubbing slows things down.', 'So it stops because it rubs on the ground.'],
    };
  }
  return {
    prompt: 'Which needs a bigger push to get moving?',
    choices: shuffle([
      { value: 'full', label: 'A cart full of toys', name: 'a cart full of toys' },
      { value: 'empty', label: 'An empty cart', name: 'an empty cart' },
    ]),
    answer: 'full',
    hint: 'Think about which one is heavier.',
    explain: ['A cart full of toys is heavier.', 'Heavier things need a bigger push to get moving.', 'So a cart full of toys needs a bigger push.'],
  };
}

export const pushAndPull: Lesson = {
  id: 'push-and-pull',
  title: 'Push and Pull',
  Thumb,
  Scene: PushPullScene,
  sceneHint: 'Push: drag the hand back and let go · Pull: drag the hand toward you',
  learn: {
    heading: 'Pushes and pulls',
    intro: 'To make something move, you push it or pull it. A push moves things away from you. A pull brings them closer.',
    points: [
      { icon: ArrowRight, text: 'A push moves things away from you.' },
      { icon: ArrowLeft, text: 'A pull brings things closer to you.' },
      { icon: Gauge, text: 'A bigger push makes things go faster and farther.' },
    ],
  },
  steps: ['Pick Push or Pull.', 'Push: drag the hand back, then let go.', 'Pull: drag the hand and the rope brings the cart.', 'Try a little push, then a big push. Which goes farther?'],
  example: {
    question: 'Is kicking a ball a push or a pull?',
    visual: <EmojiPicture emoji="⚽" caption="Kicking a ball" />,
    work: ['When you kick, the ball moves away from you.', 'Moving something away is a push.'],
    answer: 'Kicking a ball is a push.',
  },
  grownups: [
    'Spot pushes and pulls in daily life: opening the fridge (pull), pushing a pram, pulling a zip.',
    'Roll a ball softly, then harder, and compare how far it goes.',
    'Ask “how could we make it stop?” Children discover that a push or pull can stop things too.',
    'Rolling things slow down because of rubbing (friction). Try a ball on carpet and on a smooth floor.',
  ],
  makeQuestion,
};
