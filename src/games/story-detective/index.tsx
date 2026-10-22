import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Lightbulb, Search, Sparkles, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { nextLevel } from '../../lib/memory';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { ROUNDS, makeRound } from './rounds';
import type { Frame, Round } from './rounds';
import './story-detective.css';

interface Drag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/** The first element under a point carrying the given data attribute. */
function dropAt(x: number, y: number, attr: 'sdSentence' | 'sdSlot'): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el instanceof HTMLElement && el.dataset[attr] !== undefined) return Number(el.dataset[attr]);
  }
  return null;
}

/** Shared pointer handling: tap or drag a token, then drop it on a target. */
function useDragToken(onDrop: (id: string, x: number, y: number) => void, onTap: (id: string) => void, onHover: (x: number, y: number) => void) {
  const drag = useRef<Drag | null>(null);
  const [offset, setOffset] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const handlers = (id: string, enabled: boolean) => ({
    onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
      if (!enabled || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
    },
    onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      setOffset({ id: d.id, dx, dy });
      onHover(e.clientX, e.clientY);
    },
    onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      drag.current = null;
      setOffset(null);
      if (d.moved) onDrop(d.id, e.clientX, e.clientY);
      else onTap(d.id);
    },
    onPointerCancel() {
      drag.current = null;
      setOffset(null);
    },
  });
  return { offset, handlers };
}

function Play({ band, onFinish }: GameProps) {
  const [roundNo, setRoundNo] = useState(0);
  const [level, setLevel] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [round, setRound] = useState<Round>(() => makeRound(band, 0));
  const [score, setScore] = useState(0);
  const finished = useRef(false);

  const next = (perfect: boolean) => {
    const nextScore = score + (perfect ? 1 : 0);
    setScore(nextScore);
    if (roundNo + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(nextScore);
      }
      return;
    }
    const step = nextLevel(level, streak, perfect);
    const played = [...recent, round.id];
    setRecent(played);
    setLevel(step.level);
    setStreak(step.streak);
    setRoundNo(roundNo + 1);
    setRound(makeRound(band, step.level, played.slice(-6)));
  };

  return (
    <div className="story-detective">
      <div className="story-detective-hud">
        <p className="story-detective-goal">{round.kind === 'pictures' ? 'Picture story' : 'Find the clue, then answer.'}</p>
        <div className="story-detective-stats">
          <span className="story-detective-pill">
            {Math.min(roundNo + 1, ROUNDS)}/{ROUNDS}
          </span>
          <span className="story-detective-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>
      {round.kind === 'pictures' ? (
        <PictureRound key={`${roundNo}-${round.id}`} round={round} onDone={next} />
      ) : (
        <TextRound key={`${roundNo}-${round.id}`} round={round} onDone={next} />
      )}
    </div>
  );
}

/* ───────────────────────── Bands 1–3: find the clue, then answer ───────────────────────── */

