import { useEffect, useRef, useState } from 'react';
import { ListChecks, ListOrdered, MessageSquareText, Ruler } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragItem, Message } from '../engine';
import { mcq } from '../q';

interface Step {
  icon: string;
  text: string;
  /** What goes wrong if this step comes before the one it needs. */
  oops: string;
}

interface Task {
  name: string;
  icon: string;
  goal: string;
  steps: Step[];
}

/** Each step needs the step before it, so there is exactly one right order. */
const TASKS: Task[] = [
  {
    name: 'Plant a seed',
    icon: '🌱',
    goal: 'plant a seed',
    steps: [
      { icon: '🪴', text: 'Fill a pot with soil', oops: '' },
      { icon: '👆', text: 'Poke a hole in the soil', oops: 'Poke a hole in what? The pot is still empty!' },
      { icon: '🌰', text: 'Drop the seed in the hole', oops: 'There is no hole yet, so the seed just sits on top.' },
      { icon: '🤲', text: 'Cover the seed with soil', oops: 'Covering an empty hole? The seed isn’t in it yet!' },
      { icon: '💧', text: 'Water it', oops: 'Splash! The seed floats away because it isn’t covered yet.' },
    ],
  },
  {
    name: 'Brush teeth',
    icon: '🪥',
    goal: 'brush your teeth',
    steps: [
      { icon: '🪥', text: 'Pick up your toothbrush', oops: '' },
      { icon: '🧴', text: 'Squeeze on toothpaste', oops: 'Toothpaste on your fingers? Pick up the brush first!' },
      { icon: '😁', text: 'Brush every tooth', oops: 'Brushing with no toothpaste? Squeeze some on first.' },
      { icon: '💦', text: 'Rinse and spit', oops: 'Rinse and spit… but nothing has been brushed yet!' },
    ],
  },
  {
    name: 'Make a sandwich',
    icon: '🥪',
    goal: 'make a jam sandwich',
    steps: [
      { icon: '🍞', text: 'Take out two slices of bread', oops: '' },
      { icon: '🍓', text: 'Spread jam on one slice', oops: 'Jam on the plate? There is no bread yet!' },
      { icon: '🥪', text: 'Put the other slice on top', oops: 'Oops, a bread-only sandwich! The jam isn’t on yet.' },
      { icon: '😋', text: 'Eat and enjoy', oops: 'Eat it now? It isn’t finished yet!' },
    ],
  },
  {
    name: 'Wash hands',
    icon: '🧼',
    goal: 'wash your hands',
    steps: [
      { icon: '🚰', text: 'Turn on the water', oops: '' },
      { icon: '👐', text: 'Wet your hands', oops: 'Wet your hands with what? The water is off!' },
      { icon: '🧼', text: 'Rub with soap', oops: 'Dry soap won’t make bubbles. Wet your hands first.' },
      { icon: '💦', text: 'Rinse off the soap', oops: 'Rinse off what? There is no soap on yet.' },
      { icon: '🧻', text: 'Dry with a towel', oops: 'Drying soapy hands? Rinse the soap off first!' },
    ],
  },
];

const CARD = { w: 400, h: 60, gap: 12 };
const TRAY = { x: 40, y: 168 };
const SLOTS = { x: 560, y: 168 };
const rowY = (i: number) => TRAY.y + i * (CARD.h + CARD.gap);

