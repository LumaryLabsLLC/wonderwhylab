import { useEffect, useRef, useState } from 'react';
import { Hand, HeartHandshake, Timer, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, Emoji, EmojiLabel, EmojiPicture, Lines, Note, Tap } from '../shared/kit';

const IN_S = 4;
const OUT_S = 4;
const MIN = 0.45;
const MAX = 1;

const TOOLS = [
  { id: 'balloon', emoji: '🎈', title: 'Balloon breathing', how: 'Breathe in slowly through your nose for 4, then out through your mouth for 4, like letting air out of a balloon.' },
  { id: 'count', emoji: '🔢', title: 'Count to ten', how: 'Count slowly from 1 to 10 in your head. Big feelings get smaller while you count.' },
  { id: 'squeeze', emoji: '✊', title: 'Squeeze and let go', how: 'Squeeze your hands into tight fists, count to 3, then let them go floppy. Feel the difference!' },
  { id: 'grownup', emoji: '🤗', title: 'Ask for help', how: 'Find a grown-up you trust and tell them how you feel. Talking helps.' },
] as const;

function Balloon({ cx, cy, s, color }: { cx: number; cy: number; s: number; color: string }) {
  const rx = 130 * s;
  const ry = 150 * s;
  return (
    <g>
      <path d={`M${cx},${cy + ry} q-12,40 6,80 q14,32 -4,70`} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} stroke={C.ink} strokeWidth={3} />
      <path d={`M${cx - 10},${cy + ry - 2} l10,16 l10,-16 z`} fill={shade(color, -0.2)} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={cx - rx * 0.4} cy={cy - ry * 0.45} rx={rx * 0.16} ry={ry * 0.24} fill="white" opacity={0.55} />
    </g>
  );
}

type Mode = 'idle' | 'guided' | 'hold';

