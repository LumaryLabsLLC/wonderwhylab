import { C, shade } from '../../../lib/color';
import { TenFrame } from '../../../visuals/TenFrame';

const MARBLE_COLOURS = [C.red, C.blue, C.yellow, C.green, C.purple, C.orange, C.pink];

/** A cheap, repeatable "random" number in [0, 1) for marble jitter. */
function jitter(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

export function marbleColour(i: number): string {
  return MARBLE_COLOURS[Math.floor(jitter(i, 3) * MARBLE_COLOURS.length)];
}

/**
 * Where marble i sits in a jar whose inside spans [left, right] and whose floor is `floor`.
 * Marbles settle in rows from the bottom, nudged a little so it looks like a real heap.
 */
export function marbleSpot(i: number, left: number, right: number, floor: number, r: number): { x: number; y: number } {
  const perRow = Math.max(1, Math.floor((right - left) / (r * 2.2)));
  const row = Math.floor(i / perRow);
  const col = i % perRow;
  const shift = row % 2 ? r * 0.9 : 0;
  const x = left + r * 1.2 + col * r * 2.2 + shift + (jitter(i, 1) - 0.5) * r * 0.5;
  const y = floor - r * 1.1 - row * r * 1.9 + (jitter(i, 2) - 0.5) * r * 0.4;
  return { x: Math.min(right - r, x), y };
}

/** An empty glass jar outline, inside from (left, top) to (right, floor). */
export function JarShape({ left, right, top, floor }: { left: number; right: number; top: number; floor: number }) {
  const neck = 26;
  return (
    <g>
      <rect x={left + 20} y={top - neck - 16} width={right - left - 40} height={18} rx={6} fill={shade(C.wood, -0.05)} stroke={C.ink} strokeWidth={2.5} />
      <path
        d={`M${left + 26},${top - neck} L${left + 26},${top - 6} Q${left},${top} ${left},${top + 30} L${left},${floor - 16} Q${left},${floor} ${left + 16},${floor} L${right - 16},${floor} Q${right},${floor} ${right},${floor - 16} L${right},${top + 30} Q${right},${top} ${right - 26},${top - 6} L${right - 26},${top - neck}`}
        fill={shade(C.blue, 0.9)}
        fillOpacity={0.7}
        stroke={C.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d={`M${left + 14},${top + 40} L${left + 14},${floor - 30}`} stroke={C.white} strokeWidth={6} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

/** A jar of `n` marbles as a standalone picture. */
export function JarPicture({ n, label = 'marbles' }: { n: number; label?: string }) {
  const r = 13;
  const left = 20;
  const right = 190;
  const floor = 300;
  return (
    <svg viewBox="0 0 210 320" role="img" aria-label={`A jar of ${label}`}>
      <JarShape left={left} right={right} top={60} floor={floor} />
      {Array.from({ length: n }, (_, i) => {
        const p = marbleSpot(i, left + 4, right - 4, floor - 2, r);
        return <circle key={i} cx={p.x} cy={p.y} r={r} fill={marbleColour(i)} stroke={C.ink} strokeWidth={1.8} />;
      })}
    </svg>
  );
}

/** "This jar has 5" next to a big jar: estimating with a benchmark. */
export function BenchmarkPicture({ small, big }: { small: number; big: number }) {
  const r = 13;
  return (
    <svg viewBox="0 0 440 340" role="img" aria-label={`A small jar with ${small} marbles and a big jar`}>
      <g>
        <JarShape left={20} right={150} top={200} floor={300} />
        {Array.from({ length: small }, (_, i) => {
          const p = marbleSpot(i, 24, 146, 298, r);
          return <circle key={i} cx={p.x} cy={p.y} r={r} fill={marbleColour(i)} stroke={C.ink} strokeWidth={1.8} />;
        })}
        <text x={85} y={330} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
          {small} marbles
        </text>
      </g>
      <g>
        <JarShape left={200} right={420} top={50} floor={300} />
        {Array.from({ length: big }, (_, i) => {
          const p = marbleSpot(i, 204, 416, 298, r);
          return <circle key={i} cx={p.x} cy={p.y} r={r} fill={marbleColour(i)} stroke={C.ink} strokeWidth={1.8} />;
        })}
        <text x={310} y={330} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
          about how many?
        </text>
      </g>
    </svg>
  );
}

/** A full ten-frame (10) next to a jar: is the jar more or less than 10? */
export function TenVsJarPicture({ n }: { n: number }) {
  const r = 13;
  return (
    <svg viewBox="0 0 470 300" role="img" aria-label="A full ten-frame and a jar of marbles">
      <TenFrame x={10} y={110} cell={42} a={10} colorA={C.blue} />
      <text x={115} y={236} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
        10
      </text>
      <JarShape left={260} right={460} top={50} floor={280} />
      {Array.from({ length: n }, (_, i) => {
        const p = marbleSpot(i, 264, 456, 278, r);
        return <circle key={i} cx={p.x} cy={p.y} r={r} fill={marbleColour(i)} stroke={C.ink} strokeWidth={1.8} />;
      })}
    </svg>
  );
}
