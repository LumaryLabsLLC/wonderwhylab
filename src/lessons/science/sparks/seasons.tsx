import { useState } from 'react';
import { CalendarDays, Leaf, Snowflake, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { EMOJI_FONT } from '../../../games/reading/words';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from './visuals/DragToken';
import { useAnimationTime } from './visuals/anim';
import { byLevel, mcq } from './q';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAME: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
export const nextSeason = (s: Season): Season => SEASONS[(SEASONS.indexOf(s) + 1) % 4];

const SKY: Record<Season, string> = { spring: '#dff3ff', summer: '#bfe6ff', autumn: '#f3e6d4', winter: '#e3e9f2' };
const GROUND: Record<Season, string> = { spring: '#8fd17a', summer: '#6cc05a', autumn: '#c9b26a', winter: '#f4f7fb' };

/** Things to sort into their season. */
const THINGS: { id: string; emoji: string; name: string; season: Season }[] = [
  { id: 'tulip', emoji: '🌷', name: 'Tulip flower', season: 'spring' },
  { id: 'chick', emoji: '🐣', name: 'Baby chick', season: 'spring' },
  { id: 'shorts', emoji: '🩳', name: 'Shorts', season: 'summer' },
  { id: 'beach', emoji: '🏖️', name: 'Beach day', season: 'summer' },
  { id: 'leaves', emoji: '🍂', name: 'Falling leaves', season: 'autumn' },
  { id: 'pumpkin', emoji: '🎃', name: 'Pumpkin harvest', season: 'autumn' },
  { id: 'scarf', emoji: '🧣', name: 'Warm scarf', season: 'winter' },
  { id: 'snowman', emoji: '⛄', name: 'Snowman', season: 'winter' },
];

/** Predict → observe → explain: what happens to the tree in the next season? */
const PREDICT: Record<Season, { question: string; options: string[]; actual: string; because: string }> = {
  spring: {
    question: 'In spring, the tree will…',
    options: ['Grow new leaves', 'Stay bare'],
    actual: 'Grow new leaves',
    because: 'Days get longer and warmer, so the tree grows buds, new leaves and blossom.',
  },
  summer: {
    question: 'In summer, the leaves will…',
    options: ['Be big and green', 'Fall off'],
    actual: 'Be big and green',
    because: 'Long, warm, sunny days help the leaves grow big and green.',
  },
  autumn: {
    question: 'In autumn, the leaves will…',
    options: ['Change and fall', 'Stay green'],
    actual: 'Change and fall',
    because: 'It gets cooler and darker, so this tree’s leaves turn red and yellow and drop.',
  },
  winter: {
    question: 'In winter, the tree will…',
    options: ['Be bare', 'Grow flowers'],
    actual: 'Be bare',
    because: 'This tree rests in the cold with bare branches. Its buds wait for spring.',
  },
};

const TREE = { x: 250, ground: 520 };
const BOXES: Record<Season, Pt> = {
  spring: { x: 600, y: 236 },
  summer: { x: 785, y: 236 },
  autumn: { x: 600, y: 372 },
  winter: { x: 785, y: 372 },
};
const BOX = { w: 172, h: 120 };

function Emoji({ e, x = 0, y = 0, size = 40 }: { e: string; x?: number; y?: number; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontFamily={EMOJI_FONT}>
      {e}
    </text>
  );
}

/** The same tree through the year. */
export function SeasonTree({ season, t = 0, scale = 1 }: { season: Season; t?: number; scale?: number }) {
  const leaf = { spring: '#9ad66a', summer: '#3e9b4a', autumn: C.orange, winter: 'none' }[season];
  const blobs = [
    [-70, -190, 72],
    [10, -230, 80],
    [80, -180, 70],
    [-20, -150, 74],
    [50, -120, 56],
    [-80, -120, 52],
  ];
  return (
    <g transform={`scale(${scale})`}>
      {/* trunk and branches */}
      <path d="M-6,-118 Q-40,-170 -80,-190 M6,-118 Q40,-170 84,-196 M0,-130 L3,-250 M-40,-160 L-60,-215 M40,-160 L60,-225" fill="none" stroke="#5e3b1f" strokeWidth={13} strokeLinecap="round" />
      <path d="M-6,-118 Q-40,-170 -80,-190 M6,-118 Q40,-170 84,-196 M0,-130 L3,-250 M-40,-160 L-60,-215 M40,-160 L60,-225" fill="none" stroke="#8a5a33" strokeWidth={8} strokeLinecap="round" />
      <path d="M-18,0 L-9,-140 L9,-140 L18,0 Z" fill="#8a5a33" stroke="#5e3b1f" strokeWidth={3} strokeLinejoin="round" />
      {season !== 'winter' &&
        blobs.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={season === 'autumn' ? [C.orange, C.red, C.yellow][i % 3] : shade(leaf, i % 2 ? -0.08 : 0.05)} stroke={shade(season === 'autumn' ? C.orange : leaf, -0.3)} strokeWidth={2.5} opacity={season === 'spring' ? 0.85 : 1} />
        ))}
      {season === 'spring' &&
        [
          [-60, -200],
          [20, -250],
          [70, -190],
          [-10, -170],
          [40, -140],
          [-90, -140],
          [90, -150],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 7} cy={Math.sin((a * Math.PI) / 180) * 7} r={6} fill="#ffc7dd" />
            ))}
            <circle r={4} fill={C.yellow} />
          </g>
        ))}
      {season === 'autumn' &&
        [0, 1, 2, 3, 4].map((i) => {
          const fall = (t * 40 + i * 47) % 220;
          return <ellipse key={i} cx={-110 + i * 55 + Math.sin(t * 2 + i) * 14} cy={-150 + fall} rx={9} ry={5} fill={[C.orange, C.red, C.yellow][i % 3]} stroke="#8a4b1c" strokeWidth={1.5} transform={`rotate(${(t * 90 + i * 40) % 360} ${-110 + i * 55} ${-150 + fall})`} />;
        })}
      {season === 'winter' && (
        <g fill={C.white} stroke="#c9d6e6" strokeWidth={1.5}>
          <ellipse cx={-62} cy={-196} rx={20} ry={7} />
          <ellipse cx={66} cy={-202} rx={20} ry={7} />
          <ellipse cx={4} cy={-252} rx={14} ry={6} />
        </g>
      )}
    </g>
  );
}

