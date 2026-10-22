import { useMemo, useState } from 'react';
import { Layers, PencilLine, SlidersHorizontal, SquareFunction } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { BENCH, BLOCK_COLORS, Message, RunControls, useRunner } from '../engine';
import type { GridLayout, Trace } from '../engine';
import { mcq } from '../q';
import { BOARD, DrawPicture, DrawingBoard, callText, compile, edgesOf, left, penPath, programText, right, sameDrawing, sq, stepsOf, walk } from './visuals/drawing';
import type { Call, DefLine } from './visuals/drawing';
import { CodePicture } from './visuals/logic';
import type { CodeLine } from './visuals/logic';

const MAX_CALLS = 5;
const MAX_N = 6;

/** A picture to copy: made from a short program that stays on the board. */
function makeTarget(): Call[] {
  for (;;) {
    const a = rand(1, 3);
    const b = rand(a + 1, 5);
    const t = pick<() => Call[]>([
      () => [sq(rand(2, 5))],
      () => (Math.random() < 0.5 ? [sq(a), sq(b)] : [sq(b), sq(a)]),
      () => [walk(rand(1, 3)), sq(rand(2, 3))],
      () => [sq(rand(2, 3)), right(), walk(rand(2, 3)), left(), sq(rand(1, 3))],
      () => [sq(a), sq(b), sq(rand(1, 5))],
    ])();
    if (penPath(t)) return t;
  }
}

const DEF_LINES: { line?: DefLine; text: string; indent: number; col: 0 | 1; row: number }[] = [
  { text: 'define square(size)', indent: 0, col: 0, row: 0 },
  { line: 'sq-repeat', text: 'repeat 4', indent: 1, col: 0, row: 1 },
  { line: 'sq-walk', text: 'walk(size)', indent: 2, col: 0, row: 2 },
  { line: 'sq-turn', text: 'turn right', indent: 2, col: 0, row: 3 },
  { text: 'define walk(steps)', indent: 0, col: 1, row: 0 },
  { line: 'walk-repeat', text: 'repeat steps', indent: 1, col: 1, row: 1 },
  { line: 'walk-forward', text: 'forward', indent: 2, col: 1, row: 2 },
];

// ─────────────────────────── Scene ───────────────────────────

const R = BENCH.right;
const ROW = { y: 70, h: 52, step: 58 };
const PAL_Y = 394;
const DEF_Y = 482;
const GRID: GridLayout = { x: 60, y: 70, cell: 47.5 };
const PALETTE: { label: string; w: number; make: () => Call }[] = [
  { label: 'square( )', w: 130, make: () => sq(2) },
  { label: 'walk( )', w: 110, make: () => walk(1) },
  { label: 'turn right', w: 118, make: right },
  { label: 'turn left', w: 108, make: left },
];

