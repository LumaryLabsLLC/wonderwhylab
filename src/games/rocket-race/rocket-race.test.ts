import { describe, expect, it } from 'vitest';
import { makeQuestion } from './index';
import { isCorrect, normalizeAnswer } from '../../lib/answers';
import type { Band } from '../types';

describe('rocket race questions', () => {
  it.each([0, 1, 2, 3] as Band[])('band %i always has 3 unique choices with one right answer', (band) => {
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion(band);
      const values = q.choices.map(normalizeAnswer);
      expect(q.choices.length, q.prompt).toBe(3);
      expect(new Set(values).size, `${q.prompt}: ${values}`).toBe(3);
      expect(q.choices.filter((c) => isCorrect(c, q.answer)).length, `${q.prompt}: ${values}`).toBe(1);
    }
  });
});
