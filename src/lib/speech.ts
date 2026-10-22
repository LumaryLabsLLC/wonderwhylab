import { useSyncExternalStore } from 'react';
import { naturalVoiceFailed, naturalVoiceReady, naturalVoiceSupported, prefetchNatural, preloadNaturalVoice, speakNatural, stopNatural } from './natural-voice';
import { getSettings } from './progress';
import { audioContext, wantPlayback } from './sound';

/**
 * Read text aloud for children who are still learning to read.
 *
 * The `voice` setting is one of:
 *   ""                 automatic: on a computer the natural voice if this browser can run it, else a device voice;
 *                      on a phone or tablet the device voice (the natural voice's ~110 MB download and
 *                      on-device generation are too heavy there, and the device voice answers a tap at once)
 *   "natural:<id>"     a Kokoro neural voice, e.g. "natural:af_heart"
 *   "device:<id>"      one of the browser's built-in voices ("name|lang")
 */

/** Joke and robot voices that ship with macOS — not great for lessons. */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Fred|Good News|Jester|Junior|Kathy|Organ|Superstar|Ralph|Trinoids|Whisper|Zarvox)\b/i;

/** Least-robotic built-in voices, tried in order when no device voice is chosen. */
const PREFERRED = ['Google US English', 'Google UK English Female', 'Karen', 'Moira', 'Tessa', 'Flo', 'Samantha'];

const DEFAULT_NATURAL = 'af_heart';

let cache: SpeechSynthesisVoice[] = [];

function hasDeviceSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Phones and tablets, including iPads that report themselves as a Mac. */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios || window.matchMedia?.('(pointer: coarse)').matches === true;
}

function readVoices(): SpeechSynthesisVoice[] {
  if (!hasDeviceSpeech()) return cache;
  const seen = new Set<string>();
  const list = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en') && !NOVELTY.test(v.name))
    .filter((v) => {
      const key = voiceId(v);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  // Keep the snapshot stable unless the list really changed.
  if (list.length !== cache.length || list.some((v, i) => v !== cache[i])) cache = list;
  return cache;
}

function subscribeVoices(onChange: () => void) {
  if (!hasDeviceSpeech()) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', onChange);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', onChange);
}

/** The browser's English voices (they load asynchronously in Chrome). */
export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, readVoices, () => cache);
}

/** A stable id for a device voice, so the choice can be saved. */
export function voiceId(v: SpeechSynthesisVoice) {
  return `${v.name}|${v.lang}`;
}

/** The device voice to use when the natural voice isn't in play. */
export function currentVoice(): SpeechSynthesisVoice | undefined {
  const voices = readVoices();
  const chosen = getSettings().voice.replace(/^device:/, '');
  const hit = voices.find((v) => voiceId(v) === chosen);
  if (hit) return hit;
  for (const name of PREFERRED) {
    const v = voices.find((voice) => voice.name.startsWith(name));
    if (v) return v;
  }
  return voices[0];
}

/** Which natural voice to use, or null to use a device voice. */
export function naturalChoice(setting = getSettings().voice): string | null {
  if (!naturalVoiceSupported() || naturalVoiceFailed()) return null;
  if (setting === '') return isTouchDevice() && hasDeviceSpeech() ? null : DEFAULT_NATURAL;
  if (setting.startsWith('natural:')) return setting.slice('natural:'.length);
  return null;
}

