import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, GitMerge, Mountain, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { CONTINENT_NAME, geoProj, WorldMap } from './visuals/globe';
import type { ContinentId, Proj } from './visuals/globe';
import { Caps, Draggable, Emoji, mcq, Note } from './visuals/kit';

/* ---------- The river basin (plan view, north up) ---------- */

/** Catmull-Rom spline through the points, as a dense list of points. */
function spline(pts: Pt[], steps = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const P = (x: number, y: number): Pt => ({ x, y });
const line = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

const SOURCE = P(160, 98);
const TRIB_SOURCE = P(480, 95);
const CONFLUENCE = P(330, 310);
const MOUTH = P(535, 530);
/** Unit vector pointing out to sea from the mouth. */
const OUT = { x: 0.75, y: 0.66 };
const rot = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return P(MOUTH.x + r * (Math.cos(a) * OUT.x - Math.sin(a) * OUT.y), MOUTH.y + r * (Math.sin(a) * OUT.x + Math.cos(a) * OUT.y));
};
const DELTA_R = 80;
const APEX = P(505, 505);

const MAIN = spline([SOURCE, P(185, 140), P(220, 180), P(255, 228), P(292, 272), CONFLUENCE, P(350, 345), P(335, 380), P(355, 410), P(400, 405), P(420, 430), P(400, 460), P(425, 488), P(465, 482), APEX, MOUTH, rot(0, DELTA_R / 2), rot(0, DELTA_R)]);
const TRIB = spline([TRIB_SOURCE, P(465, 150), P(440, 200), P(405, 245), P(370, 285), CONFLUENCE]);
const DISTRIBUTARIES = [spline([APEX, P(515, 545), rot(50, DELTA_R)]), spline([APEX, P(560, 505), rot(-50, DELTA_R)])];

const nearestIndex = (pts: Pt[], p: Pt) => pts.reduce((best, q, i) => (Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(pts[best].x - p.x, pts[best].y - p.y) ? i : best), 0);
const I_CONF = nearestIndex(MAIN, CONFLUENCE);
const I_MEANDER = nearestIndex(MAIN, P(350, 345));
const I_MOUTH = nearestIndex(MAIN, MOUTH);

/** Height above sea level in metres: the land rises away from the coast towards the mountains. */
function height(p: Pt) {
  const d = (p.x - 650) * -0.749 + (p.y - 400) * -0.663;
  return d <= 0 ? 0 : Math.round(((d / 600) ** 2 * 2000) / 10) * 10;
}

const SEA_POLY = [P(650, 400), P(650, 660), P(420, 660)];
const DELTA_POLY = Array.from({ length: 19 }, (_, i) => rot(-90 + i * 10, DELTA_R));
const inSea = (p: Pt) => {
  const side = (p.x - 650) * -0.749 + (p.y - 400) * -0.663 < 0;
  const inDelta = Math.hypot(p.x - MOUTH.x, p.y - MOUTH.y) < DELTA_R && (p.x - MOUTH.x) * OUT.x + (p.y - MOUTH.y) * OUT.y > 0;
  return side && !inDelta;
};

const PEAKS: [number, number, number][] = [
  [80, 92, 62], [135, 70, 70], [205, 88, 58], [262, 70, 52], [95, 165, 54], [315, 118, 44], [60, 240, 48],
];
const HILLS: [number, number][] = [
  [440, 70], [530, 120], [560, 220], [210, 300], [130, 330],
];

