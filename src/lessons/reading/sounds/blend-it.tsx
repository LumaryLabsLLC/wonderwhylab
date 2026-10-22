import { useRef, useState } from 'react';
import { Car, Ear, Link2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { BLEND_ALL, BLEND_EASY, BLEND_MORE, BLEND_SETS, blendWord, pic, pick, sayParts, shuffle, soundOf } from './data';
import type { SoundWord } from './data';
import { mcq, level3 } from './q';
import { Emoji, LetterTile, Note, PicCard, PicChoice, TilesVisual, Tap } from './visuals/Pictures';

const ROAD_Y = 380;
const START_X = 140;
const END_X = 870;
const BOX_X = [320, 500, 680];

function CarShape() {
  return (
    <g>
      <rect x={-52} y={-34} width={104} height={40} rx={12} fill={C.red} stroke={C.ink} strokeWidth={3} />
      <path d="M-30 -34 L-18 -58 L22 -58 L34 -34 Z" fill={shade(C.blue, 0.6)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={-28} cy={8} r={14} fill={C.ink} />
      <circle cx={28} cy={8} r={14} fill={C.ink} />
      <circle cx={-28} cy={8} r={5} fill={C.white} />
      <circle cx={28} cy={8} r={5} fill={C.white} />
    </g>
  );
}

function choicesFor(word: string): string[] {
  const others = shuffle(BLEND_ALL.map((w) => w.word).filter((w) => w !== word)).slice(0, 2);
  return shuffle([word, ...others]);
}

function BlendScene() {
  const [target, setTarget] = useState<SoundWord>(() => pick(BLEND_EASY));
  const [carX, setCarX] = useState(START_X);
  const [heard, setHeard] = useState(0);
  const [options, setOptions] = useState<string[]>(() => choicesFor(target.word));
  const [result, setResult] = useState<'none' | 'right' | 'wrong'>('none');
  const grab = useRef(0);
  const heardRef = useRef(0);
  heardRef.current = heard;
  const blended = heard >= target.parts.length && carX >= END_X - 4;

  const drag = useSvgDrag(
    (p) => {
      const x = clamp(p.x - grab.current, START_X, END_X);
      setCarX(x);
      // Say each sound as the car rolls past its box.
      const passed = BOX_X.filter((bx, i) => i < target.parts.length && x >= bx - 20).length;
      if (passed > heardRef.current) {
        heardRef.current = passed;
        setHeard(passed);
        speak(soundOf(target.parts[passed - 1]), { force: true });
        play('tap');
      }
      if (x >= END_X && heardRef.current === target.parts.length) {
        heardRef.current = target.parts.length + 1;
        setHeard(target.parts.length + 1);
        speak(target.word, { force: true });
        play('pop');
      }
    },
    {
      onStart: (p) => {
        grab.current = p.x - carX;
      },
    },
  );

  const again = () => {
    setCarX(START_X);
    setHeard(0);
    heardRef.current = 0;
    setResult('none');
  };

  const next = () => {
    const pool = [...BLEND_EASY, ...BLEND_MORE].filter((w) => w.word !== target.word);
    const w = pick(pool);
    setTarget(w);
    setOptions(choicesFor(w.word));
    again();
    play('pop');
  };

  const choose = (w: string) => {
    if (!blended || result === 'right') return;
    if (w === target.word) {
      setResult('right');
      play('correct');
    } else {
      setResult('wrong');
      play('wrong');
    }
  };

  return (
    <SceneSvg label={`Blend the sounds ${target.parts.join(' ')} into a word`}>
      {/* Sound boxes */}
      {target.parts.map((part, i) => (
        <Tap key={i} label={`${part}. Tap to hear its sound.`} onTap={() => speak(soundOf(part), { force: true })}>
          <g transform={`translate(${blended ? 500 + (i - 1) * 104 : BOX_X[i]} 200)`}>
            <LetterTile text={part} w={blended ? 104 : 120} h={120} fontSize={66} lit={i < heard} />
          </g>
          {!blended && (
            <text x={BOX_X[i]} y={284} textAnchor="middle" fontSize={17} fill={i < heard ? C.ink : C.muted}>
              “{soundOf(part)}”
            </text>
          )}
        </Tap>
      ))}
      {blended && (
        <text x={500} y={290} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.ink} className="pop-in" style={{ transformOrigin: '500px 290px' }}>
          {target.word}!
        </text>
      )}

      {/* Road and car */}
      <rect x={90} y={ROAD_Y} width={830} height={46} rx={23} fill={shade(C.ink, 0.25)} />
      <path d={`M120 ${ROAD_Y + 23} H890`} stroke={C.white} strokeWidth={4} strokeDasharray="22 18" />
      <path d={`M${END_X + 30} ${ROAD_Y - 70} v70`} stroke={C.ink} strokeWidth={4} />
      <path d={`M${END_X + 30} ${ROAD_Y - 70} l40 14 l-40 14 z`} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
      <g transform={`translate(${carX} ${ROAD_Y - 6})`} {...drag} aria-label="Car. Drag it along the road to blend the sounds." role="slider" aria-valuenow={Math.round(carX)}>
        <rect x={-70} y={-80} width={140} height={110} fill="transparent" />
        <CarShape />
      </g>

      {/* After blending: which picture is it? */}
      {blended ? (
        <g>
          {options.map((w, i) => (
            <Tap key={w} label={`Picture ${i + 1}`} onTap={() => choose(w)}>
              <g transform={`translate(${320 + i * 180} 540)`}>
                <PicCard emoji={pic(w)} w={140} h={120} size={70} fill={result === 'right' && w === target.word ? shade(C.green, 0.7) : C.card} />
              </g>
            </Tap>
          ))}
          <Note
            x={40}
            y={490}
            w={170}
            h={100}
            size={16}
            tone={result === 'right' ? 'good' : result === 'wrong' ? 'try' : 'plain'}
            text={result === 'right' ? `Yes! ${target.word}!` : result === 'wrong' ? 'Not yet. Say the word again.' : 'Which picture is it?'}
          />
        </g>
      ) : (
        <Note x={200} y={500} w={600} h={64} text="Drag the car along the road. Say each sound as it rolls past, then say them fast!" />
      )}

      <SvgButton x={790} y={30} w={180} h={52} fontSize={18} label="Again" onClick={again} />
      <SvgButton x={790} y={96} w={180} h={52} fontSize={18} label="Next word" onClick={next} color={result === 'right' ? C.yellow : C.card} />

      <Callout at={[BOX_X[0], 140]} box={[30, 30]} w={230} icon={Ear} title="Sound boxes" text="Each box holds one sound. Tap a box to hear it." />
      <Callout at={[START_X, ROAD_Y - 40]} box={[30, 600]} w={240} icon={Car} title="Blend" text="Roll the car to join the sounds into a word." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {['s', 'u', 'n'].map((l, i) => (
        <g key={l} transform={`translate(${12 + i * 34} 8)`}>
          <rect width={28} height={28} rx={6} fill={i < 2 ? shade(C.yellow, 0.4) : C.card} stroke={C.ink} strokeWidth={2} />
          <text x={14} y={20} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
            {l}
          </text>
        </g>
      ))}
      <rect x={6} y={54} width={108} height={14} rx={7} fill={shade(C.ink, 0.25)} />
      <rect x={58} y={40} width={30} height={14} rx={4} fill={C.red} stroke={C.ink} strokeWidth={1.5} />
      <Emoji emoji="☀️" x={104} y={22} size={18} />
    </svg>
  );
}

function pictureChoices(words: string[]) {
  return {
    labels: Object.fromEntries(words.map((w) => [w, <PicChoice emoji={pic(w)} />])),
    names: Object.fromEntries(words.map((w) => [w, w])),
  };
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  let target: SoundWord;
  let wrong: string[];
  if (lv === 2) {
    // Words that differ by one sound, so every sound matters.
    const set = shuffle(pick(BLEND_SETS));
    target = blendWord(set[0]);
    wrong = set.slice(1);
  } else {
    target = pick(lv === 0 ? BLEND_EASY : [...BLEND_EASY, ...BLEND_MORE]);
    wrong = shuffle(BLEND_ALL.map((w) => w.word).filter((w) => w !== target.word && w[0] !== target.word[0])).slice(0, lv === 0 ? 1 : 2);
  }
  const words = [target.word, ...wrong];
  return mcq({
    prompt: `Blend the sounds. Which picture is it?`,
    speak: `Blend the sounds: ${sayParts(target.parts)}. Which picture is it?`,
    visual: <TilesVisual tiles={target.parts} dashes />,
    answer: target.word,
    wrong,
    ...pictureChoices(words),
    hint: 'Say each sound, then say them again faster and faster until they join up.',
    explain: [`Say each sound: ${sayParts(target.parts)}.`, `Now say them fast, all joined up: ${target.word}.`, `The picture is the ${target.word}.`],
  });
}

export const blendIt: Lesson = {
  id: 'blend-it',
  title: 'Blend It',
  Thumb,
  Scene: BlendScene,
  sceneHint: 'Drag the car along the road to blend the sounds · Then pick the picture',
  learn: {
    heading: 'Blending sounds',
    intro: 'Reading is joining sounds together. “sss”, “uh”, “nnn” joined up fast makes sun!',
    points: [
      { icon: Ear, text: 'Say the sound for each letter, left to right.' },
      { icon: Link2, text: 'Say the sounds again, faster and smoother.' },
      { icon: Car, text: 'Keep going until the sounds join into a word.' },
    ],
  },
  steps: ['Point to the first letter and say its sound.', 'Say the next sound, then the next.', 'Go back and say them faster, sliding them together.', 'What word did you make? Find its picture.'],
  example: {
    question: 'Blend m, a, p.',
    visual: <TilesVisual tiles={['m', 'a', 'p']} dashes />,
    work: ['Say each sound: mmm – ah – puh.', 'Say them fast: mmmap… map!'],
    answer: 'The word is map.',
  },
  grownups: [
    'Blending is the core skill of reading. We start with stretchy sounds (m, s, f, l, n, r) because they are easiest to join.',
    'Model “stretchy” blending: mmmaaap, without stopping between sounds.',
    'The picture comes after the word is blended, never before, so children read the letters rather than guess from pictures.',
    'If your child gets stuck, blend the first two sounds together first (“ma”), then add the last one (“map”).',
  ],
  makeQuestion,
};
