import { useRef, useState } from 'react';
import { Globe, Moon, RotateCcw, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { useFrame } from './visuals/anim';
import { byLevel, mcq } from './q';

const SUN = { x: 170, y: 340, r: 100 };
const EARTH = { x: 640, y: 340, r: 170 };
const SPIN_SECONDS = 6;

/** -180..180 */
const norm = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Looking down on the North Pole with the Sun to the left. The house sits at screen angle φ;
 * it faces the Sun at φ = 180°. The Earth spins anticlockwise (φ decreasing), so the house
 * meets sunrise at the top and sunset at the bottom.
 */
export function partOfDay(phi: number): { label: 'Day' | 'Night' | 'Sunrise' | 'Sunset'; hour: number } {
  const d = norm(phi - 180);
  const hour = (((12 - d / 15) % 24) + 24) % 24;
  const a = Math.abs(d);
  const label = a < 70 ? 'Day' : a > 110 ? 'Night' : d > 0 ? 'Sunrise' : 'Sunset';
  return { label, hour };
}

function clockText(hour: number) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 6) * 10;
  const hh = (m === 60 ? h + 1 : h) % 24;
  const mm = m === 60 ? 0 : m;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
}

const STARS = Array.from({ length: 40 }, (_, i) => ({ x: 50 + ((i * 197) % 900), y: 60 + ((i * 113) % 560), r: 1 + (i % 3) * 0.6 }));

