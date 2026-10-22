import { Wallet } from 'lucide-react';
import type { Module } from '../../types';
import { bestBuys } from './best-buys';
import { budgetsAndInterest } from './budgets-and-interest';
import { checkingSources } from './checking-sources';
import { digitalCitizenship } from './digital-citizenship';

export const lifeReady: Module = {
  id: 'life-ready',
  subject: 'life',
  band: 3,
  title: 'Ready for Life',
  ages: 'Ages 10–12',
  color: '#be185d',
  icon: Wallet,
  blurb: 'Budgets and interest, best buys, checking sources and being a good digital citizen.',
  lessons: [budgetsAndInterest, bestBuys, checkingSources, digitalCitizenship],
};
