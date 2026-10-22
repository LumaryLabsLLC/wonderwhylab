import { Lightbulb } from 'lucide-react';
import type { Module } from '../../types';
import { statesOfMatter } from './states-of-matter';
import { rampsAndFriction } from './ramps-and-friction';
import { soundAndVibration } from './sound-and-vibration';
import { lifeCycles } from './life-cycles';
import { dayAndNight } from './day-and-night';
import { waterCycle } from './water-cycle';
import { seasons } from './seasons';
import { foodAndHealth } from './food-and-health';
import { rocksAndSoil } from './rocks-and-soil';
import { buildABridge } from './build-a-bridge';
import { materials } from './materials';
import { reversibleChanges } from './reversible-changes';

export const sciSparks: Module = {
  id: 'sci-sparks',
  subject: 'science',
  band: 1,
  title: 'Science Sparks',
  ages: 'Ages 6–7',
  color: '#0ea5e9',
  icon: Lightbulb,
  blurb: 'Ice to steam, ramps, sounds, life cycles, day and night, the water cycle, seasons, healthy food, rocks and soil, bridges, materials and changes we can undo.',
  lessons: [statesOfMatter, rampsAndFriction, soundAndVibration, lifeCycles, dayAndNight, waterCycle, seasons, foodAndHealth, rocksAndSoil, buildABridge, materials, reversibleChanges],
};
