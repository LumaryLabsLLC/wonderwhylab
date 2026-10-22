import { useState } from 'react';
import { Feather, Quote, Sparkles } from 'lucide-react';
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

type Kind = 'simile' | 'metaphor' | 'idiom' | 'personification';

interface Phrase {
  text: string;
  kind: Kind;
  /** What it really means. */
  literal: string;
}

const PHRASES: Phrase[] = [
  { text: 'as busy as a bee', kind: 'simile', literal: 'very busy' },
  { text: 'She ran like the wind.', kind: 'simile', literal: 'She ran very fast.' },
  { text: 'as cold as ice', kind: 'simile', literal: 'very cold' },
  { text: 'His eyes shone like stars.', kind: 'simile', literal: 'His eyes were bright and sparkly.' },
  { text: 'The classroom was a zoo.', kind: 'metaphor', literal: 'The classroom was very noisy and wild.' },
  { text: 'The snow was a white blanket.', kind: 'metaphor', literal: 'The snow covered everything.' },
  { text: 'He is a walking dictionary.', kind: 'metaphor', literal: 'He knows lots of words.' },
  { text: 'The stars were diamonds in the sky.', kind: 'metaphor', literal: 'The stars sparkled brightly.' },
  { text: 'It’s raining cats and dogs.', kind: 'idiom', literal: 'It’s raining very hard.' },
  { text: 'Break a leg in your show!', kind: 'idiom', literal: 'Good luck in your show!' },
  { text: 'Hold your horses!', kind: 'idiom', literal: 'Wait a moment!' },
  { text: 'I’m feeling under the weather.', kind: 'idiom', literal: 'I’m feeling a bit ill.' },
  { text: 'Don’t spill the beans.', kind: 'idiom', literal: 'Don’t tell the secret.' },
  { text: 'The wind whispered through the trees.', kind: 'personification', literal: 'The wind blew softly through the trees.' },
  { text: 'The sun smiled down on us.', kind: 'personification', literal: 'It was sunny and warm.' },
  { text: 'The old car groaned up the hill.', kind: 'personification', literal: 'The old car made loud, struggling noises.' },
  { text: 'The leaves danced in the breeze.', kind: 'personification', literal: 'The leaves moved about in the wind.' },
];

const KINDS: { kind: Kind; name: string; rule: string; color: string }[] = [
  { kind: 'simile', name: 'Simile', rule: 'compares using “like” or “as”', color: C.blue },
  { kind: 'metaphor', name: 'Metaphor', rule: 'says one thing IS another', color: C.purple },
  { kind: 'idiom', name: 'Idiom', rule: 'a saying that means something else', color: C.orange },
  { kind: 'personification', name: 'Personification', rule: 'gives human actions to things', color: C.green },
];

const NAME: Record<Kind, string> = { simile: 'Simile', metaphor: 'Metaphor', idiom: 'Idiom', personification: 'Personification' };

const WHY: Record<Kind, string> = {
  simile: 'It compares two things using “like” or “as”.',
  metaphor: 'It says one thing is another thing, without “like” or “as”.',
  idiom: 'It is a common saying. The words don’t mean what they say.',
  personification: 'It gives a thing a human action, like whispering or smiling.',
};

const BIN_W = 222;
const binRect = (i: number): Rect => ({ x: 30 + i * (BIN_W + 10), y: 300, w: BIN_W, h: 350 });
const SLOT_X = [210, 500, 790];
const VISIBLE = 3;

