import { useState } from 'react';
import { Dices, PieChart, Repeat, Target } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { fmt } from '../../lib/answers';
import { pick, rand, round, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';

type Colour = 'red' | 'blue' | 'yellow' | 'green';
const COLOURS: Colour[] = ['red', 'blue', 'yellow', 'green'];
const FILL: Record<Colour, string> = { red: C.red, blue: C.blue, yellow: C.yellow, green: C.green };

const SPIN = { cx: 250, cy: 290, r: 160 };
const SCALE = { x: 660, y: 286, w: 290 };

function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = [cx + Math.sin(a0) * r, cy - Math.cos(a0) * r];
  const p1 = [cx + Math.sin(a1) * r, cy - Math.cos(a1) * r];
  return `M${cx},${cy} L${p0[0]},${p0[1]} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0},1 ${p1[0]},${p1[1]} Z`;
}

/** Words on the likelihood scale. */
function likelihood(p: number): string {
  if (p <= 0) return 'Impossible';
  if (p >= 1) return 'Certain';
  if (Math.abs(p - 0.5) < 1e-9) return 'Even chance';
  return p < 0.5 ? 'Unlikely' : 'Likely';
}

/** A spinner with equal sections. Drawn as a <g>. */
function Spinner({ cx, cy, r, sections, onTap, angle }: { cx: number; cy: number; r: number; sections: Colour[]; onTap?: (i: number) => void; angle?: number }) {
  const step = (Math.PI * 2) / sections.length;
  return (
    <g>
      <circle cx={cx + 6} cy={cy + 10} r={r + 8} fill={C.ink} opacity={0.12} />
      {sections.map((c, i) => (
        <path
          key={i}
          d={wedge(cx, cy, r, i * step, (i + 1) * step)}
          fill={FILL[c]}
          stroke={C.ink}
          strokeWidth={2.5}
          strokeLinejoin="round"
          onClick={onTap ? () => onTap(i) : undefined}
          style={onTap ? { cursor: 'pointer' } : undefined}
          data-nopan={onTap ? true : undefined}
          role={onTap ? 'button' : undefined}
          aria-label={onTap ? `Section ${i + 1}, ${c}. Tap to change colour` : undefined}
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.ink} strokeWidth={3} />
      {angle !== undefined && (
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          <path d={`M${cx - 10},${cy} L${cx},${cy - r * 0.86} L${cx + 10},${cy} Z`} fill={C.ink} stroke={C.white} strokeWidth={2} />
        </g>
      )}
      <circle cx={cx} cy={cy} r={14} fill={C.card} stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

/** A bag of counters. Drawn as a <g> centred on (cx, cy). */
function Bag({ cx, cy, counts, scale = 1 }: { cx: number; cy: number; counts: Record<Colour, number>; scale?: number }) {
  const items = COLOURS.flatMap((c) => Array.from({ length: counts[c] }, () => c));
  const cols = 4;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <path d="M-150,-110 C-160,40 -140,150 0,150 C140,150 160,40 150,-110 Z" fill={shade(C.wood, 0.25)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <path d="M-158,-118 h316 l-14,26 h-288 z" fill={shade(C.wood, -0.1)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      {items.map((c, i) => (
        <circle key={i} cx={-105 + (i % cols) * 70} cy={-50 + Math.floor(i / cols) * 62} r={25} fill={FILL[c]} stroke={C.ink} strokeWidth={2.5} />
      ))}
    </g>
  );
}

function ProbabilityScene() {
  const [mode, setMode] = useState<'spinner' | 'bag'>('spinner');
  const [sections, setSections] = useState<Colour[]>(['red', 'red', 'blue', 'blue', 'blue', 'yellow', 'yellow', 'green']);
  const [counts, setCounts] = useState<Record<Colour, number>>({ red: 3, blue: 2, yellow: 1, green: 0 });
  const [target, setTarget] = useState<Colour>('blue');
  const [tally, setTally] = useState<Record<Colour, number>>({ red: 0, blue: 0, yellow: 0, green: 0 });
  const [angle, setAngle] = useState(20);

  const outcomes: Colour[] = mode === 'spinner' ? sections : COLOURS.flatMap((c) => Array.from({ length: counts[c] }, () => c));
  const total = outcomes.length;
  const hits = outcomes.filter((c) => c === target).length;
  const p = total ? hits / total : 0;
  const trials = COLOURS.reduce((s, c) => s + tally[c], 0);

  const reset = () => setTally({ red: 0, blue: 0, yellow: 0, green: 0 });

  const run = (times: number) => {
    if (!total) return;
    const next = { ...tally };
    let last = 0;
    for (let i = 0; i < times; i++) {
      last = Math.floor(Math.random() * total);
      next[outcomes[last]] += 1;
    }
    setTally(next);
    if (mode === 'spinner') {
      const step = 360 / total;
      const turns = Math.ceil(angle / 360) * 360 + 720;
      setAngle(turns + last * step + step / 2);
    }
    play(times === 1 ? 'pop' : 'whoosh');
  };

  const recolour = (i: number) => {
    setSections((s) => s.map((c, j) => (j === i ? COLOURS[(COLOURS.indexOf(c) + 1) % COLOURS.length] : c)));
    reset();
    play('tap');
  };

  const setCount = (c: Colour, v: number) => {
    const others = total - counts[c];
    if (v < 0 || v + others > 12 || v + others < 1) return;
    setCounts({ ...counts, [c]: v });
    reset();
  };

  const markX = SCALE.x + SCALE.w * p;
  const verb = mode === 'spinner' ? 'Spin' : 'Pick';

  return (
    <SceneSvg label={`Probability of ${target} is ${hits} out of ${total}`}>
      <SvgButton x={60} y={24} w={150} h={48} fontSize={18} label="Spinner" active={mode === 'spinner'} color={mode === 'spinner' ? C.yellow : C.card} onClick={() => { setMode('spinner'); reset(); }} />
      <SvgButton x={222} y={24} w={190} h={48} fontSize={18} label="Bag of counters" active={mode === 'bag'} color={mode === 'bag' ? C.yellow : C.card} onClick={() => { setMode('bag'); reset(); }} />

      {mode === 'spinner' ? (
        <>
          <Spinner {...SPIN} sections={sections} onTap={recolour} angle={angle} />
          <text x={SPIN.cx} y={500} textAnchor="middle" fontSize={17} fill={C.muted}>
            Tap a part of the spinner to change its colour.
          </text>
        </>
      ) : (
        <>
          <Bag cx={SPIN.cx} cy={300} counts={counts} />
          {COLOURS.map((c, i) => {
            const x0 = 40 + i * 150;
            return (
              <g key={c}>
                <circle cx={x0 + 70} cy={500} r={16} fill={FILL[c]} stroke={C.ink} strokeWidth={2} />
                <SvgButton x={x0} y={528} w={44} h={44} fontSize={22} label="−" title={`One fewer ${c}`} onClick={() => setCount(c, counts[c] - 1)} disabled={counts[c] <= 0 || total <= 1} />
                <text x={x0 + 70} y={552} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.ink} className="num">{counts[c]}</text>
                <SvgButton x={x0 + 96} y={528} w={44} h={44} fontSize={22} label="+" title={`One more ${c}`} onClick={() => setCount(c, counts[c] + 1)} disabled={total >= 12} color={C.yellow} />
              </g>
            );
          })}
        </>
      )}

      {/* what we want, and its probability */}
      <text x={660} y={42} fontSize={15} fill={C.muted} className="caps">Chance of getting…</text>
      {COLOURS.map((c, i) => (
        <g key={c} onClick={() => { setTarget(c); play('tap'); }} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Choose ${c}`}>
          <circle cx={680 + i * 62} cy={80} r={target === c ? 24 : 20} fill={FILL[c]} stroke={C.ink} strokeWidth={target === c ? 4 : 2} />
        </g>
      ))}
      <rect x={660} y={118} width={290} height={118} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={720} y={160} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={700} fill={C.ink} className="num">{hits}</text>
      <line x1={690} y1={186} x2={750} y2={186} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <text x={720} y={212} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">{total}</text>
      <text x={780} y={162} fontSize={22} fontWeight={700} fill={C.ink}>{likelihood(p)}</text>
      <text x={780} y={196} fontSize={16} fill={C.ink2}>{hits} {target} out of {total}</text>

      {/* likelihood scale */}
      <line x1={SCALE.x} y1={SCALE.y} x2={SCALE.x + SCALE.w} y2={SCALE.y} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={SCALE.x + SCALE.w * v} y1={SCALE.y - 9} x2={SCALE.x + SCALE.w * v} y2={SCALE.y + 9} stroke={C.ink} strokeWidth={2} />
          <text x={SCALE.x + SCALE.w * v} y={SCALE.y + 26} textAnchor={v === 0 ? 'start' : v === 1 ? 'end' : 'middle'} fontSize={14} fill={C.muted}>
            {v === 0 ? 'impossible' : v === 1 ? 'certain' : 'even'}
          </text>
        </g>
      ))}
      <circle cx={markX} cy={SCALE.y} r={10} fill={FILL[target]} stroke={C.ink} strokeWidth={2.5} />

      {/* trials */}
      {[1, 10, 100].map((t, i) => (
        <SvgButton key={t} x={660 + i * 76} y={334} w={70} h={46} fontSize={14} label={`${verb} ${t}`} onClick={() => run(t)} color={i === 0 ? C.teal : C.card} textColor={i === 0 ? C.white : C.ink} />
      ))}
      <SvgButton x={888} y={334} w={70} h={46} fontSize={14} label="Reset" onClick={reset} disabled={!trials} />
      {COLOURS.map((c, i) => {
        const share = trials ? tally[c] / trials : 0;
        return (
          <g key={c}>
            <circle cx={672} cy={414 + i * 34} r={10} fill={FILL[c]} stroke={C.ink} strokeWidth={1.6} />
            <rect x={690} y={404 + i * 34} width={220} height={20} rx={6} fill={C.line} />
            <rect x={690} y={404 + i * 34} width={220 * share} height={20} rx={6} fill={FILL[c]} stroke={C.ink} strokeWidth={share ? 1.4 : 0} />
            <text x={918} y={414 + i * 34} dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.ink} className="num">{tally[c]}</text>
          </g>
        );
      })}
      <text x={660} y={566} fontSize={16} fill={C.ink} className="num">
        Experiment: {trials ? `${tally[target]}/${trials} = ${fmt(round(tally[target] / trials, 2))}` : 'not run yet'}
      </text>
      <text x={660} y={594} fontSize={16} fill={C.ink} className="num">
        Theory: {hits}/{total} = {fmt(round(p, 2))}
      </text>
      <text x={660} y={622} fontSize={14} fill={C.muted}>
        More trials → closer to the theory.
      </text>

      <Callout at={[SPIN.cx, SPIN.cy - SPIN.r]} box={[430, 96]} w={210} icon={PieChart} title="Equal parts" text="Each part is equally likely. Count the parts you want out of all the parts." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Spinner cx={42} cy={40} r={32} sections={['red', 'red', 'blue', 'blue', 'blue', 'yellow', 'yellow', 'green']} />
      <text x={98} y={44} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
        3/8
      </text>
    </svg>
  );
}

function SpinnerPicture({ sections }: { sections: Colour[] }) {
  return (
    <svg viewBox="-110 -110 230 234" role="img" aria-label={`A spinner with ${sections.length} equal parts: ${sections.join(', ')}`}>
      <Spinner cx={0} cy={0} r={96} sections={sections} />
    </svg>
  );
}

function BagPicture({ counts }: { counts: Record<Colour, number> }) {
  return (
    <svg viewBox="-170 -130 340 290" role="img" aria-label={`A bag with ${COLOURS.filter((c) => counts[c]).map((c) => `${counts[c]} ${c}`).join(', ')}`}>
      <Bag cx={0} cy={0} counts={counts} />
    </svg>
  );
}

function randomBag(maxTotal = 8): Record<Colour, number> {
  const counts: Record<Colour, number> = { red: 0, blue: 0, yellow: 0, green: 0 };
  const total = rand(3, maxTotal);
  for (let i = 0; i < total; i++) counts[pick(COLOURS.slice(0, 3))] += 1;
  return counts;
}

const LIKELIHOODS = ['Impossible', 'Unlikely', 'Even chance', 'Likely', 'Certain'];

/** Level 0: describe how likely an outcome is. */
function likelihoodWords(): Question {
  const kind = pick(['impossible', 'certain', 'some', 'some', 'even']);
  const counts: Record<Colour, number> = { red: 0, blue: 0, yellow: 0, green: 0 };
  let ask: Colour = 'red';
  if (kind === 'impossible') {
    counts.blue = rand(2, 4);
    counts.yellow = rand(1, 3);
    ask = 'red';
  } else if (kind === 'certain') {
    counts.red = rand(3, 6);
  } else if (kind === 'even') {
    const k = rand(2, 4);
    counts.red = k;
    counts.blue = k;
  } else {
    counts.red = rand(1, 6);
    counts.blue = rand(1, 6);
    if (counts.red === counts.blue) counts.blue += 1;
  }
  const total = COLOURS.reduce((s, c) => s + counts[c], 0);
  const answer = likelihood(counts[ask] / total);
  const others = shuffle(LIKELIHOODS.filter((w) => w !== answer)).slice(0, 3);
  return {
    prompt: `You pick one counter without looking. How likely is it to be red?`,
    visual: <BagPicture counts={counts} />,
    choices: shuffle([answer, ...others]).map((value) => ({ value })),
    answer,
    hint: 'Count the red counters and compare them with all the counters.',
    explain: [
      `There ${counts[ask] === 1 ? 'is' : 'are'} ${counts[ask]} red out of ${total} counters.`,
      counts[ask] === 0
        ? 'There is no red at all, so it cannot happen.'
        : counts[ask] === total
          ? 'Every counter is red, so it must happen.'
          : counts[ask] * 2 === total
            ? 'Exactly half are red.'
            : counts[ask] * 2 < total
              ? 'Fewer than half are red.'
              : 'More than half are red.',
      `So it is ${answer.toLowerCase()}.`,
    ],
  };
}

/** Distractor fractions for k/n that are not equal in value. */
function fractionChoices(k: number, n: number): Choice[] {
  const right = `${k}/${n}`;
  const value = k / n;
  const wrong = new Set<string>();
  for (const [a, b] of shuffle([
    [k, n - k],
    [n - k, n],
    [k + 1, n],
    [k - 1, n],
    [1, k],
    [k, n + 1],
  ])) {
    if (a > 0 && b > 0 && a <= b && Math.abs(a / b - value) > 1e-9) wrong.add(`${a}/${b}`);
  }
  wrong.delete(right);
  return shuffle([right, ...[...wrong].slice(0, 3)]).map((v) => ({ value: v }));
}

/** Level 1: probability as a fraction. */
function asFraction(): Question {
  if (Math.random() < 0.5) {
    const n = pick([4, 6, 8]);
    const sections = Array.from({ length: n }, () => pick<Colour>(['red', 'blue', 'yellow']));
    const want = pick(['red', 'blue', 'yellow'] as Colour[]);
    if (!sections.includes(want)) sections[rand(0, n - 1)] = want;
    if (sections.every((s) => s === want)) sections[0] = want === 'red' ? 'blue' : 'red';
    const k = sections.filter((s) => s === want).length;
    return {
      prompt: `What is the probability of landing on ${want}?`,
      visual: <SpinnerPicture sections={sections} />,
      choices: fractionChoices(k, n),
      answer: `${k}/${n}`,
      hint: 'Count the parts you want, and count ALL the parts.',
      explain: [`There are ${n} equal parts.`, `${k} of them ${k === 1 ? 'is' : 'are'} ${want}.`, `So the probability is ${k}/${n}.`],
    };
  }
  let counts = randomBag(9);
  while (counts.red === 0 || counts.red === COLOURS.reduce((s, c) => s + counts[c], 0)) counts = randomBag(9);
  const total = COLOURS.reduce((s, c) => s + counts[c], 0);
  return {
    prompt: 'You pick one counter without looking. What is the probability it is red?',
    visual: <BagPicture counts={counts} />,
    choices: fractionChoices(counts.red, total),
    answer: `${counts.red}/${total}`,
    hint: 'The bottom number is ALL the counters, not just the other colours.',
    explain: [`There are ${total} counters altogether.`, `${counts.red} of them ${counts.red === 1 ? 'is' : 'are'} red.`, `So the probability is ${counts.red}/${total}.`],
  };
}

/** Level 2: expected number of results. */
function expected(): Question {
  const n = pick([4, 5, 8, 10]);
  const k = rand(1, n - 1);
  const groups = rand(2, 10);
  const times = n * groups;
  const answer = groups * k;
  return {
    prompt: `A spinner has ${n} equal parts and ${k} ${k === 1 ? 'is' : 'are'} red. You spin it ${times} times. About how many reds would you expect?`,
    answer: String(answer),
    hint: `The chance of red is ${k} out of every ${n} spins.`,
    explain: [`The probability of red is ${k}/${n}.`, `${times} ÷ ${n} = ${groups} lots of ${n} spins.`, `${groups} × ${k} = ${answer} reds expected.`],
  };
}

/** Level 2: the probability of NOT getting something. */
function notProbability(): Question {
  const n = pick([5, 6, 8, 10, 12]);
  const k = rand(1, n - 1);
  return {
    prompt: `The probability of rain is ${k}/${n}. What is the probability of NO rain?`,
    choices: fractionChoices(n - k, n),
    answer: `${n - k}/${n}`,
    hint: 'Rain and no rain together make certain, which is 1 whole.',
    explain: [`Rain or no rain is certain: ${n}/${n}.`, `${n}/${n} − ${k}/${n} = ${n - k}/${n}.`, `The probability of no rain is ${n - k}/${n}.`],
  };
}

/** Level 2: experimental probability from results. */
function experimental(): Question {
  const trials = pick([20, 40, 50, 60]);
  const got = rand(Math.round(trials * 0.15), Math.round(trials * 0.6));
  return {
    prompt: `In ${trials} spins, blue came up ${got} times. What is the experimental probability of blue?`,
    choices: fractionChoices(got, trials),
    answer: `${got}/${trials}`,
    hint: 'Experimental probability = how many times it happened out of how many tries.',
    explain: [`Blue happened ${got} times.`, `There were ${trials} tries altogether.`, `So the experimental probability is ${got}/${trials}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return likelihoodWords();
  if (level === 1) return Math.random() < 0.75 ? asFraction() : likelihoodWords();
  return pick([expected, notProbability, experimental, asFraction])();
}

export const probability: Lesson = {
  id: 'probability',
  title: 'Probability',
  Thumb,
  Scene: ProbabilityScene,
  sceneHint: 'Change the spinner or the bag · Pick a colour · Run 10 or 100 trials',
  learn: {
    heading: 'Probability',
    intro: 'Probability tells us how likely something is, from impossible (0) to certain (1). When every outcome is equally likely, it is the number of ways you want out of all the ways.',
    points: [
      { icon: Target, text: 'Probability = outcomes you want ÷ all the outcomes.' },
      { icon: PieChart, text: 'Equal parts on a spinner are equally likely.' },
      { icon: Dices, text: 'Running more trials gets the experiment closer to the theory.' },
      { icon: Repeat, text: 'Something happening or not happening adds up to 1.' },
    ],
  },
  steps: [
    'Count all the possible outcomes (the bottom number).',
    'Count the outcomes you want (the top number).',
    'Write it as a fraction and place it on the scale from 0 to 1.',
    'Test it: run lots of trials and compare the results with your fraction.',
  ],
  example: {
    question: 'A spinner has 8 equal parts and 3 are blue. What is the probability of blue?',
    visual: <SpinnerPicture sections={['blue', 'red', 'blue', 'yellow', 'red', 'blue', 'yellow', 'green']} />,
    work: ['There are 8 equal parts in total.', '3 of them are blue, so 3 out of 8.'],
    answer: 'The probability of blue is 3/8.',
  },
  grownups: [
    'Make a spinner with a paper clip and a pencil, then predict, spin 20 times and compare.',
    'A common mix-up is comparing parts with parts (3 blue to 5 others = 3/5). The bottom number must be ALL the outcomes.',
    'Weather forecasts (“30% chance of rain”) and board games are great talking points.',
    'Coins and dice have no memory: after five heads, the next flip is still a half chance.',
  ],
  makeQuestion,
};
