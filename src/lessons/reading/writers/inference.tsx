import { useMemo, useState } from 'react';
import { Brain, Lightbulb, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragChip, inRect } from './visuals/DragChip';
import type { Rect } from './visuals/DragChip';
import { Passage } from './visuals/Passage';
import './writers.css';

interface Story {
  sentences: string[];
  /** Indexes of sentences that support the inference. */
  evidence: number[];
  question: string;
  answer: string;
  wrong: [string, string];
  /** What a reader already knows that links the clues to the answer. */
  know: string;
}

/** Original short passages. Each has 3 clue sentences and 2 that don’t help answer the question. */
const STORIES: Story[] = [
  {
    sentences: [
      'Maya pulled her coat tighter.',
      'The bus was late again.',
      'Her breath made little clouds in the air.',
      'She wished she had remembered her gloves.',
      'A dog barked across the street.',
    ],
    evidence: [0, 2, 3],
    question: 'What is the weather like?',
    answer: 'It is cold.',
    wrong: ['It is very hot.', 'It is raining hard.'],
    know: 'We wear coats and gloves and see our breath when it is cold.',
  },
  {
    sentences: [
      'The kitchen smelled sweet and warm.',
      'A tray sat cooling on the counter.',
      'The dog was asleep by the door.',
      'Flour was spilled across the table, and Dad had a white smudge on his nose.',
      'The radio was playing quietly.',
    ],
    evidence: [0, 1, 3],
    question: 'What has Dad been doing?',
    answer: 'He has been baking.',
    wrong: ['He has been painting the walls.', 'He has been sleeping.'],
    know: 'Baking uses flour, and fresh baking smells sweet and needs to cool on a tray.',
  },
  {
    sentences: [
      'Ava’s eyes filled with tears as she read the letter.',
      'A bird landed on the fence outside.',
      'She put the letter down and stared out of the window for a long time.',
      'Her best friend was moving to another country.',
      'The letter was written in blue ink.',
    ],
    evidence: [0, 2, 3],
    question: 'How does Ava feel?',
    answer: 'She feels sad.',
    wrong: ['She feels excited.', 'She feels angry.'],
    know: 'People often cry and go quiet when someone they love is going far away.',
  },
  {
    sentences: [
      'The ground was covered in puddles.',
      'A cat sat on the windowsill.',
      'Worms wriggled across the path.',
      'People were shaking out their umbrellas as they came inside.',
      'The shop sold apples and pears.',
    ],
    evidence: [0, 2, 3],
    question: 'What happened just before?',
    answer: 'It rained.',
    wrong: ['It snowed.', 'There was a heatwave.'],
    know: 'Rain leaves puddles, brings worms up, and makes people use umbrellas.',
  },
  {
    sentences: [
      'Leo kept looking at the clock.',
      'The classroom walls were painted blue.',
      'He tapped his foot under the desk.',
      'When the bell finally rang, he grabbed his bag and raced to the door.',
      'The teacher wore a green jumper.',
    ],
    evidence: [0, 2, 3],
    question: 'How does Leo feel before the bell rings?',
    answer: 'He can’t wait to leave.',
    wrong: ['He wants to stay longer.', 'He is fast asleep.'],
    know: 'Watching the clock, tapping and rushing out are signs someone is eager to go.',
  },
];

