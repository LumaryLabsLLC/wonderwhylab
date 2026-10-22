import { useState } from 'react';
import { Ear, Eye, Hand, ShoppingBag } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { EmojiPicture, SceneEmoji } from './visuals/Emoji';
import { DragToken } from './visuals/DragToken';
import { EMOJI_FONT } from '../../../games/reading/words';
import { MessageBox } from './visuals/MessageBox';

type Sense = 'see' | 'hear' | 'smell' | 'taste' | 'touch';

const SENSES: { id: Sense; emoji: string; part: string; parts: string; verb: string; word: string }[] = [
  { id: 'see', emoji: '👀', part: 'eyes', parts: 'Eyes', verb: 'see', word: 'sight' },
  { id: 'hear', emoji: '👂', part: 'ears', parts: 'Ears', verb: 'hear', word: 'hearing' },
  { id: 'smell', emoji: '👃', part: 'nose', parts: 'Nose', verb: 'smell', word: 'smell' },
  { id: 'taste', emoji: '👅', part: 'tongue', parts: 'Tongue', verb: 'taste', word: 'taste' },
  { id: 'touch', emoji: '✋', part: 'hands and skin', parts: 'Hands', verb: 'feel', word: 'touch' },
];
const senseOf = (id: Sense) => SENSES.find((s) => s.id === id)!;

/** Each card is about one property, so exactly one sense is the best fit. */
interface Clue {
  emoji: string;
  text: string;
  sense: Sense;
}
const CARDS: Clue[] = [
  { emoji: '🌈', text: 'the colours of a rainbow', sense: 'see' },
  { emoji: '🔔', text: 'a bell ringing', sense: 'hear' },
  { emoji: '🌸', text: 'a flower’s sweet smell', sense: 'smell' },
  { emoji: '🍋', text: 'a lemon’s sour taste', sense: 'taste' },
  { emoji: '🐱', text: 'a kitten’s soft fur', sense: 'touch' },
];
/** Shuffled so the cards don't line up with their senses. */
const CARD_ORDER = [2, 4, 0, 3, 1];

// The mystery bag: listen, feel and sniff, then guess.
interface Mystery {
  emoji: string;
  name: string;
  shake: string;
  feel: string;
  sniff: string;
  because: string;
}
const MYSTERIES: Mystery[] = [
  { emoji: '🔔', name: 'Bell', shake: 'Ding-a-ling!', feel: 'hard and smooth', sniff: 'no smell', because: 'It went ding-a-ling and felt hard and smooth: a bell!' },
  { emoji: '🍊', name: 'Orange', shake: 'a soft thump', feel: 'round and bumpy', sniff: 'fresh and fruity', because: 'It felt round and bumpy and smelled fruity: an orange!' },
  { emoji: '🧸', name: 'Teddy', shake: 'no sound', feel: 'soft and fluffy', sniff: 'no smell', because: 'It felt soft and fluffy and made no sound: a teddy!' },
  { emoji: '🍌', name: 'Banana', shake: 'a soft thump', feel: 'long and curved', sniff: 'sweet and fruity', because: 'It felt long and curved and smelled sweet: a banana!' },
];

const STATION = (i: number): Pt => ({ x: 110, y: 96 + i * 118 });
const CARD = (k: number): Pt => ({ x: 420, y: 96 + k * 108 });
const BAG = { x: 790, y: 120 };

