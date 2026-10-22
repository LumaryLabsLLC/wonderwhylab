import { Repeat2 } from 'lucide-react';
import type { Module } from '../../types';
import { debugging } from './debugging';
import { everydayAlgorithms } from './everyday-algorithms';
import { loops } from './loops';
import { sequences } from './sequences';

export const codeLoops: Module = {
  id: 'code-loops',
  subject: 'coding',
  band: 1,
  title: 'Loop Makers',
  ages: 'Ages 6–7',
  color: '#4f7cff',
  icon: Repeat2,
  blurb: 'Sequences, repeat loops, debugging and everyday algorithms.',
  lessons: [sequences, loops, debugging, everydayAlgorithms],
};
