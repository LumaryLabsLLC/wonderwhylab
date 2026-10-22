import { useState } from 'react';
import { HeartHandshake, Lightbulb, Thermometer, Wind } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Face } from '../shared/Face';
import type { FaceParts } from '../shared/Face';
import { Card, Emoji, EmojiLabel, EmojiRow, Lines, Note, Tap } from '../shared/kit';

interface Level {
  name: string;
  colour: string;
  face: FaceParts;
}

/** The feelings thermometer, from 1 (calm) to 5 (huge feelings). */
const LEVELS: Level[] = [
  { name: 'Calm', colour: C.green, face: { brows: 'relaxed', eyes: 'open', mouth: 'gentle' } },
  { name: 'A bit wobbly', colour: '#a5c94a', face: { brows: 'worried', eyes: 'open', mouth: 'flat' } },
  { name: 'Frustrated', colour: C.yellow, face: { brows: 'cross', eyes: 'open', mouth: 'flat' } },
  { name: 'Very upset', colour: C.orange, face: { brows: 'cross', eyes: 'narrow', mouth: 'frown' } },
  { name: 'Huge feelings', colour: C.red, face: { brows: 'cross', eyes: 'narrow', mouth: 'wobbly' } },
];

const SITUATIONS = [
  { emoji: '🧱', text: 'My tower got knocked over', level: 4, ideas: 'ask them to be careful, build it again together, or build somewhere safer.' },
  { emoji: '🎲', text: 'I lost a game', level: 3, ideas: 'say “good game”, have another go, or choose a new game together.' },
  { emoji: '🏠', text: 'My friend can’t play today', level: 2, ideas: 'plan another day, ask someone else, or find something fun to do on your own.' },
];

type StrategyId = 'breathe' | 'count' | 'break' | 'talk' | 'squeeze' | 'solve';
const STRATEGIES: { id: StrategyId; emoji: string; text: string; says: string }[] = [
  { id: 'breathe', emoji: '🌬️', text: 'Slow breaths', says: '' },
  { id: 'count', emoji: '🔢', text: 'Count to 10 slowly', says: 'Counting slowly gives your body time to settle.' },
  { id: 'break', emoji: '🛋️', text: 'Take a calm break', says: 'A few quiet minutes in a cosy spot helps big feelings shrink.' },
  { id: 'talk', emoji: '🫂', text: 'Talk to someone you trust', says: 'Telling a trusted grown-up or friend how you feel makes it easier to carry.' },
  { id: 'squeeze', emoji: '✊', text: 'Squeeze, then let go', says: 'Squeeze your hands tight, count to 5, then let go. Your muscles relax.' },
  { id: 'solve', emoji: '🧩', text: 'Solve the problem', says: '' },
];

/** Thermometer geometry: level 5 sits at TOP, each level one STEP lower. */
const TOP = 170;
const STEP = 84;
const yOf = (level: number) => TOP + (5 - level) * STEP;
const TUBE = { x: 92, w: 48, y: 140, bottom: 540 };

