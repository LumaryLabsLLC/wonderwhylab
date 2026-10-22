import { useState } from 'react';
import { ArrowDown, MoveRight, PenLine } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { pick, shuffle, soundOf } from './data';
import { mcq, level3 } from './q';
import { LetterTile, Note, Tap } from './visuals/Pictures';
import { FAMILIES, GuideLines, LOWER, LetterDotPicture, TracePad, familyOf, padFor } from './visuals/Trace';

// ───────────────────────── Scene ─────────────────────────

const PAD = { x: 330, y: 104, w: 380, h: 470 };
const TOP = 140;
const H = 300;
const UNIT = 210;

function FormationScene() {
  const [familyId, setFamilyId] = useState(FAMILIES[0].id);
  const family = FAMILIES.find((f) => f.id === familyId)!;
  const [letter, setLetter] = useState(family.letters[0]);
  const [traced, setTraced] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const done = traced.includes(letter);
  const box = padFor(letter, PAD.x + PAD.w / 2, TOP, H, UNIT);

  const chooseFamily = (id: string) => {
    const f = FAMILIES.find((x) => x.id === id)!;
    setFamilyId(id);
    setLetter(f.letters[0]);
    setRound((r) => r + 1);
    play('pop');
  };
  const chooseLetter = (l: string) => {
    setLetter(l);
    setRound((r) => r + 1);
    play('tap');
  };
  const nextLetter = () => {
    const i = family.letters.indexOf(letter);
    if (i < family.letters.length - 1) chooseLetter(family.letters[i + 1]);
    else {
      const fi = FAMILIES.findIndex((f) => f.id === familyId);
      chooseFamily(FAMILIES[(fi + 1) % FAMILIES.length].id);
    }
  };

  return (
    <SceneSvg label={`Trace the letter ${letter}`}>
      {/* Families */}
      {FAMILIES.map((f, i) => (
        <SvgButton
          key={f.id}
          x={40 + i * 200}
          y={24}
          w={186}
          h={52}
          fontSize={24}
          label={f.letters.join(' ')}
          title={f.name}
          onClick={() => chooseFamily(f.id)}
          active={f.id === familyId}
          color={f.id === familyId ? C.yellow : C.card}
        />
      ))}

      {/* The letter and its sound */}
      <Tap label={`The letter ${letter}. Tap to hear its sound.`} onTap={() => speak(soundOf(letter), { force: true })}>
        <g transform="translate(160 220)">
          <LetterTile text={letter} w={150} h={150} fontSize={100} />
        </g>
        <text x={160} y={326} textAnchor="middle" fontSize={17} fill={C.ink2}>
          says “{soundOf(letter)}” · tap to hear
        </text>
      </Tap>
      <text x={160} y={380} textAnchor="middle" fontSize={19} fontWeight={700} fill={C.ink}>
        {family.name}
      </text>
      <rect x={44} y={398} width={232} height={96} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={160} y={446} textAnchor="middle" fontSize={16} fontWeight={600} fill={C.ink}>
        {wrap(family.tip, 22).map((line, i, all) => (
          <tspan key={i} x={160} dy={i === 0 ? `${-(all.length - 1) * 0.6 + 0.35}em` : '1.2em'}>
            {line}
          </tspan>
        ))}
      </text>

      {/* Writing pad with guide lines */}
      <rect x={PAD.x} y={PAD.y} width={PAD.w} height={PAD.h} rx={22} fill={C.white} stroke={C.line} strokeWidth={2} />
      <GuideLines x1={PAD.x + 14} x2={PAD.x + PAD.w - 14} top={TOP} h={H} />
      <TracePad key={`${letter}-${round}`} letter={letter} box={box} pad={PAD} onDone={() => setTraced((t) => (t.includes(letter) ? t : [...t, letter]))} />

      {/* Pick a letter from the family */}
      <text x={850} y={122} textAnchor="middle" fontSize={16} fill={C.muted} className="caps">
        Letters in this family
      </text>
      {family.letters.map((l, i) => {
        const x = 790 + (i % 2) * 120;
        const y = 150 + Math.floor(i / 2) * 100;
        return (
          <g key={l} onClick={() => chooseLetter(l)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Trace ${l}`}>
            <rect x={x - 46} y={y} width={92} height={84} rx={16} fill={l === letter ? shade(C.yellow, 0.5) : C.card} stroke={C.ink} strokeWidth={l === letter ? 3.5 : 2} />
            <text x={x} y={y + 46} textAnchor="middle" dominantBaseline="central" fontSize={50} fontWeight={700} fill={C.ink}>
              {l}
            </text>
            {traced.includes(l) && (
              <text x={x + 34} y={y + 16} textAnchor="middle" dominantBaseline="central" fontSize={20} fill={C.green}>
                ✓
              </text>
            )}
          </g>
        );
      })}
      <SvgButton x={760} y={372} w={180} h={52} fontSize={18} label="Try again" onClick={() => setRound((r) => r + 1)} />
      <SvgButton x={760} y={438} w={180} h={52} fontSize={18} label="Next letter" onClick={nextLetter} color={done ? C.yellow : C.card} />

      <Note
        x={60}
        y={596}
        w={880}
        h={60}
        tone={done ? 'good' : 'plain'}
        text={done ? `You wrote ${letter}! It says “${soundOf(letter)}”. Try it again, or pick the next letter.` : 'Put your finger on the green dot. Follow the path the way the line points.'}
      />

      <Callout at={[box.x + LOWER[letter].strokes[0][0][0] * LOWER[letter].width * UNIT, TOP + LOWER[letter].strokes[0][0][1] * H]} box={[740, 506]} w={210} icon={PenLine} title="Start on green" text="Every letter has a starting place and a direction." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <line x1={8} x2={112} y1={14} y2={14} stroke={shade(C.blue, 0.4)} strokeWidth={1.5} />
      <line x1={8} x2={112} y1={36} y2={36} stroke={shade(C.blue, 0.3)} strokeWidth={1.5} strokeDasharray="4 4" />
      <line x1={8} x2={112} y1={62} y2={62} stroke={C.red} strokeWidth={2} />
      <text x={40} y={60} textAnchor="middle" fontSize={38} fontWeight={700} fill={C.blue}>
        a
      </text>
      <text x={78} y={60} textAnchor="middle" fontSize={38} fontWeight={700} fill={C.muted} opacity={0.5}>
        d
      </text>
      <circle cx={52} cy={40} r={5} fill={C.green} stroke={C.ink} strokeWidth={1.2} />
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

/** For each letter: where the pencil starts (correct first) and two common wrong places. */
const STARTS: Record<string, [string, [number, number]][]> = {
  c: [['at the top right', [0.89, 0.59]], ['at the bottom right', [0.85, 0.9]], ['on the left', [0.05, 0.725]]],
  a: [['at the top right of the curl', [0.89, 0.59]], ['at the bottom of the stick', [0.95, 1]], ['on the left', [0.05, 0.725]]],
  d: [['at the top right of the curl', [0.89, 0.59]], ['at the top of the tall stick', [0.95, 0]], ['at the bottom of the stick', [0.95, 1]]],
  g: [['at the top right of the curl', [0.89, 0.59]], ['at the end of the tail', [0.17, 1.22]], ['at the top of the stick', [0.95, 0.45]]],
  l: [['at the top', [0.5, 0]], ['at the bottom', [0.5, 1]], ['in the middle', [0.5, 0.5]]],
  t: [['at the top', [0.5, 0.15]], ['on the cross line', [0.12, 0.45]], ['at the bottom', [0.5, 1]]],
  i: [['at the top of the short stick', [0.5, 0.45]], ['on the dot', [0.5, 0.22]], ['at the bottom', [0.5, 1]]],
  n: [['at the top left', [0.12, 0.45]], ['at the top right', [0.88, 0.62]], ['at the bottom right', [0.88, 1]]],
  m: [['at the top left', [0.08, 0.45]], ['at the top right', [0.92, 0.62]], ['at the bottom in the middle', [0.5, 1]]],
  r: [['at the top left', [0.15, 0.45]], ['at the end of the hook', [0.68, 0.48]], ['at the bottom', [0.15, 1]]],
  h: [['at the top of the tall stick', [0.12, 0]], ['at the top of the hump', [0.5, 0.45]], ['at the bottom right', [0.88, 1]]],
};

const ALL_LETTERS = Object.keys(LOWER);
const CURLY = ['c', 'a', 'd', 'g'];
const HUMP = ['n', 'm', 'r', 'h'];
const TALL = ['d', 'l', 't', 'h'];
const SHORT = ['a', 'c', 'n', 'm', 'r', 'i'];

function startQuestion(): Question {
  const letter = pick(ALL_LETTERS);
  const [right, ...wrong] = STARTS[letter];
  const labels = Object.fromEntries(STARTS[letter].map(([name, dot]) => [name, <LetterDotPicture letter={letter} dot={dot} label={`${letter} with a dot ${name}`} />]));
  return mcq({
    prompt: `Where does your pencil start for ${letter}?`,
    speak: `Where does your pencil start when you write ${letter}?`,
    answer: right[0],
    wrong: wrong.map((w) => w[0]),
    labels,
    names: Object.fromEntries(STARTS[letter].map(([name]) => [name, name])),
    hint: `${letter} is in the ${familyOf(letter).name.toLowerCase()}. How do letters in that family begin?`,
    explain: [`${letter} is in the ${familyOf(letter).name.toLowerCase()}.`, familyOf(letter).tip, `So your pencil starts ${right[0]}.`],
  });
}

function familyQuestion(): Question {
  const curly = Math.random() < 0.5;
  const group = curly ? CURLY : HUMP;
  const answer = pick(group);
  const wrong = shuffle(ALL_LETTERS.filter((l) => !group.includes(l))).slice(0, 2);
  return mcq({
    prompt: curly ? 'Which letter starts with a curly c shape?' : 'Which letter goes down, back up and over a hump?',
    answer,
    wrong,
    hint: curly ? 'Trace each letter in the air. Which one begins like c?' : 'Trace each letter in the air. Which one has a hump?',
    explain: curly
      ? [`c, a, d and g all start with a curly c.`, `${answer} begins at the top right and curls round to the left.`, `So the answer is ${answer}.`]
      : [`n, m, r and h go down, back up the same line, then over a hump.`, `${answer} has a hump.`, `So the answer is ${answer}.`],
  });
}

function sizeQuestion(): Question {
  const kind = pick(['tall', 'tail', 'order-d', 'order-i'] as const);
  if (kind === 'tall') {
    const answer = pick(TALL);
    return mcq({
      prompt: 'Which letter has a tall stick that reaches the top line?',
      answer,
      wrong: shuffle(SHORT).slice(0, 2),
      hint: 'Short letters fit between the middle line and the baseline. Which one is taller?',
      explain: [`Letters like a, c, n and m only reach the middle line.`, `${answer} has a tall stick up to the top line.`, `So the answer is ${answer}.`],
    });
  }
  if (kind === 'tail') {
    return mcq({
      prompt: 'Which letter has a tail that goes below the line?',
      answer: 'g',
      wrong: shuffle(SHORT).slice(0, 2),
      hint: 'Look for a letter that hangs down under the red line.',
      explain: ['Most letters sit on the red baseline.', 'g has a tail that hooks down below it.', 'So the answer is g.'],
    });
  }
  if (kind === 'order-d') {
    return mcq({
      prompt: 'When you write d, what do you make first?',
      answer: 'a curly c',
      wrong: ['a tall stick', 'a dot'],
      hint: 'd is in the curly c family.',
      explain: ['d is in the curly c family.', 'You make a curly c first, then the tall stick.', 'So the first part is a curly c.'],
    });
  }
  return mcq({
    prompt: 'When you write i, what do you make last?',
    answer: 'the dot',
    wrong: ['the stick', 'a hump'],
    hint: 'Start at the middle line and go down. What is left?',
    explain: ['First, the short stick from the middle line down to the baseline.', 'Then lift your pencil and add the dot on top.', 'So the last part is the dot.'],
  });
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv === 0) return startQuestion();
  if (lv === 1) return Math.random() < 0.5 ? familyQuestion() : startQuestion();
  return Math.random() < 0.6 ? sizeQuestion() : familyQuestion();
}

export const letterFormation: Lesson = {
  id: 'letter-formation',
  title: 'Writing Letters',
  Thumb,
  Scene: FormationScene,
  sceneHint: 'Pick a family · Start on the green dot · Follow the path',
  learn: {
    heading: 'Writing small letters',
    intro: 'Every letter has a place to start and a way to go. Letters in the same family start the same way.',
    points: [
      { icon: PenLine, text: 'Curly c family: c, a, d, g start like c.' },
      { icon: ArrowDown, text: 'Long line family: l, t, i start at the top and go down.' },
      { icon: MoveRight, text: 'Hump family: n, m, r, h go down, back up and over.' },
    ],
  },
  steps: ['Say the letter’s sound.', 'Put your finger on the green dot.', 'Follow the path the way the line points.', 'Check: is it sitting on the red line?'],
  example: {
    question: 'How do you write d?',
    visual: <LetterDotPicture letter="d" dot={[0.89, 0.59]} label="d with a dot at the top right of the curl" />,
    work: ['Start at the green dot, at the top right of the curl.', 'Go up, over and round to make a curly c.', 'Then go up to the top line and straight down.'],
    answer: 'd starts with a curly c, then the tall stick.',
  },
  grownups: [
    'Teaching letters in families with the same starting stroke helps children form them quickly and correctly.',
    'Starting d with the curly c (not the stick) helps stop b and d mix-ups.',
    'Say the sound while your child writes the letter: linking sound and shape helps reading and spelling.',
    'Big movements first: trace in the air, in sand or on a steamy window, then on paper with lines.',
  ],
  makeQuestion,
};
