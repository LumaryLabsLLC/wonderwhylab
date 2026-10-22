import { useId, useState } from 'react';
import { Earth, House, Snowflake, Sun } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { SceneSvg } from '../../../stage/widgets';
import { Draggable, mcq, Note, others } from './visuals/kit';
import { HOME_ART, HomePic, HOMES, PlaceBackdrop } from './visuals/homes';
import type { HomeId } from './visuals/homes';

const IDS: HomeId[] = ['stilt', 'steep', 'flats', 'earth', 'ger'];
const PANEL = { x0: 24, gap: 192, w: 184, top: 56, title: 34, h: 270 };
const panelX = (i: number) => PANEL.x0 + i * PANEL.gap;
const BACK_H = PANEL.h - PANEL.title;

/** A clue about what each place needs, said when a home does not suit it yet. */
const CLUE: Record<HomeId, string> = {
  stilt: 'Water here can rise after heavy rain. Which home stays up high and dry?',
  steep: 'Lots of snow falls here. Which roof lets the snow slide off?',
  flats: 'Many people live in the city and there is little land. Which home stacks families up high?',
  earth: 'It is very hot here in the day. Which home has thick walls to stay cool?',
  ger: 'Families here move with their animals to find fresh grass. Which home can be packed up and carried?',
};

function HomesScene() {
  const clip = `home${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [tray] = useState(() => shuffle(IDS));
  const [placed, setPlaced] = useState<HomeId[]>([]);
  const [picked, setPicked] = useState<HomeId | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' }>({
    text: 'People build homes to suit their place. Drag each home to the place it suits best.',
    tone: 'plain',
  });

  const panelAt = (p: Pt) => IDS.findIndex((_, i) => p.x >= panelX(i) && p.x <= panelX(i) + PANEL.w && p.y >= PANEL.top && p.y <= PANEL.top + PANEL.h + 10);

  const tryPlace = (home: HomeId, i: number) => {
    setPicked(null);
    if (i < 0) return;
    const spot = IDS[i];
    if (placed.includes(spot)) {
      setMsg({ text: 'This place already has its home. Try another place.', tone: 'nudge' });
      return;
    }
    if (home === spot) {
      const next = [...placed, home];
      setPlaced(next);
      play('correct');
      setMsg({
        text: next.length === IDS.length ? `${HOMES[home].why} Every home suits its place. You thought about the weather and the land!` : `Yes, a ${HOMES[home].name}! ${HOMES[home].why}`,
        tone: 'good',
      });
    } else {
      play('wrong');
      setMsg({ text: `Not yet. ${CLUE[spot]}`, tone: 'nudge' });
    }
  };

  return (
    <SceneSvg label="Homes around the world: drag each home to the place it suits, such as by the water, snowy mountains, a busy city, hot dry land or wide grassland">
      {IDS.map((id, i) => {
        const x = panelX(i);
        const cx = x + PANEL.w / 2;
        const done = placed.includes(id);
        return (
          <g
            key={id}
            onClick={() => (picked ? tryPlace(picked, i) : done && setMsg({ text: `A ${HOMES[id].name}: ${HOMES[id].why}`, tone: 'plain' }))}
            style={{ cursor: picked || done ? 'pointer' : undefined }}
            data-nopan={picked || done ? true : undefined}
          >
            <clipPath id={`${clip}-${i}`}>
              <rect x={x} y={PANEL.top} width={PANEL.w} height={PANEL.h} rx={14} />
            </clipPath>
            <g clipPath={`url(#${clip}-${i})`}>
              <svg x={x} y={PANEL.top + PANEL.title} width={PANEL.w} height={BACK_H} overflow="hidden">
                <PlaceBackdrop id={id} w={PANEL.w} h={BACK_H} />
              </svg>
            </g>
            <rect x={x} y={PANEL.top} width={PANEL.w} height={PANEL.title} fill={C.white} />
            <text x={cx} y={PANEL.top + 23} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {HOMES[id].place}
            </text>
            <rect x={x} y={PANEL.top} width={PANEL.w} height={PANEL.h} rx={14} fill="none" stroke={C.ink} strokeWidth={2.5} />
            {done ? (
              <g transform={`translate(${cx} ${PANEL.top + PANEL.h - 58 - 44})`}>{HOME_ART[id]()}</g>
            ) : (
              <g>
                <rect x={cx - 62} y={PANEL.top + 92} width={124} height={140} rx={14} fill={picked ? shade(C.yellow, 0.4) : C.white} opacity={0.75} stroke={C.ink} strokeWidth={2} strokeDasharray="7 6" />
                <text x={cx} y={PANEL.top + 172} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.muted}>
                  ?
                </text>
              </g>
            )}
          </g>
        );
      })}

      {placed.length < IDS.length && <rect x={24} y={344} width={952} height={176} rx={18} fill={shade(C.paper, 0.4)} stroke={C.line} strokeWidth={2} />}
      {tray.map((id, k) => {
        if (placed.includes(id)) return null;
        const x = 120 + k * 190;
        const y = 420;
        return (
          <Draggable
            key={id}
            x={x}
            y={y}
            hit={64}
            label={HOMES[id].name}
            onDrop={(p) => tryPlace(id, panelAt(p))}
            onTap={() => {
              setPicked(picked === id ? null : id);
              play('tap');
            }}
          >
            {picked === id && <rect x={x - 76} y={y - 70} width={152} height={164} rx={16} fill={shade(C.yellow, 0.5)} stroke={C.ink} strokeWidth={2} strokeDasharray="6 5" />}
            <g transform={`translate(${x} ${y + 6}) scale(0.9)`}>{HOME_ART[id]()}</g>
            <text x={x} y={y + 86} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink} pointerEvents="none">
              {HOMES[id].name}
            </text>
          </Draggable>
        );
      })}
      <Note x={24} y={536} w={952} text={msg.text} tone={msg.tone} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={2} y={2} width={116} height={76} rx={8} fill="#dff1ff" />
      <rect x={2} y={58} width={116} height={20} fill={shade(C.green, 0.25)} />
      <g transform="translate(32 34) scale(0.4)">{HOME_ART.stilt()}</g>
      <g transform="translate(88 38) scale(0.38)">{HOME_ART.ger()}</g>
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

