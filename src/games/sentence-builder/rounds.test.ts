import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { BANK, canPlace, makeRound, nextStep, nudge, tokens, toRound } from './rounds';

const sorted = (list: string[]) => [...list].sort();

describe('sentence builder rounds', () => {
  const all = BANK.flatMap((levels, band) => levels.flatMap((specs, level) => specs.map((spec) => ({ spec, band: band as Band, level }))));

  it('has unique round ids and enough rounds at every level', () => {
    const ids = all.map((r) => r.spec.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const levels of BANK) for (const specs of levels) expect(specs.length).toBeGreaterThanOrEqual(4);
  });

  it.each(all.map((r) => [r.spec.id, r] as const))('%s is solvable and unambiguous', (_id, { spec, band, level }) => {
    const round = toRound(spec, band, level);
    const answers = spec.answers.map(tokens);
    // Every accepted answer uses exactly the same cards (minus the distractors).
    for (const a of answers) {
      expect(a.length).toBe(answers[0].length);
      expect(sorted(a)).toEqual(sorted(answers[0]));
    }
    // Distractors never belong anywhere.
    for (const d of spec.distractors) for (const a of answers) expect(a).not.toContain(d);
    expect(round.cards.map((c) => c.text).sort()).toEqual(sorted([...answers[0], ...spec.distractors]));

    // Walk the first answer, always placing the "show me" word: it must succeed,
    // and at every step no distractor may fit any empty slot.
    const placed: (string | null)[] = answers[0].map(() => null);
    for (let step = 0; step < answers[0].length; step++) {
      for (const d of spec.distractors) {
        for (let slot = 0; slot < placed.length; slot++) expect(canPlace(round, placed, slot, d)).toBe(false);
      }
      const next = nextStep(round, placed)!;
      expect(next).not.toBeNull();
      expect(canPlace(round, placed, next.slot, next.text)).toBe(true);
      placed[next.slot] = next.text;
    }
    expect(nextStep(round, placed)).toBeNull();
    expect(round.answers.map((a) => a.join(' '))).toContain(placed.join(' '));
  });

  it('accepts either order of a pair of nouns', () => {
    const spec = BANK[1][2].find((s) => s.id === 's1-hen')!;
    const round = toRound(spec, 1, 2);
    const placed: (string | null)[] = tokens(spec.answers[0]).map(() => null);
    placed[0] = 'The';
    expect(canPlace(round, placed, 1, 'hen')).toBe(true);
    expect(canPlace(round, placed, 1, 'pig')).toBe(true);
  });

  it('makes rounds for every band and level, and gives a nudge for any card', () => {
    for (const band of [0, 1, 2, 3] as Band[]) {
      for (const level of [0, 1, 2]) {
        for (let i = 0; i < 30; i++) {
          const round = makeRound(band, level);
          expect(round.cards.length).toBeGreaterThan(round.answers[0].length - 1);
          for (const c of round.cards) expect(nudge(round, c.text).length).toBeGreaterThan(10);
        }
      }
    }
  });
});
