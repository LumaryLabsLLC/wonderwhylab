import { useEffect, useMemo, useState } from 'react';
import { Box, Droplets, Thermometer, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from './visuals/DragToken';
import { reducedMotion, useAnimationTime } from './visuals/anim';
import { byLevel, mcq } from './q';

type State = 'solid' | 'liquid' | 'gas';

const STATE_INFO: Record<State, { name: string; says: string; color: string }> = {
  solid: { name: 'Solid', says: 'Keeps its own shape.', color: C.blue },
  liquid: { name: 'Liquid', says: 'Pours and fits its cup.', color: C.teal },
  gas: { name: 'Gas', says: 'Spreads out to fill space.', color: C.purple },
};

export function stateAt(temp: number): State {
  return temp < 0 ? 'solid' : temp < 100 ? 'liquid' : 'gas';
}

// ── Little pictures of everyday things ──────────────────────────────────────

type ThingId = 'rock' | 'block' | 'juice' | 'milk' | 'balloon' | 'steam';

const THINGS: { id: ThingId; name: string; state: State }[] = [
  { id: 'rock', name: 'Rock', state: 'solid' },
  { id: 'juice', name: 'Juice', state: 'liquid' },
  { id: 'balloon', name: 'Air in a balloon', state: 'gas' },
  { id: 'block', name: 'Toy block', state: 'solid' },
  { id: 'milk', name: 'Milk', state: 'liquid' },
  { id: 'steam', name: 'Steam', state: 'gas' },
];

const ink = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const };

export function ThingIcon({ id, s = 1 }: { id: ThingId; s?: number }) {
  const glass = (fill: string) => (
    <g>
      <path d="M-18,-22 L18,-22 L14,24 L-14,24 Z" fill={C.white} {...ink} />
      <path d="M-16,-8 L16,-8 L13,22 L-13,22 Z" fill={fill} />
      <path d="M-18,-22 L18,-22 L14,24 L-14,24 Z" fill="none" {...ink} />
    </g>
  );
  const art: Record<ThingId, React.ReactElement> = {
    rock: <path d="M-24,14 C-28,-4 -14,-20 2,-18 C18,-22 28,-6 24,10 C20,22 -16,24 -24,14 Z" fill="#9aa3ad" {...ink} />,
    block: (
      <g>
        <rect x={-20} y={-20} width={40} height={40} rx={4} fill={C.red} {...ink} />
        <text x={0} y={2} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.white}>
          A
        </text>
      </g>
    ),
    juice: glass(C.orange),
    milk: glass('#f4f1ea'),
    balloon: (
      <g>
        <path d="M0,18 C-4,24 4,28 0,34" fill="none" stroke={C.ink} strokeWidth={2} />
        <ellipse cx={0} cy={-6} rx={20} ry={24} fill={C.pink} {...ink} />
        <path d="M-4,17 L4,17 L0,22 Z" fill={C.pink} {...ink} />
      </g>
    ),
    steam: (
      <g fill="none" stroke={C.muted} strokeWidth={4} strokeLinecap="round">
        <path d="M-12,22 C-20,10 -4,4 -12,-8 C-18,-16 -8,-22 -10,-26" />
        <path d="M2,22 C-6,10 10,4 2,-8 C-4,-16 6,-22 4,-26" />
        <path d="M16,22 C8,10 24,4 16,-8 C10,-16 20,-22 18,-26" />
      </g>
    ),
  };
  return <g transform={`scale(${s})`}>{art[id]}</g>;
}

// ── The scene ────────────────────────────────────────────────────────────────

const SLIDER = { x0: 90, x1: 330, y: 560 };
const MIN_T = -20;
const MAX_T = 120;
const tempToX = (t: number) => SLIDER.x0 + ((t - MIN_T) / (MAX_T - MIN_T)) * (SLIDER.x1 - SLIDER.x0);
const xToTemp = (x: number) => Math.round(MIN_T + ((clamp(x, SLIDER.x0, SLIDER.x1) - SLIDER.x0) / (SLIDER.x1 - SLIDER.x0)) * (MAX_T - MIN_T));

/** Predict → observe → explain: what will heating or cooling do next? */
const PREDICT: Record<State, { question: string; options: string[] }> = {
  solid: { question: 'Heat the ice. It will…', options: ['Melt', 'Stay ice'] },
  liquid: { question: 'Boiling water turns to…', options: ['Steam', 'Ice'] },
  gas: { question: 'Cooled steam turns to…', options: ['Water', 'Ice'] },
};

