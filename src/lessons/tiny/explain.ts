/** Helpers for writing worked solutions in child language. */

/** "1, 2, 3, 4" — the numbers from `from` to `to` (inclusive), counting up or down. */
export function countList(from: number, to: number): string {
  const out: number[] = [];
  const step = to >= from ? 1 : -1;
  for (let n = from; n !== to + step; n += step) out.push(n);
  return out.join(', ');
}

/** Capitalise the first letter of a sentence. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
