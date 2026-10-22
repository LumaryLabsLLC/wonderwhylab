import { useRef } from 'react';
import { C, shade } from '../../../../lib/color';
import { DIR_VEC, ROBOT_COLOR, RobotBody, UP, cellCenter, forward, repeat, runProgram, turnLeft, turnRight, uid } from '../../engine';
import type { Block, Cell, Dir, GridLayout, RobotState, World } from '../../engine';

/**
 * A drawing robot: its pen draws a line along every square it walks. Functions take inputs:
 *   square(size) = repeat 4 { walk(size); turn right }
 *   walk(steps)  = repeat steps { forward }
 */
export type Fn = 'square' | 'walk' | 'right' | 'left';
export interface Call {
  id: string;
  fn: Fn;
  n: number;
}
export type DefLine = 'sq-repeat' | 'sq-walk' | 'sq-turn' | 'walk-repeat' | 'walk-forward';

export const sq = (n: number): Call => ({ id: uid(), fn: 'square', n });
export const walk = (n: number): Call => ({ id: uid(), fn: 'walk', n });
export const right = (): Call => ({ id: uid(), fn: 'right', n: 0 });
export const left = (): Call => ({ id: uid(), fn: 'left', n: 0 });
export const callText = (c: Call) => (c.fn === 'square' || c.fn === 'walk' ? `${c.fn}(${c.n})` : `turn ${c.fn}`);
export const programText = (calls: Call[]) => calls.map(callText).join(', ');
/** Forward steps a call makes: a square walks 4 sides. */
export const stepsOf = (c: Call) => (c.fn === 'square' ? 4 * c.n : c.fn === 'walk' ? c.n : 0);

export const BOARD: World = { cols: 8, rows: 8, start: { x: 1, y: 6, dir: UP }, walls: [] };

/** Turn calls into engine blocks (functions expanded in place), remembering which call and code lines each block belongs to. */
export function compile(calls: Call[]): { main: Block[]; owner: Map<string, { call: string; lines: DefLine[] }> } {
  const owner = new Map<string, { call: string; lines: DefLine[] }>();
  const tag = (b: Block, call: string, lines: DefLine[]) => {
    owner.set(b.id, { call, lines });
    return b;
  };
  const walkBlock = (n: number, call: string, inSquare: boolean) =>
    tag(repeat(n, [tag(forward(), call, inSquare ? ['sq-walk', 'walk-forward'] : ['walk-forward'])]), call, inSquare ? ['sq-walk', 'walk-repeat'] : ['walk-repeat']);
  const main = calls.map((c) => {
    if (c.fn === 'square') return tag(repeat(4, [walkBlock(c.n, c.id, true), tag(turnRight(), c.id, ['sq-turn'])]), c.id, ['sq-repeat']);
    if (c.fn === 'walk') return walkBlock(c.n, c.id, false);
    return tag(c.fn === 'right' ? turnRight() : turnLeft(), c.id, []);
  });
  return { main, owner };
}

/** The cells the pen visits, in order, or null if the robot would leave the board. */
export function penPath(calls: Call[], world: World = BOARD): Cell[] | null {
  const t = runProgram(world, { main: compile(calls).main }, { maxSteps: 2000 });
  if (t.outcome !== 'success') return null;
  return [{ x: world.start.x, y: world.start.y }, ...t.steps.filter((s) => s.action === 'move').map((s) => ({ x: s.state.x, y: s.state.y }))];
}

const edgeKey = (a: Cell, b: Cell) => {
  const [p, q] = a.x < b.x || (a.x === b.x && a.y < b.y) ? [a, b] : [b, a];
  return `${p.x},${p.y}-${q.x},${q.y}`;
};
/** The set of one-square lines a path draws (direction and repeats don't matter). */
export function edgesOf(path: Cell[]): Set<string> {
  const out = new Set<string>();
  for (let i = 1; i < path.length; i++) out.add(edgeKey(path[i - 1], path[i]));
  return out;
}
export const sameDrawing = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((k) => b.has(k));

const edgeCells = (k: string): [Cell, Cell] => {
  const [p, q] = k.split('-').map((s) => s.split(',').map(Number));
  return [
    { x: p[0], y: p[1] },
    { x: q[0], y: q[1] },
  ];
};

