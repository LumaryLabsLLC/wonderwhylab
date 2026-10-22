import { useRef, useState } from 'react';
import { Droplets, Mountain, Trees, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { mcq, Note, others } from './visuals/kit';
import { HillMark, MiniMap, parseMap, regions, TILE_FILL } from './visuals/landWater';
import type { Tile } from './visuals/landWater';

const COLS = 14;
const ROWS = 9;
const CELL = 48;
const GX = 40;
const GY = 92;
/** A spring high in the hills, where a river can start. */
const SPRING: [number, number] = [1, 2];

const START = [
  'HHHLLLLLLL~~~~',
  'HHLLLLLLLL~~~~',
  'HLLLLLLLLL~~~~',
  'LLLLLLLLLL~~~~',
  'LLLLLLLLL~~~~~',
  'LLLLLLLLL~~~~~',
  'LLLLLLLL~~~~~~',
  'LLLLLLL~~~~~~~',
  'LLLLLL~~~~~~~~',
];

type Tool = Tile | 'look';
type Goal = 'island' | 'lake' | 'river';

const GOALS: { id: Goal; title: string; text: string }[] = [
  { id: 'island', title: 'An island', text: 'Land with water all around it.' },
  { id: 'lake', title: 'A lake', text: 'Water with land all around it.' },
  { id: 'river', title: 'A river', text: 'Water flowing from the spring to the sea.' },
];

const DONE_MSG: Record<Goal, string> = {
  island: 'You made an island! It is land with water all around it.',
  lake: 'You made a lake! It is water with land all around it.',
  river: 'You made a river! Rivers flow downhill from high land to the sea.',
};

const isSea = ([r, c]: [number, number]) => START[r][c] === '~';

/** Which of the three challenges does this map show? */
function check(map: Tile[][]): Record<Goal, boolean> {
  const water = regions(map, true);
  const land = regions(map, false);
  const springRegion = water.find((g) => g.cells.some(([r, c]) => r === SPRING[0] && c === SPRING[1]));
  return {
    island: land.some((g) => !g.edge),
    lake: water.some((g) => !g.edge && g !== springRegion),
    river: !!springRegion && springRegion.cells.some(isSea),
  };
}

/** Name the feature at one tile, with a short true description. */
function describe(map: Tile[][], r: number, c: number): string {
  const t = map[r][c];
  const water = t === 'w';
  const region = regions(map, water).find((g) => g.cells.some(([y, x]) => y === r && x === c))!;
  const at = (y: number, x: number) => (y < 0 || x < 0 || y >= ROWS || x >= COLS ? null : map[y][x]);
  if (water) {
    if (!region.edge) return 'A lake: water with land all around it.';
    const landLR = at(r, c - 1) !== null && at(r, c - 1) !== 'w' && at(r, c + 1) !== null && at(r, c + 1) !== 'w';
    const landUD = at(r - 1, c) !== null && at(r - 1, c) !== 'w' && at(r + 1, c) !== null && at(r + 1, c) !== 'w';
    if (landLR || landUD) return 'A river: a long, thin line of water flowing to the sea.';
    return 'The sea: a big area of salty water.';
  }
  if (!region.edge) return 'An island: land with water all around it.';
  if (t === 'h') return 'Hills: high land. Many maps show it brown.';
  return 'Land: ground we can walk on. Many maps show it green.';
}

/** A bright outline around a group of tiles, so the child sees exactly which part was named. */
function RegionOutline({ cells }: { cells: [number, number][] }) {
  const inside = new Set(cells.map(([r, c]) => `${r},${c}`));
  const d: string[] = [];
  for (const [r, c] of cells) {
    const x = GX + c * CELL;
    const y = GY + r * CELL;
    if (!inside.has(`${r - 1},${c}`)) d.push(`M${x},${y} h${CELL}`);
    if (!inside.has(`${r + 1},${c}`)) d.push(`M${x},${y + CELL} h${CELL}`);
    if (!inside.has(`${r},${c - 1}`)) d.push(`M${x},${y} v${CELL}`);
    if (!inside.has(`${r},${c + 1}`)) d.push(`M${x + CELL},${y} v${CELL}`);
  }
  return (
    <g pointerEvents="none">
      <path d={d.join(' ')} stroke={C.yellow} strokeWidth={8} strokeLinecap="round" fill="none" />
      <path d={d.join(' ')} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </g>
  );
}

function LandWaterScene() {
  const [map, setMap] = useState<Tile[][]>(() => parseMap(START));
  const [tool, setTool] = useState<Tool>('l');
  const [done, setDone] = useState<Record<Goal, boolean>>({ island: false, lake: false, river: false });
  const [look, setLook] = useState<[number, number] | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' }>({
    text: 'Pick a colour and paint the map. Can you make an island, a lake and a river?',
    tone: 'plain',
  });

  const cellAt = (p: Pt): [number, number] | null => {
    const c = Math.floor((p.x - GX) / CELL);
    const r = Math.floor((p.y - GY) / CELL);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? [r, c] : null;
  };

  // Refs mirror the state so a fast stroke (many pointer moves before React re-renders) never loses a tile.
  const mapRef = useRef(map);
  const doneRef = useRef(done);
  const last = useRef<Pt | null>(null);

  const paint = (p: Pt) => {
    if (tool === 'look') {
      const cell = cellAt(p);
      if (!cell) return;
      setLook(cell);
      setMsg({ text: describe(mapRef.current, cell[0], cell[1]), tone: 'plain' });
      return;
    }
    // Fill every tile along the stroke since the last pointer position.
    const from = last.current ?? p;
    last.current = p;
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / (CELL / 4)));
    let next: Tile[][] | null = null;
    for (let i = 0; i <= steps; i++) {
      const cell = cellAt({ x: from.x + ((p.x - from.x) * i) / steps, y: from.y + ((p.y - from.y) * i) / steps });
      if (!cell) continue;
      const [r, c] = cell;
      const cur: Tile[][] = next ?? mapRef.current;
      if (cur[r][c] === tool) continue;
      const copy: Tile[][] = next ?? cur.map((row) => [...row]);
      copy[r][c] = tool;
      next = copy;
    }
    if (!next) return;
    mapRef.current = next;
    setMap(next);
    const now = check(next);
    const fresh = GOALS.find((g) => now[g.id] && !doneRef.current[g.id]);
    if (fresh) {
      play('correct');
      const all = GOALS.every((g) => now[g.id] || doneRef.current[g.id]);
      setMsg({ text: all ? `${DONE_MSG[fresh.id]} You made all three. Try “Look” to name the parts of your map!` : DONE_MSG[fresh.id], tone: 'good' });
      doneRef.current = { ...doneRef.current, ...Object.fromEntries(GOALS.filter((g) => now[g.id]).map((g) => [g.id, true])) };
      setDone(doneRef.current);
    }
  };

  const drag = useSvgDrag(paint, {
    onStart: () => {
      last.current = null;
    },
  });

  const choose = (t: Tool) => {
    setTool(t);
    setLook(null);
    play('tap');
    if (t === 'look') setMsg({ text: 'Tap any part of the map to find out what it is.', tone: 'plain' });
  };

  const reset = () => {
    mapRef.current = parseMap(START);
    doneRef.current = { island: false, lake: false, river: false };
    setMap(mapRef.current);
    setDone(doneRef.current);
    setLook(null);
    setMsg({ text: 'A fresh map! Pick a colour and paint.', tone: 'plain' });
    play('tap');
  };

  const lookRegion = look ? regions(map, map[look[0]][look[1]] === 'w').find((g) => g.cells.some(([y, x]) => y === look[0] && x === look[1])) : undefined;
  const sx = GX + (SPRING[1] + 0.5) * CELL;
  const sy = GY + (SPRING[0] + 0.5) * CELL;

  const tools: { id: Tool; label: string; fill: string }[] = [
    { id: 'w', label: 'Water', fill: TILE_FILL.w },
    { id: 'l', label: 'Land', fill: TILE_FILL.l },
    { id: 'h', label: 'Hills', fill: TILE_FILL.h },
    { id: 'look', label: 'Look', fill: C.card },
  ];

  return (
    <SceneSvg label="Paint a map with water, land and hills. Make an island, a lake and a river.">
      {map.map((row, r) =>
        row.map((t, c) => (
          <g key={`${r}-${c}`}>
            <rect x={GX + c * CELL} y={GY + r * CELL} width={CELL + 0.5} height={CELL + 0.5} fill={TILE_FILL[t]} />
            {t === 'h' && <HillMark x={GX + (c + 0.5) * CELL} y={GY + (r + 0.5) * CELL} />}
          </g>
        )),
      )}
      {lookRegion && <RegionOutline cells={lookRegion.cells} />}
      <circle cx={sx} cy={sy} r={10} fill={map[SPRING[0]][SPRING[1]] === 'w' ? C.white : TILE_FILL.w} stroke={C.ink} strokeWidth={2} />
      <text x={sx} y={sy - 16} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
        spring
      </text>
      <rect x={GX} y={GY} width={COLS * CELL} height={ROWS * CELL} fill="none" stroke={C.ink} strokeWidth={3} />
      <rect
        x={GX}
        y={GY}
        width={COLS * CELL}
        height={ROWS * CELL}
        fill="transparent"
        {...drag}
        style={{ ...drag.style, cursor: tool === 'look' ? 'help' : 'crosshair' }}
        role="img"
        aria-label="Map to paint"
      />

      {/* Tools */}
      <text x={736} y={84} fontSize={15} fill={C.muted} className="caps">
        Paint with
      </text>
      {tools.map((t, i) => {
        const x = 736 + (i % 2) * 116;
        const y = 96 + Math.floor(i / 2) * 64;
        return (
          <g key={t.id}>
            {tool === t.id && <rect x={x - 5} y={y - 5} width={118} height={64} rx={16} fill="none" stroke={C.ink} strokeWidth={2.5} strokeDasharray="6 5" />}
            <SvgButton x={x} y={y} w={108} h={52} fontSize={19} label={t.label} color={t.fill} active={tool === t.id} onClick={() => choose(t.id)} />
          </g>
        );
      })}

      {/* Challenges */}
      <text x={736} y={250} fontSize={15} fill={C.muted} className="caps">
        Can you make…
      </text>
      {GOALS.map((g, i) => {
        const y = 262 + i * 86;
        return (
          <g key={g.id}>
            <rect x={736} y={y} width={224} height={78} rx={12} fill={done[g.id] ? '#d8f6e6' : C.white} stroke={done[g.id] ? C.green : C.line} strokeWidth={2} />
            <text x={750} y={y + 25} fontSize={17} fontWeight={700} fill={C.ink}>
              {done[g.id] ? '✓ ' : ''}
              {g.title}
            </text>
            {wrap(g.text, 24).map((line, j) => (
              <text key={j} x={750} y={y + 47 + j * 19} fontSize={15} fill={C.ink2}>
                {line}
              </text>
            ))}
          </g>
        );
      })}
      <SvgButton x={736} y={530} w={224} h={52} fontSize={18} label="Start again" onClick={reset} />
      <Note x={GX} y={548} w={COLS * CELL} text={msg.text} tone={msg.tone} />
    </SceneSvg>
  );
}

