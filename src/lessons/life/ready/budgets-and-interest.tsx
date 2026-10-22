import { useState } from 'react';
import { ChartColumnIncreasing, Percent, Scale, Wallet } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, Emoji, EmojiRow, Note } from '../shared/kit';

type Mode = 'budget' | 'interest';
type CatId = 'bus' | 'snacks' | 'games' | 'gifts' | 'savings';

const CATS: { id: CatId; emoji: string; name: string; need: boolean; colour: string }[] = [
  { id: 'bus', emoji: '🚌', name: 'Bus fare', need: true, colour: C.blue },
  { id: 'snacks', emoji: '🍎', name: 'Snacks', need: false, colour: C.orange },
  { id: 'games', emoji: '🎮', name: 'Games and apps', need: false, colour: C.purple },
  { id: 'gifts', emoji: '🎁', name: 'Gifts', need: false, colour: C.pink },
  { id: 'savings', emoji: '🐷', name: 'Savings', need: false, colour: C.green },
];

const INCOMES = [60, 80, 100];
/** Bus fare is a need: it can't go below this. */
const BUS_FARE = 20;

function BudgetMode() {
  const [income, setIncome] = useState(80);
  const [spend, setSpend] = useState<Record<CatId, number>>({ bus: BUS_FARE, snacks: 25, games: 30, gifts: 10, savings: 5 });
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' }>({
    text: 'Money in must cover money out. Use − and + to change the plan until the budget balances.',
    tone: 'info',
  });
  const out = CATS.reduce((t, c) => t + spend[c.id], 0);
  const left = income - out;

  const change = (id: CatId, d: number) => {
    const v = spend[id] + d;
    if (v < 0) return;
    if (id === 'bus' && v < BUS_FARE) {
      setNote({ text: `Bus fare is a need: you need ${BUS_FARE} coins to get to school. Cut a want instead.`, tone: 'nudge' });
      return;
    }
    const next = { ...spend, [id]: v };
    setSpend(next);
    const o = CATS.reduce((t, c) => t + next[c.id], 0);
    if (o === income) {
      play('correct');
      setNote({ text: `Balanced! Money in ${income} = money out ${o}. Every coin has a job.`, tone: 'good' });
    } else if (o > income) setNote({ text: `Over budget by ${o - income}. Which want could you cut?`, tone: 'nudge' });
    else setNote({ text: `${income - o} coins not planned yet. Saving them is a great choice.`, tone: 'info' });
  };

  // Two stacked bars: money in and money out, on the same scale.
  const BAR = { x0: 660, y0: 470, h: 300 };
  const scale = BAR.h / Math.max(income, out, 1);
  let stack = 0;

  return (
    <g>
      <text x={40} y={116} fontSize={15} fill={C.muted} className="caps">
        Money in each month
      </text>
      {INCOMES.map((v, i) => (
        <SvgButton key={v} x={260 + i * 112} y={92} w={102} h={50} fontSize={17} label={`${v} coins`} active={v === income} onClick={() => setIncome(v)} />
      ))}
      {CATS.map((c, i) => {
        const y = 158 + i * 72;
        return (
          <g key={c.id}>
            <rect x={40} y={y} width={560} height={62} rx={14} fill={C.card} stroke={C.line} strokeWidth={1.5} />
            <rect x={40} y={y} width={10} height={62} rx={4} fill={c.colour} />
            <Emoji e={c.emoji} x={84} y={y + 31} size={30} />
            <text x={114} y={y + 30} fontSize={18} fontWeight={700} fill={C.ink}>
              {c.name}
            </text>
            <text x={114} y={y + 51} fontSize={15} fill={c.need ? C.blue : C.muted}>
              {c.need ? 'Need' : c.id === 'savings' ? 'For the future' : 'Want'}
            </text>
            <SvgButton x={350} y={y + 5} w={60} h={52} fontSize={24} label="−" title={`Less for ${c.name}`} onClick={() => change(c.id, -5)} />
            <text x={460} y={y + 39} textAnchor="middle" fontSize={22} fontWeight={800} fill={C.ink}>
              {spend[c.id]}
            </text>
            <SvgButton x={510} y={y + 5} w={60} h={52} fontSize={24} label="+" title={`More for ${c.name}`} onClick={() => change(c.id, 5)} />
          </g>
        );
      })}

      {/* Balance bars */}
      <text x={640} y={116} fontSize={15} fill={C.muted} className="caps">
        In vs out
      </text>
      <rect x={BAR.x0} y={BAR.y0 - income * scale} width={110} height={income * scale} rx={8} fill={shade(C.teal, 0.5)} stroke={C.ink} strokeWidth={2} />
      <text x={BAR.x0 + 55} y={BAR.y0 - income * scale - 10} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
        {income}
      </text>
      <text x={BAR.x0 + 55} y={BAR.y0 + 24} textAnchor="middle" fontSize={16} fill={C.ink2}>
        In
      </text>
      {CATS.map((c) => {
        const h = spend[c.id] * scale;
        const y = BAR.y0 - stack - h;
        stack += h;
        return h > 0 ? <rect key={c.id} x={BAR.x0 + 150} y={y} width={110} height={h} fill={c.colour} stroke={C.ink} strokeWidth={1.5} /> : null;
      })}
      <text x={BAR.x0 + 205} y={BAR.y0 - out * scale - 10} textAnchor="middle" fontSize={17} fontWeight={700} fill={out > income ? C.red : C.ink}>
        {out}
      </text>
      <text x={BAR.x0 + 205} y={BAR.y0 + 24} textAnchor="middle" fontSize={16} fill={C.ink2}>
        Out
      </text>
      <line x1={BAR.x0 - 10} y1={BAR.y0 - income * scale} x2={BAR.x0 + 280} y2={BAR.y0 - income * scale} stroke={C.ink} strokeWidth={2} strokeDasharray="6 5" />
      <text x={790} y={524} textAnchor="middle" fontSize={20} fontWeight={800} fill={left === 0 ? C.green : left < 0 ? C.red : C.ink}>
        {left === 0 ? 'Balanced ✓' : left < 0 ? `Over by ${-left}` : `${left} left to plan`}
      </text>
      <Note x={40} y={540} w={560} text={note.text} tone={note.tone} />
      <SvgButton x={700} y={548} w={180} h={50} fontSize={16} label="Say it" onClick={() => speak(`Money in: ${income}. Money out: ${out}. ${left === 0 ? 'The budget balances.' : left < 0 ? `Over budget by ${-left}.` : `${left} left to plan.`}`, { force: true })} />
      <Callout at={[BAR.x0 + 280, BAR.y0 - income * scale]} box={[760, 64]} w={200} icon={Scale} title="Balanced budget" text="Money out (including savings) equals money in." />
    </g>
  );
}

