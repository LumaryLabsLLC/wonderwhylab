import { useState } from 'react';
import { Ear, Hand, Users } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { PIC, sayBlend, saySound, slash } from './phonics';
import { DragTile, Emoji, EmojiPicture, LetterTile, Panel, TileFace, TileRow } from './visuals/Tiles';

const DIGRAPHS = ['sh', 'ch', 'th', 'wh', 'ck'];

/** Picture words split into sounds; `gap` is the digraph the child adds. */
const WORDS: { word: string; units: string[]; gap: number }[] = [
  { word: 'ship', units: ['sh', 'i', 'p'], gap: 0 },
  { word: 'fish', units: ['f', 'i', 'sh'], gap: 2 },
  { word: 'chick', units: ['ch', 'i', 'ck'], gap: 0 },
  { word: 'bath', units: ['b', 'a', 'th'], gap: 2 },
  { word: 'duck', units: ['d', 'u', 'ck'], gap: 2 },
  { word: 'shell', units: ['sh', 'e', 'll'], gap: 0 },
  { word: 'dish', units: ['d', 'i', 'sh'], gap: 2 },
  { word: 'sock', units: ['s', 'o', 'ck'], gap: 2 },
  { word: 'lock', units: ['l', 'o', 'ck'], gap: 2 },
];

const unitW = (u: string) => (u.length > 1 ? 150 : 104);
const ROW_Y = 200;
const TRAY_Y = 512;
const trayX = (i: number) => 260 + i * 120;

function layout(units: string[]) {
  const gap = 16;
  const total = units.reduce((a, u) => a + unitW(u), 0) + gap * (units.length - 1);
  let x = 560 - total / 2;
  return units.map((u) => {
    const cx = x + unitW(u) / 2;
    x += unitW(u) + gap;
    return cx;
  });
}

