import { useRef, useState } from 'react';
import { Microscope, Sprout, Zap } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';

type PartId = 'nucleus' | 'membrane' | 'cytoplasm' | 'mitochondria' | 'wall' | 'chloroplast' | 'vacuole';
type CellType = 'plant' | 'animal';

interface Part {
  name: string;
  job: string;
  /** "Which part …?" phrasing. */
  short: string;
  /** "Its job is …" phrasing. */
  gerund: string;
  plant: boolean;
  animal: boolean;
}

const PARTS: Record<PartId, Part> = {
  nucleus: { name: 'nucleus', job: 'The control centre. It holds DNA, the instructions for the cell.', short: 'controls the cell and holds its DNA', gerund: 'controlling the cell and holding its DNA', plant: true, animal: true },
  membrane: { name: 'cell membrane', job: 'A thin, flexible skin that controls what goes in and out of the cell.', short: 'controls what goes in and out', gerund: 'controlling what goes in and out', plant: true, animal: true },
  cytoplasm: { name: 'cytoplasm', job: 'A jelly-like liquid where many of the cell’s chemical reactions happen.', short: 'is where chemical reactions happen', gerund: 'being the place where chemical reactions happen', plant: true, animal: true },
  mitochondria: { name: 'mitochondria', job: 'Release energy from food (respiration). Plants and animals both have them.', short: 'releases energy from food', gerund: 'releasing energy from food', plant: true, animal: true },
  wall: { name: 'cell wall', job: 'A strong, stiff layer outside the membrane that supports a plant cell. Animal cells don’t have one.', short: 'supports and strengthens the cell', gerund: 'supporting and strengthening the cell', plant: true, animal: false },
  chloroplast: { name: 'chloroplasts', job: 'Use light to make food (photosynthesis). Green chlorophyll inside makes plants green.', short: 'makes food using light', gerund: 'making food using light', plant: true, animal: false },
  vacuole: { name: 'vacuole', job: 'A large, permanent store of water and sap that keeps a plant cell firm. Animal cells only have small, temporary ones.', short: 'stores water and keeps the cell firm', gerund: 'storing water and keeping the cell firm', plant: true, animal: false },
};

/** Break text into lines of at most `max` characters for SVG. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

const CX = 370;
const CY = 380;

/** Where each label's drop-dot sits, per cell type. */
const DOTS: Record<CellType, Partial<Record<PartId, Pt>>> = {
  plant: {
    wall: { x: 566, y: 230 },
    membrane: { x: 172, y: 520 },
    nucleus: { x: 230, y: 312 },
    vacuole: { x: 400, y: 380 },
    chloroplast: { x: 520, y: 520 },
    mitochondria: { x: 230, y: 452 },
    cytoplasm: { x: 330, y: 506 },
  },
  animal: {
    membrane: { x: 152, y: 380 },
    nucleus: { x: CX, y: CY },
    mitochondria: { x: 478, y: 470 },
    cytoplasm: { x: 260, y: 300 },
  },
};

function Mito({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse rx={26} ry={13} fill="#f4a261" stroke={C.ink} strokeWidth={2} />
      <path d="M-18,0 q4,-8 8,0 t8,0 t8,0 t8,0" fill="none" stroke={shade('#f4a261', -0.4)} strokeWidth={2} />
    </g>
  );
}

function Chloro({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse rx={22} ry={12} fill="#4cb07a" stroke={C.ink} strokeWidth={2} />
      {[-10, 0, 10].map((dx) => (
        <line key={dx} x1={dx} y1={-6} x2={dx} y2={6} stroke="#2d7a50" strokeWidth={3} strokeLinecap="round" />
      ))}
    </g>
  );
}

