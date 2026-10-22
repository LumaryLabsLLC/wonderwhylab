import type { Story } from './types';
import { earlyStories } from './early';
import { laterStories } from './later';

export const STORIES: Story[] = [...earlyStories, ...laterStories];

export function findStory(id: string | null | undefined): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

export function storiesFor(band: number): Story[] {
  return STORIES.filter((s) => s.band === band);
}
