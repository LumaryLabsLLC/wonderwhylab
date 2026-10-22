import { useEffect, useState } from 'react';
import { Battery, Magnet, Power, Repeat2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PoePanel, usePoe } from './visuals/Poe';
import type { Challenge } from './visuals/Poe';

/**
 * An electromagnet: current in a coil makes a magnetic field; an iron core makes it much stronger.
 * Strength grows with turns × current (here: batteries), so the scene uses that product to decide
 * how many paperclips stick. A plastic core is nearly as weak as no core at all.
 */
type Core = 'iron' | 'plastic';

const TURN_STEPS = [5, 10, 15, 20, 25];
const MAX_CLIPS = 12;

export function clipsPicked(turns: number, batteries: number, core: Core, on: boolean) {
  if (!on) return 0;
  const strength = turns * batteries * (core === 'iron' ? 1 : 0.15);
  return Math.max(0, Math.min(MAX_CLIPS, Math.round(strength / 6.25)));
}

const NAIL = { x: 520, top: 220, tip: 470 };
const TABLE_Y = 610;

/** Resting spots for paperclips on the table, and hanging spots under the nail. */
const PILE = Array.from({ length: MAX_CLIPS }, (_, i) => ({ x: 404 + i * 23, y: TABLE_Y - 15, r: (i * 37) % 50 - 25 }));
const HANG = Array.from({ length: MAX_CLIPS }, (_, i) => ({ x: NAIL.x + ((i % 4) - 1.5) * 24, y: NAIL.tip + 22 + Math.floor(i / 4) * 26, r: ((i % 4) - 1.5) * 18 }));

function Clip({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, transition: 'transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1)' }}>
      <rect x={-8} y={-14} width={16} height={28} rx={8} fill="none" stroke="#8a93a3" strokeWidth={3} />
      <rect x={-4} y={-8} width={8} height={18} rx={4} fill="none" stroke="#8a93a3" strokeWidth={2.5} />
    </g>
  );
}

interface MagnetChallenge extends Challenge {
  kind: 'turns' | 'batteries' | 'off' | 'core';
}

const CHALLENGES: MagnetChallenge[] = [
  {
    kind: 'turns',
    question: 'Add more turns. Paperclips…',
    options: ['More', 'Fewer', 'Same'],
    actual: 'More',
    because: 'More turns of wire make a stronger magnetic field, so more paperclips stick.',
  },
  {
    kind: 'batteries',
    question: 'Add a battery. Paperclips…',
    options: ['More', 'Fewer', 'Same'],
    actual: 'More',
    because: 'More batteries push more current through the coil, so the magnet gets stronger.',
  },
  {
    kind: 'off',
    question: 'Switch it off. The clips…',
    options: ['Stay stuck', 'Fall off'],
    actual: 'Fall off',
    because: 'An electromagnet is only a magnet while current flows through its coil.',
  },
  {
    kind: 'core',
    question: 'Swap iron for plastic. Clips…',
    options: ['More', 'Fewer', 'Same'],
    actual: 'Fewer',
    because: 'An iron core makes the field much stronger. Plastic does not, so fewer clips stick.',
  },
];

const nextChallenge = (prev: MagnetChallenge | null) => pick(CHALLENGES.filter((c) => c.kind !== prev?.kind));