export function changeResult(from: State, to: State): { actual: string; because: string } {
  if (from === 'solid')
    return to === 'liquid'
      ? { actual: 'Melt', because: 'Above 0°C the tiny bits start to slide past each other, so the ice melts into water.' }
      : { actual: 'Melt', because: 'It melted into water, then got so hot that it boiled into steam!' };
  if (from === 'liquid')
    return to === 'gas'
      ? { actual: 'Steam', because: 'At 100°C the tiny bits move so fast they fly apart. The water boils into steam.' }
      : { actual: 'Ice', because: 'You cooled it! Below 0°C the tiny bits slow down and the water freezes into ice.' };
  return to === 'liquid'
    ? { actual: 'Water', because: 'Below 100°C the steam cools down and turns back into drops of water.' }
    : { actual: 'Ice', because: 'It cooled so much that the steam turned to water, then froze into ice.' };
}

const BINS: { state: State; x: number }[] = [
  { state: 'solid', x: 395 },
  { state: 'liquid', x: 585 },
  { state: 'gas', x: 775 },
];
const BIN = { y: 560, w: 170, h: 96 };

function Particles({ state, t }: { state: State; t: number }) {
  const calm = reducedMotion() ? 0.3 : 1;
  // Fixed "random" starting points so particles don't jump between renders.
  const seeds = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ a: Math.sin(i * 12.9898) * 43758.5453, b: Math.sin(i * 78.233) * 12345.678 })), []);
  const frac = (n: number) => n - Math.floor(n);
  return (
    <g>
      {seeds.map((sd, i) => {
        let x: number;
        let y: number;
        if (state === 'solid') {
          const col = i % 4;
          const row = Math.floor(i / 4);
          x = -51 + col * 34 + Math.sin(t * 14 + i) * 2.5 * calm;
          y = -51 + row * 34 + Math.cos(t * 13 + i * 2) * 2.5 * calm;
        } else if (state === 'liquid') {
          x = -70 + frac(sd.a) * 140 + Math.sin(t * 1.3 * calm + i * 1.7) * 16;
          y = -5 + frac(sd.b) * 80 + Math.cos(t * 1.1 * calm + i * 2.3) * 9;
        } else {
          const tri = (u: number) => Math.abs((((u % 2) + 2) % 2) - 1) * 2 - 1;
          x = tri(frac(sd.a) * 2 + t * 0.55 * calm * (0.6 + frac(sd.b))) * 95;
          y = tri(frac(sd.b) * 2 + t * 0.45 * calm * (0.6 + frac(sd.a))) * 95;
        }
        return <circle key={i} cx={x} cy={y} r={13} fill={C.blue} stroke={C.ink} strokeWidth={2} />;
      })}
    </g>
  );
}

