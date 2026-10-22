import { useEffect, useState } from 'react';
import { Flashlight, Maximize2, MoveVertical } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { shuffle } from '../../../lib/random';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { EmojiPicture } from './visuals/Emoji';
import { MessageBox } from './visuals/MessageBox';

const WALL = { x: 790, y: 80, w: 170, h: 480 };
const TOY = { x: 560, y: 420 };
const FLOOR = 560;

/** Shadow size factor for a torch at x (bigger when the torch is closer to the teddy). */
const spread = (x: number) => (WALL.x - x) / (TOY.x - x);

interface Experiment {
  /** Where the torch starts, so the test is fair. */
  start: { x: number; y: number };
  question: string;
  options: string[];
  actual: string;
  because: string;
  done: (t: { x: number; y: number }, on: boolean) => boolean;
}
const EXPERIMENTS: Experiment[] = [
  {
    start: { x: 230, y: 330 },
    question: 'Torch closer: shadow bigger or smaller?',
    options: ['Bigger', 'Smaller'],
    actual: 'Bigger',
    because: 'Close to the torch, the teddy blocks more of the light.',
    done: (t, on) => on && spread(t.x) > 2.6,
  },
  {
    start: { x: 400, y: 330 },
    question: 'Torch far away: bigger or smaller?',
    options: ['Bigger', 'Smaller'],
    actual: 'Smaller',
    because: 'Far from the torch, the teddy blocks less light.',
    done: (t, on) => on && spread(t.x) < 1.6,
  },
  {
    start: { x: 300, y: 400 },
    question: 'Torch up high: shadow goes up or down?',
    options: ['Down', 'Up'],
    actual: 'Down',
    because: 'Light shines down past the teddy, so the dark patch lands lower.',
    done: (t, on) => on && t.y < 230,
  },
  {
    start: { x: 300, y: 330 },
    question: 'Torch off: will there be a shadow?',
    options: ['Yes', 'No'],
    actual: 'No',
    because: 'A shadow is blocked light. No light, no shadow!',
    done: (_t, on) => !on,
  },
];

/** A teddy bear centred at (0, 0), about 140 tall. `silhouette` draws just its dark outline shape. */
function Teddy({ silhouette = false }: { silhouette?: boolean }) {
  const fur = silhouette ? '#2e3346' : C.brown;
  const s = silhouette ? {} : { stroke: C.ink, strokeWidth: 3 };
  return (
    <g>
      <circle cx={-26} cy={-66} r={13} fill={fur} {...s} />
      <circle cx={26} cy={-66} r={13} fill={fur} {...s} />
      <ellipse cx={-42} cy={16} rx={13} ry={24} fill={fur} {...s} transform="rotate(20 -42 16)" />
      <ellipse cx={42} cy={16} rx={13} ry={24} fill={fur} {...s} transform="rotate(-20 42 16)" />
      <ellipse cx={0} cy={22} rx={38} ry={46} fill={fur} {...s} />
      <circle cx={0} cy={-40} r={32} fill={fur} {...s} />
      {!silhouette && (
        <g>
          <ellipse cx={0} cy={26} rx={22} ry={26} fill={shade(C.brown, 0.4)} />
          <ellipse cx={0} cy={-30} rx={14} ry={10} fill={shade(C.brown, 0.4)} />
          <circle cx={-11} cy={-46} r={4} fill={C.ink} />
          <circle cx={11} cy={-46} r={4} fill={C.ink} />
          <ellipse cx={0} cy={-34} rx={5} ry={4} fill={C.ink} />
        </g>
      )}
    </g>
  );
}

