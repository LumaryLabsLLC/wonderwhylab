import type { Band } from '../types';
import { pick, shuffle } from '../../lib/random';

export type HabitatId = 'ocean' | 'polar' | 'desert' | 'rainforest' | 'grassland' | 'wetland';

export interface Habitat {
  id: HabitatId;
  name: string;
  icon: string;
  /** "Polar bears live ___." */
  where: string;
}

export const HABITATS: Record<HabitatId, Habitat> = {
  ocean: { id: 'ocean', name: 'Ocean', icon: '🌊', where: 'in the ocean' },
  polar: { id: 'polar', name: 'Snow & ice', icon: '❄️', where: 'in the snow and ice' },
  desert: { id: 'desert', name: 'Desert', icon: '🌵', where: 'in the desert' },
  rainforest: { id: 'rainforest', name: 'Rainforest', icon: '🌳', where: 'in the rainforest' },
  grassland: { id: 'grassland', name: 'Grassland', icon: '🌾', where: 'on the grassland' },
  wetland: { id: 'wetland', name: 'Wetland', icon: '🌿', where: 'in wetlands' },
};

/** Habitats used for the animal rounds (ages 4–9). Wetland joins for ages 10–12. */
const LAND_AND_SEA: HabitatId[] = ['ocean', 'polar', 'desert', 'rainforest', 'grassland'];

export interface Card {
  id: string;
  kind: 'animal' | 'feature';
  /** Animal name ("camel") or the feature ("A hump that stores fat"). */
  label: string;
  /** Plural for sentences ("Camels"). Animals only. */
  plural?: string;
  /** Emoji picture. Features at ages 10–12 are shown as words only. */
  glyph: string;
  /** Draw the emoji white (polar bear, arctic fox, snowy owl — Unicode 12 has no white versions). */
  white?: boolean;
  /**
   * Every habitat this really lives in / helps in. A card is only dealt onto a board where exactly
   * one of these is showing, so there is always one right answer and never a "wrong" true one.
   */
  homes: HabitatId[];
  /** One true line shown after a right placement. */
  fact: string;
}

const animal = (id: string, glyph: string, label: string, plural: string, homes: HabitatId[], fact: string, white = false): Card => ({
  id,
  kind: 'animal',
  label,
  plural,
  glyph,
  homes,
  fact,
  white,
});

