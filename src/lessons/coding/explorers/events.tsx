import { useEffect, useRef, useState } from 'react';
import { Bell, Gamepad2, MousePointerClick, Star as StarIcon } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { numberChoices, pick, rand, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { BENCH, DIR_NAME, DIRS, DragItem, GridPicture, GridWorld, Message, RIGHT, ahead, open, sameCell } from '../engine';
import type { Cell, Dir, GridLayout, RobotState, World } from '../engine';
import { mcq } from '../q';
import { Beside } from './visuals/pictures';
import { ActionTile, EVENTS, EVENT_DIR, EventHat, SCORE_COLOR, EventsPicture, actionWords, dingAct, eventWords, moveAct, scoreAct, scriptWords } from './visuals/events';
import type { Action, EventName, Scripts } from './visuals/events';

const ARROW_EVENTS = ['left', 'right', 'up', 'down'] as const;
type ArrowEvent = (typeof ARROW_EVENTS)[number];
const BUTTON: Record<ArrowEvent, string> = { left: '◀', right: '▶', up: '▲', down: '▼' };

/** Every open square reachable from `from`. */
function reachable(world: World, from: Cell): Cell[] {
  const seen: Cell[] = [from];
  for (let i = 0; i < seen.length; i++)
    for (const d of DIRS) {
      const n = ahead(seen[i], d);
      if (open(world, n) && !seen.some((c) => sameCell(c, n))) seen.push(n);
    }
  return seen;
}

/** A small level: some stars and rocks, every star reachable. */
function makeLevel(cols: number, rows: number, stars: number, rocks: number): World {
  for (;;) {
    const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) })));
    const world: World = { cols, rows, start: { ...cells[0], dir: RIGHT }, walls: cells.slice(1, 1 + rocks), items: cells.slice(1 + rocks, 1 + rocks + stars) };
    const reach = reachable(world, world.start);
    if ((world.items ?? []).every((s) => reach.some((c) => sameCell(c, s)))) return world;
  }
}

// ─────────────────────────── Scene ───────────────────────────

const R = BENCH.right;
const GRID: GridLayout = { x: 40, y: 70, cell: 84 };
const CARD = { y: 70, h: 64, step: 76, hatW: 196, s: 52, max: 3 };
const slotX = (j: number) => R + CARD.hatW + 18 + j * (CARD.s + 10);
const PAL_Y = 492;
const PALETTE: { key: string; label: string; make: () => Action }[] = [
  ...([3, 1, 0, 2] as Dir[]).map((d) => ({ key: `move-${d}`, label: `Move ${DIR_NAME[d]}`, make: () => moveAct(d) })),
  { key: 'score', label: 'Add 1 to the score', make: scoreAct },
  { key: 'ding', label: 'Play a ding', make: dingAct },
];

interface Game {
  world: World;
  robot: RobotState;
  score: number;
  bump: Cell | null;
}
const freshGame = (world: World): Game => ({ world, robot: { x: world.start.x, y: world.start.y, dir: RIGHT, collected: [] }, score: 0, bump: null });
const newLevel = () => freshGame(makeLevel(5, 4, 4, 2));
type Note = { tone: 'info' | 'good' | 'oops'; text: string };

