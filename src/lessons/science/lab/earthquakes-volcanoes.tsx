import { useState } from 'react';
import { Activity, House, Layers, Mountain } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { choices } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { WrapText } from './visuals/Draggable';
import { useProgress } from './visuals/useProgress';

/**
 * Two activities in one scene:
 *  - Plates: the crust is broken into plates that move a few centimetres a year. Push them together,
 *    pull them apart or slide them past each other and watch what happens at the edge.
 *  - Shake table: an engineering test. Add braces, a wide base or rubber pads, then shake.
 * The mantle under the plates is hot rock that flows very slowly; it is mostly solid, not a sea of lava.
 */

type Motion = 'together' | 'apart' | 'slide';
type Mode = 'plates' | 'shake';

const MOTIONS: Record<Motion, { label: string; question: string; options: string[]; actual: string; because: string }> = {
  together: {
    label: 'Push together',
    question: 'Plates push together. What forms?',
    options: ['Mountains', 'A gap', 'Nothing'],
    actual: 'Mountains',
    because:
      'The crust crumples up into mountains and one plate sinks under the other. Rock melts deep down and rises to make volcanoes. Sudden slips shake the ground.',
  },
  apart: {
    label: 'Pull apart',
    question: 'Plates pull apart. What fills the gap?',
    options: ['Melted rock', 'Sea water', 'Nothing'],
    actual: 'Melted rock',
    because: 'Hot magma rises into the gap, cools and hardens into new rock. Volcanoes often form there too.',
  },
  slide: {
    label: 'Slide past',
    question: 'Plates slide past. Smooth or jerky?',
    options: ['Smooth', 'Stick, then jerk'],
    actual: 'Stick, then jerk',
    because: 'The plates catch on each other and the rock bends. When it suddenly slips, the ground shakes: an earthquake.',
  },
};

// Plate model area (left side of the world).
const BOX = { x: 40, y: 92, w: 560, h: 420 };
const SURFACE = 300; // top of the crust in the side view
const CRUST = 62;

/** Small wiggly "earthquake" marks around a point. */
function Shakes({ x, y, k }: { x: number; y: number; k: number }) {
  if (k <= 0) return null;
  return (
    <g stroke={C.red} strokeWidth={3} fill="none" opacity={Math.min(1, k)} strokeLinecap="round">
      <path d={`M${x - 70},${y - 10} l8,-10 l8,10 l8,-10 l8,10`} />
      <path d={`M${x + 38},${y - 10} l8,-10 l8,10 l8,-10 l8,10`} />
      <path d={`M${x - 20},${y - 40} l8,-10 l8,10 l8,-10 l8,10`} />
    </g>
  );
}

