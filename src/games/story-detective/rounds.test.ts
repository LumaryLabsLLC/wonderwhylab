import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { PASSAGES, PICTURE_STORIES, makeRound } from './rounds';

describe('story detective content', () => {
  it('has picture stories at every level for band 0, each with one right thing to tap', () => {
    const ids = new Set<string>();
    for (const level of PICTURE_STORIES) {
      expect(level.length).toBeGreaterThanOrEqual(3);
      for (const story of level) {
        expect(ids.has(story.id)).toBe(false);
        ids.add(story.id);
        expect(story.frames).toHaveLength(3);
        for (const frame of story.frames) {
          expect(frame.caption.trim().length).toBeGreaterThan(0);
          expect(new Set(frame.scene).size).toBe(frame.scene.length);
        }
        const target = story.frames[story.question.frame].scene;
        expect(target.filter((e) => e === story.question.answer)).toHaveLength(1);
        expect(target.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it.each([1, 2, 3] as Band[])('band %i passages are valid', (band) => {
    const ids = new Set<string>();
    for (const level of PASSAGES[band]) {
      expect(level.length).toBeGreaterThanOrEqual(4);
      for (const passage of level) {
        expect(ids.has(passage.id)).toBe(false);
        ids.add(passage.id);
        expect(passage.sentences.length).toBeGreaterThanOrEqual(2);
        for (const question of passage.questions) {
          const where = `${passage.id}: ${question.ask}`;
          expect(question.evidence.length, where).toBeGreaterThan(0);
          for (const e of question.evidence) {
            expect(e, where).toBeGreaterThanOrEqual(0);
            expect(e, where).toBeLessThan(passage.sentences.length);
          }
          // The answer and its two decoys are all different.
          const choices = [question.answer, ...question.others];
          expect(question.others, where).toHaveLength(2);
          expect(new Set(choices.map((c) => c.toLowerCase())).size, where).toBe(3);
          expect(question.look.length, where).toBeGreaterThan(10);
          expect(question.because.length, where).toBeGreaterThan(10);
        }
      }
    }
  });

  it('builds rounds for every band and level', () => {
    for (const band of [0, 1, 2, 3] as Band[]) {
      for (const level of [0, 1, 2]) {
        for (let i = 0; i < 40; i++) {
          const round = makeRound(band, level, []);
          if (round.kind === 'pictures') {
            expect(band).toBe(0);
            expect([...round.order].sort()).toEqual([0, 1, 2]);
            expect(round.order).not.toEqual([0, 1, 2]);
          } else {
            expect(round.choices).toHaveLength(3);
            expect(round.choices.filter((c) => c === round.question.answer)).toHaveLength(1);
          }
        }
      }
    }
  });

  it('avoids recently played passages when it can', () => {
    const level = PASSAGES[2][0];
    const recent = level.slice(0, level.length - 1).map((p) => p.id);
    for (let i = 0; i < 20; i++) expect(makeRound(2, 0, recent).id).toBe(level[level.length - 1].id);
  });
});
