import { PiggyBank } from 'lucide-react';
import type { Module } from '../../types';
import { bigFeelings } from './big-feelings';
import { makingChange } from './making-change';
import { onlineSafety } from './online-safety';
import { spendSaveShare } from './spend-save-share';

export const lifeChoices: Module = {
  id: 'life-choices',
  subject: 'life',
  band: 2,
  title: 'Smart Choices',
  ages: 'Ages 8–9',
  color: '#db2777',
  icon: PiggyBank,
  blurb: 'Making change, spend–save–share, handling big feelings and staying safe online.',
  lessons: [makingChange, spendSaveShare, bigFeelings, onlineSafety],
};
