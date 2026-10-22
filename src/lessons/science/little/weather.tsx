import { useEffect, useRef, useState } from 'react';
import { CalendarDays, CloudRain, Shirt } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { EMOJI_FONT } from '../../../games/reading/words';
import { EmojiPicture, SceneEmoji } from './visuals/Emoji';
import { DragToken, inside } from './visuals/DragToken';
import { MessageBox } from './visuals/MessageBox';
import './little.css';

type Weather = 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy';
const WEATHERS: { id: Weather; emoji: string; word: string }[] = [
  { id: 'sunny', emoji: '☀️', word: 'sunny' },
  { id: 'cloudy', emoji: '☁️', word: 'cloudy' },
  { id: 'rainy', emoji: '🌧️', word: 'rainy' },
  { id: 'windy', emoji: '💨', word: 'windy' },
  { id: 'snowy', emoji: '❄️', word: 'snowy' },
];
const weatherOf = (id: Weather) => WEATHERS.find((w) => w.id === id)!;

type ClothesId = 'sunhat' | 'sunglasses' | 'tshirt' | 'shorts' | 'coat' | 'scarf' | 'gloves' | 'boots' | 'umbrella';
interface Clothes {
  id: ClothesId;
  name: string;
  emoji: string;
  /** Where it is drawn on the child (one or two spots), and how big. */
  on: Pt[];
  size: number;
}
const KID_X = 690;
const CLOTHES: Clothes[] = [
  { id: 'sunhat', name: 'sun hat', emoji: '👒', on: [{ x: KID_X, y: 64 }], size: 74 },
  { id: 'sunglasses', name: 'sunglasses', emoji: '🕶️', on: [{ x: KID_X, y: 112 }], size: 50 },
  { id: 'tshirt', name: 'T-shirt', emoji: '👕', on: [{ x: KID_X, y: 222 }], size: 104 },
  { id: 'coat', name: 'coat', emoji: '🧥', on: [{ x: KID_X, y: 226 }], size: 120 },
  { id: 'scarf', name: 'scarf', emoji: '🧣', on: [{ x: KID_X, y: 168 }], size: 58 },
  { id: 'gloves', name: 'gloves', emoji: '🧤', on: [{ x: 606, y: 300 }, { x: 774, y: 300 }], size: 40 },
  { id: 'shorts', name: 'shorts', emoji: '🩳', on: [{ x: KID_X, y: 322 }], size: 70 },
  { id: 'boots', name: 'boots', emoji: '👢', on: [{ x: 666, y: 432 }, { x: 714, y: 432 }], size: 46 },
  { id: 'umbrella', name: 'umbrella', emoji: '☂️', on: [{ x: 806, y: 196 }], size: 112 },
];
const clothesOf = (id: ClothesId) => CLOTHES.find((c) => c.id === id)!;

/** What suits each weather, and what doesn't (with a friendly reason). */
const GOOD: Record<Weather, ClothesId[]> = {
  sunny: ['sunhat', 'sunglasses', 'tshirt', 'shorts'],
  cloudy: ['tshirt', 'coat'],
  rainy: ['umbrella', 'boots', 'coat'],
  windy: ['coat', 'scarf'],
  snowy: ['coat', 'scarf', 'gloves', 'boots'],
};
const BAD: Record<Weather, Partial<Record<ClothesId, string>>> = {
  sunny: { coat: 'too hot in the sun', scarf: 'too hot in the sun', gloves: 'too hot in the sun' },
  cloudy: {},
  rainy: { sunglasses: 'not needed when it rains' },
  windy: { umbrella: 'the wind can blow it inside out' },
  snowy: { shorts: 'too cold in the snow', sunhat: 'won’t keep your head warm' },
};

const SKY = { x: 40, y: 30, w: 440, h: 250 };
const KID = { x: 560, y: 24, w: 280, h: 440 };
const rackSpot = (i: number): Pt => ({ x: 590 + (i % 5) * 86, y: 556 + Math.floor(i / 5) * 72 });

