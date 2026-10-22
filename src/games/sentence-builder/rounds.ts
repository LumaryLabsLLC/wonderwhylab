import type { Band } from '../types';
import { shuffle } from '../../lib/random';

/**
 * Sentence Builder content. Each round is a picture (or two short sentences to join) and a set of
 * word cards. The child drags the cards into the slots to build the one sentence that fits.
 *
 * - Band 0 (pre-readers): one slot — label the picture with a word, hearing words on request.
 * - Band 1: short decodable sentences; the capital-letter word and the full stop are their own cards.
 * - Band 2: longer sentences with describing words and joining words (and, but, because).
 * - Band 3: join two short sentences with the right conjunction (so, because, although, while).
 *
 * Every level 0–2 inside a band gets a bit harder; the game moves between levels as the child plays.
 */
export interface Spec {
  id: string;
  /** Emoji picture shown above the sentence. */
  picture: string;
  /** Band 3: the two short sentences to combine. */
  join?: [string, string];
  /** Accepted sentences, as space-separated tokens. The first is the one shown in "show me". */
  answers: string[];
  /** Cards that never belong (wrong word, wrong capital, wrong joining word). */
  distractors: string[];
}

export interface Round {
  id: string;
  band: Band;
  level: number;
  picture: string;
  join?: [string, string];
  /** Each accepted answer as a list of tokens (all the same length). */
  answers: string[][];
  /** The shuffled card pile. */
  cards: { id: string; text: string; tilt: number }[];
}

export const ROUNDS = 8;

const s = (id: string, picture: string, answers: string | string[], distractors: string[], join?: [string, string]): Spec => ({
  id,
  picture,
  answers: Array.isArray(answers) ? answers : [answers],
  distractors,
  join,
});

