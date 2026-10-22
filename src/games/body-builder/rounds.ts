import type { Band } from '../types';

/**
 * Body Builder rounds. Bands 0–2 drop pieces onto a body figure (anchors are points in a
 * 400 × 640 drawing); band 3 sorts organs and jobs into body-system bins.
 */

export type View = 'outside' | 'senses' | 'inside' | 'systems';

export interface Target {
  id: string;
  label: string;
  /** Points on the 400 × 640 figure (empty for bins). */
  anchors: [number, number][];
}

export interface Piece {
  id: string;
  label: string;
  /** Emoji shown on the card (bands 0–1). */
  emoji?: string;
  /** Drawn organ icon (bands 2–3). */
  organ?: OrganKind;
  target: string;
  /** One true sentence shown once the piece is placed. */
  fact: string;
}

export type OrganKind =
  | 'brain'
  | 'heart'
  | 'lungs'
  | 'stomach'
  | 'intestines'
  | 'bones'
  | 'vessels'
  | 'windpipe'
  | 'nerves'
  | 'skull'
  | 'ribs'
  | 'foodpipe';

export interface Round {
  view: View;
  goal: string;
  targets: Target[];
  pieces: Piece[];
}

export const ROUNDS = 4;

// ── Band 0: outside parts ───────────────────────────────────────────────────

const OUTSIDE_TARGETS: Target[] = [
  { id: 'head', label: 'head', anchors: [[200, 64]] },
  { id: 'eyes', label: 'eyes', anchors: [[160, 140], [240, 140]] },
  { id: 'ears', label: 'ears', anchors: [[80, 168], [320, 168]] },
  { id: 'nose', label: 'nose', anchors: [[200, 192]] },
  { id: 'mouth', label: 'mouth', anchors: [[200, 238]] },
  { id: 'hands', label: 'hands', anchors: [[66, 458], [334, 458]] },
  { id: 'feet', label: 'feet', anchors: [[148, 612], [252, 612]] },
];

const OUTSIDE_PIECES: Piece[] = [
  { id: 'head', label: 'Head', emoji: '🙂', target: 'head', fact: 'Your head keeps your brain safe inside your skull.' },
  { id: 'eyes', label: 'Eyes', emoji: '👀', target: 'eyes', fact: 'Your eyes let you see colours and shapes.' },
  { id: 'ears', label: 'Ears', emoji: '👂', target: 'ears', fact: 'Your ears catch sounds.' },
  { id: 'nose', label: 'Nose', emoji: '👃', target: 'nose', fact: 'Your nose smells, and it helps you breathe too.' },
  { id: 'mouth', label: 'Mouth', emoji: '👄', target: 'mouth', fact: 'Your mouth helps you eat and talk.' },
  { id: 'hands', label: 'Hands', emoji: '✋', target: 'hands', fact: 'Your hands can hold, build and wave.' },
  { id: 'feet', label: 'Feet', emoji: '🦶', target: 'feet', fact: 'Your feet help you stand, walk and jump.' },
];

// ── Band 1: senses ──────────────────────────────────────────────────────────

const SENSE_TARGETS: Target[] = [
  { id: 'eyes', label: 'eyes', anchors: [[160, 140], [240, 140]] },
  { id: 'ears', label: 'ears', anchors: [[80, 168], [320, 168]] },
  { id: 'nose', label: 'nose', anchors: [[200, 192]] },
  { id: 'tongue', label: 'tongue', anchors: [[200, 238]] },
  { id: 'skin', label: 'skin', anchors: [[66, 458], [334, 458]] },
];

