import { useRef, useState } from 'react';
import { Apple, Droplets, Smile, Wheat } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, toSvgPoint, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { EMOJI_FONT } from '../../../games/reading/words';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from './visuals/DragToken';
import { byLevel, mcq } from './q';

export type Group = 'fruitveg' | 'grains' | 'protein' | 'dairy' | 'sometimes';

export const GROUP: Record<Group, { name: string; job: string; color: string }> = {
  fruitveg: { name: 'Fruit and vegetables', job: 'vitamins to keep you well', color: '#9ad66a' },
  grains: { name: 'Grains', job: 'energy to run and play', color: '#f2c46b' },
  protein: { name: 'Protein', job: 'help to grow and repair muscles', color: '#f0a98d' },
  dairy: { name: 'Dairy', job: 'calcium for strong bones and teeth', color: '#bfe0ff' },
  sometimes: { name: 'Sometimes foods', job: 'a tasty treat now and then', color: '#f6c6dd' },
};

export const FOODS: { id: string; emoji: string; name: string; group: Group }[] = [
  { id: 'apple', emoji: '🍎', name: 'Apple', group: 'fruitveg' },
  { id: 'carrot', emoji: '🥕', name: 'Carrot', group: 'fruitveg' },
  { id: 'broccoli', emoji: '🥦', name: 'Broccoli', group: 'fruitveg' },
  { id: 'banana', emoji: '🍌', name: 'Banana', group: 'fruitveg' },
  { id: 'bread', emoji: '🍞', name: 'Bread', group: 'grains' },
  { id: 'rice', emoji: '🍚', name: 'Rice', group: 'grains' },
  { id: 'fish', emoji: '🐟', name: 'Fish', group: 'protein' },
  { id: 'egg', emoji: '🥚', name: 'Egg', group: 'protein' },
  { id: 'milk', emoji: '🥛', name: 'Milk', group: 'dairy' },
  { id: 'cheese', emoji: '🧀', name: 'Cheese', group: 'dairy' },
  { id: 'cake', emoji: '🍰', name: 'Cake', group: 'sometimes' },
  { id: 'candy', emoji: '🍬', name: 'Sweets', group: 'sometimes' },
];

const PLATE = { x: 270, y: 330, r: 190 };
const CUP = { x: 540, y: 230, r: 58 };
const SHELF = { x: 630, y: 40, w: 330, h: 110 };
const TOOTH = { x: 790, y: 330 };

/** Where on the plate (or cup, or shelf) a point lands. */
function zoneAt(p: Pt): Group | undefined {
  if (p.x >= SHELF.x && p.x <= SHELF.x + SHELF.w && p.y >= SHELF.y && p.y <= SHELF.y + SHELF.h) return 'sometimes';
  if (Math.hypot(p.x - CUP.x, p.y - CUP.y) <= CUP.r + 14) return 'dairy';
  if (Math.hypot(p.x - PLATE.x, p.y - PLATE.y) > PLATE.r + 10) return undefined;
  if (p.x < PLATE.x) return 'fruitveg';
  return p.y < PLATE.y ? 'grains' : 'protein';
}

/** Spots for foods already placed in each zone. */
const SPOTS: Record<Group, Pt[]> = {
  fruitveg: [
    { x: 170, y: 250 },
    { x: 165, y: 350 },
    { x: 225, y: 300 },
    { x: 220, y: 410 },
  ],
  grains: [
    { x: 330, y: 250 },
    { x: 400, y: 290 },
  ],
  protein: [
    { x: 330, y: 400 },
    { x: 400, y: 360 },
  ],
  dairy: [
    { x: 520, y: 230 },
    { x: 560, y: 230 },
  ],
  sometimes: [
    { x: 870, y: 98 },
    { x: 925, y: 98 },
  ],
};

function Emoji({ e, x = 0, y = 0, size = 40 }: { e: string; x?: number; y?: number; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontFamily={EMOJI_FONT}>
      {e}
    </text>
  );
}

