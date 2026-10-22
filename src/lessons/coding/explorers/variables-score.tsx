import { useMemo, useState } from 'react';
import { Box, Plus, RotateCcw } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import {
  ARROW_ENTRIES,
  BENCH,
  BlockPalette,
  DIRS,
  GridPicture,
  GridWorld,
  Message,
  ProgramStrip,
  RunControls,
  ahead,
  dropTarget,
  insertBlock,
  layoutProgram,
  makePuzzle,
  move,
  open,
  outcomeText,
  removeBlock,
  runningCaption,
  sameCell,
  useRunner,
} from '../engine';
import type { Block, Cell, Dir, GridLayout, PaletteEntry, Runner, Trace, World } from '../engine';
import { faceRandom } from '../questions';
import { countUp } from '../words';
import { EVENT_COLOR, EventHat, SCORE_COLOR } from './visuals/events';
import { Beside } from './visuals/pictures';
import { StackPicture, VarMonitor } from './visuals/variables';
import type { StackLine } from './visuals/variables';

const newPuzzle = () => {
  const p = faceRandom(makePuzzle({ cols: 6, rows: 4, walls: 3, items: 4, minLen: 5, maxLen: 9 }));
  // Stars are worth points but not required: the child chooses which ones to collect.
  return { ...p, needItems: false } as World;
};

// ─────────────────────────── Scene ───────────────────────────

const R = BENCH.right;
const S = 56;
const MAX_BLOCKS = 12;
const PALETTE: PaletteEntry[] = ARROW_ENTRIES(move);

/** "0 → 1 → 2 → 3", keeping only the last few values. */
function history(values: number[]): string {
  const shownVals = values.length > 5 ? values.slice(-5) : values;
  return (values.length > 5 ? '… → ' : '') + shownVals.join(' → ');
}

function StepperButton({ x, y, label, onClick, disabled }: { x: number; y: number; label: string; onClick: () => void; disabled?: boolean }) {
  return <SvgButton x={x} y={y} w={48} h={48} label={label} fontSize={26} onClick={onClick} disabled={disabled} title={label === '+' ? 'More' : 'Less'} />;
}

