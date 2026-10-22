import { useState } from 'react';
import { Box, Boxes, PackageOpen, Scissors } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C, shade } from '../../lib/color';
import { pick, rand, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { iso } from '../../visuals/Iso';

// ───────────────────────── folding a net ─────────────────────────

type Cell = [number, number]; // [column, row]; rows grow southwards
type V3 = [number, number, number];
const neg = (a: V3): V3 => [-a[0], -a[1], -a[2]];
const key = (c: Cell) => `${c[0]},${c[1]}`;

const FACE: Record<string, string> = {
  '0,0,-1': 'Bottom',
  '0,0,1': 'Top',
  '1,0,0': 'Right',
  '-1,0,0': 'Left',
  '0,-1,0': 'Front',
  '0,1,0': 'Back',
};
const FACE_COLOR: Record<string, string> = {
  Bottom: C.wood,
  Top: C.yellow,
  Right: C.orange,
  Left: C.green,
  Front: C.blue,
  Back: C.purple,
};

export interface Folded {
  /** Face name each cell lands on. */
  faces: string[];
  /** Indexes of cells that land on a face another cell already covers. */
  clash: number[];
  ok: boolean;
}

/**
 * Fold six squares into a cube by "rolling": one square is the bottom, and each step over an
 * edge turns the face's outward direction. Returns null unless there are 6 squares joined edge to edge.
 */
export function foldNet(cells: Cell[]): Folded | null {
  if (cells.length !== 6) return null;
  const at = new Map(cells.map((c, i) => [key(c), i]));
  const near = (c: Cell, dc: number, dr: number) => at.get(key([c[0] + dc, c[1] + dr]));
  const degree = cells.map((c) => [near(c, 1, 0), near(c, -1, 0), near(c, 0, 1), near(c, 0, -1)].filter((x) => x !== undefined).length);
  const base = degree.indexOf(Math.max(...degree));
  // n: outward normal; u: where "east" on the paper points; v: where "south" points.
  const state: ({ n: V3; u: V3; v: V3 } | undefined)[] = [];
  state[base] = { n: [0, 0, -1], u: [1, 0, 0], v: [0, -1, 0] };
  const queue = [base];
  while (queue.length) {
    const i = queue.shift()!;
    const { n, u, v } = state[i]!;
    const moves: [number, number, { n: V3; u: V3; v: V3 }][] = [
      [1, 0, { n: u, u: neg(n), v }],
      [-1, 0, { n: neg(u), u: n, v }],
      [0, 1, { n: v, u, v: neg(n) }],
      [0, -1, { n: neg(v), u, v: n }],
    ];
    for (const [dc, dr, next] of moves) {
      const j = near(cells[i], dc, dr);
      if (j !== undefined && !state[j]) {
        state[j] = next;
        queue.push(j);
      }
    }
  }
  if (state.filter(Boolean).length !== 6) return null;
  const faces = state.map((s) => FACE[s!.n.join(',')]);
  const clash = faces.map((f, i) => (faces.indexOf(f) !== i || faces.lastIndexOf(f) !== i ? i : -1)).filter((i) => i >= 0);
  return { faces, clash, ok: clash.length === 0 };
}

const PRESETS: { name: string; cells: Cell[] }[] = [
  { name: 'Cross', cells: [[2, 0], [1, 1], [2, 1], [3, 1], [2, 2], [2, 3]] },
  { name: 'T', cells: [[1, 0], [2, 0], [3, 0], [2, 1], [2, 2], [2, 3]] },
  { name: 'Stairs', cells: [[1, 0], [2, 0], [2, 1], [3, 1], [3, 2], [4, 2]] },
  { name: '2 × 3', cells: [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2]] },
  { name: 'Long L', cells: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [0, 0]] },
];

const GRID = { x: 60, y: 160, cols: 6, rows: 5, cell: 62 };
const CUBE = { cx: 740, cy: 300, u: 120 };

