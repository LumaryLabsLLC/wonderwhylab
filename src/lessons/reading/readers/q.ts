import type { Choice } from '../../types';
import { shuffle } from '../../../lib/random';

/** Shuffled plain-text choices: the answer plus distinct distractors (case-insensitive), at most `count`. */
export function textChoices(answer: string, distractors: string[], count = 4): Choice[] {
  const seen = new Set([answer.toLowerCase()]);
  const others: string[] = [];
  for (const d of shuffle(distractors)) {
    const k = d.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    others.push(d);
    if (others.length >= count - 1) break;
  }
  return shuffle([answer, ...others]).map((value) => ({ value }));
}

/** Pick `n` distinct items. */
export function sample<T>(items: readonly T[], n: number): T[] {
  return shuffle(items).slice(0, n);
}

/** Level 0–2 → index into a list of per-level options. */
export const byLevel = <T,>(level: number, options: [T, T, T]): T => options[Math.max(0, Math.min(2, level))];
