// @vitest-environment jsdom
import '../../tests/browser-setup';
import { act, fireEvent, render, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAMES } from './all';
import type { Band } from './types';
import * as body from './body-builder/rounds';
import * as garden from './garden-lab/rounds';
import * as words from './word-builder/rounds';
import * as sounds from './first-sounds/rounds';
import * as trains from './abc-train/rounds';
import * as molecules from './molecule-builder/orders';
import * as looks from './quick-look/rounds';
import * as launch from './launch-lab/physics';
import * as habitats from './habitat-rescue/habitats';
import * as sentences from './sentence-builder/rounds';
import * as blending from './sound-it-out/rounds';
import * as fishing from './letter-fishing/targets';
import * as potions from './potion-lab/potions';
import * as detective from './story-detective/rounds';
import * as circuits from './circuit-builder/circuit';
import * as shapes from './tangram-builder/rounds';

vi.mock('../lib/speech', () => ({ canSpeak: () => true, speak: vi.fn(), prefetchSpeech: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../lib/sound', () => ({ play: vi.fn() }));

beforeEach(() => {
  let seed = 83178;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  });
});

const bands: Band[] = [0, 1, 2, 3];
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const keyTap = (el: Element) => fireEvent.keyDown(el, { key: 'Enter' });
const attr = (root: HTMLElement, name: string, value: string) => {
  const el = Array.from(root.querySelectorAll(`[${name}]`)).find(el => el.getAttribute(name) === value);
  if (!el) throw new Error(`Missing target ${name}=${value}`);
  return el;
};
function open(id: string, band: Band) {
  vi.useFakeTimers();
  const game = GAMES.find(g => g.id === id)!;
  const finish = vi.fn();
  return { ...render(<game.Play band={band} relaxed onFinish={finish} />), finish };
}
const expectFinished = (finish: ReturnType<typeof vi.fn>) => {
  expect(finish).toHaveBeenCalledOnce();
  expect(finish).toHaveBeenCalledWith(expect.any(Number));
  expect(finish.mock.calls[0][0]).toBeGreaterThan(0);
};

describe.each(bands)('complete games at age band %i', (band) => {
  it('catches twelve matching letters and spells words in order', () => {
    const factory = vi.spyOn(fishing, 'makeTarget');
    const view = open('letter-fishing', band);
    let progress = 0;
    let catches = 0;
    for (let tick = 0; tick < 240 && !view.finish.mock.calls.length; tick++) {
      wait(500);
      const target = factory.mock.results.at(-1)!.value as fishing.Target;
      const fish = view.queryAllByRole('button', { name: `Fish with letter ${target.answers[progress]}` }).find(el => !(el as HTMLButtonElement).disabled);
      if (fish) {
        const count = factory.mock.calls.length;
        fireEvent.click(fish);
        catches++;
        progress = factory.mock.calls.length !== count ? 0 : target.kind === 'spell' ? progress + 1 : 0;
      }
      if (catches === 12) { wait(1200); break; }
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(12);
  });

  it('makes every potion using real mixing, temperature and pH controls', () => {
    const factory = vi.spyOn(potions, 'makeOrders');
    const view = open('potion-lab', band);
    const orders = factory.mock.results[0].value as potions.Order[];
    const pour = (id: potions.IngredientId) => fireEvent.click(view.getByRole('button', { name: `Pour in ${potions.INGREDIENTS[id].name}` }));
    for (const order of orders) {
      if (order.kind === 'mix') {
        const paints = { purple: ['red', 'blue'], orange: ['red', 'yellow'], green: ['blue', 'yellow'] } as const;
        paints[order.target].forEach(pour);
      } else if (order.kind === 'fizz') {
        pour(order.shelf.find(s => potions.ACIDS.includes(s))!);
        pour('soda');
      } else if (order.kind === 'dissolve') pour(order.shelf.find(potions.dissolves)!);
      else if (order.kind === 'ph') {
        for (let i = 0; i < Math.abs(order.target - order.start); i++) pour(order.target > order.start ? 'base' : 'acid');
        fireEvent.click(view.getByRole('button', { name: 'Serve' }));
      } else {
        const temp = order.target === 'ice' ? 0 : order.target === 'steam' ? 100 : 20;
        for (let i = 0; i < Math.abs(temp - order.start) / 5; i++) fireEvent.keyDown(view.getByRole('slider', { name: 'Temperature' }), { key: temp > order.start ? 'ArrowRight' : 'ArrowLeft' });
        fireEvent.click(view.getByRole('button', { name: 'Serve' }));
      }
      wait(1500);
      fireEvent.click(view.getByRole('button', { name: /^(Next|Finish)$/ }));
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(potions.ORDERS);
  });

  it('solves every picture story or finds evidence and answers each story question', () => {
    const factory = vi.spyOn(detective, 'makeRound');
    const view = open('story-detective', band);
    for (let n = 0; n < detective.ROUNDS; n++) {
      const round = factory.mock.results.at(-1)!.value as detective.Round;
      if (round.kind === 'pictures') {
        for (let i = round.prefilled; i < 3; i++) fireEvent.click(view.getByRole('button', { name: `Picture: ${round.story.frames[i].caption}` }));
        wait(700);
        const answer = Array.from(view.container.querySelectorAll('.story-detective-item')).find(el => el.textContent === round.story.question.answer)!;
        fireEvent.click(answer);
      } else {
        fireEvent.click(view.container.querySelector('.story-detective-glass')!);
        fireEvent.click(attr(view.container, 'data-sd-sentence', String(round.question.evidence[0])));
        fireEvent.click(view.getByRole('button', { name: round.question.answer }));
      }
      fireEvent.click(view.getByRole('button', { name: 'Next' }));
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(detective.ROUNDS);
  });

  it('closes every circuit using the real parts and wire controls', () => {
    const factory = vi.spyOn(circuits, 'makePuzzles');
    const view = open('circuit-builder', band);
    const puzzles = factory.mock.results[0].value as circuits.Puzzle[];
    const names = { straight: 'straight wire', corner: 'corner wire', tee: 'T wire', bulb: 'bulb' };
    for (const puzzle of puzzles) {
      let board = puzzle.board;
      const cell = (i: number) => view.container.querySelector(`.cb-hit[x="${i % board.w * 100 + 2}"][y="${Math.floor(i / board.w) * 100 + 2}"]`)!;
      for (let i = 0; i < board.cells.length; i++) {
        const c = board.cells[i];
        if (c?.kind === 'wire' && c.solution !== undefined) {
          for (let t = 0; t < 4 && circuits.maskOf(board.cells[i]) !== c.solution; t++) { keyTap(cell(i)); board = circuits.tapCell(board, i, band); }
        }
        if (c?.kind === 'switch' && !c.closed) { keyTap(cell(i)); board = circuits.tapCell(board, i, band); }
      }
      for (let i = 0; i < board.cells.length; i++) {
        const c = board.cells[i];
        if (c?.kind === 'slot') {
          const material = puzzle.materials.find(m => circuits.MATERIALS[m].conductor)!;
          fireEvent.click(view.getByRole('button', { name: circuits.MATERIALS[material].name }));
          keyTap(cell(i));
          board = circuits.putMaterial(board, i, material);
        } else if (c?.kind === 'gap' && c.need) {
          const tile = circuits.trayLeft(puzzle, board).find(t => t.part === c.need!.part)!;
          fireEvent.click(within(view.container.querySelector<HTMLElement>('.cb-tray')!).getAllByRole('button', { name: names[tile.part] })[0]);
          keyTap(cell(i));
          board = circuits.placeTile(board, i, tile);
          for (let t = 0; t < 4 && circuits.maskOf(board.cells[i]) !== c.need.mask; t++) { keyTap(cell(i)); board = circuits.tapCell(board, i, band); }
        }
      }
      fireEvent.click(view.getByRole('button', { name: /^(Next|Finish)/ }));
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(circuits.ROUNDS);
  });

  it('fits every shape with keyboard movement and earns credit for correct placements', () => {
    const factory = vi.spyOn(shapes, 'nextRound');
    const view = open('tangram-builder', band);
    for (let n = 0; n < shapes.ROUNDS; n++) {
      const round = factory.mock.results.at(-1)!.value as shapes.Round;
      const remaining = [...round.solution];
      for (let i = 0; i < round.pieces.length; i++) {
        const piece = round.pieces[i];
        const slot = remaining.findIndex(p => p.type === piece.type);
        const target = remaining.splice(slot, 1)[0];
        const el = view.container.querySelectorAll('.tangram-builder-piece')[i];
        for (let r = 0; r < (target.rot - piece.rot + 4) % 4; r++) keyTap(el);
        fireEvent.keyDown(el, { key: 'ArrowRight' });
        for (let x = 0; x < target.x; x++) fireEvent.keyDown(el, { key: 'ArrowRight' });
        for (let y = 0; y < target.y; y++) fireEvent.keyDown(el, { key: 'ArrowDown' });
      }
      fireEvent.click(view.getByRole('button', { name: /Next shape|Finish/ }));
    }
    expect(view.finish).toHaveBeenCalledExactlyOnceWith(shapes.ROUNDS);
  });

  it('rebuilds each Quick Look amount or array', () => {
    const factory = vi.spyOn(looks, 'makeRounds');
    const view = open('quick-look', band);
    const rounds = factory.mock.results[0].value as looks.LookRound[];
    for (const round of rounds) {
      wait(4000);
      if (round.kind === 'array') keyTap(attr(view.container, 'data-cell', String((round.rows - 1) * looks.ARRAY_GRID.cols + round.cols - 1)));
      else for (let n = 0; n < round.n; n++) keyTap(attr(view.container, 'data-cell', String(n)));
      fireEvent.click(view.getByRole('button', { name: 'Check' }));
      fireEvent.click(view.getByRole('button', { name: /^(Next|Finish)$/ }));
    }
    expectFinished(view.finish);
  });

  it('launches into each basket using keyboard-accessible power and angles', () => {
    const factory = vi.spyOn(launch, 'makeRounds');
    const view = open('launch-lab', band);
    const rounds = factory.mock.results[0].value as launch.Round[];
    for (const round of rounds) {
      const launcher = view.getByRole('application');
      let solution: { power: number; angle: number } | null = null;
      for (let power = 1; power <= 50 && !solution; power++) {
        for (let angle = round.freeAngle ? launch.ANGLE_MIN : 45; angle <= (round.freeAngle ? launch.ANGLE_MAX : 45); angle++) {
          if (launch.shoot(round, power * 0.02, angle).hit) { solution = { power, angle }; break; }
        }
      }
      expect(solution, 'basket must be reachable with the actual keyboard controls').not.toBeNull();
      for (let n = 0; n < solution!.power; n++) fireEvent.keyDown(launcher, { key: 'ArrowRight' });
      const angle = Number(launcher.getAttribute('aria-label')?.match(/angle (\d+)/)?.[1] ?? 45);
      for (let n = 0; n < Math.abs(solution!.angle - angle); n++) fireEvent.keyDown(launcher, { key: solution!.angle > angle ? 'ArrowUp' : 'ArrowDown' });
      keyTap(launcher);
      wait(2800);
      fireEvent.click(view.getByRole('button', { name: /Next|Finish/ }));
    }
    expectFinished(view.finish);
  });

  it('matches all words to their pictures on every board', () => {
    const view = open('read-match', band);
    for (let n = 0; n < 6; n++) {
      const cards = Array.from(view.container.querySelectorAll('[data-rm-card]'));
      for (const card of cards) {
        fireEvent.click(card);
        fireEvent.click(attr(view.container, 'data-rm-drop', card.getAttribute('data-rm-card')!));
      }
      wait(2000);
    }
    expectFinished(view.finish);
  });

  it('sorts every rhyme card, including non-rhyming words', () => {
    const view = open('rhyme-time', band);
    for (let n = 0; n < 5; n++) {
      const cards = Array.from(view.container.querySelectorAll('[data-rt-card]'));
      for (const card of cards) {
        fireEvent.click(card);
        fireEvent.click(attr(view.container, 'data-rt-drop', card.getAttribute('data-rt-card')!));
      }
      wait(2000);
    }
    expectFinished(view.finish);
  });

  it('returns all animals or features to the right habitats', () => {
    const factory = vi.spyOn(habitats, 'makeRound');
    const view = open('habitat-rescue', band);
    const round = factory.mock.results[0].value as habitats.Round;
    for (const card of round.cards) {
      // The dock exposes only its first few cards, so take the front card each time.
      const front = view.container.querySelector('.habitat-rescue-card')!;
      const data = round.cards.find(c => c.label === front.getAttribute('aria-label')) ?? card;
      fireEvent.click(front);
      fireEvent.click(attr(view.container, 'data-hr-drop', habitats.homeOn(data, round.board)!));
      wait(800);
    }
    fireEvent.click(view.getByRole('button', { name: 'Finish' }));
    expectFinished(view.finish);
  });

  it('builds all sentences and advances through adaptive levels', () => {
    const factory = vi.spyOn(sentences, 'makeRound');
    const view = open('sentence-builder', band);
    for (let n = 0; n < sentences.ROUNDS; n++) {
      const round = factory.mock.results.at(-1)!.value as sentences.Round;
      for (const word of round.answers[0]) fireEvent.click(attr(view.container, 'data-sb-card', word));
      wait(2300);
    }
    expectFinished(view.finish);
  });

  it('blends every word and matches the picture', () => {
    const factory = vi.spyOn(blending, 'makeRounds');
    const view = open('sound-it-out', band);
    const rounds = factory.mock.results[0].value as blending.SoundRound[];
    for (const round of rounds) {
      keyTap(view.container.querySelector('.sound-it-out-frog')!);
      wait(6000);
      const word = view.container.querySelector('.sound-it-out-word')!;
      keyTap(word);
      fireEvent.click(attr(view.container, 'data-pic', round.word));
      wait(2000);
    }
    expectFinished(view.finish);
  });

  it('places every body card and finishes every round', () => {
    const factory = vi.spyOn(body, 'makeRounds');
    const view = open('body-builder', band);
    const rounds = factory.mock.results[0].value as body.Round[];
    for (const round of rounds) {
      for (const piece of round.pieces) {
        const card = Array.from(view.container.querySelectorAll('.body-builder-card')).find(el => el.textContent?.includes(piece.label))!;
        fireEvent.click(card);
        fireEvent.click(attr(view.container, 'data-bb-target', piece.target));
      }
      wait(1900);
    }
    expectFinished(view.finish);
  });

  it('grows the garden through all six tasks', () => {
    const factory = vi.spyOn(garden, 'makeRounds');
    const view = open('garden-lab', band);
    const rounds = factory.mock.results[0].value as garden.Round[];
    for (const round of rounds) {
      if (round.mode === 'pollinate') {
        for (const kind of round.kinds) {
          const flowers = round.flowers.filter(f => f.kind === kind.id);
          for (const flower of flowers) {
            fireEvent.click(view.container.querySelector('.garden-lab-card')!);
            fireEvent.click(attr(view.container, 'data-gl-target', flower.id));
          }
        }
      } else {
        for (const piece of round.pieces) {
          const card = Array.from(view.container.querySelectorAll('.garden-lab-card')).find(el => el.textContent?.includes(piece.label))!;
          if (!card) throw new Error(`Missing ${piece.label} in ${round.mode}: ${view.container.textContent}`);
          fireEvent.click(card);
          fireEvent.click(attr(view.container, 'data-gl-target', piece.target));
        }
      }
      wait(3500);
    }
    expectFinished(view.finish);
  });

  it('spells every word using the letter tiles', () => {
    const factory = vi.spyOn(words, 'makeRounds');
    const view = open('word-builder', band);
    const rounds = factory.mock.results[0].value as words.WordRound[];
    for (const round of rounds) {
      for (const letter of round.word.slice(round.prefilled)) {
        const tile = Array.from(view.container.querySelectorAll('.word-builder-tile[role="button"]')).find(el => el.textContent?.trim() === letter)!;
        keyTap(tile);
      }
      wait(1500);
    }
    expectFinished(view.finish);
  });

  it('sorts all pictures into their sound buckets', () => {
    const factory = vi.spyOn(sounds, 'makeRounds');
    const view = open('first-sounds', band);
    const rounds = factory.mock.results[0].value as sounds.Round[];
    for (const round of rounds) {
      keyTap(view.container.querySelector('.first-sounds-card')!);
      fireEvent.click(attr(view.container, 'data-bucket', String(round.options.indexOf(round.answer))));
      wait(1000);
    }
    expectFinished(view.finish);
  });

  it('fills each train in alphabetic order and sends it off', () => {
    const factory = vi.spyOn(trains, 'makeTrain');
    const view = open('abc-train', band);
    for (let n = 0; n < trains.TRAINS; n++) {
      wait(100);
      const train = factory.mock.results.at(-1)!.value as trains.TrainRound;
      for (let i = 0; i < train.cars.length; i++) {
        const car = train.cars[i];
        if (!car.gap) continue;
        const tile = view.container.querySelector(`.abc-train-piece[aria-label="${car.label}"]`)!;
        keyTap(tile);
        fireEvent.click(view.getByRole('button', { name: `Empty carriage ${i + 1}` }));
      }
      wait(1700);
    }
    expectFinished(view.finish);
  });

  it('builds every molecule or balances every equation', () => {
    const factory = vi.spyOn(molecules, 'makeOrders');
    const view = open('molecule-builder', band);
    const orders = factory.mock.results[0].value as molecules.Order[];
    for (const order of orders) {
      if (order.kind === 'equation') {
        for (const side of ['left', 'right'] as const) {
          for (const species of order.equation[side]) {
            for (let i = 0; i < species.coef; i++) {
              fireEvent.click(view.getByRole('button', { name: molecules.MOLECULES[species.id].name }));
              fireEvent.click(attr(view.container, 'data-mb-drop', `${side}:${species.id}`));
            }
          }
        }
      } else {
        for (const element of molecules.ELEMENTS) {
          const count = molecules.targetCounts(order)[element] ?? 0;
          for (let i = 0; i < count; i++) {
            const atom = molecules.ATOM[element];
            fireEvent.click(view.getByRole('button', { name: `${band === 0 ? atom.colour : atom.name} atom` }));
          }
        }
      }
      fireEvent.click(view.getByRole('button', { name: 'Check' }));
      fireEvent.click(view.getByRole('button', { name: /Next|Finish/ }));
    }
    expectFinished(view.finish);
  });
});
