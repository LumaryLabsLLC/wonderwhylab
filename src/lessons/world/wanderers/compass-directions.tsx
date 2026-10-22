import { useState } from 'react';
import { Compass, RotateCw, Sunrise } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Emoji, mcq, Note } from '../maps/visuals/kit';
import { ARROW, CompassRose, DIR_NAME, DIRS, GridMap, OPPOSITE, STEP } from './visuals/compass';
import type { Dir, GridItem } from './visuals/compass';

const COLS = 9;
const ROWS = 6;
const CELL = 64;
const GX = 40;
const GY = 84;

type Spot = { id: string; name: string; emoji: string; c: number; r: number };
const SPOTS: Spot[] = [
  { id: 'tent', name: 'tent', emoji: '⛺', c: 1, r: 4 },
  { id: 'house', name: 'house', emoji: '🏠', c: 2, r: 1 },
  { id: 'tree', name: 'big tree', emoji: '🌳', c: 5, r: 1 },
  { id: 'castle', name: 'castle', emoji: '🏰', c: 7, r: 0 },
  { id: 'flowers', name: 'flowers', emoji: '🌻', c: 6, r: 4 },
];
const TENT = SPOTS[0];

type Task = { kind: 'follow'; to: Spot; legs: [Dir, number][] } | { kind: 'find'; to: Spot };

/** Directions from the tent to a spot, as one or two straight legs (random order). */
function legsTo(to: Spot): [Dir, number][] {
  const dx = to.c - TENT.c;
  const dy = to.r - TENT.r;
  const legs: [Dir, number][] = [];
  if (dy) legs.push([dy < 0 ? 'N' : 'S', Math.abs(dy)]);
  if (dx) legs.push([dx > 0 ? 'E' : 'W', Math.abs(dx)]);
  return Math.random() < 0.5 ? legs : legs.reverse();
}

const squares = (n: number) => `${n} square${n === 1 ? '' : 's'}`;
const sayLegs = (legs: [Dir, number][]) => legs.map(([d, n]) => `${squares(n)} ${DIR_NAME[d]}`).join(', then ');

/** Squash a list of moves into runs, e.g. N N E → "2 North, then 1 East". */
function summarise(moves: Dir[]) {
  const runs: [Dir, number][] = [];
  for (const m of moves) {
    const last = runs[runs.length - 1];
    if (last && last[0] === m) last[1]++;
    else runs.push([m, 1]);
  }
  return runs.map(([d, n]) => `${n} ${DIR_NAME[d]}`).join(', then ');
}

function newTask(n: number): Task {
  const to = pick(SPOTS.slice(1));
  return n % 2 === 0 ? { kind: 'follow', to, legs: legsTo(to) } : { kind: 'find', to };
}

