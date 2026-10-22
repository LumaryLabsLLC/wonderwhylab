import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { play } from '../../../lib/sound';
import { runProgram } from './model';
import type { Cell, Program, RobotState, RunOptions, Step, Trace, World } from './model';

export type RunStatus = 'idle' | 'running' | 'stepping' | 'done';

export interface Runner {
  status: RunStatus;
  trace: Trace | null;
  /** The step being shown (0 = start). */
  index: number;
  step: Step | null;
  robot: RobotState;
  /** Cells visited so far, in order. */
  trail: Cell[];
  /** Ids to highlight: the running block plus any loop / if / call it is inside. */
  activeIds: Set<string>;
  /** Where the robot bumped, once the animation has reached the bump. */
  bump: Cell | null;
  /** Run the whole program, animated. */
  run: () => void;
  /** Show one more step (starts a fresh run if needed). */
  stepOnce: () => void;
  /** Put the robot back at the start. */
  reset: () => void;
}

const DELAY = { move: 480, turn: 380, bump: 400, loop: 300, test: 380, call: 300, start: 260, end: 0 } as const;

/**
 * Animate a program on a world. Changing the program or world resets the runner.
 * `onDone` is called once when an animated run (or stepping) reaches the last step.
 * `speed` > 1 runs the animation faster (for long programs, e.g. drawing shapes).
 */
export function useRunner(world: World, program: Program, opts: RunOptions & { onDone?: (t: Trace) => void; speed?: number } = {}): Runner {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<RunStatus>('idle');
  const timer = useRef<number | undefined>(undefined);
  const onDone = useRef(opts.onDone);
  onDone.current = opts.onDone;
  const runOpts = useRef<RunOptions>({ stopAtGoal: opts.stopAtGoal, maxSteps: opts.maxSteps });
  runOpts.current = { stopAtGoal: opts.stopAtGoal, maxSteps: opts.maxSteps };
  const speed = useRef(opts.speed ?? 1);
  speed.current = opts.speed ?? 1;

  const stop = () => window.clearTimeout(timer.current);

  const reset = useCallback(() => {
    stop();
    setTrace(null);
    setIndex(0);
    setStatus('idle');
  }, []);

  // A new program or world means the old run no longer applies.
  useEffect(() => {
    reset();
  }, [world, program, reset]);

  useEffect(() => () => stop(), []);

  const finish = (t: Trace) => {
    setStatus('done');
    play(t.outcome === 'success' ? 'complete' : 'wrong');
    onDone.current?.(t);
  };

  const run = useCallback(() => {
    stop();
    const t = runProgram(world, program, runOpts.current);
    setTrace(t);
    setIndex(0);
    setStatus('running');
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= t.steps.length) {
        finish(t);
        return;
      }
      setIndex(i);
      const s = t.steps[i];
      if (s.action === 'move') play(s.picked ? 'pop' : 'tap');
      timer.current = window.setTimeout(tick, DELAY[s.action] / speed.current);
    };
    timer.current = window.setTimeout(tick, DELAY.start);
  }, [world, program]);

  const stepOnce = useCallback(() => {
    stop();
    if (!trace || status === 'done' || status === 'running') {
      const t = runProgram(world, program, runOpts.current);
      setTrace(t);
      setIndex(Math.min(1, t.steps.length - 1));
      setStatus(t.steps.length <= 2 ? 'done' : 'stepping');
      if (t.steps.length <= 2) finish(t);
      return;
    }
    const next = index + 1;
    if (next >= trace.steps.length - 1) {
      setIndex(trace.steps.length - 1);
      finish(trace);
      return;
    }
    setIndex(next);
    play('tap');
  }, [trace, index, status, world, program]);

  const step = trace ? trace.steps[Math.min(index, trace.steps.length - 1)] : null;
  const robot: RobotState = step?.state ?? { x: world.start.x, y: world.start.y, dir: world.start.dir, collected: [] };

  const trail = useMemo(() => {
    const cells: Cell[] = [{ x: world.start.x, y: world.start.y }];
    if (!trace) return cells;
    for (let i = 1; i <= index && i < trace.steps.length; i++) {
      const s = trace.steps[i];
      if (s.action === 'move') cells.push({ x: s.state.x, y: s.state.y });
    }
    return cells;
  }, [trace, index, world]);

  const activeIds = useMemo(() => {
    if (!step || status === 'idle' || (status === 'done' && step.action === 'end')) return new Set<string>();
    return new Set([...step.stack, ...(step.blockId ? [step.blockId] : [])]);
  }, [step, status]);

  const bump = step?.action === 'bump' ? (step.bumpAt ?? null) : null;

  return { status, trace, index, step, robot, trail, activeIds, bump, run, stepOnce, reset };
}
