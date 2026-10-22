import { useState } from 'react';
import { Divide, Ruler, Scale, ZoomOut } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { fmt } from '../../../lib/answers';
import { pick, rand, round } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Caps, Emoji, mcq } from '../trotters/visuals/kit';

/** One map centimetre in scene units. The ruler ticks on the map show this length. */
const CM = 40;
const CENTRE: Pt = { x: 330, y: 330 };

const ISLAND: Pt[] = [
  [120, 150], [190, 95], [290, 80], [380, 105], [470, 110], [545, 165], [580, 250], [560, 330], [600, 420], [580, 520],
  [510, 585], [420, 575], [340, 610], [250, 580], [170, 545], [100, 480], [80, 390], [110, 300], [85, 220],
].map(([x, y]) => ({ x, y }));
const LAKE: Pt[] = [[285, 255], [335, 245], [365, 270], [350, 300], [300, 305], [275, 285]].map(([x, y]) => ({ x, y }));
const HILLS: Pt[] = [{ x: 430, y: 160 }, { x: 470, y: 175 }, { x: 405, y: 185 }];

interface Town {
  name: string;
  emoji: string;
  at: Pt;
}

const TOWNS: Town[] = [
  { name: 'Harbour', emoji: '⚓', at: { x: 150, y: 470 } },
  { name: 'Lake Town', emoji: '🏘️', at: { x: 315, y: 335 } },
  { name: 'Farm Village', emoji: '🌾', at: { x: 470, y: 420 } },
  { name: 'Forest Camp', emoji: '🌲', at: { x: 205, y: 170 } },
  { name: 'Hill Town', emoji: '⛰️', at: { x: 455, y: 230 } },
  { name: 'Beach', emoji: '🏖️', at: { x: 520, y: 535 } },
];

const ZOOMS = [
  { km: 10, k: 1 },
  { km: 20, k: 0.5 },
];

