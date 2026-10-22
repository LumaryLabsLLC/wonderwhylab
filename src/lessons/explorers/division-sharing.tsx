import { useEffect, useRef, useState } from 'react';
import { Divide, Equal, Hand, PackageOpen } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { numberChoices, pick, rand } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, Shadow, SvgButton } from '../../stage/widgets';
import { Thing, ThingsPicture } from '../../visuals/Thing';

const MAX = 24;
const TRAY = { x: 150, y: 70, w: 520, h: 190 };
const PLATE_Y = 540;
const BIG = 46;
const SMALL = 32;

/** Where cookie number `slot` sits in the tray (8 per row). */
function trayPos(slot: number): [number, number] {
  const col = slot % 8;
  const row = Math.floor(slot / 8);
  return [TRAY.x + 52 + col * 59, TRAY.y + 44 + row * 52];
}

function plateX(i: number, plates: number) {
  const span = 640;
  return 60 + (span / plates) * (i + 0.5);
}

/** Where the n-th cookie on a plate sits: a little pile, three across. */
function pilePos(plate: number, n: number, plates: number): [number, number] {
  const col = n % 3;
  const row = Math.floor(n / 3);
  return [plateX(plate, plates) + (col - 1) * 30 + (row % 2 ? 8 : 0), PLATE_Y - 10 - row * 24];
}