const PLAQUE: Pt[] = [
  { x: -40, y: -40 },
  { x: 30, y: -50 },
  { x: -10, y: -10 },
  { x: 45, y: 5 },
  { x: -45, y: 20 },
  { x: 15, y: 35 },
];

function Wedge({ from, to, color }: { from: number; to: number; color: string }) {
  const p = (deg: number) => [PLATE.x + Math.cos((deg * Math.PI) / 180) * (PLATE.r - 14), PLATE.y + Math.sin((deg * Math.PI) / 180) * (PLATE.r - 14)];
  const [x1, y1] = p(from);
  const [x2, y2] = p(to);
  const large = to - from > 180 ? 1 : 0;
  return <path d={`M${PLATE.x},${PLATE.y} L${x1},${y1} A${PLATE.r - 14},${PLATE.r - 14} 0 ${large} 1 ${x2},${y2} Z`} fill={shade(color, 0.45)} stroke={C.white} strokeWidth={4} />;
}

function FoodScene() {
  const [placed, setPlaced] = useState<Record<string, Group>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [note, setNote] = useState('Drag each food to the right part of the plate.');
  const [clean, setClean] = useState(0);
  const [brush, setBrush] = useState<Pt>({ x: 905, y: 440 });
  const scrub = useRef<{ last: Pt; dist: number } | null>(null);

  const tryPlace = (id: string, zone: Group | undefined) => {
    if (!zone) return;
    const food = FOODS.find((f) => f.id === id)!;
    setSelected(null);
    const full = Object.values(placed).filter((g) => g === zone).length >= SPOTS[zone].length;
    if (food.group === zone && !full) {
      setPlaced((p) => ({ ...p, [id]: zone }));
      setNote(`${food.name} gives you ${GROUP[zone].job}.`);
      play('correct');
      return;
    }
    setShake((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
    play('wrong');
    if (food.group === zone) setNote(`That part is full. Try another food!`);
    else if (food.group === 'sometimes') setNote(`${food.name} is a sometimes food: fine for a treat! Try the Sometimes shelf.`);
    else setNote(`Not yet. What kind of food is ${food.name.toLowerCase()}?`);
  };

  const count = (g: Group) => Object.values(placed).filter((z) => z === g).length;
  const balanced = count('fruitveg') >= 2 && count('grains') >= 1 && count('protein') >= 1 && count('dairy') >= 1;
  const unplaced = FOODS.filter((f) => !placed[f.id]);

  const brushDrag = useSvgDrag(
    (p) => {
      const pos = { x: clamp(p.x, 640, 960), y: clamp(p.y, 190, 500) };
      setBrush(pos);
      const s = scrub.current;
      if (!s) return;
      const onTooth = Math.abs(pos.x - TOOTH.x) < 90 && Math.abs(pos.y - TOOTH.y) < 100;
      if (onTooth) {
        s.dist += Math.hypot(pos.x - s.last.x, pos.y - s.last.y);
        if (s.dist > 100) {
          s.dist = 0;
          setClean((c) => {
            const next = Math.min(PLAQUE.length, c + 1);
            if (next === PLAQUE.length && c < PLAQUE.length) play('correct');
            return next;
          });
        }
      }
      s.last = pos;
    },
    {
      onStart: (p) => {
        scrub.current = { last: p, dist: 0 };
      },
      onEnd: () => {
        scrub.current = null;
      },
    },
  );

  const sparkly = clean >= PLAQUE.length;

  return (
    <SceneSvg label="A plate to fill with food groups, and a tooth to brush">
      {/* Food-group checklist */}
      {(['fruitveg', 'grains', 'protein', 'dairy'] as Group[]).map((g, i) => {
        const ok = g === 'fruitveg' ? count(g) >= 2 : count(g) >= 1;
        return (
          <g key={g}>
            <rect x={40 + i * 118} y={36} width={110} height={44} rx={22} fill={ok ? GROUP[g].color : C.white} stroke={ok ? C.ink : C.line} strokeWidth={2} />
            <text x={95 + i * 118} y={59} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} fill={C.ink}>
              {ok ? '✓ ' : ''}
              {g === 'fruitveg' ? 'Fruit & veg' : GROUP[g].name}
            </text>
          </g>
        );
      })}

      {/* Plate */}
      <circle cx={PLATE.x + 4} cy={PLATE.y + 8} r={PLATE.r} fill={C.ink} opacity={0.12} />
      <circle cx={PLATE.x} cy={PLATE.y} r={PLATE.r} fill={C.white} stroke={C.ink} strokeWidth={3} />
      <Wedge from={90} to={270} color={GROUP.fruitveg.color} />
      <Wedge from={270} to={360} color={GROUP.grains.color} />
      <Wedge from={0} to={90} color={GROUP.protein.color} />
      <text x={190} y={470} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(GROUP.fruitveg.color, -0.55)}>
        Fruit &amp; veg (half!)
      </text>
      <text x={370} y={200} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(GROUP.grains.color, -0.55)}>
        Grains
      </text>
      <text x={372} y={462} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(GROUP.protein.color, -0.55)}>
        Protein
      </text>
      {balanced && (
        <g className="pop-in" style={{ transformOrigin: `${PLATE.x}px 112px` }}>
          <rect x={PLATE.x - 90} y={90} width={180} height={44} rx={22} fill={C.green} stroke={C.ink} strokeWidth={2} />
          <text x={PLATE.x} y={112} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.white}>
            Balanced plate!
          </text>
        </g>
      )}

      {/* Dairy cup and water */}
      <circle cx={CUP.x} cy={CUP.y} r={CUP.r} fill={shade(GROUP.dairy.color, 0.3)} stroke={C.ink} strokeWidth={2.5} />
      <text x={CUP.x} y={CUP.y + CUP.r + 22} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(GROUP.dairy.color, -0.55)}>
        Dairy
      </text>
      <g transform="translate(540 400)">
        <path d="M-30,-50 L30,-50 L24,40 L-24,40 Z" fill={C.white} stroke={C.ink} strokeWidth={2.5} />
        <path d="M-27,-24 L27,-24 L24,38 L-24,38 Z" fill={shade(C.blue, 0.6)} />
        <path d="M-30,-50 L30,-50 L24,40 L-24,40 Z" fill="none" stroke={C.ink} strokeWidth={2.5} />
        <text x={0} y={66} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink2}>
          Water
        </text>
        <text x={0} y={86} textAnchor="middle" fontSize={13} fill={C.muted}>
          best everyday drink
        </text>
      </g>

      {/* Sometimes shelf */}
      <rect x={SHELF.x} y={SHELF.y} width={SHELF.w} height={SHELF.h} rx={16} fill={shade(GROUP.sometimes.color, 0.4)} stroke={selected ? C.ink : C.line} strokeWidth={2} strokeDasharray={selected ? undefined : '8 6'} />
      <text x={SHELF.x + 16} y={SHELF.y + 26} fontSize={15} fontWeight={700} fill={C.ink2}>
        Sometimes foods
      </text>
      <text x={SHELF.x + 16} y={SHELF.y + 46} fontSize={13} fill={C.muted}>
        Tasty treats, now and then
      </text>

      {/* Placed foods */}
      {FOODS.filter((f) => placed[f.id]).map((f) => {
        const g = placed[f.id];
        const i = FOODS.filter((x) => placed[x.id] === g).indexOf(f);
        const spot = SPOTS[g][i];
        return <Emoji key={f.id} e={f.emoji} x={spot.x} y={spot.y} size={g === 'dairy' ? 34 : 44} />;
      })}

      {/* Zones you can tap after choosing a food */}
      {selected && (
        <g data-nopan>
          <circle cx={PLATE.x} cy={PLATE.y} r={PLATE.r} fill="transparent" style={{ cursor: 'pointer' }} onClick={(e) => {
            const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
            tryPlace(selected, zoneAt(toSvgPoint(svg, e.clientX, e.clientY)));
          }} />
          <circle cx={CUP.x} cy={CUP.y} r={CUP.r} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => tryPlace(selected, 'dairy')} />
          <rect x={SHELF.x} y={SHELF.y} width={SHELF.w} height={SHELF.h} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => tryPlace(selected, 'sometimes')} />
        </g>
      )}

      {/* Tooth brushing */}
      <text x={790} y={196} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink2}>
        {sparkly ? 'Sparkly clean!' : 'Drag the brush to scrub the tooth'}
      </text>
      <g transform={`translate(${TOOTH.x} ${TOOTH.y})`}>
        <path d="M-70,-70 C-70,-110 -20,-104 0,-90 C20,-104 70,-110 70,-70 C70,-30 54,10 46,60 C40,96 22,98 16,60 C12,34 -12,34 -16,60 C-22,98 -40,96 -46,60 C-54,10 -70,-30 -70,-70 Z" fill={C.white} stroke={C.ink} strokeWidth={3} />
        {PLAQUE.map((p, i) => (i >= clean ? <circle key={i} cx={p.x} cy={p.y} r={14} fill="#e8d36a" opacity={0.85} /> : null))}
        {sparkly && [[-50, -80], [50, -70], [0, -20]].map(([x, y], i) => <path key={i} d={`M${x},${y - 12} L${x + 3},${y - 3} L${x + 12},${y} L${x + 3},${y + 3} L${x},${y + 12} L${x - 3},${y + 3} L${x - 12},${y} L${x - 3},${y - 3} Z`} fill={C.yellow} />)}
      </g>
      <text x={790} y={462} textAnchor="middle" fontSize={13} fill={C.muted}>
        Brush for 2 minutes, twice a day
      </text>
      <g transform={`translate(${brush.x} ${brush.y}) rotate(-35)`} {...brushDrag} aria-label="Toothbrush" role="slider" aria-valuenow={clean}>
        <rect x={-14} y={-60} width={56} height={150} fill="transparent" />
        <rect x={0} y={-10} width={22} height={90} rx={10} fill={C.blue} stroke={C.ink} strokeWidth={2.5} />
        <rect x={-4} y={-52} width={30} height={44} rx={6} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={2 + i * 7} y1={-50} x2={2 + i * 7} y2={-12} stroke="#9fd3ff" strokeWidth={3} />
        ))}
      </g>
      {sparkly && <SvgButton x={880} y={474} w={84} h={40} fontSize={14} label="Again" onClick={() => setClean(0)} />}

      <text x={40} y={556} fontSize={16} fill={C.ink2}>
        {unplaced.length ? note : 'Everything has a place! Well done.'}
      </text>
      {unplaced.length === 0 && <SvgButton x={600} y={530} w={110} h={44} fontSize={16} label="Again" onClick={() => setPlaced({})} />}

      {/* Food tray */}
      {unplaced.map((f, i) => (
        <DragToken
          key={f.id}
          x={70 + i * 78}
          y={622}
          label={f.name}
          selected={selected === f.id}
          shakeKey={shake[f.id] ?? 0}
          onTap={() => setSelected(selected === f.id ? null : f.id)}
          onDrop={(p) => tryPlace(f.id, zoneAt(p))}
        >
          <circle r={34} fill={selected === f.id ? C.yellow : C.card} stroke={C.ink} strokeWidth={selected === f.id ? 3 : 2} />
          <Emoji e={f.emoji} size={36} />
        </DragToken>
      ))}

      <Callout at={[160, 330]} box={[40, 100]} w={200} icon={Apple} title="Half the plate" text="Fill half your plate with fruit and vegetables." />
      <Callout at={[TOOTH.x - 40, TOOTH.y - 40]} box={[630, 520]} w={200} icon={Smile} title="Clean teeth" text="Brushing clears away germs that feed on sugar." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <circle cx={46} cy={42} r={32} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <path d="M46,42 L46,14 A28,28 0 0 0 46,70 Z" fill="#cbeab3" />
      <path d="M46,42 L46,14 A28,28 0 0 1 74,42 Z" fill="#f8e0b0" />
      <path d="M46,42 L74,42 A28,28 0 0 1 46,70 Z" fill="#f6d2c4" />
      <text x={34} y={46} fontSize={16} fontFamily={EMOJI_FONT}>
        🥕
      </text>
      <circle cx={96} cy={30} r={14} fill="#dceefe" stroke={C.ink} strokeWidth={2} />
      <path d="M90,52 L104,52 L102,72 L92,72 Z" fill="#d4ebff" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

