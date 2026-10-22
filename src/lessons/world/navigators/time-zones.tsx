import { useState } from 'react';
import { Clock, Globe2, RotateCw, Sunrise } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { geoProj, WorldMap } from '../trotters/visuals/globe';
import type { Proj } from '../trotters/visuals/globe';
import { Emoji, mcq, Note } from '../trotters/visuals/kit';
import { city, CITIES } from './visuals/places';
import type { City } from './visuals/places';

const PR = geoProj(20, 72, 960, 72, -56);
const SHOWN = ['Los Angeles', 'New York', 'Rio de Janeiro', 'London', 'Cairo', 'Dubai', 'Tokyo', 'Sydney'].map(city);
const ZONED = CITIES.filter((c) => c.utc !== undefined) as (City & { utc: number })[];

const mod24 = (h: number) => ((h % 24) + 24) % 24;
const hhmm = (h: number) => `${String(mod24(h)).padStart(2, '0')}:00`;
const utcLabel = (o: number) => (o === 0 ? 'UTC+0' : `UTC${o > 0 ? '+' : '−'}${Math.abs(o)}`);
const signed = (n: number) => (n === 0 ? '0 h' : `${n > 0 ? '+' : '−'}${Math.abs(n)} h`);
const wrapLon = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;

/** Night-time band (local sun time 18:00–06:00) for this UTC hour, as longitude ranges. */
function nightRanges(utc: number): [number, number][] {
  const mid = wrapLon(-utc * 15);
  const a = mid - 90;
  const b = mid + 90;
  if (a < -180) return [[a + 360, 180], [-180, b]];
  if (b > 180) return [[a, 180], [-180, b - 360]];
  return [[a, b]];
}

function ZoneBands({ pr, labels = true }: { pr: Proj; labels?: boolean }) {
  return (
    <g pointerEvents="none">
      {Array.from({ length: 25 }, (_, i) => i - 12).map((o) => {
        const l = Math.max(-180, o * 15 - 7.5);
        const r = Math.min(180, o * 15 + 7.5);
        return <rect key={o} x={pr.x(l)} y={pr.Y} width={pr.x(r) - pr.x(l)} height={pr.H} fill={o % 2 === 0 ? C.white : C.ink} opacity={o % 2 === 0 ? 0.16 : 0.06} />;
      })}
      {labels &&
        Array.from({ length: 25 }, (_, i) => i - 12).map((o) => (
          <line key={`l${o}`} x1={pr.x(o * 15 + 7.5)} x2={pr.x(o * 15 + 7.5)} y1={pr.Y} y2={pr.Y + pr.H} stroke={C.ink} strokeOpacity={0.18} strokeWidth={1} />
        ))}
    </g>
  );
}

