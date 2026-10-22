import { useMemo, useState } from 'react';
import { ArrowBigRight, Flag as FlagIcon, ListOrdered, MousePointerClick } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import {
  ArrowGlyph,
  ArrowsPicture,
  BLOCK_COLORS,
  BlockTile,
  DIR_NAME,
  DIR_VEC,
  DIRS,
  DOWN,
  GridPicture,
  GridWorld,
  LEFT,
  Message,
  RIGHT,
  RobotBody,
  UP,
  ahead,
  endOf,
  makePuzzle,
  movesToBlocks,
  open,
  sameCell,
  useRunner,
} from '../engine';
import type { Cell, Dir, GridLayout, RobotState, World } from '../engine';
import { mcq } from '../q';
import { faceRandom } from '../questions';
import { SIDE, countUp, dirsInside, say } from '../words';

const GRID: GridLayout = { x: 50, y: 78, cell: 88 };
const PAD_C = { x: 735, y: 244 };
const BTN = 96;
const LOG = { x: 536, y: 448, w: 444, s: 48 };
const LOG_MAX = 7;

type Puzzle = World & { solution: Dir[] };
const newWorld = (): Puzzle => faceRandom(makePuzzle({ cols: 5, rows: 4, walls: 2, minLen: 3, maxLen: 5, minTurns: 1 }));
const startOf = (w: World): RobotState => ({ x: w.start.x, y: w.start.y, dir: w.start.dir, collected: [] });

/** Big arrow button for the arrow pad. */
function ArrowButton({ dir, onClick, disabled }: { dir: Dir; onClick: () => void; disabled: boolean }) {
  const x = PAD_C.x - BTN / 2 + DIR_VEC[dir][0] * (BTN + 10);
  const y = PAD_C.y - BTN / 2 + DIR_VEC[dir][1] * (BTN + 10);
  return (
    <g
      onClick={disabled ? undefined : onClick}
      role="button"
      aria-label={`Move ${DIR_NAME[dir]}`}
      aria-disabled={disabled}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      opacity={disabled ? 0.45 : 1}
      data-nopan
    >
      <rect x={x + 3} y={y + 5} width={BTN} height={BTN} rx={20} fill={C.ink} opacity={0.18} />
      <rect x={x} y={y} width={BTN} height={BTN} rx={20} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={2.5} />
      <ArrowGlyph cx={x + BTN / 2} cy={y + BTN / 2} s={BTN * 0.78} dir={dir} />
    </g>
  );
}

