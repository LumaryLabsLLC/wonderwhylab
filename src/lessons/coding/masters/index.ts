import { Binary } from 'lucide-react';
import type { Module } from '../../types';
import { binary } from './binary';
import { functionsWithInputs } from './functions-with-inputs';
import { ifElseLogic } from './if-else-logic';
import { sortingAlgorithms } from './sorting-algorithms';

export const codeMasters: Module = {
  id: 'code-masters',
  subject: 'coding',
  band: 3,
  title: 'Code Masters',
  ages: 'Ages 10–12',
  color: '#2f4fc4',
  icon: Binary,
  blurb: 'Binary, variables, if/else logic, functions with inputs and sorting algorithms.',
  lessons: [binary, ifElseLogic, functionsWithInputs, sortingAlgorithms],
};
