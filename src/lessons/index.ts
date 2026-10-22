import { useEffect, useSyncExternalStore } from 'react';
import { CATALOG } from './catalog';
import type { Lesson, LessonInfo, Module, ModuleInfo, Subject } from './types';

/**
 * Lessons, loaded as they are needed.
 *
 * The catalog (names, ages and counts) is always at hand, so menus, Review and stickers work at once.
 * A lesson's playground and questions arrive with its module — one subject for one age — the first
 * time it is opened, which keeps the app's first download small.
 */

export const MODULES: ModuleInfo[] = CATALOG;

export const ALL_LESSONS: LessonInfo[] = MODULES.flatMap((m) => m.lessons);

export function findModule(id: string | null | undefined): ModuleInfo | undefined {
  return MODULES.find((m) => m.id === id);
}

/** The module for a subject at an age band (0 = ages 4–5 … 3 = ages 10–12). */
export function moduleFor(subject: Subject, band: number): ModuleInfo {
  return MODULES.find((m) => m.subject === subject && m.band === band) ?? MODULES[0];
}

export function findLesson(id: string | null | undefined): { module: ModuleInfo; lesson: LessonInfo; index: number } | undefined {
  for (const module of MODULES) {
    const index = module.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { module, lesson: module.lessons[index], index };
  }
  return undefined;
}

/** Each module's code, split out by the bundler. */
const LOADERS: Record<string, () => Promise<Module>> = {
  tiny: () => import('./tiny').then((m) => m.tiny),
  builders: () => import('./builders').then((m) => m.builders),
  explorers: () => import('./explorers').then((m) => m.explorers),
  masters: () => import('./masters').then((m) => m.masters),
  'read-sounds': () => import('./reading/sounds').then((m) => m.readSounds),
  'read-words': () => import('./reading/words').then((m) => m.readWords),
  'read-readers': () => import('./reading/readers').then((m) => m.readReaders),
  'read-writers': () => import('./reading/writers').then((m) => m.readWriters),
  'sci-little': () => import('./science/little').then((m) => m.sciLittle),
  'sci-sparks': () => import('./science/sparks').then((m) => m.sciSparks),
  'sci-lab': () => import('./science/lab').then((m) => m.sciLab),
  'sci-young': () => import('./science/young').then((m) => m.sciYoung),
  'code-steps': () => import('./coding/steps').then((m) => m.codeSteps),
  'code-loops': () => import('./coding/loops').then((m) => m.codeLoops),
  'code-explorers': () => import('./coding/explorers').then((m) => m.codeExplorers),
  'code-masters': () => import('./coding/masters').then((m) => m.codeMasters),
  'world-maps': () => import('./world/maps').then((m) => m.worldMaps),
  'world-wanderers': () => import('./world/wanderers').then((m) => m.worldWanderers),
  'world-trotters': () => import('./world/trotters').then((m) => m.worldTrotters),
  'world-navigators': () => import('./world/navigators').then((m) => m.worldNavigators),
  'life-feelings': () => import('./life/feelings').then((m) => m.lifeFeelings),
  'life-habits': () => import('./life/habits').then((m) => m.lifeHabits),
  'life-choices': () => import('./life/choices').then((m) => m.lifeChoices),
  'life-ready': () => import('./life/ready').then((m) => m.lifeReady),
};

const loaded = new Map<string, Module>();
const loading = new Map<string, Promise<Module>>();
const failed = new Set<string>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** Load a module's lessons (once; later calls share the same download). */
export function loadModule(id: string): Promise<Module> {
  const hit = loaded.get(id);
  if (hit) return Promise.resolve(hit);
  const pending = loading.get(id);
  if (pending) return pending;
  const load = LOADERS[id];
  if (!load) return Promise.reject(new Error(`Unknown module "${id}"`));
  failed.delete(id);
  const promise = load().then(
    (module) => {
      loaded.set(id, module);
      loading.delete(id);
      changed();
      return module;
    },
    (error: unknown) => {
      loading.delete(id);
      failed.add(id);
      changed();
      throw error;
    },
  );
  loading.set(id, promise);
  changed();
  return promise;
}

/** The lesson's full code, if its module has loaded. */
export function loadedLesson(id: string): Lesson | undefined {
  const hit = findLesson(id);
  return hit && loaded.get(hit.module.id)?.lessons[hit.index];
}

/** Load the modules of several lessons, e.g. for a mixed Review. */
export function loadLessons(ids: string[]): Promise<Module[]> {
  const modules = new Set(ids.map((id) => findLesson(id)?.module.id).filter((m): m is string => !!m));
  return Promise.all([...modules].map(loadModule));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A module's lessons for React: starts the download and re-renders when it arrives (or fails). */
export function useModule(id: string | undefined): { module: Module | undefined; failed: boolean; retry: () => void } {
  const module = useSyncExternalStore(subscribe, () => (id ? loaded.get(id) : undefined));
  const didFail = useSyncExternalStore(subscribe, () => (id ? failed.has(id) : false));
  useEffect(() => {
    if (id && !module && !didFail) loadModule(id).catch(() => {});
  }, [id, module, didFail]);
  return {
    module,
    failed: didFail,
    retry: () => {
      if (id) loadModule(id).catch(() => {});
    },
  };
}
