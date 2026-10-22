import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Age band a game should pitch itself at.
 * 0 = ages 4–5, 1 = ages 6–7, 2 = ages 8–9, 3 = ages 10–12 (same order as the lesson modules).
 */
export type Band = 0 | 1 | 2 | 3;

export interface GameProps {
  band: Band;
  /**
   * Relaxed mode (the default): no countdown timer. Timed games should instead end after a set
   * number of targets/questions, so children can take their time.
   */
  relaxed: boolean;
  /**
   * Call once when the round is over with a whole-number score (higher is better).
   * The game shell then shows the result screen and saves the best score.
   */
  onFinish: (score: number) => void;
}

export interface Game {
  /** Unique kebab-case id, e.g. "bubble-pop". */
  id: string;
  /** Which shelf of the Games hub it sits on. Defaults to math. */
  subject?: 'math' | 'reading' | 'science';
  /** For science games: which science it practises (shown as a small label). */
  topic?: 'physics' | 'chemistry' | 'biology';
  title: string;
  /** One short sentence for the game card. */
  blurb: string;
  /** How to play, shown (and read aloud) on the start screen. Keep it to 1–2 short sentences. */
  howTo: string;
  /** When the activity changes with age, describe the controls and goal for that band. */
  howToByBand?: [string, string, string, string];
  /** Card colour. */
  color: string;
  icon: LucideIcon;
  /** Label for the score on the result screen, e.g. "bubbles popped". */
  scoreLabel: string;
  /** The gameplay. It fills the game area and is remounted for every new round. */
  Play: ComponentType<GameProps>;
}

/** A game as listed in the catalog (src/games/catalog.ts): everything but its gameplay code. */
export type GameInfo = Omit<Game, 'Play'>;
