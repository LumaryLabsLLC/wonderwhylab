import { useEffect, useState } from 'react';
import { ChartColumn, CloudSun, Sprout, Thermometer } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';
import { Mol } from './visuals/Particles';

/**
 * Weather is the state of the air now; climate is the average over many years (usually 30).
 * The town is made up but behaves like real records: daily highs swing by many degrees, yearly
 * averages wobble a little and drift upward. The greenhouse model is qualitative and true:
 * sunlight passes through the air, the warm ground gives off heat, and greenhouse gases send
 * some of it back. With none, Earth would average about −18 °C; it was about 14 °C in the 1850s
 * and is about 15 °C now (more than 1 °C of warming).
 */
type Mode = 'climate' | 'greenhouse';
type Air = 'none' | '1850s' | 'today';

const YEARS = 30;
const FIRST_YEAR = 1995;

/** Average summer high for each year: a slow rise of about 1 °C in 30 years, plus wobble. */
const YEARLY = Array.from({ length: YEARS }, (_, i) => Math.round((23.8 + 0.034 * i + 0.5 * Math.sin(1.7 * i) + 0.3 * Math.sin(4.1 * i + 1)) * 10) / 10);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const AVG_ALL = mean(YEARLY);
const AVG_FIRST = mean(YEARLY.slice(0, 10));
const AVG_LAST = mean(YEARLY.slice(-10));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** One summer week's highs in a given year: big swings from day to day. */
function week(i: number) {
  return DAYS.map((day, k) => {
    const swing = 6 * Math.sin(2.3 * k + i * 1.3) + 2 * Math.sin(5.1 * k + i);
    const icon = swing < -3 ? '🌧️' : swing < 1 ? '⛅' : '☀️';
    return { day, high: Math.round(YEARLY[i] + swing), icon };
  });
}

const AIR: Record<Air, { label: string; co2: number; back: number; temp: string; note: string }> = {
  none: { label: 'No greenhouse gases', co2: 0, back: 0, temp: 'about −18 °C', note: 'Frozen over' },
  '1850s': { label: 'Air in the 1850s', co2: 4, back: 3, temp: 'about 14 °C', note: 'Natural greenhouse effect' },
  today: { label: 'Air today', co2: 6, back: 4, temp: 'about 15 °C', note: 'More than 1 °C warmer' },
};

interface ClimateChallenge extends Challenge {
  kind: 'variety' | 'trend' | 'no-gases' | 'more-co2';
  mode: Mode;
}

const CHALLENGES: ClimateChallenge[] = [
  {
    kind: 'variety',
    mode: 'climate',
    question: 'Step to another year. Which changes more?',
    options: ['Daily highs', 'Yearly average'],
    actual: 'Daily highs',
    because: 'Day to day, highs swing by many degrees. The yearly average only moves a little: that steadier pattern is climate.',
  },
  {
    kind: 'trend',
    mode: 'climate',
    question: 'Compare the first 10 years with the last 10. Summers are…',
    options: ['Warmer now', 'Cooler now', 'Same'],
    actual: 'Warmer now',
    because: 'Single years go up and down, but the last 10 years average warmer than the first 10. That is a change in climate.',
  },
  {
    kind: 'no-gases',
    mode: 'greenhouse',
    question: 'Take away all greenhouse gases. Earth’s average temperature will…',
    options: ['Rise', 'Fall', 'Same'],
    actual: 'Fall',
    because: 'With nothing to send heat back, Earth would average about −18 °C. A natural greenhouse effect keeps it warm enough for life.',
  },
  {
    kind: 'more-co2',
    mode: 'greenhouse',
    question: 'Burning fossil fuels adds CO₂. Earth’s average temperature will…',
    options: ['Rise', 'Fall', 'Same'],
    actual: 'Rise',
    because: 'Extra CO₂ sends more heat back down. Since the 1850s, Earth’s average has risen by more than 1 °C.',
  },
];

const nextChallenge = (prev: ClimateChallenge | null) => pick(CHALLENGES.filter((c) => c.kind !== prev?.kind));

const DASH = { fill: 'none', stroke: C.teal, strokeWidth: 3, strokeDasharray: '8 6' } as const;
/** A pale outline so chart labels stay readable over the bars. */
const HALO = { stroke: C.card, strokeWidth: 5, strokeLinejoin: 'round', paintOrder: 'stroke' } as const;

