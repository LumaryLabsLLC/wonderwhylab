import { useEffect, useRef, useState } from 'react';
import { Clock, Footprints, Timer } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { ClockFace, digital } from '../builders/visuals/Clock';

/** Times are minutes after 12:00 on a 12-hour clock (0–719). */
const DAY = 720;
const MAX_DUR = 360;
const TL = { x: 70, y: 548, w: 860 };

const hm = (t: number) => {
  const m = ((t % DAY) + DAY) % DAY;
  return { h: Math.floor(m / 60), m: m % 60 };
};
const show = (t: number) => {
  const { h, m } = hm(t);
  return digital(h, m);
};

/** "2 h 25 min", "45 min", "3 h". */
function durText(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

interface Hop {
  from: number;
  to: number;
  label: string;
}

/** Hop whole hours first, then the minutes left over. */
function hopsFor(start: number, dur: number): Hop[] {
  const hops: Hop[] = [];
  let t = start;
  for (let i = 0; i < Math.floor(dur / 60); i++) {
    hops.push({ from: t, to: t + 60, label: '+1 h' });
    t += 60;
  }
  const rest = dur % 60;
  if (rest) hops.push({ from: t, to: t + rest, label: `+${rest} min` });
  return hops;
}

function TimeScene() {
  const [start, setStart] = useState(2 * 60 + 15);
  const [dur, setDur] = useState(2 * 60 + 25);
  const [shown, setShown] = useState(99);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const end = start + dur;
  const hops = hopsFor(start, dur);
  const scale = TL.w / MAX_DUR;
  const X = (t: number) => TL.x + (t - start) * scale;

  const moveStart = (by: number) => {
    setStart((s) => (((s + by) % DAY) + DAY) % DAY);
    setShown(99);
    play('tap');
  };
  const moveEnd = (by: number) => {
    setDur((d) => clamp(d + by, 5, MAX_DUR));
    setShown(99);
    play('tap');
  };

  const drag = useSvgDrag((p) => {
    const d = clamp(Math.round((p.x - TL.x) / scale / 5) * 5, 5, MAX_DUR);
    if (d !== dur) {
      setDur(d);
      setShown(99);
    }
  });

  const hop = () => {
    window.clearInterval(timer.current);
    setShown(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setShown(i);
      play('pop');
      if (i >= hops.length) window.clearInterval(timer.current);
    }, 650);
  };

  const s = hm(start);
  const e = hm(end);

  return (
    <SceneSvg label={`From ${show(start)} to ${show(end)} is ${durText(dur)}`}>
      {/* the two clocks */}
      <ClockFace cx={165} cy={190} r={104} hours={s.h} minutes={s.m} rim={C.green} />
      <ClockFace cx={495} cy={190} r={104} hours={e.h} minutes={e.m} rim={C.red} />
      <text x={165} y={346} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">Start</text>
      <text x={165} y={382} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.ink} className="num">{show(start)}</text>
      <text x={495} y={346} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">End</text>
      <text x={495} y={382} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.ink} className="num">{show(end)}</text>
      <path d="M296,190 h66 l-14,-12 m14,12 l-14,12" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />

      {/* readout and controls */}
      <rect x={704} y={46} width={270} height={104} rx={14} fill={C.ink} opacity={0.1} />
      <rect x={700} y={40} width={270} height={104} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={835} y={84} textAnchor="middle" dominantBaseline="central" fontSize={durText(dur).length > 8 ? 36 : 44} fontWeight={700} fill={C.ink} className="num">
        {durText(dur)}
      </text>
      <text x={835} y={126} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        time taken
      </text>
      {[
        { label: 'Start', move: moveStart },
        { label: 'End', move: moveEnd },
      ].map((row, i) => (
        <g key={row.label}>
          <text x={700} y={186 + i * 92} fontSize={15} fill={C.muted} className="caps">{row.label}</text>
          {[
            ['−1 h', -60],
            ['+1 h', 60],
            ['−5', -5],
            ['+5', 5],
          ].map(([label, by], j) => (
            <SvgButton key={label} x={700 + j * 68} y={196 + i * 92} w={62} h={48} fontSize={17} label={label} title={`${row.label} ${label}`} onClick={() => row.move(by as number)} color={j % 2 ? C.yellow : C.card} />
          ))}
        </g>
      ))}
      <SvgButton x={700} y={392} w={270} h={52} fontSize={19} label="Hop along the line" onClick={hop} color={C.teal} textColor={C.white} />

      {/* the timeline */}
      <line x1={TL.x} y1={TL.y} x2={TL.x + TL.w} y2={TL.y} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: MAX_DUR / 60 + 2 }, (_, i) => {
        const t = Math.ceil(start / 60) * 60 + i * 60;
        if (t - start > MAX_DUR) return null;
        return (
          <g key={t}>
            <line x1={X(t)} y1={TL.y - 10} x2={X(t)} y2={TL.y + 10} stroke={C.ink} strokeWidth={2} />
            <text x={X(t)} y={TL.y + 32} textAnchor="middle" fontSize={16} fill={C.ink2} className="num">{show(t)}</text>
          </g>
        );
      })}
      <circle cx={X(start)} cy={TL.y} r={9} fill={C.green} stroke={C.ink} strokeWidth={2} />
      {hops.slice(0, shown).map((h, i) => {
        const x1 = X(h.from);
        const x2 = X(h.to);
        const mid = (x1 + x2) / 2;
        const lift = Math.min(70, 18 + (x2 - x1) * 0.4);
        return (
          <g key={i} className="fade-up">
            <path d={`M${x1},${TL.y - 6} Q${mid},${TL.y - lift * 2} ${x2},${TL.y - 6}`} fill="none" stroke={h.label === '+1 h' ? C.blue : C.orange} strokeWidth={3.5} strokeLinecap="round" />
            <text x={mid} y={TL.y - lift - 12} textAnchor="middle" fontSize={16} fontWeight={700} fill={shade(h.label === '+1 h' ? C.blue : C.orange, -0.3)} className="num">
              {h.label}
            </text>
          </g>
        );
      })}
      {/* draggable end marker */}
      <g {...drag}>
        <rect x={X(end) - 24} y={TL.y - 30} width={48} height={60} fill="transparent" />
        <path d={`M${X(end)},${TL.y - 4} l-14,-24 h28 z`} fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        <circle cx={X(end)} cy={TL.y} r={9} fill={C.red} stroke={C.ink} strokeWidth={2} />
      </g>
      <text x={TL.x} y={TL.y + 74} fontSize={19} fill={C.ink} className="num">
        {[show(start), ...hops.map((h) => show(h.to))].join(' → ')}
        <tspan fontWeight={700}> = {durText(dur)}</tspan>
      </text>

      <Callout at={[X(end), TL.y - 20]} box={[300, 400]} w={260} icon={Footprints} title="Hop the hours first" text="Jump a whole hour at a time, then count on the minutes that are left." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(28 34) scale(0.2)">
        <ClockFace cx={0} cy={0} r={100} hours={2} minutes={15} rim={C.green} />
      </g>
      <g transform="translate(92 34) scale(0.2)">
        <ClockFace cx={0} cy={0} r={100} hours={4} minutes={40} rim={C.red} />
      </g>
      <path d="M52,34 h14 l-4,-4 m4,4 l-4,4" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      <text x={60} y={72} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>
        2 h 25 min
      </text>
    </svg>
  );
}

