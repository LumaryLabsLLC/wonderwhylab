import { C } from '../../../lib/color';
import { Thing, thingName } from '../../../visuals/Thing';
import type { ThingKind } from '../../../visuals/Thing';

/** `n` objects lined up as partners (two per column) so a left-over one is easy to spot. */
export function PairsPicture({ n, kind }: { n: number; kind: ThingKind }) {
  const size = 46;
  const step = 58;
  const cols = Math.ceil(n / 2);
  const w = cols * step + 10;
  const h = step * 2 + 14;
  return (
    <svg viewBox={`-6 -8 ${w + 6} ${h + 8}`} role="img" aria-label={`${n} ${thingName(kind, n)} in pairs`}>
      {Array.from({ length: Math.floor(n / 2) }, (_, c) => (
        <rect key={c} x={c * step + 2} y={-2} width={step - 4} height={step * 2 + 8} rx={14} fill="none" stroke={C.teal} strokeWidth={2.5} strokeDasharray="5 4" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const col = Math.floor(i / 2);
        const row = i % 2;
        return <Thing key={i} kind={kind} size={size} x={col * step + step / 2} y={row * step + step / 2 + 3} />;
      })}
    </svg>
  );
}