function StatesScene() {
  const [temp, setTemp] = useState(-10);
  const [placed, setPlaced] = useState<Partial<Record<ThingId, State>>>({});
  const [selected, setSelected] = useState<ThingId | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const t = useAnimationTime();
  const state = stateAt(temp);
  const slide = useSvgDrag((p) => setTemp(xToTemp(p.x)));
  const [poe, setPoe] = useState<{ from: State; guess: string | null }>({ from: 'solid', guess: null });
  const [result, setResult] = useState<{ actual: string; because: string } | null>(null);

  // Observe: as soon as the water changes state, explain what happened.
  useEffect(() => {
    if (!result && state !== poe.from) setResult(changeResult(poe.from, state));
  }, [state, poe.from, result]);

  const binAt = (p: Pt) => BINS.find((b) => p.x >= b.x && p.x <= b.x + BIN.w && p.y >= BIN.y - 20 && p.y <= BIN.y + BIN.h + 20)?.state;

  const tryPlace = (id: ThingId, target: State | undefined) => {
    if (!target) return;
    const thing = THINGS.find((th) => th.id === id)!;
    if (thing.state === target) {
      setPlaced((p) => ({ ...p, [id]: target }));
      setSelected(null);
      play('correct');
    } else {
      setShake((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
      setSelected(null);
      play('wrong');
    }
  };

  const waterLevel = state === 'gas' ? 30 : 120;
  const info = STATE_INFO[state];
  const unplaced = THINGS.filter((th) => !placed[th.id]);

  return (
    <SceneSvg label={`Water at ${temp} degrees is a ${state}`}>
      {/* Beaker on a hotplate: it glows when hot and frosts over when cold */}
      <rect
        x={70}
        y={446}
        width={280}
        height={30}
        rx={8}
        fill={temp > 20 ? shade(C.red, 0.55 - Math.min(0.5, (temp - 20) / 200)) : temp < 0 ? '#d6ecfb' : shade(C.ink, 0.45)}
        stroke={C.ink}
        strokeWidth={2.5}
      />
      {temp > 20 &&
        [150, 210, 270].map((x, i) => (
          <path key={x} d={`M${x},444 q-5,-4 0,-8`} fill="none" stroke={C.orange} strokeWidth={3} strokeLinecap="round" opacity={0.5 + 0.5 * Math.sin(t * 6 + i)} />
        ))}
      {temp < 0 &&
        [110, 210, 310].map((x) => (
          <text key={x} x={x} y={468} textAnchor="middle" fontSize={20} fill={C.blue}>
            ❄
          </text>
        ))}
      <path d="M110,190 L110,410 Q110,430 130,430 L290,430 Q310,430 310,410 L310,190" fill="rgba(255,255,255,0.75)" stroke={C.ink} strokeWidth={3} />
      {state === 'solid' && (
        <g>
          {[
            [130, 340],
            [205, 350],
            [150, 270],
            [235, 290],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y} width={62} height={62} rx={10} fill="#cfe9fb" stroke={C.ink} strokeWidth={2} />
              <path d={`M${x + 10},${y + 14} l18,0`} stroke={C.white} strokeWidth={5} strokeLinecap="round" />
            </g>
          ))}
        </g>
      )}
      {state !== 'solid' && (
        <g>
          <path
            d={`M112,${430 - waterLevel} Q160,${424 - waterLevel} 210,${430 - waterLevel} T308,${430 - waterLevel} L308,412 Q308,428 292,428 L128,428 Q112,428 112,412 Z`}
            fill={shade(C.blue, 0.45)}
          />
          {temp >= 80 &&
            [140, 180, 230, 270].map((x, i) => (
              <circle key={x} cx={x} cy={420 - ((t * 60 + i * 40) % (waterLevel - 10))} r={5} fill="none" stroke={C.white} strokeWidth={2} />
            ))}
        </g>
      )}
      {state === 'gas' &&
        [150, 210, 270].map((x, i) => (
          <path
            key={x}
            d={`M${x},180 c-14,-20 14,-30 0,-50 c-12,-18 12,-26 2,-44`}
            fill="none"
            stroke={C.muted}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.5 + 0.4 * Math.sin(t * 3 + i)}
            transform={`translate(0 ${-((t * 30 + i * 20) % 30)})`}
          />
        ))}

      {/* Heat slider */}
      <text x={SLIDER.x0} y={SLIDER.y - 26} fontSize={16} fill={C.blue} fontWeight={600}>
        Cold
      </text>
      <text x={SLIDER.x1} y={SLIDER.y - 26} fontSize={16} fill={C.red} fontWeight={600} textAnchor="end">
        Hot
      </text>
      <g {...slide}>
        <rect x={SLIDER.x0 - 10} y={SLIDER.y - 22} width={SLIDER.x1 - SLIDER.x0 + 20} height={44} fill="transparent" />
        <defs>
          <linearGradient id="sparks-heat" x1="0" x2="1">
            <stop offset="0" stopColor={C.blue} />
            <stop offset="0.5" stopColor={C.yellow} />
            <stop offset="1" stopColor={C.red} />
          </linearGradient>
        </defs>
        <rect x={SLIDER.x0} y={SLIDER.y - 7} width={SLIDER.x1 - SLIDER.x0} height={14} rx={7} fill="url(#sparks-heat)" stroke={C.ink} strokeWidth={2} />
        <circle cx={tempToX(temp)} cy={SLIDER.y} r={20} fill={C.white} stroke={C.ink} strokeWidth={3} />
      </g>
      <SvgButton x={90} y={600} w={110} h={48} fontSize={17} label="Cool it" onClick={() => setTemp((v) => Math.max(MIN_T, v - 20))} color={shade(C.blue, 0.6)} />
      <SvgButton x={220} y={600} w={110} h={48} fontSize={17} label="Heat it" onClick={() => setTemp((v) => Math.min(MAX_T, v + 20))} color={shade(C.red, 0.55)} />

      {/* Zoomed-in particles */}
      <path d="M312,250 L415,250" stroke={C.line} strokeWidth={3} strokeDasharray="6 6" />
      <defs>
        <clipPath id="sparks-zoom">
          <circle cx={540} cy={270} r={122} />
        </clipPath>
      </defs>
      <circle cx={540} cy={270} r={125} fill={C.white} stroke={C.ink} strokeWidth={3} />
      <g clipPath="url(#sparks-zoom)">
        <g transform="translate(540 270)">
          <Particles state={state} t={t} />
        </g>
      </g>
      <text x={540} y={414} textAnchor="middle" fontSize={16} fill={C.muted}>
        Zoomed in: the tiny bits (particles)
      </text>

      {/* What state is it? */}
      <rect x={704} y={16} width={250} height={170} rx={16} fill={C.paper} transform="translate(4 6)" />
      <rect x={704} y={16} width={250} height={170} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={829} y={52} textAnchor="middle" fontSize={18} fill={C.muted}>
        {temp}°C
      </text>
      <text x={829} y={98} textAnchor="middle" fontSize={40} fontWeight={700} fill={info.color}>
        {info.name}
      </text>
      <text x={829} y={140} textAnchor="middle" fontSize={15} fill={C.ink2}>
        {state === 'solid' ? 'Ice' : state === 'liquid' ? 'Water' : 'Steam'}
      </text>
      <text x={829} y={166} textAnchor="middle" fontSize={14} fill={C.ink2}>
        {info.says}
      </text>

      {/* Predict → observe → explain */}
      {result ? (
        <ExplainCard
          x={700}
          y={204}
          w={290}
          prediction={poe.guess}
          actual={result.actual}
          because={result.because}
          onAgain={() => {
            setResult(null);
            setPoe({ from: state, guess: null });
          }}
        />
      ) : (
        <PredictCard
          x={700}
          y={204}
          w={290}
          question={PREDICT[poe.from].question}
          options={PREDICT[poe.from].options}
          prediction={poe.guess}
          onPredict={(g) => setPoe({ ...poe, guess: g })}
        />
      )}

      {/* Sort everyday things */}
      <text x={395} y={444} fontSize={16} fill={C.muted} className="caps">
        Sort them into the boxes
      </text>
      {BINS.map((b) => {
        const inBin = THINGS.filter((th) => placed[th.id] === b.state);
        return (
          <g key={b.state} onClick={() => selected && tryPlace(selected, b.state)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan>
            <rect
              x={b.x}
              y={BIN.y}
              width={BIN.w}
              height={BIN.h}
              rx={14}
              fill={shade(STATE_INFO[b.state].color, 0.85)}
              stroke={selected ? C.ink : shade(STATE_INFO[b.state].color, -0.2)}
              strokeWidth={selected ? 3 : 2}
              strokeDasharray={selected ? undefined : '8 6'}
            />
            <text x={b.x + BIN.w / 2} y={BIN.y + BIN.h - 14} textAnchor="middle" fontSize={18} fontWeight={700} fill={shade(STATE_INFO[b.state].color, -0.35)}>
              {STATE_INFO[b.state].name}
            </text>
            {inBin.map((th, i) => (
              <g key={th.id} transform={`translate(${b.x + 34 + i * 50} ${BIN.y + 32})`}>
                <ThingIcon id={th.id} s={0.7} />
              </g>
            ))}
          </g>
        );
      })}
      {unplaced.map((th, i) => (
        <DragToken
          key={th.id}
          x={410 + i * 92}
          y={490}
          label={th.name}
          selected={selected === th.id}
          shakeKey={shake[th.id] ?? 0}
          onTap={() => setSelected(selected === th.id ? null : th.id)}
          onDrop={(p) => tryPlace(th.id, binAt(p))}
        >
          <circle r={34} fill={selected === th.id ? C.yellow : C.card} stroke={C.ink} strokeWidth={selected === th.id ? 3 : 2} />
          <ThingIcon id={th.id} s={0.85} />
        </DragToken>
      ))}
      {unplaced.length === 0 && (
        <g>
          <text x={680} y={496} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.green}>
            All sorted!
          </text>
          <SvgButton x={760} y={466} w={120} h={46} fontSize={16} label="Again" onClick={() => setPlaced({})} />
        </g>
      )}

      <Callout at={[540, 160]} box={[360, 30]} w={240} icon={Droplets} title="Tiny bits" text="Everything is made of tiny bits. How they move makes it solid, liquid or gas." />
      <Callout at={[210, 560]} box={[30, 30]} w={220} icon={Thermometer} title="Heat changes it" text="Warm ice melts into water. Hot water turns into steam." />
    </SceneSvg>
  );
}

