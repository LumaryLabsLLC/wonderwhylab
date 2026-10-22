import { useEffect, useRef, useState } from 'react';
import { Eye, Grid2x2, Target } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { NumberLine } from '../../visuals/NumberLine';
import { TenFrame } from '../../visuals/TenFrame';
import { countList } from './explain';
import { BenchmarkPicture, JarPicture, JarShape, marbleColour, marbleSpot, TenVsJarPicture } from './visuals/Jar';

const JAR = { left: 70, right: 360, top: 170, floor: 520 };
const R = 20;
const FRAME = { x: 430, y: 150, cell: 48, gap: 130 };
const LINE = { x: 60, y: 615, width: 580 };

/** Where marble i goes when counted into the ten-frames. */
function cellSpot(i: number) {
  const f = Math.floor(i / 10);
  const k = i % 10;
  return {
    x: FRAME.x + (k % 5) * FRAME.cell + FRAME.cell / 2,
    y: FRAME.y + f * FRAME.gap + Math.floor(k / 5) * FRAME.cell + FRAME.cell / 2,
  };
}

function verdict(guess: number, n: number): string {
  const off = Math.abs(guess - n);
  if (off === 0) return `Exactly right! There are ${n}. Amazing estimating!`;
  if (off <= 2) return `You guessed ${guess}. There are ${n}. Only ${off} away. Very close!`;
  if (off <= 4) return `You guessed ${guess}. There are ${n}. That’s close!`;
  return `You guessed ${guess}. There are ${n}. Now you know what ${n} looks like. Try another jar!`;
}

function EstimateScene() {
  const [n, setN] = useState(13);
  const [guess, setGuess] = useState<number | null>(null);
  const [counted, setCounted] = useState(0);
  const [counting, setCounting] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const done = counted >= n && !counting && counted > 0;

  const check = () => {
    if (guess === null) return;
    window.clearInterval(timer.current);
    setCounting(true);
    let k = 0;
    setCounted(0);
    timer.current = window.setInterval(() => {
      k += 1;
      setCounted(k);
      play('tap');
      if (k >= n) {
        window.clearInterval(timer.current);
        setCounting(false);
        play(Math.abs((guess ?? 0) - n) <= 2 ? 'correct' : 'pop');
      }
    }, 320);
  };

  const newJar = () => {
    window.clearInterval(timer.current);
    let m = n;
    while (m === n) m = rand(6, 20);
    setN(m);
    setGuess(null);
    setCounted(0);
    setCounting(false);
    play('whoosh');
  };

  const sentence =
    guess === null
      ? 'About how many marbles are in the jar? Don’t count! Tap the number line to make a guess.'
      : counted === 0
        ? `You guessed ${guess}. Now count to check!`
        : counting
          ? `Counting… ${counted}`
          : verdict(guess, n);
  const lines = wrap(sentence, 21);

  return (
    <SceneSvg label="A jar of marbles to estimate, then count into ten-frames">
      <JarShape left={JAR.left} right={JAR.right} top={JAR.top} floor={JAR.floor} />

      {/* Ten-frames to count into */}
      <TenFrame x={FRAME.x} y={FRAME.y} cell={FRAME.cell} />
      <TenFrame x={FRAME.x} y={FRAME.y + FRAME.gap} cell={FRAME.cell} />
      <text x={FRAME.x} y={FRAME.y - 16} fontSize={16} fill={C.muted} className="caps">
        Count into tens
      </text>

      {Array.from({ length: n }, (_, i) => {
        const p = i < counted ? cellSpot(i) : marbleSpot(i, JAR.left + 6, JAR.right - 6, JAR.floor - 4, R);
        return (
          <g key={`${n}-${i}`} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 0.35s ease' }}>
            <circle r={R} fill={marbleColour(i)} stroke={C.ink} strokeWidth={2} />
            <circle cx={-6} cy={-7} r={5} fill={C.white} opacity={0.6} />
          </g>
        );
      })}

      {counted > 0 && <NumberCard x={FRAME.x + 60} y={FRAME.y + FRAME.gap * 2 + 4} w={110} h={86} value={counted} />}

      {/* Make a guess on the number line */}
      <text x={LINE.x} y={LINE.y - 54} fontSize={16} fill={C.muted} className="caps">
        Tap your guess
      </text>
      <NumberLine
        x={LINE.x}
        y={LINE.y}
        width={LINE.width}
        min={0}
        max={20}
        fontSize={16}
        marks={[
          ...(guess !== null ? [{ value: guess, color: C.orange, label: String(guess) }] : []),
          ...(done ? [{ value: n, color: C.green }] : []),
        ]}
        onPick={(v) => {
          if (counting || counted > 0) return;
          setGuess(v);
          play('pop');
        }}
      />

      {/* Readout */}
      <rect x={730} y={110} width={240} height={50 + lines.length * 26} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={748} y={146 + i * 26} fontSize={18} fill={C.ink}>
          {l}
        </text>
      ))}
      <SvgButton x={730} y={430} w={240} h={56} fontSize={19} label="Count to check" onClick={check} disabled={guess === null || counting || counted > 0} color={C.teal} textColor={C.white} />
      <SvgButton x={730} y={500} w={240} h={52} fontSize={18} label="New jar" onClick={newJar} disabled={counting} />
      <SvgButton x={730} y={566} w={240} h={48} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />

      <Callout at={[JAR.right - 40, JAR.top + 60]} box={[150, 40]} w={240} icon={Eye} title="Look, don’t count" text="An estimate is a smart guess. Look at how much space the marbles fill." />
      <Callout at={[FRAME.x + FRAME.cell * 5, FRAME.y + FRAME.cell]} box={[440, 30]} w={260} icon={Grid2x2} title="Check in tens" text="Each full ten-frame is 10. Ten-frames make counting quick and easy." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <JarShape left={20} right={70} top={22} floor={74} />
      {Array.from({ length: 9 }, (_, i) => {
        const p = marbleSpot(i, 22, 68, 72, 7);
        return <circle key={i} cx={p.x} cy={p.y} r={7} fill={marbleColour(i)} stroke={C.ink} strokeWidth={1.2} />;
      })}
      <text x={96} y={50} textAnchor="middle" fontSize={26} fontWeight={700} fill={shade(C.orange, -0.2)}>
        ~10
      </text>
    </svg>
  );
}

