import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { ReadAloud } from '../shared/ReadAloud';
import './memory-match.css';

type Face = { kind: 'num'; text: string } | { kind: 'dots'; n: number } | { kind: 'frac'; top: number; bottom: number };

interface Card {
  pair: number;
  face: Face;
  /** Accessible / spoken name once flipped. */
  label: string;
}

const GOALS = [
  'Match each number to its dots',
  'Match each sum to its answer',
  'Match each times fact to its answer',
  'Match fractions to decimals and percents',
];

const SAY = ['Find the number that matches the dots!', 'Find each sum and its answer!'];

const FRACTIONS: [number, number, number][] = [
  // top, bottom, value in hundredths
  [1, 2, 50],
  [1, 4, 25],
  [3, 4, 75],
  [1, 5, 20],
  [2, 5, 40],
  [3, 5, 60],
  [4, 5, 80],
  [1, 10, 10],
  [3, 10, 30],
  [7, 10, 70],
  [9, 10, 90],
];

const num = (text: string | number): Face => ({ kind: 'num', text: String(text) });

/** Build a shuffled deck of matching pairs for the age band. */
function buildDeck(band: Band): Card[] {
  const cards: Card[] = [];
  if (band === 0) {
    [1, 2, 3, 4, 5, 6].forEach((n, pair) => {
      cards.push({ pair, face: num(n), label: String(n) }, { pair, face: { kind: 'dots', n }, label: `${n} dots` });
    });
  } else if (band === 1) {
    const totals = shuffle(Array.from({ length: 13 }, (_, i) => i + 3)).slice(0, 8);
    totals.forEach((total, pair) => {
      const a = rand(Math.max(1, total - 9), Math.min(9, total - 1));
      cards.push({ pair, face: num(`${a} + ${total - a}`), label: `${a} plus ${total - a}` }, { pair, face: num(total), label: String(total) });
    });
  } else if (band === 2) {
    const used = new Set<number>();
    let pair = 0;
    while (pair < 8) {
      const a = rand(2, 9);
      const b = rand(2, 9);
      if (used.has(a * b)) continue;
      used.add(a * b);
      cards.push({ pair, face: num(`${a} × ${b}`), label: `${a} times ${b}` }, { pair, face: num(a * b), label: String(a * b) });
      pair++;
    }
  } else {
    shuffle(FRACTIONS)
      .slice(0, 8)
      .forEach(([top, bottom, hundredths], pair) => {
        const asPercent = Math.random() < 0.5;
        const other = asPercent ? `${hundredths}%` : String(hundredths / 100);
        cards.push({ pair, face: { kind: 'frac', top, bottom }, label: `${top} over ${bottom}` }, { pair, face: num(other), label: other });
      });
  }
  return shuffle(cards);
}

const DOT_SPOTS: Record<number, [number, number][]> = {
  1: [[30, 30]],
  2: [[18, 18], [42, 42]],
  3: [[16, 16], [30, 30], [44, 44]],
  4: [[18, 18], [42, 18], [18, 42], [42, 42]],
  5: [[16, 16], [44, 16], [30, 30], [16, 44], [44, 44]],
  6: [[18, 14], [42, 14], [18, 30], [42, 30], [18, 46], [42, 46]],
};

function FaceView({ face, size }: { face: Face; size: number }) {
  if (face.kind === 'dots') {
    return (
      <svg viewBox="0 0 60 60" width={size * 0.62} height={size * 0.62} aria-hidden>
        {DOT_SPOTS[face.n].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={6.5} fill="#1e2b4a" />
        ))}
      </svg>
    );
  }
  if (face.kind === 'frac') {
    return (
      <span className="memory-match-frac" style={{ fontSize: size * 0.27 }} aria-hidden>
        <span>{face.top}</span>
        <span className="memory-match-frac-bar" />
        <span>{face.bottom}</span>
      </span>
    );
  }
  const scale = face.text.length <= 2 ? 0.42 : face.text.length <= 4 ? 0.3 : 0.22;
  return (
    <span className="memory-match-text" style={{ fontSize: size * scale }} aria-hidden>
      {face.text}
    </span>
  );
}

