import { useMemo, useState } from 'react';
import { PackagePlus, Repeat, Wrench } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import {
  ARROW_ENTRIES,
  ArrowGlyph,
  ArrowsPicture,
  BENCH,
  BLOCK_COLORS,
  BlockPalette,
  DIR_NAME,
  DOWN,
  GridPicture,
  GridWorld,
  LEFT,
  Message,
  ProgramStrip,
  RIGHT,
  RunControls,
  UP,
  ahead,
  blockWords,
  call,
  dropTarget,
  layoutProgram,
  move,
  outcomeText,
  runProgram,
  sameCell,
  useRunner,
} from '../engine';
import type { Block, Cell, Dir, GridLayout, PaletteEntry, Program, Trace, World } from '../engine';
import { mcq } from '../q';
import { faceRandom } from '../questions';
import { Beside } from './visuals/pictures';
import { FunctionPicture } from './visuals/functions';

type Motif = 'hop' | 'zig-zag';
type Token = 'F' | Dir;
const opp = (d: Dir) => ((d + 2) % 4) as Dir;
const say = (moves: Dir[]) => moves.map((d) => DIR_NAME[d]).join(', ');

interface FnPuzzle {
  world: World;
  name: Motif;
  body: Dir[];
  /** The program: 'F' uses the function, a Dir is a plain arrow. */
  tokens: Token[];
  /** Fewest blocks: the function's arrows plus the program's blocks. */
  best: number;
}

const tokenBlocks = (tokens: Token[], name: string): Block[] => tokens.map((t) => (t === 'F' ? call(name) : move(t)));
const expand = (tokens: Token[], body: Dir[]): Dir[] => tokens.flatMap((t) => (t === 'F' ? body : [t]));
const runsWith = (world: World, tokens: Token[], name: string, body: Dir[]) =>
  runProgram(world, { main: tokenBlocks(tokens, name), functions: { [name]: body.map(move) } }).outcome === 'success';

/**
 * A path made of a repeated shape with plain steps in between: "hop" jumps over a rock, "zig-zag"
 * goes up through a star and back down. The same function works every time the shape comes up.
 */
function fnPuzzle(o: { cols: number; rows: number; calls: [number, number]; motif?: Motif; decoys?: number }): FnPuzzle {
  for (;;) {
    const name: Motif = o.motif ?? pick(['hop', 'zig-zag'] as Motif[]);
    const h: Dir = pick([RIGHT, LEFT]);
    const v: Dir = pick([UP, DOWN]);
    const body: Dir[] = name === 'hop' ? [v, h, h, opp(v)] : [v, h, opp(v), h];
    const k = rand(o.calls[0], o.calls[1]);
    const tokens: Token[] = Math.random() < 0.4 ? [h] : [];
    for (let i = 0; i < k; i++) {
      tokens.push('F');
      if (i < k - 1) for (let j = rand(0, 2); j > 0; j--) tokens.push(h);
    }
    if (Math.random() < 0.4) tokens.push(h);
    const width = tokens.reduce<number>((w, t) => w + (t === 'F' ? 2 : 1), 0);
    if (width > o.cols - 1 || !tokens.some((t) => t !== 'F')) continue;
    // Walk the path from (0, 0), noting a rock under each hop or a star on each zig-zag's peak.
    let c: Cell = { x: 0, y: 0 };
    const path: Cell[] = [c];
    const rocks: Cell[] = [];
    const stars: Cell[] = [];
    for (const t of tokens) {
      if (t === 'F') {
        if (name === 'hop') rocks.push(ahead(c, h));
        else stars.push(ahead(ahead(c, v), h));
      }
      for (const d of t === 'F' ? body : [t]) {
        c = ahead(c, d);
        path.push(c);
      }
    }
    const all = [...path, ...rocks];
    const minX = Math.min(...all.map((p) => p.x));
    const minY = Math.min(...all.map((p) => p.y));
    const w = Math.max(...all.map((p) => p.x)) - minX + 1;
    const hgt = Math.max(...all.map((p) => p.y)) - minY + 1;
    if (w > o.cols || hgt > o.rows) continue;
    const ox = rand(0, o.cols - w) - minX;
    const oy = rand(0, o.rows - hgt) - minY;
    const shift = (p: Cell) => ({ x: p.x + ox, y: p.y + oy });
    const cells = path.map(shift);
    const free: Cell[] = [];
    for (let y = 0; y < o.rows; y++)
      for (let x = 0; x < o.cols; x++) if (![...cells, ...rocks.map(shift)].some((p) => sameCell(p, { x, y }))) free.push({ x, y });
    const world: World = {
      cols: o.cols,
      rows: o.rows,
      start: { ...cells[0], dir: RIGHT },
      goal: cells[cells.length - 1],
      walls: [...rocks.map(shift), ...shuffle(free).slice(0, o.decoys ?? 1)],
      items: stars.map(shift),
      needItems: stars.length > 0,
    };
    if (!runsWith(world, tokens, name, body)) continue;
    return { world: faceRandom(world), name, body, tokens, best: body.length + tokens.length };
  }
}

