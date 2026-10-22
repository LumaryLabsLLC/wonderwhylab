import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Cookie, Star, Volume2 } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Thing } from '../../visuals/Thing';
import './feed-monster.css';

const ROUNDS = 8;

export type PieceKind = 'cookie' | 'bag' | 'slice';

/** One order from the monster. The child builds it by moving pieces from the food source onto the plate. */
export interface Round {
  /** What the monster says, e.g. "I want 4 cookies!" */
  ask: string;
  kind: PieceKind;
  /** Pieces already on the plate that can't be moved (band 1: the cookies the monster "has"). */
  fixed: number;
  /** Pieces available in the food source. */
  supply: number;
  /** Pieces the child must add to the plate. */
  need: number;
  /** Value of one piece: 1 cookie, the number of cookies in a bag, or 1 slice. */
  unit: number;
  /** Slices in a whole pizza (band 3), otherwise 1. */
  den: number;
  /** The number the monster asked for (count, total, product, or fraction value). */
  target: number;
}

export function makeRound(band: Band): Round {
  switch (band) {
    case 0: {
      const need = rand(2, 8);
      return { ask: `I want ${need} cookies!`, kind: 'cookie', fixed: 0, supply: 10, need, unit: 1, den: 1, target: need };
    }
    case 1: {
      const fixed = rand(2, 8);
      const need = 10 - fixed;
      return {
        ask: `I have ${fixed}. Make 10!`,
        kind: 'cookie',
        fixed,
        supply: Math.min(10, need + rand(2, 3)),
        need,
        unit: 1,
        den: 1,
        target: 10,
      };
    }
    case 2: {
      const unit = rand(2, 9);
      const need = rand(2, 6);
      return {
        ask: `Make ${unit * need} with bags of ${unit}!`,
        kind: 'bag',
        fixed: 0,
        supply: Math.min(9, need + rand(1, 3)),
        need,
        unit,
        den: 1,
        target: unit * need,
      };
    }
    case 3: {
      const den = pick([2, 3, 4, 5, 6, 8, 10]);
      const need = rand(1, den - 1);
      const value = need / den;
      let amount = `${need}/${den}`;
      if (den === 10 && Math.random() < 0.6) amount = `0.${need}`;
      else if ([2, 4, 5, 10].includes(den) && Math.random() < 0.35) amount = `${Math.round(value * 100)}%`;
      return { ask: `I want ${amount} of a pizza!`, kind: 'slice', fixed: 0, supply: den, need, unit: 1, den, target: value };
    }
  }
}

/** The live sum / product / fraction shown under the plate. */
function readout(round: Round, k: number): string {
  switch (round.kind) {
    case 'cookie':
      return round.fixed ? `${round.fixed} + ${k} = ${round.fixed + k}` : String(k);
    case 'bag':
      return `${round.unit} × ${k} = ${round.unit * k}`;
    case 'slice': {
      const v = k / round.den;
      const exact = Math.abs(Math.round(v * 100) / 100 - v) < 1e-9;
      return `${k}/${round.den} ${exact ? '=' : '≈'} ${Number(v.toFixed(2))}`;
    }
  }
}

function tooMany(kind: PieceKind) {
  return kind === 'bag' ? 'Too many bags!' : kind === 'slice' ? 'Too much pizza!' : 'Too many!';
}

function notEnough(kind: PieceKind) {
  return kind === 'bag' ? 'Not enough bags!' : kind === 'slice' ? 'Not enough pizza!' : 'Not enough!';
}

/* ───────── Pictures ───────── */

const FIXED_COOKIE = '#ff9f91';
const ADDED_COOKIE = '#9cc7ff';

function CookieArt({ color }: { color?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" aria-hidden>
      <Thing kind="cookie" size={92} color={color} />
    </svg>
  );
}