function Thumb() {
  const m = parseMap(['~~~~~~', '~LL~~~', '~LLL~L', '~~L~~~']);
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {m.map((row, r) => row.map((t, c) => <rect key={`${r}${c}`} x={c * 20} y={r * 20} width={20.5} height={20.5} fill={TILE_FILL[t]} />))}
      <rect x={0.5} y={0.5} width={119} height={79} fill="none" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

/** A map with an island, a lake, a river and the sea. */
const FEATURES_MAP = ['HHLLLLL~~~', 'H~L~~LL~~~', 'L~LLLLL~L~', 'L~~LLLL~L~', 'LL~LLLL~~~', 'LL~LLL~~~~', '~~~~~~~~~~'];
const FEATURE_SPOT: Record<string, [number, number]> = { island: [2.5, 8], lake: [1, 3.5], river: [3, 1.5], sea: [5, 8] };
const FEATURE_INFO: Record<string, string> = {
  island: 'land with water all around it',
  lake: 'water with land all around it',
  river: 'a long, thin line of water flowing to the sea',
  sea: 'a very big area of salty water',
};

const swatch = (fill: string) => (
  <svg width={52} height={40} viewBox="0 0 52 40" aria-hidden>
    <rect x={2} y={2} width={48} height={36} rx={8} fill={fill} stroke={C.ink} strokeWidth={2.5} />
  </svg>
);

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5) {
      return mcq({
        prompt: 'What colour shows water on most maps?',
        answer: 'blue',
        options: [
          { value: 'blue', art: swatch(TILE_FILL.w) },
          { value: 'green', art: swatch(TILE_FILL.l) },
          { value: 'brown', art: swatch(TILE_FILL.h) },
        ],
        hint: 'Think of the colour of the sea on a sunny day.',
        explain: ['Maps use colours to show what is there.', 'Water, like seas, lakes and rivers, is coloured blue.', 'So the answer is blue.'],
      });
    }
    const land = pick(['green', 'brown'] as const);
    return mcq({
      prompt: `On this map, what does the ${land} part show?`,
      visual: <MiniMap map={parseMap(['~~~~~~~', '~HLL~~~', '~LLLL~~', '~~LL~~~', '~~~~~~~'])} label="A map of some land in the sea" />,
      answer: 'land',
      options: [{ value: 'land' }, { value: 'water' }, { value: 'sky' }],
      plain: true,
      hint: 'Blue is water. What is left?',
      explain: [
        'Maps show the ground from above, so there is no sky on a map.',
        'The blue part is water.',
        `Green and brown show land, so the ${land} part is land.`,
      ],
    });
  }
  if (level === 1) {
    const feature = pick(Object.keys(FEATURE_SPOT));
    const flip = Math.random() < 0.5;
    const rows = flip ? FEATURES_MAP.map((r) => [...r].reverse().join('')) : FEATURES_MAP;
    const [pr, pc] = FEATURE_SPOT[feature];
    const options = shuffle(['island', 'lake', 'river', 'sea'].filter((f) => f !== feature)).slice(0, 2);
    return mcq({
      prompt: 'What is inside the yellow ring?',
      visual: <MiniMap map={parseMap(rows)} point={[pr, flip ? 9 - pc : pc]} label="A map with a yellow ring around one part" />,
      answer: feature,
      options: [feature, ...options].map((f) => ({ value: f })),
      plain: true,
      hint: 'Is it land or water? Then look at what is all around it.',
      explain: [
        `Look inside the ring: it is ${feature === 'island' ? 'land' : 'water'}.`,
        `It is ${FEATURE_INFO[feature]}.`,
        `So it is ${feature === 'sea' ? 'the sea' : `a ${feature}`}.`,
      ],
    });
  }
  if (Math.random() < 0.5) {
    const feature = pick(Object.keys(FEATURE_INFO));
    const word = (f: string) => (f === 'sea' ? 'the sea' : f === 'island' ? 'an island' : `a ${f}`);
    return mcq({
      prompt: `What do we call ${FEATURE_INFO[feature]}?`,
      answer: word(feature),
      options: Object.keys(FEATURE_INFO).map((f) => ({ value: word(f) })),
      plain: true,
      hint: 'Picture it on a map. Is it land or water? What is around it?',
      explain: [`We are looking for ${FEATURE_INFO[feature]}.`, `That is called ${word(feature)}.`],
    });
  }
  // Count the islands. The land on the left runs off the map, so it does not count.
  const slots: [number, number, number][] = [
    [1, 3, 2],
    [1, 7, 2],
    [3, 5, 2],
    [4, 3, 1],
    [4, 8, 1],
  ];
  const k = 1 + Math.floor(Math.random() * 4);
  const grid = Array.from({ length: 6 }, () => ['L', 'L', ...Array(8).fill('~')]);
  for (const [r, c, w] of shuffle(slots).slice(0, k)) for (let i = 0; i < w; i++) grid[r][c + i] = 'L';
  const opts = [String(k), ...others(['1', '2', '3', '4', '5'], String(k), 3)].sort();
  return mcq({
    prompt: 'How many islands are on this map?',
    visual: <MiniMap map={parseMap(grid.map((r) => r.join('')))} label="A map with land on the left and some islands in the sea" />,
    answer: String(k),
    options: opts.map((o) => ({ value: o })),
    plain: true,
    ordered: true,
    hint: 'An island has water all around it. Check each piece of land.',
    explain: [
      'An island is land with water all around it.',
      'The land on the left runs off the edge of the map, so we cannot see water all around it.',
      `Count the pieces of land in the sea: there ${k === 1 ? 'is 1 island' : `are ${k} islands`}.`,
    ],
  });
}

