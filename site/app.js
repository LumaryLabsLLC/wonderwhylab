// Wonder Why Lab: a little play for the website. No libraries.
// Confetti and star bursts (like the app's ConfettiView and StarBurst) and Pip's questions.
// Pop-ins on scroll are pure CSS. With prefers-reduced-motion, no confetti.
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  // iOS Safari only applies :active (the tiles' press) when a touch listener exists.
  document.addEventListener('touchstart', () => {}, { passive: true });

  // ---------- Confetti ----------
  const party = ['#ffc83d', '#ff6b5b', '#ff5d8f', '#8b5cf6', '#3b8cff', '#14b8a6', '#34c47c', '#ff9f43'];
  let canvas = null;
  let ctx = null;
  let pieces = [];
  let frame = 0;
  let dpr = 1;

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  // A four-point sparkle, like the stars on the app icon.
  function sparkle(s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.14, -s * 0.14, s, 0);
    ctx.quadraticCurveTo(s * 0.14, s * 0.14, 0, s);
    ctx.quadraticCurveTo(-s * 0.14, s * 0.14, -s, 0);
    ctx.quadraticCurveTo(-s * 0.14, -s * 0.14, 0, -s);
    ctx.fill();
  }

  function tick() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    pieces = pieces.filter((p) => p.life < p.max && p.y < h + 40);
    for (const p of pieces) {
      p.life += 1;
      p.vy += p.gravity;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape !== 2) ctx.scale(Math.cos(p.life * 0.12 + p.phase), 1); // the paper flutter
      ctx.globalAlpha = p.life > p.max - 24 ? (p.max - p.life) / 24 : 1;
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.62);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.3, 0, Math.PI * 2); ctx.fill(); }
      else sparkle(p.size * 0.7);
      ctx.restore();
    }
    if (pieces.length) frame = requestAnimationFrame(tick);
    else { frame = 0; ctx.clearRect(0, 0, w, h); }
  }

  /** Bursts confetti (or stars) from a point in the viewport. */
  function burst(x, y, { count = 60, colors = party, stars = false, power = 1 } = {}) {
    if (reduce) return;
    ensureCanvas();
    for (let i = 0; i < count; i += 1) {
      const angle = stars ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = (stars ? 3 + Math.random() * 5 : 6 + Math.random() * 9) * power;
      pieces.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: stars ? 0.12 : 0.32,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        phase: Math.random() * 6,
        size: stars ? 9 + Math.random() * 9 : 7 + Math.random() * 7,
        color: colors[(Math.random() * colors.length) | 0],
        shape: stars ? 2 : (Math.random() * 2.4) | 0, // mostly paper and dots, a few sparkles
        life: 0,
        max: stars ? 60 + Math.random() * 20 : 110 + Math.random() * 40,
      });
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function centreOf(el, yFraction = 0.5) {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height * yFraction];
  }

  // ---------- Pip ----------
  const questions = [
    'Hi! What do you wonder about today?',
    'Why is the sky blue?',
    'Where does rain come from?',
    'How do bees make honey?',
    'Why does the Moon change shape?',
    'What makes a rainbow?',
    'How far away is the Sun?',
  ];
  let asked = 0;

  document.querySelectorAll('[data-pip]').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.remove('is-happy');
      void button.offsetWidth; // restart the hop
      button.classList.add('is-happy');
      clearTimeout(button.happyTimer);
      button.happyTimer = setTimeout(() => button.classList.remove('is-happy'), 1300);

      const bubble = button.dataset.bubble && document.getElementById(button.dataset.bubble);
      if (bubble && button.dataset.pip === 'questions') {
        asked = (asked + 1) % questions.length;
        bubble.querySelector('.line').textContent = questions[asked];
        bubble.classList.remove('pop');
        void bubble.offsetWidth;
        bubble.classList.add('pop');
      }
      const [x, y] = centreOf(button.querySelector('.pip') || button, 0.35);
      burst(x, y, { count: button.dataset.pip === 'cheer' ? 90 : 26, stars: button.dataset.pip !== 'cheer' });
    });
  });

  // ---------- Celebrations ----------
  document.querySelectorAll('[data-celebrate]').forEach((button) => {
    button.addEventListener('click', () => {
      const [x, y] = centreOf(button, 0.2);
      burst(x, y, { count: 80 });
    });
  });

  document.querySelectorAll('.tile').forEach((tile) => {
    tile.addEventListener('pointerdown', () => {
      const [x, y] = centreOf(tile, 0.3);
      const colors = (tile.dataset.burst || '').split(',').filter(Boolean);
      burst(x, y, { count: 18, stars: true, colors: colors.length ? colors : party, power: 0.8 });
    });
  });

  document.querySelectorAll('.sticker').forEach((sticker) => {
    sticker.addEventListener('click', () => {
      const disc = sticker.querySelector('.disc');
      disc.classList.remove('wobble');
      void disc.offsetWidth;
      disc.classList.add('wobble');
      const [x, y] = centreOf(disc);
      const c = getComputedStyle(disc).getPropertyValue('--c').trim();
      burst(x, y, { count: 22, stars: true, colors: [c || '#ffc83d', '#ffc83d', '#ffffff'] });
    });
  });

  // ---------- A confetti welcome for the price ----------
  const price = document.querySelector('[data-confetti-on-view]');
  if (price && !reduce && 'IntersectionObserver' in window) {
    const once = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      once.disconnect();
      setTimeout(() => {
        const [x, y] = centreOf(price, 0.05);
        burst(x, y, { count: 90 });
      }, 350);
    }, { threshold: 0.6 });
    once.observe(price);
  }
})();
