import { useState } from 'react';
import { Ear, Puzzle, Users } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken, inside } from './visuals/DragToken';
import { Emoji, WordCard } from './visuals/Cards';
import type { Part } from './visuals/Cards';
import { sample, textChoices } from './q';

type Team = 'ai' | 'ay' | 'ee' | 'ea' | 'oa' | 'ow' | 'igh';
type SoundId = 'a' | 'e' | 'o' | 'i';

interface Sound {
  id: SoundId;
  name: string;
  /** How the sound is said, for read-aloud and explanations. */
  say: string;
  key: string;
  teams: Team[];
  color: string;
}

const SOUNDS: Sound[] = [
  { id: 'a', name: 'long a', say: 'ay', key: 'rain', teams: ['ai', 'ay'], color: C.red },
  { id: 'e', name: 'long e', say: 'ee', key: 'feet', teams: ['ee', 'ea'], color: C.green },
  { id: 'o', name: 'long o', say: 'oh', key: 'boat', teams: ['oa', 'ow'], color: C.blue },
  { id: 'i', name: 'long i', say: 'eye', key: 'night', teams: ['igh'], color: C.purple },
];

const soundOf = (team: Team) => SOUNDS.find((s) => s.teams.includes(team))!;

/** Words that use each team (ow words here all say the long o sound, as in snow). */
const WORDS: Record<Team, string[]> = {
  ai: ['rain', 'train', 'paint', 'snail', 'tail', 'wait'],
  ay: ['play', 'day', 'tray', 'stay', 'gray', 'spray'],
  ee: ['feet', 'tree', 'sheep', 'green', 'sleep', 'seed'],
  ea: ['seat', 'leaf', 'beach', 'dream', 'team', 'peach'],
  oa: ['boat', 'coat', 'road', 'soap', 'toast', 'goat'],
  ow: ['snow', 'grow', 'slow', 'bowl', 'show', 'crow'],
  igh: ['night', 'light', 'high', 'bright', 'right', 'sight'],
};
const TEAMS = Object.keys(WORDS) as Team[];
const ALL_WORDS = TEAMS.flatMap((team) => WORDS[team].map((w) => ({ w, team })));

/** Split a word into parts with its vowel team coloured. */
function teamParts(word: string, team: Team, color: string, show = true): Part[] {
  const i = word.indexOf(team);
  if (i < 0 || !show) return [{ t: word }];
  return [{ t: word.slice(0, i) }, { t: team, c: color, bold: true }, { t: word.slice(i + team.length) }];
}

// ───────────────────────── Scene ─────────────────────────

const HOUSE = { y: 96, w: 214, h: 196, gap: 14, x0: 40 };
const houseRect = (i: number) => ({ x: HOUSE.x0 + i * (HOUSE.w + HOUSE.gap), y: HOUSE.y, w: HOUSE.w, h: HOUSE.h });
const PILE_Y = 386;
const pileX = (i: number) => 112 + i * 155;

/** Picture words for the build bench (spelling = encoding). */
const BUILD = [
  { word: 'rain', team: 'ai' as Team, pic: '🌧️' },
  { word: 'train', team: 'ai' as Team, pic: '🚂' },
  { word: 'snail', team: 'ai' as Team, pic: '🐌' },
  { word: 'paint', team: 'ai' as Team, pic: '🎨' },
  { word: 'tree', team: 'ee' as Team, pic: '🌳' },
  { word: 'sheep', team: 'ee' as Team, pic: '🐑' },
  { word: 'bee', team: 'ee' as Team, pic: '🐝' },
  { word: 'leaf', team: 'ea' as Team, pic: '🍃' },
  { word: 'peach', team: 'ea' as Team, pic: '🍑' },
  { word: 'boat', team: 'oa' as Team, pic: '⛵' },
  { word: 'goat', team: 'oa' as Team, pic: '🐐' },
  { word: 'soap', team: 'oa' as Team, pic: '🧼' },
  { word: 'snow', team: 'ow' as Team, pic: '❄️' },
  { word: 'bowl', team: 'ow' as Team, pic: '🥣' },
  { word: 'light', team: 'igh' as Team, pic: '💡' },
  { word: 'night', team: 'igh' as Team, pic: '🌙' },
];

