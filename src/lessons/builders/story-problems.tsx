import { useMemo, useState } from 'react';
import { BookOpen, Calculator, Rows3 } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { wrap } from '../../stage/Predict';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Draggable } from '../tiny/visuals/Draggable';
import { BarPicture, makeStory } from './visuals/BarModel';
import type { Seg, Story, StoryType } from './visuals/BarModel';

const BAR = { x: 70, w: 640, top: 250, bottom: 350, h: 72 };
const TILE = { y: 498, w: 104, h: 74, xs: [150, 290] };
const TYPES: StoryType[] = ['join', 'separate', 'part', 'compare'];

interface Placed {
  [segKey: string]: number;
}

function layout(story: Story) {
  const total = story.top.reduce((s, g) => s + g.value, 0);
  const unit = BAR.w / total;
  const rows: { key: string; seg: Seg; x: number; y: number; w: number }[] = [];
  (['top', 'bottom'] as const).forEach((row) => {
    let x = BAR.x;
    story[row].forEach((seg, i) => {
      const w = seg.value * unit;
      rows.push({ key: `${row}-${i}`, seg, x, y: row === 'top' ? BAR.top : BAR.bottom, w });
      x += w;
    });
  });
  return { unit, rows };
}

function StoryScene() {
  const [typeIdx, setTypeIdx] = useState(0);
  const [story, setStory] = useState<Story>(() => makeStory('join', 12));
  const [placed, setPlaced] = useState<Placed>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('Drag each number from the story into the bar where it belongs.');
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);

  const { unit, rows } = layout(story);
  const known = rows.filter((r) => !r.seg.unknown);
  const allPlaced = known.every((r) => placed[r.key] !== undefined);
  const usedTiles = new Set(Object.values(placed));
  const answerChoices = useMemo(
    () => numberChoices(story.answer, { count: 3, min: 0, max: 20, spread: 2 }).map(Number),
    [story],
  );

  const next = () => {
    const t = (typeIdx + 1) % TYPES.length;
    setTypeIdx(t);
    setStory(makeStory(TYPES[t], 12));
    setPlaced({});
    setSelected(null);
    setSolved(false);
    setWrongPicks([]);
    setMessage('Drag each number from the story into the bar where it belongs.');
    play('whoosh');
  };

  const place = (tile: number, key: string | null) => {
    setSelected(null);
    if (!key) return;
    const r = rows.find((x) => x.key === key)!;
    if (r.seg.unknown) {
      setMessage('That is the ? part. The story doesn’t tell us that number yet!');
      play('wrong');
      return;
    }
    if (placed[key] !== undefined) return;
    if (story.given[tile] !== r.seg.value) {
      setMessage(r.key.startsWith('top') ? 'The top bar is the whole amount. Is that number the whole, or a part?' : 'This box is one part. Which number in the story is that part?');
      play('wrong');
      return;
    }
    const nextPlaced = { ...placed, [key]: tile };
    setPlaced(nextPlaced);
    play('pop');
    const done = known.every((x) => nextPlaced[x.key] !== undefined);
    setMessage(done ? 'Now find the ? part. Count its squares or work it out!' : 'Yes! Now place the other number.');
  };

  const segAt = (p: Pt): string | null => {
    const r = rows.find((x) => p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y - 16 && p.y <= x.y + BAR.h + 16);
    return r ? r.key : null;
  };

  const guess = (n: number) => {
    if (solved) return;
    if (n === story.answer) {
      setSolved(true);
      setMessage(`${story.equation}. You solved it!`);
      play('correct');
    } else {
      setWrongPicks([...wrongPicks, n]);
      setMessage('Not yet. Count the squares in the ? part.');
      play('wrong');
    }
  };

  const lines = wrap(story.text, 62);

  return (
    <SceneSvg label="A story problem with a bar model">
      <rect x={40} y={24} width={920} height={128} rx={18} fill={shade(C.yellow, 0.8)} stroke={C.ink} strokeWidth={2.5} />
      {lines.map((line, i) => (
        <text key={i} x={64} y={62 + i * 32} fontSize={23} fontWeight={600} fill={C.ink}>
          {line}
        </text>
      ))}
      <SvgButton x={600} y={166} w={160} h={50} fontSize={17} label="Read it" onClick={() => speak(story.text, { force: true })} />
      <SvgButton x={772} y={166} w={188} h={50} fontSize={17} label="New story" onClick={next} color={C.teal} textColor={C.white} />
      <text x={70} y={200} fontSize={15} fill={C.muted} className="caps">
        {story.type === 'compare' ? 'Compare the bars' : 'Whole on top · parts below'}
      </text>

      {/* The bar model */}
      {rows.map((r) => {
        const filled = placed[r.key] !== undefined;
        const showUnits = filled || (r.seg.unknown && allPlaced);
        const label = r.seg.unknown ? (solved ? String(r.seg.value) : '?') : filled ? String(r.seg.value) : '';
        return (
          <g
            key={`${story.text}-${r.key}`}
            onClick={() => selected !== null && place(selected, r.key)}
            style={{ cursor: selected !== null ? 'pointer' : undefined }}
            data-nopan
          >
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={BAR.h}
              rx={8}
              fill={r.seg.unknown ? (solved ? shade(r.seg.color, 0.5) : C.white) : filled ? shade(r.seg.color, 0.55) : shade(C.paper, 0.5)}
              stroke={C.ink}
              strokeWidth={3}
              strokeDasharray={r.seg.unknown && !solved ? '10 7' : !filled && !r.seg.unknown ? '4 6' : undefined}
            />
            {showUnits &&
              Array.from({ length: r.seg.value - 1 }, (_, k) => (
                <line key={k} x1={r.x + (k + 1) * unit} y1={r.y + 8} x2={r.x + (k + 1) * unit} y2={r.y + BAR.h - 8} stroke={shade(r.seg.color, -0.25)} strokeWidth={1.5} />
              ))}
            <text x={r.x + r.w / 2} y={r.y + BAR.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={34} fontWeight={700} fill={C.ink} className="num">
              {label}
            </text>
          </g>
        );
      })}

      {/* Number tiles from the story */}
      <text x={150} y={480} fontSize={15} fill={C.muted} className="caps">
        Numbers in the story
      </text>
      {story.given.map((n, i) =>
        usedTiles.has(i) ? null : (
          <Draggable
            key={`${story.text}-t${i}`}
            x={TILE.xs[i] + TILE.w / 2}
            y={TILE.y + TILE.h / 2}
            label={`Number ${n}`}
            onDrop={(p) => place(i, segAt(p))}
            onTap={() => {
              setSelected(selected === i ? null : i);
              play('tap');
            }}
          >
            <rect x={TILE.xs[i] + 3} y={TILE.y + 6} width={TILE.w} height={TILE.h} rx={14} fill={C.ink} opacity={0.15} />
            <rect x={TILE.xs[i]} y={TILE.y} width={TILE.w} height={TILE.h} rx={14} fill={C.white} stroke={selected === i ? C.orange : C.ink} strokeWidth={selected === i ? 4 : 2.5} />
            <text x={TILE.xs[i] + TILE.w / 2} y={TILE.y + TILE.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={36} fontWeight={700} fill={C.ink} className="num">
              {n}
            </text>
          </Draggable>
        ),
      )}

      {/* Finding the unknown */}
      {allPlaced && (
        <g>
          <text x={470} y={480} fontSize={15} fill={C.muted} className="caps">
            What is the ? part?
          </text>
          {answerChoices.map((n, i) => (
            <SvgButton
              key={`${story.text}-a${n}`}
              x={470 + i * 112}
              y={498}
              w={100}
              h={74}
              fontSize={32}
              label={String(n)}
              onClick={() => guess(n)}
              disabled={wrongPicks.includes(n) || (solved && n !== story.answer)}
              color={solved && n === story.answer ? C.green : C.card}
            />
          ))}
        </g>
      )}

      <rect x={736} y={250} width={224} height={172} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <text x={848} y={282} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
        Number sentence
      </text>
      <text x={848} y={340} textAnchor="middle" fontSize={solved ? 30 : 26} fontWeight={700} fill={solved ? shade(C.green, -0.3) : C.ink} className="num">
        {solved ? story.equation : story.equation.replace(/= \d+$/, '= ?')}
      </text>

      <text x={500} y={630} textAnchor="middle" fontSize={19} fontWeight={600} fill={C.ink}>
        {message}
      </text>

      <Callout at={[BAR.x + 30, BAR.top]} box={[300, 190]} w={250} icon={Rows3} title="Whole and parts" text="The top bar is the whole. The parts below fit exactly under it." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={14} width={100} height={22} rx={4} fill={shade(C.yellow, 0.4)} stroke={C.ink} strokeWidth={2} />
      <text x={60} y={26} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} fill={C.ink}>?</text>
      <rect x={10} y={44} width={60} height={22} rx={4} fill={shade(C.red, 0.5)} stroke={C.ink} strokeWidth={2} />
      <rect x={70} y={44} width={40} height={22} rx={4} fill={shade(C.blue, 0.5)} stroke={C.ink} strokeWidth={2} />
      <text x={40} y={56} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill={C.ink}>5</text>
      <text x={90} y={56} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill={C.ink}>3</text>
    </svg>
  );
}

