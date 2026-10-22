import { describe, expect, it } from 'vitest';
import type { Band } from '../types';
import { ANGLE_MAX, ANGLE_MIN, PLANETS, ROUNDS, V_MAX, V_MIN, flightPath, makeRounds, rangeOf, shoot, speed } from './physics';
import type { Round } from './physics';

const bands: Band[] = [0, 1, 2, 3];

/** Search the controls a child can actually set for any shot that lands in the basket. */
function findHit(round: Round) {
  const angles = round.freeAngle ? Array.from({ length: ANGLE_MAX - ANGLE_MIN + 1 }, (_, i) => ANGLE_MIN + i) : [45];
  for (const angle of angles)
    for (let p = 0; p <= 1; p += 0.002) {
      const s = shoot(round, p, angle);
      if (s.hit) return { p, angle };
    }
  return null;
}

describe('launch lab physics', () => {
  it('speed spans V_MIN..V_MAX and range follows v²·sin(2θ)/g', () => {
    expect(speed(0)).toBeCloseTo(V_MIN);
    expect(speed(1)).toBeCloseTo(V_MAX);
    expect(rangeOf(10, 45, 10)).toBeCloseTo(10);
    // 45° goes farther than 30° or 60°, which tie (complementary angles).
    expect(rangeOf(10, 45, 9.8)).toBeGreaterThan(rangeOf(10, 30, 9.8));
    expect(rangeOf(10, 30, 9.8)).toBeCloseTo(rangeOf(10, 60, 9.8));
    // Same launch goes about 6× farther on the Moon.
    expect(rangeOf(10, 45, PLANETS.moon.g) / rangeOf(10, 45, PLANETS.earth.g)).toBeCloseTo(9.8 / 1.6);
  });

  it('a clear shot lands at its range and the path ends on the ground', () => {
    const [round] = makeRounds(0);
    const s = shoot(round, 0.5, 45);
    const path = flightPath(s);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path.at(-1)!.x).toBeCloseTo(s.range);
    expect(path.at(-1)!.y).toBeCloseTo(0);
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThan(0);
  });

  it.each(bands)('band %i: every round is hittable and the known solution hits', (band) => {
    for (let run = 0; run < 25; run++) {
      const rounds = makeRounds(band);
      expect(rounds).toHaveLength(ROUNDS);
      for (const r of rounds) {
        expect(shoot(r, r.solution.power, r.solution.angle).hit, JSON.stringify(r)).toBe(true);
        expect(r.solution.power).toBeGreaterThanOrEqual(0);
        expect(r.solution.power).toBeLessThanOrEqual(1);
        expect(r.solution.angle).toBeGreaterThanOrEqual(ANGLE_MIN);
        expect(r.solution.angle).toBeLessThanOrEqual(ANGLE_MAX);
        expect(r.target + r.tol).toBeLessThan(r.width);
        expect(r.target - r.tol).toBeGreaterThan(r.width * 0.12);
        if (!r.freeAngle) expect(r.solution.angle).toBe(45);
        if (run < 3) expect(findHit(r), JSON.stringify(r)).not.toBeNull();
      }
    }
  });

  it('walls appear where they should and really get in the way', () => {
    for (let run = 0; run < 30; run++) {
      for (const r of makeRounds(0)) expect(r.wall).toBeNull();
      for (const r of makeRounds(3)) expect(r.wall).toBeNull();
      for (const r of makeRounds(1)) {
        expect(r.wall).not.toBeNull();
        expect(r.wall!.x).toBeLessThan(r.target - r.tol);
        // Some weaker shot that would otherwise travel past the wall gets stopped by it.
        const stopped = Array.from({ length: 101 }, (_, i) => shoot(r, i / 100, 45)).some((s) => s.blocked);
        expect(stopped).toBe(true);
      }
      expect(makeRounds(2).filter((r) => r.wall).length).toBe(ROUNDS / 2);
    }
  });

  it('band 3 visits Earth, the Moon and Mars with real gravity', () => {
    const rounds = makeRounds(3);
    expect(rounds.map((r) => r.planet)).toEqual(['earth', 'moon', 'mars', 'earth', 'moon', 'mars', 'earth', 'moon']);
    for (const r of rounds) expect(r.g).toBe(PLANETS[r.planet].g);
    expect(PLANETS.moon.g).toBeCloseTo(1.6);
    expect(PLANETS.mars.g).toBeCloseTo(3.7);
    expect(PLANETS.earth.g).toBeCloseTo(9.8);
  });

  it('a ball that hits the wall face drops to the ground at the wall', () => {
    const r = makeRounds(1)[0];
    const s = shoot(r, 0.15, 45);
    if (s.blocked && !s.onWall) {
      const end = flightPath(s).at(-1)!;
      expect(end.y).toBeCloseTo(0);
      expect(end.x).toBeCloseTo(r.wall!.x - r.wall!.t / 2);
    }
  });
});