/** Start and end clocks side by side, for question cards. */
function ClocksPicture({ start, end, hideEnd = false }: { start: number; end: number; hideEnd?: boolean }) {
  const s = hm(start);
  const e = hm(end);
  return (
    <svg viewBox="-120 -120 640 250" role="img" aria-label={`Start ${show(start)}${hideEnd ? '' : `, end ${show(end)}`}`}>
      <ClockFace cx={0} cy={0} r={100} hours={s.h} minutes={s.m} rim={C.green} />
      <path d="M140,0 h120 l-16,-14 m16,14 l-16,14" fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      {hideEnd ? (
        <text x={400} y={0} textAnchor="middle" dominantBaseline="central" fontSize={120} fontWeight={700} fill={C.muted}>
          ?
        </text>
      ) : (
        <ClockFace cx={400} cy={0} r={100} hours={e.h} minutes={e.m} rim={C.red} />
      )}
    </svg>
  );
}

/** Worked steps: hop to the next o'clock, then whole hours, then the minutes left. */
function countOnSteps(start: number, dur: number): string[] {
  const steps = [`Start at ${show(start)}.`];
  const toHour = (60 - (start % 60)) % 60;
  if (toHour && toHour < dur) {
    const hours = Math.floor((dur - toHour) / 60);
    const rest = dur - toHour - hours * 60;
    steps.push(`Hop ${toHour} min to ${show(start + toHour)}.`);
    if (hours) steps.push(`Hop ${hours} h to ${show(start + toHour + hours * 60)}${rest ? `, then ${rest} min to ${show(start + dur)}` : ''}.`);
    else if (rest) steps.push(`Hop ${rest} more min to ${show(start + dur)}.`);
    return steps;
  }
  const hours = Math.floor(dur / 60);
  const rest = dur % 60;
  if (hours) steps.push(`Hop ${hours} h to ${show(start + hours * 60)}.`);
  if (rest) steps.push(`Count on ${rest} min to ${show(start + dur)}.`);
  return steps;
}

/** Level 0: whole hours. */
function wholeHours(): Question {
  const start = rand(1, 8) * 60;
  const n = rand(1, 3);
  const word = (k: number) => `${k} ${k === 1 ? 'hour' : 'hours'}`;
  const answer = word(n);
  const opts = new Set([n, n + 1, n === 1 ? 3 : n - 1, n + 2]);
  return {
    prompt: `It starts at ${show(start)} and ends at ${show(start + n * 60)}. How long is that?`,
    visual: <ClocksPicture start={start} end={start + n * 60} />,
    choices: shuffle([...opts].slice(0, 4)).map((k) => ({ value: word(k) })),
    answer,
    hint: 'Count the hours from the start time, one hop at a time.',
    explain: [`Start at ${show(start)}.`, `Count on: ${Array.from({ length: n }, (_, i) => show(start + (i + 1) * 60)).join(', ')}.`, `That is ${answer}.`],
  };
}

