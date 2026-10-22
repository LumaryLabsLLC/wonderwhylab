import { DIR_NAME, DIR_VEC, DIRS } from './engine';
import type { Cell, Dir } from './engine';

/** "above", "below", "to the left of", "to the right of": where `b` sits next to `a`. */
export const SIDE: Record<Dir, string> = { 0: 'above', 1: 'to the right of', 2: 'below', 3: 'to the left of' };

/** "right, right, up" */
export const say = (moves: Dir[]) => moves.map((d) => DIR_NAME[d]).join(', ');

/** "1, 2, 3" */
export const countUp = (n: number) => Array.from({ length: n }, (_, i) => i + 1).join(', ');

/** Directions that keep a cell inside a cols × rows grid. */
export function dirsInside(c: Cell, cols: number, rows: number): Dir[] {
  return DIRS.filter((d) => {
    const x = c.x + DIR_VEC[d][0];
    const y = c.y + DIR_VEC[d][1];
    return x >= 0 && y >= 0 && x < cols && y < rows;
  });
}

/** Moves grouped in plain words: [right, right, up] → "2 right, then 1 up". */
export function sayRuns(moves: Dir[]): string {
  const out: string[] = [];
  for (let i = 0; i < moves.length; ) {
    let j = i;
    while (j < moves.length && moves[j] === moves[i]) j++;
    out.push(`${j - i} ${DIR_NAME[moves[i]]}`);
    i = j;
  }
  return out.join(', then ');
}