function FeelingsScene() {
  const [level, setLevel] = useState(4);
  const [sit, setSit] = useState(0);
  const [breaths, setBreaths] = useState<{ n: number; inhale: boolean } | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' }>({
    text: 'All feelings are OK. Drag the thermometer to show how big the feeling is, then try a calming idea.',
    tone: 'info',
  });
  const lv = LEVELS[level - 1];

  const setTo = (l: number) => {
    const next = Math.max(1, Math.min(5, l));
    if (next === level) return;
    play('tap');
    setLevel(next);
    setBreaths(null);
    setNote({
      text: `${LEVELS[next - 1].name}. That’s OK. ${next >= 3 ? 'Try a calming idea to help it shrink.' : 'You can think clearly at this level.'}`,
      tone: 'info',
    });
  };
  const drag = useSvgDrag((p) => setTo(5 - Math.round((p.y - TOP) / STEP)));

  const cooled = (says: string) => {
    const next = Math.max(1, level - 1);
    setLevel(next);
    play(next === 1 ? 'correct' : 'pop');
    setNote({
      text: next === 1 ? `${says} You’re calm now, so your thinking brain is ready. Try “Solve the problem”.` : `${says} The feeling went down to “${LEVELS[next - 1].name}”.`,
      tone: next === 1 ? 'good' : 'info',
    });
  };

  const tryIdea = (id: StrategyId) => {
    const s = STRATEGIES.find((t) => t.id === id)!;
    if (id === 'breathe') {
      setBreaths({ n: 0, inhale: true });
      setNote({ text: 'Tap the circle to breathe in slowly, then tap again to breathe out. Three slow breaths.', tone: 'info' });
      return;
    }
    setBreaths(null);
    if (id === 'solve') {
      if (level >= 3) {
        setNote({ text: 'When feelings are this big, it is hard to think clearly. Calm your body first, then come back to the problem.', tone: 'nudge' });
        return;
      }
      play('correct');
      setLevel(1);
      setNote({ text: `Calm enough to think! You could ${SITUATIONS[sit].ideas}`, tone: 'good' });
      return;
    }
    if (level === 1) {
      setNote({ text: `You’re already calm. ${s.says}`, tone: 'info' });
      return;
    }
    cooled(s.says);
  };

  const breathe = () => {
    if (!breaths) return;
    if (breaths.inhale) {
      setBreaths({ ...breaths, inhale: false });
      return;
    }
    const n = breaths.n + 1;
    if (n < 3) {
      setBreaths({ n, inhale: true });
      return;
    }
    setBreaths(null);
    if (level === 1) setNote({ text: 'Three slow breaths. Lovely and calm.', tone: 'good' });
    else cooled('Three slow breaths.');
  };

  const mercuryTop = yOf(level);

  return (
    <SceneSvg label="Feelings thermometer with calming ideas">
      {SITUATIONS.map((s, i) => {
        const x = 40 + i * 310;
        const on = i === sit;
        return (
          <Tap
            key={s.text}
            label={s.text}
            onTap={() => {
              play('tap');
              setSit(i);
              setLevel(s.level);
              setBreaths(null);
              setNote({ text: `“${s.text}.” That can feel like “${LEVELS[s.level - 1].name}”. It’s OK to feel this way.`, tone: 'info' });
            }}
          >
            <Card x={x} y={18} w={296} h={64} fill={on ? shade(C.yellow, 0.65) : C.card} stroke={on ? C.orange : C.ink}>
              <Emoji e={s.emoji} x={x + 36} y={50} size={32} />
              <text x={x + 66} y={56} fontSize={16} fontWeight={600} fill={C.ink}>
                {s.text}
              </text>
            </Card>
          </Tap>
        );
      })}

      {/* Thermometer: drag the tube, or tap a level name. */}
      <g {...drag} role="slider" aria-label="Feelings thermometer" aria-valuemin={1} aria-valuemax={5} aria-valuenow={level} aria-valuetext={lv.name}>
        <rect x={TUBE.x - 30} y={TUBE.y - 20} width={TUBE.w + 60} height={TUBE.bottom - TUBE.y + 110} fill="transparent" />
        <rect x={TUBE.x} y={TUBE.y} width={TUBE.w} height={TUBE.bottom - TUBE.y + 20} rx={TUBE.w / 2} fill={C.card} stroke={C.ink} strokeWidth={3} />
        <rect x={TUBE.x + 10} y={mercuryTop} width={TUBE.w - 20} height={TUBE.bottom + 20 - mercuryTop} rx={(TUBE.w - 20) / 2} fill={lv.colour} />
        <circle cx={TUBE.x + TUBE.w / 2} cy={TUBE.bottom + 44} r={42} fill={lv.colour} stroke={C.ink} strokeWidth={3} />
        <circle cx={TUBE.x + TUBE.w / 2} cy={mercuryTop} r={22} fill={C.card} stroke={C.ink} strokeWidth={3} />
      </g>
      {LEVELS.map((l, i) => {
        const y = yOf(i + 1);
        const on = i + 1 === level;
        return (
          <Tap key={l.name} label={`Feeling level: ${l.name}`} onTap={() => setTo(i + 1)}>
            <rect x={156} y={y - 26} width={150} height={52} rx={12} fill={on ? shade(l.colour, 0.6) : 'transparent'} stroke={on ? C.ink : 'none'} strokeWidth={1.5} />
            <circle cx={174} cy={y} r={8} fill={l.colour} stroke={C.ink} strokeWidth={1.5} />
            <text x={190} y={y + 6} fontSize={16} fontWeight={on ? 700 : 400} fill={C.ink}>
              {l.name}
            </text>
          </Tap>
        );
      })}

      {/* The face shows the feeling. */}
      <Face cx={445} cy={210} r={92} parts={lv.face} />
      <text x={445} y={338} textAnchor="middle" fontSize={24} fontWeight={800} fill={C.ink}>
        {lv.name}
      </text>
      <text x={445} y={364} textAnchor="middle" fontSize={16} fill={C.ink2}>
        All feelings are OK.
      </text>

      {breaths ? (
        <Tap label={breaths.inhale ? 'Breathe in' : 'Breathe out'} onTap={breathe}>
          <circle cx={445} cy={490} r={breaths.inhale ? 62 : 88} fill={shade(C.blue, 0.75)} stroke={C.blue} strokeWidth={3} style={{ transition: 'r 1.2s ease' }} />
          <text x={445} y={496} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
            {breaths.inhale ? 'Breathe in…' : 'Breathe out…'}
          </text>
          <text x={445} y={600} textAnchor="middle" fontSize={16} fill={C.ink2}>
            Breath {breaths.n + 1} of 3
          </text>
        </Tap>
      ) : (
        <SvgButton x={375} y={400} w={140} h={50} fontSize={16} label="Say it" onClick={() => speak(`I feel ${lv.name.toLowerCase()}. That's OK.`, { force: true })} />
      )}

      {/* Calming ideas */}
      <text x={592} y={114} fontSize={15} fill={C.muted} className="caps">
        Try an idea
      </text>
      {STRATEGIES.map((s, i) => {
        const x = 592 + (i % 2) * 188;
        const y = 126 + Math.floor(i / 2) * 98;
        const solve = s.id === 'solve';
        return (
          <Tap key={s.id} label={s.text} onTap={() => tryIdea(s.id)}>
            <Card x={x} y={y} w={178} h={88} fill={solve ? shade(C.blue, 0.85) : C.card}>
              <Emoji e={s.emoji} x={x + 32} y={y + 44} size={32} />
              <Lines text={s.text} x={x + 60} y={s.text.length > 14 ? y + 38 : y + 50} max={14} size={16} lh={20} weight={600} />
            </Card>
          </Tap>
        );
      })}
      <Note x={592} y={430} w={368} text={note.text} tone={note.tone} />

      <Callout at={[TUBE.x + TUBE.w / 2, TUBE.bottom + 44]} box={[180, 600]} w={240} icon={Thermometer} title="Feelings go up and down" text="Even huge feelings come back down. Calming ideas help them shrink faster." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={14} y={8} width={16} height={56} rx={8} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <rect x={18} y={30} width={8} height={36} rx={4} fill={C.orange} />
      <circle cx={22} cy={68} r={10} fill={C.orange} stroke={C.ink} strokeWidth={2} />
      <Face cx={78} cy={40} r={30} parts={LEVELS[0].face} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.65) {
      const right = pick([
        { e: '🌬️', t: 'Take slow breaths' },
        { e: '🔢', t: 'Count to 10 slowly' },
        { e: '✊', t: 'Squeeze, then let go' },
      ]);
      const wrong = shuffle([
        { e: '📣', t: 'Shout at someone' },
        { e: '🥾', t: 'Kick the door' },
        { e: '🚪', t: 'Slam the door' },
        { e: '🙊', t: 'Hide it and say nothing' },
      ]).slice(0, 2);
      return choiceQuestion({
        prompt: 'Your feelings are getting big. Which idea helps your body calm down?',
        visual: <EmojiRow items={['😤', '🌡️']} label="Big feelings rising" />,
        right: { value: right.t, label: <EmojiLabel e={right.e} text={right.t} />, name: right.t },
        wrong: wrong.map((w) => ({ value: w.t, label: <EmojiLabel e={w.e} text={w.t} />, name: w.t })),
        hint: 'Look for the idea that is gentle on you and on other people.',
        explain: ['Calming ideas slow your body down without hurting anyone.', `“${right.t}” does that.`, 'Then, when you feel calmer, you can sort out the problem.'],
      });
    }
    return choiceQuestion({
      prompt: 'Is it OK to feel angry sometimes?',
      visual: <EmojiRow items={['😠', '👍']} label="An angry face and a thumbs up" />,
      right: { value: 'Yes', name: 'Yes, all feelings are OK' },
      wrong: [{ value: 'No' }],
      hint: 'Think about whether feelings themselves are ever wrong.',
      explain: ['Everyone feels angry sometimes.', 'Yes: all feelings are OK, even big ones.', 'What matters is choosing a safe way to handle them.'],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.5) {
      return choiceQuestion({
        prompt: 'Your feelings are right at the top of the thermometer. What is a good first step?',
        visual: <EmojiRow items={['🌡️', '😣']} label="Feelings at the top of the thermometer" />,
        right: { value: 'Calm your body first' },
        wrong: [{ value: 'Solve the problem right now' }, { value: 'Pretend nothing happened' }],
        hint: 'Is it easy to think clearly when a feeling is huge?',
        explain: ['Huge feelings make it hard to think clearly.', 'So the first step is to calm your body first, with breaths or a break.', 'Then you can work out the problem.'],
      });
    }
    const c = pick([
      { situation: 'You feel worried about a spelling test tomorrow.', right: 'Tell a grown-up you trust', e: '🫂', wrong: ['Keep the worry all inside', 'Stay up late worrying'] },
      { situation: 'You feel sad because your friend moved away.', right: 'Talk about it with someone you trust', e: '🫂', wrong: ['Never think about it', 'Stop making new friends'] },
      { situation: 'You feel frustrated because your drawing went wrong.', right: 'Take a calm break, then try again', e: '🛋️', wrong: ['Rip up all your drawings', 'Never draw again'] },
    ]);
    return choiceQuestion({
      prompt: `${c.situation} Which idea could help?`,
      right: { value: c.right, label: <EmojiLabel e={c.e} text={c.right} />, name: c.right },
      wrong: c.wrong.map((w) => ({ value: w })),
      hint: 'Choose the idea that would help you feel a little better and keep you safe.',
      explain: ['It’s OK to have this feeling.', `“${c.right}” helps the feeling get smaller.`, 'Holding it in or giving up usually makes it last longer.'],
    });
  }

  const kind = pick(['order', 'message', 'solve'] as const);
  if (kind === 'order') {
    return choiceQuestion({
      prompt: 'Which is the best order for handling a big feeling?',
      right: { value: 'Notice it → calm down → solve the problem' },
      wrong: [{ value: 'Solve the problem → calm down → notice it' }, { value: 'Calm down → solve the problem → notice it' }],
      hint: 'You need to know a feeling is there before you can calm it.',
      explain: ['First, notice and name the feeling.', 'Next, calm your body so you can think.', 'So the order is: notice it → calm down → solve the problem.'],
    });
  }
  if (kind === 'message') {
    const c = pick([
      { what: 'Your friend took your pencil without asking.', right: 'I feel annoyed when you take my pencil. Please ask first.', wrong: ['You always ruin everything!', 'Fine. I don’t care.'] },
      { what: 'Someone keeps interrupting you.', right: 'I feel frustrated when I get interrupted. Can I finish?', wrong: ['Be quiet, you’re so annoying!', 'Never mind, forget it.'] },
    ]);
    return choiceQuestion({
      prompt: `${c.what} Which is a calm, clear way to say how you feel?`,
      right: { value: c.right },
      wrong: c.wrong.map((w) => ({ value: w })),
      hint: 'Look for one that says “I feel…” and asks for what you need.',
      explain: ['An “I feel…” message says your feeling without blaming.', 'It also asks for what you need.', `So: “${c.right}”`],
    });
  }
  const c = pick([
    { what: 'Your little cousin knocked your tower over by accident. You’re calm now.', right: 'Build it again together', wrong: ['Knock their things over too', 'Never build again'] },
    { what: 'You and a friend both want the same swing. You’re calm now.', right: 'Take turns, using a timer', wrong: ['Grab it and run', 'Go home without saying anything'] },
  ]);
  return choiceQuestion({
    prompt: `${c.what} What is a good way to solve the problem?`,
    right: { value: c.right },
    wrong: c.wrong.map((w) => ({ value: w })),
    hint: 'A good solution is safe and fair for everyone.',
    explain: ['Think of a few ideas, then pick one that is safe and fair.', `“${c.right}” works for both of you.`],
  });
}

