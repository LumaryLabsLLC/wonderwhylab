import { useRef } from 'react';
import { C, shade } from '../../../lib/color';
import { DIR_VEC, sameCell } from './model';
import type { Cell, Dir, RobotState, World } from './model';

/** Where the grid sits in the scene: top-left corner and cell size, in scene units. */
export interface GridLayout {
  x: number;
  y: number;
  cell: number;
}

export const ROBOT_COLOR = '#5b6cff';

export const cellCenter = (g: GridLayout, c: Cell): [number, number] => [g.x + (c.x + 0.5) * g.cell, g.y + (c.y + 0.5) * g.cell];

/** Which cell a scene point falls in (or null outside the grid). */
export function cellAt(g: GridLayout, world: World, p: { x: number; y: number }): Cell | null {
  const x = Math.floor((p.x - g.x) / g.cell);
  const y = Math.floor((p.y - g.y) / g.cell);
  return x >= 0 && y >= 0 && x < world.cols && y < world.rows ? { x, y } : null;
}

/**
 * A friendly top-down robot centred at (0, 0), facing up; rotate it to face other ways.
 * `size` is roughly its diameter.
 */
export function RobotBody({ size, mood = 'happy' }: { size: number; mood?: 'happy' | 'oops' | 'proud' }) {
  const r = size / 2;
  return (
    <g>
      <ellipse cx={0} cy={r * 0.18} rx={r * 0.95} ry={r * 0.85} fill={C.ink} opacity={0.14} />
      {/* wheels */}
      <rect x={-r * 1.02} y={-r * 0.5} width={r * 0.3} height={r} rx={r * 0.12} fill={C.ink} />
      <rect x={r * 0.72} y={-r * 0.5} width={r * 0.3} height={r} rx={r * 0.12} fill={C.ink} />
      <circle r={r * 0.82} fill={ROBOT_COLOR} stroke={C.ink} strokeWidth={2.5} />
      {/* face plate at the front (top) */}
      <rect x={-r * 0.58} y={-r * 0.66} width={r * 1.16} height={r * 0.62} rx={r * 0.24} fill="white" stroke={C.ink} strokeWidth={2} />
      {mood === 'oops' ? (
        <g stroke={C.ink} strokeWidth={2.4} strokeLinecap="round">
          <path d={`M${-r * 0.36},${-r * 0.48} l${r * 0.2},${r * 0.2} m0,${-r * 0.2} l${-r * 0.2},${r * 0.2}`} />
          <path d={`M${r * 0.16},${-r * 0.48} l${r * 0.2},${r * 0.2} m0,${-r * 0.2} l${-r * 0.2},${r * 0.2}`} />
        </g>
      ) : (
        <>
          <circle cx={-r * 0.26} cy={-r * 0.38} r={r * 0.11} fill={C.ink} />
          <circle cx={r * 0.26} cy={-r * 0.38} r={r * 0.11} fill={C.ink} />
        </>
      )}
      {/* antenna light */}
      <circle cx={0} cy={r * 0.32} r={r * 0.14} fill={mood === 'proud' ? C.yellow : '#9fb0ff'} stroke={C.ink} strokeWidth={1.8} />
      {/* front marker so the facing direction is obvious */}
      <path d={`M${-r * 0.2},${-r * 0.9} L0,${-r * 1.12} L${r * 0.2},${-r * 0.9} Z`} fill={C.yellow} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
    </g>
  );
}

function Star({ cx, cy, r, faded }: { cx: number; cy: number; r: number; faded?: boolean }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
  }).join(' ');
  return <polygon points={pts} fill={C.yellow} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" opacity={faded ? 0.18 : 1} />;
}

