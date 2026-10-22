import type { Story } from '../types';
import { word } from './choice';

export const dotDigs: Story = {
  id: 'dot-digs',
  band: 0,
  title: 'Dot Digs',
  cover: '🐶',
  blurb: 'Tim has no hat. Can Dot help?',
  focus: 'short o, short i, short a',
  pages: [
    { text: 'Dot is a dog.', picture: '🐶' },
    { text: 'Tim has no hat.', picture: '🧒❓' },
    { text: 'Dot can dig.', picture: '🐶⛏️' },
    { text: 'Dot digs a pit.', picture: '🐶🕳️' },
    { text: 'In the pit is a hat!', picture: '🕳️🎩' },
    { text: 'Tim pats Dot.', picture: '🧒🐶❤️' },
  ],
  questions: [
    {
      prompt: 'Who is Dot?',
      choices: [word('cat', '🐱'), word('dog', '🐶'), word('pig', '🐷')],
      answer: 'dog',
      hint: 'Read page 1: “Dot is a …”',
      explain: ['Page 1 says: “Dot is a dog.”', 'So Dot is a dog.'],
    },
    {
      prompt: 'What did Tim not have?',
      choices: [word('box', '📦'), word('map', '🗺️'), word('hat', '🎩')],
      answer: 'hat',
      hint: 'Look at page 2.',
      explain: ['Page 2 says: “Tim has no hat.”', 'So Tim did not have a hat.'],
    },
    {
      prompt: 'What did Tim do at the end?',
      choices: [word('He naps.'), word('He pats Dot.'), word('He hops.')],
      answer: 'He pats Dot.',
      hint: 'Read the last page.',
      explain: ['Dot dug up a hat for Tim.', 'The last page says: “Tim pats Dot.”', 'He pats Dot to say thank you.'],
    },
  ],
};