function VowelTeamsScene() {
  const [mode, setMode] = useState<'sort' | 'build'>('sort');
  return (
    <SceneSvg label="Vowel teams: sort words into sound houses, or build words with team tiles">
      <SvgButton x={40} y={22} w={170} h={50} fontSize={18} label="Sort words" active={mode === 'sort'} color={mode === 'sort' ? C.yellow : C.card} onClick={() => setMode('sort')} />
      <SvgButton x={222} y={22} w={170} h={50} fontSize={18} label="Build words" active={mode === 'build'} color={mode === 'build' ? C.yellow : C.card} onClick={() => setMode('build')} />
      {mode === 'sort' ? <SortBench /> : <BuildBench />}
    </SceneSvg>
  );
}

function deal() {
  // Six words, at least one for every sound so every house gets a visitor.
  const firsts = SOUNDS.map((s) => {
    const team = pick(s.teams);
    return { w: pick(WORDS[team]), team };
  });
  const rest = sample(
    ALL_WORDS.filter((x) => !firsts.some((f) => f.w === x.w)),
    2,
  );
  return shuffle([...firsts, ...rest]).map((x, i) => ({ ...x, id: `${x.w}-${i}-${Math.random()}` }));
}

function SortBench() {
  const [cards, setCards] = useState(deal);
  const [placed, setPlaced] = useState<Record<SoundId, string[]>>({ a: [], e: [], o: [], i: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('Read each word. Drag it to the house with the same vowel sound.');

  const tryPlace = (id: string, house: number) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const target = SOUNDS[house];
    if (target.teams.includes(card.team)) {
      play('correct');
      setPlaced({ ...placed, [target.id]: [...placed[target.id], card.w] });
      setCards(cards.filter((c) => c.id !== id));
      setSelected(null);
      setMessage(`Yes! In “${card.w}”, ${card.team} says the ${target.name} sound, “${target.say}”.`);
    } else {
      play('wrong');
      setShake({ ...shake, [id]: (shake[id] ?? 0) + 1 });
      setReveal({ ...reveal, [id]: true });
      setMessage(`Not yet. Look at the coloured letters in “${card.w}”: ${card.team}. Which sound do they make?`);
    }
  };

  const drop = (id: string, p: Pt) => {
    const house = SOUNDS.findIndex((_, i) => inside(p, houseRect(i)));
    if (house >= 0) tryPlace(id, house);
  };

  const sel = cards.find((c) => c.id === selected);
  return (
    <g>
      {SOUNDS.map((s, i) => {
        const r = houseRect(i);
        const words = placed[s.id];
        return (
          <g key={s.id} onClick={() => selected && tryPlace(selected, i)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan={selected ? true : undefined}>
            <polygon
              points={`${r.x - 8},${r.y + 40} ${r.x + r.w / 2},${r.y - 6} ${r.x + r.w + 8},${r.y + 40}`}
              fill={s.color}
              stroke={C.ink}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <rect x={r.x} y={r.y + 38} width={r.w} height={r.h - 38} rx={10} fill={shade(s.color, 0.85)} stroke={C.ink} strokeWidth={2.5} />
            <text x={r.x + r.w / 2} y={r.y + 26} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.white}>
              {s.name}
            </text>
            <text x={r.x + r.w / 2} y={r.y + 76} textAnchor="middle" fontSize={30} fontWeight={800} fill={shade(s.color, -0.35)}>
              {s.teams.join('  ')}
            </text>
            <text x={r.x + r.w / 2} y={r.y + 102} textAnchor="middle" fontSize={15} fill={C.ink2}>
              says “{s.say}”, as in {s.key}
            </text>
            {words.slice(-3).map((w, k) => (
              <text key={w + k} x={r.x + r.w / 2} y={r.y + 130 + k * 22} textAnchor="middle" fontSize={18} fontWeight={600} fill={C.ink}>
                {w}
              </text>
            ))}
            {words.length > 3 && (
              <text x={r.x + r.w - 14} y={r.y + r.h - 10} textAnchor="end" fontSize={14} fill={C.muted}>
                +{words.length - 3}
              </text>
            )}
          </g>
        );
      })}

      {cards.map((c) => {
        const index = cards.indexOf(c);
        const s = soundOf(c.team);
        return (
          <DragToken
            key={c.id}
            x={pileX(index)}
            y={PILE_Y}
            label={`Word card: ${c.w}`}
            selected={selected === c.id}
            shakeKey={shake[c.id] ?? 0}
            onTap={() => {
              play('tap');
              setSelected(selected === c.id ? null : c.id);
            }}
            onDrop={(p) => drop(c.id, p)}
          >
            <WordCard w={140} parts={teamParts(c.w, c.team, s.color, !!reveal[c.id])} state={selected === c.id ? 'selected' : 'idle'} />
          </DragToken>
        );
      })}

      {cards.length === 0 && (
        <text x={500} y={PILE_Y + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
          All sorted! Great reading.
        </text>
      )}

      <text x={500} y={470} textAnchor="middle" fontSize={17} fill={C.ink2}>
        {message}
      </text>

      <SvgButton x={330} y={510} w={160} h={52} fontSize={17} label="Say it" title="Hear the chosen word" disabled={!sel} onClick={() => sel && speak(sel.w, { force: true })} />
      <SvgButton
        x={510}
        y={510}
        w={160}
        h={52}
        fontSize={17}
        label="New words"
        color={C.teal}
        textColor={C.white}
        onClick={() => {
          setCards(deal());
          setSelected(null);
          setReveal({});
          setMessage('Read each word. Drag it to the house with the same vowel sound.');
        }}
      />

      <Callout at={[houseRect(0).x + 107, houseRect(0).y + 70]} box={[60, 590]} w={250} icon={Users} title="Teams work together" text="Two or three letters can team up to make one vowel sound." />
      <Callout at={[houseRect(1).x + 107, houseRect(1).y + 70]} box={[700, 590]} w={250} icon={Ear} title="Same sound, two spellings" text="ee and ea both say “ee”. Remember which one each word uses." />
    </g>
  );
}

const TRAY: Team[] = ['ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'igh'];
const trayX = (i: number) => 140 + i * 120;
const GAP = { x: 0, y: 200, w: 132, h: 96 };

function BuildBench() {
  const [order] = useState(() => shuffle(BUILD));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Team | null>(null);
  const [message, setMessage] = useState('Tap “Say it”, listen to the vowel sound, then drag the team that spells it.');

  const item = order[index % order.length];
  const at = item.word.indexOf(item.team);
  const before = item.word.slice(0, at);
  const after = item.word.slice(at + item.team.length);
  // Lay out: before letters, the gap, after letters, centred around x = 620.
  const LETTER = 74;
  const total = before.length * LETTER + GAP.w + after.length * LETTER + 16;
  const left = 640 - total / 2;
  const gapRect = { x: left + before.length * LETTER + 8, y: GAP.y, w: GAP.w, h: GAP.h };

  const tryTeam = (team: Team) => {
    if (done) return;
    if (team === item.team) {
      play('correct');
      setDone(true);
      setSelected(null);
      setMessage(`${item.word}! The team ${team} says “${soundOf(team).say}”.`);
      return;
    }
    play('wrong');
    setShake({ ...shake, [team]: (shake[team] ?? 0) + 1 });
    const same = soundOf(team).id === soundOf(item.team).id;
    if (same && (team === 'ay' || team === 'ow')) {
      setMessage(`${team} says that sound too, but ${team} usually comes at the end of a word. Try again!`);
    } else if (same) {
      setMessage(`${team} says that sound too, but this word uses the other spelling. Try again!`);
    } else {
      setMessage(`${team} says “${soundOf(team).say}”. Listen to the word again.`);
    }
  };

  return (
    <g>
      <rect x={60} y={120} width={300} height={260} rx={22} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <Emoji x={210} y={235} size={130} char={item.pic} />
      <SvgButton x={135} y={400} w={150} h={52} fontSize={17} label="Say it" title="Hear the word" onClick={() => speak(item.word, { force: true })} />

      {before.split('').map((ch, i) => (
        <g key={`b${i}`} transform={`translate(${left + i * LETTER + LETTER / 2} ${GAP.y + GAP.h / 2})`}>
          <WordCard w={64} h={86} parts={[{ t: ch }]} fontSize={40} />
        </g>
      ))}
      <g onClick={() => selected && tryTeam(selected)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan={selected ? true : undefined}>
        <rect
          x={gapRect.x}
          y={gapRect.y}
          width={gapRect.w}
          height={gapRect.h}
          rx={14}
          fill={done ? shade(soundOf(item.team).color, 0.75) : C.white}
          stroke={C.ink}
          strokeWidth={2.5}
          strokeDasharray={done ? undefined : '8 6'}
        />
        <text x={gapRect.x + gapRect.w / 2} y={gapRect.y + gapRect.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={800} fill={done ? shade(soundOf(item.team).color, -0.35) : C.line}>
          {done ? item.team : '?'}
        </text>
      </g>
      {after.split('').map((ch, i) => (
        <g key={`a${i}`} transform={`translate(${gapRect.x + gapRect.w + 8 + i * LETTER + LETTER / 2} ${GAP.y + GAP.h / 2})`}>
          <WordCard w={64} h={86} parts={[{ t: ch }]} fontSize={40} />
        </g>
      ))}

      <text x={640} y={350} textAnchor="middle" fontSize={17} fill={C.ink2}>
        {message}
      </text>

      {TRAY.map((team, i) => (
        <DragToken
          key={team}
          x={trayX(i)}
          y={520}
          label={`Team tile ${team}`}
          disabled={done}
          selected={selected === team}
          shakeKey={shake[team] ?? 0}
          onTap={() => {
            play('tap');
            setSelected(selected === team ? null : team);
          }}
          onDrop={(p) => inside(p, { x: gapRect.x - 20, y: gapRect.y - 20, w: gapRect.w + 40, h: gapRect.h + 40 }) && tryTeam(team)}
        >
          <WordCard w={100} h={70} parts={[{ t: team, c: shade(soundOf(team).color, -0.3), bold: true }]} fontSize={32} state={selected === team ? 'selected' : 'idle'} />
        </DragToken>
      ))}

      {done && (
        <SvgButton
          x={560}
          y={400}
          w={160}
          h={52}
          fontSize={18}
          label="Next word"
          color={C.teal}
          textColor={C.white}
          onClick={() => {
            setIndex(index + 1);
            setDone(false);
            setMessage('Tap “Say it”, listen to the vowel sound, then drag the team that spells it.');
          }}
        />
      )}
    </g>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <polygon points="14,30 38,10 62,30" fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <rect x={18} y={29} width={40} height={30} rx={4} fill={shade(C.red, 0.8)} stroke={C.ink} strokeWidth={2} />
      <text x={38} y={50} textAnchor="middle" fontSize={14} fontWeight={800} fill={shade(C.red, -0.3)}>ai</text>
      <rect x={66} y={34} width={46} height={26} rx={6} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <text x={89} y={52} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>
        r<tspan fill={shade(C.red, -0.2)}>ai</tspan>n
      </text>
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const SHORT: Record<SoundId, string[]> = {
  a: ['cat', 'map', 'bag', 'hat'],
  e: ['bed', 'pet', 'net', 'web'],
  o: ['dog', 'hot', 'pot', 'box'],
  i: ['pig', 'sit', 'fin', 'lip'],
};

/** Spelling items with a meaning clue, so the prompt never shows the answer. */
const GAP_ITEMS: { word: string; team: Team; other: Team; clue: string }[] = [
  { word: 'rain', team: 'ai', other: 'ay', clue: 'Water that falls from clouds' },
  { word: 'train', team: 'ai', other: 'ay', clue: 'It runs along a track' },
  { word: 'snail', team: 'ai', other: 'ay', clue: 'A slow animal with a shell' },
  { word: 'tail', team: 'ai', other: 'ay', clue: 'A happy dog wags it' },
  { word: 'paint', team: 'ai', other: 'ay', clue: 'You brush it onto a picture' },
  { word: 'play', team: 'ay', other: 'ai', clue: 'Have fun with your toys' },
  { word: 'day', team: 'ay', other: 'ai', clue: 'The opposite of night' },
  { word: 'stay', team: 'ay', other: 'ai', clue: 'Do not go away' },
  { word: 'tray', team: 'ay', other: 'ai', clue: 'A flat thing for carrying cups' },
  { word: 'boat', team: 'oa', other: 'ow', clue: 'It floats on water' },
  { word: 'coat', team: 'oa', other: 'ow', clue: 'You wear it when it is cold' },
  { word: 'road', team: 'oa', other: 'ow', clue: 'Cars drive on it' },
  { word: 'soap', team: 'oa', other: 'ow', clue: 'You wash your hands with it' },
  { word: 'goat', team: 'oa', other: 'ow', clue: 'A farm animal with horns' },
  { word: 'snow', team: 'ow', other: 'oa', clue: 'Cold white flakes from the sky' },
  { word: 'grow', team: 'ow', other: 'oa', clue: 'Get bigger' },
  { word: 'slow', team: 'ow', other: 'oa', clue: 'Not fast' },
  { word: 'crow', team: 'ow', other: 'oa', clue: 'A big black bird' },
];

function makeQuestion(level: number): Question {
  if (level <= 0) {
    const { w, team } = pick(ALL_WORDS);
    const s = soundOf(team);
    return {
      prompt: `Which vowel team is in “${w}”?`,
      choices: textChoices(team, TEAMS.filter((t) => t !== team && !w.includes(t))),
      answer: team,
      hint: 'Look for two or three letters that sit together and make one vowel sound.',
      explain: [
        `Look at the letters: ${w.split('').join('-')}.`,
        `The letters ${team} sit together and make one sound.`,
        `${team} is the vowel team. It says the ${s.name} sound, “${s.say}”.`,
      ],
    };
  }
  if (level === 1) {
    const s = pick(SOUNDS);
    const team = pick(s.teams);
    const answer = pick(WORDS[team].filter((w) => w !== s.key));
    const others = SOUNDS.filter((o) => o.id !== s.id).flatMap((o) => o.teams.flatMap((t) => WORDS[t]));
    const distractors = [pick(SHORT[s.id]), ...sample(others, 2)];
    return {
      prompt: `Which word has the same vowel sound as “${s.key}”?`,
      choices: textChoices(answer, distractors),
      answer,
      hint: 'Say each word slowly and listen to the vowel sound in the middle.',
      explain: [
        `“${s.key}” has the ${s.name} sound: “${s.say}”.`,
        `“${answer}” has the team ${team}, which also says “${s.say}”.`,
        `So “${answer}” has the same vowel sound.`,
      ],
    };
  }
  const item = pick(GAP_ITEMS);
  const at = item.word.indexOf(item.team);
  const frame = `${item.word.slice(0, at)}__${item.word.slice(at + item.team.length)}`;
  const s = soundOf(item.team);
  const atEnd = at + item.team.length === item.word.length;
  const extra = pick(TEAMS.filter((t) => t !== item.team && t !== item.other));
  const endTeam = s.id === 'a' ? 'ay' : 'ow';
  const midTeam = s.id === 'a' ? 'ai' : 'oa';
  return {
    prompt: `${item.clue}: ${frame}. Which team fills the gap?`,
    speak: `${item.clue}. Which vowel team fills the gap?`,
    choices: textChoices(item.team, [item.other, extra], 3),
    answer: item.team,
    hint: `${midTeam} and ${endTeam} both say “${s.say}”. Think about where the gap is in the word.`,
    explain: [
      `${midTeam} and ${endTeam} both say the ${s.name} sound.`,
      `${endTeam} usually comes at the end of a word; ${midTeam} usually comes in the middle.`,
      `The gap is ${atEnd ? 'at the end' : 'in the middle'}, so it is ${item.team}: ${item.word}.`,
    ],
  };
}

export const vowelTeams: Lesson = {
  id: 'vowel-teams',
  title: 'Vowel Teams',
  Thumb,
  Scene: VowelTeamsScene,
  sceneHint: 'Drag each word into its sound house · Build words with team tiles',
  learn: {
    heading: 'Vowel teams',
    intro:
      'Sometimes two or three letters team up to make one vowel sound. In “rain”, the letters a and i work together to say “ay”. Spotting the team helps you read long words fast.',
    points: [
      { icon: Users, text: 'ai and ay say “ay” (rain, play).' },
      { icon: Users, text: 'ee and ea say “ee” (feet, leaf). oa and ow say “oh” (boat, snow).' },
      { icon: Users, text: 'igh says “eye” (night).' },
      { icon: Puzzle, text: 'ay and ow often come at the end of a word; ai and oa sit in the middle.' },
    ],
  },
  steps: [
    'Look across the word for two or three vowels (or a vowel and y, w or gh) side by side.',
    'Say the sound the team makes, not each letter.',
    'Blend all the sounds from left to right: r – ay – n, rain.',
    'Check that the word makes sense. If not, try the other sound the team can make.',
  ],
  example: {
    question: 'Read the word “toast”. Which sound does the vowel team make?',
    work: ['Find the team: t-oa-s-t. The team is oa.', 'oa says “oh”.', 'Blend it: t – oh – s – t, toast.'],
    answer: 'oa says the long o sound, “oh”: toast.',
  },
  grownups: [
    'Ask your child to point under the vowel team with a finger as they read, then blend the whole word.',
    'Some teams have two sounds: ow says “oh” in snow but “ow” in cow, and ea says “eh” in bread. If a word doesn’t make sense, try the other sound.',
    'Spelling (Build words) strengthens reading. Ask “which spelling of that sound does this word use?” rather than “sound it out”, because ee and ea sound the same.',
    'Keep it short: 5–10 minutes of sorting a few days a week works better than one long session.',
  ],
  makeQuestion,
};
