import { useState } from 'react';
import { Bug, RefreshCw, Sprout, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from './visuals/DragToken';
import { StageArt, StagePicture } from './visuals/stages';
import type { StageId } from './visuals/stages';
import { byLevel, mcq } from './q';

type Animal = 'butterfly' | 'frog';

const CYCLES: Record<Animal, { id: StageId; name: string }[]> = {
  butterfly: [
    { id: 'butterfly-egg', name: 'Egg' },
    { id: 'caterpillar', name: 'Caterpillar' },
    { id: 'chrysalis', name: 'Chrysalis' },
    { id: 'butterfly', name: 'Butterfly' },
  ],
  frog: [
    { id: 'frogspawn', name: 'Eggs (frogspawn)' },
    { id: 'tadpole', name: 'Tadpole' },
    { id: 'froglet', name: 'Froglet' },
    { id: 'frog', name: 'Frog' },
  ],
};

const CENTER = { x: 330, y: 340 };
const SLOTS: Pt[] = [
  { x: 330, y: 150 },
  { x: 520, y: 340 },
  { x: 330, y: 530 },
  { x: 140, y: 340 },
];
const SLOT = { w: 160, h: 130 };
const CARD_SPOTS: Pt[] = [
  { x: 735, y: 230 },
  { x: 895, y: 230 },
  { x: 735, y: 430 },
  { x: 895, y: 430 },
];

const RING_R = 190;

/** A dashed ring through the four boxes, with arrowheads pointing round the cycle (clockwise). */
function CycleRing() {
  return (
    <g>
      <circle cx={CENTER.x} cy={CENTER.y} r={RING_R} fill="none" stroke={C.muted} strokeWidth={4} strokeDasharray="10 9" />
      {[45, 135, 225, 315].map((deg) => {
        const a = (deg * Math.PI) / 180;
        const x = CENTER.x + Math.cos(a) * RING_R;
        const y = CENTER.y + Math.sin(a) * RING_R;
        return (
          <g key={deg} transform={`translate(${x} ${y}) rotate(${deg + 90})`}>
            <path d="M-14,-11 L12,0 L-14,11 Z" fill={C.muted} stroke={C.muted} strokeWidth={2} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

function CycleScene() {
  const [animal, setAnimal] = useState<Animal>('butterfly');
  const [order, setOrder] = useState(() => shuffle([0, 1, 2, 3]));
  const [placed, setPlaced] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<Record<number, number>>({});

  const stages = CYCLES[animal];
  const done = [0, 1, 2, 3].every((i) => placed[i]);

  const reset = (a: Animal) => {
    setAnimal(a);
    setOrder(shuffle([0, 1, 2, 3]));
    setPlaced({});
    setSelected(null);
  };

  const tryPlace = (stage: number, slot: number | undefined) => {
    if (slot === undefined) return;
    if (stage === slot) {
      setPlaced((p) => ({ ...p, [stage]: true }));
      setSelected(null);
      play([0, 1, 2, 3].filter((i) => placed[i]).length === 3 ? 'complete' : 'correct');
    } else {
      setShake((s) => ({ ...s, [stage]: (s[stage] ?? 0) + 1 }));
      setSelected(null);
      play('wrong');
    }
  };

  const slotAt = (p: Pt) => {
    const i = SLOTS.findIndex((s) => Math.abs(p.x - s.x) < SLOT.w / 2 + 20 && Math.abs(p.y - s.y) < SLOT.h / 2 + 20);
    return i >= 0 ? i : undefined;
  };

  return (
    <SceneSvg label={`The ${animal} life cycle`}>
      <SvgButton x={640} y={40} w={150} h={50} fontSize={18} label="Butterfly" active={animal === 'butterfly'} color={animal === 'butterfly' ? C.yellow : C.card} onClick={() => reset('butterfly')} />
      <SvgButton x={806} y={40} w={150} h={50} fontSize={18} label="Frog" active={animal === 'frog'} color={animal === 'frog' ? C.yellow : C.card} onClick={() => reset('frog')} />

      <CycleRing />

      <text x={CENTER.x} y={CENTER.y - 6} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
        {animal === 'butterfly' ? 'Butterfly' : 'Frog'}
      </text>
      <text x={CENTER.x} y={CENTER.y + 22} textAnchor="middle" fontSize={16} fill={done ? C.green : C.muted} fontWeight={done ? 700 : 400}>
        {done ? '…and round again!' : 'life cycle'}
      </text>

      {SLOTS.map((s, i) => (
        <g key={i} onClick={() => selected !== null && tryPlace(selected, i)} style={{ cursor: selected !== null ? 'pointer' : undefined }} data-nopan>
          <rect
            x={s.x - SLOT.w / 2}
            y={s.y - SLOT.h / 2}
            width={SLOT.w}
            height={SLOT.h}
            rx={18}
            fill={placed[i] ? C.card : 'rgba(255,255,255,0.5)'}
            stroke={placed[i] ? C.ink : selected !== null ? C.teal : C.line}
            strokeWidth={placed[i] ? 2.5 : 3}
            strokeDasharray={placed[i] ? undefined : '9 7'}
          />
          <circle cx={s.x - SLOT.w / 2 + 6} cy={s.y - SLOT.h / 2 + 6} r={16} fill={C.ink} />
          <text x={s.x - SLOT.w / 2 + 6} y={s.y - SLOT.h / 2 + 7} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.white}>
            {i + 1}
          </text>
          {placed[i] && (
            <g>
              <g transform={`translate(${s.x} ${s.y - 10})`}>
                <StageArt id={stages[i].id} s={0.9} />
              </g>
              <text x={s.x} y={s.y + 50} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
                {stages[i].name}
              </text>
            </g>
          )}
        </g>
      ))}

      {order.map((stage, k) =>
        placed[stage] ? null : (
          <DragToken
            key={`${animal}-${stage}`}
            x={CARD_SPOTS[k].x}
            y={CARD_SPOTS[k].y}
            label={stages[stage].name}
            selected={selected === stage}
            shakeKey={shake[stage] ?? 0}
            onTap={() => setSelected(selected === stage ? null : stage)}
            onDrop={(p) => tryPlace(stage, slotAt(p))}
          >
            <rect x={-72} y={-66} width={144} height={132} rx={16} fill={selected === stage ? C.yellow : C.card} stroke={C.ink} strokeWidth={selected === stage ? 3 : 2.5} />
            <g transform="translate(0 -10)">
              <StageArt id={stages[stage].id} s={0.85} />
            </g>
            <text x={0} y={50} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
              {stages[stage].name}
            </text>
          </DragToken>
        ),
      )}
      {done && <SvgButton x={735} y={300} w={220} h={52} fontSize={18} label="Mix them up" color={C.teal} textColor={C.white} onClick={() => reset(animal)} />}
      {!done && (
        <text x={815} y={560} textAnchor="middle" fontSize={15} fill={C.muted}>
          Drag each stage into its box, 1 to 4
        </text>
      )}

      <Callout at={[CENTER.x, CENTER.y + 40]} box={[200, 600]} w={240} icon={RefreshCw} title="A cycle" text="The grown-up lays eggs, so it all starts again." />
      <Callout at={[SLOTS[1].x + 60, SLOTS[1].y]} box={[560, 480]} w={200} icon={Sprout} title="Growing" text="Each stage looks very different!" />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <circle cx={60} cy={40} r={28} fill="none" stroke={C.line} strokeWidth={3} strokeDasharray="6 5" />
      <g transform="translate(60 14) scale(0.32)">
        <StageArt id="butterfly" />
      </g>
      <g transform="translate(90 44) scale(0.28)">
        <StageArt id="chrysalis" />
      </g>
      <g transform="translate(60 68) scale(0.28)">
        <StageArt id="caterpillar" />
      </g>
      <g transform="translate(28 42) scale(0.26)">
        <StageArt id="butterfly-egg" />
      </g>
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

function hatchesFromEgg(): Question {
  const labels = {
    Caterpillar: <StagePicture id="caterpillar" />,
    Butterfly: <StagePicture id="butterfly" />,
    Tadpole: <StagePicture id="tadpole" />,
  };
  return mcq({
    prompt: 'What hatches out of a butterfly egg?',
    answer: 'Caterpillar',
    wrong: ['Butterfly', 'Tadpole'],
    labels,
    names: { Caterpillar: 'A caterpillar', Butterfly: 'A butterfly', Tadpole: 'A tadpole' },
    hint: 'Look at stage 2 of the butterfly cycle.',
    explain: ['A butterfly lays tiny eggs on a leaf.', 'A hungry caterpillar hatches out.', 'So the answer is a caterpillar.'],
  });
}

function tadpoleGrows(): Question {
  const labels = {
    Frog: <StagePicture id="frog" />,
    Butterfly: <StagePicture id="butterfly" />,
    Caterpillar: <StagePicture id="caterpillar" />,
  };
  return mcq({
    prompt: 'A tadpole grows up into…',
    answer: 'Frog',
    wrong: ['Butterfly', 'Caterpillar'],
    labels,
    names: { Frog: 'A frog', Butterfly: 'A butterfly', Caterpillar: 'A caterpillar' },
    hint: 'Tadpoles live in ponds. What else lives there and hops?',
    explain: ['A tadpole grows legs and becomes a froglet.', 'The froglet loses its tail.', 'It grows up into a frog.'],
  });
}

const NEXT: { animal: Animal; after: number }[] = [
  { animal: 'butterfly', after: 0 },
  { animal: 'butterfly', after: 1 },
  { animal: 'butterfly', after: 2 },
  { animal: 'frog', after: 1 },
  { animal: 'frog', after: 2 },
];

function comesNext(): Question {
  const n = NEXT[Math.floor(Math.random() * NEXT.length)];
  const cycle = CYCLES[n.animal];
  const now = cycle[n.after];
  const next = cycle[n.after + 1];
  const others = cycle.filter((_, i) => i !== n.after + 1 && i !== n.after).map((s) => s.name);
  return mcq({
    prompt: `In the ${n.animal} life cycle, what comes right after the ${now.name.toLowerCase().replace(' (frogspawn)', '')}?`,
    answer: next.name,
    wrong: others,
    hint: 'Follow the arrows round the circle on the playground.',
    explain: [`The ${n.animal} cycle goes: ${cycle.map((s) => s.name.toLowerCase().replace(' (frogspawn)', '')).join(', ')}.`, `Right after the ${now.name.toLowerCase().replace(' (frogspawn)', '')} comes the ${next.name.toLowerCase()}.`],
  });
}

function comesBefore(): Question {
  const animal: Animal = Math.random() < 0.5 ? 'butterfly' : 'frog';
  const cycle = CYCLES[animal];
  const before = cycle[2];
  return mcq({
    prompt: `What comes right before the grown-up ${animal}?`,
    answer: before.name,
    wrong: [cycle[0].name, cycle[1].name],
    hint: 'Find the grown-up on the cycle and go back one arrow.',
    explain: [`The ${animal} cycle goes: ${cycle.map((s) => s.name.toLowerCase().replace(' (frogspawn)', '')).join(', ')}.`, `Right before the grown-up ${animal} is the ${before.name.toLowerCase()}.`],
  });
}

function facts(): Question {
  const options = [
    {
      prompt: 'Where do tadpoles live?',
      answer: 'In water',
      wrong: ['In trees', 'Under the ground'],
      hint: 'Tadpoles swim with their tails.',
      explain: ['Frogs lay their eggs in ponds.', 'Tadpoles hatch and swim with their tails, so they live in water.'],
    },
    {
      prompt: 'What does a caterpillar spend most of its time doing?',
      answer: 'Eating leaves and growing',
      wrong: ['Flying', 'Swimming'],
      hint: 'Caterpillars are very hungry!',
      explain: ['A caterpillar munches leaf after leaf.', 'It gets bigger and bigger: eating leaves and growing.'],
    },
    {
      prompt: 'Inside the chrysalis, the caterpillar…',
      answer: 'Changes into a butterfly',
      wrong: ['Lays eggs', 'Turns into a frog'],
      hint: 'What comes out of the chrysalis at the end?',
      explain: ['The caterpillar stays inside the chrysalis for days or weeks.', 'Its body changes completely, so it changes into a butterfly.'],
    },
    {
      prompt: 'Why is it called a life cycle?',
      answer: 'It goes round and starts again',
      wrong: ['It has wheels', 'It only happens once'],
      hint: 'What does the grown-up do at the end of the circle?',
      explain: ['The grown-up butterfly or frog lays eggs.', 'New babies hatch, so it goes round and starts again.'],
    },
  ];
  return mcq(options[Math.floor(Math.random() * options.length)]);
}

export const lifeCycles: Lesson = {
  id: 'life-cycles',
  title: 'Life Cycles',
  Thumb,
  Scene: CycleScene,
  sceneHint: 'Drag each stage into the right box · Try the frog too',
  learn: {
    heading: 'Life cycles',
    intro: 'Animals change as they grow up. A butterfly starts as an egg, then a caterpillar, then a chrysalis. A frog starts as an egg, then a tadpole, then a froglet. Then the grown-ups lay eggs and it starts again.',
    points: [
      { icon: Bug, text: 'Butterfly: egg → caterpillar → chrysalis → butterfly.' },
      { icon: Waves, text: 'Frog: eggs → tadpole → froglet → frog.' },
      { icon: RefreshCw, text: 'It is a cycle: the grown-ups lay eggs and it begins again.' },
    ],
  },
  steps: [
    'Start with the egg.',
    'Think: what hatches out of it?',
    'What does that baby grow into next?',
    'Keep going until you reach the grown-up, who lays new eggs.',
  ],
  example: {
    question: 'What comes right after the caterpillar?',
    visual: <StagePicture id="chrysalis" />,
    work: ['The caterpillar eats and grows big.', 'Then it hangs up and makes a hard case around itself.'],
    answer: 'The chrysalis comes next.',
  },
  grownups: [
    'Look under leaves in spring for eggs and caterpillars, or visit a pond to spot tadpoles (look, don’t take).',
    'Ask your child to retell a cycle in order using “first, next, then, last”.',
    '“The Very Hungry Caterpillar” is a lovely book to read alongside this lesson.',
  ],
  makeQuestion: (level) => byLevel(level, [[hatchesFromEgg, tadpoleGrows], [comesNext, comesBefore], [facts, comesNext, comesBefore]]),
};
