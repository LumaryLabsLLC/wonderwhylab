import { useEffect, useRef, useState } from 'react';
import { Hammer, Rainbow, Triangle, Weight } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { NumberCard, SceneSvg, SvgButton } from '../../../stage/widgets';
import { reducedMotion } from './visuals/anim';
import { byLevel, mcq } from './q';

type Shape = 'flat' | 'arch' | 'truss';

/**
 * A simplified model of how many weights each design holds. The order is what matters and is true
 * to life: a flat plank is weakest, an arch is stronger, triangles (a truss) stronger still, and a
 * pillar under the middle (where a beam bends most) makes any of them stronger.
 */
const SHAPES: Record<Shape, { name: string; base: number; sag: number; why: string }> = {
  flat: { name: 'Flat', base: 2, sag: 34, why: 'A flat plank bends in the middle, so it can’t hold much.' },
  arch: { name: 'Arch', base: 5, sag: 14, why: 'An arch pushes the weight out to the banks, so it is strong.' },
  truss: { name: 'Triangles', base: 7, sag: 9, why: 'Triangles don’t squash out of shape, so they spread the weight.' },
};
const ORDER: Shape[] = ['flat', 'arch', 'truss'];
const PILLAR_BONUS = 3;
const MAX_LOAD = 10;
export const capacity = (s: Shape, pillar: boolean) => SHAPES[s].base + (pillar ? PILLAR_BONUS : 0);

const BANDS = ['1 to 3', '4 to 6', '7 or more'];
const bandOf = (n: number) => (n <= 3 ? BANDS[0] : n <= 6 ? BANDS[1] : BANDS[2]);
const designName = (s: Shape, pillar: boolean) => `${SHAPES[s].name}${pillar ? ' + pillar' : ''}`;

// River geometry (world units)
const L = 150;
const R = 510;
const MID = (L + R) / 2;
const SPAN = R - L;
const DECK = 380;
const WATER = 470;
const BED = 570;

/** Weight slots on the deck: middle first, then outwards, then a second layer. */
const SLOTS = [310, 350, 270, 390, 230, 430, 190, 470].map((x) => ({ x, layer: 0 })).concat([310, 350].map((x) => ({ x, layer: 1 })));

function sagAt(x: number, sag: number, pillar: boolean) {
  const u = Math.max(0, Math.min(1, (x - L) / SPAN));
  return sag * Math.sin(Math.PI * (pillar ? (u * 2) % 1 : u));
}