function SeasonsScene() {
  const t = useAnimationTime();
  const [season, setSeason] = useState<Season>('winter');
  const [poe, setPoe] = useState<{ from: Season; guess: string | null }>({ from: 'winter', guess: null });
  const [observed, setObserved] = useState(false);
  const [placed, setPlaced] = useState<Record<string, Season>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [note, setNote] = useState('Sort each picture into its season.');

  const target = nextSeason(poe.from);
  const exp = PREDICT[target];

  const changeSeason = (s: Season) => {
    if (s === season) return;
    play('pop');
    setSeason(s);
    if (!observed && s === target) setObserved(true);
    else if (!observed) setPoe({ from: s, guess: null });
  };

  const boxAt = (p: Pt) => SEASONS.find((s) => p.x >= BOXES[s].x && p.x <= BOXES[s].x + BOX.w && p.y >= BOXES[s].y && p.y <= BOXES[s].y + BOX.h);
  const tryPlace = (id: string, s: Season | undefined) => {
    if (!s) return;
    const thing = THINGS.find((th) => th.id === id)!;
    setSelected(null);
    if (thing.season === s) {
      setPlaced((p) => ({ ...p, [id]: s }));
      setNote(`Yes! ${thing.name}: ${SEASON_NAME[s].toLowerCase()}.`);
      play('correct');
    } else {
      setShake((sh) => ({ ...sh, [id]: (sh[id] ?? 0) + 1 }));
      setNote(`Not yet. When would you see the ${thing.name.toLowerCase()}?`);
      play('wrong');
    }
  };

  const unplaced = THINGS.filter((th) => !placed[th.id]);
  const sunY = { spring: 175, summer: 140, autumn: 185, winter: 225 }[season];

  return (
    <SceneSvg label={`A tree in ${season}`}>
      {/* Sky, sun and ground */}
      <rect x={40} y={100} width={480} height={430} rx={24} fill={SKY[season]} stroke={C.line} strokeWidth={2} />
      <circle cx={430} cy={sunY} r={32} fill={C.yellow} stroke={C.orange} strokeWidth={3} />
      <text x={430} y={sunY + 54} textAnchor="middle" fontSize={14} fill={C.ink2}>
        {season === 'summer' ? 'Sun high · long days' : season === 'winter' ? 'Sun low · short days' : 'Days in between'}
      </text>
      <path d={`M40,${TREE.ground} L520,${TREE.ground} L520,506 Q520,530 496,530 L64,530 Q40,530 40,506 Z`} fill={GROUND[season]} />
      <rect x={40} y={TREE.ground - 6} width={480} height={20} fill={GROUND[season]} stroke={season === 'winter' ? '#d5dfec' : 'none'} />
      {season === 'winter' &&
        Array.from({ length: 14 }, (_, i) => (
          <text key={i} x={70 + ((i * 67) % 430)} y={130 + ((t * 30 + i * 53) % 370)} fontSize={16} fill={C.white} stroke="#9fb4cc" strokeWidth={0.6} textAnchor="middle">
            ❄
          </text>
        ))}
      <g transform={`translate(${TREE.x} ${TREE.ground})`}>
        <SeasonTree season={season} t={t} />
      </g>
      {season === 'autumn' &&
        [120, 170, 330, 380].map((x, i) => <ellipse key={x} cx={x} cy={TREE.ground + 4} rx={10} ry={5} fill={[C.orange, C.red, C.yellow, C.orange][i]} />)}

      {/* Season buttons */}
      {SEASONS.map((s, i) => (
        <SvgButton
          key={s}
          x={40 + i * 122}
          y={30}
          w={112}
          h={52}
          fontSize={17}
          label={SEASON_NAME[s]}
          active={season === s}
          color={season === s ? C.yellow : C.card}
          onClick={() => changeSeason(s)}
        />
      ))}

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard
          x={600}
          y={20}
          w={360}
          prediction={poe.guess}
          actual={exp.actual}
          because={exp.because}
          onAgain={() => {
            setObserved(false);
            setPoe({ from: season, guess: null });
          }}
        />
      ) : (
        <g>
          <PredictCard x={600} y={20} w={360} question={exp.question} options={exp.options} prediction={poe.guess} onPredict={(g) => setPoe({ ...poe, guess: g })} />
          {poe.guess && (
            <text x={614} y={136} fontSize={15} fill={C.ink2}>
              Now tap {SEASON_NAME[target]} to see!
            </text>
          )}
        </g>
      )}

      {/* Sorting boxes */}
      {SEASONS.map((s) => {
        const b = BOXES[s];
        const inBox = THINGS.filter((th) => placed[th.id] === s);
        return (
          <g key={s} onClick={() => selected && tryPlace(selected, s)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan>
            <rect x={b.x} y={b.y} width={BOX.w} height={BOX.h} rx={14} fill={shade(SKY[s], -0.02)} stroke={selected ? C.ink : C.line} strokeWidth={selected ? 3 : 2} strokeDasharray={selected ? undefined : '8 6'} />
            <text x={b.x + BOX.w / 2} y={b.y + BOX.h - 16} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink2}>
              {SEASON_NAME[s]}
            </text>
            {inBox.map((th, i) => (
              <Emoji key={th.id} e={th.emoji} x={b.x + 50 + i * 72} y={b.y + 46} size={40} />
            ))}
          </g>
        );
      })}
      <text x={600} y={530} fontSize={16} fill={C.ink2}>
        {unplaced.length ? note : 'All sorted! Every season has its own things.'}
      </text>
      {unplaced.length === 0 && <SvgButton x={600} y={548} w={120} h={44} fontSize={16} label="Again" onClick={() => { setPlaced({}); setNote('Sort each picture into its season.'); }} />}

      {/* Things to sort */}
      {unplaced.map((th, i) => (
        <DragToken
          key={th.id}
          x={90 + i * 110}
          y={612}
          label={th.name}
          selected={selected === th.id}
          shakeKey={shake[th.id] ?? 0}
          onTap={() => setSelected(selected === th.id ? null : th.id)}
          onDrop={(p) => tryPlace(th.id, boxAt(p))}
        >
          <circle r={36} fill={selected === th.id ? C.yellow : C.card} stroke={C.ink} strokeWidth={selected === th.id ? 3 : 2} />
          <Emoji e={th.emoji} size={38} />
        </DragToken>
      ))}

      <Callout at={[TREE.x, TREE.ground - 200]} box={[330, 430]} w={180} icon={Leaf} title="Same tree" text="It is the same tree all year. It changes with the seasons." />
      <Callout at={[430, sunY]} box={[60, 110]} w={180} icon={Sun} title="The Sun" text="In summer the Sun is higher and days are longer." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={4} width={56} height={36} fill="#dff3ff" />
      <rect x={60} y={4} width={56} height={36} fill="#bfe6ff" />
      <rect x={4} y={40} width={56} height={36} fill="#f3e6d4" />
      <rect x={60} y={40} width={56} height={36} fill="#e3e9f2" />
      <circle cx={32} cy={22} r={11} fill="#9ad66a" />
      <circle cx={88} cy={22} r={12} fill="#3e9b4a" />
      <circle cx={32} cy={56} r={11} fill={C.orange} />
      <path d="M88,70 L88,48 M88,56 L80,46 M88,54 L96,46" stroke="#6e4524" strokeWidth={3} strokeLinecap="round" />
      <rect x={4} y={4} width={112} height={72} rx={8} fill="none" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

