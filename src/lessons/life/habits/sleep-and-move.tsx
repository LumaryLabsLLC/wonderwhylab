import { useState } from 'react';
import { Bike, Droplets, Moon, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Face, FEELING_FACE } from '../shared/Face';
import { Card, Emoji, EmojiLabel, EmojiRow, Lines, Tap } from '../shared/kit';

/** Children aged 6–12 need about 9–12 hours of sleep, and at least 60 minutes of active play a day. */
const SLEEP_MIN = 9;
const SLEEP_MAX = 12;
const MOVE_GOAL = 60;
const WATER_GOAL = 6;

const ACTIVITIES = [
  { emoji: '🚲', name: 'Ride a bike', short: 'Bike ride', verb: 'ride a bike', min: 20 },
  { emoji: '⚽', name: 'Play football', short: 'Football', verb: 'play football', min: 30 },
  { emoji: '💃', name: 'Dance', short: 'Dance', verb: 'dance', min: 10 },
  { emoji: '🏃', name: 'Play tag', short: 'Tag', verb: 'play tag', min: 15 },
  { emoji: '🛝', name: 'Playground', short: 'Park', verb: 'play at the playground', min: 20 },
  { emoji: '🚶', name: 'Walk to school', short: 'Walk', verb: 'walk to school', min: 10 },
];

const WHY = {
  sleep: 'Sleep helps your body grow and your brain remember what you learned.',
  move: 'Moving makes your heart, lungs and muscles strong, and it’s fun!',
  water: 'Water keeps your body cool and helps it work well.',
};

/** Minutes after midnight → "8:30 pm". */
function clock(m: number): string {
  const h24 = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}

const hoursText = (mins: number) => `${Math.floor(mins / 60)}${mins % 60 ? '½' : ''} hours`;

function Step({ x, y, label, onMinus, onPlus, value, minusOff, plusOff }: {
  x: number;
  y: number;
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusOff: boolean;
  plusOff: boolean;
}) {
  return (
    <g>
      <text x={x} y={y + 33} fontSize={18} fill={C.ink2}>
        {label}
      </text>
      <SvgButton x={x + 128} y={y} w={52} h={50} fontSize={24} label="−" disabled={minusOff} onClick={onMinus} />
      <text x={x + 260} y={y + 34} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>
        {value}
      </text>
      <SvgButton x={x + 340} y={y} w={52} h={50} fontSize={24} label="+" disabled={plusOff} onClick={onPlus} />
    </g>
  );
}