interface Experiment {
  start: { weather: Weather; dark: boolean; puddle: number };
  question: string;
  options: string[];
  actual: string;
  after: { weather: Weather; dark: boolean; puddle: number };
  because: string;
}
const EXPERIMENTS: Experiment[] = [
  {
    start: { weather: 'cloudy', dark: true, puddle: 0 },
    question: 'Dark clouds! What comes next?',
    options: ['Rain', 'Sunshine'],
    actual: 'Rain',
    after: { weather: 'rainy', dark: true, puddle: 1 },
    because: 'Dark clouds are full of water drops, so rain often comes next.',
  },
  {
    start: { weather: 'rainy', dark: false, puddle: 1 },
    question: 'Sun is out! What do puddles do?',
    options: ['Dry up', 'Get bigger'],
    actual: 'Dry up',
    after: { weather: 'sunny', dark: false, puddle: 0 },
    because: 'The warm sun turns puddle water into vapour in the air.',
  },
  {
    start: { weather: 'cloudy', dark: false, puddle: 0 },
    question: 'Freezing cold clouds. What falls?',
    options: ['Snow', 'Rain'],
    actual: 'Snow',
    after: { weather: 'snowy', dark: false, puddle: 0 },
    because: 'In freezing cold, the cloud’s water freezes and falls as snow.',
  },
];

