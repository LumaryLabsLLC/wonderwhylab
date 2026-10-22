import type { Story } from '../types';
import { word } from './choice';

export const pipCanHop: Story = {
  id: 'pip-can-hop',
  band: 0,
  title: 'Pip Can Hop',
  cover: '🐸',
  blurb: 'Pip is on a log. Where is Mom?',
  focus: 'short i, short o, short a',
  pages: [
    { text: 'Pip is on a log.', picture: '🐸🌿' },
    { text: 'Mom is not on the log.', picture: '🐸❓' },
    { text: 'Pip can hop.', picture: '🐸💨' },
    { text: 'Pip hops to a pad.', picture: '🐸🍃' },
    { text: 'Mom is not on the pad.', picture: '🍃❓' },
    { text: 'Pip hops on. Mom is on a big log!', picture: '🐸💚🐸' },
  ],
  questions: [
    {
      prompt: 'Who did Pip look for?',
      choices: [word('Dad'), word('Sam'), word('Mom')],
      answer: 'Mom',
      hint: 'Look at page 2. Who is not on the log?',
      explain: ['Page 2 says: “Mom is not on the log.”', 'Pip hops and hops to find Mom.'],
    },
    {
      prompt: 'What can Pip do?',
      choices: [word('hop', '🐸'), word('dig', '⛏️'), word('nap', '😴')],
      answer: 'hop',
      hint: 'Read page 3.',
      explain: ['Page 3 says: “Pip can hop.”', 'So Pip can hop.'],
    },
    {
      prompt: 'Was Mom on the pad?',
      choices: [word('yes'), word('no')],
      answer: 'no',
      hint: 'Look at page 5.',
      explain: ['Page 5 says: “Mom is not on the pad.”', 'So the answer is no. Mom was on a big log.'],
    },
  ],
};
