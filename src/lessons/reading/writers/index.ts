import { Library } from 'lucide-react';
import type { Module } from '../../types';
import { wordRoots } from './word-roots';
import { contextClues } from './context-clues';
import { figurativeLanguage } from './figurative-language';
import { inference } from './inference';
import { textStructure } from './text-structure';
import { factOrOpinion } from './fact-or-opinion';
import { opinionWriting } from './opinion-writing';
import { storyWriting } from './story-writing';
import { grammarClausesTenses } from './grammar-clauses-tenses';
import { editing } from './editing';

export const readWriters: Module = {
  id: 'read-writers',
  subject: 'reading',
  band: 3,
  title: 'Word Masters',
  ages: 'Ages 10–12',
  color: '#c2416b',
  icon: Library,
  blurb: 'Roots, context clues, figurative language and inference — plus opinion and story writing, grammar and editing.',
  lessons: [wordRoots, contextClues, figurativeLanguage, inference, textStructure, factOrOpinion, opinionWriting, storyWriting, grammarClausesTenses, editing],
};
