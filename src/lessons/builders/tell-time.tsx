import { useState } from 'react';
import { Clock3, MoveDiagonal, Timer, Watch } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { useSvgDrag } from '../../lib/svg';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { ClockFace, ClockPicture, digital, polar, timeWords } from './visuals/Clock';

const CX = 300;
const CY = 350;
const R = 210;
const wrap = (t: number) => ((t % 720) + 720) % 720;

/** Degrees clockwise from 12 o'clock. */
function angleOf(p: Pt) {
  const a = (Math.atan2(p.x - CX, -(p.y - CY)) * 180) / Math.PI;
  return a < 0 ? a + 360 : a;
}

function TimeScene() {
  // Minutes after 12:00, 0–719.
  const [t, setT] = useState(3 * 60);
  const [held, setHeld] = useState<'hour' | 'minute' | undefined>(undefined);
  const h = Math.floor(t / 60);
  const m = t % 60;

  const setTime = (nt: number) => {
    const w = wrap(nt);
    if (w === t) return;
    setT(w);
    play('tap');
  };

  const minuteDrag = useSvgDrag(
    (p) => {
      const nm = (Math.round(angleOf(p) / 30) * 5) % 60;
      let hour = h;
      if (m >= 45 && nm < 15) hour += 1;
      else if (m < 15 && nm >= 45) hour -= 1;
      setTime(hour * 60 + nm);
    },
    { onStart: () => setHeld('minute'), onEnd: () => setHeld(undefined) },
  );
  const hourDrag = useSvgDrag(
    (p) => {
      const nh = Math.round((angleOf(p) - m * 0.5) / 30);
      setTime(nh * 60 + m);
    },
    { onStart: () => setHeld('hour'), onEnd: () => setHeld(undefined) },
  );

  const hourTip = polar(CX, CY, R * 0.32, ((h % 12) + m / 60) * 30);
  const minuteTip = polar(CX, CY, R * 0.55, m * 6);
  const three = polar(CX, CY, R * 0.93, 90);

  return (
    <SceneSvg label={`A clock showing ${timeWords(h, m)}`}>
      <ClockFace cx={CX} cy={CY} r={R} hours={h} minutes={m} hourProps={hourDrag} minuteProps={minuteDrag} highlight={held} />

      {/* Digital readout */}
      <rect x={624} y={86} width={300} height={124} rx={16} fill={C.ink} opacity={0.12} />
      <rect x={620} y={80} width={300} height={124} rx={16} fill={C.ink} stroke={C.ink} strokeWidth={2} />
      <rect x={634} y={94} width={272} height={96} rx={10} fill={shade(C.teal, -0.55)} />
      <text x={770} y={144} textAnchor="middle" dominantBaseline="central" fontSize={66} fontWeight={700} fill={shade(C.teal, 0.55)} className="num">
        {digital(h, m)}
      </text>
      <text x={770} y={250} textAnchor="middle" fontSize={30} fontWeight={700} fill={C.ink}>
        {timeWords(h, m)}
      </text>

      <SvgButton x={620} y={286} w={142} h={56} fontSize={19} label="− 1 hour" onClick={() => setTime(t - 60)} />
      <SvgButton x={778} y={286} w={142} h={56} fontSize={19} label="+ 1 hour" onClick={() => setTime(t + 60)} color={C.yellow} />
      <SvgButton x={620} y={358} w={142} h={56} fontSize={19} label="− 15 min" onClick={() => setTime(t - 15)} />
      <SvgButton x={778} y={358} w={142} h={56} fontSize={19} label="+ 15 min" onClick={() => setTime(t + 15)} color={C.yellow} />
      <SvgButton
        x={620}
        y={430}
        w={300}
        h={56}
        fontSize={19}
        label="Say the time"
        color={C.teal}
        textColor={C.white}
        onClick={() => speak(`It is ${timeWords(h, m).replace('’', "'")}.`, { force: true })}
      />

      <Callout at={hourTip} box={[40, 26]} w={240} icon={Clock3} title="Short hand" text="Shows the hour. Drag it round!" />
      <Callout at={minuteTip} box={[300, 26]} w={250} icon={Timer} title="Long hand" text="Shows the minutes. Drag it to 12, 3, 6 or 9." />
      <Callout
        at={three}
        box={[560, 520]}
        w={370}
        icon={MoveDiagonal}
        title="Long hand clues"
        text="On 12: o’clock. On 3: quarter past. On 6: half past. On 9: quarter to."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ClockFace cx={60} cy={40} r={28} hours={3} minutes={0} />
    </svg>
  );
}

const hourName = (h: number) => (h % 12 === 0 ? 12 : h % 12);

function wordChoices(answer: string, others: string[], count: number): Choice[] {
  const set = new Set<string>([answer]);
  for (const o of shuffle(others)) if (set.size < count && o !== answer) set.add(o);
  return shuffle([...set]).map((value) => ({ value }));
}

/** Where the long hand points, in words. */
const longHand: Record<number, string> = {
  0: 'The long hand is on 12, so it is o’clock.',
  15: 'The long hand is on 3, so it is quarter past.',
  30: 'The long hand is on 6, so it is half past.',
  45: 'The long hand is on 9, so it is quarter to the next hour.',
};

