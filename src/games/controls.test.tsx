// @vitest-environment jsdom
import '../../tests/browser-setup';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { game as quickLook } from './quick-look';
import { game as bubblePop } from './bubble-pop';
import { game as balanceLab } from './balance-lab';
import { game as fractionCafe } from './fraction-cafe';
import { game as letterFishing } from './letter-fishing';

vi.mock('../lib/sound', () => ({ play: vi.fn() }));
vi.mock('../lib/speech', () => ({ canSpeak: () => true, speak: vi.fn() }));

describe('game keyboard controls', () => {
  it('catches a fish when its button is activated by keyboard or a screen reader', () => {
    vi.useFakeTimers();
    const view = render(<letterFishing.Play band={0} relaxed onFinish={() => {}} />);
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(view.getAllByRole('button', { name: /^Fish with letter/ })[0], { detail: 0 });
    expect(view.getByLabelText('1 of 12 caught')).toBeTruthy();
  });
  it('offers simple cuts so the youngest children can share without a precise drag', () => {
    const view = render(<fractionCafe.Play band={0} relaxed onFinish={() => {}} />);
    fireEvent.click(view.getByRole('button', { name: 'Cut into 2' }));
    fireEvent.click(view.getByRole('button', { name: 'Share it!' }));
    const pieces = view.getAllByRole('button', { name: /^Piece \d+$/ });
    expect(pieces).toHaveLength(2);
    pieces.forEach(piece => fireEvent.keyDown(piece, { key: 'Enter' }));
    expect(view.getByRole('button', { name: 'Next order' })).toBeTruthy();
  });
  it('lets a child choose a Balance Lab weight and peg with the keyboard', () => {
    vi.useFakeTimers();
    const view = render(<balanceLab.Play band={0} relaxed onFinish={() => {}} />);
    const weight = view.getAllByRole('button', { name: /^Weight \d+$/ })[0];
    expect(weight.tabIndex).toBe(0);
    fireEvent.keyDown(weight, { key: 'Enter' });
    const peg = view.getByRole('button', { name: 'Peg 3' });
    expect(peg.tabIndex).toBe(0);
    fireEvent.keyDown(peg, { key: 'Enter' });
    expect(view.getAllByRole('button', { name: /on peg 3/ }).length).toBe(1);
  });
  it('lets a child add and remove Quick Look counters with Enter and Space', () => {
    vi.useFakeTimers();
    const view = render(<quickLook.Play band={0} relaxed onFinish={() => {}} />);
    act(() => { vi.advanceTimersByTime(4000); });
    const cell = view.getByRole('button', { name: 'Space 1' });
    expect(cell.tabIndex).toBe(0);
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(cell.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(cell, { key: ' ' });
    expect(cell.getAttribute('aria-pressed')).toBe('false');
  });

  it('lets a child pop a correct bubble by keyboard', () => {
    vi.useFakeTimers();
    const view = render(<bubblePop.Play band={0} relaxed onFinish={() => {}} />);
    act(() => { vi.advanceTimersByTime(100); });
    const rule = view.container.querySelector('.bubble-pop-goal')!.textContent!;
    const target = rule.match(/\d+/)![0];
    const bubble = Array.from(view.container.querySelectorAll<HTMLButtonElement>('.bubble-pop-bubble')).find(el => el.getAttribute('aria-label')?.startsWith(target))!;
    expect(bubble.tabIndex).toBe(0);
    fireEvent.click(bubble, { detail: 0 });
    expect(view.getByLabelText('1 of 15 popped')).toBeTruthy();
  });
});
