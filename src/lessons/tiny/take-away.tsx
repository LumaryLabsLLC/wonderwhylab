import { useState } from 'react';
import { Hand, Hash, Minus } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { choices } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Thing, thingName } from '../../visuals/Thing';
import type { ThingKind } from '../../visuals/Thing';
import { countList } from './explain';

const POND = { cx: 370, cy: 330, rx: 320, ry: 178 };

const duckSpot = (i: number): [number, number] => [150 + (i % 5) * 110, 280 + Math.floor(i / 5) * 112];

function TakeAwayScene() {
  const [start, setStart] = useState(7);
  const [gone, setGone] = useState<number[]>([5, 6]);
  const left = start - gone.length;

  const toggle = (i: number) => {
    if (gone.includes(i)) {
      setGone(gone.filter((g) => g !== i));
      play('pop');
      return;
    }
    const next = [...gone, i];
    setGone(next);
    play('whoosh');
    speak(String(start - next.length));
  };

  const setCount = (n: number) => {
    setStart(Math.max(1, Math.min(10, n)));
    setGone([]);
    play('pop');
  };

  return (
    <SceneSvg label={`${start} ducks, ${gone.length} swam away, ${left} left`}>
      {/* Pond */}
      <ellipse cx={POND.cx + 6} cy={POND.cy + 10} rx={POND.rx} ry={POND.ry} fill={C.ink} opacity={0.1} />
      <ellipse cx={POND.cx} cy={POND.cy} rx={POND.rx} ry={POND.ry} fill="#bfe0ea" stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={POND.cx} cy={POND.cy + 6} rx={POND.rx - 26} ry={POND.ry - 22} fill="#a9d4e1" />
      {[
        [120, 200],
        [560, 470],
        [600, 210],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x},${y} q14,-8 28,0 t28,0`} fill="none" stroke={C.white} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      ))}
      {/* Reeds */}
      {[
        [66, 250],
        [80, 262],
        [664, 420],
        [678, 410],
      ].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x},${y} q-6,-40 4,-78`} fill="none" stroke={shade(C.green, -0.2)} strokeWidth={4} strokeLinecap="round" />
          <rect x={x - 3} y={y - 92} width={10} height={28} rx={5} fill={C.brown} stroke={C.ink} strokeWidth={1.5} />
        </g>
      ))}

      {Array.from({ length: start }, (_, i) => {
        const [x, y] = duckSpot(i);
        const away = gone.includes(i);
        return (
          <g
            key={i}
            onClick={() => toggle(i)}
            style={{ cursor: 'pointer', transform: away ? 'translate(26px, -22px)' : 'none', transition: 'transform 0.35s ease, opacity 0.35s', opacity: away ? 0.3 : 1 }}
            role="button"
            aria-label={away ? 'Duck that swam away. Tap to bring it back' : 'Duck. Tap to make it swim away'}
            data-nopan
          >
            <ellipse cx={x} cy={y + 30} rx={34} ry={8} fill="#8cc3d4" />
            <Thing kind="duck" x={x} y={y} size={78} />
            {away && (
              <g stroke={C.red} strokeWidth={5} strokeLinecap="round">
                <path d={`M${x - 22},${y - 22} L${x + 22},${y + 22}`} />
              </g>
            )}
          </g>
        );
      })}

      {/* Tally card */}
      <rect x={734} y={126} width={220} height={276} rx={14} fill={shade(C.paper, -0.12)} />
      <rect x={730} y={120} width={220} height={276} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      {[
        { label: 'Start', value: start, y: 168, color: C.ink },
        { label: 'Swam away', value: gone.length, y: 228, color: C.red },
      ].map((r) => (
        <g key={r.label}>
          <text x={752} y={r.y} dominantBaseline="central" fontSize={17} fill={C.ink2} className="caps">
            {r.label}
          </text>
          <text x={928} y={r.y} textAnchor="end" dominantBaseline="central" fontSize={34} fontWeight={700} fill={r.color} className="num">
            {r.value}
          </text>
        </g>
      ))}
      <line x1={750} y1={268} x2={930} y2={268} stroke={C.ink} strokeWidth={2} />
      <text x={752} y={326} dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink} className="caps">
        Left
      </text>
      <text x={928} y={326} textAnchor="end" dominantBaseline="central" fontSize={58} fontWeight={700} fill={C.teal} className="num">
        {left}
      </text>

      <text x={840} y={448} textAnchor="middle" fontSize={38} fontWeight={700} fill={C.ink} className="num">
        {start} − <tspan fill={C.red}>{gone.length}</tspan> = <tspan fill={C.teal}>{left}</tspan>
      </text>

      <SvgButton x={730} y={486} w={64} label="−" title="One duck less" onClick={() => setCount(start - 1)} disabled={start <= 1} />
      <text x={840} y={514} textAnchor="middle" dominantBaseline="central" fontSize={15} fill={C.muted} className="caps">
        Ducks
      </text>
      <SvgButton x={886} y={486} w={64} label="+" title="One more duck" onClick={() => setCount(start + 1)} disabled={start >= 10} color={C.yellow} />
      <SvgButton x={730} y={568} w={220} h={52} fontSize={18} label="Bring them back" onClick={() => { setGone([]); play('pop'); }} disabled={gone.length === 0} />

      <Callout at={[duckSpot(0)[0] - 4, duckSpot(0)[1] - 38]} box={[40, 26]} w={270} icon={Hand} title="Tap to take away" text="Tap a duck to make it swim away. Tap it again to bring it back." />
      <Callout at={[730, 326]} box={[400, 548]} w={270} icon={Hash} title="How many are left?" text="Count the ducks still on the pond." />
    </SceneSvg>
  );
}

