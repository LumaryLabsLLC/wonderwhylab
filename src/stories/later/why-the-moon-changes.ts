import type { Story } from '../types';
import { say } from './choice';

/**
 * An original myth-style "why" tale (a pourquoi story) set on an invented island,
 * followed by the real science, so children can compare a story explanation with a scientific one.
 */
export const whyTheMoonChanges: Story = {
  id: 'why-the-moon-changes',
  band: 3,
  title: 'Why the Moon Changes Shape',
  cover: '🌕🌊✨',
  blurb: 'An invented myth about a generous Moon, and what scientists say really happens.',
  words: [
    { word: 'legend', meaning: 'an old story passed down over time that may not be true' },
    { word: 'generous', meaning: 'happy to give and share with others' },
    { word: 'wane', meaning: 'to grow gradually smaller' },
    { word: 'wax', meaning: 'to grow gradually bigger' },
  ],
  pages: [
    {
      text: 'This is a myth-style tale, the kind of story people have told for thousands of years to explain the sky. Long ago, the tale says, the Moon was always perfectly round and bright, and she was proud of her silver light.',
      picture: '🌕✨',
    },
    {
      text: 'Each night the creatures of the island of Tavana looked up at her. Baby turtles followed her glow to find the sea. Fishers steered their canoes home by it. Owls hunted beneath it.',
      picture: '🐢🛶🦉',
    },
    {
      text: 'One night the Moon heard the deep sea sighing. “Down here it is always dark,” said the fish. “We have never seen even a glimmer of light.”',
      picture: '🐟🌑',
    },
    {
      text: 'The Moon felt sorry for them. She was generous, so she broke off a slice of her light and let it fall into the sea, where it scattered into a thousand glowing sparks.',
      picture: '🌖🌊✨',
    },
    {
      text: 'Night after night she gave away another slice, until only a thin curve remained. Then, one night, she gave away the very last of it, and the sky was dark.',
      picture: '🌘🌑',
    },
    {
      text: 'The island creatures were worried. But the Moon was only resting. Slowly, slice by slice, the grateful sea creatures sent light back up to her on the waves, and she grew round again.',
      picture: '🌒🌓🌔🌕',
    },
    {
      text: 'And that, the legend says, is why the Moon wanes thinner and waxes full again every month, and why the sea sometimes sparkles at night.',
      picture: '🌕🌊',
    },
    {
      text: 'Scientists explain it differently. The Moon makes no light of its own; it reflects light from the Sun. As it travels around the Earth, we see different amounts of its sunlit half, which gives us the phases. The sparkling sea is caused by tiny glowing plankton.',
      picture: '🔭🌍🌙',
    },
  ],
  questions: [
    {
      prompt: 'In the tale, why did the Moon give away her light?',
      choices: [
        say('She felt sorry for the sea creatures in the dark.'),
        say('She was tired of being bright.'),
        say('The Sun ordered her to.'),
      ],
      answer: 'She felt sorry for the sea creatures in the dark.',
      hint: 'Read pages 3 and 4. What did the Moon hear, and how did she feel?',
      explain: ['On page 3 the fish say it is “always dark” in the deep sea.', 'Page 4 says “The Moon felt sorry for them.”', 'So she gave her light because she felt sorry for the sea creatures in the dark.'],
    },
    {
      prompt: 'What happened right after the Moon gave away the last of her light?',
      choices: [
        say('The sky was dark and the island creatures worried.'),
        say('The Moon fell into the sea.'),
        say('The Sun came out at night.'),
      ],
      answer: 'The sky was dark and the island creatures worried.',
      hint: 'Read the end of page 5 and the start of page 6.',
      explain: ['Page 5 ends: “the sky was dark.”', 'Page 6 begins: “The island creatures were worried.”', 'So next, the sky was dark and the island creatures worried.'],
    },
    {
      prompt: 'If the Moon “wanes”, it…',
      choices: [say('grows gradually smaller'), say('grows gradually bigger'), say('glows much brighter')],
      answer: 'grows gradually smaller',
      hint: 'Page 7 pairs “wanes thinner” with “waxes full”. Which one is getting thinner?',
      explain: ['Page 7 says the Moon “wanes thinner and waxes full again.”', 'Waning goes with getting thinner, so it means grows gradually smaller.'],
    },
    {
      prompt: 'Why does the author include page 8?',
      choices: [
        say('To show how science explains the Moon’s phases'),
        say('To add a new adventure to the myth'),
        say('To prove that the myth is true'),
      ],
      answer: 'To show how science explains the Moon’s phases',
      hint: 'Page 8 begins “Scientists explain it differently.” What does the rest of the page do?',
      explain: ['Pages 1 to 7 tell an invented myth.', 'Page 8 says “Scientists explain it differently” and gives the real reasons.', 'So it is there to show how science explains the Moon’s phases.'],
    },
    {
      prompt: 'According to science, why does the Moon seem to change shape?',
      choices: [
        say('We see different amounts of its sunlit half as it orbits Earth.'),
        say('It gives slices of its light to the sea.'),
        say('Clouds cover different parts of it each night.'),
      ],
      answer: 'We see different amounts of its sunlit half as it orbits Earth.',
      hint: 'Use only the science on page 8, not the myth.',
      explain: ['Page 8 says the Moon reflects sunlight; it makes no light of its own.', 'As it travels around the Earth, “we see different amounts of its sunlit half.”', 'So the answer: we see different amounts of its sunlit half as it orbits Earth.'],
    },
  ],
};
