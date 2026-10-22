import { useEffect, useRef, useState } from 'react';

/**
 * A 0 → 1 progress value for a one-shot experiment animation.
 * `run(onDone)` plays it over `duration` ms (or jumps to the end when the learner prefers reduced motion);
 * `reset()` returns to 0. The frame is cancelled on unmount.
 */
export function useProgress(duration: number) {
  const [p, setP] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const run = (onDone?: () => void) => {
    cancelAnimationFrame(raf.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRunning(false);
      setP(1);
      onDone?.();
      return;
    }
    setRunning(true);
    setP(0);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      setP(k);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else {
        setRunning(false);
        onDone?.();
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const reset = () => {
    cancelAnimationFrame(raf.current);
    setRunning(false);
    setP(0);
  };

  return { p, running, run, reset };
}
