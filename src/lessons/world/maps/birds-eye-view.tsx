import { useState } from 'react';
import type { ReactElement } from 'react';
import { Bird, Eye, Map as MapIcon } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, Emoji, mcq, Note, others } from './visuals/kit';
import { Drawn, SIDE, THING_NAMES, ThingPic, TOP } from './visuals/RoomThings';
import type { ThingId } from './visuals/RoomThings';

/** What each thing looks like from above, in words a 4-year-old knows. */
const FROM_ABOVE: Record<ThingId, string> = {
  bed: 'a long rectangle with a pillow',
  table: 'a circle',
  chair: 'a square',
  box: 'a rectangle',
  plant: 'a circle with leaves',
  rug: 'a rectangle with a pattern',
};

// ── Match mode ───────────────────────────────────────────────────────────────
const MATCH: ThingId[] = ['bed', 'table', 'chair', 'box', 'plant'];
const CARD = { x0: 48, gap: 184, w: 170, y: 118, h: 150, slotY: 284, slotH: 118 };
const cardX = (i: number) => CARD.x0 + i * CARD.gap;

// ── Map mode ─────────────────────────────────────────────────────────────────
type Cell = [number, number]; // [row, col]; row 0 = back of the room
const LAYOUT: Record<string, Cell> = { bed: [0, 0], plant: [0, 2], rug: [1, 1], box: [2, 0], table: [2, 2] };
const MAP_ITEMS = Object.keys(LAYOUT) as ThingId[];
const PLAN = { x: 560, y: 120, cell: 108 };
const ROWS = ['at the back', 'in the middle', 'at the front'];
const COLS = ['on the left', 'in the middle', 'on the right'];

function where([r, c]: Cell) {
  if (r === 1 && c === 1) return 'right in the middle';
  return `${ROWS[r]}, ${COLS[c]}`;
}

/** A point on the floor of the room picture: u goes left → right, v goes back → front (gentle perspective). */
function floorPt(u: number, v: number) {
  const left = 120 + (52 - 120) * v;
  const right = 392 + (462 - 392) * v;
  return { x: left + u * (right - left), y: 214 + v * 230 };
}

/** Where a cell's thing stands in the room picture; things further back are drawn smaller. */
function roomPos([r, c]: Cell) {
  const v = (r + 0.5) / 3;
  return { ...floorPt((c + 0.5) / 3, v), s: 0.62 + 0.42 * v };
}

