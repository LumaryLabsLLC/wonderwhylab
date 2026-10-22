import { useState } from 'react';
import { HeartHandshake, MessageCircle, Scale, ShieldCheck } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Face, FEELING_FACE } from '../shared/Face';
import type { Feeling } from '../shared/Face';
import { Card, DragItem, Emoji, EmojiRow, inside, Lines, Note, Tap } from '../shared/kit';
import type { Box } from '../shared/kit';

interface Idea {
  text: string;
  fair: boolean;
  why: string;
}

interface Problem {
  text: string;
  emoji: string;
  /** How the two friends might feel before they solve it. */
  feel: [Feeling, Feeling];
  ideas: Idea[];
}

const PROBLEMS: Problem[] = [
  {
    text: 'You and Sam both want to go down the slide first.',
    emoji: '🛝',
    feel: ['sad', 'angry'],
    ideas: [
      { text: 'Take turns: Sam goes first, then you', fair: true, why: 'Taking turns means you both get a go.' },
      { text: 'Play rock, paper, scissors to pick who starts', fair: true, why: 'A fair game decides who starts, and you both still get a turn.' },
      { text: 'Push Sam out of the way', fair: false, why: 'Pushing can hurt someone. It isn’t safe or kind.' },
      { text: 'Shout “Me first!” and block the ladder', fair: false, why: 'Shouting and blocking make the problem bigger, not smaller.' },
    ],
  },
  {
    text: 'Mia wants to join your game, but it has already started.',
    emoji: '🎲',
    feel: ['sad', 'calm'],
    ideas: [
      { text: 'Say “Come and play with us!”', fair: true, why: 'Including others helps everyone feel welcome.' },
      { text: 'Explain the rules to Mia', fair: true, why: 'Helping Mia learn the game is kind.' },
      { text: 'Tell Mia to go away', fair: false, why: 'Leaving someone out hurts their feelings.' },
      { text: 'Pretend you didn’t hear her', fair: false, why: 'Ignoring someone can make them feel lonely.' },
    ],
  },
  {
    text: 'You want to play tag, but your friend wants to play blocks.',
    emoji: '🧱',
    feel: ['sad', 'angry'],
    ideas: [
      { text: 'Play one game first, then the other', fair: true, why: 'You each get to play the game you like.' },
      { text: 'Find a game you both like', fair: true, why: 'Choosing together is fair to both of you.' },
      { text: 'Only ever play your game', fair: false, why: 'That isn’t fair. Your friend’s ideas matter too.' },
      { text: 'Stomp off and stop being friends', fair: false, why: 'Friends can disagree and still work it out.' },
    ],
  },
  {
    text: 'Your friend knocked over your tower by accident.',
    emoji: '💥',
    feel: ['sad', 'scared'],
    ideas: [
      { text: 'Say “I feel upset. Can you help me fix it?”', fair: true, why: 'An “I feel” sentence says how you feel without hurting anyone.' },
      { text: 'Build it again together', fair: true, why: 'Fixing it together turns a problem into teamwork.' },
      { text: 'Knock over their tower too', fair: false, why: 'Getting back at someone makes two sad friends.' },
      { text: 'Call them names', fair: false, why: 'Unkind words hurt, even when we are upset.' },
    ],
  },
  {
    text: 'There is one big cookie and two of you.',
    emoji: '🍪',
    feel: ['angry', 'sad'],
    ideas: [
      { text: 'Break it in half and share', fair: true, why: 'Sharing equally is fair to both.' },
      { text: 'One person breaks it, the other picks first', fair: true, why: 'This way, both halves end up fair.' },
      { text: 'Grab it and run', fair: false, why: 'Grabbing isn’t fair to your friend.' },
      { text: 'Eat it all in front of them', fair: false, why: 'That leaves your friend out and feeling sad.' },
    ],
  },
  {
    text: 'Someone keeps being unkind to your friend, even after you said “Stop”.',
    emoji: '🛑',
    feel: ['sad', 'scared'],
    ideas: [
      { text: 'Tell a grown-up you trust', fair: true, why: 'When someone keeps being unkind or unsafe, a grown-up can help.' },
      { text: 'Stay with your friend and walk away together', fair: true, why: 'Sticking together helps your friend feel safe.' },
      { text: 'Be unkind back', fair: false, why: 'Being unkind back usually makes things worse.' },
      { text: 'Keep it a secret', fair: false, why: 'Unkind or unsafe things are OK to tell a grown-up about.' },
    ],
  },
];