// ── Thumbnail ────────────────────────────────────────────────────────────────

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={30} width={28} height={28} rx={5} fill="#cfe9fb" stroke={C.ink} strokeWidth={2} />
      <path d="M48,30 L48,58 Q48,64 54,64 L72,64 Q78,64 78,58 L78,30" fill={C.white} stroke={C.ink} strokeWidth={2} />
      <rect x={50} y={44} width={26} height={18} fill={shade(C.blue, 0.45)} />
      <path d="M92,58 c-6,-10 6,-14 0,-24 c-5,-8 5,-12 1,-20 M104,58 c-6,-10 6,-14 0,-24 c-5,-8 5,-12 1,-20" fill="none" stroke={C.muted} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

const SORT_ITEMS: { thing: string; state: State; why: string }[] = [
  { thing: 'a rock', state: 'solid', why: 'A rock keeps its own shape.' },
  { thing: 'an ice cube', state: 'solid', why: 'An ice cube keeps its own shape until it melts.' },
  { thing: 'a wooden spoon', state: 'solid', why: 'A spoon keeps its own shape.' },
  { thing: 'juice', state: 'liquid', why: 'Juice flows and takes the shape of its cup.' },
  { thing: 'milk', state: 'liquid', why: 'Milk pours and takes the shape of its glass.' },
  { thing: 'honey', state: 'liquid', why: 'Honey flows slowly, but it still pours and takes the shape of its jar.' },
  { thing: 'the air in a balloon', state: 'gas', why: 'Air spreads out to fill the whole balloon.' },
  { thing: 'steam from a kettle', state: 'gas', why: 'Steam spreads out into the air.' },
];