function FigurativeScene() {
  const [deck, setDeck] = useState<Phrase[]>(() => shuffle(PHRASES).slice(0, 12));
  const [placed, setPlaced] = useState<Record<Kind, Phrase[]>>({ simile: [], metaphor: [], idiom: [], personification: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [message, setMessage] = useState<{ title: string; text: string } | null>(null);
  const [shown, setShown] = useState<Phrase | null>(null);

  const visible = deck.slice(0, VISIBLE);
  const done = deck.length === 0;

  const place = (p: Phrase, kind: Kind) => {
    if (p.kind === kind) {
      setDeck(deck.filter((d) => d.text !== p.text));
      setPlaced({ ...placed, [kind]: [...placed[kind], p] });
      setShown(p);
      setMessage({ title: `Yes, a ${NAME[kind].toLowerCase()}!`, text: `${WHY[kind]} It really means: ${p.literal}` });
      setSelected(null);
      play('correct');
    } else {
      setShake(p.text);
      window.setTimeout(() => setShake(null), 460);
      setMessage({ title: `Not a ${NAME[kind].toLowerCase()} yet. Look again.`, text: `Clue: a ${NAME[kind].toLowerCase()} ${KINDS.find((k) => k.kind === kind)!.rule}.` });
      play('wrong');
    }
  };

  const onDrop = (p: Phrase, c: Pt) => {
    const i = KINDS.findIndex((_, k) => inRect(c, binRect(k)));
    if (i >= 0) place(p, KINDS[i].kind);
  };

  const reset = () => {
    setDeck(shuffle(PHRASES).slice(0, 12));
    setPlaced({ simile: [], metaphor: [], idiom: [], personification: [] });
    setMessage(null);
    setShown(null);
    setSelected(null);
  };

  return (
    <SceneSvg label="Sort figurative language into four boxes">
      <text x={40} y={46} fontSize={20} fontWeight={700} fill={C.ink}>
        Drag each phrase into its box. Tap a sorted phrase to see what it really means.
      </text>

      {/* Message strip */}
      <rect x={30} y={172} width={940} height={104} rx={16} fill={message?.title.startsWith('Yes') ? shade(C.green, 0.85) : shade(C.yellow, 0.82)} stroke={C.line} strokeWidth={2} />
      {done ? (
        <>
          <text x={54} y={210} fontSize={21} fontWeight={700} fill={C.ink}>
            All sorted! Great careful thinking.
          </text>
          <text x={54} y={242} fontSize={17} fill={C.ink2}>
            Tap any phrase in the boxes to see what it really means.
          </text>
        </>
      ) : message ? (
        <>
          <text x={54} y={208} fontSize={20} fontWeight={700} fill={C.ink}>
            {message.title}
          </text>
          {wrap(message.text, 80).map((line, i) => (
            <text key={i} x={54} y={238 + i * 24} fontSize={16} fill={C.ink2}>
              {line}
            </text>
          ))}
        </>
      ) : (
        <>
          <text x={54} y={210} fontSize={20} fontWeight={700} fill={C.ink}>
            Is it a simile, metaphor, idiom or personification?
          </text>
          <text x={54} y={242} fontSize={16} fill={C.ink2}>
            Read each box’s rule first. Then sort the phrases above.
          </text>
        </>
      )}
      {shown && (
        <SvgButton x={830} y={186} w={124} h={44} fontSize={15} label="Say it" onClick={() => speak(`${shown.text} That means: ${shown.literal}`, { force: true })} />
      )}

      {/* Bins */}
      {KINDS.map((k, i) => {
        const r = binRect(i);
        return (
          <g key={k.kind}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill={shade(k.color, 0.86)} stroke={k.color} strokeWidth={2.5} />
            <text x={r.x + 14} y={r.y + 32} fontSize={k.kind === 'personification' ? 18 : 21} fontWeight={800} fill={shade(k.color, -0.35)}>
              {k.name}
            </text>
            {wrap(k.rule, 26).map((line, j) => (
              <text key={j} x={r.x + 14} y={r.y + 56 + j * 19} fontSize={14} fill={C.ink2}>
                {line}
              </text>
            ))}
            {placed[k.kind].slice(-4).map((p, j) => (
              <g
                key={p.text}
                onClick={() => {
                  setShown(p);
                  setMessage({ title: `“${p.text}”`, text: `It really means: ${p.literal}` });
                  play('tap');
                }}
                style={{ cursor: 'pointer' }}
                data-nopan
                role="button"
                aria-label={`${p.text}. Tap to see what it means`}
              >
                <rect x={r.x + 10} y={r.y + 100 + j * 60} width={r.w - 20} height={52} rx={10} fill={shown?.text === p.text ? shade(C.yellow, 0.6) : C.card} stroke={C.line} strokeWidth={1.5} />
                {wrap(p.text, 24).slice(0, 2).map((line, n) => (
                  <text key={n} x={r.x + 20} y={r.y + 122 + j * 60 + n * 18} fontSize={14} fill={C.ink}>
                    {line}
                  </text>
                ))}
              </g>
            ))}
          </g>
        );
      })}

      {/* Phrase cards */}
      {visible.map((p, i) => (
        <DragChip
          key={p.text}
          x={SLOT_X[i]}
          y={108}
          w={270}
          h={86}
          lines={wrap(p.text, 22)}
          label={`Phrase: ${p.text}`}
          fontSize={18}
          selected={selected === p.text}
          shake={shake === p.text}
          onDrop={(c) => onDrop(p, c)}
          onTap={() => {
            setSelected(selected === p.text ? null : p.text);
            play('tap');
          }}
        />
      ))}
      {selected &&
        KINDS.map((k, i) => {
          const r = binRect(i);
          const p = deck.find((d) => d.text === selected);
          return (
            <rect
              key={`t-${k.kind}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={18}
              fill="transparent"
              stroke={C.orange}
              strokeWidth={3}
              strokeDasharray="10 8"
              style={{ cursor: 'pointer' }}
              data-nopan
              onClick={() => p && place(p, k.kind)}
            />
          );
        })}
      {done && <SvgButton x={830} y={232} w={124} h={40} fontSize={15} label="New set" onClick={reset} />}

      <Callout at={[210, 108]} box={[600, 4]} w={300} icon={Quote} title="Figurative language" text="Words that mean more than they say, to paint a picture in your mind." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={10} width={108} height={26} rx={8} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={60} y={27} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>raining cats and dogs</text>
      {[C.blue, C.purple, C.orange, C.green].map((c, i) => (
        <rect key={c} x={8 + i * 27} y={46} width={23} height={28} rx={5} fill={shade(c, 0.6)} stroke={c} strokeWidth={2} />
      ))}
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const kind = pick<Kind>(['simile', 'personification', 'metaphor']);
    const right = pick(PHRASES.filter((p) => p.kind === kind));
    const others = KINDS.filter((k) => k.kind !== kind).map((k) => pick(PHRASES.filter((p) => p.kind === k.kind)));
    return {
      prompt: `Which one is ${kind === 'personification' ? 'personification' : `a ${kind}`}?`,
      choices: shuffle([right, ...others]).map((p) => ({ value: p.text })),
      answer: right.text,
      hint: `Remember: ${kind === 'personification' ? 'personification' : `a ${kind}`} ${KINDS.find((k) => k.kind === kind)!.rule}.`,
      explain: [WHY[kind], `“${right.text}” fits that rule.`, `The others are a different kind of figurative language.`],
    };
  }
  if (level === 1) {
    const p = pick(PHRASES);
    return {
      prompt: `What kind of figurative language is this?`,
      visual: <Passage text={`*${p.text}*`} />,
      choices: KINDS.map((k) => ({ value: k.name })),
      answer: NAME[p.kind],
      hint: 'Look for “like” or “as”, a thing doing a human action, or a common saying.',
      explain: [`“${p.text}”`, WHY[p.kind], `So it is ${p.kind === 'idiom' ? 'an idiom' : p.kind === 'personification' ? 'personification' : `a ${p.kind}`} (${NAME[p.kind]}).`],
    };
  }
  const p = pick(PHRASES);
  const others = shuffle(PHRASES.filter((o) => o.text !== p.text && o.literal !== p.literal)).slice(0, 2);
  return {
    prompt: `What does this really mean?`,
    visual: <Passage text={`*${p.text}*`} />,
    choices: shuffle([p, ...others]).map((o) => ({ value: o.literal })),
    answer: p.literal,
    hint: 'Picture it, then ask: what is the writer really telling us?',
    explain: [`“${p.text}” is ${p.kind === 'idiom' ? 'an idiom' : p.kind === 'personification' ? 'personification' : `a ${p.kind}`}.`, WHY[p.kind], `It really means: “${p.literal}”`],
  };
}

export const figurativeLanguage: Lesson = {
  id: 'figurative-language',
  title: 'Figurative Language',
  Thumb,
  Scene: FigurativeScene,
  sceneHint: 'Drag each phrase into its box · Tap sorted phrases for their meaning',
  learn: {
    heading: 'Figurative language',
    intro:
      'Writers often use words in a non-literal way to make writing more vivid. “It’s raining cats and dogs” doesn’t mean pets are falling from the sky!',
    points: [
      { icon: Quote, text: 'Simile: compares with like or as. “as busy as a bee”.' },
      { icon: Sparkles, text: 'Metaphor: says one thing is another. “The classroom was a zoo.”' },
      { icon: Feather, text: 'Personification gives things human actions; an idiom is a saying with a hidden meaning.' },
    ],
  },
  steps: [
    'Ask: could this really, literally happen?',
    'If not, look for “like” or “as” (simile) or “is/was” (metaphor).',
    'Check if a thing is doing a human action (personification) or if it is a known saying (idiom).',
    'Say what the writer really means in plain words.',
  ],
  example: {
    question: 'What does “The classroom was a zoo” really mean?',
    visual: <Passage text="*The classroom was a zoo.*" />,
    work: ['A classroom can’t really be a zoo, so it is figurative.', 'It says the classroom WAS a zoo, without like or as: a metaphor.', 'Zoos are noisy and wild, so the classroom was noisy and wild.'],
    answer: 'The classroom was very noisy and wild.',
  },
  grownups: [
    'Idioms can be especially tricky for children learning English as an additional language; talk about where a saying might come from.',
    'Collect figurative language from favourite books and draw the literal picture for a laugh.',
    'Ask why a writer chose a simile instead of plain words; it builds an author’s-craft mindset.',
  ],
  makeQuestion,
};
