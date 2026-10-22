import { useRef, useState } from 'react';
import { Atom, Hash, Link2, Sigma } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { ATOM, AtomBall, countsKey, formulaOf, MoleculeDrawing, MoleculePicture, SHAPES, shapeByFormula, sub } from './visuals/Molecule';
import type { Counts, El } from './visuals/Molecule';

const ELEMENTS: El[] = ['H', 'O', 'C', 'N'];
const BUILD = { x: 430, y: 340, r: 200 };
const PALETTE_Y = (i: number) => 150 + i * 118;
const TARGETS = ['H₂O', 'CO₂', 'O₂', 'CH₄', 'NH₃'];
const MAX_ATOMS = 8;

const countOf = (atoms: El[]): Counts => atoms.reduce<Counts>((c, el) => ({ ...c, [el]: (c[el] ?? 0) + 1 }), {});

function PaletteAtom({ el, y, onDrop }: { el: El; y: number; onDrop: (el: El, p: Pt | null) => void }) {
  const [ghost, setGhost] = useState<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      setGhost(p);
    },
    {
      onStart: (p) => {
        start.current = p;
      },
      onEnd: () => {
        const p = last.current;
        const s = start.current;
        // A tap (hardly any movement) adds the atom straight into the build area.
        const tapped = !p || !s || Math.hypot(p.x - s.x, p.y - s.y) < 8;
        onDrop(el, tapped ? null : p);
        setGhost(null);
        last.current = null;
      },
    },
  );
  return (
    <g>
      <g {...drag} role="button" aria-label={`Add a ${ATOM[el].name} atom`}>
        <circle cx={110} cy={y} r={44} fill="transparent" />
        <AtomBall el={el} x={110} y={y} scale={1.15} />
      </g>
      <text x={110} y={y + 56} textAnchor="middle" fontSize={15} fill={C.ink2} pointerEvents="none">
        {ATOM[el].name}
      </text>
      {ghost && (
        <g pointerEvents="none" opacity={0.85}>
          <AtomBall el={el} x={ghost.x} y={ghost.y} scale={1.1} />
        </g>
      )}
    </g>
  );
}

