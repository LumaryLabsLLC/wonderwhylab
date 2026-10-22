import type { Story } from '../types';
import { say } from './choice';

/**
 * A historical-style story. Invented characters in a real setting: Samarkand, a great trading city on the
 * Silk Road, was famous for its paper from around the 8th century onwards.
 */
export const thePaperMakersApprentice: Story = {
  id: 'the-paper-makers-apprentice',
  band: 3,
  title: 'The Paper Maker’s Apprentice',
  cover: '🐫📜🏜️',
  blurb: 'Long ago in Samarkand, a young apprentice learns that patience and honesty are part of the craft.',
  words: [
    { word: 'apprentice', meaning: 'a young person learning a skill by working with an expert' },
    { word: 'caravan', meaning: 'a group of travellers and animals journeying together' },
    { word: 'merchant', meaning: 'a person who buys and sells goods' },
    { word: 'craft', meaning: 'a skill of making things carefully by hand' },
  ],
  pages: [
    {
      text: 'More than a thousand years ago, in the city of Samarkand, a boy named Farhod became an apprentice to Master Rustam, the finest paper maker in the city.',
      picture: '🐫🏜️👦',
    },
    {
      text: 'Samarkand stood on the Silk Road, a web of trade routes stretching between China and the lands around the Mediterranean Sea. Caravans of camels arrived every week, loaded with silk, spices and stories.',
      picture: '🐫🐫🧵',
    },
    {
      text: 'Making paper was hard work. Farhod soaked old linen rags and plant fibres in water, then pounded them with a wooden mallet until they turned into a soft, wet pulp.',
      picture: '💧🔨',
    },
    {
      text: 'Master Rustam dipped a fine screen into the vat of pulp and lifted it out with a gentle shake, leaving a thin, even layer behind. “Too fast and it will tear,” he warned. “Patience is part of the craft.”',
      picture: '🧓📄',
    },
    {
      text: 'The new sheets were pressed to squeeze out the water, then hung in the sun to dry. Finally, Farhod rubbed each sheet with a smooth stone until it shone, ready for ink.',
      picture: '☀️📄',
    },
    {
      text: 'One day a merchant arrived from a distant city. He needed three hundred sheets for scholars who were copying books about the stars, medicine and mathematics, and he needed them within ten days.',
      picture: '🧔📚⭐',
    },
    {
      text: 'Farhod worked from dawn until the stars came out. On the eighth day, tired and hurrying, he lifted a screen too quickly and the sheet tore. He wanted to hide it, but instead he told Master Rustam.',
      picture: '😟📄',
    },
    {
      text: '“A torn sheet can go back into the vat and become pulp again,” said the master. “A hidden mistake can never be fixed.” Together they remade it slowly, and they finished the order on the tenth day.',
      picture: '🤝📄',
    },
    {
      text: 'As the caravan left with the paper, Farhod imagined the books it would become, carried across mountains and deserts. Words, he thought, could travel farther than any camel could walk.',
      picture: '🐫📜🌅',
    },
  ],
  questions: [
    {
      prompt: 'Where and when does this story take place?',
      choices: [
        say('In Samarkand, on the Silk Road, over a thousand years ago'),
        say('In a modern paper factory'),
        say('On a sailing ship last year'),
      ],
      answer: 'In Samarkand, on the Silk Road, over a thousand years ago',
      hint: 'Pages 1 and 2 tell you the setting.',
      explain: ['Page 1 says “More than a thousand years ago, in the city of Samarkand.”', 'Page 2 says Samarkand “stood on the Silk Road.”', 'So it is set in Samarkand, on the Silk Road, over a thousand years ago.'],
    },
    {
      prompt: 'What was the first step in making paper?',
      choices: [
        say('Soaking rags and plant fibres in water'),
        say('Polishing sheets with a smooth stone'),
        say('Hanging sheets in the sun'),
      ],
      answer: 'Soaking rags and plant fibres in water',
      hint: 'Put the steps on pages 3 to 5 in order.',
      explain: ['Page 3 comes first: Farhod soaked rags and plant fibres, then pounded them into pulp.', 'Drying and polishing come later, on page 5.', 'So the first step is soaking rags and plant fibres in water.'],
    },
    {
      prompt: 'What is an “apprentice”?',
      choices: [
        say('a young person learning a skill from an expert'),
        say('a person who drives camels'),
        say('a famous scholar of the stars'),
      ],
      answer: 'a young person learning a skill from an expert',
      hint: 'Who does Farhod work for, and what is he doing there?',
      explain: ['Farhod works with Master Rustam, the finest paper maker, and learns how to make paper.', 'So an apprentice is a young person learning a skill from an expert.'],
    },
    {
      prompt: 'Why did Master Rustam say, “A hidden mistake can never be fixed”?',
      choices: [
        say('He wanted Farhod to be honest so mistakes could be put right.'),
        say('He was angry and wanted to punish Farhod.'),
        say('He wanted Farhod to hide mistakes more carefully.'),
      ],
      answer: 'He wanted Farhod to be honest so mistakes could be put right.',
      hint: 'Think about what happened to the torn sheet after Farhod told the truth.',
      explain: ['Farhod admitted the torn sheet instead of hiding it.', 'They put it back in the vat and remade it, which they could only do because he told the truth.', 'So he wanted Farhod to be honest so mistakes could be put right.'],
    },
    {
      prompt: 'What idea does the author suggest on the last page?',
      choices: [
        say('Paper helped knowledge travel very far.'),
        say('Paper was heavier to carry than silk.'),
        say('Camels did not like carrying paper.'),
      ],
      answer: 'Paper helped knowledge travel very far.',
      hint: 'Reread Farhod’s final thought about words and camels.',
      explain: ['Farhod imagines the paper becoming books carried across mountains and deserts.', 'He thinks “words could travel farther than any camel could walk.”', 'So the idea is that paper helped knowledge travel very far.'],
    },
  ],
};
