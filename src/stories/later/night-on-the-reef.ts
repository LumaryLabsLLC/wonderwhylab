import type { Story } from '../types';
import { say } from './choice';

/** A science and nature narrative about a coral reef. */
export const nightOnTheReef: Story = {
  id: 'night-on-the-reef',
  band: 3,
  title: 'Night on the Reef',
  cover: '🌙🤿🐠',
  blurb: 'A night dive shows Leilani the reef’s hidden life, and why it needs protecting.',
  words: [
    { word: 'nocturnal', meaning: 'active at night' },
    { word: 'bioluminescence', meaning: 'light made by living things' },
    { word: 'symbiosis', meaning: 'two different living things living closely together and helping each other' },
    { word: 'fragile', meaning: 'easily damaged or broken' },
  ],
  pages: [
    {
      text: 'Leilani had snorkelled on the reef many times in daylight, but tonight was different. Her aunt, a marine biologist called Dr. Kealoha, was taking her on a night dive to see the reef’s nocturnal side.',
      picture: '🌙🤿🌊',
    },
    {
      text: 'When they switched on their torches, the coral looked furry. “Coral is made of tiny animals called polyps,” her aunt explained. “At night they stretch out their tentacles to catch plankton drifting past.”',
      picture: '🔦🌊',
    },
    {
      text: 'Leilani spotted a parrotfish tucked into a crack in the rock, wrapped in a shimmering bubble. “Some parrotfish sleep in a bag of mucus they make themselves,” said Dr. Kealoha. “Scientists think it helps protect them from parasites and hunters.”',
      picture: '🐟💤',
    },
    {
      text: 'When Leilani waved her hand, the water sparkled with blue light. “That’s bioluminescence,” her aunt said. “Tiny plankton glow when the water around them is disturbed.”',
      picture: '✨🌊',
    },
    {
      text: 'Then they reached a patch of coral that was ghostly white. Leilani frowned through her mask. Was it asleep too?',
      picture: '🤍🌊',
    },
    {
      text: 'Back on the boat, Dr. Kealoha explained. “That coral is bleached. Tiny algae live inside the coral, and the two help each other. That partnership is called symbiosis. The algae make food from sunlight, and they give the coral its colour.”',
      picture: '🌞🤝',
    },
    {
      text: '“When the sea stays too warm for too long, the stressed coral pushes the algae out. Without them it turns white and starts to starve. If the water cools in time, it can recover, but it is fragile.”',
      picture: '🌡️🌊',
    },
    {
      text: 'Leilani looked up at the stars. “I want to help protect the reef,” she said. Her aunt smiled. “Then you have already taken the first step: learning how it works.”',
      picture: '⭐🚤',
    },
  ],
  questions: [
    {
      prompt: 'What are coral polyps?',
      choices: [say('tiny animals that make up coral'), say('a type of seaweed'), say('small, smooth rocks')],
      answer: 'tiny animals that make up coral',
      hint: 'Dr. Kealoha explains what coral is made of on page 2.',
      explain: ['Page 2 says: “Coral is made of tiny animals called polyps.”', 'So polyps are tiny animals that make up coral.'],
    },
    {
      prompt: 'Why did the water sparkle when Leilani waved her hand?',
      choices: [
        say('Tiny plankton glow when the water is disturbed.'),
        say('Her torch shone on the waves.'),
        say('The moon reflected off the sand.'),
      ],
      answer: 'Tiny plankton glow when the water is disturbed.',
      hint: 'Read page 4. What does her aunt say causes the glow?',
      explain: ['Page 4 calls the sparkle bioluminescence.', 'Dr. Kealoha says, “Tiny plankton glow when the water around them is disturbed.”', 'So the answer: tiny plankton glow when the water is disturbed.'],
    },
    {
      prompt: 'According to the story, what causes coral bleaching?',
      choices: [say('The sea stays too warm for too long.'), say('Too many fish eat the coral.'), say('Divers shine torches at it.')],
      answer: 'The sea stays too warm for too long.',
      hint: 'Look at the first sentence on page 7.',
      explain: ['Page 7 says: “When the sea stays too warm for too long, the stressed coral pushes the algae out.”', 'Without the algae it turns white, so bleaching happens when the sea stays too warm for too long.'],
    },
    {
      prompt: 'Which phrase from page 6 helps explain the word “symbiosis”?',
      choices: [
        say('live inside the coral, and the two help each other'),
        say('ghostly white'),
        say('make food from sunlight'),
      ],
      answer: 'live inside the coral, and the two help each other',
      hint: 'Symbiosis is called a “partnership”. Which phrase describes two things helping each other?',
      explain: ['The sentence before “symbiosis” says tiny algae “live inside the coral, and the two help each other.”', 'Then the story calls that partnership symbiosis.', 'So the clue phrase is: live inside the coral, and the two help each other.'],
    },
    {
      prompt: 'What is the author’s main purpose in writing this story?',
      choices: [
        say('To teach readers about life on a reef and why it needs protecting'),
        say('To convince readers never to swim in the sea'),
        say('To tell a funny story about a sleepy fish'),
      ],
      answer: 'To teach readers about life on a reef and why it needs protecting',
      hint: 'Think about all the facts Dr. Kealoha explains, and how the story ends.',
      explain: [
        'Most pages explain real facts: polyps, mucus cocoons, bioluminescence and bleaching.',
        'The ending is about wanting to protect the reef.',
        'So the purpose is to teach readers about life on a reef and why it needs protecting.',
      ],
    },
  ],
};