/** The board: dots for squares, the dashed target picture, the pen's lines and the robot. */
export function DrawingBoard({
  world,
  layout,
  robot,
  trail,
  target,
  bump,
}: {
  world: World;
  layout: GridLayout;
  robot: RobotState;
  trail: Cell[];
  target?: Set<string>;
  bump?: Cell | null;
}) {
  const g = layout;
  const s = g.cell;
  const angle = useRef({ dir: robot.dir as Dir, deg: robot.dir * 90 });
  if (angle.current.dir !== robot.dir) {
    let delta = (robot.dir - angle.current.dir) * 90;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    angle.current = { dir: robot.dir, deg: angle.current.deg + delta };
  }
  const [rx, ry] = cellCenter(g, robot);
  return (
    <g>
      <rect x={g.x + 5} y={g.y + 7} width={world.cols * s} height={world.rows * s} rx={18} fill={C.ink} opacity={0.12} />
      <rect x={g.x} y={g.y} width={world.cols * s} height={world.rows * s} rx={18} fill="#fbfcff" stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: world.rows }, (_, y) =>
        Array.from({ length: world.cols }, (_, x) => <circle key={`${x},${y}`} cx={g.x + (x + 0.5) * s} cy={g.y + (y + 0.5) * s} r={3.5} fill={C.line} />),
      )}
      {[...(target ?? [])].map((k) => {
        const [a, b] = edgeCells(k).map((c) => cellCenter(g, c));
        return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.purple} strokeWidth={s * 0.22} strokeLinecap="round" opacity={0.28} />;
      })}
      {trail.length > 1 && (
        <polyline
          points={trail.map((c) => cellCenter(g, c).join(',')).join(' ')}
          fill="none"
          stroke={shade(ROBOT_COLOR, -0.1)}
          strokeWidth={s * 0.12}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {bump && (
        <g>
          <circle cx={rx + (DIR_VEC[robot.dir][0] * s) / 2} cy={ry + (DIR_VEC[robot.dir][1] * s) / 2} r={s * 0.22} fill={C.red} stroke={C.ink} strokeWidth={2} />
          <text x={rx + (DIR_VEC[robot.dir][0] * s) / 2} y={ry + (DIR_VEC[robot.dir][1] * s) / 2} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.26} fontWeight={800} fill="white">
            !
          </text>
        </g>
      )}
      <g style={{ transform: `translate(${rx}px, ${ry}px)`, transition: 'transform 0.25s ease' }}>
        <g style={{ transform: `rotate(${angle.current.deg}deg)`, transition: 'transform 0.25s ease' }}>
          <RobotBody size={s * 0.8} mood={bump ? 'oops' : 'happy'} />
        </g>
      </g>
    </g>
  );
}

/** A finished drawing as a small picture (for practice questions). */
export function DrawPicture({ calls, cell = 30, robot = true }: { calls: Call[]; cell?: number; robot?: boolean }) {
  const path = penPath(calls) ?? [];
  const g = { x: 8, y: 8, cell };
  const W = BOARD.cols * cell + 16;
  const H = BOARD.rows * cell + 16;
  const [sx, sy] = cellCenter(g, BOARD.start);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A drawing made by the robot's pen">
      <rect x={g.x} y={g.y} width={BOARD.cols * cell} height={BOARD.rows * cell} rx={10} fill="#fbfcff" stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: BOARD.rows }, (_, y) =>
        Array.from({ length: BOARD.cols }, (_, x) => <circle key={`${x},${y}`} cx={g.x + (x + 0.5) * cell} cy={g.y + (y + 0.5) * cell} r={2.5} fill={C.line} />),
      )}
      {path.length > 1 && <polyline points={path.map((c) => cellCenter(g, c).join(',')).join(' ')} fill="none" stroke={ROBOT_COLOR} strokeWidth={cell * 0.16} strokeLinecap="round" strokeLinejoin="round" />}
      {robot && (
        <g transform={`translate(${sx} ${sy})`}>
          <RobotBody size={cell * 0.8} />
        </g>
      )}
    </svg>
  );
}
