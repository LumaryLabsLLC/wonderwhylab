import { C, shade } from '../../../lib/color';

const S = { stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** A friendly frog sitting with its feet at (0, 0). Wrap in a translated <g> to place it. */
export function Frog({ size = 80, color = C.green }: { size?: number; color?: string }) {
  const k = size / 100;
  return (
    <g transform={`scale(${k})`}>
      <ellipse cx={0} cy={2} rx={44} ry={7} fill={C.ink} opacity={0.15} />
      {/* back legs */}
      <ellipse cx={-34} cy={-14} rx={18} ry={14} fill={shade(color, -0.15)} {...S} />
      <ellipse cx={34} cy={-14} rx={18} ry={14} fill={shade(color, -0.15)} {...S} />
      {/* body */}
      <path d="M-38,-14 C-42,-56 42,-56 38,-14 C34,0 -34,0 -38,-14 Z" fill={color} {...S} />
      <path d="M-20,-10 C-18,-28 18,-28 20,-10 Z" fill={shade(color, 0.45)} stroke="none" />
      {/* eyes */}
      <circle cx={-17} cy={-50} r={13} fill={color} {...S} />
      <circle cx={17} cy={-50} r={13} fill={color} {...S} />
      <circle cx={-17} cy={-51} r={7} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <circle cx={17} cy={-51} r={7} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <circle cx={-16} cy={-51} r={3.2} fill={C.ink} />
      <circle cx={18} cy={-51} r={3.2} fill={C.ink} />
      {/* smile + cheeks */}
      <path d="M-14,-32 C-6,-24 6,-24 14,-32" fill="none" {...S} strokeWidth={2.5} />
      <circle cx={-24} cy={-30} r={4} fill={C.pink} opacity={0.6} />
      <circle cx={24} cy={-30} r={4} fill={C.pink} opacity={0.6} />
      {/* front feet */}
      <ellipse cx={-14} cy={-3} rx={9} ry={5} fill={shade(color, -0.1)} {...S} strokeWidth={2.5} />
      <ellipse cx={14} cy={-3} rx={9} ry={5} fill={shade(color, -0.1)} {...S} strokeWidth={2.5} />
    </g>
  );
}