function InterestMode() {
  const [p, setP] = useState(200);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(4);
  const perYear = (p * rate) / 100;
  const total = p + perYear * years;

  const CH = { x: 400, y: 120, w: 540, h: 330 };
  const scale = (CH.h - 60) / total;
  const bw = Math.min(70, (CH.w - 20) / (years + 1) - 10);

  const stepper = (label: string, value: string, y: number, dec: () => void, inc: () => void, decOff: boolean, incOff: boolean) => (
    <g>
      <text x={40} y={y} fontSize={16} fill={C.ink2}>
        {label}
      </text>
      <SvgButton x={40} y={y + 12} w={60} h={52} fontSize={24} label="−" title={`Less ${label}`} disabled={decOff} onClick={dec} />
      <text x={190} y={y + 48} textAnchor="middle" fontSize={22} fontWeight={800} fill={C.ink}>
        {value}
      </text>
      <SvgButton x={280} y={y + 12} w={60} h={52} fontSize={24} label="+" title={`More ${label}`} disabled={incOff} onClick={inc} />
    </g>
  );

  return (
    <g>
      {stepper('Saved at the start', `${p} coins`, 120, () => setP(p - 100), () => setP(p + 100), p <= 100, p >= 1000)}
      {stepper('Interest rate (each year)', `${rate}%`, 216, () => setRate(rate - 1), () => setRate(rate + 1), rate <= 1, rate >= 10)}
      {stepper('Years', `${years}`, 312, () => setYears(years - 1), () => setYears(years + 1), years <= 1, years >= 10)}

      <rect x={CH.x} y={CH.y} width={CH.w} height={CH.h} rx={12} fill={C.card} stroke={C.line} strokeWidth={1.5} />
      {Array.from({ length: years + 1 }, (_, yr) => {
        const x = CH.x + 20 + yr * (bw + 10);
        const base = p * scale;
        const extra = perYear * yr * scale;
        const yBase = CH.y + CH.h - 30;
        return (
          <g key={yr}>
            <rect x={x} y={yBase - base} width={bw} height={base} fill={shade(C.blue, 0.55)} stroke={C.ink} strokeWidth={1.5} />
            {extra > 0 && <rect x={x} y={yBase - base - extra} width={bw} height={extra} fill={C.green} stroke={C.ink} strokeWidth={1.5} />}
            <text x={x + bw / 2} y={yBase + 22} textAnchor="middle" fontSize={15} fill={C.ink2}>
              {yr === 0 ? 'Start' : `Yr ${yr}`}
            </text>
            {(yr === 0 || yr === years || years <= 6) && (
              <text x={x + bw / 2} y={yBase - base - extra - 8} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
                {p + perYear * yr}
              </text>
            )}
          </g>
        );
      })}

      <Card x={40} y={420} w={330} h={104} fill={shade(C.green, 0.85)}>
        <text x={58} y={452} fontSize={16} fill={C.ink2}>
          Interest each year
        </text>
        <text x={58} y={482} fontSize={19} fontWeight={800} fill={C.ink}>
          {`${rate}% of ${p} = ${perYear} coins`}
        </text>
        <text x={58} y={510} fontSize={15} fill={C.ink2}>
          The same amount is added every year.
        </text>
      </Card>
      <Note x={400} y={470} w={540} text={`After ${years} ${years === 1 ? 'year' : 'years'}: ${p} + ${years} × ${perYear} = ${total} coins. The green part is interest: money the bank pays you for saving.`} tone="good" />
      <SvgButton x={40} y={548} w={180} h={50} fontSize={16} label="Say it" onClick={() => speak(`${p} coins at ${rate} percent for ${years} years grows to ${total} coins.`, { force: true })} />
      <Callout at={[CH.x + 20 + years * (bw + 10) + bw / 2, CH.y + CH.h - 30 - total * scale]} box={[700, 60]} w={230} icon={Percent} title="Interest" text="Simple interest adds the same percentage of your starting amount each year." />
    </g>
  );
}

