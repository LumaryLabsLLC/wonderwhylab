import type { Story } from '../types';
import { word } from './choice';

export const samTheCat: Story = {
  id: 'sam-the-cat',
  band: 0,
  title: 'Sam the Cat',
  cover: '🐱',
  blurb: 'Sam is hot on the mat. Where can Sam nap?',
  focus: 'short a, short i, short o',
  pages: [
    { text: 'Sam is a cat.', picture: '🐱' },
    { text: 'Sam sat on a mat.', picture: '🐱🟫' },
    { text: 'Sam is hot, hot, hot!', picture: '☀️🐱🥵' },
    { text: 'Sam got a box.', picture: '🐱📦' },
    { text: 'Sam sits in the box.', picture: '📦🐱' },
    { text: 'Sam naps in the box.', picture: '📦😴' },
  ],
  questions: [
    {
      prompt: 'Who is Sam?',
      choices: [word('pig', '🐷'), word('cat', '🐱'), word('dog', '🐶')],
      answer: 'cat',
      hint: 'Read page 1 again: “Sam is a …”',
      explain: ['Page 1 says: “Sam is a cat.”', 'So Sam is a cat.'],
    },
    {
      prompt: 'Why did Sam get a box?',
      choices: [word('Sam was wet.'), word('Sam was sad.'), word('Sam was hot.')],
      answer: 'Sam was hot.',
      hint: 'Look at page 3. How did Sam feel on the mat?',
      explain: ['Page 3 says: “Sam is hot, hot, hot!”', 'A box is a cool, shady spot.', 'Sam got a box because Sam was hot.'],
    },
    {
      prompt: 'What did Sam do in the box?',
      choices: [word('nap', '😴'), word('dig', '⛏️'), word('hop', '🐸')],
      answer: 'nap',
      hint: 'Read the last page.',
      explain: ['The last page says: “Sam naps in the box.”', 'So Sam had a nap.'],
    },
  ],
};
