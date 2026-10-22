import { useState } from 'react';
import { Box, Layers, Ruler, X } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { iso } from '../../visuals/Iso';
import { CubeStack, CuboidPicture, LAYER_COLORS } from './visuals/Cubes';

const U = 46;
const MAX_LAYERS = 5;

function BuildScene() {
  const [len, setLen] = useState(4);
  const [wid, setWid] = useState(3);
  const [layers, setLayers] = useState(1);
  /** Cubes placed in the layer being built, as "x,y" keys. */
  const [placed, setPlaced] = useState<string[]>([]);

  const perLayer = len * wid;
  const total = layers * perLayer + placed.length;
  const full = layers >= MAX_LAYERS;
  const ox = 310 - (len - wid) * Math.cos(Math.PI / 6) * U * 0.5;
  const oy = 560 - (len + wid) * 0.5 * U;
  const at = (x: number, y: number, z: number): [number, number] => {
    const [sx, sy] = iso(x, y, z, U);
    return [ox + sx, oy + sy];
  };

  const resize = (l: number, w: number) => {
    setLen(l);
    setWid(w);
    setLayers(1);
    setPlaced([]);
  };

  const finishLayer = () => {
    setLayers(layers + 1);
    setPlaced([]);
    play(layers + 1 === MAX_LAYERS ? 'complete' : 'pop');
  };

  const place = (key: string) => {
    if (full || placed.includes(key)) return;
    if (placed.length + 1 === perLayer) finishLayer();
    else {
      setPlaced([...placed, key]);
      play('pop');
    }
  };

  const takeOff = () => {
    if (placed.length) setPlaced([]);
    else if (layers > 0) setLayers(layers - 1);
  };

  const cubes: { x: number; y: number; z: number; color?: string; className?: string }[] = [];
  for (let z = 0; z < layers; z++) for (let x = 0; x < len; x++) for (let y = 0; y < wid; y++) cubes.push({ x, y, z });
  for (const k of placed) {
    const [x, y] = k.split(',').map(Number);
    cubes.push({ x, y, z: layers, className: 'pop-in' });
  }

  // Empty spaces in the layer being built: tap one to put a cube there.
  const slots = [];
  if (!full)
    for (let x = 0; x < len; x++)
      for (let y = 0; y < wid; y++) {
        const key = `${x},${y}`;
        if (placed.includes(key)) continue;
        const corners = [at(x, y, layers), at(x + 1, y, layers), at(x + 1, y + 1, layers), at(x, y + 1, layers)];
        slots.push(
          <polygon
            key={key}
            points={corners.map((p) => p.join(',')).join(' ')}
            fill={layers === 0 ? shade(C.wood, 0.55) : 'rgba(255,255,255,0.35)'}
            stroke={shade(LAYER_COLORS[layers % LAYER_COLORS.length], -0.35)}
            strokeWidth={2}
            strokeDasharray="6 4"
            onClick={() => place(key)}
            style={{ cursor: 'pointer' }}
          />,
        );
      }

  const height = layers + (placed.length ? 1 : 0);
  const [lx, ly] = at(len / 2, wid, 0);
  const [wx, wy] = at(len, wid / 2, 0);
  const [hx, hy] = at(len, 0, Math.max(height, 1) / 2);
  const [cx, cy] = at(len - 0.5, wid - 0.5, Math.max(height, 1));
  const done = placed.length === 0 && layers > 0;

  const PX = 652;
  return (
    <SceneSvg label={`A cuboid of cubes, ${len} long, ${wid} wide and ${height} layers tall`}>
      {/* floor */}
      <polygon points={[at(0, 0, 0), at(len, 0, 0), at(len, wid, 0), at(0, wid, 0)].map((p) => p.join(',')).join(' ')} fill={shade(C.wood, 0.4)} stroke={C.ink} strokeWidth={2} />
      <CubeStack cubes={cubes.filter((c) => c.z < layers)} unit={U} ox={ox} oy={oy} />
      {slots}
      <CubeStack cubes={cubes.filter((c) => c.z === layers)} unit={U} ox={ox} oy={oy} />

      <text x={lx - 22} y={ly + 34} textAnchor="end" fontSize={20} fontWeight={700} fill={C.ink}>
        length {len}
      </text>
      <text x={wx + 22} y={wy + 34} fontSize={20} fontWeight={700} fill={C.ink}>
        width {wid}
      </text>
      {height > 0 && (
        <text x={hx + 16} y={hy} dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
          height {height}
        </text>
      )}

      {/* ── Controls ── */}
      {(
        [
          ['Length', len, (v: number) => resize(v, wid), 6],
          ['Width', wid, (v: number) => resize(len, v), 5],
        ] as const
      ).map(([name, value, set, max], i) => (
        <g key={name}>
          <text x={PX} y={66 + i * 66} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
            {name}
          </text>
          <SvgButton x={PX + 110} y={40 + i * 66} w={52} h={52} label="−" title={`Shorter ${name.toLowerCase()}`} onClick={() => set(value - 1)} disabled={value <= 1} />
          <text x={PX + 200} y={66 + i * 66} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
            {value}
          </text>
          <SvgButton x={PX + 238} y={40 + i * 66} w={52} h={52} label="+" title={`Longer ${name.toLowerCase()}`} onClick={() => set(value + 1)} disabled={value >= max} color={C.yellow} />
        </g>
      ))}

      <rect x={PX} y={180} width={314} height={236} rx={16} fill={shade(C.teal, 0.88)} stroke={C.ink} strokeWidth={2} />
      <text x={PX + 18} y={210} fontSize={15} fill={C.muted} className="caps">
        One layer
      </text>
      <text x={PX + 18} y={240} fontSize={22} fontWeight={700} fill={C.ink} className="num">
        {len} × {wid} = {perLayer} cubes
      </text>
      <text x={PX + 18} y={278} fontSize={15} fill={C.muted} className="caps">
        Layers
      </text>
      <text x={PX + 18} y={308} fontSize={22} fontWeight={700} fill={C.ink} className="num">
        {layers}
        {placed.length ? ` + ${placed.length} of ${perLayer} cubes` : ''}
      </text>
      <text x={PX + 18} y={346} fontSize={15} fill={C.muted} className="caps">
        {done ? 'Volume' : 'Cubes so far'}
      </text>
      <text x={PX + 18} y={384} fontSize={done ? 24 : 28} fontWeight={700} fill={done ? shade(C.teal, -0.35) : C.ink} className="num">
        {done ? `${len} × ${wid} × ${layers} = ${total} cm³` : total}
      </text>

      <SvgButton x={PX} y={436} w={314} h={54} fontSize={18} label="Fill this layer" onClick={finishLayer} disabled={full} color={C.teal} textColor={C.white} />
      <SvgButton x={PX} y={502} w={150} h={52} fontSize={16} label="Take off" title="Take off the top layer" onClick={takeOff} disabled={layers === 0 && !placed.length} />
      <SvgButton
        x={PX + 164}
        y={502}
        w={150}
        h={52}
        fontSize={16}
        label="Empty"
        onClick={() => {
          setLayers(0);
          setPlaced([]);
        }}
        disabled={layers === 0 && !placed.length}
      />
      {full && (
        <text x={PX} y={590} fontSize={17} fill={C.ink2}>
          {MAX_LAYERS} layers is as tall as it goes!
        </text>
      )}

      <Callout
        at={[cx, cy]}
        box={[40, 24]}
        w={280}
        icon={Box}
        title="1 cube = 1 cm³"
        text="Each cube is 1 cm long, 1 cm wide and 1 cm tall: one cubic centimetre."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <g transform="translate(58 30)">
        <CubeStack
          cubes={[0, 1].flatMap((z) => [0, 1, 2].flatMap((x) => [0, 1].map((y) => ({ x, y, z }))))}
          unit={14}
        />
      </g>
    </svg>
  );
}

