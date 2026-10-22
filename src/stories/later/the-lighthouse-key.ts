import type { Story } from '../types';
import { say } from './choice';

export const theLighthouseKey: Story = {
  id: 'the-lighthouse-key',
  band: 2,
  title: 'The Lighthouse Key',
  cover: '🏝️💡',
  blurb: 'A storm is coming, and the key to the lighthouse lamp is missing.',
  words: [
    { word: 'gust', meaning: 'a sudden, strong rush of wind' },
    { word: 'beacon', meaning: 'a bright light that guides or warns people' },
    { word: 'determined', meaning: 'not giving up, even when something is hard' },
  ],
  pages: [
    {
      text: 'Amara spent every summer with her grandfather on a tiny, windy island. His job was to keep the old lighthouse shining, so that boats could find their way home.',
      picture: '🏝️👧👴',
    },
    {
      text: 'One evening, black clouds rolled in from the sea. A strong gust of wind rattled the windows, and rain began to pour.',
      picture: '⛈️🌊',
    },
    {
      text: 'Grandpa reached for the brass key that opened the lamp room. But the hook by the door was empty! “Without that key, I can’t light the beacon,” he said.',
      picture: '🔑❓👴',
    },
    {
      text: 'Amara was determined to help. She thought about everywhere she had been that day: the garden, the beach and the kitchen.',
      picture: '👧🤔',
    },
    {
      text: 'In the kitchen she found sandy paw prints leading to the dog’s bed. Under Biscuit’s blanket lay a pile of treasures: a sock, a shell… and the brass key!',
      picture: '🐕🧦🔑',
    },
    {
      text: 'Amara raced up the spiral stairs with Grandpa. Together they turned the key, and the great lamp blazed out across the dark water.',
      picture: '💡🌊',
    },
    {
      text: 'Far out at sea, a little fishing boat turned towards the light and came safely into the harbour. “You saved the day,” said Grandpa, “and so did your clever thinking.”',
      picture: '⛵🏠',
    },
  ],
  questions: [
    {
      prompt: 'Why was the lighthouse important?',
      choices: [say('It helped boats find their way home.'), say('It was a hotel for visitors.'), say('It kept the rain off the island.')],
      answer: 'It helped boats find their way home.',
      hint: 'Read page 1 again. What was Grandpa’s job for?',
      explain: ['Page 1 says Grandpa kept the lighthouse shining “so that boats could find their way home.”', 'So the lighthouse helped boats find their way home.'],
    },
    {
      prompt: 'What was the problem in the story?',
      choices: [say('The key to the lamp room was missing.'), say('The lamp was broken.'), say('Grandpa was too ill to climb.')],
      answer: 'The key to the lamp room was missing.',
      hint: 'Look at page 3. What was not on the hook?',
      explain: ['Page 3 says the hook by the door was empty.', 'Grandpa said he could not light the beacon “without that key.”', 'The problem: the key to the lamp room was missing.'],
    },
    {
      prompt: 'On page 2, a “gust” of wind is…',
      choices: [say('a sudden, strong rush of wind'), say('a gentle, warm breeze'), say('a kind of rain cloud')],
      answer: 'a sudden, strong rush of wind',
      hint: 'Think about what the gust did to the windows.',
      explain: ['The gust “rattled the windows.”', 'A gentle breeze could not do that, so a gust is a sudden, strong rush of wind.'],
    },
    {
      prompt: 'Who most likely took the key?',
      choices: [say('Biscuit the dog'), say('Grandpa'), say('a fisherman')],
      answer: 'Biscuit the dog',
      hint: 'Use the clues on page 5: the paw prints and the hiding place.',
      explain: ['Sandy paw prints led to the dog’s bed.', 'The key was under Biscuit’s blanket with a sock and a shell he had collected.', 'So Biscuit the dog most likely took it.'],
    },
  ],
};
