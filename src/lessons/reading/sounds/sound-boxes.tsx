import { useState } from 'react';
import { Ear, Grid3x3, Hand } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { FOUR_SOUNDS, THREE_SOUNDS, THREE_SOUNDS_TRICKY, TWO_SOUNDS, pic, pick, sayParts, shuffle, soundOf } from './data';
import type { SoundWord } from './data';
import { mcq, level3 } from './q';
import { DragCard, Emoji, Note, PicCard, PicVisual, Tap } from './visuals/Pictures';

const POOL = [...TWO_SOUNDS, ...THREE_SOUNDS, ...THREE_SOUNDS_TRICKY];
const BOX = 130;
const BOX_Y = 140;
const TRAY_Y = 470;

function boxX(i: number, n: number) {
  return 660 + (i - (n - 1) / 2) * (BOX + 20);
}

function Counter({ color = C.red }: { color?: string }) {
  return (
    <g>
      <circle r={36} fill={shade(color, -0.3)} cy={4} />
      <circle r={36} fill={color} stroke={C.ink} strokeWidth={3} />
      <circle r={12} cx={-11} cy={-11} fill={C.white} opacity={0.5} />
    </g>
  );
}

function SoundBoxScene() {
  const [word, setWord] = useState<SoundWord>(() => pick(THREE_SOUNDS));
  const [filled, setFilled] = useState(0);
  const n = word.parts.length;
  const done = filled >= n;

  const push = (x: number, y: number) => {
    if (done) return;
    const inBoxes = y >= BOX_Y - 40 && y <= BOX_Y + BOX + 40 && x >= boxX(0, n) - BOX && x <= boxX(n - 1, n) + BOX;
    if (!inBoxes) return;
    const next = filled + 1;
    setFilled(next);
    play(next >= n ? 'correct' : 'pop');
    // The child pushed the counter: say the sound for this box (and the word once all are filled).
    speak(next >= n ? `${sayParts(word.parts)}. ${word.word}` : soundOf(word.parts[filled]), { force: true });
  };

  const reset = () => setFilled(0);
  const next = () => {
    setWord(pick(POOL.filter((w) => w.word !== word.word)));
    setFilled(0);
    play('pop');
  };

  return (
    <SceneSvg label={`Sound boxes for ${word.word}`}>
      <Tap label={`${word.word}. Tap to hear it.`} onTap={() => speak(word.word, { force: true })}>
        <g transform="translate(200 230)">
          <PicCard emoji={pic(word.word)} w={240} h={240} size={130} />
        </g>
        <text x={200} y={380} textAnchor="middle" fontSize={17} fill={C.muted}>
          Tap to hear the word
        </text>
      </Tap>

      {word.parts.map((part, i) => {
        const x = boxX(i, n);
        return (
          <g key={i}>
            <rect x={x - BOX / 2} y={BOX_Y} width={BOX} height={BOX} rx={12} fill={i < filled ? shade(C.yellow, 0.75) : C.white} stroke={C.ink} strokeWidth={3} />
            {i < filled && (
              <g transform={`translate(${x} ${BOX_Y + BOX / 2})`}>
                <g className="pop-in" style={{ transformOrigin: '0px 0px' }}>
                  <Counter />
                </g>
              </g>
            )}
            {done && (
              <text x={x} y={BOX_Y + BOX + 44} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.ink} className="pop-in" style={{ transformOrigin: `${x}px ${BOX_Y + BOX + 30}px` }}>
                {part}
              </text>
            )}
            {i < filled && (
              <text x={x} y={BOX_Y - 16} textAnchor="middle" fontSize={17} fill={C.ink2}>
                “{soundOf(part)}”
              </text>
            )}
          </g>
        );
      })}

      {/* Counters waiting in the tray */}
      <rect x={430} y={TRAY_Y - 60} width={360} height={120} rx={24} fill={shade(C.wood, 0.3)} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: n - filled }, (_, i) => (
        <DragCard key={`${word.word}-${filled}-${i}`} x={510 + i * 100} y={TRAY_Y} label="Counter. Push it into the next box as you say a sound." onTap={() => push(boxX(filled, n), BOX_Y + BOX / 2)} onDrop={(p) => push(p.x, p.y)}>
          <Counter />
        </DragCard>
      ))}
      {done && (
        <text x={610} y={TRAY_Y + 6} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink2}>
          {n} sounds, {n} boxes!
        </text>
      )}

      <Note
        x={60}
        y={590}
        w={880}
        h={60}
        tone={done ? 'good' : 'plain'}
        text={done ? `${sayParts(word.parts)}: ${word.word} has ${n} sounds.` : 'Say the word slowly. Push one counter into a box for each sound.'}
      />
      <SvgButton x={810} y={416} w={160} h={52} fontSize={18} label="Start again" onClick={reset} disabled={filled === 0} />
      <SvgButton x={810} y={482} w={160} h={52} fontSize={18} label="Next word" onClick={next} color={done ? C.yellow : C.card} />

      <Callout at={[boxX(0, n) - BOX / 2, BOX_Y + 20]} box={[340, 20]} w={200} icon={Grid3x3} title="One box, one sound" text="Some sounds use two letters, like sh in fish." />
      <Callout at={[510, TRAY_Y]} box={[40, 450]} w={220} icon={Hand} title="Push and say" text="Say a sound each time you push a counter." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Emoji emoji="☀️" x={22} y={40} size={30} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={44 + i * 25} y={26} width={22} height={22} rx={4} fill={i < 2 ? shade(C.yellow, 0.7) : C.white} stroke={C.ink} strokeWidth={1.5} />
          {i < 2 && <circle cx={55 + i * 25} cy={37} r={7} fill={C.red} stroke={C.ink} strokeWidth={1.2} />}
        </g>
      ))}
      <circle cx={104} cy={64} r={7} fill={C.red} stroke={C.ink} strokeWidth={1.2} />
    </svg>
  );
}

