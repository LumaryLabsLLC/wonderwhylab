import { useEffect, useState } from 'react';
import { Dna, Flower2, Grid2x2, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

/**
 * Mendel's peas: flower colour is controlled by one gene with two versions (alleles).
 * P (purple) is dominant, p (white) is recessive: only pp plants have white flowers.
 * A Punnett square shows the four equally likely ways the parents' alleles can combine.
 */
export type Genotype = 'PP' | 'Pp' | 'pp';
const GENOTYPES: Genotype[] = ['PP', 'Pp', 'pp'];
const PURPLE = '#8e44ad';
const WHITE = '#fbf8ff';

export const isPurple = (g: string) => g.includes('P');
/** The four Punnett square cells for two parents (row = parent A's allele, column = parent B's). */
export function punnett(a: Genotype, b: Genotype): string[] {
  const out: string[] = [];
  for (const x of a) for (const y of b) out.push(x === 'p' && y === 'P' ? 'Pp' : x + y);
  return out;
}
export const whiteCount = (a: Genotype, b: Genotype) => punnett(a, b).filter((g) => !isPurple(g)).length;

function Flower({ x, y, purple, size = 1 }: { x: number; y: number; purple: boolean; size?: number }) {
  const fill = purple ? PURPLE : WHITE;
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-15} rx={11} ry={16} fill={fill} stroke={C.ink} strokeWidth={2} transform={`rotate(${a})`} />
      ))}
      <circle r={8} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

function Plant({ x, ground, genotype, label }: { x: number; ground: number; genotype: Genotype; label: string }) {
  const purple = isPurple(genotype);
  return (
    <g>
      <path d={`M${x},${ground} C${x - 6},${ground - 50} ${x + 8},${ground - 90} ${x},${ground - 120}`} fill="none" stroke="#3f8f3a" strokeWidth={6} strokeLinecap="round" />
      <ellipse cx={x - 22} cy={ground - 50} rx={22} ry={10} fill="#5dbb63" stroke={C.ink} strokeWidth={2} transform={`rotate(-25 ${x - 22} ${ground - 50})`} />
      <ellipse cx={x + 22} cy={ground - 80} rx={22} ry={10} fill="#5dbb63" stroke={C.ink} strokeWidth={2} transform={`rotate(25 ${x + 22} ${ground - 80})`} />
      <Flower x={x} y={ground - 130} purple={purple} size={1.15} />
      <rect x={x - 34} y={ground} width={68} height={40} rx={8} fill="#c47a4a" stroke={C.ink} strokeWidth={2.5} />
      <text x={x} y={ground + 26} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.white}>
        {label}
      </text>
    </g>
  );
}

function Allele({ x, y, a }: { x: number; y: number; a: string }) {
  const big = a === 'P';
  return (
    <g>
      <circle cx={x} cy={y} r={17} fill={big ? PURPLE : WHITE} stroke={C.ink} strokeWidth={2.5} />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={800} fill={big ? C.white : C.ink}>
        {a}
      </text>
    </g>
  );
}

interface PeaChallenge extends Challenge {
  a: Genotype;
  b: Genotype;
}

const CHALLENGES: PeaChallenge[] = [
  {
    a: 'Pp',
    b: 'Pp',
    question: 'Two purple Pp plants: any white?',
    options: ['Yes', 'No'],
    actual: 'Yes',
    because: 'Each parent can pass on the hidden p. A seed that gets p from both is pp: white, about 1 in 4.',
  },
  {
    a: 'PP',
    b: 'pp',
    question: 'PP × pp: what colour?',
    options: ['Purple', 'White', 'Mixed'],
    actual: 'Purple',
    because: 'Every seed gets P from the PP parent, and P hides p. So all of them are purple.',
  },
  {
    a: 'pp',
    b: 'pp',
    question: 'pp × pp: what colour?',
    options: ['Purple', 'White', 'Mixed'],
    actual: 'White',
    because: 'Neither parent has a P to pass on, so every seed is pp: all white.',
  },
  {
    a: 'Pp',
    b: 'pp',
    question: 'Pp × pp: what colour?',
    options: ['Purple', 'White', 'Mixed'],
    actual: 'Mixed',
    because: 'Half the seeds get P (purple) and half get two p’s (white): about half and half.',
  },
];

