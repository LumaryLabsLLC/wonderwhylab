import type { ReactNode } from 'react';
import { C, shade } from '../../../../lib/color';
import { BLOCK_COLORS, BlockTile, forward, turnLeft, turnRight } from '../../engine';
import type { Block, Test } from '../../engine';

/** A picture made of two pictures side by side (each an <svg> with a viewBox of the given size). */
export function Beside({ left, right, gap = 24, label }: { left: { el: ReactNode; w: number; h: number }; right: { el: ReactNode; w: number; h: number }; gap?: number; label: string }) {
  const h = Math.max(left.h, right.h);
  return (
    <svg viewBox={`0 0 ${left.w + gap + right.w} ${h}`} role="img" aria-label={label}>
      <svg x={0} y={(h - left.h) / 2} width={left.w} height={left.h}>
        {left.el}
      </svg>
      <svg x={left.w + gap} y={(h - right.h) / 2} width={right.w} height={right.h}>
        {right.el}
      </svg>
    </svg>
  );
}

// ─────────────────────────── Sensor rules (if / else) ───────────────────────────

export type Act = 'forward' | 'left' | 'right';
export const ACT_WORDS: Record<Act, string> = { forward: 'go forward', left: 'turn left', right: 'turn right' };
export const makeAct = (a: Act): Block => (a === 'forward' ? forward() : a === 'left' ? turnLeft() : turnRight());
export const actOf = (b: Block): Act => (b.kind === 'left' ? 'left' : b.kind === 'right' ? 'right' : 'forward');

export type SensorTest = Extract<Test, 'wall-ahead' | 'path-ahead'>;
export const TEST_Q: Record<SensorTest, string> = { 'wall-ahead': 'wall ahead?', 'path-ahead': 'path ahead?' };

/** "If wall ahead → turn right. Else → go forward." */
export const ruleText = (test: SensorTest, then: Act, otherwise: Act) => `If ${TEST_Q[test].slice(0, -1)} → ${ACT_WORDS[then]}. Else → ${ACT_WORDS[otherwise]}.`;

/** A sensor rule drawn as an if / then / else card (for practice questions and examples). */
export function RulePicture({ test, then, otherwise }: { test: SensorTest; then: Act; otherwise: Act }) {
  const row = (label: string, a: Act, y: number) => (
    <g>
      <text x={24} y={y + 26} dominantBaseline="central" fontSize={20} fontWeight={800} fill={C.ink}>
        {label}
      </text>
      <BlockTile block={makeAct(a)} x={100} y={y + 4} s={44} />
      <text x={158} y={y + 26} dominantBaseline="central" fontSize={20} fontWeight={600} fill={C.ink}>
        {ACT_WORDS[a]}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 320 184" role="img" aria-label={ruleText(test, then, otherwise)}>
      <rect x={2} y={2} width={316} height={180} rx={14} fill={shade(BLOCK_COLORS.if, 0.78)} stroke={C.ink} strokeWidth={2} />
      <rect x={10} y={10} width={300} height={48} rx={10} fill={BLOCK_COLORS.if} stroke={C.ink} strokeWidth={2} />
      <text x={24} y={34} dominantBaseline="central" fontSize={22} fontWeight={800} fill="white">
        IF {TEST_Q[test]}
      </text>
      {row('THEN', then, 64)}
      {row('ELSE', otherwise, 120)}
    </svg>
  );
}
