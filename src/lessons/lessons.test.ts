import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, MODULES } from './all';
import { isCorrect, normalizeAnswer } from '../lib/answers';

describe('lesson registry', () => {
  it('has unique lesson ids', () => {
    const ids = ALL_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has complete content for every lesson', () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.title, lesson.id).toBeTruthy();
      expect(lesson.sceneHint, lesson.id).toBeTruthy();
      expect(lesson.learn.intro, lesson.id).toBeTruthy();
      expect(lesson.learn.points.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.example.work.length, lesson.id).toBeGreaterThanOrEqual(1);
      expect(lesson.grownups.length, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('every module has lessons', () => {
    for (const m of MODULES) expect(m.lessons.length, m.id).toBeGreaterThan(0);
  });
});

describe.each(ALL_LESSONS.map((l) => [l.id, l] as const))('%s questions', (_id, lesson) => {
  it.each([0, 1, 2])('level %i always makes a valid question', (level) => {
    for (let i = 0; i < 300; i++) {
      const q = lesson.makeQuestion(level);
      const where = `${lesson.id} L${level}: ${q.prompt} (answer ${q.answer})`;
      expect(q.prompt, where).toBeTruthy();
      expect(q.answer, where).not.toBe('');
      if (q.choices) {
        expect(q.choices.length, where).toBeGreaterThanOrEqual(2);
        expect(q.choices.length, where).toBeLessThanOrEqual(4);
        const values = q.choices.map((c) => normalizeAnswer(c.value));
        expect(new Set(values).size, `${where} has duplicate choices: ${values.join(', ')}`).toBe(values.length);
        expect(q.choices.filter((c) => isCorrect(c.value, q.answer)).length, `${where} choices: ${values.join(', ')}`).toBe(1);
      } else {
        const n = Number(normalizeAnswer(q.answer));
        expect(Number.isFinite(n), `${where} number-pad answer must be numeric`).toBe(true);
        if (n < 0) expect(q.allowNegative, `${where} needs allowNegative`).toBe(true);
        if (!Number.isInteger(n)) expect(q.allowDecimal, `${where} needs allowDecimal`).toBe(true);
      }
    }
  });
});

// Elaborated feedback: every question needs a strategy hint and a worked solution
// (2–4 steps using its own numbers) that ends up at the answer.
describe.each(ALL_LESSONS.map((l) => [l.id, l] as const))('%s hints and worked solutions', (_id, lesson) => {
  const norm = (s: string) => s.replace(/−/g, '-').toLowerCase();
  it('gives every question a hint and 2–4 explain steps naming the answer', () => {
    const failures: string[] = [];
    for (const level of [0, 1, 2]) {
      for (let i = 0; i < 200; i++) {
        const q = lesson.makeQuestion(level);
        const where = `${lesson.id} L${level} "${q.prompt}" → ${q.answer}`;
        const steps = q.explain ?? [];
        const answerName = q.choices?.find((c) => isCorrect(c.value, q.answer))?.name;
        const text = norm(steps.join(' '));
        if (!q.hint?.trim()) failures.push(`${where}: no hint`);
        if (steps.length < 2 || steps.length > 4) failures.push(`${where}: ${steps.length} explain steps`);
        if (steps.some((s) => !s.trim())) failures.push(`${where}: empty step`);
        if (!text.includes(norm(q.answer)) && !(answerName && text.includes(norm(answerName)))) failures.push(`${where}: answer missing from ${JSON.stringify(steps)}`);
        if (/\bNaN\b|undefined|\d\.\d{5,}/.test(steps.join(' ') + q.hint)) failures.push(`${where}: bad number`);
      }
    }
    expect([...new Set(failures)].slice(0, 8)).toEqual([]);
  });
});
