import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Shuffle, Star } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { fmt } from '../../lib/answers';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { ReadAloud } from '../shared/ReadAloud';
import { ThingsPicture, THING_KINDS, thingName } from '../../visuals/Thing';
import './sort-it.css';

const ITEMS = 12;
const IN_MS = 340;
const PEEK_MS = 260;
const BACK_MS = 520;

type Side = 0 | 1;

interface Item {
  key: string;
  /** What is drawn on the card. */
  face: ReactNode;
  /** Spoken / accessible name, e.g. "17" or "seven ducks". */
  name: string;
  side: Side;
}

interface Rule {
  baskets: [string, string];
  /** Read aloud at the start for younger children. */
  intro: string;
  /** Speak a card's name when it is picked up. */
  speakItems: boolean;
  items: Item[];
}

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** Six cards for each basket, shuffled together. */
function balanced(left: Item[], right: Item[]): Item[] {
  return shuffle([...shuffle(left).slice(0, ITEMS / 2), ...shuffle(right).slice(0, ITEMS / 2)]);
}

const numberCard = (n: number, side: Side): Item => ({
  key: `n${n}`,
  face: <span className="sort-it-num">{n}</span>,
  name: String(n),
  side,
});

function Fraction({ n, d }: { n: number; d: number }) {
  return (
    <span className="sort-it-frac" aria-hidden>
      <span>{n}</span>
      <span className="sort-it-frac-bar" />
      <span>{d}</span>
    </span>
  );
}

function makeRule(band: Band): Rule {
  switch (band) {
    case 0: {
      const card = (n: number): Item => {
        const kind = pick(THING_KINDS);
        return {
          key: `d${n}-${kind}`,
          face: <ThingsPicture kind={kind} count={n} perRow={n > 6 ? 5 : 3} />,
          name: `${n} ${thingName(kind, n)}`,
          side: n < 5 ? 0 : 1,
        };
      };
      // Numbers repeat at this age, so build 6 + 6 cards directly.
      const left = Array.from({ length: ITEMS / 2 }, () => card(rand(1, 4)));
      const right = Array.from({ length: ITEMS / 2 }, () => card(rand(5, 9)));
      return {
        baskets: ['Fewer than 5', '5 or more'],
        intro: 'Count the things on a card. Fewer than 5, or 5 or more? Drag it to a basket!',
        speakItems: false,
        items: shuffle([...left, ...right]).map((it, i) => ({ ...it, key: `${it.key}-${i}` })),
      };
    }
    case 1:
      return {
        baskets: ['Odd', 'Even'],
        intro: 'Is the number odd or even? Drag each card to a basket!',
        speakItems: true,
        items: balanced(
          range(1, 30).filter((n) => n % 2 === 1).map((n) => numberCard(n, 0)),
          range(1, 30).filter((n) => n % 2 === 0).map((n) => numberCard(n, 1)),
        ),
      };
    case 2:
      return {
        baskets: ['In the 3 times table', 'Not in the 3s'],
        intro: 'Is it in the 3 times table?',
        speakItems: false,
        items: balanced(
          range(1, 12).map((k) => numberCard(k * 3, 0)),
          range(1, 40).filter((n) => n % 3 !== 0).map((n) => numberCard(n, 1)),
        ),
      };
    case 3: {
      const frac = (n: number, d: number): Item => ({
        key: `f${n}-${d}`,
        face: <Fraction n={n} d={d} />,
        name: `${n} over ${d}`,
        side: n / d < 0.5 ? 0 : 1,
      });
      const dec = (v: number): Item => ({
        key: `d${v}`,
        face: <span className="sort-it-num">{fmt(v)}</span>,
        name: fmt(v),
        side: v < 0.5 ? 0 : 1,
      });
      const less = [
        ...shuffle([frac(1, 3), frac(1, 4), frac(2, 5), frac(1, 5), frac(3, 8), frac(1, 8), frac(1, 6), frac(3, 10)]).slice(0, 3),
        ...shuffle([0.3, 0.45, 0.2, 0.49, 0.09, 0.35, 0.25, 0.4].map(dec)).slice(0, 3),
      ];
      const more = [
        ...shuffle([frac(2, 3), frac(3, 4), frac(3, 5), frac(4, 5), frac(5, 8), frac(7, 8), frac(5, 6), frac(7, 10)]).slice(0, 3),
        ...shuffle([0.6, 0.55, 0.8, 0.51, 0.9, 0.75, 0.65, 0.7].map(dec)).slice(0, 3),
      ];
      return { baskets: ['Less than ½', 'More than ½'], intro: 'Is it less than a half, or more?', speakItems: false, items: shuffle([...less, ...more]) };
    }
  }
}

