import { useState } from 'react';
import { BookOpen, KeyRound, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, mcq, Note, others } from '../maps/visuals/kit';
import { KeyBox, RIVER, ROAD_GREY, Sym, SYM, SYM_NAME, SymPic } from './visuals/symbols';
import type { SymId } from './visuals/symbols';

const MAP = { x: 30, y: 56, w: 620, h: 500 };
const ROAD_Y = 330;
const RIVER_PTS: [number, number][] = [
  [330, 56],
  [310, 130],
  [350, 210],
  [340, 280],
  [352, 330],
  [370, 420],
  [356, 490],
  [380, 556],
];

/** A smooth curve through points (Catmull-Rom turned into Bézier curves). */
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const RIVER_D = smooth(RIVER_PTS);

type Mark = { id: SymId; x: number; y: number; s: number; rot?: number };
const MARKS: Mark[] = [
  ...[
    [80, 100],
    [122, 88],
    [166, 108],
    [96, 148],
    [142, 150],
    [190, 150],
    [112, 196],
    [160, 200],
    [210, 192],
  ].map(([x, y]) => ({ id: 'woods' as const, x, y, s: 1.15 })),
  ...[
    [470, 116],
    [528, 92],
    [592, 122],
    [556, 176],
  ].map(([x, y]) => ({ id: 'mountain' as const, x, y, s: 1.4 })),
  ...[
    [80, 392],
    [134, 386],
    [188, 396],
    [96, 448],
    [156, 456],
  ].map(([x, y]) => ({ id: 'house' as const, x, y, s: 1.3 })),
  { id: 'school', x: 566, y: 420, s: 1.6 },
  { id: 'bus', x: 492, y: 368, s: 1.2 },
  { id: 'campsite', x: 268, y: 166, s: 1.4 },
  { id: 'bridge', x: 352, y: ROAD_Y, s: 1.45, rot: 90 },
];
const KEY_IDS: SymId[] = ['woods', 'mountain', 'house', 'school', 'campsite', 'bus', 'bridge', 'river', 'road'];

const FACT: Record<SymId, string> = {
  woods: 'Lots of tree symbols together show woods.',
  mountain: 'Mountains are very high land.',
  house: 'Each little house symbol is a home.',
  school: 'Children go to school to learn.',
  campsite: 'A campsite is a place to put up tents.',
  bus: 'Buses stop here to pick people up.',
  bridge: 'A bridge carries the road over the river.',
  river: 'A river is shown as a blue line.',
  road: 'Roads are shown as grey lines.',
};

/** In "Make" mode these symbols are taken off the map and the child puts them back. */
type BuildId = 'bridge' | 'campsite' | 'bus';
const BUILD: { id: BuildId; task: string; ok: (p: Pt) => boolean; clue: string }[] = [
  { id: 'bridge', task: 'Put the bridge where the road crosses the river.', ok: (p) => Math.hypot(p.x - 352, p.y - ROAD_Y) < 44, clue: 'Find the place where the grey road meets the blue river.' },
  { id: 'campsite', task: 'Put the campsite between the woods and the river.', ok: (p) => p.x > 222 && p.x < 318 && p.y > 84 && p.y < 250, clue: 'Find the trees, then the blue river. The campsite goes in the space in the middle.' },
  { id: 'bus', task: 'Put the bus stop beside the road, next to the school.', ok: (p) => Math.abs(p.y - ROAD_Y) < 50 && p.x > 440 && p.x < 650, clue: 'Find the school symbol in the key, then find it on the map. The bus stop goes by the road near it.' },
];