const place = (p: Pt, k: number): Pt => ({ x: CENTRE.x + (p.x - CENTRE.x) * k, y: CENTRE.y + (p.y - CENTRE.y) * k });
const pts = (ps: Pt[], k: number) => ps.map((p) => place(p, k)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
/** Nearest half centimetre: what you would read on a ruler. */
const halfCm = (d: number) => Math.round((d / CM) * 2) / 2;

function ScaleBar({ x, y, km, cms = 4 }: { x: number; y: number; km: number; cms?: number }) {
  return (
    <g pointerEvents="none">
      {Array.from({ length: cms }, (_, i) => (
        <rect key={i} x={x + i * CM} y={y} width={CM} height={12} fill={i % 2 ? C.white : C.ink} stroke={C.ink} strokeWidth={1.5} />
      ))}
      {Array.from({ length: cms + 1 }, (_, i) => (
        <text key={i} x={x + i * CM} y={y + 32} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
          {i * km}
        </text>
      ))}
      <text x={x + cms * CM + 26} y={y + 32} fontSize={15} fontWeight={600} fill={C.ink}>
        km
      </text>
    </g>
  );
}

function MapPin({ p, label }: { p: Pt; label: string }) {
  return (
    <g pointerEvents="none">
      <circle cx={p.x} cy={p.y} r={14} fill={C.red} stroke={C.ink} strokeWidth={2.5} />
      <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill={C.white}>
        {label}
      </text>
    </g>
  );
}

function ScaleScene() {
  const [zoom, setZoom] = useState(0);
  const { km, k } = ZOOMS[zoom];
  const [ends, setEnds] = useState<[Pt, Pt]>(() => [TOWNS[0].at, TOWNS[1].at]);
  const [dragging, setDragging] = useState<0 | 1 | null>(null);

  // Pins are stored in zoom-1 coordinates so they stay on the same places when zooming.
  const a = place(ends[0], k);
  const b = place(ends[1], k);
  const snap = (p: Pt) => TOWNS.find((t) => Math.hypot(t.at.x - p.x, t.at.y - p.y) < 34 / k)?.at ?? p;
  const unplace = (p: Pt): Pt => ({ x: CENTRE.x + (clamp(p.x, 30, 630) - CENTRE.x) / k, y: CENTRE.y + (clamp(p.y, 30, 630) - CENTRE.y) / k });

  const dragA = useSvgDrag((p) => setEnds((e) => [unplace(p), e[1]]), { onStart: () => setDragging(0), onEnd: () => { setDragging(null); setEnds((e) => [snap(e[0]), e[1]]); play('pop'); } });
  const dragB = useSvgDrag((p) => setEnds((e) => [e[0], unplace(p)]), { onStart: () => setDragging(1), onEnd: () => { setDragging(null); setEnds((e) => [e[0], snap(e[1])]); play('pop'); } });

  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const cm = halfCm(len);
  const real = round(cm * km);
  const ux = len ? (b.x - a.x) / len : 1;
  const uy = len ? (b.y - a.y) / len : 0;
  const townAt = (p: Pt) => TOWNS.find((t) => t.at.x === p.x && t.at.y === p.y);
  const fromT = townAt(ends[0]);
  const toT = townAt(ends[1]);

  return (
    <SceneSvg label={`An island map with a scale of 1 cm to ${km} km. The pins are ${fmt(cm)} cm apart, about ${fmt(real)} km.`}>
      {/* Map */}
      <rect x={20} y={20} width={620} height={640} rx={16} fill={shade(C.blue, 0.5)} stroke={C.ink} strokeWidth={2} />
      <defs>
        <clipPath id="wo-scale-map">
          <rect x={20} y={20} width={620} height={640} rx={16} />
        </clipPath>
      </defs>
      <g clipPath="url(#wo-scale-map)">
        <polygon points={pts(ISLAND, k)} fill="#cfe8b4" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        <polygon points={pts(LAKE, k)} fill={shade(C.blue, 0.4)} stroke={shade(C.blue, -0.2)} strokeWidth={1.5} />
        {HILLS.map((h, i) => {
          const p = place(h, k);
          const s = 22 * k;
          return <polygon key={i} points={`${p.x - s},${p.y + s * 0.6} ${p.x},${p.y - s * 0.8} ${p.x + s},${p.y + s * 0.6}`} fill="#b59f7a" stroke={C.ink} strokeWidth={1.2} />;
        })}
        {TOWNS.map((t) => {
          const p = place(t.at, k);
          return (
            <g key={t.name} pointerEvents="none">
              <circle cx={p.x} cy={p.y} r={6} fill={C.white} stroke={C.ink} strokeWidth={2} />
              <Emoji x={p.x} y={p.y - 24} size={zoom ? 20 : 26}>
                {t.emoji}
              </Emoji>
              <text x={p.x} y={p.y + 24} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink} stroke="#cfe8b4" strokeWidth={4} paintOrder="stroke">
                {t.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* Measuring string with a centimetre tick every CM units */}
      <g pointerEvents="none">
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.yellow} strokeWidth={3} strokeLinecap="round" />
        {Array.from({ length: Math.floor(len / CM) }, (_, i) => {
          const d = (i + 1) * CM;
          const x = a.x + ux * d;
          const y = a.y + uy * d;
          return (
            <g key={i}>
              <line x1={x - uy * 9} y1={y + ux * 9} x2={x + uy * 9} y2={y - ux * 9} stroke={C.ink} strokeWidth={2.5} />
              <text x={x - uy * 22} y={y + ux * 22} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.ink} stroke={C.white} strokeWidth={3} paintOrder="stroke">
                {i + 1}
              </text>
            </g>
          );
        })}
      </g>
      <MapPin p={a} label="A" />
      <MapPin p={b} label="B" />
      <circle cx={a.x} cy={a.y} r={28} fill="transparent" {...dragA} role="slider" aria-label="Pin A: drag it to a place" style={{ ...dragA.style, cursor: dragging === 0 ? 'grabbing' : 'grab' }} />
      <circle cx={b.x} cy={b.y} r={28} fill="transparent" {...dragB} role="slider" aria-label="Pin B: drag it to a place" style={{ ...dragB.style, cursor: dragging === 1 ? 'grabbing' : 'grab' }} />

      {/* Scale bar */}
      <rect x={36} y={588} width={300} height={60} rx={10} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
      <ScaleBar x={56} y={600} km={km} />
      <text x={410} y={634} fontSize={17} fontWeight={700} fill={C.ink} stroke={shade(C.blue, 0.5)} strokeWidth={4} paintOrder="stroke">
        1 cm = {km} km
      </text>

      {/* Panel */}
      <SvgButton x={664} y={22} w={150} h={50} fontSize={17} label="1 cm : 10 km" active={zoom === 0} color={zoom === 0 ? C.yellow : C.card} onClick={() => setZoom(0)} />
      <SvgButton x={824} y={22} w={150} h={50} fontSize={17} label="1 cm : 20 km" active={zoom === 1} color={zoom === 1 ? C.yellow : C.card} onClick={() => setZoom(1)} />
      <rect x={664} y={92} width={310} height={330} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <Caps x={682} y={120}>
        Measure
      </Caps>
      <text x={682} y={152} fontSize={19} fontWeight={700} fill={C.ink}>
        {fromT && toT ? `${fromT.name} → ${toT.name}` : 'From pin A to pin B'}
      </text>
      <text x={682} y={194} fontSize={18} fill={C.ink}>
        On the map:
      </text>
      <text x={956} y={194} textAnchor="end" fontSize={24} fontWeight={800} fill={C.ink}>
        {fmt(cm)} cm
      </text>
      <text x={682} y={232} fontSize={18} fill={C.ink}>
        Scale:
      </text>
      <text x={956} y={232} textAnchor="end" fontSize={20} fontWeight={700} fill={C.ink}>
        1 cm = {km} km
      </text>
      <line x1={682} x2={956} y1={252} y2={252} stroke={C.line} strokeWidth={2} />
      <text x={682} y={282} fontSize={18} fill={C.ink}>
        Real distance:
      </text>
      <text x={956} y={316} textAnchor="end" fontSize={24} fontWeight={800} fill={C.ink}>
        {fmt(cm)} × {km} = {fmt(real)} km
      </text>
      <text x={682} y={352} fontSize={16} fill={C.ink2}>
        1 cm stands for {(km * 100000).toLocaleString('en')} cm, so
      </text>
      <text x={682} y={374} fontSize={16} fill={C.ink2}>
        as a ratio the scale is 1 : {(km * 100000).toLocaleString('en')}.
      </text>
      <text x={682} y={404} fontSize={15} fill={C.muted}>
        (1 km = 1,000 m = 100,000 cm)
      </text>
      <rect x={664} y={440} width={310} height={218} rx={16} fill={shade(C.yellow, 0.75)} stroke={C.ink} strokeWidth={2} />
      {[
        'Drag pins A and B onto two places.',
        'Count the cm ticks along the string.',
        `Multiply by the scale: 1 cm = ${km} km.`,
        'Switch scales: the island changes size, but real distances stay the same.',
      ]
        .flatMap((t, i) => wrap(`${i + 1}. ${t}`, 31).map((l, j) => ({ l, key: `${i}-${j}`, first: j === 0 })))
        .map((ln, n) => (
          <text key={ln.key} x={ln.first ? 680 : 698} y={470 + n * 21} fontSize={16} fill={C.ink}>
            {ln.l}
          </text>
        ))}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={4} width={112} height={72} rx={8} fill={shade(C.blue, 0.5)} />
      <ellipse cx={58} cy={36} rx={42} ry={26} fill="#cfe8b4" stroke={C.ink} strokeWidth={1.5} />
      <line x1={30} y1={46} x2={86} y2={26} stroke={C.yellow} strokeWidth={4} strokeLinecap="round" />
      <circle cx={30} cy={46} r={5} fill={C.red} stroke={C.ink} />
      <circle cx={86} cy={26} r={5} fill={C.red} stroke={C.ink} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={20 + i * 16} y={66} width={16} height={6} fill={i % 2 ? C.white : C.ink} stroke={C.ink} strokeWidth={1} />
      ))}
    </svg>
  );
}