// ---------- weather & climate ----------

const CHART = { x: 72, top: 330, bottom: 560, lo: 20, hi: 26.5, slot: 19 };
const ty = (t: number) => CHART.bottom - ((t - CHART.lo) / (CHART.hi - CHART.lo)) * (CHART.bottom - CHART.top);
const warmth = (t: number) => shade(t >= AVG_ALL ? C.orange : C.blue, t >= AVG_ALL ? 0.15 - (t - AVG_ALL) * 0.25 : 0.3 - (AVG_ALL - t) * 0.25);

function ClimateView({ year, setYear, showAvg, showDecades }: { year: number; setYear: (i: number) => void; showAvg: boolean; showDecades: boolean }) {
  const days = week(year);
  return (
    <g>
      <text x={56} y={118} fontSize={14} fontWeight={700} fill={C.blue} className="caps">
        Weather · one summer week in {FIRST_YEAR + year}
      </text>
      {days.map((d, k) => (
        <g key={d.day} transform={`translate(${56 + k * 86} 130)`}>
          <rect width={80} height={150} rx={12} fill={C.card} stroke={C.line} strokeWidth={2} />
          <text x={40} y={26} textAnchor="middle" fontSize={15} fill={C.muted}>
            {d.day}
          </text>
          <text x={40} y={72} textAnchor="middle" dominantBaseline="central" fontSize={40} style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>
            {d.icon}
          </text>
          <text x={40} y={128} textAnchor="middle" fontSize={26} fontWeight={700} fill={d.high >= 28 ? shade(C.orange, -0.25) : d.high <= 20 ? C.blue : C.ink}>
            {d.high}°
          </text>
        </g>
      ))}

      <text x={56} y={318} fontSize={14} fontWeight={700} fill={C.purple} className="caps">
        Climate · average summer high, every year
      </text>
      {[22, 24, 26].map((t) => (
        <g key={t}>
          <line x1={CHART.x - 4} x2={640} y1={ty(t)} y2={ty(t)} stroke={C.line} strokeWidth={1.5} />
          <text x={CHART.x - 8} y={ty(t) + 5} textAnchor="end" fontSize={15} fill={C.muted}>
            {t}°
          </text>
        </g>
      ))}
      {YEARLY.map((t, i) => {
        const x = CHART.x + i * CHART.slot;
        const sel = i === year;
        return (
          <g key={i} onClick={() => setYear(i)} style={{ cursor: 'pointer' }} data-nopan>
            <rect x={x} y={CHART.top} width={CHART.slot} height={CHART.bottom - CHART.top} fill="transparent" />
            <rect x={x + 2} y={ty(t)} width={CHART.slot - 4} height={CHART.bottom - ty(t)} rx={3} fill={sel ? C.yellow : warmth(t)} stroke={sel ? C.ink : 'none'} strokeWidth={2} />
          </g>
        );
      })}
      <line x1={CHART.x - 4} x2={640} y1={CHART.bottom} y2={CHART.bottom} stroke={C.ink} strokeWidth={2} />
      {[0, 5, 10, 15, 20, 25].map((i) => (
        <text key={i} x={CHART.x + i * CHART.slot + CHART.slot / 2} y={580} textAnchor="middle" fontSize={15} fill={C.muted}>
          {FIRST_YEAR + i}
        </text>
      ))}
      <text x={CHART.x + year * CHART.slot + CHART.slot / 2} y={ty(YEARLY[year]) - 8} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink} {...HALO}>
        {YEARLY[year].toFixed(1)}°
      </text>
      {showAvg && (
        <g>
          <line x1={CHART.x} x2={640} y1={ty(AVG_ALL)} y2={ty(AVG_ALL)} stroke={C.ink} strokeWidth={2.5} strokeDasharray="10 6" />
          <text x={640} y={318} textAnchor="end" fontSize={15} fontWeight={700} fill={C.ink}>
            - - 30-year average {AVG_ALL.toFixed(1)}°
          </text>
        </g>
      )}
      {showDecades && (
        <g>
          <line x1={CHART.x} x2={CHART.x + 10 * CHART.slot} y1={ty(AVG_FIRST)} y2={ty(AVG_FIRST)} stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
          <line x1={CHART.x + 20 * CHART.slot} x2={CHART.x + 30 * CHART.slot} y1={ty(AVG_LAST)} y2={ty(AVG_LAST)} stroke={C.red} strokeWidth={5} strokeLinecap="round" />
          <text x={CHART.x + 5 * CHART.slot} y={ty(AVG_FIRST) - 34} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.blue} {...HALO}>
            first 10: {AVG_FIRST.toFixed(1)}°
          </text>
          <text x={CHART.x + 25 * CHART.slot} y={ty(AVG_LAST) - 34} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.red} {...HALO}>
            last 10: {AVG_LAST.toFixed(1)}°
          </text>
        </g>
      )}
    </g>
  );
}