function KeysScene() {
  const [mode, setMode] = useState<'find' | 'make'>('find');
  const [order, setOrder] = useState<SymId[]>(() => shuffle(KEY_IDS));
  const [found, setFound] = useState(0);
  const [lit, setLit] = useState<SymId | null>(null);
  const [built, setBuilt] = useState<BuildId[]>([]);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' }>({
    text: `Find the ${SYM_NAME[order[0]]}. Look at the key to see its symbol, then tap it on the map.`,
    tone: 'plain',
  });

  const target = order[found];

  const tapMark = (id: SymId) => {
    if (mode !== 'find') return;
    setLit(id);
    if (!target) {
      setMsg({ text: `That is the ${SYM_NAME[id]}. ${FACT[id]}`, tone: 'plain' });
      return;
    }
    if (id === target) {
      play('correct');
      const n = found + 1;
      setFound(n);
      setMsg(
        n === order.length
          ? { text: `Yes, the ${SYM_NAME[id]}! You found every symbol. You can read a map key!`, tone: 'good' }
          : { text: `Yes, the ${SYM_NAME[id]}! ${FACT[id]} Now find the ${SYM_NAME[order[n]]}.`, tone: 'good' },
      );
    } else {
      play('wrong');
      setMsg({ text: `Not yet: that symbol means ${SYM_NAME[id]}. Look at the key to see what the ${SYM_NAME[target]} symbol looks like.`, tone: 'nudge' });
    }
  };

  const drop = (id: BuildId, p: Pt) => {
    const b = BUILD.find((x) => x.id === id)!;
    if (b.ok(p)) {
      const next = [...built, id];
      setBuilt(next);
      play('correct');
      const left = BUILD.find((x) => !next.includes(x.id));
      setMsg({ text: left ? `Well placed! ${FACT[id]} Next: ${left.task}` : `Well placed! ${FACT[id]} Your map is complete.`, tone: 'good' });
    } else {
      play('wrong');
      setMsg({ text: `Not quite. ${b.task} ${b.clue}`, tone: 'nudge' });
    }
  };

  const switchMode = (m: 'find' | 'make') => {
    setMode(m);
    setLit(null);
    play('tap');
    if (m === 'make') {
      setBuilt([]);
      setMsg({ text: `Use the key and the clues. ${BUILD[0].task}`, tone: 'plain' });
    } else {
      const o = shuffle(KEY_IDS);
      setOrder(o);
      setFound(0);
      setMsg({ text: `Find the ${SYM_NAME[o[0]]}. Look at the key to see its symbol, then tap it on the map.`, tone: 'plain' });
    }
  };

  const hidden = (id: SymId) => mode === 'make' && BUILD.some((b) => b.id === id) && !built.includes(id as BuildId);
  const tappable = mode === 'find';

  return (
    <SceneSvg label="A map with symbols and a key. Find symbols on the map, or put symbols in the right places.">
      <rect x={MAP.x} y={MAP.y} width={MAP.w} height={MAP.h} rx={12} fill="#e9f5df" stroke={C.ink} strokeWidth={3} />
      {/* River and road (wide invisible strokes make them easy to tap) */}
      <path d={RIVER_D} fill="none" stroke={RIVER} strokeWidth={16} strokeLinecap="round" />
      <path d={`M${MAP.x},${ROAD_Y} H${MAP.x + MAP.w}`} stroke={ROAD_GREY} strokeWidth={22} />
      <path d={`M${MAP.x + 10},${ROAD_Y} H${MAP.x + MAP.w - 10}`} stroke={C.white} strokeWidth={2.5} strokeDasharray="12 10" />
      {tappable && (
        <g>
          <path d={RIVER_D} fill="none" stroke="transparent" strokeWidth={44} onClick={() => tapMark('river')} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="river symbol" />
          <path d={`M${MAP.x},${ROAD_Y} H${MAP.x + MAP.w}`} stroke="transparent" strokeWidth={44} onClick={() => tapMark('road')} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="road symbol" />
        </g>
      )}
      {lit === 'river' && <path d={RIVER_D} fill="none" stroke={C.yellow} strokeWidth={6} strokeDasharray="10 8" pointerEvents="none" />}
      {lit === 'road' && <path d={`M${MAP.x},${ROAD_Y} H${MAP.x + MAP.w}`} stroke={C.yellow} strokeWidth={6} strokeDasharray="10 8" pointerEvents="none" />}
      {MARKS.map((m, i) =>
        hidden(m.id) ? null : (
          <g
            key={i}
            onClick={() => tapMark(m.id)}
            style={{ cursor: tappable ? 'pointer' : undefined }}
            data-nopan={tappable ? true : undefined}
            role={tappable ? 'button' : undefined}
            aria-label={tappable ? `${SYM_NAME[m.id]} symbol` : undefined}
          >
            {tappable && <circle cx={m.x} cy={m.y} r={24} fill="transparent" />}
            {lit === m.id && <circle cx={m.x} cy={m.y} r={26} fill={C.yellow} opacity={0.55} />}
            <Sym id={m.id} x={m.x} y={m.y} s={m.s} rot={m.rot} />
          </g>
        ),
      )}

      {/* Mode buttons and key */}
      <SvgButton x={680} y={56} w={140} h={50} fontSize={18} label="Find" active={mode === 'find'} color={mode === 'find' ? C.yellow : C.card} onClick={() => switchMode('find')} />
      <SvgButton x={830} y={56} w={140} h={50} fontSize={18} label="Make" active={mode === 'make'} color={mode === 'make' ? C.yellow : C.card} onClick={() => switchMode('make')} />
      <KeyBox x={680} y={122} w={290} row={36} ids={KEY_IDS} highlight={lit} />
      {mode === 'find' && (
        <text x={680} y={510} fontSize={16} fill={C.ink2}>
          Found: {found} of {order.length}
        </text>
      )}
      {mode === 'make' &&
        BUILD.map((b, i) => {
          if (built.includes(b.id)) return null;
          const x = 726 + i * 98;
          const y = 516;
          return (
            <Draggable key={b.id} x={x} y={y} hit={30} label={`${SYM_NAME[b.id]} symbol to place`} onDrop={(p) => drop(b.id, p)}>
              <rect x={x - 42} y={y - 30} width={84} height={58} rx={12} fill={shade(C.yellow, 0.6)} stroke={C.ink} strokeWidth={2} />
              <g transform={`translate(${x} ${y - 4}) scale(1.3)`}>{SYM[b.id]()}</g>
              <text x={x} y={y + 46} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink} pointerEvents="none">
                {SYM_NAME[b.id]}
              </text>
            </Draggable>
          );
        })}
      <Note x={MAP.x} y={574} w={940} text={msg.text} tone={msg.tone} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={2} y={2} width={116} height={76} rx={8} fill="#e9f5df" stroke={C.ink} strokeWidth={1.5} />
      <path d="M40,2 C30,30 50,50 44,78" fill="none" stroke={RIVER} strokeWidth={6} />
      <path d="M2,44 H118" stroke={ROAD_GREY} strokeWidth={8} />
      <Sym id="bridge" x={43} y={44} s={0.7} rot={90} />
      <Sym id="woods" x={18} y={20} s={0.6} />
      <Sym id="mountain" x={90} y={20} s={0.8} />
      <Sym id="house" x={80} y={62} s={0.8} />
      <Sym id="campsite" x={20} y={62} s={0.7} />
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