export function Flag({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + s * 0.3} rx={s * 0.34} ry={s * 0.1} fill={C.ink} opacity={0.15} />
      <line x1={cx - s * 0.12} y1={cy + s * 0.3} x2={cx - s * 0.12} y2={cy - s * 0.34} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${cx - s * 0.1},${cy - s * 0.34} L${cx + s * 0.3},${cy - s * 0.22} L${cx - s * 0.1},${cy - s * 0.08} Z`} fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

function Rock({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <rect x={cx - s * 0.4} y={cy - s * 0.32} width={s * 0.8} height={s * 0.7} rx={s * 0.22} fill="#a7adbd" stroke={C.ink} strokeWidth={2} />
      <path d={`M${cx - s * 0.22},${cy - s * 0.14} q${s * 0.1},${-s * 0.1} ${s * 0.24},${-s * 0.04}`} stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

/**
 * The robot's world drawn in a scene: tiles, rocks (walls), stars, the flag (goal), the trail
 * the robot has left, any bump, and the robot itself (animated between cells).
 */
export function GridWorld({
  world,
  layout,
  robot,
  trail = [],
  bump,
  mood = 'happy',
  labels,
  highlight,
  onCellTap,
}: {
  world: World;
  layout: GridLayout;
  robot: RobotState;
  /** Cells visited so far, in order (start included). */
  trail?: Cell[];
  /** Where the robot tried to go and couldn't. */
  bump?: Cell | null;
  mood?: 'happy' | 'oops' | 'proud';
  /** Optional letters drawn in cells (for "where will it end?" questions). */
  labels?: { cell: Cell; text: string }[];
  /** Cells to softly highlight (e.g. a planned path). */
  highlight?: Cell[];
  onCellTap?: (c: Cell) => void;
}) {
  const g = layout;
  const s = g.cell;
  const W = world.cols * s;
  const H = world.rows * s;

  // Keep rotation continuous so the robot turns the short way round.
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
      <rect x={g.x + 5} y={g.y + 7} width={W} height={H} rx={18} fill={C.ink} opacity={0.12} />
      <rect x={g.x} y={g.y} width={W} height={H} rx={18} fill="#eef3ff" stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: world.rows }, (_, y) =>
        Array.from({ length: world.cols }, (_, x) => (
          <rect
            key={`${x},${y}`}
            x={g.x + x * s + 4}
            y={g.y + y * s + 4}
            width={s - 8}
            height={s - 8}
            rx={10}
            fill={(x + y) % 2 ? '#e3eaff' : '#f7f9ff'}
            onClick={onCellTap ? () => onCellTap({ x, y }) : undefined}
            style={onCellTap ? { cursor: 'pointer' } : undefined}
            data-nopan={onCellTap ? true : undefined}
          />
        )),
      )}
      {highlight?.map((c, i) => (
        <rect key={i} x={g.x + c.x * s + 8} y={g.y + c.y * s + 8} width={s - 16} height={s - 16} rx={10} fill={shade(ROBOT_COLOR, 0.75)} />
      ))}
      {/* Trail */}
      {trail.length > 1 && (
        <polyline
          points={trail.map((c) => cellCenter(g, c).join(',')).join(' ')}
          fill="none"
          stroke={shade(ROBOT_COLOR, 0.35)}
          strokeWidth={s * 0.12}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
      )}
      {world.walls.map((c, i) => {
        const [cx, cy] = cellCenter(g, c);
        return <Rock key={i} cx={cx} cy={cy} s={s} />;
      })}
      {world.goal && <Flag cx={cellCenter(g, world.goal)[0]} cy={cellCenter(g, world.goal)[1]} s={s} />}
      {(world.items ?? []).map((c, i) => {
        const [cx, cy] = cellCenter(g, c);
        return <Star key={i} cx={cx} cy={cy} r={s * 0.24} faded={robot.collected.includes(i)} />;
      })}
      {labels?.map((l, i) => {
        const [cx, cy] = cellCenter(g, l.cell);
        return (
          <g key={i}>
            <circle cx={cx + s * 0.28} cy={cy - s * 0.28} r={s * 0.17} fill="white" stroke={C.ink} strokeWidth={2} />
            <text x={cx + s * 0.28} y={cy - s * 0.28} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.2} fontWeight={700} fill={C.ink}>
              {l.text}
            </text>
          </g>
        );
      })}
      {bump && <BumpMark g={g} world={world} at={bump} robot={robot} />}
      <g style={{ transform: `translate(${rx}px, ${ry}px)`, transition: 'transform 0.38s ease' }}>
        <g style={{ transform: `rotate(${angle.current.deg}deg)`, transition: 'transform 0.3s ease' }}>
          <RobotBody size={s * 0.78} mood={mood} />
        </g>
      </g>
    </g>
  );
}

/** A red burst between the robot and the cell it bumped into (rock or the edge of the board). */
function BumpMark({ g, world, at, robot }: { g: GridLayout; world: World; at: Cell; robot: RobotState }) {
  const [rx, ry] = cellCenter(g, robot);
  const [dx, dy] = DIR_VEC[robot.dir];
  const cx = rx + dx * g.cell * 0.5;
  const cy = ry + dy * g.cell * 0.5;
  const r = g.cell * 0.2;
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8;
    const rr = i % 2 ? r * 0.55 : r;
    return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
  }).join(' ');
  const offBoard = !(at.x >= 0 && at.y >= 0 && at.x < world.cols && at.y < world.rows);
  return (
    <g className="pop-in-wrap">
      <polygon points={pts} fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={r * 1.1} fontWeight={800} fill="white">
        !
      </text>
      {offBoard && <title>The edge of the board</title>}
    </g>
  );
}

/**
 * A small standalone picture of a world for practice questions (scaled to fit its viewBox).
 * `path` draws the moves as arrows; `labels` letters some cells.
 */
export function GridPicture({
  world,
  robot,
  path,
  labels,
  cell = 60,
  showRobot = true,
}: {
  world: World;
  robot?: RobotState;
  path?: Dir[];
  labels?: { cell: Cell; text: string }[];
  cell?: number;
  showRobot?: boolean;
}) {
  const layout = { x: 8, y: 8, cell };
  const W = world.cols * cell + 16;
  const H = world.rows * cell + 16;
  const state = robot ?? { x: world.start.x, y: world.start.y, dir: world.start.dir, collected: [] };
  const trail: Cell[] = [];
  if (path) {
    let c: Cell = { x: world.start.x, y: world.start.y };
    trail.push(c);
    for (const d of path) {
      const [dx, dy] = DIR_VEC[d];
      c = { x: c.x + dx, y: c.y + dy };
      trail.push(c);
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The robot's grid">
      <GridStatic world={world} layout={layout} robot={state} trail={trail} labels={labels} showRobot={showRobot} />
    </svg>
  );
}

/** Same drawing as GridWorld, without animation state (safe to render many times). */
function GridStatic({
  world,
  layout,
  robot,
  trail,
  labels,
  showRobot,
}: {
  world: World;
  layout: GridLayout;
  robot: RobotState;
  trail: Cell[];
  labels?: { cell: Cell; text: string }[];
  showRobot: boolean;
}) {
  const g = layout;
  const s = g.cell;
  const [rx, ry] = cellCenter(g, robot);
  return (
    <g>
      <rect x={g.x} y={g.y} width={world.cols * s} height={world.rows * s} rx={12} fill="#eef3ff" stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: world.rows }, (_, y) =>
        Array.from({ length: world.cols }, (_, x) => (
          <rect key={`${x},${y}`} x={g.x + x * s + 3} y={g.y + y * s + 3} width={s - 6} height={s - 6} rx={8} fill={(x + y) % 2 ? '#e3eaff' : '#f7f9ff'} />
        )),
      )}
      {trail.length > 1 && (
        <polyline points={trail.map((c) => cellCenter(g, c).join(',')).join(' ')} fill="none" stroke={shade(ROBOT_COLOR, 0.3)} strokeWidth={s * 0.1} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {world.walls.map((c, i) => {
        const [cx, cy] = cellCenter(g, c);
        return <Rock key={i} cx={cx} cy={cy} s={s} />;
      })}
      {world.goal && !sameCell(world.goal, showRobot ? robot : undefined) && <Flag cx={cellCenter(g, world.goal)[0]} cy={cellCenter(g, world.goal)[1]} s={s} />}
      {(world.items ?? []).map((c, i) => {
        const [cx, cy] = cellCenter(g, c);
        return <Star key={i} cx={cx} cy={cy} r={s * 0.24} faded={robot.collected.includes(i)} />;
      })}
      {labels?.map((l, i) => {
        const [cx, cy] = cellCenter(g, l.cell);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={s * 0.26} fill="white" stroke={C.ink} strokeWidth={2} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.3} fontWeight={700} fill={C.ink}>
              {l.text}
            </text>
          </g>
        );
      })}
      {showRobot && (
        <g transform={`translate(${rx} ${ry}) rotate(${robot.dir * 90})`}>
          <RobotBody size={s * 0.78} />
        </g>
      )}
    </g>
  );
}