const named = (id: string) => FOODS.find((f) => f.id === id)!;
const label = (id: string) => `${named(id).emoji} ${named(id).name}`;

function isFruitVeg(): Question {
  const right = pick(FOODS.filter((f) => f.group === 'fruitveg'));
  const wrong = shuffle(FOODS.filter((f) => f.group === 'grains' || f.group === 'dairy')).slice(0, 2);
  return mcq({
    prompt: 'Which one is a fruit or vegetable?',
    answer: right.name,
    wrong: wrong.map((f) => f.name),
    labels: Object.fromEntries([right, ...wrong].map((f) => [f.name, label(f.id)])),
    hint: 'Which one grows on a plant and is colourful and crunchy or juicy?',
    explain: [`${right.name} grows on a plant.`, `So ${right.name.toLowerCase()} is a fruit or vegetable.`],
  });
}

function bestDrink(): Question {
  return mcq({
    prompt: 'What is the best everyday drink when you are thirsty?',
    answer: 'Water',
    wrong: ['Fizzy drink', 'Milkshake'],
    hint: 'Which drink has no sugar at all?',
    explain: ['Water has no sugar and keeps your body working well.', 'Fizzy drinks and milkshakes have lots of sugar, so they are sometimes drinks.', 'So water is the best everyday drink.'],
  });
}