function Sky({ weather, dark, puddle }: { weather: Weather; dark: boolean; puddle: number }) {
  const sky = dark ? '#8796ab' : { sunny: '#bfe6ff', cloudy: '#d3dce7', rainy: '#a7b6c8', windy: '#cfe4f3', snowy: '#e4ebf3' }[weather];
  const cloud = dark ? '#7b8798' : weather === 'rainy' ? '#9aa6b5' : '#f4f7fb';
  const ground = weather === 'snowy' ? '#ffffff' : '#9fd27f';
  const { x, y, w, h } = SKY;
  return (
    <g>
      <defs>
        <clipPath id="sl-sky">
          <rect x={x} y={y} width={w} height={h} rx={20} />
        </clipPath>
      </defs>
      <g clipPath="url(#sl-sky)">
        <rect x={x} y={y} width={w} height={h} fill={sky} />
        {weather === 'sunny' && (
          <g transform={`translate(${x + 90} ${y + 70})`}>
            {Array.from({ length: 10 }, (_, i) => (
              <path key={i} d="M0,-52 V-40" stroke={C.orange} strokeWidth={6} strokeLinecap="round" transform={`rotate(${i * 36})`} />
            ))}
            <circle r={32} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
          </g>
        )}
        {weather !== 'sunny' &&
          [
            [x + 120, y + 70, 1],
            [x + 300, y + 60, 1.2],
          ].map(([cx, cy, k], i) => (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${k})`}>
              <path d="M-60,20 C-80,20 -80,-10 -56,-10 C-54,-36 -16,-40 -6,-20 C4,-44 48,-40 46,-12 C70,-14 76,20 52,20 Z" fill={cloud} stroke={C.ink} strokeWidth={2.5} />
            </g>
          ))}
        {weather === 'rainy' &&
          Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              className="sl-fall"
              style={{ animationDelay: `${(i % 5) * -0.18}s` }}
              d={`M${x + 60 + i * 24},${y + 100} l-6,18`}
              stroke={C.blue}
              strokeWidth={4}
              strokeLinecap="round"
            />
          ))}
        {weather === 'snowy' &&
          Array.from({ length: 14 }, (_, i) => (
            <text
              key={i}
              className="sl-fall-slow"
              style={{ animationDelay: `${(i % 6) * -0.45}s` }}
              x={x + 50 + i * 28}
              y={y + 104 + (i % 3) * 14}
              fontSize={20}
              fill={C.white}
              stroke={C.blue}
              strokeWidth={0.6}
            >
              ❄
            </text>
          ))}
        {weather === 'windy' &&
          [0, 1, 2].map((i) => (
            <path
              key={i}
              className="sl-blow"
              style={{ animationDelay: `${i * -0.45}s` }}
              d={`M${x + 70},${y + 70 + i * 44} q40,-18 80,0 t80,0`}
              fill="none"
              stroke={C.white}
              strokeWidth={6}
              strokeLinecap="round"
            />
          ))}
        {/* Ground, a tree, and puddles */}
        <rect x={x} y={y + h - 46} width={w} height={46} fill={ground} />
        <g transform={`translate(${x + w - 70} ${y + h - 46}) rotate(${weather === 'windy' ? 10 : 0})`}>
          <rect x={-7} y={-60} width={14} height={60} fill={C.brown} stroke={C.ink} strokeWidth={2} />
          <circle cx={0} cy={-80} r={34} fill={weather === 'snowy' ? '#eef3f7' : C.green} stroke={C.ink} strokeWidth={2.5} />
        </g>
        {puddle > 0.02 && (
          <ellipse cx={x + 170} cy={y + h - 22} rx={20 + 60 * puddle} ry={4 + 9 * puddle} fill="#7fb6e0" stroke={shade('#7fb6e0', -0.3)} strokeWidth={2} />
        )}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={20} fill="none" stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

function Kid() {
  const skin = '#f2c8a0';
  return (
    <g>
      {/* legs and feet */}
      <rect x={KID_X - 34} y={300} width={26} height={118} rx={12} fill={shade(C.blue, -0.1)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={KID_X + 8} y={300} width={26} height={118} rx={12} fill={shade(C.blue, -0.1)} stroke={C.ink} strokeWidth={2.5} />
      {/* arms */}
      <path d={`M${KID_X - 46},176 L${606},292`} stroke={skin} strokeWidth={20} strokeLinecap="round" />
      <path d={`M${KID_X + 46},176 L${774},292`} stroke={skin} strokeWidth={20} strokeLinecap="round" />
      {/* body */}
      <rect x={KID_X - 50} y={160} width={100} height={150} rx={22} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      {/* head */}
      <circle cx={KID_X} cy={108} r={46} fill={skin} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={KID_X - 15} cy={104} r={4} fill={C.ink} />
      <circle cx={KID_X + 15} cy={104} r={4} fill={C.ink} />
      <path d={`M${KID_X - 14},124 q14,12 28,0`} fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${KID_X - 46},96 C${KID_X - 40},54 ${KID_X + 40},54 ${KID_X + 46},96 C${KID_X + 20},78 ${KID_X - 20},78 ${KID_X - 46},96 Z`} fill="#6b4a2b" />
    </g>
  );
}

function WeatherScene() {
  const [weather, setWeather] = useState<Weather>(EXPERIMENTS[0].start.weather);
  const [dark, setDark] = useState(EXPERIMENTS[0].start.dark);
  const [puddle, setPuddle] = useState(EXPERIMENTS[0].start.puddle);
  const [wearing, setWearing] = useState<ClothesId[]>([]);
  const [drag, setDrag] = useState<{ id: ClothesId; p: Pt } | null>(null);
  const [chart, setChart] = useState<Weather[]>([]);
  // Predict → observe → explain
  const [exp, setExp] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [phase, setPhase] = useState<'predict' | 'waiting' | 'done'>('predict');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const choose = (w: Weather) => {
    setWeather(w);
    setDark(false);
    setPuddle(w === 'rainy' ? 1 : w === 'sunny' ? 0 : puddle);
    play('tap');
  };

  const waitAndSee = () => {
    const e = EXPERIMENTS[exp];
    setPhase('waiting');
    play('whoosh');
    const from = e.start.puddle;
    let k = 0;
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      k += 1;
      if (k === 4) {
        setWeather(e.after.weather);
        setDark(e.after.dark);
      }
      if (k >= 4) setPuddle(from + ((e.after.puddle - from) * (k - 4)) / 8);
      if (k >= 12) {
        window.clearInterval(timer.current);
        setPhase('done');
        play('correct');
      }
    }, 150);
  };

  const nextExperiment = () => {
    const n = (exp + 1) % EXPERIMENTS.length;
    const s = EXPERIMENTS[n].start;
    setExp(n);
    setGuess(null);
    setPhase('predict');
    setWeather(s.weather);
    setDark(s.dark);
    setPuddle(s.puddle);
  };

  const dropClothes = (id: ClothesId, p: Pt) => {
    if (inside(p, KID)) {
      if (!wearing.includes(id)) setWearing([...wearing, id]);
      play('pop');
    } else if (wearing.includes(id)) {
      setWearing(wearing.filter((w) => w !== id));
    }
  };

  // Is the outfit right for the weather?
  const bad = wearing.find((id) => BAD[weather][id]);
  const good = wearing.filter((id) => GOOD[weather].includes(id));
  const outfit = !wearing.length
    ? `It’s ${weatherOf(weather).word}. Dress the child for the weather!`
    : bad
      ? `Hmm, the ${clothesOf(bad).name}: ${BAD[weather][bad]}.`
      : good.length >= 2
        ? `Great outfit for ${weatherOf(weather).word} weather!`
        : `Good start! What else suits ${weatherOf(weather).word} weather?`;

  // Weather chart summary
  const tally = WEATHERS.map((w) => ({ w, n: chart.filter((c) => c === w.id).length })).sort((a, b) => b.n - a.n);
  const chartTitle =
    chart.length < 7
      ? 'Weather chart: tap the next day to add today’s weather'
      : tally[0].n > tally[1].n
        ? `Most days were ${tally[0].w.word}! Tap a day to start again.`
        : 'A mix of weather this week! Tap a day to start again.';

  const e = EXPERIMENTS[exp];
  const free = CLOTHES.filter((c) => !wearing.includes(c.id));

  return (
    <SceneSvg label="Weather watch: change the sky, dress the child, and keep a weather chart">
      <Sky weather={weather} dark={dark} puddle={puddle} />

      {/* Weather buttons */}
      {WEATHERS.map((w, i) => (
        <SvgButton key={w.id} x={SKY.x + i * 90} y={292} w={80} h={50} fontSize={32} label={w.emoji} title={w.word} onClick={() => choose(w.id)} active={weather === w.id && !dark} color={weather === w.id && !dark ? C.yellow : C.card} />
      ))}

      {/* Predict → observe → explain */}
      {phase === 'done' ? (
        <ExplainCard x={SKY.x} y={356} w={SKY.w} prediction={guess} actual={e.actual} because={e.because} onAgain={nextExperiment} />
      ) : (
        <>
          <PredictCard x={SKY.x} y={356} w={SKY.w} question={e.question} options={e.options} prediction={guess} onPredict={setGuess} />
          <SvgButton x={SKY.x} y={496} w={SKY.w} h={48} fontSize={18} label={phase === 'waiting' ? 'Watching…' : 'Wait and see ▶'} onClick={waitAndSee} disabled={!guess || phase === 'waiting'} color={C.teal} textColor={C.white} />
        </>
      )}

      {/* Weather chart */}
      <text x={SKY.x} y={574} fontSize={14} fontWeight={700} fill={C.ink2}>
        {chartTitle}
      </text>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
        const x = SKY.x + i * 63;
        const got = chart[i];
        const next = i === chart.length;
        return (
          <g
            key={d}
            role="button"
            aria-label={got ? `${d}: ${weatherOf(got).word}` : `${d}: add today’s weather`}
            style={{ cursor: next || chart.length === 7 ? 'pointer' : 'default' }}
            data-nopan
            onClick={() => {
              if (chart.length === 7) {
                setChart([]);
                play('tap');
              } else if (next) {
                setChart([...chart, weather]);
                play('pop');
              }
            }}
          >
            <rect x={x} y={584} width={57} height={66} rx={10} fill={next ? shade(C.yellow, 0.7) : C.card} stroke={C.ink} strokeWidth={next ? 2.5 : 1.5} strokeDasharray={next ? '5 4' : undefined} />
            <text x={x + 28.5} y={600} textAnchor="middle" fontSize={13} fill={C.muted}>
              {d}
            </text>
            {got ? (
              <text x={x + 28.5} y={630} textAnchor="middle" dominantBaseline="central" fontSize={32} fontFamily={EMOJI_FONT}>
                {weatherOf(got).emoji}
              </text>
            ) : (
              next && (
                <text x={x + 28.5} y={630} textAnchor="middle" dominantBaseline="central" fontSize={24} fill={C.muted}>
                  +
                </text>
              )
            )}
          </g>
        );
      })}

      {/* The child and their clothes */}
      <Kid />
      {/* Worn clothes, drawn in a sensible order (T-shirt under the coat). Drag off or tap to take off. */}
      {CLOTHES.filter((c) => wearing.includes(c.id)).map((c) =>
        c.on.map((p, j) => (
          <DragToken
            key={`${c.id}-${j}`}
            at={p}
            r={Math.max(30, c.size / 2)}
            label={`Take off the ${c.name}`}
            dragging={drag?.id === c.id}
            onMove={(q) => setDrag({ id: c.id, p: q })}
            onDrop={(q) => {
              setDrag(null);
              dropClothes(c.id, q);
            }}
            onTap={() => setWearing(wearing.filter((w) => w !== c.id))}
          >
            <SceneEmoji emoji={c.emoji} x={0} y={0} size={c.size} />
          </DragToken>
        )),
      )}
      <MessageBox x={540} y={470} w={420} h={56} text={outfit} max={50} size={16} />
      {free.map((c) => {
        const i = CLOTHES.indexOf(c);
        return (
          <DragToken
            key={c.id}
            at={rackSpot(i)}
            r={34}
            label={c.name}
            dragging={drag?.id === c.id}
            onMove={(q) => setDrag({ id: c.id, p: q })}
            onDrop={(q) => {
              setDrag(null);
              dropClothes(c.id, q);
            }}
          >
            <circle r={32} fill={C.card} stroke={C.line} strokeWidth={2} />
            <SceneEmoji emoji={c.emoji} x={0} y={0} size={42} />
          </DragToken>
        );
      })}
      {drag && (
        <g pointerEvents="none">
          <SceneEmoji emoji={clothesOf(drag.id).emoji} x={drag.p.x} y={drag.p.y} size={56} />
        </g>
      )}

      <Callout at={[SKY.x + 220, 140]} box={[300, 150]} icon={CloudRain} title="Look at the sky" text="Clouds can tell you what weather is coming." w={230} />
      <Callout at={[KID_X, 220]} box={[830, 120]} icon={Shirt} title="Dress for it" w={140} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={8} width={70} height={64} rx={10} fill="#a7b6c8" stroke={C.ink} strokeWidth={2} />
      <text x={41} y={36} textAnchor="middle" dominantBaseline="central" fontSize={30} fontFamily={EMOJI_FONT}>
        🌧️
      </text>
      <text x={98} y={42} textAnchor="middle" dominantBaseline="central" fontSize={30} fontFamily={EMOJI_FONT}>
        ☂️
      </text>
    </svg>
  );
}

