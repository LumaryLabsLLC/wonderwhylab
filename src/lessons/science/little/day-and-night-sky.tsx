import { useState } from 'react';
import { Moon, Sparkles, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from '../sparks/visuals/DragToken';
import { EmojiPicture, SceneEmoji } from './visuals/Emoji';
import { MessageBox } from './visuals/MessageBox';

/**
 * What we see in the sky by day and by night. Kept true for 4–5 year olds:
 * the Sun *seems* to move across the sky; the Sun is a star; the stars are always there but
 * daylight hides them; the Moon can sometimes be seen in the daytime too.
 */
const TIMES = [
  { name: 'Morning', sky: '#bfe3ff', glow: '#ffe2b0', sun: { x: 130, y: 330 }, day: true },
  { name: 'Midday', sky: '#7cc7ff', glow: '#bfe6ff', sun: { x: 320, y: 110 }, day: true },
  { name: 'Evening', sky: '#ffb38a', glow: '#ff8a65', sun: { x: 510, y: 330 }, day: true },
  { name: 'Night', sky: '#1b2550', glow: '#2b3a73', sun: null, day: false },
] as const;
const NIGHT_SKY = '#1b2550';

const SKY = { x: 40, y: 40, w: 560, h: 400 };
const STARS: Pt[] = [
  { x: 90, y: 90 }, { x: 170, y: 150 }, { x: 240, y: 80 }, { x: 300, y: 190 }, { x: 380, y: 100 }, { x: 430, y: 220 },
  { x: 520, y: 80 }, { x: 560, y: 170 }, { x: 120, y: 230 }, { x: 200, y: 260 }, { x: 350, y: 250 }, { x: 480, y: 280 },
];

type Box = 'day' | 'night' | 'both';
interface Thing {
  id: string;
  name: string;
  short: string;
  emoji: string;
  box: Box;
  why: string;
}
const THINGS: Thing[] = [
  { id: 'sun', short: 'Sun', name: 'the Sun', emoji: '☀️', box: 'day', why: 'We see the Sun in the day. At night, it is shining on the other side of the world.' },
  { id: 'rainbow', short: 'Rainbow', name: 'a rainbow', emoji: '🌈', box: 'day', why: 'A rainbow needs sunlight shining through raindrops.' },
  { id: 'stars', short: 'Stars', name: 'stars', emoji: '⭐', box: 'night', why: 'We see stars at night, when there is no bright sunlight.' },
  { id: 'milky', short: 'Milky Way', name: 'the Milky Way', emoji: '🌌', box: 'night', why: 'The Milky Way is a huge band of stars. We see it on dark nights.' },
  { id: 'moon', short: 'Moon', name: 'the Moon', emoji: '🌙', box: 'both', why: 'We often see the Moon at night, and sometimes in the day too!' },
  { id: 'cloud', short: 'Clouds', name: 'clouds', emoji: '☁️', box: 'both', why: 'Clouds can be in the sky in the day and at night.' },
];
const BOXES: { id: Box; name: string; color: string; x: number }[] = [
  { id: 'day', name: 'Day', color: C.yellow, x: 636 },
  { id: 'night', name: 'Night', color: '#3b4a8f', x: 746 },
  { id: 'both', name: 'Both', color: C.teal, x: 856 },
];
const BOX_Y = 440;
const BOX_W = 104;
const BOX_H = 196;

const STILL = 'Still there';
const GONE = 'Gone away';

function lerpColor(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

function SkyView({ time, dim }: { time: number; dim: number }) {
  const T = TIMES[time];
  const sky = T.day ? lerpColor(T.sky, NIGHT_SKY, dim * 0.85) : T.sky;
  const starOpacity = T.day ? dim : 1;
  return (
    <g>
      <defs>
        <clipPath id="dn-sky-clip">
          <rect x={SKY.x} y={SKY.y} width={SKY.w} height={SKY.h} rx={22} />
        </clipPath>
      </defs>
      <g clipPath="url(#dn-sky-clip)">
        <rect x={SKY.x} y={SKY.y} width={SKY.w} height={SKY.h} fill={sky} />
        <linearGradient id="dn-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={T.day ? lerpColor(T.glow, NIGHT_SKY, dim * 0.85) : T.glow} stopOpacity={0} />
          <stop offset="1" stopColor={T.day ? lerpColor(T.glow, NIGHT_SKY, dim * 0.85) : T.glow} stopOpacity={0.9} />
        </linearGradient>
        <rect x={SKY.x} y={SKY.y + SKY.h - 200} width={SKY.w} height={200} fill="url(#dn-glow)" />
        {/* Stars are always there; daylight hides them. */}
        {STARS.map((s, i) => (
          <text key={i} x={s.x} y={s.y} textAnchor="middle" dominantBaseline="central" fontSize={i % 3 === 0 ? 22 : 15} fill="#fff6c8" opacity={starOpacity}>
            ✦
          </text>
        ))}
        {T.sun && (
          <g>
            <circle cx={T.sun.x} cy={T.sun.y} r={58} fill="#fff6c2" opacity={0.7 * (1 - dim)} />
            <circle cx={T.sun.x} cy={T.sun.y} r={40} fill={lerpColor('#ffcf33', '#d8c38e', dim)} stroke={C.ink} strokeWidth={2.5} />
          </g>
        )}
        {/* The Moon: bright at night, pale in the morning sky. */}
        {(!T.day || time === 0) && (
          <g opacity={T.day ? 0.55 : 1}>
            <circle cx={470} cy={130} r={32} fill="#fdf6d8" stroke={T.day ? 'none' : C.ink} strokeWidth={2} />
            <circle cx={460} cy={122} r={6} fill="#e9dfb5" />
            <circle cx={482} cy={140} r={4} fill="#e9dfb5" />
          </g>
        )}
        {/* Ground, hill and house */}
        <path d={`M${SKY.x},${SKY.y + SKY.h - 70} Q${SKY.x + 180},${SKY.y + SKY.h - 130} ${SKY.x + 360},${SKY.y + SKY.h - 80} T${SKY.x + SKY.w},${SKY.y + SKY.h - 90} L${SKY.x + SKY.w},${SKY.y + SKY.h} L${SKY.x},${SKY.y + SKY.h} Z`} fill={T.day ? shade(C.green, -0.1 - dim * 0.4) : '#1e4a3a'} stroke={C.ink} strokeWidth={2} />
        <rect x={250} y={SKY.y + SKY.h - 128} width={70} height={56} fill={T.day ? '#fff2dc' : '#c9b48a'} stroke={C.ink} strokeWidth={2} />
        <polygon points={`244,${SKY.y + SKY.h - 128} 326,${SKY.y + SKY.h - 128} 285,${SKY.y + SKY.h - 162}`} fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        <rect x={276} y={SKY.y + SKY.h - 112} width={20} height={18} fill={T.day ? '#a9d8ff' : '#ffd84d'} stroke={C.ink} strokeWidth={1.5} />
      </g>
      <rect x={SKY.x} y={SKY.y} width={SKY.w} height={SKY.h} rx={22} fill="none" stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

function DimSlider({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  const x0 = 250;
  const x1 = 580;
  const drag = useSvgDrag((p) => !disabled && onChange(clamp((p.x - x0) / (x1 - x0), 0, 1)));
  const kx = x0 + value * (x1 - x0);
  return (
    <g opacity={disabled ? 0.4 : 1}>
      <text x={40} y={560} dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.ink}>
        Pretend: dim the Sun
      </text>
      <rect x={x0} y={552} width={x1 - x0} height={16} rx={8} fill={`url(#dn-dim)`} stroke={C.ink} strokeWidth={2} />
      <defs>
        <linearGradient id="dn-dim">
          <stop offset="0" stopColor="#ffd84d" />
          <stop offset="1" stopColor={NIGHT_SKY} />
        </linearGradient>
      </defs>
      <circle cx={kx} cy={560} r={24} fill={C.white} stroke={C.ink} strokeWidth={3} {...drag} />
      <circle cx={kx} cy={560} r={9} fill={C.ink} pointerEvents="none" />
    </g>
  );
}

function SkyScene() {
  const [time, setTime] = useState(1);
  const [dim, setDim] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [tested, setTested] = useState(false);
  const [where, setWhere] = useState<Record<string, Box | 'shelf'>>(() => Object.fromEntries(THINGS.map((t) => [t.id, 'shelf'])));
  const [selected, setSelected] = useState<string | null>(null);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('Tap a time of day. Then sort the sky things into the boxes.');
  const T = TIMES[time];

  const pickTime = (i: number) => {
    setTime(i);
    setDim(0);
    play('tap');
    setMessage(
      i === 3
        ? 'Night! The Moon and stars are easy to see.'
        : i === 0
          ? 'Morning: the Sun seems to rise. Can you spot the pale Moon?'
          : i === 1
            ? 'Midday: the Sun is high in the sky.'
            : 'Evening: the Sun seems to go down.',
    );
  };

  const onDim = (v: number) => {
    setDim(v);
    if (v > 0.85 && !tested) {
      setTested(true);
      play('correct');
      setMessage('Look! The stars were there all along.');
    }
  };

  const toBox = (t: Thing, b: Box) => {
    if (t.box === b) {
      setSelected(null);
      setWhere((s) => ({ ...s, [t.id]: b }));
      play('correct');
      setMessage(`Yes! ${t.why}`);
    } else {
      play('wrong');
      setShake((s) => ({ ...s, [t.id]: (s[t.id] ?? 0) + 1 }));
      setMessage(`Not yet. When can we see ${t.name}? Try another box.`);
    }
  };

  const dropAt = (t: Thing, p: Pt) => {
    for (const b of BOXES) if (p.x >= b.x && p.x <= b.x + BOX_W && p.y >= BOX_Y - 30 && p.y <= BOX_Y + BOX_H) return toBox(t, b.id);
  };

  const again = () => {
    setGuess(null);
    setTested(false);
    setDim(0);
  };

  const counts: Record<Box, number> = { day: 0, night: 0, both: 0 };
  const sorted = THINGS.every((t) => where[t.id] !== 'shelf');

  return (
    <SceneSvg label="The sky by day and by night">
      <SkyView time={time} dim={T.day ? dim : 0} />
      {TIMES.map((x, i) => (
        <SvgButton key={x.name} x={40 + i * 142} y={456} w={132} h={52} fontSize={18} label={x.name} active={time === i} color={time === i ? C.yellow : C.card} onClick={() => pickTime(i)} />
      ))}
      <DimSlider value={T.day ? dim : 0} onChange={onDim} disabled={!T.day || !guess} />
      <MessageBox x={40} y={598} w={560} h={62} text={message} max={58} size={16} />

      {/* Predict → observe → explain: where are the stars in the day? */}
      {tested ? (
        <ExplainCard x={636} y={24} w={324} prediction={guess} actual={STILL} because="The stars are always in the sky. In the day, the Sun’s bright light hides them." onAgain={again} />
      ) : (
        <PredictCard x={636} y={24} w={324} question="In the day, where are the stars?" options={[STILL, GONE]} prediction={guess} onPredict={setGuess} />
      )}
      {!tested && guess && (
        <text x={798} y={166} textAnchor="middle" fontSize={15} fill={C.ink2}>
          {T.day ? 'Now slide “dim the Sun” all the way.' : 'Tap a daytime first.'}
        </text>
      )}

      {/* Sorting */}
      <text x={636} y={274} fontSize={15} fill={C.muted} className="caps">
        {sorted ? 'All sorted. Well done!' : 'When do we see it?'}
      </text>
      {BOXES.map((b) => (
        <g key={b.id} onClick={() => selected && toBox(THINGS.find((t) => t.id === selected)!, b.id)} style={{ cursor: selected ? 'pointer' : undefined }} data-nopan role="button" aria-label={`${b.name} box`}>
          <rect x={b.x} y={BOX_Y} width={BOX_W} height={BOX_H} rx={16} fill={shade(b.color, 0.75)} stroke={C.ink} strokeWidth={selected ? 3.5 : 2.5} />
          <text x={b.x + BOX_W / 2} y={BOX_Y + 26} textAnchor="middle" fontSize={19} fontWeight={700} fill={C.ink}>
            {b.name}
          </text>
        </g>
      ))}
      {THINGS.map((t, i) => {
        const w = where[t.id];
        const onShelf = w === 'shelf';
        let at: Pt;
        if (onShelf) at = { x: 688 + (i % 3) * 110, y: 304 + Math.floor(i / 3) * 76 };
        else {
          const b = BOXES.find((x) => x.id === w)!;
          at = { x: b.x + BOX_W / 2, y: BOX_Y + 72 + counts[w]++ * 64 };
        }
        return (
          <DragToken
            key={`${t.id}-${w}`}
            x={at.x}
            y={at.y}
            label={t.name}
            selected={selected === t.id}
            shakeKey={shake[t.id] ?? 0}
            disabled={!onShelf}
            onTap={() => {
              play('tap');
              setSelected(selected === t.id ? null : t.id);
              setMessage(`${t.short}: tap Day, Night or Both.`);
            }}
            onDrop={(p) => dropAt(t, p)}
          >
            <circle r={30} fill={selected === t.id ? shade(C.yellow, 0.5) : 'transparent'} stroke={selected === t.id ? C.ink : 'none'} strokeWidth={2} />
            <SceneEmoji emoji={t.emoji} x={0} y={-4} size={onShelf ? 40 : 34} />
            <text y={onShelf ? 32 : 28} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
              {t.short}
            </text>
          </DragToken>
        );
      })}

      {T.sun && <Callout at={[T.sun.x, T.sun.y - 40]} box={[60, 58]} w={190} icon={Sun} title="The Sun is a star!" />}
    </SceneSvg>
  );
}

/** Small day or night sky for question cards. */
function MiniSky({ night }: { night: boolean }) {
  return (
    <svg viewBox="0 0 160 110" role="img" aria-label={night ? 'night sky' : 'day sky'}>
      <rect x={4} y={4} width={152} height={102} rx={14} fill={night ? NIGHT_SKY : '#8fd0ff'} stroke={C.ink} strokeWidth={2} />
      {night ? (
        <g>
          <circle cx={110} cy={38} r={16} fill="#fdf6d8" />
          {[
            [30, 30],
            [55, 60],
            [80, 25],
            [135, 75],
            [40, 85],
          ].map(([x, y], i) => (
            <text key={i} x={x} y={y} fontSize={14} fill="#fff6c8" textAnchor="middle">
              ✦
            </text>
          ))}
        </g>
      ) : (
        <circle cx={80} cy={45} r={22} fill="#ffcf33" stroke={C.ink} strokeWidth={2} />
      )}
      <path d="M4,90 Q60,72 156,88 L156,102 Q156,106 150,106 L10,106 Q4,106 4,100 Z" fill={night ? '#1e4a3a' : C.green} />
    </svg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={8} width={54} height={64} rx={8} fill="#8fd0ff" stroke={C.ink} strokeWidth={2} />
      <circle cx={31} cy={34} r={12} fill="#ffcf33" stroke={C.ink} strokeWidth={1.5} />
      <rect x={62} y={8} width={54} height={64} rx={8} fill={NIGHT_SKY} stroke={C.ink} strokeWidth={2} />
      <circle cx={96} cy={30} r={9} fill="#fdf6d8" />
      <text x={76} y={52} fontSize={12} fill="#fff6c8">
        ✦
      </text>
      <text x={100} y={60} fontSize={10} fill="#fff6c8">
        ✦
      </text>
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    const night = Math.random() < 0.5;
    const choices = shuffle([
      { value: 'day', name: 'in the day', label: <MiniSky night={false} /> },
      { value: 'night', name: 'at night', label: <MiniSky night /> },
    ]);
    return night
      ? {
          prompt: 'When can we see lots of stars?',
          choices,
          answer: 'night',
          hint: 'Think about when the sky is dark.',
          explain: ['Stars are easy to see when the sky is dark.', 'The sky is dark at night.', 'So we see lots of stars at night.'],
        }
      : {
          prompt: 'When do we see the Sun?',
          choices,
          answer: 'day',
          hint: 'Think about when it is light outside.',
          explain: ['The Sun makes the sky bright.', 'It is bright in the day.', 'So we see the Sun in the day.'],
        };
  }
  if (level === 1) {
    const kind = pick(['star', 'where'] as const);
    if (kind === 'star') {
      return {
        prompt: 'Is the Sun a star?',
        visual: <EmojiPicture emoji="☀️" caption="the Sun" />,
        choices: [
          { value: 'yes', name: 'yes', label: 'Yes' },
          { value: 'no', name: 'no', label: 'No' },
        ],
        answer: 'yes',
        hint: 'Stars are giant balls of hot, glowing gas.',
        explain: ['Stars are huge, hot and glowing.', 'The Sun is the star closest to us. That’s why it looks so big.', 'So the answer is yes.'],
      };
    }
    return {
      prompt: 'Where are the stars in the daytime?',
      choices: shuffle([
        { value: 'there', name: 'still in the sky', label: 'Still in the sky' },
        { value: 'sleep', name: 'asleep', label: 'Asleep' },
        { value: 'fell', name: 'fallen down', label: 'Fallen down' },
      ]),
      answer: 'there',
      hint: 'Do the stars really go anywhere?',
      explain: ['The stars never go away.', 'In the day, sunlight makes the sky too bright to see them.', 'So they are still in the sky.'],
    };
  }
  const kind = pick(['moon', 'why', 'midday'] as const);
  if (kind === 'moon') {
    return {
      prompt: 'Can we ever see the Moon in the daytime?',
      visual: <EmojiPicture emoji="🌙" caption="the Moon" />,
      choices: [
        { value: 'sometimes', name: 'yes, sometimes', label: 'Yes, sometimes' },
        { value: 'never', name: 'no, never', label: 'No, never' },
      ],
      answer: 'sometimes',
      hint: 'Have you ever looked up in the morning and seen a pale Moon?',
      explain: ['The Moon is often up in the morning or afternoon.', 'It looks pale because the sky is bright.', 'So the answer is yes, sometimes.'],
    };
  }
  if (kind === 'why') {
    return {
      prompt: 'Why can’t we see stars in the day?',
      choices: shuffle([
        { value: 'bright', name: 'the Sun’s light is too bright', label: 'The Sun’s light is too bright' },
        { value: 'gone', name: 'stars go away', label: 'Stars go away' },
        { value: 'clouds', name: 'clouds hide all of them', label: 'Clouds hide all of them' },
      ]),
      answer: 'bright',
      hint: 'Think about the dim test: what happened when the Sun got dimmer?',
      explain: ['The stars are always in the sky.', 'Bright sunlight fills the sky and hides them.', 'So: the Sun’s light is too bright.'],
    };
  }
  return {
    prompt: 'The Sun seems to move across the sky. Where is it at midday?',
    choices: shuffle([
      { value: 'high', name: 'high in the sky', label: 'High in the sky' },
      { value: 'low', name: 'low, near the ground', label: 'Low, near the ground' },
      { value: 'gone', name: 'gone away', label: 'Gone away' },
    ]),
    answer: 'high',
    hint: 'Think about morning, midday and evening in the playground.',
    explain: ['In the morning the Sun is low.', 'It climbs higher until midday, then sinks lower in the evening.', 'So at midday it is high in the sky.'],
  };
}

export const dayAndNightSky: Lesson = {
  id: 'day-and-night-sky',
  title: 'Day Sky, Night Sky',
  Thumb,
  Scene: SkyScene,
  sceneHint: 'Tap a time of day · Guess, then dim the Sun to find the stars · Sort the sky things',
  learn: {
    heading: 'Day sky, night sky',
    intro: 'In the day we see the Sun. It seems to move across the sky from morning to evening. At night we see the Moon and stars. The Sun is a star too: the one closest to us!',
    points: [
      { icon: Sun, text: 'The Sun is a star. It makes daytime bright.' },
      { icon: Sparkles, text: 'Stars are always there. Daylight hides them.' },
      { icon: Moon, text: 'We see the Moon at night, and sometimes in the day.' },
    ],
  },
  steps: ['Tap Morning, Midday, Evening and Night.', 'Watch where the Sun is.', 'Guess where the stars go in the day, then dim the Sun to check.', 'Sort the sky things into Day, Night or Both.'],
  example: {
    question: 'Are the stars still there in the day?',
    visual: <MiniSky night />,
    work: ['The stars never go away.', 'The bright Sun hides them in the day.'],
    answer: 'Yes, the stars are still there.',
  },
  grownups: [
    'The Sun only seems to move: really the Earth is spinning. Older children explore that in “Day and Night”.',
    'Never look straight at the Sun, even with sunglasses.',
    'Look for the Moon in the morning or afternoon sky together. It’s up in the day quite often.',
    'On a clear night away from street lights, count how many stars you can see.',
  ],
  makeQuestion,
};
