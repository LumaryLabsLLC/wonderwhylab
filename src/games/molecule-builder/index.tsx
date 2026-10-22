import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Atom, Minus, Star, Volume2 } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import {
  addCounts,
  ATOM,
  describeCounts,
  ELEMENTS,
  isBalanced,
  layout,
  makeOrders,
  MOLECULES,
  moleculeFor,
  ORDERS,
  sideCounts,
  targetCounts,
} from './orders';
import type { Counts, El, Equation, Order } from './orders';
import './molecule-builder.css';

/* ───────────── drawing ───────────── */

/** A ball-and-stick picture of some atoms (bonded when they form a cluster). */
function MoleculeSvg({ counts, unit = 46, letters = true, loose = false }: { counts: Counts; unit?: number; letters?: boolean; loose?: boolean }) {
  const r = unit * 0.42;
  if (loose) {
    // Ages 4–5 pattern cards: separate balls in a row, no bonds.
    const list: El[] = [];
    for (const e of ELEMENTS) for (let i = 0; i < (counts[e] ?? 0); i++) list.push(e);
    const w = list.length * unit * 1.05;
    return (
      <svg viewBox={`${-unit * 0.55} ${-unit * 0.6} ${Math.max(w, unit)} ${unit * 1.2}`} width={Math.max(w, unit)} height={unit * 1.2} className="molecule-builder-svg" aria-hidden>
        {list.map((e, i) => (
          <Ball key={i} el={e} x={i * unit * 1.05} y={0} r={r * ATOM[e].size} letters={false} />
        ))}
      </svg>
    );
  }
  const { atoms, bonds } = layout(counts, unit);
  if (!atoms.length) return null;
  const pad = unit * 0.7;
  const xs = atoms.map((a) => a.x);
  const ys = atoms.map((a) => a.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad;
  const h = Math.max(...ys) - minY + pad;
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} width={w} height={h} className="molecule-builder-svg" aria-hidden>
      {bonds.map((b, i) => {
        const A = atoms[b.a];
        const B = atoms[b.b];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * unit * 0.12;
        const ny = (dx / len) * unit * 0.12;
        const offsets = b.order === 1 ? [0] : b.order === 2 ? [-0.5, 0.5] : [-1, 0, 1];
        return offsets.map((o) => (
          <line key={`${i}-${o}`} x1={A.x + nx * o} y1={A.y + ny * o} x2={B.x + nx * o} y2={B.y + ny * o} stroke="#1e2b4a" strokeWidth={unit * 0.09} strokeLinecap="round" />
        ));
      })}
      {atoms.map((a, i) => (
        <Ball key={i} el={a.el} x={a.x} y={a.y} r={r * ATOM[a.el].size} letters={letters} />
      ))}
    </svg>
  );
}

function Ball({ el, x, y, r, letters }: { el: El; x: number; y: number; r: number; letters: boolean }) {
  const a = ATOM[el];
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={a.fill} stroke="#1e2b4a" strokeWidth={r * 0.12} />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.22} fill="white" opacity={el === 'H' ? 0 : 0.35} />
      {letters && (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.95} fontWeight={700} fill={a.text} fontFamily="var(--font-display)">
          {el}
        </text>
      )}
    </g>
  );
}

/* ───────────── dragging ───────────── */

interface DragState {
  item: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

function dropTargetAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el instanceof HTMLElement && el.dataset.mbDrop) return el.dataset.mbDrop;
  }
  return null;
}

/* ───────────── game ───────────── */

function goalFor(order: Order): string {
  switch (order.kind) {
    case 'pattern':
      return `Make ${describeCounts(order.target)}`;
    case 'picture':
      return `Build ${MOLECULES[order.molecule].name}`;
    case 'formula':
      return `Build ${MOLECULES[order.molecule].formula}`;
    case 'equation':
      return 'Balance the equation';
  }
}

