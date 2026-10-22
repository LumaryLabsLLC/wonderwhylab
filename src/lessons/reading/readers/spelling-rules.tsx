import { useState } from 'react';
import { Copy, Eraser, Plus, Replace } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { wrap } from '../../../stage/Predict';
import { DragToken, inside } from './visuals/DragToken';
import { WordCard } from './visuals/Cards';
import type { Part } from './visuals/Cards';
import { textChoices } from './q';

// ───────────────────────── Spelling rules ─────────────────────────

type Kind = 'cvc' | 'silentE' | 'consY' | 'plain';
type Suffix = 'ing' | 'ed';
type Rule = 'add' | 'double' | 'drop' | 'y';

interface Word {
  base: string;
  kind: Kind;
  /** Does base + ed make a real word? (run → ran, so not "runned".) */
  ed: boolean;
}

const WORDS: Word[] = [
  { base: 'hop', kind: 'cvc', ed: true },
  { base: 'stop', kind: 'cvc', ed: true },
  { base: 'plan', kind: 'cvc', ed: true },
  { base: 'clap', kind: 'cvc', ed: true },
  { base: 'skip', kind: 'cvc', ed: true },
  { base: 'hug', kind: 'cvc', ed: true },
  { base: 'run', kind: 'cvc', ed: false },
  { base: 'swim', kind: 'cvc', ed: false },
  { base: 'bake', kind: 'silentE', ed: true },
  { base: 'smile', kind: 'silentE', ed: true },
  { base: 'hope', kind: 'silentE', ed: true },
  { base: 'dance', kind: 'silentE', ed: true },
  { base: 'skate', kind: 'silentE', ed: true },
  { base: 'ride', kind: 'silentE', ed: false },
  { base: 'cry', kind: 'consY', ed: true },
  { base: 'try', kind: 'consY', ed: true },
  { base: 'carry', kind: 'consY', ed: true },
  { base: 'hurry', kind: 'consY', ed: true },
  { base: 'copy', kind: 'consY', ed: true },
  { base: 'jump', kind: 'plain', ed: true },
  { base: 'play', kind: 'plain', ed: true },
  { base: 'help', kind: 'plain', ed: true },
  { base: 'paint', kind: 'plain', ed: true },
  { base: 'look', kind: 'plain', ed: true },
];

export const RULE_NAME: Record<Rule, string> = {
  add: 'Just add the ending',
  double: 'Double the last letter',
  drop: 'Drop the e',
  y: 'Change y to i',
};

export function ruleFor(w: Word, suf: Suffix): Rule {
  if (w.kind === 'silentE') return 'drop';
  if (w.kind === 'consY') return suf === 'ed' ? 'y' : 'add';
  if (w.kind === 'cvc') return 'double';
  return 'add';
}

export function apply(base: string, suf: Suffix, rule: Rule): string {
  if (rule === 'double') return base + base[base.length - 1] + suf;
  if (rule === 'drop') return base.slice(0, -1) + suf;
  if (rule === 'y') return `${base.slice(0, -1)}i${suf}`;
  return base + suf;
}

/** Why this rule fits this word, in child words. */
function reason(w: Word, suf: Suffix): string {
  const end2 = w.base.slice(-2);
  if (w.kind === 'cvc') return `“${w.base}” is one short syllable that ends in one vowel and one consonant (${end2}).`;
  if (w.kind === 'silentE') return `“${w.base}” ends in a silent e, and “${suf}” starts with a vowel.`;
  if (w.kind === 'consY') {
    return suf === 'ed' ? `“${w.base}” ends in a consonant and y (${end2}).` : `“${w.base}” ends in y, and “ing” already starts with i, so we keep the y.`;
  }
  if (w.base.endsWith('y')) return `“${w.base}” ends in a vowel and y (${end2}), so the y stays.`;
  const consonant = (ch: string) => !'aeiou'.includes(ch);
  return consonant(end2[0]) && consonant(end2[1])
    ? `“${w.base}” ends in two consonants (${end2}), so nothing changes.`
    : `“${w.base}” has a vowel team before the last letter, so nothing changes.`;
}

/** Coloured pieces that show what the rule does to the base word. */
function changeParts(base: string, suf: Suffix, rule: Rule): Part[] {
  const sufPart: Part = { t: suf, c: shade(C.blue, -0.15), bold: true };
  if (rule === 'double') return [{ t: base }, { t: base[base.length - 1], c: shade(C.green, -0.25), bold: true }, sufPart];
  if (rule === 'drop') return [{ t: base.slice(0, -1) }, sufPart];
  if (rule === 'y') return [{ t: base.slice(0, -1) }, { t: 'i', c: shade(C.orange, -0.2), bold: true }, sufPart];
  return [{ t: base }, sufPart];
}