const STEPS = ['Stop and take a slow breath', 'Say how you feel: “I feel… when…”', 'Think of ideas together', 'Pick a fair idea and try it'];

const KIND: Box = { x: 40, y: 512, w: 440, h: 160 };
const NOT: Box = { x: 520, y: 512, w: 440, h: 160 };

function FriendsScene() {
  const [n, setN] = useState(0);
  const [order, setOrder] = useState<number[]>(() => shuffle([0, 1, 2, 3]));
  const [placed, setPlaced] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ i: number; p: Pt } | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' } | null>(null);
  const problem = PROBLEMS[n];
  const done = Object.keys(placed).length === problem.ideas.length;

  const sortInto = (i: number, fair: boolean) => {
    const idea = problem.ideas[i];
    setSelected(null);
    if (idea.fair === fair) {
      play('correct');
      const next = { ...placed, [i]: fair };
      setPlaced(next);
      if (Object.keys(next).length === problem.ideas.length) {
        play('complete');
        setNote({ text: 'Problem solved together! Kind, fair ideas help both friends feel OK.', tone: 'good' });
      } else setNote({ text: `${fair ? 'Yes!' : 'Right.'} ${idea.why}`, tone: 'good' });
    } else {
      play('wrong');
      setNote({ text: 'Hmm, think about it: would both friends feel OK with that idea? Try the other side.', tone: 'nudge' });
    }
  };

  const tapBin = (fair: boolean) => {
    if (done) return;
    if (selected === null) setNote({ text: 'Pick an idea card first, then tap where it goes.', tone: 'nudge' });
    else sortInto(selected, fair);
  };

  const nextProblem = () => {
    play('whoosh');
    setN((n + 1) % PROBLEMS.length);
    setOrder(shuffle([0, 1, 2, 3]));
    setPlaced({});
    setSelected(null);
    setNote(null);
  };

  const faces: Feeling[] = done ? ['happy', 'happy'] : problem.feel;
  const bin = (box: Box, fair: boolean) => {
    const ideas = order.filter((i) => placed[i] === fair);
    return (
      <Tap label={fair ? 'Kind and fair' : 'Not helpful'} onTap={() => tapBin(fair)}>
        <Card x={box.x} y={box.y} w={box.w} h={box.h} fill={fair ? shade(C.green, 0.82) : shade(C.red, 0.86)}>
          <text x={box.x + 20} y={box.y + 34} fontSize={22} fontWeight={700} fill={C.ink}>
            {fair ? '👍 Kind and fair' : '✋ Not helpful'}
          </text>
          {ideas.map((i, k) => (
            <Lines key={i} text={`• ${problem.ideas[i].text}`} x={box.x + 20} y={box.y + 70 + k * 46} max={46} size={16} lh={20} />
          ))}
        </Card>
      </Tap>
    );
  };

  return (
    <SceneSvg label="Sort kind and fair ideas for solving a problem with a friend">
      {/* The problem */}
      <Card x={40} y={30} w={440} h={300}>
        <text x={60} y={60} fontSize={15} fill={C.muted} className="caps">
          Problem {n + 1} of {PROBLEMS.length}
        </text>
        <Face cx={140} cy={136} r={54} parts={FEELING_FACE[faces[0]]} />
        <Emoji e={problem.emoji} x={260} y={136} size={50} />
        <Face cx={380} cy={136} r={54} parts={FEELING_FACE[faces[1]]} />
        <Lines text={problem.text} x={60} y={226} max={38} size={19} lh={25} weight={600} />
        <SvgButton x={300} y={268} w={164} h={48} fontSize={17} label="Next problem" onClick={nextProblem} />
      </Card>

      {/* Problem-solving steps */}
      <Card x={510} y={30} w={450} h={300}>
        <text x={530} y={60} fontSize={15} fill={C.muted} className="caps">
          Solve it in 4 steps
        </text>
        <SvgButton x={836} y={42} w={110} h={44} fontSize={16} label="Say it" onClick={() => speak(`${problem.text} Is each idea kind and fair? ${STEPS.join('. ')}.`, { force: true })} />
        {STEPS.map((s, i) => (
          <g key={s}>
            <circle cx={548} cy={118 + i * 56} r={18} fill={C.teal} />
            <text x={548} y={124 + i * 56} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.white}>
              {i + 1}
            </text>
            <Lines text={s} x={578} y={124 + i * 56} max={40} size={18} weight={600} />
          </g>
        ))}
      </Card>

      {/* Idea cards */}
      <text x={40} y={356} fontSize={15} fill={C.muted} className="caps">
        Is each idea kind and fair? Drag it (or tap it, then tap a box)
      </text>
      {order.map((i, k) => {
        if (placed[i] !== undefined) return null;
        const idea = problem.ideas[i];
        const at = { x: 150 + k * 233, y: 412 };
        const on = selected === i;
        return (
          <DragItem
            key={`${n}-${i}`}
            at={at}
            r={40}
            label={idea.text}
            dragging={drag?.i === i}
            onMove={(p) => setDrag({ i, p })}
            onDrop={(p) => {
              setDrag(null);
              if (inside(p, KIND)) sortInto(i, true);
              else if (inside(p, NOT)) sortInto(i, false);
            }}
            onTap={() => {
              play('tap');
              setSelected(on ? null : i);
              setNote(null);
            }}
          >
            <rect x={-110} y={-44} width={220} height={88} rx={14} fill={on ? shade(C.yellow, 0.6) : C.card} stroke={C.ink} strokeWidth={on ? 3 : 2} />
            <Lines text={idea.text} x={0} y={6 - ((wrap(idea.text, 22).length - 1) * 20) / 2} max={22} size={16} lh={20} anchor="middle" weight={600} />
          </DragItem>
        );
      })}
      {done && (
        <text x={500} y={420} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.green}>
          All sorted! Tap “Next problem” for another one.
        </text>
      )}
      {bin(KIND, true)}
      {bin(NOT, false)}
      {drag && (
        <g transform={`translate(${drag.p.x} ${drag.p.y})`} style={{ pointerEvents: 'none' }}>
          <rect x={-100} y={-36} width={200} height={72} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} opacity={0.95} />
          <Lines text={problem.ideas[drag.i].text} x={0} y={-6} max={24} size={15} lh={18} anchor="middle" weight={600} />
        </g>
      )}
      {note && <Note x={40} y={462} w={920} text={note.text} tone={note.tone} />}

      <Callout at={[548, 174]} box={[560, 360]} w={260} icon={MessageCircle} title="“I feel…” sentences" text="Say how you feel and why, like “I feel sad when I don’t get a turn.”" />
      <Callout at={[140, 136]} box={[200, 360]} w={240} icon={HeartHandshake} title="Look at faces" text="Faces show how each friend feels about the problem." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Face cx={34} cy={42} r={24} parts={FEELING_FACE.happy} />
      <Face cx={86} cy={42} r={24} parts={FEELING_FACE.happy} />
      <path d="M52,62 q8,8 16,0" fill="none" stroke={C.pink} strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

