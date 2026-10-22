import type { Band } from '../types';

/**
 * Shape Builder geometry.
 *
 * Every piece edge is horizontal, vertical or at 45°, with corners on whole grid points. So any
 * shape can be described exactly as a set of "quarters": each unit grid square is cut by its two
 * diagonals into four triangles (top, right, bottom, left). A puzzle is solved when the pieces
 * cover the silhouette's quarters exactly once each.
 */

export type Pt = [number, number];

export type PieceType = 'triS' | 'triM' | 'triL' | 'dia' | 'par' | 'sq2' | `r${number}x${number}`;

export const PIECE_NAMES: Record<string, string> = {
  triS: 'small triangle',
  triM: 'middle triangle',
  triL: 'big triangle',
  dia: 'square',
  par: 'parallelogram',
  sq2: 'square',
};

export function pieceName(type: string): string {
  if (type.startsWith('r')) {
    const [w, h] = type.slice(1).split('x');
    return `${w} × ${h} rectangle`;
  }
  return PIECE_NAMES[type] ?? 'piece';
}

/** Outline of each piece at rotation 0. */
export function baseVerts(type: string): Pt[] {
  switch (type) {
    case 'triS':
      return [[0, 0], [2, 0], [1, 1]];
    case 'triM':
      return [[0, 0], [2, 0], [0, 2]];
    case 'triL':
      return [[0, 0], [4, 0], [2, 2]];
    case 'dia':
      return [[1, 0], [2, 1], [1, 2], [0, 1]];
    case 'par':
      return [[0, 0], [2, 0], [3, 1], [1, 1]];
    case 'sq2':
      return [[0, 0], [2, 0], [2, 2], [0, 2]];
  }
  const m = /^r(\d+)x(\d+)$/.exec(type);
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[2]);
    return [[0, 0], [w, 0], [w, h], [0, h]];
  }
  throw new Error(`Unknown piece ${type}`);
}

/** Shift so the smallest x and y are 0. */
export function normalize(pts: Pt[]): Pt[] {
  const mx = Math.min(...pts.map((p) => p[0]));
  const my = Math.min(...pts.map((p) => p[1]));
  return pts.map(([x, y]) => [x - mx, y - my]);
}

/** Outline rotated `rot` quarter turns clockwise (screen y points down), normalised to the origin. */
export function verts(type: string, rot: number): Pt[] {
  let pts = baseVerts(type);
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) pts = pts.map(([x, y]) => [-y, x]);
  return normalize(pts);
}

export function size(pts: Pt[]): { w: number; h: number } {
  return { w: Math.max(...pts.map((p) => p[0])), h: Math.max(...pts.map((p) => p[1])) };
}

function inside(px: number, py: number, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Centre point of each quarter of the unit square at (cx, cy): top, right, bottom, left. */
const QUARTER_CENTRES: Pt[] = [
  [0.5, 1 / 6],
  [5 / 6, 0.5],
  [0.5, 5 / 6],
  [1 / 6, 0.5],
];

export const qkey = (cx: number, cy: number, q: number) => `${cx},${cy},${q}`;

export function parseQ(key: string): [number, number, number] {
  const [a, b, c] = key.split(',').map(Number);
  return [a, b, c];
}

/** Quarters covered by a polygon given in absolute grid coordinates. */
export function polyQuarters(poly: Pt[]): string[] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const out: string[] = [];
  for (let cy = Math.min(...ys); cy < Math.max(...ys); cy++) {
    for (let cx = Math.min(...xs); cx < Math.max(...xs); cx++) {
      QUARTER_CENTRES.forEach(([dx, dy], q) => {
        if (inside(cx + dx, cy + dy, poly)) out.push(qkey(cx, cy, q));
      });
    }
  }
  return out;
}

const quarterCache = new Map<string, Pt[]>();

/** Quarters of a piece at a rotation, relative to its top-left corner (as [cx*4+q index pairs]). */
function relQuarters(type: string, rot: number): Pt[] {
  const k = `${type}:${rot}`;
  let hit = quarterCache.get(k);
  if (!hit) {
    hit = polyQuarters(verts(type, rot)).map((key) => {
      const [cx, cy, q] = parseQ(key);
      return [cx * 4 + q, cy];
    });
    quarterCache.set(k, hit);
  }
  return hit;
}

export function pieceQuarters(type: string, rot: number, x: number, y: number): string[] {
  return relQuarters(type, rot).map(([cq, cy]) => qkey(Math.floor(cq / 4) + x, cy + y, cq % 4));
}

/** Area in square units (4 quarters = 1 unit square). */
export const areaOf = (type: string) => relQuarters(type, 0).length / 4;

