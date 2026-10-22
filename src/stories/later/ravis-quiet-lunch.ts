import type { Story } from '../types';
import { say } from './choice';

export const ravisQuietLunch: Story = {
  id: 'ravis-quiet-lunch',
  band: 2,
  title: 'Ravi’s Quiet Lunch',
  cover: '👦📒🐱',
  blurb: 'On his first day, Ravi draws alone at lunch, until someone notices his cat.',
  words: [
    { word: 'glance', meaning: 'to look at something quickly' },
    { word: 'hesitate', meaning: 'to pause because you feel unsure' },
    { word: 'invent', meaning: 'to make up something new' },
  ],
  pages: [
    {
      text: 'On his first day at Hillside School, Ravi sat at the very end of the lunch table. He opened his sketchbook and began to draw, so that he would not have to talk to anyone.',
      picture: '👦📒',
    },
    {
      text: 'Lena glanced over from the next seat. Ravi had drawn a superhero cat with a cape made of leaves. “That’s amazing,” she said quietly.',
      picture: '👧🐱🌿',
    },
    {
      text: 'Ravi’s face went warm. He wanted to say thank you, but he hesitated. What if she was only being polite?',
      picture: '👦😳',
    },
    {
      text: 'The next day, Lena brought her own notebook. “I’m good at writing stories, but terrible at drawing,” she said. “Do you want to make a comic together?”',
      picture: '👧📖✏️',
    },
    {
      text: 'Ravi drew the pictures and Lena wrote the words. Their comic was about Leaf Cat, a hero who protected the school garden from litter and slugs.',
      picture: '✏️🐱🌿',
    },
    {
      text: 'Soon other children crowded around the table to read each new page. Some asked if they could invent villains for Leaf Cat to stop.',
      picture: '🧒👧👦📖',
    },
    {
      text: 'By the end of the month, Ravi no longer sat alone. He had learned that sharing the thing you love can be the start of a friendship.',
      picture: '😊👫',
    },
  ],
  questions: [
    {
      prompt: 'Why did Ravi draw at lunch on his first day?',
      choices: [say('So he would not have to talk to anyone'), say('Because his teacher told him to'), say('To win a drawing contest')],
      answer: 'So he would not have to talk to anyone',
      hint: 'Read the end of the second sentence on page 1.',
      explain: ['Page 1 says he began to draw “so that he would not have to talk to anyone.”', 'He felt shy on his first day, so he drew so he would not have to talk to anyone.'],
    },
    {
      prompt: 'What did Lena do the next day?',
      choices: [say('She asked Ravi to make a comic with her.'), say('She sat at a different table.'), say('She showed his drawing to the teacher.')],
      answer: 'She asked Ravi to make a comic with her.',
      hint: 'Look at page 4. What did Lena bring, and what did she ask?',
      explain: ['On page 4, Lena brought her notebook.', 'She asked, “Do you want to make a comic together?”', 'So she asked Ravi to make a comic with her.'],
    },
    {
      prompt: 'On page 3, Ravi “hesitated”. This means he…',
      choices: [say('paused because he felt unsure'), say('shouted very loudly'), say('ran out of the room')],
      answer: 'paused because he felt unsure',
      hint: 'Read the next sentence: what was Ravi worried about?',
      explain: ['Ravi wanted to say thank you but wondered if Lena was “only being polite.”', 'He stopped for a moment because he was not sure, so he paused because he felt unsure.'],
    },
    {
      prompt: 'What lesson did Ravi learn?',
      choices: [
        say('Sharing what you love can help you make friends.'),
        say('Drawing is more important than friends.'),
        say('It is better to eat lunch alone.'),
      ],
      answer: 'Sharing what you love can help you make friends.',
      hint: 'The last page tells you what Ravi learned.',
      explain: ['Page 7 says he learned that “sharing the thing you love can be the start of a friendship.”', 'So the lesson is: sharing what you love can help you make friends.'],
    },
  ],
};
