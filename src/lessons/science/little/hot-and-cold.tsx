import { useEffect, useRef, useState } from 'react';
import { CloudSun, Snowflake, Thermometer } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { MessageBox } from './visuals/MessageBox';
import './little.css';
import { Obj, OBJ_NAMES, ObjPicture } from './visuals/Objects';
import type { ObjKind } from './visuals/Objects';

const HOT: ObjKind[] = ['soup', 'sun', 'fire', 'cocoa'];
const COLD: ObjKind[] = ['icecream', 'snowman', 'icecube', 'popsicle'];
const WHY: Partial<Record<ObjKind, string>> = {
  soup: 'Soup steams when it has just been cooked.',
  sun: 'The sun warms up the whole Earth.',
  fire: 'A fire gives off lots of heat.',
  cocoa: 'Cocoa is made with hot milk.',
  icecream: 'Ice cream comes from the freezer.',
  snowman: 'A snowman is made of snow.',
  icecube: 'Ice is frozen water.',
  popsicle: 'An ice lolly is frozen juice.',
};

// Temperature slider (−10 °C to 40 °C) along the bottom of the left side.
const SLIDER = { x: 90, y: 600, w: 380 };
const TEMP_MIN = -10;
const TEMP_MAX = 40;
const DISH = { cx: 300, cy: 470 };

const BASKET_HOT = { x: 560, y: 410, w: 190, h: 180 };
const BASKET_COLD = { x: 770, y: 410, w: 190, h: 180 };
const SORT_SPOTS: Pt[] = [
  { x: 600, y: 190 },
  { x: 690, y: 190 },
  { x: 780, y: 190 },
  { x: 870, y: 190 },
  { x: 600, y: 300 },
  { x: 690, y: 300 },
  { x: 780, y: 300 },
  { x: 870, y: 300 },
];
const SORT_ORDER: ObjKind[] = ['icecream', 'soup', 'snowman', 'sun', 'fire', 'popsicle', 'cocoa', 'icecube'];

