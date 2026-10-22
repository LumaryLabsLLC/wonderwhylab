import type { OrganKind } from './rounds';

const INK = '#1e2b4a';
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** Simple friendly organ drawings, centred in a 100 × 100 box. */
export function OrganShape({ kind }: { kind: OrganKind }) {
  switch (kind) {
    case 'brain':
      return (
        <g>
          <path d="M18 56c-8-4-10-18-2-26 2-12 16-18 26-12 8-8 24-6 30 4 12 0 18 12 14 22 6 8 2 22-10 22-6 8-20 8-26 2-10 6-26 2-30-8-6 0-6-4-2-4z" fill="#f6a5c0" {...S} />
          <path d="M34 34c6 4 6 10 0 14M52 26c-4 8 2 14 8 12M64 46c-6 2-8 8-4 14M42 56c4 4 10 4 14 0" fill="none" {...S} strokeWidth={2.5} />
        </g>
      );
    case 'heart':
      return (
        <g>
          <path d="M52 18v10M62 20c4 0 6 4 4 8" fill="none" {...S} stroke="#3b5bdb" strokeWidth={6} />
          <path d="M50 88C24 70 14 56 16 40c2-14 16-20 28-12 4 2 6 6 6 6s2-4 6-6c12-8 26-2 28 12 2 16-8 30-34 48z" fill="#e5484d" {...S} />
          <path d="M34 40c-4 4-4 10 0 14" fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" opacity={0.6} />
        </g>
      );
    case 'lungs':
      return (
        <g>
          <path d="M50 10v30M50 40l-10 10M50 40l10 10" fill="none" {...S} strokeWidth={5} />
          <path d="M40 30c-16 0-30 22-30 44 0 12 8 16 16 14 10-2 14-8 14-18V30z" fill="#f4a6b4" {...S} />
          <path d="M60 30c16 0 30 22 30 44 0 12-8 16-16 14-10-2-14-8-14-18V30z" fill="#f4a6b4" {...S} />
        </g>
      );
    case 'stomach':
      return (
        <g>
          <path d="M30 12h14v16c0 6 4 10 10 10 18 0 32 14 30 32-2 18-18 26-36 22-14-2-20-10-28-6l-4-10c10-4 18 0 28 2 12 2 22-2 22-12s-8-16-18-16c-12 0-20-8-20-20z" fill="#f6b38e" {...S} />
        </g>
      );
    case 'intestines':
      return (
        <g>
          <rect x={12} y={18} width={76} height={68} rx={22} fill="#f2c6a0" {...S} />
          <path d="M24 34h44c8 0 8 12 0 12H32c-8 0-8 12 0 12h36c8 0 8 12 0 12H28" fill="none" stroke="#c9774f" strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    case 'bones':
      return (
        <g transform="rotate(-30 50 50)">
          <path d="M28 44c-8-6-20-2-18 8 2 6 8 6 10 6-2 2-6 8 0 12 8 6 14-2 14-8h32c0 6 6 14 14 8 6-4 2-10 0-12 2 0 8 0 10-6 2-10-10-14-18-8z" fill="#fbf6ea" {...S} />
        </g>
      );
    case 'vessels':
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M50 92V54M50 54L26 22M50 54l24-32M38 38l-16 6M62 38l16 6" stroke="#e5484d" strokeWidth={7} />
          <path d="M60 92V60M60 60l20-26M40 92V64" stroke="#3b5bdb" strokeWidth={5} opacity={0.85} />
        </g>
      );
    case 'windpipe':
      return (
        <g>
          <rect x={38} y={8} width={24} height={64} rx={10} fill="#f9d3dc" {...S} />
          {[18, 28, 38, 48, 58].map((y) => (
            <path key={y} d={`M40 ${y}h20`} {...S} strokeWidth={2.5} />
          ))}
          <path d="M50 72L30 92M50 72l20 20" fill="none" {...S} strokeWidth={5} />
        </g>
      );
    case 'nerves':
      return (
        <g fill="none" stroke="#e0a400" strokeWidth={4} strokeLinecap="round">
          <path d="M50 10v80M50 30L24 18M50 30l26-12M50 52L20 50M50 52l30-2M50 72L28 90M50 72l22 18" />
          <circle cx={50} cy={10} r={7} fill="#ffd23f" stroke={INK} strokeWidth={3} />
        </g>
      );
    case 'skull':
      return (
        <g>
          <path d="M50 10c-22 0-36 16-36 36 0 12 6 20 14 24v14c0 4 4 6 8 6h28c4 0 8-2 8-6V70c8-4 14-12 14-24 0-20-14-36-36-36z" fill="#fbf6ea" {...S} />
          <ellipse cx={36} cy={48} rx={8} ry={9} fill={INK} />
          <ellipse cx={64} cy={48} rx={8} ry={9} fill={INK} />
          <path d="M50 58l-5 10h10z" fill={INK} />
          <path d="M42 82v8M50 82v8M58 82v8" {...S} strokeWidth={2.5} />
        </g>
      );
    case 'ribs':
      return (
        <g fill="none" {...S}>
          <path d="M50 10v80" strokeWidth={5} />
          {[24, 40, 56, 72].map((y, i) => (
            <g key={y}>
              <path d={`M50 ${y}c-14 ${-4 + i} -30 ${2 + i} -32 ${16 - i * 2}`} stroke="#c8bfa8" strokeWidth={8} />
              <path d={`M50 ${y}c14 ${-4 + i} 30 ${2 + i} 32 ${16 - i * 2}`} stroke="#c8bfa8" strokeWidth={8} />
              <path d={`M50 ${y}c-14 ${-4 + i} -30 ${2 + i} -32 ${16 - i * 2}`} strokeWidth={2} />
              <path d={`M50 ${y}c14 ${-4 + i} 30 ${2 + i} 32 ${16 - i * 2}`} strokeWidth={2} />
            </g>
          ))}
        </g>
      );
    case 'foodpipe':
      return (
        <g>
          <path d="M44 6h12v54c0 10 6 14 14 16l-4 12c-14-4-22-12-22-28z" fill="#f6b38e" {...S} />
          <circle cx={50} cy={24} r={5} fill="#c9774f" />
          <circle cx={52} cy={44} r={5} fill="#c9774f" />
        </g>
      );
  }
}

/** Organ drawing as a standalone icon. */
export function OrganIcon({ kind, size = 44 }: { kind: OrganKind; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <OrganShape kind={kind} />
    </svg>
  );
}