/** BANK[band][level] */
export const BANK: Spec[][][] = [
  // Band 0 — one word that names the picture. Level 2 decoys share the first sound, so the child must look at the whole word.
  [
    [
      s('b0-cat', '🐱', 'cat', ['sun']),
      s('b0-dog', '🐶', 'dog', ['hat']),
      s('b0-sun', '☀️', 'sun', ['pig']),
      s('b0-bus', '🚌', 'bus', ['fox']),
      s('b0-pig', '🐷', 'pig', ['bed']),
      s('b0-hat', '🎩', 'hat', ['web']),
    ],
    [
      s('b1-fox', '🦊', 'fox', ['cat', 'sun']),
      s('b1-bed', '🛏️', 'bed', ['map', 'dog']),
      s('b1-box', '📦', 'box', ['pen', 'hat']),
      s('b1-web', '🕸️', 'web', ['bus', 'pig']),
      s('b1-map', '🗺️', 'map', ['fox', 'nut']),
      s('b1-van', '🚐', 'van', ['bed', 'cat']),
    ],
    [
      s('b2-cat', '🐱', 'cat', ['can', 'cap']),
      s('b2-pig', '🐷', 'pig', ['pin', 'pit']),
      s('b2-dog', '🐶', 'dog', ['dot', 'dig']),
      s('b2-bus', '🚌', 'bus', ['bun', 'but']),
      s('b2-hat', '🎩', 'hat', ['ham', 'has']),
      s('b2-fox', '🦊', 'fox', ['fog', 'fix']),
      s('b2-bed', '🛏️', 'bed', ['beg', 'bud']),
    ],
  ],
  // Band 1 — decodable sentences. Capital word and full stop are separate cards.
  [
    [
      s('s1-cat', '🐱', 'A cat sat .', ['dog']),
      s('s1-pig', '🐷', 'A pig ran .', ['cat']),
      s('s1-fox', '🦊', 'A fox hid .', ['hen']),
      s('s1-sun', '🌇', 'The sun set .', ['bus']),
      s('s1-dog', '🐶', 'A dog dug .', ['pig']),
      s('s1-bug', '🐞', 'A bug hid .', ['fox']),
    ],
    [
      s('s1-fat', '🐱', 'The cat is fat .', ['the']),
      s('s1-wet', '🐶💧', 'The dog is wet .', ['the']),
      s('s1-dig', '🐷', 'A pig can dig .', ['a']),
      s('s1-red', '🚌', 'The bus is red .', ['the']),
      s('s1-hat', '🎩', 'Sam has a hat .', ['cap']),
      s('s1-hop', '🐸', 'A frog can hop .', ['a']),
    ],
    [
      s('s1-box', '🦊📦', 'The fox is in the box .', ['bed']),
      s('s1-hen', '🐷🐔', ['The pig and the hen ran .', 'The hen and the pig ran .'], ['cat']),
      s('s1-cup', '🐞🥤', 'A bug is on the cup .', ['dog']),
      s('s1-bag', '🎒', 'Ben has a big red bag .', ['hat']),
      s('s1-bed', '🐱🛏️', 'The cat can sit on the bed .', ['dog']),
    ],
  ],
  // Band 2 — describing words, then joining words.
  [
    [
      s('d2-frog', '🐸', 'The green frog jumped into the pond.', ['purple']),
      s('d2-sheep', '🐑🌿', 'A fluffy white sheep ate the grass.', ['black']),
      s('d2-giraffe', '🦒🍃', 'The tall giraffe ate fresh leaves.', ['short']),
      s('d2-truck', '🚒', 'A red fire truck raced down the street.', ['blue']),
      s('d2-mouse', '🐭🪑', 'The small brown mouse ran under the chair.', ['huge']),
    ],
    [
      s('d2-coat', '🧥🏃', 'Mia grabbed her coat and ran outside.', ['because']),
      s('d2-pie', '🍎🥧', 'We picked apples and baked a pie.', ['but']),
      s('d2-bark', '🐶', 'The dog barked and wagged its tail.', ['because']),
      s('d2-bed', '🛏️🌙', 'Leo read a book and went to bed.', ['but']),
      s('d2-scarf', '🧣', 'Grandma knitted a scarf and gave it to me.', ['because']),
    ],
    [
      s('d2-rain', '🌧️', 'I wanted to play outside, but it was raining.', ['because']),
      s('d2-plant', '🌱💧', 'The plant grew tall because we watered it.', ['but']),
      s('d2-race', '🏃🏁', 'Sam was tired, but he finished the race.', ['because']),
      s('d2-cold', '🧥❄️', 'We wore coats because it was cold.', ['but']),
      s('d2-cake', '🍰🧂', 'The cake looked nice, but it tasted salty.', ['because']),
    ],
  ],
  // Band 3 — combine two sentences. Capitals and punctuation on the cards fix the word order.
  [
    [
      s('j3-rain', '🌧️', 'It was raining, so we stayed inside.', ['because'], ['It was raining.', 'We stayed inside.']),
      s('j3-ice', '🧊🚌', 'The road was icy, so the bus drove slowly.', ['although'], ['The road was icy.', 'The bus drove slowly.']),
      s('j3-bee', '🐝🏆', 'Maya won the spelling bee because she practised every day.', ['so'], ['Maya practised every day.', 'She won the spelling bee.']),
      s('j3-puppy', '🐶🥣', 'The puppy barked at its bowl because it was hungry.', ['so'], ['The puppy was hungry.', 'It barked at its bowl.']),
    ],
    [
      s('j3-cold', '🌊🥶', 'Although it was cold, we went swimming.', ['Because'], ['It was cold.', 'We went swimming.']),
      s('j3-test', '📝✅', 'Although the test was hard, Jo passed it.', ['Because'], ['The test was hard.', 'Jo passed it.']),
      s('j3-strong', '💪', 'Although Ben is small, he is very strong.', ['Because'], ['Ben is small.', 'He is very strong.']),
      s('j3-cafe', '☕🪑', 'Although the café was busy, we found a seat.', ['So'], ['The café was busy.', 'We found a seat.']),
    ],
    [
      s('j3-dinner', '🍝🍽️', 'While Dad cooked dinner, I set the table.', ['So'], ['Dad cooked dinner.', 'I set the table.']),
      s('j3-baby', '👶🤫', 'We whispered while the baby slept.', ['although'], ['The baby slept.', 'We whispered.']),
      s('j3-birds', '🐦❄️', 'While some birds fly south, others stay all winter.', ['Because'], ['Some birds fly south.', 'Others stay all winter.']),
      s('j3-wind', '☀️🌬️', 'Although the sun was out, the wind was freezing.', ['Because'], ['The sun was out.', 'The wind was freezing.']),
    ],
  ],
];

