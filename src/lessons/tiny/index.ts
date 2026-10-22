import { Sprout } from 'lucide-react';
import type { Module } from '../types';
import { countTo10 } from './count-to-10';
import { numbersTo20 } from './numbers-to-20';
import { moreOrLess } from './more-or-less';
import { shapes2d } from './shapes-2d';
import { patterns } from './patterns';
import { firstAdding } from './first-adding';
import { takeAway } from './take-away';
import { compareLength } from './compare-length';
import { sortAndClassify } from './sort-and-classify';
import { positionWords } from './position-words';
import { weightAndCapacity } from './weight-and-capacity';
import { estimateIt } from './estimate-it';
import { symmetry } from './symmetry';

export const tiny: Module = {
  id: 'tiny',
  subject: 'math',
  band: 0,
  title: 'Tiny Counters',
  ages: 'Ages 4–5',
  color: '#f2a93b',
  icon: Sprout,
  blurb: 'Counting, shapes, patterns and first sums with things you can touch.',
  lessons: [countTo10, numbersTo20, moreOrLess, shapes2d, patterns, firstAdding, takeAway, compareLength, sortAndClassify, positionWords, weightAndCapacity, estimateIt, symmetry],
};
