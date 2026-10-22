import { useState } from 'react';
import { ArrowLeftRight, ArrowUpDown, Crosshair, MapPin } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { degLabel, geoProj, WorldMap } from '../trotters/visuals/globe';
import type { Proj } from '../trotters/visuals/globe';
import { mcq, Note } from '../trotters/visuals/kit';
import { CITIES } from './visuals/places';
import type { City } from './visuals/places';

const PR = geoProj(78, 52, 882, 80, -60);
const LAT_LINES = [60, 30, 0, -30];
const LON_LINES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const LAT_COL = C.blue;
const LON_COL = C.orange;

const both = (lat: number, lon: number) => `${degLabel(lat, 'lat')}, ${degLabel(lon, 'lon')}`;
const nearCity = (lat: number, lon: number, within = 3) =>
  CITIES.map((c) => ({ c, d: Math.hypot(c.lat - lat, c.lon - lon) })).sort((a, b) => a.d - b.d).find((x) => x.d <= within)?.c;

/** Grid lines and labels for a map. */
function Graticule({ pr, size = 15, labels = true, lonEvery = 30 }: { pr: Proj; size?: number; labels?: boolean; lonEvery?: number }) {
  return (
    <g pointerEvents="none">
      {LAT_LINES.map((lat) => (
        <line key={`la${lat}`} x1={pr.X} x2={pr.X + pr.W} y1={pr.y(lat)} y2={pr.y(lat)} stroke={lat === 0 ? C.red : C.ink} strokeOpacity={lat === 0 ? 0.9 : 0.25} strokeWidth={lat === 0 ? 3 : 1.2} />
      ))}
      {LON_LINES.map((lon) => (
        <line key={`lo${lon}`} x1={pr.x(lon)} x2={pr.x(lon)} y1={pr.Y} y2={pr.Y + pr.H} stroke={lon === 0 ? C.red : C.ink} strokeOpacity={lon === 0 ? 0.9 : 0.25} strokeWidth={lon === 0 ? 3 : 1.2} />
      ))}
      {labels &&
        LAT_LINES.map((lat) => (
          <text key={`tl${lat}`} x={pr.X - 6} y={pr.y(lat) + size * 0.35} textAnchor="end" fontSize={size} fontWeight={600} fill={C.ink2}>
            {degLabel(lat, 'lat')}
          </text>
        ))}
      {labels &&
        LON_LINES.filter((lon) => lon % lonEvery === 0).map((lon) => (
          <text key={`tn${lon}`} x={pr.x(lon)} y={pr.Y + pr.H + size + 4} textAnchor="middle" fontSize={size} fontWeight={600} fill={C.ink2}>
            {degLabel(lon, 'lon')}
          </text>
        ))}
    </g>
  );
}