function pickIdeas(p: Problem) {
  return { good: shuffle(p.ideas.filter((x) => x.fair)), bad: shuffle(p.ideas.filter((x) => !x.fair)) };
}

function makeQuestion(level: number): Question {
  if (level < 2) {
    const p = pick(PROBLEMS.slice(0, 5));
    const { good, bad } = pickIdeas(p);
    return choiceQuestion({
      prompt: `${p.text} Which idea is kind and fair?`,
      visual: <EmojiRow items={['🧒', p.emoji, '👧']} label={p.text} />,
      right: { value: good[0].text },
      wrong: bad.slice(0, level === 0 ? 1 : 2).map((b) => ({ value: b.text })),
      hint: 'Pick the idea that would help both friends feel OK.',
      explain: ['Think about how both friends would feel.', good[0].why, `So a kind, fair idea is: ${good[0].text}.`],
    });
  }
  const kind = Math.floor(Math.random() * 3);
  if (kind === 0) {
    const right = pick(['Someone is hurt or in danger', 'Someone keeps being unkind after you said stop', 'You feel unsafe']);
    return choiceQuestion({
      prompt: 'When is it really important to tell a grown-up you trust?',
      visual: <EmojiRow items={['🧑‍🏫', '💬']} label="A grown-up listening" />,
      right: { value: right },
      wrong: shuffle([{ value: 'You both want the same crayon for a minute' }, { value: 'Your friend picked a different game today' }]),
      hint: 'Small problems we can often solve ourselves. Which one is about being safe?',
      explain: ['Friends can solve many small problems together.', 'But when someone is hurt, unsafe or keeps being unkind, a grown-up can help.', `So tell a grown-up when: ${right.toLowerCase()}.`],
    });
  }
  if (kind === 1) {
    const right = pick(['I feel sad when I don’t get a turn.', 'I feel upset when my tower gets knocked down.', 'I feel left out when I can’t join in.']);
    return choiceQuestion({
      prompt: 'Which one is an “I feel” sentence?',
      right: { value: right },
      wrong: shuffle([{ value: 'You are so mean!' }, { value: 'Go away, I’m not your friend.' }]).slice(0, 2),
      hint: 'Look for the sentence that starts by telling how you feel.',
      explain: ['An “I feel” sentence says your feeling and why.', 'It helps others understand without hurting them.', `“${right}” is an “I feel” sentence.`],
    });
  }
  const i = Math.floor(Math.random() * 3);
  const askStep = ['first', 'second', 'last'][i];
  const idx = [0, 1, 3][i];
  return choiceQuestion({
    prompt: `When you have a problem with a friend, what do you do ${askStep}?`,
    right: { value: STEPS[idx] },
    wrong: STEPS.filter((_, j) => j !== idx)
      .slice(0, 2)
      .map((value) => ({ value })),
    hint: 'Think about the 4 steps: calm, talk, think of ideas, try one.',
    explain: [`The steps are: ${STEPS.join(', then ').toLowerCase()}.`, `So ${askStep} we: ${STEPS[idx].toLowerCase()}.`],
  });
}