function DayNightScene() {
  const [theta, setTheta] = useState(-30);
  const [days, setDays] = useState(0);
  const spin = useRef<{ left: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const drag = useRef<{ a0: number; t0: number } | null>(null);
  // Predict → observe → explain: after one whole spin, what time will it be at the house?
  const [guess, setGuess] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<{ before: string } | null>(null);
  const spinStart = useRef<string | null>(null);

  const angleOf = (p: { x: number; y: number }) => (Math.atan2(p.y - EARTH.y, p.x - EARTH.x) * 180) / Math.PI;
  const turn = useSvgDrag(
    (p) => {
      if (!drag.current) return;
      setTheta(drag.current.t0 + norm(angleOf(p) - drag.current.a0));
    },
    {
      onStart: (p) => {
        spin.current = null;
        spinStart.current = null;
        // The guess was about where the house started, so moving it means guessing again.
        setGuess(null);
        setSpinResult(null);
        setSpinning(false);
        drag.current = { a0: angleOf(p), t0: theta };
      },
      onEnd: () => {
        drag.current = null;
      },
    },
  );

  useFrame((dt) => {
    if (!spin.current) return;
    const step = Math.min(spin.current.left, (360 / SPIN_SECONDS) * dt);
    spin.current.left -= step;
    setTheta((t) => t - step);
    if (spin.current.left <= 0) {
      spin.current = null;
      setSpinning(false);
      setDays((d) => d + 1);
      if (spinStart.current) setSpinResult({ before: spinStart.current });
      spinStart.current = null;
      play('pop');
    }
  });

  const phi = theta + 180;
  const { label, hour } = partOfDay(phi);
  const rad = (phi * Math.PI) / 180;
  const hx = EARTH.x + Math.cos(rad) * (EARTH.r + 2);
  const hy = EARTH.y + Math.sin(rad) * (EARTH.r + 2);

  return (
    <SceneSvg label={`It is ${label.toLowerCase()} at the house, about ${clockText(hour)}`}>
      <rect x={30} y={40} width={940} height={600} rx={30} fill="#1e2b4a" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.7} />
      ))}

      {/* Sunlight */}
      {[-120, -60, 0, 60, 120].map((dy) => (
        <line key={dy} x1={SUN.x + SUN.r} y1={SUN.y + dy * 0.5} x2={EARTH.x - EARTH.r + 20} y2={EARTH.y + dy} stroke={C.yellow} strokeWidth={3} opacity={0.35} strokeDasharray="10 10" />
      ))}
      <g>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={SUN.x + Math.cos(a) * (SUN.r + 10)} y1={SUN.y + Math.sin(a) * (SUN.r + 10)} x2={SUN.x + Math.cos(a) * (SUN.r + 30)} y2={SUN.y + Math.sin(a) * (SUN.r + 30)} stroke={C.yellow} strokeWidth={6} strokeLinecap="round" />;
        })}
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={C.yellow} stroke={C.orange} strokeWidth={4} />
        <text x={SUN.x} y={SUN.y + 8} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.ink}>
          Sun
        </text>
      </g>

      {/* Earth (drag to spin) */}
      <defs>
        <clipPath id="sparks-earth">
          <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} />
        </clipPath>
      </defs>
      <g {...turn}>
        <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill={C.blue} stroke={C.white} strokeWidth={3} />
        <g clipPath="url(#sparks-earth)">
          <g transform={`rotate(${theta} ${EARTH.x} ${EARTH.y})`} fill={C.green} stroke="#2f7a50" strokeWidth={2}>
            <path d={`M${EARTH.x - 120},${EARTH.y - 40} c30,-60 90,-50 100,-10 c10,40 -40,50 -60,80 c-20,30 -60,10 -50,-20 c4,-14 -6,-30 10,-50 z`} />
            <path d={`M${EARTH.x + 40},${EARTH.y + 30} c40,-20 90,0 80,40 c-8,30 -50,50 -80,40 c-30,-10 -30,-60 0,-80 z`} />
            <path d={`M${EARTH.x + 20},${EARTH.y - 140} c30,-10 70,0 70,20 c0,20 -40,30 -60,20 c-20,-8 -30,-30 -10,-40 z`} />
            <circle cx={EARTH.x} cy={EARTH.y} r={26} fill="#eef6ff" stroke="#c9dbee" />
          </g>
          {/* Night: the half facing away from the Sun */}
          <path d={`M${EARTH.x},${EARTH.y - EARTH.r - 2} A${EARTH.r + 2},${EARTH.r + 2} 0 0 1 ${EARTH.x},${EARTH.y + EARTH.r + 2} Z`} fill="#0a0f23" opacity={0.6} />
        </g>
        <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r + 30} fill="transparent" />
      </g>
      <text x={EARTH.x} y={EARTH.y + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink2}>
        N
      </text>
      <text x={EARTH.x} y={EARTH.y + EARTH.r + 34} textAnchor="middle" fontSize={14} fill="#c9dbee">
        Looking down on the North Pole (N)
      </text>

      {/* The house */}
      <g transform={`translate(${hx} ${hy}) rotate(${phi + 90})`}>
        <rect x={-16} y={-26} width={32} height={26} fill={C.red} stroke={C.ink} strokeWidth={2} />
        <path d="M-22,-24 L0,-44 L22,-24 Z" fill={C.orange} stroke={C.ink} strokeWidth={2} />
        <rect x={-5} y={-14} width={10} height={14} fill={C.ink} />
      </g>

      {/* What time is it at the house? */}
      <rect x={826} y={60} width={130} height={110} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={891} y={95} textAnchor="middle" fontSize={22} fontWeight={700} fill={label === 'Night' ? C.purple : label === 'Day' ? C.orange : C.pink}>
        {label}
      </text>
      <text x={891} y={128} textAnchor="middle" fontSize={18} fill={C.ink} className="num">
        {clockText(hour)}
      </text>
      <text x={891} y={155} textAnchor="middle" fontSize={12} fill={C.muted}>
        at the house
      </text>

      <SvgButton x={760} y={556} w={190} h={56} fontSize={18} label={spinning ? 'Spinning…' : 'Spin one day'} color={C.yellow} disabled={spinning} onClick={() => { spin.current = { left: 360 }; spinStart.current = label; setSpinResult(null); setSpinning(true); play('whoosh'); }} />
      <text x={60} y={600} fontSize={18} fill="#fff" fontWeight={600}>
        Days: {days}
      </text>
      <text x={60} y={624} fontSize={13} fill="#c9dbee">
        One spin of the Earth = one day
      </text>

      {/* Predict → observe → explain */}
      {spinResult ? (
        <ExplainCard
          x={44}
          y={52}
          w={400}
          prediction={guess}
          actual={spinResult.before}
          because="One spin takes one day, so the house comes back to the same place."
          onAgain={() => {
            setSpinResult(null);
            setGuess(null);
          }}
        />
      ) : (
        <PredictCard
          x={44}
          y={52}
          w={400}
          question={`${label} now. After one spin?`}
          options={label === 'Day' ? ['Day', 'Night'] : label === 'Night' ? ['Night', 'Day'] : [label, label === 'Sunrise' ? 'Sunset' : 'Sunrise']}
          prediction={guess}
          onPredict={setGuess}
        />
      )}

      <Callout at={[EARTH.x - EARTH.r + 30, EARTH.y - 60]} box={[300, 560]} w={220} icon={Sun} title="Day side" text="The half facing the Sun has daytime." />
      <Callout at={[EARTH.x + EARTH.r - 30, EARTH.y + 80]} box={[640, 560]} w={200} icon={Moon} title="Night side" text="The half facing away is dark." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={2} y={4} width={116} height={72} rx={10} fill="#1e2b4a" />
      <circle cx={24} cy={40} r={14} fill={C.yellow} />
      <circle cx={80} cy={40} r={24} fill={C.blue} />
      <path d="M80,16 A24,24 0 0 1 80,64 Z" fill="#0a0f23" opacity={0.6} />
      <path d="M64,30 c6,-8 16,-6 16,2 c0,8 -10,10 -14,6 z" fill={C.green} />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