function volumeSteps(l: number, w: number, h: number): string[] {
  return [`One layer is ${l} × ${w} = ${l * w} cubes.`, `There are ${h} layers.`, `${l * w} × ${h} = ${l * w * h}, so the volume is ${l * w * h} cm³.`];
}

function countCubes(): Question {
  const l = rand(2, 3);
  const w = rand(1, 3);
  const h = rand(2, 3);
  return {
    prompt: 'How many cubes make this cuboid?',
    visual: <CuboidPicture l={l} w={w} h={h} />,
    answer: String(l * w * h),
    hint: 'Some cubes are hidden. Count the cubes in the top layer, then count the layers.',
    explain: [`The top layer is ${l} × ${w} = ${l * w} cubes.`, `There are ${h} layers, all the same.`, `${l * w} × ${h} = ${l * w * h} cubes.`],
  };
}

function oneLayer(): Question {
  const l = rand(2, 4);
  const w = rand(2, 3);
  const h = rand(2, 3);
  return {
    prompt: 'How many cubes are in one layer of this cuboid?',
    visual: <CuboidPicture l={l} w={w} h={h} />,
    answer: String(l * w),
    hint: 'Look at the top. Count the rows, and how many cubes are in each row.',
    explain: [`The top layer has ${w} rows of ${l} cubes.`, `${l} × ${w} = ${l * w}.`, `Every layer is the same: ${l * w} cubes.`],
  };
}