function ShareScene() {
  const [total, setTotal] = useState(13);
  const [plates, setPlates] = useState(3);
  const [dealt, setDealt] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const each = Math.floor(total / plates);
  const left = total % plates;
  const toDeal = each * plates;
  const finished = dealt >= toDeal && dealt > 0;

  const reset = (t: number, p: number) => {
    window.clearInterval(timer.current);
    setTotal(t);
    setPlates(p);
    setDealt(0);
    play('pop');
  };

  const share = () => {
    window.clearInterval(timer.current);
    let k = 0;
    setDealt(0);
    timer.current = window.setInterval(() => {
      k += 1;
      setDealt(k);
      play('tap');
      if (k >= toDeal) {
        window.clearInterval(timer.current);
        play('correct');
        speak(
          `${total} shared by ${plates} is ${each} each${left ? `, with ${left} left over` : ''}.`,
        );
      }
    }, 260);
  };

  const plateR = Math.min(70, 320 / plates - 12);

  return (
    <SceneSvg label={`${total} cookies shared between ${plates} plates`}>
      {/* Tray */}
      <rect x={TRAY.x + 6} y={TRAY.y + 14} width={TRAY.w} height={TRAY.h} rx={22} fill={C.ink} opacity={0.12} />
      <rect x={TRAY.x} y={TRAY.y + 8} width={TRAY.w} height={TRAY.h} rx={22} fill={shade(C.wood, -0.3)} stroke={C.ink} strokeWidth={2} />
      <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} rx={22} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <rect x={TRAY.x + 14} y={TRAY.y + 12} width={TRAY.w - 28} height={TRAY.h - 24} rx={14} fill={shade(C.wood, 0.25)} />

      {/* Plates */}
      {Array.from({ length: plates }, (_, i) => {
        const x = plateX(i, plates);
        const onPlate = Math.min(each, Math.floor(dealt / plates) + (dealt % plates > i ? 1 : 0));
        return (
          <g key={i}>
            <Shadow cx={x + 4} cy={PLATE_Y + 12} rx={plateR} ry={plateR * 0.38} />
            <ellipse cx={x} cy={PLATE_Y + 4} rx={plateR} ry={plateR * 0.38} fill={shade(C.blue, 0.55)} stroke={C.ink} strokeWidth={2} />
            <ellipse cx={x} cy={PLATE_Y} rx={plateR} ry={plateR * 0.38} fill={C.white} stroke={C.ink} strokeWidth={2} />
            <ellipse cx={x} cy={PLATE_Y} rx={plateR * 0.68} ry={plateR * 0.24} fill="none" stroke={shade(C.blue, 0.5)} strokeWidth={2} />
            <rect x={x - 22} y={PLATE_Y + 38} width={44} height={30} rx={8} fill={onPlate ? C.ink : C.card} stroke={C.ink} strokeWidth={1.5} />
            <text x={x} y={PLATE_Y + 53} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={onPlate ? C.white : C.muted} className="num">
              {onPlate}
            </text>
          </g>
        );
      })}

      {/* Cookies: each one flies from the tray to its plate. Drawn in dealing order so piles stack. */}
      {Array.from({ length: total }, (_, k) => {
        const i = total - 1 - k; // tray slot; the last cookie is dealt first
        const onPlate = k < dealt;
        const [x, y] = onPlate ? pilePos(k % plates, Math.floor(k / plates), plates) : trayPos(i);
        const scale = onPlate ? SMALL / BIG : 1;
        return (
          <g key={i} style={{ transform: `translate(${x}px, ${y}px) scale(${scale})`, transition: 'transform 0.45s cubic-bezier(0.3, 0.9, 0.3, 1)' }}>
            <Thing kind="cookie" size={BIG} />
          </g>
        );
      })}

      {finished && left > 0 && (
        <g className="fade-up">
          <rect x={TRAY.x + TRAY.w - 150} y={TRAY.y + TRAY.h - 46} width={136} height={34} rx={8} fill={C.orange} stroke={C.ink} strokeWidth={2} />
          <text x={TRAY.x + TRAY.w - 82} y={TRAY.y + TRAY.h - 29} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.ink}>
            {left} left over
          </text>
        </g>
      )}

      {/* Readout */}
      <rect x={718} y={76} width={252} height={104} rx={14} fill={shade(C.paper, -0.12)} transform="translate(4 6)" />
      <rect x={718} y={76} width={252} height={104} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={844} y={114} textAnchor="middle" dominantBaseline="central" fontSize={36} fontWeight={700} fill={C.ink} className="num">
        {total} ÷ {plates}
      </text>
      <text x={844} y={154} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill={finished ? C.teal : C.muted} className="num">
        = {finished ? each : '?'}
        {finished && left > 0 ? ` r ${left}` : ''}
      </text>

      <text x={720} y={222} fontSize={16} fill={C.muted} className="caps">Cookies</text>
      <SvgButton x={718} y={232} w={60} h={52} label="−" title="One less cookie" onClick={() => reset(total - 1, plates)} disabled={total <= 1} />
      <text x={844} y={259} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {total}
      </text>
      <SvgButton x={910} y={232} w={60} h={52} label="+" title="One more cookie" onClick={() => reset(total + 1, plates)} disabled={total >= MAX} color={C.yellow} />

      <text x={720} y={318} fontSize={16} fill={C.muted} className="caps">Plates</text>
      <SvgButton x={718} y={328} w={60} h={52} label="−" title="One less plate" onClick={() => reset(total, plates - 1)} disabled={plates <= 2} />
      <text x={844} y={355} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={700} fill={C.ink} className="num">
        {plates}
      </text>
      <SvgButton x={910} y={328} w={60} h={52} label="+" title="One more plate" onClick={() => reset(total, plates + 1)} disabled={plates >= 6} color={C.yellow} />

      <SvgButton x={718} y={414} w={252} h={52} fontSize={18} label="Share them out" onClick={share} color={C.teal} textColor={C.white} disabled={toDeal === 0} />
      <SvgButton x={718} y={482} w={252} h={50} fontSize={18} label="Put them back" onClick={() => reset(total, plates)} disabled={dealt === 0} />

      <Callout at={[TRAY.x + 52, TRAY.y + 96]} box={[24, 296]} w={206} icon={Hand} title="One at a time" text="Give one to each plate, then go round again." />
      <Callout at={[plateX(0, plates) + plateR - 6, PLATE_Y + 4]} box={[246, 304]} w={200} icon={Equal} title="Equal shares" text="Every plate gets the same number." />
      {finished && left > 0 ? (
        <Callout at={[TRAY.x + TRAY.w - 82, TRAY.y + TRAY.h - 12]} box={[462, 296]} w={224} icon={PackageOpen} title="Remainder" text="Not enough to go round again. These are left over." />
      ) : (
        <Callout at={[718, 128]} box={[462, 296]} w={224} icon={Divide} title="Divide" text="÷ means share into equal groups." />
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {[30, 90].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={62} rx={24} ry={9} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
          <Thing kind="cookie" x={x - 9} y={52} size={20} />
          <Thing kind="cookie" x={x + 9} y={52} size={20} />
          <Thing kind="cookie" x={x} y={38} size={20} />
        </g>
      ))}
      <text x={60} y={22} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill={C.ink}>
        ÷
      </text>
    </svg>
  );
}

