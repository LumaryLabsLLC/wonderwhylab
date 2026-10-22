import { C } from '../../../lib/color';

/**
 * A 10 × 10 hundred-square, filled column by column: one column is a tenth, one square a hundredth.
 * Drawn as a <g> at (x, y).
 */
export function Grid100({
  x = 0,
  y = 0,
  cell = 40,
  shaded,
  color = C.blue,
}: {
  x?: number;
  y?: number;
  cell?: number;
  /** How many of the 100 squares are shaded (0–100). */
  shaded: number;
  color?: string;
}) {
  const size = cell * 10;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={5} y={7} width={size} height={size} rx={4} fill={C.ink} opacity={0.12} />
      <rect width={size} height={size} fill={C.card} />
      {Array.from({ length: 100 }, (_, i) => {
        const col = Math.floor(i / 10);
        const row = i % 10;
        const on = i < shaded;
        return (
          <rect
            key={i}
            x={col * cell}
            y={row * cell}
            width={cell}
            height={cell}
            fill={on ? color : 'transparent'}
            stroke={on ? C.ink : C.line}
            strokeOpacity={on ? 0.35 : 1}
            strokeWidth={1}
          />
        );
      })}
      {/* Column dividers make the tenths easy to see. */}
      {Array.from({ length: 9 }, (_, c) => (
        <line key={c} x1={(c + 1) * cell} y1={0} x2={(c + 1) * cell} y2={size} stroke={C.ink} strokeWidth={1.6} opacity={0.55} />
      ))}
      <rect width={size} height={size} fill="none" stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
}

export function Grid100Picture({ shaded, color = C.blue }: { shaded: number; color?: string }) {
  return (
    <svg viewBox="-6 -6 214 214" role="img" aria-label={`${shaded} out of 100 squares shaded`}>
      <Grid100 cell={20} shaded={shaded} color={color} />
    </svg>
  );
}
