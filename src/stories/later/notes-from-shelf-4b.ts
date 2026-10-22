import type { Story } from '../types';
import { say } from './choice';

/** A story told from an unusual point of view: a library book. */
export const notesFromShelf4B: Story = {
  id: 'notes-from-shelf-4b',
  band: 3,
  title: 'Notes from Shelf 4B',
  cover: '📕🏛️',
  blurb: 'A well-travelled library book remembers every reader who has borrowed it.',
  words: [
    { word: 'borrower', meaning: 'someone who takes something to use and then gives it back' },
    { word: 'overdue', meaning: 'late, after the day it should have been returned' },
    { word: 'worn', meaning: 'old and a little damaged from lots of use' },
    { word: 'perspective', meaning: 'the way someone sees and thinks about things' },
  ],
  pages: [
    {
      text: 'Hello. I am a library book: Volcanoes of the World, shelf 4B. I have been borrowed 312 times, and I remember every single borrower.',
      picture: '📕🏛️',
    },
    {
      text: 'My first borrower was a girl named Priya, who carried me home in her bike basket. She read me at the kitchen table and copied my diagrams of magma chambers into her notebook for a science project.',
      picture: '🚲👧📝',
    },
    {
      text: 'From my place on her table, I watched her build a model volcano out of clay. When the baking-soda lava fizzed over the top, her whole family cheered. I would have cheered too, if books could.',
      picture: '🌋🎉',
    },
    {
      text: 'Next I went home with Tomás, who read me under his blanket with a torch, long after bedtime. He whispered the names of volcanoes as if they were magic spells: Etna, Kilimanjaro, Popocatépetl.',
      picture: '🔦🛏️',
    },
    {
      text: 'Then came my worst adventure. Someone left me on a park bench in the rain. My pages swelled and my cover curled. I lay there all night, sure that my story was over.',
      picture: '🌧️🪑',
    },
    {
      text: 'In the morning, a woman jogging past picked me up, read the label on my spine and carried me back to the library. I was overdue, damp and worn, but I was home.',
      picture: '🏃‍♀️📕',
    },
    {
      text: 'The librarian, Mr. Adeyemi, dried my pages one by one with a fan. He pressed me flat under a stack of heavy atlases for a week, then mended my spine with special tape.',
      picture: '📚🩹',
    },
    {
      text: 'Now my pages are a little wavy, and there is a faint coffee ring on page 42. Some people might call that damage. From my perspective, every mark is a memory.',
      picture: '📕☕',
    },
    {
      text: 'Tomorrow, a new borrower will take me home. I wonder what they will build, or dream, or discover. That is the best part of being a library book: every story I hold becomes part of someone else’s.',
      picture: '📕✨',
    },
  ],
  questions: [
    {
      prompt: 'Who is telling this story?',
      choices: [say('a library book'), say('the librarian'), say('Priya')],
      answer: 'a library book',
      hint: 'Read the first two sentences. Who says “I”?',
      explain: ['Page 1 begins: “Hello. I am a library book.”', 'The whole story uses “I” and “me” for the book, so the narrator is a library book.'],
    },
    {
      prompt: 'What did Priya build for her science project?',
      choices: [say('a model volcano'), say('a rain gauge'), say('a bookshelf')],
      answer: 'a model volcano',
      hint: 'Look at page 3.',
      explain: ['Page 3 says Priya built “a model volcano out of clay.”', 'Its baking-soda lava fizzed over the top, so she built a model volcano.'],
    },
    {
      prompt: 'What happened right after the book was left out in the rain?',
      choices: [
        say('A jogger found it and took it back to the library.'),
        say('Tomás read it under his blanket.'),
        say('Priya copied its diagrams.'),
      ],
      answer: 'A jogger found it and took it back to the library.',
      hint: 'Read pages 5 and 6 in order.',
      explain: ['Page 5: the book lay on the bench all night in the rain.', 'Page 6: “In the morning, a woman jogging past picked me up” and took it back.', 'So next, a jogger found it and took it back to the library.'],
    },
    {
      prompt: 'The book was “overdue” (page 6). This means it was…',
      choices: [say('late, after the day it should have been returned'), say('old and very dusty'), say('full of colourful pictures')],
      answer: 'late, after the day it should have been returned',
      hint: 'The book had spent a night on a park bench instead of going back on time.',
      explain: ['The book was out all night instead of being returned.', 'Library books have a date to come back, so overdue means late, after the day it should have been returned.'],
    },
    {
      prompt: 'Why does the book call its marks “memories” instead of damage?',
      choices: [
        say('Each mark reminds it of a reader who used it.'),
        say('It wants to be thrown away.'),
        say('The librarian made all the marks.'),
      ],
      answer: 'Each mark reminds it of a reader who used it.',
      hint: 'Think about the book’s point of view. What does it care about most?',
      explain: [
        'The book remembers every borrower and their adventures.',
        'From its perspective, a coffee ring or a wavy page is a sign that someone read and loved it.',
        'So each mark reminds it of a reader who used it.',
      ],
    },
  ],
};
