import { C, shade } from '../lib/color';

/**
 * A ten-frame: 2 rows of 5 boxes. The first `a` boxes get counters in `colorA`,
 * the next `b` boxes in `colorB`. Drawn as a <g> at (x, y).
 */
export function TenFrame({
  x = 0,
  y = 0,
  cell = 64,
  a = 0,
  b = 0,
  colorA = C.red,
  colorB = C.blue,
  onCellClick,
}: {
  x?: number;
  y?: number;
  cell?: number;
  a?: number;
  b?: number;
  colorA?: string;
  colorB?: string;
  onCellClick?: (index: number) => void;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={4} y={6} width={cell * 5} height={cell * 2} rx={8} fill={C.ink} opacity={0.12} />
      <rect width={cell * 5} height={cell * 2} rx={8} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({ length: 10 }, (_, i) => {
        const cx = (i % 5) * cell;
        const cy = Math.floor(i / 5) * cell;
        const color = i < a ? colorA : i < a + b ? colorB : null;
        return (
          <g
            key={i}
            onClick={onCellClick ? () => onCellClick(i) : undefined}
            style={onCellClick ? { cursor: 'pointer' } : undefined}
          >
            <rect x={cx} y={cy} width={cell} height={cell} fill="transparent" stroke={C.ink} strokeWidth={1.5} />
            {color && (
              <g>
                <circle cx={cx + cell / 2} cy={cy + cell / 2 + 3} r={cell * 0.34} fill={shade(color, -0.35)} />
                <circle cx={cx + cell / 2} cy={cy + cell / 2} r={cell * 0.34} fill={color} stroke={C.ink} strokeWidth={2} />
                <circle cx={cx + cell / 2 - cell * 0.12} cy={cy + cell / 2 - cell * 0.12} r={cell * 0.07} fill={C.white} opacity={0.7} />
              </g>
            )}
          </g>
        );
      })}
      <rect width={cell * 5} height={cell * 2} rx={8} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

/** One or more ten-frames as a standalone picture for question cards. */
export function TenFramePicture({ total, colorA = C.red }: { total: number; colorA?: string }) {
  const frames = Math.max(1, Math.ceil(total / 10));
  const cell = 40;
  const gap = 24;
  const w = frames * cell * 5 + (frames - 1) * gap;
  return (
    <svg viewBox={`-4 -4 ${w + 12} ${cell * 2 + 14}`} role="img" aria-label={`${total} counters in ten-frames`}>
      {Array.from({ length: frames }, (_, f) => (
        <TenFrame key={f} x={f * (cell * 5 + gap)} cell={cell} a={Math.min(10, Math.max(0, total - f * 10))} colorA={colorA} />
      ))}
    </svg>
  );
}
