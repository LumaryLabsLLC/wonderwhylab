import { useEffect, useState } from 'react';

let ctx: CanvasRenderingContext2D | null | undefined;

/** Width of `text` in scene units, measured with the scene's body font (an estimate until it can measure). */
export function textWidth(text: string, size: number, weight = 600) {
  const estimate = text.length * size * 0.56;
  if (typeof document === 'undefined') return estimate;
  if (ctx === undefined) {
    try {
      ctx = document.createElement('canvas').getContext('2d');
    } catch {
      ctx = null;
    }
  }
  if (!ctx) return estimate;
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim() || 'sans-serif';
  ctx.font = `${weight} ${size}px ${family}`;
  return ctx.measureText(text).width;
}

/** Re-render once web fonts have loaded, so measured widths match what is drawn. */
export function useFontsReady() {
  const [, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
}
