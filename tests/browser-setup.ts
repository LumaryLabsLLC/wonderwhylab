import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom supplies the DOM; these browser layout APIs are deterministic in interaction tests.
Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }),
});
vi.stubGlobal('ResizeObserver', class {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) { this.callback = callback; }
  observe(target: Element) {
    this.callback([{ target, contentRect: { width: 1000, height: 600 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  disconnect() {}
  unobserve() {}
});
window.scrollTo = () => {};
Element.prototype.scrollTo = () => {};
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.hasPointerCapture = () => true;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