const NAMES = ['Solid', 'Liquid', 'Gas'];
const nameOf = (s: State) => STATE_INFO[s].name;

function sortQuestion(): Question {
  const item = SORT_ITEMS[Math.floor(Math.random() * SORT_ITEMS.length)];
  const answer = nameOf(item.state);
  return mcq({
    prompt: `Is ${item.thing} a solid, a liquid or a gas?`,
    answer,
    wrong: NAMES.filter((n) => n !== answer),
    hint: 'Does it keep its shape, pour, or spread out to fill a space?',
    explain: [item.why, `So ${item.thing} is a ${answer.toLowerCase()}.`],
  });
}

const RULES: { prompt: string; state: State; why: string }[] = [
  { prompt: 'Which one keeps its own shape?', state: 'solid', why: 'A solid’s tiny bits are packed tight and hold together.' },
  { prompt: 'Which one flows and takes the shape of its container?', state: 'liquid', why: 'A liquid’s tiny bits slide past each other, so it pours.' },
  { prompt: 'Which one spreads out to fill any space?', state: 'gas', why: 'A gas’s tiny bits fly apart in every direction.' },
];

function ruleQuestion(): Question {
  const r = RULES[Math.floor(Math.random() * RULES.length)];
  const answer = nameOf(r.state);
  return mcq({
    prompt: r.prompt,
    answer,
    wrong: NAMES.filter((n) => n !== answer),
    hint: 'Think about ice, water and steam.',
    explain: [r.why, `That is a ${answer.toLowerCase()}.`],
  });
}

