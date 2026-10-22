import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Check, Sprout, Star, Volume2 } from 'lucide-react';
import type { Game, GameProps } from '../types';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { EMOJI_FONT } from '../reading/words';
import { targetAt, useDrag } from '../shared/useDrag';
import { Bloom, BigLeaf, NeedPlant, PART_SPOTS, PartsPlant, PhotoIcon, StageIcon, SunIcon, WateringCan } from './Drawings';
import { beeLand, EQUATION, makeRounds, needsWhy, PHOTO_LABELS, pollinated, ROUNDS, STAGES } from './rounds';
import type { BeeState, Piece, Round, StageId } from './rounds';
import './garden-lab.css';

const ATTR = 'gl-target';
const NO_BEE: BeeState = { from: null, fruit: [] };
const FRUIT_NAME: Record<string, string> = { apple: 'an apple', lemon: 'a lemon', pea: 'a pea pod', pumpkin: 'a pumpkin' };
const an = (word: string) => `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;

function SayButton({ text, label }: { text: string; label: string }) {
  return (
    <button type="button" className="garden-lab-say" onClick={() => speak(text, { force: true })} aria-label={label} title="Hear it">
      <Volume2 size={15} />
    </button>
  );
}

function PieceFace({ piece, round }: { piece: Piece; round: Round }) {
  let icon: ReactNode = null;
  if (round.mode === 'needs') icon = piece.id === 'water' ? <WateringCan size={52} /> : <SunIcon size={52} />;
  else if (round.mode === 'cycle') icon = <StageIcon stage={piece.id as StageId} crop={round.crop} size={52} />;
  else if (round.mode === 'photo') icon = <PhotoIcon id={piece.id} size={40} />;
  return (
    <>
      {icon}
      <span>{piece.label}</span>
    </>
  );
}

function Play({ band, onFinish }: GameProps) {
  const [rounds] = useState(() => makeRounds(band));
  const [roundNo, setRoundNo] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [slips, setSlips] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [fact, setFact] = useState<{ text: string; good: boolean; eq?: boolean } | null>(null);
  const [cheer, setCheer] = useState(false);
  const [puddles, setPuddles] = useState<string[]>([]);
  const [bee, setBee] = useState<BeeState>(NO_BEE);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);
  const round: Round = rounds[roundNo];

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const finishRound = () => {
    const next = score + (slips === 0 ? 1 : 0);
    setScore(next);
    play('correct');
    setCheer(true);
    if (round.mode === 'photo') setFact({ text: EQUATION, good: true, eq: true });
    later(
      () => {
        setCheer(false);
        if (roundNo + 1 >= ROUNDS) {
          if (!finished.current) {
            finished.current = true;
            onFinish(next);
          }
          return;
        }
        setRoundNo(roundNo + 1);
        setPlaced([]);
        setSlips(0);
        setFact(null);
        setPuddles([]);
        setBee(NO_BEE);
      },
      round.mode === 'photo' ? 3400 : 2000,
    );
  };

  const miss = (pieceId: string, text: string) => {
    play('wrong');
    setSlips((n) => n + 1);
    setShake(pieceId);
    later(() => setShake((k) => (k === pieceId ? null : k)), 450);
    setFact({ text, good: false });
  };

  const landBee = (flowerId: string) => {
    if (round.mode !== 'pollinate') return;
    const kindOf = (id: string | null) => round.kinds.find((k) => k.id === round.flowers.find((f) => f.id === id)?.kind)!;
    const { result, state } = beeLand(round.flowers, bee, flowerId);
    const kind = kindOf(flowerId);
    setBee(state);
    if (result === 'pickup') {
      play('pop');
      setFact({ text: `The bee picked up ${kind.name} pollen. Now visit another ${kind.name} flower.`, good: true });
    } else if (result === 'same') {
      play('tap');
      setFact({ text: 'Fly to a different flower of the same kind.', good: false });
    } else if (result === 'done') {
      play('tap');
      setFact({ text: 'This flower is already growing fruit.', good: false });
    } else if (result === 'wrong') {
      const carried = kindOf(bee.from);
      miss('bee', `That is ${an(kind.name)} flower. ${carried.name[0].toUpperCase()}${carried.name.slice(1)} pollen only works on ${carried.name} flowers.`);
    } else {
      play('pop');
      setFact({ text: `Pollinated! This flower can now grow into ${FRUIT_NAME[kind.id] ?? 'a fruit'} with seeds inside.`, good: true });
      if (pollinated(round.flowers, state.fruit)) finishRound();
    }
  };

  const attempt = (pieceId: string, targetId: string) => {
    if (cheer) return;
    setSelected(null);
    setHover(null);
    if (round.mode === 'pollinate') {
      landBee(targetId);
      return;
    }
    const piece = round.pieces.find((p) => p.id === pieceId);
    if (!piece || placed.includes(pieceId)) return;
    if (piece.target === targetId) {
      play('pop');
      const next = [...placed, pieceId];
      setPlaced(next);
      setFact({ text: piece.fact, good: true });
      if (next.length === round.pieces.length) finishRound();
      return;
    }
    let text = piece.why ?? 'Not there. Try another spot!';
    if (round.mode === 'needs') {
      const plant = round.plants.find((p) => p.id === targetId);
      text = needsWhy(pieceId as 'water' | 'light', plant?.need ?? 'none');
      if (pieceId === 'water') setPuddles((p) => (p.includes(targetId) ? p : [...p, targetId]));
    } else if (round.mode === 'cycle') {
      text = 'That step comes at another time. Follow the arrows round.';
    } else if (round.mode === 'parts') {
      text = 'Not that part. Look again!';
    }
    miss(pieceId, text);
  };

  const { offset, bind } = useDrag({
    onMove: (_id, x, y) => setHover(targetAt(ATTR, x, y)),
    onDrop: (id, x, y) => {
      const t = targetAt(ATTR, x, y);
      if (t) attempt(id, t);
      else setHover(null);
    },
    onTap: (id) => {
      play('tap');
      setSelected((s) => (s === id ? null : id));
    },
  });

  const tapTarget = (targetId: string) => {
    if (selected) attempt(selected, targetId);
  };

  const card = (id: string, className: string, children: ReactNode) => {
    const moving = offset?.id === id;
    return (
      <button
        key={`${roundNo}-${id}`}
        type="button"
        className={`garden-lab-card ${className}${moving ? ' dragging' : ''}${selected === id ? ' selected' : ''}${shake === id ? ' shake' : ''}`}
        style={moving ? { transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.06)` } : undefined}
        {...bind(id)}
      >
        {children}
      </button>
    );
  };

  /** Common props for a drop target. */
  const target = (id: string, open: boolean, className: string) => ({
    type: 'button' as const,
    'data-gl-target': open ? id : undefined,
    className: `${className}${hover === id && open ? ' hover' : ''}${selected && open ? ' ready' : ''}`,
    onClick: () => open && tapTarget(id),
  });

  const left = round.mode === 'pollinate' ? [] : round.pieces.filter((p) => !placed.includes(p.id));
  const goal = cheer ? 'Well done!' : selected ? (round.mode === 'pollinate' ? 'Now tap a flower.' : 'Now tap where it goes.') : round.goal;

  let stage: ReactNode = null;
  if (round.mode === 'needs') {
    stage = (
      <div className="garden-lab-pots">
        {round.plants.map((p) => {
          const helped = round.pieces.some((pc) => pc.target === p.id && placed.includes(pc.id));
          return (
            <button key={`${roundNo}-${p.id}`} {...target(p.id, !helped, `garden-lab-pot${helped ? ' done' : p.need === 'light' ? ' shade' : ''}`)} aria-label="Plant">
              <NeedPlant need={p.need} helped={helped} petal={p.petal} puddle={puddles.includes(p.id)} />
            </button>
          );
        })}
      </div>
    );
  } else if (round.mode === 'cycle') {
    stage = (
      <div className="garden-lab-ring">
        <svg viewBox="0 0 100 100" className="garden-lab-svg" aria-hidden>
          <circle cx={50} cy={50} r={36} fill="none" stroke="var(--line-2)" strokeWidth={1.2} strokeDasharray="2 2" />
          {STAGES.map((_, i) => {
            const a = ((-90 + 36 + i * 72) * Math.PI) / 180;
            return (
              <path
                key={i}
                d="M-2.6 -3.2 L2.6 0 L-2.6 3.2"
                fill="none"
                stroke="var(--leaf)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                transform={`translate(${50 + 36 * Math.cos(a)} ${50 + 36 * Math.sin(a)}) rotate(${-90 + 36 + i * 72 + 90})`}
              />
            );
          })}
        </svg>
        {STAGES.map((s, i) => {
          const a = ((-90 + i * 72) * Math.PI) / 180;
          const filled = round.given.includes(s.id) || placed.includes(s.id);
          const pos = { left: `${50 + 36 * Math.cos(a)}%`, top: `${50 + 36 * Math.sin(a)}%` } as CSSProperties;
          return (
            <button key={`${roundNo}-${s.id}`} {...target(`slot-${i}`, !filled, `garden-lab-slot${filled ? ' done' : ''}${placed.includes(s.id) ? ' new' : ''}`)} style={pos} aria-label={filled ? s.label : `Empty step ${i + 1}`}>
              {filled ? (
                <>
                  <StageIcon stage={s.id} crop={round.crop} size={64} />
                  <span className="garden-lab-slot-label">{s.label}</span>
                </>
              ) : (
                <span className="garden-lab-slot-n">{i + 1}</span>
              )}
              {i === 0 && <span className="garden-lab-start">Start</span>}
            </button>
          );
        })}
      </div>
    );
  } else if (round.mode === 'pollinate') {
    const carried = round.kinds.find((k) => k.id === round.flowers.find((f) => f.id === bee.from)?.kind);
    stage = (
      <>
        <div className="garden-lab-meadow">
          {round.flowers.map((f) => {
            const kind = round.kinds.find((k) => k.id === f.kind)!;
            const fruit = bee.fruit.includes(f.id);
            return (
              <button key={`${roundNo}-${f.id}`} {...target(f.id, true, `garden-lab-bloom${fruit ? ' fruit' : ''}${bee.from === f.id ? ' source' : ''}`)} aria-label={`${kind.name} ${fruit ? 'fruit' : 'flower'}`}>
                <Bloom kind={kind} fruit={fruit} />
                <span className="garden-lab-bloom-name">{kind.name}</span>
              </button>
            );
          })}
        </div>
        <div className="garden-lab-tray">
          {card(
            'bee',
            'bee',
            <>
              <span className="garden-lab-bee" style={{ fontFamily: EMOJI_FONT }} aria-hidden>
                🐝
              </span>
              {carried && <span className="garden-lab-pollen" style={{ background: carried.petal }} aria-hidden />}
              <span>{carried ? `${carried.name} pollen` : 'Bee'}</span>
            </>,
          )}
        </div>
      </>
    );
  } else if (round.mode === 'parts') {
    stage = (
      <div className="garden-lab-plant">
        <PartsPlant petal={round.petal} />
        {round.targets.map((t) => {
          const done = placed.includes(t.id);
          const [x, y] = PART_SPOTS[t.id];
          const pos = { left: `${(x / 300) * 100}%`, top: `${(y / 420) * 100}%` } as CSSProperties;
          return (
            <span key={`${roundNo}-${t.id}`} className="garden-lab-spot-wrap" style={pos}>
              <button {...target(t.id, !done, `garden-lab-spot${done ? ' done' : ''}`)} aria-label={done ? t.label : 'Empty label spot'} disabled={done}>
                {done && <Check size={16} strokeWidth={3} />}
              </button>
              {done && <span className="garden-lab-tag">{t.label}</span>}
            </span>
          );
        })}
      </div>
    );
  } else {
    const zone = (id: string, label: string) => {
      const chips = [...(id === 'in' ? round.given : []), ...round.pieces.filter((p) => p.target === id && placed.includes(p.id)).map((p) => p.id)];
      return (
        <button key={id} {...target(id, true, `garden-lab-zone zone-${id}${cheer ? ' cheer' : ''}`)}>
          <span className="garden-lab-zone-name">{label}</span>
          <span className="garden-lab-zone-items">
            {chips.map((c) => (
              <span key={c} className={`garden-lab-chip${round.given.includes(c) ? ' given' : ''}`}>
                <PhotoIcon id={c} size={20} />
                {PHOTO_LABELS[c] ?? round.pieces.find((p) => p.id === c)?.label}
              </span>
            ))}
          </span>
        </button>
      );
    };
    stage = (
      <div className="garden-lab-photo">
        {zone('in', 'Goes in')}
        <div className={`garden-lab-leaf${cheer ? ' cheer' : ''}`}>
          <BigLeaf />
        </div>
        {zone('out', 'Comes out')}
        {zone('not', 'Not part of it')}
      </div>
    );
  }

  return (
    <div className={`garden-lab mode-${round.mode}`}>
      <div className="garden-lab-hud">
        <p className="garden-lab-goal">
          {goal}
          <SayButton text={goal} label="Hear the goal" />
        </p>
        <div className="garden-lab-stats">
          <span className="garden-lab-pill">
            {Math.min(roundNo + 1, ROUNDS)}/{ROUNDS}
          </span>
          <span className="garden-lab-pill">
            <Star size={14} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <p className={`garden-lab-fact${fact ? (fact.good ? ' good' : ' bad') : ''}${fact?.eq ? ' eq' : ''}`} role="status">
        {fact ? fact.text : ' '}
        {fact?.good && <SayButton text={fact.eq ? 'Carbon dioxide plus water, with sunlight, makes sugar plus oxygen.' : fact.text} label="Hear this" />}
      </p>

      <div className="garden-lab-board">
        {stage}
        {round.mode !== 'pollinate' && (
          <div className="garden-lab-tray" aria-label="Pieces to place">
            {left.map((p) => card(p.id, round.mode, <PieceFace piece={p} round={round} />))}
          </div>
        )}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'garden-lab',
  subject: 'science',
  topic: 'biology',
  title: 'Garden Lab',
  blurb: 'Care for plants, grow them from seed, and see how leaves make food.',
  howTo: 'Drag each card or tool to the right place. You can also tap a card, then tap where it goes.',
  howToByBand: [
    'Help the plants: give water to a dry, droopy plant and sunlight to a pale plant. Happy plants need nothing. Drag a tool to a plant, or tap the tool and then the plant.',
    'Follow the arrows to build a plant’s life story, from seed to fruit. Fill the empty steps. Drag a card to a space, or tap the card and then the space.',
    'Help the bee carry pollen between different flowers of the same kind. On label rounds, put each plant-part card in its spot. Drag a card or bee, or tap it and then its target.',
    'Sort what a leaf uses to make food: what goes in, what comes out, and what is not part of it. Drag each card to a group, or tap the card and then the group.',
  ],
  color: '#14b8a6',
  icon: Sprout,
  scoreLabel: 'rounds right first time',
  Play,
};