function PlantCell({ onPart }: { onPart: (p: PartId) => void }) {
  const hit = (p: PartId) => ({ onClick: () => onPart(p), style: { cursor: 'pointer' }, 'data-nopan': true });
  return (
    <g>
      <rect x={140} y={200} width={460} height={340} rx={26} fill="#a3c86a" stroke={C.ink} strokeWidth={3} {...hit('wall')} />
      <rect x={156} y={216} width={428} height={308} rx={18} fill="#eef7e4" stroke="#5a8a3a" strokeWidth={3} {...hit('cytoplasm')} />
      <rect x={156} y={216} width={428} height={308} rx={18} fill="none" stroke="#3d6b28" strokeWidth={4} {...hit('membrane')} />
      <rect x={300} y={280} width={210} height={196} rx={60} fill="#cdeafc" stroke={C.ink} strokeWidth={2.5} {...hit('vacuole')} />
      <g {...hit('nucleus')}>
        <circle cx={230} cy={312} r={40} fill="#b79be6" stroke={C.ink} strokeWidth={2.5} />
        <circle cx={240} cy={304} r={12} fill="#7c5cc4" />
      </g>
      <g {...hit('chloroplast')}>
        {[
          [200, 250, 20],
          [540, 260, -20],
          [550, 400, 70],
          [470, 500, 10],
          [520, 520, -10],
          [190, 400, 80],
        ].map(([x, y, r]) => (
          <Chloro key={`${x}${y}`} x={x} y={y} rot={r} />
        ))}
      </g>
      <g {...hit('mitochondria')}>
        <Mito x={230} y={452} rot={-20} />
        <Mito x={290} y={250} rot={15} />
      </g>
    </g>
  );
}

function AnimalCell({ onPart }: { onPart: (p: PartId) => void }) {
  const hit = (p: PartId) => ({ onClick: () => onPart(p), style: { cursor: 'pointer' }, 'data-nopan': true });
  return (
    <g>
      <path
        d={`M${CX - 220},${CY} C${CX - 230},${CY - 150} ${CX - 60},${CY - 190} ${CX + 60},${CY - 170} C${CX + 200},${CY - 150} ${CX + 240},${CY - 40} ${CX + 224},${CY + 40} C${CX + 210},${CY + 150} ${CX + 60},${CY + 190} ${CX - 60},${CY + 170} C${CX - 190},${CY + 150} ${CX - 214},${CY + 80} ${CX - 220},${CY} Z`}
        fill="#fde4e4"
        stroke="#c0504d"
        strokeWidth={5}
        {...hit('cytoplasm')}
      />
      <path
        d={`M${CX - 220},${CY} C${CX - 230},${CY - 150} ${CX - 60},${CY - 190} ${CX + 60},${CY - 170} C${CX + 200},${CY - 150} ${CX + 240},${CY - 40} ${CX + 224},${CY + 40} C${CX + 210},${CY + 150} ${CX + 60},${CY + 190} ${CX - 60},${CY + 170} C${CX - 190},${CY + 150} ${CX - 214},${CY + 80} ${CX - 220},${CY} Z`}
        fill="none"
        stroke="#c0504d"
        strokeWidth={12}
        opacity={0.01}
        {...hit('membrane')}
      />
      <g {...hit('nucleus')}>
        <circle cx={CX} cy={CY} r={52} fill="#b79be6" stroke={C.ink} strokeWidth={2.5} />
        <circle cx={CX + 14} cy={CY - 10} r={15} fill="#7c5cc4" />
      </g>
      <g {...hit('mitochondria')}>
        <Mito x={478} y={470} rot={20} />
        <Mito x={250} y={440} rot={-30} />
        <Mito x={460} y={290} rot={-10} />
      </g>
    </g>
  );
}

