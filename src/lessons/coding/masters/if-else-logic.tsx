import { useState } from 'react';
import { GitBranch, HelpCircle, Table, ToggleRight } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, rand } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { BLOCK_COLORS, Message, RobotBody } from '../engine';
import { mcq } from '../q';
import { CodePicture, Gate, ROWS, TablePicture, TruthTable, apply, yn } from './visuals/logic';
import type { CodeLine, Op } from './visuals/logic';

const coin = () => Math.random() < 0.5;
const rowOf = (a: boolean, b: boolean) => (a ? 2 : 0) + (b ? 1 : 0);
const MEANS: Record<Op, string> = { AND: 'AND is YES only when both sides are YES.', OR: 'OR is YES when at least one side is YES.' };

// ─────────────────────────── Scene ───────────────────────────

const CODE = { x: 340, y: 70, w: 340 };
const TABLE = { x: 700, y: 70, w: 260 };

function Switch({ y, icon, label, on, onToggle }: { y: number; icon: string; label: string; on: boolean; onToggle: () => void }) {
  return (
    <g onClick={onToggle} style={{ cursor: 'pointer' }} role="switch" aria-checked={on} aria-label={`${label}: ${yn(on)}. Tap to switch`} data-nopan>
      <rect x={40} y={y} width={280} height={120} rx={16} fill={on ? shade(C.green, 0.8) : 'white'} stroke={C.ink} strokeWidth={2} />
      <text x={78} y={y + 44} textAnchor="middle" dominantBaseline="central" fontSize={40}>
        {icon}
      </text>
      <text x={118} y={y + 44} dominantBaseline="central" fontSize={21} fontWeight={800} fill={C.ink}>
        {label}?
      </text>
      <rect x={118} y={y + 70} width={150} height={40} rx={20} fill={on ? C.green : '#d5dbe7'} stroke={C.ink} strokeWidth={2} style={{ transition: 'fill 0.2s' }} />
      <circle cx={on ? 248 : 138} cy={y + 90} r={15} fill="white" stroke={C.ink} strokeWidth={2} style={{ transition: 'cx 0.2s' }} />
      <text x={on ? 178 : 212} y={y + 90} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={800} fill={on ? 'white' : C.ink}>
        {on ? 'YES · true' : 'NO · false'}
      </text>
    </g>
  );
}