const VERBS: Partial<Record<ThingKind, [string, string]>> = {
  duck: ['swims away', 'swim away'],
  fish: ['swims away', 'swim away'],
  bug: ['flies away', 'fly away'],
  cookie: ['is eaten', 'are eaten'],
  apple: ['is eaten', 'are eaten'],
  ball: ['rolls away', 'roll away'],
  flower: ['is picked', 'are picked'],
  star: ['fades away', 'fade away'],
};

/** Objects in rows of five, with the last `away` crossed out. */
function TakeAwayPicture({ kind, start, away }: { kind: ThingKind; start: number; away: number }) {
  const size = 50;
  const gap = 12;
  const step = size + gap;
  const cols = Math.min(5, start);
  const rows = Math.ceil(start / 5);
  return (
    <svg viewBox={`-8 -8 ${cols * step - gap + 16} ${rows * step - gap + 16}`} role="img" aria-label={`${start} ${thingName(kind, start)}, ${away} taken away`}>
      {Array.from({ length: start }, (_, i) => {
        const x = (i % 5) * step + size / 2;
        const y = Math.floor(i / 5) * step + size / 2;
        const crossed = i >= start - away;
        return (
          <g key={i}>
            <Thing kind={kind} x={x} y={y} size={size} faded={crossed} />
            {crossed && <path d={`M${x - 20},${y - 20} L${x + 20},${y + 20}`} stroke={C.red} strokeWidth={5} strokeLinecap="round" />}
          </g>
        );
      })}
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={56} rx={52} ry={18} fill="#bfe0ea" stroke={C.ink} strokeWidth={1.5} />
      <Thing kind="duck" x={36} y={44} size={34} />
      <Thing kind="duck" x={66} y={44} size={34} />
      <g opacity={0.35}>
        <Thing kind="duck" x={96} y={34} size={30} />
      </g>
      <path d="M86,24 L106,44" stroke={C.red} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = pick<ThingKind>(['duck', 'fish', 'bug', 'cookie', 'apple', 'ball', 'flower']);
  const [lo, hi] = [[2, 5], [4, 8], [5, 10]][Math.min(level, 2)];
  const start = rand(lo, hi);
  const maxAway = level === 0 ? Math.min(2, start - 1) : level === 1 ? Math.min(4, start - 1) : start;
  const away = rand(1, maxAway);
  const left = start - away;
  const verb = (VERBS[kind] ?? ['goes away', 'go away'])[away === 1 ? 0 : 1];
  const opts = choices(numberChoices(left, { count: level === 0 ? 3 : 4, min: 0, max: 10 }));
  const explain = [
    `Start with ${start} ${thingName(kind, start)}.`,
    `Cross out the ${away} that ${away === 1 ? 'goes' : 'go'} away.`,
    left === 0 ? 'Count the rest: there are none left. That is 0.' : `Count the ones left: ${countList(1, left)}.`,
    `${start} − ${away} = ${left}.`,
  ];

  if (level === 2) {
    return {
      prompt: `${start} − ${away} = ?`,
      visual: <TakeAwayPicture kind={kind} start={start} away={away} />,
      choices: opts,
      answer: String(left),
      hint: 'Cross out the ones taken away, then count what’s left.',
      explain,
    };
  }
  return {
    prompt: `${start} ${thingName(kind, start)}. ${away} ${verb}. How many are left?`,
    visual: <TakeAwayPicture kind={kind} start={start} away={away} />,
    choices: opts,
    answer: String(left),
    hint: 'Count only the ones that are not crossed out.',
    explain,
  };
}

export const takeAway: Lesson = {
  id: 'take-away',
  title: 'Take Away',
  Thumb,
  Scene: TakeAwayScene,
  sceneHint: 'Tap a duck to make it swim away',
  learn: {
    heading: 'Taking away',
    intro: 'Taking away means some things leave the group. Then we count how many are left. The − sign means take away.',
    points: [
      { icon: Hand, text: 'Start with the whole group.' },
      { icon: Minus, text: 'Take some away.' },
      { icon: Hash, text: 'Count how many are left.' },
    ],
  },
  steps: [
    'Count how many there are at the start.',
    'Take away some (cross them out or move them).',
    'Count the ones that are left.',
    'That number is the answer!',
  ],
  example: {
    question: '6 ducks are on the pond. 2 swim away. How many are left?',
    visual: <TakeAwayPicture kind="duck" start={6} away={2} />,
    work: ['Start with 6 ducks.', 'Cross out the 2 that swim away.', 'Count the rest: 1, 2, 3, 4.'],
    answer: '6 − 2 = 4 ducks are left.',
  },
  grownups: [
    'Tell little story problems with toys: 5 cars in the garage, 1 drives away. How many now?',
    'Taking away with real objects comes before writing number sentences like 5 − 1 = 4.',
    'Counting back (5… 4) is a good next step once children can take away and count.',
    'Try “undo”: put the ducks back and you get the start number again — that shows how adding and taking away are linked.',
  ],
  makeQuestion,
};
