import { useState } from 'react';
import { Earth, Mountain, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, mcq, Note, others } from '../maps/visuals/kit';
import {
  CONTINENT_FILL,
  CONTINENT_IDS,
  CONTINENT_LABEL,
  CONTINENT_NAME,
  CONTINENTS,
  continentAt,
  OCEAN_IDS,
  OCEAN_LABEL,
  OCEAN_NAME,
  oceanAt,
  polyPath,
  projector,
  SEA,
  WorldMini,
} from './visuals/world';
import type { ContinentId, OceanId } from './visuals/world';

const MX = 20;
const MY = 72;
const PR = projector(960);

const CLUE_C: Record<ContinentId, string> = {
  northAmerica: 'North America is at the top left. A thin strip of land joins it to South America.',
  southAmerica: 'South America is below North America. It gets thinner towards the South Pole.',
  europe: 'Europe is a smaller continent above Africa, joined to Asia on its right.',
  africa: 'Africa is a big continent below Europe. The Equator crosses its middle.',
  asia: 'Asia is the biggest continent, to the right of Europe.',
  australia: 'Australia is at the bottom right, between the Indian and Pacific Oceans.',
  antarctica: 'Antarctica is the icy land around the South Pole, along the bottom.',
};
const CLUE_O: Record<OceanId, string> = {
  pacific: 'The Pacific is the biggest ocean, between Asia and Australia and the Americas. It shows on both edges of this map.',
  atlantic: 'The Atlantic is between the Americas on one side and Europe and Africa on the other.',
  indian: 'The Indian Ocean is below Asia, between Africa and Australia.',
  arctic: 'The Arctic Ocean is around the North Pole, along the very top.',
  southern: 'The Southern Ocean goes all the way around Antarctica.',
};

type Item = { kind: 'c'; id: ContinentId } | { kind: 'o'; id: OceanId };
const nameOf = (it: Item) => (it.kind === 'c' ? CONTINENT_NAME[it.id] : OCEAN_NAME[it.id]);
const chipW = (it: Item) => nameOf(it).length * 9.6 + 30;

function Tag({ x, y, text, tone }: { x: number; y: number; text: string; tone: 'land' | 'sea' }) {
  const w = text.length * 9 + 22;
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - 15} width={w} height={30} rx={15} fill={tone === 'sea' ? '#eaf4ff' : C.white} stroke={C.ink} strokeWidth={2} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill={tone === 'sea' ? shade(C.blue, -0.35) : C.ink} fontStyle={tone === 'sea' ? 'italic' : undefined}>
        {text}
      </text>
    </g>
  );
}

