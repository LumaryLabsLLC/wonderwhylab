import { useRef, useState } from 'react';
import { Clock, Droplets, Sparkles, Utensils } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { toSvgPoint } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, DragItem, Emoji, EmojiLabel, EmojiPicture, inside, Lines, Note, Tap } from '../shared/kit';

type Step = 'wet' | 'soap' | 'scrub' | 'rinse' | 'dry' | 'done';
const STEPS: { id: Step; label: string; emoji: string }[] = [
  { id: 'wet', label: 'Wet', emoji: '💧' },
  { id: 'soap', label: 'Soap', emoji: '🧼' },
  { id: 'scrub', label: 'Scrub', emoji: '👐' },
  { id: 'rinse', label: 'Rinse', emoji: '🚰' },
  { id: 'dry', label: 'Dry', emoji: '🧻' },
];
const GOAL_S = 20;
const HANDS = { x: 110, y: 160, w: 460, h: 330 };

const WHEN = [
  { emoji: '🍽️', text: 'Before eating' },
  { emoji: '🚽', text: 'After the toilet' },
  { emoji: '🤧', text: 'After sneezing' },
  { emoji: '🌳', text: 'After playing outside' },
  { emoji: '🐶', text: 'After touching pets' },
];

/** Pseudo-random germ spots on the hands (stable between renders). */
const GERMS = Array.from({ length: 34 }, (_, i) => {
  const left = i % 2 === 0;
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 30 + ((i * 53) % 80);
  return { x: (left ? 230 : 450) + Math.cos(a) * r * 0.75, y: 330 + Math.sin(a) * r, c: i % 3 === 0 ? '#9b5de5' : i % 3 === 1 ? '#3fae5a' : '#f15bb5' };
});