function CompassScene() {
  const [count, setCount] = useState(0);
  const [task, setTask] = useState<Task>(() => newTask(0));
  const [pos, setPos] = useState<[number, number]>([TENT.c, TENT.r]);
  const [moves, setMoves] = useState<Dir[]>([]);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' } | null>(null);

  const taskText = (t: Task) => (t.kind === 'follow' ? `From the tent, go ${sayLegs(t.legs)}. Where do you end up?` : `Walk to the ${t.to.name} ${t.to.emoji}. Use the direction buttons.`);

  const move = (d: Dir) => {
    if (done) return;
    const [c, r] = [pos[0] + STEP[d][0], pos[1] + STEP[d][1]];
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) {
      play('wrong');
      setMsg({ text: `${DIR_NAME[d]} goes off the edge of the map here. Try another direction.`, tone: 'nudge' });
      return;
    }
    const next = [...moves, d];
    setPos([c, r]);
    setMoves(next);
    play('tap');
    const here = SPOTS.find((s) => s.c === c && s.r === r);
    if (here && here.id === task.to.id) {
      setDone(true);
      play('correct');
      setMsg({
        text:
          task.kind === 'follow'
            ? `You followed the directions to the ${here.name} ${here.emoji}! You went ${summarise(next)}.`
            : `You found the ${here.name}! Your directions were: ${summarise(next)}.`,
        tone: 'good',
      });
    } else if (here) {
      setMsg({ text: `This is the ${here.name} ${here.emoji}. ${task.kind === 'follow' ? `Check the directions: ${sayLegs(task.legs)}.` : `Keep going to the ${task.to.name}.`}`, tone: 'nudge' });
    } else {
      setMsg(null);
    }
  };

  const restart = () => {
    setPos(task.kind === 'follow' ? [TENT.c, TENT.r] : pos);
    setMoves([]);
    setDone(false);
    setMsg(null);
    play('tap');
  };

  const next = () => {
    const n = count + 1;
    const t = newTask(n);
    setCount(n);
    setTask(t);
    if (t.kind === 'follow') setPos([TENT.c, TENT.r]);
    setMoves([]);
    setDone(false);
    setMsg(null);
    play('tap');
  };

  // Step aside a little when standing on a place, so the place stays visible.
  const onSpot = SPOTS.some((s) => s.c === pos[0] && s.r === pos[1]);
  const ex = GX + (pos[0] + 0.5) * CELL + (onSpot ? 18 : 0);
  const ey = GY + (pos[1] + 0.5) * CELL + (onSpot ? 18 : 0);
  const pad: { d: Dir; x: number; y: number }[] = [
    { d: 'N', x: 790, y: 270 },
    { d: 'W', x: 724, y: 330 },
    { d: 'E', x: 856, y: 330 },
    { d: 'S', x: 790, y: 390 },
  ];
  const shown = moves.slice(-14);

  return (
    <SceneSvg label="A map with a compass. Move the explorer North, East, South or West to follow directions.">
      {/* Map */}
      <rect x={GX} y={GY} width={COLS * CELL} height={ROWS * CELL} rx={8} fill={shade(C.green, 0.6)} stroke={C.ink} strokeWidth={3} />
      {Array.from({ length: COLS - 1 }, (_, i) => (
        <line key={`v${i}`} x1={GX + (i + 1) * CELL} y1={GY} x2={GX + (i + 1) * CELL} y2={GY + ROWS * CELL} stroke={shade(C.green, 0.25)} strokeWidth={1.5} />
      ))}
      {Array.from({ length: ROWS - 1 }, (_, i) => (
        <line key={`h${i}`} x1={GX} y1={GY + (i + 1) * CELL} x2={GX + COLS * CELL} y2={GY + (i + 1) * CELL} stroke={shade(C.green, 0.25)} strokeWidth={1.5} />
      ))}
      {SPOTS.map((s) => (
        <g key={s.id}>
          {done && s.id === task.to.id && <circle cx={GX + (s.c + 0.5) * CELL} cy={GY + (s.r + 0.5) * CELL} r={30} fill={C.yellow} opacity={0.7} />}
          <Emoji x={GX + (s.c + 0.5) * CELL} y={GY + (s.r + 0.5) * CELL} size={40}>
            {s.emoji}
          </Emoji>
        </g>
      ))}
      <text x={GX + COLS * CELL / 2} y={GY - 12} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink2}>
        North (top of the map)
      </text>
      <g style={{ transform: `translate(${ex}px, ${ey}px) scale(${onSpot ? 0.75 : 1})`, transition: 'transform 0.25s ease' }}>
        <circle r={22} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
        <Emoji x={0} y={1} size={28}>
          🧒
        </Emoji>
      </g>

      {/* Compass and direction buttons */}
      <CompassRose x={856} y={150} r={60} />
      {pad.map(({ d, x, y }) => (
        <SvgButton key={d} x={x} y={y} w={124} h={52} fontSize={18} label={`${ARROW[d]} ${DIR_NAME[d]}`} color={d === 'N' ? shade(C.red, 0.7) : C.card} onClick={() => move(d)} disabled={done} />
      ))}
      <rect x={724} y={460} width={256} height={64} rx={12} fill={C.white} stroke={C.line} strokeWidth={2} />
      <text x={738} y={484} fontSize={15} fill={C.muted}>
        Clockwise from North:
      </text>
      <text x={738} y={510} fontSize={17} fontWeight={700} fill={C.ink}>
        <tspan fill={C.red}>N</tspan>ever <tspan fill={C.red}>E</tspan>at <tspan fill={C.red}>S</tspan>oggy <tspan fill={C.red}>W</tspan>affles
      </text>
      {done ? (
        <SvgButton x={724} y={540} w={256} h={52} fontSize={18} label="Next challenge" color={C.yellow} onClick={next} />
      ) : (
        moves.length > 0 && <SvgButton x={724} y={540} w={256} h={52} fontSize={18} label="Start this one again" onClick={restart} />
      )}

      {/* Task, moves and feedback */}
      <Note x={GX} y={480} w={COLS * CELL} text={taskText(task)} />
      <text x={GX} y={572} fontSize={15} fill={C.muted} className="caps">
        Your moves
      </text>
      {shown.map((d, i) => (
        <g key={i}>
          <rect x={GX + 110 + i * 34} y={554} width={30} height={30} rx={6} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
          <text x={GX + 125 + i * 34} y={575} textAnchor="middle" fontSize={16} fontWeight={800} fill={C.ink}>
            {d}
          </text>
        </g>
      ))}
      {msg && <Note x={GX} y={598} w={COLS * CELL} text={msg.text} tone={msg.tone} size={16} />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={2} y={2} width={116} height={76} rx={8} fill={shade(C.green, 0.6)} />
      <CompassRose x={60} y={42} r={24} />
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

const THINGS = ['⛺', '🌳', '🏠', '🌻', '🏰', '⭐'];
const NAMES: Record<string, string> = { '⛺': 'tent', '🌳': 'tree', '🏠': 'house', '🌻': 'flowers', '🏰': 'castle', '⭐': 'star' };
const opt = (e: string) => ({ value: NAMES[e], emoji: e });

function makeQuestion(level: number): Question {
  if (level === 0) {
    const d = pick(DIRS);
    return mcq({
      prompt: 'Which way does the orange arrow point?',
      visual: (
        <svg viewBox="0 0 200 200" role="img" aria-label="A compass rose with an orange arrow">
          <CompassRose x={100} y={100} r={66} point={d} />
        </svg>
      ),
      answer: DIR_NAME[d],
      options: DIRS.map((o) => ({ value: DIR_NAME[o] })),
      plain: true,
      ordered: true,
      hint: 'Find the red N first. Then go round clockwise: North, East, South, West.',
      explain: ['North is at the top, marked N.', 'Going clockwise: North, East, South, West.', `The arrow points to ${d}, which is ${DIR_NAME[d]}.`],
    });
  }
  if (level === 1) {
    // One straight walk on a small map; a decoy sits the same distance the opposite way.
    const cols = 5;
    const rows = 5;
    for (;;) {
      const d = pick(DIRS);
      const n = 1 + Math.floor(Math.random() * 2);
      const start: [number, number] = [Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)];
      const end: [number, number] = [start[0] + STEP[d][0] * n, start[1] + STEP[d][1] * n];
      const back: [number, number] = [start[0] - STEP[d][0] * n, start[1] - STEP[d][1] * n];
      const inside = ([c, r]: [number, number]) => c >= 0 && r >= 0 && c < cols && r < rows;
      if (!inside(end) || !inside(back)) continue;
      const side = DIRS[(DIRS.indexOf(d) + 1) % 4];
      const third: [number, number] = [start[0] + STEP[side][0] * n, start[1] + STEP[side][1] * n];
      const [goal, decoy, other] = shuffle(THINGS).slice(0, 3);
      const items: GridItem[] = [
        { c: start[0], r: start[1], emoji: '🧒' },
        { c: end[0], r: end[1], emoji: goal },
        { c: back[0], r: back[1], emoji: decoy },
      ];
      if (inside(third)) items.push({ c: third[0], r: third[1], emoji: other });
      const choices = inside(third) ? [goal, decoy, other] : [goal, decoy];
      return mcq({
        prompt: `The child walks ${squares(n)} ${DIR_NAME[d]}. What do they reach?`,
        visual: <GridMap cols={cols} rows={rows} items={items} label="A small map with a child and some places" />,
        answer: NAMES[goal],
        options: choices.map(opt),
        hint: 'North is up, so East is to the right. Count the squares with your finger.',
        explain: [`North is up, East is right, South is down and West is left.`, `Go ${squares(n)} ${DIR_NAME[d]} from the child.`, `You reach the ${NAMES[goal]} ${goal}.`],
      });
    }
  }
  if (Math.random() < 0.5) {
    // Turning: clockwise / anticlockwise quarter turns, or opposites.
    const face = pick(DIRS);
    const kind = pick(['cw', 'acw', 'opp'] as const);
    const ans = kind === 'cw' ? DIRS[(DIRS.indexOf(face) + 1) % 4] : kind === 'acw' ? DIRS[(DIRS.indexOf(face) + 3) % 4] : OPPOSITE[face];
    const prompt =
      kind === 'opp'
        ? `You face ${DIR_NAME[face]}. You turn right round to face the other way. Which way do you face now?`
        : `You face ${DIR_NAME[face]}. You make a quarter turn ${kind === 'cw' ? 'clockwise' : 'anticlockwise'}. Which way do you face now?`;
    return mcq({
      prompt,
      visual: (
        <svg viewBox="0 0 200 200" role="img" aria-label="A compass rose">
          <CompassRose x={100} y={100} r={66} point={face} />
        </svg>
      ),
      answer: DIR_NAME[ans],
      options: DIRS.map((o) => ({ value: DIR_NAME[o] })),
      plain: true,
      ordered: true,
      hint: kind === 'opp' ? 'The other way is straight across the compass.' : 'Clockwise goes N → E → S → W, the way clock hands move.',
      explain:
        kind === 'opp'
          ? [`Start at ${DIR_NAME[face]}.`, 'Turning to face the other way is a half turn, straight across the compass.', `Straight across from ${DIR_NAME[face]} is ${DIR_NAME[ans]}.`]
          : [`Start at ${DIR_NAME[face]}.`, `A quarter turn ${kind === 'cw' ? 'clockwise moves one step along N → E → S → W' : 'anticlockwise moves one step the other way: N → W → S → E'}.`, `So you face ${DIR_NAME[ans]}.`],
    });
  }
  // Two legs on a map: from the tent, go a North/South then an East/West.
  const cols = 6;
  const rows = 5;
  for (;;) {
    const tent: [number, number] = [Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)];
    const v = pick(['N', 'S'] as Dir[]);
    const h = pick(['E', 'W'] as Dir[]);
    const a = 1 + Math.floor(Math.random() * 2);
    const b = 1 + Math.floor(Math.random() * 3);
    const end: [number, number] = [tent[0] + STEP[h][0] * b, tent[1] + STEP[v][1] * a];
    const swap: [number, number] = [tent[0] + STEP[h][0] * a, tent[1] + STEP[v][1] * b]; // numbers mixed up
    const wrongWay: [number, number] = [tent[0] - STEP[h][0] * b, tent[1] + STEP[v][1] * a]; // East and West mixed up
    const spots = [end, swap, wrongWay];
    const inside = ([c, r]: [number, number]) => c >= 0 && r >= 0 && c < cols && r < rows;
    const key = (p: [number, number]) => p.join();
    if (!spots.every(inside) || new Set([...spots, tent].map(key)).size !== 4) continue;
    const [goal, d1, d2] = shuffle(THINGS.filter((t) => t !== '⛺')).slice(0, 3);
    const items: GridItem[] = [
      { c: tent[0], r: tent[1], emoji: '⛺' },
      { c: end[0], r: end[1], emoji: goal },
      { c: swap[0], r: swap[1], emoji: d1 },
      { c: wrongWay[0], r: wrongWay[1], emoji: d2 },
    ];
    return mcq({
      prompt: `Start at the tent. Go ${squares(a)} ${DIR_NAME[v]}, then ${squares(b)} ${DIR_NAME[h]}. Where are you?`,
      visual: <GridMap cols={cols} rows={rows} items={items} label="A map with a tent and three places" />,
      answer: NAMES[goal],
      options: [goal, d1, d2].map(opt),
      hint: 'Do one part at a time. Move your finger, then stop and do the next part.',
      explain: [`From the tent, go ${squares(a)} ${DIR_NAME[v]} (${v === 'N' ? 'up' : 'down'}).`, `Then go ${squares(b)} ${DIR_NAME[h]} (${h === 'E' ? 'right' : 'left'}).`, `You are at the ${NAMES[goal]} ${goal}.`],
    });
  }
}

