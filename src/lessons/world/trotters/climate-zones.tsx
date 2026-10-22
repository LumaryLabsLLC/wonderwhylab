import { useState } from 'react';
import { Leaf, Snowflake, Sun, ThermometerSun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand } from '../../../lib/random';
import { clamp, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { wrap } from '../../../stage/Predict';
import { SceneSvg } from '../../../stage/widgets';
import { ClimateMap, lifeAt, ZONE, zoneAt, ZONES } from './visuals/climate';
import type { Zone } from './visuals/climate';
import { CONTINENT_NAME, continentOf, degLabel, geoProj } from './visuals/globe';
import { Caps, Emoji, mcq } from './visuals/kit';

const PR = geoProj(40, 34, 920, 84, -70);

/** A map pin whose point is at (x, y). */
function Pin({ x, y, color = C.red }: { x: number; y: number; color?: string }) {
  return (
    <g pointerEvents="none">
      <path d={`M${x},${y} C${x - 6},${y - 14} ${x - 17},${y - 22} ${x - 17},${y - 34} A17,17 0 1 1 ${x + 17},${y - 34} C${x + 17},${y - 22} ${x + 6},${y - 14} ${x},${y} Z`} fill={color} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={x} cy={y - 34} r={7} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
}

/** Sunlight hitting a round Earth: the same beam spreads out more nearer the poles. */
function SunPanel({ lat }: { lat: number }) {
  const x0 = 586;
  const y0 = 470;
  const cx = 902;
  const cy = 620;
  const R = 46;
  const shown = clamp(lat, -72, 72);
  const yp = cy - R * Math.sin((shown * Math.PI) / 180);
  const b = 8;
  const surfaceX = (y: number) => cx - Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
  const angle = (y: number) => Math.asin(clamp((cy - y) / R, -1, 1));
  const a1 = angle(yp - b);
  const a2 = angle(yp + b);
  const arc = Array.from({ length: 13 }, (_, i) => {
    const a = a2 + ((a1 - a2) * i) / 12;
    return `${(cx - R * Math.cos(a)).toFixed(1)},${(cy - R * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const spread = 1 / Math.cos((Math.abs(lat) * Math.PI) / 180);
  const text =
    spread < 1.2
      ? 'Near the equator, sunlight hits almost straight on, so its heat is concentrated.'
      : `At ${degLabel(lat, 'lat')}, the same sunlight covers ${spread > 4 ? 'over 4' : `about ${spread.toFixed(1)}`} times as much ground: cooler.`;
  return (
    <g>
      <rect x={x0} y={y0} width={384} height={198} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <Caps x={x0 + 16} y={y0 + 26}>
        Why is it hotter near the equator?
      </Caps>
      {wrap(text, 42).map((line, i) => (
        <text key={i} x={x0 + 16} y={y0 + 52 + i * 21} fontSize={16} fill={C.ink}>
          {line}
        </text>
      ))}
      <Emoji x={622} y={cy} size={40}>
        ☀️
      </Emoji>
      <circle cx={cx} cy={cy} r={R} fill={shade(C.blue, 0.4)} stroke={C.ink} strokeWidth={2} />
      <line x1={cx - R} x2={cx + R} y1={cy} y2={cy} stroke={C.ink} strokeWidth={1.2} strokeDasharray="4 4" />
      {[yp - b, yp, yp + b].map((y, i) => (
        <g key={i}>
          <line x1={652} x2={surfaceX(y) - 4} y1={y} y2={y} stroke={C.orange} strokeWidth={3} />
          <polygon points={`${surfaceX(y) - 2},${y} ${surfaceX(y) - 11},${y - 5} ${surfaceX(y) - 11},${y + 5}`} fill={C.orange} />
        </g>
      ))}
      <polyline points={arc} fill="none" stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      <polyline points={arc} fill="none" stroke={C.yellow} strokeWidth={6} strokeLinecap="round" />
    </g>
  );
}

function ClimateScene() {
  const [pin, setPin] = useState<[number, number]>([-62, -4]);
  const drag = useSvgDrag((p: Pt) => {
    const x = clamp(p.x, PR.X + 2, PR.X + PR.W - 2);
    const y = clamp(p.y, PR.Y + 2, PR.Y + PR.H - 2);
    setPin([PR.lon(x), PR.lat(y)]);
  });
  const [lon, lat] = pin;
  const zone = zoneAt(lon, lat);
  const land = continentOf(lon, lat);
  const life = lifeAt(lon, lat);
  const where = `${land ? CONTINENT_NAME[land] : 'Ocean'} · about ${degLabel(lat, 'lat')}`;

  return (
    <SceneSvg label={`A world map coloured by climate zone. The pin is in the ${ZONE[zone].name.toLowerCase()} zone.`}>
      <ClimateMap pr={PR}>
        <text x={PR.x(-150)} y={PR.y(0) - 8} fontSize={16} fontWeight={700} fill={C.ink}>
          Equator
        </text>
      </ClimateMap>
      <Pin x={PR.x(lon)} y={PR.y(lat)} />
      {/* The whole map is the handle: press anywhere to move the pin, then drag. */}
      <rect x={PR.X} y={PR.Y} width={PR.W} height={PR.H} fill="transparent" {...drag} aria-label="Move the pin around the map" role="slider" aria-valuetext={where} />

      {/* Legend */}
      {ZONES.map((z, i) => (
        <g key={z}>
          <rect x={[40, 140, 275, 360][i]} y={436} width={22} height={22} rx={5} fill={ZONE[z].color} stroke={C.ink} strokeWidth={1.5} />
          <text x={[70, 170, 305, 390][i]} y={453} fontSize={16} fontWeight={600} fill={C.ink}>
            {ZONE[z].name}
          </text>
        </g>
      ))}
      <line x1={500} x2={536} y1={447} y2={447} stroke={C.ink} strokeWidth={2} strokeDasharray="10 6" />
      <text x={544} y={453} fontSize={16} fill={C.ink}>Equator</text>
      <line x1={640} x2={676} y1={447} y2={447} stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="4 6" />
      <text x={684} y={453} fontSize={16} fill={C.ink}>Tropics (23.5° N and S)</text>

      {/* What it is like here */}
      <rect x={30} y={470} width={540} height={198} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <rect x={46} y={486} width={30} height={30} rx={8} fill={ZONE[zone].color} stroke={C.ink} strokeWidth={1.5} />
      <text x={88} y={510} fontSize={24} fontWeight={700} fill={C.ink}>
        {ZONE[zone].name} zone
      </text>
      <text x={554} y={510} textAnchor="end" fontSize={16} fill={C.muted}>
        {where}
      </text>
      {wrap(ZONE[zone].weather, 56).map((line, i) => (
        <text key={i} x={48} y={542 + i * 22} fontSize={17} fill={C.ink}>
          {line}
        </text>
      ))}
      {life.map(([emoji, name], i) => (
        <g key={name}>
          <Emoji x={98 + i * 128} y={612} size={36}>
            {emoji}
          </Emoji>
          <text x={98 + i * 128} y={652} textAnchor="middle" fontSize={15} fill={C.ink2}>
            {name}
          </text>
        </g>
      ))}

      <SunPanel lat={lat} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <defs>
        <clipPath id="wo-clim-thumb">
          <circle cx={60} cy={40} r={34} />
        </clipPath>
      </defs>
      <g clipPath="url(#wo-clim-thumb)">
        <rect x={20} y={0} width={80} height={14} fill={ZONE.polar.color} />
        <rect x={20} y={14} width={80} height={14} fill={ZONE.temperate.color} />
        <rect x={20} y={28} width={80} height={24} fill={ZONE.tropical.color} />
        <rect x={20} y={52} width={80} height={14} fill={ZONE.temperate.color} />
        <rect x={20} y={66} width={80} height={14} fill={ZONE.polar.color} />
        <ellipse cx={72} cy={22} rx={12} ry={6} fill={ZONE.dry.color} />
      </g>
      <circle cx={60} cy={40} r={34} fill="none" stroke={C.ink} strokeWidth={2} />
      <line x1={26} x2={94} y1={40} y2={40} stroke={C.ink} strokeDasharray="4 3" />
    </svg>
  );
}

/* ---------- Practice ---------- */

const ZONE_EMOJI: Record<Zone, string> = { polar: '🧊', temperate: '🍂', dry: '🏜️', tropical: '🌴' };
const zoneOpts = () => ZONES.map((z) => ({ value: ZONE[z].name, emoji: ZONE_EMOJI[z] }));

/** Real places, with the zone the map shows for them. */
const PLACES: { name: string; ll: [number, number] }[] = [
  { name: 'the Amazon rainforest', ll: [-62, -4] },
  { name: 'the Congo rainforest', ll: [22, 0] },
  { name: 'Borneo', ll: [114, 0] },
  { name: 'southern India', ll: [78, 12] },
  { name: 'the Sahara', ll: [8, 24] },
  { name: 'Arabia', ll: [45, 23] },
  { name: 'central Australia', ll: [133, -25] },
  { name: 'the Gobi', ll: [105, 43] },
  { name: 'the Kalahari', ll: [21, -24] },
  { name: 'France', ll: [2, 47] },
  { name: 'eastern China', ll: [115, 32] },
  { name: 'the eastern United States', ll: [-85, 38] },
  { name: 'the Pampas in Argentina', ll: [-62, -34] },
  { name: 'Greenland', ll: [-40, 72] },
  { name: 'northern Siberia', ll: [100, 70] },
  { name: 'Antarctica', ll: [75, -69] },
];

const MINI = geoProj(0, 0, 360, 84, -70);

function PinMap({ ll, label }: { ll: [number, number]; label: string }) {
  return (
    <svg viewBox={`-2 -2 ${MINI.W + 4} ${MINI.H + 4}`} role="img" aria-label={label}>
      <ClimateMap pr={MINI} lines={false}>
        <circle cx={MINI.x(ll[0])} cy={MINI.y(ll[1])} r={11} fill="none" stroke={C.ink} strokeWidth={5} />
        <circle cx={MINI.x(ll[0])} cy={MINI.y(ll[1])} r={11} fill="none" stroke={C.red} strokeWidth={3} />
      </ClimateMap>
    </svg>
  );
}

const LIVES: { prompt: string; emoji: string; zone: Zone; why: string }[] = [
  { prompt: 'Wild camels live in which climate zone?', emoji: '🐪', zone: 'dry', why: 'Camels can go a long time without water, which suits deserts.' },
  { prompt: 'Where do most wild cacti grow?', emoji: '🌵', zone: 'dry', why: 'Cacti store water in their thick stems, so they survive with very little rain.' },
  { prompt: 'Polar bears live in which climate zone?', emoji: '🐻‍❄️', zone: 'polar', why: 'Polar bears hunt seals on the sea ice around the Arctic.' },
  { prompt: 'Emperor penguins live in which climate zone?', emoji: '🐧', zone: 'polar', why: 'Emperor penguins live on the ice around Antarctica.' },
  { prompt: 'Sloths live in which climate zone?', emoji: '🦥', zone: 'tropical', why: 'Sloths live high in the trees of hot, rainy rainforests.' },
  { prompt: 'Orangutans live in which climate zone?', emoji: '🦧', zone: 'tropical', why: 'Orangutans live in the rainforests of Borneo and Sumatra, near the equator.' },
  { prompt: 'In which zone do many trees drop their leaves every autumn?', emoji: '🍂', zone: 'temperate', why: 'Trees drop their leaves to get through the cold winter.' },
];

const DESCRIBE: { prompt: string; zone: Zone; clue: string }[] = [
  { prompt: 'Which zone has very little rain all year?', zone: 'dry', clue: 'Deserts get very little rain.' },
  { prompt: 'Which zone has four seasons, with warm summers and cool winters?', zone: 'temperate', clue: 'Four seasons with mild weather is the temperate pattern.' },
  { prompt: 'Which zone is warm all year, and often very rainy?', zone: 'tropical', clue: 'Near the equator it is warm in every month.' },
  { prompt: 'Which zone has long, dark, freezing winters?', zone: 'polar', clue: 'Near the poles the Sun stays low or below the horizon in winter.' },
];

function makeQuestion(level: number): Question {
  const style = level === 0 ? rand(0, 1) : level === 1 ? rand(2, 4) : rand(5, 7);

  if (style === 0) {
    const equator = Math.random() < 0.5;
    const answer = equator ? 'Tropical' : 'Polar';
    return mcq({
      prompt: equator ? 'Which climate zone is around the equator?' : 'Which climate zone is around the North and South Poles?',
      answer,
      options: zoneOpts(),
      hint: equator ? 'Think of the hottest places, where it is warm all year.' : 'Think of the coldest, iciest places on Earth.',
      explain: equator
        ? ['The equator gets the most direct sunlight.', 'So places near it are warm all year.', 'That is the Tropical zone.']
        : ['The poles get the least direct sunlight.', 'So they are freezing for much of the year.', 'That is the Polar zone.'],
    });
  }
  if (style === 1) {
    const l = pick(LIVES);
    const answer = ZONE[l.zone].name;
    return mcq({
      prompt: l.prompt,
      answer,
      options: zoneOpts(),
      visual: (
        <svg viewBox="0 0 120 80" role="img" aria-label={l.prompt}>
          <Emoji x={60} y={40} size={54}>
            {l.emoji}
          </Emoji>
        </svg>
      ),
      hint: 'Think about what this living thing needs: lots of rain, very little rain, warmth or ice?',
      explain: [l.why, `So the answer is the ${answer} zone.`],
    });
  }
  if (style === 2) {
    const p = pick(PLACES);
    const answer = ZONE[zoneAt(p.ll[0], p.ll[1])].name;
    return mcq({
      prompt: `The circle marks ${p.name}. Which climate zone is it in?`,
      visual: <PinMap ll={p.ll} label={`A climate map with ${p.name} circled`} />,
      answer,
      options: zoneOpts(),
      hint: 'Match the colour inside the circle to the zone colours: white polar, light green temperate, sand dry, dark green tropical.',
      explain: [`The circle is at about ${degLabel(p.ll[1], 'lat')}.`, `The colour inside it matches ${answer} on the key.`, `So ${p.name} is in the ${answer} zone.`],
    });
  }
  if (style === 3) {
    const answer = 'Sunlight hits it more directly';
    return mcq({
      prompt: 'Why is it hotter near the equator than near the poles?',
      answer,
      options: [answer, 'It is closer to the Sun', 'The Sun shines longer there in summer', 'There is more land there'],
      hint: 'Think of a torch shining straight down on the floor, then shining at a slant.',
      explain: [
        'Earth is round, so sunlight hits the equator straight on but the poles at a slant.',
        'Slanted light spreads over more ground, so each patch gets less heat.',
        `That is why: ${answer}.`,
      ],
    });
  }
  if (style === 4) {
    const d = pick(DESCRIBE);
    const answer = ZONE[d.zone].name;
    return mcq({
      prompt: d.prompt,
      answer,
      options: zoneOpts(),
      hint: 'Picture the weather in each zone: icy, four seasons, desert, or hot and rainy.',
      explain: [d.clue, `This describes the ${answer} zone.`],
    });
  }
  if (style === 5) {
    // Latitude reasoning.
    const tropicalAsk = Math.random() < 0.5;
    if (tropicalAsk) {
      const v = pick([5, 10, 15, 20]) * pick([1, -1]);
      const answer = degLabel(v, 'lat');
      const wrong = [35, 45, 55, 70].map((a) => degLabel(a * pick([1, -1]), 'lat'));
      return mcq({
        prompt: 'Which of these latitudes is inside the tropical zone?',
        answer,
        options: [answer, ...wrong],
        hint: 'The tropics are the lines at about 23.5° north and south of the equator.',
        explain: ['The tropical zone lies between about 23.5° N and 23.5° S.', `${answer} is ${Math.abs(v)}° from the equator, which is less than 23.5°.`, `So ${answer} is tropical.`],
      });
    }
    const v = pick([70, 75, 80, 85]) * pick([1, -1]);
    const answer = degLabel(v, 'lat');
    const wrong = [0, 15, 30, 45, 55].map((a) => degLabel(a * pick([1, -1]), 'lat'));
    return mcq({
      prompt: 'Which of these latitudes is most likely to be in a polar zone?',
      answer,
      options: [answer, ...wrong.slice(0, 3)],
      hint: 'Polar zones are close to 90°, the poles.',
      explain: ['The poles are at 90° N and 90° S.', `${answer} is closest to a pole.`, `So ${answer} is the polar one.`],
    });
  }
  if (style === 6) {
    const bears = Math.random() < 0.5;
    const answer = bears ? 'Near the North Pole' : 'Mostly south of the equator';
    return mcq({
      prompt: bears ? 'Polar bears live in the wild…' : 'Wild penguins live…',
      answer,
      options: bears
        ? ['Near the North Pole', 'Near the South Pole', 'Near the equator']
        : ['Mostly south of the equator', 'Mostly north of the equator', 'All over the world equally'],
      hint: 'The Arctic is in the north and Antarctica is in the south. Which animal lives where?',
      explain: bears
        ? ['Polar bears live on and around the Arctic sea ice.', 'The Arctic surrounds the North Pole.', `So: ${answer}.`]
        : ['Penguins live in Antarctica and on southern coasts like South Africa, Australia and South America.', 'Almost all of these places are south of the equator.', `So: ${answer}.`],
    });
  }
  // Compare two places by latitude.
  const near = rand(0, 15);
  const far = rand(55, 75);
  const nearSide = pick(['N', 'S']);
  const farSide = pick(['N', 'S']);
  const towns = [
    { name: 'Town A', lat: nearSide === 'N' ? near : -near },
    { name: 'Town B', lat: farSide === 'N' ? far : -far },
  ];
  if (Math.random() < 0.5) towns.reverse();
  towns[0].name = 'Town A';
  towns[1].name = 'Town B';
  const hot = towns.find((t) => Math.abs(t.lat) === near)!;
  const cold = towns.find((t) => t !== hot)!;
  return mcq({
    prompt: `${towns[0].name} is at ${degLabel(towns[0].lat, 'lat')}. ${towns[1].name} is at ${degLabel(towns[1].lat, 'lat')}. Which gets more concentrated sunlight?`,
    answer: hot.name,
    options: ['Town A', 'Town B', 'They get the same'],
    ordered: true,
    hint: 'Which town is closer to the equator (0°)?',
    explain: [
      `${hot.name} is ${Math.abs(hot.lat)}° from the equator; ${cold.name} is ${Math.abs(cold.lat)}° away.`,
      'Closer to the equator, sunlight hits more directly and is less spread out.',
      `So ${hot.name} gets more concentrated sunlight.`,
    ],
  });
}

export const climateZones: Lesson = {
  id: 'climate-zones',
  title: 'Climate Zones',
  Thumb,
  Scene: ClimateScene,
  sceneHint: 'Drag the pin around the world to explore each climate zone',
  learn: {
    heading: 'Hot, cold, wet and dry',
    intro:
      'Weather is what the sky is doing today. Climate is the usual weather a place has, year after year. Places with similar climates make up climate zones, and each zone has its own plants and animals.',
    points: [
      { icon: Sun, text: 'Tropical: around the equator. Warm all year, often very rainy, with rainforests.' },
      { icon: ThermometerSun, text: 'Dry: deserts and dry grasslands with very little rain. Cacti, camels and lizards.' },
      { icon: Leaf, text: 'Temperate: between the tropics and the poles. Four seasons, warm summers and cool winters.' },
      { icon: Snowflake, text: 'Polar: near the poles. Freezing, icy and dark for months in winter.' },
    ],
  },
  steps: [
    'Find the equator: the warmest zone, the tropical zone, sits on both sides of it.',
    'Move towards a pole: it gets cooler, through the temperate zone into the polar zone.',
    'Look for sandy colours: those are the dry zones, where little rain falls.',
    'Ask why: near the equator sunlight hits straight on; near the poles the same sunlight is spread out.',
  ],
  example: {
    question: 'The Sahara is at about 24° N in Africa. Which climate zone is it in, and what might live there?',
    work: ['24° N is just outside the tropics, where the map shows a big sand-coloured area.', 'The Sahara gets very little rain all year.', 'Camels, lizards, scorpions and date palms (at oases) live there.'],
    answer: 'The dry zone.',
  },
  grownups: [
    'Climate zones are simplified here into four groups. Real maps (like the Köppen map) have many more, and mountains are colder than the land around them at the same latitude.',
    'Shine a torch straight down on paper, then tilt it: the slanted patch is bigger and dimmer. This is why the poles are colder.',
    'A common misconception is that the equator is hotter because it is closer to the Sun. The real reason is the angle of the sunlight.',
    'Compare the weather where you live with a place in another zone using an online weather site.',
  ],
  makeQuestion,
};
