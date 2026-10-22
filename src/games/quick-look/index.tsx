import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Eye, Star } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { ARRAY_GRID, buildCells, explain, flashMs, isExact, makeRounds, pickPraise, ROUNDS } from './rounds';
import type { Build, LookRound } from './rounds';
import { play } from '../../lib/sound';
import { ReadAloud } from '../shared/ReadAloud';
import './quick-look.css';

type Phase = 'ready' | 'look' | 'build' | 'reveal';

const emptyBuild = (): Build => ({ cells: new Set(), array: null });

/** Read a cell index from whatever is under a screen point. */
function cellAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const cell = el?.closest<HTMLElement>('[data-cell]');
  return cell ? Number(cell.dataset.cell) : null;
}

/** The flashed pattern: a dice face, ten-frames, or an array of dots. */
function Pattern({ round }: { round: LookRound }) {
  if (round.kind === 'dice') {
    return (
      <div className="quick-look-dice" aria-label={`${round.n} dots`}>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="quick-look-pip-slot">
            {round.dots.includes(i) && <span className="quick-look-dot" />}
          </span>
        ))}
      </div>
    );
  }
  if (round.kind === 'frame') {
    return (
      <div className="quick-look-frames" aria-label={`${round.n} counters`}>
        {Array.from({ length: round.frames }, (_, f) => (
          <div key={f} className="quick-look-frame ten">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="quick-look-cell">
                {f * 10 + i < round.n && <span className="quick-look-dot" />}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="quick-look-array" style={{ gridTemplateColumns: `repeat(${round.cols}, 1fr)` }} aria-label={`${round.rows} rows of ${round.cols}`}>
      {Array.from({ length: round.rows * round.cols }, (_, i) => (
        <span key={i} className="quick-look-dot" />
      ))}
    </div>
  );
}

/** What the child builds: tap or drag to fill frame cells, or to size an array. */
function Builder({
  band,
  build,
  onChange,
  readOnly = false,
}: {
  band: Band;
  build: Build;
  /** Receives an updater so quick drags across many cells never lose a cell. */
  onChange?: (update: (b: Build) => Build) => void;
  readOnly?: boolean;
}) {
  const paint = useRef<{ value: boolean } | null>(null);

  const applyCell = (i: number, value: boolean) => {
    if (!onChange || readOnly) return;
    if (band === 3) {
      const array = { rows: Math.floor(i / ARRAY_GRID.cols) + 1, cols: (i % ARRAY_GRID.cols) + 1 };
      onChange((b) => (b.array?.rows === array.rows && b.array.cols === array.cols ? b : { ...b, array }));
      return;
    }
    onChange((b) => {
      if (b.cells.has(i) === value) return b;
      const cells = new Set(b.cells);
      if (value) cells.add(i);
      else cells.delete(i);
      return { ...b, cells };
    });
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const value = band === 3 ? true : !build.cells.has(i);
    paint.current = { value };
    play('tap');
    applyCell(i, value);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!paint.current) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i !== null) applyCell(i, paint.current.value);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    paint.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onCellKey = (e: ReactKeyboardEvent, i: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    applyCell(i, !build.cells.has(i));
  };

  const handlers = readOnly ? {} : { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  if (band === 3) {
    const { rows, cols } = ARRAY_GRID;
    const a = build.array;
    return (
      <div className={`quick-look-builder${readOnly ? ' read-only' : ''}`}>
        <div className="quick-look-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} {...handlers}>
          {Array.from({ length: rows * cols }, (_, i) => {
            const on = !!a && Math.floor(i / cols) < a.rows && i % cols < a.cols;
            return (
              <span
                key={i}
                data-cell={i}
                className={`quick-look-grid-cell${on ? ' on' : ''}`}
                role={readOnly ? undefined : 'button'}
                tabIndex={!readOnly && onChange ? 0 : -1}
                onKeyDown={(e) => onCellKey(e, i)}
                aria-label={readOnly ? undefined : `${Math.floor(i / cols) + 1} rows of ${(i % cols) + 1}`}
              >
                {on && <span className="quick-look-dot" />}
              </span>
            );
          })}
        </div>
        <p className="quick-look-size">{a ? `${a.rows} rows of ${a.cols}` : 'Tap to make rows and columns'}</p>
      </div>
    );
  }

  const total = buildCells(band);
  const frames = band === 0 ? 1 : total / 10;
  return (
    <div className={`quick-look-builder${readOnly ? ' read-only' : ''}`}>
      <div className="quick-look-frames" {...handlers}>
        {Array.from({ length: frames }, (_, f) => (
          <div key={f} className={`quick-look-frame${band === 0 ? ' five' : ' ten'}`}>
            {Array.from({ length: band === 0 ? 5 : 10 }, (_, j) => {
              const i = f * 10 + j;
              const on = build.cells.has(i);
              return (
                <span
                  key={i}
                  data-cell={i}
                  className={`quick-look-cell${readOnly ? '' : ' tappable'}`}
                  role={readOnly ? undefined : 'button'}
                  tabIndex={!readOnly && onChange ? 0 : -1}
                  onKeyDown={(e) => onCellKey(e, i)}
                  aria-pressed={readOnly ? undefined : on}
                  aria-label={readOnly ? undefined : `Space ${i + 1}`}
                >
                  {on && <span className="quick-look-dot placed" />}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Play({ band, onFinish }: GameProps) {
  const [rounds] = useState(() => makeRounds(band));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [build, setBuild] = useState<Build>(emptyBuild);
  const [peeked, setPeeked] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<{ exact: boolean; praise: string } | null>(null);

  const scoreRef = useRef(0);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  const round = rounds[index];

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Each round: a short pause, the quick look, then build.
  useEffect(() => {
    setPhase('ready');
    const t1 = window.setTimeout(() => setPhase('look'), 700);
    const t2 = window.setTimeout(() => setPhase('build'), 700 + flashMs(band));
    timers.current.push(t1, t2);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [index, band]);

  const peek = () => {
    if (phase !== 'build' || peeking) return;
    setPeeked(true);
    setPeeking(true);
    later(() => setPeeking(false), 1000);
  };

  const check = () => {
    if (phase !== 'build') return;
    const exact = isExact(round, build);
    const first = exact && !peeked;
    if (first) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    play(exact ? 'correct' : 'wrong');
    setResult({ exact, praise: pickPraise() });
    setPeeking(false);
    setPhase('reveal');
  };

  const next = () => {
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(scoreRef.current);
      }
      return;
    }
    setIndex(index + 1);
    setPhase('ready');
    setBuild(emptyBuild());
    setPeeked(false);
    setPeeking(false);
    setResult(null);
  };

  const built = band === 3 ? build.array !== null : build.cells.size > 0;
  const madeAmount = band === 3 ? (build.array ? build.array.rows * build.array.cols : 0) : build.cells.size;

  const goal =
    phase === 'ready'
      ? 'Get ready to look…'
      : phase === 'look'
        ? 'Look!'
        : phase === 'build'
          ? band === 3
            ? 'Make the array you saw.'
            : 'Make what you saw.'
          : result?.exact
            ? result.praise
            : 'Nearly! Look again.';

  return (
    <div className="quick-look">
      <div className="quick-look-hud">
        <p className="quick-look-goal" aria-live="polite">
          {goal}
          <ReadAloud text={goal} />
        </p>
        <div className="quick-look-stats" aria-label={`Round ${index + 1} of ${ROUNDS}, ${score} exactly right`}>
          <span className="quick-look-pill">
            {index + 1}/{ROUNDS}
          </span>
          <span className="quick-look-pill">
            <Star size={15} fill="var(--star)" strokeWidth={2} /> {score}
          </span>
        </div>
      </div>

      <div className="quick-look-field" key={index}>
        {phase === 'reveal' ? (
          <>
            <div className="quick-look-compare">
              <figure>
                <figcaption>You saw</figcaption>
                <div className="quick-look-card">
                  <Pattern round={round} />
                </div>
              </figure>
              <figure>
                <figcaption>You made</figcaption>
                <div className={`quick-look-card${result?.exact ? ' right' : ' off'}`}>
                  <Builder band={band} build={build} readOnly />
                </div>
              </figure>
            </div>
            <p className="quick-look-explain">
              {explain(round)}
              {!result?.exact && ` You made ${madeAmount}.`}
            </p>
            <button type="button" className="btn primary big" onClick={next} autoFocus>
              {index + 1 >= ROUNDS ? 'Finish' : 'Next'}
            </button>
          </>
        ) : (
          <>
            <div className={`quick-look-card quick-look-stage${phase === 'look' || peeking ? ' showing' : ''}`}>
              {phase === 'look' || peeking ? (
                <Pattern round={round} />
              ) : (
                <div className="quick-look-cover" aria-hidden>
                  <Eye size={44} strokeWidth={1.6} />
                </div>
              )}
            </div>
            <div className={`quick-look-build-area${phase === 'build' ? '' : ' waiting'}`}>
              <Builder band={band} build={build} onChange={phase === 'build' ? setBuild : undefined} />
              <div className="btn-row">
                <button type="button" className="btn" onClick={peek} disabled={phase !== 'build' || peeking}>
                  <Eye size={18} /> Peek again
                </button>
                <button type="button" className="btn primary" onClick={check} disabled={phase !== 'build' || !built}>
                  Check
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'quick-look',
  subject: 'math',
  title: 'Quick Look',
  blurb: 'See it fast, then build it.',
  howTo: 'Dots flash for a moment. Look carefully, then tap the spaces to make what you saw, and press Check.',
  howToByBand: [
    'Look at the dots before they hide. Tap spaces to make the same number of dots, then press Check. Tap a dot to take it away, or Peek again for another look.',
    'Look at the counters before they hide. Tap spaces to make the same number, then press Check. Tap a counter to take it away, or Peek again for another look.',
    'Look at the ten-frames before they hide. Build the same number of counters and press Check. Use Peek again if you need another look.',
    'Look at the rows and columns before they hide. Tap the bottom-right space of your array to make the same rows and columns, then press Check. Use Peek again for help.',
  ],
  color: '#14b8a6',
  icon: Eye,
  scoreLabel: 'patterns rebuilt exactly',
  Play,
};