const nextChallenge = (prev: PeaChallenge | null) => pick(CHALLENGES.filter((c) => c.a !== prev?.a || c.b !== prev?.b));

const PARENT_A = 600;
const PARENT_B = 840;
const PARENT_GROUND = 250;
const SQ = { x: 70, y: 260, cell: 120 };
const POTS = [520, 625, 730, 835];
const POT_GROUND = 560;

function HeredityScene() {
  const [a, setA] = useState<Genotype>('Pp');
  const [b, setB] = useState<Genotype>('Pp');
  const [grown, setGrown] = useState(false);
  const poe = usePoe<PeaChallenge>(nextChallenge);

  // Once the child predicts, set up the parents in the question.
  useEffect(() => {
    if (poe.guess === null) return;
    setA(poe.challenge.a);
    setB(poe.challenge.b);
    setGrown(false);
  }, [poe.guess, poe.challenge]);

  const cells = punnett(a, b);
  const whites = cells.filter((g) => !isPurple(g)).length;

  const choose = (which: 'a' | 'b', g: Genotype) => {
    (which === 'a' ? setA : setB)(g);
    setGrown(false);
    play('tap');
  };

  const grow = () => {
    setGrown(true);
    play('pop');
    if (poe.waiting && a === poe.challenge.a && b === poe.challenge.b) window.setTimeout(poe.observe, 700);
  };

  return (
    <SceneSvg label="Pea plant parents, a Punnett square and their seedlings">
      {/* Parents */}
      <text x={720} y={40} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        Parents
      </text>
      <text x={720} y={150} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.ink}>
        ×
      </text>
      {([['a', PARENT_A, a], ['b', PARENT_B, b]] as const).map(([which, x, g]) => (
        <g key={which}>
          <Plant x={x} ground={PARENT_GROUND - 40} genotype={g} label={g} />
          {GENOTYPES.map((opt, i) => (
            <SvgButton
              key={opt}
              x={x - 108 + i * 74}
              y={PARENT_GROUND + 14}
              w={68}
              h={44}
              fontSize={17}
              label={opt}
              title={`Parent ${which === 'a' ? 'A' : 'B'}: ${opt}`}
              active={g === opt}
              color={g === opt ? C.yellow : C.card}
              onClick={() => choose(which, opt)}
            />
          ))}
        </g>
      ))}

      {/* Punnett square */}
      <text x={SQ.x} y={SQ.y - 12} fontSize={15} fill={C.muted} className="caps">
        Punnett square
      </text>
      {[0, 1].map((col) => (
        <Allele key={`b${col}`} x={SQ.x + 50 + SQ.cell / 2 + col * SQ.cell} y={SQ.y + 22} a={b[col]} />
      ))}
      {[0, 1].map((row) => (
        <Allele key={`a${row}`} x={SQ.x + 22} y={SQ.y + 50 + SQ.cell / 2 + row * SQ.cell} a={a[row]} />
      ))}
      {cells.map((g, i) => {
        const x = SQ.x + 50 + (i % 2) * SQ.cell;
        const y = SQ.y + 50 + Math.floor(i / 2) * SQ.cell;
        return (
          <g key={i}>
            <rect x={x} y={y} width={SQ.cell} height={SQ.cell} fill={isPurple(g) ? shade(PURPLE, 0.8) : C.card} stroke={C.ink} strokeWidth={2.5} />
            <text x={x + SQ.cell / 2} y={y + 34} textAnchor="middle" fontSize={24} fontWeight={800} fill={C.ink}>
              {g}
            </text>
            <Flower x={x + SQ.cell / 2} y={y + 82} purple={isPurple(g)} size={0.75} />
          </g>
        );
      })}

      {/* Seedlings */}
      <SvgButton x={POTS[0] - 40} y={340} w={260} h={52} fontSize={19} label="🌱 Grow the seeds" color={C.teal} textColor={C.white} onClick={grow} />
      {poe.waiting && a === poe.challenge.a && b === poe.challenge.b && (
        <rect x={POTS[0] - 48} y={332} width={276} height={70} rx={14} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" pointerEvents="none" />
      )}
      {POTS.map((x, i) => (
        <g key={x}>
          {grown ? (
            <g className="pop-in" style={{ transformOrigin: `${x}px ${POT_GROUND}px`, animationDelay: `${i * 0.12}s` }}>
              <path d={`M${x},${POT_GROUND} L${x},${POT_GROUND - 70}`} stroke="#3f8f3a" strokeWidth={5} strokeLinecap="round" />
              <ellipse cx={x - 14} cy={POT_GROUND - 30} rx={14} ry={7} fill="#5dbb63" stroke={C.ink} strokeWidth={1.5} />
              <Flower x={x} y={POT_GROUND - 80} purple={isPurple(cells[i])} size={0.8} />
            </g>
          ) : (
            <ellipse cx={x} cy={POT_GROUND - 4} rx={8} ry={6} fill="#8a5a3a" stroke={C.ink} strokeWidth={1.5} />
          )}
          <path d={`M${x - 34},${POT_GROUND} L${x + 34},${POT_GROUND} L${x + 26},${POT_GROUND + 50} L${x - 26},${POT_GROUND + 50} Z`} fill="#c47a4a" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
          <text x={x} y={POT_GROUND + 32} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.white}>
            {cells[i]}
          </text>
        </g>
      ))}
      <text x={(POTS[0] + POTS[3]) / 2} y={POT_GROUND + 86} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
        {grown ? `Expected: ${4 - whites} purple, ${whites} white in every 4 seeds` : 'Press Grow to see the seedlings'}
      </text>

      {/* Predict → observe → explain */}
      <PoePanel x={40} y={16} w={420} poe={poe} />

      <Callout at={[SQ.x + 22, SQ.y + 50 + SQ.cell / 2]} box={[80, 580]} w={260} icon={Dna} title="Alleles" text="Each parent passes on one of its two alleles. Big P (purple) hides little p (white)." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={10 + (i % 2) * 26} y={10 + Math.floor(i / 2) * 26} width={26} height={26} fill={i === 3 ? '#ffffff' : shade(PURPLE, 0.75)} stroke={C.ink} strokeWidth={2} />
      ))}
      <Flower x={90} y={30} purple size={0.8} />
      <Flower x={90} y={62} purple={false} size={0.6} />
    </svg>
  );
}

