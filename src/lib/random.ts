/** Small helpers for building random questions. All ranges are inclusive. */

export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build a shuffled list of numeric choices that always contains `answer`,
 * filled with nearby distractors that stay inside [min, max].
 */
export function numberChoices(
  answer: number,
  opts: { count?: number; min?: number; max?: number; spread?: number; step?: number } = {},
): string[] {
  const { count = 4, min = 0, max = Number.MAX_SAFE_INTEGER, spread = 3, step = 1 } = opts;
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard++ < 200) {
    const offset = rand(1, spread) * step * (Math.random() < 0.5 ? -1 : 1);
    const value = round(answer + offset);
    if (value >= min && value <= max) set.add(value);
  }
  // Fallback for tiny ranges: walk outward until we have enough.
  let k = 1;
  while (set.size < count && k < 1000) {
    if (answer + k * step <= max) set.add(round(answer + k * step));
    if (set.size < count && answer - k * step >= min) set.add(round(answer - k * step));
    k++;
  }
  return shuffle([...set]).map(String);
}

/** Avoid floating point noise like 0.30000000000000004. */
export function round(n: number, places = 6): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
