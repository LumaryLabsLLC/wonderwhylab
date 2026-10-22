import { Globe } from 'lucide-react';
import type { Module } from '../../types';
import { climateZones } from './climate-zones';
import { gridMaps } from './grid-maps';
import { naturalResources } from './natural-resources';
import { rivers } from './rivers';

export const worldTrotters: Module = {
  id: 'world-trotters',
  subject: 'world',
  band: 2,
  title: 'Globe Trotters',
  ages: 'Ages 8–9',
  color: '#178a7d',
  icon: Globe,
  blurb: 'Grid maps, climate zones, rivers and natural resources.',
  lessons: [gridMaps, climateZones, rivers, naturalResources],
};
