import { Rocket } from 'lucide-react';
import type { Module } from '../types';
import { decimals } from './decimals';
import { percentages } from './percentages';
import { areaPerimeter } from './area-perimeter';
import { angles } from './angles';
import { negativeNumbers } from './negative-numbers';
import { coordinates } from './coordinates';
import { equations } from './equations';
import { ratios } from './ratios';
import { averages } from './averages';
import { probability } from './probability';
import { primes } from './primes';
import { fractionOperations } from './fraction-operations';
import { orderOfOperations } from './order-of-operations';
import { expressions } from './expressions';
import { netsAndSurfaceArea } from './nets-and-surface-area';

export const masters: Module = {
  id: 'masters',
  subject: 'math',
  band: 3,
  title: 'Math Masters',
  ages: 'Ages 10–12',
  color: '#8b67d6',
  icon: Rocket,
  blurb: 'Decimals, percentages, angles, negative numbers, equations, primes, fractions, algebra and nets.',
  lessons: [decimals, percentages, areaPerimeter, angles, negativeNumbers, coordinates, equations, ratios, averages, probability, primes, fractionOperations, orderOfOperations, expressions, netsAndSurfaceArea],
};
