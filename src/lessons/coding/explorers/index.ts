import { Code } from 'lucide-react';
import type { Module } from '../../types';
import { events } from './events';
import { functions } from './functions';
import { ifThen } from './if-then';
import { variablesScore } from './variables-score';

export const codeExplorers: Module = {
  id: 'code-explorers',
  subject: 'coding',
  band: 2,
  title: 'Code Explorers',
  ages: 'Ages 8–9',
  color: '#3d63e0',
  icon: Code,
  blurb: 'If-then choices, events, functions and keeping score with variables.',
  lessons: [ifThen, events, functions, variablesScore],
};
