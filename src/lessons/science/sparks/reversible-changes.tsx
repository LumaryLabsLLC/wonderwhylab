import { useEffect, useRef, useState } from 'react';
import { Flame, Snowflake, Undo2, Wand2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { EMOJI_FONT } from '../../../games/reading/words';
import { Callout } from '../../../stage/Callout';
import { ExplainCard, PredictCard, wrap } from '../../../stage/Predict';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { DragToken } from './visuals/DragToken';
import { reducedMotion } from './visuals/anim';
import { byLevel, mcq } from './q';

type ItemId = 'ice' | 'chocolate' | 'bread' | 'cake' | 'egg';

interface Item {
  id: ItemId;
  name: string;
  heated: string;
  cooled: string;
  /** The starting form, for "will it go back to …?" */
  back: string;
  reversible: boolean;
  because: string;
}

/** Heat something, then cool it: does it go back? Melting can be undone; cooking can't. */
const ITEMS: Item[] = [
  { id: 'ice', name: 'ice', heated: 'water', cooled: 'ice', back: 'ice', reversible: true, because: 'Melting is a change we can undo. The cold froze the water back into ice.' },
  { id: 'chocolate', name: 'chocolate', heated: 'melted chocolate', cooled: 'solid chocolate', back: 'solid chocolate', reversible: true, because: 'Melting is a change we can undo. Cooling made the chocolate solid again, just in a new shape.' },
  { id: 'bread', name: 'bread', heated: 'toast', cooled: 'toast', back: 'bread', reversible: false, because: 'Toasting makes new materials. Cooling can’t turn toast back into bread.' },
  { id: 'cake', name: 'cake mix', heated: 'a cupcake', cooled: 'a cupcake', back: 'cake mix', reversible: false, because: 'Baking makes new materials. A cake can’t turn back into runny cake mix.' },
  { id: 'egg', name: 'egg', heated: 'a cooked egg', cooled: 'a cooked egg', back: 'a raw egg', reversible: false, because: 'Cooking changes the egg for good. A cooked egg can’t turn runny again.' },
];
const byId = (id: ItemId) => ITEMS.find((i) => i.id === id)!;

type Look = 'raw' | 'heated' | 'cooled';
const EMOJI: Record<ItemId, Partial<Record<Look, string>>> = {
  ice: { raw: '🧊', cooled: '🧊' },
  chocolate: { raw: '🍫' },
  bread: { raw: '🍞' },
  cake: { raw: '🥣', heated: '🧁', cooled: '🧁' },
  egg: { raw: '🥚', heated: '🍳', cooled: '🍳' },
};

function Toast() {
  return (
    <g>
      <path d="M-34,34 L-34,-8 Q-44,-38 -14,-40 L14,-40 Q44,-38 34,-8 L34,34 Z" fill="#7a4a22" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M-26,28 L-26,-6 Q-34,-30 -10,-32 L10,-32 Q34,-30 26,-6 L26,28 Z" fill="#c98a4b" />
      <path d="M-14,-6 l10,8 M6,8 l10,-6 M-10,16 l8,4" stroke="#9a6431" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** What the item looks like before heating, after heating, and after cooling. */
function ItemArt({ id, look, size = 64 }: { id: ItemId; look: Look; size?: number }) {
  const k = size / 64;
  const emoji = EMOJI[id][look];
  if (emoji)
    return (
      <text textAnchor="middle" dominantBaseline="central" fontSize={size} fontFamily={EMOJI_FONT}>
        {emoji}
      </text>
    );
  return (
    <g transform={`scale(${k})`}>
      {id === 'ice' && (
        <g>
          <ellipse cx={0} cy={18} rx={46} ry={14} fill="#7cc4f0" stroke={C.ink} strokeWidth={2.5} />
          <ellipse cx={-14} cy={14} rx={12} ry={3.5} fill={C.white} opacity={0.8} />
        </g>
      )}
      {id === 'chocolate' && look === 'heated' && (
        <g>
          <ellipse cx={0} cy={18} rx={44} ry={14} fill="#6b3e26" stroke={C.ink} strokeWidth={2.5} />
          <ellipse cx={-12} cy={14} rx={12} ry={3} fill="#a0674a" />
        </g>
      )}
      {id === 'chocolate' && look === 'cooled' && (
        <g>
          <rect x={-40} y={2} width={80} height={26} rx={12} fill="#5a321e" stroke={C.ink} strokeWidth={2.5} />
          <rect x={-30} y={7} width={40} height={6} rx={3} fill="#8a5636" />
        </g>
      )}
      {id === 'bread' && <Toast />}
    </g>
  );
}

const ARROW_X = 330;
const HEAT = { x: 40, y: 160, w: 270, h: 300 };
const COOL = { x: 350, y: 160, w: 270, h: 300 };
const ITEM_Y = 330;

type Phase = 'empty' | 'raw' | 'heating' | 'heated' | 'cooling' | 'cooled';
const BACK = 'Yes';
const STAYS = 'No';

function ChangeScene() {
  const [item, setItem] = useState<ItemId | null>(null);
  const [phase, setPhase] = useState<Phase>('empty');
  const [p, setP] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [results, setResults] = useState<ItemId[]>([]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  const it = item ? byId(item) : null;
  const busy = phase === 'heating' || phase === 'cooling';

  const animate = (from: Phase, to: Phase) => {
    window.clearInterval(timer.current);
    setPhase(from);
    setP(0);
    if (reducedMotion()) {
      setP(1);
      setPhase(to);
      return;
    }
    let k = 0;
    timer.current = window.setInterval(() => {
      k += 1;
      setP(k / 40);
      if (k >= 40) {
        window.clearInterval(timer.current);
        setPhase(to);
      }
    }, 38);
  };

  const choose = (id: ItemId) => {
    if (busy || (phase !== 'empty' && phase !== 'raw')) return;
    setItem(id);
    setPhase('raw');
    setGuess(null);
    play('pop');
  };

  const heat = () => {
    if (phase !== 'raw') return;
    play('whoosh');
    animate('heating', 'heated');
  };

  const cool = () => {
    if (phase !== 'heated' || !guess || !it) return;
    play('whoosh');
    animate('cooling', 'cooled');
    window.setTimeout(() => play(it.reversible ? 'correct' : 'pop'), reducedMotion() ? 0 : 1550);
  };

  const next = () => {
    if (it) setResults((r) => (r.includes(it.id) ? r : [...r, it.id]));
    setItem(null);
    setPhase('empty');
    setGuess(null);
    setP(0);
  };

  const restart = () => {
    window.clearInterval(timer.current);
    setResults([]);
    setItem(null);
    setPhase('empty');
    setGuess(null);
  };

  const heatOn = phase === 'heating';
  const coldOn = phase === 'cooling';
  const onCool = phase === 'cooling' || phase === 'cooled';

  // Item drawing in the right station with a cross-fade while it changes.
  let art = null;
  if (it) {
    const at = onCool ? COOL.x + COOL.w / 2 : HEAT.x + HEAT.w / 2;
    const layers: { look: Look; o: number }[] =
      phase === 'raw'
        ? [{ look: 'raw', o: 1 }]
        : phase === 'heating'
          ? [
              { look: 'raw', o: 1 - p },
              { look: 'heated', o: p },
            ]
          : phase === 'heated'
            ? [{ look: 'heated', o: 1 }]
            : phase === 'cooling' && it.reversible
              ? [
                  { look: 'heated', o: 1 - p },
                  { look: 'cooled', o: p },
                ]
              : [{ look: phase === 'cooled' ? 'cooled' : 'heated', o: 1 }];
    const label = phase === 'raw' || (phase === 'heating' && p < 0.5) ? it.name : phase === 'cooled' ? (it.reversible ? it.cooled : `still ${it.heated}`) : it.heated;
    art = (
      <g>
        {layers.map((l) => (
          <g key={l.look} transform={`translate(${at} ${ITEM_Y})`} opacity={l.o}>
            <ItemArt id={it.id} look={l.look} size={76} />
          </g>
        ))}
        <text x={at} y={ITEM_Y + 66} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
          {label}
        </text>
      </g>
    );
  }

  const message =
    phase === 'empty'
      ? results.length === ITEMS.length
        ? 'You tested them all! Which changes could you undo?'
        : 'Drag something from the tray onto the hot plate.'
      : phase === 'raw'
        ? `Now heat the ${it!.name}. Watch what happens!`
        : phase === 'heating'
          ? 'Heating…'
          : phase === 'heated'
            ? guess
              ? 'Now cool it down in the freezer.'
              : `The ${it!.name} changed into ${it!.heated}. Make a guess first.`
            : phase === 'cooling'
              ? 'Cooling…'
              : it!.reversible
                ? `It went back to ${it!.cooled}!`
                : `It is still ${it!.heated}. It didn’t go back.`;

  return (
    <SceneSvg label="Heat things, then cool them, to see which changes can be undone">
      {/* Tray */}
      <rect x={40} y={118} width={580} height={10} rx={5} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      {ITEMS.map((x, i) =>
        x.id === item || results.includes(x.id) ? null : (
          <DragToken
            key={`${x.id}-${item}`}
            x={96 + i * 116}
            y={64}
            label={x.name}
            disabled={busy || (phase !== 'empty' && phase !== 'raw')}
            onTap={() => choose(x.id)}
            onDrop={(pt) => {
              if (pt.x >= HEAT.x && pt.x <= HEAT.x + HEAT.w && pt.y >= HEAT.y - 20 && pt.y <= HEAT.y + HEAT.h) choose(x.id);
            }}
          >
            <rect x={-50} y={-42} width={100} height={86} fill="transparent" />
            <g transform="translate(0 -8)">
              <ItemArt id={x.id} look="raw" size={44} />
            </g>
            <text y={36} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.ink}>
              {x.name}
            </text>
          </DragToken>
        ),
      )}

      {/* Heat station */}
      <rect x={HEAT.x} y={HEAT.y} width={HEAT.w} height={HEAT.h} rx={18} fill={shade(C.orange, 0.88)} stroke={C.ink} strokeWidth={2} />
      <text x={HEAT.x + 18} y={HEAT.y + 30} fontSize={16} fontWeight={700} fill={C.ink}>
        🔥 Heat
      </text>
      <rect x={HEAT.x + 50} y={HEAT.y + 250} width={HEAT.w - 100} height={24} rx={8} fill={heatOn ? C.red : '#8a93a6'} stroke={C.ink} strokeWidth={2.5} />
      <rect x={HEAT.x + 70} y={HEAT.y + 274} width={HEAT.w - 140} height={22} fill="#5b6475" stroke={C.ink} strokeWidth={2} />
      {heatOn &&
        [-50, 0, 50].map((dx, i) => (
          <path key={dx} d={`M${HEAT.x + HEAT.w / 2 + dx},${HEAT.y + 120 - ((p * 60 + i * 20) % 40)} q8,-10 0,-20 t0,-20`} fill="none" stroke={C.red} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
        ))}

      {/* Cool station */}
      <rect x={COOL.x} y={COOL.y} width={COOL.w} height={COOL.h} rx={18} fill={shade(C.blue, 0.85)} stroke={C.ink} strokeWidth={2} />
      <text x={COOL.x + 18} y={COOL.y + 30} fontSize={16} fontWeight={700} fill={C.ink}>
        ❄️ Freezer
      </text>
      <rect x={COOL.x + 40} y={COOL.y + 256} width={COOL.w - 80} height={20} rx={6} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {coldOn &&
        [-80, -30, 40, 85].map((dx, i) => (
          <text key={dx} x={COOL.x + COOL.w / 2 + dx} y={COOL.y + 80 + ((p * 120 + i * 30) % 100)} textAnchor="middle" fontSize={20} fill={C.blue}>
            ❄
          </text>
        ))}
      <text x={ARROW_X} y={HEAT.y + 160} textAnchor="middle" dominantBaseline="central" fontSize={30} fill={C.muted}>
        →
      </text>
      {art}

      <SvgButton x={HEAT.x} y={474} w={HEAT.w} h={56} fontSize={19} label={heatOn ? 'Heating…' : 'Heat it 🔥'} color={C.orange} textColor={C.white} disabled={phase !== 'raw'} onClick={heat} />
      <SvgButton x={COOL.x} y={474} w={COOL.w} h={56} fontSize={19} label={coldOn ? 'Cooling…' : 'Cool it ❄️'} color={C.blue} textColor={C.white} disabled={phase !== 'heated' || !guess} onClick={cool} />
      <rect x={40} y={550} width={580} height={64} rx={14} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {wrap(message, 56).map((line, i, all) => (
        <text key={i} x={330} y={582 + (i - (all.length - 1) / 2) * 22} textAnchor="middle" dominantBaseline="central" fontSize={17} fill={C.ink}>
          {line}
        </text>
      ))}

      {/* Predict → observe → explain, before the cooling */}
      {it && phase === 'cooled' ? (
        <ExplainCard x={650} y={30} w={310} prediction={guess} actual={it.reversible ? BACK : STAYS} because={it.because} onAgain={next} />
      ) : it && (phase === 'heated' || phase === 'cooling') ? (
        <PredictCard x={650} y={30} w={310} question={`If we cool the ${it.heated.replace(/^a /, '')} down, will it go back to ${it.back}?`} options={[BACK, STAYS]} prediction={guess} onPredict={setGuess} />
      ) : (
        <g>
          <rect x={650} y={30} width={310} height={110} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2} />
          {['1. Heat something.', '2. Guess: will it go back?', '3. Cool it and see!'].map((line, i) => (
            <text key={i} x={670} y={64 + i * 28} fontSize={17} fill={C.ink}>
              {line}
            </text>
          ))}
        </g>
      )}

      {/* Results */}
      {[true, false].map((rev, j) => {
        const y = 300 + j * 176;
        const list = results.filter((id) => byId(id).reversible === rev);
        return (
          <g key={String(rev)}>
            <rect x={650} y={y} width={310} height={160} rx={16} fill={rev ? shade(C.green, 0.85) : shade(C.red, 0.88)} stroke={C.ink} strokeWidth={2} />
            <text x={668} y={y + 28} fontSize={17} fontWeight={700} fill={C.ink}>
              {rev ? '↩ We can undo it' : '✋ We can’t undo it'}
            </text>
            {list.map((id, i) => (
              <g key={id} transform={`translate(${704 + i * 100} ${y + 88})`}>
                <ItemArt id={id} look="raw" size={40} />
                <text y={44} textAnchor="middle" fontSize={15} fill={C.ink}>
                  {byId(id).name}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      {results.length === ITEMS.length && phase === 'empty' && <SvgButton x={650} y={150} w={310} h={50} fontSize={17} label="Start again" onClick={restart} />}

      <Callout at={[ARROW_X, HEAT.y + 160]} box={[190, 214]} w={240} icon={Undo2} title="Can we undo it?" text="A change we can undo is reversible. Melting and freezing are reversible." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={14} width={50} height={56} rx={8} fill={shade(C.orange, 0.8)} stroke={C.ink} strokeWidth={2} />
      <rect x={64} y={14} width={50} height={56} rx={8} fill={shade(C.blue, 0.8)} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={31} cy={50} rx={16} ry={5} fill="#6b3e26" stroke={C.ink} strokeWidth={1.5} />
      <rect x={75} y={38} width={28} height={16} rx={4} fill="#5a321e" stroke={C.ink} strokeWidth={1.5} />
      <path d="M50,30 q10,-14 20,0" fill="none" stroke={C.ink} strokeWidth={2} />
      <path d="M66,26 l4,4 l-5,2" fill="none" stroke={C.ink} strokeWidth={2} />
    </svg>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────
interface Change {
  name: string;
  pic: string;
  reversible: boolean;
  why: string;
}
const CHANGES: Change[] = [
  { name: 'ice melting', pic: '🧊 ☀️', reversible: true, why: 'Water can be frozen back into ice.' },
  { name: 'water freezing', pic: '💧 ❄️', reversible: true, why: 'Ice can melt back into water.' },
  { name: 'chocolate melting', pic: '🍫 ☀️', reversible: true, why: 'Melted chocolate goes solid again when it cools.' },
  { name: 'butter melting', pic: '🧈 ♨️', reversible: true, why: 'Melted butter goes solid again in the fridge.' },
  { name: 'toasting bread', pic: '🍞 ♨️', reversible: false, why: 'Toasting makes new materials. Toast can’t turn back into bread.' },
  { name: 'baking a cake', pic: '🥣 → 🎂', reversible: false, why: 'Baking makes new materials. A cake can’t turn back into cake mix.' },
  { name: 'cooking an egg', pic: '🥚 → 🍳', reversible: false, why: 'A cooked egg can’t turn runny again.' },
  { name: 'burning paper', pic: '📄 🔥', reversible: false, why: 'Burning turns paper into ash and smoke. They can’t turn back into paper.' },
  { name: 'burning wood', pic: '🪵 🔥', reversible: false, why: 'Burning turns wood into ash and smoke. They can’t turn back into wood.' },
];

function ChangePic({ c }: { c: Change }) {
  return (
    <svg viewBox="0 0 180 90" role="img" aria-label={c.name}>
      <text x={90} y={40} textAnchor="middle" dominantBaseline="central" fontSize={40} fontFamily={EMOJI_FONT}>
        {c.pic}
      </text>
      <text x={90} y={80} textAnchor="middle" fontSize={16} fontWeight={600} fill={C.ink}>
        {c.name}
      </text>
    </svg>
  );
}

function canUndoPics(): Question {
  const right = pick(CHANGES.filter((c) => c.reversible && !c.name.startsWith('butter')));
  const wrong = pick(CHANGES.filter((c) => !c.reversible && !c.name.startsWith('burning')));
  return mcq({
    prompt: 'Which change can we undo?',
    answer: right.name,
    wrong: [wrong.name],
    labels: { [right.name]: <ChangePic c={right} />, [wrong.name]: <ChangePic c={wrong} /> },
    names: { [right.name]: right.name, [wrong.name]: wrong.name },
    hint: 'Which one could you turn back by warming or cooling it?',
    explain: [right.why, wrong.why, `So we can undo ${right.name}.`],
  });
}

function warmChocolate(): Question {
  return mcq({
    prompt: 'What happens to chocolate when it gets warm?',
    visual: <ChangePic c={CHANGES[2]} />,
    answer: 'It melts',
    wrong: ['It freezes', 'It turns into bread'],
    hint: 'Think of chocolate in your hand on a hot day.',
    explain: ['Warmth makes solid chocolate soft and runny.', 'So it melts.'],
  });
}

function isReversible(level: number): Question {
  const pool = level === 1 ? CHANGES.filter((c) => !c.name.startsWith('burning')) : CHANGES;
  const c = pick(pool);
  const yes = 'Yes, we can undo it';
  const no = 'No, we can’t undo it';
  return mcq({
    prompt: `Can we undo ${c.name}?`,
    visual: <ChangePic c={c} />,
    answer: c.reversible ? yes : no,
    wrong: [c.reversible ? no : yes],
    hint: 'Melting and freezing can be undone. Cooking and burning make new materials.',
    explain: [c.why, c.reversible ? `So yes, we can undo it.` : `So no, we can’t undo it.`],
  });
}

function setChocolate(): Question {
  return mcq({
    prompt: 'How do you make melted chocolate solid again?',
    answer: 'Cool it down',
    wrong: ['Heat it more', 'Add water'],
    hint: 'What made it melt? Do the opposite.',
    explain: ['Heat made the chocolate melt.', 'To undo melting, take the heat away.', 'So cool it down.'],
  });
}

function oddOneOut(): Question {
  const odd = pick(CHANGES.filter((c) => !c.reversible));
  const others = shuffle(CHANGES.filter((c) => c.reversible)).slice(0, 2);
  return mcq({
    prompt: 'Which change can we NOT undo?',
    answer: odd.name,
    wrong: others.map((c) => c.name),
    hint: 'Look for a change that makes new materials, like cooking or burning.',
    explain: [`${others[0].name[0].toUpperCase()}${others[0].name.slice(1)} and ${others[1].name} can be undone.`, odd.why, `So we can’t undo ${odd.name}.`],
  });
}

function burning(): Question {
  const thing = pick(['wood', 'paper']);
  return mcq({
    prompt: `${thing === 'wood' ? 'Wood burns on a campfire' : 'Paper burns'} and turns into ash and smoke. Can the ash turn back into ${thing}?`,
    answer: 'No, burning makes new materials',
    wrong: ['Yes, if you cool it down', 'Yes, if you add water'],
    hint: 'Is burning like melting, or like cooking?',
    explain: ['Burning changes the material into new things: ash and smoke.', `Cooling or wetting the ash won’t make ${thing} again.`, 'So: no, burning makes new materials.'],
  });
}

function whyToast(): Question {
  return mcq({
    prompt: 'Why can’t toast turn back into bread when it cools?',
    answer: 'Heating made new materials',
    wrong: ['It is too cold', 'It got wet'],
    hint: 'What did the heat do inside the bread?',
    explain: ['Toasting changes what the bread is made of.', 'Heating made new materials, which don’t change back.', 'So toast stays toast.'],
  });
}

export const reversibleChanges: Lesson = {
  id: 'reversible-changes',
  title: 'Changes We Can Undo',
  Thumb,
  Scene: ChangeScene,
  sceneHint: 'Put something on the hot plate · Heat it · Guess, then cool it in the freezer',
  learn: {
    heading: 'Changes we can undo',
    intro: 'Heating and cooling change things. Some changes can be undone: ice melts into water, and water freezes back into ice. Other changes can’t: once bread is toasted or a cake is baked, it can’t go back.',
    points: [
      { icon: Undo2, text: 'Melting and freezing can be undone. They are reversible.' },
      { icon: Flame, text: 'Cooking and burning make new materials. They can’t be undone.' },
      { icon: Snowflake, text: 'Cooling melted chocolate makes it solid again.' },
      { icon: Wand2, text: 'Test it: heat, cool, and see if it goes back.' },
    ],
  },
  steps: ['Put something on the hot plate.', 'Heat it and watch how it changes.', 'Guess: if we cool it, will it go back?', 'Cool it in the freezer and see.', 'Sort it: can we undo it, or not?'],
  example: {
    question: 'Chocolate melts in the sun. Can we undo it?',
    work: ['Melting is a change of state, like ice to water.', 'Put the melted chocolate in the fridge.', 'It goes solid again.'],
    answer: 'Yes. Melting chocolate is reversible.',
  },
  grownups: [
    'Heating needs a grown-up. Try melting chocolate in a bowl over warm water, then pour it into a mould and chill it.',
    'Compare with something that can’t go back, like cooking an egg or toasting bread.',
    'The words to use are reversible (can be undone) and irreversible (can’t be undone).',
    'Melted chocolate sets in a new shape, but it is still chocolate.',
  ],
  makeQuestion: (level) =>
    byLevel(level, [
      [canUndoPics, warmChocolate],
      [() => isReversible(1), setChocolate],
      [oddOneOut, burning, whyToast, () => isReversible(2)],
    ]),
};
