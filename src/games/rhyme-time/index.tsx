import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Music, Star, Trash2, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT, pictureFor } from '../reading/words';
import { ROUNDS, makeBoard } from './board';
import type { Board } from './board';
import './rhyme-time.css';

const HOUSE_COLORS = ['var(--coral)', 'var(--ocean)', 'var(--leaf)'];
const HOUSE_SOFT = ['var(--coral-soft)', 'var(--ocean-soft)', 'var(--leaf-soft)'];

interface Drag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/** The house or bin (data-rt-drop) under a screen point: a house index, -1 for the bin, or null. */
function targetAt(x: number, y: number): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el instanceof HTMLElement && el.dataset.rtDrop !== undefined) return Number(el.dataset.rtDrop);
  }
  return null;
}

function Play({ band, onFinish }: GameProps) {
  const [round, setRound] = useState(0);
  const [board, setBoard] = useState<Board>(() => makeBoard(band));
  const [placed, setPlaced] = useState<string[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [glow, setGlow] = useState<number | null>(null);
  const [cheer, setCheer] = useState(false);
  const drag = useRef<Drag | null>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const attempt = (cardId: string, target: number) => {
    setSelected(null);
    setOffset(null);
    setHover(null);
    const card = board.cards.find((c) => c.id === cardId);
    if (!card) return;
    if (card.house === target) {
      play('pop');
      const nextScore = score + (missed.includes(cardId) ? 0 : 1);
      const nextPlaced = [...placed, cardId];
      setScore(nextScore);
      setPlaced(nextPlaced);
      setGlow(target);
      later(() => setGlow((g) => (g === target ? null : g)), 600);
      if (nextPlaced.length === board.cards.length) {
        play('correct');
        setCheer(true);
        later(() => {
          setCheer(false);
          if (round + 1 >= ROUNDS) {
            if (!finished.current) {
              finished.current = true;
              onFinish(nextScore);
            }
            return;
          }
          setRound(round + 1);
          setBoard(makeBoard(band));
          setPlaced([]);
          setMissed([]);
        }, 1200);
      }
    } else {
      play('wrong');
      if (!missed.includes(cardId)) setMissed([...missed, cardId]);
      setShake(cardId);
      later(() => setShake((s) => (s === cardId ? null : s)), 450);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setOffset({ id: d.id, dx, dy });
    setHover(targetAt(e.clientX, e.clientY));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      play('tap');
      setSelected((s) => (s === d.id ? null : d.id));
      return;
    }
    const target = targetAt(e.clientX, e.clientY);
    if (target !== null) attempt(d.id, target);
    else {
      setOffset(null);
      setHover(null);
    }
  };

  const onPointerCancel = () => {
    drag.current = null;
    setOffset(null);
    setHover(null);
  };

  const tapTarget = (target: number) => {
    if (selected) attempt(selected, target);
  };

  const inHouse = (house: number) => board.cards.filter((c) => c.house === house);
  const left = board.cards.filter((c) => !placed.includes(c.id));
  const targets = board.houses.length + (board.bin ? 1 : 0);

  return (
    <div className="rhyme-time">
      <div className="rhyme-time-hud">
        <p className="rhyme-time-goal">
          {cheer ? 'Every word found its home!' : selected ? 'Now tap the house it rhymes with.' : 'Drag each word to the house it rhymes with.'}
        </p>
        <div className="rhyme-time-stats">
          <span className="rhyme-time-pill">
            {Math.min(round + 1, ROUNDS)}/{ROUNDS}
          </span>
          <span className="rhyme-time-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className="rhyme-time-street" style={{ '--n': targets } as CSSProperties}>
        {board.houses.map((h, i) => {
          const members = inHouse(i);
          const moved = members.filter((c) => placed.includes(c.id));
          return (
            <div key={`${round}-${h.word}`} className="rhyme-time-lot">
              <div className="rhyme-time-house-wrap">
                <button
                  type="button"
                  className={`rhyme-time-house${hover === i ? ' hover' : ''}${glow === i ? ' glow' : ''}${selected ? ' ready' : ''}${cheer ? ' cheer' : ''}`}
                  style={{ '--c': HOUSE_COLORS[i], '--c-soft': HOUSE_SOFT[i] } as CSSProperties}
                  data-rt-drop={i}
                  onClick={() => tapTarget(i)}
                  aria-label={`The ${h.word} house`}
                >
                  <span className="rhyme-time-roof" aria-hidden />
                  <span className="rhyme-time-body">
                    <span className="rhyme-time-pic" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                      {pictureFor(h.word)}
                    </span>
                    <span className="rhyme-time-word">{h.word}</span>
                    <span className="rhyme-time-windows" aria-hidden>
                      {members.map((c) => (
                        <i key={c.id} className={placed.includes(c.id) ? 'lit' : ''} />
                      ))}
                    </span>
                  </span>
                </button>
                <button type="button" className="rhyme-time-say" onClick={() => speak(h.word, { force: true })} aria-label={`Hear ${h.word}`} title="Hear it">
                  <Volume2 size={16} />
                </button>
              </div>
              <span className="rhyme-time-moved" aria-live="polite">
                {moved.map((c) => c.word).join(' · ')}
              </span>
            </div>
          );
        })}
        {board.bin && (
          <div className="rhyme-time-lot">
            <button
              type="button"
              className={`rhyme-time-bin${hover === -1 ? ' hover' : ''}${glow === -1 ? ' glow' : ''}${selected ? ' ready' : ''}`}
              data-rt-drop={-1}
              onClick={() => tapTarget(-1)}
              aria-label="Doesn't rhyme bin"
            >
              <Trash2 size={40} strokeWidth={1.8} />
              <span className="rhyme-time-word small">No rhyme</span>
            </button>
            <span className="rhyme-time-moved">
              {board.cards
                .filter((c) => c.house === -1 && placed.includes(c.id))
                .map((c) => c.word)
                .join(' · ')}
            </span>
          </div>
        )}
      </div>

      <div className="rhyme-time-pile">
        {left.map((c) => {
          const moving = offset?.id === c.id;
          const style = {
            '--tilt': `${c.tilt}deg`,
            transform: moving ? `translate(${offset.dx}px, ${offset.dy}px) rotate(${c.tilt / 2}deg) scale(1.06)` : undefined,
          } as CSSProperties;
          return (
            <div key={`${round}-${c.id}`} className="rhyme-time-card-wrap">
              <button
                type="button"
                data-rt-card={c.house}
                className={`rhyme-time-card${board.pictures ? ' with-pic' : ''}${moving ? ' dragging' : ''}${selected === c.id ? ' selected' : ''}${shake === c.id ? ' shake' : ''}`}
                style={style}
                onPointerDown={(e) => onPointerDown(e, c.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onClick={(e) => {
                  // Keyboard activation only; pointer taps are handled in onPointerUp.
                  if (e.detail === 0) setSelected((s) => (s === c.id ? null : c.id));
                }}
              >
                {board.pictures && (
                  <span className="rhyme-time-card-pic" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                    {pictureFor(c.word)}
                  </span>
                )}
                <span>{c.word}</span>
              </button>
              {board.pictures && (
                <button
                  type="button"
                  className="rhyme-time-say card"
                  onClick={() => speak(c.word, { force: true })}
                  aria-label={`Hear ${c.word}`}
                  title="Hear it"
                >
                  <Volume2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'rhyme-time',
  subject: 'reading',
  title: 'Rhyme Time',
  blurb: 'Help each word move into the house it rhymes with.',
  howTo: 'Rhyming words sound the same at the end, like cat and hat. Drag each word to its rhyming house, or tap the word and then the house. If there is a bin, use it for words with no matching house.',
  color: '#ff5d8f',
  icon: Music,
  scoreLabel: 'rhymes found first time',
  Play,
};
