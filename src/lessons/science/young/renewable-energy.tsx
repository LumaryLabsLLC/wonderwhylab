import { useEffect, useRef, useState } from 'react';
import { BatteryCharging, Factory, Sun, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

/**
 * A small town's electricity. Numbers are friendly "power units" (each house needs 1), but the
 * patterns are real: solar follows the sun, wind turbines need wind, hydro is steady, coal and gas
 * run any time but release CO₂ (coal about twice as much as gas for the same electricity), and
 * storage saves spare energy for later. Installed plants simply run all the time in this model.
 */
type Source = 'solar' | 'wind' | 'hydro' | 'coal' | 'gas' | 'battery';

const HOUSES = 10;
const CAP = 40; // battery size
const RATE = 10; // most a battery can charge or give each second

const SOURCES: { id: Source; name: string; max: number; tag: 'Renewable' | 'Non-renewable' | 'Storage' }[] = [
  { id: 'solar', name: 'Solar panels', max: 4, tag: 'Renewable' },
  { id: 'wind', name: 'Wind turbines', max: 4, tag: 'Renewable' },
  { id: 'hydro', name: 'Hydro dam', max: 1, tag: 'Renewable' },
  { id: 'coal', name: 'Coal plants', max: 2, tag: 'Non-renewable' },
  { id: 'gas', name: 'Gas plants', max: 2, tag: 'Non-renewable' },
  { id: 'battery', name: 'Battery', max: 1, tag: 'Storage' },
];

const EACH = { solar: 3, wind: 3, hydro: 4, coal: 5, gas: 5 } as const;
const CO2 = { coal: 4, gas: 2 } as const;

type Counts = Record<Source, number>;

interface EnergyChallenge extends Challenge {
  kind: 'night' | 'calm' | 'battery' | 'coal' | 'co2';
  setup: Partial<Counts>;
}

const CHALLENGES: EnergyChallenge[] = [
  {
    kind: 'night',
    setup: { solar: 4 },
    question: 'Solar panels only. Make it night. The lights will…',
    options: ['Stay on', 'Go out'],
    actual: 'Go out',
    because: 'Solar panels need sunlight. At night they make no electricity at all.',
  },
  {
    kind: 'calm',
    setup: { wind: 4 },
    question: 'Wind turbines only. Stop the wind. The lights will…',
    options: ['Stay on', 'Go out'],
    actual: 'Go out',
    because: 'Wind turbines only make electricity while the wind turns their blades.',
  },
  {
    kind: 'battery',
    setup: { solar: 4, battery: 1 },
    question: 'The battery is full of spare sunshine. Make it night. The lights will…',
    options: ['Stay on', 'Go out'],
    actual: 'Stay on',
    because: 'The battery gives back energy it stored in the day, until it runs low.',
  },
  {
    kind: 'coal',
    setup: { coal: 2 },
    question: 'Coal only. Make it night. The lights will…',
    options: ['Stay on', 'Go out'],
    actual: 'Stay on',
    because: 'Coal burns day and night, so the lights stay on. But it adds CO₂ to the air, and coal will run out.',
  },
  {
    kind: 'co2',
    setup: { coal: 2 },
    question: 'Swap one coal plant for a gas plant. The CO₂ will…',
    options: ['Go up', 'Go down', 'Same'],
    actual: 'Go down',
    because: 'For the same electricity, gas makes about half the CO₂ of coal. It is still a fossil fuel, though.',
  },
];

const nextChallenge = (prev: EnergyChallenge | null) => pick(CHALLENGES.filter((c) => c.kind !== prev?.kind));

const START: Counts = { solar: 2, wind: 2, hydro: 1, coal: 0, gas: 0, battery: 0 };
const NONE: Counts = { solar: 0, wind: 0, hydro: 0, coal: 0, gas: 0, battery: 0 };

// ---------- landscape pieces ----------

function SolarPanel({ x, y, on, day }: { x: number; y: number; on: boolean; day: boolean }) {
  if (!on) return <rect x={x} y={y} width={44} height={28} rx={3} fill="none" stroke={shade(C.ink, 0.6)} strokeWidth={2} strokeDasharray="5 5" />;
  return (
    <g>
      <line x1={x + 22} y1={y + 28} x2={x + 22} y2={y + 38} stroke={C.ink} strokeWidth={3} />
      <rect x={x} y={y} width={44} height={28} rx={3} fill={day ? '#3b6fd8' : '#24365e'} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${x + 15},${y} V${y + 28} M${x + 29},${y} V${y + 28} M${x},${y + 14} H${x + 44}`} stroke={shade('#3b6fd8', 0.5)} strokeWidth={1.5} />
    </g>
  );
}

function Turbine({ x, hub, windy }: { x: number; hub: number; windy: boolean }) {
  return (
    <g>
      <path d={`M${x - 3},300 L${x - 1.5},${hub} L${x + 1.5},${hub} L${x + 3},300 Z`} fill="white" stroke={C.ink} strokeWidth={2} />
      <g transform={`translate(${x} ${hub})`}>
        <g className={windy ? 're-spin' : undefined}>
          <circle r={26} fill="transparent" />
          {[0, 120, 240].map((a) => (
            <path key={a} d="M-3,0 Q-4,-14 0,-25 Q4,-14 3,0 Z" fill="white" stroke={C.ink} strokeWidth={1.8} transform={`rotate(${a})`} />
          ))}
          <circle r={3.5} fill={C.ink} />
        </g>
      </g>
    </g>
  );
}

function Plant({ x, kind, on }: { x: number; kind: 'coal' | 'gas'; on: boolean }) {
  if (!on) return <rect x={x} y={258} width={40} height={42} rx={4} fill="none" stroke={shade(C.ink, 0.6)} strokeWidth={2} strokeDasharray="5 5" />;
  const coal = kind === 'coal';
  return (
    <g>
      <rect x={x + 26} y={coal ? 196 : 212} width={11} height={coal ? 64 : 48} fill={coal ? '#8a6d5a' : '#b9c2cc'} stroke={C.ink} strokeWidth={2} />
      <rect x={x} y={258} width={40} height={42} rx={4} fill={coal ? '#a6866f' : '#d5dce4'} stroke={C.ink} strokeWidth={2.5} />
      <rect x={x + 8} y={270} width={10} height={10} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
      <g className="re-smoke">
        {(coal ? [0, 1, 2] : [0, 1]).map((i) => (
          <circle key={i} cx={x + 31 + i * 7} cy={(coal ? 184 : 202) - i * 16} r={coal ? 9 + i * 2 : 6 + i * 2} fill={coal ? '#6b7280' : '#cbd2da'} opacity={0.85} />
        ))}
      </g>
    </g>
  );
}

function House({ x, lit, day }: { x: number; lit: boolean; day: boolean }) {
  return (
    <g>
      <path d={`M${x - 4},382 L${x + 24},358 L${x + 52},382 Z`} fill="#c0573e" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={x} y={380} width={48} height={40} fill={day ? C.white : '#cfd6e0'} stroke={C.ink} strokeWidth={2.5} />
      <rect x={x + 8} y={390} width={14} height={13} rx={2} fill={lit ? C.yellow : '#3b4252'} stroke={C.ink} strokeWidth={1.5} />
      <rect x={x + 28} y={398} width={12} height={22} fill={shade('#c0573e', -0.1)} stroke={C.ink} strokeWidth={1.5} />
      {lit && !day && <circle cx={x + 15} cy={396} r={16} fill={C.yellow} opacity={0.25} />}
    </g>
  );
}

// ---------- scene ----------

function EnergyScene() {
  const [n, setN] = useState<Counts>(START);
  const [day, setDay] = useState(true);
  const [windy, setWindy] = useState(true);
  const [charge, setCharge] = useState(0);
  const poe = usePoe<EnergyChallenge>(nextChallenge);

  // Once the child predicts, set up a fair start: daytime, windy, only the sources being tested.
  useEffect(() => {
    if (poe.guess === null) return;
    setN({ ...NONE, ...poe.challenge.setup });
    setDay(true);
    setWindy(true);
    setCharge(poe.challenge.kind === 'battery' ? CAP : 0);
  }, [poe.guess, poe.challenge]);

  const out = {
    solar: day ? n.solar * EACH.solar : 0,
    wind: windy ? n.wind * EACH.wind : 0,
    hydro: n.hydro * EACH.hydro,
    coal: n.coal * EACH.coal,
    gas: n.gas * EACH.gas,
  };
  const renewable = out.solar + out.wind + out.hydro;
  const made = renewable + out.coal + out.gas;
  const give = n.battery ? Math.min(Math.max(0, HOUSES - made), RATE, charge) : 0;
  const surplus = Math.max(0, made - HOUSES);
  const lit = Math.min(HOUSES, Math.floor(made + give));
  const co2 = n.coal * CO2.coal + n.gas * CO2.gas;
  const share = made > 0 ? Math.round((renewable / made) * 100) : 0;

  // The battery charges from spare power and gives it back when there isn't enough.
  const flow = useRef({ give, surplus });
  flow.current = { give, surplus };
  useEffect(() => {
    if (!n.battery) return;
    const t = window.setInterval(() => {
      const f = flow.current;
      if (f.give > 0 || f.surplus > 0) setCharge((c) => Math.max(0, Math.min(CAP, c - f.give + Math.min(f.surplus, RATE))));
    }, 1000);
    return () => window.clearInterval(t);
  }, [n.battery]);

  const observeIf = (ok: boolean) => {
    if (ok) window.setTimeout(poe.observe, 700);
  };
  const waitFor = poe.waiting ? poe.challenge.kind : null;

  const change = (id: Source, d: number) => {
    const src = SOURCES.find((s) => s.id === id)!;
    const next = { ...n, [id]: Math.max(0, Math.min(src.max, n[id] + d)) };
    if (next[id] === n[id]) return;
    setN(next);
    if (id === 'battery' && next.battery === 0) setCharge(0);
    play(d > 0 ? 'pop' : 'tap');
    observeIf(waitFor === 'co2' && next.coal < 2 && next.gas > 0);
  };

  const toggleDay = () => {
    setDay((d) => !d);
    play('whoosh');
    observeIf(day && (waitFor === 'night' || waitFor === 'battery' || waitFor === 'coal'));
  };
  const toggleWind = () => {
    setWindy((w) => !w);
    play('whoosh');
    observeIf(windy && waitFor === 'calm');
  };

  const sky = day ? '#cfe8ff' : '#1f2a4a';
  const ground = day ? '#bfe3a5' : '#4f6b45';

  return (
    <SceneSvg label={`A town with ${lit} of ${HOUSES} houses lit`}>
      {/* Landscape */}
      <path d="M38,20 H642 Q660,20 660,38 V270 H20 V38 Q20,20 38,20 Z" fill={sky} />
      <path d="M20,270 H660 V412 Q660,430 642,430 H38 Q20,430 20,412 Z" fill={ground} />
      <rect x={20} y={20} width={640} height={410} rx={18} fill="none" stroke={C.line} strokeWidth={2} />
      {day ? (
        <circle cx={610} cy={64} r={26} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
      ) : (
        <g>
          <circle cx={610} cy={64} r={24} fill="#f5f0d6" />
          <circle cx={622} cy={56} r={22} fill={sky} />
          {[
            [80, 50],
            [190, 80],
            [330, 44],
            [470, 90],
            [540, 40],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r={2.5} fill="white" />
          ))}
        </g>
      )}
      {!windy && (
        <text x={240} y={60} textAnchor="middle" fontSize={16} fill={day ? C.ink2 : '#dfe6f0'}>
          calm: no wind
        </text>
      )}

      {/* Solar */}
      {[0, 1, 2, 3].map((i) => (
        <SolarPanel key={i} x={36 + i * 50} y={278} on={i < n.solar} day={day} />
      ))}
      {/* Wind */}
      {Array.from({ length: n.wind }, (_, i) => (
        <Turbine key={i} x={252 + i * 30} hub={i % 2 ? 196 : 150} windy={windy} />
      ))}
      {n.wind === 0 && (
        <text x={297} y={250} textAnchor="middle" fontSize={15} fill={day ? C.muted : '#c3ccd8'}>
          no turbines
        </text>
      )}
      {/* Hydro: a river, dammed if there is a dam */}
      <path d="M372,232 Q384,262 380,300 L404,300 Q408,262 396,232 Z" fill={day ? '#6fb3e8' : '#3d6a96'} />
      {n.hydro > 0 && (
        <g>
          <rect x={360} y={226} width={50} height={26} rx={4} fill={day ? '#6fb3e8' : '#3d6a96'} stroke={C.ink} strokeWidth={2} />
          <path d="M356,252 L414,252 L420,300 L350,300 Z" fill="#b8bec7" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
          <rect x={378} y={276} width={14} height={24} fill={C.ink2} />
        </g>
      )}
      {/* Coal and gas */}
      {[0, 1].map((i) => (
        <Plant key={`c${i}`} x={446 + i * 48} kind="coal" on={i < n.coal} />
      ))}
      {[0, 1].map((i) => (
        <Plant key={`g${i}`} x={552 + i * 48} kind="gas" on={i < n.gas} />
      ))}

      {/* Power line */}
      <line x1={36} y1={332} x2={644} y2={332} stroke={lit > 0 ? C.orange : C.ink2} strokeWidth={3} />
      {[60, 200, 340, 480, 620].map((x) => (
        <line key={x} x1={x} y1={322} x2={x} y2={350} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      ))}
      {/* Town */}
      {Array.from({ length: HOUSES }, (_, i) => (
        <House key={i} x={46 + i * 60} lit={i < lit} day={day} />
      ))}

      {/* Controls */}
      {SOURCES.map((s, i) => {
        const x = 20 + (i % 3) * 217;
        const y = 440 + Math.floor(i / 3) * 116;
        const making = s.id === 'battery' ? 0 : out[s.id];
        const why = s.id === 'solar' && !day && n.solar ? ' (night)' : s.id === 'wind' && !windy && n.wind ? ' (calm)' : '';
        const tagColor = s.tag === 'Renewable' ? shade(C.green, -0.25) : s.tag === 'Storage' ? C.blue : shade(C.orange, -0.2);
        return (
          <g key={s.id}>
            <rect x={x} y={y} width={206} height={108} rx={14} fill={C.card} stroke={C.line} strokeWidth={2} />
            <text x={x + 12} y={y + 26} fontSize={16} fontWeight={700} fill={C.ink}>
              {s.name}
            </text>
            <text x={x + 12} y={y + 48} fontSize={15} fontWeight={700} fill={tagColor}>
              {s.tag}
            </text>
            <text x={x + 12} y={y + 72} fontSize={15} fill={C.ink2}>
              {s.id === 'battery' ? (n.battery ? `Charge ${Math.round((charge / CAP) * 100)}%` : 'None yet') : `Making ${making}${why}`}
            </text>
            {s.id === 'battery' ? (
              n.battery > 0 && (
                <text x={x + 12} y={y + 96} fontSize={15} fontWeight={700} fill={give > 0 ? C.orange : surplus > 0 && charge < CAP ? shade(C.green, -0.25) : C.muted}>
                  {give > 0 ? `Giving ${give}` : surplus > 0 && charge < CAP ? 'Charging' : charge >= CAP ? 'Full' : 'Waiting'}
                </text>
              )
            ) : (
              Array.from({ length: s.max }, (_, k) => (
                <rect key={k} x={x + 12 + k * 20} y={y + 84} width={14} height={14} rx={3} fill={k < n[s.id] ? tagColor : 'none'} stroke={tagColor} strokeWidth={2} />
              ))
            )}
            <SvgButton x={x + 146} y={y + 2} w={52} h={48} fontSize={26} label="+" title={`Add ${s.name.toLowerCase()}`} disabled={n[s.id] >= s.max} onClick={() => change(s.id, 1)} />
            <SvgButton x={x + 146} y={y + 55} w={52} h={48} fontSize={26} label="−" title={`Remove ${s.name.toLowerCase()}`} disabled={n[s.id] <= 0} onClick={() => change(s.id, -1)} />
            {waitFor === 'co2' && (s.id === 'coal' || s.id === 'gas') && <rect x={x - 5} y={y - 5} width={216} height={118} rx={18} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" />}
          </g>
        );
      })}

      {/* Predict → observe → explain */}
      <PoePanel x={690} y={24} w={280} poe={poe} />

      {/* Conditions */}
      <SvgButton x={690} y={316} w={135} h={56} fontSize={16} label={day ? 'Make it night' : 'Make it day'} color={day ? C.card : '#2c3a5e'} textColor={day ? C.ink : C.white} onClick={toggleDay} />
      <SvgButton x={835} y={316} w={135} h={56} fontSize={16} label={windy ? 'Stop the wind' : 'Start the wind'} onClick={toggleWind} />
      {(waitFor === 'night' || waitFor === 'battery' || waitFor === 'coal') && day && <rect x={684} y={310} width={147} height={70} rx={16} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" />}
      {waitFor === 'calm' && windy && <rect x={829} y={310} width={147} height={70} rx={16} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" />}

      {/* Meters */}
      <g transform="translate(690 392)">
        <rect width={280} height={272} rx={14} fill={C.card} stroke={C.line} strokeWidth={2} />
        <text x={16} y={28} fontSize={14} fill={C.muted} className="caps">
          Town power
        </text>
        <text x={16} y={58} fontSize={16} fontWeight={700} fill={C.ink}>
          Houses lit: {lit} of {HOUSES}
        </text>
        {Array.from({ length: HOUSES }, (_, k) => (
          <rect key={k} x={16 + k * 25} y={68} width={21} height={22} rx={4} fill={k < lit ? C.yellow : C.line} stroke={C.ink} strokeWidth={1.5} />
        ))}
        <text x={16} y={128} fontSize={16} fontWeight={700} fill={C.ink}>
          CO₂ from power: {co2 === 0 ? 'none' : co2}
        </text>
        {Array.from({ length: 12 }, (_, k) => (
          <circle key={k} cx={26 + k * 20.5} cy={150} r={8.5} fill={k < co2 ? '#6b7280' : 'none'} stroke={k < co2 ? C.ink : C.line} strokeWidth={1.5} />
        ))}
        <text x={16} y={198} fontSize={16} fontWeight={700} fill={C.ink}>
          From renewables: {share}%
        </text>
        <rect x={16} y={208} width={248} height={18} rx={9} fill={C.line} />
        {share > 0 && <rect x={16} y={208} width={Math.max(18, (248 * share) / 100)} height={18} rx={9} fill={shade(C.green, -0.1)} />}
        <text x={16} y={254} fontSize={15} fill={C.ink2}>
          Goal: 10 lit, day and night, low CO₂.
        </text>
      </g>

      <Callout at={[110, 290]} box={[40, 36]} w={230} icon={Sun} title="Renewable" text="Sunlight, wind and flowing water won’t run out. Coal and gas will, one day." />
      <style>{`
        .re-spin { animation: re-turn 1.6s linear infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes re-turn { to { transform: rotate(360deg); } }
        .re-smoke { animation: re-drift 2.4s ease-in-out infinite alternate; }
        @keyframes re-drift { to { transform: translate(4px, -6px); opacity: 0.7; } }
        @media (prefers-reduced-motion: reduce) { .re-spin, .re-smoke { animation: none; } }
      `}</style>
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <circle cx={100} cy={18} r={10} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
      <line x1={44} y1={70} x2={44} y2={28} stroke={C.ink} strokeWidth={3} />
      {[0, 120, 240].map((a) => (
        <path key={a} d="M-2,0 Q-3,-10 0,-18 Q3,-10 2,0 Z" fill="white" stroke={C.ink} strokeWidth={1.5} transform={`translate(44 28) rotate(${a + 20})`} />
      ))}
      <rect x={62} y={50} width={40} height={20} rx={2} fill="#3b6fd8" stroke={C.ink} strokeWidth={2} />
      <path d="M75,50 V70 M89,50 V70 M62,60 H102" stroke="#9db7ec" strokeWidth={1.2} />
      <rect x={10} y={46} width={18} height={24} rx={2} fill={C.green} stroke={C.ink} strokeWidth={2} />
      <rect x={15} y={40} width={8} height={6} fill={C.ink} />
    </svg>
  );
}

// ---------- practice ----------

const KINDS: { name: string; renewable: boolean; from: string }[] = [
  { name: 'Solar power', renewable: true, from: 'sunlight, which keeps shining every day' },
  { name: 'Wind power', renewable: true, from: 'moving air, which the sun’s heating keeps stirring up' },
  { name: 'Hydro power', renewable: true, from: 'flowing water, which rain keeps topping up' },
  { name: 'Coal', renewable: false, from: 'ancient plants buried for millions of years' },
  { name: 'Natural gas', renewable: false, from: 'ancient sea life buried for millions of years' },
  { name: 'Oil', renewable: false, from: 'ancient sea life buried for millions of years' },
];

function makeQuestion(level: number): Question {
  // Level 0: sort a source into renewable or non-renewable.
  if (level === 0) {
    const k = pick(KINDS);
    const answer = k.renewable ? 'Renewable' : 'Non-renewable';
    return {
      prompt: `${k.name}: renewable or non-renewable?`,
      choices: [{ value: 'Renewable' }, { value: 'Non-renewable' }],
      answer,
      hint: 'Will this energy source run out, or is it naturally topped up?',
      explain: [`${k.name} comes from ${k.from}.`, k.renewable ? 'It is topped up by nature, so it won’t run out.' : 'It took millions of years to form, so once we burn it, it is gone.', `So it is ${answer.toLowerCase()}.`],
    };
  }

  // Level 1: which source fits a situation?
  if (level === 1) {
    const kind = pick(['night-calm', 'co2', 'storage'] as const);
    if (kind === 'night-calm') {
      const right = 'A hydro dam';
      return {
        prompt: 'It is a calm night: no sun and no wind. Which renewable source can still make electricity?',
        choices: shuffle([right, 'Solar panels', 'Wind turbines']).map((value) => ({ value })),
        answer: right,
        hint: 'Which one doesn’t need sunshine or wind?',
        explain: ['Solar panels need sunlight, and wind turbines need wind.', 'A hydro dam uses flowing water, which keeps flowing day and night.', `So the answer is ${right.toLowerCase()}.`],
      };
    }
    if (kind === 'co2') {
      const right = 'A coal power plant';
      return {
        prompt: 'Which of these releases carbon dioxide (CO₂) when it makes electricity?',
        choices: shuffle([right, 'Solar panels', 'A wind turbine']).map((value) => ({ value })),
        answer: right,
        hint: 'Which one burns a fuel?',
        explain: ['Solar panels and wind turbines don’t burn anything.', 'A coal plant burns coal, and burning releases CO₂ into the air.', `So the answer is ${right.toLowerCase()}.`],
      };
    }
    const right = 'Store spare energy in batteries';
    return {
      prompt: 'A town runs on solar power. What could keep its lights on after sunset?',
      choices: shuffle([right, 'Add more solar panels', 'Use brighter light bulbs']).map((value) => ({ value })),
      answer: right,
      hint: 'Solar panels make nothing at night. How could you save daytime energy for later?',
      explain: ['At night, solar panels make no electricity, however many you have.', 'Spare energy made in the day can be stored and used later.', `So the answer is: ${right.toLowerCase()}.`],
    };
  }

  // Level 2: work with numbers.
  const kind = pick(['panels', 'battery-hours', 'spare'] as const);
  if (kind === 'panels') {
    const each = pick([2, 3, 4]);
    const need = rand(7, 15);
    const panels = Math.ceil(need / each);
    return {
      prompt: `A town needs ${need} units of power. Each solar panel makes ${each} units in the day. What is the fewest panels that power the whole town in the day?`,
      answer: String(panels),
      hint: `How many groups of ${each} do you need to reach at least ${need}?`,
      explain: [`${panels - 1} panels make ${(panels - 1) * each} units, which is not enough.`, `${panels} panels make ${panels * each} units, which is at least ${need}.`, `So you need ${panels} panels.`],
    };
  }
  if (kind === 'battery-hours') {
    const use = pick([4, 5, 6, 8, 10]);
    const hours = rand(2, 9);
    const stored = use * hours;
    return {
      prompt: `A battery stores ${stored} units. At night the town uses ${use} units each hour. For how many hours can the battery keep the lights on?`,
      answer: String(hours),
      hint: `How many lots of ${use} are there in ${stored}?`,
      explain: [`Each hour uses ${use} units.`, `${stored} ÷ ${use} = ${hours}.`, `So the battery lasts ${hours} hours.`],
    };
  }
  const made = rand(12, 24);
  const use = rand(6, made - 2);
  return {
    prompt: `On a sunny afternoon, solar panels make ${made} units each hour and the town uses ${use}. How many spare units go into the battery each hour?`,
    answer: String(made - use),
    hint: 'Spare means what is made but not used.',
    explain: [`Made: ${made}. Used: ${use}.`, `${made} − ${use} = ${made - use}.`, `So ${made - use} spare units are stored each hour.`],
  };
}

export const renewableEnergy: Lesson = {
  id: 'renewable-energy',
  title: 'Energy Sources',
  Thumb,
  Scene: EnergyScene,
  sceneHint: 'Add sources · Make it night · Stop the wind · Keep all 10 houses lit',
  learn: {
    heading: 'Where does electricity come from?',
    intro: 'Power stations turn energy from a source into electricity. Renewable sources, like sunlight, wind and flowing water, are topped up by nature and won’t run out. Non-renewable sources, like coal and gas, took millions of years to form and will run out one day.',
    points: [
      { icon: Sun, text: 'Solar panels turn sunlight into electricity, but they make none at night.' },
      { icon: Wind, text: 'Wind turbines spin in the wind, but stop when it is calm.' },
      { icon: Factory, text: 'Coal and gas plants work any time, but burning them adds carbon dioxide (CO₂) to the air.' },
      { icon: BatteryCharging, text: 'Storage, like batteries, saves spare energy for later. A good mix of sources keeps the lights on.' },
    ],
  },
  steps: [
    'Add power sources with + and −.',
    'Make it night, or stop the wind. Watch the houses.',
    'Add a battery to store spare energy for later.',
    'Can you keep all 10 houses lit, day and night, with little CO₂?',
  ],
  example: {
    question: 'A town uses solar panels and wind turbines. One evening the sun sets and the wind stops. How could it keep its lights on?',
    work: ['Solar panels need sunlight and turbines need wind, so both stop.', 'Energy stored earlier, in batteries, can be used now.', 'A steady source, like a hydro dam, can help too.'],
    answer: 'Use stored energy, or a steady source such as hydro power.',
  },
  grownups: [
    'The scene’s numbers are made easy to add, but the patterns are real: solar follows the sun, wind comes and goes, and coal releases roughly twice as much CO₂ as gas for the same electricity.',
    'Every source has trade-offs. Dams change rivers, wind and solar farms need space and materials, and fossil fuels add CO₂ and air pollution. Nuclear power (not shown) makes very little CO₂ but is not renewable.',
    'Real power grids balance supply and demand every moment, using a mix of sources, storage (batteries, pumped hydro) and links to other regions.',
    'Look up where your own electricity comes from together. Many countries publish live figures for their energy mix.',
  ],
  makeQuestion,
};