function BagArt({ unit }: { unit: number }) {
  return (
    <svg viewBox="0 0 64 72" aria-hidden>
      <path d="M10 18 L54 18 L58 66 Q58 70 54 70 L10 70 Q6 70 6 66 Z" fill="#ffcf8a" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M10 18 L16 6 L48 6 L54 18" fill="#ffe2b3" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M20 12 Q32 18 44 12" fill="none" stroke="#1e2b4a" strokeWidth={2} strokeLinecap="round" />
      <circle cx={32} cy={44} r={16} fill="white" stroke="#1e2b4a" strokeWidth={2.5} />
      <text x={32} y={45} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill="#1e2b4a" fontFamily="Fredoka, sans-serif">
        {unit}
      </text>
    </svg>
  );
}

const PIZZA_R = 100;

function wedgePath(i: number, den: number, r = PIZZA_R) {
  const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / den;
  const a1 = a0 + (2 * Math.PI) / den;
  const [x0, y0] = [Math.cos(a0) * r, Math.sin(a0) * r];
  const [x1, y1] = [Math.cos(a1) * r, Math.sin(a1) * r];
  if (den === 1) return `M0,${-r} A${r},${r} 0 1 1 0,${r} A${r},${r} 0 1 1 0,${-r} Z`;
  return `M0,0 L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${den <= 2 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

/** A pizza slice in "slot" i of a pizza cut into `den` pieces (drawn around 0,0). */
function Slice({ i, den }: { i: number; den: number }) {
  const mid = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / den;
  const dots = den <= 4 ? [0.38, 0.68] : [0.62];
  return (
    <g>
      <path d={wedgePath(i, den)} fill="#e7a95b" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={wedgePath(i, den, PIZZA_R - 12)} fill="#ffd45c" stroke="none" />
      {dots.map((d) => (
        <circle key={d} cx={Math.cos(mid) * PIZZA_R * d} cy={Math.sin(mid) * PIZZA_R * d} r={den >= 8 ? 6 : 8} fill="#e8604c" />
      ))}
      <path d={wedgePath(i, den)} fill="none" stroke="#1e2b4a" strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  );
}

type Mood = 'idle' | 'open' | 'chomp' | 'no';

function Monster({ mood }: { mood: Mood }) {
  const open = mood === 'open';
  return (
    <svg className={`feed-monster-art is-${mood}`} viewBox="0 0 240 230" aria-hidden>
      <ellipse cx={120} cy={218} rx={78} ry={9} fill="#1e2b4a" opacity={0.12} />
      <g className="feed-monster-body">
        <ellipse cx={82} cy={204} rx={22} ry={12} fill="#2aa866" stroke="#1e2b4a" strokeWidth={3} />
        <ellipse cx={158} cy={204} rx={22} ry={12} fill="#2aa866" stroke="#1e2b4a" strokeWidth={3} />
        <path d="M70 46 L60 14 L92 36 Z" fill="#2aa866" stroke="#1e2b4a" strokeWidth={3} strokeLinejoin="round" />
        <path d="M170 46 L180 14 L148 36 Z" fill="#2aa866" stroke="#1e2b4a" strokeWidth={3} strokeLinejoin="round" />
        <circle cx={120} cy={118} r={92} fill="#34c47c" stroke="#1e2b4a" strokeWidth={3.5} />
        <ellipse cx={120} cy={150} rx={56} ry={40} fill="#5fd598" opacity={0.6} />
        {[88, 152].map((x) => (
          <g key={x}>
            <circle cx={x} cy={88} r={21} fill="white" stroke="#1e2b4a" strokeWidth={3} />
            <circle cx={x} cy={94} r={9} fill="#1e2b4a" />
            <circle cx={x - 3} cy={90} r={3} fill="white" />
            <ellipse className="feed-monster-lid" cx={x} cy={88} rx={23} ry={23} fill="#34c47c" stroke="#1e2b4a" strokeWidth={3} />
          </g>
        ))}
        <ellipse cx={64} cy={126} rx={11} ry={7} fill="#ff8fb0" opacity={0.7} />
        <ellipse cx={176} cy={126} rx={11} ry={7} fill="#ff8fb0" opacity={0.7} />
        <g className={`feed-monster-mouth-open${open ? ' show' : ''}`}>
          <ellipse cx={120} cy={150} rx={40} ry={30} fill="#5a1f2e" stroke="#1e2b4a" strokeWidth={3} />
          <path d="M92 150 L100 136 L108 150 Z M132 150 L140 136 L148 150 Z" fill="white" transform="translate(0 -12)" />
          <ellipse cx={120} cy={166} rx={20} ry={10} fill="#ff6b8b" />
        </g>
        <g className={`feed-monster-mouth-closed${open ? '' : ' show'}`}>
          <path d="M88 142 Q120 172 152 142" fill="none" stroke="#1e2b4a" strokeWidth={4} strokeLinecap="round" />
          <path d="M108 150 L112 158 L116 151" fill="white" stroke="#1e2b4a" strokeWidth={2} strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}

/* ───────── Dragging ───────── */

type DragFrom = 'source' | 'placed' | 'plate';

interface Press {
  from: DragFrom;
  slot: number;
  startX: number;
  startY: number;
  /** Rectangle the ghost copies (the piece, or the whole pizza for slices). */
  rect: DOMRect;
  moved: boolean;
}

interface Ghost {
  from: DragFrom;
  slot: number;
  x: number;
  y: number;
  offX: number;
  offY: number;
  w: number;
  h: number;
}

const DRAG_START = 6;

function inside(el: Element | null, x: number, y: number, pad = 0) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

/* ───────── Game ───────── */

function Play({ band, onFinish }: GameProps) {
  const [roundNo, setRoundNo] = useState(0);
  const [round, setRound] = useState(() => makeRound(band));
  /** Source slots now on the plate, in the order they were added. */
  const [placed, setPlaced] = useState<number[]>([]);
  const [missed, setMissed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>('idle');
  const [score, setScore] = useState(0);
  const [eating, setEating] = useState(false);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const press = useRef<Press | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const monsterRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Only talks on its own when a grown-up has turned on "Read questions aloud"; the 🔊 button always works.
  useEffect(() => {
    speak(round.ask);
  }, [round]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const k = placed.length;

  const place = (slot: number) => {
    if (eating || placed.includes(slot)) return;
    play('pop');
    setNote(null);
    setPlaced((p) => [...p, slot]);
  };

  const unplace = (slot: number) => {
    if (eating) return;
    play('tap');
    setNote(null);
    setPlaced((p) => p.filter((s) => s !== slot));
  };

  const feed = () => {
    if (eating || finished.current || (k === 0 && round.fixed === 0)) return;
    if (k !== round.need) {
      const msg = k > round.need ? tooMany(round.kind) : notEnough(round.kind);
      setMissed(true);
      setNote(msg);
      setMood('no');
      play('wrong');
      speak(msg);
      later(() => setMood('idle'), 650);
      return;
    }
    const newScore = score + (missed ? 0 : 1);
    setScore(newScore);
    setEating(true);
    setNote(null);
    setMood('chomp');
    play('correct');
    later(() => {
      if (roundNo + 1 >= ROUNDS) {
        finished.current = true;
        onFinish(newScore);
        return;
      }
      setRoundNo(roundNo + 1);
      setRound(makeRound(band));
      setPlaced([]);
      setMissed(false);
      setEating(false);
      setMood('idle');
    }, 1300);
  };

  /* Pointer handling shared by every draggable thing. */

  const down = (e: ReactPointerEvent<Element>, from: DragFrom, slot: number, rectEl?: Element | null) => {
    if (eating || e.button > 0) return;
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    press.current = { from, slot, startX: e.clientX, startY: e.clientY, rect: (rectEl ?? target).getBoundingClientRect(), moved: false };
  };

  const move = (e: ReactPointerEvent<Element>) => {
    const p = press.current;
    if (!p) return;
    if (!p.moved) {
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_START) return;
      p.moved = true;
      if (p.from === 'plate') setMood('open');
    }
    setGhost({
      from: p.from,
      slot: p.slot,
      x: e.clientX,
      y: e.clientY,
      offX: p.startX - p.rect.left,
      offY: p.startY - p.rect.top,
      w: p.rect.width,
      h: p.rect.height,
    });
  };

  const up = (e: ReactPointerEvent<Element>) => {
    const p = press.current;
    press.current = null;
    setGhost(null);
    if (!p) return;
    const { clientX: x, clientY: y } = e;
    if (!p.moved) {
      // A plain tap: move the piece on or off the plate.
      if (p.from === 'source') place(p.slot);
      else if (p.from === 'placed') unplace(p.slot);
      return;
    }
    if (p.from === 'source') {
      if (inside(plateRef.current, x, y, 24)) place(p.slot);
    } else if (p.from === 'placed') {
      if (!inside(plateRef.current, x, y, 8)) unplace(p.slot);
    } else {
      setMood('idle');
      if (inside(monsterRef.current, x, y, 20)) feed();
    }
  };

  const cancel = () => {
    if (press.current?.from === 'plate') setMood('idle');
    press.current = null;
    setGhost(null);
  };

  /** Props that make an element draggable (and tappable / keyboard-pressable). */
  const handle = (from: DragFrom, slot: number, label: string, rectEl?: () => Element | null) => ({
    role: 'button' as const,
    tabIndex: eating ? -1 : 0,
    'aria-label': label,
    onPointerDown: (e: ReactPointerEvent<Element>) => down(e, from, slot, rectEl?.()),
    onPointerMove: move,
    onPointerUp: up,
    onPointerCancel: cancel,
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (from === 'source') place(slot);
      else if (from === 'placed') unplace(slot);
    },
  });

  const dragging = (from: DragFrom, slot: number) => ghost?.from === from && ghost.slot === slot;
  const pieceName = round.kind === 'bag' ? `bag of ${round.unit}` : round.kind === 'slice' ? 'pizza slice' : 'cookie';

  /* ───────── Pieces ───────── */

  const sourceSvg = useRef<SVGSVGElement>(null);
  const plateSvg = useRef<SVGSVGElement>(null);

  let source: ReactNode;
  let onPlate: ReactNode;

  if (round.kind === 'slice') {
    const den = round.den;
    source = (
      <svg ref={sourceSvg} className="feed-monster-pizza" viewBox="-110 -110 220 220" role="group" aria-label="Pizza">
        <circle r={PIZZA_R} fill="#f6efe2" stroke="#c9bb9b" strokeWidth={2} strokeDasharray="6 6" />
        {Array.from({ length: den }, (_, i) =>
          placed.includes(i) ? null : (
            <g key={i} className={`feed-monster-slice${dragging('source', i) ? ' is-dragging' : ''}`} {...handle('source', i, 'Pizza slice. Put it on the plate', () => sourceSvg.current)}>
              <Slice i={i} den={den} />
            </g>
          ),
        )}
      </svg>
    );
    onPlate = (
      <svg ref={plateSvg} className="feed-monster-pizza on-plate" viewBox="-110 -110 220 220" role="group" aria-label={`${k} of ${den} slices`}>
        {Array.from({ length: den }, (_, i) => (
          <path key={i} d={wedgePath(i, den)} fill="none" stroke="#d3e2f3" strokeWidth={2} strokeDasharray="5 5" />
        ))}
        {placed.map((slot, pos) => (
          <g key={slot} className={`feed-monster-slice placed${dragging('placed', slot) ? ' is-dragging' : ''}`} {...handle('placed', slot, 'Pizza slice on the plate. Take it off', () => plateSvg.current)}>
            <Slice i={pos} den={den} />
          </g>
        ))}
      </svg>
    );
  } else {
    const art = (added: boolean) => (round.kind === 'bag' ? <BagArt unit={round.unit} /> : <CookieArt color={round.fixed && added ? ADDED_COOKIE : undefined} />);
    source = (
      <div className={`feed-monster-tray ${round.kind}`}>
        {Array.from({ length: round.supply }, (_, slot) =>
          placed.includes(slot) ? (
            <span key={slot} className={`feed-monster-piece empty ${round.kind}`} aria-hidden />
          ) : (
            <span key={slot} className={`feed-monster-piece ${round.kind}${dragging('source', slot) ? ' is-dragging' : ''}`} {...handle('source', slot, `${pieceName}. Put it on the plate`)}>
              {art(true)}
            </span>
          ),
        )}
      </div>
    );
    onPlate = (
      <div className={`feed-monster-on-plate ${round.kind}`}>
        {Array.from({ length: round.fixed }, (_, i) => (
          <span key={`f${i}`} className="feed-monster-piece cookie fixed" aria-hidden>
            <CookieArt color={FIXED_COOKIE} />
          </span>
        ))}
        {placed.map((slot) => (
          <span key={slot} className={`feed-monster-piece ${round.kind} placed${dragging('placed', slot) ? ' is-dragging' : ''}`} {...handle('placed', slot, `${pieceName} on the plate. Take it off`)}>
            {art(true)}
          </span>
        ))}
        {k === 0 && round.fixed === 0 && <span className="feed-monster-plate-hint">Drag food here</span>}
      </div>
    );
  }

  const ghostArt = (() => {
    if (!ghost || ghost.from === 'plate') return null;
    if (round.kind === 'slice') {
      const pos = ghost.from === 'placed' ? placed.indexOf(ghost.slot) : ghost.slot;
      return (
        <svg viewBox="-110 -110 220 220" width={ghost.w} height={ghost.h}>
          <Slice i={pos} den={round.den} />
        </svg>
      );
    }
    return round.kind === 'bag' ? <BagArt unit={round.unit} /> : <CookieArt color={round.fixed ? ADDED_COOKIE : undefined} />;
  })();

  const plateStyle =
    ghost?.from === 'plate' && press.current
      ? { transform: `translate(${ghost.x - press.current.startX}px, ${ghost.y - press.current.startY}px) rotate(-3deg)` }
      : undefined;

  const ready = k > 0 || round.fixed > 0;

  return (
    <div className={`feed-monster band-${band}`}>
      <div className="feed-monster-hud">
        <span className="feed-monster-round">
          {roundNo + 1}/{ROUNDS}
        </span>
        <span className="feed-monster-score" aria-label={`${score} points`}>
          <Star size={16} fill="var(--star)" /> {score}
        </span>
      </div>

      <div className="feed-monster-main">
      <div className="feed-monster-bubble" key={roundNo} aria-live="polite">
        <span className="feed-monster-ask">
          {eating ? 'Yum! Thank you!' : round.ask}
          <button type="button" className="feed-monster-hear" onClick={() => speak(round.ask, { force: true })} aria-label="Hear what the monster wants">
            <Volume2 size={16} />
          </button>
        </span>
        {note && <small>{note}</small>}
      </div>

      <div className="feed-monster-pet" ref={monsterRef}>
        <Monster mood={mood} />
        {eating && (
          <span className="feed-monster-sparkles" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 60}deg` } as CSSProperties} />
            ))}
          </span>
        )}
      </div>

      <div className="feed-monster-plate-wrap">
        <div
          ref={plateRef}
          className={`feed-monster-plate${ghost?.from === 'plate' ? ' lifted' : ''}${eating ? ' eaten' : ''}${ready && !eating ? ' grabbable' : ''}`}
          style={plateStyle}
          onPointerDown={(e) => ready && down(e, 'plate', -1)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          aria-label="The monster's plate"
        >
          {onPlate}
        </div>

      <div className="feed-monster-controls">
        <span className="feed-monster-readout" aria-live="polite">
          {readout(round, k)}
        </span>
        <button
          type="button"
          className="feed-monster-feed"
          onClick={feed}
          disabled={!ready || eating}
          onPointerEnter={() => mood === 'idle' && setMood('open')}
          onPointerLeave={() => mood === 'open' && !ghost && setMood('idle')}
        >
          Feed me!
        </button>
      </div>
      </div>

      <div className="feed-monster-source">{source}</div>
      </div>

      {ghost && ghostArt && (
        <div
          className={`feed-monster-ghost ${round.kind}`}
          style={{ left: ghost.x - ghost.offX, top: ghost.y - ghost.offY, width: ghost.w, height: ghost.h }}
          aria-hidden
        >
          {ghostArt}
        </div>
      )}
    </div>
  );
}

export const game: Game = {
  id: 'feed-monster',
  title: 'Feed the Monster',
  blurb: 'Fill the plate with exactly what the hungry monster asks for.',
  howTo: 'Read the monster’s order, or tap its speaker. Tap or drag food onto the plate to make that amount. Tap extra food to take it back, then press Feed me!',
  color: '#34c47c',
  icon: Cookie,
  scoreLabel: 'orders right first time',
  Play,
};
