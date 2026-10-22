import { useState } from 'react';
import { Pointer, Repeat, Search, Volume2 } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

type TokenShape = 'circle' | 'square' | 'triangle' | 'star' | 'diamond';

interface Token {
  id: string;
  name: string;
  word: string;
  shape: TokenShape;
  color: string;
}

const TOKENS: Token[] = [
  { id: 'red-circle', name: 'red circle', word: 'red', shape: 'circle', color: C.red },
  { id: 'blue-square', name: 'blue square', word: 'blue', shape: 'square', color: C.blue },
  { id: 'yellow-triangle', name: 'yellow triangle', word: 'yellow', shape: 'triangle', color: C.yellow },
  { id: 'green-star', name: 'green star', word: 'green', shape: 'star', color: C.green },
  { id: 'purple-diamond', name: 'purple diamond', word: 'purple', shape: 'diamond', color: C.purple },
];

const UNITS: { name: string; unit: number[] }[] = [
  { name: 'AB', unit: [0, 1] },
  { name: 'AAB', unit: [0, 0, 1] },
  { name: 'ABB', unit: [0, 1, 1] },
  { name: 'ABC', unit: [0, 1, 2] },
  { name: 'AABB', unit: [0, 0, 1, 1] },
];

const LETTERS = ['A', 'B', 'C'];

/** One bead/token centred at (x, y) with radius r. */
function TokenDraw({ token, x, y, r }: { token: Token; x: number; y: number; r: number }) {
  const common = { fill: token.color, stroke: C.ink, strokeWidth: Math.max(2, r * 0.09), strokeLinejoin: 'round' as const };
  let body;
  switch (token.shape) {
    case 'circle':
      body = <circle cx={x} cy={y} r={r} {...common} />;
      break;
    case 'square':
      body = <rect x={x - r * 0.88} y={y - r * 0.88} width={r * 1.76} height={r * 1.76} rx={r * 0.2} {...common} />;
      break;
    case 'triangle':
      body = <polygon points={`${x},${y - r} ${x + r * 0.98},${y + r * 0.78} ${x - r * 0.98},${y + r * 0.78}`} {...common} />;
      break;
    case 'diamond':
      body = <polygon points={`${x},${y - r} ${x + r * 0.8},${y} ${x},${y + r} ${x - r * 0.8},${y}`} {...common} />;
      break;
    case 'star': {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.46 : r;
        return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
      }).join(' ');
      body = <polygon points={pts} {...common} />;
      break;
    }
  }
  return (
    <g>
      {body}
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.14} fill={C.white} opacity={0.65} />
    </g>
  );
}

function TokenIcon({ token }: { token: Token }) {
  return (
    <svg viewBox="-32 -32 64 64" role="img" aria-label={token.name}>
      <TokenDraw token={token} x={0} y={0} r={26} />
    </svg>
  );
}

// Cord geometry: a gentle curve from P0 to P2.
const P0: [number, number] = [70, 220];
const P1: [number, number] = [500, 300];
const P2: [number, number] = [930, 220];
const LENGTH = 9;

function onCord(t: number): [number, number] {
  const u = 1 - t;
  return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]];
}
const beadAt = (i: number) => onCord((i + 0.5) / LENGTH);

function buildPattern(unitIndex: number) {
  const { unit } = UNITS[unitIndex];
  const kinds = Math.max(...unit) + 1;
  const tokens = shuffle(TOKENS).slice(0, kinds);
  const extra = TOKENS.filter((t) => !tokens.includes(t));
  const options = shuffle([...tokens, ...shuffle(extra).slice(0, 3 - kinds)]);
  return { unitIndex, tokens, options };
}

