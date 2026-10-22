import { useState } from 'react';
import { Building2, Footprints, Map as MapIcon } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, Emoji, mcq, Note, others } from './visuals/kit';
import { LOT, MiniTown, PLACES, ROAD } from './visuals/town';
import type { PlaceId } from './visuals/town';

// Town layout: 3 × 3 blocks with roads between them. Road nodes sit every half block;
// a node is on a road when its x or y index is even.
const VX = [60, 270, 480, 690];
const HY = [80, 240, 400, 560];
const nodeX = (i: number) => VX[0] + i * 105;
const nodeY = (i: number) => HY[0] + i * 80;
const HOME_PLOT = '2,0';

type ItemId = 'school' | 'park' | 'shop' | 'library' | 'hospital' | 'home1' | 'home2';
const ITEMS: ItemId[] = ['school', 'park', 'shop', 'library', 'hospital', 'home1', 'home2'];
const placeOf = (id: ItemId): PlaceId => (id.startsWith('home') ? 'home' : (id as PlaceId));
const DEFAULT: Record<string, ItemId> = { '0,0': 'school', '0,1': 'park', '0,2': 'library', '1,0': 'home1', '1,1': 'shop', '1,2': 'hospital', '2,2': 'home2' };
const PLOTS = [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => `${i},${j}`));