function ElectromagnetScene() {
  const [turns, setTurns] = useState(10);
  const [batteries, setBatteries] = useState(1);
  const [core, setCore] = useState<Core>('iron');
  const [on, setOn] = useState(true);
  const poe = usePoe<MagnetChallenge>(nextChallenge);

  // Once the child predicts, set up a fair starting point for the experiment.
  useEffect(() => {
    if (poe.guess === null) return;
    const k = poe.challenge.kind;
    setOn(true);
    setCore('iron');
    setTurns(k === 'turns' ? 10 : k === 'core' ? 20 : 15);
    setBatteries(k === 'batteries' ? 1 : 2);
  }, [poe.guess, poe.challenge.kind]);

  const observeIf = (kind: MagnetChallenge['kind']) => {
    if (poe.waiting && poe.challenge.kind === kind) window.setTimeout(poe.observe, 700);
  };

  const clips = clipsPicked(turns, batteries, core, on);
  const loops = turns;
  const coilTop = NAIL.top + 40;
  const coilBottom = NAIL.tip - 30;
  const gap = (coilBottom - coilTop) / loops;
  const field = on ? Math.min(1, (turns * batteries * (core === 'iron' ? 1 : 0.15)) / 75) : 0;
  const waitFor = poe.waiting ? poe.challenge.kind : null;

  return (
    <SceneSvg label="An electromagnet made from a battery, a coil of wire and a nail, picking up paperclips">
      {/* Table */}
      <line x1={380} y1={TABLE_Y} x2={680} y2={TABLE_Y} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />

      {/* Circuit: battery + → coil → switch → battery − */}
      {(() => {
        const packRight = 60 + batteries * 52;
        const plus = `M${60 + batteries * 26},476 L${60 + batteries * 26},${coilTop} L${NAIL.x - 24},${coilTop}`;
        const minus = `M${NAIL.x - 24},${coilBottom} L390,${coilBottom} L390,590 L336,590 M284,590 L${packRight},590`;
        return (
          <g>
            <path d={plus} fill="none" stroke={C.red} strokeWidth={5} strokeLinejoin="round" />
            <path d={minus} fill="none" stroke={C.ink2} strokeWidth={5} strokeLinejoin="round" />
            {on && (
              <>
                <path className="em-current" d={plus} fill="none" stroke={C.yellow} strokeWidth={3} strokeDasharray="4 14" />
                <path className="em-current" d={minus} fill="none" stroke={C.yellow} strokeWidth={3} strokeDasharray="4 14" />
              </>
            )}
          </g>
        );
      })()}

      {/* Batteries */}
      {Array.from({ length: batteries }, (_, i) => (
        <g key={i} transform={`translate(${64 + i * 52} 480)`}>
          <rect x={0} y={0} width={44} height={110} rx={8} fill={C.ink2} stroke={C.ink} strokeWidth={2.5} />
          <rect x={0} y={0} width={44} height={36} rx={8} fill={C.orange} stroke={C.ink} strokeWidth={2.5} />
          <rect x={14} y={-8} width={16} height={10} rx={3} fill={C.ink2} stroke={C.ink} strokeWidth={2} />
          <text x={22} y={78} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.white}>
            1.5V
          </text>
        </g>
      ))}

      {/* Switch */}
      <g
        onClick={() => {
          setOn(!on);
          play(on ? 'tap' : 'pop');
          if (on) observeIf('off');
        }}
        style={{ cursor: 'pointer' }}
        data-nopan
        role="button"
        aria-label={on ? 'Flip the switch off' : 'Flip the switch on'}
      >
        <rect x={270} y={550} width={80} height={60} fill="transparent" />
        <circle cx={290} cy={590} r={6} fill={C.ink} />
        <circle cx={336} cy={590} r={6} fill={C.ink} />
        <line x1={290} y1={590} x2={on ? 336 : 326} y2={on ? 590 : 562} stroke={C.ink} strokeWidth={5} strokeLinecap="round" style={{ transition: 'all 0.2s' }} />
        <text x={313} y={628} textAnchor="middle" fontSize={14} fill={C.muted} className="caps">
          switch
        </text>
      </g>

      {/* Magnetic field */}
      {field > 0 &&
        [1, 2, 3].map((k) => (
          <ellipse key={k} cx={NAIL.x} cy={(NAIL.top + NAIL.tip) / 2} rx={40 + k * 34} ry={120 + k * 26} fill="none" stroke={C.purple} strokeWidth={2.5} strokeDasharray="8 8" opacity={field * (0.9 - k * 0.2)} />
        ))}

      {/* Core and coil */}
      {core === 'iron' ? (
        <g>
          <rect x={NAIL.x - 9} y={NAIL.top} width={18} height={NAIL.tip - NAIL.top} fill="#9aa3b2" stroke={C.ink} strokeWidth={2.5} />
          <rect x={NAIL.x - 22} y={NAIL.top - 12} width={44} height={14} rx={4} fill="#9aa3b2" stroke={C.ink} strokeWidth={2.5} />
          <path d={`M${NAIL.x - 9},${NAIL.tip} L${NAIL.x},${NAIL.tip + 22} L${NAIL.x + 9},${NAIL.tip}`} fill="#9aa3b2" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
      ) : (
        <rect x={NAIL.x - 11} y={NAIL.top - 10} width={22} height={NAIL.tip - NAIL.top + 24} rx={8} fill="#7ecbe8" stroke={C.ink} strokeWidth={2.5} />
      )}
      {Array.from({ length: loops }, (_, i) => (
        <ellipse key={i} cx={NAIL.x} cy={coilTop + gap * (i + 0.5)} rx={24} ry={Math.max(3, gap / 2)} fill="none" stroke="#c46a2b" strokeWidth={3} />
      ))}

      {/* Paperclips */}
      {Array.from({ length: MAX_CLIPS }, (_, i) => {
        const at = i < clips ? HANG[i] : PILE[i];
        return <Clip key={i} {...at} />;
      })}

      {/* Readout and controls */}
      <rect x={700} y={40} width={260} height={110} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={700} y={40} width={260} height={110} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={830} y={68} textAnchor="middle" fontSize={14} fill={C.muted} className="caps">
        Paperclips picked up
      </text>
      <text x={830} y={118} textAnchor="middle" fontSize={46} fontWeight={700} fill={C.ink}>
        {clips}
      </text>

      <text x={700} y={204} fontSize={18} fontWeight={700} fill={C.ink}>
        Turns: {turns}
      </text>
      <SvgButton x={840} y={180} w={56} h={46} label="−" title="Fewer turns" disabled={turns <= TURN_STEPS[0]} onClick={() => setTurns(turns - 5)} />
      <SvgButton
        x={904}
        y={180}
        w={56}
        h={46}
        label="+"
        title="More turns"
        color={C.yellow}
        disabled={turns >= TURN_STEPS[TURN_STEPS.length - 1]}
        onClick={() => {
          setTurns(turns + 5);
          observeIf('turns');
        }}
      />

      <text x={700} y={274} fontSize={18} fontWeight={700} fill={C.ink}>
        Batteries: {batteries}
      </text>
      <SvgButton x={840} y={250} w={56} h={46} label="−" title="Fewer batteries" disabled={batteries <= 1} onClick={() => setBatteries(batteries - 1)} />
      <SvgButton
        x={904}
        y={250}
        w={56}
        h={46}
        label="+"
        title="More batteries"
        color={C.yellow}
        disabled={batteries >= 3}
        onClick={() => {
          setBatteries(batteries + 1);
          observeIf('batteries');
        }}
      />

      <text x={700} y={344} fontSize={18} fontWeight={700} fill={C.ink}>
        Core
      </text>
      <SvgButton x={760} y={320} w={96} h={46} fontSize={16} label="Iron nail" active={core === 'iron'} color={core === 'iron' ? C.yellow : C.card} onClick={() => setCore('iron')} />
      <SvgButton
        x={864}
        y={320}
        w={96}
        h={46}
        fontSize={16}
        label="Plastic"
        active={core === 'plastic'}
        color={core === 'plastic' ? C.yellow : C.card}
        onClick={() => {
          setCore('plastic');
          if (core === 'iron') observeIf('core');
        }}
      />

      <SvgButton
        x={700}
        y={392}
        w={260}
        h={54}
        fontSize={19}
        label={on ? 'Switch: ON' : 'Switch: OFF'}
        color={on ? C.teal : C.card}
        textColor={on ? C.white : C.ink}
        onClick={() => {
          setOn(!on);
          play(on ? 'tap' : 'pop');
          if (on) observeIf('off');
        }}
      />

      {/* What to change for the current prediction */}
      {waitFor && (
        <rect
          x={waitFor === 'core' ? 856 : 832}
          y={waitFor === 'turns' ? 172 : waitFor === 'batteries' ? 242 : waitFor === 'core' ? 312 : 384}
          width={waitFor === 'core' ? 112 : waitFor === 'off' ? 276 : 136}
          height={waitFor === 'off' ? 76 : 66}
          rx={14}
          transform={waitFor === 'off' ? 'translate(-140 0)' : undefined}
          fill="none"
          stroke={C.teal}
          strokeWidth={3}
          strokeDasharray="8 6"
          pointerEvents="none"
        />
      )}

      {/* Predict → observe → explain */}
      <PoePanel x={40} y={24} w={430} poe={poe} />

      <Callout at={[NAIL.x + 24, coilTop + 40]} box={[600, 480]} w={250} icon={Repeat2} title="The coil" text="Electric current flowing round and round the coil makes a magnetic field." />
      <style>{`.em-current { animation: em-flow 0.8s linear infinite; } @keyframes em-flow { to { stroke-dashoffset: -36; } } @media (prefers-reduced-motion: reduce) { .em-current { animation: none; } }`}</style>
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={56} y={8} width={8} height={48} fill="#9aa3b2" stroke={C.ink} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={60} cy={18 + i * 6} rx={12} ry={3} fill="none" stroke="#c46a2b" strokeWidth={2} />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={46 + i * 10} y={58 + (i % 2) * 6} width={8} height={14} rx={4} fill="none" stroke="#8a93a3" strokeWidth={2} />
      ))}
      <rect x={10} y={40} width={18} height={32} rx={4} fill={C.ink2} stroke={C.ink} strokeWidth={2} />
      <rect x={10} y={40} width={18} height={10} rx={4} fill={C.orange} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ---------- practice ----------