/** Pick the column count (one that fills every row) that makes the biggest cards in the space available. */
function layout(count: number, w: number, h: number, gap: number) {
  let best = { cols: 4, size: 0 };
  for (const cols of [3, 4, 6, 8].filter((c) => count % c === 0)) {
    const rows = Math.ceil(count / cols);
    const size = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows);
    if (size > best.size + 4) best = { cols, size };
  }
  return { cols: best.cols, size: Math.max(56, Math.floor(Math.min(best.size, 190))) };
}

function Play({ band, onFinish }: GameProps) {
  const [deck] = useState(() => buildDeck(band));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [justMatched, setJustMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [board, setBoard] = useState({ w: 0, h: 0 });
  const boardRef = useRef<HTMLDivElement>(null);
  const locked = useRef(false);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);
  const pairs = deck.length / 2;
  const found = matched.length / 2;

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoard({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    speak(SAY[band] ?? GOALS[band]);
  }, [band]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const flip = (i: number) => {
    if (locked.current || finished.current || open.includes(i) || matched.includes(i)) return;
    play('tap');
    if (open.length === 0) {
      setOpen([i]);
      return;
    }
    const j = open[0];
    const newMoves = moves + 1;
    setMoves(newMoves);
    if (deck[i].pair === deck[j].pair) {
      const nowMatched = [...matched, i, j];
      setMatched(nowMatched);
      setJustMatched([i, j]);
      setOpen([]);
      play('correct');
      if (nowMatched.length === deck.length) {
        finished.current = true;
        const score = Math.max(pairs * 2, pairs * 10 - (newMoves - pairs) * 2);
        later(() => onFinish(score), 900);
      }
      return;
    }
    setOpen([j, i]);
    locked.current = true;
    later(() => {
      setOpen([]);
      locked.current = false;
    }, 900);
  };

  const gap = board.w < 500 ? 8 : 14;
  const { cols, size } = layout(deck.length, board.w, board.h, gap);

  return (
    <div className="memory-match">
      <div className="memory-match-hud">
        <div className="memory-match-goal">{GOALS[band]} <ReadAloud text={GOALS[band]} /></div>
        <div className="memory-match-chips">
          <span className="memory-match-chip" aria-label={`${found} of ${pairs} pairs found`}>
            Pairs {found}/{pairs}
          </span>
          <span className="memory-match-chip" aria-label={`${moves} moves`}>
            Moves {moves}
          </span>
        </div>
      </div>
      <div className="memory-match-board" ref={boardRef}>
        {board.w > 0 && (
          <div
            className="memory-match-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)`, gridAutoRows: `${size}px`, gap }}
          >
            {deck.map((card, i) => {
              const isMatched = matched.includes(i);
              const faceUp = isMatched || open.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  className={`memory-match-card${faceUp ? ' up' : ''}${isMatched ? ' matched' : ''}${justMatched.includes(i) ? ' pop' : ''}`}
                  onClick={() => flip(i)}
                  aria-label={faceUp ? card.label : `Card ${i + 1}, face down`}
                  aria-pressed={faceUp}
                  disabled={isMatched}
                >
                  <span className="memory-match-inner">
                    <span className="memory-match-back" style={{ fontSize: size * 0.4 }} aria-hidden>
                      ?
                    </span>
                    <span className="memory-match-front">
                      <FaceView face={card.face} size={size} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'memory-match',
  title: 'Memory Match',
  blurb: 'Flip cards and find the matching pairs.',
  howTo: 'Tap two cards to flip them. If they match, they stay up. Find all the pairs!',
  howToByBand: [
    'Tap two cards to turn them over. Match a number with that many dots. Remember where they are and find every pair.',
    'Tap two cards to turn them over. Match each sum with its answer, like 2 + 3 and 5. Find every pair.',
    'Tap two cards to turn them over. Match each multiplication with its answer, like 3 × 4 and 12. Find every pair.',
    'Tap two cards to turn them over. Match equal amounts: a fraction and its decimal or percentage, like 1/2 and 50%. Find every pair.',
  ],
  color: '#8b5cf6',
  icon: Layers,
  scoreLabel: 'points',
  Play,
};