function EmojiPicture({ emoji }: { emoji: string }) {
  return (
    <svg viewBox="0 0 160 110" role="img" aria-label={emoji}>
      <Emoji e={emoji} x={80} y={55} size={78} />
    </svg>
  );
}

const wrongSeasons = (answer: Season, n = 2) => shuffle(SEASONS.filter((s) => s !== answer)).slice(0, n).map((s) => SEASON_NAME[s]);

function whichSeason(): Question {
  const thing = pick(THINGS);
  const answer = SEASON_NAME[thing.season];
  const clue: Record<Season, string> = {
    spring: 'New flowers and baby animals arrive.',
    summer: 'It is hot and sunny, great for the beach.',
    autumn: 'Leaves change colour and fall, and crops are picked.',
    winter: 'It is cold, and in many places it snows.',
  };
  return mcq({
    prompt: `${thing.name}: which season?`,
    visual: <EmojiPicture emoji={thing.emoji} />,
    answer,
    wrong: wrongSeasons(thing.season),
    hint: 'Is it hot or cold? Are things growing, or falling?',
    explain: [clue[thing.season], `So ${thing.name.toLowerCase()} belongs to ${answer.toLowerCase()}.`],
  });
}

function whatToWear(): Question {
  const cold = Math.random() < 0.5;
  return mcq({
    prompt: cold ? 'It is snowy and cold. What should you wear?' : 'It is a hot summer day. What should you wear?',
    answer: cold ? 'A warm coat and scarf' : 'Shorts and a sun hat',
    wrong: cold ? ['Shorts and a sun hat', 'A swimsuit'] : ['A warm coat and scarf', 'Snow boots and gloves'],
    hint: cold ? 'What keeps your body warm?' : 'What keeps you cool and shades you from the Sun?',
    explain: cold
      ? ['Snow means it is very cold.', 'A warm coat and scarf keep your body heat in.']
      : ['Summer days are hot and sunny.', 'Shorts and a sun hat keep you cool and shaded.'],
  });
}

