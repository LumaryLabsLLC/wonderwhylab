/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js';

/**
 * Runs the Kokoro neural voice off the main thread.
 * Messages in:  { type: 'load' } | { type: 'speak', id, session, text, voice, speed } | { type: 'cancel', before }
 * Messages out: { type: 'progress', loaded, total } | { type: 'ready' } | { type: 'audio', id, samples, rate }
 *               | { type: 'failed', id } | { type: 'error', message }
 */

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

interface Job {
  id: number;
  session: number;
  text: string;
  voice: string;
  speed: number;
}

declare const self: DedicatedWorkerGlobalScope;

let model: Promise<KokoroTTS> | null = null;
const files = new Map<string, { loaded: number; total: number }>();
let queue: Job[] = [];
let busy = false;
let cancelledBefore = 0;

function load(): Promise<KokoroTTS> {
  model ??= KokoroTTS.from_pretrained(MODEL, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p) => {
      if (p.status !== 'progress') return;
      files.set(p.file, { loaded: p.loaded, total: p.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      self.postMessage({ type: 'progress', loaded, total });
    },
  }).then(
    (tts) => {
      self.postMessage({ type: 'ready' });
      return tts;
    },
    (err: unknown) => {
      model = null;
      self.postMessage({ type: 'error', message: String(err) });
      throw err;
    },
  );
  return model;
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift()!;
    if (job.session < cancelledBefore) continue;
    try {
      const tts = await load();
      if (job.session < cancelledBefore) continue;
      const audio = await tts.generate(job.text, { voice: job.voice as 'af_heart', speed: job.speed });
      const samples = audio.audio as Float32Array;
      self.postMessage({ type: 'audio', id: job.id, samples, rate: audio.sampling_rate }, [samples.buffer]);
    } catch {
      self.postMessage({ type: 'failed', id: job.id });
    }
  }
  busy = false;
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === 'load') {
    load().catch(() => {});
  } else if (msg.type === 'speak') {
    queue.push(msg as Job);
    void pump();
  } else if (msg.type === 'cancel') {
    cancelledBefore = Math.max(cancelledBefore, msg.before);
    queue = queue.filter((j) => j.session >= cancelledBefore);
  }
};
