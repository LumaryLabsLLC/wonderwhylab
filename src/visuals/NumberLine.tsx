import { C, shade } from '../lib/color';
import { fmt } from '../lib/answers';

export interface Hop {
  from: number;
  to: number;
  color?: string;
  /** Text above the arc, e.g. "+3". Defaults to the signed difference. */
  label?: string;
}

export interface Mark {
  value: number;
  color?: string;
  /** Draw a pin with this text above the line. */
  label?: string;
}

interface NumberLineProps {
  x?: number;
  y?: number;
  width: number;
  min: number;
  max: number;
  step?: number;
  /** Label every n-th tick (default: every tick). */
  labelEvery?: number;
  marks?: Mark[];
  hops?: Hop[];
  fontSize?: number;
  /** Tap a tick to pick a value. */
  onPick?: (value: number) => void;
}

/** Map a value to an x position on a number line drawn by <NumberLine>. */
export function lineX(value: number, { x = 0, width, min, max }: { x?: number; width: number; min: number; max: number }) {
  return x + ((value - min) / (max - min)) * width;
}

/** A horizontal number line with ticks, labels, optional hop arcs and marks. Drawn as a <g>. */
export function NumberLine({ x = 0, y = 0, width, min, max, step = 1, labelEvery = 1, marks = [], hops = [], fontSize = 18, onPick }: NumberLineProps) {
  const X = (v: number) => lineX(v, { x, width, min, max });
  const ticks: number[] = [];
  for (let v = min, i = 0; v <= max + 1e-9; v = min + ++i * step) ticks.push(Math.round(v * 1e6) / 1e6);
  const gap = width / Math.max(1, ticks.length - 1);

  return (
    <g>
      <line x1={x - 24} y1={y} x2={x + width + 24} y2={y} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${x - 30},${y} l12,-8 v16 z`} fill={C.ink} />
      <path d={`M${x + width + 30},${y} l-12,-8 v16 z`} fill={C.ink} />
      {ticks.map((v, i) => {
        const major = i % labelEvery === 0;
        return (
          <g
            key={v}
            onClick={onPick ? () => onPick(v) : undefined}
            style={onPick ? { cursor: 'pointer' } : undefined}
            data-nopan={onPick ? true : undefined}
          >
            {onPick && <rect x={X(v) - gap / 2} y={y - 30} width={gap} height={70} fill="transparent" />}
            <line x1={X(v)} y1={y - (major ? 11 : 7)} x2={X(v)} y2={y + (major ? 11 : 7)} stroke={C.ink} strokeWidth={major ? 2.5 : 1.5} />
            {major && (
              <text x={X(v)} y={y + 22 + fontSize * 0.6} textAnchor="middle" fontSize={fontSize} fontWeight={v === 0 ? 700 : 500} fill={C.ink} className="num">
                {fmt(v)}
              </text>
            )}
          </g>
        );
      })}
      {hops.map((h, i) => {
        const x1 = X(h.from);
        const x2 = X(h.to);
        const color = h.color ?? C.teal;
        const lift = Math.min(90, 26 + Math.abs(x2 - x1) * 0.35);
        const mid = (x1 + x2) / 2;
        const dir = Math.sign(x2 - x1) || 1;
        const label = h.label ?? `${h.to - h.from >= 0 ? '+' : '−'}${fmt(Math.abs(h.to - h.from))}`;
        return (
          <g key={i} className="fade-up" style={{ animationDelay: `${i * 0.12}s` }}>
            <path d={`M${x1},${y - 6} Q${mid},${y - lift * 2} ${x2},${y - 6}`} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
            <path d={`M${x2},${y - 6} l${-dir * 12},-8 l${dir * 2},12 z`} fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
            {Math.abs(x2 - x1) > 26 && (
              <text x={mid} y={y - lift - 10} textAnchor="middle" fontSize={fontSize * 0.9} fontWeight={700} fill={shade(color, -0.3)} className="num">
                {label}
              </text>
            )}
          </g>
        );
      })}
      {marks.map((m, i) => (
        <g key={i}>
          {m.label && (
            <g>
              <line x1={X(m.value)} y1={y - 8} x2={X(m.value)} y2={y - 44} stroke={m.color ?? C.red} strokeWidth={2.5} />
              <rect x={X(m.value) - 24} y={y - 76} width={48} height={32} rx={8} fill={m.color ?? C.red} stroke={C.ink} strokeWidth={2} />
              <text x={X(m.value)} y={y - 60} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill={C.white} className="num">
                {m.label}
              </text>
            </g>
          )}
          <circle cx={X(m.value)} cy={y} r={9} fill={m.color ?? C.red} stroke={C.ink} strokeWidth={2} />
        </g>
      ))}
    </g>
  );
}

/** Number line sized for a question card. */
export function NumberLinePicture(props: Omit<NumberLineProps, 'x' | 'y' | 'width'> & { width?: number }) {
  const width = props.width ?? 520;
  const hasHops = (props.hops?.length ?? 0) > 0;
  const top = hasHops ? 110 : props.marks?.some((m) => m.label) ? 90 : 30;
  return (
    <svg viewBox={`-40 ${-top} ${width + 80} ${top + 60}`} role="img" aria-label={`Number line from ${props.min} to ${props.max}`}>
      <NumberLine {...props} width={width} x={0} y={0} />
    </svg>
  );
}
