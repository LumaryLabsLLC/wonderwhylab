import { useState } from 'react';
import { Scale, Snowflake, Thermometer, Wrench } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, WrapText } from './visuals/Draggable';
import { useProgress } from './visuals/useProgress';

/**
 * Keep it cold: drag a wrap onto an ice cube in a warm room and start the clock.
 * Heat moves from the warm room into the ice. Metal conducts heat well; paper, plastic, wool and foam
 * slow it down because they trap still air. Wool does not make heat, so it keeps cold things cold too.
 * The minutes are a simple model (real times vary with the ice and the room), but the order is true to life.
 */

type Material = 'none' | 'metal' | 'plastic' | 'paper' | 'wool' | 'foam';

const MATERIALS: Record<Material, { name: string; minutes: number; question: string; options: string[]; actual: string; because: string }> = {
  none: {
    name: 'No cover',
    minutes: 24,
    question: 'Ice in a warm room. Which way does the heat move?',
    options: ['Room → ice', 'Ice → room'],
    actual: 'Room → ice',
    because: 'Heat always moves from warmer to colder. The warm room heats the ice, and it melts.',
  },
  metal: {
    name: 'Metal tin',
    minutes: 20,
    question: 'In a metal tin. Will the ice last long or melt quickly?',
    options: ['Last long', 'Melt quickly'],
    actual: 'Melt quickly',
    because: 'Metal is a conductor: heat travels through it easily, straight into the ice.',
  },
  plastic: {
    name: 'Plastic cup',
    minutes: 35,
    question: 'Under a plastic cup. Longer or shorter than no cover?',
    options: ['Longer', 'Shorter'],
    actual: 'Longer',
    because: 'Plastic does not let heat through easily, and the cup traps still air around the ice.',
  },
  paper: {
    name: 'Paper',
    minutes: 45,
    question: 'Wrapped in paper. Longer or shorter than no cover?',
    options: ['Longer', 'Shorter'],
    actual: 'Longer',
    because: 'Paper is a poor conductor, and its layers trap air, so heat gets in slowly.',
  },
  wool: {
    name: 'Wool sock',
    minutes: 80,
    question: 'Wool feels warm. Will the sock melt the ice faster or slower?',
    options: ['Faster', 'Slower'],
    actual: 'Slower',
    because: 'Wool does not make heat. It traps air, which slows heat coming in from the room, so the ice stays cold longer.',
  },
  foam: {
    name: 'Foam box',
    minutes: 120,
    question: 'A foam box. Longer or shorter than the wool sock?',
    options: ['Longer', 'Shorter'],
    actual: 'Longer',
    because: 'Foam is full of tiny bubbles of trapped air. It is a great insulator, so heat gets in very slowly.',
  },
};
const ORDER: Material[] = ['none', 'metal', 'plastic', 'paper', 'wool', 'foam'];

const ICE = { cx: 320, base: 330 };
const MS_PER_MINUTE = 40;