/** River drawn wider downstream, like a real river collecting more water. */
function RiverLines({ highlight }: { highlight?: boolean }) {
  const water = shade(C.blue, 0.1);
  const parts = [
    { pts: MAIN.slice(0, I_CONF + 1), w: 6 },
    { pts: MAIN.slice(I_CONF, I_MOUTH + 1), w: 11 },
    { pts: MAIN.slice(I_MOUTH), w: 9 },
  ];
  return (
    <g pointerEvents="none" opacity={highlight ? 0.55 : 1}>
      {DISTRIBUTARIES.map((d, i) => (
        <polyline key={i} points={line(d)} fill="none" stroke={water} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <polyline points={line(TRIB)} fill="none" stroke={water} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      {parts.map((p, i) => (
        <polyline key={i} points={line(p.pts)} fill="none" stroke={water} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
}

/** The whole landscape, drawn in scene coordinates inside (20, 20)–(650, 660). */
function Basin({ labels = true }: { labels?: boolean }) {
  return (
    <g>
      <rect x={20} y={20} width={630} height={640} rx={16} fill="#cfe8b4" />
      {/* Hills and mountains: high ground in the north-west */}
      <path d="M20,36 Q20,20 36,20 L420,20 C380,120 330,190 250,250 C180,300 100,330 20,360 Z" fill="#dccf9f" opacity={0.85} />
      <path d="M20,36 Q20,20 36,20 L300,20 C270,90 220,140 150,190 C100,220 60,240 20,260 Z" fill="#c9b48a" />
      {HILLS.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={46} ry={22} fill="#bcd99a" stroke={shade('#bcd99a', -0.2)} strokeWidth={1.5} />
      ))}
      {PEAKS.map(([x, y, s], i) => (
        <g key={i}>
          <polygon points={`${x - s * 0.62},${y + s * 0.42} ${x},${y - s * 0.55} ${x + s * 0.62},${y + s * 0.42}`} fill="#9c8a6c" stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
          <polygon points={`${x - s * 0.2},${y - s * 0.24} ${x},${y - s * 0.55} ${x + s * 0.2},${y - s * 0.24} ${x + s * 0.06},${y - s * 0.18} ${x - s * 0.06},${y - s * 0.2}`} fill={C.white} />
        </g>
      ))}
      {/* Sea and delta */}
      <polygon points={line(SEA_POLY)} fill={shade(C.blue, 0.5)} />
      <polygon points={line(DELTA_POLY)} fill="#e5d9a6" stroke={shade('#e5d9a6', -0.25)} strokeWidth={1.5} />
      <RiverLines />
      {/* Springs */}
      <circle cx={SOURCE.x} cy={SOURCE.y} r={7} fill={shade(C.blue, 0.1)} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={TRIB_SOURCE.x} cy={TRIB_SOURCE.y} r={6} fill={shade(C.blue, 0.1)} stroke={C.ink} strokeWidth={1.5} />
      {labels && (
        <g pointerEvents="none" fontSize={16} fill={C.ink2} fontWeight={600}>
          <text x={36} y={300}>Mountains</text>
          <text x={520} y={262}>Hills</text>
          <text x={120} y={520}>Flat plain</text>
          <text x={565} y={640}>Sea</text>
        </g>
      )}
      <rect x={20} y={20} width={630} height={640} rx={16} fill="none" stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

/* ---------- Famous rivers ---------- */

interface River {
  name: string;
  continent: ContinentId;
  flows: string;
  into: string;
  fact: string;
  path: [number, number][];
}

const RIVERS: River[] = [
  {
    name: 'Nile',
    continent: 'africa',
    flows: 'north',
    into: 'the Mediterranean Sea',
    fact: 'At about 6,650 km, the Nile and the Amazon are the two longest rivers in the world.',
    path: [[29.5, -2.5], [31, -1], [32.9, 0.4], [32.5, 3.5], [31.6, 9.5], [32.5, 15.6], [33.9, 18], [31.6, 21.5], [32.9, 24], [31.2, 30], [31, 31.3]],
  },
  {
    name: 'Amazon',
    continent: 'southAmerica',
    flows: 'east',
    into: 'the Atlantic Ocean',
    fact: 'The Amazon carries more water than any other river: about a fifth of all the river water that reaches the oceans.',
    path: [[-72.5, -15], [-73.5, -10], [-74, -6], [-73.3, -4], [-70, -3.8], [-65, -3.3], [-60, -3.1], [-55, -2.2], [-52, -1.5], [-50, -0.4]],
  },
  {
    name: 'Mississippi',
    continent: 'northAmerica',
    flows: 'south',
    into: 'the sea through a big delta',
    fact: 'Together with the Missouri, its biggest tributary, it is the longest river system in North America.',
    path: [[-95.2, 47.2], [-93.2, 45], [-91.2, 43.5], [-90.6, 41.5], [-91.4, 40], [-90.2, 38.6], [-89.2, 37], [-90, 35.1], [-91.1, 33], [-91, 31], [-91.2, 30.4], [-90, 29.9], [-89.3, 29.2]],
  },
  {
    name: 'Danube',
    continent: 'europe',
    flows: 'east',
    into: 'the Black Sea',
    fact: 'The Danube flows through 10 countries, more than any other river in the world.',
    path: [[8.2, 48], [10, 48.4], [12.1, 49], [13.5, 48.6], [16.4, 48.2], [19, 47.7], [18.9, 46], [20.5, 44.8], [22.5, 44.6], [25, 43.7], [27.6, 44.1], [28, 45.3], [29.6, 45.2]],
  },
  {
    name: 'Ganges',
    continent: 'asia',
    flows: 'east',
    into: 'the Bay of Bengal',
    fact: 'Together with the Brahmaputra, it builds the largest delta in the world.',
    path: [[79, 31], [78.2, 29.9], [80, 27.5], [82.9, 25.3], [85.1, 25.6], [87.8, 25], [88.5, 24], [89.5, 22.8], [90.3, 22.2]],
  },
  {
    name: 'Yangtze',
    continent: 'asia',
    flows: 'east',
    into: 'the East China Sea',
    fact: 'At about 6,300 km, the Yangtze is the longest river in Asia.',
    path: [[91, 33.5], [95, 33], [98.7, 32], [99.7, 27.5], [102, 26], [104.5, 28.8], [106.5, 29.5], [109.5, 31], [111.3, 30.7], [114.3, 30.6], [117, 30.5], [118.8, 32], [121.5, 31.4]],
  },
];

function RiverOnMap({ r, pr, on, width = 3 }: { r: River; pr: Proj; on: boolean; width?: number }) {
  const pts = r.path.map(([lo, la]) => P(pr.x(lo), pr.y(la)));
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const a = Math.atan2(end.y - prev.y, end.x - prev.x);
  const s = width * 2.6;
  const head = [P(end.x + Math.cos(a) * s, end.y + Math.sin(a) * s), P(end.x + Math.cos(a + 2.4) * s, end.y + Math.sin(a + 2.4) * s), P(end.x + Math.cos(a - 2.4) * s, end.y + Math.sin(a - 2.4) * s)];
  const col = on ? C.orange : shade(C.blue, -0.25);
  return (
    <g pointerEvents="none">
      {on && <polyline points={line(pts)} fill="none" stroke={C.ink} strokeWidth={width + 3} strokeLinecap="round" strokeLinejoin="round" />}
      <polyline points={line(pts)} fill="none" stroke={col} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={line(head)} fill={col} stroke={on ? C.ink : 'none'} strokeWidth={1} />
      <circle cx={pts[0].x} cy={pts[0].y} r={width * 0.9} fill={C.white} stroke={col} strokeWidth={width * 0.6} />
    </g>
  );
}

const WORLD = geoProj(20, 88, 960, 66, -46, -130, 150);

/* ---------- Scene ---------- */

type Mode = 'drop' | 'name' | 'world';

const PARTS = [
  { word: 'Source', at: SOURCE, clue: 'The source is where a river begins, often a spring high in the hills or mountains.' },
  { word: 'Tributary', at: P(436, 203), clue: 'A tributary is a smaller river that flows into a bigger one.' },
  { word: 'Meander', at: P(412, 432), clue: 'A meander is a big loop the river makes on flat land.' },
  { word: 'Mouth', at: rot(0, DELTA_R), clue: 'The mouth is where the river flows into the sea.' },
  { word: 'Delta', at: rot(55, 55), clue: 'A delta is fan-shaped land built from mud and sand at the river’s end.' },
];

interface Trip {
  pts: Pt[];
  dist: number[];
  events: { at: number; text: string }[];
  start: number;
}

function buildTrip(p: Pt): Trip | null {
  const h = height(p);
  const all = [...MAIN.map((q, i) => ({ q, main: true, i })), ...TRIB.map((q, i) => ({ q, main: false, i }))];
  const lower = all.filter(({ q }) => height(q) <= h + 5);
  const pool = lower.length ? lower : all;
  const best = pool.reduce((a, b) => (Math.hypot(b.q.x - p.x, b.q.y - p.y) < Math.hypot(a.q.x - p.x, a.q.y - p.y) ? b : a));
  const route: Pt[] = [p];
  const events: { idx: number; text: string }[] = [{ idx: 0, text: `Rain lands at about ${h.toLocaleString('en')} m and trickles downhill into a stream.` }];
  if (!best.main) {
    route.push(...TRIB.slice(best.i));
    events.push({ idx: 1, text: 'It flows down a tributary, a smaller river.' });
    events.push({ idx: route.length - 1, text: 'Confluence: the tributary joins the main river.' });
    route.push(...MAIN.slice(I_CONF + 1));
  } else {
    if (best.i === 0) events.push({ idx: 1, text: 'This is the source, where the river begins.' });
    route.push(...MAIN.slice(best.i));
  }
  const offset = route.length - (MAIN.length - 1 - I_MEANDER) - 1;
  const mouthIdx = route.length - (MAIN.length - 1 - I_MOUTH) - 1;
  if (best.main ? best.i <= I_MEANDER : true) events.push({ idx: offset, text: 'On flat land it slows down and swings into big loops called meanders.' });
  events.push({ idx: mouthIdx, text: 'Mouth: the river reaches the sea.' });
  events.push({ idx: route.length - 1, text: 'Here the river drops its mud and sand. Over many years this built the delta.' });
  const dist = [0];
  for (let i = 1; i < route.length; i++) dist.push(dist[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y));
  return { pts: route, dist, events: events.map((e) => ({ at: dist[Math.max(0, Math.min(e.idx, dist.length - 1))], text: e.text })), start: h };
}

function RiverScene() {
  const [mode, setMode] = useState<Mode>('drop');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [gone, setGone] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [nudge, setNudge] = useState<{ text: string; good: boolean } | null>(null);
  const [river, setRiver] = useState<River | null>(null);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => () => cancelAnimationFrame(frame.current ?? 0), []);

  const startTrip = (p: Pt) => {
    cancelAnimationFrame(frame.current ?? 0);
    if (p.x < 20 || p.x > 650 || p.y < 20 || p.y > 660) return;
    if (inSea(p)) {
      setTrip(null);
      setMsg('That is the sea already! Drop the raindrop on the land.');
      play('wrong');
      return;
    }
    const t = buildTrip(p);
    if (!t) return;
    setMsg(null);
    setTrip(t);
    setGone(0);
    play('pop');
    const total = t.dist[t.dist.length - 1];
    const fast = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = fast ? 900 : 130;
    let last = performance.now();
    let d = 0;
    const tick = (now: number) => {
      d = Math.min(total, d + ((now - last) / 1000) * speed);
      last = now;
      setGone(d);
      if (d < total) frame.current = requestAnimationFrame(tick);
      else play('complete');
    };
    frame.current = requestAnimationFrame(tick);
  };

  const at = (() => {
    if (!trip) return null;
    const { pts, dist } = trip;
    let i = 1;
    while (i < dist.length - 1 && dist[i] < gone) i++;
    const seg = dist[i] - dist[i - 1] || 1;
    const f = Math.max(0, Math.min(1, (gone - dist[i - 1]) / seg));
    return { p: P(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f), i };
  })();

  const dropWord = (word: string, p: Pt) => {
    const near = PARTS.map((part) => ({ part, d: Math.hypot(part.at.x - p.x, part.at.y - p.y) })).sort((a, b) => a.d - b.d)[0];
    if (near.d > 44) return;
    const part = PARTS.find((q) => q.word === word)!;
    if (near.part.word === word) {
      play('correct');
      const next = { ...placed, [word]: true };
      setPlaced(next);
      setNudge({
        good: true,
        text: Object.keys(next).length === PARTS.length ? 'All named! Water flows from the source, past the tributary and meanders, to the mouth and delta.' : `Yes! ${part.clue}`,
      });
    } else {
      play('wrong');
      setNudge({ good: false, text: `Not yet. ${part.clue}` });
    }
  };

  const switchMode = (m: Mode) => {
    cancelAnimationFrame(frame.current ?? 0);
    setMode(m);
    setTrip(null);
    setMsg(null);
    setNudge(null);
  };

  const shownEvents = trip ? trip.events.filter((e) => e.at <= gone + 0.5) : [];
  const logLines = shownEvents.flatMap((e, i) => wrap(e.text, 33).map((l, j) => ({ l, first: j === 0, key: `${i}-${j}` })));
  const visibleLog = logLines.slice(-14);

  return (
    <SceneSvg label="A river flowing from the mountains to the sea">
      {mode !== 'world' ? (
        <g>
          <Basin />
          {mode === 'drop' && trip && at && (
            <g pointerEvents="none">
              <polyline points={line([...trip.pts.slice(0, at.i), at.p])} fill="none" stroke={C.white} strokeWidth={4} strokeDasharray="2 8" strokeLinecap="round" />
              <circle cx={at.p.x} cy={at.p.y} r={20} fill={C.white} stroke={C.ink} strokeWidth={2} />
              <Emoji x={at.p.x} y={at.p.y} size={24}>
                💧
              </Emoji>
            </g>
          )}
          {mode === 'name' && (
            <g>
              {PARTS.map((part) =>
                placed[part.word] ? (
                  <g key={part.word} pointerEvents="none">
                    <circle cx={part.at.x} cy={part.at.y} r={9} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
                    <rect x={part.at.x - 52} y={part.at.y - 46} width={104} height={30} rx={9} fill={C.white} stroke={C.ink} strokeWidth={2} />
                    <text x={part.at.x} y={part.at.y - 30} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.ink}>
                      {part.word}
                    </text>
                  </g>
                ) : (
                  <circle key={part.word} cx={part.at.x} cy={part.at.y} r={24} fill={C.white} fillOpacity={0.35} stroke={C.ink} strokeWidth={2.5} strokeDasharray="6 5" pointerEvents="none" />
                ),
              )}
            </g>
          )}
        </g>
      ) : (
        <g>
          <WorldMap pr={WORLD} id="wo-rivers-world" />
          {RIVERS.map((r) => (
            <g key={r.name}>
              <RiverOnMap r={r} pr={WORLD} on={river === r} width={5} />
              <polyline
                points={line(r.path.map(([lo, la]) => P(WORLD.x(lo), WORLD.y(la))))}
                fill="none"
                stroke="transparent"
                strokeWidth={26}
                strokeLinecap="round"
                style={{ cursor: 'pointer' }}
                data-nopan
                role="button"
                aria-label={`${r.name} river`}
                onClick={() => {
                  play('tap');
                  setRiver(r);
                }}
              />
            </g>
          ))}
          <rect x={20} y={490} width={620} height={176} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2} />
          {river ? (
            <g>
              <text x={40} y={526} fontSize={26} fontWeight={700} fill={C.ink}>
                The {river.name}
              </text>
              <text x={620} y={526} textAnchor="end" fontSize={18} fill={C.ink}>
                {CONTINENT_NAME[river.continent]}
              </text>
              <text x={40} y={558} fontSize={18} fill={C.ink}>
                Flows <tspan fontWeight={700}>{river.flows}</tspan> into {river.into}.
              </text>
              {wrap(river.fact, 64).map((l, i) => (
                <text key={i} x={40} y={590 + i * 22} fontSize={17} fill={C.ink2}>
                  {l}
                </text>
              ))}
            </g>
          ) : (
            <g>
              <text x={40} y={526} fontSize={22} fontWeight={700} fill={C.ink}>
                Six famous rivers
              </text>
              {wrap('Each river starts at a white dot (its source) and flows downhill to the arrow (its mouth). Rivers can flow north, south, east or west: always downhill.', 62).map((l, i) => (
                <text key={i} x={40} y={558 + i * 24} fontSize={17} fill={C.ink2}>
                  {l}
                </text>
              ))}
            </g>
          )}
        </g>
      )}

      {/* Panel */}
      {(['drop', 'name', 'world'] as Mode[]).map((m, i) => (
        <SvgButton
          key={m}
          x={[664, 778, 876][i]}
          y={22}
          w={[106, 90, 94][i]}
          h={50}
          fontSize={18}
          label={m === 'drop' ? 'Raindrop' : m === 'name' ? 'Name it' : 'World'}
          active={mode === m}
          color={mode === m ? C.yellow : C.card}
          onClick={() => switchMode(m)}
        />
      ))}

      {mode === 'drop' && (
        <g>
          <Note x={664} y={92} w={306} text="Drag the raindrop onto the land. Where does the water go?" />
          <circle cx={816} cy={210} r={40} fill={C.white} stroke={C.ink} strokeWidth={2} strokeDasharray="6 5" />
          <Draggable x={816} y={210} hit={40} label="Raindrop: drag it onto the land" onDrop={startTrip}>
            <Emoji x={816} y={210} size={46}>
              💧
            </Emoji>
          </Draggable>
          {trip && at && (
            <text x={816} y={282} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
              Height: {height(at.p) === 0 ? 'sea level (0 m)' : `about ${height(at.p).toLocaleString('en')} m`}
            </text>
          )}
          {msg && <Note x={664} y={300} w={306} text={msg} tone="nudge" />}
          {visibleLog.map((ln, i) => (
            <text key={ln.key} x={ln.first ? 672 : 690} y={318 + i * 22} fontSize={16} fill={C.ink}>
              {ln.first ? `• ${ln.l}` : ln.l}
            </text>
          ))}
        </g>
      )}

      {mode === 'name' && (
        <g>
          <Note x={664} y={92} w={306} text="Drag each word to its dashed circle on the river." />
          {PARTS.map((part, i) => {
            const x = 664 + (i % 2) * 158;
            const y = 180 + Math.floor(i / 2) * 64;
            return placed[part.word] ? (
              <rect key={part.word} x={x} y={y} width={148} height={50} rx={12} fill="none" stroke={C.line} strokeWidth={2} strokeDasharray="5 5" />
            ) : (
              <Draggable key={part.word} x={x + 74} y={y + 25} hit={30} label={`${part.word}: drag it onto the river`} onDrop={(p) => dropWord(part.word, p)}>
                <rect x={x} y={y} width={148} height={50} rx={12} fill={C.white} stroke={C.ink} strokeWidth={2} />
                <text x={x + 74} y={y + 26} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink} pointerEvents="none">
                  {part.word}
                </text>
              </Draggable>
            );
          })}
          {nudge && <Note x={664} y={384} w={306} text={nudge.text} tone={nudge.good ? 'good' : 'nudge'} />}
          {Object.keys(placed).length > 0 && (
            <SvgButton x={664} y={606} w={150} h={50} fontSize={17} label="Start again" onClick={() => { setPlaced({}); setNudge(null); }} />
          )}
        </g>
      )}

      {mode === 'world' && (
        <g>
          <Caps x={30} y={80}>
            Tap a river on the map or below
          </Caps>
          {RIVERS.map((r, i) => (
            <SvgButton
              key={r.name}
              x={664 + (i % 2) * 158}
              y={490 + Math.floor(i / 2) * 60}
              w={148}
              h={52}
              fontSize={18}
              label={r.name}
              active={river === r}
              color={river === r ? C.orange : C.card}
              onClick={() => setRiver(r)}
            />
          ))}
        </g>
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={4} width={112} height={72} rx={8} fill="#cfe8b4" />
      <polygon points="84,76 116,40 116,76" fill={shade(C.blue, 0.5)} />
      <polygon points="12,30 24,10 36,30" fill="#9c8a6c" stroke={C.ink} strokeWidth={1.2} />
      <polygon points="30,26 42,8 54,26" fill="#9c8a6c" stroke={C.ink} strokeWidth={1.2} />
      <path d="M30,30 C40,44 50,36 58,48 S74,52 76,60 S88,64 98,62" fill="none" stroke={shade(C.blue, 0.1)} strokeWidth={4} strokeLinecap="round" />
      <rect x={4} y={4} width={112} height={72} rx={8} fill="none" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

/* ---------- Practice ---------- */

const BASIN_PART_OPTS = PARTS.map((p) => p.word);

function BasinPic({ ring, label }: { ring: Pt; label: string }) {
  return (
    <svg viewBox="20 20 630 640" role="img" aria-label={label}>
      <Basin labels={false} />
      <circle cx={ring.x} cy={ring.y} r={36} fill="none" stroke={C.ink} strokeWidth={12} />
      <circle cx={ring.x} cy={ring.y} r={36} fill="none" stroke={C.red} strokeWidth={8} />
    </svg>
  );
}

const MINI = geoProj(0, 0, 360, 72, -54);

function RiverMapPic({ r, label }: { r: River; label: string }) {
  return (
    <svg viewBox={`-2 -2 ${MINI.W + 4} ${MINI.H + 4}`} role="img" aria-label={label}>
      <WorldMap pr={MINI} id={`wo-rv-${r.name}`} stroke={0.7} />
      <RiverOnMap r={r} pr={MINI} on width={2.5} />
    </svg>
  );
}

const DEFINITIONS = [
  { prompt: 'A smaller river that flows into a bigger river is called a…', answer: 'tributary', why: 'Tributaries add their water to the main river.' },
  { prompt: 'A big loop or bend in a river on flat land is called a…', answer: 'meander', why: 'On flat land the river slows and swings from side to side.' },
  { prompt: 'Fan-shaped land made of mud and sand where a river meets the sea is a…', answer: 'delta', why: 'The river slows down at the sea and drops the mud and sand it carried.' },
  { prompt: 'The place where two rivers join is called a…', answer: 'confluence', why: '“Con-fluence” means “flowing together”.' },
  { prompt: 'The place where a river begins is its…', answer: 'source', why: 'Many rivers begin at a spring, a lake or melting snow high up.' },
  { prompt: 'The place where a river flows into the sea is its…', answer: 'mouth', why: 'The mouth is the very end of the river.' },
];
const WORDS = ['source', 'tributary', 'meander', 'confluence', 'mouth', 'delta'];
const CONTINENTS: ContinentId[] = ['africa', 'asia', 'europe', 'northAmerica', 'southAmerica', 'australia'];

function makeQuestion(level: number): Question {
  const style = level === 0 ? rand(0, 1) : level === 1 ? rand(2, 3) : rand(4, 6);

  if (style === 0) {
    const part = pick(PARTS);
    return mcq({
      prompt: 'What is this part of the river called?',
      visual: <BasinPic ring={part.at} label="A river from the mountains to the sea, with one part circled" />,
      answer: part.word,
      // The mouth and the delta sit side by side, so never offer both.
      options: [part.word, ...shuffle(BASIN_PART_OPTS.filter((w) => w !== part.word && !(['Mouth', 'Delta'].includes(w) && ['Mouth', 'Delta'].includes(part.word)))).slice(0, 3)],
      hint: 'Follow the water from the mountains to the sea. Is the circle near the start, the middle or the end?',
      explain: [part.clue, `So the circled part is the ${part.word}.`],
    });
  }
  if (style === 1) {
    const downhill = Math.random() < 0.5;
    if (downhill) {
      const answer = 'Downhill, from high ground towards the sea';
      return mcq({
        prompt: 'Which way do rivers flow?',
        answer,
        options: [answer, 'Uphill, from the sea to the mountains', 'Always towards the north', 'Always towards the south'],
        hint: 'Think about what happens when you pour water on a slope.',
        explain: ['Gravity pulls water down slopes.', 'So rivers start high up and flow down to the sea or a lake.', `The answer: ${answer}.`],
      });
    }
    const answer = 'At its source, often high in hills or mountains';
    return mcq({
      prompt: 'Where does a river begin?',
      answer,
      options: [answer, 'At its mouth, by the sea', 'In the middle of the ocean', 'At a delta'],
      hint: 'Rivers flow downhill, so where must the start be?',
      explain: ['Water flows downhill, so a river starts on high ground.', 'Its start is a spring, a lake or melting snow.', `The answer: ${answer}.`],
    });
  }
  if (style === 2) {
    const d = pick(DEFINITIONS);
    return mcq({
      prompt: d.prompt,
      answer: d.answer,
      options: [d.answer, ...shuffle(WORDS.filter((w) => w !== d.answer)).slice(0, 3)],
      hint: 'Picture a river from start to end. Where would you see this?',
      explain: [d.why, `The word is “${d.answer}”.`],
    });
  }
  if (style === 3) {
    const r = pick(RIVERS);
    const answer = CONTINENT_NAME[r.continent];
    return mcq({
      prompt: `Which continent is the ${r.name} in?`,
      visual: <RiverMapPic r={r} label={`A world map showing the ${r.name}`} />,
      answer,
      options: [answer, ...shuffle(CONTINENTS.filter((c) => c !== r.continent)).slice(0, 3).map((c) => CONTINENT_NAME[c])],
      hint: 'Look at where the orange river is drawn. Which continent is that land?',
      explain: [`The ${r.name} is drawn in orange.`, `That land is ${answer}.`],
    });
  }
  if (style === 4) {
    const r = pick(RIVERS.filter((x) => x.name !== 'Mississippi'));
    const answer = r.into[0].toUpperCase() + r.into.slice(1);
    const pool = RIVERS.filter((x) => x.into !== r.into && x.name !== 'Mississippi').map((x) => x.into[0].toUpperCase() + x.into.slice(1));
    return mcq({
      prompt: `The ${r.name} flows ${r.flows}. Where does it reach the sea?`,
      visual: <RiverMapPic r={r} label={`A world map showing the ${r.name}`} />,
      answer,
      options: [answer, ...shuffle(pool).slice(0, 3)],
      hint: 'Follow the river to its arrow. Which sea or ocean is there?',
      explain: [`The ${r.name} starts at the white dot and flows ${r.flows}.`, `Its mouth is on ${r.into}.`, `So the answer is ${answer}.`],
    });
  }
  if (style === 5) {
    const high = rand(8, 30) * 100;
    const answer = 'From the source down to the mouth';
    return mcq({
      prompt: `A river’s source is ${high.toLocaleString('en')} m above sea level. Its mouth is at sea level. Which way does its water flow?`,
      answer,
      options: [answer, 'From the mouth up to the source', 'Both ways, back and forth', 'It does not flow'],
      hint: 'Which end is higher? Water always moves from higher to lower.',
      explain: [`The source is ${high.toLocaleString('en')} m high; the mouth is at 0 m.`, 'Gravity pulls water down to the lower end.', `So it flows ${answer.toLowerCase()}.`],
    });
  }
  const why = pick([
    {
      prompt: 'Why does a delta form at some river mouths?',
      answer: 'The river slows down and drops its mud and sand',
      options: ['The sea pushes rocks onto the beach', 'People build it with machines', 'The river freezes at the mouth'],
      steps: ['A fast river carries lots of mud and sand.', 'When it meets the sea it slows down.', 'Slow water drops what it carries: the river slows down and drops its mud and sand.'],
    },
    {
      prompt: 'The Nile flows north. How can a river flow north?',
      answer: 'Rivers flow downhill, in any direction',
      options: ['Rivers can only flow south', 'The wind blows it north', 'The Nile is a canal, not a river'],
      steps: ['The land in east Africa where the Nile begins is higher than the land in Egypt.', 'Water flows to lower ground, whichever way that is.', 'So: rivers flow downhill, in any direction.'],
    },
    {
      prompt: 'Why does a river usually get wider as it goes towards the sea?',
      answer: 'Tributaries add more water',
      options: ['Rain only falls near the sea', 'The sea flows up the river', 'Rivers get thinner as they go'],
      steps: ['Along the way, many tributaries join the river.', 'Each one adds water, so the river gets bigger.', 'That is because tributaries add more water.'],
    },
  ]);
  return mcq({
    prompt: why.prompt,
    answer: why.answer,
    options: [why.answer, ...why.options],
    hint: 'Think about water flowing downhill, slowing down and joining together.',
    explain: why.steps,
  });
}

export const rivers: Lesson = {
  id: 'rivers',
  title: 'A River’s Journey',
  Thumb,
  Scene: RiverScene,
  sceneHint: 'Drop a raindrop, name the parts, then explore famous rivers',
  learn: {
    heading: 'From the mountains to the sea',
    intro:
      'A river is fresh water flowing across the land in a channel. Rain and melting snow run downhill, join together into streams, and the streams join into rivers that flow all the way to the sea or a lake.',
    points: [
      { icon: Mountain, text: 'The source is where a river begins, high up in hills or mountains.' },
      { icon: GitMerge, text: 'Tributaries are smaller rivers that join the main river. Where they meet is a confluence.' },
      { icon: Waves, text: 'On flat land the river slows and makes big loops called meanders.' },
      { icon: ArrowDownRight, text: 'The mouth is where it meets the sea. Some rivers drop mud there and build a delta.' },
    ],
  },
  steps: [
    'Find the source: the highest point, where the river starts.',
    'Follow the water downhill. Spot tributaries joining in.',
    'On the flat plain, look for meanders.',
    'Finish at the mouth, where the river meets the sea, and look for a delta.',
  ],
  example: {
    question: 'A raindrop falls in the mountains. What happens to it?',
    work: [
      'It trickles downhill into a stream near the river’s source.',
      'The stream joins a bigger river; tributaries add more water on the way.',
      'On flat land the river winds in meanders, then reaches the sea at its mouth.',
    ],
    answer: 'It flows downhill, all the way to the sea.',
  },
  grownups: [
    'Pour water slowly on a tilted tray of sand or soil to watch channels, meanders and a little delta form.',
    'A common belief is that rivers flow south (“down” on a map). The Nile flows north: rivers flow downhill in any direction.',
    'Look up the river nearest your home: where is its source, and where does it reach the sea?',
    'River lengths are hard to measure exactly, so different books give slightly different figures.',
  ],
  makeQuestion,
};