/* ---------- Practice ---------- */

/** A measured line on a map with a scale bar underneath. */
function ScalePic({ cm, km, label }: { cm?: number; km: number; label: string }) {
  const unit = 30;
  return (
    <svg viewBox="0 0 330 112" role="img" aria-label={label}>
      {cm !== undefined && (
        <g>
          <circle cx={20} cy={30} r={7} fill={C.red} stroke={C.ink} strokeWidth={2} />
          <circle cx={20 + cm * unit} cy={30} r={7} fill={C.red} stroke={C.ink} strokeWidth={2} />
          <line x1={20} x2={20 + cm * unit} y1={30} y2={30} stroke={C.ink} strokeWidth={3} />
          <text x={20 + (cm * unit) / 2} y={18} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
            {fmt(cm)} cm on the map
          </text>
        </g>
      )}
      {Array.from({ length: 4 }, (_, i) => (
        <rect key={i} x={20 + i * unit} y={64} width={unit} height={10} fill={i % 2 ? C.white : C.ink} stroke={C.ink} strokeWidth={1.2} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <text key={i} x={20 + i * unit} y={94} textAnchor="middle" fontSize={15} fill={C.ink}>
          {i * km}
        </text>
      ))}
      <text x={20 + 4 * unit + 24} y={94} fontSize={15} fill={C.ink}>
        km
      </text>
      <text x={200} y={74} fontSize={16} fontWeight={700} fill={C.ink}>
        1 cm = {km} km
      </text>
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const style = level === 0 ? 0 : level === 1 ? rand(1, 2) : rand(3, 5);

  if (style === 0) {
    const km = pick([10, 10, 5, 2]);
    const cm = rand(2, 7);
    const answer = cm * km;
    return {
      prompt: `The line is ${cm} cm long on the map. The scale is 1 cm = ${km} km. How far is it in real life, in km?`,
      visual: <ScalePic cm={cm} km={km} label={`A ${cm} centimetre line and a scale bar where 1 cm is ${km} km`} />,
      answer: String(answer),
      hint: `Every centimetre on the map stands for ${km} km. How many lots of ${km}?`,
      explain: [`Each cm is ${km} km.`, `${cm} cm × ${km} = ${answer}.`, `It is ${answer} km in real life.`],
    };
  }
  if (style === 1) {
    const km = pick([5, 20, 25, 50]);
    const cm = rand(2, 9) + (Math.random() < 0.5 ? 0.5 : 0);
    const answer = round(cm * km);
    return {
      prompt: `On a map with a scale of 1 cm = ${km} km, two towns are ${fmt(cm)} cm apart. How far apart are they in real life, in km?`,
      visual: <ScalePic cm={cm} km={km} label={`A ${fmt(cm)} centimetre line and a scale bar where 1 cm is ${km} km`} />,
      answer: String(answer),
      allowDecimal: !Number.isInteger(answer),
      hint: 'Multiply the map distance by the number of km in each centimetre.',
      explain: [`1 cm = ${km} km.`, `${fmt(cm)} × ${km} = ${fmt(answer)}.`, `They are ${fmt(answer)} km apart.`],
    };
  }
  if (style === 2) {
    const km = pick([5, 10, 20, 25, 50]);
    const cm = rand(2, 8);
    const realKm = cm * km;
    return {
      prompt: `Two cities are ${realKm} km apart. The map scale is 1 cm = ${km} km. How many cm apart are they on the map?`,
      visual: <ScalePic km={km} label={`A scale bar where 1 cm is ${km} km`} />,
      answer: String(cm),
      hint: `How many lots of ${km} km fit into ${realKm} km?`,
      explain: [`Each cm on the map is ${km} km.`, `${realKm} ÷ ${km} = ${cm}.`, `They are ${cm} cm apart on the map.`],
    };
  }
  if (style === 3) {
    const ratio = pick([25000, 50000, 100000, 200000, 250000]);
    const kmPerCm = ratio / 100000;
    const cm = pick(ratio === 25000 ? [4, 8, 12] : ratio === 250000 ? [2, 4, 6] : [2, 3, 4, 5, 6, 8]);
    const answer = round(cm * kmPerCm);
    return {
      prompt: `A map’s scale is 1 : ${ratio.toLocaleString('en')}. A path is ${cm} cm long on the map. How long is it in real life, in km?`,
      answer: String(answer),
      allowDecimal: !Number.isInteger(answer),
      hint: '1 cm on the map is the ratio number of cm in real life. There are 100,000 cm in 1 km.',
      explain: [
        `1 cm on the map = ${ratio.toLocaleString('en')} cm in real life.`,
        `${ratio.toLocaleString('en')} cm ÷ 100,000 = ${fmt(kmPerCm)} km, so 1 cm = ${fmt(kmPerCm)} km.`,
        `${cm} × ${fmt(kmPerCm)} = ${fmt(answer)} km.`,
      ],
    };
  }
  if (style === 4) {
    const ratio = pick([10000, 50000, 100000, 1000000]);
    const right = ratio === 10000 ? '100 m' : `${(ratio / 100000).toLocaleString('en')} km`;
    const options = ['100 m', '0.5 km', '1 km', '10 km', '100 km'];
    return mcq({
      prompt: `On a map with a scale of 1 : ${ratio.toLocaleString('en')}, what does 1 cm stand for?`,
      answer: right,
      options: [right, ...options.filter((o) => o !== right)].slice(0, 4),
      hint: 'Change the ratio number from cm into metres (÷ 100), then into km (÷ 1,000).',
      explain: [
        `1 cm stands for ${ratio.toLocaleString('en')} cm.`,
        `${ratio.toLocaleString('en')} cm = ${(ratio / 100).toLocaleString('en')} m.`,
        `So 1 cm stands for ${right}.`,
      ],
    });
  }
  const pairs = pick([
    ['1 : 10,000', '1 : 1,000,000'],
    ['1 : 25,000', '1 : 250,000'],
    ['1 : 50,000', '1 : 5,000,000'],
  ]);
  const wantDetail = Math.random() < 0.5;
  const answer = wantDetail ? pairs[0] : pairs[1];
  return mcq({
    prompt: wantDetail ? 'Which map scale shows a small area in more detail, like streets and buildings?' : 'Which map scale can fit a whole country on one page?',
    answer,
    options: pairs,
    ordered: true,
    hint: 'A smaller number after the 1 means each cm stands for less real ground.',
    explain: wantDetail
      ? [`On ${pairs[0]}, 1 cm stands for much less ground than on ${pairs[1]}.`, 'Less ground per cm means things look bigger, with more detail.', `So ${answer} shows more detail.`]
      : [`On ${pairs[1]}, each cm stands for much more ground than on ${pairs[0]}.`, 'More ground per cm lets a big area fit on the page.', `So ${answer} fits a whole country.`],
  });
}

export const mapScale: Lesson = {
  id: 'map-scale',
  title: 'Map Scale',
  Thumb,
  Scene: ScaleScene,
  sceneHint: 'Drag the pins to measure, then switch the scale',
  learn: {
    heading: 'How big is it really?',
    intro:
      'A map is a small drawing of a big place. The scale tells you how much smaller: for example, every 1 cm on the map might stand for 10 km of real ground.',
    points: [
      { icon: Ruler, text: 'Measure the distance on the map in centimetres.' },
      { icon: Scale, text: 'A scale bar or a scale like “1 cm = 10 km” tells you what each centimetre stands for.' },
      { icon: Divide, text: 'Multiply to go from map to real life; divide to go from real life to map.' },
      { icon: ZoomOut, text: 'A ratio like 1 : 1,000,000 means 1 cm on the map is 1,000,000 cm (10 km) in real life.' },
    ],
  },
  steps: [
    'Measure the straight line between the two places in cm.',
    'Read the scale: how many km is 1 cm?',
    'Multiply: map cm × km per cm = real distance.',
    'For a ratio scale, change cm to km by dividing by 100,000.',
  ],
  example: {
    question: 'On a map with a scale of 1 : 50,000, a lake is 6 cm long. How long is it really?',
    work: ['1 cm on the map = 50,000 cm in real life.', '50,000 cm ÷ 100,000 = 0.5 km, so 1 cm = 0.5 km.', '6 × 0.5 = 3.'],
    answer: 'The lake is about 3 km long.',
  },
  grownups: [
    'Map distances are straight lines (“as the crow flies”); roads and paths are usually longer.',
    'Measure real maps with a ruler or a piece of string, then check with an online map’s measuring tool.',
    'A “large-scale” map (like 1 : 10,000) shows a small area in great detail; a “small-scale” map (like 1 : 1,000,000) shows a big area with less detail.',
    'Practise converting units: 100 cm = 1 m and 1,000 m = 1 km, so 100,000 cm = 1 km.',
  ],
  makeQuestion,
};
