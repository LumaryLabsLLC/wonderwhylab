import { useState } from 'react';
import { Eye, Heart, Smile, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import {
  BROW_WORDS,
  BROWS,
  cap,
  EYE_WORDS,
  EYES,
  Face,
  FacePicture,
  FEELING_EMOJI,
  FEELING_FACE,
  feelingOf,
  FEELINGS,
  MOUTH_WORDS,
  MOUTHS,
} from '../shared/Face';
import type { FaceParts, Feeling } from '../shared/Face';
import { Card, Emoji, EmojiRow, Lines, Note } from '../shared/kit';

/** Everyday moments and the feelings people often have. Feelings vary, so several can fit. */
interface Situation {
  text: string;
  emoji: string[];
  fits: Feeling[];
}

const SITUATIONS: Situation[] = [
  { text: 'You open a birthday present.', emoji: ['🎁'], fits: ['happy', 'surprised'] },
  { text: 'Your ice cream falls on the floor.', emoji: ['🍦', '⬇️'], fits: ['sad', 'angry'] },
  { text: 'A big dog barks loudly at you.', emoji: ['🐕', '📢'], fits: ['scared', 'surprised'] },
  { text: 'Someone knocks your tower down on purpose.', emoji: ['🧱', '💥'], fits: ['angry', 'sad'] },
  { text: 'You snuggle up for a bedtime story.', emoji: ['📖', '🛏️'], fits: ['calm', 'happy'] },
  { text: 'A friend jumps out and shouts “Boo!”', emoji: ['🙈', '❗'], fits: ['surprised', 'scared'] },
  { text: 'Your best friend moves far away.', emoji: ['🚚', '👋'], fits: ['sad'] },
  { text: 'You lie on the grass and watch the clouds.', emoji: ['☁️', '🌿'], fits: ['calm', 'happy'] },
  { text: 'You win a race at sports day.', emoji: ['🏃', '🥇'], fits: ['happy', 'surprised'] },
  { text: 'You are lost in a busy shop.', emoji: ['🛒', '❓'], fits: ['scared', 'sad'] },
];

const HELPERS = [
  'Take three slow, deep breaths.',
  'Count slowly to ten.',
  'Tell a grown-up you trust how you feel.',
  'Squeeze a soft toy, then let go.',
];
const NOT_HELPERS = ['Throw your toys.', 'Hit someone.', 'Shout at your friend.', 'Hide the feeling forever.'];

function FeelingsScene() {
  const [parts, setParts] = useState<FaceParts>(FEELING_FACE.happy);
  const [sit, setSit] = useState(0);
  const [result, setResult] = useState<{ text: string; tone: 'good' | 'nudge' } | null>(null);
  const feeling = feelingOf(parts);
  const situation = SITUATIONS[sit];

  const cycle = <T,>(list: T[], v: T) => list[(list.indexOf(v) + 1) % list.length];
  const change = (p: Partial<FaceParts>) => {
    play('pop');
    setResult(null);
    setParts({ ...parts, ...p });
  };

  const check = () => {
    if (!feeling) {
      setResult({ text: 'That’s a mixed-up face! Try changing the eyebrows, eyes or mouth to show one feeling.', tone: 'nudge' });
      return;
    }
    const fits = situation.fits.includes(feeling);
    play(fits ? 'correct' : 'pop');
    setResult(
      fits
        ? { text: `Yes! Lots of people feel ${feeling} when this happens. All feelings are OK.`, tone: 'good' }
        : {
            text: `Some people might feel ${feeling}. Many people feel ${situation.fits.join(' or ')}. Every feeling is OK!`,
            tone: 'nudge',
          },
    );
  };

  return (
    <SceneSvg label="Build a face to show a feeling">
      {/* The face */}
      <circle cx={270} cy={300} r={196} fill={shade(C.yellow, 0.85)} />
      <Face
        cx={270}
        cy={300}
        r={170}
        parts={parts}
        onBrows={() => change({ brows: cycle(BROWS, parts.brows) })}
        onEyes={() => change({ eyes: cycle(EYES, parts.eyes) })}
        onMouth={() => change({ mouth: cycle(MOUTHS, parts.mouth) })}
      />
      <text x={270} y={86} textAnchor="middle" fontSize={17} fill={C.muted}>
        Tap the eyebrows, eyes or mouth to change them
      </text>
      <Card x={120} y={510} w={300} h={70}>
        <text x={270} y={553} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.ink}>
          {feeling ? `${FEELING_EMOJI[feeling]}  ${cap(feeling)}` : 'Hmm, mixed-up!'}
        </text>
      </Card>
      <SvgButton x={190} y={596} w={160} h={50} fontSize={18} label="Say it" onClick={() => speak(feeling ? `This face looks ${feeling}.` : 'A mixed-up face.', { force: true })} />

      {/* Show me a feeling */}
      <text x={560} y={60} fontSize={15} fill={C.muted} className="caps">
        Show me…
      </text>
      {FEELINGS.map((f, i) => (
        <SvgButton
          key={f}
          x={560 + (i % 3) * 136}
          y={72 + Math.floor(i / 3) * 66}
          w={126}
          h={54}
          fontSize={18}
          label={cap(f)}
          active={feeling === f}
          color={feeling === f ? C.yellow : C.card}
          onClick={() => {
            setResult(null);
            setParts(FEELING_FACE[f]);
          }}
        />
      ))}

      {/* A situation to match */}
      <Card x={560} y={222} w={400} h={262}>
        <text x={580} y={252} fontSize={15} fill={C.muted} className="caps">
          How might you feel?
        </text>
        <g>
          {situation.emoji.map((e, i) => (
            <Emoji key={i} e={e} x={620 + i * 70} y={300} size={54} />
          ))}
        </g>
        <Lines text={situation.text} x={580} y={360} max={34} size={20} lh={26} weight={600} />
        <SvgButton x={580} y={414} w={170} h={52} fontSize={18} label="This is my face" color={C.teal} textColor={C.white} onClick={check} />
        <SvgButton
          x={764}
          y={414}
          w={176}
          h={52}
          fontSize={18}
          label="Next moment"
          onClick={() => {
            setResult(null);
            setSit((sit + 1) % SITUATIONS.length);
          }}
        />
      </Card>
      {result && <Note x={560} y={500} w={400} text={result.text} tone={result.tone} />}

      <Callout at={[270, 238]} box={[560, 590]} w={240} icon={Eye} title="Look at the eyebrows" text="Up, down or relaxed eyebrows show a lot about how someone feels." />
      <Callout at={[270, 352]} box={[20, 20]} w={200} icon={Smile} title="And the mouth" text="Smiles, frowns and round “O” mouths are clues too." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Face cx={38} cy={42} r={30} parts={FEELING_FACE.happy} />
      <Face cx={86} cy={42} r={24} parts={FEELING_FACE.surprised} />
    </svg>
  );
}

