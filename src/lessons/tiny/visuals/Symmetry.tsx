import { C, shade } from '../../../lib/color';

/**
 * Grid pictures for mirror symmetry. Each picture is 8 columns × 8 rows and symmetric about
 * the line between column 3 and column 4. Letters pick a colour; '.' is empty.
 */
export const PALETTE: Record<string, string> = {
  r: C.red,
  b: C.blue,
  y: C.yellow,
  g: C.green,
  p: C.purple,
  o: C.orange,
  k: C.ink,
};

export interface GridPicture {
  name: string;
  rows: string[];
}

export const GRID_PICTURES: GridPicture[] = [
  { name: 'heart', rows: ['.rr..rr.', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '........'] },
  { name: 'butterfly', rows: ['pp....pp', 'ppp..ppp', 'pypkkpyp', 'pppkkppp', '.ppkkpp.', 'ppykkypp', 'pp.kk.pp', '........'] },
  { name: 'house', rows: ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.bbbbbb.', '.bybbyb.', '.bbkkbb.', '.bbkkbb.'] },
  { name: 'rocket', rows: ['...rr...', '..rrrr..', '..byyb..', '..bkkb..', '..bbbb..', '.rbbbbr.', 'rr.bb.rr', '..o..o..'] },
  { name: 'tree', rows: ['...gg...', '..gggg..', '.gggggg.', 'gggggggg', '..gggg..', '.gggggg.', '...oo...', '...oo...'] },
];

/** True if a full 8-column row pattern is a perfect mirror of itself. */
export function rowIsMirrored(row: string): boolean {
  return row === [...row].reverse().join('');
}

/** Mirror a half-row (4 cells) across the line: "rb.." → "..br". */
export function mirrorHalf(half: string): string {
  return [...half].reverse().join('');
}

/** A small grid (cols × rows) drawn at (x, y); `cells[r][c]` is a colour letter or '.'. */
export function MiniGrid({
  x,
  y,
  cells,
  cell = 22,
  line,
}: {
  x: number;
  y: number;
  cells: string[];
  cell?: number;
  /** Draw a dashed mirror line after this many columns. */
  line?: number;
}) {
  const rows = cells.length;
  const cols = cells[0].length;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={cols * cell} height={rows * cell} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {cells.map((row, r) =>
        [...row].map((ch, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cell}
            y={r * cell}
            width={cell}
            height={cell}
            fill={ch === '.' ? 'transparent' : PALETTE[ch]}
            stroke={shade(C.line, -0.1)}
            strokeWidth={1}
          />
        )),
      )}
      <rect width={cols * cell} height={rows * cell} fill="none" stroke={C.ink} strokeWidth={2} />
      {line !== undefined && <line x1={line * cell} y1={-6} x2={line * cell} y2={rows * cell + 6} stroke={C.red} strokeWidth={3} strokeDasharray="6 5" />}
    </g>
  );
}

/* ───────────────────────── Shapes for "is it symmetric?" ───────────────────────── */

export type ShapeId = 'heart' | 'butterfly' | 'star' | 'house' | 'blob' | 'flag' | 'boot' | 'scalene';

export const SYMMETRIC_SHAPES: ShapeId[] = ['heart', 'butterfly', 'star', 'house'];
export const ASYMMETRIC_SHAPES: ShapeId[] = ['blob', 'flag', 'boot', 'scalene'];

export const SHAPE_NAMES: Record<ShapeId, string> = {
  heart: 'heart',
  butterfly: 'butterfly',
  star: 'star',
  house: 'house',
  blob: 'blob',
  flag: 'flag',
  boot: 'boot',
  scalene: 'pointy triangle',
};

/** Shape outline paths in a 100 × 100 box. */
const PATHS: Record<ShapeId, string> = {
  heart: 'M50,88 C20,66 6,50 6,32 C6,16 18,8 30,8 C40,8 47,14 50,22 C53,14 60,8 70,8 C82,8 94,16 94,32 C94,50 80,66 50,88 Z',
  butterfly:
    'M50,30 C40,8 10,4 8,22 C6,38 26,46 42,48 C24,52 12,64 18,80 C26,96 44,82 50,62 C56,82 74,96 82,80 C88,64 76,52 58,48 C74,46 94,38 92,22 C90,4 60,8 50,30 Z',
  star: 'M50,6 L61,38 L94,38 L67,58 L77,92 L50,72 L23,92 L33,58 L6,38 L39,38 Z',
  house: 'M50,8 L92,44 L80,44 L80,92 L20,92 L20,44 L8,44 Z',
  blob: 'M30,14 C52,4 78,12 88,34 C96,54 80,62 70,78 C58,96 30,92 18,74 C8,58 22,48 14,34 C10,24 18,18 30,14 Z',
  flag: 'M14,6 L22,6 L22,40 L86,24 L22,62 L22,94 L14,94 Z',
  boot: 'M28,8 L54,8 L54,62 L90,70 L90,92 L20,92 L20,64 L28,52 Z',
  scalene: 'M10,90 L94,90 L30,12 Z',
};

