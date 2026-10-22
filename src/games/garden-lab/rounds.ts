import type { Band } from '../types';

/**
 * Garden Lab rounds. Every band plays six rounds of drag-and-drop:
 * band 0 gives plants what they need, band 1 orders a life cycle, band 2 alternates
 * pollination and plant-part labels, band 3 sorts what goes in and out of a leaf.
 */

export const ROUNDS = 6;

export interface Target {
  id: string;
  label: string;
}

export interface Piece {
  id: string;
  label: string;
  target: string;
  /** One true sentence shown once the piece is placed. */
  fact: string;
  /** Shown when the piece is dropped somewhere wrong. */
  why?: string;
}

export type Need = 'water' | 'light' | 'none';

export interface Plant {
  id: string;
  need: Need;
  petal: string;
}

export type StageId = 'seed' | 'sprout' | 'young' | 'flower' | 'fruit';
export type CropId = 'tomato' | 'pumpkin' | 'pepper' | 'pea';

export interface Crop {
  id: CropId;
  name: string;
  petal: string;
  fruit: string;
  shape: FruitShape;
}

export type FruitShape = 'round' | 'oval' | 'pod';

export interface FlowerKind {
  id: string;
  name: string;
  petal: string;
  centre: string;
  fruit: string;
  shape: FruitShape;
}

export interface Flower {
  id: string;
  kind: string;
}

export type Round =
  | { mode: 'needs'; goal: string; plants: Plant[]; targets: Target[]; pieces: Piece[] }
  | { mode: 'cycle'; goal: string; crop: Crop; given: StageId[]; targets: Target[]; pieces: Piece[] }
  | { mode: 'pollinate'; goal: string; kinds: FlowerKind[]; flowers: Flower[] }
  | { mode: 'parts'; goal: string; petal: string; targets: Target[]; pieces: Piece[] }
  | { mode: 'photo'; goal: string; given: string[]; targets: Target[]; pieces: Piece[] };

// ── Band 0: what plants need ────────────────────────────────────────────────

const PETALS = ['#ff5d8f', '#ffd23f', '#8b5cf6', '#ff9f43', '#3b8cff'];

const TOOLS: Record<'water' | 'light', Omit<Piece, 'target'>> = {
  water: { id: 'water', label: 'Water', fact: 'Plants need water. The roots drink it and send it up to the leaves.' },
  light: { id: 'light', label: 'Sun', fact: 'Plants need light. Their leaves use it to make food.' },
};

/** The gentle line for giving a plant the wrong thing. */
export function needsWhy(tool: 'water' | 'light', need: Need): string {
  if (tool === 'water') {
    return need === 'none'
      ? 'This plant is happy already. Too much water makes a puddle!'
      : 'This plant has water. Too much makes a puddle! Its pale leaves need light.';
  }
  return need === 'none' ? 'This plant is happy already. It has plenty of light.' : 'This plant has light. It is droopy and dry, so it needs water.';
}

function needsRound(r: number, random: () => number): Round {
  const needs: Need[] = r < 2 ? ['water', 'light'] : ['water', 'light', 'none'];
  const petals = shuffle(PETALS, random);
  const plants = shuffle(needs, random).map((need, i) => ({ id: `plant-${i}`, need, petal: petals[i] }));
  const pieces = (['water', 'light'] as const).map((tool) => ({
    ...TOOLS[tool],
    target: plants.find((p) => p.need === tool)!.id,
  }));
  return {
    mode: 'needs',
    goal: needs.length === 2 ? 'Give each plant what it needs.' : 'Help the plants that need something.',
    plants,
    targets: plants.map((p) => ({ id: p.id, label: 'plant' })),
    pieces: shuffle(pieces, random),
  };
}

// ── Band 1: life cycle ──────────────────────────────────────────────────────

export const STAGES: { id: StageId; label: string; fact: string }[] = [
  { id: 'seed', label: 'Seed', fact: 'A seed holds a tiny baby plant and the food it needs to start.' },
  { id: 'sprout', label: 'Sprout', fact: 'The seed sprouts: a root grows down and a shoot grows up.' },
  { id: 'young', label: 'Young plant', fact: 'The young plant grows more leaves to catch sunlight.' },
  { id: 'flower', label: 'Flowering plant', fact: 'The plant grows flowers. Bees carry their pollen.' },
  { id: 'fruit', label: 'Fruit with seeds', fact: 'The fruit holds new seeds, and the cycle starts again!' },
];

