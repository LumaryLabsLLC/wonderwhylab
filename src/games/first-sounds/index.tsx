import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { AudioLines, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { EMOJI_FONT } from '../reading/words';
import { pick } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { bucketLabel, goalFor, makeRounds, ROUNDS } from './rounds';
import './first-sounds.css';

type Phase = 'idle' | 'drag' | 'in' | 'back';

const BUCKETS = [
  { c: 'var(--ocean)', soft: 'var(--ocean-soft)' },
  { c: 'var(--berry)', soft: 'var(--berry-soft)' },
  { c: 'var(--leaf)', soft: 'var(--leaf-soft)' },
];

const PRAISE = ['Yes!', 'Great listening!', 'You got it!', 'Spot on!'];

/** Which bucket (by index) is under a screen point, if any. */
function bucketAt(x: number, y: number): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const b = (el as HTMLElement).closest?.<HTMLElement>('[data-bucket]');
    if (b) return Number(b.dataset.bucket);
  }
  return null;
}

function Play({ band, onFinish }: GameProps) {
  const [rounds] = useState(() => makeRounds(band));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [over, setOver] = useState<number | null>(null);
  const [selected, setSelected] = useState(false);
  const [bounce, setBounce] = useState<{ i: number; good: boolean; n: number } | null>(null);
  const [message, setMessage] = useState('');
  // Tapping a bucket before moving the picture wiggles it (remembered per round).
  const [nudge, setNudge] = useState({ n: 0, round: -1 });

  const cardRef = useRef<HTMLDivElement>(null);
  const bucketRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ x0: number; y0: number; moved: boolean } | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const round = rounds[index];

  const moveCard = (x: number, y: number) => {
    offsetRef.current = { x, y };
    setOffset({ x, y });
  };

  const flash = (text: string) => {
    setMessage(text);
    later(() => setMessage((m) => (m === text ? '' : m)), 1500);
  };

  /** Drop the picture into bucket `i`. */
  const send = (i: number) => {
    if (finished.current || phase === 'in') return;
    setSelected(false);
    const card = cardRef.current;
    const bucket = bucketRefs.current[i];
    if (!card || !bucket) return;
    setBounce((b) => ({ i, good: round.options[i] === round.answer, n: (b?.n ?? 0) + 1 }));

    if (round.options[i] === round.answer) {
      play('correct');
      flash(pick(PRAISE));
      if (tries === 0) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      // Fly from wherever it is now into the middle of the bucket.
      const c = card.getBoundingClientRect();
      const b = bucket.getBoundingClientRect();
      const baseX = c.left + c.width / 2 - offsetRef.current.x;
      const baseY = c.top + c.height / 2 - offsetRef.current.y;
      setPhase('in');
      moveCard(b.left + b.width / 2 - baseX, b.top + b.height * 0.55 - baseY);
      later(() => {
        if (index + 1 >= ROUNDS) {
          if (!finished.current) {
            finished.current = true;
            onFinish(scoreRef.current);
          }
          return;
        }
        setIndex(index + 1);
        setTries(0);
        setBounce(null);
        setPhase('idle');
        moveCard(0, 0);
      }, 950);
      return;
    }

    // Wrong bucket: the picture slides back for another go.
    play('wrong');
    flash('Not that one. Try again!');
    setTries((t) => t + 1);
    setPhase('back');
    moveCard(0, 0);
    later(() => setPhase((p) => (p === 'back' ? 'idle' : p)), 450);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'idle' || finished.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x0: e.clientX, y0: e.clientY, moved: false };
    setPhase('drag');
    play('tap');
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
    moveCard(dx, dy);
    setOver(bucketAt(e.clientX, e.clientY));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setOver(null);
    if (!cancelled && !d.moved) {
      // A tap picks the picture up; then tap a bucket.
      setPhase('idle');
      moveCard(0, 0);
      setSelected((s) => !s);
      return;
    }
    const target = cancelled ? null : bucketAt(e.clientX, e.clientY);
    if (target !== null) {
      send(target);
    } else {
      setPhase('back');
      moveCard(0, 0);
      later(() => setPhase((p) => (p === 'back' ? 'idle' : p)), 450);
    }
  };

  const onCardKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected((s) => !s);
    }
  };

  const onBucket = (i: number) => {
    if (phase !== 'idle') return;
    if (selected) {
      send(i);
      return;
    }
    // Buckets aren't answer buttons: the picture has to go in.
    setNudge((v) => ({ n: v.n + 1, round: index }));
    flash('Drag the picture into a bucket!');
  };

  const scale = phase === 'drag' ? 1.06 : phase === 'in' ? 0.22 : selected ? 1.05 : 1;
  const cardStyle: CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${phase === 'drag' ? Math.max(-8, Math.min(8, offset.x / 30)) : 0}deg)`,
    opacity: phase === 'in' ? 0 : 1,
    transition:
      phase === 'drag'
        ? 'none'
        : phase === 'in'
          ? 'transform 0.42s cubic-bezier(0.5, 0, 0.75, 0.4), opacity 0.42s ease-in'
          : 'transform 0.42s cubic-bezier(0.3, 1.5, 0.5, 1)',
  };

  return (
    <div className="first-sounds">
      <div className="first-sounds-hud">
        <p className="first-sounds-goal" aria-live="polite">
          {message || goalFor(round)}
        </p>
        <div className="first-sounds-stats" aria-label={`Picture ${index + 1} of ${ROUNDS}, ${score} right first time`}>
          <span className="first-sounds-pill">
            {index + 1}/{ROUNDS}
          </span>
          <span className="first-sounds-pill">
            <Star size={15} fill="var(--star)" strokeWidth={2} /> {score}
          </span>
        </div>
      </div>

      <div className="first-sounds-field">
        <div className="first-sounds-stage">
          <div className="first-sounds-holder">
            <div
              key={index}
              ref={cardRef}
              className={`first-sounds-card is-${phase}`}
              style={cardStyle}
              role="button"
              tabIndex={0}
              aria-label={`Picture of a ${round.word}. Drag it into the bucket for its ${round.mode === 'end' ? 'last' : 'first'} sound.`}
              aria-pressed={selected}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => endDrag(e)}
              onPointerCancel={(e) => endDrag(e, true)}
              onKeyDown={onCardKey}
            >
              <div
                key={nudge.round === index ? nudge.n : 'new'}
                className={`first-sounds-face${selected ? ' selected' : ''}${nudge.round === index ? ' nudge' : ''}`}
              >
                <span className="first-sounds-emoji" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                  {round.emoji}
                </span>
                {band >= 2 && <span className="first-sounds-word">{round.word}</span>}
              </div>
            </div>
            <button type="button" className="first-sounds-say" onClick={() => speak(round.word, { force: true })} aria-label={`Hear the word ${round.word}`}>
              <Volume2 size={20} />
            </button>
          </div>
        </div>

        <div className="first-sounds-buckets" style={{ '--n': round.options.length } as CSSProperties}>
          {round.options.map((sound, i) => {
            const bounced = bounce?.i === i ? bounce : null;
            return (
              <button
                key={`${index}-${sound}`}
                ref={(el) => {
                  bucketRefs.current[i] = el;
                }}
                type="button"
                data-bucket={i}
                className={`first-sounds-bucket${over === i ? ' over' : ''}${selected ? ' ready' : ''}`}
                style={{ '--c': BUCKETS[i].c, '--c-soft': BUCKETS[i].soft } as CSSProperties}
                onClick={() => onBucket(i)}
                aria-label={`Bucket ${sound}${selected ? '. Tap to drop the picture here' : ''}`}
              >
                <span key={bounced?.n ?? 0} className={`first-sounds-pail${bounced ? (bounced.good ? ' bob' : ' shake') : ''}`}>
                  <Pail />
                  <span className="first-sounds-letter">{bucketLabel(sound, band)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Pail() {
  return (
    <svg className="first-sounds-pail-art" viewBox="0 0 140 120" aria-hidden>
      <path d="M30,40 C30,6 110,6 110,40" fill="none" stroke="var(--ink)" strokeWidth={5} strokeLinecap="round" />
      <path d="M14,40 H126 L112,114 H28 Z" fill="var(--c-soft)" stroke="var(--ink)" strokeWidth={4} strokeLinejoin="round" />
      <rect x={10} y={33} width={120} height={14} rx={7} fill="var(--c)" stroke="var(--ink)" strokeWidth={4} />
    </svg>
  );
}

export const game: Game = {
  id: 'first-sounds',
  subject: 'reading',
  title: 'First Sounds',
  blurb: 'Drag each picture into the bucket for its sound.',
  howTo: 'Look at the picture and say its name. Which letter does it start with? Drag it into that bucket!',
  howToByBand: [
    'Say the picture’s name, or tap its speaker. Find the bucket for its first sound. Drag the picture there, or tap the picture and then the bucket.',
    'Say the picture’s name, or tap its speaker. Find the bucket for its first sound. Drag the picture there, or tap the picture and then the bucket.',
    'Say the word and find its first sound. Look carefully at the similar letters. Drag the picture into its bucket, or tap the picture and then the bucket.',
    'Check the rule at the top: find the starting blend, like sh or tr, or the last sound. Drag the picture into its bucket, or tap the picture and then the bucket.',
  ],
  color: '#ff9f43',
  icon: AudioLines,
  scoreLabel: 'pictures right first time',
  Play,
};
