import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Blocks, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { EMOJI_FONT } from '../reading/words';
import { pick } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { makeRounds, ROUNDS } from './rounds';
import type { WordRound } from './rounds';
import './word-builder.css';

interface Tile {
  id: number;
  letter: string;
  /** Slot it sits in, or null while it waits in the tray. */
  slot: number | null;
}

const PRAISE = ['You built it!', 'Super spelling!', 'Yes!', 'Brilliant!'];

const tilesFor = (round: WordRound): Tile[] => round.tiles.map((letter, id) => ({ id, letter, slot: null }));

/** Which slot (by index) is under a screen point, if any. */
function slotAt(x: number, y: number): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const s = (el as HTMLElement).closest?.<HTMLElement>('[data-slot]');
    if (s) return Number(s.dataset.slot);
  }
  return null;
}

function Play({ band, onFinish }: GameProps) {
  const [rounds] = useState(() => makeRounds(band));
  const [index, setIndex] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(() => tilesFor(rounds[0]));
  const [score, setScore] = useState(0);
  const [mistake, setMistake] = useState(false);
  const [complete, setComplete] = useState(false);
  const [held, setHeld] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [bounce, setBounce] = useState<{ id: number; n: number } | null>(null);
  const [shake, setShake] = useState<{ slot: number; n: number } | null>(null);
  const [message, setMessage] = useState('');

  const dragRef = useRef<{ id: number; x0: number; y0: number; moved: boolean } | null>(null);
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const round = rounds[index];
  const { word, prefilled } = round;
  const inSlot = (i: number) => tiles.find((t) => t.slot === i);
  const nextEmpty = () => {
    for (let i = prefilled; i < word.length; i++) if (!inSlot(i)) return i;
    return null;
  };

  const flash = (text: string) => {
    setMessage(text);
    later(() => setMessage((m) => (m === text ? '' : m)), 1500);
  };

  const nextWord = () => {
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(scoreRef.current);
      }
      return;
    }
    setIndex(index + 1);
    setTiles(tilesFor(rounds[index + 1]));
    setMistake(false);
    setComplete(false);
    // Tile ids restart each word, so forget the last word's wobbles.
    setBounce(null);
    setShake(null);
  };

  /** Try to put tile `id` into slot `i`. */
  const place = (id: number, i: number) => {
    const tile = tiles.find((t) => t.id === id);
    if (!tile || tile.slot !== null || complete || finished.current) return;
    if (i < prefilled || inSlot(i)) return; // That spot is taken: the tile just goes home.
    if (tile.letter !== word[i]) {
      play('wrong');
      setMistake(true);
      setBounce((b) => ({ id, n: (b?.n ?? 0) + 1 }));
      setShake((s) => ({ slot: i, n: (s?.n ?? 0) + 1 }));
      flash('Not that letter there. Try another!');
      return;
    }
    play('pop');
    const placed = tiles.map((t) => (t.id === id ? { ...t, slot: i } : t));
    setTiles(placed);
    const filled = placed.filter((t) => t.slot !== null).length + prefilled;
    if (filled === word.length) {
      setComplete(true);
      play('correct');
      flash(pick(PRAISE));
      if (!mistake) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      later(nextWord, 1400);
    }
  };

  /** A tap fills the next empty slot. */
  const tapTile = (id: number) => {
    const i = nextEmpty();
    if (i !== null) place(id, i);
  };

  const takeBack = (i: number) => {
    if (complete) return;
    const tile = inSlot(i);
    if (!tile) return;
    play('tap');
    setTiles((ts) => ts.map((t) => (t.id === tile.id ? { ...t, slot: null } : t)));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, tile: Tile) => {
    if (tile.slot !== null || complete || dragRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: tile.id, x0: e.clientX, y0: e.clientY, moved: false };
    setHeld({ id: tile.id, dx: 0, dy: 0 });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>, tile: Tile) => {
    const d = dragRef.current;
    if (!d || d.id !== tile.id) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
    setHeld({ id: tile.id, dx, dy });
    setOver(slotAt(e.clientX, e.clientY));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, tile: Tile, cancelled = false) => {
    const d = dragRef.current;
    if (!d || d.id !== tile.id) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setHeld(null);
    setOver(null);
    if (cancelled) return;
    if (!d.moved) {
      tapTile(tile.id);
      return;
    }
    const i = slotAt(e.clientX, e.clientY);
    if (i !== null) place(tile.id, i);
  };

  const onTileKey = (e: ReactKeyboardEvent, tile: Tile) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tapTile(tile.id);
    }
  };

  // Typing a letter on a keyboard uses the matching tile.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !/^[a-z]$/i.test(e.key)) return;
      if (e.target instanceof Element && e.target.closest('input, textarea')) return;
      const tile = tiles.find((t) => t.slot === null && t.letter === e.key.toLowerCase());
      if (tile) {
        e.preventDefault();
        tapTile(tile.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="word-builder">
      <div className="word-builder-hud">
        <p className="word-builder-goal" aria-live="polite">
          {message || (band === 0 ? 'Finish the word!' : 'Build the word!')}
        </p>
        <div className="word-builder-stats" aria-label={`Word ${index + 1} of ${ROUNDS}, ${score} built with no mistakes`}>
          <span className="word-builder-pill">
            {index + 1}/{ROUNDS}
          </span>
          <span className="word-builder-pill">
            <Star size={15} fill="var(--star)" strokeWidth={2} /> {score}
          </span>
        </div>
      </div>

      <div className="word-builder-field" key={index}>
        <div className="word-builder-picture">
          <span className="word-builder-emoji" style={{ fontFamily: EMOJI_FONT }} role="img" aria-label={word}>
            {round.emoji}
          </span>
          <button type="button" className="word-builder-say" onClick={() => speak(word, { force: true })} aria-label={`Hear the word ${word}`}>
            <Volume2 size={20} />
          </button>
        </div>

        <div className={`word-builder-slots${complete ? ' done' : ''}`} style={{ '--n': word.length } as CSSProperties}>
          {word.split('').map((letter, i) => {
            const tile = inSlot(i);
            const fixed = i < prefilled;
            const shaking = shake?.slot === i ? shake.n : 0;
            return (
              <button
                key={`${i}-${shaking}`}
                type="button"
                data-slot={i}
                className={`word-builder-slot${fixed ? ' fixed' : tile ? ' filled' : ''}${over === i ? ' over' : ''}${shaking ? ' shake' : ''}`}
                style={{ '--i': i } as CSSProperties}
                onClick={() => takeBack(i)}
                disabled={fixed || complete}
                aria-label={fixed ? `Letter ${letter}` : tile ? `Letter ${tile.letter}. Tap to take it back` : `Empty space ${i + 1}`}
              >
                {fixed ? letter : tile ? <span className="word-builder-placed">{tile.letter}</span> : ''}
              </button>
            );
          })}
        </div>

        <div className="word-builder-tray">
          {tiles.map((tile) => {
            if (tile.slot !== null) return <span key={tile.id} className="word-builder-tile ghost" aria-hidden />;
            const lifted = held?.id === tile.id;
            const bounced = bounce?.id === tile.id ? bounce.n : 0;
            return (
              <div
                key={tile.id}
                className={`word-builder-tile${lifted ? ' lifted' : ''}`}
                style={{
                  transform: lifted ? `translate(${held.dx}px, ${held.dy}px) scale(1.08)` : undefined,
                  transition: lifted ? 'none' : undefined,
                }}
                role="button"
                tabIndex={complete ? -1 : 0}
                aria-label={`Letter ${tile.letter}. Drag it to a space, or tap to put it in the next space.`}
                onPointerDown={(e) => onPointerDown(e, tile)}
                onPointerMove={(e) => onPointerMove(e, tile)}
                onPointerUp={(e) => endDrag(e, tile)}
                onPointerCancel={(e) => endDrag(e, tile, true)}
                onKeyDown={(e) => onTileKey(e, tile)}
              >
                <span key={bounced} className={`word-builder-letter${bounced ? ' bounce' : ''}`}>
                  {tile.letter}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'word-builder',
  subject: 'reading',
  title: 'Word Builder',
  blurb: 'Drag letters into place to spell the picture.',
  howTo: 'Name the picture, or tap its speaker. Spell the word by tapping letters in order, or dragging them to the spaces. Tap a placed letter to take it back.',
  color: '#8b5cf6',
  icon: Blocks,
  scoreLabel: 'words built with no mistakes',
  Play,
};