export const ANIMALS: Card[] = [
  animal('dolphin', '🐬', 'dolphin', 'Dolphins', ['ocean'], 'Dolphins talk to each other with clicks and whistles.'),
  animal('shark', '🦈', 'shark', 'Sharks', ['ocean'], 'Sharks have lived in the oceans since before the dinosaurs.'),
  animal('octopus', '🐙', 'octopus', 'Octopuses', ['ocean'], 'An octopus has eight arms and can squeeze through tiny gaps.'),
  animal('fish', '🐠', 'tropical fish', 'Tropical fish', ['ocean'], 'Tropical fish live around warm coral reefs.'),
  animal('puffer', '🐡', 'pufferfish', 'Pufferfish', ['ocean'], 'A pufferfish gulps water and puffs up to scare off hungry fish.'),
  animal('squid', '🦑', 'squid', 'Squid', ['ocean'], 'Squid squirt ink to escape from danger.'),
  animal('lobster', '🦞', 'lobster', 'Lobsters', ['ocean'], 'Lobsters walk along the sea floor on their legs.'),
  animal('penguin', '🐧', 'penguin', 'Penguins', ['polar', 'ocean'], "Penguins can't fly, but they swim fast to catch fish."),
  animal('polar-bear', '🐻', 'polar bear', 'Polar bears', ['polar'], 'Polar bears hunt seals on the Arctic sea ice.', true),
  animal('arctic-fox', '🦊', 'arctic fox', 'Arctic foxes', ['polar'], 'Arctic foxes grow thick white fur for the winter.', true),
  animal('snowy-owl', '🦉', 'snowy owl', 'Snowy owls', ['polar'], 'White feathers help snowy owls blend in with the snow.', true),
  animal('camel', '🐪', 'camel', 'Camels', ['desert'], 'Camels can go for days without drinking water.'),
  animal('fennec', '🦊', 'fennec fox', 'Fennec foxes', ['desert'], 'Huge ears help fennec foxes stay cool in the hot desert.'),
  animal('scorpion', '🦂', 'scorpion', 'Scorpions', ['desert', 'grassland', 'rainforest'], 'Scorpions hide under rocks in the heat of the day.'),
  animal('rattlesnake', '🐍', 'rattlesnake', 'Rattlesnakes', ['desert', 'grassland'], 'A rattlesnake shakes the rattle on its tail as a warning.'),
  animal('monkey', '🐒', 'monkey', 'Monkeys', ['rainforest'], 'Monkeys climb and leap through the rainforest trees.'),
  animal('parrot', '🦜', 'parrot', 'Parrots', ['rainforest'], 'Parrots crack open nuts with their strong, curved beaks.'),
  animal('sloth', '🦥', 'sloth', 'Sloths', ['rainforest'], 'Sloths move so slowly that tiny green plants grow in their fur.'),
  animal('orangutan', '🦧', 'orangutan', 'Orangutans', ['rainforest'], 'Orangutans spend nearly all their lives up in the trees.'),
  animal('gorilla', '🦍', 'gorilla', 'Gorillas', ['rainforest'], 'Gorillas munch leaves, stems and fruit in the forest.'),
  animal('frog', '🐸', 'frog', 'Frogs', ['rainforest', 'wetland'], 'Frogs need damp homes to keep their thin skin wet.'),
  animal('lion', '🦁', 'lion', 'Lions', ['grassland'], 'Lions live together in groups called prides.'),
  animal('zebra', '🦓', 'zebra', 'Zebras', ['grassland'], 'Zebras graze on grass for most of the day.'),
  animal('giraffe', '🦒', 'giraffe', 'Giraffes', ['grassland'], 'Giraffes are the tallest animals in the world.'),
  animal('kangaroo', '🦘', 'kangaroo', 'Kangaroos', ['grassland'], 'Kangaroos hop across the wide, open grasslands of Australia.'),
  animal('cheetah', '🐆', 'cheetah', 'Cheetahs', ['grassland'], 'Cheetahs are the fastest runners on land.'),
  animal('elephant', '🐘', 'elephant', 'Elephants', ['grassland', 'rainforest'], 'Elephants use their trunks to pull up grass and leaves.'),
  animal('rhino', '🦏', 'rhino', 'Rhinos', ['grassland', 'rainforest'], 'Rhinos have thick skin and munch on plants.'),
  animal('otter', '🦦', 'otter', 'Otters', ['ocean', 'wetland'], 'Otters have thick, waterproof fur for swimming.'),
];

const feature = (id: string, glyph: string, label: string, homes: HabitatId[], fact: string, white = false): Card => ({
  id,
  kind: 'feature',
  label,
  glyph,
  homes,
  fact,
  white,
});

