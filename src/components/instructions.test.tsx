// @vitest-environment jsdom
import '../../tests/browser-setup';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LessonPanel } from './LessonPanel';
import { ALL_LESSONS } from '../lessons/all';
import { speak, stopSpeaking } from '../lib/speech';
import { game } from '../games/circuit-builder';
import { GameShell } from './Games';

vi.mock('../lib/speech', () => ({ canSpeak: () => true, speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../lib/sound', () => ({ play: vi.fn() }));
vi.mock('../lib/confetti', () => ({ confetti: vi.fn() }));

describe('directions for children', () => {
  it('shows the playground instructions before choosing a guide tab', () => {
    const lesson = ALL_LESSONS[0];
    const view = render(<LessonPanel lesson={lesson} practice={<p>Practice question</p>} />);
    expect(view.getByText(lesson.sceneHint)).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Hear how to use the playground' }));
    expect(speak).toHaveBeenCalledWith(expect.stringContaining(lesson.sceneHint), { force: true });
  });

  it('stops the previous guide when changing tabs', () => {
    const view = render(<LessonPanel lesson={ALL_LESSONS[0]} practice={<p>Practice</p>} />);
    fireEvent.click(view.getByRole('tab', { name: 'Learn' }));
    fireEvent.click(view.getByRole('button', { name: 'Read this aloud' }));
    vi.mocked(stopSpeaking).mockClear();
    fireEvent.click(view.getByRole('tab', { name: 'Example' }));
    expect(stopSpeaking).toHaveBeenCalled();
  });

  it('keeps age-appropriate game directions available during play', async () => {
    const view = render(<GameShell game={game} band={0} onExit={() => {}} />);
    expect(view.getByText(/metal.*gap/i)).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Play' }));
    await act(async () => {});
    fireEvent.click(view.getByText('How to play', { selector: 'summary' }));
    expect(view.getByRole('button', { name: 'Hear the game instructions' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Start again' })).toBeTruthy();
  });
});