/** Extra passages for the hardest practice level: the answer needs two clues put together. */
const HARD: { text: string; question: string; answer: string; wrong: [string, string]; clue: string; know: string }[] = [
  {
    text: 'Grandpa pulled on his thick boots and wrapped a scarf around his neck. He took a shovel from the shed. The path to the gate was hidden under white.',
    question: 'Why did Grandpa take the shovel?',
    answer: 'To clear snow off the path',
    wrong: ['To dig a new flower bed', 'To bury some treasure'],
    clue: 'the path was hidden under white, and he wore boots and a scarf',
    know: 'White covering the ground in cold weather is snow, and shovels can clear it.',
  },
  {
    text: 'Priya looked at the dark grey sky and frowned. She swapped her sandals for wellies and packed her raincoat. At the door, her mum handed her an umbrella.',
    question: 'What does Priya think will happen?',
    answer: 'It will rain',
    wrong: ['It will be hot and sunny', 'She will go swimming'],
    clue: 'dark grey sky, wellies, a raincoat and an umbrella',
    know: 'Dark grey clouds often bring rain, and we pack rain gear when we expect it.',
  },
  {
    text: 'The theatre went dark. Everyone stopped whispering. A bright light shone on the red curtain as it slowly began to rise.',
    question: 'What is about to happen?',
    answer: 'A show is about to start',
    wrong: ['The theatre is closing', 'There is a fire drill'],
    clue: 'the lights went down, everyone went quiet and the curtain is rising',
    know: 'In a theatre, the lights dim and the curtain rises when a show begins.',
  },
  {
    text: 'Omar’s tomato plants had yellow, droopy leaves. The soil in the pots was dry and cracked. The full watering can sat untouched by the door.',
    question: 'Why are the plants droopy?',
    answer: 'They have not been watered',
    wrong: ['They were given too much water', 'They are too tall'],
    clue: 'dry, cracked soil and a full, untouched watering can',
    know: 'Plants droop when they don’t get enough water.',
  },
];

const TRAY: Rect = { x: 620, y: 92, w: 340, h: 250 };
const stripW = 540;