const SENSE_EXAMPLES: Record<string, { verb: string; examples: [string, string][]; fact: string }> = {
  eyes: {
    verb: 'See',
    examples: [['a rainbow', '🌈'], ['the moon', '🌙'], ['a red balloon', '🎈'], ['a butterfly', '🦋']],
    fact: 'You see with your eyes. They need light to work.',
  },
  ears: {
    verb: 'Hear',
    examples: [['a drum', '🥁'], ['a bell', '🔔'], ['a dog bark', '🐶'], ['music', '🎵']],
    fact: 'You hear with your ears. Sounds travel through the air to them.',
  },
  nose: {
    verb: 'Smell',
    examples: [['a flower', '🌸'], ['fresh bread', '🍞'], ['a pizza', '🍕'], ['an orange', '🍊']],
    fact: 'You smell with your nose. Smell also helps you taste food.',
  },
  tongue: {
    verb: 'Taste',
    examples: [['a lemon', '🍋'], ['ice cream', '🍦'], ['a strawberry', '🍓'], ['honey', '🍯']],
    fact: 'You taste with your tongue. It can tell sweet, salty, sour and bitter.',
  },
  skin: {
    verb: 'Feel',
    examples: [['a soft kitten', '🐱'], ['cold snow', '❄️'], ['a spiky cactus', '🌵'], ['warm sand', '🏖️']],
    fact: 'You feel with your skin. Your fingertips are extra good at touching.',
  },
};

// ── Band 2: inside organs ───────────────────────────────────────────────────

const INSIDE_TARGETS: Target[] = [
  { id: 'brain', label: 'brain', anchors: [[200, 118]] },
  { id: 'lungs', label: 'lungs', anchors: [[158, 330], [242, 330]] },
  { id: 'heart', label: 'heart', anchors: [[212, 372]] },
  { id: 'stomach', label: 'stomach', anchors: [[238, 420]] },
  { id: 'intestines', label: 'intestines', anchors: [[188, 462]] },
  { id: 'bones', label: 'bones', anchors: [[164, 548], [236, 548]] },
];

const INSIDE_PIECES: Piece[] = [
  { id: 'brain', label: 'Brain', organ: 'brain', target: 'brain', fact: 'Your brain is the boss: it thinks and controls your body.' },
  { id: 'lungs', label: 'Lungs', organ: 'lungs', target: 'lungs', fact: 'Your two lungs fill with air and take in oxygen.' },
  { id: 'heart', label: 'Heart', organ: 'heart', target: 'heart', fact: 'Your heart is a muscle that pumps blood around your body.' },
  { id: 'stomach', label: 'Stomach', organ: 'stomach', target: 'stomach', fact: 'Your stomach squeezes and mixes food with special juices.' },
  { id: 'intestines', label: 'Intestines', organ: 'intestines', target: 'intestines', fact: 'Your intestines take in the goodness from food. They are very long!' },
  { id: 'bones', label: 'Bones', organ: 'bones', target: 'bones', fact: 'Bones hold you up. A grown-up has 206 of them.' },
];

// ── Band 3: body systems ────────────────────────────────────────────────────

export const SYSTEM_TARGETS: Target[] = [
  { id: 'circulatory', label: 'Circulatory', anchors: [] },
  { id: 'respiratory', label: 'Respiratory', anchors: [] },
  { id: 'digestive', label: 'Digestive', anchors: [] },
  { id: 'nervous', label: 'Nervous', anchors: [] },
  { id: 'skeletal', label: 'Skeletal', anchors: [] },
];

