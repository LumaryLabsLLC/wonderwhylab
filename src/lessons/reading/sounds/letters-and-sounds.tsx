import { useMemo, useRef, useState } from 'react';
import { CaseSensitive, Ear, PenLine } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { LETTERS, LOOKALIKES, pick, shuffle, soundOf } from './data';
import { mcq, level3 } from './q';
import { BigLetterVisual, DragCard, LetterTile, Note, Tap } from './visuals/Pictures';

// ───────────────────────── Letter strokes for tracing ─────────────────────────

type P = [number, number];
const line = (a: P, b: P): P[] => [a, b];
/** Points on an ellipse arc; angles in degrees, 0 = right, 90 = down (SVG coordinates). */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 28): P[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}

/** Each letter is a list of strokes in a 1 × 1 box, in the order and direction they are written. */
const STROKES: Record<string, P[][]> = {
  A: [line([0.5, 0], [0, 1]), line([0.5, 0], [1, 1]), line([0.22, 0.62], [0.78, 0.62])],
  B: [line([0, 0], [0, 1]), arc(0, 0.25, 0.8, 0.25, -90, 90), arc(0, 0.75, 0.95, 0.25, -90, 90)],
  C: [arc(0.55, 0.5, 0.5, 0.5, -40, -320)],
  D: [line([0, 0], [0, 1]), arc(0, 0.5, 0.95, 0.5, -90, 90)],
  E: [line([0, 0], [0, 1]), line([0, 0], [0.85, 0]), line([0, 0.5], [0.7, 0.5]), line([0, 1], [0.85, 1])],
  F: [line([0, 0], [0, 1]), line([0, 0], [0.85, 0]), line([0, 0.5], [0.7, 0.5])],
  H: [line([0, 0], [0, 1]), line([1, 0], [1, 1]), line([0, 0.5], [1, 0.5])],
  I: [line([0.5, 0], [0.5, 1]), line([0.2, 0], [0.8, 0]), line([0.2, 1], [0.8, 1])],
  L: [line([0, 0], [0, 1]), line([0, 1], [0.75, 1])],
  M: [line([0, 0], [0, 1]), [[0, 0], [0.5, 0.6], [1, 0]], line([1, 0], [1, 1])],
  N: [line([0, 0], [0, 1]), line([0, 0], [1, 1]), line([1, 1], [1, 0])],
  O: [arc(0.5, 0.5, 0.5, 0.5, -90, -450, 40)],
  P: [line([0, 0], [0, 1]), arc(0, 0.27, 0.85, 0.27, -90, 90)],
  T: [line([0, 0], [1, 0]), line([0.5, 0], [0.5, 1])],
  U: [[[0, 0], [0, 0.62], ...arc(0.5, 0.62, 0.5, 0.38, 180, 0).slice(1), [1, 0]]],
  V: [[[0, 0], [0.5, 1], [1, 0]]],
};
const TRACE_LETTERS = Object.keys(STROKES);

const BOX = { x: 390, y: 140, w: 220, h: 300 };
const HIT = 42;

/** Turn unit strokes into evenly spaced points in the scene. */
function samplePoints(letter: string): Pt[][] {
  return STROKES[letter].map((stroke) => {
    const pts = stroke.map(([u, v]) => ({ x: BOX.x + u * BOX.w, y: BOX.y + v * BOX.h }));
    const out: Pt[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 9));
      for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    return out;
  });
}

const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

