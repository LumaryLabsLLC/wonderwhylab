import { useMemo, useState } from 'react';
import { Eye, Puzzle, Repeat, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import {
  ARROW_ENTRIES,
  ArrowGlyph,
  ArrowsPicture,
  BLOCK_COLORS,
  BlockPalette,
  DIR_NAME,
  DIR_VEC,
  DIRS,
  DOWN,
  GridWorld,
  Message,
  ProgramStrip,
  RIGHT,
  RunControls,
  UP,
  dropTarget,
  insertBlock,
  layoutProgram,
  move,
  movesToBlocks,
  outcomeText,
  removeBlock,
  runningCaption,
  useRunner,
} from '../engine';
import type { Block, Cell, Dir, GridLayout, PaletteEntry, StripLayout, Trace, World } from '../engine';
import { mcq } from '../q';
import { countUp, say } from '../words';

interface Pattern {
  name: string;
  unit: Dir[];
  times: number;
}

const PATTERNS: Pattern[] = [
  { name: 'Stairs up', unit: [RIGHT, UP], times: 3 },
  { name: 'Stairs down', unit: [RIGHT, DOWN], times: 3 },
  { name: 'Big steps', unit: [RIGHT, RIGHT, UP], times: 2 },
  { name: 'Hills', unit: [UP, RIGHT, DOWN, RIGHT], times: 2 },
];

const PALETTE = ARROW_ENTRIES(move);
const UNIT_COLORS = ['#f59e0b', '#14b8a6'];
const MAX_BLOCKS = 10;

/** The world for a pattern: just big enough for its path, with a star at the end of each repeat and the flag at the end. */
function patternWorld(p: Pattern): World {
  const path: Cell[] = [{ x: 0, y: 0 }];
  for (let t = 0; t < p.times; t++) for (const d of p.unit) path.push({ x: path[path.length - 1].x + DIR_VEC[d][0], y: path[path.length - 1].y + DIR_VEC[d][1] });
  const minX = Math.min(...path.map((c) => c.x));
  const minY = Math.min(...path.map((c) => c.y));
  const cells = path.map((c) => ({ x: c.x - minX, y: c.y - minY }));
  const at = (i: number) => cells[i];
  return {
    cols: Math.max(...cells.map((c) => c.x)) + 1,
    rows: Math.max(...cells.map((c) => c.y)) + 1,
    start: { ...at(0), dir: p.unit[0] },
    goal: at(cells.length - 1),
    walls: [],
    items: Array.from({ length: p.times - 1 }, (_, t) => at((t + 1) * p.unit.length)),
    needItems: true,
  };
}

/** Outline each repeat of the pattern in the program, numbered 1, 2, 3… */
function PatternMarks({ layout, unit }: { layout: StripLayout; unit: number }) {
  const s = layout.s;
  const groups = new Map<string, { g: number; x0: number; x1: number; y: number }>();
  layout.items.forEach((it, i) => {
    const g = Math.floor(i / unit);
    const key = `${g}:${it.y}`;
    const cur = groups.get(key);
    if (cur) cur.x1 = it.x + s;
    else groups.set(key, { g, x0: it.x, x1: it.x + s, y: it.y });
  });
  const firsts = new Set<number>();
  return (
    <g pointerEvents="none">
      {[...groups.values()].map((r) => {
        const color = UNIT_COLORS[r.g % 2];
        const first = !firsts.has(r.g);
        firsts.add(r.g);
        return (
          <g key={`${r.g}:${r.y}`}>
            <rect x={r.x0 - 4} y={r.y - 4} width={r.x1 - r.x0 + 8} height={s + 8} rx={12} fill="none" stroke={color} strokeWidth={4} />
            {first && (
              <g>
                <circle cx={r.x0 + 2} cy={r.y - 2} r={12} fill={color} stroke={C.ink} strokeWidth={1.5} />
                <text x={r.x0 + 2} y={r.y - 2} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill="white">
                  {r.g + 1}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function PatternScene() {
  const [pi, setPi] = useState(0);
  const pattern = PATTERNS[pi];
  const world = useMemo(() => patternWorld(pattern), [pattern]);
  const [blocks, setBlocks] = useState<Block[]>(() => movesToBlocks(PATTERNS[0].unit));
  const [show, setShow] = useState(false);
  const [last, setLast] = useState<Trace | null>(null);
  const program = useMemo(() => ({ main: blocks }), [blocks]);
  const runner = useRunner(world, program, {
    onDone: (t) => {
      setLast(t);
      if (t.outcome === 'success') setShow(true);
    },
  });

  const cell = Math.min(440 / world.cols, 340 / world.rows);
  const grid: GridLayout = { x: 40 + (440 - cell * world.cols) / 2, y: 70, cell };
  const strip = layoutProgram(blocks, { x: 528, y: 70, width: 452, s: 52 });
  const paletteY = Math.max(strip.y + strip.height + 70, 270);
  const runY = paletteY + 92;
  const busy = runner.status === 'running';

  const edit = (next: Block[]) => {
    setBlocks(next);
    setLast(null);
  };
  const add = (e: PaletteEntry, index = blocks.length) => {
    if (blocks.length >= MAX_BLOCKS) return;
    play('pop');
    edit(insertBlock(blocks, [], index, e.make()));
  };
  const onDrop = (e: PaletteEntry, p: Pt) => {
    const spot = dropTarget(strip, p);
    if (spot) add(e, spot.index);
  };
  const choose = (i: number) => {
    setPi(i);
    setBlocks(movesToBlocks(PATTERNS[i].unit));
    setShow(false);
    setLast(null);
    play('whoosh');
  };

  const done = runner.status === 'done' && last;
  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  if (done && last.outcome === 'success') msg = { tone: 'good', text: `You did it! ${cap(say(pattern.unit))} happens ${pattern.times} times. That's a repeating pattern!` };
  else if (done) msg = outcomeText(last, blocks);
  else if (runner.status !== 'idle') msg = { tone: 'info', text: runningCaption(runner, blocks) ?? 'Running…' };
  else if (show) msg = { tone: 'info', text: `Each box is one ${say(pattern.unit)}. Count the boxes to see how many times it repeats.` };
  else msg = { tone: 'info', text: `The path repeats! The first part is done: ${say(pattern.unit)}. Keep the pattern going, then press Run.` };

  return (
    <SceneSvg label={`A repeating path, ${pattern.name}: the robot goes ${say(pattern.unit)}, again and again, to the flag`}>
      <GridWorld world={world} layout={grid} robot={runner.robot} trail={runner.trail} bump={runner.bump} mood={last?.outcome === 'success' ? 'proud' : runner.bump ? 'oops' : 'happy'} />
      <Message x={40} y={grid.y + world.rows * cell + 22} w={440} tone={msg.tone} text={msg.text} />

      <text x={40} y={584} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Pick a pattern
      </text>
      {PATTERNS.map((p, i) => (
        <SvgButton key={p.name} x={40 + i * 112} y={596} w={106} h={52} fontSize={15} label={p.name} onClick={() => choose(i)} active={i === pi} disabled={busy} />
      ))}

      <ProgramStrip
        layout={strip}
        title={`Program · ${blocks.length} block${blocks.length === 1 ? '' : 's'}`}
        activeIds={runner.activeIds}
        failedId={runner.status === 'done' ? last?.failedBlockId : undefined}
        emptyText="Drag or tap arrows to add them"
        onTapBlock={(path, index) => {
          if (busy) return;
          play('tap');
          edit(removeBlock(blocks, path, index));
        }}
        locked={busy}
      />
      {show && <PatternMarks layout={strip} unit={pattern.unit.length} />}
      <BlockPalette entries={PALETTE} x={528} y={paletteY} s={64} title="Blocks · drag or tap" disabled={busy || blocks.length >= MAX_BLOCKS} onDrop={onDrop} onTap={(e) => add(e)} />
      <RunControls x={528} y={runY} runner={runner} canRun={blocks.length > 0} extra={[{ label: 'Clear', onClick: () => edit([]), disabled: blocks.length === 0 }]} />
      <SvgButton x={528} y={runY + 70} w={220} h={52} fontSize={18} label={show ? 'Hide the pattern' : 'Show the pattern'} onClick={() => setShow(!show)} active={show} disabled={blocks.length === 0} />

      <Callout at={[790, paletteY]} box={[766, paletteY - 62]} w={214} icon={Repeat} title="Keep it going" text="Add the arrows that come next in the pattern." />
      <Callout at={[638, runY + 122]} box={[600, runY + 160]} w={250} icon={Eye} title="Spot the repeat" text="The same steps happen again and again. Coders call that a pattern." />
    </SceneSvg>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Thumb() {
  const steps: Dir[] = [RIGHT, UP, RIGHT, UP];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M8 72 h24 v-18 h24 v-18 h24 v-18 h30" fill="none" stroke="#a9b4ff" strokeWidth={6} strokeLinejoin="round" />
      {steps.map((d, i) => (
        <g key={i}>
          <rect x={8 + i * 27} y={6} width={23} height={23} rx={5} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1.3} />
          <ArrowGlyph cx={19.5 + i * 27} cy={17.5} s={18} dir={d} />
        </g>
      ))}
      <rect x={5} y={3} width={50} height={29} rx={7} fill="none" stroke={UNIT_COLORS[0]} strokeWidth={2.5} />
      <rect x={59} y={3} width={50} height={29} rx={7} fill="none" stroke={UNIT_COLORS[1]} strokeWidth={2.5} />
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

/** A random pattern unit: `len` arrows, not all the same. */
function randomUnit(len: number): Dir[] {
  for (;;) {
    const u = Array.from({ length: len }, () => pick(DIRS));
    if (new Set(u).size > 1) return u;
  }
}

/** "What comes next?" — the pattern shown 2+ times, cut off somewhere. */
function whatNext(unitLen: number): Question {
  const unit = randomUnit(unitLen);
  const shown = unit.length * 2 + rand(0, unit.length - 1);
  const seq = Array.from({ length: shown }, (_, i) => unit[i % unit.length]);
  const next = unit[shown % unit.length];
  const partial = seq.slice(shown - (shown % unit.length));
  const wrong = shuffle(DIRS.filter((d) => d !== next)).slice(0, 2);
  return mcq({
    prompt: 'What comes next in the pattern?',
    visual: <ArrowsPicture moves={seq} size={44} question />,
    answer: DIR_NAME[next],
    wrong: wrong.map((d) => DIR_NAME[d]),
    labels: Object.fromEntries([next, ...wrong].map((d) => [DIR_NAME[d], <ArrowsPicture moves={[d]} size={64} />])),
    names: Object.fromEntries([next, ...wrong].map((d) => [DIR_NAME[d], `the ${DIR_NAME[d]} arrow`])),
    hint: 'Say the arrows out loud. Listen for where they start again.',
    explain: [
      `The part that repeats is ${say(unit)}.`,
      partial.length ? `The last part so far is ${say(partial)}, so the pattern isn't finished yet.` : 'The last part is finished, so the pattern starts again.',
      `The next arrow is ${DIR_NAME[next]}.`,
    ],
  });
}

/** "How many times does … happen?" */
function howManyTimes(): Question {
  const unit = randomUnit(rand(2, 3));
  const times = rand(2, 4);
  const seq = Array.from({ length: unit.length * times }, (_, i) => unit[i % unit.length]);
  return {
    prompt: `How many times does ${say(unit)} happen?`,
    visual: <ArrowsPicture moves={seq} size={44} />,
    choices: numberChoices(times, { count: 3, min: 1, max: 6, spread: 2 }).map((value) => ({ value })),
    answer: String(times),
    hint: `Put your finger on the first ${DIR_NAME[unit[0]]}. Count each time you see ${say(unit)}.`,
    explain: [`Find each ${say(unit)} in the row of arrows.`, `Count them: ${countUp(times)}.`, `${cap(say(unit))} happens ${times} times.`],
  };
}

/** "Which part repeats?" */
function whichPart(): Question {
  const unit = randomUnit(rand(2, 3));
  const times = rand(2, 3);
  const seq = Array.from({ length: unit.length * times }, (_, i) => unit[i % unit.length]);
  // Near misses that are not just the same pattern seen from a different starting point.
  const rotations = new Set(unit.map((_, k) => say([...unit.slice(k), ...unit.slice(0, k)])));
  const near: Dir[][] = [unit.slice(0, -1), [...unit, unit[0]]];
  unit.forEach((d, k) => DIRS.forEach((e) => e !== d && near.push(unit.map((x, j) => (j === k ? e : x)))));
  const wrong: Dir[][] = [];
  for (const m of shuffle(near)) {
    if (wrong.length >= 2) break;
    if (m.length < 2 || new Set(m).size < 2 || rotations.has(say(m)) || wrong.some((w) => say(w) === say(m))) continue;
    wrong.push(m);
  }
  const all = [unit, ...wrong];
  return mcq({
    prompt: 'Which part repeats?',
    visual: <ArrowsPicture moves={seq} size={44} />,
    answer: say(unit),
    wrong: wrong.map(say),
    labels: Object.fromEntries(all.map((m) => [say(m), <ArrowsPicture moves={m} />])),
    names: Object.fromEntries(all.map((m) => [say(m), say(m)])),
    hint: 'Look at the first few arrows. Where do the same arrows start again?',
    explain: [
      'Look for the spot where the arrows start over.',
      `${cap(say(unit))}, then ${say(unit)} again${times === 3 ? ', and once more' : ''}.`,
      `So the part that repeats is ${say(unit)}.`,
    ],
  });
}

function makeQuestion(level: number): Question {
  if (level <= 0) return whatNext(2);
  if (level === 1) return Math.random() < 0.5 ? whatNext(pick([2, 3])) : howManyTimes();
  const r = Math.random();
  return r < 0.4 ? whichPart() : r < 0.7 ? whatNext(3) : howManyTimes();
}

export const repeatingPatterns: Lesson = {
  id: 'repeating-patterns',
  title: 'Repeat It',
  Thumb,
  Scene: PatternScene,
  sceneHint: 'Keep the pattern going · Tap Show the pattern to see the repeats',
  learn: {
    heading: 'Patterns that repeat',
    intro: 'Some paths use the same steps again and again, like climbing stairs: right, up, right, up. Spotting the part that repeats makes programs easier to build.',
    points: [
      { icon: Puzzle, text: 'A pattern is a part that happens again and again.' },
      { icon: Eye, text: 'Find where the steps start over.' },
      { icon: Sparkles, text: 'Count how many times the part repeats.' },
    ],
  },
  steps: ['Look at the robot’s path. Which steps keep happening?', 'Say the repeating part out loud: “right, up”.', 'Keep adding that part until the robot reaches the flag.', 'Press Show the pattern and count the boxes.'],
  example: {
    question: 'Right, up, right, up, right, up. Which part repeats, and how many times?',
    visual: <ArrowsPicture moves={[RIGHT, UP, RIGHT, UP, RIGHT, UP]} group={2} />,
    work: ['The arrows start over after right, up.', 'Count the right, up parts: 1, 2, 3.'],
    answer: 'Right, up repeats 3 times.',
  },
  grownups: [
    'Clap or stomp simple patterns (clap, clap, stomp) and ask what comes next. Spotting repeats is the first step toward loops in coding.',
    'Walk up real stairs together saying “step, up, step, up”, then count how many times you said it.',
    'Ask your child to make their own arrow pattern and challenge you to continue it.',
  ],
  makeQuestion,
};