const plotBox = (key: string) => {
  const [i, j] = key.split(',').map(Number);
  return { x: VX[j] + 20, y: HY[i] + 20, w: VX[j + 1] - VX[j] - 40, h: HY[i + 1] - HY[i] - 40, cx: (VX[j] + VX[j + 1]) / 2, cy: (HY[i] + HY[i + 1]) / 2 };
};
/** The road spot right outside a plot's front door. */
const doorNode = (key: string): [number, number] => {
  const [i, j] = key.split(',').map(Number);
  return [2 * j + 1, 2 * i + 2];
};
const onRoad = ([x, y]: [number, number]) => x >= 0 && y >= 0 && x <= 6 && y <= 6 && (x % 2 === 0 || y % 2 === 0);
const neighbours = ([x, y]: [number, number]): [number, number][] =>
  (
    [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as [number, number][]
  ).filter((n) => onRoad(n) && (n[1] === y ? y % 2 === 0 : x % 2 === 0));
const same = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

/** Fewest steps along the roads from a to b. */
function shortest(a: [number, number], b: [number, number]) {
  const seen = new Set([a.join()]);
  let frontier = [a];
  for (let d = 0; frontier.length; d++) {
    if (frontier.some((n) => same(n, b))) return d;
    const next: [number, number][] = [];
    for (const n of frontier)
      for (const m of neighbours(n))
        if (!seen.has(m.join())) {
          seen.add(m.join());
          next.push(m);
        }
    frontier = next;
  }
  return Infinity;
}

const TRAY = (k: number) => ({ x: 790 + (k % 2) * 112, y: 196 + Math.floor(k / 2) * 92 });

function TownScene() {
  const [mode, setMode] = useState<'build' | 'walk'>('build');
  const [spots, setSpots] = useState<Record<string, ItemId>>({});
  const [picked, setPicked] = useState<ItemId | null>(null);
  const [walker, setWalker] = useState<[number, number]>(doorNode(HOME_PLOT));
  const [trail, setTrail] = useState<[number, number][]>([doorNode(HOME_PLOT)]);
  const [target, setTarget] = useState<PlaceId>('library');
  const [arrived, setArrived] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' }>({
    text: 'Build your town! Drag each place onto an empty spot. Tap a place to find out what it is for.',
    tone: 'plain',
  });

  const plotOf = (id: ItemId) => Object.keys(spots).find((k) => spots[k] === id);
  const plotAt = (p: Pt) => PLOTS.find((k) => {
    const b = plotBox(k);
    return p.x >= b.x - 18 && p.x <= b.x + b.w + 18 && p.y >= b.y - 18 && p.y <= b.y + b.h + 18;
  });

  const tell = (id: ItemId) => {
    const pl = PLACES[placeOf(id)];
    setMsg({ text: `${pl.name[0].toUpperCase()}${pl.name.slice(1)}: ${pl.info}`, tone: 'plain' });
  };

  const place = (id: ItemId, key: string | undefined) => {
    setPicked(null);
    if (!key) return;
    if (key === HOME_PLOT) {
      setMsg({ text: 'That spot is your home. Choose another spot.', tone: 'nudge' });
      return;
    }
    const from = plotOf(id);
    const next = { ...spots };
    if (from) delete next[from];
    const there = next[key];
    if (there && from) next[from] = there; // swap places
    next[key] = id;
    setSpots(next);
    play('pop');
    const count = Object.keys(next).length;
    const pl = PLACES[placeOf(id)];
    setMsg(
      count === ITEMS.length
        ? { text: 'Your town is ready! Press “Walk” to visit the places.', tone: 'good' }
        : { text: `A ${pl.name}! ${pl.info}`, tone: 'good' },
    );
  };

  const newTarget = (from: [number, number], current?: PlaceId) => {
    const t = pick((['school', 'park', 'shop', 'library', 'hospital'] as PlaceId[]).filter((p) => p !== current));
    setTarget(t);
    setTrail([from]);
    setArrived(false);
    setMsg({ text: `Walk to the ${PLACES[t].name} ${PLACES[t].emoji}. Tap a dot on the road to take a step.`, tone: 'plain' });
  };

  const startWalk = () => {
    // Any places still in the tray go to the empty spots, so the town is complete.
    const next = { ...spots };
    for (const id of ITEMS) {
      if (Object.values(next).includes(id)) continue;
      const free = PLOTS.find((k) => k !== HOME_PLOT && !next[k]) ?? Object.keys(DEFAULT).find((k) => !next[k]);
      if (free) next[free] = id;
    }
    setSpots(next);
    setMode('walk');
    setPicked(null);
    const home = doorNode(HOME_PLOT);
    setWalker(home);
    newTarget(home);
    play('tap');
  };

  const step = (n: [number, number]) => {
    if (arrived) return;
    const path = [...trail, n];
    setWalker(n);
    setTrail(path);
    play('tap');
    const key = PLOTS.find((k) => same(doorNode(k), n));
    if (!key) return;
    const here = key === HOME_PLOT ? 'home' : spots[key] ? placeOf(spots[key]) : null;
    if (here === target) {
      const steps = path.length - 1;
      const best = shortest(path[0], n);
      setArrived(true);
      play('correct');
      setMsg({
        text:
          steps <= best
            ? `You walked to the ${PLACES[target].name} in ${steps} steps. That is the shortest way!`
            : `You walked to the ${PLACES[target].name} in ${steps} steps. Can you find a shorter way? It can be done in ${best}.`,
        tone: 'good',
      });
    } else if (here) {
      setMsg({ text: `This is ${key === HOME_PLOT ? 'your home' : `the ${PLACES[here].name}`}. Keep going to find the ${PLACES[target].name} ${PLACES[target].emoji}.`, tone: 'nudge' });
    }
  };

  const toBuild = () => {
    setMode('build');
    setPicked(null);
    setMsg({ text: 'Move places to new spots, or tap a place to find out what it is for.', tone: 'plain' });
    play('tap');
  };

  const hx = (n: [number, number]) => nodeX(n[0]);
  const hy = (n: [number, number]) => nodeY(n[1]);

  return (
    <SceneSvg label="A town map. Build the town by placing a school, park, shop, library, hospital and homes, then walk along the roads to visit them.">
      {/* Map */}
      <rect x={36} y={56} width={678} height={528} rx={18} fill={ROAD} stroke={C.ink} strokeWidth={3} />
      {PLOTS.map((k) => {
        const b = plotBox(k);
        const empty = !spots[k] && k !== HOME_PLOT;
        return (
          <g key={k}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={12}
              fill={picked && empty ? shade(C.yellow, 0.6) : LOT}
              stroke={C.ink}
              strokeWidth={2}
              strokeDasharray={empty ? '8 6' : undefined}
              onClick={() => picked && place(picked, k)}
              style={{ cursor: picked ? 'pointer' : undefined }}
              data-nopan={picked ? true : undefined}
            />
            <rect x={b.cx - 12} y={b.y + b.h - 14} width={24} height={14} fill={C.brown} stroke={C.ink} strokeWidth={2} pointerEvents="none" />
          </g>
        );
      })}
      <Emoji x={plotBox(HOME_PLOT).cx} y={plotBox(HOME_PLOT).cy - 14} size={54}>
        🏡
      </Emoji>
      <text x={plotBox(HOME_PLOT).cx} y={plotBox(HOME_PLOT).cy + 34} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink} pointerEvents="none">
        your home
      </text>

      {/* Places (on the map or waiting in the tray) */}
      {mode === 'build' && (
        <g>
          <text x={736} y={136} fontSize={15} fill={C.muted} className="caps">
            Places to build
          </text>
          <rect x={732} y={146} width={232} height={372} rx={16} fill={shade(C.paper, 0.4)} stroke={C.line} strokeWidth={2} />
        </g>
      )}
      {ITEMS.map((id, k) => {
        const plot = plotOf(id);
        if (!plot && mode === 'walk') return null;
        const b = plot ? plotBox(plot) : null;
        const x = b ? b.cx : TRAY(k).x;
        const y = b ? b.cy - 14 : TRAY(k).y;
        const pl = PLACES[placeOf(id)];
        const body = (
          <g>
            {picked === id && <circle cx={x} cy={y + 8} r={46} fill={shade(C.yellow, 0.5)} stroke={C.ink} strokeWidth={2} strokeDasharray="6 5" />}
            <Emoji x={x} y={y} size={b ? 54 : 46}>
              {pl.emoji}
            </Emoji>
            <text x={x} y={y + (b ? 48 : 40)} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink} pointerEvents="none">
              {pl.name}
            </text>
          </g>
        );
        if (mode === 'walk') return <g key={id}>{body}</g>;
        return (
          <Draggable
            key={id}
            x={x}
            y={y + 8}
            hit={42}
            label={`${pl.name}${plot ? ' on the map' : ''}`}
            onDrop={(p) => place(id, plotAt(p))}
            onTap={() => {
              tell(id);
              setPicked(picked === id ? null : id);
              play('tap');
            }}
          >
            {body}
          </Draggable>
        );
      })}

      {/* Walking */}
      {mode === 'walk' && (
        <g>
          <polyline points={trail.map((n) => `${hx(n)},${hy(n)}`).join(' ')} fill="none" stroke={C.red} strokeWidth={6} strokeDasharray="10 8" strokeLinecap="round" strokeLinejoin="round" />
          {!arrived &&
            neighbours(walker).map((n) => (
              <g key={n.join()} onClick={() => step(n)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label="Step here">
                <circle cx={hx(n)} cy={hy(n)} r={28} fill="transparent" />
                <circle cx={hx(n)} cy={hy(n)} r={13} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
              </g>
            ))}
          <g style={{ transform: `translate(${hx(walker)}px, ${hy(walker)}px)`, transition: 'transform 0.3s ease' }}>
            <circle r={22} fill={C.white} stroke={C.ink} strokeWidth={2} />
            <Emoji x={0} y={1} size={30}>
              🧒
            </Emoji>
          </g>

          <text x={736} y={136} fontSize={15} fill={C.muted} className="caps">
            Walk to the
          </text>
          <rect x={732} y={146} width={232} height={150} rx={16} fill={C.white} stroke={C.ink} strokeWidth={2} />
          <Emoji x={848} y={204} size={64}>
            {PLACES[target].emoji}
          </Emoji>
          <text x={848} y={270} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
            {PLACES[target].name}
          </text>
          <text x={736} y={336} fontSize={17} fill={C.ink2}>
            Steps: {trail.length - 1}
          </text>
          {arrived && <SvgButton x={732} y={360} w={232} h={52} fontSize={18} label="Next place" color={C.yellow} onClick={() => newTarget(walker, target)} />}
          {!arrived && trail.length > 1 && (
            <SvgButton
              x={732}
              y={360}
              w={232}
              h={52}
              fontSize={18}
              label="Start this walk again"
              onClick={() => {
                setWalker(trail[0]);
                setTrail([trail[0]]);
                play('tap');
              }}
            />
          )}
        </g>
      )}

      <SvgButton x={732} y={56} w={112} h={52} fontSize={18} label="Build" active={mode === 'build'} color={mode === 'build' ? C.yellow : C.card} onClick={toBuild} />
      <SvgButton x={852} y={56} w={112} h={52} fontSize={18} label="Walk" active={mode === 'walk'} color={mode === 'walk' ? C.yellow : C.card} onClick={startWalk} />
      <Note x={36} y={598} w={928} text={msg.text} tone={msg.tone} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={4} width={112} height={72} rx={8} fill={ROAD} stroke={C.ink} strokeWidth={2} />
      {[
        [12, 12, '🏫'],
        [64, 12, '🌳'],
        [12, 44, '🏡'],
        [64, 44, '📚'],
      ].map(([x, y, e]) => (
        <g key={e as string}>
          <rect x={x as number} y={y as number} width={44} height={26} rx={4} fill={LOT} stroke={C.ink} strokeWidth={1.2} />
          <text x={(x as number) + 22} y={(y as number) + 14} textAnchor="middle" dominantBaseline="central" fontSize={18}>
            {e}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

const USES: { place: PlaceId; q: string }[] = [
  { place: 'library', q: 'Where can you borrow a book?' },
  { place: 'shop', q: 'Where can you buy bread and apples?' },
  { place: 'hospital', q: 'Where do doctors and nurses help people who are very sick?' },
  { place: 'school', q: 'Where do children learn to read with a teacher?' },
  { place: 'park', q: 'Where can you play on the grass under the trees?' },
];
const TOWN: PlaceId[] = ['school', 'park', 'shop', 'library', 'hospital'];
const opt = (p: PlaceId) => ({ value: PLACES[p].name, emoji: PLACES[p].emoji });

function makeQuestion(level: number): Question {
  if (level === 0) {
    const u = pick(USES);
    const pl = PLACES[u.place];
    return mcq({
      prompt: u.q,
      answer: pl.name,
      options: [opt(u.place), ...others(TOWN, u.place, 2).map(opt)],
      hint: 'Think about what people do in each place.',
      explain: [`At the ${pl.name}: ${pl.info.toLowerCase()}`, `So the answer is the ${pl.name}.`],
    });
  }
  if (level === 1) {
    const row = shuffle(TOWN).slice(0, 4);
    const lots = [row.map((p) => PLACES[p].emoji)];
    const visual = <MiniTown lots={lots} label={`A street with ${row.map((p) => PLACES[p].name).join(', ')} in a row`} />;
    if (Math.random() < 0.5) {
      const i = pick([0, 1]);
      const [a, mid, b] = [row[i], row[i + 1], row[i + 2]];
      return mcq({
        prompt: `What is between the ${PLACES[a].name} and the ${PLACES[b].name}?`,
        visual,
        answer: PLACES[mid].name,
        options: [opt(mid), ...others(row, mid, 2).map(opt)],
        hint: `Find the ${PLACES[a].name} and the ${PLACES[b].name}. Look at what is in the middle of them.`,
        explain: [`Find the ${PLACES[a].name} ${PLACES[a].emoji} and the ${PLACES[b].name} ${PLACES[b].emoji}.`, `In the middle of them is the ${PLACES[mid].name} ${PLACES[mid].emoji}.`, `So the ${PLACES[mid].name} is between them.`],
      });
    }
    const end = pick([0, 3]);
    const x = row[end];
    const next = row[end === 0 ? 1 : 2];
    return mcq({
      prompt: `What is next to the ${PLACES[x].name}?`,
      visual,
      answer: PLACES[next].name,
      options: row.filter((p) => p !== x).map(opt),
      hint: `Find the ${PLACES[x].name} first. Then look right beside it.`,
      explain: [`The ${PLACES[x].name} ${PLACES[x].emoji} is at the end of the street.`, `Right beside it is the ${PLACES[next].name} ${PLACES[next].emoji}.`, `So the ${PLACES[next].name} is next to the ${PLACES[x].name}.`],
    });
  }
  // Level 2: follow a route on a little map, starting at home (bottom left).
  const places = shuffle(TOWN);
  const plots: [number, number][] = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
    [1, 2],
  ];
  const lots = [
    ['', '', ''],
    ['🏡', '', ''],
  ];
  plots.forEach(([r, c], k) => (lots[r][c] = PLACES[places[k]].emoji));
  const k = Math.floor(Math.random() * plots.length);
  const [tr, tc] = plots[k];
  const goal = places[k];
  const into: [number, number] = [2 * tc + 1, 2 * tr + 1.72];
  const path: [number, number][] = tr === 1 ? [[1, 4], [2 * tc + 1, 4], into] : [[1, 4], [2, 4], [2, 2], [2 * tc + 1, 2], into];
  return mcq({
    prompt: 'Start at home 🏡 and follow the dotted path. Where does it go?',
    visual: <MiniTown lots={lots} path={path} label="A small town map with a dotted path starting at home" />,
    answer: PLACES[goal].name,
    options: [opt(goal), ...others(places, goal, 2).map(opt)],
    hint: 'Put your finger on home. Slide it along the dots until you reach the arrow.',
    explain: ['Start at home, at the bottom of the map.', 'Follow the dots along the road.', `The arrow goes into the ${PLACES[goal].name} ${PLACES[goal].emoji}.`],
  });
}

export const myNeighbourhood: Lesson = {
  id: 'my-neighbourhood',
  title: 'Around Town',
  Thumb,
  Scene: TownScene,
  sceneHint: 'Build: drag places onto the map · Walk: tap the dots to walk',
  learn: {
    heading: 'Places near us',
    intro: 'A town has many places that help us. A map shows where they are and how to get there.',
    points: [
      { icon: Building2, text: 'School, library, shop, park and hospital each have a job.' },
      { icon: MapIcon, text: 'A map shows where each place is.' },
      { icon: Footprints, text: 'We follow the roads on a map to get from place to place.' },
    ],
  },
  steps: ['Find where you are on the map.', 'Find the place you want to go.', 'Follow the roads, one step at a time.', 'Look for the door of the place.'],
  example: {
    question: 'You want to borrow a book. Where do you go?',
    visual: <MiniTown lots={[['🏪', '📚', '🌳']]} label="A street with a shop, a library and a park" />,
    work: ['Shops sell food and things we need.', 'Parks are for playing.', 'Libraries lend books.'],
    answer: 'The library 📚',
  },
  grownups: [
    'On a walk, point out the school, shops, library and other places, and talk about who works there.',
    'Draw a simple map of the way to school or the park together and follow it.',
    'Use place words while you walk: next to, between, across the road, past.',
  ],
  makeQuestion,
};
