import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./natural-voice', () => ({
  naturalVoiceFailed: () => false, naturalVoiceReady: () => false, naturalVoiceSupported: () => false,
  prefetchNatural: vi.fn(), preloadNaturalVoice: vi.fn(), speakNatural: vi.fn(), stopNatural: vi.fn(),
}));
vi.mock('./sound', () => ({ audioContext: vi.fn(), wantPlayback: vi.fn() }));

import { setSetting } from './progress';
import { speak, speakable, stopSpeaking } from './speech';

describe('reading mathematical prompts', () => {
  it.each([
    ['2 + 3 + 4 = ?', '2 plus 3 plus 4 equals what?'],
    ['8 − 3 − 2 = ?', '8 minus 3 minus 2 equals what?'],
    ['2 × 3 × 4', '2 times 3 times 4'],
    ['12 ÷ 3 ÷ 2', '12 divided by 3 divided by 2'],
    ['−4 + (−2)', 'minus 4 plus (minus 2)'],
    ['25% of 80', '25 percent of 80'],
    ['1/2 < 3/4', '1 over 2 is less than 3 over 4'],
    ['A bird’s-eye view', 'A bird’s-eye view'],
  ])('reads %s clearly', (text, expected) => {
    expect(speakable(text)).toBe(expected);
  });
});

describe('device read-aloud', () => {
  const synth = { speak: vi.fn(), cancel: vi.fn(), resume: vi.fn(), getVoices: () => [], speaking: false, pending: false, paused: false };
  beforeEach(() => {
    vi.stubGlobal('window', { speechSynthesis: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text; } });
    setSetting('autoRead', false);
    vi.clearAllMocks();
    synth.speaking = false;
    synth.paused = false;
  });

  it('is quiet by default but a speaker tap reads the prompt', () => {
    speak('3 + 4 = ?');
    expect(synth.speak).not.toHaveBeenCalled();
    speak('3 + 4 = ?', { force: true });
    expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: '3 plus 4 equals what?' }));
  });

  it('reads automatically when enabled and stops on navigation', () => {
    setSetting('autoRead', true);
    speak('Count the apples.');
    expect(synth.speak).toHaveBeenCalledOnce();
    synth.speaking = true;
    stopSpeaking();
    expect(synth.cancel).toHaveBeenCalledOnce();
  });

  it('does not interrupt current narration for empty text', () => {
    synth.speaking = true;
    speak('   ', { force: true });
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('resumes a voice paused by a phone interruption', () => {
    synth.paused = true;
    speak('Hello!', { force: true });
    expect(synth.resume).toHaveBeenCalledOnce();
  });
});