function HealthyDayScene() {
  const [bed, setBed] = useState(20 * 60); // 8:00 pm
  const [wake, setWake] = useState(7 * 60); // 7:00 am
  const [moves, setMoves] = useState<number[]>([]);
  const [cups, setCups] = useState(0);
  const [why, setWhy] = useState<keyof typeof WHY | null>(null);

  const sleep = 24 * 60 - bed + wake;
  const sleepOk = sleep >= SLEEP_MIN * 60 && sleep <= SLEEP_MAX * 60;
  const moveMin = moves.reduce((a, i) => a + ACTIVITIES[i].min, 0);
  const moveOk = moveMin >= MOVE_GOAL;
  const waterOk = cups >= WATER_GOAL;
  const allOk = sleepOk && moveOk && waterOk;

  const setTime = (which: 'bed' | 'wake', d: number) => {
    play('tap');
    setWhy('sleep');
    if (which === 'bed') setBed(bed + d);
    else setWake(wake + d);
  };

  const sleepMsg =
    sleep < SLEEP_MIN * 60
      ? 'A bit short. An earlier bedtime would help.'
      : sleep > SLEEP_MAX * 60
        ? 'Lots of sleep! 9 to 12 hours is usually enough.'
        : 'Just right for your age!';

  const slotW = 29;
  const barW = 400;
  const moveFrac = Math.min(1, moveMin / 90);

  return (
    <SceneSvg label="Plan a healthy day: sleep, moving and water">
      {/* Sleep */}
      <Card x={30} y={24} w={460} h={300}>
        <text x={50} y={58} fontSize={22} fontWeight={700} fill={C.ink}>
          😴 Sleep
        </text>
        <Step x={50} y={74} label="Bedtime" value={clock(bed)} onMinus={() => setTime('bed', -30)} onPlus={() => setTime('bed', 30)} minusOff={bed <= 18 * 60 + 30} plusOff={bed >= 22 * 60 + 30} />
        <Step x={50} y={136} label="Wake up" value={clock(wake)} onMinus={() => setTime('wake', -30)} onPlus={() => setTime('wake', 30)} minusOff={wake <= 5 * 60 + 30} plusOff={wake >= 9 * 60} />
        <text x={50} y={224} fontSize={20} fontWeight={700} fill={sleepOk ? C.green : C.ink}>
          {hoursText(sleep)} of sleep
        </text>
        <text x={470} y={224} textAnchor="end" fontSize={16} fill={sleepOk ? C.green : C.ink2}>
          {sleepMsg}
        </text>
        {Array.from({ length: 14 }, (_, i) => {
          const full = sleep >= (i + 1) * 60;
          const half = !full && sleep > i * 60;
          const inRange = i >= SLEEP_MIN - 1 && i < SLEEP_MAX;
          return (
            <g key={i}>
              <rect x={50 + i * slotW} y={238} width={slotW - 4} height={34} rx={6} fill={inRange ? shade(C.green, 0.8) : C.paper} stroke={C.line} strokeWidth={1.5} />
              {(full || half) && <rect x={50 + i * slotW} y={238} width={(slotW - 4) * (full ? 1 : 0.5)} height={34} rx={6} fill={C.purple} opacity={0.85} />}
            </g>
          );
        })}
        <rect x={50 + (SLEEP_MIN - 1) * slotW} y={276} width={(SLEEP_MAX - SLEEP_MIN + 1) * slotW - 4} height={5} rx={2.5} fill={C.green} />
        <text x={50 + (SLEEP_MIN - 1) * slotW} y={298} fontSize={15} fill={C.green}>
          9 to 12 hours
        </text>
        <text x={50} y={298} fontSize={15} fill={C.muted}>
          1 box = 1 hour
        </text>
      </Card>

      {/* Move */}
      <Card x={510} y={24} w={460} h={300}>
        <text x={530} y={58} fontSize={22} fontWeight={700} fill={C.ink}>
          🏃 Move
        </text>
        <text x={950} y={58} textAnchor="end" fontSize={15} fill={C.muted}>
          Tap what you did today
        </text>
        {ACTIVITIES.map((a, i) => {
          const x = 530 + (i % 3) * 146;
          const y = 74 + Math.floor(i / 3) * 76;
          const on = moves.includes(i);
          return (
            <Tap
              key={a.name}
              label={`${a.name}, ${a.min} minutes`}
              onTap={() => {
                play(on ? 'tap' : 'pop');
                setWhy('move');
                setMoves(on ? moves.filter((j) => j !== i) : [...moves, i]);
              }}
            >
              <rect x={x} y={y} width={136} height={66} rx={14} fill={on ? shade(C.orange, 0.65) : C.card} stroke={C.ink} strokeWidth={on ? 3 : 2} />
              <Emoji e={a.emoji} x={x + 28} y={y + 33} size={32} />
              <text x={x + 52} y={y + 28} fontSize={15} fontWeight={600} fill={C.ink}>
                {a.short}
              </text>
              <text x={x + 52} y={y + 50} fontSize={15} fill={C.ink2}>
                {a.min} min
              </text>
            </Tap>
          );
        })}
        <rect x={530} y={238} width={barW} height={30} rx={15} fill={C.paper} stroke={C.line} />
        <rect x={530} y={238} width={Math.max(0, barW * moveFrac)} height={30} rx={15} fill={moveOk ? C.green : C.orange} />
        <line x1={530 + (barW * MOVE_GOAL) / 90} x2={530 + (barW * MOVE_GOAL) / 90} y1={230} y2={276} stroke={C.ink} strokeWidth={3} />
        <text x={530 + (barW * MOVE_GOAL) / 90} y={296} textAnchor="middle" fontSize={15} fill={C.ink2}>
          60 min
        </text>
        <text x={530} y={296} fontSize={16} fontWeight={700} fill={moveOk ? C.green : C.ink}>
          {moveMin} minutes{moveOk ? ' ✓' : moveMin ? `, ${MOVE_GOAL - moveMin} more to go` : ''}
        </text>
      </Card>

      {/* Water */}
      <Card x={30} y={344} w={460} h={230}>
        <text x={50} y={378} fontSize={22} fontWeight={700} fill={C.ink}>
          💧 Water
        </text>
        <text x={470} y={378} textAnchor="end" fontSize={15} fill={C.muted}>
          Tap a cup when you drink
        </text>
        {Array.from({ length: 8 }, (_, i) => {
          const full = i < cups;
          const x = 52 + i * 54;
          return (
            <Tap
              key={i}
              label={`Cup ${i + 1}`}
              onTap={() => {
                play('pop');
                setWhy('water');
                setCups(cups === i + 1 ? i : i + 1);
              }}
            >
              <path d={`M${x},398 L${x + 48},398 L${x + 42},470 L${x + 6},470 Z`} fill={C.white} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
              {full && <path d={`M${x + 3},412 L${x + 45},412 L${x + 41},467 L${x + 7},467 Z`} fill="#5fb0ff" opacity={0.85} />}
              {i === WATER_GOAL - 1 && (
                <text x={x + 24} y={492} textAnchor="middle" fontSize={15} fill={C.ink2}>
                  goal
                </text>
              )}
            </Tap>
          );
        })}
        <text x={50} y={524} fontSize={20} fontWeight={700} fill={waterOk ? C.green : C.ink}>
          {cups} {cups === 1 ? 'cup' : 'cups'} of water{waterOk ? ' ✓' : ''}
        </text>
        <text x={50} y={552} fontSize={16} fill={C.ink2}>
          Drink with meals, and more when you’re hot or busy.
        </text>
      </Card>

      {/* My day */}
      <Card x={510} y={344} w={460} h={230} fill={allOk ? shade(C.green, 0.85) : C.card}>
        <Face cx={590} cy={432} r={58} parts={FEELING_FACE[allOk ? 'happy' : 'calm']} />
        {[
          { ok: sleepOk, text: 'Sleep 9 to 12 hours' },
          { ok: moveOk, text: 'Move for 60 minutes' },
          { ok: waterOk, text: 'Drink water through the day' },
        ].map((r, i) => (
          <g key={r.text}>
            <circle cx={680} cy={386 + i * 40} r={13} fill={r.ok ? C.green : C.white} stroke={r.ok ? C.green : C.line} strokeWidth={2.5} />
            {r.ok && <path d={`M673,${386 + i * 40} l5,5 l9,-10`} fill="none" stroke={C.white} strokeWidth={3} strokeLinecap="round" />}
            <text x={702} y={392 + i * 40} fontSize={17} fontWeight={600} fill={C.ink}>
              {r.text}
            </text>
          </g>
        ))}
        <Lines
          text={allOk ? 'A super healthy day! Your body is ready to learn and play.' : why ? WHY[why] : 'Plan your day: change the times, tap activities and fill the cups.'}
          x={540}
          y={524}
          max={48}
          size={16}
          lh={21}
          weight={600}
          fill={C.ink2}
        />
      </Card>

      <SvgButton x={30} y={600} w={140} h={52} fontSize={18} label="Say it" onClick={() => speak(`You sleep ${hoursText(sleep)}. You move for ${moveMin} minutes. You drink ${cups} cups of water.`, { force: true })} />
      <SvgButton x={186} y={600} w={150} h={52} fontSize={18} label="New day" onClick={() => { setMoves([]); setCups(0); setWhy(null); }} />

      <Callout at={[50 + (SLEEP_MIN - 1) * slotW + 40, 255]} box={[520, 600]} w={260} icon={Moon} title="9 to 12 hours" text="Children aged 6 to 12 need about 9 to 12 hours of sleep each night." />
      <Callout at={[530 + (barW * MOVE_GOAL) / 90, 253]} box={[360, 600]} w={240} icon={Bike} title="60 minutes" text="Try to be active for at least 60 minutes every day. It can be lots of little bits!" />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <circle cx={30} cy={30} r={16} fill="#f5c542" />
      <path d="M86,18 a16,16 0 1,0 16,22 a12,12 0 1,1 -16,-22 z" fill="#8b67d6" />
      <path d="M52,46 L72,46 L69,72 L55,72 Z" fill="#5fb0ff" stroke="#1e2b4a" strokeWidth={2} />
    </svg>
  );
}