/** Side view: two crust plates on the slowly flowing mantle. */
function SideView({ motion, p }: { motion: 'together' | 'apart'; p: number }) {
  const mid = BOX.x + BOX.w / 2;
  const right = BOX.x + BOX.w;
  const together = motion === 'together';
  const volcano = together ? Math.max(0, (p - 0.45) / 0.55) : Math.max(0, (p - 0.3) / 0.7);
  const quake = p > 0.25 && p < 0.95 ? Math.sin(p * 40) * 0.5 + 0.5 : 0;
  const arrowY = SURFACE + CRUST / 2 + 4;

  // Pushing together: the ocean plate (right) dives under the land plate (left), which crumples up.
  const leftEnd = together ? mid + 10 * p : mid - 40 * p;
  const rightStart = together ? mid : mid + 40 * p;
  const mountain = together ? 100 * p : 0;
  const peakX = leftEnd - 110;
  const peakY = SURFACE - mountain;
  const tipX = mid - 4 - 70 * p;
  const dip = 120 * p;

  return (
    <g>
      {/* sky and mantle */}
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={SURFACE - BOX.y} fill={shade(C.blue, 0.85)} />
      <rect x={BOX.x} y={SURFACE + CRUST - 4} width={BOX.w} height={BOX.y + BOX.h - (SURFACE + CRUST - 4)} fill={shade(C.orange, 0.45)} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${BOX.x + 30 + i * 180},${SURFACE + CRUST + 80} q60,-30 120,0`} fill="none" stroke={shade(C.orange, -0.2)} strokeWidth={3} strokeDasharray="6 7" />
      ))}
      <text x={BOX.x + 16} y={BOX.y + BOX.h - 16} fontSize={15} fill={shade(C.orange, -0.55)}>
        Mantle: hot rock that flows very, very slowly
      </text>

      {together ? (
        <>
          {/* ocean plate, drawn first so it slides under the land plate */}
          <path
            d={`M${right},${SURFACE + 4} L${mid + 60},${SURFACE + 6} Q${mid + 14},${SURFACE + 8} ${tipX},${SURFACE + 6 + dip} L${tipX - 4},${SURFACE + 6 + dip + CRUST * 0.85} Q${mid + 30},${SURFACE + CRUST + 12} ${mid + 90},${SURFACE + CRUST} L${right},${SURFACE + CRUST} Z`}
            fill={shade(C.brown, 0.15)}
            stroke={C.ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <path d={`M${right},${SURFACE + 4} L${mid + 60},${SURFACE + 6}`} stroke={C.blue} strokeWidth={10} />
          {/* land plate, crumpling into mountains */}
          <path
            d={`M${BOX.x},${SURFACE} L${peakX - 150},${SURFACE} Q${peakX - 40},${SURFACE - mountain * 0.5} ${peakX},${peakY} Q${peakX + 40},${SURFACE - mountain * 0.5} ${leftEnd},${SURFACE - mountain * 0.15} L${leftEnd},${SURFACE + CRUST} L${BOX.x},${SURFACE + CRUST} Z`}
            fill={C.green}
            stroke={C.ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <rect x={BOX.x + 1.5} y={SURFACE + 12} width={Math.max(0, leftEnd - BOX.x - 3)} height={CRUST - 13} fill={shade(C.brown, 0.3)} />
          {/* magma rises from the sinking plate and erupts */}
          {volcano > 0 && (
            <g>
              <ellipse cx={peakX + 10} cy={SURFACE + CRUST + 34} rx={22} ry={13} fill={C.red} opacity={0.9} />
              <path d={`M${peakX + 10},${SURFACE + CRUST + 30} L${peakX},${SURFACE + CRUST + 30 - (CRUST + 30 + mountain - 4) * volcano}`} stroke={C.red} strokeWidth={9} strokeLinecap="round" />
              <text x={peakX + 40} y={SURFACE + CRUST + 40} fontSize={15} fontWeight={700} fill={shade(C.red, -0.45)}>
                Magma
              </text>
            </g>
          )}
          {volcano > 0.8 && (
            <g>
              <ellipse cx={peakX} cy={peakY + 3} rx={10} ry={5} fill={C.orange} stroke={C.red} strokeWidth={2} />
              <path d={`M${peakX - 6},${peakY + 6} q-6,10 -16,16 q-6,4 -10,14 M${peakX + 6},${peakY + 6} q5,9 14,14 q5,4 8,12`} stroke={C.red} strokeWidth={5} fill="none" strokeLinecap="round" />
              <circle cx={peakX - 8} cy={peakY - 26} r={14} fill={C.muted} opacity={0.55} />
              <circle cx={peakX + 10} cy={peakY - 46} r={18} fill={C.muted} opacity={0.45} />
              <circle cx={peakX - 4} cy={peakY - 70} r={14} fill={C.muted} opacity={0.35} />
            </g>
          )}
        </>
      ) : (
        <>
          <rect x={BOX.x} y={SURFACE} width={Math.max(0, leftEnd - BOX.x)} height={CRUST} fill={shade(C.brown, 0.3)} stroke={C.ink} strokeWidth={2.5} />
          <rect x={BOX.x} y={SURFACE} width={Math.max(0, leftEnd - BOX.x)} height={12} fill={C.green} />
          <rect x={rightStart} y={SURFACE} width={Math.max(0, right - rightStart)} height={CRUST} fill={shade(C.brown, 0.15)} stroke={C.ink} strokeWidth={2.5} />
          <rect x={rightStart} y={SURFACE} width={Math.max(0, right - rightStart)} height={10} fill={C.blue} />
          {/* magma wells up into the gap and cools into new rock */}
          {volcano > 0 && (
            <g>
              <rect x={leftEnd} y={SURFACE + CRUST * (1 - volcano)} width={Math.max(0, rightStart - leftEnd)} height={CRUST * volcano + 2} fill={C.red} />
              {[-18, 18].map((dx) => (
                <path key={dx} d={`M${mid + dx},${SURFACE + CRUST + 70} v-40 l-8,10 m8,-10 l8,10`} stroke={C.red} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              <text x={rightStart + 12} y={SURFACE + CRUST + 30} fontSize={15} fontWeight={700} fill={shade(C.red, -0.45)}>
                Magma
              </text>
            </g>
          )}
          {volcano > 0.6 && (
            <g>
              <path d={`M${leftEnd - 24},${SURFACE} Q${mid},${SURFACE - 34 * volcano} ${rightStart + 24},${SURFACE} Z`} fill={shade(C.ink2, 0.25)} stroke={C.ink} strokeWidth={2} />
              <path d={`M${mid},${SURFACE - 16 * volcano} v-10`} stroke={C.orange} strokeWidth={5} strokeLinecap="round" />
              <text x={mid} y={SURFACE - 34 * volcano - 12} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
                New rock
              </text>
            </g>
          )}
        </>
      )}
      <Shakes x={mid} y={SURFACE - 24 - (together ? 30 * p : 0)} k={quake} />

      {/* arrows showing the motion */}
      <g stroke={C.white} strokeWidth={4} strokeLinecap="round">
        <line x1={BOX.x + 70} y1={arrowY} x2={BOX.x + 130} y2={arrowY} />
        <line x1={right - 130} y1={arrowY} x2={right - 70} y2={arrowY} />
      </g>
      <g fill={C.white}>
        <path d={together ? `M${BOX.x + 142},${arrowY} l-14,-10 v20 z` : `M${BOX.x + 58},${arrowY} l14,-10 v20 z`} />
        <path d={together ? `M${right - 142},${arrowY} l14,-10 v20 z` : `M${right - 58},${arrowY} l-14,-10 v20 z`} />
      </g>
      <text x={BOX.x + 16} y={SURFACE + CRUST + 24} fontSize={15} fontWeight={700} fill={C.ink}>
        ↑ Crust (a plate)
      </text>
    </g>
  );
}

/** Top view of plates sliding past each other: a road across the fault bends, then snaps. */
function TopView({ p }: { p: number }) {
  const mid = BOX.y + BOX.h / 2;
  const top = BOX.y;
  const bottom = BOX.y + BOX.h;
  const x0 = BOX.x + BOX.w / 2;
  const slipped = p >= 0.6;
  // Far from the fault the plates move; at the fault they are stuck, so the road bends. Then it snaps.
  const s = slipped ? 34 : 34 * Math.min(1, p / 0.6);
  const quake = slipped && p < 0.95 ? 1 - (p - 0.6) / 0.35 : 0;
  const upper = slipped ? `M${x0 + s},${top} L${x0 + s},${mid}` : `M${x0 + s},${top} C${x0 + s},${mid - 110} ${x0},${mid - 70} ${x0},${mid}`;
  const lower = slipped ? `M${x0 - s},${mid} L${x0 - s},${bottom}` : `M${x0},${mid} C${x0},${mid + 70} ${x0 - s},${mid + 110} ${x0 - s},${bottom}`;
  return (
    <g>
      <rect x={BOX.x} y={top} width={BOX.w} height={BOX.h / 2} fill={C.green} />
      <rect x={BOX.x} y={mid} width={BOX.w} height={BOX.h / 2} fill={shade(C.green, -0.15)} />
      <line x1={BOX.x} y1={mid} x2={BOX.x + BOX.w} y2={mid} stroke={C.ink} strokeWidth={3} strokeDasharray="10 8" />
      {[upper, lower].map((d) => (
        <g key={d}>
          <path d={d} stroke={C.ink2} strokeWidth={24} fill="none" />
          <path d={d} stroke={C.yellow} strokeWidth={3} fill="none" strokeDasharray="12 10" />
        </g>
      ))}
      {/* arrows */}
      <g fill={C.white} stroke={C.ink} strokeWidth={2}>
        <path d={`M${BOX.x + 60},${mid - 60} h80 l0,-12 l24,22 l-24,22 l0,-12 h-80 z`} />
        <path d={`M${BOX.x + BOX.w - 60},${mid + 60} h-80 l0,-12 l-24,22 l24,22 l0,-12 h80 z`} />
      </g>
      <Shakes x={x0} y={mid + 6} k={quake} />
      <text x={BOX.x + 16} y={bottom - 16} fontSize={15} fontWeight={700} fill={C.white}>
        Seen from above
      </text>
      <text x={BOX.x + BOX.w - 16} y={bottom - 16} textAnchor="end" fontSize={15} fill={C.white}>
        {slipped ? 'Snap! The rock slipped.' : p > 0 ? 'Stuck… the road is bending' : 'The fault is locked'}
      </text>
    </g>
  );
}

/** A little seismograph that wiggles while the ground shakes. */
function Seismograph({ x, y, k, t }: { x: number; y: number; k: number; t: number }) {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const amp = k * 24 * Math.sin(i * 0.9 + t * 30) * (0.5 + 0.5 * Math.sin(i * 0.31));
    return `${x + 16 + i * 5},${y + 50 + amp}`;
  }).join(' ');
  return (
    <g>
      <rect x={x} y={y} width={340} height={100} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={x + 14} y={y + 22} fontSize={13} fill={C.muted} className="caps">
        Seismograph
      </text>
      <polyline points={pts} fill="none" stroke={k > 0 ? C.red : C.line} strokeWidth={2.5} />
    </g>
  );
}

/* ───────────── Shake table ───────────── */

interface Design {
  braces: boolean;
  wide: boolean;
  pads: boolean;
}

const STRENGTHS = ['Gentle', 'Medium', 'Strong'] as const;

/** Each safety feature adds strength; a plain house survives only a gentle shake. */
export function survives(d: Design, strength: number): boolean {
  const score = 1 + (d.braces ? 1 : 0) + (d.wide ? 1 : 0) + (d.pads ? 1 : 0);
  return score > strength;
}

function TestHouse({ d, sway, fallen }: { d: Design; sway: number; fallen: number }) {
  const baseW = d.wide ? 190 : 130;
  const cx = 320;
  const ground = 450;
  const h = 170;
  const tilt = fallen * 70;
  return (
    <g transform={`rotate(${tilt} ${cx + baseW / 2} ${ground})`}>
      <g transform={`skewX(${sway})`} style={{ transformOrigin: `${cx}px ${ground}px` }}>
        <rect x={cx - baseW / 2} y={ground - h} width={baseW} height={h} fill={C.card} stroke={C.ink} strokeWidth={3} />
        <path d={`M${cx - baseW / 2 - 14},${ground - h} L${cx},${ground - h - 70} L${cx + baseW / 2 + 14},${ground - h} Z`} fill={C.red} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        <rect x={cx - 26} y={ground - 70} width={52} height={70} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
        <rect x={cx - baseW / 2 + 16} y={ground - h + 26} width={34} height={34} fill={shade(C.blue, 0.6)} stroke={C.ink} strokeWidth={2} />
        <rect x={cx + baseW / 2 - 50} y={ground - h + 26} width={34} height={34} fill={shade(C.blue, 0.6)} stroke={C.ink} strokeWidth={2} />
        {d.braces && (
          <g stroke={C.brown} strokeWidth={6} strokeLinecap="round">
            <line x1={cx - baseW / 2 + 6} y1={ground - 6} x2={cx + baseW / 2 - 6} y2={ground - h + 6} />
            <line x1={cx + baseW / 2 - 6} y1={ground - 6} x2={cx - baseW / 2 + 6} y2={ground - h + 6} />
          </g>
        )}
      </g>
    </g>
  );
}

function ShakeTable({
  design,
  setDesign,
  strength,
  setStrength,
  guess,
  setGuess,
  result,
  setResult,
}: {
  design: Design;
  setDesign: (d: Design) => void;
  strength: number;
  setStrength: (s: number) => void;
  guess: string | null;
  setGuess: (g: string | null) => void;
  result: boolean | null;
  setResult: (r: boolean | null) => void;
}) {
  const anim = useProgress(2200);
  const willStand = survives(design, strength);
  const shaking = anim.running;
  const amp = (strength + 1) * 5;
  const tableX = shaking ? Math.sin(anim.p * 60) * amp : 0;
  const sway = shaking ? Math.sin(anim.p * 60 + 0.6) * (design.braces ? 2 : 7) * (strength + 1) * (design.pads ? 0.4 : 1) : 0;
  const fallen = result === false ? 1 : !willStand && anim.p > 0.6 ? Math.min(1, (anim.p - 0.6) / 0.25) : 0;

  const shake = () => {
    setResult(null);
    play('whoosh');
    anim.run(() => {
      setResult(willStand);
      play(willStand ? 'correct' : 'pop');
    });
  };
  const change = (next: Design) => {
    anim.reset();
    setResult(null);
    setDesign(next);
    play('tap');
  };

  return (
    <g>
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} fill={shade(C.blue, 0.88)} />
      <g transform={`translate(${tableX} 0)`}>
        {design.pads && (
          <g>
            {[230, 320, 410].map((x) => (
              <rect key={x} x={x - 22} y={452} width={44} height={14} rx={7} fill={C.ink2} />
            ))}
          </g>
        )}
        <TestHouse d={design} sway={sway} fallen={fallen} />
        <rect x={150} y={design.pads ? 466 : 450} width={340} height={22} rx={6} fill={C.wood} stroke={C.ink} strokeWidth={2.5} />
      </g>
      {[190, 450].map((x) => (
        <circle key={x} cx={x + tableX} cy={design.pads ? 497 : 482} r={9} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      ))}
      <rect x={130} y={design.pads ? 506 : 491} width={380} height={6} rx={3} fill={C.ink2} />
      {result !== null && (
        <text x={320} y={BOX.y + 60} textAnchor="middle" fontSize={22} fontWeight={700} fill={result ? shade(C.green, -0.3) : shade(C.red, -0.2)}>
          {result ? 'It stayed up!' : 'It fell down. Improve it!'}
        </text>
      )}

      {/* Design and test controls */}
      <SvgButton x={40} y={528} w={170} h={50} fontSize={16} label={design.braces ? '✓ Cross braces' : 'Cross braces'} active={design.braces} color={design.braces ? C.yellow : C.card} onClick={() => change({ ...design, braces: !design.braces })} />
      <SvgButton x={222} y={528} w={170} h={50} fontSize={16} label={design.wide ? '✓ Wide base' : 'Wide base'} active={design.wide} color={design.wide ? C.yellow : C.card} onClick={() => change({ ...design, wide: !design.wide })} />
      <SvgButton x={404} y={528} w={196} h={50} fontSize={16} label={design.pads ? '✓ Rubber pads' : 'Rubber pads'} active={design.pads} color={design.pads ? C.yellow : C.card} onClick={() => change({ ...design, pads: !design.pads })} />
      {STRENGTHS.map((s, i) => (
        <SvgButton key={s} x={40 + i * 112} y={598} w={104} h={50} fontSize={16} label={s} active={strength === i} color={strength === i ? C.orange : C.card} onClick={() => { anim.reset(); setResult(null); setGuess(null); setStrength(i); play('tap'); }} />
      ))}
      <SvgButton x={404} y={598} w={196} h={50} fontSize={20} label="Shake!" onClick={shake} disabled={shaking} color={C.teal} textColor={C.white} />

      {result !== null ? (
        <ExplainCard
          x={630}
          y={92}
          w={340}
          prediction={guess}
          actual={result ? 'Stays up' : 'Falls down'}
          because={result ? 'Braces stop the walls bending, a wide base resists tipping and rubber pads let the ground move under the house.' : 'The shaking bent the walls until they gave way. Try adding braces, a wider base or rubber pads.'}
          onAgain={() => { anim.reset(); setResult(null); setGuess(null); }}
        />
      ) : (
        <PredictCard x={630} y={92} w={340} question={`A ${STRENGTHS[strength].toLowerCase()} shake. Will this house stay up?`} options={['Stays up', 'Falls down']} prediction={guess} onPredict={(o) => { setGuess(o); play('tap'); }} />
      )}
      <WrapText x={640} y={360} width={320} fontSize={15} fill={C.ink2} text="Engineers test buildings like this. They add braces, wide strong bases and rubber pads so buildings bend without breaking." />
    </g>
  );
}

/* ───────────── Scene ───────────── */

function QuakesScene() {
  const [mode, setMode] = useState<Mode>('plates');
  const [motion, setMotion] = useState<Motion>('together');
  const [guess, setGuess] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);
  const plates = useProgress(2600);
  // Shake table state lives here so it survives switching tabs.
  const [design, setDesign] = useState<Design>({ braces: false, wide: false, pads: false });
  const [strength, setStrength] = useState(1);
  const [shakeGuess, setShakeGuess] = useState<string | null>(null);
  const [shakeResult, setShakeResult] = useState<boolean | null>(null);

  const info = MOTIONS[motion];
  const quakeK =
    motion === 'slide'
      ? plates.p >= 0.6 && plates.p < 0.95 ? 1 - (plates.p - 0.6) / 0.35 : 0
      : plates.running && plates.p > 0.25 ? 0.6 : 0;

  const choose = (m: Motion) => {
    plates.reset();
    setMotion(m);
    setGuess(null);
    setObserved(false);
    play('tap');
  };
  const move = () => {
    play('whoosh');
    setObserved(false);
    plates.run(() => {
      setObserved(true);
      play('pop');
    });
  };

  return (
    <SceneSvg label="Earth's plates and a shake table for testing buildings.">
      <SvgButton x={40} y={24} w={150} h={48} fontSize={17} label="Plates" active={mode === 'plates'} color={mode === 'plates' ? C.yellow : C.card} onClick={() => { setMode('plates'); play('tap'); }} />
      <SvgButton x={200} y={24} w={170} h={48} fontSize={17} label="Shake table" active={mode === 'shake'} color={mode === 'shake' ? C.yellow : C.card} onClick={() => { setMode('shake'); play('tap'); }} />

      {mode === 'plates' ? (
        <g>
          <clipPath id="eq-box">
            <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} />
          </clipPath>
          <g clipPath="url(#eq-box)">{motion === 'slide' ? <TopView p={plates.p} /> : <SideView motion={motion} p={plates.p} />}</g>
          <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} fill="none" stroke={C.ink} strokeWidth={2.5} />

          {(Object.keys(MOTIONS) as Motion[]).map((m, i) => (
            <SvgButton key={m} x={40 + i * 188} y={528} w={180} h={50} fontSize={17} label={MOTIONS[m].label} active={motion === m} color={motion === m ? C.orange : C.card} onClick={() => choose(m)} disabled={plates.running} />
          ))}
          <SvgButton x={40} y={598} w={260} h={50} fontSize={19} label="Move the plates" onClick={move} disabled={plates.running} color={C.teal} textColor={C.white} />
          <SvgButton x={312} y={598} w={150} h={50} fontSize={17} label="Reset" onClick={() => { plates.reset(); play('tap'); }} disabled={plates.running || plates.p === 0} />

          {observed ? (
            <ExplainCard x={630} y={92} w={340} prediction={guess} actual={info.actual} because={info.because} onAgain={() => { plates.reset(); setGuess(null); setObserved(false); }} />
          ) : (
            <PredictCard x={630} y={92} w={340} question={info.question} options={info.options} prediction={guess} onPredict={(o) => { setGuess(o); plates.reset(); play('tap'); }} />
          )}
          <Seismograph x={630} y={400} k={quakeK} t={plates.p} />
          <WrapText x={640} y={540} width={320} fontSize={15} fill={C.ink2} text="Plates move only a few centimetres a year, about as fast as your fingernails grow." />

          <Callout at={[BOX.x + 220, SURFACE + 46]} box={[BOX.x + 14, BOX.y + 14]} w={220} icon={Layers} title="Plates" text="The crust is cracked into big pieces called plates." />
        </g>
      ) : (
        <ShakeTable
          design={design}
          setDesign={setDesign}
          strength={strength}
          setStrength={setStrength}
          guess={shakeGuess}
          setGuess={setShakeGuess}
          result={shakeResult}
          setResult={setShakeResult}
        />
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={6} width={112} height={68} rx={8} fill={shade(C.blue, 0.85)} />
      <path d="M8,52 L44,52 L60,22 L76,52 L112,52 L112,74 L8,74 Z" fill={C.green} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M56,26 L60,22 L64,26" stroke={C.red} strokeWidth={4} fill="none" />
      <circle cx={56} cy={14} r={5} fill={C.muted} opacity={0.6} />
      <circle cx={64} cy={9} r={6} fill={C.muted} opacity={0.5} />
      <path d="M14,40 l4,-6 l4,6 l4,-6 l4,6" stroke={C.red} strokeWidth={2.5} fill="none" />
      <path d="M86,40 l4,-6 l4,6 l4,-6 l4,6" stroke={C.red} strokeWidth={2.5} fill="none" />
    </svg>
  );
}

function q(prompt: string, right: string, wrong: string[], hint: string, explain: string[]): Question {
  return { prompt, choices: choices(shuffle([right, ...wrong])), answer: right, hint, explain };
}

function makeQuestion(level: number): Question {
  const kinds = level === 0 ? ['quake', 'volcano', 'safe'] : level === 1 ? ['together', 'apart', 'plates', 'speed'] : ['slide', 'house', 'where', 'mantle'];
  switch (pick(kinds)) {
    case 'quake':
      return q('What is an earthquake?', 'The ground shaking', ['A big storm', 'A mountain growing'], 'Think about what you feel under your feet.', [
        'Deep rocks suddenly slip.',
        'The slip sends shaking through the ground.',
        'So an earthquake is the ground shaking.',
      ]);
    case 'volcano':
      return q('What comes out of an erupting volcano?', 'Lava (melted rock)', ['Snow', 'Sea water'], 'Volcanoes start deep down where it is very hot.', [
        'Deep inside the Earth, some rock melts into magma.',
        'When it bursts out of a volcano we call it lava (melted rock).',
      ]);
    case 'safe':
      return q('Indoors in an earthquake, where is safest?', 'Under a strong table', ['Next to a window', 'Standing on a chair'], 'Remember: drop, cover and hold on.', [
        'Glass and falling things can hurt you.',
        'Drop down, cover your head and hold on under a strong table.',
      ]);
    case 'together':
      return q('Two plates push into each other. What can form?', 'Mountains', ['A deep gap', 'Nothing at all'], 'Try "Push together" in the playground.', [
        'Pushing plates together crumples and lifts the crust.',
        'Over millions of years this builds mountains.',
      ]);
    case 'apart':
      return q('Two plates pull apart. What rises into the gap?', 'Magma (melted rock)', ['Cold air', 'Ice'], 'Try "Pull apart" in the playground.', [
        'Pulling apart leaves a gap in the crust.',
        'Hot magma (melted rock) rises up into it and hardens into new rock.',
      ]);
    case 'plates':
      return q('The Earth’s crust is broken into huge pieces called…', 'Plates', ['Bricks', 'Bubbles'], 'Like a cracked eggshell, in big pieces.', [
        'The outer shell of the Earth is cracked into giant pieces.',
        'Scientists call these pieces plates.',
      ]);
    case 'speed':
      return q('How fast do plates move?', 'About as fast as fingernails grow', ['As fast as a car', 'They never move'], 'It is too slow to notice in a day.', [
        'Plates move a few centimetres each year.',
        'That is about as fast as fingernails grow.',
      ]);
    case 'slide':
      return q('Why do plates sliding past each other cause sudden earthquakes?', 'They stick, then slip suddenly', ['They melt', 'They float away'], 'Watch the road in "Slide past".', [
        'The rough edges catch, so the rock bends.',
        'When it gives way, they stick, then slip suddenly, and the ground shakes.',
      ]);
    case 'house':
      return q('Which building is most likely to survive a strong earthquake?', 'A braced frame on rubber pads', ['Tall and thin with no braces', 'A heavy top on a narrow base'], 'Think about the shake table tests.', [
        'Braces stop walls bending too far.',
        'Rubber pads let the ground move under the building.',
        'So a braced frame on rubber pads does best.',
      ]);
    case 'where':
      return q('Where do most earthquakes happen?', 'Near the edges of plates', ['In the middle of plates', 'Only at the North Pole'], 'Where do plates rub and push?', [
        'Plates push, pull and slide where they meet.',
        'So most earthquakes happen near the edges of plates.',
      ]);
    default:
      return q('What is under the Earth’s plates?', 'Hot rock that flows very slowly', ['Liquid water', 'Empty space'], 'Look at the bottom of the side view.', [
        'Under the plates is the mantle.',
        'It is hot rock that flows very slowly, carrying the plates along.',
      ]);
  }
}

export const earthquakesVolcanoes: Lesson = {
  id: 'earthquakes-volcanoes',
  title: 'Earthquakes and Volcanoes',
  Thumb,
  Scene: QuakesScene,
  sceneHint: 'Pick how the plates move · Predict · Move the plates · Then try the shake table',
  learn: {
    heading: 'Earthquakes and volcanoes',
    intro:
      'The Earth’s outer shell is cracked into giant plates. They move very slowly on the hot mantle below. Where plates meet, the ground can shake and melted rock can burst out.',
    points: [
      { icon: Layers, text: 'Plates move a few centimetres a year.' },
      { icon: Activity, text: 'Earthquakes: rocks stick, bend, then suddenly slip.' },
      { icon: Mountain, text: 'Volcanoes: melted rock (magma) reaches the surface.' },
      { icon: House, text: 'Engineers design buildings that bend without breaking.' },
    ],
  },
  steps: [
    'Find where two plates meet.',
    'Are they pushing together, pulling apart or sliding past?',
    'Together: mountains and volcanoes. Apart: magma fills the gap. Sliding: sudden earthquakes.',
    'To stay safe indoors: drop, cover and hold on.',
  ],
  example: {
    question: 'Why are there so many volcanoes around the edge of the Pacific Ocean?',
    work: ['Plates meet all around the Pacific.', 'Where one plate sinks under another, rock melts deep down.', 'The magma rises and makes volcanoes.'],
    answer: 'Because plates meet there, and melting rock rises to make volcanoes.',
  },
  grownups: [
    'A common mix-up: the mantle is not a sea of lava. It is mostly solid rock that flows very slowly, like extremely thick putty.',
    'Some volcanoes, like Hawaii’s, sit over a "hot spot" in the middle of a plate.',
    'Practise "drop, cover, hold on" together, and talk about a family meeting place.',
  ],
  makeQuestion,
};
