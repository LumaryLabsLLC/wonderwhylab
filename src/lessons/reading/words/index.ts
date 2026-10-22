import { SpellCheck } from 'lucide-react';
import type { Module } from '../../types';
import { shortVowels } from './short-vowels';
import { consonantBlends } from './consonant-blends';
import { digraphs } from './digraphs';
import { magicE } from './magic-e';
import { heartWords } from './heart-words';
import { readASentence } from './read-a-sentence';
import { soundItSpellIt } from './sound-it-spell-it';
import { capitalsFullStops } from './capitals-full-stops';
import { writeASentence } from './write-a-sentence';
import { nounsAndVerbs } from './nouns-and-verbs';

export const readWords: Module = {
  id: 'read-words',
  subject: 'reading',
  band: 1,
  title: 'Word Builders',
  ages: 'Ages 6–7',
  color: '#ff9f43',
  icon: SpellCheck,
  blurb: 'Short and long vowels, blends, digraphs, heart words, and writing sentences with capitals and full stops.',
  lessons: [shortVowels, consonantBlends, digraphs, magicE, heartWords, readASentence, soundItSpellIt, capitalsFullStops, writeASentence, nounsAndVerbs],
};