const NEEDS: Record<HomeId, string> = {
  stilt: 'next to a river that sometimes floods',
  steep: 'where lots of heavy snow falls',
  flats: 'in a busy city with very little land',
  earth: 'in a very hot, dry place',
  ger: 'for a family that moves with its animals',
};

function makeQuestion(level: number): Question {
  const id = pick(IDS);
  const h = HOMES[id];
  if (level === 0) {
    return mcq({
      prompt: `Which home is best ${NEEDS[id]}?`,
      answer: h.name,
      options: [id, ...others(IDS, id, 2)].map((o) => ({ value: HOMES[o].name, art: <HomePic id={o} size={64} /> })),
      hint: 'Think about what the weather or the land is like there.',
      explain: [`We need a home ${NEEDS[id]}.`, h.why, `So the ${h.name} is best.`],
    });
  }
  if (level === 1) {
    return mcq({
      prompt: `Why does this home suit its place?`,
      visual: (
        <svg viewBox="-70 -70 140 126" role="img" aria-label={h.name}>
          {HOME_ART[id]()}
        </svg>
      ),
      answer: h.why,
      options: [id, ...others(IDS, id, 2)].map((o) => ({ value: HOMES[o].why })),
      plain: true,
      hint: 'Look closely at the picture: legs, roof, walls or shape?',
      explain: [`This is a ${h.name}.`, h.why],
    });
  }
  // Level 2: from a need to a place, without pictures.
  const place = HOMES[id].place.toLowerCase();
  const prompts: Record<HomeId, string> = {
    stilt: 'A home stands on tall legs to stay dry. Where would you most likely find it?',
    steep: 'A home has a very steep roof so heavy snow slides off. Where would you most likely find it?',
    flats: 'A tall building holds homes for many families on a small piece of land. Where would you most likely find it?',
    earth: 'A home has very thick earth walls to stay cool inside. Where would you most likely find it?',
    ger: 'A round home can be taken down and carried to a new place. Where would you most likely find it?',
  };
  return mcq({
    prompt: prompts[id],
    answer: place,
    options: [id, ...others(IDS, id, 2)].map((o) => ({ value: HOMES[o].place.toLowerCase() })),
    plain: true,
    hint: 'Ask yourself: what problem does this home solve?',
    explain: [`This home is a ${h.name}.`, h.why, `So the best answer is: ${place}.`],
  });
}

export const homesAroundTheWorld: Lesson = {
  id: 'homes-around-the-world',
  title: 'Homes Around the World',
  Thumb,
  Scene: HomesScene,
  sceneHint: 'Drag each home to the place it suits best · Tap a home to hear why',
  learn: {
    heading: 'Homes suit their places',
    intro: 'All around the world, people build homes that suit the weather and the land where they live. Every country has many kinds of homes.',
    points: [
      { icon: House, text: 'Near rivers that flood, some homes stand on stilts.' },
      { icon: Snowflake, text: 'Where lots of snow falls, steep roofs let snow slide off.' },
      { icon: Sun, text: 'In hot, dry places, thick earth walls keep homes cool.' },
      { icon: Earth, text: 'In busy cities, many families live in tall blocks of flats.' },
    ],
  },
  steps: ['Look at the place: is it wet, snowy, hot, busy or wide and open?', 'Think about what a home there needs.', 'Look at the homes: legs, roof, walls or shape.', 'Match the home to the place it suits.'],
  example: {
    question: 'Which home suits a place with lots of snow?',
    visual: (
      <svg viewBox="-70 -70 140 126" role="img" aria-label="A house with a steep, snowy roof">
        {HOME_ART.steep()}
      </svg>
    ),
    work: ['Snow is heavy when lots of it piles up.', 'A steep roof lets the snow slide off.', 'So a house with a steep roof suits a snowy place.'],
    answer: 'The steep-roof house',
  },
  grownups: [
    'Talk about your own home: what keeps you warm, cool or dry?',
    'Look at photos of homes in different places together, including your own country, and ask “Why is it built like that?”',
    'Many people in every country live in many kinds of homes; avoid “people there all live in…” and say “some people there live in…”.',
  ],
  makeQuestion,
};
