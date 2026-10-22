import type { Choice } from '../../lessons/types';

/** A word choice, optionally shown with a picture next to the word (the word is always there to read). */
export const word = (value: string, emoji?: string): Choice => ({
  value,
  label: emoji ? `${emoji} ${value}` : undefined,
  name: value,
});