function StepCard({ step, x, y, state }: { step: Step; x: number; y: number; state?: 'running' | 'ok' | 'oops' }) {
  const fill = state === 'running' ? shade(C.yellow, 0.55) : state === 'ok' ? shade(C.green, 0.75) : state === 'oops' ? shade(C.red, 0.7) : 'white';
  return (
    <g>
      <rect x={x + 2} y={y + 4} width={CARD.w} height={CARD.h} rx={14} fill={C.ink} opacity={0.12} />
      <rect x={x} y={y} width={CARD.w} height={CARD.h} rx={14} fill={fill} stroke={C.ink} strokeWidth={2} />
      <text x={x + 34} y={y + CARD.h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={30}>
        {step.icon}
      </text>
      <text x={x + 64} y={y + CARD.h / 2} dominantBaseline="central" fontSize={19} fontWeight={600} fill={C.ink}>
        {step.text}
      </text>
      {state === 'ok' && (
        <text x={x + CARD.w - 26} y={y + CARD.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={800} fill={shade(C.green, -0.3)}>
          ✓
        </text>
      )}
    </g>
  );
}

function AlgorithmScene() {
  const [ti, setTi] = useState(0);
  const task = TASKS[ti];
  const n = task.steps.length;
  const [tray, setTray] = useState<number[]>(() => mixed(TASKS[0].steps.length));
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(TASKS[0].steps.length).fill(null));
  const [run, setRun] = useState<{ at: number; failed: boolean; done: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const running = !!run && !run.done;

  const stop = () => {
    window.clearTimeout(timer.current);
    setRun(null);
  };

  const choose = (i: number) => {
    stop();
    setTi(i);
    setTray(mixed(TASKS[i].steps.length));
    setSlots(Array(TASKS[i].steps.length).fill(null));
    play('whoosh');
  };

  const mixUp = () => {
    stop();
    setTray(mixed(n));
    setSlots(Array(n).fill(null));
    play('whoosh');
  };

  /** Put step `s` into slot `k` (or the first empty slot); whatever was there goes back to the tray. */
  const place = (s: number, k?: number) => {
    if (running) return;
    stop();
    const next = slots.map((x) => (x === s ? null : x));
    const at = k ?? next.indexOf(null);
    if (at < 0) return;
    const bumped = next[at];
    next[at] = s;
    setSlots(next);
    setTray((t) => [...t.filter((x) => x !== s), ...(bumped !== null && bumped !== s ? [bumped] : [])]);
    play('pop');
  };

  const unplace = (s: number) => {
    if (running) return;
    stop();
    setSlots(slots.map((x) => (x === s ? null : x)));
    setTray((t) => [...t, s]);
    play('tap');
  };

  const slotAt = (p: Pt) => {
    const k = Math.floor((p.y - SLOTS.y + CARD.gap / 2) / (CARD.h + CARD.gap));
    return p.x > SLOTS.x - 60 && p.x < SLOTS.x + CARD.w + 20 && k >= 0 && k < n ? k : null;
  };

  const start = () => {
    if (slots.some((x) => x === null)) return;
    window.clearTimeout(timer.current);
    const order = slots as number[];
    const tick = (i: number) => {
      // A step can happen once every step before it in the task is done.
      const ok = order.slice(0, i).filter((x) => x < order[i]).length === order[i];
      if (!ok) {
        setRun({ at: i, failed: true, done: true });
        play('wrong');
        return;
      }
      setRun({ at: i, failed: false, done: false });
      play('tap');
      timer.current = window.setTimeout(() => {
        if (i + 1 >= order.length) {
          setRun({ at: i + 1, failed: false, done: true });
          play('complete');
        } else tick(i + 1);
      }, 850);
    };
    tick(0);
  };

  const full = slots.every((x) => x !== null);
  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  if (run?.failed) msg = { tone: 'oops', text: `Step ${run.at + 1}: ${task.steps[slots[run.at]!].oops} Can you fix the order?` };
  else if (run?.done) msg = { tone: 'good', text: `It worked! All ${n} steps in the right order. That's an algorithm to ${task.goal}.` };
  else if (run) msg = { tone: 'info', text: `Step ${run.at + 1}: ${task.steps[slots[run.at]!].text}.` };
  else if (full) msg = { tone: 'info', text: 'Every slot is full. Press Run to try your algorithm!' };
  else msg = { tone: 'info', text: `These steps to ${task.goal} are mixed up. Tap or drag them into the right order.` };

  const stateOf = (k: number): 'running' | 'ok' | 'oops' | undefined => {
    if (!run) return undefined;
    if (k < run.at) return 'ok';
    if (k === run.at) return run.failed ? 'oops' : run.done ? undefined : 'running';
    return undefined;
  };

  return (
    <SceneSvg label={`Put the steps to ${task.goal} in order, then run the algorithm`}>
      {TASKS.map((t, i) => (
        <SvgButton key={t.name} x={40 + i * 232} y={52} w={220} h={52} fontSize={18} label={`${t.icon} ${t.name}`} onClick={() => choose(i)} active={i === ti} disabled={running} />
      ))}

      <text x={TRAY.x} y={TRAY.y - 14} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Mixed-up steps
      </text>
      <text x={SLOTS.x - 40} y={SLOTS.y - 14} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Your algorithm
      </text>

      {/* Empty slots, numbered */}
      {Array.from({ length: n }, (_, k) => (
        <g key={k}>
          <circle cx={SLOTS.x - 24} cy={rowY(k) + CARD.h / 2} r={17} fill={C.ink} />
          <text x={SLOTS.x - 24} y={rowY(k) + CARD.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={800} fill="white">
            {k + 1}
          </text>
          <rect x={SLOTS.x} y={rowY(k)} width={CARD.w} height={CARD.h} rx={14} fill="white" stroke={C.muted} strokeWidth={2} strokeDasharray="7 6" opacity={0.8} />
        </g>
      ))}

      {/* Cards in the tray */}
      {tray.map((s, i) => (
        <DragItem key={`t${s}`} label={task.steps[s].text} disabled={running} onTap={() => place(s)} onDrop={(p) => { const k = slotAt(p); if (k !== null) place(s, k); }}>
          <StepCard step={task.steps[s]} x={TRAY.x} y={rowY(i)} />
        </DragItem>
      ))}

      {/* Cards in the algorithm */}
      {slots.map((s, k) =>
        s === null ? null : (
          <DragItem key={`s${s}`} label={`Step ${k + 1}: ${task.steps[s].text}`} disabled={running} onTap={() => unplace(s)} onDrop={(p) => { const to = slotAt(p); if (to !== null) place(s, to); else if (p.x < SLOTS.x - 60) unplace(s); }}>
            <StepCard step={task.steps[s]} x={SLOTS.x} y={rowY(k)} state={stateOf(k)} />
          </DragItem>
        ),
      )}

      <Message x={40} y={556} w={500} tone={msg.tone} text={msg.text} />
      <SvgButton x={560} y={556} w={130} h={56} fontSize={20} label="▶ Run" onClick={start} disabled={!full || running} color={C.green} textColor="white" title="Try the steps in order" />
      <SvgButton x={702} y={556} w={110} h={56} fontSize={19} label="Reset" onClick={stop} disabled={!run} />
      <SvgButton x={824} y={556} w={136} h={56} fontSize={19} label="Mix up" onClick={mixUp} disabled={running} />

      <Callout at={[TRAY.x + 240, rowY(0)]} box={[230, 112]} w={220} icon={ListOrdered} title="Tap or drag" text="Tap a step to add it to your algorithm. Tap it again to take it back." />
      <Callout at={[SLOTS.x + 260, rowY(0)]} box={[720, 112]} w={240} icon={ListChecks} title="One right order" text="Each step needs the one before it. Run it to test your order." />
    </SceneSvg>
  );
}

/** A shuffled order that isn't already correct. */
function mixed(n: number): number[] {
  for (;;) {
    const s = shuffle(Array.from({ length: n }, (_, i) => i));
    if (s.some((x, i) => x !== i)) return s;
  }
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {['🌱', '💧', '☀️'].map((e, i) => (
        <g key={i}>
          <circle cx={14} cy={16 + i * 24} r={8} fill={C.ink} />
          <text x={14} y={16 + i * 24} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800} fill="white">
            {i + 1}
          </text>
          <rect x={26} y={6 + i * 24} width={86} height={20} rx={6} fill="white" stroke={C.ink} strokeWidth={1.3} />
          <text x={38} y={17 + i * 24} textAnchor="middle" dominantBaseline="central" fontSize={12}>
            {e}
          </text>
          <rect x={50} y={13 + i * 24} width={50 - i * 10} height={6} rx={3} fill={C.line} />
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

const PRECISE: [string, string][] = [
  ['Walk 3 steps forward.', 'Go over there.'],
  ['Put 2 spoons of sugar in the bowl.', 'Add some sugar.'],
  ['Stir the soup 10 times.', 'Stir it for a while.'],
  ['Put the red block on top of the blue block.', 'Put that one on there.'],
  ['Turn right, then walk to the door.', 'Go that way.'],
  ['Water the plant with 1 cup of water.', 'Give the plant a drink.'],
  ['Clap your hands 4 times.', 'Clap a bit.'],
];

/** A numbered list of steps (for practice questions), with a "?" row for the missing next step. */
function StepsPicture({ steps }: { steps: Step[] }) {
  const h = 52;
  const rows = [...steps, null];
  return (
    <svg viewBox={`0 0 460 ${rows.length * (h + 8)}`} role="img" aria-label={`${steps.map((st, i) => `${i + 1}. ${st.text}`).join('. ')}. What comes next?`}>
      {rows.map((st, i) => (
        <g key={i}>
          <circle cx={22} cy={i * (h + 8) + h / 2} r={16} fill={C.ink} />
          <text x={22} y={i * (h + 8) + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={800} fill="white">
            {i + 1}
          </text>
          <rect x={48} y={i * (h + 8)} width={406} height={h} rx={12} fill="white" stroke={C.ink} strokeWidth={2} strokeDasharray={st ? undefined : '7 6'} />
          <text x={78} y={i * (h + 8) + h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={st ? 26 : 28} fontWeight={800} fill={C.muted}>
            {st ? st.icon : '?'}
          </text>
          {st && (
            <text x={104} y={i * (h + 8) + h / 2} dominantBaseline="central" fontSize={20} fontWeight={600} fill={C.ink}>
              {st.text}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** "What comes first?" */
function whatFirst(): Question {
  const task = pick(TASKS);
  const first = task.steps[0].text;
  const wrong = shuffle(task.steps.slice(1)).slice(0, 2).map((s) => s.text);
  return mcq({
    prompt: `To ${task.goal}, what do you do first?`,
    answer: first,
    wrong,
    hint: 'Think about what has to be ready before you can do anything else.',
    explain: [`Every other step needs something to be ready first.`, `You can’t do anything until you ${lower(first)}.`, `So the first step is: ${first}.`],
  });
}

/** "What comes next?" after the first k steps. */
function whatNext(late: boolean): Question {
  const task = pick(TASKS);
  const k = late ? rand(2, task.steps.length - 1) : rand(1, 2);
  const next = task.steps[k];
  const prev = task.steps[k - 1];
  const others = shuffle(task.steps.filter((_, i) => i !== k && i !== k - 1)).slice(0, 2);
  return mcq({
    prompt: `To ${task.goal}, what comes next?`,
    visual: <StepsPicture steps={task.steps.slice(0, k)} />,
    answer: next.text,
    wrong: others.map((s) => s.text),
    hint: 'Look at the last step. What can you do now that it’s done?',
    explain: [`The last step was: ${prev.text}.`, `Now you can do the step that needed it.`, `Next comes: ${next.text}.`],
  });
}

/** "Which instruction is clearer for a robot?" */
function clearer(): Question {
  const [good, vague] = pick(PRECISE);
  const other = pick(PRECISE.filter(([g]) => g !== good))[1];
  return mcq({
    prompt: 'Which instruction is clearer for a robot?',
    answer: good,
    wrong: [vague, other],
    hint: 'A robot can’t guess. Which one says exactly what to do, and how much?',
    explain: ['A robot does exactly what it is told. It can’t guess what we mean.', `“${vague}” doesn’t say exactly what to do.`, `“${good}” says exactly what to do, so it is the clearest.`],
  });
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function makeQuestion(level: number): Question {
  if (level <= 0) return Math.random() < 0.6 ? whatFirst() : whatNext(false);
  if (level === 1) return Math.random() < 0.5 ? whatNext(false) : clearer();
  return Math.random() < 0.5 ? whatNext(true) : clearer();
}

export const everydayAlgorithms: Lesson = {
  id: 'everyday-algorithms',
  title: 'Everyday Algorithms',
  Thumb,
  Scene: AlgorithmScene,
  sceneHint: 'Tap or drag the steps into order, then press Run',
  learn: {
    heading: 'Algorithms are everywhere',
    intro: 'An algorithm is a list of clear steps, in order, that gets a job done. Recipes, getting dressed and brushing your teeth are all algorithms!',
    points: [
      { icon: ListOrdered, text: 'Steps go in an order. Some steps need others done first.' },
      { icon: Ruler, text: 'Good steps are exact: “walk 3 steps”, not “go over there”.' },
      { icon: MessageSquareText, text: 'Test an algorithm by following it exactly as written.' },
    ],
  },
  steps: ['Read all the mixed-up steps.', 'Find the step that has to happen first.', 'Ask “what can I do now?” to find each next step.', 'Run it. If something silly happens, swap the steps and try again.'],
  example: {
    question: 'Put these in order: rinse and spit, pick up your toothbrush, brush every tooth, squeeze on toothpaste.',
    work: ['You need the brush before anything else.', 'Toothpaste goes on the brush, then you brush.', 'Rinsing comes last.'],
    answer: 'Pick up your toothbrush, squeeze on toothpaste, brush every tooth, rinse and spit.',
  },
  grownups: [
    'Narrate everyday algorithms as you do them: “First we…, next…, last…”. Then let your child give you the steps for a simple job, and follow them exactly, even if that is silly!',
    'Being precise is a key coding skill. When an instruction is vague (“put it there”), ask “where exactly?”',
    'Mixing up the order and seeing what goes wrong is part of the fun. Ask “which step needs to come before this one?”',
  ],
  makeQuestion,
};