function ScoreScene() {
  const [world, setWorld] = useState<World>(newPuzzle);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [by, setBy] = useState(1);
  const [reset, setReset] = useState(true);
  const [carry, setCarry] = useState(0);
  const [startScore, setStartScore] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [last, setLast] = useState<Trace | null>(null);
  const program = useMemo(() => ({ main: blocks }), [blocks]);
  const runner = useRunner(world, program, {
    onDone: (t) => {
      setLast(t);
      setCarry(startScore + t.final.collected.length * by);
    },
  });
  const busy = runner.status === 'running';

  // "set score to 0" happens when a run starts; otherwise the score carries on from last time.
  const begin = () => setStartScore(reset ? 0 : carry);
  const controls: Runner = {
    ...runner,
    run: () => (begin(), runner.run()),
    stepOnce: () => {
      if (!runner.trace || runner.status === 'done') begin();
      runner.stepOnce();
    },
  };

  const active = runner.status !== 'idle';
  const got = active ? runner.robot.collected.length : 0;
  const score = active ? startScore + got * by : carry;
  const values = active ? Array.from({ length: got + 1 }, (_, i) => startScore + i * by) : [carry];

  const cell = Math.min(BENCH.gridW / world.cols, 380 / world.rows);
  const grid: GridLayout = { x: BENCH.left + (BENCH.gridW - cell * world.cols) / 2, y: 70, cell };
  const strip = layoutProgram(blocks, { x: R, y: 70, width: BENCH.rightW, s: S });
  const rulesY = 70 + Math.max(strip.height, S + 16) + 44;
  const palY = rulesY + 122 + 50;
  const ctrlY = palY + 88;
  const predY = ctrlY + 78;

  const edit = (next: Block[]) => {
    setBlocks(next);
    setLast(null);
  };
  const add = (e: PaletteEntry, index = blocks.length) => {
    if (busy || blocks.length >= MAX_BLOCKS) return;
    play('pop');
    edit(insertBlock(blocks, [], index, e.make()));
  };
  const onDrop = (e: PaletteEntry, p: Pt) => {
    const spot = dropTarget(strip, p);
    if (spot) add(e, spot.index);
  };
  const changeRule = (fn: () => void) => {
    if (busy) return;
    play('tap');
    fn();
    runner.reset();
    setLast(null);
  };

  const shown = runner.status === 'done' ? last : null;
  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  const guessText = guess === null ? '' : guess === score ? ` You predicted ${guess}: spot on!` : ` You predicted ${guess}. Count the stars again!`;
  if (shown) {
    const k = shown.final.collected.length;
    if (shown.outcome === 'success')
      msg = {
        tone: 'good',
        text: `Flag reached! ${k} star${k === 1 ? '' : 's'} × ${by} = ${k * by}${startScore ? `, plus the ${startScore} it started with` : ''}. Score = ${score}.${guessText}`,
      };
    else msg = { tone: 'oops', text: `${outcomeText(shown, blocks).text} Score so far: ${score}.` };
  } else if (active && runner.step) {
    const s = runner.step;
    msg = {
      tone: 'info',
      text:
        s.action === 'move' && s.picked
          ? `Star! change score by ${by}: ${score - by} + ${by} = ${score}.`
          : s.action === 'start'
            ? reset
              ? 'Run starts: set score to 0.'
              : `Run starts. “set score to 0” is off, so the score stays ${startScore}.`
            : `${runningCaption(runner, blocks) ?? 'Running…'} · score = ${score}`,
    };
  } else if (blocks.length >= MAX_BLOCKS) msg = { tone: 'info', text: `That's ${MAX_BLOCKS} blocks, the most here. Press Run, or tap a block to take it out.` };
  else if (!blocks.length) msg = { tone: 'info', text: 'Build a path to the flag through some stars. Each star changes the score. Predict the score, then Run!' };
  else msg = { tone: 'info', text: `Your path is ${blocks.length} block${blocks.length === 1 ? '' : 's'} long. How many stars will it land on? Predict the score, then Run.` };
  const mood = shown?.outcome === 'success' ? 'proud' : runner.bump ? 'oops' : 'happy';

  return (
    <SceneSvg label="Keeping score: a variable called score changes each time the robot lands on a star">
      <GridWorld world={world} layout={grid} robot={runner.robot} trail={runner.trail} bump={runner.bump} mood={mood} />
      <VarMonitor x={40} y={grid.y + world.rows * cell + 20} name="score" value={score} pulse={active} />
      <text x={226} y={grid.y + world.rows * cell + 52} dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink2}>
        {history(values)}
      </text>
      <Message x={BENCH.left} y={grid.y + world.rows * cell + 106} w={BENCH.gridW} tone={msg.tone} text={msg.text} />

      <ProgramStrip
        layout={strip}
        title="Program"
        activeIds={runner.activeIds}
        failedId={runner.status === 'done' ? last?.failedBlockId : undefined}
        emptyText="Drag or tap arrows to build a path"
        onTapBlock={(_p, i) => {
          if (busy) return;
          play('tap');
          edit(removeBlock(blocks, [], i));
        }}
        locked={busy}
      />

      {/* The score rules: two little event scripts */}
      <text x={R} y={rulesY - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Score rules
      </text>
      <g onClick={() => changeRule(() => setReset(!reset))} style={{ cursor: busy ? 'default' : 'pointer' }} role="button" aria-label={`When Run starts, set score to 0: ${reset ? 'on' : 'off'}. Tap to switch`} data-nopan>
        <rect x={R} y={rulesY} width={176} height={56} rx={14} fill={EVENT_COLOR} stroke={C.ink} strokeWidth={2.2} />
        <text x={R + 14} y={rulesY + 28} dominantBaseline="central" fontSize={18} fontWeight={800} fill={C.ink}>
          when Run starts
        </text>
        <rect x={R + 182} y={rulesY + 4} width={202} height={48} rx={12} fill={reset ? SCORE_COLOR : '#c9ced9'} stroke={C.ink} strokeWidth={2} strokeDasharray={reset ? undefined : '6 4'} />
        <text x={R + 196} y={rulesY + 28} dominantBaseline="central" fontSize={18} fontWeight={800} fill={reset ? 'white' : C.muted}>
          set score to 0
        </text>
        <rect x={R + 406} y={rulesY + 10} width={88} height={36} rx={18} fill={reset ? C.green : 'white'} stroke={C.ink} strokeWidth={2} />
        <circle cx={reset ? R + 476 : R + 424} cy={rulesY + 28} r={13} fill="white" stroke={C.ink} strokeWidth={2} />
        <text x={reset ? R + 438 : R + 464} y={rulesY + 28} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill={reset ? 'white' : C.muted}>
          {reset ? 'ON' : 'OFF'}
        </text>
      </g>
      <EventHat e="star" x={R} y={rulesY + 66} w={176} h={56} />
      <rect x={R + 182} y={rulesY + 70} width={170} height={48} rx={12} fill={SCORE_COLOR} stroke={C.ink} strokeWidth={2} />
      <text x={R + 192} y={rulesY + 94} dominantBaseline="central" fontSize={17} fontWeight={800} fill="white">
        change score by
      </text>
      <StepperButton x={R + 360} y={rulesY + 70} label="−" onClick={() => changeRule(() => setBy(by - 1))} disabled={busy || by <= 1} />
      <text x={R + 428} y={rulesY + 94} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={800} fill={C.ink} className="num">
        {by}
      </text>
      <StepperButton x={R + 448} y={rulesY + 70} label="+" onClick={() => changeRule(() => setBy(by + 1))} disabled={busy || by >= 5} />

      <BlockPalette entries={PALETTE} x={R} y={palY} s={60} title="Arrows · drag or tap" disabled={busy || blocks.length >= MAX_BLOCKS} onDrop={onDrop} onTap={(e) => add(e)} />
      <RunControls x={R} y={ctrlY} runner={controls} canRun={blocks.length > 0} extra={[{ label: 'Clear', onClick: () => edit([]), disabled: !blocks.length }]} />

      <text x={R} y={predY + 24} dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink}>
        Predict the score:
      </text>
      <StepperButton x={R + 180} y={predY} label="−" onClick={() => setGuess(Math.max(0, (guess ?? 1) - 1))} disabled={busy || guess === 0} />
      <rect x={R + 238} y={predY} width={64} height={48} rx={10} fill={guess === null ? 'white' : shade(C.yellow, 0.55)} stroke={C.ink} strokeWidth={2} />
      <text x={R + 270} y={predY + 24} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={800} fill={guess === null ? C.muted : C.ink} className="num">
        {guess ?? '?'}
      </text>
      <StepperButton x={R + 312} y={predY} label="+" onClick={() => setGuess(Math.min(40, (guess ?? -1) + 1))} disabled={busy} />

      <SvgButton
        x={40}
        y={606}
        w={180}
        h={56}
        fontSize={19}
        label="New puzzle"
        onClick={() => {
          setWorld(newPuzzle());
          edit([]);
          setGuess(null);
        }}
        disabled={busy}
        title="Try a different puzzle"
      />
      <Callout
        at={[R + 450, rulesY + 10]}
        box={[R + 250, 4]}
        w={240}
        icon={RotateCcw}
        title="Try switching it OFF"
        text="Turn off “set score to 0” and press Run twice. The score doesn’t start again; it keeps going from where it was."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={8} y={12} width={104} height={34} rx={9} fill={shade(SCORE_COLOR, 0.75)} stroke={C.ink} strokeWidth={1.5} />
      <text x={18} y={29} dominantBaseline="central" fontSize={15} fontWeight={800} fill={C.ink}>
        score
      </text>
      <rect x={74} y={17} width={32} height={24} rx={6} fill={SCORE_COLOR} stroke={C.ink} strokeWidth={1.3} />
      <text x={90} y={29} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill="white">
        3
      </text>
      {[0, 1, 2].map((i) => (
        <polygon
          key={i}
          transform={`translate(${26 + i * 34} 62)`}
          points="0,-11 3,-4 11,-4 5,1 7,9 0,4 -7,9 -5,1 -11,-4 -3,-4"
          fill={C.yellow}
          stroke={C.ink}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

/** A path (drawn as a trail) with `on` stars on it and `off` stars beside it. */
function starPath(o: { cols: number; rows: number; len: number; on: number; off: number }): { world: World; moves: Dir[] } {
  // There must be room for `on` stars between the start and the flag.
  if (o.len < o.on + 1) o = { ...o, len: o.on + 1 };
  for (;;) {
    const start: Cell = { x: rand(0, o.cols - 1), y: rand(0, o.rows - 1) };
    const board: World = { cols: o.cols, rows: o.rows, start: { ...start, dir: 1 }, walls: [] };
    const path: Cell[] = [start];
    const moves: Dir[] = [];
    for (let i = 0; i < o.len; i++) {
      const c = path[path.length - 1];
      const options = DIRS.filter((d) => open(board, ahead(c, d)) && !path.some((p) => sameCell(p, ahead(c, d))));
      if (!options.length) break;
      const d = pick(options);
      moves.push(d);
      path.push(ahead(c, d));
    }
    if (moves.length < o.len) continue;
    const free: Cell[] = [];
    for (let y = 0; y < o.rows; y++) for (let x = 0; x < o.cols; x++) if (!path.some((p) => sameCell(p, { x, y }))) free.push({ x, y });
    if (free.length < o.off) continue;
    const stars = [...shuffle(path.slice(1, -1)).slice(0, o.on), ...shuffle(free).slice(0, o.off)];
    if (stars.length < o.on + o.off) continue;
    return { world: { ...board, start: { ...start, dir: moves[0] }, goal: path[path.length - 1], items: stars }, moves };
  }
}

const rules = (start: number | null, by: number): StackLine[] => [
  ...(start === null ? [] : ([{ kind: 'hat', text: 'when Run starts' }, { kind: 'var', text: `set score to ${start}` }] as StackLine[])),
  { kind: 'hat', text: 'when star touched', star: true },
  { kind: 'var', text: `change score by ${by}` },
];

/** L0–1: follow the path and work out the score. */
function scoreAfterPath(level: number): Question {
  const on = rand(2, level ? 4 : 3);
  const by = level ? pick([2, 3, 5, 10]) : 1;
  const start = level && Math.random() < 0.4 ? pick([5, 10]) : 0;
  const { world, moves } = starPath({ cols: 5, rows: 4, len: rand(5, 7), on, off: rand(1, 2) });
  const answer = start + on * by;
  const adds = Array.from({ length: on }, () => by);
  return {
    prompt: 'The robot follows the path to the flag. What is the score at the end?',
    visual: (
      <Beside
        label={`The robot's path, and the score rules: set score to ${start}, then change score by ${by} for each star`}
        left={{ el: <GridPicture world={world} path={moves} cell={52} />, w: 5 * 52 + 16, h: 4 * 52 + 16 }}
        right={{ el: <StackPicture lines={rules(start, by)} />, w: 368, h: 210 }}
      />
    ),
    choices: numberChoices(answer, { count: 4, min: 0, max: 60, spread: 2, step: by }).map((value) => ({ value })),
    answer: String(answer),
    hint: 'Only the stars on the path count. Start from the first value, then add for each star the robot lands on.',
    explain: [
      `Count the stars on the path: ${countUp(on)}.`,
      `The score starts at ${start}, and each star changes it by ${by}: ${[start, ...adds].join(' + ')} = ${answer}.`,
      `So the score is ${answer}.`,
    ],
  };
}

/** L1: a stack of variable blocks. What is the score after they all run? */
function afterBlocks(): Question {
  const start = rand(0, 5);
  const changes = Array.from({ length: rand(2, 4) }, () => pick([1, 2, 3, 5, -1, -2]));
  const lines: StackLine[] = [{ kind: 'hat', text: 'when Run starts' }, { kind: 'var', text: `set score to ${start}` }, ...changes.map((c) => ({ kind: 'var' as const, text: `change score by ${c < 0 ? `−${-c}` : c}` }))];
  const values = changes.reduce((acc, c) => [...acc, acc[acc.length - 1] + c], [start]);
  const answer = values[values.length - 1];
  if (values.some((v) => v < 0)) return afterBlocks();
  return {
    prompt: 'These blocks run from top to bottom. What is the score at the end?',
    visual: <StackPicture lines={lines} />,
    choices: numberChoices(answer, { count: 4, min: 0, max: 30, spread: 3 }).map((value) => ({ value })),
    answer: String(answer),
    hint: 'Keep track of the score box after each block. “change by” adds to what is already in the box.',
    explain: [`The score starts at ${start}.`, `Then each block changes it: ${values.join(' → ')}.`, `So the score is ${answer}.`],
  };
}

/** L2: press Run twice, with or without "set score to 0". */
function twoRuns(): Question {
  const on = rand(2, 4);
  const by = pick([1, 2, 3]);
  const resets = Math.random() < 0.5;
  const { world, moves } = starPath({ cols: 5, rows: 4, len: rand(5, 7), on, off: 1 });
  const per = on * by;
  const answer = resets ? per : per * 2;
  return {
    prompt: `The score starts at 0. You press Run, and then press Run again. What does the score show after the second run?`,
    visual: (
      <Beside
        label={`The robot's path, and the score rules${resets ? ', with set score to 0 when Run starts' : ', with no set score block'}`}
        left={{ el: <GridPicture world={world} path={moves} cell={52} />, w: 5 * 52 + 16, h: 4 * 52 + 16 }}
        right={{ el: <StackPicture lines={rules(resets ? 0 : null, by)} />, w: 368, h: resets ? 210 : 100 }}
      />
    ),
    choices: numberChoices(answer, { count: 4, min: 0, max: 40, spread: 2, step: by }).map((value) => ({ value })),
    answer: String(answer),
    hint: 'Work out one run first. Then check: does anything put the score back to 0 when Run starts?',
    explain: resets
      ? [`One run lands on ${on} stars: ${on} × ${by} = ${per}.`, `“set score to 0” runs at the start of the second run, so it starts again from 0.`, `After the second run the score is ${answer}.`]
      : [`One run lands on ${on} stars: ${on} × ${by} = ${per}.`, `Nothing sets the score back to 0, so the second run adds ${per} more.`, `${per} + ${per} = ${answer}.`],
  };
}

/** L2: work backwards to the "change by" number. */
function findChange(): Question {
  const on = rand(2, 5);
  const by = rand(2, 5);
  const total = on * by;
  const { world, moves } = starPath({ cols: 5, rows: 4, len: rand(on + 2, 8), on, off: rand(0, 2) });
  return {
    prompt: `The score started at 0 and ended at ${total}. What number is in “change score by ?”`,
    visual: <GridPicture world={world} path={moves} cell={56} />,
    choices: numberChoices(by, { count: 4, min: 1, max: 10, spread: 2 }).map((value) => ({ value })),
    answer: String(by),
    hint: 'Count the stars on the path. Which number, added that many times, makes the final score?',
    explain: [`The path lands on ${on} stars.`, `${on} stars × ? = ${total}, and ${on} × ${by} = ${total}.`, `So each star changes the score by ${by}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level <= 0) return scoreAfterPath(0);
  if (level === 1) return Math.random() < 0.6 ? scoreAfterPath(1) : afterBlocks();
  return Math.random() < 0.5 ? twoRuns() : Math.random() < 0.5 ? findChange() : afterBlocks();
}

export const variablesScore: Lesson = {
  id: 'variables-score',
  title: 'Keeping Score',
  Thumb,
  Scene: ScoreScene,
  sceneHint: 'Build a path, predict the score, then Run · − / + changes how much each star is worth',
  learn: {
    heading: 'Variables remember things',
    intro: 'A variable is a named box that holds a value, like the score in a game. A program can set it, change it and show it. The name stays the same, but the value inside can change.',
    points: [
      { icon: Box, text: 'score is a box with a number in it.' },
      { icon: Plus, text: '“change score by 1” adds 1 to whatever is already in the box.' },
      { icon: RotateCcw, text: '“set score to 0” at the start makes every game begin fresh.' },
    ],
  },
  steps: [
    'Build a path that lands on some stars and ends at the flag.',
    'Count the stars on your path and predict the score.',
    'Run it and watch the score box change at each star.',
    'Try “change score by 2”, or switch off “set score to 0” and run twice.',
  ],
  example: {
    question: 'The score starts at 0. The robot lands on 3 stars, and each star does “change score by 2”. What is the score?',
    visual: <StackPicture lines={rules(0, 2)} />,
    work: ['Start: score = 0.', 'Star 1: 0 + 2 = 2. Star 2: 2 + 2 = 4. Star 3: 4 + 2 = 6.', 'The box now holds 6.'],
    answer: 'The score is 6.',
  },
  grownups: [
    'A variable is like a labelled jar: the label (score) stays, the contents change. Scoreboards, step counters and money boxes are all variables.',
    'Predicting before running is powerful. If the prediction was wrong, ask “which star did we miss?” rather than “why were you wrong?”',
    'Switching off “set score to 0” shows why games reset at the start. Ask your child what would happen in their favourite game without it.',
  ],
  makeQuestion,
};
