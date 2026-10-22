import { Earth } from 'lucide-react';
import type { Module } from '../../types';
import { citiesAndPopulation } from './cities-and-population';
import { latitudeLongitude } from './latitude-longitude';
import { mapScale } from './map-scale';
import { timeZones } from './time-zones';

export const worldNavigators: Module = {
  id: 'world-navigators',
  subject: 'world',
  band: 3,
  title: 'World Navigators',
  ages: 'Ages 10–12',
  color: '#0f766b',
  icon: Earth,
  blurb: 'Latitude and longitude, time zones, map scale, and cities and populations.',
  lessons: [latitudeLongitude, timeZones, mapScale, citiesAndPopulation],
};