function PatternScene() {
  const [p, setP] = useState(() => ({
    unitIndex: 0,
    tokens: [TOKENS[0], TOKENS[1]],
    options: [TOKENS[1], TOKENS[2], TOKENS[0]],
  }));
  const [filled, setFilled] = useState(false);
  const [wrong, setWrong] = useState<{ id: string; n: number } | null>(null);
  const [repeats, setRepeats] = useState(false);

  const { unit } = UNITS[p.unitIndex];
  const seq = Array.from({ length: LENGTH }, (_, i) => p.tokens[unit[i % unit.length]]);
  const answer = seq[LENGTH - 1];

  const pickToken = (t: Token) => {
    if (filled) return;
    if (t.id === answer.id) {
      setFilled(true);
      setWrong(null);
      play('correct');
      const unitWords = unit.map((k) => p.tokens[k].word).join(', ');
      speak(`Yes! ${unitWords}, ${unitWords}, again and again!`);
    } else {
      setWrong({ id: t.id, n: (wrong?.n ?? 0) + 1 });
      play('wrong');
    }
  };

  const fresh = () => {
    let next = rand(0, UNITS.length - 1);
    if (next === p.unitIndex) next = (next + 1) % UNITS.length;
    setP(buildPattern(next));
    setFilled(false);
    setWrong(null);
    play('whoosh');
  };

  const words = unit.map((k) => p.tokens[k].word).join(', ');
  const sayIt = () => speak(seq.slice(0, LENGTH - 1).map((t) => t.word).join(', ') + ', what comes next?', { force: true });

  const last = beadAt(LENGTH - 1);
  const first = beadAt(0);
  const optionX = (i: number) => 500 + (i - (p.options.length - 1) / 2) * 150;

  return (
    <SceneSvg label={`A bead pattern: ${seq.slice(0, LENGTH - 1).map((t) => t.name).join(', ')}, then a missing bead.`}>
      {/* Cord */}
      <path d={`M${P0[0]},${P0[1]} Q${P1[0]},${P1[1]} ${P2[0]},${P2[1]}`} fill="none" stroke={C.brown} strokeWidth={5} strokeLinecap="round" />
      <circle cx={P0[0]} cy={P0[1]} r={9} fill={C.brown} stroke={C.ink} strokeWidth={2} />
      <circle cx={P2[0]} cy={P2[1]} r={9} fill={C.brown} stroke={C.ink} strokeWidth={2} />

      {seq.map((t, i) => {
        const [x, y] = beadAt(i);
        if (i === LENGTH - 1 && !filled) {
          return (
            <g key={`${p.unitIndex}-${i}`}>
              <circle cx={x} cy={y} r={36} fill={C.card} stroke={C.teal} strokeWidth={3} strokeDasharray="7 6" />
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize={32} fontWeight={700} fill={C.teal}>
                ?
              </text>
            </g>
          );
        }
        return (
          <g key={`${p.unitIndex}-${i}-${t.id}`} className={i === LENGTH - 1 ? 'pop-in' : undefined} style={{ transformOrigin: `${x}px ${y}px` }}>
            <ellipse cx={x + 3} cy={y + 34} rx={26} ry={6} fill={C.ink} opacity={0.12} />
            <TokenDraw token={t} x={x} y={y} r={34} />
          </g>
        );
      })}

      {/* Repeating parts */}
      {repeats &&
        Array.from({ length: Math.ceil(LENGTH / unit.length) }, (_, r) => {
          const from = r * unit.length;
          const to = Math.min(LENGTH - 1, from + unit.length - 1);
          const xs = [beadAt(from)[0], beadAt(to)[0]];
          const yb = Math.max(...Array.from({ length: to - from + 1 }, (_, k) => beadAt(from + k)[1])) + 74;
          const complete = to - from + 1 === unit.length;
          return (
            <g key={r} className="fade-up" stroke={complete ? C.teal : C.muted} fill="none" strokeWidth={3} strokeLinecap="round">
              <path d={`M${xs[0] - 34},${yb - 10} v10 H${xs[1] + 34} v-10`} strokeDasharray={complete ? undefined : '6 6'} />
            </g>
          );
        })}
      {repeats &&
        seq.map((_, i) => {
          const [x, y] = beadAt(i);
          return (
            <text key={i} x={x} y={y + 56} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink2} className="caps">
              {LETTERS[unit[i % unit.length]]}
            </text>
          );
        })}

      {/* Bead box */}
      <text x={500} y={432} textAnchor="middle" fontSize={18} fill={C.ink2} className="caps">
        {filled ? 'You did it!' : 'Which bead comes next?'}
      </text>
      {p.options.map((t, i) => {
        const x = optionX(i);
        const isWrong = wrong?.id === t.id;
        return (
          <g
            key={`${t.id}-${isWrong ? wrong?.n : 0}`}
            onClick={() => pickToken(t)}
            style={{ cursor: filled ? 'default' : 'pointer', animation: isWrong ? 'shake 0.4s' : undefined }}
            role="button"
            aria-label={t.name}
            data-nopan
          >
            <rect x={x - 52} y={459} width={104} height={104} rx={16} fill={shade(C.paper, -0.18)} stroke={C.ink} strokeWidth={2} />
            <rect
              x={x - 52}
              y={453}
              width={104}
              height={104}
              rx={16}
              fill={isWrong ? '#f8ddd6' : filled && t.id === answer.id ? '#d6efdf' : C.card}
              stroke={isWrong ? C.red : C.ink}
              strokeWidth={2}
            />
            <TokenDraw token={t} x={x} y={505} r={32} />
          </g>
        );
      })}

      <SvgButton x={60} y={590} w={210} h={52} fontSize={18} label={repeats ? 'Hide repeats' : 'Show repeats'} onClick={() => setRepeats(!repeats)} active={repeats} />
      <SvgButton x={290} y={590} w={130} h={52} fontSize={18} label="Say it" title="Say the pattern" onClick={sayIt} />
      <SvgButton x={730} y={590} w={210} h={52} fontSize={18} label="New pattern" onClick={fresh} color={C.teal} textColor={C.white} />

      <Callout at={[first[0], first[1] - 36]} box={[40, 30]} w={270} icon={Repeat} title="Repeat, repeat!" text="A pattern is a part that comes again and again." />
      <Callout at={[last[0], last[1] - 38]} box={[650, 30]} w={270} icon={Volume2} title="Say it out loud" text={`${words}, ${words}… What comes next?`} />
      <Callout at={[optionX(0) - 52, 505]} box={[40, 420]} w={210} icon={Pointer} title="Pick a bead" text="Tap the one that fits." />
    </SceneSvg>
  );
}