/** Rotations that give different shapes (a square looks the same every way round). */
export function distinctRotations(type: string): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  for (let r = 0; r < 4; r++) {
    const k = relQuarters(type, r)
      .map((p) => p.join(':'))
      .sort()
      .join('|');
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

export interface Placement {
  type: string;
  rot: number;
  x: number;
  y: number;
}

/** Identify which piece and rotation a polygon is (for writing puzzles as drawings). */
export function identify(poly: Pt[], types: string[]): Placement {
  const norm = normalize(poly);
  const key = (pts: Pt[]) => pts.map((p) => p.join(',')).sort().join(' ');
  const mx = Math.min(...poly.map((p) => p[0]));
  const my = Math.min(...poly.map((p) => p[1]));
  for (const type of types) {
    for (let rot = 0; rot < 4; rot++) {
      if (key(verts(type, rot)) === key(norm)) return { type, rot, x: mx, y: my };
    }
  }
  throw new Error(`Polygon ${JSON.stringify(poly)} is not a known piece`);
}

/**
 * Find a way to cover `target` exactly with the given pieces (each used once).
 * `fixed` pieces are kept where they are. Returns placements for the remaining pieces, or null.
 */
export function solve(target: Set<string>, pieces: string[], fixed: Placement[] = []): Placement[] | null {
  const covered = new Set<string>();
  for (const f of fixed) {
    for (const q of pieceQuarters(f.type, f.rot, f.x, f.y)) {
      if (!target.has(q) || covered.has(q)) return null;
      covered.add(q);
    }
  }
  const order = [...target].sort((a, b) => {
    const [ax, ay, aq] = parseQ(a);
    const [bx, by, bq] = parseQ(b);
    return ay - by || ax - bx || aq - bq;
  });
  const left = [...pieces].sort((a, b) => areaOf(b) - areaOf(a));
  const out: Placement[] = [];
  let steps = 0;

  const step = (): boolean => {
    if (++steps > 200000) return false;
    const next = order.find((q) => !covered.has(q));
    if (!next) return left.length === 0;
    if (left.length === 0) return false;
    const [nx, ny, nq] = parseQ(next);
    const tried = new Set<string>();
    for (let i = 0; i < left.length; i++) {
      const type = left[i];
      if (tried.has(type)) continue;
      tried.add(type);
      for (const rot of distinctRotations(type)) {
        for (const [cq, cy] of relQuarters(type, rot)) {
          if (cq % 4 !== nq) continue;
          const x = nx - Math.floor(cq / 4);
          const y = ny - cy;
          const qs = pieceQuarters(type, rot, x, y);
          if (!qs.every((q) => target.has(q) && !covered.has(q))) continue;
          qs.forEach((q) => covered.add(q));
          left.splice(i, 1);
          out.push({ type, rot, x, y });
          if (step()) return true;
          out.pop();
          left.splice(i, 0, type);
          qs.forEach((q) => covered.delete(q));
        }
      }
    }
    return false;
  };
  return step() ? out : null;
}

// ─────────────────────────── Puzzles ───────────────────────────

export interface Puzzle {
  name: string;
  /** What the child is building, for the goal line. */
  goal: string;
  /** Shown once the shape is built. */
  reveal: string;
  /** The shape, as the pieces that make it (absolute grid coordinates). */
  drawing: Pt[][];
  /** Band 3: draw a unit grid on the shape and show the area sum. */
  grid?: boolean;
}

/** Shorthand: place piece `type` at rotation `rot` with its top-left at (x, y). */
const P = (type: string, rot: number, x: number, y: number): Pt[] => verts(type, rot).map(([a, b]) => [a + x, b + y]);
const R = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

const TANGRAM = ['triL', 'triL', 'triM', 'triS', 'triS', 'dia', 'par'];

/**
 * Orientation key (screen y points down):
 *   triS: 0 ▽  1 ◁  2 △  3 ▷        triL: same as triS, twice as big
 *   triM (right angle at): 0 top-left  1 top-right  2 bottom-right  3 bottom-left
 */

/** Ages 4–5: two or three big pieces, obvious pictures. Tiers get slightly harder. */
const BAND0: Puzzle[][] = [
  [
    { name: 'fish', goal: 'Make the fish!', reveal: 'A square on its corner and a triangle make a fish.', drawing: [P('dia', 0, 0, 0), P('triS', 1, 2, 0)] },
    { name: 'house', goal: 'Make the house!', reveal: 'A triangle on top of a square makes a house.', drawing: [P('triS', 2, 0, 0), P('sq2', 0, 0, 1)] },
    { name: 'boat', goal: 'Make the boat!', reveal: 'Two triangles make a boat with a sail.', drawing: [P('triM', 3, 1, 0), P('triL', 0, 0, 2)] },
    { name: 'arrow', goal: 'Make the arrow!', reveal: 'A big triangle and a square make an arrow.', drawing: [P('triL', 2, 0, 0), P('sq2', 0, 1, 2)] },
  ],
  [
    { name: 'rocket', goal: 'Make the rocket!', reveal: 'Two triangles and a square make a rocket.', drawing: [P('triS', 2, 0, 0), P('sq2', 0, 0, 1), P('triS', 0, 0, 3)] },
    { name: 'tree', goal: 'Make the tree!', reveal: 'Two triangles and a square make a tree.', drawing: [P('triS', 2, 1, 0), P('triL', 2, 0, 1), P('sq2', 0, 1, 3)] },
    { name: 'ice cream', goal: 'Make the ice cream!', reveal: 'A square on top of a triangle makes an ice cream.', drawing: [P('sq2', 0, 1, 0), P('triL', 0, 0, 2)] },
    { name: 'bow tie', goal: 'Make the bow tie!', reveal: 'Two triangles point to the middle to make a bow tie.', drawing: [P('triS', 3, 0, 0), P('triS', 1, 1, 0)] },
  ],
  [
    { name: 'house', goal: 'Make the house!', reveal: 'Three shapes fit together to make a house.', drawing: [P('triL', 2, 0, 0), P('sq2', 0, 0, 2), P('sq2', 0, 2, 2)] },
    { name: 'sailboat', goal: 'Make the sailboat!', reveal: 'A flag, a sail and a hull make a sailboat.', drawing: [P('triS', 3, 1, 0), P('triM', 3, 1, 2), P('triL', 0, 0, 4)] },
    { name: 'fish', goal: 'Make the big fish!', reveal: 'Two triangles make the body, one makes the tail.', drawing: [P('triS', 1, 0, 0), P('triS', 3, 1, 0), P('triS', 1, 2, 0)] },
    { name: 'ice cream', goal: 'Make the ice cream with a cherry!', reveal: 'Three shapes stack up into an ice cream.', drawing: [P('triS', 2, 1, 0), P('sq2', 0, 1, 1), P('triL', 0, 0, 3)] },
  ],
];

/** Ages 6–7: four or five tangram pieces. */
const BAND1: Puzzle[][] = [
  [
    { name: 'house', goal: 'Build the house.', reveal: 'Four middle triangles make the walls, a big triangle makes the roof.', drawing: [P('triL', 2, 0, 0), P('triM', 0, 0, 2), P('triM', 2, 0, 2), P('triM', 0, 2, 2), P('triM', 2, 2, 2)] },
    { name: 'rocket', goal: 'Build the rocket.', reveal: 'Two middle triangles make the body; small ones make the nose and fins.', drawing: [P('triS', 2, 1, 0), P('triM', 0, 1, 1), P('triM', 2, 1, 1), P('triS', 1, 0, 1), P('triS', 3, 3, 1)] },
  ],
  [
    { name: 'tree', goal: 'Build the tree.', reveal: 'Triangles stack up into a tree.', drawing: [P('triS', 2, 1, 0), P('triL', 2, 0, 1), P('triM', 0, 1, 3), P('triM', 2, 1, 3)] },
    { name: 'candle', goal: 'Build the candle.', reveal: 'A tall shape can be made from triangles.', drawing: [P('dia', 0, 0, 0), P('triM', 0, 0, 2), P('triM', 2, 0, 2), P('triM', 0, 0, 4), P('triM', 2, 0, 4)] },
  ],
  [
    { name: 'heart', goal: 'Build the heart.', reveal: 'Two squares and two small triangles make a heart.', drawing: [P('dia', 0, 0, 0), P('dia', 0, 2, 0), P('triS', 1, 1, 1), P('triS', 3, 2, 1)] },
    { name: 'big fish', goal: 'Build the big fish.', reveal: 'Two big triangles make the body, two middle ones make the tail.', drawing: [P('triL', 1, 0, 0), P('triL', 3, 2, 0), P('triM', 2, 4, 0), P('triM', 1, 4, 2)] },
  ],
];

/** Ages 8–9: "how many make…?" moments, then more pieces, then all seven. */
const BAND2: Puzzle[][] = [
  [
    { name: 'square', goal: 'How many small triangles make the square? Build it!', reveal: '2 small triangles make 1 square.', drawing: [P('triS', 2, 0, 0), P('triS', 0, 0, 1)] },
    { name: 'middle triangle', goal: 'How many small triangles make the middle triangle?', reveal: '2 small triangles make 1 middle triangle.', drawing: [P('triS', 0, 0, 0), P('triS', 3, 0, 0)] },
    { name: 'big triangle', goal: 'How many middle triangles make the big triangle?', reveal: '2 middle triangles make 1 big triangle.', drawing: [P('triM', 1, 0, 0), P('triM', 0, 2, 0)] },
    { name: 'parallelogram', goal: 'How many small triangles make the parallelogram?', reveal: '2 small triangles make 1 parallelogram.', drawing: [P('triS', 0, 0, 0), P('triS', 2, 1, 0)] },
  ],
  [
    { name: 'rectangle', goal: 'Fill the rectangle with 5 pieces.', reveal: 'Four small triangles and a big one fill the rectangle.', drawing: [P('triL', 0, 0, 0), P('triS', 3, 0, 0), P('triS', 2, 0, 1), P('triS', 1, 3, 0), P('triS', 2, 2, 1)] },
    { name: 'giant triangle', goal: 'Make one giant triangle from 5 pieces.', reveal: 'Small shapes can join into one giant shape.', drawing: [P('triL', 0, 0, 0), P('triL', 0, 4, 0), P('triL', 2, 2, 0), P('triM', 1, 2, 2), P('triM', 0, 4, 2)] },
  ],
  [
    { name: 'tangram square', goal: 'Use all 7 pieces to make the square.', reveal: 'All 7 tangram pieces fit together into one square.', drawing: [] },
    { name: 'tangram triangle', goal: 'Use all 7 pieces to make the big triangle.', reveal: 'The same 7 pieces can also make a triangle.', drawing: [] },
  ],
];

/** Ages 10–12: fill composite shapes on a grid, then add up the areas. */
const BAND3: Puzzle[][] = [
  [
    { name: 'L-shape', goal: 'Fill the L-shape.', reveal: '', grid: true, drawing: [R(0, 0, 2, 4), R(2, 2, 3, 2)] },
    { name: 'T-shape', goal: 'Fill the T-shape.', reveal: '', grid: true, drawing: [R(0, 0, 6, 2), R(2, 2, 2, 3)] },
    { name: 'step', goal: 'Fill the step shape.', reveal: '', grid: true, drawing: [R(0, 0, 3, 2), R(0, 2, 5, 2)] },
  ],
  [
    { name: 'U-shape', goal: 'Fill the U-shape.', reveal: '', grid: true, drawing: [R(0, 0, 2, 4), R(2, 2, 2, 2), R(4, 0, 2, 4)] },
    { name: 'stairs', goal: 'Fill the staircase.', reveal: '', grid: true, drawing: [R(0, 0, 2, 2), R(0, 2, 4, 2), R(0, 4, 6, 1)] },
    { name: 'plus', goal: 'Fill the plus sign.', reveal: '', grid: true, drawing: [R(2, 0, 2, 2), R(0, 2, 6, 2), R(2, 4, 2, 2)] },
  ],
  [
    { name: 'arrow', goal: 'Fill the arrow (two pieces are triangles).', reveal: '', grid: true, drawing: [R(0, 1, 4, 2), P('triM', 3, 4, 0), P('triM', 0, 4, 2)] },
    { name: 'house', goal: 'Fill the house (the roof is two triangles).', reveal: '', grid: true, drawing: [P('triM', 2, 0, 0), P('triM', 3, 2, 0), R(0, 2, 4, 3)] },
    { name: 'ramp', goal: 'Fill the ramp.', reveal: '', grid: true, drawing: [R(0, 2, 6, 2), R(0, 0, 2, 2), P('triM', 3, 2, 0)] },
  ],
];

/** The two classic seven-piece shapes, built by the solver from their outlines. */
const SEVEN_OUTLINES: Record<string, Pt[]> = {
  'tangram square': R(0, 0, 4, 4),
  'tangram triangle': [[0, 0], [8, 0], [4, 4]],
};

export const ROUNDS = 8;

export interface Round {
  puzzle: Puzzle;
  /** Silhouette quarters. */
  target: Set<string>;
  /** Bounding box of the silhouette. */
  w: number;
  h: number;
  /** Pieces to place, with starting rotations. */
  pieces: { type: string; rot: number }[];
  /** One known solution (for "show me"). */
  solution: Placement[];
  tier: number;
}

const ALL_TYPES = ['triS', 'triM', 'triL', 'dia', 'par', 'sq2'];

function typesFor(poly: Pt[]): string[] {
  const { w, h } = size(normalize(poly));
  return [...ALL_TYPES, `r${w}x${h}`, `r${h}x${w}`];
}

export function pools(band: Band): Puzzle[][] {
  return [BAND0, BAND1, BAND2, BAND3][band];
}

/** Turn a puzzle into a playable round. */
export function buildRound(puzzle: Puzzle, band: Band, tier: number, random = Math.random): Round {
  let solution: Placement[];
  if (puzzle.drawing.length === 0) {
    const outline = SEVEN_OUTLINES[puzzle.name];
    const target = new Set(polyQuarters(outline));
    const found = solve(target, TANGRAM);
    if (!found) throw new Error(`No tiling for ${puzzle.name}`);
    solution = found;
  } else {
    solution = puzzle.drawing.map((poly) => identify(poly, typesFor(poly)));
  }
  const target = new Set<string>();
  for (const s of solution) for (const q of pieceQuarters(s.type, s.rot, s.x, s.y)) target.add(q);
  let w = 0;
  let h = 0;
  for (const s of solution) {
    const d = size(verts(s.type, s.rot));
    w = Math.max(w, s.x + d.w);
    h = Math.max(h, s.y + d.h);
  }
  // Youngest children start with pieces already turned the right way; later, pieces start turned.
  const turned = band === 0 ? (tier === 2 ? 1 : 0) : tier === 0 && band === 1 ? 0 : 99;
  let turnedLeft = turned;
  const pieces = solution
    .map((s) => {
      const options = distinctRotations(s.type);
      if (options.length > 1 && turnedLeft > 0) {
        turnedLeft--;
        const others = options.filter((r) => r !== s.rot);
        return { type: s.type, rot: others[Math.floor(random() * others.length)] };
      }
      return { type: s.type, rot: s.rot };
    })
    .sort(() => random() - 0.5);
  return { puzzle, target, w, h, pieces, solution, tier };
}

/** Pick the next puzzle for a tier, avoiding ones already played this session when possible. */
export function nextRound(band: Band, tier: number, played: Set<string>, random = Math.random): Round {
  const pool = pools(band)[Math.max(0, Math.min(2, tier))];
  const fresh = pool.filter((p) => !played.has(`${tier}:${p.name}`));
  const list = fresh.length ? fresh : pool;
  const puzzle = list[Math.floor(random() * list.length)];
  played.add(`${tier}:${puzzle.name}`);
  return buildRound(puzzle, band, tier, random);
}

export interface Placed {
  type: string;
  rot: number;
  x: number;
  y: number;
}

/** Where things stand: which pieces stick out or overlap, and whether it's solved. */
export function check(round: Round, placed: Placed[], allPieces: number) {
  const count = new Map<string, number>();
  for (const p of placed) for (const q of pieceQuarters(p.type, p.rot, p.x, p.y)) count.set(q, (count.get(q) ?? 0) + 1);
  const bad = placed.map((p) =>
    pieceQuarters(p.type, p.rot, p.x, p.y).some((q) => !round.target.has(q) || (count.get(q) ?? 0) > 1),
  );
  const solved =
    placed.length === allPieces && !bad.some(Boolean) && [...round.target].every((q) => count.get(q) === 1);
  return { bad, solved };
}

/** "6 + 4 + 2 = 12 square units". */
export function areaSum(round: Round): string {
  const parts = round.solution.map((s) => areaOf(s.type));
  const total = parts.reduce((a, b) => a + b, 0);
  return `${parts.join(' + ')} = ${total} square units`;
}

/** 3 first-try solves in a row → harder; a miss → easier. */
export function adapt(tier: number, streak: number, clean: boolean): { tier: number; streak: number } {
  if (!clean) return { tier: Math.max(0, tier - 1), streak: 0 };
  if (streak + 1 >= 3) return { tier: Math.min(2, tier + 1), streak: 0 };
  return { tier, streak: streak + 1 };
}

/**
 * Remember the level a child reached (per age band) so the next session starts there.
 * Browser storage is only a convenience: if it is unavailable we simply start at the easiest level.
 */
const tierKey = (band: number) => `wonderwhylab:tangram-builder:tier:${band}`;

export function savedTier(band: number): number {
  try {
    const v = Number(localStorage.getItem(tierKey(band)));
    return Number.isFinite(v) ? Math.max(0, Math.min(2, Math.round(v))) : 0;
  } catch {
    return 0;
  }
}

export function saveTier(band: number, tier: number) {
  try {
    localStorage.setItem(tierKey(band), String(tier));
  } catch {
    // Storage blocked: fine, we start easy next time.
  }
}