/** Split a sentence into card tokens. */
export const tokens = (sentence: string) => sentence.split(' ').filter(Boolean);

/** Turn a spec into a playable round with a jumbled pile of cards. */
export function toRound(spec: Spec, band: Band, level: number, random = Math.random): Round {
  const answers = spec.answers.map(tokens);
  const texts = [...answers[0], ...spec.distractors];
  let order = shuffle(texts.map((text, i) => ({ text, i })));
  // Never hand over the cards already in the right order.
  for (let tries = 0; tries < 6 && order.slice(0, answers[0].length).every((c, k) => c.text === answers[0][k]); tries++) {
    order = shuffle(order);
  }
  return {
    id: spec.id,
    band,
    level,
    picture: spec.picture,
    join: spec.join,
    answers,
    cards: order.map((c, k) => ({ id: `${spec.id}-${c.i}`, text: c.text, tilt: Math.round((random() - 0.5) * 8) + (k % 2 ? 1 : -1) })),
  };
}

/** Pick a round for this band and level, avoiding ones played recently. */
export function makeRound(band: Band, level: number, recent: string[] = []): Round {
  const pool = BANK[band][Math.max(0, Math.min(2, level))];
  const fresh = pool.filter((p) => !recent.includes(p.id));
  const options = fresh.length ? fresh : pool;
  const spec = options[Math.floor(Math.random() * options.length)];
  return toRound(spec, band, level);
}

/** Answers that still fit the words already placed. */
function consistent(round: Round, placed: (string | null)[]): string[][] {
  return round.answers.filter((a) => placed.every((t, i) => t === null || a[i] === t));
}

/** Can a card with this text go into this slot, given what is already placed? */
export function canPlace(round: Round, placed: (string | null)[], slot: number, text: string): boolean {
  if (placed[slot] !== null) return false;
  return consistent(round, placed).some((a) => a[slot] === text);
}

/** For "show me": the first empty slot and the word that belongs there. */
export function nextStep(round: Round, placed: (string | null)[]): { slot: number; text: string } | null {
  const a = consistent(round, placed)[0];
  if (!a) return null;
  const slot = placed.findIndex((t) => t === null);
  return slot < 0 ? null : { slot, text: a[slot] };
}

/** A short strategy nudge after a mistake. It never gives the answer away. */
export function nudge(round: Round, text: string): string {
  const joiners = ['and', 'but', 'because', 'so', 'although', 'while', 'Because', 'So', 'Although', 'While'];
  if (round.band === 0) return 'Tap the speaker on each word to hear it. Which word names the picture?';
  if (text === '.') return 'A full stop goes at the very end of a sentence.';
  if (/^[A-Z]/.test(text) && round.band === 1) return 'A sentence starts with a capital letter. Which word begins it?';
  if (/^[a-z]/.test(text) && round.answers[0][0].toLowerCase() === text) return 'Look closely: the first word needs a capital letter.';
  if (joiners.includes(text)) {
    return round.band === 3
      ? 'Think about how the two ideas fit: a reason (because, so), a surprise (although) or at the same time (while)?'
      : '“And” adds more, “but” shows a surprise, and “because” gives a reason. Which one fits?';
  }
  return 'Look at the picture and say the sentence in your head. Which word comes next?';
}

/** One line shown when the sentence is finished. */
export function tip(round: Round): string {
  if (round.band === 0) return 'You matched the word to the picture!';
  if (round.band === 1) return 'Capital letter at the start, full stop at the end.';
  const words = round.answers[0];
  const joiner = words.find((w) => ['and', 'but', 'because', 'so', 'although', 'while', 'Although', 'While'].includes(w));
  switch (joiner?.toLowerCase()) {
    case 'and':
      return '“And” joins two things that both happened.';
    case 'but':
      return '“But” shows something surprising or different.';
    case 'because':
      return '“Because” tells you the reason.';
    case 'so':
      return '“So” tells you what happened as a result.';
    case 'although':
      return '“Although” shows a surprise: the second part happens anyway.';
    case 'while':
      return '“While” shows two things at the same time, or how they differ.';
    default:
      return 'Describing words help the reader picture it.';
  }
}
