import { C } from '../../../lib/color';

export type Brows = 'relaxed' | 'raised' | 'worried' | 'cross';
export type Eyes = 'open' | 'wide' | 'closed' | 'narrow';
export type Mouth = 'smile' | 'frown' | 'open' | 'wobbly' | 'gentle' | 'flat';
export type Feeling = 'happy' | 'sad' | 'angry' | 'scared' | 'surprised' | 'calm';

export const BROWS: Brows[] = ['relaxed', 'raised', 'worried', 'cross'];
export const EYES: Eyes[] = ['open', 'wide', 'closed', 'narrow'];
export const MOUTHS: Mouth[] = ['smile', 'frown', 'open', 'wobbly', 'gentle', 'flat'];
export const FEELINGS: Feeling[] = ['happy', 'sad', 'angry', 'scared', 'surprised', 'calm'];

export interface FaceParts {
  brows: Brows;
  eyes: Eyes;
  mouth: Mouth;
}

/** How each feeling usually shows on a face. */
export const FEELING_FACE: Record<Feeling, FaceParts> = {
  happy: { brows: 'relaxed', eyes: 'open', mouth: 'smile' },
  sad: { brows: 'worried', eyes: 'open', mouth: 'frown' },
  angry: { brows: 'cross', eyes: 'narrow', mouth: 'flat' },
  scared: { brows: 'worried', eyes: 'wide', mouth: 'wobbly' },
  surprised: { brows: 'raised', eyes: 'wide', mouth: 'open' },
  calm: { brows: 'relaxed', eyes: 'closed', mouth: 'gentle' },
};

export const FEELING_EMOJI: Record<Feeling, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  scared: '😨',
  surprised: '😮',
  calm: '😌',
};

export const BROW_WORDS: Record<Brows, string> = {
  relaxed: 'soft and relaxed',
  raised: 'lifted up high',
  worried: 'pointing up in the middle',
  cross: 'pulled down in the middle',
};
export const EYE_WORDS: Record<Eyes, string> = {
  open: 'open',
  wide: 'wide open',
  closed: 'gently closed',
  narrow: 'squeezed small',
};
export const MOUTH_WORDS: Record<Mouth, string> = {
  smile: 'a big smile',
  frown: 'turned down at the corners',
  open: 'a round “O”',
  wobbly: 'wobbly',
  gentle: 'a small, soft smile',
  flat: 'a tight, straight line',
};

export function feelingOf(p: FaceParts): Feeling | null {
  return FEELINGS.find((f) => {
    const q = FEELING_FACE[f];
    return q.brows === p.brows && q.eyes === p.eyes && q.mouth === p.mouth;
  }) ?? null;
}

export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * A friendly round face. Coordinates are relative to the centre (cx, cy) and radius r,
 * so the same drawing works big in a scene and small in a question.
 */
export function Face({
  cx,
  cy,
  r,
  parts,
  onBrows,
  onEyes,
  onMouth,
}: {
  cx: number;
  cy: number;
  r: number;
  parts: FaceParts;
  onBrows?: () => void;
  onEyes?: () => void;
  onMouth?: () => void;
}) {
  const k = r / 100;
  const sw = Math.max(2, 7 * k);
  const line = { stroke: C.ink, strokeWidth: sw, strokeLinecap: 'round' as const, fill: 'none' };
  const tap = (fn?: () => void) => (fn ? { onClick: fn, style: { cursor: 'pointer' }, 'data-nopan': true, role: 'button' as const } : {});

  const brows = (() => {
    const y = -38;
    switch (parts.brows) {
      case 'relaxed':
        return [<path key="l" d={`M-52,${y} Q-36,${y - 8} -20,${y}`} {...line} />, <path key="r" d={`M20,${y} Q36,${y - 8} 52,${y}`} {...line} />];
      case 'raised':
        return [<path key="l" d={`M-54,${y - 18} Q-36,${y - 32} -18,${y - 18}`} {...line} />, <path key="r" d={`M18,${y - 18} Q36,${y - 32} 54,${y - 18}`} {...line} />];
      case 'worried':
        return [<path key="l" d={`M-54,${y + 2} L-20,${y - 12}`} {...line} />, <path key="r" d={`M20,${y - 12} L54,${y + 2}`} {...line} />];
      case 'cross':
        return [<path key="l" d={`M-54,${y - 12} L-18,${y + 4}`} {...line} />, <path key="r" d={`M18,${y + 4} L54,${y - 12}`} {...line} />];
    }
  })();

  const eye = (ex: number) => {
    const y = -12;
    switch (parts.eyes) {
      case 'open':
        return <circle key={ex} cx={ex} cy={y} r={9} fill={C.ink} />;
      case 'wide':
        return (
          <g key={ex}>
            <circle cx={ex} cy={y} r={17} fill="white" stroke={C.ink} strokeWidth={sw * 0.7} />
            <circle cx={ex} cy={y} r={7} fill={C.ink} />
          </g>
        );
      case 'closed':
        return <path key={ex} d={`M${ex - 14},${y} Q${ex},${y + 11} ${ex + 14},${y}`} {...line} />;
      case 'narrow':
        return <path key={ex} d={`M${ex - 14},${y} L${ex + 14},${y}`} {...line} strokeWidth={sw * 1.3} />;
    }
  };

  const mouth = (() => {
    const y = 42;
    switch (parts.mouth) {
      case 'smile':
        return <path d={`M-40,${y - 6} Q0,${y + 34} 40,${y - 6}`} {...line} />;
      case 'frown':
        return <path d={`M-36,${y + 16} Q0,${y - 14} 36,${y + 16}`} {...line} />;
      case 'open':
        return <ellipse cx={0} cy={y + 6} rx={15} ry={20} fill={C.ink} />;
      case 'wobbly':
        return <path d={`M-36,${y + 6} q9,-10 18,0 t18,0 t18,0 t18,0`} {...line} />;
      case 'gentle':
        return <path d={`M-22,${y} Q0,${y + 14} 22,${y}`} {...line} />;
      case 'flat':
        return <path d={`M-30,${y + 6} L30,${y + 6}`} {...line} />;
    }
  })();

  return (
    <g transform={`translate(${cx} ${cy}) scale(${k})`}>
      <circle r={100} fill="#ffd36b" stroke={C.ink} strokeWidth={6} />
      {parts.mouth === 'frown' && parts.brows === 'worried' && <path d="M38,2 q-6,14 0,20 q6,-6 0,-20 z" fill="#5fb0ff" stroke={C.ink} strokeWidth={2} />}
      <g {...tap(onBrows)} aria-label={onBrows ? 'Change the eyebrows' : undefined}>
        <rect x={-70} y={-75} width={140} height={46} fill="transparent" />
        {brows}
      </g>
      <g {...tap(onEyes)} aria-label={onEyes ? 'Change the eyes' : undefined}>
        <rect x={-70} y={-30} width={140} height={38} fill="transparent" />
        {eye(-36)}
        {eye(36)}
      </g>
      <g {...tap(onMouth)} aria-label={onMouth ? 'Change the mouth' : undefined}>
        <rect x={-60} y={18} width={120} height={60} fill="transparent" />
        {mouth}
      </g>
    </g>
  );
}

/** A small face picture for question cards. */
export function FacePicture({ feeling }: { feeling: Feeling }) {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="A face">
      <Face cx={110} cy={110} r={96} parts={FEELING_FACE[feeling]} />
    </svg>
  );
}