function Pin({ x, y, color = C.red }: { x: number; y: number; color?: string }) {
  return (
    <g pointerEvents="none">
      <path d={`M${x},${y} C${x - 6},${y - 14} ${x - 16},${y - 22} ${x - 16},${y - 33} A16,16 0 1 1 ${x + 16},${y - 33} C${x + 16},${y - 22} ${x + 6},${y - 14} ${x},${y} Z`} fill={color} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={x} cy={y - 33} r={6} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
}

type Mode = 'explore' | 'find';

function LatLonScene() {
  const [pin, setPin] = useState<[number, number]>([30, 0]);
  const [mode, setMode] = useState<Mode>('explore');
  const [target, setTarget] = useState<City>(() => pick(CITIES));
  const [result, setResult] = useState<{ text: string; good: boolean } | null>(null);
  const drag = useSvgDrag((p) => {
    const x = clamp(p.x, PR.X, PR.X + PR.W);
    const y = clamp(p.y, PR.Y, PR.Y + PR.H);
    setPin([PR.lat(y), PR.lon(x)]);
    setResult(null);
  });
  const [lat, lon] = pin;
  const rLat = Math.round(lat);
  const rLon = Math.round(lon);
  const near = mode === 'explore' ? nearCity(lat, lon) : undefined;
  const px = PR.x(lon);
  const py = PR.y(lat);

  const check = () => {
    const dLat = Math.round(target.lat) - rLat;
    const dLon = Math.round(target.lon) - rLon;
    if (Math.abs(dLat) <= 4 && Math.abs(dLon) <= 4) {
      play('correct');
      setPin([target.lat, target.lon]);
      setResult({ good: true, text: `Found it: ${target.name}, at about ${both(target.lat, target.lon)}.` });
      return;
    }
    play('wrong');
    const parts: string[] = [];
    if (Math.abs(dLat) > 4) parts.push(`${Math.abs(dLat)}° further ${dLat > 0 ? 'north' : 'south'}`);
    if (Math.abs(dLon) > 4) parts.push(`${Math.abs(dLon)}° further ${dLon > 0 ? 'east' : 'west'}`);
    setResult({ good: false, text: `Not yet. Your pin is at ${both(lat, lon)}. Go about ${parts.join(' and ')}.` });
  };

  const newTarget = () => {
    setTarget((t) => pick(CITIES.filter((c) => c !== t)));
    setResult(null);
  };

  return (
    <SceneSvg label={`A world map with lines of latitude and longitude. The pin is at ${both(lat, lon)}.`}>
      <WorldMap pr={PR} id="wo-latlon" />
      <Graticule pr={PR} />
      <text x={PR.x(-178)} y={PR.y(0) - 8} fontSize={15} fontWeight={700} fill={C.red}>
        Equator 0°
      </text>
      <text x={PR.x(0) + 6} y={PR.y(76)} fontSize={15} fontWeight={700} fill={C.red}>
        Prime meridian 0°
      </text>
      {mode === 'explore' &&
        CITIES.map((c) => (
          <circle key={c.name} cx={PR.x(c.lon)} cy={PR.y(c.lat)} r={4.5} fill={near === c ? C.yellow : C.white} stroke={C.ink} strokeWidth={1.5} pointerEvents="none" />
        ))}

      {/* Lines through the pin */}
      <g pointerEvents="none">
        <line x1={PR.X} x2={PR.X + PR.W} y1={py} y2={py} stroke={LAT_COL} strokeWidth={2.5} strokeDasharray="8 5" />
        <line x1={px} x2={px} y1={PR.Y} y2={PR.Y + PR.H} stroke={LON_COL} strokeWidth={2.5} strokeDasharray="8 5" />
        <rect x={4} y={py - 13} width={70} height={26} rx={8} fill={LAT_COL} />
        <text x={39} y={py + 1} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.white}>
          {degLabel(lat, 'lat')}
        </text>
        <rect x={clamp(px - 38, PR.X - 30, PR.X + PR.W - 46)} y={PR.Y + PR.H + 2} width={76} height={26} rx={8} fill={LON_COL} />
        <text x={clamp(px, PR.X + 8, PR.X + PR.W - 8)} y={PR.Y + PR.H + 16} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={C.white}>
          {degLabel(lon, 'lon')}
        </text>
      </g>
      <Pin x={px} y={py} color={result?.good ? C.green : C.red} />
      <rect x={PR.X} y={PR.Y} width={PR.W} height={PR.H} fill="transparent" {...drag} role="slider" aria-label="Drag the pin around the map" aria-valuetext={both(lat, lon)} />

      {/* Readout */}
      <rect x={30} y={440} width={540} height={228} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <text x={50} y={478} fontSize={16} fill={C.muted} className="caps">
        The pin is at about
      </text>
      <text x={50} y={520} fontSize={34} fontWeight={700} fill={C.ink}>
        <tspan fill={LAT_COL}>{degLabel(lat, 'lat')}</tspan>, <tspan fill={LON_COL}>{degLabel(lon, 'lon')}</tspan>
      </text>
      {near && (
        <text x={550} y={520} textAnchor="end" fontSize={20} fontWeight={700} fill={C.ink}>
          near {near.name}
        </text>
      )}
      <text x={50} y={556} fontSize={17} fill={C.ink}>
        <tspan fill={LAT_COL} fontWeight={700}>Latitude:</tspan>{' '}
        {rLat === 0 ? 'on the equator' : `${Math.abs(rLat)}° ${rLat > 0 ? 'north' : 'south'} of the equator`}
      </text>
      <text x={50} y={584} fontSize={17} fill={C.ink}>
        <tspan fill={LON_COL} fontWeight={700}>Longitude:</tspan>{' '}
        {rLon === 0 ? 'on the prime meridian' : `${Math.abs(rLon)}° ${rLon > 0 ? 'east' : 'west'} of the prime meridian`}
      </text>
      {result ? (
        <Note x={40} y={598} w={520} text={result.text} tone={result.good ? 'good' : 'nudge'} />
      ) : (
        <g>
          <text x={50} y={622} fontSize={16} fill={C.ink2}>
            Latitude lines run east–west and go up to 90° N or S.
          </text>
          <text x={50} y={646} fontSize={16} fill={C.ink2}>
            Longitude lines run pole to pole and go up to 180° E or W.
          </text>
        </g>
      )}

      {/* Panel */}
      {(['explore', 'find'] as Mode[]).map((m, i) => (
        <SvgButton
          key={m}
          x={[590, 724][i]}
          y={440}
          w={[124, 160][i]}
          h={50}
          fontSize={18}
          label={m === 'explore' ? 'Explore' : 'Find a city'}
          active={mode === m}
          color={mode === m ? C.yellow : C.card}
          onClick={() => {
            setMode(m);
            setResult(null);
            if (m === 'find') newTarget();
          }}
        />
      ))}
      {mode === 'explore' ? (
        <Note x={590} y={508} w={380} text="Drag the pin. The blue line shows its latitude, the orange line its longitude. Dots are cities." />
      ) : (
        <g>
          <Note x={590} y={508} w={380} text={`Find the city at about ${both(target.lat, target.lon)}. Put the pin there, then check.`} />
          <SvgButton x={590} y={604} w={140} h={52} fontSize={18} label="Check" color={C.teal} textColor={C.white} onClick={check} disabled={!!result?.good} />
          <SvgButton x={744} y={604} w={150} h={52} fontSize={18} label="New city" onClick={newTarget} />
        </g>
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={8} width={100} height={64} rx={6} fill={shade(C.blue, 0.55)} stroke={C.ink} strokeWidth={2} />
      {[24, 40, 56].map((y) => (
        <line key={y} x1={10} x2={110} y1={y} y2={y} stroke={y === 40 ? C.red : C.ink} strokeOpacity={y === 40 ? 1 : 0.35} strokeWidth={y === 40 ? 2 : 1} />
      ))}
      {[35, 60, 85].map((x) => (
        <line key={x} x1={x} x2={x} y1={8} y2={72} stroke={x === 60 ? C.red : C.ink} strokeOpacity={x === 60 ? 1 : 0.35} strokeWidth={x === 60 ? 2 : 1} />
      ))}
      <circle cx={85} cy={24} r={6} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

/* ---------- Practice ---------- */

const MINI = geoProj(60, 6, 360, 80, -60);

function GridPic({ dot, label }: { dot?: [number, number]; label: string }) {
  return (
    <svg viewBox={`0 0 ${MINI.X + MINI.W + 10} ${MINI.Y + MINI.H + 28}`} role="img" aria-label={label}>
      <WorldMap pr={MINI} id={`wo-ll-mini-${dot ? `${dot[0]}_${dot[1]}` : 'x'}`} stroke={0.7} />
      <Graticule pr={MINI} size={15} lonEvery={60} />
      {dot && (
        <g>
          <circle cx={MINI.x(dot[1])} cy={MINI.y(dot[0])} r={8} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} />
        </g>
      )}
    </svg>
  );
}

function makeQuestion(level: number): Question {
  const style = level === 0 ? rand(0, 1) : level === 1 ? rand(2, 3) : rand(4, 7);

  if (style === 0) {
    const q = pick([
      { prompt: 'Which line is at 0° latitude?', answer: 'The equator', wrong: ['The prime meridian', 'The North Pole', 'The Tropic of Cancer'], why: 'Latitude is measured north and south from the equator, so the equator is 0°.' },
      { prompt: 'Which line is at 0° longitude?', answer: 'The prime meridian', wrong: ['The equator', 'The South Pole', 'The Arctic Circle'], why: 'Longitude is measured east and west from the prime meridian, which passes through Greenwich in London.' },
      { prompt: 'Lines of latitude run…', answer: 'East to west, around the Earth', wrong: ['From pole to pole', 'Only through Europe', 'In circles around the poles only'], why: 'Latitude lines are like rungs of a ladder, running east to west.' },
      { prompt: 'Lines of longitude run…', answer: 'From the North Pole to the South Pole', wrong: ['East to west, around the Earth', 'Only along the equator', 'Around the Arctic only'], why: 'Longitude lines are like segments of an orange, meeting at both poles.' },
    ]);
    return mcq({ prompt: q.prompt, answer: q.answer, options: [q.answer, ...q.wrong], hint: 'Latitude goes up and down the globe; longitude goes around it.', explain: [q.why, `So the answer is: ${q.answer}.`] });
  }
  if (style === 1) {
    const latAsk = Math.random() < 0.5;
    const v = rand(1, 8) * 10 * pick([1, -1]);
    const label = degLabel(v, latAsk ? 'lat' : 'lon');
    const answer = latAsk ? (v > 0 ? 'North of the equator' : 'South of the equator') : v > 0 ? 'East of the prime meridian' : 'West of the prime meridian';
    const options = latAsk ? ['North of the equator', 'South of the equator', 'On the equator'] : ['East of the prime meridian', 'West of the prime meridian', 'On the prime meridian'];
    return mcq({
      prompt: `Where is a place at ${label}?`,
      answer,
      options,
      ordered: true,
      hint: 'Look at the letter after the number: N, S, E or W.',
      explain: [`${label} has the letter ${label.slice(-1)}.`, `${label.slice(-1)} means ${answer.split(' ')[0].toLowerCase()}, so the place is ${answer.toLowerCase()}.`],
    });
  }
  if (style === 2) {
    const lat = pick([60, 30, -30]);
    const lon = pick(LON_LINES.filter((l) => l !== 0));
    const answer = both(lat, lon);
    // Common slips: wrong hemisphere, or the two numbers swapped.
    const options = [answer, both(-lat, lon), both(lat, -lon), Math.abs(lon) <= 90 ? `${degLabel(lon, 'lat')}, ${degLabel(lat, 'lon')}` : both(-lat, -lon)];
    return mcq({
      prompt: 'What are the coordinates of the yellow dot?',
      visual: <GridPic dot={[lat, lon]} label="A world map with latitude and longitude lines and a yellow dot" />,
      answer,
      options,
      hint: 'Read across to the side for latitude first, then down to the bottom for longitude.',
      explain: [`Across at the side, the dot’s line is ${degLabel(lat, 'lat')}.`, `Down at the bottom, its line is ${degLabel(lon, 'lon')}.`, `Latitude first: ${answer}.`],
    });
  }
  if (style === 3) {
    const c = pick(CITIES);
    const wrong = shuffle(CITIES.filter((o) => Math.hypot(o.lat - c.lat, o.lon - c.lon) > 25)).slice(0, 3);
    return mcq({
      prompt: `Which city is at about ${both(c.lat, c.lon)}?`,
      visual: <GridPic label="A world map with latitude and longitude lines" />,
      answer: c.name,
      options: [c, ...wrong].map((o) => o.name),
      hint: 'Find the latitude at the side and the longitude along the bottom, and see where they cross.',
      explain: [
        `${degLabel(c.lat, 'lat')} is ${c.lat > 0 ? 'north' : 'south'} of the equator; ${degLabel(c.lon, 'lon')} is ${c.lon > 0 ? 'east' : 'west'} of the prime meridian.`,
        `Where they cross is ${c.name}.`,
      ],
    });
  }
  if (style === 4) {
    // Degrees between two latitudes (number pad).
    const a = rand(1, 7) * 10 * pick([1, -1]);
    let b = rand(1, 7) * 10 * pick([1, -1]);
    if (b === a) b = -a;
    const answer = Math.abs(a - b);
    const across = Math.sign(a) !== Math.sign(b);
    return {
      prompt: `How many degrees of latitude are there from ${degLabel(a, 'lat')} to ${degLabel(b, 'lat')}?`,
      answer: String(answer),
      hint: across ? 'One is north and one is south, so count to the equator from each and add.' : 'Both are on the same side of the equator, so subtract.',
      explain: across
        ? [`${degLabel(a, 'lat')} is ${Math.abs(a)}° from the equator; ${degLabel(b, 'lat')} is ${Math.abs(b)}° from it.`, `They are on opposite sides, so add: ${Math.abs(a)} + ${Math.abs(b)} = ${answer}.`, `${answer}° of latitude.`]
        : [`Both are ${a > 0 ? 'north' : 'south'} of the equator.`, `Subtract: ${Math.max(Math.abs(a), Math.abs(b))} − ${Math.min(Math.abs(a), Math.abs(b))} = ${answer}.`, `${answer}° of latitude.`],
    };
  }
  if (style === 5) {
    const lat = rand(1, 5) * 10 * pick([1, -1]);
    const lon = rand(1, 12) * 10 * pick([1, -1]);
    const moveLat = Math.random() < 0.5;
    const step = rand(2, 4) * 10;
    let toLat = lat;
    let toLon = lon;
    if (moveLat) toLat = clamp(lat + step * pick([1, -1]), -80, 80);
    else toLon = clamp(lon + step * pick([1, -1]), -170, 170);
    const dir = moveLat ? (toLat > lat ? 'North' : 'South') : toLon > lon ? 'East' : 'West';
    return mcq({
      prompt: `A ship sails from ${both(lat, lon)} to ${both(toLat, toLon)}. Which way did it sail?`,
      answer: dir,
      options: ['North', 'South', 'East', 'West'],
      ordered: true,
      hint: 'Which number changed: latitude (north–south) or longitude (east–west)? Did it go up or down?',
      explain: moveLat
        ? ['The longitude stayed the same; the latitude changed.', `${degLabel(lat, 'lat')} → ${degLabel(toLat, 'lat')} moves ${dir.toLowerCase()}wards.`, `The ship sailed ${dir}.`]
        : ['The latitude stayed the same; the longitude changed.', `${degLabel(lon, 'lon')} → ${degLabel(toLon, 'lon')} moves ${dir.toLowerCase()}wards.`, `The ship sailed ${dir}.`],
    });
  }
  if (style === 6) {
    const four = shuffle(CITIES).slice(0, 4);
    const lats = four.map((c) => Math.round(Math.abs(c.lat)));
    if (new Set(lats).size < 4) return makeQuestion(level);
    const best = four.reduce((a, b) => (Math.abs(b.lat) < Math.abs(a.lat) ? b : a));
    return mcq({
      prompt: 'Which city is closest to the equator?',
      answer: best.name,
      options: four.map((c) => ({ value: c.name, name: `${c.name} (${degLabel(c.lat, 'lat')})` })),
      ordered: true,
      hint: 'The equator is 0°. Ignore N and S and look for the smallest number.',
      explain: [`Their distances from the equator are ${four.map((c) => `${Math.round(Math.abs(c.lat))}°`).join(', ')}.`, `The smallest is ${Math.round(Math.abs(best.lat))}°.`, `So ${best.name} is closest.`],
    });
  }
  const c = pick(CITIES.filter((x) => Math.abs(x.lon) > 3 && Math.abs(x.lat) > 3));
  const ns = c.lat > 0 ? 'Northern' : 'Southern';
  const ew = c.lon > 0 ? 'Eastern' : 'Western';
  const answer = `${ns} and ${ew}`;
  return mcq({
    prompt: `${c.name} is at about ${both(c.lat, c.lon)}. Which hemispheres is it in?`,
    answer,
    options: ['Northern and Eastern', 'Northern and Western', 'Southern and Eastern', 'Southern and Western'],
    ordered: true,
    hint: 'N or S tells you the half above or below the equator; E or W tells you the half either side of the prime meridian.',
    explain: [`${degLabel(c.lat, 'lat')} means the ${ns} Hemisphere.`, `${degLabel(c.lon, 'lon')} means the ${ew} Hemisphere.`, `So: ${answer}.`],
  });
}

export const latitudeLongitude: Lesson = {
  id: 'latitude-longitude',
  title: 'Latitude and Longitude',
  Thumb,
  Scene: LatLonScene,
  sceneHint: 'Drag the pin to read its coordinates, or find a city from them',
  learn: {
    heading: 'An address for every place on Earth',
    intro:
      'Mapmakers cover the Earth with an imaginary grid. Two numbers, latitude and longitude, pinpoint any place, from your town to a ship in the middle of the ocean.',
    points: [
      { icon: ArrowUpDown, text: 'Latitude says how far north or south of the equator: from 0° at the equator to 90° at each pole.' },
      { icon: ArrowLeftRight, text: 'Longitude says how far east or west of the prime meridian: from 0° to 180°.' },
      { icon: Crosshair, text: 'Write latitude first, then longitude: Tokyo is at about 36° N, 140° E.' },
      { icon: MapPin, text: 'The equator splits Earth into Northern and Southern Hemispheres; the prime meridian splits it into Eastern and Western.' },
    ],
  },
  steps: [
    'Find the latitude: go up (N) or down (S) from the equator.',
    'Find the longitude: go right (E) or left (W) from the prime meridian.',
    'Where the two lines cross is the place.',
    'Always give latitude first, with N or S, then longitude, with E or W.',
  ],
  example: {
    question: 'Which city is at about 34° S, 151° E?',
    work: ['34° S is 34° south of the equator, in the Southern Hemisphere.', '151° E is far east of the prime meridian.', 'That point is on the south-east coast of Australia.'],
    answer: 'Sydney.',
  },
  grownups: [
    'Real coordinates are more precise: degrees are split into 60 minutes. Here they are rounded to whole degrees.',
    'Find your home on an online map: most will show its latitude and longitude, often as decimals with a minus sign for S and W.',
    'The prime meridian passes through the Royal Observatory in Greenwich, London, chosen by international agreement in 1884.',
    'Lines of longitude get closer together towards the poles on a globe; flat maps like this one stretch them apart.',
  ],
  makeQuestion,
};
