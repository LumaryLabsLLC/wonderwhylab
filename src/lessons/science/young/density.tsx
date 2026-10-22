import { useRef, useState } from 'react';
import { Divide, Droplets, Scale, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { fmt } from '../../../lib/answers';
import { C, shade } from '../../../lib/color';
import { pick, rand, round } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

/** Water's density is 1 g/cm³: less dense things float, denser things sink. */
const TANK = { x: 70, y: 230, w: 450, h: 390 };
const WATER_TOP = TANK.y + 70;
const FLOOR = TANK.y + TANK.h - 8;

interface BlockSpec {
  id: string;
  name: string;
  mass: number;
  volume: number;
  color: string;
}

const PRESETS: BlockSpec[] = [
  { id: 'cork', name: 'cork', mass: 12, volume: 50, color: '#d9b07a' },
  { id: 'wood', name: 'pine wood', mass: 100, volume: 200, color: '#e3c393' },
  { id: 'ice', name: 'ice', mass: 92, volume: 100, color: '#cfeefe' },
  { id: 'brick', name: 'brick', mass: 190, volume: 100, color: '#c8644a' },
  { id: 'aluminium', name: 'aluminium', mass: 135, volume: 50, color: '#c9ced6' },
  { id: 'iron', name: 'iron', mass: 395, volume: 50, color: '#7b8290' },
];

const density = (b: { mass: number; volume: number }) => round(b.mass / b.volume, 2);
const side = (volume: number) => 15 * Math.cbrt(volume);
const shelfPos = (i: number) => ({ x: 600 + (i % 3) * 120, y: 230 + Math.floor(i / 3) * 115 });

/** Where a block rests in the tank: floaters sit with (density × height) under water; sinkers rest on the floor. */
function restY(b: BlockSpec) {
  const s = side(b.volume);
  const d = density(b);
  if (d < 1) return WATER_TOP - s * (1 - d) + s / 2; // top sits (1 − d) of its height above the water
  if (d === 1) return (WATER_TOP + FLOOR) / 2;
  return FLOOR - s / 2;
}

function BlockShape({ b, x, y, selected }: { b: BlockSpec; x: number; y: number; selected?: boolean }) {
  const s = side(b.volume);
  return (
    <g>
      <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={5} fill={b.color} stroke={selected ? C.teal : C.ink} strokeWidth={selected ? 4 : 2.5} />
      <rect x={x - s / 2 + 5} y={y - s / 2 + 5} width={s - 10} height={6} rx={3} fill="#ffffff" opacity={0.4} />
    </g>
  );
}

function DraggableBlock({
  b,
  home,
  inTank,
  selected,
  onDrop,
}: {
  b: BlockSpec;
  home: Pt;
  inTank: number | null;
  selected: boolean;
  onDrop: (id: string, p: Pt | null) => void;
}) {
  const [dragAt, setDragAt] = useState<Pt | null>(null);
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const drag = useSvgDrag(
    (p) => {
      last.current = p;
      if (start.current && Math.hypot(p.x - start.current.x, p.y - start.current.y) > 6) setDragAt(p);
    },
    {
      onStart: (p) => {
        start.current = p;
      },
      onEnd: () => {
        const moved = dragAt !== null || (last.current && start.current && Math.hypot(last.current.x - start.current.x, last.current.y - start.current.y) > 6);
        onDrop(b.id, moved ? last.current : null);
        setDragAt(null);
      },
    },
  );
  const at = dragAt ?? (inTank !== null ? { x: inTank, y: restY(b) } : home);
  return (
    <g
      {...drag}
      role="button"
      aria-label={`${b.name} block, ${b.mass} grams, ${b.volume} cubic centimetres`}
      style={{ ...drag.style, transform: `translate(${at.x}px, ${at.y}px)`, transition: dragAt ? 'none' : 'transform 0.7s cubic-bezier(0.3, 1.2, 0.5, 1)' }}
    >
      <BlockShape b={b} x={0} y={0} selected={selected} />
      {inTank === null && !dragAt && (
        <g pointerEvents="none">
          <text x={0} y={side(b.volume) / 2 + 20} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
            {b.name}
          </text>
          <text x={0} y={side(b.volume) / 2 + 38} textAnchor="middle" fontSize={13} fill={C.ink2}>
            {b.mass} g · {b.volume} cm³
          </text>
        </g>
      )}
    </g>
  );
}

interface BlockChallenge extends Challenge {
  id: string;
}

/** Predict → observe → explain: pick a shelf block and ask whether it will float. */
function floatChallenge(prev: BlockChallenge | null, inTank: Record<string, number>): BlockChallenge {
  const pool = PRESETS.filter((b) => !(b.id in inTank) && b.id !== prev?.id);
  const b = pick(pool.length ? pool : PRESETS.filter((x) => x.id !== prev?.id));
  const d = density(b);
  const floats = d < 1;
  return {
    id: b.id,
    question: `Will the ${b.name} float or sink?`,
    options: ['Float', 'Sink'],
    actual: floats ? 'Float' : 'Sink',
    because: `${b.mass} g ÷ ${b.volume} cm³ = ${fmt(d)} g/cm³, ${floats ? 'less' : 'more'} than water's 1 g/cm³, so it ${floats ? 'floats' : 'sinks'}.`,
  };
}

function DensityScene() {
  const [inTank, setInTank] = useState<Record<string, number>>({ wood: 210, iron: 390 });
  const [selected, setSelected] = useState('wood');
  const [custom, setCustom] = useState({ mass: 60, volume: 100 });
  const tankRef = useRef(inTank);
  tankRef.current = inTank;
  const poe = usePoe<BlockChallenge>((prev) => floatChallenge(prev, tankRef.current));

  const customBlock: BlockSpec = { id: 'custom', name: 'my block', ...custom, color: C.purple };
  const all = [...PRESETS, customBlock];
  const sel = all.find((b) => b.id === selected) ?? PRESETS[0];
  const d = density(sel);

  const drop = (id: string, p: Pt | null) => {
    setSelected(id);
    const inside = p && p.x > TANK.x && p.x < TANK.x + TANK.w && p.y > TANK.y - 40 && p.y < TANK.y + TANK.h;
    if (p ? inside : !(id in inTank)) {
      const used = Object.values(inTank);
      const x = p ? clamp(p.x, TANK.x + 50, TANK.x + TANK.w - 50) : [120, 210, 300, 390, 470].find((sx) => !used.some((u) => Math.abs(u - sx) < 70)) ?? 300;
      setInTank({ ...inTank, [id]: x });
      const b = all.find((x2) => x2.id === id)!;
      play(density(b) < 1 ? 'pop' : 'tap');
      // The experiment for the current prediction: let the block settle, then explain.
      if (id === poe.challenge.id) window.setTimeout(poe.observe, 800);
    } else {
      const next = { ...inTank };
      delete next[id];
      setInTank(next);
      play('tap');
    }
  };

  const verdict = d < 1 ? 'less than 1, so it floats' : d > 1 ? 'more than 1, so it sinks' : 'exactly 1, so it hangs in the water';

  return (
    <SceneSvg label="Drop blocks into water to see if they float or sink">
      {/* Predict → observe → explain */}
      <PoePanel x={70} y={24} w={450} poe={poe} />

      {/* Working card */}
      <rect x={560} y={30} width={400} height={120} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={560} y={30} width={400} height={120} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={760} y={56} textAnchor="middle" fontSize={14} fill={C.muted} className="caps">
        {sel.name}: density = mass ÷ volume
      </text>
      <text x={760} y={92} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill={C.ink}>
        {sel.mass} g ÷ {sel.volume} cm³ = {fmt(d)} g/cm³
      </text>
      <text x={760} y={130} textAnchor="middle" fontSize={16} fontWeight={600} fill={d < 1 ? '#1f7a4a' : d > 1 ? C.red : C.ink2}>
        {fmt(d)} is {verdict}
      </text>

      {/* Tank */}
      <rect x={TANK.x} y={WATER_TOP} width={TANK.w} height={TANK.h - (WATER_TOP - TANK.y)} fill="#a8d8f0" opacity={0.75} />
      <path d={`M${TANK.x},${WATER_TOP} q30,-8 60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t30,0`} fill="none" stroke={C.blue} strokeWidth={3} />
      <rect x={TANK.x} y={TANK.y} width={TANK.w} height={TANK.h} rx={10} fill="none" stroke={C.ink} strokeWidth={3} />
      <text x={TANK.x + TANK.w - 12} y={WATER_TOP + 26} textAnchor="end" fontSize={15} fill={shade(C.blue, -0.3)} fontWeight={600}>
        water: 1 g/cm³
      </text>

      {/* Make your own block */}
      <rect x={560} y={440} width={400} height={170} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={580} y={468} fontSize={15} fill={C.muted} className="caps">
        Make your own block
      </text>
      <text x={580} y={510} fontSize={18} fill={C.ink} fontWeight={600}>
        Mass {custom.mass} g
      </text>
      <SvgButton x={744} y={482} w={52} h={44} label="−" title="Less mass" onClick={() => setCustom({ ...custom, mass: Math.max(10, custom.mass - 10) })} />
      <SvgButton x={804} y={482} w={52} h={44} label="+" title="More mass" color={C.yellow} onClick={() => setCustom({ ...custom, mass: Math.min(400, custom.mass + 10) })} />
      <text x={580} y={570} fontSize={18} fill={C.ink} fontWeight={600}>
        Volume {custom.volume} cm³
      </text>
      <SvgButton x={744} y={542} w={52} h={44} label="−" title="Less volume" onClick={() => setCustom({ ...custom, volume: Math.max(20, custom.volume - 10) })} />
      <SvgButton x={804} y={542} w={52} h={44} label="+" title="More volume" color={C.yellow} onClick={() => setCustom({ ...custom, volume: Math.min(200, custom.volume + 10) })} />

      {/* The block to test for the current prediction */}
      {poe.waiting && !(poe.challenge.id in inTank) && (() => {
        const i = PRESETS.findIndex((x) => x.id === poe.challenge.id);
        const at = shelfPos(i);
        const s = side(PRESETS[i].volume) + 22;
        return <rect x={at.x - s / 2} y={at.y - s / 2} width={s} height={s} rx={12} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" />;
      })()}

      {all.map((b, i) => (
        <DraggableBlock
          key={b.id}
          b={b}
          home={b.id === 'custom' ? { x: 908, y: 525 } : shelfPos(i)}
          inTank={b.id in inTank ? inTank[b.id] : null}
          selected={b.id === selected}
          onDrop={drop}
        />
      ))}

      <Callout at={[TANK.x + 40, WATER_TOP]} box={[TANK.x + 20, 628]} w={300} icon={Waves} title="Floating" text="A floating block sinks until the water it pushes aside weighs as much as the block." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={14} y={14} width={92} height={58} rx={6} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <rect x={15} y={30} width={90} height={41} fill="#a8d8f0" />
      <rect x={30} y={20} width={22} height={22} rx={3} fill="#e3c393" stroke={C.ink} strokeWidth={2} />
      <rect x={70} y={50} width={18} height={18} rx={3} fill="#7b8290" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ---------- practice ----------

const VOLUMES = [10, 20, 40, 50, 100, 200];
const DENSITIES = [0.2, 0.25, 0.4, 0.5, 0.6, 0.8, 1.5, 2, 2.5, 3, 4];

/** A block whose mass is a whole number of grams. */
function block(): { mass: number; volume: number; d: number } {
  for (;;) {
    const volume = pick(VOLUMES);
    const d = pick(DENSITIES);
    const mass = round(d * volume, 4);
    if (Number.isInteger(mass)) return { mass, volume, d };
  }
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? 'density' : level === 1 ? pick(['density', 'float']) : pick(['mass', 'volume', 'compare', 'float']);

  if (kind === 'float') {
    const { mass, volume, d } = block();
    const floats = d < 1;
    return {
      prompt: `A ${mass} g block has a volume of ${volume} cm³. Will it float or sink in water?`,
      choices: [{ value: 'floats' }, { value: 'sinks' }],
      answer: floats ? 'floats' : 'sinks',
      hint: "Work out its density and compare it with water's 1 g/cm³.",
      explain: [`Density = ${mass} ÷ ${volume} = ${fmt(d)} g/cm³.`, `${fmt(d)} is ${floats ? 'less' : 'more'} than 1, so it ${floats ? 'floats' : 'sinks'}.`],
    };
  }
  if (kind === 'mass') {
    const { mass, volume, d } = block();
    return {
      prompt: `A block has a density of ${fmt(d)} g/cm³ and a volume of ${volume} cm³. What is its mass in grams?`,
      answer: String(mass),
      hint: 'Mass = density × volume.',
      explain: [`Mass = density × volume.`, `${fmt(d)} × ${volume} = ${mass}.`, `So the mass is ${mass} g.`],
    };
  }
  if (kind === 'volume') {
    const { mass, volume, d } = block();
    return {
      prompt: `A block has a mass of ${mass} g and a density of ${fmt(d)} g/cm³. What is its volume in cm³?`,
      answer: String(volume),
      hint: 'Volume = mass ÷ density.',
      explain: [`Volume = mass ÷ density.`, `${mass} ÷ ${fmt(d)} = ${volume}.`, `So the volume is ${volume} cm³.`],
    };
  }
  if (kind === 'compare') {
    let a = block();
    let b = block();
    while (a.d === b.d) b = block();
    if (rand(0, 1)) [a, b] = [b, a];
    const winner = a.d > b.d ? 'Block A' : 'Block B';
    return {
      prompt: `Block A is ${a.mass} g with a volume of ${a.volume} cm³. Block B is ${b.mass} g with a volume of ${b.volume} cm³. Which is denser?`,
      choices: [{ value: 'Block A' }, { value: 'Block B' }],
      answer: winner,
      hint: 'Work out mass ÷ volume for each block, then compare.',
      explain: [`Block A: ${a.mass} ÷ ${a.volume} = ${fmt(a.d)} g/cm³.`, `Block B: ${b.mass} ÷ ${b.volume} = ${fmt(b.d)} g/cm³.`, `${fmt(Math.max(a.d, b.d))} is bigger, so ${winner} is denser.`],
    };
  }
  const { mass, volume, d } = block();
  return {
    prompt: `A block has a mass of ${mass} g and a volume of ${volume} cm³. What is its density in g/cm³?`,
    answer: fmt(d),
    allowDecimal: true,
    hint: 'Density = mass ÷ volume.',
    explain: [`Density = mass ÷ volume.`, `${mass} ÷ ${volume} = ${fmt(d)}.`, `So the density is ${fmt(d)} g/cm³.`],
  };
}

export const densityLesson: Lesson = {
  id: 'density',
  title: 'Density',
  Thumb,
  Scene: DensityScene,
  sceneHint: 'Predict, then drag the block into the water',
  learn: {
    heading: 'Density: float or sink?',
    intro: 'Density tells you how much mass is packed into each cubic centimetre. Water has a density of 1 g/cm³. Anything less dense floats; anything denser sinks — it is not just about being heavy.',
    points: [
      { icon: Divide, text: 'Density = mass ÷ volume.' },
      { icon: Droplets, text: 'Less than 1 g/cm³ floats in water, more than 1 sinks.' },
      { icon: Scale, text: 'A huge log can float while a small pebble sinks.' },
    ],
  },
  steps: [
    'Find the mass (in grams) and the volume (in cm³).',
    'Divide the mass by the volume to get the density.',
    "Compare it with water's density of 1 g/cm³.",
    'Less than 1 floats; more than 1 sinks.',
  ],
  example: {
    question: 'An ice cube has a mass of 92 g and a volume of 100 cm³. Does it float?',
    work: ['Density = 92 ÷ 100 = 0.92 g/cm³.', '0.92 is less than 1.', 'So the ice floats — but only just, with most of it under water.'],
    answer: 'Yes: ice (0.92 g/cm³) floats, mostly under the surface.',
  },
  grownups: [
    'A common misconception is that heavy things sink and light things float. Density, not weight, decides it.',
    'Try it in the sink: a big apple floats, a small coin sinks. Ask "why?" before explaining.',
    'Floating blocks sit with a fraction under water equal to their density (0.92 → 92% under), which is why icebergs hide most of their size.',
    'Salt water is denser than fresh water, so things float more easily in the sea.',
  ],
  makeQuestion,
};