// ---------- practice ----------

const CROSSES: [Genotype, Genotype][] = [
  ['PP', 'PP'],
  ['PP', 'Pp'],
  ['PP', 'pp'],
  ['Pp', 'Pp'],
  ['Pp', 'pp'],
  ['pp', 'pp'],
];

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['inherited', 'environment']) : level === 1 ? pick(['colour', 'dominant']) : pick(['count', 'parents', 'colour']);

  if (kind === 'inherited') {
    const right = 'the colour of a cat’s eyes';
    return {
      prompt: 'Which of these is inherited (passed on from parents)?',
      choices: shuffle([right, 'a dog that learned to sit', 'a scratch on a dog’s nose']).map((value) => ({ value })),
      answer: right,
      hint: 'Which one was the animal born with, from its parents?',
      explain: ['Learning a trick and getting a scratch happen during an animal’s life.', 'Eye colour comes from genes passed on by the parents.', 'So the colour of a cat’s eyes is inherited.'],
    };
  }
  if (kind === 'environment') {
    const right = 'its environment';
    return {
      prompt: 'A plant grown in a dark cupboard is pale and spindly. What caused that: its parents or its environment?',
      choices: [{ value: right }, { value: 'its parents' }],
      answer: right,
      hint: 'Would its seeds grow pale too if they were planted in sunlight?',
      explain: ['Its genes did not change; it just grew without light.', 'Its surroundings changed how it grew, not its genes.', 'So it was caused by its environment.'],
    };
  }
  if (kind === 'colour') {
    const g = pick(GENOTYPES);
    const purple = isPurple(g);
    return {
      prompt: `In peas, purple (P) is dominant over white (p). What colour are the flowers of a ${g} plant?`,
      choices: [{ value: 'purple' }, { value: 'white' }],
      answer: purple ? 'purple' : 'white',
      hint: 'Is there at least one big P?',
      explain: [g === 'pp' ? 'pp has no P at all.' : `${g} has at least one P.`, purple ? 'One P is enough to show purple, because P is dominant.' : 'Only pp plants show the recessive white.', `So a ${g} plant is ${purple ? 'purple' : 'white'}.`],
    };
  }
  if (kind === 'dominant') {
    const right = 'P is dominant and hides p';
    return {
      prompt: 'A pea plant has one P allele and one p allele. Why are its flowers purple?',
      choices: shuffle([right, 'p is dominant over P', 'the colours mix to light purple']).map((value) => ({ value })),
      answer: right,
      hint: 'Which allele shows when both are there?',
      explain: ['A dominant allele shows whenever it is present.', 'P (purple) is dominant; p (white) only shows in pp.', 'So the reason is: P is dominant and hides p.'],
    };
  }
  if (kind === 'parents') {
    // Answers are compared without case, so spell out each option (PP / Pp / pp would look identical).
    const right = 'Pp: one purple and one white allele';
    return {
      prompt: 'Two purple pea plants have some seeds with white flowers. What must both parents be?',
      choices: shuffle(['PP: two purple alleles', right, 'pp: two white alleles']).map((value) => ({ value })),
      answer: right,
      hint: 'A white seedling needs a p from each parent, but the parents are purple.',
      explain: ['A white seedling is pp, so each parent passed on a p.', 'Both parents are purple, so each also has a P.', `So both parents must be ${right}.`],
    };
  }
  const [pa, pb] = pick(CROSSES);
  const n = whiteCount(pa, pb);
  const grid = punnett(pa, pb);
  return {
    prompt: `Parents ${pa} × ${pb}. Out of 4 seeds, how many would we expect to have white flowers?`,
    choices: numberChoices(n, { min: 0, max: 4 }).map((value) => ({ value })),
    answer: String(n),
    hint: 'Draw the Punnett square and count the pp boxes.',
    explain: [`The four boxes are ${grid.join(', ')}.`, `Only pp is white: ${n === 0 ? 'there are none' : `${n} box${n === 1 ? '' : 'es'}`}.`, `So we expect ${n} white out of 4.`],
  };
}

