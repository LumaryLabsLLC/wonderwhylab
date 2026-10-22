import { Type } from 'lucide-react';
import type { Module } from '../../types';
import { hearRhymes } from './hear-rhymes';
import { clapSyllables } from './clap-syllables';
import { beginningSounds } from './beginning-sounds';
import { lettersAndSounds } from './letters-and-sounds';
import { blendIt } from './blend-it';
import { soundBoxes } from './sound-boxes';
import { letterFormation } from './letter-formation';
import { spellWithSounds } from './spell-with-sounds';
import { labelIt } from './label-it';
import { capitalLetters } from './capital-letters';

export const readSounds: Module = {
  id: 'read-sounds',
  subject: 'reading',
  band: 0,
  title: 'Sound Explorers',
  ages: 'Ages 4–5',
  color: '#ff6b5b',
  icon: Type,
  blurb: 'Rhymes, syllables, first sounds, letters, blending, and first writing: letters, spelling and labels.',
  lessons: [hearRhymes, clapSyllables, beginningSounds, lettersAndSounds, blendIt, soundBoxes, letterFormation, spellWithSounds, labelIt, capitalLetters],
};
