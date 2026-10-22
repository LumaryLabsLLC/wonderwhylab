import { useState } from 'react';
import { Eye, Mountain, PenLine, Sparkles } from 'lucide-react';
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

const PARTS = ['Opening', 'Build-up', 'Problem', 'Resolution', 'Ending'] as const;
type Part = (typeof PARTS)[number];

const JOB: Record<Part, string> = {
  Opening: 'we meet the characters and the setting',
  'Build-up': 'things start to happen',
  Problem: 'something goes wrong',
  Resolution: 'the problem gets solved',
  Ending: 'the story wraps up',
};

interface Story {
  title: string;
  /** One event per part, in story-mountain order. */
  events: [string, string, string, string, string];
  tell: string;
  show: string;
  /** The words in `show` that let the reader work out the feeling. */
  clues: string;
  tells: [string, string];
}

const STORIES: Story[] = [
  {
    title: 'Leo’s kite',
    events: [
      'Leo got a new red kite for his birthday.',
      'He ran up the windy hill to fly it with Maya.',
      'A strong gust snapped the string and the kite flew away!',
      'Maya spotted it stuck in a bush, and they pulled it free.',
      'Leo tied on a stronger string and flew it all afternoon.',
    ],
    tell: 'Leo was happy.',
    show: 'Leo grinned and punched the air.',
    clues: 'grinned, punched the air',
    tells: ['Leo was very, very happy.', 'Leo felt really happy inside.'],
  },
  {
    title: 'Captain Zara and Bolt',
    events: [
      'Captain Zara and her robot Bolt flew a tiny spaceship.',
      'They zoomed past moons to take medicine to Planet Pip.',
      'Suddenly, the engine sputtered and the lights went out!',
      'Bolt rewired the engine while Zara steered by starlight.',
      'They landed safely, and the people of Pip cheered.',
    ],
    tell: 'Zara was scared.',
    show: 'Zara’s hands shook as she gripped the controls.',
    clues: 'hands shook, gripped the controls',
    tells: ['Zara was really scared.', 'Zara felt very afraid.'],
  },
  {
    title: 'A cake for Nana',
    events: [
      'Sam and Grandpa decided to bake Nana a birthday cake.',
      'They mixed flour, eggs and sugar, and Sam licked the spoon.',
      'Oops! The cake burned while they were making the card.',
      'They made pancakes instead and stacked them up high.',
      'Nana laughed and said it was the best birthday tower ever.',
    ],
    tell: 'Grandpa was tired.',
    show: 'Grandpa yawned and sank into his armchair.',
    clues: 'yawned, sank into his armchair',
    tells: ['Grandpa was very tired.', 'Grandpa felt sleepy and tired.'],
  },
];

// ───────────────────────── Scene ─────────────────────────

const STATIONS: Pt[] = [
  { x: 110, y: 420 },
  { x: 300, y: 300 },
  { x: 500, y: 176 },
  { x: 700, y: 300 },
  { x: 890, y: 420 },
];
const SLOT_W = 182;
const SLOT_H = 82;
const slotRect = (i: number): Rect => ({ x: STATIONS[i].x - SLOT_W / 2, y: STATIONS[i].y - SLOT_H / 2, w: SLOT_W, h: SLOT_H });
const TRAY_Y = 552;