function WorldScene() {
  const [mode, setMode] = useState<'c' | 'o'>('c');
  const [cDone, setCDone] = useState<ContinentId[]>([]);
  const [oDone, setODone] = useState<OceanId[]>([]);
  const [cTray] = useState(() => shuffle(CONTINENT_IDS));
  const [oTray] = useState(() => shuffle(OCEAN_IDS));
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' }>({
    text: 'There are 7 continents: the big areas of land. Drag each name onto its continent.',
    tone: 'plain',
  });

  const lonlat = (p: Pt): [number, number] => [PR.lon(p.x - MX), PR.lat(p.y - MY)];
  const onMap = (p: Pt) => p.x >= MX && p.x <= MX + PR.W && p.y >= MY && p.y <= MY + PR.H;

  const drop = (it: Item, p: Pt) => {
    if (!onMap(p)) return;
    const ll = lonlat(p);
    const land = continentAt(ll);
    if (it.kind === 'c') {
      if (land === it.id) {
        const next = [...cDone, it.id];
        setCDone(next);
        play('correct');
        setMsg(
          next.length === CONTINENT_IDS.length
            ? { text: 'All 7 continents! Now press “Oceans” to name the 5 oceans.', tone: 'good' }
            : { text: `Yes, ${CONTINENT_NAME[it.id]}! ${it.id === 'asia' ? 'It is the biggest continent.' : it.id === 'australia' ? 'It is the smallest continent.' : ''}`.trim(), tone: 'good' },
        );
      } else {
        play('wrong');
        setMsg({ text: `${land ? `That is ${CONTINENT_NAME[land]}` : 'That is ocean, not land'}. ${CLUE_C[it.id]}`, tone: 'nudge' });
      }
      return;
    }
    if (land) {
      play('wrong');
      setMsg({ text: `That is land (${CONTINENT_NAME[land]}). Oceans are the big areas of salty water. ${CLUE_O[it.id]}`, tone: 'nudge' });
      return;
    }
    const sea = oceanAt(ll);
    if (sea === it.id) {
      const next = [...oDone, it.id];
      setODone(next);
      play('correct');
      setMsg(
        next.length === OCEAN_IDS.length
          ? { text: 'All 5 oceans! They are all joined, making one big world ocean.', tone: 'good' }
          : { text: `Yes, the ${OCEAN_NAME[it.id]}!${it.id === 'pacific' ? ' It is the biggest and deepest ocean.' : ''}`, tone: 'good' },
      );
    } else {
      play('wrong');
      setMsg({ text: `That part is the ${OCEAN_NAME[sea]}. ${CLUE_O[it.id]}`, tone: 'nudge' });
    }
  };

  const switchMode = (m: 'c' | 'o') => {
    setMode(m);
    play('tap');
    setMsg(
      m === 'c'
        ? { text: 'There are 7 continents: the big areas of land. Drag each name onto its continent.', tone: 'plain' }
        : { text: 'There are 5 oceans: the huge areas of salty water. Drag each name onto its ocean.', tone: 'plain' },
    );
  };

  const tray: Item[] = mode === 'c' ? cTray.filter((id) => !cDone.includes(id)).map((id) => ({ kind: 'c', id })) : oTray.filter((id) => !oDone.includes(id)).map((id) => ({ kind: 'o', id }));

  return (
    <SceneSvg label="A world map. Drag the names of the 7 continents and 5 oceans to the right places.">
      <SvgButton x={MX} y={14} w={160} h={48} fontSize={18} label="Continents" active={mode === 'c'} color={mode === 'c' ? C.yellow : C.card} onClick={() => switchMode('c')} />
      <SvgButton x={MX + 172} y={14} w={140} h={48} fontSize={18} label="Oceans" active={mode === 'o'} color={mode === 'o' ? C.yellow : C.card} onClick={() => switchMode('o')} />
      <text x={MX + PR.W} y={46} textAnchor="end" fontSize={17} fontWeight={700} fill={C.ink2}>
        {mode === 'c' ? `Continents: ${cDone.length} of 7` : `Oceans: ${oDone.length} of 5`}
      </text>

      <g transform={`translate(${MX} ${MY})`}>
        <rect x={0} y={0} width={PR.W} height={PR.H} rx={10} fill={SEA} stroke={C.ink} strokeWidth={3} />
        <line x1={0} y1={PR.y(0)} x2={PR.W} y2={PR.y(0)} stroke={shade(C.blue, -0.1)} strokeWidth={1.5} strokeDasharray="8 7" />
        <text x={PR.x(58)} y={PR.y(0) - 6} fontSize={15} fill={shade(C.blue, -0.4)}>
          Equator
        </text>
        {CONTINENT_IDS.map((id) =>
          CONTINENTS[id].map((poly, i) => (
            <path
              key={`${id}${i}`}
              d={polyPath(poly, PR)}
              fill={mode === 'c' && !cDone.includes(id) ? '#ece6d8' : CONTINENT_FILL[id]}
              stroke={C.ink}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          )),
        )}
        {cDone.map((id) => (
          <Tag key={id} x={PR.x(CONTINENT_LABEL[id][0])} y={PR.y(CONTINENT_LABEL[id][1])} text={CONTINENT_NAME[id]} tone="land" />
        ))}
        {oDone.flatMap((id) => OCEAN_LABEL[id].map(([lo, la], i) => <Tag key={`${id}${i}`} x={PR.x(lo)} y={PR.y(la)} text={OCEAN_NAME[id]} tone="sea" />))}
      </g>

      {tray.map((it, k) => {
        // Chips sit side by side, each as wide as its name.
        const w = chipW(it);
        const x = MX + tray.slice(0, k).reduce((sum, t) => sum + chipW(t) + 8, 0) + w / 2;
        const y = 572;
        const text = nameOf(it);
        return (
          <Draggable key={`${it.kind}${it.id}`} x={x} y={y} hit={30} label={`${text} name`} onDrop={(p) => drop(it, p)}>
            <rect x={x - w / 2} y={y - 22} width={w} height={44} rx={22} fill={it.kind === 'o' ? '#eaf4ff' : C.white} stroke={C.ink} strokeWidth={2} />
            <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink} pointerEvents="none">
              {text}
            </text>
          </Draggable>
        );
      })}
      <Note x={MX} y={606} w={PR.W} text={msg.text} tone={msg.tone} size={16} />
    </SceneSvg>
  );
}