function MoneyScene() {
  const [mode, setMode] = useState<Mode>('budget');
  return (
    <SceneSvg label="Make a monthly budget, then watch savings grow with interest">
      <SvgButton x={40} y={20} w={300} h={56} fontSize={18} label="📋 Monthly budget" active={mode === 'budget'} color={mode === 'budget' ? shade(C.yellow, 0.6) : C.card} onClick={() => setMode('budget')} />
      <SvgButton x={356} y={20} w={300} h={56} fontSize={18} label="📈 Savings and interest" active={mode === 'interest'} color={mode === 'interest' ? shade(C.yellow, 0.6) : C.card} onClick={() => setMode('interest')} />
      {mode === 'budget' ? <BudgetMode /> : <InterestMode />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={14 + i * 24} y={60 - 30} width={18} height={30} fill={shade(C.blue, 0.55)} stroke={C.ink} strokeWidth={1.5} />
          <rect x={14 + i * 24} y={30 - i * 7} width={18} height={i * 7} fill={C.green} stroke={C.ink} strokeWidth={1.5} />
        </g>
      ))}
      <line x1={8} y1={61} x2={112} y2={61} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.6) {
      const income = pick([60, 80, 100, 120]);
      let a = 0;
      let b = 0;
      let c = 0;
      do {
        a = rand(2, 6) * 5;
        b = rand(2, 4) * 5;
        c = rand(1, 3) * 5;
      } while (income - a - b - c < 5);
      const left = income - a - b - c;
      return {
        prompt: `Your monthly income is ${income} coins. You plan ${a} for bus fare, ${b} for snacks and ${c} for games. How much is left to save?`,
        visual: <EmojiRow items={['🚌', '🍎', '🎮', '🐷']} label="Bus, snacks, games and savings" />,
        answer: String(left),
        hint: 'Add up all the money going out, then take it away from the money coming in.',
        explain: [`Money out: ${a} + ${b} + ${c} = ${a + b + c}.`, `${income} − ${a + b + c} = ${left}.`, `So ${left} coins are left to save.`],
      };
    }
    const income = pick([50, 80, 100]);
    const verdict = pick(['Balanced', 'Over budget', 'Money left over']);
    const target = income + (verdict === 'Balanced' ? 0 : verdict === 'Over budget' ? rand(1, 3) * 5 : -rand(1, 4) * 5);
    const between = (lo: number, hi: number) => 5 * rand(Math.ceil(lo / 5), Math.max(Math.ceil(lo / 5), Math.floor(hi / 5)));
    const a = between(target * 0.3, target * 0.45);
    const b = between(target * 0.2, target * 0.3);
    const parts = [a, b, target - a - b];
    const out = target;
    return choiceQuestion({
      prompt: `Income: ${income} coins. Plan: ${parts.join(' + ')}. Is the budget balanced, over budget, or is money left over?`,
      right: { value: verdict },
      wrong: ['Balanced', 'Over budget', 'Money left over'].filter((v) => v !== verdict).map((value) => ({ value })),
      hint: 'Add up the plan and compare it with the income.',
      explain: [`${parts.join(' + ')} = ${out}.`, out === income ? `${out} = ${income}, so it is Balanced.` : out > income ? `${out} is more than ${income}, so it is Over budget.` : `${out} is less than ${income}, so there is Money left over.`],
    });
  }

  if (level === 1) {
    const p = rand(1, 9) * 100;
    const r = rand(1, 10);
    const interest = (p * r) / 100;
    if (Math.random() < 0.6) {
      return {
        prompt: `You save ${p} coins at ${r}% simple interest a year. How much interest do you earn in 1 year?`,
        visual: <EmojiRow items={['🏦', '🐷']} label="A bank and a piggy bank" />,
        answer: String(interest),
        allowDecimal: !Number.isInteger(interest),
        hint: `${r}% means ${r} out of every 100. How many hundreds are in ${p}?`,
        explain: [`${p} is ${p / 100} hundreds.`, `Each hundred earns ${r}, so ${p / 100} × ${r} = ${interest}.`, `You earn ${interest} coins of interest.`],
      };
    }
    const pct = pick([10, 20, 25, 50]);
    const income = pick([40, 80, 120, 200]);
    const save = (income * pct) / 100;
    return {
      prompt: `You decide to save ${pct}% of your ${income} coins income. How many coins is that?`,
      answer: String(save),
      hint: pct === 50 ? 'Half of the income.' : pct === 25 ? 'A quarter: halve it, then halve again.' : `Find 10% first by dividing by 10.`,
      explain: [pct === 10 ? `10% of ${income} = ${income} ÷ 10.` : `${pct}% of ${income} = ${income} × ${pct} ÷ 100.`, `That is ${save}.`, `So you save ${save} coins.`],
    };
  }

  const p = rand(1, 8) * 100;
  const r = rand(2, 10);
  const perYear = (p * r) / 100;
  if (Math.random() < 0.6) {
    const t = rand(2, 6);
    const total = p + perYear * t;
    return {
      prompt: `You save ${p} coins at ${r}% simple interest a year. How much do you have after ${t} years?`,
      answer: String(total),
      allowDecimal: !Number.isInteger(total),
      hint: 'Find one year’s interest first. It is the same every year.',
      explain: [`One year: ${r}% of ${p} = ${perYear}.`, `${t} years: ${t} × ${perYear} = ${perYear * t}.`, `Total: ${p} + ${perYear * t} = ${total} coins.`],
    };
  }
  const t = rand(2, 8);
  const target = p + perYear * t;
  return choiceQuestion({
    prompt: `${p} coins earns ${r}% simple interest a year. How many years until it grows to ${target} coins?`,
    right: { value: String(t) },
    wrong: numberChoices(t, { count: 4, min: 1, spread: 2 })
      .filter((c) => c !== String(t))
      .map((value) => ({ value })),
    hint: 'How much interest is needed in total? How much comes each year?',
    explain: [`Interest needed: ${target} − ${p} = ${target - p}.`, `Each year adds ${r}% of ${p} = ${perYear}.`, `${target - p} ÷ ${perYear} = ${t} years.`],
  });
}