const VOWELS = ['a', 'e', 'i', 'o', 'u'];

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv < 2) {
    const pool = lv === 0 ? [...TWO_SOUNDS, ...THREE_SOUNDS] : [...TWO_SOUNDS, ...THREE_SOUNDS, ...THREE_SOUNDS_TRICKY, ...FOUR_SOUNDS];
    const w = pick(pool);
    const n = w.parts.length;
    const options = lv === 0 ? ['2', '3'] : ['2', '3', '4'];
    const tricky = w.parts.some((p) => p.length > 1);
    return mcq({
      prompt: `How many sounds in ${w.word}?`,
      visual: <PicVisual emoji={pic(w.word)} />,
      answer: String(n),
      wrong: options.filter((o) => o !== String(n)),
      hint: 'Say the word very slowly. Hold up a finger for each sound.',
      explain: [
        `Say it slowly: ${sayParts(w.parts)}.`,
        tricky ? `${w.parts.find((p) => p.length > 1)} is one sound made by two letters.` : `One finger for each sound.`,
        `That's ${n} sounds in ${w.word}.`,
      ],
    });
  }
  // Which sound is in the middle, or at the end?
  const w = pick(THREE_SOUNDS);
  const where = pick(['middle', 'last'] as const);
  const answer = where === 'middle' ? w.parts[1] : w.parts[2];
  const others = where === 'middle' ? VOWELS.filter((v) => v !== answer) : shuffle([w.parts[0], ...'bdgmnpst'.split('')]).filter((c, i, arr) => c !== answer && arr.indexOf(c) === i);
  const wrong = shuffle(others).slice(0, 2);
  // Always offer the first sound as a choice for "last" questions when it's different: listening for position matters.
  if (where === 'last' && w.parts[0] !== answer && !wrong.includes(w.parts[0])) wrong[0] = w.parts[0];
  const options = [answer, ...wrong];
  return mcq({
    prompt: `What is the ${where} sound in ${w.word}?`,
    visual: <PicVisual emoji={pic(w.word)} word={w.word} />,
    answer,
    wrong,
    labels: Object.fromEntries(options.map((o) => [o, o])),
    names: Object.fromEntries(options.map((o) => [o, `${o} (${soundOf(o)})`])),
    hint: where === 'middle' ? 'Say it slowly. The middle sound is the one squeezed between the first and the last.' : 'Say it slowly and listen to how the word ends.',
    explain: [`Say it slowly: ${sayParts(w.parts)}.`, `The ${where} sound is “${soundOf(answer)}”.`, `That's the letter ${answer}.`],
  });
}

export const soundBoxes: Lesson = {
  id: 'sound-boxes',
  title: 'Sound Boxes',
  Thumb,
  Scene: SoundBoxScene,
  sceneHint: 'Say the word slowly · Push one counter into a box for each sound',
  learn: {
    heading: 'Every sound in a word',
    intro: 'Words are made of sounds. Sun has three: “sss”, “uh”, “nnn”. We give each sound its own box.',
    points: [
      { icon: Ear, text: 'Say the word slowly, like stretching chewing gum.' },
      { icon: Hand, text: 'Push one counter for each sound you hear.' },
      { icon: Grid3x3, text: 'Two letters can make one sound, like sh in fish.' },
    ],
  },
  steps: ['Say the word.', 'Say it again very slowly.', 'Push a counter into a box for each sound, left to right.', 'Count the counters: that’s how many sounds!'],
  example: {
    question: 'How many sounds in fish?',
    visual: <PicVisual emoji={pic('fish')} />,
    work: ['Say it slowly: fff – ih – shh.', 'sh is two letters but one sound.'],
    answer: 'Fish has 3 sounds.',
  },
  grownups: [
    'These are Elkonin boxes, a well-tested way to teach children to hear every sound (phoneme) in a word.',
    'Sounds are not the same as letters: fish has four letters but three sounds (f, i, sh).',
    'Say the sounds, not the letter names, and keep them short: “t”, not “tuh-uh”.',
    'At home, use coins or buttons and three drawn boxes on paper.',
  ],
  makeQuestion,
};
