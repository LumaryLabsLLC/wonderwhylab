import type { ReactElement } from 'react';
import { C, shade } from '../../../../lib/color';

/** Small pictures of landforms, each drawn in a 120 × 80 box (for answer buttons and question cards). */
export type FormId = 'mountain' | 'hill' | 'valley' | 'plain' | 'island' | 'peninsula' | 'river' | 'lake';

export const FORM_NAME: Record<FormId, string> = {
  mountain: 'mountain',
  hill: 'hill',
  valley: 'valley',
  plain: 'plain',
  island: 'island',
  peninsula: 'peninsula',
  river: 'river',
  lake: 'lake',
};

export const FORM_INFO: Record<FormId, string> = {
  mountain: 'very high land with steep sides and a peak',
  hill: 'raised land that is lower and rounder than a mountain',
  valley: 'low land between hills or mountains, often with a river',
  plain: 'a wide, flat area of land',
  island: 'land with water all around it',
  peninsula: 'land with water on three sides',
  river: 'fresh water flowing downhill towards the sea',
  lake: 'water with land all around it',
};

const GRASS = shade(C.green, 0.3);
const WATER = shade(C.blue, 0.3);
const ROCK = shade(C.purple, 0.25);
const S = { stroke: C.ink, strokeWidth: 2, strokeLinejoin: 'round' as const };

const ART: Record<FormId, () => ReactElement> = {
  mountain: () => (
    <g>
      <rect width={120} height={80} fill="#e3f2ff" />
      <path d="M8,76 L60,8 L112,76 Z" fill={ROCK} {...S} />
      <path d="M46,26 L60,8 L74,26 L66,30 L60,24 L53,30 Z" fill={C.white} {...S} />
    </g>
  ),
  hill: () => (
    <g>
      <rect width={120} height={80} fill="#e3f2ff" />
      <path d="M4,76 Q60,22 116,76 Z" fill={GRASS} {...S} />
    </g>
  ),
  valley: () => (
    <g>
      <rect width={120} height={80} fill="#e3f2ff" />
      <path d="M0,14 L56,74 L64,74 L120,14 L120,80 L0,80 Z" fill={GRASS} {...S} />
      <path d="M0,14 L30,46 L0,46 Z M120,14 L90,46 L120,46 Z" fill={ROCK} opacity={0.5} />
      <path d="M54,74 Q60,70 66,74" stroke={WATER} strokeWidth={5} fill="none" />
    </g>
  ),
  plain: () => (
    <g>
      <rect width={120} height={80} fill="#e3f2ff" />
      <rect y={46} width={120} height={34} fill={GRASS} />
      <path d="M0,46 H120" stroke={C.ink} strokeWidth={2} />
      {[16, 40, 64, 88, 108].map((x) => (
        <path key={x} d={`M${x},62 l3,-6 l3,6`} stroke={shade(C.green, -0.3)} strokeWidth={1.5} fill="none" />
      ))}
    </g>
  ),
  island: () => (
    <g>
      <rect width={120} height={80} fill={WATER} />
      <path d="M30,44 Q36,20 62,22 Q92,22 92,42 Q90,62 60,62 Q30,62 30,44 Z" fill={GRASS} {...S} />
    </g>
  ),
  peninsula: () => (
    <g>
      <rect width={120} height={80} fill={WATER} />
      <path d="M0,0 H38 L38,0 Q44,30 70,32 Q100,34 100,46 Q98,58 70,58 Q44,58 38,80 H0 Z" fill={GRASS} {...S} />
    </g>
  ),
  river: () => (
    <g>
      <rect width={120} height={80} fill={GRASS} />
      <path d="M10,0 C20,30 60,20 66,44 S96,70 110,80" stroke={WATER} strokeWidth={10} fill="none" strokeLinecap="round" />
    </g>
  ),
  lake: () => (
    <g>
      <rect width={120} height={80} fill={GRASS} />
      <ellipse cx={60} cy={40} rx={38} ry={22} fill={WATER} {...S} />
    </g>
  ),
};

export function FormPic({ id, size = 72 }: { id: FormId; size?: number }) {
  return (
    <svg width={size} height={(size * 2) / 3} viewBox="0 0 120 80" role="img" aria-label={FORM_NAME[id]}>
      {ART[id]()}
      <rect width={120} height={80} fill="none" stroke={C.ink} strokeWidth={3} />
    </svg>
  );
}
