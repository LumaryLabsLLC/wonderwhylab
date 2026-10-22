import { useSyncExternalStore } from 'react';
import { audioContext } from './sound';

/**
 * A natural-sounding neural voice (Kokoro) that runs in the browser.
 * The ~90 MB model downloads once, the first time something is read aloud, and is then cached by the browser.
 */

export interface NaturalVoice {
  id: string;
  name: string;
  accent: string;
}

/** The best-sounding Kokoro voices, friendliest first. */
export const NATURAL_VOICES: NaturalVoice[] = [
  { id: 'af_heart', name: 'Heart', accent: 'warm · US' },
  { id: 'af_bella', name: 'Bella', accent: 'bright · US' },
  { id: 'af_sarah', name: 'Sarah', accent: 'US' },
  { id: 'am_michael', name: 'Michael', accent: 'US' },
  { id: 'bf_emma', name: 'Emma', accent: 'UK' },
  { id: 'bm_george', name: 'George', accent: 'UK' },
];

export type VoiceState = 'idle' | 'loading' | 'ready' | 'error';

interface Status {
  state: VoiceState;
  /** Download progress 0–1 while loading. */
  progress: number;
}

let status: Status = { state: 'idle', progress: 0 };
const listeners = new Set<() => void>();

function setStatus(next: Status) {
  status = next;
  listeners.forEach((l) => l());
}

export function useNaturalVoiceStatus(): Status {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

/** True once loading the voice has failed (e.g. offline); we then stick to the device voice. */
export function naturalVoiceFailed(): boolean {
  return status.state === 'error';
}

/** True once the model has loaded and can speak. */
export function naturalVoiceReady(): boolean {
  return status.state === 'ready';
}

export function naturalVoiceSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly === 'object';
}

interface Chunk {
  samples: Float32Array<ArrayBuffer>;
  rate: number;
}

/** Speech currently being played: its sentences arrive from the worker one by one. */
interface Session {
  id: number;
  count: number;
  ready: Map<number, Chunk>;
  next: number;
  source: AudioBufferSourceNode | null;
  onFail: () => void;
  timeout: ReturnType<typeof setTimeout> | null;
}

let worker: Worker | null = null;
let sessionSeq = 0;
let jobSeq = 0;
let current: Session | null = null;
/** Jobs sent to the worker; several speech sessions may wait on the same sentence. */
const jobs = new Map<number, { key: string; session: number; waiters: { session: number; index: number }[] }>();
const pendingByKey = new Map<string, number>();
/** Background jobs use this session id so they are never cancelled. */
const PREFETCH = Number.MAX_SAFE_INTEGER;

/** Small cache so repeated questions play instantly. */
const cache = new Map<string, Chunk>();
const CACHE_SIZE = 60;

function remember(key: string, value: Chunk) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
}

function failSession(s: Session) {
  if (current !== s) return;
  stopNatural();
  s.onFail();
}

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    setStatus({ state: 'error', progress: 0 });
    return null;
  }
  setStatus({ state: 'loading', progress: 0 });
  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      if (status.state === 'loading') setStatus({ state: 'loading', progress: msg.total ? msg.loaded / msg.total : 0 });
    } else if (msg.type === 'ready') {
      setStatus({ state: 'ready', progress: 1 });
    } else if (msg.type === 'error') {
      setStatus({ state: 'error', progress: 0 });
      if (current) failSession(current);
    } else if (msg.type === 'audio') {
      const job = finishJob(msg.id);
      if (!job) return;
      const value: Chunk = { samples: msg.samples as Float32Array<ArrayBuffer>, rate: msg.rate as number };
      remember(job.key, value);
      const s = current;
      for (const w of job.waiters) {
        if (s && s.id === w.session) s.ready.set(w.index, value);
      }
      if (s) playNext(s);
    } else if (msg.type === 'failed') {
      const job = finishJob(msg.id);
      if (job && current && job.waiters.some((w) => w.session === current!.id)) {
        failSession(current);
      }
    }
  };
  worker.onerror = () => {
    setStatus({ state: 'error', progress: 0 });
    if (current) failSession(current);
  };
  worker.postMessage({ type: 'load' });
  return worker;
}

