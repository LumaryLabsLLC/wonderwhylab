// @vitest-environment jsdom
import '../../tests/browser-setup';
import { act, fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ALL_LESSONS } from './all';
import { LessonPanel } from '../components/LessonPanel';
import { TryIt } from '../components/TryIt';
import { isCorrect } from '../lib/answers';

vi.mock('../lib/speech', () => ({ canSpeak: () => true, speak: vi.fn(), prefetchSpeech: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../lib/sound', () => ({ play: vi.fn(), audioContext: () => null }));
vi.mock('../lib/confetti', () => ({ confetti: vi.fn() }));

describe.each(ALL_LESSONS)('$id interaction', (lesson) => {
  it('opens its playground and responds to its scene buttons without crashing', () => {
    vi.useFakeTimers();
    const view = render(<lesson.Scene />);
    expect(view.container.querySelector('svg')).not.toBeNull();
    // Exercise controls in their real scene, including controls revealed by an earlier tap.
    for (let i = 0; i < 12; i++) {
      const controls = Array.from(view.container.querySelectorAll('[role="button"], button'));
      const control = controls[i];
      if (control && !control.hasAttribute('disabled') && control.getAttribute('aria-disabled') !== 'true') {
        fireEvent.click(control);
        act(() => { vi.advanceTimersByTime(200); });
      }
    }
  });

  it('shows Learn and Example and finishes five practice questions', () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    let answer = '';
    let choiceIndex = -1;
    const next = (level: number) => {
      const q = lesson.makeQuestion(level);
      answer = q.answer;
      choiceIndex = q.choices?.findIndex(c => isCorrect(c.value, q.answer)) ?? -1;
      return q;
    };
    const view = render(<LessonPanel lesson={lesson} practice={
      <TryIt goal={5} next={next} onFinish={finish} renderDone={() => <p>Finished the lesson</p>} />
    } />);
    fireEvent.click(view.getByRole('tab', { name: 'Learn' }));
    expect(view.getByText(lesson.learn.intro)).toBeTruthy();
    fireEvent.click(view.getByRole('tab', { name: 'Example' }));
    expect(view.getAllByText(lesson.example.answer).length).toBeGreaterThan(0);
    fireEvent.click(view.getByRole('tab', { name: 'Practice' }));
    for (let n = 0; n < 5; n++) {
      const practice = within(view.getByRole('tabpanel', { name: 'Practice' }));
      const choices = Array.from(view.container.querySelectorAll('.choice'));
      if (choices.length) {
        fireEvent.click(choices[choiceIndex]);
      } else {
        fireEvent.change(practice.getByRole('textbox', { name: 'Your answer' }), { target: { value: answer } });
        fireEvent.click(practice.getByRole('button', { name: 'Check' }));
      }
      act(() => { vi.advanceTimersByTime(1200); });
    }
    expect(finish).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ total: 5, stars: 3 }));
    expect(view.getByText('Finished the lesson')).toBeTruthy();
  });
});
