import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import {
  analyze,
  bulbsOf,
  CONDUCTORS,
  hintStep,
  judge,
  makePuzzle,
  makePuzzles,
  maskOf,
  MATERIALS,
  placeTile,
  ROUNDS,
  rotate,
  solve,
  solved,
  tapCell,
  trayLeft,
} from './circuit';
import type { Board, Cell, Puzzle } from './circuit';

/** A small seeded random so failures can be replayed. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const BANDS: Band[] = [0, 1, 2, 3];
const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);

const gaps = (board: Board) => board.cells.flatMap((c, i) => (c?.kind === 'gap' ? [i] : []));
const put = (puzzle: Puzzle, board: Board, i: number, part: string) => {
  const tile = trayLeft(puzzle, board).find((t) => t.part === part);
  if (!tile) throw new Error(`no ${part} left`);
  return placeTile(board, i, tile);
};

describe('rotate', () => {
  it('turns a mask clockwise and wraps around', () => {
    expect(rotate(0b0001)).toBe(0b0010); // N → E
    expect(rotate(0b1000)).toBe(0b0001); // W → N
    expect(rotate(0b0011, 4)).toBe(0b0011);
  });
});

describe('every puzzle can be solved and does not start solved', () => {
  for (const band of BANDS) {
    it(`band ${band}`, () => {
      for (const seed of SEEDS) {
        const puzzles = makePuzzles(band, seeded(seed));
        expect(puzzles).toHaveLength(ROUNDS);
        for (const p of puzzles) {
          expect(solved(p.board, p)).toBe(false);
          const done = solve(p);
          expect(judge(done, p.goal, p.bulbs)).toBe('solved');
          // Every bulb in the finished circuit is on the board and glowing.
          expect(bulbsOf(done)).toHaveLength(p.bulbs);
          expect(analyze(done).lit.size).toBe(p.bulbs);
        }
      }
    });
  }
});

describe('ages 4–5: materials', () => {
  it('offers exactly one conductor, and only it lights the bulb', () => {
    for (const seed of SEEDS) {
      const p = makePuzzle(0, seed % 2, seeded(seed));
      expect(p.materials).toHaveLength(3);
      expect(p.materials.filter((m) => MATERIALS[m].conductor)).toHaveLength(1);
      const slot = p.board.cells.findIndex((c) => c?.kind === 'slot');
      for (const m of p.materials) {
        const cells = [...p.board.cells];
        cells[slot] = { ...(cells[slot] as Extract<Cell, { kind: 'slot' }>), material: m };
        expect(solved({ ...p.board, cells }, p)).toBe(CONDUCTORS.includes(m));
      }
    }
  });
});

describe('ages 6–7: turning tiles', () => {
  it('scrambles two to four wires, each out of place', () => {
    for (const seed of SEEDS) {
      makePuzzles(1, seeded(seed)).forEach((p, round) => {
        const wrong = p.board.cells.filter((c) => c?.kind === 'wire' && maskOf(c) !== c.solution);
        expect(wrong.length).toBe(Math.min(4, 2 + Math.floor(round / 3)));
      });
    }
  });

  it('lights up after turning the wires back', () => {
    const p = makePuzzle(1, 0, seeded(3));
    let board = p.board;
    p.board.cells.forEach((c, i) => {
      if (c?.kind !== 'wire') return;
      for (let k = 0; k < 4 && maskOf(board.cells[i]) !== c.solution; k++) board = tapCell(board, i, 1);
    });
    expect(solved(board, p)).toBe(true);
  });
});

describe('ages 8–9: switch and two bulbs', () => {
  it('stays dark until the switch is closed', () => {
    for (const seed of SEEDS) {
      const p = makePuzzle(2, seed % 3, seeded(seed));
      const done = solve(p);
      const sw = done.cells.findIndex((c) => c?.kind === 'switch');
      const open = tapCell(done, sw, 2);
      expect(judge(open, p.goal, p.bulbs)).toBe('dark');
      expect(analyze(open).lit.size).toBe(0);
    }
  });

  it('has two bulbs and a spare tile in the tray', () => {
    for (const p of makePuzzles(2, seeded(9))) {
      expect(p.bulbs).toBe(2);
      expect(p.tray.length).toBe(gaps(p.board).length + 1);
    }
  });
});

describe('ages 10–12: series and parallel', () => {
  it('two bulbs on the rail glow, but in series', () => {
    // ES  G:EW  ESW  G:EW  WS  /  BN .. G:LV .. G:LV  /  NE EW NEW EW NW
    const p = makePuzzle(3, 0, () => 0.9);
    const [rail1, rail2, , farRung] = gaps(p.board);
    let board = put(p, p.board, rail1, 'bulb');
    board = put(p, board, rail2, 'bulb');
    // The far rung needs a wire to finish the loop.
    expect(judge(board, p.goal, p.bulbs)).toBe('dark');
    board = put(p, board, farRung, 'straight');
    expect(judge(board, p.goal, p.bulbs)).toBe('series');
    expect(judge(board, 'light', p.bulbs)).toBe('solved');
  });

  it('a wire across a rung is a short circuit', () => {
    const p = makePuzzle(3, 0, () => 0.9);
    const [rail1, rail2, rung1] = gaps(p.board);
    let board = put(p, p.board, rail1, 'straight');
    board = put(p, board, rail2, 'straight');
    board = put(p, board, rung1, 'bulb');
    const rung2 = gaps(p.board)[3];
    expect(judge(board, p.goal, p.bulbs)).toBe('missing');
    // Swap the last bulb for a straight wire: rail to rail with nothing in the way.
    const shorted = placeTile(board, rung2, { id: 99, part: 'straight' });
    const a = analyze(shorted);
    expect(a.short).toBe(true);
    expect(a.sparks.size).toBeGreaterThan(0);
    expect(judge(shorted, p.goal, p.bulbs)).toBe('short');
  });

  it('a wire in the trap gap shorts the battery', () => {
    const p = makePuzzle(3, 2, () => 0.9);
    const done = solve(p);
    const trap = gaps(p.board).find((i) => (p.board.cells[i] as Extract<Cell, { kind: 'gap' }>).need === null)!;
    const shorted = placeTile(done, trap, { id: 99, part: 'straight' });
    expect(judge(shorted, p.goal, p.bulbs)).toBe('short');
  });

  it('in parallel, unscrewing one bulb leaves the other lit', () => {
    for (const seed of SEEDS) {
      for (const p of makePuzzles(3, seeded(seed))) {
        const done = solve(p);
        for (const b of bulbsOf(done)) {
          const lit = analyze(tapCell(done, b, 3)).lit;
          expect(lit.has(b)).toBe(false);
          expect(lit.size).toBe(p.bulbs - 1);
        }
      }
    }
  });
});

describe('hints', () => {
  it('each hint moves one step closer and never undoes good work', () => {
    for (const band of BANDS) {
      for (const p of makePuzzles(band, seeded(4))) {
        let board = p.board;
        let steps = 0;
        while (!solved(board, p) && steps < 20) {
          const next = hintStep(p, board);
          expect(next).not.toBe(board);
          board = next;
          steps++;
        }
        expect(solved(board, p)).toBe(true);
      }
    }
  });

  it('fixes tiles a child put in the wrong gaps', () => {
    const p = makePuzzle(3, 0, () => 0.9);
    const [rail1, rail2, rung1, rung2] = gaps(p.board);
    let board = put(p, p.board, rail1, 'bulb');
    board = put(p, board, rail2, 'bulb');
    board = put(p, board, rung1, 'straight');
    board = put(p, board, rung2, 'straight');
    expect(trayLeft(p, board)).toHaveLength(0);
    for (let k = 0; k < 10 && !solved(board, p); k++) board = hintStep(p, board);
    expect(solved(board, p)).toBe(true);
  });
});
