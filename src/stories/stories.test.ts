import { describe, expect, it } from 'vitest';
import { STORIES } from './index';
import { ALL_LESSONS } from '../lessons';
import { isCorrect, normalizeAnswer } from '../lib/answers';

describe('story library', () => {
  it('has unique ids that never clash with lesson ids', () => {
    const ids = STORIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const lessonIds = new Set(ALL_LESSONS.map((l) => l.id));
    for (const id of ids) expect(lessonIds.has(id), id).toBe(false);
  });
});

describe.each(STORIES.map((s) => [s.id, s] as const))('%s', (_id, story) => {
  it('has pages with text and a picture', () => {
    expect(story.pages.length).toBeGreaterThanOrEqual(3);
    for (const p of story.pages) {
      expect(p.text.trim().length).toBeGreaterThan(0);
      expect(p.picture.trim().length).toBeGreaterThan(0);
    }
  });

  it('has 3–5 well-formed questions with hints and worked answers', () => {
    expect(story.questions.length).toBeGreaterThanOrEqual(3);
    expect(story.questions.length).toBeLessThanOrEqual(5);
    for (const q of story.questions) {
      const where = `${story.id}: ${q.prompt}`;
      expect(q.hint?.trim(), where).toBeTruthy();
      expect((q.explain ?? []).length, where).toBeGreaterThanOrEqual(2);
      expect((q.explain ?? []).length, where).toBeLessThanOrEqual(4);
      if (q.choices) {
        const values = q.choices.map((c) => normalizeAnswer(c.value));
        expect(new Set(values).size, where).toBe(values.length);
        expect(q.choices.filter((c) => isCorrect(c.value, q.answer)).length, where).toBe(1);
      }
    }
  });
});