/** Turn math symbols into words a speech engine reads correctly. */
export function speakable(text: string): string {
  return text
    // Replace operators themselves so chained sums and bracketed operands are all read.
    .replace(/\s*×\s*/g, ' times ')
    .replace(/\s*÷\s*/g, ' divided by ')
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*−\s*/g, ' minus ')
    // Keep hyphenated words intact; an ASCII hyphen is subtraction only in a calculation.
    .replace(/(?<=[\d?)])\s*-\s*(?=[\d?(]|[a-z]\b)/g, ' minus ')
    .replace(/(^|[\s(])-(?=\d)/g, '$1minus ')
    .replace(/\b(\d+)\/(\d+)\b/g, '$1 over $2')
    .replace(/=\s*\?/g, 'equals what?')
    .replace(/=/g, ' equals ')
    .replace(/</g, ' is less than ')
    .replace(/>/g, ' is greater than ')
    .replace(/%/g, ' percent')
    .replace(/°/g, ' degrees')
    .replace(/\?\?/g, '?')
    .replace(/\(\s+/g, '(')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function canSpeak(): boolean {
  return hasDeviceSpeech() || naturalVoiceSupported();
}

/** Held while speaking: browsers can drop an utterance that nothing refers to and go quiet mid-sentence. */
let utterance: SpeechSynthesisUtterance | null = null;
/** The silent utterance that unlocks speech on iPhone (see unlockSpeech). */
let unlocker: SpeechSynthesisUtterance | null = null;

function speakDevice(words: string) {
  if (!hasDeviceSpeech()) return;
  const synth = window.speechSynthesis;
  wantPlayback();
  const u = new SpeechSynthesisUtterance(words);
  const v = currentVoice();
  u.lang = v?.lang ?? 'en-US';
  if (v) u.voice = v;
  u.rate = getSettings().rate;
  u.pitch = 1.05;
  u.onend = u.onerror = () => {
    if (utterance === u) utterance = null;
  };
  utterance = u;
  synth.speak(u);
  // iPhone can leave the speech engine paused after an interruption such as a call.
  if (synth.paused) synth.resume();
}

/**
 * iPhone only starts speech from inside a tap. Reading questions aloud happens a moment after a tap
 * (when the next question appears), so speak nothing during a tap first; after that it is allowed.
 */
export function unlockSpeech() {
  if (!hasDeviceSpeech() || unlocker) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  unlocker = u;
  utterance = u;
  window.speechSynthesis.speak(u);
}

/**
 * Read `text` aloud. Without `force` it only speaks when "Read questions aloud" is on,
 * so automatic reads respect the setting while speaker buttons always work.
 * `preview` is for trying a voice in Settings: it always uses the chosen voice, waiting for it to download if need be.
 */
export function speak(text: string, opts: { force?: boolean; preview?: boolean } = {}) {
  if (!canSpeak()) return;
  const { autoRead, rate } = getSettings();
  if (!autoRead && !opts.force) return;
  const words = speakable(text);
  if (!words) return;
  stopSpeaking();
  const natural = naturalChoice();
  if (natural && (naturalVoiceReady() || opts.preview || !hasDeviceSpeech())) {
    // Wake the audio now, while this still counts as a tap: the speech itself arrives a moment later.
    audioContext();
    // Settings rate 0.9 is "normal"; Kokoro's normal speed is 1.
    speakNatural(words, natural, rate / 0.9, () => speakDevice(words));
  } else {
    // Never leave a tap unanswered while the natural voice downloads: the device voice speaks now.
    speakDevice(words);
    if (natural) preloadNaturalVoice();
  }
}

export function stopSpeaking() {
  stopNatural();
  if (!hasDeviceSpeech()) return;
  const synth = window.speechSynthesis;
  if ((synth.speaking || synth.pending) && utterance !== unlocker) synth.cancel();
}

/** Get `text` ready to speak in the background, so tapping the speaker later is instant. */
export function prefetchSpeech(text: string) {
  const natural = naturalChoice();
  if (natural) prefetchNatural(speakable(text), natural, getSettings().rate / 0.9);
}

/** Warm up the natural voice if it is the one that will be used. */
export function prepareVoice() {
  if (naturalChoice()) preloadNaturalVoice();
}

// Unlock speech on the first real tap (see unlockSpeech) on phones and tablets, and anywhere "Read questions
// aloud" is on, so speech that starts a moment after a tap, or from a menu choice, is allowed.
if (typeof window !== 'undefined') {
  const onTap = (e: Event) => {
    if (!e.isTrusted || !(getSettings().autoRead || isTouchDevice())) return;
    unlockSpeech();
    for (const type of ['pointerup', 'keydown']) window.removeEventListener(type, onTap, true);
  };
  for (const type of ['pointerup', 'keydown']) window.addEventListener(type, onTap, true);
}
