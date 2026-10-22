import type { Story } from '../types';
import { word } from './choice';

export const theShipAndTheFish: Story = {
  id: 'the-ship-and-the-fish',
  band: 1,
  title: 'The Ship and the Fish',
  cover: '🚢',
  blurb: 'Beth gets a fish in the net. What will Beth do?',
  focus: 'sh, ch, th',
  pages: [
    { text: 'Beth and Dad sit on a ship.', picture: '👧👨🚢' },
    { text: 'Beth has a net.', picture: '👧🥅' },
    { text: 'Shh! Beth can get a fish.', picture: '👧🤫🐟' },
    { text: 'Beth gets a fish in the net!', picture: '🥅🐟' },
    { text: 'The fish is thin. It is not big.', picture: '🐟' },
    { text: 'Beth chats with the fish. “Go and get big!”', picture: '👧💬🐟' },
    { text: 'Beth lets the fish go. Splish, splash!', picture: '🐟💦' },
    { text: 'The fish swims. Beth is glad.', picture: '🐟🌊😊' },
  ],
  questions: [
    {
      prompt: 'Who sat on the ship with Beth?',
      choices: [word('Mom'), word('Ned'), word('Dad')],
      answer: 'Dad',
      hint: 'Read page 1.',
      explain: ['Page 1 says: “Beth and Dad sit on a ship.”', 'So it was Dad.'],
    },
    {
      prompt: 'What did Beth get in the net?',
      choices: [word('a fish', '🐟'), word('a shell', '🐚'), word('a ship', '🚢')],
      answer: 'a fish',
      hint: 'Look at page 4.',
      explain: ['Page 4 says: “Beth gets a fish in the net!”', 'So she got a fish.'],
    },
    {
      prompt: 'What did Beth say to the fish?',
      choices: [word('Get in the ship!'), word('Go and get big!'), word('Hop on the shed!')],
      answer: 'Go and get big!',
      hint: 'Find the words in “ ” marks on page 6.',
      explain: ['On page 6, Beth chats with the fish.', 'She says: “Go and get big!”'],
    },
    {
      prompt: 'Why did Beth let the fish go?',
      choices: [word('It bit Beth.'), word('It was thin and not big.'), word('Dad was sad.')],
      answer: 'It was thin and not big.',
      hint: 'Look at page 5. What was the fish like?',
      explain: ['Page 5 says: “The fish is thin. It is not big.”', 'Beth wants it to swim and grow.', 'It was thin and not big.'],
    },
  ],
};
