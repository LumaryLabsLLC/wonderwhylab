import { useMemo, useState } from 'react';
import { BookOpen, CaseUpper, Image as ImageIcon } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragTile, LetterTile, TileFace } from './visuals/Tiles';
import { ANIMAL_EMOJI, IN_PLACES, PicCard, PicGroup, describe, sameSpec } from './visuals/Pictures';
import type { Animal, PicSpec, Place } from './visuals/Pictures';

interface Sentence {
  words: string[];
  pic: PicSpec;
}

/** Decodable sentences: short-vowel words plus a few heart words (the, a, is, on, in). */
const SENTENCES: Sentence[] = [
  { words: ['The', 'cat', 'sat', 'on', 'the', 'mat.'], pic: { animal: 'cat', place: 'mat', rel: 'on' } },
  { words: ['The', 'dog', 'is', 'in', 'the', 'box.'], pic: { animal: 'dog', place: 'box', rel: 'in' } },
  { words: ['A', 'bug', 'is', 'on', 'the', 'rug.'], pic: { animal: 'bug', place: 'rug', rel: 'on' } },
  { words: ['The', 'pig', 'is', 'in', 'the', 'mud.'], pic: { animal: 'pig', place: 'mud', rel: 'in' } },
  { words: ['The', 'hen', 'sat', 'on', 'an', 'egg.'], pic: { animal: 'hen', place: 'egg', rel: 'on' } },
  { words: ['A', 'fox', 'sat', 'on', 'a', 'log.'], pic: { animal: 'fox', place: 'log', rel: 'on' } },
  { words: ['The', 'cat', 'is', 'in', 'the', 'box.'], pic: { animal: 'cat', place: 'box', rel: 'in' } },
  { words: ['The', 'dog', 'sat', 'on', 'the', 'bed.'], pic: { animal: 'dog', place: 'bed', rel: 'on' } },
];

const ANIMALS = Object.keys(ANIMAL_EMOJI) as Animal[];
const ON_PLACES: Place[] = ['mat', 'rug', 'log', 'bed', 'box'];

/** Two wrong pictures: one with a different animal, one with a different place (or in/on swapped). */
export function distractors(pic: PicSpec, flipRel: boolean): PicSpec[] {
  const animal = pick(ANIMALS.filter((a) => a !== pic.animal));
  const otherAnimal: PicSpec = { ...pic, animal };
  let other: PicSpec;
  if (flipRel && IN_PLACES.includes(pic.place)) {
    other = { ...pic, rel: pic.rel === 'in' ? 'on' : 'in' };
  } else {
    const places = (pic.rel === 'in' ? IN_PLACES : ON_PLACES).filter((p) => p !== pic.place);
    other = { ...pic, place: pick(places) };
  }
  return [otherAnimal, other].filter((d) => !sameSpec(d, pic));
}

const SLOT_Y = 126;
const TRAY_Y = 236;
const SLOT_W = 132;
const slotX = (i: number, n: number) => 500 - (n * SLOT_W + (n - 1) * 12) / 2 + SLOT_W / 2 + i * (SLOT_W + 12);

function shuffledTokens(words: string[]): number[] {
  const order = words.map((_, i) => i);
  for (let tries = 0; tries < 10; tries++) {
    const s = shuffle(order);
    if (s.some((v, i) => v !== i)) return s;
  }
  return order.reverse();
}

