import type { Story } from '../types';
import { word } from './choice';

export const nedAndTheJug: Story = {
  id: 'ned-and-the-jug',
  band: 1,
  title: 'Ned and the Jug',
  cover: '🐶',
  blurb: 'A bun is in a big jug. Can Ned get it?',
  focus: 'short e, short u',
  pages: [
    { text: 'Ned is a pup. Ned has a red cup.', picture: '🐶🥤' },
    { text: 'A bun is in a big jug.', picture: '🍞🏺' },
    { text: 'Ned can not get the bun.', picture: '🐶🏺' },
    { text: 'Ned tugs and tugs.', picture: '🐶💪' },
    { text: 'The jug is big. Ned can not fit in it.', picture: '🐶🏺❓' },
    { text: 'Ned tips the jug.', picture: '🐶↘️🏺' },
    { text: 'The bun is on the rug!', picture: '🍞🟥' },
    { text: 'Ned has fun. Yum, yum!', picture: '🐶😋' },
  ],
  questions: [
    {
      prompt: 'Who is Ned?',
      choices: [word('a cat'), word('a pup'), word('a hen')],
      answer: 'a pup',
      hint: 'Read page 1 again.',
      explain: ['Page 1 says: “Ned is a pup.”', 'So Ned is a pup.'],
    },
    {
      prompt: 'Where was the bun?',
      choices: [word('in a jug'), word('in a cup'), word('on a bed')],
      answer: 'in a jug',
      hint: 'Look at page 2.',
      explain: ['Page 2 says: “A bun is in a big jug.”', 'So the bun was in a jug.'],
    },
    {
      prompt: 'How did Ned get the bun out?',
      choices: [word('He digs a pit.'), word('He tips the jug.'), word('He tugs his cup.')],
      answer: 'He tips the jug.',
      hint: 'Tugging did not work. What did Ned try next?',
      explain: ['Ned tugs and tugs, but the bun stays in.', 'Then Ned tips the jug, and the bun lands on the rug.', 'He tips the jug.'],
    },
    {
      prompt: 'How did Ned feel at the end?',
      choices: [word('He was sad.'), word('He was mad.'), word('He had fun.')],
      answer: 'He had fun.',
      hint: 'Read the last page.',
      explain: ['The last page says: “Ned has fun. Yum, yum!”', 'So he had fun.'],
    },
  ],
};