function InputsScene() {
  const [calls, setCalls] = useState<Call[]>(() => [sq(2)]);
  const [target, setTarget] = useState<Call[]>(() => [sq(3)]);
  const [last, setLast] = useState<Trace | null>(null);
  const goal = useMemo(() => edgesOf(penPath(target) ?? []), [target]);
  const { main, owner } = useMemo(() => compile(calls), [calls]);
  const program = useMemo(() => ({ main }), [main]);
  const runner = useRunner(BOARD, program, { maxSteps: 2000, speed: 2.4, onDone: setLast });
  const busy = runner.status === 'running';

  const edit = (next: Call[]) => {
    setCalls(next);
    setLast(null);
  };
  const add = (make: () => Call) => {
    if (busy || calls.length >= MAX_CALLS) return;
    play('pop');
    edit([...calls, make()]);
  };
  const setN = (id: string, n: number) => {
    if (busy) return;
    edit(calls.map((c) => (c.id === id ? { ...c, n } : c)));
  };

  // What is running right now: which call, which lines of the definitions, and the loop counters.
  const live = runner.status !== 'idle' && !(runner.status === 'done' && runner.step?.action === 'end');
  const activeCall = live ? [...runner.activeIds].map((id) => owner.get(id)?.call).find(Boolean) : undefined;
  const activeLines = new Set<DefLine>(live ? [...runner.activeIds].flatMap((id) => owner.get(id)?.lines ?? []) : []);
  const running = calls.find((c) => c.id === activeCall);
  const shown = runner.status === 'done' ? last : null;
  const failedCall = shown?.failedBlockId ? owner.get(shown.failedBlockId)?.call : undefined;
  const iteration = (blockId: string | undefined) => {
    const t = runner.trace;
    if (!t || !blockId) return null;
    for (let i = Math.min(runner.index, t.steps.length - 1); i >= 0; i--) if (t.steps[i].action === 'loop' && t.steps[i].blockId === blockId) return t.steps[i];
    return null;
  };
  const runIndex = running ? calls.indexOf(running) : -1;
  const outer = runIndex >= 0 && running?.fn === 'square' ? iteration(main[runIndex].id) : null;

  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  if (shown) {
    if (shown.outcome === 'bumped') msg = { tone: 'oops', text: `Bump! ${failedCall ? callText(calls.find((c) => c.id === failedCall)!) : 'The program'} took the robot off the board. Try a smaller input.` };
    else {
      const drawn = edgesOf(runner.trail);
      const hits = [...goal].filter((k) => drawn.has(k)).length;
      const extra = drawn.size - hits;
      msg = sameDrawing(drawn, goal)
        ? { tone: 'good', text: 'You drew it! Same functions, different inputs, different sizes. Try New picture for a new challenge.' }
        : { tone: 'oops', text: `Your drawing has ${hits} of the ${goal.size} lines in the picture${extra ? `, plus ${extra} extra` : ''}. Try changing an input.` };
    }
  } else if (running) {
    const side = outer ? ` · side ${outer.iteration} of 4` : '';
    msg = { tone: 'info', text: `Running ${callText(running)}${running.fn === 'square' ? `: size = ${running.n}${side}` : running.fn === 'walk' ? `: steps = ${running.n}` : ''}` };
  } else if (!calls.length) msg = { tone: 'info', text: 'Tap square( ) or walk( ) to add a function. Then use − and + to choose its input.' };
  else msg = { tone: 'info', text: 'Change the inputs with − and +, then press Run. Can you draw the dashed picture?' };

  const valueBadge = running && (running.fn === 'square' || running.fn === 'walk') ? (running.fn === 'square' ? `size = ${running.n}` : `steps = ${running.n}`) : null;

  return (
    <SceneSvg label="Functions with inputs: give square and walk an input number to draw shapes of different sizes">
      <text x={GRID.x} y={58} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Draw the dashed picture
      </text>
      <DrawingBoard world={BOARD} layout={GRID} robot={runner.robot} trail={runner.trail} target={goal} bump={runner.bump} />
      <Message x={40} y={472} w={420} tone={msg.tone} text={msg.text} />
      <SvgButton
        x={40}
        y={606}
        w={180}
        h={56}
        fontSize={19}
        label="New picture"
        onClick={() => {
          setTarget(makeTarget());
          setLast(null);
          runner.reset();
        }}
        disabled={busy}
      />

      {/* The program: function calls with inputs */}
      <text x={R} y={58} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Program · {calls.length} of {MAX_CALLS}
      </text>
      {!calls.length && (
        <g>
          <rect x={R} y={ROW.y} width={BENCH.rightW} height={ROW.h} rx={12} fill="white" stroke={C.muted} strokeWidth={2} strokeDasharray="6 5" />
          <text x={R + BENCH.rightW / 2} y={ROW.y + ROW.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fill={C.muted}>
            Tap a block below to add it
          </text>
        </g>
      )}
      {calls.map((c, i) => {
        const y = ROW.y + i * ROW.step;
        const color = c.fn === 'square' ? BLOCK_COLORS.call : BLOCK_COLORS.motion;
        const hasInput = c.fn === 'square' || c.fn === 'walk';
        const active = c.id === activeCall && live && !failedCall;
        const failed = c.id === failedCall;
        return (
          <g key={c.id}>
            {(active || failed) && <rect x={R - 6} y={y - 5} width={BENCH.rightW + 12} height={ROW.h + 10} rx={16} fill={failed ? C.red : C.yellow} opacity={0.55} />}
            <rect x={R} y={y} width={BENCH.rightW} height={ROW.h} rx={12} fill={shade(color, 0.82)} stroke={C.ink} strokeWidth={2} />
            <text x={R + 16} y={y + ROW.h / 2} dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.muted}>
              {i + 1}
            </text>
            <text x={R + 38} y={y + ROW.h / 2} dominantBaseline="central" fontSize={22} fontWeight={800} fill={shade(color, -0.35)}>
              {hasInput ? `${c.fn}(` : `turn ${c.fn} ${c.fn === 'right' ? '↻' : '↺'}`}
            </text>
            {hasInput && (
              <>
                <SvgButton x={R + 138} y={y + 2} w={46} h={46} label="−" fontSize={24} onClick={() => setN(c.id, c.n - 1)} disabled={busy || c.n <= 1} title={`Smaller ${c.fn}`} />
                <text x={R + 212} y={y + ROW.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={800} fill={C.ink} className="num">
                  {c.n}
                </text>
                <SvgButton x={R + 240} y={y + 2} w={46} h={46} label="+" fontSize={24} onClick={() => setN(c.id, c.n + 1)} disabled={busy || c.n >= MAX_N} title={`Bigger ${c.fn}`} />
                <text x={R + 296} y={y + ROW.h / 2} dominantBaseline="central" fontSize={22} fontWeight={800} fill={shade(color, -0.35)}>
                  )
                </text>
                <text x={R + 318} y={y + ROW.h / 2} dominantBaseline="central" fontSize={16} fill={C.ink2}>
                  → {stepsOf(c)} step{stepsOf(c) === 1 ? '' : 's'}
                </text>
              </>
            )}
            <SvgButton x={R + BENCH.rightW - 54} y={y + 2} w={46} h={46} label="✕" fontSize={20} onClick={() => !busy && (play('tap'), edit(calls.filter((x) => x.id !== c.id)))} disabled={busy} title="Take it out" />
          </g>
        );
      })}

      <text x={R} y={PAL_Y - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Blocks · tap to add
      </text>
      {PALETTE.map((p, i) => (
        <SvgButton
          key={p.label}
          x={R + PALETTE.slice(0, i).reduce((sum, q) => sum + q.w + 10, 0)}
          y={PAL_Y}
          w={p.w}
          h={50}
          fontSize={18}
          label={p.label}
          color={shade(p.label.startsWith('square') ? BLOCK_COLORS.call : BLOCK_COLORS.motion, 0.75)}
          onClick={() => add(p.make)}
          disabled={busy || calls.length >= MAX_CALLS}
        />
      ))}

      {/* The function definitions, lit up as they run */}
      <text x={R} y={DEF_Y - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Functions{valueBadge ? ` · ${valueBadge}` : ''}
      </text>
      <rect x={R} y={DEF_Y} width={BENCH.rightW} height={116} rx={14} fill="white" stroke={C.ink} strokeWidth={2} />
      <line x1={R + 250} y1={DEF_Y + 10} x2={R + 250} y2={DEF_Y + 108} stroke={C.line} strokeWidth={2} />
      {DEF_LINES.map((d) => {
        const x = R + (d.col ? 262 : 12);
        const y = DEF_Y + 8 + d.row * 26;
        const on = !!d.line && activeLines.has(d.line);
        return (
          <g key={d.text}>
            {on && <rect x={x - 4} y={y} width={232} height={25} rx={6} fill={shade(C.yellow, 0.3)} />}
            <text x={x + d.indent * 18} y={y + 13} dominantBaseline="central" fontSize={17} fontWeight={d.indent ? 700 : 800} fill={d.indent ? (d.line?.endsWith('repeat') ? shade(BLOCK_COLORS.repeat, -0.25) : C.ink) : shade(BLOCK_COLORS.call, -0.3)}>
              {d.text}
              {d.line === 'sq-repeat' && outer && on ? ` · time ${outer.iteration}` : ''}
            </text>
          </g>
        );
      })}
      <RunControls x={R} y={614} runner={runner} canRun={calls.length > 0} extra={[{ label: 'Clear', onClick: () => edit([]), disabled: !calls.length }]} />
      <Callout
        at={[R + 360, ROW.y + 10]}
        box={[R + 250, 4]}
        w={240}
        icon={SlidersHorizontal}
        title="Inputs change the size"
        text="square(size) uses its input as the length of each side. The same function draws a tiny square or a big one."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={8} y={8} width={46} height={46} fill="none" stroke="#5b6cff" strokeWidth={4} strokeLinejoin="round" />
      <rect x={8} y={30} width={24} height={24} fill="none" stroke="#5b6cff" strokeWidth={4} strokeLinejoin="round" />
      <rect x={62} y={46} width={52} height={26} rx={8} fill={BLOCK_COLORS.call} stroke={C.ink} strokeWidth={1.5} />
      <text x={88} y={59} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={800} fill="white">
        square(4)
      </text>
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

const DEFS: CodeLine[] = [
  { text: 'define square(size):', kind: 'def' },
  { text: 'repeat 4:', indent: 1, kind: 'loop' },
  { text: 'walk(size)', indent: 2, kind: 'do' },
  { text: 'turn right', indent: 2, kind: 'do' },
];

/** L0: which call draws this square? */
function whichSquare(): Question {
  const n = rand(2, 5);
  const options = [n - 1, n, n + 1].filter((k) => k >= 1);
  const name = (k: number) => `square(${k})`;
  return mcq({
    prompt: 'The robot starts at the bottom-left corner. Which call draws this square?',
    visual: <DrawPicture calls={[sq(n)]} />,
    answer: name(n),
    wrong: options.filter((k) => k !== n).map(name),
    hint: 'Count the steps along one side, from one corner dot to the next corner.',
    explain: [`Count the steps along one side: ${Array.from({ length: n }, (_, i) => i + 1).join(', ')}.`, 'square(size) walks size steps on every side.', `So the call is ${name(n)}.`],
  });
}

/** L0–1: nested loops: how many forward steps does one call make? */
function forwardsIn(): Question {
  const n = rand(2, 9);
  return {
    prompt: `How many times does “forward” run when the program calls square(${n})?`,
    visual: <CodePicture lines={[...DEFS, { text: 'define walk(steps):', kind: 'def' }, { text: 'repeat steps:', indent: 1, kind: 'loop' }, { text: 'forward', indent: 2, kind: 'do' }]} w={400} />,
    choices: numberChoices(4 * n, { count: 4, min: 1, max: 50, spread: 4 }).map((value) => ({ value })),
    answer: String(4 * n),
    hint: 'There is a loop inside a loop. How many times does the outer loop go round, and how many forwards each time?',
    explain: [`square repeats 4 times.`, `Each time, walk(${n}) runs forward ${n} times.`, `4 × ${n} = ${4 * n}.`],
  };
}

/** L1: total steps for a short program. */
function totalSteps(): Question {
  for (;;) {
    const calls = pick<() => Call[]>([() => [sq(rand(1, 4)), sq(rand(2, 5))], () => [walk(rand(1, 3)), sq(rand(2, 4))], () => [sq(rand(2, 3)), walk(rand(1, 3)), sq(rand(1, 3))]])();
    if (!penPath(calls)) continue;
    const parts = calls.filter((c) => stepsOf(c) > 0);
    const total = parts.reduce((s, c) => s + stepsOf(c), 0);
    return {
      prompt: `How many forward steps does the robot take for: ${programText(calls)}?`,
      visual: <CodePicture lines={[...DEFS, { text: programText(calls), kind: 'set' }]} w={420} />,
      choices: numberChoices(total, { count: 4, min: 2, max: 60, spread: 4 }).map((value) => ({ value })),
      answer: String(total),
      hint: 'Work out each call on its own. A square has 4 sides, each as long as its input.',
      explain: [
        parts.map((c) => `${callText(c)} = ${c.fn === 'square' ? `4 × ${c.n} = ` : ''}${stepsOf(c)}`).join('; ') + '.',
        `Add them: ${parts.map(stepsOf).join(' + ')} = ${total}.`,
        `So the robot takes ${total} steps.`,
      ],
    };
  }
}

/** L2: which program draws this picture? */
function whichProgram(): Question {
  for (;;) {
    const target = makeTarget();
    if (target.length < 2) continue;
    const path = penPath(target)!;
    const want = edgesOf(path);
    const variants: Call[][] = [];
    target.forEach((c, i) => {
      if (c.fn !== 'square' && c.fn !== 'walk') return;
      for (const d of [-1, 1, 2]) if (c.n + d >= 1) variants.push(target.map((x, j) => (j === i ? { ...x, n: x.n + d } : x)));
    });
    variants.push(target.filter((c) => c.fn !== 'walk'));
    const seen = new Set([programText(target)]);
    const wrong: Call[][] = [];
    for (const v of shuffle(variants)) {
      if (wrong.length >= 2 || !v.length || seen.has(programText(v))) continue;
      const p = penPath(v);
      if (!p || sameDrawing(edgesOf(p), want)) continue;
      seen.add(programText(v));
      wrong.push(v);
    }
    if (wrong.length < 2) continue;
    return mcq({
      prompt: 'Which program draws this picture? (The robot starts at the bottom-left, facing up.)',
      visual: <DrawPicture calls={target} />,
      answer: programText(target),
      wrong: wrong.map(programText),
      hint: 'Measure each square by counting steps along a side. Check where each shape starts.',
      explain: [
        `Count the sides: ${target
          .filter((c) => c.fn === 'square')
          .map((c) => `one square has sides of ${c.n}`)
          .join(', ')}.`,
        target.some((c) => c.fn === 'walk') ? 'The robot also walks between shapes, so a walk( ) is needed.' : 'Every square starts at the same corner, so the squares sit inside each other.',
        `So the program is ${programText(target)}.`,
      ],
    });
  }
}

/** L2: a new function with an input: stairs(n) = repeat n { forward, turn right, forward, turn left }. */
function stairsQ(): Question {
  const n = rand(3, 8);
  return {
    prompt: `How many forward steps does stairs(${n}) take?`,
    visual: (
      <CodePicture
        w={420}
        lines={[
          { text: 'define stairs(n):', kind: 'def' },
          { text: 'repeat n:', indent: 1, kind: 'loop' },
          { text: 'forward', indent: 2, kind: 'do' },
          { text: 'turn right', indent: 2, kind: 'do' },
          { text: 'forward', indent: 2, kind: 'do' },
          { text: 'turn left', indent: 2, kind: 'do' },
        ]}
      />
    ),
    choices: numberChoices(2 * n, { count: 4, min: 1, max: 30, spread: 3 }).map((value) => ({ value })),
    answer: String(2 * n),
    hint: 'Count the forwards inside the loop, then think about how many times the loop runs when n is the input.',
    explain: [`Inside the loop there are 2 forwards.`, `The input is ${n}, so the loop runs ${n} times.`, `2 × ${n} = ${2 * n} forward steps.`],
  };
}

function makeQuestion(level: number): Question {
  if (level <= 0) return Math.random() < 0.6 ? whichSquare() : forwardsIn();
  if (level === 1) return Math.random() < 0.5 ? totalSteps() : forwardsIn();
  return pick([whichProgram, stairsQ, totalSteps])();
}

export const functionsWithInputs: Lesson = {
  id: 'functions-with-inputs',
  title: 'Functions with Inputs',
  Thumb,
  Scene: InputsScene,
  sceneHint: 'Tap blocks to add calls · − / + change each input · Run to draw',
  learn: {
    heading: 'Inputs make functions flexible',
    intro: 'A function can take an input, also called a parameter. square(size) uses size as the length of each side, so the same function can draw a square of any size. The value you pass in, like the 3 in square(3), is the argument.',
    points: [
      { icon: SquareFunction, text: 'define square(size): size is a name for whatever number is passed in.' },
      { icon: SlidersHorizontal, text: 'square(2) and square(5) run the same code with different inputs.' },
      { icon: Layers, text: 'square calls walk inside a repeat loop: a loop inside a loop (nested loops).' },
      { icon: PencilLine, text: 'Functions can call other functions, and pass their input along: walk(size).' },
    ],
  },
  steps: [
    'Look at the picture: how many shapes, and how long is each side?',
    'Add a function call for each shape.',
    'Use − and + to set each input.',
    'Run it. If a line is missing or extra, change one input and try again.',
  ],
  example: {
    question: 'How many forward steps does square(3) take, and why?',
    visual: <CodePicture lines={DEFS} w={380} />,
    work: ['size is 3, so walk(size) means walk(3): 3 forward steps.', 'repeat 4 runs walk(3) four times: one for each side.', '4 × 3 = 12 forward steps.'],
    answer: '12 steps',
  },
  grownups: [
    'Inputs (parameters) are what make functions reusable: one recipe for “bake a cake for n people” instead of one recipe per size.',
    'square calls walk inside a loop: a loop inside a loop. Counting steps (4 sides × size) is multiplication in action.',
    'Ask your child to predict before pressing Run: “If I change 3 to 4, how many more steps will the robot take?”',
  ],
  makeQuestion,
};