function strongest(): Question {
  const tw = pick([15, 20, 25]);
  const bw = pick([2, 3]);
  // Every other magnet is no better in either way and worse in at least one, so the answer is clear.
  const others: { t: number; b: number }[] = [];
  while (others.length < 2) {
    const t = pick(TURN_STEPS.filter((x) => x <= tw));
    const b = rand(1, bw);
    if ((t < tw || b < bw) && !others.some((o) => o.t === t && o.b === b)) others.push({ t, b });
  }
  const all = shuffle([{ t: tw, b: bw, win: true }, ...others.map((o) => ({ ...o, win: false }))]);
  const labels = ['A', 'B', 'C'];
  const winner = labels[all.findIndex((m) => m.win)];
  const desc = all.map((m, i) => `${labels[i]}: ${m.t} turns, ${m.b} batter${m.b === 1 ? 'y' : 'ies'}`).join('; ');
  return {
    prompt: `All three use an iron nail. ${desc}. Which electromagnet is strongest?`,
    choices: labels.map((l) => ({ value: `Magnet ${l}` })),
    answer: `Magnet ${winner}`,
    hint: 'More turns of wire and more batteries both make an electromagnet stronger.',
    explain: [
      'More turns and more current (batteries) both make the field stronger.',
      `Magnet ${winner} has ${tw} turns and ${bw} batteries: the most of both.`,
      `So Magnet ${winner} is strongest.`,
    ],
  };
}