function PatternPicture({ seq }: { seq: (Token | null)[] }) {
  const step = 54;
  return (
    <svg viewBox={`-30 -30 ${seq.length * step + 6} 60`} role="img" aria-label={seq.map((t) => (t ? t.name : 'missing')).join(', ')}>
      {seq.map((t, i) =>
        t ? (
          <TokenDraw key={i} token={t} x={i * step} y={0} r={22} />
        ) : (
          <g key={i}>
            <circle cx={i * step} cy={0} r={23} fill={C.card} stroke={C.teal} strokeWidth={2.5} strokeDasharray="5 5" />
            <text x={i * step} y={1} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill={C.teal}>
              ?
            </text>
          </g>
        ),
      )}
    </svg>
  );
}

function Thumb() {
  const seq = [TOKENS[0], TOKENS[1], TOKENS[0], TOKENS[1]];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M6,36 Q60,52 114,36" fill="none" stroke={C.brown} strokeWidth={2.5} />
      {seq.map((t, i) => (
        <TokenDraw key={i} token={t} x={16 + i * 22} y={38 + (i === 1 || i === 2 ? 5 : 2)} r={9.5} />
      ))}
      <circle cx={104} cy={39} r={10} fill={C.card} stroke={C.teal} strokeWidth={2} strokeDasharray="3 3" />
      <text x={104} y={40} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={C.teal}>?</text>
    </svg>
  );
}