const BASKET_COLORS = ['var(--ocean)', 'var(--berry)'];
const GOAL = 'Drag each card into its basket.';

/** A card on the table. */
interface Card {
  id: number;
  item: Item;
  /** Which spot in the pile it sits in. */
  slot: number;
  /** A little mess so the pile looks tossed down. */
  jx: number;
  jy: number;
  rot: number;
  /** Wrong drops so far (only first tries score). */
  tries: number;
  /** idle: in the pile · drag: held · peek: dipping into the wrong basket · back: spat out · in: dropping into the right basket. */
  mode: 'idle' | 'drag' | 'peek' | 'back' | 'in';
  /** Where it is flying to (field coordinates of a basket). */
  to?: { x: number; y: number };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Geo {
  cardW: number;
  cardH: number;
  slots: { x: number; y: number }[];
  baskets: [Rect, Rect];
}

let cardSeq = 0;

function newCard(item: Item, slot: number): Card {
  return { id: ++cardSeq, item, slot, jx: rand(-6, 6), jy: rand(-8, 8), rot: rand(-6, 6), tries: 0, mode: 'idle' };
}

interface DragState {
  id: number;
  x: number;
  y: number;
  moved: boolean;
  samples: { t: number; x: number; y: number }[];
}

function Play({ band, onFinish }: GameProps) {
  const rule = useMemo(() => makeRule(band), [band]);
  const pileSize = band === 0 ? 3 : 4;
  const [cards, setCards] = useState<Card[]>(() => rule.items.slice(0, pileSize).map((item, i) => newCard(item, i)));
  const [score, setScore] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [counts, setCounts] = useState<[number, number]>([0, 0]);
  const [bounce, setBounce] = useState<{ side: Side; n: number; good: boolean } | null>(null);
  const [held, setHeld] = useState<{ id: number; dx: number; dy: number; tilt: number } | null>(null);
  const [over, setOver] = useState<Side | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [geo, setGeo] = useState<Geo | null>(null);

  const fieldRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const basketRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dealt = useRef(pileSize);
  const scoreRef = useRef(0);
  const clearedRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    speak(rule.intro);
  }, [band, rule]);

  /** Lay the pile out in the free space above the baskets. */
  const measure = useCallback(() => {
    const field = fieldRef.current?.getBoundingClientRect();
    const pile = pileRef.current?.getBoundingClientRect();
    const b0 = basketRefs.current[0]?.getBoundingClientRect();
    const b1 = basketRefs.current[1]?.getBoundingClientRect();
    if (!field || !pile || !b0 || !b1) return;
    const rel = (r: DOMRect): Rect => ({ x: r.left - field.left, y: r.top - field.top, w: r.width, h: r.height });
    const p = rel(pile);
    const gap = 26;
    const maxW = band === 0 ? 190 : 170;
    let cols = pileSize;
    let cardW = Math.min(maxW, (p.w - gap * (cols - 1)) / cols);
    if (cardW < 120) {
      cols = 2;
      cardW = Math.min(maxW, (p.w - gap) / 2);
    }
    const rows = Math.ceil(pileSize / cols);
    let cardH = cardW * 0.8;
    const fitH = (p.h - gap * (rows - 1)) / rows;
    if (cardH > fitH) {
      cardH = Math.max(80, fitH);
      cardW = Math.min(cardW, cardH / 0.8);
    }
    const gridW = cols * cardW + (cols - 1) * gap;
    const gridH = rows * cardH + (rows - 1) * gap;
    const x0 = p.x + (p.w - gridW) / 2;
    const y0 = p.y + Math.max(0, (p.h - gridH) / 2);
    const slots = Array.from({ length: pileSize }, (_, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, pileSize - row * cols);
      // Centre a shorter last row.
      const rowX = x0 + ((cols - inRow) * (cardW + gap)) / 2;
      return { x: rowX + (i % cols) * (cardW + gap), y: y0 + row * (cardH + gap) };
    });
    setGeo({ cardW, cardH, slots, baskets: [rel(b0), rel(b1)] });
  }, [band, pileSize]);

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const flash = (text: string) => {
    setMessage(text);
    later(() => setMessage((m) => (m === text ? '' : m)), 1400);
  };

  const basketMouth = (side: Side, depth: number) => {
    const b = geo!.baskets[side];
    return { x: b.x + b.w / 2, y: b.y + b.h * depth };
  };

  /** Drop card `id` into basket `side`. */
  const send = (id: number, side: Side) => {
    const card = cards.find((c) => c.id === id);
    if (!card || !geo || card.mode === 'in' || card.mode === 'peek' || card.mode === 'back' || finished.current) return;
    setSelected(null);
    if (card.item.side === side) {
      play('correct');
      flash(pick(['Yes!', 'Great sorting!', 'Right!', 'Nice one!']));
      if (card.tries === 0) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, mode: 'in', to: basketMouth(side, 0.45) } : c)));
      // The next card from the deck takes its place in the pile.
      const nextItem = dealt.current < ITEMS ? rule.items[dealt.current++] : null;
      const replacement = nextItem ? newCard(nextItem, card.slot) : null;
      later(() => {
        setCards((cs) => [...cs.filter((c) => c.id !== id), ...(replacement ? [replacement] : [])]);
        setCounts((c) => (side === 0 ? [c[0] + 1, c[1]] : [c[0], c[1] + 1]));
        setBounce((b) => ({ side, n: (b?.n ?? 0) + 1, good: true }));
        clearedRef.current += 1;
        setCleared(clearedRef.current);
        if (clearedRef.current >= ITEMS && !finished.current) {
          finished.current = true;
          later(() => onFinish(scoreRef.current), 550);
        }
      }, IN_MS);
      return;
    }
    // Wrong basket: it dips in, gets spat back out and returns to the pile.
    play('wrong');
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, mode: 'peek', to: basketMouth(side, 0.2) } : c)));
    later(() => {
      setBounce((b) => ({ side, n: (b?.n ?? 0) + 1, good: false }));
      flash('Oops! Try the other basket.');
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, mode: 'back', to: undefined, tries: c.tries + 1 } : c)));
    }, PEEK_MS);
    later(() => setCards((cs) => cs.map((c) => (c.id === id && c.mode === 'back' ? { ...c, mode: 'idle' } : c))), PEEK_MS + BACK_MS);
  };

  /** Which basket (if any) the centre of a held card is over. */
  const basketAt = (cx: number, cy: number): Side | null => {
    if (!geo) return null;
    for (const side of [0, 1] as Side[]) {
      const b = geo.baskets[side];
      const pad = 18;
      if (cx >= b.x - pad && cx <= b.x + b.w + pad && cy >= b.y - pad && cy <= b.y + b.h + pad) return side;
    }
    return null;
  };

  const cardCentre = (card: Card, dx: number, dy: number) => {
    const slot = geo!.slots[card.slot];
    return { x: slot.x + card.jx + dx + geo!.cardW / 2, y: slot.y + card.jy + dy + geo!.cardH / 2 };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, card: Card) => {
    if (card.mode !== 'idle' || !geo || finished.current || dragRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    measure();
    const t = performance.now();
    dragRef.current = { id: card.id, x: e.clientX, y: e.clientY, moved: false, samples: [{ t, x: e.clientX, y: e.clientY }] };
    setHeld({ id: card.id, dx: 0, dy: 0, tilt: 0 });
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, mode: 'drag' } : c)));
    play('tap');
    if (rule.speakItems) speak(card.item.name);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>, card: Card) => {
    const d = dragRef.current;
    if (!d || d.id !== card.id) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
    const t = performance.now();
    d.samples.push({ t, x: e.clientX, y: e.clientY });
    while (d.samples.length > 2 && t - d.samples[0].t > 100) d.samples.shift();
    const a = d.samples[0];
    const vx = (e.clientX - a.x) / Math.max(16, t - a.t);
    setHeld({ id: card.id, dx, dy, tilt: Math.max(-14, Math.min(14, vx * 14)) });
    const c = cardCentre(card, dx, dy);
    setOver(basketAt(c.x, c.y));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, card: Card, cancelled = false) => {
    const d = dragRef.current;
    if (!d || d.id !== card.id) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    setHeld(null);
    setOver(null);
    setCards((cs) => cs.map((c) => (c.id === card.id && c.mode === 'drag' ? { ...c, mode: 'idle' } : c)));
    if (cancelled) return;
    if (!d.moved) {
      // A plain tap picks the card; then tap a basket.
      setSelected((s) => (s === card.id ? null : card.id));
      return;
    }
    const c = cardCentre(card, dx, dy);
    let side = basketAt(c.x, c.y);
    if (side === null && geo) {
      // A quick flick throws the card toward the basket it is heading for.
      const t = performance.now();
      const a = d.samples[0];
      const dt = Math.max(16, t - a.t);
      const vx = (e.clientX - a.x) / dt;
      const vy = (e.clientY - a.y) / dt;
      const speed = Math.hypot(vx, vy);
      if (speed > 0.55) {
        let best: Side | null = null;
        let bestAngle = 0.8; // about 45°
        for (const s of [0, 1] as Side[]) {
          const b = geo.baskets[s];
          const tx = b.x + b.w / 2 - c.x;
          const ty = b.y + b.h / 2 - c.y;
          const angle = Math.acos((vx * tx + vy * ty) / (speed * Math.hypot(tx, ty) || 1));
          if (angle < bestAngle) {
            bestAngle = angle;
            best = s;
          }
        }
        side = best;
      }
    }
    if (side !== null) {
      // Keep the card where it was dropped so it flies on from there.
      send(card.id, side);
    } else {
      play('pop');
    }
  };

  const onCardKey = (e: ReactKeyboardEvent, card: Card) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      send(card.id, 0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      send(card.id, 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected((s) => (s === card.id ? null : card.id));
    }
  };

  // Light up the right basket once a card has gone in the wrong one.
  const focusCard = cards.find((c) => c.id === (held?.id ?? selected));
  const hintSide = focusCard && focusCard.tries > 0 ? focusCard.item.side : null;

  const cardTransform = (card: Card) => {
    if (!geo) return { transform: 'translate(-9999px, 0)' };
    const slot = geo.slots[card.slot];
    const { cardW, cardH } = geo;
    if ((card.mode === 'in' || card.mode === 'peek') && card.to) {
      const k = card.mode === 'in' ? 0.3 : 0.62;
      return {
        transform: `translate(${card.to.x - cardW / 2}px, ${card.to.y - cardH / 2}px) rotate(${card.rot * 2}deg) scale(${k})`,
        opacity: card.mode === 'in' ? 0 : 1,
      };
    }
    const lifted = card.mode === 'drag' && held?.id === card.id;
    const dx = lifted ? held.dx : 0;
    const dy = lifted ? held.dy : 0;
    const rot = card.rot + (lifted ? held.tilt : 0);
    const scale = lifted ? 1.07 : selected === card.id ? 1.05 : 1;
    return { transform: `translate(${slot.x + card.jx + dx}px, ${slot.y + card.jy + dy}px) rotate(${rot}deg) scale(${scale})` };
  };

  return (
    <div className="sort-it">
      <div className="sort-it-hud">
        <p className="sort-it-goal" aria-live="polite">
          {message || GOAL}
          <ReadAloud text={rule.intro} />
        </p>
        <div className="sort-it-stats" aria-label={`${cleared} of ${ITEMS} sorted, ${score} right first time`}>
          <span className="sort-it-pill">
            {cleared}/{ITEMS}
          </span>
          <span className="sort-it-pill">
            <Star size={15} fill="var(--star)" strokeWidth={2} /> {score}
          </span>
        </div>
      </div>

      <div className="sort-it-field" ref={fieldRef}>
        <div className="sort-it-pile" ref={pileRef} />

        <div className="sort-it-baskets">
          {rule.baskets.map((label, i) => {
            const side = i as Side;
            const bounced = bounce?.side === side ? bounce : null;
            return (
              <button
                key={label}
                ref={(el) => {
                  basketRefs.current[side] = el;
                }}
                type="button"
                className={`sort-it-basket${over === side ? ' over' : ''}${hintSide === side ? ' hint' : ''}${selected !== null ? ' ready' : ''}`}
                style={{ '--c': BASKET_COLORS[side] } as CSSProperties}
                onClick={() => selected !== null && send(selected, side)}
                aria-label={`${label} basket, ${counts[side]} cards${selected !== null ? '. Tap to drop the picked card here' : ''}`}
              >
                <span key={bounced?.n ?? 0} className={bounced ? (bounced.good ? 'sort-it-bob' : 'sort-it-spit') : undefined}>
                  <Basket color={side === 0 ? C.blue : C.pink} count={counts[side]} />
                </span>
                <span className="sort-it-label">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="sort-it-layer">
          {geo &&
            cards.map((card) => (
              <div
                key={card.id}
                className={`sort-it-card is-${card.mode}${selected === card.id ? ' selected' : ''}`}
                style={{ width: geo.cardW, height: geo.cardH, ['--cw' as string]: `${geo.cardW}px`, ...cardTransform(card) } as CSSProperties}
                role="button"
                tabIndex={card.mode === 'in' ? -1 : 0}
                aria-label={`${card.item.name}. Drag it to a basket, or press left for ${rule.baskets[0]} and right for ${rule.baskets[1]}.`}
                onPointerDown={(e) => onPointerDown(e, card)}
                onPointerMove={(e) => onPointerMove(e, card)}
                onPointerUp={(e) => endDrag(e, card)}
                onPointerCancel={(e) => endDrag(e, card, true)}
                onKeyDown={(e) => onCardKey(e, card)}
              >
                <div className="sort-it-drop">
                  <div className={`sort-it-face${card.mode === 'back' ? ' wobble' : ''}`}>{card.item.face}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function Basket({ color, count }: { color: string; count: number }) {
  return (
    <svg className="sort-it-basket-art" viewBox="0 0 120 80" aria-hidden>
      <path d="M22,30 C22,4 98,4 98,30" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <path d="M8,30 H112 L100,74 H20 Z" fill={shade(color, 0.35)} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
      {[0, 1, 2].map((r) => (
        <path key={r} d={`M${13 + r * 3.5},${42 + r * 11} H${107 - r * 3.5}`} stroke={shade(color, -0.1)} strokeWidth={3} />
      ))}
      <rect x={6} y={26} width={108} height={10} rx={5} fill={color} stroke={C.ink} strokeWidth={3} />
      {count > 0 && (
        <g>
          <circle cx={104} cy={18} r={14} fill="white" stroke={C.ink} strokeWidth={3} />
          <text x={104} y={19} textAnchor="middle" dominantBaseline="central" className="sort-it-count">
            {count}
          </text>
        </g>
      )}
    </svg>
  );
}

export const game: Game = {
  id: 'sort-it',
  title: 'Sorting Party',
  blurb: 'Drag each card into the right basket.',
  howTo: 'Read the rules on the baskets. Drag each card into its basket, or tap a card and then tap its basket.',
  howToByBand: [
    'Count the things on a card. Put fewer than 5 in one basket and 5 or more in the other. Drag the card, or tap it and then its basket.',
    'Sort numbers into Odd and Even. Even numbers make pairs with none left over. Drag a card to its basket, or tap the card and then the basket.',
    'Sort numbers into the 3 times table or not in the 3s. Count in threes to check. Drag a card, or tap it and then its basket.',
    'Compare each fraction or decimal with one half. Is it less or more? Drag the card into its basket, or tap the card and then the basket.',
  ],
  color: '#ff5d8f',
  icon: Shuffle,
  scoreLabel: 'cards sorted right first time',
  Play,
};