export const CROPS: Crop[] = [
  { id: 'tomato', name: 'tomato', petal: '#ffd23f', fruit: '#e5484d', shape: 'round' },
  { id: 'pumpkin', name: 'pumpkin', petal: '#ffb020', fruit: '#ff8a1f', shape: 'round' },
  { id: 'pepper', name: 'pepper', petal: '#ffffff', fruit: '#34c47c', shape: 'oval' },
  { id: 'pea', name: 'pea', petal: '#c4b5fd', fruit: '#7cc444', shape: 'pod' },
];

function cycleRound(r: number, random: () => number): Round {
  const missing = r < 2 ? 2 : r < 4 ? 3 : 5;
  const crop = CROPS[r % CROPS.length];
  const gone = new Set(shuffle(STAGES, random).slice(0, missing).map((s) => s.id));
  return {
    mode: 'cycle',
    goal: missing === 5 ? `Build the ${crop.name} life cycle. Start at the top.` : `Finish the ${crop.name} life cycle.`,
    crop,
    given: STAGES.filter((s) => !gone.has(s.id)).map((s) => s.id),
    targets: STAGES.map((_, i) => ({ id: `slot-${i}`, label: `step ${i + 1}` })),
    pieces: shuffle(
      STAGES.filter((s) => gone.has(s.id)).map((s) => ({ id: s.id, label: s.label, target: `slot-${STAGES.indexOf(s)}`, fact: s.fact })),
      random,
    ),
  };
}

// ── Band 2: pollination and plant parts ─────────────────────────────────────

export const FLOWER_KINDS: FlowerKind[] = [
  { id: 'apple', name: 'apple', petal: '#ff9ec0', centre: '#ffd23f', fruit: '#e5484d', shape: 'round' },
  { id: 'lemon', name: 'lemon', petal: '#ffffff', centre: '#ffd23f', fruit: '#ffd23f', shape: 'oval' },
  { id: 'pea', name: 'pea', petal: '#a78bfa', centre: '#fff3b0', fruit: '#7cc444', shape: 'pod' },
  { id: 'pumpkin', name: 'pumpkin', petal: '#ffb020', centre: '#f97316', fruit: '#ff8a1f', shape: 'round' },
];

function pollinateRound(random: () => number): Round {
  const kinds = shuffle(FLOWER_KINDS, random).slice(0, 2);
  const flowers = shuffle([kinds[0].id, kinds[0].id, kinds[1].id, kinds[1].id], random).map((kind, i) => ({ id: `flower-${i}`, kind }));
  return { mode: 'pollinate', goal: 'Fly the bee from flower to flower of the same kind.', kinds, flowers };
}

export interface BeeState {
  /** Flower the bee last took pollen from, or null when it carries none. */
  from: string | null;
  /** Flowers that have been pollinated and grow fruit. */
  fruit: string[];
}

export type BeeResult = 'pickup' | 'same' | 'fruit' | 'wrong' | 'done';

/** What happens when the bee lands on `flowerId`. Pure, so it can be tested. */
export function beeLand(flowers: Flower[], state: BeeState, flowerId: string): { result: BeeResult; state: BeeState } {
  const flower = flowers.find((f) => f.id === flowerId);
  if (!flower) return { result: 'same', state };
  if (state.fruit.includes(flowerId)) return { result: 'done', state };
  if (state.from === null) return { result: 'pickup', state: { ...state, from: flowerId } };
  if (state.from === flowerId) return { result: 'same', state };
  const fromKind = flowers.find((f) => f.id === state.from)?.kind;
  if (fromKind !== flower.kind) return { result: 'wrong', state };
  return { result: 'fruit', state: { from: null, fruit: [...state.fruit, flowerId] } };
}

/** True once one flower of every kind is pollinated. */
export function pollinated(flowers: Flower[], fruit: string[]): boolean {
  const kinds = new Set(flowers.map((f) => f.kind));
  const done = new Set(flowers.filter((f) => fruit.includes(f.id)).map((f) => f.kind));
  return done.size === kinds.size;
}