function Hand({ cx, flip, color }: { cx: number; flip: boolean; color: string }) {
  return (
    <g transform={`translate(${cx} 330) scale(${flip ? -1 : 1} 1)`}>
      <path
        d="M-70,120 L-70,10 Q-74,-70 -50,-70 Q-36,-70 -36,-20 L-36,-110 Q-36,-130 -18,-130 Q0,-130 0,-110 L0,-130 Q0,-150 18,-150 Q36,-150 36,-130 L36,-110 Q36,-128 54,-128 Q72,-128 72,-108 L72,-60 Q72,-80 88,-80 Q104,-80 104,-60 L104,40 Q104,120 40,140 L-50,140 Z"
        fill={color}
        stroke={C.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </g>
  );
}

function WashScene() {
  const [step, setStep] = useState<Step>('wet');
  const [scrub, setScrub] = useState(0);
  const [wet, setWet] = useState(false);
  const [soapy, setSoapy] = useState(false);
  const [clean, setClean] = useState(0); // 0..1 share of germs washed away
  const [dryness, setDryness] = useState(0);
  const [drag, setDrag] = useState<{ what: 'soap' | 'towel'; p: Pt } | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' } | null>({ text: 'Our hands carry tiny germs we can’t see. Let’s wash them away! Step 1: tap the tap to wet your hands.', tone: 'good' });
  const [when, setWhen] = useState<number | null>(null);
  const last = useRef<{ t: number; p: Pt } | null>(null);
  const scrubRef = useRef(0);
  const dryRef = useRef(0);

  const reset = () => {
    setStep('wet');
    scrubRef.current = 0;
    dryRef.current = 0;
    setScrub(0);
    setWet(false);
    setSoapy(false);
    setClean(0);
    setDryness(0);
    setNote({ text: 'Fresh germs from playing! Step 1: tap the tap to wet your hands.', tone: 'good' });
  };

  const tapWater = () => {
    if (step === 'wet') {
      play('pop');
      setWet(true);
      setStep('soap');
      setNote({ text: 'Wet! Step 2: drag the soap onto your hands.', tone: 'good' });
    } else if (step === 'rinse') {
      play('correct');
      setSoapy(false);
      setClean(1);
      setStep('dry');
      setNote({ text: 'Rinsed! The soap carried the germs down the drain. Step 5: drag the towel over your hands.', tone: 'good' });
    } else if (step === 'soap') {
      setNote({ text: 'Water alone doesn’t wash germs off well. Soap helps lift them off. Drag the soap onto your hands!', tone: 'nudge' });
    } else if (step === 'scrub') {
      setNote({ text: `Keep scrubbing first — about 20 seconds. You’re at ${Math.floor(scrub)}.`, tone: 'nudge' });
    }
  };

  const addSoap = () => {
    if (step !== 'soap') {
      setNote({ text: step === 'wet' ? 'Wet your hands first, then use soap.' : 'You already have soap on!', tone: 'nudge' });
      return;
    }
    play('pop');
    setSoapy(true);
    setStep('scrub');
    setNote({ text: 'Bubbles! Step 3: rub your finger back and forth over the hands to scrub. Scrub for about 20 seconds.', tone: 'good' });
  };

  const dropSoap = (p: Pt) => {
    setDrag(null);
    if (inside(p, HANDS)) addSoap();
  };

  const dry = (amount: number) => {
    if (step !== 'dry') return;
    const d = dryRef.current;
    const nd = Math.min(1, d + amount);
    dryRef.current = nd;
    setDryness(nd);
    if (nd >= 1 && d < 1) {
      play('complete');
      setStep('done');
      setWet(false);
      setNote({ text: 'Clean and dry! Great washing. Now you know how to wash germs away.', tone: 'good' });
    }
  };

  const moveTowel = (p: Pt) => {
    setDrag({ what: 'towel', p });
    if (inside(p, HANDS)) dry(0.012);
  };

  const onScrubMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (step !== 'scrub' || !svg || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const p = toSvgPoint(svg, e.clientX, e.clientY);
    const now = performance.now();
    const prev = last.current;
    last.current = { t: now, p };
    if (!prev) return;
    const moved = Math.hypot(p.x - prev.p.x, p.y - prev.p.y);
    const dt = Math.min(0.12, (now - prev.t) / 1000);
    if (moved < 2) return;
    const s = scrubRef.current;
    const ns = Math.min(GOAL_S, s + dt);
    scrubRef.current = ns;
    setScrub(ns);
    setClean(0.9 * (ns / GOAL_S));
    if (ns >= GOAL_S && s < GOAL_S) {
      play('correct');
      setStep('rinse');
      setNote({ text: '20 seconds of scrubbing! Step 4: tap the tap to rinse the soap and germs away.', tone: 'good' });
    }
  };

  const germsLeft = Math.round(GERMS.length * (1 - clean));

  return (
    <SceneSvg label="Wash the germs off two hands">
      {/* Step chips */}
      {STEPS.map((s, i) => {
        const idx = STEPS.findIndex((x) => x.id === step);
        const doneStep = step === 'done' || i < idx;
        const now = s.id === step;
        return (
          <g key={s.id}>
            <rect x={110 + i * 92} y={30} width={84} height={64} rx={14} fill={now ? shade(C.yellow, 0.6) : doneStep ? shade(C.green, 0.75) : C.card} stroke={C.ink} strokeWidth={now ? 3 : 1.5} />
            <Emoji e={s.emoji} x={152 + i * 92} y={54} size={26} />
            <text x={152 + i * 92} y={84} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
              {i + 1}. {s.label}
            </text>
          </g>
        );
      })}

      {/* Hands, germs and lather */}
      <g>
        <Hand cx={230} flip={false} color={wet ? '#f2bf92' : '#f6c89a'} />
        <Hand cx={450} flip color={wet ? '#f2bf92' : '#f6c89a'} />
        {GERMS.slice(0, germsLeft).map((g, i) => (
          <g key={i}>
            <circle cx={g.x} cy={g.y} r={7} fill={g.c} opacity={0.85} />
            <circle cx={g.x - 2} cy={g.y - 2} r={2} fill="white" opacity={0.8} />
          </g>
        ))}
        {wet && (
          <g opacity={1 - dryness}>
            {[[180, 230], [300, 260], [400, 220], [500, 270], [250, 420], [440, 430]].map(([x, y], i) => (
              <path key={i} d={`M${x},${y} q-7,10 0,14 q7,-4 0,-14 z`} fill="#7cc4ff" stroke={C.ink} strokeWidth={1.2} />
            ))}
          </g>
        )}
        {soapy &&
          Array.from({ length: 10 + Math.floor(scrub * 1.5) }, (_, i) => (
            <circle key={i} cx={170 + ((i * 97) % 340)} cy={250 + ((i * 61) % 200)} r={10 + (i % 4) * 5} fill="white" stroke={shade(C.blue, 0.4)} strokeWidth={1.5} opacity={0.85} />
          ))}

        <rect
          x={HANDS.x}
          y={HANDS.y}
          width={HANDS.w}
          height={HANDS.h}
          fill="transparent"
          style={{ cursor: step === 'scrub' ? 'grab' : 'default', touchAction: 'none' }}
          data-nopan
          onPointerDown={(e) => {
            if (step !== 'scrub') return;
            e.currentTarget.setPointerCapture(e.pointerId);
            last.current = null;
          }}
          onPointerMove={onScrubMove}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
            last.current = null;
          }}
        />
      </g>
      <rect x={110} y={520} width={460} height={34} rx={14} fill={shade(C.blue, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={340} y={543} textAnchor="middle" fontSize={15} fill={C.ink}>
        sink
      </text>

      {/* Tools */}
      <Tap label={step === 'rinse' ? 'Rinse hands' : 'Turn on the tap'} onTap={tapWater}>
        <Card x={620} y={120} w={150} h={120} fill={step === 'wet' || step === 'rinse' ? shade(C.yellow, 0.65) : C.card}>
          <Emoji e="🚰" x={695} y={165} size={48} />
          <text x={695} y={222} textAnchor="middle" fontSize={16} fontWeight={600} fill={C.ink}>
            {step === 'rinse' ? 'Rinse' : 'Water'}
          </text>
        </Card>
      </Tap>
      <DragItem at={{ x: 865, y: 180 }} r={56} label="Soap" dragging={drag?.what === 'soap'} onMove={(p) => setDrag({ what: 'soap', p })} onDrop={dropSoap} onTap={addSoap}>
        <rect x={-62} y={-58} width={124} height={118} rx={16} fill={step === 'soap' ? shade(C.yellow, 0.65) : C.card} stroke={C.ink} strokeWidth={2} />
        <Emoji e="🧼" x={0} y={-12} size={48} />
        <text x={0} y={42} textAnchor="middle" fontSize={16} fontWeight={600} fill={C.ink} style={{ pointerEvents: 'none' }}>
          Soap
        </text>
      </DragItem>
      <DragItem at={{ x: 865, y: 320 }} r={56} label="Towel" dragging={drag?.what === 'towel'} onMove={moveTowel} onDrop={() => setDrag(null)} onTap={() => dry(0.34)}>
        <rect x={-62} y={-58} width={124} height={118} rx={16} fill={step === 'dry' ? shade(C.yellow, 0.65) : C.card} stroke={C.ink} strokeWidth={2} />
        <Emoji e="🧻" x={0} y={-12} size={48} />
        <text x={0} y={42} textAnchor="middle" fontSize={16} fontWeight={600} fill={C.ink} style={{ pointerEvents: 'none' }}>
          Towel
        </text>
      </DragItem>
      <Card x={620} y={262} w={150} h={116}>
        <text x={695} y={290} textAnchor="middle" fontSize={14} fill={C.muted} className="caps">
          Scrub time
        </text>
        <text x={695} y={336} textAnchor="middle" fontSize={40} fontWeight={700} fill={C.ink} className="num">
          {Math.floor(scrub)}
        </text>
        <text x={695} y={364} textAnchor="middle" fontSize={14} fill={C.muted}>
          of about {GOAL_S} seconds
        </text>
      </Card>
      {drag && (
        <g transform={`translate(${drag.p.x} ${drag.p.y})`} style={{ pointerEvents: 'none' }}>
          <Emoji e={drag.what === 'soap' ? '🧼' : '🧻'} x={0} y={0} size={56} />
        </g>
      )}
      {note && <Note x={600} y={396} w={360} text={note.text} tone={note.tone} />}
      {step === 'done' && <SvgButton x={600} y={560} w={170} h={50} fontSize={17} label="Wash again" onClick={reset} />}
      <SvgButton x={786} y={560} w={170} h={50} fontSize={17} label="Say it" onClick={() => speak('Wet, soap, scrub for 20 seconds, rinse, and dry.', { force: true })} />

      {/* When to wash */}
      <text x={110} y={590} fontSize={14} fill={C.muted} className="caps">
        When to wash
      </text>
      {WHEN.map((w, i) => (
        <Tap key={w.text} label={w.text} onTap={() => setWhen(when === i ? null : i)}>
          <rect x={110 + i * 92} y={602} width={84} height={56} rx={12} fill={when === i ? shade(C.yellow, 0.6) : C.card} stroke={C.ink} strokeWidth={1.5} />
          <Emoji e={w.emoji} x={152 + i * 92} y={630} size={30} />
        </Tap>
      ))}
      {when !== null && (
        <g>
          <rect x={110 + when * 92 - 30} y={566 - 40} width={150} height={36} rx={10} fill={C.ink} />
          <Lines text={WHEN[when].text} x={110 + when * 92 + 45} y={566 - 16} max={20} size={15} anchor="middle" fill="white" />
        </g>
      )}

      <Callout at={[330, 300]} box={[620, 14]} w={330} icon={Sparkles} title="Germs are tiny" text="Real germs are far too small to see. The dots show where they might be." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Emoji e="🧼" x={36} y={42} size={34} />
      <Emoji e="👐" x={82} y={42} size={36} />
      <circle cx={60} cy={18} r={7} fill="white" stroke={C.blue} />
      <circle cx={72} cy={12} r={5} fill="white" stroke={C.blue} />
    </svg>
  );
}

const pic = (value: string, e: string) => ({ value, name: value.toLowerCase(), label: <EmojiLabel e={e} text={value} /> });

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5)
      return choiceQuestion({
        prompt: 'What helps wash germs off your hands?',
        right: pic('Soap and water', '🧼'),
        wrong: [pic('Paint', '🎨'), pic('Mud', '🟫')].slice(0, 1 + Math.round(Math.random())),
        hint: 'Think about what makes bubbles at the sink.',
        explain: ['Germs stick to our skin.', 'Soap lifts them off and water rinses them away.', 'So we use soap and water.'],
      });
    const w = pick(WHEN);
    return choiceQuestion({
      prompt: 'When should you wash your hands?',
      right: pic(w.text, w.emoji),
      wrong: [pic('While you are asleep', '😴')],
      hint: 'Think of times when germs get on our hands, or could get into our mouths.',
      explain: ['We wash when germs might be on our hands.', 'We also wash before food goes near our mouths.', `So: ${w.text.toLowerCase()}.`],
    });
  }
  if (level === 1) {
    if (Math.random() < 0.5)
      return choiceQuestion({
        prompt: 'How long should you scrub with soap?',
        right: { value: 'About 20 seconds' },
        wrong: [{ value: 'About 2 seconds' }, { value: 'About 2 hours' }],
        hint: 'About as long as singing “Happy Birthday” twice.',
        explain: ['A quick rub doesn’t lift all the germs.', '“Happy Birthday” twice takes about 20 seconds.', 'So scrub for about 20 seconds.'],
      });
    return choiceQuestion({
      prompt: 'You scrubbed with soap. What comes next?',
      right: { value: 'Rinse with water' },
      wrong: [{ value: 'Eat a snack' }, { value: 'Put on more soap' }],
      hint: 'Where do the soapy bubbles and germs need to go?',
      explain: ['Wet, soap, scrub…', 'Next the soap and germs wash down the drain.', 'So: rinse with water.'],
    });
  }
  const kind = pick(['first', 'why', 'need'] as const);
  if (kind === 'first')
    return choiceQuestion({
      prompt: 'What is the first step of washing hands?',
      right: { value: 'Wet your hands' },
      wrong: shuffle(['Dry with a towel', 'Rinse the soap off', 'Scrub for 20 seconds']).slice(0, 2).map((v) => ({ value: v })),
      hint: 'The soap works best when hands are already…',
      explain: ['The steps are: wet, soap, scrub, rinse, dry.', 'Water first helps the soap make bubbles.', 'So first: wet your hands.'],
    });
  if (kind === 'why')
    return choiceQuestion({
      prompt: 'Why do we use soap?',
      right: { value: 'It helps lift germs off our skin' },
      wrong: [{ value: 'It makes our hands a new colour' }, { value: 'It makes our hands bigger' }],
      hint: 'Water alone doesn’t wash germs off well.',
      explain: ['Germs stick to our skin.', 'Soap grabs them so water can rinse them away.', 'So: it helps lift germs off our skin.'],
    });
  const w = pick(WHEN);
  return choiceQuestion({
    prompt: 'Which time is important for washing your hands?',
    right: pic(w.text, w.emoji),
    wrong: [pic('While watching the clouds', '☁️'), pic('While listening to music', '🎵')],
    hint: 'When could germs get on your hands, or into your mouth?',
    explain: ['Germs get on hands from toilets, sneezes, outdoors and pets.', 'They can get into our mouths when we eat.', `So: ${w.text.toLowerCase()}.`],
  });
}

