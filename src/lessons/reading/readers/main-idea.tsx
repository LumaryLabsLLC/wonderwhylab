import { useState } from 'react';
import { ListTree, Umbrella } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { wrap } from '../../../stage/Predict';
import { DragToken, inside } from './visuals/DragToken';
import { ParagraphPicture, SentenceCard, sentenceHeight, sentenceLines } from './visuals/Cards';
import { textChoices } from './q';

interface Paragraph {
  topic: string;
  /** Sentences in reading order. */
  sentences: string[];
  /** Index of the main-idea sentence. */
  main: number;
  /** A sentence that does NOT belong (about something else). */
  stray: string;
  /** Other topics to use as wrong answers. */
  notTopics: string[];
}

const PARAGRAPHS: Paragraph[] = [
  {
    topic: 'bees',
    sentences: ['Bees are busy helpers in a garden.', 'They carry pollen from flower to flower.', 'This helps plants make fruit and seeds.', 'Bees also make honey that we can eat.'],
    main: 0,
    stray: 'My bike has a shiny red bell.',
    notTopics: ['bikes', 'fruit', 'gardens'],
  },
  {
    topic: 'penguins',
    sentences: ['Penguins are built for life in icy water.', 'Thick feathers keep them warm and dry.', 'A layer of fat holds in their body heat.', 'Their wings work like flippers for swimming.'],
    main: 0,
    stray: 'Camels can walk across hot deserts.',
    notTopics: ['camels', 'feathers', 'swimming pools'],
  },
  {
    topic: 'moving your body',
    sentences: ['Running makes your heart strong.', 'Stretching helps your muscles bend.', 'Playing outside can help you sleep well.', 'Moving your body every day is good for you.'],
    main: 3,
    stray: 'Some cars are painted bright blue.',
    notTopics: ['sleeping', 'cars', 'hearts'],
  },
  {
    topic: 'ants',
    sentences: ['Some ants dig long tunnels.', 'Every ant in a colony has a job to do.', 'Other ants carry food back to the nest.', 'A few ants guard the queen.'],
    main: 1,
    stray: 'Rain makes puddles on the road.',
    notTopics: ['rain', 'tunnels', 'food'],
  },
  {
    topic: 'the Moon',
    sentences: ['The Moon is a fascinating place.', 'It has deep craters made by space rocks.', 'Its gravity is weaker than Earth’s, so astronauts can bounce.', 'There is no air to breathe there.'],
    main: 0,
    stray: 'Pancakes taste great with honey.',
    notTopics: ['pancakes', 'rocks', 'air'],
  },
  {
    topic: 'trees',
    sentences: ['Trees give birds a safe place to build nests.', 'Their leaves make oxygen that we breathe.', 'Their shade keeps us cool on hot days.', 'Trees help living things in many ways.'],
    main: 3,
    stray: 'A spoon is used for eating soup.',
    notTopics: ['birds', 'soup', 'hot days'],
  },
];

// ───────────────────────── Scene ─────────────────────────

const PARA = { x: 46, y: 96, w: 440 };
const UMB = { cx: 740, top: 100 };
const DETAIL_ZONE = { x: 556, y: 300, w: 380, h: 300 };

