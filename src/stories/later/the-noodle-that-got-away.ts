import type { Story } from '../types';
import { say } from './choice';

/** A silly story. */
export const theNoodleThatGotAway: Story = {
  id: 'the-noodle-that-got-away',
  band: 2,
  title: 'The Noodle That Got Away',
  cover: '🍜🏃',
  blurb: 'Chef Rosa makes the longest noodle in the world. Then it runs off!',
  words: [
    { word: 'wobble', meaning: 'to shake or move from side to side' },
    { word: 'astonished', meaning: 'very, very surprised' },
    { word: 'chaos', meaning: 'a big, messy muddle where nothing is in order' },
  ],
  pages: [
    {
      text: 'Chef Rosa ran the busiest noodle shop in town. One morning she decided to make the longest noodle in the world.',
      picture: '👩‍🍳🍜',
    },
    {
      text: 'She stretched the dough. She pulled it. She stretched it again, until it reached from the kitchen all the way to the front door. It began to wobble like a giant jelly snake.',
      picture: '🍜🐍',
    },
    {
      text: 'Just then, a delivery van honked outside. The noodle got such a fright that it slithered out of the door and down the street!',
      picture: '🚚🍜',
    },
    {
      text: '“Stop that noodle!” shouted Rosa. A boy on a scooter tried to grab it, but it slipped right through his fingers. A dog chased it, barking happily.',
      picture: '🛴🐕🍜',
    },
    {
      text: 'The noodle wiggled through the market, past astonished shoppers. It looped around a lamppost and knocked the hat off a very surprised man.',
      picture: '🧺🎩😲',
    },
    {
      text: 'There was chaos everywhere. Apples rolled across the road, pigeons flapped, and the mayor dropped her ice cream.',
      picture: '🍎🐦🍦',
    },
    {
      text: 'At last the noodle stopped in the park, where three children were looking for a skipping rope. They each grabbed an end and began to jump. It was perfect!',
      picture: '🌳🧒🧒🧒',
    },
    {
      text: 'Chef Rosa laughed so hard that she had to sit down. “Keep it,” she said. “Tomorrow I’ll make normal-sized noodles… probably.”',
      picture: '😂👩‍🍳',
    },
  ],
  questions: [
    {
      prompt: 'What did Chef Rosa decide to make?',
      choices: [say('the longest noodle in the world'), say('the biggest pizza in town'), say('a giant birthday cake')],
      answer: 'the longest noodle in the world',
      hint: 'Read page 1.',
      explain: ['Page 1 says she decided to make “the longest noodle in the world.”', 'So she wanted to make the longest noodle in the world.'],
    },
    {
      prompt: 'What made the noodle run away?',
      choices: [say('A delivery van honked.'), say('A dog barked at it.'), say('Rosa sneezed on it.')],
      answer: 'A delivery van honked.',
      hint: 'Look at page 3. What happened “just then”?',
      explain: ['Page 3 says a delivery van honked outside.', 'The noodle “got such a fright” that it ran off, so the answer is: a delivery van honked.'],
    },
    {
      prompt: 'The shoppers were “astonished” (page 5). This means they were…',
      choices: [say('very, very surprised'), say('very sleepy'), say('a little bored')],
      answer: 'very, very surprised',
      hint: 'How would you feel if a noodle wiggled past you in the market?',
      explain: ['A noodle running through a market is a very strange sight.', 'The man whose hat it knocked off is called “very surprised” too, so astonished means very, very surprised.'],
    },
    {
      prompt: 'How was the noodle used in the end?',
      choices: [say('as a skipping rope'), say('as dinner for the mayor'), say('as a scarf for the dog')],
      answer: 'as a skipping rope',
      hint: 'Read page 7. What were the children looking for?',
      explain: ['Page 7 says the children were looking for a skipping rope.', 'They grabbed an end each and began to jump, so the noodle was used as a skipping rope.'],
    },
  ],
};
