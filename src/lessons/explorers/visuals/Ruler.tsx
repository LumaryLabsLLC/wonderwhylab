import { C, shade } from '../../../lib/color';

export type MeasureKind = 'pencil' | 'crayon' | 'caterpillar';

export const MEASURE_NAMES: Record<MeasureKind, string> = {
  pencil: 'pencil',
  crayon: 'crayon',
  caterpillar: 'caterpillar',
};

/** A wooden centimetre ruler. (x, y) is where the 0 mark meets the top edge. */
export function Ruler({ x, y, cm, unit, height = 70, fontSize = 20, mm = true }: { x: number; y: number; cm: number; unit: number; height?: number; fontSize?: number; mm?: boolean }) {
  const pad = unit * 0.5;
  const extra = unit * 0.7; // room for the "cm" label after the last number
  const ticks: string[] = [];
  const steps = mm ? cm * 10 : cm * 2;
  for (let i = 0; i <= steps; i++) {
    const v = mm ? i / 10 : i / 2;
    const len = Number.isInteger(v) ? height * 0.36 : Math.abs(v * 2 - Math.round(v * 2)) < 1e-6 ? height * 0.24 : height * 0.13;
    const tx = x + v * unit;
    ticks.push(`M${tx},${y} V${y + len}`);
  }
  return (
    <g>
      <rect x={x - pad + 5} y={y + 10} width={cm * unit + pad * 2 + extra} height={height} rx={8} fill={C.ink} opacity={0.14} />
      <rect x={x - pad} y={y + 6} width={cm * unit + pad * 2 + extra} height={height} rx={8} fill={shade(C.wood, -0.3)} stroke={C.ink} strokeWidth={2} />
      <rect x={x - pad} y={y} width={cm * unit + pad * 2 + extra} height={height} rx={8} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <path d={ticks.join(' ')} stroke={C.ink} strokeWidth={1.5} />
      {Array.from({ length: cm + 1 }, (_, i) => (
        <text key={i} x={x + i * unit} y={y + height * 0.62} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={600} fill={C.ink} className="num">
          {i}
        </text>
      ))}
      <text x={x + cm * unit + fontSize * 0.9} y={y + height * 0.62} dominantBaseline="central" fontSize={fontSize * 0.7} fontWeight={600} fill={C.muted}>
        cm
      </text>
    </g>
  );
}

