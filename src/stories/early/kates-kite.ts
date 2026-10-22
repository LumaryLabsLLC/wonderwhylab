import type { Story } from '../types';
import { word } from './choice';

export const katesKite: Story = {
  id: 'kates-kite',
  band: 1,
  title: 'Kate’s Kite',
  cover: '🪁',
  blurb: 'The wind lifts Kate’s kite. Then it gets stuck!',
  focus: 'magic e: a_e, i_e, o_e',
  pages: [
    { text: 'Kate has a kite. It is red and white.', picture: '👧🪁' },
    { text: 'Kate runs up the slope.', picture: '👧⛰️' },
    { text: 'The wind lifts the kite.', picture: '🌬️🪁' },
    { text: 'Up, up! The kite rides the wind.', picture: '🪁☁️' },
    { text: 'No! The kite is stuck in a pine.', picture: '🌲🪁' },
    { text: 'Kate is sad. Mike has a pole.', picture: '👧😢👦' },
    { text: 'Mike pokes the kite. It drops!', picture: '👦🪁⬇️' },
    { text: 'Kate smiles. They take the kite home.', picture: '👧😊🏠' },
  ],
  questions: [
    {
      prompt: 'What color is Kate’s kite?',
      choices: [word('red and white'), word('black and tan'), word('pink')],
      answer: 'red and white',
      hint: 'Read page 1.',
      explain: ['Page 1 says: “It is red and white.”', 'So the kite is red and white.'],
    },
    {
      prompt: 'Where did the kite get stuck?',
      choices: [word('on a ship'), word('in a lake'), word('in a pine')],
      answer: 'in a pine',
      hint: 'Look at page 5. A pine is a kind of tree.',
      explain: ['Page 5 says: “The kite is stuck in a pine.”', 'So it got stuck in a pine.'],
    },
    {
      prompt: 'Who helped Kate?',
      choices: [word('Mike'), word('Dad'), word('Beth')],
      answer: 'Mike',
      hint: 'Who has a pole on page 6?',
      explain: ['Page 6 says: “Mike has a pole.”', 'Mike pokes the kite down, so Mike helped.'],
    },
    {
      prompt: 'How did Mike get the kite down?',
      choices: [word('He cuts the pine.'), word('He pokes it with a pole.'), word('He hops up.')],
      answer: 'He pokes it with a pole.',
      hint: 'Read page 7.',
      explain: ['Mike has a pole.', 'Page 7 says: “Mike pokes the kite. It drops!”', 'He pokes it with a pole.'],
    },
  ],
};