const inside = (p: Pt, r: { x: number; y: number; w: number; h: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Three experiments in turn: each sets up the dish, asks for a prediction, then explains. */
interface Experiment {
  setup: { temp: number; ice: number; water: number };
  question: string;
  options: string[];
  actual: string;
  because: string;
  /** Has the thing we're watching for happened? */
  done: (s: { temp: number; ice: number; water: number }) => boolean;
}
const EXPERIMENTS: Experiment[] = [
  {
    setup: { temp: -5, ice: 1, water: 0 },
    question: 'Make it warm. What will ice do?',
    options: ['It melts', 'It grows bigger'],
    actual: 'It melts',
    because: 'Warmth turns solid ice into liquid water.',
    done: (s) => s.temp > 0 && s.ice < 0.45,
  },
  {
    setup: { temp: 20, ice: 0, water: 1 },
    question: 'Make it freezing. What happens?',
    options: ['It freezes', 'It boils'],
    actual: 'It freezes',
    because: 'Freezing cold turns water into solid ice.',
    done: (s) => s.temp < 0 && s.ice > 0.55,
  },
  {
    setup: { temp: 12, ice: 0, water: 1 },
    question: 'Hot sun: what will the puddle do?',
    options: ['It dries up', 'It gets bigger'],
    actual: 'It dries up',
    because: 'The water goes up into the air as vapour.',
    done: (s) => s.temp > 8 && s.ice < 0.02 && s.water === 0,
  },
];

function word(t: number) {
  return t < 0 ? 'Freezing' : t < 15 ? 'Cool' : t < 28 ? 'Warm' : 'Hot';
}

function HotColdScene() {
  const [temp, setTemp] = useState(-5);
  const [ice, setIce] = useState(1);
  const [water, setWater] = useState(0);
  const [placed, setPlaced] = useState<Partial<Record<ObjKind, 'hot' | 'cold'>>>({});
  const [drag, setDrag] = useState<{ kind: ObjKind; p: Pt } | null>(null);
  const [message, setMessage] = useState('Slide the sun. What happens to the ice?');
  const [exp, setExp] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);
  const sim = useRef({ temp, ice, water });
  sim.current = { temp, ice, water };

  // Melting, freezing and drying happen over time, faster when it's hotter (or colder).
  useEffect(() => {
    const t = window.setInterval(() => {
      const { temp: T, ice: i, water: w } = sim.current;
      let ni = i;
      let nw = w;
      if (T > 0 && i > 0) {
        const melt = Math.min(i, T * 0.0016);
        ni -= melt;
        nw += melt;
      } else if (T < 0 && w > 0) {
        const freeze = Math.min(w, -T * 0.004);
        nw -= freeze;
        ni += freeze;
      }
      if (T > 8 && nw > 0) nw = Math.max(0, nw - nw * (T - 8) * 0.0009 - 0.0004);
      if (nw < 0.015 && T > 8) nw = 0;
      if (ni !== i) setIce(ni);
      if (nw !== w) setWater(nw);
    }, 100);
    return () => window.clearInterval(t);
  }, []);

  // Watch for the result of the current experiment.
  useEffect(() => {
    if (!observed && EXPERIMENTS[exp].done({ temp, ice, water })) {
      setObserved(true);
      play('correct');
    }
  }, [temp, ice, water, exp, observed]);

  const nextExperiment = () => {
    const n = (exp + 1) % EXPERIMENTS.length;
    const { setup } = EXPERIMENTS[n];
    setExp(n);
    setGuess(null);
    setObserved(false);
    setTemp(setup.temp);
    setIce(setup.ice);
    setWater(setup.water);
  };

  useEffect(() => {
    if (ice > 0.98 && temp < 0) setMessage('Brrr! Below freezing, the ice stays solid.');
    else if (ice > 0.02 && temp > 0) setMessage('It’s warm, so the ice is melting into water.');
    else if (ice <= 0.02 && water > 0 && temp > 8) setMessage('The puddle is drying up into the air.');
    else if (ice <= 0.02 && water === 0 && temp > 8) setMessage('All dry! The water went into the air.');
    else if (water > 0.05 && temp < 0) setMessage('So cold that the water is freezing back into ice.');
  }, [ice, water, temp]);

  const knob = useSvgDrag((p) => {
    const f = clamp((p.x - SLIDER.x) / SLIDER.w, 0, 1);
    setTemp(Math.round(TEMP_MIN + f * (TEMP_MAX - TEMP_MIN)));
  });

  const sortDrop = (kind: ObjKind, p: Pt) => {
    const basket = inside(p, BASKET_HOT) ? 'hot' : inside(p, BASKET_COLD) ? 'cold' : null;
    if (!basket) return;
    const right = (basket === 'hot') === HOT.includes(kind);
    if (right) {
      setPlaced({ ...placed, [kind]: basket });
      play('correct');
      setMessage(`Yes! ${WHY[kind]}`);
    } else {
      play('wrong');
      setMessage(`Hmm, is the ${OBJ_NAMES[kind]} really ${basket}? Try the other basket.`);
    }
  };

  const f = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  const knobX = SLIDER.x + f * SLIDER.w;
  const level = 120 + 300 * (1 - f); // thermometer liquid top (y)
  const cube = 30 + 60 * Math.sqrt(ice);
  const evaporating = temp > 8 && water > 0.03;
  const counts = { hot: 0, cold: 0 };

  return (
    <SceneSvg label="A thermometer, an ice cube in a dish, and baskets for hot and cold things">
      {/* Thermometer */}
      <rect x={70} y={96} width={40} height={360} rx={20} fill={C.white} stroke={C.ink} strokeWidth={3} />
      <rect x={80} y={level} width={20} height={440 - level} rx={10} fill={C.red} />
      <circle cx={90} cy={470} r={30} fill={C.red} stroke={C.ink} strokeWidth={3} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={110} y1={130 + i * 70} x2={124} y2={130 + i * 70} stroke={C.ink} strokeWidth={2} />
      ))}
      <text x={136} y={level + 6} fontSize={20} fontWeight={700} fill={C.ink}>
        {word(temp)}
      </text>

      {/* Weather above the dish */}
      <g transform={`translate(${DISH.cx} 262)`}>
        {temp < 5 ? (
          <g>
            <ellipse cx={0} cy={0} rx={70} ry={34} fill="#dbe7f3" stroke={C.ink} strokeWidth={3} />
            {[-34, 0, 34].map((x) => (
              <text key={x} x={x} y={58} textAnchor="middle" fontSize={26} fill={C.blue}>
                ❄
              </text>
            ))}
          </g>
        ) : (
          <Obj kind="sun" size={70 + f * 50} />
        )}
      </g>

      {/* Dish with ice and water */}
      <ellipse cx={DISH.cx} cy={DISH.cy + 40} rx={150} ry={32} fill={C.white} stroke={C.ink} strokeWidth={3} />
      {water > 0.01 && <ellipse cx={DISH.cx} cy={DISH.cy + 38} rx={30 + 110 * Math.sqrt(water)} ry={6 + 18 * Math.sqrt(water)} fill="#9fd3f0" stroke={shade('#9fd3f0', -0.3)} strokeWidth={2} />}
      {ice > 0.01 && (
        <g transform={`translate(${DISH.cx} ${DISH.cy + 30 - cube / 2}) scale(${cube / 70})`}>
          <Obj kind="icecube" size={70} />
        </g>
      )}
      {evaporating && (
        <g className="sl-steam" opacity={0.7}>
          {[-50, 0, 50].map((x) => (
            <path key={x} d={`M${DISH.cx + x},${DISH.cy + 4} c-10,-14 10,-24 0,-40 c-10,-14 10,-24 0,-40`} fill="none" stroke={C.muted} strokeWidth={4} strokeLinecap="round" />
          ))}
        </g>
      )}

      {/* Sun slider: the whole track can be dragged or tapped */}
      <defs>
        <linearGradient id="sl-temp" x1="0" x2="1">
          <stop offset="0" stopColor={C.blue} />
          <stop offset="0.25" stopColor="#bfe4f5" />
          <stop offset="0.6" stopColor={C.yellow} />
          <stop offset="1" stopColor={C.red} />
        </linearGradient>
      </defs>
      <text x={SLIDER.x - 8} y={SLIDER.y + 40} fontSize={16} fill={C.muted}>
        Cold
      </text>
      <text x={SLIDER.x + SLIDER.w - 26} y={SLIDER.y + 40} fontSize={16} fill={C.muted}>
        Hot
      </text>
      <g {...knob} role="slider" aria-label="How hot it is" aria-valuenow={temp}>
        <rect x={SLIDER.x - 30} y={SLIDER.y - 32} width={SLIDER.w + 60} height={64} fill="transparent" />
        <rect x={SLIDER.x} y={SLIDER.y - 9} width={SLIDER.w} height={18} rx={9} fill="url(#sl-temp)" stroke={C.ink} strokeWidth={2} />
        <circle cx={knobX} cy={SLIDER.y} r={22} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
        <circle cx={knobX} cy={SLIDER.y} r={9} fill={C.orange} />
      </g>
      <SvgButton x={370} y={360} w={150} h={46} fontSize={16} label="New ice cube" onClick={() => { setIce(1); setWater(0); play('pop'); }} />

      {/* Sorting: drag each thing into the hot or cold basket */}
      <text x={560} y={140} fontSize={17} fill={C.muted} className="caps">
        Sort them: hot or cold?
      </text>
      {[
        { b: BASKET_HOT, label: 'Hot', color: C.red, key: 'hot' as const },
        { b: BASKET_COLD, label: 'Cold', color: C.blue, key: 'cold' as const },
      ].map(({ b, label, color }) => (
        <g key={label}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={20} fill={shade(color, 0.82)} stroke={C.ink} strokeWidth={2.5} />
          <text x={b.x + b.w / 2} y={b.y + 32} textAnchor="middle" fontSize={22} fontWeight={700} fill={shade(color, -0.3)}>
            {label}
          </text>
        </g>
      ))}
      {SORT_ORDER.map((kind, i) => {
        const where = placed[kind];
        let p = SORT_SPOTS[i];
        if (where) {
          const b = where === 'hot' ? BASKET_HOT : BASKET_COLD;
          const k = counts[where]++;
          p = { x: b.x + 50 + (k % 2) * 90, y: b.y + 85 + Math.floor(k / 2) * 60 };
        }
        return (
          <SortItem
            key={kind}
            kind={kind}
            at={drag?.kind === kind ? drag.p : p}
            small={!!where}
            locked={!!where}
            dragging={drag?.kind === kind}
            onMove={(q) => setDrag({ kind, p: q })}
            onDrop={(q) => {
              setDrag(null);
              sortDrop(kind, q);
            }}
          />
        );
      })}

      <MessageBox x={560} y={604} w={400} h={60} text={message} max={44} size={16} />

      {/* Predict → observe → explain */}
      {observed ? (
        <ExplainCard
          x={176}
          y={24}
          w={364}
          prediction={guess}
          actual={EXPERIMENTS[exp].actual}
          because={EXPERIMENTS[exp].because}
          onAgain={nextExperiment}
        />
      ) : (
        <PredictCard x={176} y={24} w={364} question={EXPERIMENTS[exp].question} options={EXPERIMENTS[exp].options} prediction={guess} onPredict={setGuess} />
      )}

      <Callout at={[90, 300]} box={[560, 30]} icon={Thermometer} title="A thermometer measures heat" text="The red line goes up when it gets hotter." w={250} />
      <Callout at={[DISH.cx + 60, DISH.cy + 30]} box={[100, 520]} icon={Snowflake} title="Ice melts when it’s warm" text="Warm turns ice to water. Freezing turns water back to ice." w={260} />
      <Callout at={[DISH.cx, DISH.cy - 10]} box={[380, 250]} icon={CloudSun} title="Puddles dry up" text="In the warm sun, water goes up into the air." w={170} />
    </SceneSvg>
  );
}

