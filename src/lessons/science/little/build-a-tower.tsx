import { useEffect, useRef, useState } from 'react';
import { Building2, Hammer, RefreshCw } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from '../sparks/visuals/DragToken';
import { MessageBox } from './visuals/MessageBox';

/**
 * Engineering for little ones: build a tower, predict whether it survives a wobble, test, improve.
 * The rule kept true and simple: a wide base is steady; a wide block on a narrower one tips over,
 * and nothing can sit on a pointy roof.
 */
interface Block {
  id: string;
  name: string;
  w: number;
  color: string;
  roof?: boolean;
}

const BLOCKS: Block[] = [
  { id: 'big', name: 'big', w: 220, color: C.blue },
  { id: 'medium', name: 'middle-sized', w: 160, color: C.green },
  { id: 'small', name: 'small', w: 110, color: C.yellow },
  { id: 'tiny', name: 'tiny', w: 70, color: C.red },
  { id: 'roof', name: 'pointy roof', w: 140, color: C.orange, roof: true },
];
const byId = (id: string) => BLOCKS.find((b) => b.id === id)!;

const BH = 54; // block height
const GROUND = 560;
const CX = 330; // tower centre
const BUILD = { x: 70, y: 70, w: 520, h: GROUND - 70 };
const TRAY_SLOTS: Pt[] = [
  { x: 700, y: 390 },
  { x: 880, y: 390 },
  { x: 700, y: 470 },
  { x: 880, y: 470 },
  { x: 790, y: 550 },
];
const TRAY_SCALE = 0.68;

const STANDS = 'It stands';
const FALLS = 'It falls';

/** Index of the first block that sits on a narrower block (it and everything above will tip), or -1. */
function firstToTip(stack: string[]): number {
  for (let i = 1; i < stack.length; i++) if (byId(stack[i]).w > byId(stack[i - 1]).w) return i;
  return -1;
}

function BlockShape({ b, scale = 1 }: { b: Block; scale?: number }) {
  const w = b.w * scale;
  const h = (b.roof ? 70 : BH) * scale;
  if (b.roof) {
    return (
      <polygon
        points={`${-w / 2},${h / 2} ${w / 2},${h / 2} 0,${-h / 2}`}
        fill={b.color}
        stroke={C.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    );
  }
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6 * scale} fill={b.color} stroke={C.ink} strokeWidth={2.5} />
      <rect x={-w / 2 + 6 * scale} y={-h / 2 + 6 * scale} width={w - 12 * scale} height={8 * scale} rx={4} fill={shade(b.color, 0.35)} />
    </g>
  );
}

