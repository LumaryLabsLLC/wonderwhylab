import type { Question } from '../lessons/types';

export interface StoryPage {
  /** 1–3 short sentences for this page. */
  text: string;
  /** The page picture as a few emoji, e.g. '🐱🧶' (Unicode 12 or older). */
  picture: string;
}

/**
 * A short illustrated story for daily reading of connected text.
 * Ages 4–7 stories are decodable: words use only sounds taught in the reading lessons, plus a few heart words.
 */
export interface Story {
  /** Unique app-wide (lessons and stories share the stars map), kebab-case, e.g. "cat-and-hat". */
  id: string;
  /** Age band: 0 = 4–5, 1 = 6–7, 2 = 8–9, 3 = 10–12. */
  band: 0 | 1 | 2 | 3;
  title: string;
  /** Cover picture (emoji). */
  cover: string;
  /** One line for the bookshelf. */
  blurb: string;
  /** For decodable stories: the sounds it practises, e.g. "short a, sh". */
  focus?: string;
  /** Words worth teaching before reading (Tier 2 vocabulary for older readers). */
  words?: { word: string; meaning: string }[];
  pages: StoryPage[];
  /** 3–5 comprehension questions. Same contract as lesson questions: hint + 2–4 explain steps. */
  questions: Question[];
}