/** Ages 8–9: body features with a picture of an animal that has them. */
export const FEATURES: Card[] = [
  feature('white-fur', '🐻', 'Thick white fur', ['polar'], 'Thick white fur keeps polar bears warm and hidden in the snow.', true),
  feature('small-ears', '🦊', 'Small, furry ears', ['polar'], 'Small furry ears lose less heat, so arctic foxes stay warm.', true),
  feature('fat-feathers', '🐧', 'Thick fat and tightly packed feathers', ['polar'], 'Fat and packed feathers keep penguins warm in icy water.'),
  feature('hump', '🐪', 'A hump that stores fat', ['desert'], "A camel's hump stores fat, so it can cross the desert without eating."),
  feature('wide-feet', '🐪', "Wide feet that don't sink in sand", ['desert'], "Wide feet spread a camel's weight so it doesn't sink in soft sand."),
  feature('big-ears', '👂', 'Huge ears that let out heat', ['desert', 'grassland'], 'Big ears give off body heat — fennec foxes and elephants use them to keep cool.'),
  feature('gills', '🐠', 'Gills for breathing underwater', ['ocean', 'wetland'], 'Gills take oxygen out of water, so fish can breathe underwater.'),
  feature('fins', '🐬', 'Fins and a strong tail', ['ocean', 'wetland'], 'Fins and a strong tail push a dolphin fast through the water.'),
  feature('blowhole', '🐳', 'A blowhole on top of the head', ['ocean'], "Whales breathe through a blowhole when they swim up to the ocean's surface."),
  feature('grip-tail', '🐒', 'A tail that grips branches', ['rainforest'], 'A gripping tail works like an extra hand high in the rainforest trees.'),
  feature('long-arms', '🦧', 'Long arms for swinging', ['rainforest'], 'Long arms let orangutans swing through the rainforest trees.'),
  feature('hook-claws', '🦥', 'Hooked claws for hanging from branches', ['rainforest'], 'Hooked claws let a sloth hang from rainforest branches for hours.'),
  feature('long-neck', '🦒', 'A very long neck', ['grassland'], "A giraffe's long neck reaches leaves on trees dotted across the grassland."),
  feature('golden-fur', '🦁', 'Golden fur that hides in dry grass', ['grassland'], 'Golden fur helps a lion sneak up on prey through dry grass.'),
  feature('hop-legs', '🦘', 'Strong back legs for hopping', ['grassland'], 'Strong back legs let kangaroos bound across open grassland.'),
  feature('sprint-legs', '🐆', 'Long legs for sprinting', ['grassland'], 'Long legs let cheetahs sprint across the open grassland.'),
];

/** Ages 10–12: "what would help here?" — words only, wetland included. */
export const DESIGN_FEATURES: Card[] = [
  ...FEATURES.filter((f) => !['fat-feathers', 'long-arms'].includes(f.id)).map((f) => ({ ...f, glyph: '' })),
  feature('furry-soles', '', 'Fur on the bottoms of its feet', ['polar'], "Furry soles keep a polar bear's feet warm and stop it slipping on ice."),
  feature('blubber', '', 'A thick layer of blubber', ['polar', 'ocean'], 'Blubber is a thick layer of fat that keeps seals and whales warm in cold water.'),
  feature('flippers', '', 'Flippers for swimming', ['ocean', 'polar'], 'Flippers push sea turtles and penguins through the water.'),
  feature('eyelashes', '', 'Long eyelashes that keep out sand', ['desert'], 'Camels have two rows of long eyelashes to keep blowing sand out of their eyes.'),
  feature('no-drink', '', 'Can go days without drinking', ['desert'], 'Desert animals like camels can go days without a drink where water is scarce.'),
  feature('salt-glands', '', 'Glands that get rid of extra salt', ['ocean'], 'Sea turtles and seabirds have glands that get rid of the extra salt from seawater.'),
  feature('toe-pads', '', 'Sticky toe pads for climbing wet leaves', ['rainforest'], 'Sticky toe pads help tree frogs cling to wet rainforest leaves.'),
  feature('webbed-feet', '', 'Webbed feet for paddling', ['wetland', 'ocean'], 'Webbed feet push like paddles for ducks, otters and other swimmers.'),
  feature('wading-legs', '', 'Long, thin legs for wading', ['wetland'], 'Long thin legs let flamingos and herons wade through shallow water.'),
  feature('eyes-on-top', '', 'Eyes and nostrils on top of the head', ['wetland'], 'A crocodile can hide underwater and still see and breathe with eyes and nostrils on top.'),
  feature('flat-bill', '', 'A wide, flat bill for sifting mud', ['wetland'], 'A flat bill lets a duck sift seeds and bugs out of muddy water.'),
  feature('long-toes', '', 'Very long toes that spread out', ['wetland'], 'Very long toes let birds called jacanas walk across floating lily pads.'),
  feature('damp-skin', '', 'Thin skin that must stay damp', ['wetland', 'rainforest'], 'Frogs breathe partly through their thin skin, so they need damp homes.'),
];

