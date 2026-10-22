import { C, RAINBOW, shade } from '../../../lib/color';

/** A flat rows × columns array of counters for question cards. Each row gets its own colour. */
export function ArrayPicture({ rows, cols }: { rows: number; cols: number }) {
  const cell = 36;
  const w = cols * cell;
  const h = rows * cell;
  return (
    <svg viewBox={`-8 -8 ${w + 16} ${h + 16}`} role="img" aria-label={`${rows} rows of ${cols}`}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const color = RAINBOW[r % RAINBOW.length];
          const cx = c * cell + cell / 2;
          const cy = r * cell + cell / 2;
          return (
            <g key={`${r}-${c}`}>
              <circle cx={cx} cy={cy + 2.5} r={13} fill={shade(color, -0.35)} />
              <circle cx={cx} cy={cy} r={13} fill={color} stroke={C.ink} strokeWidth={2} />
            </g>
          );
        }),
      )}
    </svg>
  );
}
