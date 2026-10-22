import { useState } from 'react';
import { Palette, Ruler, Shapes } from 'lucide-react';
import type { Choice, Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Draggable } from './visuals/Draggable';
import {
  COLOURS,
  FILL,
  groupsOf,
  HoopsPicture,
  objName,
  ObjRow,
  SHAPES,
  SIZES,
  SortShape,
  valueOf,
} from './visuals/SortObjects';
import type { Colour, Rule, Shape, SortObj } from './visuals/SortObjects';

const RULES: { rule: Rule; label: string }[] = [
  { rule: 'colour', label: 'Colour' },
  { rule: 'shape', label: 'Shape' },
  { rule: 'size', label: 'Size' },
];

const PILE_Y = 205;
const HOOP_Y = 488;

function freshPile(): SortObj[] {
  const sizes = shuffle(['big', 'big', 'big', 'big', 'small', 'small', 'small', 'small', pick(SIZES)] as const);
  const objs: SortObj[] = [];
  let id = 0;
  for (const shape of SHAPES) for (const colour of COLOURS) objs.push({ id: id, shape, colour, size: sizes[id++] });
  return shuffle(objs).map((o, i) => ({ ...o, id: i }));
}

function hoopCentres(rule: Rule): number[] {
  return groupsOf(rule).length === 3 ? [200, 500, 800] : [310, 690];
}

const NUDGE: Record<Rule, string> = {
  colour: 'Not that hoop. Look at its colour!',
  shape: 'Not that hoop. Look at its shape!',
  size: 'Not that hoop. Is it big or small?',
};

function SortScene() {
  const [rule, setRule] = useState<Rule>('colour');
  const [objs, setObjs] = useState<SortObj[]>(freshPile);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState('Drag each shape into a hoop.');

  const groups = groupsOf(rule);
  const centres = hoopCentres(rule);
  const rx = groups.length === 3 ? 135 : 170;
  const ry = 112;

  const reset = (r: Rule) => {
    setRule(r);
    setObjs(freshPile());
    setPlaced({});
    setSelected(null);
    setMessage('Drag each shape into a hoop.');
    play('whoosh');
  };

  const hoopAt = (p: Pt): number => centres.findIndex((cx) => ((p.x - cx) / rx) ** 2 + ((p.y - HOOP_Y) / ry) ** 2 <= 1.15);

  const tryPlace = (o: SortObj, hoop: number) => {
    setSelected(null);
    if (hoop < 0) {
      // Dropped outside the hoops: back to the pile.
      setPlaced((pl) => {
        const next = { ...pl };
        delete next[o.id];
        return next;
      });
      return;
    }
    if (groups[hoop] !== valueOf(o, rule)) {
      setMessage(NUDGE[rule]);
      play('wrong');
      return;
    }
    const next = { ...placed, [o.id]: groups[hoop] };
    setPlaced(next);
    play('pop');
    if (Object.keys(next).length === objs.length) {
      const counts = groups.map((g) => `${objs.filter((x) => valueOf(x, rule) === g).length} ${g}`).join(', ');
      setMessage(`All sorted by ${rule}! ${counts}.`);
      play('correct');
    } else setMessage(`Yes! It goes with the ${groups[hoop]} ones.`);
  };

  const posOf = (o: SortObj): [number, number] => {
    const g = placed[o.id];
    if (!g) return [100 + o.id * 100, PILE_Y];
    const hoop = groups.indexOf(g);
    const k = objs.filter((x) => placed[x.id] === g && x.id < o.id).length;
    const perRow = groups.length === 3 ? 3 : 4;
    const gap = groups.length === 3 ? 74 : 72;
    const cols = Math.min(perRow, objs.filter((x) => placed[x.id] === g).length);
    return [centres[hoop] - ((cols - 1) * gap) / 2 + (k % perRow) * gap, HOOP_Y - 16 + Math.floor(k / perRow) * 66];
  };


  return (
    <SceneSvg label={`Sorting shapes by ${rule}`}>
      <text x={60} y={66} fontSize={17} fill={C.muted} className="caps">
        Sort by
      </text>
      {RULES.map((r, i) => (
        <SvgButton key={r.rule} x={150 + i * 132} y={34} w={120} h={54} fontSize={19} label={r.label} active={rule === r.rule} color={rule === r.rule ? C.yellow : C.card} onClick={() => reset(r.rule)} />
      ))}
      <SvgButton x={820} y={34} w={140} h={54} fontSize={18} label="Mix up" onClick={() => reset(rule)} />

      <rect x={40} y={PILE_Y - 52} width={920} height={104} rx={18} fill={shade(C.paper, 0.35)} stroke={C.line} strokeWidth={2} strokeDasharray="8 6" />

      <text x={500} y={310} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink}>
        {message}
      </text>

      {groups.map((g, h) => (
        <g key={g} onClick={() => selected !== null && tryPlace(objs[selected], h)} style={{ cursor: selected !== null ? 'pointer' : undefined }} data-nopan>
          <ellipse cx={centres[h]} cy={HOOP_Y} rx={rx} ry={ry} fill={selected !== null ? shade(C.yellow, 0.82) : C.card} stroke={C.ink} strokeWidth={4} />
          <HoopLabel rule={rule} group={g} x={centres[h]} y={HOOP_Y - ry - 22} />
        </g>
      ))}

      {objs.map((o) => {
        const [x, y] = posOf(o);
        return (
          <Draggable
            key={`${rule}-${o.id}`}
            x={x}
            y={y}
            label={objName(o, true)}
            onDrop={(p) => tryPlace(o, hoopAt(p))}
            onTap={() => {
              setSelected(selected === o.id ? null : o.id);
              play('tap');
            }}
          >
            <SortShape obj={o} x={x} y={y} scale={placed[o.id] ? 0.82 : 1} ring={selected === o.id ? C.orange : undefined} />
          </Draggable>
        );
      })}

      <Callout at={[centres[0], HOOP_Y - ry]} box={[30, 340]} w={220} icon={Shapes} title="Same goes together" text="Things that are the same in some way go in the same hoop." />
    </SceneSvg>
  );
}

