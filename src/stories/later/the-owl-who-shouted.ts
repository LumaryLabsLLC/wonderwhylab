import type { Story } from '../types';
import { say } from './choice';

/** An original fable. */
export const theOwlWhoShouted: Story = {
  id: 'the-owl-who-shouted',
  band: 2,
  title: 'The Owl Who Shouted',
  cover: '🦉📢',
  blurb: 'A fable about a loud owl, a quiet mouse and a stormy night.',
  words: [
    { word: 'boast', meaning: 'to talk too proudly about yourself' },
    { word: 'scatter', meaning: 'to move quickly in different directions' },
    { word: 'wise', meaning: 'knowing a lot and making good choices' },
  ],
  pages: [
    {
      text: 'Long ago, in a forest of tall oaks, lived an owl named Hoot who loved the sound of his own voice. Every night he would boast to the other animals. “I am the wisest bird in the forest!”',
      picture: '🦉🌳',
    },
    {
      text: 'Whenever anyone asked a question, Hoot shouted out an answer before they had even finished. He never stopped to listen.',
      picture: '🦉📢',
    },
    {
      text: 'Mira the mouse was small and quiet. She spent her evenings listening: to the wind, to the stream, and to the stories the old tortoise told.',
      picture: '🐭👂🐢',
    },
    {
      text: 'One night a great storm blew in, and the animals had to scatter to find shelter. “Follow me!” shouted Hoot, flapping towards the tallest tree.',
      picture: '⛈️🦉',
    },
    {
      text: '“Wait!” squeaked Mira. “The old tortoise says lightning often strikes the tallest trees. The cave by the stream is safer.” Most of the animals followed Mira to the cave.',
      picture: '🐭🕳️',
    },
    {
      text: 'Lightning cracked against the tallest oak. Hoot, soaked and shaking, crept into the cave. “Thank you, Mira,” he whispered. “Perhaps the wisest thing is to listen.”',
      picture: '⚡🦉🐭',
    },
    {
      text: 'From that night on, Hoot still talked, but he listened first. Moral: listening carefully can make you wiser than shouting loudly.',
      picture: '🦉👂🐭',
    },
  ],
  questions: [
    {
      prompt: 'What did Hoot love at the start of the story?',
      choices: [say('the sound of his own voice'), say('listening to the stream'), say('sleeping all day')],
      answer: 'the sound of his own voice',
      hint: 'Read the first sentence on page 1.',
      explain: ['Page 1 says Hoot “loved the sound of his own voice.”', 'So he loved the sound of his own voice.'],
    },
    {
      prompt: 'How was Mira different from Hoot?',
      choices: [say('She listened carefully.'), say('She shouted loudly.'), say('She could fly.')],
      answer: 'She listened carefully.',
      hint: 'Compare page 2 with page 3.',
      explain: ['Page 2 says Hoot “never stopped to listen.”', 'Page 3 says Mira spent her evenings listening.', 'So Mira was different because she listened carefully.'],
    },
    {
      prompt: 'Why did Mira say not to go to the tallest tree?',
      choices: [say('Lightning often strikes the tallest trees.'), say('The tree was full of bees.'), say('The tree was too far away.')],
      answer: 'Lightning often strikes the tallest trees.',
      hint: 'What had Mira heard from the old tortoise? Look at page 5.',
      explain: ['Mira said the old tortoise says “lightning often strikes the tallest trees.”', 'So the tallest tree was dangerous in a storm: lightning often strikes the tallest trees.'],
    },
    {
      prompt: 'What is the moral of this fable?',
      choices: [
        say('Listening carefully can make you wiser than shouting.'),
        say('The biggest animal is always right.'),
        say('Storms are fun to watch.'),
      ],
      answer: 'Listening carefully can make you wiser than shouting.',
      hint: 'A fable often tells you its moral at the end.',
      explain: ['The last page says: “listening carefully can make you wiser than shouting loudly.”', 'Hoot learned this when Mira’s listening kept the animals safe, so the moral is: listening carefully can make you wiser than shouting.'],
    },
  ],
};
