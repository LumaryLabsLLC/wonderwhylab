import { Atom } from 'lucide-react';
import type { Module } from '../../types';
import { atomsAndMolecules } from './atoms-and-molecules';
import { densityLesson } from './density';
import { acidsAndBases } from './acids-and-bases';
import { energyRollerCoaster } from './energy-roller-coaster';
import { gravityAndWeight } from './gravity-and-weight';
import { cells } from './cells';
import { electromagnets } from './electromagnets';
import { waves } from './waves';
import { heredity } from './heredity';
import { chemicalVsPhysical } from './chemical-vs-physical';
import { conservationOfMass } from './conservation-of-mass';
import { renewableEnergy } from './renewable-energy';
import { climateVsWeather } from './climate-vs-weather';

export const sciYoung: Module = {
  id: 'sci-young',
  subject: 'science',
  band: 3,
  title: 'Young Scientists',
  ages: 'Ages 10–12',
  color: '#8b5cf6',
  icon: Atom,
  blurb: 'Atoms, density, acids and bases, energy, gravity, cells, electromagnets, waves, heredity, chemical changes, energy sources and climate.',
  lessons: [atomsAndMolecules, densityLesson, acidsAndBases, energyRollerCoaster, gravityAndWeight, cells, electromagnets, waves, heredity, chemicalVsPhysical, conservationOfMass, renewableEnergy, climateVsWeather],
};