function makeQuestion(level: number): Question {
  const kind = level === 0 ? pick(['off', 'stronger']) : level === 1 ? pick(['turns', 'core', 'off']) : pick(['strongest', 'crane', 'turns']);

  if (kind === 'off') {
    const right = 'It stops being a magnet';
    return {
      prompt: 'What happens to an electromagnet when the current is switched off?',
      choices: shuffle([right, 'It gets stronger', 'It stays a magnet forever']).map((value) => ({ value })),
      answer: right,
      hint: 'Think about where its magnetism comes from.',
      explain: ['Its magnetism comes from the electric current in the coil.', 'No current means no magnetic field.', 'So it stops being a magnet.'],
    };
  }
  if (kind === 'stronger') {
    const right = 'More turns of wire';
    return {
      prompt: 'Which change makes an electromagnet stronger?',
      choices: shuffle([right, 'Fewer turns of wire', 'A plastic core instead of iron']).map((value) => ({ value })),
      answer: right,
      hint: 'The magnetism comes from current flowing round the coil.',
      explain: ['Each turn of the coil adds to the magnetic field.', 'Fewer turns or a plastic core make it weaker.', 'So more turns of wire make it stronger.'],
    };
  }
  if (kind === 'turns') {
    const [a, b] = shuffle(TURN_STEPS).slice(0, 2);
    const winner = a > b ? 'Magnet A' : 'Magnet B';
    return {
      prompt: `Magnet A has ${a} turns of wire and magnet B has ${b}. Both use one battery and an iron nail. Which picks up more paperclips?`,
      choices: [{ value: 'Magnet A' }, { value: 'Magnet B' }],
      answer: winner,
      hint: 'Only the number of turns is different. What do more turns do?',
      explain: ['Only one thing changed, so it is a fair test.', `${Math.max(a, b)} turns make a stronger field than ${Math.min(a, b)}.`, `So ${winner} picks up more.`],
    };
  }
  if (kind === 'core') {
    const right = 'an iron nail';
    return {
      prompt: 'Which core makes the strongest electromagnet?',
      choices: shuffle([right, 'a plastic straw', 'a wooden stick']).map((value) => ({ value })),
      answer: right,
      hint: 'Which of these does a magnet pull on?',
      explain: ['Iron is a magnetic material.', 'An iron core makes the coil’s field much stronger; plastic and wood don’t.', 'So the best core is an iron nail.'],
    };
  }
  if (kind === 'crane') {
    const right = 'It can be switched off to drop the metal';
    return {
      prompt: 'Why does a scrapyard crane use an electromagnet instead of an ordinary magnet?',
      choices: shuffle([right, 'It is lighter to lift', 'It also picks up plastic']).map((value) => ({ value })),
      answer: right,
      hint: 'What can an electromagnet do that a fridge magnet can’t?',
      explain: ['The crane needs to pick metal up and then let go of it.', 'An electromagnet only works while the current is on.', 'It can be switched off to drop the metal.'],
    };
  }
  return strongest();
}