function comesAfter(): Question {
  const s = pick(SEASONS);
  const answer = SEASON_NAME[nextSeason(s)];
  return mcq({
    prompt: `Which season comes after ${SEASON_NAME[s].toLowerCase()}?`,
    answer,
    wrong: wrongSeasons(nextSeason(s)),
    hint: 'Say them in order: spring, summer, autumn, winter…',
    explain: ['The seasons go round in order: spring, summer, autumn, winter, then spring again.', `After ${SEASON_NAME[s].toLowerCase()} comes ${answer.toLowerCase()}.`],
  });
}

function squirrels(): Question {
  return mcq({
    prompt: 'When do squirrels collect nuts to eat later?',
    answer: 'Autumn',
    wrong: ['Spring', 'Summer'],
    hint: 'When do nuts and seeds fall from the trees?',
    explain: ['Lots of nuts are ripe in autumn.', 'Squirrels bury them so they have food in the cold winter.', 'So they collect nuts in autumn.'],
  });
}

function whyWarmer(): Question {
  return mcq({
    prompt: 'Why is summer warmer than winter?',
    answer: 'The Sun is higher and shines for longer',
    wrong: ['The Earth is closer to the Sun', 'The Sun gets bigger'],
    hint: 'Look at the Sun on the playground in summer and in winter.',
    explain: [
      'In summer the Sun is high in the sky and days are long, so we get lots of sunlight.',
      'It is not because the Earth is closer to the Sun.',
      'So the answer is: the Sun is higher and shines for longer.',
    ],
  });
}

