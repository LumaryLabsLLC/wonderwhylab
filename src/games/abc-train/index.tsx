import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Star, TrainFront, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { makeTrain, TRAINS } from './rounds';
import type { Piece } from './rounds';
import './abc-train.css';

type Phase = 'in' | 'play' | 'out';

interface Drag {
  id: string;
  dx: number;
  dy: number;
}

const ROLL_MS = 900;
const LEAVE_MS = 1300;

function Engine({ puff }: { puff: boolean }) {
  return (
    <div className="abc-train-engine" aria-hidden>
      {puff && (
        <span className="abc-train-puffs">
          <i />
          <i />
          <i />
        </span>
      )}
      <svg viewBox="0 0 90 80">
        <rect x={14} y={10} width={14} height={20} rx={3} fill="var(--ink)" />
        <rect x={6} y={28} width={52} height={32} rx={8} fill="var(--coral)" stroke="var(--ink)" strokeWidth={3} />
        <rect x={52} y={14} width={32} height={46} rx={6} fill="var(--coral)" stroke="var(--ink)" strokeWidth={3} />
        <rect x={59} y={22} width={18} height={14} rx={3} fill="var(--ocean-soft)" stroke="var(--ink)" strokeWidth={2.5} />
        <rect x={48} y={8} width={40} height={8} rx={4} fill="var(--ink)" />
        <circle cx={22} cy={64} r={10} fill="var(--sun)" stroke="var(--ink)" strokeWidth={3} />
        <circle cx={44} cy={64} r={10} fill="var(--sun)" stroke="var(--ink)" strokeWidth={3} />
        <circle cx={70} cy={64} r={10} fill="var(--sun)" stroke="var(--ink)" strokeWidth={3} />
      </svg>
    </div>
  );
}

