import { Leaf } from 'lucide-react';
import type { Module } from '../../types';
import { sinkOrFloat } from './sink-or-float';
import { pushAndPull } from './push-and-pull';
import { magnets } from './magnets';
import { hotAndCold } from './hot-and-cold';
import { lightAndShadow } from './light-and-shadow';
import { whatPlantsNeed } from './what-plants-need';
import { fiveSenses } from './five-senses';
import { livingOrNot } from './living-or-not';
import { weather } from './weather';
import { buildATower } from './build-a-tower';
import { recycling } from './recycling';
import { dayAndNightSky } from './day-and-night-sky';

export const sciLittle: Module = {
  id: 'sci-little',
  subject: 'science',
  band: 0,
  title: 'Little Scientists',
  ages: 'Ages 4–5',
  color: '#14b8a6',
  icon: Leaf,
  blurb: 'Senses, floating and sinking, magnets, light, heat, plants, living things, weather, building towers, recycling and the sky.',
  lessons: [fiveSenses, sinkOrFloat, pushAndPull, magnets, hotAndCold, lightAndShadow, whatPlantsNeed, livingOrNot, weather, buildATower, recycling, dayAndNightSky],
};
