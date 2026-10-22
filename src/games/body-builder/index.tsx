import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, HeartPulse, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { BodyFigure } from './Figure';
import { OrganIcon, OrganShape } from './Organs';
import { makeRounds, ROUNDS } from './rounds';
import type { OrganKind, Piece, Round, Target } from './rounds';
import { targetAt, useDrag } from '../shared/useDrag';
import './body-builder.css';

const ATTR = 'bb-target';

/** Icon shown on each body-system bin. */
const SYSTEM_ICON: Record<string, OrganKind> = {
  circulatory: 'heart',
  respiratory: 'lungs',
  digestive: 'stomach',
  nervous: 'brain',
  skeletal: 'skull',
};

function PieceFace({ piece }: { piece: Piece }) {
  return (
    <>
      {piece.emoji && (
        <span className="body-builder-emoji" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
          {piece.emoji}
        </span>
      )}
      {piece.organ && <OrganIcon kind={piece.organ} size={40} />}
      <span className="body-builder-card-label">{piece.label}</span>
    </>
  );
}

function Play({ band, onFinish }: GameProps) {
  const [rounds] = useState(() => makeRounds(band));
  const [roundNo, setRoundNo] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [fact, setFact] = useState<{ text: string; good: boolean } | null>(null);
  const [cheer, setCheer] = useState(false);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);
  const round: Round = rounds[roundNo];

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** Bins take many pieces; spots on the body take one each. */
  const isOpen = (t: Target) => round.view === 'systems' || !round.pieces.some((p) => p.target === t.id && placed.includes(p.id));

  const attempt = (pieceId: string, targetId: string) => {
    const piece = round.pieces.find((p) => p.id === pieceId);
    if (!piece || placed.includes(pieceId) || cheer) return;
    setSelected(null);
    setHover(null);
    if (piece.target === targetId) {
      play('pop');
      const firstTry = !missed.includes(pieceId);
      const nextScore = score + (firstTry ? 1 : 0);
      const nextPlaced = [...placed, pieceId];
      setScore(nextScore);
      setPlaced(nextPlaced);
      setFact({ text: piece.fact, good: true });
      if (nextPlaced.length === round.pieces.length) {
        play('correct');
        setCheer(true);
        later(() => {
          setCheer(false);
          if (roundNo + 1 >= ROUNDS) {
            if (!finished.current) {
              finished.current = true;
              onFinish(nextScore);
            }
            return;
          }
          setRoundNo(roundNo + 1);
          setPlaced([]);
          setMissed([]);
          setFact(null);
        }, 1800);
      }
    } else {
      play('wrong');
      if (!missed.includes(pieceId)) setMissed([...missed, pieceId]);
      setShake(pieceId);
      later(() => setShake((k) => (k === pieceId ? null : k)), 450);
      setFact({
        text: round.view === 'systems' ? 'Not that one. Think about what this part does.' : 'Not there. Try another spot!',
        good: false,
      });
    }
  };

  const { offset, bind } = useDrag({
    onMove: (_id, x, y) => setHover(targetAt(ATTR, x, y)),
    onDrop: (id, x, y) => {
      const t = targetAt(ATTR, x, y);
      if (t) attempt(id, t);
      else setHover(null);
    },
    onTap: (id) => {
      play('tap');
      setSelected((s) => (s === id ? null : id));
    },
  });

  const tapTarget = (targetId: string) => {
    if (selected) attempt(selected, targetId);
  };

  const left = round.pieces.filter((p) => !placed.includes(p.id));
  const goal = cheer ? 'All done. Great building!' : selected ? 'Now tap where it goes.' : round.goal;

  return (
    <div className={`body-builder view-${round.view}`}>
      <div className="body-builder-hud">
        <p className="body-builder-goal">
          {goal}
          <button type="button" className="body-builder-say" onClick={() => speak(goal, { force: true })} aria-label="Hear the goal" title="Hear it">
            <Volume2 size={15} />
          </button>
        </p>
        <div className="body-builder-stats">
          <span className="body-builder-pill">
            {Math.min(roundNo + 1, ROUNDS)}/{ROUNDS}
          </span>
          <span className="body-builder-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <p className={`body-builder-fact${fact ? (fact.good ? ' good' : ' bad') : ''}`} role="status">
        {fact ? fact.text : ' '}
        {fact?.good && (
          <button type="button" className="body-builder-say" onClick={() => speak(fact.text, { force: true })} aria-label="Hear this fact" title="Hear it">
            <Volume2 size={15} />
          </button>
        )}
      </p>

      <div className="body-builder-board">
        {round.view === 'systems' ? (
          <div className="body-builder-bins">
            {round.targets.map((t) => {
              const inBin = round.pieces.filter((p) => p.target === t.id && placed.includes(p.id));
              return (
                <button
                  key={t.id}
                  type="button"
                  data-bb-target={t.id}
                  className={`body-builder-bin${hover === t.id ? ' hover' : ''}${selected ? ' ready' : ''}${cheer ? ' cheer' : ''}`}
                  onClick={() => tapTarget(t.id)}
                  aria-label={`${t.label} system`}
                >
                  <OrganIcon kind={SYSTEM_ICON[t.id]} size={42} />
                  <span className="body-builder-bin-name">{t.label}</span>
                  <span className="body-builder-bin-items">
                    {inBin.map((p) => (
                      <span key={p.id} className="body-builder-chip">
                        <Check size={12} strokeWidth={3} /> {p.label}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={`body-builder-figure${cheer ? ' cheer' : ''}`}>
            <BodyFigure view={round.view} />
            {/* Placed organs are drawn on the body. */}
            {round.view === 'inside' && (
              <svg viewBox="0 0 400 640" className="body-builder-svg organs" aria-hidden>
                {round.pieces
                  .filter((p) => placed.includes(p.id))
                  .flatMap((p) => {
                    const t = round.targets.find((x) => x.id === p.target)!;
                    const spots = p.organ === 'lungs' ? [[(t.anchors[0][0] + t.anchors[1][0]) / 2, t.anchors[0][1]] as [number, number]] : t.anchors;
                    const size = p.organ === 'lungs' ? 150 : p.organ === 'brain' ? 130 : p.organ === 'intestines' ? 96 : 76;
                    return spots.map(([x, y], i) => (
                      <g key={`${p.id}-${i}`} className="body-builder-organ" transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})`}>
                        <OrganShape kind={p.organ!} />
                      </g>
                    ));
                  })}
              </svg>
            )}
            {round.targets.flatMap((t) => {
              const open = isOpen(t);
              const donePiece = round.pieces.find((p) => p.target === t.id && placed.includes(p.id));
              return t.anchors.map(([x, y], i) => (
                <button
                  key={`${roundNo}-${t.id}-${i}`}
                  type="button"
                  data-bb-target={open ? t.id : undefined}
                  className={`body-builder-spot${open ? '' : ' done'}${hover === t.id ? ' hover' : ''}${selected && open ? ' ready' : ''}`}
                  style={{ left: `${(x / 400) * 100}%`, top: `${(y / 640) * 100}%` } as CSSProperties}
                  onClick={() => open && tapTarget(t.id)}
                  aria-label={open ? 'Empty spot' : `${donePiece?.label ?? t.label}, placed`}
                  disabled={!open}
                >
                  {!open && round.view !== 'inside' && <Check size={18} strokeWidth={3} />}
                </button>
              ));
            })}
            {/* Only the newest placement keeps its name tag, so the face stays readable. */}
            {round.view !== 'inside' &&
              round.pieces
                .filter((p) => p.id === placed[placed.length - 1])
                .map((p) => {
                  const t = round.targets.find((x) => x.id === p.target)!;
                  const [x, y] = t.anchors[t.anchors.length - 1];
                  return (
                    <span
                      key={`tag-${p.id}`}
                      className={`body-builder-tag${t.id === 'nose' ? ' side' : ''}`}
                      style={{ left: `${(x / 400) * 100}%`, top: `${(y / 640) * 100}%` } as CSSProperties}
                    >
                      {t.label}
                    </span>
                  );
                })}
          </div>
        )}

        <div className="body-builder-tray" aria-label="Pieces to place">
          {left.map((p) => {
            const moving = offset?.id === p.id;
            return (
              <button
                key={`${roundNo}-${p.id}`}
                type="button"
                className={`body-builder-card${moving ? ' dragging' : ''}${selected === p.id ? ' selected' : ''}${shake === p.id ? ' shake' : ''}`}
                style={moving ? { transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.06)` } : undefined}
                {...bind(p.id)}
              >
                <PieceFace piece={p} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'body-builder',
  subject: 'science',
  topic: 'biology',
  title: 'Body Builder',
  blurb: 'Drag body parts, senses and organs to the right place.',
  howTo: 'Drag each card to the right place on the body. You can also tap a card, then tap where it goes.',
  howToByBand: [
    'Match each body part to its spot on the person. Drag a card to the spot, or tap the card and then the spot.',
    'Which body part helps you see, hear, smell, taste or touch? Drag each sense card to its spot, or tap the card and then the spot.',
    'Put each organ in its place inside the body. Drag its card to a spot, or tap the card and then the spot. Read the fact after each match.',
    'Sort the body-part cards into their systems, such as breathing or digestion. Drag a card to a system, or tap the card and then the system.',
  ],
  color: '#ff5d8f',
  icon: HeartPulse,
  scoreLabel: 'parts placed first time',
  Play,
};