const clothesChoice = (id: ClothesId) => ({ value: id, name: clothesOf(id).name, label: <EmojiPicture emoji={clothesOf(id).emoji} caption={clothesOf(id).name} /> });

/** One clearly right thing to wear, and two clearly wrong ones, per weather. */
const WEAR: Record<'sunny' | 'rainy' | 'snowy', { right: ClothesId[]; wrong: ClothesId[] }> = {
  sunny: { right: ['sunhat', 'sunglasses'], wrong: ['gloves', 'scarf', 'coat'] },
  rainy: { right: ['umbrella', 'boots'], wrong: ['sunglasses', 'sunhat'] },
  snowy: { right: ['gloves', 'scarf', 'coat'], wrong: ['shorts', 'sunhat', 'tshirt'] },
};

function makeQuestion(level: number): Question {
  if (level === 0) {
    const w = pick(WEATHERS);
    const options = shuffle([w, ...shuffle(WEATHERS.filter((o) => o.id !== w.id)).slice(0, 2)]);
    return {
      prompt: 'What is the weather like?',
      visual: <EmojiPicture emoji={w.emoji} />,
      choices: options.map((o) => ({ value: o.id, name: o.word, label: `${o.emoji} ${o.word[0].toUpperCase()}${o.word.slice(1)}` })),
      answer: w.id,
      hint: 'Look at the picture. Is there sun, cloud, rain, wind or snow?',
      explain: [`The picture shows ${w.emoji}.`, `That means it is ${w.word}.`, `So the weather is ${w.word}.`],
    };
  }
  if (level === 1) {
    const which = pick(['sunny', 'rainy', 'snowy'] as const);
    const right = pick(WEAR[which].right);
    const wrong = shuffle(WEAR[which].wrong).slice(0, 2);
    const reason = which === 'sunny' ? 'keeps the sun off you' : which === 'rainy' ? 'keeps you dry' : 'keeps you warm';
    return {
      prompt: `It is ${which}. What should you wear?`,
      visual: <EmojiPicture emoji={weatherOf(which).emoji} />,
      choices: shuffle([right, ...wrong]).map(clothesChoice),
      answer: right,
      hint: which === 'sunny' ? 'What keeps the bright sun off you?' : which === 'rainy' ? 'What keeps you dry?' : 'What keeps you warm?',
      explain: [`On a ${which} day you need something that ${reason}.`, `The ${clothesOf(right).name} ${reason}.`, `So wear the ${clothesOf(right).name}.`],
    };
  }
  const kind = pick(['clouds', 'puddle', 'chart', 'windy'] as const);
  if (kind === 'clouds') {
    return {
      prompt: 'Big dark clouds are coming. What might happen next?',
      visual: <EmojiPicture emoji="☁️" />,
      choices: shuffle([
        { value: 'rain', label: '🌧️ Rain', name: 'rain' },
        { value: 'rainbow', label: '🌈 A rainbow right away', name: 'a rainbow right away' },
        { value: 'hot', label: '🥵 A very hot sunny day', name: 'a very hot sunny day' },
      ]),
      answer: 'rain',
      hint: 'What are dark clouds full of?',
      explain: ['Dark clouds are full of water drops.', 'When the drops get heavy, they fall.', 'So rain might come next.'],
    };
  }
  if (kind === 'puddle') {
    return {
      prompt: 'The sun shines on a puddle all day. What happens to it?',
      visual: <EmojiPicture emoji="☀️" />,
      choices: shuffle([
        { value: 'dries', label: 'It dries up', name: 'it dries up' },
        { value: 'bigger', label: 'It gets bigger', name: 'it gets bigger' },
        { value: 'freezes', label: 'It freezes', name: 'it freezes' },
      ]),
      answer: 'dries',
      hint: 'What does the warm sun do to wet things?',
      explain: ['The sun warms the puddle.', 'The water goes up into the air as vapour.', 'So it dries up.'],
    };
  }
  if (kind === 'windy') {
    return {
      prompt: 'It is very windy. Which is NOT a good idea?',
      visual: <EmojiPicture emoji="💨" />,
      choices: shuffle([clothesChoice('umbrella'), clothesChoice('coat'), clothesChoice('scarf')]),
      answer: 'umbrella',
      hint: 'Which one could the wind grab and pull?',
      explain: ['A coat and a scarf keep you warm in the wind.', 'Strong wind can blow an umbrella inside out.', 'So the umbrella is not a good idea.'],
    };
  }
  const sunnyCount = pick([2, 3, 4]);
  const days: Weather[] = shuffle([
    ...Array.from({ length: sunnyCount }, () => 'sunny' as Weather),
    ...Array.from({ length: 5 - sunnyCount }, () => pick<Weather>(['rainy', 'cloudy', 'snowy'])),
  ]);
  const sunny = days.filter((d) => d === 'sunny').length;
  return {
    prompt: 'How many sunny days are on this chart?',
    visual: <EmojiPicture emoji={days.map((d) => weatherOf(d).emoji).join('')} />,
    choices: shuffle(['2', '3', '4']).map((v) => ({ value: v })),
    answer: String(sunny),
    hint: 'Touch each sun and count.',
    explain: ['Look for each ☀️ on the chart.', `Count them: ${Array.from({ length: sunny }, (_, i) => i + 1).join(', ')}.`, `There are ${sunny} sunny days.`],
  };
}