export const compassDirections: Lesson = {
  id: 'compass-directions',
  title: 'North, South, East, West',
  Thumb,
  Scene: CompassScene,
  sceneHint: 'Press North, East, South or West to move the explorer',
  learn: {
    heading: 'The four main directions',
    intro: 'A compass shows four main directions: North, East, South and West. On most maps, North is at the top.',
    points: [
      { icon: Compass, text: 'North is up on most maps, South is down, East is right and West is left.' },
      { icon: RotateCw, text: 'Clockwise from North: Never Eat Soggy Waffles — N, E, S, W.' },
      { icon: Sunrise, text: 'The Sun rises in the east and sets in the west.' },
    ],
  },
  steps: ['Find North on the map or compass.', 'Remember the order: N, E, S, W, clockwise.', 'Move one square at a time and count.', 'Check where you end up.'],
  example: {
    question: 'From the tent, go 2 squares East. What do you reach?',
    visual: (
      <GridMap
        cols={4}
        rows={3}
        items={[
          { c: 0, r: 1, emoji: '⛺' },
          { c: 2, r: 1, emoji: '🌳' },
          { c: 0, r: 0, emoji: '🏰' },
        ]}
        arrows={[
          [0, 1],
          [2, 1],
        ]}
        label="A tent with a tree two squares to the east"
      />
    ),
    work: ['North is up, so East is to the right.', 'Count 2 squares to the right of the tent.', 'You reach the tree.'],
    answer: 'The tree 🌳',
  },
  grownups: [
    'Find North where you live with a compass app, then point to East, South and West together.',
    'Notice where the Sun rises in the morning (roughly east) and sets in the evening (roughly west).',
    'Play “robot”: give directions like “2 steps North, 1 step East” and swap roles.',
  ],
  makeQuestion,
};
