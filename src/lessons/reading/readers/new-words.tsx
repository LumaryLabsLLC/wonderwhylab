import { useState } from 'react';
import { BookOpen, Network, Search } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken, inside } from './visuals/DragToken';
import { SentenceCard, SentencePicture, WordCard, sentenceHeight, sentenceLines } from './visuals/Cards';
import { sample, textChoices } from './q';

/** Tier 2 words: useful in many subjects and stories, learned best from rich context. */
interface Word {
  word: string;
  means: string;
  sentence: string;
  /** The part of the sentence that gives the meaning away. */
  clue: string;
  same: string[];
  opposite: string[];
  good: string;
  bad: [string, string];
}

const WORDS: Word[] = [
  {
    word: 'enormous',
    means: 'very, very big',
    sentence: 'The enormous whale was longer than a school bus.',
    clue: '“longer than a school bus” tells you it is very big',
    same: ['huge', 'giant'],
    opposite: ['tiny', 'small'],
    good: 'The ___ pumpkin was too heavy to lift.',
    bad: ['The ___ ant hid under a crumb.', 'The mouse was so ___ it fit in my pocket.'],
  },
  {
    word: 'fragile',
    means: 'easy to break',
    sentence: 'Carry the fragile vase slowly, or it might break.',
    clue: '“or it might break” tells you it breaks easily',
    same: ['delicate'],
    opposite: ['strong', 'sturdy'],
    good: 'Wrap the ___ eggs in soft paper.',
    bad: ['The ___ rock did not crack when it fell.', 'The truck was so ___ it could carry ten elephants.'],
  },
  {
    word: 'gather',
    means: 'bring things together in one place',
    sentence: 'We gather shells on the beach and put them in a bucket.',
    clue: '“put them in a bucket” tells you the shells end up together',
    same: ['collect'],
    opposite: ['scatter'],
    good: 'Let’s ___ the leaves into a big pile.',
    bad: ['We ___ our toys all over the floor.', 'The birds ___ away in every direction.'],
  },
  {
    word: 'curious',
    means: 'wanting to find out about things',
    sentence: 'The curious kitten sniffed every box to see what was inside.',
    clue: '“to see what was inside” tells you it wanted to find out',
    same: ['interested'],
    opposite: ['bored'],
    good: 'The ___ girl asked lots of questions about the stars.',
    bad: ['He was so ___ that he never asked a single question.', 'The ___ boy did not care what was in the box.'],
  },
  {
    word: 'ancient',
    means: 'very, very old',
    sentence: 'The ancient castle was built more than 800 years ago.',
    clue: '“built more than 800 years ago” tells you it is very old',
    same: ['old'],
    opposite: ['new', 'modern'],
    good: 'We saw ___ dinosaur bones at the museum.',
    bad: ['My ___ shoes came out of the box this morning.', 'The ___ baby was born yesterday.'],
  },
  {
    word: 'brave',
    means: 'ready to do something hard or scary',
    sentence: 'The brave firefighter ran into the smoke to help.',
    clue: '“ran into the smoke to help” shows she did not let fear stop her',
    same: ['bold', 'courageous'],
    opposite: ['afraid', 'timid'],
    good: 'It was ___ of Sam to try the high dive.',
    bad: ['The ___ mouse hid and shook with fear.', 'She was too ___ to say hello.'],
  },
  {
    word: 'gentle',
    means: 'soft and careful, not rough',
    sentence: 'Be gentle when you hold the baby bird.',
    clue: 'a baby bird must be held softly and carefully',
    same: ['soft', 'kind'],
    opposite: ['rough'],
    good: 'She gave the puppy a ___ pat.',
    bad: ['The ___ wave smashed the boat to pieces.', 'He threw the eggs in a ___ way and they broke.'],
  },
  {
    word: 'exhausted',
    means: 'very, very tired',
    sentence: 'After the long race, the runners were exhausted.',
    clue: '“after the long race” tells you they had used up their energy',
    same: ['worn out'],
    opposite: ['full of energy'],
    good: 'After hiking all day, we were ___ and went to bed early.',
    bad: ['I was so ___ that I ran around all night.', 'The ___ puppy kept jumping and racing about.'],
  },
];

const fill = (s: string, w: string) => s.replace('___', w);

// ───────────────────────── Scene ─────────────────────────

const LEFT = { x: 46, w: 430 };
const MEAN_SLOT = { x: LEFT.x, y: 236, w: LEFT.w, h: 66 };
const meanY = (i: number) => 350 + i * 74;