function SortItem({
  kind,
  at,
  small,
  locked,
  dragging,
  onMove,
  onDrop,
}: {
  kind: ObjKind;
  at: Pt;
  small: boolean;
  locked: boolean;
  dragging: boolean;
  onMove: (p: Pt) => void;
  onDrop: (p: Pt) => void;
}) {
  const last = useRef<Pt | null>(null);
  const drag = useSvgDrag(
    (p) => {
      if (locked) return;
      last.current = p;
      onMove(p);
    },
    { onEnd: () => last.current && onDrop(last.current) },
  );
  return (
    <g style={{ transform: `translate(${at.x}px, ${at.y}px)`, transition: dragging ? 'none' : 'transform 0.4s ease-out' }}>
      <g {...(locked ? {} : drag)} role={locked ? undefined : 'button'} aria-label={OBJ_NAMES[kind]}>
        <circle r={40} fill="transparent" />
        <Obj kind={kind} size={small ? 50 : 68} />
      </g>
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={14} y={10} width={12} height={52} rx={6} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <rect x={17} y={30} width={6} height={30} rx={3} fill={C.red} />
      <circle cx={20} cy={64} r={8} fill={C.red} stroke={C.ink} strokeWidth={2} />
      <Obj kind="icecube" x={60} y={44} size={34} />
      <Obj kind="sun" x={98} y={30} size={34} />
    </svg>
  );
}