export const electromagnets: Lesson = {
  id: 'electromagnets',
  title: 'Electromagnets',
  Thumb,
  Scene: ElectromagnetScene,
  sceneHint: 'Predict, then change one thing · Count the paperclips',
  learn: {
    heading: 'Electromagnets',
    intro: 'Electric current flowing through a coil of wire makes a magnetic field. Wrap the coil round an iron nail and you have an electromagnet: a magnet you can switch on and off.',
    points: [
      { icon: Repeat2, text: 'Current in a coil makes a magnetic field.' },
      { icon: Battery, text: 'More turns or more current make it stronger.' },
      { icon: Magnet, text: 'An iron core makes it much stronger.' },
      { icon: Power, text: 'Switch the current off and it stops being a magnet.' },
    ],
  },
  steps: [
    'Wrap insulated wire round an iron nail to make a coil.',
    'Connect the ends to a battery and close the switch.',
    'Count how many paperclips the nail picks up.',
    'Change only one thing (turns, batteries or the core) and test again. That keeps it a fair test.',
  ],
  example: {
    question: 'An electromagnet with 10 turns picks up 2 paperclips. With the same battery, it is rewound with 20 turns. What happens?',
    work: ['Only the number of turns changed, so it is a fair test.', 'More turns of wire make a stronger magnetic field.', 'So it picks up more paperclips.'],
    answer: 'It picks up more paperclips: the magnet is stronger.',
  },
  grownups: [
    'Safety first if you build one: use a single 1.5 V battery and insulated wire, connect it for a few seconds at a time (the wire and battery get warm), and never use mains electricity.',
    'This is a great "fair test": change one thing, keep everything else the same, and count.',
    'Real electromagnets are in doorbells, loudspeakers, electric motors, maglev trains and hospital MRI scanners.',
    'Strength depends on the current and the number of turns; an iron core concentrates the field.',
  ],
  makeQuestion,
};
