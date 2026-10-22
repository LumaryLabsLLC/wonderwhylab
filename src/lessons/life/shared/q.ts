import type { ReactNode } from 'react';
import type { Choice, Question } from '../../types';
import { shuffle } from '../../../lib/random';

/** Build a choice question with one right answer and some wrong ones (shuffled, unique). */
export function choiceQuestion(opts: {
  prompt: string;
  speak?: string;
  visual?: ReactNode;
  right: { value: string; label?: ReactNode; name?: string };
  wrong: { value: string; label?: ReactNode; name?: string }[];
  hint: string;
  explain: string[];
}): Question {
  const seen = new Set<string>([opts.right.value]);
  const wrong = opts.wrong.filter((w) => !seen.has(w.value) && seen.add(w.value));
  const choices: Choice[] = shuffle([opts.right, ...wrong]);
  return {
    prompt: opts.prompt,
    speak: opts.speak,
    visual: opts.visual,
    choices,
    answer: opts.right.value,
    hint: opts.hint,
    explain: opts.explain,
  };
}

/** Plain text choices. */
export const text = (value: string) => ({ value });
