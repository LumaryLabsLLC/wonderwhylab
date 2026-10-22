import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { BookOpenCheck, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { BOARDS, makeBoard } from './board';
import type { Board } from './board';
import './read-match.css';

interface Drag {
  key: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/** The picture slot (data-rm-drop) under a screen point, if any. */
function slotAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el instanceof HTMLElement && el.dataset.rmDrop) return el.dataset.rmDrop;
  }
  return null;
}

function Play({ band, onFinish }: GameProps) {
  const [boardNo, setBoardNo] = useState(0);
  const [board, setBoard] = useState<Board>(() => makeBoard(band));
  const [matched, setMatched] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<string[]>([]); // cards that had a wrong try this board
  const [selected, setSelected] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ key: string; dx: number; dy: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [cheer, setCheer] = useState(false);
  const drag = useRef<Drag | null>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const attempt = (cardKey: string, slotKey: string) => {
    setSelected(null);
    setOffset(null);
    setHover(null);
    if (cardKey === slotKey) {
      play('pop');
      const firstTry = !missed.includes(cardKey);
      const nextScore = score + (firstTry ? 1 : 0);
      const nextMatched = [...matched, cardKey];
      setScore(nextScore);
      setMatched(nextMatched);
      if (nextMatched.length === board.pairs.length) {
        play('correct');
        setCheer(true);
        later(() => {
          setCheer(false);
          if (boardNo + 1 >= BOARDS) {
            if (!finished.current) {
              finished.current = true;
              onFinish(nextScore);
            }
            return;
          }
          setBoardNo(boardNo + 1);
          setBoard(makeBoard(band));
          setMatched([]);
          setMissed([]);
        }, 1100);
      }
    } else {
      play('wrong');
      if (!missed.includes(cardKey)) setMissed([...missed, cardKey]);
      setShake(cardKey);
      later(() => setShake((k) => (k === cardKey ? null : k)), 450);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { key, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setOffset({ key: d.key, dx, dy });
    setHover(slotAt(e.clientX, e.clientY));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      // A tap picks the card up; tap a picture to put it there.
      play('tap');
      setSelected((s) => (s === d.key ? null : d.key));
      return;
    }
    const slot = slotAt(e.clientX, e.clientY);
    if (slot && !matched.includes(slot)) attempt(d.key, slot);
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

  const tapSlot = (slotKey: string) => {
    if (selected && !matched.includes(slotKey)) attempt(selected, slotKey);
  };

  const left = board.cards.filter((c) => !matched.includes(c.key));

  return (
    <div className="read-match">
      <div className="read-match-hud">
        <p className="read-match-goal">{cheer ? 'All matched!' : selected ? 'Now tap its picture.' : 'Drag each word to its picture.'}</p>
        <div className="read-match-stats">
          <span className="read-match-pill">
            {Math.min(boardNo + 1, BOARDS)}/{BOARDS}
          </span>
          <span className="read-match-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className="read-match-pictures" style={{ '--n': board.pairs.length } as CSSProperties}>
        {board.pairs.map((p) => {
          const done = matched.includes(p.key);
          return (
            <div key={`${boardNo}-${p.key}`} className="read-match-slot">
              <button
                type="button"
                className={`read-match-pic${done ? ' done' : ''}${hover === p.key ? ' hover' : ''}${selected && !done ? ' ready' : ''}${cheer ? ' cheer' : ''}`}
                data-rm-drop={done ? undefined : p.key}
                onClick={() => tapSlot(p.key)}
                aria-label={done ? `${p.text}, matched` : 'Picture: put the right word here'}
              >
                <span className={`read-match-emoji n${p.count}`} style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                  {Array.from({ length: p.count }, () => p.emoji).join('')}
                </span>
                <span className="read-match-label">{done ? p.text : ''}</span>
              </button>
              <button
                type="button"
                className="read-match-say"
                onClick={() => speak(p.text, { force: true })}
                aria-label="Hear the picture's word"
                title="Hear it"
              >
                <Volume2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="read-match-pile">
        {left.map((c) => {
          const moving = offset?.key === c.key;
          const style = {
            '--tilt': `${c.tilt}deg`,
            transform: moving ? `translate(${offset.dx}px, ${offset.dy}px) rotate(${c.tilt / 2}deg) scale(1.06)` : undefined,
          } as CSSProperties;
          return (
            <button
              key={`${boardNo}-${c.key}`}
              type="button"
              data-rm-card={c.key}
              className={`read-match-card${moving ? ' dragging' : ''}${selected === c.key ? ' selected' : ''}${shake === c.key ? ' shake' : ''}`}
              style={style}
              onPointerDown={(e) => onPointerDown(e, c.key)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onClick={(e) => {
                // Keyboard activation only; pointer taps are handled in onPointerUp.
                if (e.detail === 0) setSelected((s) => (s === c.key ? null : c.key));
              }}
            >
              {c.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'read-match',
  subject: 'reading',
  title: 'Read and Match',
  blurb: 'Read each word and drag it onto its picture.',
  howTo: 'Read a word, then drag it onto the picture it names. You can also tap a word, then tap its picture.',
  color: '#34c47c',
  icon: BookOpenCheck,
  scoreLabel: 'words matched first time',
  Play,
};
