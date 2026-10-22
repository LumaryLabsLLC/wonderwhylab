/**
 * Every lesson, loaded at once. Only tests and the catalog generator import this:
 * the app loads one age group of one subject at a time through ./index.ts.
 */
import type { Lesson, Module, Subject } from './types';
import { tiny } from './tiny';
import { builders } from './builders';
import { explorers } from './explorers';
import { masters } from './masters';
import { sciLittle } from './science/little';
import { sciSparks } from './science/sparks';
import { sciLab } from './science/lab';
import { sciYoung } from './science/young';
import { readSounds } from './reading/sounds';
import { readWords } from './reading/words';
import { readReaders } from './reading/readers';
import { readWriters } from './reading/writers';
import { codeSteps } from './coding/steps';
import { codeLoops } from './coding/loops';
import { codeExplorers } from './coding/explorers';
import { codeMasters } from './coding/masters';
import { worldMaps } from './world/maps';
import { worldWanderers } from './world/wanderers';
import { worldTrotters } from './world/trotters';
import { worldNavigators } from './world/navigators';
import { lifeFeelings } from './life/feelings';
import { lifeHabits } from './life/habits';
import { lifeChoices } from './life/choices';
import { lifeReady } from './life/ready';

export const MODULES: Module[] = [
  tiny, builders, explorers, masters,
  readSounds, readWords, readReaders, readWriters,
  sciLittle, sciSparks, sciLab, sciYoung,
  codeSteps, codeLoops, codeExplorers, codeMasters,
  worldMaps, worldWanderers, worldTrotters, worldNavigators,
  lifeFeelings, lifeHabits, lifeChoices, lifeReady,
];

export function findModule(id: string | null | undefined): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

/** The module for a subject at an age band (0 = ages 4–5 … 3 = ages 10–12). */
export function moduleFor(subject: Subject, band: number): Module {
  return MODULES.find((m) => m.subject === subject && m.band === band) ?? MODULES[0];
}

export function findLesson(id: string | null | undefined): { module: Module; lesson: Lesson; index: number } | undefined {
  for (const module of MODULES) {
    const index = module.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { module, lesson: module.lessons[index], index };
  }
  return undefined;
}

export const ALL_LESSONS: Lesson[] = MODULES.flatMap((m) => m.lessons);
