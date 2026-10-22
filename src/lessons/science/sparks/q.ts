import type { ReactNode } from 'react';
import type { Choice, Question } from '../../types';
import { pick, shuffle } from '../../../lib/random';

/** A multiple-choice question. Values double as the button text unless a picture `label` is given. */
export function mcq(o: {
  prompt: string;
  answer: string;
  wrong: string[];
  hint: string;
  explain: string[];
  visual?: ReactNode;
  labels?: Record<string, ReactNode>;
  names?: Record<string, string>;
  speak?: string;
}): Question {
  const values = shuffle([o.answer, ...o.wrong]);
  const choices: Choice[] = values.map((value) => ({ value, label: o.labels?.[value], name: o.names?.[value] }));
  return { prompt: o.prompt, speak: o.speak, visual: o.visual, choices, answer: o.answer, hint: o.hint, explain: o.explain };
}

/** Pick a question maker for the level: level 0 uses `easy`, 1 uses `medium`, 2 uses `hard`. */
export function byLevel(level: number, banks: [(() => Question)[], (() => Question)[], (() => Question)[]]): Question {
  return pick(banks[Math.max(0, Math.min(2, level))])();
}
