import { describe, expect, it } from 'vitest';
import { beeLand, makeRounds, pollinated, ROUNDS, STAGES } from './rounds';
import type { Band } from '../types';

describe('Garden Lab rounds', () => {
  for (const band of [0, 1, 2, 3] as Band[]) {
    it(`band ${band}: every piece has exactly one right target`, () => {
      for (let i = 0; i < 300; i++) {
        const rounds = makeRounds(band);
        expect(rounds).toHaveLength(ROUNDS);
        for (const round of rounds) {
          expect(round.goal.length).toBeGreaterThan(5);
          if (round.mode === 'pollinate') continue;
          const ids = round.pieces.map((p) => p.id);
          expect(new Set(ids).size).toBe(ids.length);
          const targetIds = round.targets.map((t) => t.id);
          expect(new Set(targetIds).size).toBe(targetIds.length);
          for (const p of round.pieces) {
            expect(targetIds.filter((t) => t === p.target)).toHaveLength(1);
            expect(p.fact.length).toBeGreaterThan(10);
          }
        }
      }
    });
  }

  it('band 0: each tool goes to the one plant that needs it', () => {
    for (const round of makeRounds(0)) {
      if (round.mode !== 'needs') throw new Error('wrong mode');
      for (const p of round.pieces) {
        expect(round.plants.filter((pl) => pl.need === p.id)).toHaveLength(1);
        expect(round.plants.find((pl) => pl.id === p.target)?.need).toBe(p.id);
      }
    }
  });

  it('band 1: missing stages go to their own slot, and the rest are shown', () => {
    const missing = makeRounds(1).map((round) => {
      if (round.mode !== 'cycle') throw new Error('wrong mode');
      for (const p of round.pieces) expect(p.target).toBe(`slot-${STAGES.findIndex((s) => s.id === p.id)}`);
      expect(round.given.length + round.pieces.length).toBe(5);
      return round.pieces.length;
    });
    expect(missing).toEqual([2, 2, 3, 3, 5, 5]);
  });

  it('band 2: pollination rounds have two kinds, two flowers each', () => {
    const rounds = makeRounds(2);
    expect(rounds.map((r) => r.mode)).toEqual(['pollinate', 'parts', 'pollinate', 'parts', 'pollinate', 'parts']);
    for (const round of rounds) {
      if (round.mode !== 'pollinate') continue;
      expect(round.flowers).toHaveLength(4);
      for (const k of round.kinds) expect(round.flowers.filter((f) => f.kind === k.id)).toHaveLength(2);
    }
  });

  it('band 2: pollen only works on another flower of the same kind', () => {
    const flowers = [
      { id: 'a', kind: 'daisy' },
      { id: 'b', kind: 'poppy' },
      { id: 'c', kind: 'daisy' },
      { id: 'd', kind: 'poppy' },
    ];
    let s = { from: null as string | null, fruit: [] as string[] };
    let step = beeLand(flowers, s, 'a');
    expect(step.result).toBe('pickup');
    s = step.state;
    expect(beeLand(flowers, s, 'a').result).toBe('same');
    expect(beeLand(flowers, s, 'b').result).toBe('wrong');
    step = beeLand(flowers, s, 'c');
    expect(step.result).toBe('fruit');
    s = step.state;
    expect(pollinated(flowers, s.fruit)).toBe(false);
    expect(beeLand(flowers, s, 'c').result).toBe('done');
    s = beeLand(flowers, s, 'd').state;
    step = beeLand(flowers, s, 'b');
    expect(step.result).toBe('fruit');
    expect(pollinated(flowers, step.state.fruit)).toBe(true);
  });

  it('band 3: inputs, then outputs, then everything, each with a distractor', () => {
    const rounds = makeRounds(3);
    const sets = rounds.map((round) => {
      if (round.mode !== 'photo') throw new Error('wrong mode');
      expect(round.pieces.filter((p) => p.target === 'not')).toHaveLength(1);
      for (const p of round.pieces) expect(p.why?.length).toBeGreaterThan(10);
      return round.pieces.map((p) => p.target).sort().join(',');
    });
    expect(sets[0]).toBe('in,in,in,not');
    expect(sets[2]).toBe('in,not,out,out');
    expect(sets[4]).toBe('in,in,in,not,out,out');
  });
});