function BreathingScene() {
  const [size, setSize] = useState(MIN);
  const [mode, setMode] = useState<Mode>('idle');
  const [phase, setPhase] = useState<'in' | 'out' | null>(null);
  const [count, setCount] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const [tool, setTool] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const raf = useRef(0);
  const holding = useRef(false);
  const holdStart = useRef(0);
  const sizeRef = useRef(MIN);
  sizeRef.current = size;

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    setMode('idle');
    setPhase(null);
  };

  /** Breathe with me: 3 slow breaths, in for 4 and out for 4. */
  const guided = () => {
    cancelAnimationFrame(raf.current);
    setMode('guided');
    setBreaths(0);
    setMessage(null);
    const t0 = performance.now();
    const cycle = IN_S + OUT_S;
    const total = cycle * 3;
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      if (t >= total) {
        setSize(MIN);
        setPhase(null);
        setMode('idle');
        setBreaths(3);
        setMessage('Well done! Notice how your body feels now: slower and calmer.');
        play('correct');
        return;
      }
      const c = t % cycle;
      if (c < IN_S) {
        setPhase('in');
        setCount(Math.floor(c) + 1);
        setSize(MIN + (MAX - MIN) * (c / IN_S));
      } else {
        setPhase('out');
        setCount(Math.floor(c - IN_S) + 1);
        setSize(MAX - (MAX - MIN) * ((c - IN_S) / OUT_S));
      }
      setBreaths(Math.floor(t / cycle));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  /** Hold the balloon to breathe in; let go to breathe out. */
  const holdDown = () => {
    if (mode === 'guided') return;
    cancelAnimationFrame(raf.current);
    setMode('hold');
    setMessage(null);
    holding.current = true;
    holdStart.current = performance.now();
    const from = sizeRef.current;
    const step = (now: number) => {
      const t = (now - holdStart.current) / 1000;
      setPhase('in');
      setCount(Math.min(IN_S, Math.floor(t) + 1));
      setSize(Math.min(MAX, from + (MAX - MIN) * (t / IN_S)));
      if (holding.current) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const holdUp = () => {
    if (!holding.current) return;
    holding.current = false;
    cancelAnimationFrame(raf.current);
    const held = (performance.now() - holdStart.current) / 1000;
    const from = sizeRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      setPhase('out');
      setCount(Math.min(OUT_S, Math.floor(t) + 1));
      const s = from - (MAX - MIN) * (t / OUT_S);
      if (s <= MIN) {
        setSize(MIN);
        setPhase(null);
        setMode('idle');
        if (held >= 2) {
          setBreaths((b) => b + 1);
          setMessage(held >= 3.5 ? 'Lovely slow breath!' : 'Good! Try holding a little longer, to count 4.');
        } else {
          setMessage('That was quick. Hold the balloon while you breathe in slowly: 1, 2, 3, 4.');
        }
        return;
      }
      setSize(s);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const t = TOOLS.find((x) => x.id === tool);

  return (
    <SceneSvg label="A balloon that grows as you breathe in and shrinks as you breathe out">
      <circle cx={300} cy={300} r={230} fill={shade(C.blue, 0.88)} />
      <g
        onPointerDown={(e) => {
          (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
          holdDown();
        }}
        onPointerUp={holdUp}
        onPointerCancel={holdUp}
        style={{ cursor: 'pointer', touchAction: 'none' }}
        data-nopan
        role="button"
        aria-label="Hold to breathe in, let go to breathe out"
      >
        <rect x={120} y={80} width={360} height={440} fill="transparent" />
        <Balloon cx={300} cy={260} s={size} color={C.pink} />
      </g>
      <text x={300} y={588} textAnchor="middle" fontSize={30} fontWeight={700} fill={C.ink}>
        {phase === 'in' ? `Breathe in… ${count}` : phase === 'out' ? `Breathe out… ${count}` : 'Hold the balloon to breathe in'}
      </text>
      <text x={300} y={624} textAnchor="middle" fontSize={17} fill={C.muted}>
        {mode === 'guided' ? 'Follow the balloon' : 'Let go to breathe out slowly'} · Breaths: {breaths}
      </text>

      <SvgButton x={580} y={60} w={180} h={54} fontSize={18} label={mode === 'guided' ? 'Stop' : 'Breathe with me'} color={C.teal} textColor={C.white} onClick={mode === 'guided' ? stop : guided} />
      <SvgButton x={776} y={60} w={180} h={54} fontSize={18} label="Say it" onClick={() => speak('Breathe in slowly through your nose, 1, 2, 3, 4. Now breathe out slowly, 1, 2, 3, 4.', { force: true })} />

      <text x={580} y={156} fontSize={15} fill={C.muted} className="caps">
        Calm-down toolbox
      </text>
      {TOOLS.map((x, i) => {
        const bx = 580 + (i % 2) * 192;
        const by = 170 + Math.floor(i / 2) * 118;
        const on = tool === x.id;
        return (
          <Tap key={x.id} label={x.title} onTap={() => { play('tap'); setTool(on ? null : x.id); }}>
            <Card x={bx} y={by} w={180} h={104} fill={on ? shade(C.yellow, 0.7) : C.card}>
              <Emoji e={x.emoji} x={bx + 90} y={by + 38} size={40} />
              <Lines text={x.title} x={bx + 90} y={by + 84} max={20} size={16} anchor="middle" weight={600} />
            </Card>
          </Tap>
        );
      })}
      {t ? (
        <Card x={580} y={420} w={372} h={150} fill={shade(C.yellow, 0.82)}>
          <text x={598} y={450} fontSize={18} fontWeight={700} fill={C.ink}>
            {t.emoji} {t.title}
          </text>
          <Lines text={t.how} x={598} y={480} max={40} size={16} lh={22} />
        </Card>
      ) : (
        message && <Note x={580} y={420} w={372} text={message} tone="good" />
      )}

      <Callout at={[300, 170]} box={[20, 20]} w={220} icon={Wind} title="In through your nose" text="Breathing in slowly fills you up like a balloon." />
      <Callout at={[700, 222]} box={[620, 600]} w={300} icon={HeartHandshake} title="Many ways to calm" text="Pick the tool that helps you most." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={34} rx={24} ry={28} fill={C.pink} stroke={C.ink} strokeWidth={2} />
      <path d="M60,62 q-4,8 2,16" fill="none" stroke={C.ink} strokeWidth={1.5} />
      <path d="M18,40 h14 M88,40 h14" stroke={C.blue} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

const CALM = [
  { value: 'Slow, deep breaths', emoji: '🎈' },
  { value: 'Counting to ten', emoji: '🔢' },
  { value: 'Telling a grown-up you trust', emoji: '🤗' },
];
const NOT_CALM = [
  { value: 'Shouting very loudly', emoji: '📢' },
  { value: 'Kicking the door', emoji: '🚪' },
  { value: 'Throwing your toys', emoji: '🧸' },
];
const pic = (c: { value: string; emoji: string }) => ({ value: c.value, name: c.value, label: <EmojiLabel e={c.emoji} text={c.value} /> });

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5) {
      const good = pick(CALM);
      return choiceQuestion({
        prompt: 'Which one helps you feel calm?',
        right: pic(good),
        wrong: [pic(pick(NOT_CALM))],
        hint: 'Calm choices make your body slow down and keep everyone safe.',
        explain: ['Big feelings make our body feel fast and busy.', 'Calm choices slow our body down.', `${good.value} helps you feel calm.`],
      });
    }
    return choiceQuestion({
      prompt: 'When you breathe in, the balloon gets…',
      visual: <EmojiPicture e="🎈" />,
      right: { value: 'bigger' },
      wrong: [{ value: 'smaller' }],
      hint: 'Think about blowing air into a balloon.',
      explain: ['Breathing in fills your body with air.', 'More air makes the balloon grow.', 'So it gets bigger.'],
    });
  }
  if (level === 1) {
    const kind = pick(['count', 'next', 'nose'] as const);
    if (kind === 'count')
      return choiceQuestion({
        prompt: 'In balloon breathing, we breathe in slowly for how many counts?',
        right: { value: '4' },
        wrong: [{ value: '1' }, { value: '20' }],
        hint: 'Slow, but not too long. Count on your fingers with the balloon.',
        explain: ['Breathe in: 1, 2, 3, 4.', 'Then breathe out: 1, 2, 3, 4.', 'So we breathe in for 4 counts.'],
      });
    if (kind === 'next')
      return choiceQuestion({
        prompt: 'You breathed in slowly. What do you do next?',
        right: { value: 'Breathe out slowly' },
        wrong: [{ value: 'Hold your breath for a long time' }, { value: 'Breathe in again very fast' }],
        hint: 'What does a balloon do when you let the air go?',
        explain: ['First we breathe in slowly.', 'Then we let the air out, like a balloon getting smaller.', 'Next: breathe out slowly.'],
      });
    return choiceQuestion({
      prompt: 'For balloon breathing, you breathe in through your…',
      right: { value: 'nose' },
      wrong: [{ value: 'ears' }, { value: 'elbows' }],
      hint: 'Which part of your face can you smell with?',
      explain: ['We breathe in gently through the nose.', 'Then we breathe out through the mouth.', 'So: in through your nose.'],
    });
  }
  const scenarios = [
    { text: 'Sam feels so angry his face feels hot. What could he try first?', right: 'Take slow balloon breaths', hint: 'Which idea helps his body slow down?' },
    { text: 'Lena feels scared at night and can’t sleep. Who could help?', right: 'A grown-up she trusts', hint: 'Who keeps children safe and listens?' },
    { text: 'Ali felt upset but now feels calmer. What could he do now?', right: 'Talk about how he felt', hint: 'When we feel calm, it’s a good time to share.' },
  ];
  const s = pick(scenarios);
  const wrongPool = ['Shout at someone', 'Throw things', 'Keep it a secret forever', 'Run away from everyone'];
  return choiceQuestion({
    prompt: s.text,
    right: { value: s.right },
    wrong: shuffle(wrongPool).slice(0, 2).map((v) => ({ value: v })),
    hint: s.hint,
    explain: ['All feelings are OK, even big ones.', 'Safe, calm choices help and don’t hurt anyone.', `A good choice: ${s.right}.`],
  });
}

export const calmBreathing: Lesson = {
  id: 'calm-breathing',
  title: 'Balloon Breathing',
  Thumb,
  Scene: BreathingScene,
  sceneHint: 'Hold the balloon to breathe in · Let go to breathe out',
  learn: {
    heading: 'Calming big feelings',
    intro: 'When feelings get really big, our heart beats fast and our body feels busy. Slow breathing tells our body it is safe to calm down.',
    points: [
      { icon: Wind, text: 'Breathe in through your nose for 4, out through your mouth for 4.' },
      { icon: Timer, text: 'Counting slowly to ten helps too.' },
      { icon: Hand, text: 'Squeeze your fists tight, then let them go floppy.' },
      { icon: HeartHandshake, text: 'You can always ask a grown-up you trust for help.' },
    ],
  },
  steps: [
    'Notice the big feeling. Say “I feel…”.',
    'Breathe in slowly through your nose: 1, 2, 3, 4.',
    'Breathe out slowly through your mouth: 1, 2, 3, 4.',
    'Do it three times, then see how your body feels.',
  ],
  example: {
    question: 'Maya feels cross because her drawing ripped. What could she do?',
    visual: <EmojiPicture e="🎈" caption="Balloon breathing" />,
    work: ['Maya says: “I feel cross.”', 'She breathes in for 4 and out for 4, three times.', 'Then she asks a grown-up for some tape.'],
    answer: 'Slow balloon breaths help her calm down, then she can fix the problem.',
  },
  grownups: [
    'Practise breathing when your child is already calm, so it is easy to use when feelings are big.',
    'Breathe together: children copy the pace of the grown-up beside them.',
    'Keep the toolbox visible: a card with four pictures by the fridge works well.',
    'If worries or anger often feel overwhelming, it’s fine to ask a teacher, school counsellor or doctor for support.',
  ],
  makeQuestion,
};
