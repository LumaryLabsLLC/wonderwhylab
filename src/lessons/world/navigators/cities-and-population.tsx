import { useState } from 'react';
import { Anchor, BarChart3, Building2, Wheat } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, Emoji, mcq, Note } from '../trotters/visuals/kit';

/* ---------- A made-up land for founding settlements ---------- */

interface Site {
  id: string;
  name: string;
  at: Pt;
  water: boolean;
  food: boolean;
  trade: boolean;
  resources: boolean;
  people: number;
  icons: string[];
  why: string;
}

const SITES: Site[] = [
  { id: 'harbour', name: 'River mouth harbour', at: { x: 436, y: 516 }, water: true, food: true, trade: true, resources: false, people: 120000, icons: ['🏙️', '🏢', '🏢', '🏠', '🏠', '⚓'], why: 'Fresh water, farmland and a harbour for ships: it grew into a big port city.' },
  { id: 'bend', name: 'River bend in farmland', at: { x: 282, y: 362 }, water: true, food: true, trade: true, resources: false, people: 40000, icons: ['🏢', '🏢', '🏠', '🏠'], why: 'Water, rich farmland and river boats: a busy market town that became a city.' },
  { id: 'mine', name: 'Mountain mine', at: { x: 205, y: 120 }, water: true, food: false, trade: false, resources: true, people: 9000, icons: ['🏠', '🏠', '⛏️'], why: 'People came to dig iron and coal, but food had to be carried in, so it stayed a town.' },
  { id: 'forest', name: 'Forest clearing', at: { x: 100, y: 430 }, water: true, food: false, trade: false, resources: true, people: 3000, icons: ['🏠', '🏠'], why: 'A stream and wood for building, but poor soil for farms: a small town.' },
  { id: 'cliff', name: 'Dry clifftop', at: { x: 548, y: 360 }, water: false, food: false, trade: true, resources: false, people: 1500, icons: ['🏠'], why: 'Boats could land, but there was little fresh water, so it stayed a village.' },
  { id: 'desert', name: 'Desert', at: { x: 520, y: 150 }, water: false, food: false, trade: false, resources: false, people: 50, icons: ['⛺'], why: 'No water and no farms: very few people could live here.' },
];

const FACTORS: { key: 'water' | 'food' | 'trade' | 'resources'; emoji: string; name: string }[] = [
  { key: 'water', emoji: '💧', name: 'fresh water' },
  { key: 'food', emoji: '🌾', name: 'farmland' },
  { key: 'trade', emoji: '⛵', name: 'transport and trade' },
  { key: 'resources', emoji: '⛏️', name: 'resources' },
];

const RIVER = 'M120,70 C150,120 180,170 210,230 S240,320 282,362 S350,420 370,450 S410,505 470,548';
const COAST = [[640, 300], [600, 330], [575, 380], [540, 440], [470, 520], [400, 590], [330, 660], [640, 660]];