/** Level 1: minutes inside one hour (number pad). */
function minutesWithin(): Question {
  const h = rand(1, 10);
  const m1 = rand(0, 7) * 5;
  const m2 = rand(m1 / 5 + 2, 11) * 5;
  const start = h * 60 + m1;
  const dur = m2 - m1;
  return {
    prompt: `From ${show(start)} to ${show(start + dur)}. How many minutes is that?`,
    visual: <ClocksPicture start={start} end={start + dur} />,
    answer: String(dur),
    hint: 'The hour stays the same. Count on from the first minutes to the second.',
    explain: [`Both times are in the same hour.`, `Count on from ${m1} minutes to ${m2} minutes: ${m2} − ${m1} = ${dur}.`, `It takes ${dur} minutes.`],
  };
}

/** Level 1: when does it finish? */
function endTime(): Question {
  const start = rand(1, 9) * 60 + rand(0, 11) * 5;
  const dur = pick([15, 30, 45, 60, 75, 90]);
  const answer = show(start + dur);
  const wrong = new Set<string>();
  for (const t of shuffle([start + dur + 15, start + dur - 15, start + dur + 60, start + dur - 60, start + dur + 30])) {
    const label = show(t);
    if (label !== answer && t > start) wrong.add(label);
  }
  return {
    prompt: `A film starts at ${show(start)} and lasts ${durText(dur)}. When does it end?`,
    visual: <ClocksPicture start={start} end={start + dur} hideEnd />,
    choices: shuffle([answer, ...[...wrong].slice(0, 3)]).map((value) => ({ value })),
    answer,
    hint: 'Hop to the next o’clock first, then count on what is left.',
    explain: countOnSteps(start, dur).slice(0, 3).concat(`It ends at ${answer}.`).slice(-4),
  };
}

/** Level 2: hours and minutes, crossing o'clock. */
function howLong(): Question {
  const start = rand(1, 8) * 60 + rand(5, 11) * 5;
  const dur = rand(1, 3) * 60 + rand(1, 11) * 5;
  const end = start + dur;
  const answer = durText(dur);
  const s = hm(start);
  const e = hm(end);
  // The common mistake: subtract the hours and the minutes separately.
  const naive = (((e.h - s.h + 12) % 12) || 12) * 60 + Math.abs(e.m - s.m);
  const wrong = new Set<string>();
  for (const d of shuffle([naive, dur + 10, dur - 10, dur + 60, dur - 60, dur + 20])) {
    if (d > 0 && d !== dur) wrong.add(durText(d));
  }
  wrong.delete(answer);
  const steps = countOnSteps(start, dur);
  return {
    prompt: `From ${show(start)} to ${show(end)}. How long is that?`,
    visual: <ClocksPicture start={start} end={end} />,
    choices: shuffle([answer, ...[...wrong].slice(0, 3)]).map((value) => ({ value })),
    answer,
    hint: 'Hop to the next o’clock, then whole hours, then the minutes left.',
    explain: [...steps.slice(0, 3), `Add the hops: ${answer}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return Math.random() < 0.7 ? wholeHours() : minutesWithin();
  if (level === 1) return Math.random() < 0.5 ? minutesWithin() : endTime();
  return Math.random() < 0.65 ? howLong() : endTime();
}

export const elapsedTime: Lesson = {
  id: 'elapsed-time',
  title: 'How Long?',
  Thumb,
  Scene: TimeScene,
  sceneHint: 'Change the start and end · Drag the red flag along the line',
  learn: {
    heading: 'How long does it take?',
    intro: 'To find how long something takes, count on from the start time to the end time. A timeline helps: hop the whole hours first, then the minutes.',
    points: [
      { icon: Clock, text: 'There are 60 minutes in 1 hour.' },
      { icon: Footprints, text: 'Hop to the next o’clock, then hop whole hours.' },
      { icon: Timer, text: 'Add up all the hops to get the time taken.' },
    ],
  },
  steps: [
    'Write down the start time and the end time.',
    'Hop from the start to the next o’clock.',
    'Hop whole hours until you are close to the end.',
    'Count on the minutes that are left, then add up all the hops.',
  ],
  example: {
    question: 'From 2:40 to 4:15, how long is that?',
    visual: <ClocksPicture start={2 * 60 + 40} end={4 * 60 + 15} />,
    work: ['Hop 20 min from 2:40 to 3:00.', 'Hop 1 h from 3:00 to 4:00.', 'Hop 15 min from 4:00 to 4:15.', '20 min + 1 h + 15 min = 1 h 35 min.'],
    answer: 'It takes 1 h 35 min.',
  },
  grownups: [
    'Ask real questions: “We left at 9:40 and got there at 11:05. How long was the trip?”',
    'Watch out for subtracting like ordinary numbers: 4:15 − 2:40 is not 1:75, because an hour is 60 minutes, not 100.',
    'A paper timeline with o’clock marks makes the hops easy to see.',
    'Bus and train timetables are great real-life practice.',
  ],
  makeQuestion,
};
