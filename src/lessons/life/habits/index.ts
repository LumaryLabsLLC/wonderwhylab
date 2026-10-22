import { Heart } from 'lucide-react';
import type { Module } from '../../types';
import { coinsAndCounting } from './coins-and-counting';
import { savingGoal } from './saving-goal';
import { friendshipProblems } from './friendship-problems';
import { sleepAndMove } from './sleep-and-move';

export const lifeHabits: Module = {
  id: 'life-habits',
  subject: 'life',
  band: 1,
  title: 'Healthy Habits',
  ages: 'Ages 6–7',
  color: '#ec4899',
  icon: Heart,
  blurb: 'Coins and counting, saving for a goal, solving problems with friends, and sleep and exercise.',
  lessons: [coinsAndCounting, savingGoal, friendshipProblems, sleepAndMove],
};