function LogicScene() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [op, setOp] = useState<Op>('AND');
  const [mystery, setMystery] = useState<Op | null>(null);
  const [tried, setTried] = useState<boolean[]>(() => ROWS.map((_, i) => i === 0));
  const [guess, setGuess] = useState<Op | null>(null);
  const rule = mystery ?? op;
  const res = apply(rule, a, b);
  const row = rowOf(a, b);
  const full = tried.every(Boolean);

  const setInputs = (na: boolean, nb: boolean) => {
    play(apply(rule, na, nb) ? 'pop' : 'tap');
    setA(na);
    setB(nb);
    setTried((t) => t.map((x, i) => x || i === rowOf(na, nb)));
  };
  const freshTable = () => setTried(ROWS.map((_, i) => i === row));
  const toggleOp = () => {
    if (mystery) return;
    play('tap');
    setOp(op === 'AND' ? 'OR' : 'AND');
    freshTable();
  };
  const toggleMystery = () => {
    play('whoosh');
    setMystery(mystery ? null : pick<Op>(['AND', 'OR']));
    setGuess(null);
    freshTable();
  };
  const makeGuess = (g: Op) => {
    setGuess(g);
    play(g === mystery ? 'correct' : 'wrong');
  };

  let msg: { tone: 'info' | 'good' | 'oops'; text: string };
  if (mystery) {
    if (guess === mystery) msg = { tone: 'good', text: `Yes! The mystery rule was ${mystery}. ${MEANS[mystery]} Your truth table proved it.` };
    else if (guess) msg = { tone: 'oops', text: 'Not quite. Look at the rows where only one switch is YES: did the gate open or stay shut?' };
    else if (full) msg = { tone: 'info', text: 'Your truth table is full! Is the mystery rule AND or OR? Choose below.' };
    else msg = { tone: 'info', text: `Mystery rule! Is it AND or OR? Try all 4 ways of setting the switches and watch the gate. (${tried.filter(Boolean).length} of 4 tried)` };
  } else {
    const base = `${yn(a)} ${rule} ${yn(b)} = ${yn(res)}, so the ${res ? 'IF' : 'ELSE'} part runs: the gate ${res ? 'opens' : 'stays shut'}.`;
    msg = full ? { tone: 'good', text: `${base} Table complete! ${MEANS[rule]}` } : { tone: 'info', text: `${base} Try every way of setting the switches to fill the table.` };
  }

  const lineBg = (active: boolean) => (active ? shade(C.yellow, 0.35) : 'transparent');
  return (
    <SceneSvg label="If, else and logic: switch the inputs and watch which part of the code runs">
      <text x={40} y={58} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Inputs · tap to switch
      </text>
      <Switch y={70} icon="🔑" label="Has a key" on={a} onToggle={() => setInputs(!a, b)} />
      <Switch y={206} icon="🎫" label="Has a ticket" on={b} onToggle={() => setInputs(a, !b)} />
      <rect x={40} y={344} width={280} height={96} rx={16} fill={shade(BLOCK_COLORS.if, 0.85)} stroke={C.ink} strokeWidth={2} />
      <text x={56} y={372} fontSize={15} fontWeight={700} fill={C.muted} className="caps">
        {mystery ? 'Mystery rule' : `${rule} means`}
      </text>
      <text x={56} y={402} fontSize={17} fontWeight={600} fill={C.ink}>
        {mystery ? 'Test the switches to' : rule === 'AND' ? 'Both must be YES' : 'At least one YES'}
      </text>
      <text x={56} y={426} fontSize={17} fontWeight={600} fill={C.ink}>
        {mystery ? 'find out!' : rule === 'AND' ? 'for the gate to open.' : 'opens the gate.'}
      </text>

      {/* The code */}
      <text x={CODE.x} y={58} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Code
      </text>
      <rect x={CODE.x} y={CODE.y} width={CODE.w} height={226} rx={16} fill="white" stroke={C.ink} strokeWidth={2} />
      <rect x={CODE.x + 8} y={CODE.y + 10} width={CODE.w - 16} height={58} rx={12} fill={BLOCK_COLORS.if} stroke={C.ink} strokeWidth={2} />
      <text x={CODE.x + 22} y={CODE.y + 39} dominantBaseline="central" fontSize={22} fontWeight={800} fill="white">
        if
      </text>
      {[
        { x: CODE.x + 52, w: 82, text: '🔑 key', on: a },
        { x: CODE.x + 226, w: 102, text: '🎫 ticket', on: b },
      ].map((c) => (
        <g key={c.text}>
          <rect x={c.x} y={CODE.y + 18} width={c.w} height={42} rx={21} fill={c.on ? shade(C.green, 0.6) : 'white'} stroke={C.ink} strokeWidth={2} />
          <text x={c.x + c.w / 2} y={CODE.y + 39} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={800} fill={C.ink}>
            {c.text}
          </text>
        </g>
      ))}
      <g onClick={toggleOp} style={{ cursor: mystery ? 'default' : 'pointer' }} role="button" aria-label={mystery ? 'Mystery rule' : `${op}. Tap to switch between AND and OR`} data-nopan>
        <rect x={CODE.x + 140} y={CODE.y + 16} width={80} height={46} rx={10} fill={mystery ? C.ink : shade(BLOCK_COLORS.if, -0.35)} stroke={C.ink} strokeWidth={2} />
        <text x={CODE.x + 180} y={CODE.y + 39} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={800} fill="white">
          {mystery ? '??' : `${op} ⇄`}
        </text>
      </g>
      <rect x={CODE.x + 8} y={CODE.y + 76} width={CODE.w - 16} height={48} rx={10} fill={lineBg(res)} />
      <text x={CODE.x + 44} y={CODE.y + 100} dominantBaseline="central" fontSize={20} fontWeight={700} fill={BLOCK_COLORS.motion}>
        → open the gate 🟢
      </text>
      <text x={CODE.x + 22} y={CODE.y + 146} dominantBaseline="central" fontSize={22} fontWeight={800} fill={BLOCK_COLORS.if}>
        else
      </text>
      <rect x={CODE.x + 8} y={CODE.y + 166} width={CODE.w - 16} height={48} rx={10} fill={lineBg(!res)} />
      <text x={CODE.x + 44} y={CODE.y + 190} dominantBaseline="central" fontSize={20} fontWeight={700} fill={BLOCK_COLORS.motion}>
        → keep it shut 🔴
      </text>
      <text x={CODE.x + CODE.w / 2} y={CODE.y + 254} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700} fill={C.ink}>
        {yn(a)} {mystery ? '??' : rule} {yn(b)} = {yn(res)}
      </text>

      {/* The gate */}
      <Gate x={420} y={360} w={220} h={200} open={res} />
      <g transform="translate(372 520)">
        <RobotBody size={56} mood={res ? 'proud' : 'happy'} />
      </g>
      <text x={372} y={470} textAnchor="middle" fontSize={26}>
        {a ? '🔑' : ''}
        {b ? '🎫' : ''}
      </text>

      {/* Truth table */}
      <text x={TABLE.x} y={58} fontSize={16} fontWeight={700} fill={C.muted} className="caps">
        Truth table · {mystery ? 'mystery rule' : `key ${rule} ticket`}
      </text>
      <TruthTable x={TABLE.x} y={TABLE.y} w={TABLE.w} heads={['key', 'ticket', 'gate']} results={ROWS.map(([x, y], i) => (tried[i] ? apply(rule, x, y) : null))} mark={row} />
      <SvgButton x={TABLE.x} y={358} w={TABLE.w} h={52} fontSize={18} label={mystery ? 'Back to my rule' : 'Mystery rule'} onClick={toggleMystery} />
      {mystery && (
        <>
          <SvgButton x={TABLE.x} y={424} w={124} h={52} fontSize={18} label="It's AND" onClick={() => makeGuess('AND')} disabled={!full || guess === mystery} active={guess === 'AND'} />
          <SvgButton x={TABLE.x + 136} y={424} w={124} h={52} fontSize={18} label="It's OR" onClick={() => makeGuess('OR')} disabled={!full || guess === mystery} active={guess === 'OR'} />
        </>
      )}
      <Message x={40} y={596} w={920} tone={msg.tone} text={msg.text} />
      <Callout
        at={[CODE.x + 180, CODE.y + 62]}
        box={[CODE.x + 112, 2]}
        w={250}
        icon={ToggleRight}
        title="Tap AND to switch"
        text="Switch between AND and OR, then test every row of the truth table. Which rule opens the gate more often?"
      />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={6} y={8} width={108} height={26} rx={8} fill={BLOCK_COLORS.if} stroke={C.ink} strokeWidth={1.5} />
      <text x={60} y={21} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} fill="white">
        if A AND B
      </text>
      {[
        ['A', 'B', '='],
        ['1', '1', '1'],
        ['1', '0', '0'],
      ].map((r, i) => (
        <g key={i}>
          {r.map((t, j) => (
            <text key={j} x={30 + j * 30} y={50 + i * 13} textAnchor="middle" fontSize={11} fontWeight={800} fill={i === 0 ? C.muted : t === '1' && j === 2 ? C.green : C.ink}>
              {t}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────── Practice ───────────────────────────

const gateCode = (op: Op, a: boolean, b: boolean): CodeLine[] => [
  { text: `key = ${yn(a)},  ticket = ${yn(b)}`, kind: 'set' },
  { text: `if key ${op} ticket:`, kind: 'if' },
  { text: 'open the gate', indent: 1, kind: 'do' },
  { text: 'else:', kind: 'else' },
  { text: 'keep the gate shut', indent: 1, kind: 'do' },
];

/** L0: does the gate open? */
function gateQ(): Question {
  const op = pick<Op>(['AND', 'OR']);
  const a = coin();
  const b = coin();
  const res = apply(op, a, b);
  const answer = res ? 'The gate opens' : 'The gate stays shut';
  return mcq({
    prompt: 'Run the code. What happens?',
    visual: <CodePicture lines={gateCode(op, a, b)} />,
    answer,
    wrong: [res ? 'The gate stays shut' : 'The gate opens'],
    hint: op === 'AND' ? 'AND only says YES when both sides are YES.' : 'OR says YES when at least one side is YES.',
    explain: [
      `key is ${yn(a)} and ticket is ${yn(b)}.`,
      `${op === 'AND' ? 'AND needs both to be YES' : 'OR needs at least one YES'}: ${yn(a)} ${op} ${yn(b)} = ${yn(res)}.`,
      `So the ${res ? 'if' : 'else'} part runs: ${answer.toLowerCase()}.`,
    ],
  });
}

/** L1: fill in the missing row of a truth table. */
function missingCell(): Question {
  const op = pick<Op>(['AND', 'OR']);
  const r = rand(0, 3);
  const [a, b] = ROWS[r];
  const res = apply(op, a, b);
  const answer = res ? 'open' : 'shut';
  return mcq({
    prompt: `The rule is “if key ${op} ticket, open the gate, else keep it shut”. What goes in the ? box?`,
    visual: <TablePicture heads={['key', 'ticket', 'gate']} results={ROWS.map(([x, y], i) => (i === r ? null : apply(op, x, y)))} />,
    answer,
    wrong: [res ? 'shut' : 'open'],
    hint: `Read the ? row: what are key and ticket there? Then use ${op}.`,
    explain: [`In the ? row, key is ${yn(a)} and ticket is ${yn(b)}.`, `${yn(a)} ${op} ${yn(b)} = ${yn(res)}.`, `So the gate is ${answer}.`],
  });
}

/** L1: which rule made this table? */
function whichOp(): Question {
  const op = pick<Op>(['AND', 'OR']);
  return mcq({
    prompt: 'Which rule made this truth table: “if key AND ticket” or “if key OR ticket”?',
    visual: <TablePicture heads={['key', 'ticket', 'gate']} results={ROWS.map(([x, y]) => apply(op, x, y))} />,
    answer: op,
    wrong: [op === 'AND' ? 'OR' : 'AND'],
    hint: 'Look at the rows where only one of the two is YES. Is the gate open there?',
    explain: [
      `When only one of key and ticket is YES, the gate is ${op === 'OR' ? 'open' : 'shut'}.`,
      op === 'OR' ? 'So one YES is enough: that is OR.' : 'It only opens when both are YES: that is AND.',
      `The rule is ${op}.`,
    ],
  });
}

interface Cond {
  name: string;
  value: number;
  text: string;
  holds: boolean;
  why: string;
}

/** A comparison like "score > 10" with a value that makes it true or false. */
function cond(kind: number): Cond {
  switch (kind) {
    case 0: {
      const value = rand(4, 18);
      return { name: 'score', value, text: 'score > 10', holds: value > 10, why: `${value} ${value > 10 ? 'is' : 'is not'} more than 10` };
    }
    case 1: {
      const value = rand(0, 3);
      return { name: 'lives', value, text: 'lives > 0', holds: value > 0, why: `${value} ${value > 0 ? 'is' : 'is not'} more than 0` };
    }
    case 2: {
      const value = rand(10, 50);
      return { name: 'time', value, text: 'time < 30', holds: value < 30, why: `${value} ${value < 30 ? 'is' : 'is not'} less than 30` };
    }
    default: {
      const value = rand(1, 9);
      return { name: 'coins', value, text: 'coins >= 5', holds: value >= 5, why: `${value} ${value >= 5 ? 'is' : 'is not'} 5 or more` };
    }
  }
}

const tf = (v: boolean) => (v ? 'true' : 'false');

/** L2: if / else with comparisons, AND / OR and sometimes NOT. */
function compareQ(): Question {
  const [k1, k2] = pick([
    [0, 1],
    [0, 2],
    [3, 1],
    [2, 3],
  ]);
  const c1 = cond(k1);
  const c2 = cond(k2);
  const op = pick<Op>(['AND', 'OR']);
  const not = Math.random() < 0.3;
  const right = not ? !c2.holds : c2.holds;
  const res = apply(op, c1.holds, right);
  const yes = pick(['Next level!', 'You win!', 'Open the bonus door']);
  const no = pick(['Try again', 'Game over', 'Keep playing']);
  const answer = `It says “${res ? yes : no}”`;
  const second = not ? `NOT (${c2.text})` : c2.text;
  return mcq({
    prompt: 'Run the code. What does it say?',
    visual: (
      <CodePicture
        w={470}
        lines={[
          { text: `${c1.name} = ${c1.value},  ${c2.name} = ${c2.value}`, kind: 'set' },
          { text: `if ${c1.text} ${op} ${second}:`, kind: 'if' },
          { text: `say “${yes}”`, indent: 1, kind: 'do' },
          { text: 'else:', kind: 'else' },
          { text: `say “${no}”`, indent: 1, kind: 'do' },
        ]}
      />
    ),
    answer,
    wrong: [`It says “${res ? no : yes}”`],
    hint: 'Work out each comparison on its own first: true or false? Then combine them.',
    explain: [
      `${c1.text} is ${tf(c1.holds)}: ${c1.why}. ${c2.text} is ${tf(c2.holds)}: ${c2.why}.`,
      ...(not ? [`NOT flips it: NOT ${tf(c2.holds)} = ${tf(right)}.`] : []),
      `${tf(c1.holds)} ${op} ${tf(right)} = ${tf(res)}, so the ${res ? 'if' : 'else'} part runs.`,
      `${answer}.`,
    ],
  });
}

/** L2: three inputs, (A AND B) OR C. */
function threeInputs(): Question {
  const a = coin();
  const b = coin();
  const c = coin();
  const inner = a && b;
  const res = inner || c;
  const answer = res ? 'The gate opens' : 'The gate stays shut';
  return mcq({
    prompt: 'Run the code. What happens?',
    visual: (
      <CodePicture
        w={480}
        lines={[
          { text: `key = ${yn(a)},  ticket = ${yn(b)},  pass = ${yn(c)}`, kind: 'set' },
          { text: 'if (key AND ticket) OR pass:', kind: 'if' },
          { text: 'open the gate', indent: 1, kind: 'do' },
          { text: 'else:', kind: 'else' },
          { text: 'keep the gate shut', indent: 1, kind: 'do' },
        ]}
      />
    ),
    answer,
    wrong: [res ? 'The gate stays shut' : 'The gate opens'],
    hint: 'Work out the brackets first, just like in maths.',
    explain: [`Brackets first: key AND ticket = ${yn(a)} AND ${yn(b)} = ${yn(inner)}.`, `Then ${yn(inner)} OR pass = ${yn(inner)} OR ${yn(c)} = ${yn(res)}.`, `So ${answer.toLowerCase()}.`],
  });
}

function makeQuestion(level: number): Question {
  if (level <= 0) return gateQ();
  if (level === 1) return pick([missingCell, whichOp, gateQ])();
  return Math.random() < 0.65 ? compareQ() : threeInputs();
}

export const ifElseLogic: Lesson = {
  id: 'if-else-logic',
  title: 'If, Else and Logic',
  Thumb,
  Scene: LogicScene,
  sceneHint: 'Flip the switches · Tap AND to change the rule · Fill the truth table',
  learn: {
    heading: 'Decisions with AND, OR and NOT',
    intro: 'An if / else picks one of two paths: if the condition is true, the if part runs; otherwise the else part runs. AND, OR and NOT join simple yes/no questions into bigger ones.',
    points: [
      { icon: GitBranch, text: 'if condition → do this, else → do that. Exactly one part runs.' },
      { icon: ToggleRight, text: 'AND is true only when both sides are true. OR is true when at least one side is true.' },
      { icon: HelpCircle, text: 'NOT flips a value: NOT true = false.' },
      { icon: Table, text: 'A truth table lists every combination of inputs and the result.' },
    ],
  },
  steps: [
    'Work out each simple condition: true or false?',
    'Combine them with AND or OR (do brackets first, then NOT).',
    'If the whole condition is true, run the if part; otherwise run the else part.',
    'To be sure, test every row of the truth table.',
  ],
  example: {
    question: 'score = 12 and lives = 0. What does “if score > 10 AND lives > 0: say “Next level!” else: say “Try again”” say?',
    visual: (
      <CodePicture
        lines={[
          { text: 'score = 12,  lives = 0', kind: 'set' },
          { text: 'if score > 10 AND lives > 0:', kind: 'if' },
          { text: 'say “Next level!”', indent: 1, kind: 'do' },
          { text: 'else:', kind: 'else' },
          { text: 'say “Try again”', indent: 1, kind: 'do' },
        ]}
      />
    ),
    work: ['score > 10 is true, because 12 is more than 10.', 'lives > 0 is false, because 0 is not more than 0.', 'true AND false = false, so the else part runs.'],
    answer: 'It says “Try again”.',
  },
  grownups: [
    'Logic words are everyday words with exact meanings: “You can have juice AND a biscuit” is different from “juice OR a biscuit”.',
    'In everyday speech “or” can mean “one but not both”. In coding, OR is true when either side, or both, are true.',
    'Truth tables are a great way to check thinking: list every combination, then test each one.',
  ],
  makeQuestion,
};