export function ShapeOutline({ id, x = 0, y = 0, size = 100, line }: { id: ShapeId; x?: number; y?: number; size?: number; line?: 'vertical' | 'horizontal' }) {
  const k = size / 100;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d={PATHS[id]} fill={shade(C.purple, 0.6)} stroke={C.ink} strokeWidth={3 / k} strokeLinejoin="round" />
      {line === 'vertical' && <line x1={50} y1={0} x2={50} y2={100} stroke={C.red} strokeWidth={3 / k} strokeDasharray={`${8 / k} ${6 / k}`} />}
      {line === 'horizontal' && <line x1={0} y1={50} x2={100} y2={50} stroke={C.red} strokeWidth={3 / k} strokeDasharray={`${8 / k} ${6 / k}`} />}
    </g>
  );
}

export function ShapeCard({ id }: { id: ShapeId }) {
  return (
    <svg viewBox="-6 -6 112 112" role="img" aria-label={SHAPE_NAMES[id]}>
      <ShapeOutline id={id} />
    </svg>
  );
}

/* ───────────────────────── "Is the dashed line a mirror line?" ───────────────────────── */

export type LineCase = { shape: 'rectangle' | 'square' | 'heart' | 'triangle' | 'circle'; line: 'vertical' | 'horizontal' | 'diagonal'; mirror: boolean };

export const LINE_CASES: LineCase[] = [
  { shape: 'rectangle', line: 'vertical', mirror: true },
  { shape: 'rectangle', line: 'horizontal', mirror: true },
  { shape: 'rectangle', line: 'diagonal', mirror: false },
  { shape: 'square', line: 'diagonal', mirror: true },
  { shape: 'square', line: 'vertical', mirror: true },
  { shape: 'heart', line: 'vertical', mirror: true },
  { shape: 'heart', line: 'horizontal', mirror: false },
  { shape: 'triangle', line: 'vertical', mirror: true },
  { shape: 'triangle', line: 'horizontal', mirror: false },
  { shape: 'circle', line: 'diagonal', mirror: true },
];

export function LineCasePicture({ c }: { c: LineCase }) {
  // Everything centred on (100, 80).
  const dash = { stroke: C.red, strokeWidth: 4, strokeDasharray: '10 7' };
  let shape;
  let lineEnds: [number, number, number, number];
  switch (c.shape) {
    case 'rectangle':
      shape = <rect x={30} y={40} width={140} height={80} fill={shade(C.blue, 0.6)} stroke={C.ink} strokeWidth={3} />;
      lineEnds = c.line === 'vertical' ? [100, 26, 100, 134] : c.line === 'horizontal' ? [16, 80, 184, 80] : [24, 34, 176, 126];
      break;
    case 'square':
      shape = <rect x={45} y={25} width={110} height={110} fill={shade(C.green, 0.6)} stroke={C.ink} strokeWidth={3} />;
      lineEnds = c.line === 'vertical' ? [100, 12, 100, 148] : c.line === 'horizontal' ? [32, 80, 168, 80] : [36, 16, 164, 144];
      break;
    case 'heart':
      shape = <path d="M100,140 C60,112 40,92 40,66 C40,44 56,32 72,32 C86,32 96,40 100,52 C104,40 114,32 128,32 C144,32 160,44 160,66 C160,92 140,112 100,140 Z" fill={shade(C.red, 0.55)} stroke={C.ink} strokeWidth={3} />;
      lineEnds = c.line === 'vertical' ? [100, 18, 100, 150] : [26, 86, 174, 86];
      break;
    case 'triangle':
      shape = <path d="M100,22 L160,138 L40,138 Z" fill={shade(C.yellow, 0.4)} stroke={C.ink} strokeWidth={3} />;
      lineEnds = c.line === 'vertical' ? [100, 10, 100, 150] : [24, 96, 176, 96];
      break;
    default:
      shape = <circle cx={100} cy={80} r={58} fill={shade(C.orange, 0.5)} stroke={C.ink} strokeWidth={3} />;
      lineEnds = [46, 26, 154, 134];
  }
  return (
    <svg viewBox="0 0 200 160" role="img" aria-label={`A ${c.shape} with a dashed line`}>
      {shape}
      <line x1={lineEnds[0]} y1={lineEnds[1]} x2={lineEnds[2]} y2={lineEnds[3]} {...dash} />
    </svg>
  );
}
