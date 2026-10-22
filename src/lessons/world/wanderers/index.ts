import { Compass } from 'lucide-react';
import type { Module } from '../../types';
import { compassDirections } from './compass-directions';
import { mapKeys } from './map-keys';
import { continentsAndOceans } from './continents-and-oceans';
import { landforms } from './landforms';

export const worldWanderers: Module = {
  id: 'world-wanderers',
  subject: 'world',
  band: 1,
  title: 'World Wanderers',
  ages: 'Ages 6–7',
  color: '#1f9e8f',
  icon: Compass,
  blurb: 'Compass directions, map keys, continents and oceans, and landforms.',
  lessons: [compassDirections, mapKeys, continentsAndOceans, landforms],
};