export const washYourHands: Lesson = {
  id: 'wash-your-hands',
  title: 'Wash Away Germs',
  Thumb,
  Scene: WashScene,
  sceneHint: 'Wet · soap · scrub 20 seconds · rinse · dry',
  learn: {
    heading: 'Washing away germs',
    intro: 'Germs are so tiny we can’t see them, and some can make us poorly. Washing with soap and water for about 20 seconds washes them away.',
    points: [
      { icon: Droplets, text: 'Wet, soap, scrub, rinse, dry.' },
      { icon: Clock, text: 'Scrub for about 20 seconds: “Happy Birthday” twice.' },
      { icon: Utensils, text: 'Wash before eating and after the toilet.' },
      { icon: Sparkles, text: 'Don’t forget thumbs, fingertips and between fingers!' },
    ],
  },
  steps: ['Wet your hands with water.', 'Rub on some soap.', 'Scrub everywhere for about 20 seconds.', 'Rinse the soap off.', 'Dry with a clean towel.'],
  example: {
    question: 'You just played in the garden and now it’s snack time. What do you do?',
    visual: <EmojiPicture e="🧼" caption="Wash first" />,
    work: ['Playing outside puts germs on hands.', 'Food goes near our mouths.'],
    answer: 'Wash your hands with soap and water before your snack.',
  },
  grownups: [
    'Make it a routine: before meals, after the toilet, after playing outside and after touching pets.',
    'Sing together to time 20 seconds. Children copy what they see you do.',
    'Remind them about thumbs, fingertips and the backs of hands.',
    'The dots in the game are pretend: real germs are far too small to see, which is why we wash even when hands look clean.',
  ],
  makeQuestion,
};