function spokenGoal(order: Order): string {
  switch (order.kind) {
    case 'pattern':
      return `Make ${describeCounts(order.target)}.`;
    case 'picture':
      return `Build ${MOLECULES[order.molecule].name}.`;
    case 'formula': {
      const m = MOLECULES[order.molecule];
      return `Build ${m.name}. ${ELEMENTS.filter((e) => m.atoms[e]).map((e) => `${m.atoms[e]} ${ATOM[e].name}`).join(', ')}.`;
    }
    case 'equation':
      return 'Drag molecules onto each side until both sides have the same atoms.';
  }
}

/** What's wrong with a build, in words a child can act on. */
function buildHint(order: Order, have: Counts, band: Band): string {
  const want = targetCounts(order);
  for (const e of ELEMENTS) {
    const w = want[e] ?? 0;
    const h = have[e] ?? 0;
    if (w === h) continue;
    const word = band === 0 ? ATOM[e].colour : ATOM[e].name;
    if (w === 0) return `There's no ${word} in this one. Tap its − button to take it off.`;
    return h < w ? `It needs ${w} ${word} — you have ${h}. Add ${w - h} more.` : `It needs ${w} ${word} — you have ${h}. Tap − to take ${h - w} off.`;
  }
  return '';
}

function successLine(order: Order): string {
  if (order.kind === 'pattern') {
    const real = moleculeFor(order.target);
    return real && real.formula !== 'C' ? `Yes! ${describeCounts(order.target)} — the same atoms as ${real.name}!` : `Yes! ${describeCounts(order.target)}.`;
  }
  if (order.kind === 'equation') return `Balanced! ${order.equation.why}`;
  const m = MOLECULES[order.molecule];
  return `Yes! ${m.formula} is ${m.name}: ${m.fact}`;
}

function equationHint(e: Equation, coefs: Record<string, number>): string {
  const empty = [...e.left.map((s) => ['left', s.id]), ...e.right.map((s) => ['right', s.id])].find(([side, id]) => !(coefs[`${side}:${id}`] > 0));
  if (empty) return `Every box needs at least one ${MOLECULES[empty[1]].formula}.`;
  const L = sideCounts(e, coefs, 'left');
  const R = sideCounts(e, coefs, 'right');
  for (const el of ELEMENTS) {
    if ((L[el] ?? 0) !== (R[el] ?? 0)) return `Count the ${ATOM[el].name} atoms: ${L[el] ?? 0} on the left, ${R[el] ?? 0} on the right.`;
  }
  return '';
}