function facingSun(): Question {
  return mcq({
    prompt: 'Is it day or night on the side of the Earth facing the Sun?',
    answer: 'Day',
    wrong: ['Night'],
    hint: 'Spin the Earth on the playground. Where is it light?',
    explain: ['The Sun shines on the half of the Earth that faces it.', 'That half is light, so it is day.'],
  });
}

function daylight(): Question {
  return mcq({
    prompt: 'What gives us daylight?',
    answer: 'The Sun',
    wrong: ['The Moon', 'The clouds'],
    hint: 'What is shining on the Earth in the playground?',
    explain: ['The Sun is a giant, glowing star.', 'Its light shines on the Earth: daylight comes from the Sun.'],
  });
}

function whyDayNight(): Question {
  return mcq({
    prompt: 'Why do we have day and night?',
    answer: 'The Earth spins',
    wrong: ['The Sun switches off', 'Clouds cover the Sun'],
    hint: 'What happens to the house when you turn the Earth?',
    explain: ['The Sun keeps shining all the time.', 'The Earth spins, so your home turns towards the Sun (day) and away from it (night).'],
  });
}

function oneSpin(): Question {
  return mcq({
    prompt: 'How long does the Earth take to spin around once?',
    answer: 'One day',
    wrong: ['One hour', 'One year'],
    hint: 'Press “Spin one day” on the playground.',
    explain: ['From one sunrise to the next, the Earth turns all the way round.', 'One full spin takes one day.'],
  });
}

function otherSide(): Question {
  return mcq({
    prompt: 'When it is daytime where you live, the far side of the Earth has…',
    answer: 'Night',
    wrong: ['Daytime too', 'Sunrise everywhere'],
    hint: 'Only half of the Earth faces the Sun at a time.',
    explain: ['Your side is facing the Sun.', 'The far side faces away from the Sun, so it has night.'],
  });
}

function hours(): Question {
  return mcq({
    prompt: 'About how many hours does one spin of the Earth take?',
    answer: '24',
    wrong: ['12', '7'],
    hint: 'How many hours are there in a whole day and night?',
    explain: ['One spin = one whole day and night.', 'A day and night together is 24 hours.'],
  });
}

function sunrise(): Question {
  return mcq({
    prompt: 'Each morning the Sun seems to rise in the…',
    answer: 'East',
    wrong: ['West', 'North'],
    hint: 'Sunrise is east, sunset is west.',
    explain: ['The Earth spins towards the east.', 'So the Sun first appears on the east side of the sky: it rises in the east.'],
  });
}

function sunMoves(): Question {
  return mcq({
    prompt: 'Does the Sun go around the Earth every day?',
    answer: 'No, the Earth spins',
    wrong: ['Yes, it goes around us', 'Yes, it hides at night'],
    hint: 'In the playground, which one turns: the Sun or the Earth?',
    explain: ['The Sun only looks like it moves across the sky.', 'Really, no, the Earth spins and carries us round.'],
  });
}

export const dayAndNight: Lesson = {
  id: 'day-and-night',
  title: 'Day and Night',
  Thumb,
  Scene: DayNightScene,
  sceneHint: 'Guess first · Spin the Earth one whole day · Watch the little house go from day to night',
  learn: {
    heading: 'Day and night',
    intro: 'The Sun is always shining. The Earth spins around once every day. When your home faces the Sun it is daytime, and when it turns away it is night.',
    points: [
      { icon: Sun, text: 'The side of the Earth facing the Sun has day.' },
      { icon: Moon, text: 'The side facing away from the Sun has night.' },
      { icon: RotateCcw, text: 'The Earth spins once a day: about 24 hours.' },
      { icon: Globe, text: 'The Sun doesn’t go around us. We spin!' },
    ],
  },
  steps: [
    'Find the Sun and the Earth.',
    'Find where you live on the Earth (the little house).',
    'Is the house facing the Sun? Then it is day.',
    'Spin the Earth: the house turns into night, then back to day.',
    'Guess: after one whole spin, will it be day or night at the house? Then spin and see.',
  ],
  example: {
    question: 'It is 12 o’clock in the day at the house. Where is the house?',
    work: ['Midday is the middle of the day.', 'At midday the house faces the Sun straight on.'],
    answer: 'On the side facing the Sun.',
  },
  grownups: [
    'Use a lamp and an orange in a dark room. Stick a sticker on the orange for “home” and spin it slowly.',
    'Notice where the Sun is in the morning and evening from the same window.',
    'Talk about friends or family in other countries who are asleep when you are awake.',
  ],
  makeQuestion: (level) => byLevel(level, [[facingSun, daylight], [whyDayNight, oneSpin, otherSide], [hours, sunrise, sunMoves, whyDayNight]]),
};