export const friendshipProblems: Lesson = {
  id: 'friendship-problems',
  title: 'Solving Problems with Friends',
  Thumb,
  Scene: FriendsScene,
  sceneHint: 'Read the problem · Sort the ideas into kind and fair, or not helpful',
  learn: {
    heading: 'Working it out together',
    intro: 'Even good friends have problems sometimes. We can solve them in ways that are kind and fair to everyone. If someone is hurt or unsafe, we tell a grown-up we trust.',
    points: [
      { icon: Scale, text: 'Fair ideas: take turns, share, or find something you both like.' },
      { icon: MessageCircle, text: 'Use “I feel…” sentences to say how you feel.' },
      { icon: HeartHandshake, text: 'Include others, and think about how they feel.' },
      { icon: ShieldCheck, text: 'If someone is hurt, unsafe or keeps being unkind, tell a grown-up.' },
    ],
  },
  steps: STEPS,
  example: {
    question: 'You and Sam both want to go down the slide first. What could you do?',
    visual: <EmojiRow items={['🧒', '🛝', '👧']} label="Two children and a slide" />,
    work: ['Stop and take a slow breath.', 'Say: “I feel cross because I want to go first too.”', 'Ideas: take turns, or play rock, paper, scissors to pick who starts.', 'Pick one, like taking turns, and try it.'],
    answer: 'Take turns: Sam goes first, then you. You both get a go!',
  },
  grownups: [
    'When siblings or friends argue, coach the steps rather than solving it for them: “How do you feel? What could you try?”',
    'Practise “I feel… when…” sentences at calm times, so they are ready when feelings are big.',
    'Be clear that telling a grown-up about something unsafe or unkind is never “telling tales”.',
    'Notice and praise fair choices: “You took turns, and you both had fun!”',
  ],
  makeQuestion,
};