function explainFor(s: Story): string[] {
  const [p, q] = s.given;
  const ans = s.answer;
  if (s.type === 'join') return [`The two parts are ${p} and ${q}.`, `Put the parts together: ${p} + ${q} = ${ans}.`, `So the answer is ${ans}.`];
  if (s.type === 'separate') return [`Start with the whole: ${p}.`, `${q} are taken away: ${p} − ${q} = ${ans}.`, `So ${ans} are left.`];
  if (s.type === 'part') return [`The whole is ${p}. One part is ${q}.`, `Find the other part: ${p} − ${q} = ${ans}.`, `So ${ans} are blue.`];
  return [`Line up the two amounts: ${p} and ${q}.`, `The extra bit is the difference: ${p} − ${q} = ${ans}.`, `So the answer is ${ans} more.`];
}

const HINT: Record<StoryType, string> = {
  join: 'Two parts are put together. Is the whole bigger or smaller than the parts?',
  separate: 'Start with the whole, then take some away.',
  part: 'You know the whole and one part. What is left for the other part?',
  compare: 'Line up both amounts. How many extra does the bigger one have?',
};

function makeQuestion(level: number): Question {
  const type: StoryType = level === 0 ? 'join' : level === 1 ? pick<StoryType>(['separate', 'part', 'join']) : pick<StoryType>(['compare', 'part', 'separate']);
  const story = makeStory(type, level === 0 ? 10 : level === 1 ? 15 : 20);
  return {
    prompt: story.text,
    visual: level < 2 ? <BarPicture story={story} /> : undefined,
    choices: numberChoices(story.answer, { count: 3, min: 0, max: 20, spread: 2 }).map((value) => ({ value })),
    answer: String(story.answer),
    hint: HINT[type],
    explain: explainFor(story),
  };
}