const opt = (value: string) => ({ value });

function makeQuestion(level: number): Question {
  if (level === 0) {
    const k = rand(0, 2);
    if (k === 0)
      return choiceQuestion({
        prompt: 'What helps your body rest and grow?',
        right: { value: 'Sleeping well at night', name: 'sleeping well at night', label: <EmojiLabel e="😴" text="Sleeping well at night" /> },
        wrong: [{ value: 'Staying up very late', name: 'staying up very late', label: <EmojiLabel e="🌙" text="Staying up very late" /> }],
        hint: 'Think about what your body does while you are asleep.',
        explain: ['While we sleep, our body rests and grows.', 'Our brain also stores what we learned.', 'So sleeping well at night helps.'],
      });
    if (k === 1)
      return choiceQuestion({
        prompt: 'You are thirsty after running around. What is the best drink?',
        right: { value: 'Water', name: 'water', label: <EmojiLabel e="💧" text="Water" /> },
        wrong: [{ value: 'Nothing until tomorrow', name: 'nothing until tomorrow', label: <EmojiLabel e="🚫" text="Nothing until tomorrow" /> }],
        hint: 'Your body lost water when you got hot and busy.',
        explain: ['Running makes us hot, and we lose water.', 'Drinking puts water back into our body.', 'So the best drink is water.'],
      });
    const a = pick(ACTIVITIES);
    return choiceQuestion({
      prompt: 'Which one gets your body moving?',
      right: { value: a.name, name: a.name.toLowerCase(), label: <EmojiLabel e={a.emoji} text={a.name} /> },
      wrong: [pick([{ value: 'Watching TV', name: 'watching tv', label: <EmojiLabel e="📺" text="Watching TV" /> }, { value: 'Sitting still', name: 'sitting still', label: <EmojiLabel e="🪑" text="Sitting still" /> }])],
      hint: 'Which one makes your heart beat faster?',
      explain: ['Moving makes your heart and muscles work.', `${a.name} gets your body moving.`],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.5) {
      const bed = rand(7, 9);
      const wakeAt = rand(6, 8);
      const hours = 12 - bed + wakeAt;
      return choiceQuestion({
        prompt: `Bedtime is ${bed} o’clock at night. You wake up at ${wakeAt} o’clock in the morning. How many hours do you sleep?`,
        visual: <EmojiRow items={['🌙', '🛏️', '☀️']} label="Night to morning" />,
        right: opt(String(hours)),
        wrong: numberChoices(hours, { count: 4, min: 6, spread: 2 })
          .filter((c) => c !== String(hours))
          .map(opt),
        hint: 'Count the hours up to 12 o’clock midnight, then on to the morning.',
        explain: [`From ${bed} o’clock to 12 o’clock is ${12 - bed} hours.`, `From 12 o’clock to ${wakeAt} o’clock is ${wakeAt} hours.`, `${12 - bed} + ${wakeAt} = ${hours} hours of sleep.`],
      });
    }
    const [a, b] = shuffle(ACTIVITIES).slice(0, 2);
    const total = a.min + b.min;
    return choiceQuestion({
      prompt: `You ${a.verb} for ${a.min} minutes and ${b.verb} for ${b.min} minutes. How many minutes is that altogether?`,
      visual: <EmojiRow items={[a.emoji, '➕', b.emoji]} label={`${a.name} and ${b.name}`} />,
      right: opt(String(total)),
      wrong: numberChoices(total, { count: 4, min: 5, spread: 2, step: 5 })
        .filter((c) => c !== String(total))
        .map(opt),
      hint: 'Add the two times together. Count on in 5s or 10s.',
      explain: [`${a.min} + ${b.min} = ${total}.`, `So you moved for ${total} minutes altogether.`],
    });
  }

  // Level 2: how much is left, choosing a bedtime, and the recommendations.
  const k = rand(0, 2);
  if (k === 0) {
    const done = pick([15, 20, 25, 30, 35, 40, 45]);
    const left = MOVE_GOAL - done;
    return choiceQuestion({
      prompt: `You have been active for ${done} minutes today. How many more minutes to reach 60?`,
      right: opt(String(left)),
      wrong: numberChoices(left, { count: 4, min: 5, spread: 2, step: 5 })
        .filter((c) => c !== String(left))
        .map(opt),
      hint: `Count on from ${done} to 60.`,
      explain: [`Count on from ${done} to 60.`, `60 − ${done} = ${left}.`, `You need ${left} more minutes.`],
    });
  }
  if (k === 1) {
    const wakeAt = 7;
    const want = pick([10, 11]);
    const bed = 12 - (want - wakeAt);
    return choiceQuestion({
      prompt: `You wake up at ${wakeAt} o’clock. You want ${want} hours of sleep. What time should you go to bed?`,
      right: opt(`${bed} o’clock`),
      wrong: [opt(`${bed + 1} o’clock`), opt(`${bed + 2} o’clock`), opt(`${bed - 1} o’clock`)],
      hint: `Count back ${want} hours from ${wakeAt} o’clock in the morning.`,
      explain: [`From midnight to ${wakeAt} o’clock is ${wakeAt} hours.`, `We need ${want - wakeAt} more hours before midnight.`, `12 − ${want - wakeAt} = ${bed}, so bedtime is ${bed} o’clock.`],
    });
  }
  return choiceQuestion({
    prompt: 'About how much sleep do children aged 6 to 12 need each night?',
    right: opt('9 to 12 hours'),
    wrong: shuffle([opt('3 to 4 hours'), opt('5 to 6 hours')]),
    hint: 'It’s a lot! Children need more sleep than grown-ups.',
    explain: ['Growing bodies and busy brains need lots of rest.', 'Children aged 6 to 12 need about 9 to 12 hours.'],
  });
}

export const sleepAndMove: Lesson = {
  id: 'sleep-and-move',
  title: 'Sleep, Move, Drink Water',
  Thumb,
  Scene: HealthyDayScene,
  sceneHint: 'Set bedtime and wake-up · Tap activities · Fill the water cups',
  learn: {
    heading: 'A healthy day',
    intro: 'Sleeping, moving and drinking water help your body feel good, so you have energy to learn and play.',
    points: [
      { icon: Moon, text: 'Children aged 6 to 12 need about 9 to 12 hours of sleep.' },
      { icon: Bike, text: 'Be active for at least 60 minutes every day.' },
      { icon: Droplets, text: 'Drink water through the day, and more when it’s hot.' },
      { icon: Sun, text: 'Sleep helps you grow and remember. Moving makes you strong.' },
    ],
  },
  steps: ['Find your bedtime and wake-up time.', 'Count the hours of sleep in between.', 'Add up your active minutes. Aim for 60.', 'Drink water with meals and when you play.'],
  example: {
    question: 'Bedtime is 8 o’clock and you wake up at 7 o’clock. How many hours of sleep is that?',
    visual: <EmojiRow items={['🌙', '🛏️', '☀️']} label="Night to morning" />,
    work: ['From 8 o’clock to 12 o’clock is 4 hours.', 'From 12 o’clock to 7 o’clock is 7 hours.', '4 + 7 = 11.'],
    answer: '11 hours. That’s just right!',
  },
  grownups: [
    'A calm, regular bedtime routine (bath, book, lights out) makes it easier to fall asleep.',
    'Active minutes add up: walking to school, playing tag and dancing in the kitchen all count.',
    'Keep a water bottle handy, especially on hot days and after play.',
    'If you have worries about your child’s sleep or energy, your doctor or school nurse can help.',
  ],
  makeQuestion,
};
