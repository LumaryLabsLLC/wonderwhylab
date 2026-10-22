import { useState } from 'react';
import { CalendarDays, PiggyBank, Repeat, Target } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, Emoji, Lines, Note, Tap } from '../shared/kit';

interface Goal {
  emoji: string;
  name: string;
  cost: number;
}

const GOALS: Goal[] = [
  { emoji: '🪁', name: 'kite', cost: 12 },
  { emoji: '🎨', name: 'paint set', cost: 20 },
  { emoji: '⚽', name: 'football', cost: 30 },
];

/** The running totals you reach by saving `per` coins each week, starting from `from`, until `goal`. */
function plan(from: number, per: number, goal: number): number[] {
  const out: number[] = [];
  for (let t = from; t < goal && out.length < 40; ) out.push((t += per));
  return out;
}

/** A friendly piggy bank. */
export function Piggy({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  const pink = '#f6a9c8';
  const dark = '#e47fab';
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`} style={{ pointerEvents: 'none' }}>
      {[-72, -30, 30, 72].map((x) => (
        <rect key={x} x={x - 14} y={46} width={28} height={44} rx={10} fill={dark} stroke={C.ink} strokeWidth={4} />
      ))}
      <path d="M-118,-6 q-26,-6 -22,-26 q4,-14 16,-6" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <ellipse rx={122} ry={88} fill={pink} stroke={C.ink} strokeWidth={5} />
      <path d="M-62,-70 L-40,-112 L-18,-78 Z" fill={dark} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d="M30,-80 L58,-114 L70,-72 Z" fill={dark} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-34} y={-92} width={68} height={12} rx={6} fill={C.ink} />
      <circle cx={62} cy={-26} r={8} fill={C.ink} />
      <ellipse cx={116} cy={10} rx={28} ry={24} fill={dark} stroke={C.ink} strokeWidth={4} />
      <ellipse cx={108} cy={10} rx={4} ry={7} fill={C.ink} />
      <ellipse cx={124} cy={10} rx={4} ry={7} fill={C.ink} />
      <ellipse cx={-40} cy={-30} rx={30} ry={16} fill="white" opacity={0.35} />
    </g>
  );
}

function SavingScene() {
  const [g, setG] = useState(0);
  const [per, setPer] = useState(3);
  const [saved, setSaved] = useState(0);
  const [log, setLog] = useState<number[]>([]);
  // Weeks (1-based) after which a treat was bought, so the week boxes can show where coins went.
  const [treats, setTreats] = useState<number[]>([]);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' } | null>({
    text: 'Pick a goal, choose how many coins to save each week, then tap “Next week”.',
    tone: 'info',
  });
  const goal = GOALS[g];
  const reached = saved >= goal.cost;
  const ahead = plan(saved, per, goal.cost);

  const restart = (i = g) => {
    setG(i);
    setSaved(0);
    setLog([]);
    setTreats([]);
  };

  const nextWeek = () => {
    if (reached) {
      setNote({ text: `You already have enough for the ${goal.name}! Tap “Start again” to save for something new.`, tone: 'info' });
      return;
    }
    const t = saved + per;
    setSaved(t);
    setLog([...log, t]);
    if (t >= goal.cost) {
      play('complete');
      setNote({ text: `You did it! ${log.length + 1} weeks of saving and you have ${t} coins, enough for the ${goal.name}.`, tone: 'good' });
    } else {
      play('pop');
      setNote({ text: `Week ${log.length + 1}: ${t} coins saved. ${goal.cost - t} more to go!`, tone: 'info' });
    }
  };

  const treat = () => {
    if (saved < 2) {
      setNote({ text: 'Not enough coins for a treat yet. Keep saving!', tone: 'nudge' });
      return;
    }
    play('tap');
    setSaved(saved - 2);
    setTreats([...treats, log.length]);
    setNote({ text: 'Treats are nice sometimes! Spending 2 coins means your goal is a little further away.', tone: 'nudge' });
  };

  // Goal tower: shows how full the savings are.
  const towerTop = 250;
  const towerBottom = 560;
  const towerH = towerBottom - towerTop;
  const fillH = Math.min(1, saved / goal.cost) * towerH;
  const planText = ahead.length > 7 ? [...ahead.slice(0, 4), '…', ...ahead.slice(-2)].join(', ') : ahead.join(', ');

  const shownWeeks = log.slice(-16);
  const firstWeek = log.length - shownWeeks.length + 1;

  return (
    <SceneSvg label="Save coins each week for a goal">
      {/* Goals */}
      <text x={40} y={40} fontSize={15} fill={C.muted} className="caps">
        Pick a goal
      </text>
      {GOALS.map((x, i) => {
        const bx = 40 + i * 150;
        const on = i === g;
        return (
          <Tap
            key={x.name}
            label={`${x.name}, ${x.cost} coins`}
            onTap={() => {
              play('tap');
              restart(i);
              setNote({ text: `The ${x.name} costs ${x.cost} coins. How many weeks will it take?`, tone: 'info' });
            }}
          >
            <Card x={bx} y={54} w={138} h={124} fill={on ? shade(C.yellow, 0.65) : C.card} stroke={on ? C.orange : C.ink}>
              <Emoji e={x.emoji} x={bx + 69} y={92} size={46} />
              <text x={bx + 69} y={138} textAnchor="middle" fontSize={16} fill={C.ink2}>
                {x.name}
              </text>
              <text x={bx + 69} y={164} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
                {x.cost} coins
              </text>
            </Card>
          </Tap>
        );
      })}

      {/* Piggy bank and the goal tower */}
      <Piggy cx={190} cy={370} s={1.05} />
      <text x={190} y={520} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.ink}>
        {saved} coins saved
      </text>
      <SvgButton x={110} y={552} w={160} h={50} fontSize={17} label="Start again" onClick={() => { restart(); setNote(null); }} />

      <rect x={380} y={towerTop} width={70} height={towerH} rx={14} fill={C.paper} stroke={C.ink} strokeWidth={2} />
      <rect x={380} y={towerBottom - fillH} width={70} height={fillH} rx={14} fill={reached ? C.green : C.yellow} />
      <rect x={380} y={towerTop} width={70} height={towerH} rx={14} fill="none" stroke={C.ink} strokeWidth={3} />
      <Emoji e={goal.emoji} x={415} y={towerTop - 30} size={40} />
      <text x={462} y={towerTop + 6} fontSize={16} fontWeight={700} fill={C.ink}>
        {goal.cost}
      </text>
      <text x={462} y={towerBottom} fontSize={16} fill={C.muted}>
        0
      </text>

      {/* How much to save each week */}
      <Card x={520} y={54} w={440} h={150}>
        <text x={540} y={86} fontSize={18} fontWeight={700} fill={C.ink}>
          Save each week
        </text>
        <SvgButton x={540} y={102} w={56} h={52} fontSize={26} label="−" disabled={per <= 2} onClick={() => { play('tap'); setPer(per - 1); }} />
        <text x={668} y={138} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.ink}>
          {per} coins
        </text>
        <SvgButton x={740} y={102} w={56} h={52} fontSize={26} label="+" disabled={per >= 10} onClick={() => { play('tap'); setPer(per + 1); }} />
        <SvgButton x={818} y={102} w={124} h={52} fontSize={17} label="Say it" onClick={() => speak(`You save ${per} coins each week. The ${goal.name} costs ${goal.cost} coins.`, { force: true })} />
        <Lines
          text={reached ? `Goal reached in ${log.length} weeks!` : `Plan: ${planText} → ${ahead.length} more ${ahead.length === 1 ? 'week' : 'weeks'}`}
          x={540}
          y={188}
          max={48}
          size={17}
          weight={600}
          fill={reached ? C.green : C.ink2}
        />
      </Card>

      {/* Week by week */}
      <Card x={520} y={222} w={440} h={212}>
        <text x={540} y={252} fontSize={15} fill={C.muted} className="caps">
          Week by week
        </text>
        {shownWeeks.map((t, i) => {
          const x = 540 + (i % 8) * 51;
          const y = 264 + Math.floor(i / 8) * 86;
          const done = t >= goal.cost;
          return (
            <g key={i}>
              <rect x={x} y={y} width={46} height={80} rx={10} fill={done ? shade(C.green, 0.7) : shade(C.yellow, 0.75)} stroke={C.ink} strokeWidth={1.5} />
              <text x={x + 23} y={y + 22} textAnchor="middle" fontSize={15} fill={C.ink2}>
                W{firstWeek + i}
              </text>
              <text x={x + 23} y={y + 50} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
                {t}
              </text>
              {treats.includes(firstWeek + i) && <Emoji e="🍭" x={x + 23} y={y + 66} size={18} />}
            </g>
          );
        })}
        {log.length === 0 && (
          <text x={740} y={345} textAnchor="middle" fontSize={18} fill={C.muted}>
            Your weeks will show up here
          </text>
        )}
      </Card>

      <SvgButton x={520} y={450} w={210} h={60} fontSize={20} label="Next week ▶" color={C.teal} textColor={C.white} onClick={nextWeek} />
      <SvgButton x={746} y={450} w={214} h={60} fontSize={17} label="🍭 Treat (2 coins)" onClick={treat} />
      {note && <Note x={520} y={528} w={440} text={note.text} tone={note.tone} />}

      <Callout at={[415, 400]} box={[540, 590]} w={240} icon={Target} title="Goal tower" text="It fills up as you save. When it is full, you can buy your goal." />
      <Callout at={[668, 138]} box={[20, 20]} w={240} icon={Repeat} title="Count in steps" text="Saving the same amount each week is like counting in 2s, 3s or 5s." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Piggy cx={54} cy={42} s={0.28} />
      <circle cx={96} cy={22} r={10} fill="#f5c542" stroke="#c9971c" strokeWidth={2} />
      <circle cx={102} cy={44} r={8} fill="#d9e1ea" stroke="#8e9bb0" strokeWidth={2} />
    </svg>
  );
}

/** Week cards for question pictures, e.g. "+3" each week. */
function WeeksPicture({ per, weeks }: { per: number; weeks: number }) {
  const w = weeks * 84 + 10;
  return (
    <svg viewBox={`0 0 ${w} 96`} role="img" aria-label={`${weeks} weeks, ${per} coins each week`}>
      {Array.from({ length: weeks }, (_, i) => (
        <g key={i}>
          <rect x={10 + i * 84} y={10} width={76} height={76} rx={12} fill="#fdf0c4" stroke={C.ink} strokeWidth={2} />
          <text x={48 + i * 84} y={36} textAnchor="middle" fontSize={15} fill={C.ink2}>
            Week {i + 1}
          </text>
          <text x={48 + i * 84} y={70} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>
            +{per}
          </text>
        </g>
      ))}
    </svg>
  );
}

const nums = (answer: number, count = 4) =>
  numberChoices(answer, { count, min: 1, spread: 2 })
    .filter((c) => c !== String(answer))
    .map((value) => ({ value }));

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.7) {
      const p = pick([2, 5, 10]);
      const w = rand(2, 4);
      const seq = plan(0, p, p * w);
      return choiceQuestion({
        prompt: `You put ${p} coins in your piggy bank each week. How many coins do you have after ${w} weeks?`,
        visual: <WeeksPicture per={p} weeks={w} />,
        right: { value: String(p * w) },
        wrong: nums(p * w, 3),
        hint: `Count by ${p}s, once for each week.`,
        explain: [`Count by ${p}s, once for each week.`, `${seq.join(', ')}.`, `After ${w} weeks you have ${p * w} coins.`],
      });
    }
    const good = 'Put some coins in the piggy bank each week';
    return choiceQuestion({
      prompt: 'What is a good way to save up for something you want?',
      visual: (
        <svg viewBox="-160 -125 310 225" role="img" aria-label="A piggy bank">
          <Piggy cx={0} cy={0} />
        </svg>
      ),
      right: { value: good },
      wrong: [{ value: pick(['Spend all your coins every day', 'Give the piggy bank away']) }],
      hint: 'Saving means keeping some coins for later.',
      explain: ['Saving means keeping some coins for later.', 'A little each week adds up.', `So: ${good.toLowerCase()}.`],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.6) {
      const p = rand(2, 5);
      const w = rand(2, 6);
      const goal = p * w;
      const thing = pick(GOALS);
      return choiceQuestion({
        prompt: `A ${thing.name} costs ${goal} coins. You save ${p} coins each week. How many weeks until you can buy it?`,
        visual: <WeeksPicture per={p} weeks={Math.min(w, 4)} />,
        right: { value: String(w) },
        wrong: nums(w),
        hint: `Count by ${p}s until you reach ${goal}. Count how many steps you took.`,
        explain: [`Count by ${p}s until you reach ${goal}: ${plan(0, p, goal).join(', ')}.`, `That is ${w} steps, so it takes ${w} weeks.`],
      });
    }
    const goal = pick([20, 25, 30]);
    const have = rand(5, goal - 4);
    const more = goal - have;
    return choiceQuestion({
      prompt: `You have saved ${have} coins. Your goal is ${goal} coins. How many more coins do you need?`,
      right: { value: String(more) },
      wrong: nums(more),
      hint: `Count on from ${have} up to ${goal}.`,
      explain: [`Count on from ${have} to ${goal}.`, `${goal} − ${have} = ${more}.`, `You need ${more} more coins.`],
    });
  }

  // Level 2: goals that don't divide evenly, and spending some each week.
  if (Math.random() < 0.5) {
    const p = rand(3, 6);
    const w = rand(3, 6);
    const goal = p * w - rand(1, p - 1);
    return choiceQuestion({
      prompt: `A toy costs ${goal} coins. You save ${p} coins each week. How many weeks until you have enough?`,
      right: { value: String(w) },
      wrong: nums(w),
      hint: `Count by ${p}s. Stop when you reach ${goal} or go past it.`,
      explain: [
        `After ${w - 1} weeks you have ${p * (w - 1)} coins. Not enough yet.`,
        `After ${w} weeks you have ${p * w} coins. That’s enough!`,
        `So it takes ${w} weeks.`,
      ],
    });
  }
  const get = rand(4, 7);
  const spend = rand(1, 2);
  const net = get - spend;
  const w = rand(2, 5);
  const goal = net * w;
  return choiceQuestion({
    prompt: `You get ${get} coins each week. You spend ${spend} on a treat and save the rest. How many weeks to save ${goal} coins?`,
    right: { value: String(w) },
    wrong: nums(w),
    hint: 'First work out how many coins you really save each week.',
    explain: [`Each week you save ${get} − ${spend} = ${net} coins.`, `Count by ${net}s: ${plan(0, net, goal).join(', ')}.`, `So it takes ${w} weeks.`],
  });
}

export const savingGoal: Lesson = {
  id: 'saving-goal',
  title: 'Saving Up',
  Thumb,
  Scene: SavingScene,
  sceneHint: 'Pick a goal · Save each week · Watch the tower fill',
  learn: {
    heading: 'Saving for a goal',
    intro: 'Saving means keeping some coins for later, so you can buy something special. A little bit every week adds up!',
    points: [
      { icon: Target, text: 'Pick a goal and find out how much it costs.' },
      { icon: PiggyBank, text: 'Put some coins away each week.' },
      { icon: Repeat, text: 'Count in steps to see how your savings grow.' },
      { icon: CalendarDays, text: 'Count the weeks to know when you can buy it.' },
    ],
  },
  steps: ['Find the cost of your goal.', 'Decide how many coins to save each week.', 'Count in steps: one step for each week.', 'Stop when you reach the goal. Count the steps.'],
  example: {
    question: 'A kite costs 12 coins. You save 3 coins each week. How many weeks until you can buy it?',
    visual: <WeeksPicture per={3} weeks={4} />,
    work: ['Count by 3s: 3, 6, 9, 12.', 'That is 4 steps.'],
    answer: 'It takes 4 weeks.',
  },
  grownups: [
    'A clear jar works brilliantly: children can see their savings grow. Draw a line on it for the goal.',
    'Let your child choose the goal. Saving feels easier when it is for something they really want.',
    'It’s fine to spend some and save some. Talk about how spending today changes when the goal arrives.',
  ],
  makeQuestion,
};