const name = (k: ObjKind) => OBJ_NAMES[k];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const k = pick([...HOT, ...COLD]);
    const hot = HOT.includes(k);
    return {
      prompt: `Is the ${name(k)} hot or cold?`,
      visual: <ObjPicture kind={k} caption />,
      choices: [
        { value: 'hot', label: 'Hot', name: 'hot' },
        { value: 'cold', label: 'Cold', name: 'cold' },
      ],
      answer: hot ? 'hot' : 'cold',
      hint: 'Would it warm your hands, or make your fingers feel chilly?',
      explain: [WHY[k]!, hot ? 'It would make you feel warm.' : 'It would make you feel chilly.', `So the ${name(k)} is ${hot ? 'hot' : 'cold'}.`],
    };
  }
  if (level === 1) {
    if (Math.random() < 0.5) {
      return {
        prompt: 'What happens to ice in the warm sun?',
        visual: <ObjPicture kind="icecube" />,
        choices: shuffle([
          { value: 'melts', label: 'It melts into water', name: 'it melts into water' },
          { value: 'grows', label: 'It grows bigger', name: 'it grows bigger' },
          { value: 'sand', label: 'It turns into sand', name: 'it turns into sand' },
        ]),
        answer: 'melts',
        hint: 'Try it on the playground: slide the sun to hot and watch the ice.',
        explain: ['Ice is frozen water.', 'When it gets warm, the ice melts.', 'So it melts into water.'],
      };
    }
    return {
      prompt: 'What happens to water in the freezer?',
      choices: shuffle([
        { value: 'freezes', label: 'It freezes into ice', name: 'it freezes into ice' },
        { value: 'hot', label: 'It gets hot', name: 'it gets hot' },
        { value: 'milk', label: 'It turns into milk', name: 'it turns into milk' },
      ]),
      answer: 'freezes',
      hint: 'A freezer is very, very cold.',
      explain: ['A freezer is colder than freezing.', 'Very cold water turns solid.', 'So it freezes into ice.'],
    };
  }
  const kind = pick(['puddle', 'first', 'thermo'] as const);
  if (kind === 'puddle') {
    return {
      prompt: 'Where does a puddle go on a sunny day?',
      choices: shuffle([
        { value: 'air', label: 'It dries up into the air', name: 'it dries up into the air' },
        { value: 'ice', label: 'It turns into ice', name: 'it turns into ice' },
        { value: 'juice', label: 'It turns into juice', name: 'it turns into juice' },
      ]),
      answer: 'air',
      hint: 'Watch the dish when the sun is hot and the ice has melted.',
      explain: ['The sun warms the puddle.', 'Warm water slowly goes up into the air, too small to see.', 'So it dries up into the air.'],
    };
  }
  if (kind === 'first') {
    return {
      prompt: 'In the hot sun, which melts?',
      choices: shuffle(['icecream', 'rock'] as ObjKind[]).map((k) => ({ value: k, name: name(k), label: <ObjPicture kind={k} caption /> })),
      answer: 'icecream',
      hint: 'Which one came from the freezer?',
      explain: ['Ice cream is frozen, so warmth melts it.', 'A rock stays hard in the sun.', 'So the ice cream melts.'],
    };
  }
  return {
    prompt: 'On a hot day, does the red line in a thermometer go up or down?',
    choices: [
      { value: 'up', label: 'Up', name: 'up' },
      { value: 'down', label: 'Down', name: 'down' },
    ],
    answer: 'up',
    hint: 'Slide the sun to hot and watch the thermometer.',
    explain: ['A thermometer shows how hot it is.', 'The hotter it gets, the higher the red line goes.', 'So on a hot day it goes up.'],
  };
}