function Thumb() {
  const pr = projector(116);
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={2} y={12} width={116} height={pr.H} rx={4} fill={SEA} />
      <g transform="translate(2 12)">
        {CONTINENT_IDS.map((id) => CONTINENTS[id].map((poly, i) => <path key={`${id}${i}`} d={polyPath(poly, pr)} fill={CONTINENT_FILL[id]} stroke={C.ink} strokeWidth={0.5} />))}
      </g>
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

const OCEAN_SPOT: Record<OceanId, [number, number]> = {
  pacific: [-140, 5],
  atlantic: [-35, 20],
  indian: [78, -20],
  arctic: [60, 79],
  southern: [-120, -62],
};

const FACTS: { prompt: string; answer: string; pool: string[]; hint: string; explain: string[] }[] = [
  {
    prompt: 'Which ocean is between Africa and Australia?',
    answer: 'Indian Ocean',
    pool: ['Atlantic Ocean', 'Pacific Ocean', 'Arctic Ocean'],
    hint: 'Picture the map: Africa is in the middle, Australia is down to the right.',
    explain: ['Africa is to the west of this ocean, Australia to the east.', 'Asia is to the north of it.', 'It is the Indian Ocean.'],
  },
  {
    prompt: 'Which continent is around the South Pole?',
    answer: 'Antarctica',
    pool: ['Australia', 'South America', 'Africa'],
    hint: 'The South Pole is at the very bottom of the world. Which land is covered in ice?',
    explain: ['The South Pole is at the bottom of the world.', 'The icy continent there is Antarctica.'],
  },
  {
    prompt: 'Which continent is just south of Europe, across the Mediterranean Sea?',
    answer: 'Africa',
    pool: ['Asia', 'South America', 'Australia'],
    hint: 'Find Europe, then look straight down across the sea.',
    explain: ['South is down on the map.', 'Below Europe, across the Mediterranean Sea, is Africa.'],
  },
  {
    prompt: 'Which ocean do you cross to sail from North America to Europe?',
    answer: 'Atlantic Ocean',
    pool: ['Pacific Ocean', 'Indian Ocean', 'Southern Ocean'],
    hint: 'Europe is to the right of North America on the map. What water is in between?',
    explain: ['North America is on the left of the map, Europe is to the right.', 'The water between them is the Atlantic Ocean.'],
  },
  {
    prompt: 'Which is the biggest ocean?',
    answer: 'Pacific Ocean',
    pool: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    hint: 'It is so wide that on many maps it shows on both the left and right edges.',
    explain: ['The Pacific Ocean is the biggest and deepest ocean.', 'It covers about a third of the Earth.'],
  },
  {
    prompt: 'Which is the biggest continent?',
    answer: 'Asia',
    pool: ['Africa', 'North America', 'Europe'],
    hint: 'Look for the continent that stretches the furthest across the map.',
    explain: ['Asia stretches from Europe all the way to the Pacific Ocean.', 'Asia is the biggest continent.'],
  },
  {
    prompt: 'How many continents are there?',
    answer: '7',
    pool: ['5', '6', '8'],
    hint: 'Count them: the Americas (2), Europe, Africa, Asia, Australia and the icy one at the bottom.',
    explain: ['North America, South America, Europe, Africa, Asia, Australia and Antarctica.', 'That makes 7 continents.'],
  },
  {
    prompt: 'How many oceans are there?',
    answer: '5',
    pool: ['3', '4', '7'],
    hint: 'Count them: Pacific, Atlantic, Indian, and the two near the poles.',
    explain: ['Pacific, Atlantic, Indian, Arctic and Southern.', 'That makes 5 oceans.'],
  },
];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const id = pick(CONTINENT_IDS);
    return mcq({
      prompt: 'Which continent is coloured orange?',
      visual: <WorldMini highlight={id} label="A world map with one continent coloured orange" />,
      answer: CONTINENT_NAME[id],
      options: [id, ...others(CONTINENT_IDS, id, 2)].map((c) => ({ value: CONTINENT_NAME[c] })),
      plain: true,
      hint: 'Is it at the top or bottom of the world? On the left or the right?',
      explain: [CLUE_C[id], `So the orange continent is ${CONTINENT_NAME[id]}.`],
    });
  }
  if (level === 1) {
    const id = pick(OCEAN_IDS);
    return mcq({
      prompt: 'Which ocean is inside the yellow ring?',
      visual: <WorldMini ring={OCEAN_SPOT[id]} label="A world map with a yellow ring on one ocean" />,
      answer: OCEAN_NAME[id],
      options: [id, ...others(OCEAN_IDS, id, 2)].map((o) => ({ value: OCEAN_NAME[o] })),
      plain: true,
      hint: 'Look at which continents are next to the ring.',
      explain: [CLUE_O[id], `So the ring is on the ${OCEAN_NAME[id]}.`],
    });
  }
  const f = pick(FACTS);
  return mcq({
    prompt: f.prompt,
    answer: f.answer,
    options: [{ value: f.answer }, ...shuffle(f.pool).slice(0, 2).map((v) => ({ value: v }))],
    plain: true,
    hint: f.hint,
    explain: f.explain,
  });
}

