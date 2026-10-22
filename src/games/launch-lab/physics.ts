import type { Band } from '../types';

/**
 * Launch Lab physics: a ball launched from ground level flies in a parabola.
 *   x(t) = v·cosθ·t        y(t) = v·sinθ·t − ½·g·t²
 *   range on flat ground = v²·sin(2θ) / g   (so 45° goes farthest, and lower gravity goes farther)
 * Units are metres, seconds and m/s².
 */

export const ROUNDS = 8;
export const MAX_TRIES = 3;
export const V_MIN = 3;
export const V_MAX = 14;
export const ANGLE_MIN = 15;
export const ANGLE_MAX = 75;
/** Wall thickness as a share of the field width. */
const WALL_T = 0.025;

export type PlanetId = 'earth' | 'moon' | 'mars';

export const PLANETS: Record<PlanetId, { name: string; g: number }> = {
  earth: { name: 'Earth', g: 9.8 },
  moon: { name: 'the Moon', g: 1.6 },
  mars: { name: 'Mars', g: 3.7 },
};

export interface Wall {
  /** Centre of the wall (m from the launcher). */
  x: number;
  h: number;
  t: number;
}

export interface Round {
  planet: PlanetId;
  g: number;
  /** Ground shown on screen, in metres. */
  width: number;
  /** Centre of the basket (m). */
  target: number;
  /** Basket half-width (m): land within target ± tol to score. */
  tol: number;
  wall: Wall | null;
  freeAngle: boolean;
  /** One known way to hit it. */
  solution: { power: number; angle: number };
}