function LabelChip({ id, x, y, onDrop }: { id: PartId; x: number; y: number; onDrop: (id: PartId, p: Pt | null) => void }) {
  const [at, setAt] = useState<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      if (start.current && Math.hypot(p.x - start.current.x, p.y - start.current.y) > 6) setAt(p);
    },
    {
      onStart: (p) => {
        start.current = p;
      },
      onEnd: () => {
        onDrop(id, at ? last.current : null);
        setAt(null);
      },
    },
  );
  const pos = at ?? { x, y };
  const w = 160;
  return (
    <g {...drag} role="button" aria-label={`Label: ${PARTS[id].name}`} style={{ ...drag.style, transform: `translate(${pos.x}px, ${pos.y}px)` }}>
      <rect x={-w / 2} y={-20} width={w} height={40} rx={20} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>
        {PARTS[id].name}
      </text>
    </g>
  );
}

function CellsScene() {
  const [type, setType] = useState<CellType>('plant');
  const [selected, setSelected] = useState<PartId>('nucleus');
  const [placed, setPlaced] = useState<Record<CellType, PartId[]>>({ plant: [], animal: [] });
  const [held, setHeld] = useState<PartId | null>(null);

  const dots = DOTS[type];
  const ids = (Object.keys(dots) as PartId[]).sort();
  const remaining = ids.filter((id) => !placed[type].includes(id));
  const part = PARTS[selected];

  const place = (id: PartId, target: PartId) => {
    if (id === target) {
      setPlaced({ ...placed, [type]: [...placed[type], id] });
      setSelected(id);
      setHeld(null);
      play(remaining.length === 1 ? 'correct' : 'pop');
    } else {
      play('wrong');
    }
  };

  const drop = (id: PartId, p: Pt | null) => {
    if (!p) {
      // Tap: hold the label, then tap a dot.
      setHeld(held === id ? null : id);
      play('tap');
      return;
    }
    const near = ids.find((pid) => Math.hypot(p.x - dots[pid]!.x, p.y - dots[pid]!.y) < 50);
    if (near && !placed[type].includes(near)) place(id, near);
    else play('tap');
  };

  const tapPart = (pid: PartId) => {
    if (held) place(held, pid);
    setSelected(pid);
    play('tap');
  };

  return (
    <SceneSvg label={`A ${type} cell with parts to label`}>
      <SvgButton x={150} y={40} w={180} h={52} fontSize={18} label="Plant cell" active={type === 'plant'} color={type === 'plant' ? C.green : C.card} onClick={() => setType('plant')} />
      <SvgButton x={346} y={40} w={180} h={52} fontSize={18} label="Animal cell" active={type === 'animal'} color={type === 'animal' ? C.pink : C.card} onClick={() => setType('animal')} />
      <text x={150} y={130} fontSize={14} fill={C.muted}>
        Magnified about 1000 times · Tap a part to learn its job
      </text>

      {type === 'plant' ? <PlantCell onPart={tapPart} /> : <AnimalCell onPart={tapPart} />}

      {/* Drop dots and placed labels */}
      {ids.map((pid) => {
        const d = dots[pid]!;
        const done = placed[type].includes(pid);
        return (
          <g key={pid} onClick={() => tapPart(pid)} style={{ cursor: 'pointer' }} data-nopan>
            {done ? (
              <g className="pop-in" style={{ transformOrigin: `${d.x}px ${d.y}px` }}>
                <rect x={d.x - 70} y={d.y - 16} width={140} height={32} rx={16} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
                <text x={d.x} y={d.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} fill={C.ink}>
                  {PARTS[pid].name}
                </text>
              </g>
            ) : (
              <g>
                <circle cx={d.x} cy={d.y} r={14} fill={held ? C.yellow : C.white} stroke={C.ink} strokeWidth={2.5} />
                <circle cx={d.x} cy={d.y} r={5} fill={C.ink} />
              </g>
            )}
          </g>
        );
      })}

      {/* Info card */}
      <rect x={650} y={40} width={310} height={210} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={650} y={40} width={310} height={210} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={672} y={78} fontSize={22} fontWeight={700} fill={C.ink}>
        {part.name}
      </text>
      <text x={672} y={110} fontSize={15} fill={C.ink2}>
        {wrap(part.job, 34).map((line, i) => (
          <tspan key={i} x={672} dy={i ? 20 : 0}>
            {line}
          </tspan>
        ))}
      </text>
      <text x={672} y={230} fontSize={14} fill={C.ink2} fontWeight={600}>
        Plant cells: {part.plant ? 'yes' : 'no'} · Animal cells: {part.animal ? 'yes' : 'no'}
      </text>

      {/* Labels to drag */}
      <text x={650} y={292} fontSize={15} fill={C.muted} className="caps">
        {remaining.length ? 'Drag each label to its dot' : `${type === 'plant' ? 'Plant' : 'Animal'} cell labelled!`}
      </text>
      {remaining.map((id, i) => (
        <g key={`${type}-${id}`} opacity={held && held !== id ? 0.5 : 1}>
          <LabelChip id={id} x={734 + (i % 2) * 166} y={330 + Math.floor(i / 2) * 56} onDrop={drop} />
        </g>
      ))}
      {placed[type].length > 0 && (
        <SvgButton x={650} y={590} w={310} h={50} fontSize={17} label="Take the labels off" onClick={() => setPlaced({ ...placed, [type]: [] })} />
      )}

      <Callout at={[566, 230]} box={[150, 588]} w={300} icon={Sprout} title="Only in plants" text="Cell wall, chloroplasts and a big vacuole." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={12} y={10} width={96} height={62} rx={12} fill="#a3c86a" stroke={C.ink} strokeWidth={2} />
      <rect x={18} y={16} width={84} height={50} rx={8} fill="#eef7e4" />
      <rect x={52} y={24} width={40} height={34} rx={12} fill="#cdeafc" stroke={C.ink} strokeWidth={1.5} />
      <circle cx={34} cy={32} r={9} fill="#b79be6" stroke={C.ink} strokeWidth={1.5} />
      <ellipse cx={32} cy={54} rx={7} ry={4} fill="#4cb07a" stroke={C.ink} strokeWidth={1.2} />
    </svg>
  );
}