const about = (k: number) => `about ${k}`;

function makeQuestion(level: number): Question {
  if (level === 0) {
    // Which benchmark is closest: 5, 10 or 20?
    const target = pick([5, 10, 20]);
    const n = target === 5 ? rand(4, 6) : target === 10 ? rand(9, 11) : rand(18, 21);
    return {
      prompt: 'About how many marbles are in the jar?',
      visual: <JarPicture n={n} />,
      choices: [5, 10, 20].map((k) => ({ value: about(k) })),
      answer: about(target),
      hint: 'Don’t count every one. Is it just a few, a handful, or lots?',
      explain: [`Count to check: there are ${n} marbles.`, `${n} is closest to ${target}.`, `So there are ${about(target)}.`],
    };
  }

  if (level === 1) {
    // Use a known jar of 5 to estimate a bigger jar.
    const target = pick([10, 20, 30]);
    const n = target + rand(-1, 1);
    return {
      prompt: 'The small jar has 5 marbles. About how many are in the big jar?',
      visual: <BenchmarkPicture small={5} big={n} />,
      choices: [10, 20, 30].map((k) => ({ value: about(k) })),
      answer: about(target),
      hint: 'Think how many small jars of 5 would fill the big jar.',
      explain: [
        `The big jar looks like about ${target / 5} jars of 5.`,
        `${countList(1, target / 5)} groups of 5 make ${target}.`,
        `So the big jar has ${about(target)}. (There are really ${n}.)`,
      ],
    };
  }

  // More or less than 10?
  const more = Math.random() < 0.5;
  const n = more ? rand(14, 18) : rand(3, 6);
  const answer = more ? 'more than 10' : 'less than 10';
  return {
    prompt: 'The ten-frame shows 10. Are there more or less than 10 marbles in the jar?',
    visual: <TenVsJarPicture n={n} />,
    choices: shuffle(['more than 10', 'less than 10']).map((value) => ({ value })),
    answer,
    hint: 'Picture the marbles filling the ten-frame. Would they fill it?',
    explain: [
      `Put the marbles in the ten-frame in your head.`,
      more ? `They would fill it and need more boxes: there are ${n}.` : `They would not fill it: there are only ${n}.`,
      `So there are ${answer}.`,
    ],
  };
}

export const estimateIt: Lesson = {
  id: 'estimate-it',
  title: 'About How Many?',
  Thumb,
  Scene: EstimateScene,
  sceneHint: 'Tap the number line to guess · Then count to check',
  learn: {
    heading: 'Estimating',
    intro: 'An estimate is a smart guess about how many. First you look and guess, then you count to check. Getting close is great!',
    points: [
      { icon: Eye, text: 'Look at how much space they fill. Don’t count yet.' },
      { icon: Target, text: 'Make a smart guess. Close is good!' },
      { icon: Grid2x2, text: 'Count in tens to check how close you were.' },
    ],
  },
  steps: [
    'Look at the jar without counting.',
    'Think: is it a few, about ten, or lots?',
    'Make your guess.',
    'Count to check. How close were you?',
  ],
  example: {
    question: 'About how many marbles are in the jar?',
    visual: <JarPicture n={11} />,
    work: ['It looks like more than a few, but not lots.', 'It looks like about one full ten-frame.', 'Counting shows 11.'],
    answer: 'About 10.',
  },
  grownups: [
    'Estimate together every day: grapes in a bowl, steps to the door, cars in a car park. Then count to check.',
    'Praise good estimates (close ones), not just exact answers. Estimating is a skill of its own.',
    'Benchmarks help: “this handful is 5”, so “about how many handfuls?”.',
  ],
  makeQuestion,
};
