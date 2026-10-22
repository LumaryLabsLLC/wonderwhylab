import { useSyncExternalStore } from 'react';
import { completeLesson, recordAnswer, reviewResult } from './memory';
import type { SkillMemory } from './memory';

/** Everything we remember about a learner, saved in this browser only. */
export interface Settings {
  /** Beeps and pops for taps and answers (off by default). */
  effects: boolean;
  /** Read each new question aloud automatically (great for ages 4–6). */
  autoRead: boolean;
  /** Speech rate for read-aloud, 0.6–1.2. */
  rate: number;
  /** Chosen read-aloud voice ("name|lang"), or "" to pick a friendly one automatically. */
  voice: string;
  /** Show the explaining labels on the playground (off by default to keep scenes calm). */
  showLabels: boolean;
  /** Games without countdown timers (on by default; timed play can add pressure). */
  relaxedGames: boolean;
  /** Suggest a short movement break after a while of play. */
  breaks: boolean;
}

export interface ProgressState {
  name: string;
  /** Age band 0–3 (4–5, 6–7, 8–9, 10–12); null until the child picks one. Drives content and theme. */
  band: number | null;
  moduleId: string | null;
  lessonId: string | null;
  /** Best star score per lesson id (1–3). Presence means the lesson is complete. */
  stars: Record<string, number>;
  /** Total questions answered correctly, for stickers. */
  solved: number;
  practiceBest: number;
  /** Best score per game and age band, keyed "gameId:band". */
  gameBest: Record<string, number>;
  /** Number of finished game rounds, for stickers. */
  gamesPlayed: number;
  /** Spaced-repetition memory per lesson id. */
  skills: Record<string, SkillMemory>;
  /** Finished review sessions. */
  reviewsDone: number;
  /** Times a question was got right after a first wrong try (persistence, for stickers). */
  comebacks: number;
  /** Set when the page was opened with ?lesson=<id>; the app jumps straight into it. Not persisted. */
  openLesson?: string;
  settings: Settings;
}

const KEY = 'mathforkids:v1';

const DEFAULT: ProgressState = {
  name: '',
  band: null,
  moduleId: null,
  lessonId: null,
  stars: {},
  solved: 0,
  practiceBest: 0,
  gameBest: {},
  gamesPlayed: 0,
  skills: {},
  reviewsDone: 0,
  comebacks: 0,
  settings: { effects: false, autoRead: false, rate: 0.9, voice: '', showLabels: false, relaxedGames: true, breaks: true },
};

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const settings = { ...DEFAULT.settings, ...parsed.settings };
    // Older saves stored a device voice id without a prefix.
    if (settings.voice && !/^(natural|device):/.test(settings.voice)) settings.voice = `device:${settings.voice}`;
    // Older saves only knew the module; its index matched the age band.
    const band = parsed.band ?? (parsed.moduleId ? ['tiny', 'builders', 'explorers', 'masters'].indexOf(parsed.moduleId) : -1);
    return { ...DEFAULT, ...parsed, band: band >= 0 ? band : null, settings };
  } catch {
    return DEFAULT;
  }
}

let state: ProgressState = typeof window === 'undefined' ? DEFAULT : withLinkedLesson(load());

/** `?lesson=<id>` opens that lesson directly (handy for sharing and testing). */
function withLinkedLesson(s: ProgressState): ProgressState {
  const id = new URLSearchParams(window.location.search).get('lesson');
  return id ? { ...s, lessonId: id, openLesson: id } : s;
}
const listeners = new Set<() => void>();

function save() {
  try {
    const { openLesson: _ignored, ...persisted } = state;
    localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    // Private mode or storage blocked: progress just won't persist.
  }
}

export function update(fn: (s: ProgressState) => ProgressState) {
  state = fn(state);
  save();
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function getSettings() {
  return state.settings;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgress<T>(select: (s: ProgressState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(DEFAULT));
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  update((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
}

export function recordLesson(lessonId: string, stars: number) {
  const now = Date.now();
  update((s) => ({
    ...s,
    stars: { ...s.stars, [lessonId]: Math.max(stars, s.stars[lessonId] ?? 0) },
    skills: { ...s.skills, [lessonId]: completeLesson(s.skills[lessonId], now) },
  }));
}

/** One practice answer for a lesson: feeds adaptive difficulty and the mastery picture. */
export function recordPractice(lessonId: string, firstTry: boolean, level: number) {
  update((s) => ({
    ...s,
    skills: { ...s.skills, [lessonId]: recordAnswer(s.skills[lessonId], firstTry, level, Date.now()) },
  }));
}

/** A review session finished: `results` says, per lesson, whether every answer was right first time. */
export function recordReview(results: Record<string, boolean>) {
  const now = Date.now();
  update((s) => {
    const skills = { ...s.skills };
    for (const [id, allRight] of Object.entries(results)) skills[id] = reviewResult(skills[id], allRight, now);
    return { ...s, skills, reviewsDone: s.reviewsDone + 1 };
  });
}

export function recordComeback() {
  update((s) => ({ ...s, comebacks: s.comebacks + 1 }));
}

export function recordSolved() {
  update((s) => ({ ...s, solved: s.solved + 1 }));
}

export function recordGame(gameId: string, band: number, score: number) {
  const key = `${gameId}:${band}`;
  update((s) => ({
    ...s,
    gamesPlayed: s.gamesPlayed + 1,
    gameBest: { ...s.gameBest, [key]: Math.max(score, s.gameBest[key] ?? 0) },
  }));
}

export function resetProgress() {
  update((s) => ({ ...DEFAULT, settings: s.settings }));
}