// ---------- practice ----------

const ALL: PartId[] = ['nucleus', 'membrane', 'cytoplasm', 'mitochondria', 'wall', 'chloroplast', 'vacuole'];

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['control', 'plantOnly']) : level === 1 ? pick(['whichPart', 'yesNo', 'plantOnly']) : pick(['whatJob', 'whichPart', 'green', 'yesNo']);

  if (kind === 'control') {
    return {
      prompt: 'Which part is the control centre of a cell?',
      choices: shuffle(['nucleus', 'cytoplasm', 'cell membrane', 'vacuole']).map((value) => ({ value })),
      answer: 'nucleus',
      hint: 'Which part holds the instructions (DNA) for the whole cell?',
      explain: ['The DNA instructions are kept in one part.', 'That control centre is the nucleus.'],
    };
  }
  if (kind === 'plantOnly') {
    const answer = pick(['cell wall', 'chloroplasts']);
    return {
      prompt: 'Which part do plant cells have that animal cells do not?',
      choices: shuffle([answer, 'nucleus', 'cell membrane', 'cytoplasm']).map((value) => ({ value })),
      answer,
      hint: 'Nucleus, membrane and cytoplasm are in both kinds of cell.',
      explain: ['Both kinds of cell have a nucleus, cell membrane and cytoplasm.', `Only plant cells have ${answer}.`],
    };
  }
  if (kind === 'whichPart') {
    const id = pick(ALL);
    const others = shuffle(ALL.filter((x) => x !== id)).slice(0, 3);
    return {
      prompt: `Which part ${PARTS[id].short}?`,
      choices: shuffle([id, ...others]).map((x) => ({ value: PARTS[x].name })),
      answer: PARTS[id].name,
      hint: 'Picture the cell and think about what each part does.',
      explain: [PARTS[id].job, `So the answer is the ${PARTS[id].name}.`],
    };
  }
  if (kind === 'whatJob') {
    const id = pick(ALL);
    const others = shuffle(ALL.filter((x) => x !== id)).slice(0, 3);
    return {
      prompt: `What is the job of the ${PARTS[id].name}?`,
      choices: shuffle([id, ...others]).map((x) => ({ value: PARTS[x].gerund })),
      answer: PARTS[id].gerund,
      hint: 'Think of the cell as a tiny factory: which job belongs to this part?',
      explain: [PARTS[id].job, `So its job is ${PARTS[id].gerund}.`],
    };
  }
  if (kind === 'green') {
    const right = 'their cells have chloroplasts full of green chlorophyll';
    return {
      prompt: 'Why are most leaves green?',
      choices: shuffle([right, 'their cell walls are painted green', 'their nucleus is green', 'they soak up green water']).map((value) => ({ value })),
      answer: right,
      hint: 'Which part of a plant cell is used for making food from light?',
      explain: ['Leaves make food using light, in their chloroplasts.', `Chloroplasts contain chlorophyll, so ${right}.`],
    };
  }
  const qs: { q: string; yes: boolean; why: string }[] = [
    { q: 'Does an animal cell have a cell wall?', yes: false, why: 'Animal cells only have a flexible cell membrane; the stiff cell wall is only in plants' },
    { q: 'Does a plant cell have mitochondria?', yes: true, why: 'Plants need energy from food too, so their cells have mitochondria' },
    { q: 'Does an animal cell have chloroplasts?', yes: false, why: 'Animals get food by eating; only plant cells have chloroplasts to make food from light' },
    { q: 'Does an animal cell have a nucleus?', yes: true, why: 'Both plant and animal cells keep their DNA in a nucleus' },
    { q: 'Does a plant cell have a cell membrane?', yes: true, why: 'Plant cells have a cell membrane just inside the cell wall' },
  ];
  const item = pick(qs);
  return {
    prompt: item.q,
    choices: [{ value: 'yes' }, { value: 'no' }],
    answer: item.yes ? 'yes' : 'no',
    hint: 'Remember which parts are in both cells and which are only in plants.',
    explain: [`${item.why}.`, `So the answer is ${item.yes ? 'yes' : 'no'}.`],
  };
}

