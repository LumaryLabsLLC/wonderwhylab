import type { Story } from '../types';
import { word } from './choice';

export const pamHasAMap: Story = {
  id: 'pam-has-a-map',
  band: 0,
  title: 'Pam Has a Map',
  cover: '🗺️',
  blurb: 'Pam has a map with an X. What is at the X?',
  focus: 'short a, short i, short o',
  pages: [
    { text: 'Pam has a map.', picture: '👧🗺️' },
    { text: 'On the map is a big X.', picture: '🗺️❌' },
    { text: 'Pam hops to the X.', picture: '👧💨❌' },
    { text: 'Pam digs at the X.', picture: '👧⛏️' },
    { text: 'Pam got a tin.', picture: '👧🥫' },
    { text: 'In the tin is a top!', picture: '🥫✨' },
  ],
  questions: [
    {
      prompt: 'What did Pam have?',
      choices: [word('map', '🗺️'), word('box', '📦'), word('hat', '🎩')],
      answer: 'map',
      hint: 'Read page 1.',
      explain: ['Page 1 says: “Pam has a map.”', 'So Pam had a map.'],
    },
    {
      prompt: 'Where did Pam dig?',
      choices: [word('in a box'), word('on a log'), word('at the X')],
      answer: 'at the X',
      hint: 'What is on the map?',
      explain: ['The map has a big X on it.', 'Page 4 says: “Pam digs at the X.”', 'So Pam dug at the X.'],
    },
    {
      prompt: 'What was in the tin?',
      choices: [word('jam'), word('top'), word('ham')],
      answer: 'top',
      hint: 'Read the last page.',
      explain: ['The last page says: “In the tin is a top!”', 'So it was a top.'],
    },
  ],
};
