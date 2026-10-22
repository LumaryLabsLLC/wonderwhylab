import type { Story } from '../types';
import { say } from './choice';

/** A story with a moral choice. Money is counted in plain "coins" so it works anywhere. */
export const theFoundPurse: Story = {
  id: 'the-found-purse',
  band: 3,
  title: 'The Found Purse',
  cover: '👛🎟️',
  blurb: 'Noor needs 35 more coins for a festival ticket. Then she finds a purse with 50.',
  words: [
    { word: 'tempting', meaning: 'making you want to do something, even if you shouldn’t' },
    { word: 'dilemma', meaning: 'a hard choice between two options' },
    { word: 'relief', meaning: 'the good feeling when a worry goes away' },
    { word: 'integrity', meaning: 'doing the right thing, even when no one is watching' },
  ],
  pages: [
    {
      text: 'Noor had been saving for months for a ticket to the summer music festival. She had 40 coins in her savings tin. The ticket cost 75.',
      picture: '👧🎟️🎵',
    },
    {
      text: 'On Saturday, walking home through the market, she spotted a brown purse lying under a fruit stall. Inside were 50 coins, a library card and a folded photo of a baby.',
      picture: '👛🍊',
    },
    {
      text: 'Noor’s heart pounded. With those coins she could buy her ticket that very afternoon. It was tempting. “Nobody saw you,” a small voice in her head whispered. “Finders keepers.”',
      picture: '💭😬',
    },
    {
      text: 'It was a real dilemma. She imagined how she would feel if she had lost something precious. She looked at the photo again. Someone was probably searching for it right now.',
      picture: '🤔📷',
    },
    {
      text: 'Noor carried the purse to the market office. An elderly man was already there, describing a brown purse to the manager. “There’s a photo of my granddaughter inside,” he was saying.',
      picture: '👴🏪',
    },
    {
      text: 'When Noor held out the purse, the man’s face filled with relief. “I could earn the coins again,” he said softly, “but that is the only photo I have of her as a baby.”',
      picture: '😌📷',
    },
    {
      text: 'He tried to give Noor some coins as a reward, but she shook her head. “I just wanted you to have it back,” she said. Walking home, she felt lighter than she had all day.',
      picture: '🙂🏠',
    },
    {
      text: 'Noor kept saving, and by the next summer she had enough for her ticket. At the festival she spotted the old man dancing with a little girl near the stage. He waved, and Noor waved back, glad she had chosen integrity.',
      picture: '🎶💃🎟️',
    },
  ],
  questions: [
    {
      prompt: 'How many more coins did Noor need for her ticket?',
      choices: [say('35'), say('50'), say('75')],
      answer: '35',
      hint: 'Page 1 tells you what she had and what the ticket cost. Find the difference.',
      explain: ['Noor had 40 coins and the ticket cost 75.', '75 − 40 = 35.', 'So she needed 35 more coins.'],
    },
    {
      prompt: 'What was inside the purse?',
      choices: [
        say('50 coins, a library card and a photo'),
        say('a festival ticket and a key'),
        say('a phone and some fruit'),
      ],
      answer: '50 coins, a library card and a photo',
      hint: 'Read the second sentence on page 2.',
      explain: ['Page 2 says: “Inside were 50 coins, a library card and a folded photo of a baby.”', 'So it held 50 coins, a library card and a photo.'],
    },
    {
      prompt: 'On page 4, a “dilemma” is…',
      choices: [say('a hard choice between two options'), say('a kind of purse'), say('a happy surprise')],
      answer: 'a hard choice between two options',
      hint: 'What two things was Noor torn between?',
      explain: ['Noor could keep the coins for her ticket, or return the purse.', 'Choosing between them was hard, so a dilemma is a hard choice between two options.'],
    },
    {
      prompt: 'Why did the man care most about the photo?',
      choices: [
        say('It was the only baby photo of his granddaughter.'),
        say('It was worth more than the coins.'),
        say('It showed the market where he worked.'),
      ],
      answer: 'It was the only baby photo of his granddaughter.',
      hint: 'Read what the man says on page 6.',
      explain: ['He said, “I could earn the coins again.”', 'Then: “that is the only photo I have of her as a baby.”', 'So he cared most because it was the only baby photo of his granddaughter.'],
    },
    {
      prompt: 'What is the main message of the story?',
      choices: [
        say('Doing the right thing matters, even when no one is watching.'),
        say('“Finders keepers” is a fair rule.'),
        say('Music festivals cost too much.'),
      ],
      answer: 'Doing the right thing matters, even when no one is watching.',
      hint: 'Noor chose “integrity”. Check what that word means in the Words to know.',
      explain: ['Nobody saw Noor find the purse, yet she still returned it.', 'The story says she was glad she “had chosen integrity”: doing the right thing even when no one is watching.', 'So the message: doing the right thing matters, even when no one is watching.'],
    },
  ],
};