function TimeScene() {
  const [utc, setUtc] = useState(9);
  const [home, setHome] = useState<City & { utc: number }>(() => city('London') as City & { utc: number });
  const homeTime = mod24(utc + home.utc);
  const SL = { x: 60, w: 460, y: 626 };
  const slide = useSvgDrag((p) => {
    const h = clamp(Math.round(((p.x - SL.x) / SL.w) * 23), 0, 23);
    setUtc(mod24(h - home.utc));
  });
  const setHomeTime = (h: number) => {
    play('tap');
    setUtc(mod24(h - home.utc));
  };
  const noonLon = wrapLon((12 - utc) * 15);
  const midnightLon = wrapLon(-utc * 15);

  return (
    <SceneSvg label={`A world time-zone strip. It is ${hhmm(homeTime)} in ${home.name}.`}>
      <WorldMap pr={PR} id="wo-tz">
        <ZoneBands pr={PR} />
        {nightRanges(utc).map(([a, b], i) => (
          <rect key={i} x={PR.x(a)} y={PR.Y} width={PR.x(b) - PR.x(a)} height={PR.H} fill={C.ink} opacity={0.32} pointerEvents="none" />
        ))}
      </WorldMap>
      {/* Sun over the place where it is noon, moon where it is midnight */}
      <Emoji x={PR.x(noonLon)} y={46} size={32}>
        ☀️
      </Emoji>
      <text x={PR.x(noonLon)} y={22} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
        noon
      </text>
      <Emoji x={PR.x(midnightLon)} y={46} size={28}>
        🌙
      </Emoji>
      <text x={PR.x(midnightLon)} y={22} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
        midnight
      </text>
      {/* Zone numbers */}
      {Array.from({ length: 23 }, (_, i) => i - 11).map((o) => (
        <text key={o} x={PR.x(o * 15)} y={PR.Y + PR.H + 18} textAnchor="middle" fontSize={15} fontWeight={o === home.utc ? 800 : 600} fill={o === home.utc ? C.red : C.ink2}>
          {o > 0 ? `+${o}` : o === 0 ? '0' : `−${-o}`}
        </text>
      ))}
      {/* City dots */}
      {SHOWN.map((c, i) => (
        <g key={c.name} pointerEvents="none">
          <circle cx={PR.x(c.lon)} cy={PR.y(c.lat)} r={c === home ? 8 : 6} fill={c === home ? C.red : C.yellow} stroke={C.ink} strokeWidth={2} />
          <text x={PR.x(c.lon) + (i === 4 ? -10 : 10)} y={PR.y(c.lat) + (c.lat < 0 ? 22 : -10)} textAnchor={i === 4 ? 'end' : 'start'} fontSize={15} fontWeight={700} fill={C.ink} stroke={C.white} strokeWidth={3} paintOrder="stroke">
            {c.name}
          </text>
        </g>
      ))}

      {/* City clocks */}
      {SHOWN.map((c, i) => {
        const t = utc + (c.utc ?? 0);
        const dayShift = Math.floor(t / 24) - Math.floor((utc + home.utc) / 24);
        const diff = (c.utc ?? 0) - home.utc;
        const x = 20 + i * 121;
        const isHome = c === home;
        return (
          <g
            key={c.name}
            role="button"
            aria-label={`${c.name}: ${hhmm(t)}. Tap to set as home.`}
            style={{ cursor: 'pointer' }}
            data-nopan
            onClick={() => {
              play('tap');
              setHome(c as City & { utc: number });
            }}
          >
            <rect x={x} y={440} width={114} height={106} rx={14} fill={isHome ? shade(C.yellow, 0.55) : C.white} stroke={C.ink} strokeWidth={isHome ? 3 : 2} />
            <text x={x + 57} y={462} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
              {c.name === 'Rio de Janeiro' ? 'Rio' : c.name}
            </text>
            <text x={x + 57} y={492} textAnchor="middle" fontSize={26} fontWeight={800} fill={C.ink} className="num">
              {hhmm(t)}
            </text>
            <text x={x + 57} y={516} textAnchor="middle" fontSize={15} fill={C.ink2}>
              {isHome ? 'home' : signed(diff)}
            </text>
            {dayShift !== 0 && (
              <text x={x + 57} y={536} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.red}>
                {dayShift > 0 ? 'tomorrow' : 'yesterday'}
              </text>
            )}
          </g>
        );
      })}

      {/* Time slider for the home city */}
      <text x={SL.x} y={578} fontSize={22} fontWeight={700} fill={C.ink}>
        Time in {home.name} ({utcLabel(home.utc)}): {hhmm(homeTime)}
      </text>
      <line x1={SL.x} x2={SL.x + SL.w} y1={SL.y} y2={SL.y} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      {Array.from({ length: 24 }, (_, h) => (
        <line key={h} x1={SL.x + (h / 23) * SL.w} x2={SL.x + (h / 23) * SL.w} y1={SL.y - (h % 6 === 0 ? 10 : 5)} y2={SL.y + (h % 6 === 0 ? 10 : 5)} stroke={C.ink} strokeWidth={2} />
      ))}
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={SL.x + (h / 23) * SL.w} y={SL.y + 30} textAnchor="middle" fontSize={15} fill={C.ink2}>
          {hhmm(h)}
        </text>
      ))}
      <circle cx={SL.x + (homeTime / 23) * SL.w} cy={SL.y} r={20} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} pointerEvents="none" />
      <rect x={SL.x - 24} y={SL.y - 28} width={SL.w + 48} height={56} fill="transparent" {...slide} role="slider" aria-label={`Time in ${home.name}`} aria-valuetext={hhmm(homeTime)} />
      <SvgButton x={548} y={600} w={56} h={50} fontSize={24} label="−" title="One hour earlier" onClick={() => setHomeTime(homeTime - 1)} />
      <SvgButton x={612} y={600} w={56} h={50} fontSize={24} label="+" title="One hour later" onClick={() => setHomeTime(homeTime + 1)} color={C.yellow} />

      <Note x={690} y={552} w={296} size={15} text="Earth turns 360° in 24 hours: 15° every hour. Places further east see the Sun first, so their clocks are ahead." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={10} width={108} height={50} rx={6} fill={shade(C.blue, 0.55)} stroke={C.ink} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={6 + i * 18} y={10} width={18} height={50} fill={i % 2 ? C.ink : C.white} opacity={i % 2 ? 0.08 : 0.2} />
      ))}
      <rect x={60} y={10} width={54} height={50} fill={C.ink} opacity={0.3} />
      <circle cx={33} cy={8} r={6} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
      <text x={30} y={74} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>09:00</text>
      <text x={90} y={74} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>18:00</text>
    </svg>
  );
}

/* ---------- Practice ---------- */

const MINI = geoProj(0, 22, 360, 72, -56);

