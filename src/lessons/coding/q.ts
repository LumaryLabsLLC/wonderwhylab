import type { ReactNode } from 'react';
import type { Choice, Question } from '../types';
import { shuffle } from '../../lib/random';

/** A multiple-choice question; values double as button text unless a picture `label` is given. */
export function mcq(o: {
  prompt: string;
  speak?: string;
  answer: string;
  wrong: string[];
  hint: string;
  explain: string[];
  visual?: ReactNode;
  labels?: Record<string, ReactNode>;
  names?: Record<string, string>;
}): Question {
  const values = shuffle([o.answer, ...o.wrong]);
  const choices: Choice[] = values.map((value) => ({ value, label: o.labels?.[value], name: o.names?.[value] }));
  return { prompt: o.prompt, speak: o.speak, visual: o.visual, choices, answer: o.answer, hint: o.hint, explain: o.explain };
}

export const level3 = (level: number) => Math.max(0, Math.min(2, level));
