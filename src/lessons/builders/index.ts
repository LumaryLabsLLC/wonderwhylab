import { Blocks } from 'lucide-react';
import type { Module } from '../types';
import { make10 } from './make-10';
import { addSubtract20 } from './add-subtract-20';
import { tensAndOnes } from './tens-and-ones';
import { skipCounting } from './skip-counting';
import { tellTime } from './tell-time';
import { oddEven } from './odd-even';
import { shapes3d } from './shapes-3d';
import { halvesAndQuarters } from './halves-and-quarters';
import { storyProblems } from './story-problems';
import { numbersTo100 } from './numbers-to-100';
import { massAndCapacityUnits } from './mass-and-capacity-units';
import { shapeProperties } from './shape-properties';
import { doublingHalving } from './doubling-halving';

export const builders: Module = {
  id: 'builders',
  subject: 'math',
  band: 1,
  title: 'Number Builders',
  ages: 'Ages 6–7',
  color: '#3fae7a',
  icon: Blocks,
  blurb: 'Adding, taking away, tens and ones, telling time and 3D shapes.',
  lessons: [make10, addSubtract20, tensAndOnes, skipCounting, tellTime, oddEven, shapes3d, halvesAndQuarters, storyProblems, numbersTo100, massAndCapacityUnits, shapeProperties, doublingHalving],
};
