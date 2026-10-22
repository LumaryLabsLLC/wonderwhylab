import type { Story } from '../types';
import { word } from './choice';

export const tenCups: Story = {
  id: 'ten-cups',
  band: 1,
  title: 'Ten Cups',
  cover: '🥤',
  blurb: 'Glen and Fran set up ten cups. Up, up, up!',
  focus: 'blends: gl, fr, st, fl, dr, gr',
  pages: [
    { text: 'Glen and Fran get ten cups.', picture: '👦👧🥤' },
    { text: 'Glen sets a cup on a cup.', picture: '👦🥤🥤' },
    { text: 'Fran sets a cup on top.', picture: '👧🥤' },
    { text: 'Up, up, up the cups go!', picture: '🥤🥤🥤⬆️' },
    { text: 'Flop! The cups drop.', picture: '💥🥤' },
    { text: 'Glen and Fran do not get mad.', picture: '👦👧🙂' },
    { text: 'They grin. They set up the cups.', picture: '😁🥤🥤🥤' },
  ],
  questions: [
    {
      prompt: 'What did Glen and Fran set up?',
      choices: [word('hats'), word('cups'), word('pots')],
      answer: 'cups',
      hint: 'Read page 1.',
      explain: ['Page 1 says: “Glen and Fran get ten cups.”', 'So they set up cups.'],
    },
    {
      prompt: 'What happened to the cups?',
      choices: [word('They drop.'), word('They get wet.'), word('They hid.')],
      answer: 'They drop.',
      hint: 'Look at page 5. What sound did the cups make?',
      explain: ['The cups go up, up, up.', 'Page 5 says: “Flop! The cups drop.”', 'They drop.'],
    },
    {
      prompt: 'What did Glen and Fran do when the cups fell?',
      choices: [word('They sob.'), word('They grin.'), word('They get mad.')],
      answer: 'They grin.',
      hint: 'Read page 6 and page 7.',
      explain: ['Page 6 says they do not get mad.', 'Page 7 says: “They grin.”', 'They grin.'],
    },
    {
      prompt: 'What did they do next?',
      choices: [word('They had a nap.'), word('They ran to Mom.'), word('They set up the cups.')],
      answer: 'They set up the cups.',
      hint: 'Read the last page.',
      explain: ['The cups fell, but Glen and Fran did not give up.', 'The last page says: “They set up the cups.”'],
    },
  ],
};
