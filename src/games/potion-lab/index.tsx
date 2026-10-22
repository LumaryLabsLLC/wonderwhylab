import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, FlaskRound, RotateCcw, Snowflake, Flame, Star, Thermometer, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { dissolves, fizzes, indicator, INGREDIENTS, makeOrders, mix, MIXED_COLOR, ORDERS, phWord, stateAt } from './potions';
import type { IngredientId, Mixed, Order, Paint, Stuff, WaterState } from './potions';
import './potion-lab.css';

const T_MIN = -20;
const T_MAX = 120;
const WATER = '#9cc8f5';

type Phase = 'play' | 'busy' | 'wrong' | 'done';

interface Drag {
  id: IngredientId;
  sx: number;
  sy: number;
  x: number;
  y: number;
  moved: boolean;
  over: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nameOf = (id: IngredientId) => INGREDIENTS[id].name;
const colorOf = (c: Paint | Mixed) => (c in MIXED_COLOR ? MIXED_COLOR[c as Mixed] : INGREDIENTS[c as Paint].color);
const STATE_WORD: Record<WaterState, string> = { ice: 'solid ice', water: 'runny water', steam: 'steam' };

function goalFor(order: Order): string {
  switch (order.kind) {
    case 'mix':
      return 'Pour in two paints to make the colour on the order.';
    case 'fizz':
      return 'Pour in the two things that fizz when they meet.';
    case 'state':
      return 'Heat or cool the flask, then serve the order.';
    case 'dissolve':
      return 'Stir in something that dissolves in water.';
    case 'ph':
      return 'Add acid or base drops to reach the pH on the order. Each drop moves it one step.';
  }
}

function orderTitle(order: Order): string {
  switch (order.kind) {
    case 'mix':
      return `${cap(order.target)} potion`;
    case 'fizz':
      return 'Fizzy potion';
    case 'state':
      return { ice: 'Frozen potion', water: 'Runny potion', steam: 'Steamy potion' }[order.target];
    case 'dissolve':
      return 'Clear potion';
    case 'ph':
      return `pH ${order.target} potion`;
  }
}

function orderNote(order: Order): string {
  switch (order.kind) {
    case 'mix':
      return 'Mix two colours.';
    case 'fizz':
      return 'Lots of bubbles!';
    case 'state':
      return { ice: 'Solid ice', water: 'Liquid water', steam: 'Hot steam' }[order.target];
    case 'dissolve':
      return 'Nothing left at the bottom.';
    case 'ph':
      return order.target === 7 ? 'Neutral' : order.target < 7 ? 'An acid' : 'A base';
  }
}

function success(order: Order, contents: IngredientId[]): string {
  switch (order.kind) {
    case 'mix': {
      const [a, b] = contents;
      return `${cap(nameOf(a))} and ${nameOf(b)} make ${order.target}, just like mixing paints!`;
    }
    case 'fizz': {
      const acid = contents.find((c) => c !== 'soda')!;
      return `Fizz! ${cap(nameOf(acid))} is an acid and baking soda is a base. Together they make a gas called carbon dioxide: the bubbles.`;
    }
    case 'state':
      return {
        ice: 'Water freezes into solid ice at 0 °C or colder.',
        water: 'Between 0 °C and 100 °C, water is a runny liquid.',
        steam: 'Water boils into steam, a gas, at 100 °C (at sea level).',
      }[order.target];
    case 'dissolve':
      return `${cap(nameOf(contents[0]))} dissolves! It breaks into bits too tiny to see, so the water stays clear.`;
    case 'ph':
      if (order.target === 7) return 'pH 7 is neutral: not an acid and not a base. Universal indicator turns green.';
      return order.target < 7
        ? `pH ${order.target} is an acid, like tomato juice. Universal indicator turns orange.`
        : `pH ${order.target} is a base, like soapy water. Universal indicator turns blue.`;
  }
}

function Play({ band, onFinish }: GameProps) {
  const orders = useMemo(() => makeOrders(band), [band]);
  const [index, setIndex] = useState(0);
  const order = orders[index];
  const [contents, setContents] = useState<IngredientId[]>([]);
  const [phase, setPhase] = useState<Phase>('play');
  const [temp, setTemp] = useState(() => (orders[0].kind === 'state' ? orders[0].start : 20));
  const [ph, setPh] = useState(() => (orders[0].kind === 'ph' ? orders[0].start : 7));
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [pour, setPour] = useState<{ id: IngredientId; n: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const flaskRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const timers = useRef<number[]>([]);
  const triesRef = useRef(0);
  const scoreRef = useRef(0);
  const pourCount = useRef(0);
  const finished = useRef(false);
  const suppressClick = useRef(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const shelf: IngredientId[] = order.kind === 'ph' ? ['acid', 'base'] : order.kind === 'state' ? [] : order.shelf;

  const succeed = (inFlask: IngredientId[]) => {
    play('correct');
    if (triesRef.current === 1) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setPhase('done');
    setMessage(success(order, inFlask));
  };

  /** Mixes and reactions are judged once enough has gone in. */
  const judge = (inFlask: IngredientId[]) => {
    triesRef.current += 1;
    if (order.kind === 'mix') {
      const [a, b] = inFlask as Paint[];
      const made = mix(a, b);
      if (made === order.target) return succeed(inFlask);
      setMessage(
        a === b
          ? `Two lots of ${a} just make ${a}. Empty the flask and try again!`
          : `${cap(a)} and ${b} make ${made}, not ${order.target}. Empty the flask and try again!`,
      );
    } else if (order.kind === 'fizz') {
      const [a, b] = inFlask as Stuff[];
      if (fizzes(a, b)) return succeed(inFlask);
      setMessage(
        a === b
          ? `No fizz. ${cap(nameOf(a))} on its own doesn't make a gas. Empty it and try a pair.`
          : `No fizz. ${cap(nameOf(a))} and ${nameOf(b)} don't make a gas. Empty it and try another pair.`,
      );
    } else if (order.kind === 'dissolve') {
      const s = inFlask[0] as Stuff;
      if (dissolves(s)) return succeed(inFlask);
      setMessage(
        s === 'pebbles'
          ? "Pebbles don't dissolve: they sink to the bottom. Empty the flask and try another."
          : `${cap(nameOf(s))} doesn't dissolve: it sinks to the bottom. Empty the flask and try another.`,
      );
    }
    play('wrong');
    setPhase('wrong');
  };

  const pourIn = (id: IngredientId) => {
    if (phase !== 'play') return;
    play('pop');
    setPour({ id, n: ++pourCount.current });
    later(() => setPour((p) => (p?.n === pourCount.current ? null : p)), 700);
    setMessage('');
    if (order.kind === 'ph') {
      setPh((p) => Math.max(0, Math.min(14, p + (id === 'acid' ? -1 : 1))));
      return;
    }
    const next = [...contents, id];
    setContents(next);
    if (next.length >= (order.kind === 'dissolve' ? 1 : 2)) {
      setPhase('busy');
      later(() => judge(next), order.kind === 'dissolve' ? 1300 : 750);
    }
  };

  const serve = () => {
    if (phase !== 'play') return;
    triesRef.current += 1;
    if (order.kind === 'state') {
      const now = stateAt(temp);
      if (now === order.target) return succeed([]);
      setMessage(
        `That's ${STATE_WORD[now]}, not ${STATE_WORD[order.target]}. ${
          { ice: 'Ice needs 0 °C or colder.', water: 'Liquid water is between 0 °C and 100 °C.', steam: 'Steam needs 100 °C or hotter.' }[order.target]
        }`,
      );
    } else if (order.kind === 'ph') {
      if (ph === order.target) return succeed([]);
      setMessage(ph < order.target ? `That's pH ${ph}: too acidic. Add base drops to go up.` : `That's pH ${ph}: too basic. Add acid drops to go down.`);
    }
    play('wrong');
  };

  const empty = () => {
    setContents([]);
    setPhase('play');
    setMessage('');
    play('whoosh');
  };

  const next = () => {
    if (index + 1 >= ORDERS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(scoreRef.current);
      }
      return;
    }
    const n = index + 1;
    const o = orders[n];
    setIndex(n);
    setContents([]);
    setPhase('play');
    setMessage('');
    setPour(null);
    if (o.kind === 'state') setTemp(o.start);
    if (o.kind === 'ph') setPh(o.start);
    triesRef.current = 0;
    play('whoosh');
  };

  // ─── Dragging from the shelf ───────────────────────────────────────────────

  const overFlask = (x: number, y: number) => {
    const r = flaskRef.current?.getBoundingClientRect();
    const pad = 24;
    return !!r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };

  const onItemDown = (e: ReactPointerEvent<HTMLButtonElement>, id: IngredientId) => {
    if (phase !== 'play' || e.button > 0) return;
    e.preventDefault();
    // A drag that ended on a disabled button never gets its click, so reset here.
    suppressClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    const d = { id, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false, over: false };
    dragRef.current = d;
    setDrag(d);
  };
  const onItemMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8;
    const nd = { ...d, x: e.clientX, y: e.clientY, moved, over: overFlask(e.clientX, e.clientY) };
    dragRef.current = nd;
    setDrag(nd);
  };
  const onItemUp = (e: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d?.moved) return;
    suppressClick.current = true;
    if (!cancelled && overFlask(e.clientX, e.clientY)) pourIn(d.id);
  };
  const onItemClick = (id: IngredientId) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    pourIn(id);
  };

  // ─── Words ─────────────────────────────────────────────────────────────────

  const goal = goalFor(order);
  let status = message;
  if (!status) {
    if (phase === 'busy') status = order.kind === 'dissolve' ? 'Stirring…' : 'Mixing…';
    else if (order.kind === 'state') status = `The flask is ${temp} °C. It's ${STATE_WORD[stateAt(temp)]}.`;
    else if (order.kind === 'ph') status = `The potion is pH ${ph}: ${phWord(ph) === 'neutral' ? 'neutral' : `a ${phWord(ph)}`}.`;
    else if (contents.length === 1 && order.kind !== 'dissolve') status = 'One more!';
    else status = order.kind === 'dissolve' ? 'Drag one jar to the flask.' : 'Drag a bottle to the flask, or tap it.';
  }

  return (
    <div className="potion-lab">
      <div className="pl-hud">
        <p className="pl-goal">{goal}</p>
        <div className="pl-stats">
          <button
            type="button"
            className="pl-icon"
            onClick={() => speak(`${goal} The order is: ${orderTitle(order)}. ${status}`, { force: true })}
            aria-label="Hear the goal"
          >
            <Volume2 size={18} />
          </button>
          <span className="pl-pill" aria-label={`Order ${index + 1} of ${ORDERS}`}>
            <FlaskRound size={15} /> {index + 1}/{ORDERS}
          </span>
          <span className="pl-pill" aria-label={`${score} points`}>
            <Star size={15} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className="pl-bench">
        <OrderCard order={order} number={index + 1} done={phase === 'done'} />
        <div ref={flaskRef} className={`pl-flask-zone${drag?.moved && drag.over ? ' over' : ''}`}>
          <Flask order={order} contents={contents} phase={phase} temp={temp} ph={ph} pour={pour} />
        </div>
        <div className="pl-shelf">
          {order.kind === 'state' ? (
            <TempControl value={temp} disabled={phase === 'done'} onChange={(t) => {
              if (stateAt(t) !== stateAt(temp)) play('pop');
              setTemp(t);
              setMessage('');
            }} />
          ) : (
            shelf.map((id) => (
              <button
                key={id}
                type="button"
                className={`pl-item${drag?.moved && drag.id === id ? ' lifted' : ''}`}
                disabled={phase !== 'play'}
                onPointerDown={(e) => onItemDown(e, id)}
                onPointerMove={onItemMove}
                onPointerUp={(e) => onItemUp(e)}
                onPointerCancel={(e) => onItemUp(e, true)}
                onClick={() => onItemClick(id)}
                aria-label={`Pour in ${nameOf(id)}`}
              >
                <Holder id={id} />
                <span className="pl-item-name">{cap(nameOf(id))}</span>
              </button>
            ))
          )}
          {order.kind === 'ph' && <PhStrip ph={ph} target={order.target} />}
        </div>
      </div>

      <div className="pl-foot" role="status">
        <p className={`pl-msg${phase === 'done' ? ' good' : phase === 'wrong' ? ' warn' : ''}`}>{status}</p>
        <div className="pl-actions">
          {phase === 'done' ? (
            <button type="button" className="btn primary" onClick={next} autoFocus>
              {index + 1 >= ORDERS ? 'Finish' : 'Next'} <ArrowRight size={18} />
            </button>
          ) : (
            <>
              {(order.kind === 'mix' || order.kind === 'fizz' || order.kind === 'dissolve') && (contents.length > 0 || phase === 'wrong') && (
                <button type="button" className={`btn${phase === 'wrong' ? ' primary' : ''}`} onClick={empty} disabled={phase === 'busy'}>
                  <RotateCcw size={16} /> Empty
                </button>
              )}
              {(order.kind === 'state' || order.kind === 'ph') && (
                <button type="button" className="btn primary" onClick={serve}>
                  Serve <ArrowRight size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {drag?.moved && (
        <div className="pl-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <Holder id={drag.id} tilt={drag.over} />
        </div>
      )}
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────────────────

function OrderCard({ order, number, done }: { order: Order; number: number; done: boolean }) {
  let swatch: string | null = null;
  if (order.kind === 'mix') swatch = MIXED_COLOR[order.target];
  if (order.kind === 'ph') swatch = indicator(order.target);
  return (
    <div className={`pl-order${done ? ' done' : ''}`}>
      <span className="pl-order-tag">Order {number}</span>
      <div className="pl-order-pic" aria-hidden>
        {swatch && <span className="pl-swatch" style={{ background: swatch }} />}
        {order.kind === 'fizz' && <FizzIcon />}
        {order.kind === 'state' && <StateIcon state={order.target} />}
        {order.kind === 'dissolve' && <ClearIcon />}
      </div>
      <strong className="pl-order-title">{orderTitle(order)}</strong>
      <span className="pl-order-note">{orderNote(order)}</span>
    </div>
  );
}

function FizzIcon() {
  return (
    <svg viewBox="0 0 60 60" className="pl-order-svg">
      {[
        [18, 40, 7],
        [32, 30, 9],
        [44, 44, 6],
        [26, 16, 5],
        [42, 14, 4],
      ].map(([x, y, r], k) => (
        <circle key={k} cx={x} cy={y} r={r} fill="white" stroke="var(--ink)" strokeWidth={2.5} />
      ))}
    </svg>
  );
}

function StateIcon({ state }: { state: WaterState }) {
  if (state === 'ice') return <Snowflake size={44} color="#3b82f6" strokeWidth={2.5} />;
  if (state === 'steam')
    return (
      <svg viewBox="0 0 60 60" className="pl-order-svg">
        {[16, 30, 44].map((x) => (
          <path key={x} d={`M${x} 52c-8-8 8-14 0-22s8-14 0-22`} fill="none" stroke="#94a3b8" strokeWidth={4} strokeLinecap="round" />
        ))}
      </svg>
    );
  return (
    <svg viewBox="0 0 60 60" className="pl-order-svg">
      <path d="M30 6C22 20 14 28 14 38a16 16 0 0 0 32 0C46 28 38 20 30 6Z" fill={WATER} stroke="var(--ink)" strokeWidth={2.5} />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 60 60" className="pl-order-svg">
      <rect x={12} y={8} width={36} height={46} rx={8} fill="#e8f3ff" stroke="var(--ink)" strokeWidth={2.5} />
      <path d="M18 22h10" stroke="white" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

/** A container on the shelf. */
function Holder({ id, tilt }: { id: IngredientId; tilt?: boolean }) {
  const ing = INGREDIENTS[id];
  const ink = { stroke: 'var(--ink)', strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  let art;
  switch (ing.holder) {
    case 'pot':
      art = (
        <>
          <path d="M14 26h36l-3 30H17Z" fill="white" {...ink} />
          <ellipse cx={32} cy={26} rx={18} ry={6} fill={ing.color} {...ink} />
          <path d="M44 28c0 6 3 8 3 12a3 3 0 0 1-6 0c0-4 3-6 3-12Z" fill={ing.color} stroke="none" />
          <rect x={20} y={38} width={24} height={10} rx={3} fill={ing.color} opacity={0.85} />
        </>
      );
      break;
    case 'bottle':
      art = (
        <>
          <rect x={26} y={4} width={12} height={9} rx={3} fill="#c08552" {...ink} />
          <path d="M27 12h10v8c8 3 11 8 11 14v20a5 5 0 0 1-5 5H21a5 5 0 0 1-5-5V34c0-6 3-11 11-14Z" fill="#f4f8fc" {...ink} />
          <path d="M18 36h28v18a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3Z" fill={ing.color} />
          <rect x={21} y={28} width={22} height={8} rx={2} fill="white" stroke="var(--line-2)" strokeWidth={1.5} />
          <path d="M27 12h10v8c8 3 11 8 11 14v20a5 5 0 0 1-5 5H21a5 5 0 0 1-5-5V34c0-6 3-11 11-14Z" fill="none" {...ink} />
        </>
      );
      break;
    case 'jar':
      art = (
        <>
          <rect x={14} y={10} width={36} height={9} rx={3} fill="#9b8cf2" {...ink} />
          <rect x={12} y={18} width={40} height={40} rx={9} fill="#f4f8fc" {...ink} />
          <path d={`M14 34h36v16a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z`} fill={ing.color} />
          {id === 'pebbles'
            ? [20, 30, 41, 25, 36].map((x, k) => <circle key={k} cx={x} cy={k < 3 ? 49 : 41} r={5} fill="#94a3b8" stroke="var(--ink)" strokeWidth={1.5} />)
            : [18, 24, 30, 36, 42, 46, 21, 33, 40].map((x, k) => <circle key={k} cx={x} cy={38 + ((k * 7) % 15)} r={1.4} fill={id === 'sand' ? '#a8763c' : '#b8c3d3'} />)}
          <rect x={12} y={18} width={40} height={40} rx={9} fill="none" {...ink} />
        </>
      );
      break;
    case 'dropper':
      art = (
        <>
          <path d="M24 6h16v12a8 8 0 0 1-16 0Z" fill={id === 'acid' ? 'var(--coral)' : 'var(--grape)'} {...ink} />
          <rect x={27} y={22} width={10} height={30} rx={3} fill="#eef5fd" {...ink} />
          <rect x={29} y={34} width={6} height={16} fill={ing.color} opacity={0.75} />
          <path d="M29 52h6l-3 8Z" fill="#eef5fd" {...ink} />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 64 64" className={`pl-holder${tilt ? ' tilt' : ''}`} aria-hidden>
      {art}
    </svg>
  );
}

function TempControl({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (t: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const grab = useRef(false);
  const pct = ((value - T_MIN) / (T_MAX - T_MIN)) * 100;
  const fromX = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    const t = T_MIN + ((x - r.left) / r.width) * (T_MAX - T_MIN);
    return Math.round(Math.max(T_MIN, Math.min(T_MAX, t)) / 5) * 5;
  };
  const set = (t: number) => {
    if (t !== value) onChange(t);
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    grab.current = true;
    set(fromX(e.clientX));
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (grab.current) set(fromX(e.clientX));
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    grab.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    if (disabled) return;
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    set(Math.max(T_MIN, Math.min(T_MAX, value + step)));
  };
  const at = (t: number) => `${((t - T_MIN) / (T_MAX - T_MIN)) * 100}%`;
  return (
    <div className="pl-temp">
      <div className="pl-temp-read">
        <Thermometer size={20} /> {value} °C
      </div>
      <div className="pl-temp-row">
        <Snowflake size={22} color="#3b82f6" aria-hidden />
        <div
          ref={ref}
          className={`pl-temp-track${disabled ? ' disabled' : ''}`}
          role="slider"
          tabIndex={0}
          aria-label="Temperature"
          aria-valuemin={T_MIN}
          aria-valuemax={T_MAX}
          aria-valuenow={value}
          aria-valuetext={`${value} degrees`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          {[0, 100].map((t) => (
            <span key={t} className="pl-tick" style={{ left: at(t) }}>
              <span>{t}°</span>
            </span>
          ))}
          <span className="pl-knob" style={{ left: `${pct}%` }}>
            {value <= 0 ? <Snowflake size={22} /> : value >= 100 ? <Flame size={22} /> : <Thermometer size={22} />}
          </span>
        </div>
        <Flame size={22} color="#f97316" aria-hidden />
      </div>
    </div>
  );
}

function PhStrip({ ph, target }: { ph: number; target: number }) {
  return (
    <div className="pl-ph" aria-label={`pH scale. Now ${ph}, target ${target}.`}>
      <div className="pl-ph-cells">
        {Array.from({ length: 15 }, (_, n) => (
          <span key={n} className={`pl-ph-cell${n === target ? ' target' : ''}`} style={{ background: indicator(n) }}>
            {n === ph && <span className="pl-ph-now" />}
          </span>
        ))}
      </div>
      <div className="pl-ph-labels" aria-hidden>
        <span>0 acid</span>
        <span>7 neutral</span>
        <span>base 14</span>
      </div>
    </div>
  );
}

// ─── The flask ─────────────────────────────────────────────────────────────────

const FLASK = 'M80 14H120V82L172 196Q180 216 160 220H40Q20 216 28 196L80 82Z';
const BOTTOM = 220;
const NECK = 82;
const levelY = (level: number) => BOTTOM - level * (BOTTOM - NECK);

function Flask({
  order,
  contents,
  phase,
  temp,
  ph,
  pour,
}: {
  order: Order;
  contents: IngredientId[];
  phase: Phase;
  temp: number;
  ph: number;
  pour: { id: IngredientId; n: number } | null;
}) {
  const clip = `pl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  let level = 0;
  let color = 'transparent';
  let piles: IngredientId[] = [];
  let fading = false;
  let cloudy = false;
  let fizz = false;
  let stir = false;
  const state = order.kind === 'state' ? stateAt(temp) : null;

  switch (order.kind) {
    case 'mix': {
      const paints = contents as Paint[];
      level = paints.length * 0.32;
      if (paints.length === 1) color = INGREDIENTS[paints[0]].color;
      if (paints.length >= 2) color = colorOf(mix(paints[0], paints[1]));
      stir = phase === 'busy';
      break;
    }
    case 'fizz': {
      const liquids = contents.filter((c) => INGREDIENTS[c].liquid);
      level = liquids.length * 0.3;
      if (liquids.length) color = INGREDIENTS[liquids[liquids.length - 1]].color;
      piles = contents.filter((c) => !INGREDIENTS[c].liquid);
      fizz = phase === 'done';
      fading = fizz;
      break;
    }
    case 'dissolve':
      level = 0.5;
      color = WATER;
      piles = contents;
      stir = phase === 'busy';
      fading = phase !== 'play' && contents.length > 0 && dissolves(contents[0] as Stuff);
      cloudy = phase !== 'play' && contents[0] === 'chalk';
      break;
    case 'state':
      level = 0.5;
      color = state === 'ice' ? '#dcecfb' : WATER;
      break;
    case 'ph':
      level = 0.55;
      color = indicator(ph);
      break;
  }
  const top = levelY(level);
  const hot = order.kind === 'state' ? Math.max(0, Math.min(1, (temp - 30) / 80)) : 0;
  const cold = order.kind === 'state' && temp <= 0;

  return (
    <svg viewBox="0 -44 200 290" className="pl-flask" role="img" aria-label="The flask">
      <defs>
        <clipPath id={clip}>
          <path d={FLASK} />
        </clipPath>
      </defs>

      {order.kind === 'state' && (
        <g>
          <ellipse cx={100} cy={228} rx={86} ry={14} fill={cold ? '#bfdbfe' : '#fb923c'} opacity={cold ? 0.7 : hot * 0.7} className="pl-heat" />
          <rect x={22} y={222} width={156} height={16} rx={6} fill="#cbd5e1" stroke="var(--ink)" strokeWidth={3} />
        </g>
      )}

      <path d={FLASK} fill="rgba(255,255,255,0.72)" />
      <g clipPath={`url(#${clip})`}>
        {level > 0 && <rect x={0} y={top} width={200} height={BOTTOM - top + 4} className="pl-liquid" style={{ fill: color }} />}
        {level > 0 && <rect x={0} y={top} width={200} height={4} fill="white" opacity={0.45} className="pl-liquid" />}
        {cloudy && <rect x={0} y={top} width={200} height={BOTTOM - top} fill="white" className="pl-cloud" />}

        {piles.map((id, k) => (
          <Pile key={`${id}${k}`} id={id} cx={100 + (k - (piles.length - 1) / 2) * 44} fading={fading && (order.kind === 'dissolve' || id === 'soda')} />
        ))}

        {state === 'ice' &&
          [
            [62, 168, -8],
            [100, 176, 6],
            [136, 166, -4],
            [84, 196, 10],
            [122, 196, -10],
          ].map(([x, y, r], k) => (
            <g key={k} transform={`rotate(${r} ${x} ${y})`}>
              <rect x={x - 15} y={y - 13} width={30} height={26} rx={6} fill="#eef6ff" stroke="#93c5fd" strokeWidth={2.5} />
              <path d={`M${x - 8} ${y - 6}l6 0`} stroke="white" strokeWidth={3} strokeLinecap="round" />
            </g>
          ))}
        {state === 'steam' &&
          [60, 84, 108, 132, 150, 76, 120].map((x, k) => (
            <circle key={k} cx={x} cy={210} r={4 + (k % 3) * 2} className="pl-boil" style={{ animationDelay: `${k * 0.17}s` }} />
          ))}

        {fizz &&
          [56, 74, 92, 110, 128, 146, 84, 120, 100].map((x, k) => (
            <circle key={k} cx={x} cy={214} r={3 + (k % 3) * 2} className="pl-bubble" style={{ animationDelay: `${k * 0.13}s` }} />
          ))}
      </g>

      {fizz && (
        <g className="pl-foam">
          {[
            [86, 70, 16],
            [112, 66, 18],
            [100, 46, 17],
            [90, 26, 14],
            [112, 18, 15],
            [100, 0, 14],
            [84, -12, 11],
            [118, -16, 12],
          ].map(([x, y, r], k) => (
            <circle key={k} cx={x} cy={y} r={r} fill="white" stroke="#cbd5e1" strokeWidth={2} />
          ))}
        </g>
      )}

      {state === 'steam' &&
        [84, 104, 120].map((x, k) => (
          <circle key={k} cx={x} cy={2} r={14} className="pl-steam" style={{ animationDelay: `${k * 0.5}s` }} />
        ))}

      {stir && (
        <g className="pl-rod">
          <rect x={96} y={-20} width={8} height={226} rx={4} fill="#eef5fd" stroke="var(--ink)" strokeWidth={2.5} />
        </g>
      )}

      {pour && <Pouring key={pour.n} id={pour.id} to={order.kind === 'ph' ? top : Math.min(top, 200)} />}

      <path d={FLASK} fill="none" stroke="var(--ink)" strokeWidth={4} strokeLinejoin="round" />
      <rect x={72} y={6} width={56} height={12} rx={6} fill="white" stroke="var(--ink)" strokeWidth={4} />
      <path d="M58 150q-6 26 4 40" fill="none" stroke="white" strokeWidth={6} strokeLinecap="round" opacity={0.8} />

      {order.kind === 'ph' && (
        <text x={100} y={240} className="pl-flask-label">
          pH {ph}
        </text>
      )}
    </svg>
  );
}

function Pile({ id, cx, fading }: { id: IngredientId; cx: number; fading: boolean }) {
  const color = INGREDIENTS[id].color;
  return (
    <g className={`pl-pile${fading ? ' fading' : ''}`}>
      {id === 'pebbles' ? (
        [-16, 0, 16, -8, 8].map((dx, k) => (
          <ellipse key={k} cx={cx + dx} cy={k < 3 ? 212 : 200} rx={9} ry={7} fill={color} stroke="var(--ink)" strokeWidth={2} />
        ))
      ) : (
        <>
          <path d={`M${cx - 34} 222Q${cx} 186 ${cx + 34} 222Z`} fill={color} stroke={id === 'sand' ? '#a8763c' : '#b8c3d3'} strokeWidth={2} />
          {[-14, -4, 6, 16, -8, 10].map((dx, k) => (
            <circle key={k} cx={cx + dx} cy={k < 4 ? 214 : 206} r={1.6} fill={id === 'sand' ? '#a8763c' : '#b8c3d3'} />
          ))}
        </>
      )}
    </g>
  );
}

/** A stream, a drop or a sprinkle falling into the flask. */
function Pouring({ id, to }: { id: IngredientId; to: number }) {
  const ing = INGREDIENTS[id];
  if (ing.holder === 'dropper') {
    return <circle cx={100} cy={-24} r={7} fill={ing.color} stroke="var(--ink)" strokeWidth={2} className="pl-drop" style={{ ['--fall' as string]: `${to + 24}px` }} />;
  }
  if (!ing.liquid) {
    return (
      <g>
        {[-8, 0, 8, -4, 4, 0].map((dx, k) => (
          <circle
            key={k}
            cx={100 + dx}
            cy={-24}
            r={3.5}
            fill={id === 'pebbles' ? '#94a3b8' : ing.color}
            stroke="var(--ink)"
            strokeWidth={1}
            className="pl-drop"
            style={{ ['--fall' as string]: `${200}px`, animationDelay: `${k * 0.06}s` }}
          />
        ))}
      </g>
    );
  }
  return <rect x={94} y={-30} width={12} height={to + 30} rx={6} fill={ing.color} stroke="var(--ink)" strokeWidth={2} className="pl-stream" />;
}

export const game: Game = {
  id: 'potion-lab',
  subject: 'science',
  topic: 'chemistry',
  title: 'Potion Lab',
  blurb: 'Mix, fizz, freeze and test potions.',
  howTo: 'Read the order card, then drag ingredients into the flask. Watch what happens: colours mix, bubbles fizz, water freezes or boils, and indicator changes colour.',
  howToByBand: [
    'Make the colour on the order card. Tap two paint bottles, or drag them into the flask. If the colour is wrong, press Empty and try two different paints.',
    'Make a fizzy potion. Tap or drag two ingredients into the flask. Look for baking soda and an acid. If nothing fizzes, press Empty and try another pair.',
    'Read the order. Heat or cool water to make ice, liquid water or steam, then press Serve. On clear-potion rounds, add something that dissolves. Press Empty to try again.',
    'Read the target pH. Each acid drop lowers pH by 1 and each base drop raises it by 1. Tap the bottles or drag them to the flask. Reach the target, then press Serve.',
  ],
  color: '#8b5cf6',
  icon: FlaskRound,
  scoreLabel: 'orders right first time',
  Play,
};