export const hotAndCold: Lesson = {
  id: 'hot-and-cold',
  title: 'Hot and Cold',
  Thumb,
  Scene: HotColdScene,
  sceneHint: 'Guess first, then slide the sun to test · Drag things into the hot or cold basket',
  learn: {
    heading: 'Hot and cold',
    intro: 'Some things are hot and some are cold. When ice gets warm it melts into water, and when water gets very cold it freezes into ice.',
    points: [
      { icon: Thermometer, text: 'A thermometer shows how hot or cold it is.' },
      { icon: Snowflake, text: 'Warm melts ice. Freezing cold turns water into ice.' },
      { icon: CloudSun, text: 'In the sun, puddles dry up into the air.' },
    ],
  },
  steps: [
    'Guess first: what will happen to the ice?',
    'Slide the sun to make it warmer or colder, and watch.',
    'Were you right? Find out why, then try the next test.',
    'Drag each thing into the Hot or Cold basket.',
  ],
  example: {
    question: 'What happens to a snowman on a sunny day?',
    visual: <ObjPicture kind="snowman" caption />,
    work: ['A snowman is made of snow, which is frozen water.', 'The warm sun melts the snow.'],
    answer: 'The snowman melts into water.',
  },
  grownups: [
    'Put an ice cube in a sunny spot and one in the shade. Which melts first?',
    'Use a real thermometer outside on different days and compare.',
    'Freeze some water in a cup, then watch it melt. Talk about “melting” and “freezing” as two directions of the same change.',
    'Safety: talk about hot things (ovens, kettles, soup) that we look at but don’t touch.',
  ],
  makeQuestion,
};