function Land() {
  return (
    <g>
      <rect x={20} y={20} width={620} height={640} rx={16} fill="#d4ebb8" />
      {/* Desert */}
      <path d="M360,20 L624,20 Q640,20 640,36 L640,280 C580,270 520,250 470,240 C420,230 380,190 360,150 Z" fill="#f1d595" />
      {/* Mountains */}
      <path d="M20,36 Q20,20 36,20 L320,20 C300,90 250,150 170,170 C110,185 60,200 20,215 Z" fill="#c9b48a" />
      {[[70, 90, 60], [140, 60, 66], [250, 70, 56], [90, 160, 46], [300, 40, 40]].map(([x, y, s], i) => (
        <polygon key={i} points={`${x - s * 0.6},${y + s * 0.42} ${x},${y - s * 0.55} ${x + s * 0.6},${y + s * 0.42}`} fill="#9c8a6c" stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      {/* Forest */}
      {[[60, 330], [110, 350], [70, 390], [150, 400], [60, 470], [140, 470], [100, 510], [170, 440], [50, 540]].map(([x, y], i) => (
        <Emoji key={i} x={x} y={y} size={26}>
          🌲
        </Emoji>
      ))}
      {/* Farmland */}
      {[[230, 400, 0], [300, 300, 1], [340, 380, 0], [220, 300, 1], [310, 460, 1]].map(([x, y, a], i) => (
        <rect key={i} x={x} y={y} width={64} height={40} rx={4} fill={a ? '#e8dc8a' : '#b8d98a'} stroke={shade('#b8d98a', -0.25)} strokeWidth={1.2} />
      ))}
      {/* Sea and river */}
      <polygon points={COAST.map((p) => p.join(',')).join(' ')} fill={shade(C.blue, 0.5)} />
      <path d={RIVER} fill="none" stroke={shade(C.blue, 0.1)} strokeWidth={9} strokeLinecap="round" />
      <path d="M205,125 C220,150 235,170 230,200" fill="none" stroke={shade(C.blue, 0.1)} strokeWidth={4} strokeLinecap="round" />
      <path d="M100,430 C130,440 170,450 200,470" fill="none" stroke={shade(C.blue, 0.1)} strokeWidth={4} strokeLinecap="round" />
      <g pointerEvents="none" fontSize={15} fontWeight={700} fill={C.ink2}>
        <text x={40} y={250}>Mountains</text>
        <text x={540} y={60}>Desert</text>
        <text x={40} y={600}>Forest</text>
        <text x={560} y={620}>Sea</text>
      </g>
      <rect x={20} y={20} width={620} height={640} rx={16} fill="none" stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

/* ---------- Continent populations (UN estimates for 2024, rounded) ---------- */

const POP: { name: string; m: number; label: string; color: string }[] = [
  { name: 'Asia', m: 4800, label: '4.8 billion', color: shade(C.red, 0.3) },
  { name: 'Africa', m: 1500, label: '1.5 billion', color: shade(C.yellow, 0.1) },
  { name: 'Europe', m: 740, label: '740 million', color: shade(C.purple, 0.3) },
  { name: 'North America', m: 610, label: '610 million', color: shade(C.orange, 0.2) },
  { name: 'South America', m: 440, label: '440 million', color: shade(C.green, 0.1) },
  { name: 'Oceania', m: 46, label: '46 million', color: shade(C.pink, 0.2) },
];

const CH = { x0: 150, y0: 520, top: 120, max: 5000, gap: 136, w: 84 };
const yOf = (m: number) => CH.y0 - (m / CH.max) * (CH.y0 - CH.top);
const mOf = (y: number) => clamp(Math.round((((CH.y0 - y) / (CH.y0 - CH.top)) * CH.max) / 50) * 50, 0, CH.max);

function GuessBar({ i, value, onChange, locked }: { i: number; value: number; onChange: (m: number) => void; locked: boolean }) {
  const drag = useSvgDrag((p) => !locked && onChange(mOf(p.y)));
  const x = CH.x0 + i * CH.gap;
  const y = yOf(value);
  return (
    <g>
      <rect x={x} y={y} width={CH.w} height={CH.y0 - y} fill={locked ? 'none' : shade(POP[i].color, 0.35)} stroke={C.ink} strokeWidth={2} strokeDasharray={locked ? '7 5' : undefined} />
      {!locked && (
        <g>
          <rect x={x - 6} y={CH.top - 20} width={CH.w + 12} height={CH.y0 - CH.top + 30} fill="transparent" {...drag} role="slider" aria-label={`Your guess for ${POP[i].name}`} aria-valuetext={`${value} million`} />
          <circle cx={x + CH.w / 2} cy={y} r={14} fill={C.yellow} stroke={C.ink} strokeWidth={2.5} pointerEvents="none" />
        </g>
      )}
    </g>
  );
}

/* ---------- Scene ---------- */

type Mode = 'build' | 'chart';

function CityScene() {
  const [mode, setMode] = useState<Mode>('build');
  const [settled, setSettled] = useState<string[]>([]);
  const [grown, setGrown] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [guess, setGuess] = useState<number[]>(() => POP.map(() => 1000));
  const [revealed, setRevealed] = useState(false);

  const settle = (p: Pt) => {
    const site = SITES.find((s) => Math.hypot(s.at.x - p.x, s.at.y - p.y) < 50);
    if (!site || settled.includes(site.id) || settled.length >= 3) return;
    play('pop');
    setGrown(false);
    setSettled([...settled, site.id]);
    setNote(`You chose: ${site.name}. It has ${FACTORS.filter((f) => site[f.key]).map((f) => f.name).join(', ') || 'none of the four things'}.`);
  };

  const grow = () => {
    play('complete');
    setGrown(true);
    const best = SITES.filter((s) => settled.includes(s.id)).sort((a, b) => b.people - a.people)[0];
    setNote(`After 100 years the ${best.name.toLowerCase()} grew the most. Places with fresh water, food and easy transport grow fastest.`);
  };

  const sites = SITES.filter((s) => settled.includes(s.id)).sort((a, b) => b.people - a.people);

  return (
    <SceneSvg label={mode === 'build' ? 'A land with places to start a settlement' : 'A bar chart of how many people live on each continent'}>
      {(['build', 'chart'] as Mode[]).map((m, i) => (
        <SvgButton
          key={m}
          x={[664, 824][i]}
          y={22}
          w={150}
          h={50}
          fontSize={17}
          label={m === 'build' ? 'Build a city' : 'Population'}
          active={mode === m}
          color={mode === m ? C.yellow : C.card}
          onClick={() => setMode(m)}
        />
      ))}

      {mode === 'build' && (
        <g>
          <Land />
          {SITES.map((s) => {
            const here = settled.includes(s.id);
            const scale = grown && here ? 1 : 0;
            return (
              <g key={s.id}>
                {!here && <circle cx={s.at.x} cy={s.at.y} r={26} fill={C.white} fillOpacity={0.5} stroke={C.ink} strokeWidth={2.5} strokeDasharray="6 5" pointerEvents="none" />}
                {here && !grown && (
                  <g
                    role="button"
                    aria-label={`Remove the settlers from the ${s.name}`}
                    style={{ cursor: 'pointer' }}
                    data-nopan
                    onClick={() => {
                      setSettled(settled.filter((id) => id !== s.id));
                      setNote(null);
                    }}
                  >
                    <circle cx={s.at.x} cy={s.at.y} r={26} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
                    <Emoji x={s.at.x} y={s.at.y} size={30}>
                      🚩
                    </Emoji>
                  </g>
                )}
                {scale > 0 && (
                  <g className="pop-in" style={{ transformOrigin: `${s.at.x}px ${s.at.y}px` }} pointerEvents="none">
                    <ellipse cx={s.at.x} cy={s.at.y} rx={18 + s.icons.length * 9} ry={26} fill={C.white} fillOpacity={0.75} stroke={C.ink} strokeWidth={2} />
                    {s.icons.map((ic, k) => (
                      <Emoji key={k} x={s.at.x - (s.icons.length - 1) * 9 + k * 18} y={s.at.y - 4 + (k % 2) * 8} size={24}>
                        {ic}
                      </Emoji>
                    ))}
                    <rect x={s.at.x - 56} y={s.at.y + 30} width={112} height={26} rx={8} fill={C.ink} />
                    <text x={s.at.x} y={s.at.y + 44} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.white}>
                      {s.people.toLocaleString('en')} people
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Panel */}
          <Note x={664} y={92} w={310} text="Where would a city grow? Drag up to 3 groups of settlers onto the dashed circles, then let 100 years pass." />
          <g>
            {[0, 1, 2].map((i) =>
              i < 3 - settled.length ? (
                <Draggable key={`${settled.length}-${i}`} x={712 + i * 72} y={250} hit={30} label="Settlers: drag onto a place on the map" onDrop={settle}>
                  <circle cx={712 + i * 72} cy={250} r={28} fill={C.white} stroke={C.ink} strokeWidth={2} />
                  <Emoji x={712 + i * 72} y={250} size={30}>
                    🚩
                  </Emoji>
                </Draggable>
              ) : (
                <circle key={`e${i}`} cx={712 + i * 72} cy={250} r={28} fill="none" stroke={C.line} strokeWidth={2} strokeDasharray="5 5" />
              ),
            )}
          </g>
          <SvgButton x={664} y={296} w={200} h={52} fontSize={17} label="Let 100 years pass" color={C.teal} textColor={C.white} disabled={!settled.length || grown} onClick={grow} />
          <SvgButton x={874} y={296} w={100} h={52} fontSize={17} label="Reset" onClick={() => { setSettled([]); setGrown(false); setNote(null); }} />
          {grown ? (
            <g>
              {sites.map((s, i) => (
                <g key={s.id}>
                  <text x={668} y={390 + i * 92} fontSize={17} fontWeight={700} fill={C.ink}>
                    {s.name}: {s.people.toLocaleString('en')}
                  </text>
                  {wrap(s.why, 35).map((l, j) => (
                    <text key={j} x={668} y={412 + i * 92 + j * 19} fontSize={15} fill={C.ink2}>
                      {l}
                    </text>
                  ))}
                </g>
              ))}
            </g>
          ) : (
            note && <Note x={664} y={372} w={310} text={note} tone="good" />
          )}
          {!grown && (
            <g>
              {FACTORS.map((f, i) => (
                <g key={f.key}>
                  <Emoji x={680} y={540 + i * 30} size={20}>
                    {f.emoji}
                  </Emoji>
                  <text x={700} y={546 + i * 30} fontSize={16} fill={C.ink}>
                    {f.name}
                  </text>
                </g>
              ))}
              <text x={668} y={524} fontSize={15} fill={C.muted} className="caps">
                What helps a settlement grow
              </text>
            </g>
          )}
        </g>
      )}

      {mode === 'chart' && (
        <g>
          <text x={40} y={52} fontSize={21} fontWeight={700} fill={C.ink}>
            How many people live on each continent?
          </text>
          <text x={40} y={80} fontSize={16} fill={C.ink2}>
            {revealed ? 'Dashed bars are your guesses; solid bars are the real numbers (about, 2024).' : 'Drag each bar to your guess, then tap Reveal.'}
          </text>
          {[0, 1000, 2000, 3000, 4000, 5000].map((m) => (
            <g key={m} pointerEvents="none">
              <line x1={CH.x0 - 16} x2={CH.x0 + 5 * CH.gap + CH.w + 10} y1={yOf(m)} y2={yOf(m)} stroke={C.ink} strokeOpacity={m ? 0.15 : 0.8} strokeWidth={m ? 1.2 : 2} />
              <text x={CH.x0 - 22} y={yOf(m) + 5} textAnchor="end" fontSize={15} fill={C.ink2}>
                {m === 0 ? '0' : `${m / 1000} billion`}
              </text>
            </g>
          ))}
          {revealed &&
            POP.map((c, i) => {
              const x = CH.x0 + i * CH.gap;
              return (
                <g key={c.name} className="pop-in" style={{ transformOrigin: `${x + CH.w / 2}px ${CH.y0}px` }}>
                  <rect x={x} y={yOf(c.m)} width={CH.w} height={Math.max(2, CH.y0 - yOf(c.m))} fill={c.color} stroke={C.ink} strokeWidth={2} />
                  <text x={x + CH.w / 2} y={Math.min(yOf(c.m), yOf(guess[i])) - 10} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
                    {c.label}
                  </text>
                </g>
              );
            })}
          {POP.map((c, i) => (
            <GuessBar key={c.name} i={i} value={guess[i]} locked={revealed} onChange={(m) => setGuess((g) => g.map((v, k) => (k === i ? m : v)))} />
          ))}
          {POP.map((c, i) => (
            <text key={c.name} x={CH.x0 + i * CH.gap + CH.w / 2} y={CH.y0 + 26} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {c.name}
            </text>
          ))}
          {!revealed ? (
            <SvgButton x={40} y={580} w={160} h={54} fontSize={19} label="Reveal" color={C.teal} textColor={C.white} onClick={() => { play('correct'); setRevealed(true); }} />
          ) : (
            <g>
              <Note
                x={40}
                y={560}
                w={760}
                size={16}
                tone="good"
                text="Asia has more people than all the other continents put together. Antarctica has no permanent residents, only visiting scientists. Today more than half of the world’s 8 billion people live in towns and cities."
              />
              <SvgButton x={820} y={580} w={150} h={54} fontSize={18} label="Guess again" onClick={() => { setRevealed(false); setGuess(POP.map(() => 1000)); }} />
            </g>
          )}
        </g>
      )}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={4} y={4} width={112} height={72} rx={8} fill="#d4ebb8" />
      <polygon points="80,76 116,44 116,76" fill={shade(C.blue, 0.5)} />
      <path d="M20,10 C40,30 50,40 70,52 S86,66 92,70" fill="none" stroke={shade(C.blue, 0.1)} strokeWidth={4} strokeLinecap="round" />
      <Emoji x={74} y={44} size={22}>
        🏙️
      </Emoji>
      <rect x={4} y={4} width={112} height={72} rx={8} fill="none" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

/* ---------- Practice ---------- */

function ChartPic({ label }: { label: string }) {
  const max = 5000;
  const x0 = 122;
  const w = 228;
  const xOf = (m: number) => x0 + (m / max) * w;
  return (
    <svg viewBox="0 0 360 212" role="img" aria-label={label}>
      {[0, 1000, 2000, 3000, 4000, 5000].map((m) => (
        <g key={m}>
          <line x1={xOf(m)} x2={xOf(m)} y1={4} y2={184} stroke={C.ink} strokeOpacity={m ? 0.15 : 0.7} />
          <text x={xOf(m)} y={204} textAnchor="middle" fontSize={15} fill={C.ink2}>
            {m ? `${m / 1000} bn` : '0'}
          </text>
        </g>
      ))}
      {POP.map((c, i) => (
        <g key={c.name}>
          <text x={x0 - 8} y={24 + i * 30} textAnchor="end" fontSize={16} fontWeight={700} fill={C.ink}>
            {c.name}
          </text>
          <rect x={x0} y={8 + i * 30} width={Math.max(1.5, xOf(c.m) - x0)} height={22} fill={c.color} stroke={C.ink} strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  );
}

const RIVER_CITIES = [
  { city: 'Cairo', river: 'the Nile' },
  { city: 'London', river: 'the Thames' },
  { city: 'Paris', river: 'the Seine' },
  { city: 'Baghdad', river: 'the Tigris' },
  { city: 'Wuhan', river: 'the Yangtze' },
  { city: 'Budapest', river: 'the Danube' },
];

function makeQuestion(level: number): Question {
  const style = level === 0 ? rand(0, 2) : level === 1 ? rand(3, 5) : rand(6, 8);

  if (style === 0) {
    const answer = 'Fresh water, farmland and easy travel by boat';
    return mcq({
      prompt: 'Why did so many cities grow up beside rivers?',
      answer,
      options: [answer, 'Rivers keep cities warm in winter', 'Nobody lives far from a river', 'Rivers stop it from raining'],
      hint: 'Think about what people need every day, and how they move goods around.',
      explain: ['People need water to drink and to grow food, and river land is often good for farming.', 'Boats on rivers carried goods to trade.', `So: ${answer.toLowerCase()}.`],
    });
  }
  if (style === 1) {
    const answer = 'Beside a river, with flat farmland';
    return mcq({
      prompt: 'Where would a town be most likely to grow big?',
      answer,
      options: [
        { value: answer, emoji: '🏞️' },
        { value: 'In a dry desert far from water', emoji: '🏜️' },
        { value: 'On top of a steep, icy mountain', emoji: '🏔️' },
        { value: 'On a tiny rock far out at sea', emoji: '🪨' },
      ],
      hint: 'Which place has water, food and a way to travel?',
      explain: ['A big town needs fresh water and lots of food.', 'Flat land by a river has both, and boats can travel on the river.', `So the best place is: ${answer.toLowerCase()}.`],
    });
  }
  if (style === 2) {
    const urban = Math.random() < 0.5;
    const answer = urban ? 'Towns and cities' : 'The countryside';
    return mcq({
      prompt: urban ? 'An urban area is…' : 'A rural area is…',
      answer,
      options: ['Towns and cities', 'The countryside', 'The open ocean', 'The sky above a city'],
      ordered: true,
      hint: '“Urban” comes from the Latin word for city; “rural” comes from the word for countryside.',
      explain: urban ? ['Urban areas are built up, with many people close together.', `So urban means: ${answer.toLowerCase()}.`] : ['Rural areas have farms, fields, villages and fewer people.', `So rural means: ${answer.toLowerCase()}.`],
    });
  }
  if (style === 3) {
    const most = Math.random() < 0.5;
    const answer = most ? 'Asia' : 'Oceania';
    return mcq({
      prompt: most ? 'Which continent has the most people?' : 'Which of these continents has the fewest people?',
      visual: <ChartPic label="A bar chart of the number of people on each continent" />,
      answer,
      options: most ? ['Asia', 'Africa', 'Europe', 'North America'] : ['Oceania', 'South America', 'Europe', 'Africa'],
      hint: most ? 'Look for the longest bar.' : 'Look for the shortest bar.',
      explain: most
        ? ['The longest bar is Asia’s, at about 4.8 billion people.', `So the answer is ${answer}.`]
        : ['The shortest bar is Oceania’s, at about 46 million people.', `So the answer is ${answer}.`],
    });
  }
  if (style === 4) {
    const c = pick(POP.slice(0, 5));
    const options = ['4.8 billion', '1.5 billion', '740 million', '440 million', '46 million'];
    return mcq({
      prompt: `About how many people live in ${c.name}?`,
      visual: <ChartPic label="A bar chart of the number of people on each continent" />,
      answer: c.label,
      options: [c.label, ...shuffle(options.filter((o) => o !== c.label)).slice(0, 3)],
      hint: 'Find the bar, then read down to the numbers along the bottom. 1 bn means 1 billion (1,000 million).',
      explain: [`${c.name}’s bar reaches about ${c.m.toLocaleString('en')} million.`, `That is about ${c.label} people.`],
    });
  }
  if (style === 5) {
    const r = pick(RIVER_CITIES);
    const answer = r.river;
    const others = shuffle(RIVER_CITIES.filter((x) => x !== r)).slice(0, 3).map((x) => x.river);
    return mcq({
      prompt: `${r.city} grew up beside which river?`,
      answer: answer[0].toUpperCase() + answer.slice(1),
      options: [answer, ...others].map((o) => o[0].toUpperCase() + o.slice(1)),
      hint: 'Think about which country the city is in, then which big river flows through it.',
      explain: [`${r.city} was built on the banks of ${answer}.`, 'The river gave water, food and a way to trade.', `So the answer is ${answer}.`],
    });
  }
  if (style === 6) {
    const [a, b] = shuffle(POP.slice(0, 5)).slice(0, 2).sort((x, y) => y.m - x.m);
    const answer = a.m - b.m;
    return {
      prompt: `About ${a.m.toLocaleString('en')} million people live in ${a.name} and about ${b.m.toLocaleString('en')} million in ${b.name}. How many million more live in ${a.name}?`,
      answer: String(answer),
      hint: 'Subtract the smaller number from the bigger one.',
      explain: [`${a.m.toLocaleString('en')} − ${b.m.toLocaleString('en')} = ${answer.toLocaleString('en')}.`, `About ${answer} million more people live in ${a.name}.`],
    };
  }
  if (style === 7) {
    const total = pick([10, 20, 40, 50]);
    const pct = pick([30, 40, 60, 70, 80, 90]);
    const urban = (total * pct) / 100;
    return {
      prompt: `A country has ${total} million people. ${urban} million of them live in towns and cities. What percentage of people live in urban areas?`,
      answer: String(pct),
      hint: 'Percentage means “out of 100”. Divide the urban people by the total, then multiply by 100.',
      explain: [`${urban} ÷ ${total} = ${urban / total}.`, `${urban / total} × 100 = ${pct}.`, `${pct}% of people live in towns and cities.`],
    };
  }
  const q = pick([
    {
      prompt: 'Why do very few people live in the middle of the Sahara?',
      answer: 'There is very little water for drinking or farming',
      wrong: ['It is too close to the North Pole', 'It is always under water', 'There is no sunlight there'],
      why: ['People need water every day, and farms need it too.', 'The Sahara gets very little rain.', 'So: there is very little water for drinking or farming.'],
    },
    {
      prompt: 'Johannesburg in South Africa grew very fast after 1886. What was found there?',
      answer: 'Gold',
      wrong: ['A new river', 'A sandy beach', 'Ice'],
      why: ['In 1886 people found gold in the rocks there.', 'Miners and businesses rushed in, and a city grew.', 'The answer is gold, a natural resource.'],
    },
    {
      prompt: 'Sydney, Rio de Janeiro and New York all grew around…',
      answer: 'Sheltered natural harbours',
      wrong: ['Deserts', 'Volcanoes', 'Glaciers'],
      why: ['Ships need calm, deep water to load and unload safely.', 'These cities grew where the coast made safe harbours.', 'So they grew around sheltered natural harbours.'],
    },
  ]);
  return mcq({
    prompt: q.prompt,
    answer: q.answer,
    options: [q.answer, ...q.wrong],
    hint: 'Think about what people need: water, food, work and ways to travel.',
    explain: q.why,
  });
}

export const citiesAndPopulation: Lesson = {
  id: 'cities-and-population',
  title: 'Cities and Populations',
  Thumb,
  Scene: CityScene,
  sceneHint: 'Found settlements and watch them grow, then guess the population chart',
  learn: {
    heading: 'Where people live, and why',
    intro:
      'More than 8 billion people live on Earth, but they are not spread out evenly. People settle where life is easier: near water, good farmland, trade routes and useful resources.',
    points: [
      { icon: Anchor, text: 'Many great cities began by rivers or sheltered harbours: Cairo on the Nile, London on the Thames, Sydney on its harbour.' },
      { icon: Wheat, text: 'Fresh water and good farmland feed a growing town. Deserts and icy mountains have few people.' },
      { icon: Building2, text: 'Urban areas are towns and cities; rural areas are the countryside. Today more than half of all people live in urban areas.' },
      { icon: BarChart3, text: 'Asia has the most people: about 4.8 billion, more than all the other continents together.' },
    ],
  },
  steps: [
    'Look for fresh water: a river, lake or spring.',
    'Look for food: flat, fertile land for farms, or fishing.',
    'Look for transport and trade: a river, coast or harbour.',
    'Look for resources such as wood, coal, metals or gold. The more of these a place has, the bigger it can grow.',
  ],
  example: {
    question: 'Two villages start at the same time. One is at a river mouth with a harbour; the other is in a dry valley. Which grows bigger?',
    work: ['The river mouth has fresh water and farmland.', 'Its harbour lets ships trade with the world.', 'The dry valley lacks water, so it can only feed a few people.'],
    answer: 'The village at the river mouth.',
  },
  grownups: [
    'Population figures are UN estimates for 2024, rounded. City sizes vary a lot depending on where you draw the city’s edge, so different sources disagree.',
    'Look at your own town: why was it built where it is? Is there a river, a crossing point, a harbour or a mine?',
    'Compare a population map with a physical map: dense areas often follow rivers and coasts.',
    'Talk about pros and cons of city and country life without judging either.',
  ],
  makeQuestion,
};