function faceSteps(f: Feeling): string[] {
  const p = FEELING_FACE[f];
  return [`The eyebrows are ${BROW_WORDS[p.brows]} and the eyes are ${EYE_WORDS[p.eyes]}.`, `The mouth is ${MOUTH_WORDS[p.mouth]}.`, `This face looks ${f}.`];
}

const word = (f: Feeling) => ({ value: f, label: cap(f), name: f });

function makeQuestion(level: number): Question {
  if (level === 0) {
    const pairs: [Feeling, Feeling][] = [
      ['happy', 'sad'],
      ['happy', 'angry'],
      ['surprised', 'calm'],
      ['sad', 'happy'],
      ['calm', 'angry'],
      ['scared', 'happy'],
    ];
    const [f, other] = pick(pairs);
    return choiceQuestion({
      prompt: 'How does this face feel?',
      visual: <FacePicture feeling={f} />,
      right: word(f),
      wrong: [word(other)],
      hint: 'Look at the mouth first. Is it smiling, turned down, or round?',
      explain: faceSteps(f),
    });
  }
  if (level === 1) {
    const f = pick(FEELINGS);
    const wrong = shuffle(FEELINGS.filter((x) => x !== f)).slice(0, 2);
    return choiceQuestion({
      prompt: 'Which feeling does this face show?',
      visual: <FacePicture feeling={f} />,
      right: word(f),
      wrong: wrong.map(word),
      hint: 'Check the eyebrows, then the eyes, then the mouth.',
      explain: faceSteps(f),
    });
  }
  // Level 2: feelings in real moments, and what helps with big feelings.
  if (Math.random() < 0.6) {
    const s = pick(SITUATIONS);
    const f = pick(s.fits);
    const wrong = shuffle(FEELINGS.filter((x) => !s.fits.includes(x))).slice(0, 2);
    return choiceQuestion({
      prompt: `${s.text} How might you feel?`,
      visual: <EmojiRow items={s.emoji} label={s.text} />,
      right: word(f),
      wrong: wrong.map(word),
      hint: 'Imagine it is happening to you. Is it a nice moment or a hard one?',
      explain: [`Think about the moment: ${s.text.toLowerCase().replace(/\.$/, '')}.`, `Many people feel ${s.fits.join(' or ')} then.`, `So ${f} fits. All feelings are OK.`],
    });
  }
  const big = pick<Feeling>(['angry', 'sad', 'scared']);
  const good = pick(HELPERS);
  const bad = shuffle(NOT_HELPERS).slice(0, 2);
  return choiceQuestion({
    prompt: `You feel very ${big}. What could help?`,
    right: { value: good },
    wrong: bad.map((b) => ({ value: b })),
    hint: 'Pick the idea that keeps everyone safe and helps you feel calmer.',
    explain: [`Feeling ${big} is OK. What we do next matters.`, 'Safe choices calm our body and don’t hurt anyone.', `A good idea: ${good}`],
  });
}

