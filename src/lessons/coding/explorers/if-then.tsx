import { useMemo, useState } from 'react';
import { Footprints, GitBranch, Radar, Repeat } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import {
  BENCH,
  BLOCK_COLORS,
  BlockTile,
  DIRS,
  DragItem,
  GridPicture,
  GridWorld,
  Message,
  RunControls,
  ahead,
  cellCenter,
  inside,
  runProgram,
  sameCell,
  uid,
  useRunner,
} from '../engine';
import type { Block, Cell, Dir, GridLayout, Program, RobotState, Step, Trace, World } from '../engine';
import { mcq } from '../q';
import { countUp } from '../words';
import { ACT_WORDS, Beside, RulePicture, TEST_Q, actOf, makeAct, ruleText } from './visuals/pictures';
import type { Act, SensorTest } from './visuals/pictures';

type Side = 'left' | 'right';
const turnTo = (d: Dir, side: Side): Dir => ((d + (side === 'right' ? 1 : 3)) % 4) as Dir;
const otherSide = (s: Side): Side => (s === 'right' ? 'left' : 'right');

/** The rule as a program: repeat (until the flag) { if test { then } else { else } }. */
function ruleProgram(test: SensorTest, then: Act | null, otherwise: Act | null, times: number): Program {
  return { main: [{ kind: 'repeat', id: uid(), times, body: [{ kind: 'if', id: uid(), test, then: then ? [makeAct(then)] : [], else: otherwise ? [makeAct(otherwise)] : [] }] }] };
}

interface Maze {
  world: World;
  /** Which way the path turns at every rock. */
  side: Side;
  path: Cell[];
  turns: number;
  /** Times round the loop that are enough for the right rule (it stops at the flag). */
  limit: number;
}

/**
 * A corridor that always turns the same way. A rock (or the edge of the board) sits straight ahead
 * at every corner, so "if wall ahead → turn, else → go forward" finds the way and the other turn doesn't.
 */
function makeMaze(o: { cols: number; rows: number; corners: [number, number]; len?: [number, number]; decoys?: number; side?: Side }): Maze {
  for (;;) {
    const side: Side = o.side ?? pick(['left', 'right'] as Side[]);
    const corners = rand(o.corners[0], o.corners[1]);
    const start: Cell = { x: rand(0, o.cols - 1), y: rand(0, o.rows - 1) };
    const dir0 = pick(DIRS);
    const board: World = { cols: o.cols, rows: o.rows, start: { ...start, dir: dir0 }, walls: [] };
    const path: Cell[] = [start];
    const rocks: Cell[] = [];
    let c = start;
    let d = dir0;
    let ok = true;
    for (let s = 0; s <= corners && ok; s++) {
      const len = rand(o.len?.[0] ?? 1, o.len?.[1] ?? 3);
      for (let j = 0; j < len && ok; j++) {
        c = ahead(c, d);
        if (!inside(board, c) || path.some((p) => sameCell(p, c))) ok = false;
        else path.push(c);
      }
      if (ok && s < corners) {
        const stop = ahead(c, d);
        if (inside(board, stop)) rocks.push(stop);
        d = turnTo(d, side);
      }
    }
    if (!ok || rocks.some((r) => path.some((p) => sameCell(p, r)))) continue;
    const free: Cell[] = [];
    for (let y = 0; y < o.rows; y++) for (let x = 0; x < o.cols; x++) if (!path.some((p) => sameCell(p, { x, y })) && !rocks.some((r) => sameCell(r, { x, y }))) free.push({ x, y });
    const world: World = { ...board, goal: path[path.length - 1], walls: [...rocks, ...shuffle(free).slice(0, o.decoys ?? 1)] };
    const limit = path.length - 1 + corners + 2;
    const works = (a: Act) => runProgram(world, ruleProgram('wall-ahead', a, 'forward', limit), { stopAtGoal: true }).outcome === 'success';
    if (!works(side) || works(otherSide(side))) continue;
    return { world, side, path, turns: corners, limit };
  }
}

