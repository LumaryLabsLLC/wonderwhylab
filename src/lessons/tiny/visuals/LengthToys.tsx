import { C, shade } from '../../../lib/color';

export type ToyKind = 'pencil' | 'crayon' | 'snake' | 'worm' | 'ribbon' | 'caterpillar';

/** Each toy's length, measured in cubes. All different, so comparisons always have an answer. */
export const TOY_LENGTH: Record<ToyKind, number> = {
  worm: 3,
  crayon: 4,
  caterpillar: 5,
  ribbon: 6,
  pencil: 7,
  snake: 9,
};

export const TOYS = Object.keys(TOY_LENGTH) as ToyKind[];

const S = { stroke: C.ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const };

/** Draw a toy lying flat: its left end at x, centred on y, `len` pixels long. */
export function Toy({ kind, x, y, len }: { kind: ToyKind; x: number; y: number; len: number }) {
  switch (kind) {
    case 'pencil': {
      const tip = 30;
      return (
        <g>
          <rect x={x} y={y - 15} width={16} height={30} rx={5} fill={C.pink} {...S} />
          <rect x={x + 14} y={y - 15} width={10} height={30} fill="#c7cdd6" {...S} />
          <rect x={x + 24} y={y - 15} width={len - 24 - tip} height={30} fill={C.yellow} {...S} />
          <path d={`M${x + 28},${y - 5} H${x + len - tip - 6}`} stroke={shade(C.yellow, -0.25)} strokeWidth={2} />
          <path d={`M${x + len - tip},${y - 15} L${x + len},${y} L${x + len - tip},${y + 15} Z`} fill={C.wood} {...S} />
          <path d={`M${x + len - 10},${y - 5} L${x + len},${y} L${x + len - 10},${y + 5} Z`} fill={C.ink} />
        </g>
      );
    }
    case 'crayon': {
      const tip = 24;
      return (
        <g>
          <rect x={x} y={y - 14} width={len - tip} height={28} rx={6} fill={C.blue} {...S} />
          <rect x={x + 14} y={y - 14} width={len - tip - 34} height={28} fill={shade(C.blue, 0.55)} {...S} />
          <path d={`M${x + len - tip},${y - 12} L${x + len},${y - 3} L${x + len},${y + 3} L${x + len - tip},${y + 12} Z`} fill={C.blue} {...S} />
        </g>
      );
    }
    case 'snake':
    case 'worm': {
      const color = kind === 'snake' ? C.green : C.pink;
      const thick = kind === 'snake' ? 18 : 14;
      const head = kind === 'snake' ? 14 : 10;
      const body = len - head;
      const waves = Math.max(2, Math.round(body / 45));
      const step = body / waves;
      let d = `M${x + head / 2},${y}`;
      for (let i = 0; i < waves; i++) {
        const sx = x + head / 2 + i * step;
        d += ` Q${sx + step / 4},${y - 12} ${sx + step / 2},${y} T${sx + step},${y}`;
      }
      return (
        <g>
          <path d={d} fill="none" stroke={C.ink} strokeWidth={thick + 5} strokeLinecap="round" />
          <path d={d} fill="none" stroke={color} strokeWidth={thick} strokeLinecap="round" />
          <circle cx={x + len - head} cy={y} r={head} fill={color} {...S} />
          <circle cx={x + len - head + 4} cy={y - 4} r={2.6} fill={C.ink} />
        </g>
      );
    }
    case 'ribbon':
      return (
        <g>
          <path d={`M${x},${y - 14} H${x + len} L${x + len - 10},${y} L${x + len},${y + 14} H${x} L${x + 10},${y} Z`} fill={C.red} {...S} />
          <path d={`M${x + 14},${y - 5} H${x + len - 14}`} stroke={shade(C.red, 0.4)} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case 'caterpillar': {
      const n = 5;
      const r = len / n / 2;
      return (
        <g>
          {Array.from({ length: n }, (_, i) => (
            <circle key={i} cx={x + r + i * 2 * r} cy={y} r={r - 1} fill={i === n - 1 ? C.orange : C.green} {...S} />
          ))}
          <circle cx={x + len - r + 5} cy={y - 5} r={3} fill={C.ink} />
        </g>
      );
    }
  }
}

/** A row of linking cubes, numbered, starting at x. */
export function CubeRow({ x, y, count, unit, numbered = true }: { x: number; y: number; count: number; unit: number; numbered?: boolean }) {
  const h = Math.min(32, unit * 0.7);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <rect x={x + i * unit} y={y} width={unit} height={h} rx={3} fill={i % 2 ? shade(C.orange, 0.35) : shade(C.orange, 0.05)} stroke={C.ink} strokeWidth={1.8} />
          {numbered && (
            <text x={x + i * unit + unit / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(16, unit * 0.36)} fontWeight={700} fill={C.ink} className="num">
              {i + 1}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

export interface PicToy {
  kind: ToyKind;
  /** Shift from the start line, in cubes (0 = lined up). */
  shift?: number;
  /** Draw a cube train under it, starting where the toy starts. */
  cubes?: boolean;
}

/** Toys stacked in lanes, for practice questions. */
export function LengthPicture({ toys, startLine = true }: { toys: PicToy[]; startLine?: boolean }) {
  const unit = 40;
  const lane = 92;
  const maxEnd = Math.max(...toys.map((t) => (t.shift ?? 0) + TOY_LENGTH[t.kind]));
  const w = 30 + maxEnd * unit + 20;
  const h = toys.length * lane + 10;
  return (
    <svg viewBox={`-10 -10 ${w + 10} ${h + 10}`} role="img" aria-label={toys.map((t) => t.kind).join(' and ')}>
      {startLine && <line x1={30} y1={-4} x2={30} y2={h - 6} stroke={C.ink} strokeWidth={3} strokeDasharray="6 5" />}
      {toys.map((t, i) => {
        const left = 30 + (t.shift ?? 0) * unit;
        const cy = i * lane + 28;
        return (
          <g key={i}>
            <Toy kind={t.kind} x={left} y={cy} len={TOY_LENGTH[t.kind] * unit} />
            {t.cubes && <CubeRow x={left} y={cy + 24} count={TOY_LENGTH[t.kind]} unit={unit} />}
          </g>
        );
      })}
    </svg>
  );
}