function SentenceScene() {
  const [index, setIndex] = useState(0);
  const sentence = SENTENCES[index];
  const n = sentence.words.length;
  const tray = useMemo(() => shuffledTokens(sentence.words), [index]);
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [shake, setShake] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [wrongPics, setWrongPics] = useState<number[]>([]);
  const cards = useMemo(() => shuffle([sentence.pic, ...distractors(sentence.pic, true)]), [index]);

  const built = slots.every((s) => s !== null);
  const correct = built && slots.every((s, i) => sentence.words[s!] === sentence.words[i]);
  const firstWrong = built && !correct ? slots.findIndex((s, i) => sentence.words[s!] !== sentence.words[i]) : -1;
  const solved = picked !== null && sameSpec(cards[picked], sentence.pic);

  const putIn = (token: number, slot: number) => {
    const next = slots.map((s) => (s === token ? null : s));
    next[slot] = token;
    setSlots(next);
    play('tap');
  };
  const tapToken = (token: number) => {
    const empty = slots.findIndex((s) => s === null);
    if (empty >= 0) putIn(token, empty);
  };
  const dropToken = (token: number, p: Pt) => {
    const slot = sentence.words.findIndex((_, i) => Math.abs(p.x - slotX(i, n)) < SLOT_W / 2 + 6 && Math.abs(p.y - SLOT_Y) < 60);
    if (slot >= 0) putIn(token, slot);
    else setShake({ ...shake, [token]: (shake[token] ?? 0) + 1 });
  };
  const takeOut = (slot: number) => {
    if (correct) return;
    const next = [...slots];
    next[slot] = null;
    setSlots(next);
  };
  const choosePic = (i: number) => {
    if (solved) return;
    setPicked(i);
    if (sameSpec(cards[i], sentence.pic)) play('correct');
    else {
      play('wrong');
      setWrongPics([...wrongPics, i]);
    }
  };
  const next = () => {
    const ni = (index + 1) % SENTENCES.length;
    setIndex(ni);
    setSlots(Array(SENTENCES[ni].words.length).fill(null));
    setPicked(null);
    setWrongPics([]);
    setShake({});
  };

  let status = 'Drag the words into order. Tap a word to send it to the next gap.';
  if (built && !correct) {
    const w = sentence.words[slots[firstWrong]!];
    status =
      firstWrong === 0
        ? 'A sentence starts with a capital letter. Which word has one?'
        : firstWrong === n - 1 || w.endsWith('.')
          ? 'The word with the full stop goes at the end.'
          : 'Read it from the start — does it make sense? Tap a word to take it out.';
  } else if (correct && picked === null) status = 'You built it! Read it, then pick the picture that matches.';
  else if (correct && !solved) status = 'Not that one. Read the sentence again — who is it, and where?';
  else if (solved) status = `Yes! “${sentence.words.join(' ')}”`;

  return (
    <SceneSvg label={`Build the sentence: ${sentence.words.join(' ')}`}>
      <text x={500} y={52} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink}>
        Build the sentence, then find its picture
      </text>

      {/* Slots */}
      {sentence.words.map((_, i) => {
        const t = slots[i];
        return t === null ? (
          <LetterTile key={i} x={slotX(i, n)} y={SLOT_Y} w={SLOT_W} h={74} fontSize={30} text="" dashed />
        ) : (
          <g key={i} onClick={() => takeOut(i)} style={{ cursor: correct ? 'default' : 'pointer' }} data-nopan role="button" aria-label={`${sentence.words[t]} — tap to take it out`}>
            <LetterTile
              x={slotX(i, n)}
              y={SLOT_Y}
              w={SLOT_W}
              h={74}
              fontSize={32}
              text={sentence.words[t]}
              color={correct ? shade(C.green, 0.7) : i === firstWrong ? shade(C.red, 0.75) : C.card}
            />
          </g>
        );
      })}

      {/* Word cards still to place */}
      {tray.map((token, k) =>
        slots.includes(token) ? null : (
          <DragTile key={`${index}-${token}`} x={slotX(k, n)} y={TRAY_Y} label={`Word ${sentence.words[token]}`} shakeKey={shake[token] ?? 0} onDrop={(p) => dropToken(token, p)} onTap={() => tapToken(token)}>
            <TileFace text={sentence.words[token]} w={SLOT_W} h={74} fontSize={32} color={shade(C.yellow, 0.7)} />
          </DragTile>
        ),
      )}

      <text x={74} y={322} fontSize={19} fontWeight={600} fill={solved ? '#1f7a4a' : C.ink2}>
        {status}
      </text>
      {correct && <SvgButton x={690} y={338} w={130} h={50} fontSize={18} label="Read it" color={C.teal} textColor={C.white} onClick={() => speak(sentence.words.join(' '), { force: true })} />}
      <SvgButton x={834} y={338} w={130} h={50} fontSize={18} label={solved ? 'Next' : 'Skip'} color={solved ? C.yellow : C.card} onClick={next} />

      {/* Picture choices (the area is reserved from the start so the playground keeps its size) */}
      {!correct && (
        <g>
          <rect x={110} y={408} width={780} height={190} rx={18} fill="none" stroke={C.line} strokeWidth={2.5} strokeDasharray="10 8" />
          <text x={500} y={503} textAnchor="middle" dominantBaseline="central" fontSize={18} fill={C.muted}>
            Pictures appear here when the sentence is built.
          </text>
        </g>
      )}
      {correct &&
        cards.map((spec, i) => {
          const x = 110 + i * 270;
          const isRight = solved && i === picked;
          const isWrong = wrongPics.includes(i);
          return (
            <g key={i} onClick={() => choosePic(i)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={describe(spec)} className="fade-up">
              <rect x={x + 4} y={408 + 6} width={240} height={190} rx={18} fill={C.ink} opacity={0.1} />
              <rect x={x} y={408} width={240} height={190} rx={18} fill={isRight ? shade(C.green, 0.75) : isWrong ? '#f1f1f1' : 'white'} stroke={isRight ? C.green : C.ink} strokeWidth={isRight ? 4 : 2.5} />
              <g transform={`translate(${x + 10} ${418}) scale(1.375)`} opacity={isWrong ? 0.4 : 1}>
                <PicGroup spec={spec} />
              </g>
            </g>
          );
        })}

      {!correct && <Callout at={[slotX(0, n), SLOT_Y + 37]} box={[74, 430]} w={230} icon={CaseUpper} title="Capital first" text="A sentence starts with a capital letter." />}
      {!correct && <Callout at={[slotX(n - 1, n), SLOT_Y + 37]} box={[696, 430]} w={230} icon={BookOpen} title="Full stop last" text="It ends with a full stop (.)" />}
      {correct && <Callout at={[110, 500]} box={[16, 616]} w={260} icon={ImageIcon} title="Read, then look" text="Read every word first. Then check who it is and where." />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {['The', 'cat', 'sat.'].map((w, i) => (
        <g key={w}>
          <rect x={6 + i * 38} y={12} width={34} height={22} rx={5} fill={shade(C.yellow, 0.6)} stroke={C.ink} strokeWidth={1.5} />
          <text x={23 + i * 38} y={24} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={C.ink}>
            {w}
          </text>
        </g>
      ))}
      <g transform="translate(26 36) scale(0.42)">
        <PicGroup spec={{ animal: 'cat', place: 'mat', rel: 'on' }} />
      </g>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

/** "Which word makes sense?" — every option is decodable; only one fits. */
const GAPS: { text: string; answer: string; others: [string, string] }[] = [
  { text: 'The cat sat on the ___.', answer: 'mat', others: ['mad', 'met'] },
  { text: 'The pig is in the ___.', answer: 'mud', others: ['mad', 'mid'] },
  { text: 'A bug is on the ___.', answer: 'rug', others: ['run', 'red'] },
  { text: 'The dog is in the ___.', answer: 'box', others: ['big', 'bet'] },
  { text: 'The hen sat on an ___.', answer: 'egg', others: ['and', 'ask'] },
  { text: 'A fox sat on a ___.', answer: 'log', others: ['let', 'lip'] },
];

const sentenceText = (s: Sentence) => s.words.join(' ');

function makeQuestion(level: number): Question {
  if (level <= 1) {
    const s = pick(SENTENCES);
    const options = shuffle([s.pic, ...distractors(s.pic, level === 1)]);
    return {
      prompt: `Read: “${sentenceText(s)}” Which picture matches?`,
      speak: 'Read the sentence. Which picture matches?',
      choices: options.map((spec) => ({ value: describe(spec), name: describe(spec), label: <PicCard spec={spec} /> })),
      answer: describe(s.pic),
      hint: 'Read every word. Who is it? Where is it?',
      explain: [
        `Read it word by word: ${sentenceText(s)}`,
        `It is a ${s.pic.animal}, and it is ${s.pic.rel} the ${s.pic.place}.`,
        `So the picture is ${describe(s.pic)}.`,
      ],
    };
  }
  if (Math.random() < 0.5) {
    const g = pick(GAPS);
    return {
      prompt: `Which word makes sense? “${g.text}”`,
      speak: `Which word makes sense? ${g.text.replace('___', 'blank')}`,
      choices: shuffle([g.answer, ...g.others]).map((value) => ({ value })),
      answer: g.answer,
      hint: 'Read each word, then read the whole sentence with it. Does it make sense?',
      explain: [`Read each word: ${[g.answer, ...g.others].join(', ')}.`, `Try each one in the sentence.`, `Only “${g.text.replace('___', g.answer)}” makes sense.`],
    };
  }
  const s = pick(SENTENCES);
  const right = sentenceText(s);
  const noCap = right[0].toLowerCase() + right.slice(1);
  const noStop = right.slice(0, -1);
  const span = (t: string) => <span style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 600 }}>{t}</span>;
  return {
    prompt: 'Which sentence is written the right way?',
    choices: shuffle([
      { value: 'right', name: right, label: span(right) },
      { value: 'no-capital', name: noCap, label: span(noCap) },
      { value: 'no-full-stop', name: noStop, label: span(noStop) },
    ]),
    answer: 'right',
    hint: 'Check the very first letter and the very end of each sentence.',
    explain: ['A sentence starts with a capital letter.', 'It ends with a full stop.', `The right one is: ${right}`],
  };
}

export const readASentence: Lesson = {
  id: 'read-a-sentence',
  title: 'Read a Sentence',
  Thumb,
  Scene: SentenceScene,
  sceneHint: 'Drag the words into order · Then pick the matching picture',
  learn: {
    heading: 'Reading sentences',
    intro: 'A sentence is a group of words that tells a whole idea. It starts with a capital letter and ends with a full stop. Read every word — then you know what it says!',
    points: [
      { icon: CaseUpper, text: 'Start with the capital letter: The, A.' },
      { icon: BookOpen, text: 'Sound out each word, then read the whole sentence again smoothly.' },
      { icon: ImageIcon, text: 'Check it makes sense: who is it, and where?' },
    ],
  },
  steps: [
    'Find the word with a capital letter — it goes first.',
    'Find the word with a full stop — it goes last.',
    'Put the middle words in an order that makes sense.',
    'Read it all the way through, then check the picture.',
  ],
  example: {
    question: 'Put in order: cat  sat.  The',
    work: ['The has a capital letter, so it goes first.', 'sat. has the full stop, so it goes last.', 'The cat sat. — that makes sense!'],
    answer: 'The cat sat.',
  },
  grownups: [
    'These sentences use only sounds your child has learned plus a few heart words, so they can be read without guessing.',
    'If your child guesses from the picture, cover it and ask them to sound out the word first.',
    'After reading, ask “Who? Where?” — talking about meaning builds comprehension.',
    'Read it twice: once to sound it out, once smoothly like talking. That second read builds fluency.',
  ],
  makeQuestion,
};