function MountainMode({ story, onDone }: { story: Story; onDone: () => void }) {
  const [tray] = useState(() => shuffle([0, 1, 2, 3, 4]));
  const [placed, setPlaced] = useState<boolean[]>([false, false, false, false, false]);
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [glow, setGlow] = useState<number | null>(null);
  const [note, setNote] = useState('Drag each event to its place on the story mountain. Or tap an event, then a place.');
  const done = placed.every(Boolean);

  const drop = (event: number, slot: number) => {
    if (placed[slot]) return;
    if (event === slot) {
      play('pop');
      const next = placed.map((p, i) => p || i === slot);
      setPlaced(next);
      setSelected(null);
      setGlow(null);
      if (next.every(Boolean)) {
        play('complete');
        setNote('Your story climbs to the problem and comes back down to a calm ending. Now make it vivid!');
      } else setNote(`Yes! In the ${PARTS[slot].toLowerCase()}, ${JOB[PARTS[slot]]}.`);
      return;
    }
    play('wrong');
    setShake(event);
    window.setTimeout(() => setShake(null), 460);
    const m = (misses[event] ?? 0) + 1;
    setMisses({ ...misses, [event]: m });
    if (m >= 2) {
      setGlow(event);
      setNote(`Here’s how: this is the ${PARTS[event].toLowerCase()}, where ${JOB[PARTS[event]]}.`);
    } else setNote(`Not yet. The ${PARTS[slot].toLowerCase()} is where ${JOB[PARTS[slot]]}. Is that what happens here?`);
  };

  const onDrop = (event: number) => (c: Pt) => {
    const i = STATIONS.findIndex((_, k) => inRect(c, slotRect(k)));
    if (i >= 0) drop(event, i);
  };

  return (
    <g>
      <path
        d={`M20 470 L${STATIONS.map((p) => `${p.x} ${p.y}`).join(' L')} L980 470 Z`}
        fill={shade(C.green, 0.8)}
        stroke={shade(C.green, -0.2)}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d={`M${STATIONS.map((p) => `${p.x} ${p.y}`).join(' L')}`} fill="none" stroke={C.ink2} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
      {STATIONS.map((p, i) => {
        const r = slotRect(i);
        const lines = wrap(story.events[i], 20);
        return (
          <g
            key={i}
            onClick={() => selected !== null && drop(selected, i)}
            style={{ cursor: selected !== null ? 'pointer' : undefined }}
            data-nopan={selected !== null ? true : undefined}
          >
            <text x={p.x} y={r.y - 10} textAnchor="middle" fontSize={15} fontWeight={700} fill={shade(C.green, -0.45)} className="caps">
              {i + 1}. {PARTS[i]}
            </text>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={12}
              fill={C.card}
              fillOpacity={placed[i] ? 1 : 0.75}
              stroke={glow === i ? C.orange : placed[i] ? C.ink : C.ink2}
              strokeWidth={glow === i ? 4 : 2}
              strokeDasharray={placed[i] ? undefined : '8 6'}
            />
            {placed[i] && (
              <g className="rw-glow">
                {lines.map((line, n) => (
                  <text key={n} x={p.x} y={p.y + (n - (lines.length - 1) / 2) * 18} textAnchor="middle" dominantBaseline="central" fontSize={15} fill={C.ink}>
                    {line}
                  </text>
                ))}
              </g>
            )}
          </g>
        );
      })}

      {done ? (
        <g>
          <SvgButton x={250} y={TRAY_Y - 28} w={220} h={54} fontSize={18} label="Read it to me" onClick={() => speak(story.events.join(' '), { force: true })} />
          <SvgButton x={530} y={TRAY_Y - 28} w={220} h={54} fontSize={18} label="Show, don’t tell" color={C.teal} textColor={C.white} onClick={onDone} />
        </g>
      ) : (
        tray.map((e, k) =>
          placed[e] ? null : (
            <DragChip
              key={e}
              x={110 + k * 195}
              y={TRAY_Y}
              w={186}
              h={88}
              lines={wrap(story.events[e], 20)}
              label={story.events[e]}
              fontSize={15}
              bold={false}
              selected={selected === e}
              shake={shake === e}
              onDrop={onDrop(e)}
              onTap={() => {
                play('tap');
                setSelected(selected === e ? null : e);
              }}
            />
          ),
        )
      )}
      {wrap(note, 100).map((line, i) => (
        <text key={i} x={500} y={624 + i * 23} textAnchor="middle" fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}
      <Callout at={[500, 140]} box={[620, 70]} w={250} icon={Mountain} title="The top of the mountain" text="The problem is the most exciting part. Everything before builds up to it." />
    </g>
  );
}

const TARGET: Rect = { x: 200, y: 250, w: 600, h: 86 };

function ShowMode({ story }: { story: Story }) {
  const [options] = useState(() => shuffle([story.show, ...story.tells]));
  const [chosen, setChosen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState('Which sentence SHOWS the feeling instead of naming it? Drag it into the story.');

  const choose = (text: string) => {
    if (chosen) return;
    setSelected(null);
    if (text === story.show) {
      play('complete');
      setChosen(true);
      setNote(`Yes! The clues (${story.clues}) let the reader work out the feeling without being told.`);
      return;
    }
    play('wrong');
    setShake(text);
    window.setTimeout(() => setShake(null), 460);
    const m = misses + 1;
    setMisses(m);
    setNote(
      m >= 2
        ? `Here’s how: look for actions or body language, not feeling words. “${story.show}”`
        : 'Not yet. This one still names the feeling. Which one shows it with actions?',
    );
  };

  return (
    <g>
      <rect x={200} y={100} width={600} height={86} rx={16} fill={shade(C.pink, 0.85)} stroke={C.pink} strokeWidth={2.5} />
      <text x={220} y={128} fontSize={15} fill={shade(C.pink, -0.4)} className="caps">
        Telling: names the feeling
      </text>
      <text x={220} y={162} fontSize={24} fontWeight={700} fill={C.ink} textDecoration={chosen ? 'line-through' : undefined}>
        {story.tell}
      </text>
      <path d="M500 192 V240" stroke={C.ink2} strokeWidth={3} />
      <path d="M490 230 L500 244 L510 230" fill="none" stroke={C.ink2} strokeWidth={3} strokeLinejoin="round" />

      <g onClick={() => selected && choose(selected)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan={selected ? true : undefined}>
        <rect
          x={TARGET.x}
          y={TARGET.y}
          width={TARGET.w}
          height={TARGET.h}
          rx={16}
          fill={chosen ? shade(C.green, 0.8) : C.card}
          stroke={chosen ? C.green : C.ink2}
          strokeWidth={2.5}
          strokeDasharray={chosen ? undefined : '8 6'}
        />
        <text x={220} y={TARGET.y + 28} fontSize={15} fill={shade(C.green, -0.4)} className="caps">
          Showing: let the reader work it out
        </text>
        <text x={220} y={TARGET.y + 62} fontSize={chosen ? 22 : 17} fontWeight={chosen ? 700 : 400} fill={chosen ? C.ink : C.muted} className={chosen ? 'rw-glow' : undefined}>
          {chosen ? story.show : 'Drop the showing sentence here'}
        </text>
      </g>

      {!chosen &&
        options.map((o, i) => (
          <DragChip
            key={o}
            x={180 + i * 320}
            y={440}
            w={300}
            h={90}
            lines={wrap(o, 28)}
            label={o}
            fontSize={18}
            bold={false}
            selected={selected === o}
            shake={shake === o}
            onDrop={(c) => inRect(c, { x: TARGET.x - 20, y: TARGET.y - 20, w: TARGET.w + 40, h: TARGET.h + 40 }) && choose(o)}
            onTap={() => {
              play('tap');
              setSelected(selected === o ? null : o);
            }}
          />
        ))}
      {chosen && (
        <SvgButton x={390} y={420} w={220} h={54} fontSize={18} label="Read it to me" onClick={() => speak(story.show, { force: true })} />
      )}
      {wrap(note, 100).map((line, i) => (
        <text key={i} x={500} y={560 + i * 23} textAnchor="middle" fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}
      <Callout at={[800, 293]} box={[818, 110]} w={160} icon={Eye} title="Show it" text="Use actions, faces and senses." />
    </g>
  );
}

function StoryScene() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'mountain' | 'show'>('mountain');
  const story = STORIES[index % STORIES.length];
  return (
    <SceneSvg label="Story writing: build a story mountain, then show, don't tell">
      <text x={30} y={42} fontSize={20} fontWeight={700} fill={C.ink}>
        {story.title}
      </text>
      <SvgButton x={300} y={16} w={200} h={48} fontSize={16} label="Story mountain" active={mode === 'mountain'} color={mode === 'mountain' ? shade(C.yellow, 0.4) : C.card} onClick={() => setMode('mountain')} />
      <SvgButton x={512} y={16} w={200} h={48} fontSize={16} label="Show, don’t tell" active={mode === 'show'} color={mode === 'show' ? shade(C.yellow, 0.4) : C.card} onClick={() => setMode('show')} />
      <SvgButton
        x={790}
        y={16}
        w={180}
        h={48}
        fontSize={16}
        label="Next story"
        color={C.teal}
        textColor={C.white}
        onClick={() => {
          setIndex(index + 1);
          setMode('mountain');
        }}
      />
      {mode === 'mountain' ? <MountainMode key={index} story={story} onDone={() => setMode('show')} /> : <ShowMode key={index} story={story} />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M6 70 L28 50 L60 14 L92 50 L114 70 Z" fill={shade(C.green, 0.7)} stroke={shade(C.green, -0.2)} strokeWidth={2} strokeLinejoin="round" />
      {[
        [16, 64],
        [36, 44],
        [60, 16],
        [84, 44],
        [104, 64],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} fill={i === 2 ? C.red : C.card} stroke={C.ink} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// ───────────────────────── Practice ─────────────────────────

const WHY: Record<Part, string> = {
  Opening: 'It introduces the characters and where they are.',
  'Build-up': 'Things start to happen, leading towards trouble.',
  Problem: 'Something goes wrong: the most exciting moment.',
  Resolution: 'The problem gets solved.',
  Ending: 'It wraps the story up calmly after the problem is fixed.',
};

function makeQuestion(level: number): Question {
  const story = pick(STORIES);
  if (level <= 0) {
    const i = Math.floor(Math.random() * 5);
    const part = PARTS[i];
    const others = shuffle(PARTS.filter((p) => p !== part)).slice(0, 2);
    return {
      prompt: 'Which part of the story mountain is this event?',
      visual: <Passage text={story.events[i]} />,
      choices: shuffle([part, ...others]).map((value) => ({ value })),
      answer: part,
      hint: 'Ask: are we meeting the characters, building up, hitting trouble, fixing it, or wrapping up?',
      explain: [`“${story.events[i]}”`, WHY[part], `So it is the ${part}.`],
    };
  }
  if (level === 1) {
    return {
      prompt: 'Which sentence shows the feeling instead of telling it?',
      choices: shuffle([story.show, ...story.tells]).map((value) => ({ value })),
      answer: story.show,
      hint: 'Telling names the feeling. Showing uses actions or body language so you can work it out.',
      explain: [`“${story.tells[0]}” just names the feeling.`, `Clues like ${story.clues} show it through actions.`, `So the showing sentence is: ${story.show}`],
    };
  }
  const other = pick(STORIES.filter((s) => s !== story)).events[3];
  return {
    prompt: 'Which event is the resolution to this problem?',
    visual: <Passage text={`Problem: *${story.events[2]}*`} />,
    choices: shuffle([story.events[3], story.events[1], other]).map((value) => ({ value })),
    answer: story.events[3],
    hint: 'The resolution is how THIS problem gets solved. Which event fixes it?',
    explain: [`“${story.events[1]}” happens before the problem, in the build-up.`, `“${other}” solves a problem in a different story.`, `The resolution is: ${story.events[3]}`],
  };
}

export const storyWriting: Lesson = {
  id: 'story-writing',
  title: 'Story Writing',
  Thumb,
  Scene: StoryScene,
  sceneHint: 'Drag events onto the story mountain · Then pick the sentence that shows',
  learn: {
    heading: 'Story writing',
    intro:
      'Many stories follow a story mountain: they build up to a problem at the top, then come back down as the problem is solved. Planning your mountain first makes writing the story much easier.',
    points: [
      { icon: Mountain, text: 'Opening, build-up, problem, resolution, ending.' },
      { icon: PenLine, text: 'Plan your mountain in a few words before you write.' },
      { icon: Eye, text: 'Show, don’t tell: “Leo grinned” is more vivid than “Leo was happy”.' },
      { icon: Sparkles, text: 'Revise by swapping a telling sentence for a showing one.' },
    ],
  },
  steps: [
    'Opening: who is in the story, and where are they?',
    'Build-up: what starts to happen?',
    'Problem: what goes wrong? This is the top of the mountain.',
    'Resolution: how is the problem solved?',
    'Ending: how does it all wrap up? Then revise: show feelings with actions.',
  ],
  example: {
    question: 'Make this sentence show, not tell: “Zara was scared.”',
    work: ['Think about what a scared person does or looks like.', 'Hands shake, breath goes fast, eyes go wide.', 'Write the action, and let the reader work out the feeling.'],
    answer: 'Zara’s hands shook as she gripped the controls.',
  },
  grownups: [
    'After reading a book together, sketch its story mountain. Where was the problem?',
    'Play “show me”: name a feeling and take turns acting it out, then describe the actions in words.',
    'Not every story follows the mountain, and that’s fine. It is a planning tool, not a rule.',
  ],
  makeQuestion,
};
