import { describe, expect, it } from 'vitest';
import {
  DOWN,
  LEFT,
  RIGHT,
  UP,
  call,
  countBlocks,
  endOf,
  forward,
  ifBlock,
  insertBlock,
  makePuzzle,
  move,
  removeBlock,
  repeat,
  rng,
  runProgram,
  runs,
  shortestPath,
  turnLeft,
  turnRight,
  updateBlock,
} from './model';
import type { World } from './model';

const open3x3: World = { cols: 3, rows: 3, start: { x: 0, y: 0, dir: RIGHT }, goal: { x: 2, y: 2 }, walls: [] };

describe('interpreter', () => {
  it('moves with absolute arrows and reaches the goal', () => {
    const t = runProgram(open3x3, { main: [move(RIGHT), move(RIGHT), move(DOWN), move(DOWN)] });
    expect(t.outcome).toBe('success');
    expect(t.final).toMatchObject({ x: 2, y: 2 });
    expect(t.steps[0].action).toBe('start');
    expect(t.steps.at(-1)?.action).toBe('end');
  });

  it('reports where it bumped and which block did it', () => {
    const bad = move(UP);
    const t = runProgram(open3x3, { main: [move(RIGHT), bad, move(DOWN)] });
    expect(t.outcome).toBe('bumped');
    expect(t.failedBlockId).toBe(bad.id);
    expect(t.steps[t.failedAt!]).toMatchObject({ action: 'bump', error: 'edge', bumpAt: { x: 1, y: -1 } });
  });

  it('bumps into walls', () => {
    const w: World = { ...open3x3, walls: [{ x: 1, y: 0 }] };
    const t = runProgram(w, { main: [move(RIGHT)] });
    expect(t.outcome).toBe('bumped');
    expect(t.steps.at(-1)?.error).toBe('wall');
  });

  it('says when the program ends somewhere else', () => {
    expect(runProgram(open3x3, { main: [move(RIGHT)] }).outcome).toBe('not-there');
  });

  it('handles forward and turns relative to the facing direction', () => {
    const t = runProgram(open3x3, { main: [forward(), forward(), turnRight(), forward(), forward()] });
    expect(t.outcome).toBe('success');
    const u = runProgram({ ...open3x3, start: { x: 2, y: 2, dir: LEFT }, goal: { x: 2, y: 0 } }, { main: [turnRight(), forward(), forward()] });
    expect(u.outcome).toBe('success');
    expect(runProgram(open3x3, { main: [turnLeft()] }).final.dir).toBe(UP);
  });

  it('runs repeat loops and records each time round', () => {
    const loop = repeat(2, [move(RIGHT), move(DOWN)]);
    const t = runProgram(open3x3, { main: [loop] });
    expect(t.outcome).toBe('success');
    const laps = t.steps.filter((s) => s.action === 'loop');
    expect(laps.map((s) => s.iteration)).toEqual([1, 2]);
    // Inner steps know they are inside the loop.
    expect(t.steps.filter((s) => s.action === 'move').every((s) => s.stack.includes(loop.id))).toBe(true);
  });

  it('chooses with if/else using the cell ahead', () => {
    const w: World = { cols: 3, rows: 1, start: { x: 0, y: 0, dir: RIGHT }, goal: { x: 2, y: 0 }, walls: [] };
    const prog = { main: [repeat(4, [ifBlock('path-ahead', [forward()], [turnLeft()])])] };
    const t = runProgram(w, prog);
    expect(t.final).toMatchObject({ x: 2, y: 0 });
    expect(t.steps.filter((s) => s.action === 'test').map((s) => s.result)).toEqual([true, true, false, false]);
  });

  it('calls functions', () => {
    const t = runProgram(open3x3, { main: [call('hop'), call('hop')], functions: { hop: [move(RIGHT), move(DOWN)] } });
    expect(t.outcome).toBe('success');
  });

  it('collects stars and can require them', () => {
    const w: World = { ...open3x3, items: [{ x: 0, y: 2 }], needItems: true };
    expect(runProgram(w, { main: [move(RIGHT), move(RIGHT), move(DOWN), move(DOWN)] }).outcome).toBe('missed-items');
    const t = runProgram(w, { main: [move(DOWN), move(DOWN), move(RIGHT), move(RIGHT)] });
    expect(t.outcome).toBe('success');
    expect(t.steps.some((s) => s.picked)).toBe(true);
  });

  it('can stop as soon as it reaches the goal', () => {
    const t = runProgram(open3x3, { main: [move(DOWN), move(DOWN), move(RIGHT), move(RIGHT), move(UP)] }, { stopAtGoal: true });
    expect(t.outcome).toBe('success');
  });

  it('guards against runaway programs', () => {
    const w: World = { cols: 2, rows: 1, start: { x: 0, y: 0, dir: RIGHT }, walls: [] };
    const t = runProgram(w, { main: [repeat(500, [turnLeft()])] });
    expect(t.outcome).toBe('too-long');
  });
});

describe('editing', () => {
  it('inserts, removes and updates nested blocks', () => {
    const loop = repeat(2, []);
    let list = [move(RIGHT), loop];
    list = insertBlock(list, [{ index: 1, branch: 'body' }], 0, move(DOWN));
    expect(countBlocks(list)).toBe(3);
    list = updateBlock(list, [], 1, (b) => (b.kind === 'repeat' ? { ...b, times: 3 } : b));
    expect(list[1]).toMatchObject({ kind: 'repeat', times: 3 });
    list = removeBlock(list, [{ index: 1, branch: 'body' }], 0);
    expect(countBlocks(list)).toBe(2);
  });
});

describe('solver and puzzles', () => {
  it('finds the shortest path around walls', () => {
    const w: World = { cols: 3, rows: 3, start: { x: 0, y: 0, dir: RIGHT }, goal: { x: 2, y: 0 }, walls: [{ x: 1, y: 0 }] };
    const p = shortestPath(w)!;
    expect(p).toHaveLength(4);
    expect(endOf(w, p)).toEqual({ x: 2, y: 0 });
  });

  it('makes solvable puzzles in the requested range', () => {
    const r = rng(42);
    for (let i = 0; i < 200; i++) {
      const pz = makePuzzle({ cols: 5, rows: 4, walls: 3, minLen: 3, maxLen: 5, random: r });
      expect(pz.solution.length).toBeGreaterThanOrEqual(3);
      expect(pz.solution.length).toBeLessThanOrEqual(5);
      expect(runProgram(pz, { main: pz.solution.map((d) => move(d)) }).outcome).toBe('success');
    }
  });

  it('groups moves into runs', () => {
    expect(runs([RIGHT, RIGHT, UP])).toEqual([
      { dir: RIGHT, n: 2 },
      { dir: UP, n: 1 },
    ]);
  });
});