function TowerScene() {
  const [stack, setStack] = useState<string[]>(['small', 'big']);
  const [guess, setGuess] = useState<string | null>(null);
  const [t, setT] = useState(0); // wobble test progress 0..1
  const [tested, setTested] = useState(false);
  const [message, setMessage] = useState('Drag blocks onto the table to build a tower.');
  const [shake, setShake] = useState<Record<string, number>>({});
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const tip = firstToTip(stack);
  const top = stack.length ? byId(stack[stack.length - 1]) : null;
  const testing = t > 0 && !tested;

  const nope = (id: string, text: string) => {
    play('wrong');
    setShake((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
    setMessage(text);
  };

  const add = (id: string) => {
    if (testing || tested) return;
    if (stack.length >= 5) return nope(id, 'That’s tall enough! Test it, or take a block off.');
    if (top?.roof) return nope(id, 'Nothing can sit on the pointy roof. It would slide off!');
    setStack((s) => [...s, id]);
    setGuess(null);
    play('pop');
    setMessage(byId(id).roof ? 'A roof on top! Ready to test?' : `You added the ${byId(id).name} block.`);
  };

  const takeTop = () => {
    if (!stack.length) return;
    setStack((s) => s.slice(0, -1));
    setGuess(null);
    play('tap');
  };

  const wobble = () => {
    window.clearInterval(timer.current);
    play('tap');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let k = 0;
    const steps = reduce ? 1 : 40;
    timer.current = window.setInterval(() => {
      k += 1;
      setT(k / steps);
      if (k >= steps) {
        window.clearInterval(timer.current);
        setTested(true);
        play(firstToTip(stack) < 0 ? 'correct' : 'wrong');
      }
    }, 35);
  };

  const again = () => {
    // Fallen blocks go back to the tray; the part that stood stays, ready to improve.
    if (tip >= 0) setStack((s) => s.slice(0, tip));
    setGuess(null);
    setT(0);
    setTested(false);
    setMessage(tip >= 0 ? 'Rebuild it: wide blocks at the bottom!' : 'Can you build it even taller?');
  };

  const reset = () => {
    window.clearInterval(timer.current);
    setStack([]);
    setGuess(null);
    setT(0);
    setTested(false);
    setMessage('Drag blocks onto the table to build a tower.');
  };

  // Where each tower block is drawn (with the wobble and the fall).
  const shakeX = t > 0 && t < 0.5 ? Math.sin(t * 60) * 9 * (1 - t * 2) : 0;
  const fall = tip >= 0 ? Math.max(0, Math.min(1, (t - 0.45) / 0.55)) : 0;
  let y = GROUND;
  // Fallen blocks land flat on the table, on alternate sides of what is still standing, in little piles.
  const standHalf = tip > 0 ? Math.max(...stack.slice(0, tip).map((id) => byId(id).w)) / 2 : 0;
  const pile = { 1: GROUND, [-1]: GROUND } as Record<number, number>;
  const placed = stack.map((id, i) => {
    const b = byId(id);
    const h = b.roof ? 70 : BH;
    y -= h;
    const cy = y + h / 2;
    const falling = tip >= 0 && i >= tip;
    const k = i - tip;
    const side = k % 2 === 0 ? 1 : -1;
    let x = CX + shakeX * (i + 1) * 0.5;
    let yy = cy;
    let rot = shakeX * 0.4;
    if (falling) {
      const restX = Math.min(BUILD.x + BUILD.w - b.w / 2, Math.max(BUILD.x + b.w / 2, CX + side * (standHalf + 24 + b.w / 2)));
      const restY = pile[side] - h / 2;
      pile[side] -= h;
      x += (restX - CX) * fall;
      yy = cy + (restY - cy) * fall * fall;
      rot = side * Math.sin(fall * Math.PI) * 50;
    }
    return { b, x, y: yy, rot, i };
  });

  const inTray = BLOCKS.filter((b) => !stack.includes(b.id));
  const height = stack.length;

  return (
    <SceneSvg label="Build a tower from blocks and test it with a wobble">
      {/* Table */}
      <rect x={BUILD.x} y={BUILD.y} width={BUILD.w} height={BUILD.h} rx={18} fill={shade(C.blue, 0.9)} stroke={C.line} strokeWidth={2} strokeDasharray="8 6" />
      <rect x={60} y={GROUND} width={540} height={20} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
      <text x={BUILD.x + 18} y={BUILD.y + 34} fontSize={16} fill={C.muted} className="caps">
        Build here
      </text>
      <text x={BUILD.x + BUILD.w - 18} y={BUILD.y + 34} textAnchor="end" fontSize={18} fontWeight={700} fill={C.ink}>
        {height} {height === 1 ? 'block' : 'blocks'} tall
      </text>

      {placed.map(({ b, x, y: yy, rot, i }) => (
        <g
          key={b.id}
          transform={`translate(${x} ${yy}) rotate(${rot})`}
          onClick={() => i === stack.length - 1 && !testing && !tested && takeTop()}
          style={{ cursor: i === stack.length - 1 && !tested ? 'pointer' : undefined }}
          role={i === stack.length - 1 ? 'button' : undefined}
          aria-label={i === stack.length - 1 ? `Take the ${b.name} block off` : undefined}
          data-nopan
        >
          <BlockShape b={b} />
        </g>
      ))}

      {/* Predict / explain */}
      {stack.length < 2 ? (
        <MessageBox x={620} y={30} w={340} h={92} text="Build a tower with 2 or more blocks, then test it." max={30} size={17} />
      ) : tested ? (
        <ExplainCard
          x={620}
          y={30}
          w={340}
          prediction={guess}
          actual={tip < 0 ? STANDS : FALLS}
          because={
            tip < 0
              ? 'Big, wide blocks at the bottom make a strong, steady base.'
              : `The ${byId(stack[tip]).name} block was wider than the one under it, so it tipped. Wide blocks go at the bottom.`
          }
          onAgain={again}
        />
      ) : (
        <PredictCard x={620} y={30} w={340} question="Will your tower stand?" options={[STANDS, FALLS]} prediction={guess} onPredict={setGuess} />
      )}

      {!tested && (
        <SvgButton
          x={620}
          y={guess ? 140 : 176}
          w={340}
          h={52}
          fontSize={18}
          label={testing ? 'Wobbling…' : 'Wobble the table ▶'}
          onClick={wobble}
          disabled={!guess || stack.length < 2 || testing}
          color={C.teal}
          textColor={C.white}
        />
      )}

      {/* Tray */}
      <rect x={620} y={330} width={340} height={260} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={640} y={356} fontSize={15} fill={C.muted} className="caps">
        Blocks
      </text>
      {inTray.map((b) => {
        const slot = TRAY_SLOTS[BLOCKS.indexOf(b)];
        return (
          <DragToken
            key={`${b.id}-${stack.length}`}
            x={slot.x}
            y={slot.y}
            label={`${b.name} block`}
            shakeKey={shake[b.id] ?? 0}
            disabled={testing || tested}
            onTap={() => add(b.id)}
            onDrop={(p) => {
              if (p.x >= BUILD.x && p.x <= BUILD.x + BUILD.w && p.y >= BUILD.y && p.y <= GROUND + 20) add(b.id);
            }}
          >
            <rect x={-80} y={-34} width={160} height={68} fill="transparent" />
            <BlockShape b={b} scale={TRAY_SCALE} />
          </DragToken>
        );
      })}

      <SvgButton x={620} y={606} w={165} h={50} fontSize={16} label="Take top off" onClick={takeTop} disabled={!stack.length || testing || tested} />
      <SvgButton x={795} y={606} w={165} h={50} fontSize={16} label="Start again" onClick={reset} />
      <MessageBox x={60} y={600} w={540} h={58} text={message} max={56} size={16} />

      <Callout at={[CX - 90, GROUND - 20]} box={[90, 110]} w={240} icon={Building2} title="A wide base is steady" />
    </SceneSvg>
  );
}

/** A small tower for question cards, bottom block first. */
export function TowerPicture({ ids }: { ids: string[] }) {
  let y = 132;
  return (
    <svg viewBox="0 0 180 140" role="img" aria-label={`A tower: ${ids.map((id) => byId(id).name).join(', ')} from the bottom`}>
      <rect x={10} y={132} width={160} height={6} rx={3} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      {ids.map((id) => {
        const b = byId(id);
        const h = (b.roof ? 70 : BH) * 0.5;
        y -= h;
        return (
          <g key={id} transform={`translate(90 ${y + h / 2})`}>
            <BlockShape b={b} scale={0.5} />
          </g>
        );
      })}
    </svg>
  );
}

function BlockPicture({ id }: { id: string }) {
  const b = byId(id);
  return (
    <svg viewBox="-70 -45 140 90" role="img" aria-label={`${b.name} block`}>
      <BlockShape b={b} scale={0.55} />
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={14} y={70} width={92} height={6} rx={3} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      <rect x={28} y={52} width={64} height={18} rx={3} fill={C.blue} stroke={C.ink} strokeWidth={2} />
      <rect x={38} y={34} width={44} height={18} rx={3} fill={C.green} stroke={C.ink} strokeWidth={2} />
      <rect x={46} y={18} width={28} height={16} rx={3} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
      <polygon points="44,18 76,18 60,4" fill={C.orange} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

const STEADY = ['big', 'medium', 'small'];
const WOBBLY = ['small', 'medium', 'big'];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const kind = pick(['steadier', 'bottom'] as const);
    if (kind === 'steadier') {
      const options = shuffle([
        { value: 'wide', label: <TowerPicture ids={STEADY} />, name: 'the tower with the big block at the bottom' },
        { value: 'narrow', label: <TowerPicture ids={WOBBLY} />, name: 'the tower with the small block at the bottom' },
      ]);
      return {
        prompt: 'Which tower is steadier?',
        choices: options,
        answer: 'wide',
        hint: 'Look at the block at the bottom of each tower.',
        explain: ['One tower has a big block at the bottom.', 'A wide base holds the tower steady.', 'So the tower with the big block at the bottom is steadier.'],
      };
    }
    return {
      prompt: 'Which block should go at the bottom?',
      choices: shuffle(['big', 'tiny', 'roof']).map((id) => ({ value: id, label: <BlockPicture id={id} />, name: `the ${byId(id).name} block` })),
      answer: 'big',
      hint: 'The bottom block holds up all the others.',
      explain: ['The bottom block holds up the whole tower.', 'A wide block makes a steady base.', 'So the big block goes at the bottom.'],
    };
  }
  if (level === 1) {
    const kind = pick(['roof', 'next'] as const);
    if (kind === 'roof') {
      return {
        prompt: 'Where should the pointy roof go?',
        visual: <BlockPicture id="roof" />,
        choices: [
          { value: 'top', name: 'on the top' },
          { value: 'middle', name: 'in the middle' },
          { value: 'bottom', name: 'at the bottom' },
        ].map((c) => ({ ...c, label: c.name })),
        answer: 'top',
        hint: 'Could a block sit on a pointy top?',
        explain: ['The roof has a pointy top.', 'Nothing can sit on a point. It would slide off.', 'So the roof goes on the top.'],
      };
    }
    return {
      prompt: 'The big block is at the bottom. Which block should go on it next?',
      visual: <TowerPicture ids={['big']} />,
      choices: shuffle(['medium', 'roof', 'tiny']).map((id) => ({ value: id, label: <BlockPicture id={id} />, name: `the ${byId(id).name} block` })),
      answer: 'medium',
      hint: 'Go from biggest to smallest, and keep the roof for the very top.',
      explain: ['Each block should be a bit smaller than the one under it.', 'The roof only goes on the very top.', 'So the middle-sized block goes next.'],
    };
  }
  const kind = pick(['fix', 'stand'] as const);
  if (kind === 'fix') {
    const options = shuffle([
      { value: 'swap', name: 'Put the big block at the bottom' },
      { value: 'taller', name: 'Add more blocks on top' },
      { value: 'harder', name: 'Wobble it harder' },
    ]);
    return {
      prompt: 'This tower fell over in the wobble test. What should we change?',
      visual: <TowerPicture ids={WOBBLY} />,
      choices: options.map((c) => ({ ...c, label: c.name })),
      answer: 'swap',
      hint: 'Look at the bottom of the tower. Is it wide?',
      explain: ['The small block at the bottom made the tower wobbly.', 'Big blocks at the bottom make a steady base.', 'So: put the big block at the bottom and test again.'],
    };
  }
  const good = shuffle(['big', 'medium', 'small', 'tiny']).slice(0, 3).sort((a, b) => byId(b).w - byId(a).w);
  const bad1 = [...good].reverse();
  const bad2 = [good[1], good[0], good[2]];
  const options = shuffle([
    { value: 'good', label: <TowerPicture ids={good} />, name: 'the tower that gets smaller as it goes up' },
    { value: 'bad1', label: <TowerPicture ids={bad1} />, name: 'the tower that gets bigger as it goes up' },
    { value: 'bad2', label: <TowerPicture ids={bad2} />, name: 'the tower with a big block on a smaller one' },
  ]);
  return {
    prompt: 'We will wobble all three. Which tower will stand?',
    choices: options,
    answer: 'good',
    hint: 'Check every block: is it on a block that is wider than it?',
    explain: ['A block on a narrower block tips over.', 'One tower gets smaller and smaller as it goes up.', 'So the tower that gets smaller as it goes up will stand.'],
  };
}

export const buildATower: Lesson = {
  id: 'build-a-tower',
  title: 'Tall Towers',
  Thumb,
  Scene: TowerScene,
  sceneHint: 'Drag blocks onto the table · Guess, then wobble the table · Fix it and test again',
  learn: {
    heading: 'Tall, steady towers',
    intro: 'Engineers build things, test them and make them better. A tower stands best with big, wide blocks at the bottom and smaller ones on top.',
    points: [
      { icon: Building2, text: 'A wide base keeps a tower steady.' },
      { icon: Hammer, text: 'A big block on a small one tips over.' },
      { icon: RefreshCw, text: 'If it falls, change it and test again!' },
    ],
  },
  steps: ['Build a tower on the table.', 'Guess: will it stand when the table wobbles?', 'Wobble the table and watch.', 'If it falls, rebuild it with wide blocks at the bottom.'],
  example: {
    question: 'Small block at the bottom, big block on top. Will it stand?',
    visual: <TowerPicture ids={['small', 'big']} />,
    work: ['The big block sits on a smaller block.', 'When the table wobbles, the big block tips off.'],
    answer: 'It falls. Put the big block at the bottom.',
  },
  grownups: [
    'Build towers with real blocks, books or cups. Ask “Why did it fall? What could we change?”',
    'This is the engineering design cycle: build, test, improve, test again.',
    'Praise good thinking when the first try falls: that is how engineers learn.',
    'Compare a wide-bottomed tower and a narrow-bottomed one of the same blocks.',
  ],
  makeQuestion,
};
