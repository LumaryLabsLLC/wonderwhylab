import { C, shade } from '../../../lib/color';
import { iso, IsoBox } from '../../../visuals/Iso';

/** A standing base-ten rod (10 stacked cubes) at iso position (x, y). */
export function IsoRod({ x, y, unit, color = C.green }: { x: number; y: number; unit: number; color?: string }) {
  const P = (px: number, py: number, pz: number) => iso(px, py, pz, unit);
  return (
    <g>
      <IsoBox x={x} y={y} w={1} d={1} h={10} unit={unit} color={color} />
      {Array.from({ length: 9 }, (_, i) => {
        const z = i + 1;
        const a = P(x, y + 1, z);
        const b = P(x + 1, y + 1, z);
        const c = P(x + 1, y, z);
        return (
          <path
            key={z}
            d={`M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}`}
            fill="none"
            stroke={shade(color, -0.5)}
            strokeWidth={1.2}
            opacity={0.7}
          />
        );
      })}
    </g>
  );
}

/** Flat 2D base-ten picture for question cards: rods (tens) and little squares (ones). */
export function BaseTenPicture({ tens, ones }: { tens: number; ones: number }) {
  const cube = 20;
  const rodGap = 10;
  const rodsW = tens * (cube + rodGap);
  const onesCols = Math.ceil(ones / 5);
  const w = rodsW + (ones ? 16 + onesCols * (cube + 6) : 0);
  const h = cube * 10;
  return (
    <svg viewBox={`-6 -6 ${Math.max(w, 40) + 12} ${h + 12}`} role="img" aria-label={`${tens} tens and ${ones} ones`}>
      {Array.from({ length: tens }, (_, t) => (
        <g key={`t${t}`} transform={`translate(${t * (cube + rodGap)} 0)`}>
          <rect x={3} y={4} width={cube} height={h} rx={3} fill={C.ink} opacity={0.12} />
          <rect width={cube} height={h} rx={3} fill={C.green} stroke={C.ink} strokeWidth={2} />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={0} x2={cube} y1={(i + 1) * cube} y2={(i + 1) * cube} stroke={shade(C.green, -0.45)} strokeWidth={1.2} />
          ))}
        </g>
      ))}
      {Array.from({ length: ones }, (_, i) => {
        const col = Math.floor(i / 5);
        const row = i % 5;
        return (
          <rect
            key={`o${i}`}
            x={rodsW + 16 + col * (cube + 6)}
            y={h - (row + 1) * (cube + 6) + 6}
            width={cube}
            height={cube}
            rx={3}
            fill={C.yellow}
            stroke={C.ink}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