function FoldView() {
  const [cells, setCells] = useState<Cell[]>(PRESETS[0].cells);
  const [folded, setFolded] = useState(false);
  const result = foldNet(cells);

  const toggle = (c: Cell) => {
    const k = key(c);
    const has = cells.some((x) => key(x) === k);
    if (!has && cells.length >= 6) return;
    setCells(has ? cells.filter((x) => key(x) !== k) : [...cells, c]);
    setFolded(false);
    play('tap');
  };
  const choose = (list: Cell[]) => {
    setCells(list);
    setFolded(false);
    play('pop');
  };
  const fold = () => {
    setFolded(!folded);
    if (!folded) play(result?.ok ? 'correct' : 'wrong');
  };

  const P = (x: number, y: number, z: number): [number, number] => {
    const [px, py] = iso(x - 0.5, y - 0.5, z - 0.5, CUBE.u);
    return [CUBE.cx + px, CUBE.cy + py];
  };
  const poly = (pts: [number, number][]) => pts.map((p) => p.join(',')).join(' ');
  const mid = (pts: [number, number][]) => [pts.reduce((s, p) => s + p[0], 0) / 4, pts.reduce((s, p) => s + p[1], 0) / 4];
  // Iso x runs east, iso y runs south: we see the Top, the Front (south) and the Right (east).
  const visible: [string, [number, number][]][] = [
    ['Top', [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)]],
    ['Front', [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)]],
    ['Right', [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)]],
  ];

  const status =
    cells.length !== 6
      ? `${cells.length} of 6 squares. A cube has 6 faces.`
      : !result
        ? 'Every square must touch another along a whole edge.'
        : folded
          ? result.ok
            ? 'It folds into a cube! Every square lands on a different face.'
            : `Not a cube net: the red squares both land on the ${result.faces[result.clash[0]]} face.`
          : 'Will it fold into a cube? Predict, then fold it.';

  return (
    <g>
      {PRESETS.map((p, i) => (
        <SvgButton key={p.name} x={60 + i * 104} y={92} w={96} h={48} fontSize={17} label={p.name} onClick={() => choose(p.cells)} />
      ))}
      <SvgButton x={580} y={92} w={96} h={48} fontSize={17} label="Clear" onClick={() => choose([])} disabled={!cells.length} />

      {Array.from({ length: GRID.cols * GRID.rows }, (_, i) => {
        const c: Cell = [i % GRID.cols, Math.floor(i / GRID.cols)];
        const idx = cells.findIndex((x) => key(x) === key(c));
        const on = idx >= 0;
        const face = folded && result ? result.faces[idx] : undefined;
        const bad = folded && result && !result.ok && result.clash.includes(idx);
        const x = GRID.x + c[0] * GRID.cell;
        const y = GRID.y + c[1] * GRID.cell;
        return (
          <g key={i} onClick={() => toggle(c)} style={{ cursor: 'pointer' }} data-nopan role="button" aria-label={`Square ${c[0] + 1}, ${c[1] + 1}${on ? ', on' : ''}`}>
            <rect
              x={x + 2}
              y={y + 2}
              width={GRID.cell - 4}
              height={GRID.cell - 4}
              rx={6}
              fill={!on ? shade(C.line, 0.6) : bad ? shade(C.red, 0.35) : face ? shade(FACE_COLOR[face], 0.3) : shade(C.blue, 0.55)}
              stroke={on ? C.ink : C.line}
              strokeWidth={on ? 2.5 : 1.5}
              strokeDasharray={on ? undefined : '4 4'}
              style={{ transition: 'fill 0.3s' }}
            />
            {on && face && (
              <text x={x + GRID.cell / 2} y={y + GRID.cell / 2} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill={C.ink}>
                {bad ? '?' : face}
              </text>
            )}
          </g>
        );
      })}
      <SvgButton x={60} y={490} w={190} h={52} fontSize={19} label={folded ? 'Unfold' : 'Fold it'} onClick={fold} disabled={!result} color={C.yellow} />

      {folded && result?.ok ? (
        <g className="pop-in" style={{ transformOrigin: `${CUBE.cx}px ${CUBE.cy}px` }}>
          {visible.map(([name, pts]) => {
            const [mx, my] = mid(pts);
            return (
              <g key={name}>
                <polygon points={poly(pts)} fill={shade(FACE_COLOR[name], 0.3)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
                <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={C.ink}>
                  {name}
                </text>
              </g>
            );
          })}
          <text x={CUBE.cx} y={CUBE.cy + 170} textAnchor="middle" fontSize={16} fill={C.ink2}>
            Hidden: Bottom, Back and Left
          </text>
        </g>
      ) : (
        <g opacity={0.5}>
          {visible.map(([name, pts]) => (
            <polygon key={name} points={poly(pts)} fill={folded && result && !result.ok ? shade(C.red, 0.8) : C.card} stroke={C.muted} strokeWidth={2} strokeDasharray="8 6" strokeLinejoin="round" />
          ))}
        </g>
      )}

      <rect x={60} y={566} width={880} height={86} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={80} y={598} fontSize={15} fill={C.muted} className="caps">
        Tap squares to build a net · {cells.length} / 6
      </text>
      <text x={80} y={630} fontSize={19} fontWeight={700} fill={folded && result && !result.ok ? C.red : C.ink}>
        {status}
      </text>
      <Callout at={[GRID.x + GRID.cell * 6, GRID.y + GRID.cell]} box={[480, 486]} w={300} icon={Scissors} title="A net is a cut-open box" text="Six squares that fold up with no gaps and no overlaps make a cube. There are 11 different cube nets." />
    </g>
  );
}