function InferenceScene() {
  const [index, setIndex] = useState(0);
  const [inTray, setInTray] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const story = STORIES[index];
  const options = useMemo(() => shuffle([story.answer, ...story.wrong]), [story]);
  const solved = picked === story.answer;

  // Lay out the sentence strips that are still in the passage.
  const strips = useMemo(() => {
    let y = 92;
    return story.sentences.map((s, i) => {
      const lines = wrap(s, 50);
      const h = 28 + lines.length * 22;
      const pos = { i, lines, h, y: y + h / 2 };
      y += h + 12;
      return pos;
    });
  }, [story]);

  const moveToTray = (i: number) => {
    if (!inTray.includes(i) && inTray.length < 4) setInTray([...inTray, i]);
    setSelected(null);
    play('pop');
  };

  const onDrop = (i: number, c: Pt) => {
    if (inRect(c, TRAY)) moveToTray(i);
  };

  const choose = (o: string) => {
    if (solved || inTray.length === 0) return;
    setPicked(o);
    if (o === story.answer) play('correct');
    else {
      setWrong([...wrong, o]);
      play('wrong');
    }
  };

  const next = () => {
    setIndex((index + 1) % STORIES.length);
    setInTray([]);
    setSelected(null);
    setPicked(null);
    setWrong([]);
  };

  const strong = inTray.filter((i) => story.evidence.includes(i));
  const weak = inTray.filter((i) => !story.evidence.includes(i));

  let title = 'Collect your evidence first';
  let lines = ['Drag the sentences that help answer the question into the tray.'];
  if (inTray.length && !picked) {
    title = 'Now choose the best inference';
    lines = ['Use your evidence plus what you already know.'];
  }
  if (picked && !solved) {
    title = 'Not yet. Check your evidence again.';
    lines = ['Does that answer fit every clue in your tray?'];
  }
  if (solved) {
    title = `Yes! ${story.answer}`;
    lines = [
      ...wrap(`Clues + what I know: ${story.know}`, 62),
      weak.length ? `“${story.sentences[weak[0]]}” doesn’t help with this question.` : `Great evidence: ${strong.length} strong clue${strong.length === 1 ? '' : 's'}.`,
    ];
  }

  return (
    <SceneSvg label="Passage sentences to drag into an evidence tray">
      <text x={40} y={50} fontSize={22} fontWeight={700} fill={C.ink}>
        Question: {story.question}
      </text>

      {/* Evidence tray */}
      <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} rx={18} fill={shade(C.blue, 0.88)} stroke={C.blue} strokeWidth={2.5} strokeDasharray={inTray.length ? undefined : '10 8'} />
      <text x={TRAY.x + 16} y={TRAY.y + 30} fontSize={18} fontWeight={800} fill={shade(C.blue, -0.35)}>
        Evidence tray
      </text>
      {inTray.length === 0 && (
        <text x={TRAY.x + 16} y={TRAY.y + 60} fontSize={15} fill={C.ink2}>
          Drop clue sentences here.
        </text>
      )}
      {inTray.map((i, j) => {
        const lines = wrap(story.sentences[i], 38).slice(0, 2);
        const good = solved && story.evidence.includes(i);
        return (
          <g
            key={i}
            onClick={() => !solved && setInTray(inTray.filter((t) => t !== i))}
            style={{ cursor: solved ? 'default' : 'pointer' }}
            data-nopan
            role="button"
            aria-label={`Evidence: ${story.sentences[i]}. Tap to put back`}
          >
            <rect x={TRAY.x + 10} y={TRAY.y + 44 + j * 50} width={TRAY.w - 20} height={44} rx={10} fill={solved ? (good ? shade(C.green, 0.75) : '#eeeeee') : C.card} stroke={C.line} strokeWidth={1.5} />
            {lines.map((line, n) => (
              <text key={n} x={TRAY.x + 20} y={TRAY.y + 62 + j * 50 + n * 16} fontSize={13.5} fill={C.ink}>
                {line}
              </text>
            ))}
          </g>
        );
      })}
      {selected !== null && (
        <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} rx={18} fill="transparent" stroke={C.orange} strokeWidth={3.5} style={{ cursor: 'pointer' }} data-nopan onClick={() => moveToTray(selected)} />
      )}

      {/* Inference choices */}
      <text x={620} y={372} fontSize={16} fontWeight={700} fill={inTray.length ? C.ink : C.muted}>
        {inTray.length ? 'Pick the best inference:' : 'Choices unlock after you add evidence'}
      </text>
      {options.map((o, i) => (
        <SvgButton
          key={`${index}-${o}`}
          x={620}
          y={386 + i * 62}
          w={340}
          h={52}
          fontSize={o.length > 26 ? 15 : 17}
          label={o}
          color={solved && o === story.answer ? shade(C.green, 0.6) : wrong.includes(o) ? '#eeeeee' : C.card}
          disabled={!inTray.length || wrong.includes(o) || (solved && o !== story.answer)}
          onClick={() => choose(o)}
        />
      ))}

      {/* Feedback */}
      <rect x={40} y={572} width={560} height={92} rx={16} fill={solved ? shade(C.green, 0.85) : shade(C.yellow, 0.82)} stroke={C.line} strokeWidth={2} />
      <text x={58} y={598} fontSize={18} fontWeight={700} fill={C.ink}>
        {title}
      </text>
      {lines.slice(0, 3).map((line, i) => (
        <text key={i} x={58} y={620 + i * 19} fontSize={14.5} fill={C.ink2}>
          {line}
        </text>
      ))}
      <SvgButton x={620} y={584} w={160} h={54} fontSize={16} label="Read it" onClick={() => speak(`${story.sentences.join(' ')} ${story.question}`, { force: true })} />
      <SvgButton x={800} y={584} w={160} h={54} fontSize={16} label="Next story" color={solved ? C.yellow : C.card} onClick={next} />

      {/* Sentence strips (drawn last so they move above the tray while dragging) */}
      {strips
        .filter((s) => !inTray.includes(s.i))
        .map((s) => (
          <DragChip
            key={`${index}-${s.i}`}
            x={40 + stripW / 2}
            y={s.y}
            w={stripW}
            h={s.h}
            lines={s.lines}
            label={`Sentence: ${story.sentences[s.i]}`}
            fontSize={17}
            bold={false}
            selected={selected === s.i}
            onDrop={(c) => onDrop(s.i, c)}
            onTap={() => {
              setSelected(selected === s.i ? null : s.i);
              play('tap');
            }}
          />
        ))}

      <Callout at={[620, 150]} box={[700, 4]} w={260} icon={Search} title="Evidence" text="Inferences need proof from the text. Collect the clues first." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[12, 30, 48].map((y) => (
        <rect key={y} x={6} y={y} width={58} height={12} rx={4} fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      ))}
      <rect x={72} y={10} width={42} height={52} rx={8} fill={shade(C.blue, 0.8)} stroke={C.blue} strokeWidth={2} />
      <rect x={77} y={18} width={32} height={10} rx={3} fill={C.card} stroke={C.ink} strokeWidth={1} />
      <circle cx={93} cy={46} r={8} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
      <text x={93} y={50} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.ink}>?</text>
    </svg>
  );
}

