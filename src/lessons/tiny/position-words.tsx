import { useState } from 'react';
import { ArrowDownUp, Eye, Hand, MoveHorizontal } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C } from '../../lib/color';
import { pick, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { Draggable } from './visuals/Draggable';
import { BOX, BoxFront, FLOOR, landing, RoomBack, RoomPicture, spotOf, Teddy } from './visuals/Room';
import type { Spot, TeddyPos } from './visuals/Room';

const CHALLENGES: Spot[] = [
  'on the table',
  'under the table',
  'in the box',
  'above the table',
  'on the chair',
  'under the chair',
  'next to the box',
  'between the box and the table',
  'between the table and the chair',
  'in front of the box',
  'behind the box',
];

const atBox = (p: TeddyPos) => p.feet === FLOOR && p.x >= BOX.x1 && p.x <= BOX.x2;

function WhereScene() {
  const [pos, setPos] = useState<TeddyPos>({ x: 70, feet: FLOOR });
  const [goal, setGoal] = useState<Spot>('under the table');
  const spot = spotOf(pos);
  const done = spot === goal;
  const sentence = `The teddy is ${spot}.`;

  const drop = (x: number, y: number) => {
    const next = landing(x, y);
    setPos({ ...next, back: false });
    const s = spotOf({ ...next, back: false });
    play(s === goal ? 'correct' : 'pop');
  };

  const newGoal = () => {
    setGoal(pick(CHALLENGES.filter((c) => c !== goal && c !== spot)));
    play('tap');
  };

  const toggleDepth = () => {
    const next = { ...pos, back: !pos.back };
    setPos(next);
    play(spotOf(next) === goal ? 'correct' : 'tap');
  };

  // At the box the teddy can stand behind it (drawn first, partly hidden) or in front of it.
  // Standing further back looks higher up the floor and a little smaller.
  const drawFeet = atBox(pos) ? FLOOR + (pos.back ? -40 : 10) : pos.feet;
  const hidden = pos.back && atBox(pos);
  const inBox = pos.feet === BOX.inside;
  const teddy = (
    <Draggable x={pos.x} y={drawFeet - 42} label={`Teddy, ${spot}. Drag to move.`} onDrop={(p) => drop(p.x, p.y)}>
      <rect x={pos.x - 34} y={drawFeet - 94} width={68} height={96} fill="transparent" />
      <Teddy x={pos.x} feet={drawFeet} scale={hidden ? 0.85 : 1} />
    </Draggable>
  );

  return (
    <SceneSvg label={`A room with a table, a box, a chair and a teddy ${spot}`}>
      <text x={40} y={52} fontSize={30} fontWeight={700} fill={C.ink}>
        {sentence}
      </text>
      <text x={40} y={92} fontSize={19} fill={done ? C.green : C.ink2} fontWeight={600}>
        {done ? `Yes! The teddy is ${goal}.` : `Can you put the teddy ${goal}?`}
      </text>
      <SvgButton x={690} y={26} w={120} h={52} fontSize={17} label="Say it" onClick={() => speak(sentence, { force: true })} />
      <SvgButton x={822} y={26} w={150} h={52} fontSize={17} label="New task" onClick={newGoal} color={done ? C.yellow : C.card} />

      <RoomBack />
      {(hidden || inBox) && teddy}
      <BoxFront />
      {!hidden && !inBox && teddy}

      {atBox(pos) && (
        <SvgButton x={BOX.x1} y={588} w={BOX.x2 - BOX.x1} h={52} fontSize={17} label={pos.back ? 'Come in front' : 'Go behind'} onClick={toggleDepth} color={C.teal} textColor={C.white} />
      )}

      <Callout at={[520, 330]} box={[680, 180]} w={260} icon={Hand} title="Drag the teddy" text="Let go and it lands on whatever is under it." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={22} y={34} width={76} height={6} rx={2} fill={C.wood} stroke={C.ink} strokeWidth={1.5} />
      <rect x={28} y={40} width={5} height={34} fill={C.wood} stroke={C.ink} strokeWidth={1.2} />
      <rect x={87} y={40} width={5} height={34} fill={C.wood} stroke={C.ink} strokeWidth={1.2} />
      <line x1={4} y1={74} x2={116} y2={74} stroke={C.ink} strokeWidth={1.5} />
      <Teddy x={60} feet={74} scale={0.36} />
      <Teddy x={60} feet={34} scale={0.3} />
    </svg>
  );
}

const REASON: Record<Spot, string> = {
  'on the table': 'The teddy is resting on top of the table.',
  'under the table': 'The teddy is lower than the table top, between its legs.',
  'in the box': 'The teddy is inside the box. Only its head pokes out.',
  'above the table': 'The teddy is up on the shelf, higher than the table.',
  'on the chair': 'The teddy is sitting on the chair seat.',
  'under the chair': 'The teddy is below the chair seat.',
  'next to the box': 'The teddy is on the floor, right beside the box.',
  'next to the chair': 'The teddy is on the floor, right beside the chair.',
  'between the box and the table': 'The box is on one side of the teddy and the table is on the other side.',
  'between the table and the chair': 'The table is on one side of the teddy and the chair is on the other side.',
  'in front of the box': 'We can see all of the teddy. It is closer to us than the box.',
  'behind the box': 'The box hides part of the teddy. The teddy is further away than the box.',
};

const EASY: Spot[] = ['on the table', 'under the table', 'in the box'];
const MIDDLE: Spot[] = ['above the table', 'on the chair', 'under the chair', 'next to the box', 'next to the chair', 'between the box and the table', 'between the table and the chair'];
const DEPTH: Spot[] = ['in front of the box', 'behind the box'];

function whereIs(target: Spot, pool: Spot[]): Question {
  const others = shuffle(pool.filter((s) => s !== target)).slice(0, 2);
  return {
    prompt: 'Where is the teddy?',
    visual: <RoomPicture spot={target} />,
    choices: shuffle([target, ...others]).map((s) => ({ value: s })),
    answer: target,
    hint: 'Find the teddy, then look at what is around it.',
    explain: ['Look at where the teddy is.', REASON[target], `So the teddy is ${target}.`],
  };
}

function whichPicture(target: Spot): Question {
  const others = shuffle([...MIDDLE, ...EASY, ...DEPTH].filter((s) => s !== target)).slice(0, 2);
  return {
    prompt: `Which picture shows the teddy ${target}?`,
    choices: shuffle([target, ...others]).map((s) => ({ value: s, name: s, label: <RoomPicture spot={s} /> })),
    answer: target,
    hint: 'Check each picture. Where is the teddy in it?',
    explain: [`We want the teddy ${target}.`, REASON[target], `So the right picture shows the teddy ${target}.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return whereIs(pick(EASY), EASY);
  if (level === 1) return whereIs(pick(MIDDLE), [...MIDDLE, ...EASY]);
  return Math.random() < 0.5 ? whereIs(pick(DEPTH), [...DEPTH, 'next to the box', 'in the box']) : whichPicture(pick([...MIDDLE, ...DEPTH]));
}

export const positionWords: Lesson = {
  id: 'position-words',
  title: 'Where Is It?',
  Thumb,
  Scene: WhereScene,
  sceneHint: 'Drag the teddy around the room · Try each task',
  learn: {
    heading: 'Where is it?',
    intro: 'Little words tell us where things are: on, under, in, next to, between, in front of and behind. Move the teddy and hear where it is!',
    points: [
      { icon: ArrowDownUp, text: 'On and above are higher. Under and below are lower.' },
      { icon: MoveHorizontal, text: 'Between means one thing on each side.' },
      { icon: Eye, text: 'Behind means something is in the way.' },
    ],
  },
  steps: ['Find the teddy.', 'Look at the thing right next to it.', 'Is the teddy higher, lower, inside or beside it?', 'Say it: “The teddy is under the table.”'],
  example: {
    question: 'Where is the teddy?',
    visual: <RoomPicture spot="between the box and the table" />,
    work: ['The box is on one side of the teddy.', 'The table is on the other side.'],
    answer: 'The teddy is between the box and the table.',
  },
  grownups: [
    'Play “hide the toy” and give clues with position words: “It’s under something soft.”',
    'Ask your child to tell you where things are, not just point. Saying the words builds the language.',
    'Front and behind depend on where you stand. Try walking around a chair together.',
  ],
  makeQuestion,
};