function whichGroup(): Question {
  const food = pick(FOODS.filter((f) => f.group !== 'sometimes'));
  const others = shuffle((['fruitveg', 'grains', 'protein', 'dairy'] as Group[]).filter((g) => g !== food.group)).slice(0, 2);
  return mcq({
    prompt: `Which food group is ${food.name.toLowerCase()} in?`,
    visual: (
      <svg viewBox="0 0 160 110" role="img" aria-label={food.name}>
        <Emoji e={food.emoji} x={80} y={55} size={78} />
      </svg>
    ),
    answer: GROUP[food.group].name,
    wrong: others.map((g) => GROUP[g].name),
    hint: 'Where does it come from: a plant, a grain, an animal or milk?',
    explain: [`${food.name} gives you ${GROUP[food.group].job}.`, `So it belongs in ${GROUP[food.group].name.toLowerCase()}.`],
  });
}

function energyFoods(): Question {
  return mcq({
    prompt: 'Bread, rice and pasta mostly give your body…',
    answer: 'Energy',
    wrong: ['Strong teeth', 'Sharp eyes'],
    hint: 'These are grains. What do you need to run and play?',
    explain: ['Bread, rice and pasta are grains.', 'Grains give your body energy to run, play and think.'],
  });
}

function sometimesFood(): Question {
  const treat = pick(FOODS.filter((f) => f.group === 'sometimes'));
  const others = shuffle(FOODS.filter((f) => f.group === 'fruitveg' || f.group === 'protein')).slice(0, 2);
  return mcq({
    prompt: 'Which one is a "sometimes" food?',
    answer: treat.name,
    wrong: others.map((f) => f.name),
    labels: Object.fromEntries([treat, ...others].map((f) => [f.name, label(f.id)])),
    hint: 'Which one is a sweet treat?',
    explain: [`${treat.name} has lots of sugar.`, `It is a yummy treat to have sometimes, so ${treat.name.toLowerCase()} is a sometimes food.`],
  });
}

