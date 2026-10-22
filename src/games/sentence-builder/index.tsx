import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Lightbulb, Sparkles, Star, Volume2, WholeWord } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { nextLevel } from '../../lib/memory';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { ROUNDS, canPlace, makeRound, nextStep, nudge, tip } from './rounds';
import type { Round } from './rounds';
import './sentence-builder.css';

interface Drag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/** The empty slot (data-sb-slot) under a screen point, if any. */
function slotAt(x: number, y: number): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el instanceof HTMLElement && el.dataset.sbSlot !== undefined) return Number(el.dataset.sbSlot);
  }
  return null;
}

/** Make a sentence read naturally aloud (the full stop is its own card in band 1). */
const sayable = (words: string[]) => words.join(' ').replace(/ \./g, '.');

function Play({ band, onFinish }: GameProps) {
  const [roundNo, setRoundNo] = useState(0);
  const [level, setLevel] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [round, setRound] = useState<Round>(() => makeRound(band, 0));
  const [placed, setPlaced] = useState<(string | null)[]>(() => round.answers[0].map(() => null));
  const [used, setUsed] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [showMe, setShowMe] = useState(false);
  const [complete, setComplete] = useState(false);
  const [shake, setShake] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const drag = useRef<Drag | null>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const startRound = (nextLvl: number, played: string[]) => {
    const r = makeRound(band, nextLvl, played.slice(-6));
    setRound(r);
    setPlaced(r.answers[0].map(() => null));
    setUsed([]);
    setMistakes(0);
    setMessage('');
    setShowMe(false);
    setComplete(false);
  };

  const finishRound = (perfect: boolean) => {
    const nextScore = score + (perfect ? 1 : 0);
    setScore(nextScore);
    setComplete(true);
    play('correct');
    const step = nextLevel(level, streak, perfect);
    later(() => {
      if (roundNo + 1 >= ROUNDS) {
        if (!finished.current) {
          finished.current = true;
          onFinish(nextScore);
        }
        return;
      }
      const played = [...recent, round.id];
      setRecent(played);
      setLevel(step.level);
      setStreak(step.streak);
      setRoundNo(roundNo + 1);
      startRound(step.level, played);
    }, 2200);
  };

  const attempt = (cardId: string, slot: number) => {
    setOffset(null);
    setHover(null);
    if (complete) return;
    const card = round.cards.find((c) => c.id === cardId);
    if (!card || used.includes(cardId)) return;
    if (canPlace(round, placed, slot, card.text)) {
      play('pop');
      const nextPlaced = placed.map((t, i) => (i === slot ? card.text : t));
      setPlaced(nextPlaced);
      setUsed([...used, cardId]);
      if (!showMe) setMessage('');
      if (nextPlaced.every((t) => t !== null)) finishRound(mistakes === 0);
      return;
    }
    play('wrong');
    const count = mistakes + 1;
    setMistakes(count);
    setShake(cardId);
    later(() => setShake((id) => (id === cardId ? null : id)), 450);
    if (count >= 2) {
      setShowMe(true);
      setMessage('Here’s how: the glowing card goes in the glowing space.');
    } else {
      setMessage(nudge(round, card.text));
    }
  };

  const firstEmpty = () => placed.findIndex((t) => t === null);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0 || complete) return;
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
    setHover(slotAt(e.clientX, e.clientY));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      // A tap puts the card in the first empty space.
      const slot = firstEmpty();
      if (slot >= 0) attempt(d.id, slot);
      return;
    }
    const slot = slotAt(e.clientX, e.clientY);
    if (slot !== null && placed[slot] === null) attempt(d.id, slot);
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

  const hint = showMe && !complete ? nextStep(round, placed) : null;
  const hintCard = hint ? round.cards.find((c) => !used.includes(c.id) && c.text === hint.text)?.id : undefined;
  const pile = round.cards.filter((c) => !used.includes(c.id));
  const finishedSentence = complete ? sayable(placed as string[]) : '';

  const goal =
    band === 0
      ? 'Which word names the picture?'
      : band === 3
        ? 'Join the two sentences into one.'
        : 'Build the sentence that matches the picture.';

  return (
    <div className="sentence-builder">
      <div className="sentence-builder-hud">
        <p className="sentence-builder-goal">{complete ? 'You built it!' : goal}</p>
        <div className="sentence-builder-stats">
          <span className="sentence-builder-pill">
            {Math.min(roundNo + 1, ROUNDS)}/{ROUNDS}
          </span>
          <span className="sentence-builder-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className="sentence-builder-prompt">
        <span className={`sentence-builder-picture${band === 3 ? ' small' : ''}`} style={{ fontFamily: EMOJI_FONT }} aria-hidden>
          {round.picture}
        </span>
        {round.join && (
          <div className="sentence-builder-join">
            <p>{round.join[0]}</p>
            <p>{round.join[1]}</p>
            <button
              type="button"
              className="sentence-builder-say"
              onClick={() => speak(`${round.join![0]} ${round.join![1]}`, { force: true })}
              aria-label="Hear the two sentences"
              title="Hear them"
            >
              <Volume2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className={`sentence-builder-slots${complete ? ' complete' : ''}`} aria-label="Sentence">
        {placed.map((text, i) => {
          const ghost = hint && hint.slot === i ? hint.text : null;
          return (
            <span
              key={`${round.id}-${i}`}
              data-sb-slot={text === null ? i : undefined}
              className={`sentence-builder-slot${text !== null ? ' filled' : ''}${hover === i ? ' hover' : ''}${ghost ? ' show-me' : ''}${text === '.' ? ' stop' : ''}`}
              style={{ '--i': i } as CSSProperties}
            >
              {text ?? (ghost ? <span className="sentence-builder-ghost">{ghost}</span> : '')}
            </span>
          );
        })}
      </div>

      <div className="sentence-builder-feedback" role="status">
        {complete ? (
          <>
            <Sparkles size={18} />
            <span>{tip(round)}</span>
            {band > 0 && (
              <button
                type="button"
                className="sentence-builder-say inline"
                onClick={() => speak(finishedSentence, { force: true })}
                aria-label="Hear your sentence"
                title="Hear it"
              >
                <Volume2 size={16} />
              </button>
            )}
          </>
        ) : message ? (
          <>
            <Lightbulb size={18} />
            <span>{message}</span>
          </>
        ) : null}
      </div>

      <div className="sentence-builder-pile">
        {pile.map((c) => {
          const moving = offset?.id === c.id;
          const style = {
            '--tilt': `${c.tilt}deg`,
            transform: moving ? `translate(${offset.dx}px, ${offset.dy}px) rotate(${c.tilt / 2}deg) scale(1.06)` : undefined,
          } as CSSProperties;
          return (
            <span key={c.id} className="sentence-builder-card-wrap">
              <button
                type="button"
                data-sb-card={c.text}
                className={`sentence-builder-card${moving ? ' dragging' : ''}${shake === c.id ? ' shake' : ''}${hintCard === c.id ? ' show-me' : ''}${c.text === '.' ? ' stop' : ''}`}
                style={style}
                disabled={complete}
                onPointerDown={(e) => onPointerDown(e, c.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onClick={(e) => {
                  // Keyboard activation only; pointer taps are handled in onPointerUp.
                  if (e.detail === 0) {
                    const slot = firstEmpty();
                    if (slot >= 0) attempt(c.id, slot);
                  }
                }}
                aria-label={c.text === '.' ? 'full stop' : c.text}
              >
                {c.text}
              </button>
              {band === 0 && (
                <button
                  type="button"
                  className="sentence-builder-say card"
                  onClick={() => speak(c.text, { force: true })}
                  aria-label={`Hear the word ${c.text}`}
                  title="Hear it"
                >
                  <Volume2 size={15} />
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'sentence-builder',
  subject: 'reading',
  title: 'Sentence Builder',
  blurb: 'Drag word cards into order to build a sentence.',
  howTo: 'Drag the word cards into the spaces to build a sentence that fits. You can also tap a card to put it in the next space.',
  howToByBand: [
    'Find the word that names the picture. Tap its card to fill the space, or drag it there. Use a word’s speaker to hear it.',
    'Build a sentence about the picture. Tap words in order, or drag them to the spaces. Start with a capital letter and finish with a full stop.',
    'Build a sentence that fits the picture. Tap words in order, or drag them to the spaces. Think about the describing and joining words.',
    'Join the two short sentences into one. Choose a joining word that keeps the meaning, then arrange the cards. Tap a card for the next space, or drag it to a space.',
  ],
  color: '#3b8cff',
  icon: WholeWord,
  scoreLabel: 'sentences built first time',
  Play,
};