function AtomsScene() {
  const [atoms, setAtoms] = useState<El[]>(['O', 'H']);
  const [target, setTarget] = useState<string>('H₂O');

  const counts = countOf(atoms);
  const shape = SHAPES[countsKey(counts)];
  const goal = shapeByFormula(target);
  const goalCounts = countOf(goal.atoms.map((a) => a.el));
  const built = shape?.formula === target;

  const add = (el: El, p: Pt | null) => {
    if (p && Math.hypot(p.x - BUILD.x, p.y - BUILD.y) > BUILD.r) {
      play('tap');
      return;
    }
    if (atoms.length >= MAX_ATOMS) return;
    const next = [...atoms, el];
    setAtoms(next);
    const nextShape = SHAPES[countsKey(countOf(next))];
    play(nextShape ? 'correct' : 'pop');
  };

  const remove = (el: El) => {
    const i = atoms.lastIndexOf(el);
    if (i < 0) return;
    setAtoms(atoms.filter((_, k) => k !== i));
    play('tap');
  };

  // Loose atoms sit in a ring; a recognised molecule snaps into its real shape with bonds.
  const loose = atoms.map((el, i) => {
    const a = (i / Math.max(1, atoms.length)) * Math.PI * 2 - Math.PI / 2;
    const rr = atoms.length > 1 ? 80 : 0;
    return { el, x: BUILD.x + Math.cos(a) * rr, y: BUILD.y + Math.sin(a) * rr };
  });

  return (
    <SceneSvg label="Build molecules from atoms">
      {/* Build area */}
      <circle cx={BUILD.x} cy={BUILD.y + 6} r={BUILD.r} fill={C.ink} opacity={0.08} />
      <circle cx={BUILD.x} cy={BUILD.y} r={BUILD.r} fill={built ? '#e6f7ee' : C.card} stroke={C.ink} strokeWidth={2.5} strokeDasharray={atoms.length ? undefined : '8 8'} />
      {atoms.length === 0 && (
        <text x={BUILD.x} y={BUILD.y} textAnchor="middle" dominantBaseline="central" fontSize={20} fill={C.muted}>
          Drag atoms in here
        </text>
      )}
      {shape ? (
        <g className="pop-in" key={shape.formula} style={{ transformOrigin: `${BUILD.x}px ${BUILD.y}px` }}>
          <MoleculeDrawing shape={shape} cx={BUILD.x} cy={BUILD.y} scale={1.25} />
        </g>
      ) : (
        loose.map((a, i) => <AtomBall key={i} el={a.el} x={a.x} y={a.y} scale={1.1} />)
      )}
      {/* Tap an atom type here to take one away */}
      {atoms.length > 0 && (
        <g>
          {(Object.keys(counts) as El[]).map((el, i, arr) => {
            const x = BUILD.x - ((arr.length - 1) * 70) / 2 + i * 70;
            return (
              <g key={el} onClick={() => remove(el)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Take away a ${ATOM[el].name} atom`}>
                <rect x={x - 30} y={BUILD.y + BUILD.r + 16} width={60} height={34} rx={17} fill={C.card} stroke={C.ink} strokeWidth={2} />
                <text x={x} y={BUILD.y + BUILD.r + 34} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>
                  − {el}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Atom palette (drawn after the build area so a dragged atom stays on top) */}
      <text x={110} y={92} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        Atoms
      </text>
      {ELEMENTS.map((el, i) => (
        <PaletteAtom key={el} el={el} y={PALETTE_Y(i)} onDrop={add} />
      ))}

      {/* Formula readout */}
      <rect x={694} y={66} width={270} height={150} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={694} y={66} width={270} height={150} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={829} y={96} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        Formula
      </text>
      <text x={829} y={142} textAnchor="middle" dominantBaseline="central" fontSize={46} fontWeight={700} fill={C.ink}>
        {atoms.length ? formulaOf(counts) : '—'}
      </text>
      <text x={829} y={192} textAnchor="middle" fontSize={17} fill={shape ? '#1f7a4a' : C.muted} fontWeight={shape ? 700 : 400}>
        {shape ? `= ${shape.name}` : atoms.length ? `${atoms.length} atom${atoms.length === 1 ? '' : 's'}, not a molecule yet` : 'Add some atoms'}
      </text>

      {/* Building challenges */}
      <text x={694} y={256} fontSize={15} fill={C.muted} className="caps">
        Try to build
      </text>
      {TARGETS.map((f, i) => (
        <SvgButton
          key={f}
          x={694 + (i % 2) * 140}
          y={270 + Math.floor(i / 2) * 66}
          w={130}
          h={54}
          fontSize={22}
          label={f}
          title={`Build ${shapeByFormula(f).name}`}
          active={target === f}
          color={target === f ? C.yellow : C.card}
          onClick={() => setTarget(f)}
        />
      ))}
      <text x={694} y={490} fontSize={16} fill={C.ink2}>
        {built
          ? `You built ${goal.name}!`
          : `Needs: ${(Object.keys(goalCounts) as El[]).map((e) => `${goalCounts[e]} ${e}`).join(', ')}`}
      </text>
      <SvgButton x={694} y={520} w={270} h={52} fontSize={18} label="Clear" onClick={() => setAtoms([])} disabled={atoms.length === 0} />

      <Callout at={[110, PALETTE_Y(1) - 34]} box={[160, 40]} w={220} icon={Atom} title="Elements" text="Each colour is a different element. H is hydrogen, O oxygen, C carbon, N nitrogen." />
      <Callout at={[860, 142]} box={[694, 590]} w={270} icon={Hash} title="Small numbers" text="The small number after a letter says how many of that atom. No number means one." />
    </SceneSvg>
  );
}

function Thumb() {
  const water = shapeByFormula('H₂O');
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={70} rx={40} ry={6} fill={C.ink} opacity={0.12} />
      <MoleculeDrawing shape={water} cx={60} cy={40} scale={0.55} />
    </svg>
  );
}

// ---------- practice ----------

type QEl = El | 'Ca';
interface QMol {
  formula: string;
  name: string;
  counts: Partial<Record<QEl, number>>;
}

const EL_NAME: Record<QEl, string> = { H: 'hydrogen', C: 'carbon', N: 'nitrogen', O: 'oxygen', Ca: 'calcium' };
const ORDER: QEl[] = ['Ca', 'C', 'N', 'H', 'O'];

const BASIC: QMol[] = [
  { formula: 'H₂O', name: 'water', counts: { H: 2, O: 1 } },
  { formula: 'CO₂', name: 'carbon dioxide', counts: { C: 1, O: 2 } },
  { formula: 'O₂', name: 'oxygen gas', counts: { O: 2 } },
  { formula: 'CH₄', name: 'methane', counts: { C: 1, H: 4 } },
  { formula: 'NH₃', name: 'ammonia', counts: { N: 1, H: 3 } },
  { formula: 'N₂', name: 'nitrogen gas', counts: { N: 2 } },
];
const HARDER: QMol[] = [
  { formula: 'C₆H₁₂O₆', name: 'glucose (a sugar)', counts: { C: 6, H: 12, O: 6 } },
  { formula: 'CaCO₃', name: 'chalk (calcium carbonate)', counts: { Ca: 1, C: 1, O: 3 } },
  { formula: 'H₂O₂', name: 'hydrogen peroxide', counts: { H: 2, O: 2 } },
  { formula: 'C₂H₆', name: 'ethane', counts: { C: 2, H: 6 } },
];

const elementsIn = (m: QMol) => ORDER.filter((e) => (m.counts[e] ?? 0) > 0);
const total = (m: QMol) => elementsIn(m).reduce((s, e) => s + (m.counts[e] ?? 0), 0);
const plural = (n: number, word: string) => `${n} ${word} atom${n === 1 ? '' : 's'}`;
const describe = (m: QMol) => elementsIn(m).map((e) => plural(m.counts[e]!, EL_NAME[e])).join(' and ');

/** Write a formula from counts in a fixed order (used to make wrong-but-plausible options). */
function writeFormula(counts: Partial<Record<QEl, number>>, order: QEl[]): string {
  return order
    .filter((e) => (counts[e] ?? 0) > 0)
    .map((e) => `${e}${counts[e]! > 1 ? sub(counts[e]!) : ''}`)
    .join('');
}

function picture(m: QMol) {
  const s = Object.values(SHAPES).find((x) => x.formula === m.formula);
  return s ? <MoleculePicture shape={s} /> : undefined;
}

function makeQuestion(level: number): Question {
  const pool = level >= 2 ? [...BASIC, ...HARDER] : BASIC;
  const m = pick(level >= 2 && Math.random() < 0.6 ? HARDER : pool);
  const kinds = level === 0 ? ['count', 'total'] : level === 1 ? ['count', 'total', 'name', 'formula'] : ['count', 'name', 'formula', 'kind'];
  const kind = pick(kinds);

  if (kind === 'count') {
    const el = pick(elementsIn(m));
    const n = m.counts[el]!;
    return {
      prompt: `How many ${EL_NAME[el]} atoms are in one ${m.formula} molecule?`,
      visual: picture(m),
      choices: numberChoices(n, { min: 1, max: 14 }).map((value) => ({ value })),
      answer: String(n),
      hint: `Find the ${el} in the formula, then look for a small number just after it.`,
      explain: [
        n === 1 ? `There is no small number after ${el} in ${m.formula}, which means one.` : `In ${m.formula}, the small ${sub(n)} after ${el} means ${n}.`,
        `So one molecule has ${plural(n, EL_NAME[el])}.`,
      ],
    };
  }
  if (kind === 'total') {
    const t = total(m);
    return {
      prompt: `How many atoms altogether are in one ${m.formula} molecule?`,
      visual: picture(m),
      choices: numberChoices(t, { min: 1, max: 30 }).map((value) => ({ value })),
      answer: String(t),
      hint: 'Count each kind of atom using the small numbers, then add them up.',
      explain: [
        `${m.formula} has ${describe(m)}.`,
        `${elementsIn(m).map((e) => m.counts[e]).join(' + ')} = ${t}.`,
        `So there are ${t} atoms altogether.`,
      ],
    };
  }
  if (kind === 'name') {
    const options = shuffle([m, ...shuffle(pool.filter((x) => x.name !== m.name)).slice(0, 3)]);
    return {
      prompt: `What is ${m.formula}?`,
      choices: options.map((o) => ({ value: o.name })),
      answer: m.name,
      hint: 'Read which letters are in the formula: each letter is an element.',
      explain: [`${m.formula} is made of ${describe(m)}.`, `That molecule is ${m.name}.`],
    };
  }
  if (kind === 'formula') {
    const els = elementsIn(m);
    const wrong = new Set<string>();
    // Plausible slips: a count off by one, or the counts swapped between two elements.
    for (const e of els) {
      for (const d of [-1, 1]) {
        const n = (m.counts[e] ?? 0) + d;
        if (n >= 1) wrong.add(writeFormula({ ...m.counts, [e]: n }, ORDER));
      }
    }
    if (els.length >= 2) wrong.add(writeFormula({ ...m.counts, [els[0]]: m.counts[els[1]], [els[1]]: m.counts[els[0]] }, ORDER));
    wrong.delete(m.formula);
    wrong.delete(writeFormula(m.counts, ORDER));
    const options = shuffle([m.formula, ...shuffle([...wrong]).slice(0, 3)]);
    return {
      prompt: `Which formula is ${m.name}?`,
      choices: options.map((value) => ({ value })),
      answer: m.formula,
      hint: `Think about how many of each atom ${m.name} has.`,
      explain: [`${m.name.charAt(0).toUpperCase() + m.name.slice(1)} has ${describe(m)}.`, `Written as a formula, that is ${m.formula}.`],
    };
  }
  const element = elementsIn(m).length === 1;
  return {
    prompt: `Is ${m.formula} an element or a compound?`,
    visual: picture(m),
    choices: [{ value: 'element' }, { value: 'compound' }],
    answer: element ? 'element' : 'compound',
    hint: 'Count how many different kinds of atom are in it.',
    explain: element
      ? [`${m.formula} is made of only ${EL_NAME[elementsIn(m)[0]]} atoms.`, 'Just one kind of atom means it is an element.']
      : [`${m.formula} has ${elementsIn(m).map((e) => EL_NAME[e]).join(' and ')} atoms joined together.`, 'Two or more kinds of atom joined together make a compound.'],
  };
}

export const atomsAndMolecules: Lesson = {
  id: 'atoms-and-molecules',
  title: 'Atoms and Molecules',
  Thumb,
  Scene: AtomsScene,
  sceneHint: 'Drag atoms into the circle · Build the molecule on the right',
  learn: {
    heading: 'Atoms and molecules',
    intro: 'Everything is made of tiny atoms. When atoms join together they make molecules. A formula like H₂O tells you which atoms are inside and how many.',
    points: [
      { icon: Atom, text: 'An element has only one kind of atom, like oxygen (O₂).' },
      { icon: Link2, text: 'Atoms join with bonds to make molecules.' },
      { icon: Sigma, text: 'In H₂O the small 2 means two hydrogen atoms; no number means one.' },
    ],
  },
  steps: [
    'Read the capital letters: each one is a different element.',
    'Look for a small number after each letter. No number means one atom.',
    'Add the numbers up to find how many atoms are in the molecule.',
    'Two or more different elements joined together make a compound.',
  ],
  example: {
    question: 'How many atoms are in one carbon dioxide molecule, CO₂?',
    visual: <MoleculePicture shape={shapeByFormula('CO₂')} />,
    work: ['C has no small number: 1 carbon atom.', 'O₂ means 2 oxygen atoms.', '1 + 2 = 3.'],
    answer: 'CO₂ has 3 atoms: 1 carbon and 2 oxygen.',
  },
  grownups: [
    'Atoms are far too small to see; the balls and sticks are a model scientists use to picture them.',
    'Link to everyday life: we breathe out carbon dioxide (CO₂), and water (H₂O) is in almost everything we eat and drink.',
    'If they mix up elements and compounds, ask: "how many different letters are in the formula?"',
    'Building molecules with sweets and cocktail sticks is a fun, memorable kitchen-table version.',
  ],
  makeQuestion,
};