const RULE_RECT = (i: number) => ({ x: 40 + i * 232, y: 470, w: 220, h: 56 });
const SLOT = { x: 450, y: 190, w: 150, h: 96 };
const BANK_SIZE = 6;

function SpellingScene() {
  const [deck] = useState(() => shuffle(WORDS));
  const [page, setPage] = useState(0);
  const bank = Array.from({ length: BANK_SIZE }, (_, i) => deck[(page * BANK_SIZE + i) % deck.length]);
  const [word, setWord] = useState<Word>(bank[0]);
  const [suf, setSuf] = useState<Suffix | null>(null);
  const [rule, setRule] = useState<Rule | null>(null);
  const [wrongRules, setWrongRules] = useState<Rule[]>([]);
  const [shake, setShake] = useState({ ing: 0, ed: 0 });
  const [message, setMessage] = useState('Pick a word, then drag an ending into the slot.');

  const reset = (w: Word) => {
    setWord(w);
    setSuf(null);
    setRule(null);
    setWrongRules([]);
    setMessage('Now drag “ing” or “ed” into the slot.');
  };

  const dropSuffix = (s: Suffix) => {
    if (s === 'ed' && !word.ed) {
      play('wrong');
      setShake({ ...shake, [s]: shake[s] + 1 });
      setMessage(`“${word.base}” is a tricky word: we say ${word.base === 'run' ? 'ran' : word.base === 'swim' ? 'swam' : 'rode'}, not “${word.base}ed”. Try “ing”.`);
      return;
    }
    play('pop');
    setSuf(s);
    setRule(null);
    setWrongRules([]);
    setMessage(`Which rule do we use for ${word.base} + ${s}? Look at how the word ends.`);
  };

  const chooseRule = (r: Rule) => {
    if (!suf || rule) return;
    const right = ruleFor(word, suf);
    if (r === right) {
      play('correct');
      setRule(r);
      setMessage(`${reason(word, suf)} ${RULE_NAME[r]}: ${word.base} + ${suf} = ${apply(word.base, suf, r)}.`);
    } else {
      play('wrong');
      setWrongRules([...wrongRules, r]);
      setMessage(
        wrongRules.length >= 1
          ? `Here’s how: ${reason(word, suf)} So: ${RULE_NAME[right].toLowerCase()}.`
          : `Not yet. That would make “${apply(word.base, suf, r)}”. Look closely at the last letters of “${word.base}”.`,
      );
    }
  };

  const result = suf && rule ? apply(word.base, suf, rule) : null;
  return (
    <SceneSvg label="Spelling machine: add endings to words">
      <text x={40} y={34} fontSize={15} fill={C.muted} className="caps">
        Pick a word
      </text>
      {bank.map((w, i) => (
        <SvgButton key={w.base} x={40 + i * 132} y={46} w={120} h={50} fontSize={22} label={w.base} active={w.base === word.base} color={w.base === word.base ? C.yellow : C.card} onClick={() => reset(w)} />
      ))}
      <SvgButton x={846} y={46} w={120} h={50} fontSize={17} label="More words" onClick={() => setPage(page + 1)} />

      {/* The machine: base + ending → new word */}
      <rect x={30} y={150} width={940} height={170} rx={22} fill={shade(C.purple, 0.88)} stroke={C.line} strokeWidth={2} />
      <g transform="translate(250 238)" onClick={() => speak(word.base, { force: true })} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Base word ${word.base}. Tap to hear it`}>
        <WordCard w={230} h={96} fontSize={46} parts={[{ t: word.base }]} />
      </g>
      <text x={410} y={240} textAnchor="middle" dominantBaseline="central" fontSize={48} fontWeight={800} fill={C.ink}>
        +
      </text>
      {suf ? (
        <g transform={`translate(${SLOT.x + SLOT.w / 2} ${SLOT.y + SLOT.h / 2})`}>
          <WordCard w={SLOT.w} h={SLOT.h} fontSize={40} parts={[{ t: suf, c: shade(C.blue, -0.15), bold: true }]} fill={shade(C.blue, 0.85)} />
        </g>
      ) : (
        <g>
          <rect x={SLOT.x} y={SLOT.y} width={SLOT.w} height={SLOT.h} rx={14} fill={C.white} stroke={C.ink2} strokeWidth={2.5} strokeDasharray="9 7" />
          <text x={SLOT.x + SLOT.w / 2} y={SLOT.y + SLOT.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={17} fill={C.muted}>
            ending
          </text>
        </g>
      )}
      <text x={650} y={240} textAnchor="middle" dominantBaseline="central" fontSize={40} fill={C.ink}>
        →
      </text>
      {result && suf && rule ? (
        <g transform="translate(818 238)" onClick={() => speak(result, { force: true })} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`New word ${result}. Tap to hear it`}>
          <g className="pop-in">
            <WordCard w={260} h={96} fontSize={40} parts={changeParts(word.base, suf, rule)} fill={shade(C.green, 0.82)} />
          </g>
        </g>
      ) : (
        <g>
          <rect x={690} y={190} width={256} height={96} rx={14} fill={C.white} opacity={0.6} stroke={C.line} strokeWidth={2} />
          <text x={818} y={238} textAnchor="middle" dominantBaseline="central" fontSize={34} fill={C.line}>
            ?
          </text>
        </g>
      )}
      {result && rule === 'drop' && (
        <text x={250} y={304} textAnchor="middle" fontSize={17} fill={shade(C.red, -0.2)}>
          the e drops off
        </text>
      )}
      {result && rule === 'y' && (
        <text x={250} y={304} textAnchor="middle" fontSize={17} fill={shade(C.orange, -0.25)}>
          y becomes i
        </text>
      )}
      {result && rule === 'double' && (
        <text x={250} y={304} textAnchor="middle" fontSize={17} fill={shade(C.green, -0.3)}>
          the {word.base[word.base.length - 1]} doubles
        </text>
      )}

      {/* Ending tiles */}
      <text x={40} y={360} fontSize={15} fill={C.muted} className="caps">
        Endings: drag one into the slot
      </text>
      {(['ing', 'ed'] as const).map((s, i) => (
        <DragToken key={s} x={110 + i * 160} y={410} label={`Ending ${s}`} shakeKey={shake[s]} onTap={() => dropSuffix(s)} onDrop={(p) => inside(p, SLOT) && dropSuffix(s)}>
          <WordCard w={130} h={66} fontSize={34} parts={[{ t: s, c: shade(C.blue, -0.15), bold: true }]} fill={shade(C.blue, 0.85)} />
        </DragToken>
      ))}

      {/* Rule buttons */}
      {suf && (
        <g>
          <text x={500} y={456} fontSize={15} fill={C.muted} className="caps">
            Which rule?
          </text>
          {(['add', 'double', 'drop', 'y'] as const).map((r, i) => {
            const rr = RULE_RECT(i);
            return (
              <SvgButton
                key={r}
                x={rr.x}
                y={rr.y}
                w={rr.w}
                h={rr.h}
                fontSize={17}
                label={RULE_NAME[r]}
                disabled={wrongRules.includes(r) || !!rule}
                color={rule === r ? C.green : C.card}
                onClick={() => chooseRule(r)}
              />
            );
          })}
        </g>
      )}

      {wrap(message, 92).map((line, i) => (
        <text key={i} x={500} y={580 + i * 24} textAnchor="middle" fontSize={17} fill={C.ink2}>
          {line}
        </text>
      ))}

      <Callout at={[SLOT.x + SLOT.w / 2, SLOT.y]} box={[440, 108]} w={210} icon={Plus} title="Endings" text="-ing and -ed both start with a vowel, so the base word may change." />
      <Callout at={[818, 286]} box={[700, 340]} w={250} icon={Replace} title="Watch it change" text="Double the letter, drop the e, or change y to i." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={14} width={34} height={22} rx={5} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
      <text x={23} y={29} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>
        hop
      </text>
      <text x={46} y={30} fontSize={12} fontWeight={700} fill={C.ink}>
        +
      </text>
      <rect x={56} y={14} width={28} height={22} rx={5} fill={shade(C.blue, 0.85)} stroke={C.ink} strokeWidth={1.5} />
      <text x={70} y={29} textAnchor="middle" fontSize={11} fontWeight={700} fill={shade(C.blue, -0.15)}>
        ing
      </text>
      <rect x={22} y={46} width={76} height={26} rx={6} fill={shade(C.green, 0.8)} stroke={C.ink} strokeWidth={1.5} />
      <text x={60} y={63} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink}>
        hop<tspan fill={shade(C.green, -0.3)}>p</tspan>
        <tspan fill={shade(C.blue, -0.15)}>ing</tspan>
      </text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

/** Plausible misspellings: what you get by using the wrong rule. */
function wrongSpellings(w: Word, suf: Suffix): string[] {
  const b = w.base;
  const last = b[b.length - 1];
  let list: string[];
  if (w.kind === 'cvc') list = suf === 'ing' ? [b + 'ing', `${b}eing`] : [b + 'ed', `${b}${last}d`];
  else if (w.kind === 'silentE') list = suf === 'ing' ? [`${b}ing`, `${b.slice(0, -1)}${b[b.length - 2]}ing`] : [`${b}ed`, `${b.slice(0, -1)}${b[b.length - 2]}ed`];
  else if (w.kind === 'consY') list = suf === 'ing' ? [`${b.slice(0, -1)}iing`, `${b.slice(0, -1)}ieing`] : [`${b}ed`, `${b}ied`];
  else list = suf === 'ing' ? [`${b}${last}ing`, b.endsWith('y') ? `${b.slice(0, -1)}iing` : `${b}eing`] : [`${b}${last}ed`, b.endsWith('y') ? `${b.slice(0, -1)}ied` : `${b}t`];
  const right = apply(b, suf, ruleFor(w, suf));
  return [...new Set(list)].filter((x) => x !== right);
}

function explainFor(w: Word, suf: Suffix): string[] {
  const r = ruleFor(w, suf);
  const out = apply(w.base, suf, r);
  return [reason(w, suf), `So we ${RULE_NAME[r].charAt(0).toLowerCase()}${RULE_NAME[r].slice(1)}.`, `${w.base} + ${suf} = ${out}`];
}

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const w = pick(WORDS.filter((x) => x.kind !== 'consY'));
    const answer = apply(w.base, 'ing', ruleFor(w, 'ing'));
    return {
      prompt: `Add “ing” to “${w.base}”. Which spelling is right?`,
      choices: textChoices(answer, wrongSpellings(w, 'ing'), 3),
      answer,
      hint: 'Look at the end of the word: one short vowel and one consonant? A silent e?',
      explain: explainFor(w, 'ing'),
    };
  }
  if (level === 1) {
    const w = pick(WORDS.filter((x) => x.ed));
    const suf: Suffix = Math.random() < 0.6 ? 'ed' : 'ing';
    const answer = apply(w.base, suf, ruleFor(w, suf));
    return {
      prompt: `Add “${suf}” to “${w.base}”. Which spelling is right?`,
      choices: textChoices(answer, wrongSpellings(w, suf), 3),
      answer,
      hint: 'Check the last letters: consonant + y? silent e? short vowel + one consonant?',
      explain: explainFor(w, suf),
    };
  }
  if (Math.random() < 0.5) {
    const w = pick(WORDS.filter((x) => x.ed));
    const suf: Suffix = w.kind === 'consY' ? 'ed' : pick(['ing', 'ed'] as const);
    const answer = RULE_NAME[ruleFor(w, suf)];
    return {
      prompt: `Which rule do you use for ${w.base} + ${suf}?`,
      choices: shuffle(Object.values(RULE_NAME)).map((value) => ({ value })),
      answer,
      hint: 'Say the word and look at its last two letters.',
      explain: [reason(w, suf), `The rule is: ${answer}.`, `${w.base} + ${suf} = ${apply(w.base, suf, ruleFor(w, suf))}`],
    };
  }
  // The keep-the-y trap.
  const w = pick(WORDS.filter((x) => x.kind === 'consY'));
  const answer = apply(w.base, 'ing', 'add');
  return {
    prompt: `Add “ing” to “${w.base}”. Which spelling is right?`,
    choices: textChoices(answer, wrongSpellings(w, 'ing'), 3),
    answer,
    hint: 'Change y to i before -ed… but what about -ing?',
    explain: [`“${w.base}” ends in y.`, 'We keep the y before -ing, so we never get two i’s in a row.', `${w.base} + ing = ${answer}`],
  };
}

export const spellingRules: Lesson = {
  id: 'spelling-rules',
  title: 'Spelling Rules',
  Thumb,
  Scene: SpellingScene,
  sceneHint: 'Pick a word · Drag an ending into the slot · Choose the rule',
  learn: {
    heading: 'Adding -ing and -ed',
    intro:
      'When we add an ending that starts with a vowel, like -ing or -ed, the base word sometimes changes. Three rules tell us when.',
    points: [
      { icon: Copy, text: 'Short vowel + one consonant: double the last letter (hop → hopping).' },
      { icon: Eraser, text: 'Silent e at the end: drop the e (bake → baking).' },
      { icon: Replace, text: 'Consonant + y: change y to i before -ed (cry → cried), but keep it before -ing (crying).' },
      { icon: Plus, text: 'Anything else: just add the ending (jump → jumped).' },
    ],
  },
  steps: [
    'Say the base word and look at its last two letters.',
    'Short vowel and one consonant? Double the last letter.',
    'Silent e? Drop the e.',
    'Consonant + y and adding -ed? Change y to i. Otherwise, just add the ending.',
  ],
  example: {
    question: 'How do you spell hope + ing?',
    work: ['“hope” ends in a silent e.', '“-ing” starts with a vowel, so drop the e.', 'hope + ing = hoping (not “hopping”, which comes from hop).'],
    answer: 'hoping',
  },
  grownups: [
    'Contrast pairs help: hoping/hopping, taping/tapping. The doubled letter keeps the vowel short.',
    'Some verbs have irregular past tenses (run → ran, swim → swam, ride → rode). Those don’t take -ed at all.',
    'Doubling applies to one-syllable words with one short vowel and one final consonant; words ending in w, x or y don’t double.',
  ],
  makeQuestion,
};