function Torch({ on }: { on: boolean }) {
  return (
    <g>
      <rect x={-70} y={-16} width={64} height={32} rx={10} fill={C.blue} stroke={C.ink} strokeWidth={3} />
      <path d="M-8,-16 L14,-26 V26 L-8,16 Z" fill={shade(C.blue, -0.2)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={14} cy={0} rx={6} ry={26} fill={on ? C.yellow : '#d9dee3'} stroke={C.ink} strokeWidth={3} />
      <rect x={-48} y={-24} width={16} height={8} rx={3} fill={on ? C.green : C.red} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

function ShadowScene() {
  const [torch, setTorch] = useState({ x: 230, y: 330 });
  const [on, setOn] = useState(true);
  const [exp, setExp] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);

  useEffect(() => {
    if (!observed && EXPERIMENTS[exp].done(torch, on)) {
      setObserved(true);
      play('correct');
    }
  }, [torch, on, exp, observed]);

  const nextExperiment = () => {
    const n = (exp + 1) % EXPERIMENTS.length;
    setExp(n);
    setGuess(null);
    setObserved(false);
    setTorch(EXPERIMENTS[n].start);
    setOn(true);
  };
  const drag = useSvgDrag((p) => setTorch({ x: clamp(p.x, 90, 470), y: clamp(p.y, 180, 520) }));

  // Where the shadow lands: things closer to the torch cast bigger shadows, on the far side.
  const s = spread(torch.x);
  const size = 0.55 * s;
  const shadowY = clamp(TOY.y + (TOY.y - torch.y) * (s - 1) * 0.5, WALL.y + 40, WALL.y + WALL.h - 40);
  const angle = (Math.atan2(TOY.y - torch.y, TOY.x - torch.x) * 180) / Math.PI;
  const lens = { x: torch.x + 14 * Math.cos((angle * Math.PI) / 180), y: torch.y + 14 * Math.sin((angle * Math.PI) / 180) };

  const message = !on
    ? 'No light, no shadow! Switch the torch on.'
    : s > 2.6
      ? 'The torch is close, so the shadow is BIG!'
      : s < 1.7
        ? 'The torch is far away, so the shadow is small.'
        : torch.y < 260
          ? 'Torch up high: the shadow moves down low.'
          : torch.y > 440
            ? 'Torch down low: the shadow moves up high.'
            : 'Drag the torch closer, farther, up and down.';

  return (
    <SceneSvg label="A torch shining on a teddy bear, making a shadow on the wall">
      <defs>
        <clipPath id="sl-wall">
          <rect x={WALL.x} y={WALL.y} width={WALL.w} height={WALL.h} rx={12} />
        </clipPath>
      </defs>

      {/* Floor and wall */}
      <rect x={40} y={FLOOR} width={930} height={14} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <rect x={WALL.x} y={WALL.y} width={WALL.w} height={WALL.h} rx={12} fill={on ? '#fff6cf' : '#e9edf2'} stroke={C.ink} strokeWidth={3} />

      {/* Light beam */}
      {on && <polygon points={`${lens.x},${lens.y} ${WALL.x},${WALL.y + 6} ${WALL.x},${WALL.y + WALL.h - 6}`} fill={C.yellow} opacity={0.22} />}

      {/* The shadow on the wall */}
      {on && (
        <g clipPath="url(#sl-wall)">
          <g transform={`translate(${WALL.x + WALL.w / 2} ${shadowY}) scale(${size})`} opacity={0.85}>
            <Teddy silhouette />
          </g>
        </g>
      )}

      {/* Stool and teddy */}
      <rect x={TOY.x - 50} y={TOY.y + 68} width={100} height={14} rx={5} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${TOY.x - 38},${TOY.y + 82} L${TOY.x - 46},${FLOOR} M${TOY.x + 38},${TOY.y + 82} L${TOY.x + 46},${FLOOR}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      <g transform={`translate(${TOY.x} ${TOY.y})`}>
        <Teddy />
      </g>

      {observed ? (
        <ExplainCard x={60} y={30} w={460} prediction={guess} actual={EXPERIMENTS[exp].actual} because={EXPERIMENTS[exp].because} onAgain={nextExperiment} />
      ) : (
        <PredictCard x={60} y={30} w={460} question={EXPERIMENTS[exp].question} options={EXPERIMENTS[exp].options} prediction={guess} onPredict={setGuess} />
      )}
      <MessageBox x={60} y={598} w={440} h={56} text={message} max={48} size={17} />
      <SvgButton x={560} y={64} w={200} h={52} fontSize={18} label={on ? 'Torch off' : 'Torch on'} onClick={() => setOn(!on)} color={on ? C.card : C.yellow} />

      {/* The torch */}
      <g transform={`translate(${torch.x} ${torch.y}) rotate(${angle})`}>
        <g {...drag} role="slider" aria-label="Torch: drag it around">
          <circle cx={-20} cy={0} r={56} fill="transparent" />
          <Torch on={on} />
        </g>
      </g>


      <Callout at={[TOY.x, TOY.y - 20]} box={[600, 150]} icon={Flashlight} title="A shadow is a light-blocker" text="The teddy blocks the light, so the wall behind it stays dark." w={250} />
      <Callout at={[WALL.x, shadowY]} box={[540, 604]} icon={Maximize2} title="Closer torch, bigger shadow" w={240} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={90} y={8} width={24} height={64} rx={4} fill="#fff6cf" stroke={C.ink} strokeWidth={2} />
      <polygon points="22,40 90,10 90,70" fill={C.yellow} opacity={0.3} />
      <g transform="translate(58 44) scale(0.3)">
        <Teddy />
      </g>
      <g transform="translate(102 40) scale(0.32)">
        <Teddy silhouette />
      </g>
      <g transform="translate(20 40) scale(0.4)">
        <Torch on />
      </g>
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5) {
      return {
        prompt: 'What do you need to make a shadow?',
        choices: shuffle([
          { value: 'light', label: 'Light', name: 'light' },
          { value: 'water', label: 'Water', name: 'water' },
          { value: 'music', label: 'Music', name: 'music' },
        ]),
        answer: 'light',
        hint: 'Try switching the torch off on the playground.',
        explain: ['A shadow happens when something blocks light.', 'With no light, there is nothing to block.', 'So you need light.'],
      };
    }
    return {
      prompt: 'In a totally dark room with no light, can you make a shadow?',
      visual: <EmojiPicture emoji="🌑" />,
      choices: [
        { value: 'yes', label: 'Yes', name: 'yes' },
        { value: 'no', label: 'No', name: 'no' },
      ],
      answer: 'no',
      hint: 'What does a shadow need to block?',
      explain: ['A shadow is where light is blocked.', 'In the dark there is no light to block.', 'So no, you can’t make a shadow.'],
    };
  }
  if (level === 1) {
    if (Math.random() < 0.5) {
      return {
        prompt: 'The torch moves closer to the teddy. What happens to the shadow?',
        choices: shuffle([
          { value: 'bigger', label: 'It gets bigger', name: 'it gets bigger' },
          { value: 'smaller', label: 'It gets smaller', name: 'it gets smaller' },
          { value: 'gone', label: 'It disappears', name: 'it disappears' },
        ]),
        answer: 'bigger',
        hint: 'Drag the torch close to the teddy and watch the wall.',
        explain: ['When the torch is close, the teddy blocks more of the light.', 'More blocked light makes a bigger dark patch.', 'So the shadow gets bigger.'],
      };
    }
    return {
      prompt: 'The sun is shining on one side of a tree. Where is the tree’s shadow?',
      visual: <EmojiPicture emoji="🌳" caption="☀️ sun on this side" />,
      choices: shuffle([
        { value: 'other', label: 'On the other side', name: 'on the other side' },
        { value: 'same', label: 'On the sun’s side', name: 'on the sun’s side' },
      ]),
      answer: 'other',
      hint: 'Light travels from the sun toward the tree. Where can’t it reach?',
      explain: ['Light shines from the sun toward the tree.', 'The tree blocks it, so it’s dark behind the tree.', 'So the shadow is on the other side.'],
    };
  }
  if (Math.random() < 0.5) {
    return {
      prompt: 'Which one lets light through, so it makes almost no shadow?',
      choices: shuffle([
        { value: 'glass', label: 'A clear window', name: 'a clear window' },
        { value: 'door', label: 'A wooden door', name: 'a wooden door' },
        { value: 'hand', label: 'Your hand', name: 'your hand' },
      ]),
      answer: 'glass',
      hint: 'Which one can you see through?',
      explain: ['Clear glass lets light pass through it.', 'Wood and hands block the light.', 'So a clear window makes almost no shadow.'],
    };
  }
  return {
    prompt: 'When is your shadow longest outside?',
    choices: shuffle([
      { value: 'evening', label: 'In the evening, when the sun is low', name: 'in the evening' },
      { value: 'noon', label: 'At lunchtime, when the sun is high', name: 'at lunchtime' },
    ]),
    answer: 'evening',
    hint: 'Move the torch low on the playground. What happens?',
    explain: ['In the evening the sun is low in the sky.', 'Low light makes long shadows.', 'So shadows are longest in the evening.'],
  };
}

export const lightAndShadow: Lesson = {
  id: 'light-and-shadow',
  title: 'Light and Shadows',
  Thumb,
  Scene: ShadowScene,
  sceneHint: 'Guess first · Then drag the torch and watch the shadow',
  learn: {
    heading: 'Light and shadows',
    intro: 'A shadow is a dark shape that appears when something blocks the light. Move the light, and the shadow moves too!',
    points: [
      { icon: Flashlight, text: 'Shadows need light. Something blocks the light.' },
      { icon: Maximize2, text: 'Light close to a toy makes a big shadow.' },
      { icon: MoveVertical, text: 'Move the light up, and the shadow moves down.' },
    ],
  },
  steps: [
    'Guess first: what will the shadow do?',
    'Test it: drag the torch closer, farther, up or down, or switch it off.',
    'Look at the wall. Were you right?',
    'Find out why, then try the next test.',
  ],
  example: {
    question: 'The torch moves far away from the teddy. What happens to the shadow?',
    work: ['Far away, the teddy blocks only a little of the light.', 'A little blocked light makes a small dark patch.'],
    answer: 'The shadow gets smaller.',
  },
  grownups: [
    'Make hand-shadow animals with a torch on a wall at bedtime.',
    'Go outside at different times of day and look at your shadows: long in the morning and evening, short at midday.',
    'Try see-through things (a clear bottle) and solid things (a book). Which make dark shadows?',
    'Never look straight at the sun or shine a torch in someone’s eyes.',
  ],
  makeQuestion,
};