/** Worked steps for reading a clock at h:mins. */
function readSteps(h: number, mins: number, answer: string): string[] {
  const next = hourName(h + 1);
  const short = mins === 0 ? `The short hand points to ${h}.` : mins === 45 ? `The short hand is nearly at ${next}.` : `The short hand has just gone past ${h}.`;
  return [longHand[mins], short, `It is ${answer}.`];
}

function makeQuestion(level: number): Question {
  const h = rand(1, 12);
  const next = hourName(h + 1);
  const prev = hourName(h + 11);
  if (level === 0) {
    const ans = `${h} o’clock`;
    return {
      prompt: 'What time is it?',
      visual: <ClockPicture hours={h} minutes={0} />,
      choices: wordChoices(ans, [`${next} o’clock`, `${prev} o’clock`, `${hourName(h + 6)} o’clock`], 3),
      answer: ans,
      hint: 'Look at the long hand first. Then see where the short hand points.',
      explain: readSteps(h, 0, ans),
    };
  }
  if (level === 1) {
    if (Math.random() < 0.4) {
      const values = [digital(h, 30), digital(h + 1, 30), digital(h, 0)];
      return {
        prompt: `Which clock shows half past ${h}?`,
        choices: shuffle(values).map((v) => {
          const [hh, mm] = v.split(':').map(Number);
          return { value: v, name: timeWords(hh, mm), label: <ClockPicture hours={hh} minutes={mm} /> };
        }),
        answer: digital(h, 30),
        hint: 'Half past: where does the long hand point?',
        explain: ['Half past means the long hand points down to 6.', `The short hand is just past ${h}.`, `The right clock shows ${digital(h, 30)}, half past ${h}.`],
      };
    }
    const half = Math.random() < 0.7;
    const ans = half ? `half past ${h}` : `${h} o’clock`;
    return {
      prompt: 'What time is it?',
      visual: <ClockPicture hours={h} minutes={half ? 30 : 0} />,
      choices: wordChoices(ans, [`half past ${next}`, `half past ${prev}`, `${h} o’clock`, `half past ${h}`, `6 o’clock`, `${next} o’clock`], 4),
      answer: ans,
      hint: 'Look at the long hand first. Then find the hour the short hand has just gone past.',
      explain: readSteps(h, half ? 30 : 0, ans),
    };
  }
  const mins = pick([15, 45, 30, 15, 45]);
  if (Math.random() < 0.5) {
    const ans = timeWords(h, mins);
    return {
      prompt: 'What time is it?',
      visual: <ClockPicture hours={h} minutes={mins} />,
      choices: wordChoices(ans, [`quarter past ${h}`, `quarter to ${h}`, `quarter to ${next}`, `half past ${h}`, `quarter past ${next}`], 4),
      answer: ans,
      hint: 'Is the long hand on 3, 6 or 9? That tells you quarter past, half past or quarter to.',
      explain: readSteps(h, mins, ans),
    };
  }
  const ans = digital(h, mins);
  return {
    prompt: 'What does the clock say?',
    visual: <ClockPicture hours={h} minutes={mins} />,
    choices: wordChoices(ans, [digital(h, 60 - mins === mins ? 0 : 60 - mins), digital(h + 1, mins), digital(h, mins === 15 ? 3 : mins === 45 ? 9 : 6), digital(mins / 5, h * 5 % 60)], 4),
    answer: ans,
    hint: 'Count the minutes by 5s from 12 to the long hand: 5, 10, 15…',
    explain: [
      `Count by 5s from 12 to the long hand: ${Array.from({ length: mins / 5 }, (_, i) => (i + 1) * 5).join(', ')}. That is ${mins} minutes.`,
      `The short hand has just gone past ${h}.`,
      `The clock says ${ans}.`,
    ],
  };
}

export const tellTime: Lesson = {
  id: 'tell-time',
  title: 'Tell the Time',
  Thumb,
  Scene: TimeScene,
  sceneHint: 'Drag the clock hands · Try the buttons',
  learn: {
    heading: 'Reading a clock',
    intro: 'A clock has two hands. The short hand tells the hour. The long hand tells the minutes.',
    points: [
      { icon: Clock3, text: 'Short hand = hours. Long hand = minutes.' },
      { icon: Watch, text: 'Long hand on 12? It’s o’clock!' },
      { icon: Timer, text: 'Long hand on 6? It’s half past.' },
      { icon: MoveDiagonal, text: 'On 3 is quarter past, on 9 is quarter to.' },
    ],
  },
  steps: [
    'Find the long hand. Is it on 12, 3, 6 or 9?',
    'Find the short hand. Which number has it just passed?',
    'Put them together: “half past 4”.',
    'Check the hands move the right way — clockwise!',
  ],
  example: {
    question: 'What time is it?',
    visual: <ClockPicture hours={4} minutes={30} />,
    work: ['The long hand points to 6, so it is half past.', 'The short hand is between 4 and 5. It has just passed 4.', 'So it is half past 4, or 4:30.'],
    answer: 'Half past 4 (4:30)',
  },
  grownups: [
    'Point out the clock at routine moments: “It’s 7 o’clock — bath time!”',
    'At half past, the hour hand sits between two numbers. Children often read the next hour by mistake.',
    'Practise counting by 5s around the clock face to prepare for minutes past the hour.',
    'Pair the analog clock with a digital one so children see that 4:30 and “half past 4” are the same.',
  ],
  makeQuestion,
};
