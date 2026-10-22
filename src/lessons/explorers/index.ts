import { Compass } from 'lucide-react';
import type { Module } from '../types';
import { timesTables } from './times-tables';
import { divisionSharing } from './division-sharing';
import { fractions } from './fractions';
import { placeValue1000 } from './place-value-1000';
import { rounding } from './rounding';
import { measuring } from './measuring';
import { barGraphs } from './bar-graphs';
import { areaModel } from './area-model';
import { equivalentFractions } from './equivalent-fractions';
import { elapsedTime } from './elapsed-time';
import { factorsAndMultiples } from './factors-and-multiples';
import { longMultiplication } from './long-multiplication';
import { shortDivision } from './short-division';
import { shapeClassification } from './shape-classification';
import { volume } from './volume';

export const explorers: Module = {
  id: 'explorers',
  subject: 'math',
  band: 2,
  title: 'Math Explorers',
  ages: 'Ages 8–9',
  color: '#3d7fd6',
  icon: Compass,
  blurb: 'Times tables, sharing, fractions, measuring and graphs.',
  lessons: [timesTables, divisionSharing, fractions, placeValue1000, rounding, measuring, barGraphs, areaModel, equivalentFractions, elapsedTime, factorsAndMultiples, longMultiplication, shortDivision, shapeClassification, volume],
};