export const budgetsAndInterest: Lesson = {
  id: 'budgets-and-interest',
  title: 'Budgets and Interest',
  Thumb,
  Scene: MoneyScene,
  sceneHint: 'Balance a monthly budget · Then watch savings grow with interest',
  learn: {
    heading: 'Plan your money, then let it grow',
    intro: 'A budget is a plan for your money: money in (income) and money out (spending and saving). Savings in a bank can earn interest, extra money the bank pays you.',
    points: [
      { icon: Wallet, text: 'Income is money in. Expenses are money out.' },
      { icon: Scale, text: 'A balanced budget: money out (including savings) = money in. Needs come before wants.' },
      { icon: Percent, text: 'Simple interest each year = starting amount × rate ÷ 100.' },
      { icon: ChartColumnIncreasing, text: 'Total after some years = start + years × interest each year.' },
    ],
  },
  steps: ['List your income.', 'Plan needs first, then savings, then wants.', 'Check: total out = income. If it’s over, cut a want.', 'For interest: find one year’s interest, multiply by the years, then add the start.'],
  example: {
    question: 'You save 300 coins at 4% simple interest a year. How much after 3 years?',
    work: ['One year: 4% of 300 = 3 × 4 = 12.', 'Three years: 3 × 12 = 36.', '300 + 36 = 336.'],
    answer: '336 coins.',
  },
  grownups: [
    'Let your child plan a small real budget, such as pocket money or a day out, and check it afterwards together.',
    'Talk about needs versus wants, and why saving is planned first, not with whatever is left.',
    'Real savings accounts usually pay compound interest (interest on interest), which grows a little faster than the simple interest shown here.',
  ],
  makeQuestion,
};
