// @vitest-environment jsdom
import '../../tests/browser-setup';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GAMES } from './all';
import type { Band } from './types';
import * as balance from './balance-lab/puzzles';
import * as fractions from './fraction-cafe/rounds';

vi.mock('../lib/speech', () => ({ canSpeak: () => true, speak: vi.fn(), prefetchSpeech: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../lib/sound', () => ({ play: vi.fn() }));

const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const key = (el: Element, value: string) => fireEvent.keyDown(el, { key: value });
function open(id: string, band: Band) {
  vi.useFakeTimers();
  const game = GAMES.find(g => g.id === id)!;
  const finish = vi.fn();
  return { ...render(<game.Play band={band} relaxed onFinish={finish} />), finish };
}
function amount(label: string): number {
  const text = label.replace(/−/g, '-').replace(/[()]/g, '').trim();
  const nums = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (/over|\//.test(text)) return nums[0] / nums[1];
  if (/plus|\+/.test(text)) return nums[0] + nums[1];
  if (/times|×/.test(text)) return nums[0] * nums[1];
  if (/÷/.test(text)) return nums[0] / nums[1];
  if (nums.length === 2 && /\s[-−]\s/.test(text)) return nums[0] - nums[1];
  if (/% of/.test(text)) return nums[0] * nums[1] / 100;
  return text.endsWith('%') ? nums[0] / 100 : nums[0];
}

describe.each([0, 1, 2, 3] as Band[])('math game completion at age band %i', (band) => {
  it('feeds every monster order with the exact amount', () => {
    const view = open('feed-monster', band);
    for (let n = 0; n < 8; n++) {
      const ask = view.container.querySelector('.feed-monster-ask')!.textContent!;
      const nums = ask.match(/\d+(?:\.\d+)?/g)!.map(Number);
      const supply = view.getAllByRole('button', { name: /Put it on the plate/ });
      const need = band === 0 ? nums[0] : band === 1 ? 10 - nums[0] : band === 2 ? nums[0] / nums[1] : Math.round(amount(ask.replace(/^I want /, '').replace(/ of a pizza!.*$/, '')) * supply.length);
      for (let i = 0; i < need; i++) key(supply[i], 'Enter');
      fireEvent.click(view.getByRole('button', { name: 'Feed me!' }));
      wait(1400);
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(8);
  });

  it('pops enough matching bubbles to finish a relaxed round', () => {
    const view = open('bubble-pop', band);
    for (let tick = 0; tick < 150 && !view.finish.mock.calls.length; tick++) {
      wait(1000);
      const rule = view.container.querySelector('.bubble-pop-goal')!.textContent!;
      const target = Number(rule.match(/\d+/)?.[0] ?? 0);
      const bubbles = Array.from(view.container.querySelectorAll<HTMLButtonElement>('.bubble-pop-bubble:not(:disabled)'));
      const right = bubbles.find(b => {
        const value = amount(b.getAttribute('aria-label')!);
        if (/even/.test(rule)) return value % 2 === 0;
        if (/multiples/.test(rule)) return value % target === 0;
        if (/bigger/.test(rule)) return value > 0.5;
        if (/fractions/.test(rule)) return value === 0.5;
        return value === target;
      });
      if (right) fireEvent.click(right);
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(15);
  });

  it('steers through all twelve rocket questions in relaxed mode', () => {
    const view = open('rocket-race', band);
    for (let n = 0; n < 12; n++) {
      const field = view.getByRole('application');
      const prompt = view.container.querySelector('.rocket-race-question p')!.textContent!;
      const gates = Array.from(view.container.querySelectorAll('.rocket-race-gate > span'));
      const values = gates.map(el => amount(el.textContent!));
      const picture = view.container.querySelector('.rocket-race-picture svg');
      const answer = picture ? amount(picture.getAttribute('aria-label')!) : /biggest/.test(prompt) ? Math.max(...values) : amount(prompt);
      const lane = values.findIndex(value => Math.abs(value - answer) < 1e-6);
      expect(lane, prompt).toBeGreaterThanOrEqual(0);
      key(field, 'ArrowLeft');
      key(field, 'ArrowLeft');
      for (let i = 0; i < lane; i++) key(field, 'ArrowRight');
      key(field, 'ArrowUp');
      wait(4000);
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(12);
  });

  it('finds all memory pairs after looking at the cards', () => {
    const view = open('memory-match', band);
    const cards = view.container.querySelectorAll<HTMLButtonElement>('.memory-match-card');
    const pairs = new Map<number, HTMLButtonElement[]>();
    for (let i = 0; i < cards.length; i += 2) {
      for (const card of [cards[i], cards[i + 1]]) {
        fireEvent.click(card);
        const value = amount(card.getAttribute('aria-label')!);
        pairs.set(value, [...(pairs.get(value) ?? []), card]);
      }
      wait(1000);
    }
    for (const pair of pairs.values()) {
      expect(pair).toHaveLength(2);
      if (pair[0].disabled) continue;
      pair.forEach(card => fireEvent.click(card));
      wait(1000);
    }
    expect(view.finish).toHaveBeenCalledOnce();
  });

  it('sorts every card using the actual basket rules', () => {
    const view = open('sort-it', band);
    for (let n = 0; n < 12; n++) {
      const card = view.container.querySelector('.sort-it-card.is-idle')!;
      const name = card.getAttribute('aria-label')!.split('. Drag')[0];
      const value = amount(name);
      const left = band === 0 ? value < 5 : band === 1 ? value % 2 === 1 : band === 2 ? value % 3 === 0 : value < 0.5;
      key(card, left ? 'ArrowLeft' : 'ArrowRight');
      wait(800);
    }
    wait(2000);
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(12);
  });

  it('balances all seesaws using the available weights and pegs', () => {
    const factory = vi.spyOn(balance, 'makePuzzles');
    const view = open('balance-lab', band);
    const puzzles = factory.mock.results[0].value as balance.Puzzle[];
    for (const puzzle of puzzles) {
      for (const piece of puzzle.solution) {
        key(view.getAllByRole('button', { name: `Weight ${piece.mass}` })[0], 'Enter');
        key(view.getByRole('button', { name: `Peg ${piece.dist}` }), 'Enter');
      }
      wait(1000);
      fireEvent.click(view.getByRole('button', { name: /Next|Finish/ }));
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(balance.PUZZLES);
  });

  it('finishes ten frog jumps using the number line keyboard controls', () => {
    const view = open('number-line-jump', band);
    for (let n = 0; n < 10; n++) {
      const line = view.getByRole('application');
      const nums = line.getAttribute('aria-label')!.replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const [min, max, target] = nums;
      const increment = max === 100 ? 5 : max === 1 ? 0.05 : 1;
      for (let i = 0; i < 25; i++) key(line, 'ArrowLeft');
      for (let i = 0; i < Math.round((target - min) / increment); i++) key(line, 'ArrowRight');
      key(line, 'Enter');
      wait(750);
      key(line, 'Enter');
    }
    expect(view.finish).toHaveBeenCalledOnce();
    expect(view.finish.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('serves every fraction cafe order, including sharing and comparison rounds', () => {
    const factory = vi.spyOn(fractions, 'makeRound');
    const view = open('fraction-cafe', band);
    for (let n = 0; n < fractions.ROUNDS; n++) {
      const round = factory.mock.results.at(-1)!.value as fractions.Round;
      if (round.kind === 'share') {
        fireEvent.click(view.getByRole('button', { name: `Cut into ${round.friends}` }));
        fireEvent.click(view.getByRole('button', { name: 'Share it!' }));
        view.getAllByRole('button', { name: /^Piece \d+$/ }).forEach(piece => key(piece, 'Enter'));
      } else if (round.kind === 'compare') {
        const index = fractions.cmp(round.plates[0], round.plates[1]) > 0 ? 0 : 1;
        key(view.getAllByRole('button', { name: /^Plate with/ })[index], 'Enter');
      } else {
        const serving = fractions.servings(round)[0];
        const slices = Array.from(view.container.querySelectorAll('.fraction-cafe-piece[role="button"]'));
        let offset = 0;
        for (let food = 0; food < round.stock.length; food++) {
          for (let i = 0; i < serving[food]; i++) key(slices[offset + i], 'Enter');
          offset += round.stock[food];
        }
        fireEvent.click(view.getByRole('button', { name: 'Serve it!' }));
      }
      fireEvent.click(view.getByRole('button', { name: /Next order|Finish/ }));
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(fractions.ROUNDS);
  });
});