// ---------- greenhouse effect ----------

const HEAT_X = [290, 350, 410, 470, 530, 590];
/** Greenhouse gas molecules that aren't sitting where a heat arrow turns back. */
const SPARE_MOLS: [number, number, number][] = [
  [130, 352, -15],
  [220, 402, 20],
];

function wavy(x: number, from: number, to: number) {
  let d = `M${x},${from}`;
  for (let y = from, k = 0; y - 20 >= to; y -= 20, k++) d += ` q${k % 2 ? -8 : 8},-10 0,-20`;
  return d;
}

function GreenhouseView({ air }: { air: Air }) {
  const a = AIR[air];
  return (
    <g>
      <defs>
        <marker id="cvw-head-sun" viewBox="0 0 10 10" refX={5} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill={C.yellow} />
        </marker>
        <marker id="cvw-head-heat" viewBox="0 0 10 10" refX={5} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="#ff7a5c" />
        </marker>
      </defs>
      {/* space, atmosphere, ground */}
      <path d="M58,92 H642 Q660,92 660,110 V312 H40 V110 Q40,92 58,92 Z" fill="#18213a" />
      {[
        [300, 120],
        [380, 170],
        [250, 250],
        [520, 260],
        [620, 240],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={2} fill="white" opacity={0.8} />
      ))}
      <rect x={40} y={312} width={620} height={120} fill={air === 'none' ? '#dfe9f2' : air === 'today' ? '#c7ddf0' : '#d3e6f5'} />
      <text x={56} y={334} fontSize={14} fill={C.ink2} className="caps">
        Atmosphere
      </text>
      <path d="M40,450 Q350,420 660,450 V562 Q660,580 642,580 H58 Q40,580 40,562 Z" fill={air === 'none' ? '#e8f1f8' : '#8fcf7e'} stroke={C.ink} strokeWidth={2} />
      <text x={56} y={566} fontSize={14} fill={C.ink2} className="caps">
        Earth’s surface
      </text>
      {air === 'none' && (
        <text x={350} y={514} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.blue}>
          ice everywhere
        </text>
      )}

      {/* sun and sunlight: it passes through the air and warms the ground */}
      <circle cx={110} cy={160} r={42} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
      {[
        [140, 200, 200, 440],
        [158, 192, 260, 438],
        [176, 184, 320, 436],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.yellow} strokeWidth={5} markerEnd="url(#cvw-head-sun)" />
      ))}
      <text x={64} y={290} fontSize={15} fontWeight={700} fill="#ffe08a">
        sunlight
      </text>

      {/* heat from the ground: some escapes to space, some is sent back by greenhouse gases */}
      {HEAT_X.map((x, i) => {
        const back = i < a.back;
        return (
          <g key={x}>
            <path d={wavy(x, 440, back ? 372 : 232)} fill="none" stroke="#ff7a5c" strokeWidth={3.5} markerEnd="url(#cvw-head-heat)" />
            {back && <line x1={x + 16} y1={372} x2={x + 16} y2={436} stroke="#ff7a5c" strokeWidth={3} strokeDasharray="6 5" markerEnd="url(#cvw-head-heat)" />}
          </g>
        );
      })}
      <text x={604} y={300} fontSize={15} fontWeight={700} fill="#ffb3a1">
        heat
      </text>
      {/* each returning heat arrow turns back at a greenhouse gas molecule */}
      {[...HEAT_X.slice(0, a.back).map((x): [number, number, number] => [x + 8, 358, 0]), ...SPARE_MOLS.slice(0, a.co2 - a.back)].map(([x, y, r], i) => (
        <Mol key={i} kind="co2" x={x} y={y} rot={r} />
      ))}

      {/* burning fossil fuels adds the extra CO₂ */}
      {air === 'today' && (
        <g>
          <rect x={86} y={482} width={18} height={40} fill="#8a6d5a" stroke={C.ink} strokeWidth={2} />
          <rect x={60} y={506} width={64} height={36} rx={4} fill="#a6866f" stroke={C.ink} strokeWidth={2.5} />
          {[0, 1, 2].map((k) => (
            <circle key={k} cx={98 + k * 8} cy={468 - k * 16} r={8 + k * 2} fill="#6b7280" opacity={0.85} />
          ))}
          <text x={136} y={530} fontSize={15} fill={C.ink}>
            burning coal, oil and gas
          </text>
        </g>
      )}

      {/* thermometer */}
      <g transform="translate(410 108)">
        <rect width={230} height={100} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <text x={16} y={26} fontSize={14} fill={C.muted} className="caps">
          Earth’s average
        </text>
        <text x={16} y={60} fontSize={28} fontWeight={700} fill={air === 'none' ? C.blue : air === 'today' ? shade(C.orange, -0.2) : C.ink}>
          {a.temp}
        </text>
        <text x={16} y={86} fontSize={15} fill={C.ink2}>
          {a.note}
        </text>
      </g>
    </g>
  );
}

