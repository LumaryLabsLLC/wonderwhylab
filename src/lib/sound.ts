import { getSettings } from './progress';

/** Tiny synthesised sound effects — no audio files needed. */
let ctx: AudioContext | null = null;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * On iPhone, Web Audio is silenced by the ring/silent switch unless the page asks for "playback".
 * Every sound here answers a child's tap, so ask for it just before making one.
 */
export function wantPlayback() {
  if (typeof navigator === 'undefined') return;
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (!session || session.type === 'playback') return;
  try {
    session.type = 'playback';
  } catch {
    // Not supported here.
  }
}

/**
 * The shared audio context (created on first use and woken if the browser paused it).
 * Call it during a tap the first time: iPhone only lets audio start from one.
 */
export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  wantPlayback();
  ctx ??= new AudioContext();
  // 'suspended' before the first tap, 'interrupted' on iPhone after a call or another app played sound.
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  return ctx;
}

// Start the audio on the first real tap and wake it on later ones if it was paused. Safari only lets audio
// start during a tap, and picking from a menu (like the voice list) doesn't always count as one.
// (On iPhone a finger's pointerdown doesn't count either; lifting it does.)
if (typeof window !== 'undefined') {
  const wake = (e: Event) => {
    if (!e.isTrusted) return;
    if (!ctx && 'AudioContext' in window) ctx = new AudioContext();
    if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
  };
  for (const type of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, wake, { capture: true, passive: true });
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const a = audioContext();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export type SoundName = 'tap' | 'pop' | 'correct' | 'wrong' | 'complete' | 'whoosh';

export function play(name: SoundName) {
  if (!getSettings().effects) return;
  switch (name) {
    case 'tap':
      tone(880, 0, 0.06, 'triangle', 0.05);
      break;
    case 'pop':
      tone(520, 0, 0.08, 'sine', 0.1);
      tone(780, 0.04, 0.08, 'sine', 0.08);
      break;
    case 'correct':
      tone(660, 0, 0.12, 'triangle');
      tone(990, 0.1, 0.2, 'triangle');
      break;
    case 'wrong':
      tone(240, 0, 0.18, 'sine', 0.08);
      tone(200, 0.12, 0.22, 'sine', 0.06);
      break;
    case 'complete':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.1));
      break;
    case 'whoosh':
      tone(300, 0, 0.12, 'sine', 0.04);
      tone(450, 0.05, 0.12, 'sine', 0.04);
      break;
  }
}