function finishJob(id: number) {
  const job = jobs.get(id);
  jobs.delete(id);
  if (job && pendingByKey.get(job.key) === id) pendingByKey.delete(job.key);
  return job;
}

function request(w: Worker, text: string, key: string, voice: string, speed: number, session: number, waiter?: { session: number; index: number }) {
  // Join a background job for the same sentence instead of generating it twice.
  const pending = pendingByKey.get(key);
  const existing = pending !== undefined ? jobs.get(pending) : undefined;
  if (existing && existing.session === PREFETCH) {
    if (waiter) existing.waiters.push(waiter);
    return;
  }
  const id = ++jobSeq;
  jobs.set(id, { key, session, waiters: waiter ? [waiter] : [] });
  pendingByKey.set(key, id);
  w.postMessage({ type: 'speak', id, session, text, voice, speed });
}

/** Start downloading the voice early (e.g. when Settings opens) so the first read is quick. */
export function preloadNaturalVoice() {
  if (naturalVoiceSupported() && status.state !== 'error') getWorker();
}

function playNext(s: Session) {
  if (s !== current || s.source) return;
  if (s.next >= s.count) {
    current = null;
    return;
  }
  const chunk = s.ready.get(s.next);
  if (!chunk) {
    // A model download or generation can stall. Never leave a speaker tap silent indefinitely.
    s.timeout ??= setTimeout(() => failSession(s), 15000);
    return;
  }
  try {
    const ctx = audioContext();
    if (!ctx) return failSession(s);
    const buffer = ctx.createBuffer(1, chunk.samples.length, chunk.rate);
    buffer.copyToChannel(chunk.samples, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => {
      s.source = null;
      s.next += 1;
      playNext(s);
    };
    s.source = src;
    src.start();
    if (s.timeout !== null) clearTimeout(s.timeout);
    s.timeout = null;
  } catch {
    failSession(s);
  }
}

/** Split long passages into sentences so speech starts quickly. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Speak with the neural voice. `onFail` is called if the voice can't load or generate,
 * so the caller can fall back to the browser's own voice.
 */
export function speakNatural(text: string, voice: string, speed: number, onFail: () => void) {
  stopNatural();
  const parts = sentences(text);
  if (!parts.length) return;
  const w = getWorker();
  if (!w) return onFail();
  const s: Session = { id: ++sessionSeq, count: parts.length, ready: new Map(), next: 0, source: null, onFail, timeout: null };
  current = s;
  parts.forEach((part, index) => {
    const key = `${voice}|${speed}|${part}`;
    const hit = cache.get(key);
    if (hit) s.ready.set(index, hit);
    else request(w, part, key, voice, speed, s.id, { session: s.id, index });
  });
  playNext(s);
}

/**
 * Quietly generate speech ahead of time (e.g. the question on screen) so a later tap on
 * the speaker plays instantly. Does nothing until the voice has finished loading.
 */
export function prefetchNatural(text: string, voice: string, speed: number) {
  if (status.state !== 'ready' || !worker) return;
  for (const part of sentences(text)) {
    const key = `${voice}|${speed}|${part}`;
    if (!cache.has(key) && !pendingByKey.has(key)) request(worker, part, key, voice, speed, PREFETCH);
  }
}

export function stopNatural() {
  const s = current;
  current = null;
  if (s?.timeout !== null && s?.timeout !== undefined) clearTimeout(s.timeout);
  if (s?.source) {
    s.source.onended = null;
    try {
      s.source.stop();
    } catch {
      // Already stopped.
    }
  }
  // The worker drops cancelled jobs without replying. Release their bookkeeping here, too.
  for (const [id, job] of jobs) {
    if (job.session !== PREFETCH) finishJob(id);
    else job.waiters = [];
  }
  worker?.postMessage({ type: 'cancel', before: sessionSeq + 1 });
}