// ───────────────────────── surface area ─────────────────────────

const PAIR_COLOR = { top: C.yellow, front: C.blue, side: C.green };

function SurfaceView() {
  const [l, setL] = useState(4);
  const [w, setW] = useState(3);
  const [h, setH] = useState(2);
  const [open, setOpen] = useState(false);
  const sa = 2 * (l * w + l * h + w * h);
  const vol = l * w * h;

  const change = (set: (v: number) => void, v: number) => {
    set(v);
    play('pop');
  };
  const toggle = () => {
    setOpen(!open);
    play('whoosh');
  };
  const stepper = (y: number, label: string, value: number, set: (v: number) => void) => (
    <g>
      <text x={640} y={y + 25} dominantBaseline="central" fontSize={16} fill={C.muted} className="caps">
        {label}
      </text>
      <SvgButton x={790} y={y} w={52} h={50} label="−" title={`Shorter ${label.toLowerCase()}`} onClick={() => change(set, value - 1)} disabled={value <= 1} />
      <text x={878} y={y + 25} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink} className="num">
        {value}
      </text>
      <SvgButton x={912} y={y} w={52} h={50} label="+" title={`Longer ${label.toLowerCase()}`} onClick={() => change(set, value + 1)} disabled={value >= 5} color={C.yellow} />
    </g>
  );

  return (
    <g>
      {open ? <CuboidNet l={l} w={w} h={h} /> : <Cuboid l={l} w={w} h={h} />}
      {stepper(96, 'Length', l, setL)}
      {stepper(160, 'Width', w, setW)}
      {stepper(224, 'Height', h, setH)}
      <SvgButton x={640} y={296} w={324} h={52} fontSize={18} label={open ? 'Fold it back up' : 'Unfold it'} onClick={toggle} color={C.yellow} />
      <text x={640} y={384} fontSize={15} fill={C.muted}>
        Each small square is 1 cm × 1 cm.
      </text>

      <rect x={60} y={500} width={904} height={156} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={80} y={530} fontSize={15} fill={C.muted} className="caps">
        Surface area: all 6 faces
      </text>
      <text x={80} y={566} fontSize={22} fontWeight={700} fill={C.ink} className="num">
        2 × {l * w} + 2 × {l * h} + 2 × {w * h} = {sa} cm²
      </text>
      <text x={80} y={604} fontSize={15} fill={C.muted} className="caps">
        Volume: cubes inside
      </text>
      <text x={80} y={638} fontSize={22} fontWeight={700} fill={C.ink} className="num">
        {l} × {w} × {h} = {vol} cm³
      </text>
      {[
        ['Top + bottom', PAIR_COLOR.top, `${l} × ${w}`],
        ['Front + back', PAIR_COLOR.front, `${l} × ${h}`],
        ['Two sides', PAIR_COLOR.side, `${w} × ${h}`],
      ].map(([name, color, dims], i) => (
        <g key={name}>
          <rect x={640} y={410 + i * 28} width={20} height={20} rx={4} fill={shade(color, 0.3)} stroke={C.ink} strokeWidth={1.5} />
          <text x={670} y={421 + i * 28} dominantBaseline="central" fontSize={16} fill={C.ink}>
            {name}: {dims}
          </text>
        </g>
      ))}
      <Callout at={[600, 500]} box={[600, 22]} w={300} icon={PackageOpen} title="Outside vs inside" text="Surface area counts the squares that cover the outside. Volume counts the cubes that fill the inside." />
    </g>
  );
}

