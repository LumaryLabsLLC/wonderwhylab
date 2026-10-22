import { useState } from 'react';
import { Box, Footprints, PencilLine } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { mcq, level3 } from '../sounds/q';
import { Note } from '../sounds/visuals/Pictures';
import { PIC } from './phonics';
import { DragTile, Emoji, TileFace } from './visuals/Tiles';

/** Naming words (nouns): things you can point to. */
const NOUNS = ['cat', 'hen', 'bed', 'frog', 'pig', 'egg', 'van', 'hat', 'fox', 'sun', 'bus', 'box'];
/** Doing words (verbs): things you can do. */
const VERBS = ['sit', 'dig', 'hop', 'swim', 'jump', 'run', 'clap', 'sing', 'kick', 'spin', 'nap', 'grin'];

type Kind = 'noun' | 'verb';
const kindOf = (w: string): Kind => (NOUNS.includes(w) || BUILD_NOUNS.includes(w) ? 'noun' : 'verb');
const KIND_NAME: Record<Kind, string> = { noun: 'naming word', verb: 'doing word' };

// ───────────────────────── Sort ─────────────────────────

const BIN_Y = 290;
const BIN_H = 270;
const BINS: { kind: Kind; x: number; title: string; frame: string; color: string }[] = [
  { kind: 'noun', x: 40, title: 'Naming words', frame: 'a ___', color: C.blue },
  { kind: 'verb', x: 530, title: 'Doing words', frame: 'I can ___', color: C.red },
];
const BIN_W = 430;

