import { useState } from 'react';
import { CalendarClock, Gift, PiggyBank, ShoppingBag } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, Emoji, EmojiPicture, Note, Tap } from '../shared/kit';
import { Coin } from '../shared/Coin';
import { Jar } from './visuals/Money';

type JarId = 'spend' | 'save' | 'share';

const JARS: { id: JarId; label: string; colour: string; job: string }[] = [
  { id: 'spend', label: 'Spend', colour: C.orange, job: 'for now' },
  { id: 'save', label: 'Save', colour: C.green, job: 'for a goal' },
  { id: 'share', label: 'Share', colour: C.purple, job: 'to give' },
];

const GOALS = [
  { emoji: '⚽', name: 'ball', price: 24 },
  { emoji: '🛹', name: 'skateboard', price: 45 },
  { emoji: '🎧', name: 'headphones', price: 60 },
];

const POCKET = [10, 15, 20];

/** Whole weeks needed to save `need` coins at `perWeek` a week. */
const weeksFor = (need: number, perWeek: number) => Math.ceil(need / perWeek);

function JarsScene() {
  const [pocket, setPocket] = useState(10);
  const [jars, setJars] = useState<Record<JarId, number>>({ spend: 0, save: 0, share: 0 });
  const [goal, setGoal] = useState(1);
  const [saved, setSaved] = useState(0);
  const [week, setWeek] = useState(0);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' } | null>({
    text: 'You get 10 coins of pocket money each week. Tap + to put coins in the Spend, Save and Share jars.',
    tone: 'info',
  });
  const used = jars.spend + jars.save + jars.share;
  const free = pocket - used;
  const g = GOALS[goal];
  const need = Math.max(0, g.price - saved);

  const change = (id: JarId, d: number) => {
    if (d > 0 && free === 0) {
      setNote({ text: `All ${pocket} coins are in jars. Take one out of another jar first.`, tone: 'nudge' });
      return;
    }
    if (d < 0 && jars[id] === 0) return;
    if (d > 0) play('pop');
    const next = { ...jars, [id]: jars[id] + d };
    setJars(next);
    const left = pocket - next.spend - next.save - next.share;
    if (left === 0) {
      setNote({
        text: `Every coin has a job: ${next.spend} to spend, ${next.save} to save, ${next.share} to share. ${next.spend} + ${next.save} + ${next.share} = ${pocket}.`,
        tone: 'good',
      });
    } else setNote(null);
  };

  const restart = (p: number, gi: number) => {
    setPocket(p);
    setGoal(gi);
    setJars({ spend: 0, save: 0, share: 0 });
    setSaved(0);
    setWeek(0);
    setNote({ text: `Pocket money is ${p} coins a week. Share it out between the three jars.`, tone: 'info' });
  };

  const nextWeek = () => {
    if (free > 0) {
      setNote({ text: `${free} coins still need a jar. Give every coin a job first.`, tone: 'nudge' });
      return;
    }
    if (saved >= g.price) return;
    const s = saved + jars.save;
    setSaved(s);
    setWeek(week + 1);
    if (s >= g.price) {
      play('complete');
      setNote({ text: `Week ${week + 1}: you have ${s} coins saved. That’s enough for the ${g.name}! Steady saving got you there.`, tone: 'good' });
    } else if (jars.save === 0) {
      setNote({ text: 'Nothing went in the Save jar this week, so the goal is no closer. Try saving a little each week.', tone: 'nudge' });
    } else {
      setNote({ text: `Week ${week + 1}: ${saved} + ${jars.save} = ${s} saved. ${g.price - s} more to go.`, tone: 'info' });
    }
  };

  // Progress bar: one segment per week of saving.
  const BAR = { x: 700, y: 236, w: 240, h: 34 };
  const segs = Array.from({ length: week }, (_, i) => i);
  const perWeek = week > 0 ? saved / week : 0;

  return (
    <SceneSvg label="Share pocket money between spend, save and share jars">
      <text x={40} y={26} fontSize={15} fill={C.muted} className="caps">
        Pocket money each week
      </text>
      {POCKET.map((p, i) => (
        <SvgButton key={p} x={40 + i * 104} y={38} w={94} h={52} fontSize={18} label={`${p} coins`} active={p === pocket} onClick={() => restart(p, goal)} />
      ))}
      <text x={380} y={34} fontSize={17} fill={C.ink2}>
        Not in a jar yet: <tspan fontWeight={800} fill={free === 0 ? C.green : C.ink}>{free}</tspan>
      </text>
      {Array.from({ length: free }, (_, k) => (
        <Coin key={k} v={1} x={392 + (k % 10) * 27} y={58 + Math.floor(k / 10) * 27} scale={0.42} />
      ))}

      {JARS.map((j, i) => {
        const x = 50 + i * 210;
        const v = jars[j.id];
        return (
          <g key={j.id}>
            <Tap label={`Add a coin to ${j.label}`} onTap={() => change(j.id, 1)}>
              <Jar x={x} y={112} w={170} h={310} label={j.label} colour={j.colour} level={0} />
              <text x={x + 85} y={226} textAnchor="middle" fontSize={40} fontWeight={800} fill={C.ink}>
                {v}
              </text>
              <text x={x + 85} y={252} textAnchor="middle" fontSize={16} fill={C.ink2}>
                {j.job}
              </text>
              {/* One coin per coin in the jar, filling from the bottom. */}
              {Array.from({ length: v }, (_, k) => (
                <Coin key={k} v={1} x={x + 25 + (k % 5) * 30} y={394 - Math.floor(k / 5) * 30} scale={0.52} />
              ))}
            </Tap>
            <SvgButton x={x + 6} y={436} w={72} h={56} fontSize={26} label="−" title={`Take a coin out of ${j.label}`} disabled={v === 0} onClick={() => change(j.id, -1)} />
            <SvgButton x={x + 92} y={436} w={72} h={56} fontSize={26} label="+" title={`Put a coin in ${j.label}`} disabled={free === 0} onClick={() => change(j.id, 1)} />
          </g>
        );
      })}

      <Card x={680} y={20} w={280} h={474}>
        <text x={700} y={46} fontSize={15} fill={C.muted} className="caps">
          Saving goal
        </text>
        {GOALS.map((o, i) => {
          const x = 700 + i * 82;
          const on = i === goal;
          return (
            <Tap key={o.name} label={`${o.name}, ${o.price} coins`} onTap={() => restart(pocket, i)}>
              <rect x={x} y={58} width={76} height={92} rx={12} fill={on ? shade(C.yellow, 0.65) : C.card} stroke={on ? C.orange : C.line} strokeWidth={2} />
              <Emoji e={o.emoji} x={x + 38} y={90} size={36} />
              <text x={x + 38} y={136} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
                {o.price}
              </text>
            </Tap>
          );
        })}
        <text x={700} y={186} fontSize={17} fill={C.ink}>
          {`The ${g.name} costs ${g.price} coins.`}
        </text>
        <text x={700} y={222} fontSize={16} fill={C.ink2}>
          {`Week ${week} · saved ${saved}`}
        </text>
        <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx={10} fill={C.paper} stroke={C.ink} strokeWidth={2} />
        {segs.map((i) => {
          const w = (Math.min(perWeek, g.price) / g.price) * BAR.w;
          const x0 = BAR.x + i * w;
          if (x0 >= BAR.x + BAR.w) return null;
          return <rect key={i} x={x0 + 1.5} y={BAR.y + 3} width={Math.max(0, Math.min(w, BAR.x + BAR.w - x0) - 3)} height={BAR.h - 6} rx={6} fill={i % 2 ? C.green : shade(C.green, 0.3)} />;
        })}
        <text x={BAR.x + BAR.w} y={BAR.y + BAR.h + 22} textAnchor="end" fontSize={15} fill={C.ink2}>
          {`${Math.min(saved, g.price)} / ${g.price}`}
        </text>
        <text x={700} y={318} fontSize={16} fontWeight={700} fill={need === 0 ? C.green : C.ink}>
          {need === 0 ? 'Goal reached!' : jars.save === 0 ? 'Save some coins to get there.' : `${jars.save} a week → ${weeksFor(need, jars.save)} more ${weeksFor(need, jars.save) === 1 ? 'week' : 'weeks'}`}
        </text>
        <SvgButton x={700} y={352} w={240} h={56} fontSize={17} label="Next week ▸" disabled={need === 0} onClick={nextWeek} />
        <SvgButton x={700} y={424} w={130} h={50} fontSize={15} label="Start again" onClick={() => restart(pocket, goal)} />
        <SvgButton
          x={840}
          y={424}
          w={100}
          h={50}
          fontSize={15}
          label="Say it"
          onClick={() => speak(`${jars.spend} to spend, ${jars.save} to save, ${jars.share} to share. The ${g.name} costs ${g.price} coins.`, { force: true })}
        />
      </Card>

      {note && <Note x={40} y={512} w={920} text={note.text} tone={note.tone} />}

      <Callout at={[365, 300]} box={[420, 600]} w={240} icon={PiggyBank} title="Pay yourself first" text="Decide what to save before you spend, so the goal keeps growing." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Jar x={6} y={14} w={32} h={58} label="" colour={C.orange} level={0.3} />
      <Jar x={44} y={14} w={32} h={58} label="" colour={C.green} level={0.6} />
      <Jar x={82} y={14} w={32} h={58} label="" colour={C.purple} level={0.2} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5) {
      const total = pick([10, 12, 15, 20]);
      const spend = rand(2, Math.floor(total / 2));
      const share = rand(1, 3);
      const save = total - spend - share;
      return choiceQuestion({
        prompt: `You get ${total} coins. You put ${spend} in Spend and ${share} in Share. How many go in Save?`,
        visual: <EmojiPicture e="🫙" caption={`${total} coins to share out`} />,
        right: { value: String(save) },
        wrong: numberChoices(save, { count: 3, min: 0, spread: 3 })
          .filter((c) => c !== String(save))
          .map((value) => ({ value })),
        hint: 'Every coin goes in one jar. Take away the coins already used.',
        explain: [`Used so far: ${spend} + ${share} = ${spend + share}.`, `${total} − ${spend + share} = ${save}.`, `So ${save} coins go in Save.`],
      });
    }
    const per = rand(2, 5);
    const weeks = rand(2, 4);
    const total = per * weeks;
    return choiceQuestion({
      prompt: `You save ${per} coins every week. How many have you saved after ${weeks} weeks?`,
      visual: <EmojiPicture e="🐷" caption={`${per} coins a week`} />,
      right: { value: String(total) },
      wrong: numberChoices(total, { count: 3, min: 1, spread: 3 })
        .filter((c) => c !== String(total))
        .map((value) => ({ value })),
      hint: `Count up by ${per} for each week.`,
      explain: [`Count up by ${per}: ${Array.from({ length: weeks }, (_, i) => per * (i + 1)).join(', ')}.`, `${weeks} × ${per} = ${total}.`, `You have saved ${total} coins.`],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.5) {
      const per = pick([3, 4, 5, 6, 8]);
      const weeks = rand(3, 6);
      const price = per * weeks;
      const goal = pick(GOALS);
      return choiceQuestion({
        prompt: `A ${goal.name} costs ${price} coins. You save ${per} coins a week. How many weeks until you can buy it?`,
        visual: <EmojiPicture e={goal.emoji} caption={`${price} coins`} />,
        right: { value: String(weeks) },
        wrong: numberChoices(weeks, { count: 4, min: 1, spread: 2 })
          .filter((c) => c !== String(weeks))
          .map((value) => ({ value })),
        hint: `How many groups of ${per} make ${price}?`,
        explain: [`Each week adds ${per} coins.`, `${price} ÷ ${per} = ${weeks}.`, `So it takes ${weeks} weeks.`],
      });
    }
    const total = pick([10, 20]);
    const save = total / 2;
    const share = rand(1, 3);
    const spend = total - save - share;
    return choiceQuestion({
      prompt: `You get ${total} coins. You save half and share ${share}. How many are left to spend?`,
      right: { value: String(spend) },
      wrong: numberChoices(spend, { count: 4, min: 0, spread: 3 })
        .filter((c) => c !== String(spend))
        .map((value) => ({ value })),
      hint: 'Find half first, then take away the share coins too.',
      explain: [`Half of ${total} is ${save}.`, `${total} − ${save} − ${share} = ${spend}.`, `So ${spend} coins are left to spend.`],
    });
  }

  if (Math.random() < 0.5) {
    // The total doesn't divide evenly, so round up to a whole week.
    let per = 0;
    let price = 0;
    do {
      per = pick([4, 6, 7, 8, 9]);
      price = pick([30, 40, 45, 50, 60]);
    } while (price % per === 0);
    const weeks = weeksFor(price, per);
    return choiceQuestion({
      prompt: `Headphones cost ${price} coins. You save ${per} coins a week. How many weeks until you have enough?`,
      visual: <EmojiPicture e="🎧" caption={`${price} coins`} />,
      right: { value: String(weeks) },
      wrong: [weeks - 1, weeks + 1, weeks + 2].map((w) => ({ value: String(w) })),
      hint: 'Multiply to check: is the total after that many weeks enough yet?',
      explain: [`${per} × ${weeks - 1} = ${per * (weeks - 1)}: not enough yet.`, `${per} × ${weeks} = ${per * weeks}: that is enough for ${price}.`, `So it takes ${weeks} weeks.`],
    });
  }
  const per = pick([4, 5, 6]);
  const already = rand(5, 18);
  const price = already + per * rand(3, 6) - rand(0, per - 1);
  const need = price - already;
  const weeks = weeksFor(need, per);
  return choiceQuestion({
    prompt: `You have already saved ${already} coins. A game costs ${price}. You save ${per} a week. How many more weeks?`,
    visual: <EmojiPicture e="🎮" caption={`${price} coins`} />,
    right: { value: String(weeks) },
    wrong: numberChoices(weeks, { count: 4, min: 1, spread: 2 })
      .filter((c) => c !== String(weeks))
      .map((value) => ({ value })),
    hint: 'First find how many coins are still needed.',
    explain: [`Still needed: ${price} − ${already} = ${need}.`, `${per} × ${weeks} = ${per * weeks}, which is enough for ${need}.`, `So ${weeks} more weeks.`],
  });
}