function RobotMovesScene() {
  const [world, setWorld] = useState<Puzzle>(newWorld);
  const [robot, setRobot] = useState<RobotState>(() => startOf(world));
  const [moves, setMoves] = useState<Dir[]>([]);
  const [bump, setBump] = useState<{ at: Cell; edge: boolean } | null>(null);
  const program = useMemo(() => ({ main: movesToBlocks(moves) }), [moves]);
  const runner = useRunner(world, program);
  const replaying = runner.status !== 'idle';
  const arrived = sameCell(robot, world.goal);

  const go = (d: Dir) => {
    runner.reset();
    const next = ahead(robot, d);
    if (!open(world, next)) {
      setRobot({ ...robot, dir: d });
      setBump({ at: next, edge: !(next.x >= 0 && next.y >= 0 && next.x < world.cols && next.y < world.rows) });
      play('wrong');
      return;
    }
    setBump(null);
    setRobot({ ...robot, x: next.x, y: next.y, dir: d });
    setMoves([...moves, d]);
    play(sameCell(next, world.goal) ? 'complete' : 'tap');
  };

  const restart = (w: World = world) => {
    runner.reset();
    setRobot(startOf(w));
    setMoves([]);
    setBump(null);
  };

  const newFlag = () => {
    const w = newWorld();
    setWorld(w);
    restart(w);
    play('whoosh');
  };

  const trail = useMemo(() => {
    const cells: Cell[] = [{ x: world.start.x, y: world.start.y }];
    for (const d of moves) cells.push(ahead(cells[cells.length - 1], d));
    return cells;
  }, [moves, world]);

  const best = world.solution.length;
  let text = 'Tap the arrows to drive the robot to the flag.';
  let tone: 'info' | 'good' | 'oops' = 'info';
  if (replaying) text = runner.status === 'done' ? 'That was your program: the same steps, in the same order.' : `Playing your steps: step ${Math.min(runner.index, moves.length)} of ${moves.length}.`;
  else if (bump) {
    tone = 'oops';
    text = bump.edge ? 'Bump! That is the edge of the board. Try another arrow.' : 'Bump! A rock is in the way. Try another arrow.';
  } else if (arrived) {
    tone = 'good';
    text =
      moves.length === best
        ? `You got there in ${moves.length} steps, the shortest way! Press Replay to watch your program.`
        : `You got there in ${moves.length} steps! Press Replay to watch your program.`;
  } else if (moves.length) text = `Step ${moves.length}: move ${DIR_NAME[moves[moves.length - 1]]}. Keep going!`;

  const shownLog = program.main.slice(-LOG_MAX);
  const hidden = program.main.length - shownLog.length;

  return (
    <SceneSvg label="A robot on a grid, with four arrow buttons to move it to the flag">
      <GridWorld
        world={world}
        layout={GRID}
        robot={replaying ? runner.robot : robot}
        trail={replaying ? runner.trail : trail}
        bump={replaying ? null : bump?.at}
        mood={arrived && !bump ? 'proud' : bump ? 'oops' : 'happy'}
      />
      <Message x={GRID.x} y={GRID.y + 4 * GRID.cell + 22} w={5 * GRID.cell} tone={tone} text={text} />

      {/* Arrow pad, with a little robot in the middle as a reminder of who listens. */}
      <circle cx={PAD_C.x} cy={PAD_C.y} r={40} fill="white" stroke={C.line} strokeWidth={2} />
      <g transform={`translate(${PAD_C.x} ${PAD_C.y})`}>
        <RobotBody size={52} />
      </g>
      {[UP, RIGHT, DOWN, LEFT].map((d) => (
        <ArrowButton key={d} dir={d} onClick={() => go(d)} disabled={arrived || runner.status === 'running'} />
      ))}

      {/* The steps so far: a program in the making. */}
      <text x={LOG.x} y={LOG.y - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Your steps · {moves.length}
      </text>
      <rect x={LOG.x} y={LOG.y} width={LOG.w} height={LOG.s + 20} rx={14} fill="white" stroke={C.ink} strokeWidth={2} />
      {moves.length === 0 && (
        <text x={LOG.x + LOG.w / 2} y={LOG.y + (LOG.s + 20) / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fill={C.muted}>
          Your steps show up here
        </text>
      )}
      {hidden > 0 && (
        <text x={LOG.x + 24} y={LOG.y + (LOG.s + 20) / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.muted}>
          +{hidden}
        </text>
      )}
      {shownLog.map((b, i) => (
        <BlockTile key={b.id} block={b} x={LOG.x + (hidden > 0 ? 48 : 12) + i * (LOG.s + 8)} y={LOG.y + 10} s={LOG.s} state={runner.activeIds.has(b.id) ? 'active' : undefined} />
      ))}

      <SvgButton x={536} y={560} w={140} h={56} fontSize={19} label="▶ Replay" onClick={runner.run} disabled={moves.length === 0 || runner.status === 'running'} color={C.green} textColor="white" title="Watch your steps again" />
      <SvgButton x={688} y={560} w={156} h={56} fontSize={19} label="Start again" onClick={() => restart()} disabled={moves.length === 0 && !bump} />
      <SvgButton x={856} y={560} w={124} h={56} fontSize={19} label="New flag" onClick={newFlag} />

      <Callout
        at={[PAD_C.x + BTN / 2 + 10 + BTN / 2, PAD_C.y - BTN / 2]}
        box={[806, 70]}
        w={170}
        icon={MousePointerClick}
        title="One tap, one step"
        text="Each arrow moves the robot one square that way."
      />
      <Callout
        at={[LOG.x + 40, LOG.y + LOG.s + 20]}
        box={[230, 612]}
        w={250}
        icon={ListOrdered}
        title="Steps in order"
        text="Every tap adds a step. A list of steps in order is a program!"
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={10} width={72} height={60} rx={8} fill="#eef3ff" stroke={C.ink} strokeWidth={1.5} />
      <line x1={30} y1={10} x2={30} y2={70} stroke="#d5defa" strokeWidth={1.5} />
      <line x1={54} y1={10} x2={54} y2={70} stroke="#d5defa" strokeWidth={1.5} />
      <line x1={6} y1={40} x2={78} y2={40} stroke="#d5defa" strokeWidth={1.5} />
      <g transform="translate(18 55) rotate(90)">
        <RobotBody size={20} />
      </g>
      <path d="M66 22 V36 M66 22 h9 l-3 4 l3 4 h-9" fill="#ef4444" stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <rect x={86} y={16} width={26} height={26} rx={6} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.5} />
      <ArrowGlyph cx={99} cy={29} s={20} dir={RIGHT} />
      <rect x={86} y={46} width={26} height={26} rx={6} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.5} />
      <ArrowGlyph cx={99} cy={59} s={20} dir={UP} />
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

function randomCell(cols: number, rows: number): Cell {
  return { x: rand(0, cols - 1), y: rand(0, rows - 1) };
}

/** L0: which single arrow reaches the flag next door? */
function oneArrow(): Question {
  const start = randomCell(3, 3);
  const d = pick(dirsInside(start, 3, 3));
  const goal = ahead(start, d);
  const world: World = { cols: 3, rows: 3, start: { ...start, dir: pick(DIRS) }, goal, walls: [] };
  const wrong = shuffle(DIRS.filter((x) => x !== d)).slice(0, 2);
  const labels = Object.fromEntries([d, ...wrong].map((x) => [DIR_NAME[x], <ArrowsPicture moves={[x]} size={64} />]));
  return mcq({
    prompt: 'Which arrow moves the robot onto the flag?',
    visual: <GridPicture world={world} />,
    answer: DIR_NAME[d],
    wrong: wrong.map((x) => DIR_NAME[x]),
    labels,
    names: Object.fromEntries([d, ...wrong].map((x) => [DIR_NAME[x], `the ${DIR_NAME[x]} arrow`])),
    hint: 'Look at where the flag is. Is it up, down, left or right of the robot?',
    explain: [`The flag is just ${SIDE[d]} the robot.`, `The ${DIR_NAME[d]} arrow moves the robot one square ${DIR_NAME[d]}.`, `So the answer is ${DIR_NAME[d]}.`],
  });
}

/** L1: how many steps along a straight line? */
function howManySteps(): Question {
  const across = Math.random() < 0.6;
  const cols = across ? 5 : 3;
  const rows = across ? 3 : 5;
  const n = rand(2, 4);
  const d: Dir = across ? pick([RIGHT, LEFT]) : pick([UP, DOWN]);
  const [dx, dy] = DIR_VEC[d];
  const start: Cell = across ? { x: dx > 0 ? rand(0, cols - 1 - n) : rand(n, cols - 1), y: rand(0, rows - 1) } : { x: rand(0, cols - 1), y: dy > 0 ? rand(0, rows - 1 - n) : rand(n, rows - 1) };
  const goal = { x: start.x + dx * n, y: start.y + dy * n };
  const world: World = { cols, rows, start: { ...start, dir: d }, goal, walls: [] };
  return {
    prompt: 'How many steps to the flag?',
    visual: <GridPicture world={world} />,
    choices: numberChoices(n, { count: 3, min: 1, max: 6, spread: 2 }).map((value) => ({ value })),
    answer: String(n),
    hint: 'Count the squares the robot moves into. Don’t count the square it starts on.',
    explain: [`The robot moves ${DIR_NAME[d]}, one square at a time: ${countUp(n)}.`, `It reaches the flag after ${n} steps.`],
  };
}

/** L2: which two-arrow program reaches a flag one square across and one up or down (sometimes past a rock)? */
function twoArrows(): Question {
  for (;;) {
    const cols = pick([3, 4]);
    const start = randomCell(cols, 3);
    const hs = dirsInside(start, cols, 3).filter((d) => d === RIGHT || d === LEFT);
    const vs = dirsInside(start, cols, 3).filter((d) => d === UP || d === DOWN);
    if (!hs.length || !vs.length) continue;
    const h = pick(hs);
    const v = pick(vs);
    const goal = ahead(ahead(start, h), v);
    const rock = Math.random() < 0.5;
    // With a rock, it sits on one of the two corners, so only one order works.
    const blockedFirst: Dir = pick([h, v]);
    const walls = rock ? [ahead(start, blockedFirst)] : [];
    const world: World = { cols, rows: 3, start: { ...start, dir: pick(DIRS) }, goal, walls };
    const order: Dir[] = rock ? (blockedFirst === h ? [v, h] : [h, v]) : shuffle([h, v]);
    const other: Dir[] = [order[1], order[0]];
    const all: Dir[][] = DIRS.flatMap((a) => DIRS.map((b) => [a, b] as Dir[]));
    const misses = all.filter((m) => !sameCell(endOf(world, m) ?? undefined, goal));
    const pool = shuffle(misses);
    // Prefer the blocked order as a choice when there is a rock: it is the tempting mistake.
    const wrong = rock ? [other, ...pool.filter((m) => say(m) !== say(other))].slice(0, 2) : pool.slice(0, 2);
    const answer = say(order);
    const labels = Object.fromEntries([order, ...wrong].map((m) => [say(m), <ArrowsPicture moves={m} />]));
    return mcq({
      prompt: 'Which two moves get the robot to the flag?',
      visual: <GridPicture world={world} />,
      answer,
      wrong: wrong.map(say),
      labels,
      names: Object.fromEntries([order, ...wrong].map((m) => [say(m), say(m)])),
      hint: rock ? 'Trace each one with your finger. Watch out for the rock!' : 'The flag is one square across and one square up or down. Trace each choice with your finger.',
      explain: [
        `The flag is 1 square ${DIR_NAME[h]} and 1 square ${DIR_NAME[v]}.`,
        rock ? `Going ${DIR_NAME[blockedFirst]} first bumps into the rock, so go ${DIR_NAME[order[0]]} first.` : `Move ${DIR_NAME[order[0]]}, then move ${DIR_NAME[order[1]]}.`,
        `So the answer is ${answer}.`,
      ],
    });
  }
}

function makeQuestion(level: number): Question {
  if (level <= 0) return oneArrow();
  if (level === 1) return Math.random() < 0.6 ? howManySteps() : oneArrow();
  return Math.random() < 0.7 ? twoArrows() : howManySteps();
}

export const robotMoves: Lesson = {
  id: 'robot-moves',
  title: 'Move the Robot',
  Thumb,
  Scene: RobotMovesScene,
  sceneHint: 'Tap an arrow to move the robot one square',
  learn: {
    heading: 'Giving the robot directions',
    intro: 'A robot can’t guess where to go. We tell it, one step at a time. Each arrow means one square that way.',
    points: [
      { icon: ArrowBigRight, text: 'One arrow moves the robot one square.' },
      { icon: ListOrdered, text: 'Steps happen in order, one after another.' },
      { icon: FlagIcon, text: 'Rocks and the edge of the board block the way.' },
    ],
  },
  steps: ['Find the robot and the flag.', 'Pick the arrow that points toward the flag.', 'Tap it and watch the robot move one square.', 'Keep going until the robot is on the flag!'],
  example: {
    question: 'The flag is 2 squares to the right of the robot. Which steps get it there?',
    visual: <ArrowsPicture moves={[RIGHT, RIGHT]} />,
    work: ['The flag is to the right, so use the right arrow.', 'It is 2 squares away, so tap right 2 times.'],
    answer: 'Right, right.',
  },
  grownups: [
    'Play “robot” away from the screen: your child gives you arrow directions to walk to a toy, one step per arrow.',
    'Say the steps out loud together (“right, right, up”) so the order becomes a list your child can remember and replay.',
    'Bumps are part of the fun. Ask “what happened?” and “which arrow would work instead?” rather than fixing it for them.',
  ],
  makeQuestion,
};