const SYSTEM_ORGANS: Piece[] = [
  { id: 'heart', label: 'Heart', organ: 'heart', target: 'circulatory', fact: 'The heart pumps blood through the circulatory system.' },
  { id: 'vessels', label: 'Blood vessels', organ: 'vessels', target: 'circulatory', fact: 'Blood vessels are tubes that carry blood all around you.' },
  { id: 'lungs', label: 'Lungs', organ: 'lungs', target: 'respiratory', fact: 'In the lungs, oxygen goes into the blood and carbon dioxide comes out.' },
  { id: 'windpipe', label: 'Windpipe', organ: 'windpipe', target: 'respiratory', fact: 'The windpipe (trachea) carries air down to your lungs.' },
  { id: 'stomach', label: 'Stomach', organ: 'stomach', target: 'digestive', fact: 'The stomach breaks food down with acid and squeezing.' },
  { id: 'intestines', label: 'Intestines', organ: 'intestines', target: 'digestive', fact: 'The small intestine absorbs nutrients into the blood.' },
  { id: 'foodpipe', label: 'Food pipe', organ: 'foodpipe', target: 'digestive', fact: 'The food pipe (oesophagus) squeezes food down to the stomach.' },
  { id: 'brain', label: 'Brain', organ: 'brain', target: 'nervous', fact: 'The brain is the control centre of the nervous system.' },
  { id: 'nerves', label: 'Nerves', organ: 'nerves', target: 'nervous', fact: 'Nerves carry messages between the brain and the body.' },
  { id: 'skull', label: 'Skull', organ: 'skull', target: 'skeletal', fact: 'The skull is a strong case of bone that protects the brain.' },
  { id: 'ribs', label: 'Ribs', organ: 'ribs', target: 'skeletal', fact: 'The ribs make a cage that protects the heart and lungs.' },
];

const SYSTEM_JOBS: Record<string, [string, string]> = {
  circulatory: ['Pumps blood around the body', 'Carries oxygen and food to every cell'],
  respiratory: ['Brings oxygen in and breathes carbon dioxide out', 'Moves air in and out of the body'],
  digestive: ['Breaks food down so the body can use it', 'Turns food into nutrients'],
  nervous: ['Sends messages between the brain and the body', 'Senses things and controls movement'],
  skeletal: ['Holds you up and protects your organs', 'Gives your body its shape'],
};

const SYSTEM_FACTS: Record<string, string> = {
  circulatory: 'The circulatory system is your heart, blood vessels and blood.',
  respiratory: 'The respiratory system is your airways and lungs.',
  digestive: 'The digestive system runs from your mouth to your intestines.',
  nervous: 'The nervous system is your brain, spinal cord and nerves.',
  skeletal: 'The skeletal system is all your bones working together.',
};

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

function sensesRound(random: () => number): Round {
  const pieces = shuffle(Object.keys(SENSE_EXAMPLES), random).map((target) => {
    const s = SENSE_EXAMPLES[target];
    const [what, emoji] = pick(s.examples, random);
    return { id: target, label: `${s.verb} ${what}`, emoji, target, fact: s.fact };
  });
  return { view: 'senses', goal: 'Which part of you does each one?', targets: SENSE_TARGETS, pieces };
}

/** Four rounds for a band. `random` is injectable for tests. */
export function makeRounds(band: Band, random: () => number = Math.random): Round[] {
  const rounds: Round[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    if (band === 0) {
      const n = r === 0 ? 5 : 6;
      rounds.push({ view: 'outside', goal: 'Put each part in the right place.', targets: OUTSIDE_TARGETS, pieces: shuffle(OUTSIDE_PIECES, random).slice(0, n) });
    } else if (band === 1) {
      rounds.push(sensesRound(random));
    } else if (band === 2) {
      const n = r === 0 ? 5 : 6;
      rounds.push({ view: 'inside', goal: 'Find where each part lives inside the body.', targets: INSIDE_TARGETS, pieces: shuffle(INSIDE_PIECES, random).slice(0, n) });
    } else if (r % 2 === 0) {
      rounds.push({ view: 'systems', goal: 'Which body system does each part belong to?', targets: SYSTEM_TARGETS, pieces: shuffle(SYSTEM_ORGANS, random).slice(0, 6) });
    } else {
      const pieces = shuffle(SYSTEM_TARGETS, random).map((t) => ({
        id: `job-${t.id}`,
        label: SYSTEM_JOBS[t.id][r === 1 ? 0 : 1],
        target: t.id,
        fact: SYSTEM_FACTS[t.id],
      }));
      rounds.push({ view: 'systems', goal: 'Match each job to its body system.', targets: SYSTEM_TARGETS, pieces });
    }
  }
  return rounds;
}