function TracePad({ letter, onDone }: { letter: string; onDone: () => void }) {
  const strokes = useMemo(() => samplePoints(letter), [letter]);
  const [pos, setPos] = useState({ s: 0, k: 0 });
  const active = useRef(false);
  const posRef = useRef(pos);
  posRef.current = pos;
  const done = pos.s >= strokes.length;

  const drag = useSvgDrag(
    (p) => {
      const cur = posRef.current;
      if (!active.current || cur.s >= strokes.length) return;
      const pts = strokes[cur.s];
      let best = cur.k;
      for (let j = cur.k + 1; j < Math.min(pts.length, cur.k + 9); j++) {
        if (Math.hypot(p.x - pts[j].x, p.y - pts[j].y) < HIT) best = j;
      }
      if (best === cur.k) return;
      if (best >= pts.length - 1) {
        active.current = false;
        const next = { s: cur.s + 1, k: 0 };
        setPos(next);
        play(next.s >= strokes.length ? 'correct' : 'pop');
        if (next.s >= strokes.length) onDone();
      } else setPos({ s: cur.s, k: best });
    },
    {
      onStart: (p) => {
        const cur = posRef.current;
        if (cur.s >= strokes.length) return;
        const at = strokes[cur.s][cur.k];
        active.current = Math.hypot(p.x - at.x, p.y - at.y) < HIT + 14;
      },
      onEnd: () => {
        active.current = false;
      },
    },
  );

  const pen = done ? null : strokes[pos.s][pos.k];
  const ahead = done ? null : strokes[pos.s][Math.min(strokes[pos.s].length - 1, pos.k + 5)];

  return (
    <g>
      <rect x={BOX.x - 90} y={BOX.y - 60} width={BOX.w + 180} height={BOX.h + 120} rx={22} fill={C.white} stroke={C.line} strokeWidth={2} />
      {strokes.map((pts, i) => (
        <path key={`bg${i}`} d={pathOf(pts)} fill="none" stroke={shade(C.line, 0.3)} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {strokes.map((pts, i) => (
        <path key={`dash${i}`} d={pathOf(pts)} fill="none" stroke={C.muted} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
      ))}
      {strokes.map((pts, i) =>
        i < pos.s ? (
          <path key={`ink${i}`} d={pathOf(pts)} fill="none" stroke={C.blue} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        ) : i === pos.s && pos.k > 0 ? (
          <path key={`ink${i}`} d={pathOf(pts.slice(0, pos.k + 1))} fill="none" stroke={C.blue} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        ) : null,
      )}
      {pen && ahead && (
        <g>
          <line x1={pen.x} y1={pen.y} x2={ahead.x} y2={ahead.y} stroke={C.green} strokeWidth={4} strokeDasharray="6 6" />
          <circle cx={pen.x} cy={pen.y} r={22} fill={C.green} stroke={C.ink} strokeWidth={3} className={pos.k === 0 ? 'pop-in' : undefined} style={{ transformOrigin: `${pen.x}px ${pen.y}px` }} />
          {pos.k === 0 && (
            <text x={pen.x} y={pen.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.white}>
              {pos.s + 1}
            </text>
          )}
        </g>
      )}
      {/* The whole pad is the drag surface: start on the green dot and follow the path. */}
      <rect x={BOX.x - 90} y={BOX.y - 60} width={BOX.w + 180} height={BOX.h + 120} rx={22} fill="transparent" {...drag} aria-label={`Trace the letter ${letter}`} />
    </g>
  );
}

// ───────────────────────── Scene ─────────────────────────

const CARD_X = [200, 400, 600, 800];

function newSet(): { upper: string[]; lower: string[] } {
  const letters = shuffle(LETTERS).slice(0, 4);
  return { upper: letters, lower: shuffle(letters) };
}

function LettersScene() {
  const [mode, setMode] = useState<'match' | 'trace'>('match');
  const [set, setSet] = useState(newSet);
  const [matched, setMatched] = useState<string[]>([]);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'try' }>({ text: 'Drag each small letter to its big letter.', tone: 'plain' });
  const [traceIdx, setTraceIdx] = useState(() => Math.floor(Math.random() * TRACE_LETTERS.length));
  const [traced, setTraced] = useState(false);
  const [traceRound, setTraceRound] = useState(0);
  const traceLetter = TRACE_LETTERS[traceIdx];

  const drop = (l: string, x: number, y: number) => {
    if (y > 360) return;
    const i = CARD_X.findIndex((cx) => Math.abs(x - cx) < 85);
    if (i < 0) return;
    if (set.upper[i] === l) {
      setMatched([...matched, l]);
      play('correct');
      setMsg({ text: `Yes! ${l.toUpperCase()} and ${l} both say “${soundOf(l)}”.`, tone: 'good' });
    } else {
      setShake({ ...shake, [l]: (shake[l] ?? 0) + 1 });
      play('wrong');
      setMsg({ text: `Not yet. Look closely at the shape of ${l}.`, tone: 'try' });
    }
  };

  const newLetters = () => {
    setSet(newSet());
    setMatched([]);
    setShake({});
    setMsg({ text: 'Drag each small letter to its big letter.', tone: 'plain' });
    play('pop');
  };

  const nextTrace = () => {
    setTraceIdx((i) => (i + 1 + Math.floor(Math.random() * (TRACE_LETTERS.length - 1))) % TRACE_LETTERS.length);
    setTraced(false);
    setTraceRound((r) => r + 1);
    play('pop');
  };

  const allMatched = matched.length === set.upper.length;

  return (
    <SceneSvg label="Match big and small letters, or trace a letter">
      <SvgButton x={40} y={24} w={130} h={50} fontSize={18} label="Match" onClick={() => setMode('match')} active={mode === 'match'} color={mode === 'match' ? C.yellow : C.card} />
      <SvgButton x={182} y={24} w={130} h={50} fontSize={18} label="Trace" onClick={() => setMode('trace')} active={mode === 'trace'} color={mode === 'trace' ? C.yellow : C.card} />

      {mode === 'match' ? (
        <g>
          {set.upper.map((u, i) => (
            <Tap key={u} label={`Big ${u.toUpperCase()}. Tap to hear its sound.`} onTap={() => speak(soundOf(u), { force: true })}>
              <g transform={`translate(${CARD_X[i]} 190)`}>
                <LetterTile text={u.toUpperCase()} w={130} h={130} fontSize={84} />
              </g>
              {matched.includes(u) && (
                <g transform={`translate(${CARD_X[i]} 320)`}>
                  <g className="pop-in" style={{ transformOrigin: '0px 0px' }}>
                    <LetterTile text={u} w={92} h={92} fontSize={60} lit />
                  </g>
                </g>
              )}
            </Tap>
          ))}
          {set.lower.map((l, i) =>
            matched.includes(l) ? null : (
              <DragCard key={l} x={CARD_X[i]} y={490} label={`Small ${l}. Drag to its big letter, or tap to hear.`} onTap={() => speak(soundOf(l), { force: true })} onDrop={(p) => drop(l, p.x, p.y)} shakeKey={shake[l] ?? 0}>
                <LetterTile text={l} w={100} h={100} fontSize={66} fill={shade(C.blue, 0.85)} />
              </DragCard>
            ),
          )}
          <Note x={110} y={590} w={600} h={60} text={allMatched ? 'All pairs found! Tap a letter to hear its sound.' : msg.text} tone={allMatched ? 'good' : msg.tone} />
          <SvgButton x={760} y={594} w={200} h={52} fontSize={18} label="New letters" onClick={newLetters} color={allMatched ? C.yellow : C.card} />
          <Callout at={[CARD_X[3], 130]} box={[730, 24]} w={240} icon={CaseSensitive} title="Big and small" text="Big M and small m look different but say the same sound." />
        </g>
      ) : (
        <g>
          <TracePad key={`${traceLetter}-${traceRound}`} letter={traceLetter} onDone={() => setTraced(true)} />
          <Tap label={`Hear the sound of ${traceLetter}`} onTap={() => speak(soundOf(traceLetter.toLowerCase()), { force: true })}>
            <g transform="translate(150 290)">
              <LetterTile text={`${traceLetter}${traceLetter.toLowerCase()}`} w={150} h={110} fontSize={60} />
            </g>
            <text x={150} y={370} textAnchor="middle" fontSize={17} fill={C.ink2}>
              says “{soundOf(traceLetter.toLowerCase())}”
            </text>
          </Tap>
          <Note x={110} y={590} w={600} h={60} tone={traced ? 'good' : 'plain'} text={traced ? `You wrote ${traceLetter}! It says “${soundOf(traceLetter.toLowerCase())}”.` : 'Start on the green dot and follow the path.'} />
          <SvgButton x={760} y={594} w={200} h={52} fontSize={18} label="Next letter" onClick={nextTrace} color={traced ? C.yellow : C.card} />
          <SvgButton x={760} y={520} w={200} h={52} fontSize={18} label="Try again" onClick={() => { setTraced(false); setTraceRound((r) => r + 1); }} />
          <Callout at={[BOX.x, BOX.y]} box={[730, 120]} w={230} icon={PenLine} title="Follow the dots" text="Start at the green dot. Go the way the line shows." />
        </g>
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={8} y={14} width={48} height={52} rx={10} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={32} y={52} textAnchor="middle" fontSize={36} fontWeight={700} fill={C.ink}>
        B
      </text>
      <rect x={64} y={22} width={44} height={44} rx={10} fill={shade(C.blue, 0.8)} stroke={C.ink} strokeWidth={2} />
      <text x={86} y={54} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.ink}>
        b
      </text>
    </svg>
  );
}

// ───────────────────────── Questions ─────────────────────────

/** Letters whose small shape looks clearly different from `l`. */
function differentLetters(l: string, count: number): string[] {
  const confusable = new Set(LOOKALIKES.filter((g) => g.includes(l)).flat());
  return shuffle(LETTERS.filter((x) => x !== l && !confusable.has(x))).slice(0, count);
}

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv === 0) {
    const l = pick(LETTERS);
    const wrong = differentLetters(l, 1);
    return mcq({
      prompt: `Find the small letter for ${l.toUpperCase()}.`,
      speak: `Find the small letter that goes with big ${l.toUpperCase()}.`,
      visual: <BigLetterVisual text={l.toUpperCase()} />,
      answer: l,
      wrong,
      hint: 'Big and small letters are partners. Look at the shape and say the sound.',
      explain: [`Big ${l.toUpperCase()} and small ${l} are partners.`, `They both say “${soundOf(l)}”.`, `So the small letter is ${l}.`],
    });
  }
  if (lv === 1) {
    const l = pick(LETTERS);
    const options = [l, ...differentLetters(l, 2)];
    return mcq({
      prompt: `Which letter says “${soundOf(l)}”?`,
      speak: `Which letter says ${soundOf(l)}?`,
      answer: l,
      wrong: options.slice(1),
      labels: Object.fromEntries(options.map((o) => [o, `${o.toUpperCase()}${o}`])),
      names: Object.fromEntries(options.map((o) => [o, `${o.toUpperCase()}${o}`])),
      hint: 'Tap the speaker and listen. Then say each letter’s sound.',
      explain: [`Listen: “${soundOf(l)}”.`, `${l.toUpperCase()} and ${l} make the “${soundOf(l)}” sound.`, `So the letter is ${l}.`],
    });
  }
  // Look-alike small letters: b, d and p; m, n and w…
  const group = pick(LOOKALIKES);
  const l = group[0];
  return mcq({
    prompt: `Find the small letter for ${l.toUpperCase()}.`,
    speak: `Find the small letter that goes with big ${l.toUpperCase()}. Look carefully!`,
    visual: <BigLetterVisual text={l.toUpperCase()} />,
    answer: l,
    wrong: group.slice(1),
    hint: 'These letters look alike! Check which way the round part faces, or how many humps there are.',
    explain: [`Big ${l.toUpperCase()} says “${soundOf(l)}”.`, `Its small partner is ${l}, which says “${soundOf(l)}” too.`, `The others make different sounds, so the answer is ${l}.`],
  });
}

export const lettersAndSounds: Lesson = {
  id: 'letters-and-sounds',
  title: 'Letters and Sounds',
  Thumb,
  Scene: LettersScene,
  sceneHint: 'Match: drag small letters to big ones · Trace: follow the path from the green dot',
  learn: {
    heading: 'Letters make sounds',
    intro: 'Every letter has a big shape, a small shape and a sound. Big M and small m both say “mmm”.',
    points: [
      { icon: CaseSensitive, text: 'Big and small letters are partners.' },
      { icon: Ear, text: 'Partners make the same sound.' },
      { icon: PenLine, text: 'Writing a letter helps you remember it.' },
    ],
  },
  steps: ['Look at the big letter.', 'Say its sound out loud.', 'Find the small letter that makes the same sound.', 'Trace the letter with your finger to remember it.'],
  example: {
    question: 'Which small letter goes with D?',
    visual: <BigLetterVisual text="D" />,
    work: ['D says “duh”.', 'Small d also says “duh”. Its round part is on the left, with the tall line on the right.'],
    answer: 'Small d goes with big D.',
  },
  grownups: [
    'Say the sound as well as the name: “D says duh”. Linking shape and sound is what children need for reading.',
    'b, d and p are tricky for most young children. It’s normal; lots of practice helps.',
    'Tracing builds the hand movements for writing. Let your child trace big letters in sand or on a steamy window too.',
    'Keep sessions short and playful: a few letters a day is plenty.',
  ],
  makeQuestion,
};