function Cuboid({ l, w, h }: { l: number; w: number; h: number }) {
  const u = Math.min(56, 500 / ((l + w) * 0.866), 330 / ((l + w) * 0.5 + h));
  const ox = 320 - ((l - w) * 0.866 * u) / 2;
  const oy = 300 - ((l + w) * 0.5 * u - h * u) / 2;
  const P = (x: number, y: number, z: number): [number, number] => {
    const [px, py] = iso(x, y, z, u);
    return [ox + px, oy + py];
  };
  const poly = (pts: [number, number][]) => pts.map((p) => p.join(',')).join(' ');
  const line = (a: [number, number], b: [number, number], k: string) => <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.ink} strokeOpacity={0.3} strokeWidth={1.2} />;
  const lw = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [lx, ly] = lw(P(0, w, 0), P(l, w, 0));
  const [wx, wy] = lw(P(l, 0, 0), P(l, w, 0));
  const [hx, hy] = lw(P(0, w, 0), P(0, w, h));
  return (
    <g strokeLinejoin="round" className="fade-in">
      <polygon points={poly([P(0, 0, h), P(l, 0, h), P(l, w, h), P(0, w, h)])} fill={shade(PAIR_COLOR.top, 0.3)} stroke={C.ink} strokeWidth={2.5} />
      <polygon points={poly([P(0, w, 0), P(l, w, 0), P(l, w, h), P(0, w, h)])} fill={shade(PAIR_COLOR.front, 0.45)} stroke={C.ink} strokeWidth={2.5} />
      <polygon points={poly([P(l, 0, 0), P(l, w, 0), P(l, w, h), P(l, 0, h)])} fill={shade(PAIR_COLOR.side, 0.3)} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: l - 1 }, (_, i) => [line(P(i + 1, 0, h), P(i + 1, w, h), `tx${i}`), line(P(i + 1, w, 0), P(i + 1, w, h), `fx${i}`)])}
      {Array.from({ length: w - 1 }, (_, j) => [line(P(0, j + 1, h), P(l, j + 1, h), `ty${j}`), line(P(l, j + 1, 0), P(l, j + 1, h), `sy${j}`)])}
      {Array.from({ length: h - 1 }, (_, k) => [line(P(0, w, k + 1), P(l, w, k + 1), `fz${k}`), line(P(l, 0, k + 1), P(l, w, k + 1), `sz${k}`)])}
      <text x={lx - 34} y={ly + 34} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink} className="num">
        length {l}
      </text>
      <text x={wx + 18} y={wy + 26} textAnchor="start" fontSize={20} fontWeight={700} fill={C.ink} className="num">
        width {w}
      </text>
      <text x={hx - 14} y={hy} textAnchor="end" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink} className="num">
        height {h}
      </text>
    </g>
  );
}