export const storyProblems: Lesson = {
  id: 'story-problems',
  title: 'Story Problems',
  Thumb,
  Scene: StoryScene,
  sceneHint: 'Drag the story numbers into the bar · Find the ? part',
  learn: {
    heading: 'Story problems',
    intro: 'A bar model turns a story into a picture. The whole is the top bar. The parts sit underneath and fit it exactly. The ? is the number we need to find.',
    points: [
      { icon: BookOpen, text: 'Read the story. What do we know? What is the question?' },
      { icon: Rows3, text: 'Draw the whole and the parts as bars.' },
      { icon: Calculator, text: 'Add parts to find the whole. Take away to find a part.' },
    ],
  },
  steps: ['Read the story twice.', 'Put the numbers you know into the bar model.', 'Find the ? box: is it the whole or a part?', 'Add or take away, then check the answer makes sense.'],
  example: {
    question: 'There are 9 shells. 4 are pink and the rest are white. How many are white?',
    visual: (
      <BarPicture
        story={{
          type: 'part',
          text: '',
          given: [9, 4],
          answer: 5,
          equation: '9 − 4 = 5',
          top: [{ value: 9, unknown: false, color: C.yellow, slot: 0 }],
          bottom: [
            { value: 4, unknown: false, color: C.red, slot: 1 },
            { value: 5, unknown: true, color: C.blue, slot: -1 },
          ],
        }}
      />
    ),
    work: ['The whole is 9. One part is 4.', 'The other part is 9 − 4.'],
    answer: '5 shells are white.',
  },
  grownups: [
    'Ask “what do we know?” and “what do we need to find?” before any sums.',
    'Bar models work for adding, taking away and comparing. Drawing them on paper is a great habit.',
    'Make up stories about your day together and let your child invent the question.',
  ],
  makeQuestion,
};