export const landAndWater: Lesson = {
  id: 'land-and-water',
  title: 'Land and Water',
  Thumb,
  Scene: LandWaterScene,
  sceneHint: 'Pick a colour and paint · Make an island, a lake and a river',
  learn: {
    heading: 'Land and water on a map',
    intro: 'Maps use colours. Blue shows water. Green and brown show land.',
    points: [
      { icon: Waves, text: 'The sea is a very big area of salty water.' },
      { icon: Trees, text: 'An island is land with water all around it.' },
      { icon: Droplets, text: 'A lake is water with land all around it. A river flows to the sea.' },
      { icon: Mountain, text: 'Brown often shows hills: high land.' },
    ],
  },
  steps: ['Look at the colours: blue is water, green and brown are land.', 'Find a shape you know.', 'Look at what is all around it.', 'Name it: island, lake, river or sea.'],
  example: {
    question: 'There is green land, and blue water is all around it. What is it?',
    visual: <MiniMap map={parseMap(['~~~~~~', '~~LL~~', '~LLL~~', '~~~~~~'])} label="Land with water all around it" />,
    work: ['Green means land.', 'Blue water is on every side of it.', 'Land with water all around it is an island.'],
    answer: 'An island',
  },
  grownups: [
    'At bath time or in a sandpit, make an island and a lake together and name them.',
    'Look at a map or globe and ask: “Where is water? Where is land?”',
    'On a walk, look for puddles, streams or ponds and talk about where the water goes.',
  ],
  makeQuestion,
};