function lwh(): Question {
  const l = rand(2, 6);
  const w = rand(2, 5);
  const h = rand(2, 4);
  return {
    prompt: `A box is ${l} cm long, ${w} cm wide and ${h} cm tall. What is its volume in cm³?`,
    visual: pick([true, false]) ? <CuboidPicture l={l} w={w} h={h} labels unit={18} /> : undefined,
    answer: String(l * w * h),
    hint: 'Volume = length × width × height. Find one layer first.',
    explain: volumeSteps(l, w, h),
  };
}

function cube(): Question {
  const s = rand(2, 5);
  return {
    prompt: `A cube has edges ${s} cm long. What is its volume in cm³?`,
    answer: String(s ** 3),
    hint: 'A cube’s length, width and height are all the same.',
    explain: [`Length × width × height = ${s} × ${s} × ${s}.`, `${s} × ${s} = ${s * s}, then ${s * s} × ${s} = ${s ** 3}.`, `The volume is ${s ** 3} cm³.`],
  };
}

function missingSide(): Question {
  const l = rand(2, 6);
  const w = rand(2, 5);
  const h = rand(2, 6);
  const v = l * w * h;
  return {
    prompt: `A cuboid has a volume of ${v} cm³. It is ${l} cm long and ${w} cm wide. How tall is it (cm)?`,
    answer: String(h),
    hint: `Find how many cubes fit in one layer. How many layers make ${v}?`,
    explain: [`One layer is ${l} × ${w} = ${l * w} cubes.`, `${v} ÷ ${l * w} = ${h} layers.`, `So it is ${h} cm tall.`],
  };
}

function compare(): Question {
  let a: number[];
  let b: number[];
  do {
    a = [rand(2, 6), rand(2, 4), rand(2, 4)];
    b = [rand(2, 6), rand(2, 4), rand(2, 4)];
  } while (a.join() === b.join());
  const va = a[0] * a[1] * a[2];
  const vb = b[0] * b[1] * b[2];
  const answer = va === vb ? 'They hold the same' : va > vb ? 'Box A' : 'Box B';
  return {
    prompt: `Box A is ${a.join(' × ')} cm. Box B is ${b.join(' × ')} cm. Which holds more 1 cm cubes?`,
    choices: shuffle(['Box A', 'Box B', 'They hold the same']).map((value) => ({ value })),
    answer,
    hint: 'Work out the volume of each box: length × width × height.',
    explain: [`Box A: ${a.join(' × ')} = ${va} cm³.`, `Box B: ${b.join(' × ')} = ${vb} cm³.`, va === vb ? `${va} = ${vb}, so they hold the same.` : `${Math.max(va, vb)} > ${Math.min(va, vb)}, so ${answer} holds more.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([countCubes, oneLayer])();
  if (level === 1) return pick([lwh, lwh, cube])();
  return pick([missingSide, compare])();
}

export const volume: Lesson = {
  id: 'volume',
  title: 'Volume',
  Thumb,
  Scene: BuildScene,
  sceneHint: 'Tap the dashed squares to place cubes · Fill a layer, then build up',
  learn: {
    heading: 'How much space does it take up?',
    intro: 'Volume is how much space something takes up. We measure it by counting cubes: a cube 1 cm on every edge is 1 cubic centimetre (1 cm³).',
    points: [
      { icon: Box, text: 'Build a cuboid from 1 cm cubes and count them.' },
      { icon: Layers, text: 'Every layer has the same number of cubes, so count one layer, then the layers.' },
      { icon: X, text: 'One layer is length × width. Volume is length × width × height.' },
      { icon: Ruler, text: 'Volume is written in cm³ (“cubic centimetres”).' },
    ],
  },
  steps: [
    'Count the cubes along the length and the width.',
    'Multiply them: that’s one layer.',
    'Count the layers (the height).',
    'Multiply the layer by the height: length × width × height.',
  ],
  example: {
    question: 'What is the volume of a cuboid 4 cm long, 3 cm wide and 2 cm tall?',
    visual: <CuboidPicture l={4} w={3} h={2} labels unit={18} />,
    work: ['One layer is 4 × 3 = 12 cubes.', 'There are 2 layers.', '12 × 2 = 24.'],
    answer: '24 cm³',
  },
  grownups: [
    'Build with real cubes (sugar cubes or building bricks) before using the formula, so length × width × height means something.',
    'Counting by layers is the big idea: it is a step towards seeing volume as area of the base × height.',
    'Hidden cubes in a picture often get missed. Ask “how many cubes are in the layer you can’t see?”',
    'Compare boxes at home: which cereal box holds more? Estimate, then measure.',
  ],
  makeQuestion,
};