function changeQuestion(): Question {
  const options = [
    {
      prompt: 'What happens to ice when it warms up?',
      answer: 'It melts into water',
      wrong: ['It turns into rock', 'It gets colder'],
      explain: ['Warming gives the tiny bits more energy.', 'They break free and start to slide.', 'It melts into water.'],
    },
    {
      prompt: 'What happens to water when it gets very hot?',
      answer: 'It turns into steam',
      wrong: ['It turns into ice', 'Nothing happens'],
      explain: ['Very hot water bubbles and boils.', 'The tiny bits fly off into the air.', 'It turns into steam, a gas.'],
    },
    {
      prompt: 'What happens to water in the freezer?',
      answer: 'It freezes into ice',
      wrong: ['It turns into steam', 'It disappears'],
      explain: ['The freezer makes the water very cold.', 'The tiny bits slow down and hold together.', 'It freezes into ice, a solid.'],
    },
  ];
  const o = options[Math.floor(Math.random() * options.length)];
  return mcq({ ...o, hint: 'Use the heat slider: what happens when you warm it or cool it?' });
}

function particleQuestion(): Question {
  const options = [
    { prompt: 'In which state are the tiny bits packed tightly together?', state: 'solid' as State, why: 'In a solid the bits are packed tight and only jiggle.' },
    { prompt: 'In which state do the tiny bits fly fast and spread far apart?', state: 'gas' as State, why: 'In a gas the bits zoom about and spread out.' },
    { prompt: 'In which state do the tiny bits slide past each other?', state: 'liquid' as State, why: 'In a liquid the bits are close but slide around, so it flows.' },
  ];
  const o = options[Math.floor(Math.random() * options.length)];
  const answer = nameOf(o.state);
  return mcq({
    prompt: o.prompt,
    answer,
    wrong: NAMES.filter((n) => n !== answer),
    hint: 'Look at the zoomed-in circle as you heat the ice.',
    explain: [o.why, `So the answer is ${answer.toLowerCase()}.`],
  });
}

function wordQuestion(): Question {
  const options = [
    { prompt: 'Ice turning into water is called…', answer: 'Melting', why: 'Ice gets warmer and turns into a liquid.' },
    { prompt: 'Water turning into ice is called…', answer: 'Freezing', why: 'Water gets very cold and turns into a solid.' },
    { prompt: 'Water bubbling and turning into steam is called…', answer: 'Boiling', why: 'Very hot water bubbles and turns into a gas.' },
  ];
  const o = options[Math.floor(Math.random() * options.length)];
  return mcq({
    prompt: o.prompt,
    answer: o.answer,
    wrong: ['Melting', 'Freezing', 'Boiling'].filter((w) => w !== o.answer),
    hint: 'Is it getting warmer or colder?',
    explain: [o.why, `That change is called ${o.answer.toLowerCase()}.`],
  });
}

export const statesOfMatter: Lesson = {
  id: 'states-of-matter',
  title: 'Solid, Liquid, Gas',
  Thumb,
  Scene: StatesScene,
  sceneHint: 'Guess what heat will do · Slide the heat to test it · Sort things into the boxes',
  learn: {
    heading: 'Solid, liquid or gas?',
    intro: 'Everything around you is a solid, a liquid or a gas. Heating or cooling can change one into another, like ice melting into water.',
    points: [
      { icon: Box, text: 'A solid keeps its own shape, like a rock or an ice cube.' },
      { icon: Droplets, text: 'A liquid flows and takes the shape of its cup, like juice.' },
      { icon: Wind, text: 'A gas spreads out to fill any space, like the air in a balloon.' },
    ],
  },
  steps: [
    'Look at the thing. Does it keep its own shape? Then it is a solid.',
    'Can you pour it? Then it is a liquid.',
    'Does it spread out into the air? Then it is a gas.',
    'Heat makes solids melt and liquids boil. Cold makes liquids freeze.',
    'Before you heat or cool it, make a guess. Then test it and see if you were right!',
  ],
  example: {
    question: 'What happens to an ice lolly on a sunny day?',
    work: ['The sun warms the ice lolly.', 'The ice gets warm enough to melt.', 'It turns into a sticky liquid that drips!'],
    answer: 'It melts from a solid into a liquid.',
  },
  grownups: [
    'Melt an ice cube on a plate together, then put the water back in the freezer. Ask: is it the same water?',
    'Point out states at home: steam from a kettle (keep little hands away), ice in a drink, milk in a glass.',
    'Tricky ones are good to talk about: sand pours, but each grain is a tiny solid.',
  ],
  makeQuestion: (level) => byLevel(level, [[sortQuestion, ruleQuestion], [changeQuestion, sortQuestion, ruleQuestion], [particleQuestion, wordQuestion, changeQuestion]]),
};