const SCENE_MAZE = { cols: 6, rows: 5, corners: [2, 3] as [number, number], decoys: 2 };

// ─────────────────────────── Scene ───────────────────────────

const R = BENCH.right;
const SLOT = 64;
const ROWS = { if: 136, then: 206, else: 280 };
const SLOT_X = R + 112;
const PAL = { y: 424, gap: 116 };
const CTRL_Y = 536;
type SlotName = 'then' | 'else';

/** The most recent step of `action` in this time round the loop (null before the first). */
function recent(trace: Trace | null, index: number, action: 'test' | 'loop'): Step | null {
  if (!trace) return null;
  for (let i = Math.min(index, trace.steps.length - 1); i >= 0; i--) {
    const s = trace.steps[i];
    if (s.action === action) return s;
    if (action === 'test' && s.action === 'loop') return null;
  }
  return null;
}

/** The sensor beam: a short ray from the robot to the square in front, red if blocked, green if clear. */
function SensorBeam({ g, robot, blocked }: { g: GridLayout; robot: RobotState; blocked: boolean }) {
  const [x, y] = cellCenter(g, robot);
  const [fx, fy] = cellCenter(g, ahead(robot, robot.dir));
  const ex = x + (fx - x) * 0.62;
  const ey = y + (fy - y) * 0.62;
  const color = blocked ? C.red : C.green;
  return (
    <g className="pop-in-wrap" pointerEvents="none">
      <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth={6} strokeDasharray="8 6" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r={g.cell * 0.17} fill={color} stroke={C.ink} strokeWidth={2} />
      <text x={ex} y={ey} textAnchor="middle" dominantBaseline="central" fontSize={g.cell * 0.22} fontWeight={800} fill="white">
        {blocked ? '!' : '✓'}
      </text>
    </g>
  );
}