export const continentsAndOceans: Lesson = {
  id: 'continents-and-oceans',
  title: 'Continents and Oceans',
  Thumb,
  Scene: WorldScene,
  sceneHint: 'Drag each name onto the map · Switch between Continents and Oceans',
  learn: {
    heading: 'Our world: 7 continents, 5 oceans',
    intro: 'Most of the Earth is covered by ocean. The big areas of land are called continents.',
    points: [
      { icon: Mountain, text: 'The 7 continents: North America, South America, Europe, Africa, Asia, Australia and Antarctica.' },
      { icon: Waves, text: 'The 5 oceans: Pacific, Atlantic, Indian, Arctic and Southern.' },
      { icon: Earth, text: 'Asia is the biggest continent. The Pacific is the biggest ocean.' },
    ],
  },
  steps: ['Find the Equator, the line around the middle of the Earth.', 'Find the big pieces of land: the continents.', 'Find the water between them: the oceans.', 'Use neighbours to check: what is next to what?'],
  example: {
    question: 'Which ocean is between the Americas and Europe and Africa?',
    visual: <WorldMini ring={[-35, 20]} label="A world map with a ring between the Americas and Europe and Africa" />,
    work: ['The Americas are on the left of the map.', 'Europe and Africa are in the middle.', 'The water between them is the Atlantic Ocean.'],
    answer: 'The Atlantic Ocean',
  },
  grownups: [
    'Look at a globe together: spin it and find the Pacific, the biggest ocean.',
    'Find where your family lives, and where relatives or favourite animals live, on a world map.',
    'Some places count continents differently (for example, Australia is often called Oceania with nearby islands). Here we use the common list of 7.',
  ],
  makeQuestion,
};
