import { BookOpenText } from 'lucide-react';
import type { Module } from '../../types';
import { vowelTeams } from './vowel-teams';
import { prefixesSuffixes } from './prefixes-suffixes';
import { compoundWords } from './compound-words';
import { newWords } from './new-words';
import { storyOrder } from './story-order';
import { mainIdea } from './main-idea';
import { spellingRules } from './spelling-rules';
import { punctuation } from './punctuation';
import { paragraphBuilder } from './paragraph-builder';
import { describingWords } from './describing-words';

export const readReaders: Module = {
  id: 'read-readers',
  subject: 'reading',
  band: 2,
  title: 'Story Readers',
  ages: 'Ages 8–9',
  color: '#e46fa6',
  icon: BookOpenText,
  blurb: 'Word parts, vowel teams, new words, story order and main idea — plus spelling rules, punctuation and paragraphs.',
  lessons: [vowelTeams, prefixesSuffixes, compoundWords, newWords, storyOrder, mainIdea, spellingRules, punctuation, paragraphBuilder, describingWords],
};
