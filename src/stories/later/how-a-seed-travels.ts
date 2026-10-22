import type { Story } from '../types';
import { say } from './choice';

/** A non-fiction story about seed dispersal. */
export const howASeedTravels: Story = {
  id: 'how-a-seed-travels',
  band: 2,
  title: 'How a Seed Travels',
  cover: '🌼🌬️🌱',
  blurb: 'Plants can’t walk, but their seeds fly, float, hitch rides and get buried.',
  words: [
    { word: 'disperse', meaning: 'to spread out over a wide area' },
    { word: 'journey', meaning: 'a trip from one place to another' },
    { word: 'sprout', meaning: 'to begin to grow' },
  ],
  pages: [
    {
      text: 'A plant cannot walk, but its seeds can travel a long way. When seeds disperse far from the parent plant, each new plant gets space, light and water of its own.',
      picture: '🌱🗺️',
    },
    {
      text: 'Some seeds fly. A dandelion seed has a tiny, fluffy parachute. When the wind blows, the parachutes lift off and can drift a long way before they land.',
      picture: '🌼🌬️',
    },
    {
      text: 'Maple seeds have a wing. As they fall, they spin like little helicopters. Spinning slows them down, so the wind has time to carry them away from the tree.',
      picture: '🍁🌀',
    },
    {
      text: 'Some seeds hitch a ride. Burdock seeds are covered in tiny hooks that grab onto animal fur and even socks. Later they drop off somewhere new.',
      picture: '🐕🧦',
    },
    {
      text: 'Some seeds float. A coconut has a thick, airy husk that helps it bob on the waves. It can drift across the ocean and sprout on a faraway beach.',
      picture: '🥥🌊🏝️',
    },
    {
      text: 'Some seeds are eaten! Birds swallow juicy berries, and many of the seeds pass through their bodies unharmed. They are dropped far away, often with a little natural fertiliser.',
      picture: '🐦🍒',
    },
    {
      text: 'Squirrels bury acorns to eat in winter, but they forget some. Those forgotten acorns can sprout into new oak trees. Wind, water and animals: seeds use them all on their journey.',
      picture: '🐿️🌰🌳',
    },
  ],
  questions: [
    {
      prompt: 'How does a dandelion seed travel?',
      choices: [
        say('It drifts on the wind with a fluffy parachute.'),
        say('It floats across the ocean.'),
        say('It hooks onto animal fur.'),
      ],
      answer: 'It drifts on the wind with a fluffy parachute.',
      hint: 'Read page 2 about dandelions.',
      explain: ['Page 2 says a dandelion seed has “a tiny, fluffy parachute.”', 'When the wind blows, it lifts off, so it drifts on the wind with a fluffy parachute.'],
    },
    {
      prompt: 'Why is it good for seeds to travel far from the parent plant?',
      choices: [
        say('Each new plant gets its own space, light and water.'),
        say('Seeds like to see new places.'),
        say('The parent plant does not like its seeds.'),
      ],
      answer: 'Each new plant gets its own space, light and water.',
      hint: 'The reason is on page 1.',
      explain: ['Page 1 says that when seeds disperse, “each new plant gets space, light and water of its own.”', 'So it is good because each new plant gets its own space, light and water.'],
    },
    {
      prompt: 'Which seed can float across the ocean?',
      choices: [say('a coconut'), say('a maple seed'), say('a burdock seed')],
      answer: 'a coconut',
      hint: 'Find the page about seeds that float.',
      explain: ['Page 5 says a coconut has “a thick, airy husk” that helps it float.', 'It can drift across the ocean, so the answer is a coconut.'],
    },
    {
      prompt: 'How do squirrels help new oak trees grow?',
      choices: [
        say('They bury acorns and forget some, which can sprout.'),
        say('They water the young trees.'),
        say('They eat every acorn they find.'),
      ],
      answer: 'They bury acorns and forget some, which can sprout.',
      hint: 'Read page 7. What happens to the acorns squirrels forget?',
      explain: ['Page 7 says squirrels bury acorns “but they forget some.”', 'Those forgotten acorns “can sprout into new oak trees.”', 'So they bury acorns and forget some, which can sprout.'],
    },
  ],
};