const POINT_IDS: SymId[] = ['woods', 'house', 'school', 'campsite', 'mountain', 'bus'];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const id = pick(POINT_IDS);
    const keyIds = shuffle([id, ...others(POINT_IDS, id, 2)]);
    return mcq({
      prompt: 'Use the key. What does the circled symbol mean?',
      visual: (
        <svg viewBox="0 0 330 150" role="img" aria-label="A circled symbol next to a key">
          <circle cx={60} cy={75} r={44} fill={C.white} stroke={C.orange} strokeWidth={4} />
          <Sym id={id} x={60} y={75} s={1.8} />
          <KeyBox x={140} y={8} w={180} row={34} ids={keyIds} />
        </svg>
      ),
      answer: SYM_NAME[id],
      options: keyIds.map((k) => ({ value: SYM_NAME[k] })),
      plain: true,
      hint: 'Find the symbol in the key that looks exactly the same.',
      explain: ['Look at the circled symbol.', 'Find the same symbol in the key.', `The key says it means ${SYM_NAME[id]}.`],
    });
  }
  if (level === 1) {
    // Count one kind of symbol on a small map with some look-alikes.
    const id = pick<SymId>(['house', 'woods', 'mountain', 'campsite']);
    const n = 2 + Math.floor(Math.random() * 4);
    const decoys = others<SymId>(['house', 'woods', 'mountain', 'campsite', 'school', 'bus'], id, 2);
    const cells = shuffle(Array.from({ length: 15 }, (_, i) => i));
    const marks: { id: SymId; c: number }[] = [
      ...Array.from({ length: n }, (_, i) => ({ id, c: cells[i] })),
      ...Array.from({ length: 4 }, (_, i) => ({ id: decoys[i % 2], c: cells[n + i] })),
    ];
    const opts = Array.from(new Set([n - 1, n, n + 1, n + 2].filter((v) => v > 0))).map(String);
    return mcq({
      prompt: `Use the key. How many ${id === 'woods' ? 'tree symbols (woods)' : `${SYM_NAME[id]} symbols`} are on this map?`,
      visual: (
        <svg viewBox="0 0 420 200" role="img" aria-label="A small map with symbols, and a key">
          <rect x={4} y={4} width={240} height={192} rx={10} fill="#e9f5df" stroke={C.ink} strokeWidth={2} />
          {marks.map((m, i) => (
            <Sym key={i} id={m.id} x={34 + (m.c % 5) * 45 + ((m.c * 7) % 3) * 3} y={36 + Math.floor(m.c / 5) * 60} s={1.1} />
          ))}
          <KeyBox x={256} y={4} w={160} row={34} ids={[id, ...decoys]} />
        </svg>
      ),
      answer: String(n),
      options: opts.map((o) => ({ value: o })),
      plain: true,
      ordered: true,
      hint: 'Find the symbol in the key first. Then touch each one on the map as you count.',
      explain: [`The key shows the ${SYM_NAME[id]} symbol.`, 'Count only the symbols that look exactly like it.', `There are ${n}.`],
    });
  }
  if (Math.random() < 0.5) {
    return mcq({
      prompt: 'A road crosses a river. Which symbol should go where they meet?',
      visual: (
        <svg viewBox="0 0 220 140" role="img" aria-label="A road crossing a river, with a question mark where they meet">
          <rect x={2} y={2} width={216} height={136} rx={10} fill="#e9f5df" stroke={C.ink} strokeWidth={2} />
          <path d="M120,2 C100,50 130,90 110,138" fill="none" stroke={RIVER} strokeWidth={14} />
          <path d="M2,70 H218" stroke={ROAD_GREY} strokeWidth={18} />
          <circle cx={116} cy={70} r={22} fill={C.white} stroke={C.orange} strokeWidth={3} />
          <text x={116} y={78} textAnchor="middle" fontSize={24} fontWeight={800} fill={C.ink}>
            ?
          </text>
        </svg>
      ),
      answer: 'bridge',
      options: (['bridge', 'bus', 'campsite'] as SymId[]).map((k) => ({ value: SYM_NAME[k], art: <SymPic id={k} /> })),
      hint: 'How do cars and people get across a river without getting wet?',
      explain: ['Cars and people on the road need to get over the water.', 'A bridge carries a road over a river.', 'So the bridge symbol goes where they meet.'],
    });
  }
  // Which symbol is closest to the campsite?
  const pool = shuffle<SymId>(['house', 'school', 'mountain', 'bus', 'woods']).slice(0, 3);
  const dist = shuffle([1, 2, 3]);
  const angles = shuffle([20, 140, 260]);
  const pos = pool.map((id, i) => {
    const r = 34 + dist[i] * 22;
    const a = (angles[i] * Math.PI) / 180;
    return { id, x: 110 + r * Math.cos(a), y: 100 + r * Math.sin(a) * 0.8, d: dist[i] };
  });
  const near = pos.find((p) => p.d === 1)!;
  return mcq({
    prompt: 'Which symbol is closest to the campsite?',
    visual: (
      <svg viewBox="0 0 400 200" role="img" aria-label="A small map with a campsite and other symbols, and a key">
        <rect x={4} y={4} width={212} height={192} rx={10} fill="#e9f5df" stroke={C.ink} strokeWidth={2} />
        <Sym id="campsite" x={110} y={100} s={1.2} />
        {pos.map((p) => (
          <Sym key={p.id} id={p.id} x={p.x} y={p.y} s={1.1} />
        ))}
        <KeyBox x={226} y={4} w={170} row={34} ids={['campsite', ...pool]} />
      </svg>
    ),
    answer: SYM_NAME[near.id],
    options: pool.map((k) => ({ value: SYM_NAME[k], art: <SymPic id={k} /> })),
    hint: 'Find the campsite. Which symbol could you reach in the fewest steps?',
    explain: ['Find the campsite (the orange tent) in the middle.', 'Compare how far away each other symbol is.', `The ${SYM_NAME[near.id]} is closest.`],
  });
}

