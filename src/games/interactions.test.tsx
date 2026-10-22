// @vitest-environment jsdom
import '../../tests/browser-setup';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GAMES } from './all';
import type { Band } from './types';

vi.mock('../lib/speech', () => ({ canSpeak: () => true, speak: vi.fn(), prefetchSpeech: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../lib/sound', () => ({ play: vi.fn() }));

describe.each(GAMES)('$id gameplay', (game) => {
  it.each([0, 1, 2, 3] as Band[])('opens and accepts controls at age band %i', (band) => {
    vi.useFakeTimers();
    const finish = vi.fn();
    const view = render(<game.Play band={band} relaxed onFinish={finish} />);
    act(() => { vi.advanceTimersByTime(2400); });
    expect(view.container.textContent?.trim().length).toBeGreaterThan(0);
    const controls = Array.from(view.container.querySelectorAll('button, [role="button"], [role="application"]'));
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls.slice(0, 20)) {
      if (!control.isConnected || control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') continue;
      fireEvent.click(control);
      if (control.getAttribute('role') === 'application') fireEvent.keyDown(control, { key: 'ArrowRight' });
      act(() => { vi.advanceTimersByTime(100); });
    }
    for (const [score] of finish.mock.calls) {
      expect(Number.isInteger(score) && score >= 0).toBe(true);
    }
    expect(finish.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