export const ROUND = 10;

/** Where this card belongs on this board — undefined unless exactly one of its homes is showing. */
export function homeOn(card: Card, board: HabitatId[]): HabitatId | undefined {
  const on = card.homes.filter((h) => board.includes(h));
  return on.length === 1 ? on[0] : undefined;
}

export function eligible(pool: Card[], board: HabitatId[]): Card[] {
  return pool.filter((c) => homeOn(c, board) !== undefined);
}

export interface Round {
  board: HabitatId[];
  cards: Card[];
}

function poolFor(band: Band): Card[] {
  return band <= 1 ? ANIMALS : band === 2 ? FEATURES : DESIGN_FEATURES;
}

function combos<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return items.flatMap((x, i) => combos(items.slice(i + 1), k - 1).map((rest) => [x, ...rest]));
}

/** Every board this band can use: the right number of habitats and enough cards for a full round. */
export function boardsFor(band: Band): HabitatId[][] {
  const pool = poolFor(band);
  const sizes = band === 0 ? [2] : band === 1 ? [3] : band === 2 ? [4] : [4, 5];
  const boards =
    band === 3
      ? sizes.flatMap((k) => combos(LAND_AND_SEA, k - 1).map((b) => [...b, 'wetland' as HabitatId]))
      : sizes.flatMap((k) => combos(LAND_AND_SEA, k));
  return boards.filter((b) => {
    const cards = eligible(pool, b);
    // Enough distinct pictures for a round, and every habitat on the board gets at least one card.
    return new Set(cards.map(glyphKey)).size >= ROUND && b.every((h) => cards.some((c) => homeOn(c, b) === h));
  });
}

/** Two cards that look the same (both 🦊) never share a round; word-only cards are all distinct. */
function glyphKey(c: Card): string {
  return c.glyph ? `${c.glyph}${c.white ? '-white' : ''}` : c.id;
}

/**
 * A round of ten cards for a random board. Cards are dealt round-robin from each habitat so every
 * home gets visitors, with no repeated card and no two cards with the same picture.
 */
export function makeRound(band: Band): Round {
  const board = shuffle(pick(boardsFor(band)));
  const cards = eligible(poolFor(band), board);
  const byHome = board.map((h) => shuffle(cards.filter((c) => homeOn(c, board) === h)));
  const out: Card[] = [];
  const seen = new Set<string>();
  const usedPicture = new Set<string>();
  for (let guard = 0; out.length < ROUND && guard < 200; guard++) {
    const list = byHome[guard % byHome.length];
    const next = list.find((c) => !seen.has(c.id) && !usedPicture.has(glyphKey(c)));
    if (!next) continue;
    seen.add(next.id);
    usedPicture.add(glyphKey(next));
    out.push(next);
  }
  return { board, cards: shuffle(out) };
}

export type Reaction = 'splash' | 'flop' | 'shiver' | 'sweat' | 'unsure';

/** How a card reacts when it's put in the wrong habitat, and what to say. */
export function wrongReaction(card: Card, home: HabitatId, target: HabitatId): { reaction: Reaction; line: string } {
  if (card.kind === 'feature') return { reaction: 'unsure', line: `Not there! ${card.fact}` };
  const lives = `${card.homes.length > 1 ? `Some ${card.plural!.toLowerCase()}` : card.plural} live ${HABITATS[home].where}.`;
  const say = (reaction: Reaction, first: string) => ({ reaction, line: `${first} ${lives}` });
  if (target === 'ocean' && home !== 'polar') return say('splash', "Splash! It can't live in the sea.");
  if (home === 'ocean' && target !== 'polar') return say('flop', 'Flop! It needs to be in the water.');
  if (target === 'polar') return say('shiver', 'Brrr! Too cold here.');
  if (home === 'polar') return say('sweat', 'Phew! Too warm here.');
  if (target === 'desert') return say('sweat', 'Phew! Too hot and dry here.');
  return say('unsure', 'Not this one!');
}
