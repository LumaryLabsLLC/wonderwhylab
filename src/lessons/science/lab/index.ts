import { FlaskConical } from 'lucide-react';
import type { Module } from '../../types';
import { circuits } from './circuits';
import { forcesAndMotion } from './forces-and-motion';
import { mixturesAndSolutions } from './mixtures-and-solutions';
import { foodChains } from './food-chains';
import { lightAndMirrors } from './light-and-mirrors';
import { solarSystem } from './solar-system';
import { simpleMachines } from './simple-machines';
import { moonPhases } from './moon-phases';
import { skeletonAndMuscles } from './skeleton-and-muscles';
import { earthquakesVolcanoes } from './earthquakes-volcanoes';
import { erosionWeathering } from './erosion-weathering';
import { heatAndInsulation } from './heat-and-insulation';
import { designABoat } from './design-a-boat';

export const sciLab: Module = {
  id: 'sci-lab',
  subject: 'science',
  band: 2,
  title: 'Lab Explorers',
  ages: 'Ages 8–9',
  color: '#ef6c57',
  icon: FlaskConical,
  blurb: 'Circuits, forces, simple machines, mixtures, food chains, bones and muscles, mirrors, planets, Moon phases, earthquakes, erosion, insulation and boat design.',
  lessons: [
    circuits,
    forcesAndMotion,
    simpleMachines,
    mixturesAndSolutions,
    foodChains,
    skeletonAndMuscles,
    lightAndMirrors,
    solarSystem,
    moonPhases,
    earthquakesVolcanoes,
    erosionWeathering,
    heatAndInsulation,
    designABoat,
  ],
};