const tokenChoice = (t: Token): Choice => ({ value: t.id, name: t.name, label: <TokenIcon token={t} /> });

function makeQuestion(level: number): Question {
  const unitIndex = level === 0 ? 0 : level === 1 ? pick([1, 2, 4]) : pick([0, 1, 2, 3]);
  const { unit } = UNITS[unitIndex];
  const kinds = Math.max(...unit) + 1;
  const tokens = shuffle(TOKENS).slice(0, kinds);
  const length = level === 0 ? 6 : rand(Math.max(6, unit.length * 2 + 1), 8);
  const seq = Array.from({ length }, (_, i) => tokens[unit[i % unit.length]]);

  // Level 2 sometimes hides a bead in the middle instead of at the end.
  const middle = level === 2 && unitIndex !== 3 && Math.random() < 0.5;
  const hole = middle ? rand(2, length - 2) : length - 1;
  const answer = seq[hole];
  const shown = seq.map((t, i) => (i === hole ? null : t));

  const optionCount = level === 0 ? 2 : 3;
  const extra = shuffle(TOKENS.filter((t) => !tokens.includes(t)));
  const options = shuffle([...tokens, ...extra].slice(0, Math.max(optionCount, kinds)));

  return {
    prompt: middle ? 'Which bead is missing?' : 'What comes next?',
    speak: `${shown.map((t) => (t ? t.word : 'something')).join(', ')}. ${middle ? 'Which bead is missing?' : 'What comes next?'}`,
    visual: <PatternPicture seq={shown} />,
    choices: options.map(tokenChoice),
    answer: answer.id,
    hint: 'Say the beads out loud from the start. Which part repeats?',
    explain: [
      `Say it: ${seq
        .slice(0, Math.max(hole, unit.length * 2))
        .map((t, i) => (i === hole ? '…' : t.word))
        .join(', ')}…`,
      `The part that repeats is ${unit.map((k) => tokens[k].word).join(', ')}.`,
      `So the ${middle ? 'missing' : 'next'} bead is the ${answer.name}.`,
    ],
  };
}

export const patterns: Lesson = {
  id: 'patterns',
  title: 'Patterns',
  Thumb,
  Scene: PatternScene,
  sceneHint: 'Tap the bead that comes next',
  learn: {
    heading: 'Patterns',
    intro: 'A pattern is something that repeats again and again, like red, blue, red, blue. If you find the part that repeats, you can say what comes next!',
    points: [
      { icon: Repeat, text: 'Find the part that repeats.' },
      { icon: Volume2, text: 'Say the pattern out loud.' },
      { icon: Search, text: 'Keep going to find the next one.' },
    ],
  },
  steps: [
    'Look at the beads from the start.',
    'Say each one out loud: red, blue, red, blue…',
    'Find the part that repeats. Here it is “red, blue”.',
    'Keep saying the pattern to find what comes next.',
  ],
  example: {
    question: 'What comes next?',
    visual: <PatternPicture seq={[TOKENS[2], TOKENS[2], TOKENS[1], TOKENS[2], TOKENS[2], TOKENS[1], TOKENS[2], null]} />,
    work: ['Say it: yellow, yellow, blue, yellow, yellow, blue, yellow…', 'The part that repeats is yellow, yellow, blue.', 'After one yellow comes another yellow.'],
    answer: 'A yellow triangle comes next.',
  },
  grownups: [
    'Make patterns with toys, socks or snacks, then ask “what comes next?”',
    'Clapping and stomping patterns (clap, clap, stomp) are patterns too — great for wriggly learners.',
    'Ask your child to make a pattern for you to finish. Creating one is harder than continuing one.',
    'Letters like AB or AAB name the pattern type. They help older children see that red-blue and cat-dog are the same pattern.',
  ],
  makeQuestion,
};