function SensesScene() {
  const [placed, setPlaced] = useState<Partial<Record<number, boolean>>>({});
  const [drag, setDrag] = useState<{ card: number; p: Pt } | null>(null);
  const [message, setMessage] = useState('Drag each card to the sense you use for it.');
  const [wobble, setWobble] = useState<number | null>(null);

  // Mystery bag
  const [mi, setMi] = useState(0);
  const [clues, setClues] = useState<Partial<Record<'shake' | 'feel' | 'sniff', boolean>>>({});
  const [guess, setGuess] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [options] = useState(() => MYSTERIES.map((m, i) => shuffle([m.name, ...shuffle(MYSTERIES.filter((_, j) => j !== i)).slice(0, 2).map((o) => o.name)])));
  const mystery = MYSTERIES[mi];

  const drop = (card: number, p: Pt) => {
    const c = CARDS[card];
    const hit = SENSES.findIndex((_, i) => Math.hypot(p.x - STATION(i).x, p.y - STATION(i).y) < 70);
    if (hit < 0) return;
    const s = SENSES[hit];
    if (s.id === c.sense) {
      setPlaced({ ...placed, [card]: true });
      play('correct');
      setMessage(`Yes! You ${s.verb} ${c.text} with your ${s.part}.`);
    } else {
      play('wrong');
      setWobble(card);
      window.setTimeout(() => setWobble((w) => (w === card ? null : w)), 500);
      setMessage(`Hmm, can you ${s.verb} ${c.text} with your ${s.part}? Try another sense.`);
    }
  };

  const clue = (k: 'shake' | 'feel' | 'sniff') => {
    setClues({ ...clues, [k]: true });
    play('tap');
  };

  const nextMystery = () => {
    setMi((mi + 1) % MYSTERIES.length);
    setClues({});
    setGuess(null);
    setOpened(false);
  };

  const clueText = [
    clues.shake && `Shake: ${mystery.shake}`,
    clues.feel && `Feel: ${mystery.feel}`,
    clues.sniff && `Sniff: ${mystery.sniff}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SceneSvg label="Five senses: match things to the sense you use, and a mystery bag to explore">
      {/* Sense stations */}
      {SENSES.map((s, i) => {
        const at = STATION(i);
        const got = CARDS.map((c, k) => (placed[k] && c.sense === s.id ? c : null)).filter(Boolean) as Clue[];
        return (
          <g key={s.id}>
            <circle cx={at.x} cy={at.y} r={46} fill={shade(C.teal, 0.82)} stroke={C.ink} strokeWidth={2.5} />
            <SceneEmoji emoji={s.emoji} x={at.x} y={at.y - 4} size={44} />
            <text x={at.x} y={at.y + 60} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {s.parts}
            </text>
            {got.map((c, j) => (
              <SceneEmoji key={c.emoji} emoji={c.emoji} x={at.x + 78 + j * 44} y={at.y} size={36} />
            ))}
          </g>
        );
      })}

      {/* Cards to sort */}
      <text x={300} y={52} fontSize={16} fill={C.muted} className="caps">
        Which sense do you use?
      </text>
      {CARD_ORDER.map((card, k) => {
        if (placed[card]) return null;
        const c = CARDS[card];
        return (
          <g key={card} className={wobble === card ? 'sl-nope' : undefined}>
            <DragToken at={CARD(k)} r={50} label={c.text} dragging={drag?.card === card} onMove={(p) => setDrag({ card, p })} onDrop={(p) => { setDrag(null); drop(card, p); }}>
              <CardFace c={c} />
            </DragToken>
          </g>
        );
      })}
      <MessageBox x={300} y={600} w={300} h={66} text={message} max={34} size={15} />

      {/* Mystery bag */}
      <text x={630} y={52} fontSize={16} fill={C.muted} className="caps">
        Mystery bag
      </text>
      <g transform={`translate(${BAG.x} ${BAG.y})`}>
        {opened ? (
          <SceneEmoji emoji={mystery.emoji} x={0} y={0} size={96} />
        ) : (
          <g>
            <path d="M-62,-30 C-70,40 -50,66 0,66 C50,66 70,40 62,-30 Z" fill="#c99a5b" stroke={C.ink} strokeWidth={3} />
            <path d="M-56,-30 C-30,-46 30,-46 56,-30" fill="none" stroke={C.ink} strokeWidth={3} />
            <path d="M-20,-38 C-30,-60 -6,-66 0,-48 C6,-66 30,-60 20,-38" fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
            <text y={22} textAnchor="middle" fontSize={44} fontWeight={700} fill={shade('#c99a5b', -0.45)}>
              ?
            </text>
          </g>
        )}
      </g>
      <SvgButton x={630} y={214} w={104} h={52} fontSize={17} label="👂 Shake" title="Shake the bag and listen" onClick={() => clue('shake')} disabled={opened} />
      <SvgButton x={743} y={214} w={104} h={52} fontSize={17} label="✋ Feel" title="Feel inside the bag" onClick={() => clue('feel')} disabled={opened} />
      <SvgButton x={856} y={214} w={104} h={52} fontSize={17} label="👃 Sniff" title="Sniff the bag" onClick={() => clue('sniff')} disabled={opened} />
      <MessageBox x={630} y={282} w={330} h={92} text={clueText || 'Use your senses to find clues!'} max={34} size={15} />
      {opened ? (
        <ExplainCard x={630} y={390} w={330} prediction={guess} actual={mystery.name} because={mystery.because} onAgain={nextMystery} />
      ) : (
        <>
          <PredictCard x={630} y={390} w={330} question="What is in the bag?" options={options[mi]} prediction={guess} onPredict={setGuess} />
          <SvgButton
            x={630}
            y={536}
            w={330}
            h={52}
            fontSize={18}
            label="Open the bag"
            onClick={() => {
              setOpened(true);
              play('pop');
            }}
            disabled={!guess}
            color={C.teal}
            textColor={C.white}
          />
        </>
      )}

      {drag && (
        <g transform={`translate(${drag.p.x} ${drag.p.y})`} pointerEvents="none">
          <CardFace c={CARDS[drag.card]} />
        </g>
      )}

      <Callout at={[110, 96]} box={[150, 26]} icon={Eye} title="Five senses" text="See, hear, smell, taste and touch." w={220} />
      <Callout at={[BAG.x, BAG.y + 40]} box={[630, 610]} icon={ShoppingBag} title="Senses help you find out" text="You can learn about things without even seeing them!" w={330} />
    </SceneSvg>
  );
}

function CardFace({ c }: { c: Clue }) {
  return (
    <g>
      <rect x={-120} y={-40} width={240} height={80} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <SceneEmoji emoji={c.emoji} x={-80} y={0} size={44} />
      <text x={-46} y={0} dominantBaseline="central" fontSize={15} fontWeight={600} fill={C.ink}>
        {c.text.length > 17 ? (
          <>
            <tspan x={-46} dy="-0.6em">
              {c.text.split(' ').slice(0, Math.ceil(c.text.split(' ').length / 2)).join(' ')}
            </tspan>
            <tspan x={-46} dy="1.2em">
              {c.text.split(' ').slice(Math.ceil(c.text.split(' ').length / 2)).join(' ')}
            </tspan>
          </>
        ) : (
          c.text
        )}
      </text>
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {['👀', '👂', '👃', '👅', '✋'].map((e, i) => (
        <text key={e} x={14 + i * 23} y={44} textAnchor="middle" dominantBaseline="central" fontSize={20} fontFamily={EMOJI_FONT}>
          {e}
        </text>
      ))}
    </svg>
  );
}

const SENSE_CHOICE = (s: (typeof SENSES)[number]) => ({ value: s.id, name: s.word, label: <EmojiPicture emoji={s.emoji} caption={s.parts} /> });

function makeQuestion(level: number): Question {
  if (level === 0) {
    const s = pick(SENSES);
    const options = shuffle([s, ...shuffle(SENSES.filter((o) => o.id !== s.id)).slice(0, 2)]);
    return {
      prompt: `Which part of you helps you ${s.verb}?`,
      choices: options.map((o) => ({ value: o.id, name: o.part, label: <EmojiPicture emoji={o.emoji} caption={o.parts} /> })),
      answer: s.id,
      hint: `Point to the part of your body you would use to ${s.verb}.`,
      explain: [`To ${s.verb}, you use your ${s.part}.`, `That is your sense of ${s.word}.`, `So the answer is your ${s.part}.`],
    };
  }
  if (level === 1) {
    const c = pick(CARDS);
    const s = senseOf(c.sense);
    const options = shuffle([s, ...shuffle(SENSES.filter((o) => o.id !== s.id)).slice(0, 2)]);
    return {
      prompt: `Which sense tells you about ${c.text}?`,
      visual: <EmojiPicture emoji={c.emoji} />,
      choices: options.map(SENSE_CHOICE),
      answer: s.id,
      hint: 'Do you see it, hear it, smell it, taste it or feel it?',
      explain: [`You ${s.verb} ${c.text}.`, `You ${s.verb} with your ${s.part}.`, `So it is your sense of ${s.word}.`],
    };
  }
  const kind = pick(['cold', 'count', 'dark'] as const);
  if (kind === 'count') {
    return {
      prompt: 'How many senses do you have?',
      choices: shuffle(['3', '5', '7']).map((v) => ({ value: v })),
      answer: '5',
      hint: 'Count them: see, hear, smell, taste, touch.',
      explain: ['See, hear, smell, taste and touch.', 'That makes 1, 2, 3, 4, 5.', 'You have 5 senses.'],
    };
  }
  if (kind === 'cold') {
    const smell = senseOf('smell');
    return {
      prompt: 'You have a cold and a blocked nose. Which sense is hard to use?',
      visual: <EmojiPicture emoji="🤧" />,
      choices: shuffle([smell, senseOf('see'), senseOf('hear')]).map(SENSE_CHOICE),
      answer: 'smell',
      hint: 'Which sense uses your nose?',
      explain: ['A blocked nose can’t take in smells well.', 'Your nose is for your sense of smell.', 'So smell is hard to use.'],
    };
  }
  const hear = senseOf('hear');
  return {
    prompt: 'It is dark and you can’t see the bird. How do you know it is singing?',
    visual: <EmojiPicture emoji="🐦" />,
    choices: shuffle([hear, senseOf('taste'), senseOf('smell')]).map(SENSE_CHOICE),
    answer: 'hear',
    hint: 'Singing is a sound.',
    explain: ['Singing makes a sound.', 'You hear sounds with your ears.', 'So you use your hearing.'],
  };
}

export const fiveSenses: Lesson = {
  id: 'five-senses',
  title: 'My Five Senses',
  Thumb,
  Scene: SensesScene,
  sceneHint: 'Drag each card to a sense · Shake, feel and sniff the mystery bag, then guess',
  learn: {
    heading: 'My five senses',
    intro: 'Your senses tell you about the world. You see with your eyes, hear with your ears, smell with your nose, taste with your tongue and feel with your skin.',
    points: [
      { icon: Eye, text: 'See, hear, smell, taste, touch: five senses!' },
      { icon: Ear, text: 'Each sense uses a part of your body.' },
      { icon: Hand, text: 'Scientists use their senses to find things out.' },
    ],
  },
  steps: ['Look at a card. What is it about?', 'Think: do you see it, hear it, smell it, taste it or feel it?', 'Drag it to that sense.', 'Then use your senses on the mystery bag and guess!'],
  example: {
    question: 'Which sense tells you a bell is ringing?',
    visual: <EmojiPicture emoji="🔔" />,
    work: ['A ringing bell makes a sound.', 'You hear sounds with your ears.'],
    answer: 'Your sense of hearing!',
  },
  grownups: [
    'Play “I spy”, “I hear”, and “I smell” games around the house and outside.',
    'Make a real mystery bag with safe objects and let your child shake, feel and sniff before guessing.',
    'Only taste things a grown-up says are food. Talk about why we never taste unknown things.',
    'Ask “how do you know?” It builds the habit of using evidence.',
  ],
  makeQuestion,
};