export const bigFeelings: Lesson = {
  id: 'big-feelings',
  title: 'Handling Big Feelings',
  Thumb,
  Scene: FeelingsScene,
  sceneHint: 'Drag the thermometer · Try calming ideas until the feeling shrinks',
  learn: {
    heading: 'Big feelings go up and come down',
    intro: 'Everyone has big feelings sometimes. They are all OK. A feelings thermometer helps you notice how big a feeling is and choose something that helps.',
    points: [
      { icon: Thermometer, text: 'Notice it: how big is the feeling, from calm to huge?' },
      { icon: Wind, text: 'Calm your body: slow breaths, counting, a break, squeeze and let go.' },
      { icon: HeartHandshake, text: 'Talk to someone you trust. You don’t have to handle it alone.' },
      { icon: Lightbulb, text: 'When you are calmer, solve the problem.' },
    ],
  },
  steps: ['Notice the feeling and give it a name.', 'Check the thermometer: how big is it?', 'Try a calming idea, or two, until it shrinks.', 'When you feel calmer, think of a safe and fair way to solve the problem.'],
  example: {
    question: 'You lost a game and your face feels hot. What could you do?',
    visual: <EmojiRow items={['🎲', '😤']} label="A lost game and a cross face" />,
    work: ['Notice it: “I feel frustrated.”', 'Calm down: three slow breaths.', 'Solve it: say “good game” and ask to play again.'],
    answer: 'Notice it, calm down, then solve the problem.',
  },
  grownups: [
    'Name your own feelings out loud (“I’m feeling frustrated, so I’m going to take a few breaths”). Children learn most from what they see.',
    'Practise calming ideas when your child is already calm, so they are easy to reach for later.',
    'Problem-solving works best after calming down. In the middle of a big feeling, comfort first and talk later.',
    'If big feelings often seem overwhelming, it is always fine to talk with your child’s teacher or doctor.',
  ],
  makeQuestion,
};
