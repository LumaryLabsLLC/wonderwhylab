import { useState } from 'react';
import { Binary, Lightbulb, Plus, Type } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Message } from '../engine';
import { mcq } from '../q';
import { Bulb, BulbsPicture, bitString, placeValues, toBits } from './visuals/bulbs';

type Mode = 'numbers' | 'letters';
const LETTER_BITS = 7;
const letterOf = (v: number) => (v >= 65 && v <= 90) || (v >= 97 && v <= 122) ? String.fromCharCode(v) : null;
/** "8 + 4 + 1" for the lit bulbs. */
const sumWords = (value: number, n: number) => placeValues(n).filter((_, i) => toBits(value, n)[i]).join(' + ');

// ─────────────────────────── Scene ───────────────────────────

const ROW = { value: 140, bulb: 215, bit: 292, sum: 386 };

function BinaryScene() {
  const [mode, setMode] = useState<Mode>('numbers');
  const [count, setCount] = useState(5);
  const [value, setValue] = useState(0);
  const [target, setTarget] = useState(() => rand(5, 30));
  const [note, setNote] = useState<string | null>(null);
  const n = mode === 'letters' ? LETTER_BITS : count;
  const max = 2 ** n - 1;
  const hit = value === target;

  const update = (v: number) => {
    setNote(null);
    setValue(v);
    if (v === target && value !== target) play('correct');
  };
  const flip = (i: number) => {
    play('tap');
    update(value ^ placeValues(n)[i]);
  };
  const plusOne = () => {
    if (value === max) {
      setNote(`${max} is the biggest number ${n} bulbs can show: they are all on. One more bulb would let you count up to ${2 * max + 1}.`);
      return;
    }
    play('tap');
    update(value + 1);
  };
  const newTarget = (m: Mode = mode, bits = n) => {
    let t = value;
    while (t === value) t = m === 'letters' ? rand(65, 90) : rand(3, 2 ** bits - 1);
    setTarget(t);
    setNote(null);
  };
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setValue(0);
    newTarget(m, m === 'letters' ? LETTER_BITS : count);
  };
  const changeCount = (c: number) => {
    setCount(c);
    setValue(value & (2 ** c - 1));
    if (target > 2 ** c - 1) setTarget(rand(3, 2 ** c - 1));
    setNote(null);
  };

  const step = Math.min(118, 900 / n);
  const x0 = 500 - ((n - 1) * step) / 2;
  const letter = letterOf(value);
  const targetText = mode === 'letters' ? `Make the letter ${String.fromCharCode(target)}` : `Make the number ${target}`;

  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  if (note) msg = { tone: 'oops', text: note };
  else if (hit)
    msg =
      mode === 'letters'
        ? { tone: 'good', text: `Yes! ${String.fromCharCode(target)} is ${target} = ${sumWords(target, n)}, stored as ${bitString(target, n)}.` }
        : { tone: 'good', text: `Yes! ${target} = ${sumWords(target, n)}, so ${target} in binary is ${bitString(target, n)}.` };
  else if (mode === 'letters')
    msg = { tone: 'info', text: 'Computers store letters as numbers too. In the ASCII code, A is 65, B is 66, C is 67… Tap the bulbs to make a letter.' };
  else msg = { tone: 'info', text: 'Tap a bulb to switch it on or off. Each bulb is worth double the bulb to its right. Add up the lit bulbs.' };

  return (
    <SceneSvg label="Binary numbers: switch bulbs on and off to make numbers and letters">
      <SvgButton x={40} y={24} w={150} h={52} fontSize={19} label="Numbers" active={mode === 'numbers'} color={mode === 'numbers' ? shade(C.yellow, 0.4) : C.card} onClick={() => switchMode('numbers')} />
      <SvgButton x={202} y={24} w={150} h={52} fontSize={19} label="Letters" active={mode === 'letters'} color={mode === 'letters' ? shade(C.yellow, 0.4) : C.card} onClick={() => switchMode('letters')} />
      {mode === 'numbers' && (
        <g>
          <text x={760} y={50} textAnchor="end" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink}>
            Bulbs:
          </text>
          <SvgButton x={772} y={26} w={48} h={48} label="−" onClick={() => changeCount(count - 1)} disabled={count <= 4} title="Fewer bulbs" />
          <text x={850} y={50} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={800} fill={C.ink} className="num">
            {count}
          </text>
          <SvgButton x={880} y={26} w={48} h={48} label="+" onClick={() => changeCount(count + 1)} disabled={count >= 8} title="More bulbs" />
        </g>
      )}

      {placeValues(n).map((p, i) => {
        const cx = x0 + i * step;
        const on = !!toBits(value, n)[i];
        return (
          <g key={`${n}-${i}`} onClick={() => flip(i)} style={{ cursor: 'pointer' }} role="button" aria-label={`Bulb worth ${p}: ${on ? 'on' : 'off'}`} data-nopan>
            <rect x={cx - step / 2 + 4} y={ROW.value - 30} width={step - 8} height={ROW.bit + 54 - (ROW.value - 30)} rx={16} fill={on ? shade(C.yellow, 0.82) : 'white'} stroke={C.line} strokeWidth={2} />
            <text x={cx} y={ROW.value} textAnchor="middle" fontSize={step < 100 ? 22 : 26} fontWeight={800} fill={C.ink} className="num">
              {p}
            </text>
            <Bulb cx={cx} cy={ROW.bulb} r={Math.min(40, step * 0.36)} on={on} />
            <rect x={cx - 26} y={ROW.bit} width={52} height={48} rx={10} fill={on ? C.ink : 'white'} stroke={C.ink} strokeWidth={2} />
            <text x={cx} y={ROW.bit + 24} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={800} fill={on ? 'white' : C.ink} className="num">
              {on ? 1 : 0}
            </text>
          </g>
        );
      })}
      <text x={500} y={ROW.sum} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.ink}>
        {value ? `${sumWords(value, n)} = ${value}` : 'All bulbs off = 0'}
      </text>

      {/* Read-outs */}
      <rect x={40} y={420} width={300} height={160} rx={16} fill="white" stroke={C.ink} strokeWidth={2} />
      <text x={60} y={448} fontSize={15} fontWeight={700} fill={C.muted} className="caps">
        Binary {bitString(value, n)}
      </text>
      {mode === 'letters' ? (
        <>
          <text x={110} y={512} textAnchor="middle" dominantBaseline="central" fontSize={64} fontWeight={800} fill={letter ? C.blue : C.muted}>
            {letter ?? '–'}
          </text>
          <text x={180} y={500} dominantBaseline="central" fontSize={30} fontWeight={800} fill={C.ink} className="num">
            = {value}
          </text>
          <text x={180} y={536} dominantBaseline="central" fontSize={16} fill={C.muted}>
            {letter ? (letter === letter.toUpperCase() ? 'a capital letter' : 'a small letter') : 'not a letter code'}
          </text>
        </>
      ) : (
        <text x={190} y={512} textAnchor="middle" dominantBaseline="central" fontSize={64} fontWeight={800} fill={C.ink} className="num">
          {value}
        </text>
      )}

      <rect x={360} y={420} width={340} height={160} rx={16} fill={hit ? shade(C.green, 0.78) : shade(C.yellow, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={380} y={448} fontSize={15} fontWeight={700} fill={C.muted} className="caps">
        Challenge
      </text>
      <text x={380} y={482} dominantBaseline="central" fontSize={25} fontWeight={800} fill={C.ink}>
        {hit ? '✓ ' : ''}
        {targetText}
      </text>
      {mode === 'letters' && (
        <text x={380} y={512} dominantBaseline="central" fontSize={16} fill={C.ink2}>
          A = 65, so {String.fromCharCode(target)} = 65 + {target - 65} = {target}
        </text>
      )}
      <SvgButton x={380} y={mode === 'letters' ? 526 : 512} w={170} h={44} fontSize={17} label="New challenge" onClick={() => newTarget()} />

      <SvgButton x={720} y={420} w={240} h={60} fontSize={20} label="+1  Count up" onClick={plusOne} title="Add 1" />
      <SvgButton x={720} y={496} w={240} h={60} fontSize={20} label="All off" onClick={() => update(0)} disabled={value === 0} />
      <Message x={40} y={598} w={920} tone={msg.tone} text={msg.text} />
      <Callout
        at={[x0 + (n - 1) * step, ROW.value - 8]}
        box={[380, 26]}
        w={250}
        icon={Lightbulb}
        title="Doubling"
        text="The right-hand bulb is worth 1. Moving left, each bulb is worth double: 1, 2, 4, 8, 16… That is why it is called base 2."
      />
    </SceneSvg>
  );
}

