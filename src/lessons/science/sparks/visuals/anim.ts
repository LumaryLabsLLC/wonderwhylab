import { useEffect, useRef, useState } from 'react';

/** Seconds since mount, updated every animation frame while `active`. */
export function useAnimationTime(active = true): number {
  const [t, setT] = useState(0);
  const offset = useRef(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now() - offset.current * 1000;
    const loop = (now: number) => {
      const next = (now - start) / 1000;
      offset.current = next;
      setT(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return t;
}

/** Calls `step(dt)` every frame (dt in seconds, capped) while mounted. */
export function useFrame(step: (dt: number) => void) {
  const cb = useRef(step);
  cb.current = step;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cb.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
