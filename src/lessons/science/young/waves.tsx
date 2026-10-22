import { useEffect, useRef, useState } from 'react';
import { AudioLines, CloudLightning, Rainbow, Timer } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C } from '../../../lib/color';
import { numberChoices, pick, shuffle } from '../../../lib/random';
import { audioContext, play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

/**
 * A wave machine: amplitude (height) and frequency (waves per second).
 * Sound: bigger amplitude = louder, higher frequency = higher pitch.
 * Light: higher frequency = toward violet, bigger amplitude = brighter.
 * Plus a storm: light (about 300 000 km/s) arrives long before sound (about 343 m/s, roughly 3 s per km).
 */
type Mode = 'sound' | 'light';

const HZ = [131, 196, 262, 392, 523, 784];
const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
const COLOR_NAMES = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];
export const SECONDS_PER_KM = 2.9;

const PANEL = { x: 40, y: 210, w: 620, h: 240 };
const WAVE_X0 = 60;
const WAVE_X1 = 640;
const MID_Y = PANEL.y + PANEL.h / 2;

function wavePath(amp: number, cycles: number, phase: number, x0 = WAVE_X0, x1 = WAVE_X1, mid = MID_Y) {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 4) {
    const t = (x - x0) / (x1 - x0);
    pts.push(`${x},${(mid - amp * Math.sin(2 * Math.PI * cycles * t - phase)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

function playTone(hz: number, amplitude: number) {
  const ctx = audioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(hz, t);
  const peak = 0.02 + amplitude * 0.025;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.03);
  gain.gain.setValueAtTime(peak, t + 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1);
}

interface WaveChallenge extends Challenge {
  kind: 'storm' | 'amp' | 'freq' | 'light';
}

const CHALLENGES: WaveChallenge[] = [
  {
    kind: 'storm',
    question: 'Lightning: what reaches you first?',
    options: ['The flash', 'The thunder', 'Both at once'],
    actual: 'The flash',
    because: 'Light travels nearly a million times faster than sound, so you see the flash first.',
  },
  {
    kind: 'amp',
    question: 'Make the wave taller. It sounds…',
    options: ['Louder', 'Higher', 'The same'],
    actual: 'Louder',
    because: 'A taller wave (bigger amplitude) carries more energy: louder, but the same pitch.',
  },
  {
    kind: 'freq',
    question: 'More waves each second. It sounds…',
    options: ['Louder', 'Higher', 'The same'],
    actual: 'Higher',
    because: 'Higher frequency means more vibrations every second, so the pitch is higher.',
  },
  {
    kind: 'light',
    question: 'Squeeze the light waves. Colour…',
    options: ['Redder', 'Bluer', 'The same'],
    actual: 'Bluer',
    because: 'Higher-frequency light is toward the blue and violet end of the rainbow.',
  },
];

const nextChallenge = (prev: WaveChallenge | null) => pick(CHALLENGES.filter((c) => c.kind !== prev?.kind));

function WavesScene() {
  const [mode, setMode] = useState<Mode>('sound');
  const [amp, setAmp] = useState(3);
  const [freq, setFreq] = useState(3);
  const [phase, setPhase] = useState(0);
  const [km, setKm] = useState(1);
  /** Storm timeline: ms since the flash, or null. */
  const [storm, setStorm] = useState<number | null>(null);
  const poe = usePoe<WaveChallenge>(nextChallenge);
  const observeRef = useRef(poe.observe);
  observeRef.current = poe.observe;
  const kindRef = useRef(poe.challenge.kind);
  kindRef.current = poe.challenge.kind;

  // The wave travels across the screen (still for reduced motion).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      setPhase((p) => (p + ((now - last) / 1000) * 3) % (Math.PI * 2));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Storm clock.
  const stormStart = useRef(0);
  useEffect(() => {
    if (storm === null) return;
    let raf = 0;
    const total = km * SECONDS_PER_KM * 1000;
    const loop = () => {
      const t = performance.now() - stormStart.current;
      setStorm(t);
      if (t >= total) {
        play('whoosh');
        if (kindRef.current === 'storm') observeRef.current();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // Restart only when a new flash begins (or stop when the storm is reset).
  }, [storm === null ? null : stormStart.current]);

  // Set up a fair start once the child predicts.
  useEffect(() => {
    if (poe.guess === null) return;
    const k = poe.challenge.kind;
    if (k === 'amp') {
      setMode('sound');
      setAmp(2);
      setFreq(3);
    } else if (k === 'freq') {
      setMode('sound');
      setFreq(2);
      setAmp(3);
    } else if (k === 'light') {
      setMode('light');
      setFreq(2);
      setAmp(3);
    }
  }, [poe.guess, poe.challenge.kind]);

  const observeIf = (kind: WaveChallenge['kind'], ok: boolean) => {
    if (ok && poe.waiting && poe.challenge.kind === kind) window.setTimeout(poe.observe, 500);
  };

  const flash = () => {
    stormStart.current = performance.now();
    setStorm(0);
    play('pop');
  };

  const color = mode === 'light' ? COLORS[freq - 1] : C.blue;
  const ampPx = amp * 18;
  const total = km * SECONDS_PER_KM * 1000;
  const stormT = storm ?? 0;
  const flashing = storm !== null && stormT < 300;
  const thunderArrived = storm !== null && stormT >= total;
  const ring = storm !== null ? Math.min(1, stormT / total) : 0;
  const waitFor = poe.waiting ? poe.challenge.kind : null;
  const loudness = amp >= 4 ? 'loud' : amp <= 2 ? 'quiet' : 'medium';
  const pitch = freq >= 5 ? 'high' : freq <= 2 ? 'low' : 'middle';

  return (
    <SceneSvg label="A wave machine for sound and light, and a thunderstorm">
      {/* Mode */}
      <SvgButton x={480} y={140} w={86} h={48} fontSize={17} label="Sound" active={mode === 'sound'} color={mode === 'sound' ? C.yellow : C.card} onClick={() => setMode('sound')} />
      <SvgButton x={574} y={140} w={86} h={48} fontSize={17} label="Light" active={mode === 'light'} color={mode === 'light' ? C.yellow : C.card} onClick={() => setMode('light')} />

      {/* Wave panel */}
      <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={16} fill={mode === 'light' ? '#1f2433' : C.card} stroke={C.ink} strokeWidth={2.5} />
      <line x1={WAVE_X0} y1={MID_Y} x2={WAVE_X1} y2={MID_Y} stroke={mode === 'light' ? '#3b4258' : C.line} strokeWidth={2} strokeDasharray="6 6" />
      {mode === 'light' && <path d={wavePath(ampPx, freq, phase)} fill="none" stroke={color} strokeWidth={14} opacity={0.12 + amp * 0.06} strokeLinecap="round" />}
      <path d={wavePath(ampPx, freq, phase)} fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Amplitude marker */}
      <line x1={WAVE_X0 - 4} y1={MID_Y} x2={WAVE_X0 - 4} y2={MID_Y - ampPx} stroke={C.red} strokeWidth={3} />
      <text x={WAVE_X0 + 6} y={PANEL.y + 26} fontSize={14} fill={mode === 'light' ? '#c8cde0' : C.muted} className="caps">
        {mode === 'sound' ? 'Sound wave' : 'Light wave'} · {freq} wave{freq === 1 ? '' : 's'} across
      </text>

      {/* Controls */}
      <text x={40} y={496} fontSize={18} fontWeight={700} fill={C.ink}>
        Amplitude
      </text>
      <SvgButton x={170} y={470} w={50} h={44} label="−" title="Smaller amplitude" disabled={amp <= 1} onClick={() => setAmp(amp - 1)} />
      <SvgButton
        x={228}
        y={470}
        w={50}
        h={44}
        label="+"
        title="Bigger amplitude"
        color={C.yellow}
        disabled={amp >= 5}
        onClick={() => {
          setAmp(amp + 1);
          observeIf('amp', mode === 'sound');
        }}
      />
      <text x={330} y={496} fontSize={18} fontWeight={700} fill={C.ink}>
        Frequency
      </text>
      <SvgButton x={460} y={470} w={50} h={44} label="−" title="Lower frequency" disabled={freq <= 1} onClick={() => setFreq(freq - 1)} />
      <SvgButton
        x={518}
        y={470}
        w={50}
        h={44}
        label="+"
        title="Higher frequency"
        color={C.yellow}
        disabled={freq >= 6}
        onClick={() => {
          setFreq(freq + 1);
          observeIf('freq', mode === 'sound');
          observeIf('light', mode === 'light');
        }}
      />
      {waitFor && waitFor !== 'storm' && (
        <rect x={waitFor === 'amp' ? 220 : 510} y={462} width={66} height={62} rx={14} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" pointerEvents="none" />
      )}

      {mode === 'sound' ? (
        <g>
          <SvgButton x={40} y={534} w={190} h={48} fontSize={17} label="▶ Play sound" color={C.teal} textColor={C.white} onClick={() => playTone(HZ[freq - 1], amp)} />
          <text x={250} y={556} fontSize={20} fontWeight={700} fill={C.ink}>
            {HZ[freq - 1]} Hz
          </text>
          <text x={250} y={580} fontSize={16} fill={C.ink2}>
            {loudness} · {pitch} pitch
          </text>
          <text x={40} y={628} fontSize={15} fill={C.ink2}>
            Taller wave = louder. More waves each second = higher pitch.
          </text>
        </g>
      ) : (
        <g>
          {COLORS.map((c, i) => (
            <rect key={c} x={40 + i * 100} y={536} width={100} height={30} fill={c} stroke={C.ink} strokeWidth={1.5} />
          ))}
          <rect x={40} y={536} width={600} height={30} fill="none" stroke={C.ink} strokeWidth={2.5} rx={4} />
          <path d={`M${90 + (freq - 1) * 100},572 l-10,14 h20 z`} fill={C.ink} />
          <text x={40} y={608} fontSize={18} fontWeight={700} fill={C.ink}>
            Colour: {COLOR_NAMES[freq - 1]}
          </text>
          <text x={40} y={632} fontSize={15} fill={C.ink2}>
            Low frequency: red. High frequency: violet. Taller wave = brighter.
          </text>
        </g>
      )}

      {/* Storm */}
      <rect x={690} y={30} width={270} height={420} rx={16} fill={flashing ? '#8fa3cc' : '#3a4a6b'} stroke={C.ink} strokeWidth={2.5} />
      <rect x={690} y={400} width={270} height={50} rx={0} fill="#5d8f4e" />
      <rect x={690} y={30} width={270} height={420} rx={16} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <g transform="translate(760 92)">
        <ellipse cx={0} cy={0} rx={52} ry={26} fill="#cfd6e4" stroke={C.ink} strokeWidth={2} />
        <ellipse cx={-30} cy={8} rx={30} ry={20} fill="#cfd6e4" stroke={C.ink} strokeWidth={2} />
        <ellipse cx={34} cy={8} rx={30} ry={20} fill="#cfd6e4" stroke={C.ink} strokeWidth={2} />
      </g>
      {flashing && <path d="M762,118 L742,220 L770,220 L748,330 L800,200 L772,200 L790,118 Z" fill={C.yellow} stroke={C.ink} strokeWidth={2} />}
      {storm !== null && !thunderArrived && (
        <circle cx={760} cy={250} r={20 + ring * 170} fill="none" stroke="#cfd6e4" strokeWidth={4} strokeDasharray="10 8" opacity={0.9 - ring * 0.5} />
      )}
      {/* House */}
      <g transform="translate(890 400)">
        <rect x={-30} y={-46} width={60} height={46} fill="#f6e7c8" stroke={C.ink} strokeWidth={2} />
        <path d="M-38,-46 L0,-78 L38,-46 Z" fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        <rect x={-8} y={-26} width={16} height={26} fill={C.brown} stroke={C.ink} strokeWidth={1.5} />
      </g>
      {thunderArrived && (
        <text x={890} y={300} textAnchor="middle" fontSize={26} fontWeight={800} fill={C.yellow} stroke={C.ink} strokeWidth={1}>
          BOOM!
        </text>
      )}
      <text x={825} y={440} textAnchor="middle" fontSize={14} fill="#ffffff" fontWeight={600}>
        storm {km} km away
      </text>

      <text x={690} y={482} fontSize={15} fill={C.muted} className="caps">
        Storm distance
      </text>
      {[1, 2, 3].map((d, i) => (
        <SvgButton key={d} x={690 + i * 92} y={494} w={86} h={44} fontSize={16} label={`${d} km`} active={km === d} color={km === d ? C.yellow : C.card} onClick={() => { setKm(d); setStorm(null); }} />
      ))}
      <SvgButton x={690} y={552} w={270} h={50} fontSize={19} label="⚡ Flash!" color={C.purple} textColor={C.white} onClick={flash} />
      {waitFor === 'storm' && <rect x={682} y={544} width={286} height={68} rx={14} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="8 6" pointerEvents="none" />}
      <text x={825} y={638} textAnchor="middle" fontSize={16} fontWeight={600} fill={C.ink}>
        {storm === null
          ? `Thunder takes about ${(km * SECONDS_PER_KM).toFixed(1)} s`
          : thunderArrived
            ? `Thunder heard after ${(total / 1000).toFixed(1)} s`
            : `Counting… ${(stormT / 1000).toFixed(1)} s`}
      </text>

      {/* Predict → observe → explain */}
      <PoePanel x={40} y={16} w={420} poe={poe} />

      <Callout at={[WAVE_X0 - 4, MID_Y - ampPx]} box={[60, 380]} w={220} icon={AudioLines} title="Amplitude" text="How tall the wave is. For sound it is loudness; for light it is brightness." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d={wavePath(16, 2, 0, 8, 112, 40)} fill="none" stroke={C.blue} strokeWidth={4} strokeLinecap="round" />
      {COLORS.map((c, i) => (
        <rect key={c} x={10 + i * 16.6} y={64} width={16.6} height={8} fill={c} />
      ))}
    </svg>
  );
}

// ---------- practice ----------

function WavePic({ amp, cycles, label }: { amp: number; cycles: number; label?: string }) {
  return (
    <svg viewBox="0 0 160 64" role="img" aria-label={label ?? 'a wave'}>
      <line x1={8} y1={32} x2={152} y2={32} stroke={C.line} strokeWidth={2} strokeDasharray="4 4" />
      <path d={wavePath(amp, cycles, 0, 8, 152, 32)} fill="none" stroke={C.blue} strokeWidth={3.5} strokeLinecap="round" />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['faster', 'louder']) : level === 1 ? pick(['pitch', 'spectrum', 'ampMeans']) : pick(['storm', 'hertz', 'ampMeans']);

  if (kind === 'faster') {
    return {
      prompt: 'Which travels faster: light or sound?',
      choices: [{ value: 'Light' }, { value: 'Sound' }],
      answer: 'Light',
      hint: 'In a thunderstorm, which do you notice first?',
      explain: ['In a storm you see lightning before you hear thunder.', 'Light is nearly a million times faster than sound.', 'So light travels faster.'],
    };
  }
  if (kind === 'louder') {
    return {
      prompt: 'Which wave makes the louder sound?',
      choices: shuffle([
        { value: 'tall', name: 'the taller wave', label: <WavePic amp={24} cycles={3} label="a tall wave" /> },
        { value: 'short', name: 'the shorter wave', label: <WavePic amp={8} cycles={3} label="a short wave" /> },
      ]),
      answer: 'tall',
      hint: 'Loudness depends on how big the vibrations are.',
      explain: ['The height of a wave is its amplitude.', 'Bigger amplitude means bigger vibrations: a louder sound.', 'So the taller wave is louder.'],
    };
  }
  if (kind === 'pitch') {
    return {
      prompt: 'Which wave has the higher pitch?',
      choices: shuffle([
        { value: 'more', name: 'the wave with more waves', label: <WavePic amp={18} cycles={6} label="many waves close together" /> },
        { value: 'fewer', name: 'the wave with fewer waves', label: <WavePic amp={18} cycles={2} label="a few waves spread out" /> },
      ]),
      answer: 'more',
      hint: 'Pitch depends on how many vibrations happen each second.',
      explain: ['More waves in the same time means a higher frequency.', 'Higher frequency sounds higher.', 'So the wave with more waves has the higher pitch.'],
    };
  }
  if (kind === 'spectrum') {
    return {
      prompt: 'Which colour of light has the highest frequency?',
      choices: shuffle(['red', 'green', 'violet']).map((value) => ({ value })),
      answer: 'violet',
      hint: 'Think of the rainbow from one end to the other.',
      explain: ['The rainbow goes from red (lowest frequency) to violet (highest).', 'Green is in the middle.', 'So violet has the highest frequency.'],
    };
  }
  if (kind === 'ampMeans') {
    const right = 'how loud it is';
    return {
      prompt: 'What does the amplitude of a sound wave change?',
      choices: shuffle([right, 'how high or low it sounds', 'how fast it travels']).map((value) => ({ value })),
      answer: right,
      hint: 'Amplitude is how tall the wave is.',
      explain: ['Amplitude is the height of the wave.', 'Taller waves are bigger vibrations with more energy.', 'So amplitude changes how loud it is.'],
    };
  }
  if (kind === 'hertz') {
    const f = pick([50, 100, 200, 440]);
    return {
      prompt: `A guitar string vibrates ${f} times every second. What is its frequency in hertz (Hz)?`,
      answer: String(f),
      hint: 'Hertz counts waves (vibrations) per second.',
      explain: ['Frequency is how many vibrations happen each second.', '1 Hz means 1 vibration per second.', `So the frequency is ${f} Hz.`],
    };
  }
  const km = pick([1, 2, 3, 4, 5]);
  const s = km * 3;
  return {
    prompt: `You see lightning, then hear thunder ${s} seconds later. About how many kilometres away is the storm?`,
    choices: numberChoices(km, { min: 1, max: 8 }).map((value) => ({ value })),
    answer: String(km),
    hint: 'Sound travels about 1 km every 3 seconds.',
    explain: ['The flash arrives almost instantly; the sound takes about 3 s per km.', `${s} ÷ 3 = ${km}.`, `So the storm is about ${km} km away.`],
  };
}

export const waves: Lesson = {
  id: 'waves',
  title: 'Waves: Sound and Light',
  Thumb,
  Scene: WavesScene,
  sceneHint: 'Predict, then change the wave · Try the storm',
  learn: {
    heading: 'Waves: sound and light',
    intro: 'Sound and light both travel as waves. A wave’s height is its amplitude, and how many waves pass each second is its frequency.',
    points: [
      { icon: AudioLines, text: 'Sound: bigger amplitude is louder; higher frequency is higher pitch.' },
      { icon: Rainbow, text: 'Light: low frequency is red, high frequency is violet.' },
      { icon: CloudLightning, text: 'Light is nearly a million times faster than sound.' },
      { icon: Timer, text: 'Count from flash to thunder and divide by 3 to get km.' },
    ],
  },
  steps: [
    'Find the amplitude: how tall is the wave?',
    'Find the frequency: how many waves pass each second?',
    'For sound: taller = louder, more waves = higher pitch.',
    'For light: more waves each second moves the colour toward violet.',
  ],
  example: {
    question: 'You see a flash of lightning and count 9 seconds before the thunder. How far away is the storm?',
    work: ['Light reaches you almost straight away.', 'Sound travels about 1 km every 3 seconds.', '9 ÷ 3 = 3.'],
    answer: 'About 3 km away.',
  },
  grownups: [
    'Humans hear roughly 20 to 20 000 vibrations per second (Hz); dogs and bats hear much higher.',
    'Try a ruler twanged on a table: a shorter overhang vibrates faster and sounds higher.',
    'Sound needs something to travel through (air, water, solids) and cannot cross empty space; light can.',
    'The flash-to-thunder rule (3 seconds per km, or 5 seconds per mile) works because light arrives almost instantly. If thunder follows within 30 seconds, go indoors.',
  ],
  makeQuestion,
};
