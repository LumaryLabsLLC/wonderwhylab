import { useEffect, useRef, useState } from 'react';
import { Hand, Hash, ListOrdered, Sparkles } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { numberWord } from '../../lib/words';
import { countList } from './explain';
import { Callout } from '../../stage/Callout';
import { GroupPicture } from './visuals/GroupPicture';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { iso, IsoBox } from '../../visuals/Iso';
import { Thing, ThingsPicture, thingName } from '../../visuals/Thing';
import type { ThingKind } from '../../visuals/Thing';

const KINDS: ThingKind[] = ['apple', 'star', 'fish', 'duck'];

// Tray geometry (iso units) and where it sits on screen.
// Kept left of the number card and buttons (x ≥ 770) so the two never overlap.
const TRAY = { w: 430, d: 200, h: 18, ox: 345, oy: 255 };

/** Screen position of slot i (0–9) on top of the tray: two rows of five. */
function slot(i: number): [number, number] {
  const col = i % 5;
  const row = Math.floor(i / 5);
  const [x, y] = iso(48 + col * 84, 52 + row * 96, TRAY.h);
  return [TRAY.ox + x, TRAY.oy + y];
}

function CountScene() {
  const [count, setCount] = useState(3);
  const [kind, setKind] = useState<ThingKind>('apple');
  /** Order in which the child tapped each object (slot → 1-based number). */
  const [tapped, setTapped] = useState<Record<number, number>>({});
  const [counting, setCounting] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const change = (n: number) => {
    window.clearInterval(timer.current);
    setCounting(null);
    setTapped({});
    setCount(n);
    play('pop');
  };

  const tap = (i: number) => {
    if (tapped[i] || counting !== null) return;
    const next = Object.keys(tapped).length + 1;
    setTapped({ ...tapped, [i]: next });
    play('tap');
    speak(String(next));
  };

  const countWithMe = () => {
    window.clearInterval(timer.current);
    setTapped({});
    let n = 1;
    setCounting(1);
    speak('1');
    timer.current = window.setInterval(() => {
      n += 1;
      if (n > count) {
        window.clearInterval(timer.current);
        setCounting(null);
        speak(`${count}! There are ${count} ${thingName(kind, count)}.`);
        play('correct');
        return;
      }
      setCounting(n);
      play('tap');
      speak(String(n));
    }, 850);
  };

  const shown = (i: number) => (counting !== null ? (i < counting ? i + 1 : null) : tapped[i] ?? null);

  return (
    <SceneSvg label={`A tray with ${count} ${thingName(kind, count)}`}>
      {/* Tray */}
      <g transform={`translate(${TRAY.ox} ${TRAY.oy})`}>
        <polygon
          points={[iso(-10, -10, -8), iso(TRAY.w + 20, -10, -8), iso(TRAY.w + 20, TRAY.d + 20, -8), iso(-10, TRAY.d + 20, -8)]
            .map((p) => p.join(','))
            .join(' ')}
          fill={C.ink}
          opacity={0.1}
        />
        <IsoBox w={TRAY.w} d={TRAY.d} h={TRAY.h} color={C.wood} />
      </g>

      {/* Slots and objects (back row first so the front row overlaps it) */}
      {Array.from({ length: 10 }, (_, i) => {
        const [x, y] = slot(i);
        const filled = i < count;
        const n = shown(i);
        return (
          <g key={i} onClick={filled ? () => tap(i) : () => change(i + 1)} style={{ cursor: 'pointer' }} data-nopan>
            <ellipse cx={x} cy={y} rx={36} ry={20} fill="#d4b07a" stroke={C.ink} strokeWidth={1.5} />
            {filled ? (
              <g className={n ? 'bounce-in' : undefined} style={{ transformOrigin: `${x}px ${y}px` }}>
                <Thing kind={kind} x={x} y={y - 26} size={66} />
                {n !== null && (
                  <g className="pop-in" style={{ transformOrigin: `${x}px ${y - 78}px` }}>
                    <circle cx={x} cy={y - 78} r={17} fill={C.ink} />
                    <text x={x} y={y - 78} textAnchor="middle" dominantBaseline="central" fill={C.white} fontSize={19} fontWeight={700} className="num">
                      {n}
                    </text>
                  </g>
                )}
              </g>
            ) : (
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize={20} fill={C.muted} opacity={0.5}>
                +
              </text>
            )}
          </g>
        );
      })}

      {/* Choose what to count */}
      <g>
        <text x={110} y={92} fontSize={16} fill={C.muted} className="caps">Count some…</text>
        {KINDS.map((k, i) => (
          <g key={k} onClick={() => { setKind(k); setTapped({}); play('tap'); }} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={thingName(k, 2)}>
            <circle cx={136 + i * 66} cy={132} r={28} fill={kind === k ? C.card : 'transparent'} stroke={kind === k ? C.ink : C.line} strokeWidth={kind === k ? 2.5 : 1.5} />
            <Thing kind={k} x={136 + i * 66} y={132} size={38} />
          </g>
        ))}
      </g>

      {/* Count readout and controls */}
      <NumberCard x={770} y={150} w={170} h={150} value={count} />
      <text x={855} y={330} textAnchor="middle" fontSize={22} fill={C.ink} fontWeight={600}>
        {numberWord(count)}
      </text>
      <SvgButton x={770} y={360} w={78} label="−" title="One less" onClick={() => change(count - 1)} disabled={count <= 0} />
      <SvgButton x={862} y={360} w={78} label="+" title="One more" onClick={() => change(count + 1)} disabled={count >= 10} color={C.yellow} />
      <SvgButton x={770} y={440} w={170} h={52} fontSize={18} label="Count with me" onClick={countWithMe} disabled={count === 0} color={C.teal} textColor={C.white} />

      <Callout
        at={[slot(0)[0], slot(0)[1] - 26]}
        box={[60, 470]}
        icon={Hand}
        title="One at a time"
        text="Tap each one as you count. Every thing gets one number."
      />
      <Callout
        at={[770, 225]}
        box={[515, 30]}
        w={210}
        icon={Sparkles}
        title="How many?"
        text="The last number you say tells how many there are."
      />
      <Callout
        at={[slot(9)[0] + 30, slot(9)[1]]}
        box={[600, 560]}
        w={230}
        icon={ListOrdered}
        title="Ten fit on the tray"
        text="Two rows of five make ten. Tap an empty spot to fill up to it."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <ellipse cx={60} cy={66} rx={46} ry={8} fill={C.ink} opacity={0.12} />
      <Thing kind="apple" x={30} y={46} size={34} />
      <Thing kind="apple" x={60} y={40} size={38} />
      <Thing kind="apple" x={90} y={46} size={34} />
      <circle cx={92} cy={16} r={11} fill={C.ink} />
      <text x={92} y={17} textAnchor="middle" dominantBaseline="central" fill={C.white} fontSize={13} fontWeight={700}>3</text>
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = pick<ThingKind>(['apple', 'star', 'ball', 'fish', 'cookie', 'flower', 'bug', 'duck']);
  const [lo, hi] = [[1, 5], [3, 8], [5, 10]][Math.min(level, 2)];
  const n = rand(lo, hi);
  const style = level === 0 ? 0 : rand(0, level === 1 ? 1 : 2);

  if (style === 1) {
    // Pick the picture that shows n.
    const others = numberChoices(n, { count: 3, min: 1, max: 10, spread: 3 });
    return {
      prompt: `Which picture shows ${n}?`,
      choices: shuffle(others).map((v) => ({
        value: v,
        name: `${v} ${thingName(kind, Number(v))}`,
        label: <GroupPicture kind={kind} count={Number(v)} />,
      })),
      answer: String(n),
      hint: 'Count each picture, touching every object once.',
      explain: [
        `Count the ${thingName(kind, 2)} in each picture.`,
        `In the right picture you say ${countList(1, n)}.`,
        `The last number is ${n}, so that picture shows ${n}.`,
      ],
    };
  }
  if (style === 2) {
    const before = rand(1, 9);
    return {
      prompt: `What number comes after ${before}?`,
      choices: numberChoices(before + 1, { min: 1, max: 10, spread: 2 }).map((value) => ({ value })),
      answer: String(before + 1),
      hint: 'Say the numbers in order and listen for what comes next.',
      explain: [
        `Count up from 1: ${countList(1, before)}…`,
        `The next number after ${before} is ${before + 1}.`,
      ],
    };
  }
  return {
    prompt: `How many ${thingName(kind, 2)}?`,
    visual: <ThingsPicture kind={kind} count={n} />,
    choices: numberChoices(n, { count: level === 0 ? 3 : 4, min: 1, max: 10 }).map((value) => ({ value })),
    answer: String(n),
    hint: 'Touch each one and count out loud. The last number is the answer.',
    explain: [
      `Point to each ${thingName(kind, 1)} once and count: ${countList(1, n)}.`,
      `The last number you said is ${n}.`,
      `There ${n === 1 ? 'is' : 'are'} ${n} ${thingName(kind, n)}.`,
    ],
  };
}

export const countTo10: Lesson = {
  id: 'count-to-10',
  title: 'Count to 10',
  Thumb,
  Scene: CountScene,
  sceneHint: 'Tap + to add · Tap each one to count',
  learn: {
    heading: 'Counting to 10',
    intro: 'Counting tells us how many things there are. We say one number for each thing, and the last number we say is how many!',
    points: [
      { icon: Hand, text: 'Touch each thing once as you count.' },
      { icon: Hash, text: 'Numbers go in order: 1, 2, 3, 4, 5…' },
      { icon: Sparkles, text: 'The last number you say is how many.' },
    ],
  },
  steps: [
    'Point to the first thing and say “one”.',
    'Move to the next thing and say the next number.',
    'Don’t skip any, and don’t count anything twice.',
    'When everything is counted, the last number is your answer!',
  ],
  example: {
    question: 'How many ducks are there?',
    visual: <ThingsPicture kind="duck" count={6} />,
    work: ['Point and count: 1, 2, 3, 4, 5, 6.', 'The last number we said was 6.'],
    answer: 'There are 6 ducks.',
  },
  grownups: [
    'Count real things together: stairs, grapes, socks in the wash.',
    'After counting, ask “so how many are there?” If they recount, they are still learning that the last number is the total.',
    'Lining objects up in rows of five makes counting much easier.',
    'Turn on “Read questions aloud” in Settings for children who are not reading yet.',
  ],
  makeQuestion,
};