export const mapKeys: Lesson = {
  id: 'map-keys',
  title: 'Map Symbols and Keys',
  Thumb,
  Scene: KeysScene,
  sceneHint: 'Find: tap the symbol the key shows · Make: drag symbols to the right places',
  learn: {
    heading: 'Symbols and keys',
    intro: 'Maps use small pictures called symbols. The key (or legend) tells you what each symbol means.',
    points: [
      { icon: Search, text: 'A symbol is a small picture that stands for something real.' },
      { icon: KeyRound, text: 'The key lists every symbol and its meaning.' },
      { icon: BookOpen, text: 'Colours help too: blue for water, green for land and plants, grey for roads.' },
    ],
  },
  steps: ['Look at the key.', 'Find the symbol you need.', 'Search the map for the same symbol.', 'Read the meaning to understand the place.'],
  example: {
    question: 'On a map you see this symbol. The key says it means "campsite". What is there?',
    visual: (
      <svg viewBox="0 0 230 90" role="img" aria-label="A campsite symbol and its key">
        <Sym id="campsite" x={40} y={45} s={1.8} />
        <KeyBox x={90} y={8} w={130} row={36} ids={['campsite']} />
      </svg>
    ),
    work: ['Look at the symbol: an orange triangle like a tent.', 'Find it in the key.', 'The key says it means campsite.'],
    answer: 'A campsite, a place to put up tents',
  },
  grownups: [
    'Look at a real map (park, zoo or town) and find its key together.',
    'Invent symbols for places at home, like a bed or the fridge, and draw a map with a key.',
    'Ask “What would we cross if we walked from here to there?” to practise reading a map.',
  ],
  makeQuestion,
};
