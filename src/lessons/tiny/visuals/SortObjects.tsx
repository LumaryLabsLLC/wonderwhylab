import { C } from '../../../lib/color';

export type Shape = 'circle' | 'square' | 'triangle';
export type Colour = 'red' | 'blue' | 'yellow';
export type Size = 'big' | 'small';
export type Rule = 'colour' | 'shape' | 'size';

export interface SortObj {
  id: number;
  shape: Shape;
  colour: Colour;
  size: Size;
}

export const SHAPES: Shape[] = ['circle', 'square', 'triangle'];
export const COLOURS: Colour[] = ['red', 'blue', 'yellow'];
export const SIZES: Size[] = ['big', 'small'];

export const FILL: Record<Colour, string> = { red: C.red, blue: C.blue, yellow: C.yellow };

export function valueOf(o: SortObj, rule: Rule): string {
  return rule === 'colour' ? o.colour : rule === 'shape' ? o.shape : o.size;
}

export function groupsOf(rule: Rule): string[] {
  return rule === 'colour' ? COLOURS : rule === 'shape' ? SHAPES : SIZES;
}

export const objName = (o: Pick<SortObj, 'shape' | 'colour' | 'size'>, withSize = false) =>
  `${withSize ? `${o.size} ` : ''}${o.colour} ${o.shape}`;

/** One sorting object centred at (x, y). */
export function SortShape({ obj, x, y, scale = 1, ring }: { obj: Pick<SortObj, 'shape' | 'colour' | 'size'>; x: number; y: number; scale?: number; ring?: string }) {
  const r = (obj.size === 'big' ? 30 : 18) * scale;
  const s = { fill: FILL[obj.colour], stroke: ring ?? C.ink, strokeWidth: ring ? 4 : 2.5, strokeLinejoin: 'round' as const };
  if (obj.shape === 'circle') return <circle cx={x} cy={y} r={r} {...s} />;
  if (obj.shape === 'square') return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} rx={3} {...s} />;
  return <polygon points={`${x},${y - r * 1.05} ${x + r * 1.1},${y + r * 0.85} ${x - r * 1.1},${y + r * 0.85}`} {...s} />;
}

/** A row of objects for question pictures. */
export function ObjRow({ objs }: { objs: Pick<SortObj, 'shape' | 'colour' | 'size'>[] }) {
  const step = 80;
  return (
    <svg viewBox={`0 0 ${objs.length * step} 80`} role="img" aria-label={objs.map((o) => objName(o, true)).join(', ')}>
      {objs.map((o, i) => (
        <SortShape key={i} obj={o} x={i * step + step / 2} y={42} />
      ))}
    </svg>
  );
}

/** Objects already sorted into labelled hoops, for "how were these sorted?" questions. */
export function HoopsPicture({ hoops }: { hoops: Pick<SortObj, 'shape' | 'colour' | 'size'>[][] }) {
  const hw = 220;
  return (
    <svg viewBox={`0 0 ${hoops.length * hw} 170`} role="img" aria-label={`${hoops.length} hoops of sorted shapes`}>
      {hoops.map((items, h) => {
        const cx = h * hw + hw / 2;
        return (
          <g key={h}>
            <ellipse cx={cx} cy={88} rx={hw / 2 - 12} ry={76} fill={C.card} stroke={C.ink} strokeWidth={3} />
            {items.map((o, i) => (
              <SortShape key={i} obj={o} x={cx - 56 + (i % 3) * 56} y={i < 3 ? 62 : 116} scale={0.85} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