function SensorScene() {
  const [maze, setMaze] = useState<Maze>(() => makeMaze(SCENE_MAZE));
  const [test, setTest] = useState<SensorTest>('wall-ahead');
  const [slots, setSlots] = useState<Record<SlotName, Block | null>>({ then: null, else: null });
  const [sel, setSel] = useState<SlotName>('then');
  const [last, setLast] = useState<Trace | null>(null);
  const ids = useMemo(() => ({ loop: uid(), cond: uid() }), []);
  const world = maze.world;
  const program = useMemo<Program>(
    () => ({ main: [{ kind: 'repeat', id: ids.loop, times: maze.limit, body: [{ kind: 'if', id: ids.cond, test, then: slots.then ? [slots.then] : [], else: slots.else ? [slots.else] : [] }] }] }),
    [ids, maze, test, slots],
  );
  const runner = useRunner(world, program, { stopAtGoal: true, onDone: setLast });
  const busy = runner.status === 'running';
  const ready = !!slots.then && !!slots.else;

  const cell = Math.min(BENCH.gridW / world.cols, 380 / world.rows);
  const grid: GridLayout = { x: BENCH.left + (BENCH.gridW - cell * world.cols) / 2, y: 70, cell };

  const edited = () => setLast(null);
  const fill = (slot: SlotName, a: Act) => {
    if (busy) return;
    play('pop');
    const next = { ...slots, [slot]: makeAct(a) };
    setSlots(next);
    const other: SlotName = slot === 'then' ? 'else' : 'then';
    setSel(next[other] ? slot : other);
    edited();
  };
  const tapSlot = (slot: SlotName) => {
    if (busy) return;
    if (slots[slot]) {
      play('tap');
      setSlots({ ...slots, [slot]: null });
      edited();
    }
    setSel(slot);
  };
  const onDrop = (a: Act, p: Pt) => {
    if (p.x < SLOT_X - 60 || p.x > R + BENCH.rightW || p.y < ROWS.then - 30 || p.y > ROWS.else + SLOT + 30) return;
    fill(p.y < (ROWS.then + SLOT + ROWS.else) / 2 ? 'then' : 'else', a);
  };
  const newMaze = () => {
    setMaze(makeMaze(SCENE_MAZE));
    setLast(null);
  };

  const step = runner.status === 'idle' ? null : runner.step;
  const testStep = runner.status === 'idle' ? null : recent(runner.trace, runner.index, 'test');
  const loopStep = runner.status === 'idle' ? null : recent(runner.trace, runner.index, 'loop');
  const shown = runner.status === 'done' ? last : null;
  const failedId = shown?.failedBlockId;

  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  if (shown) {
    const walls = shown.steps.filter((s) => s.action === 'test' && s.result === (test === 'wall-ahead')).length;
    if (shown.outcome === 'success')
      msg = { tone: 'good', text: `It worked! The sensor found ${walls} wall${walls === 1 ? '' : 's'} and the robot chose what to do each time. Try New maze: does your rule still work?` };
    else if (shown.outcome === 'bumped') msg = { tone: 'oops', text: 'Bump! The robot went forward into a wall. What should it do when the way ahead is blocked?' };
    else msg = { tone: 'oops', text: 'The robot never reached the flag, so we stopped it. At each rock, which way does the path turn?' };
  } else if (step && step.action !== 'end') {
    const doing = (['then', 'else'] as SlotName[]).find((k) => slots[k]?.id === step.blockId);
    const text =
      step.action === 'test'
        ? `Sensor: ${TEST_Q[test]} ${step.result ? 'YES' : 'NO'}, so do ${step.result ? 'THEN' : 'ELSE'}.`
        : doing && step.action !== 'bump'
          ? `${doing.toUpperCase()}: ${ACT_WORDS[actOf(slots[doing]!)]}.`
          : step.action === 'bump'
            ? 'Bump!'
            : `Time ${loopStep?.iteration ?? 1} round the loop: the sensor looks ahead…`;
    msg = { tone: 'info', text };
  } else if (!ready) msg = { tone: 'info', text: `Drag a block into ${slots.then ? 'ELSE' : 'THEN'}. THEN runs when the answer is YES, ELSE when it is NO.` };
  else msg = { tone: 'info', text: 'Ready! Press Run and watch the sensor check the square in front each time round.' };

  const blocked = testStep ? (test === 'wall-ahead' ? !!testStep.result : !testStep.result) : false;
  const mood = shown?.outcome === 'success' ? 'proud' : runner.bump ? 'oops' : 'happy';

  const slotRow = (slot: SlotName) => {
    const y = ROWS[slot];
    const b = slots[slot];
    const active = !!b && runner.activeIds.has(b.id);
    const failed = !!b && failedId === b.id;
    const selected = sel === slot && !b && runner.status === 'idle';
    return (
      <g>
        {(active || failed) && <rect x={R + 24} y={y - 6} width={BENCH.rightW - 48} height={SLOT + 12} rx={14} fill={failed ? C.red : C.yellow} opacity={0.5} />}
        <text x={R + 36} y={y + SLOT / 2} dominantBaseline="central" fontSize={21} fontWeight={800} fill={C.ink}>
          {slot === 'then' ? 'THEN' : 'ELSE'}
        </text>
        <g onClick={() => tapSlot(slot)} style={{ cursor: busy ? 'default' : 'pointer' }} role="button" aria-label={b ? `${slot}: ${ACT_WORDS[actOf(b)]}. Tap to take it out` : `Put a block in ${slot}`} data-nopan>
          <rect
            x={SLOT_X - 4}
            y={y - 4}
            width={SLOT + 8}
            height={SLOT + 8}
            rx={14}
            fill={selected ? shade(C.yellow, 0.5) : 'white'}
            stroke={selected ? C.ink : C.muted}
            strokeWidth={2}
            strokeDasharray={selected ? undefined : '6 5'}
          />
          {b ? (
            <BlockTile block={b} x={SLOT_X} y={y} s={SLOT} />
          ) : (
            <text x={SLOT_X + SLOT / 2} y={y + SLOT / 2} textAnchor="middle" dominantBaseline="central" fontSize={28} fill={C.muted}>
              +
            </text>
          )}
        </g>
        <text x={SLOT_X + SLOT + 20} y={y + SLOT / 2} dominantBaseline="central" fontSize={19} fontWeight={b ? 700 : 500} fill={b ? C.ink : C.muted}>
          {b ? ACT_WORDS[actOf(b)] : slot === 'then' ? 'when the answer is YES' : 'when the answer is NO'}
        </text>
      </g>
    );
  };

  return (
    <SceneSvg label="If this, then that: give the robot a sensor rule so it can find its way through the maze">
      <GridWorld world={world} layout={grid} robot={runner.robot} trail={runner.trail} bump={runner.bump} mood={mood} />
      {step?.action === 'test' && <SensorBeam g={grid} robot={runner.robot} blocked={blocked} />}
      <Message x={BENCH.left} y={grid.y + world.rows * cell + 22} w={BENCH.gridW} tone={msg.tone} text={msg.text} />

      {/* The rule: a loop around one if / else */}
      <text x={R} y={58} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Sensor rule
      </text>
      <rect x={R} y={70} width={BENCH.rightW} height={292} rx={16} fill={shade(BLOCK_COLORS.repeat, 0.72)} stroke={C.ink} strokeWidth={2.2} />
      <rect x={R + 8} y={78} width={BENCH.rightW - 16} height={42} rx={11} fill={BLOCK_COLORS.repeat} stroke={C.ink} strokeWidth={2} />
      <text x={R + 24} y={99} dominantBaseline="central" fontSize={18} fontWeight={800} fill="white">
        REPEAT UNTIL AT THE FLAG{loopStep ? ` · time ${loopStep.iteration}` : ''}
      </text>
      <rect x={R + 14} y={128} width={BENCH.rightW - 28} height={226} rx={14} fill={shade(BLOCK_COLORS.if, 0.78)} stroke={C.ink} strokeWidth={2} />
      <text x={R + 36} y={ROWS.if + 26} dominantBaseline="central" fontSize={21} fontWeight={800} fill={C.ink}>
        IF
      </text>
      <g
        onClick={busy ? undefined : () => (play('tap'), setTest(test === 'wall-ahead' ? 'path-ahead' : 'wall-ahead'), edited())}
        style={{ cursor: busy ? 'default' : 'pointer' }}
        role="button"
        aria-label={`Sensor question: ${TEST_Q[test]} Tap to switch`}
        data-nopan
      >
        <rect x={SLOT_X - 4} y={ROWS.if} width={236} height={54} rx={12} fill={BLOCK_COLORS.if} stroke={C.ink} strokeWidth={2} />
        <circle cx={SLOT_X + 24} cy={ROWS.if + 27} r={13} fill="white" stroke={C.ink} strokeWidth={2} />
        <circle cx={SLOT_X + 24} cy={ROWS.if + 27} r={5} fill={C.ink} />
        <text x={SLOT_X + 46} y={ROWS.if + 27} dominantBaseline="central" fontSize={20} fontWeight={800} fill="white">
          {TEST_Q[test]}
        </text>
        <text x={SLOT_X + 214} y={ROWS.if + 27} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={800} fill="white">
          ⇄
        </text>
      </g>
      {testStep && (
        <g className="pop-in-wrap">
          <rect x={SLOT_X + 244} y={ROWS.if + 5} width={78} height={44} rx={12} fill="white" stroke={C.ink} strokeWidth={2.5} />
          <text x={SLOT_X + 283} y={ROWS.if + 27} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={800} fill={C.ink}>
            {testStep.result ? 'YES' : 'NO'}
          </text>
        </g>
      )}
      {slotRow('then')}
      {slotRow('else')}

      {/* Palette */}
      <text x={R} y={PAL.y - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Blocks · drag or tap
      </text>
      {(['forward', 'left', 'right'] as Act[]).map((a, i) => {
        const x = R + i * PAL.gap;
        return (
          <g key={a} opacity={busy ? 0.45 : 1}>
            <DragItem label={ACT_WORDS[a]} disabled={busy} onDrop={(p) => onDrop(a, p)} onTap={() => fill(sel, a)}>
              <BlockTile block={{ ...makeAct(a), id: `pal-${a}` }} x={x} y={PAL.y} s={64} />
            </DragItem>
            <text x={x + 32} y={PAL.y + 86} textAnchor="middle" fontSize={16} fontWeight={600} fill={C.ink}>
              {ACT_WORDS[a]}
            </text>
          </g>
        );
      })}
      <RunControls x={R} y={CTRL_Y} runner={runner} canRun={ready} />
      <SvgButton x={40} y={606} w={180} h={56} fontSize={19} label="New maze" onClick={newMaze} disabled={busy} title="Try a different maze" />
      <Callout
        at={[R + 178, CTRL_Y + 56]}
        box={[R + 110, CTRL_Y + 92]}
        w={260}
        icon={Footprints}
        title="Watch the sensor"
        text="Press Step: each time round, the sensor answers YES or NO, and the robot does THEN or ELSE."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={10} width={66} height={60} rx={10} fill="#eef3ff" stroke={C.ink} strokeWidth={1.5} />
      <rect x={44} y={18} width={22} height={20} rx={6} fill="#a7adbd" stroke={C.ink} strokeWidth={1.4} />
      <circle cx={24} cy={28} r={10} fill="#5b6cff" stroke={C.ink} strokeWidth={1.5} />
      <path d="M30,28 L42,28" stroke={C.red} strokeWidth={3} strokeDasharray="3 3" />
      <path d="M24,40 L24,56 Q24,62 30,62 L40,62" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M36,57 l5,5 l-5,5" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M96 12 L114 32 L96 52 L78 32 Z" fill={BLOCK_COLORS.if} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
      <text x={96} y={33} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill="white">
        if
      </text>
      <text x={84} y={66} fontSize={11} fontWeight={800} fill={C.green}>
        YES
      </text>
      <text x={98} y={76} fontSize={11} fontWeight={800} fill={C.red}>
        NO
      </text>
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

/** Rule parts for a maze that turns `side`: with "wall ahead?" turn first; with "path ahead?" go forward first. */
const ruleFor = (test: SensorTest, side: Side): [Act, Act] => (test === 'wall-ahead' ? [side, 'forward'] : ['forward', side]);

function mazePicture(m: Maze, labels?: { cell: Cell; text: string }[]) {
  return <GridPicture world={m.world} labels={labels} cell={52} />;
}

/** L0: one look with the sensor. What does the robot do? */
function whatNow(): Question {
  const test: SensorTest = Math.random() < 0.7 ? 'wall-ahead' : 'path-ahead';
  const side = pick(['left', 'right'] as Side[]);
  const [thenA, elseA] = ruleFor(test, side);
  const blocked = Math.random() < 0.5;
  for (;;) {
    const cols = 4;
    const rows = 3;
    const pos: Cell = { x: rand(0, cols - 1), y: rand(0, rows - 1) };
    const dir = pick(DIRS);
    const front = ahead(pos, dir);
    const board: World = { cols, rows, start: { ...pos, dir }, walls: [] };
    const frontInside = inside(board, front);
    if (!blocked && !frontInside) continue;
    const walls: Cell[] = blocked && frontInside ? [front] : [];
    // One more rock somewhere else, so the picture isn't a giveaway.
    const spare = pick(
      Array.from({ length: cols * rows }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) })).filter((c) => !sameCell(c, pos) && !sameCell(c, front)),
    );
    const world: World = { ...board, walls: [...walls, spare] };
    const yes = test === 'wall-ahead' ? blocked : !blocked;
    const act = yes ? thenA : elseA;
    const answer = ACT_WORDS[act];
    const where = blocked ? (frontInside ? 'there is a rock there' : 'it is the edge of the board') : 'it is clear';
    return mcq({
      prompt: 'The robot checks its sensor once. What does it do?',
      visual: (
        <Beside
          label={`The robot's grid and the rule: ${ruleText(test, thenA, elseA)}`}
          left={{ el: <GridPicture world={world} cell={56} />, w: cols * 56 + 16, h: rows * 56 + 16 }}
          right={{ el: <RulePicture test={test} then={thenA} otherwise={elseA} />, w: 320, h: 184 }}
        />
      ),
      answer,
      wrong: (['forward', 'left', 'right'] as Act[]).filter((a) => a !== act).map((a) => ACT_WORDS[a]),
      hint: 'Look at the square just in front of the robot’s yellow nose. Then answer the sensor’s question: YES or NO?',
      explain: [
        `The sensor checks the square in front of the robot: ${where}.`,
        `So “${TEST_Q[test]}” is ${yes ? 'YES' : 'NO'}, and the robot does the ${yes ? 'THEN' : 'ELSE'} part.`,
        `The robot will ${answer}.`,
      ],
    });
  }
}