/** Something to measure, lying flat from x1 to x2 with its middle at y. `h` is its thickness. */
export function MeasureObject({ kind, x1, x2, y, h = 34, color }: { kind: MeasureKind; x1: number; x2: number; y: number; h?: number; color?: string }) {
  const len = x2 - x1;
  const top = y - h / 2;
  if (kind === 'caterpillar') {
    const body = color ?? C.green;
    const seg = h * 0.95;
    const count = Math.max(2, Math.round((len - h * 0.6) / (seg * 0.62)));
    const step = (len - seg) / Math.max(1, count - 1);
    return (
      <g>
        {Array.from({ length: count }, (_, i) => {
          const cx = x1 + seg / 2 + i * step;
          const head = i === count - 1;
          const wobble = head ? 0 : (i % 2 ? -3 : 3);
          return (
            <g key={i}>
              {!head && <line x1={cx - 4} y1={y + seg / 2 - 2} x2={cx - 6} y2={y + seg / 2 + 6} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />}
              <circle cx={cx} cy={y + wobble} r={seg / 2} fill={head ? shade(body, 0.1) : i % 2 ? body : shade(body, -0.1)} stroke={C.ink} strokeWidth={2} />
              {head && (
                <g>
                  <circle cx={cx + seg * 0.16} cy={y - seg * 0.1} r={seg * 0.1} fill={C.white} stroke={C.ink} strokeWidth={1.5} />
                  <circle cx={cx + seg * 0.18} cy={y - seg * 0.1} r={seg * 0.045} fill={C.ink} />
                  <path d={`M${cx + seg * 0.05},${y + seg * 0.14} q${seg * 0.12},${seg * 0.1} ${seg * 0.26},0`} fill="none" stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" />
                  <path d={`M${cx - seg * 0.05},${y - seg / 2} l-4,-10 M${cx + seg * 0.2},${y - seg / 2 + 2} l4,-10`} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  }
  const tip = Math.min(h * 1.3, len * 0.35);
  const lead = tip * 0.3;
  if (kind === 'crayon') {
    const c = color ?? C.purple;
    return (
      <g strokeLinejoin="round">
        <rect x={x1} y={top} width={len - tip + 2} height={h} rx={6} fill={c} stroke={C.ink} strokeWidth={2} />
        <rect x={x1 + len * 0.18} y={top + 3} width={Math.max(10, len * 0.42)} height={h - 6} rx={3} fill={shade(c, 0.55)} stroke={shade(c, -0.3)} strokeWidth={1.5} />
        <path d={`M${x2 - tip},${top + 3} L${x2 - lead},${y - h * 0.16} L${x2},${y} L${x2 - lead},${y + h * 0.16} L${x2 - tip},${top + h - 3} Z`} fill={shade(c, -0.1)} stroke={C.ink} strokeWidth={2} />
      </g>
    );
  }
  // Pencil: eraser, metal band, painted body, sharpened wood and lead.
  const eraser = Math.min(h * 0.65, len * 0.15);
  const band = Math.min(h * 0.4, len * 0.1);
  const body = color ?? C.yellow;
  return (
    <g strokeLinejoin="round">
      <rect x={x1} y={top + 2} width={eraser + 6} height={h - 4} rx={7} fill={C.pink} stroke={C.ink} strokeWidth={2} />
      <rect x={x1 + eraser} y={top} width={band} height={h} fill="#c9ccd6" stroke={C.ink} strokeWidth={2} />
      <path d={`M${x1 + eraser + band * 0.33},${top} v${h} M${x1 + eraser + band * 0.66},${top} v${h}`} stroke={shade('#c9ccd6', -0.3)} strokeWidth={1.5} />
      <rect x={x1 + eraser + band} y={top} width={Math.max(0, len - eraser - band - tip)} height={h} fill={body} stroke={C.ink} strokeWidth={2} />
      <rect x={x1 + eraser + band} y={top} width={Math.max(0, len - eraser - band - tip)} height={h * 0.3} fill={shade(body, 0.35)} />
      <rect x={x1 + eraser + band} y={top + h * 0.7} width={Math.max(0, len - eraser - band - tip)} height={h * 0.3} fill={shade(body, -0.15)} />
      <rect x={x1 + eraser + band} y={top} width={Math.max(0, len - eraser - band - tip)} height={h} fill="none" stroke={C.ink} strokeWidth={2} />
      <path d={`M${x2 - tip},${top} L${x2},${y} L${x2 - tip},${top + h} Z`} fill={C.wood} stroke={C.ink} strokeWidth={2} />
      <path d={`M${x2 - lead},${y - h * 0.5 * (lead / tip)} L${x2},${y} L${x2 - lead},${y + h * 0.5 * (lead / tip)} Z`} fill={C.ink} />
    </g>
  );
}

/** Ruler with an object above it, for question cards. */
export function RulerPicture({ kind, start, end, cm = 12 }: { kind: MeasureKind; start: number; end: number; cm?: number }) {
  const unit = 30;
  const x = 20;
  return (
    <svg viewBox={`0 0 ${cm * unit + 62} 118`} role="img" aria-label={`A ${MEASURE_NAMES[kind]} next to a ruler`}>
      <MeasureObject kind={kind} x1={x + start * unit} x2={x + end * unit} y={22} h={22} />
      <path d={`M${x + start * unit},34 V54 M${x + end * unit},34 V54`} stroke={C.teal} strokeWidth={2} strokeDasharray="3 3" />
      <Ruler x={x} y={56} cm={cm} unit={unit} height={50} fontSize={15} mm={false} />
    </svg>
  );
}
