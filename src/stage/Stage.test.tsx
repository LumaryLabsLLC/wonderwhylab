// @vitest-environment jsdom
import '../../tests/browser-setup';
import { fireEvent, render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Stage } from './Stage';

it('lets a scene use arrow keys without also moving the whole playground', () => {
  const view = render(<Stage insets={{ top: 0, left: 0, right: 0, bottom: 0 }} toolbarBottom={0} compact={false}>
    <svg><g role="button" tabIndex={0} aria-label="Move the star" data-nopan onKeyDown={e => e.preventDefault()} /></svg>
  </Stage>);
  const world = view.container.querySelector<HTMLElement>('.world')!;
  const before = world.style.transform;
  fireEvent.keyDown(view.getByRole('button', { name: 'Move the star' }), { key: 'ArrowRight' });
  expect(world.style.transform).toBe(before);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(world.style.transform).not.toBe(before);
});