function NewWordsScene() {
  const [order] = useState(() => shuffle(WORDS));
  const [index, setIndex] = useState(0);
  const word = order[index % order.length];
  const [step, setStep] = useState<'meaning' | 'use' | 'done'>('meaning');
  const [meaningOptions, setMeaningOptions] = useState(() => meaningsFor(order[0]));
  const [useOptions, setUseOptions] = useState(() => useFor(order[0]));
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('Read the sentence. Look for clues that tell you what the word means.');
  const [wrongUse, setWrongUse] = useState<string | null>(null);

  const next = () => {
    const i = index + 1;
    const w = order[i % order.length];
    setIndex(i);
    setStep('meaning');
    setMeaningOptions(meaningsFor(w));
    setUseOptions(useFor(w));
    setSelected(null);
    setWrongUse(null);
    setMessage('Read the sentence. Look for clues that tell you what the word means.');
  };

  const tryMeaning = (m: string) => {
    if (m === word.means) {
      play('correct');
      setStep('use');
      setSelected(null);
      setMessage(`Yes! The clue: ${word.clue}. Now use the word.`);
    } else {
      play('wrong');
      setShake({ ...shake, [m]: (shake[m] ?? 0) + 1 });
      setMessage(`Not yet. Put that meaning in place of “${word.word}”. Does the sentence still make sense?`);
    }
  };

  const tryUse = (sentence: string) => {
    if (sentence === word.good) {
      play('correct');
      setStep('done');
      setWrongUse(null);
      setMessage(`Great reading! “${word.word}” fits because it means ${word.means}.`);
    } else {
      play('wrong');
      setShake({ ...shake, chip: (shake.chip ?? 0) + 1 });
      setWrongUse(sentence);
      setMessage(`Hmm. Would something “${word.means}” fit there? Try the other sentence.`);
    }
  };

  const useRects = useOptions.map((sentence, i) => {
    const y = 388 + i * 112;
    return { sentence, rect: { x: LEFT.x, y, w: LEFT.w, h: sentenceHeight(sentenceLines(sentence, LEFT.w), 19) } };
  });

  return (
    <SceneSvg label={`New word: ${word.word}`}>
      <text x={LEFT.x} y={52} fontSize={15} fill={C.muted} className="caps">
        Word {(index % order.length) + 1} of {order.length}
      </text>
      <text x={500} y={70} textAnchor="middle" fontSize={46} fontWeight={800} fill={shade(C.purple, -0.2)}>
        {word.word}
      </text>
      <SvgButton x={830} y={34} w={130} h={50} fontSize={17} label="Say it" title="Hear the word and sentence" onClick={() => speak(`${word.word}. ${word.sentence}`, { force: true })} />

      <g transform={`translate(${LEFT.x} 104)`}>
        <SentenceCard w={914} text={word.sentence} fontSize={24} fill={shade(C.yellow, 0.82)} highlight={{ words: [word.word], color: shade(C.purple, -0.2) }} />
      </g>

      {step === 'meaning' && (
        <g>
          <g onClick={() => selected && tryMeaning(selected)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan={selected ? true : undefined}>
            <rect {...rectProps(MEAN_SLOT)} rx={14} fill={C.white} stroke={C.ink} strokeWidth={2.5} strokeDasharray="8 6" />
            <text x={MEAN_SLOT.x + MEAN_SLOT.w / 2} y={MEAN_SLOT.y + MEAN_SLOT.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={19} fill={C.muted}>
              “{word.word}” means… (drag a meaning here)
            </text>
          </g>
          {meaningOptions.map((m, i) => (
            <DragToken
              key={m}
              x={LEFT.x + LEFT.w / 2}
              y={meanY(i)}
              label={`Meaning: ${m}`}
              selected={selected === m}
              shakeKey={shake[m] ?? 0}
              onTap={() => {
                play('tap');
                setSelected(selected === m ? null : m);
              }}
              onDrop={(p: Pt) => inside(p, { x: MEAN_SLOT.x - 20, y: MEAN_SLOT.y - 30, w: MEAN_SLOT.w + 40, h: MEAN_SLOT.h + 60 }) && tryMeaning(m)}
            >
              <WordCard w={LEFT.w} h={58} parts={[{ t: m }]} fontSize={21} state={selected === m ? 'selected' : 'idle'} />
            </DragToken>
          ))}
        </g>
      )}

      {step !== 'meaning' && (
        <g>
          <rect {...rectProps(MEAN_SLOT)} rx={14} fill={shade(C.green, 0.8)} stroke={C.ink} strokeWidth={2.5} />
          <text x={MEAN_SLOT.x + MEAN_SLOT.w / 2} y={MEAN_SLOT.y + MEAN_SLOT.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
            “{word.word}” means {word.means}
          </text>
          {useRects.map(({ sentence, rect }) => {
            const done = step === 'done' && sentence === word.good;
            const wrong = wrongUse === sentence;
            return (
              <g
                key={sentence}
                transform={`translate(${rect.x} ${rect.y})`}
                onClick={() => step === 'use' && tryUse(sentence)}
                style={{ cursor: step === 'use' ? 'pointer' : undefined }}
                data-nopan={step === 'use' ? true : undefined}
                role="button"
                aria-label={`Put the word into: ${sentence.replace('___', 'blank')}`}
              >
                <SentenceCard w={rect.w} text={done ? fill(sentence, word.word) : sentence.replace('___', '______')} state={done ? 'right' : wrong ? 'wrong' : 'idle'} />
              </g>
            );
          })}
          {step === 'use' && (
            <DragToken
              x={LEFT.x + LEFT.w - 100}
              y={MEAN_SLOT.y + MEAN_SLOT.h + 32}
              label={`Word chip: ${word.word}. Drag it into the sentence where it fits`}
              shakeKey={shake.chip ?? 0}
              onTap={() => setMessage('Drag the word onto the sentence where it makes sense, or tap that sentence.')}
              onDrop={(p) => {
                const hit = useRects.find(({ rect }) => inside(p, rect));
                if (hit) tryUse(hit.sentence);
              }}
            >
              <WordCard w={180} h={50} parts={[{ t: word.word, c: shade(C.purple, -0.2), bold: true }]} fontSize={24} fill={shade(C.purple, 0.85)} />
            </DragToken>
          )}
        </g>
      )}

      <WordWeb word={word} open={step !== 'meaning'} />

      <text x={500} y={636} textAnchor="middle" fontSize={17} fill={C.ink2}>
        {message}
      </text>
      {step === 'done' && <SvgButton x={790} y={560} w={170} h={52} fontSize={18} label="Next word" color={C.teal} textColor={C.white} onClick={next} />}

      <Callout at={[500, 140]} box={[620, 196]} w={240} icon={Search} title="Context clues" text="Words around a new word often explain it." />
      <Callout at={[740, 382]} box={[760, 470]} w={200} icon={Network} title="Word web" text="Linking words that mean the same or the opposite helps you remember." />
    </SceneSvg>
  );
}

function rectProps(r: { x: number; y: number; w: number; h: number }) {
  return { x: r.x, y: r.y, width: r.w, height: r.h };
}

function meaningsFor(w: Word) {
  return shuffle([w.means, ...sample(WORDS.filter((o) => o.word !== w.word).map((o) => o.means), 2)]);
}

function useFor(w: Word) {
  return shuffle([w.good, pick(w.bad)]);
}

const WEB = { cx: 740, cy: 382 };

function WordWeb({ word, open }: { word: Word; open: boolean }) {
  const same = word.same.slice(0, 2);
  const opp = word.opposite.slice(0, 2);
  const spots = (n: number, y: number) => (n === 1 ? [WEB.cx] : [WEB.cx - 130, WEB.cx + 130]).map((x) => ({ x, y }));
  return (
    <g opacity={open ? 1 : 0.35}>
      <text x={WEB.cx} y={232} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        {open ? 'Word web' : 'Find the meaning to open the word web'}
      </text>
      {open &&
        [...spots(same.length, 280).map((p, i) => ({ ...p, t: same[i], kind: 'same' })), ...spots(opp.length, 486).map((p, i) => ({ ...p, t: opp[i], kind: 'opposite' }))].map((n) => (
          <g key={n.kind + n.t}>
            <line x1={WEB.cx} y1={WEB.cy} x2={n.x} y2={n.y} stroke={C.ink} strokeWidth={2} />
            <rect x={n.x - 80} y={n.y - 24} width={160} height={48} rx={24} fill={n.kind === 'same' ? shade(C.green, 0.75) : shade(C.red, 0.8)} stroke={C.ink} strokeWidth={2} />
            <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink}>
              {n.t}
            </text>
          </g>
        ))}
      {open && (
        <>
          <text x={WEB.cx + 150} y={252} fontSize={14} fill={shade(C.green, -0.4)} textAnchor="middle">
            means the same
          </text>
          <text x={WEB.cx + 150} y={530} fontSize={14} fill={shade(C.red, -0.4)} textAnchor="middle">
            the opposite
          </text>
        </>
      )}
      <circle cx={WEB.cx} cy={WEB.cy} r={70} fill={shade(C.purple, 0.85)} stroke={C.ink} strokeWidth={2.5} />
      <text x={WEB.cx} y={WEB.cy} textAnchor="middle" dominantBaseline="central" fontSize={word.word.length > 8 ? 20 : 24} fontWeight={800} fill={shade(C.purple, -0.25)}>
        {word.word}
      </text>
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={60} y1={40} x2={22} y2={16} stroke={C.ink} strokeWidth={2} />
      <line x1={60} y1={40} x2={98} y2={16} stroke={C.ink} strokeWidth={2} />
      <line x1={60} y1={40} x2={60} y2={70} stroke={C.ink} strokeWidth={2} />
      <rect x={6} y={8} width={34} height={16} rx={8} fill={shade(C.green, 0.75)} stroke={C.ink} strokeWidth={1.5} />
      <rect x={80} y={8} width={34} height={16} rx={8} fill={shade(C.green, 0.75)} stroke={C.ink} strokeWidth={1.5} />
      <rect x={43} y={62} width={34} height={16} rx={8} fill={shade(C.red, 0.8)} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={60} cy={40} r={16} fill={shade(C.purple, 0.85)} stroke={C.ink} strokeWidth={2} />
      <text x={60} y={44} textAnchor="middle" fontSize={11} fontWeight={800} fill={shade(C.purple, -0.25)}>word</text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

function makeQuestion(level: number): Question {
  const w = pick(WORDS);
  const others = WORDS.filter((o) => o.word !== w.word);
  if (level <= 0) {
    return {
      prompt: `What does “${w.word}” mean in this sentence?`,
      speak: `${w.sentence} What does ${w.word} mean?`,
      visual: <SentencePicture text={w.sentence} mark={w.word} />,
      choices: textChoices(
        w.means,
        others.map((o) => o.means),
      ),
      answer: w.means,
      hint: 'Look at the other words in the sentence. Which ones give you a clue?',
      explain: [`Read the sentence: “${w.sentence}”`, `The clue: ${w.clue}.`, `So “${w.word}” means ${w.means}.`],
    };
  }
  if (level === 1) {
    const askSame = Math.random() < 0.5;
    const answer = pick(askSame ? w.same : w.opposite);
    const distractors = [...(askSame ? w.opposite : w.same), ...others.flatMap((o) => [...o.same, ...o.opposite])];
    return {
      prompt: askSame ? `Which word means about the same as “${w.word}”?` : `Which word means the opposite of “${w.word}”?`,
      choices: textChoices(answer, distractors),
      answer,
      hint: `First remember what “${w.word}” means. Then test each word.`,
      explain: [
        `“${w.word}” means ${w.means}.`,
        askSame ? `“${answer}” means nearly the same thing.` : `“${answer}” means the opposite.`,
        `So the answer is “${answer}”.`,
      ],
    };
  }
  const good = fill(w.good, w.word);
  const bads = w.bad.map((b) => fill(b, w.word));
  return {
    prompt: `Which sentence uses “${w.word}” the right way?`,
    choices: textChoices(good, bads, 3),
    answer: good,
    hint: `“${w.word}” means ${w.means}. Read each sentence with that meaning in mind.`,
    explain: [
      `“${w.word}” means ${w.means}.`,
      `Try that meaning in each sentence. Only one makes sense.`,
      `“${good}”`,
    ],
  };
}

export const newWords: Lesson = {
  id: 'new-words',
  title: 'New Words',
  Thumb,
  Scene: NewWordsScene,
  sceneHint: 'Drag the meaning that fits · Then drop the word into the sentence where it makes sense',
  learn: {
    heading: 'Learning new words',
    intro:
      'Strong readers keep collecting words. When you meet a new word, the words around it often give clues. Then using the word yourself helps you remember it.',
    points: [
      { icon: Search, text: 'Look for clues in the sentence around a new word.' },
      { icon: Network, text: 'Link it to words that mean the same or the opposite.' },
      { icon: BookOpen, text: 'Use the new word in your own sentence, today and again later.' },
    ],
  },
  steps: [
    'Read the whole sentence with the new word in it.',
    'Find the clue words that hint at its meaning.',
    'Guess the meaning, then put your meaning in place of the word. Does it still make sense?',
    'Use the word in a new sentence of your own.',
  ],
  example: {
    question: '“Carry the fragile vase slowly, or it might break.” What does fragile mean?',
    work: ['Find the clue: “or it might break”.', 'Something that might break if you are not careful is easy to break.', 'Check: “Carry the easy-to-break vase slowly” makes sense.'],
    answer: 'Fragile means easy to break.',
  },
  grownups: [
    'These are “Tier 2” words: words that appear in books and many subjects but less often in everyday talk. They matter a lot for reading comprehension.',
    'Children need to meet a new word many times in different places. Use today’s word at dinner or in the car: “That puppy is so curious!”',
    'Ask your child to tell you a sentence with the new word, and talk about whether it fits.',
    'Avoid having children guess a word from a picture. Read the word first, then use the sentence to work out what it means.',
  ],
  makeQuestion,
};