/** "3, 6, 9, 12" — counting in steps of `step`, `times` times. */
const skipCount = (step: number, times: number) => Array.from({ length: times }, (_, i) => step * (i + 1)).join(', ');

function makeQuestion(level: number): Question {
  if (level === 0) {
    const friends = pick([2, 3, 4, 5]);
    const each = rand(1, 5);
    const total = friends * each;
    return {
      prompt: `${total} cookies shared by ${friends} friends. How many each?`,
      visual: <ThingsPicture kind="cookie" count={total} perRow={friends} />,
      choices: numberChoices(each, { min: 1, max: 12, spread: 2 }).map((value) => ({ value })),
      answer: String(each),
      hint: `Give one to each friend at a time. Each row of the picture is one round.`,
      explain: [
        `Deal the ${total} cookies out one at a time to ${friends} friends.`,
        `Each round uses ${friends} cookies: ${skipCount(friends, each)}.`,
        `That is ${each} ${each === 1 ? 'round' : 'rounds'}, so each friend gets ${each}.`,
      ],
    };
  }
  if (level === 1 || Math.random() < 0.5) {
    const d = rand(2, level === 1 ? 6 : 10);
    const q = rand(2, 10);
    return {
      prompt: `${d * q} ÷ ${d} = ?`,
      answer: String(q),
      hint: `Think: what times ${d} makes ${d * q}?`,
      explain: [`Share ${d * q} into ${d} equal groups.`, `Count in ${d}s: ${skipCount(d, q)}. That is ${q} jumps.`, `${d * q} ÷ ${d} = ${q}.`],
    };
  }
  const d = rand(3, 9);
  const q = rand(2, 9);
  const r = rand(1, d - 1);
  const n = d * q + r;
  return {
    prompt: `Share ${n} between ${d}. How many are left over?`,
    answer: String(r),
    hint: `Find the biggest number in the ${d} times table that fits into ${n}.`,
    explain: [
      `${d} × ${q} = ${d * q} is as close as we can get without going over ${n}.`,
      `Everyone gets ${q}. Then ${n} − ${d * q} = ${r}.`,
      `So ${r} ${r === 1 ? 'is' : 'are'} left over.`,
    ],
  };
}

export const divisionSharing: Lesson = {
  id: 'division-sharing',
  title: 'Sharing Equally',
  Thumb,
  Scene: ShareScene,
  sceneHint: 'Choose cookies and plates · Tap Share them out',
  learn: {
    heading: 'Sharing equally',
    intro: 'Dividing means sharing things out so every group gets the same. 12 ÷ 3 = 4 means 12 shared into 3 groups gives 4 in each.',
    points: [
      { icon: Hand, text: 'Deal one at a time, round and round.' },
      { icon: Equal, text: 'Every group must get the same.' },
      { icon: PackageOpen, text: 'Any that can’t go round are the remainder.' },
    ],
  },
  steps: [
    'Count how many things you have.',
    'Count how many groups to share them into.',
    'Give one to each group, then go round again.',
    'Stop when there aren’t enough to go round.',
    'Count one group: that is the answer. Any left over is the remainder.',
  ],
  example: {
    question: 'Share 15 cookies between 3 plates. How many on each plate?',
    visual: <ThingsPicture kind="cookie" count={15} perRow={3} />,
    work: ['Deal them out: 1 to each plate, again and again.', 'After 5 rounds all 15 are gone.', 'Check: 3 × 5 = 15.'],
    answer: '15 ÷ 3 = 5 cookies each',
  },
  grownups: [
    'Sharing snacks, cards or toys between people is the best division practice there is.',
    'Division is the inverse of multiplication: if they know 3 × 5 = 15, they also know 15 ÷ 3 = 5.',
    'Talk about remainders in real life: “there’s one left over, what should we do with it?”',
    'Arrays work for division too: 15 dots in rows of 3 makes 5 rows.',
  ],
  makeQuestion,
};