function DigraphScene() {
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState<Record<string, number>>({});
  const item = WORDS[index];
  const xs = layout(item.units);
  const target = item.units[item.gap];
  const letters = item.word.length;

  const tryDigraph = (d: string) => {
    if (solved) return;
    if (d === target) {
      setSolved(true);
      setMessage('');
      play('correct');
      return;
    }
    setShake({ ...shake, [d]: (shake[d] ?? 0) + 1 });
    play('wrong');
    setMessage(`${d} says ${slash(d === 'ck' ? 'k' : d)}. Say “${item.word}” slowly — which sound goes in the gap?`);
  };
  const drop = (d: string, p: Pt) => {
    const gx = xs[item.gap];
    if (Math.abs(p.x - gx) < 100 && Math.abs(p.y - ROW_Y) < 100) tryDigraph(d);
    else setShake({ ...shake, [d]: (shake[d] ?? 0) + 1 });
  };
  const next = () => {
    setIndex((index + 1) % WORDS.length);
    setSolved(false);
    setMessage('');
  };

  return (
    <SceneSvg label={`Finish the word ${item.word}`}>
      <text x={500} y={52} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink}>
        Two letters, one sound — drag the team into the gap
      </text>

      <Panel x={70} y={100} w={200} h={200} />
      <Emoji x={170} y={200} char={PIC[item.word]} size={120} />

      {item.units.map((u, i) =>
        i === item.gap && !solved ? (
          <LetterTile key={i} x={xs[i]} y={ROW_Y} w={unitW(u)} h={120} fontSize={64} text="?" dashed />
        ) : (
          <LetterTile
            key={i}
            x={xs[i]}
            y={ROW_Y}
            w={unitW(u)}
            h={120}
            fontSize={64}
            text={u}
            color={i === item.gap ? shade(C.purple, 0.75) : C.card}
            glow={solved && i === item.gap}
            onTap={() => saySound(u)}
          />
        ),
      )}
      <SvgButton x={820} y={170} w={150} h={60} fontSize={20} label="Say it" color={C.teal} textColor={C.white} disabled={!solved} onClick={() => sayBlend(item.units, item.word)} />

      {/* Sound boxes: one box per sound */}
      {solved && (
        <g className="fade-up">
          {item.units.map((u, i) => (
            <g key={i} onClick={() => saySound(u)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Sound ${slash(u)}`}>
              <rect x={xs[i] - unitW(u) / 2} y={292} width={unitW(u)} height={58} rx={6} fill="white" stroke={C.ink} strokeWidth={2} />
              <circle cx={xs[i]} cy={312} r={7} fill={C.ink} />
              <text x={xs[i]} y={336} textAnchor="middle" fontSize={17} fill={C.ink2}>
                {slash(u === 'ck' ? 'k' : u === 'll' ? 'l' : u)}
              </text>
            </g>
          ))}
          <text x={560} y={396} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1f7a4a">
            {item.word}: {letters} letters, but only {item.units.length} sounds!
          </text>
        </g>
      )}
      {!solved && (
        <text x={560} y={340} textAnchor="middle" fontSize={19} fill={C.ink2}>
          {message || 'Tap a letter team below to hear its sound.'}
        </text>
      )}

      {DIGRAPHS.map((d, i) => (
        <DragTile key={d} x={trayX(i)} y={TRAY_Y} label={`${d} team`} shakeKey={shake[d] ?? 0} onDrop={(p) => drop(d, p)} onTap={() => (solved ? saySound(d) : tryDigraph(d))} disabled={solved && d === target}>
          <TileFace text={d} w={100} h={96} fontSize={48} color={shade(C.purple, 0.75)} />
        </DragTile>
      ))}
      <text x={500} y={590} textAnchor="middle" fontSize={16} fill={C.muted}>
        Tap a team to try it, or drag it into the gap.
      </text>
      <SvgButton x={820} y={600} w={150} h={56} fontSize={19} label={solved ? 'Next' : 'Skip'} color={solved ? C.yellow : C.card} onClick={next} />

      <Callout at={[xs[item.gap], ROW_Y - 60]} box={[360, 76]} w={190} icon={Users} title="Letter team" text="Two letters work together to make ONE new sound." />
      <Callout at={[trayX(0) - 50, TRAY_Y]} box={[20, 380]} w={180} icon={Hand} title="Drag or tap" text="Drop a team in the gap. Wrong teams wiggle back." />
      <Callout at={[xs[0] - unitW(item.units[0]) / 2, 320]} box={[60, 470]} w={170} icon={Ear} title="Count sounds" text="Each box is one sound. Tap a box to hear it." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <text x={24} y={40} textAnchor="middle" dominantBaseline="central" fontSize={32}>
        🐟
      </text>
      {['f', 'i', 'sh'].map((u, i) => (
        <g key={u}>
          <rect x={46 + i * 22 + (i === 2 ? 0 : 0)} y={24} width={i === 2 ? 30 : 20} height={32} rx={5} fill={i === 2 ? shade(C.purple, 0.7) : 'white'} stroke={C.ink} strokeWidth={2} />
          <text x={56 + i * 22 + (i === 2 ? 5 : 0)} y={41} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.ink}>
            {u}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const COUNT_WORDS: { word: string; units: string[] }[] = [
  { word: 'ship', units: ['sh', 'i', 'p'] },
  { word: 'fish', units: ['f', 'i', 'sh'] },
  { word: 'chick', units: ['ch', 'i', 'ck'] },
  { word: 'duck', units: ['d', 'u', 'ck'] },
  { word: 'bath', units: ['b', 'a', 'th'] },
  { word: 'chop', units: ['ch', 'o', 'p'] },
  { word: 'thin', units: ['th', 'i', 'n'] },
  { word: 'when', units: ['wh', 'e', 'n'] },
  { word: 'much', units: ['m', 'u', 'ch'] },
  { word: 'moth', units: ['m', 'o', 'th'] },
  { word: 'shut', units: ['sh', 'u', 't'] },
  { word: 'check', units: ['ch', 'e', 'ck'] },
  { word: 'clock', units: ['c', 'l', 'o', 'ck'] },
  { word: 'trash', units: ['t', 'r', 'a', 'sh'] },
];

/** "Which word has the same first/last sound as the picture word?" */
const SAME_SOUND: { pic: string; picWord: string; where: 'first' | 'last'; sound: string; answer: string; others: [string, string] }[] = [
  { pic: '🚢', picWord: 'ship', where: 'first', sound: 'sh', answer: 'shop', others: ['chop', 'top'] },
  { pic: '🐤', picWord: 'chick', where: 'first', sound: 'ch', answer: 'chin', others: ['shin', 'thin'] },
  { pic: '🐚', picWord: 'shell', where: 'first', sound: 'sh', answer: 'shed', others: ['wed', 'red'] },
  { pic: '🐟', picWord: 'fish', where: 'last', sound: 'sh', answer: 'wish', others: ['with', 'wick'] },
  { pic: '🛁', picWord: 'bath', where: 'last', sound: 'th', answer: 'with', others: ['wish', 'wit'] },
  { pic: '🦆', picWord: 'duck', where: 'last', sound: 'ck', answer: 'back', others: ['bath', 'bash'] },
  { pic: '🍽️', picWord: 'dish', where: 'last', sound: 'sh', answer: 'cash', others: ['cat', 'cap'] },
];

const teamOf = (units: string[]) => units.find((u) => u.length > 1) ?? units[0];
const soundName = (u: string) => slash(u === 'ck' ? 'k' : u === 'll' ? 'l' : u);

function makeQuestion(level: number): Question {
  if (level === 0) {
    const item = pick(WORDS);
    const target = item.units[item.gap];
    const others = shuffle(DIGRAPHS.filter((d) => d !== target)).slice(0, 2);
    return {
      prompt: 'Which letter team fills the gap?',
      visual: <TileRow emoji={PIC[item.word]} tiles={item.units.map((u, i) => ({ text: u, gap: i === item.gap }))} label={`${item.word} with a gap`} />,
      choices: shuffle([target, ...others]).map((value) => ({ value })),
      answer: target,
      hint: 'Say the picture word slowly. What sound is missing?',
      explain: [
        `Say ${item.word} slowly: ${item.units.map(soundName).join(' ')}.`,
        `The missing sound is ${soundName(target)}.`,
        `${soundName(target)} is spelled ${target}, so the word is ${item.word}.`,
      ],
    };
  }
  if (level === 1) {
    const item = pick(COUNT_WORDS);
    const n = item.units.length;
    const team = teamOf(item.units);
    return {
      prompt: `How many sounds are in “${item.word}”?`,
      visual: <TileRow tiles={item.word.split('').map((l) => ({ text: l }))} label={item.word} />,
      choices: shuffle([n - 1, n, n + 1]).map((v) => ({ value: String(v) })),
      answer: String(n),
      hint: 'Look for two letters that work as a team to make one sound.',
      explain: [
        `Say ${item.word} slowly: ${item.units.map(soundName).join(' ')}.`,
        `${team} is two letters but one sound.`,
        `So ${item.word} has ${item.word.length} letters and ${n} sounds.`,
      ],
    };
  }
  const item = pick(SAME_SOUND);
  return {
    prompt: `Which word has the same ${item.where} sound as the picture word?`,
    visual: <EmojiPicture char={item.pic} label="A picture" />,
    choices: shuffle([item.answer, ...item.others]).map((value) => ({ value })),
    answer: item.answer,
    hint: `Say the picture word and listen to its ${item.where} sound. Which letters spell that sound?`,
    explain: [
      `The picture is a ${item.picWord}. Its ${item.where} sound is ${soundName(item.sound)}.`,
      `${soundName(item.sound)} is spelled ${item.sound}.`,
      `${item.answer} has ${item.sound} too, so ${item.answer} is the answer.`,
    ],
  };
}

export const digraphs: Lesson = {
  id: 'digraphs',
  title: 'Two Letters, One Sound',
  Thumb,
  Scene: DigraphScene,
  sceneHint: 'Drag a letter team into the gap · Tap tiles to hear them',
  learn: {
    heading: 'Letter teams',
    intro: 'Some letters work as a team. Together they make ONE new sound: sh in ship, ch in chick, th in bath, wh in when, and ck in duck.',
    points: [
      { icon: Users, text: 'sh, ch, th and wh are two letters with one sound.' },
      { icon: Ear, text: 'ck says /k/ at the end of short words like duck and sock.' },
      { icon: Hand, text: 'Count sounds, not letters: fish has 4 letters but 3 sounds.' },
    ],
  },
  steps: ['Look for a letter team in the word.', 'Say the team as ONE sound.', 'Say the other sounds.', 'Blend them: /sh/ /i/ /p/ → ship.'],
  example: {
    question: 'Read the word: c h i c k',
    visual: <TileRow tiles={[{ text: 'ch', color: shade(C.purple, 0.75) }, { text: 'i' }, { text: 'ck', color: shade(C.purple, 0.75) }]} label="ch i ck" />,
    work: ['ch is a team: /ch/.', 'i says /i/.', 'ck is a team: /k/.', 'Blend them: /ch/ /i/ /k/ → chick.'],
    answer: 'The word is chick — 5 letters, 3 sounds.',
  },
  grownups: [
    'Say the team as one sound (“shh”), never as two letter names (“ess-aitch”).',
    'Counting sounds with fingers or boxes helps children see that letters and sounds aren’t one-to-one.',
    'th has two sounds in English (thin and this). Both are spelled th, so either is fine here.',
    'Spot teams in everyday words: shoe, chair, the, what, back.',
  ],
  makeQuestion,
};