// ─────────────────────────── Scene ───────────────────────────

const R = BENCH.right;
const S = 56;
const DEF_MAX = 5;
const MAIN_MAX = 8;
const scenePuzzle = () => fnPuzzle({ cols: 7, rows: 4, calls: [2, 3], decoys: 2 });
type Where = 'def' | 'main';

function FunctionsScene() {
  const [puzzle, setPuzzle] = useState<FnPuzzle>(scenePuzzle);
  const [def, setDef] = useState<Block[]>([]);
  const [main, setMain] = useState<Block[]>([]);
  const [target, setTarget] = useState<Where>('def');
  const [last, setLast] = useState<Trace | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { world, name, best } = puzzle;
  const program = useMemo<Program>(() => ({ main, functions: { [name]: def } }), [main, def, name]);
  const runner = useRunner(world, program, { onDone: setLast });
  const busy = runner.status === 'running';

  const cell = Math.min(BENCH.gridW / world.cols, 380 / world.rows);
  const grid: GridLayout = { x: BENCH.left + (BENCH.gridW - cell * world.cols) / 2, y: 70, cell };
  const defLayout = layoutProgram(def, { x: R, y: 70, width: BENCH.rightW, s: S });
  const mainY = 70 + Math.max(defLayout.height, S + 16) + 52;
  const mainLayout = layoutProgram(main, { x: R, y: mainY, width: BENCH.rightW, s: S });
  const palY = mainY + Math.max(mainLayout.height, S + 16) + 56;
  const ctrlY = palY + 90;
  const palette: PaletteEntry[] = [...ARROW_ENTRIES(move), { key: 'call', label: `Use your ${name} block`, make: () => call(name) }];

  const setList = (where: Where, list: Block[]) => {
    (where === 'def' ? setDef : setMain)(list);
    setLast(null);
  };
  const add = (entry: PaletteEntry, where: Where, at?: number) => {
    if (busy) return;
    const block = entry.make();
    if (where === 'def' && block.kind === 'call') {
      setNotice(`A block can’t be made of itself! Use ${name} in the Program instead.`);
      setTarget('main');
      return;
    }
    const list = where === 'def' ? def : main;
    const max = where === 'def' ? DEF_MAX : MAIN_MAX;
    if (list.length >= max) {
      setNotice(where === 'def' ? `Your ${name} block can hold up to ${DEF_MAX} arrows.` : `That’s ${MAIN_MAX} blocks, the most for the Program. Can your ${name} block do more of the work?`);
      return;
    }
    const index = at ?? list.length;
    play('pop');
    setList(where, [...list.slice(0, index), block, ...list.slice(index)]);
    setTarget(where);
    setNotice(null);
  };
  const onDrop = (entry: PaletteEntry, p: Pt) => {
    const d = dropTarget(defLayout, p);
    if (d) return add(entry, 'def', d.index);
    const m = dropTarget(mainLayout, p);
    if (m) add(entry, 'main', m.index);
  };
  const removeAt = (where: Where, index: number) => {
    if (busy) return;
    play('tap');
    const list = where === 'def' ? def : main;
    setList(
      where,
      list.filter((_, i) => i !== index),
    );
    setTarget(where);
  };
  const newPuzzle = () => {
    setPuzzle(scenePuzzle());
    setDef([]);
    setMain([]);
    setTarget('def');
    setLast(null);
    setNotice(null);
  };

  const shown = runner.status === 'done' ? last : null;
  const total = def.length + main.length;
  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  if (shown) {
    const calls = main.filter((b) => b.kind === 'call').length;
    if (shown.outcome === 'success') {
      const arrows = shown.steps.filter((s) => s.action === 'move').length;
      msg = calls
        ? {
            tone: 'good',
            text: `You did it! ${name} ran ${calls} time${calls === 1 ? '' : 's'}. ${total} blocks in all${total <= best ? ', the fewest!' : `. Can you do it with ${best}?`} Without ${name} it takes ${arrows} arrows.`,
          }
        : { tone: 'good', text: `You did it with arrows only! Now build ${name} and use it where the pattern comes again.` };
    } else if (shown.outcome === 'bumped' && def.some((b) => b.id === shown.failedBlockId))
      msg = { tone: 'oops', text: `Bump inside ${name}! The red arrow in your ${name} block took the robot the wrong way.` };
    else msg = outcomeText(shown, main);
  } else if (runner.status !== 'idle' && runner.step?.blockId) {
    const s = runner.step;
    const inDef = def.find((b) => b.id === s.blockId);
    const i = main.findIndex((b) => b.id === s.blockId);
    msg = { tone: 'info', text: inDef ? `Inside ${name}: ${blockWords(inDef)}` : i >= 0 ? `Block ${i + 1}: ${s.action === 'call' ? `do ${name}…` : blockWords(main[i])}` : 'Running…' };
  } else if (notice) msg = { tone: 'info', text: notice };
  else if (!def.length) msg = { tone: 'info', text: `Find the pattern that comes more than once. Build it in your ${name} block first.` };
  else msg = { tone: 'info', text: `Now tap the Program and build it. Use the teal ${name} block wherever the pattern comes.` };
  const mood = shown?.outcome === 'success' ? 'proud' : runner.bump ? 'oops' : 'happy';

  const strip = (where: Where) => {
    const layout = where === 'def' ? defLayout : mainLayout;
    const h = Math.max(layout.height, S + 16);
    return (
      <g onClick={busy ? undefined : () => setTarget(where)} data-nopan>
        {target === where && !busy && <rect x={R - 6} y={layout.y - 6} width={BENCH.rightW + 12} height={h + 12} rx={20} fill={shade(C.yellow, 0.35)} />}
        {where === 'def' && <rect x={R - 2} y={layout.y - 2} width={BENCH.rightW + 4} height={h + 4} rx={18} fill={BLOCK_COLORS.call} />}
        <ProgramStrip
          layout={layout}
          title={where === 'def' ? `Make your block: ${name}` : `Program · ${total} block${total === 1 ? '' : 's'} in all (best: ${best})`}
          activeIds={runner.activeIds}
          failedId={runner.status === 'done' ? shown?.failedBlockId : undefined}
          emptyText={where === 'def' ? `Put the arrows for ${name} here` : `Build the program here`}
          onTapBlock={(_p, index) => removeAt(where, index)}
          locked={busy}
        />
      </g>
    );
  };

  return (
    <SceneSvg label={`Make your own block: build a ${name} block from arrows, then use it in the program`}>
      <GridWorld world={world} layout={grid} robot={runner.robot} trail={runner.trail} bump={runner.bump} mood={mood} />
      <Message x={BENCH.left} y={grid.y + world.rows * cell + 22} w={BENCH.gridW} tone={msg.tone} text={msg.text} />
      {strip('def')}
      {strip('main')}
      <BlockPalette entries={palette} x={R} y={palY} s={60} title={`Blocks · drag, or tap to add to ${target === 'def' ? name : 'the Program'}`} disabled={busy} onDrop={onDrop} onTap={(e) => add(e, target)} />
      <RunControls
        x={R}
        y={ctrlY}
        runner={runner}
        canRun={main.length > 0}
        extra={[{ label: 'Clear', onClick: () => setList(target, []), disabled: (target === 'def' ? def : main).length === 0 }]}
      />
      <SvgButton x={40} y={606} w={180} h={56} fontSize={19} label="New puzzle" onClick={newPuzzle} disabled={busy} title="Try a different puzzle" />
      <Callout
        at={[R + 300, 78]}
        box={[R + 250, 4]}
        w={240}
        icon={PackagePlus}
        title="Your own block"
        text={`Build ${name} once from arrows. Then one teal ${name} block does all of them, wherever you use it.`}
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={8} width={44} height={30} rx={8} fill={BLOCK_COLORS.call} stroke={C.ink} strokeWidth={1.5} />
      <text x={28} y={23} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={800} fill="white">
        hop
      </text>
      {[UP, RIGHT, RIGHT, DOWN].map((d, i) => (
        <g key={i}>
          <rect x={54 + i * 16} y={14} width={14} height={18} rx={4} fill={BLOCK_COLORS.motion} stroke={C.ink} strokeWidth={1} />
          <ArrowGlyph cx={61 + i * 16} cy={23} s={12} dir={d} />
        </g>
      ))}
      <rect x={48} y={56} width={22} height={18} rx={6} fill="#a7adbd" stroke={C.ink} strokeWidth={1.4} />
      <path d="M22,70 L22,48 Q22,44 26,44 L92,44 Q96,44 96,48 L96,70" fill="none" stroke="#5b6cff" strokeWidth={3} strokeDasharray="5 4" strokeLinecap="round" />
      <circle cx={22} cy={70} r={6} fill="#5b6cff" stroke={C.ink} strokeWidth={1.4} />
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

/** L0: unpack the function in your head: what is the robot's move number n? */
function nthMove(): Question {
  const p = fnPuzzle({ cols: 7, rows: 4, calls: [1, 2] });
  const real = expand(p.tokens, p.body);
  const firstCall = p.tokens.indexOf('F');
  const before = p.tokens.slice(0, firstCall).length;
  // Ask about a move inside (or just after) the first use of the function, so it has to be unpacked.
  const n = rand(before + 2, Math.min(real.length, before + p.body.length + 1));
  const d = real[n - 1];
  const ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'][n - 1];
  const options = [UP, RIGHT, DOWN, LEFT];
  return mcq({
    prompt: `What is the robot’s ${ordinal} move?`,
    visual: <FunctionPicture name={p.name} body={p.body} main={tokenBlocks(p.tokens, p.name)} />,
    answer: DIR_NAME[d],
    wrong: options.filter((x) => x !== d).map((x) => DIR_NAME[x]),
    labels: Object.fromEntries(options.map((x) => [DIR_NAME[x], <ArrowsPicture moves={[x]} size={56} />])),
    names: Object.fromEntries(options.map((x) => [DIR_NAME[x], DIR_NAME[x]])),
    hint: `Swap each ${p.name} block for its arrows, then count the moves from the start.`,
    explain: [
      `${p.name} means: ${say(p.body)}. Swap it in: ${say(real.slice(0, Math.max(n, before + p.body.length)))}${real.length > Math.max(n, before + p.body.length) ? ', …' : ''}.`,
      `Count along: ${real
        .slice(0, n)
        .map((m, i) => `${i + 1} ${DIR_NAME[m]}`)
        .join(', ')}.`,
      `So move ${n} is ${DIR_NAME[d]}.`,
    ],
  });
}

/** L1: how many arrow blocks would it take without the function? */
function howManyArrows(): Question {
  const p = fnPuzzle({ cols: 9, rows: 4, calls: [2, 3] });
  const calls = p.tokens.filter((t) => t === 'F').length;
  const plain = p.tokens.length - calls;
  const answer = calls * p.body.length + plain;
  return {
    prompt: `Without the ${p.name} block, how many arrow blocks would this program need?`,
    visual: <FunctionPicture name={p.name} body={p.body} main={tokenBlocks(p.tokens, p.name)} />,
    choices: numberChoices(answer, { count: 4, min: 2, max: 30, spread: 3 }).map((value) => ({ value })),
    answer: String(answer),
    hint: `Count the arrows inside ${p.name}, and how many times the program uses it. Don’t forget the other arrows.`,
    explain: [
      `${p.name} has ${p.body.length} arrows, and the program uses it ${calls} times: ${calls} × ${p.body.length} = ${calls * p.body.length}.`,
      `The program also has ${plain} plain arrow${plain === 1 ? '' : 's'}.`,
      `${calls * p.body.length} + ${plain} = ${answer} arrow blocks.`,
    ],
  };
}

/** L1–2: where does the robot end up? */
function whereItEnds(): Question {
  for (;;) {
    const p = fnPuzzle({ cols: 7, rows: 4, calls: [1, 2], decoys: 0 });
    const world: World = { ...p.world, goal: undefined, items: [], needItems: false };
    const moves = expand(p.tokens, p.body);
    let end: Cell = { x: world.start.x, y: world.start.y };
    const visited: Cell[] = [end];
    for (const d of moves) visited.push((end = ahead(end, d)));
    // Near misses: stopping early, or reading the function only once.
    const early = visited[visited.length - 2];
    const once = expand(
      p.tokens.filter((t, i) => t !== 'F' || i !== p.tokens.indexOf('F')),
      p.body,
    ).reduce<Cell>((c, d) => ahead(c, d), { x: world.start.x, y: world.start.y });
    const cells = [end, early, once].filter((c, i, a) => a.findIndex((x) => sameCell(x, c)) === i && !sameCell(c, world.start) && !world.walls.some((w) => sameCell(w, c)));
    if (cells.length < 3 || cells.some((c) => c.x < 0 || c.y < 0 || c.x >= world.cols || c.y >= world.rows)) continue;
    const letters = shuffle(['A', 'B', 'C']);
    const labels = cells.map((cell, i) => ({ cell, text: letters[i] }));
    const answer = letters[0];
    return mcq({
      prompt: 'Run the program in your head. Where does the robot end up?',
      visual: (
        <Beside
          label="The robot's grid, the function and the program"
          left={{ el: <GridPicture world={world} labels={labels} cell={46} />, w: 7 * 46 + 16, h: 4 * 46 + 16 }}
          right={{ el: <FunctionPicture name={p.name} body={p.body} main={tokenBlocks(p.tokens, p.name)} size={40} />, w: 420, h: 136 }}
        />
      ),
      answer,
      wrong: letters.slice(1),
      hint: `Each ${p.name} block means all of its arrows. Move one square for each arrow.`,
      explain: [`Swap each ${p.name} for its arrows: ${say(moves)}.`, `Follow them from the robot, one square at a time.`, `The robot ends on square ${answer}.`],
    });
  }
}

/** L2: which function makes this program reach the flag? */
function whichBody(): Question {
  for (;;) {
    const p = fnPuzzle({ cols: 7, rows: 4, calls: [2, 3], decoys: 1 });
    const flipped = p.body.map((d) => (d === UP || d === DOWN ? opp(d) : d));
    const options = [[...p.body].reverse(), flipped, p.body.slice(1), [p.body[0], ...p.body.slice(2)], [...p.body.slice(1), p.body[0]]];
    const seen = new Set([say(p.body)]);
    const wrong: Dir[][] = [];
    for (const m of shuffle(options)) {
      if (wrong.length >= 2 || !m.length || seen.has(say(m)) || runsWith(p.world, p.tokens, p.name, m)) continue;
      seen.add(say(m));
      wrong.push(m);
    }
    if (wrong.length < 2) continue;
    const all = [p.body, ...wrong];
    const calls = p.tokens.filter((t) => t === 'F').length;
    return mcq({
      prompt: `Which ${p.name} block makes this program reach the flag${p.world.items?.length ? ' and collect the stars' : ''}?`,
      visual: (
        <Beside
          label="The robot's grid and the program"
          left={{ el: <GridPicture world={p.world} cell={46} />, w: 7 * 46 + 16, h: 4 * 46 + 16 }}
          right={{ el: <FunctionPicture name={p.name} body={[]} main={tokenBlocks(p.tokens, p.name)} size={40} />, w: 420, h: 136 }}
        />
      ),
      answer: say(p.body),
      wrong: wrong.map(say),
      labels: Object.fromEntries(all.map((m) => [say(m), <ArrowsPicture moves={m} size={40} />])),
      names: Object.fromEntries(all.map((m) => [say(m), say(m)])),
      hint: `Look at the path where the program says ${p.name}. Which arrows get past the ${p.name === 'hop' ? 'rock' : 'star'} each time?`,
      explain: [
        `The program uses ${p.name} ${calls} times, so the same arrows must work at every ${p.name === 'hop' ? 'rock' : 'star'}.`,
        `${say(p.body)} ${p.name === 'hop' ? 'goes over the rock and back down' : 'goes up to the star and back down'}, ending 2 squares along.`,
        `So ${p.name} should be: ${say(p.body)}.`,
      ],
    });
  }
}

function makeQuestion(level: number): Question {
  if (level <= 0) return nthMove();
  if (level === 1) return Math.random() < 0.5 ? howManyArrows() : whereItEnds();
  return Math.random() < 0.6 ? whichBody() : howManyArrows();
}

export const functions: Lesson = {
  id: 'functions',
  title: 'Make Your Own Block',
  Thumb,
  Scene: FunctionsScene,
  sceneHint: 'Build your block, then use it in the program · Tap a strip to choose where blocks go',
  learn: {
    heading: 'Functions are blocks you make',
    intro: 'A function is a new block you make yourself. You give some steps a name, like “hop”. Then one hop block does all of those steps, every time you use it.',
    points: [
      { icon: PackagePlus, text: 'Define it once: hop = up, right, right, down.' },
      { icon: Repeat, text: 'Use it as many times as you like, anywhere in the program.' },
      { icon: Wrench, text: 'Fix a function once, and every place that uses it is fixed too.' },
    ],
  },
  steps: [
    'Look for a pattern of moves that comes more than once.',
    'Build that pattern in “Make your block”.',
    'Build the program, using your block wherever the pattern comes.',
    'Run it, and count your blocks.',
  ],
  example: {
    question: 'The robot must hop over 2 rocks: up, right, right, down, right, up, right, right, down. Use a hop block.',
    visual: <FunctionPicture name="hop" body={[UP, RIGHT, RIGHT, DOWN]} main={tokenBlocks(['F', RIGHT, 'F'], 'hop')} />,
    work: ['The pattern up, right, right, down comes twice. Call it hop.', 'The program is: hop, right, hop.', '4 blocks in hop + 3 in the program = 7 blocks instead of 9.'],
    answer: 'hop = up, right, right, down. Program: hop, right, hop.',
  },
  grownups: [
    'Functions (also called procedures) let coders name a chunk of steps and reuse it. Recipes do this too: “make the dough” is one step that stands for many.',
    'Ask your child to spot repeated chunks in songs or dances and give them names: “do the chorus”, “do the spin”.',
    'A loop repeats steps right away; a function can be used anywhere, even far apart. Both save blocks.',
  ],
  makeQuestion,
};
