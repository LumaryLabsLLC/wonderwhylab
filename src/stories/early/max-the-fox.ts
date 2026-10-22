import type { Story } from '../types';
import { word } from './choice';

export const maxTheFox: Story = {
  id: 'max-the-fox',
  band: 0,
  title: 'Max the Fox',
  cover: '🦊',
  blurb: 'Max hid in a box. Can Mom get Max to pop up?',
  focus: 'short a, short i, short o, x',
  pages: [
    { text: 'Max is a fox.', picture: '🦊' },
    { text: 'Max hid in a box.', picture: '📦🦊' },
    { text: 'Mom said, “Max! Max!”', picture: '🦊🗣️' },
    { text: 'Max sat in the box.', picture: '📦🦊' },
    { text: 'Mom has ham.', picture: '🦊🍖' },
    { text: 'Max ran to Mom!', picture: '🦊💨🍖' },
  ],
  questions: [
    {
      prompt: 'Where did Max hide?',
      choices: [word('in a pit'), word('in a box'), word('on a log')],
      answer: 'in a box',
      hint: 'Look at page 2.',
      explain: ['Page 2 says: “Max hid in a box.”', 'So Max hid in a box.'],
    },
    {
      prompt: 'Who said, “Max! Max!”?',
      choices: [word('Mom'), word('Tim'), word('Pip')],
      answer: 'Mom',
      hint: 'Read page 3.',
      explain: ['Page 3 says: “Mom said, Max! Max!”', 'So it was Mom.'],
    },
    {
      prompt: 'Why did Max run to Mom?',
      choices: [word('Max was wet.'), word('The box was hot.'), word('Mom had ham.')],
      answer: 'Mom had ham.',
      hint: 'What does Mom have on page 5?',
      explain: ['Max sat in the box when Mom said “Max!”', 'Then page 5 says Mom has ham.', 'Max ran to Mom because Mom had ham.'],
    },
  ],
};
