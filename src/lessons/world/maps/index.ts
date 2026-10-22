import { Map } from 'lucide-react';
import type { Module } from '../../types';
import { birdsEyeView } from './birds-eye-view';
import { landAndWater } from './land-and-water';
import { myNeighbourhood } from './my-neighbourhood';
import { homesAroundTheWorld } from './homes-around-the-world';

export const worldMaps: Module = {
  id: 'world-maps',
  subject: 'world',
  band: 0,
  title: 'Little Map Makers',
  ages: 'Ages 4–5',
  color: '#2bb3a4',
  icon: Map,
  blurb: 'Bird’s-eye views, land and water, places near us and homes around the world.',
  lessons: [birdsEyeView, landAndWater, myNeighbourhood, homesAroundTheWorld],
};