export const heredity: Lesson = {
  id: 'heredity',
  title: 'Traits and Heredity',
  Thumb,
  Scene: HeredityScene,
  sceneHint: 'Predict, then grow the seeds · Change the parents',
  learn: {
    heading: 'Traits and heredity',
    intro: 'Living things pass features (traits) to their young through genes. Each parent gives one of its two versions of a gene, called alleles. Some traits are inherited; others come from the environment.',
    points: [
      { icon: Dna, text: 'You get one allele for each gene from each parent.' },
      { icon: Flower2, text: 'A dominant allele (P) hides a recessive one (p).' },
      { icon: Grid2x2, text: 'A Punnett square shows the possible offspring.' },
      { icon: Sun, text: 'Environment matters too: light, food and care change how living things grow.' },
    ],
  },
  steps: [
    'Write one parent’s two alleles across the top and the other’s down the side.',
    'Fill each box with one allele from the top and one from the side.',
    'Work out each box’s trait: any P shows purple; only pp is white.',
    'Count the boxes: each one is a 1 in 4 chance.',
  ],
  example: {
    question: 'Two Pp pea plants are crossed. What fraction of the seeds would we expect to have white flowers?',
    work: ['The boxes are PP, Pp, Pp and pp.', 'Only pp has white flowers.', 'That is 1 box out of 4.'],
    answer: 'About 1 in 4 (a quarter) would be white.',
  },
  grownups: [
    'Gregor Mendel worked this out in the 1860s by crossing thousands of pea plants.',
    'A Punnett square shows chances, not certainties: with only 4 seeds you might get 0 or 2 white ones, just like coin flips.',
    'Most real traits (like height) depend on many genes and the environment together; single-gene traits like pea flower colour are the simplest place to start.',
    'We use plants and animals here on purpose: talk about how every person is a unique mix, and avoid "good" or "bad" traits.',
  ],
  makeQuestion,
};
