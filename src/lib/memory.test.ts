import { describe, expect, it } from 'vitest';
import { completeLesson, interleave, isDue, masteryOf, nextLevel, recordAnswer, reviewResult } from './memory';

const DAY = 24 * 60 * 60 * 1000;
const t0 = Date.UTC(2026, 0, 1);

describe('spaced repetition', () => {
  it('schedules the first review a day after completing a lesson', () => {
    const s = completeLesson(undefined, t0);
    expect(s.box).toBe(1);
    expect(s.due).toBe(t0 + DAY);
    expect(isDue(s, t0)).toBe(false);
    expect(isDue(s, t0 + DAY)).toBe(true);
  });

  it('waits longer after each successful review and reaches mastery', () => {
    let s = completeLesson(undefined, t0);
    s = recordAnswer(s, true, 1, t0);
    s = reviewResult(s, true, t0 + DAY);
    expect(s.box).toBe(2);
    expect(s.due).toBe(t0 + DAY + 3 * DAY);
    s = reviewResult(s, true, t0 + 4 * DAY);
    expect(s.box).toBe(3);
    expect(masteryOf(s)).toBe('mastered');
  });

  it('brings a skill back sooner after a slip, but never below box 1', () => {
    let s = completeLesson(undefined, t0);
    s = reviewResult(s, true, t0);
    s = reviewResult(s, false, t0);
    expect(s.box).toBe(1);
    s = reviewResult(s, false, t0);
    expect(s.box).toBe(1);
  });

  it('does not reset an existing schedule when a lesson is replayed', () => {
    let s = completeLesson(undefined, t0);
    s = reviewResult(s, true, t0);
    const again = completeLesson(s, t0 + DAY);
    expect(again.box).toBe(s.box);
    expect(again.due).toBe(s.due);
  });

  it('reports mastery stages', () => {
    expect(masteryOf(undefined)).toBe('new');
    expect(masteryOf(recordAnswer(undefined, false, 0, t0))).toBe('learning');
    expect(masteryOf(completeLesson(recordAnswer(undefined, true, 0, t0), t0))).toBe('practising');
  });
});

describe('adaptive difficulty', () => {
  it('goes up after three first-try answers and down after a slip', () => {
    let st = { level: 0, streak: 0 };
    st = nextLevel(st.level, st.streak, true);
    st = nextLevel(st.level, st.streak, true);
    expect(st.level).toBe(0);
    st = nextLevel(st.level, st.streak, true);
    expect(st.level).toBe(1);
    st = nextLevel(st.level, st.streak, false);
    expect(st).toEqual({ level: 0, streak: 0 });
  });

  it('stays within levels 0–2', () => {
    expect(nextLevel(0, 0, false).level).toBe(0);
    expect(nextLevel(2, 2, true).level).toBe(2);
  });
});

describe('interleaving', () => {
  it('includes every lesson the right number of times', () => {
    const order = interleave(['a', 'b', 'c'], 2);
    expect(order).toHaveLength(6);
    for (const id of ['a', 'b', 'c']) expect(order.filter((x) => x === id)).toHaveLength(2);
  });

  it('never repeats a lesson back to back', () => {
    for (let i = 0; i < 500; i++) {
      const order = interleave(['a', 'b', 'c', 'd'], 3);
      for (let k = 1; k < order.length; k++) expect(order[k]).not.toBe(order[k - 1]);
    }
  });
});