function SortMode() {
  const deal = () => shuffle([...shuffle(NOUNS).slice(0, 3), ...shuffle(VERBS).slice(0, 3)]);
  const [words, setWords] = useState(deal);
  const [sorted, setSorted] = useState<string[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [shake, setShake] = useState({ id: '', key: 0 });
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const all = sorted.length === words.length;

  const drop = (word: string, kind: Kind) => {
    if (kindOf(word) === kind) {
      const next = [...sorted, word];
      setSorted(next);
      setLast(word);
      play(next.length === words.length ? 'correct' : 'pop');
      setMsg(
        next.length === words.length
          ? { text: 'All sorted! Naming words name things. Doing words tell what someone does.', tone: 'good' }
          : { text: kind === 'noun' ? `“a ${word}” makes sense: ${word} is a naming word.` : `“I can ${word}” makes sense: ${word} is a doing word.`, tone: 'good' },
      );
      return;
    }
    play('wrong');
    setShake((s) => ({ id: word, key: s.key + 1 }));
    setMsg({
      text: kind === 'verb' ? `“I can ${word}”? That doesn't make sense. Can you point to a ${word}? Then it's a naming word.` : `Can you point to a “${word}”? Try “I can ${word}”. If you can do it, it's a doing word.`,
      tone: 'try',
    });
  };
  const dropAt = (word: string, p: Pt) => {
    if (p.y < BIN_Y - 30) return;
    const bin = BINS.find((b) => p.x >= b.x - 20 && p.x <= b.x + BIN_W + 20);
    if (bin) drop(word, bin.kind);
  };
  const fresh = () => {
    setWords(deal());
    setSorted([]);
    setLast(null);
    setMsg(null);
    play('pop');
  };

  return (
    <g>
      <SvgButton x={790} y={22} w={170} h={52} fontSize={18} label="New words" onClick={fresh} color={all ? C.yellow : C.card} />
      <text x={500} y={118} textAnchor="middle" fontSize={18} fill={C.ink2}>
        Drag each word to its basket. Tap a word to hear it.
      </text>

      {BINS.map((b) => {
        const inBin = sorted.filter((w) => kindOf(w) === b.kind);
        return (
          <g key={b.kind}>
            <rect x={b.x} y={BIN_Y} width={BIN_W} height={BIN_H} rx={24} fill={shade(b.color, 0.85)} stroke={C.ink} strokeWidth={2.5} />
            <text x={b.x + BIN_W / 2} y={BIN_Y + 40} textAnchor="middle" fontSize={24} fontWeight={700} fill={C.ink}>
              {b.title}
            </text>
            <text x={b.x + BIN_W / 2} y={BIN_Y + 72} textAnchor="middle" fontSize={19} fill={C.ink2}>
              Test it: “{last && kindOf(last) === b.kind ? b.frame.replace('___', last) : b.frame}”
            </text>
            {inBin.map((w, i) => (
              <g key={w}>
                <rect x={b.x + 24 + (i % 3) * 132} y={BIN_Y + 104 + Math.floor(i / 3) * 74} width={118} height={58} rx={12} fill={C.white} stroke={C.ink} strokeWidth={2} />
                <text x={b.x + 83 + (i % 3) * 132} y={BIN_Y + 135 + Math.floor(i / 3) * 74} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink}>
                  {w}
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {words.map((w, k) =>
        sorted.includes(w) ? null : (
          <DragTile key={`${words.join()}-${w}`} x={100 + k * 160} y={190} label={`Word: ${w}. Drag it to a basket.`} shakeKey={shake.id === w ? shake.key : 0} onTap={() => speak(w, { force: true })} onDrop={(p) => dropAt(w, p)}>
            <TileFace text={w} w={136} h={68} fontSize={32} color={C.white} />
          </DragTile>
        ),
      )}

      <Note x={60} y={584} w={880} h={70} tone={msg?.tone ?? 'plain'} text={msg?.text ?? 'Naming words name a person, animal, place or thing. Doing words tell what someone does.'} />
      <Callout at={[BINS[0].x + BIN_W / 2, BIN_Y + 72]} box={[30, 110]} w={220} icon={Box} title="Naming word" text="Can you point to it? It's a naming word (a noun)." />
      <Callout at={[BINS[1].x + BIN_W / 2, BIN_Y + 72]} box={[740, 110]} w={220} icon={Footprints} title="Doing word" text="Can you do it? It's a doing word (a verb)." />
    </g>
  );
}

// ───────────────────────── Build ─────────────────────────

const BUILD_NOUNS = ['cat', 'frog', 'fish', 'duck', 'pig', 'hen'];
const BUILD_VERBS = ['hops', 'runs', 'swims', 'spins', 'naps', 'sings'];
const BUILD_PIC: Record<string, string> = { ...PIC, fish: '🐟', duck: '🦆' };

/** The naming word acted out by the doing word. */
function Actor({ noun, verb }: { noun: string; verb: string }) {
  const cx = 500;
  const cy = 310;
  const anim =
    verb === 'hops' ? (
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 -36; 0 0" dur="0.6s" repeatCount="4" />
    ) : verb === 'runs' ? (
      <animateTransform attributeName="transform" type="translate" values="0 0; 120 0; -120 0; 0 0" dur="1.6s" repeatCount="2" />
    ) : verb === 'spins' ? (
      <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy}; 360 ${cx} ${cy}`} dur="1s" repeatCount="3" />
    ) : verb === 'swims' ? (
      <animateTransform attributeName="transform" type="translate" values="-90 0; -45 -12; 0 0; 45 -12; 90 0; 0 0; -90 0" dur="3s" repeatCount="2" />
    ) : null;
  return (
    <g>
      {verb === 'swims' && <ellipse cx={cx} cy={cy + 30} rx={200} ry={34} fill={C.blue} opacity={0.4} />}
      <g key={`${noun}-${verb}`}>
        {anim}
        <g transform={verb === 'naps' ? `rotate(-20 ${cx} ${cy})` : undefined}>
          <Emoji x={cx} y={cy} char={BUILD_PIC[noun]} size={96} />
        </g>
      </g>
      {verb === 'naps' && (
        <text x={cx + 70} y={cy - 50} fontSize={30} fontWeight={700} fill={C.blue}>
          z z z
        </text>
      )}
      {verb === 'sings' && <Emoji x={cx + 80} y={cy - 50} char="🎵" size={40} />}
    </g>
  );
}

const NOUN_SLOT = { x: 390, w: 170 };
const VERB_SLOT = { x: 580, w: 170 };
const SLOT_Y = 100;

function BuildMode() {
  const [noun, setNoun] = useState<string | null>(null);
  const [verb, setVerb] = useState<string | null>(null);
  const [shake, setShake] = useState({ id: '', key: 0 });
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' } | null>(null);
  const done = !!noun && !!verb;

  const place = (word: string, slot: Kind) => {
    const kind = kindOf(word);
    if (kind !== slot) {
      play('wrong');
      setShake((s) => ({ id: word, key: s.key + 1 }));
      setMsg({ text: `“${word}” is a ${KIND_NAME[kind]}. This box needs a ${KIND_NAME[slot]}.`, tone: 'try' });
      return;
    }
    const n = slot === 'noun' ? word : noun;
    const v = slot === 'verb' ? word : verb;
    if (slot === 'noun') setNoun(word);
    else setVerb(word);
    play(n && v ? 'correct' : 'pop');
    setMsg(n && v ? { text: `“The ${n} ${v}.” ${n} is the naming word. ${v} is the doing word. Try another!`, tone: 'good' } : null);
  };
  const tap = (word: string) => place(word, kindOf(word));
  const dropAt = (word: string, p: Pt) => {
    if (Math.abs(p.y - (SLOT_Y + 38)) > 80) return;
    if (p.x >= NOUN_SLOT.x - 20 && p.x <= NOUN_SLOT.x + NOUN_SLOT.w + 20) place(word, 'noun');
    else if (p.x >= VERB_SLOT.x - 20 && p.x <= VERB_SLOT.x + VERB_SLOT.w + 20) place(word, 'verb');
  };

  const slot = (s: { x: number; w: number }, word: string | null, color: string, label: string) => (
    <g>
      <rect x={s.x} y={SLOT_Y} width={s.w} height={76} rx={14} fill={word ? shade(color, 0.75) : C.white} stroke={word ? C.ink : color} strokeWidth={word ? 2.5 : 3} strokeDasharray={word ? undefined : '10 8'} />
      <text x={s.x + s.w / 2} y={SLOT_Y + 40} textAnchor="middle" dominantBaseline="central" fontSize={34} fontWeight={700} fill={C.ink}>
        {word ?? ''}
      </text>
      <text x={s.x + s.w / 2} y={SLOT_Y + 104} textAnchor="middle" fontSize={17} fontWeight={700} fill={shade(color, -0.3)}>
        {label}
      </text>
    </g>
  );

  return (
    <g>
      <text x={370} y={SLOT_Y + 52} textAnchor="end" fontSize={40} fontWeight={700} fill={C.ink}>
        The
      </text>
      {slot(NOUN_SLOT, noun, C.blue, 'naming word')}
      {slot(VERB_SLOT, verb, C.red, 'doing word')}
      <text x={758} y={SLOT_Y + 64} fontSize={60} fontWeight={700} fill={C.ink}>
        .
      </text>
      <SvgButton x={800} y={SLOT_Y + 12} w={150} h={52} fontSize={18} label="Read it" onClick={() => speak(`The ${noun ?? ''} ${verb ?? ''}.`, { force: true })} disabled={!done} />

      {/* The sentence, acted out */}
      <rect x={250} y={236} width={500} height={150} rx={20} fill={C.card} stroke={C.line} strokeWidth={2} />
      {noun ? (
        <Actor noun={noun} verb={verb ?? ''} />
      ) : (
        <text x={500} y={316} textAnchor="middle" fontSize={18} fill={C.muted}>
          Pick a naming word and a doing word.
        </text>
      )}

      {/* Word cards */}
      <text x={40} y={418} fontSize={18} fontWeight={700} fill={shade(C.blue, -0.3)}>
        Naming words
      </text>
      {BUILD_NOUNS.map((w, i) => (
        <DragTile key={w} x={112 + i * 155} y={460} label={`Naming word ${w}`} shakeKey={shake.id === w ? shake.key : 0} onTap={() => tap(w)} onDrop={(p) => dropAt(w, p)}>
          <TileFace text={w} w={134} h={60} fontSize={30} color={w === noun ? shade(C.blue, 0.75) : C.white} />
        </DragTile>
      ))}
      <text x={40} y={512} fontSize={18} fontWeight={700} fill={shade(C.red, -0.3)}>
        Doing words
      </text>
      {BUILD_VERBS.map((w, i) => (
        <DragTile key={w} x={112 + i * 155} y={552} label={`Doing word ${w}`} shakeKey={shake.id === w ? shake.key : 0} onTap={() => tap(w)} onDrop={(p) => dropAt(w, p)}>
          <TileFace text={w} w={134} h={60} fontSize={30} color={w === verb ? shade(C.red, 0.75) : C.white} />
        </DragTile>
      ))}

      <Note x={60} y={604} w={880} h={60} tone={msg?.tone ?? 'plain'} text={msg?.text ?? 'Every sentence needs a naming word and a doing word. Drag one of each into the boxes.'} />
    </g>
  );
}

function WordsScene() {
  const [mode, setMode] = useState<'sort' | 'build'>('sort');
  return (
    <SceneSvg label={mode === 'sort' ? 'Sort naming words and doing words' : 'Build a sentence with a naming word and a doing word'}>
      <SvgButton x={40} y={22} w={180} h={52} fontSize={18} label="Sort words" onClick={() => setMode('sort')} active={mode === 'sort'} color={mode === 'sort' ? C.yellow : C.card} />
      <SvgButton x={234} y={22} w={220} h={52} fontSize={18} label="Build a sentence" onClick={() => setMode('build')} active={mode === 'build'} color={mode === 'build' ? C.yellow : C.card} />
      {mode === 'sort' ? <SortMode /> : <BuildMode />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={30} width={50} height={44} rx={6} fill={shade(C.blue, 0.8)} stroke={C.ink} strokeWidth={1.5} />
      <rect x={64} y={30} width={50} height={44} rx={6} fill={shade(C.red, 0.8)} stroke={C.ink} strokeWidth={1.5} />
      <text x={31} y={58} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>
        cat
      </text>
      <text x={89} y={58} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>
        hop
      </text>
      <rect x={38} y={4} width={44} height={20} rx={4} fill={C.white} stroke={C.ink} strokeWidth={1.2} />
      <text x={60} y={19} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>
        run
      </text>
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

function whichKind(): Question {
  const word = pick([...NOUNS, ...VERBS]);
  const kind = kindOf(word);
  return mcq({
    prompt: `Is “${word}” a naming word or a doing word?`,
    answer: KIND_NAME[kind],
    wrong: [KIND_NAME[kind === 'noun' ? 'verb' : 'noun']],
    hint: `Can you point to a ${word}? Or is it something you can do?`,
    explain:
      kind === 'noun'
        ? [`You can point to a ${word}: it's a thing.`, `“I can ${word}” doesn't make sense.`, `So ${word} is a naming word.`]
        : [`“I can ${word}” makes sense: it's something you do.`, `You can't point to a “${word}” like a thing.`, `So ${word} is a doing word.`],
  });
}

function findOne(): Question {
  const wantVerb = Math.random() < 0.5;
  const answer = pick(wantVerb ? VERBS : NOUNS);
  const wrong = shuffle(wantVerb ? NOUNS : VERBS).slice(0, 2);
  return mcq({
    prompt: wantVerb ? 'Which word is a doing word?' : 'Which word is a naming word?',
    answer,
    wrong,
    hint: wantVerb ? 'Put “I can” in front of each word. Which makes sense?' : 'Which one can you point to?',
    explain: wantVerb
      ? [`“I can ${answer}” makes sense.`, `${wrong.join(' and ')} are things, not actions.`, `So the doing word is ${answer}.`]
      : [`You can point to a ${answer}.`, `${wrong.join(' and ')} are things you do.`, `So the naming word is ${answer}.`],
  });
}

/** Sentences with exactly one naming word (after The/A) and one doing word. */
const SENTENCES: { words: string[]; noun: string; verb: string; other: string }[] = [
  { words: ['The', 'pig', 'digs', 'in', 'the', 'mud.'], noun: 'pig', verb: 'digs', other: 'in' },
  { words: ['A', 'frog', 'hops', 'up.'], noun: 'frog', verb: 'hops', other: 'up' },
  { words: ['The', 'fox', 'runs', 'fast.'], noun: 'fox', verb: 'runs', other: 'fast' },
  { words: ['A', 'duck', 'swims', 'well.'], noun: 'duck', verb: 'swims', other: 'well' },
  { words: ['The', 'hen', 'sits', 'still.'], noun: 'hen', verb: 'sits', other: 'still' },
  { words: ['The', 'cat', 'naps', 'on', 'the', 'bed.'], noun: 'cat', verb: 'naps', other: 'on' },
];

function inSentence(): Question {
  const s = pick(SENTENCES);
  const wantVerb = Math.random() < 0.6;
  const answer = wantVerb ? s.verb : s.noun;
  return mcq({
    prompt: `Which of these is a ${wantVerb ? 'doing' : 'naming'} word? “${s.words.join(' ')}”`,
    answer,
    wrong: [wantVerb ? s.noun : s.verb, s.other],
    hint: wantVerb ? 'Find who the sentence is about. What do they do?' : 'Which word names an animal?',
    explain: wantVerb
      ? [`The sentence is about the ${s.noun}.`, `What does the ${s.noun} do? It ${s.verb}.`, `So the doing word is ${s.verb}.`]
      : [`${s.verb} is what happens: a doing word.`, `${s.noun} names an animal.`, `So the naming word is ${s.noun}.`],
  });
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv === 0) return whichKind();
  if (lv === 1) return findOne();
  return inSentence();
}

export const nounsAndVerbs: Lesson = {
  id: 'nouns-and-verbs',
  title: 'Naming and Doing Words',
  Thumb,
  Scene: WordsScene,
  sceneHint: 'Sort the words · Then build “The ___ ___.” with one of each',
  learn: {
    heading: 'Naming words and doing words',
    intro: 'Words have jobs. Naming words (nouns) name people, animals, places and things. Doing words (verbs) tell what someone does.',
    points: [
      { icon: Box, text: 'Naming words: cat, bed, sun. Can you point to it?' },
      { icon: Footprints, text: 'Doing words: hop, dig, sing. Can you do it? “I can hop.”' },
      { icon: PencilLine, text: 'A sentence needs both: The frog hops.' },
    ],
  },
  steps: ['Read the word.', 'Ask: can I point to it? Then it names something.', 'Ask: can I do it? Try “I can ___”.', 'Put a naming word and a doing word together to make a sentence.'],
  example: {
    question: 'Find the naming word and the doing word: “The dog digs.”',
    work: ['Who is it about? The dog. dog is a naming word.', 'What does the dog do? It digs.', 'digs is the doing word.'],
    answer: 'dog is the naming word; digs is the doing word.',
  },
  grownups: [
    'Children understand “naming words” and “doing words” before the terms noun and verb. Use both.',
    'Some words can be both: “I like to run” (doing) and “a long run” (naming). How the word is used in the sentence decides.',
    'Play “I can…”: take turns acting out doing words, then pointing to naming words around the room.',
    'Every sentence needs at least one naming word and one doing word.',
  ],
  makeQuestion,
};