function CuboidNet({ l, w, h }: { l: number; w: number; h: number }) {
  const U = Math.min(40, 540 / (2 * h + l), 380 / (2 * h + 2 * w));
  const W = (2 * h + l) * U;
  const H = (2 * h + 2 * w) * U;
  const x0 = 330 - W / 2;
  const y0 = 96 + (390 - H) / 2;
  // [name, col, row, cols, rows, colour]
  const faces: [string, number, number, number, number, string][] = [
    ['Back', h, 0, l, h, PAIR_COLOR.front],
    ['Left', 0, h, h, w, PAIR_COLOR.side],
    ['Top', h, h, l, w, PAIR_COLOR.top],
    ['Right', h + l, h, h, w, PAIR_COLOR.side],
    ['Front', h, h + w, l, h, PAIR_COLOR.front],
    ['Bottom', h, 2 * h + w, l, w, PAIR_COLOR.top],
  ];
  return (
    <g className="fade-in">
      {faces.map(([name, c, r, cw, rh, color]) => {
        const x = x0 + c * U;
        const y = y0 + r * U;
        const fw = cw * U;
        const fh = rh * U;
        const roomy = fw >= 70 && fh >= 44;
        return (
          <g key={name}>
            <rect x={x} y={y} width={fw} height={fh} fill={shade(color, 0.35)} stroke={C.ink} strokeWidth={2.5} />
            {Array.from({ length: cw - 1 }, (_, i) => (
              <line key={`c${i}`} x1={x + (i + 1) * U} y1={y} x2={x + (i + 1) * U} y2={y + fh} stroke={C.ink} strokeOpacity={0.2} />
            ))}
            {Array.from({ length: rh - 1 }, (_, i) => (
              <line key={`r${i}`} x1={x} y1={y + (i + 1) * U} x2={x + fw} y2={y + (i + 1) * U} stroke={C.ink} strokeOpacity={0.2} />
            ))}
            {roomy && (
              <text x={x + fw / 2} y={y + fh / 2 - 10} textAnchor="middle" dominantBaseline="central" fontSize={15} fill={C.ink2}>
                {name}
              </text>
            )}
            <text x={x + fw / 2} y={y + fh / 2 + (roomy ? 10 : 0)} textAnchor="middle" dominantBaseline="central" fontSize={fw >= 30 && fh >= 22 ? 18 : 15} fontWeight={700} fill={C.ink} className="num">
              {cw * rh}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ───────────────────────── scene ─────────────────────────

type Mode = 'fold' | 'surface';

function NetsScene() {
  const [mode, setMode] = useState<Mode>('fold');
  return (
    <SceneSvg label="Nets and surface area: fold nets into cubes and unfold cuboids">
      <SvgButton x={60} y={24} w={170} h={48} fontSize={18} label="Fold a net" active={mode === 'fold'} color={mode === 'fold' ? C.yellow : C.card} onClick={() => setMode('fold')} />
      <SvgButton x={242} y={24} w={190} h={48} fontSize={18} label="Surface area" active={mode === 'surface'} color={mode === 'surface' ? C.yellow : C.card} onClick={() => setMode('surface')} />
      {mode === 'fold' ? <FoldView /> : <SurfaceView />}
    </SceneSvg>
  );
}

function Thumb() {
  const cells: Cell[] = PRESETS[0].cells;
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      {cells.map(([c, r]) => (
        <rect key={`${c}${r}`} x={4 + c * 15} y={8 + r * 15} width={15} height={15} fill={shade(C.blue, 0.55)} stroke={C.ink} strokeWidth={1.2} />
      ))}
      <g transform="translate(92 44)">
        <polygon points={[iso(0, 0, 1, 18), iso(1, 0, 1, 18), iso(1, 1, 1, 18), iso(0, 1, 1, 18)].map((p) => p.join(',')).join(' ')} fill={shade(C.yellow, 0.3)} stroke={C.ink} strokeWidth={1.2} />
        <polygon points={[iso(0, 1, 0, 18), iso(1, 1, 0, 18), iso(1, 1, 1, 18), iso(0, 1, 1, 18)].map((p) => p.join(',')).join(' ')} fill={shade(C.blue, 0.4)} stroke={C.ink} strokeWidth={1.2} />
        <polygon points={[iso(1, 0, 0, 18), iso(1, 1, 0, 18), iso(1, 1, 1, 18), iso(1, 0, 1, 18)].map((p) => p.join(',')).join(' ')} fill={shade(C.orange, 0.3)} stroke={C.ink} strokeWidth={1.2} />
      </g>
    </svg>
  );
}

// ───────────────────────── practice ─────────────────────────

const strip = (extra: Cell[]): Cell[] => [[0, 1], [1, 1], [2, 1], [3, 1], ...extra];
const NET_POOL: Cell[][] = [
  ...[0, 1, 2, 3].flatMap((a) => [0, 1, 2, 3].map((b) => strip([[a, 0], [b, 2]]))),
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [0, 0]],
  strip([[0, 0], [2, 0]]),
  strip([[1, 0], [3, 0]]),
  strip([[0, 0], [1, 0]]),
  strip([[1, 2], [2, 2]]),
  [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1], [3, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [2, 1]],
];
const GOOD_NETS = NET_POOL.filter((n) => foldNet(n)?.ok);
const BAD_NETS = NET_POOL.filter((n) => foldNet(n) && !foldNet(n)!.ok);

function NetPicture({ cells, size = 22, label }: { cells: Cell[]; size?: number; label?: string }) {
  const cols = Math.max(...cells.map((c) => c[0])) + 1;
  const rows = Math.max(...cells.map((c) => c[1])) + 1;
  return (
    <svg viewBox={`0 0 ${cols * size + 8} ${rows * size + 8 + (label ? 22 : 0)}`} aria-hidden>
      {cells.map(([c, r]) => (
        <rect key={`${c},${r}`} x={4 + c * size} y={4 + r * size} width={size} height={size} fill={shade(C.blue, 0.55)} stroke={C.ink} strokeWidth={1.5} />
      ))}
      {label && (
        <text x={(cols * size + 8) / 2} y={rows * size + 24} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
          {label}
        </text>
      )}
    </svg>
  );
}

function CuboidPicture({ l, w, h }: { l: number; w: number; h: number }) {
  const u = Math.min(24, 150 / ((l + w) * 0.866 + 1), 110 / ((l + w) * 0.5 + h));
  const P = (x: number, y: number, z: number) => {
    const [px, py] = iso(x, y, z, u);
    return [110 + px - ((l - w) * 0.866 * u) / 2, 70 + py - ((l + w) * 0.5 * u - h * u) / 2].join(',');
  };
  return (
    <svg viewBox="0 0 220 150" aria-hidden>
      <polygon points={[P(0, 0, h), P(l, 0, h), P(l, w, h), P(0, w, h)].join(' ')} fill={shade(C.yellow, 0.3)} stroke={C.ink} strokeWidth={2} />
      <polygon points={[P(0, w, 0), P(l, w, 0), P(l, w, h), P(0, w, h)].join(' ')} fill={shade(C.blue, 0.45)} stroke={C.ink} strokeWidth={2} />
      <polygon points={[P(l, 0, 0), P(l, w, 0), P(l, w, h), P(l, 0, h)].join(' ')} fill={shade(C.green, 0.3)} stroke={C.ink} strokeWidth={2} />
      <text x={110} y={144} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
        {l} cm × {w} cm × {h} cm
      </text>
    </svg>
  );
}

function foldsQ(): Question {
  const good = Math.random() < 0.5;
  const cells = pick(good ? GOOD_NETS : BAD_NETS);
  const r = foldNet(cells)!;
  return {
    prompt: 'Does this net fold into a cube?',
    visual: <NetPicture cells={cells} />,
    choices: [{ value: 'Yes' }, { value: 'No' }],
    answer: good ? 'Yes' : 'No',
    hint: 'Pick one square to be the bottom. Fold the others up in your head: does any face get two squares?',
    explain: good
      ? ['Put one square down as the bottom and fold the rest up around it.', 'Every square lands on a different face, with none left empty.', 'Yes, it folds into a cube.']
      : ['Put one square down as the bottom and fold the rest up around it.', `Two squares land on the same face (the ${r.faces[r.clash[0]].toLowerCase()}), so another face is left open.`, 'No, it does not fold into a cube.'],
  };
}

function whichNetQ(): Question {
  const right = pick(GOOD_NETS);
  const wrong = shuffle(BAD_NETS).slice(0, 3);
  const all = shuffle([right, ...wrong]);
  const letters = ['A', 'B', 'C', 'D'];
  const at = all.indexOf(right);
  return {
    prompt: 'Which of these nets folds into a cube?',
    choices: all.map((cells, i) => ({ value: letters[i], label: <NetPicture cells={cells} size={16} label={letters[i]} />, name: `Net ${letters[i]}` })),
    answer: letters[at],
    hint: 'Look out for a 2 × 2 block or 5 squares in a row: those can never fold into a cube.',
    explain: ['In each wrong net, two squares would land on the same face when you fold it.', `Net ${letters[at]} has every square on a different face.`, `So Net ${letters[at]} folds into a cube.`],
  };
}

function cubeAreaQ(): Question {
  const e = rand(1, 6);
  return {
    prompt: `A cube has edges of ${e} cm. What is its surface area in cm²?`,
    visual: <CuboidPicture l={e} w={e} h={e} />,
    answer: String(6 * e * e),
    hint: 'How many faces does a cube have, and what is the area of one face?',
    explain: [`Each face is ${e} × ${e} = ${e * e} cm².`, `A cube has 6 faces: 6 × ${e * e} = ${6 * e * e}.`, `So the surface area is ${6 * e * e} cm².`],
  };
}

function cuboidAreaQ(): Question {
  const [l, w, h] = shuffle([rand(2, 7), rand(2, 6), rand(1, 5)]);
  const sa = 2 * (l * w + l * h + w * h);
  return {
    prompt: `A cuboid is ${l} cm × ${w} cm × ${h} cm. What is its surface area in cm²?`,
    visual: <CuboidPicture l={l} w={w} h={h} />,
    answer: String(sa),
    hint: 'There are 3 pairs of matching faces. Find the area of one of each pair.',
    explain: [
      `Top and bottom: 2 × (${l} × ${w}) = ${2 * l * w}.`,
      `Front and back: 2 × (${l} × ${h}) = ${2 * l * h}.`,
      `Two sides: 2 × (${w} × ${h}) = ${2 * w * h}.`,
      `Total: ${2 * l * w} + ${2 * l * h} + ${2 * w * h} = ${sa} cm².`,
    ],
  };
}

const SAME_VOLUME: number[][][] = [
  [[2, 2, 3], [1, 3, 4], [1, 2, 6], [1, 1, 12]],
  [[2, 3, 4], [1, 4, 6], [1, 2, 12], [1, 1, 24], [2, 2, 6]],
  [[3, 3, 4], [2, 3, 6], [1, 6, 6], [1, 4, 9], [2, 2, 9]],
  [[2, 3, 5], [1, 5, 6], [1, 3, 10], [1, 2, 15]],
];
const saOf = ([a, b, c]: number[]) => 2 * (a * b + a * c + b * c);
const boxName = (d: number[]) => d.join(' × ');

function smallestAreaQ(): Question {
  const set = pick(SAME_VOLUME);
  const boxes = shuffle(set).slice(0, 4);
  const best = boxes.reduce((m, b) => (saOf(b) < saOf(m) ? b : m), boxes[0]);
  const vol = best[0] * best[1] * best[2];
  const other = boxes.find((b) => b !== best)!;
  return {
    prompt: `These boxes all hold ${vol} cubes. Which has the smallest surface area?`,
    choices: boxes.map((b) => ({ value: boxName(b) })),
    answer: boxName(best),
    hint: 'Long, thin boxes have lots of outside. Which box is closest to a cube?',
    explain: [
      `Surface area = 2 × (l × w + l × h + w × h).`,
      `${boxName(best)}: ${saOf(best)} cm². ${boxName(other)}: ${saOf(other)} cm².`,
      `The most cube-like box has the least outside: ${boxName(best)}.`,
    ],
  };
}

function edgeFromAreaQ(): Question {
  const e = rand(2, 9);
  const sa = 6 * e * e;
  return {
    prompt: `A cube has a surface area of ${sa} cm². How long is each edge in cm?`,
    answer: String(e),
    hint: 'Split the surface area between the 6 equal faces first.',
    explain: [`A cube has 6 equal faces: ${sa} ÷ 6 = ${e * e} cm² each.`, `${e} × ${e} = ${e * e}, so each edge is ${e} cm.`],
  };
}

function makeQuestion(level: number): Question {
  if (level === 0) return pick([foldsQ, cubeAreaQ])();
  if (level === 1) return pick([whichNetQ, cuboidAreaQ])();
  return pick([smallestAreaQ, edgeFromAreaQ, cuboidAreaQ])();
}

export const netsAndSurfaceArea: Lesson = {
  id: 'nets-and-surface-area',
  title: 'Nets and Surface Area',
  Thumb,
  Scene: NetsScene,
  sceneHint: 'Build a net and fold it · Unfold a cuboid to add its faces',
  learn: {
    heading: 'Nets and surface area',
    intro: 'A net is a flat shape that folds up into a 3D solid. Surface area is the total area of all the faces: the amount of paper you would need to wrap the solid.',
    points: [
      { icon: Scissors, text: 'Cut a box along its edges and lay it flat: that is a net.' },
      { icon: Box, text: 'A cube has 6 square faces. Only 11 different nets fold into a cube.' },
      { icon: PackageOpen, text: 'Surface area = add up the area of every face. A cuboid has 3 pairs of matching faces.' },
      { icon: Boxes, text: 'Volume counts the cubes inside. Surface area counts the squares outside.' },
    ],
  },
  steps: [
    'Name the three different faces: top, front and side.',
    'Find the area of each one: length × width.',
    'Each face has a matching partner, so double each area.',
    'Add the three doubled areas. Write the answer in square units, like cm².',
  ],
  example: {
    question: 'What is the surface area of a 4 cm × 3 cm × 2 cm cuboid?',
    visual: <CuboidPicture l={4} w={3} h={2} />,
    work: ['Top and bottom: 2 × (4 × 3) = 24.', 'Front and back: 2 × (4 × 2) = 16.', 'Two sides: 2 × (3 × 2) = 12.', 'Total: 24 + 16 + 12 = 52.'],
    answer: '52 cm²',
  },
  grownups: [
    'Make nets from squared paper and actually fold them. Predicting first ("will it fold?") builds spatial reasoning.',
    'A 2 × 2 block of squares, or 5 squares in a row, can never be part of a cube net.',
    'Children often mix up surface area (cm²) and volume (cm³). Wrapping paper versus filling with sugar cubes helps.',
    'Boxes with the same volume can have very different surface areas — packaging designers use this to save card.',
  ],
  makeQuestion,
};