function MainIdeaScene() {
  const [order] = useState(() => shuffle(PARAGRAPHS));
  const [index, setIndex] = useState(0);
  const para = order[index % order.length];
  const [step, setStep] = useState<'umbrella' | 'details' | 'done'>('umbrella');
  const [details, setDetails] = useState<string[]>([]);
  const [cards, setCards] = useState(() => detailCards(order[0]));
  const [shake, setShake] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('Read the paragraph. Which sentence is the big idea that all the others tell about?');

  // Lay out the paragraph sentences top to bottom.
  let y = PARA.y;
  const rects = para.sentences.map((s) => {
    const h = sentenceHeight(sentenceLines(s, PARA.w, 19), 19);
    const r = { x: PARA.x, y, w: PARA.w, h };
    y += h + 10;
    return r;
  });

  const load = (i: number) => {
    const p = order[i % order.length];
    setIndex(i);
    setStep('umbrella');
    setDetails([]);
    setCards(detailCards(p));
    setSelected(null);
    setMessage('Read the paragraph. Which sentence is the big idea that all the others tell about?');
  };

  const tryMain = (i: number) => {
    if (step !== 'umbrella') return;
    if (i === para.main) {
      play('correct');
      setStep('details');
      setMessage('Yes, that’s the big idea! Now drag the details that tell about it under the umbrella.');
    } else {
      play('wrong');
      setShake({ ...shake, umbrella: (shake.umbrella ?? 0) + 1 });
      setMessage('Not yet. That sentence tells one small detail. Which sentence covers all of them?');
    }
  };

  const tryDetail = (s: string) => {
    if (s === para.stray) {
      play('wrong');
      setShake({ ...shake, [s]: (shake[s] ?? 0) + 1 });
      setMessage(`That sentence isn’t about ${para.topic}, so it doesn’t fit under this umbrella.`);
      return;
    }
    play('pop');
    const next = [...details, s];
    setDetails(next);
    setCards(cards.filter((c) => c !== s));
    setSelected(null);
    if (next.length === para.sentences.length - 1) {
      play('complete');
      setStep('done');
      setMessage('Every detail tells more about the big idea. Nice work!');
    } else {
      setMessage('Good: that detail tells more about the big idea.');
    }
  };

  const mainText = para.sentences[para.main];
  return (
    <SceneSvg label="Main idea: find the big idea and its details">
      <text x={PARA.x} y={70} fontSize={15} fill={C.muted} className="caps">
        Read the paragraph
      </text>
      <SvgButton x={350} y={30} w={136} h={48} fontSize={16} label="Read it" title="Hear the paragraph" onClick={() => speak(para.sentences.join(' '), { force: true })} />

      {para.sentences.map((s, i) => {
        const r = rects[i];
        const isMain = step !== 'umbrella' && i === para.main;
        return (
          <g key={s} transform={`translate(${r.x} ${r.y})`} onClick={() => step === 'umbrella' && tryMain(i)} style={{ cursor: step === 'umbrella' ? 'pointer' : undefined }} data-nopan={step === 'umbrella' ? true : undefined} role="button" aria-label={`Sentence: ${s}`}>
            <SentenceCard w={r.w} text={s} fill={isMain ? shade(C.blue, 0.8) : step !== 'umbrella' && details.includes(s) ? shade(C.green, 0.85) : C.white} />
          </g>
        );
      })}

      {/* The umbrella: drag it onto the big-idea sentence. */}
      {step === 'umbrella' ? (
        <DragToken
          x={UMB.cx}
          y={UMB.top + 90}
          label="Big idea umbrella. Drag it onto the sentence that tells the main idea"
          shakeKey={shake.umbrella ?? 0}
          onTap={() => setMessage('Drag the umbrella onto the big-idea sentence, or tap that sentence.')}
          onDrop={(p) => {
            const hit = rects.findIndex((r) => inside(p, r));
            if (hit >= 0) tryMain(hit);
          }}
        >
          <UmbrellaShape label="Big idea" />
        </DragToken>
      ) : (
        <g transform={`translate(${UMB.cx} ${UMB.top + 90})`}>
          <UmbrellaShape label="Big idea" />
        </g>
      )}

      {step !== 'umbrella' && (
        <g>
          <rect x={DETAIL_ZONE.x - 6} y={UMB.top + 138} width={DETAIL_ZONE.w + 12} height={52} rx={12} fill={shade(C.blue, 0.8)} stroke={C.ink} strokeWidth={2} />
          <text x={UMB.cx} y={UMB.top + 164} textAnchor="middle" dominantBaseline="central" fontSize={mainText.length > 40 ? 16 : 18} fontWeight={700} fill={C.ink}>
            {mainText}
          </text>
          <g
            onClick={() => selected && tryDetail(selected)}
            style={{ cursor: selected ? 'pointer' : undefined }}
            data-nopan={selected ? true : undefined}
          >
            <rect x={DETAIL_ZONE.x} y={DETAIL_ZONE.y} width={DETAIL_ZONE.w} height={DETAIL_ZONE.h} rx={16} fill={shade(C.green, 0.9)} stroke={C.line} strokeWidth={2.5} strokeDasharray="8 6" />
            <text x={UMB.cx} y={DETAIL_ZONE.y + 22} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
              Details under the umbrella
            </text>
            {(() => {
              let line = 0;
              return details.map((d, item) => {
                const lines = wrap(d, 40);
                const y0 = DETAIL_ZONE.y + 54 + line * 22 + item * 8;
                line += lines.length;
                return (
                  <text key={d} x={DETAIL_ZONE.x + 16} y={y0} fontSize={16} fill={C.ink}>
                    {lines.map((l, k) => (
                      <tspan key={k} x={DETAIL_ZONE.x + (k ? 28 : 16)} dy={k ? 22 : 0}>
                        {k ? l : `• ${l}`}
                      </tspan>
                    ))}
                  </text>
                );
              });
            })()}
          </g>
        </g>
      )}

      {step === 'details' &&
        cards.map((c, i) => {
          const w = 214;
          return (
            <DragToken
              key={c}
              x={PARA.x + (i % 2) * (w + 12)}
              y={452 + Math.floor(i / 2) * 80}
              label={`Sentence card: ${c}`}
              selected={selected === c}
              shakeKey={shake[c] ?? 0}
              onTap={() => {
                play('tap');
                setSelected(selected === c ? null : c);
              }}
              onDrop={(p) => inside(p, DETAIL_ZONE) && tryDetail(c)}
            >
              <SentenceCard w={w} text={c} fontSize={15} state={selected === c ? 'selected' : 'idle'} />
            </DragToken>
          );
        })}

      <text x={500} y={640} textAnchor="middle" fontSize={17} fill={C.ink2}>
        {message}
      </text>
      {step === 'done' && <SvgButton x={PARA.x} y={470} w={200} h={54} fontSize={18} label="Next paragraph" color={C.teal} textColor={C.white} onClick={() => load(index + 1)} />}

      <Callout at={[UMB.cx, UMB.top + 40]} box={[790, 200]} w={170} icon={Umbrella} title="Main idea" text="What the whole paragraph is mostly about." />
    </SceneSvg>
  );
}