function HoopLabel({ rule, group, x, y }: { rule: Rule; group: string; x: number; y: number }) {
  return (
    <g>
      <rect x={x - 70} y={y - 20} width={140} height={40} rx={20} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {rule === 'colour' && <circle cx={x - 42} cy={y} r={11} fill={FILL[group as Colour]} stroke={C.ink} strokeWidth={2} />}
      {rule === 'shape' && <SortShape obj={{ shape: group as Shape, colour: 'yellow', size: 'small' }} x={x - 42} y={y} scale={0.6} />}
      {rule === 'size' && <circle cx={x - 42} cy={y} r={group === 'big' ? 12 : 6} fill={C.muted} />}
      <text x={x + 8} y={y} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
        {group}
      </text>
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={34} cy={50} rx={28} ry={24} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={86} cy={50} rx={28} ry={24} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <SortShape obj={{ shape: 'circle', colour: 'red', size: 'small' }} x={24} y={50} scale={0.7} />
      <SortShape obj={{ shape: 'square', colour: 'red', size: 'small' }} x={44} y={50} scale={0.7} />
      <SortShape obj={{ shape: 'triangle', colour: 'blue', size: 'small' }} x={78} y={52} scale={0.7} />
      <SortShape obj={{ shape: 'circle', colour: 'blue', size: 'small' }} x={96} y={50} scale={0.7} />
    </svg>
  );
}

type Plain = Pick<SortObj, 'shape' | 'colour' | 'size'>;

const one = (o: Plain) => (
  <svg viewBox="0 0 80 80" role="img" aria-label={objName(o, true)}>
    <SortShape obj={o} x={40} y={42} />
  </svg>
);

function oddOneOut(attr: 'colour' | 'shape'): Question {
  const odd = rand(0, 3);
  let items: Plain[];
  let oddObj: Plain;
  if (attr === 'colour') {
    const [main, other] = shuffle(COLOURS);
    const shape = pick(SHAPES);
    items = Array.from({ length: 4 }, (_, i) => ({ shape, colour: i === odd ? other : main, size: 'big' as const }));
    oddObj = items[odd];
  } else {
    // Same shape, mixed colours, and one different shape.
    const [main, other] = shuffle(SHAPES);
    const colours = shuffle(COLOURS);
    items = Array.from({ length: 4 }, (_, i) => ({ shape: i === odd ? other : main, colour: colours[i % 3], size: 'big' as const }));
    oddObj = items[odd];
  }
  const choices: Choice[] = items.map((o, i) => ({
    value: `o${i}`,
    label: one(o),
    name: i === odd ? `the ${objName(o)}` : `a ${objName(o)}`,
  }));
  const others = items.find((_, i) => i !== odd)!;
  const same = attr === 'colour' ? others.colour : `${others.shape}s`;
  return {
    prompt: `Which one is a different ${attr}?`,
    choices,
    answer: `o${odd}`,
    hint: `Look only at the ${attr} of each one.`,
    explain: [
      `Three of them are ${same}.`,
      `The ${objName(oddObj)} is not.`,
      `So the ${objName(oddObj)} is the different one.`,
    ],
  };
}