function whyLeavesFall(): Question {
  return mcq({
    prompt: 'Why do many trees drop their leaves in autumn?',
    answer: 'To rest through the cold winter',
    wrong: ['Because they are sick', 'Because it is their birthday'],
    hint: 'What is coming after autumn? Is it a good time to grow?',
    explain: ['Winter is cold and dark, which is hard for leaves.', 'Many trees drop their leaves and rest until spring.', 'So they drop leaves to rest through the cold winter.'],
  });
}

function longestDays(): Question {
  return mcq({
    prompt: 'Which season has the longest days?',
    answer: 'Summer',
    wrong: ['Winter', 'Autumn'],
    hint: 'When is it still light at bedtime?',
    explain: ['In summer the Sun rises early and sets late.', 'So summer has the longest days.'],
  });
}

export const seasons: Lesson = {
  id: 'seasons',
  title: 'The Four Seasons',
  Thumb,
  Scene: SeasonsScene,
  sceneHint: 'Guess what the tree will do · Tap the next season · Sort the pictures',
  learn: {
    heading: 'The four seasons',
    intro: 'In many places the year has four seasons: spring, summer, autumn and winter. Each one has its own weather, and plants and animals change too.',
    points: [
      { icon: Leaf, text: 'Spring: new leaves, flowers and baby animals.' },
      { icon: Sun, text: 'Summer: hot, sunny and long days.' },
      { icon: CalendarDays, text: 'Autumn: leaves change colour and fall.' },
      { icon: Snowflake, text: 'Winter: cold, short days, and sometimes snow.' },
    ],
  },
  steps: [
    'Look at the tree in this season.',
    'Guess what it will look like in the next season.',
    'Tap the next season and see if you were right.',
    'Sort the pictures: when would you see each one?',
  ],
  example: {
    question: 'You see falling orange leaves and pumpkins. Which season is it?',
    work: ['Leaves change colour and fall in autumn.', 'Pumpkins are picked in autumn too.'],
    answer: 'It is autumn.',
  },
  grownups: [
    'Seasons happen because the Earth is tilted as it travels around the Sun, so we get more sunlight in summer and less in winter. They are not caused by the Earth getting closer to the Sun.',
    'Seasons are opposite in the southern half of the world, and places near the equator often have wet and dry seasons instead.',
    'Take a photo of the same tree each season and compare them together.',
  ],
  makeQuestion: (level) => byLevel(level, [[whichSeason, whatToWear], [comesAfter, squirrels, whichSeason, whatToWear], [whyWarmer, whyLeavesFall, longestDays, comesAfter]]),
};