/** The bridge itself (beam, arch or truss) with its weights, bent by `sag`. */
function Bridge({ shape, pillar, sag, load }: { shape: Shape; pillar: boolean; sag: number; load: number }) {
  const s = (x: number) => sagAt(x, sag, pillar);
  const xs = Array.from({ length: 19 }, (_, i) => L + (i * SPAN) / 18);
  const top = xs.map((x) => `${x},${DECK + s(x)}`).join(' ');
  const bottom = [...xs].reverse().map((x) => `${x},${DECK + 16 + s(x)}`).join(' ');
  const archY = (x: number) => 452 - 50 * Math.sin((Math.PI * (x - L)) / SPAN) + s(x);
  return (
    <g>
      {shape === 'truss' && (
        <g stroke={shade(C.orange, -0.1)} strokeWidth={7} strokeLinecap="round" fill="none">
          {Array.from({ length: 6 }, (_, k) => {
            const b0 = L + k * 60;
            const t = L + 30 + k * 60;
            const b1 = L + (k + 1) * 60;
            return <polyline key={k} points={`${b0},${DECK + s(b0)} ${t},${DECK - 80 + s(t)} ${b1},${DECK + s(b1)}`} />;
          })}
          <polyline points={Array.from({ length: 6 }, (_, k) => L + 30 + k * 60).map((x) => `${x},${DECK - 80 + s(x)}`).join(' ')} />
        </g>
      )}
      {shape === 'arch' && (
        <g>
          {Array.from({ length: 5 }, (_, k) => {
            const x = L + 60 + k * 60;
            return <line key={k} x1={x} y1={DECK + 16 + s(x)} x2={x} y2={archY(x)} stroke={C.ink} strokeWidth={5} />;
          })}
          <polyline points={xs.map((x) => `${x},${archY(x)}`).join(' ')} fill="none" stroke={shade(C.brown, 0.2)} strokeWidth={18} strokeLinejoin="round" />
          <polyline points={xs.map((x) => `${x},${archY(x)}`).join(' ')} fill="none" stroke={C.ink} strokeWidth={2} transform="translate(0 9)" />
        </g>
      )}
      <polygon points={`${top} ${bottom}`} fill={C.wood} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      {SLOTS.slice(0, load).map((slot, i) => {
        const y = DECK + s(slot.x) - 30 * (slot.layer + 1);
        return (
          <g key={i} transform={`translate(${slot.x} ${y})`}>
            <path d="M-8,0 Q-8,-10 0,-10 Q8,-10 8,0" fill="none" stroke={C.ink} strokeWidth={3} />
            <rect x={-18} y={0} width={36} height={29} rx={6} fill="#7b8494" stroke={C.ink} strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
}

function River() {
  return (
    <g>
      <rect x={L} y={WATER} width={SPAN} height={BED - WATER} fill="#7cc4f0" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${L + 30 + i * 110},${WATER + 30 + (i % 2) * 24} q15,-8 30,0 t30,0`} fill="none" stroke={C.white} strokeWidth={3} strokeLinecap="round" />
      ))}
      <rect x={L} y={BED} width={SPAN} height={14} fill={shade(C.brown, 0.1)} />
      {[
        [40, L],
        [R, 620],
      ].map(([x0, x1]) => (
        <g key={x0}>
          <rect x={x0} y={DECK + 16} width={x1 - x0} height={BED + 14 - DECK - 16} fill={shade(C.brown, 0.25)} stroke={C.ink} strokeWidth={2.5} />
          <rect x={x0} y={DECK + 10} width={x1 - x0} height={12} fill={C.green} stroke={C.ink} strokeWidth={2.5} />
        </g>
      ))}
    </g>
  );
}

interface Try {
  shape: Shape;
  pillar: boolean;
  held: number;
}

function BridgeScene() {
  const [shape, setShape] = useState<Shape>('flat');
  const [pillar, setPillar] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  const [load, setLoad] = useState(0);
  const [testing, setTesting] = useState(false);
  const [broken, setBroken] = useState(0); // 0 → 1 as the bridge snaps
  const [result, setResult] = useState<{ held: number; broke: boolean } | null>(null);
  const [tries, setTries] = useState<Try[]>([]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  const cap = capacity(shape, pillar);

  const finish = (held: number, broke: boolean) => {
    setTesting(false);
    setResult({ held, broke });
    setTries((t) => [{ shape, pillar, held }, ...t].slice(0, 4));
  };

  const snap = (held: number) => {
    play('wrong');
    if (reducedMotion()) {
      setBroken(1);
      return finish(held, true);
    }
    let b = 0;
    timer.current = window.setInterval(() => {
      b = Math.min(1, b + 0.07);
      setBroken(b);
      if (b >= 1) {
        window.clearInterval(timer.current);
        finish(held, true);
      }
    }, 30);
  };

  const test = () => {
    if (testing || !guess) return;
    window.clearInterval(timer.current);
    setTesting(true);
    setLoad(0);
    setBroken(0);
    let n = 0;
    timer.current = window.setInterval(() => {
      n += 1;
      setLoad(n);
      if (n > cap) {
        window.clearInterval(timer.current);
        snap(cap);
      } else if (n >= MAX_LOAD) {
        window.clearInterval(timer.current);
        play('correct');
        finish(n, false);
      } else play('tap');
    }, 450);
  };

  const fresh = () => {
    window.clearInterval(timer.current);
    setTesting(false);
    setLoad(0);
    setBroken(0);
    setResult(null);
    setGuess(null);
  };

  const change = (fn: () => void) => {
    if (testing) return;
    fn();
    fresh();
  };

  const sag = Math.min(1, load / Math.max(1, cap)) * SHAPES[shape].sag;
  const ang = 38 * (1 - (1 - broken) ** 2);
  const because = result
    ? `${result.broke ? `It held ${result.held}, then the next one broke it.` : `It held all ${result.held}!`} ${SHAPES[shape].why}${pillar ? ' The pillar holds up the middle too.' : ''}`
    : '';

  return (
    <SceneSvg label={`A ${designName(shape, pillar).toLowerCase()} bridge over a river`}>
      <defs>
        <clipPath id="bb-left">
          <rect x={0} y={0} width={MID} height={680} />
        </clipPath>
        <clipPath id="bb-right">
          <rect x={MID} y={0} width={1000 - MID} height={680} />
        </clipPath>
      </defs>
      <River />
      {pillar && <rect x={MID - 16} y={DECK + 14} width={32} height={BED - DECK - 14} fill="#b9b2a6" stroke={C.ink} strokeWidth={2.5} />}
      {broken > 0 ? (
        <g>
          <g transform={`rotate(${ang} ${L} ${DECK})`}>
            <g clipPath="url(#bb-left)">
              <Bridge shape={shape} pillar={pillar} sag={sag} load={load} />
            </g>
          </g>
          <g transform={`rotate(${-ang} ${R} ${DECK})`}>
            <g clipPath="url(#bb-right)">
              <Bridge shape={shape} pillar={pillar} sag={sag} load={load} />
            </g>
          </g>
        </g>
      ) : (
        <Bridge shape={shape} pillar={pillar} sag={sag} load={load} />
      )}
      <text x={330} y={630} textAnchor="middle" fontSize={17} fill={C.ink2}>
        {testing
          ? `Adding weights… ${load}`
          : result
            ? result.broke
              ? 'Snap! Find the weak part and improve your design.'
              : 'Super strong! Can another design hold this many?'
            : guess
              ? 'Now test it!'
              : 'Pick a beam and a support, then make a guess.'}
      </text>

      {/* Predict → observe → explain */}
      {result ? (
        <ExplainCard x={40} y={24} w={420} prediction={guess} actual={bandOf(result.held)} because={because} onAgain={fresh} />
      ) : (
        <PredictCard x={40} y={24} w={420} question="How many weights will it hold?" options={BANDS} prediction={guess} onPredict={setGuess} />
      )}

      {/* Design controls */}
      <text x={656} y={48} fontSize={16} fill={C.muted} className="caps">
        Beam
      </text>
      {ORDER.map((s, i) => (
        <SvgButton key={s} x={656 + i * 104} y={60} w={i === 2 ? 100 : 96} h={52} fontSize={17} label={SHAPES[s].name} active={shape === s} color={shape === s ? C.yellow : C.card} disabled={testing} onClick={() => change(() => setShape(s))} />
      ))}
      <text x={656} y={148} fontSize={16} fill={C.muted} className="caps">
        Support
      </text>
      {[false, true].map((p, i) => (
        <SvgButton key={String(p)} x={656 + i * 154} y={160} w={150} h={52} fontSize={17} label={p ? 'Middle pillar' : 'No pillar'} active={pillar === p} color={pillar === p ? C.yellow : C.card} disabled={testing} onClick={() => change(() => setPillar(p))} />
      ))}
      <SvgButton x={656} y={244} w={304} h={58} fontSize={20} label={testing ? 'Testing…' : 'Test it ▶'} color={C.teal} textColor={C.white} disabled={!guess || testing || !!result} onClick={test} />
      <NumberCard x={656} y={330} w={140} h={110} value={result ? result.held : load} caption="weights held" />
      <text x={816} y={348} fontSize={15} fill={C.muted} className="caps">
        Tries
      </text>
      {tries.map((t, i) => (
        <text key={i} x={816} y={374 + i * 24} fontSize={15} fill={C.ink2}>
          {designName(t.shape, t.pillar)}: {t.held}
        </text>
      ))}

      <Callout at={[MID, DECK + 8]} box={[656, 470]} w={240} icon={Weight} title="The middle bends most" text="It is the part farthest from the banks. A pillar or a strong shape helps here." />
    </SceneSvg>
  );
}

/** A small bridge picture for questions. */
function BridgePicture({ shape, pillar = false }: { shape: Shape; pillar?: boolean }) {
  return (
    <svg viewBox="0 0 160 90" role="img" aria-label={`${designName(shape, pillar)} bridge`}>
      <rect x={30} y={60} width={100} height={26} fill="#7cc4f0" />
      <rect x={4} y={46} width={26} height={40} fill={shade(C.brown, 0.25)} stroke={C.ink} strokeWidth={2} />
      <rect x={130} y={46} width={26} height={40} fill={shade(C.brown, 0.25)} stroke={C.ink} strokeWidth={2} />
      {pillar && <rect x={74} y={46} width={12} height={40} fill="#b9b2a6" stroke={C.ink} strokeWidth={1.5} />}
      {shape === 'truss' && <polyline points="30,40 45,20 60,40 75,20 90,40 105,20 120,40" fill="none" stroke={C.orange} strokeWidth={4} strokeLinejoin="round" />}
      {shape === 'truss' && <line x1={45} y1={20} x2={105} y2={20} stroke={C.orange} strokeWidth={4} />}
      {shape === 'arch' && <path d="M30,62 Q80,32 130,62" fill="none" stroke={shade(C.brown, 0.2)} strokeWidth={8} />}
      <rect x={28} y={38} width={104} height={8} rx={2} fill={C.wood} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

function FramePicture({ kind }: { kind: 'tri' | 'square' }) {
  return (
    <svg viewBox="0 0 120 100" role="img" aria-label={kind === 'tri' ? 'triangle frame' : 'square frame'}>
      {kind === 'tri' ? (
        <polygon points="20,85 100,85 60,20" fill="none" stroke={C.orange} strokeWidth={7} strokeLinejoin="round" />
      ) : (
        <rect x={25} y={25} width={70} height={60} fill="none" stroke={C.orange} strokeWidth={7} strokeLinejoin="round" />
      )}
      {[kind === 'tri' ? [60, 20] : [25, 25]].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={6} fill={C.ink} />
          <path d={`M${x - 26},${y - 12} l18,8`} stroke={C.red} strokeWidth={4} strokeLinecap="round" />
          <path d={`M${x - 8},${y - 4} l-9,0 M${x - 8},${y - 4} l-4,-8`} stroke={C.red} strokeWidth={4} strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={24} y={52} width={72} height={22} fill="#7cc4f0" />
      <rect x={4} y={40} width={20} height={34} fill={shade(C.brown, 0.25)} stroke={C.ink} strokeWidth={2} />
      <rect x={96} y={40} width={20} height={34} fill={shade(C.brown, 0.25)} stroke={C.ink} strokeWidth={2} />
      <polyline points="24,36 36,18 48,36 60,18 72,36 84,18 96,36" fill="none" stroke={C.orange} strokeWidth={3.5} strokeLinejoin="round" />
      <line x1={36} y1={18} x2={84} y2={18} stroke={C.orange} strokeWidth={3.5} />
      <rect x={22} y={34} width={76} height={7} rx={2} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      <rect x={52} y={24} width={16} height={10} rx={2} fill="#7b8494" stroke={C.ink} strokeWidth={1.2} />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────
const BRIDGE_NAME: Record<Shape, string> = { flat: 'the flat bridge', arch: 'the arch bridge', truss: 'the triangle bridge' };

function strongerShape(): Question {
  const best = pick(['arch', 'truss'] as Shape[]);
  return mcq({
    prompt: 'Which bridge can hold more weights?',
    answer: best,
    wrong: ['flat'],
    labels: { flat: <BridgePicture shape="flat" />, [best]: <BridgePicture shape={best} /> },
    names: { flat: BRIDGE_NAME.flat, [best]: BRIDGE_NAME[best] },
    hint: 'Which one has a strong shape holding up the plank?',
    explain: [SHAPES.flat.why, SHAPES[best].why, `So ${BRIDGE_NAME[best]} holds more.`],
  });
}

function strongShapeWord(): Question {
  return mcq({
    prompt: 'Which shape do engineers use to make bridges strong?',
    answer: 'Triangles',
    wrong: ['Squares', 'Circles'],
    hint: 'Which shape can’t be squashed out of shape when you push it?',
    explain: ['Push on a square frame and it leans over into a diamond.', 'A triangle keeps its shape when you push it.', 'So engineers use triangles.'],
  });
}

function addPillar(): Question {
  const s = pick(['flat', 'arch'] as Shape[]);
  return mcq({
    prompt: `This ${SHAPES[s].name.toLowerCase()} bridge held ${SHAPES[s].base} weights. You add a pillar under the middle. Now it will hold…`,
    visual: <BridgePicture shape={s} pillar />,
    answer: 'More',
    wrong: ['Less', 'The same'],
    hint: 'Where does a bridge bend most? What does a pillar do there?',
    explain: ['The middle of a bridge bends the most.', 'A pillar holds up the middle.', 'So it will hold more.'],
  });
}

function whyArch(): Question {
  return mcq({
    prompt: 'Why is an arch bridge strong?',
    visual: <BridgePicture shape="arch" />,
    answer: 'It pushes the weight out to the banks',
    wrong: ['It floats on the water', 'It bends easily in the middle'],
    hint: 'Follow the curve of the arch. Where does it end?',
    explain: ['The curve of the arch carries the weight sideways.', 'It pushes the weight out to the banks, and the banks push back.', 'That is why an arch is strong.'],
  });
}

function readTries(): Question {
  const designs = ORDER.flatMap((s) => [false, true].map((p) => ({ s, p, held: capacity(s, p) })));
  let three = shuffle(designs).slice(0, 3);
  while (new Set(three.map((d) => d.held)).size < 3) three = shuffle(designs).slice(0, 3);
  const best = three.reduce((a, b) => (b.held > a.held ? b : a));
  const rows = three.map((d) => `${designName(d.s, d.p)}: ${d.held}`);
  return mcq({
    prompt: 'Your test results are below. Which design held the most weights?',
    visual: (
      <svg viewBox="0 0 260 110" role="img" aria-label={rows.join(', ')}>
        <rect x={2} y={2} width={256} height={106} rx={12} fill={C.card} stroke={C.ink} strokeWidth={2} />
        {three.map((d, i) => (
          <g key={i}>
            <text x={18} y={34 + i * 30} fontSize={17} fill={C.ink}>
              {designName(d.s, d.p)}
            </text>
            <text x={240} y={34 + i * 30} textAnchor="end" fontSize={17} fontWeight={700} fill={C.ink}>
              {d.held} weights
            </text>
          </g>
        ))}
      </svg>
    ),
    answer: designName(best.s, best.p),
    wrong: three.filter((d) => d !== best).map((d) => designName(d.s, d.p)),
    hint: 'Find the biggest number in the results.',
    explain: [`The results: ${rows.join(', ')}.`, `The biggest number is ${best.held}.`, `So ${designName(best.s, best.p)} held the most.`],
  });
}

function nextStep(): Question {
  return mcq({
    prompt: 'Your bridge broke when you tested it. What should an engineer do next?',
    answer: 'Improve it and test again',
    wrong: ['Give up', 'Test it again without changing it'],
    hint: 'What do engineers learn from a test that goes wrong?',
    explain: ['A broken test shows you the weak part.', 'Engineers change the design to fix it.', 'So: improve it and test again.'],
  });
}

function fairTest(): Question {
  return mcq({
    prompt: 'You want to find out if a pillar makes your bridge stronger. What should you change?',
    answer: 'Only the pillar',
    wrong: ['The pillar and the beam shape', 'Nothing at all'],
    hint: 'If you change two things, can you tell which one helped?',
    explain: ['A fair test changes just one thing.', 'Keep the same beam, and test with and without a pillar.', 'So change only the pillar.'],
  });
}

function pillarSum(): Question {
  const s = pick(ORDER);
  const base = SHAPES[s].base;
  const answer = base + PILLAR_BONUS;
  return mcq({
    prompt: `A ${SHAPES[s].name.toLowerCase()} bridge holds ${base} weights. A middle pillar lets it hold ${PILLAR_BONUS} more. How many can it hold now?`,
    visual: <BridgePicture shape={s} pillar />,
    answer: String(answer),
    wrong: [String(base), String(answer + 2)],
    hint: 'Start with how many it held, then add the extra.',
    explain: [`It held ${base} weights.`, `The pillar adds ${PILLAR_BONUS} more: ${base} + ${PILLAR_BONUS} = ${answer}.`],
  });
}

function trianglePicture(): Question {
  return mcq({
    prompt: 'Push hard on the top corner of each frame. Which one keeps its shape?',
    answer: 'tri',
    wrong: ['square'],
    labels: { tri: <FramePicture kind="tri" />, square: <FramePicture kind="square" /> },
    names: { tri: 'the triangle', square: 'the square' },
    hint: 'Imagine the corners are bendy joints. Which frame could lean over?',
    explain: ['A square frame can lean over into a diamond.', 'A triangle can’t change shape unless a side bends or breaks.', 'So the triangle keeps its shape.'],
  });
}

export const buildABridge: Lesson = {
  id: 'build-a-bridge',
  title: 'Bridge Builders',
  Thumb,
  Scene: BridgeScene,
  sceneHint: 'Pick a beam and a support · Guess · Test with weights · Improve and test again',
  learn: {
    heading: 'Bridge builders',
    intro: 'Engineers design a bridge, test it, then make it better. A flat plank bends easily. Arches and triangles are strong shapes, and a pillar under the middle helps carry the weight.',
    points: [
      { icon: Triangle, text: 'Triangles keep their shape when you push them.' },
      { icon: Rainbow, text: 'An arch pushes the weight out to the banks.' },
      { icon: Weight, text: 'A bridge bends most in the middle. A pillar there helps.' },
      { icon: Hammer, text: 'Design, test, improve, test again!' },
    ],
  },
  steps: [
    'Choose a beam shape and a support.',
    'Guess how many weights it will hold.',
    'Test it: weights are added one at a time until it breaks.',
    'Change one thing to make it stronger, then test again.',
    'Compare your tries. Which design was strongest?',
  ],
  example: {
    question: 'A flat plank held 2 weights before it broke. How could you make it stronger?',
    visual: <BridgePicture shape="flat" />,
    work: ['It broke in the middle, where it bends most.', 'Put a pillar under the middle, or use an arch or triangles.', 'Then test again to check.'],
    answer: 'Add a pillar, or use an arch or triangles.',
  },
  grownups: [
    'Make a paper bridge between two piles of books and load it with coins. Then fold the paper into a zig-zag and test again.',
    'The numbers in the scene are a simple model. Real bridges also depend on materials and length, but the order (flat < arch < triangles, and pillars help) is true.',
    'Spot triangles and arches in real bridges, roofs, cranes and bikes.',
    'Praise the testing and improving, not just the strongest bridge.',
  ],
  makeQuestion: (level) =>
    byLevel(level, [
      [strongerShape, strongShapeWord],
      [addPillar, whyArch, readTries],
      [nextStep, fairTest, pillarSum, trianglePicture],
    ]),
};