function balancePlate(): Question {
  return mcq({
    prompt: "Sam's plate has rice, fish and milk. What would balance it?",
    answer: 'Some vegetables',
    wrong: ['More rice', 'A slice of cake'],
    hint: 'Which part of the plate is still empty?',
    explain: ['A balanced plate is about half fruit and vegetables.', 'Sam has grains (rice), protein (fish) and dairy (milk).', 'So Sam should add some vegetables.'],
  });
}

function whyBrush(): Question {
  return mcq({
    prompt: 'Why do we brush our teeth?',
    answer: 'To clean away germs that can make holes',
    wrong: ['To make our teeth grow longer', 'To change their colour'],
    hint: 'What do tiny germs in your mouth like to eat?',
    explain: ['Tiny germs on teeth feed on sugar and can make holes.', 'Brushing cleans the germs away.', 'So we brush to clean away germs that can make holes.'],
  });
}

function howLong(): Question {
  return mcq({
    prompt: 'How long should you brush your teeth each time?',
    answer: 'About 2 minutes',
    wrong: ['2 seconds', '1 hour'],
    hint: 'Long enough to reach every tooth, front and back.',
    explain: ['Teeth need brushing all over: front, back and top.', 'That takes about 2 minutes, twice a day.'],
  });
}

function strongBones(): Question {
  return mcq({
    prompt: 'Milk and cheese help build strong…',
    answer: 'Bones and teeth',
    wrong: ['Hair', 'Eyelashes'],
    hint: 'Dairy foods have calcium. Where does your body use calcium?',
    explain: ['Milk and cheese are dairy foods with calcium.', 'Calcium helps build strong bones and teeth.'],
  });
}

