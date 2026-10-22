import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * A lesson is everything the screen needs for one topic:
 *  - Scene:        the big interactive toy in the middle of the screen
 *  - learn/steps/example/grownups: the four tabs in the info panel
 *  - makeQuestion: endless practice questions for "Try it yourself"
 */
export interface Lesson {
  /** Unique across the whole app, kebab-case, e.g. "count-to-10". */
  id: string;
  /** Short title for the lesson rail, e.g. "Count to 10". */
  title: string;
  /** Small illustration (draw inside viewBox 0 0 120 80) for the lesson rail card. */
  Thumb: ComponentType;
  /** The interactive scene, drawn in a 1000 x 680 world. */
  Scene: ComponentType;
  /** One-line hint shown in the stage toolbar, e.g. "Tap the tray to add apples". */
  sceneHint: string;
  learn: {
    heading: string;
    /** 1–3 short sentences, written for the child. */
    intro: string;
    points: KeyPoint[];
  };
  /** "How to" steps, written for the child. */
  steps: string[];
  example: {
    question: string;
    visual?: ReactNode;
    work: string[];
    answer: string;
  };
  /** Tips for parents and teachers. */
  grownups: string[];
  /**
   * Make a practice question. `level` grows 0 → 1 → 2 as the child gets answers right,
   * so start gentle and get a little harder.
   */
  makeQuestion: (level: number) => Question;
}

export interface KeyPoint {
  icon: LucideIcon;
  text: string;
}

export interface Question {
  /** Shown and read aloud. Keep it short: "How many apples?" */
  prompt: string;
  /** Optional different wording for read-aloud. Defaults to `prompt`. */
  speak?: string;
  /** Optional picture (an <svg> sized with viewBox; it is scaled to fit ~150px tall). */
  visual?: ReactNode;
  /**
   * Multiple choice answers (2–4). Values are compared to `answer`.
   * Omit to show a number pad instead (good for older kids).
   */
  choices?: Choice[];
  answer: string;
  /** A nudge shown after the first wrong try (don't give the answer away). */
  hint?: string;
  /**
   * Worked solution for THIS question, shown after a second wrong try: 2–4 short steps
   * using the question's own numbers, ending with the answer.
   * e.g. ["Start at 8.", "Count on 5 more: 9, 10, 11, 12, 13.", "8 + 5 = 13."]
   */
  explain?: string[];
  /** Number pad only: allow "." and "−" keys. */
  allowDecimal?: boolean;
  allowNegative?: boolean;
}

export interface Choice {
  value: string;
  /** Custom content for the button (a colour swatch, a shape…). Defaults to `value`. */
  label?: ReactNode;
  /** Accessible / spoken name when `label` is not plain text. */
  name?: string;
}

export type Subject = 'math' | 'reading' | 'science' | 'coding' | 'world' | 'life';

export interface Module {
  id: string;
  subject: Subject;
  /** Age band: 0 = ages 4–5, 1 = 6–7, 2 = 8–9, 3 = 10–12. */
  band: 0 | 1 | 2 | 3;
  title: string;
  ages: string;
  /** Accent colour for this age band. */
  color: string;
  icon: LucideIcon;
  blurb: string;
  lessons: Lesson[];
}

/** What the menus need to know about a lesson before its code has loaded. */
export interface LessonInfo {
  id: string;
  title: string;
}

/** A module as listed in the catalog (src/lessons/catalog.ts): everything but its lessons' code. */
export type ModuleInfo = Omit<Module, 'icon' | 'lessons'> & { lessons: LessonInfo[] };

/** Helper for plain-text choices. */
export const choices = (values: (string | number)[]): Choice[] => values.map((v) => ({ value: String(v) }));
