import { useRef, useState } from 'react';
import { Eye, MoveHorizontal, Ruler as RulerIcon, Target } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp, useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { MEASURE_NAMES, MeasureObject, Ruler, RulerPicture } from './visuals/Ruler';
import type { MeasureKind } from './visuals/Ruler';

const CM = 12;
const UNIT = 46;
const X0 = 90;
const RULER_Y = 400;
const OBJ_Y = 318;
const MIN_LEN = 2;

const xOf = (cm: number) => X0 + cm * UNIT;
const cmOf = (x: number) => Math.round((x - X0) / UNIT);

const KINDS: MeasureKind[] = ['pencil', 'crayon', 'caterpillar'];

function MeasureScene() {
  const [kind, setKind] = useState<MeasureKind>('pencil');
  const [start, setStart] = useState(0);
  const [len, setLen] = useState(7);
  const grab = useRef(0);
  const end = start + len;

  const moveBody = useSvgDrag(
    (p) => {
      const s = clamp(cmOf(p.x - grab.current), 0, CM - len);
      if (s !== start) {
        setStart(s);
        play('tap');
      }
    },
    { onStart: (p) => (grab.current = p.x - xOf(start)) },
  );

  const moveTip = useSvgDrag((p) => {
    const e = clamp(cmOf(p.x), start + MIN_LEN, CM);
    if (e !== end) {
      setLen(e - start);
      play('tap');
    }
  });

  const name = MEASURE_NAMES[kind];

  return (
    <SceneSvg label={`A ${name} ${len} centimetres long, from ${start} to ${end} on the ruler`}>
      {/* What to measure */}
      <text x={90} y={96} fontSize={16} fill={C.muted} className="caps">Measure a…</text>
      {KINDS.map((k, i) => (
        <g
          key={k}
          onClick={() => {
            setKind(k);
            play('tap');
          }}
          style={{ cursor: 'pointer' }}
          data-nopan
          role="button"
          aria-label={MEASURE_NAMES[k]}
        >
          <rect x={90 + i * 104} y={110} width={94} height={52} rx={12} fill={kind === k ? C.card : 'transparent'} stroke={kind === k ? C.ink : C.line} strokeWidth={kind === k ? 2.5 : 1.5} />
          <MeasureObject kind={k} x1={104 + i * 104} x2={170 + i * 104} y={136} h={18} />
        </g>
      ))}

      {/* Guide lines from the ends down to the ruler */}
      {[start, end].map((v, i) => (
        <g key={i}>
          <line x1={xOf(v)} y1={OBJ_Y + 22} x2={xOf(v)} y2={RULER_Y - 2} stroke={C.teal} strokeWidth={2.5} strokeDasharray="5 5" />
          <circle cx={xOf(v)} cy={RULER_Y} r={6} fill={C.teal} stroke={C.ink} strokeWidth={1.5} />
        </g>
      ))}

      <Ruler x={X0} y={RULER_Y} cm={CM} unit={UNIT} height={80} fontSize={22} />

      {/* The object: drag the body to slide it, drag the round grip to stretch it */}
      <g {...moveBody} role="slider" aria-label={`Slide the ${name}`} aria-valuenow={start} aria-valuemin={0} aria-valuemax={CM - len}>
        <rect x={xOf(start)} y={OBJ_Y - 30} width={len * UNIT} height={60} fill="transparent" />
        <ellipse cx={(xOf(start) + xOf(end)) / 2 + 4} cy={OBJ_Y + 30} rx={len * UNIT * 0.5} ry={7} fill={C.ink} opacity={0.12} />
        <MeasureObject kind={kind} x1={xOf(start)} x2={xOf(end)} y={OBJ_Y} h={38} />
      </g>
      <g {...moveTip} role="slider" aria-label={`Stretch the ${name}`} aria-valuenow={end} aria-valuemin={start + MIN_LEN} aria-valuemax={CM}>
        <circle cx={xOf(end)} cy={OBJ_Y - 52} r={24} fill={C.card} stroke={C.ink} strokeWidth={2} />
        <path
          d={`M${xOf(end) - 13},${OBJ_Y - 52} h26 M${xOf(end) - 13},${OBJ_Y - 52} l6,-6 M${xOf(end) - 13},${OBJ_Y - 52} l6,6 M${xOf(end) + 13},${OBJ_Y - 52} l-6,-6 M${xOf(end) + 13},${OBJ_Y - 52} l-6,6`}
          stroke={C.ink}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <line x1={xOf(end)} y1={OBJ_Y - 28} x2={xOf(end)} y2={OBJ_Y - 18} stroke={C.ink} strokeWidth={2} />
      </g>

      {/* Readout */}
      <rect x={718} y={70} width={252} height={130} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={718} y={70} width={252} height={130} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={844} y={122} textAnchor="middle" dominantBaseline="central" fontSize={54} fontWeight={700} fill={C.ink} className="num">
        {len} cm
      </text>
      <text x={844} y={174} textAnchor="middle" fontSize={17} fill={C.ink2} className="num">
        {start === 0 ? `from 0 to ${end}` : `${end} − ${start} = ${len}`}
      </text>
      <SvgButton
        x={718}
        y={232}
        w={252}
        h={52}
        fontSize={18}
        label="Line up with 0"
        onClick={() => {
          setStart(0);
          play('pop');
        }}
        disabled={start === 0}
        color={C.teal}
        textColor={C.white}
      />
      <SvgButton
        x={718}
        y={300}
        w={252}
        h={50}
        fontSize={18}
        label="Surprise length"
        onClick={() => {
          const l = rand(MIN_LEN, CM);
          setLen(l);
          setStart(rand(0, CM - l));
          play('pop');
        }}
      />
      <SvgButton x={718} y={366} w={252} h={50} fontSize={18} label="Say it" onClick={() => speak(`The ${name} is ${len} centimetres long.`, { force: true })} />

      <Callout at={[X0, RULER_Y + 50]} box={[40, 528]} w={206} icon={Target} title="Start at 0" text="Line up one end with the 0 mark." />
      <Callout at={[xOf(end), RULER_Y]} box={[470, 112]} w={220} icon={Eye} title="Read the end" text="The number under the other end is the length." />
      <Callout at={[X0 + UNIT * 1.5, RULER_Y + 28]} box={[268, 528]} w={222} icon={RulerIcon} title="1 centimetre" text="Each numbered gap is 1 cm, about a finger wide." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <MeasureObject kind="pencil" x1={10} x2={94} y={26} h={14} />
      <Ruler x={10} y={44} cm={6} unit={14} height={26} fontSize={10} mm={false} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const kind = pick(['pencil', 'crayon', 'caterpillar'] as const);
  const name = MEASURE_NAMES[kind];
  if (level < 2) {
    const L = level === 0 ? rand(2, 8) : rand(3, 12);
    return {
      prompt: `How long is the ${name}?`,
      visual: <RulerPicture kind={kind} start={0} end={L} />,
      choices: numberChoices(L, { count: level === 0 ? 3 : 4, min: 1, max: 12, spread: 2 }).map((v) => ({ value: v, label: `${v} cm`, name: `${v} centimetres` })),
      answer: String(L),
      hint: 'It starts at 0, so read the number under the other end.',
      explain: [`The ${name} starts at 0.`, `Its other end is at ${L}.`, `So it is ${L} cm long.`],
    };
  }
  const s = rand(1, 4);
  const e = rand(s + 2, 12);
  return {
    prompt: `How long is the ${name}, in cm?`,
    visual: <RulerPicture kind={kind} start={s} end={e} />,
    answer: String(e - s),
    hint: `It doesn't start at 0! Read where both ends are.`,
    explain: [`The ${name} starts at ${s} and ends at ${e}.`, `Take the start away from the end: ${e} − ${s} = ${e - s}.`, `It is ${e - s} cm long.`],
  };
}

export const measuring: Lesson = {
  id: 'measuring',
  title: 'Measuring Length',
  Thumb,
  Scene: MeasureScene,
  sceneHint: 'Drag the object along the ruler · Stretch it with the round grip',
  learn: {
    heading: 'Measuring length',
    intro: 'A ruler tells us how long something is. We measure small things in centimetres (cm). Line the thing up with 0 and read the number at the other end.',
    points: [
      { icon: Target, text: 'Line one end up with 0.' },
      { icon: Eye, text: 'Look straight down at the other end.' },
      { icon: RulerIcon, text: 'Write the number and the unit: 7 cm.' },
      { icon: MoveHorizontal, text: 'Not at 0? Take the start away from the end.' },
    ],
  },
  steps: [
    'Lay the ruler right next to the object.',
    'Move it so one end of the object is on the 0 mark (not the edge of the ruler!).',
    'Find the mark at the other end and read the number.',
    'Not starting at 0? Take the start number away from the end number.',
  ],
  example: {
    question: 'How long is this pencil?',
    visual: <RulerPicture kind="pencil" start={2} end={9} />,
    work: ['The pencil starts at 2, not at 0.', 'It ends at 9.', '9 − 2 = 7.'],
    answer: 'The pencil is 7 cm long',
  },
  grownups: [
    'The most common mistake is starting at the end of the ruler instead of the 0 mark. Point it out on a real ruler.',
    'Estimate first (“I think about 10 cm”), then measure and compare.',
    'Measure with fingers, paper clips or bricks first: it shows why we need a standard unit.',
    'Talk about millimetres as the tiny marks between the numbers once centimetres feel easy.',
  ],
  makeQuestion,
};