const storyText = (s: Story) => s.sentences.join(' ');

function makeQuestion(level: number): Question {
  if (level === 0) {
    const s = pick(STORIES);
    return {
      prompt: s.question,
      visual: <Passage text={storyText(s)} />,
      choices: shuffle([s.answer, ...s.wrong]).map((value) => ({ value })),
      answer: s.answer,
      hint: 'Find the sentences that give clues. What do they have in common?',
      explain: [`Clues: “${s.sentences[s.evidence[0]]}” and “${s.sentences[s.evidence[1]]}”`, `What I know: ${s.know}`, `So the best inference is: ${s.answer}`],
    };
  }
  if (level === 1) {
    const s = pick(STORIES);
    const clue = s.sentences[pick(s.evidence)];
    const distractors = s.sentences.filter((_, i) => !s.evidence.includes(i));
    return {
      prompt: `Which sentence is the best evidence that “${s.answer}”?`,
      visual: <Passage text={storyText(s)} />,
      choices: shuffle([clue, ...distractors]).map((value) => ({ value })),
      answer: clue,
      hint: 'Which sentence would you point to if someone asked “How do you know?”',
      explain: [`The inference is: ${s.answer}`, `“${clue}” is a clue that supports it.`, 'The other sentences are true, but they don’t help answer the question.'],
    };
  }
  const h = pick(HARD);
  return {
    prompt: h.question,
    visual: <Passage text={h.text} />,
    choices: shuffle([h.answer, ...h.wrong]).map((value) => ({ value })),
    answer: h.answer,
    hint: 'Put two clues together, then add what you already know.',
    explain: [`Clues: ${h.clue}.`, `What I know: ${h.know}`, `So: ${h.answer}.`],
  };
}

export const inference: Lesson = {
  id: 'inference',
  title: 'Read Between the Lines',
  Thumb,
  Scene: InferenceScene,
  sceneHint: 'Drag clue sentences into the evidence tray · Then choose the inference',
  learn: {
    heading: 'Making inferences',
    intro:
      'Writers don’t tell you everything. An inference is a smart conclusion you make from clues in the text plus what you already know. Good readers can always point to their evidence.',
    points: [
      { icon: Search, text: 'Clues in the text: what do the characters do, say and notice?' },
      { icon: Brain, text: 'What I know: use your own experience of the world.' },
      { icon: Lightbulb, text: 'Clues + what I know = inference. Then check it fits every clue.' },
    ],
  },
  steps: [
    'Read the question first, so you know what you are looking for.',
    'Read the passage and find sentences that give clues.',
    'Add what you already know about those clues.',
    'Make your inference and check it with the evidence.',
  ],
  example: {
    question: 'What is the weather like?',
    visual: <Passage text="Maya pulled her coat tighter. Her breath made little clouds in the air. She wished she had remembered her gloves." />,
    work: ['Clues: a coat pulled tight, breath like clouds, wanting gloves.', 'What I know: we see our breath and want gloves when it’s cold.', 'Clues + what I know = it is cold.'],
    answer: 'It is cold.',
  },
  grownups: [
    'Ask “How do you know?” after any answer about a story. Pointing to evidence is the core skill.',
    'Inference depends on background knowledge. Talking about the world (weather, jobs, feelings) makes children better readers.',
    'Picture books are great for inference practice at any age: the pictures often say what the words don’t.',
  ],
  makeQuestion,
};