function TextRound({ round, onDone }: { round: Extract<Round, { kind: 'text' }>; onDone: (perfect: boolean) => void }) {
  const { passage, question, choices } = round;
  const [phase, setPhase] = useState<'clue' | 'answer' | 'done'>('clue');
  const [clue, setClue] = useState<number | null>(null);
  const [clueMisses, setClueMisses] = useState(0);
  const [answerMisses, setAnswerMisses] = useState(0);
  const [wrongClue, setWrongClue] = useState<number | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const tryClue = (index: number) => {
    setHover(null);
    setSelected(false);
    if (phase !== 'clue') return;
    if (question.evidence.includes(index)) {
      play('pop');
      setClue(index);
      setPhase('answer');
      setMessage('Great detective work! Now choose the answer.');
      return;
    }
    play('wrong');
    const misses = clueMisses + 1;
    setClueMisses(misses);
    setWrongClue(index);
    timers.current.push(window.setTimeout(() => setWrongClue(null), 600));
    setMessage(misses >= 2 ? 'Here’s how: the glowing sentence holds the clue. Drag the glass onto it.' : `Not that one yet. ${question.look}`);
  };

  const tryAnswer = (choice: string) => {
    if (phase !== 'answer' || wrongAnswers.includes(choice)) return;
    if (choice === question.answer) {
      play('correct');
      setPhase('done');
      setMessage('');
      return;
    }
    play('wrong');
    const misses = answerMisses + 1;
    setAnswerMisses(misses);
    setWrongAnswers([...wrongAnswers, choice]);
    setMessage(misses >= 2 ? `Here’s how: ${question.because}` : 'Not quite. Read the clue sentence again.');
  };

  const { offset, handlers } = useDragToken(
    (_id, x, y) => {
      const i = dropAt(x, y, 'sdSentence');
      if (i !== null) tryClue(i);
      else setHover(null);
    },
    () => {
      play('tap');
      setSelected((v) => !v);
      setMessage('Now tap the sentence that proves the answer.');
    },
    (x, y) => setHover(dropAt(x, y, 'sdSentence')),
  );

  const showClue = phase === 'clue' && clueMisses >= 2;
  const showAnswer = phase === 'answer' && answerMisses >= 2;
  const glassStyle = offset ? ({ transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.08)` } as CSSProperties) : undefined;

  return (
    <div className="story-detective-text">
      <div className="story-detective-question">
        <span className="story-detective-q">{question.ask}</span>
        <button type="button" className="story-detective-say" onClick={() => speak(question.ask, { force: true })} aria-label="Hear the question" title="Hear it">
          <Volume2 size={16} />
        </button>
      </div>

      <div className="story-detective-passage">
        <button
          type="button"
          className="story-detective-say corner"
          onClick={() => speak(passage.sentences.join(' '), { force: true })}
          aria-label="Hear the story"
          title="Hear the story"
        >
          <Volume2 size={16} />
        </button>
        {passage.sentences.map((sentence, i) => {
          const isClue = clue === i;
          const glow = showClue && question.evidence[0] === i;
          return (
            <button
              key={i}
              type="button"
              data-sd-sentence={phase === 'clue' ? i : undefined}
              className={`story-detective-sentence${isClue ? ' clue' : ''}${hover === i ? ' hover' : ''}${wrongClue === i ? ' wrong' : ''}${glow ? ' show-me' : ''}${selected ? ' ready' : ''}`}
              onClick={() => {
                if (phase !== 'clue') return;
                if (selected) tryClue(i);
                else setMessage('Drag the magnifying glass onto a sentence (or tap the glass first).');
              }}
            >
              {isClue && <Search size={16} className="story-detective-mark" aria-hidden />}
              {sentence}
            </button>
          );
        })}
      </div>

      {phase === 'clue' && (
        <div className="story-detective-tray">
          <button
            type="button"
            className={`story-detective-glass${offset ? ' dragging' : ''}${selected ? ' selected' : ''}`}
            style={glassStyle}
            aria-label="Magnifying glass. Drag it onto the sentence that proves the answer."
            aria-pressed={selected}
            {...handlers('glass', true)}
            onClick={(e) => {
              if (e.detail === 0) {
                setSelected((v) => !v);
                setMessage('Now choose the sentence that proves the answer.');
              }
            }}
          >
            <Search size={34} strokeWidth={2.6} />
          </button>
          <span className="story-detective-tray-label">Drag the magnifying glass to the sentence that tells you.</span>
        </div>
      )}

      {phase !== 'clue' && (
        <div className="story-detective-choices">
          {choices.map((c) => {
            const isAnswer = c === question.answer;
            const state = phase === 'done' && isAnswer ? ' right' : wrongAnswers.includes(c) ? ' wrong' : showAnswer && isAnswer ? ' show-me' : '';
            return (
              <button key={c} type="button" className={`story-detective-choice${state}`} onClick={() => tryAnswer(c)} disabled={phase === 'done' || wrongAnswers.includes(c)}>
                {c}
              </button>
            );
          })}
        </div>
      )}

      <div className="story-detective-feedback" role="status">
        {phase === 'done' ? (
          <>
            <Sparkles size={18} />
            <span>{question.because}</span>
          </>
        ) : message ? (
          <>
            <Lightbulb size={18} />
            <span>{message}</span>
          </>
        ) : null}
      </div>

      {phase === 'done' && (
        <div className="story-detective-next">
          <button type="button" className="btn primary" onClick={() => onDone(clueMisses === 0 && answerMisses === 0)} autoFocus>
            Next <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Band 0: picture stories ───────────────────────── */

function FramePicture({ frame, big = false }: { frame: Frame; big?: boolean }) {
  return (
    <span className={`story-detective-scene${big ? ' big' : ''}`} style={{ fontFamily: EMOJI_FONT }} aria-hidden>
      {frame.scene.join('')}
    </span>
  );
}

function PictureRound({ round, onDone }: { round: Extract<Round, { kind: 'pictures' }>; onDone: (perfect: boolean) => void }) {
  const { story } = round;
  const [slots, setSlots] = useState<(number | null)[]>(() => [round.prefilled ? 0 : null, null, null]);
  const [phase, setPhase] = useState<'order' | 'question' | 'done'>('order');
  const [orderMisses, setOrderMisses] = useState(0);
  const [tapMisses, setTapMisses] = useState(0);
  const [shake, setShake] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [wrongTaps, setWrongTaps] = useState<string[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const place = (frame: number, slot: number) => {
    setHover(null);
    if (phase !== 'order' || slots[slot] !== null || slots.includes(frame)) return;
    if (frame === slot) {
      play('pop');
      const next = slots.map((v, i) => (i === slot ? frame : v));
      setSlots(next);
      setMessage('');
      if (next.every((v) => v !== null)) {
        later(() => {
          setPhase('question');
          setMessage('');
        }, 600);
      }
      return;
    }
    play('wrong');
    const misses = orderMisses + 1;
    setOrderMisses(misses);
    setShake(`f${frame}`);
    later(() => setShake(null), 450);
    setMessage(misses >= 2 ? 'Here’s how: the glowing picture comes next.' : 'What happens first? Tap 🔊 on a picture to hear it.');
  };

  const firstEmpty = slots.findIndex((v) => v === null);
  const { offset, handlers } = useDragToken(
    (id, x, y) => {
      const slot = dropAt(x, y, 'sdSlot');
      if (slot !== null) place(Number(id), slot);
      else setHover(null);
    },
    (id) => {
      if (firstEmpty >= 0) place(Number(id), firstEmpty);
    },
    (x, y) => setHover(dropAt(x, y, 'sdSlot')),
  );

  const tap = (item: string) => {
    if (phase !== 'question' || wrongTaps.includes(item)) return;
    if (item === story.question.answer) {
      play('correct');
      setPhase('done');
      setMessage('');
      return;
    }
    play('wrong');
    const misses = tapMisses + 1;
    setTapMisses(misses);
    setWrongTaps([...wrongTaps, item]);
    setShake(item);
    later(() => setShake(null), 450);
    setMessage(misses >= 2 ? `Here’s how: it’s ${story.question.name}. Tap the glowing one.` : 'Look again! Tap 🔊 to hear the question.');
  };

  const pile = round.order.filter((f) => !slots.includes(f));
  const showOrder = phase === 'order' && orderMisses >= 2 ? firstEmpty : -1;
  const target = story.frames[story.question.frame];

  return (
    <div className="story-detective-pictures">
      <p className="story-detective-sub">
        {phase === 'order' ? 'Put the story in order: what happens first, next and last?' : phase === 'question' ? story.question.ask : 'You found it!'}
        {phase !== 'order' && (
          <button
            type="button"
            className="story-detective-say"
            onClick={() => speak(story.question.ask, { force: true })}
            aria-label="Hear the question"
            title="Hear it"
          >
            <Volume2 size={16} />
          </button>
        )}
      </p>

      <div className="story-detective-slots">
        {slots.map((f, i) => (
          <div
            key={i}
            data-sd-slot={f === null ? i : undefined}
            className={`story-detective-slot${f !== null ? ' filled' : ''}${hover === i ? ' hover' : ''}${phase !== 'order' && i === story.question.frame ? ' focus' : ''}`}
          >
            <span className="story-detective-num">{i + 1}</span>
            {f !== null && (
              <>
                <FramePicture frame={story.frames[f]} />
                <button
                  type="button"
                  className="story-detective-say caption"
                  onClick={() => speak(story.frames[f].caption, { force: true })}
                  aria-label={`Hear: ${story.frames[f].caption}`}
                  title="Hear it"
                >
                  <Volume2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {phase !== 'order' && (
        <div className="story-detective-zoom" aria-label={`Picture ${story.question.frame + 1}: tap your answer`} style={{ fontFamily: EMOJI_FONT }}>
          {target.scene.map((item) => {
            const state =
              phase === 'done' && item === story.question.answer
                ? ' right'
                : wrongTaps.includes(item)
                  ? ' wrong'
                  : tapMisses >= 2 && item === story.question.answer
                    ? ' show-me'
                    : '';
            return (
              <button
                key={item}
                type="button"
                className={`story-detective-item${state}${shake === item ? ' shake' : ''}`}
                onClick={() => tap(item)}
                disabled={phase === 'done'}
                aria-label={item === story.question.answer && phase === 'done' ? story.question.name : 'part of the picture'}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}

      {phase === 'order' && (
        <div className="story-detective-pile">
          {pile.map((f) => {
            const moving = offset?.id === String(f);
            const glow = showOrder >= 0 && f === showOrder;
            return (
              <span key={f} className="story-detective-card-wrap">
                <button
                  type="button"
                  className={`story-detective-card${moving ? ' dragging' : ''}${shake === `f${f}` ? ' shake' : ''}${glow ? ' show-me' : ''}`}
                  style={moving ? { transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.05)` } : undefined}
                  aria-label={`Picture: ${story.frames[f].caption}`}
                  {...handlers(String(f), true)}
                  onClick={(e) => {
                    if (e.detail === 0 && firstEmpty >= 0) place(f, firstEmpty);
                  }}
                >
                  <FramePicture frame={story.frames[f]} />
                </button>
                <button
                  type="button"
                  className="story-detective-say caption"
                  onClick={() => speak(story.frames[f].caption, { force: true })}
                  aria-label={`Hear: ${story.frames[f].caption}`}
                  title="Hear it"
                >
                  <Volume2 size={14} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="story-detective-feedback" role="status">
        {phase === 'done' ? (
          <>
            <Sparkles size={18} />
            <span>Yes! It’s {story.question.name}.</span>
          </>
        ) : message ? (
          <>
            <Lightbulb size={18} />
            <span>{message}</span>
          </>
        ) : null}
      </div>

      {phase === 'done' && (
        <div className="story-detective-next">
          <button type="button" className="btn primary" onClick={() => onDone(orderMisses === 0 && tapMisses === 0)} autoFocus>
            Next <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export const game: Game = {
  id: 'story-detective',
  subject: 'reading',
  title: 'Story Detective',
  blurb: 'Find the clue in the story, then answer.',
  howTo: 'Read the story. Drag the magnifying glass onto the sentence that proves the answer, then pick the answer.',
  howToByBand: [
    'Put the three pictures in story order: first, next, last. Drag each picture to a space, or tap a picture and then a space. Then tap the answer inside the big picture.',
    'Read or listen to the story and question. Tap the magnifying glass, then tap the sentence with the clue, or drag the glass there. Choose the answer and press Next.',
    'Read the story and question. Mark the sentence that gives the clue with the magnifying glass, then choose your answer. You can tap the glass and then the sentence.',
    'Read the story and look for evidence. Use the magnifying glass to mark the sentence supporting your answer, then choose your answer and press Next.',
  ],
  color: '#8b5cf6',
  icon: Search,
  scoreLabel: 'cases solved first time',
  Play,
};