/** The wrap drawn around the ice (semi-see-through so the melting ice stays visible). */
function Wrap({ m }: { m: Material }) {
  const stroke = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  switch (m) {
    case 'metal':
      return (
        <g>
          <rect x={244} y={196} width={152} height={138} rx={6} fill="#b9c3cf" fillOpacity={0.6} {...stroke} />
          <ellipse cx={320} cy={196} rx={76} ry={12} fill="#d5dce4" {...stroke} />
          <path d="M262,214 v108 M276,214 v108" stroke={C.white} strokeWidth={5} opacity={0.7} />
        </g>
      );
    case 'plastic':
      return <path d="M270,190 L370,190 L396,334 L244,334 Z" fill={shade(C.blue, 0.7)} fillOpacity={0.55} {...stroke} />;
    case 'paper':
      return (
        <g>
          <path d="M246,334 L240,262 Q248,214 262,198 L300,188 L344,194 L380,190 Q398,240 400,334 Z" fill="#f4efe2" fillOpacity={0.7} {...stroke} />
          <path d="M268,214 l18,26 M352,206 l-14,30 M300,300 l26,-12" stroke={shade('#f4efe2', -0.3)} strokeWidth={2} />
        </g>
      );
    case 'wool':
      return (
        <g>
          <path d="M244,334 L244,214 Q244,188 270,188 L370,188 Q396,188 396,214 L396,334 Z" fill={C.pink} fillOpacity={0.6} {...stroke} />
          {[262, 284, 306, 328, 350, 372].map((x) => (
            <path key={x} d={`M${x},196 v132`} stroke={shade(C.pink, -0.3)} strokeWidth={2} strokeDasharray="6 5" />
          ))}
          <rect x={244} y={188} width={152} height={22} rx={10} fill={shade(C.pink, -0.15)} {...stroke} />
        </g>
      );
    case 'foam':
      return (
        <g>
          <rect x={232} y={184} width={176} height={150} rx={8} fill={C.white} fillOpacity={0.7} {...stroke} />
          <rect x={250} y={202} width={140} height={132} rx={4} fill="none" stroke={C.line} strokeWidth={2} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <circle key={i} cx={240 + (i % 2) * 160} cy={200 + i * 16} r={3} fill={C.line} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** A small picture of each wrap for the shelf. */
function Swatch({ m }: { m: Material }) {
  switch (m) {
    case 'metal':
      return <rect x={-12} y={-14} width={24} height={28} rx={3} fill="#b9c3cf" stroke={C.ink} strokeWidth={2} />;
    case 'plastic':
      return <path d="M-8,-14 L8,-14 L13,14 L-13,14 Z" fill={shade(C.blue, 0.7)} stroke={C.ink} strokeWidth={2} />;
    case 'paper':
      return <path d="M-12,14 L-13,-6 L-6,-14 L12,-13 L13,14 Z" fill="#f4efe2" stroke={C.ink} strokeWidth={2} />;
    case 'wool':
      return <path d="M-8,-14 h12 v14 h8 q4,0 4,6 v8 h-24 Z" fill={C.pink} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />;
    case 'foam':
      return <rect x={-14} y={-12} width={28} height={24} rx={3} fill={C.white} stroke={C.ink} strokeWidth={2} />;
    default:
      return <path d="M-10,10 L10,-10 M-10,-10 L10,10" stroke={C.muted} strokeWidth={3} strokeLinecap="round" />;
  }
}

/** Wavy heat arrow from the room toward the ice; thicker means faster heat flow. */
function HeatArrow({ x1, y1, x2, y2, width, offset }: { x1: number; y1: number; x2: number; y2: number; width: number; offset: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const pts: string[] = [];
  const n = Math.max(6, Math.round(len / 6));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (len - 18);
    const wob = Math.sin(t / 7) * 6;
    pts.push(`${x1 + ux * t + nx * wob},${y1 + uy * t + ny * wob}`);
  }
  const hx = x2;
  const hy = y2;
  return (
    <g>
      <polyline points={pts.join(' ')} fill="none" stroke={C.red} strokeWidth={width} strokeLinecap="round" strokeDasharray="14 8" strokeDashoffset={-offset} opacity={0.85} />
      <path
        d={`M${hx},${hy} L${hx - ux * 20 + nx * (8 + width)},${hy - uy * 20 + ny * (8 + width)} L${hx - ux * 20 - nx * (8 + width)},${hy - uy * 20 - ny * (8 + width)} Z`}
        fill={C.red}
        opacity={0.85}
      />
    </g>
  );
}

function KeepColdScene() {
  const [material, setMaterial] = useState<Material>('none');
  const [guess, setGuess] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);
  const [results, setResults] = useState<Partial<Record<Material, number>>>({});
  const info = MATERIALS[material];
  const clock = useProgress(info.minutes * MS_PER_MINUTE + 600);

  const melt = clock.p;
  const s = 92 * (1 - melt);
  const rate = Math.min(1.2, MATERIALS.none.minutes / info.minutes);
  const arrowW = 3 + 8 * rate;
  const minutesNow = Math.round(info.minutes * clock.p);

  const wrap = (m: Material) => {
    if (clock.running) return;
    clock.reset();
    setMaterial(m);
    setGuess(null);
    setObserved(false);
    play('pop');
  };
  const start = () => {
    setObserved(false);
    play('tap');
    clock.run(() => {
      setResults((old) => ({ ...old, [material]: info.minutes }));
      setObserved(true);
      play('complete');
    });
  };

  return (
    <SceneSvg label="Wrap an ice cube in different materials and time how long it takes to melt.">
      {/* the warm room */}
      <rect x={40} y={24} width={560} height={420} rx={18} fill={shade(C.orange, 0.82)} stroke={C.ink} strokeWidth={2.5} />
      <g>
        <rect x={60} y={42} width={14} height={40} rx={7} fill={C.white} stroke={C.ink} strokeWidth={2} />
        <rect x={64} y={56} width={6} height={24} rx={3} fill={C.red} />
        <circle cx={67} cy={86} r={9} fill={C.red} stroke={C.ink} strokeWidth={2} />
        <text x={86} y={70} fontSize={18} fontWeight={700} fill={C.ink}>
          Warm room
        </text>
      </g>
      {/* the clock */}
      <g>
        <rect x={454} y={38} width={132} height={64} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={520} y={60} textAnchor="middle" fontSize={13} fill={C.muted} className="caps">
          Clock
        </text>
        <text x={520} y={90} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>
          {minutesNow} min
        </text>
      </g>

      {/* heat flowing in */}
      <HeatArrow x1={90} y1={268} x2={222} y2={268} width={arrowW} offset={clock.p * 400} />
      <HeatArrow x1={552} y1={268} x2={420} y2={268} width={arrowW} offset={clock.p * 400} />
      <HeatArrow x1={320} y1={100} x2={320} y2={178} width={arrowW} offset={clock.p * 400} />

      {/* plate, puddle, ice */}
      <ellipse cx={ICE.cx} cy={ICE.base + 12} rx={150} ry={22} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={ICE.cx} cy={ICE.base + 8} rx={30 + 96 * melt} ry={5 + 10 * melt} fill={shade(C.blue, 0.45)} opacity={melt > 0 ? 1 : 0} />
      {s > 2 && (
        <g>
          <rect x={ICE.cx - s / 2} y={ICE.base - s} width={s} height={s} rx={8 + 6 * melt} fill={shade(C.blue, 0.78)} stroke={shade(C.blue, -0.2)} strokeWidth={2.5} />
          <path d={`M${ICE.cx - s / 2 + 10},${ICE.base - s + 12} l${s * 0.25},0`} stroke={C.white} strokeWidth={4} strokeLinecap="round" />
        </g>
      )}
      <Wrap m={material} />
      {observed && (
        <text x={ICE.cx} y={404} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
          {info.name}: melted after {info.minutes} minutes
        </text>
      )}

      {/* the shelf of wraps: drag one onto the ice, or tap it */}
      {ORDER.map((m, i) => {
        const x = 128 + (i % 3) * 192;
        const y = 488 + Math.floor(i / 3) * 64;
        const on = m === material;
        return (
          <Draggable
            key={m}
            x={x}
            y={y}
            label={`Wrap the ice: ${MATERIALS[m].name}`}
            disabled={clock.running}
            onTap={() => wrap(m)}
            onDrop={(p) => {
              if (Math.abs(p.x - ICE.cx) < 180 && p.y > 140 && p.y < 440) wrap(m);
            }}
          >
            <rect x={-88} y={-27} width={176} height={54} rx={14} fill={on ? C.yellow : C.card} stroke={C.ink} strokeWidth={on ? 3 : 2} />
            <g transform="translate(-60 0)">
              <Swatch m={m} />
            </g>
            <text x={-36} y={6} fontSize={17} fontWeight={700} fill={C.ink}>
              {MATERIALS[m].name}
            </text>
          </Draggable>
        );
      })}
      <SvgButton x={40} y={598} w={260} h={50} fontSize={19} label="Start the clock" onClick={start} disabled={clock.running} color={C.teal} textColor={C.white} />
      <SvgButton x={312} y={598} w={150} h={50} fontSize={17} label="New ice" onClick={() => { clock.reset(); setObserved(false); play('tap'); }} disabled={clock.running || clock.p === 0} />

      {observed ? (
        <ExplainCard x={630} y={24} w={340} prediction={guess} actual={info.actual} because={info.because} onAgain={() => { clock.reset(); setGuess(null); setObserved(false); }} />
      ) : (
        <PredictCard x={630} y={24} w={340} question={info.question} options={info.options} prediction={guess} onPredict={(o) => { setGuess(o); clock.reset(); play('tap'); }} />
      )}

      {/* results */}
      <g>
        <rect x={630} y={318} width={340} height={244} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={644} y={342} fontSize={13} fill={C.muted} className="caps">
          Minutes until melted
        </text>
        {ORDER.map((m, i) => {
          const n = results[m];
          const y = 356 + i * 33;
          return (
            <g key={m}>
              <text x={644} y={y + 18} fontSize={15} fill={C.ink}>
                {MATERIALS[m].name}
              </text>
              <rect x={760} y={y + 4} width={150} height={20} rx={6} fill={shade(C.line, 0.4)} />
              {n !== undefined && <rect x={760} y={y + 4} width={(n / 120) * 150} height={20} rx={6} fill={n >= 60 ? C.green : n >= 30 ? C.yellow : C.red} />}
              <text x={918} y={y + 19} fontSize={15} fontWeight={700} fill={C.ink}>
                {n ?? '–'}
              </text>
            </g>
          );
        })}
      </g>
      <WrapText x={640} y={590} width={320} fontSize={15} fill={C.ink2} text="Fair test: same ice, same room, only the wrap changes." />

      <Callout at={[150, 262]} box={[60, 118]} w={240} icon={Thermometer} title="Heat moves in" text="Heat always flows from warmer things to colder things." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={6} width={112} height={68} rx={8} fill={shade(C.orange, 0.82)} />
      <ellipse cx={60} cy={64} rx={40} ry={7} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
      <rect x={44} y={30} width={32} height={32} rx={5} fill={shade(C.blue, 0.78)} stroke={shade(C.blue, -0.2)} strokeWidth={2} />
      <path d="M36,24 L84,24 L90,62 L30,62 Z" fill={C.pink} fillOpacity={0.55} stroke={C.ink} strokeWidth={1.5} />
      <path d="M10,44 h16 l-5,-4 m5,4 l-5,4" stroke={C.red} strokeWidth={2.5} fill="none" />
      <path d="M110,44 h-16 l5,-4 m-5,4 l5,4" stroke={C.red} strokeWidth={2.5} fill="none" />
    </svg>
  );
}

function q(prompt: string, right: string, wrong: string[], hint: string, explain: string[]): Question {
  return { prompt, choices: choices(shuffle([right, ...wrong])), answer: right, hint, explain };
}

function makeQuestion(level: number): Question {
  const kinds = level === 0 ? ['direction', 'longest', 'conductor'] : level === 1 ? ['wool', 'foam', 'spoon', 'insulator'] : ['diff', 'fair', 'flask', 'drink'];
  switch (pick(kinds)) {
    case 'direction':
      return q('Which way does heat move?', 'From warm to cold', ['From cold to warm', 'It does not move'], 'Think about the arrows in the warm room.', [
        'The room is warmer than the ice.',
        'Heat flows into the ice and melts it.',
        'Heat always moves from warm to cold.',
      ]);
    case 'longest':
      return q('Which keeps an ice cube frozen longest?', 'A foam box', ['A metal tin', 'No cover'], 'Look at the longest bar in your results.', [
        'Foam is full of trapped air bubbles.',
        'Trapped air slows heat getting in.',
        'So a foam box keeps the ice frozen longest.',
      ]);
    case 'conductor':
      return q('Metal lets heat through easily. So metal is a good…', 'Conductor', ['Insulator', 'Magnet'], 'Conduct means to carry.', [
        'Heat travels through metal quickly.',
        'A material that carries heat well is called a conductor.',
      ]);
    case 'wool':
      return q('Wrapping ice in a wool sock makes it…', 'Melt more slowly', ['Melt faster', 'Turn warm'], 'Does wool make heat, or slow it down?', [
        'Wool does not make heat.',
        'It traps air, which slows heat coming in from the room.',
        'So the ice will melt more slowly.',
      ]);
    case 'foam':
      return q('Why is foam a good insulator?', 'It traps lots of still air', ['It is very heavy', 'It is shiny'], 'Look closely: foam is full of tiny bubbles.', [
        'Foam is made of tiny bubbles.',
        'It traps lots of still air, and still air carries heat very slowly.',
      ]);
    case 'spoon':
      return q('A metal spoon in hot soup gets hot at the handle. Why?', 'Metal conducts heat', ['The spoon makes heat', 'Cold leaves the spoon'], 'Which way does heat move, and how easily does it go through metal?', [
        'The soup is hotter than the spoon.',
        'Heat travels up the spoon because metal conducts heat well.',
      ]);
    case 'insulator':
      return q('What does an insulator do?', 'Slows heat moving', ['Makes heat', 'Makes things cold'], 'Think of the wool sock and the foam box.', [
        'Insulators do not make heat or cold.',
        'An insulator slows heat moving from warm to cold.',
      ]);
    case 'diff': {
      const foam = rand(18, 30) * 5;
      const paper = rand(6, 12) * 5;
      const d = foam - paper;
      return {
        prompt: `Ice lasted ${foam} minutes in a foam box and ${paper} minutes in paper. How many minutes longer did the foam box keep it?`,
        answer: String(d),
        hint: 'Subtract the shorter time from the longer time.',
        explain: [`Foam box: ${foam} minutes. Paper: ${paper} minutes.`, `${foam} − ${paper} = ${d}.`, `The foam box kept it ${d} minutes longer.`],
      };
    }
    case 'fair':
      return q('To make the test fair, what must stay the same for every wrap?', 'The size of the ice cube', ['The kind of wrap', 'The time it takes'], 'We change one thing and measure another. Everything else stays the same.', [
        'We change only the wrap.',
        'We measure the time it takes to melt.',
        'Everything else must stay the same, like the size of the ice cube.',
      ]);
    case 'flask':
      return q('A flask keeps soup hot AND juice cold. How?', 'It slows heat moving in or out', ['It makes heat and cold', 'It is filled with ice'], 'Hot soup loses heat; cold juice gains heat. What could stop both?', [
        'Hot soup loses heat to the room. Cold juice gains heat from it.',
        'A flask is an insulator: it slows heat moving in or out.',
        'So both stay as they are for longer.',
      ]);
    default:
      return q('Which would keep a hot drink warm the longest?', 'A foam cup with a lid', ['A metal cup, no lid', 'A thin paper cup, no lid'], 'You want an insulator, and no gap for heat to escape.', [
        'Metal lets heat out fast, and an open top lets heat escape.',
        'Foam is an insulator and a lid keeps the warm air in.',
        'So a foam cup with a lid keeps it warm longest.',
      ]);
  }
}

export const heatAndInsulation: Lesson = {
  id: 'heat-and-insulation',
  title: 'Keep It Cold',
  Thumb,
  Scene: KeepColdScene,
  sceneHint: 'Drag a wrap onto the ice · Predict · Start the clock · Compare the bars',
  learn: {
    heading: 'Keep it cold',
    intro:
      'Heat always moves from something warmer to something colder. Conductors, like metal, let heat through easily. Insulators, like wool and foam, slow it down by trapping air.',
    points: [
      { icon: Thermometer, text: 'Heat moves from warm to cold, never the other way by itself.' },
      { icon: Wrench, text: 'Conductors (like metal) let heat through fast.' },
      { icon: Snowflake, text: 'Insulators (like wool and foam) slow heat, so they keep cold things cold too.' },
      { icon: Scale, text: 'A fair test changes only one thing.' },
    ],
  },
  steps: [
    'Find what is warm and what is cold.',
    'Heat will move from the warm thing to the cold thing.',
    'To slow it down, put an insulator in between.',
    'To test fairly, change only one thing at a time.',
  ],
  example: {
    question: 'You want to bring ice lollies to the park. What should you pack them in?',
    work: ['The sunny park is warmer than the lollies.', 'Heat will move into them.', 'A foam cool box or a thick wrap slows the heat down.'],
    answer: 'A foam cool box (an insulator), so they stay frozen longer.',
  },
  grownups: [
    'A common belief is that wool or coats "make heat". They do not: they slow heat leaving your body, and slow heat getting into an ice cube just the same.',
    'Cold does not flow. It is always heat moving from the warmer thing to the colder thing.',
    'Try it at home: three ice cubes on saucers, one bare, one in foil, one in a sock. Check every 10 minutes.',
  ],
  makeQuestion,
};