const PARTS: Piece[] = [
  { id: 'petal', label: 'Petal', target: 'petal', fact: 'Bright petals help bees and other insects find the flower.' },
  { id: 'stem', label: 'Stem', target: 'stem', fact: 'The stem holds the plant up and carries water to the leaves.' },
  { id: 'leaf', label: 'Leaf', target: 'leaf', fact: 'Leaves use sunlight to make food for the plant.' },
  { id: 'root', label: 'Root', target: 'root', fact: 'Roots hold the plant in the soil and drink up water.' },
];

function partsRound(random: () => number): Round {
  return {
    mode: 'parts',
    goal: 'Label the parts of the plant.',
    petal: pick(PETALS, random),
    targets: PARTS.map((p) => ({ id: p.target, label: p.label.toLowerCase() })),
    pieces: shuffle(PARTS, random),
  };
}

// ── Band 3: photosynthesis ──────────────────────────────────────────────────

export const PHOTO_TARGETS: Target[] = [
  { id: 'in', label: 'Goes in' },
  { id: 'out', label: 'Comes out' },
  { id: 'not', label: 'Not part of it' },
];

const INPUTS: Piece[] = [
  { id: 'sunlight', label: 'Sunlight', target: 'in', fact: 'Sunlight gives the leaf the energy to make food.', why: 'Sunlight goes in: it is the energy the leaf uses.' },
  { id: 'water', label: 'Water', target: 'in', fact: 'Water travels up from the roots into the leaf.', why: 'Water goes in: the roots send it up to the leaf.' },
  {
    id: 'co2',
    label: 'Carbon dioxide',
    target: 'in',
    fact: 'Carbon dioxide comes in from the air through tiny holes in the leaf.',
    why: 'Carbon dioxide goes in, from the air around the leaf.',
  },
];

const OUTPUTS: Piece[] = [
  { id: 'sugar', label: 'Sugar (glucose)', target: 'out', fact: 'The leaf makes sugar called glucose. It is the plant’s food.', why: 'Sugar is what the leaf makes, so it comes out.' },
  { id: 'oxygen', label: 'Oxygen', target: 'out', fact: 'Oxygen goes out into the air, and we breathe it in!', why: 'Oxygen is made by the leaf, so it comes out. It does not go in.' },
];

const DISTRACTORS: Piece[] = [
  {
    id: 'soil',
    label: 'Soil (as food)',
    target: 'not',
    fact: 'Plants don’t eat soil. They make their own food from light, water and air.',
    why: 'Plants don’t eat soil. They make their own food.',
  },
  {
    id: 'salt',
    label: 'Salt water',
    target: 'not',
    fact: 'Salt water harms most plants. They need fresh water.',
    why: 'Salt water harms most plants. They need fresh water.',
  },
];

export const EQUATION = 'carbon dioxide + water → (sunlight) → sugar + oxygen';

function photoRound(r: number, random: () => number): Round {
  const distractor = DISTRACTORS[r % 2 === 0 ? 0 : 1];
  let pieces: Piece[];
  let given: string[] = [];
  if (r < 2) {
    pieces = [...INPUTS, distractor];
  } else if (r < 4) {
    const input = pick(INPUTS, random);
    pieces = [...OUTPUTS, input, distractor];
    given = INPUTS.filter((p) => p !== input).map((p) => p.id);
  } else {
    pieces = [...INPUTS, ...OUTPUTS, distractor];
  }
  const goal = r < 2 ? 'What goes into a leaf to make food?' : r < 4 ? 'What comes out of the leaf?' : 'Sort it all: in, out, or not part of it.';
  return { mode: 'photo', goal, given, targets: PHOTO_TARGETS, pieces: shuffle(pieces, random) };
}

/** Labels for pieces shown already placed (band 3 rounds 3–4). */
export const PHOTO_LABELS: Record<string, string> = Object.fromEntries([...INPUTS, ...OUTPUTS].map((p) => [p.id, p.label]));

// ── Helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pick = <T,>(items: readonly T[], random: () => number) => items[Math.floor(random() * items.length)];

/** Six rounds for a band. `random` is injectable for tests. */
export function makeRounds(band: Band, random: () => number = Math.random): Round[] {
  return Array.from({ length: ROUNDS }, (_, r) => {
    if (band === 0) return needsRound(r, random);
    if (band === 1) return cycleRound(r, random);
    if (band === 2) return r % 2 === 0 ? pollinateRound(random) : partsRound(random);
    return photoRound(r, random);
  });
}