/** Sentence cards for the details step: every detail, plus one sentence that doesn't belong. */
function detailCards(p: Paragraph) {
  return shuffle([...p.sentences.filter((_, i) => i !== p.main), p.stray]);
}

function UmbrellaShape({ label }: { label: string }) {
  return (
    <g>
      <path d="M-170,0 Q-170,-90 0,-90 Q170,-90 170,0 Q142,-16 113,0 Q85,-16 57,0 Q28,-16 0,0 Q-28,-16 -57,0 Q-85,-16 -113,0 Q-142,-16 -170,0 Z" fill={C.blue} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <path d="M0,-90 L0,26 Q0,40 -12,40" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <text x={0} y={-36} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={800} fill={C.white}>
        {label}
      </text>
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M20,34 Q20,8 60,8 Q100,8 100,34 Q90,28 80,34 Q70,28 60,34 Q50,28 40,34 Q30,28 20,34 Z" fill={C.blue} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <line x1={60} y1={8} x2={60} y2={44} stroke={C.ink} strokeWidth={2} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={26 + i * 24} y={50} width={20} height={22} rx={4} fill={shade(C.green, 0.8)} stroke={C.ink} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

function makeQuestion(level: number): Question {
  const p = pick(PARAGRAPHS);
  const text = p.sentences.join(' ');
  if (level <= 0) {
    return {
      prompt: 'What is this paragraph mostly about?',
      speak: `${text} What is this paragraph mostly about?`,
      visual: <ParagraphPicture text={text} />,
      choices: textChoices(p.topic, p.notTopics, 3),
      answer: p.topic,
      hint: 'What do all of the sentences tell about?',
      explain: [`Every sentence tells something about ${p.topic}.`, `The other choices are only in one sentence, or not at all.`, `So it is mostly about ${p.topic}.`],
    };
  }
  if (level === 1) {
    const answer = p.sentences[p.main];
    return {
      prompt: 'Which sentence tells the main idea?',
      speak: `${text} Which sentence tells the main idea?`,
      visual: <ParagraphPicture text={text} />,
      choices: textChoices(
        answer,
        p.sentences.filter((_, i) => i !== p.main),
        3,
      ),
      answer,
      hint: 'The main idea is the sentence the others all tell more about.',
      explain: [`The other sentences each give one detail about ${p.topic}.`, `One sentence sums them all up.`, `The main idea is: “${answer}”`],
    };
  }
  const shuffled = shuffle(p.sentences.filter((_, i) => i !== p.main));
  return {
    prompt: `The main idea is “${p.sentences[p.main]}” Which sentence does NOT support it?`,
    choices: textChoices(p.stray, shuffled, 3),
    answer: p.stray,
    hint: 'A detail must tell more about the main idea. Which one is about something else?',
    explain: [`The main idea is about ${p.topic}.`, `Each real detail tells more about ${p.topic}.`, `“${p.stray}” is about something else, so it does not support it.`],
  };
}

export const mainIdea: Lesson = {
  id: 'main-idea',
  title: 'Main Idea',
  Thumb,
  Scene: MainIdeaScene,
  sceneHint: 'Drag the umbrella onto the big-idea sentence · Then drag the details under it',
  learn: {
    heading: 'Main idea and details',
    intro:
      'Most paragraphs have one big idea. The other sentences are details that tell more about it, like rain falling under one umbrella.',
    points: [
      { icon: Umbrella, text: 'The main idea is what the whole paragraph is mostly about.' },
      { icon: ListTree, text: 'Details are smaller facts that tell more about the main idea.' },
      { icon: Umbrella, text: 'The main idea is often first or last, but not always.' },
    ],
  },
  steps: [
    'Read the whole paragraph.',
    'Ask: what is this mostly about? That is the topic.',
    'Find the sentence that sums up all the others. That is the main idea.',
    'Check: does every other sentence tell more about it?',
  ],
  example: {
    question: '“Running makes your heart strong. Stretching helps your muscles bend. Moving your body every day is good for you.” What is the main idea?',
    work: ['The topic is moving your body.', 'Running and stretching are details: ways of moving.', 'The last sentence sums them up.'],
    answer: 'Moving your body every day is good for you.',
  },
  grownups: [
    'Topic (one or two words, e.g. “bees”) and main idea (a whole sentence about the topic) are different. Ask for both.',
    'After reading a nonfiction page together, ask “What was that mostly about?” and then “What details tell us that?”',
    'Some paragraphs don’t state the main idea in one sentence. Older readers learn to put it into their own words.',
  ],
  makeQuestion,
};
