import type { Story } from '../types';
import { say } from './choice';

export const theVanishingSandwiches: Story = {
  id: 'the-vanishing-sandwiches',
  band: 2,
  title: 'The Case of the Vanishing Sandwiches',
  cover: '🥪🔍',
  blurb: 'Half the picnic disappears. Can Kai find the real thief before someone is blamed?',
  words: [
    { word: 'vanish', meaning: 'to disappear suddenly' },
    { word: 'evidence', meaning: 'facts or things that show what is true' },
    { word: 'suspect', meaning: 'someone or something that might have done it' },
  ],
  pages: [
    {
      text: 'Every summer, Kai’s class had a picnic at Gull Bay. This year Kai had brought a notebook, because he wanted to be a detective.',
      picture: '🏖️🧒📓',
    },
    {
      text: 'The class spread their blankets on the sand and ran to play in the waves. When they came back, half the sandwiches had vanished!',
      picture: '🥪❓',
    },
    {
      text: '“Someone is a thief,” said Mia. Everyone looked at Ben, who had been the last one out of the water. Ben looked shocked. “It wasn’t me!”',
      picture: '😟🌊',
    },
    {
      text: 'Kai opened his notebook. “A good detective looks at the evidence before blaming anyone,” he said.',
      picture: '🔍📓',
    },
    {
      text: 'Clue one: the sandwich paper was torn into ragged strips, not unwrapped neatly. Clue two: there were small footprints in the sand, each with three long toes pointing forward.',
      picture: '🧻🐾',
    },
    {
      text: 'Clue three: a white and grey feather lay beside the picnic basket. Kai looked up. Large birds were circling and calling above the beach.',
      picture: '☁️🐦',
    },
    {
      text: '“Our suspects have wings,” said Kai. “Seagulls tore the paper with their beaks and left those three-toed footprints.” Ben smiled with relief.',
      picture: '🐦🥪',
    },
    {
      text: 'The teacher thanked Kai for being fair. From then on, the class kept their food in a closed cool box, and everyone, including Ben, shared what was left.',
      picture: '🧊😊',
    },
  ],
  questions: [
    {
      prompt: 'Where did the class have their picnic?',
      choices: [say('at Gull Bay'), say('in the school hall'), say('in a forest')],
      answer: 'at Gull Bay',
      hint: 'The place is named on page 1.',
      explain: ['Page 1 says the class had a picnic “at Gull Bay.”', 'So the picnic was at Gull Bay.'],
    },
    {
      prompt: 'Why did the class first blame Ben?',
      choices: [say('He was the last one out of the water.'), say('He had crumbs on his face.'), say('He said he was hungry.')],
      answer: 'He was the last one out of the water.',
      hint: 'Read page 3. What does it say about Ben?',
      explain: ['Page 3 says Ben “had been the last one out of the water.”', 'That is the only reason they gave: he was the last one out of the water.'],
    },
    {
      prompt: 'Which clue showed that the thief was a bird?',
      choices: [say('a white and grey feather'), say('a closed cool box'), say('Kai’s notebook')],
      answer: 'a white and grey feather',
      hint: 'Look at the clues on page 6. Which one could only come from a bird?',
      explain: ['Only birds have feathers.', 'Page 6 says a white and grey feather lay beside the basket, so that clue was a white and grey feather.'],
    },
    {
      prompt: 'On page 4, “evidence” means…',
      choices: [say('facts or things that show what is true'), say('a kind of sandwich'), say('a loud noise')],
      answer: 'facts or things that show what is true',
      hint: 'What did Kai collect in his notebook before saying who did it?',
      explain: ['Kai wrote down clues: the torn paper, the footprints and the feather.', 'These showed what really happened, so evidence means facts or things that show what is true.'],
    },
  ],
};