export const weather: Lesson = {
  id: 'weather',
  title: 'Weather Watch',
  Thumb,
  Scene: WeatherScene,
  sceneHint: 'Guess, then Wait and see · Change the sky · Dress the child · Fill in the chart',
  learn: {
    heading: 'Weather watch',
    intro: 'Weather is what the sky and air are doing: sunny, cloudy, rainy, windy or snowy. Looking at the sky helps us guess what comes next, and choose what to wear!',
    points: [
      { icon: CloudRain, text: 'Dark clouds often bring rain.' },
      { icon: Shirt, text: 'We dress for the weather.' },
      { icon: CalendarDays, text: 'A weather chart shows the weather each day.' },
    ],
  },
  steps: ['Look at the sky. Guess what comes next.', 'Press Wait and see. Were you right?', 'Dress the child for the weather.', 'Add today’s weather to the chart.'],
  example: {
    question: 'It is snowy. What should you wear?',
    visual: <EmojiPicture emoji="❄️" />,
    work: ['Snow means it is freezing cold.', 'A coat, scarf and gloves keep you warm.'],
    answer: 'Wear warm clothes: coat, scarf and gloves!',
  },
  grownups: [
    'Look out of the window together each morning: what’s the weather? What should we wear?',
    'Keep a real weather chart on the fridge for a week, then count the sunny and rainy days.',
    'Before going out, ask “what do you think the weather will do?” and check later.',
    'Talk about clouds: light and fluffy, or dark and heavy?',
  ],
  makeQuestion,
};
