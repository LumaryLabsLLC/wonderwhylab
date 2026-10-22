import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const context = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./sound', () => ({ audioContext: context.get }));

class VoiceWorker {
  static instances: VoiceWorker[] = [];
  onmessage: ((e: { data: Record<string, unknown> }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  constructor() { VoiceWorker.instances.push(this); }
  send(data: Record<string, unknown>) { this.onmessage?.({ data }); }
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  VoiceWorker.instances = [];
  vi.stubGlobal('Worker', VoiceWorker);
  context.get.mockReturnValue(null);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('natural voice reliability', () => {
  it('plays generated sentences in order and clears the waiting timeout during playback', async () => {
    const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; onended: null | (() => void) }[] = [];
    context.get.mockReturnValue({
      destination: {},
      createBuffer: () => ({ copyToChannel: vi.fn() }),
      createBufferSource: () => {
        const source = { start: vi.fn(), stop: vi.fn(), connect: vi.fn(), onended: null };
        sources.push(source);
        return source;
      },
    });
    const voice = await import('./natural-voice');
    const fallback = vi.fn();
    voice.speakNatural('First sentence. Second sentence.', 'af_heart', 1, fallback);
    const worker = VoiceWorker.instances[0];
    const jobs = worker.postMessage.mock.calls.map(([m]) => m).filter(m => m.type === 'speak');
    worker.send({ type: 'audio', id: jobs[1].id, samples: new Float32Array([0.1]), rate: 24000 });
    expect(sources).toHaveLength(0);
    worker.send({ type: 'audio', id: jobs[0].id, samples: new Float32Array([0.2]), rate: 24000 });
    expect(sources).toHaveLength(1);
    expect(sources[0].start).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(20000);
    expect(fallback).not.toHaveBeenCalled();
    sources[0].onended?.();
    expect(sources).toHaveLength(2);
    expect(sources[1].start).toHaveBeenCalledOnce();
    sources[1].onended?.();
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back if the browser blocks creating a voice worker', async () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Worker blocked'); } });
    const voice = await import('./natural-voice');
    const fallback = vi.fn();
    expect(() => voice.speakNatural('Hello.', 'af_heart', 1, fallback)).not.toThrow();
    expect(fallback).toHaveBeenCalledOnce();
    expect(voice.naturalVoiceFailed()).toBe(true);
  });

  it('falls back when speech generation stalls', async () => {
    const voice = await import('./natural-voice');
    const fallback = vi.fn();
    voice.speakNatural('Hello.', 'af_heart', 1, fallback);
    vi.advanceTimersByTime(15000);
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('falls back when audio playback is unavailable', async () => {
    const voice = await import('./natural-voice');
    const fallback = vi.fn();
    voice.speakNatural('Hello.', 'af_heart', 1, fallback);
    const worker = VoiceWorker.instances[0];
    const job = worker.postMessage.mock.calls.find(([m]) => m.type === 'speak')![0];
    worker.send({ type: 'audio', id: job.id, samples: new Float32Array([0.2, -0.2]), rate: 24000 });
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('never reads cancelled text after a worker error or late response', async () => {
    const voice = await import('./natural-voice');
    const fallback = vi.fn();
    voice.speakNatural('Old question.', 'af_heart', 1, fallback);
    const worker = VoiceWorker.instances[0];
    const job = worker.postMessage.mock.calls.find(([m]) => m.type === 'speak')![0];
    voice.stopNatural();
    worker.send({ type: 'audio', id: job.id, samples: new Float32Array([0.2]), rate: 24000 });
    worker.onerror?.();
    vi.advanceTimersByTime(20000);
    expect(fallback).not.toHaveBeenCalled();
    expect(context.get).not.toHaveBeenCalled();
  });
});