function Thumb() {
  const bits = [1, 0, 1, 1];
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {bits.map((b, i) => (
        <g key={i}>
          <text x={18 + i * 28} y={14} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.ink}>
            {8 / 2 ** i}
          </text>
          <circle cx={18 + i * 28} cy={34} r={11} fill={b ? C.yellow : '#d5dbe7'} stroke={C.ink} strokeWidth={1.5} />
          <text x={18 + i * 28} y={64} textAnchor="middle" fontSize={16} fontWeight={800} fill={C.ink}>
            {b}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

/** L0: which number do these bulbs show? */
function readBulbs(n: number): Question {
  const value = rand(3, 2 ** n - 1);
  const bits = toBits(value, n);
  const lit = placeValues(n).filter((_, i) => bits[i]);
  return {
    prompt: 'Each bulb is worth the number above it. What number do the lit bulbs show?',
    visual: <BulbsPicture bits={bits} />,
    choices: numberChoices(value, { count: 4, min: 1, max: 2 ** n, spread: 3 }).map((v) => ({ value: v })),
    answer: String(value),
    hint: 'Look only at the bulbs that are on, and add up the numbers above them.',
    explain: [`The lit bulbs are worth ${lit.join(', ')}.`, lit.length > 1 ? `${lit.join(' + ')} = ${value}.` : `That makes ${value}.`, `So the bulbs show ${value}.`],
  };
}

/** L1: which binary pattern shows this number? */
function toBinary(n: number): Question {
  const value = rand(3, 2 ** n - 1);
  const right = bitString(value, n);
  const near = [value + 1, value - 1, value + 2, value - 2, value ^ (2 ** (n - 1)), value ^ 1].filter((v) => v > 0 && v < 2 ** n).map((v) => bitString(v, n));
  const reversed = right.split('').reverse().join('');
  const wrong = shuffle([...new Set([reversed, ...near])].filter((s) => s !== right)).slice(0, 3);
  return mcq({
    prompt: `Which ${n}-bulb pattern shows ${value}? (1 = on, 0 = off)`,
    visual: <BulbsPicture bits={toBits(0, n)} />,
    answer: right,
    wrong,
    hint: `Start with the biggest bulb. Turn it on only if it isn’t more than what is left to make.`,
    explain: [`The bulbs are worth ${placeValues(n).join(', ')}.`, `${value} = ${sumWords(value, n)}, so those bulbs are on.`, `So ${value} is ${right} in binary.`],
  });
}

/** L1–2: what number is this binary? */
function fromBinary(n: number): Question {
  const value = rand(2 ** (n - 2), 2 ** n - 1);
  const s = bitString(value, n);
  const lit = placeValues(n).filter((_, i) => s[i] === '1');
  return {
    prompt: `What number is ${s} in binary?`,
    visual: <BulbsPicture bits={toBits(value, n)} />,
    choices: numberChoices(value, { count: 4, min: 1, max: 2 ** n, spread: 4 }).map((v) => ({ value: v })),
    answer: String(value),
    hint: `Write the place values under the digits: ${placeValues(n).join(', ')}. Add the ones under a 1.`,
    explain: [`Under the digits ${s.split('').join(' ')} are the values ${placeValues(n).join(', ')}.`, `Add the values under each 1: ${lit.join(' + ')} = ${value}.`, `So ${s} is ${value}.`],
  };
}

/** L2: the biggest number n bulbs can show. */
function biggest(): Question {
  const n = rand(4, 8);
  const max = 2 ** n - 1;
  const vals = placeValues(n);
  return {
    prompt: `What is the biggest number ${n} bulbs can show?`,
    visual: <BulbsPicture bits={toBits(max, n)} />,
    choices: shuffle([...new Set([max, 2 ** n, 2 ** (n - 1), max - 1, n * 2])])
      .filter((v) => v !== max)
      .slice(0, 3)
      .concat(max)
      .sort((a, b) => a - b)
      .map((v) => ({ value: String(v) })),
    answer: String(max),
    hint: 'Switch every bulb on. What do they add up to? (Look for a pattern with the next bulb’s value.)',
    explain: [`With all ${n} bulbs on: ${vals.join(' + ')}.`, `That adds up to ${max}, which is 1 less than the next bulb’s value, ${2 ** n}.`, `So the biggest number is ${max}.`],
  };
}

/** L2: letters are stored as numbers (ASCII: A = 65). */
function whichLetter(): Question {
  const code = rand(66, 90);
  const ch = String.fromCharCode(code);
  const s = bitString(code, 7);
  const others = shuffle([code - 1, code + 1, code - 2, code + 2, code + 4].filter((c) => c >= 65 && c <= 90 && c !== code)).slice(0, 3);
  return mcq({
    prompt: `Computers store letters as numbers. If A is 65, which letter is stored as ${s}?`,
    visual: <BulbsPicture bits={toBits(code, 7)} />,
    answer: ch,
    wrong: others.map((c) => String.fromCharCode(c)),
    hint: 'First turn the binary into a number. Then count on from A = 65.',
    explain: [`${s} = ${sumWords(code, 7)} = ${code}.`, `${code} is ${code - 65} more than 65, so count ${code - 65} letter${code - 65 === 1 ? '' : 's'} on from A.`, `So ${s} stores the letter ${ch}.`],
  });
}

function makeQuestion(level: number): Question {
  if (level <= 0) return Math.random() < 0.6 ? readBulbs(4) : readBulbs(5);
  if (level === 1) return pick([() => toBinary(5), () => fromBinary(5), () => readBulbs(6)])();
  return pick([() => fromBinary(pick([6, 7, 8])), biggest, whichLetter, () => toBinary(6)])();
}

export const binary: Lesson = {
  id: 'binary',
  title: 'Binary Numbers',
  Thumb,
  Scene: BinaryScene,
  sceneHint: 'Tap bulbs to make numbers · +1 counts up · Letters shows how text is stored',
  learn: {
    heading: 'Computers count with on and off',
    intro: 'Inside a computer, everything is stored as tiny switches that are on (1) or off (0). This is called binary. Each switch, called a bit, is worth double the one to its right: 1, 2, 4, 8, 16…',
    points: [
      { icon: Lightbulb, text: 'A bit is one switch: 1 means on, 0 means off.' },
      { icon: Binary, text: 'Add the values of the bits that are on: 1101 = 8 + 4 + 1 = 13.' },
      { icon: Plus, text: 'One more bit doubles how many numbers you can make.' },
      { icon: Type, text: 'Letters are stored as numbers too: in ASCII, A is 65 = 1000001.' },
    ],
  },
  steps: [
    'Write the place values: 16, 8, 4, 2, 1.',
    'To read binary, add the values under each 1.',
    'To write a number, start with the biggest value that fits, take it away, and keep going.',
    'Check by adding the values back up.',
  ],
  example: {
    question: 'Write 13 in binary with 5 bulbs.',
    visual: <BulbsPicture bits={toBits(13, 5)} />,
    work: ['16 is too big, so the 16 bulb is off: 0.', '8 fits: 13 − 8 = 5. 4 fits: 5 − 4 = 1. 2 is too big: 0. 1 fits: 1 − 1 = 0.', 'On, on, off, on for 8, 4, 2, 1.'],
    answer: '13 = 01101',
  },
  grownups: [
    'Binary is just a different way of writing numbers: base 2 instead of base 10. Our tens, hundreds and thousands become twos, fours and eights.',
    'Try counting up with +1 together and watch the pattern: the right-hand bulb flips every time, the next one every 2 counts, then every 4.',
    'Ten fingers can count to 1,023 in binary! Each finger is a bit, up or down.',
  ],
  makeQuestion,
};