function EventsScene() {
  const [scripts, setScripts] = useState<Scripts>(() => ({ left: [], right: [moveAct(RIGHT)], up: [], down: [], star: [] }));
  const [sel, setSel] = useState<EventName>('left');
  const [game, setGame] = useState<Game>(newLevel);
  const [running, setRunning] = useState<{ e: EventName; id: string } | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const stars = game.world.items?.length ?? 0;

  const finish = (g: Game, before: number, touchedEmpty: boolean) => {
    setRunning(null);
    const got = g.robot.collected.length;
    if (got === stars && before < stars) {
      if (g.score === stars) setNote({ tone: 'good', text: `You win! All ${stars} stars, and the score says ${g.score}. Your events made a working game!` });
      else if (g.score < stars) setNote({ tone: 'oops', text: `All ${stars} stars, but the score says ${g.score}. Which event should add 1?` });
      else setNote({ tone: 'oops', text: `Score ${g.score} for ${stars} stars? Something adds points too often. Check each event.` });
      play('complete');
    } else if (touchedEmpty) setNote({ tone: 'oops', text: 'The robot touched a star, but “when star touched” has no blocks, so nothing else happened.' });
    else if (got < stars) setNote({ tone: 'info', text: `${got} of ${stars} stars collected. Keep playing!` });
  };

  type Job = { e: EventName; a: Action };
  const runJobs = (jobs: Job[], g: Game, before: number, touchedEmpty: boolean) => {
    if (!jobs.length) return finish(g, before, touchedEmpty);
    const [{ e, a }, ...rest] = jobs;
    setRunning({ e, id: a.id });
    let next = g;
    let more = rest;
    let empty = touchedEmpty;
    if (a.kind === 'move') {
      const target = ahead(g.robot, a.dir);
      if (!open(g.world, target)) {
        // A bump stops this script, like a program that runs into a rock.
        setGame({ ...g, robot: { ...g.robot, dir: a.dir }, bump: target });
        play('wrong');
        setNote({ tone: 'oops', text: `Bump! “${eventWords(e)}” moved the robot ${DIR_NAME[a.dir]} into ${open({ ...g.world, walls: [] }, target) ? 'a rock' : 'the edge'}.` });
        timer.current = window.setTimeout(() => {
          setRunning(null);
          setGame((x) => ({ ...x, bump: null }));
        }, 650);
        return;
      }
      const star = (g.world.items ?? []).findIndex((c, i) => sameCell(c, target) && !g.robot.collected.includes(i));
      next = { ...g, bump: null, robot: { x: target.x, y: target.y, dir: a.dir, collected: star >= 0 ? [...g.robot.collected, star] : g.robot.collected } };
      play(star >= 0 ? 'pop' : 'tap');
      if (star >= 0) {
        // Touching a star is an event too: its script runs straight away.
        if (scripts.star.length) more = [...scripts.star.map((x) => ({ e: 'star' as EventName, a: x })), ...rest];
        else empty = true;
      }
    } else if (a.kind === 'score') {
      next = { ...g, score: g.score + 1 };
      play('pop');
    } else play('correct');
    setGame(next);
    timer.current = window.setTimeout(() => runJobs(more, next, before, empty), 430);
  };

  const fire = (e: ArrowEvent) => {
    if (running) return;
    const list = scripts[e];
    if (!list.length) {
      setNote({ tone: 'info', text: `Nothing happened: “${eventWords(e)}” has no blocks yet. Snap one on!` });
      setSel(e);
      return;
    }
    setNote(null);
    runJobs(
      list.map((a) => ({ e, a })),
      game,
      game.robot.collected.length,
      false,
    );
  };

  const add = (e: EventName, make: () => Action) => {
    if (running) return;
    if (scripts[e].length >= CARD.max) {
      setNote({ tone: 'info', text: `An event holds up to ${CARD.max} blocks here. Tap a block to take it out.` });
      return;
    }
    play('pop');
    setScripts({ ...scripts, [e]: [...scripts[e], make()] });
    setSel(e);
    setNote(null);
  };
  const remove = (e: EventName, id: string) => {
    if (running) return;
    play('tap');
    setScripts({ ...scripts, [e]: scripts[e].filter((a) => a.id !== id) });
    setSel(e);
  };
  const onDrop = (make: () => Action, p: Pt) => {
    if (p.x < R - 20) return;
    const i = Math.floor((p.y - CARD.y + 6) / CARD.step);
    if (i >= 0 && i < EVENTS.length) add(EVENTS[i], make);
  };
  const restart = (g: Game) => {
    window.clearTimeout(timer.current);
    setRunning(null);
    setGame(g);
    setNote(null);
  };

  const msg: Note = running
    ? { tone: 'info', text: running.e === 'star' ? 'Event: the robot touched a star! Running “when star touched”…' : `Event: you tapped ${BUTTON[running.e as ArrowEvent]}. Running “${eventWords(running.e)}”…` }
    : (note ?? { tone: 'info', text: 'Snap blocks onto each event, then tap the game buttons. Can you collect every star?' });
  const mood = game.bump ? 'oops' : game.robot.collected.length === stars ? 'proud' : 'happy';

  return (
    <SceneSvg label="When this happens: snap blocks onto events to make a little game, then play it with the game buttons">
      <GridWorld world={game.world} layout={GRID} robot={game.robot} bump={game.bump} mood={mood} />
      <text x={40} y={436} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Game buttons
      </text>
      {ARROW_EVENTS.map((e, i) => (
        <SvgButton key={e} x={40 + i * 76} y={448} w={64} h={56} label={BUTTON[e]} fontSize={24} onClick={() => fire(e)} disabled={!!running} title={`Tap the ${e} button`} />
      ))}
      <rect x={352} y={446} width={108} height={70} rx={14} fill={shade(SCORE_COLOR, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={406} y={466} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink2} className="caps">
        score
      </text>
      <text x={406} y={496} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={800} fill={C.ink} className="num">
        {game.score}
      </text>
      <Message x={40} y={530} w={420} tone={msg.tone} text={msg.text} />

      <text x={R} y={58} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Events · when this happens, do this
      </text>
      {EVENTS.map((e, i) => {
        const y = CARD.y + i * CARD.step;
        const list = scripts[e];
        return (
          <g key={e}>
            <g onClick={running ? undefined : () => setSel(e)} style={{ cursor: 'pointer' }} role="button" aria-label={`${eventWords(e)}: ${scriptWords(list)}. Tap to add blocks here`} data-nopan>
              <rect x={R - 4} y={y - 4} width={BENCH.rightW + 8} height={CARD.h + 8} rx={16} fill={sel === e && !running ? shade(C.yellow, 0.65) : 'transparent'} />
              <rect x={R + CARD.hatW - 10} y={y + 4} width={BENCH.rightW - CARD.hatW + 10} height={CARD.h - 8} rx={12} fill="white" stroke={C.line} strokeWidth={2} />
              <EventHat e={e} x={R} y={y} w={CARD.hatW} h={CARD.h} active={running?.e === e} />
            </g>
            {list.map((a, j) => (
              <g key={a.id} onClick={() => remove(e, a.id)} style={{ cursor: running ? 'default' : 'pointer' }} role="button" aria-label={`${actionWords(a)}. Tap to take it out`} data-nopan>
                <ActionTile a={a} x={slotX(j)} y={y + (CARD.h - CARD.s) / 2} s={CARD.s} state={running?.id === a.id ? 'active' : undefined} />
              </g>
            ))}
            {list.length < CARD.max && (
              <g onClick={running ? undefined : () => setSel(e)} style={{ cursor: 'pointer' }} data-nopan aria-hidden>
                <rect x={slotX(list.length)} y={y + (CARD.h - 48) / 2} width={48} height={48} rx={10} fill="white" stroke={C.muted} strokeWidth={2} strokeDasharray="6 5" />
                <text x={slotX(list.length) + 24} y={y + CARD.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={24} fill={C.muted}>
                  +
                </text>
              </g>
            )}
          </g>
        );
      })}

      <text x={R} y={PAL_Y - 12} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Blocks · drag onto an event, or tap
      </text>
      {PALETTE.map((p, i) => (
        <g key={p.key} opacity={running ? 0.45 : 1}>
          <DragItem label={p.label} disabled={!!running} onDrop={(pt) => onDrop(p.make, pt)} onTap={() => add(sel, p.make)}>
            <ActionTile a={{ ...p.make(), id: `pal-${p.key}` }} x={R + i * 72} y={PAL_Y} s={58} />
          </DragItem>
        </g>
      ))}
      <SvgButton x={R} y={590} w={150} h={56} fontSize={19} label="Start over" onClick={() => restart(freshGame(game.world))} disabled={!!running} title="Put the robot and the stars back" />
      <SvgButton x={R + 162} y={590} w={150} h={56} fontSize={19} label="New level" onClick={() => restart(newLevel())} disabled={!!running} title="Try a new level with the same events" />
      <Callout at={[R + 100, CARD.y + 4 * CARD.step + 58]} box={[R + 328, 596]} w={180} icon={StarIcon} title="Stars are events" text="When the robot lands on a star, the “when star touched” blocks run straight away." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={12} width={70} height={28} rx={9} fill="#f2b01e" stroke={C.ink} strokeWidth={1.5} />
      <text x={14} y={27} dominantBaseline="central" fontSize={12} fontWeight={800} fill={C.ink}>
        when
      </text>
      <rect x={50} y={17} width={18} height={18} rx={4} fill="white" stroke={C.ink} strokeWidth={1.2} />
      <text x={59} y={27} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={C.ink}>
        ▶
      </text>
      <rect x={82} y={12} width={28} height={28} rx={7} fill="#4f7cff" stroke={C.ink} strokeWidth={1.4} />
      <path d="M89,26 L103,26 M97,20 L103,26 L97,32" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={6} y={46} width={70} height={28} rx={9} fill="#f2b01e" stroke={C.ink} strokeWidth={1.5} />
      <text x={14} y={61} dominantBaseline="central" fontSize={12} fontWeight={800} fill={C.ink}>
        when ⭐
      </text>
      <rect x={82} y={46} width={28} height={28} rx={7} fill="#f2994a" stroke={C.ink} strokeWidth={1.4} />
      <text x={96} y={61} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={800} fill="white">
        +1
      </text>
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

/** Arrow scripts where each button moves its own way, with `twists` of them changed (a wrong way, a double move or empty). */
function arrowScripts(twists: number, kinds: ('wrong' | 'double' | 'empty')[]): { scripts: Scripts; twisted: ArrowEvent[] } {
  const scripts: Scripts = { left: [], right: [], up: [], down: [], star: [] };
  for (const e of ARROW_EVENTS) scripts[e] = [moveAct(EVENT_DIR[e])];
  const twisted = shuffle([...ARROW_EVENTS]).slice(0, twists);
  for (const e of twisted) {
    const kind = pick(kinds);
    const d = EVENT_DIR[e];
    if (kind === 'wrong') scripts[e] = [moveAct(pick(DIRS.filter((x) => x !== d)))];
    else if (kind === 'double') scripts[e] = [moveAct(d), moveAct(d)];
    else scripts[e] = [];
  }
  return { scripts, twisted };
}

const doesWords = (list: Action[]) => (list.length ? `the robot moves ${list.map((a) => (a.kind === 'move' ? DIR_NAME[a.dir] : actionWords(a))).join(', ')}` : 'nothing happens');
const buttonName = (e: ArrowEvent) => `the ${e} button (${BUTTON[e]})`;

/** L0: you tap one button. What does the robot do? */
function whatHappens(): Question {
  const { scripts } = arrowScripts(rand(1, 2), ['wrong', 'empty']);
  const e = pick(ARROW_EVENTS);
  const answer = doesWords(scripts[e]);
  const pool = [...DIRS.map((d) => `the robot moves ${DIR_NAME[d]}`), 'nothing happens'].filter((x) => x !== answer);
  return mcq({
    prompt: `You tap ${buttonName(e)}. What does the robot do?`,
    visual: <EventsPicture scripts={scripts} events={[...ARROW_EVENTS]} />,
    answer,
    wrong: shuffle(pool).slice(0, 3),
    hint: `Find the event that starts with the ${e} button. Only its blocks run.`,
    explain: [`Find the event “${eventWords(e)}”.`, `Its blocks are: ${scriptWords(scripts[e])}.`, `So when you tap it, ${answer}.`],
  });
}

/** L1: which event has a bug? */
function whichBug(): Question {
  const { scripts, twisted } = arrowScripts(1, ['wrong']);
  const bug = twisted[0];
  const a = scripts[bug][0];
  const name = (e: ArrowEvent) => `the ${e} button event`;
  return mcq({
    prompt: 'Each button should move the robot the way it points. Which event has a bug?',
    visual: <EventsPicture scripts={scripts} events={[...ARROW_EVENTS]} />,
    answer: name(bug),
    wrong: ARROW_EVENTS.filter((e) => e !== bug).map(name).slice(0, 3),
    hint: 'Check each event: does its arrow block point the same way as its button?',
    explain: [`Check each event one at a time.`, `“${eventWords(bug)}” runs ${a.kind === 'move' ? `move ${DIR_NAME[a.dir]}` : actionWords(a)}, but it should move ${bug}.`, `So the bug is in ${name(bug)}.`],
  });
}

/** Follow a list of taps; null if the robot would bump. */
function followTaps(world: World, scripts: Scripts, taps: ArrowEvent[]): { path: Cell[]; moves: Dir[]; touched: number; score: number } | null {
  let c: Cell = { x: world.start.x, y: world.start.y };
  const path: Cell[] = [c];
  const moves: Dir[] = [];
  const got = new Set<number>();
  let score = 0;
  const runList = (list: Action[]): boolean => {
    for (const a of list) {
      if (a.kind === 'score') score++;
      if (a.kind !== 'move') continue;
      const n = ahead(c, a.dir);
      if (!open(world, n)) return false;
      c = n;
      path.push(c);
      moves.push(a.dir);
      const i = (world.items ?? []).findIndex((s, k) => sameCell(s, c) && !got.has(k));
      if (i >= 0) {
        got.add(i);
        if (!runList(scripts.star)) return false;
      }
    }
    return true;
  };
  for (const t of taps) if (!runList(scripts[t])) return null;
  return { path, moves, touched: got.size, score };
}

/** L1: tap a few buttons. Where does the robot end up? */
function whereAfterTaps(): Question {
  for (;;) {
    const { scripts, twisted } = arrowScripts(rand(1, 2), ['wrong', 'double']);
    const world: World = { cols: 5, rows: 4, start: { x: rand(0, 4), y: rand(0, 3), dir: RIGHT }, walls: [] };
    const taps = Array.from({ length: 3 }, () => pick(ARROW_EVENTS));
    if (!taps.some((t) => twisted.includes(t))) continue;
    const run = followTaps(world, scripts, taps);
    const plain = followTaps(world, { left: [moveAct(3)], right: [moveAct(1)], up: [moveAct(0)], down: [moveAct(2)], star: [] }, taps);
    if (!run || !plain) continue;
    const end = run.path[run.path.length - 1];
    const naive = plain.path[plain.path.length - 1];
    if (sameCell(end, world.start) || sameCell(naive, end) || sameCell(naive, world.start)) continue;
    const near = shuffle(DIRS.map((d) => ahead(end, d)).filter((c) => open(world, c) && !sameCell(c, naive) && !sameCell(c, world.start)));
    if (!near.length) continue;
    const letters = shuffle(['A', 'B', 'C']);
    const cells = [end, naive, near[0]];
    const labels = cells.map((cell, i) => ({ cell, text: letters[i] }));
    const answer = letters[0];
    return mcq({
      prompt: `You tap ${taps.map((t) => BUTTON[t]).join(' then ')}. Where does the robot end up?`,
      speak: `You tap ${taps.join(', then ')}. Where does the robot end up?`,
      visual: (
        <Beside
          label="The robot's grid and the game's events"
          left={{ el: <GridPicture world={world} labels={labels} cell={52} />, w: 5 * 52 + 16, h: 4 * 52 + 16 }}
          right={{ el: <EventsPicture scripts={scripts} events={[...ARROW_EVENTS]} />, w: 330, h: 256 }}
        />
      ),
      answer,
      wrong: letters.slice(1),
      hint: 'For each tap, find that button’s event and do exactly its blocks, even if they look wrong.',
      explain: [
        `Each tap runs its event: ${taps.map((t) => `${BUTTON[t]} → ${scripts[t].map((a) => (a.kind === 'move' ? DIR_NAME[a.dir] : actionWords(a))).join(', ')}`).join('; ')}.`,
        `So from the robot, the moves are: ${run.moves.map((d) => DIR_NAME[d]).join(', ')}.`,
        `The robot ends on square ${answer}.`,
      ],
    });
  }
}

/** L2: what is the score after some taps? */
function scoreAfterTaps(): Question {
  for (;;) {
    const { scripts } = arrowScripts(rand(0, 1), ['double']);
    const star = pick<Action[]>([[scoreAct()], [scoreAct(), scoreAct()], [dingAct(), scoreAct()], [dingAct()], [scoreAct(), dingAct()]]);
    scripts.star = star.map((a) => ({ ...a }));
    const bonus = Math.random() < 0.3 ? pick(ARROW_EVENTS) : null;
    if (bonus) scripts[bonus] = [...scripts[bonus], scoreAct()];
    const world = makeLevel(5, 4, 4, 1);
    const taps = Array.from({ length: rand(3, 5) }, () => pick(ARROW_EVENTS));
    const run = followTaps(world, scripts, taps);
    if (!run || run.touched < 1) continue;
    const per = scripts.star.filter((a) => a.kind === 'score').length;
    const extra = bonus ? taps.filter((t) => t === bonus).length : 0;
    if (bonus && !extra) continue;
    const score = run.score;
    return {
      prompt: `The score starts at 0. You tap ${taps.map((t) => BUTTON[t]).join(' ')}. What is the score now?`,
      speak: `The score starts at 0. You tap ${taps.join(', ')}. What is the score now?`,
      visual: (
        <Beside
          label="The robot's grid with stars, and the game's events"
          left={{ el: <GridPicture world={world} cell={52} />, w: 5 * 52 + 16, h: 4 * 52 + 16 }}
          right={{ el: <EventsPicture scripts={scripts} events={EVENTS} />, w: 330, h: 320 }}
        />
      ),
      choices: numberChoices(score, { count: 4, min: 0, max: 14, spread: 2 }).map((value) => ({ value })),
      answer: String(score),
      hint: 'Follow the taps with your finger. Each time the robot lands on a star, run the “when star touched” event too.',
      explain: [
        `The moves are ${run.moves.map((d) => DIR_NAME[d]).join(', ')}, and the robot touches ${run.touched} star${run.touched === 1 ? '' : 's'}.`,
        `Each star runs “${scriptWords(scripts.star)}”: ${per} point${per === 1 ? '' : 's'} a star, so ${run.touched} × ${per} = ${run.touched * per}.`,
        ...(bonus ? [`The ${bonus} button also adds 1 each time: ${extra} more.`] : []),
        `So the score is ${score}.`,
      ],
    };
  }
}

function makeQuestion(level: number): Question {
  if (level <= 0) return whatHappens();
  if (level === 1) return Math.random() < 0.5 ? whereAfterTaps() : whichBug();
  return Math.random() < 0.7 ? scoreAfterTaps() : whereAfterTaps();
}

export const events: Lesson = {
  id: 'events',
  title: 'When This Happens',
  Thumb,
  Scene: EventsScene,
  sceneHint: 'Drag blocks onto the events, then play with the game buttons',
  learn: {
    heading: 'Events start code',
    intro: 'An event is something that happens, like a button being tapped or the robot touching a star. A “when …” block waits for its event. When the event happens, the blocks under it run.',
    points: [
      { icon: MousePointerClick, text: 'Each event has its own script: “when ▶ tapped → move right”.' },
      { icon: Gamepad2, text: 'Games are built from events: buttons, touches, scores.' },
      { icon: Bell, text: 'Nothing runs until its event happens. An event with no blocks does nothing.' },
    ],
  },
  steps: [
    'Snap a move block onto each button’s event.',
    'Snap a “+1 score” block onto “when star touched”.',
    'Play: tap the game buttons and watch which event lights up.',
    'If something odd happens, find the event that ran and fix its blocks.',
  ],
  example: {
    question: 'You want ▲ to move the robot up, and each star to add 1 to the score. Which events do you need?',
    visual: <EventsPicture scripts={{ left: [], right: [], down: [], up: [moveAct(0)], star: [scoreAct()] }} events={['up', 'star']} />,
    work: ['The ▲ button is an event: “when ▲ tapped → move up”.', 'Touching a star is an event too: “when star touched → +1 score”.', 'Each script runs only when its event happens.'],
    answer: 'When ▲ tapped → move up. When star touched → +1 score.',
  },
  grownups: [
    'Event-driven code is how apps and games work: nothing happens until someone taps, clicks or something touches.',
    'Real life has events too: “when the doorbell rings, open the door”, “when the timer beeps, take out the cake”. Make some up together.',
    'Let your child make a “silly” game on purpose (▲ moves down!). Spotting why it behaves that way is great debugging practice.',
  ],
  makeQuestion,
};
