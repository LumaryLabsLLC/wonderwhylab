import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { AudioWaveform, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { EMOJI_FONT } from '../reading/words';
import { pick } from '../../lib/random';
import { play } from '../../lib/sound';
import { prefetchSpeech, speak } from '../../lib/speech';
import { makeRounds, PHONEMES, ROUNDS } from './rounds';
import './sound-it-out.css';

type Phase = 'blend' | 'match' | 'right';

const PRAISE = ['You read it!', 'Great blending!', 'Yes! You sounded it out!', 'Super reading!'];

const sayPhoneme = (s: string) => speak(PHONEMES[s] ?? s, { force: true });

/** Which picture card is under a screen point, if any. */
function pictureAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const p = (el as HTMLElement).closest?.<HTMLElement>('[data-pic]');
    if (p) return p.dataset.pic ?? null;
  }
  return null;
}

function Play({ band, onFinish }: GameProps) {
  const [rounds] = useState(() => makeRounds(band));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('blend');
  /** Frog position along the slide, 0–1. */
  const [progress, setProgress] = useState(0);
  /** Highest sound tile the frog has passed (lit up), or -1. */
  const [lit, setLit] = useState(-1);
  const [sliding, setSliding] = useState(false);
  const [score, setScore] = useState(0);
  const [mistake, setMistake] = useState(false);
  const [message, setMessage] = useState('');
  const [held, setHeld] = useState<{ dx: number; dy: number } | null>(null);
  const [selected, setSelected] = useState(false);
  const [over, setOver] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ word: string; n: number } | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [tapped, setTapped] = useState<{ i: number; n: number } | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const frogDrag = useRef<{ x0: number; moved: boolean } | null>(null);
  const wordDrag = useRef<{ x0: number; y0: number; moved: boolean } | null>(null);
  const litRef = useRef(-1);
  const blendedRef = useRef(false);
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  const round = rounds[index];
  const { word, sounds } = round;
  const n = sounds.length;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  // Get this word's sounds ready in the background so taps play instantly (never plays anything).
  useEffect(() => {
    for (const s of sounds) prefetchSpeech(PHONEMES[s] ?? s);
    prefetchSpeech(word);
  }, [index]);

  const flash = (text: string, ms = 1600) => {
    setMessage(text);
    later(() => setMessage((m) => (m === text ? '' : m)), ms);
  };

  /** Light up every tile the frog has reached, saying each new sound once. */
  const reach = (p: number) => {
    setProgress(p);
    let next = litRef.current;
    while (next + 1 < n && p >= (next + 1.5) / n - 0.02) next += 1;
    if (next > litRef.current) {
      litRef.current = next;
      setLit(next);
      sayPhoneme(sounds[next]);
      play('tap');
    }
    if (p >= 0.97 && !blendedRef.current) finishBlend();
  };

  const finishBlend = () => {
    blendedRef.current = true;
    setProgress(1);
    setSliding(false);
    play('pop');
    // Let the last sound finish, then say the whole word as the tiles slide together.
    later(() => speak(word, { force: true }), 550);
    later(() => setPhase('match'), 1100);
  };

  /** Tap (or Enter) on the frog: it hops along on its own, one sound at a time. */
  const autoSlide = () => {
    if (blendedRef.current || sliding) return;
    setSliding(true);
    const start = litRef.current + 1;
    for (let i = start; i < n; i++) later(() => reach((i + 0.5) / n), (i - start) * 750);
    later(() => reach(1), (n - start) * 750);
  };

  const trackFraction = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const onFrogDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'blend' || blendedRef.current || sliding) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    frogDrag.current = { x0: e.clientX, moved: false };
  };
  const onFrogMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = frogDrag.current;
    if (!d || blendedRef.current) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) > 6) d.moved = true;
    if (d.moved) reach(Math.max(progress, trackFraction(e.clientX)));
  };
  const onFrogUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = frogDrag.current;
    frogDrag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d && !d.moved) autoSlide();
  };
  const onFrogKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      autoSlide();
    } else if (e.key === 'ArrowRight' && !blendedRef.current) {
      e.preventDefault();
      reach(litRef.current + 1 >= n ? 1 : (litRef.current + 1.5) / n);
    }
  };

  const nextWord = () => {
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(scoreRef.current);
      }
      return;
    }
    clearTimers();
    litRef.current = -1;
    blendedRef.current = false;
    setIndex(index + 1);
    setPhase('blend');
    setProgress(0);
    setLit(-1);
    setSliding(false);
    setMistake(false);
    setSelected(false);
    setWrong(null);
    setRight(null);
    setTapped(null);
    setMessage('');
  };

  /** Drop (or tap-place) the word onto a picture. */
  const tryPicture = (pic: string) => {
    if (phase !== 'match' || finished.current) return;
    setSelected(false);
    if (pic === word) {
      setRight(pic);
      setPhase('right');
      play('correct');
      flash(pick(PRAISE));
      if (!mistake) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      later(nextWord, 1400);
      return;
    }
    play('wrong');
    setMistake(true);
    setWrong((w) => ({ word: pic, n: (w?.n ?? 0) + 1 }));
    flash('Not that one. Tap the speaker to hear the sounds again!', 2200);
  };

  const onWordDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'match') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    wordDrag.current = { x0: e.clientX, y0: e.clientY, moved: false };
    setHeld({ dx: 0, dy: 0 });
  };
  const onWordMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = wordDrag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
    setHeld({ dx, dy });
    setOver(pictureAt(e.clientX, e.clientY));
  };
  const onWordUp = (e: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const d = wordDrag.current;
    wordDrag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setHeld(null);
    setOver(null);
    if (!d || cancelled) return;
    if (!d.moved) {
      setSelected((s) => !s);
      play('tap');
      return;
    }
    const pic = pictureAt(e.clientX, e.clientY);
    if (pic) tryPicture(pic);
  };

  const tapPicture = (pic: string) => {
    if (phase !== 'match') return;
    if (selected) tryPicture(pic);
    else flash('Drag the word onto its picture!', 1600);
  };

  const tapTile = (i: number) => {
    sayPhoneme(sounds[i]);
    setTapped((t) => ({ i, n: (t?.n ?? 0) + 1 }));
  };

  const sayAgain = () => speak(`${sounds.map((s) => PHONEMES[s] ?? s).join(', ')}. ${word}.`, { force: true });

  const goal =
    message ||
    (phase === 'blend' ? 'Slide the frog to blend the sounds!' : phase === 'match' ? 'Drag the word to its picture!' : '');

  return (
    <div className="sound-it-out">
      <div className="sound-it-out-hud">
        <p className="sound-it-out-goal" aria-live="polite">
          {goal}
        </p>
        <div className="sound-it-out-stats" aria-label={`Word ${index + 1} of ${ROUNDS}, ${score} read on the first try`}>
          <span className="sound-it-out-pill">
            {index + 1}/{ROUNDS}
          </span>
          <span className="sound-it-out-pill">
            <Star size={15} fill="var(--star)" strokeWidth={2} /> {score}
          </span>
        </div>
      </div>

      <div className="sound-it-out-field" key={index}>
        {phase === 'blend' ? (
          <div className="sound-it-out-blend" style={{ '--n': n } as CSSProperties}>
            <div className="sound-it-out-tiles">
              {sounds.map((s, i) => (
                <button
                  key={`${i}-${tapped?.i === i ? tapped.n : 0}`}
                  type="button"
                  className={`sound-it-out-tile${i <= lit ? ' lit' : ''}${tapped?.i === i ? ' tapped' : ''}${s.length > 1 ? ' wide' : ''}`}
                  onClick={() => tapTile(i)}
                  aria-label={`Sound ${i + 1}: ${s}. Tap to hear it.`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="sound-it-out-track" ref={trackRef}>
              <span className="sound-it-out-rail" aria-hidden />
              <span className="sound-it-out-rail-fill" style={{ width: `${progress * 100}%` }} aria-hidden />
              <svg className="sound-it-out-arrow" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
              <div
                className={`sound-it-out-frog${sliding ? ' hopping' : ''}`}
                style={{ left: `${progress * 100}%` }}
                role="button"
                tabIndex={0}
                aria-label="Frog. Drag it along the arrow, or tap it, to blend the sounds."
                onPointerDown={onFrogDown}
                onPointerMove={onFrogMove}
                onPointerUp={onFrogUp}
                onPointerCancel={onFrogUp}
                onKeyDown={onFrogKey}
              >
                <span style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                  🐸
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="sound-it-out-match">
            <div className="sound-it-out-word-row">
              <div
                className={`sound-it-out-word${held ? ' lifted' : ''}${selected ? ' selected' : ''}${phase === 'right' ? ' gone' : ''}`}
                style={{
                  transform: held ? `translate(${held.dx}px, ${held.dy}px) scale(1.06)` : undefined,
                  transition: held ? 'none' : undefined,
                }}
                role="button"
                tabIndex={phase === 'match' ? 0 : -1}
                aria-pressed={selected}
                aria-label={`The word you blended. Drag it to its picture, or tap it and then tap a picture.`}
                onPointerDown={onWordDown}
                onPointerMove={onWordMove}
                onPointerUp={(e) => onWordUp(e)}
                onPointerCancel={(e) => onWordUp(e, true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected((s) => !s);
                  }
                }}
              >
                {word}
              </div>
              <button type="button" className="sound-it-out-say" onClick={sayAgain} aria-label="Hear the sounds and the word again">
                <Volume2 size={20} />
              </button>
            </div>
            <div className="sound-it-out-pictures">
              {round.options.map((o) => {
                const shaking = wrong?.word === o.word ? wrong.n : 0;
                return (
                  <button
                    key={`${o.word}-${shaking}`}
                    type="button"
                    data-pic={o.word}
                    className={`sound-it-out-picture${over === o.word ? ' over' : ''}${shaking ? ' shake' : ''}${right === o.word ? ' right' : ''}${selected ? ' ready' : ''}`}
                    onClick={() => tapPicture(o.word)}
                    aria-label={selected ? 'Put the word on this picture' : 'A picture'}
                  >
                    <span className="sound-it-out-emoji" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                      {o.emoji}
                    </span>
                    {right === o.word && <span className="sound-it-out-label">{word}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'sound-it-out',
  subject: 'reading',
  title: 'Sound It Out',
  blurb: 'Blend the sounds to read the word.',
  howTo: 'Tap the sound tiles to hear them. Slide the frog, or tap it, to blend the word. Then drag the word to its picture, or tap the word and then the picture.',
  color: '#ff6b5b',
  icon: AudioWaveform,
  scoreLabel: 'words read on the first try',
  Play,
};
