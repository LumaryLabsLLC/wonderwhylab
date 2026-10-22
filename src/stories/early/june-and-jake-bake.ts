import type { Story } from '../types';
import { word } from './choice';

export const juneAndJakeBake: Story = {
  id: 'june-and-jake-bake',
  band: 1,
  title: 'June and Jake Bake',
  cover: '🎂',
  blurb: 'Gran is at the gate, and the cake has a hole!',
  focus: 'magic e: a_e, i_e, o_e, u_e',
  pages: [
    { text: 'June and Jake bake a cake.', picture: '👧👦🎂' },
    { text: 'They use a tube of jam.', picture: '🧴🍓' },
    { text: 'They bake it. The cake is fine.', picture: '🎂🔥' },
    { text: 'Ring, ring! Gran is at the gate.', picture: '🔔👵' },
    { text: 'No! The cake has a big hole.', picture: '🎂🕳️' },
    { text: 'Jake has a plan. He drops jam in the hole.', picture: '👦🍓' },
    { text: 'Gran bites the cake. Yum!', picture: '👵🎂😋' },
    { text: 'Gran smiles. It is the best cake!', picture: '👵😊🎂' },
  ],
  questions: [
    {
      prompt: 'What did June and Jake bake?',
      choices: [word('a bun'), word('a cake'), word('a muffin')],
      answer: 'a cake',
      hint: 'Read page 1.',
      explain: ['Page 1 says: “June and Jake bake a cake.”', 'So they baked a cake.'],
    },
    {
      prompt: 'Who came to the gate?',
      choices: [word('Gran'), word('Mike'), word('Dad')],
      answer: 'Gran',
      hint: 'Look at page 4.',
      explain: ['Page 4 says: “Ring, ring! Gran is at the gate.”', 'So it was Gran.'],
    },
    {
      prompt: 'What was wrong with the cake?',
      choices: [word('It was wet.'), word('It had a big hole.'), word('It fell.')],
      answer: 'It had a big hole.',
      hint: 'Read page 5.',
      explain: ['Page 5 says: “The cake has a big hole.”', 'So it had a big hole.'],
    },
    {
      prompt: 'How did Jake fix the cake?',
      choices: [word('He bakes a bun.'), word('He hides the cake.'), word('He drops jam in the hole.')],
      answer: 'He drops jam in the hole.',
      hint: 'What was Jake’s plan on page 6?',
      explain: ['The cake had a hole.', 'Page 6 says: “He drops jam in the hole.”', 'Gran liked it: “It is the best cake!”'],
    },
  ],
};
