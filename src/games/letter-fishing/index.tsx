import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Fish as FishIcon, Star, Timer, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { CATCHES_PER_TARGET, makeTarget } from './targets';
import type { Target } from './targets';
import './letter-fishing.css';

const ROUND_SECONDS = 60;
/** Relaxed mode: no clock — the round ends after this many right catches. */
export const RELAXED_GOAL = 12;
const MATCH_CHANCE = 0.4;
const MAX_FISH = 6;
const COLORS = ['var(--tangerine)', 'var(--coral)', 'var(--sun)', 'var(--leaf)', 'var(--berry)', 'var(--grape)'];

interface Fish {
  id: number;
  letter: string;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  phase: number;
  color: string;
  state: 'swim' | 'wriggle' | 'caught';
  until: number;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function FishShape({ color, flip }: { color: string; flip: boolean }) {
  return (
    <svg viewBox="0 0 120 74" className="letter-fishing-body" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <path d="M96 37 L118 16 L116 58 Z" fill={color} stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={52} cy={37} rx={48} ry={32} fill={color} stroke="var(--ink)" strokeWidth={3} />
      <ellipse cx={52} cy={37} rx={30} ry={22} fill="white" opacity={0.9} />
      <circle cx={16} cy={28} r={4} fill="var(--ink)" />
    </svg>
  );
}

function Play({ band, relaxed, onFinish }: GameProps) {
  const pondRef = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 600, h: 360 });
  const fish = useRef<Fish[]>([]);
  const nextId = useRef(1);
  const lastSpawn = useRef(-Infinity);
  const lastLane = useRef(-1);
  const start = useRef<number | null>(null);
  const finished = useRef(false);
  const hook = useRef({ x: 0, y: 0, dragging: false, pointer: -1, tried: new Set<number>() });

  const [, setFrame] = useState(0);
  const [target, setTarget] = useState<Target>(() => makeTarget(band));
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [message, setMessage] = useState('');

  // Mutable mirrors so the animation loop always sees the latest values.
  const live = useRef({ target, progress, score: 0, catches: 0 });
  live.current.target = target;
  live.current.progress = progress;

  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const endTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(endTimer.current), []);

  const msgTimer = useRef<number | undefined>(undefined);
  const flash = (text: string) => {
    setMessage(text);
    window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMessage(''), 1200);
  };
  useEffect(() => () => window.clearTimeout(msgTimer.current), []);

  useLayoutEffect(() => {
    const el = pondRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      size.current = { w: entry.contentRect.width, h: entry.contentRect.height };
      if (!hook.current.dragging && hook.current.x === 0) hook.current = { ...hook.current, x: entry.contentRect.width / 2, y: 44 };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fishWidth = () => Math.max(100, Math.min(150, size.current.w / 6.2));

  const needed = () => live.current.target.answers[live.current.progress];

  const tryCatch = useCallback((id: number) => {
    const f = fish.current.find((x) => x.id === id);
    if (!f || f.state !== 'swim' || finished.current) return;
    const want = needed();
    if (f.letter === want) {
      const { w, h } = size.current;
      f.state = 'caught';
      f.x = w - 70;
      f.y = h - 70;
      f.until = performance.now() + 650;
      play('correct');
      live.current.score += 1;
      live.current.catches += 1;
      setScore(live.current.score);
      if (relaxed && live.current.score >= RELAXED_GOAL) {
        // Relaxed rounds end after enough catches instead of when a clock runs out.
        finished.current = true;
        flash(`${RELAXED_GOAL} fish! Well done!`);
        endTimer.current = window.setTimeout(() => finishRef.current(live.current.score), 1100);
        return;
      }
      const t = live.current.target;
      const nextProgress = live.current.progress + 1;
      if (nextProgress >= t.answers.length) {
        // Word spelled, or enough catches of this letter: time for a new target.
        const done = t.kind === 'spell' || live.current.catches >= CATCHES_PER_TARGET[band];
        if (done) {
          live.current.catches = 0;
          const next = makeTarget(band, t.word ?? t.answers[0].toLowerCase());
          live.current.target = next;
          live.current.progress = 0;
          setTarget(next);
          setProgress(0);
          flash(t.kind === 'spell' ? `You spelled ${t.word}!` : 'Great catch! New target!');
        } else {
          live.current.progress = 0;
          setProgress(0);
          flash('Great catch!');
        }
      } else {
        live.current.progress = nextProgress;
        setProgress(nextProgress);
        flash('Got it!');
      }
    } else {
      // Wrong fish: it wriggles free and darts away.
      f.state = 'wriggle';
      f.until = performance.now() + 500;
      f.vx *= 1.6;
      play('wrong');
      flash(`That one is ${f.letter}. It got away!`);
    }
  }, [band, relaxed]);

  /** Add a fish; `atX` places it already inside the pond (used to fill the pond at the start). */
  const spawn = (now: number, atX?: number) => {
    const { w, h } = size.current;
    const fw = fishWidth();
    const t = live.current.target;
    const want = t.answers[live.current.progress];
    const swimming = fish.current.filter((f) => f.state !== 'caught');
    const hasMatch = swimming.some((f) => f.letter === want);
    const letter = !hasMatch || Math.random() < MATCH_CHANCE ? want : t.decoys[Math.floor(Math.random() * t.decoys.length)];
    const lanes = Math.max(3, Math.floor((h - 120) / (fw * 0.7)));
    let lane = Math.floor(Math.random() * lanes);
    if (lane === lastLane.current) lane = (lane + 1) % lanes;
    lastLane.current = lane;
    const top = 90;
    const baseY = top + (lane + 0.5) * ((h - top - 40) / lanes);
    const fromLeft = Math.random() < 0.5;
    const speed = w * (0.09 + band * 0.012) * (0.85 + Math.random() * 0.3) * (reducedMotion() ? 0.6 : 1);
    fish.current.push({
      id: nextId.current++,
      letter,
      x: atX ?? (fromLeft ? -fw : w + fw),
      y: baseY,
      baseY,
      vx: fromLeft ? speed : -speed,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[nextId.current % COLORS.length],
      state: 'swim',
      until: 0,
    });
    lastSpawn.current = now;
  };

  // The pond's animation loop: swim, spawn, hook collisions and the round timer.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (start.current === null) {
        start.current = now;
        // Start with a few fish already swimming so there is something to catch straight away.
        const { w } = size.current;
        [0.2, 0.5, 0.8].forEach((p) => spawn(now, w * p));
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { w } = size.current;
      const fw = fishWidth();
      const bob = reducedMotion() ? 2 : 7;

      for (const f of fish.current) {
        if (f.state === 'caught') continue;
        if (f.state === 'wriggle' && now > f.until) f.state = 'swim';
        f.x += f.vx * dt;
        f.y = f.baseY + Math.sin(now / 520 + f.phase) * bob;
      }
      fish.current = fish.current.filter((f) => (f.state === 'caught' ? now < f.until : f.x > -fw * 1.6 && f.x < w + fw * 1.6));

      const swimming = fish.current.filter((f) => f.state !== 'caught').length;
      const gap = 1150 - band * 90;
      if (swimming < MAX_FISH && now - lastSpawn.current > gap) spawn(now);

      // A dragged hook catches whatever fish it touches (each fish once per drag).
      const hk = hook.current;
      if (hk.dragging) {
        for (const f of fish.current) {
          if (f.state !== 'swim' || hk.tried.has(f.id)) continue;
          if (Math.hypot(hk.x - f.x, hk.y + 18 - f.y) < fw * 0.42) {
            hk.tried.add(f.id);
            tryCatch(f.id);
          }
        }
      }

      if (!relaxed) {
        const left = Math.max(0, ROUND_SECONDS - (now - start.current) / 1000);
        setTimeLeft(Math.ceil(left));
        if (left <= 0) {
          if (!finished.current) {
            finished.current = true;
            finishRef.current(live.current.score);
          }
          return;
        }
      }
      setFrame((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // The loop reads everything through refs, so it is started once.
  }, []);

  const pondPoint = (e: ReactPointerEvent) => {
    const r = pondRef.current!.getBoundingClientRect();
    return { x: Math.max(16, Math.min(r.width - 16, e.clientX - r.left)), y: Math.max(30, Math.min(r.height - 16, e.clientY - r.top)) };
  };

  const hookDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    hook.current = { ...hook.current, dragging: true, pointer: e.pointerId, tried: new Set(), ...pondPoint(e) };
  };
  const hookMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!hook.current.dragging || hook.current.pointer !== e.pointerId) return;
    Object.assign(hook.current, pondPoint(e));
  };
  const hookUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (hook.current.pointer !== e.pointerId) return;
    hook.current.dragging = false;
  };

  const sayIt = () => {
    const t = target;
    const text =
      t.kind === 'letter'
        ? `Catch the letter ${t.show}.`
        : t.kind === 'lower'
          ? `Catch the small letter for capital ${t.show}.`
          : t.kind === 'picture'
            ? `Catch the first letter of ${t.word}.`
            : `Spell ${t.word}.`;
    speak(text, { force: true });
  };

  const goal = (() => {
    const t = target;
    if (t.kind === 'letter')
      return (
        <>
          Catch the <span className="letter-fishing-chip">{t.show}</span> fish!
        </>
      );
    if (t.kind === 'lower')
      return (
        <>
          Catch the small letter for <span className="letter-fishing-chip">{t.show}</span>
        </>
      );
    if (t.kind === 'picture')
      return (
        <>
          Catch the first letter of{' '}
          <span className="letter-fishing-chip emoji" style={{ fontFamily: EMOJI_FONT }}>
            {t.emoji}
          </span>
        </>
      );
    return (
      <>
        Spell{' '}
        <span className="letter-fishing-chip emoji" style={{ fontFamily: EMOJI_FONT }}>
          {t.emoji}
        </span>
        <span className="letter-fishing-slots" aria-label={`${t.answers.slice(0, progress).join('')} so far`}>
          {t.answers.map((l, i) => (
            <span key={i} className={i < progress ? 'got' : i === progress ? 'next' : ''}>
              {i < progress ? l : ''}
            </span>
          ))}
        </span>
      </>
    );
  })();

  const fw = fishWidth();
  const hk = hook.current;
  const anchorX = size.current.w / 2;

  return (
    <div className="letter-fishing">
      <div className="letter-fishing-hud">
        <p className="letter-fishing-goal">{goal}</p>
        <button type="button" className="icon-btn" onClick={sayIt} aria-label="Hear it" title="Hear it">
          <Volume2 size={17} />
        </button>
        <div className="letter-fishing-stats">
          {relaxed ? (
            <span className="letter-fishing-pill" aria-label={`${score} of ${RELAXED_GOAL} caught`}>
              <Star size={15} fill="var(--star)" /> {score} / {RELAXED_GOAL}
            </span>
          ) : (
            <>
              <span className="letter-fishing-pill" aria-label={`${timeLeft} seconds left`}>
                <Timer size={15} /> {timeLeft}s
              </span>
              <span className="letter-fishing-pill" aria-label={`${score} caught`}>
                <Star size={15} fill="var(--star)" /> {score}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="letter-fishing-pond" ref={pondRef}>
        <div className="letter-fishing-toast" role="status" aria-live="polite">
          {message && <span key={message}>{message}</span>}
        </div>
        <svg className="letter-fishing-line" aria-hidden>
          <line x1={anchorX} y1={0} x2={hk.x || anchorX} y2={(hk.y || 44) - 14} />
        </svg>

        {fish.current.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`letter-fishing-fish ${f.state}`}
            style={{
              width: fw,
              height: fw * 0.62,
              transform: `translate(${f.x - fw / 2}px, ${f.y - fw * 0.31}px)${f.state === 'caught' ? ' scale(0.35)' : ''}`,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              tryCatch(f.id);
            }}
            onClick={(e) => {
              if (e.detail === 0) tryCatch(f.id);
            }}
            disabled={f.state !== 'swim' || finished.current}
            aria-label={`Fish with letter ${f.letter}`}
          >
            <FishShape color={f.color} flip={f.vx > 0} />
            <span className="letter-fishing-letter" style={{ left: f.vx > 0 ? '57%' : '43%' }}>
              {f.letter}
            </span>
          </button>
        ))}

        <div
          className={`letter-fishing-hook${hk.dragging ? ' dragging' : ''}`}
          style={{ transform: `translate(${(hk.x || anchorX) - 28}px, ${(hk.y || 44) - 28}px)` }}
          onPointerDown={hookDown}
          onPointerMove={hookMove}
          onPointerUp={hookUp}
          onPointerCancel={hookUp}
          role="img"
          aria-label="Fishing hook — drag it onto a fish"
        >
          <svg viewBox="0 0 56 56" aria-hidden>
            <circle cx={28} cy={14} r={6} fill="var(--coral)" stroke="var(--ink)" strokeWidth={2.5} />
            <path d="M28 20 V40 a8 8 0 0 1 -16 0 v-4" fill="none" stroke="var(--ink-2)" strokeWidth={4} strokeLinecap="round" />
          </svg>
        </div>

        <div className="letter-fishing-bucket" aria-hidden>
          <svg viewBox="0 0 80 70">
            <path d="M8 18 H72 L64 64 H16 Z" fill="var(--ocean-soft)" stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" />
            <ellipse cx={40} cy={18} rx={32} ry={7} fill="var(--ocean)" stroke="var(--ink)" strokeWidth={3} />
            <path d="M12 18 Q40 -12 68 18" fill="none" stroke="var(--ink)" strokeWidth={3} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'letter-fishing',
  subject: 'reading',
  title: 'Letter Fishing',
  blurb: 'Catch the fish carrying the right letter.',
  howTo: 'Look at the letter at the top. Tap the fish that carries it, or drag the hook onto it, to catch it in your bucket.',
  howToByBand: [
    'Look at the capital letter at the top. Catch a fish with the same letter. Tap the fish, or drag the hook onto it.',
    'Look at the capital letter at the top. Catch its matching small letter, like A and a. Tap the fish, or drag the hook onto it.',
    'Name the picture at the top. Catch the letter for its first sound. Tap the fish, or drag the hook onto it. The speaker can tell you the word.',
    'Spell the word at the top by catching its letters in order. Tap each fish, or drag the hook onto it. Look for the next empty space.',
  ],
  color: '#14b8a6',
  icon: FishIcon,
  scoreLabel: 'fish caught',
  Play,
};
