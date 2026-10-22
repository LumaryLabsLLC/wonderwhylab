import { Smile } from 'lucide-react';
import type { Module } from '../../types';
import { feelingsFaces } from './feelings-faces';
import { calmBreathing } from './calm-breathing';
import { needsAndWants } from './needs-and-wants';
import { washYourHands } from './wash-your-hands';

export const lifeFeelings: Module = {
  id: 'life-feelings',
  subject: 'life',
  band: 0,
  title: 'Me and My Feelings',
  ages: 'Ages 4–5',
  color: '#f472b6',
  icon: Smile,
  blurb: 'Naming feelings, calm breathing, needs and wants, and washing away germs.',
  lessons: [feelingsFaces, calmBreathing, needsAndWants, washYourHands],
};
