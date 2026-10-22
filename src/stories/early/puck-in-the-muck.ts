import type { Story } from '../types';
import { word } from './choice';

export const puckInTheMuck: Story = {
  id: 'puck-in-the-muck',
  band: 1,
  title: 'Puck in the Muck',
  cover: '🦆',
  blurb: 'Puck the duck is stuck! How can Rick help?',
  focus: 'ck, ng',
  pages: [
    { text: 'Rick has a duck. The duck is Puck.', picture: '👦🦆' },
    { text: 'Puck can swim and dig.', picture: '🦆💦' },
    { text: 'Puck gets stuck in the muck!', picture: '🦆🟫' },
    { text: 'Puck flaps and flaps.', picture: '🦆💨' },
    { text: 'Rick gets a long stick.', picture: '👦🌿' },
    { text: 'Puck sits on the stick.', picture: '🦆🌿' },
    { text: 'Rick tugs. Puck is not stuck!', picture: '👦💪🦆' },
    { text: 'Puck naps in the sun. Rick pats Puck.', picture: '🦆☀️😴' },
  ],
  questions: [
    {
      prompt: 'Who is Puck?',
      choices: [word('a dog', '🐶'), word('a frog', '🐸'), word('a duck', '🦆')],
      answer: 'a duck',
      hint: 'Read page 1.',
      explain: ['Page 1 says: “Rick has a duck. The duck is Puck.”', 'So Puck is a duck.'],
    },
    {
      prompt: 'Where did Puck get stuck?',
      choices: [word('in the muck'), word('in a box'), word('on a ship')],
      answer: 'in the muck',
      hint: 'Look at page 3.',
      explain: ['Page 3 says: “Puck gets stuck in the muck!”', 'So Puck got stuck in the muck.'],
    },
    {
      prompt: 'What did Rick use to help Puck?',
      choices: [word('a net'), word('a long stick'), word('a cup')],
      answer: 'a long stick',
      hint: 'Read page 5.',
      explain: ['Page 5 says: “Rick gets a long stick.”', 'Puck sits on the stick and Rick tugs.', 'He used a long stick.'],
    },
    {
      prompt: 'What did Puck do at the end?',
      choices: [word('Puck naps in the sun.'), word('Puck gets stuck.'), word('Puck swims off.')],
      answer: 'Puck naps in the sun.',
      hint: 'Read the last page.',
      explain: ['Once Puck is not stuck, he can rest.', 'The last page says: “Puck naps in the sun.”'],
    },
  ],
};
