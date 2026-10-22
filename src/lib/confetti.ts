const COLORS = ['#e8604c', '#f2994a', '#f5c542', '#4cb07a', '#3d7fd6', '#8b67d6', '#e46fa6', '#1aa39a'];

/** Throw a handful of paper confetti over the screen. */
export function confetti(pieces = 90) {
  if (typeof document === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('i');
    const dur = 1.6 + Math.random() * 1.4;
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = COLORS[i % COLORS.length];
    p.style.setProperty('--dur', `${dur}s`);
    p.style.setProperty('--delay', `${Math.random() * 0.4}s`);
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 240}px`);
    p.style.setProperty('--rot', `${(Math.random() - 0.5) * 1440}deg`);
    if (i % 3 === 0) p.style.borderRadius = '50%';
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 3400);
}
