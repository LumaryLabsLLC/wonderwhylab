import { C } from '../../../lib/color';
import { Thing, thingName } from '../../../visuals/Thing';
import type { ThingKind } from '../../../visuals/Thing';

/**
 * Objects on a fixed 5-wide grid, so pictures with different counts are drawn at the same scale.
 * Use this when choices are compared side by side (fewer objects must not look bigger).
 */
export function GroupPicture({ kind, count, rows = 2 }: { kind: ThingKind; count: number; rows?: number }) {
  const size = 50;
  const gap = 10;
  const step = size + gap;
  const w = 5 * step - gap;
  const h = rows * step - gap;
  return (
    <svg viewBox={`-6 -6 ${w + 12} ${h + 12}`} role="img" aria-label={`${count} ${thingName(kind, count)}`}>
      {Array.from({ length: 5 * rows }, (_, i) => {
        const x = (i % 5) * step + size / 2;
        const y = Math.floor(i / 5) * step + size / 2;
        return i < count ? (
          <Thing key={i} kind={kind} x={x} y={y} size={size} />
        ) : (
          <circle key={i} cx={x} cy={y} r={4} fill={C.line} />
        );
      })}
    </svg>
  );
}
