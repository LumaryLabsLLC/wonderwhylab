import type { Choice } from '../../lessons/types';

/** A word or sentence choice for story questions (always shown as text, so it must be read). */
export const say = (value: string): Choice => ({ value, name: value });