function consistentWith(hoops: Plain[][], rule: Rule) {
  return hoops.every((items) => items.every((o) => valueOf(o as SortObj, rule) === valueOf(items[0] as SortObj, rule)));
}

function howSorted(): Question {
  const rule = pick<Rule>(['colour', 'shape', 'size']);
  let hoops: Plain[][] = [];
  for (let tries = 0; tries < 200; tries++) {
    hoops = groupsOf(rule).map((g) =>
      Array.from({ length: rand(2, 3) }, () => {
        const o: Plain = { shape: pick(SHAPES), colour: pick(COLOURS), size: pick(SIZES) };
        if (rule === 'colour') o.colour = g as Colour;
        if (rule === 'shape') o.shape = g as Shape;
        if (rule === 'size') o.size = g as 'big' | 'small';
        return o;
      }),
    );
    const others = (['colour', 'shape', 'size'] as Rule[]).filter((r) => r !== rule);
    if (others.every((r) => !consistentWith(hoops, r))) break;
  }
  const word = rule === 'colour' ? 'colour' : rule === 'shape' ? 'shape' : 'size';
  return {
    prompt: 'How were these sorted?',
    visual: <HoopsPicture hoops={hoops} />,
    choices: shuffle<Rule>(['colour', 'shape', 'size']).map((r) => ({ value: r, label: `By ${r}`, name: `by ${r}` })),
    answer: rule,
    hint: 'Look inside one hoop. What is the same about everything in it?',
    explain: [
      'Look inside each hoop.',
      `Everything in a hoop is the same ${word}, but other things are mixed.`,
      `So they were sorted by ${word}.`,
    ],
  };
}

function countIn(): Question {
  const pile: Plain[] = Array.from({ length: rand(6, 8) }, () => ({ shape: pick(SHAPES), colour: pick(COLOURS), size: pick(SIZES) }));
  const rule = pick<Rule>(['colour', 'shape', 'size']);
  const target = valueOf(pick(pile) as SortObj, rule);
  const n = pile.filter((o) => valueOf(o as SortObj, rule) === target).length;
  const what = rule === 'shape' ? `${target}s` : `${target} ones`;
  return {
    prompt: `How many ${what}?`,
    visual: <ObjRow objs={pile} />,
    choices: numberChoices(n, { count: 3, min: 1, max: 8, spread: 2 }).map((value) => ({ value })),
    answer: String(n),
    hint: `Look only at the ${rule}. Touch each matching one as you count.`,
    explain: [`Find the ${what} and skip the rest.`, `Count them: ${Array.from({ length: n }, (_, i) => i + 1).join(', ')}.`, `There ${n === 1 ? 'is' : 'are'} ${n}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return oddOneOut('colour');
  if (level === 1) return Math.random() < 0.5 ? oddOneOut('shape') : howSorted();
  return Math.random() < 0.5 ? howSorted() : countIn();
}

export const sortAndClassify: Lesson = {
  id: 'sort-and-classify',
  title: 'Sorting',
  Thumb,
  Scene: SortScene,
  sceneHint: 'Pick a rule · Drag each shape into its hoop',
  learn: {
    heading: 'Sorting into groups',
    intro: 'Sorting means putting things that are the same in some way together. We can sort by colour, by shape or by size!',
    points: [
      { icon: Palette, text: 'Sort by colour: all the reds together.' },
      { icon: Shapes, text: 'Sort by shape: all the circles together.' },
      { icon: Ruler, text: 'Sort by size: big ones and small ones.' },
    ],
  },
  steps: ['Choose a rule: colour, shape or size.', 'Pick up one thing and look at it.', 'Put it in the hoop that matches the rule.', 'When all are sorted, count each group.'],
  example: {
    question: 'Sort these by colour.',
    visual: (
      <ObjRow
        objs={[
          { shape: 'circle', colour: 'red', size: 'big' },
          { shape: 'square', colour: 'blue', size: 'small' },
          { shape: 'triangle', colour: 'red', size: 'small' },
          { shape: 'circle', colour: 'blue', size: 'big' },
        ]}
      />
    ),
    work: ['The red circle and red triangle go together.', 'The blue square and blue circle go together.', 'Shape and size don’t matter for this rule.'],
    answer: '2 red and 2 blue.',
  },
  grownups: [
    'Sort the laundry, toys or cutlery together and ask “what rule did we use?”',
    'Try sorting the same things in two different ways — it builds flexible thinking.',
    'Ask your child to make up a rule and see if you can guess it.',
  ],
  makeQuestion,
};
