import type { Story } from '../types';
import { say } from './choice';

/** A short mystery told through clues. */
export const theSilentClockTower: Story = {
  id: 'the-silent-clock-tower',
  band: 3,
  title: 'The Silent Clock Tower',
  cover: '🕰️🔍',
  blurb: 'Every night the town clock stops at exactly 2:17. Inés wants evidence, not rumours.',
  words: [
    { word: 'rumour', meaning: 'a story people pass around that may not be true' },
    { word: 'meticulous', meaning: 'very careful about small details' },
    { word: 'mechanism', meaning: 'the moving parts that make a machine work' },
    { word: 'deduction', meaning: 'an answer worked out by reasoning from clues' },
  ],
  pages: [
    {
      text: 'In the hill town of Valmonte, the clock tower had kept perfect time for two hundred years. So when it began to stop every night at exactly 2:17, people started to whisper.',
      picture: '🕰️🏘️',
    },
    {
      text: '“It’s the ghost of the old clockmaker,” said the baker. “It’s those teenagers from the square,” grumbled the mayor. Inés, who was eleven and loved puzzles, said nothing. She wanted evidence, not rumours.',
      picture: '👧🔍',
    },
    {
      text: 'The caretaker, Señor Ortiz, let her climb the narrow stone stairs. “I oil the gears every Sunday,” he said, “and I lock the door each night. Nobody comes up here.”',
      picture: '🗝️👴',
    },
    {
      text: 'Inside, the mechanism was a maze of brass wheels and swinging weights. Being meticulous, Inés wrote down three things: dried mud on a gear, a few strands of grass, and a small white dropping on the floor.',
      picture: '⚙️📝',
    },
    {
      text: 'Mud, grass and droppings. Inés thought it through. A person would not carry grass up a locked tower. But a bird could fly in through the gap where the clock face met the wall.',
      picture: '🤔🐦',
    },
    {
      text: 'She studied the back of the clock face. Tucked behind the numbers, in a sheltered corner, was a half-built cup of mud and grass: a swallow’s nest, growing bigger every day.',
      picture: '🐦🏠',
    },
    {
      text: 'Inés watched the hands turn. Only at 2:17 did both hands sit close to the nest at the same moment. Together, their weights pressed against the hard mud and jammed the gears.',
      picture: '⏱️🧮',
    },
    {
      text: 'She explained her deduction to the town. “No ghost and no teenagers,” she said. “Just a swallow building a home in the warmest spot she could find.”',
      picture: '👧📣🐦',
    },
    {
      text: 'Señor Ortiz built a wooden nesting shelf just outside the tower. The clock never stopped again, and every spring the town watched the swallows return to their new home.',
      picture: '🕰️🐦🌸',
    },
  ],
  questions: [
    {
      prompt: 'At what time did the clock stop each night?',
      choices: [say('2:17'), say('12:00'), say('3:45')],
      answer: '2:17',
      hint: 'The time is given on page 1.',
      explain: ['Page 1 says the clock “began to stop every night at exactly 2:17.”', 'So it stopped at 2:17.'],
    },
    {
      prompt: 'Why did Inés say nothing when the baker and the mayor gave their ideas?',
      choices: [say('She wanted evidence, not rumours.'), say('She was too scared of the ghost.'), say('She did not care about the clock.')],
      answer: 'She wanted evidence, not rumours.',
      hint: 'Read the last sentence on page 2.',
      explain: ['The baker and the mayor guessed without any proof.', 'Page 2 says Inés “wanted evidence, not rumours.”', 'So she stayed quiet because she wanted evidence, not rumours.'],
    },
    {
      prompt: 'In this story, “mechanism” (page 4) means…',
      choices: [say('the moving parts that make a machine work'), say('a kind of bird’s nest'), say('a secret door in a tower')],
      answer: 'the moving parts that make a machine work',
      hint: 'What is described as “a maze of brass wheels and swinging weights”?',
      explain: ['The mechanism is described as “brass wheels and swinging weights”, the parts that move the clock.', 'So mechanism means the moving parts that make a machine work.'],
    },
    {
      prompt: 'Why did Inés decide that a person had not caused the problem?',
      choices: [
        say('A person would not carry grass up a locked tower.'),
        say('People never go near clocks.'),
        say('The caretaker told her the answer.'),
      ],
      answer: 'A person would not carry grass up a locked tower.',
      hint: 'Look at how Inés reasons about the clues on page 5.',
      explain: ['The door was locked every night (page 3).', 'Page 5 says: “A person would not carry grass up a locked tower.”', 'So she reasoned that a person would not carry grass up a locked tower.'],
    },
    {
      prompt: 'What is the main message of the story?',
      choices: [
        say('Look for evidence before believing rumours.'),
        say('Old clocks always break.'),
        say('Birds should not live in towns.'),
      ],
      answer: 'Look for evidence before believing rumours.',
      hint: 'Think about how Inés solved the mystery, compared with the grown-ups.',
      explain: ['The grown-ups believed rumours about a ghost and teenagers, and both were wrong.', 'Inés collected clues and found the real cause.', 'The message: look for evidence before believing rumours.'],
    },
  ],
};