function StripPic({ a, b, label }: { a: City; b: City; label: string }) {
  return (
    <svg viewBox={`-2 0 ${MINI.W + 4} ${MINI.Y + MINI.H + 4}`} role="img" aria-label={label}>
      <WorldMap pr={MINI} id={`wo-tz-${a.name}-${b.name}`.replace(/[^a-zA-Z-]/g, '')} stroke={0.6}>
        <ZoneBands pr={MINI} labels={false} />
      </WorldMap>
      {[a, b].map((c) => (
        <g key={c.name}>
          <circle cx={MINI.x(c.lon)} cy={MINI.y(c.lat)} r={6} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
          <text x={clamp(MINI.x(c.lon), 30, MINI.W - 30)} y={16} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
            {utcLabel(c.utc ?? 0)}
          </text>
          <line x1={MINI.x(c.lon)} x2={MINI.x(c.lon)} y1={MINI.Y} y2={MINI.y(c.lat) - 6} stroke={C.ink} strokeWidth={1.2} strokeDasharray="3 3" />
        </g>
      ))}
    </svg>
  );
}

/** Two cities whose zones are at least `minGap` hours apart; `opposite`: one ahead of UTC, one behind. */
function pair(minGap: number, opposite = false) {
  for (;;) {
    const [a, b] = shuffle(ZONED).slice(0, 2);
    if (Math.abs(a.utc - b.utc) >= minGap && (!opposite || a.utc * b.utc < 0)) return [a, b];
  }
}

/** −5 with a proper minus sign. */
const num = (n: number) => (n < 0 ? `−${-n}` : `${n}`);

function makeQuestion(level: number): Question {
  const style = level === 0 ? rand(0, 1) : level === 1 ? rand(2, 3) : rand(4, 6);

  if (style === 0) {
    return {
      prompt: 'Earth turns all the way round (360°) in 24 hours. How many degrees does it turn in 1 hour?',
      answer: '15',
      hint: 'Share 360 degrees equally between 24 hours.',
      explain: ['One full turn is 360°.', 'It takes 24 hours.', '360 ÷ 24 = 15, so 15° each hour.'],
    };
  }
  if (style === 1) {
    const [a, b] = pair(2);
    const east = a.utc > b.utc ? a : b;
    const west = east === a ? b : a;
    const askEast = Math.random() < 0.5;
    const answer = askEast ? 'Ahead' : 'Behind';
    return mcq({
      prompt: askEast
        ? `${east.name} is east of ${west.name}. Are ${east.name}’s clocks ahead of or behind ${west.name}’s?`
        : `${west.name} is west of ${east.name}. Are ${west.name}’s clocks ahead of or behind ${east.name}’s?`,
      answer,
      options: ['Ahead', 'Behind'],
      ordered: true,
      hint: 'Earth spins towards the east. Who sees the sunrise first?',
      explain: [
        'Earth spins towards the east, so places further east see the Sun rise first.',
        askEast ? `${east.name} reaches each time of day first, so its clocks are ahead.` : `${west.name} reaches each time of day later, so its clocks are behind.`,
        `Answer: ${answer}.`,
      ],
    });
  }
  if (style === 2) {
    const [a, b] = pair(1);
    const h = rand(6, 14);
    const t = h + (b.utc - a.utc);
    if (t < 0 || t > 23) return makeQuestion(level);
    const answer = hhmm(t);
    const diff = b.utc - a.utc;
    return mcq({
      prompt: `It is ${hhmm(h)} in ${a.name} (${utcLabel(a.utc)}). What time is it in ${b.name} (${utcLabel(b.utc)})?`,
      visual: <StripPic a={a} b={b} label={`A time-zone strip with ${a.name} and ${b.name}`} />,
      answer,
      options: [answer, hhmm(h - diff), hhmm(t + 1), hhmm(t - 1)],
      hint: 'Find the difference between the two UTC numbers. Is the second city further east (ahead) or west (behind)?',
      explain: [
        `${b.name} is ${utcLabel(b.utc)} and ${a.name} is ${utcLabel(a.utc)}: a difference of ${Math.abs(diff)} hour${Math.abs(diff) === 1 ? '' : 's'}.`,
        diff > 0 ? `${b.name} is further east, so add: ${h} + ${diff} = ${t}.` : `${b.name} is further west, so subtract: ${h} − ${-diff} = ${t}.`,
        `It is ${answer} in ${b.name}.`,
      ],
    });
  }
  if (style === 3) {
    const [a, b] = pair(2);
    const east = a.utc > b.utc ? a : b;
    const west = east === a ? b : a;
    const answer = east.utc - west.utc;
    return {
      prompt: `How many hours ahead of ${west.name} (${utcLabel(west.utc)}) is ${east.name} (${utcLabel(east.utc)})?`,
      visual: <StripPic a={west} b={east} label={`A time-zone strip with ${west.name} and ${east.name}`} />,
      answer: String(answer),
      hint: 'Count the zones from one city to the other, or subtract the UTC numbers.',
      explain: [`Subtract the zone numbers: ${num(east.utc)} − (${num(west.utc)}).`, `${num(east.utc)} − (${num(west.utc)}) = ${answer}.`, `${east.name} is ${answer} hours ahead.`],
    };
  }
  if (style === 4) {
    // Crossing midnight.
    const [a, b] = pair(7);
    const from = a.utc < b.utc ? a : b;
    const to = from === a ? b : a;
    const diff = to.utc - from.utc;
    const h = rand(24 - diff + 1, 23);
    const t = h + diff;
    const answer = `${hhmm(t)} the next day`;
    return mcq({
      prompt: `It is ${hhmm(h)} on Monday in ${from.name} (${utcLabel(from.utc)}). What time is it in ${to.name} (${utcLabel(to.utc)})?`,
      answer,
      options: [answer, `${hhmm(t)} the same day`, `${hhmm(h - diff)} the same day`, `${hhmm(t + 1)} the next day`],
      hint: `${to.name} is ahead. Add the hours, and watch out for going past midnight.`,
      explain: [`${to.name} is ${diff} hours ahead of ${from.name}.`, `${h} + ${diff} = ${t}, which is past 24:00, so take away 24: ${t - 24}.`, `It is ${answer} (Tuesday) in ${to.name}.`],
    });
  }
  if (style === 5) {
    const hours = rand(2, 10);
    const deg = hours * 15;
    return {
      prompt: `Two places are ${deg}° of longitude apart. About how many hours apart are their clocks?`,
      answer: String(hours),
      hint: 'Earth turns 15° each hour. How many 15s fit into the gap?',
      explain: ['Each hour, Earth turns 15°.', `${deg} ÷ 15 = ${hours}.`, `So about ${hours} hours apart.`],
    };
  }
  const [a, b] = pair(12, true);
  const east = a.utc > b.utc ? a : b;
  const west = east === a ? b : a;
  const answer = east.utc - west.utc;
  return {
    prompt: `${east.name} is ${utcLabel(east.utc)} and ${west.name} is ${utcLabel(west.utc)}. How many hours apart are their clocks?`,
    answer: String(answer),
    hint: 'One is ahead of UTC and one is behind. Count from each to 0 and add.',
    explain: [`${west.name} is ${Math.abs(west.utc)} hours behind UTC; ${east.name} is ${east.utc} hours ahead.`, `${Math.abs(west.utc)} + ${east.utc} = ${answer}.`, `They are ${answer} hours apart.`],
  };
}

