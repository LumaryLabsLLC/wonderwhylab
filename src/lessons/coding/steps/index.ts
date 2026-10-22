import { Bot } from 'lucide-react';
import type { Module } from '../../types';
import { fixTheBug } from './fix-the-bug';
import { followThePath } from './follow-the-path';
import { repeatingPatterns } from './repeating-patterns';
import { robotMoves } from './robot-moves';

export const codeSteps: Module = {
  id: 'code-steps',
  subject: 'coding',
  band: 0,
  title: 'Robot Steps',
  ages: 'Ages 4–5',
  color: '#5b6cff',
  icon: Bot,
  blurb: 'Give a little robot step-by-step directions, spot patterns and fix mistakes.',
  lessons: [robotMoves, followThePath, fixTheBug, repeatingPatterns],
};
