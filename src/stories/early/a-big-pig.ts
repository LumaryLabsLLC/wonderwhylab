import type { Story } from '../types';
import { word } from './choice';

export const aBigPig: Story = {
  id: 'a-big-pig',
  band: 0,
  title: 'A Big Pig',
  cover: '🐷',
  blurb: 'Pig has a tin. What is in it?',
  focus: 'short i, short a, short o',
  pages: [
    { text: 'Pig is big.', picture: '🐷' },
    { text: 'Pig has a tin.', picture: '🐷🥫' },
    { text: 'Pig can not pop the lid.', picture: '🐷🥫❓' },
    { text: 'Pig taps the lid.', picture: '🐷👆🥫' },
    { text: 'Pop! The lid pops!', picture: '🥫💥' },
    { text: 'In the tin is jam!', picture: '🥫🍯' },
  ],
  questions: [
    {
      prompt: 'What did Pig have?',
      choices: [word('hat', '🎩'), word('box', '📦'), word('tin', '🥫')],
      answer: 'tin',
      hint: 'Look at page 2.',
      explain: ['Page 2 says: “Pig has a tin.”', 'So Pig had a tin.'],
    },
    {
      prompt: 'What did Pig do to the lid?',
      choices: [word('tap', '👆'), word('dig', '⛏️'), word('sit', '🪑')],
      answer: 'tap',
      hint: 'Pig could not pop the lid. What did Pig try next?',
      explain: ['Pig could not pop the lid.', 'So Pig taps the lid, and then it pops!', 'Pig did tap it.'],
    },
    {
      prompt: 'What was in the tin?',
      choices: [word('ham', '🍖'), word('jam', '🍯'), word('pin', '📍')],
      answer: 'jam',
      hint: 'Read the last page.',
      explain: ['The last page says: “In the tin is jam!”', 'So it was jam.'],
    },
  ],
};
