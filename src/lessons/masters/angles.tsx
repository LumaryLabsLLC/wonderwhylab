import { useState } from 'react';
import { CircleDot, Move3d, RotateCcw, Square } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { useSvgDrag } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { NumberCard, SceneSvg, SvgButton } from '../../stage/widgets';
import { ANGLE_TYPES, AnglePicture, angleType, arc, polar, rightMark, sector, SplitPicture, typeColor } from './visuals/Angles';
import type { AngleType } from './visuals/Angles';

const CX = 370;
const CY = 360;
const R = 250;
const ARM = 272;

function AnglesScene() {
  const [deg, setDeg] = useState(50);

  const drag = useSvgDrag((p) => {
    const raw = (Math.atan2(-(p.y - CY), p.x - CX) * 180) / Math.PI;
    let d = Math.round((raw + 360) % 360);
    const five = Math.round(d / 5) * 5;
    if (Math.abs(d - five) <= 2) d = five;
    d %= 360;
    if (d !== deg) {
      setDeg(d);
      if (d % 10 === 0) play('tap');
    }
  });

  const type = angleType(deg);
  const info = ANGLE_TYPES.find((t) => t.type === type);
  const color = typeColor(deg);
  const [ex, ey] = polar(CX, CY, ARM, deg);
  const [hx, hy] = polar(CX, CY, ARM - 26, deg);
  const [lx, ly] = polar(CX, CY, deg > 300 || deg < 25 ? 140 : 118, deg / 2);

  return (
    <SceneSvg label={`An angle of ${deg} degrees${type ? `, ${type.toLowerCase()}` : ''}`}>
      {/* Big draggable area behind everything */}
      <circle cx={CX} cy={CY} r={ARM + 20} fill="transparent" {...drag} />

      {/* Protractor */}
      <g pointerEvents="none">
        <circle cx={CX} cy={CY} r={R - 20} fill="none" stroke={C.line} strokeWidth={2} strokeDasharray="6 8" />
        <path d={`M${CX - R + 4},${CY + 6} A${R},${R} 0 0 1 ${CX + R + 4},${CY + 6} Z`} fill={C.ink} opacity={0.1} />
        <path d={`M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY} Z`} fill={C.card} fillOpacity={0.92} stroke={C.ink} strokeWidth={2.5} />
        <path d={`M${CX - 120},${CY} A120,120 0 0 1 ${CX + 120},${CY}`} fill="none" stroke={C.line} strokeWidth={2} />
        {Array.from({ length: 37 }, (_, i) => {
          const a = i * 5;
          const major = a % 10 === 0;
          const [x1, y1] = polar(CX, CY, R, a);
          const [x2, y2] = polar(CX, CY, R - (major ? 22 : 12), a);
          const [tx, ty0] = polar(CX, CY, R - 42, a);
          // Lift the 0 and 180 labels off the baseline so the arms don't cover them.
          const ty = a === 0 || a === 180 ? ty0 - 16 : ty0;
          return (
            <g key={a}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={major ? 2 : 1.2} />
              {major && (
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={15} fill={a === 0 || a === 90 || a === 180 ? C.ink : C.ink2} fontWeight={a % 90 === 0 ? 700 : 400} className="num">
                  {a}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* The angle */}
      <g pointerEvents="none">
        {deg === 90 ? (
          <path d={rightMark(CX, CY, 46, 0)} fill="none" stroke={shade(color, -0.2)} strokeWidth={4} />
        ) : deg > 0 ? (
          <>
            <path d={sector(CX, CY, 84, 0, deg)} fill={color} fillOpacity={0.4} />
            <path d={arc(CX, CY, 84, 0, deg)} fill="none" stroke={shade(color, -0.2)} strokeWidth={3} />
          </>
        ) : null}
        <line x1={CX} y1={CY} x2={CX + ARM} y2={CY} stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
        <line x1={CX} y1={CY} x2={ex} y2={ey} stroke={shade(color, -0.35)} strokeWidth={7} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={10} fill={C.ink} />
        {deg > 12 && deg !== 90 && (
          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink} className="num">
            {deg}°
          </text>
        )}
      </g>

      {/* Handle on the moving arm */}
      <g {...drag} role="slider" aria-label="Drag to turn the arm" aria-valuenow={deg} aria-valuemin={0} aria-valuemax={359}>
        <circle cx={hx} cy={hy} r={22} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
        <path d={arc(hx, hy, 9, deg + 120, deg + 240)} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
      </g>

      {/* Readout */}
      <NumberCard x={700} y={84} w={240} h={110} value={`${deg}°`} />
      <text x={820} y={228} textAnchor="middle" fontSize={26} fontWeight={700} fill={shade(color, -0.3)} className="caps">
        {type ?? 'No turn'}
      </text>
      <text x={820} y={256} textAnchor="middle" fontSize={16} fill={C.ink2}>
        {info?.rule ?? 'Drag the yellow handle'}
      </text>

      {ANGLE_TYPES.map((t, i) => (
        <SvgButton
          key={t.type}
          x={700}
          y={284 + i * 62}
          w={240}
          h={50}
          fontSize={17}
          label={`${t.type} · ${t.rule}`}
          title={`Show a ${t.type.toLowerCase()} angle`}
          color={type === t.type ? t.color : C.card}
          active={type === t.type}
          onClick={() => {
            setDeg(t.sample);
            speak(`${t.type} angle: ${t.rule}`);
          }}
        />
      ))}

      <Callout
        at={[CX, CY]}
        box={[40, 470]}
        w={250}
        icon={CircleDot}
        title="Vertex"
        text="The corner where the two arms meet."
      />
      <Callout
        at={[CX + ARM - 30, CY]}
        box={[490, 428]}
        w={200}
        icon={RotateCcw}
        title="Start at 0"
        text="Put one arm on 0°, then count round."
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M14 68 A46 46 0 0 1 106 68 Z" fill={C.card} stroke={C.ink} strokeWidth={1.5} />
      <path d={sector(60, 68, 20, 0, 50)} fill={C.green} fillOpacity={0.5} />
      <line x1={60} y1={68} x2={106} y2={68} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <line x1={60} y1={68} x2={60 + 44 * Math.cos(0.87)} y2={68 - 44 * Math.sin(0.87)} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <circle cx={60} cy={68} r={3} fill={C.ink} />
    </svg>
  );
}

function sampleAngle(t: AngleType): number {
  switch (t) {
    case 'Acute':
      return rand(3, 16) * 5;
    case 'Right':
      return 90;
    case 'Obtuse':
      return rand(20, 34) * 5;
    case 'Straight':
      return 180;
    case 'Reflex':
      return rand(40, 68) * 5;
  }
}

/** Why an angle of `deg` degrees has type `t`. */
function classifySteps(t: AngleType, deg: number): string[] {
  switch (t) {
    case 'Acute':
      return [`This angle is about ${deg}°.`, 'That is smaller than a right angle (90°).', 'An angle less than 90° is Acute.'];
    case 'Right':
      return ['The two arms make a square corner.', 'That is exactly 90°.', 'An angle of exactly 90° is Right.'];
    case 'Obtuse':
      return [`This angle is about ${deg}°.`, 'That is bigger than 90° but less than 180°.', 'So it is Obtuse.'];
    case 'Straight':
      return ['The two arms make one straight line.', 'That is exactly 180°.', 'A 180° angle is Straight.'];
    case 'Reflex':
      return [`This angle turns past a straight line: about ${deg}°.`, 'That is more than 180°.', 'So it is Reflex.'];
  }
}

function classify(level: number): Question {
  const pool: AngleType[] = level < 2 ? ['Acute', 'Right', 'Obtuse', 'Straight'] : ['Acute', 'Right', 'Obtuse', 'Straight', 'Reflex'];
  const t = pick(level === 0 ? (['Acute', 'Right', 'Obtuse'] as AngleType[]) : pool);
  const deg = sampleAngle(t);
  const options = level === 0 ? (['Acute', 'Right', 'Obtuse'] as AngleType[]) : shuffle([t, ...shuffle(pool.filter((x) => x !== t)).slice(0, 3)]);
  return {
    prompt: 'What kind of angle is this?',
    visual: <AnglePicture deg={deg} turn={level === 2 ? rand(0, 8) * 10 : 0} />,
    choices: options.map((value) => ({ value })),
    answer: t,
    hint: 'Compare it with a right angle (a square corner). Is it smaller, exactly the same, or bigger?',
    explain: classifySteps(t, deg),
  };
}

function measure(): Question {
  const deg = rand(1, 17) * 10;
  const set = new Set<string>([String(deg)]);
  if (deg !== 90) set.add(String(180 - deg)); // reading the wrong scale
  for (const v of numberChoices(deg, { min: 10, max: 170, step: 10, spread: 2 })) if (set.size < 4) set.add(v);
  return {
    prompt: 'How many degrees is this angle?',
    visual: <AnglePicture deg={deg} protractor />,
    choices: shuffle([...set]).map((v) => ({ value: `${v}°` })),
    answer: `${deg}°`,
    hint: 'Start at 0 on the flat arm and count round in tens.',
    explain: [
      'The flat arm points to 0° on one scale. Use that scale.',
      'Follow that scale round to the other arm, counting in tens.',
      `The other arm points to ${deg}°, so the angle is ${deg}°.`,
    ],
  };
}

function missing(): Question {
  const kind = pick(['line', 'line', 'right', 'point'] as const);
  if (kind === 'line') {
    let a = rand(4, 32) * 5;
    if (a === 90) a = 65;
    return {
      prompt: `Angles on a straight line add up to 180°. One angle is ${a}°. What is the other?`,
      speak: `Angles on a straight line add up to 180 degrees. One angle is ${a} degrees. What is the other?`,
      visual: <SplitPicture total={180} a={a} />,
      answer: String(180 - a),
      hint: 'A straight line is 180°. Take away the angle you know.',
      explain: ['A straight line is 180°.', `180 − ${a} = ${180 - a}.`, `The other angle is ${180 - a}°.`],
    };
  }
  if (kind === 'right') {
    const a = rand(2, 16) * 5;
    return {
      prompt: `A right angle is split in two. One part is ${a}°. What is the other part?`,
      speak: `A right angle is split in two. One part is ${a} degrees. What is the other part?`,
      visual: <SplitPicture total={90} a={a} />,
      answer: String(90 - a),
      hint: 'A right angle is 90°. Take away the part you know.',
      explain: ['A right angle is 90°.', `90 − ${a} = ${90 - a}.`, `The other part is ${90 - a}°.`],
    };
  }
  const a = rand(8, 16) * 10;
  const b = rand(6, 14) * 10;
  return {
    prompt: `Three angles meet at a point. Two of them are ${a}° and ${b}°. What is the third?`,
    speak: `Three angles meet at a point. Two of them are ${a} degrees and ${b} degrees. What is the third?`,
    answer: String(360 - a - b),
    hint: 'Angles around a point make a full turn of 360°. Take away the two you know.',
    explain: ['Angles around a point add up to 360°.', `${a} + ${b} = ${a + b}.`, `360 − ${a + b} = ${360 - a - b}, so the third angle is ${360 - a - b}°.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return classify(0);
  if (level === 1) return pick([() => classify(1), measure, measure])();
  return pick([() => classify(2), measure, missing, missing])();
}

export const angles: Lesson = {
  id: 'angles',
  title: 'Angles',
  Thumb,
  Scene: AnglesScene,
  sceneHint: 'Drag the yellow handle to turn the arm · Tap a type to see an example',
  learn: {
    heading: 'Angles',
    intro: 'An angle measures a turn. We measure angles in degrees (°). A full turn is 360°.',
    points: [
      { icon: Square, text: 'A right angle is a quarter turn: exactly 90°.' },
      { icon: Move3d, text: 'Acute is smaller than 90°. Obtuse is between 90° and 180°.' },
      { icon: RotateCcw, text: 'A straight line is 180°. Reflex angles are more than 180°.' },
    ],
  },
  steps: [
    'Put the centre of the protractor exactly on the vertex.',
    'Line up one arm with the 0° line.',
    'Follow the scale that starts at 0 round to the other arm.',
    'Check your answer: does it look smaller or bigger than a right angle?',
  ],
  example: {
    question: 'One angle on a straight line is 130°. What is the other angle?',
    visual: <SplitPicture total={180} a={130} />,
    work: ['Angles on a straight line add up to 180°.', '180 − 130 = 50.'],
    answer: 'The other angle is 50°.',
  },
  grownups: [
    'Hunt for angles at home: book corners are right angles, a half-open door makes an acute or obtuse angle.',
    'With a real protractor, the hardest part is choosing the inner or outer scale. Always start counting from the 0 that the arm lies on.',
    'Estimate first (“about 40°?”) and then measure. Estimation catches scale mistakes.',
    'Clock hands are great practice: at 3 o’clock they make a right angle.',
  ],
  makeQuestion,
};
