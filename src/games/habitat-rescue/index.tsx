import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Star, Trees, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { HABITATS, homeOn, makeRound, ROUND, wrongReaction } from './habitats';
import type { Card, HabitatId, Reaction } from './habitats';
import './habitat-rescue.css';

interface Drag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/** The habitat zone (data-hr-drop) under a screen point, if any. */
function zoneAt(x: number, y: number): HabitatId | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el instanceof HTMLElement && el.dataset.hrDrop) return el.dataset.hrDrop as HabitatId;
  }
  return null;
}

const GOALS = ['Help each animal get home', 'Take each animal to its home', 'Which home does each feature help in?', 'Where would each feature help?'];

const BADGE: Record<Reaction, string> = { shiver: '🥶', sweat: '🥵', splash: '💦', flop: '😵', unsure: '🤔' };

function Glyph({ card, className }: { card: Card; className: string }) {
  if (!card.glyph) return null;
  return (
    <span className={`${className}${card.white ? ' habitat-rescue-white' : ''}`} style={{ fontFamily: EMOJI_FONT }} aria-hidden>
      {card.glyph}
    </span>
  );
}

function Play({ band, onFinish }: GameProps) {
  const round = useMemo(() => makeRound(band), [band]);
  const [queue, setQueue] = useState<Card[]>(round.cards);
  const [placed, setPlaced] = useState<Partial<Record<HabitatId, Card[]>>>({});
  const [missed, setMissed] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);
  const [reaction, setReaction] = useState<{ id: string; kind: Reaction; at: HabitatId } | null>(null);
  const [cheer, setCheer] = useState<HabitatId | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<HabitatId | null>(null);
  const drag = useRef<Drag | null>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const done = queue.length === 0;
  const features = band >= 2;
  const ghostCard = ghost ? queue.find((c) => c.id === ghost.id) : undefined;

  const place = (id: string, target: HabitatId | null) => {
    setSelected(null);
    setHover(null);
    const card = queue.find((c) => c.id === id);
    if (!card || !target) return;
    const home = homeOn(card, round.board)!;
    if (target === home) {
      play('correct');
      if (!missed.includes(id)) setScore((s) => s + 1);
      setQueue((q) => q.filter((c) => c.id !== id));
      setPlaced((p) => ({ ...p, [home]: [...(p[home] ?? []), card] }));
      setMessage({ text: `Yes! ${card.fact}`, good: true });
      setReaction(null);
      setCheer(home);
      later(() => setCheer((h) => (h === home ? null : h)), 700);
      return;
    }
    play('wrong');
    if (!missed.includes(id)) setMissed((m) => [...m, id]);
    const wrong = wrongReaction(card, home, target);
    setMessage({ text: wrong.line, good: false });
    setReaction({ id, kind: wrong.reaction, at: target });
    later(() => setReaction((r) => (r?.id === id ? null : r)), 1100);
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish(score);
  };

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
    d.moved = true;
    setSelected(null);
    setGhost({ id: d.id, x: e.clientX, y: e.clientY });
    setHover(zoneAt(e.clientX, e.clientY));
  };
  const onUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setGhost(null);
    if (!d.moved) {
      // Tap to pick up, then tap a habitat.
      play('tap');
      setSelected((s) => (s === d.id ? null : d.id));
      return;
    }
    place(d.id, zoneAt(e.clientX, e.clientY));
  };
  const onCancel = () => {
    drag.current = null;
    setGhost(null);
    setHover(null);
  };

  const waiting = queue.slice(0, band >= 2 ? 2 : 3); // word cards are wider
  const n = round.board.length;

  return (
    <div className="habitat-rescue">
      <div className="habitat-rescue-hud">
        <p className="habitat-rescue-goal">
          {GOALS[band]}
          <button type="button" className="habitat-rescue-say" onClick={() => speak(`${GOALS[band]}.`, { force: true })} aria-label="Hear the goal" title="Hear it">
            <Volume2 size={16} />
          </button>
        </p>
        <div className="habitat-rescue-stats">
          <span className="habitat-rescue-pill">
            {ROUND - queue.length}/{ROUND}
          </span>
          <span className="habitat-rescue-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className={`habitat-rescue-zones n${n}`} style={{ '--n': n } as CSSProperties}>
        {round.board.map((h) => {
          const hab = HABITATS[h];
          const residents = placed[h] ?? [];
          return (
            <div
              key={h}
              className={`habitat-rescue-zone ${h}${hover === h ? ' hover' : ''}${selected ? ' ready' : ''}${cheer === h ? ' cheer' : ''}${reaction?.at === h ? ' nope' : ''}`}
              data-hr-drop={h}
              role="button"
              tabIndex={0}
              aria-label={`${hab.name}${residents.length ? `, ${residents.length} placed` : ''}`}
              onClick={() => selected && place(selected, h)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && selected) {
                  e.preventDefault();
                  place(selected, h);
                }
              }}
            >
              <span className="habitat-rescue-zone-icon" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                {hab.icon}
              </span>
              <span className="habitat-rescue-zone-name">{hab.name}</span>
              {residents.length > 0 && (
                <span className="habitat-rescue-residents" aria-hidden>
                  {residents.map((c) =>
                    c.glyph ? (
                      <Glyph key={c.id} card={c} className="habitat-rescue-resident" />
                    ) : (
                      <span key={c.id} className="habitat-rescue-tick" title={c.label}>
                        ✓
                      </span>
                    ),
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className={`habitat-rescue-feedback${message ? (message.good ? ' good' : ' bad') : ''}`} role="status">
        {message?.text ?? (features ? 'Drag a card to a home, or tap it and then tap a home.' : 'Drag an animal to its home, or tap it and then tap a home.')}
      </div>

      <div className="habitat-rescue-dock" aria-label="Waiting dock">
        {done ? (
          <div className="habitat-rescue-done">
            <span>
              All {ROUND} {features ? 'features placed' : 'animals home'}! {score} first try.
            </span>
            <button type="button" className="btn primary" onClick={finish}>
              Finish
            </button>
          </div>
        ) : (
          <>
            {waiting.map((card, i) => {
              const r = reaction?.id === card.id ? reaction.kind : null;
              return (
                <div key={card.id} className={`habitat-rescue-slot${i === 0 ? ' front' : ''}`}>
                  <button
                    type="button"
                    className={`habitat-rescue-card ${card.kind}${card.glyph ? '' : ' words'}${selected === card.id ? ' selected' : ''}${ghost?.id === card.id ? ' lifted' : ''}${r ? ` react-${r}` : ''}`}
                    onPointerDown={(e) => onDown(e, card.id)}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onCancel}
                    onClick={(e) => {
                      if (e.detail !== 0) return; // keyboard only; pointer taps go through onUp
                      setSelected((s) => (s === card.id ? null : card.id));
                    }}
                    aria-label={card.label}
                    aria-pressed={selected === card.id}
                  >
                    <Glyph card={card} className="habitat-rescue-card-glyph" />
                    <span className="habitat-rescue-card-label">{card.label}</span>
                    {r && (
                      <span className="habitat-rescue-badge" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                        {BADGE[r]}
                      </span>
                    )}
                  </button>
                  {i === 0 && (
                    <button type="button" className="habitat-rescue-card-say" onClick={() => speak(card.label, { force: true })} aria-label={`Hear ${card.label}`}>
                      <Volume2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
            {queue.length > waiting.length && <span className="habitat-rescue-more">+{queue.length - waiting.length}</span>}
          </>
        )}
      </div>

      {ghost && ghostCard && (
        <div className={`habitat-rescue-ghost ${ghostCard.kind}${ghostCard.glyph ? '' : ' words'}`} style={{ left: ghost.x, top: ghost.y }} aria-hidden>
          <Glyph card={ghostCard} className="habitat-rescue-card-glyph" />
          <span className="habitat-rescue-card-label">{ghostCard.label}</span>
        </div>
      )}
    </div>
  );
}

export const game: Game = {
  id: 'habitat-rescue',
  subject: 'science',
  topic: 'biology',
  title: 'Habitat Rescue',
  blurb: 'Help every animal find the home it is built for.',
  howTo: 'Drag each animal from the dock to the habitat where it lives. Older explorers match body features to the home they help in.',
  color: '#34c47c',
  icon: Trees,
  scoreLabel: 'right first try',
  Play,
};