// ---------- scene ----------

function ClimateScene() {
  const [mode, setMode] = useState<Mode>('climate');
  const [year, setYearState] = useState(15);
  const [showAvg, setShowAvg] = useState(false);
  const [showDecades, setShowDecades] = useState(false);
  const [air, setAirState] = useState<Air>('1850s');
  const poe = usePoe<ClimateChallenge>(nextChallenge);

  // Once the child predicts, set up a fair start for that experiment.
  useEffect(() => {
    if (poe.guess === null) return;
    setMode(poe.challenge.mode);
    setShowAvg(false);
    setShowDecades(false);
    setAirState('1850s');
  }, [poe.guess, poe.challenge]);

  const waitFor = poe.waiting ? poe.challenge.kind : null;
  const observeIf = (ok: boolean) => {
    if (ok) window.setTimeout(poe.observe, 700);
  };

  const setYear = (i: number) => {
    const next = Math.max(0, Math.min(YEARS - 1, i));
    if (next === year) return;
    setYearState(next);
    play('tap');
    observeIf(waitFor === 'variety');
  };
  const toggleDecades = () => {
    setShowDecades((s) => !s);
    play('pop');
    observeIf(!showDecades && waitFor === 'trend');
  };
  const setAir = (next: Air) => {
    setAirState(next);
    play(next === 'none' ? 'whoosh' : 'pop');
    observeIf((next === 'none' && waitFor === 'no-gases') || (next === 'today' && waitFor === 'more-co2'));
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    play('tap');
  };

  return (
    <SceneSvg label={mode === 'climate' ? 'A week of weather and 30 years of climate for one town' : 'A model of the greenhouse effect'}>
      <SvgButton x={40} y={24} w={230} h={52} fontSize={17} label="Weather & climate" active={mode === 'climate'} color={mode === 'climate' ? shade(C.yellow, 0.4) : C.card} onClick={() => switchMode('climate')} />
      <SvgButton x={280} y={24} w={230} h={52} fontSize={17} label="Greenhouse effect" active={mode === 'greenhouse'} color={mode === 'greenhouse' ? shade(C.yellow, 0.4) : C.card} onClick={() => switchMode('greenhouse')} />

      {mode === 'climate' ? (
        <g>
          <ClimateView year={year} setYear={setYear} showAvg={showAvg} showDecades={showDecades} />
          <SvgButton x={40} y={598} w={56} h={56} fontSize={24} label="◀" title="Earlier year" disabled={year === 0} onClick={() => setYear(year - 1)} />
          <text x={140} y={634} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
            {FIRST_YEAR + year}
          </text>
          <SvgButton x={184} y={598} w={56} h={56} fontSize={24} label="▶" title="Later year" disabled={year === YEARS - 1} onClick={() => setYear(year + 1)} />
          <SvgButton x={256} y={598} w={190} h={56} fontSize={17} label={showAvg ? 'Hide average' : 'Show average'} active={showAvg} onClick={() => setShowAvg((s) => !s)} />
          <SvgButton x={456} y={598} w={204} h={56} fontSize={17} label="Compare decades" active={showDecades} color={showDecades ? shade(C.purple, 0.75) : C.card} onClick={toggleDecades} />
          {waitFor === 'variety' && <rect x={34} y={592} width={212} height={70} rx={16} {...DASH} />}
          {waitFor === 'trend' && !showDecades && <rect x={450} y={592} width={216} height={70} rx={16} {...DASH} />}
        </g>
      ) : (
        <g>
          <GreenhouseView air={air} />
          {(['none', '1850s', 'today'] as Air[]).map((k, i) => (
            <SvgButton key={k} x={40 + [0, 210, 410][i]} y={598} w={i === 0 ? 200 : 190} h={56} fontSize={16} label={AIR[k].label} active={air === k} color={air === k ? shade(C.yellow, 0.4) : C.card} onClick={() => setAir(k)} />
          ))}
          {waitFor === 'no-gases' && air !== 'none' && <rect x={34} y={592} width={212} height={70} rx={16} {...DASH} />}
          {waitFor === 'more-co2' && air !== 'today' && <rect x={444} y={592} width={202} height={70} rx={16} {...DASH} />}
          <Callout at={[298, 358]} box={[176, 104]} w={210} icon={Thermometer} title="Greenhouse gas" text="CO₂ lets sunlight through, but soaks up some of the heat rising from the ground and sends part of it back down." />
        </g>
      )}

      {/* Predict → observe → explain */}
      <PoePanel x={690} y={24} w={280} poe={poe} />

      {/* Key ideas */}
      <g transform="translate(690 316)">
        <rect width={280} height={348} rx={14} fill={C.card} stroke={C.line} strokeWidth={2} />
        {mode === 'climate' ? (
          <g>
            <text x={16} y={30} fontSize={15} fontWeight={700} fill={C.blue} className="caps">
              Weather
            </text>
            {wrap('What the air is doing now: sunny or rainy, hot or cold, today or this week.', 29).map((l, i) => (
              <text key={l} x={16} y={56 + i * 21} fontSize={16} fill={C.ink}>
                {l}
              </text>
            ))}
            <text x={16} y={146} fontSize={15} fontWeight={700} fill={C.purple} className="caps">
              Climate
            </text>
            {wrap('The usual weather in a place: the average over many years, usually 30.', 29).map((l, i) => (
              <text key={l} x={16} y={172 + i * 21} fontSize={16} fill={C.ink}>
                {l}
              </text>
            ))}
            {wrap('One cold day is weather. A warmer 30-year average is a change in climate.', 31).map((l, i) => (
              <text key={l} x={16} y={262 + i * 21} fontSize={15} fill={C.ink2} fontStyle="italic">
                {l}
              </text>
            ))}
          </g>
        ) : (
          <g>
            <text x={16} y={30} fontSize={15} fontWeight={700} fill={shade(C.green, -0.3)} className="caps">
              Ways to help
            </text>
            {[
              ['🚲', 'Walk, cycle or take the bus'],
              ['💡', 'Switch off lights and screens'],
              ['☀️', 'Choose clean energy, like solar and wind'],
              ['🌳', 'Plant trees and waste less food'],
            ].map(([icon, text], i) => (
              <g key={text} transform={`translate(16 ${50 + i * 56})`}>
                <text x={12} y={14} textAnchor="middle" dominantBaseline="central" fontSize={24} style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>
                  {icon}
                </text>
                {wrap(text, 25).map((l, k) => (
                  <text key={l} x={38} y={12 + k * 20} fontSize={16} fill={C.ink}>
                    {l}
                  </text>
                ))}
              </g>
            ))}
            {wrap('Millions of people are already helping, and clean energy is growing fast.', 31).map((l, i) => (
              <text key={l} x={16} y={290 + i * 20} fontSize={15} fill={shade(C.green, -0.3)} fontWeight={700}>
                {l}
              </text>
            ))}
          </g>
        )}
      </g>
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[23, 24, 23.5, 24.5, 24, 25, 24.6, 25.5].map((t, i) => (
        <rect key={i} x={12 + i * 12} y={72 - (t - 20) * 9} width={9} height={(t - 20) * 9} rx={2} fill={t >= 24.5 ? C.orange : shade(C.blue, 0.3)} stroke={C.ink} strokeWidth={1.2} />
      ))}
      <line x1={8} x2={112} y1={72} y2={72} stroke={C.ink} strokeWidth={2} />
      <circle cx={96} cy={14} r={9} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
      <path d="M14,20 q4,-8 12,-6 q4,-6 12,-2 q8,0 7,8 Z" fill="white" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ---------- practice ----------

const STATEMENTS: { text: string; kind: 'Weather' | 'Climate'; why: string }[] = [
  { text: 'It is raining in my town right now.', kind: 'Weather', why: 'It describes the air at one moment.' },
  { text: 'Tomorrow will be windy.', kind: 'Weather', why: 'It describes a single day.' },
  { text: 'This afternoon it is 31 °C.', kind: 'Weather', why: 'It describes one afternoon.' },
  { text: 'There was a thunderstorm last night.', kind: 'Weather', why: 'It describes one night.' },
  { text: 'Deserts get very little rain in most years.', kind: 'Climate', why: 'It describes the usual pattern over many years.' },
  { text: 'Summers here are usually hot and dry.', kind: 'Climate', why: 'It describes what is usual, year after year.' },
  { text: 'Over the last 30 years, July here averaged 24 °C.', kind: 'Climate', why: 'It is an average over 30 years.' },
  { text: 'Rainforests are warm and wet all year round.', kind: 'Climate', why: 'It describes the long-term pattern of a place.' },
];

function makeQuestion(level: number): Question {
  // Level 0: weather or climate?
  if (level === 0) {
    const s = pick(STATEMENTS);
    return {
      prompt: `“${s.text}” Is this about weather or climate?`,
      choices: [{ value: 'Weather' }, { value: 'Climate' }],
      answer: s.kind,
      hint: 'Is it about a short time (now, today) or what usually happens over many years?',
      explain: [s.why, s.kind === 'Weather' ? 'Weather is what the air is doing over a short time.' : 'Climate is the average weather over many years.', `So it is about ${s.kind.toLowerCase()}.`],
    };
  }

  // Level 1: the greenhouse effect and what helps.
  if (level === 1) {
    const kind = pick(['what', 'source', 'without', 'help'] as const);
    if (kind === 'what') {
      const right = 'Trap some of Earth’s heat';
      return {
        prompt: 'What do greenhouse gases, like CO₂, do?',
        choices: shuffle([right, 'Block sunlight from reaching Earth', 'Make the Sun hotter']).map((value) => ({ value })),
        answer: right,
        hint: 'Think about the heat rising from the warm ground.',
        explain: ['Sunlight passes through the air and warms the ground.', 'The ground gives off heat, and greenhouse gases send some of it back down.', `So greenhouse gases ${right.toLowerCase()}.`],
      };
    }
    if (kind === 'source') {
      const right = 'Burning coal, oil and gas';
      return {
        prompt: 'Which of these adds the most CO₂ to the air?',
        choices: shuffle([right, 'Wind turbines turning', 'Trees growing']).map((value) => ({ value })),
        answer: right,
        hint: 'Which one burns a fuel?',
        explain: ['Wind turbines don’t burn anything, and growing trees take CO₂ in.', 'Burning fossil fuels releases CO₂.', `So the answer is ${right.toLowerCase()}.`],
      };
    }
    if (kind === 'without') {
      const right = 'Much colder';
      return {
        prompt: 'If Earth had no greenhouse gases at all, it would be…',
        choices: shuffle([right, 'Much hotter', 'Exactly the same']).map((value) => ({ value })),
        answer: right,
        hint: 'Greenhouse gases keep some heat in. What if nothing kept it in?',
        explain: ['Without greenhouse gases, heat would escape straight to space.', 'Earth’s average would be about −18 °C instead of about 15 °C.', `So it would be ${right.toLowerCase()}.`],
      };
    }
    const right = 'Walking or cycling short trips';
    return {
      prompt: 'Which choice helps cut the CO₂ we add to the air?',
      choices: shuffle([right, 'Leaving lights on all day', 'Driving to the house next door']).map((value) => ({ value })),
      answer: right,
      hint: 'Which one uses less fuel or electricity?',
      explain: ['Cars burn fuel, and much electricity still comes from burning fuel.', 'Walking and cycling burn no fuel at all.', `So the helpful choice is ${right.toLowerCase()}.`],
    };
  }

  // Level 2: averages, and reasoning about weather vs climate.
  const kind = pick(['mean', 'diff', 'cold'] as const);
  if (kind === 'mean') {
    const m = rand(18, 27);
    const offsets = shuffle(pick([
      [-2, -1, 0, 1, 2],
      [-3, 1, 0, 2, 0],
      [-1, -1, 0, 0, 2],
      [-2, 0, 1, 1, 0],
    ]));
    const temps = offsets.map((o) => m + o);
    const sum = temps.reduce((a, b) => a + b, 0);
    return {
      prompt: `Five summers in a town had average highs of ${temps.join(', ')} °C. What is the average of these five?`,
      answer: String(m),
      hint: 'Add them all up, then share the total equally between the 5 summers.',
      explain: [`${temps.join(' + ')} = ${sum}.`, `${sum} ÷ 5 = ${m}.`, `So the average is ${m} °C.`],
    };
  }
  if (kind === 'diff') {
    const first = rand(200, 260); // tenths of a degree
    const rise = rand(3, 12);
    const f = (first / 10).toFixed(1);
    const l = ((first + rise) / 10).toFixed(1);
    const d = (rise / 10).toFixed(1);
    return {
      prompt: `A town’s summers averaged ${f} °C from 1975 to 2004, and ${l} °C from 1995 to 2024. How many degrees warmer is the newer 30-year average?`,
      answer: d,
      allowDecimal: true,
      hint: 'Find the difference between the two averages.',
      explain: [`Take the older average from the newer one.`, `${l} − ${f} = ${d}.`, `So it is ${d} °C warmer.`],
    };
  }
  const right = 'No: one winter is weather';
  return {
    prompt: 'A town has its coldest winter in 20 years, but its 30-year average keeps rising. Is its climate cooling?',
    choices: shuffle([right, 'Yes: it was very cold', 'Yes: cold winters prove it']).map((value) => ({ value })),
    answer: right,
    hint: 'Is one winter a short time or a long time?',
    explain: ['A single winter is a short time, so it is weather.', 'Climate is the long-term average, and that is still rising.', `So the answer is: ${right.toLowerCase()}.`],
  };
}

export const climateVsWeather: Lesson = {
  id: 'climate-vs-weather',
  title: 'Climate and Weather',
  Thumb,
  Scene: ClimateScene,
  sceneHint: 'Step through the years · Compare decades · Change the air in the greenhouse model',
  learn: {
    heading: 'Weather is now. Climate is the long run.',
    intro: 'Weather is what the air is doing right now: sunny, rainy, windy, hot or cold. Climate is the average weather in a place over many years, usually 30. Greenhouse gases keep Earth warm, but extra carbon dioxide (CO₂) from burning fossil fuels is making it warmer.',
    points: [
      { icon: CloudSun, text: 'Weather changes by the hour and the day. One cold day doesn’t change the climate.' },
      { icon: ChartColumn, text: 'Climate is the long-term average. Scientists usually average 30 years of weather.' },
      { icon: Thermometer, text: 'Greenhouse gases like CO₂ trap some of Earth’s heat. Without them, Earth would be frozen.' },
      { icon: Sprout, text: 'Burning coal, oil and gas adds CO₂, and Earth’s average has risen over 1 °C. Clean energy, saving energy and planting trees all help.' },
    ],
  },
  steps: [
    'Weather & climate: step through the years with ◀ and ▶. Compare the week with the chart.',
    'Show the average, then compare the first 10 years with the last 10.',
    'Greenhouse effect: change the air and watch the heat arrows and the thermometer.',
    'Predict first each time, then test it.',
  ],
  example: {
    question: 'It snowed one day in April. Your friend says, “So much for global warming!” What could you tell them?',
    work: ['Snow on one day is weather.', 'Climate is the average over many years.', 'Long-term averages show Earth getting warmer, even with some cold days.'],
    answer: 'One cold day is weather; the long-term average is still rising.',
  },
  grownups: [
    'Climate is usually described with 30-year averages (meteorologists call them climate “normals”).',
    'The greenhouse effect is natural and essential: without it Earth would average about −18 °C instead of about 15 °C. Extra CO₂ from fossil fuels strengthens it, and the global average has risen by more than 1 °C since the late 1800s.',
    'The town in the chart is made up, but its pattern (noisy years, slowly rising average) is typical of real temperature records.',
    'Keep it hopeful and practical. If your child feels worried, say that’s OK, and talk about what people, cities and countries are doing, and what you can do together.',
  ],
  makeQuestion,
};