/** L1: which rule gets the robot through this maze? */
function whichRule(): Question {
  const m = makeMaze({ cols: 5, rows: 4, corners: [1, 2], decoys: 1 });
  const test: SensorTest = Math.random() < 0.75 ? 'wall-ahead' : 'path-ahead';
  const [a, b] = ruleFor(test, m.side);
  const right = ruleText(test, a, b);
  const [wa, wb] = ruleFor(test, otherSide(m.side));
  const wrong = [ruleText(test, wa, wb), ruleText(test, b, a)];
  return mcq({
    prompt: 'Which rule gets the robot to the flag?',
    visual: mazePicture(m),
    answer: right,
    wrong,
    hint: 'Follow the path from the robot. When it reaches a rock, which way must it turn: its left or its right?',
    explain: [
      `Follow the path: at every rock, the path turns to the robot’s ${m.side}.`,
      `So when the way ahead is blocked it must ${ACT_WORDS[m.side]}, and when it is clear it must go forward.`,
      `The rule is: ${right}`,
    ],
  });
}

/** L2: how many times does the robot turn on its way? */
function countTurns(): Question {
  const m = makeMaze({ cols: 6, rows: 5, corners: [2, 4], decoys: 2 });
  const [a, b] = ruleFor('wall-ahead', m.side);
  const turns = runProgram(m.world, ruleProgram('wall-ahead', a, b, m.limit), { stopAtGoal: true }).steps.filter((s) => s.action === 'turn').length;
  return {
    prompt: 'The robot follows this rule until it reaches the flag. How many times does it turn?',
    visual: (
      <Beside
        label={`A maze and the rule: ${ruleText('wall-ahead', a, b)}`}
        left={{ el: mazePicture(m), w: m.world.cols * 52 + 16, h: m.world.rows * 52 + 16 }}
        right={{ el: <RulePicture test="wall-ahead" then={a} otherwise={b} />, w: 320, h: 184 }}
      />
    ),
    choices: numberChoices(turns, { count: 4, min: 0, max: 7, spread: 2 }).map((value) => ({ value })),
    answer: String(turns),
    hint: 'Trace the path with your finger. The robot turns only when the sensor sees a wall or the edge ahead.',
    explain: [
      'The robot goes forward until its sensor sees a wall ahead, then it turns.',
      `Count the corners on the path to the flag: ${countUp(turns)}.`,
      `So the robot turns ${turns} times.`,
    ],
  };
}