function BirdsEyeScene() {
  const [mode, setMode] = useState<'match' | 'map'>('match');
  const [tray] = useState(() => shuffle(MATCH));
  const [matched, setMatched] = useState<ThingId[]>([]);
  const [mapped, setMapped] = useState<ThingId[]>([]);
  const [picked, setPicked] = useState<ThingId | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' }>({
    text: 'Drag each top shape to the thing it shows. Pretend you are a bird looking down!',
    tone: 'plain',
  });

  const switchMode = (m: 'match' | 'map') => {
    setMode(m);
    setPicked(null);
    setMsg(
      m === 'match'
        ? { text: 'Drag each top shape to the thing it shows. Pretend you are a bird looking down!', tone: 'plain' }
        : { text: 'Look at the room. Put each thing on the map in the same place.', tone: 'plain' },
    );
    play('tap');
  };

  // Match: try to put the top view of `id` on card `i`.
  const tryMatch = (id: ThingId, i: number) => {
    const target = MATCH[i];
    setPicked(null);
    if (matched.includes(target)) return;
    if (id === target) {
      const next = [...matched, id];
      setMatched(next);
      play('correct');
      setMsg(
        next.length === MATCH.length
          ? { text: 'All matched! From above we only see the top of things. That is a bird’s-eye view.', tone: 'good' }
          : { text: `Yes! From above, a ${THING_NAMES[id]} looks like ${FROM_ABOVE[id]}.`, tone: 'good' },
      );
    } else {
      play('wrong');
      setMsg({ text: `Not yet. From above, a ${THING_NAMES[target]} looks like ${FROM_ABOVE[target]}. Try another shape.`, tone: 'nudge' });
    }
  };

  const cardAt = (p: Pt) => MATCH.findIndex((_, i) => p.x >= cardX(i) && p.x <= cardX(i) + CARD.w && p.y >= CARD.y && p.y <= CARD.slotY + CARD.slotH);

  // Map: try to put `id` in plan cell `cell`.
  const tryMap = (id: ThingId, cell: Cell) => {
    setPicked(null);
    const target = LAYOUT[id];
    const taken = mapped.find((m) => LAYOUT[m][0] === cell[0] && LAYOUT[m][1] === cell[1]);
    if (taken) return;
    if (target[0] === cell[0] && target[1] === cell[1]) {
      const next = [...mapped, id];
      setMapped(next);
      play('correct');
      setMsg(
        next.length === MAP_ITEMS.length
          ? { text: 'Your map matches the room! A map shows a place from above.', tone: 'good' }
          : { text: `Yes! The ${THING_NAMES[id]} is ${where(target)}.`, tone: 'good' },
      );
    } else {
      play('wrong');
      setMsg({ text: `Look at the room again: the ${THING_NAMES[id]} is ${where(target)}.`, tone: 'nudge' });
    }
  };

  const cellAt = (p: Pt): Cell | null => {
    const c = Math.floor((p.x - PLAN.x) / PLAN.cell);
    const r = Math.floor((p.y - PLAN.y) / PLAN.cell);
    return r >= 0 && r < 3 && c >= 0 && c < 3 ? [r, c] : null;
  };

  return (
    <SceneSvg label="Bird's-eye view: match things seen from the side with how they look from above, then make a map of a room">
      <SvgButton x={48} y={28} w={150} h={48} fontSize={18} label="Match" active={mode === 'match'} color={mode === 'match' ? C.yellow : C.card} onClick={() => switchMode('match')} />
      <SvgButton x={212} y={28} w={190} h={48} fontSize={18} label="Make a map" active={mode === 'map'} color={mode === 'map' ? C.yellow : C.card} onClick={() => switchMode('map')} />
      <Emoji x={930} y={52} size={40}>
        🐦
      </Emoji>

      {mode === 'match' ? (
        <g>
          {MATCH.map((id, i) => {
            const x = cardX(i);
            const done = matched.includes(id);
            return (
              <g key={id} onClick={() => picked && tryMatch(picked, i)} style={{ cursor: picked ? 'pointer' : undefined }} data-nopan={picked ? true : undefined}>
                <rect x={x} y={CARD.y} width={CARD.w} height={CARD.h} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
                <Drawn draw={SIDE[id]} x={x + CARD.w / 2} y={CARD.y + 66} s={1.15} />
                <text x={x + CARD.w / 2} y={CARD.y + CARD.h - 14} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
                  {THING_NAMES[id]}
                </text>
                <rect
                  x={x + 18}
                  y={CARD.slotY}
                  width={CARD.w - 36}
                  height={CARD.slotH}
                  rx={14}
                  fill={done ? '#d8f6e6' : picked ? shade(C.yellow, 0.7) : 'transparent'}
                  stroke={done ? C.green : C.line}
                  strokeWidth={2.5}
                  strokeDasharray={done ? undefined : '7 6'}
                />
                {done ? (
                  <Drawn draw={TOP[id]} x={x + CARD.w / 2} y={CARD.slotY + CARD.slotH / 2} s={id === 'bed' ? 1 : 1.1} />
                ) : (
                  <text x={x + CARD.w / 2} y={CARD.slotY + CARD.slotH / 2 + 6} textAnchor="middle" fontSize={15} fill={C.muted}>
                    from above?
                  </text>
                )}
              </g>
            );
          })}
          {matched.length < MATCH.length && <rect x={48} y={432} width={904} height={150} rx={18} fill={shade(C.paper, 0.4)} stroke={C.line} strokeWidth={2} />}
          {tray.map((id, j) => {
            if (matched.includes(id)) return null;
            const x = 140 + j * 180;
            const y = 507;
            return (
              <Draggable
                key={id}
                x={x}
                y={y}
                hit={58}
                label={`${THING_NAMES[id]} seen from above`}
                onDrop={(p) => {
                  const i = cardAt(p);
                  if (i >= 0) tryMatch(id, i);
                }}
                onTap={() => {
                  setPicked(picked === id ? null : id);
                  play('tap');
                }}
              >
                {picked === id && <circle cx={x} cy={y} r={60} fill={shade(C.yellow, 0.6)} stroke={C.ink} strokeWidth={2} strokeDasharray="6 5" />}
                <Drawn draw={TOP[id]} x={x} y={y} s={id === 'bed' ? 0.9 : 1.05} />
              </Draggable>
            );
          })}
          <Note x={48} y={598} w={904} text={msg.text} tone={msg.tone} />
          <Callout at={[cardX(0) + 60, CARD.y + 70]} box={[300, 64]} w={210} icon={Eye} title="From the side" text="How we usually see things." />
          <Callout at={[cardX(4) + 85, CARD.slotY + 30]} box={[650, 64]} w={230} icon={Bird} title="From above" text="What a bird sees: only the top." />
        </g>
      ) : (
        <g>
          {/* Room picture */}
          <text x={60} y={100} fontSize={16} fill={C.muted} className="caps">
            The room
          </text>
          <rect x={120} y={126} width={272} height={88} fill={shade(C.paper, 0.3)} stroke={C.ink} strokeWidth={2} />
          <rect x={220} y={142} width={72} height={52} rx={4} fill="#cfe8ff" stroke={C.ink} strokeWidth={2} />
          <path d="M256,142 V194 M220,168 H292" stroke={C.ink} strokeWidth={2} />
          <path d="M120,214 L392,214 L462,444 L52,444 Z" fill={shade(C.wood, 0.45)} stroke={C.ink} strokeWidth={2} />
          {[...MAP_ITEMS]
            .sort((a, b) => LAYOUT[a][0] - LAYOUT[b][0])
            .map((id) => {
              const [r, c] = LAYOUT[id];
              if (id === 'rug') {
                // A rug lies flat on the floor, so draw it in the floor's perspective.
                const pts = [floorPt(c / 3 + 0.05, r / 3 + 0.07), floorPt((c + 1) / 3 - 0.05, r / 3 + 0.07), floorPt((c + 1) / 3 - 0.05, (r + 1) / 3 - 0.07), floorPt(c / 3 + 0.05, (r + 1) / 3 - 0.07)];
                return <polygon key={id} points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill={C.purple} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />;
              }
              const p = roomPos([r, c]);
              return <Drawn key={id} draw={SIDE[id]} x={p.x} y={p.y - 14 * p.s} s={p.s} />;
            })}

          {/* Plan */}
          <text x={PLAN.x} y={100} fontSize={16} fill={C.muted} className="caps">
            The map (from above)
          </text>
          <rect x={PLAN.x} y={PLAN.y} width={PLAN.cell * 3} height={PLAN.cell * 3} fill={C.card} stroke={C.ink} strokeWidth={3} />
          <rect x={PLAN.x + PLAN.cell + 18} y={PLAN.y - 7} width={PLAN.cell - 36} height={14} fill="#cfe8ff" stroke={C.ink} strokeWidth={2} />
          {[1, 2].map((k) => (
            <g key={k}>
              <line x1={PLAN.x + k * PLAN.cell} y1={PLAN.y} x2={PLAN.x + k * PLAN.cell} y2={PLAN.y + 3 * PLAN.cell} stroke={C.line} strokeWidth={2} strokeDasharray="6 6" />
              <line x1={PLAN.x} y1={PLAN.y + k * PLAN.cell} x2={PLAN.x + 3 * PLAN.cell} y2={PLAN.y + k * PLAN.cell} stroke={C.line} strokeWidth={2} strokeDasharray="6 6" />
            </g>
          ))}
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}${c}`}
                x={PLAN.x + c * PLAN.cell + 3}
                y={PLAN.y + r * PLAN.cell + 3}
                width={PLAN.cell - 6}
                height={PLAN.cell - 6}
                fill={picked ? shade(C.yellow, 0.75) : 'transparent'}
                opacity={picked ? 0.7 : 1}
                onClick={() => picked && tryMap(picked, [r, c])}
                style={{ cursor: picked ? 'pointer' : undefined }}
                data-nopan={picked ? true : undefined}
              />
            )),
          )}
          {mapped.map((id) => {
            const [r, c] = LAYOUT[id];
            return <Drawn key={id} draw={TOP[id]} x={PLAN.x + (c + 0.5) * PLAN.cell} y={PLAN.y + (r + 0.5) * PLAN.cell} s={id === 'bed' ? 0.95 : 1} />;
          })}

          {/* Tray */}
          {mapped.length < MAP_ITEMS.length && <rect x={500} y={466} width={452} height={110} rx={18} fill={shade(C.paper, 0.4)} stroke={C.line} strokeWidth={2} />}
          {MAP_ITEMS.map((id, j) => {
            if (mapped.includes(id)) return null;
            const x = 548 + j * 90;
            const y = 521;
            return (
              <Draggable
                key={id}
                x={x}
                y={y}
                hit={44}
                label={`${THING_NAMES[id]} for the map`}
                onDrop={(p) => {
                  const cell = cellAt(p);
                  if (cell) tryMap(id, cell);
                }}
                onTap={() => {
                  setPicked(picked === id ? null : id);
                  play('tap');
                }}
              >
                {picked === id && <circle cx={x} cy={y} r={44} fill={shade(C.yellow, 0.6)} stroke={C.ink} strokeWidth={2} strokeDasharray="6 5" />}
                <Drawn draw={TOP[id]} x={x} y={y} s={id === 'bed' ? 0.62 : 0.72} />
              </Draggable>
            );
          })}
          <Note x={48} y={598} w={904} text={msg.text} tone={msg.tone} />
          <Callout at={[256, 168]} box={[60, 486]} w={250} icon={MapIcon} title="Find the window" text="It is at the back of the room and at the top of the map." />
        </g>
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={10} width={64} height={60} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <g transform="translate(26 30) scale(0.32)">{TOP.bed()}</g>
      <g transform="translate(56 54) scale(0.32)">{TOP.table()}</g>
      <g transform="translate(58 26) scale(0.3)">{TOP.plant()}</g>
      <text x={96} y={40} textAnchor="middle" dominantBaseline="central" fontSize={28}>
        🐦
      </text>
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

const SHAPE_ART: Record<string, () => ReactElement> = {
  circle: () => (
    <svg width={56} height={48} viewBox="-30 -26 60 52" aria-hidden>
      <circle r={22} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
    </svg>
  ),
  square: () => (
    <svg width={56} height={48} viewBox="-30 -26 60 52" aria-hidden>
      <rect x={-20} y={-20} width={40} height={40} rx={3} fill={C.red} stroke={C.ink} strokeWidth={2.5} />
    </svg>
  ),
  'long rectangle': () => (
    <svg width={56} height={48} viewBox="-30 -26 60 52" aria-hidden>
      <rect x={-12} y={-24} width={24} height={48} rx={3} fill={C.blue} stroke={C.ink} strokeWidth={2.5} />
    </svg>
  ),
};

const SHAPE_OF: Partial<Record<ThingId, string>> = { table: 'circle', plant: 'circle', chair: 'square', bed: 'long rectangle' };

function PlanPic({ items, door }: { items: [ThingId, Cell][]; door: boolean }) {
  const cell = 70;
  return (
    <svg viewBox={`-10 -14 ${cell * 3 + 20} ${cell * 3 + 34}`} role="img" aria-label="A map of a room from above">
      <rect x={0} y={0} width={cell * 3} height={cell * 3} fill={C.card} stroke={C.ink} strokeWidth={3} />
      {door && (
        <g>
          <rect x={cell + 14} y={cell * 3 - 6} width={cell - 28} height={12} fill={C.brown} stroke={C.ink} strokeWidth={2} />
          <text x={cell * 1.5} y={cell * 3 + 18} textAnchor="middle" fontSize={13} fill={C.ink} fontWeight={700}>
            door
          </text>
        </g>
      )}
      {items.map(([id, [r, c]]) => (
        <g key={id} transform={`translate(${(c + 0.5) * cell} ${(r + 0.5) * cell}) scale(0.6)`}>
          {TOP[id]()}
        </g>
      ))}
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const id = pick(Object.keys(SHAPE_OF) as ThingId[]);
    const shape = SHAPE_OF[id]!;
    const name = THING_NAMES[id];
    return mcq({
      prompt: `What shape is the ${name} from above?`,
      visual: (
        <svg viewBox="-60 -55 120 95" role="img" aria-label={`A ${name} seen from the side`}>
          {SIDE[id]()}
        </svg>
      ),
      answer: shape,
      options: Object.keys(SHAPE_ART).map((s) => ({ value: s, art: SHAPE_ART[s]() })),
      hint: 'Pretend you are a bird looking straight down on top of it.',
      explain: [`From above, you only see the top of the ${name}.`, `The top of the ${name} is ${FROM_ABOVE[id]}.`, `So it looks like a ${shape}.`],
    });
  }
  if (level === 1) {
    const id = pick<ThingId>(['bed', 'table', 'chair', 'box', 'plant', 'rug']);
    const name = THING_NAMES[id];
    const opts = [id, ...others<ThingId>(['bed', 'table', 'chair', 'box', 'plant', 'rug'], id, 2)];
    return mcq({
      prompt: 'What is this, seen from above?',
      visual: <ThingPic id={id} view="top" size={150} />,
      answer: name,
      options: opts.map((o) => ({ value: THING_NAMES[o], art: <ThingPic id={o} view="side" size={60} /> })),
      hint: 'Look for clues: is it round or square? Is there a pillow or some leaves?',
      explain: [`From above, a ${name} looks like ${FROM_ABOVE[id]}.`, `This picture is ${FROM_ABOVE[id]}.`, `So it is the ${name}.`],
    });
  }
  // Level 2: read a little map of a room.
  const all: ThingId[] = ['bed', 'table', 'chair', 'box', 'plant', 'rug'];
  const [target, ...rest] = shuffle(all);
  const spots = shuffle<Cell>([
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 2],
  ]);
  const extra = rest.slice(0, 3);
  const items: [ThingId, Cell][] = [[target, [2, 1]], ...extra.map((id, i) => [id, spots[i]] as [ThingId, Cell])];
  const name = THING_NAMES[target];
  return mcq({
    prompt: 'This is a map of a room. What is closest to the door?',
    visual: <PlanPic items={items} door />,
    answer: name,
    options: [target, ...extra.slice(0, 2)].map((o) => ({ value: THING_NAMES[o], art: <ThingPic id={o} view="top" size={56} /> })),
    hint: 'Find the door first. Then look at what is right next to it.',
    explain: ['The door is at the bottom of the map.', `Right next to the door is ${FROM_ABOVE[target]}: the ${name}.`, `So the ${name} is closest to the door.`],
  });
}

export const birdsEyeView: Lesson = {
  id: 'birds-eye-view',
  title: 'Bird’s-Eye View',
  Thumb,
  Scene: BirdsEyeScene,
  sceneHint: 'Drag top shapes to their things · Then make a map of the room',
  learn: {
    heading: 'Looking from above',
    intro: 'A bird flying over your room sees only the tops of things. A map shows a place from above, just like a bird sees it.',
    points: [
      { icon: Eye, text: 'From the side, we see the front and the legs.' },
      { icon: Bird, text: 'From above, we see only the top.' },
      { icon: MapIcon, text: 'A map shows where things are, seen from above.' },
    ],
  },
  steps: ['Look at the thing from the side.', 'Imagine you are a bird looking straight down.', 'Think: what shape is its top?', 'Find that shape and put it in the right place.'],
  example: {
    question: 'What does a round table look like from above?',
    visual: (
      <svg viewBox="-60 -50 260 95" role="img" aria-label="A round table from the side and from above">
        {SIDE.table()}
        <path d="M58,0 H82" stroke={C.ink} strokeWidth={3} />
        <path d="M76,-6 L84,0 L76,6" fill="none" stroke={C.ink} strokeWidth={3} />
        <g transform="translate(140 0)">{TOP.table()}</g>
      </svg>
    ),
    work: ['Pretend you are a bird above the table.', 'You see only the top of it.', 'The top of a round table is a circle.'],
    answer: 'A round table looks like a circle from above.',
  },
  grownups: [
    'Look down at a table, a cup or a plate together and ask, “What shape do you see from above?”',
    'Draw a simple map of your child’s bedroom and let them put toys where the map shows.',
    'Look at a real map or a satellite picture of your street and find your home.',
  ],
  makeQuestion,
};
