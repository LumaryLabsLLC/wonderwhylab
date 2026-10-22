import type { View } from './rounds';

const INK = '#1e2b4a';
const SKIN = '#f6c9a2';
const SKIN_DARK = '#e9b083';

/** A friendly child, drawn in a 400 × 640 box. `inside` shows a see-through body for organs. */
export function BodyFigure({ view }: { view: View }) {
  const inside = view === 'inside';
  const skin = inside ? '#fdeee3' : SKIN;
  const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const dash = inside ? { strokeDasharray: '8 7' } : {};

  return (
    <svg viewBox="0 0 400 640" className="body-builder-svg" aria-hidden>
      <ellipse cx={200} cy={628} rx={120} ry={10} fill={INK} opacity={0.1} />

      {/* Legs and feet */}
      <path d="M150 470 L146 600 M250 470 L254 600" stroke={INK} strokeWidth={50} strokeLinecap="round" />
      <path d="M150 470 L146 600 M250 470 L254 600" stroke={skin} strokeWidth={44} strokeLinecap="round" />
      {!inside && (
        <g>
          <ellipse cx={146} cy={612} rx={34} ry={16} fill="#e5484d" {...line} />
          <ellipse cx={254} cy={612} rx={34} ry={16} fill="#e5484d" {...line} />
        </g>
      )}

      {/* Arms and hands */}
      <path d="M140 312 L74 440 M260 312 L326 440" stroke={INK} strokeWidth={34} strokeLinecap="round" />
      <path d="M140 312 L74 440 M260 312 L326 440" stroke={skin} strokeWidth={28} strokeLinecap="round" />
      <circle cx={66} cy={458} r={22} fill={skin} {...line} {...dash} />
      <circle cx={334} cy={458} r={22} fill={skin} {...line} {...dash} />

      {/* Body */}
      {inside ? (
        <path d="M128 300 Q200 280 272 300 L282 480 Q200 500 118 480 Z" fill={skin} {...line} {...dash} />
      ) : (
        <g>
          <path d="M128 300 Q200 280 272 300 L280 450 L120 450 Z" fill="#5b9cf5" {...line} />
          <path d="M120 446 L280 446 L276 500 L210 500 L200 478 L190 500 L124 500 Z" fill="#3b4766" {...line} />
          <path d="M180 296 Q200 314 220 296" fill="none" {...line} />
        </g>
      )}

      {/* Neck, ears and head */}
      <rect x={182} y={256} width={36} height={44} fill={skin} {...line} {...dash} />
      <circle cx={80} cy={168} r={24} fill={inside ? skin : SKIN_DARK} {...line} {...dash} />
      <circle cx={320} cy={168} r={24} fill={inside ? skin : SKIN_DARK} {...line} {...dash} />
      <circle cx={200} cy={160} r={118} fill={skin} {...line} {...dash} />

      {!inside && (
        <g>
          {/* Hair */}
          <path d="M86 140 C84 70 140 36 200 36 C262 36 318 72 314 140 C292 104 250 96 214 108 C180 84 128 96 86 140 Z" fill="#7a4a2a" {...line} />
          {/* Eyes */}
          <circle cx={160} cy={140} r={13} fill={INK} />
          <circle cx={240} cy={140} r={13} fill={INK} />
          <circle cx={164} cy={135} r={4} fill="white" />
          <circle cx={244} cy={135} r={4} fill="white" />
          {/* Cheeks */}
          <circle cx={130} cy={196} r={14} fill="#f59e9e" opacity={0.6} />
          <circle cx={270} cy={196} r={14} fill="#f59e9e" opacity={0.6} />
          {/* Nose */}
          <path d="M200 176 Q212 196 198 202" fill="none" {...line} />
          {/* Mouth (open with a tongue for the senses round) */}
          {view === 'senses' ? (
            <g>
              <path d="M170 226 Q200 268 230 226 Z" fill="#7c2d3a" {...line} />
              <path d="M184 246 Q200 236 216 246 Q208 258 200 258 Q192 258 184 246 Z" fill="#f47c8a" />
            </g>
          ) : (
            <path d="M172 230 Q200 256 228 230" fill="none" {...line} strokeWidth={4} />
          )}
        </g>
      )}
    </svg>
  );
}