export const feelingsFaces: Lesson = {
  id: 'feelings-faces',
  title: 'How Do I Feel?',
  Thumb,
  Scene: FeelingsScene,
  sceneHint: 'Tap the face to change it · Match a feeling to the moment',
  learn: {
    heading: 'Naming feelings',
    intro: 'Everyone has feelings: happy, sad, angry, scared, surprised and calm. All feelings are OK! Our faces and bodies give clues about how we feel.',
    points: [
      { icon: Smile, text: 'Faces show feelings with eyebrows, eyes and mouths.' },
      { icon: Heart, text: 'All feelings are OK. They come and go.' },
      { icon: Sparkles, text: 'Saying “I feel…” helps others understand you.' },
      { icon: Eye, text: 'Looking at faces helps us understand our friends.' },
    ],
  },
  steps: [
    'Look at the eyebrows: up, down, or relaxed?',
    'Look at the eyes: wide open, squeezed, or closed?',
    'Look at the mouth: smiling, turned down, or round?',
    'Put the clues together and name the feeling.',
  ],
  example: {
    question: 'A face has eyebrows lifted up high, wide-open eyes and a round “O” mouth. How does it feel?',
    visual: <FacePicture feeling="surprised" />,
    work: ['Eyebrows lifted up high.', 'Eyes wide open.', 'Mouth in a round “O”.'],
    answer: 'This face looks surprised!',
  },
  grownups: [
    'Name your own feelings out loud: “I feel frustrated because the bus is late.” Children learn the words from you.',
    'There are no “bad” feelings. Accept the feeling and guide the action: “It’s OK to feel angry. It’s not OK to hit.”',
    'While reading books together, pause and ask: “How do you think she feels? How can you tell?”',
    'If big feelings often seem hard to manage, talk with your child’s teacher or doctor.',
  ],
  makeQuestion,
};