export const timeZones: Lesson = {
  id: 'time-zones',
  title: 'Time Zones',
  Thumb,
  Scene: TimeScene,
  sceneHint: 'Slide the time and tap a city to make it home',
  learn: {
    heading: 'Why it is not the same time everywhere',
    intro:
      'As Earth spins, the Sun rises over different places at different times. So the world is split into time zones: when it is lunchtime in London, it is evening in Tokyo and early morning in New York.',
    points: [
      { icon: RotateCw, text: 'Earth turns 360° in 24 hours: 15° every hour. So each time zone is about 15° wide.' },
      { icon: Sunrise, text: 'Earth spins towards the east. Places further east see the Sun first, so their clocks are ahead.' },
      { icon: Globe2, text: 'Zones are counted from UTC, the time at 0° longitude. Tokyo is UTC+9: 9 hours ahead.' },
      { icon: Clock, text: 'To find another city’s time, add the difference if it is east, or subtract if it is west.' },
    ],
  },
  steps: [
    'Find both cities’ zones, for example London UTC+0 and Dubai UTC+4.',
    'Work out the difference: 4 − 0 = 4 hours.',
    'East is ahead, so add; west is behind, so subtract.',
    'Check for midnight: if you pass 24:00, it is the next day.',
  ],
  example: {
    question: 'It is 20:00 in New York (UTC−5). What time is it in Tokyo (UTC+9)?',
    work: ['Difference: 9 − (−5) = 14 hours.', 'Tokyo is east, so add: 20 + 14 = 34.', '34 is past 24:00, so subtract 24: 10:00 the next day.'],
    answer: '10:00 the next morning in Tokyo.',
  },
  grownups: [
    'Times here are standard time. Many places move their clocks forward an hour in summer, which changes the gaps for part of the year.',
    'Real time zones zig-zag along borders, and a few use half hours (India is UTC+5:30). China uses one zone for the whole country.',
    'Call or message a friend or relative in another country and work out together what time it is for them first.',
    'The International Date Line, roughly along 180°, is where the date changes.',
  ],
  makeQuestion,
};