/** L2: where is the robot after some times round the loop? */
function whereAfter(): Question {
  for (;;) {
    const m = makeMaze({ cols: 6, rows: 4, corners: [1, 3], decoys: 1 });
    const [a, b] = ruleFor('wall-ahead', m.side);
    const trace = runProgram(m.world, ruleProgram('wall-ahead', a, b, m.limit), { stopAtGoal: true });
    const total = trace.steps.filter((s) => s.action === 'loop').length;
    if (total < 4) continue;
    const n = rand(3, total - 1);
    let turns = 0;
    let moves = 0;
    let loops = 0;
    for (const s of trace.steps) {
      if (s.action === 'loop' && ++loops > n) break;
      if (s.action === 'turn') turns++;
      if (s.action === 'move') moves++;
    }
    const at = m.path[moves];
    const near = [moves - 2, moves - 1, moves + 1, moves + 2].filter((i) => i > 0 && i < m.path.length).map((i) => m.path[i]);
    if (near.length < 2 || !at || sameCell(at, m.world.start)) continue;
    const others = shuffle(near).slice(0, 2);
    const letters = shuffle(['A', 'B', 'C']);
    const labels = [at, ...others].map((cell, i) => ({ cell, text: letters[i] }));
    const answer = letters[0];
    return mcq({
      prompt: `The robot goes round the loop ${n} times. Which square is it on?`,
      visual: (
        <Beside
          label={`A maze and the rule: ${ruleText('wall-ahead', a, b)}`}
          left={{ el: mazePicture(m, labels), w: m.world.cols * 52 + 16, h: m.world.rows * 52 + 16 }}
          right={{ el: <RulePicture test="wall-ahead" then={a} otherwise={b} />, w: 320, h: 184 }}
        />
      ),
      answer,
      wrong: letters.slice(1),
      hint: 'Each time round, the robot does just one thing: turn or go forward. Count them off with your finger.',
      explain: [
        'Each time round the loop, the robot either turns or goes forward 1 square.',
        `In ${n} times round, it turns ${turns} time${turns === 1 ? '' : 's'} and goes forward ${moves} square${moves === 1 ? '' : 's'}.`,
        `So the robot is on square ${answer}.`,
      ],
    });
  }
}