export interface Shot {
  v: number;
  angle: number;
  g: number;
  /** Where the ball would land on open ground. */
  range: number;
  blocked: boolean;
  /** Where the flight ends: the landing spot, or the wall it hit. */
  stop: { x: number; y: number };
  /** Ball came to rest on top of the wall. */
  onWall: boolean;
  hit: boolean;
  /** Seconds from launch until the ball is at rest on the ground (or wall). */
  time: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

/** Power 0..1 sets the launch energy, so speed² grows evenly with power. */
export const speed = (power: number) => Math.sqrt(V_MIN ** 2 + clamp01(power) * (V_MAX ** 2 - V_MIN ** 2));
export const powerFor = (v: number) => (v * v - V_MIN ** 2) / (V_MAX ** 2 - V_MIN ** 2);

export const fieldWidth = (g: number) => ((V_MAX * V_MAX) / g) * 1.05;
export const rangeOf = (v: number, angle: number, g: number) => (v * v * Math.sin(2 * rad(angle))) / g;
export const peakOf = (v: number, angle: number, g: number) => (v * Math.sin(rad(angle))) ** 2 / (2 * g);

export function heightAt(x: number, v: number, angle: number, g: number) {
  const a = rad(angle);
  const c = Math.cos(a);
  return x * Math.tan(a) - (g * x * x) / (2 * v * v * c * c);
}

/** Fire the ball and work out where it ends up. */
export function shoot(round: Round, power: number, angle: number): Shot {
  const v = speed(power);
  const g = round.g;
  const range = rangeOf(v, angle, g);
  let stop = { x: range, y: 0 };
  let blocked = false;
  let onWall = false;
  const w = round.wall;
  if (w) {
    // A parabola is lowest over the wall at one of its two edges.
    const x1 = w.x - w.t / 2;
    const x2 = w.x + w.t / 2;
    if (range > x1) {
      const y1 = heightAt(x1, v, angle, g);
      if (y1 < w.h) {
        blocked = true;
        stop = { x: x1, y: Math.max(0, y1) };
      } else if (heightAt(x2, v, angle, g) < w.h) {
        // Comes down on top of the wall: find where it drops to the wall's height.
        const a = rad(angle);
        const k = g / (2 * v * v * Math.cos(a) ** 2);
        const tan = Math.tan(a);
        const x = (tan + Math.sqrt(Math.max(0, tan * tan - 4 * k * w.h))) / (2 * k);
        blocked = true;
        onWall = true;
        stop = { x: Math.min(x2, Math.max(x1, x)), y: w.h };
      }
    }
  }
  const vx = v * Math.cos(rad(angle));
  const tStop = stop.x / vx;
  let time = tStop;
  if (blocked && !onWall) {
    // Bounces off the wall face and falls straight down.
    const vy = v * Math.sin(rad(angle)) - g * tStop;
    time = tStop + (vy + Math.sqrt(vy * vy + 2 * g * stop.y)) / g;
  }
  return { v, angle, g, range, blocked, stop, onWall, hit: !blocked && Math.abs(range - round.target) <= round.tol, time };
}

/** The ball's position t seconds after launch. */
export function positionAt(shot: Shot, t: number): { x: number; y: number } {
  const a = rad(shot.angle);
  const vx = shot.v * Math.cos(a);
  const vy = shot.v * Math.sin(a);
  const tStop = shot.stop.x / vx;
  if (t <= tStop) return { x: vx * t, y: Math.max(0, vy * t - 0.5 * shot.g * t * t) };
  if (shot.onWall || !shot.blocked) return shot.stop;
  const tau = t - tStop;
  const vyHit = vy - shot.g * tStop;
  return { x: shot.stop.x, y: Math.max(0, shot.stop.y + vyHit * tau - 0.5 * shot.g * tau * tau) };
}

/** Points along the whole flight, for drawing the dotted trail. */
export function flightPath(shot: Shot, n = 48) {
  return Array.from({ length: n + 1 }, (_, i) => positionAt(shot, (shot.time * i) / n));
}

type Rand = () => number;
const between = (r: Rand, lo: number, hi: number) => lo + r() * (hi - lo);

function speedFor(target: number, angle: number, g: number) {
  return Math.sqrt((target * g) / Math.sin(2 * rad(angle)));
}

function earthRound(): Pick<Round, 'planet' | 'g' | 'width'> {
  return { planet: 'earth', g: PLANETS.earth.g, width: fieldWidth(PLANETS.earth.g) };
}

const BAND3_PLANETS: PlanetId[] = ['earth', 'moon', 'mars', 'earth', 'moon', 'mars', 'earth', 'moon'];

function makeRound(band: Band, i: number, r: Rand, prev: number | null): Round | null {
  const base = band === 3 ? { planet: BAND3_PLANETS[i], g: PLANETS[BAND3_PLANETS[i]].g, width: fieldWidth(PLANETS[BAND3_PLANETS[i]].g) } : earthRound();
  const { g, width } = base;
  const tol = band === 0 ? 1.2 : band === 1 ? 0.9 : band === 2 ? 0.8 : 0.045 * width;
  let target: number;
  let angle = 45;
  let wall: Wall | null = null;

  if (band === 0) {
    target = i % 2 === 0 ? between(r, 5, 8) : between(r, 12, 16);
  } else if (band === 1) {
    target = between(r, 8, 17);
  } else if (band === 2) {
    target = between(r, 5, 18);
    const walled = i % 2 === 1;
    angle = walled ? between(r, 50, 66) : between(r, 30, 60);
  } else {
    target = between(r, 0.25, 0.9) * ((V_MAX * V_MAX) / g);
    angle = between(r, 34, 56);
  }
  if (band >= 2) angle = Math.round(angle);
  if (prev !== null && Math.abs(target - prev) < tol * 2.5) return null;
  const v = speedFor(target, angle, g);
  if (v < V_MIN || v > V_MAX) return null;

  if (band === 1 || (band === 2 && i % 2 === 1)) {
    const x = target * (band === 1 ? between(r, 0.35, 0.6) : between(r, 0.4, 0.72));
    const h = heightAt(x, v, angle, g) * (band === 1 ? between(r, 0.45, 0.7) : between(r, 0.55, 0.8));
    if (h < 1) return null;
    wall = { x, h, t: WALL_T * width };
  }

  const round: Round = { ...base, target, tol, wall, freeAngle: band >= 2, solution: { power: powerFor(v), angle } };
  if (!shoot(round, round.solution.power, angle).hit) return null;
  return round;
}

export function makeRounds(band: Band, r: Rand = Math.random): Round[] {
  const out: Round[] = [];
  for (let attempt = 0; out.length < ROUNDS && attempt < 5000; attempt++) {
    const round = makeRound(band, out.length, r, out.at(-1)?.target ?? null);
    if (round) out.push(round);
  }
  return out;
}

/** One short, true sentence for the end of each round. */
export function explain(band: Band, round: Round): string {
  if (band === 0) return 'More push = faster ball = flies farther.';
  if (band === 1) return 'Gravity pulls the ball down the whole way, so it flies in a curve.';
  if (band === 2)
    return round.wall ? 'A steeper angle lifts the ball over walls; on flat ground, 45° goes farthest.' : 'Angle matters too: on flat ground, 45° goes farthest.';
  if (round.planet === 'moon') return "The Moon's gravity is about 1/6 of Earth's, so the same throw goes about 6× farther.";
  if (round.planet === 'mars') return "Mars' gravity is about 3/8 of Earth's, so the same throw goes about 2.6× farther.";
  return 'Earth pulls hardest of these three, so throws land shortest here.';
}

/** A gentle tip after a miss. */
export function missTip(round: Round, shot: Shot): string {
  if (shot.blocked) return round.freeAngle ? 'Bonk! The wall stopped it. Aim higher or push harder.' : 'Bonk! The wall stopped it. Push harder to get over.';
  return shot.range < round.target ? 'Too short. Give it more power!' : 'Too far. Use a little less power!';
}

/** How far the same launch would go on Earth (band 3 compares planets). */
export function earthRange(shot: Shot) {
  return rangeOf(shot.v, shot.angle, PLANETS.earth.g);
}