export const cells: Lesson = {
  id: 'cells',
  title: 'Cells',
  Thumb,
  Scene: CellsScene,
  sceneHint: 'Tap a part to learn its job · Drag labels onto the dots',
  learn: {
    heading: 'Plant and animal cells',
    intro: 'All living things are made of cells, far too small to see without a microscope. Plant and animal cells share many parts, but plant cells have a few extra ones.',
    points: [
      { icon: Microscope, text: 'Both have a nucleus, a cell membrane, cytoplasm and mitochondria.' },
      { icon: Sprout, text: 'Only plant cells have a cell wall, chloroplasts and a large vacuole.' },
      { icon: Zap, text: 'Mitochondria release energy; chloroplasts make food from light.' },
    ],
  },
  steps: [
    'Find the nucleus: the control centre with the DNA.',
    'Trace the cell membrane around the edge. In a plant cell, the stiff cell wall is outside it.',
    'Look for green chloroplasts and a big vacuole: they show it is a plant cell.',
    'Everything sits in the jelly-like cytoplasm.',
  ],
  example: {
    question: 'A cell has a nucleus, a membrane and mitochondria, but no cell wall and no chloroplasts. What kind of cell is it?',
    work: ['Nucleus, membrane and mitochondria are in both kinds of cell.', 'It has no cell wall and no chloroplasts.'],
    answer: 'It is an animal cell.',
  },
  grownups: [
    'Plants have mitochondria too: a very common misconception is that plants only photosynthesise and never respire.',
    'If you can borrow a microscope, onion skin and cheek cells (with a little iodine or food colouring) show the two cell types.',
    'Cells are tiny: about 10–100 micrometres across, so hundreds would fit across a millimetre.',
    'A fun model: a plant cell is like a box (stiff wall), an animal cell like a bag (flexible membrane).',
  ],
  makeQuestion,
};