function makeQuestion(level: number): Question {
  if (level <= 0) return whatNow();
  if (level === 1) return Math.random() < 0.7 ? whichRule() : whatNow();
  return Math.random() < 0.5 ? countTurns() : whereAfter();
}

export const ifThen: Lesson = {
  id: 'if-then',
  title: 'If This, Then That',
  Thumb,
  Scene: SensorScene,
  sceneHint: 'Fill THEN and ELSE with blocks, then Run · ⇄ switches the sensor question',
  learn: {
    heading: 'Programs can make choices',
    intro: 'An if block lets a program choose. The robot’s sensor asks a yes-or-no question, like “wall ahead?”. If the answer is YES, the robot does the THEN part. If it is NO, it does the ELSE part.',
    points: [
      { icon: Radar, text: 'A sensor checks the world and answers YES or NO.' },
      { icon: GitBranch, text: 'YES → do THEN. NO → do ELSE. Only one of them runs.' },
      { icon: Repeat, text: 'Inside a loop, the robot checks again every time round, so one rule can solve many mazes.' },
    ],
  },
  steps: [
    'Look at the maze: at each rock, which way does the path turn?',
    'Put a turn in THEN: what to do when there is a wall ahead.',
    'Put go forward in ELSE: what to do when the way is clear.',
    'Run it, then try a new maze with the same rule.',
  ],
  example: {
    question: 'The path turns right at every rock. Write a sensor rule for the robot.',
    visual: <RulePicture test="wall-ahead" then="right" otherwise="forward" />,
    work: ['At a rock, the answer to “wall ahead?” is YES, so THEN: turn right.', 'When the way is clear, the answer is NO, so ELSE: go forward.', 'Repeat the rule until the robot reaches the flag.'],
    answer: 'If wall ahead → turn right. Else → go forward.',
  },
  grownups: [
    'Conditionals are everywhere: “If it is raining, take an umbrella, else wear sunglasses.” Ask your child to turn everyday choices into if / else rules.',
    'Notice that the robot does not know the maze in advance. It checks its sensor each time. That is why one rule can work on many different mazes.',
    'If a run goes wrong, use Step and say the sensor’s answer out loud: “Wall ahead? Yes, so turn.”',
  ],
  makeQuestion,
};