function Play({ band, onFinish }: GameProps) {
  const orders = useMemo(() => makeOrders(band), [band]);
  const [index, setIndex] = useState(0);
  const [build, setBuild] = useState<Counts>({});
  const [coefs, setCoefs] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(false);
  const [status, setStatus] = useState<'building' | 'right'>('building');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ item: string; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const drag = useRef<DragState | null>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const order = orders[index];
  const isEquation = order.kind === 'equation';

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const resetBoard = () => {
    setBuild({});
    setCoefs({});
    setMissed(false);
    setStatus('building');
    setMessage('');
    setSelected(null);
  };

  const next = () => {
    if (index + 1 >= ORDERS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(score);
      }
      return;
    }
    setIndex(index + 1);
    resetBoard();
  };

  /** Drop or tap-place an item (an element letter or a molecule id) on a target. */
  const place = (item: string, target: string | null) => {
    setSelected(null);
    setHover(null);
    if (status === 'right' || !target) return;
    if (!isEquation) {
      if (target !== 'build') return;
      const el = item as El;
      const total = ELEMENTS.reduce((n, e) => n + (build[e] ?? 0), 0);
      if (total >= 8) {
        setMessage('The build zone is full. Tap an atom to take it off.');
        return;
      }
      play('pop');
      setBuild(addCounts(build, { [el]: 1 }));
      setMessage('');
      return;
    }
    const [side, id] = target.split(':');
    if (!side || !id) return;
    const eq = order.equation;
    const inReaction = [...eq.left, ...eq.right].some((s) => s.id === item);
    if (id !== item) {
      play('wrong');
      setShake(target);
      later(() => setShake((s) => (s === target ? null : s)), 450);
      setMessage(inReaction ? `That box is for ${MOLECULES[id].formula}.` : `${MOLECULES[item].formula} isn't part of this reaction.`);
      return;
    }
    const n = coefs[target] ?? 0;
    if (n >= 6) return;
    play('pop');
    setCoefs({ ...coefs, [target]: n + 1 });
    setMessage('');
  };

  const removeAtom = (el: El) => {
    if (status === 'right' || !(build[el] ?? 0)) return;
    play('tap');
    setBuild({ ...build, [el]: (build[el] ?? 0) - 1 });
  };

  const removeMolecule = (target: string) => {
    if (status === 'right' || !(coefs[target] ?? 0)) return;
    play('tap');
    setCoefs({ ...coefs, [target]: coefs[target] - 1 });
  };

  const check = () => {
    if (status === 'right') return;
    const right = isEquation ? isBalanced(order.equation, coefs) : ELEMENTS.every((e) => (build[e] ?? 0) === (targetCounts(order)[e] ?? 0));
    if (right) {
      play('correct');
      setStatus('right');
      if (!missed) setScore((s) => s + 1);
      setMessage(successLine(order));
      return;
    }
    play('wrong');
    setMissed(true);
    setMessage(isEquation ? equationHint(order.equation, coefs) : buildHint(order, build, band) || 'Have another look.');
  };

  /* pointer handlers for tray items */
  const onDown = (e: ReactPointerEvent<HTMLButtonElement>, item: string) => {
    if (e.button !== 0 || status === 'right') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { item, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
    d.moved = true;
    setGhost({ item: d.item, x: e.clientX, y: e.clientY });
    setHover(dropTargetAt(e.clientX, e.clientY));
  };
  const onUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setGhost(null);
    if (!d.moved) {
      // Tap: ages 4–9 add the atom straight away; equations pick up the molecule.
      if (!isEquation) place(d.item, 'build');
      else {
        play('tap');
        setSelected((s) => (s === d.item ? null : d.item));
      }
      return;
    }
    place(d.item, dropTargetAt(e.clientX, e.clientY));
  };
  const onCancel = () => {
    drag.current = null;
    setGhost(null);
    setHover(null);
  };

  const trayItems = order.tray;
  const letters = band > 0;

  return (
    <div className="molecule-builder">
      <div className="molecule-builder-hud">
        <p className="molecule-builder-goal">
          {goalFor(order)}
          <button type="button" className="molecule-builder-say" onClick={() => speak(spokenGoal(order), { force: true })} aria-label="Hear the order" title="Hear it">
            <Volume2 size={16} />
          </button>
        </p>
        <div className="molecule-builder-stats">
          <span className="molecule-builder-pill">
            {Math.min(index + 1, ORDERS)}/{ORDERS}
          </span>
          <span className="molecule-builder-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      {!isEquation ? (
        <div className="molecule-builder-bench">
          <div className="molecule-builder-order" aria-label="Order card">
            <span className="molecule-builder-order-label">Order</span>
            {order.kind === 'pattern' && <MoleculeSvg counts={order.target} loose unit={44} />}
            {order.kind === 'picture' && (
              <>
                <MoleculeSvg counts={MOLECULES[order.molecule].atoms} unit={40} />
                <span className="molecule-builder-order-name">{MOLECULES[order.molecule].name}</span>
              </>
            )}
            {order.kind === 'formula' && (
              <>
                <span className="molecule-builder-formula">{MOLECULES[order.molecule].formula}</span>
                <span className="molecule-builder-order-name">{MOLECULES[order.molecule].name}</span>
              </>
            )}
          </div>
          <div
            className={`molecule-builder-zone${hover === 'build' ? ' hover' : ''}${status === 'right' ? ' done' : ''}`}
            data-mb-drop="build"
            aria-label="Build zone"
          >
            {ELEMENTS.every((e) => !(build[e] ?? 0)) ? (
              <span className="molecule-builder-zone-hint">{band === 0 ? 'Drag balls here' : 'Drag atoms here'}</span>
            ) : (
              <MoleculeSvg counts={build} letters={letters} unit={band === 0 ? 70 : 72} loose={band === 0} />
            )}
            {ELEMENTS.some((e) => build[e]) && status !== 'right' && (
              <div className="molecule-builder-counts" aria-label="Take atoms off">
                {ELEMENTS.filter((e) => build[e]).map((e) => (
                  <button key={e} type="button" className="molecule-builder-count" onClick={() => removeAtom(e)} aria-label={`Take off one ${band === 0 ? ATOM[e].colour : ATOM[e].name}`}>
                    <svg viewBox="-12 -12 24 24" width={18} height={18} aria-hidden>
                      <circle r={10} fill={ATOM[e].fill} stroke="#1e2b4a" strokeWidth={2} />
                    </svg>
                    {band === 2 ? `${e} × ${build[e]}` : build[e]} <Minus size={12} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <EquationBoard
          equation={order.equation}
          coefs={coefs}
          hover={hover}
          shake={shake}
          selected={selected}
          done={status === 'right'}
          onSlot={(target) => selected && place(selected, target)}
          onRemove={removeMolecule}
        />
      )}

      <div className={`molecule-builder-feedback${status === 'right' ? ' good' : message ? ' bad' : ''}`} role="status">
        {message || (isEquation ? (selected ? 'Now tap the box it goes in.' : 'Drag molecules into the boxes, then Check.') : band === 0 ? 'Drag the balls in, then Check.' : 'Drag atoms in, then Check.')}
      </div>

      <div className="molecule-builder-tray" aria-label="Tray">
        {trayItems.map((item) => {
          const atom = !isEquation;
          return (
            <button
              key={item}
              type="button"
              className={`molecule-builder-item${selected === item ? ' selected' : ''}${atom ? ' atom' : ' mol'}`}
              onPointerDown={(e) => onDown(e, item)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onCancel}
              onClick={(e) => {
                if (e.detail !== 0) return; // keyboard only
                if (atom) place(item, 'build');
                else setSelected((s) => (s === item ? null : item));
              }}
              aria-label={atom ? `${band === 0 ? ATOM[item as El].colour : ATOM[item as El].name} atom` : MOLECULES[item].name}
            >
              {atom ? (
                <svg viewBox="-30 -30 60 60" className="molecule-builder-item-ball" aria-hidden>
                  <Ball el={item as El} x={0} y={0} r={24 * ATOM[item as El].size} letters={letters} />
                </svg>
              ) : (
                <>
                  <MoleculeSvg counts={MOLECULES[item].atoms} unit={26} letters={false} />
                  <span className="molecule-builder-item-label">{MOLECULES[item].formula}</span>
                </>
              )}
            </button>
          );
        })}
        <div className="molecule-builder-actions">
          {status === 'right' ? (
            <button type="button" className="btn primary" onClick={next}>
              {index + 1 >= ORDERS ? 'Finish' : 'Next'}
            </button>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => (isEquation ? setCoefs({}) : setBuild({}))}>
                Clear
              </button>
              <button type="button" className="btn primary" onClick={check}>
                Check
              </button>
            </>
          )}
        </div>
      </div>

      {ghost && (
        <div className="molecule-builder-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden>
          {isEquation ? (
            <MoleculeSvg counts={MOLECULES[ghost.item].atoms} unit={30} letters={false} />
          ) : (
            <svg viewBox="-30 -30 60 60" width={64} height={64}>
              <Ball el={ghost.item as El} x={0} y={0} r={24 * ATOM[ghost.item as El].size} letters={letters} />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

function EquationBoard({
  equation,
  coefs,
  hover,
  shake,
  selected,
  done,
  onSlot,
  onRemove,
}: {
  equation: Equation;
  coefs: Record<string, number>;
  hover: string | null;
  shake: string | null;
  selected: string | null;
  done: boolean;
  onSlot: (target: string) => void;
  onRemove: (target: string) => void;
}) {
  const L = sideCounts(equation, coefs, 'left');
  const R = sideCounts(equation, coefs, 'right');
  const used = ELEMENTS.filter((e) => [...equation.left, ...equation.right].some((s) => MOLECULES[s.id].atoms[e]));

  const side = (which: 'left' | 'right') => (
    <div className="molecule-builder-side">
      {equation[which].map((s, i) => {
        const key = `${which}:${s.id}`;
        const n = coefs[key] ?? 0;
        return (
          <div key={key} className="molecule-builder-term">
            {i > 0 && <span className="molecule-builder-op">+</span>}
            <div
              className={`molecule-builder-slot${hover === key ? ' hover' : ''}${shake === key ? ' shake' : ''}${selected ? ' ready' : ''}${done ? ' done' : ''}`}
              data-mb-drop={done ? undefined : key}
              role="button"
              tabIndex={0}
              onClick={() => onSlot(key)}
              onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && onSlot(key)}
              aria-label={`${MOLECULES[s.id].formula} box, ${n} molecules`}
            >
              <span className="molecule-builder-slot-head">
                <span className={`molecule-builder-coef${n ? '' : ' empty'}`}>{n || '?'}</span>
                <span className="molecule-builder-slot-formula">{MOLECULES[s.id].formula}</span>
              </span>
              <span className="molecule-builder-stack" aria-hidden>
                {Array.from({ length: n }, (_, k) => (
                  <MoleculeSvg key={k} counts={MOLECULES[s.id].atoms} unit={14} letters={false} />
                ))}
              </span>
              {n > 0 && !done && (
                <button
                  type="button"
                  className="molecule-builder-minus"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onRemove(key);
                  }}
                  aria-label={`Take away one ${MOLECULES[s.id].formula}`}
                >
                  <Minus size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="molecule-builder-equation">
      <div className="molecule-builder-sides">
        {side('left')}
        <span className="molecule-builder-arrow">→</span>
        {side('right')}
      </div>
      <div className="molecule-builder-tally" aria-label="Atom count on each side">
        {used.map((e) => {
          const l = L[e] ?? 0;
          const r = R[e] ?? 0;
          const even = l === r && l > 0;
          return (
            <span key={e} className={`molecule-builder-tally-row${even ? ' even' : ''}`}>
              <svg viewBox="-12 -12 24 24" width={18} height={18} aria-hidden>
                <circle r={10} fill={ATOM[e].fill} stroke="#1e2b4a" strokeWidth={2} />
              </svg>
              {ATOM[e].name}: {l} left · {r} right
            </span>
          );
        })}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'molecule-builder',
  subject: 'science',
  topic: 'chemistry',
  title: 'Molecule Builder',
  blurb: 'Snap atoms together to build real molecules.',
  howTo: 'Drag atoms into the build zone to match the order card, then press Check. Older scientists balance equations with whole molecules.',
  howToByBand: [
    'Copy the coloured balls on the order card. Tap or drag balls from the tray into the build area, then press Check. Tap a ball in your build to remove it.',
    'Copy the molecule picture on the order card. Tap or drag atoms into the build area, then press Check. Tap an atom in your build to remove it.',
    'Read the formula: each small number tells how many of that atom you need. Tap or drag atoms into the build area and press Check. Tap a built atom to remove it.',
    'Balance the equation with whole molecules. Add molecules to both sides until every kind of atom has the same count. Use the remove controls to change your build, then press Check.',
  ],
  color: '#3b8cff',
  icon: Atom,
  scoreLabel: 'orders right first time',
  Play,
};