export const spendSaveShare: Lesson = {
  id: 'spend-save-share',
  title: 'Spend, Save, Share',
  Thumb,
  Scene: JarsScene,
  sceneHint: 'Put the coins into jars · Tap Next week to watch your savings grow',
  learn: {
    heading: 'Giving every coin a job',
    intro: 'A simple plan for pocket money is three jars: some to spend now, some to save for a goal, and some to share. Every coin goes in one jar.',
    points: [
      { icon: ShoppingBag, text: 'Spend: things you want now.' },
      { icon: PiggyBank, text: 'Save: a bigger goal for later. Saving a little every week adds up.' },
      { icon: Gift, text: 'Share: giving to someone or a good cause.' },
      { icon: CalendarClock, text: 'Weeks to a goal = goal ÷ coins saved each week (round up).' },
    ],
  },
  steps: ['Start with your pocket money.', 'Decide how much to save first.', 'Then choose how much to share and spend.', 'Check: spend + save + share = pocket money.'],
  example: {
    question: 'You get 10 coins a week and want a ball that costs 24. If you save 6 a week, how long will it take?',
    visual: <EmojiPicture e="⚽" caption="24 coins" />,
    work: ['6 × 4 = 24.', 'So after 4 weeks you have enough.', 'That leaves 4 coins a week to spend and share.'],
    answer: '4 weeks.',
  },
  grownups: [
    'Three clear jars at home make saving visible. Let your child choose the split; there is no single right answer.',
    'Talk about trade-offs: saving more means reaching the goal sooner, but less to spend now.',
    'When a goal needs, say, 7½ weeks, help them see why it rounds up to 8.',
  ],
  makeQuestion,
};