function proteinJob(): Question {
  return mcq({
    prompt: 'Fish, eggs and beans help your body…',
    answer: 'Grow and repair muscles',
    wrong: ['See in the dark', 'Stay cold'],
    hint: 'These are protein foods. What do they help you build?',
    explain: ['Fish, eggs and beans are protein foods.', 'Protein helps your body grow and repair muscles.'],
  });
}

export const foodAndHealth: Lesson = {
  id: 'food-and-health',
  title: 'Food and Health',
  Thumb,
  Scene: FoodScene,
  sceneHint: 'Drag foods onto the plate · Scrub the tooth with the brush',
  learn: {
    heading: 'Food and health',
    intro: 'Different foods do different jobs in your body. Eating lots of kinds, drinking water and brushing your teeth help you stay healthy and strong.',
    points: [
      { icon: Apple, text: 'Fill half your plate with fruit and vegetables.' },
      { icon: Wheat, text: 'Grains give energy; protein helps you grow; dairy builds bones.' },
      { icon: Droplets, text: 'Water is the best everyday drink.' },
      { icon: Smile, text: 'Brush your teeth for 2 minutes, twice a day.' },
    ],
  },
  steps: [
    'Pick up a food. Where does it come from?',
    'Put it in its group on the plate, or on the Sometimes shelf.',
    'Make a balanced plate: half fruit and veg, plus grains, protein and dairy.',
    'Then scrub the tooth clean with the brush!',
  ],
  example: {
    question: 'Ella has bread, an egg and a glass of milk. What is missing?',
    work: ['Bread is a grain. The egg is protein. Milk is dairy.', 'Half the plate should be fruit and vegetables.'],
    answer: 'She needs fruit and vegetables.',
  },
  grownups: [
    'Talk about "everyday" and "sometimes" foods rather than "good" and "bad" foods, so food never feels like a source of shame.',
    'Let your child help build a balanced plate at a real meal, using the half-plate rule.',
    'A two-minute song or timer makes toothbrushing fun. Children usually need help brushing until about age 7.',
  ],
  makeQuestion: (level) => byLevel(level, [[isFruitVeg, bestDrink], [whichGroup, energyFoods, sometimesFood, isFruitVeg], [balancePlate, whyBrush, howLong, strongBones, proteinJob]]),
};
