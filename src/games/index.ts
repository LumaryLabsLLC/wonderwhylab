import { useEffect, useSyncExternalStore } from 'react';
import { GAME_CATALOG } from './catalog';
import type { Game, GameInfo } from './types';

/**
 * Games, loaded as they are needed: the catalog (names, icons, colours) is always at hand for the
 * menus, and a game's code arrives when its start screen opens.
 */
export const GAMES: GameInfo[] = GAME_CATALOG;

export function findGame(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}

/** Each game's code, split out by the bundler. */
const LOADERS: Record<string, () => Promise<Game>> = {
  'quick-look': () => import('./quick-look').then((m) => m.game),
  'bubble-pop': () => import('./bubble-pop').then((m) => m.game),
  'rocket-race': () => import('./rocket-race').then((m) => m.game),
  'memory-match': () => import('./memory-match').then((m) => m.game),
  'feed-monster': () => import('./feed-monster').then((m) => m.game),
  'number-line-jump': () => import('./number-line-jump').then((m) => m.game),
  'sort-it': () => import('./sort-it').then((m) => m.game),
  'tangram-builder': () => import('./tangram-builder').then((m) => m.game),
  'fraction-cafe': () => import('./fraction-cafe').then((m) => m.game),
  'sound-it-out': () => import('./sound-it-out').then((m) => m.game),
  'abc-train': () => import('./abc-train').then((m) => m.game),
  'letter-fishing': () => import('./letter-fishing').then((m) => m.game),
  'first-sounds': () => import('./first-sounds').then((m) => m.game),
  'word-builder': () => import('./word-builder').then((m) => m.game),
  'read-match': () => import('./read-match').then((m) => m.game),
  'rhyme-time': () => import('./rhyme-time').then((m) => m.game),
  'sentence-builder': () => import('./sentence-builder').then((m) => m.game),
  'story-detective': () => import('./story-detective').then((m) => m.game),
  'balance-lab': () => import('./balance-lab').then((m) => m.game),
  'launch-lab': () => import('./launch-lab').then((m) => m.game),
  'circuit-builder': () => import('./circuit-builder').then((m) => m.game),
  'potion-lab': () => import('./potion-lab').then((m) => m.game),
  'molecule-builder': () => import('./molecule-builder').then((m) => m.game),
  'habitat-rescue': () => import('./habitat-rescue').then((m) => m.game),
  'body-builder': () => import('./body-builder').then((m) => m.game),
  'garden-lab': () => import('./garden-lab').then((m) => m.game),
};

const loaded = new Map<string, Game>();
const loading = new Map<string, Promise<Game>>();
const failed = new Set<string>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** Load a game's code (once; later calls share the same download). */
export function loadGame(id: string): Promise<Game> {
  const hit = loaded.get(id);
  if (hit) return Promise.resolve(hit);
  const pending = loading.get(id);
  if (pending) return pending;
  const load = LOADERS[id];
  if (!load) return Promise.reject(new Error(`Unknown game "${id}"`));
  failed.delete(id);
  const promise = load().then(
    (game) => {
      loaded.set(id, game);
      loading.delete(id);
      changed();
      return game;
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

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A game's code for React: starts the download and re-renders when it arrives (or fails). */
export function useGame(id: string): { game: Game | undefined; failed: boolean; retry: () => void } {
  const game = useSyncExternalStore(subscribe, () => loaded.get(id));
  const didFail = useSyncExternalStore(subscribe, () => failed.has(id));
  useEffect(() => {
    if (!game && !didFail) loadGame(id).catch(() => {});
  }, [id, game, didFail]);
  return {
    game,
    failed: didFail,
    retry: () => {
      loadGame(id).catch(() => {});
    },
  };
}