function Play({ band, onFinish }: GameProps) {
  const [index, setIndex] = useState(0);
  const [train, setTrain] = useState(() => makeTrain(band));
  const [filled, setFilled] = useState<Set<string>>(() => new Set());
  const [used, setUsed] = useState<Set<string>>(() => new Set());
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('in');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hoverCar, setHoverCar] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongCar, setWrongCar] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const scoreRef = useRef(0);
  const tried = useRef(new Set<string>());
  const finished = useRef(false);
  const carEls = useRef(new Map<string, HTMLElement>());
  const press = useRef<{ id: string; x: number; y: number; moved: boolean; pointer: number } | null>(null);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Each new train rolls in from the right.
  useEffect(() => {
    if (phase !== 'in') return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('play')));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const gaps = train.cars.filter((c) => c.gap);

  const flash = (text: string) => {
    setMessage(text);
    later(() => setMessage((m) => (m === text ? '' : m)), 1300);
  };

  const leave = () => {
    play('complete');
    flash(train.words ? 'A, B, C… all in order!' : 'Choo choo!');
    later(() => setPhase('out'), 350);
    later(() => {
      if (index + 1 >= TRAINS) {
        if (!finished.current) {
          finished.current = true;
          onFinish(scoreRef.current);
        }
        return;
      }
      tried.current = new Set();
      setTrain(makeTrain(band));
      setFilled(new Set());
      setUsed(new Set());
      setSelected(null);
      setIndex((i) => i + 1);
      setPhase('in');
    }, 350 + LEAVE_MS);
  };

  /** Try to put block `pieceId` into carriage `carId`. Returns true if it fits. */
  const place = (pieceId: string, carId: string): boolean => {
    if (phase !== 'play') return false;
    const piece = train.pieces.find((p) => p.id === pieceId);
    const car = train.cars.find((c) => c.id === carId);
    if (!piece || !car || !car.gap || filled.has(car.id) || used.has(piece.id)) return false;
    if (piece.label !== car.label) {
      tried.current.add(piece.id);
      play('wrong');
      setWrongCar(car.id);
      later(() => setWrongCar((w) => (w === car.id ? null : w)), 500);
      flash(train.words ? 'Not that spot — think ABC!' : 'Not that carriage. Try another!');
      return false;
    }
    play('correct');
    if (!tried.current.has(piece.id)) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    const nextFilled = new Set(filled).add(car.id);
    setFilled(nextFilled);
    setUsed(new Set(used).add(piece.id));
    setSelected(null);
    if (nextFilled.size === gaps.length) leave();
    return true;
  };

  const carAt = (x: number, y: number): string | null => {
    const pad = 14;
    for (const [id, el] of carEls.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return id;
    }
    return null;
  };

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>, piece: Piece) => {
    if (phase !== 'play' || press.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { id: piece.id, x: e.clientX, y: e.clientY, moved: false, pointer: e.pointerId };
  };

  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p || p.pointer !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) < 6) return;
    p.moved = true;
    setDrag({ id: p.id, dx, dy });
    setHoverCar(carAt(e.clientX, e.clientY));
  };

  const onUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p || p.pointer !== e.pointerId) return;
    press.current = null;
    setDrag(null);
    setHoverCar(null);
    if (!p.moved) {
      // A tap picks the block up; tapping a carriage then drops it there.
      play('tap');
      setSelected((s) => (s === p.id ? null : p.id));
      return;
    }
    const car = carAt(e.clientX, e.clientY);
    if (car) place(p.id, car);
    // Anything that didn't fit springs back to the yard (the CSS transition does the bounce).
  };

  const onCancel = () => {
    press.current = null;
    setDrag(null);
    setHoverCar(null);
  };

  const sayIt = () => {
    if (train.words) {
      speak(`Put these in ABC order: ${train.pieces.map((p) => p.label).join(', ')}.`, { force: true });
    } else {
      const run = train.cars.map((c) => (c.gap && !filled.has(c.id) ? 'blank' : c.label.toUpperCase())).join(', ');
      speak(`${run}. Which ${gaps.length === 1 ? 'letter is' : 'letters are'} missing?`, { force: true });
    }
  };

  const goal = train.words
    ? 'Put the pictures in ABC order!'
    : gaps.length === 1
      ? 'Fill in the missing letter!'
      : 'Fill in the missing letters!';

  return (
    <div className="abc-train" style={{ '--n': train.cars.length } as CSSProperties}>
      <div className="abc-train-hud">
        <p className="abc-train-goal" aria-live="polite">
          {message || goal}
        </p>
        <button type="button" className="icon-btn" onClick={sayIt} aria-label="Hear it" title="Hear it">
          <Volume2 size={17} />
        </button>
        <div className="abc-train-stats">
          <span className="abc-train-pill" aria-label={`Train ${index + 1} of ${TRAINS}`}>
            <TrainFront size={15} /> {index + 1}/{TRAINS}
          </span>
          <span className="abc-train-pill" aria-label={`${score} stars`}>
            <Star size={15} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className="abc-train-stage">
        <div className="abc-train-track">
          <div className={`abc-train-train ${phase}${train.words ? ' words' : ''}`} style={{ transitionDuration: `${phase === 'out' ? LEAVE_MS : ROLL_MS}ms` }}>
            <Engine puff={phase === 'out'} />
            {train.cars.map((car, i) => {
              const open = car.gap && !filled.has(car.id);
              return (
                <button
                  key={`${index}-${car.id}`}
                  ref={(el) => {
                    if (el) carEls.current.set(car.id, el);
                    else carEls.current.delete(car.id);
                  }}
                  type="button"
                  className={`abc-train-car${open ? ' open' : ''}${hoverCar === car.id && open ? ' hover' : ''}${wrongCar === car.id ? ' wrong' : ''}${
                    open && selected ? ' ready' : ''
                  }${car.gap && !open ? ' just' : ''}`}
                  style={{ '--hue': `var(--${['sun', 'leaf', 'ocean', 'grape', 'berry', 'tangerine'][i % 6]}-soft)` } as CSSProperties}
                  onClick={() => open && selected && place(selected, car.id)}
                  disabled={!open}
                  aria-label={open ? `Empty carriage ${i + 1}` : car.label}
                >
                  {open ? (
                    <span className="abc-train-empty">?</span>
                  ) : (
                    <>
                      {car.emoji && (
                        <span className="abc-train-emoji" style={{ fontFamily: EMOJI_FONT }}>
                          {car.emoji}
                        </span>
                      )}
                      <span className="abc-train-label">{car.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <div className="abc-train-rails" aria-hidden />
        </div>

        <div className="abc-train-yard" aria-label="Blocks">
          {train.pieces.map((piece) => {
            const isDrag = drag?.id === piece.id;
            const gone = used.has(piece.id);
            return (
              <button
                key={`${index}-${piece.id}`}
                type="button"
                className={`abc-train-piece${isDrag ? ' dragging' : ''}${selected === piece.id ? ' selected' : ''}${train.words ? ' word' : ''}`}
                style={{
                  visibility: gone ? 'hidden' : undefined,
                  transform: isDrag ? `translate(${drag.dx}px, ${drag.dy}px) rotate(${Math.max(-8, Math.min(8, drag.dx / 30))}deg) scale(1.08)` : undefined,
                }}
                onPointerDown={(e) => onDown(e, piece)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onCancel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected((s) => (s === piece.id ? null : piece.id));
                  }
                }}
                disabled={gone || phase !== 'play'}
                aria-pressed={selected === piece.id}
                aria-label={piece.label}
              >
                {piece.emoji && (
                  <span className="abc-train-emoji" style={{ fontFamily: EMOJI_FONT }}>
                    {piece.emoji}
                  </span>
                )}
                <span className="abc-train-label">{piece.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'abc-train',
  subject: 'reading',
  title: 'ABC Train',
  blurb: 'Drag the letters onto the train in ABC order.',
  howTo: 'Some carriages are empty. Drag each letter block into the carriage where it belongs in the alphabet.',
  howToByBand: [
    'Say the letters on the train in ABC order. Fill the empty carriage with its missing letter. Drag a block there, or tap a block and then the carriage.',
    'Put the missing capital letters into ABC order. Drag each block into its carriage, or tap a block and then the carriage. Some blocks do not belong.',
    'Put the missing small letters into ABC order. Drag each block into its carriage, or tap a block and then the carriage. Some blocks do not belong.',
    'Put the picture words into ABC order using their first letters. Drag a word into its carriage, or tap a word and then the carriage.',
  ],
  color: '#3b8cff',
  icon: TrainFront,
  scoreLabel: 'blocks right first time',
  Play,
};
